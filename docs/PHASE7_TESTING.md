# Phase 7 — Smart Cache Testing Guide

## Quick Start

### 1. Ensure prerequisites
```bash
# Check Ollama is running with gemma4:e4b
ollama list | grep gemma

# Expected output:
# gemma4:e4b       91a89c999c14   8.1 GB   52 seconds ago
```

### 2. Start the server
```bash
cd /Users/christyvarghese/Documents/studybuddy
npm run dev
```

**Expected startup output:**
```
[smartCache] loaded 0 entries from disk
[smartCache] Trie initialized with 60 topics
Server running on http://localhost:3000
```

### 3. Open browser
```bash
open http://localhost:3000
```

---

## Testing the 4 Layers

### Test 1: Layer 4 → Layer 2 (First call vs cached call)

**Terminal 1 - measure response time:**
```bash
# Measure first call (Layer 4 — Ollama)
curl -s -o /dev/null -w "%{time_total}s\n" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain photosynthesis",
    "level": "beginner",
    "history": []
  }'

# Expected: ~17-20 seconds (full Ollama call)
# Console should show: [L4-ollama] calling Ollama...

# Now measure second call (Layer 2 — cache hit)
curl -s -o /dev/null -w "%{time_total}s\n" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain photosynthesis",
    "level": "beginner",
    "history": []
  }'

# Expected: <10ms (cache hit)
# Console should show: [L2-hash] ✓ photosynthesis (explain)
```

### Test 2: Layer 1 (Taxonomy resolution)

Different phrasing → same cache key (taxonomy match):

```bash
# First call with exact topic (Layer 4)
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "photosynthesis",
    "level": "beginner",
    "history": []
  }' | jq '.structured' > /tmp/resp1.json

# Now ask with different phrasing (Layer 1 — taxonomy)
curl -s -o /dev/null -w "%{time_total}s\n" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "how do plants make food using sunlight",
    "level": "beginner",
    "history": []
  }'

# Expected: <5ms (taxonomy hit)
# Console should show: [L1-taxonomy] ✓ photosynthesis (explain)
# Response should be IDENTICAL to first call
```

**Verify responses are identical:**
```bash
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "photosynthesis",
    "level": "beginner",
    "history": []
  }' | jq '.structured' > /tmp/resp2.json

diff /tmp/resp1.json /tmp/resp2.json
# Should show: Files /tmp/resp1.json and /tmp/resp2.json are identical
```

### Test 3: Layer 3 (Deduplication)

Two simultaneous requests → only one Ollama call:

```bash
# Clear cache first
curl -X DELETE http://localhost:3000/cache

# Start two requests simultaneously (background + foreground)
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain gravity",
    "level": "intermediate",
    "history": []
  }' &

# Immediate second call (before first finishes)
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain gravity",
    "level": "intermediate",
    "history": []
  }'

# Console should show:
# [L4-ollama] calling Ollama...
# [L3-dedup] waiting for in-flight (explain)
# [L3-dedup] waiting for in-flight (explain)

# Both respond with same content at roughly same time
```

### Test 4: Cache Statistics

**Check current cache state:**
```bash
curl http://localhost:3000/cache-stats | python3 -m json.tool
```

**Expected output:**
```json
{
  "memEntries": 5,
  "inFlight": 0,
  "taxonomySize": 412,
  "trieTopics": 60,
  "diskPath": "/Users/christyvarghese/Documents/studybuddy/data/cache.json",
  "topics": [
    { "key": "a7f2c9b8...", "age": "30s" },
    { "key": "b8f3d0c9...", "age": "45s" },
    ...
  ]
}
```

### Test 5: Topic Search (Trie)

Autocomplete via Trie data structure:

```bash
# Search for topics starting with "photo"
curl "http://localhost:3000/topics/search?q=photo" | python3 -m json.tool

# Expected:
# {
#   "prefix": "photo",
#   "results": ["photosynthesis"],
#   "count": 1
# }

# Search for topics starting with "new"
curl "http://localhost:3000/topics/search?q=new" | python3 -m json.tool

# Expected:
# {
#   "prefix": "new",
#   "results": ["newtons laws"],
#   "count": 1
# }

# Search for multiple matches
curl "http://localhost:3000/topics/search?q=atom" | python3 -m json.tool

# Expected:
# {
#   "prefix": "atom",
#   "results": ["atomic structure"],
#   "count": 1
# }
```

