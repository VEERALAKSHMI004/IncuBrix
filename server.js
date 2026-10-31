// ============================================================
// IncuBrix Social Growth Engine — Main Server
// server.js
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Initialize DB (runs schema + seed)
const db = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ── API ROUTES ────────────────────────────────────────────

app.use('/api/posts',     require('./routes/posts'));
app.use('/api/calendar',  require('./routes/calendar'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/ai',        require('./routes/ai'));
app.use('/api/stats',     require('./routes/stats'));

// ── HEALTH CHECK ──────────────────────────────────────────

app.get('/api/health', (req, res) => {
  const postCount    = db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
  const approvalCount = db.prepare("SELECT COUNT(*) AS c FROM approvals WHERE status = 'pending'").get().c;
  res.json({
    status:  'ok',
    version: '1.0.0',
    service: 'IncuBrix Social Growth Engine',
    db:      'incubrix.db (SQLite)',
    stats: {
      posts:            postCount,
      pending_approvals: approvalCount,
    },
    uptime:  Math.round(process.uptime()) + 's',
    timestamp: new Date().toISOString(),
  });
});

// ── API DOCS (quick reference) ────────────────────────────

app.get('/api', (req, res) => {
  res.json({
    service: 'IncuBrix Social Growth Engine API',
    version: '1.0.0',
    endpoints: {
      'GET  /api/health':                  'Health check + DB stats',
      'GET  /api/posts':                   'List all posts (?type=&platform=&status=)',
      'GET  /api/posts/:id':               'Get single post',
      'POST /api/posts':                   'Create new post',
      'PATCH /api/posts/:id':              'Update post fields',
      'DELETE /api/posts/:id':             'Delete post',
      'GET  /api/calendar':               'List all calendar events with post details',
      'POST /api/calendar':               'Add post to calendar',
      'DELETE /api/calendar/:id':         'Remove event from calendar',
      'GET  /api/approvals':              'List approvals (?status=pending|approved|rejected)',
      'PATCH /api/approvals/:id/approve': 'Approve a post',
      'PATCH /api/approvals/:id/reject':  'Reject a post',
      'GET  /api/ai/suggestions':         'Get AI content suggestions',
      'POST /api/ai/suggest':             'Ask AI assistant { query }',
      'POST /api/ai/engine':              'Run content engine { input_text, platforms[], asset_types[] }',
      'GET  /api/ai/engine/runs':         'List past engine runs',
      'GET  /api/stats':                  'Dashboard KPI stats',
      'GET  /api/stats/pipeline':         'Pipeline stage data',
      'GET  /api/stats/performance':      'Performance chart data (7 days)',
      'GET  /api/stats/breakdown':        'Posts breakdown by type/platform/status',
    }
  });
});

// ── CATCH-ALL — serve index.html for frontend routing ─────

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── 404 + ERROR HANDLERS ──────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
});

// ── START ─────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   IncuBrix Social Growth Engine — Server Ready   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  🌐  Dashboard  → http://localhost:${PORT}`);
  console.log(`  🔌  API Docs   → http://localhost:${PORT}/api`);
  console.log(`  ❤️   Health     → http://localhost:${PORT}/api/health`);
  console.log(`  📂  Database   → incubrix.db (SQLite)`);
  console.log('');
});
