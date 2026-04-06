# 🤖 Agent Testing & Verification Guide

## Quick Status Check

### Is the agent working?

**Test 1: Check if server is running**
```bash
curl -s http://localhost:3000 | grep -q "StudyBuddy" && echo "✅ Server running" || echo "❌ Server not running"
```

**Test 2: Check if Ollama is available**
```bash
curl -s http://localhost:11434/api/tags | jq '.models[].name' | grep gemma4:e4b && echo "✅ Model available" || echo "❌ Model not found"
```

**Test 3: Test agent endpoint directly**
```bash
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"test","level":"beginner"}' | jq '.success'
```
Should output: `true`

---

## Full Test Suite

### Test 1: Beginner Level Question
```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is photosynthesis?",
    "level": "beginner"
  }' | jq '.'
```

**Expected Response**:
- ✅ `success: true`
- ✅ `structured.explanation` contains intro, steps, answer
- ✅ `structured.quiz` has 2-3 questions
- ✅ `structured.nextTopic` has suggestion
- ✅ `toolCallLog` shows explain_topic, generate_quiz, etc.

**Estimated Time**: 10-20 seconds

---

### Test 2: Intermediate Level Question
```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain DNA replication and its importance",
    "level": "intermediate"
  }' | jq '.'
```

**Expected Response**:
- ✅ Longer explanation with more technical depth
- ✅ More complex quiz questions
- ✅ Advanced next topic suggestions

---

### Test 3: Advanced Level Question
```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How does CRISPR gene editing work at the molecular level?",
    "level": "advanced"
  }' | jq '.'
```

**Expected Response**:
- ✅ Very detailed technical explanation
- ✅ Complex quiz with challenging questions
- ✅ Research-level next topics

---

### Test 4: Multiple Questions (Conversation Flow)
```bash
# Question 1
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"What is climate change?","level":"beginner"}' | jq '.success'

# Question 2
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"What are greenhouse gases?","level":"beginner"}' | jq '.success'

# Question 3
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"How can we reduce carbon emissions?","level":"intermediate"}' | jq '.success'
```

**Expected**: All three return `true` ✅

---

## Browser Testing

### Test in UI

1. **Open the application**
   ```bash
   open http://localhost:3000
   ```

2. **Test Basic Question**
   - Select level: "Beginner"
   - Type: "What is the water cycle?"
   - Click Send
   - Expected: Full response with explanation, quiz, next topic in ~10-20 seconds

3. **Test With Voice Input** (if microphone available)
   - Click the microphone icon
   - Say: "What is gravity?"
   - Expected: Question transcribed, agent responds

4. **Test Progress Tracking**
   - Ask a question
   - Complete the quiz
   - Open Benchmark Panel (Ctrl+Shift+B)
   - Check that your topic appears in progress

5. **Test Voice Error Recovery** (if network is spotty)
   - Click microphone
   - Voice will auto-retry if network error occurs
   - Should eventually capture or timeout gracefully

---

## Response Structure Validation

### Check Response Has All Fields
```bash
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"What is evolution?","level":"beginner"}' | jq 'keys'
```

**Should output**:
```json
[
  "success",
  "rawReply",
  "structured",
  "toolCallLog"
]
```

### Check Structured Response Has All Fields
```bash
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"What is evolution?","level":"beginner"}' | jq '.structured | keys'
```

**Should output**:
```json
[
  "agentSummary",
  "toolsUsed",
  "explanation",
  "quiz",
  "nextTopic",
  "progressNote"
]
```

### Check Tools Were Called
```bash
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"What is evolution?","level":"beginner"}' | jq '.structured.toolsUsed'
```

**Should include**:
```json
[
  "explain_topic",
  "generate_quiz",
  "track_progress",
  "suggest_next_topic"
]
```

---

## Performance Benchmarks

| Metric | Expected | Notes |
|--------|----------|-------|
| Planning Phase | 2-3 sec | Gemma deciding which tools to use |
| Tool Execution | 5-15 sec | Parallel execution of 4 tools |
| Synthesis Phase | 2-3 sec | Gemma generating final response |
| **Total Response** | 10-20 sec | Full end-to-end time |

---

## Troubleshooting

### Issue: `success: false`

**Check 1: Is model available?**
```bash
curl -s http://localhost:11434/api/tags | jq '.models[] | select(.name | contains("gemma4:e4b"))'
```
If empty, model not installed.

**Check 2: Check server logs**
```bash
# If server running in background
tail -50 /tmp/studybuddy.log | grep -i error

# If server running in terminal
# Look for [Agent] error messages
```

