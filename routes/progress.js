// ── Progress Routes ──────────────────────────────
// /progress, /progress-report, /due-reviews, /srs/:topic, /streak

const express = require('express');
const router  = express.Router();

const { getProgressSummary, clearProgress, updateSRS, getDueReviews, getLearningStreak, listStudents, getFullClassData, DEFAULT_STUDENT } = require('../agent/progressStore');
const { toolImplementations } = require('../agent/tools');
const { flowTraces }          = require('../middleware/devTiming');

// Helper: resolve studentId from session or query param
function resolveStudent(req) {
  return req.query.studentId || req.session?.studentId || DEFAULT_STUDENT;
}

// GET student's full progress summary
router.get('/progress', (req, res) => {
  try {
    const studentId = resolveStudent(req);
    res.json(getProgressSummary(studentId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — reset progress (per-student or all)
router.delete('/progress', (req, res) => {
  try {
    if (req.query.all === 'true') {
      clearProgress();          // wipe everything
      res.json({ success: true, message: 'All progress cleared' });
    } else {
      const studentId = resolveStudent(req);
      clearProgress(studentId);
      res.json({ success: true, message: `Progress cleared for ${studentId}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — Dynamic Progress Evaluation Report
router.post('/progress-report', async (req, res) => {
  const reportStart = Date.now();
  const steps       = [];
  const mark        = (name, detail) => steps.push({ name, ms: Date.now() - reportStart, detail });

  console.log(`\n⏱  [/progress-report] Evaluation Report generation started`);
  mark('Received request');

  try {
    const result  = await toolImplementations.generate_evaluation_report();
    const elapsed = Date.now() - reportStart;
    mark('LLM generation done', `${(elapsed / 1000).toFixed(2)}s`);

    console.log(`✅ [/progress-report] Evaluation Report done in ${(elapsed / 1000).toFixed(2)}s`);

    // Store flow trace for dev panel
    flowTraces['/progress-report'] = {
      route: '/progress-report', ts: Date.now(), totalMs: elapsed, status: 'ok',
      input: 'Evaluation Report', steps
    };

    res.json({ success: true, report: result });
  } catch (err) {
    const elapsed = Date.now() - reportStart;
    mark('ERROR', err.message);
    flowTraces['/progress-report'] = {
      route: '/progress-report', ts: Date.now(), totalMs: elapsed, status: 'error',
      input: 'Evaluation Report', steps
    };
    console.error(`❌ [/progress-report] Error after ${(elapsed / 1000).toFixed(2)}s:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET topics due for review today
router.get('/due-reviews', (req, res) => {
  try {
    const studentId = resolveStudent(req);
    res.json({ reviews: getDueReviews(studentId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update SRS after a review session
// grade: 0-5 (0=failed, 3=passed, 5=perfect)  OR  score: 0-100 (auto-converted)
router.put('/srs/:topic', (req, res) => {
  const topic = decodeURIComponent(req.params.topic);
  let { grade, score } = req.body;

  // Allow passing a raw quiz score instead of a grade
  if (grade === undefined && score !== undefined) {
    if (score >= 90)      grade = 5;
    else if (score >= 75) grade = 4;
    else if (score >= 60) grade = 3;
    else if (score >= 40) grade = 2;
    else                  grade = 0;
  }

  if (grade === undefined || grade < 0 || grade > 5) {
    return res.status(400).json({ error: 'grade (0-5) or score (0-100) required' });
  }

  try {
    const studentId = resolveStudent(req);
    const updated = updateSRS(topic, grade, studentId);
    if (!updated) return res.status(404).json({ error: 'Topic not found in progress' });
    res.json({ success: true, topic, srs: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET learning streak
router.get('/streak', (req, res) => {
  try {
    const studentId = resolveStudent(req);
    res.json(getLearningStreak(studentId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// TEACHER / CLASS-WIDE ENDPOINTS
// ─────────────────────────────────────────────────

// GET all students (for teacher dropdown)
router.get('/api/students', (req, res) => {
  try {
    res.json({ students: listStudents() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET full class data (all students, all topics, all sessions)
router.get('/api/class-data', (req, res) => {
  try {
    res.json(getFullClassData());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
