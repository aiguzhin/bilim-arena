const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const BANK = require('./bank');
const mock = require('./mock');
const store = require('./store');

const db = store.create();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });

const QUESTION_MS = 20000;
const REVEAL_MS = 2600;
const COUNTDOWN_S = 3;
const ROUND = 10;

const SUBJECTS = Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v.name]));
const MANDATORY = ['history', 'mathlit', 'reading'];
// Комбинации профильных предметов ЕНТ (все, кроме творческого экзамена).
const COMBOS = Object.fromEntries([
  ['math', 'physics'], ['math', 'informatics'], ['math', 'geography'], ['biology', 'chemistry'], ['biology', 'geography'],
  ['chemistry', 'physics'], ['worldhistory', 'geography'], ['worldhistory', 'law'], ['english', 'worldhistory'],
  ['geography', 'english'], ['kazlang', 'kazlit'], ['ruslang', 'ruslit']
].filter(([a, b]) => BANK[a] && BANK[b]).map(([a, b]) => [`${a}-${b}`, [a, b]]));
// Раскладка раунда по комбинации — в пропорции ЕНТ (20 : 10 : 10 : 40 : 40 из 120).
const COMBO_PLAN = [['history', 2], ['mathlit', 1], ['reading', 1], [0, 3], [1, 3]];

function topicName(topic) {
  if (topic.startsWith('combo:')) {
    const [a, b] = COMBOS[topic.slice(6)];
    return { ru: `${SUBJECTS[a].ru} — ${SUBJECTS[b].ru}`, kk: `${SUBJECTS[a].kk} — ${SUBJECTS[b].kk}` };
  }
  return SUBJECTS[topic];
}
function validTopic(t) {
  return typeof t === 'string' && (t.startsWith('combo:') ? !!COMBOS[t.slice(6)] : !!SUBJECTS[t]);
}

// Версия ассетов меняется при каждом запуске, поэтому после выкладки браузеры сразу берут новые файлы.
const fs = require('fs');
const VERSION = (process.env.RENDER_GIT_COMMIT || String(Date.now())).slice(0, 8);
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8').replace(/(\/(?:app\.css|app\.js|i18n\.js|ent\.js))"/g, `$1?v=${VERSION}"`);
const sendIndex = (req, res) => { res.set('Cache-Control', 'no-cache'); res.type('html').send(INDEX); };
app.get(['/', '/index.html'], sendIndex);
app.use(express.static(path.join(__dirname, 'public'), { index: false, maxAge: '30d', immutable: true }));
app.get('/api/subjects', (req, res) => res.json({ subjects: SUBJECTS, mandatory: MANDATORY, combos: COMBOS, count: Object.values(BANK).reduce((n, v) => n + v.q.length, 0) }));
app.get('/api/leaders', async (req, res) => {
  try { res.json(await db.leaders()); } catch (e) { console.error(e); res.status(500).json({ error: 'unavailable' }); }
});
app.get('/api/stats', (req, res) => res.json({ online: io.engine.clientsCount, battles: [...rooms.values()].filter(r => r.state === 'playing').length }));
app.get(['/b/:code', '/rating', '/play', '/me', '/about', '/privacy', '/ent', '/ent/:id'], sendIndex);

// ---------- аккаунты ----------
app.use(express.json({ limit: '64kb' }));

const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw) { const salt = crypto.randomBytes(16); return `${salt.toString('hex')}:${(await scrypt(pw, salt)).toString('hex')}`; }
async function checkPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const k = await scrypt(pw, Buffer.from(salt, 'hex'));
  return crypto.timingSafeEqual(k, Buffer.from(hash, 'hex'));
}

// Ограничение попыток входа и регистрации: не больше 10 в 10 минут с одного адреса.
const attempts = new Map();
function limited(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), a = attempts.get(ip);
  if (!a || now - a.start > 10 * 60 * 1000) { attempts.set(ip, { start: now, n: 1 }); return false; }
  a.n += 1; return a.n > 10;
}
setInterval(() => { const now = Date.now(); for (const [k, a] of attempts) if (now - a.start > 10 * 60 * 1000) attempts.delete(k); }, 10 * 60 * 1000);

const tokenOf = req => (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
async function auth(req, res, next) {
  const t = tokenOf(req);
  const p = t && /^[a-f0-9]{64}$/.test(t) ? await db.sessionPlayer(t).catch(() => null) : null;
  if (!p) return res.status(401).json({ error: 'auth' });
  req.player = p; req.token = t; next();
}
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'server' }); });

