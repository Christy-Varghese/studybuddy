const { saveProgress, getProgressSummary } = require('./progressStore');

// ─────────────────────────────────────────────
// TIMING WRAPPER FOR DEV METRICS
// Wraps fetch calls to Ollama and measures milliseconds
// ─────────────────────────────────────────────
async function timedFetch(url, options) {
  const start = Date.now();
  const res   = await fetch(url, options);
  const ms    = Date.now() - start;
  return { res, ms };
}

// ─────────────────────────────────────────────
// MODEL ROUTING
// Use fast model for structured tasks, full model for quality
// ─────────────────────────────────────────────
const FAST_MODEL = 'gemma4:e4b';   // planning, quiz gen, suggest_next, synthesis (e2b not available, using e4b)
const FULL_MODEL = 'gemma4:e4b';   // standard chat, image analysis

// ─────────────────────────────────────────────
// TOOL DEFINITIONS
// These are sent to Gemma in the system prompt
// so it knows what tools are available and when
// to call each one.
// ─────────────────────────────────────────────
const toolDefinitions = [
  {
    name: 'explain_topic',
    description: `Explains an educational topic to the student in a structured way.
      Use this tool ALWAYS as the first tool when a student asks to understand, learn,
      or explain something. Returns a structured explanation with steps.`,
    parameters: {
      type: 'object',
      properties: {
        topic:   { type: 'string', description: 'The topic to explain, e.g. "photosynthesis"' },
        level:   { type: 'string', enum: ['beginner','intermediate','advanced'],
                   description: 'The student level' },
        context: { type: 'string', description: 'Any extra context from the student message' }
      },
      required: ['topic', 'level']
    }
  },
  {
    name: 'generate_quiz',
    description: `Generates multiple-choice quiz questions on a topic to test understanding.
      Use this tool AFTER explaining a topic, or when the student asks to be tested,
      or when the student says they want to practice.`,
    parameters: {
      type: 'object',
      properties: {
        topic:        { type: 'string', description: 'Topic to quiz on' },
        level:        { type: 'string', enum: ['beginner','intermediate','advanced'] },
        numQuestions: { type: 'number', description: 'Number of questions, between 2 and 5' }
      },
      required: ['topic', 'level', 'numQuestions']
    }
  },
  {
    name: 'track_progress',
    description: `Saves the student's study activity to their progress record.
      Use this tool ALWAYS after explaining a topic or generating a quiz.
      This builds the student's learning history so future sessions can adapt.`,
    parameters: {
      type: 'object',
      properties: {
        topic:     { type: 'string', description: 'The topic that was studied' },
        level:     { type: 'string', enum: ['beginner','intermediate','advanced'] },
        quizScore: { type: 'number', description: 'Score 0-100 if a quiz was taken, else omit' }
      },
      required: ['topic', 'level']
    }
  },
  {
    name: 'suggest_next_topic',
    description: `Suggests what the student should study next based on their progress history.
      Use this tool at the END of a session, after explaining and optionally quizzing,
      to give the student a personalised learning path recommendation.`,
    parameters: {
      type: 'object',
      properties: {
        currentTopic: { type: 'string', description: 'What was just studied' },
        subject:      { type: 'string', description: 'Broad subject area, e.g. "biology"' }
      },
      required: ['currentTopic']
    }
  }
];

// ─────────────────────────────────────────────
// TOOL IMPLEMENTATIONS
// These run when Gemma calls a tool.
// Each returns a plain object — the result is
// fed back to Gemma as a tool_response.
// ─────────────────────────────────────────────

