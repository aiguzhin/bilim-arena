(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LETTERS = ['A', 'B', 'C', 'D'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ---------- сессия ----------
  const getToken = () => { try { return localStorage.getItem('ba_token') || ''; } catch { return ''; } };
  const setToken = t => { try { t ? localStorage.setItem('ba_token', t) : localStorage.removeItem('ba_token'); } catch {} };
  // Несколько аккаунтов на одном устройстве: токены хранятся списком, активный — в ba_token.
  const getAccounts = () => { try { return JSON.parse(localStorage.getItem('ba_accounts') || '[]'); } catch { return []; } };
  const setAccounts = list => { try { localStorage.setItem('ba_accounts', JSON.stringify(list)); } catch {} };
  const rememberAccount = (token, u) => {
    if (!token || !u) return;
    const list = getAccounts().filter(a => a.token !== token && a.id !== u.id);
    list.unshift({ token, id: u.id, username: u.username, name: u.name, avatar: u.avatar || null, photo: u.photo || null, rating: u.rating });
    setAccounts(list.slice(0, 6));
  };
  const forgetAccount = token => setAccounts(getAccounts().filter(a => a.token !== token));
  const socket = io({ autoConnect: false, transports: ['websocket', 'polling'], auth: cb => cb({ token: getToken() }) });
  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const data = await r.json().catch(() => ({ error: 'server' }));
    if (r.status === 401 && path !== '/api/login') { signOut(); throw Object.assign(new Error('auth'), { code: 'auth' }); }
    if (!r.ok) throw Object.assign(new Error(data.error || 'server'), { code: data.error || 'server' });
    return data;
  }

  // ---------- язык ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };
  let lang = store.get('ba_lang') || (/^kk/i.test(navigator.language) ? 'kk' : 'ru');
  let L = I18N[lang];
  const pick = obj => (obj && typeof obj === 'object' ? obj[lang] ?? obj.ru : obj);
  const LANGN = { kk: 'Қазақша', ru: 'Русский', en: 'English' };
  // Язык вопросов баттла: если хост выбрал язык, все видят задания на нём.
  const qp = o => (room?.lang && o && typeof o === 'object' ? (o[room.lang] ?? o.ru) : pick(o));
  const cityName = c => (lang === 'kk' ? (CITIES.find(x => x[0] === c)?.[1] || (c === 'Другой город' ? L.otherCity : c)) : c);

  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = L[el.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = L[el.dataset.i18nPh]; });
    const seg = $('#langSeg'); seg.dataset.active = lang;
    seg.querySelectorAll('[data-lang]').forEach(b => { const on = b.dataset.lang === lang; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    const sel = $('#citySelect'), cur = sel.value;
    sel.innerHTML = `<option value="">${L.fCityPick}</option>` + CITIES.map(([ru, kk]) => `<option value="${ru}">${lang === 'kk' ? kk : ru}</option>`).join('') + `<option value="Другой город">${L.otherCity}</option>`;
    sel.value = cur;
    renderChip();
  }

  let meta = { subjects: {}, mandatory: [], combos: {}, count: 0 };
  let me = null, room = null, current = null, picked = null, tick = null, lastEnd = null, lastReveal = null;
  let cleanup = [];

  const setLang = next => {
    if (next === lang) return;
    lang = next; L = I18N[lang]; store.set('ba_lang', lang);
    applyStatic();
    if (room && room.state === 'playing' && current) viewQuestion(true);
    else if (room && room.state === 'lobby') viewLobby();
    else if (room && room.state === 'done' && lastEnd) viewResult(lastEnd);
    else if (!room) route();
  };
  $('#langSeg').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
  $('#langSeg').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); setLang(lang === 'ru' ? 'kk' : 'ru'); $(`#langSeg [data-lang="${lang}"]`).focus();
  });

  const topicName = t => {
    if (!t) return '';
    if (t.startsWith('combo:')) { const [a, b] = meta.combos[t.slice(6)] || []; return a ? `${pick(meta.subjects[a])} — ${pick(meta.subjects[b])}` : ''; }
    return pick(meta.subjects[t]);
  };

  // ---------- профиль ----------
  function renderChip() {
    const chip = $('#profileChip');
    document.body.classList.toggle('guest', !me);
    if (!me) { chip.hidden = true; return; }
    chip.hidden = false;
    chip.innerHTML = ACC.avatar(me, 'sm');
    chip.title = `${me.name} · ${L.meTitle}`;
    chip.setAttribute('aria-label', chip.title);
    rememberAccount(getToken(), me);
  }

  function signIn(token, user) {
    setToken(token); me = user; useSettings(user.settings); renderChip();
    socket.connect();
  }
  function signOut() {
    forgetAccount(getToken());
    const next = getAccounts()[0];
    setToken(next ? next.token : ''); me = null; room = null; current = null; lastEnd = null;
    socket.disconnect(); renderChip();
    if (next) { history.replaceState({}, '', '/me'); }
    route();
  }
  function switchTo(token) {
    leaveRoom();
    setToken(token); me = null;
    socket.disconnect(); renderChip();
    go('/me');
  }

  function openProfile() {
    return new Promise(resolve => {
      const dlg = $('#profileDlg'), form = $('#profileForm'), err = $('#profileError'), f = form.elements;
      attachSchoolSuggest(f.school, f.city);
      f.name.value = me.name; f.school.value = schoolName(me.school); f.city.value = me.city;
      err.textContent = '';
      $('#profileCancel').onclick = () => { dlg.close(); resolve(null); };
      form.onsubmit = async e => {
        e.preventDefault();
        try {
          const r = await api('/api/me', { method: 'PATCH', body: { name: f.name.value, school: f.school.value, city: f.city.value } });
          me = { ...me, ...r.user }; renderChip(); socket.emit('profile_updated');
          dlg.close(); resolve(me);
        } catch (x) { err.textContent = L.err[x.code] || L.err.server; }
      };
      dlg.showModal();
    });
  }

  $('#profileChip').onclick = () => go('/me');

  socket.on('connect', () => {
    if (room && room.code && room.state !== 'done') socket.emit('join', { code: room.code }, () => {});
  });
  socket.on('connect_error', e => { if (e.message === 'auth') signOut(); });

  // ---------- утилиты ----------
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
  function go(path) { history.pushState({}, '', path); route(); }
  function reset() { closeMenu?.(); cleanup.forEach(f => f()); cleanup = []; clearInterval(tick); tick = null; }
  function setTitle(t) { document.title = t ? `${t} — Bilim Arena` : L.titleDefault; }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (room && room.state !== 'done' && room.state !== 'lobby' && !confirm(L.leaveConfirm)) return;
    leaveRoom();
    go(a.getAttribute('href'));
  });
  window.addEventListener('popstate', () => { leaveRoom(); route(); });

  function leaveRoom() { if (room) socket.emit('leave', { code: room.code }); room = null; current = null; lastEnd = null; }

  // ---------- маршруты ----------
  async function route() {
    reset();
    const path = location.pathname;
    const tab = path === '/' ? 'home' : path.startsWith('/ent') ? 'ent' : path === '/play' || path.startsWith('/b/') ? 'play' : path.startsWith('/tournaments') || path.startsWith('/t/') ? 'tours' : path === '/rating' ? 'rating' : '';
    document.querySelectorAll('#tabbar [data-tab]').forEach(a => a.toggleAttribute('aria-current', a.dataset.tab === tab));
    window.scrollTo(0, 0);
    app.classList.remove('fx-page'); void app.offsetWidth; app.classList.add('fx-page');
    if (!meta.count) meta = await fetch('/api/subjects').then(r => r.json()).catch(() => meta);
    if (!me && getToken()) {
      try { const r = await api('/api/me'); me = r.user; useSettings(me.settings); renderChip(); socket.connect(); SOC.refreshBadge(); CHAT.refreshBadge(); } catch {}
    }
    if (path === '/privacy') return viewPrivacy();
    if (path === '/login') return viewAuth(true);
    if (path === '/unis' || path.startsWith('/unis/')) return UNI.view(path);
    if (path.startsWith('/parent/')) return PLAN.view(path);
    if (path === '/about') return viewAbout();
    if (!me) return viewAuth();
    if (me.needsProfile) return viewRequired();
    if (path === '/friends') return SOC.view();
    if (path === '/games') return GAMES.view(path);
    if (path === '/plan') return PLAN.view(path);
    if (path === '/chat' || path.startsWith('/chat/')) return CHAT.view(path);
    const m = path.match(/^\/b\/([A-Z0-9]{5})$/i);
    if (m) return joinFlow(m[1].toUpperCase());
    if (path === '/play') return viewSetup();
    if (path === '/rating' || path === '/tournaments' || path.startsWith('/t/') || path === '/practice' || path === '/teacher' || path.startsWith('/teacher/') || path.startsWith('/join/')) return EDU.view(eduCtx, path);
    if (path === '/me' || path.startsWith('/me/') || path === '/settings' || path.startsWith('/settings/') || path.startsWith('/u/')) return ACC.view(accCtx, path);
    if (path === '/about') return viewAbout();
    if (path === '/ent/register' || path.startsWith('/ent/s/')) return SES.view(path);
    if (path === '/ent' || path.startsWith('/ent/')) return ENT.view(entCtx, path);
    viewHome();
  }

  // Настройки аккаунта: тема и оформление сразу, язык — без лишней перерисовки.
  function useSettings(st) {
    if (!st) return;
    ACC.applySettings(st);
    if (st.lang && st.lang !== lang) { lang = st.lang; L = I18N[lang]; store.set('ba_lang', lang); applyStatic(); }
  }
  const accCtx = {
    app, api, esc, pick: o => pick(o), L: () => L, lang: () => lang, setLang: v => setLang(v), meta: () => meta, go, setTitle, toast, footer,
    cityName: c => cityName(c), topicName: t => topicName(t), route: () => route(),
    me: () => me, setMe: u => { me = { ...me, ...u }; renderChip(); },
    accounts: () => getAccounts(), currentToken: () => getToken(), switchTo: t => switchTo(t),
    profileUpdated: () => socket.emit('profile_updated'),
    attachSchoolSuggest: (i, c) => attachSchoolSuggest(i, c), googleButton: (el, cb) => googleButton(el, cb),
    logout: async () => { try { await api('/api/logout', { method: 'POST' }); } catch {} signOut(); },
    forget: () => signOut()
  };
  const closeMenu = ACC.init(accCtx);
  const entCtx = {
    chooseLang, LANGN, cityName: c => cityName(c),
    app, api, esc, pick: o => pick(o), L: () => L, lang: () => lang, meta: () => meta, go, setTitle, toast, footer,
    onCleanup: f => cleanup.push(f)
  };
  const eduCtx = {
    ...entCtx, token: () => getToken(), cityName: c => cityName(c), topicName: t => topicName(t),
    me: () => me, setMe: u => { me = { ...me, ...u }; renderChip(); }
  };
  accCtx.edu = eduCtx;
  const socCtx = { ...eduCtx, socket, joinRoom: code => { if (room) leaveRoom(); reset(); joinFlow(code, true); } };
  SOC.init(socCtx);
  CHAT.init(socCtx);
  SES.init(eduCtx);
  UNI.init(eduCtx);
  GAMES.init(eduCtx);
  PLAN.init(eduCtx);

  // ---------- главная ----------
  // Полоса «Сегодня»: серия дней, норма на сегодня и цель — см. plan.js.
  const homeToday = () => { const box = document.getElementById('homeToday'); if (box) PLAN.home(box); };

  function viewHome() {
    setTitle();
    app.innerHTML = `
    <section class="hero">
      <div class="wrap hero__grid">
        <div>
          <h1>${L.heroTitle}</h1>
          <p class="hero__lead">${L.heroLead}</p>
          <div class="hero__cta">
            <a href="/ent" data-link class="btn">${L.navEnt}</a>
            <a href="/play" data-link class="btn btn--ghost">${L.heroDuel}</a>
          </div>
        </div>
        <div class="board board--live" id="liveBoard" aria-live="polite"><div class="board__head"><span class="board__live"><i></i>…</span></div><div class="board__empty"></div></div>
      </div>
    </section>

    <section class="today" id="homeToday" hidden></section>
    <section class="block block--daily" id="homeDaily" hidden></section>
    <section class="block block--tour" id="homeTour" hidden></section>

    <section class="block">
      <div class="wrap">
        <div class="block__head"><h2>${lang === 'kk' ? 'Дайындық құралдары' : 'Всё для подготовки'}</h2></div>
        <div class="tools">${homeTools().map(([href, ico, h, p]) => `<a class="tool" href="${href}" data-link><i>${toolIcon(ico)}</i><b>${h}</b><span>${p}</span></a>`).join('')}</div>
      </div>
    </section>

    <section class="block block--field">
      <div class="wrap">
        <div class="block__head"><h2>${L.topSchools}</h2><a href="/rating" data-link class="btn btn--ghost btn--sm">${L.allRating}</a></div>
        <div id="topSchools"></div>
      </div>
    </section>

    ${footer()}`;
    if (me) { homeToday(); dailyQ(); }

    loadTop();
    EDU.homeBlock(eduCtx, $('#homeTour'));
    liveBoard();
  }

  const TOOL_ICONS = {
    ent: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    practice: '<path d="M4 19V5M4 19h16"/><path d="M8 15l3-4 3 2 5-6"/>',
    duel: '<path d="M5 19 19 5M14 5h5v5M5 5l5 5M14 14l5 5M5 19l3-3"/>',
    class: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 14c3 0 6 1.5 6 4.5"/>',
    games: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    tour: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a3 3 0 0 0 4 3M16 6h4v2a3 3 0 0 1-4 3M12 13v4M8 21h8M10 17h4v4h-4z"/>',
    unis: '<path d="M3 9 12 4l9 5-9 5z"/><path d="M7 11v5c3 2 7 2 10 0v-5M21 9v6"/>',
    rating: '<path d="M6 20V10M12 20V4M18 20v-7"/>'
  };
  const toolIcon = k => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TOOL_ICONS[k]}</svg>`;
  const homeTools = () => lang === 'kk' ? [
    ['/ent', 'ent', 'Сынақ ҰБТ', 'Нақты емтихан форматы'], ['/practice', 'practice', 'Жаттығу', 'Қатемен жұмыс және әлсіз тақырыптар'],
    ['/play?mode=duel', 'duel', 'Досыңмен баттл', 'Сілтеме арқылы бірге-бір'], (me?.role === 'teacher' ? ['/teacher', 'class', 'Мұғалім кабинеті', 'Сыныптар мен жарыстар'] : ['/me/class', 'class', 'Менің сыныбым', 'Сыныптастар мен мұғалім жарыстары']),
    ['/games', 'games', 'Мини-ойындар', 'Блиц, Аман қалу, Дұрыс па'], ['/tournaments', 'tour', 'Турнирлер', 'Мектептер мен сыныптар үшін'],
    ['/unis', 'unis', 'ЖОО және грант', 'Шекті және өту балдары'], ['/rating', 'rating', 'Рейтинг', 'Мектептер мен оқушылар']
  ] : [
    ['/ent', 'ent', 'Пробный ЕНТ', 'Как на настоящем экзамене'], ['/practice', 'practice', 'Тренировка', 'Работа над ошибками и слабые темы'],
    ['/play?mode=duel', 'duel', 'Баттл с другом', 'Один на один по ссылке'], (me?.role === 'teacher' ? ['/teacher', 'class', 'Кабинет учителя', 'Классы и соревнования'] : ['/me/class', 'class', 'Мой класс', 'Одноклассники и соревнования учителя']),
    ['/games', 'games', 'Мини-игры', 'Блиц, Выживание, Верно или нет'], ['/tournaments', 'tour', 'Турниры', 'Для школ и классов'],
    ['/unis', 'unis', 'Вузы и гранты', 'Пороговые и проходные баллы'], ['/rating', 'rating', 'Рейтинг', 'Школы и ученики']
  ];

  // Вопрос дня: один вопрос для всех, после ответа видно, сколько людей ответили верно.
  async function dailyQ() {
    const box = document.getElementById('homeDaily'); if (!box) return;
    const T = lang === 'kk'
      ? { h: 'Күн сұрағы', stat: (p, n) => `${n} адамның ${p}% дұрыс жауап берді`, first: 'Сіз бірінші жауап бердіңіз', ok: 'Дұрыс!', no: 'Қате', ans: 'Дұрыс жауап', next: 'Жаңа сұрақ ертең' }
      : { h: 'Вопрос дня', stat: (p, n) => `Верно ответили ${p}% из ${n}`, first: 'Вы ответили первым', ok: 'Верно!', no: 'Неверно', ans: 'Правильный ответ', next: 'Новый вопрос завтра' };
    let d; try { d = await api('/api/daily?lang=' + lang); } catch { return; }
    if (!document.body.contains(box) || !d.q) return;
    const statLine = st => st.n > 1 ? T.stat(Math.round(st.ok * 100 / st.n), st.n) : T.first;
    const render = () => {
      const r = d.mine;
      box.innerHTML = `<div class="wrap"><div class="daily">
        <div class="daily__head"><span>${T.h} · ${esc(d.subject)}</span>${r ? `<span>${statLine(d.stat)}</span>` : ''}</div>
        <p class="daily__q">${esc(d.q.t).replace(/\n/g, '<br>')}</p>${d.q.img ? `<div class="qfig">${d.q.img}</div>` : ''}
        <div class="daily__opts">${d.q.o.map((o, i) => `<button class="g-opt${r ? (i === r.a ? ' ok' : i === r.choice ? ' no' : '') : ''}" data-i="${i}" ${r ? 'disabled' : ''}><span>${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}</div>
        ${r ? `<p class="daily__res ${r.ok ? 'ok' : 'no'}"><b>${r.ok ? T.ok : T.no}</b>${r.e ? ` ${esc(r.e)}` : ''} <span class="muted">${T.next}</span></p>` : ''}
      </div></div>`;
      box.querySelectorAll('[data-i]:not([disabled])').forEach(b => b.onclick = async () => {
        box.querySelectorAll('[data-i]').forEach(x => x.disabled = true);
        try { const res = await api('/api/daily', { method: 'POST', body: { choice: +b.dataset.i, lang } }); d.mine = res.mine; d.stat = res.stat; } catch {}
        render();
      });
    };
    render(); box.hidden = false;
  }

  function footer() {
    return `<footer class="foot"><div class="wrap foot__in"><span>© ${new Date().getFullYear()} Bilim Arena · <a href="/about" data-link>${L.navAbout}</a> · <a href="/privacy" data-link>${L.privTitle}</a></span></div></footer>`;
  }

  async function loadTop() {
    const box = $('#topSchools');
    try {
      const d = await fetch('/api/leaders').then(r => r.json());
      if (!d.schools?.length) { box.innerHTML = `<div class="empty">${L.topEmpty}<br><a href="/play" data-link class="btn">${L.playFirst}</a></div>`; return; }
      box.innerHTML = schoolTable(d.schools.slice(0, 5));
    } catch { box.innerHTML = `<div class="empty">${L.loadFail}</div>`; }
  }

  // Настоящие баттлы на главной: что идёт прямо сейчас, иначе — последние сыгранные.
  function liveBoard() {
    const T = lang === 'kk'
      ? { now: 'Қазір жүріп жатыр', last: 'Соңғы баттлдар', arena: 'Арена', q: (i, n) => `${n}-ден ${i}-сұрақ`, more: n => `Тағы ${n} баттл жүріп жатыр`, ago: m => m < 1 ? 'жаңа ғана' : m < 60 ? `${m} мин бұрын` : m < 1440 ? `${Math.round(m / 60)} сағ бұрын` : `${Math.round(m / 1440)} күн бұрын`, none: 'Қазір ешкім ойнап жатқан жоқ. Бірінші баттлды бастаңыз — қарсылас сілтеме арқылы қосылады.', play: 'Ойнау', online: n => `Сайтта қазір: ${n}`, teamA: 'А командасы', teamB: 'Б командасы', win: 'жеңіс' }
      : { now: 'Идёт сейчас', last: 'Последние баттлы', arena: 'Арена', q: (i, n) => `Вопрос ${i} из ${n}`, more: n => `Ещё ${n} баттл(а) идут`, ago: m => m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : m < 1440 ? `${Math.round(m / 60)} ч назад` : `${Math.round(m / 1440)} дн. назад`, none: 'Сейчас никто не играет. Начните первый баттл — соперник подключится по ссылке.', play: 'Играть', online: n => `Сейчас на сайте: ${n}`, teamA: 'Команда А', teamB: 'Команда Б', win: 'победа' };
    let alive = true, prev = '';
    cleanup.push(() => { alive = false; });
    const side = (p, r) => p ? `<div class="side${r ? ' side--r' : ''}"><div class="side__who">${ACC.avatar(p, 'sm')}<div><div class="side__name">${esc(p.name)}</div><div class="side__school">${esc([schoolName(p.school), cityName(p.city)].filter(Boolean).join(', '))}</div></div></div></div>` : '<div class="side"></div>';
    const duel = (g, final) => {
      if (g.mode === 'class' && g.teams) return `<div class="board__score"><div class="side"><div class="side__name">${T.teamA}</div><div class="side__school">${g.teams.A.players}</div></div><div class="score"><span>${g.teams.A.avg}</span><span>:</span><span>${g.teams.B.avg}</span></div><div class="side side--r"><div class="side__name">${T.teamB}</div><div class="side__school">${g.teams.B.players}</div></div></div>`;
      const [a, b] = g.players;
      return `<div class="board__score">${side(a)}<div class="score${final ? ' score--final' : ''}"><span>${a?.score ?? 0}</span><span>:</span><span>${b?.score ?? 0}</span></div>${side(b, true)}</div>`;
    };
    const subj = g => esc(g.subject ? pick(g.subject) : '');
    const draw = d => {
      const box = $('#liveBoard'); if (!box) return;
      let html;
      if (d.live.length) {
        const g = d.live[0];
        html = `<div class="board__head"><span class="board__live"><i></i>${T.now}</span><span>${subj(g)}</span></div>${duel(g)}
          <div class="board__q"><div class="board__meta"><span>${T.q(Math.min(g.i + 1, g.total), g.total)}</span><span>${g.players.length > 2 ? `+${g.players.length - 2}` : ''}</span></div>
          <div class="board__steps">${Array.from({ length: g.total }, (_, k) => `<i class="${k < g.i ? 'done' : k === g.i ? 'cur' : ''}"></i>`).join('')}</div>
          ${d.live.length > 1 ? `<p class="board__more">${T.more(d.live.length - 1)}</p>` : ''}</div>`;
      } else if (d.recent.length) {
        const g = d.recent[0], ago = T.ago(Math.round((Date.now() - new Date(g.at)) / 60000));
        html = `<div class="board__head"><span class="board__live board__live--off"><i></i>${T.last}</span><span>${ago}</span></div>${duel(g, true)}
          <div class="board__q board__q--list">${d.recent.slice(1, 4).map(r => `<div class="board__row"><span>${esc(r.players[0]?.name || '')}</span><b class="num">${r.players[0]?.score ?? 0} : ${r.players[1]?.score ?? 0}</b><span>${esc(r.players[1]?.name || '')}</span></div>`).join('') || `<p class="board__more">${subj(g)}</p>`}</div>`;
      } else {
        html = `<div class="board__head"><span class="board__live board__live--off"><i></i>${T.arena}</span><span>${T.online(d.online)}</span></div><div class="board__empty"><p>${T.none}</p><a href="/play" data-link class="btn btn--light">${T.play}</a></div>`;
      }
      if (html !== prev) { box.innerHTML = html; prev = html; }
    };
    const load = async () => {
      if (!alive) return;
      if (!document.hidden) { try { draw(await fetch('/api/arena/live').then(r => r.json())); } catch {} }
      setTimeout(load, 4000);
    };
    load();
  }

  // ---------- выбор языка сдачи ----------
  function chooseLang() {
    return new Promise(resolve => {
      const dlg = document.createElement('dialog');
      dlg.className = 'dlg';
      const last = store.get('ba_qlang') || lang;
      dlg.innerHTML = `<form method="dialog" class="dlg__body">
        <h2>${L.qlangTitle}</h2><p class="muted">${L.qlangHint}</p>
        <div class="qlang">${['kk', 'ru'].map(l => `<button type="button" class="qlang__opt" data-l="${l}" ${l === last ? 'autofocus' : ''}>
          <b>${LANGN[l]}</b><span>${L.qlangSub[l]}</span></button>`).join('')}</div>
        <div class="dlg__actions"><button class="btn btn--ghost" value="cancel">${L.cancel}</button></div>
      </form>`;
      document.body.appendChild(dlg);
      let chosen = null;
      dlg.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { chosen = b.dataset.l; store.set('ba_qlang', chosen); dlg.close(); });
      dlg.addEventListener('close', () => { dlg.remove(); resolve(chosen); });
      dlg.showModal();
    });
  }

  // ---------- выбор режима ----------
  function viewSetup() {
    setTitle(L.setupTitle);
    const params = new URLSearchParams(location.search);
    const mode = ['duel', 'class', 'solo'].includes(params.get('mode')) ? params.get('mode') : 'duel';
    const qTopic = params.get('topic');
    const saved = (qTopic && (meta.subjects[qTopic] || qTopic.startsWith('combo:')) ? qTopic : null) || store.get('ba_topic') || 'combo:math-physics';
    const isCombo = saved.startsWith('combo:');
    const comboKeys = Object.keys(meta.combos);
    const profileSubs = Object.keys(meta.subjects).filter(k => !meta.mandatory.includes(k));
    const qsize = [2, 4, 5, 10].includes(+store.get('ba_qsize')) ? +store.get('ba_qsize') : 2;
    const radio = (k, label) => `<label><input type="radio" name="topic" value="${k}" ${k === saved ? 'checked' : ''}><span>${esc(label)}</span></label>`;

    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <h1>${L.setupTitle}</h1>
      <p class="page__lead">${L.setupLead}</p>
      <form class="choose" id="setup">
        <div>
          <div class="choose__label">${L.modeLabel}</div>
          <div class="seg">
            ${[['duel', L.modeDuel], ['class', L.modeClass], ['solo', L.modeSolo]].map(([v, [b, s]]) =>
              `<label><input type="radio" name="mode" value="${v}" ${v === mode ? 'checked' : ''}><div class="opt"><b>${b}</b><span>${s}</span></div></label>`).join('')}
          </div>
        </div>
        <div>
          <div class="choose__label">${L.whatLabel}</div>
          <div class="tabs-sm" role="tablist">
            <button type="button" role="tab" data-kind="combo" aria-selected="${isCombo}">${L.tabCombo}</button>
            <button type="button" role="tab" data-kind="section" aria-selected="${!isCombo}">${L.tabSection}</button>
          </div>
          <div id="comboPane" ${isCombo ? '' : 'hidden'}>
            <div class="combos">
              ${comboKeys.map(k => `<label><input type="radio" name="topic" value="combo:${k}" ${'combo:' + k === saved ? 'checked' : ''}><div class="opt">${esc(topicName('combo:' + k))}</div></label>`).join('')}
            </div>
            <p class="hint">${L.comboHint}</p>
          </div>
          <div id="sectionPane" ${isCombo ? 'hidden' : ''}>
            <div class="group"><p class="group-label">${L.groupMandatory}</p><div class="subjects">${meta.mandatory.map(k => radio(k, pick(meta.subjects[k]))).join('')}</div></div>
            <div class="group"><p class="group-label">${L.groupProfile}</p><div class="subjects">${profileSubs.map(k => radio(k, pick(meta.subjects[k]))).join('')}</div></div>
          </div>
        </div>
        <p class="form-error" id="setupError" role="alert"></p>
        <div id="sizeBox">
          <div class="choose__label">${L.sizeLabel}</div>
          <div class="sizes" role="radiogroup">${[2, 4, 5, 10].map(n => `<label><input type="radio" name="size" value="${n}" ${n === qsize ? 'checked' : ''}><span><b>${n === 2 ? '1 × 1' : n}</b><small>${n === 2 ? L.sizeDuel : L.sizePlayers}</small></span></label>`).join('')}</div>
          <p class="hint">${L.sizeHint}</p>
        </div>
        <div class="choose__actions">
          <button class="btn btn--ghost" id="createBtn"></button>
          <button class="btn" type="button" id="quickBtn"></button>
        </div>
      </form>
      <div id="quickWait" hidden class="qwait">
        <div class="qwait__spin" aria-hidden="true"><span></span></div>
        <h2 id="qwTitle"></h2>
        <p class="muted" id="qwText"></p>
        <div class="qwait__slots" id="qwSlots"></div>
        <p class="hint" id="qwNote"></p>
        <button class="btn btn--ghost btn--block" id="quickCancel">${L.quickCancel}</button>
      </div>
    </div></div>`;

    const form = $('#setup');
    const paneSel = combo => (combo ? '#comboPane' : '#sectionPane');
    if (!form.querySelector('input[name=topic]:checked')) $(`${paneSel(isCombo)} input[name=topic]`).checked = true;
    const topic = () => form.querySelector('input[name=topic]:checked')?.value;

    app.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => {
      const combo = b.dataset.kind === 'combo';
      app.querySelectorAll('[data-kind]').forEach(x => x.setAttribute('aria-selected', x === b));
      $('#comboPane').hidden = !combo; $('#sectionPane').hidden = combo;
      ($(`${paneSel(combo)} input[data-last]`) || $(`${paneSel(combo)} input`)).checked = true;
    });
    form.addEventListener('change', e => {
      if (e.target.name === 'topic') { e.target.closest('#comboPane, #sectionPane').querySelectorAll('input').forEach(i => i.removeAttribute('data-last')); e.target.setAttribute('data-last', ''); }
    });
    const checked = form.querySelector('input[name=topic]:checked'); if (checked) checked.setAttribute('data-last', '');

    const sync = () => {
      const duel = form.mode.value === 'duel';
      $('#quickBtn').hidden = !duel; $('#sizeBox').hidden = !duel;
      $('#quickBtn').textContent = +form.size.value === 2 ? L.quickBtn : L.quickBtnN(+form.size.value);
      $('#createBtn').textContent = form.mode.value === 'solo' ? L.startSoloBtn : duel ? L.createLink : L.createBtn;
      $('#createBtn').className = duel ? 'btn btn--ghost' : 'btn';
    };
    form.addEventListener('change', sync); sync();

    form.onsubmit = async e => {
      e.preventDefault();
      const t = topic(); store.set('ba_topic', t);
      const ql = await chooseLang(); if (!ql) return;
      socket.emit('create', { mode: form.mode.value, subject: t, lang: ql }, r => {
        if (r?.error) { $('#setupError').textContent = L.err[r.error] || r.error; return; }
        history.replaceState({}, '', `/b/${r.code}`);
      });
    };

    let qInfo = null;
    const drawWait = d => {
      qInfo = { ...qInfo, ...d };
      const { n = 1, size = 2, startsIn = null, players = [] } = qInfo;
      const list = players.length ? players : [me];
      $('#qwTitle').textContent = size === 2 ? L.qwTitle1 : L.qwTitleN(n, size);
      $('#qwSlots').innerHTML = Array.from({ length: size }, (_, i) => {
        const p = list[i];
        return p ? `<div class="qslot is-on">${ACC.avatar(p, 'md')}<b>${esc(p.name)}</b><small>@${esc(p.username)}</small>${p.username === me.username ? `<em>${L.you}</em>` : ''}</div>`
          : `<div class="qslot"><span class="qslot__empty" aria-hidden="true">?</span><b>${L.qwFree}</b><small>&nbsp;</small></div>`;
      }).join('');
      $('#qwNote').textContent = size === 2 ? L.qwNote1 : startsIn != null ? L.qwStartsIn(Math.ceil(startsIn / 1000)) : L.qwNoteN;
    };
    $('#quickBtn').onclick = async () => {
      const t = topic(); store.set('ba_topic', t);
      const size = +form.size.value; store.set('ba_qsize', size);
      const ql = await chooseLang(); if (!ql) return;
      $('#qwText').textContent = `${topicName(t)} · ${LANGN[ql]}`;
      qInfo = null;
      socket.emit('quick', { subject: t, lang: ql, size }, r => {
        if (r?.error) { $('#setupError').textContent = L.err[r.error] || r.error; return; }
        if (r.code) return joinFlow(r.code, true);
        form.hidden = true; $('#quickWait').hidden = false; drawWait(r); window.scrollTo(0, 0);
      });
    };
    const onQueue = d => { if (!$('#quickWait')?.hidden) drawWait(d); };
    socket.on('queue', onQueue);
    cleanup.push(() => socket.off('queue', onQueue));
    $('#quickCancel').onclick = () => { socket.emit('cancel_quick'); $('#quickWait').hidden = true; form.hidden = false; };
    const onMatch = ({ code }) => joinFlow(code, true);
    socket.on('matched', onMatch);
    cleanup.push(() => { socket.off('matched', onMatch); socket.emit('cancel_quick'); });
  }

  // ---------- вход в баттл ----------
  async function joinFlow(code, push) {
    if (push) history.pushState({}, '', `/b/${code}`);
    if (room?.code === code) return;
    app.innerHTML = `<div class="page"><div class="wrap narrow"><h1>${L.joinTitle}</h1><p class="page__lead">${L.joinLead}</p><div style="margin-top:24px"><button class="btn" id="joinBtn">${L.joinBtn}</button></div></div></div>`;
    const doJoin = () => {
      socket.emit('join', { code }, r => {
        if (r?.error) app.innerHTML = `<div class="page"><div class="wrap narrow"><h1>${L.joinFail}</h1><p class="page__lead">${esc(L.err[r.error] || r.error)}</p><div style="margin-top:24px"><a href="/play" data-link class="btn">${L.createOwn}</a></div></div></div>`;
      });
    };
    $('#joinBtn').onclick = doJoin;
    if (socket.connected) doJoin(); else socket.once('connect', doJoin);
  }

  // ---------- события баттла ----------
  socket.on('room', r => {
    const prev = room;
    room = r;
    if (location.pathname !== `/b/${r.code}`) history.replaceState({}, '', `/b/${r.code}`);
    if (r.state === 'lobby') viewLobby();
    else if (r.state === 'playing' && current) updateGameBar();
    else if (r.state === 'countdown' && prev?.state !== 'countdown') viewCountdown(3);
  });
  socket.on('countdown', ({ seconds }) => viewCountdown(seconds));
  socket.on('question', q => { current = q; picked = null; lastReveal = null; viewQuestion(); });
  socket.on('reveal', d => { if (d.room) room = d.room; lastReveal = d; showReveal(d); });
  socket.on('invite', ({ code, name }) => {
    const box = document.querySelector('.result__actions');
    if (!box || room?.state !== 'done') return;
    box.insertAdjacentHTML('beforebegin', `<div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px"><span>${esc(L.rematchCall(name))}</span><button class="btn btn--sm" id="acceptRematch">${L.accept}</button></div>`);
    $('#acceptRematch').onclick = () => { room = null; joinFlow(code, true); };
  });
  socket.on('end', d => { room = d.room; current = null; lastEnd = d; viewResult(d); });

  function viewLobby() {
    reset();
    const topic = pick(room.subjectName) + (room.lang ? ` · ${LANGN[room.lang]}` : '');
    const titleMode = room.mode === 'class' ? L.lobbyClass : room.mode === 'solo' ? L.lobbySolo : room.mode === 'arena' ? L.lobbyArena : L.lobbyDuel;
    setTitle(titleMode);
    const link = `${location.origin}/b/${room.code}`;
    const isHost = room.hostSid === socket.id;
    const msg = room.mode === 'class' ? L.shareClass(topic, link) : L.shareDuel(topic, link);
    const players = room.players;
    const playerLi = p => `<li><span class="who">${p.username ? ACC.avatar(p, 'sm') : ''}<span>${esc(p.name)}${p.sid === socket.id ? ` <span class="tag">${L.you}</span>` : ''}<br><span class="sub">${p.username ? '@' + esc(p.username) + ' · ' : ''}${esc(schoolName(p.school))}${p.city ? ', ' + esc(cityName(p.city)) : ''}</span></span></span>${p.sid === room.hostSid ? `<span class="tag">${L.host}</span>` : ''}</li>`;
    const mine = players.find(p => p.sid === socket.id);

    app.innerHTML = `
    <div class="page"><div class="wrap">
      <h1>${titleMode}: ${esc(topic)}</h1>
      <p class="page__lead">${room.mode === 'class' ? L.lobbyLeadClass : L.lobbyLeadDuel}</p>
      <div class="lobby">
        <div class="panel">
          <div class="muted" style="font-size:14px">${L.battleCode}</div>
          <div class="code">${room.code}</div>
          <div class="linkbox"><input readonly value="${esc(link)}" aria-label="${L.battleCode}" id="linkInput"><button class="btn btn--ghost" id="copyBtn">${L.copy}</button></div>
          <div class="share">
            <a class="btn btn--wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">${L.toWa}</a>
            <a class="btn btn--tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg.replace(': ' + link, ''))}">${L.toTg}</a>
            ${navigator.share ? `<button class="btn btn--ghost" id="shareBtn">${L.other}</button>` : ''}
          </div>
        </div>
        <div class="panel">
          ${room.mode === 'class' ? `
            <b>${L.participants(players.length)}</b>
            <div class="teams">
              ${['A', 'B'].map(t => `<div class="team team--${t}"><h3><span>${L.team(t === 'A' ? 1 : 2)}</span><span class="num">${players.filter(p => p.team === t).length}</span></h3>
                <ul class="plist">${players.filter(p => p.team === t).map(playerLi).join('') || `<li class="sub">${L.nobody}</li>`}</ul>
                ${mine && mine.team !== t ? `<button class="btn btn--ghost btn--sm btn--block" style="margin-top:10px" data-team="${t}">${L.moveHere}</button>` : ''}</div>`).join('')}
            </div>
            ${isHost ? `<button class="btn btn--block" style="margin-top:16px" id="startBtn">${L.startGame}</button><p class="form-error" id="startError"></p>` : `<div class="wait"><span class="dots"><i></i><i></i><i></i></span>${L.waitHost}</div>`}
          ` : `
            <b>${L.players}${room.expect ? ` <span class="num muted">${players.length} / ${room.expect}</span>` : ''}</b>
            <ul class="plist">${players.map(playerLi).join('')}</ul>
            ${room.mode === 'arena' ? `<div class="wait"><span class="dots"><i></i><i></i><i></i></span>${L.waitArena}</div>` : players.length < 2 ? `<div class="wait"><span class="dots"><i></i><i></i><i></i></span>${L.waitOpp}</div>` : ''}
          `}
        </div>
      </div>
      ${(room.mode === 'class' || (room.mode === 'duel' && players.length < 2)) ? '<div id="lobbyInvite" class="lobby__invite"></div>' : ''}
      <div class="lobby__leave"><button class="btn btn--ghost" id="leaveBtn">${L.leaveLobby}</button></div>
    </div></div>`;

    $('#leaveBtn').onclick = () => { leaveRoom(); go('/play'); };
    if ($('#lobbyInvite')) SOC.lobbyBox($('#lobbyInvite'), room);
    $('#copyBtn').onclick = async () => {
      try { await navigator.clipboard.writeText(link); } catch { $('#linkInput').select(); document.execCommand('copy'); }
      toast(L.copied);
    };
    $('#shareBtn')?.addEventListener('click', () => navigator.share({ title: 'Bilim Arena', text: msg.replace(': ' + link, ''), url: link }).catch(() => {}));
    app.querySelectorAll('[data-team]').forEach(b => b.onclick = () => socket.emit('team', { code: room.code, team: b.dataset.team }));
    $('#startBtn')?.addEventListener('click', () => socket.emit('start', { code: room.code }, r => { if (r?.error) $('#startError').textContent = L.err[r.error] || r.error; }));
  }

  function viewCountdown(n) {
    reset();
    setTitle(L.ready);
    app.innerHTML = `<div class="count"><div><p class="muted">${esc(pick(room?.subjectName))}</p><b class="num" id="cnt">${n}</b><p class="muted">${L.ready}</p></div></div>`;
    let k = n;
    tick = setInterval(() => { k--; const el = $('#cnt'); if (el && k > 0) el.textContent = k; if (k <= 0) clearInterval(tick); }, 1000);
  }

  function gameBarHTML() {
    if (!room) return '';
    const ps = room.players;
    if (room.mode === 'duel' && ps.length === 2) {
      const a = ps.find(p => p.sid === socket.id) || ps[0], b = ps.find(p => p !== a);
      return `<div class="board__score">
        <div class="side"><div class="side__name">${a.username ? ACC.avatar(a, 'xs') : ''}${esc(a.name)}</div><div class="side__school">${a.answered ? L.answered : L.thinking}</div></div>
        <div class="score"><span>${a.score}</span><span>:</span><span>${b.score}</span></div>
        <div class="side side--r"><div class="side__name">${esc(b.name)}${b.connected ? '' : L.left}${b.username ? ACC.avatar(b, 'xs') : ''}</div><div class="side__school">${b.answered ? L.answered : L.thinking}</div></div></div>`;
    }
    if (room.mode === 'class') {
      const mine = ps.find(p => p.sid === socket.id);
      return `<div class="board__score">
        <div class="side"><div class="side__name">${L.team(1)}${mine?.team === 'A' ? L.yours : ''}</div><div class="side__school">${L.nPlayers(room.teams.A.players)}</div></div>
        <div class="score"><span>${room.teams.A.avg}</span><span>:</span><span>${room.teams.B.avg}</span></div>
        <div class="side side--r"><div class="side__name">${L.team(2)}${mine?.team === 'B' ? L.yours : ''}</div><div class="side__school">${L.nPlayers(room.teams.B.players)}</div></div></div>
        <div class="gbar__progress"><span>${L.teamAvg}</span><span>${L.yourScore(mine?.score ?? 0)}</span></div>`;
    }
    if (room.mode === 'arena') {
      const sorted = [...ps].sort((a, b) => b.score - a.score);
      const me = sorted.find(p => p.sid === socket.id) || sorted[0];
      const place = sorted.indexOf(me) + 1;
      return `<div class="arena">${sorted.slice(0, 5).map((p, i) => `<div class="arena__p ${p.sid === socket.id ? 'is-me' : ''} ${p.connected ? '' : 'is-off'}"><span class="arena__n">${i + 1}</span><span class="arena__name">${p.username ? ACC.avatar(p, 'xs') : ''}${esc(p.name)}</span>${p.answered ? '<i class="arena__ok" aria-hidden="true"></i>' : ''}<b class="num">${p.score}</b></div>`).join('')}
        ${place > 5 ? `<div class="arena__p is-me"><span class="arena__n">${place}</span><span class="arena__name">${me.username ? ACC.avatar(me, 'xs') : ''}${esc(me.name)}</span><b class="num">${me.score}</b></div>` : ''}</div>
        <div class="gbar__progress"><span>${L.arenaPlace(place, sorted.length)}</span><span>${L.yourScore(me?.score ?? 0)}</span></div>`;
    }
    const mine = ps.find(p => p.sid === socket.id) || ps[0];
    return `<div class="board__score"><div class="side"><div class="side__name">${esc(mine?.name)}</div><div class="side__school">${L.practice}</div></div><div class="score"><span>${mine?.score ?? 0}</span></div><div></div></div>`;
  }

  // Обновление табло: изменившиеся цифры счёта «подпрыгивают».
  function updateGameBar() {
    const g = $('#gbar'); if (!g) return;
    const nums = () => [...g.querySelectorAll('.score > span, .arena__p .num')].map(x => x.textContent);
    const before = nums();
    g.innerHTML = gameBarHTML();
    const now = [...g.querySelectorAll('.score > span, .arena__p .num')];
    now.forEach((el, i) => { if (before[i] !== undefined && before[i] !== el.textContent && /\d/.test(el.textContent)) FX.pop(el); });
  }

  function viewQuestion(keepState) {
    reset();
    const q = current;
    setTitle(L.qOf(q.i + 1, q.total));
    app.innerHTML = `
    <div class="game">
      <div class="gbar" id="gbar">${gameBarHTML()}</div>
      <div class="qcard">
        <div class="qcard__meta"><span>${L.qOf(q.i + 1, q.total)} · ${esc(qp(q.s))}</span><span class="num" id="qSec"></span></div>
        <div class="qcard__text">${esc(qp(q.t))}</div>
        ${q.img ? `<figure class="qfig qfig--battle">${q.img}</figure>` : ''}
        <div class="qtimer" id="qTimer"><i id="qBar"></i></div>
        <div class="answers" id="answers">
          ${qp(q.o).map((o, i) => `<button class="answer${keepState && picked === i ? ' picked' : ''}" data-i="${i}" ${keepState && picked !== null ? 'disabled' : ''}><span class="k">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join('')}
        </div>
        <div id="explain"></div>
      </div>
      <div class="game__leave"><button class="linkbtn" id="quitBtn">${L.quitGame}</button></div>
    </div>`;
    $('#quitBtn').onclick = () => { if (confirm(L.leaveConfirm)) { leaveRoom(); go('/play'); } };
    if (keepState && lastReveal?.i === q.i) return showReveal(lastReveal);
    const bar = $('#qBar'), sec = $('#qSec');
    const draw = () => {
      const left = Math.max(0, q.endsAt - Date.now());
      bar.style.transform = `scaleX(${left / q.duration})`;
      sec.textContent = `${Math.ceil(left / 1000)} ${L.sec}`;
      $('#qTimer').classList.toggle('low', left < 5000);
    };
    draw(); tick = setInterval(draw, 100);
    $('#answers').addEventListener('click', e => {
      const b = e.target.closest('.answer');
      if (!b || picked !== null || b.disabled) return;
      picked = +b.dataset.i;
      b.classList.add('picked');
      $('#answers').querySelectorAll('.answer').forEach(x => x.disabled = true);
      socket.emit('answer', { code: room.code, i: q.i, choice: picked });
    });
    const onKey = e => { const k = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()]; if (k !== undefined) $(`.answer[data-i="${k}"]`)?.click(); };
    document.addEventListener('keydown', onKey);
    cleanup.push(() => document.removeEventListener('keydown', onKey));
  }

  function showReveal(d) {
    if (!current || d.i !== current.i) return;
    clearInterval(tick);
    app.querySelectorAll('.answer').forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === d.a) b.classList.add('right'); else if (i === picked) b.classList.add('wrong'); });
    const mine = d.picks[socket.id];
    const myBtn = picked !== null ? app.querySelector(`.answer[data-i="${picked}"]`) : null;
    if (mine?.gained) FX.floatText(myBtn, '+' + mine.gained);
    else if (myBtn) FX.shake(myBtn);
    FX.glow(app.querySelector(`.answer[data-i="${d.a}"]`));
    $('#explain').innerHTML = `<div class="explain">${mine?.gained ? `<span class="gained">+${mine.gained}</span> ` : picked === null ? `<b>${L.timeUp}</b> ` : `<b>${L.wrong}</b> `}${esc(qp(d.e))}</div>`;
    updateGameBar();
  }

  function viewResult(d) {
    reset();
    const mine = d.ranking.find(p => p.sid === socket.id);
    const n = d.review.length;
    const correct = d.review.filter((q, i) => d.mine[i] === q.a).length;
    let title;
    if (d.mode === 'duel') title = d.winner === null ? L.draw : d.winner === socket.id ? L.win : L.lose;
    else if (d.mode === 'class') { const myTeam = room.players.find(p => p.sid === socket.id)?.team; title = d.winner === null ? L.draw : d.winner === myTeam ? L.teamWin : L.teamLose; }
    else if (d.mode === 'arena') { const pl = d.ranking.findIndex(p => p.sid === socket.id) + 1; title = pl === 1 ? L.win : L.arenaRes(pl, d.ranking.length); }
    else title = L.soloRes(correct, n);
    setTitle(title);
    const delta = d.change;
    const opp = d.mode === 'duel' ? d.ranking.find(p => p.sid !== socket.id) : null;
    const lead = d.mode === 'duel' && opp ? `${esc(mine?.name)} ${mine?.score} : ${opp.score} ${esc(opp.name)}.` : d.mode === 'class' ? L.classLead(d.teams.A.avg, d.teams.B.avg, mine?.score ?? 0) + '.' : d.mode === 'arena' ? L.soloLead(mine?.score ?? 0) + '.' : L.soloLead(mine?.score ?? 0) + '.';

    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <div class="result__head">
        <h1>${title}</h1>
        <p class="page__lead">${lead} ${L.correctN(correct, n)}</p>
        ${d.mode !== 'solo' ? `<span class="delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero'} num"><span id="resDelta">${delta > 0 ? '+' : ''}${delta}</span> ${L.toRating}</span>` : ''}
      </div>
      <div class="result__actions">
        ${d.mode === 'duel' ? `<button class="btn" id="rematch">${L.again}</button>` : d.mode === 'arena' ? `<a href="/play?mode=duel" data-link class="btn">${L.again}</a>` : `<a href="/play?mode=${d.mode}" data-link class="btn">${d.mode === 'solo' ? L.again : L.newBattle}</a>`}
        <a href="/rating" data-link class="btn btn--ghost">${L.navRating}</a>
      </div>
      ${d.mode === 'arena' ? `<h2 style="font-size:22px;margin-bottom:12px">${L.arenaTable}</h2><table class="table" style="margin-bottom:36px"><tbody>${d.ranking.map((p, i) => `<tr class="${i < 3 ? 'top3' : ''} ${p.sid === socket.id ? 'is-me' : ''}"><td class="pos">${i + 1}</td><td><span class="who">${p.username ? ACC.avatar(p, 'sm') : ''}<span>${esc(p.name)}<div class="sub">${p.username ? '@' + esc(p.username) + ' · ' : ''}${L.correctN(p.correct, n)}</div></span></span></td><td class="r">${p.score}</td></tr>`).join('')}</tbody></table>` : ''}
      ${d.mode === 'class' ? `<h2 style="font-size:22px;margin-bottom:12px">${L.bestPlayers}</h2><table class="table" style="margin-bottom:36px"><tbody>${d.ranking.slice(0, 10).map((p, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${esc(p.name)}<div class="sub">${L.team(p.team === 'A' ? 1 : 2)}</div></td><td class="r">${p.score}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2 style="font-size:22px;margin-bottom:12px">${L.review}</h2>
      <label class="filter"><input type="checkbox" id="onlyMiss" ${correct < n ? 'checked' : ''}> ${L.onlyMiss}</label>
      <div class="review" id="review"></div>
    </div></div>`;

    const drawReview = () => {
      const only = $('#onlyMiss').checked;
      const items = d.review.map((q, i) => ({ q, i, my: d.mine[i] })).filter(x => !only || x.my !== x.q.a);
      $('#review').innerHTML = items.length ? items.map(({ q, i, my }) => {
        const o = qp(q.o);
        return `<div class="review__item ${my === q.a ? 'hit' : 'miss'}">
          <div class="muted" style="font-size:13px;margin-bottom:4px">${i + 1}. ${esc(qp(q.s))}</div>
          <h3>${esc(qp(q.t))}</h3>
          <div class="review__ans">
            ${my !== q.a ? `<span class="y">${L.yourAns}: ${my === null ? L.noAns : esc(o[my])}</span>` : ''}
            <span class="c">${L.rightAns}: ${esc(o[q.a])}</span>
          </div>
          <p class="e">${esc(qp(q.e))}</p>
        </div>`;
      }).join('') : `<div class="empty">${L.noMistakes}</div>`;
    };
    $('#onlyMiss').onchange = drawReview; drawReview();
    // Победа — конфетти; рейтинг набегает.
    const won = title === L.win || title === L.teamWin;
    app.querySelector('.result__head')?.classList.add('fx-rise', won ? 'is-win' : 'is-other');
    if (won) setTimeout(() => FX.confetti(), 250);
    if (delta) FX.countTo($('#resDelta'), delta, { ms: 800, fmt: v => (delta > 0 ? '+' : '') + Math.round(v) });

    $('#rematch')?.addEventListener('click', () => {
      const subject = room.subject, from = room.code, rlang = room.lang;
      room = null; lastEnd = null;
      socket.emit('create', { mode: 'duel', subject, lang: rlang }, r => {
        if (!r?.code) return;
        history.replaceState({}, '', `/b/${r.code}`);
        socket.emit('invite', { from, code: r.code });
      });
    });
  }

  // ---------- подсказки школ ----------
  const schoolLists = new Map();
  const loadSchools = city => {
    if (!city) return Promise.resolve([]);
    if (!schoolLists.has(city)) schoolLists.set(city, fetch(`/api/schools?city=${encodeURIComponent(city)}`).then(r => r.json()).then(d => d.schools || []).catch(() => []));
    return schoolLists.get(city);
  };
  const norm = t => String(t).toLowerCase().replace(/ё/g, 'е').replace(/[«»"'.,()№-]/g, ' ').replace(/\s+/g, ' ').trim();
  // Номер школы — по номеру, слова — по началу слов: «гим 12» найдёт «Школа-гимназия № 12».
  // Название школы на языке интерфейса: в базе — как в реестре, на казахском показываем перевод.
  window.schoolName = s => (s && lang === 'kk' ? SCHOOLKK.toKk(s) : s || '');
  function matchSchools(list, query) {
    const q = norm(query);
    const label = [...new Set(list.map(schoolName))];
    if (!q) return label.slice(0, 8);
    const toks = q.split(' ');
    const nums = toks.filter(t => /^\d+$/.test(t)), words = toks.filter(t => !/^\d+$/.test(t));
    // Ищем и по русскому, и по казахскому названию.
    return [...new Set(list.filter(name => {
      const n = norm(name + ' ' + SCHOOLKK.toKk(name)), nameNums = n.match(/\d+/g) || [], nameWords = n.split(' ');
      return nums.every(x => nameNums.includes(x)) && words.every(w => nameWords.some(nw => nw.startsWith(w)) || n.includes(w));
    }).map(schoolName))].slice(0, 8);
  }
  // Превращает поле «Школа» в поле с выпадающими подсказками для выбранного города.
  function attachSchoolSuggest(input, citySelect) {
    if (!input || input.dataset.suggest) return;
    input.dataset.suggest = '1';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    const id = 'sl' + Math.random().toString(36).slice(2, 8);
    const box = document.createElement('ul');
    box.className = 'suggest'; box.id = id; box.setAttribute('role', 'listbox'); box.hidden = true;
    input.setAttribute('aria-controls', id);
    input.parentElement.classList.add('suggest-wrap');
    input.insertAdjacentElement('afterend', box);
    let items = [], active = -1, seq = 0;
    const close = () => { box.hidden = true; active = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
    const choose = v => { input.value = v; close(); input.dispatchEvent(new Event('change', { bubbles: true })); };
    const paint = () => {
      box.querySelectorAll('li[role=option]').forEach((li, i) => {
        li.setAttribute('aria-selected', i === active);
        if (i === active) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
      });
    };
    const update = async () => {
      const my = ++seq;
      const city = citySelect.value;
      if (!city) { items = []; box.innerHTML = `<li class="suggest__note">${L.schoolPickCity}</li>`; box.hidden = document.activeElement !== input; input.setAttribute('aria-expanded', String(!box.hidden)); return; }
      const list = await loadSchools(city);
      if (my !== seq) return;
      const q = input.value.trim();
      // Только существующие школы: из реестра и указанные учениками этого города.
      items = matchSchools(list, q);
      if (items.length) box.innerHTML = items.map((v, i) => `<li role="option" id="${id}-${i}" data-i="${i}">${esc(v)}</li>`).join('');
      else box.innerHTML = `<li class="suggest__note">${q ? L.schoolNotFound : (list.length ? L.schoolHint : L.schoolNoList)}</li>`;
      active = -1;
      box.hidden = !box.innerHTML || document.activeElement !== input;
      input.setAttribute('aria-expanded', String(!box.hidden));
    };
    input.addEventListener('input', update);
    input.addEventListener('focus', update);
    input.addEventListener('blur', () => setTimeout(close, 120));
    citySelect.addEventListener('change', () => { loadSchools(citySelect.value); if (document.activeElement === input) update(); });
    box.addEventListener('mousedown', e => { const li = e.target.closest('li[role=option]'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
    input.addEventListener('keydown', e => {
      if (box.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; paint(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active]); }
      else if (e.key === 'Escape') { close(); }
    });
    if (citySelect.value) loadSchools(citySelect.value);
  }

  // ---------- Google ----------
  let gConfig = null, gScript = null;
  async function googleReady() {
    if (!gConfig) gConfig = await fetch('/api/config').then(r => r.json()).catch(() => ({}));
    if (!gConfig.googleClientId) return false;
    if (!gScript) gScript = new Promise(res => {
      const sc = document.createElement('script');
      sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = () => res(true); sc.onerror = () => res(false);
      document.head.appendChild(sc);
    });
    return gScript;
  }
  // Встроенные браузеры (Instagram, Facebook, TikTok, Telegram, WebView) Google не пускает ко входу.
  const inApp = /FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly|Telegram|; wv\)|WebView|GSA\//i.test(navigator.userAgent);
  // Рисует официальную кнопку Google в элементе el; onCredential получает подписанный токен.
  // Вход идёт переходом на страницу Google и обратно (без всплывающего окна, которое на телефонах остаётся белым).
  async function googleButton(el, onCredential) {
    if (!el) return false;
    // Вернулись от Google: токен уже ждёт в sessionStorage.
    let cred = null, gerr = null;
    try { cred = sessionStorage.getItem('ba_gcred'); gerr = sessionStorage.getItem('ba_gerr'); sessionStorage.removeItem('ba_gcred'); sessionStorage.removeItem('ba_gerr'); } catch {}
    if (cred) setTimeout(() => onCredential(cred), 0);
    else if (gerr) toast(L.err.google || L.err.server);
    if (inApp) {
      el.innerHTML = `<p class="gnote">${L.gInApp}</p><button type="button" class="btn btn--ghost btn--sm" id="gCopy">${L.gCopyLink}</button>`;
      el.closest('.gblock')?.removeAttribute('hidden');
      $('#gCopy').onclick = async () => { try { await navigator.clipboard.writeText(location.origin + location.pathname); toast(L.gCopied); } catch { toast(location.origin); } };
      return false;
    }
    if (!(await googleReady()) || !window.google?.accounts?.id) return false;
    google.accounts.id.initialize({ client_id: gConfig.googleClientId, ux_mode: 'redirect', login_uri: `${location.origin}/api/google/redirect`, callback: r => onCredential(r.credential), cancel_on_tap_outside: true });
    el.innerHTML = '';
    google.accounts.id.renderButton(el, {
      theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', logo_alignment: 'center', width: Math.min(el.clientWidth || 360, 400), locale: lang === 'kk' ? 'kk' : 'ru',
      click_listener: () => { try { sessionStorage.setItem('ba_greturn', location.pathname + location.search); } catch {} }
    });
    try { sessionStorage.setItem('ba_greturn', location.pathname + location.search); } catch {}
    el.closest('.gblock')?.removeAttribute('hidden');
    return true;
  }

  function viewGoogleProfile(pending, name, uname = '') {
    setTitle(L.gTitle);
    app.innerHTML = `
    <div class="page"><div class="wrap narrow" style="max-width:480px">
      <h1>${L.gTitle}</h1>
      <p class="page__lead">${L.gLead}</p>
      <form id="gForm" class="auth__form panel" style="margin-top:24px" novalidate>
        <label class="field"><span>${L.fUsername}</span><input name="username" maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(uname)}"><small>${L.fUsernameHint}</small></label>
        <div class="field"><span>${lang === 'kk' ? 'Мен' : 'Я'}</span><div class="rolepick"><label><input type="radio" name="role" value="student" checked><span>${lang === 'kk' ? 'Оқушымын' : 'Ученик'}</span></label><label><input type="radio" name="role" value="teacher"><span>${lang === 'kk' ? 'Мұғаліммін' : 'Учитель'}</span></label></div><small class="rolepick__hint" hidden>${lang === 'kk' ? 'Мұғалім сынып ашып, оқушыларды кодпен қосады, жарыс өткізеді және әр оқушының нәтижесін көреді.' : 'Учитель открывает класс, приглашает учеников по коду, проводит соревнования и видит результаты каждого.'}</small></div>
            <label class="field"><span>${L.fName}</span><input name="name" maxlength="24" value="${esc(name)}" placeholder="${L.fNamePh}"></label>
            <label class="field"><span>${L.fBirth}</span><input name="birth" type="date" min="1926-01-01" max="${new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10)}"></label>
            <label class="field"><span>${L.fPhone}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 7__ ___ __ __"><small>${L.fPhoneHint}</small></label>
        <label class="field"><span>${L.fCity}</span><select name="city">${$('#citySelect').innerHTML}</select></label>
        <label class="field"><span>${L.fSchool}</span><input name="school" maxlength="60" placeholder="${L.fSchoolPh}"></label>
        <label class="check"><input type="checkbox" name="consent"> <span>${L.consent}</span></label>
        <p class="form-error" id="gError" role="alert"></p>
        <button class="btn btn--block" id="gBtn">${L.gFinish}</button>
      </form>
    </div></div>`;
    const f = $('#gForm').elements;
    roleHint($('#gForm'));
    attachSchoolSuggest(f.school, f.city);
    $('#gForm').onsubmit = async e => {
      e.preventDefault();
      $('#gBtn').disabled = true; $('#gError').textContent = '';
      try {
        const r = await api('/api/google/complete', { method: 'POST', body: { pending, username: f.username.value, name: f.name.value, birth: f.birth.value, phone: f.phone.value, city: f.city.value, school: f.school.value, consent: f.consent.checked } });
        signIn(r.token, r.user);
        if (f.role.value === 'teacher') return becomeTeacher();
        route();
      } catch (x) {
        if (x.code === 'expired') return viewAuth();
        $('#gError').textContent = L.err[x.code] || L.err.server; $('#gBtn').disabled = false;
      }
    };
    (f.username.value ? f.name.value ? f.birth : f.name : f.username).focus();
  }

  // Регистрация учителем: ставим роль и сразу открываем кабинет учителя.
  async function becomeTeacher() {
    try { const r = await api('/api/me/role', { method: 'POST', body: { role: 'teacher' } }); me = { ...me, ...r.user }; renderChip(); } catch {}
    history.replaceState({}, '', '/teacher');
    route();
  }
  const roleHint = root => root.querySelectorAll('input[name=role]').forEach(i => i.addEventListener('change', () => { const h = root.querySelector('.rolepick__hint'); if (h) h.hidden = root.querySelector('input[name=role]:checked').value !== 'teacher'; }));

  // Обязательные данные профиля: если их нет (аккаунт создан раньше), без них дальше не пускаем.
  function viewRequired() {
    setTitle(L.reqTitle);
    app.innerHTML = `
    <div class="page"><div class="wrap narrow" style="max-width:480px">
      <h1>${L.reqTitle}</h1>
      <p class="page__lead">${L.reqLead}</p>
      <form id="rForm" class="auth__form panel" style="margin-top:24px" novalidate>
        ${me.canRename ? `<label class="field"><span>${L.fUsername}</span><input name="username" maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(me.username)}"><small>${L.fUsernameHint}</small></label>` : ''}
            <label class="field"><span>${L.fBirth}</span><input name="birth" type="date" min="1926-01-01" max="${new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10)}"></label>
            <label class="field"><span>${L.fPhone}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 7__ ___ __ __"><small>${L.fPhoneHint}</small></label>
        <p class="form-error" id="rError" role="alert"></p>
        <button class="btn btn--block" id="rBtn">${L.save}</button>
        <button type="button" class="linkbtn" id="rOut" style="justify-self:center">${L.logout}</button>
      </form>
    </div></div>`;
    const f = $('#rForm').elements;
    $('#rOut').onclick = async () => { try { await api('/api/logout', { method: 'POST' }); } catch {} signOut(); };
    $('#rForm').onsubmit = async e => {
      e.preventDefault();
      $('#rBtn').disabled = true; $('#rError').textContent = '';
      try {
        const r = await api('/api/me/required', { method: 'POST', body: { username: f.username?.value, birth: f.birth.value, phone: f.phone.value } });
        me = { ...me, ...r.user }; rememberAccount(getToken(), me); renderChip(); route();
      } catch (x) { $('#rError').textContent = L.err[x.code] || L.err.server; $('#rBtn').disabled = false; }
    };
    (f.username || f.birth).focus();
  }

  // ---------- вход и регистрация ----------
  function viewAuth(adding) {
    setTitle(L.tabLogin);
    const invite = /^\/b\/[A-Z0-9]{5}$/i.test(location.pathname);
    const qmode = new URLSearchParams(location.search).get('mode');
    let tab = (adding && ['login', 'register'].includes(qmode) ? qmode : null) || sessionStorage.getItem('ba_authtab') || 'register';
    app.innerHTML = `
    <section class="auth">
      <div class="wrap auth__grid">
        <div class="auth__pitch">
          <h1>${L.heroTitle}</h1>
          <p class="hero__lead">${invite ? L.inviteNote : L.authLead}</p>
          <ul class="auth__points">${L.authPoints.map(x => `<li>${x}</li>`).join('')}</ul>
        </div>
        <div class="auth__card panel">
          <div class="gblock" hidden>
            <div id="gBtnBox" class="gbtn"></div>
            <div class="or"><span>${L.or}</span></div>
          </div>
          <p class="form-error" id="gAuthError" role="alert"></p>
          ${adding && me ? `<div class="addacc"><span>${L.acc.addingNote}</span><a href="/me" data-link>${L.cancel}</a></div>` : ''}
          <div class="tabs-sm" role="tablist">
            <button type="button" role="tab" data-auth="register">${L.tabRegister}</button>
            <button type="button" role="tab" data-auth="login">${L.tabLogin}</button>
          </div>
          <form id="authForm" class="auth__form" novalidate>
            <label class="field"><span>${L.fUsername}</span><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" required placeholder="aigerim_07"></label>
            <label class="field"><span>${L.fPassword}</span><input name="password" type="password" maxlength="72" required></label>
            <div class="field reg"><span>${lang === 'kk' ? 'Мен' : 'Я'}</span><div class="rolepick"><label><input type="radio" name="role" value="student" checked><span>${lang === 'kk' ? 'Оқушымын' : 'Ученик'}</span></label><label><input type="radio" name="role" value="teacher"><span>${lang === 'kk' ? 'Мұғаліммін' : 'Учитель'}</span></label></div><small class="rolepick__hint" hidden>${lang === 'kk' ? 'Мұғалім сынып ашып, оқушыларды кодпен қосады, жарыс өткізеді және әр оқушының нәтижесін көреді.' : 'Учитель открывает класс, приглашает учеников по коду, проводит соревнования и видит результаты каждого.'}</small></div>
            <label class="field reg"><span>${L.fName}</span><input name="name" maxlength="24" autocomplete="nickname" placeholder="${L.fNamePh}"></label>
            <label class="field reg"><span>${L.fBirth}</span><input name="birth" type="date" min="1926-01-01" max="${new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10)}"></label>
            <label class="field reg"><span>${L.fPhone}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 7__ ___ __ __"></label>
            <label class="field reg"><span>${L.fCity}</span><select name="city">${$('#citySelect').innerHTML}</select></label>
            <label class="field reg"><span>${L.fSchool}</span><input name="school" maxlength="60" placeholder="${L.fSchoolPh}"></label>
            <label class="check reg"><input type="checkbox" name="consent"> <span>${L.consent}</span></label>
            <p class="form-error" id="authError" role="alert"></p>
            <button class="btn btn--block" id="authBtn"></button>
          </form>
        </div>
      </div>
    </section>
    ${footer()}`;
    const form = $('#authForm'), f = form.elements;
    const setTab = t => {
      tab = t; sessionStorage.setItem('ba_authtab', t);
      app.querySelectorAll('[data-auth]').forEach(b => b.setAttribute('aria-selected', b.dataset.auth === t));
      form.querySelectorAll('.reg').forEach(el => { el.hidden = t !== 'register'; });
      f.password.autocomplete = t === 'register' ? 'new-password' : 'current-password';
      $('#authBtn').textContent = t === 'register' ? L.registerBtn : L.loginBtn;
      $('#authError').textContent = '';
    };
    app.querySelectorAll('[data-auth]').forEach(b => b.onclick = () => setTab(b.dataset.auth));
    setTab(tab);
    roleHint(form);
    attachSchoolSuggest(f.school, f.city);
    form.onsubmit = async e => {
      e.preventDefault();
      const btn = $('#authBtn'); btn.disabled = true; $('#authError').textContent = '';
      try {
        const body = tab === 'register'
          ? { username: f.username.value, password: f.password.value, name: f.name.value, birth: f.birth.value, phone: f.phone.value, city: f.city.value, school: f.school.value, consent: f.consent.checked }
          : { username: f.username.value, password: f.password.value };
        const r = await api(tab === 'register' ? '/api/register' : '/api/login', { method: 'POST', body });
        leaveRoom(); socket.disconnect();
        signIn(r.token, r.user);
        if (tab === 'register' && f.role.value === 'teacher') return becomeTeacher();
        if (adding) history.replaceState({}, '', '/me');
        route();
      } catch (x) { $('#authError').textContent = L.err[x.code] || L.err.server; btn.disabled = false; }
    };
    f.username.focus();
    googleButton($('#gBtnBox'), async credential => {
      $('#gAuthError').textContent = '';
      try {
        const r = await api('/api/google', { method: 'POST', body: { credential } });
        if (r.needProfile) return viewGoogleProfile(r.pending, r.name, r.username);
        socket.disconnect(); signIn(r.token, r.user);
        if (adding) history.replaceState({}, '', '/me');
        route();
      } catch (x) { $('#gAuthError').textContent = L.err[x.code] || L.err.server; }
    });
  }

  // ---------- кабинет ----------
  async function viewMe() {
    setTitle(L.meTitle);
    app.innerHTML = `<div class="page"><div class="wrap narrow">${SKEL()}</div></div>`;
    let d;
    try { d = await api('/api/me'); } catch { return; }
    me = { ...me, ...d.user }; renderChip();
    const u = d.user;
    const answered = d.subjects.reduce((n, x) => n + x.answered, 0), right = d.subjects.reduce((n, x) => n + x.correct, 0);
    const acc = answered ? Math.round(right / answered * 100) : null;
    const subs = d.subjects.filter(x => x.answered > 0).map(x => ({ ...x, pct: Math.round(x.correct / x.answered * 100) })).sort((a, b) => a.pct - b.pct);
    const since = u.createdAt ? fmtDate(u.createdAt, lang, true) : '';
    const fmt = iso => fmtDate(iso, lang);
    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <div class="me__head">
        <div>
          <h1>${esc(u.name)}</h1>
          <p class="page__lead">@${esc(u.username)} · ${esc(schoolName(u.school))}, ${esc(cityName(u.city))}</p>
          ${since ? `<p class="muted" style="font-size:14px;margin-top:4px">${L.memberSince(since)}</p>` : ''}
        </div>
        <div class="me__actions"><button class="btn btn--ghost btn--sm" id="editBtn">${L.editProfile}</button><button class="btn btn--ghost btn--sm" id="logoutBtn">${L.logout}</button></div>
      </div>
      <div class="glink">
        ${u.google ? `<span class="glink__ok">${L.gLinked}</span>` : `<div class="glink__row"><span>${L.gLinkLead}</span><div class="gblock" hidden><div id="gLinkBox" class="gbtn"></div></div></div><p class="form-error" id="gLinkError" role="alert"></p>`}
      </div>
      <div class="tiles">
        <div><b class="num">${u.rating}</b><span>${L.tRating}</span></div>
        <div><b class="num">${u.games}</b><span>${L.tGames}</span></div>
        <div><b class="num">${u.wins}</b><span>${L.tWins}</span></div>
        <div><b class="num">${acc === null ? '—' : acc + '%'}</b><span>${L.tAcc}</span></div>
      </div>
      <h2 class="me__h2">${L.subjectsTitle}</h2>
      ${subs.length ? `<p class="muted" style="margin:-6px 0 14px">${L.subjectsLead}</p><ul class="acc">${subs.map((x, i) => `
        <li>
          <div class="acc__top"><span>${esc(pick(meta.subjects[x.subject]) || x.subject)}${i === 0 && subs.length > 1 && x.pct < 70 ? ` <span class="acc__weak">${L.weak}</span>` : ''}</span><span class="num"><b>${x.pct}%</b> <span class="muted">· ${L.rightOf(x.correct, x.answered)}</span></span></div>
          <div class="acc__bar"><i style="width:${x.pct}%" class="${x.pct < 50 ? 'low' : x.pct < 75 ? 'mid' : ''}"></i></div>
          <a href="/play?mode=solo&topic=${x.subject}" data-link class="acc__train">${L.train}</a>
        </li>`).join('')}</ul>` : `<div class="empty">${L.subjectsEmpty}<br><a href="/play" data-link class="btn">${L.play}</a></div>`}
      <h2 class="me__h2">${L.recentTitle}</h2>
      ${d.recent.length ? `<table class="table"><tbody>${d.recent.map(g => `
        <tr><td><b>${L.modeName[g.mode] || g.mode}</b><div class="sub">${esc(topicName(g.topic))} · ${fmt(g.created_at)}</div></td>
        <td class="num hide-sm">${L.rightOf(g.correct, g.total)}</td>
        <td class="r">${g.mode === 'solo' ? g.score : `<span class="${g.delta > 0 ? 'pos-d' : g.delta < 0 ? 'neg-d' : ''}">${g.delta > 0 ? '+' : ''}${g.delta}</span>`}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">${L.recentEmpty}</div>`}
    </div></div>${footer()}`;
    $('#editBtn').onclick = async () => { if (await openProfile()) viewMe(); };
    $('#logoutBtn').onclick = async () => { try { await api('/api/logout', { method: 'POST' }); } catch {} signOut(); };
    if (!u.google) googleButton($('#gLinkBox'), async credential => {
      try { const r = await api('/api/google/link', { method: 'POST', body: { credential } }); me = { ...me, ...r.user }; toast(L.gLinkedToast); viewMe(); }
      catch (x) { $('#gLinkError').textContent = L.err[x.code] || L.err.server; }
    });
  }

  // ---------- политика конфиденциальности (открыта без входа) ----------
  function viewPrivacy() {
    setTitle(L.privTitle);
    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <h1>${L.privTitle}</h1>
      <p class="page__lead">${L.privUpdated}</p>
      ${L.privSections.map(([h, t]) => `<div class="about__block"><h2>${h}</h2><p>${t}</p></div>`).join('')}
      <div style="margin-top:32px"><a href="/" data-link class="btn">${me ? L.aboutCta : L.loginBtn}</a></div>
    </div></div>${footer()}`;
  }

  // ---------- о проекте ----------
  async function viewAbout() {
    setTitle(L.navAbout);
    const order = ['users', 'schools', 'cities', 'games', 'answers', 'questions'];
    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <h1>${L.aboutTitle}</h1>
      <p class="page__lead">${L.aboutLead}</p>
      <h2 class="me__h2">${L.statsTitle}</h2>
      <div class="tiles tiles--6" id="siteStats">${order.map(k => `<div><b class="num">—</b><span>${L.statLabels[k]}</span></div>`).join('')}</div>
      <div class="about__block"><h2>${L.formatTitle}</h2><p>${L.formatText}</p></div>
      <div class="about__block"><h2>${L.scoringTitle}</h2><p>${L.scoringText}</p></div>
      <div class="about__block"><h2>${L.privacyTitle}</h2><p>${L.privacyText}</p></div>
      <p class="muted" style="margin-top:24px">${L.footer}</p>
      <div style="margin-top:32px"><a href="${me ? '/play' : '/'}" data-link class="btn">${me ? L.aboutCta : L.tabRegister}</a></div>
    </div></div>${footer()}`;
    try {
      const st = await fetch('/api/site').then(r => r.json());
      $('#siteStats').innerHTML = order.map(k => `<div><b class="num">${Number(st[k] || 0).toLocaleString('ru-RU')}</b><span>${L.statLabels[k]}</span></div>`).join('');
    } catch {}
  }

  // ---------- рейтинг ----------
  function schoolTable(rows) {
    return `<table class="table"><thead><tr><th></th><th>${L.thSchool}</th><th class="hide-sm">${L.thPlayers}</th><th class="r">${L.thRating}</th></tr></thead><tbody>
      ${rows.map((s, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${esc(schoolName(s.name))}<div class="sub">${esc(cityName(s.city || ''))}</div></td><td class="hide-sm num">${s.players}</td><td class="r">${s.rating}</td></tr>`).join('')}
    </tbody></table>`;
  }

  async function viewRating() {
    setTitle(L.navRating);
    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <h1>${L.navRating}</h1>
      <p class="page__lead">${L.ratingLead}</p>
      <div style="margin-top:28px">
        <div class="tabs" role="tablist">
          <button role="tab" data-tab="schools" aria-selected="true">${L.tabSchools}</button>
          <button role="tab" data-tab="players" aria-selected="false">${L.tabPlayers}</button>
          <button role="tab" data-tab="cities" aria-selected="false">${L.tabCities}</button>
        </div>
        <div id="rTable">${SKEL()}</div>
      </div>
    </div></div>${footer()}`;
    let data;
    try { data = await fetch('/api/leaders').then(r => r.json()); }
    catch { $('#rTable').innerHTML = `<div class="empty">${L.loadFail}</div>`; return; }
    const draw = tab => {
      app.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
      const rows = data[tab] || [];
      if (!rows.length) { $('#rTable').innerHTML = `<div class="empty">${L.ratingEmpty}<br><a href="/play" data-link class="btn">${L.play}</a></div>`; return; }
      if (tab === 'schools') $('#rTable').innerHTML = schoolTable(rows);
      else if (tab === 'players') $('#rTable').innerHTML = `<table class="table"><thead><tr><th></th><th>${L.thPlayer}</th><th class="hide-sm">${L.thWins}</th><th class="r">${L.thRating}</th></tr></thead><tbody>
        ${rows.map((p, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${p.username ? `<a class="plink" href="/u/${esc(p.username)}" data-link>${esc(p.name)}</a>` : esc(p.name)}<div class="sub">${esc(schoolName(p.school))}${p.city ? ', ' + esc(cityName(p.city)) : ''}</div></td><td class="hide-sm num">${L.winsOf(p.wins, p.games)}</td><td class="r">${p.rating}</td></tr>`).join('')}</tbody></table>`;
      else $('#rTable').innerHTML = `<table class="table"><thead><tr><th></th><th>${L.thCity}</th><th class="hide-sm">${L.thPlayers}</th><th class="r">${L.thRating}</th></tr></thead><tbody>
        ${rows.map((c, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${esc(cityName(c.name))}</td><td class="hide-sm num">${c.players}</td><td class="r">${c.rating}</td></tr>`).join('')}</tbody></table>`;
    };
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => draw(b.dataset.tab));
    draw('schools');
  }

  applyStatic();
  route();
})();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
