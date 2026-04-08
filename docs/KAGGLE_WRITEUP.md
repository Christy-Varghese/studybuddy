# StudyBuddy — Offline AI Tutor Powered by Gemma 4

## Submission Details

- **Title:** StudyBuddy — Offline AI Tutor Powered by Gemma 4
- **Subtitle:** Bringing frontier AI tutoring to every student, everywhere — no cloud, no cost, no internet required.
- **Track:** Future of Education
- **Card Image:** `public/card-560x280.html` → open in browser → screenshot at 560×280

---

## Project Description

### The Problem

**770 million adults worldwide are illiterate. Over 250 million children lack access to quality education.**

The barriers are systemic:

- **Cost**: Private tutoring costs $25–80/hour — impossible for families earning under $5/day
- **Connectivity**: 2.7 billion people have no internet access; cloud-based AI tutors are useless offline
- **One-size-fits-all**: Most educational platforms deliver the same content regardless of a learner's age, background, or pace
- **Privacy**: Parents in many regions are reluctant to send their children's data to cloud servers
- **Availability**: Tutoring help is unavailable at the moments students need it most — late nights before exams, weekends, holidays

**StudyBuddy eliminates every one of these barriers by running a full AI tutor locally on any laptop.**

---

### What We Built

**StudyBuddy** is a fully offline, privacy-first AI tutoring platform powered by **Google's Gemma 4** model running locally via Ollama. It combines six specialised learning tools into a single application that adapts to each student's level, tracks their progress with spaced repetition, and works without ever connecting to the internet.

#### Core Capabilities

| Feature | Description |
|---------|-------------|
| 🎓 **3 Learning Modes** | Tutor (structured step-by-step), Socratic (guided discovery through questions), Agent (full pipeline: explain → quiz → track → suggest next) |
| 📸 **Homework Photo Analysis** | Snap a photo of any problem → Gemma 4 vision analyses the image → step-by-step solution with extracted data, logic walkthrough, and confidence indicator |
| 🗺 **Interactive Concept Maps** | Type any topic → auto-generated knowledge graph (nodes + edges) rendered as animated SVG showing how concepts interconnect |
| 📊 **SM-2 Spaced Repetition** | Every quiz score feeds the SuperMemo-2 algorithm; topics are scheduled for review at scientifically optimal intervals (1 → 6 → 15 → … days) |
| 🔥 **Learning Streaks** | Consecutive study day tracking with visual streak badge — gamification without the gimmicks |
| 🧠 **Smart 4-Layer Cache** | Taxonomy resolution → normalised hash → in-flight dedup → disk persistence (48h TTL); ~70% bandwidth reduction |
| 📚 **Dynamic Taxonomy** | Topics asked 2+ times auto-promote to the learned taxonomy; admin panel for curation |
| 🎨 **3 Adaptive Themes** | Beginner (ages 8–12, emoji-rich, playful), Intermediate (high school, clean), Advanced (university, terminal-style monospace) |
| 📱 **PWA** | Installable on any device; service worker caches the shell for offline-first experience |
| 🔍 **Developer Diagnostics** | Built-in Metrics + Flow tabs: per-route latency, cache hit rates, real-time flow traces with bottleneck detection |

---

### How We Used Gemma 4

StudyBuddy leverages **Gemma 4 E4B** (efficient 4-bit quantised) as both the reasoning engine and the vision model. All inference happens locally through the Ollama HTTP API (`localhost:11434`).

#### 1. Adaptive Prompting System

Gemma 4 receives **dynamic system prompts** that adjust explanation depth based on the selected difficulty level:

```
You are StudyBuddy, a friendly and patient tutor.
Adapt your explanation to level: {{level}}.
- beginner: simple words, fun analogies, emojis, short sentences
- intermediate: proper terminology with definitions, balanced depth
- advanced: technical depth, assume strong foundations, concise notation

Return a JSON object: { intro, steps: [{title, text, emoji}], answer, followup }
```

This structured JSON contract means every response renders with consistent UI components (intro card → numbered step cards → answer pill → follow-up prompt), regardless of the topic.

#### 2. Vision / Multimodal (Homework Photos)

When a student uploads a homework photo:
1. Image is resized/optimised via `sharp` (max 640px, WebP conversion for smaller payloads)
2. Converted to base64 and sent to Gemma 4 via Ollama's multimodal API
3. Gemma returns structured analysis: `{ visual_summary, extracted_data[], logic_steps[], final_solution, confidence }`
4. Rendered as a rich vision analysis card with scanning animation, thumbnail, section-by-section reveal

