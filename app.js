/* =============================================
   IncuBrix Social Growth Engine — App Logic
   Now connected to Express + SQLite backend
   ============================================= */

const API = 'http://localhost:3000/api';

// ── UTILS ─────────────────────────────────────

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    return json;
  } catch (err) {
    console.error(`API ${path} failed:`, err.message);
    throw err;
  }
}

function showToast(msg, type = 'info', duration = 3500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderLeftColor = type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--purple)';
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, duration);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, Team! 👋';
  if (h < 17) return 'Good afternoon, Team! ☀️';
  return 'Good evening, Team! 🌙';
}

function animateCounter(el, target, suffix = '') {
  let start = 0;
  const step = 16;
  const increment = target / (1200 / step);
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.round(start) + suffix;
  }, step);
}

// ── STATS ─────────────────────────────────────

async function loadStats() {
  try {
    const { data } = await apiFetch('/stats');
    const map = [
      ['stat-posts',      data.upcoming_posts,  ''],
      ['stat-engagement', data.engagement_pct,  '%'],
      ['stat-created',    data.content_created, ''],
      ['stat-time',       data.time_saved_h,    'h'],
    ];
    map.forEach(([id, val, suf]) => {
      const el = document.querySelector(`#${id} .stat-value`);
      if (el) animateCounter(el, val, suf);
    });

    // Update subtitles
    document.querySelector('#stat-posts .stat-change').textContent = `${data.upcoming_posts} ready-to-publish assets`;
    document.querySelector('#stat-created .stat-change').textContent = `${data.content_created} total assets created`;
  } catch (e) {
    showToast('⚠️ Could not load stats — is the server running?', 'error');
  }
}

// ── CALENDAR ──────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun', 'Sat'];

async function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  // Loading state
  grid.innerHTML = DAYS.map(() => `<div class="cal-day loading-shimmer" style="min-height:110px;border-radius:10px;"></div>`).join('');

  let events = [];
  try {
    const res = await apiFetch('/calendar');
    events = res.data;
  } catch (e) {
    // fallback to empty
  }

  grid.innerHTML = '';
  const today = new Date();
  const todayDay = today.getDay() === 0 ? 6 : today.getDay() - 1;

  DAYS.forEach((day, i) => {
    const col = document.createElement('div');
    col.className = 'cal-day' + (i === todayDay ? ' today' : '');

    const d = new Date(today);
    d.setDate(today.getDate() + (i - todayDay));
    const dateNum = d.getDate();

    col.innerHTML = `<div class="cal-day-header"><span>${day}</span><span class="day-num">${dateNum}</span></div>`;

    const dayEvents = events.filter(e => e.day_offset === i);
    dayEvents.forEach(ev => {
      const el = document.createElement('div');
      el.className = `cal-post ${ev.platform}`;
      el.innerHTML = `
        <span class="post-time">${ev.time_label}</span>
        <span>${(ev.title || '').substring(0, 28)}${(ev.title || '').length > 28 ? '…' : ''}</span>
        <span class="post-status ${ev.status}">${ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}</span>
      `;
      el.addEventListener('click', () => showToast(`📅 ${ev.title} · ${ev.platform} · ${ev.status}`));
      col.appendChild(el);
    });

    grid.appendChild(col);
  });
}

// ── APPROVALS ─────────────────────────────────

async function renderApprovals() {
  const list = document.getElementById('approval-list');
  if (!list) return;
  list.innerHTML = '<div class="loading-shimmer" style="height:50px;border-radius:8px;margin-bottom:8px;"></div>'.repeat(3);

  let items = [];
  try {
    const res = await apiFetch('/approvals?status=pending');
    items = res.data;
  } catch (e) { }

  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px;">No pending approvals 🎉</p>';
    return;
  }

  items.slice(0, 5).forEach(item => {
    const el = document.createElement('div');
    el.className = 'approval-item';
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="approval-thumb">${item.emoji || '📄'}</div>
      <div class="approval-info">
        <div class="approval-title">${item.title}</div>
        <div class="approval-meta">${item.platform} · ${item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString('en-US', {month:'short',day:'numeric'}) : 'Unscheduled'}</div>
      </div>
      <div class="approval-actions">
        <button class="approve-btn" title="Approve" data-id="${item.id}">✓</button>
        <button class="reject-btn" title="Reject" data-id="${item.id}">✕</button>
      </div>
    `;
    list.appendChild(el);
  });

  list.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id  = e.currentTarget.dataset.id;
      const row = e.currentTarget.closest('.approval-item');
      try {
        await apiFetch(`/approvals/${id}/approve`, { method: 'PATCH' });
        row.style.borderColor = 'var(--green)';
        row.style.background  = 'var(--green-dim)';
        setTimeout(() => { row.remove(); showToast('✅ Post approved and scheduled!', 'success'); loadStats(); }, 600);
      } catch { showToast('❌ Could not approve post', 'error'); }
    });
  });

  list.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id  = e.currentTarget.dataset.id;
      const row = e.currentTarget.closest('.approval-item');
      try {
        await apiFetch(`/approvals/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ notes: 'Rejected via dashboard' }) });
        row.style.borderColor = 'var(--red)';
        setTimeout(() => { row.remove(); showToast('🗑️ Post rejected and moved to drafts.'); }, 600);
      } catch { showToast('❌ Could not reject post', 'error'); }
    });
  });
}

