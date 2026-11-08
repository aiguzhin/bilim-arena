(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LETTERS = ['A', 'B', 'C', 'D'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const socket = io({ transports: ['websocket', 'polling'] });

  let subjects = {};
  let me = null;           // профиль с сервера (rating и т.д.)
  let room = null;         // текущий баттл
  let current = null;      // текущий вопрос
  let picked = null;
  let tick = null;
  let cleanup = [];

  // ---------- профиль ----------
  function loadProfile() { try { return JSON.parse(localStorage.getItem('ba_profile')); } catch { return null; } }
  function saveProfile(p) { try { localStorage.setItem('ba_profile', JSON.stringify(p)); } catch {} }
  function uid() { return (crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2))).replace(/[^a-z0-9-]/gi, ''); }

  function hello(p) {
    return new Promise(res => socket.emit('hello', p, r => {
      if (r?.ok) { me = { ...p, ...r }; renderChip(); }
      res(r);
    }));
  }

  function renderChip() {
    const chip = $('#profileChip');
    if (!me) { chip.hidden = true; return; }
    chip.hidden = false;
    chip.innerHTML = `${esc(me.name)}<b class="num">${me.rating}</b>`;
    chip.title = 'Изменить профиль';
  }

  function openProfile(force) {
    return new Promise(resolve => {
      const dlg = $('#profileDlg'), form = $('#profileForm'), err = $('#profileError');
      const p = loadProfile();
      const f = form.elements;
      if (p) { f.name.value = p.name; f.school.value = p.school; f.city.value = p.city; f.consent.checked = true; }
      err.textContent = '';
      $('#profileCancel').onclick = () => { dlg.close(); resolve(null); };
      form.onsubmit = async e => {
        e.preventDefault();
        const prof = { id: p?.id || uid(), name: f.name.value.trim(), school: f.school.value.trim(), city: f.city.value };
        const r = await hello(prof);
        if (r?.error) { err.textContent = r.error; return; }
        saveProfile(prof); dlg.close(); resolve(prof);
      };
      dlg.showModal();
      if (!force) f.name.focus();
    });
  }

  async function ensureProfile() {
    if (me) return me;
    const p = loadProfile();
    if (p) { const r = await hello(p); if (r?.ok) return me; }
    return openProfile();
  }

  $('#profileChip').onclick = () => openProfile(true);

  socket.on('connect', async () => {
    const p = loadProfile();
    if (p) await hello(p);
    if (room && room.code && room.state !== 'done') socket.emit('join', { code: room.code }, () => {});
  });

  // ---------- утилиты ----------
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }
  function go(path, replace) { history[replace ? 'replaceState' : 'pushState']({}, '', path); route(); }
  function reset() { cleanup.forEach(f => f()); cleanup = []; clearInterval(tick); tick = null; }
  function setTitle(t) { document.title = t ? `${t} — Bilim Arena` : 'Bilim Arena — подготовка к ЕНТ в дуэлях'; }
  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    if (room && room.state !== 'done' && room.state !== 'lobby' && !confirm('Выйти из баттла? Текущая игра будет потеряна.')) return;
    leaveRoom();
    go(a.getAttribute('href'));
  });
  window.addEventListener('popstate', () => { leaveRoom(); route(); });

  function leaveRoom() { if (room) socket.emit('leave', { code: room.code }); room = null; current = null; }

  // ---------- маршруты ----------
  async function route() {
    reset();
    const path = location.pathname;
    window.scrollTo(0, 0);
    if (!Object.keys(subjects).length) subjects = await fetch('/api/subjects').then(r => r.json()).catch(() => ({}));
    const m = path.match(/^\/b\/([A-Z0-9]{5})$/i);
    if (m) return joinFlow(m[1].toUpperCase());
    if (path === '/play') return viewSetup();
    if (path === '/rating') return viewRating();
    viewHome();
  }

  // ---------- главная ----------
  function viewHome() {
    setTitle();
    app.innerHTML = `
    <section class="hero">
      <div class="wrap hero__grid">
        <div>
          <h1>Готовься к ЕНТ в дуэлях с одноклассниками</h1>
          <p class="hero__lead">Вопросы в формате ЕНТ, 20 секунд на ответ и разбор каждой ошибки после игры. Отправь ссылку в чат класса — баттл начнётся, как только друг её откроет.</p>
          <div class="hero__cta">
            <a href="/play" data-link class="btn">Вызвать на дуэль</a>
            <button class="btn btn--ghost" id="soloBtn">Потренироваться одному</button>
          </div>
          <div class="hero__facts">
            <div><b class="num">${Object.keys(subjects).length - 1 || 8}</b>предметов ЕНТ</div>
            <div><b class="num">10</b>вопросов в баттле</div>
            <div><b class="num" id="onlineNow">—</b>сейчас на сайте</div>
          </div>
        </div>
        <div class="board" aria-label="Пример идущего баттла">
          <div class="board__head"><span class="board__live"><i></i>Идёт баттл</span><span>Математика</span></div>
          <div class="board__score">
            <div class="side"><div class="side__name">Айгерим</div><div class="side__school">Школа-лицей № 21, Актобе</div></div>
            <div class="score"><span id="dA">0</span><span>:</span><span id="dB">0</span></div>
            <div class="side side--r"><div class="side__name">Нурсултан</div><div class="side__school">НИШ, Актобе</div></div>
          </div>
          <div class="board__q">
            <div class="board__meta"><span id="dN">Вопрос 1 из 10</span><span id="dT">20 с</span></div>
            <div class="board__text" id="dQ"></div>
            <div class="board__opts" id="dO"></div>
            <div class="timer"><i id="dBar"></i></div>
          </div>
        </div>
      </div>
    </section>

    <section class="block block--field">
      <div class="wrap">
        <div class="block__head">
          <h2>Три способа играть</h2>
          <p>Все режимы бесплатные. Очки за правильный ответ плюс бонус за скорость.</p>
        </div>
        <div class="modes">
          <div class="mode mode--main">
            <h3>Дуэль один на один</h3>
            <p>Создай баттл по любому предмету и отправь ссылку другу. Победа над сильным соперником поднимает тебя в рейтинге выше.</p>
            <div class="mode__rule"><div><b>10</b>вопросов</div><div><b>20 с</b>на ответ</div><div><b>+15</b>очков максимум</div></div>
            <a href="/play?mode=duel" data-link class="btn">Создать дуэль</a>
          </div>
          <div class="mode">
            <h3>Класс против класса</h3>
            <p>До 30 человек в каждой команде. Побеждает команда с лучшим средним баллом — один сильный игрок не вытянет весь класс.</p>
            <a href="/play?mode=class" data-link class="btn btn--ghost">Собрать класс</a>
          </div>
          <div class="mode">
            <h3>Тренировка</h3>
            <p>Когда никого нет онлайн: тот же формат, без соперника, с разбором ошибок в конце.</p>
            <a href="/play?mode=solo" data-link class="btn btn--ghost">Начать тренировку</a>
          </div>
        </div>
      </div>
    </section>

    <section class="block" id="how">
      <div class="wrap">
        <div class="block__head"><h2>Как проходит баттл</h2></div>
        <ol class="steps">
          <li><h3>Выбери предмет</h3><p>История Казахстана, математическая грамотность, грамотность чтения или профильный предмет.</p></li>
          <li><h3>Отправь ссылку</h3><p>В WhatsApp или Telegram. Другу не нужно ничего скачивать — баттл открывается в браузере.</p></li>
          <li><h3>Сыграйте и разберите ошибки</h3><p>После 10 вопросов — счёт, изменение рейтинга и объяснение к каждому неверному ответу.</p></li>
        </ol>
      </div>
    </section>

    <section class="block block--field">
      <div class="wrap">
        <div class="block__head">
          <h2>Лучшие школы</h2>
          <a href="/rating" data-link class="btn btn--ghost btn--sm">Весь рейтинг</a>
        </div>
        <div id="topSchools"></div>
      </div>
    </section>

    <section class="block">
      <div class="wrap">
        <div class="schools">
          <div>
            <h2>Учителям и школам</h2>
            <p>Проведите турнир между классами за 15 минут урока. Ученики заходят по ссылке с телефонов, вы видите, какие темы класс решает хуже всего.</p>
            <div style="margin-top:24px"><a href="/play?mode=class" data-link class="btn btn--light">Провести турнир</a></div>
          </div>
          <ul>
            <li>Без установки приложений и регистрации учеников по почте</li>
            <li>Командный счёт по среднему баллу</li>
            <li>Разбор вопросов сразу после игры</li>
            <li>Место школы в рейтинге города</li>
          </ul>
        </div>
      </div>
    </section>
    ${footer()}`;

    $('#soloBtn').onclick = () => go('/play?mode=solo');
    loadTop();
    fetch('/api/stats').then(r => r.json()).then(s => { const el = $('#onlineNow'); if (el) el.textContent = s.online; }).catch(() => {});
    demo();
  }

  function footer() {
    return `<footer class="foot"><div class="wrap foot__in"><span>© ${new Date().getFullYear()} Bilim Arena</span><span>Вопросы составлены по спецификации ЕНТ. Сайт не связан с Национальным центром тестирования.</span></div></footer>`;
  }

  async function loadTop() {
    const box = $('#topSchools');
    try {
      const d = await fetch('/api/leaders').then(r => r.json());
      if (!d.schools?.length) {
        box.innerHTML = `<div class="empty">Рейтинг школ пока пустой. Сыграйте первую дуэль — и ваша школа откроет таблицу.<br><a href="/play" data-link class="btn">Сыграть первым</a></div>`;
        return;
      }
      box.innerHTML = schoolTable(d.schools.slice(0, 5));
    } catch { box.innerHTML = `<div class="empty">Рейтинг не загрузился. Обновите страницу.</div>`; }
  }

  function demo() {
    const qs = [
      { t: 'Найдите корни уравнения x² − 5x + 6 = 0', o: ['1 и 6', '2 и 3', '−2 и −3', '−1 и 6'], a: 1, w: 0 },
      { t: 'Вычислите log₂ 32', o: ['4', '5', '6', '16'], a: 1, w: 1 },
      { t: 'Чему равен sin 30°?', o: ['√3/2', '1/2', '√2/2', '1'], a: 1, w: 2 }
    ];
    let k = 0, A = 0, B = 0, alive = true;
    cleanup.push(() => { alive = false; });
    const step = () => {
      if (!alive || !$('#dQ')) return;
      const q = qs[k % qs.length];
      $('#dN').textContent = `Вопрос ${(k % 10) + 1} из 10`;
      $('#dQ').textContent = q.t;
      $('#dO').innerHTML = q.o.map((o, i) => `<div>${LETTERS[i]}. ${esc(o)}</div>`).join('');
      const bar = $('#dBar');
      bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';
      if (reduced) return;
      requestAnimationFrame(() => { bar.style.transition = 'transform 2.6s linear'; bar.style.transform = 'scaleX(.35)'; });
      let t = 20; const ti = setInterval(() => { if (!alive) return clearInterval(ti); t = Math.max(13, t - 1); const el = $('#dT'); if (el) el.textContent = t + ' с'; }, 370);
      setTimeout(() => {
        clearInterval(ti);
        if (!alive || !$('#dO')) return;
        const opts = $('#dO').children;
        opts[q.a].classList.add('ok');
        if (q.w === 1) B += 12; else { A += 13 + (k % 2); B += q.w === 0 ? 0 : 11; }
        $('#dA').textContent = A; $('#dB').textContent = B;
        k++; setTimeout(step, 1600);
      }, 2700);
    };
    step();
  }

  // ---------- выбор режима ----------
  function viewSetup() {
    setTitle('Новый баттл');
    const params = new URLSearchParams(location.search);
    const mode = ['duel', 'class', 'solo'].includes(params.get('mode')) ? params.get('mode') : 'duel';
    const subjKeys = Object.keys(subjects);
    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <h1>Новый баттл</h1>
      <p class="page__lead">Выбери режим и предмет. Ссылку на баттл отправишь на следующем шаге.</p>
      <form class="choose" id="setup">
        <div>
          <div class="choose__label">Режим</div>
          <div class="seg">
            ${[['duel', 'Дуэль', 'Ты и друг по ссылке'], ['class', 'Класс на класс', 'Две команды до 30 человек'], ['solo', 'Тренировка', 'Одному, без соперника']].map(([v, b, s]) =>
              `<label><input type="radio" name="mode" value="${v}" ${v === mode ? 'checked' : ''}><div class="opt"><b>${b}</b><span>${s}</span></div></label>`).join('')}
          </div>
        </div>
        <div>
          <div class="choose__label">Предмет</div>
          <div class="subjects">
            ${subjKeys.map((k, i) => `<label><input type="radio" name="subject" value="${k}" ${i === 0 ? 'checked' : ''}><span>${esc(subjects[k])}</span></label>`).join('')}
          </div>
        </div>
        <p class="form-error" id="setupError" role="alert"></p>
        <div class="choose__actions">
          <button class="btn" id="createBtn">Создать баттл</button>
          <button class="btn btn--ghost" type="button" id="quickBtn">Найти случайного соперника</button>
        </div>
      </form>
      <div id="quickWait" hidden class="panel" style="margin-top:24px">
        <div class="wait" style="margin:0"><span class="dots"><i></i><i></i><i></i></span><span>Ищем соперника по предмету «<span id="qwSubj"></span>». Обычно это занимает до минуты.</span></div>
        <button class="btn btn--ghost btn--sm" style="margin-top:16px" id="quickCancel">Отменить поиск</button>
      </div>
    </div></div>`;

    const form = $('#setup');
    const syncQuick = () => { $('#quickBtn').hidden = form.mode.value !== 'duel'; $('#createBtn').textContent = form.mode.value === 'solo' ? 'Начать тренировку' : 'Создать баттл'; };
    form.addEventListener('change', syncQuick); syncQuick();

    form.onsubmit = async e => {
      e.preventDefault();
      if (!await ensureProfile()) return;
      socket.emit('create', { mode: form.mode.value, subject: form.subject.value }, r => {
        if (r?.error) { $('#setupError').textContent = r.error; return; }
        history.replaceState({}, '', `/b/${r.code}`);
      });
    };

    $('#quickBtn').onclick = async () => {
      if (!await ensureProfile()) return;
      const subject = form.subject.value;
      $('#qwSubj').textContent = subjects[subject];
      socket.emit('quick', { subject }, r => {
        if (r?.error) { $('#setupError').textContent = r.error; return; }
        if (r.code) return joinFlow(r.code, true);
        form.hidden = true; $('#quickWait').hidden = false;
      });
    };
    $('#quickCancel').onclick = () => { socket.emit('cancel_quick'); $('#quickWait').hidden = true; form.hidden = false; };
    const onMatch = ({ code }) => joinFlow(code, true);
    socket.on('matched', onMatch);
    cleanup.push(() => { socket.off('matched', onMatch); socket.emit('cancel_quick'); });
  }

  // ---------- вход в баттл ----------
  async function joinFlow(code, push) {
    if (push) history.pushState({}, '', `/b/${code}`);
    if (room?.code === code) return;
    app.innerHTML = `<div class="page"><div class="wrap narrow"><h1>Тебя вызвали на баттл</h1><p class="page__lead">Представься, чтобы результат попал в рейтинг твоей школы.</p><div style="margin-top:24px"><button class="btn" id="joinBtn">Войти в баттл</button></div></div></div>`;
    const doJoin = async () => {
      if (!await ensureProfile()) return;
      socket.emit('join', { code }, r => {
        if (r?.error) {
          app.innerHTML = `<div class="page"><div class="wrap narrow"><h1>Не получилось войти</h1><p class="page__lead">${esc(r.error)}</p><div style="margin-top:24px"><a href="/play" data-link class="btn">Создать свой баттл</a></div></div></div>`;
        }
      });
    };
    $('#joinBtn').onclick = doJoin;
    if (loadProfile()) doJoin();
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
  socket.on('question', q => { current = q; picked = null; viewQuestion(); });
  socket.on('reveal', d => { if (d.room) room = d.room; showReveal(d); });
  socket.on('invite', ({ code, name }) => {
    const box = document.querySelector('.result__actions');
    if (!box || room?.state !== 'done') return;
    box.insertAdjacentHTML('beforebegin', `<div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px"><span>${esc(name)} зовёт на реванш</span><button class="btn btn--sm" id="acceptRematch">Принять</button></div>`);
    $('#acceptRematch').onclick = () => { room = null; joinFlow(code, true); };
  });
  socket.on('end', d => { room = d.room; current = null; viewResult(d); });

  function viewLobby() {
    reset();
    setTitle('Ожидание соперника');
    const link = `${location.origin}/b/${room.code}`;
    const isHost = room.hostSid === socket.id;
    const msg = room.mode === 'class'
      ? `Баттл класс на класс по предмету «${room.subjectName}» в Bilim Arena. Заходи и выбирай команду: ${link}`
      : `Вызываю тебя на дуэль по предмету «${room.subjectName}» в Bilim Arena. 10 вопросов ЕНТ, 20 секунд на ответ: ${link}`;
    const players = room.players;
    const playerLi = p => `<li><span>${esc(p.name)}${p.sid === socket.id ? ' <span class="tag">это ты</span>' : ''}<br><span class="sub">${esc(p.school)}${p.city ? ', ' + esc(p.city) : ''}</span></span>${p.sid === room.hostSid ? '<span class="tag">организатор</span>' : ''}</li>`;
    const mine = players.find(p => p.sid === socket.id);

    app.innerHTML = `
    <div class="page"><div class="wrap">
      <h1>${room.mode === 'class' ? 'Класс против класса' : 'Дуэль'}: ${esc(room.subjectName)}</h1>
      <p class="page__lead">${room.mode === 'class' ? 'Отправь ссылку в чаты классов. Каждый выбирает команду, затем организатор начинает игру.' : 'Отправь ссылку сопернику. Игра начнётся сама, когда он зайдёт.'}</p>
      <div class="lobby">
        <div class="panel">
          <div class="muted" style="font-size:14px">Код баттла</div>
          <div class="code">${room.code}</div>
          <div class="linkbox"><input readonly value="${esc(link)}" aria-label="Ссылка на баттл" id="linkInput"><button class="btn btn--ghost" id="copyBtn">Копировать</button></div>
          <div class="share">
            <a class="btn btn--wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Отправить в WhatsApp</a>
            <a class="btn btn--tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg.replace(': ' + link, ''))}">Отправить в Telegram</a>
            ${navigator.share ? '<button class="btn btn--ghost" id="shareBtn">Другое</button>' : ''}
          </div>
        </div>
        <div class="panel">
          ${room.mode === 'class' ? `
            <div style="display:flex;justify-content:space-between;align-items:center"><b>Участники: ${players.length}</b></div>
            <div class="teams">
              ${['A', 'B'].map(t => `<div class="team team--${t}"><h3><span>Команда ${t === 'A' ? '1' : '2'}</span><span class="num">${players.filter(p => p.team === t).length}</span></h3>
                <ul class="plist">${players.filter(p => p.team === t).map(playerLi).join('') || '<li class="sub">Пока никого</li>'}</ul>
                ${mine && mine.team !== t ? `<button class="btn btn--ghost btn--sm btn--block" style="margin-top:10px" data-team="${t}">Перейти сюда</button>` : ''}</div>`).join('')}
            </div>
            ${isHost ? `<button class="btn btn--block" style="margin-top:16px" id="startBtn">Начать игру</button><p class="form-error" id="startError"></p>` : `<div class="wait"><span class="dots"><i></i><i></i><i></i></span>Ждём, когда организатор начнёт игру</div>`}
          ` : `
            <b>Игроки</b>
            <ul class="plist">${players.map(playerLi).join('')}</ul>
            ${players.length < 2 ? `<div class="wait"><span class="dots"><i></i><i></i><i></i></span>Ждём соперника. Не закрывай эту страницу.</div>` : ''}
          `}
        </div>
      </div>
    </div></div>`;

    $('#copyBtn').onclick = async () => {
      try { await navigator.clipboard.writeText(link); toast('Ссылка скопирована'); }
      catch { $('#linkInput').select(); document.execCommand('copy'); toast('Ссылка скопирована'); }
    };
    $('#shareBtn')?.addEventListener('click', () => navigator.share({ title: 'Bilim Arena', text: msg.replace(': ' + link, ''), url: link }).catch(() => {}));
    app.querySelectorAll('[data-team]').forEach(b => b.onclick = () => socket.emit('team', { code: room.code, team: b.dataset.team }));
    $('#startBtn')?.addEventListener('click', () => socket.emit('start', { code: room.code }, r => { if (r?.error) $('#startError').textContent = r.error; }));
  }

  function viewCountdown(n) {
    reset();
    setTitle('Баттл начинается');
    app.innerHTML = `<div class="count"><div><p class="muted">${esc(room?.subjectName || '')}</p><b class="num" id="cnt">${n}</b><p class="muted">Приготовься</p></div></div>`;
    let k = n;
    tick = setInterval(() => { k--; const el = $('#cnt'); if (el && k > 0) el.textContent = k; if (k <= 0) clearInterval(tick); }, 1000);
  }

  function gameBarHTML() {
    if (!room) return '';
    const ps = room.players;
    if (room.mode === 'duel' && ps.length === 2) {
      const a = ps.find(p => p.sid === socket.id) || ps[0], b = ps.find(p => p !== a);
      return `<div class="board__score">
        <div class="side"><div class="side__name">${esc(a.name)}</div><div class="side__school">${a.answered ? 'Ответил' : 'Думает…'}</div></div>
        <div class="score"><span>${a.score}</span><span>:</span><span>${b.score}</span></div>
        <div class="side side--r"><div class="side__name">${esc(b.name)}${b.connected ? '' : ' (вышел)'}</div><div class="side__school">${b.answered ? 'Ответил' : 'Думает…'}</div></div></div>`;
    }
    if (room.mode === 'class') {
      const mine = ps.find(p => p.sid === socket.id);
      return `<div class="board__score">
        <div class="side"><div class="side__name">Команда 1${mine?.team === 'A' ? ' (твоя)' : ''}</div><div class="side__school">${room.teams.A.players} ${plural(room.teams.A.players, 'игрок', 'игрока', 'игроков')}</div></div>
        <div class="score"><span>${room.teams.A.avg}</span><span>:</span><span>${room.teams.B.avg}</span></div>
        <div class="side side--r"><div class="side__name">Команда 2${mine?.team === 'B' ? ' (твоя)' : ''}</div><div class="side__school">${room.teams.B.players} ${plural(room.teams.B.players, 'игрок', 'игрока', 'игроков')}</div></div></div>
        <div class="gbar__progress"><span>Средний балл команды</span><span>Твои очки: ${mine?.score ?? 0}</span></div>`;
    }
    const mine = ps.find(p => p.sid === socket.id) || ps[0];
    return `<div class="board__score"><div class="side"><div class="side__name">${esc(mine?.name)}</div><div class="side__school">Тренировка</div></div><div class="score"><span>${mine?.score ?? 0}</span></div><div></div></div>`;
  }

  function updateGameBar() { const g = $('#gbar'); if (g) g.innerHTML = gameBarHTML(); }

  function viewQuestion() {
    reset();
    const q = current;
    setTitle(`Вопрос ${q.i + 1} из ${q.total}`);
    app.innerHTML = `
    <div class="game">
      <div class="gbar" id="gbar">${gameBarHTML()}</div>
      <div class="qcard">
        <div class="qcard__meta"><span>Вопрос ${q.i + 1} из ${q.total} · ${esc(q.s)}</span><span class="num" id="qSec"></span></div>
        <div class="qcard__text">${esc(q.t)}</div>
        <div class="qtimer" id="qTimer"><i id="qBar"></i></div>
        <div class="answers" id="answers">
          ${q.o.map((o, i) => `<button class="answer" data-i="${i}"><span class="k">${LETTERS[i]}</span><span>${esc(o)}</span></button>`).join('')}
        </div>
        <div id="explain"></div>
      </div>
    </div>`;
    const bar = $('#qBar'), sec = $('#qSec');
    const draw = () => {
      const left = Math.max(0, q.endsAt - Date.now());
      bar.style.transform = `scaleX(${left / q.duration})`;
      sec.textContent = Math.ceil(left / 1000) + ' с';
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
    const btns = app.querySelectorAll('.answer');
    btns.forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === d.a) b.classList.add('right'); else if (i === picked) b.classList.add('wrong'); });
    const mine = d.picks[socket.id];
    $('#explain').innerHTML = `<div class="explain">${mine?.gained ? `<span class="gained">+${mine.gained}</span> ` : picked === null ? '<b>Время вышло.</b> ' : '<b>Неверно.</b> '}${esc(d.e)}</div>`;
    updateGameBar();
  }

  function viewResult(d) {
    reset();
    const mine = d.ranking.find(p => p.sid === socket.id);
    const correct = d.review.filter((q, i) => d.mine[i] === q.a).length;
    let title;
    if (d.mode === 'duel') title = d.winner === null ? 'Ничья' : d.winner === socket.id ? 'Победа' : 'Поражение';
    else if (d.mode === 'class') { const myTeam = room.players.find(p => p.sid === socket.id)?.team; title = d.winner === null ? 'Ничья' : d.winner === myTeam ? 'Твоя команда победила' : 'Победила другая команда'; }
    else title = `${correct} из ${d.review.length} верно`;
    setTitle(title);
    const delta = d.change;
    const opp = d.mode === 'duel' ? d.ranking.find(p => p.sid !== socket.id) : null;

    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <div class="result__head">
        <h1>${title}</h1>
        <p class="page__lead">${d.mode === 'duel' && opp ? `${esc(mine?.name)} ${mine?.score} : ${opp.score} ${esc(opp.name)}` : d.mode === 'class' ? `Средний балл: команда 1 — ${d.teams.A.avg}, команда 2 — ${d.teams.B.avg}. Твои очки: ${mine?.score ?? 0}` : `Набрано очков: ${mine?.score ?? 0}`}. Верных ответов: ${correct} из ${d.review.length}.</p>
        ${d.mode !== 'solo' ? `<span class="delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero'} num">${delta > 0 ? '+' : ''}${delta} к рейтингу</span>` : ''}
      </div>
      <div class="result__actions">
        ${d.mode === 'duel' ? `<button class="btn" id="rematch">Сыграть ещё раз</button>` : `<a href="/play?mode=${d.mode}" data-link class="btn">Новый баттл</a>`}
        <a href="/rating" data-link class="btn btn--ghost">Рейтинг</a>
      </div>
      ${d.mode === 'class' ? `<h2 style="font-size:22px;margin-bottom:12px">Лучшие игроки</h2><table class="table" style="margin-bottom:36px"><tbody>${d.ranking.slice(0, 10).map((p, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${esc(p.name)}<div class="sub">Команда ${p.team === 'A' ? 1 : 2}</div></td><td class="r">${p.score}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2 style="font-size:22px;margin-bottom:12px">Разбор вопросов</h2>
      <label class="filter"><input type="checkbox" id="onlyMiss" ${correct < d.review.length ? 'checked' : ''}> Показать только ошибки</label>
      <div class="review" id="review"></div>
    </div></div>`;

    const drawReview = () => {
      const only = $('#onlyMiss').checked;
      const items = d.review.map((q, i) => ({ q, i, my: d.mine[i] })).filter(x => !only || x.my !== x.q.a);
      $('#review').innerHTML = items.length ? items.map(({ q, i, my }) => `
        <div class="review__item ${my === q.a ? 'hit' : 'miss'}">
          <div class="muted" style="font-size:13px;margin-bottom:4px">${i + 1}. ${esc(q.s)}</div>
          <h3>${esc(q.t)}</h3>
          <div class="review__ans">
            ${my !== q.a ? `<span class="y">Твой ответ: ${my === null ? 'нет ответа' : esc(q.o[my])}</span>` : ''}
            <span class="c">Правильный ответ: ${esc(q.o[q.a])}</span>
          </div>
          <p class="e">${esc(q.e)}</p>
        </div>`).join('') : `<div class="empty">Ошибок нет — все ответы верные.</div>`;
    };
    $('#onlyMiss').onchange = drawReview; drawReview();

    $('#rematch')?.addEventListener('click', () => {
      const subject = room.subject, from = room.code;
      room = null;
      socket.emit('create', { mode: 'duel', subject }, r => {
        if (!r?.code) return;
        history.replaceState({}, '', `/b/${r.code}`);
        socket.emit('invite', { from, code: r.code });
      });
    });
  }

  // ---------- рейтинг ----------
  function schoolTable(rows) {
    return `<table class="table"><thead><tr><th></th><th>Школа</th><th class="hide-sm">Игроков</th><th class="r">Рейтинг</th></tr></thead><tbody>
      ${rows.map((s, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${esc(s.name)}<div class="sub">${esc(s.city || '')}</div></td><td class="hide-sm num">${s.players}</td><td class="r">${s.rating}</td></tr>`).join('')}
    </tbody></table>`;
  }

  async function viewRating() {
    setTitle('Рейтинг');
    app.innerHTML = `
    <div class="page"><div class="wrap narrow">
      <h1>Рейтинг</h1>
      <p class="page__lead">Рейтинг игрока растёт за победы в дуэлях и командных баттлах. Рейтинг школы и города — средний по их игрокам.</p>
      <div style="margin-top:28px">
        <div class="tabs" role="tablist">
          <button role="tab" data-tab="schools" aria-selected="true">Школы</button>
          <button role="tab" data-tab="players" aria-selected="false">Игроки</button>
          <button role="tab" data-tab="cities" aria-selected="false">Города</button>
        </div>
        <div id="rTable"><p class="muted">Загружаем…</p></div>
      </div>
    </div></div>${footer()}`;
    let data;
    try { data = await fetch('/api/leaders').then(r => r.json()); }
    catch { $('#rTable').innerHTML = `<div class="empty">Рейтинг не загрузился. Обновите страницу.</div>`; return; }
    const draw = tab => {
      app.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
      const rows = data[tab] || [];
      if (!rows.length) { $('#rTable').innerHTML = `<div class="empty">Здесь пока никого. Сыграйте первую дуэль, чтобы попасть в таблицу.<br><a href="/play" data-link class="btn">Сыграть</a></div>`; return; }
      if (tab === 'schools') $('#rTable').innerHTML = schoolTable(rows);
      else if (tab === 'players') $('#rTable').innerHTML = `<table class="table"><thead><tr><th></th><th>Игрок</th><th class="hide-sm">Победы</th><th class="r">Рейтинг</th></tr></thead><tbody>
        ${rows.map((p, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${esc(p.name)}<div class="sub">${esc(p.school)}${p.city ? ', ' + esc(p.city) : ''}</div></td><td class="hide-sm num">${p.wins} из ${p.games}</td><td class="r">${p.rating}</td></tr>`).join('')}</tbody></table>`;
      else $('#rTable').innerHTML = `<table class="table"><thead><tr><th></th><th>Город</th><th class="hide-sm">Игроков</th><th class="r">Рейтинг</th></tr></thead><tbody>
        ${rows.map((c, i) => `<tr class="${i < 3 ? 'top3' : ''}"><td class="pos">${i + 1}</td><td>${esc(c.name)}</td><td class="hide-sm num">${c.players}</td><td class="r">${c.rating}</td></tr>`).join('')}</tbody></table>`;
    };
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => draw(b.dataset.tab));
    draw('schools');
  }

  route();
})();
