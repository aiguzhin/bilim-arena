// Друзья: список, заявки, поиск; приглашения на баттл внутри сайта.
window.SOC = (() => {
  let X;
  const $ = (s, el = document) => el.querySelector(s);
  const T = {
    ru: {
      title: 'Друзья', lead: 'Добавляйте одноклассников и зовите их на дуэль прямо на сайте — без ссылок.',
      tabFriends: 'Друзья', tabReq: 'Заявки', tabFind: 'Найти',
      online: 'в сети', offline: 'не в сети', duel: 'Позвать на дуэль', remove: 'Удалить', removeAsk: n => `Удалить ${n} из друзей?`,
      accept: 'Принять', decline: 'Отклонить', cancel: 'Отменить', add: 'Добавить', sent: 'Заявка отправлена', isFriend: 'В друзьях', wantsYou: 'Хочет дружить',
      incoming: 'Входящие заявки', outgoing: 'Вы отправили', noFriends: 'Друзей пока нет. Найдите одноклассников по нику или имени.',
      noReq: 'Новых заявок нет.', findPh: 'Ник или имя, например aigerim', findHint: 'Введите хотя бы 2 буквы.', notFound: 'Никого не нашли.',
      toFind: 'Найти друзей', reqToast: n => `${n} хочет добавить вас в друзья`, accToast: n => `${n} теперь в друзьях`,
      invTitle: 'Вас зовут на баттл', invDuel: 'Дуэль', invClass: 'Класс против класса', invAccept: 'Играть', invDecline: 'Не сейчас',
      inviteTitle: 'Позвать друзей', inviteNone: 'Никого из друзей нет в сети.', inviteBtn: 'Позвать', invited: 'Приглашение отправлено',
      declined: n => `${n} сейчас не может играть`, offlineErr: 'Друг уже не в сети', addFriend: 'Добавить в друзья', friendsLink: 'Все друзья'
    },
    kk: {
      title: 'Достар', lead: 'Сыныптастарыңызды қосып, оларды сайттың ішінде жекпе-жекке шақырыңыз — сілтемесіз.',
      tabFriends: 'Достар', tabReq: 'Өтінімдер', tabFind: 'Іздеу',
      online: 'желіде', offline: 'желіде емес', duel: 'Жекпе-жекке шақыру', remove: 'Жою', removeAsk: n => `${n} достардан жойылсын ба?`,
      accept: 'Қабылдау', decline: 'Бас тарту', cancel: 'Болдырмау', add: 'Қосу', sent: 'Өтінім жіберілді', isFriend: 'Досыңыз', wantsYou: 'Дос болғысы келеді',
      incoming: 'Келген өтінімдер', outgoing: 'Сіз жібердіңіз', noFriends: 'Әзірге дос жоқ. Сыныптастарыңызды ник немесе аты бойынша табыңыз.',
      noReq: 'Жаңа өтінім жоқ.', findPh: 'Ник немесе аты, мысалы aigerim', findHint: 'Кемінде 2 әріп енгізіңіз.', notFound: 'Ешкім табылмады.',
      toFind: 'Дос табу', reqToast: n => `${n} сізді досқа қосқысы келеді`, accToast: n => `${n} енді досыңыз`,
      invTitle: 'Сізді баттлға шақырады', invDuel: 'Жекпе-жек', invClass: 'Сынып сыныпқа', invAccept: 'Ойнау', invDecline: 'Қазір емес',
      inviteTitle: 'Достарды шақыру', inviteNone: 'Желіде дос жоқ.', inviteBtn: 'Шақыру', invited: 'Шақыру жіберілді',
      declined: n => `${n} қазір ойнай алмайды`, offlineErr: 'Досыңыз желіден шықты', addFriend: 'Досқа қосу', friendsLink: 'Барлық достар'
    }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const ava = (u, s = 'md') => ACC.avatar(u, s);
  const post = (path, body) => X.api(path, { method: 'POST', body });

  // ---------- значок заявок в шапке ----------
  async function refreshBadge() {
    const b = $('#friendsBadge'); if (!b || !X?.me()) return;
    try { const d = await X.api('/api/friends/count'); b.textContent = d.incoming; b.hidden = !d.incoming; } catch {}
  }

  // ---------- страница «Друзья» ----------
  let tab = 'friends';
  async function view() {
    X.setTitle(t().title);
    const q0 = new URLSearchParams(location.search).get('tab');
    if (['friends', 'requests', 'find'].includes(q0)) tab = q0;
    let d; try { d = await X.api('/api/friends'); } catch { return; }
    const nReq = d.incoming.length;
    X.app.innerHTML = `<div class="page"><div class="wrap narrow">
      <h1>${t().title}</h1><p class="page__lead">${t().lead}</p>
      <div class="tabs" role="tablist" style="margin-top:22px">
        <button role="tab" data-ft="friends" aria-selected="${tab === 'friends'}">${t().tabFriends} <span class="num muted">${d.friends.length || ''}</span></button>
        <button role="tab" data-ft="requests" aria-selected="${tab === 'requests'}">${t().tabReq}${nReq ? ` <span class="badge">${nReq}</span>` : ''}</button>
        <button role="tab" data-ft="find" aria-selected="${tab === 'find'}">${t().tabFind}</button>
      </div>
      <div id="fBody"></div></div></div>${X.footer()}`;
    X.app.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { tab = b.dataset.ft; history.replaceState({}, '', `/friends?tab=${tab}`); view(); });
    const body = $('#fBody');
    const row = (u, actions) => `<li class="frow"><a class="frow__who" href="/u/${esc(u.username)}" data-link>${ava(u)}<span class="frow__dot ${u.online ? 'on' : ''}" title="${u.online ? t().online : t().offline}"></span>
      <span class="frow__txt"><b>${esc(u.name)}</b><small>@${esc(u.username)} · ${esc(schoolName(u.school))}</small></span></a><div class="frow__act">${actions}</div></li>`;
    if (tab === 'friends') {
      body.innerHTML = d.friends.length ? `<ul class="flist">${d.friends.map(u => row(u, `${u.online ? `<button class="btn btn--sm" data-duel="${esc(u.username)}">${t().duel}</button>` : `<span class="muted fsmall">${t().offline}</span>`}
        <button class="iconbtn" data-rm="${esc(u.username)}" data-nm="${esc(u.name)}" aria-label="${t().remove}" title="${t().remove}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`)).join('')}</ul>`
        : `<div class="empty">${t().noFriends}<br><button class="btn" data-go="find">${t().toFind}</button></div>`;
    } else if (tab === 'requests') {
      body.innerHTML = (d.incoming.length ? `<h2 class="fh">${t().incoming}</h2><ul class="flist">${d.incoming.map(u => row(u, `<button class="btn btn--sm" data-acc="${esc(u.username)}">${t().accept}</button><button class="btn btn--sm btn--ghost" data-rm="${esc(u.username)}">${t().decline}</button>`)).join('')}</ul>` : `<div class="empty">${t().noReq}</div>`)
        + (d.outgoing.length ? `<h2 class="fh">${t().outgoing}</h2><ul class="flist">${d.outgoing.map(u => row(u, `<button class="btn btn--sm btn--ghost" data-rm="${esc(u.username)}">${t().cancel}</button>`)).join('')}</ul>` : '');
    } else {
      body.innerHTML = `<label class="fsearch"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="fQ" type="search" placeholder="${t().findPh}" autocomplete="off" autocapitalize="none" spellcheck="false"></label><div id="fRes"><p class="muted fsmall">${t().findHint}</p></div>`;
      let timer;
      const run = async () => {
        const qv = $('#fQ').value.trim();
        if (qv.length < 2) { $('#fRes').innerHTML = `<p class="muted fsmall">${t().findHint}</p>`; return; }
        let r; try { r = await X.api(`/api/friends/search?q=${encodeURIComponent(qv)}`); } catch { return; }
        if ($('#fQ')?.value.trim() !== qv) return;
        $('#fRes').innerHTML = r.users.length ? `<ul class="flist">${r.users.map(u => row(u, u.relation === 'friend' ? `<span class="tag tag--ok">${t().isFriend}</span>`
          : u.relation === 'outgoing' ? `<span class="tag">${t().sent}</span>` : u.relation === 'incoming' ? `<button class="btn btn--sm" data-acc="${esc(u.username)}">${t().accept}</button>`
            : `<button class="btn btn--sm" data-add="${esc(u.username)}">${t().add}</button>`)).join('')}</ul>` : `<div class="empty">${t().notFound}</div>`;
      };
      $('#fQ').oninput = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
      $('#fQ').focus();
      body.addEventListener('click', async e => {
        const b = e.target.closest('[data-add]'); if (!b) return;
        b.disabled = true;
        try { await post('/api/friends/request', { username: b.dataset.add }); b.outerHTML = `<span class="tag">${t().sent}</span>`; } catch (x) { X.toast(X.L().err[x.code] || X.L().err.server); b.disabled = false; }
      });
    }
    body.addEventListener('click', async e => {
      const go = e.target.closest('[data-go]'); if (go) { tab = go.dataset.go; return view(); }
      const acc = e.target.closest('[data-acc]');
      if (acc) { acc.disabled = true; await post('/api/friends/accept', { username: acc.dataset.acc }).catch(() => {}); refreshBadge(); return view(); }
      const rm = e.target.closest('[data-rm]');
      if (rm) {
        if (rm.dataset.nm && !confirm(t().removeAsk(rm.dataset.nm))) return;
        await X.api(`/api/friends/${encodeURIComponent(rm.dataset.rm)}`, { method: 'DELETE' }).catch(() => {}); refreshBadge(); return view();
      }
      const du = e.target.closest('[data-duel]');
      if (du) { try { sessionStorage.setItem('ba_invite', du.dataset.duel); } catch {} X.go('/play?mode=duel'); }
    });
  }

  // ---------- приглашение в лобби ----------
  async function lobbyBox(el, room) {
    if (!el) return;
    // Позвали из списка друзей: отправляем приглашение сразу, как только комната готова.
    let pending = null; try { pending = sessionStorage.getItem('ba_invite'); sessionStorage.removeItem('ba_invite'); } catch {}
    if (pending) invite(room.code, pending);
    let d; try { d = await X.api('/api/friends'); } catch { return; }
    const inRoom = new Set(room.players.map(p => p.username));
    const list = d.friends.filter(f => f.online && !inRoom.has(f.username));
    el.innerHTML = `<div class="finv"><div class="finv__head"><b>${t().inviteTitle}</b><a href="/friends" data-link class="fsmall">${t().friendsLink}</a></div>
      ${list.length ? `<ul class="flist flist--sm">${list.map(u => `<li class="frow"><span class="frow__who">${ACC.avatar(u, 'sm')}<span class="frow__dot on"></span><span class="frow__txt"><b>${esc(u.name)}</b><small>@${esc(u.username)}</small></span></span>
        <div class="frow__act"><button class="btn btn--sm" data-inv="${esc(u.username)}">${t().inviteBtn}</button></div></li>`).join('')}</ul>` : `<p class="muted fsmall">${t().inviteNone}</p>`}</div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-inv]'); if (!b) return;
      invite(room.code, b.dataset.inv, () => { b.disabled = true; b.textContent = '✓'; });
    };
  }
  function invite(code, username, done) {
    X.socket.emit('invite_friend', { code, username }, r => {
      if (r?.ok) { X.toast(t().invited); done?.(); } else X.toast(r?.error === 'offline' ? t().offlineErr : X.L().err.server);
    });
  }

  // ---------- всплывающее приглашение ----------
  function showInvite(d) {
    document.querySelector('.invpop')?.remove();
    const box = document.createElement('div');
    box.className = 'invpop'; box.setAttribute('role', 'alertdialog');
    const kind = d.mode === 'class' ? t().invClass : t().invDuel;
    const topic = X.pick(d.topic) || '';
    box.innerHTML = `<div class="invpop__top">${ACC.avatar(d.from, 'md')}<div><span class="invpop__k">${t().invTitle}</span><b>${esc(d.from.name)}</b><small>@${esc(d.from.username)} · ${esc(kind)}${topic ? ' · ' + esc(topic) : ''}</small></div></div>
      <div class="invpop__act"><button class="btn btn--ghost btn--sm" data-no>${t().invDecline}</button><button class="btn btn--sm" data-yes>${t().invAccept}</button></div>`;
    document.body.appendChild(box);
    const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 200); };
    const timer = setTimeout(() => { if (box.isConnected) close(); }, 45000);
    box.onclick = e => {
      if (e.target.closest('[data-yes]')) { clearTimeout(timer); close(); X.joinRoom(d.code); }
      if (e.target.closest('[data-no]')) { clearTimeout(timer); close(); X.socket.emit('invite_decline', { code: d.code }); }
    };
  }

  // ---------- кнопка на странице игрока ----------
  async function userButton(el, username) {
    if (!el) return;
    let r; try { r = await X.api(`/api/friends/status/${encodeURIComponent(username)}`); } catch { return; }
    const draw = rel => {
      el.innerHTML = rel === 'friend' ? `<span class="tag tag--ok">${t().isFriend}</span>` : rel === 'outgoing' ? `<span class="tag">${t().sent}</span>`
        : rel === 'incoming' ? `<button class="btn btn--ghost" data-acc>${t().accept}</button>` : `<button class="btn btn--ghost" data-add>${t().addFriend}</button>`;
    };
    draw(r.relation);
    el.onclick = async e => {
      if (e.target.closest('[data-add]')) { const x = await post('/api/friends/request', { username }).catch(() => null); if (x) draw(x.status); }
      if (e.target.closest('[data-acc]')) { await post('/api/friends/accept', { username }).catch(() => {}); draw('friend'); refreshBadge(); }
    };
  }

  return {
    init(ctx) {
      X = ctx;
      X.socket.on('battle_invite', showInvite);
      X.socket.on('invite_declined', ({ name }) => X.toast(t().declined(name)));
      X.socket.on('friends_changed', d => {
        refreshBadge();
        if (d.type === 'request') X.toast(t().reqToast(d.from.name));
        if (d.type === 'accepted') X.toast(t().accToast(d.from.name));
        if (location.pathname === '/friends') view();
      });
    },
    view: () => view(),
    lobbyBox: (el, room) => lobbyBox(el, room),
    userButton: (el, u) => userButton(el, u),
    refreshBadge
  };
})();
