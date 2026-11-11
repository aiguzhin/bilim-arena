// Школьная часть Bilim Arena: учителя и классы, турниры, рейтинги школ, лиги и сезоны,
// достижения, работа над ошибками и проверка подозрительных результатов.
const crypto = require('crypto');
const BANK = require('./bank');
const mock = require('./mock');

const TZ_MS = 5 * 3600 * 1000; // Казахстан, UTC+5
const DAY = 24 * 3600 * 1000;
const dayOf = t => new Date(new Date(t).getTime() + TZ_MS).toISOString().slice(0, 10);
const seasonOf = t => new Date(new Date(t).getTime() + TZ_MS).toISOString().slice(0, 7);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const valid = r => !r.flag || r.cleared;
const avg = a => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null);
const pu = p => (p.photo_v && p.username ? `/p/${p.username}?v=${p.photo_v.slice(0, 8)}` : null);
const round1 = v => (v == null ? null : Math.round(v * 10) / 10);

// Лиги школ по стартовому уровню: средний балл первого пробного ЕНТ учеников.
const LEAGUES = [{ k: 'high', min: 90 }, { k: 'first', min: 60 }, { k: 'second', min: -1 }];
const leagueOf = base => (base == null ? 'second' : LEAGUES.find(l => base >= l.min).k);

// Очки активности: пробный ЕНТ, турнир, баттл, тренировка по ошибкам. У одного ученика — не больше 300 за сезон.
const ACT = { mock: 5, tour: 4, game: 1, practice: 1 };
const ACT_CAP = 300;

const PROFILE_ROTATION = ['math', 'history', 'physics', 'biology', 'chemistry', 'geography', 'worldhistory', 'informatics', 'english', 'law'];

