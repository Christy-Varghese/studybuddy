# 📁 Project Structure

> Updated after the modular reorganization (April 2026)

```
studybuddy/
├── server.js                    ← Express entry point (wires routes + middleware)
├── routes/                      ← API route handlers
│   ├── chat.js                  ← /chat, /chat-with-image, /estimate (SSE streaming)
│   ├── quiz.js                  ← /quiz (quiz generation)
│   ├── agent.js                 ← /agent (full agent pipeline)
│   ├── socratic.js              ← /socratic (guided discovery dialogue)
│   ├── conceptMap.js            ← /concept-map (knowledge graph generation)
│   ├── progress.js              ← /progress, /progress-report, /due-reviews, /srs, /streak
│   ├── admin.js                 ← /admin/* routes, bulk CSV/Excel upload
│   └── dev.js                   ← /dev/metrics, /dev/flow-traces, /cache-stats, /topics/search
├── middleware/                   ← Express middleware
│   ├── devTiming.js             ← Request timing, dev metrics, flow traces, dev panel injection
│   ├── upload.js                ← Multer config (image + spreadsheet uploads)
│   └── pwa.js                   ← PWA MIME type corrections
├── lib/                          ← Shared utilities
│   └── helpers.js               ← buildSystemPrompt(), estimateResponseTime(), warmUpModels()
├── agent/                        ← Agent system (7 files — already modular)
│   ├── agentLoop.js             ← Sequential, parallel & Socratic agent orchestration
│   ├── tools.js                 ← 7 learning tools
│   ├── progressStore.js         ← SM-2 SRS + streak tracking (JSON-based)
│   ├── smartCache.js            ← 4-layer cache waterfall with disk persistence
│   ├── dynamicTaxonomy.js       ← Auto-learn + curate topic taxonomy
│   ├── taxonomy.js              ← Base taxonomy (76 topics, 1,223 keywords)
│   └── trie.js                  ← O(k) prefix search for autocomplete
├── public/                       ← Static frontend assets
│   ├── index.html               ← HTML shell (~190 lines, refs external CSS/JS)
│   ├── styles/                  ← 14 CSS files
│   │   ├── variables.css        ← Custom properties, theme overrides
│   │   ├── base.css             ← Reset, animations, GPU hints
│   │   ├── layout.css           ← Header, controls bar
│   │   ├── chat.css             ← Chat bubbles, structured responses
│   │   ├── input.css            ← Input area, buttons
│   │   ├── voice.css            ← Voice status bar
│   │   ├── socratic.css         ← Socratic mode
│   │   ├── evolution.css        ← Evolution Report card
│   │   ├── quiz.css             ← Quiz modal, cards
│   │   ├── concept-map.css      ← Concept map modal
│   │   ├── vision.css           ← Vision analysis cards
│   │   ├── agent.css            ← Agent response
│   │   ├── progress.css         ← Progress modal
│   │   └── pwa.css              ← PWA banner, responsive, standalone
│   ├── scripts/                 ← 15 JS files
│   │   ├── state.js             ← DOM refs, shared state
│   │   ├── utils.js             ← scrollToBottom(), addBubble()
│   │   ├── image.js             ← Image upload handlers
│   │   ├── chat.js              ← sendMessage()
│   │   ├── quiz.js              ← Quiz generation & rendering
│   │   ├── socratic.js          ← Socratic mode
│   │   ├── concept-map.js       ← Concept map (D3)
│   │   ├── theme.js             ← Theme switching, streak, due reviews
│   │   ├── loading.js           ← Skeleton loader, facts loading
│   │   ├── render.js            ← Bot response rendering, LaTeX
│   │   ├── agent.js             ← Agent mode, SSE streaming
│   │   ├── evolution.js         ← Evolution Report
│   │   ├── voice.js             ← SpeechRecognition
│   │   ├── init.js              ← Event listeners, window.load
│   │   └── pwa.js               ← Service worker registration
│   ├── assets/                  ← Icons
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable.png
│   ├── devpanel.js              ← Developer diagnostics panel
│   ├── manifest.json            ← PWA manifest
│   ├── sw.js                    ← Service worker (offline-first)
│   ├── offline.html             ← Offline fallback
│   ├── taxonomy-admin.html      ← Taxonomy admin panel
│   └── card-560x280.html        ← Social card template
├── data/                         ← Runtime data (auto-created)
│   ├── progress.json            ← Student learning history
│   ├── cache.json               ← Smart cache persistence
│   └── taxonomy_learned.json    ← Learned topic expansions
├── scripts/                      ← Build/utility scripts
│   └── generate-icons.js        ← PWA icon generator
├── docs/                         ← Documentation (see DOCS_INDEX.md)
├── uploads/                      ← Homework photo uploads
├── package.json                  ← Dependencies & scripts
└── README.md                     ← Project overview
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| 14 CSS files | One per visual feature — easy to find and edit |
| 15 JS files | State -> utilities -> features -> init -> PWA load order |
| 8 route files | Each API domain isolated |
| 3 middleware files | Cross-cutting concerns separated |
| lib/helpers.js | Shared functions used by multiple routes |
| agent/ untouched | Already well-structured — 7 focused modules |

## Before & After

| Metric | Before | After |
|--------|--------|-------|
| index.html | 4,402 lines (monolithic) | 190 lines (shell) + 14 CSS + 15 JS |
| server.js | 1,377 lines (monolithic) | 145 lines (entry) + 8 routes + 3 middleware + 1 lib |
| Dead code | src/, config/, .bak files | Removed |
| Total modules | 2 monoliths + 7 agent | 42 focused files + 7 agent |
