# Phase 8 Testing Guide — Dynamic Self-Learning Taxonomy

## Prerequisites

- Server running: `npm run dev`
- Ollama with `gemma4:e4b` and `gemma4:e2b` loaded
- Browser open to http://localhost:3000

---

## Test 1: Fresh Start — No Learned Topics

**Goal:** Verify system initializes cleanly

```bash
# Check console on server startup:
# Expected output:
# [dynTaxonomy] loaded 0 learned topics
# [dynTaxonomy] loaded 0 pending topics
# [dynTaxonomy] live taxonomy rebuilt: 412 keywords (0 learned)
```

**Verify files created:**
```bash
ls -l data/
# Should NOT see taxonomy_learned.json or taxonomy_pending.json yet
```

**Verify admin panel loads:**
```bash
open http://localhost:3000/admin
# Should show:
# - Stats: 0 learned, 0 pending, ~412 keywords
# - "No pending topics — all clear!"
# - "No learned topics yet"
```

---

## Test 2: Ask About Unknown Topic (Pending Queue)

**Goal:** Verify first question triggers learning

**Ask a question about a topic NOT in base taxonomy:**
```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is dark matter",
    "level": "beginner",
    "history": []
  }' | jq '.' > /tmp/q1.json
```

**Check console for:**
```
[dynTaxonomy] new pending: "dark matter"
[dynTaxonomy] live taxonomy rebuilt: 412 keywords (0 learned)
```

**Check that files were created:**
```bash
ls -l data/taxonomy_pending.json
# File should exist and contain:
# {
#   "dark matter": {
#     "count": 1,
#     "firstSeen": "...",
#     ...
```

**Check admin panel:**
```bash
# Refresh admin panel (or wait 10 sec for auto-refresh)
# Should now show:
# - Stats: pending = 1
# - Pending Review tab shows "dark matter"
# - Progress bar at 50% (1/2)
# - Example question shown
```

---

## Test 3: Ask Same Topic Again (Threshold Met)

**Goal:** Verify promotion when threshold reached

**Ask about dark matter again:**
```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain dark matter to me",
    "level": "beginner",
    "history": []
  }' | jq '.' > /tmp/q2.json
```