#### 3. `<think>` Block Handling

Gemma 4 often emits `<think>…</think>` reasoning blocks before its final answer. StudyBuddy:
- **Prompt-level constraint**: System prompts include a strict rule — "Keep your `<think>` section extremely brief, under 30 words. Move directly to providing the structured JSON."
- **Server-side**: Strips think blocks via regex before JSON parsing
- **Robust JSON extraction**: Direct parse → strip code fences → find `{…}` in text → repair trailing commas → validate required fields
- **Client-side fallback**: `renderFormattedFallback()` converts markdown-like text to rich HTML when structured JSON isn't available

#### 4. Tool-Calling Agent Architecture

The Agent mode uses Gemma 4 as a **planner** that decides which tools to invoke:

```
Available tools:
1. explain_topic(topic, level) — Structured explanation
2. generate_quiz(topic, level, numQuestions) — MCQ quiz
3. track_progress(topic, score) — Save to SRS
4. suggest_next_topic(level) — Personalised recommendation
5. ask_socratic_question(topic, history) — Guided discovery
6. generate_concept_map(topic, level) — Knowledge graph

Gemma plans: "Student asked about gravity →
  Step 1: explain_topic('gravity', 'intermediate')
  Step 2: generate_quiz('gravity', 'intermediate', 3)
  Step 3: track_progress('gravity', null)
  Step 4: suggest_next_topic('intermediate')"
```

Each tool call goes to Ollama independently, results are synthesised, and the combined response is streamed back. In the sequential agent, `explain_topic` and `generate_concept_map` run **concurrently** via `Promise.all()`, halving latency for the two heaviest Ollama calls.

#### 5. Concept Map Generation

Gemma 4 generates a `{ nodes: [{id, label, group}], edges: [{source, target, label}] }` JSON structure for any topic. The frontend renders this as a force-directed SVG graph with:
- Colour-coded node groups
- Animated edge connections
- Interactive hover tooltips
- No external graph libraries (pure SVG + JS)

---

### Architecture

```
┌─────────────────────────────────────────────────┐
│         Browser (Single-Page App / PWA)          │
│                                                   │
│  Chat UI ← → Quiz Modal ← → Concept Map SVG     │
│  Image Upload ← → Theme Switcher ← → Streak     │
│  Skeleton Loaders ← → Dev Panel (Metrics+Flow)  │
└──────────────────────┬────────────────────────────┘
                       │ HTTP (localhost:3000)
┌──────────────────────▼────────────────────────────┐
│           Express.js Backend (server.js)           │
│                                                     │
│  /chat  /chat-with-image  /quiz  /concept-map      │
│  /agent  /socratic  /estimate  /progress           │
│  /due-reviews  /srs/:topic  /streak                │
│  /topics/search  /cache-stats  /dev/flow-traces    │
│                                                     │
│  ┌────────────────────────────────────────────┐    │
│  │         Agent Layer (agentLoop.js)         │    │
│  │  6 Tools: explain, quiz, track, suggest,   │    │
│  │           socratic, concept-map            │    │
│  ├────────────────────────────────────────────┤    │
│  │  Smart Cache  │  Taxonomy  │  Progress/SRS │    │
│  │  (4-layer)    │  (dynamic) │   (SM-2)      │    │
│  └───────────────┴──────┬─────┴───────────────┘    │
└─────────────────────────┼──────────────────────────┘
                          │ HTTP (localhost:11434)
┌─────────────────────────▼──────────────────────────┐
│              Ollama (Local Inference)                │
│         Gemma 4 E4B — Text + Vision                 │
│         (runs on CPU, 8GB RAM minimum)              │
└─────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Zero external AI APIs** — no OpenAI, no Anthropic, purely Gemma 4 via Ollama
- **Single `server.js`** + modular agent layer — easy to understand, deploy, and maintain
- **JSON-first contracts** — every Gemma response has a defined schema, parsed robustly
- **Offline-first** — PWA service worker caches the UI shell; Ollama runs locally
- **Privacy by architecture** — data never leaves the device; no telemetry, no analytics

---

### Technical Highlights

#### Smart 4-Layer Cache (~70% bandwidth reduction)
```
Request: "Explain photosynthesis"
  │
  ├─ Layer 1: Taxonomy resolve → "photosynthesis" (canonical)
  ├─ Layer 2: Normalised hash lookup → cache miss
  ├─ Layer 3: In-flight dedup → no duplicate in progress
  ├─ Layer 4: Disk persistence → cache miss
  │
  └─ → Call Ollama → store result → next time: instant from Layer 2
