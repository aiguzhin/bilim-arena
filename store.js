// Хранилище Bilim Arena: аккаунты, сессии, игры и статистика.
// Postgres, если задан DATABASE_URL, иначе — память + JSON-файл (для локальной разработки).
const fs = require('fs');
const path = require('path');

function clean(s, max = 40) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

const PUBLIC = p => p && ({ id: p.id, username: p.username, name: p.name, school: p.school, city: p.city, rating: p.rating, games: p.games, wins: p.wins, createdAt: p.created_at, google: !!p.google_sub, hasPassword: !!p.pass_hash });

// ---------- память ----------
function memoryStore() {
  const file = path.join(__dirname, 'data', 'db.json');
  let db = { players: {}, sessions: {}, games: [], subj: {} };
  try { db = { ...db, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(db)); } catch {} }, 300);
  };
  const byUsername = u => Object.values(db.players).find(p => p.username === u) || null;
  return {
    async init() {},
    async createAccount(a) {
      if (byUsername(a.username)) return null;
      db.players[a.id] = { ...a, rating: 1000, games: 0, wins: 0, created_at: new Date().toISOString() };
      save(); return db.players[a.id];
    },
    async findByUsername(u) { return byUsername(u); },
    async findByGoogle(sub) { return Object.values(db.players).find(p => p.google_sub === sub) || null; },
    async linkGoogle(id, sub, email) {
      if (Object.values(db.players).some(p => p.google_sub === sub && p.id !== id)) return false;
      Object.assign(db.players[id], { google_sub: sub, email }); save(); return true;
    },
    async get(id) { return db.players[id] || null; },
    async updateProfile(id, p) { Object.assign(db.players[id], p); save(); return db.players[id]; },
    async createSession(token, playerId) { db.sessions[token] = { playerId, created: Date.now() }; save(); },
    async sessionPlayer(token) { const s = db.sessions[token]; return s ? db.players[s.playerId] || null : null; },
    async deleteSession(token) { delete db.sessions[token]; save(); },
    async recordGame(g) {
      const id = db.games.length + 1;
      db.games.push({ id, mode: g.mode, topic: g.topic, created_at: new Date().toISOString(), players: g.players });
      for (const p of g.players) {
        const pl = db.players[p.id]; if (!pl) continue;
        pl.rating = Math.max(100, pl.rating + p.delta); pl.games += 1; if (p.win) pl.wins += 1;
        for (const [k, v] of Object.entries(p.subjects)) {
          const key = `${p.id}|${k}`; const s = db.subj[key] ||= { answered: 0, correct: 0 };
          s.answered += v.answered; s.correct += v.correct;
        }
      }
      save();
    },
    async ratingOf(id) { return db.players[id]?.rating ?? 1000; },
    async profileStats(id) {
      const subjects = Object.entries(db.subj).filter(([k]) => k.startsWith(id + '|')).map(([k, v]) => ({ subject: k.split('|')[1], ...v }));
      const recent = db.games.filter(g => g.players.some(p => p.id === id)).slice(-10).reverse().map(g => {
        const me = g.players.find(p => p.id === id);
        return { mode: g.mode, topic: g.topic, created_at: g.created_at, score: me.score, correct: me.correct, total: me.total, delta: me.delta, won: me.win };
      });
      return { subjects, recent };
    },
    async leaders() {
      const list = Object.values(db.players).filter(p => p.games > 0);
      const group = key => {
        const m = {};
        for (const p of list) { const k = key(p); if (!k) continue; (m[k] ||= { name: k, city: p.city, sum: 0, n: 0 }); m[k].sum += p.rating; m[k].n += 1; }
        return Object.values(m).map(g => ({ name: g.name, city: g.city, rating: Math.round(g.sum / g.n), players: g.n })).sort((a, b) => b.rating - a.rating).slice(0, 50);
      };
      return {
        players: [...list].sort((a, b) => b.rating - a.rating).slice(0, 50).map(p => ({ name: p.name, school: p.school, city: p.city, rating: p.rating, games: p.games, wins: p.wins })),
        schools: group(p => p.school ? `${p.school}|${p.city}` : '').map(s => ({ ...s, name: s.name.split('|')[0] })),
        cities: group(p => p.city).map(({ city, ...c }) => c)
      };
    },
    async createMock(t) { (db.mocks ||= {})[t.id] = { ...t, answers: {}, finished_at: null, score: null, result: null }; save(); },
    async getMock(id, pid) { const t = db.mocks?.[id]; return t && t.player_id === pid ? t : null; },
    async activeMock(pid) { return Object.values(db.mocks || {}).find(t => t.player_id === pid && !t.finished_at) || null; },
    async saveMock(id, answers) { const t = db.mocks?.[id]; if (t && !t.finished_at) { t.answers = answers; save(); } },
    async finishMock(id, answers, result) { const t = db.mocks?.[id]; if (t && !t.finished_at) { Object.assign(t, { answers, result, score: result.total, finished_at: new Date().toISOString() }); save(); } return t; },
    async listMocks(pid) { return Object.values(db.mocks || {}).filter(t => t.player_id === pid && t.finished_at).sort((a, b) => b.finished_at.localeCompare(a.finished_at)).slice(0, 30).map(t => ({ id: t.id, combo: t.combo, score: t.score, result: t.result, finished_at: t.finished_at })); },
    async schoolsOf(city) {
      const m = {};
      for (const p of Object.values(db.players)) if (p.city === city && p.school) m[p.school] = (m[p.school] || 0) + 1;
      return Object.entries(m).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 300).map(([name]) => name);
    },
    async siteStats() {
      const players = Object.values(db.players);
      return {
        users: players.length,
        schools: new Set(players.map(p => `${p.school}|${p.city}`)).size,
        cities: new Set(players.map(p => p.city)).size,
        games: db.games.length,
        answers: Object.values(db.subj).reduce((n, s) => n + s.answered, 0)
      };
    }
  };
}