// ── PIPELINE ──────────────────────────────────

async function renderPipeline() {
  const container = document.getElementById('pipeline-stages');
  if (!container) return;
  container.innerHTML = '<div class="loading-shimmer" style="height:100px;border-radius:10px;flex:1;"></div>'.repeat(5);

  let stages = [];
  try {
    const res = await apiFetch('/stats/pipeline');
    stages = res.data;
  } catch (e) { }

  container.innerHTML = '';
  stages.forEach(s => {
    const el = document.createElement('div');
    el.className = 'pipeline-stage';
    el.innerHTML = `
      <div class="stage-header">
        <span class="stage-icon">${s.icon}</span>
        <span class="stage-label">${s.label}</span>
        <span class="stage-count">${s.count}</span>
      </div>
      <div class="stage-body">
        ${(s.items || []).map(i => `<div class="stage-item">${i}</div>`).join('')}
      </div>
    `;
    container.appendChild(el);
  });
}

// ── POSTS GRID ────────────────────────────────

async function renderPosts(filter = 'all') {
  const grid = document.getElementById('posts-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-shimmer" style="height:220px;border-radius:12px;"></div>'.repeat(6);

  let posts = [];
  try {
    const url = filter === 'all' ? '/posts' : `/posts?type=${filter}`;
    const res = await apiFetch(url);
    posts = res.data;
  } catch (e) { }

  grid.innerHTML = '';
  posts.forEach(post => {
    const el = document.createElement('div');
    el.className = 'post-card';

    const typeLabel = post.type === 'video' ? '▶ Video' : post.type === 'carousel' ? '⊞ Carousel' : '🖼 Graphic';
    const platAvatar = getPlatformAvatarHTML(post.platform);

    el.innerHTML = `
      <div class="post-card-thumb">
        <div class="gradient-overlay ${post.grad || 'grad-1'}"></div>
        ${platAvatar}
        <div class="post-card-type">${typeLabel}</div>
        <span style="position:relative;z-index:1;font-size:28px;">${post.emoji || '📄'}</span>
      </div>
      <div class="post-card-body">
        <div class="post-card-title">${post.title}</div>
        <div class="post-card-meta">
          <span class="post-card-date">${post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'Draft'}</span>
          <span class="post-card-status ${post.status}">${post.status.charAt(0).toUpperCase()+post.status.slice(1)}</span>
        </div>
      </div>
    `;

    el.addEventListener('click', () => showToast(`📋 ${post.title} | ${post.platform} | ${post.status}`));
    grid.appendChild(el);
  });
}

function getPlatformAvatarHTML(platform) {
  const map = {
    instagram: '<div class="post-card-platform account-avatar instagram">in</div>',
    linkedin:  '<div class="post-card-platform account-avatar linkedin">Li</div>',
    youtube:   '<div class="post-card-platform account-avatar youtube">Yt</div>',
    tiktok:    '<div class="post-card-platform account-avatar tiktok">Tk</div>',
  };
  return map[platform] || '';
}

// ── PERFORMANCE CHART ─────────────────────────

async function drawChart() {
  const canvas = document.getElementById('perf-chart');
  if (!canvas) return;

  let chartData = { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], reach: [30,52,45,75,62,88,95], engagement: [18,32,28,50,40,65,72], clicks: [8,15,12,25,20,35,42] };
  try {
    const res = await apiFetch('/stats/performance');
    chartData = res.data;
  } catch (e) { }

  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300;
  const H = 160;
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const datasets = [
    { color: '#7C3AED', data: chartData.reach },
    { color: '#3B82F6', data: chartData.engagement },
    { color: '#10B981', data: chartData.clicks },
  ];

  const padL = 14, padR = 14, padT = 14, padB = 26;
  const gW = W - padL - padR;
  const gH = H - padT - padB;

  for (let i = 0; i <= 4; i++) {
    const y = padT + (gH / 4) * i;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'center';
  chartData.labels.forEach((l, i) => {
    ctx.fillText(l, padL + (i / (chartData.labels.length - 1)) * gW, H - 8);
  });

  datasets.forEach(ds => {
    const max = Math.max(...datasets.flatMap(d => d.data));
    const pts = ds.data.map((v, i) => ({
      x: padL + (i / (ds.data.length - 1)) * gW,
      y: padT + gH - (v / max) * gH,
    }));
    const grad = ctx.createLinearGradient(0, padT, 0, padT + gH);
    grad.addColorStop(0, ds.color + '30');
    grad.addColorStop(1, ds.color + '00');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, padT + gH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, padT + gH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle   = ds.color;
      ctx.fill();
      ctx.strokeStyle = '#181928';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    });
  });
}