function readProfile(b) {
  const name = store.clean(b.name, 24), school = store.clean(b.school, 60), city = store.clean(b.city, 40);
  if (name.length < 2) return { error: 'name' };
  if (school.length < 2) return { error: 'school' };
  if (!city) return { error: 'city' };
  return { name, school, city };
}

app.post('/api/register', wrap(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'limit' });
  const b = req.body || {};
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return res.status(400).json({ error: 'username' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'password' });
  if (b.consent !== true) return res.status(400).json({ error: 'consent' });
  const prof = readProfile(b);
  if (prof.error) return res.status(400).json(prof);
  const row = await db.createAccount({ id: crypto.randomUUID(), username, pass_hash: await hashPassword(password), ...prof });
  if (!row) return res.status(409).json({ error: 'taken' });
  await newSession(row, res);
}));

app.post('/api/login', wrap(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'limit' });
  const username = String(req.body?.username || '').trim().toLowerCase();
  const row = await db.findByUsername(username);
  if (!row || !(await checkPassword(String(req.body?.password || ''), row.pass_hash))) return res.status(401).json({ error: 'wrong' });
  await newSession(row, res);
}));

app.post('/api/logout', auth, wrap(async (req, res) => { await db.deleteSession(req.token); res.json({ ok: true }); }));

app.get('/api/me', auth, wrap(async (req, res) => {
  const stats = await db.profileStats(req.player.id);
  res.json({ user: store.PUBLIC(req.player), ...stats });
}));

app.patch('/api/me', auth, wrap(async (req, res) => {
  const prof = readProfile(req.body || {});
  if (prof.error) return res.status(400).json(prof);
  res.json({ user: store.PUBLIC(await db.updateProfile(req.player.id, prof)) });
}));

// ---------- вход через Google ----------
// Кнопка Google на сайте отдаёт подписанный ID-токен; сервер проверяет подпись и адресата (наш Client ID).
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const { OAuth2Client } = require('google-auth-library');
const gClient = new OAuth2Client();
async function verifyGoogle(credential) {
  if (!GOOGLE_CLIENT_ID || typeof credential !== 'string' || credential.length > 4096) return null;
  try {
    const t = await gClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const p = t.getPayload();
    if (!p?.sub || p.email_verified === false) return null;
    return { sub: p.sub, email: p.email || '', name: p.given_name || p.name || '' };
  } catch { return null; }
}
// Новые пользователи Google сначала указывают город и школу; до этого их данные ждут 15 минут.
const pendingGoogle = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of pendingGoogle) if (now - v.at > 15 * 60 * 1000) pendingGoogle.delete(k); }, 5 * 60 * 1000);

async function newSession(row, res) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(token, row.id);
  res.json({ token, user: store.PUBLIC(row) });
}

app.get('/api/config', (req, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID || null }));

// Подсказки школ: справочник + школы, которые указали минимум два ученика этого города.
const SCHOOLS = require('./schools');
const schoolCache = new Map();
app.get('/api/schools', wrap(async (req, res) => {
  const city = store.clean(req.query.city, 40);
  if (!city) return res.json({ schools: [] });
  const hit = schoolCache.get(city);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return res.json({ schools: hit.list });
  const fromUsers = await db.schoolsOf(city).catch(() => []);
  const list = [...new Set([...(SCHOOLS[city] || []), ...fromUsers])];
  schoolCache.set(city, { at: Date.now(), list });
  res.set('Cache-Control', 'public, max-age=300').json({ schools: list });
}));

app.post('/api/google', wrap(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'limit' });
  const g = await verifyGoogle(req.body?.credential);
  if (!g) return res.status(401).json({ error: 'google' });
  const row = await db.findByGoogle(g.sub);
  if (row) return newSession(row, res);
  const pending = crypto.randomBytes(24).toString('hex');
  pendingGoogle.set(pending, { ...g, at: Date.now() });
  res.json({ needProfile: true, pending, name: store.clean(g.name, 24) });
}));

