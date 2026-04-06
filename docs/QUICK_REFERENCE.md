# StudyBuddy Quick Reference Card

## 🚀 Quick Start (5 min)
```bash
# Terminal 1: Ollama
ollama run gemma4:e4b

# Terminal 2: Backend
cd ~/Documents/studybuddy
npm install
npm start

# Terminal 3: Frontend
cd ~/Documents/studybuddy/frontend
npm install
npm run dev

# Open: http://localhost:5173
```

## 🎯 The 4 Core Tools

| Tool | Purpose | Input | Output | When |
|------|---------|-------|--------|------|
| **explain_topic** | Step-by-step explanations | topic, level | Intro + steps + key point | Learn a concept |
| **generate_quiz** | Test knowledge | topic, level, count | 2-5 Q&A with answers | Practice/test |
| **track_progress** | Save learning history | topic, level, score | Saved, weak/strong areas | Auto-called |
| **suggest_next_topic** | Personalized path | current topic | Recommended next topic | Ask "what next?" |

## 📁 Key Files

```
agent/tools.js              # Tool implementations (200 lines)
agent/progressStore.js      # Progress persistence (100 lines)
server.js                   # Express backend (200 lines)
frontend/src/pages/Chat.tsx # Main UI (150 lines)
data/progress.json          # Student history
```

## 📡 API Endpoint

**POST /api/chat**
```json
Request:  {"message": "Explain photosynthesis", "stream": true}
Response: Server-sent events with real-time text
```

## 🔧 System Architecture

```
Student Input
    ↓
Claude (Intent understanding)
    ↓
Tool Selection (explain/quiz/track/suggest)
    ↓
Ollama Gemma 4 (Content generation)
Progress Store (Learning history)
    ↓
Response Synthesis
    ↓
Streaming UI
```

## 📚 Documentation Map

| File | Purpose | Read Time |
|------|---------|-----------|
| **README.md** | Quick start & features | 10 min |
| **PROGRESS_SUMMARY.md** | Complete overview | 20 min |
| **ARCHITECTURE.md** | Technical details | 20 min |
| **IMPLEMENTATION_STATUS.md** | Next steps & roadmap | 15 min |
| **DOCS_INDEX.md** | Navigation guide | 5 min |
| **FINAL_SUMMARY.md** | Session recap | 10 min |

## 🎓 I Want To...

- **Learn about StudyBuddy** → README.md
- **Understand the system** → PROGRESS_SUMMARY.md
- **Implement a feature** → IMPLEMENTATION_STATUS.md
- **Check the API** → ARCHITECTURE.md#api-reference
- **Debug an issue** → ARCHITECTURE.md#error-handling-strategy
- **See what changed** → FINAL_SUMMARY.md

## ⚡ Key Commands

```bash
# Test Ollama
curl http://localhost:11434/api/chat

# Test Backend
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi","stream":false}'

# View Progress
cat data/progress.json

# Check Ports
lsof -i :3000        # Backend
lsof -i :5173        # Frontend
lsof -i :11434       # Ollama
```

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| "Ollama not found" | Run `ollama run gemma4:e4b` in separate terminal |
| "API key error" | Check .env file has `ANTHROPIC_API_KEY=sk-...` |
| "Progress not saving" | Verify `data/` directory exists and is writable |
| "Frontend fails to fetch" | Check backend is running on port 3000 |
| "Responses slow" | First request takes ~10s (model warmup), normal after |

## 💾 Data Storage

```json
// data/progress.json format
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

## 🎯 Next Priority Tasks

1. **HIGH**: Model routing in server.js (2-3 hrs)
   - Route quiz to gemma4:e2b (fast)
   - Keep synthesis on gemma4:e4b (quality)

2. **HIGH**: Error handling (2 hrs)
   - Timeout for Ollama (15s)
   - Fallback responses
   - Retry logic

3. **MEDIUM**: Performance optimization (3-4 hrs)
   - Cache explanations
   - Deduplicate requests
   - Profile response times

4. **LOW**: Advanced features (future)
   - Image analysis (Claude Vision)
   - Spaced repetition
   - Multi-user support

## 🧪 Testing Quick Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads at http://localhost:5173
- [ ] Chat accepts message input
- [ ] Tool calls are being made (check logs)
- [ ] Progress is saved (check data/progress.json)
- [ ] Weak areas are detected (Progress page)
- [ ] Streaming works (see text appear live)
- [ ] Quiz generation works (check JSON format)
- [ ] Next topic suggestion works

## 🤖 Models

- **gemma4:e4b** - High quality, slower (explanations, synthesis)
- **gemma4:e2b** - Fast inference (quizzes, planning)
- **claude-3.5-sonnet** - Orchestration (tool calling, intent understanding)

## 📊 System Status

```
✅ Gemma 4 integration
✅ Tool system (4 tools working)
✅ Progress store
✅ Claude orchestration
✅ React frontend
✅ Comprehensive documentation
⏳ Model routing optimization (HIGH PRIORITY)
⏳ Error handling (HIGH PRIORITY)
⏳ Performance tuning (MEDIUM PRIORITY)
```

## 🔗 Important Links

- Ollama: https://ollama.ai
- Claude API: https://anthropic.com
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Ollama API: http://localhost:11434

## 📝 Notes

- All tools return JSON for structured parsing
- Progress is persistent (survives restarts)
- Claude decides which tools to call based on intent
- Front-end handles streaming message display
- Weak areas auto-computed from quiz scores

## 🎓 Learning Paths

**For Users**: Start at frontend, ask questions, take quizzes, check progress

**For Devs**: README → PROGRESS_SUMMARY → ARCHITECTURE → IMPLEMENTATION_STATUS → Code

**For Architects**: PROGRESS_SUMMARY → ARCHITECTURE → Design decisions

**For Managers**: FINAL_SUMMARY → IMPLEMENTATION_STATUS → Next steps

---

**Print this and keep it nearby while working! 📌**

*Last Updated: January 2025*