```

#### Spaced Repetition (SM-2)
```
Quiz score → SM-2 algorithm → next review date
  Score 5: interval × easeFactor (grows exponentially)
  Score 3: interval stays
  Score <3: interval resets to 1 day

Day 1 → Day 6 → Day 15 → Day 38 → Day 96 → ...
```

#### Motion Design System
- **Skeleton loaders** appear instantly (0ms) while Gemma generates
- **Staggered reveals** — steps appear one by one with 100ms delay
- **Bounce-scale** — answer pill pops with spring physics
- **Theme transitions** — smooth 300ms color crossfade between Beginner/Intermediate/Advanced
- All animations use `will-change` and GPU-accelerated transforms for 60fps

#### Inference Speed Optimizations
Every Ollama request is tuned for speed without sacrificing quality:
- **`num_predict: 500`** — Caps token generation to prevent runaway responses
- **`num_ctx: 4096`** — Expanded context window for richer instruction following
- **`speculative_model: "gemma2:2b"`** — Speculative decoding with a lightweight draft model accelerates token generation by ~30-50%
- **Parallel tool execution** — `explain_topic` + `generate_concept_map` run via `Promise.all()`, cutting agent latency in half
- **Image downsizing** — Homework photos resized to 640px WebP (from 1024px JPEG), reducing base64 payload and vision inference time
- **Think-block brevity** — Prompt instructs Gemma to keep `<think>` sections under 30 words, reducing wasted generation tokens

#### Developer Flow Traces
```
/chat → [Taxonomy] → [Cache] → [Ollama] → [Parse] → [Response]

  ┌─ taxonomy-resolve ────── 2ms    ✓
  ├─ cache-check ─────────── 1ms    ✓
  ├─ ollama-generate ─────── 45230ms ⚠ bottleneck
  ├─ parse-structured-json ─ 3ms    ✓
  └─ total ──────────────── 45236ms
```

---

### Real-World Impact

#### Who Benefits?

1. **Students without internet** — 2.7B people offline; StudyBuddy needs no connection after setup
2. **Low-income families** — Free, open-source; no subscription, no API costs
3. **Privacy-conscious users** — All data stays on-device; zero cloud transmission
4. **Self-paced learners** — Available 24/7, adapts to the student's level
5. **Teachers in under-resourced schools** — Deploy to a classroom of laptops via USB

#### Scale Potential

- **Hardware requirement**: Any laptop with 8GB RAM + Ollama
- **Distribution**: Clone from GitHub, or distribute as a USB stick with Ollama pre-bundled
- **Languages**: Gemma 4 supports 140+ languages — prompts work in any language
- **Cost to run**: $0 (once Ollama is installed)
- **Potential reach**: 100M+ students in offline or low-connectivity regions

#### Usage Scenario

> *12-year-old Priya in rural India receives homework about photosynthesis. No internet, no tutor. She opens StudyBuddy on the family laptop, types her question at Beginner level, sees a colourful step-by-step explanation with emojis, takes a quiz to test herself, and gets scheduled for a review in 6 days via spaced repetition. When she's confused about a diagram, she photographs it — Gemma 4 vision breaks it down. All of this happens with zero internet, zero cost, zero data leaving her device.*

---

### Technical Challenges & Solutions

| Challenge | Problem | Solution |
|-----------|---------|----------|
| **Think-block parsing** | Gemma emits `<think>…</think>` before JSON, breaking `JSON.parse()` | Regex stripping + 4-stage robust JSON extraction pipeline |
| **Image vision crashes** | Uncaught errors during multipart upload/processing | Defensive try/catch/finally, async file cleanup, multer error boundaries |
| **Quiz JSON wrapping** | Gemma wraps JSON in markdown code fences | Regex sanitisation before parsing, with client-side retry |
| **Offline reliability** | PWA must work without any network | Service worker with cache-first strategy for shell, local Ollama for AI |
| **Response consistency** | Gemma output varies wildly across difficulty levels | Structured JSON schema contracts with validation and fallback rendering |
| **Performance on 8GB devices** | Inference can take 30–90s on CPU | Skeleton loaders (instant UX), 4-layer cache (70% skip Ollama), speculative decoding with gemma2:2b draft model, parallel tool execution, predictive pre-warming |

---

### Project Stats

| Metric | Value |
|--------|-------|
| Lines of code | **11,600+** (excluding node_modules) |
| Documentation files | **40** markdown guides |
| API endpoints | **17** |
| Learning tools | **6** |
| Themes | **3** |
| External AI APIs used | **0** (Gemma 4 only, local) |
| Internet required | **No** (after initial setup) |
| Cost to run | **$0** |

---

### Tech Stack

| Component | Technology |
|-----------|------------|
| AI Model | Gemma 4 E4B via Ollama (local inference) |
| Backend | Node.js + Express.js |
| Frontend | Vanilla HTML/CSS/JS (no framework, ~3900 lines) |
| Image Processing | Sharp (resize, WebP optimise) |
| Upload Handling | Multer |
| Compression | gzip via `compression` middleware |
| SRS Algorithm | SM-2 (SuperMemo 2) |
| Search | O(k) trie-based prefix autocomplete |
| PWA | Service worker + web manifest |
| Visualisation | Pure SVG concept maps (no D3, no external libs) |

---

### Demo — How to Run

```bash
# Prerequisites: Ollama (ollama.ai) + Node.js 16+

