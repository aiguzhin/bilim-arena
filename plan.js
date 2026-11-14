// План подготовки (цель и дата ЕНТ, дневная норма) и отчёт для родителей по закрытой ссылке.
const crypto = require('crypto');

const TZ_MS = 5 * 3600 * 1000, DAY = 864e5;
const dayOf = t => new Date(new Date(t).getTime() + TZ_MS).toISOString().slice(0, 10);
const DAILY = 15; // вопросов в день
const valid = r => !r.flag || r.cleared;

module.exports = function (app, { db, auth, wrap, edu, BANK }) {
  const planOf = async pid => (await db.kvGet('plan:' + pid))?.val || null;

  // Сколько вопросов решено по дням: тренировки (включая мини-игры и вопрос дня), пробные ЕНТ, турниры.
  function perDay(rows) {
    const m = {};
    const add = (at, n) => { if (at) m[dayOf(at)] = (m[dayOf(at)] || 0) + n; };
    for (const x of rows.practice) add(x.created_at, x.n || 0);
    for (const t of rows.mocks) add(t.finished_at, 120);
    for (const e of rows.entries) add(e.finished_at, e.max || 0);
    return m;
  }
  async function summary(player) {
    const [plan, rows, topics, ach] = await Promise.all([planOf(player.id), db.rows([player.id]), edu.topicStats(player.id), edu.achievementsOf(player)]);
    const mocks = rows.mocks.filter(t => t.score != null && valid(t) && t.score > 0).sort((a, b) => a.finished_at.localeCompare(b.finished_at));
    const days = perDay(rows);
    const week = Array.from({ length: 7 }, (_, i) => { const d = dayOf(Date.now() - (6 - i) * DAY); return { d, n: days[d] || 0 }; });
    const subj = {};
    for (const t of mocks) for (const s of t.result?.subjects || []) { const x = subj[s.k] ||= { got: 0, max: 0 }; x.got += s.score; x.max += s.max; }
    const left = plan?.date ? Math.ceil((new Date(plan.date + 'T00:00:00Z').getTime() - new Date(dayOf(Date.now()) + 'T00:00:00Z').getTime()) / DAY) : null;
    return {
      plan: plan ? { target: plan.target, date: plan.date, left } : null,
      daily: { need: DAILY, done: days[dayOf(Date.now())] || 0 },
      last: mocks.length ? mocks[mocks.length - 1].score : null,
      best: mocks.length ? Math.max(...mocks.map(t => t.score)) : null,
      mocks: mocks.slice(-12).map(t => ({ at: t.finished_at, score: t.score })),
      subjects: Object.entries(subj).map(([k, x]) => ({ k, name: BANK[k]?.name, pct: x.max ? Math.round(x.got / x.max * 100) : 0 })).sort((a, b) => a.pct - b.pct),
      weak: edu.weakTopics(topics, 4),
      streak: ach.streak, week
    };
  }

  app.get('/api/plan', auth, wrap(async (req, res) => res.json(await summary(req.player))));
  app.post('/api/plan', auth, wrap(async (req, res) => {
    const target = Math.round(Number(req.body?.target)), date = String(req.body?.date || '');
    const ts = new Date(date + 'T00:00:00Z').getTime();
    if (!(target >= 50 && target <= 140)) return res.status(400).json({ error: 'planTarget' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(ts) || ts < Date.now() - DAY || ts > Date.now() + 800 * DAY) return res.status(400).json({ error: 'planDate' });
    await db.kvSet('plan:' + req.player.id, { target, date });
    res.json(await summary(req.player));
  }));

  // Ссылка для родителей: без входа, только учебные показатели. Ученик может создать её и отключить.
  const tokenOf = async pid => (await db.kvGet('parentOf:' + pid))?.val?.token || null;
  app.get('/api/parent/link', auth, wrap(async (req, res) => res.json({ token: await tokenOf(req.player.id) })));
  app.post('/api/parent/link', auth, wrap(async (req, res) => {
    let token = await tokenOf(req.player.id);
    if (!token) {
      token = crypto.randomBytes(18).toString('base64url');
      await db.kvSet('parent:' + token, { pid: req.player.id });
      await db.kvSet('parentOf:' + req.player.id, { token });
    }
    res.json({ token });
  }));
  app.delete('/api/parent/link', auth, wrap(async (req, res) => {
    const token = await tokenOf(req.player.id);
    if (token) { await db.kvSet('parent:' + token, { pid: null }); await db.kvSet('parentOf:' + req.player.id, { token: null }); }
    res.json({ token: null });
  }));
  app.get('/api/parent/:token', wrap(async (req, res) => {
    const token = String(req.params.token || '');
    const pid = /^[\w-]{20,40}$/.test(token) ? (await db.kvGet('parent:' + token))?.val?.pid : null;
    const p = pid ? await db.get(pid) : null;
    if (!p || !p.username) return res.status(404).json({ error: 'notfound' });
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.json({ name: p.name, school: p.school, city: p.city, ...(await summary(p)) });
  }));
};