### Test 6: Dev Panel Metrics

Open dev panel in browser (Ctrl+Shift+B):

**Look for new "smart cache" section showing:**
- mem entries: Count of live cache entries
- in-flight: Count of concurrent requests
- trie topics: 60 (number of topics in taxonomy)
- keywords: 412 (total keywords in reverse index)

Example:
```
smart cache
├─ mem entries    8
├─ in-flight      0
├─ trie topics    60
└─ keywords       412
```

### Test 7: Pre-warming

Student asks question → agent suggests next topic → background pre-fetch:

```bash
# Make a request that should generate a nextTopic suggestion
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain photosynthesis",
    "level": "beginner",
    "history": []
  }' | jq '.structured.nextTopic'

# Expected output:
# {
#   "nextTopic": "cellular respiration",
#   "reason": "builds on photosynthesis",
#   "relatedTo": "photosynthesis"
# }

# Check console logs for:
# [prewarm] fetching: cellular respiration
# [prewarm] cached: cellular respiration

# Now ask for that topic — should be instant (already cached via pre-warm)
curl -s -o /dev/null -w "%{time_total}s\n" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "explain cellular respiration",
    "level": "beginner",
    "history": []
  }'

# Expected: <5ms (pre-warmed cache hit)
# Console should show: [L1-taxonomy] ✓ cellular respiration (explain)
```

### Test 8: Disk Persistence

Cache survives server restart:

```bash
# Make several requests to populate cache
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"gravity","level":"beginner","history":[]}'

curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"algebra","level":"beginner","history":[]}'

# Check disk cache was created
ls -lh data/cache.json
# Expected: file exists, size > 1KB

# Check memory cache stats
curl http://localhost:3000/cache-stats | jq '.memEntries'
# Expected: 2+ entries

# Restart server
# Press Ctrl+C, then:
npm run dev

# Expected console output:
# [smartCache] loaded 2 entries from disk

# Verify cache is still there
curl http://localhost:3000/cache-stats | jq '.memEntries'
# Expected: same number or more (disk entries loaded into memory)

# Test cache hit still works
curl -s -o /dev/null -w "%{time_total}s\n" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"gravity","level":"beginner","history":[]}'

# Expected: <5ms (disk cache → memory → instant hit)
```

### Test 9: Cache Eviction

Memory and disk caches respect size limits:

```bash
# Make 250+ requests (above MAX_MEM_ENTRIES of 300)
for i in {1..50}; do
  curl -s -X POST http://localhost:3000/agent \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"photosynthesis level $i\",\"level\":\"beginner\",\"history\":[]}" > /dev/null
done

# Check stats
curl http://localhost:3000/cache-stats | jq '.memEntries'
# Expected: <= 300 (older entries evicted)

# Disk cache should also be capped at 500 entries
ls -lh data/cache.json
# Size should be reasonable (not growing unbounded)
```

### Test 10: Cache Clearing

```bash
# Check cache before clear
curl http://localhost:3000/cache-stats | jq '.memEntries'
# Expected: some number > 0

# Clear cache
curl -X DELETE http://localhost:3000/cache

# Check cache after clear
curl http://localhost:3000/cache-stats | jq '.memEntries'
# Expected: 0

# Verify disk cache file was deleted
ls -l data/cache.json
# Expected: file not found (404)
```

---

## Expected Console Output (Healthy Operation)

```
[smartCache] loaded 47 entries from disk         ← disk cache loaded
[L1-taxonomy] ✓ photosynthesis (explain)        ← Layer 1 hit
[L2-hash] ✓ gravity force (explain)             ← Layer 2 hit
[L3-dedup] waiting for in-flight (quiz)         ← deduplication working
[prewarm] fetching: cellular respiration        ← background pre-warm starting
[prewarm] cached: cellular respiration          ← pre-warm complete
[L1-taxonomy] ✓ cellular respiration (explain)  ← student gets instant response
```

---

## Performance Targets (Validation)

