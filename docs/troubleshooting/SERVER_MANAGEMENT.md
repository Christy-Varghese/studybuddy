# 🚀 StudyBuddy Server Management Guide

## Current Status: ✅ RUNNING

Your StudyBuddy server is now **actively running** at:
```
http://localhost:3000
```

### Verification
```bash
# Check if server is running:
curl http://localhost:3000

# Check what's on port 3000:
lsof -i :3000

# Check Ollama is running:
curl http://localhost:11434/api/tags
```

---

## 🎯 Quick Commands

### Start the Server
```bash
npm run dev
```

### Stop the Server
```bash
# Option 1: Press Ctrl+C in the terminal
Ctrl+C

# Option 2: Kill from another terminal
killall node

# Option 3: Kill by process ID
kill -9 <PID>
```

### Check Server Status
```bash
# Is port 3000 active?
lsof -i :3000

# Is it responding?
curl http://localhost:3000
```

### View Server Logs
```bash
# Real-time logs (if started with: npm run dev)
# Just watch the terminal

# View background logs:
cat server.log

# Follow background logs:
tail -f server.log
```

---

## 🔧 Troubleshooting

### Problem: "Could not reach StudyBuddy"

**Solution 1: Start the server**
```bash
npm run dev
```

**Solution 2: Server already running on another terminal?**
```bash
# Kill all Node processes
killall node

# Wait 2 seconds
sleep 2

# Restart
npm run dev
```

**Solution 3: Port 3000 in use by another app?**
```bash
# Check what's on port 3000
lsof -i :3000

# If it's not Node, kill it
kill -9 <PID>

# Then restart StudyBuddy
npm run dev
```

**Solution 4: Check dependencies**
```bash
# Reinstall all packages
npm install

# Try again
npm run dev
```

### Problem: Server starts but doesn't respond

**Check Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

If not running, start Ollama in a separate terminal:
```bash
ollama serve
```

### Problem: Server crashes immediately

**Check for errors:**
```bash
# Run and watch for error messages
npm run dev
```

**Common causes:**
- Ollama not running → Start it: `ollama serve`
- Port 3000 already in use → Kill it: `lsof -i :3000 | kill -9`
- Node modules missing → Run: `npm install`

---

## 📋 Process Management

### Running Server in Foreground (Recommended for Development)
```bash
npm run dev
```

**Pros:**
- See all logs in real-time
- Easy to stop (Ctrl+C)
- Easy to debug

**Cons:**
- Blocks your terminal

### Running Server in Background
```bash
# Start in background
nohup npm run dev > server.log 2>&1 &

# View logs
tail -f server.log

# Stop
killall node
```

**Pros:**
- Frees up your terminal
- Can open other terminals

**Cons:**
- Harder to see logs
- Must use `kill` to stop

### Running Server in Separate Terminal Tab
**Best option:**
1. Open 2 terminal tabs
2. Tab 1: `npm run dev` (server)
3. Tab 2: Use for other commands
4. Switch between tabs as needed

---

## 🎯 Typical Workflow

### Start of Day
```bash
# Terminal 1:
npm run dev

# Expected output:
✓ StudyBuddy running at http://localhost:3000
✓ [warmup] gemma4:e4b loaded into RAM
```

### During Development
```bash
# Terminal 2 (use for commands):
cd /Users/christyvarghese/Documents/studybuddy
git status
npm test
# etc
```

### End of Day
```bash
# Stop the server:
Ctrl+C (in Terminal 1)

# Or from Terminal 2:
killall node
```

---

## 📊 Health Checks

### Full Diagnostic
```bash
#!/bin/bash
echo "=== StudyBuddy Diagnostics ==="

# Check Node.js
node --version

# Check npm
npm --version

# Check if server port is open
echo "Port 3000:"
lsof -i :3000 || echo "  Not in use"

# Check Ollama
echo "Ollama:"
curl -s http://localhost:11434/api/tags | head -5 || echo "  Not running"

# Check dependencies
echo "Dependencies:"
ls node_modules | wc -l

echo "=== End Diagnostics ==="
```

---

## 🆘 Common Issues & Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| "Could not reach StudyBuddy" | `lsof -i :3000` | `npm run dev` |
| Port 3000 already in use | `lsof -i :3000` | `killall node` |
| Server crashes on start | `npm run dev` (watch error) | Check Ollama, install deps |
| Slow responses | Browser DevTools timing | Restart server, check Ollama |
| Images not showing | Browser console errors | See IMAGE_UPLOAD_FIX.md |
| "Gemma is not running" | `curl localhost:11434/api/tags` | Start Ollama: `ollama serve` |

---

## 🔗 Related Documentation

For specific features:
- **Image Upload Issues** → `IMAGE_UPLOAD_FIX.md`
- **Troubleshooting** → `TROUBLESHOOTING_IMAGE.md`
- **Phase 8 Taxonomy** → `PHASE8_SUMMARY.md`
- **Caching System** → `CACHING.md`

---

## ✅ Next Steps

1. **Server is running** ✅
2. **Open browser:** http://localhost:3000
3. **Test features:**
   - Ask a text question
   - Upload an image
   - Generate a quiz
4. **If something fails:**
   - Check `TROUBLESHOOTING_IMAGE.md`
   - Check browser console (DevTools)
   - Check server logs (terminal)

---

**Version:** 1.0  
**Date:** April 6, 2026  
**Status:** ✅ Server Running