// ── AI ASSISTANT ──────────────────────────────

async function setupAI() {
  const sendBtn = document.getElementById('ai-send');
  const input   = document.getElementById('ai-input');
  const list    = document.getElementById('suggestion-list');

  // Load initial suggestions from backend
  try {
    const res = await apiFetch('/ai/suggestions?limit=3');
    if (res.data.length) {
      list.innerHTML = '';
      res.data.forEach(s => addSuggestion(s.text, list));
    }
  } catch (e) { }

  function addSuggestion(text, targetList) {
    const li = document.createElement('li');
    li.textContent = text;
    li.style.animation = 'slideUp 0.25s ease';
    li.addEventListener('click', () => {
      navigator.clipboard?.writeText(text).catch(() => {});
      showToast('📋 Idea copied!', 'success');
    });
    (targetList || list).prepend(li);
    if (list.children.length > 6) list.removeChild(list.lastChild);
  }

  sendBtn.addEventListener('click', async () => {
    const q = input.value.trim();
    if (!q) return;
    sendBtn.disabled = true;
    sendBtn.textContent = '…';
    try {
      const res = await apiFetch('/ai/suggest', { method: 'POST', body: JSON.stringify({ query: q }) });
      addSuggestion(res.data.text);
      showToast('✨ AI idea generated!', 'success');
    } catch { showToast('❌ AI request failed', 'error'); }
    finally { sendBtn.disabled = false; sendBtn.textContent = '➤'; }
    input.value = '';
  });

  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendBtn.click(); });

  document.getElementById('generate-ideas-btn').addEventListener('click', async () => {
    try {
      const res = await apiFetch('/ai/suggestions?limit=1');
      if (res.data.length) addSuggestion(res.data[0].text);
      showToast('✨ New idea loaded from engine!', 'success');
    } catch { showToast('❌ Could not load ideas', 'error'); }
  });
}

// ── CONTENT ENGINE MODAL ──────────────────────

