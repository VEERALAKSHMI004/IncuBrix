// ============================================================
// IncuBrix Social Growth Engine — Database Setup
// db.js — SQLite schema + seed data using better-sqlite3
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'incubrix.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── CREATE TABLES ──────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('video','carousel','graphic')),
    platform    TEXT    NOT NULL CHECK(platform IN ('instagram','linkedin','youtube','tiktok','twitter')),
    status      TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','scheduled','published')),
    caption     TEXT,
    hashtags    TEXT,
    cta         TEXT,
    utm_link    TEXT,
    hook        TEXT,
    scheduled_at TEXT,
    emoji       TEXT    DEFAULT '📄',
    grad        TEXT    DEFAULT 'grad-1',
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    day_offset  INTEGER NOT NULL DEFAULT 0,
    time_label  TEXT    NOT NULL DEFAULT '10:00 AM',
    week_start  TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    status      TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    notes       TEXT,
    reviewed_at TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT    NOT NULL,
    icon        TEXT    NOT NULL DEFAULT '📌',
    stage_order INTEGER NOT NULL DEFAULT 0,
    count       INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS pipeline_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id    INTEGER REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    label       TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_suggestions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    text        TEXT    NOT NULL,
    platform    TEXT,
    used        INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS engine_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    input_text  TEXT    NOT NULL,
    platforms   TEXT    NOT NULL,
    asset_types TEXT    NOT NULL,
    assets_generated INTEGER DEFAULT 0,
    runtime_ms  INTEGER,
    status      TEXT    DEFAULT 'pending' CHECK(status IN ('pending','running','done','error')),
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stats (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    upcoming_posts  INTEGER DEFAULT 0,
    engagement_pct  INTEGER DEFAULT 0,
    content_created INTEGER DEFAULT 0,
    time_saved_h    INTEGER DEFAULT 0,
    updated_at      TEXT    DEFAULT (datetime('now'))
  );
