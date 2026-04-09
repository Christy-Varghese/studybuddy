// ── Shared utility functions ─────────────────────
// buildSystemPrompt and estimateResponseTime, used across multiple routes.

// Estimate response time based on complexity
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

module.exports = { estimateResponseTime, buildSystemPrompt };
