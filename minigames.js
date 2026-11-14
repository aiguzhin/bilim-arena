// Мини-игры: «Блиц» (60 секунд), «Выживание» (3 жизни), «Верно или нет» (60 секунд).
// Вопросы и проверка — на сервере: правильный ответ не уходит в браузер, пока игрок не ответил.
const crypto = require('crypto');

const MODES = {
  blitz: { seconds: 60 },
  survival: { lives: 3, perQ: 20 },
  tf: { seconds: 60 }
};
const TZ_MS = 5 * 3600 * 1000;
const dayStart = () => { const d = new Date(Date.now() + TZ_MS); d.setUTCHours(0, 0, 0, 0); return new Date(d.getTime() - TZ_MS).toISOString(); };
const weekStart = () => new Date(Date.now() - 7 * 864e5).toISOString();

module.exports = function (app, { db, auth, wrap, BANK, QUICK, shuffle }) {
  const games = new Map();
  setInterval(() => { const now = Date.now(); for (const [id, g] of games) if (now - g.touched > 30 * 60 * 1000) games.delete(id); }, 5 * 60 * 1000);

  const pool = (subject, lang) => {
    const list = QUICK[subject].filter(q => q.t[lang] && q.o[lang]);
    return shuffle((list.length >= 20 ? list : QUICK[subject]).slice());
  };
  function nextQ(g) {
    if (!g.pool.length) g.pool = pool(g.subject, g.lang);
    const q = g.pool.pop();
    const order = shuffle([0, 1, 2, 3]);
    const pick = o => (o[g.lang] || o.ru);
    const opts = order.map(i => pick(q.o)[i]);
    const a = order.indexOf(q.a);
    g.cur = { t: pick(q.t), o: opts, a, e: q.e ? pick(q.e) : null, img: q.img || null, at: Date.now(), tp: q.tp || null };
    if (g.mode === 'tf') {
      // Утверждение: вопрос + один вариант. В половине случаев вариант верный.
      g.cur.show = Math.random() < 0.5 ? a : shuffle([0, 1, 2, 3].filter(i => i !== a))[0];
      g.cur.truth = g.cur.show === a;
    }
    g.n += 1;
    return view(g);
  }
  const view = g => ({ n: g.n, t: g.cur.t, img: g.cur.img, ...(g.mode === 'tf' ? { claim: g.cur.o[g.cur.show] } : { o: g.cur.o }) });
  const state = g => ({ id: g.id, mode: g.mode, score: g.score, lives: g.lives, endsAt: g.endsAt || null, qEndsAt: g.mode === 'survival' ? g.cur.at + MODES.survival.perQ * 1000 : null });
  const timeUp = g => g.endsAt && Date.now() > g.endsAt + 1500;

  async function finish(g) {
    if (g.done) return g.result;
    g.done = true;
    const best = await db.miniBest(g.pid, g.mode).catch(() => 0);
    if (g.n > 1 || g.score > 0) {
      await db.addMini({ player_id: g.pid, mode: g.mode, subject: g.subject, score: g.score, correct: g.correct, total: g.answered }).catch(console.error);
      if (g.answered) await db.logPractice(g.pid, g.answered, g.correct).catch(() => {});
    }
    g.result = { score: g.score, correct: g.correct, answered: g.answered, best: Math.max(best, g.score), record: g.score > best };
    return g.result;
  }

  app.post('/api/mini/start', auth, wrap(async (req, res) => {
    const { mode, subject, lang } = req.body || {};
    if (!MODES[mode] || !BANK[subject] || !QUICK[subject]?.length) return res.status(400).json({ error: 'bad' });
    const g = {
      id: crypto.randomBytes(9).toString('base64url'), pid: req.player.id, mode, subject, lang: ['ru', 'kk', 'en'].includes(lang) ? lang : 'ru',
      score: 0, correct: 0, answered: 0, n: 0, lives: mode === 'survival' ? MODES.survival.lives : null, touched: Date.now(), done: false
    };
    g.pool = pool(subject, g.lang);
    if (MODES[mode].seconds) g.endsAt = Date.now() + MODES[mode].seconds * 1000;
    games.set(g.id, g);
    const q = nextQ(g);
    res.json({ ...state(g), q, best: await db.miniBest(g.pid, mode).catch(() => 0) });
  }));

  app.post('/api/mini/answer', auth, wrap(async (req, res) => {
    const g = games.get(String(req.body?.id || ''));
    if (!g || g.pid !== req.player.id) return res.status(404).json({ error: 'gone' });
    g.touched = Date.now();
    if (g.done) return res.json({ ...state(g), done: true, result: g.result });
    if (timeUp(g)) return res.json({ ...state(g), done: true, result: await finish(g) });
    const c = g.cur;
    let ok;
    if (g.mode === 'tf') ok = typeof req.body.tf === 'boolean' && req.body.tf === c.truth;
    else ok = Number.isInteger(req.body.choice) && req.body.choice === c.a;
    if (g.mode === 'survival' && Date.now() - c.at > (MODES.survival.perQ + 2) * 1000) ok = false;
    g.answered += 1;
    if (c.tp) db.topicAdd(g.pid, `${g.subject}:${c.tp}`, ok).catch(() => {});
    if (ok) { g.correct += 1; g.score += 1; }
    else if (g.mode === 'survival') g.lives -= 1;
    const reveal = { ok, a: c.a, e: c.e, ...(g.mode === 'tf' ? { truth: c.truth, right: c.o[c.a] } : {}) };
    const over = (g.mode === 'survival' && g.lives <= 0) || timeUp(g);
    if (over) return res.json({ ...state(g), reveal, done: true, result: await finish(g) });
    const q = nextQ(g);
    res.json({ ...state(g), reveal, q });
  }));

  app.post('/api/mini/finish', auth, wrap(async (req, res) => {
    const g = games.get(String(req.body?.id || ''));
    if (!g || g.pid !== req.player.id) return res.status(404).json({ error: 'gone' });
    res.json({ ...state(g), done: true, result: await finish(g) });
  }));

  // Вопрос дня: один и тот же для всех, порядок вариантов тоже одинаковый.
  const DAILY_SUBJ = ['history', 'mathlit', 'math', 'physics', 'informatics', 'chemistry', 'biology', 'geography', 'worldhistory', 'law', 'english'].filter(k => QUICK[k]?.length);
  const hash = str => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
  function daily(lang) {
    const day = new Date(Date.now() + TZ_MS).toISOString().slice(0, 10);
    const n = Math.floor((Date.now() + TZ_MS) / 864e5);
    const subj = DAILY_SUBJ[n % DAILY_SUBJ.length];
    const list = QUICK[subj].filter(q => q.t.ru && q.t.kk && q.o.ru && q.o.kk);
    const src = (list.length ? list : QUICK[subj])[hash(day) % (list.length || QUICK[subj].length)];
    const order = [0, 1, 2, 3].sort((a, b) => hash(day + a) - hash(day + b));
    const L = o => (o && (o[lang] || o.ru));
    return { day, subject: L(BANK[subj].name), q: { t: L(src.t), o: order.map(i => L(src.o)[i]), img: src.img || null }, a: order.indexOf(src.a), e: src.e ? L(src.e) : null };
  }
  const dLang = l => (['ru', 'kk'].includes(l) ? l : 'ru');
  app.get('/api/daily', auth, wrap(async (req, res) => {
    const d = daily(dLang(req.query.lang));
    const mine = await db.dailyGet(d.day, req.player.id);
    res.json({ day: d.day, subject: d.subject, q: d.q, mine: mine ? { choice: mine.choice, ok: mine.ok, a: d.a, e: d.e } : null, stat: mine ? await db.dailyStat(d.day) : null });
  }));
  app.post('/api/daily', auth, wrap(async (req, res) => {
    const d = daily(dLang(req.body?.lang));
    const choice = Number.isInteger(req.body?.choice) && req.body.choice >= 0 && req.body.choice < 4 ? req.body.choice : -1;
    if (choice < 0) return res.status(400).json({ error: 'bad' });
    if (await db.dailyAdd(d.day, req.player.id, choice, choice === d.a)) await db.logPractice(req.player.id, 1, choice === d.a ? 1 : 0).catch(() => {});
    const mine = await db.dailyGet(d.day, req.player.id);
    res.json({ mine: { choice: mine.choice, ok: mine.ok, a: d.a, e: d.e }, stat: await db.dailyStat(d.day) });
  }));

  app.get('/api/mini/top', auth, wrap(async (req, res) => {
    const mode = MODES[req.query.mode] ? req.query.mode : 'blitz';
    const [today, week, best] = await Promise.all([db.miniTop(mode, dayStart()), db.miniTop(mode, weekStart()), db.miniBest(req.player.id, mode)]);
    res.json({ mode, today, week, best });
  }));
};
