// Чаты: школа, класс, личные сообщения.
window.CHAT = (() => {
  let X, cur = null, rooms = [], onlyFriends = false;
  const $ = (s, el = document) => el.querySelector(s);
  const T = {
    ru: {
      title: 'Чаты', newPh: 'Найти по логину или имени', school: 'Чат школы', klass: 'Чат класса', noLast: 'Сообщений пока нет', you: 'Вы: ',
      pick: 'Выберите чат слева или найдите человека по логину.', emptyRoom: 'Здесь пока тихо. Напишите первым.', ph: 'Сообщение', send: 'Отправить', earlier: 'Показать раньше',
      today: 'Сегодня', yesterday: 'Вчера', deleted: 'Сообщение удалено', del: 'Удалить', report: 'Пожаловаться', reported: 'Жалоба отправлена', delAsk: 'Удалить сообщение?',
      add: 'В друзья', sent: 'Заявка отправлена', accept: 'Принять заявку', friend: 'В друзьях', block: 'Заблокировать', unblock: 'Разблокировать', profile: 'Профиль',
      blockedMe: 'Вы заблокировали этого человека. Разблокируйте, чтобы написать.', blockedPeer: 'Этот человек ограничил сообщения от вас.',
      onlyFriends: 'Писать мне могут только друзья', noUsers: 'Никого не нашли', teacher: 'учитель', back: 'Все чаты', online: 'в сети',
      rules: 'Удерживайте или нажмите правой кнопкой на сообщение — реакции, ответ, жалоба.',
      noRooms: 'Чатов пока нет. Укажите школу в профиле или вступите в класс — и они появятся здесь.',
      photo: 'Фото', attach: 'Отправить фото', typing: n => `${n} печатает…`, typingMany: 'Печатают…', seen: 'Прочитано', delivered: 'Отправлено', imgErr: 'Не удалось отправить фото.', close: 'Закрыть',
      voice: 'Голосовое сообщение', voiceRec: 'Записать голосовое', recording: 'Запись', cancel: 'Отмена', reply: 'Ответить', copy: 'Скопировать', copied: 'Скопировано', actions: 'Действия',
      noMic: 'Этот браузер не умеет записывать голос.', micDenied: 'Нет доступа к микрофону. Разрешите его в настройках браузера.', voiceErr: 'Не удалось воспроизвести.',
      err: { chatBanned: 'Отправка сообщений для вас временно ограничена модератором.', chatImageBad: 'Это не картинка (подойдут JPG, PNG, WEBP).', chatVoiceBad: 'Не удалось отправить запись.', chatFast: 'Слишком часто. Подождите пару секунд.', chatBlocked: 'Сообщение не отправлено: чат заблокирован.', chatFriendsOnly: 'Этот человек принимает сообщения только от друзей.', chatEmpty: 'Пустое сообщение.', chatNoUser: 'Такого пользователя нет.' }
    },
    kk: {
      title: 'Чаттар', newPh: 'Логин немесе аты бойынша іздеу', school: 'Мектеп чаты', klass: 'Сынып чаты', noLast: 'Хабарлама әлі жоқ', you: 'Сіз: ',
      pick: 'Сол жақтан чатты таңдаңыз немесе адамды логині бойынша табыңыз.', emptyRoom: 'Әзірге тыныш. Бірінші болып жазыңыз.', ph: 'Хабарлама', send: 'Жіберу', earlier: 'Алдыңғыларын көрсету',
      today: 'Бүгін', yesterday: 'Кеше', deleted: 'Хабарлама жойылды', del: 'Жою', report: 'Шағымдану', reported: 'Шағым жіберілді', delAsk: 'Хабарламаны жою керек пе?',
      add: 'Досқа қосу', sent: 'Өтінім жіберілді', accept: 'Өтінімді қабылдау', friend: 'Достар тізімінде', block: 'Бұғаттау', unblock: 'Бұғаттан шығару', profile: 'Профиль',
      blockedMe: 'Сіз бұл адамды бұғаттадыңыз. Жазу үшін бұғаттан шығарыңыз.', blockedPeer: 'Бұл адам сізден келетін хабарламаларды шектеген.',
      onlyFriends: 'Маған тек достарым жаза алады', noUsers: 'Ешкім табылмады', teacher: 'мұғалім', back: 'Барлық чат', online: 'желіде',
      rules: 'Хабарламаны басып тұрыңыз немесе тінтуірдің оң жағымен басыңыз — реакция, жауап, шағым.',
      noRooms: 'Чаттар әлі жоқ. Профильде мектепті көрсетіңіз немесе сыныпқа қосылыңыз — олар осында шығады.',
      photo: 'Фото', attach: 'Фото жіберу', typing: n => `${n} жазып жатыр…`, typingMany: 'Жазып жатыр…', seen: 'Оқылды', delivered: 'Жіберілді', imgErr: 'Фотоны жіберу мүмкін болмады.', close: 'Жабу',
      voice: 'Дауыстық хабарлама', voiceRec: 'Дауыстық жазу', recording: 'Жазылуда', cancel: 'Бас тарту', reply: 'Жауап беру', copy: 'Көшіру', copied: 'Көшірілді', actions: 'Әрекеттер',
      noMic: 'Бұл браузер дауыс жаза алмайды.', micDenied: 'Микрофонға рұқсат жоқ. Браузер баптауларында рұқсат беріңіз.', voiceErr: 'Ойнату мүмкін болмады.',
      err: { chatBanned: 'Модератор сізге хабар жіберуді уақытша шектеді.', chatImageBad: 'Бұл сурет емес (JPG, PNG, WEBP жарайды).', chatVoiceBad: 'Жазбаны жіберу мүмкін болмады.', chatFast: 'Тым жиі. Бірнеше секунд күтіңіз.', chatBlocked: 'Хабарлама жіберілмеді: чат бұғатталған.', chatFriendsOnly: 'Бұл адам тек достарынан хабарлама қабылдайды.', chatEmpty: 'Бос хабарлама.', chatNoUser: 'Мұндай пайдаланушы жоқ.' }
    }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const errText = x => t().err[x.code] || X.L().err.server;
  const href = id => '/chat/' + encodeURIComponent(id);
  const ICON = {
    school: '<path d="M3 10 12 5l9 5-9 5z"/><path d="M7 12.5V17c3 2 7 2 10 0v-4.5"/>',
    class: '<circle cx="9" cy="8.5" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14c2.8-.2 5 1.4 5 4.2"/>'
  };
  const roomIcon = k => `<span class="ch-ico"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg></span>`;
  const ava = (u, s = 'md') => ACC.avatar(u, s);
  const hhmm = at => new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dayKey = at => new Date(at).toDateString();
  const dayLabel = at => {
    const d = new Date(at), k = d.toDateString();
    if (k === new Date().toDateString()) return t().today;
    if (k === new Date(Date.now() - 864e5).toDateString()) return t().yesterday;
    return d.toLocaleDateString(X.lang() === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long' });
  };
  const when = at => (dayKey(at) === new Date().toDateString() ? hhmm(at) : new Date(at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }));
  const linkify = s => esc(s).replace(/\n/g, '<br>');

  // ---------- значок в шапке ----------
  async function refreshBadge() {
    const b = $('#chatBadge'); if (!b || !X?.me()) return;
    try { const d = await X.api('/api/chat/unread'); b.textContent = d.n > 99 ? '99+' : d.n; b.hidden = !d.n; } catch {}
  }

  // ---------- список чатов ----------
  const kindLabel = r => (r.kind === 'school' ? t().school : r.kind === 'class' ? t().klass : r.sub);
  const titleOf = r => (r.kind === 'school' ? schoolName(r.title) : r.title);
  const rowHtml = r => `<a class="ch-row${cur?.id === r.id ? ' on' : ''}" href="${href(r.id)}" data-link data-room="${esc(r.id)}">
      ${r.kind === 'dm' ? ava(r.peer) : roomIcon(r.kind)}
      <span class="ch-row__main"><b>${esc(titleOf(r))}</b><small class="${r.typing && Date.now() - r.typing < 4000 ? 'is-typing' : ''}">${r.typing && Date.now() - r.typing < 4000 ? t().typingMany : r.last ? `${r.last.mine ? t().you : r.kind !== 'dm' && r.last.name ? esc(r.last.name) + ': ' : ''}${esc(r.last.text)}` : esc(kindLabel(r))}</small></span>
      <span class="ch-row__side">${r.last ? `<time>${when(r.last.at)}</time>` : ''}${r.unread ? `<i class="badge">${r.unread > 99 ? '99+' : r.unread}</i>` : ''}</span></a>`;
  function drawList() {
    const box = $('#chList'); if (!box) return;
    box.innerHTML = rooms.length ? rooms.map(rowHtml).join('') : `<p class="ch-empty">${t().noRooms}</p>`;
  }
  async function loadList() {
    try { const d = await X.api('/api/chat'); rooms = d.rooms; onlyFriends = d.dmOnlyFriends; } catch { rooms = []; }
    drawList();
    const c = $('#chOnly'); if (c) c.checked = onlyFriends;
  }

  // ---------- страница ----------
  async function view(path) {
    const id = path.startsWith('/chat/') ? decodeURIComponent(path.slice(6)) : null;
    X.setTitle(t().title);
    X.socket.emit('chat_sync');
    X.app.innerHTML = `<div class="page page--chat"><div class="wrap"><div class="chat${id ? ' chat--open' : ''}">
      <aside class="chat__side">
        <div class="chat__find"><input id="chFind" type="search" autocomplete="off" placeholder="${t().newPh}" aria-label="${t().newPh}"><div class="ch-found" id="chFound" hidden></div></div>
        <div class="chat__list" id="chList"></div>
        <label class="check chat__only"><input type="checkbox" id="chOnly"> <span>${t().onlyFriends}</span></label>
      </aside>
      <section class="chat__main" id="chMain"><div class="ch-pick">${t().pick}</div></section>
    </div></div></div>`;
    cur = id ? { id } : null;
    X.onCleanup(() => { cur = null; stopRec(true); if (player) { player.a.pause(); player = null; } document.querySelector('.ch-menu-back')?.remove(); closeMenu(); });
    bindSide();
    loadList();
    if (id) openRoom(id);
  }
  function bindSide() {
    const inp = $('#chFind'), box = $('#chFound');
    let tm = null;
    inp.oninput = () => {
      clearTimeout(tm);
      const q = inp.value.trim();
      if (q.length < 2) { box.hidden = true; return; }
      tm = setTimeout(async () => {
        let d; try { d = await X.api('/api/friends/search?q=' + encodeURIComponent(q)); } catch { return; }
        box.innerHTML = d.users.length ? d.users.map(u => `<button type="button" class="ch-row" data-u="${esc(u.username)}">${ava(u)}<span class="ch-row__main"><b>${esc(u.name)}</b><small>@${esc(u.username)}${u.school ? ' · ' + esc(schoolName(u.school)) : ''}</small></span></button>`).join('') : `<p class="ch-empty">${t().noUsers}</p>`;
        box.hidden = false;
      }, 250);
    };
    box.onclick = async e => {
      const b = e.target.closest('[data-u]'); if (!b) return;
      try { const r = await X.api('/api/chat/dm', { method: 'POST', body: { username: b.dataset.u } }); inp.value = ''; box.hidden = true; X.go(href(r.room)); } catch (x) { X.toast(errText(x)); }
    };
    $('#chOnly').onchange = async e => {
      try { const r = await X.api('/api/me/settings', { method: 'PUT', body: { dm: e.target.checked ? 'friends' : 'all' } }); X.setMe(r.user); onlyFriends = e.target.checked; } catch { e.target.checked = !e.target.checked; }
    };
  }

  // ---------- переписка ----------
  const EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  const mine = m => m.from.username && m.from.username === X.me().username;
  const SVG = (d, w = 20) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    send: '<path d="M4 12 20 4l-5 16-3-7z"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    reply: '<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 6 6"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    del: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', clip: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5L6 19"/>', stop: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none"/>'
  };
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const bars = id => Array.from({ length: 28 }, (_, i) => 25 + ((id * 9301 + i * 49297) % 233280) / 233280 * 75);
  function voiceHtml(m) {
    return `<div class="ch-voice" data-audio="${esc(m.audio)}" data-dur="${m.dur || 0}"><button type="button" class="ch-voice__play" aria-label="▶">${SVG(I.play, 18)}</button>
      <span class="ch-voice__wave">${bars(m.id).map(h => `<i style="height:${h.toFixed(0)}%"></i>`).join('')}</span><span class="ch-voice__t">${mmss(m.dur || 0)}</span></div>`;
  }
  const reactHtml = m => (m.reactions?.length ? `<div class="ch-reacts">${m.reactions.map(r => `<button type="button" class="ch-react${r.users.includes(X.me().username) ? ' on' : ''}" data-react="${r.e}" data-mid="${m.id}" title="${esc(r.users.map(u => '@' + u).join(', '))}">${r.e}<b>${r.users.length}</b></button>`).join('')}</div>` : '');
  const replyHtml = r => (r ? `<button type="button" class="ch-quote" data-goto="${r.id}"><b>${esc(r.name)}</b><span>${r.text == null ? t().deleted : r.kind === 'voice' ? '🎤 ' + t().voice : r.kind === 'image' ? '🖼 ' + (r.text || t().photo) : esc(r.text)}</span></button>` : '');
  function msgHtml(m, prev, room) {
    const me = mine(m), group = room.kind !== 'dm';
    const head = !prev || dayKey(prev.at) !== dayKey(m.at) ? `<div class="ch-day"><span>${dayLabel(m.at)}</span></div>` : '';
    const first = !prev || prev.from.username !== m.from.username || head || new Date(m.at) - new Date(prev.at) > 5 * 60000;
    const body = m.deleted ? `<span class="ch-bub__text">${t().deleted}</span>` : m.kind === 'voice' ? voiceHtml(m) : m.kind === 'image' ? `<button type="button" class="ch-img" data-img="${esc(m.image)}" aria-label="${t().photo}"><img src="${esc(m.image)}" alt="" loading="lazy" decoding="async"></button>${m.text ? `<span class="ch-bub__text">${linkify(m.text)}</span>` : ''}` : `<span class="ch-bub__text">${linkify(m.text)}</span>`;
    const tick = me && room.kind === 'dm' && !m.deleted ? `<i class="ch-tick${m.id <= (room.peerRead || 0) ? ' seen' : ''}" title="${m.id <= (room.peerRead || 0) ? t().seen : t().delivered}">${m.id <= (room.peerRead || 0) ? '✓✓' : '✓'}</i>` : '';
    return `${head}<div class="ch-msg${me ? ' me' : ''}${first ? ' first' : ''}" data-id="${m.id}">
      ${group && !me ? (first ? `<a href="/u/${esc(m.from.username || '')}" data-link class="ch-msg__ava">${ava(m.from, 'sm')}</a>` : '<span class="ch-msg__ava"></span>') : ''}
      <div class="ch-col"><div class="ch-bub${m.deleted ? ' del' : ''}${m.kind === 'voice' ? ' voice' : ''}${m.kind === 'image' && !m.deleted ? ' image' : ''}" tabindex="0">${group && !me && first ? `<b class="ch-bub__name">${esc(m.from.name)}${m.from.teacher ? ` <i>${t().teacher}</i>` : ''}</b>` : ''}${m.deleted ? '' : replyHtml(m.reply)}${body}<time>${hhmm(m.at)}${tick}</time></div>${m.deleted ? '' : reactHtml(m)}</div>
      ${m.deleted ? '' : `<button type="button" class="ch-more-btn" data-menu="${m.id}" aria-label="${t().actions}">${SVG(I.more, 18)}</button>`}</div>`;
  }

  // Меню действий: реакции, ответить, скопировать, удалить, пожаловаться.
  function closeMenu() { document.querySelector('.ch-menu')?.remove(); document.querySelector('.ch-msg.sel')?.classList.remove('sel'); }
  function openMenu(id, anchor) {
    closeMenu();
    const m = cur?.messages?.find(x => x.id === id); if (!m || m.deleted) return;
    const el = document.querySelector(`.ch-msg[data-id="${id}"]`); el?.classList.add('sel');
    const me = mine(m), my = m.reactions?.find(r => r.users.includes(X.me().username))?.e;
    const item = (k, ic, label, cls = '') => `<button type="button" class="ch-menu__it ${cls}" data-act="${k}">${SVG(ic, 18)}<span>${label}</span></button>`;
    const menu = document.createElement('div');
    menu.className = 'ch-menu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = `<div class="ch-menu__emoji">${EMOJI.map(e => `<button type="button" data-e="${e}" class="${e === my ? 'on' : ''}" aria-label="${e}">${e}</button>`).join('')}</div>
      ${item('reply', I.reply, t().reply)}${m.text ? item('copy', I.copy, t().copy) : ''}${me || cur.moderate ? item('del', I.del, t().del, 'bad') : ''}${!me ? item('report', I.flag, t().report, 'bad') : ''}`;
    document.body.appendChild(menu);
    const touch = window.matchMedia('(max-width: 760px)').matches;
    if (touch) menu.classList.add('sheet');
    else {
      const r = (anchor || el.querySelector('.ch-bub')).getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
      let x = mine(m) ? r.right - mw : r.left, y = r.bottom + 6;
      if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 6);
      menu.style.left = Math.max(8, Math.min(x, innerWidth - mw - 8)) + 'px'; menu.style.top = y + 'px';
    }
    const back = document.createElement('div'); back.className = 'ch-menu-back'; document.body.insertBefore(back, menu);
    const done = () => { back.remove(); closeMenu(); };
    back.onclick = done;
    back.oncontextmenu = e => { e.preventDefault(); done(); };
    menu.onclick = async e => {
      const em = e.target.closest('[data-e]'), act = e.target.closest('[data-act]')?.dataset.act;
      if (em) { done(); return react(id, em.dataset.e); }
      if (!act) return;
      done();
      if (act === 'reply') setReply(m);
      if (act === 'copy') { try { await navigator.clipboard.writeText(m.text); X.toast(t().copied); } catch {} }
      if (act === 'del' && window.confirm(t().delAsk)) { try { await X.api('/api/chat/message/' + id, { method: 'DELETE' }); hideMsg(id); } catch {} }
      if (act === 'report') { try { await X.api('/api/chat/report', { method: 'POST', body: { id } }); X.toast(t().reported); } catch {} }
    };
    const esc_ = e => { if (e.key === 'Escape') { done(); document.removeEventListener('keydown', esc_); } };
    document.addEventListener('keydown', esc_);
    menu.querySelector('button')?.focus({ preventScroll: true });
  }
  async function react(id, e) {
    try { const r = await X.api('/api/chat/react', { method: 'POST', body: { id, e } }); setReacts(r); } catch {}
  }
  function setReacts(ev) {
    const m = cur?.messages?.find(x => x.id === ev.id); if (!m) return;
    m.reactions = ev.reactions;
    const col = document.querySelector(`.ch-msg[data-id="${ev.id}"] .ch-col`); if (!col) return;
    const before = new Map([...col.querySelectorAll('.ch-react')].map(b => [b.dataset.react, b.querySelector('b').textContent]));
    col.querySelector('.ch-reacts')?.remove();
    col.insertAdjacentHTML('beforeend', reactHtml(m));
    col.querySelectorAll('.ch-react').forEach(b => { if (before.get(b.dataset.react) !== b.querySelector('b').textContent) FX.pop(b); });
  }
  let replyTo = null;
  function setReply(m) {
    replyTo = m;
    const bar = $('#chReply'); if (!bar) return;
    bar.hidden = !m;
    if (m) { bar.querySelector('b').textContent = m.from.name; bar.querySelector('span').textContent = m.kind === 'voice' ? '🎤 ' + t().voice : m.kind === 'image' ? '🖼 ' + (m.text || t().photo) : m.text.slice(0, 90); $('#chText')?.focus(); }
  }

  // Голосовые: запись (MediaRecorder) и проигрывание — одно за раз.
  let player = null;
  function playVoice(box) {
    const btn = box.querySelector('.ch-voice__play'), tl = box.querySelector('.ch-voice__t'), dur = +box.dataset.dur || 0;
    if (player && player.box === box) { if (player.a.paused) player.a.play(); else player.a.pause(); return; }
    if (player) { player.a.pause(); player.reset(); }
    const a = new Audio(box.dataset.audio);
    const wave = [...box.querySelectorAll('.ch-voice__wave i')];
    const paint = () => { const p = a.duration && isFinite(a.duration) ? a.currentTime / a.duration : a.currentTime / (dur || 1); wave.forEach((w, i) => w.classList.toggle('on', i / wave.length < p)); tl.textContent = mmss(a.paused && !a.currentTime ? dur : a.currentTime); };
    const reset = () => { btn.innerHTML = SVG(I.play, 18); wave.forEach(w => w.classList.remove('on')); tl.textContent = mmss(dur); };
    a.onplay = () => { btn.innerHTML = SVG(I.pause, 18); };
    a.onpause = () => { btn.innerHTML = SVG(I.play, 18); };
    a.ontimeupdate = paint;
    a.onended = () => { reset(); player = null; };
    a.onerror = () => { reset(); player = null; X.toast(t().voiceErr); };
    player = { a, box, reset };
    a.play().catch(() => { reset(); player = null; });
  }
  let rec = null;
  async function startRec(d) {
    if (rec) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return X.toast(t().noMic);
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { return X.toast(t().micDenied); }
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find(x => MediaRecorder.isTypeSupported?.(x)) || '';
    const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    const chunks = [];
    rec = { mr, stream, chunks, start: Date.now(), cancel: false, room: d.id };
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(tr => tr.stop());
      const r = rec; rec = null; clearInterval(r.tick); drawComposer();
      const secs = Math.round((Date.now() - r.start) / 1000);
      if (r.cancel || secs < 1) return;
      const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/webm' });
      try {
        const q = new URLSearchParams({ room: r.room, dur: Math.min(60, secs), ...(replyTo ? { reply_to: replyTo.id } : {}) });
        const res = await fetch('/api/chat/voice?' + q, { method: 'POST', headers: { 'Content-Type': blob.type.split(';')[0], Authorization: 'Bearer ' + X.token() }, body: blob });
        const j = await res.json();
        if (!res.ok) throw Object.assign(new Error(), { code: j.error });
        setReply(null); addMsg(j.message);
      } catch (x) { X.toast(errText(x)); }
    };
    mr.start(250);
    rec.tick = setInterval(() => { const s = (Date.now() - rec.start) / 1000; const el = $('#chRecT'); if (el) el.textContent = mmss(s); if (s >= 60) stopRec(false); }, 200);
    drawComposer();
  }
  function stopRec(cancel) { if (!rec) return; rec.cancel = cancel; if (rec.mr.state !== 'inactive') rec.mr.stop(); }
  let drawComposer = () => {};

  async function openRoom(id) {
    const box = $('#chMain'); if (!box) return;
    let d; try { d = await X.api('/api/chat/room?id=' + encodeURIComponent(id)); } catch { box.innerHTML = `<div class="ch-pick">${t().pick}</div>`; return; }
    if (!cur || cur.id !== id) return;
    cur = d; replyTo = null; stopRec(true); typers.clear();
    const draw = () => {
      const dm = d.kind === 'dm';
      const rel = d.relation;
      box.innerHTML = `
        <header class="ch-head">
          <a href="/chat" data-link class="ch-back" aria-label="${t().back}">←</a>
          ${dm ? `<a href="/u/${esc(d.peer.username)}" data-link class="ch-head__who">${ava(d.peer)}<span><b>${esc(d.title)}</b><small>${esc(d.sub)}${d.peer.online ? ' · ' + t().online : ''}</small></span></a>`
            : `<div class="ch-head__who">${roomIcon(d.kind)}<span><b>${esc(titleOf(d))}</b><small>${d.kind === 'school' ? t().school : t().klass}${d.sub ? ' · ' + esc(d.kind === 'class' ? schoolName(d.sub) : d.sub) : ''}</small></span></div>`}
          ${dm ? `<div class="ch-head__acts">${rel === 'friend' ? `<span class="tag tag--ok">${t().friend}</span>` : rel === 'outgoing' ? `<span class="tag">${t().sent}</span>` : `<button class="btn btn--sm btn--ghost" id="chFr">${rel === 'incoming' ? t().accept : t().add}</button>`}
            <button class="linkbtn ch-blockbtn" id="chBlock" title="${d.blocked ? t().unblock : t().block}" aria-label="${d.blocked ? t().unblock : t().block}">${SVG('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>', 18)}<span>${d.blocked ? t().unblock : t().block}</span></button></div>` : ''}
        </header>
        <div class="ch-body" id="chBody">${d.more ? `<button class="linkbtn ch-more" id="chMore">${t().earlier}</button>` : ''}<div id="chMsgs">${d.messages.length ? d.messages.map((m, i) => msgHtml(m, d.messages[i - 1], d)).join('') : `<p class="ch-empty">${t().emptyRoom}</p>`}</div><div class="ch-typing" id="chTyping" hidden><i></i><i></i><i></i><span></span></div></div>
        ${d.blocked || d.blockedByPeer ? `<p class="ch-note">${d.blocked ? t().blockedMe : t().blockedPeer}</p>` : `<div class="ch-reply" id="chReply" hidden>${SVG(I.reply, 18)}<div><b></b><span></span></div><button type="button" id="chReplyX" aria-label="${t().cancel}">${SVG(I.x, 18)}</button></div><div id="chComposer"></div>
        ${dm ? '' : `<p class="ch-rules">${t().rules}</p>`}`}`;
      const body = $('#chBody'); body.scrollTop = body.scrollHeight;
      drawComposer = composer;
      composer(); bindRoom();
    };
    // Поле ввода: пустое — кнопка микрофона, с текстом — отправить; во время записи — таймер, отмена и отправка.
    const composer = () => {
      const c = $('#chComposer'); if (!c) return;
      if (rec && rec.room === d.id) {
        c.innerHTML = `<div class="ch-form ch-form--rec"><button type="button" class="ch-ibtn" id="chRecX" aria-label="${t().cancel}">${SVG(I.x)}</button><span class="ch-rec"><i></i>${t().recording} <b id="chRecT">0:00</b></span><button type="button" class="btn" id="chRecSend" aria-label="${t().send}">${SVG(I.send)}</button></div>`;
        $('#chRecX').onclick = () => stopRec(true);
        $('#chRecSend').onclick = () => stopRec(false);
        return;
      }
      const keep = $('#chText')?.value || '';
      c.innerHTML = `<form class="ch-form" id="chForm"><button type="button" class="ch-ibtn ch-attach" id="chAttach" aria-label="${t().attach}" title="${t().attach}">${SVG(I.clip)}</button><input type="file" id="chFile" accept="image/*" hidden><textarea id="chText" rows="1" maxlength="500" placeholder="${t().ph}" aria-label="${t().ph}"></textarea><button type="button" class="ch-ibtn" id="chMic" aria-label="${t().voiceRec}" title="${t().voiceRec}">${SVG(I.mic)}</button><button class="btn" id="chSend" aria-label="${t().send}">${SVG(I.send)}</button></form>`;
      const form = $('#chForm'), ta = $('#chText');
      ta.value = keep;
      const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; form.classList.toggle('has-text', !!ta.value.trim()); };
      let lastType = 0;
      ta.oninput = () => { grow(); if (ta.value.trim() && Date.now() - lastType > 2000) { lastType = Date.now(); X.socket.emit('chat_typing', { room: d.id }); } };
      grow();
      $('#chAttach').onclick = () => $('#chFile').click();
      $('#chFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) sendImage(d, f, ta); };
      ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !window.matchMedia('(max-width: 760px)').matches) { e.preventDefault(); form.requestSubmit(); } };
      form.onsubmit = async e => {
        e.preventDefault();
        const text = ta.value.trim(); if (!text) return;
        const rp = replyTo;
        ta.value = ''; grow(); setReply(null);
        try { const r = await X.api('/api/chat/send', { method: 'POST', body: { room: d.id, text, reply_to: rp?.id } }); addMsg(r.message); }
        catch (x) { ta.value = text; grow(); setReply(rp); X.toast(errText(x)); }
        ta.focus();
      };
      $('#chMic').onclick = () => startRec(d);
      if (window.matchMedia('(min-width: 761px)').matches) ta.focus();
    };
    const bindRoom = () => {
      const body = $('#chBody');
      const rx = $('#chReplyX'); if (rx) rx.onclick = () => setReply(null);
      body.onclick = async e => {
        const play = e.target.closest('.ch-voice'); if (play) return playVoice(play);
        const im = e.target.closest('[data-img]'); if (im) return lightbox(im.dataset.img);
        const rb = e.target.closest('[data-react]'); if (rb) return react(+rb.dataset.mid, rb.dataset.react);
        const mb = e.target.closest('[data-menu]'); if (mb) return openMenu(+mb.dataset.menu, mb.closest('.ch-msg').querySelector('.ch-bub'));
        const q = e.target.closest('[data-goto]');
        if (q) { const el = document.querySelector(`.ch-msg[data-id="${q.dataset.goto}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }
      };
      // Компьютер: правая кнопка мыши или двойной клик (быстрый 👍). Телефон: долгое нажатие или двойное касание.
      body.oncontextmenu = e => { const b = e.target.closest('.ch-bub'); if (!b || b.classList.contains('del')) return; e.preventDefault(); openMenu(+b.closest('.ch-msg').dataset.id, b); };
      body.ondblclick = e => { const b = e.target.closest('.ch-bub'); if (!b || b.classList.contains('del') || e.target.closest('.ch-voice,a,button')) return; window.getSelection()?.removeAllRanges(); react(+b.closest('.ch-msg').dataset.id, '👍'); };
      let pt = null;
      body.addEventListener('touchstart', e => {
        const b = e.target.closest('.ch-bub'); if (!b || b.classList.contains('del') || e.target.closest('.ch-voice__play,a')) return;
        const t0 = e.touches[0];
        pt = { b, x: t0.clientX, y: t0.clientY, timer: setTimeout(() => { pt = null; navigator.vibrate?.(15); openMenu(+b.closest('.ch-msg').dataset.id, b); }, 450) };
      }, { passive: true });
      const cancel = () => { if (pt) { clearTimeout(pt.timer); pt = null; } };
      body.addEventListener('touchmove', e => { if (pt && Math.hypot(e.touches[0].clientX - pt.x, e.touches[0].clientY - pt.y) > 10) cancel(); }, { passive: true });
      body.addEventListener('touchend', cancel); body.addEventListener('touchcancel', cancel);
      // Свайп сообщения вправо на телефоне — ответить.
      let sw = null;
      body.addEventListener('touchstart', e => { const msg = e.target.closest('.ch-msg'); if (msg && !e.target.closest('.ch-voice')) sw = { msg, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0 }; }, { passive: true });
      body.addEventListener('touchmove', e => { if (!sw) return; const dx = e.touches[0].clientX - sw.x, dy = Math.abs(e.touches[0].clientY - sw.y); if (dy > 30) { sw.msg.style.transform = ''; sw = null; return; } sw.dx = Math.max(0, Math.min(70, dx)); sw.msg.style.transform = `translateX(${sw.dx}px)`; }, { passive: true });
      body.addEventListener('touchend', () => { if (!sw) return; const { msg, dx } = sw; sw = null; msg.style.transition = 'transform .15s'; msg.style.transform = ''; setTimeout(() => { msg.style.transition = ''; }, 160); if (dx > 55) { const m = cur?.messages?.find(x => x.id === +msg.dataset.id); if (m && !m.deleted) { navigator.vibrate?.(10); setReply(m); } } });
      body.onkeydown = e => { const b = e.target.closest('.ch-bub'); if (b && (e.key === 'Enter' || e.key === 'ContextMenu')) { e.preventDefault(); openMenu(+b.closest('.ch-msg').dataset.id, b); } };
      const more = $('#chMore');
      if (more) more.onclick = async () => {
        more.disabled = true;
        try {
          const r = await X.api(`/api/chat/room?id=${encodeURIComponent(d.id)}&before=${d.messages[0].id}`);
          const h = body.scrollHeight;
          d.messages = r.messages.concat(d.messages); d.more = r.more;
          $('#chMsgs').innerHTML = d.messages.map((m, i) => msgHtml(m, d.messages[i - 1], d)).join('');
          body.scrollTop = body.scrollHeight - h;
          if (!d.more) more.remove(); else more.disabled = false;
        } catch { more.disabled = false; }
      };
      const fr = $('#chFr'), bl = $('#chBlock');
      if (fr) fr.onclick = async () => {
        try { const r = await X.api(d.relation === 'incoming' ? '/api/friends/accept' : '/api/friends/request', { method: 'POST', body: { username: d.peer.username } }); d.relation = r.status; SOC.refreshBadge(); draw(); } catch (x) { X.toast(errText(x)); }
      };
      if (bl) bl.onclick = async () => {
        try { const r = await X.api('/api/chat/block', { method: 'POST', body: { username: d.peer.username, on: !d.blocked } }); d.blocked = r.blocked; draw(); } catch {}
      };
    };
    draw();
    const row = rooms.find(r => r.id === id); if (row) { row.unread = 0; drawList(); }
    document.querySelectorAll('.ch-row.on').forEach(el => el.classList.remove('on'));
    document.querySelector(`.ch-row[data-room="${CSS.escape(id)}"]`)?.classList.add('on');
    refreshBadge();
  }
  // «Печатает…»: внизу переписки, пропадает через 4 секунды.
  const typers = new Map();
  function typingDraw() {
    const box = $('#chTyping'); if (!box) return;
    const now = Date.now();
    for (const [u, x] of typers) if (now - x.at > 4000) typers.delete(u);
    const names = [...typers.values()].map(x => x.name);
    box.hidden = !names.length;
    if (names.length) box.querySelector('span').textContent = names.length > 1 ? t().typingMany : t().typing(names[0]);
  }
  function typingShow(ev) { typers.set(ev.username, { name: ev.name, at: Date.now() }); typingDraw(); clearTimeout(typingShow.tm); typingShow.tm = setTimeout(typingDraw, 4100); }
  function typingHide(u) { if (typers.delete(u)) typingDraw(); }

  // Фото: уменьшаем в браузере до 1280 px (JPEG), подпись берём из поля ввода.
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.82));
    } finally { URL.revokeObjectURL(url); }
  }
  async function sendImage(d, file, ta) {
    if (!/^image\//.test(file.type)) return X.toast(t().err.chatImageBad);
    let blob; try { blob = await shrink(file); } catch { return X.toast(t().imgErr); }
    if (!blob) return X.toast(t().imgErr);
    const caption = ta.value.trim().slice(0, 500), rp = replyTo;
    const q = new URLSearchParams({ room: d.id, ...(caption ? { caption } : {}), ...(rp ? { reply_to: rp.id } : {}) });
    const btn = $('#chAttach'); if (btn) btn.disabled = true;
    try {
      const res = await fetch('/api/chat/image?' + q, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', Authorization: 'Bearer ' + X.token() }, body: blob });
      const j = await res.json();
      if (!res.ok) throw Object.assign(new Error(), { code: j.error });
      ta.value = ''; ta.dispatchEvent(new Event('input')); setReply(null); addMsg(j.message);
    } catch (x) { X.toast(errText(x)); }
    if (btn) btn.disabled = false;
  }
  function lightbox(src) {
    const box = document.createElement('div');
    box.className = 'ch-lightbox';
    box.innerHTML = `<img src="${esc(src)}" alt=""><button type="button" aria-label="${t().close}">${SVG(I.x, 22)}</button>`;
    const close = () => { box.remove(); document.removeEventListener('keydown', k); };
    const k = e => { if (e.key === 'Escape') close(); };
    box.onclick = close; document.addEventListener('keydown', k);
    document.body.appendChild(box);
  }

  function addMsg(m) {
    if (!cur || cur.id !== m.room || !cur.messages || cur.messages.some(x => x.id === m.id)) return false;
    const body = $('#chBody'), list = $('#chMsgs'); if (!body || !list) return false;
    const near = body.scrollHeight - body.scrollTop - body.clientHeight < 120;
    if (!cur.messages.length) list.innerHTML = '';
    list.insertAdjacentHTML('beforeend', msgHtml(m, cur.messages[cur.messages.length - 1], cur));
    list.lastElementChild?.classList.add('fx-in');
    cur.messages.push(m);
    if (!mine(m)) typingHide(m.from.username);
    const img = list.lastElementChild?.querySelector('img'); if (img) img.onload = () => { if (near || mine(m)) body.scrollTop = body.scrollHeight; };
    if (near || mine(m)) body.scrollTop = body.scrollHeight;
    return true;
  }
  function hideMsg(id) {
    const m = cur?.messages?.find(x => x.id === id); if (!m) return;
    m.deleted = true; m.text = null; m.reactions = [];
    const el = document.querySelector(`.ch-msg[data-id="${id}"]`);
    if (el) el.outerHTML = msgHtml(m, cur.messages[cur.messages.indexOf(m) - 1], cur);
  }

  function onChat(m) {
    const shown = addMsg(m);
    const isMine = mine(m);
    if (shown && !isMine && document.visibilityState === 'visible') X.api('/api/chat/read', { method: 'POST', body: { room: m.room, id: m.id } }).catch(() => {});
    let row = rooms.find(r => r.id === m.room);
    if (row) {
      row.last = { text: m.kind === 'voice' ? '🎤' : m.kind === 'image' ? '🖼' : m.text.slice(0, 80), at: m.at, mine: isMine, name: m.from.name };
      if (!shown && !isMine) row.unread = (row.unread || 0) + 1;
      if (row.kind === 'dm') rooms = [...rooms.filter(r => r.kind !== 'dm'), row, ...rooms.filter(r => r.kind === 'dm' && r !== row)];
      drawList();
    } else if ($('#chList')) loadList();
    if (!shown && !isMine) {
      if (m.room.startsWith('d:') && !location.pathname.startsWith('/chat')) X.toast(`${m.from.name}: ${m.kind === 'voice' ? '🎤 ' + t().voice : m.kind === 'image' ? '🖼 ' + t().photo : m.text.slice(0, 60)}`);
      if (!m.room.startsWith('s:')) refreshBadge();
    }
  }

  return {
    init(ctx) {
      X = ctx;
      X.socket.on('chat', onChat);
      X.socket.on('chat_hide', d => hideMsg(d.id));
      X.socket.on('chat_react', setReacts);
      X.socket.on('chat_seen', ev => { if (!cur || cur.id !== ev.room || cur.kind !== 'dm') return; cur.peerRead = Math.max(cur.peerRead || 0, ev.id); document.querySelectorAll('.ch-msg.me').forEach(el => { const tk = el.querySelector('.ch-tick'); if (tk && +el.dataset.id <= cur.peerRead && !tk.classList.contains('seen')) { tk.classList.add('seen'); tk.textContent = '✓✓'; tk.title = t().seen; FX.pop(tk); } }); });
      X.socket.on('chat_typing', ev => { if (cur && cur.id === ev.room) typingShow(ev); const row = rooms.find(r => r.id === ev.room); if (row && row.kind === 'dm') { row.typing = Date.now(); drawList(); setTimeout(drawList, 4200); } });
      X.socket.on('connect', () => refreshBadge());
    },
    view, refreshBadge,
    // Кнопка «Написать» на странице игрока.
    open: async username => { try { const r = await X.api('/api/chat/dm', { method: 'POST', body: { username } }); X.go(href(r.room)); } catch (x) { X.toast(errText(x)); } }
  };
})();