app.post('/api/google/complete', wrap(async (req, res) => {
  const b = req.body || {};
  const g = pendingGoogle.get(String(b.pending || ''));
  if (!g) return res.status(400).json({ error: 'expired' });
  if (b.consent !== true) return res.status(400).json({ error: 'consent' });
  const prof = readProfile(b);
  if (prof.error) return res.status(400).json(prof);
  const existing = await db.findByGoogle(g.sub);
  if (existing) { pendingGoogle.delete(b.pending); return newSession(existing, res); }
  const base = (g.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 14).padEnd(3, '0');
  let row = null;
  for (let i = 0; i < 6 && !row; i++) {
    const username = i === 0 ? base : `${base}${crypto.randomInt(10, 9999)}`;
    row = await db.createAccount({ id: crypto.randomUUID(), username, pass_hash: null, google_sub: g.sub, email: g.email, ...prof });
  }
  if (!row) return res.status(409).json({ error: 'server' });
  pendingGoogle.delete(b.pending);
  newSession(row, res);
}));

app.post('/api/google/link', auth, wrap(async (req, res) => {
  const g = await verifyGoogle(req.body?.credential);
  if (!g) return res.status(401).json({ error: 'google' });
  if (!(await db.linkGoogle(req.player.id, g.sub, g.email))) return res.status(409).json({ error: 'googleTaken' });
  res.json({ user: store.PUBLIC(await db.get(req.player.id)) });
}));

app.get('/api/site', wrap(async (req, res) => {
  res.json({ ...(await db.siteStats()), questions: Object.values(BANK).reduce((n, v) => n + v.q.length, 0), combos: Object.keys(COMBOS).length });
}));

// ---------- пробный ЕНТ ----------
const mockPublic = (t, withKey) => {
  const answers = t.answers || {};
  return {
    id: t.id, combo: t.combo, done: !!t.finished_at, endsAt: new Date(t.ends_at).getTime(), now: Date.now(),
    startedAt: new Date(t.started_at).getTime(), finishedAt: t.finished_at ? new Date(t.finished_at).getTime() : null,
    answers, result: t.result || null,
    sections: t.sections.map(sec => ({ k: sec.k, name: mock.names(sec.k), items: sec.items.map((it, i) => mock.view(it, withKey, answers[`${sec.k}.${i}`])) }))
  };
};
async function finishMock(t, raw) {
  const answers = mock.cleanAnswers(t.sections, raw ?? t.answers);
  const result = mock.score(t.sections, answers);
  return (await db.finishMock(t.id, answers, result)) || (await db.getMock(t.id, t.player_id));
}
// Просроченный тест завершается сам — с теми ответами, что успели сохраниться.
async function loadMock(id, pid) {
  const t = await db.getMock(id, pid);
  if (t && !t.finished_at && Date.now() > new Date(t.ends_at).getTime() + mock.GRACE_MS) return finishMock(t);
  return t;
}

app.get('/api/ent/active', auth, wrap(async (req, res) => {
  let t = await db.activeMock(req.player.id);
  if (t && Date.now() > new Date(t.ends_at).getTime() + mock.GRACE_MS) { await finishMock(t); t = null; }
  res.json({ id: t?.id || null, combo: t?.combo || null });
}));
app.get('/api/ent', auth, wrap(async (req, res) => res.json({ tests: await db.listMocks(req.player.id) })));
app.post('/api/ent', auth, wrap(async (req, res) => {
  const combo = String(req.body?.combo || '');
  if (!COMBOS[combo]) return res.status(400).json({ error: 'pick' });
  const active = await db.activeMock(req.player.id);
  if (active && Date.now() <= new Date(active.ends_at).getTime() + mock.GRACE_MS) {
    if (req.body?.restart !== true) return res.json({ id: active.id, resumed: true });
    await finishMock(active);
  }
  const t = { id: crypto.randomUUID(), player_id: req.player.id, combo, sections: mock.build(COMBOS[combo]), ends_at: new Date(Date.now() + mock.DURATION_MS).toISOString() };
  await db.createMock(t);
  res.json({ id: t.id });
}));
app.get('/api/ent/:id', auth, wrap(async (req, res) => {
  const t = await loadMock(String(req.params.id), req.player.id);
  if (!t) return res.status(404).json({ error: 'notfound' });
  res.json(mockPublic(t, !!t.finished_at));
}));
app.put('/api/ent/:id', auth, wrap(async (req, res) => {
  const t = await loadMock(String(req.params.id), req.player.id);
  if (!t) return res.status(404).json({ error: 'notfound' });
  if (t.finished_at) return res.status(409).json({ error: 'finished' });
  await db.saveMock(t.id, mock.cleanAnswers(t.sections, req.body?.answers));
  res.json({ ok: true, now: Date.now() });
}));
app.post('/api/ent/:id/finish', auth, wrap(async (req, res) => {
  let t = await loadMock(String(req.params.id), req.player.id);
  if (!t) return res.status(404).json({ error: 'notfound' });
  if (!t.finished_at) t = await finishMock(t, req.body?.answers);
  res.json(mockPublic(t, true));
}));

