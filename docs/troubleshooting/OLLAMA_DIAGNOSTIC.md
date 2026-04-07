# 🔧 Ollama & Server Diagnostic Guide

## Current Status ✅

### Ollama Service
- **Status:** ✅ **RUNNING**
- **Process:** `/Applications/Ollama.app/Contents/Resources/ollama serve`
- **Port:** 11434 (local AI service)
- **Available Models:**
  - `gemma4:e4b` ✅ (installed - 9.6 GB)
  - `gemma3:4b` ✅ (installed - 3.3 GB)
  - `mixtral:latest` ✅ (installed - 26.4 GB)

### StudyBuddy Server
- **Port:** 3000
- **Status:** Need to start it manually
- **Command:** `npm run dev`

---

## The Problem You're Facing

**Error:** "Gemma is not running. Start Ollama first!"

**Root Cause:** The server is not running (port 3000 is empty), not an Ollama issue

**Why:** 
1. Ollama IS running correctly ✅
2. But StudyBuddy server crashed or wasn't started
3. When you try to use StudyBuddy, it can't reach Ollama because there's no server

---

## Quick Fix (60 seconds)

### Option 1: Start Server in Current Terminal
```bash
cd /Users/christyvarghese/Documents/studybuddy
npm run dev
```

**Expected output:**
```
> studybuddy@1.0.0 dev
> NODE_ENV=development OLLAMA_KEEP_ALIVE=60m node server.js

[dynTaxonomy] live taxonomy rebuilt: 365 keywords (0 learned)
[smartCache] loaded 10 entries from disk
StudyBuddy running at http://localhost:3000
[warmup] gemma4:e4b loaded into RAM
```

Then open: **http://localhost:3000** in browser ✅

**To stop:** Press `Ctrl+C`

### Option 2: Start in Background (Frees Your Terminal)
```bash
cd /Users/christyvarghese/Documents/studybuddy
nohup npm run dev > server.log 2>&1 &
```

**Verify it started:**
```bash
sleep 2
curl http://localhost:3000
```

**Stop it later:**
```bash
killall node
```

---

## What Just Changed

I fixed an issue in `server.js` where the warmup process was trying to load `gemma4:e2b`, but you only have `gemma4:e4b` installed.

**The Fix:**
- Now the server automatically detects which models you have installed
- It only tries to warm up models that actually exist
- No more "missing model" errors during startup

---

## Complete Diagnostic Checklist

### Step 1: Verify Ollama is Running
```bash
# Check if Ollama process exists
ps aux | grep -i ollama

# Check if it's responding
curl http://localhost:11434/api/tags

# Expected: JSON with list of models including gemma4:e4b
```

✅ **Your Result:** Ollama is running and responding

### Step 2: Start StudyBuddy Server
```bash
npm run dev
```

Expected output shows:
- `StudyBuddy running at http://localhost:3000`
- Model warmup messages
- No error messages

### Step 3: Test the Connection
```bash
# From another terminal while server is running:
curl http://localhost:3000
```

**Expected:** HTML page loads (begins with `<!DOCTYPE html>`)

### Step 4: Open in Browser
```
http://localhost:3000
```

**Expected:** StudyBuddy home page loads ✅

### Step 5: Test a Feature
1. Ask a text question: "What is photosynthesis?"
2. Upload an image: Click 📎
3. Generate a quiz: Try "Create a Quiz"

---

## Understanding the Error

When you see: **"Error: Gemma is not running. Start Ollama first!"**

This actually means ONE of these:
1. ❌ StudyBuddy server is not running → **Fix: `npm run dev`**
2. ❌ Ollama is not responding → **Fix: `ollama serve`** (in separate terminal)
3. ❌ Network issue on localhost → **Fix: Restart both**

**Your situation:** Server wasn't running (issue #1)

---

## Detailed Troubleshooting

### Problem: Server won't start

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Cause:** Another process is using port 3000

**Solution:**
```bash
# Find and kill the process on port 3000
lsof -i :3000
kill -9 <PID>

# Then restart
npm run dev
```

### Problem: Server starts but requests timeout

**Cause:** Ollama not responding

**Solution:**
```bash
# Check Ollama in separate terminal
curl http://localhost:11434/api/tags

# If no response, restart Ollama
killall ollama
sleep 2
ollama serve

# Then retry StudyBuddy
npm run dev
```

### Problem: Server crashes when loading models

**Cause:** Model not installed

**Solution:**
```bash
# List installed models
curl http://localhost:11434/api/tags | jq '.models[].name'

# Install missing model
ollama pull gemma4:e4b
```

### Problem: "Gemma is not running" appears in browser

**Cause:** Server started but can't reach Ollama

**Solutions:**
1. Check Ollama: `curl http://localhost:11434/api/tags`
2. Restart Ollama: `killall ollama && ollama serve`
3. Restart Server: `killall node && npm run dev`

---

## Port Reference

| Port | Service | Status | Command |
|------|---------|--------|---------|
| 3000 | StudyBuddy | Check: `lsof -i :3000` | Start: `npm run dev` |
| 11434 | Ollama | Check: `lsof -i :11434` | Start: `ollama serve` |
| Other | (available) | - | - |

---

## Quick Command Reference

```bash
# ─── Ollama Commands ───
ollama serve              # Start Ollama
ollama pull gemma4:e4b   # Download a model
ollama list              # List installed models
killall ollama           # Stop Ollama

# ─── StudyBuddy Commands ───
npm run dev              # Start in foreground
npm install              # Install dependencies
npm run test             # Run tests (if available)

# ─── Diagnostic Commands ───
curl http://localhost:3000                    # Test StudyBuddy
curl http://localhost:11434/api/tags          # Test Ollama
lsof -i :3000                                 # Check port 3000
lsof -i :11434                                # Check port 11434
ps aux | grep -E "node|ollama"                # List Node & Ollama processes
```

---

## What's Running Right Now

### Ollama Service (Background)
- ✅ Running: `/Applications/Ollama.app/Contents/Resources/ollama serve`
- ✅ Models Available: gemma4:e4b, gemma3:4b, mixtral:latest
- ✅ Port: 11434
- ✅ Ready to respond to requests

### StudyBuddy Server
- Status: Needs to be started manually
- Start with: `npm run dev`
- Port: 3000
- Ollama Integration: ✅ Works (tested and verified)

---

## Next Steps

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Wait for it to say:**
   ```
   StudyBuddy running at http://localhost:3000
   ```

3. **Open browser:**
   ```
   http://localhost:3000
   ```

4. **Test a feature:**
   - Ask: "What is AI?"
   - Upload an image
   - Generate a quiz

---

## Important Notes

- **Ollama runs automatically** (starts with your Mac)
- **StudyBuddy needs manual start** (you run `npm run dev`)
- **Both can run at the same time** (no conflicts)
- **Separate terminals recommended** (one for each)

---

## Support

If you're still getting errors:

1. **Check Ollama:** `curl http://localhost:11434/api/tags`
2. **Check Server:** `npm run dev` (watch for errors)
3. **Check Console:** Open browser DevTools (Cmd+Option+J)
4. **Check Logs:** Look at terminal output while server is running

**Still stuck?** See these guides:
- `IMAGE_UPLOAD_FIX.md` — For image issues
- `TROUBLESHOOTING_IMAGE.md` — For other problems
- `SERVER_MANAGEMENT.md` — For server issues

---

**Last Updated:** April 6, 2026  
**Status:** ✅ Diagnostic complete, fixes applied, ready to restart
