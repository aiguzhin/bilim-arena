// Друзья, смена ника и приглашения на баттл внутри сайта.
module.exports = function mount(app, { db, auth, wrap, store, online, emitTo, cardOf }) {
  const pu = p => (p.photo_v && p.username ? `/p/${p.username}?v=${p.photo_v.slice(0, 8)}` : null);
  const brief = p => ({ username: p.username, name: p.name, school: p.school, city: p.city, rating: p.rating, avatar: p.avatar || null, photo: pu(p), online: online.has(p.id) });
  const validUsername = u => /^[a-z0-9_.]{3,20}$/.test(u);

  async function friendsOf(pid) {
    const rows = await db.friendRows(pid);
    const other = r => (r.a === pid ? r.b : r.a);
    const people = new Map((await db.playersByIds(rows.map(other))).map(p => [p.id, p]));
    const out = { friends: [], incoming: [], outgoing: [] };
    for (const r of rows) {
      const p = people.get(other(r)); if (!p) continue;
      const item = brief(p);
      if (r.status === 'accepted') out.friends.push(item);
      else if (r.requester === pid) out.outgoing.push(item);
      else out.incoming.push(item);
    }
    out.friends.sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));
    return out;
  }

  app.get('/api/friends', auth, wrap(async (req, res) => res.json(await friendsOf(req.player.id))));
  app.get('/api/friends/count', auth, wrap(async (req, res) => {
    const rows = await db.friendRows(req.player.id);
    res.json({ incoming: rows.filter(r => r.status === 'pending' && r.requester !== req.player.id).length });
  }));
  app.get('/api/friends/search', auth, wrap(async (req, res) => {
    const qs = String(req.query.q || '').trim().replace(/^@/, '').slice(0, 30);
    if (qs.length < 2) return res.json({ users: [] });
    const [list, rows] = await Promise.all([db.searchPlayers(qs, 12), db.friendRows(req.player.id)]);
    const rel = new Map(rows.map(r => [r.a === req.player.id ? r.b : r.a, r]));
    res.json({
      users: list.filter(p => p.id !== req.player.id).map(p => {
        const r = rel.get(p.id);
        return { ...brief(p), relation: !r ? null : r.status === 'accepted' ? 'friend' : r.requester === req.player.id ? 'outgoing' : 'incoming' };
      })
    });
  }));
  // Заявка; если другой уже позвал нас — сразу дружба.
  app.post('/api/friends/request', auth, wrap(async (req, res) => {
    const p = await db.findByUsername(String(req.body?.username || '').trim().toLowerCase());
    if (!p || p.id === req.player.id) return res.status(404).json({ error: 'notfound' });
    const r = await db.friendRow(req.player.id, p.id);
    if (r?.status === 'accepted') return res.json({ status: 'friend' });
    if (r && r.requester !== req.player.id) {
      await db.setFriend(req.player.id, p.id, 'accepted', r.requester);
      emitTo(p.id, 'friends_changed', { type: 'accepted', from: cardOf(req.player) });
      return res.json({ status: 'friend' });
    }
    const mine = (await db.friendRows(req.player.id)).length;
    if (mine >= 300) return res.status(400).json({ error: 'friendsLimit' });
    await db.setFriend(req.player.id, p.id, 'pending', req.player.id);
    emitTo(p.id, 'friends_changed', { type: 'request', from: cardOf(req.player) });
    res.json({ status: 'outgoing' });
  }));
  app.post('/api/friends/accept', auth, wrap(async (req, res) => {
    const p = await db.findByUsername(String(req.body?.username || '').trim().toLowerCase());
    const r = p && await db.friendRow(req.player.id, p.id);
    if (!r || r.requester === req.player.id) return res.status(404).json({ error: 'notfound' });
    await db.setFriend(req.player.id, p.id, 'accepted', r.requester);
    emitTo(p.id, 'friends_changed', { type: 'accepted', from: cardOf(req.player) });
    res.json({ status: 'friend' });
  }));
  // Удалить из друзей, отклонить или отменить заявку.
  app.delete('/api/friends/:username', auth, wrap(async (req, res) => {
    const p = await db.findByUsername(String(req.params.username || '').toLowerCase());
    if (p) { await db.deleteFriend(req.player.id, p.id); emitTo(p.id, 'friends_changed', { type: 'removed' }); }
    res.json({ ok: true });
  }));
  app.get('/api/friends/status/:username', auth, wrap(async (req, res) => {
    const p = await db.findByUsername(String(req.params.username || '').toLowerCase());
    if (!p) return res.status(404).json({ error: 'notfound' });
    const r = await db.friendRow(req.player.id, p.id);
    res.json({ relation: !r ? null : r.status === 'accepted' ? 'friend' : r.requester === req.player.id ? 'outgoing' : 'incoming', online: online.has(p.id) });
  }));

  // Смена ника: латиница, цифры, точка и _; не чаще раза в сутки.
  const changed = new Map();
  app.post('/api/me/username', auth, wrap(async (req, res) => {
    const u = String(req.body?.username || '').trim().toLowerCase();
    if (u === req.player.username) return res.json({ user: store.PUBLIC(req.player) });
    if (!validUsername(u)) return res.status(400).json({ error: 'username' });
    const last = changed.get(req.player.id);
    if (last && Date.now() - last < 24 * 3600 * 1000) return res.status(429).json({ error: 'usernameSoon' });
    const row = await db.setUsername(req.player.id, u);
    if (!row) return res.status(409).json({ error: 'taken' });
    changed.set(req.player.id, Date.now());
    res.json({ user: store.PUBLIC(row) });
  }));

  return { friendsOf, isFriend: async (x, y) => (await db.friendRow(x, y))?.status === 'accepted' };
};
