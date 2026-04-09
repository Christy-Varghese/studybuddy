# StudyBuddy — Master Blueprint

> **Single source of truth** for the entire StudyBuddy codebase.  
> Consolidates 39 prior documentation files into one technical reference.  
> Last updated: April 2026

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Feature Guide](#2-feature-guide)
3. [System Fix Log](#3-system-fix-log)
4. [Developer Reference](#4-developer-reference)

---

# 1. Project Architecture

## 1.1 Overview

StudyBuddy is a fully local, AI-powered tutoring web app that runs entirely on the user's machine — no cloud APIs, no API keys, no telemetry. It pairs a vanilla HTML/CSS/JS frontend with a Node.js + Express backend that delegates all inference to **Ollama** running **Gemma 4 (gemma4:e4b)** locally.

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML / CSS / JS (SPA, no framework) |
| Backend | Node.js + Express.js |
| LLM | Ollama → Gemma 4 (`gemma4:e4b`, 9.6 GB, text + vision) |
| Data | Flat JSON files (`data/progress.json`, `data/cache.json`, `data/taxonomy_learned.json`) |
| Transport | REST + Server-Sent Events (SSE) for streaming |
| Installability | Progressive Web App (service worker, manifest, offline fallback) |

## 1.2 Folder Structure

```
studybuddy/
├── server.js                    ← Express entry point (wires routes + middleware)
├── package.json                 ← Dependencies & scripts
├── routes/                      ← API route handlers (8 files)
│   ├── chat.js                  ← /chat, /chat-with-image, /estimate (SSE streaming)
│   ├── quiz.js                  ← /quiz
│   ├── agent.js                 ← /agent (full agent pipeline)
│   ├── socratic.js              ← /socratic (guided discovery dialogue)
│   ├── conceptMap.js            ← /concept-map
│   ├── progress.js              ← /progress, /progress-report, /due-reviews, /srs, /streak
│   ├── admin.js                 ← /admin/* routes, bulk CSV/Excel upload
│   └── dev.js                   ← /dev/metrics, /dev/flow-traces, /cache-stats, /topics/search
├── middleware/                   ← Express middleware (3 files)
│   ├── devTiming.js             ← Request timing, flow traces, dev panel injection
│   ├── upload.js                ← Multer config (image + spreadsheet uploads)
│   └── pwa.js                   ← MIME-type corrections for service worker
├── lib/                          ← Shared utilities
│   └── helpers.js               ← buildSystemPrompt(), estimateResponseTime(), warmUpModels()
├── agent/                        ← Agent system (7 files — already modular)
│   ├── agentLoop.js             ← Sequential, parallel & Socratic orchestration
│   ├── tools.js                 ← 7 learning tools
│   ├── progressStore.js         ← SM-2 SRS + streak tracking (JSON)
│   ├── smartCache.js            ← 4-layer cache waterfall with disk persistence
│   ├── dynamicTaxonomy.js       ← Auto-learn + curate topic taxonomy
│   ├── taxonomy.js              ← Base taxonomy (76 topics, 1,223 keywords)
│   └── trie.js                  ← O(k) prefix search for autocomplete
├── public/                       ← Static frontend
│   ├── index.html               ← HTML shell (~190 lines, refs external CSS/JS)
│   ├── styles/                  ← 14 CSS files (one per visual feature)
│   │   ├── variables.css        ← Custom properties, theme overrides
│   │   ├── base.css             ← Reset, animations, GPU hints
│   │   ├── layout.css           ← Header, controls bar
│   │   ├── chat.css             ← Chat bubbles, structured responses
│   │   ├── input.css            ← Input area, buttons
│   │   ├── voice.css            ← Voice status bar
│   │   ├── socratic.css         ← Socratic mode
│   │   ├── evolution.css        ← Evolution Report card
│   │   ├── quiz.css             ← Quiz modal, cards
│   │   ├── concept-map.css      ← Concept map modal
│   │   ├── vision.css           ← Vision analysis cards
│   │   ├── agent.css            ← Agent response
│   │   ├── progress.css         ← Progress modal
│   │   └── pwa.css              ← PWA banner, responsive, standalone
│   ├── scripts/                 ← 15 JS files (state → utils → features → init → PWA)
│   │   ├── state.js             ← DOM refs, shared state
│   │   ├── utils.js             ← scrollToBottom(), addBubble()
│   │   ├── image.js             ← Image upload handlers
│   │   ├── chat.js              ← sendMessage()
│   │   ├── quiz.js              ← Quiz generation & rendering
│   │   ├── socratic.js          ← Socratic mode
│   │   ├── concept-map.js       ← Concept map (D3)
│   │   ├── theme.js             ← Theme switching, streak, due reviews
│   │   ├── loading.js           ← Skeleton loader, facts loading
│   │   ├── render.js            ← Bot response rendering, LaTeX conversion
│   │   ├── agent.js             ← Agent mode, SSE streaming
│   │   ├── evolution.js         ← Evolution Report
│   │   ├── voice.js             ← SpeechRecognition
│   │   ├── init.js              ← Event listeners, window.load
│   │   └── pwa.js               ← Service worker registration
│   ├── assets/                  ← PWA icons
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable.png
│   ├── devpanel.js              ← Developer diagnostics panel
│   ├── manifest.json            ← PWA manifest
│   ├── sw.js                    ← Service worker (cache v2, offline-first)
│   ├── offline.html             ← Offline fallback page
│   ├── taxonomy-admin.html      ← Taxonomy admin panel
│   └── card-560x280.html        ← Social card template
├── data/                         ← Runtime data (auto-created)
│   ├── progress.json            ← Student learning history
│   ├── cache.json               ← Smart cache persistence
│   └── taxonomy_learned.json    ← Learned topic expansions
├── scripts/                      ← Build / utility scripts
│   └── generate-icons.js        ← PWA icon generator
├── docs/                         ← Documentation
│   ├── MASTER_BLUEPRINT.md      ← This file
│   └── KAGGLE_WRITEUP.md        ← Kaggle competition submission (standalone)
├── uploads/                      ← Homework photo uploads (temp)
└── README.md                     ← Project overview
```

## 1.3 Design Decisions

| Decision | Rationale |
|----------|-----------|
| 14 CSS files | One per visual feature — easy to find and edit |
| 15 JS files | Load order: state → utilities → features → init → PWA |
| 8 route files | Each API domain isolated for clarity |
| 3 middleware files | Cross-cutting concerns separated |
| `lib/helpers.js` | Shared functions used by multiple routes |
| `agent/` untouched | Already well-structured — 7 focused modules |
| Flat JSON data files | No database; progress, cache, taxonomy are simple JSON |
| No framework | Zero build step; `<script>` tags in load order |

## 1.4 Before & After (Reorganisation Commit `1a24875`)

| Metric | Before | After |
|--------|--------|-------|
| `index.html` | 4,402 lines (monolithic) | 190 lines (shell) + 14 CSS + 15 JS |
| `server.js` | 1,377 lines (monolithic) | 145 lines (entry) + 8 routes + 3 middleware + 1 lib |
| Dead code | `src/`, `config/`, `.bak` files | Removed |
| Total modules | 2 monoliths + 7 agent | 42 focused files + 7 agent |

## 1.5 Request Flow

```
Browser  ─→  Express (server.js)
              │
              ├─ middleware/devTiming.js    (timing + flow traces)
              ├─ middleware/pwa.js          (MIME fixes)
              ├─ middleware/upload.js       (Multer)
              │
              ├─ routes/chat.js ──────────→ Ollama /api/chat  (SSE streaming)
              ├─ routes/agent.js ─────────→ agentLoop.js
              │                              ├─ smartCache.js (L1→L4 lookup)
              │                              ├─ tools.js → Ollama (parallel)
              │                              └─ progressStore.js
              ├─ routes/quiz.js ──────────→ Ollama /api/chat
              ├─ routes/socratic.js ──────→ agentLoop.js (Socratic mode)
              ├─ routes/conceptMap.js ────→ Ollama /api/chat
              ├─ routes/progress.js ──────→ progressStore.js / data/progress.json
              ├─ routes/admin.js ─────────→ dynamicTaxonomy.js
              └─ routes/dev.js ───────────→ devTiming metrics store
```

---

# 2. Feature Guide

## 2.1 Tutor Mode (Direct Chat)

**Endpoint:** `POST /chat` (SSE streaming)  
**Body:** `{ message, level, history }`

The primary interaction mode. Users type a question, select a difficulty level (beginner / intermediate / advanced), and receive a structured JSON response streamed via SSE:

```json
{
  "intro": "Brief overview",
  "steps": ["Step 1 …", "Step 2 …"],
  "answer": "Final answer or conclusion",
  "followup": "Suggested next question"
}
```

The system prompt is built dynamically by `lib/helpers.js → buildSystemPrompt(level)` with subject-adaptive phrasing and strict JSON-only instructions.

## 2.2 Homework Photo Analysis (Vision)

**Endpoint:** `POST /chat-with-image` (multipart/form-data)  
**Body:** `FormData { message, level, image }`

Accepts a photo of homework, converts it to base64, and sends it to Gemma 4's vision capability. Uses a specialised vision system prompt requesting structured JSON analysis. Includes a fallback that converts plain-text responses to structured format automatically.

- Image preview: 56×56 px thumbnail (`image-preview-thumb` class)
- Preview is cleared from the input area on send
- Image is displayed in the chat bubble for context

## 2.3 Socratic Mode

**Endpoint:** `POST /socratic`  
**Body:** `{ message, level, history }`

A 5-turn guided-discovery dialogue. The tutor persona is a "witty, slightly sarcastic Socratic tutor" that never gives answers directly — only guiding questions, hints, and analogies. After 5 turns the conversation resets. Each turn tracks engagement via `progressStore`.

## 2.4 Agent Mode

**Endpoint:** `POST /agent`  
**Body:** `{ message, level, history, fast? }`

Runs the full agent pipeline (`agentLoop.js`) with access to 7 tools. Three execution modes:

| Mode | Trigger | LLM Calls | Behaviour |
|------|---------|-----------|-----------|
| **Parallel** (default) | `POST /agent` | 2 | Plan → execute tools concurrently → synthesise |
| **Sequential** | `fast: false` | 4–5 | Explain → quiz → track → suggest (one-by-one) |
| **Socratic** | `POST /socratic` | 1 | Guided question, track engagement |

### 2.4.1 The 7 Learning Tools

| Tool | Purpose | Key Arguments |
|------|---------|---------------|
| `explain_topic` | Structured explanation (intro, steps, answer, follow-up) | `topic`, `level` |
| `generate_quiz` | 2–5 MCQ with explanations | `topic`, `level`, `numQuestions` |
| `track_progress` | Save study event + update SRS schedule | `topic`, `level` |
| `suggest_next_topic` | Recommend next topic from weak/strong areas | `currentTopic` |
| `ask_socratic_question` | Guiding question (never gives the answer) | `topic`, `level` |
| `generate_concept_map` | Nodes-and-edges knowledge graph | `topic`, `level` |
| `generate_evolution_report` | Dynamic progress evolution report | `topic` |

## 2.5 Quiz Generation

**Endpoint:** `POST /quiz`  
**Body:** `{ topic, level, numQuestions }`

Generates multiple-choice questions with 4 options each, correct-answer indicators, and per-question explanations. Rendered in a modal with animated card transitions.

## 2.6 Concept Map

**Endpoint:** `POST /concept-map`  
**Body:** `{ topic, level }`

Returns `{ nodes: [...], edges: [...] }` rendered as an interactive D3.js force-directed graph in a modal overlay. Nodes are colour-coded by type (concept, detail, related).

## 2.7 Evolution Report

**Endpoint:** via Agent tool `generate_evolution_report`

A dynamic progress analysis combining: topics studied, quiz scores over time, SRS intervals, strengths, weaknesses, and personalised recommendations. Rendered in a collapsible card with scroll support.

## 2.8 Spaced Repetition (SM-2)

Implemented in `agent/progressStore.js`. Every study interaction is scored and fed through the SM-2 algorithm to compute:

- **Ease Factor** (≥ 1.3, starts at 2.5)
- **Interval** (days until next review)
- **Next Review Date**

**Endpoints:**
- `GET /due-reviews` — topics due for review today
- `PUT /srs/:topic` — update SRS after review (`{ grade: 0-5 }` or `{ score: 0-100 }`)

## 2.9 Streak Tracking

- `GET /streak` → `{ current, longest, studiedToday }`
- Streak increments when the user studies on consecutive calendar days
- Displayed in the header with an animated badge

## 2.10 Voice Input

Uses the Web Speech API (`SpeechRecognition`). When the microphone button is tapped, interim results stream into the input field. On `speechend` the final transcript is committed. A voice-status bar shows recording state.

## 2.11 Adaptive Themes

Three themes that auto-switch based on the selected difficulty level:

| Level | Theme | Character |
|-------|-------|-----------|
| Beginner | Light, warm | Large text, friendly colours |
| Intermediate | Balanced | Default palette |
| Advanced | Dark, dense | Compact layout, code-friendly |

Manual override available via a theme toggle.

## 2.12 Topic Autocomplete

`GET /topics/search?q=phot` → prefix search over the Trie built from the taxonomy. Returns matching topics instantly for the search input.

## 2.13 Progressive Web App (PWA)

- **`manifest.json`** — App name, icons (192/512/maskable), standalone display, shortcuts
- **`sw.js`** — Service worker (cache v2): Cache-First for app shell, Network-First for API, Network-Only for POST, offline fallback to `offline.html`
- **Install banner** — In-app prompt after 3 seconds via `beforeinstallprompt`

## 2.14 Dev Benchmark Panel

Visible only in `NODE_ENV=development`. Injected automatically via middleware.

- **Metrics tab:** Per-route latency bars (colour-coded: green < 500 ms, amber < 8 s, red > 8 s), cache hit rates, error counts, tool breakdown
- **Flow tab:** ASCII architecture diagrams per request with per-step millisecond timing and bottleneck highlighting
- **Controls:** Run Now, Clear, Hide

## 2.15 Taxonomy Admin Panel

`/taxonomy-admin.html` — A standalone admin UI for managing the dynamic taxonomy:

- View learned vs. pending topics
- Approve / reject pending topics
- Manually add topics
- Rebuild taxonomy live

**Admin API:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/admin/taxonomy` | View learned + pending |
| `POST` | `/admin/taxonomy` | Add topic |
| `POST` | `/admin/taxonomy/pending/:topic/approve` | Promote pending → learned |
| `DELETE` | `/admin/taxonomy/pending/:topic` | Reject pending |
| `DELETE` | `/admin/taxonomy/learned/:topic` | Remove learned |
| `POST` | `/admin/taxonomy/rebuild` | Rebuild taxonomy live |

## 2.16 Bulk CSV/Excel Upload

`POST /admin/upload-progress` — Upload a CSV or Excel file to bulk-import student progress records. Uses Multer for file handling with the `xlsx` library for parsing.

---

# 3. System Fix Log

A consolidated ledger of every significant bug fix applied to the codebase, ordered chronologically.

| # | Issue | Root Cause | Resolution | Files Changed |
|---|-------|-----------|------------|---------------|
| 1 | Flow traces not visible in Dev Panel | Missing trace-collection logic | Added flow-trace recording to `devTiming.js` middleware | `middleware/devTiming.js` |
| 2 | Image upload crash (server 500) | `fs.unlink()` called synchronously on temp file before async Ollama call completed | Changed to `async fs.unlink` after response sent | `routes/chat.js` |
| 3 | Advanced mode formatting broken | Raw `<think>…</think>` tags leaking into chat | Added `<think>` block stripping in response parser | `public/scripts/render.js` |
| 4 | Missing CSS animations (20+ classes) | Skeleton loader, pulse, fade-in animations referenced but undefined | Added all missing `@keyframes` declarations | `public/styles/base.css` |
| 5 | Skeleton animation name mismatch | CSS used `skeleton-shimmer`; JS expected `shimmer` | Unified to `shimmer` in both CSS and JS | `public/styles/base.css`, `public/scripts/loading.js` |
| 6 | Agent referenced non-existent model (`gemma4:e2b`) | Typo in agent tool config | Changed to `gemma4:e4b`; added error handling, fallback logic, enhanced logging | `agent/tools.js`, `agent/agentLoop.js` |
| 7 | Image upload — no output displayed | Generic text prompt sent to Gemma for vision; JSON parse failures returned `structured: null` | Added vision-specific system prompt with strict JSON instructions; added fallback that converts plain text to structured format | `routes/chat.js` |
| 8 | Image not shown in chat bubble | Image preview removed before send; no image in chat history | Image now displayed in chat bubble; history tracks `[Image uploaded]` | `public/scripts/image.js`, `public/scripts/chat.js` |
| 9 | No error handling on `/chat-with-image` | `res.json()` called without checking `res.ok` | Added HTTP status check, response structure validation, and descriptive error messages to frontend | `routes/chat.js` |
| 10 | 500 errors on `/chat` and `/quiz` | `data.message.content` accessed without null check | Added `ollamaRes.ok` check + `data.message?.content` validation on all three major endpoints | `routes/chat.js`, `routes/quiz.js` |
| 11 | Double-click sends message twice | Send button had both `onclick="sendMessage()"` attribute and `addEventListener('click', sendMessage)` | Removed inline `onclick`; kept only `addEventListener` | `public/index.html` |
| 12 | Image displayed twice in chat | `sendMessage()` and `sendToChat()` both rendered the image via `FileReader` | Removed image rendering from `sendMessage()`; kept only in `sendToChat()` | `public/scripts/chat.js`, `public/scripts/image.js` |
| 13 | Duplicate `sendToChat()` function | Function defined twice in monolithic `index.html` — second definition overwrote first | Removed duplicate; kept complete version | `public/scripts/chat.js` |
| 14 | LaTeX notation unfriendly (`H_2O`, `\alpha`) | AI model returns raw LaTeX; no client-side conversion | Added `convertLatexToReadable()` — Unicode subscripts, superscripts, Greek letters, math symbols | `public/scripts/render.js` |
| 15 | Ollama 400 Bad Request intermittent | Malformed request body (missing `model` field in edge cases) | Hardened request construction with explicit `model` field and payload validation | `routes/chat.js` |
| 16 | Image preview too large in input area | `.image-preview` class had no size constraint | Created `.image-preview-thumb` class (56×56 px, `object-fit: cover`) | `public/scripts/image.js`, `public/styles/input.css` |
| 17 | Image preview persists after send | Preview container not cleared when user clicks Send | `sendMessage()` now clears `imagePreviewContainer.innerHTML` immediately on send | `public/scripts/chat.js` |

---

# 4. Developer Reference

## 4.1 Quick Start

```bash
# Prerequisites
# 1. Node.js ≥ 18
# 2. Ollama installed with gemma4:e4b pulled

# Terminal 1 — ensure Ollama is running
ollama run gemma4:e4b       # or: ollama serve (if it auto-starts)

# Terminal 2
cd studybuddy
npm install
npm run dev                  # NODE_ENV=development OLLAMA_KEEP_ALIVE=60m node server.js

# Open http://localhost:3000
```

## 4.2 API Endpoint Reference

### Learning Endpoints

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| `POST` | `/chat` | `{ message, level, history }` | Direct tutor chat (SSE) |
| `POST` | `/chat-with-image` | `FormData { message, level, image }` | Homework photo analysis |
| `POST` | `/agent` | `{ message, level, history, fast? }` | Full agent pipeline |
| `POST` | `/socratic` | `{ message, level, history }` | Socratic dialogue |
| `POST` | `/concept-map` | `{ topic, level }` | Concept map generation |
| `POST` | `/quiz` | `{ topic, level, numQuestions }` | Quiz generation |
| `POST` | `/estimate` | `{ message, level, hasImage? }` | Time estimate (no LLM) |

### Progress & SRS

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| `GET` | `/progress` | — | Full progress summary |
| `DELETE` | `/progress` | — | Clear all progress |
| `GET` | `/progress-report` | — | Formatted progress report |
| `GET` | `/due-reviews` | — | Topics due for SRS review today |
| `PUT` | `/srs/:topic` | `{ grade: 0-5 }` or `{ score: 0-100 }` | Update SRS after review |
| `GET` | `/streak` | — | `{ current, longest, studiedToday }` |

### Cache & Search

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/cache-stats` | Cache hit/miss statistics |
| `DELETE` | `/cache` | Clear response cache |
| `GET` | `/topics/search?q=…` | Trie prefix autocomplete |

### Admin (Taxonomy)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/admin/taxonomy` | View learned + pending |
| `POST` | `/admin/taxonomy` | Add topic manually |
| `POST` | `/admin/taxonomy/pending/:topic/approve` | Promote pending → learned |
| `DELETE` | `/admin/taxonomy/pending/:topic` | Reject pending topic |
| `DELETE` | `/admin/taxonomy/learned/:topic` | Remove learned topic |
| `POST` | `/admin/taxonomy/rebuild` | Rebuild taxonomy live |
| `POST` | `/admin/upload-progress` | Bulk CSV/Excel upload |

### Dev (development only)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/dev/metrics` | Aggregated request metrics |
| `GET` | `/dev/flow-traces` | Per-request flow traces |

## 4.3 Caching System

### 4-Layer Cache Waterfall

Every cacheable request passes through four layers in order:

| Layer | Name | Latency | Logic |
|-------|------|---------|-------|
| L1 | Taxonomy Lookup | ~0.5 ms | Normalise the topic via taxonomy → canonical key |
| L2 | Normalised Hash | ~1 ms | `MD5("tool::normalised_topic::level")` → memory/disk lookup |
| L3 | In-Flight Dedup | 0 ms | If an identical request is already in-flight, await its result instead of issuing a new LLM call |
| L4 | Ollama | 3–30 s | Full LLM inference (cache miss) |

### Tiered Storage

| Tier | TTL | Max Entries | Eviction |
|------|-----|-------------|----------|
| Memory | 15 min | 300 | LRU |
| Disk (`data/cache.json`) | 24 hr | 500 | Oldest-first flush every 2 min |

### Cache Key Format

```
MD5("tool::normalised_topic::level")
```

Normalisation: lowercase, trim, strip articles/stop-words, singular form.

### Predictive Pre-Warming

When a user asks about topic X, the cache pre-fetches the most likely follow-up tools (e.g., quiz after explain) so the next request is instant.

### Performance

- Cache-hit latency: **0.5–2 ms** (vs. 3–30 s for Ollama)
- Speed-up: **3,400–17,000×** on cache hits
- Bandwidth savings: ~70% with gzip compression

### Admin Cache API

```bash
curl http://localhost:3000/cache-stats          # View stats
curl -X DELETE http://localhost:3000/cache       # Clear cache
```

## 4.4 Dynamic Taxonomy

The taxonomy system (`agent/dynamicTaxonomy.js` + `agent/taxonomy.js`) starts with 76 base topics and 1,223 keywords. When the agent encounters a topic not in the taxonomy, it enters a learning pipeline:

1. **Detection** — Topic not matched by trie
2. **Pending** — Added to pending list with metadata (source, timestamp, frequency)
3. **Promotion** — Auto-promoted to "learned" after 3 occurrences, or manually via admin panel
4. **Persistence** — Learned topics saved to `data/taxonomy_learned.json`
5. **Rebuild** — Trie rebuilt in-memory; no server restart needed

## 4.5 Data Format — `data/progress.json`

```json
{
  "sessions": [
    { "topic": "photosynthesis", "level": "beginner", "quizScore": 85, "timestamp": "..." }
  ],
  "topics": {
    "photosynthesis": {
      "timesStudied": 3,
      "scores": [75, 85, 90],
      "level": "beginner",
      "lastStudied": "2026-04-07T10:30:00Z",
      "srs": {
        "repetitions": 2,
        "easeFactor": 2.6,
        "interval": 6,
        "nextReview": "2026-04-13T00:00:00Z"
      }
    }
  }
}
```

## 4.6 Ollama Integration

| Setting | Value | Why |
|---------|-------|-----|
| Model | `gemma4:e4b` | 9.6 GB; supports text + vision |
| Endpoint | `http://localhost:11434/api/chat` | Local only |
| Keep-Alive | `OLLAMA_KEEP_ALIVE=60m` (via `npm run dev`) | Keeps model in RAM to avoid cold-start latency |
| Temperature | 0.7 (text), 0.3 (vision) | Lower for vision to enforce JSON consistency |
| Warm-up | On server start, sends a 1-token prompt to pre-load model into RAM | Eliminates first-request delay |
| Streaming | SSE on `/chat`; non-streaming JSON on other endpoints | Chat benefits from progressive rendering |

## 4.7 Testing Checklist

```bash
# Health checks (all should return 200)
curl http://localhost:3000/progress
curl http://localhost:3000/streak
curl http://localhost:3000/due-reviews
curl "http://localhost:3000/topics/search?q=photo"

# Agent response (structured JSON)
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain gravity","level":"beginner","history":[]}'

# Concept map (nodes + edges)
curl -X POST http://localhost:3000/concept-map \
  -H "Content-Type: application/json" \
  -d '{"topic":"gravity","level":"intermediate"}'

# SRS update
curl -X PUT http://localhost:3000/srs/gravity \
  -H "Content-Type: application/json" \
  -d '{"score":80}'

# Cache stats
curl http://localhost:3000/cache-stats
```

## 4.8 Common Issues

| Problem | Fix |
|---------|-----|
| `Gemma is not running` | Ensure Ollama is running: `ollama serve` or `ollama run gemma4:e4b` |
| Slow first response (~10 s) | Normal — model warm-up; subsequent requests are faster |
| `EADDRINUSE :3000` | Kill existing process: `lsof -i :3000` then `kill -9 <PID>` |
| `progress.json` not saving | Check `data/` directory exists and is writable |
| Concept map empty | Use a full phrase (e.g. "Newton's Laws") not a single word |
| SRS grade rejected | Use `grade` (0–5) or `score` (0–100), not both |
| Service worker stale | DevTools → Application → Service Workers → "Update on reload" |
| Image upload 500 | Check Ollama is responding: `curl http://localhost:11434/api/tags` |

## 4.9 Port Reference

| Port | Service | Start Command |
|------|---------|---------------|
| 3000 | StudyBuddy Express server | `npm run dev` |
| 11434 | Ollama LLM service | `ollama serve` (auto-starts on macOS) |

## 4.10 Motion Design System

The UI uses a layered animation architecture with CSS custom properties for timing:

| Token | Value | Use |
|-------|-------|-----|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Chat bubble entrances |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Button interactions |
| `--duration-fast` | `150ms` | Micro-interactions (hover, focus) |
| `--duration-normal` | `300ms` | Standard transitions |
| `--duration-slow` | `500ms` | Modal open/close, skeleton fade |

All animations respect `prefers-reduced-motion: reduce` by collapsing to instant transitions.

---

*End of Master Blueprint.*
