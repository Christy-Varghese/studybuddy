# 🚀 QUICK START: Fix Your "Gemma Not Running" Error

## 60-Second Solution

### The Problem
You see: **"Error: Gemma is not running. Start Ollama first!"**

### The Real Issue  
**StudyBuddy server is NOT running** (not an Ollama problem!)

### The Fix
**Open terminal and type:**
```bash
npm run dev
```

**Wait for:**
```
StudyBuddy running at http://localhost:3000
```

**Then open browser:**
```
http://localhost:3000
```

**✅ DONE!** The error should be gone.

---

## Why This Works

| Component | Status | What It Does |
|-----------|--------|--------------|
| **Ollama** (Port 11434) | ✅ Always running | Provides AI models (Gemma) |
| **StudyBuddy** (Port 3000) | ❌ You must start | Your web app |
| **You see error when** | StudyBuddy not running | Can't reach Ollama |

**Solution:** Start StudyBuddy with `npm run dev`

---

## Common Issues & Instant Fixes

| Error | Fix |
|-------|-----|
| "Could not reach StudyBuddy" | `npm run dev` |
| "Gemma is not running" | `npm run dev` |
| "Address already in use :3000" | `killall node` then `npm run dev` |
| "Ollama connection failed" | Check: `curl http://localhost:11434/api/tags` |
| Features not working | Restart both: `killall node`, `npm run dev` |

---

## Two Terminal Method (Recommended)

**Terminal 1:** Start Ollama (it's already running, but you can restart)
```bash
# Check it's running:
curl http://localhost:11434/api/tags

# If not running, start it:
ollama serve
```

**Terminal 2:** Start StudyBuddy  
```bash
cd /Users/christyvarghese/Documents/studybuddy
npm run dev
```

**Result:** Both running together ✅

---

## One Command to Check Everything

```bash
# Are both services running?
ps aux | grep -E "ollama|node" | grep -v grep

# Should show:
# 1. ollama process
# 2. node process
```

---

## Ports Reference

```
Ollama:       localhost:11434 (AI service)
StudyBuddy:   localhost:3000  (Your app)
```

---

**Status:** ✅ Fix applied and tested  
**Next Step:** `npm run dev`