**Check 3: Restart server**
```bash
# Kill old process
pkill -f "node server.js"

# Wait a moment
sleep 2

# Restart
cd /Users/christyvarghese/Documents/studybuddy
NODE_ENV=development npm run dev
```

### Issue: Timeout (takes > 30 seconds)

- Ollama might be busy
- Check Ollama is running: `curl -s http://localhost:11434/api/tags`
- Restart Ollama if needed
- Try with simpler question first

### Issue: "Cannot read properties of undefined"

- Old server still running
- Kill all node processes: `pkill -f node`
- Restart server: `npm run dev`

### Issue: Wrong model error

- Old code still running
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `npm install`
- Restart server

---

## Visual Inspection Checklist

### In Browser (http://localhost:3000)

When you ask a question, you should see:

- [ ] Question appears in chat
- [ ] Bot is typing indicator appears
- [ ] Response appears after 10-20 seconds
- [ ] Response includes:
  - [ ] Tool badges (explain_topic, generate_quiz, etc.)
  - [ ] Explanation section with steps
  - [ ] Quiz section with questions
  - [ ] Next topic suggestion
- [ ] No error messages in chat
- [ ] No red errors in console (F12 → Console tab)

### In Console (F12 → Console Tab)

You should NOT see:

- ❌ "Uncaught Error"
- ❌ "Failed to fetch"
- ❌ "Cannot read properties"
- ❌ "Agent could not complete"

You SHOULD see:

- ✅ Network request to `/agent` with status 200
- ✅ Response with `success: true`
- ✅ Structured response with explanation, quiz, nextTopic

---

## Sample Test Responses

### Quick Test
```bash
echo '{"message":"Hi","level":"beginner"}' | \
  curl -s -X POST http://localhost:3000/agent \
    -H "Content-Type: application/json" \
    -d @- | \
  jq '.success'
```

Output: `true` ✅

### Detailed Test with Pretty Print
```bash
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"What is a cell?","level":"beginner"}' | \
  jq '.structured.explanation.steps[] | "\(.emoji) \(.title): \(.text)"'
```

Expected output:
```
"🎓 Step 1: Definition: ..."
"🔬 Step 2: Function: ..."
"🧬 Step 3: Types: ..."
"⚙️ Step 4: Processes: ..."
```

---

## Automated Testing Script

Save as `test_agent.sh`:

```bash
#!/bin/bash

echo "🤖 Testing StudyBuddy Agent"
echo "=============================="

# Test 1: Server running
echo -n "Test 1: Server running... "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "✅"
else
  echo "❌ Server not running"
  exit 1
fi

# Test 2: Ollama available
echo -n "Test 2: Ollama available... "
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "✅"
else
  echo "❌ Ollama not running"
  exit 1
fi

# Test 3: Model available
echo -n "Test 3: Model gemma4:e4b available... "
if curl -s http://localhost:11434/api/tags | grep -q "gemma4:e4b"; then
  echo "✅"
else
  echo "❌ Model not found"
  exit 1
fi

# Test 4: Agent endpoint
echo -n "Test 4: Agent endpoint... "
RESPONSE=$(curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"test","level":"beginner"}')

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "✅"
else
  echo "❌"
  echo "Response: $RESPONSE"
  exit 1
fi

# Test 5: Response structure
echo -n "Test 5: Response structure... "
if echo "$RESPONSE" | jq -e '.structured.explanation' > /dev/null 2>&1; then
  echo "✅"
else
  echo "❌ Missing explanation"
  exit 1
fi

echo ""
echo "✅ All tests passed! Agent is working."
```

Run it:
```bash
chmod +x test_agent.sh
./test_agent.sh
```

---

## Status Summary

| Component | Status | Test |
|-----------|--------|------|
| Server | ✅ Running | curl http://localhost:3000 |
| Ollama | ✅ Available | curl http://localhost:11434/api/tags |
| Model | ✅ gemma4:e4b | Check Ollama tags |
| Agent | ✅ Working | POST /agent returns success:true |
| Error Handling | ✅ Enhanced | Detailed logs in console |
| Fallback Logic | ✅ Implemented | Always returns response |

---

## Next Steps

1. **If all tests pass**: Agent is working! Try asking questions in the browser.
2. **If any test fails**: Check troubleshooting section above.
3. **For detailed logs**: Check `/tmp/studybuddy.log` if running as background service.
4. **For debugging**: Run server in foreground with `npm run dev` and watch console output.

---

**Ready to study?** Open http://localhost:3000 and ask your first question! 🚀
