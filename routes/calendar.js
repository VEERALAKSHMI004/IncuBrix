// ============================================================
// IncuBrix — Routes: Calendar API
// routes/calendar.js
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/calendar — all calendar events with post details
router.get('/', (req, res) => {
  try {
    const events = db.prepare(`
      SELECT ce.*, p.title, p.type, p.platform, p.status, p.emoji, p.grad, p.caption, p.hashtags, p.cta, p.utm_link
      FROM calendar_events ce
      JOIN posts p ON ce.post_id = p.id
      ORDER BY ce.day_offset ASC, ce.time_label ASC
    `).all();
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/calendar — schedule a post
router.post('/', (req, res) => {
  try {
    const { post_id, day_offset, time_label } = req.body;
    if (!post_id || day_offset === undefined) {
      return res.status(400).json({ success: false, error: 'post_id and day_offset are required' });
    }
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(post_id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    const result = db.prepare(`
      INSERT INTO calendar_events (post_id, day_offset, time_label)
      VALUES (?, ?, ?)
    `).run(post_id, day_offset, time_label || '09:00 AM');

    const event = db.prepare(`
      SELECT ce.*, p.title, p.type, p.platform, p.status, p.emoji
      FROM calendar_events ce JOIN posts p ON ce.post_id = p.id
      WHERE ce.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/calendar/:id — remove from calendar
router.delete('/:id', (req, res) => {
  try {
    const ev = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id);
    if (!ev) return res.status(404).json({ success: false, error: 'Calendar event not found' });
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `Calendar event ${req.params.id} removed` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
