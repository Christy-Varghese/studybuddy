// ── Quiz Route ───────────────────────────────────
// POST /quiz — Quiz generation endpoint

const express = require('express');
const router  = express.Router();

const { flowTraces }      = require('../middleware/devTiming');
const { parseQuizResponse } = require('../lib/parseJSON');
const { ollamaOptions }   = require('../lib/helpers');

router.post('/quiz', async (req, res) => {
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
    // Call Ollama with a timeout to prevent server hang on long quiz generation
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 110000); // 110s max

    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gemma4:e4b',
        messages: [{ role: 'user', content: quizPrompt }],
        stream: false,
        options: { ...ollamaOptions('quiz'), num_ctx: 4096 },
        speculative_model: 'gemma2:2b'
      })
    });
    clearTimeout(timeout);
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

    // ─── Robust JSON parsing via central parser ───
    // Strip <think> blocks before parsing
    responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const questions = parseQuizResponse(responseText);
    mark('Parse JSON', `${questions.length} questions via parseQuizResponse`);

    if (questions.length === 0) {
      console.warn('[quiz] parseQuizResponse returned empty array — raw preview:',
        responseText.slice(0, 150));
      return res.status(500).json({ error: 'No valid questions could be generated. Please try again.' });
    }

    // Validate and sanitize each question (preserve existing validation logic)
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
    mark('Validate questions', `${validatedQuestions.length} valid`);

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
    if (err.name === 'AbortError') {
      console.warn(`⏰ [/quiz] Timed out after ${(quizMs / 1000).toFixed(1)}s`);
      return res.json({ success: false, questions: [], error: 'Quiz generation timed out', topic, level });
    }
    console.error(`❌ [/quiz] Error after ${(quizMs / 1000).toFixed(2)}s:`, err.message);
    res.json({ success: false, questions: [], error: err.message || 'Quiz generation failed', topic, level });
  }
});

module.exports = router;
