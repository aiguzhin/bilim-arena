// Пробный ЕНТ: выбор комбинации, экран теста, результат и разбор.
window.ENT = (() => {
  let X; // контекст сайта: api, esc, pick, L, lang, meta, go, setTitle, toast, onCleanup, footer
  const LET = ['A', 'B', 'C', 'D', 'E', 'F'];
  let test = null;          // загруженный тест
  let pos = { s: 0, i: 0 }; // текущее задание
  let marks = new Set();
  let dirty = false, saveT = null, offset = 0, tickT = null, warned5 = false;
  let reviewSec = 0;
  // Уходы со страницы во время теста: число и общее время. Учитель видит это при проверке результата.
  let meta = { hidden: 0, hiddenMs: 0 }, hidAt = 0;

  const $ = (s, el = document) => el.querySelector(s);
  // Экран теста — на языке сдачи (test.lang), страница выбора — на языке сайта.
  const E = () => (test && window.I18N[test.lang]?.ent) || X.L().ent;
  const pk = o => (test && o && typeof o === 'object' ? (o[test.lang] ?? o.ru) : X.pick(o));
  const key = (s, i) => `${test.sections[s].k}.${i}`;
  const lsKey = id => `ba_ent_${id}`;
  const lsGet = id => { try { return JSON.parse(localStorage.getItem(lsKey(id)) || 'null'); } catch { return null; } };
  const lsSet = (id, v) => { try { localStorage.setItem(lsKey(id), JSON.stringify(v)); } catch {} };
  const lsDel = id => { try { localStorage.removeItem(lsKey(id)); } catch {} };
  const nameOf = k => pk(X.meta().subjects[k]) || k;
  const comboName = c => { const [a, b] = X.meta().combos[c] || []; return a ? `${nameOf(a)} — ${nameOf(b)}` : c; };
  const fmt = (t, x = X.esc(t)) => x.replace(/\n/g, '<br>');

  function answered(v) {
    if (v == null) return false;
    if (Array.isArray(v)) return v.some(x => x != null);
    return true;
  }

  // ---------- старт ----------
  async function viewStart() {
    X.setTitle(E().title);
    const combos = Object.keys(X.meta().combos);
    let saved = null; try { saved = localStorage.getItem('ba_ent_combo'); } catch {}
    const sel = combos.includes(saved) ? saved : combos[0];
    setTimeout(() => window.SES?.banner(document.getElementById('sesBanner')), 0);
    const row = (n, t, p, m) => `<tr><td>${n}</td><td class="num">${t}</td><td class="num">${p}</td><td class="num">${m}</td></tr>`;
    X.app.innerHTML = `
    <div class="page"><div class="wrap">
      <div class="ent-start">
        <div>
          <h1>${E().title}</h1>
          <p class="page__lead">${E().lead}</p>
          <div id="sesBanner"></div>
          <div id="entActive"></div>
          <form id="entForm" class="ent-pick">
            <h2 class="ent-pick__h">${E().nowTitle}</h2>
            <div class="choose__label">${E().pick}</div>
            <div class="combos combos--ent">
              ${combos.map(c => `<label><input type="radio" name="combo" value="${c}" ${c === sel ? 'checked' : ''}><div class="opt">${X.esc(comboName(c))}</div></label>`).join('')}
            </div>
            <p class="form-error" id="entErr" role="alert"></p>
            <button class="btn" id="entGo">${E().start}</button>
          </form>
        </div>
        <aside class="ent-spec">
          <h2>${E().structure}</h2>
          <table class="table table--spec">
            <thead><tr><th>${E().colSubject}</th><th>${E().colTasks}</th><th>${E().colPoints}</th><th>${E().colMin}</th></tr></thead>
            <tbody>
              ${row(E().history, 20, 20, 5)}${row(E().mathlit, 10, 10, 3)}${row(E().reading, 10, 10, 3)}
              ${row(E().profile1, 40, 50, 5)}${row(E().profile2, 40, 50, 5)}
            </tbody>
            <tfoot><tr><td>${E().total}</td><td class="num">120</td><td class="num">140</td><td class="num">50</td></tr></tfoot>
          </table>
          <p class="hint">${E().profileNote}</p>
        </aside>
      </div>
      <section class="ent-past">
        <h2>${E().past}</h2>
        <div id="entPast" class="muted">…</div>
      </section>
    </div></div>${X.footer()}`;

    $('#entForm').onsubmit = async e => {
      e.preventDefault();
      const combo = $('#entForm').elements.combo.value;
      try { localStorage.setItem('ba_ent_combo', combo); } catch {}
      await create(combo, false);
    };

    X.api('/api/ent/active').then(r => {
      if (!r.id || !$('#entActive')) return;
      $('#entActive').innerHTML = `<div class="ent-banner"><div><b>${E().active}</b><span>${X.esc(comboName(r.combo))}. ${E().activeText}</span></div>
        <div class="ent-banner__btns"><a class="btn btn--sm" href="/ent/${r.id}" data-link>${E().resume}</a></div></div>`;
      $('#entGo').textContent = E().restart;
      $('#entForm').onsubmit = async e => {
        e.preventDefault();
        if (!confirm(E().restartConfirm)) return;
        await create($('#entForm').elements.combo.value, true);
      };
    }).catch(() => {});

    X.api('/api/ent').then(r => {
      const box = $('#entPast'); if (!box) return;
      if (!r.tests.length) { box.textContent = E().pastEmpty; return; }
      box.classList.remove('muted');
      box.innerHTML = `<table class="table"><tbody>${r.tests.map(t => `<tr>
        <td>${fmtDate(t.finished_at, X.lang())}</td>
        <td>${X.esc(comboName(t.combo))}${t.lang ? ` <span class="chip">${(t.lang || '').toUpperCase()}</span>` : ''}</td>
        <td class="num"><b>${t.score}</b> / ${t.result?.max ?? 140}</td>
        <td><a href="/ent/${t.id}" data-link>${E().open}</a></td></tr>`).join('')}</tbody></table>`;
    }).catch(() => { const b = $('#entPast'); if (b) b.textContent = ''; });
  }

  async function create(combo, restart) {
    const lang = await X.chooseLang();
    if (!lang) return;
    const btn = $('#entGo'), err = $('#entErr');
    btn.disabled = true; btn.textContent = E().starting; err.textContent = '';
    try {
      const r = await X.api('/api/ent', { method: 'POST', body: { combo, restart, lang } });
      test = null; X.go(`/ent/${r.id}`);
    } catch (x) { err.textContent = X.L().err[x.code] || X.L().err.server; btn.disabled = false; btn.textContent = E().start; }
  }

  // ---------- тест ----------
  async function viewTest(id) {
    if (!test || test.id !== id) {
      X.app.innerHTML = `<div class="page"><div class="wrap"><p class="muted">…</p></div></div>`;
      try { test = await X.api(`/api/ent/${id}`); }
      catch (x) { X.app.innerHTML = `<div class="page"><div class="wrap"><h1>${E().notFound}</h1><p style="margin-top:20px"><a class="btn" href="/ent" data-link>${E().title}</a></p></div></div>`; return; }
      offset = test.now - Date.now();
      pos = { s: 0, i: 0 }; marks = new Set(); reviewSec = 0; warned5 = false; meta = { hidden: 0, hiddenMs: 0 }; hidAt = 0;
      if (!test.done) {
        const local = lsGet(id);
        if (local) {
          test.answers = { ...test.answers, ...(local.answers || {}) };
          marks = new Set(local.marks || []);
          if (local.meta) meta = { hidden: +local.meta.hidden || 0, hiddenMs: +local.meta.hiddenMs || 0 };
          if (local.pos && test.sections[local.pos.s]?.items[local.pos.i]) pos = local.pos;
          dirty = true;
        }
      }
    }
    if (test.done) return viewResult();
    X.setTitle(E().title);
    document.body.classList.add('in-exam');
    X.onCleanup(() => { document.body.classList.remove('in-exam'); clearInterval(tickT); flush(); });

    X.app.innerHTML = `
    <div class="exam">
      <div class="exam__bar"><div class="wrap exam__bar-in">
        <div class="exam__combo">${X.esc(comboName(test.combo))} <span class="exam__lang">${X.LANGN[test.lang] || ''}</span></div>
        <div class="exam__right">
          <span class="exam__save" id="exSave"></span>
          <button class="exam__tool" id="exRef" hidden title="${E().refs}" aria-label="${E().refs}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/></svg><span>${E().refsShort}</span></button>
          <button class="exam__tool" id="exFont" title="${E().fontSize}" aria-label="${E().fontSize}"><b>A</b><small>A</small></button>
          <span class="exam__timer num" id="exTimer" role="timer">--:--:--</span>
          <button class="btn btn--sm btn--light" id="exFinish">${E().finish}</button>
        </div>
      </div></div>
      <div class="wrap">
        <div class="exam__tabs" role="tablist" id="exTabs"></div>
        <div class="exam__body">
          <main class="exam__main" id="exMain"></main>
          <aside class="exam__sheet"><div class="exam__sheet-h">${E().sheet}</div><div id="exGrid" class="exgrid"></div>
            <div class="exlegend"><span><i class="is-ans"></i>${E().lAnswered}</span><span><i class="is-mark"></i>${E().lMarked}</span><span><i></i>${E().lEmpty}</span></div>
          </aside>
        </div>
      </div>
    </div>
    <dialog class="dlg" id="exDlg"><div class="dlg__body">
      <h2>${E().finishTitle}</h2><p class="muted" id="exLeft"></p>
      <div class="dlg__actions"><button class="btn btn--ghost" id="exNo">${E().finishNo}</button><button class="btn" id="exYes">${E().finishYes}</button></div>
    </div></dialog>`;

    $('#exFinish').onclick = () => {
      const per = test.sections.map((sec, s) => [pk(sec.name), sec.items.filter((_, i) => !answered(test.answers[key(s, i)])).length, sec.items.length]);
      const left = per.reduce((n, x) => n + x[1], 0);
      $('#exLeft').innerHTML = (left ? X.esc(E().finishLeft(left)) : X.esc(E().finishAll))
        + `<table class="exleft">${per.map(([n, l, all]) => `<tr class="${l ? 'is-left' : ''}"><td>${X.esc(n)}</td><td class="num">${all - l} / ${all}</td></tr>`).join('')}</table>`;
      $('#exDlg').showModal();
    };
    // Размер шрифта заданий: обычный → крупный → очень крупный.
    const FS = ['', 'lg', 'xl'];
    let fsi = 0; try { fsi = Math.max(0, FS.indexOf(localStorage.getItem('ba_exfs') || '')); } catch {}
    const applyFs = () => { document.querySelector('.exam').dataset.fs = FS[fsi]; };
    applyFs();
    $('#exFont').onclick = () => { fsi = (fsi + 1) % FS.length; applyFs(); try { localStorage.setItem('ba_exfs', FS[fsi]); } catch {} };
    $('#exRef').onclick = () => window.REFS?.open(test.lang);
    $('#exNo').onclick = () => $('#exDlg').close();
    $('#exYes').onclick = () => { $('#exDlg').close(); finish(); };
    $('#exTabs').onclick = e => { const b = e.target.closest('[data-s]'); if (b) goTo(+b.dataset.s, 0); };
    $('#exGrid').onclick = e => { const b = e.target.closest('[data-i]'); if (b) goTo(pos.s, +b.dataset.i); };
    const onKey = e => {
      if (e.target.closest('input, textarea') || $('#exDlg')?.open) return;
      if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    const onHide = () => {
      if (!test || test.done) return;
      if (document.visibilityState === 'hidden') { hidAt = Date.now(); meta.hidden += 1; persistLocal(); dirty = true; flush(); }
      else if (hidAt) { meta.hiddenMs += Date.now() - hidAt; hidAt = 0; persistLocal(); queueSave(); }
    };
    document.addEventListener('visibilitychange', onHide);
    X.onCleanup(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHide); });

    tickT = setInterval(tick, 1000); tick();
    renderAll();
    if (dirty) queueSave();
  }

  function tick() {
    const left = test.endsAt - (Date.now() + offset);
    const el = $('#exTimer'); if (!el) return;
    if (left <= 0) { el.textContent = '00:00:00'; clearInterval(tickT); X.toast(E().timeUp); finish(); return; }
    const s = Math.floor(left / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    let hide = false; try { hide = localStorage.getItem('ba_timer') === 'hide'; } catch {}
    el.textContent = hide && left >= 5 * 60 * 1000 ? '••:••' : [h, m, ss].map(n => String(n).padStart(2, '0')).join(':');
    el.classList.toggle('is-low', left < 5 * 60 * 1000);
    if (left < 5 * 60 * 1000 && !warned5) { warned5 = true; X.toast(E().last5); }
  }

  function renderAll() { renderTabs(); renderGrid(); renderQuestion(); }

  function renderTabs() {
    $('#exTabs').innerHTML = test.sections.map((sec, s) => {
      const done = sec.items.filter((_, i) => answered(test.answers[key(s, i)])).length;
      return `<button role="tab" data-s="${s}" aria-selected="${s === pos.s}"><span>${X.esc(pk(sec.name))}</span><b class="num">${done}/${sec.items.length}</b></button>`;
    }).join('');
  }

  function renderGrid() {
    const sec = test.sections[pos.s];
    $('#exGrid').innerHTML = sec.items.map((_, i) => {
      const cls = [answered(test.answers[key(pos.s, i)]) && 'is-ans', marks.has(key(pos.s, i)) && 'is-mark', i === pos.i && 'is-cur'].filter(Boolean).join(' ');
      return `<button data-i="${i}" class="${cls}" aria-label="${i + 1}">${i + 1}</button>`;
    }).join('');
  }

  function typeLabel(q) {
    if (q.type === 'm') return [E().tMulti, E().points(2)];
    if (q.type === 'p') return [E().tMatch, E().points(2)];
    if (q.type === 'c') return [E().tContext, E().points(1)];
    return [E().tSingle, E().points(1)];
  }

  function renderQuestion() {
    const sec = test.sections[pos.s], q = sec.items[pos.i], k = key(pos.s, pos.i), v = test.answers[k];
    const main = $('#exMain');
    // Таблицы Менделеева и растворимости — как на ЕНТ, на предмете «Химия».
    const ref = $('#exRef'); if (ref) ref.hidden = sec.k !== 'chemistry';
    if (q.gone) { main.innerHTML = `<p class="muted">${E().gone}</p>${navHtml(sec)}`; bindNav(); return; }
    const [tl, pts] = typeLabel(q);
    const opts = pk(q.o);
    let body = '';
    if (q.type === 'p') {
      const left = pk(q.l);
      body = `<div class="match">
        <div class="match__cols">
          <ol class="match__left">${left.map((t, j) => `<li><b>${LET[j]}</b><span>${fmt(t)}</span></li>`).join('')}</ol>
          <ol class="match__right">${opts.map((t, j) => `<li><b>${j + 1}</b><span>${fmt(t)}</span></li>`).join('')}</ol>
        </div>
        <div class="match__pick">${left.map((_, j) => `<div class="match__row"><b>${LET[j]}</b>${opts.map((__, n) =>
          `<button class="mbtn" data-l="${j}" data-n="${n}" aria-pressed="${Array.isArray(v) && v[j] === n}">${n + 1}</button>`).join('')}</div>`).join('')}</div>
      </div>`;
    } else {
      const multi = q.type === 'm';
      const on = n => (multi ? Array.isArray(v) && v.includes(n) : v === n);
      body = `<div class="eopts ${multi ? 'eopts--multi' : ''}" role="${multi ? 'group' : 'radiogroup'}">${opts.map((t, n) =>
        `<button class="eopt" data-n="${n}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on(n)}"><b>${LET[n]}</b><span>${fmt(t)}</span></button>`).join('')}</div>`;
    }
    main.innerHTML = `
      <div class="eq__head">
        <span class="eq__n">${E().task(pos.i + 1, sec.items.length)}</span>
        <span class="eq__type">${tl} · ${pts}</span>
        <button class="eq__mark" id="exMark" aria-pressed="${marks.has(k)}">${marks.has(k) ? E().marked : E().mark}</button>
      </div>
      ${q.ctx ? `<div class="eq__ctx">${fmt(pk(q.ctx))}${q.cimg ? `<figure class="qfig">${q.cimg}</figure>` : ''}</div>` : ''}
      <div class="eq__text">${fmt(pk(q.t))}</div>
      ${q.img ? `<figure class="qfig">${q.img}</figure>` : ''}
      ${body}
      ${navHtml(sec)}`;

    main.querySelectorAll('.eopt').forEach(b => b.onclick = () => {
      const n = +b.dataset.n;
      if (q.type === 'm') {
        const cur = Array.isArray(test.answers[k]) ? test.answers[k].slice() : [];
        const at = cur.indexOf(n); at >= 0 ? cur.splice(at, 1) : cur.push(n);
        if (cur.length) test.answers[k] = cur.sort(); else delete test.answers[k];
      } else test.answers[k] = n;
      if (test.answers[k] === undefined) delete test.answers[k];
      changed();
    });
    main.querySelectorAll('.mbtn').forEach(b => b.onclick = () => {
      const j = +b.dataset.l, n = +b.dataset.n;
      const cur = Array.isArray(test.answers[k]) ? test.answers[k].slice() : pk(q.l).map(() => null);
      cur[j] = cur[j] === n ? null : n;
      if (cur.some(x => x != null)) test.answers[k] = cur; else delete test.answers[k];
      changed();
    });
    $('#exMark').onclick = () => { marks.has(k) ? marks.delete(k) : marks.add(k); persistLocal(); renderGrid(); renderQuestion(); };
    bindNav();
  }

  function navHtml(sec) {
    const last = pos.s === test.sections.length - 1 && pos.i === sec.items.length - 1;
    return `<div class="eq__nav">
      <button class="btn btn--ghost" id="exPrev" ${pos.s === 0 && pos.i === 0 ? 'disabled' : ''}>${E().prev}</button>
      ${last ? `<button class="btn" id="exEnd">${E().finish}</button>` : `<button class="btn" id="exNext">${E().next}</button>`}
    </div>`;
  }
  function bindNav() {
    const p = $('#exPrev'), n = $('#exNext'), end = $('#exEnd');
    if (p) p.onclick = () => step(-1);
    if (n) n.onclick = () => step(1);
    if (end) end.onclick = () => $('#exFinish').click();
  }
  function step(d) {
    let { s, i } = pos; i += d;
    if (i >= test.sections[s].items.length) { if (s + 1 >= test.sections.length) return; s++; i = 0; }
    if (i < 0) { if (s === 0) return; s--; i = test.sections[s].items.length - 1; }
    goTo(s, i);
  }
  function goTo(s, i) {
    const tabChanged = s !== pos.s;
    pos = { s, i }; persistLocal();
    if (tabChanged) renderTabs();
    renderGrid(); renderQuestion();
    $('#exMain')?.scrollIntoView({ block: 'nearest' });
    if (window.scrollY > 200) window.scrollTo({ top: 0 });
  }

  function changed() { persistLocal(); renderTabs(); renderGrid(); renderQuestion(); queueSave(); }
  function persistLocal() { if (test && !test.done) lsSet(test.id, { answers: test.answers, marks: [...marks], pos, meta }); }
  function setSave(t) { const el = $('#exSave'); if (el) el.textContent = t; }
  function queueSave() { dirty = true; setSave(E().saving); clearTimeout(saveT); saveT = setTimeout(flush, 1200); }
  async function flush() {
    clearTimeout(saveT);
    if (!dirty || !test || test.done) return;
    dirty = false;
    try { await X.api(`/api/ent/${test.id}`, { method: 'PUT', body: { answers: test.answers, meta } }); setSave(E().saved); }
    catch (x) { if (x.code === 'finished') { test = null; return; } dirty = true; setSave(E().offline); clearTimeout(saveT); saveT = setTimeout(flush, 10000); }
  }

  async function finish() {
    if (!test || test.done) return;
    clearTimeout(saveT); clearInterval(tickT);
    const id = test.id;
    try {
      test = await X.api(`/api/ent/${id}/finish`, { method: 'POST', body: { answers: test.answers, meta } });
      lsDel(id); reviewSec = 0;
      document.body.classList.remove('in-exam');
      window.scrollTo(0, 0);
      viewResult();
    } catch { X.toast(X.L().err.server); tickT = setInterval(tick, 1000); }
  }

  // ---------- результат ----------
  function viewResult() {
    document.body.classList.remove('in-exam');
    X.setTitle(E().resultTitle);
    const r = test.result;
    const sname = k => pk(test.sections.find(s => s.k === k)?.name);
    X.app.innerHTML = `
    <div class="page"><div class="wrap">
      ${test.session ? certificate(r, sname) : ''}
      <div class="eres" ${test.session ? 'hidden' : ''}>
        <div class="eres__main">
          <p class="eres__combo">${X.esc(comboName(test.combo))} · ${X.LANGN[test.lang] || ''}</p>
          <h1>${E().resultTitle}</h1>
          <div class="eres__score"><b class="num">${r.total}</b><span>${E().of} ${r.max}</span></div>
          <p class="eres__verdict ${r.pass ? 'is-ok' : 'is-bad'}">${r.pass ? E().passAll : E().failAll}</p>
          <p class="hint">${E().passNote}</p>
          ${test.flag ? `<p class="eres__flag">${E().flagged(test.flag)}</p>` : ''}
        </div>
        <table class="table eres__table">
          <thead><tr><th>${E().colSubject}</th><th>${E().colScore}</th><th>${E().colRight}</th><th>${E().colMin}</th></tr></thead>
          <tbody>${r.subjects.map(s => `<tr class="${s.pass ? '' : 'is-fail'}">
            <td>${X.esc(sname(s.k))}<div class="ebar"><i style="width:${Math.round(100 * s.score / s.max)}%"></i></div></td>
            <td class="num"><b>${s.score}</b> / ${s.max}</td><td class="num">${s.right} / ${s.count}</td><td class="num">${s.min}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="eres__actions">${test.session ? `<a class="btn" href="/ent/s/${test.session.id}" data-link>${C().sessResults}</a><button class="btn btn--ghost" id="certPrint">${C().print}</button>` : `<a class="btn" href="/ent" data-link>${E().again}</a>`}</div>
      <section class="ereview">
        <h2>${E().review}</h2>
        <div class="tabs-sm ereview__tabs" role="tablist">${test.sections.map((sec, s) => `<button role="tab" data-s="${s}" aria-selected="${s === reviewSec}">${X.esc(pk(sec.name))}</button>`).join('')}</div>
        <div id="erList"></div>
      </section>
    </div></div>${X.footer()}`;
    const pr = $('#certPrint'); if (pr) pr.onclick = () => window.print();
    $('.ereview__tabs').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; reviewSec = +b.dataset.s; document.querySelectorAll('.ereview__tabs [data-s]').forEach(x => x.setAttribute('aria-selected', x === b)); renderReview(); };
    renderReview();
  }

  // Результат сессионного пробного ЕНТ — в виде сертификата: ИКТ, данные, таблица баллов и порогов.
  const CT = {
    ru: { kicker: 'Пробное Единое национальное тестирование', title: 'Сертификат участника', ikt: 'ИКТ', fio: 'Фамилия, имя', date: 'Дата тестирования', lang: 'Язык тестирования', profile: 'Профильные предметы', school: 'Школа',
      n: '№', subj: 'Предмет', min: 'Порог', got: 'Балл', total: 'Итого', of: 'из', passed: 'Пороговый балл набран — по результатам можно участвовать в конкурсе на грант', failed: 'Пороговый балл не набран: нужно 50 баллов в сумме и не ниже порога по каждому предмету',
      note: 'Сертификат пробного тестирования на платформе Bilim Arena. Не является официальным документом Национального центра тестирования.', sessResults: 'Результаты всех участников', print: 'Распечатать или сохранить PDF' },
    kk: { kicker: 'Сынақ Ұлттық бірыңғай тестілеу', title: 'Қатысушы сертификаты', ikt: 'ТЖК', fio: 'Тегі, аты', date: 'Тестілеу күні', lang: 'Тестілеу тілі', profile: 'Бейіндік пәндер', school: 'Мектеп',
      n: '№', subj: 'Пән', min: 'Шек', got: 'Балл', total: 'Барлығы', of: '/', passed: 'Шекті балл жиналды — нәтиже бойынша грант конкурсына қатысуға болады', failed: 'Шекті балл жиналмады: жалпы 50 балл және әр пән бойынша шектен төмен болмауы керек',
      note: 'Bilim Arena платформасындағы сынақ тестілеудің сертификаты. Ұлттық тестілеу орталығының ресми құжаты емес.', sessResults: 'Барлық қатысушылардың нәтижелері', print: 'Басып шығару немесе PDF сақтау' }
  };
  const C = () => CT[X.lang()] || CT.ru;
  function certificate(r, sname) {
    const c = C(), w = test.who || {};
    const d = new Date(test.session.startsAt);
    const profile = test.sections.slice(3).map(sec => pk(sec.name)).join(', ');
    return `<section class="cert">
      <header class="cert__head"><span class="cert__logo" aria-hidden="true">A</span><div><span class="cert__kicker">${c.kicker}</span><h1>${c.title}</h1></div>
        <div class="cert__ikt"><span>${c.ikt}</span><b class="num">${X.esc(test.session.ikt || '—')}</b></div></header>
      <dl class="cert__grid">
        <div><dt>${c.fio}</dt><dd>${X.esc(w.name || '')}</dd></div>
        <div><dt>${c.date}</dt><dd>${fmtDate(d.toISOString(), X.lang(), true)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</dd></div>
        <div><dt>${c.lang}</dt><dd>${X.LANGN[test.lang] || ''}</dd></div>
        <div><dt>${c.profile}</dt><dd>${X.esc(profile)}</dd></div>
        <div class="cert__wide"><dt>${c.school}</dt><dd>${X.esc(w.school || '')}${w.city ? ', ' + X.esc(X.cityName ? X.cityName(w.city) : w.city) : ''}</dd></div>
      </dl>
      <table class="cert__table"><thead><tr><th>${c.n}</th><th>${c.subj}</th><th class="r">${c.min}</th><th class="r">${c.got}</th></tr></thead>
        <tbody>${r.subjects.map((s, i) => `<tr class="${s.pass ? '' : 'is-fail'}"><td class="num">${i + 1}</td><td>${X.esc(sname(s.k))}</td><td class="r num">${s.min}</td><td class="r num"><b>${s.score}</b> <span class="muted">${c.of} ${s.max}</span></td></tr>`).join('')}</tbody>
        <tfoot><tr><td></td><td>${c.total}</td><td class="r num">50</td><td class="r num"><b>${r.total}</b> <span class="muted">${c.of} ${r.max}</span></td></tr></tfoot></table>
      <p class="cert__verdict ${r.pass ? 'is-ok' : 'is-bad'}">${r.pass ? c.passed : c.failed}</p>
      ${test.flag ? `<p class="eres__flag">${E().flagged(test.flag)}</p>` : ''}
      <p class="cert__note">${c.note}</p>
    </section>`;
  }

  function renderReview() {
    const sec = test.sections[reviewSec];
    const fmtAns = (q, v) => {
      if (v == null || (Array.isArray(v) && !v.some(x => x != null))) return `<i>${E().noAnswer}</i>`;
      if (q.type === 'p') return v.map((x, j) => `${LET[j]}–${x == null ? '?' : x + 1}`).join(', ');
      if (Array.isArray(v)) return v.map(x => LET[x]).join(', ');
      return LET[v];
    };
    $('#erList').innerHTML = sec.items.map((q, i) => {
      if (q.gone) return `<div class="review__item"><p class="muted">${i + 1}. ${E().gone}</p></div>`;
      const v = test.answers[`${sec.k}.${i}`];
      const state = q.got === q.max ? 'ok' : q.got > 0 ? 'part' : 'bad';
      const opts = pk(q.o);
      const right = q.type === 'p' ? q.a : Array.isArray(q.a) ? q.a : [q.a];
      return `<article class="ritem ritem--${state}">
        <div class="ritem__head"><b>${i + 1}</b><span class="num">${q.got} / ${q.max}</span></div>
        ${q.ctx && (i === 0 || sec.items[i - 1].c !== q.c) ? `<div class="eq__ctx">${fmt(pk(q.ctx))}${q.cimg ? `<figure class="qfig">${q.cimg}</figure>` : ''}</div>` : ''}
        <p class="ritem__q">${fmt(pk(q.t))}</p>
        ${q.img ? `<figure class="qfig qfig--sm">${q.img}</figure>` : ''}
        ${q.type === 'p' ? `<div class="match__cols match__cols--sm">
            <ol class="match__left">${pk(q.l).map((t, j) => `<li><b>${LET[j]}</b><span>${fmt(t)}</span></li>`).join('')}</ol>
            <ol class="match__right">${opts.map((t, j) => `<li><b>${j + 1}</b><span>${fmt(t)}</span></li>`).join('')}</ol></div>`
          : `<ul class="ritem__opts">${opts.map((t, n) => `<li class="${right.includes(n) ? 'is-right' : ''}"><b>${LET[n]}</b>${fmt(t)}</li>`).join('')}</ul>`}
        <p class="ritem__ans"><span>${E().your}: <b>${fmtAns(q, v)}</b></span><span>${E().correct}: <b>${fmtAns(q, q.a)}</b></span></p>
        ${pk(q.e) ? `<p class="explain">${fmt(pk(q.e))}</p>` : ''}
      </article>`;
    }).join('');
  }

  return {
    view(ctx, path) {
      X = ctx;
      const m = path.match(/^\/ent\/([0-9a-f-]{36})$/i);
      if (m) return viewTest(m[1]);
      test = null;
      return viewStart();
    }
  };
})();