function setupModal() {
  const modal    = document.getElementById('modal-create');
  const openBtns = [document.getElementById('btn-create-ai'), document.getElementById('run-engine-btn')];
  const closeBtn  = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('modal-cancel');
  const runBtn    = document.getElementById('modal-run');
  const statusEl  = document.getElementById('engine-status');
  const barEl     = document.getElementById('engine-bar');
  const msgEl     = document.getElementById('engine-msg');

  const open  = () => { modal.style.display = 'flex'; statusEl.style.display = 'none'; barEl.style.width = '0%'; document.body.style.overflow = 'hidden'; };
  const close = () => { modal.style.display = 'none'; document.body.style.overflow = ''; };

  openBtns.forEach(b => b && b.addEventListener('click', open));
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  runBtn.addEventListener('click', async () => {
    const inputText = document.getElementById('engine-input').value.trim();
    if (!inputText || inputText.length < 20) {
      showToast('⚠️ Please paste at least 20 characters of content!', 'error');
      return;
    }

    const platforms = [];
    if (document.getElementById('ck-instagram').checked) platforms.push('instagram');
    if (document.getElementById('ck-linkedin').checked)  platforms.push('linkedin');
    if (document.getElementById('ck-youtube').checked)   platforms.push('youtube');
    if (document.getElementById('ck-tiktok').checked)    platforms.push('tiktok');
    if (document.getElementById('ck-twitter').checked)   platforms.push('twitter');

    const assetTypes = [];
    if (document.getElementById('ck-shorts').checked)   assetTypes.push('video');
    if (document.getElementById('ck-carousels').checked) assetTypes.push('carousel');
    if (document.getElementById('ck-captions').checked || document.getElementById('ck-cta').checked) assetTypes.push('graphic');

    statusEl.style.display = 'block';
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Running…';

    // Animate progress bar while API runs
    const ENGINE_STEPS = [
      { pct: 10, msg: '🔍 Parsing input content…' },
      { pct: 25, msg: '🧠 Extracting key themes and hooks…' },
      { pct: 40, msg: '✍️ Writing platform-specific captions…' },
      { pct: 55, msg: '📹 Generating short video scripts…' },
      { pct: 70, msg: '🖼️ Creating carousel slide outlines…' },
      { pct: 82, msg: '🔗 Generating UTM tracking links…' },
      { pct: 92, msg: '✅ Running brand voice check…' },
    ];

    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx >= ENGINE_STEPS.length) { clearInterval(stepTimer); return; }
      const s = ENGINE_STEPS[stepIdx++];
      barEl.style.width = s.pct + '%';
      msgEl.textContent = s.msg;
    }, 600);

    try {
      const res = await apiFetch('/ai/engine', {
        method: 'POST',
        body: JSON.stringify({ input_text: inputText, platforms, asset_types: assetTypes }),
      });

      clearInterval(stepTimer);
      barEl.style.width = '100%';
      msgEl.textContent = `🎉 ${res.assets_generated} assets generated in ${res.runtime_ms}ms!`;

      showToast(`🚀 ${res.assets_generated} new assets added to your library!`, 'success', 5000);
      setTimeout(() => { close(); renderPosts(); loadStats(); }, 2500);
    } catch (err) {
      clearInterval(stepTimer);
      barEl.style.width = '0%';
      msgEl.textContent = `❌ Engine error: ${err.message}`;
      showToast('❌ Content engine failed — check server', 'error');
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = '⚡ Generate Assets';
    }
  });
}

// ── POST FILTERS ──────────────────────────────

function setupPostFilters() {
  document.querySelectorAll('.post-filter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.post-filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      renderPosts(e.currentTarget.dataset.filter);
    });
  });
}

// ── SIDEBAR ───────────────────────────────────

function setupSidebar() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const main    = document.querySelector('.main-content');
  let isMobile  = window.innerWidth <= 900;

  toggle.addEventListener('click', () => {
    if (isMobile) sidebar.classList.toggle('mobile-open');
    else { sidebar.classList.toggle('collapsed'); main.classList.toggle('expanded'); }
  });

  window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 900;
    if (!isMobile) sidebar.classList.remove('mobile-open');
  });
}

// ── NAV ───────────────────────────────────────

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function ensureWorkspaceView() {
  let view = document.getElementById('workspace-view');
  if (!view) {
    view = document.createElement('div');
    view.id = 'workspace-view';
    view.className = 'page-content';
    view.style.display = 'none';
    document.querySelector('.main-content').appendChild(view);
  }
  return view;
}

function workspaceHeader(title, subtitle, action = '') {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:24px"><div><h1 style="font-size:25px;margin:0 0 7px;color:var(--text-primary)">${title}</h1><p style="margin:0;color:var(--text-muted);font-size:13px">${subtitle}</p></div>${action}</div>`;
}

