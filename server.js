const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { runAgentLoop, runParallelAgent } = require('./agent/agentLoop');
const { getProgressSummary, clearProgress } = require('./agent/progressStore');
const { getCacheStats, searchTopics, clearAll: clearSmartCache } = require('./agent/smartCache');

// ── Dev metrics collector ──────────────────────────────
// Only active in development. Tracks timing for every route.
// Stored in memory — resets on server restart.

const IS_DEV = process.env.NODE_ENV !== 'production';

const devMetrics = {
  requests:   [],       // { route, ms, status, ts, cached, toolLog }
  errors:     0,
  cacheHits:  0,
  startedAt:  Date.now()
};

const app = express();

app.use(express.json());

// Middleware — times every request and stores result
// Insert this AFTER app.use(express.json()) and BEFORE all routes
function devTimingMiddleware(req, res, next) {
  if (!IS_DEV) return next();

  const start      = Date.now();
  const origJson   = res.json.bind(res);
  let   captured   = null;

  // Intercept res.json to capture response body
  res.json = function(body) {
    captured = body;
    return origJson(body);
  };

  res.on('finish', () => {
    const ms     = Date.now() - start;
    const cached = captured?.structured !== undefined
                   ? (ms < 100)           // agent: cached if <100ms
                   : false;

    if (cached) devMetrics.cacheHits++;
    if (res.statusCode >= 400) devMetrics.errors++;

    devMetrics.requests.push({
      route:    req.path,
      method:   req.method,
      ms,
      status:   res.statusCode,
      ts:       Date.now(),
      cached,
      toolLog:  captured?.toolCallLog || null
    });

    // Keep only last 200 entries
    if (devMetrics.requests.length > 200) {
      devMetrics.requests = devMetrics.requests.slice(-200);
    }
  });

  next();
}

app.use(devTimingMiddleware);

// Block devpanel.js in production
app.get('/devpanel.js', (req, res, next) => {
  if (!IS_DEV) return res.status(404).send('Not found');
  next();
});

// Inject dev panel into HTML responses (dev mode only)
if (IS_DEV) {
  app.use((req, res, next) => {
    const origSend = res.send?.bind(res);
    
    res.send = function(data) {
      // Only intercept HTML responses
      if (
        typeof data === 'string' &&
        data.includes('</body>') &&
        res.getHeader('content-type')?.includes('text/html')
      ) {
        data = data.replace(
          '</body>',
          `<script>
            (function() {
              var s = document.createElement('script');
              s.src = '/devpanel.js';
              s.async = true;
              document.head.appendChild(s);
            })();
          </script></body>`
        );
      }
      return origSend(data);
    };
    next();
  });
  
  // Explicit handler for index.html to ensure dev panel injection
  app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send('Error loading page');
      }
      // Inject dev panel script
      data = data.replace(
        '</body>',
        `<script>
          (function() {
            var s = document.createElement('script');
            s.src = '/devpanel.js';
            s.async = true;
            document.head.appendChild(s);
          })();
        </script></body>`
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(data);
    });
  });
}

// ── PWA Middleware ────────────────────────────────────
// Set correct MIME types and cache headers for PWA assets
app.use((req, res, next) => {
  if (req.path === '/manifest.json') {
    res.type('application/manifest+json');
    res.set('Cache-Control', 'public, max-age=3600');
  }
  if (req.path === '/sw.js') {
    res.type('application/javascript');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Service-Worker-Allowed', '/');
  }
  next();
});

app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ============ Response Cache ============
// Smart cache system — 4-layer waterfall (taxonomy → normalised hash → dedup → Ollama)
// Replaces the old simple Map() cache.
// See agent/smartCache.js for implementation details.
// No manual management needed — smartCache.js handles all memory/disk persistence.

