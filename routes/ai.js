// ============================================================
// IncuBrix — Routes: AI Assistant + Content Engine
// routes/ai.js
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/ai/suggestions — get random unused suggestions
router.get('/suggestions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const suggestions = db.prepare(`
      SELECT * FROM ai_suggestions
      WHERE used = 0
      ORDER BY RANDOM()
      LIMIT ?
    `).all(limit);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/suggest — ask AI assistant a question (simulated)
router.post('/suggest', (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: 'query is required' });

    // Simulated AI response based on keywords
    const q = query.toLowerCase();
    let response;
    if (q.includes('hook') || q.includes('scroll')) {
      response = `🎯 Hook idea: "You're losing ${Math.floor(Math.random()*30+40)}% of your audience in the first 2 seconds — here's the fix:" — try this as your next video opener`;
    } else if (q.includes('linkedin') || q.includes('b2b')) {
      response = `🔗 LinkedIn idea: "The creator framework that drives B2B leads without paid ads" — post this as a 7-slide carousel on ${getNextWeekday()}`;
    } else if (q.includes('instagram') || q.includes('reel')) {
      response = `📱 Instagram Reel idea: "POV: You batch created a week of content in 30 minutes" — shoot this as a screen-record day-in-the-life`;
    } else if (q.includes('podcast') || q.includes('audio')) {
      response = `🎙️ Podcast repurposing idea: Take your latest episode and pull the 3 most quotable lines → 3 LinkedIn posts + 1 carousel`;
    } else if (q.includes('hashtag') || q.includes('#')) {
      response = `#️⃣ Hashtag strategy: Mix 3 large (500K+ posts) + 5 medium (50K–500K) + 3 niche (<50K) per post for maximum discoverability`;
    } else {
      const ideas = [
        `💡 Content idea based on "${query.substring(0,30)}…": Break it into a 5-slide carousel with a bold hook on slide 1`,
        `🔥 Hot take format: "Unpopular opinion about ${query.substring(0,20)}…" — works great on LinkedIn and X`,
        `📊 Data-backed post: "We tested ${query.substring(0,20)}… 10 times. Here are the results:" — add a chart graphic`,
        `🎬 60-second video script: Open with the problem, show the solution in 3 steps, end with your CTA`,
      ];
      response = ideas[Math.floor(Math.random() * ideas.length)];
    }

    // Save the generated suggestion
    const result = db.prepare(`INSERT INTO ai_suggestions (text, platform) VALUES (?, 'all')`).run(response);
    res.json({ success: true, data: { id: result.lastInsertRowid, text: response } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/engine — run the content engine on a long-form input
router.post('/engine', (req, res) => {
  try {
    const { input_text, platforms, asset_types } = req.body;
    if (!input_text || input_text.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'input_text must be at least 20 characters' });
    }

    const platformList  = platforms  || ['instagram','linkedin','youtube'];
    const assetTypeList = asset_types || ['video','carousel','graphic'];

    // Log the engine run
    const runResult = db.prepare(`
      INSERT INTO engine_runs (input_text, platforms, asset_types, status)
      VALUES (?, ?, ?, 'running')
    `).run(input_text.substring(0,500), JSON.stringify(platformList), JSON.stringify(assetTypeList));
    const runId = runResult.lastInsertRowid;

    // Simulate content engine: generate assets from the input
    const startTime = Date.now();
    const generated = [];
    const snippets   = extractSnippets(input_text);

    const ENGINE_STEPS = [
      { step: 1, label: 'Parsing input content',            pct: 10 },
      { step: 2, label: 'Extracting key themes and hooks',  pct: 25 },
      { step: 3, label: 'Writing platform-specific captions', pct: 40 },
      { step: 4, label: 'Generating short video scripts',   pct: 55 },
      { step: 5, label: 'Creating carousel slide outlines', pct: 70 },
      { step: 6, label: 'Generating UTM tracking links',    pct: 82 },
      { step: 7, label: 'Running brand voice check',        pct: 92 },
      { step: 8, label: 'Export complete',                  pct: 100 },
    ];

    // Generate one asset per platform+type combo
    const templates = buildAssetTemplates(snippets, platformList, assetTypeList);
    templates.forEach(t => {
      const stmt = db.prepare(`
        INSERT INTO posts (title, type, platform, status, caption, hashtags, cta, utm_link, hook, emoji, grad)
        VALUES (@title, @type, @platform, 'draft', @caption, @hashtags, @cta, @utm_link, @hook, @emoji, @grad)
      `);
      const r = stmt.run(t);
      generated.push({ id: r.lastInsertRowid, ...t });
    });

    const runtimeMs = Date.now() - startTime;

    // Mark run complete
    db.prepare(`
      UPDATE engine_runs SET status = 'done', assets_generated = ?, runtime_ms = ? WHERE id = ?
    `).run(generated.length, runtimeMs, runId);

    res.json({
      success: true,
      run_id: runId,
      assets_generated: generated.length,
      runtime_ms: runtimeMs,
      steps: ENGINE_STEPS,
      data: generated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ai/engine/runs — list past engine runs
router.get('/engine/runs', (req, res) => {
  try {
    const runs = db.prepare('SELECT * FROM engine_runs ORDER BY created_at DESC LIMIT 20').all();
    res.json({ success: true, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── HELPERS ──────────────────────────────────────────────

function getNextWeekday() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function extractSnippets(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const words     = text.split(/\s+/).filter(w => w.length > 4);
  const keyword   = words[Math.floor(Math.random() * Math.min(words.length, 10))] || 'content';
  const hook      = sentences[0] ? sentences[0].trim().substring(0, 80) : 'Here is what you need to know:';
  return { sentences, words, keyword, hook };
}

function buildAssetTemplates(snippets, platforms, types) {
  const { keyword, hook } = snippets;
  const assets = [];
  const grads  = ['grad-1','grad-2','grad-3','grad-4','grad-5','grad-6'];
  const emojis = ['🎬','📊','💡','🔥','⚡','🎯','🚀','📱','🎙️','✍️','📈','🔗'];

  const typeMap = {
    video:    { label: 'Short Video Script (60s)', emoji: '🎬', pf: ['youtube','instagram'] },
    carousel: { label: 'Carousel',                 emoji: '📊', pf: ['instagram','linkedin'] },
    graphic:  { label: 'Graphic / Quote Card',     emoji: '🖼️', pf: ['instagram','linkedin'] },
  };

  let i = 0;
  platforms.forEach(platform => {
    types.forEach(type => {
      if (!typeMap[type]) return;
      const g = grads[i % grads.length];
      const e = emojis[i % emojis.length];
      const utmCampaign = `engine_${Date.now()}_${i}`;
      assets.push({
        title:        `[AI] ${typeMap[type].label}: ${keyword.substring(0,30)} — ${platform}`,
        type,
        platform,
        status:       'draft',
        caption:      `${hook} 🔥 Generated by IncuBrix Content Engine`,
        hashtags:     `#ContentCreator #${platform.charAt(0).toUpperCase()+platform.slice(1)} #AIContent #CreatorEconomy #IncuBrix`,
        cta:          'Follow for more creator tools → link in bio',
        utm_link:     `https://incubrix.com?utm_source=${platform}&utm_medium=${type}&utm_campaign=${utmCampaign}`,
        hook:         `${hook.substring(0,60)}…`,
        emoji:        e,
        grad:         g,
      });
      i++;
    });
  });

  return assets;
}

module.exports = router;
