# 🔧 Image Upload Troubleshooting Guide

## Quick Diagnostics

### Problem 1: "No Output When Attaching Image"

**Symptoms:**
- Image uploads (shows in preview)
- Click Send
- Bot doesn't respond
- Chat stays empty

**Root Causes & Solutions:**

| Cause | Check | Fix |
|-------|-------|-----|
| Ollama not running | `ps aux \| grep ollama` | Run `ollama serve` |
| Wrong model | `curl http://localhost:11434/api/tags` | Should show `gemma4:e4b` |
| Network error | Browser DevTools → Network tab | Check response status |
| JSON parsing fails | Browser console | Check for `Unexpected token` |
| Image too large | Check file size | Keep under 10MB |
| Timeout | Check response time | May need to wait 5-10s |

### Problem 2: "Error Message Shown"

**Error:** `"Gemma is not running. Start Ollama first!"`
```bash
# Solution:
ollama serve
# Wait 30 seconds for model to load
```

**Error:** `"Failed to process image"`
```bash
# Check image format (must be JPG, PNG, or WebP)
file ~/Downloads/homework.png
# Should say: "image data"

# If corrupted, try another image
```

**Error:** `"Unable to process image"`
```bash
# Try refreshing the page:
Cmd+Shift+R (or Ctrl+Shift+R on Windows/Linux)
# Then try again
```

### Problem 3: "Image Shows But No Bot Response"

**Symptoms:**
- Image displays in chat ✓
- But bot response is blank/empty

**Solutions:**

1. **Wait longer for Gemma**
   - First image analysis takes 10-30 seconds
   - Server logs should show: `[gemma4:e4b] processing...`

2. **Check Gemma is loaded**
   ```bash
   # Look for these lines in server logs:
   [warmup] gemma4:e4b loaded into RAM
   ```

3. **Restart Ollama**
   ```bash
   # Kill process
   killall ollama
   
   # Wait 2 seconds
   sleep 2
   
   # Restart
   ollama serve
   ```

4. **Check browser console**
   - Open DevTools: `Cmd+Option+J` (Mac) or `Ctrl+Shift+J` (Windows)
   - Look for red errors
   - Screenshot and check troubleshooting table below

### Problem 4: "Response is Just Plain Text"

This is **normal behavior** and happens when:
- Gemma's response is slightly off-format
- Network latency affects JSON parsing

**It should still display** (just not as nicely formatted)

**To improve formatting:**
1. Restart server
2. Try with a different image
3. Try asking a clearer question

**To fix permanently:**
Edit `/server.js` line 347 and adjust the system prompt to be more explicit.

---

## Browser Console Errors & Fixes

### Error: `Unexpected token '<' in JSON at position 0`
**Cause:** Server returned HTML error page instead of JSON
```bash
# Check Ollama is running:
curl http://localhost:11434/api/tags
# Should return JSON, not HTML

# If not running:
ollama serve
```

### Error: `Cannot read properties of undefined (reading 'reply')`
**Cause:** Response was null/undefined
```javascript
// Verify in Network tab that response looks like:
{
  "reply": "...",
  "structured": { ... } or null
}

// If not, check server logs for errors
```

### Error: `TypeError: Failed to fetch`
**Cause:** Network connection issue
```bash
# Test connection:
curl http://localhost:3000
# Should return HTML

# Test Ollama:
curl http://localhost:11434/api/tags
# Should return JSON
```

### Error: `FileReader is not defined`
**Cause:** Very rare browser compatibility issue
```javascript
// Solution: Use latest Chrome, Firefox, Safari, or Edge
// (all support FileReader)
```

---

## Step-by-Step Debugging

### Step 1: Verify Setup
```bash
# Check Node.js running
npm run dev

# Expected output:
# ✓ StudyBuddy running at http://localhost:3000
# ✓ [warmup] gemma4:e4b loaded into RAM
# ✓ [smartCache] loaded X entries

# If errors, check server logs
```

### Step 2: Test in Browser
```
1. Go to http://localhost:3000
2. Open DevTools: Cmd+Option+J (Mac)
3. Click 📎 attachment button
4. Select any image
5. Type: "What is this?"
6. Click Send
7. Check:
   - Network tab → /chat-with-image request
   - Console → No red errors
   - Chat → Image shows + bot response
```

### Step 3: Check Network Request
```
1. DevTools → Network tab
2. Send image
3. Click /chat-with-image request
4. Check "Response" tab

Should show:
{
  "reply": "...",
  "structured": { ... }
}

If you see:
{
  "error": "..."
}
→ Check error message and troubleshoot above
```

### Step 4: Check Server Logs
```
In terminal running npm run dev, look for:

✅ Good output:
[chat-with-image] image received: 85 KB
[chat-with-image] calling gemma4:e4b...
[chat-with-image] response: {...JSON...}

❌ Bad output:
[chat-with-image] image error: ...
[WARN] Ollama connection failed
Error: timeout
```

