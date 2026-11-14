// Уведомления на телефон и компьютер (Web Push). Ключи VAPID создаются один раз и хранятся в базе (kv).
// Подписки игрока — kv['push:<id>'], список игроков с подписками — kv['push:index'].
const webpush = require('web-push');

const TZ_MS = 5 * 3600 * 1000, DAY = 864e5;
const dayOf = t => new Date(new Date(t).getTime() + TZ_MS).toISOString().slice(0, 10);

module.exports = function (app, { db, auth, wrap, online, edu }) {
  let ready = null;
  const init = () => (ready ||= (async () => {
    let k = (await db.kvGet('vapid'))?.val;
    if (!k?.publicKey) { k = webpush.generateVAPIDKeys(); await db.kvSet('vapid', k); }
    webpush.setVapidDetails('https://bilimarena.com', k.publicKey, k.privateKey);
    return k.publicKey;
  })());
  const subsOf = async pid => (await db.kvGet('push:' + pid))?.val?.subs || [];
  async function index(pid, on) {
    const list = new Set((await db.kvGet('push:index'))?.val?.ids || []);
    if (on === list.has(pid)) return;
    if (on) list.add(pid); else list.delete(pid);
    await db.kvSet('push:index', { ids: [...list] });
  }

  app.get('/api/push/key', wrap(async (req, res) => res.json({ key: await init() })));
  app.post('/api/push/sub', auth, wrap(async (req, res) => {
    const s = req.body?.sub;
    if (!s || typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) return res.status(400).json({ error: 'bad' });
    const subs = (await subsOf(req.player.id)).filter(x => x.endpoint !== s.endpoint);
    subs.push({ endpoint: s.endpoint, keys: { p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) } });
    await db.kvSet('push:' + req.player.id, { subs: subs.slice(-5) });
    await index(req.player.id, true);
    res.json({ ok: true });
  }));
  app.delete('/api/push/sub', auth, wrap(async (req, res) => {
    const subs = (await subsOf(req.player.id)).filter(x => x.endpoint !== req.body?.endpoint);
    await db.kvSet('push:' + req.player.id, { subs });
    if (!subs.length) await index(req.player.id, false);
    res.json({ ok: true });
  }));

  // Отправка: { title, body, url, tag }. Просроченные подписки (404/410) удаляются.
  async function send(pid, msg) {
    const subs = await subsOf(pid);
    if (!subs.length) return false;
    await init();
    const dead = [];
    await Promise.all(subs.map(s => webpush.sendNotification(s, JSON.stringify(msg), { TTL: 6 * 3600 }).catch(e => { if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.endpoint); })));
    if (dead.length) {
      const left = subs.filter(s => !dead.includes(s.endpoint));
      await db.kvSet('push:' + pid, { subs: left });
      if (!left.length) await index(pid, false);
    }
    return subs.length > dead.length;
  }
  const L = (p, ru, kk) => (p?.settings?.lang === 'kk' ? kk : ru);

  // Вечернее напоминание о серии: в 19:00 по Казахстану тем, у кого серия есть, а сегодня занятий ещё не было.
  async function streakReminders() {
    const ids = (await db.kvGet('push:index'))?.val?.ids || [];
    const today = dayOf(Date.now());
    for (const pid of ids) {
      try {
        const p = await db.get(pid);
        if (!p || online.has(pid)) continue;
        const a = await edu.achievementsOf(p);
        const rows = await db.rows([pid]);
        const last = [...rows.practice.map(x => x.created_at), ...rows.mocks.map(t => t.finished_at), ...rows.games.map(g => g.created_at), ...rows.entries.map(e => e.finished_at)].filter(Boolean).map(dayOf).sort().pop();
        if (!a.streak || last === today) continue;
        await send(pid, { title: L(p, `Серия ${a.streak} дн. сгорит в полночь`, `${a.streak} күндік серия түн ортасында жанып кетеді`), body: L(p, 'Хватит 15 вопросов — 5 минут.', '15 сұрақ жеткілікті — 5 минут.'), url: '/practice', tag: 'streak' });
      } catch (e) { console.error('push streak', e.message); }
    }
  }
  let lastRun = null;
  setInterval(() => {
    const kz = new Date(Date.now() + TZ_MS);
    const d = kz.toISOString().slice(0, 10);
    if (kz.getUTCHours() === 19 && lastRun !== d) { lastRun = d; streakReminders().catch(console.error); }
  }, 5 * 60 * 1000);

  return { send, L };
};
