# StudyBuddy Project - Development Summary

## Project Overview
**StudyBuddy** is an AI-powered educational tutor that helps students learn interactively. It combines:
- Gemma 4 LLM via Ollama for natural language understanding and content generation
- Claude API for advanced reasoning and multi-turn conversations
- A persistent progress tracking system to personalize learning paths
- A React-based web UI for student interactions

## Architecture

### Key Components

#### 1. **Agent System** (`agent/`)
The core AI logic that handles:
- **tool definitions** (`agent/tools.js`): 4 core tools for structured learning
  - `explain_topic`: Breaks concepts into steps
  - `generate_quiz`: Creates 2-5 practice questions  
  - `track_progress`: Saves study history
  - `suggest_next_topic`: Recommends personalized learning path
- **Tool implementations**: Each tool calls Ollama or manipulates progress store
- **Gemma model selection**: 
  - `gemma4:e4b` (FULL_MODEL) for quality answers
  - `gemma4:e2b` (FAST_MODEL) for structured tasks (quiz, planning, suggestions)

#### 2. **Progress Store** (`agent/progressStore.js`)
- Persistent JSON-based database (`data/progress.json`)
- Tracks per-topic: study count, avg quiz score, last studied date
- Exports: `saveProgress(topic, level, quizScore)`, `getProgressSummary()`
- Summary includes:
  - `topics`: array of studied topics with scores
  - `weakAreas`: topics with score < 60%
  - `strongAreas`: topics with score ≥ 80%
  - `totalTopicsStudied`: count of unique topics

#### 3. **Chat API** (`server.js`)
- POST `/api/chat` endpoint accepts:
  ```json
  { "message": "student prompt", "stream": true/false }
  ```
- Orchestrates flow:
  1. Routes to Claude (via Anthropic SDK) as the main conversationalist
  2. Claude sees tool definitions and decides which tools to call
  3. Agent backend calls Ollama for explanations/quizzes, manipulates progress store
  4. Claude synthesizes results into student-friendly response
  5. Response streamed back with `data: {...}\n\n` format

#### 4. **React Web UI** (`/frontend`)
- Built with TypeScript + Vite (hot reload)
- Key pages:
  - **Chat**: `/` - Main conversational interface with message streaming
  - **Progress**: `/progress` - Shows study stats, weak/strong areas, topic history
  - **Settings**: `/settings` - Model selection, debug logging, reset options
- Real-time message rendering with streaming support
- Progress visualization with charts

## Recent Implementation (This Session)

### ✅ Completed
1. **Gemma 4 Model Integration**
   - Swapped Ollama from `mistral:latest` → `gemma4:e4b`
   - Optimized `explain_topic` and `generate_quiz` for Gemma's output format
   - Tool definitions now work seamlessly

2. **Model Routing Strategy**
   - Defined `FAST_MODEL` (gemma4:e2b) for planning/quiz/synthesis
   - Defined `FULL_MODEL` (gemma4:e4b) for chat/image analysis
   - Ready to implement conditional routing in `server.js`

3. **Progress Store Refinement**
   - Fixed JSON parsing in `track_progress` tool
   - Integrated progress summary into `suggest_next_topic` for smarter recommendations
   - Weak/strong area detection working

4. **Tool System Documentation**
   - Added comprehensive header comments in `tools.js`
   - Clarified when each tool is called (e.g., explain_topic ALWAYS first for learning)
   - Documented expected JSON structures for robustness

### 📋 In Progress / Next Steps

1. **Model Routing in server.js** (RECOMMENDED NEXT)
   - Detect tool call requests and route to FAST_MODEL
   - Use FULL_MODEL only for final synthesis/response
   - Add `modelUsed` to response metadata

2. **Error Recovery**
   - Add timeout handling for Ollama calls
   - Implement fallback responses if Ollama unavailable
   - Add retry logic for flaky network

3. **Advanced Features** (Lower priority)
   - Image analysis via Claude's vision API
   - Custom curriculum builder
   - Spaced repetition algorithm
   - Collaborative study sessions

4. **Performance Tuning**
   - Cache Gemma explanations by topic/level
   - Batch quiz generation requests
   - Optimize progress store reads

## File Structure

```
studybuddy/
├── agent/
│   ├── tools.js                 # Tool definitions & implementations
│   └── progressStore.js         # Persistent progress tracking
├── data/
│   └── progress.json           # Student progress database
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main router
│   │   ├── pages/
│   │   │   ├── Chat.tsx         # Conversational interface
│   │   │   ├── Progress.tsx     # Stats & analytics
│   │   │   └── Settings.tsx     # Configuration
│   │   └── components/
│   │       ├── Message.tsx      # Chat message rendering
│   │       └── StreamingText.tsx # Real-time text streaming
│   ├── package.json
│   └── vite.config.ts
├── server.js                    # Express API & orchestration
├── package.json                 # Root dependencies
└── PROGRESS_SUMMARY.md          # THIS FILE
```

## How the Learning Flow Works

```
Student Input
    ↓
[Claude API] → Decides to call tool
    ↓
[Agent Tools] → Call Ollama (explain/quiz) or save progress
    ↓
[Ollama Gemma 4] → Generates explanation or quiz JSON
    ↓
[Progress Store] → Saves study record, computes stats
    ↓
[Claude API] → Synthesizes response to student
    ↓
Student sees natural, conversational response with context
```

## Key Design Decisions

1. **Gemma 4 via Ollama** for cost efficiency and local control
2. **Claude for orchestration** because it's better at:
   - Understanding student intent
   - Deciding which tool to call
   - Multi-turn conversational memory
   - Synthesizing LLM + database results

3. **Tool system** enforces structure:
   - Explanations always have intro/steps/answer format
   - Quizzes always have 4 options and clear answers
   - Progress always tracked in consistent format

4. **JSON-first responses** from LLMs to avoid parsing ambiguity

5. **Persistent progress store** enables:
   - Weak area identification
   - Personalized suggestions
   - Long-term learning analytics

## Testing & Validation

### To Test Locally
```bash
# Start Ollama with Gemma 4
ollama run gemma4:e4b

# Install and run StudyBuddy
npm install
npm start

# Open browser to http://localhost:5173
# Chat tab: Ask "Explain photosynthesis"
# Progress tab: See tracked studies
```

### Expected Behavior
- **Chat**: Natural responses with structured learning
- **Progress**: After quiz, weak areas auto-update
- **Suggestions**: Next topic based on performance

## Known Limitations & Future Work

| Issue | Impact | Solution |
|-------|--------|----------|
| No image upload yet | Can't analyze diagrams | Add Claude Vision API support |
| Linear curriculum | Limited personalization | Implement spaced repetition |
| Ollama dependency | Must run locally | Consider cloud API fallback |
| No multi-user support | Single student only | Add auth & user management |
| Basic quiz format | Limited assessment types | Add open-ended, fill-blank questions |

## Debugging Tips

1. **Ollama not responding**: Check `http://localhost:11434/api/chat` is accessible
2. **Tool not called**: Review Claude's message for tool_use block
3. **Progress not saved**: Verify `data/progress.json` is writable
4. **Quiz generation failing**: Check Gemma 4 JSON output format
5. **Frontend not updating**: Check React dev console for errors

## Contact & Support
For questions about this implementation, refer to the inline code comments in:
- `server.js` - API orchestration logic
- `agent/tools.js` - Tool definitions and calling conventions
- `frontend/src/pages/Chat.tsx` - Streaming message rendering

---
**Last Updated**: January 2025  
**Project Status**: Alpha (Active Development)  
**Next Session Recommendation**: Implement model routing in `server.js` for performance