// ---------- комнаты ----------
const rooms = new Map();
const queue = new Map(); // topic -> socket

function code() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join(''); } while (rooms.has(c));
  return c;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// В баттлах — только задания с одним ответом и без общего текста: на них хватает 20 секунд.
const QUICK = Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v.q.filter(q => !q.type && !q.c)]));
function take(subject, n) {
  return shuffle(QUICK[subject].slice()).slice(0, n).map(q => ({ ...q, k: subject, s: BANK[subject].name }));
}

function pickQuestions(topic) {
  let list;
  if (topic.startsWith('combo:')) {
    const pair = COMBOS[topic.slice(6)];
    list = COMBO_PLAN.flatMap(([sub, n]) => take(typeof sub === 'number' ? pair[sub] : sub, n));
  } else list = take(topic, ROUND);
  return list.map(q => {
    const order = shuffle([0, 1, 2, 3]);
    return { k: q.k, t: q.t, s: q.s, o: { ru: order.map(i => q.o.ru[i]), kk: order.map(i => q.o.kk[i]) }, a: order.indexOf(q.a), e: q.e };
  });
}

function makeRoom(mode, subject, hostSid) {
  const r = {
    code: code(), mode, subject, hostSid, state: 'lobby', players: new Map(),
    questions: [], i: -1, endsAt: 0, timer: null, touched: Date.now()
  };
  rooms.set(r.code, r);
  return r;
}

function publicRoom(r) {
  const players = [...r.players.values()].map(p => ({
    sid: p.sid, name: p.name, school: p.school, city: p.city, team: p.team,
    score: p.score, connected: p.connected, answered: r.state === 'playing' && p.answers[r.i] !== undefined
  }));
  return {
    code: r.code, mode: r.mode, subject: r.subject, subjectName: topicName(r.subject), state: r.state,
    hostSid: r.hostSid, players, teams: teamScores(r), total: ROUND
  };
}

function teamScores(r) {
  const t = { A: { sum: 0, n: 0 }, B: { sum: 0, n: 0 } };
  for (const p of r.players.values()) if (t[p.team]) { t[p.team].sum += p.score; t[p.team].n += 1; }
  return {
    A: { players: t.A.n, avg: t.A.n ? Math.round(t.A.sum / t.A.n) : 0 },
    B: { players: t.B.n, avg: t.B.n ? Math.round(t.B.sum / t.B.n) : 0 }
  };
}

const emitRoom = r => io.to(r.code).emit('room', publicRoom(r));

function startGame(r) {
  if (r.state !== 'lobby') return;
  r.state = 'countdown';
  r.questions = pickQuestions(r.subject);
  for (const p of r.players.values()) { p.score = 0; p.answers = []; }
  emitRoom(r);
  io.to(r.code).emit('countdown', { seconds: COUNTDOWN_S });
  r.timer = setTimeout(() => { r.state = 'playing'; nextQuestion(r); }, COUNTDOWN_S * 1000);
}

function nextQuestion(r) {
  r.i += 1;
  if (r.i >= r.questions.length) return finish(r);
  const q = r.questions[r.i];
  r.endsAt = Date.now() + QUESTION_MS;
  r.qStart = Date.now();
  emitRoom(r);
  io.to(r.code).emit('question', { i: r.i, total: r.questions.length, t: q.t, s: q.s, o: q.o, endsAt: r.endsAt, duration: QUESTION_MS });
  clearTimeout(r.timer);
  r.timer = setTimeout(() => reveal(r), QUESTION_MS + 300);
}

function reveal(r) {
  if (r.state !== 'playing' || r.revealed === r.i) return;
  r.revealed = r.i;
  clearTimeout(r.timer);
  const q = r.questions[r.i];
  const picks = {};
  for (const p of r.players.values()) picks[p.sid] = p.answers[r.i] || { choice: null, gained: 0 };
  io.to(r.code).emit('reveal', { i: r.i, a: q.a, e: q.e, picks, room: publicRoom(r) });
  r.timer = setTimeout(() => nextQuestion(r), REVEAL_MS);
}

function maybeEarlyReveal(r) {
  const active = [...r.players.values()].filter(p => p.connected);
  if (active.length && active.every(p => p.answers[r.i] !== undefined)) setTimeout(() => reveal(r), 400);
}

