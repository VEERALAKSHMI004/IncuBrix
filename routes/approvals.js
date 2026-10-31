// ============================================================
// IncuBrix — Routes: Approvals API
// routes/approvals.js
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/approvals — list all pending approvals (with post details)
router.get('/', (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const approvals = db.prepare(`
      SELECT a.*, p.title, p.type, p.platform, p.emoji, p.caption, p.scheduled_at
      FROM approvals a
      JOIN posts p ON a.post_id = p.id
      WHERE a.status = ?
      ORDER BY a.created_at DESC
    `).all(status);
    res.json({ success: true, count: approvals.length, data: approvals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/approvals/:id/approve — approve a post
router.patch('/:id/approve', (req, res) => {
  try {
    const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
    if (!approval) return res.status(404).json({ success: false, error: 'Approval not found' });

    db.prepare(`UPDATE approvals SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?`).run(req.params.id);
    // Also update the linked post status to 'scheduled'
    db.prepare(`UPDATE posts SET status = 'scheduled', updated_at = datetime('now') WHERE id = ?`).run(approval.post_id);

    res.json({ success: true, message: 'Post approved and scheduled' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/approvals/:id/reject — reject a post
router.patch('/:id/reject', (req, res) => {
  try {
    const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
    if (!approval) return res.status(404).json({ success: false, error: 'Approval not found' });

    const { notes } = req.body;
    db.prepare(`UPDATE approvals SET status = 'rejected', notes = ?, reviewed_at = datetime('now') WHERE id = ?`).run(notes || null, req.params.id);
    db.prepare(`UPDATE posts SET status = 'draft', updated_at = datetime('now') WHERE id = ?`).run(approval.post_id);

    res.json({ success: true, message: 'Post rejected and moved to drafts' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
