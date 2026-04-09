// ── Chat Routes ──────────────────────────────────
// POST /chat (SSE streaming) and POST /chat-with-image (vision)

const express = require('express');
const fs      = require('fs');
const sharp   = require('sharp');
const router  = express.Router();

const { buildSystemPrompt, estimateResponseTime } = require('../lib/helpers');
const { upload }       = require('../middleware/upload');
const { flowTraces }   = require('../middleware/devTiming');

// ============ POST /estimate — Quick time estimate (no Ollama call) ============
router.post('/estimate', (req, res) => {
  const { message, level, hasImage } = req.body;
  const estimate = estimateResponseTime(
    message || '',
    level || 'intermediate',
    hasImage || false
  );
  res.json(estimate);
});

// Main chat route — SSE streaming
router.post('/chat', async (req, res) => {
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
router.post('/chat-with-image', upload.single('image'), async (req, res) => {
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

module.exports = router;
