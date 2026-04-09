# StudyBuddy 📚 — Offline AI Tutor Powered by Gemma 4

An intelligent, fully offline tutoring platform that runs entirely on your device using **Gemma 4 via Ollama**. No cloud, no API keys, no internet required after setup.

Built for the [Gemma 4 Good Hackathon](https://kaggle.com/competitions/gemma-4-good-hackathon) — Future of Education track.

---

## 🚀 Quick Start

### Prerequisites
- **Ollama** with `gemma4:e4b` — download from [ollama.ai](https://ollama.ai)
- **Node.js 18+**
- **8GB RAM** minimum (16GB recommended for best performance)

### Setup (2 minutes)

```bash
# Terminal 1 — start Gemma 4
ollama run gemma4:e4b

# Terminal 2 — start StudyBuddy
cd studybuddy
npm install
npm start          # or: npm run dev
```

Open **http://localhost:3000** — that's it. No `.env`, no API keys, fully local.

---

## ✨ Features

### 🎓 Learning Modes
| Mode | How it works |
|------|-------------|
| **Tutor Mode** (default) | Structured explanations with steps, follow-up questions, instant quizzes |
| **Socratic Mode** | AI guides you to *discover* the answer through exactly 5 witty questions — never just tells you. Turn 5 delivers a 🎯 Big Picture summary. |
| **Agent Mode** | Full pipeline: explain + quiz + track + suggest next topic in one request |

### 🎭 Witty Socratic Tutor
The Socratic tutor is a high-energy, pop-culture-savvy AI that guides discovery through **exactly 5 questions**. Each question builds on your previous answer, nudging you closer to the concept without ever giving it away. On Turn 5, you get a 🎯 **Big Picture** summary tying all your answers together.

### 📈 Dynamic Progress Evaluation Report
Click the **📈 Evaluation Report** button to get a personalised 5-section learning analysis:
- **Learning Trajectory** — how your focus is shifting over time
- **Cross-Pollination** — hidden connections between your studied topics
- **Vocabulary Heatmap** — how your language is evolving
- **Big Domino** — the ONE keystone topic that would unlock the most progress
- **Micro-Mission** — a specific 2-minute task to do right now

### 🗺 Concept Maps
Generate an interactive knowledge graph for any topic. Gemma 4 produces a nodes-and-edges map showing how concepts connect, rendered as an animated force-directed graph using D3.js.

### 📊 Spaced Repetition (SM-2)
Every quiz score feeds the SM-2 algorithm. Topics are scheduled for review at scientifically optimal intervals (Day 1 → 6 → exponential). A **"Due for Review"** banner appears automatically on your study days.

### 🔥 Learning Streaks
Tracks consecutive study days. Streak badge appears in the header — turns orange at 3+ days.

### 🧠 Smart 4-Layer Cache
1. Live taxonomy resolution
2. Normalised hash lookup (catches varied phrasing)
3. In-flight deduplication
4. Disk persistence (48-hour TTL)

~70% bandwidth reduction via gzip. Predictive pre-warming caches your next suggested topic in the background.

### 📚 Dynamic Topic Taxonomy
76 topics with 1,223 keywords across 9 subjects. Topics asked 2+ times are auto-promoted to the learned taxonomy. Admin panel at `/taxonomy-admin` for manual curation + bulk CSV/Excel upload.

### 📸 Homework Photo Analysis
Upload a photo of any homework problem — Gemma 4's vision capability explains it step-by-step. Robust error handling with defensive retry logic, async file cleanup, and multer error boundaries. Collapsible sections for easy scanning.

### 🎙 Voice Input
Click the microphone icon and speak your question. Features auto-restart on unexpected session end, no-speech error recovery, 2500ms silence timeout, and a live voice preview status bar with ✓ (send) and ✕ (cancel) buttons.

### 🔍 Developer Diagnostics Panel
Built-in **Metrics** and **Flow** tabs (press the 🛠 button):
- **Metrics**: Request counts, latency percentiles, cache hit rates per route
- **Flow**: Real-time flow traces showing every internal step (taxonomy lookup → cache check → Ollama call → JSON parse) with millisecond-level timing and bottleneck detection

### 📝 Advanced Formatting Engine
- Strips `<think>…</think>` reasoning blocks emitted by Gemma models before parsing
- Robust JSON extraction: direct parse → code-fence strip → brace extraction → trailing-comma repair
- Rich fallback renderer converts markdown-like text to formatted HTML (headers, bold, italic, code blocks, inline code, lists) when structured JSON isn't available

### 🎨 Three Adaptive Themes
- **Beginner** (ages 8–12): playful, colourful, emoji-rich
- **Intermediate** (high school): clean, professional
- **Advanced** (university): terminal-style, monospace

### 📱 Progressive Web App
Install on any device directly from the browser. Works fully offline — the shell is cached by the service worker, Ollama runs locally.

---

## 📁 Project Structure

```
studybuddy/
├── server.js                   — Express entry point (wires routes + middleware)
├── routes/                     — API route handlers
│   ├── chat.js                 — /chat, /chat-with-image, /estimate (SSE streaming)
│   ├── quiz.js                 — /quiz
│   ├── agent.js                — /agent (full pipeline)
│   ├── socratic.js             — /socratic (guided discovery)
│   ├── conceptMap.js           — /concept-map
│   ├── progress.js             — /progress, /progress-report, /due-reviews, /srs, /streak
│   ├── admin.js                — /admin/* + bulk CSV/Excel upload
│   └── dev.js                  — /dev/metrics, /dev/flow-traces, /cache-stats, /topics/search
├── middleware/
│   ├── devTiming.js            — Request timing, dev metrics, flow traces
│   ├── upload.js               — Multer config (image + spreadsheet uploads)
│   └── pwa.js                  — PWA MIME type corrections
├── lib/
│   └── helpers.js              — buildSystemPrompt(), estimateResponseTime(), warmUpModels()
├── agent/
│   ├── agentLoop.js            — Sequential, parallel & Socratic agents
│   ├── tools.js                — 7 learning tools (explain, quiz, track, suggest, socratic, concept-map, evaluation-report)
│   ├── progressStore.js        — SM-2 SRS + streak tracking (JSON-based)
│   ├── smartCache.js           — 4-layer cache waterfall
│   ├── dynamicTaxonomy.js      — Auto-learn + curate topic taxonomy
│   ├── taxonomy.js             — Base topic taxonomy (76 topics, 1,223 keywords)
│   └── trie.js                 — O(k) prefix search for autocomplete
├── public/
│   ├── index.html              — HTML shell (~190 lines, references external CSS/JS)
│   ├── styles/                 — 14 CSS files (variables, base, layout, chat, input, voice, etc.)
│   ├── scripts/                — 15 JS files (state, utils, chat, quiz, render, agent, voice, etc.)
│   ├── assets/                 — PWA icons (icon-192, icon-512, icon-maskable)
│   ├── devpanel.js             — Developer diagnostics panel (Metrics + Flow tabs)
│   ├── manifest.json           — PWA manifest
│   ├── sw.js                   — Service worker (offline-first)
│   ├── offline.html            — Offline fallback page
│   └── taxonomy-admin.html     — Topic taxonomy admin panel
├── data/                       — Runtime data (auto-created)
│   ├── progress.json           — Student learning history
│   ├── cache.json              — Smart cache persistence
│   └── taxonomy_learned.json   — Learned topic expansions
├── scripts/
│   └── generate-icons.js       — PWA icon generator
└── docs/                       — Full documentation (see docs/MASTER_BLUEPRINT.md)
```

---

## 📡 API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/auth/login` | PIN-based login (returns role + redirect) |
| `POST` | `/auth/logout` | End session |
| `GET`  | `/auth/me` | Current session info (role, name) |
| `POST` | `/chat` | Direct Gemma 4 chat with structured response (SSE streaming) |
| `POST` | `/chat-with-image` | Vision: homework photo analysis |
| `POST` | `/agent` | Full agent pipeline (explain + quiz + track + suggest) |
| `POST` | `/socratic` | Socratic dialogue — guided discovery mode |
| `POST` | `/concept-map` | Generate concept map (nodes + edges JSON) |
| `POST` | `/quiz` | Standalone quiz generation |
| `POST` | `/estimate` | Response time prediction (no LLM call) |
| `POST` | `/progress-report` | Dynamic Progress Evaluation Report (AI-generated) |
| `GET`  | `/progress` | Student progress summary (`?studentId=X` optional) |
| `DELETE` | `/progress` | Clear progress (`?all=true` or `?studentId=X`) |
| `GET`  | `/due-reviews` | Topics due for spaced repetition review |
| `PUT`  | `/srs/:topic` | Update SRS state after a review session |
| `GET`  | `/streak` | Current + longest learning streak |
| `GET`  | `/api/students` | List all student profiles |
| `GET`  | `/api/class-data` | Full class data for teacher dashboard |
| `GET`  | `/topics/search?q=` | Trie-based topic autocomplete |
| `GET`  | `/cache-stats` | Cache performance metrics |
| `DELETE` | `/cache` | Clear response cache |
| `GET`  | `/dev/metrics` | Developer diagnostics: latency, cache stats |
| `GET`  | `/dev/flow-traces` | Per-route flow traces with step timing |
| `GET`  | `/admin/taxonomy` | View learned + pending topics |
| `POST` | `/admin/taxonomy` | Add topic manually |
| `POST` | `/admin/taxonomy/bulk-upload` | Bulk CSV/Excel upload |
| `GET`  | `/api/events` | SSE stream for live teacher dashboard |

---

## 🧰 The 7 Learning Tools

| Tool | What it does |
|------|-------------|
| `explain_topic` | Structured explanation: intro + steps + key answer + follow-up |
| `generate_quiz` | 2–5 multiple choice questions with explanations |
| `track_progress` | Saves study event, updates SRS schedule |
| `suggest_next_topic` | Personalised next topic based on weak/strong areas |
| `ask_socratic_question` | 5-turn witty guided discovery dialogue with Big Picture summary |
| `generate_concept_map` | Builds nodes + edges knowledge graph |
| `generate_evaluation_report` | AI-generated 5-section adaptive learning report |

---

## 🤖 Models

| Model | Role |
|-------|------|
| `gemma4:e4b` | Primary — planning, explanation, synthesis, vision |

---

## 📖 Documentation

| Document | What it covers |
|----------|----------------|
| [docs/MASTER_BLUEPRINT.md](./docs/MASTER_BLUEPRINT.md) | Complete technical reference — architecture, features, fix log, developer guide |
| [docs/KAGGLE_WRITEUP.md](./docs/KAGGLE_WRITEUP.md) | Kaggle competition submission writeup |

---

## 🧪 Test It Works

```bash
# Gemma 4 responding?
curl http://localhost:11434/api/tags

# Backend healthy?
curl http://localhost:3000/progress

# Explain a topic
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain gravity","level":"beginner","history":[]}'

# Socratic mode
curl -X POST http://localhost:3000/socratic \
  -H "Content-Type: application/json" \
  -d '{"message":"gravity","level":"intermediate","history":[]}'

# Evaluation Report
curl -X POST http://localhost:3000/progress-report

# Concept map
curl -X POST http://localhost:3000/concept-map \
  -H "Content-Type: application/json" \
  -d '{"topic":"photosynthesis","level":"beginner"}'

# Due reviews
curl http://localhost:3000/due-reviews
```
