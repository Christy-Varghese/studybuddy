# StudyBuddy Quick Reference

## ⚡ Quick Start
```bash
# Terminal 1
ollama run gemma4:e4b

# Terminal 2
npm install && npm start

# Open: http://localhost:3000
```

---

## 🧰 The 6 Learning Tools

| Tool | Purpose | Required args |
|------|---------|---------------|
| `explain_topic` | Step-by-step explanation with intro, steps, answer, follow-up | topic, level |
| `generate_quiz` | 2–5 multiple choice questions with explanations | topic, level, numQuestions |
| `track_progress` | Save study event + update SRS schedule | topic, level |
| `suggest_next_topic` | Recommend next topic based on weak/strong areas | currentTopic |
| `ask_socratic_question` | Turn-based guiding question (never gives answer directly) | topic, level |
| `generate_concept_map` | Build a nodes-and-edges knowledge graph | topic, level |

---

## 📡 API Endpoints

### Learning
| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| `POST` | `/chat` | `{message, level, history}` | Direct tutor chat |
| `POST` | `/chat-with-image` | `FormData: message, level, image` | Homework photo analysis |
| `POST` | `/agent` | `{message, level, history, fast?}` | Full agent pipeline |
| `POST` | `/socratic` | `{message, level, history}` | Socratic dialogue mode |
| `POST` | `/concept-map` | `{topic, level}` | Generate concept map |
| `POST` | `/quiz` | `{topic, level, numQuestions}` | Standalone quiz |
| `POST` | `/estimate` | `{message, level, hasImage?}` | Time estimate (no LLM) |

### Progress & SRS
| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| `GET` | `/progress` | — | Full progress summary (topics, weak/strong, streak, due) |
| `DELETE` | `/progress` | — | Clear all progress |
| `GET` | `/due-reviews` | — | Topics due for spaced repetition today |
| `PUT` | `/srs/:topic` | `{grade: 0-5}` or `{score: 0-100}` | Update SRS after review |
| `GET` | `/streak` | — | `{current, longest, studiedToday}` |

### Cache & Search
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/cache-stats` | Cache hit/miss stats |
| `DELETE` | `/cache` | Clear response cache |
| `GET` | `/topics/search?q=phot` | Trie prefix autocomplete |

### Admin (Taxonomy)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/admin/taxonomy` | View learned + pending topics |
| `POST` | `/admin/taxonomy` | Manually add a topic |
| `POST` | `/admin/taxonomy/pending/:topic/approve` | Promote pending → learned |
| `DELETE` | `/admin/taxonomy/pending/:topic` | Reject a pending topic |
| `DELETE` | `/admin/taxonomy/learned/:topic` | Remove a learned topic |
| `POST` | `/admin/taxonomy/rebuild` | Rebuild taxonomy live |

---

## 📁 Key Files

```
server.js                       API routes + middleware
agent/tools.js                  6 tool implementations
agent/agentLoop.js              3 agent modes (sequential, parallel, Socratic)
agent/progressStore.js          SM-2 SRS + streak + progress
agent/smartCache.js             4-layer cache waterfall
agent/dynamicTaxonomy.js        Auto-learning topic taxonomy
public/index.html               Full single-page UI
public/manifest.json            PWA manifest
public/sw.js                    Service worker (offline-first)
public/taxonomy-admin.html      Admin panel for topics
data/progress.json              Student learning history (auto-created)
```

---

## 💾 Data Format — `data/progress.json`

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

---

## 🤖 Agent Modes

| Mode | Trigger | LLM calls | What happens |
|------|---------|-----------|--------------|
| **Parallel** (default) | `POST /agent` | 2 | Plan → execute tools concurrently → synthesise |
| **Sequential** | `/agent` with `fast:false` | 4–5 | Explain → quiz → track → suggest (one by one) |
| **Socratic** | `POST /socratic` | 1 | Ask a guiding question, track engagement |

---

## 🐛 Common Issues

| Problem | Fix |
|---------|-----|
| `Gemma is not running` | Start Ollama: `ollama run gemma4:e4b` |
| Slow first response (~10s) | Normal — model warmup on first request |
| `progress.json` not saving | Check `data/` directory is writable |
| Concept map empty | Topic may be too short — use a full phrase e.g. "Newton's Laws" |
| SRS grade rejected | Use `grade` (0–5) or `score` (0–100), not both |
| Service worker stale | Open DevTools → Application → SW → "Update on reload" |

---

## 🧪 Test Checklist

```bash
# All return 200
curl http://localhost:3000/progress
curl http://localhost:3000/streak
curl http://localhost:3000/due-reviews
curl "http://localhost:3000/topics/search?q=photo"

# Agent responds with structured data
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"Explain gravity","level":"beginner","history":[]}'

# Concept map returns nodes + edges
curl -X POST http://localhost:3000/concept-map \
  -H "Content-Type: application/json" \
  -d '{"topic":"gravity","level":"intermediate"}'

# SRS update
curl -X PUT http://localhost:3000/srs/gravity \
  -H "Content-Type: application/json" \
  -d '{"score":80}'
```

---

## 📊 Current Feature Status

```
✅ Gemma 4 (gemma4:e4b) — fully local, no internet
✅ 6 learning tools
✅ 3 agent modes (sequential, parallel, Socratic)
✅ Concept map generation (animated SVG)
✅ Spaced Repetition — SM-2 algorithm
✅ Learning streak tracking
✅ 4-layer smart cache (~70% bandwidth savings)
✅ Dynamic topic taxonomy (auto-promotes learned topics)
✅ Homework photo analysis (Gemma 4 vision)
✅ Progressive Web App — installable offline
✅ 3 adaptive themes (beginner / intermediate / advanced)
✅ Voice input (Web Speech API)
✅ Taxonomy admin panel
```
