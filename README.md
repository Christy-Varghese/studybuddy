# StudyBuddy 📚 — AI-Powered Educational Tutor

An intelligent tutoring system that combines **Claude 3.5**, **Gemma 4 LLM** (via Ollama), and **persistent progress tracking** to provide personalized, adaptive learning experiences.

**New in v2.0:** Tool-based architecture with progress persistence, weak area detection, and personalized learning path recommendations.

## 🚀 Quick Start

### Prerequisites
- **Ollama** with `gemma4:e4b` and `gemma4:e2b` models (download from [ollama.ai](https://ollama.ai))
- **Node.js 16+**
- **Anthropic API Key** for Claude
- **8GB RAM** (for Gemma 4 inference)

### Setup (5 minutes)

```bash
# 1. Start Ollama (in terminal 1)
ollama run gemma4:e4b

# 2. In a new terminal, set up backend
cd studybuddy
npm install
echo "ANTHROPIC_API_KEY=sk-..." > .env
npm start
# Backend runs on http://localhost:3000

# 3. In another terminal, start frontend
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

Then open http://localhost:5173 in your browser.

---

## � Documentation

| Document | Purpose |
|----------|---------|
| **[PROGRESS_SUMMARY.md](./PROGRESS_SUMMARY.md)** | **START HERE** — Overview of architecture and what's been implemented |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Detailed system design, data flows, API specs, tool contracts |
| **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** | Development status, next steps, testing checklist |

---

## 📁 Project Structure

```
studybuddy/
├── agent/
│   ├── tools.js                    ← 4 core learning tools (explain, quiz, track, suggest)
│   └── progressStore.js            ← Persistent progress tracking (JSON-based)
├── data/
│   └── progress.json              ← Student learning history
├── frontend/
│   ├── src/
│   │   ├── App.tsx                ← React router
│   │   └── pages/
│   │       ├── Chat.tsx            ← Main conversational interface
│   │       ├── Progress.tsx        ← Analytics & statistics
│   │       └── Settings.tsx        ← Configuration
│   └── package.json
├── server.js                       ← Express API & Claude orchestration
├── package.json                    ← Backend dependencies
├── README.md                       ← This file
├── PROGRESS_SUMMARY.md             ← Session notes and accomplishments
├── IMPLEMENTATION_STATUS.md        ← Development roadmap
└── ARCHITECTURE.md                 ← System design details
```

## �📁 Project Structure

```
studybuddy/
├── server.js              ← Node.js backend (3 routes)
├── public/
│   └── index.html         ← Frontend UI (polished design)
├── uploads/               ← Temporary image storage
├── package.json           ← Dependencies
├── KAGGLE_WRITEUP.md      ← Hackathon submission template
└── README.md              ← This file
```

---

## ✨ Core Features

### 📖 Interactive Learning
- **Structured Explanations** - Topics broken into step-by-step guides with emojis
- **Auto-Generated Quizzes** - 2-5 multiple choice questions per topic
- **Immediate Feedback** - Explanations for why answers are correct
- **Natural Conversation** - Chat naturally with an AI tutor

### 📊 Progress Tracking
- **Persistent Study History** - All topics and scores automatically saved
- **Weak Area Detection** - System identifies topics you need to review
- **Performance Analytics** - Visualize your strong and weak areas
- **Personalized Recommendations** - Smart suggestions based on your learning profile

### ⚡ Smart Features
- **Model Optimization** - Gemma 4 for cost-effective responses, Claude for orchestration
- **Real-Time Streaming** - See responses character-by-character
- **Session Persistence** - Your progress persists across sessions
- **Flexible Learning** - Learn any topic at your own pace

---

## ✨ Features

### 1️⃣ **Adaptive Chat** (`POST /chat`)
- Ask questions in text
- Three difficulty levels: Beginner → Advanced
- Explanations adapt to your knowledge level
- Multi-turn conversation history

### 2️⃣ **Homework Photo Analysis** (`POST /chat-with-image`)
- 📎 Snap a photo of your homework
- Upload images (JPEG, PNG, WebP)
- StudyBuddy analyzes the image and explains it
- Max 10MB per image

### 3️⃣ **Quiz Generation** (`POST /quiz`)
- Generate custom quizzes on ANY topic
- Configurable difficulty level (Beginner/Intermediate/Advanced)
- 3-10 questions per quiz
- Instant feedback with explanations
- Score tracking

---

## 🎯 How It Works

```
You ask a question
    ↓
Claude (via Anthropic API) understands your intent
    ↓
Decides which tool to call (explain, quiz, track, suggest)
    ↓
Tool calls Ollama Gemma 4 or manipulates progress store
    ↓
Results are synthesized into natural response
    ↓
You see personalized, adaptive response with context
```

### Example Flow: Learn & Quiz

**You:** "Explain photosynthesis"  
**StudyBuddy:** 
- Calls `explain_topic` → Ollama generates step-by-step explanation
- Shows intro + 4 steps + key takeaway
- Calls `track_progress` → Saves "photosynthesis" to your history

**You:** "Test me on that"  
**StudyBuddy:**
- Calls `generate_quiz` → Ollama creates 3 questions
- You answer each question
- Shows explanations for right answers
- Calls `track_progress` with your quiz score (e.g., 75%)

**You:** "What should I study next?"  
**StudyBuddy:**
- Calls `suggest_next_topic` → Reads your progress
- Sees you got 55% on "Cell Respiration"
- Recommends: "Study Cellular Respiration (you're weak here and it complements photosynthesis)"

---

## 🎨 UI/UX Highlights

✅ **Dark Mode Support** — Uses `@media (prefers-color-scheme: dark)`

✅ **Responsive Design** — Works on desktop, tablet, mobile

✅ **Smooth Animations** — Fade-in messages, pulsing status dots, sliding modals

✅ **Polished Color Scheme** — Purple gradient header, intuitive controls

✅ **Accessible** — Clear typography, good contrast ratios

---

## 🔧 API Routes

### `POST /api/chat` - Main Learning Interface
Send a message to the tutor and get an intelligent response with optional tool calls.

**Request:**
```json
{
  "message": "Explain photosynthesis",
  "stream": true
}
```

**Response (Streaming):**
Server-sent events with real-time text:
```
data: {"type":"content","text":"Photosynthesis is..."}\n\n
data: {"type":"content","text":" the process..."}\n\n
data: {"type":"done"}\n\n
```

**Response (Non-Streaming):**
```json
{
  "response": "Full response text with complete explanation",
  "toolCalls": [
    {
      "toolName": "explain_topic",
      "input": {"topic":"photosynthesis","level":"beginner"},
      "result": {"success":true,"explanation":{...}}
    }
  ],
  "metadata": {
    "tokensUsed": 1234,
    "executionTime": 3.45
  }
}
```

For full API specification, see [ARCHITECTURE.md](./ARCHITECTURE.md#api-reference).

---

## 🔑 Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Orchestration** | Claude 3.5 Sonnet (Anthropic API) | Understands intent, calls tools, synthesizes responses |
| **Explanation & Quiz** | Gemma 4 E4B via Ollama | Cost-effective, local LLM for content generation |
| **Fast Planning** | Gemma 4 E2B via Ollama | Optimized for fast inference on planning tasks |
| **Progress Store** | JSON file (`data/progress.json`) | Persistent storage of learning history |
| **Frontend** | React + TypeScript + Vite | Modern UI with real-time streaming |
| **Backend** | Node.js + Express | REST API, tool orchestration, file handling |

---

## 📊 System Architecture

StudyBuddy uses a **tool-based architecture** where Claude orchestrates specialized tools:

1. **Student Input** → Natural language question
2. **Claude** → Analyzes intent, decides which tools to call
3. **Tool Calls** → `explain_topic`, `generate_quiz`, `track_progress`, `suggest_next_topic`
4. **Ollama Gemma 4** → Generates explanations, quizzes
5. **Progress Store** → Saves and analyzes learning history
6. **Response Synthesis** → Claude creates natural, context-aware response
7. **Streaming Output** → React frontend renders in real-time

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system diagrams and detailed data flows.

---

## 📄 System Prompt (Claude)

Claude is instructed to:
- Understand student's learning intent
- Call appropriate tools (explain, quiz, track, suggest)
- Adapt complexity to student's level
- Always explain why answers are correct
- Maintain conversation context
- Personalize recommendations based on progress

---

## 🎯 Use Cases

- 📚 **Students** needing personalized tutoring without expensive tutors
- 🌍 **Offline learners** without reliable internet access
- 👨‍👩‍👧‍👦 **Parents** wanting privacy-first homework help
- 🔬 **Self-learners** testing knowledge with adaptive quizzes
- 🏫 **Educators** using AI to supplement classroom learning

---

## 🛠️ Development

### Running the Full Stack

```bash
# Terminal 1: Start Ollama
ollama run gemma4:e4b

# Terminal 2: Backend
cd studybuddy
npm install
npm start

# Terminal 3: Frontend  
cd studybuddy/frontend
npm install
npm run dev
```

### Project Architecture
See [PROGRESS_SUMMARY.md](./PROGRESS_SUMMARY.md) for:
- What's been implemented
- Architecture overview
- Recent accomplishments
- Next steps for development

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for:
- Current development status
- High/medium/low priority tasks
- Testing checklist
- Known issues

---

## 🚨 Troubleshooting

**Error: "Ollama connection refused"**
```bash
# Check Ollama is running
curl http://localhost:11434/api/chat

# Start Ollama if needed
ollama run gemma4:e4b
```

**API key error**
```bash
# Verify .env file with ANTHROPIC_API_KEY
cat .env
# Should contain: ANTHROPIC_API_KEY=sk-...
```

**Progress not saving**
```bash
# Ensure data directory exists and is writable
mkdir -p data
chmod 755 data
```

**Frontend shows "Failed to fetch"**
```bash
# Check backend is running on port 3000
lsof -i :3000

# Restart backend
npm start
```

**Responses too slow**
- First request to Ollama takes ~10 seconds (model warmup)
- Subsequent requests typically < 3 seconds
- Check system has 8GB+ RAM available

---

## � Next Steps

### For Users
1. **Try it out:** Ask questions in the Chat tab
2. **Take quizzes:** Use the quiz generator to test knowledge
3. **Check progress:** View your weak areas in the Progress tab
4. **Get recommendations:** Ask "what should I study next?"

### For Developers
See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for:
- **High Priority:** Model routing optimization in `server.js`
- **Medium Priority:** Error handling and performance tuning
- **Low Priority:** Advanced features (image analysis, multi-user, spaced repetition)

### Contributing
We welcome contributions! To extend StudyBuddy:
1. Add new tools to `agent/tools.js`
2. Claude will automatically discover and use them
3. See [ARCHITECTURE.md](./ARCHITECTURE.md) for tool contracts

---

## �📄 License

Open-source educational tool. Use freely for learning and development!

---

## 👨‍💻 Built with ❤️

**StudyBuddy** brings frontier AI (Claude + Gemma 4) to every student with **personalized learning paths**, **persistent progress tracking**, and **adaptive explanations**.

### Key Innovations
✅ Tool-based architecture for composable learning  
✅ Persistent progress store for weak area detection  
✅ Model routing for cost efficiency  
✅ Streaming UI for responsive interaction  
✅ No internet required (runs locally)  

**Status:** ✅ Alpha (Active Development)  
**Last Updated:** January 2025  

---

For detailed information about features, architecture, and development:
- 📖 **[PROGRESS_SUMMARY.md](./PROGRESS_SUMMARY.md)** - Start here for overview
- 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design & API reference
- 📋 **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - Development roadmap
