// Хранилище для школьной части: роли, классы, турниры, работа над ошибками, проверка подозрительных результатов.
// Два варианта: в памяти (локальная разработка) и Postgres.

const ENTRY_KEYS = ['registered_at', 'started_at', 'finished_at', 'items', 'answers', 'times', 'served_at', 'cur', 'meta', 'score', 'correct', 'max', 'time_ms', 'flag', 'cleared'];
const ENTRY_JSON = new Set(['items', 'answers', 'times', 'meta']);
const crypto = require('crypto');
const pv = ph => (ph ? crypto.createHash('md5').update(ph).digest('hex') : null);
const sess = r => r && ({ ...r, starts_at: iso(r.starts_at), ends_at: iso(r.ends_at), reg_until: iso(r.reg_until), created_at: iso(r.created_at) });
const iso = v => (v == null ? null : v instanceof Date ? v.toISOString() : v);

// ---------- память ----------
function memory(db, save) {
  db.classes ||= {}; db.tours ||= {}; db.entries ||= {}; db.fixed ||= {}; db.practice ||= []; db.friends ||= []; db.sessions ||= {}; db.regs ||= {}; db.kv ||= {}; db.minis ||= []; db.daily ||= []; db.tstats ||= {};
  const pair = (x, y) => (x < y ? [x, y] : [y, x]);
  const members = cid => Object.values(db.players).filter(p => p.class_id === cid);
  const gamesRows = ids => db.games.flatMap(g => g.players.filter(p => !ids || ids.has(p.id)).map(p => ({ player_id: p.id, created_at: g.created_at, won: !!p.win, mode: g.mode })));
  const entryPlayer = e => { const p = db.players[e.player_id] || {}; return { ...e, username: p.username, name: p.name, school: p.school, city: p.city, photo_v: pv(p.photo), avatar: p.avatar || null, role: p.role || null }; };
  const ranked = tid => Object.values(db.entries).filter(e => e.tour_id === tid && e.finished_at && (!e.flag || e.cleared))
    .sort((a, b) => b.score - a.score || a.time_ms - b.time_ms);
  return {
    async kvGet(k) { return db.kv[k] || null; },
    async topicAdd(pid, key, ok) { const m = db.tstats[pid] ||= {}; const x = m[key] ||= [0, 0]; x[0] += 1; if (ok) x[1] += 1; save(); },
    async topicRows(pid) { return Object.entries(db.tstats[pid] || {}).map(([key, [answered, correct]]) => ({ key, answered, correct })); },
    async dailyGet(day, pid) { return db.daily.find(d => d.day === day && d.player_id === pid) || null; },
    async dailyAdd(day, pid, choice, ok) { if (db.daily.some(d => d.day === day && d.player_id === pid)) return false; db.daily.push({ day, player_id: pid, choice, ok }); save(); return true; },
    async dailyStat(day) { const l = db.daily.filter(d => d.day === day); return { n: l.length, ok: l.filter(d => d.ok).length }; },
    async addMini(r) { db.minis.push({ ...r, created_at: new Date().toISOString() }); save(); },
    async miniTop(mode, since, limit = 10) {
      const best = {};
      for (const m of db.minis) if (m.mode === mode && m.score > 0 && m.created_at >= since && (!best[m.player_id] || m.score > best[m.player_id].score)) best[m.player_id] = m;
      return Object.values(best).sort((a, b) => b.score - a.score).slice(0, limit).map(m => ({ ...entryPlayer({ player_id: m.player_id }), score: m.score, subject: m.subject }));
    },
    async miniBest(pid, mode) { return db.minis.filter(m => m.player_id === pid && m.mode === mode).reduce((b, m) => Math.max(b, m.score), 0); },
    async recentBattles(n) {
      return db.games.filter(g => g.mode !== 'solo' && g.players.length >= 2).slice(-n).reverse().map(g => ({
        mode: g.mode, topic: g.topic, at: g.created_at,
        players: g.players.slice().sort((a, b) => b.score - a.score).map(p => { const pl = db.players[p.id] || {}; return { username: pl.username, name: pl.name, school: pl.school, city: pl.city, avatar: pl.avatar || null, photo_v: pv(pl.photo), score: p.score, won: !!p.win }; })
      }));
    },
    async kvSet(k, v) { db.kv[k] = { val: v, updated_at: new Date().toISOString() }; save(); },
    async setRole(id, role) { db.players[id].role = role; save(); return db.players[id]; },
    async setClass(id, cid) { db.players[id].class_id = cid; save(); return db.players[id]; },
    async createClass(c) { db.classes[c.id] = { ...c, goal: c.goal ?? 20, created_at: new Date().toISOString() }; save(); return db.classes[c.id]; },
    async getClass(id) { return db.classes[id] || null; },
    async classByCode(code) { return Object.values(db.classes).find(c => c.code === code) || null; },
    async classesOf(tid) { return Object.values(db.classes).filter(c => c.teacher_id === tid).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(c => ({ ...c, students: members(c.id).length })); },
    async updateClass(id, x) { Object.assign(db.classes[id], x); save(); return db.classes[id]; },
    async deleteClass(id) { for (const p of members(id)) p.class_id = null; delete db.classes[id]; save(); },
    async members(cid) { return members(cid).map(p => ({ ...p, photo: undefined, photo_v: pv(p.photo) })); },
    async rows(ids) {
      const set = ids ? new Set(ids) : null, has = id => !set || set.has(id);
      return {
        players: Object.values(db.players).filter(p => p.username && has(p.id)).map(p => ({ ...p, photo: undefined, photo_v: pv(p.photo) })),
        mocks: Object.values(db.mocks || {}).filter(t => t.finished_at && has(t.player_id)).map(t => ({ id: t.id, player_id: t.player_id, combo: t.combo, score: t.score, result: t.result, meta: t.meta || null, started_at: t.started_at || t.created_at, finished_at: t.finished_at, flag: t.flag || null, cleared: !!t.cleared })),
        entries: Object.values(db.entries).filter(e => e.finished_at && has(e.player_id)).map(e => ({ tour_id: e.tour_id, player_id: e.player_id, score: e.score, max: e.max, correct: e.correct, time_ms: e.time_ms, finished_at: e.finished_at, flag: e.flag || null, cleared: !!e.cleared, meta: e.meta || null })),
        games: gamesRows(set),
        practice: db.practice.filter(x => has(x.player_id))
      };
    },
    async clearMockFlag(id) { const t = db.mocks?.[id]; if (t) { t.cleared = true; save(); } },
    async clearEntryFlag(tid, pid) { const e = db.entries[`${tid}|${pid}`]; if (e) { e.cleared = true; save(); } },

    async createTour(t) { if (!db.tours[t.id]) { db.tours[t.id] = { ...t, created_at: new Date().toISOString() }; save(); } return db.tours[t.id]; },
    async getTour(id) { return db.tours[id] || null; },
    async deleteTour(id) { delete db.tours[id]; for (const k of Object.keys(db.entries)) if (k.startsWith(id + '|')) delete db.entries[k]; save(); },
    async listTours({ classIds = [], school = null, city = null, since }) {
      return Object.values(db.tours).filter(t => new Date(t.ends_at) > new Date(since) && (t.kind === 'weekly' || classIds.includes(t.class_id) || (t.kind === 'school' && t.school === school && t.city === city)))
        .map(t => ({ ...t, items: undefined, n: t.items.length, count: Object.values(db.entries).filter(e => e.tour_id === t.id).length }))
        .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
    },
    async pastTours(pid, limit = 20) {
      const mine = Object.values(db.entries).filter(e => e.player_id === pid && e.finished_at).map(e => e.tour_id);
      return Object.values(db.tours).filter(t => mine.includes(t.id)).sort((a, b) => String(b.starts_at).localeCompare(String(a.starts_at))).slice(0, limit).map(t => ({ ...t, items: undefined, n: t.items.length }));
    },
    async toursOfClass(cid) { return Object.values(db.tours).filter(t => t.class_id === cid).sort((a, b) => String(b.starts_at).localeCompare(String(a.starts_at))).slice(0, 30).map(t => ({ ...t, items: undefined, n: t.items.length, count: Object.values(db.entries).filter(e => e.tour_id === t.id && e.finished_at).length })); },
    async getEntry(tid, pid) { return db.entries[`${tid}|${pid}`] || null; },
    async addEntry(e) { const k = `${e.tour_id}|${e.player_id}`; if (!db.entries[k]) { db.entries[k] = { answers: [], times: [], meta: {}, cur: 0, ...e }; save(); } return db.entries[k]; },
    async updateEntry(tid, pid, patch) { const e = db.entries[`${tid}|${pid}`]; if (!e) return null; for (const k of ENTRY_KEYS) if (k in patch) e[k] = patch[k]; save(); return e; },
    async entriesOf(tid) { return Object.values(db.entries).filter(e => e.tour_id === tid).map(entryPlayer); },
    async placesOf(pid) {
      return Object.values(db.entries).filter(e => e.player_id === pid && e.finished_at).map(e => {
        const list = ranked(e.tour_id), i = list.findIndex(x => x.player_id === pid);
        return { tour_id: e.tour_id, place: i < 0 ? null : i + 1, of: list.length, score: e.score, finished_at: e.finished_at };
      });
    },

    async fixedIds(pid) { return db.fixed[pid] || []; },
    async addFixed(pid, ids) { const s = new Set(db.fixed[pid] || []); ids.forEach(i => s.add(i)); db.fixed[pid] = [...s]; save(); },
    async logPractice(pid, n, correct) { db.practice.push({ player_id: pid, n, correct, created_at: new Date().toISOString() }); save(); },
    async mistakeSources(pid) {
      const mocks = Object.values(db.mocks || {}).filter(t => t.player_id === pid && t.finished_at).sort((a, b) => b.finished_at.localeCompare(a.finished_at)).slice(0, 15).map(t => ({ sections: t.sections, answers: t.answers || {}, at: t.finished_at }));
      const entries = Object.values(db.entries).filter(e => e.player_id === pid && e.finished_at).map(e => ({ items: e.items || [], answers: e.answers || [], at: e.finished_at }));
      return { mocks, entries };
    },
    // друзья: одна запись на пару (a < b), статус pending или accepted
    async friendRow(x, y) { const [a, b] = pair(x, y); return db.friends.find(f => f.a === a && f.b === b) || null; },
    async friendRows(pid) { return db.friends.filter(f => f.a === pid || f.b === pid); },
    async setFriend(x, y, status, requester) {
      const [a, b] = pair(x, y); let f = db.friends.find(r => r.a === a && r.b === b);
      if (!f) { f = { a, b, created_at: new Date().toISOString() }; db.friends.push(f); }
      Object.assign(f, { status, requester }); save(); return f;
    },
    async deleteFriend(x, y) { const [a, b] = pair(x, y); db.friends = db.friends.filter(f => !(f.a === a && f.b === b)); save(); },
    async playersByIds(ids) { return ids.map(id => db.players[id]).filter(Boolean).map(p => ({ ...p, photo: undefined, photo_v: pv(p.photo) })); },
    async searchPlayers(qs, limit = 12) {
      const t = qs.toLowerCase();
      return Object.values(db.players).filter(p => p.username && (p.username.startsWith(t) || String(p.name).toLowerCase().includes(t))).slice(0, limit).map(p => ({ ...p, photo: undefined, photo_v: pv(p.photo) }));
    },
    async setUsername(id, username) { if (Object.values(db.players).some(p => p.username === username && p.id !== id)) return null; db.players[id].username = username; save(); return db.players[id]; },
    // сессии пробного ЕНТ и записи на них
    async createEntSession(x) { if (!db.sessions[x.id]) { db.sessions[x.id] = { ...x, created_at: new Date().toISOString() }; save(); } return db.sessions[x.id]; },
    async getEntSession(id) { return db.sessions[id] || null; },
    async deleteEntSession(id) { delete db.sessions[id]; for (const k of Object.keys(db.regs)) if (k.startsWith(id + '|')) delete db.regs[k]; save(); },
    async listEntSessions({ since, school = null, city = null }) {
      return Object.values(db.sessions).filter(x => new Date(x.ends_at) > new Date(since) && (x.kind === 'weekly' || (x.school === school && x.city === city)))
        .map(x => ({ ...x, count: Object.values(db.regs).filter(r => r.session_id === x.id).length })).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    },
    async getReg(sid, pid) { return db.regs[`${sid}|${pid}`] || null; },
    async regsOf(pid) { return Object.values(db.regs).filter(r => r.player_id === pid).map(r => ({ ...r, session: db.sessions[r.session_id] })).filter(r => r.session); },
    async regByIkt(ikt) { return Object.values(db.regs).find(r => r.ikt === ikt) || null; },
    async addReg(r) { db.regs[`${r.session_id}|${r.player_id}`] = { ...r, created_at: new Date().toISOString(), mock_id: null }; save(); return db.regs[`${r.session_id}|${r.player_id}`]; },
    async dropReg(sid, pid) { delete db.regs[`${sid}|${pid}`]; save(); },
    async setRegMock(sid, pid, mid) { const r = db.regs[`${sid}|${pid}`]; if (r) { r.mock_id = mid; save(); } },
    async sessionResults(sid) {
      return Object.values(db.regs).filter(r => r.session_id === sid).map(r => {
        const p = db.players[r.player_id] || {}, t = r.mock_id && db.mocks?.[r.mock_id];
        return { player_id: r.player_id, username: p.username, name: p.name, school: p.school, city: p.city, avatar: p.avatar || null, photo_v: pv(p.photo), combo: r.combo, ikt: r.ikt,
          score: t?.finished_at ? t.score : null, pass: t?.result?.pass ?? null, flag: t?.flag && !t?.cleared ? t.flag : null, started: !!t };
      });
    },
    async dropPlayerEdu(id) {
      for (const k of Object.keys(db.regs)) if (k.endsWith('|' + id)) delete db.regs[k];
      db.friends = db.friends.filter(f => f.a !== id && f.b !== id);
      for (const k of Object.keys(db.entries)) if (k.endsWith('|' + id)) delete db.entries[k];
      delete db.fixed[id]; db.practice = db.practice.filter(x => x.player_id !== id);
      for (const c of Object.values(db.classes)) if (c.teacher_id === id) { for (const p of members(c.id)) p.class_id = null; delete db.classes[c.id]; }
    }
  };
}