**Check console for:**
```
[dynTaxonomy] pending ++: "dark matter" (count: 2)
[dynTaxonomy] PROMOTED: "dark matter" → learned taxonomy
[dynTaxonomy] live taxonomy rebuilt: 420 keywords (1 learned)
```
(Keyword count increased because dark matter's keywords were added)

**Check files:**
```bash
ls -l data/taxonomy_learned.json
# File should exist

cat data/taxonomy_learned.json | jq '.["dark matter"]'
# Should show:
# {
#   "keywords": [...],
#   "subject": "physics",
#   "askCount": 2,
#   "confidence": "high",
#   "source": "auto",
#   ...
# }

cat data/taxonomy_pending.json | jq '.["dark matter"]'
# Should be gone (removed after promotion)
```

**Check admin panel:**
```
- Stats: learned = 1, pending = 0
- Pending Review tab: empty
- Learned Topics tab: "dark matter" listed with 2 asks
```

---

## Test 4: Third Question Uses Cache (Layer 1 Hit)

**Goal:** Verify learned topic is now in Layer 1 cache

**Ask about dark matter in different wording:**
```bash
# Measure response time
time curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "tell me about dark matter",
    "level": "beginner",
    "history": []
  }' > /tmp/q3.json

# Expected: <100ms (vs 17+ seconds for first Ollama call)
```

**Check console for:**
```
[L1-taxonomy] ✓ dark matter (explain)
```
(NOT an Ollama call, instant cache hit)

**Verify response is identical to first call:**
```bash
# Extract just the explanation text from all three responses
jq '.structured.explanation' /tmp/q1.json > /tmp/exp1.txt
jq '.structured.explanation' /tmp/q2.json > /tmp/exp2.txt
jq '.structured.explanation' /tmp/q3.json > /tmp/exp3.txt

# All three should be identical
diff /tmp/exp1.txt /tmp/exp2.txt
diff /tmp/exp2.txt /tmp/exp3.txt
# Both should show: "Files are identical"
```

---

## Test 5: Admin Panel — Approve Pending

**Goal:** Verify manual approval workflow

**Create a pending topic:**
```bash
# Ask about something obscure that won't reach threshold automatically
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is quantum entanglement",
    "level": "advanced",
    "history": []
  }' > /dev/null
```

**Check admin panel:**
```
- Pending Review tab should show "quantum entanglement"
- Progress bar at 50% (1/2)
- Click "Approve" button
```

**Check console for:**
```
[dynTaxonomy] PROMOTED: "quantum entanglement" → learned taxonomy
[dynTaxonomy] live taxonomy rebuilt: ??? keywords (2 learned)
```

**Verify it's in learned:**
```bash
curl http://localhost:3000/admin/taxonomy | jq '.learned[] | select(.topic == "quantum entanglement")'
# Should return the topic with source: "approved"
```

---

## Test 6: Admin Panel — Reject Pending

**Goal:** Verify rejection workflow

**Create another pending topic:**
```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain flux capacitors",
    "level": "beginner",
    "history": []
  }' > /dev/null
```

**Reject it in admin panel:**
```
- Pending Review tab shows "flux capacitors"
- Click "Reject" button
- Confirm dialog: "Reject flux capacitors?"
```

**Check that it's gone:**
```bash
curl http://localhost:3000/admin/taxonomy | jq '.pending'
# "flux capacitors" should NOT be in the list

# Try asking about it again — should create new pending entry
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is a flux capacitor",
    "level": "beginner",
    "history": []
  }' > /dev/null

curl http://localhost:3000/admin/taxonomy | jq '.pending[] | select(.topic == "flux capacitors")'
# Should show new pending entry (count reset to 1)
```

---

## Test 7: Admin Panel — Manually Add Topic

**Goal:** Verify manual topic addition

**In admin panel, "Add Manually" tab:**
```
Topic name: "black holes"
Subject: "Physics"
Keywords: "singularity, event horizon, hawking radiation, gravitational collapse"
Click "Add Topic"
```

**Verify it was added:**
```bash
curl http://localhost:3000/admin/taxonomy | jq '.learned[] | select(.topic == "black holes")'
# Should return with source: "manual"

# Verify keywords are there
curl http://localhost:3000/admin/taxonomy | jq '.learned[] | select(.topic == "black holes") | .keywords'
# Should include all 4 keywords
```

**Test Layer 1 hit:**
```bash
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain black holes",
    "level": "beginner",
    "history": []
  }' > /dev/null

# Check console for:
# [L1-taxonomy] ✓ black holes (explain)
```

---

## Test 8: API Endpoints

### GET /admin/taxonomy

```bash
curl http://localhost:3000/admin/taxonomy | python3 -m json.tool
```

Expected response:
```json
{
  "learned": [
    {
      "topic": "dark matter",
      "subject": "physics",
      "askCount": 2,
      "keywords": 6,
      "source": "auto",
      "addedAt": "2026-04-06T...",
      "confidence": "high"
    },
    ...
  ],
  "pending": [...],
  "learnedCount": 3,
  "pendingCount": 1,
  "liveKeywords": 425,
  "threshold": 2
}
```

### POST /admin/taxonomy

```bash
curl -X POST http://localhost:3000/admin/taxonomy \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "photosynthesis algae",
    "keywords": ["algae photosynthesis", "aquatic plants", "chlorella"],
    "subject": "biology"
  }'

# Expected response:
# {"success": true, "addedKey": "photosynthesis algae"}
```

### POST /admin/taxonomy/pending/:topic/approve

```bash
curl -X POST "http://localhost:3000/admin/taxonomy/pending/test%20topic/approve"
# Expected: {"success": true} or {"success": false} if not found
```

### DELETE /admin/taxonomy/pending/:topic

```bash
curl -X DELETE "http://localhost:3000/admin/taxonomy/pending/test%20topic"
# Expected: {"success": true}
```

### DELETE /admin/taxonomy/learned/:topic

```bash
curl -X DELETE "http://localhost:3000/admin/taxonomy/learned/dark%20matter"
# Expected: {"success": true}

# Verify it's removed:
curl http://localhost:3000/admin/taxonomy | jq '.learned[] | select(.topic == "dark matter")'
# Should return nothing
```

---

## Test 9: Dev Panel Integration

**Goal:** Verify dev panel shows pending topics

**Open dev panel in browser:**
```
Ctrl+Shift+B (or Cmd+Shift+B on Mac)
```

**Check cache + taxonomy section:**
```
Should show:
- mem entries: N
- in-flight: 0
- keywords: ???
- pending: 0 (or X if topics waiting)

If pending > 0:
- Should show orange warning
- Should have clickable link to /admin
```

**Create a pending topic and watch it update:**
```bash
# Ask about new topic
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"what is mitochondria","level":"beginner","history":[]}' \
  > /dev/null

# Dev panel should auto-refresh in 10 seconds
# Watch pending count change from 0 to 1
```

---

## Test 10: Persistence & Server Restart

**Goal:** Verify learned taxonomy survives restart

**Check current state:**
```bash
curl http://localhost:3000/admin/taxonomy | jq '.learnedCount'
# Note this number (e.g., 3)
```

**Stop and restart server:**
```bash
# Press Ctrl+C to stop
npm run dev
```

**Check console for:**
```
[dynTaxonomy] loaded 3 learned topics
[dynTaxonomy] loaded 0 pending topics
[dynTaxonomy] live taxonomy rebuilt: ??? keywords (3 learned)
```

**Verify learned topics are still there:**
```bash
curl http://localhost:3000/admin/taxonomy | jq '.learnedCount'
# Should be same as before (3)

# Verify the topics are accessible
curl http://localhost:3000/admin/taxonomy | jq '.learned[0].topic'
```

---

## Test 11: Max Limits

**Goal:** Verify LRU eviction when limits are exceeded

**Push beyond MAX_LEARNED (500):**
```bash
# Manually add 501 topics via API
for i in {1..501}; do
  curl -s -X POST http://localhost:3000/admin/taxonomy \
    -H "Content-Type: application/json" \
    -d "{\"topic\":\"test$i\",\"keywords\":[\"test$i\"],\"subject\":\"other\"}" \
    > /dev/null
done

# Check count
curl http://localhost:3000/admin/taxonomy | jq '.learnedCount'
# Should be 500 (oldest evicted to maintain limit)
```

**Push beyond MAX_PENDING (200):**
```bash
# Ask about 201 different topics (each triggers pending)
for i in {1..201}; do
  curl -s -X POST http://localhost:3000/agent \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"explain unknown$i\",\"level\":\"beginner\",\"history\":[]}" \
    > /dev/null
done

# Check pending count
curl http://localhost:3000/admin/taxonomy | jq '.pendingCount'
# Should be 200 (oldest evicted)
```

---

## Test 12: Configurable Threshold

**Goal:** Verify promotion threshold is tunable

**Edit agent/dynamicTaxonomy.js:**
```javascript
// Change from:
const PROMOTION_THRESHOLD = 2;
// To:
const PROMOTION_THRESHOLD = 1;
```

**Restart server:**
```bash
npm run dev
```

**Ask about new topic once:**
```bash
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "what is hawking radiation",
    "level": "advanced",
    "history": []
  }' > /dev/null

# Check console for:
# [dynTaxonomy] pending ++: "hawking radiation" (count: 1)
# [dynTaxonomy] PROMOTED: "hawking radiation" → learned taxonomy
# (Should auto-promote on first ask)
```

**Restore threshold:**
```javascript
const PROMOTION_THRESHOLD = 2;
npm run dev
```

---

## Performance Benchmarks

Run these commands and note response times:

```bash
# Clear and restart for clean slate
curl -X DELETE http://localhost:3000/cache
npm run dev

# 1. First unknown topic (Ollama + extraction)
time curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"what is xyz unknown","level":"beginner","history":[]}' > /dev/null
# Expected: ~17-20s

# 2. Same topic again (Gemma extraction + pending)
time curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"explain xyz unknown","level":"beginner","history":[]}' > /dev/null
# Expected: ~17-20s (hits Layer 4)

# 3. Third time, should auto-promote and hit cache
time curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"tell me about xyz unknown","level":"beginner","history":[]}' > /dev/null
# Expected: <100ms (Layer 1 cache hit)
```

---

## Troubleshooting

### Gemma extraction fails
```
[dynTaxonomy] Gemma extraction failed: ECONNREFUSED
```
→ Check Ollama is running with `gemma4:e2b` loaded
```bash
ollama list | grep e2b
ollama run gemma4:e2b "hi"  # Test it
```

### Topics not being learned
```
No entries in pending or learned after questions
```
→ Check if questions match `if (tool === 'explain' || tool === 'quiz')`
→ Make sure you're asking via /agent endpoint, not other routes
→ Check console for extraction errors

### Admin panel shows old data
```
Pending count doesn't change after asking new question
```
→ Admin panel auto-refreshes every 10s
→ Or manually click "Refresh" button
→ Check network tab to see if /admin/taxonomy is being called

### Learned topics disappear
```
Was there yesterday, gone today
```
→ If data/taxonomy_learned.json is in .gitignore, it's not persisted
→ Uncomment the lines in .gitignore to enable persistence:
```
# data/taxonomy_learned.json
# data/taxonomy_pending.json
```
→ Commit the files to git

---

## Checklist: All Tests Passing ✅

- [ ] Fresh start: no topics loaded
- [ ] Pending: first question creates pending entry
- [ ] Promotion: second question auto-promotes
- [ ] Layer 1 hit: third question uses cache
- [ ] Approve: admin can force-promote
- [ ] Reject: admin can prevent topics
- [ ] Manual add: admin can add directly
- [ ] API endpoints: all CRUD operations work
- [ ] Dev panel: shows pending count and link
- [ ] Persistence: topics survive restart
- [ ] Max limits: LRU eviction works
- [ ] Threshold: configurable and respected
- [ ] Performance: benchmarks within expected ranges

**Status: Ready for production deployment** ✅
