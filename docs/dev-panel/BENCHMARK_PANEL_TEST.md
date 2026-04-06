# 🎯 Quick Test: Benchmark Panel Visibility

## 30-Second Test

Follow these steps to verify the benchmark panel is now visible:

### Step 1: Refresh Browser
```
Open: http://localhost:3000
Press: Ctrl+R (refresh)
```

### Step 2: Open Panel with Keyboard Shortcut
```
Press: Ctrl+Shift+B
```

### Step 3: Look for the DEV Tab
In the **top-right corner**, you should see:
```
┌─────────────────────┐
│ ● DEV  —  ▼         │  ← Click here or use Ctrl+Shift+B
└─────────────────────┘
```

### Step 4: Expand the Panel
Click the DEV tab (or press Ctrl+Shift+B again).

The panel should expand to show:
```
┌─────────────────────────────────────┐
│ ● StudyBuddy benchmark      [DEV] ✕ │
├─────────────────────────────────────┤
│                                     │
│  /agent         512ms (avg)         │
│  /upload        128ms (avg)         │
│  /                  12ms (avg)      │
│                                     │
├─────────────────────────────────────┤
│ auto-refresh 2s  run now  clear hide│
└─────────────────────────────────────┘
```

## What to Check

✅ **Tab Appears** (top-right corner)
- Should show "DEV" label
- Should have a colored dot
- Should show last request time

✅ **Panel Expands** (when clicked or Ctrl+Shift+B)
- Should show full metrics list
- Should list routes like `/agent`, `/upload`, etc.
- Should show response times in ms

✅ **Metrics Update** (auto-refresh)
- Metrics update every 2 seconds
- Times change as you interact with the site
- Click "run now" to force update

✅ **Controls Work**
- Click "run now" → metrics refresh immediately
- Click "clear" → metrics list clears
- Click "hide" → panel collapses
- Press Ctrl+Shift+B → panel toggles

## If Panel Doesn't Appear

### Check 1: Is Server Running in Dev Mode?
```bash
ps aux | grep "node server"
```

Should show:
```
NODE_ENV=development ... node server.js
```

If NOT, restart with:
```bash
npm run dev
```

### Check 2: Refresh the Page
```
Ctrl+R (or Cmd+R on Mac)
```

Then wait 2 seconds and try Ctrl+Shift+B again.

### Check 3: Check Browser Console
Press F12 and look at the Console tab.

Look for these messages:
- ✅ Should see: `devpanel.js` loading
- ❌ Should NOT see: red error messages

### Check 4: Test the Metrics Endpoint
In terminal:
```bash
curl http://localhost:3000/dev/metrics | head -20
```

Should return JSON like:
```json
{
  "uptime": 1234,
  "totalRequests": 45,
  "totalErrors": 0,
  "lastRequestMs": 152,
  "routes": [...],
  "timestamp": 1775489668849
}
```

If it returns "404 Not found", the server is in production mode.

## Success Indicators

You know it's working when:

| Indicator | Status |
|-----------|--------|
| DEV tab visible in top-right | ✅ |
| Ctrl+Shift+B toggles panel | ✅ |
| Routes show in metrics list | ✅ |
| Response times shown | ✅ |
| Auto-refresh every 2s | ✅ |
| "run now" refreshes | ✅ |
| "clear" clears metrics | ✅ |
| Panel colors change (green/amber/red) | ✅ |

## Make Some Requests

To see metrics populate:

1. **Chat with the agent**
   - Type a question
   - Press Send
   - Watch `/agent` route appear in metrics

2. **Upload an image**
   - Click upload button
   - Select an image
   - Watch `/upload` route appear in metrics

3. **Interact with the UI**
   - Click buttons
   - Change theme
   - Watch various routes collect metrics

## Expected Times

Typical response times you should see:

- `/` (home page) - **5-15ms**
- `/agent` (API calls) - **500ms-8000ms** (depends on Ollama)
- `/upload` (file upload) - **100-500ms** (depends on file size)
- `/dev/metrics` - **2-5ms** (very fast, just reads memory)

## Performance Notes

- Metrics collection **has zero impact** on performance
- Dev panel is **invisible to production**
- In-memory storage is **efficient** (200 entry circular buffer)
- Auto-refresh **only active when expanded**

---

## Final Test Command

Run this to verify everything:

```bash
# 1. Stop server
pkill -f "node server.js"

# 2. Start in dev mode
npm run dev

# 3. In another terminal, test endpoint
sleep 3 && curl -s http://localhost:3000/dev/metrics | jq '.routes | length'

# Should output a number (count of routes)
```

---

**The benchmark panel should now be visible and working!** 🎉

Open http://localhost:3000 and press Ctrl+Shift+B to see it.
