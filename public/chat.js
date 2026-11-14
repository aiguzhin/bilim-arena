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
      rules: 'Пишите уважительно. На грубость можно пожаловаться — три жалобы скрывают сообщение.',
      noRooms: 'Чатов пока нет. Укажите школу в профиле или вступите в класс — и они появятся здесь.',
      err: { chatFast: 'Слишком часто. Подождите пару секунд.', chatBlocked: 'Сообщение не отправлено: чат заблокирован.', chatFriendsOnly: 'Этот человек принимает сообщения только от друзей.', chatEmpty: 'Пустое сообщение.', chatNoUser: 'Такого пользователя нет.' }
    },
    kk: {
      title: 'Чаттар', newPh: 'Логин немесе аты бойынша іздеу', school: 'Мектеп чаты', klass: 'Сынып чаты', noLast: 'Хабарлама әлі жоқ', you: 'Сіз: ',
      pick: 'Сол жақтан чатты таңдаңыз немесе адамды логині бойынша табыңыз.', emptyRoom: 'Әзірге тыныш. Бірінші болып жазыңыз.', ph: 'Хабарлама', send: 'Жіберу', earlier: 'Алдыңғыларын көрсету',
      today: 'Бүгін', yesterday: 'Кеше', deleted: 'Хабарлама жойылды', del: 'Жою', report: 'Шағымдану', reported: 'Шағым жіберілді', delAsk: 'Хабарламаны жою керек пе?',
      add: 'Досқа қосу', sent: 'Өтінім жіберілді', accept: 'Өтінімді қабылдау', friend: 'Достар тізімінде', block: 'Бұғаттау', unblock: 'Бұғаттан шығару', profile: 'Профиль',
      blockedMe: 'Сіз бұл адамды бұғаттадыңыз. Жазу үшін бұғаттан шығарыңыз.', blockedPeer: 'Бұл адам сізден келетін хабарламаларды шектеген.',
      onlyFriends: 'Маған тек достарым жаза алады', noUsers: 'Ешкім табылмады', teacher: 'мұғалім', back: 'Барлық чат', online: 'желіде',
      rules: 'Сыпайы жазыңыз. Дөрекілікке шағымдануға болады — үш шағым хабарламаны жасырады.',
      noRooms: 'Чаттар әлі жоқ. Профильде мектепті көрсетіңіз немесе сыныпқа қосылыңыз — олар осында шығады.',
      err: { chatFast: 'Тым жиі. Бірнеше секунд күтіңіз.', chatBlocked: 'Хабарлама жіберілмеді: чат бұғатталған.', chatFriendsOnly: 'Бұл адам тек достарынан хабарлама қабылдайды.', chatEmpty: 'Бос хабарлама.', chatNoUser: 'Мұндай пайдаланушы жоқ.' }
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
      <span class="ch-row__main"><b>${esc(titleOf(r))}</b><small>${r.last ? `${r.last.mine ? t().you : r.kind !== 'dm' && r.last.name ? esc(r.last.name) + ': ' : ''}${esc(r.last.text)}` : esc(kindLabel(r))}</small></span>
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
    X.onCleanup(() => { cur = null; });
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
  const mine = m => m.from.username && m.from.username === X.me().username;
  function msgHtml(m, prev, room) {
    const me = mine(m), group = room.kind !== 'dm';
    const head = !prev || dayKey(prev.at) !== dayKey(m.at) ? `<div class="ch-day"><span>${dayLabel(m.at)}</span></div>` : '';
    const first = !prev || prev.from.username !== m.from.username || head || new Date(m.at) - new Date(prev.at) > 5 * 60000;
    const acts = m.deleted ? '' : `<span class="ch-acts">${me || room.moderate ? `<button type="button" data-del="${m.id}" title="${t().del}" aria-label="${t().del}">✕</button>` : ''}${!me ? `<button type="button" data-rep="${m.id}" title="${t().report}" aria-label="${t().report}">!</button>` : ''}</span>`;
    return `${head}<div class="ch-msg${me ? ' me' : ''}${first ? ' first' : ''}" data-id="${m.id}">
      ${group && !me ? (first ? `<a href="/u/${esc(m.from.username || '')}" data-link class="ch-msg__ava">${ava(m.from, 'sm')}</a>` : '<span class="ch-msg__ava"></span>') : ''}
      <div class="ch-bub${m.deleted ? ' del' : ''}">${group && !me && first ? `<b class="ch-bub__name">${esc(m.from.name)}${m.from.teacher ? ` <i>${t().teacher}</i>` : ''}</b>` : ''}<span class="ch-bub__text">${m.deleted ? t().deleted : linkify(m.text)}</span><time>${hhmm(m.at)}</time></div>${acts}</div>`;
  }
  async function openRoom(id) {
    const box = $('#chMain'); if (!box) return;
    let d; try { d = await X.api('/api/chat/room?id=' + encodeURIComponent(id)); } catch { box.innerHTML = `<div class="ch-pick">${t().pick}</div>`; return; }
    if (!cur || cur.id !== id) return;
    cur = d;
    const draw = () => {
      const dm = d.kind === 'dm';
      const rel = d.relation;
      box.innerHTML = `
        <header class="ch-head">
          <a href="/chat" data-link class="ch-back" aria-label="${t().back}">←</a>
          ${dm ? `<a href="/u/${esc(d.peer.username)}" data-link class="ch-head__who">${ava(d.peer)}<span><b>${esc(d.title)}</b><small>${esc(d.sub)}${d.peer.online ? ' · ' + t().online : ''}</small></span></a>`
            : `<div class="ch-head__who">${roomIcon(d.kind)}<span><b>${esc(titleOf(d))}</b><small>${d.kind === 'school' ? t().school : t().klass}${d.sub ? ' · ' + esc(d.kind === 'class' ? schoolName(d.sub) : d.sub) : ''}</small></span></div>`}
          ${dm ? `<div class="ch-head__acts">${rel === 'friend' ? `<span class="tag tag--ok">${t().friend}</span>` : rel === 'outgoing' ? `<span class="tag">${t().sent}</span>` : `<button class="btn btn--sm btn--ghost" id="chFr">${rel === 'incoming' ? t().accept : t().add}</button>`}
            <button class="linkbtn" id="chBlock">${d.blocked ? t().unblock : t().block}</button></div>` : ''}
        </header>
        <div class="ch-body" id="chBody">${d.more ? `<button class="linkbtn ch-more" id="chMore">${t().earlier}</button>` : ''}<div id="chMsgs">${d.messages.length ? d.messages.map((m, i) => msgHtml(m, d.messages[i - 1], d)).join('') : `<p class="ch-empty">${t().emptyRoom}</p>`}</div></div>
        ${d.blocked || d.blockedByPeer ? `<p class="ch-note">${d.blocked ? t().blockedMe : t().blockedPeer}</p>` : `<form class="ch-form" id="chForm"><textarea id="chText" rows="1" maxlength="500" placeholder="${t().ph}" aria-label="${t().ph}"></textarea><button class="btn" aria-label="${t().send}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12 20 4l-5 16-3-7z"/></svg></button></form>
        ${dm ? '' : `<p class="ch-rules">${t().rules}</p>`}`}`;
      const body = $('#chBody'); body.scrollTop = body.scrollHeight;
      bindRoom();
    };
    const bindRoom = () => {
      const form = $('#chForm'), ta = $('#chText'), body = $('#chBody');
      if (form) {
        const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; };
        ta.oninput = grow;
        ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
        form.onsubmit = async e => {
          e.preventDefault();
          const text = ta.value.trim(); if (!text) return;
          ta.value = ''; grow();
          try { const r = await X.api('/api/chat/send', { method: 'POST', body: { room: d.id, text } }); addMsg(r.message); }
          catch (x) { ta.value = text; grow(); X.toast(errText(x)); }
          ta.focus();
        };
        if (window.matchMedia('(min-width: 761px)').matches) ta.focus();
      }
      body.onclick = async e => {
        const del = e.target.closest('[data-del]'), rep = e.target.closest('[data-rep]');
        if (del && window.confirm(t().delAsk)) { try { await X.api('/api/chat/message/' + del.dataset.del, { method: 'DELETE' }); hideMsg(+del.dataset.del); } catch {} }
        if (rep) { try { await X.api('/api/chat/report', { method: 'POST', body: { id: +rep.dataset.rep } }); X.toast(t().reported); rep.remove(); } catch {} }
      };
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
  function addMsg(m) {
    if (!cur || cur.id !== m.room || !cur.messages || cur.messages.some(x => x.id === m.id)) return false;
    const body = $('#chBody'), list = $('#chMsgs'); if (!body || !list) return false;
    const near = body.scrollHeight - body.scrollTop - body.clientHeight < 120;
    if (!cur.messages.length) list.innerHTML = '';
    list.insertAdjacentHTML('beforeend', msgHtml(m, cur.messages[cur.messages.length - 1], cur));
    cur.messages.push(m);
    if (near || mine(m)) body.scrollTop = body.scrollHeight;
    return true;
  }
  function hideMsg(id) {
    const m = cur?.messages?.find(x => x.id === id); if (!m) return;
    m.deleted = true; m.text = null;
    const el = document.querySelector(`.ch-msg[data-id="${id}"]`);
    if (el) { el.querySelector('.ch-bub').classList.add('del'); el.querySelector('.ch-bub__text').textContent = t().deleted; el.querySelector('.ch-acts')?.remove(); }
  }

  function onChat(m) {
    const shown = addMsg(m);
    const isMine = mine(m);
    if (shown && !isMine && document.visibilityState === 'visible') X.api('/api/chat/read', { method: 'POST', body: { room: m.room, id: m.id } }).catch(() => {});
    let row = rooms.find(r => r.id === m.room);
    if (row) {
      row.last = { text: m.text.slice(0, 80), at: m.at, mine: isMine, name: m.from.name };
      if (!shown && !isMine) row.unread = (row.unread || 0) + 1;
      if (row.kind === 'dm') rooms = [...rooms.filter(r => r.kind !== 'dm'), row, ...rooms.filter(r => r.kind === 'dm' && r !== row)];
      drawList();
    } else if ($('#chList')) loadList();
    if (!shown && !isMine) {
      if (m.room.startsWith('d:') && !location.pathname.startsWith('/chat')) X.toast(`${m.from.name}: ${m.text.slice(0, 60)}`);
      if (!m.room.startsWith('s:')) refreshBadge();
    }
  }

  return {
    init(ctx) {
      X = ctx;
      X.socket.on('chat', onChat);
      X.socket.on('chat_hide', d => hideMsg(d.id));
      X.socket.on('connect', () => refreshBadge());
    },
    view, refreshBadge,
    // Кнопка «Написать» на странице игрока.
    open: async username => { try { const r = await X.api('/api/chat/dm', { method: 'POST', body: { username } }); X.go(href(r.room)); } catch (x) { X.toast(errText(x)); } }
  };
})();