// ============ Utility: Estimate response time based on complexity ============
function estimateResponseTime(message, level, hasImage = false) {
  const wordCount = message.trim().split(/\s+/).length;

  // Base time per level (seconds) — beginner gets shorter answers
  const baseTime = { beginner: 8, intermediate: 14, advanced: 22 };

  // Complexity multiplier based on question type keywords
  const complexKeywords = [
    'explain', 'describe', 'compare', 'difference', 'how does', 'why does',
    'what is', 'summarise', 'summarize', 'step by step', 'example'
  ];
  const simpleKeywords = ['define', 'what', 'who', 'when', 'where', 'list'];

  const msgLower = message.toLowerCase();
  const isComplex = complexKeywords.some(k => msgLower.includes(k));
  const isSimple  = simpleKeywords.some(k => msgLower.startsWith(k));

  let multiplier = 1.0;
  if (isComplex) multiplier = 1.5;
  if (isSimple)  multiplier = 0.7;

  // Word count adjustment — longer questions need more context processing
  const wordMultiplier = wordCount > 20 ? 1.3 : wordCount > 10 ? 1.1 : 1.0;

  // Image adds processing time
  const imageAddition = hasImage ? 6 : 0;

  // Thinking mode is always on — adds overhead
  const thinkingAddition = level === 'advanced' ? 8 : level === 'intermediate' ? 5 : 3;

  const total = Math.round(
    baseTime[level] * multiplier * wordMultiplier + imageAddition + thinkingAddition
  );

  // Return min 5s, max 60s, with a human-friendly label
  const clamped = Math.min(Math.max(total, 5), 60);

  return {
    seconds: clamped,
    label: clamped <= 10
      ? `~${clamped} seconds`
      : clamped <= 30
        ? `~${clamped} seconds`
        : `about ${Math.round(clamped / 10) * 10} seconds`,
    complexity: isComplex ? 'detailed' : isSimple ? 'quick' : 'standard'
  };
}

// The system prompt — this gives Gemma its "tutor personality"
function buildSystemPrompt(level) {
  const levelInstructions = {
    beginner: `
You are StudyBuddy, a warm and encouraging tutor for children aged 8–12.
Use simple words. Use fruit, toys, or animals as analogies.
Keep each step short — one sentence max.
Use emojis freely to make it fun and visual.
Each step's "emoji" field should contain 2–5 relevant emojis that illustrate that step
(e.g. "🍎🍎🍎" or "🫐🫐") — put them on their own, not mixed into the text.
The "answer" field must be the final result stated clearly and simply.
The "followup" question should be playful and encouraging.
    `.trim(),

    intermediate: `
You are StudyBuddy, a clear and helpful tutor for high school students.
Use proper terminology but explain it naturally.
Each step should be 1–2 concise sentences.
The "answer" field should state the result and why it's correct.
The "followup" question should prompt the student to think deeper.
    `.trim(),

    advanced: `
You are StudyBuddy, a rigorous academic tutor for university-level students.
Use precise technical language. Assume strong foundational knowledge.
Each step can be 2–3 sentences with full technical reasoning.
The "answer" field should include the result plus any important caveats or extensions.
The "followup" question should challenge the student with a related harder problem.
    `.trim()
  };

  return `
${levelInstructions[level] || levelInstructions.intermediate}

ABSOLUTE REQUIREMENT — JSON ONLY OUTPUT:
You MUST respond with ONLY valid JSON. No markdown. No text before or after.
No code fences (\`\`\`). No explanations. Just a single JSON object.

The response MUST be valid parseable JSON with this exact structure:
{
  "intro": "A short 1–2 sentence friendly opener that names the topic and sets the scene (NOT a repeat of the question)",
  "steps": [
    {
      "title": "Short step label (2–5 words max, e.g. 'Start with the basics')",
      "text": "One clear sentence explaining this step. NO markdown, NO bold, NO italic. Plain text only.",
      "emoji": "2–5 emojis for this step (fill for beginner, leave empty string '' for intermediate/advanced)"
    }
  ],
  "answer": "One complete sentence with the final answer. Plain text only. NO markdown.",
  "followup": "One engagement question (beginner: playful; intermediate: analytical; advanced: challenging)"
}

STRICT RULES:
1. MUST be valid JSON — no trailing commas, proper quotes, no special characters outside strings
2. "steps" array must have 2–5 items
3. "emoji" field: ONLY for beginner level; for intermediate/advanced, use empty string ""
4. NO markdown formatting (**bold**, *italic*, links, etc.) anywhere in string values
5. NO escape sequences needed — use plain UTF-8 text
6. "intro" must introduce the topic, NOT repeat the user's question
7. "answer" must be a complete sentence, not fragments
8. "followup" must be a single question to encourage engagement
9. If the topic cannot be broken into steps (pure factual lookup), use one step with title "Answer"
10. Return the JSON object itself, NOT wrapped in markdown code fence

CRITICAL: If you cannot generate valid JSON, your response will fail parsing and the user will see an error.
Always validate your JSON before responding. Test it mentally: can it be parsed by JSON.parse()?
`.trim();
}

// ============ POST /estimate — Quick time estimate (no Ollama call) ============
app.post('/estimate', (req, res) => {
  const { message, level, hasImage } = req.body;
  const estimate = estimateResponseTime(
    message || '',
    level || 'intermediate',
    hasImage || false
  );
  res.json(estimate);
});

