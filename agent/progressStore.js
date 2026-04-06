const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
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

// Save a study event: topic studied, optional quiz score (0-100), level
function saveProgress(topic, level, quizScore = null) {
  const store = readStore();

  // Update topic entry
  if (!store.topics[topic]) {
    store.topics[topic] = { timesStudied: 0, scores: [], level, lastStudied: null };
  }
  const t = store.topics[topic];
  t.timesStudied += 1;
  t.lastStudied   = new Date().toISOString();
  t.level         = level;
  if (quizScore !== null) t.scores.push(quizScore);

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

// Get summary of student's progress
function getProgressSummary() {
  const store = readStore();
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

  return {
    totalTopicsStudied: topics.length,
    totalSessions: store.sessions.length,
    topics,
    weakAreas,
    strongAreas,
    recentTopics: store.sessions.slice(-5).map(s => s.topic).reverse()
  };
}

// Clear all progress (for reset feature)
function clearProgress() {
  writeStore({ sessions: [], topics: {} });
}

module.exports = { saveProgress, getProgressSummary, clearProgress };
