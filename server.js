const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const BANK = require('./questions');
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
// Комбинации профильных предметов ЕНТ, по которым есть вопросы в банке.
const COMBOS = {
  'math-physics': ['math', 'physics'],
  'math-geography': ['math', 'geography'],
  'biology-chemistry': ['biology', 'chemistry'],
  'biology-geography': ['biology', 'geography'],
  'chemistry-physics': ['chemistry', 'physics']
};
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

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));
app.get('/api/subjects', (req, res) => res.json({ subjects: SUBJECTS, mandatory: MANDATORY, combos: COMBOS, count: Object.values(BANK).reduce((n, v) => n + v.q.length, 0) }));
app.get('/api/leaders', async (req, res) => {
  try { res.json(await db.leaders()); } catch (e) { console.error(e); res.status(500).json({ error: 'unavailable' }); }
});
app.get('/api/stats', (req, res) => res.json({ online: io.engine.clientsCount, battles: [...rooms.values()].filter(r => r.state === 'playing').length }));
app.get(['/b/:code', '/rating', '/play'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

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

function take(subject, n) {
  return shuffle(BANK[subject].q.slice()).slice(0, n).map(q => ({ ...q, s: BANK[subject].name }));
}

function pickQuestions(topic) {
  let list;
  if (topic.startsWith('combo:')) {
    const pair = COMBOS[topic.slice(6)];
    list = COMBO_PLAN.flatMap(([sub, n]) => take(typeof sub === 'number' ? pair[sub] : sub, n));
  } else list = take(topic, ROUND);
  return list.map(q => {
    const order = shuffle([0, 1, 2, 3]);
    return { t: q.t, s: q.s, o: { ru: order.map(i => q.o.ru[i]), kk: order.map(i => q.o.kk[i]) }, a: order.indexOf(q.a), e: q.e };
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

  if (r.mode === 'duel' && list.length === 2) {
    const [a, b] = list;
    const ra = (await db.get(a.pid))?.rating ?? 1000;
    const rb = (await db.get(b.pid))?.rating ?? 1000;
    const res = a.score === b.score ? (a.time === b.time ? 0.5 : a.time < b.time ? 1 : 0) : a.score > b.score ? 1 : 0;
    const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
    const da = Math.round(32 * (res - ea));
    changes[a.sid] = da; changes[b.sid] = -da;
    winner = res === 1 ? a.sid : res === 0 ? b.sid : null;
    await db.apply([{ id: a.pid, delta: da, win: res === 1 }, { id: b.pid, delta: -da, win: res === 0 }]).catch(console.error);
  } else if (r.mode === 'class') {
    const t = teamScores(r);
    winner = t.A.avg === t.B.avg ? null : t.A.avg > t.B.avg ? 'A' : 'B';
    const ups = list.map(p => {
      const d = winner === null ? 4 : p.team === winner ? 10 : 2;
      changes[p.sid] = d;
      return { id: p.pid, delta: d, win: p.team === winner };
    });
    await db.apply(ups).catch(console.error);
  }

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
io.on('connection', socket => {
  let profile = null;

  socket.on('hello', async (p, ack) => {
    const id = String(p?.id || '');
    const name = store.clean(p?.name, 24);
    if (!/^[a-z0-9-]{8,40}$/i.test(id) || name.length < 2) return ack?.({ error: 'name' });
    profile = { id, name, school: store.clean(p?.school, 60), city: store.clean(p?.city, 40) };
    try { const row = await db.upsert(profile); ack?.({ ok: true, rating: row.rating, games: row.games, wins: row.wins }); }
    catch (e) { console.error(e); ack?.({ ok: true, rating: 1000, games: 0, wins: 0 }); }
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