`);

// ── SEED DATA (only if tables are empty) ───────────────────

const postCount = db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;

if (postCount === 0) {
  console.log('🌱  Seeding database…');

  // Seed posts
  const insertPost = db.prepare(`
    INSERT INTO posts (title, type, platform, status, caption, hashtags, cta, utm_link, hook, scheduled_at, emoji, grad)
    VALUES (@title, @type, @platform, @status, @caption, @hashtags, @cta, @utm_link, @hook, @scheduled_at, @emoji, @grad)
  `);

  const POSTS_SEED = [
    // VIDEOS (10)
    { title: 'How to repurpose 1 podcast ep into 10 assets (60s)', type: 'video', platform: 'youtube', status: 'scheduled', caption: 'Stop posting once and throwing away your content. Here\'s how one episode feeds your entire week 🎙️', hashtags: '#ContentCreator #Podcasting #RepurposeContent #CreatorEconomy', cta: 'Subscribe for weekly creator tips', utm_link: 'https://incubrix.com?utm_source=youtube&utm_medium=short&utm_campaign=repurpose_nov03', hook: 'One podcast episode → 10 pieces of content. Here\'s the exact system:', scheduled_at: '2026-11-03T10:00:00', emoji: '🎬', grad: 'grad-2' },
    { title: '60-sec creator workflow: From idea to post in under 10 min', type: 'video', platform: 'instagram', status: 'scheduled', caption: 'Your idea → polished post in 10 minutes flat. I\'ll show you my exact stack ⚡', hashtags: '#CreatorWorkflow #ContentCreation #InstagramReels #AITools', cta: 'Save this for your next content sprint', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=reel&utm_campaign=workflow_nov04', hook: 'I made this post in 10 minutes. Here\'s every tool I used:', scheduled_at: '2026-11-04T10:00:00', emoji: '⚡', grad: 'grad-1' },
    { title: 'AI content engine demo: 10 assets in 30 minutes', type: 'video', platform: 'youtube', status: 'ready', caption: 'Watch the full live demo: one blog post → 10 platform-ready assets in under 30 min 🤖', hashtags: '#AIContent #ContentEngine #CreatorTools #Automation', cta: 'Try IncuBrix free → link in bio', utm_link: 'https://incubrix.com?utm_source=youtube&utm_medium=short&utm_campaign=demo_nov05', hook: 'I gave an AI one blog post. 30 minutes later: 10 ready-to-publish assets. Watch:', scheduled_at: '2026-11-05T14:00:00', emoji: '🤖', grad: 'grad-3' },
    { title: 'Before/after: Creator who 5x\'d reach with repurposing', type: 'video', platform: 'instagram', status: 'scheduled', caption: 'From 500 views to 2,500 — without creating any new content 📈', hashtags: '#ContentStrategy #GrowthHacking #InstagramGrowth #CreatorEconomy', cta: 'Follow for the full case study series', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=reel&utm_campaign=beforeafter_nov06', hook: 'She stopped creating new content. Her reach went up 5x. Here\'s what she did:', scheduled_at: '2026-11-06T11:00:00', emoji: '📈', grad: 'grad-4' },
    { title: 'Platform-native content: Why 1 video ≠ 1 post everywhere', type: 'video', platform: 'youtube', status: 'scheduled', caption: 'Posting the same video everywhere is killing your reach. Here\'s the platform-native fix 📱', hashtags: '#PlatformStrategy #ContentMarketing #MultiPlatform #CreatorTips', cta: 'Comment your platform below', utm_link: 'https://incubrix.com?utm_source=youtube&utm_medium=short&utm_campaign=platformnative_nov07', hook: 'Same video, LinkedIn vs Instagram: 10x difference in reach. Here\'s why:', scheduled_at: '2026-11-07T09:00:00', emoji: '📱', grad: 'grad-5' },
    { title: 'Hook formula for short video: Stop the scroll in 2 seconds', type: 'video', platform: 'instagram', status: 'ready', caption: 'Your first 2 seconds decide everything. Here\'s the formula 🎯', hashtags: '#VideoHooks #ShortFormVideo #ContentTips #ReelsTips', cta: 'Save this hook formula', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=reel&utm_campaign=hookformula_nov10', hook: 'You have 2 seconds. If you say THIS, they scroll. If you say THAT, they stay:', scheduled_at: '2026-11-10T10:00:00', emoji: '🎯', grad: 'grad-6' },
    { title: 'Podcast-to-LinkedIn: The 5-step repurposing framework', type: 'video', platform: 'youtube', status: 'scheduled', caption: 'Podcast episodes are goldmines for LinkedIn content. Here\'s the 5-step system 🎙️', hashtags: '#LinkedInContent #PodcastRepurposing #B2BContent #CreatorEconomy', cta: 'Download the free framework → link in bio', utm_link: 'https://incubrix.com?utm_source=youtube&utm_medium=short&utm_campaign=podcastlinkedin_nov12', hook: 'Podcast → 5 LinkedIn posts → 10,000 extra impressions. The exact process:', scheduled_at: '2026-11-12T14:00:00', emoji: '🎙️', grad: 'grad-1' },
    { title: 'Day in the life: AI-powered creator stack walkthrough', type: 'video', platform: 'instagram', status: 'scheduled', caption: 'Every tool I use to run my content engine — all under $50/month 🌅', hashtags: '#AICreator #CreatorStack #ContentTools #DayInTheLife', cta: 'Comment your favourite tool below', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=reel&utm_campaign=dayinlife_nov14', hook: 'I run a full content operation with 3 AI tools. Here\'s my entire day:', scheduled_at: '2026-11-14T09:00:00', emoji: '🌅', grad: 'grad-2' },
    { title: 'Creator Q&A: Your biggest content questions answered', type: 'video', platform: 'youtube', status: 'ready', caption: 'I asked 500 creators their #1 content struggle. Here are the top answers ❓', hashtags: '#CreatorQA #ContentStrategy #YouTubeShorts #CreatorCommunity', cta: 'Ask your question in the comments', utm_link: 'https://incubrix.com?utm_source=youtube&utm_medium=short&utm_campaign=qanda_nov17', hook: '500 creators told me their #1 problem. The answer surprised me:', scheduled_at: '2026-11-17T11:00:00', emoji: '❓', grad: 'grad-3' },
    { title: 'The 30-minute content sprint: Batch create a week of posts', type: 'video', platform: 'instagram', status: 'scheduled', caption: '30 minutes every Sunday → a full week of content. Here\'s the sprint formula ⏱️', hashtags: '#ContentSprint #BatchCreating #ContentCalendar #CreatorProductivity', cta: 'Save this for Sunday!', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=reel&utm_campaign=sprint_nov19', hook: 'I batch a full week of content in 30 minutes. Sunday sprint method:', scheduled_at: '2026-11-19T10:00:00', emoji: '⏱️', grad: 'grad-4' },
    // CAROUSELS (10)
    { title: '5 creator mistakes killing your engagement rate', type: 'carousel', platform: 'instagram', status: 'scheduled', caption: 'Most creators repeat these 5 mistakes without realising. Swipe to audit yourself 📊', hashtags: '#CreatorMistakes #EngagementTips #InstagramMarketing #ContentCreator', cta: 'Tag a creator who needs this', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=carousel&utm_campaign=mistakes_nov03', hook: 'Slide 1: Stop making mistake #1 right now — your audience is noticing.', scheduled_at: '2026-11-03T12:00:00', emoji: '📊', grad: 'grad-5' },
    { title: '10 data-backed hooks that stop the scroll on LinkedIn', type: 'carousel', platform: 'linkedin', status: 'scheduled', caption: 'We analysed 500 top LinkedIn posts. These 10 hooks drove 80% of the engagement 🔗', hashtags: '#LinkedInTips #ContentHooks #B2BMarketing #LinkedInGrowth', cta: 'Save this and use hook #3 today', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=carousel&utm_campaign=hooks_nov04', hook: 'We studied 500 LinkedIn posts. 80% of likes came from these 10 opening lines:', scheduled_at: '2026-11-04T09:00:00', emoji: '🔗', grad: 'grad-6' },
    { title: 'Platform cheat sheet: Best formats for IG, LI, YT 2026', type: 'carousel', platform: 'instagram', status: 'ready', caption: 'The definitive 2026 format guide. Save this before you post anything this week 📋', hashtags: '#ContentFormats #SocialMediaTips #InstagramTips #ContentStrategy', cta: 'Share with your content team', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=carousel&utm_campaign=cheatsheet_nov06', hook: 'The 2026 format cheat sheet every creator needs. Updated last week:', scheduled_at: '2026-11-06T10:00:00', emoji: '📋', grad: 'grad-1' },
    { title: 'Content pillar framework: Build authority in 4 topics', type: 'carousel', platform: 'linkedin', status: 'scheduled', caption: 'Stop posting random content. Build authority with a 4-pillar framework 🏛️', hashtags: '#ContentPillars #ThoughtLeadership #LinkedInStrategy #PersonalBrand', cta: 'Comment your 4 pillars below', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=carousel&utm_campaign=pillars_nov08', hook: 'Random posting = slow growth. 4-pillar posting = authority. Here is the framework:', scheduled_at: '2026-11-08T11:00:00', emoji: '🏛️', grad: 'grad-2' },
    { title: 'Before/after: 30-day posting schedule results breakdown', type: 'carousel', platform: 'instagram', status: 'scheduled', caption: 'I posted every day for 30 days. Here are the honest results — good and bad 📅', hashtags: '#30DayChallenge #ContentResults #InstagramGrowth #CreatorJourney', cta: 'Follow for Day 31 update', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=carousel&utm_campaign=30day_nov11', hook: '30 days. 30 posts. Here is exactly what happened to my reach:', scheduled_at: '2026-11-11T10:00:00', emoji: '📅', grad: 'grad-3' },
    { title: 'Brand voice guide: Sound consistent across all platforms', type: 'carousel', platform: 'linkedin', status: 'ready', caption: 'Your audience should recognise you without seeing your name. Here is how to build that 🎨', hashtags: '#BrandVoice #ContentBranding #LinkedInContent #PersonalBrand', cta: 'Save this brand voice checklist', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=carousel&utm_campaign=brandvoice_nov13', hook: 'If I removed your name from your posts, would your audience still know it is you?', scheduled_at: '2026-11-13T09:00:00', emoji: '🎨', grad: 'grad-4' },
    { title: 'UTM tracking for creators: Know what actually works', type: 'carousel', platform: 'instagram', status: 'scheduled', caption: 'Stop guessing what drives traffic. UTM links tell you everything 🔍', hashtags: '#UTMTracking #ContentAnalytics #CreatorTools #DataDriven', cta: 'Build your first UTM link — template in bio', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=carousel&utm_campaign=utm_nov15', hook: 'I tracked every link for 30 days. 90% of my clicks came from 2 platforms:', scheduled_at: '2026-11-15T11:00:00', emoji: '🔍', grad: 'grad-5' },
    { title: 'Content flywheel: How top creators multiply each asset', type: 'carousel', platform: 'linkedin', status: 'scheduled', caption: 'The flywheel model that turns 1 piece of content into 10. Swipe for the full diagram 🔄', hashtags: '#ContentFlywheel #ContentStrategy #RepurposeContent #CreatorGrowth', cta: 'Repost if you are building your flywheel', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=carousel&utm_campaign=flywheel_nov18', hook: '1 blog post → 10 pieces of content → 5x more traffic. The flywheel explained:', scheduled_at: '2026-11-18T10:00:00', emoji: '🔄', grad: 'grad-6' },
    { title: 'Hashtag strategy 2026: What still works and what does not', type: 'carousel', platform: 'instagram', status: 'ready', caption: 'Hashtags are not dead. But 90% of creators use them wrong. Here is the 2026 guide #️⃣', hashtags: '#HashtagStrategy #InstagramGrowth #SocialMediaMarketing #ContentTips', cta: 'Save this before your next post', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=carousel&utm_campaign=hashtags_nov21', hook: 'I tested 50 hashtag combinations on the same post. The winner was not what I expected:', scheduled_at: '2026-11-21T09:00:00', emoji: '#️⃣', grad: 'grad-1' },
    { title: 'Case study: Podcast to 7 platform assets in one workflow', type: 'carousel', platform: 'linkedin', status: 'scheduled', caption: 'Full case study: one 45-min podcast episode → 7 platform-ready assets in under 1 hour 📖', hashtags: '#CaseStudy #ContentRepurposing #PodcastMarketing #ContentWorkflow', cta: 'Download the workflow template — link in bio', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=carousel&utm_campaign=casestudy_nov24', hook: 'We took one 45-minute podcast and made 7 assets from it. Here is every step:', scheduled_at: '2026-11-24T10:00:00', emoji: '📖', grad: 'grad-2' },
    // GRAPHICS (10)
    { title: 'Quote card: The best creators ship before they are ready', type: 'graphic', platform: 'instagram', status: 'scheduled', caption: '"The best creators ship before they are ready." — tag someone who needs to hear this 💬', hashtags: '#CreatorQuotes #ContentMotivation #JustStart #CreatorMindset', cta: 'Save + share with a creator friend', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=graphic&utm_campaign=quote_nov03', hook: 'This one mindset shift changed how I create content:', scheduled_at: '2026-11-03T08:00:00', emoji: '💬', grad: 'grad-3' },
    { title: 'Stats infographic: Creator economy growth 2025 to 2026', type: 'graphic', platform: 'linkedin', status: 'scheduled', caption: 'The creator economy grew 34% in 2025. Here are the numbers that matter most 📉', hashtags: '#CreatorEconomy #ContentMarketing #SocialMediaStats #CreatorTrends', cta: 'Repost to share with your network', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=graphic&utm_campaign=stats_nov05', hook: '34% growth. $250B market. Here is what the creator economy looks like in 2026:', scheduled_at: '2026-11-05T11:00:00', emoji: '📉', grad: 'grad-4' },
    { title: 'Motivational post: Consistency over Virality', type: 'graphic', platform: 'instagram', status: 'ready', caption: 'Virality is luck. Consistency is a choice. Which one are you building? 🏆', hashtags: '#ContentConsistency #CreatorMotivation #GrowthMindset #ContentCreator', cta: 'Follow for daily creator mindset posts', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=graphic&utm_campaign=consistency_nov07', hook: 'The creator who posts every week beats the one who goes viral once.', scheduled_at: '2026-11-07T08:00:00', emoji: '🏆', grad: 'grad-5' },
    { title: 'Toolkit graphic: Top 7 AI tools for creators in 2026', type: 'graphic', platform: 'linkedin', status: 'scheduled', caption: 'The 7 AI tools I use every week to run my content engine — all under $50/month 🛠️', hashtags: '#AITools #CreatorStack #ContentTools #AIForCreators', cta: 'Comment which tool you already use', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=graphic&utm_campaign=toolkit_nov09', hook: 'My full AI content stack — total cost: $47/month. Here is every tool:', scheduled_at: '2026-11-09T10:00:00', emoji: '🛠️', grad: 'grad-6' },
    { title: 'Tip card: 3 caption formulas that drive comments', type: 'graphic', platform: 'instagram', status: 'scheduled', caption: 'Most captions beg for likes. These 3 formulas earn comments instead ✍️', hashtags: '#CaptionTips #InstagramCaptions #ContentFormulas #EngagementTips', cta: 'Save this for your next caption', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=graphic&utm_campaign=captions_nov12', hook: 'Stop asking for likes. Use these 3 caption formulas to get comments:', scheduled_at: '2026-11-12T09:00:00', emoji: '✍️', grad: 'grad-1' },
    { title: 'Comparison chart: Organic vs paid reach per platform', type: 'graphic', platform: 'linkedin', status: 'ready', caption: 'Organic vs paid: where should you invest your time and budget in 2026? ⚖️', hashtags: '#OrganicGrowth #PaidSocial #ContentStrategy #SocialMediaROI', cta: 'Repost if you are going organic-first', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=graphic&utm_campaign=orgvspaid_nov15', hook: 'Platform-by-platform comparison: organic vs paid reach in 2026. Surprising results:', scheduled_at: '2026-11-15T10:00:00', emoji: '⚖️', grad: 'grad-2' },
    { title: 'Weekend checklist: 5 things creators do every Sunday', type: 'graphic', platform: 'instagram', status: 'scheduled', caption: 'Top creators do not wing it. They plan. Here is the Sunday checklist ☑️', hashtags: '#CreatorChecklist #SundayReset #ContentPlanning #CreatorRoutine', cta: 'Screenshot and tick off your Sunday list', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=graphic&utm_campaign=checklist_nov16', hook: '5 things successful creators do every Sunday. How many do you do?', scheduled_at: '2026-11-16T08:00:00', emoji: '☑️', grad: 'grad-3' },
    { title: 'Launch announcement: IncuBrix content engine now live', type: 'graphic', platform: 'linkedin', status: 'scheduled', caption: 'The IncuBrix content engine is live. Turn one input into a week of platform-ready content 🚀', hashtags: '#ProductLaunch #ContentEngine #AIContent #IncuBrix', cta: 'Try it free → link in bio', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=graphic&utm_campaign=launch_nov20', hook: 'We built a content engine that turns 1 input into 10+ assets. It is now live:', scheduled_at: '2026-11-20T09:00:00', emoji: '🚀', grad: 'grad-4' },
    { title: 'Poll graphic: Your biggest content bottleneck', type: 'graphic', platform: 'instagram', status: 'ready', caption: 'What slows you down most? Vote and see what 500+ creators said 🗳️', hashtags: '#CreatorPoll #ContentBottleneck #CreatorChallenges #ContentCreation', cta: 'Vote in comments: A, B, C or D', utm_link: 'https://incubrix.com?utm_source=instagram&utm_medium=graphic&utm_campaign=poll_nov23', hook: '500 creators voted. The #1 content bottleneck was NOT what I expected:', scheduled_at: '2026-11-23T10:00:00', emoji: '🗳️', grad: 'grad-5' },
    { title: 'Month-end recap: 30 days 30 posts real results', type: 'graphic', platform: 'linkedin', status: 'scheduled', caption: '30 days. 30 posts. 3 platforms. Here are the honest metrics — no cherry-picking 🎉', hashtags: '#ContentRecap #RealResults #CreatorJourney #30DayChallenge', cta: 'Follow for the December challenge', utm_link: 'https://incubrix.com?utm_source=linkedin&utm_medium=graphic&utm_campaign=recap_nov30', hook: '30 posts in 30 days. Here is every number — reach, clicks, sign-ups:', scheduled_at: '2026-11-30T10:00:00', emoji: '🎉', grad: 'grad-6' },
  ];

  const seedPosts = db.transaction(() => {
    const ids = [];
    POSTS_SEED.forEach(p => {
      const result = insertPost.run(p);
      ids.push(result.lastInsertRowid);
    });
    return ids;
  });

  const postIds = seedPosts();

  // Seed calendar events
  const insertCalEvent = db.prepare(`
    INSERT INTO calendar_events (post_id, day_offset, time_label)
    VALUES (?, ?, ?)
  `);
  const calData = [
    [postIds[10], 0, '10:00 AM'], [postIds[20], 0, '08:00 AM'],
    [postIds[0],  0, '01:30 PM'], [postIds[1],  1, '11:00 AM'],
    [postIds[11], 1, '09:00 AM'], [postIds[2],  2, '10:30 AM'],
    [postIds[12], 2, '02:00 PM'], [postIds[3],  3, '11:30 AM'],
    [postIds[13], 3, '03:00 PM'], [postIds[4],  4, '10:00 AM'],
    [postIds[14], 4, '04:30 PM'], [postIds[21], 5, '11:00 AM'],
    [postIds[15], 6, '06:00 PM'],
  ];
  db.transaction(() => { calData.forEach(d => insertCalEvent.run(...d)); })();

  // Seed approvals (first 5 posts as pending)
  const insertApproval = db.prepare(`INSERT INTO approvals (post_id, status) VALUES (?, 'pending')`);
  db.transaction(() => { postIds.slice(0, 5).forEach(id => insertApproval.run(id)); })();

  // Seed pipeline stages
  const insertStage = db.prepare(`INSERT INTO pipeline_stages (label, icon, stage_order, count) VALUES (?, ?, ?, ?)`);
  const stages = [
    ['Idea Generation', '💡', 0, 18],
    ['In Progress',     '✍️', 1, 12],
    ['Ready for Review','👀', 2, 7],
    ['Approved',        '✅', 3, 24],
    ['Scheduled',       '📅', 4, 30],
  ];
  const insertStageItem = db.prepare(`INSERT INTO pipeline_items (stage_id, label) VALUES (?, ?)`);
  const stageItems = [
    ['Podcast repurposing guide', 'Creator tools roundup', 'Hook formula breakdown'],
    ['LinkedIn carousel: 5 tips', 'YT Shorts script: workflow', 'Instagram Reel storyboard'],
    ['UTM links added', 'Captions finalized', 'Hashtag research done'],
    ['Brand check passed', 'Rights cleared', 'Tracking links set'],
    ['Nov 3–30 calendar filled', 'Auto-publish enabled', '3 platforms synced'],
  ];
  db.transaction(() => {
    stages.forEach(([label, icon, order, count], i) => {
      const { lastInsertRowid } = insertStage.run(label, icon, order, count);
      stageItems[i].forEach(text => insertStageItem.run(lastInsertRowid, text));
    });
  })();

  // Seed AI suggestions
  const insertSuggestion = db.prepare(`INSERT INTO ai_suggestions (text, platform) VALUES (?, ?)`);
  const suggestions = [
    ['🎙️ "How podcasters 10x their reach without extra recording time" — LinkedIn carousel', 'linkedin'],
    ['📹 "Before/after: repurposing one episode into 7 assets" — YouTube Shorts (60s)', 'youtube'],
    ['📊 "5 creator mistakes killing your engagement" — Instagram carousel', 'instagram'],
    ['🔥 "The 60-second repurposing formula" — TikTok + Reels', 'instagram'],
    ['💡 "Why most YouTubers leave 80% of growth on the table" — LinkedIn post', 'linkedin'],
    ['📱 "Platform-first vs content-first creators: who wins?" — Instagram carousel', 'instagram'],
    ['🎯 "How to build a content flywheel from one weekly video" — Thread', 'twitter'],
    ['⚡ "The creator\'s 30-minute weekly content sprint" — YouTube Shorts', 'youtube'],
    ['🚀 "From 0 to 10K: creator growth playbook" — LinkedIn article', 'linkedin'],
    ['🎬 "Day in the life: AI-powered content creator" — Instagram Reel', 'instagram'],
  ];
  db.transaction(() => { suggestions.forEach(([text, platform]) => insertSuggestion.run(text, platform)); })();

  // Seed stats
  db.prepare(`INSERT INTO stats (upcoming_posts, engagement_pct, content_created, time_saved_h) VALUES (30, 87, 30, 28)`).run();

  console.log('✅  Database seeded with 30 posts, calendar events, approvals, pipeline stages, AI suggestions.');
}

module.exports = db;
