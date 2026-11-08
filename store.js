// Хранилище игроков: Postgres, если задан DATABASE_URL, иначе память + JSON-файл.
const fs = require('fs');
const path = require('path');

function clean(s, max = 40) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function memoryStore() {
  const file = path.join(__dirname, 'data', 'players.json');
  let players = {};
  try { players = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(players)); } catch {}
    }, 500);
  };
  return {
    async init() {},
    async upsert(p) {
      const cur = players[p.id] || { rating: 1000, games: 0, wins: 0 };
      players[p.id] = { ...cur, id: p.id, name: p.name, school: p.school, city: p.city };
      save();
      return players[p.id];
    },
    async get(id) { return players[id] || null; },
    async apply(updates) {
      for (const u of updates) {
        const p = players[u.id];
        if (!p) continue;
        p.rating = Math.max(100, p.rating + u.delta);
        p.games += 1;
        if (u.win) p.wins += 1;
      }
      save();
    },
    async leaders() {
      const list = Object.values(players).filter(p => p.games > 0);
      const players_ = [...list].sort((a, b) => b.rating - a.rating).slice(0, 50);
      const group = key => {
        const m = {};
        for (const p of list) {
          const k = key(p);
          if (!k) continue;
          (m[k] ||= { name: k, city: p.city, sum: 0, n: 0 });
          m[k].sum += p.rating; m[k].n += 1;
        }
        return Object.values(m).map(g => ({ name: g.name, city: g.city, rating: Math.round(g.sum / g.n), players: g.n }))
          .sort((a, b) => b.rating - a.rating).slice(0, 50);
      };
      return {
        players: players_.map(p => ({ name: p.name, school: p.school, city: p.city, rating: p.rating, games: p.games, wins: p.wins })),
        schools: group(p => p.school ? `${p.school}|${p.city}` : '').map(s => ({ ...s, name: s.name.split('|')[0] })),
        cities: group(p => p.city).map(({ city, ...c }) => c)
      };
    }
  };
}

function pgStore(url) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } });
  return {
    async init() {
      await pool.query(`create table if not exists players (
        id text primary key, name text not null, school text, city text,
        rating int not null default 1000, games int not null default 0, wins int not null default 0,
        updated_at timestamptz not null default now())`);
    },
    async upsert(p) {
      const r = await pool.query(
        `insert into players (id, name, school, city) values ($1,$2,$3,$4)
         on conflict (id) do update set name=$2, school=$3, city=$4, updated_at=now() returning *`,
        [p.id, p.name, p.school, p.city]);
      return r.rows[0];
    },
    async get(id) {
      const r = await pool.query('select * from players where id=$1', [id]);
      return r.rows[0] || null;
    },
    async apply(updates) {
      for (const u of updates) {
        await pool.query(
          'update players set rating=greatest(100, rating+$2), games=games+1, wins=wins+$3, updated_at=now() where id=$1',
          [u.id, u.delta, u.win ? 1 : 0]);
      }
    },
    async leaders() {
      const players = (await pool.query(
        'select name, school, city, rating, games, wins from players where games>0 order by rating desc limit 50')).rows;
      const schools = (await pool.query(
        `select school as name, city, round(avg(rating))::int as rating, count(*)::int as players
         from players where games>0 and school<>'' group by school, city order by rating desc limit 50`)).rows;
      const cities = (await pool.query(
        `select city as name, round(avg(rating))::int as rating, count(*)::int as players
         from players where games>0 and city<>'' group by city order by rating desc limit 50`)).rows;
      return { players, schools, cities };
    }
  };
}

module.exports = { clean, create: () => process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : memoryStore() };