// ---------- Postgres ----------
function pg(q) {
  const tour = r => r && ({ ...r, starts_at: iso(r.starts_at), join_until: iso(r.join_until), ends_at: iso(r.ends_at), created_at: iso(r.created_at), duration_ms: Number(r.duration_ms) });
  const entry = r => r && ({ ...r, served_at: r.served_at == null ? null : Number(r.served_at), registered_at: iso(r.registered_at), started_at: iso(r.started_at), finished_at: iso(r.finished_at), time_ms: r.time_ms == null ? null : Number(r.time_ms) });
  return {
    async kvGet(k) { const r = (await q('select val, updated_at from kv where key=$1', [k])).rows[0]; return r ? { val: r.val, updated_at: iso(r.updated_at) } : null; },
    async topicAdd(pid, key, ok) { await q('insert into topic_stats (player_id, key, answered, correct) values ($1,$2,1,$3) on conflict (player_id, key) do update set answered = topic_stats.answered + 1, correct = topic_stats.correct + $3', [pid, key, ok ? 1 : 0]); },
    async topicRows(pid) { return (await q('select key, answered, correct from topic_stats where player_id=$1', [pid])).rows; },
    async dailyGet(day, pid) { return (await q('select choice, ok from daily_answers where day=$1 and player_id=$2', [day, pid])).rows[0] || null; },
    async dailyAdd(day, pid, choice, ok) { return (await q('insert into daily_answers (day, player_id, choice, ok) values ($1,$2,$3,$4) on conflict do nothing', [day, pid, choice, ok])).rowCount === 1; },
    async dailyStat(day) { const r = (await q('select count(*)::int as n, count(*) filter (where ok)::int as ok from daily_answers where day=$1', [day])).rows[0]; return { n: r.n, ok: r.ok }; },
    async addMini(r) { await q('insert into minigames (player_id, mode, subject, score, correct, total) values ($1,$2,$3,$4,$5,$6)', [r.player_id, r.mode, r.subject, r.score, r.correct, r.total]); },
    async miniTop(mode, since, limit = 10) {
      return (await q(`select distinct on (m.player_id) m.player_id, m.score, m.subject, p.username, p.name, p.school, p.city, p.avatar, md5(p.photo) as photo_v
        from minigames m join players p on p.id=m.player_id where m.mode=$1 and m.score > 0 and m.created_at >= $2 order by m.player_id, m.score desc`, [mode, since])).rows
        .sort((a, b) => b.score - a.score).slice(0, limit);
    },
    async miniBest(pid, mode) { return (await q('select coalesce(max(score),0) as b from minigames where player_id=$1 and mode=$2', [pid, mode])).rows[0].b; },
    async recentBattles(n) {
      return (await q(`select g.mode, g.topic, g.created_at as at, json_agg(json_build_object('username',p.username,'name',p.name,'school',p.school,'city',p.city,'avatar',p.avatar,'photo_v',md5(p.photo),'score',gp.score,'won',gp.won) order by gp.score desc) as players
        from games g join game_players gp on gp.game_id=g.id join players p on p.id=gp.player_id where g.mode <> 'solo' and g.created_at > now() - interval '30 days'
        group by g.id having count(*) >= 2 order by g.created_at desc limit $1`, [n])).rows.map(r => ({ ...r, at: iso(r.at) }));
    },
    async kvSet(k, v) { await q('insert into kv (key, val, updated_at) values ($1,$2,now()) on conflict (key) do update set val=excluded.val, updated_at=now()', [k, JSON.stringify(v)]); },
    async init() {
      await q(`create table if not exists kv (key text primary key, val jsonb not null, updated_at timestamptz not null default now())`);
      await q(`create table if not exists minigames (id bigserial primary key, player_id text not null references players(id) on delete cascade, mode text not null, subject text not null, score int not null, correct int not null, total int not null, created_at timestamptz not null default now())`);
      await q(`create index if not exists minigames_mode_time on minigames (mode, created_at)`);
      await q(`create table if not exists topic_stats (player_id text not null references players(id) on delete cascade, key text not null, answered int not null default 0, correct int not null default 0, primary key (player_id, key))`);
      await q(`create table if not exists daily_answers (day text not null, player_id text not null references players(id) on delete cascade, choice int not null, ok boolean not null, created_at timestamptz not null default now(), primary key (day, player_id))`);
      await q(`alter table players add column if not exists role text`);
      await q(`alter table players add column if not exists class_id text`);
      await q(`alter table mock_tests add column if not exists meta jsonb`);
      await q(`alter table mock_tests add column if not exists flag text`);
      await q(`alter table mock_tests add column if not exists cleared boolean not null default false`);
      await q(`create table if not exists classes (
        id text primary key, code text not null unique, name text not null, school text not null, city text not null,
        teacher_id text not null references players(id) on delete cascade, goal int not null default 20, created_at timestamptz not null default now())`);
      await q(`create table if not exists tours (
        id text primary key, kind text not null, title text not null, topic text not null, lang text, class_id text, school text, city text,
        created_by text, starts_at timestamptz not null, join_until timestamptz not null, ends_at timestamptz not null, duration_ms bigint not null,
        items jsonb not null, created_at timestamptz not null default now())`);
      await q(`create index if not exists tours_ends on tours (ends_at)`);
      await q(`create table if not exists tour_entries (
        tour_id text not null references tours(id) on delete cascade, player_id text not null references players(id) on delete cascade,
        registered_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
        items jsonb, answers jsonb not null default '[]', times jsonb not null default '[]', served_at bigint, cur int not null default 0,
        meta jsonb not null default '{}', score int, correct int, max int, time_ms bigint, flag text, cleared boolean not null default false,
        primary key (tour_id, player_id))`);
      await q(`create index if not exists tour_entries_player on tour_entries (player_id)`);
      await q(`create table if not exists practice_fixed (player_id text not null references players(id) on delete cascade, qid text not null, primary key (player_id, qid))`);
      await q(`create table if not exists practice_log (id bigserial primary key, player_id text not null references players(id) on delete cascade, n int not null, correct int not null, created_at timestamptz not null default now())`);
      await q(`create index if not exists practice_log_player on practice_log (player_id)`);
      await q(`create table if not exists friends (
        a text not null references players(id) on delete cascade, b text not null references players(id) on delete cascade,
        requester text not null, status text not null, created_at timestamptz not null default now(), primary key (a, b))`);
      await q(`create index if not exists friends_b on friends (b)`);
      await q(`alter table mock_tests add column if not exists session_id text`);
      await q(`create table if not exists ent_sessions (
        id text primary key, kind text not null, title text not null default '', school text, city text, created_by text,
        starts_at timestamptz not null, ends_at timestamptz not null, reg_until timestamptz not null, created_at timestamptz not null default now())`);
      await q(`create table if not exists ent_regs (
        session_id text not null references ent_sessions(id) on delete cascade, player_id text not null references players(id) on delete cascade,
        ikt text not null unique, combo text not null, lang text not null, mock_id text, created_at timestamptz not null default now(), primary key (session_id, player_id))`);
      await q(`create index if not exists ent_regs_player on ent_regs (player_id)`);
    },
    async setRole(id, role) { return (await q('update players set role=$2, updated_at=now() where id=$1 returning *', [id, role])).rows[0]; },
    async setClass(id, cid) { return (await q('update players set class_id=$2, updated_at=now() where id=$1 returning *', [id, cid])).rows[0]; },
    async createClass(c) { return (await q('insert into classes (id, code, name, school, city, teacher_id) values ($1,$2,$3,$4,$5,$6) returning *', [c.id, c.code, c.name, c.school, c.city, c.teacher_id])).rows[0]; },
    async getClass(id) { return (await q('select * from classes where id=$1', [id])).rows[0] || null; },
    async classByCode(code) { return (await q('select * from classes where code=$1', [code])).rows[0] || null; },
    async classesOf(tid) { return (await q('select c.*, (select count(*)::int from players p where p.class_id=c.id) as students from classes c where teacher_id=$1 order by created_at', [tid])).rows; },
    async updateClass(id, x) { return (await q('update classes set name=coalesce($2,name), goal=coalesce($3,goal) where id=$1 returning *', [id, x.name ?? null, x.goal ?? null])).rows[0]; },
    async deleteClass(id) { await q('update players set class_id=null where class_id=$1', [id]); await q('delete from classes where id=$1', [id]); },
    async members(cid) { return (await q('select id, username, name, school, city, role, class_id, avatar, md5(photo) as photo_v from players where class_id=$1 order by name', [cid])).rows; },
    async rows(ids) {
      const f = ids ? 'and player_id = any($1)' : '', a = ids ? [ids] : [];
      const [players, mocks, entries, games, practice] = await Promise.all([
        q(`select id, username, name, school, city, role, rating, games, wins, md5(photo) as photo_v, avatar, class_id, created_at from players where username is not null ${ids ? 'and id = any($1)' : ''}`, a),
        q(`select id, player_id, combo, score, ${ids ? 'result, meta,' : ''} started_at, finished_at, flag, cleared from mock_tests where finished_at is not null ${f}`, a),
        q(`select tour_id, player_id, score, max, correct, time_ms, finished_at, flag, cleared, meta from tour_entries where finished_at is not null ${f}`, a),
        q(`select gp.player_id, g.created_at, gp.won, g.mode from game_players gp join games g on g.id=gp.game_id where g.created_at > now() - interval '400 days' ${ids ? 'and gp.player_id = any($1)' : ''}`, a),
        q(`select player_id, n, correct, created_at from practice_log where created_at > now() - interval '400 days' ${f}`, a)
      ]);
      const d = r => ({ ...r, created_at: iso(r.created_at), started_at: iso(r.started_at), finished_at: iso(r.finished_at) });
      return { players: players.rows, mocks: mocks.rows.map(d), entries: entries.rows.map(d), games: games.rows.map(d), practice: practice.rows.map(d) };
    },
    async clearMockFlag(id) { await q('update mock_tests set cleared=true where id=$1', [id]); },
    async clearEntryFlag(tid, pid) { await q('update tour_entries set cleared=true where tour_id=$1 and player_id=$2', [tid, pid]); },

    async createTour(t) {
      await q(`insert into tours (id, kind, title, topic, lang, class_id, school, city, created_by, starts_at, join_until, ends_at, duration_ms, items)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) on conflict (id) do nothing`,
      [t.id, t.kind, t.title, t.topic, t.lang || null, t.class_id || null, t.school || null, t.city || null, t.created_by || null, t.starts_at, t.join_until, t.ends_at, t.duration_ms, JSON.stringify(t.items)]);
      return this.getTour(t.id);
    },
    async getTour(id) { return tour((await q('select * from tours where id=$1', [id])).rows[0]) || null; },
    async deleteTour(id) { await q('delete from tours where id=$1', [id]); },
    async listTours({ classIds = [], school = null, city = null, since }) {
      return (await q(`select t.id, t.kind, t.title, t.topic, t.lang, t.class_id, t.school, t.city, t.created_by, t.starts_at, t.join_until, t.ends_at, t.duration_ms, jsonb_array_length(t.items) as n,
        (select count(*)::int from tour_entries e where e.tour_id=t.id) as count
        from tours t where t.ends_at > $1 and (t.kind='weekly' or t.class_id = any($2) or (t.kind='school' and t.school=$3 and t.city=$4)) order by t.starts_at`,
      [since, classIds, school, city])).rows.map(tour);
    },
    async pastTours(pid, limit = 20) {
      return (await q(`select t.id, t.kind, t.title, t.topic, t.lang, t.class_id, t.starts_at, t.join_until, t.ends_at, t.duration_ms, jsonb_array_length(t.items) as n from tours t join tour_entries e on e.tour_id=t.id
        where e.player_id=$1 and e.finished_at is not null order by t.starts_at desc limit $2`, [pid, limit])).rows.map(tour);
    },
    async toursOfClass(cid) {
      return (await q(`select t.id, t.kind, t.title, t.topic, t.lang, t.class_id, t.starts_at, t.join_until, t.ends_at, t.duration_ms, jsonb_array_length(t.items) as n,
        (select count(*)::int from tour_entries e where e.tour_id=t.id and e.finished_at is not null) as count from tours t where t.class_id=$1 order by t.starts_at desc limit 30`, [cid])).rows.map(tour);
    },
    async getEntry(tid, pid) { return entry((await q('select * from tour_entries where tour_id=$1 and player_id=$2', [tid, pid])).rows[0]) || null; },
    async addEntry(e) {
      await q('insert into tour_entries (tour_id, player_id) values ($1,$2) on conflict do nothing', [e.tour_id, e.player_id]);
      return this.getEntry(e.tour_id, e.player_id);
    },
    async updateEntry(tid, pid, patch) {
      const keys = ENTRY_KEYS.filter(k => k in patch);
      if (!keys.length) return this.getEntry(tid, pid);
      const vals = keys.map(k => (ENTRY_JSON.has(k) ? JSON.stringify(patch[k]) : patch[k]));
      const r = await q(`update tour_entries set ${keys.map((k, i) => `${k}=$${i + 3}`).join(', ')} where tour_id=$1 and player_id=$2 returning *`, [tid, pid, ...vals]);
      return entry(r.rows[0]) || null;
    },
    async entriesOf(tid) {
      return (await q(`select e.*, p.username, p.name, p.school, p.city, md5(p.photo) as photo_v, p.avatar, p.role from tour_entries e join players p on p.id=e.player_id where e.tour_id=$1`, [tid])).rows.map(entry);
    },
    async placesOf(pid) {
      return (await q(`select e.tour_id, e.score, e.finished_at,
        (select count(*)::int from tour_entries x where x.tour_id=e.tour_id and x.finished_at is not null and (x.flag is null or x.cleared)) as of,
        case when e.flag is not null and not e.cleared then null else 1 + (select count(*)::int from tour_entries x where x.tour_id=e.tour_id and x.finished_at is not null and (x.flag is null or x.cleared)
          and (x.score > e.score or (x.score = e.score and x.time_ms < e.time_ms))) end as place
        from tour_entries e where e.player_id=$1 and e.finished_at is not null`, [pid])).rows.map(r => ({ ...r, finished_at: iso(r.finished_at) }));
    },

    async fixedIds(pid) { return (await q('select qid from practice_fixed where player_id=$1', [pid])).rows.map(r => r.qid); },
    async addFixed(pid, ids) { if (ids.length) await q('insert into practice_fixed (player_id, qid) select $1, unnest($2::text[]) on conflict do nothing', [pid, ids]); },
    async logPractice(pid, n, correct) { await q('insert into practice_log (player_id, n, correct) values ($1,$2,$3)', [pid, n, correct]); },
    async mistakeSources(pid) {
      const [m, e] = await Promise.all([
        q('select sections, answers, finished_at from mock_tests where player_id=$1 and finished_at is not null order by finished_at desc limit 15', [pid]),
        q('select items, answers, finished_at from tour_entries where player_id=$1 and finished_at is not null order by finished_at desc limit 30', [pid])
      ]);
      return { mocks: m.rows.map(r => ({ sections: r.sections, answers: r.answers || {}, at: iso(r.finished_at) })), entries: e.rows.map(r => ({ items: r.items || [], answers: r.answers || [], at: iso(r.finished_at) })) };
    },
    async friendRow(x, y) { const [a, b] = x < y ? [x, y] : [y, x]; return (await q('select * from friends where a=$1 and b=$2', [a, b])).rows[0] || null; },
    async friendRows(pid) { return (await q('select * from friends where a=$1 or b=$1', [pid])).rows; },
    async setFriend(x, y, status, requester) {
      const [a, b] = x < y ? [x, y] : [y, x];
      return (await q(`insert into friends (a, b, requester, status) values ($1,$2,$3,$4)
        on conflict (a, b) do update set status=$4, requester=$3 returning *`, [a, b, requester, status])).rows[0];
    },
    async deleteFriend(x, y) { const [a, b] = x < y ? [x, y] : [y, x]; await q('delete from friends where a=$1 and b=$2', [a, b]); },
    async playersByIds(ids) {
      if (!ids.length) return [];
      return (await q('select id, username, name, school, city, rating, games, wins, avatar, role, md5(photo) as photo_v from players where id = any($1)', [ids])).rows;
    },
    async searchPlayers(qs, limit = 12) {
      return (await q(`select id, username, name, school, city, rating, games, wins, avatar, role, md5(photo) as photo_v from players
        where username is not null and (username like $1 || '%' or lower(name) like '%' || $1 || '%') order by (username like $1 || '%') desc, rating desc limit $2`,
      [qs.toLowerCase().replace(/[%_\\]/g, ''), limit])).rows;
    },
    async setUsername(id, username) {
      try { return (await q('update players set username=$2, updated_at=now() where id=$1 returning *', [id, username])).rows[0]; }
      catch (e) { if (e.code === '23505') return null; throw e; }
    },
    async createEntSession(x) {
      await q(`insert into ent_sessions (id, kind, title, school, city, created_by, starts_at, ends_at, reg_until) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (id) do nothing`,
        [x.id, x.kind, x.title || '', x.school || null, x.city || null, x.created_by || null, x.starts_at, x.ends_at, x.reg_until]);
      return this.getEntSession(x.id);
    },
    async getEntSession(id) { return sess((await q('select * from ent_sessions where id=$1', [id])).rows[0]) || null; },
    async deleteEntSession(id) { await q('delete from ent_sessions where id=$1', [id]); },
    async listEntSessions({ since, school = null, city = null }) {
      return (await q(`select s.*, (select count(*)::int from ent_regs r where r.session_id=s.id) as count from ent_sessions s
        where s.ends_at > $1 and (s.kind='weekly' or (s.school=$2 and s.city=$3)) order by s.starts_at`, [since, school, city])).rows.map(sess);
    },
    async getReg(sid, pid) { return (await q('select * from ent_regs where session_id=$1 and player_id=$2', [sid, pid])).rows[0] || null; },
    async regsOf(pid) {
      return (await q(`select r.*, row_to_json(s.*) as session from ent_regs r join ent_sessions s on s.id=r.session_id where r.player_id=$1 order by s.starts_at desc`, [pid])).rows
        .map(r => ({ ...r, session: sess(r.session) }));
    },
    async regByIkt(ikt) { return (await q('select * from ent_regs where ikt=$1', [ikt])).rows[0] || null; },
    async addReg(r) { return (await q('insert into ent_regs (session_id, player_id, ikt, combo, lang) values ($1,$2,$3,$4,$5) returning *', [r.session_id, r.player_id, r.ikt, r.combo, r.lang])).rows[0]; },
    async dropReg(sid, pid) { await q('delete from ent_regs where session_id=$1 and player_id=$2', [sid, pid]); },
    async setRegMock(sid, pid, mid) { await q('update ent_regs set mock_id=$3 where session_id=$1 and player_id=$2', [sid, pid, mid]); },
    async sessionResults(sid) {
      return (await q(`select r.player_id, r.combo, r.ikt, p.username, p.name, p.school, p.city, p.avatar, md5(p.photo) as photo_v,
          case when t.finished_at is not null then t.score end as score, (t.result->>'pass')::boolean as pass, case when t.flag is not null and not t.cleared then t.flag end as flag, (t.id is not null) as started
        from ent_regs r join players p on p.id=r.player_id left join mock_tests t on t.id=r.mock_id where r.session_id=$1`, [sid])).rows;
    },
    async dropPlayerEdu() {}
  };
}

module.exports = { memory, pg };
