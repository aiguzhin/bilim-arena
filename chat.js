// Чаты: школа, класс, личные сообщения. Сообщения хранятся в базе, новые приходят через сокеты.
// Защита: лимит частоты, фильтр брани, жалобы (3 жалобы скрывают сообщение), блокировка собеседника,
// настройка «писать мне могут только друзья», учитель удаляет сообщения в чатах своего класса и школы.
const crypto = require('crypto');
const express = require('express');

const EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const AUDIO = /^audio\/(webm|ogg|mp4|mpeg|aac|x-m4a)(;.*)?$/;
const IMAGE = /^image\/(jpeg|png|webp)$/;

const MAX_LEN = 500;
const BAD = /(?<![а-яёa-z])(?:(?:на|за|по|вы|у|до|отъ|при|разъ|съ|про)?[её]б(?:а|у|и|л|н|т|ё|е)|(?:на|по|от|при|о)?ху[йеёяи]|(?:рас|рос|ис|с)?пизд|бля(?:д|т|$|[^а-яё])|муда[кч]|муди[лк]|пид[ао]р|ганд[оа]н|долбо[её]б|шлюх|қотақ|көтен|сігі[лнп]|fuck|shit(?![a-z])|bitch)[а-яёәіңғүұқөһa-z]*/gi;
const clean = s => String(s || '').replace(/[\u0000-\u0008\u000B-\u001F​-‏‪-‮]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_LEN).replace(BAD, m => '*'.repeat(Math.min(m.length, 6)));