---

## Performance Issues

### "Image takes too long (30+ seconds)"

**Is this normal?**
- First image in a session: **10-20s** normal (model loading)
- Subsequent images: **3-5s** normal
- Over 30s: May be slow

**Solutions:**
1. **Check system resources**
   - Memory: `free -h` (Linux) or Activity Monitor (Mac)
   - Disk: `df -h`
   - If low, close other apps

2. **Check Ollama logs**
   ```bash
   # If Ollama keeps unloading model:
   export OLLAMA_KEEP_ALIVE=60m
   ollama serve
   ```

3. **Use smaller model** (faster but less accurate)
   ```javascript
   // In server.js line 405, change:
   model: 'gemma4:e4b',    // Current
   model: 'gemma2:latest', // Faster alternative
   ```

4. **Increase timeout**
   ```javascript
   // In server.js line 351:
   // Currently: 8000ms (8 seconds)
   // Increase to: 15000ms (15 seconds)
   ```

---

## Testing Checklist

Use this to verify everything works:

```
□ Server starts:                npm run dev
□ Ollama running:              ollama serve (separate terminal)
□ Model loaded:                http://localhost:11434/api/tags
□ Frontend loads:              http://localhost:3000
□ Attach button works:         Click 📎, select file
□ Image preview shows:         Image appears below attachment button
□ Send works:                  Type message, click Send
□ Image in chat:               Image appears in chat bubble
□ Bot responds:                Response appears below image
□ Response formatted:          Steps show as numbered list
□ No console errors:           DevTools → Console (should be empty or green)
□ Network request OK:          DevTools → Network → /chat-with-image → 200
```

---

## Still Stuck? Try These

### Nuclear Option: Full Reset
```bash
# Stop server
Ctrl+C

# Stop Ollama
killall ollama

# Clear any temp files
rm -rf uploads/*

# Clean cache
rm -f data/smartcache.json

# Restart Ollama (wait 30 seconds)
ollama serve &

# Restart server
npm run dev

# Try again in browser (Cmd+Shift+R to hard refresh)
```

### Enable Debug Logging
```javascript
// In server.js, line 1, add:
process.env.DEBUG = 'studybuddy:*';

// This will show more detailed logs about what's happening
```

### Capture Exact Error
```javascript
// In browser DevTools Console:
// Copy entire response from /chat-with-image request:
{
  "reply": "...",
  "structured": ...
}

// And include in any bug report
```

---

## Common Scenarios

### Scenario: Multiple Images in Sequence
```
1st image:  Slow (20-30s) — Normal, model loading
2nd image:  Fast (3-5s) — Expected
3rd image:  Slow again? → Ollama may have unloaded

Fix: Set OLLAMA_KEEP_ALIVE=60m before starting
```

### Scenario: Working in Class with Students
```
Before class:
□ Start Ollama: ollama serve
□ Start server: npm run dev
□ Test in browser with sample image
□ Verify response is fast and formatted

During class:
□ First few students: Slower (loading)
□ Most students: 3-5 second response (good)
□ If timeout: Extend EXTRACT_TIMEOUT_MS in server.js
```

### Scenario: Low Disk Space
```
Problem: Image upload starts but never completes

Check disk:
df -h /

If less than 500MB free:
□ Clear uploads: rm -rf uploads/*
□ Clear browser cache
□ Clear temp files: rm -rf /tmp/*

Then try again
```

---

## Getting More Help

### Check Server Logs
```bash
# Run with verbose logging:
DEBUG=* npm run dev

# Look for [chat-with-image] entries
# They'll show exactly where it fails
```

### Check Network Trace
```
1. DevTools → Network
2. Send image with question
3. Find POST /chat-with-image
4. Click it
5. Check:
   - "Headers" tab: Shows request was sent correctly
   - "Response" tab: Shows server response
   - "Timing" tab: Shows how long it took (3-30s normal)
```

### Test Ollama Directly
```bash
# Test vision endpoint:
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma4:e4b",
    "messages": [{"role":"user","content":"Hello"}]
  }'

# Should return JSON with response
```

---

## Summary Decision Tree

```
Image doesn't show output?
│
├─ Ollama not running?
│  └─ Start: ollama serve
│
├─ Wrong model?
│  └─ Check: curl http://localhost:11434/api/tags
│     Install: ollama pull gemma4:e4b
│
├─ Network error?
│  └─ Check: DevTools → Network → /chat-with-image
│     Status should be 200
│
├─ JSON parse error?
│  └─ Check: Browser console for errors
│     Restart server: npm run dev
│
├─ Image too large?
│  └─ Keep under 10MB
│
└─ Still broken?
   └─ See "Getting More Help" section above
```

---

**Version:** 1.0  
**Last Updated:** April 6, 2026  
**Status:** ✅ All issues resolved in this fix
