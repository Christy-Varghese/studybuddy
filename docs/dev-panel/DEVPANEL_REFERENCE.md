# Dev Panel Quick Reference Card

## Start Using It

```bash
npm run dev
```

Then visit http://localhost:3000 and look for the dark tab in the top-right corner.

---

## Visual Reference

### Collapsed State
```
┌─────────────────────┐
│ DEV | 1250ms | ▼    │  ← Click to expand
└─────────────────────┘
```

### Expanded State
```
┌──────────────────────────────────┐
│ ● StudyBuddy benchmark   DEV  ✕  │
├──────────────────────────────────┤
│ 1250ms │ 5 │ 23 │ 0              │
│ last   cache requests errors     │
├──────────────────────────────────┤
│ routes — last 60s                │
│ /chat        ████░░░  1250ms     │
│ /quiz        ██░░░░░  850ms ✦    │
│ /agent       ███░░░░  1400ms     │
├──────────────────────────────────┤
│ tool breakdown — last agent      │
│ explain_topic ███░░░ 2150ms      │
│ generate_quiz ██░░░░  1400ms     │
├──────────────────────────────────┤
│ uptime 2m 30s     15:42:33       │
│        run now | clear | ▲ hide  │
└──────────────────────────────────┘
```

---

## Colors Explained

| Color  | Speed      | Range   |
|--------|-----------|---------|
| 🟢 Green | Very fast | <500ms  |
| 🟡 Amber | Moderate  | 500ms–8s|
| 🔴 Red   | Slow      | >8s     |

---

## Status Dot

- 🟢 **Green** = System is healthy (no errors)
- 🔴 **Red** = At least one error occurred

---

## Tabs

The Dev Panel has two main tabs:

### Metrics Tab
Shows real-time performance counters: request latency, cache hit rates, error counts, per-route timing bars, and tool breakdown for agent requests.

### Flow Tab
Shows **flow traces** for every API request. Each trace displays:
- An ASCII architecture diagram of the request pipeline
- A per-step timeline with millisecond precision
- **Bottleneck detection** — the slowest step is highlighted
- Success/failure status for each step

Example flow for `/chat`:
```
[Client] → [Taxonomy] → [Cache] → [Ollama] → [Parse JSON] → [Response]

  ┌─ taxonomy-resolve ────── 2ms    ✓
  ├─ cache-check ─────────── 1ms    ✓
  ├─ ollama-generate ─────── 45230ms ⚠ bottleneck
  ├─ parse-structured-json ─ 3ms    ✓
  └─ total ──────────────── 45236ms
```

Access flow traces programmatically: `GET /dev/flow-traces`

---

## Keyboard Shortcut

**Ctrl+Shift+B** — Toggle panel open/closed

Works from anywhere on the page, even in text fields.

---

## Panel Buttons

| Button | Does |
|--------|------|
| **run now** | Fetch metrics immediately (no waiting) |
| **clear** | Reset all metrics to zero |
| **▲ hide** | Collapse the panel |
| **✕** | Close the panel |

---

## What Each Metric Means

### Summary Row
- **last req** — Most recent request time
- **cache hits** — Responses served from cache
- **requests** — Total API calls in last 60s
- **errors** — HTTP errors (4xx, 5xx)

### Route Metrics
- **Route name** — The endpoint path (e.g., /chat)
- **Visual bar** — Length = time (longer = slower)
- **Milliseconds** — Last response time for that route
- **✦ Badge** — Indicates cache hits for this route

**Hover for more:** Avg time, min/max, call count

### Tool Breakdown
- **Tool name** — Which tool ran (explain_topic, etc.)
- **Milliseconds** — How long Ollama took
- **✦ Badge** — Tool result was cached

---

## Understanding the Data

### Example 1: Fast Response
```
/chat        ████░░░░░░  250ms  ✓ Good
              ▲ Short bar = fast
```

### Example 2: Cached Response
```
/quiz        ░░░░░░░░░░  5ms ✦  ✓ Cached!
              ▲ Tiny bar = served from cache
```

### Example 3: Slow Response
```
/agent       ███████░░░░  8500ms  ⚠ Consider optimization
              ▲ Long bar = slow
```

---

## Common Scenarios

### Just Started Dev Server
- All metrics show zero
- Panel says "0 requests"
- This is normal!

### After First Chat
- `/chat` row appears
- Shows milliseconds for that request
- Tab updates with the time

### After Running Agent
- `/agent` row appears
- **Tool breakdown section appears** below routes
- Shows timing for each tool

### Asking Same Question Twice
- Second request is much faster (~5ms)
- Gets ✦ cache hit badge
- Demonstrates caching in action

---

## Persistence

Your choice to keep the panel open/closed is saved automatically.

**To reset:** Open DevTools console and run:
```javascript
localStorage.removeItem('sb_devpanel_open');
```

---

## Performance Notes

### When Expanded
- Fetches new metrics every 2 seconds
- Adds ~50-100ms network per fetch
- Full metrics payload downloaded

### When Collapsed
- Updates only the time display
- Minimal network activity
- Best for long sessions

### Production Mode
- Panel is completely invisible
- Zero performance cost
- No impact on students

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Panel doesn't appear | Verify `npm run dev` (not `npm start`) |
| Shows "Loading..." | Wait 2 seconds or click "run now" |
| All metrics are zero | Normal on fresh start, use the app |
| Data resets | Server restarted (expected) |
| Metrics not updating | Check that panel is expanded |

---

## Tips for Power Users

1. **Watch cache performance** — Compare first vs second request times
2. **Monitor errors** — Red dot indicates problems
3. **Spot bottlenecks** — Long bars show slow routes
4. **Clear & test** — Use "clear" to reset and measure specific actions
5. **Keep collapsed** — Less screen clutter when not debugging

---

## What's NOT Tracked

For student privacy, the panel does NOT collect:
- Student answers or responses
- Chat conversation content
- Personal information
- File contents
- Passwords or secrets
- Any sensitive data

**Only timing and route data are tracked.**

---

## For Production Deployment

Run `npm start` instead of `npm run dev`:
- Panel disappears immediately
- All metrics disabled
- No student sees the panel
- Zero overhead added

---

## Need Help?

See the detailed guides:
- **DEVPANEL_QUICKSTART.md** — Full user guide
- **DEVPANEL_IMPLEMENTATION.md** — Technical details
- **CHANGES.md** — What was modified

---

**Happy debugging! 🎉**