| Test | Expected | Acceptable | Failed if |
|------|----------|-----------|-----------|
| First call (Layer 4) | 17–20s | 15–25s | >30s |
| Cached call (Layer 2) | <10ms | <50ms | >100ms |
| Taxonomy hit (Layer 1) | <5ms | <20ms | >100ms |
| Deduplication (Layer 3) | 0ms | 0–5ms | >10ms |
| Disk load on startup | <1s | <2s | >5s |
| Pre-warmed request | <5ms | <20ms | >100ms |
| Topic search (Trie) | <1ms | <10ms | >50ms |

---

## Debugging Tips

### If taxonomy hits aren't working:
```bash
# Check if topic resolves
curl "http://localhost:3000/topics/search?q=photosynthesis" | jq '.results'

# Check if keyword is in taxonomy
grep -r "photosynthesis" agent/taxonomy.js | head -3

# Manually test resolver
node -e "
const { resolveCanonicalTopic } = require('./agent/taxonomy');
console.log(resolveCanonicalTopic('how do plants make food'));
"
# Expected output: "photosynthesis"
```

### If cache hits aren't happening:
```bash
# Check console logs for layer information
# Should see [L1-taxonomy], [L2-hash], [L3-dedup], or [L4-ollama]

# Verify smartCache is being imported
grep "smartCache" agent/tools.js

# Check if smartGet/smartSet are called
grep "smartGet\|smartSet" agent/tools.js | wc -l
# Expected: >0
```

### If pre-warming isn't working:
```bash
# Check if nextTopic is in response
curl -s -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"explain photosynthesis","level":"beginner","history":[]}' \
  | jq '.structured.nextTopic'

# Should output a topic object

# Check console for [prewarm] logs
# If missing, check:
# - explainFn is defined
# - preWarm is imported in agentLoop.js
# - structured?.nextTopic?.nextTopic is truthy
```

### If disk cache isn't persisting:
```bash
# Check file permissions
ls -l data/cache.json
# Expected: -rw-r--r-- or similar (readable/writable)

# Check file content
tail -c 200 data/cache.json | head -c 100
# Expected: JSON data

# Manually read cache on startup
node -e "
const smartCache = require('./agent/smartCache');
const stats = smartCache.getCacheStats();
console.log(stats);
"
```

---

## Manual Performance Test Script

```bash
#!/bin/bash
# Save as test-cache-performance.sh

echo "🧪 Testing 4-Layer Cache Performance"
echo ""

echo "1️⃣ Clear cache"
curl -s -X DELETE http://localhost:3000/cache > /dev/null
echo "   ✓ Cache cleared"
echo ""

echo "2️⃣ First call (Layer 4 — Ollama)"
time1=$(curl -s -o /dev/null -w "%{time_total}" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"explain photosynthesis","level":"beginner","history":[]}')
echo "   Response time: ${time1}s (expected 17–20s)"
echo ""

echo "3️⃣ Second call (Layer 2 — cache hit)"
time2=$(curl -s -o /dev/null -w "%{time_total}" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"explain photosynthesis","level":"beginner","history":[]}')
echo "   Response time: ${time2}s (expected <0.01s)"
echo ""

echo "4️⃣ Taxonomy match (Layer 1)"
time3=$(curl -s -o /dev/null -w "%{time_total}" \
  -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"how do plants make food using sunlight","level":"beginner","history":[]}')
echo "   Response time: ${time3}s (expected <0.01s)"
echo ""

echo "📊 Cache Stats"
curl -s http://localhost:3000/cache-stats | jq '{memEntries, inFlight, taxonomySize, trieTopics}'
echo ""

echo "✅ Test complete!"
```

Run it:
```bash
chmod +x test-cache-performance.sh
./test-cache-performance.sh
```

---

## Troubleshooting Checklist

- [ ] All syntax checks pass (`node -c` for each file)
- [ ] Server starts without errors
- [ ] `/cache-stats` endpoint responds
- [ ] `/topics/search?q=photosynthesis` returns results
- [ ] First request takes ~17–20s
- [ ] Second request takes <10ms
- [ ] Console shows `[L1-taxonomy]` or `[L2-hash]` logs
- [ ] Dev panel shows smart cache stats (mem entries, in-flight, etc.)
- [ ] Pre-warming works (console shows `[prewarm]` logs)
- [ ] Disk cache loads on restart (`[smartCache] loaded N entries`)

---

**Last updated:** Phase 7 - Smart Caching System  
**Status:** Ready for testing