// Main chat route
app.post('/chat', async (req, res) => {
  const { message, level, history } = req.body;

  // Build the messages array for Gemma
  const messages = [
    { role: 'system', content: buildSystemPrompt(level || 'beginner') },
    ...history,                          // past conversation
    { role: 'user', content: message }  // new question
  ];

  try {
    // Call Ollama running locally
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:e4b',
        messages: messages,
        stream: false
      })
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama API error: ${ollamaRes.status} ${ollamaRes.statusText}`);
    }

    const data = await ollamaRes.json();
    
    if (!data.message || !data.message.content) {
      throw new Error('Invalid response from Ollama - no message content');
    }
    
    const rawReply = data.message.content;

    // Attempt to parse as structured JSON
    let structured = null;
    try {
      // Strip any accidental markdown code fences Gemma might add
      const cleaned = rawReply
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      structured = JSON.parse(cleaned);
    } catch (e) {
      // Gemma failed to return valid JSON — fall back to plain text
      structured = null;
    }

    // Return both structured and raw so frontend can handle either
    res.json({
      reply: rawReply,           // raw text fallback
      structured: structured     // parsed object or null
    });
  } catch (err) {
    console.error('[/chat] Error:', err.message);
    res.status(500).json({ error: err.message || 'Gemma is not running. Start Ollama first!' });
  }
});

// ============ POST /chat-with-image — Homework photo analysis with vision ============
app.post('/chat-with-image', upload.single('image'), async (req, res) => {
  const { message, level, history: historyStr } = req.body;
  const file = req.file;

  // Validate image upload
  if (!file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    // Read uploaded image and convert to base64
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = file.mimetype;

    // Parse conversation history
    let history = [];
    try {
      history = JSON.parse(historyStr || '[]');
    } catch (e) {
      history = [];
    }

    // Build system prompt specifically for vision tasks
    const visionSystemPrompt = `You are an expert tutor helping students understand homework problems.
When analyzing images of homework or problems:
1. Explain what you see in the image
2. Break down the solution into clear steps
3. Explain the concepts being tested
4. Provide the final answer

Always respond in this EXACT JSON format (no markdown, pure JSON):
{
  "intro": "Brief overview of what's shown",
  "steps": [
    {"title": "Step title", "text": "Step explanation", "emoji": "👉"},
    {"title": "Step title", "text": "Step explanation", "emoji": "👉"}
  ],
  "answer": "The final answer or conclusion",
  "followup": "Optional: A follow-up concept to explore"
}

IMPORTANT: Respond ONLY with valid JSON, no other text or markdown.`;

    // Build messages array with vision capability
    // For Ollama, we need to use the 'images' field at the message level
    const messages = [
      { role: 'system', content: visionSystemPrompt },
      ...history,
      {
        role: 'user',
        content: message || 'Please help me with this homework problem.',
        images: [base64Image]  // Ollama-style vision: pass base64 directly
      }
    ];

    // Call Ollama with vision-capable model
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:e4b',
        messages: messages,
        stream: false,
        temperature: 0.3  // Lower temperature for consistent JSON output
      })
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama API error: ${ollamaRes.status} ${ollamaRes.statusText}`);
    }

    const data = await ollamaRes.json();
    
    if (!data.message || !data.message.content) {
      throw new Error('Invalid response from Ollama - no message content');
    }
    
    let rawReply = data.message.content;

    // Attempt to parse as structured JSON
    let structured = null;
    try {
      // Strip any accidental markdown code fences Gemma might add
      const cleaned = rawReply
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      structured = JSON.parse(cleaned);
    } catch (e) {
      // Gemma failed to return valid JSON
      // Try to construct a simple structured response from the raw text
      if (rawReply && rawReply.trim().length > 0) {
        structured = {
          intro: rawReply.substring(0, Math.min(150, rawReply.length)),
          steps: [],
          answer: rawReply.length > 150 ? rawReply.substring(150) : '',
          followup: 'Would you like me to explain any part further?'
        };
      } else {
        structured = null;
      }
    }

    // Clean up uploaded temp file
    fs.unlinkSync(file.path);

    // Return both structured and raw so frontend can handle either
    res.json({
      reply: rawReply,           // raw text fallback
      structured: structured     // parsed object or constructed fallback
    });
  } catch (err) {
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error('[/chat-with-image] Error:', err.message);
    res.status(500).json({ error: err.message || 'Gemma is not running. Start Ollama first!' });
  }
});

