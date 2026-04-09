// ── Progress Routes ──────────────────────────────
// /progress, /progress-report, /due-reviews, /srs/:topic, /streak

const express = require('express');
const router  = express.Router();

const { getProgressSummary, clearProgress, updateSRS, getDueReviews, getLearningStreak } = require('../agent/progressStore');
const { toolImplementations } = require('../agent/tools');

// GET student's full progress summary
router.get('/progress', (req, res) => {
  try {
    res.json(getProgressSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — reset all progress
router.delete('/progress', (req, res) => {
  try {
    clearProgress();
    res.json({ success: true, message: 'Progress cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — Dynamic Progress Evolution Report
router.post('/progress-report', async (req, res) => {
  const reportStart = Date.now();
  try {
    const result = await toolImplementations.generate_evolution_report();
    const elapsed = Date.now() - reportStart;
    console.log(`✅ [/progress-report] Done in ${(elapsed / 1000).toFixed(2)}s`);
    res.json({ success: true, report: result });
  } catch (err) {
    console.error('[/progress-report] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET topics due for review today
router.get('/due-reviews', (req, res) => {
  try {
    res.json({ reviews: getDueReviews() });
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
    const updated = updateSRS(topic, grade);
    if (!updated) return res.status(404).json({ error: 'Topic not found in progress' });
    res.json({ success: true, topic, srs: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET learning streak
router.get('/streak', (req, res) => {
  try {
    res.json(getLearningStreak());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
