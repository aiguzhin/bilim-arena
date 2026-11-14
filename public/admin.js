// Админ-панель: сводка, жалобы на сообщения и ограничение чата, свои задания, резервные копии.
// Ключ администратора вводится один раз и хранится только в этом браузере.
window.ADMIN = (() => {
  let X, tab = 'stats';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => X.esc(s);
  const KEY = 'ba_admin';
  const key = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
  const setKey = v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} };
  const ERR = { denied: 'Ключ не подошёл.', limit: 'Слишком много попыток, подождите 15 минут.', notfound: 'Не найдено.', subject: 'Выберите предмет.', fill: 'Заполните условие и все четыре варианта.', same: 'Варианты ответа повторяются.', answer: 'Отметьте правильный ответ.', backup: 'Не удалось сделать копию.' };
  async function api(path, method = 'GET', body) {
    const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'x-admin': key() }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(ERR[j.error] || 'Ошибка ' + r.status); e.code = j.error; throw e; }
    return j;
  }
  const page = h => `<div class="page"><div class="wrap adm">${h}</div></div>`;
  const fmtN = n => Number(n || 0).toLocaleString('ru-RU');
  const when = s => (s ? new Date(s).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const kb = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ');

  function login(msg = '') {
    X.app.innerHTML = page(`<form class="adm-login card" id="admLogin">
      <h1>Админ-панель</h1><p class="muted">Введите ключ администратора. Он сохранится только в этом браузере.</p>
      <input class="input" type="password" id="admKey" autocomplete="current-password" placeholder="Ключ" required>
      <p class="form-error" id="admErr">${esc(msg)}</p>
      <button class="btn" type="submit">Войти</button></form>`);
    $('#admKey').focus();
    $('#admLogin').onsubmit = async e => {
      e.preventDefault(); setKey($('#admKey').value.trim());
      try { await api('/api/admin/check'); view(); } catch (er) { setKey(''); $('#admErr').textContent = er.message; }
    };
  }

  async function view() {
    X.setTitle('Админ-панель');
    if (!key()) return login();
    X.app.innerHTML = page(`<div class="adm-head"><h1>Админ-панель</h1><button class="btn btn--ghost btn--sm" id="admOut">Выйти</button></div>
      <nav class="tabs adm-tabs" role="tablist">${[['stats', 'Сводка'], ['reports', 'Жалобы'], ['questions', 'Задания'], ['backups', 'Копии']].map(([k, n]) => `<button type="button" role="tab" aria-selected="${k === tab}" data-tab="${k}">${n}</button>`).join('')}</nav>
      <div id="admBody">${SKEL(4)}</div>`);
    $('#admOut').onclick = () => { setKey(''); login(); };
    X.app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; view(); });
    try { await ({ stats, reports, questions, backups })[tab]($('#admBody')); }
    catch (e) { if (e.code === 'denied') { setKey(''); login(e.message); } else $('#admBody').innerHTML = `<p class="form-error">${esc(e.message)}</p>`; }
  }

  async function stats(box) {
    const s = await api('/api/admin/stats');
    const tile = (n, l) => `<div class="adm-tile"><b>${fmtN(n)}</b><span>${l}</span></div>`;
    const max = Math.max(1, ...s.days.map(d => d.n));
    box.innerHTML = `<div class="adm-tiles">${tile(s.users, 'пользователей')}${tile(s.new1, 'новых за сутки')}${tile(s.new7, 'новых за 7 дней')}${tile(s.active7, 'активных за 7 дней')}
      ${tile(s.teachers, 'учителей')}${tile(s.classes, 'классов')}</div>
      <h2 class="adm-h">За 7 дней</h2>
      <div class="adm-tiles">${tile(s.mocks7, 'пробных ЕНТ')}${tile(s.practice7, 'заданий в тренировке')}${tile(s.games7, 'баттлов')}${tile(s.minis7, 'мини-игр')}${tile(s.chat7, 'сообщений в чатах')}</div>
      <h2 class="adm-h">Регистрации по дням</h2>
      <div class="adm-bars">${s.days.map(d => `<div class="adm-bar" title="${d.d}: ${d.n}"><i style="height:${Math.round(d.n / max * 100)}%"></i><span>${d.n}</span><small>${d.d.slice(8)}.${d.d.slice(5, 7)}</small></div>`).join('')}</div>
      <h2 class="adm-h">Заданий в базе</h2>
      <table class="adm-table"><tbody>${Object.entries(s.bank).map(([k, n]) => `<tr><td>${esc(s.subjects[k]?.ru || k)}</td><td class="num">${fmtN(n)}</td></tr>`).join('')}
      <tr class="adm-total"><td>Всего</td><td class="num">${fmtN(Object.values(s.bank).reduce((a, b) => a + b, 0))}</td></tr></tbody></table>`;
  }

  async function reports(box) {
    const { list } = await api('/api/admin/reports');
    const rows = list.map(r => `<div class="adm-rep${r.deleted ? ' adm-rep--hidden' : ''}">
      <div class="adm-rep__meta"><b>${r.sender ? esc(r.sender.name) + ' <span class="muted">@' + esc(r.sender.username || '') + '</span>' : 'Удалённый аккаунт'}</b>
        <span class="muted">${when(r.created_at)} · жалоб: ${r.n}${r.deleted ? ' · скрыто' : ''}${r.room.startsWith('d:') ? ' · личный чат' : ''}${r.ban?.on && r.ban.until > Date.now() ? ' · чат ограничен до ' + when(r.ban.until) : ''}</span></div>
      <div class="adm-rep__text">${r.kind === 'image' ? '[фото]' : r.kind === 'voice' ? '[голосовое]' : esc(r.text)}</div>
      <div class="adm-rep__act">${r.deleted ? '' : `<button class="btn btn--sm btn--danger" data-hide="${r.id}">Скрыть сообщение</button>`}
        <button class="btn btn--sm btn--ghost" data-ok="${r.id}">Нарушения нет</button>
        ${r.sender?.username ? `<button class="btn btn--sm btn--ghost" data-ban="${esc(r.sender.username)}" data-days="7">Ограничить чат на 7 дней</button>` : ''}</div></div>`).join('');
    box.innerHTML = `<form class="adm-ban card" id="admBan"><h2 class="adm-h">Ограничить чат</h2>
        <div class="adm-row"><input class="input" id="banUser" placeholder="@логин" required><select class="input" id="banDays"><option value="1">1 день</option><option value="7" selected>7 дней</option><option value="30">30 дней</option><option value="3650">навсегда</option><option value="0">снять ограничение</option></select>
        <button class="btn" type="submit">Применить</button></div><p class="form-note" id="banMsg"></p></form>
      <h2 class="adm-h">Жалобы на сообщения</h2>${rows || '<p class="muted">Жалоб нет.</p>'}`;
    const ban = async (username, days) => { const r = await api('/api/admin/ban', 'POST', { username, days }); return days ? `@${r.username}: чат ограничен до ${when(r.ban.until)}` : `@${r.username}: ограничение снято`; };
    $('#admBan').onsubmit = async e => { e.preventDefault(); try { $('#banMsg').textContent = await ban($('#banUser').value, +$('#banDays').value); } catch (er) { $('#banMsg').textContent = er.message; } };
    box.querySelectorAll('[data-hide],[data-ok]').forEach(b => b.onclick = async () => { b.disabled = true; await api('/api/admin/reports/' + (b.dataset.hide || b.dataset.ok), 'POST', { action: b.dataset.hide ? 'hide' : 'ok' }); reports(box); });
    box.querySelectorAll('[data-ban]').forEach(b => b.onclick = async () => { b.disabled = true; try { await ban(b.dataset.ban, 7); reports(box); } catch (er) { b.textContent = er.message; } });
  }

  async function questions(box) {
    const [{ list }, s] = await Promise.all([api('/api/admin/questions'), api('/api/admin/stats')]);
    const opts = Object.entries(s.subjects).map(([k, n]) => `<option value="${k}">${esc(n.ru)}</option>`).join('');
    const side = (lang, label, req) => `<fieldset class="adm-side"><legend>${label}</legend>
      <textarea class="input" name="${lang}t" rows="3" placeholder="Условие задания"${req}></textarea>
      ${[0, 1, 2, 3].map(i => `<label class="adm-opt"><input type="radio" name="a" value="${i}"${lang === 'ru' ? '' : ' style="visibility:hidden" tabindex="-1"'}${i === 0 && lang === 'ru' ? ' required' : ''}><input class="input" name="${lang}o${i}" placeholder="Вариант ${'АБВГ'[i]}"${req}></label>`).join('')}
      <textarea class="input" name="${lang}e" rows="2" placeholder="Объяснение (необязательно)"></textarea></fieldset>`;
    box.innerHTML = `<form class="card adm-q" id="admQ"><h2 class="adm-h">Новое задание</h2>
      <p class="muted">Один правильный ответ из четырёх. Отметьте правильный вариант кружком. Варианты перемешиваются при показе. Казахскую версию можно не заполнять — тогда покажется русская.</p>
      <select class="input" name="subject" required>${opts}</select>
      <div class="adm-sides">${side('ru', 'Русский', ' required')}${side('kk', 'Қазақша', '')}</div>
      <p class="form-error" id="qErr"></p><button class="btn" type="submit">Добавить в базу</button></form>
      <h2 class="adm-h">Добавленные задания · ${list.length}</h2>
      ${list.map(c => `<div class="adm-qi"><div><span class="muted">${esc(s.subjects[c.subject]?.ru || c.subject)} · ${when(c.created_at)}${c.kk ? '' : ' · без казахской версии'}</span>
        <p>${esc(c.ru.t)}</p><ul class="adm-opts">${c.ru.o.map((o, i) => `<li${i === c.a ? ' class="adm-right"' : ''}>${'АБВГ'[i]}. ${esc(o)}</li>`).join('')}</ul></div>
        <button class="btn btn--sm btn--ghost" data-del="${c.cid}">Удалить</button></div>`).join('') || '<p class="muted">Пока нет.</p>'}`;
    $('#admQ').onsubmit = async e => {
      e.preventDefault();
      const f = new FormData(e.target), g = k => String(f.get(k) || '');
      const part = l => ({ t: g(l + 't'), o: [0, 1, 2, 3].map(i => g(l + 'o' + i)), e: g(l + 'e') });
      try { await api('/api/admin/questions', 'POST', { subject: g('subject'), a: +g('a'), ru: part('ru'), kk: part('kk') }); questions(box); }
      catch (er) { $('#qErr').textContent = er.message; }
    };
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (b.dataset.sure) { await api('/api/admin/questions/' + b.dataset.del, 'DELETE'); questions(box); } else { b.dataset.sure = 1; b.textContent = 'Точно удалить?'; } });
  }

  async function backups(box) {
    const s = await api('/api/admin/stats');
    box.innerHTML = `<p class="muted">Копия всей базы делается автоматически раз в сутки и хранится на сервере 14 дней. Фото и голосовые из чатов в копию не входят.</p>
      <button class="btn" id="bkNow">Сделать копию сейчас</button> <span class="form-note" id="bkMsg"></span>
      <table class="adm-table">${s.backups.map(b => `<tr><td>${esc(b.name)}</td><td class="num">${kb(b.size)}</td><td><button class="btn btn--sm btn--ghost" data-get="${esc(b.name)}">Скачать</button></td></tr>`).join('') || '<tr><td class="muted">Копий пока нет.</td></tr>'}</table>`;
    $('#bkNow').onclick = async e => { e.target.disabled = true; $('#bkMsg').textContent = 'Делаю копию…'; try { await api('/api/admin/backup', 'POST'); backups(box); } catch (er) { $('#bkMsg').textContent = er.message; e.target.disabled = false; } };
    box.querySelectorAll('[data-get]').forEach(b => b.onclick = async () => {
      const r = await fetch('/api/admin/backup/' + encodeURIComponent(b.dataset.get), { headers: { 'x-admin': key() } });
      if (!r.ok) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = b.dataset.get; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
  }

  return { init: x => { X = x; }, view };
})();
