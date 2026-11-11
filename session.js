// «Национальный пробный ЕНТ»: запись как на настоящий ЕНТ, общий старт для всех и результат в виде сертификата.
const crypto = require('crypto');

const TZ_MS = 5 * 3600 * 1000;          // Астана, UTC+5
const DURATION = 240 * 60 * 1000;       // 4 часа, как на ЕНТ
const REG_CLOSE = 60 * 60 * 1000;       // запись закрывается за час до начала
const ROOM_OPEN = 15 * 60 * 1000;       // зал ожидания открывается за 15 минут
const LATE = 30 * 60 * 1000;            // опоздавших пускаем в первые 30 минут, но конец у всех общий
// Расписание как на ЕНТ: каждый день три смены — 10:00, 14:00 и 18:00 по Астане; запись открыта на две недели вперёд.
const SHIFTS_UTC = [5, 9, 13];
const DAYS_AHEAD = 14;

module.exports = function mount(app, { db, auth, wrap, store, mock, COMBOS, LANGS, finishMock }) {
  const pu = p => (p.photo_v && p.username ? `/p/${p.username}?v=${p.photo_v.slice(0, 8)}` : null);
  const ms = v => new Date(v).getTime();
  const phase = (x, now = Date.now()) => now < ms(x.reg_until) ? 'reg' : now < ms(x.starts_at) - ROOM_OPEN ? 'closed' : now < ms(x.starts_at) ? 'room' : now < ms(x.starts_at) + LATE ? 'live' : now < ms(x.ends_at) ? 'running' : 'done';
  const card = x => ({ id: x.id, kind: x.kind, title: x.title || '', startsAt: ms(x.starts_at), endsAt: ms(x.ends_at), regUntil: ms(x.reg_until), lateUntil: ms(x.starts_at) + LATE, roomAt: ms(x.starts_at) - ROOM_OPEN, count: x.count ?? null, phase: phase(x), school: x.school || null, mine: x.created_by || null });
  const regCard = r => r && ({ ikt: r.ikt, combo: r.combo, lang: r.lang, mockId: r.mock_id || null, createdAt: r.created_at });

  async function ensureWeekly() {
    const now = Date.now(), local = new Date(now + TZ_MS);
    for (let d = 0; d <= DAYS_AHEAD; d++) for (const hourUtc of SHIFTS_UTC) {
      const at = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + d, hourUtc));
      if (at.getTime() - REG_CLOSE < now) continue;
      const id = `s-${at.toISOString().slice(0, 13)}`;
      if (await db.getEntSession(id)) continue;
      await db.createEntSession({ id, kind: 'weekly', starts_at: at.toISOString(), ends_at: new Date(at.getTime() + DURATION).toISOString(), reg_until: new Date(at.getTime() - REG_CLOSE).toISOString() });
    }
  }
  setInterval(() => ensureWeekly().catch(console.error), 30 * 60 * 1000);

  // ИКТ — индивидуальный код тестируемого, 9 цифр, уникальный.
  async function newIkt() {
    for (let i = 0; i < 20; i++) { const v = String(crypto.randomInt(100000000, 999999999)); if (!(await db.regByIkt(v))) return v; }
    throw new Error('ikt');
  }
  const visible = (x, p) => x.kind === 'weekly' || (x.school === p.school && x.city === p.city) || x.created_by === p.id;

  app.get('/api/sessions', auth, wrap(async (req, res) => {
    const p = req.player, now = Date.now();
    const [list, regs] = await Promise.all([db.listEntSessions({ since: new Date(now).toISOString(), school: p.school, city: p.city }), db.regsOf(p.id)]);
    const results = new Map();
    for (const r of regs) if (r.mock_id) { const t = await db.getMock(r.mock_id, p.id); if (t) results.set(r.mock_id, t.finished_at ? { score: t.score, pass: !!t.result?.pass } : { inProgress: true }); }
    res.json({
      now,
      sessions: list.map(x => ({ ...card(x), registered: regs.some(r => r.session_id === x.id) })),
      regs: regs.map(r => ({ session: card(r.session), ...regCard(r), result: r.mock_id ? results.get(r.mock_id) || null : null }))
        .sort((a, b) => b.session.startsAt - a.session.startsAt),
      profile: { name: p.name, birthDate: store.PUBLIC(p).birthDate, phone: p.phone || null, school: p.school, city: p.city, username: p.username }
    });
  }));

  async function loadSession(req, res) {
    const x = await db.getEntSession(String(req.params.id));
    if (!x || !visible(x, req.player)) { res.status(404).json({ error: 'notfound' }); return null; }
    return x;
  }

  app.get('/api/sessions/:id', auth, wrap(async (req, res) => {
    const x = await loadSession(req, res); if (!x) return;
    const reg = await db.getReg(x.id, req.player.id);
    let my = null;
    if (reg?.mock_id) { const t = await db.getMock(reg.mock_id, req.player.id); if (t) my = { done: !!t.finished_at, score: t.score, pass: !!t.result?.pass }; }
    let results = null;
    const ph = phase(x);
    if (ph === 'done' || my?.done) {
      const rows = await db.sessionResults(x.id);
      const done = rows.filter(r => r.score != null && !r.flag);
      const sorted = done.slice().sort((a, b) => b.score - a.score);
      const me = sorted.findIndex(r => r.player_id === req.player.id);
      const scores = done.map(r => r.score);
      results = {
        final: ph === 'done', registered: rows.length, took: rows.filter(r => r.started).length, finished: done.length,
        avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null,
        passRate: done.length ? Math.round(done.filter(r => r.pass).length / done.length * 100) : null,
        best: scores.length ? Math.max(...scores) : null, place: me >= 0 ? me + 1 : null,
        // Распределение баллов по десяткам — как гистограмма.
        hist: Array.from({ length: 14 }, (_, i) => scores.filter(s => s >= i * 10 && (i === 13 ? s <= 140 : s < i * 10 + 10)).length),
        top: ph === 'done' ? sorted.slice(0, 20).map((r, i) => ({ place: i + 1, name: r.name, username: r.username, school: r.school, city: r.city, avatar: r.avatar, photo: pu(r), score: r.score, combo: r.combo, me: r.player_id === req.player.id })) : null
      };
    }
    res.json({ now: Date.now(), session: { ...card({ ...x, count: (await db.sessionResults(x.id)).length }) }, reg: regCard(reg), my, results });
  }));

  app.post('/api/sessions/:id/register', auth, wrap(async (req, res) => {
    const x = await loadSession(req, res); if (!x) return;
    if (Date.now() >= ms(x.reg_until)) return res.status(400).json({ error: 'regClosed' });
    if (!req.player.birth_date || !req.player.phone) return res.status(400).json({ error: 'profileNeeded' });
    const combo = String(req.body?.combo || ''), lang = String(req.body?.lang || '');
    if (!COMBOS[combo]) return res.status(400).json({ error: 'pick' });
    if (!LANGS.includes(lang)) return res.status(400).json({ error: 'pick' });
    // Как на настоящем ЕНТ: одна действующая запись. Чтобы выбрать другую дату — сначала отменить.
    const regs = await db.regsOf(req.player.id);
    const other = regs.find(r => r.session_id !== x.id && ms(r.session.ends_at) > Date.now() && !r.mock_id);
    if (other) return res.status(409).json({ error: 'regExists', session: other.session_id });
    const cur = await db.getReg(x.id, req.player.id);
    if (cur) { await db.dropReg(x.id, req.player.id); }
    const r = await db.addReg({ session_id: x.id, player_id: req.player.id, ikt: cur?.ikt || await newIkt(), combo, lang });
    res.json({ reg: regCard(r) });
  }));
  app.delete('/api/sessions/:id/register', auth, wrap(async (req, res) => {
    const x = await loadSession(req, res); if (!x) return;
    const r = await db.getReg(x.id, req.player.id);
    if (r?.mock_id) return res.status(400).json({ error: 'regStarted' });
    if (Date.now() >= ms(x.starts_at)) return res.status(400).json({ error: 'regClosed' });
    await db.dropReg(x.id, req.player.id);
    res.json({ ok: true });
  }));

  // Старт: тест у всех заканчивается в одно время — в конце сессии.
  app.post('/api/sessions/:id/start', auth, wrap(async (req, res) => {
    const x = await loadSession(req, res); if (!x) return;
    const r = await db.getReg(x.id, req.player.id);
    if (!r) return res.status(403).json({ error: 'notRegistered' });
    if (r.mock_id) return res.json({ id: r.mock_id });
    const now = Date.now();
    if (now < ms(x.starts_at)) return res.status(400).json({ error: 'sessSoon' });
    if (now > ms(x.starts_at) + LATE) return res.status(400).json({ error: 'sessLate' });
    const active = await db.activeMock(req.player.id);
    if (active) await finishMock(active);
    const t = { id: crypto.randomUUID(), player_id: req.player.id, combo: r.combo, lang: r.lang, session_id: x.id,
      sections: mock.build(COMBOS[r.combo], new Set(await db.seenIds(req.player.id).catch(() => [])), r.lang), ends_at: x.ends_at };
    await db.createMock(t);
    await db.setRegMock(x.id, req.player.id, t.id);
    res.json({ id: t.id });
  }));

  // Учитель назначает пробный ЕНТ для своей школы.
  app.post('/api/sessions', auth, wrap(async (req, res) => {
    if (req.player.role !== 'teacher') return res.status(403).json({ error: 'teacher' });
    const start = new Date(req.body?.startsAt).getTime();
    if (!Number.isFinite(start) || start < Date.now() + 15 * 60 * 1000 || start > Date.now() + 90 * 864e5) return res.status(400).json({ error: 'sessStart' });
    const regMin = Math.max(5, Math.min(24 * 60, Math.round(Number(req.body?.regCloseMin) || 60)));
    const x = await db.createEntSession({ id: crypto.randomUUID(), kind: 'school', title: store.clean(req.body?.title, 60), school: req.player.school, city: req.player.city, created_by: req.player.id,
      starts_at: new Date(start).toISOString(), ends_at: new Date(start + DURATION).toISOString(), reg_until: new Date(start - regMin * 60 * 1000).toISOString() });
    res.json({ session: card(x) });
  }));
  app.delete('/api/sessions/:id', auth, wrap(async (req, res) => {
    const x = await db.getEntSession(String(req.params.id));
    if (!x || x.created_by !== req.player.id) return res.status(404).json({ error: 'notfound' });
    if (Date.now() >= ms(x.starts_at)) return res.status(400).json({ error: 'regClosed' });
    await db.deleteEntSession(x.id); res.json({ ok: true });
  }));

  return { ensureWeekly, sessionOfMock: async t => {
    if (!t.session_id) return null;
    const [x, r] = await Promise.all([db.getEntSession(t.session_id), db.getReg(t.session_id, t.player_id)]);
    return x && { id: x.id, title: x.title || '', kind: x.kind, startsAt: ms(x.starts_at), ikt: r?.ikt || null };
  } };
};