async function showWorkspacePage(page) {
  const dashboard = document.getElementById('page-dashboard');
  const view = ensureWorkspaceView();
  if (page === 'dashboard') {
    dashboard.style.display = '';
    view.style.display = 'none';
    return;
  }
  dashboard.style.display = 'none';
  view.style.display = 'block';
  view.innerHTML = '<div class="loading-shimmer" style="height:140px;border-radius:12px"></div>';

  const openEngine = `<button class="btn-create" id="workspace-create">✨ Create with AI</button>`;
  try {
    if (page === 'studio' || page === 'engine') {
      view.innerHTML = workspaceHeader(page === 'studio' ? 'Content Studio' : 'Content Engine', page === 'studio' ? 'Create and repurpose content for your selected social platforms.' : 'Turn one long-form input into platform-specific content assets.', openEngine) + `<div class="stat-card" style="display:block;padding:24px"><h3 style="margin-top:0">Repurpose your content</h3><p style="color:var(--text-muted)">Use the existing generation workflow to create drafts. Generated assets are saved to your content library.</p><button class="btn-secondary" id="workspace-create-secondary">⚡ Open content generator</button></div>`;
      document.getElementById('workspace-create').onclick = () => document.getElementById('btn-create-ai').click();
      document.getElementById('workspace-create-secondary').onclick = () => document.getElementById('btn-create-ai').click();
      return;
    }

    if (page === 'posts' || page === 'planner') {
      const res = await apiFetch('/posts');
      const posts = res.data || [];
      const cards = posts.length ? posts.map(post => `<article class="post-card" style="padding:16px"><div class="post-card-title">${escapeHTML(post.title || 'Untitled asset')}</div><div class="post-card-meta" style="margin-top:10px"><span>${escapeHTML(post.platform || 'Platform not set')} · ${escapeHTML(post.type || 'content')}</span><span class="post-card-status ${escapeHTML(post.status || 'draft')}">${escapeHTML(post.status || 'draft')}</span></div><p style="font-size:12px;color:var(--text-muted);margin:10px 0 0">${post.scheduled_at ? 'Scheduled: '+escapeHTML(new Date(post.scheduled_at).toLocaleString()) : 'Not scheduled'}</p></article>`).join('') : '<p style="color:var(--text-muted)">No saved assets yet. Create content with AI to populate this section.</p>';
      view.innerHTML = workspaceHeader(page === 'posts' ? 'Posts Library' : 'Content Planner', page === 'posts' ? `${posts.length} saved assets from your content library.` : 'Review saved content and its current scheduling status.', openEngine) + `<div class="posts-grid">${cards}</div>`;
      document.getElementById('workspace-create').onclick = () => document.getElementById('btn-create-ai').click();
      return;
    }

    if (page === 'calendar') {
      view.innerHTML = workspaceHeader('Publishing Calendar', 'Your current weekly publishing schedule.') + `<section class="calendar-section"><div class="calendar-grid" id="workspace-calendar-grid"></div></section>`;
      const oldGrid = document.getElementById('calendar-grid');
      const target = document.getElementById('workspace-calendar-grid');
      const eventsRes = await apiFetch('/calendar');
      const events = eventsRes.data || [];
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      target.innerHTML = days.map((day, i) => `<div class="cal-day"><div class="cal-day-header"><span>${day}</span></div>${events.filter(ev => ev.day_offset === i).map(ev => `<div class="cal-post ${escapeHTML(ev.platform)}"><span>${escapeHTML(ev.time_label || '')}</span><span>${escapeHTML(ev.title || '')}</span><span class="post-status ${escapeHTML(ev.status || '')}">${escapeHTML(ev.status || '')}</span></div>`).join('')}</div>`).join('');
      return;
    }

    if (page === 'approvals') {
      const res = await apiFetch('/approvals?status=pending');
      const items = res.data || [];
      view.innerHTML = workspaceHeader('Approval Queue', `${items.length} items currently awaiting review.`) + (items.length ? `<div class="approval-list">${items.map(item => `<div class="approval-item" data-id="${escapeHTML(item.id)}"><div class="approval-thumb">${escapeHTML(item.emoji || '📄')}</div><div class="approval-info"><div class="approval-title">${escapeHTML(item.title || 'Untitled')}</div><div class="approval-meta">${escapeHTML(item.platform || '')}</div></div><div class="approval-actions"><button class="approve-btn" data-id="${escapeHTML(item.id)}">✓</button><button class="reject-btn" data-id="${escapeHTML(item.id)}">✕</button></div></div>`).join('')}</div>` : '<p style="color:var(--text-muted)">No pending approvals.</p>');
      view.querySelectorAll('.approve-btn').forEach(btn => btn.onclick = async () => { try { await apiFetch(`/approvals/${btn.dataset.id}/approve`, {method:'PATCH'}); showToast('Post approved','success'); showWorkspacePage('approvals'); } catch { showToast('Could not approve post','error'); } });
      view.querySelectorAll('.reject-btn').forEach(btn => btn.onclick = async () => { try { await apiFetch(`/approvals/${btn.dataset.id}/reject`, {method:'PATCH',body:JSON.stringify({notes:'Rejected via dashboard'})}); showToast('Post rejected','success'); showWorkspacePage('approvals'); } catch { showToast('Could not reject post','error'); } });
      return;
    }

    if (page === 'analytics') {
      const res = await apiFetch('/stats');
      const d = res.data || {};
      const metrics = [['Upcoming posts', d.upcoming_posts ?? '—'],['Engagement rate', d.engagement_pct == null ? '—' : d.engagement_pct+'%'],['Content created', d.content_created ?? '—'],['Time saved', d.time_saved_h == null ? '—' : d.time_saved_h+'h']];
      view.innerHTML = workspaceHeader('Analytics', 'Current metrics returned by your local dashboard backend.') + `<div class="stats-grid">${metrics.map(([label,value]) => `<div class="stat-card"><div class="stat-body"><span class="stat-label">${label}</span><span class="stat-value">${escapeHTML(value)}</span></div></div>`).join('')}</div><p style="color:var(--text-muted);font-size:12px;margin-top:18px">These are backend dashboard metrics; they are not verified social-platform analytics unless connected to real platform data.</p>`;
      return;
    }

    if (page === 'launch' || page === 'brand') {
      const isLaunch = page === 'launch';
      view.innerHTML = workspaceHeader(isLaunch ? 'Launch Kit' : 'Brand Voice', isLaunch ? 'A workspace for your rollout plan and publishing checklist.' : 'Brand guidelines workspace.') + `<div class="stat-card" style="display:block;padding:24px"><h3 style="margin-top:0">${isLaunch ? 'Launch readiness checklist' : 'Brand voice guidelines'}</h3><ul style="color:var(--text-muted);line-height:2;padding-left:20px">${(isLaunch ? ['Confirm target audience and platform priorities','Review and approve all generated assets','Add real publishing dates and owners','Use tracking links and review results after publishing'] : ['Use a clear, helpful, creator-focused tone','Keep claims factual and avoid invented metrics or testimonials','Review every caption, hashtag and call to action before publishing','Check platform-specific length and formatting']).map(x=>`<li>${x}</li>`).join('')}</ul><p style="font-size:12px;color:var(--text-muted)">This is a planning checklist; no external publishing or brand verification is performed here.</p></div>`;
      return;
    }
  } catch (err) {
    view.innerHTML = workspaceHeader('Unable to load this section', 'Check that the IncuBrix backend is running, then try again.') + `<p style="color:var(--red)">${escapeHTML(err.message)}</p><button class="btn-secondary" id="workspace-retry">Retry</button>`;
    document.getElementById('workspace-retry').onclick = () => showWorkspacePage(page);
  }
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      showWorkspacePage(item.dataset.page);
    });
  });
}