module.exports = function mount(app, { db, auth, wrap, io, online, emitTo, social, push }) {
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
  const short = m => (m.deleted ? null : m.kind === 'voice' ? '🎤' : m.kind === 'image' ? '🖼' : m.text.slice(0, 90));
  const view = (m, people, ex = {}) => ({
    id: m.id, room: m.room, kind: m.kind || 'text', text: m.deleted ? null : m.text, deleted: !!m.deleted, at: m.created_at,
    audio: m.kind === 'voice' && !m.deleted ? '/chat-audio/' + m.media : null, dur: m.dur || null,
    image: m.kind === 'image' && !m.deleted ? '/chat-audio/' + m.media : null,
    from: people.get(m.sender_id) || { username: null, name: '—' },
    reply: ex.reply || null, reactions: ex.reactions || []
  });
  // Реакции группами: [{ e: '👍', users: ['ali', 'dana'] }].
  function groupReacts(rows, names) {
    const m = new Map();
    for (const r of rows) { const g = m.get(r.emoji) || []; g.push(names.get(r.player_id) || ''); m.set(r.emoji, g); }
    return EMOJI.filter(e => m.has(e)).map(e => ({ e, users: m.get(e) }));
  }
  // Полные карточки сообщений: ответы и реакции подтягиваем одним запросом на пачку.
  async function full(msgs) {
    const replyIds = [...new Set(msgs.map(m => m.reply_to).filter(Boolean))];
    const [replies, reacts] = await Promise.all([db.chatGetMany(replyIds), db.chatReactions(msgs.map(m => m.id))]);
    const people = await peopleOf([...msgs, ...replies]);
    const reactors = new Map((await db.playersByIds([...new Set(reacts.map(r => r.player_id))])).map(p => [p.id, p.username]));
    const rmap = new Map(replies.map(r => [r.id, r]));
    return msgs.map(m => {
      const r = m.reply_to && rmap.get(m.reply_to);
      return view(m, people, {
        reply: r ? { id: r.id, name: people.get(r.sender_id)?.name || '—', text: short(r), kind: r.kind } : null,
        reactions: groupReacts(reacts.filter(x => x.message_id === m.id), reactors)
      });
    });
  }
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
    const lastOf = id => { const m = last[id]; return m ? { text: m.kind === 'voice' ? '🎤' : m.kind === 'image' ? '🖼' : m.text.slice(0, 80), at: m.created_at, mine: m.sender_id === me.id, name: names.get(m.sender_id)?.name || '' } : null; };
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
    const out = { id: r.id, kind: r.kind, title: r.kind === 'dm' ? r.peer.name : r.title, sub: r.kind === 'dm' ? '@' + r.peer.username : r.sub, moderate: canModerate(req.player, r), more: msgs.length === 40, messages: await full(msgs) };
    if (r.kind === 'dm') {
      const [b, fr] = await Promise.all([blockState(req.player.id, r.peer.id), db.friendRow(req.player.id, r.peer.id)]);
      out.peer = brief(r.peer);
      out.blocked = b.byMe; out.blockedByPeer = b.byPeer;
      out.relation = !fr ? null : fr.status === 'accepted' ? 'friend' : fr.requester === req.player.id ? 'outgoing' : 'incoming';
      out.peerRead = (await db.chatReads(r.peer.id))[r.id] || 0;
    }
    if (msgs.length && !before) await markRead(req.player, r.id, msgs[msgs.length - 1].id);
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
  // Можно ли писать в комнату: блокировки и «только друзья». Возвращает код ошибки или null.
  async function canSend(me, r) {
    const ban = (await db.kvGet('chatban:' + me.id))?.val;
    if (ban?.on && (!ban.until || ban.until > Date.now())) return 'chatBanned';
    if (r.kind !== 'dm') return null;
    const b = await blockState(me.id, r.peer.id);
    if (b.byMe || b.byPeer) return 'chatBlocked';
    if (r.peer.settings?.dm === 'friends' && !(await social.isFriend(me.id, r.peer.id))) return 'chatFriendsOnly';
    return null;
  }
  const toRoom = (r, ev, data) => {
    if (r.kind === 'dm' || r.id.startsWith('d:')) { const [, a, b] = r.id.split(':'); emitTo(a, ev, data); emitTo(b, ev, data); } else io.to('chat:' + r.id).emit(ev, data);
  };
  async function deliver(me, r, text, extra) {
    let reply_to = Math.round(Number(extra.reply_to)) || null;
    if (reply_to) { const t = await db.chatGet(reply_to); if (!t || t.room !== r.id) reply_to = null; }
    const m = await db.chatAdd(r.id, me.id, text, { ...extra, reply_to });
    const [msg] = await full([m]);
    await db.chatRead(me.id, r.id, m.id);
    if (r.kind === 'dm' && !(r.id in (await db.chatReads(r.peer.id)))) await db.chatRead(r.peer.id, r.id, 0);
    typingOff(me, r.id);
    toRoom(r, 'chat', msg);
    if (r.kind === 'dm' && !online.has(r.peer.id) && push) {
      const body = extra.kind === 'voice' ? push.L(r.peer, '🎤 Голосовое сообщение', '🎤 Дауыстық хабарлама') : extra.kind === 'image' ? '🖼 ' + (text || push.L(r.peer, 'Фото', 'Фото')) : text.slice(0, 140);
      push.send(r.peer.id, { title: me.name, body, url: '/chat/' + encodeURIComponent(r.id), tag: r.id }).catch(() => {});
    }
    return msg;
  }
  app.post('/api/chat/send', auth, wrap(async (req, res) => {
    const me = req.player;
    const r = await access(me, String(req.body?.room || ''));
    if (!r) return res.status(404).json({ error: 'notfound' });
    const text = clean(req.body?.text);
    if (!text) return res.status(400).json({ error: 'chatEmpty' });
    const err = await canSend(me, r); if (err) return res.status(403).json({ error: err });
    if (tooFast(me.id)) return res.status(429).json({ error: 'chatFast' });
    res.json({ message: await deliver(me, r, text, { reply_to: req.body?.reply_to }) });
  }));
  // Голосовое: до 60 секунд, до 600 КБ, аудио из браузера (webm/ogg/mp4).
  app.post('/api/chat/voice', auth, express.raw({ type: () => true, limit: '600kb' }), wrap(async (req, res) => {
    const me = req.player;
    const r = await access(me, String(req.query.room || ''));
    if (!r) return res.status(404).json({ error: 'notfound' });
    const mime = String(req.get('content-type') || '').toLowerCase();
    const buf = req.body;
    if (!AUDIO.test(mime) || !Buffer.isBuffer(buf) || buf.length < 500) return res.status(400).json({ error: 'chatVoiceBad' });
    const dur = Math.max(1, Math.min(60, Math.round(Number(req.query.dur) || 1)));
    const err = await canSend(me, r); if (err) return res.status(403).json({ error: err });
    if (tooFast(me.id)) return res.status(429).json({ error: 'chatFast' });
    const id = crypto.randomBytes(16).toString('hex');
    await db.mediaPut(id, mime.split(';')[0], buf);
    res.json({ message: await deliver(me, r, '', { kind: 'voice', media: id, dur, reply_to: req.query.reply_to }) });
  }));
  app.get('/chat-audio/:id', wrap(async (req, res) => {
    const id = String(req.params.id || '');
    const m = /^[a-f0-9]{32}$/.test(id) ? await db.mediaGet(id) : null;
    if (!m) return res.status(404).end();
    res.set({ 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Robots-Tag': 'noindex' }).type(m.mime).send(m.data);
  }));
  // Реакция: одна на человека; повторное нажатие того же смайла снимает её.
  app.post('/api/chat/react', auth, wrap(async (req, res) => {
    const m = await db.chatGet(Number(req.body?.id));
    const r = m && !m.deleted && await access(req.player, m.room);
    const e = String(req.body?.e || '');
    if (!r || (e && !EMOJI.includes(e))) return res.status(404).json({ error: 'notfound' });
    await db.chatReact(m.id, req.player.id, e || null);
    const rows = await db.chatReactions([m.id]);
    const names = new Map((await db.playersByIds([...new Set(rows.map(x => x.player_id))])).map(p => [p.id, p.username]));
    const ev = { id: m.id, room: m.room, reactions: groupReacts(rows, names) };
    toRoom(r, 'chat_react', ev);
    res.json(ev);
  }));
  // Прочитано: в личном чате сообщаем собеседнику, докуда дочитано.
  async function markRead(me, room, id) {
    await db.chatRead(me.id, room, id);
    if (room.startsWith('d:')) { const peer = dmPeer(room, me.id); if (peer) emitTo(peer, 'chat_seen', { room, id }); }
  }
  app.post('/api/chat/read', auth, wrap(async (req, res) => {
    const r = await access(req.player, String(req.body?.room || ''));
    const id = Math.round(Number(req.body?.id));
    if (r && id > 0) await markRead(req.player, r.id, id);
    res.json({ ok: true });
  }));
  // Картинка: браузер заранее уменьшает её до 1280 px; храним до 1,5 МБ.
  app.post('/api/chat/image', auth, express.raw({ type: () => true, limit: '1600kb' }), wrap(async (req, res) => {
    const me = req.player;
    const r = await access(me, String(req.query.room || ''));
    if (!r) return res.status(404).json({ error: 'notfound' });
    const mime = String(req.get('content-type') || '').toLowerCase().split(';')[0];
    const buf = req.body;
    const magic = Buffer.isBuffer(buf) && buf.length > 200 && (buf[0] === 0xff && buf[1] === 0xd8 || buf[0] === 0x89 && buf[1] === 0x50 || buf.slice(8, 12).toString() === 'WEBP');
    if (!IMAGE.test(mime) || !magic) return res.status(400).json({ error: 'chatImageBad' });
    const err = await canSend(me, r); if (err) return res.status(403).json({ error: err });
    if (tooFast(me.id)) return res.status(429).json({ error: 'chatFast' });
    const id = crypto.randomBytes(16).toString('hex');
    await db.mediaPut(id, mime, buf);
    res.json({ message: await deliver(me, r, clean(req.query.caption || ''), { kind: 'image', media: id, reply_to: req.query.reply_to }) });
  }));

  async function hide(m) {
    await db.chatHide(m.id);
    toRoom({ id: m.room, kind: m.room.startsWith('d:') ? 'dm' : 'room' }, 'chat_hide', { id: m.id, room: m.room });
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

  // «Печатает…»: сокет шлёт сигнал не чаще раза в 2 секунды, собеседники видят его 4 секунды.
  const typingAt = new Map();
  function typingOff(me, room) { typingAt.delete(me.id + room); }
  function bindSocket(socket, pid) {
    socket.on('chat_typing', async ({ room } = {}) => {
      const key = pid + room, now = Date.now();
      if (now - (typingAt.get(key) || 0) < 1800) return;
      typingAt.set(key, now);
      const me = await db.get(pid).catch(() => null);
      const r = me && await access(me, String(room || ''));
      if (!r) return;
      const ev = { room: r.id, username: me.username, name: me.name };
      if (r.kind === 'dm') emitTo(r.peer.id, 'chat_typing', ev); else socket.to('chat:' + r.id).emit('chat_typing', ev);
    });
  }

  return { joinSocket, bindSocket, hide };
};
module.exports.clean = clean;