// ---------- Postgres ----------
function pgStore(url) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
  const q = (sql, args) => pool.query(sql, args);
  return {
    async init() {
      await q(`create table if not exists players (
        id text primary key, name text not null, school text, city text,
        rating int not null default 1000, games int not null default 0, wins int not null default 0,
        updated_at timestamptz not null default now())`);
      await q(`alter table players add column if not exists username text`);
      await q(`alter table players add column if not exists pass_hash text`);
      await q(`alter table players add column if not exists created_at timestamptz not null default now()`);
      await q(`create unique index if not exists players_username_key on players (username)`);
      await q(`alter table players add column if not exists google_sub text`);
      await q(`alter table players add column if not exists email text`);
      await q(`create unique index if not exists players_google_key on players (google_sub)`);
      // Записи гостей из первой версии сайта: без логина в них войти нельзя, из рейтинга убираем.
      await q(`delete from players where username is null`);
      await q(`create table if not exists sessions (
        token text primary key, player_id text not null references players(id) on delete cascade,
        created_at timestamptz not null default now())`);
      await q(`create table if not exists games (
        id bigserial primary key, mode text not null, topic text not null, created_at timestamptz not null default now())`);
      await q(`create table if not exists game_players (
        game_id bigint not null references games(id) on delete cascade, player_id text not null references players(id) on delete cascade,
        score int not null, correct int not null, total int not null, rating_delta int not null, won boolean not null,
        primary key (game_id, player_id))`);
      await q(`create table if not exists mock_tests (
        id text primary key, player_id text not null references players(id) on delete cascade, combo text not null,
        sections jsonb not null, answers jsonb not null default '{}', started_at timestamptz not null default now(),
        ends_at timestamptz not null, finished_at timestamptz, score int, result jsonb)`);
      await q(`create index if not exists mock_tests_player on mock_tests (player_id, finished_at)`);
      await q(`create table if not exists subject_stats (
        player_id text not null references players(id) on delete cascade, subject text not null,
        answered int not null default 0, correct int not null default 0, primary key (player_id, subject))`);
    },
    async createAccount(a) {
      const r = await q(
        `insert into players (id, username, pass_hash, name, school, city, google_sub, email) values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict do nothing returning *`, [a.id, a.username, a.pass_hash || null, a.name, a.school, a.city, a.google_sub || null, a.email || null]);
      return r.rows[0] || null;
    },
    async findByUsername(u) { return (await q('select * from players where username=$1', [u])).rows[0] || null; },
    async findByGoogle(sub) { return (await q('select * from players where google_sub=$1', [sub])).rows[0] || null; },
    async linkGoogle(id, sub, email) {
      try { await q('update players set google_sub=$2, email=$3, updated_at=now() where id=$1', [id, sub, email]); return true; }
      catch (e) { if (e.code === '23505') return false; throw e; }
    },
    async get(id) { return (await q('select * from players where id=$1', [id])).rows[0] || null; },
    async updateProfile(id, p) {
      return (await q('update players set name=$2, school=$3, city=$4, updated_at=now() where id=$1 returning *', [id, p.name, p.school, p.city])).rows[0];
    },
    async createSession(token, playerId) { await q('insert into sessions (token, player_id) values ($1,$2)', [token, playerId]); },
    async sessionPlayer(token) {
      return (await q(`select p.* from sessions s join players p on p.id=s.player_id
        where s.token=$1 and s.created_at > now() - interval '180 days'`, [token])).rows[0] || null;
    },
    async deleteSession(token) { await q('delete from sessions where token=$1', [token]); },
    async recordGame(g) {
      const c = await pool.connect();
      try {
        await c.query('begin');
        const gid = (await c.query('insert into games (mode, topic) values ($1,$2) returning id', [g.mode, g.topic])).rows[0].id;
        for (const p of g.players) {
          await c.query('update players set rating=greatest(100, rating+$2), games=games+1, wins=wins+$3, updated_at=now() where id=$1', [p.id, p.delta, p.win ? 1 : 0]);
          await c.query(`insert into game_players (game_id, player_id, score, correct, total, rating_delta, won) values ($1,$2,$3,$4,$5,$6,$7)
            on conflict do nothing`, [gid, p.id, p.score, p.correct, p.total, p.delta, p.win]);
          for (const [k, v] of Object.entries(p.subjects)) {
            await c.query(`insert into subject_stats (player_id, subject, answered, correct) values ($1,$2,$3,$4)
              on conflict (player_id, subject) do update set answered=subject_stats.answered+$3, correct=subject_stats.correct+$4`, [p.id, k, v.answered, v.correct]);
          }
        }
        await c.query('commit');
      } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
    },
    async ratingOf(id) { return (await q('select rating from players where id=$1', [id])).rows[0]?.rating ?? 1000; },
    async profileStats(id) {
      const subjects = (await q('select subject, answered, correct from subject_stats where player_id=$1', [id])).rows;
      const recent = (await q(`select g.mode, g.topic, g.created_at, gp.score, gp.correct, gp.total, gp.rating_delta as delta, gp.won
        from game_players gp join games g on g.id=gp.game_id where gp.player_id=$1 order by g.created_at desc limit 10`, [id])).rows;
      return { subjects, recent };
    },
    async leaders() {
      const players = (await q('select name, school, city, rating, games, wins from players where games>0 order by rating desc limit 50')).rows;
      const schools = (await q(`select school as name, city, round(avg(rating))::int as rating, count(*)::int as players
        from players where games>0 and school<>'' group by school, city order by rating desc limit 50`)).rows;
      const cities = (await q(`select city as name, round(avg(rating))::int as rating, count(*)::int as players
        from players where games>0 and city<>'' group by city order by rating desc limit 50`)).rows;
      return { players, schools, cities };
    },
    async createMock(t) {
      await q('insert into mock_tests (id, player_id, combo, sections, ends_at) values ($1,$2,$3,$4,$5)', [t.id, t.player_id, t.combo, JSON.stringify(t.sections), t.ends_at]);
    },
    async getMock(id, pid) { return (await q('select * from mock_tests where id=$1 and player_id=$2', [id, pid])).rows[0] || null; },
    async activeMock(pid) { return (await q('select * from mock_tests where player_id=$1 and finished_at is null order by started_at desc limit 1', [pid])).rows[0] || null; },
    async saveMock(id, answers) { await q('update mock_tests set answers=$2 where id=$1 and finished_at is null', [id, JSON.stringify(answers)]); },
    async finishMock(id, answers, result) {
      return (await q('update mock_tests set answers=$2, result=$3, score=$4, finished_at=now() where id=$1 and finished_at is null returning *',
        [id, JSON.stringify(answers), JSON.stringify(result), result.total])).rows[0] || null;
    },
    async listMocks(pid) {
      return (await q('select id, combo, score, result, finished_at from mock_tests where player_id=$1 and finished_at is not null order by finished_at desc limit 30', [pid])).rows;
    },
    async schoolsOf(city) {
      return (await q(`select school from players where city=$1 and school<>'' group by school
        having count(*) >= 2 order by count(*) desc limit 300`, [city])).rows.map(r => r.school);
    },
    async siteStats() {
      const r = (await q(`select
        (select count(*) from players)::int as users,
        (select count(distinct (school, city)) from players)::int as schools,
        (select count(distinct city) from players)::int as cities,
        (select count(*) from games)::int as games,
        (select coalesce(sum(answered),0) from subject_stats)::int as answers`)).rows[0];
      return r;
    }
  };
}

module.exports = { clean, PUBLIC, create: () => process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : memoryStore() };