module.exports = function mount(app, { db, auth, wrap, store, COMBOS, SUBJECTS, LANGS }) {
  const isTeacher = p => p.role === 'teacher';
  const teacherOnly = (req, res, next) => (isTeacher(req.player) ? next() : res.status(403).json({ error: 'teacher' }));

  // ---------- роль ----------
  app.post('/api/me/role', auth, wrap(async (req, res) => {
    const role = req.body?.role;
    if (!['teacher', 'student'].includes(role)) return res.status(400).json({ error: 'pick' });
    if (role === 'student' && (await db.classesOf(req.player.id)).length) return res.status(409).json({ error: 'hasClasses' });
    if (role === 'teacher' && req.player.class_id) await db.setClass(req.player.id, null);
    res.json({ user: store.PUBLIC(await db.setRole(req.player.id, role)) });
  }));

  // ---------- классы ----------
  const newCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');
  async function ownClass(req, res) {
    const c = await db.getClass(String(req.params.id));
    if (!c || c.teacher_id !== req.player.id) { res.status(404).json({ error: 'notfound' }); return null; }
    return c;
  }

  // Сводка по ученикам: пробные, лучший балл, прогресс, слабый предмет, активность, подозрительные результаты.
  function studentStats(p, rows, season) {
    const mocks = rows.mocks.filter(t => t.player_id === p.id && t.score != null).sort((a, b) => a.finished_at.localeCompare(b.finished_at));
    const good = mocks.filter(valid).filter(t => t.score > 0);
    const inSeason = good.filter(t => seasonOf(t.finished_at) === season);
    const first = good.slice(0, 2).map(t => t.score), last = good.slice(-2).map(t => t.score);
    const subj = {};
    for (const t of good) for (const s of t.result?.subjects || []) { const x = subj[s.k] ||= { got: 0, max: 0 }; x.got += s.score; x.max += s.max; }
    const subjects = Object.entries(subj).map(([k, x]) => ({ k, pct: x.max ? Math.round(x.got / x.max * 100) : 0 })).sort((a, b) => a.pct - b.pct);
    const since = Date.now() - 30 * DAY;
    const recent = x => new Date(x).getTime() > since;
    const act = rows.mocks.filter(t => t.player_id === p.id && recent(t.finished_at)).length * ACT.mock
      + rows.entries.filter(e => e.player_id === p.id && recent(e.finished_at)).length * ACT.tour
      + rows.games.filter(g => g.player_id === p.id && recent(g.created_at)).length * ACT.game
      + rows.practice.filter(x => x.player_id === p.id && recent(x.created_at)).length * ACT.practice;
    const dates = [...rows.mocks.filter(t => t.player_id === p.id).map(t => t.finished_at), ...rows.entries.filter(e => e.player_id === p.id).map(e => e.finished_at),
      ...rows.games.filter(g => g.player_id === p.id).map(g => g.created_at), ...rows.practice.filter(x => x.player_id === p.id).map(x => x.created_at)].filter(Boolean).sort();
    const flags = [...mocks.filter(t => t.flag && !t.cleared).map(t => ({ kind: 'mock', id: t.id, flag: t.flag, score: t.score, at: t.finished_at, meta: t.meta, combo: t.combo })),
      ...rows.entries.filter(e => e.player_id === p.id && e.flag && !e.cleared).map(e => ({ kind: 'tour', id: e.tour_id, flag: e.flag, score: e.score, max: e.max, at: e.finished_at, meta: e.meta }))];
    return {
      id: p.id, username: p.username, name: p.name, photo: pu(p), avatar: p.avatar || null,
      mocks: mocks.length, seasonMocks: inSeason.length, best: good.length ? Math.max(...good.map(t => t.score)) : null,
      last: good.length ? good[good.length - 1].score : null, lastAt: dates[dates.length - 1] || null,
      progress: good.length >= 3 ? round1(avg(last) - avg(first)) : null,
      weak: subjects[0] && subjects.length > 1 ? subjects[0] : null, subjects, activity: act,
      tours: rows.entries.filter(e => e.player_id === p.id).length, flags
    };
  }

  app.get('/api/classes', auth, teacherOnly, wrap(async (req, res) => {
    const list = await db.classesOf(req.player.id);
    res.json({ classes: list.map(c => ({ id: c.id, code: c.code, name: c.name, school: c.school, city: c.city, students: c.students, goal: c.goal })) });
  }));
  app.post('/api/classes', auth, teacherOnly, wrap(async (req, res) => {
    const name = store.clean(req.body?.name, 24);
    if (name.length < 1) return res.status(400).json({ error: 'className' });
    if ((await db.classesOf(req.player.id)).length >= 20) return res.status(400).json({ error: 'limitClasses' });
    let c = null;
    for (let i = 0; i < 5 && !c; i++) { const code = newCode(); if (!(await db.classByCode(code))) c = await db.createClass({ id: crypto.randomUUID(), code, name, school: req.player.school, city: req.player.city, teacher_id: req.player.id }); }
    res.json({ class: c });
  }));
  app.get('/api/classes/:id', auth, teacherOnly, wrap(async (req, res) => {
    const c = await ownClass(req, res); if (!c) return;
    const members = await db.members(c.id);
    const rows = await db.rows(members.map(m => m.id));
    const season = seasonOf(Date.now());
    const students = members.map(p => studentStats(p, rows, season));
    // Средний процент класса по предметам — по всем засчитанным пробным.
    const subj = {};
    for (const s of students) for (const x of s.subjects) (subj[x.k] ||= []).push(x.pct);
    const subjects = Object.entries(subj).map(([k, a]) => ({ k, pct: Math.round(avg(a)), n: a.length })).sort((a, b) => a.pct - b.pct);
    const monthMocks = rows.mocks.filter(t => seasonOf(t.finished_at) === season).length;
    const tours = await db.toursOfClass(c.id);
    res.json({ class: c, students, subjects, goal: { target: c.goal, done: monthMocks }, tours: tours.map(tourCard), now: Date.now() });
  }));
  app.patch('/api/classes/:id', auth, teacherOnly, wrap(async (req, res) => {
    const c = await ownClass(req, res); if (!c) return;
    const x = {};
    if (req.body?.name != null) { x.name = store.clean(req.body.name, 24); if (!x.name) return res.status(400).json({ error: 'className' }); }
    if (req.body?.goal != null) { x.goal = Math.round(Number(req.body.goal)); if (!(x.goal >= 1 && x.goal <= 500)) return res.status(400).json({ error: 'classGoal' }); }
    res.json({ class: await db.updateClass(c.id, x) });
  }));
  app.delete('/api/classes/:id', auth, teacherOnly, wrap(async (req, res) => {
    const c = await ownClass(req, res); if (!c) return;
    await db.deleteClass(c.id); res.json({ ok: true });
  }));
  app.delete('/api/classes/:id/members/:pid', auth, teacherOnly, wrap(async (req, res) => {
    const c = await ownClass(req, res); if (!c) return;
    const p = await db.get(String(req.params.pid));
    if (p?.class_id === c.id) await db.setClass(p.id, null);
    res.json({ ok: true });
  }));
  // Учитель подтверждает результат, если подозрение не подтвердилось.
  app.post('/api/classes/:id/clear', auth, teacherOnly, wrap(async (req, res) => {
    const c = await ownClass(req, res); if (!c) return;
    const p = await db.get(String(req.body?.pid || ''));
    if (!p || p.class_id !== c.id) return res.status(404).json({ error: 'notfound' });
    if (req.body?.kind === 'mock') {
      const t = await db.getMock(String(req.body.id || ''), p.id);
      if (!t) return res.status(404).json({ error: 'notfound' });
      await db.clearMockFlag(t.id);
    } else if (req.body?.kind === 'tour') await db.clearEntryFlag(String(req.body.id || ''), p.id);
    else return res.status(400).json({ error: 'pick' });
    ratingCache.clear();
    res.json({ ok: true });
  }));

  // Ученик: найти класс по коду, вступить, выйти, посмотреть свой класс.
  app.get('/api/class/lookup/:code', auth, wrap(async (req, res) => {
    const c = await db.classByCode(String(req.params.code || '').toUpperCase());
    if (!c) return res.status(404).json({ error: 'classCode' });
    const t = await db.get(c.teacher_id);
    res.json({ class: { name: c.name, school: c.school, city: c.city, code: c.code, teacher: t?.name || '' } });
  }));
  app.post('/api/class/join', auth, wrap(async (req, res) => {
    if (isTeacher(req.player)) return res.status(400).json({ error: 'teacherJoin' });
    const c = await db.classByCode(String(req.body?.code || '').trim().toUpperCase());
    if (!c) return res.status(404).json({ error: 'classCode' });
    if ((await db.members(c.id)).length >= 60) return res.status(400).json({ error: 'classFull' });
    res.json({ user: store.PUBLIC(await db.setClass(req.player.id, c.id)) });
  }));
  app.post('/api/class/leave', auth, wrap(async (req, res) => { res.json({ user: store.PUBLIC(await db.setClass(req.player.id, null)) }); }));
  app.get('/api/class', auth, wrap(async (req, res) => {
    const c = req.player.class_id ? await db.getClass(req.player.class_id) : null;
    if (!c) return res.json({ class: null });
    const [teacher, members] = await Promise.all([db.get(c.teacher_id), db.members(c.id)]);
    const rows = await db.rows(members.map(m => m.id));
    const season = seasonOf(Date.now());
    const mates = members.map(p => {
      const s = studentStats(p, rows, season);
      return { username: p.username, name: p.name, photo: s.photo, avatar: s.avatar, best: s.best, progress: s.progress, activity: s.activity, me: p.id === req.player.id };
    }).sort((a, b) => b.activity - a.activity || (b.best ?? -1) - (a.best ?? -1));
    const monthMocks = rows.mocks.filter(t => seasonOf(t.finished_at) === season).length;
    const tours = (await db.toursOfClass(c.id)).filter(t => new Date(t.ends_at) > Date.now() - 7 * DAY);
    const cards = [];
    for (const t of tours) { const e = await db.getEntry(t.id, req.player.id); cards.push({ ...tourCard(t), me: e ? (e.finished_at ? 'finished' : e.started_at ? 'started' : 'registered') : null }); }
    res.json({ class: { name: c.name, school: c.school, city: c.city, code: c.code, teacher: teacher?.name || '' }, goal: { target: c.goal, done: monthMocks }, mates, tours: cards, now: Date.now() });
  }));

  // ---------- турниры ----------
  // Одинаковые задания для всех участников; порядок заданий и вариантов у каждого свой.
  function buildTourItems(topic, n, lang) {
    const plan = topic === 'mandatory' ? [['history', 0.4], ['mathlit', 0.3], ['reading', 0.3]]
      : topic.startsWith('combo:') ? COMBOS[topic.slice(6)].map(k => [k, 0.5]) : [[topic, 1]];
    const ids = [];
    plan.forEach(([k, share], i) => {
      const need = i === plan.length - 1 ? n - ids.length : Math.round(n * share);
      let pool = BANK[k].q.filter(q => mock.kindOf(q) === 's');
      if (lang === 'en') { const en = pool.filter(mock.hasEn); if (en.length >= need) pool = en; }
      ids.push(...shuffle(pool.slice()).slice(0, need).map(q => q.id));
    });
    return ids;
  }
  const validTopic = t => t === 'mandatory' || !!SUBJECTS[t] || (t.startsWith('combo:') && !!COMBOS[t.slice(6)]);

  // Еженедельные турниры для всех школ: среда 19:00 — профильный предмет по кругу, суббота 15:00 — обязательные предметы.
  async function ensureWeekly() {
    const now = Date.now();
    for (let w = 0; w < 2; w++) {
      for (const [dow, hourUtc, kind] of [[3, 14, 'profile'], [6, 10, 'main']]) {
        const local = new Date(now + TZ_MS);
        const diff = (dow - local.getUTCDay() + 7) % 7 + w * 7;
        const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + diff, hourUtc));
        if (d.getTime() + 60 * 60 * 1000 < now) continue;
        const week = Math.floor(d.getTime() / (7 * DAY));
        const topic = kind === 'main' ? 'mandatory' : PROFILE_ROTATION[week % PROFILE_ROTATION.length];
        const n = kind === 'main' ? 30 : 20, minutes = kind === 'main' ? 40 : 25;
        const id = `w-${d.toISOString().slice(0, 10)}-${kind}`;
        if (await db.getTour(id)) continue;
        await db.createTour({
          id, kind: 'weekly', title: kind, topic, lang: null, starts_at: d.toISOString(),
          join_until: new Date(d.getTime() + 15 * 60 * 1000).toISOString(), ends_at: new Date(d.getTime() + (15 + minutes) * 60 * 1000).toISOString(),
          duration_ms: minutes * 60 * 1000, items: buildTourItems(topic, n)
        });
      }
    }
  }
  setInterval(() => ensureWeekly().catch(console.error), 30 * 60 * 1000);

  const statusOf = (t, now = Date.now()) => (now < new Date(t.starts_at) ? 'soon' : now < new Date(t.ends_at) ? 'live' : 'done');
  const tourCard = t => ({
    id: t.id, kind: t.kind, title: t.title, topic: t.topic, lang: t.lang, classId: t.class_id || null,
    startsAt: new Date(t.starts_at).getTime(), joinUntil: new Date(t.join_until).getTime(), endsAt: new Date(t.ends_at).getTime(),
    minutes: Math.round(t.duration_ms / 60000), n: t.n ?? (Array.isArray(t.items) ? t.items.length : null), count: t.count ?? null, status: statusOf(t)
  });
  async function canSee(t, p) {
    if (t.kind === 'weekly') return true;
    if (t.created_by === p.id) return true;
    if (t.kind === 'class') return p.class_id === t.class_id;
    if (t.kind === 'school') return p.school === t.school && p.city === t.city;
    return false;
  }

  app.get('/api/tours', auth, wrap(async (req, res) => {
    const p = req.player;
    const classIds = isTeacher(p) ? (await db.classesOf(p.id)).map(c => c.id) : p.class_id ? [p.class_id] : [];
    const [list, past, places] = await Promise.all([
      db.listTours({ classIds, school: p.school, city: p.city, since: new Date().toISOString() }),
      db.pastTours(p.id), db.placesOf(p.id)
    ]);
    const mine = new Map();
    for (const t of list) { const e = await db.getEntry(t.id, p.id); if (e) mine.set(t.id, e.finished_at ? 'finished' : e.started_at ? 'started' : 'registered'); }
    const placeOf = new Map(places.map(x => [x.tour_id, x]));
    res.json({
      now: Date.now(),
      tours: list.map(t => ({ ...tourCard(t), me: mine.get(t.id) || null })),
      past: past.map(t => ({ ...tourCard(t), place: placeOf.get(t.id)?.place ?? null, of: placeOf.get(t.id)?.of ?? null, score: placeOf.get(t.id)?.score ?? null }))
    });
  }));

  // Проверка ответов участника по времени: слишком быстрые верные ответы и уходы со страницы.
  function tourFlag(e, tour) {
    const reasons = [];
    let fast = 0;
    (e.items || []).forEach((it, i) => {
      const q = mock.byId.get(it.id), ans = e.answers?.[i], ms = e.times?.[i];
      if (!q || ans == null || ms == null) return;
      const chars = (q.t.ru || '').length + q.o.ru.join('').length;
      const minMs = Math.max(2500, Math.min(8000, chars * 12));
      if (mock.scoreOne(q, it, ans) === 1 && ms < minMs) fast++;
    });
    if (fast >= 5 && fast >= (e.correct || 0) * 0.3) reasons.push('fast');
    if ((e.meta?.hidden || 0) >= 3 || (e.meta?.hiddenMs || 0) >= 60 * 1000) reasons.push('tabs');
    return { flag: reasons.length ? reasons.join(',') : null, fast };
  }
  async function finishEntry(t, e) {
    if (e.finished_at) return e;
    const answers = e.answers || [];
    const correct = (e.items || []).reduce((n, it, i) => n + mock.scoreOne(mock.byId.get(it.id), it, answers[i]), 0);
    const deadline = deadlineOf(t, e);
    const end = Math.min(Date.now(), deadline);
    const done = { ...e, correct };
    const f = tourFlag(done, t);
    const out = await db.updateEntry(t.id, e.player_id, {
      finished_at: new Date(end).toISOString(), score: correct, correct, max: (e.items || []).length,
      time_ms: Math.max(0, end - new Date(e.started_at).getTime()), flag: f.flag, meta: { ...(e.meta || {}), fast: f.fast }
    });
    ratingCache.clear();
    return out;
  }
  const deadlineOf = (t, e) => Math.min(new Date(e.started_at).getTime() + Number(t.duration_ms), new Date(t.ends_at).getTime());

  function playState(t, e) {
    if (e.finished_at) return { done: true };
    const i = e.cur || 0, it = e.items[i];
    const lang = e.meta?.lang || 'ru';
    const v = mock.view(it, false);
    return { done: false, i, n: e.items.length, q: v, lang, deadline: deadlineOf(t, e), now: Date.now(), answered: (e.answers || []).filter(x => x != null).length };
  }

  function standings(t, entries, me) {
    const done = entries.filter(e => e.finished_at && e.role !== 'teacher');
    const ok = done.filter(valid).sort((a, b) => b.score - a.score || a.time_ms - b.time_ms);
    const rows = ok.map((e, i) => ({ place: i + 1, username: e.username, name: e.name, school: e.school, city: e.city, photo: pu(e), avatar: e.avatar, score: e.score, max: e.max, time: e.time_ms, me: e.player_id === me }));
    const mine = done.find(e => e.player_id === me);
    const sch = {};
    for (const e of ok) (sch[`${e.school}|${e.city}`] ||= { name: e.school, city: e.city, scores: [] }).scores.push(e.score);
    const schools = Object.values(sch).map(s => ({ name: s.name, city: s.city, n: s.scores.length, avg: round1(avg(s.scores.sort((a, b) => b - a).slice(0, 5))) }))
      .sort((a, b) => b.avg - a.avg || b.n - a.n).map((s, i) => ({ ...s, place: i + 1 }));
    return { rows: rows.slice(0, 100), myRow: rows.find(r => r.me) || null, myFlag: mine && !valid(mine) ? mine.flag : null, schools: schools.slice(0, 50), finished: done.length };
  }

  async function loadTour(req, res) {
    const t = await db.getTour(String(req.params.id));
    if (!t || !(await canSee(t, req.player))) { res.status(404).json({ error: 'notfound' }); return null; }
    return t;
  }

  app.get('/api/tours/:id', auth, wrap(async (req, res) => {
    const t = await loadTour(req, res); if (!t) return;
    let e = await db.getEntry(t.id, req.player.id);
    const status = statusOf(t);
    if (e?.started_at && !e.finished_at && Date.now() > deadlineOf(t, e)) e = await finishEntry(t, e);
    let entries = await db.entriesOf(t.id);
    if (status === 'done') {
      // После окончания турнира закрываем все незавершённые попытки.
      for (const x of entries.filter(x => x.started_at && !x.finished_at)) await finishEntry(t, x);
      entries = await db.entriesOf(t.id);
    }
    const showTable = status === 'done' || !!e?.finished_at || t.created_by === req.player.id;
    // Разбор с ответами открывается только после окончания турнира, чтобы ответы не уходили тем, кто ещё решает.
    const review = status === 'done' && e?.finished_at ? e.items.map((it, i) => ({ ...mock.view(it, true, e.answers?.[i]), mine: e.answers?.[i] ?? null, ms: e.times?.[i] ?? null })) : null;
    res.json({
      tour: { ...tourCard({ ...t, count: entries.length }), createdBy: t.created_by === req.player.id },
      me: e ? { state: e.finished_at ? 'finished' : e.started_at ? 'started' : 'registered', score: e.score, max: e.max, time: e.time_ms, flag: e.flag && !e.cleared ? e.flag : null } : null,
      table: showTable ? standings(t, entries, req.player.id) : null, review, now: Date.now()
    });
  }));
  app.post('/api/tours/:id/register', auth, wrap(async (req, res) => {
    const t = await loadTour(req, res); if (!t) return;
    if (Date.now() > new Date(t.join_until)) return res.status(400).json({ error: 'tourClosed' });
    await db.addEntry({ tour_id: t.id, player_id: req.player.id });
    res.json({ ok: true });
  }));
  app.post('/api/tours/:id/start', auth, wrap(async (req, res) => {
    const t = await loadTour(req, res); if (!t) return;
    const now = Date.now();
    let e = await db.getEntry(t.id, req.player.id);
    if (e?.started_at) {
      if (!e.finished_at && now > deadlineOf(t, e)) e = await finishEntry(t, e);
      return res.json(playState(t, e));
    }
    if (now < new Date(t.starts_at)) return res.status(400).json({ error: 'tourSoon' });
    if (now > new Date(t.join_until)) return res.status(400).json({ error: 'tourClosed' });
    const lang = LANGS.includes(req.body?.lang) ? req.body.lang : 'ru';
    if (!e) e = await db.addEntry({ tour_id: t.id, player_id: req.player.id });
    const items = shuffle(t.items.slice()).map(id => { const q = mock.byId.get(id); return { id, ord: shuffle([...Array(q ? q.o.ru.length : 4).keys()]) }; });
    e = await db.updateEntry(t.id, req.player.id, { started_at: new Date(now).toISOString(), items, answers: [], times: [], cur: 0, served_at: now, meta: { lang, hidden: 0, hiddenMs: 0 } });
    res.json(playState(t, e));
  }));
  app.get('/api/tours/:id/play', auth, wrap(async (req, res) => {
    const t = await loadTour(req, res); if (!t) return;
    let e = await db.getEntry(t.id, req.player.id);
    if (!e?.started_at) return res.status(400).json({ error: 'tourNotStarted' });
    if (!e.finished_at && Date.now() > deadlineOf(t, e)) e = await finishEntry(t, e);
    res.json(playState(t, e));
  }));
  app.post('/api/tours/:id/answer', auth, wrap(async (req, res) => {
    const t = await loadTour(req, res); if (!t) return;
    let e = await db.getEntry(t.id, req.player.id);
    if (!e?.started_at) return res.status(400).json({ error: 'tourNotStarted' });
    const now = Date.now();
    const meta = { ...(e.meta || {}), ...mock.cleanMeta(req.body?.meta, e.meta) };
    if (!e.finished_at && now > deadlineOf(t, e) + 3000) { await db.updateEntry(t.id, e.player_id, { meta }); e = await finishEntry(t, { ...e, meta }); return res.json(playState(t, e)); }
    if (e.finished_at) return res.json(playState(t, e));
    const i = Number(req.body?.i);
    if (i !== e.cur) return res.json(playState(t, e));
    const it = e.items[i], q = mock.byId.get(it.id), n = q ? q.o.ru.length : 4;
    const c = req.body?.choice;
    const answers = (e.answers || []).slice(), times = (e.times || []).slice();
    answers[i] = Number.isInteger(c) && c >= 0 && c < n ? c : null;
    times[i] = Math.max(0, now - Number(e.served_at || now));
    const cur = i + 1;
    e = await db.updateEntry(t.id, e.player_id, { answers, times, cur, served_at: now, meta });
    if (cur >= e.items.length || req.body?.finish === true) e = await finishEntry(t, e);
    res.json(playState(t, e));
  }));
  // Уход со страницы во время турнира фиксируется сразу, даже если ученик не ответил.
  app.post('/api/tours/:id/meta', auth, wrap(async (req, res) => {
    const e = await db.getEntry(String(req.params.id), req.player.id);
    if (e?.started_at && !e.finished_at) await db.updateEntry(e.tour_id, e.player_id, { meta: { ...(e.meta || {}), ...mock.cleanMeta(req.body?.meta, e.meta) } });
    res.json({ ok: true });
  }));
  app.post('/api/tours/:id/finish', auth, wrap(async (req, res) => {
    const t = await loadTour(req, res); if (!t) return;
    let e = await db.getEntry(t.id, req.player.id);
    if (!e?.started_at) return res.status(400).json({ error: 'tourNotStarted' });
    e = await finishEntry(t, e);
    res.json(playState(t, e));
  }));

  // Учитель создаёт турнир для класса или всей школы.
  app.post('/api/tours', auth, teacherOnly, wrap(async (req, res) => {
    const b = req.body || {};
    const c = await db.getClass(String(b.classId || ''));
    if (!c || c.teacher_id !== req.player.id) return res.status(404).json({ error: 'notfound' });
    const topic = String(b.topic || '');
    if (!validTopic(topic)) return res.status(400).json({ error: 'pick' });
    const n = [10, 15, 20, 30].includes(Number(b.n)) ? Number(b.n) : 20;
    const minutes = Math.round(Number(b.minutes));
    if (!(minutes >= 5 && minutes <= 90)) return res.status(400).json({ error: 'tourMinutes' });
    const start = b.startsAt === 'now' ? Date.now() : new Date(b.startsAt).getTime();
    if (!Number.isFinite(start) || start < Date.now() - 2 * 60 * 1000 || start > Date.now() + 60 * DAY) return res.status(400).json({ error: 'tourStart' });
    const joinMin = Math.max(2, Math.min(30, Math.round(Number(b.joinMinutes) || 10)));
    const scope = b.scope === 'school' ? 'school' : 'class';
    const title = store.clean(b.title, 60) || '';
    const t = await db.createTour({
      id: crypto.randomUUID(), kind: scope, title, topic, lang: null, class_id: c.id, school: c.school, city: c.city, created_by: req.player.id,
      starts_at: new Date(start).toISOString(), join_until: new Date(start + joinMin * 60 * 1000).toISOString(),
      ends_at: new Date(start + (joinMin + minutes) * 60 * 1000).toISOString(), duration_ms: minutes * 60 * 1000, items: buildTourItems(topic, n)
    });
    res.json({ tour: tourCard(t) });
  }));
  app.delete('/api/tours/:id', auth, wrap(async (req, res) => {
    const t = await db.getTour(String(req.params.id));
    if (!t || t.created_by !== req.player.id) return res.status(404).json({ error: 'notfound' });
    await db.deleteTour(t.id); ratingCache.clear(); res.json({ ok: true });
  }));

  // ---------- рейтинги: результаты, прогресс, активность ----------
  const ratingCache = new Map();
  async function ratings(season) {
    const hit = ratingCache.get(season);
    if (hit && Date.now() - hit.at < 60 * 1000) return hit.data;
    const rows = await db.rows(null);
    const inS = t => season === 'all' || seasonOf(t) === season;
    const students = rows.players.filter(p => p.role !== 'teacher');
    const teacherSchools = new Set(rows.players.filter(p => p.role === 'teacher').map(p => `${p.school}|${p.city}`));
    const byP = new Map(students.map(p => [p.id, { p, mocks: [], act: 0 }]));
    for (const t of rows.mocks.sort((a, b) => a.finished_at.localeCompare(b.finished_at))) { const x = byP.get(t.player_id); if (x && valid(t) && t.score > 0) x.mocks.push(t); }
    const addAct = (pid, when, pts) => { const x = byP.get(pid); if (x && inS(when)) x.act += pts; };
    for (const t of rows.mocks) addAct(t.player_id, t.finished_at, ACT.mock);
    for (const e of rows.entries) addAct(e.player_id, e.finished_at, ACT.tour);
    for (const g of rows.games) addAct(g.player_id, g.created_at, ACT.game);
    for (const x of rows.practice) addAct(x.player_id, x.created_at, ACT.practice);
    const stu = [...byP.values()].map(({ p, mocks, act }) => {
      const season_ = mocks.filter(t => inS(t.finished_at));
      const upto = season === 'all' ? mocks : mocks.filter(t => seasonOf(t.finished_at) <= season);
      const base = mocks.length ? avg(mocks.slice(0, 2).map(t => t.score)) : null;
      const progress = upto.length >= 3 && season_.length ? round1(avg(upto.slice(-2).map(t => t.score)) - base) : null;
      return {
        username: p.username, name: p.name, school: p.school, city: p.city, photo: pu(p), avatar: p.avatar || null,
        best: season_.length ? Math.max(...season_.map(t => t.score)) : null, mocks: season_.length, base, progress, activity: Math.min(ACT_CAP, act)
      };
    });
    const sch = {};
    for (const s of stu) { const k = `${s.school}|${s.city}`; (sch[k] ||= { name: s.school, city: s.city, list: [] }).list.push(s); }
    const schools = Object.entries(sch).map(([k, s]) => {
      const bests = s.list.map(x => x.best).filter(x => x != null).sort((a, b) => b - a);
      const prog = s.list.map(x => x.progress).filter(x => x != null);
      const bases = s.list.map(x => x.base).filter(x => x != null);
      return {
        name: s.name, city: s.city, students: s.list.length, verified: teacherSchools.has(k), league: leagueOf(bases.length ? avg(bases) : null),
        results: bests.length ? round1(avg(bests.slice(0, 5))) : null, resultsN: bests.length,
        progress: prog.length ? round1(avg(prog)) : null, progressN: prog.length,
        activity: s.list.reduce((n, x) => n + x.activity, 0), activeN: s.list.filter(x => x.activity > 0).length
      };
    });
    const leagueOfSchool = new Map(schools.map(s => [`${s.name}|${s.city}`, s.league]));
    for (const s of stu) s.league = leagueOfSchool.get(`${s.school}|${s.city}`);
    const top = (list, key, n = 100) => list.filter(x => x[key] != null && (key !== 'activity' || x[key] > 0)).sort((a, b) => b[key] - a[key]).slice(0, n);
    const strip = ({ base, ...s }) => s;
    const data = {
      season,
      students: { results: top(stu, 'best').map(strip), progress: top(stu, 'progress').map(strip), activity: top(stu, 'activity').map(strip) },
      schools: { results: top(schools, 'results'), progress: top(schools, 'progress'), activity: top(schools, 'activity') }
    };
    ratingCache.set(season, { at: Date.now(), data });
    return data;
  }
  app.get('/api/ratings', wrap(async (req, res) => {
    const cur = seasonOf(Date.now());
    const s = String(req.query.season || cur);
    const season = s === 'all' || /^\d{4}-\d{2}$/.test(s) ? s : cur;
    const seasons = []; const d = new Date(Date.now() + TZ_MS);
    for (let i = 0; i < 6; i++) seasons.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
    res.json({ ...(await ratings(season)), current: cur, seasons, leagues: LEAGUES.map(l => l.k) });
  }));

  // ---------- достижения ----------
  async function achievementsOf(p) {
    const [rows, places, fixed] = await Promise.all([db.rows([p.id]), db.placesOf(p.id), db.fixedIds(p.id)]);
    const mocks = rows.mocks.filter(t => t.score != null).sort((a, b) => a.finished_at.localeCompare(b.finished_at));
    const good = mocks.filter(valid).filter(t => t.score > 0);
    const best = good.length ? Math.max(...good.map(t => t.score)) : 0;
    const prog = good.length >= 3 ? avg(good.slice(-2).map(t => t.score)) - avg(good.slice(0, 2).map(t => t.score)) : 0;
    const wins = rows.games.filter(g => g.won && g.mode === 'duel').length;
    const podium = places.filter(x => x.place && x.place <= 3).length;
    const days = new Set([...rows.mocks.map(t => t.finished_at), ...rows.entries.map(e => e.finished_at), ...rows.games.map(g => g.created_at), ...rows.practice.map(x => x.created_at)].filter(Boolean).map(dayOf));
    // Серия: дни подряд с занятиями, считая сегодня или вчера.
    let streak = 0, best_streak = 0;
    { let d = dayOf(Date.now()); if (!days.has(d)) d = dayOf(Date.now() - DAY); while (days.has(d)) { streak++; d = dayOf(new Date(d + 'T12:00:00Z').getTime() - DAY); } }
    { const sorted = [...days].sort(); let run = 0, prev = null; for (const d of sorted) { run = prev && new Date(d) - new Date(prev) === DAY ? run + 1 : 1; best_streak = Math.max(best_streak, run); prev = d; } }
    const A = (key, group, cur, target) => ({ key, group, cur: Math.min(cur, target), target, done: cur >= target });
    const list = [
      A('mock1', 'mock', mocks.length, 1), A('mock5', 'mock', mocks.length, 5), A('mock15', 'mock', mocks.length, 15),
      A('pass', 'score', good.some(t => t.result?.pass) ? 1 : 0, 1), A('score100', 'score', best, 100), A('score120', 'score', best, 120),
      A('prog10', 'progress', Math.max(0, Math.round(prog)), 10), A('prog25', 'progress', Math.max(0, Math.round(prog)), 25),
      A('tour1', 'tour', rows.entries.length, 1), A('tour5', 'tour', rows.entries.length, 5), A('podium', 'tour', podium, 1),
      A('duel1', 'duel', wins, 1), A('duel10', 'duel', wins, 10),
      A('fix50', 'fix', fixed.length, 50), A('fix200', 'fix', fixed.length, 200),
      A('streak3', 'streak', best_streak, 3), A('streak7', 'streak', best_streak, 7), A('streak30', 'streak', best_streak, 30),
      A('team', 'team', p.class_id ? 1 : 0, 1)
    ];
    return { streak, bestStreak: best_streak, days: days.size, list };
  }
  app.get('/api/me/achievements', auth, wrap(async (req, res) => res.json(await achievementsOf(req.player))));
  app.get('/api/users/:username/achievements', auth, wrap(async (req, res) => {
    const p = await db.byUsernamePublic(String(req.params.username || '').toLowerCase());
    if (!p) return res.status(404).json({ error: 'notfound' });
    const a = await achievementsOf(p);
    res.json({ streak: a.streak, list: a.list.filter(x => x.done).map(x => ({ key: x.key, group: x.group })) });
  }));

  // ---------- работа над ошибками ----------
  async function mistakeMap(pid) {
    const [src, fixed] = await Promise.all([db.mistakeSources(pid), db.fixedIds(pid)]);
    const done = new Set(fixed), out = new Map();
    for (const m of src.mocks) for (const x of mock.mistakes(m.sections, m.answers)) if (!done.has(x.id) && !out.has(x.id)) out.set(x.id, x.id.split(':')[0]);
    for (const e of src.entries) e.items.forEach((it, i) => {
      const q = mock.byId.get(it.id), a = e.answers?.[i];
      if (q && a != null && mock.scoreOne(q, it, a) < mock.maxOf(q) && !done.has(it.id) && !out.has(it.id)) out.set(it.id, it.id.split(':')[0]);
    });
    return { map: out, fixed: fixed.length };
  }
  app.get('/api/practice', auth, wrap(async (req, res) => {
    const [{ map, fixed }, rows, stats] = await Promise.all([mistakeMap(req.player.id), db.rows([req.player.id]), db.profileStats(req.player.id)]);
    const subj = {};
    for (const t of rows.mocks.filter(valid)) for (const s of t.result?.subjects || []) { const x = subj[s.k] ||= { got: 0, max: 0 }; x.got += s.score; x.max += s.max; }
    for (const s of stats.subjects) { const x = subj[s.subject] ||= { got: 0, max: 0 }; x.got += s.correct; x.max += s.answered; }
    const count = {};
    for (const k of map.values()) count[k] = (count[k] || 0) + 1;
    const subjects = Object.keys(BANK).map(k => ({ k, mistakes: count[k] || 0, pct: subj[k]?.max ? Math.round(subj[k].got / subj[k].max * 100) : null, answered: subj[k]?.max || 0 }));
    const weak = subjects.filter(s => s.pct != null && s.answered >= 5).sort((a, b) => a.pct - b.pct).slice(0, 3).filter(s => s.pct < 85).map(s => s.k);
    const today = rows.practice.filter(x => dayOf(x.created_at) === dayOf(Date.now())).reduce((n, x) => n + x.n, 0);
    res.json({ subjects, weak, total: map.size, fixed, today });
  }));
  app.post('/api/practice/start', auth, wrap(async (req, res) => {
    const k = req.body?.subject ? String(req.body.subject) : null;
    if (k && !BANK[k]) return res.status(400).json({ error: 'pick' });
    const { map } = await mistakeMap(req.player.id);
    let ids = [...map.entries()].filter(([, s]) => !k || s === k).map(([id]) => id);
    ids = shuffle(ids).slice(0, 10);
    const fromMistakes = ids.length;
    if (ids.length < 10 && k) {
      const seen = new Set(ids);
      ids.push(...shuffle(BANK[k].q.filter(q => !seen.has(q.id)).map(q => q.id)).slice(0, 10 - ids.length));
    }
    if (!ids.length) return res.json({ items: [], fromMistakes: 0 });
    const items = ids.map(id => { const q = mock.byId.get(id); const it = { id, ord: shuffle([...Array(q.o.ru.length).keys()]) }; return { id, ord: it.ord, mistake: map.has(id), k: id.split(':')[0], q: mock.view(it, false) }; });
    res.json({ items, fromMistakes });
  }));
  app.post('/api/practice/check', auth, wrap(async (req, res) => {
    const id = String(req.body?.id || ''), q = mock.byId.get(id);
    const ord = req.body?.ord;
    if (!q || !Array.isArray(ord) || ord.length !== q.o.ru.length || [...ord].sort((a, b) => a - b).some((v, i) => v !== i)) return res.status(400).json({ error: 'pick' });
    const it = { id, ord };
    const sec = [{ k: 'x', items: [it] }];
    const answer = mock.cleanAnswers(sec, { 'x.0': req.body?.answer })['x.0'];
    const v = mock.view(it, true, answer);
    if (v.got === v.max) await db.addFixed(req.player.id, [id]);
    res.json({ got: v.got, max: v.max, a: v.a, e: v.e });
  }));
  app.post('/api/practice/done', auth, wrap(async (req, res) => {
    const n = Math.max(0, Math.min(50, Math.round(Number(req.body?.n) || 0))), c = Math.max(0, Math.min(n, Math.round(Number(req.body?.correct) || 0)));
    if (n) { await db.logPractice(req.player.id, n, c); ratingCache.clear(); }
    res.json({ ok: true });
  }));

  return { ratingCache, ensureWeekly };
};