// Tool 1: explain_topic
// Builds the structured explanation prompt and calls Ollama directly
async function explain_topic({ topic, level, context }) {
  const systemPrompt = `You are StudyBuddy, a clear and patient tutor.
Respond ONLY with valid JSON matching this exact structure:
{
  "intro": "1-2 sentence opener",
  "steps": [
    { "title": "step label", "text": "one sentence", "emoji": "" }
  ],
  "answer": "key takeaway sentence",
  "followup": "one check-understanding question"
}
Steps: 3-5 items. No markdown inside strings. Plain text only.`;

  const userMsg = context
    ? `Explain "${topic}" to a ${level} student. Extra context: ${context}`
    : `Explain "${topic}" to a ${level} student.`;

  const { res: response, ms: fetchMs } = await timedFetch('http://localhost:11434/api/chat', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:    'gemma4:e4b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMsg }
      ],
      stream: false
    })
  });

  const data    = await response.json();
  const rawText = data.message.content;

  try {
    const cleaned = rawText.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
    return { success: true, explanation: JSON.parse(cleaned), topic, level, _ms: fetchMs };
  } catch {
    return { success: true, explanation: { intro: rawText, steps: [], answer: '', followup: '' }, topic, level, _ms: fetchMs };
  }
}

// Tool 2: generate_quiz
// Generates N multiple choice questions and returns them as structured JSON
async function generate_quiz({ topic, level, numQuestions }) {
  const n = Math.min(Math.max(Math.round(numQuestions), 2), 5);

  const systemPrompt = `You are a quiz generator.
Respond ONLY with a valid JSON array. No markdown. No explanation. Just the raw JSON.
Format:
[
  {
    "question": "Question text?",
    "options":  ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer":   "A) ...",
    "explanation": "Brief reason why correct."
  }
]`;

  const { res: response, ms: fetchMs } = await timedFetch('http://localhost:11434/api/chat', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:    'gemma4:e4b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Generate exactly ${n} multiple choice questions about "${topic}" for a ${level} level student.` }
      ],
      stream: false
    })
  });

  const data    = await response.json();
  const rawText = data.message.content;

  try {
    const cleaned   = rawText.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
    const questions = JSON.parse(cleaned);
    return { success: true, questions, topic, numQuestions: questions.length, _ms: fetchMs };
  } catch {
    return { success: false, error: 'Quiz generation failed', questions: [], _ms: fetchMs };
  }
}

// Tool 3: track_progress
// Saves to the progress JSON store and returns a summary
function track_progress({ topic, level, quizScore }) {
  try {
    const topicData = saveProgress(topic, level, quizScore ?? null);
    const summary   = getProgressSummary();
    return {
      success:     true,
      saved:       { topic, level, quizScore },
      topicRecord: topicData,
      weakAreas:   summary.weakAreas,
      totalStudied: summary.totalTopicsStudied
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Tool 4: suggest_next_topic
// Reads progress store and asks Gemma for a smart next-topic recommendation
async function suggest_next_topic({ currentTopic, subject }) {
  const summary = getProgressSummary();

  const context = `
Student just studied: ${currentTopic}
Subject area: ${subject || 'general'}
Topics studied so far: ${summary.topics.map(t => t.name).join(', ') || 'none yet'}
Weak areas (low scores): ${summary.weakAreas.join(', ') || 'none identified yet'}
Strong areas: ${summary.strongAreas.join(', ') || 'none yet'}
  `.trim();

  const { res: response, ms: fetchMs } = await timedFetch('http://localhost:11434/api/chat', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:    'gemma4:e4b',
      messages: [
        { role: 'system', content: `You are a curriculum advisor. Based on the student's progress, suggest the SINGLE most beneficial next topic to study. Respond ONLY with valid JSON: { "nextTopic": "topic name", "reason": "one sentence why", "relatedTo": "how it connects to what they just studied" }` },
        { role: 'user',   content: context }
      ],
      stream: false
    })
  });

  const data    = await response.json();
  const rawText = data.message.content;

  try {
    const cleaned = rawText.replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim();
    return { success: true, ...JSON.parse(cleaned), _ms: fetchMs };
  } catch {
    return { success: true, nextTopic: 'Review previous topics', reason: 'Consolidate before moving forward', relatedTo: currentTopic, _ms: fetchMs };
  }
}

// Map tool name strings to their implementation functions
const toolImplementations = {
  explain_topic,
  generate_quiz,
  track_progress,
  suggest_next_topic
};

module.exports = { toolDefinitions, toolImplementations };
