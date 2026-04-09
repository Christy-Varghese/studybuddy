// ── Socratic Route ───────────────────────────────
// POST /socratic — Guided-discovery dialogue via Socratic questioning

const express = require('express');
const router  = express.Router();

const { runSocraticAgent } = require('../agent/agentLoop');

router.post('/socratic', async (req, res) => {
  const { message, level, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const result = await runSocraticAgent(message, level || 'intermediate', history || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, rawReply: 'Socratic agent error: ' + err.message });
  }
});

module.exports = router;
