# StudyBuddy — Complete Features Guide

> A hands-on guide to every feature in StudyBuddy. Each section explains **what it does**, **how to use it**, and shows a **real example** of the interaction.

---

## Table of Contents

1. [Tutor Mode (Default Chat)](#1-tutor-mode-default-chat)
2. [Socratic Mode — 5-Question Guided Discovery](#2-socratic-mode--5-question-guided-discovery)
3. [Homework Photo Analysis (Vision)](#3-homework-photo-analysis-vision)
4. [Interactive Concept Maps](#4-interactive-concept-maps)
5. [Quiz Mode](#5-quiz-mode)
6. [Dynamic Progress Evolution Report](#6-dynamic-progress-evolution-report)
7. [Voice Input (Microphone)](#7-voice-input-microphone)
8. [Spaced Repetition (SM-2)](#8-spaced-repetition-sm-2)
9. [Learning Streaks](#9-learning-streaks)
10. [Adaptive Themes](#10-adaptive-themes)
11. [Topic Autocomplete Search](#11-topic-autocomplete-search)
12. [Developer Diagnostics Panel](#12-developer-diagnostics-panel)
13. [Smart Cache System](#13-smart-cache-system)
14. [Progressive Web App (PWA)](#14-progressive-web-app-pwa)

---

## 1. Tutor Mode (Default Chat)

### What it does
The default learning mode. Type any question and Gemma 4 returns a **structured, step-by-step explanation** adapted to your chosen difficulty level (Beginner / Intermediate / Advanced).

### How to use it
1. Make sure **Tutor** mode is selected (it's the default)
2. Choose your difficulty level from the dropdown (Beginner / Intermediate / Advanced)
3. Type your question in the chat box and press Enter (or click Send)

### Example

**You type:**
```
What is photosynthesis?
```

**At Beginner level, you get:**
```json
{
  "intro": "🌱 Photosynthesis is how plants make their own food using sunlight!",
  "steps": [
    { "title": "Step 1: Catch the Sun", "text": "Leaves have tiny green helpers called chlorophyll that catch sunlight ☀️", "emoji": "🍃" },
    { "title": "Step 2: Drink Water", "text": "Roots suck up water from the soil like a straw 🥤", "emoji": "💧" },
    { "title": "Step 3: Breathe In CO₂", "text": "Tiny holes in leaves called stomata let in carbon dioxide from the air", "emoji": "🌬️" },
    { "title": "Step 4: Cook the Food", "text": "The plant mixes sunlight + water + CO₂ to make glucose (sugar) — that's its food!", "emoji": "🍳" },
    { "title": "Step 5: Release Oxygen", "text": "The leftover oxygen goes back into the air for us to breathe 🎉", "emoji": "🫁" }
  ],
  "answer": "Photosynthesis = Sunlight + Water + CO₂ → Glucose + Oxygen",
  "followup": "Can you think of what would happen to a plant if it got no sunlight for a week? 🤔"
}
```

This renders as a beautiful card with an intro banner, numbered step cards with emojis, an answer pill, and a follow-up question prompt.

**At Advanced level, the same question produces:**
```json
{
  "intro": "Photosynthesis is the biochemical process by which photoautotrophs convert electromagnetic radiation into chemical energy.",
  "steps": [
    { "title": "Light-Dependent Reactions", "text": "Photosystem II absorbs photons at 680nm, splitting H₂O via the OEC (Mn₄CaO₅ cluster), generating O₂, and driving electron transport through plastoquinone to PSI.", "emoji": "⚡" },
    { "title": "Calvin Cycle (Light-Independent)", "text": "RuBisCO catalyses CO₂ fixation onto RuBP (C5) → 2× 3-PGA (C3). ATP and NADPH from the light reactions reduce 3-PGA → G3P.", "emoji": "🔄" }
  ],
  "answer": "6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂",
  "followup": "How does C4 photosynthesis circumvent RuBisCO's oxygenase activity?"
}
```

### API endpoint
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is photosynthesis?","level":"beginner","history":[]}'
```

---

## 2. Socratic Mode — 5-Question Guided Discovery

### What it does
A **witty, high-energy Socratic tutor** guides you to discover the answer yourself through **exactly 5 questions**. The AI never gives away the answer — it nudges you with hints, funny analogies, and pop-culture references. On Turn 5, it delivers a 🎯 **Big Picture** summary tying all your answers together.

### How to use it
1. Click **Socratic** mode in the mode selector
2. Type a topic (e.g., "gravity") and press Enter
3. Answer each question — the AI builds on your response
4. After 5 turns, you'll see the Big Picture card with a complete summary

### Example: 5-Turn Socratic Dialogue on "Gravity"

**Turn 1 — You type:** `gravity`
```json
{
  "acknowledgement": "",
  "question": "Before we dive in — quick: if you had to explain why things fall DOWN and not sideways to a confused alien, what would you say? 👽",
  "hint": "",
  "isNearAnswer": false
}
```

**Turn 2 — You answer:** `Because the Earth pulls things toward it`
```json
{
  "acknowledgement": "Nice! You're already on the right track — the Earth is basically a giant magnet for stuff! 🧲",
  "question": "So the Earth pulls things toward it. But here's the thing — does a bowling ball fall faster than a feather? And if not... why does it FEEL like it does? 🎳🪶",
  "hint": "",
  "isNearAnswer": false
}
```

**Turn 3 — You answer:** `Air resistance makes the feather slow down`
```json
{
  "acknowledgement": "EXACTLY! You just figured out what Galileo needed a whole tower in Pisa to prove! 🏗️",
  "question": "OK so in a vacuum (no air), they'd fall at the same speed. But WHY does everything fall at the same rate regardless of mass? What does that tell us about gravity?",
  "hint": "Think about it this way — gravity doesn't care if you're a sumo wrestler or a hamster. It treats everyone equally. Why? 🐹",
  "isNearAnswer": false
}
```

**Turn 4 — You answer:** `Gravity accelerates everything the same amount`
```json
{
  "acknowledgement": "Boom! 9.8 m/s² — gravity's one-size-fits-all acceleration! Einstein would fist-bump you right now 🤜🤛",
  "question": "Last puzzle piece: if gravity pulls YOU toward the Earth, are YOU also pulling the Earth toward you? And if so, why don't we notice?",
  "hint": "Newton's Third Law has entered the chat... 💬",
  "isNearAnswer": true
}
```

**Turn 5 — You answer:** `Yes but the Earth is so massive it barely moves`
```json
{
  "acknowledgement": "You nailed it! The Earth moves toward you by about 0.000000000000000000001 meters. Not exactly noticeable. 😄",
  "question": "So putting it all together — what is gravity really about?",
  "hint": "",
  "isNearAnswer": true,
  "summary": "🎯 Big Picture: Gravity is a mutual attraction between any two objects with mass. The Earth pulls you down at 9.8 m/s² — and you pull it back by exactly the same force (Newton's Third Law), but its enormous mass means it barely budges. In a vacuum, everything falls at the same rate regardless of mass because gravity accelerates all objects equally. From Newton's apple to Einstein's curved spacetime, gravity is the invisible thread connecting every piece of matter in the universe."
}
```

### Visual UI elements
- **Progress dots**: 5 dots at the top show your current turn (filled = completed)
- **Turn counter**: "Turn 2 of 5" displayed above the response
- **Hint box**: Appears when the AI provides a hint (subtle, styled differently)
- **Big Picture card**: A special highlighted card appears on Turn 5 with the summary
- **Auto-reset**: After Turn 5, the conversation resets for a new topic

### API endpoint
```bash
# Turn 1
curl -X POST http://localhost:3000/socratic \
  -H "Content-Type: application/json" \
  -d '{"message":"gravity","level":"intermediate","history":[]}'

# Turn 2 (include previous history)
curl -X POST http://localhost:3000/socratic \
  -H "Content-Type: application/json" \
  -d '{"message":"Because the Earth pulls things toward it","level":"intermediate","history":[{"role":"assistant","content":"...turn1 response..."},{"role":"user","content":"Because the Earth pulls things toward it"}]}'
```

---

## 3. Homework Photo Analysis (Vision)

### What it does
Upload a photo of any homework problem — a math equation, a diagram, a chemistry formula, handwritten notes — and Gemma 4's **vision capability** analyses the image and provides a step-by-step solution.

### How to use it
1. Click the **📎 paperclip icon** next to the chat input
2. Select a photo from your device (JPEG, PNG, WebP)
3. The image is automatically resized to 640px and converted to WebP for optimal performance
4. A scanning animation plays while Gemma 4 processes the image
5. The result appears as a structured **Vision Analysis Card**

### Example

**You upload:** A photo of a handwritten quadratic equation: `2x² + 5x - 3 = 0`

**Response:**
```json
{
  "visual_summary": "Handwritten quadratic equation on lined paper: 2x² + 5x - 3 = 0",
  "extracted_data": [
    "Equation: 2x² + 5x - 3 = 0",
    "Coefficients: a=2, b=5, c=-3"
  ],
  "logic_steps": [
    "Apply the quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
    "Calculate discriminant: b²-4ac = 25-(-24) = 25+24 = 49",
    "√49 = 7",
    "x = (-5 ± 7) / 4",
    "x₁ = (-5+7)/4 = 2/4 = 0.5",
    "x₂ = (-5-7)/4 = -12/4 = -3"
  ],
  "final_solution": "x = 0.5 or x = -3",
  "confidence": "high"
}
```

### Visual UI elements
- **Thumbnail**: A small preview of your uploaded image
- **Scanning animation**: A pulsing line scans across the image while processing
- **Collapsible sections**: Each section (Visual Summary, Extracted Data, Logic Steps, Solution) is collapsible for easy reading
- **Confidence indicator**: Shows high/medium/low based on image clarity

### API endpoint
```bash
curl -X POST http://localhost:3000/chat-with-image \
  -F "image=@homework.jpg" \
  -F "message=Solve this equation" \
  -F "level=intermediate"
```

---

## 4. Interactive Concept Maps

### What it does
Generates an **interactive knowledge graph** for any topic. Gemma 4 produces a nodes-and-edges structure showing how concepts interconnect, rendered as a beautiful **animated SVG** — no external libraries needed.

### How to use it
1. Click the **🗺 Concept Map** button
2. Enter a topic (or it uses your last asked topic)
3. An animated SVG map appears showing interconnected concepts

### Example

**You request a concept map for:** `photosynthesis`

**Response (JSON):**
```json
{
  "nodes": [
    { "id": "1", "label": "Photosynthesis", "group": "core" },
    { "id": "2", "label": "Chlorophyll", "group": "biology" },
    { "id": "3", "label": "Sunlight", "group": "energy" },
    { "id": "4", "label": "CO₂", "group": "input" },
    { "id": "5", "label": "Water", "group": "input" },
    { "id": "6", "label": "Glucose", "group": "output" },
    { "id": "7", "label": "Oxygen", "group": "output" },
    { "id": "8", "label": "Calvin Cycle", "group": "process" },
    { "id": "9", "label": "Light Reactions", "group": "process" }
  ],
  "edges": [
    { "source": "3", "target": "9", "label": "powers" },
    { "source": "9", "target": "8", "label": "produces ATP" },
    { "source": "2", "target": "9", "label": "absorbs light" },
    { "source": "4", "target": "8", "label": "fixed by RuBisCO" },
    { "source": "5", "target": "9", "label": "split for electrons" },
    { "source": "8", "target": "6", "label": "produces" },
    { "source": "9", "target": "7", "label": "releases" }
  ]
}
```

### Visual UI elements
- **Force-directed layout**: Nodes gently float and settle into position
- **Colour-coded groups**: Different colours for core, input, output, process nodes
- **Animated edges**: Connections draw in with smooth animation
- **Interactive hover**: Hover over a node to see its connections highlighted

### API endpoint
```bash
curl -X POST http://localhost:3000/concept-map \
  -H "Content-Type: application/json" \
  -d '{"topic":"photosynthesis","level":"intermediate"}'
```

---

## 5. Quiz Mode

### What it does
Generates **2–5 multiple choice questions** on any topic, adapted to your difficulty level. Your score is automatically tracked and fed into the spaced repetition system.

### How to use it
1. Type **"Quiz me on [topic]"** in the chat, or
2. The agent mode automatically generates a quiz after explaining a topic

### Example

**You type:** `Quiz me on the solar system`

**Response:**
```json
{
  "questions": [
    {
      "question": "Which planet is closest to the Sun?",
      "options": ["Venus", "Mercury", "Mars", "Earth"],
      "correct": 1,
      "explanation": "Mercury orbits at just 57.9 million km from the Sun — about 1/3 of Earth's distance."
    },
    {
      "question": "What is the largest planet in our solar system?",
      "options": ["Saturn", "Neptune", "Jupiter", "Uranus"],
      "correct": 2,
      "explanation": "Jupiter is 11× Earth's diameter and could fit over 1,300 Earths inside it."
    },
    {
      "question": "Which planet is known for its prominent ring system?",
      "options": ["Jupiter", "Uranus", "Neptune", "Saturn"],
      "correct": 3,
      "explanation": "Saturn's rings are made of ice and rock particles, spanning up to 282,000 km."
    }
  ]
}
```

### Visual UI elements
- **Quiz cards**: Each question displayed as an interactive card
- **Option buttons**: Click to select your answer — correct turns green, wrong turns red
- **Explanation reveal**: After answering, the explanation slides in
- **Score summary**: Final score shown at the end (e.g., "2/3 — 67%")
- **Progress tracking**: Score automatically saved to your learning history

### API endpoint
```bash
curl -X POST http://localhost:3000/quiz \
  -H "Content-Type: application/json" \
  -d '{"topic":"solar system","level":"beginner","numQuestions":3}'
```

---

## 6. Dynamic Progress Evolution Report

### What it does
An **AI-generated adaptive learning report** that analyses your entire study history and produces a personalised 5-section analysis. Powered by the `generate_evolution_report` tool.

### How to use it
1. Study a few topics first (so there's data to analyse)
2. Click the **📈 Evolution Report** button
3. Wait for the AI to generate your personalised report (~10–30 seconds)
4. Read your 5-section report card

### The 5 Sections

| Section | What it tells you |
|---------|-------------------|
| **🧭 Learning Trajectory** | How your focus has shifted over time — describes the journey, not just a list |
| **🔗 Cross-Pollination** | A hidden connection between two of your studied topics you might not have noticed |
| **📖 Vocabulary Heatmap** | How your language is evolving — are you moving from casual to technical? |
| **🎯 Big Domino** | The ONE keystone topic that would unlock the most progress across your weak areas |
| **⚡ Micro-Mission** | A specific 2-minute task you can do right now, targeting your most recent topic |

### Example

After studying: `photosynthesis`, `gravity`, `the water cycle`, `climate change`, `DNA`, `evolution`

**Response:**
```json
{
  "narrative": "You started with broad scientific curiosity — exploring physical forces and biological processes independently. Now your topics are converging: photosynthesis, the water cycle, and climate change form a natural ecosystem triad, while DNA and evolution show a deepening interest in the mechanisms of life itself.",
  "crossPollination": {
    "topicA": "photosynthesis",
    "topicB": "climate change",
    "connection": "Understanding photosynthesis reveals why deforestation accelerates climate change — fewer plants mean less CO₂ absorption. Your knowledge of the carbon cycle from photosynthesis is directly applicable to understanding greenhouse gas dynamics."
  },
  "vocabularyHeatmap": "Your language is transitioning from descriptive ('plants use sunlight') to mechanistic ('chlorophyll absorbs photons in the 680nm range'). This shift suggests you're ready for university-level material in biology.",
  "bigDomino": {
    "topic": "the water cycle",
    "reasoning": "The water cycle connects your strongest topics (photosynthesis, climate) with your weakest (no quiz score yet). Mastering it would reinforce 3 other topics simultaneously."
  },
  "microMission": {
    "task": "Draw a simple diagram connecting photosynthesis, the water cycle, and climate change with arrows showing how each affects the others. Spend 2 minutes. Then ask StudyBuddy to generate a concept map to compare.",
    "topic": "climate change"
  }
}
```

### Visual UI elements
- **Loading spinner**: A pulsing animation while the report generates
- **Report card**: Beautifully styled card with 5 distinct sections
- **Section headers**: Each section has its own emoji and title
- **Mission box**: The Micro-Mission appears in a highlighted action box

### API endpoint
```bash
curl -X POST http://localhost:3000/progress-report
```

> **Note**: Returns a meaningful default message if you haven't studied any topics yet.

---

## 7. Voice Input (Microphone)

### What it does
Speak your question instead of typing it. Uses the browser's built-in **Web Speech API** for speech recognition — no cloud transcription services needed.

### How to use it
1. Click the **🎙 microphone icon** next to the chat input
2. Start speaking — a live voice preview appears in a status bar below the input
3. The text updates in real-time as you speak
4. Click **✓** to send the transcribed text, or **✕** to cancel
5. Or just stop speaking — after 2.5 seconds of silence, the text is sent automatically

### Key features
| Feature | Description |
|---------|-------------|
| **Auto-restart** | If the browser silently kills the recognition session, it auto-restarts |
| **No-speech recovery** | `no-speech` and network errors are caught and the session retries automatically |
| **2500ms silence timeout** | Configurable — waits for a natural pause before sending |
| **Live preview** | Full-width status bar shows what's being transcribed in real-time |
| **Action buttons** | ✓ (send now) and ✕ (cancel) buttons in the status bar |
| **Toggle safety** | Toggling mic off while speaking still sends the captured text instead of discarding it |

### Example flow
```
1. Click 🎙 → status bar appears: "Listening..."
2. You say: "Explain the water cycle"
3. Status bar shows: "Explain the water cycle"  [✓] [✕]
4. 2.5 seconds of silence → text auto-sent to Tutor/Socratic mode
5. Response appears in chat
```

---

## 8. Spaced Repetition (SM-2)

### What it does
Every quiz score feeds the **SuperMemo-2 algorithm**, which schedules topics for review at scientifically optimal intervals. Topics you know well get reviewed less often; topics you struggle with come back sooner.

### How it works
```
Quiz score → SM-2 algorithm → next review date

Score 5 (perfect):   interval grows exponentially (1 → 6 → 15 → 38 → 96 days)
Score 3 (ok):        interval stays the same
Score < 3 (struggle): interval resets to 1 day
```

### How to use it
1. Take quizzes on topics (scores are tracked automatically)
2. Check your **due reviews**: visit `http://localhost:3000/due-reviews`
3. A **"Due for Review"** banner appears in the UI when topics are ready
4. Review and retake the quiz → your interval updates

### API endpoints
```bash
# See what's due for review
curl http://localhost:3000/due-reviews

# Update SRS after a review session
curl -X PUT http://localhost:3000/srs/photosynthesis \
  -H "Content-Type: application/json" \
  -d '{"score": 4}'
```

---

## 9. Learning Streaks

### What it does
Tracks consecutive days you study. A **streak badge** appears in the header showing your current streak count. Turns orange at 3+ days.

### How to use it
- Just study! Every interaction counts as a study day
- Your streak appears in the header: 🔥 3-day streak
- Check your streak stats via the API

### API endpoint
```bash
curl http://localhost:3000/streak
# Returns: { "current": 3, "longest": 7 }
```

---

## 10. Adaptive Themes

### What it does
Three visual themes adapt the entire UI to different age groups and learning preferences.

### The 3 Themes

| Theme | Target Audience | Style |
|-------|----------------|-------|
| 🌈 **Beginner** | Ages 8–12 | Playful, colourful, emoji-rich, large fonts, rounded cards |
| 📘 **Intermediate** | High school | Clean, professional, balanced depth, standard fonts |
| 💻 **Advanced** | University | Terminal-style, monospace font, minimal decoration, technical depth |

### How to use it
- Click the **difficulty dropdown** at the top of the page
- The theme changes instantly with a smooth 300ms colour crossfade
- The AI also adjusts its explanation depth and vocabulary to match

---

## 11. Topic Autocomplete Search

### What it does
As you type in the chat input, a **trie-based autocomplete** suggests matching topics from the taxonomy (76 topics, 1,223 keywords across 9 subjects).

### How to use it
- Start typing in the chat input
- Matching topics appear in a dropdown below
- Click a suggestion or keep typing

### API endpoint
```bash
curl "http://localhost:3000/topics/search?q=photo"
# Returns: ["photosynthesis", "photoelectric effect", "photography basics"]
```

---

## 12. Developer Diagnostics Panel

### What it does
A built-in **developer panel** with two tabs — **Metrics** and **Flow** — for debugging and performance monitoring.

### How to use it
1. Press **Ctrl+Shift+B** (or click the 🛠 button)
2. The panel slides open from the right side
3. Switch between **Metrics** and **Flow** tabs

### Metrics tab
- Request counts per route
- Latency percentiles (p50, p95, p99)
- Cache hit rates
- Active connections

### Flow tab
- Real-time **flow traces** for every request
- Each step shows its timing in milliseconds
- **Bottleneck detection**: steps taking >5s are highlighted in red
- Example trace:
```
/chat → [Taxonomy 2ms ✓] → [Cache 1ms ✓] → [Ollama 45,230ms ⚠] → [Parse 3ms ✓]
```

### API endpoints
```bash
# Metrics
curl http://localhost:3000/dev/metrics

# Flow traces
curl http://localhost:3000/dev/flow-traces

# Cache stats
curl http://localhost:3000/cache-stats
```

---

## 13. Smart Cache System

### What it does
A **4-layer caching waterfall** that avoids redundant Ollama calls, reducing inference load by ~70%.

### The 4 Layers

| Layer | What it does | Speed |
|-------|-------------|-------|
| 1. **Taxonomy Resolve** | Maps "what is gravity?" → canonical topic `gravity` | ~2ms |
| 2. **Normalised Hash** | Creates a stable hash from (topic + level + mode) to look up cached responses | ~1ms |
| 3. **In-Flight Dedup** | If the same request is already being processed, waits for that result instead of sending a duplicate to Ollama | ~0ms |
| 4. **Disk Persistence** | Cached responses are saved to disk with a 48-hour TTL | ~3ms |

### How it works in practice
```
First request:  "Explain photosynthesis" → all 4 layers miss → Ollama (45s) → cache result
Second request: "Explain photosynthesis" → Layer 2 hit → instant response (~3ms)
Third request:  "What is photosynthesis?" → Layer 1 resolves to same topic → Layer 2 hit → instant
```

### Predictive pre-warming
After the `suggest_next_topic` tool recommends a topic, the cache **pre-warms** by generating an explanation in the background — so when the student asks about it, the response is instant.

---

## 14. Progressive Web App (PWA)

### What it does
StudyBuddy is installable as a **Progressive Web App** on any device. The service worker caches the UI shell for offline-first experience.

### How to install
1. Open `http://localhost:3000` in Chrome, Edge, or any PWA-compatible browser
2. Click the **"Install"** prompt in the address bar (or browser menu → "Install app")
3. StudyBuddy appears as a standalone app on your desktop/home screen

### Offline capability
- **UI shell**: Always available offline (cached by service worker)
- **AI responses**: Available as long as Ollama is running locally
- **No internet needed**: Everything runs on-device after initial setup

---

## Quick Reference: All API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| `POST` | `/chat` | Tutor mode — structured explanation (SSE streaming) |
| `POST` | `/chat-with-image` | Vision — homework photo analysis |
| `POST` | `/agent` | Full agent pipeline |
| `POST` | `/socratic` | Socratic 5-turn dialogue |
| `POST` | `/concept-map` | Generate concept map |
| `POST` | `/quiz` | Generate quiz |
| `POST` | `/estimate` | Response time prediction |
| `POST` | `/progress-report` | Dynamic Progress Evolution Report |
| `GET`  | `/progress` | Student progress summary |
| `DELETE` | `/progress` | Clear all progress |
| `GET`  | `/due-reviews` | Topics due for spaced repetition |
| `PUT`  | `/srs/:topic` | Update SRS after review |
| `GET`  | `/streak` | Current + longest streak |
| `GET`  | `/topics/search?q=` | Topic autocomplete |
| `GET`  | `/cache-stats` | Cache performance |
| `GET`  | `/dev/metrics` | Developer metrics |
| `GET`  | `/dev/flow-traces` | Request flow traces |

---

## Quick Reference: All 7 Learning Tools

| # | Tool | Parameters | Description |
|---|------|-----------|-------------|
| 1 | `explain_topic` | `topic`, `level` | Structured step-by-step explanation |
| 2 | `generate_quiz` | `topic`, `level`, `numQuestions` | 2–5 MCQ questions with explanations |
| 3 | `track_progress` | `topic`, `score` | Save study event, update SRS schedule |
| 4 | `suggest_next_topic` | `level` | Personalised next-topic recommendation |
| 5 | `ask_socratic_question` | `topic`, `level`, `studentResponse`, `turnNumber` | 5-turn witty guided discovery |
| 6 | `generate_concept_map` | `topic`, `level` | Nodes + edges knowledge graph |
| 7 | `generate_evolution_report` | *(none — reads progress internally)* | 5-section adaptive learning report |

---

**Built with ❤️ to make quality education accessible to everyone.**

*StudyBuddy is open-source. Privacy-first, offline-capable, powered by Google's Gemma 4.*