async function finish(r) {
  r.state = 'done';
  clearTimeout(r.timer);
  const list = [...r.players.values()];
  const ranking = [...list].sort((a, b) => b.score - a.score || a.time - b.time);
  const changes = {};
  let winner = null;

  const deltas = {}, wins = {};
  if (r.mode === 'duel' && list.length === 2) {
    const [a, b] = list;
    const ra = await db.ratingOf(a.pid).catch(() => 1000);
    const rb = await db.ratingOf(b.pid).catch(() => 1000);
    const res = a.score === b.score ? (a.time === b.time ? 0.5 : a.time < b.time ? 1 : 0) : a.score > b.score ? 1 : 0;
    const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
    const da = Math.round(32 * (res - ea));
    deltas[a.sid] = da; deltas[b.sid] = -da;
    wins[a.sid] = res === 1; wins[b.sid] = res === 0;
    winner = res === 1 ? a.sid : res === 0 ? b.sid : null;
  } else if (r.mode === 'class') {
    const t = teamScores(r);
    winner = t.A.avg === t.B.avg ? null : t.A.avg > t.B.avg ? 'A' : 'B';
    for (const p of list) { deltas[p.sid] = winner === null ? 4 : p.team === winner ? 10 : 2; wins[p.sid] = p.team === winner; }
  }
  Object.assign(changes, deltas);

  // Сохраняем игру: счёт, рейтинг и статистику по предметам для каждого игрока.
  const seen = new Set();
  const rows = list.filter(p => !seen.has(p.pid) && seen.add(p.pid)).map(p => {
    const subjects = {};
    r.questions.forEach((q, i) => {
      const s = subjects[q.k] ||= { answered: 0, correct: 0 };
      s.answered += 1; if (p.answers[i]?.correct) s.correct += 1;
    });
    return { id: p.pid, score: p.score, correct: p.answers.filter(x => x?.correct).length, total: r.questions.length, delta: deltas[p.sid] || 0, win: !!wins[p.sid], subjects };
  });
  await db.recordGame({ mode: r.mode, topic: r.subject, players: rows }).catch(console.error);

  const review = r.questions.map(q => ({ t: q.t, s: q.s, o: q.o, a: q.a, e: q.e }));
  for (const p of list) {
    io.to(p.sid).emit('end', {
      room: publicRoom(r), mode: r.mode, winner, change: changes[p.sid] ?? 0,
      ranking: ranking.map(x => ({ sid: x.sid, name: x.name, school: x.school, team: x.team, score: x.score, correct: x.answers.filter(a => a?.correct).length })),
      teams: teamScores(r), review, mine: r.questions.map((_, i) => p.answers[i]?.choice ?? null)
    });
  }
}

// ---------- сокеты ----------
io.use(async (socket, next) => {
  const t = String(socket.handshake.auth?.token || '');
  const p = /^[a-f0-9]{64}$/.test(t) ? await db.sessionPlayer(t).catch(() => null) : null;
  if (!p) return next(new Error('auth'));
  socket.data.player = p; next();
});