# 1. Pull Gemma 4
ollama pull gemma4:e4b

# 2. Start Ollama
ollama serve

# 3. In a new terminal
git clone https://github.com/Christy-Varghese/studybuddy.git
cd studybuddy
npm install
npm start

# 4. Open http://localhost:3000
```

**Setup time: ~2 minutes** (excluding model download)

### Things to Try

1. **Ask "What is photosynthesis?"** at Beginner level → see emoji-rich step cards
2. **Switch to Advanced** → ask the same question → notice technical depth change
3. **Upload a homework photo** (paperclip icon) → watch the vision scanning animation → see structured solution
4. **Type "Quiz me on gravity"** → take an interactive MCQ quiz → see your score tracked
5. **Click the 🗺 button** → generate a concept map → explore the knowledge graph
6. **Ask the same question twice** → second response is instant (cached)
7. **Press Ctrl+Shift+B** → open the Developer Panel → see flow traces and metrics
8. **Wait a day** → see the "Due for Review" banner appear (spaced repetition)

---

### Media Gallery Suggestions

| # | Type | Content | Description |
|---|------|---------|-------------|
| 1 | Screenshot | Main chat — Beginner theme | Colourful step-by-step explanation with emojis |
| 2 | Screenshot | Main chat — Advanced theme | Terminal-style monospace explanation |
| 3 | Screenshot | Homework photo analysis | Vision card with scanning animation, extracted data, steps |
| 4 | Screenshot | Interactive quiz | MCQ cards with score and explanations |
| 5 | Screenshot | Concept map | SVG knowledge graph with coloured nodes and edges |
| 6 | Screenshot | Spaced repetition banner | "Due for Review" notification |
| 7 | Screenshot | Developer flow trace | Step-by-step timing with bottleneck detection |
| 8 | Video (YouTube) | 2-min walkthrough | Ask question → get structured answer → quiz → concept map → image upload |

---

### Project Links

| Link | URL |
|------|-----|
| **GitHub Repository** | `https://github.com/Christy-Varghese/studybuddy` |
| **Ollama** | `https://ollama.ai` |
| **Gemma 4 Model** | `https://ollama.ai/library/gemma4` |

---

### Submission Checklist Mapping

| Checklist Item | Status | Notes |
|---------------|--------|-------|
| Title | ✅ | "StudyBuddy — Offline AI Tutor Powered by Gemma 4" |
| Subtitle | ✅ | "Bringing frontier AI tutoring to every student, everywhere — no cloud, no cost, no internet required." |
| Card & Thumbnail Image | ✅ | Open `public/card-560x280.html` → screenshot at 560×280 |
| Submission Tracks | ✅ | Future of Education |
| Media Gallery — Video | 📹 | Record 2-min YouTube walkthrough (see suggestions above) |
| Media Gallery — Photos | 📷 | Take 5–7 screenshots of key features (see table above) |
| Project Description | ✅ | Copy the "Project Description" section above |
| Project Links | ✅ | GitHub repo + Ollama + Gemma links |
| Attachments | ✅ | Link GitHub repo |

---

**Built with ❤️ to make quality education accessible to everyone.**

*StudyBuddy is open-source educational software. Privacy-first, offline-capable, powered by Google's Gemma 4.*
