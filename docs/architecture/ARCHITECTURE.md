# StudyBuddy Architecture & API Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Web UI (Frontend)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Chat    │  │Progress  │  │Settings  │  │ Message  │        │
│  │ Page     │  │  Page    │  │  Page    │  │ Stream   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│        │                                           │             │
│        └─────────────────┬─────────────────────────┘             │
│                          │                                       │
│                    POST /api/chat                                │
│              (with streaming support)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express.js Backend (server.js)                     │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Request Handler                                       │   │
│  │  - Parse message from student                          │   │
│  │  - Check for special commands (reset, export, etc)     │   │
│  └─────────────────┬──────────────────────────────────────┘   │
│                    │                                            │
│                    ▼                                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Claude API Orchestrator                               │   │
│  │  - Maintain conversation history                       │   │
│  │  - Send tool definitions                               │   │
│  │  - Receive tool_use blocks from Claude                 │   │
│  └─────────────────┬──────────────────────────────────────┘   │
│                    │                                            │
│                    ├─ If tool_use: call Agent Tools ─┐         │
│                    │                                  │         │
│                    └──────────────────────┬──────────┘         │
│                                           │                    │
│  ┌────────────────────────────────────────▼────────────────┐   │
│  │  Agent Tools Layer (tools.js)                           │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │   │
│  │  │explain_topic │  │generate_quiz │  │track_prog  │   │   │
│  │  │              │  │              │  │  suggest   │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──┬───┬─────┘   │   │
│  │         │                 │             │   │         │   │
│  │         └────────────────────┬────────────┘   │       │   │
│  │                              │                 │       │   │
│  │              ┌───────────────┘                 │       │   │
│  │              ▼                                 │       │   │
│  │          ┌─────────────────┐           ┌──────▼────┐  │   │
│  │          │ Ollama Gemma 4  │           │ Progress  │  │   │
│  │          │ (e4b / e2b)     │           │  Store    │  │   │
│  │          └─────────────────┘           └───────────┘  │   │
│  │                                                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                    │                                            │
│                    ▼                                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Claude Synthesis                                       │   │
│  │  - Receive tool results                                │   │
│  │  - Synthesize into natural response                    │   │
│  │  - Stream back to client                               │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    Server-Sent Events
                    (data: {...}\n\n)
                           │
                           ▼
                    React UI Re-renders
```

## Data Flow Examples

### Scenario 1: Student Asks for Explanation

```
Student: "Explain photosynthesis"
    ↓ 
Claude: "I'll explain photosynthesis. Let me generate a structured explanation."
Claude calls tool_use: explain_topic(topic: "photosynthesis", level: "beginner")
    ↓
Agent calls Ollama with structured prompt
    ↓
Ollama returns: { intro: "...", steps: [{title, text, emoji}], answer: "...", followup: "..." }
    ↓
track_progress(topic: "photosynthesis", level: "beginner", quizScore: null)
    ↓
Claude synthesizes: "Photosynthesis is... [steps from Ollama] ...Let's test your understanding with a quiz!"
    ↓
Response streamed to UI with step-by-step explanation
```

### Scenario 2: Student Takes Quiz

```
Student: "Test me on photosynthesis"
    ↓
Claude: "Great! I'll generate questions about photosynthesis."
Claude calls: generate_quiz(topic: "photosynthesis", level: "beginner", numQuestions: 3)
    ↓
Agent calls Ollama with quiz generation prompt
    ↓
Ollama returns: [
    {question: "What is the main product?", options: [...], answer: "A) Glucose", explanation: "..."},
    ...
]
    ↓
Claude streams: "Question 1: What is the main product of photosynthesis?"
(Wait for student response after each question)
    ↓
After all answers: Claude calls track_progress(topic: "photosynthesis", level: "beginner", quizScore: 75)
    ↓
Progress saved. Claude suggests next topic using suggest_next_topic()
```

### Scenario 3: Student Asks for Recommendation

```
Student: "What should I study next?"
    ↓
Claude: "Let me check your progress and suggest the best next topic."
Claude calls: suggest_next_topic(currentTopic: "photosynthesis", subject: "biology")
    ↓
Agent reads progressStore: { weakAreas: ["cell_respiration"], strongAreas: ["photosynthesis"] }
    ↓
Agent calls Ollama: "Student just studied photosynthesis, weak at cell_respiration. Suggest next topic."
    ↓
Ollama returns: { nextTopic: "Cellular Respiration", reason: "Complements photosynthesis", relatedTo: "Both use ATP" }
    ↓
