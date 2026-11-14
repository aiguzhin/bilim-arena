// Админ-панель (/admin): сводка по сайту, жалобы на сообщения, ограничение чата, свои задания, резервные копии.
// Вход по секретному ключу администратора: в заголовке x-admin, сверяется с хешем (тот же ключ, что для импорта вузов).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { topicOf } = require('./bank/topics');

const ADMIN_HASH = process.env.ADMIN_HASH || '9fec17eaf0d66962cfd9b5644de08a88062109cac75afbdea95f38bdbef59a3a';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
const KEEP = 14;

module.exports = function (app, { db, wrap, BANK, chat }) {
  const tries = new Map();
  function admin(req, res, next) {
    const ip = req.ip || '';
    const t = (tries.get(ip) || []).filter(x => Date.now() - x < 15 * 60 * 1000);
    if (t.length >= 10) return res.status(429).json({ error: 'limit' });
    const got = crypto.createHash('sha256').update(String(req.get('x-admin') || '')).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(got), Buffer.from(ADMIN_HASH))) { t.push(Date.now()); tries.set(ip, t); return res.status(403).json({ error: 'denied' }); }
    next();
  }

  // ---------- свои задания: хранятся в kv['custom:q'] и добавляются в банк при запуске ----------
  const clean = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const idOf = c => `${c.subject}:u${c.cid}`;
  function toQ(c) {
    const two = k => ({ ru: c.ru[k], kk: c.kk?.[k] || c.ru[k] });
    const q = { t: two('t'), o: two('o'), a: c.a, e: two('e'), id: idOf(c), src: 'custom' };
    q.tp = topicOf(c.subject, q);
    return q;
  }
  function inject(c) {
    if (!BANK[c.subject]) return;
    const q = toQ(c);
    BANK.ALL.set(q.id, q);
    const list = BANK[c.subject].q, i = list.findIndex(x => x.id === q.id);
    if (i >= 0) list[i] = q; else list.push(q);
  }
  const customs = async () => (await db.kvGet('custom:q'))?.val?.list || [];
  customs().then(l => l.forEach(inject)).catch(e => console.error('custom q', e.message));

  app.get('/api/admin/check', admin, (req, res) => res.json({ ok: true }));

  app.get('/api/admin/stats', admin, wrap(async (req, res) => {
    const [s, bk] = await Promise.all([db.adminStats(), Promise.resolve(backups())]);
    const bank = Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v.q.length]));
    res.json({ ...s, bank, subjects: Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v.name])), backups: bk });
  }));

  app.get('/api/admin/reports', admin, wrap(async (req, res) => {
    const list = await db.chatReportList();
    const ids = [...new Set(list.map(r => r.sender?.id).filter(Boolean))];
    const bans = Object.fromEntries(await Promise.all(ids.map(async id => [id, (await db.kvGet('chatban:' + id))?.val || null])));
    res.json({ list: list.map(r => ({ ...r, ban: r.sender ? bans[r.sender.id] : null })) });
  }));
  app.post('/api/admin/reports/:id', admin, wrap(async (req, res) => {
    const id = Number(req.params.id);
    const m = await db.chatGet(id);
    if (!m) return res.status(404).json({ error: 'notfound' });
    if (req.body?.action === 'hide' && !m.deleted) await chat.hide(m);
    await db.dropReports(id);
    res.json({ ok: true });
  }));

  // Ограничение чата: { username, days } — days 0 снимает ограничение.
  app.post('/api/admin/ban', admin, wrap(async (req, res) => {
    const p = await db.findByUsername(String(req.body?.username || '').trim().toLowerCase().replace(/^@/, ''));
    if (!p) return res.status(404).json({ error: 'notfound' });
    const days = Math.max(0, Math.min(3650, Math.round(Number(req.body?.days) || 0)));
    const val = days ? { on: true, until: Date.now() + days * 864e5, at: Date.now() } : { on: false };
    await db.kvSet('chatban:' + p.id, val);
    res.json({ ok: true, username: p.username, ban: val });
  }));

  app.get('/api/admin/questions', admin, wrap(async (req, res) => res.json({ list: (await customs()).slice().reverse() })));
  app.post('/api/admin/questions', admin, wrap(async (req, res) => {
    const b = req.body || {};
    if (!BANK[b.subject]) return res.status(400).json({ error: 'subject' });
    const side = x => ({ t: clean(x?.t, 900), o: (Array.isArray(x?.o) ? x.o : []).map(o => clean(o, 200)), e: clean(x?.e, 900) });
    const ru = side(b.ru), kk = side(b.kk);
    if (ru.t.length < 5 || ru.o.length !== 4 || ru.o.some(o => !o)) return res.status(400).json({ error: 'fill' });
    if (new Set(ru.o.map(o => o.toLowerCase())).size !== 4) return res.status(400).json({ error: 'same' });
    const hasKk = kk.t.length >= 5 && kk.o.length === 4 && kk.o.every(Boolean);
    const a = Math.round(Number(b.a));
    if (!(a >= 0 && a < 4)) return res.status(400).json({ error: 'answer' });
    const list = await customs();
    if (list.length >= 2000) return res.status(400).json({ error: 'limit' });
    const c = { cid: crypto.randomBytes(5).toString('hex'), subject: b.subject, ru, kk: hasKk ? kk : null, a, created_at: new Date().toISOString() };
    await db.kvSet('custom:q', { list: [...list, c] });
    inject(c);
    res.json({ ok: true, id: idOf(c), tp: BANK.ALL.get(idOf(c))?.tp || null });
  }));
  app.delete('/api/admin/questions/:cid', admin, wrap(async (req, res) => {
    const list = await customs(), c = list.find(x => x.cid === req.params.cid);
    if (!c) return res.status(404).json({ error: 'notfound' });
    await db.kvSet('custom:q', { list: list.filter(x => x !== c) });
    if (BANK[c.subject]) BANK[c.subject].q = BANK[c.subject].q.filter(q => q.id !== idOf(c)); // в BANK.ALL остаётся — для старых результатов
    res.json({ ok: true });
  }));

  // ---------- резервные копии: раз в сутки полная выгрузка базы в JSON (gzip), хранятся последние 14 ----------
  function backups() {
    try { return fs.readdirSync(BACKUP_DIR).filter(f => /^bilim-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(f)).sort().reverse().map(f => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size })); } catch { return []; }
  }
  async function backup() {
    const day = new Date().toISOString().slice(0, 10);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const data = await db.dumpAll();
    const buf = require('zlib').gzipSync(JSON.stringify({ at: new Date().toISOString(), data }));
    const tmp = path.join(BACKUP_DIR, `.tmp-${day}`);
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, path.join(BACKUP_DIR, `bilim-${day}.json.gz`));
    for (const f of backups().slice(KEEP)) fs.unlinkSync(path.join(BACKUP_DIR, f.name));
    console.log('backup', day, buf.length);
    return day;
  }
  let running = false;
  async function maybeBackup(force) {
    if (running) return null;
    const day = new Date().toISOString().slice(0, 10);
    if (!force && backups().some(f => f.name === `bilim-${day}.json.gz`)) return null;
    running = true;
    try { return await backup(); } catch (e) { console.error('backup', e.message); return null; } finally { running = false; }
  }
  setTimeout(() => maybeBackup(false), 2 * 60 * 1000);
  setInterval(() => maybeBackup(false), 60 * 60 * 1000);

  app.post('/api/admin/backup', admin, wrap(async (req, res) => {
    const d = await maybeBackup(true);
    if (!d) return res.status(500).json({ error: 'backup' });
    res.json({ ok: true, backups: backups() });
  }));
  app.get('/api/admin/backup/:name', admin, (req, res) => {
    const f = backups().find(b => b.name === req.params.name);
    if (!f) return res.status(404).json({ error: 'notfound' });
    res.download(path.join(BACKUP_DIR, f.name));
  });
};
