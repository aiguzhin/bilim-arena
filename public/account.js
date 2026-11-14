// Профиль, публичные страницы игроков, настройки и меню «три линии».
window.ACC = (() => {
  let X;
  const $ = (s, el = document) => el.querySelector(s);
  const A = () => X.L().acc;
  const COLORS = { blue: '#1F5FD6', green: '#0E8A6A', red: '#C0334E', violet: '#5A4BD4', orange: '#C8641A', teal: '#0F8193', pink: '#B83B76', graphite: '#4C5870' };
  const ACCENTS = { classic: ['#0E2552', '#1F5FD6'], emerald: ['#0B3B33', '#0E8A6A'], garnet: ['#43111F', '#C0334E'], indigo: ['#221C57', '#5A4BD4'] };
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

  // ---------- оформление ----------
  function applySettings(st = {}) {
    const d = document.documentElement;
    if (st.theme) { d.dataset.theme = st.theme; ls.set('ba_theme', st.theme); }
    if (st.accent) { d.dataset.accent = st.accent; ls.set('ba_accent', st.accent); }
    if (st.fs) { d.dataset.fs = st.fs; ls.set('ba_fs', st.fs); }
    if (st.timer) ls.set('ba_timer', st.timer);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = ACCENTS[d.dataset.accent]?.[0] || '#0E2552';
  }
  async function saveSetting(patch) {
    applySettings(patch);
    if (patch.lang) X.setLang(patch.lang);
    try { const r = await X.api('/api/me/settings', { method: 'PUT', body: patch }); X.setMe(r.user); } catch {}
  }
  const current = () => ({
    theme: document.documentElement.dataset.theme || 'system', accent: document.documentElement.dataset.accent || 'classic',
    fs: document.documentElement.dataset.fs || 'md', timer: ls.get('ba_timer') || 'show'
  });

  // ---------- аватар ----------
  function hashColor(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return Object.keys(COLORS)[h % 8]; }
  function initials(name) { return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
  function avatar(u, size = 'md') {
    if (u.photo) return `<img class="ava ava--${size}" src="${u.photo}" alt="" aria-hidden="true">`;
    const c = COLORS[u.avatar] || COLORS[hashColor(u.username)];
    return `<span class="ava ava--${size}" style="background:${c}" aria-hidden="true">${(String(u.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()).replace(/[<>&"]/g, '')}</span>`;
  }

  // ---------- меню ----------
  function initMenu() {
    const btn = $('#menuBtn'), panel = $('#menuPanel');
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); };
    const open = () => { renderMenu(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); $('#menuList a')?.focus(); };
    btn.onclick = () => (panel.hidden ? open() : close());
    panel.addEventListener('click', e => {
      if (e.target.closest('[data-close]') || e.target.closest('a[data-link]')) close();
      const t = e.target.closest('[data-qtheme]');
      if (t) { saveSetting({ theme: t.dataset.qtheme }); renderMenu(); }
      if (e.target.closest('#menuLogout')) { close(); X.logout(); }
      if (e.target.closest('#menuSwitch')) { close(); switchAccount(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    return close;
  }
  function renderMenu() {
    const me = X.me(); if (!me) return;
    const L = X.L(), path = location.pathname;
    $('#menuPanel nav').setAttribute('aria-label', A().menu);
    $('#menuUser').innerHTML = `<a href="/me" data-link class="menu__me">${avatar(me, 'md')}<span><b>${X.esc(me.name)}</b><small>@${X.esc(me.username)} · ${me.rating}</small></span></a>`;
    const item = (href, label) => `<a href="${href}" data-link class="${path === href ? 'is-cur' : ''}">${label}</a>`;
    $('#menuList').innerHTML = `
      ${item('/me', A().tabProfile)}${item('/me/achievements', A().tabAch)}${item('/me/results', A().tabResults)}${me.role === 'teacher' ? item('/teacher', A().menuTeacher) : item('/me/class', A().tabClass)}${item('/settings', A().tabSettings)}
      <hr>
      ${item('/chat', X.lang() === 'kk' ? 'Чаттар' : 'Чаты')}${item('/friends', A().menuFriends)}${item('/ent', L.navEnt)}${item('/ent/register', A().menuEntReg)}${item('/games', L.navGames)}${item('/unis', L.navUnis)}${item('/tournaments', L.navTours)}${item('/practice', A().menuPractice)}${item('/play', L.navPlay)}${item('/rating', L.navRating)}${item('/about', L.navAbout)}
      <hr>
      <button type="button" id="menuSwitch">${A().switchAcc}</button>
      <button type="button" id="menuLogout">${A().logout}</button>`;
    const t = current().theme;
    $('#menuTheme').innerHTML = `<span>${A().quickTheme}</span><div class="seg3">${[['light', A().themeLight], ['dark', A().themeDark], ['system', A().themeSystem]]
      .map(([v, n]) => `<button type="button" data-qtheme="${v}" aria-pressed="${t === v}">${n}</button>`).join('')}</div>`;
  }

  // ---------- общая шапка аккаунта ----------
  function shell(u, tab, body) {
    const tabs = [['/me', 'profile', A().tabProfile], ['/me/achievements', 'achievements', A().tabAch], ['/me/results', 'results', A().tabResults], ['/me/games', 'games', A().tabGames],
      u.role === 'teacher' ? ['/teacher', 'teacher', A().menuTeacher] : ['/me/class', 'class', A().tabClass], ['/settings', 'settings', A().tabSettings]];
    const since = u.createdAt ? fmtDate(u.createdAt, X.lang(), true) : '';
    return `
    <div class="page page--acc"><div class="wrap narrow">
      <header class="phead">
        ${avatar(u, 'lg')}
        <div class="phead__main">
          <h1>${X.esc(u.name)}</h1>
          <p class="phead__meta">@${X.esc(u.username)} · ${X.esc(u.school)}, ${X.esc(X.cityName(u.city))}</p>
          <p class="phead__bio ${u.bio ? '' : 'is-empty'}">${u.bio ? X.esc(u.bio) : A().noBio}</p>
          ${since ? `<p class="phead__since">${X.L().memberSince(since)}</p>` : ''}
        </div>
        <div class="phead__actions">
          <button class="btn btn--ghost btn--sm" id="pEdit">${A().edit}</button>
          <button class="btn btn--ghost btn--sm" id="pSwitch">${A().switchAcc}</button>
          <button class="btn btn--ghost btn--sm phead__out" id="pOut">${A().logout}</button>
        </div>
      </header>
      <nav class="ptabs" role="tablist">${tabs.map(([h, k, n]) => `<a href="${h}" data-link role="tab" aria-selected="${k === tab}">${n}</a>`).join('')}</nav>
      <div class="pbody">${body}</div>
    </div></div>${X.footer()}`;
  }
  function bindShell() {
    const b = $('#pEdit'); if (b) b.onclick = () => editProfile();
    const pa = $('.phead > .ava'); if (pa && b) { pa.classList.add('ava--edit'); pa.title = A().edit; pa.onclick = () => editProfile(); }
    const sw = $('#pSwitch'); if (sw) sw.onclick = () => switchAccount();
    const out = $('#pOut'); if (out) out.onclick = () => X.logout();
    $('.ptabs [aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // ---------- профиль ----------
  async function viewProfile() {
    X.setTitle(A().tabProfile);
    let d; try { d = await X.api('/api/me'); } catch { return; }
    const u = d.user; X.setMe(u);
    const L = X.L();
    const answered = d.subjects.reduce((n, x) => n + x.answered, 0), right = d.subjects.reduce((n, x) => n + x.correct, 0);
    const acc = answered ? Math.round(right / answered * 100) : null;
    const subs = d.subjects.filter(x => x.answered > 0).map(x => ({ ...x, pct: Math.round(x.correct / x.answered * 100) })).sort((a, b) => a.pct - b.pct);
    const best = d.mocks.best;
    let goal;
    if (!u.goal) goal = `<p class="muted">${A().goalNone}</p><button class="btn btn--sm" id="goalSet">${A().goalSet}</button>`;
    else {
      const pct = best == null ? 0 : Math.min(100, Math.round(best / u.goal * 100));
      goal = `<div class="goal__nums"><b class="num">${u.goal}</b><span>/ 140</span>${u.goalCombo ? `<em>${X.esc(X.topicName('combo:' + u.goalCombo))}</em>` : ''}</div>
        <div class="goal__bar"><i style="width:${pct}%"></i></div>
        <p class="goal__note">${best == null ? A().goalNoMock : `${A().goalBest(best)} · ${best >= u.goal ? A().goalDone : A().goalLeft(u.goal - best)}`}</p>`;
    }
    X.app.innerHTML = shell(u, 'profile', `
      <section class="goal">
        <div class="goal__head"><h2>${A().goalTitle}</h2><a href="/ent" data-link class="btn btn--sm">${A().takeMock}</a></div>
        ${goal}
      </section>
      <div class="tiles tiles--6">
        <div><b class="num">${u.rating}</b><span>${L.tRating}</span></div>
        <div><b class="num">${u.games}</b><span>${L.tGames}</span></div>
        <div><b class="num">${u.wins}</b><span>${L.tWins}</span></div>
        <div><b class="num">${acc === null ? '—' : acc + '%'}</b><span>${L.tAcc}</span></div>
        <div><b class="num">${d.mocks.count}</b><span>${A().tMocks}</span></div>
        <div><b class="num">${best ?? '—'}</b><span>${A().tBest}</span></div>
      </div>
      <div class="glink">
        ${u.google ? `<span class="glink__ok">${L.gLinked}</span>` : `<div class="glink__row"><span>${L.gLinkLead}</span><div class="gblock" hidden><div id="gLinkBox" class="gbtn"></div></div></div><p class="form-error" id="gLinkError" role="alert"></p>`}
      </div>
      <h2 class="me__h2">${L.subjectsTitle}</h2>
      ${subs.length ? `<p class="muted" style="margin:-6px 0 14px">${L.subjectsLead}</p><ul class="acc">${subs.map((x, i) => `
        <li>
          <div class="acc__top"><span>${X.esc(X.pick(X.meta().subjects[x.subject]) || x.subject)}${i === 0 && subs.length > 1 && x.pct < 70 ? ` <span class="acc__weak">${L.weak}</span>` : ''}</span><span class="num"><b>${x.pct}%</b> <span class="muted">· ${L.rightOf(x.correct, x.answered)}</span></span></div>
          <div class="acc__bar"><i style="width:${x.pct}%" class="${x.pct < 50 ? 'low' : x.pct < 75 ? 'mid' : ''}"></i></div>
          <a href="/play?mode=solo&topic=${x.subject}" data-link class="acc__train">${L.train}</a>
        </li>`).join('')}</ul>` : `<div class="empty">${L.subjectsEmpty}<br><a href="/play" data-link class="btn">${L.play}</a></div>`}`);
    bindShell();
    const gs = $('#goalSet'); if (gs) gs.onclick = () => editProfile('goal');
    if (!u.google) X.googleButton($('#gLinkBox'), async credential => {
      try { const r = await X.api('/api/google/link', { method: 'POST', body: { credential } }); X.setMe(r.user); X.toast(L.gLinkedToast); viewProfile(); }
      catch (x) { $('#gLinkError').textContent = L.err[x.code] || L.err.server; }
    });
  }

  // ---------- результаты ЕНТ ----------
  async function viewResults() {
    X.setTitle(A().tabResults);
    const u = X.me();
    let tests = [];
    try { tests = (await X.api('/api/ent')).tests; } catch { return; }
    const fmt = iso => fmtDate(iso, X.lang());
    let body = `<div class="goal__head"><h2>${A().resultsTitle}</h2><a href="/ent" data-link class="btn btn--sm">${A().takeMock}</a></div>`;
    if (!tests.length) body += `<div class="empty">${A().resultsEmpty}</div>`;
    else {
      const last = tests.slice(0, 10).reverse();
      const W = 600, H = 200, pad = 28, bw = Math.min(44, (W - pad * 2) / last.length - 10);
      const y = v => H - pad - (v / 140) * (H - pad * 2);
      const step = (W - pad * 2) / last.length;
      const bars = last.map((t, i) => {
        const x = pad + i * step + (step - bw) / 2, top = y(t.score);
        return `<g><rect x="${x}" y="${top}" width="${bw}" height="${H - pad - top}" rx="5" class="bar"/><text x="${x + bw / 2}" y="${top - 6}" text-anchor="middle" class="val">${t.score}</text><text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="lab">${fmt(t.finished_at)}</text></g>`;
      }).join('');
      const gl = u.goal ? `<line x1="${pad}" x2="${W - pad}" y1="${y(u.goal)}" y2="${y(u.goal)}" class="gline"/><text x="${W - pad}" y="${y(u.goal) - 6}" text-anchor="end" class="glab">${A().goalLine} ${u.goal}</text>` : '';
      body += `<figure class="chart"><figcaption>${A().chartTitle}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${A().chartTitle}"><line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" class="axis"/>${bars}${gl}</svg></figure>
      <table class="table"><tbody>${tests.map(t => `<tr>
        <td><b>${X.esc(X.topicName('combo:' + t.combo))}</b><div class="sub">${fmt(t.finished_at)}</div></td>
        <td class="hide-sm">${(t.result?.subjects || []).map(s => `<span class="chip ${s.pass ? '' : 'chip--bad'}">${s.score}</span>`).join('')}</td>
        <td class="r"><a href="/ent/${t.id}" data-link>${t.score} / ${t.result?.max ?? 140}</a></td></tr>`).join('')}</tbody></table>`;
    }
    X.app.innerHTML = shell(u, 'results', body);
    bindShell();
  }

  // ---------- игры ----------
  async function viewGames() {
    X.setTitle(A().tabGames);
    let d; try { d = await X.api('/api/me'); } catch { return; }
    X.setMe(d.user);
    const L = X.L();
    const fmt = iso => fmtDate(iso, X.lang());
    X.app.innerHTML = shell(d.user, 'games', `<h2 class="me__h2" style="margin-top:0">${A().gamesTitle}</h2>
      ${d.recent.length ? `<table class="table"><tbody>${d.recent.map(g => `
        <tr><td><b>${L.modeName[g.mode] || g.mode}</b><div class="sub">${X.esc(X.topicName(g.topic))} · ${fmt(g.created_at)}</div></td>
        <td class="num hide-sm">${L.rightOf(g.correct, g.total)}</td>
        <td class="r">${g.mode === 'solo' ? g.score : `<span class="${g.delta > 0 ? 'pos-d' : g.delta < 0 ? 'neg-d' : ''}">${g.delta > 0 ? '+' : ''}${g.delta}</span>`}</td></tr>`).join('')}</tbody></table>`
        : `<div class="empty">${L.recentEmpty}<br><a href="/play" data-link class="btn">${L.play}</a></div>`}`);
    bindShell();
  }

  // ---------- смена аккаунта ----------
  function switchAccount() {
    const cur = X.currentToken(), list = X.accounts();
    const dlg = document.createElement('dialog');
    dlg.className = 'dlg';
    dlg.innerHTML = `<div class="dlg__body">
      <h2>${A().switchTitle}</h2>
      <ul class="acclist">${list.map(a => `<li><button type="button" data-t="${X.esc(a.token)}" ${a.token === cur ? 'aria-current="true"' : ''}>
        ${avatar(a, 'md')}<span><b>${X.esc(a.name)}</b><small>@${X.esc(a.username)}${a.rating ? ' · ' + a.rating : ''}</small></span>
        ${a.token === cur ? `<em>${A().current}</em>` : ''}</button></li>`).join('')}</ul>
      <div class="accadd">
        <a class="btn btn--sm" href="/login?mode=login" data-link>${A().addLogin}</a>
        <a class="btn btn--ghost btn--sm" href="/login?mode=register" data-link>${A().addNew}</a>
      </div>
      <div class="dlg__actions"><button class="btn btn--ghost" type="button" data-x>${A().cancel}</button></div>
    </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.addEventListener('click', e => {
      if (e.target.closest('[data-x]') || e.target.closest('a[data-link]')) dlg.close();
      const b = e.target.closest('[data-t]');
      if (b && b.dataset.t !== cur) { dlg.close(); X.switchTo(b.dataset.t); }
    });
    dlg.showModal();
  }

  // Фото: обрезаем по центру в квадрат 256×256 и сжимаем в JPEG прямо в браузере.
  async function squarePhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const side = Math.min(img.naturalWidth, img.naturalHeight), size = 256;
      const c = document.createElement('canvas'); c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      let q = 0.86, data = c.toDataURL('image/jpeg', q);
      while (data.length > 150000 && q > 0.4) { q -= 0.12; data = c.toDataURL('image/jpeg', q); }
      return data;
    } finally { URL.revokeObjectURL(url); }
  }

  // ---------- редактирование профиля ----------
  function editProfile(focus) {
    const u = X.me(), L = X.L();
    const dlg = document.createElement('dialog');
    dlg.className = 'dlg dlg--wide';
    const combos = Object.keys(X.meta().combos);
    dlg.innerHTML = `<form class="dlg__body" id="peForm">
      <h2>${A().edit}</h2>
      <div class="pe__photo">
        <span id="pePrev">${avatar(u, 'lg')}</span>
        <div><span class="field__l">${A().fPhoto}</span>
          <div class="pe__pbtns"><label class="btn btn--ghost btn--sm"><input type="file" accept="image/*" id="peFile" hidden>${A().photoUpload}</label>
          <button type="button" class="btn btn--ghost btn--sm" id="peDel" ${u.photo ? '' : 'hidden'}>${A().photoDelete}</button></div>
          <small class="muted">${A().photoHint}</small></div>
      </div>
      <div class="pe__ava"><span class="field__l">${A().fAvatar}</span><div class="swatches">${Object.entries(COLORS).map(([k, c]) =>
        `<label><input type="radio" name="avatar" value="${k}" ${(u.avatar || hashColor(u.username)) === k ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div></div>
      <label class="field"><span>${X.L().fUsername}</span><input name="username" maxlength="20" autocapitalize="none" spellcheck="false" value="${X.esc(u.username)}"><small>${A().usernameHint}</small></label>
      <label class="field"><span>${A().fName}</span><input name="name" maxlength="24" required minlength="2" value="${X.esc(u.name)}"></label>
      <div class="pe__row">
        <label class="field"><span>${A().fCity}</span><select name="city" required>${[...CITIES.map(([ru, kk]) => `<option value="${ru}">${X.lang() === 'kk' ? kk : ru}</option>`), `<option value="Другой город">${L.otherCity}</option>`].join('')}</select></label>
        <label class="field"><span>${A().fSchool}</span><input name="school" maxlength="60" required value="${X.esc(u.school)}"></label>
      </div>
      <div class="pe__row">
        <label class="field"><span>${X.L().fBirth}</span><input name="birth" type="date" required value="${u.birthDate || ''}" max="${new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10)}"></label>
        <label class="field"><span>${X.L().fPhone}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+7 7__ ___ __ __" value="${X.esc(u.phone || '')}"></label>
      </div>
      <label class="field"><span>${A().fBio}</span><textarea name="bio" maxlength="160" rows="2" placeholder="${A().fBioPh}">${X.esc(u.bio)}</textarea></label>
      <div class="pe__row">
        <label class="field"><span>${A().fGoal}</span><input name="goal" type="number" min="50" max="140" inputmode="numeric" placeholder="${A().fGoalPh}" value="${u.goal ?? ''}"></label>
        <label class="field"><span>${A().fCombo}</span><select name="goalCombo"><option value="">${A().fComboNone}</option>${combos.map(c => `<option value="${c}" ${u.goalCombo === c ? 'selected' : ''}>${X.esc(X.topicName('combo:' + c))}</option>`).join('')}</select></label>
      </div>
      <p class="form-error" role="alert" id="peErr"></p>
      <div class="dlg__actions"><button type="button" class="btn btn--ghost" id="peCancel">${A().cancel}</button><button class="btn">${A().save}</button></div>
    </form>`;
    document.body.appendChild(dlg);
    const f = dlg.querySelector('form').elements;
    f.city.value = u.city;
    X.attachSchoolSuggest(f.school, f.city);
    const done = () => { dlg.close(); dlg.remove(); };
    dlg.addEventListener('close', () => dlg.remove());
    dlg.querySelector('#peCancel').onclick = done;
    let photo = u.photo || null, photoChanged = false;
    const prev = () => { dlg.querySelector('#pePrev').innerHTML = avatar({ ...u, photo, avatar: f.avatar.value }, 'lg'); dlg.querySelector('#peDel').hidden = !photo; };
    dlg.querySelector('#peFile').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try { photo = await squarePhoto(file); photoChanged = true; prev(); } catch { dlg.querySelector('#peErr').textContent = A().photoBad; }
    };
    dlg.querySelector('#peDel').onclick = () => { photo = null; photoChanged = true; prev(); };
    dlg.querySelectorAll('input[name=avatar]').forEach(i => i.onchange = prev);
    dlg.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const err = dlg.querySelector('#peErr'); err.textContent = '';
      try {
        await X.api('/api/me', { method: 'PATCH', body: { name: f.name.value, school: f.school.value, city: f.city.value } });
        if (f.username.value.trim().toLowerCase() !== u.username) await X.api('/api/me/username', { method: 'POST', body: { username: f.username.value } });
        await X.api('/api/me/required', { method: 'POST', body: { birth: f.birth.value, phone: f.phone.value } });
        let r = await X.api('/api/me/extra', { method: 'PATCH', body: { bio: f.bio.value, goal: f.goal.value, goalCombo: f.goalCombo.value, avatar: f.avatar.value } });
        if (photoChanged) r = await X.api('/api/me/photo', { method: 'PUT', body: { photo } });
        X.setMe(r.user); X.profileUpdated();
        if (r.user.goalCombo) ls.set('ba_ent_combo', r.user.goalCombo);
        done(); X.toast(A().saved); X.route();
      } catch (x) { err.textContent = L.err[x.code] || L.err.server; }
    };
    dlg.showModal();
    if (focus === 'goal') f.goal.focus();
  }

  // ---------- настройки ----------
  function viewSettings(sub) {
    const u = X.me(), L = X.L();
    sub = ['theme', 'exam', 'account'].includes(sub) ? sub : 'theme';
    X.setTitle(A().tabSettings);
    const cur = current();
    const opt = (name, v, label, on, extra = '') => `<label class="sopt"><input type="radio" name="${name}" value="${v}" ${on ? 'checked' : ''}>${extra}<span>${label}</span></label>`;
    const preview = t => `<span class="tprev tprev--${t}" aria-hidden="true"><i></i><i></i><i></i></span>`;
    let body = '';
    if (sub === 'theme') body = `
      <section class="sgroup"><h3>${A().themeTitle}</h3><div class="sopts sopts--3">
        ${opt('theme', 'light', A().themeLight, cur.theme === 'light', preview('light'))}
        ${opt('theme', 'dark', A().themeDark, cur.theme === 'dark', preview('dark'))}
        ${opt('theme', 'system', A().themeSystem, cur.theme === 'system', preview('system'))}
      </div></section>
      <section class="sgroup"><h3>${A().accentTitle}</h3><div class="sopts sopts--4">
        ${Object.entries(ACCENTS).map(([k, [n, b]]) => opt('accent', k, A().accents[k], cur.accent === k, `<span class="aprev" style="--n:${n};--b:${b}"><i></i><i></i></span>`)).join('')}
      </div></section>
      <section class="sgroup"><h3>${A().fsTitle}</h3><div class="sopts sopts--2">
        ${opt('fs', 'md', A().fsMd, cur.fs === 'md', '<span class="fsprev">Aa</span>')}${opt('fs', 'lg', A().fsLg, cur.fs === 'lg', '<span class="fsprev fsprev--lg">Aa</span>')}
      </div></section>
      <section class="sgroup"><h3>${A().langTitle}</h3><div class="sopts sopts--2">
        ${opt('lang', 'kk', 'Қазақша', X.lang() === 'kk')}${opt('lang', 'ru', 'Русский', X.lang() === 'ru')}
      </div></section>
      <p class="hint">${A().syncNote}</p>`;
    if (sub === 'exam') body = `
      <section class="sgroup"><h3>${A().timerTitle}</h3><div class="sopts sopts--2">
        ${opt('timer', 'show', A().timerShow, cur.timer === 'show')}${opt('timer', 'hide', A().timerHide, cur.timer === 'hide')}
      </div></section>
      <section class="sgroup"><h3>${A().comboTitle}</h3><p class="hint" style="margin:-4px 0 12px">${A().comboHint}</p>
        <div class="combos">${Object.keys(X.meta().combos).map(c => `<label><input type="radio" name="combo" value="${c}" ${(u.goalCombo || ls.get('ba_ent_combo')) === c ? 'checked' : ''}><div class="opt">${X.esc(X.topicName('combo:' + c))}</div></label>`).join('')}</div>
      </section>`;
    if (sub === 'account') body = `
      <section class="sgroup"><h3>${A().passTitle}</h3>
        ${u.hasPassword ? '' : `<p class="hint" style="margin:-4px 0 12px">${A().passGoogle}</p>`}
        <form id="passForm" class="sform">
          ${u.hasPassword ? `<label class="field"><span>${A().passCurrent}</span><input type="password" name="current" autocomplete="current-password" required></label>` : ''}
          <label class="field"><span>${A().passNew}</span><input type="password" name="next" autocomplete="new-password" minlength="6" maxlength="72" required><small class="muted">${A().passNewHint}</small></label>
          <p class="form-error" role="alert" id="passErr"></p>
          <button class="btn btn--sm">${u.hasPassword ? A().passSave : A().passSet}</button>
        </form>
      </section>
      <section class="sgroup"><h3>${A().sessionsTitle}</h3><p class="muted">${A().sessionsText}</p>
        <button class="btn btn--ghost btn--sm" id="logoutAll" style="margin-top:12px">${A().sessionsBtn}</button>
        <button class="btn btn--ghost btn--sm" id="logoutMe" style="margin-top:12px">${A().logout}</button>
      </section>
      <section class="sgroup sgroup--danger"><h3>${A().deleteTitle}</h3><p class="muted">${A().deleteText}</p>
        <form id="delForm" class="sform">
          <label class="field"><span>${A().deleteLabel(X.esc(u.username))}</span><input name="confirm" autocomplete="off" required></label>
          <p class="form-error" role="alert" id="delErr"></p>
          <button class="btn btn--danger btn--sm">${A().deleteBtn}</button>
        </form>
      </section>`;
    const subs = [['theme', A().sTheme], ['exam', A().sExam], ['account', A().sAccount]];
    X.app.innerHTML = shell(u, 'settings', `
      <div class="stabs tabs-sm" role="tablist">${subs.map(([k, n]) => `<a href="/settings${k === 'theme' ? '' : '/' + k}" data-link role="tab" aria-selected="${k === sub}">${n}</a>`).join('')}</div>
      <div class="spane">${body}</div>`);
    bindShell();

    X.app.querySelectorAll('input[name=theme], input[name=accent], input[name=fs], input[name=timer]').forEach(i => i.onchange = () => saveSetting({ [i.name]: i.value }));
    X.app.querySelectorAll('input[name=lang]').forEach(i => i.onchange = () => saveSetting({ lang: i.value }));
    X.app.querySelectorAll('input[name=combo]').forEach(i => i.onchange = async () => {
      ls.set('ba_ent_combo', i.value);
      try { const r = await X.api('/api/me/extra', { method: 'PATCH', body: { bio: u.bio, goal: u.goal, goalCombo: i.value, avatar: u.avatar } }); X.setMe(r.user); X.toast(A().saved); } catch {}
    });
    const pf = $('#passForm');
    if (pf) pf.onsubmit = async e => {
      e.preventDefault();
      try { const r = await X.api('/api/me/password', { method: 'POST', body: { current: pf.elements.current?.value || '', next: pf.elements.next.value } }); X.setMe(r.user); X.toast(A().passDone); viewSettings('account'); }
      catch (x) { $('#passErr').textContent = L.err[x.code] || L.err.server; }
    };
    const la = $('#logoutAll'); if (la) la.onclick = async () => { try { await X.api('/api/me/logout-all', { method: 'POST' }); X.toast(A().sessionsDone); } catch {} };
    const lm = $('#logoutMe'); if (lm) lm.onclick = () => X.logout();
    const df = $('#delForm');
    if (df) df.onsubmit = async e => {
      e.preventDefault();
      try { await X.api('/api/me', { method: 'DELETE', body: { confirm: df.elements.confirm.value } }); X.forget(); }
      catch (x) { $('#delErr').textContent = L.err[x.code] || L.err.server; }
    };
  }

  // ---------- профиль другого игрока ----------
  async function viewUser(username) {
    X.app.innerHTML = `<div class="page"><div class="wrap narrow"><p class="muted">${X.L().loading}</p></div></div>`;
    let d;
    try { d = await X.api(`/api/users/${encodeURIComponent(username)}`); }
    catch { X.app.innerHTML = `<div class="page"><div class="wrap narrow"><h1>${A().userNotFound}</h1><p style="margin-top:20px"><a class="btn" href="/rating" data-link>${X.L().navRating}</a></p></div></div>`; return; }
    if (d.me) return X.go('/me');
    const u = d.user, me = X.me(), L = X.L();
    X.setTitle(u.name);
    let mine = null;
    try { mine = await X.api('/api/me'); } catch {}
    const accOf = subs => { const a = subs.reduce((n, x) => n + x.answered, 0); return a ? Math.round(subs.reduce((n, x) => n + x.correct, 0) / a * 100) : null; };
    const wr = p => (p.games ? Math.round(p.wins / p.games * 100) : null);
    const rows = [
      [A().cRating, u.rating, me.rating], [A().cGames, u.games, me.games], [A().cWinrate, wr(u), wr(me), '%'],
      [A().cBest, d.mocks.best, mine?.mocks.best], [A().cAcc, accOf(d.subjects), mine ? accOf(mine.subjects) : null, '%']
    ];
    const cell = (v, o, s = '') => `<td class="num ${v != null && o != null && v > o ? 'is-lead' : ''}">${v == null ? '—' : v + s}</td>`;
    const since = u.createdAt ? fmtDate(u.createdAt, X.lang(), true) : '';
    X.app.innerHTML = `
    <div class="page page--acc"><div class="wrap narrow">
      <header class="phead">
        ${avatar(u, 'lg')}
        <div class="phead__main">
          <h1>${X.esc(u.name)}</h1>
          <p class="phead__meta">@${X.esc(u.username)} · ${X.esc(u.school)}, ${X.esc(X.cityName(u.city))}</p>
          ${u.bio ? `<p class="phead__bio">${X.esc(u.bio)}</p>` : ''}
          ${since ? `<p class="phead__since">${L.memberSince(since)}</p>` : ''}
        </div>
      </header>
      <div class="uactions"><span id="uFriend"></span><button class="btn btn--ghost" id="uWrite">${X.lang() === 'kk' ? 'Жазу' : 'Написать'}</button><a class="btn" href="/play?mode=duel" data-link id="uDuel">${A().duel}</a><button class="btn btn--ghost" id="uShare">${A().share}</button></div>
      ${u.goal ? `<p class="ugoal">${A().goalTitle}: <b>${u.goal}</b>${u.goalCombo ? ` · ${X.esc(X.topicName('combo:' + u.goalCombo))}` : ''}</p>` : ''}
      <h2 class="me__h2">${A().compareTitle}</h2>
      <table class="table cmp"><thead><tr><th></th><th class="num">${X.esc(u.name)}</th><th class="num">${A().you}</th></tr></thead>
        <tbody>${rows.map(([n, a, b, s]) => `<tr><td>${n}</td>${cell(a, b, s)}${cell(b, a, s)}</tr>`).join('')}</tbody></table>
      ${d.subjects.filter(x => x.answered).length ? `<h2 class="me__h2">${L.subjectsTitle}</h2><ul class="acc">${d.subjects.filter(x => x.answered).map(x => ({ ...x, pct: Math.round(x.correct / x.answered * 100) })).sort((a, b) => b.pct - a.pct).map(x => `
        <li><div class="acc__top"><span>${X.esc(X.pick(X.meta().subjects[x.subject]) || x.subject)}</span><span class="num"><b>${x.pct}%</b></span></div>
        <div class="acc__bar"><i style="width:${x.pct}%" class="${x.pct < 50 ? 'low' : x.pct < 75 ? 'mid' : ''}"></i></div></li>`).join('')}</ul>` : ''}
    </div></div>${X.footer()}`;
    SOC.userButton($('#uFriend'), u.username);
    $('#uWrite').onclick = () => CHAT.open(u.username);
    $('#uDuel').onclick = () => { try { sessionStorage.setItem('ba_invite', u.username); } catch {} };
    $('#uShare').onclick = async () => { try { await navigator.clipboard.writeText(location.href); X.toast(A().copied); } catch { X.toast(location.href); } };
  }

  return {
    init(ctx) { X = ctx; return initMenu(); },
    applySettings, avatar, renderMenu, switchAccount,
    view(ctx, path) {
      X = ctx;
      const u = path.match(/^\/u\/([a-z0-9_.]{3,20})$/i);
      if (u) return viewUser(u[1].toLowerCase());
      if (path === '/me/class' || path === '/me/achievements') {
        const which = path === '/me/class' ? 'class' : 'achievements';
        X.setTitle(which === 'class' ? A().tabClass : A().tabAch);
        X.app.innerHTML = `<div class="page"><div class="wrap narrow"><p class="muted">${X.L().loading}</p></div></div>`;
        return EDU.tab(X.edu, which, body => shell(X.me(), which, body)).then(bindShell);
      }
      if (path === '/me/results') return viewResults();
      if (path === '/me/games') return viewGames();
      if (path.startsWith('/settings')) return viewSettings(path.split('/')[2]);
      return viewProfile();
    }
  };
})();
