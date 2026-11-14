// Чаты: школа, класс, личные сообщения. Сообщения хранятся в базе, новые приходят через сокеты.
// Защита: лимит частоты, фильтр брани, жалобы (3 жалобы скрывают сообщение), блокировка собеседника,
// настройка «писать мне могут только друзья», учитель удаляет сообщения в чатах своего класса и школы.
const crypto = require('crypto');

const MAX_LEN = 500;
const BAD = /(?<![а-яёa-z])(?:(?:на|за|по|вы|у|до|отъ|при|разъ|съ|про)?[её]б(?:а|у|и|л|н|т|ё|е)|(?:на|по|от|при|о)?ху[йеёяи]|(?:рас|рос|ис|с)?пизд|бля(?:д|т|$|[^а-яё])|муда[кч]|муди[лк]|пид[ао]р|ганд[оа]н|долбо[её]б|шлюх|қотақ|көтен|сігі[лнп]|fuck|shit(?![a-z])|bitch)[а-яёәіңғүұқөһa-z]*/gi;
const clean = s => String(s || '').replace(/[\u0000-\u0008\u000B-\u001F​-‏‪-‮]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_LEN).replace(BAD, m => '*'.repeat(Math.min(m.length, 6)));

module.exports = function mount(app, { db, auth, wrap, io, online, emitTo, social }) {
  const pu = p => (p.photo_v && p.username ? `/p/${p.username}?v=${p.photo_v.slice(0, 8)}` : null);
  const brief = p => ({ username: p.username, name: p.name, avatar: p.avatar || null, photo: pu(p), online: online.has(p.id), teacher: p.role === 'teacher' });
  const schoolRoom = p => (p.school && p.city ? 's:' + crypto.createHash('sha1').update(`${p.city}|${String(p.school).trim().toLowerCase()}`).digest('hex').slice(0, 16) : null);
  const dmRoom = (a, b) => 'd:' + [a, b].sort().join(':');
  const dmPeer = (room, pid) => { const [, a, b] = room.split(':'); return a === pid ? b : b === pid ? a : null; };

  // Комнаты, куда игрок входит автоматически: его школа и его классы.
  async function autoRooms(p) {
    const out = [];
    const s = schoolRoom(p);
    if (s) out.push({ id: s, kind: 'school', title: p.school, sub: p.city });
    if (p.role === 'teacher') for (const c of await db.classesOf(p.id)) out.push({ id: 'c:' + c.id, kind: 'class', title: c.name, sub: c.school, own: true });
    else if (p.class_id) { const c = await db.getClass(p.class_id); if (c) out.push({ id: 'c:' + c.id, kind: 'class', title: c.name, sub: c.school }); }
    return out;
  }
  // Может ли игрок читать и писать в комнате. Возвращает описание комнаты или null.
  async function access(p, room) {
    if (typeof room !== 'string' || room.length > 90) return null;
    if (room.startsWith('d:')) {
      const peerId = dmPeer(room, p.id);
      const peer = peerId && peerId !== p.id ? await db.get(peerId) : null;
      return peer?.username ? { id: room, kind: 'dm', peer } : null;
    }
    return (await autoRooms(p)).find(r => r.id === room) || null;
  }
  const canModerate = (p, r) => p.role === 'teacher' && (r.kind === 'school' || (r.kind === 'class' && r.own));
  async function blockState(pid, peerId) {
    const rows = await db.chatBlocks(pid);
    return { byMe: rows.some(x => x.a === pid && x.b === peerId), byPeer: rows.some(x => x.a === peerId && x.b === pid) };
  }
  const view = (m, people) => ({ id: m.id, room: m.room, text: m.deleted ? null : m.text, deleted: !!m.deleted, at: m.created_at, from: people.get(m.sender_id) || { username: null, name: '—' } });
  async function peopleOf(msgs) {
    const ids = [...new Set(msgs.map(m => m.sender_id))];
    return new Map((await db.playersByIds(ids)).map(p => [p.id, brief(p)]));
  }

  // Подключение сокета к комнатам школы и класса.
  async function joinSocket(socket, p) {
    for (const r of [...socket.rooms]) if (r.startsWith('chat:')) socket.leave(r);
    for (const r of await autoRooms(p)) socket.join('chat:' + r.id);
  }

  app.get('/api/chat', auth, wrap(async (req, res) => {
    const me = req.player;
    const [auto, reads] = await Promise.all([autoRooms(me), db.chatReads(me.id)]);
    const dms = Object.keys(reads).filter(r => r.startsWith('d:') && dmPeer(r, me.id));
    const ids = [...auto.map(r => r.id), ...dms];
    const [last, unread, peers, blocks] = await Promise.all([db.chatLast(ids), db.chatUnread(me.id, ids), db.playersByIds(dms.map(r => dmPeer(r, me.id))), db.chatBlocks(me.id)]);
    const peerMap = new Map(peers.map(p => [p.id, p]));
    const names = await peopleOf(Object.values(last));
    const lastOf = id => { const m = last[id]; return m ? { text: m.text.slice(0, 80), at: m.created_at, mine: m.sender_id === me.id, name: names.get(m.sender_id)?.name || '' } : null; };
    const rooms = [
      ...auto.map(r => ({ id: r.id, kind: r.kind, title: r.title, sub: r.sub, last: lastOf(r.id), unread: unread[r.id] || 0 })),
      ...dms.map(id => { const p = peerMap.get(dmPeer(id, me.id)); return p?.username ? { id, kind: 'dm', title: p.name, sub: '@' + p.username, peer: brief(p), last: lastOf(id), unread: unread[id] || 0, blocked: blocks.some(x => x.a === me.id && x.b === p.id) } : null; })
        .filter(r => r && (r.last || r.unread)).sort((a, b) => (b.last?.at || '').localeCompare(a.last?.at || ''))
    ];
    res.json({ rooms, dmOnlyFriends: me.settings?.dm === 'friends' });
  }));
  // Счётчик для шапки: личные сообщения и чат класса (школьный чат в счётчик не входит — он слишком шумный).
  app.get('/api/chat/unread', auth, wrap(async (req, res) => {
    const me = req.player;
    const [auto, reads] = await Promise.all([autoRooms(me), db.chatReads(me.id)]);
    const ids = [...auto.filter(r => r.kind === 'class').map(r => r.id), ...Object.keys(reads).filter(r => r.startsWith('d:'))];
    res.json({ n: Object.values(await db.chatUnread(me.id, ids)).reduce((n, x) => n + x, 0) });
  }));

  app.get('/api/chat/room', auth, wrap(async (req, res) => {
    const r = await access(req.player, String(req.query.id || ''));
    if (!r) return res.status(404).json({ error: 'notfound' });
    const before = Number(req.query.before) > 0 ? Number(req.query.before) : null;
    const msgs = await db.chatList(r.id, before, 40);
    const people = await peopleOf(msgs);
    const out = { id: r.id, kind: r.kind, title: r.kind === 'dm' ? r.peer.name : r.title, sub: r.kind === 'dm' ? '@' + r.peer.username : r.sub, moderate: canModerate(req.player, r), more: msgs.length === 40, messages: msgs.map(m => view(m, people)) };
    if (r.kind === 'dm') {
      const [b, fr] = await Promise.all([blockState(req.player.id, r.peer.id), db.friendRow(req.player.id, r.peer.id)]);
      out.peer = brief(r.peer);
      out.blocked = b.byMe; out.blockedByPeer = b.byPeer;
      out.relation = !fr ? null : fr.status === 'accepted' ? 'friend' : fr.requester === req.player.id ? 'outgoing' : 'incoming';
    }
    if (msgs.length && !before) await db.chatRead(req.player.id, r.id, msgs[msgs.length - 1].id);
    res.json(out);
  }));

  // Открыть личный чат по логину.
  app.post('/api/chat/dm', auth, wrap(async (req, res) => {
    const u = String(req.body?.username || '').trim().toLowerCase().replace(/^@/, '');
    const p = /^[a-z0-9_.]{3,20}$/.test(u) ? await db.findByUsername(u) : null;
    if (!p || p.id === req.player.id) return res.status(404).json({ error: 'chatNoUser' });
    res.json({ room: dmRoom(req.player.id, p.id) });
  }));

  const sent = new Map();
  function tooFast(pid) {
    const now = Date.now(), a = (sent.get(pid) || []).filter(t => now - t < 60000);
    if (a.length >= 20 || (a.length && now - a[a.length - 1] < 700)) { sent.set(pid, a); return true; }
    a.push(now); sent.set(pid, a); return false;
  }
  app.post('/api/chat/send', auth, wrap(async (req, res) => {
    const me = req.player;
    const r = await access(me, String(req.body?.room || ''));
    if (!r) return res.status(404).json({ error: 'notfound' });
    const text = clean(req.body?.text);
    if (!text) return res.status(400).json({ error: 'chatEmpty' });
    if (r.kind === 'dm') {
      const b = await blockState(me.id, r.peer.id);
      if (b.byMe || b.byPeer) return res.status(403).json({ error: 'chatBlocked' });
      if (r.peer.settings?.dm === 'friends' && !(await social.isFriend(me.id, r.peer.id))) return res.status(403).json({ error: 'chatFriendsOnly' });
    }
    if (tooFast(me.id)) return res.status(429).json({ error: 'chatFast' });
    const m = await db.chatAdd(r.id, me.id, text);
    const [mine] = await db.playersByIds([me.id]);
    const msg = view(m, new Map([[me.id, brief(mine || me)]]));
    await db.chatRead(me.id, r.id, m.id);
    if (r.kind === 'dm') {
      if (!(r.id in (await db.chatReads(r.peer.id)))) await db.chatRead(r.peer.id, r.id, 0);
      emitTo(r.peer.id, 'chat', msg); emitTo(me.id, 'chat', msg);
    } else io.to('chat:' + r.id).emit('chat', msg);
    res.json({ message: msg });
  }));
  app.post('/api/chat/read', auth, wrap(async (req, res) => {
    const r = await access(req.player, String(req.body?.room || ''));
    const id = Math.round(Number(req.body?.id));
    if (r && id > 0) await db.chatRead(req.player.id, r.id, id);
    res.json({ ok: true });
  }));

  async function hide(m) {
    await db.chatHide(m.id);
    const ev = { id: m.id, room: m.room };
    if (m.room.startsWith('d:')) { const [, a, b] = m.room.split(':'); emitTo(a, 'chat_hide', ev); emitTo(b, 'chat_hide', ev); } else io.to('chat:' + m.room).emit('chat_hide', ev);
  }
  app.delete('/api/chat/message/:id', auth, wrap(async (req, res) => {
    const m = await db.chatGet(Number(req.params.id));
    const r = m && await access(req.player, m.room);
    if (!r || !(m.sender_id === req.player.id || canModerate(req.player, r))) return res.status(404).json({ error: 'notfound' });
    await hide(m);
    res.json({ ok: true });
  }));
  app.post('/api/chat/report', auth, wrap(async (req, res) => {
    const m = await db.chatGet(Number(req.body?.id));
    const r = m && await access(req.player, m.room);
    if (!r || m.sender_id === req.player.id) return res.status(404).json({ error: 'notfound' });
    const n = await db.chatReport(m.id, req.player.id);
    if (!m.deleted && (n >= 3 || r.kind === 'dm')) await hide(m); // в личном чате жалоба скрывает сообщение сразу
    res.json({ ok: true });
  }));
  app.post('/api/chat/block', auth, wrap(async (req, res) => {
    const p = await db.findByUsername(String(req.body?.username || '').trim().toLowerCase());
    if (!p || p.id === req.player.id) return res.status(404).json({ error: 'notfound' });
    await db.chatBlock(req.player.id, p.id, req.body?.on !== false);
    res.json({ blocked: req.body?.on !== false });
  }));

  return { joinSocket };
};
module.exports.clean = clean;