// ── CALENDAR NAV ──────────────────────────────

function setupCalendarNav() {
  let weekOffset = 0;

  function updateRange() {
    const base = new Date();
    base.setDate(base.getDate() - (base.getDay() === 0 ? 6 : base.getDay() - 1));
    base.setDate(base.getDate() + weekOffset * 7);
    const end = new Date(base);
    end.setDate(base.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('cal-range').textContent = `${fmt(base)} – ${fmt(end)}, ${end.getFullYear()}`;
  }

  document.getElementById('cal-prev').addEventListener('click',  () => { weekOffset--; updateRange(); renderCalendar(); });
  document.getElementById('cal-next').addEventListener('click',  () => { weekOffset++; updateRange(); renderCalendar(); });
  document.getElementById('cal-today').addEventListener('click', () => { weekOffset = 0; updateRange(); renderCalendar(); });
  document.getElementById('add-content-btn').addEventListener('click', () => document.getElementById('btn-create-ai').click());
}

// ── INIT ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('greeting-text').textContent = getGreeting();

  // Check if server is running
  try {
    await apiFetch('/health');
    showToast('✅ Connected to IncuBrix backend!', 'success', 2500);
  } catch {
    showToast('⚠️ Server not reachable — run: npm start', 'error', 6000);
  }

  // Load all data
  await Promise.all([
    loadStats(),
    renderCalendar(),
    renderApprovals(),
    renderPipeline(),
    renderPosts(),
  ]);

  setTimeout(drawChart, 120);
  window.addEventListener('resize', drawChart);

  setupAI();
  setupModal();
  setupPostFilters();
  setupSidebar();
  setupNav();
  setupCalendarNav();

  console.log('%c IncuBrix Social Growth Engine ', 'background:#7C3AED;color:white;font-size:14px;padding:6px 14px;border-radius:6px;font-weight:bold;');
  console.log('%c Backend: http://localhost:3000/api', 'color:#A78BFA;');
});
