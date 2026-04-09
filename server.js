const express = require('express');
const compression = require('compression');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { parse: csvParse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const { runAgentLoop, runParallelAgent, runSocraticAgent } = require('./agent/agentLoop');
const { getProgressSummary, clearProgress, updateSRS, getDueReviews, getLearningStreak } = require('./agent/progressStore');
const { toolImplementations } = require('./agent/tools');
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

// ── Flow Trace store ─────────────────────────────────
// Stores the last request's step-by-step timing for each route type.
// Each trace: { route, ts, totalMs, status, steps: [{ name, ms, detail? }] }
const flowTraces = {};  // keyed by route e.g. '/chat', '/quiz', '/concept-map'

const app = express();

// ── Performance: Enable gzip compression ──
// Compresses all responses >1KB, reduces bandwidth by ~70%
app.use(compression({
  level: 6,              // Balance between speed and compression
  threshold: 1024,       // Only compress responses >1KB
  filter: (req, res) => {
    // Don't compress if client doesn't accept it
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

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

// Graceful handler for multer errors (e.g., file too large, invalid mime)
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
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

Strict Rule: Keep your <think> section extremely brief, under 30 words. Do not show your scratchpad work; move directly to providing the structured JSON.
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

// Main chat route — SSE streaming
app.post('/chat', async (req, res) => {
  const chatStart = Date.now();
  const steps = [];
  const mark = (name, detail) => steps.push({ name, ms: Date.now() - chatStart, detail });

  const { message, level, history } = req.body;
  console.log(`\n⏱  [/chat] Started — level: ${level || 'beginner'}, prompt: "${(message || '').slice(0, 60)}…"`);

  // SSE headers — keep connection open for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if present
  res.flushHeaders();

  // Build the messages array for Gemma
  const messages = [
    { role: 'system', content: buildSystemPrompt(level || 'beginner') },
    ...history,                          // past conversation
    { role: 'user', content: message }  // new question
  ];
  mark('Build prompt', `${messages.length} messages, level=${level || 'beginner'}`);

  try {
    // Call Ollama with streaming enabled
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:e4b',
        messages: messages,
        stream: true,
        options: { num_predict: 500, num_ctx: 4096 },
        speculative_model: 'gemma2:2b'
      })
    });
    mark('Ollama API call', `model=gemma4:e4b, status=${ollamaRes.status}`);

    if (!ollamaRes.ok) {
      throw new Error(`Ollama API error: ${ollamaRes.status} ${ollamaRes.statusText}`);
    }

    // Read Ollama's NDJSON stream and relay each token as SSE
    let fullReply = '';
    let insideThink = false;   // Track <think> block state for live stripping

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // Ollama sends one JSON object per line (NDJSON)
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line);
          if (chunk.message && chunk.message.content) {
            let token = chunk.message.content;
            fullReply += token;

            // Live-strip <think>…</think> blocks so they never reach the client
            // Handle partial tags across chunk boundaries
            if (insideThink) {
              const endIdx = token.indexOf('</think>');
              if (endIdx !== -1) {
                insideThink = false;
                token = token.slice(endIdx + '</think>'.length);
              } else {
                token = ''; // Still inside think block, suppress
              }
            }
            // Check for opening <think> in remaining token
            if (!insideThink) {
              const startIdx = token.indexOf('<think>');
              if (startIdx !== -1) {
                const before = token.slice(0, startIdx);
                const afterStart = token.slice(startIdx + '<think>'.length);
                const endIdx = afterStart.indexOf('</think>');
                if (endIdx !== -1) {
                  // Entire think block in one token
                  token = before + afterStart.slice(endIdx + '</think>'.length);
                } else {
                  insideThink = true;
                  token = before;
                }
              }
            }

            // Only send non-empty tokens after stripping
            if (token) {
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          }
        } catch (_) {
          // Skip malformed lines
        }
      }
    }
    mark('Stream complete', `${fullReply.length} chars total`);

    // Strip <think> blocks from full reply for structured parse
    let rawReply = fullReply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Attempt to parse as structured JSON
    let structured = null;
    try {
      let cleaned = rawReply;

      // 1. Strip markdown code fences
      cleaned = cleaned
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      // 3. Try direct parse first
      try {
        structured = JSON.parse(cleaned);
      } catch (_) {
        // 4. Extract the first JSON object {...} from the text
        const objMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objMatch) {
          // Repair trailing commas before } or ]
          let candidate = objMatch[0].replace(/,(\s*[\]\}])/g, '$1');
          structured = JSON.parse(candidate);
        }
      }

      // 5. Validate it has the expected shape (intro/steps/answer)
      if (structured && !structured.steps) {
        structured = null;
      }
    } catch (e) {
      console.warn('[/chat] JSON parse failed, using plaintext fallback:', e.message);
      structured = null;
    }
    mark('Parse structured JSON', structured ? 'success' : 'fallback to plain text');

    // Send final SSE event with structured data + raw reply, then close
    res.write(`data: ${JSON.stringify({ done: true, reply: rawReply, structured })}\n\n`);
    res.end();
    mark('Send [DONE]', `structured=${!!structured}`);

    const chatMs = Date.now() - chatStart;
    console.log(`✅ [/chat] Done in ${(chatMs / 1000).toFixed(2)}s — reply length: ${rawReply.length} chars`);

    // Store flow trace
    flowTraces['/chat'] = {
      route: '/chat', ts: Date.now(), totalMs: chatMs, status: 'ok',
      input: (message || '').slice(0, 80), steps
    };
  } catch (err) {
    const chatMs = Date.now() - chatStart;
    mark('ERROR', err.message);
    flowTraces['/chat'] = {
      route: '/chat', ts: Date.now(), totalMs: chatMs, status: 'error',
      input: (message || '').slice(0, 80), steps
    };
    console.error(`❌ [/chat] Error after ${(chatMs / 1000).toFixed(2)}s:`, err.message);
    // If headers already sent we can only write an error SSE event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message || 'Gemma is not running. Start Ollama first!' });
    }
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
    // Read uploaded image and optimize it for faster processing
    const imageBuffer = fs.readFileSync(file.path);
    
    // ── Performance: Compress and resize image before sending to Ollama ──
    // Reduces upload size by ~80% and speeds up vision processing
    let optimizedBuffer;
    try {
      optimizedBuffer = await sharp(imageBuffer)
        .resize(640, 640, {       // Max 640px on longest side (down from 1024 for faster inference)
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({                    // Convert to WebP for smaller size + better quality
          quality: 80
        })
        .toBuffer();
      
      console.log(`[image] Optimized: ${imageBuffer.length} → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100)}% reduction)`);
    } catch (sharpErr) {
      console.warn('[image] Sharp optimization failed, using original:', sharpErr.message);
      optimizedBuffer = imageBuffer;
    }
    
    const base64Image = optimizedBuffer.toString('base64');
    const mimeType = 'image/webp'; // Always WebP after optimization

    // Parse conversation history
    let history = [];
    try {
      history = JSON.parse(historyStr || '[]');
    } catch (e) {
      history = [];
    }

    // Build system prompt specifically for vision tasks - structured analysis format
    const visionSystemPrompt = `You are an expert vision-based tutor. Analyze homework images with precision.

RESPOND ONLY IN THIS EXACT JSON FORMAT (no markdown, pure JSON):
{
  "visual_summary": "One sentence describing what you see in the image",
  "extracted_data": [
    "Key element 1 found (e.g., 'Math equation: 3x + 5 = 11')",
    "Key element 2 found (e.g., 'Graph showing parabola y = x²')",
    "Key element 3 found if applicable"
  ],
  "logic_steps": [
    {"step": 1, "title": "Step title", "explanation": "Detailed step explanation"},
    {"step": 2, "title": "Step title", "explanation": "Detailed step explanation"},
    {"step": 3, "title": "Step title", "explanation": "Detailed step explanation"}
  ],
  "final_solution": "The clear, highlighted final answer or conclusion",
  "confidence": "high|medium|low"
}

RULES:
1. visual_summary: Describe the IMAGE content objectively (what type of problem, subject area)
2. extracted_data: List ALL text, numbers, equations, or diagrams you can identify - be specific
3. logic_steps: Provide pedagogical breakdown - teach the concept, don't just solve
4. final_solution: State the answer clearly, boxed or highlighted format
5. confidence: Rate how clearly you could read/interpret the image

IMPORTANT: Output ONLY valid JSON. No explanatory text before or after.

Strict Rule: Keep your <think> section extremely brief, under 30 words. Do not show your scratchpad work; move directly to providing the structured JSON.`;

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
        options: { num_predict: 1024, num_ctx: 4096, temperature: 0.3 }
        // NOTE: No speculative_model here — draft models are text-only
        //       and can't process vision/image inputs.
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

    // Strip <think>…</think> reasoning blocks before anything else
    rawReply = rawReply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Attempt to parse as structured vision JSON
    let structured = null;
    let isVisionResponse = false;
    
    try {
      // Strip <think>…</think> reasoning blocks (Gemma thinking mode)
      let cleaned = rawReply.replace(/<think>[\s\S]*?<\/think>/gi, '');

      // Strip any accidental markdown code fences Gemma might add
      cleaned = cleaned
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      // Try direct parse; if that fails, extract the first JSON object
      try {
        structured = JSON.parse(cleaned);
      } catch (_) {
        const objMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objMatch) {
          structured = JSON.parse(objMatch[0].replace(/,(\s*[\]\}])/g, '$1'));
        }
      }
      
      // Check if it's the new vision format
      if (structured && structured.visual_summary && structured.extracted_data) {
        isVisionResponse = true;
      }
    } catch (e) {
      // Gemma failed to return valid JSON
      // Construct a vision-compatible fallback from raw text
      if (rawReply && rawReply.trim().length > 0) {
        structured = {
          visual_summary: 'Image analyzed - see details below',
          extracted_data: ['Unable to extract structured data from image'],
          logic_steps: [{
            step: 1,
            title: 'Analysis',
            explanation: rawReply
          }],
          final_solution: 'Please review the analysis above',
          confidence: 'low'
        };
        isVisionResponse = true;
      } else {
        structured = null;
      }
    }

    // Clean up uploaded temp file asynchronously so any cleanup failure
    // doesn't interfere with the already-sent response.
    fs.unlink(file.path, (err) => {
      if (err) console.warn('[image] cleanup failed:', err.message);
    });

    // Return vision-specific response format
    res.json({
      reply: rawReply,           // raw text fallback
      structured: structured,    // parsed object or constructed fallback
      isVision: isVisionResponse // flag for frontend to use vision renderer
    });
  } catch (err) {
    // Clean up file on error (async, best-effort)
    if (req.file) {
      fs.unlink(req.file.path, (e) => {
        if (e) console.warn('[image] cleanup failed:', e.message);
      });
    }
    console.error('[/chat-with-image] Error:', err.message);
    res.status(500).json({ error: err.message || 'Gemma is not running. Start Ollama first!' });
  }
});