io.on('connection', socket => {
  const pl = socket.data.player;
  let profile = { id: pl.id, name: pl.name, school: pl.school, city: pl.city };
  socket.on('profile_updated', async () => {
    const p = await db.get(profile.id).catch(() => null);
    if (p) profile = { id: p.id, name: p.name, school: p.school, city: p.city };
  });

  const join = (r, team) => {
    for (const p of r.players.values()) {
      if (p.pid === profile.id && !p.connected) { r.players.delete(p.sid); p.sid = socket.id; p.connected = true; r.players.set(socket.id, p); socket.join(r.code); return true; }
    }
    if (r.state !== 'lobby') return false;
    if (r.mode === 'duel' && r.players.size >= 2) return false;
    if (r.mode === 'solo' && r.players.size >= 1) return false;
    const counts = teamScores(r);
    r.players.set(socket.id, {
      sid: socket.id, pid: profile.id, name: profile.name, school: profile.school, city: profile.city,
      team: r.mode === 'class' ? (team === 'A' || team === 'B' ? team : counts.A.players <= counts.B.players ? 'A' : 'B') : null,
      score: 0, time: 0, answers: [], connected: true
    });
    socket.join(r.code);
    r.touched = Date.now();
    return true;
  };

  socket.on('create', ({ mode, subject } = {}, ack) => {
    if (!profile) return ack?.({ error: 'profile' });
    if (!['duel', 'class', 'solo'].includes(mode) || !validTopic(subject)) return ack?.({ error: 'pick' });
    const r = makeRoom(mode, subject, socket.id);
    join(r);
    ack?.({ code: r.code });
    emitRoom(r);
    if (mode === 'solo') startGame(r);
  });

  socket.on('join', ({ code, team } = {}, ack) => {
    if (!profile) return ack?.({ error: 'profile' });
    const r = rooms.get(String(code || '').toUpperCase());
    if (!r) return ack?.({ error: 'notfound' });
    if (!join(r, team)) return ack?.({ error: r.state === 'lobby' ? 'full' : 'started' });
    ack?.({ code: r.code });
    emitRoom(r);
    if (r.state === 'playing') {
      const q = r.questions[r.i];
      socket.emit('question', { i: r.i, total: r.questions.length, t: q.t, s: q.s, o: q.o, endsAt: r.endsAt, duration: QUESTION_MS });
    }
    if (r.mode === 'duel' && r.state === 'lobby' && r.players.size === 2) startGame(r);
  });

  socket.on('team', ({ code, team } = {}) => {
    const r = rooms.get(code); const p = r?.players.get(socket.id);
    if (!p || r.state !== 'lobby' || r.mode !== 'class' || !['A', 'B'].includes(team)) return;
    p.team = team; emitRoom(r);
  });

  socket.on('start', ({ code } = {}, ack) => {
    const r = rooms.get(code);
    if (!r || r.hostSid !== socket.id) return ack?.({ error: 'host' });
    const t = teamScores(r);
    if (r.mode === 'class' && (!t.A.players || !t.B.players)) return ack?.({ error: 'teams' });
    startGame(r); ack?.({ ok: true });
  });

  socket.on('answer', ({ code, i, choice } = {}) => {
    const r = rooms.get(code); const p = r?.players.get(socket.id);
    if (!p || r.state !== 'playing' || i !== r.i || p.answers[i] !== undefined || Date.now() > r.endsAt) return;
    const ms = Date.now() - r.qStart;
    const correct = choice === r.questions[i].a;
    const gained = correct ? 10 + Math.round(5 * Math.max(0, r.endsAt - Date.now()) / QUESTION_MS) : 0;
    p.answers[i] = { choice: Number.isInteger(choice) ? choice : null, correct, gained };
    p.score += gained; p.time += ms;
    emitRoom(r);
    maybeEarlyReveal(r);
  });

  socket.on('quick', ({ subject } = {}, ack) => {
    if (!profile || !validTopic(subject)) return ack?.({ error: 'pick' });
    const other = queue.get(subject);
    if (other && other.connected && other.id !== socket.id && other.data.pid !== profile.id) {
      queue.delete(subject);
      const r = makeRoom('duel', subject, other.id);
      other.emit('matched', { code: r.code });
      ack?.({ code: r.code });
    } else {
      socket.data.pid = profile.id;
      queue.set(subject, socket);
      ack?.({ waiting: true });
    }
  });

  socket.on('cancel_quick', () => { for (const [k, s] of queue) if (s.id === socket.id) queue.delete(k); });

  socket.on('invite', ({ from, code } = {}) => {
    if (profile && rooms.has(code) && typeof from === 'string') socket.to(from).emit('invite', { code, name: profile.name });
  });

  socket.on('leave', ({ code } = {}) => leaveRoom(code));

  function leaveRoom(code) {
    const r = rooms.get(code); const p = r?.players.get(socket.id);
    if (!p) return;
    socket.leave(code);
    if (r.state === 'lobby') {
      r.players.delete(socket.id);
      if (r.hostSid === socket.id) r.hostSid = r.players.keys().next().value;
    } else p.connected = false;
    if (!r.players.size || ![...r.players.values()].some(x => x.connected)) { clearTimeout(r.timer); rooms.delete(code); return; }
    emitRoom(r);
    if (r.state === 'playing') maybeEarlyReveal(r);
  }

  socket.on('disconnect', () => {
    for (const [k, s] of queue) if (s.id === socket.id) queue.delete(k);
    for (const r of rooms.values()) if (r.players.has(socket.id)) leaveRoom(r.code);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) if (now - r.touched > 60 * 60 * 1000 && r.state !== 'playing') { clearTimeout(r.timer); rooms.delete(r.code); }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
db.init().then(() => server.listen(PORT, () => console.log(`Bilim Arena: http://localhost:${PORT}`)))
  .catch(e => { console.error('DB init failed', e); process.exit(1); });
