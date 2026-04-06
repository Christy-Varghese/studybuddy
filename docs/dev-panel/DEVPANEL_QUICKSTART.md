# Dev Benchmark Panel - Quick Start Guide

## Starting the Dev Server

```bash
npm run dev
```

This sets `NODE_ENV=development` and starts the server with the benchmark panel enabled.

## Accessing the Panel

1. Open http://localhost:3000
2. Look for a small dark tab in the **top-right corner** of the page
3. It shows: `DEV | [response time] | ▼`

## Panel States

### Collapsed (Default)
- Shows only a tiny tab with last response time
- Updates every 2 seconds
- Minimal visual impact
- Click to expand

### Expanded
- Full 300px terminal-style metrics panel
- Shows comprehensive data:
  - Summary stats (last req, cache hits, requests, errors)
  - Route metrics with visual bars
  - Tool breakdown from last agent call
  - Uptime and current time
- Auto-refreshes every 2 seconds
- Click "hide" or press Ctrl+Shift+B to collapse

## Keyboard Shortcut

**Ctrl+Shift+B** — Toggles the panel open/closed from anywhere on the page

Works even when typing in text fields!

## Reading the Metrics

### Summary Row
| Label | Meaning |
|-------|---------|
| **last req** | Milliseconds for the most recent request |
| **cache hits** | Total number of cached responses in last 60s |
| **requests** | Total requests in last 60s |
| **errors** | HTTP errors (4xx, 5xx) in last 60s |

### Route Rows
```
/chat          ████░░░░░░  1250ms
```
- **Route name**: The endpoint path
- **Visual bar**: Length represents time (green = fast, amber = medium, red = slow)
- **Milliseconds**: Last response time for this route
- **✦ Badge**: Indicates at least one cache hit for this route

**Hover for details**: Shows average time and call count

### Tool Breakdown
Only appears after calling the `/agent` endpoint. Shows:
- Tool name
- Milliseconds for that tool's Ollama call
- ✦ if the tool result was cached

```
explain_topic      ███░░░░░  2150ms
generate_quiz      ██░░░░░░  1400ms
suggest_next_topic ░░░░░░░░  sync
```

## Buttons

| Button | Action |
|--------|--------|
| **run now** | Fetch metrics immediately (don't wait for auto-refresh) |
| **clear** | Reset all metrics counters to zero |
| **▲ hide** | Close the panel (same as Ctrl+Shift+B) |
| **✕** (top-right) | Close the panel |

## Understanding the Colors

The visual bars use a color scale:

| Color | Time Range | Meaning |
|-------|-----------|---------|
| 🟢 Green | < 500ms | Very fast, excellent response time |
| 🟡 Amber | 500ms - 8s | Moderate, acceptable |
| 🔴 Red | > 8s | Slow, may need optimization |

## Status Indicator

The dot next to "DEV" shows overall health:

- 🟢 **Green dot**: No errors in the system
- 🔴 **Red dot**: At least one error (4xx/5xx) occurred in last 60s

## What Gets Tracked?

- ✅ All HTTP requests (route, method, milliseconds, status)
- ✅ Response times for each route
- ✅ Cached responses (detected automatically)
- ✅ Tool execution times (from agent calls)
- ✅ Error count
- ✅ Server uptime
- ✅ Total requests

## What Doesn't Get Tracked?

These things are not monitored:
- Student data or answers
- Conversation history
- Personal information
- Specific prompt content
- Tool results (only timing)

## Persistence

The panel remembers its open/closed state. If you:
1. Expand the panel
2. Refresh the page
3. The panel will reopen in expanded state

This is saved in browser localStorage under key `sb_devpanel_open`.

To clear this: Open DevTools console and run:
```javascript
localStorage.removeItem('sb_devpanel_open');
```

## Performance Notes

### When Expanded
- Fetches metrics every 2 seconds
- Adds ~50-100ms network overhead per refresh
- Renders the panel HTML every 2 seconds

### When Collapsed
- Still updates the tab time every 2 seconds (minimal fetch)
- Does NOT fetch full metrics payload
- Minimal impact on performance

### Overall Impact
- Development mode overhead: ~1ms per request (negligible)
- Memory: ~70KB for request history
- Network: Only when panel is open

## Production Mode

```bash
npm start
```

When running in production:
- ❌ Panel is NOT injected
- ❌ /dev/metrics endpoint doesn't exist
- ❌ /devpanel.js returns 404
- ✅ Zero overhead
- ✅ Students see nothing

## Troubleshooting

### Panel doesn't appear
1. Check DevTools console for errors
2. Verify http://localhost:3000 loads
3. Try Ctrl+Shift+B to toggle it
4. Refresh page if stuck
5. Check that `npm run dev` was used (not `npm start`)

### Metrics show "Loading..."
1. Wait a moment for first /dev/metrics call
2. Try clicking "run now" button
3. Check that Ollama is running (if testing with agent calls)

### Data resets on server restart
This is expected! Metrics are stored in memory and reset when the server restarts. This is intentional — keeps the data fresh.

### Panel shows all zeros
This is normal on a fresh start! Metrics accumulate as you use the app.

## Tips for Development

1. **Test cache performance**: Ask the same question twice and compare response times
2. **Monitor tool timing**: Agent calls show per-tool breakdown
3. **Track errors**: The error counter shows issues immediately
4. **Understand bottlenecks**: Visual bars quickly show slow routes
5. **Keep it collapsed**: When not debugging, collapse to minimize screen space

---

**Need more info?** See `DEVPANEL_IMPLEMENTATION.md` for technical details.
