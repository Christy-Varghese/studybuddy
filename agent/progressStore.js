const fs   = require('fs');
const path = require('path');

const DATA_DIR   = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'progress.json');

// Auto-create data directory and empty store if not present
function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ sessions: [], topics: {} }, null, 2));
  }
}

// Read the full store
function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
}

// Write the full store
function writeStore(data) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────────────────────
// SM-2 SPACED REPETITION ALGORITHM
// grade: 0-5 (0-2 = failed/hard, 3 = pass, 4 = good, 5 = perfect)
// Automatically maps quiz scores → SM-2 grade
// ─────────────────────────────────────────────────────────────
function sm2(repetitions, easeFactor, interval, grade) {
  if (grade >= 3) {
    if (repetitions === 0)      interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * easeFactor);

    easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    repetitions += 1;
  } else {
    // Failed — reset repetitions but keep ease factor
    repetitions = 0;
    interval    = 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  nextReview.setHours(0, 0, 0, 0);

  return {
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    nextReview: nextReview.toISOString()
  };
}

// Convert quiz score (0-100) to SM-2 grade (0-5)
function scoreToGrade(score) {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

// Default SRS state for a new topic
function defaultSRS() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return {
    repetitions: 0,
    easeFactor:  2.5,
    interval:    1,
    nextReview:  tomorrow.toISOString()
  };
}

// ─────────────────────────────────────────────────────────────
// CORE PROGRESS FUNCTIONS
// ─────────────────────────────────────────────────────────────

// Save a study event: topic studied, optional quiz score (0-100), level
function saveProgress(topic, level, quizScore = null) {
  const store = readStore();

  if (!store.topics[topic]) {
    store.topics[topic] = {
      timesStudied: 0,
      scores:       [],
      level,
      lastStudied:  null,
      srs:          defaultSRS()
    };
  }

  const t = store.topics[topic];
  t.timesStudied += 1;
  t.lastStudied   = new Date().toISOString();
  t.level         = level;

  if (quizScore !== null) {
    t.scores.push(quizScore);
    // Update SRS based on quiz performance
    const grade = scoreToGrade(quizScore);
    const srs   = t.srs || defaultSRS();
    t.srs = sm2(srs.repetitions, srs.easeFactor, srs.interval, grade);
  }

  // Ensure srs exists even if no quiz taken
  if (!t.srs) t.srs = defaultSRS();

  // Add session log entry
  store.sessions.push({
    topic,
    level,
    quizScore,
    timestamp: new Date().toISOString()
  });

  // Keep only last 100 sessions to avoid file bloat
  if (store.sessions.length > 100) store.sessions = store.sessions.slice(-100);

  writeStore(store);
  return store.topics[topic];
}

// Update SRS for a topic after a dedicated review session
function updateSRS(topic, grade) {
  const store = readStore();
  if (!store.topics[topic]) return null;

  const t   = store.topics[topic];
  const srs = t.srs || defaultSRS();
  t.srs     = sm2(srs.repetitions, srs.easeFactor, srs.interval, grade);

  writeStore(store);
  return t.srs;
}

// Get topics due for review today (nextReview <= now)
function getDueReviews() {
  const store = readStore();
  const now   = new Date();
  now.setHours(23, 59, 59, 999); // include all of today

  return Object.entries(store.topics)
    .filter(([, data]) => {
      if (!data.srs || !data.srs.nextReview) return false;
      return new Date(data.srs.nextReview) <= now;
    })
    .map(([name, data]) => ({
      name,
      level:        data.level,
      nextReview:   data.srs.nextReview,
      interval:     data.srs.interval,
      repetitions:  data.srs.repetitions,
      easeFactor:   data.srs.easeFactor,
      avgScore:     data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : null
    }))
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
}

// ─────────────────────────────────────────────────────────────
// STREAK TRACKING
// Counts consecutive days where at least one session occurred
// ─────────────────────────────────────────────────────────────
function getLearningStreak() {
  const store    = readStore();
  if (!store.sessions.length) return { current: 0, longest: 0, lastStudied: null };

  // Build a Set of unique day strings (YYYY-MM-DD) from sessions
  const daySet = new Set(
    store.sessions.map(s => s.timestamp.slice(0, 10))
  );
  const days = [...daySet].sort().reverse(); // most recent first

  const todayStr     = new Date().toISOString().slice(0, 10);
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  // Streak must include today or yesterday to be "active"
  let current = 0;
  if (days[0] === todayStr || days[0] === yesterdayStr) {
    let checkDate = new Date(days[0]);
    for (const day of days) {
      const d = new Date(day);
      const diffDays = Math.round((checkDate - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0 || diffDays === 1) {
        current++;
        checkDate = d;
      } else {
        break;
      }
    }
  }

  // Longest streak ever
  let longest = 0;
  let run     = 1;
  const sortedAsc = [...daySet].sort();
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev    = new Date(sortedAsc[i - 1]);
    const curr    = new Date(sortedAsc[i]);
    const diff    = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  if (sortedAsc.length > 0 && longest < 1) longest = 1;

  return {
    current,
    longest: Math.max(longest, current),
    lastStudied: days[0] || null,
    studiedToday: days[0] === todayStr
  };
}

// Get summary of student's progress
function getProgressSummary() {
  const store  = readStore();
  const topics = Object.entries(store.topics).map(([name, data]) => {
    const avgScore = data.scores.length > 0
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      : null;
    return { name, timesStudied: data.timesStudied, avgScore, lastStudied: data.lastStudied };
  });

  // Identify weak areas: studied at least once, avg score below 70 or no quiz taken
  const weakAreas = topics
    .filter(t => t.avgScore === null || t.avgScore < 70)
    .map(t => t.name);

  // Identify strong areas: avg score 80+
  const strongAreas = topics
    .filter(t => t.avgScore !== null && t.avgScore >= 80)
    .map(t => t.name);

  const streak     = getLearningStreak();
  const dueReviews = getDueReviews();

  return {
    totalTopicsStudied: topics.length,
    totalSessions:      store.sessions.length,
    topics,
    weakAreas,
    strongAreas,
    recentTopics: store.sessions.slice(-5).map(s => s.topic).reverse(),
    streak,
    dueReviews: dueReviews.length
  };
}

// Clear all progress (for reset feature)
function clearProgress() {
  writeStore({ sessions: [], topics: {} });
}

module.exports = {
  saveProgress,
  getProgressSummary,
  clearProgress,
  updateSRS,
  getDueReviews,
  getLearningStreak
};