// ============ POST /quiz — Quiz generation endpoint ============
app.post('/quiz', async (req, res) => {
  const quizStart = Date.now();
  const steps = [];
  const mark = (name, detail) => steps.push({ name, ms: Date.now() - quizStart, detail });

  const { topic, level, numQuestions } = req.body;
  console.log(`\n⏱  [/quiz] Started — topic: "${topic}", level: ${level}, questions: ${numQuestions}`);

  if (!topic || !level || !numQuestions) {
    return res.status(400).json({ error: 'Missing topic, level, or numQuestions' });
  }

  const numQuestionsInt = parseInt(numQuestions, 10);
  if (isNaN(numQuestionsInt) || numQuestionsInt < 3 || numQuestionsInt > 10) {
    return res.status(400).json({ error: 'numQuestions must be between 3 and 10' });
  }
  mark('Validate input', `topic="${topic}", ${numQuestionsInt} questions`);

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
  mark('Build prompt', `${quizPrompt.length} chars`);

  try {
    // Call Ollama
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:e4b',
        messages: [{ role: 'user', content: quizPrompt }],
        stream: false,
        options: { num_predict: 500, num_ctx: 4096 },
        speculative_model: 'gemma2:2b'
      })
    });
    mark('Ollama API call', `model=gemma4:e4b, status=${ollamaRes.status}`);

    if (!ollamaRes.ok) {
      throw new Error(`Ollama API error: ${ollamaRes.status} ${ollamaRes.statusText}`);
    }

    const data = await ollamaRes.json();
    mark('Parse Ollama response');
    
    if (!data.message || !data.message.content) {
      throw new Error('Invalid response from Ollama - no message content');
    }
    
    let responseText = data.message.content;
    console.log('[/quiz] Raw response length:', responseText.length);

    // ─── Robust JSON extraction and repair ───
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const jsonArrayMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) responseText = jsonArrayMatch[0];
    mark('Extract JSON array', `${responseText.length} chars`);

    // Repair common JSON issues
    responseText = responseText.replace(/,(\s*[\]\}])/g, '$1');
    responseText = responseText.replace(/\}(\s*)\{/g, '},$1{');
    responseText = responseText.replace(/([^\\])\\([^"\\nrtbfu])/g, '$1\\\\$2');
    responseText = responseText.replace(/[\x00-\x1F\x7F]/g, (char) => {
      if (char === '\n' || char === '\r' || char === '\t') return char;
      return '';
    });
    mark('Repair JSON');

    // Parse JSON with error recovery
    let questions;
    try {
      questions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[/quiz] JSON parse error:', parseError.message);
      const lastBracket = responseText.lastIndexOf(']');
      if (lastBracket > 0) {
        const trimmed = responseText.substring(0, lastBracket + 1);
        try {
          questions = JSON.parse(trimmed);
          console.log('[/quiz] Recovered by trimming to last ]');
        } catch (e) {
          throw new Error(`Invalid JSON from model: ${parseError.message}`);
        }
      } else {
        throw new Error(`Invalid JSON from model: ${parseError.message}`);
      }
    }
    mark('Parse JSON', Array.isArray(questions) ? `${questions.length} raw questions` : 'not an array');

    if (!Array.isArray(questions)) {
      return res.status(500).json({ error: 'Invalid quiz format: expected array of questions' });
    }

    // Validate and sanitize each question
    const validatedQuestions = questions
      .filter(q => q && typeof q === 'object')
      .map((q, index) => {
        const validated = {
          question: String(q.question || `Question ${index + 1}`).trim(),
          options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
          answer: String(q.answer || q.options?.[0] || 'A) Option 1').trim(),
          explanation: String(q.explanation || 'No explanation provided').trim()
        };
        while (validated.options.length < 4) {
          validated.options.push(`${String.fromCharCode(65 + validated.options.length)}) Option`);
        }
        validated.options = validated.options.slice(0, 4);
        if (!validated.options.some(opt => opt.startsWith(validated.answer.charAt(0)))) {
          validated.answer = validated.options[0];
        }
        return validated;
      })
      .filter(q => q.question && q.question.length > 5);

    if (validatedQuestions.length === 0) {
      return res.status(500).json({ error: 'No valid questions could be generated. Please try again.' });
    }
    mark('Validate questions', `${validatedQuestions.length} valid of ${questions.length} raw`);

    console.log(`[/quiz] Successfully generated ${validatedQuestions.length} questions`);
    const quizMs = Date.now() - quizStart;
    console.log(`✅ [/quiz] Done in ${(quizMs / 1000).toFixed(2)}s — ${validatedQuestions.length} questions generated`);
    res.json({ questions: validatedQuestions });
    mark('Send response');

    flowTraces['/quiz'] = {
      route: '/quiz', ts: Date.now(), totalMs: quizMs, status: 'ok',
      input: `${topic} (${numQuestionsInt}q, ${level})`, steps
    };
  } catch (err) {
    const quizMs = Date.now() - quizStart;
    mark('ERROR', err.message);
    flowTraces['/quiz'] = {
      route: '/quiz', ts: Date.now(), totalMs: quizMs, status: 'error',
      input: `${topic} (${numQuestions}q, ${level})`, steps
    };
    console.error(`❌ [/quiz] Error after ${(quizMs / 1000).toFixed(2)}s:`, err.message);
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

// POST — Dynamic Progress Evolution Report
app.post('/progress-report', async (req, res) => {
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

// ─── Socratic mode endpoint ─────────────────────
// Drives guided-discovery dialogue via Socratic questioning
app.post('/socratic', async (req, res) => {
  const { message, level, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const result = await runSocraticAgent(message, level || 'intermediate', history || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, rawReply: 'Socratic agent error: ' + err.message });
  }
});

// ─── Concept map endpoint ───────────────────────
// Generates a JSON concept map (nodes + edges) for a topic
app.post('/concept-map', async (req, res) => {
  const mapStart = Date.now();
  const steps = [];
  const mark = (name, detail) => steps.push({ name, ms: Date.now() - mapStart, detail });

  const { topic, level } = req.body;
  console.log(`\n⏱  [/concept-map] Started — topic: "${topic}", level: ${level || 'intermediate'}`);
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  mark('Validate input', `topic="${topic}", level=${level || 'intermediate'}`);

  try {
    const result = await toolImplementations.generate_concept_map({
      topic,
      level: level || 'intermediate'
    });
    mark('generate_concept_map tool', `nodes=${result?.nodes?.length || 0}, edges=${result?.edges?.length || 0}`);

    const mapMs = Date.now() - mapStart;
    console.log(`✅ [/concept-map] Done in ${(mapMs / 1000).toFixed(2)}s — nodes: ${result?.nodes?.length || '?'}, edges: ${result?.edges?.length || '?'}`);
    res.json(result);
    mark('Send response');

    flowTraces['/concept-map'] = {
      route: '/concept-map', ts: Date.now(), totalMs: mapMs, status: 'ok',
      input: `${topic} (${level || 'intermediate'})`, steps
    };
  } catch (err) {
    const mapMs = Date.now() - mapStart;
    mark('ERROR', err.message);
    flowTraces['/concept-map'] = {
      route: '/concept-map', ts: Date.now(), totalMs: mapMs, status: 'error',
      input: `${topic} (${level || 'intermediate'})`, steps
    };
    console.error(`❌ [/concept-map] Error after ${(mapMs / 1000).toFixed(2)}s:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Spaced repetition endpoints ────────────────
// GET topics due for review today
app.get('/due-reviews', (req, res) => {
  try {
    res.json({ reviews: getDueReviews() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update SRS after a review session
// grade: 0-5 (0=failed, 3=passed, 5=perfect)  OR  score: 0-100 (auto-converted)
app.put('/srs/:topic', (req, res) => {
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

// ─── Streak endpoint ────────────────────────────
app.get('/streak', (req, res) => {
  try {
    res.json(getLearningStreak());
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

// ── Bulk Upload (CSV / Excel) ──────────────────────────────────
// Separate multer for spreadsheet files — stored temporarily in uploads/
const spreadsheetUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'                           // some systems send csv as text/plain
    ];
    if (allowed.includes(file.mimetype) ||
        file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are allowed'), false);
    }
  }
});

// GET — download a CSV template teachers can fill in
app.get('/admin/taxonomy/template.csv', (req, res) => {
  const csv = [
    'topic,keywords,subject',
    'Photosynthesis,"photosynthesis, chloroplast, light reaction, calvin cycle",biology',
    'Newton\'s Laws,"newton, force, motion, inertia, f=ma",physics',
    'Quadratic Equations,"quadratic, parabola, discriminant, roots",mathematics',
    'World War II,"ww2, world war 2, allied powers, axis powers",history'
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="taxonomy_template.csv"');
  res.send(csv);
});

// POST — bulk upload CSV or Excel file
app.post('/admin/taxonomy/bulk-upload', spreadsheetUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send a CSV or Excel file as the "file" field.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname.toLowerCase();

  try {
    let rows = [];

    if (originalName.endsWith('.csv') || originalName.endsWith('.txt')) {
      // ── Parse CSV ──
      const raw = fs.readFileSync(filePath, 'utf8');
      rows = csvParse(raw, {
        columns: true,          // first row = headers
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } else {
      // ── Parse Excel (.xlsx / .xls) ──
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    }

    // Clean up the temp file
    fs.unlink(filePath, () => {});

    if (!rows.length) {
      return res.status(400).json({ error: 'File is empty or has no data rows.' });
    }

    // Normalise column names (case-insensitive, trim whitespace)
    rows = rows.map(row => {
      const norm = {};
      for (const [k, v] of Object.entries(row)) {
        norm[k.toLowerCase().trim()] = typeof v === 'string' ? v.trim() : String(v);
      }
      return norm;
    });

    // Validate: must have a "topic" column
    if (!rows[0].hasOwnProperty('topic')) {
      return res.status(400).json({
        error: 'Missing "topic" column. The file must have a header row with at least: topic, keywords, subject',
        columns_found: Object.keys(rows[0])
      });
    }

    // Process each row
    const results = { added: [], skipped: [], errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is the header, data starts at row 2

      const topic = (row.topic || '').trim();
      if (!topic) {
        results.skipped.push({ row: rowNum, reason: 'Empty topic name' });
        continue;
      }

      // Parse keywords: comma-separated string → array
      let keywords = [];
      if (row.keywords) {
        keywords = row.keywords.split(',').map(k => k.trim()).filter(Boolean);
      }
      // Auto-generate keywords from topic words if none provided
      if (keywords.length === 0) {
        keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      }

      const subject = (row.subject || 'general').trim().toLowerCase();

      try {
        const key = manuallyAddTopic(topic, keywords, subject);
        results.added.push({ row: rowNum, topic, key, keywords_count: keywords.length });
      } catch (err) {
        results.errors.push({ row: rowNum, topic, error: err.message });
      }
    }

    res.json({
      success: true,
      total_rows: rows.length,
      added: results.added.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      details: results
    });

  } catch (err) {
    // Clean up on error
    fs.unlink(filePath, () => {});
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
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

  // ── Flow Traces API ──────────────────────────────
  // Returns the last request's step-by-step timing for each instrumented route
  app.get('/dev/flow-traces', (req, res) => {
    res.json(flowTraces);
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