// ============ POST /quiz — Quiz generation endpoint ============
app.post('/quiz', async (req, res) => {
  const { topic, level, numQuestions } = req.body;

  if (!topic || !level || !numQuestions) {
    return res.status(400).json({ error: 'Missing topic, level, or numQuestions' });
  }

  const numQuestionsInt = parseInt(numQuestions, 10);
  if (isNaN(numQuestionsInt) || numQuestionsInt < 3 || numQuestionsInt > 10) {
    return res.status(400).json({ error: 'numQuestions must be between 3 and 10' });
  }

  // System prompt for quiz generation (no <|think|> token)
  const quizPrompt = `You are a quiz generator. Generate exactly ${numQuestionsInt} multiple choice questions about ${topic} suitable for ${level} level.

Respond ONLY with a valid JSON array. No markdown, no explanation, no preamble. Just the raw JSON array.

Format:
[
  {
    "question": "Question text here?",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "answer": "A) option1",
    "explanation": "Brief explanation of why this is correct"
  }
]`;

  try {
    // Call Ollama
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:e4b',
        messages: [{ role: 'user', content: quizPrompt }],
        stream: false
      })
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama API error: ${ollamaRes.status} ${ollamaRes.statusText}`);
    }

    const data = await ollamaRes.json();
    
    if (!data.message || !data.message.content) {
      throw new Error('Invalid response from Ollama - no message content');
    }
    
    let responseText = data.message.content;

    // Strip markdown code fences if present
    responseText = responseText
      .replace(/^```json\n?/i, '')
      .replace(/^```\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    // Parse JSON
    const questions = JSON.parse(responseText);

    // Validate that we got an array
    if (!Array.isArray(questions)) {
      return res.status(500).json({ error: 'Invalid quiz format from model' });
    }

    res.json({ questions });
  } catch (err) {
    console.error('[/quiz] Error:', err.message);
    res.status(500).json({ error: err.message || 'Gemma is not running or failed to generate quiz. Start Ollama first!' });
  }
});

// ─── Agent route ───────────────────────────────
// Main agentic endpoint — Gemma decides which tools
// to call, runs them, and synthesises a final answer
app.post('/agent', async (req, res) => {
  const { message, level, history, fast } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // Use parallel agent by default (fast: true), fall back to sequential if needed
    const result = fast === false
      ? await runAgentLoop(message, level || 'intermediate', history || [], null)
      : await runParallelAgent(message, level || 'intermediate', history || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success:  false,
      rawReply: 'Agent error: ' + err.message,
      structured: null,
      toolCallLog: []
    });
  }
});

// ─── Progress routes ────────────────────────────
// GET student's full progress summary
app.get('/progress', (req, res) => {
  try {
    res.json(getProgressSummary());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE — reset all progress
app.delete('/progress', (req, res) => {
  try {
    clearProgress();
    res.json({ success: true, message: 'Progress cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cache endpoints ────────────────────────────
app.get('/cache-stats', (req, res) => {
  res.json(getCacheStats());
});

// ─── PWA Status endpoint (debugging) ────────────────────────────
app.get('/pwa-status', (req, res) => {
  res.json({
    pwaReady: true,
    serviceWorkerUrl: '/sw.js',
    manifestUrl: '/manifest.json',
    icons: {
      '192': '/icon-192.png',
      '512': '/icon-512.png',
      'maskable': '/icon-maskable.png'
    },
    cacheVersion: 'studybuddy-v1',
    timestamp: new Date().toISOString(),
    environment: IS_DEV ? 'development' : 'production',
    message: 'PWA assets are ready. Service Worker can be registered.'
  });
});

app.delete('/cache', (req, res) => {
  clearSmartCache();
  res.json({ success: true, message: 'All cache layers cleared' });
});

// NEW: topic autocomplete endpoint (uses Trie)
app.get('/topics/search', (req, res) => {
  const prefix  = (req.query.q || '').toLowerCase();
  const results = searchTopics(prefix);
  res.json({ prefix, results, count: results.length });
});

// ─── Taxonomy admin routes ────────────────────────────────────
const {
  getStats,
  approvePending,
  rejectPending,
  removeLearned,
  manuallyAddTopic,
  rebuildLiveTaxonomy
} = require('./agent/dynamicTaxonomy');

// GET full taxonomy stats (learned + pending)
app.get('/admin/taxonomy', (req, res) => {
  res.json(getStats());
});

// POST manually add a topic
// Body: { topic: string, keywords: string[], subject: string }
app.post('/admin/taxonomy', (req, res) => {
  const { topic, keywords, subject } = req.body;
  if (!topic || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'topic and keywords[] required' });
  }
  const key = manuallyAddTopic(topic, keywords, subject);
  res.json({ success: true, addedKey: key });
});

// POST approve a pending topic
app.post('/admin/taxonomy/pending/:topic/approve', (req, res) => {
  const ok = approvePending(decodeURIComponent(req.params.topic));
  res.json({ success: ok });
});

// DELETE reject a pending topic
app.delete('/admin/taxonomy/pending/:topic', (req, res) => {
  const ok = rejectPending(decodeURIComponent(req.params.topic));
  res.json({ success: ok });
});

// DELETE remove a learned topic
app.delete('/admin/taxonomy/learned/:topic', (req, res) => {
  const ok = removeLearned(decodeURIComponent(req.params.topic));
  res.json({ success: ok });
});

// POST force rebuild live taxonomy (useful after manual file edits)
app.post('/admin/taxonomy/rebuild', (req, res) => {
  rebuildLiveTaxonomy();
  res.json({ success: true, message: 'Live taxonomy rebuilt' });
});

// Serve admin UI
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'taxonomy-admin.html'));
});

// ── Dev metrics API ────────────────────────────────────
// Only available in dev mode. Returns aggregated benchmark data.
if (IS_DEV) {
  app.get('/dev/metrics', (req, res) => {
    const now      = Date.now();
    const window   = 60 * 1000;   // last 60 seconds
    const recent   = devMetrics.requests.filter(r => now - r.ts < window);

    // Aggregate by route — last time, avg time, call count
    const byRoute  = {};
    for (const r of recent) {
      if (!byRoute[r.route]) {
        byRoute[r.route] = { route: r.route, times: [], errors: 0, cacheHits: 0 };
      }
      byRoute[r.route].times.push(r.ms);
      if (r.status >= 400) byRoute[r.route].errors++;
      if (r.cached)        byRoute[r.route].cacheHits++;
    }

    const routes = Object.values(byRoute).map(r => ({
      route:     r.route,
      last:      r.times[r.times.length - 1],
      avg:       Math.round(r.times.reduce((a, b) => a + b, 0) / r.times.length),
      min:       Math.min(...r.times),
      max:       Math.max(...r.times),
      count:     r.times.length,
      errors:    r.errors,
      cacheHits: r.cacheHits
    }));

    // Last agent call tool breakdown
    const lastAgent = [...devMetrics.requests]
      .reverse()
      .find(r => r.route === '/agent' && r.toolLog);

    const toolBreakdown = lastAgent?.toolLog?.map(t => ({
      tool:   t.tool,
      ms:     t.result?._ms || null,   // populated if tools report timing
      cached: t.result?.cached || false
    })) || [];

    // Check Ollama models — fire-and-forget HEAD requests
    const cacheStats = getCacheStats();

    res.json({
      uptime:        Math.round((now - devMetrics.startedAt) / 1000),
      totalRequests: devMetrics.requests.length,
      totalErrors:   devMetrics.errors,
      totalCacheHits:devMetrics.cacheHits,
      lastRequestMs: devMetrics.requests.length
                     ? devMetrics.requests[devMetrics.requests.length - 1].ms
                     : null,
      routes,
      toolBreakdown,
      cache:         cacheStats,   // add smart cache statistics
      timestamp:     now
    });
  });

  // Reset metrics endpoint
  app.delete('/dev/metrics', (req, res) => {
    devMetrics.requests   = [];
    devMetrics.errors     = 0;
    devMetrics.cacheHits  = 0;
    devMetrics.startedAt  = Date.now();
    res.json({ success: true });
  });
}

// ─── Warm up models on startup ───────────────────
async function warmUpModels() {
  // Only try to warm up models that are actually installed
  // Check which models are available first
  try {
    const tagsRes = await fetch('http://localhost:11434/api/tags');
    const tagsData = await tagsRes.json();
    const installedModels = tagsData.models.map(m => m.name);
    
    // Warm up only installed models (prefer faster ones)
    const modelsToWarmup = installedModels.filter(m => 
      m.includes('gemma4:e4b') || m.includes('gemma4:e2b') || m.includes('gemma3')
    ).slice(0, 2);  // Just warm up first 2 available
    
    for (const model of modelsToWarmup) {
      try {
        await fetch('http://localhost:11434/api/generate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt:    'hi',
            stream:    false,
            options:   { num_predict: 1 }
          })
        });
        console.log(`[warmup] ${model} loaded into RAM`);
      } catch (err) {
        console.warn(`[warmup] Could not warm up ${model}:`, err.message);
      }
    }
    
    if (modelsToWarmup.length === 0) {
      console.warn('[warmup] No suitable models found for warmup. Available models:', installedModels);
    }
  } catch (err) {
    console.warn('[warmup] Could not check available models:', err.message);
  }
}

app.listen(3000, () => {
  console.log('StudyBuddy running at http://localhost:3000');
  warmUpModels();   // fire-and-forget — runs in background while server starts
});