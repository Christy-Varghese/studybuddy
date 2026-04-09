// ── StudyBuddy — Server Entry Point ──────────────
// Wires together middleware, routes, and starts the Express server.

require('dotenv').config();

const express    = require('express');
const session    = require('express-session');
const compression = require('compression');
const path       = require('path');
const fs         = require('fs');

// ── Middleware ──
const { IS_DEV, devTimingMiddleware }  = require('./middleware/devTiming');
const { pwaMimeMiddleware }            = require('./middleware/pwa');
const { multerErrorHandler }           = require('./middleware/upload');

// ── Routes ──
const { router: authRoutes, requireTeacher } = require('./routes/auth');
const chatRoutes       = require('./routes/chat');
const quizRoutes       = require('./routes/quiz');
const agentRoutes      = require('./routes/agent');
const socraticRoutes   = require('./routes/socratic');
const conceptMapRoutes = require('./routes/conceptMap');
const progressRoutes   = require('./routes/progress');
const adminRoutes      = require('./routes/admin');
const devRoutes        = require('./routes/dev');

const app = express();

// ── Performance: Enable gzip compression ──
// Compresses all responses >1KB, reduces bandwidth by ~70%
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(express.json());

// ── Session middleware (PIN auth for student/teacher roles) ──
app.use(session({
  secret:            process.env.SESSION_SECRET || 'studybuddy-dev-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   24 * 60 * 60 * 1000,   // 24 hours
    httpOnly: true,
    secure:   false,                   // set true behind HTTPS in production
    sameSite: 'lax'
  }
}));

// ── Auth routes (login, logout, me) — must be before static files ──
app.use(authRoutes);

// ── Dev timing middleware (tracks request timing in dev mode) ──
app.use(devTimingMiddleware);

// Block devpanel.js in production
app.get('/devpanel.js', (req, res, next) => {
  if (!IS_DEV) return res.status(404).send('Not found');
  next();
});

// Inject dev panel into HTML responses (dev mode only)
if (IS_DEV) {
  app.use((req, res, next) => {
    const origSend = res.send?.bind(res);

    res.send = function(data) {
      if (
        typeof data === 'string' &&
        data.includes('</body>') &&
        res.getHeader('content-type')?.includes('text/html')
      ) {
        data = data.replace(
          '</body>',
          '<script>(function(){var s=document.createElement("script");s.src="/devpanel.js";s.async=true;document.head.appendChild(s);})();</script></body>'
        );
      }
      return origSend(data);
    };
    next();
  });

  // Explicit handler for index.html to ensure dev panel injection
  app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).send('Error loading page');
      }
      data = data.replace(
        '</body>',
        '<script>(function(){var s=document.createElement("script");s.src="/devpanel.js";s.async=true;document.head.appendChild(s);})();</script></body>'
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(data);
    });
  });
}

// ── PWA middleware (MIME types and cache headers) ──
app.use(pwaMimeMiddleware);

// ── Protect teacher dashboard — must be before static file serving ──
app.get('/teacher.html', requireTeacher, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// ── Static files ──
app.use(express.static('public'));

// ── Multer error handler ──
app.use(multerErrorHandler);

// ── Mount all routes ──
app.use(chatRoutes);
app.use(quizRoutes);
app.use(agentRoutes);
app.use(socraticRoutes);
app.use(conceptMapRoutes);
app.use(progressRoutes);
app.use(adminRoutes);
app.use(devRoutes);

// ─── Warm up models on startup ───────────────────
async function warmUpModels() {
  try {
    const tagsRes = await fetch('http://localhost:11434/api/tags');
    const tagsData = await tagsRes.json();
    const installedModels = tagsData.models.map(m => m.name);

    const modelsToWarmup = installedModels.filter(m =>
      m.includes('gemma4:e4b') || m.includes('gemma4:e2b') || m.includes('gemma3')
    ).slice(0, 2);

    for (const model of modelsToWarmup) {
      try {
        await fetch('http://localhost:11434/api/generate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt:    'hi',
            stream:    false,
            options:   { num_predict: 1 }
          })
        });
        console.log(`[warmup] ${model} loaded into RAM`);
      } catch (err) {
        console.warn(`[warmup] Could not warm up ${model}:`, err.message);
      }
    }

    if (modelsToWarmup.length === 0) {
      console.warn('[warmup] No suitable models found for warmup. Available models:', installedModels);
    }
  } catch (err) {
    console.warn('[warmup] Could not check available models:', err.message);
  }
}

app.listen(3000, () => {
  console.log('StudyBuddy running at http://localhost:3000');
  warmUpModels();
});