Claude presents recommendation to student
```

## API Reference

### POST /api/chat

**Request:**
```json
{
  "message": "Explain photosynthesis",
  "stream": true
}
```

**Response (Streaming):**
```
data: {"type":"content","text":"Photosynthesis is..."}\n\n
data: {"type":"content","text":" the process by which"}\n\n
data: {"type":"tool_call","toolName":"explain_topic","toolInput":{"topic":"photosynthesis","level":"beginner"}}\n\n
data: {"type":"tool_result","result":{"success":true,"explanation":{...}}}\n\n
data: {"type":"content","text":"Great! Here are the key steps:"}\n\n
data: {"type":"done"}\n\n
```

**Response (Non-Streaming):**
```json
{
  "response": "Full response text",
  "toolCalls": [
    {
      "toolName": "explain_topic",
      "input": {"topic":"photosynthesis","level":"beginner"},
      "result": {...}
    }
  ],
  "metadata": {
    "tokensUsed": 1234,
    "executionTime": 3.45,
    "modelsUsed": ["claude-3-5-sonnet", "gemma4:e4b"]
  }
}
```

## Tool Definitions & Contracts

### Tool 1: explain_topic

**Input Schema:**
```json
{
  "topic": "string, e.g. 'photosynthesis'",
  "level": "enum: 'beginner' | 'intermediate' | 'advanced'",
  "context": "optional string for extra context"
}
```

**Output Schema:**
```json
{
  "success": "boolean",
  "explanation": {
    "intro": "1-2 sentence overview",
    "steps": [
      {
        "title": "step label",
        "text": "one sentence explanation",
        "emoji": "relevant emoji"
      }
    ],
    "answer": "key takeaway sentence",
    "followup": "check-understanding question"
  },
  "topic": "string",
  "level": "string"
}
```

**When to Call:** 
- Student asks to learn/understand a topic
- First step of any learning session
- Always called before quiz for consistency

---

### Tool 2: generate_quiz

**Input Schema:**
```json
{
  "topic": "string",
  "level": "enum: 'beginner' | 'intermediate' | 'advanced'",
  "numQuestions": "number, clamped to 2-5"
}
```

**Output Schema:**
```json
{
  "success": "boolean",
  "questions": [
    {
      "question": "Question text with ?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "answer": "A) Option 1",
      "explanation": "Why this is correct."
    }
  ],
  "topic": "string",
  "numQuestions": "number"
}
```

**When to Call:**
- Student wants to practice/test knowledge
- After explaining a concept
- To assess learning before moving forward

---

### Tool 3: track_progress

**Input Schema:**
```json
{
  "topic": "string",
  "level": "enum: 'beginner' | 'intermediate' | 'advanced'",
  "quizScore": "optional number 0-100, omit if no quiz taken"
}
```

**Output Schema:**
```json
{
  "success": "boolean",
  "saved": {
    "topic": "string",
    "level": "string",
    "quizScore": "number or null"
  },
  "topicRecord": {
    "topic": "string",
    "level": "string",
    "count": "number of times studied",
    "avgScore": "number or null",
    "lastStudied": "ISO date string",
    "allScores": "array of quiz scores"
  },
  "weakAreas": ["array of topics with score < 60%"],
  "totalStudied": "number of unique topics"
}
```

**When to Call:**
- After every learning session
- After every quiz taken
- To build student's learning history

---

### Tool 4: suggest_next_topic

**Input Schema:**
```json
{
  "currentTopic": "string, what was just studied",
  "subject": "optional string, broad subject area"
}
```

**Output Schema:**
```json
{
  "success": "boolean",
  "nextTopic": "string, name of recommended topic",
  "reason": "one sentence why this is beneficial",
  "relatedTo": "how it connects to current topic"
}
```

**When to Call:**
- End of learning session, student asks "what next?"
- After weak area is identified
- To guide personalized learning path

---

## Progress Store Schema

**File:** `data/progress.json`

```json
{
  "topics": [
    {
      "name": "photosynthesis",
      "level": "beginner",
      "count": 3,
      "avgScore": 85,
      "allScores": [90, 80, 85],
      "lastStudied": "2025-01-15T14:23:00Z"
    }
  ],
  "lastUpdated": "2025-01-15T14:23:00Z"
}
```

**getProgressSummary() returns:**
```json
{
  "topics": [array of topic objects],
  "weakAreas": ["topics with avg score < 60%"],
  "strongAreas": ["topics with avg score >= 80%"],
  "totalTopicsStudied": 5
}
```

## Model Selection Logic

**Current Models:**
- `FULL_MODEL = "gemma4:e4b"` - High quality, slower (used for explanations, chat synthesis)
- `FAST_MODEL = "gemma4:e2b"` - Fast inference (used for quiz generation, planning, suggestions)

**Routing Decision (in server.js):**
- If Claude calls `explain_topic` → Use `FULL_MODEL` (explain needs nuance)
- If Claude calls `generate_quiz` → Use `FAST_MODEL` (just needs structured output)
- If Claude calls `suggest_next_topic` → Use `FAST_MODEL` (planning task)
- If Claude calls `track_progress` → Skip Ollama (local operation)
- For final response synthesis → Use `FULL_MODEL` (quality matters)

**Future Optimization:**
- Cache explanations: `hash(topic+level+model)` → response
- Batch quizzes: multiple questions in one Ollama call
- Fine-tune models on common student topics

## Error Handling Strategy

```
Try Tool Call
    ↓
┌─ Success? ─Yes─→ Return result
│
└─ No
    ↓
Is Ollama unavailable?
    ├─ Yes → Return apologetic message, suggest retry
    └─ No → Is JSON malformed?
        ├─ Yes → Return structured fallback, log error
        └─ No → Return generic error, include debug info
```

## Deployment Checklist

- [ ] Ollama running with `gemma4:e4b` and `gemma4:e2b` downloaded
- [ ] `.env` file with `ANTHROPIC_API_KEY` set
- [ ] Backend dependencies installed: `npm install`
- [ ] Frontend dependencies installed: `cd frontend && npm install`
- [ ] `data/` directory exists and is writable
- [ ] Backend starts without errors: `npm start`
- [ ] Frontend starts without errors: `cd frontend && npm run dev`
- [ ] Test chat flow end-to-end
- [ ] Check Progress page reflects saved data
- [ ] Monitor logs for errors in first 10 minutes

---

**Architecture Version:** 2.0  
**Last Updated:** January 2025  
**Status:** Production-ready (pending model routing optimization)
