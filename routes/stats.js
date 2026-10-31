// ============================================================
// IncuBrix — Routes: Stats + Pipeline + Analytics
// routes/stats.js
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/stats — dashboard KPI stats
router.get('/', (req, res) => {
  try {
    // Always compute live from DB
    const upcomingPosts  = db.prepare(`SELECT COUNT(*) AS c FROM posts WHERE status IN ('ready','scheduled')`).get().c;
    const contentCreated = db.prepare(`SELECT COUNT(*) AS c FROM posts`).get().c;
    const pendingApprovals = db.prepare(`SELECT COUNT(*) AS c FROM approvals WHERE status = 'pending'`).get().c;

    // Engagement % = approved / total approvals
    const totalApprovals    = db.prepare(`SELECT COUNT(*) AS c FROM approvals`).get().c;
    const approvedApprovals = db.prepare(`SELECT COUNT(*) AS c FROM approvals WHERE status = 'approved'`).get().c;
    const engagementPct = totalApprovals > 0 ? Math.round((approvedApprovals / totalApprovals) * 100) : 87;

    // Engine runs
    const engineRuns = db.prepare(`SELECT COUNT(*) AS c, SUM(assets_generated) AS total FROM engine_runs WHERE status = 'done'`).get();
    const timeSavedH = Math.round((engineRuns.total || 0) * 0.5 + 28); // baseline 28h + 0.5h per asset

    res.json({
      success: true,
      data: {
        upcoming_posts:    upcomingPosts,
        content_created:   contentCreated,
        engagement_pct:    engagementPct,
        time_saved_h:      timeSavedH,
        pending_approvals: pendingApprovals,
        engine_runs:       engineRuns.c || 0,
        assets_generated:  engineRuns.total || 0,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stats/pipeline — pipeline stage counts
router.get('/pipeline', (req, res) => {
  try {
    const stages = db.prepare(`
      SELECT ps.*, GROUP_CONCAT(pi.label, '||') AS items
      FROM pipeline_stages ps
      LEFT JOIN pipeline_items pi ON pi.stage_id = ps.id
      GROUP BY ps.id
      ORDER BY ps.stage_order ASC
    `).all();

    const formatted = stages.map(s => ({
      ...s,
      items: s.items ? s.items.split('||') : [],
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stats/performance — performance chart data
router.get('/performance', (req, res) => {
  try {
    // Simulated time-series data (7 days)
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const seed = (base, range) => days.map((_, i) => Math.round(base + (i / 6) * range + (Math.random() * 10 - 5)));

    res.json({
      success: true,
      data: {
        labels:     days,
        reach:      seed(30, 65),
        engagement: seed(18, 54),
        clicks:     seed(8, 34),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stats/breakdown — posts breakdown by type and platform
router.get('/breakdown', (req, res) => {
  try {
    const byType     = db.prepare(`SELECT type, COUNT(*) AS count FROM posts GROUP BY type`).all();
    const byPlatform = db.prepare(`SELECT platform, COUNT(*) AS count FROM posts GROUP BY platform`).all();
    const byStatus   = db.prepare(`SELECT status, COUNT(*) AS count FROM posts GROUP BY status`).all();
    res.json({ success: true, data: { by_type: byType, by_platform: byPlatform, by_status: byStatus } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
