// ============================================================
// IncuBrix — Routes: Posts API
// routes/posts.js
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/posts — list all posts (with optional ?type=&platform=&status= filters)
router.get('/', (req, res) => {
  try {
    let query  = 'SELECT * FROM posts WHERE 1=1';
    const params = [];
    if (req.query.type)     { query += ' AND type = ?';     params.push(req.query.type); }
    if (req.query.platform) { query += ' AND platform = ?'; params.push(req.query.platform); }
    if (req.query.status)   { query += ' AND status = ?';   params.push(req.query.status); }
    query += ' ORDER BY scheduled_at ASC';
    const posts = db.prepare(query).all(...params);
    res.json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/posts/:id — single post
router.get('/:id', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/posts — create new post
router.post('/', (req, res) => {
  try {
    const { title, type, platform, status, caption, hashtags, cta, utm_link, hook, scheduled_at, emoji, grad } = req.body;
    if (!title || !type || !platform) {
      return res.status(400).json({ success: false, error: 'title, type, and platform are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO posts (title, type, platform, status, caption, hashtags, cta, utm_link, hook, scheduled_at, emoji, grad)
      VALUES (@title, @type, @platform, @status, @caption, @hashtags, @cta, @utm_link, @hook, @scheduled_at, @emoji, @grad)
    `);
    const result = stmt.run({ title, type, platform, status: status || 'draft', caption, hashtags, cta, utm_link, hook, scheduled_at, emoji: emoji || '📄', grad: grad || 'grad-1' });
    const newPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: newPost });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/posts/:id — partial update
router.patch('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Post not found' });

    const fields = ['title','type','platform','status','caption','hashtags','cta','utm_link','hook','scheduled_at','emoji','grad'];
    const updates = fields.filter(f => req.body[f] !== undefined);
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'No valid fields to update' });

    const setClause = updates.map(f => `${f} = @${f}`).join(', ');
    const stmt = db.prepare(`UPDATE posts SET ${setClause}, updated_at = datetime('now') WHERE id = @id`);
    stmt.run({ ...req.body, id: req.params.id });
    const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: `Post ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
