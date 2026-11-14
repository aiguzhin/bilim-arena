// Мини-игры: «Блиц», «Выживание», «Верно или нет». Счёт и рекорды дня и недели.
window.GAMES = (() => {
  let X, timer = null;
  const $ = (s, el = document) => el.querySelector(s);
  const T = {
    ru: {
      title: 'Игры', lead: 'Побейте свой рекорд и попадите в топ дня.',
      blitz: ['Блиц', '60 секунд — ответь на как можно больше вопросов. Ошибка не отнимает очки, но съедает время.'],
      survival: ['Выживание', '3 жизни и 20 секунд на вопрос. Сколько продержишься без трёх ошибок?'],
      tf: ['Верно или нет', 'Вопрос и один ответ. Решай за секунду: верно или неверно? 60 секунд.'],
      subject: 'Предмет', play: 'Играть', best: n => `Ваш рекорд: ${n}`, topDay: 'Топ дня', topWeek: 'Топ недели', noTop: 'Сегодня ещё никто не играл — будьте первым.',
      score: 'Счёт', lives: 'Жизни', sec: 'с', yes: 'Верно', no: 'Неверно', right: 'Правильно', wrong: 'Ошибка', answer: 'Ответ',
      over: 'Игра окончена', record: 'Новый рекорд!', yourScore: 'Ваш результат', correct: (a, b) => `Верных ответов: ${a} из ${b}`,
      again: 'Ещё раз', other: 'Другие игры', exit: 'Выйти', claim: 'Ответ:', points: n => `${n}`,
      review: 'Разбор ошибок', mine: 'Ваш ответ', noAns: 'нет ответа', clean: 'Ни одной ошибки', keys: 'Клавиши: 1–4 или A–D', keysTf: 'Клавиши: ← верно, → неверно'
    },
    kk: {
      title: 'Ойындар', lead: 'Рекордыңызды жаңартып, күн топына шығыңыз.',
      blitz: ['Блиц', '60 секунд — мүмкіндігінше көп сұраққа жауап беріңіз. Қате ұпайды азайтпайды, бірақ уақыт алады.'],
      survival: ['Аман қалу', '3 өмір және сұраққа 20 секунд. Үш қатеге дейін қанша шыдайсыз?'],
      tf: ['Дұрыс па, жоқ па', 'Сұрақ және бір жауап. Бір секундта шешіңіз: дұрыс па, қате ме? 60 секунд.'],
      subject: 'Пән', play: 'Ойнау', best: n => `Сіздің рекорд: ${n}`, topDay: 'Күн топы', topWeek: 'Апта топы', noTop: 'Бүгін әлі ешкім ойнамады — бірінші болыңыз.',
      score: 'Ұпай', lives: 'Өмір', sec: 'с', yes: 'Дұрыс', no: 'Қате', right: 'Дұрыс', wrong: 'Қате', answer: 'Жауап',
      over: 'Ойын аяқталды', record: 'Жаңа рекорд!', yourScore: 'Сіздің нәтиже', correct: (a, b) => `Дұрыс жауап: ${b}-ден ${a}`,
      again: 'Тағы ойнау', other: 'Басқа ойындар', exit: 'Шығу', claim: 'Жауап:', points: n => `${n}`,
      review: 'Қателерді талдау', mine: 'Сіздің жауап', noAns: 'жауап жоқ', clean: 'Бірде-бір қате жоқ', keys: 'Пернелер: 1–4 немесе A–D', keysTf: 'Пернелер: ← дұрыс, → қате'
    }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const ICON = {
    blitz: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    survival: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    tf: '<path d="M5 12l4 4 10-10"/>'
  };
  const icon = (k, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const heart = on => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class="g-heart${on ? ' on' : ''}"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;
  let onKey = null;
  const stop = () => { clearInterval(timer); timer = null; if (onKey) { document.removeEventListener('keydown', onKey); onKey = null; } };
  const subjects = () => Object.entries(X.meta().subjects || {});
  const sname = k => { const s = X.meta().subjects[k]; return s ? (s[X.lang()] || s.ru) : k; };
  const saved = () => { try { return localStorage.getItem('ba_gsub') || 'math'; } catch { return 'math'; } };

  // ---------- выбор игры ----------
  async function hub(path) {
    stop();
    X.setTitle(t().title);
    const mode = new URLSearchParams(location.search).get('top') || 'blitz';
    X.app.innerHTML = `<div class="page"><div class="wrap">
      <h1>${t().title}</h1><p class="page__lead">${t().lead}</p>
      <label class="field g-subj">${t().subject}<select id="gSub">${subjects().map(([k]) => `<option value="${k}">${esc(sname(k))}</option>`).join('')}</select></label>
      <div class="g-modes">${['blitz', 'survival', 'tf'].map(m => `<article class="g-mode g-mode--${m}">
        <i>${icon(m, 26)}</i><h3>${t()[m][0]}</h3><p>${t()[m][1]}</p>
        <button class="btn" data-play="${m}">${t().play}</button></article>`).join('')}</div>
      <div class="g-top"><div class="tabs-sm" role="tablist">${['blitz', 'survival', 'tf'].map(m => `<button role="tab" data-top="${m}" aria-selected="${m === mode}">${t()[m][0]}</button>`).join('')}</div>
      <div class="g-top__grid"><section><h3>${t().topDay}</h3><div id="gDay"></div></section><section><h3>${t().topWeek}</h3><div id="gWeek"></div></section></div></div>
    </div></div>${X.footer()}`;
    const sel = $('#gSub'); sel.value = X.meta().subjects[saved()] ? saved() : sel.value;
    sel.onchange = () => { try { localStorage.setItem('ba_gsub', sel.value); } catch {} };
    X.app.querySelectorAll('[data-play]').forEach(b => b.onclick = () => play(b.dataset.play, sel.value));
    X.app.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { X.app.querySelectorAll('[data-top]').forEach(x => x.setAttribute('aria-selected', x === b)); top(b.dataset.top); });
    top(mode);
  }
  async function top(mode) {
    let d; try { d = await X.api('/api/mini/top?mode=' + mode); } catch { return; }
    const list = rows => rows.length ? `<ol class="g-list">${rows.map((r, i) => `<li><span class="num g-pl">${i + 1}</span><a href="/u/${esc(r.username)}" data-link class="g-who">${ACC.avatar({ ...r, photo: r.photo_v ? `/p/${r.username}?v=${String(r.photo_v).slice(0, 8)}` : null }, 'sm')}<span><b>${esc(r.name)}</b><small>${esc(schoolName(r.school))}</small></span></a><b class="num">${r.score}</b></li>`).join('')}</ol>` : `<p class="muted">${t().noTop}</p>`;
    if ($('#gDay')) { $('#gDay').innerHTML = list(d.today); $('#gWeek').innerHTML = list(d.week); }
  }

  // ---------- игра ----------
  async function play(mode, subject) {
    stop();
    let s; try { s = await X.api('/api/mini/start', { method: 'POST', body: { mode, subject, lang: X.lang() } }); } catch { return; }
    X.setTitle(t()[mode][0]);
    let busy = false, cur = null;
    const miss = [];
    X.app.innerHTML = `<div class="page g-play"><div class="wrap narrow">
      <div class="g-bar"><button class="btn btn--ghost btn--sm" id="gExit">${t().exit}</button><span class="g-name">${icon(mode, 18)} ${t()[mode][0]} · ${esc(sname(subject))}</span>
        <span class="g-stat"><span id="gLives"></span><b class="num" id="gScore">0</b></span></div>
      <div class="timer g-timer"><i id="gTime"></i></div><div class="g-clock num" id="gClock"></div>
      <div class="g-card" id="gCard"></div>
      <p class="g-keys muted">${mode === 'tf' ? t().keysTf : t().keys}</p>
    </div></div>`;
    $('#gExit').onclick = async () => { stop(); try { await X.api('/api/mini/finish', { method: 'POST', body: { id: s.id } }); } catch {} hub(); };
    const total = mode === 'survival' ? 20000 : 60000;
    const tick = () => {
      const end = mode === 'survival' ? s.qEndsAt : s.endsAt;
      const left = Math.max(0, end - Date.now());
      const bar = $('#gTime'); if (!bar) return stop();
      bar.style.transform = `scaleX(${left / total})`; bar.classList.toggle('low', left < (mode === 'survival' ? 5000 : 10000));
      $('#gClock').textContent = `${Math.ceil(left / 1000)} ${t().sec}`;
      if (left <= 0 && !busy) { if (mode === 'survival') send({ choice: -1 }); else end_(); }
    };
    const head = () => {
      $('#gScore').textContent = s.score;
      $('#gLives').innerHTML = mode === 'survival' ? [0, 1, 2].map(i => heart(i < s.lives)).join('') : '';
    };
    const draw = q => {
      cur = q;
      const card = $('#gCard');
      card.innerHTML = `<div class="g-q"><span class="muted g-n">#${q.n}</span><p>${esc(q.t).replace(/\n/g, '<br>')}</p>${q.img ? `<div class="qfig">${q.img}</div>` : ''}</div>
        ${mode === 'tf' ? `<div class="g-claim"><span>${t().claim}</span><b>${esc(q.claim)}</b></div><div class="g-tf"><button class="g-opt g-opt--yes" data-tf="1">${t().yes}</button><button class="g-opt g-opt--no" data-tf="0">${t().no}</button></div>`
          : `<div class="g-opts">${q.o.map((o, i) => `<button class="g-opt" data-c="${i}"><span>${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}</div>`}`;
      card.querySelectorAll('[data-c]').forEach(b => b.onclick = () => send({ choice: +b.dataset.c }, b));
      card.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => send({ tf: b.dataset.tf === '1' }, b));
    };
    async function send(body, btn) {
      if (busy) return; busy = true;
      let r; try { r = await X.api('/api/mini/answer', { method: 'POST', body: { id: s.id, ...body } }); } catch { busy = false; return; }
      const card = $('#gCard'); if (!card) return;
      if (r.reveal) {
        if (!r.reveal.ok && cur) miss.push(mode === 'tf'
          ? { t: cur.t, img: cur.img, mine: `${cur.claim} — ${body.tf ? t().yes : t().no}`.toLowerCase(), right: r.reveal.right, e: r.reveal.e }
          : { t: cur.t, img: cur.img, mine: cur.o[body.choice] ?? t().noAns, right: cur.o[r.reveal.a], e: r.reveal.e });
        if (mode === 'tf') { btn?.classList.add(r.reveal.ok ? 'ok' : 'no'); if (!r.reveal.ok) card.insertAdjacentHTML('beforeend', `<p class="g-right">${t().answer}: <b>${esc(r.reveal.right)}</b></p>`); }
        else { card.querySelector(`[data-c="${r.reveal.a}"]`)?.classList.add('ok'); if (!r.reveal.ok && btn) btn.classList.add('no'); }
        card.classList.add(r.reveal.ok ? 'g-flash-ok' : 'g-flash-no');
      }
      Object.assign(s, r); head();
      const wait = r.reveal?.ok ? (mode === 'survival' ? 500 : 280) : (mode === 'survival' ? 1500 : 900);
      setTimeout(() => {
        if (r.done) return result(mode, subject, r.result, miss);
        card.classList.remove('g-flash-ok', 'g-flash-no');
        draw(r.q); busy = false;
      }, wait);
    }
    async function end_() { stop(); busy = true; try { const r = await X.api('/api/mini/finish', { method: 'POST', body: { id: s.id } }); result(mode, subject, r.result, miss); } catch { hub(); } }
    onKey = e => {
      if (busy || e.metaKey || e.ctrlKey || e.altKey || !$('#gCard')) return;
      const k = e.key.toLowerCase();
      if (mode === 'tf') { const b = k === 'arrowleft' || k === 'y' ? '1' : k === 'arrowright' || k === 'n' ? '0' : null; if (b) { e.preventDefault(); const el = $(`[data-tf="${b}"]`); send({ tf: b === '1' }, el); } return; }
      const i = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
      if (i >= 0) { const el = $(`[data-c="${i}"]`); if (el) { e.preventDefault(); send({ choice: i }, el); } }
    };
    document.addEventListener('keydown', onKey);
    head(); draw(s.q); timer = setInterval(tick, 200); tick();
  }

  function result(mode, subject, r, miss = []) {
    stop();
    const review = r.answered ? `<section class="g-review"><h2>${t().review}</h2>${miss.length ? miss.map(m => `<article class="g-rev">
        <p>${esc(m.t).replace(/\n/g, '<br>')}</p>${m.img ? `<div class="qfig">${m.img}</div>` : ''}
        <div class="g-rev__a"><span class="no">${t().mine}: ${esc(m.mine)}</span><span class="ok">${t().answer}: ${esc(m.right)}</span></div>
        ${m.e ? `<p class="muted g-rev__e">${esc(m.e)}</p>` : ''}</article>`).join('') : `<p class="muted">${t().clean}</p>`}</section>` : '';
    X.app.innerHTML = `<div class="page"><div class="wrap narrow"><div class="g-result">
      <i class="g-result__ico">${icon(mode, 30)}</i><p class="muted">${t().over} · ${t()[mode][0]}</p>
      ${r.record && r.score ? `<p class="g-record">${t().record}</p>` : ''}
      <div class="g-result__score num">${r.score}</div><p>${t().correct(r.correct, r.answered)}</p><p class="muted">${t().best(r.best)}</p>
      <div class="g-result__btns"><button class="btn" id="gAgain">${t().again}</button><a class="btn btn--ghost" href="/games?top=${mode}" data-link>${t().other}</a></div>
    </div>${review}</div></div>${X.footer()}`;
    $('#gAgain').onclick = () => { X.onCleanup(stop); play(mode, subject); };
  }

  function init(ctx) { X = ctx; }
  return { init, view: p => { X.onCleanup(stop); return hub(p); }, stop };
})();
