// План подготовки: цель и дата ЕНТ, дневная норма, слабые темы, ссылка для родителей.
window.PLAN = (() => {
  let X;
  const $ = (s, el = document) => el.querySelector(s);
  const T = {
    ru: {
      title: 'План подготовки', lead: 'Цель, ежедневная норма и темы, которые стоит подтянуть.',
      goal: 'Моя цель', target: 'Желаемый балл', date: 'Дата ЕНТ', save: 'Сохранить', saved: 'Сохранено', edit: 'Изменить',
      left: n => (n > 0 ? `${n} дн. до ЕНТ` : n === 0 ? 'ЕНТ сегодня' : 'Дата ЕНТ прошла'), tGoal: 'Цель', tLast: 'Последний пробный', tBest: 'Лучший результат', tNeed: 'Осталось набрать',
      pts: n => `${n}`, none: '—', reached: 'цель достигнута',
      today: 'Сегодня', todayOf: (a, b) => `${a} из ${b} вопросов`, todayDone: 'Норма на сегодня выполнена', week: 'Вопросов за 7 дней',
      weak: 'Слабые темы', weakLead: 'Темы, где меньше 75% верных ответов. Тренировка — 10 вопросов по теме.', train: 'Тренировать', acc: (p, n) => `${p}% верных из ${n}`,
      noWeak: 'Пока нет данных. Пройдите пробный ЕНТ или сыграйте в мини-игры — и здесь появятся темы, которые стоит подтянуть.', mock: 'Пробный ЕНТ',
      subjects: 'Предметы', chart: 'Пробные ЕНТ', noMocks: 'Пробных ЕНТ пока не было.',
      parent: 'Отчёт для родителей', parentLead: 'Ссылка, по которой родители видят ваш прогресс без входа на сайт: баллы пробных, активность и слабые темы. Личные данные и переписка не показываются.',
      mk: 'Создать ссылку', copy: 'Скопировать', copied: 'Ссылка скопирована', off: 'Отключить ссылку', offOk: 'Ссылка отключена',
      streak: n => `${n} дн. подряд`, noStreak: 'Серия ещё не начата',
      hStart: 'Поставьте цель', hStartT: 'Балл и дата ЕНТ — и сайт составит план', hSet: 'Поставить', hGoal: (t, n) => `Цель ${t}${n != null && n >= 0 ? ` · ${n} дн. до ЕНТ` : ''}`, hNow: s => (s != null ? `Сейчас ${s}` : 'Пробных ещё не было'), hPlan: 'План',
      hToday: 'Сегодня', hTask: tp => (tp ? `Тема: ${tp}` : 'Работа над ошибками'), go: 'Начать',
      pTitle: n => `Прогресс: ${n}`, pLead: 'Отчёт Bilim Arena о подготовке к ЕНТ. Обновляется сам.', pGone: 'Ссылка не работает', pGoneLead: 'Её отключили или она введена с ошибкой. Попросите у ребёнка новую ссылку.',
      err: { planTarget: 'Балл — от 50 до 140.', planDate: 'Укажите дату ЕНТ — не раньше сегодняшнего дня.' }
    },
    kk: {
      title: 'Дайындық жоспары', lead: 'Мақсат, күнделікті норма және күшейту керек тақырыптар.',
      goal: 'Менің мақсатым', target: 'Қалаған балл', date: 'ҰБТ күні', save: 'Сақтау', saved: 'Сақталды', edit: 'Өзгерту',
      left: n => (n > 0 ? `ҰБТ-ға ${n} күн` : n === 0 ? 'ҰБТ бүгін' : 'ҰБТ күні өтіп кетті'), tGoal: 'Мақсат', tLast: 'Соңғы сынақ', tBest: 'Ең жақсы нәтиже', tNeed: 'Жинау керек',
      pts: n => `${n}`, none: '—', reached: 'мақсат орындалды',
      today: 'Бүгін', todayOf: (a, b) => `${b} сұрақтың ${a}-і`, todayDone: 'Бүгінгі норма орындалды', week: '7 күндегі сұрақтар',
      weak: 'Әлсіз тақырыптар', weakLead: 'Дұрыс жауабы 75%-дан аз тақырыптар. Жаттығу — тақырып бойынша 10 сұрақ.', train: 'Жаттығу', acc: (p, n) => `${n} жауаптың ${p}%-ы дұрыс`,
      noWeak: 'Әзірге дерек жоқ. Сынақ ҰБТ тапсырыңыз немесе мини-ойын ойнаңыз — күшейту керек тақырыптар осында шығады.', mock: 'Сынақ ҰБТ',
      subjects: 'Пәндер', chart: 'Сынақ ҰБТ', noMocks: 'Сынақ ҰБТ әлі тапсырылмаған.',
      parent: 'Ата-анаға есеп', parentLead: 'Ата-ана сайтқа кірмей-ақ прогресіңізді көретін сілтеме: сынақ балдары, белсенділік және әлсіз тақырыптар. Жеке деректер мен хат алмасу көрсетілмейді.',
      mk: 'Сілтеме жасау', copy: 'Көшіру', copied: 'Сілтеме көшірілді', off: 'Сілтемені өшіру', offOk: 'Сілтеме өшірілді',
      streak: n => `${n} күн қатарынан`, noStreak: 'Серия әлі басталған жоқ',
      hStart: 'Мақсат қойыңыз', hStartT: 'Балл мен ҰБТ күні — сайт жоспар құрады', hSet: 'Қою', hGoal: (t, n) => `Мақсат ${t}${n != null && n >= 0 ? ` · ҰБТ-ға ${n} күн` : ''}`, hNow: s => (s != null ? `Қазір ${s}` : 'Сынақ әлі тапсырылмаған'), hPlan: 'Жоспар',
      hToday: 'Бүгін', hTask: tp => (tp ? `Тақырып: ${tp}` : 'Қатемен жұмыс'), go: 'Бастау',
      pTitle: n => `Прогресс: ${n}`, pLead: 'Bilim Arena-ның ҰБТ-ға дайындық есебі. Өздігінен жаңарады.', pGone: 'Сілтеме жұмыс істемейді', pGoneLead: 'Ол өшірілген немесе қате енгізілген. Балаңыздан жаңа сілтеме сұраңыз.',
      err: { planTarget: 'Балл — 50-ден 140-қа дейін.', planDate: 'ҰБТ күнін көрсетіңіз — бүгіннен ерте емес.' }
    }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const nm = o => esc(X.pick(o));
  const cls = p => (p < 50 ? 'low' : p < 75 ? 'mid' : '');
  const page = h => `<div class="page"><div class="wrap narrow">${h}</div></div>${X.footer()}`;
  const trainHref = w => `/practice?s=${encodeURIComponent(w.s)}&tp=${encodeURIComponent(w.k)}`;
  const flame = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 2 3 1-2 1-4 1-7z"/></svg>';

  // Полоса на главной: серия, норма на сегодня, цель.
  async function home(box) {
    let d; try { d = await X.api('/api/plan'); } catch { return; }
    if (!document.body.contains(box)) return;
    const w = d.weak[0], pct = Math.min(100, Math.round(d.daily.done / d.daily.need * 100));
    box.innerHTML = `<div class="wrap today__grid">
      <div class="today__item today__streak${d.streak ? ' on' : ''}"><i>${flame}</i><div><b>${d.streak ? t().streak(d.streak) : t().noStreak}</b></div></div>
      <a class="today__item today__task" href="${w ? trainHref(w) : '/practice'}" data-link><div><span>${t().hToday}: ${t().todayOf(Math.min(d.daily.done, d.daily.need), d.daily.need)}</span><b>${pct >= 100 ? t().todayDone : t().hTask(w ? X.pick(w.name) : null)}</b><i class="today__bar"><u data-w="${pct}"></u></i></div><em>${t().go} →</em></a>
      <a class="today__item" href="/plan" data-link>${d.plan ? `<div><span>${esc(t().hGoal(d.plan.target, d.plan.left))}</span><b>${esc(t().hNow(d.last))}</b></div><em>${t().hPlan} →</em>` : `<div><span>${t().hStart}</span><b>${t().hStartT}</b></div><em>${t().hSet} →</em>`}</a>
    </div>`;
    box.hidden = false;
    const fl = box.querySelector('.today__streak');
    if (fl && d.daily.done >= d.daily.need) { fl.classList.add('lit'); FX.pop(fl.querySelector('i')); }
    FX.bars(box, '.today__bar u[data-w]');
    EDU.checkAwards(X);
  }

  function chart(mocks, target) {
    if (!mocks.length) return `<p class="muted">${t().noMocks}</p>`;
    const W = 560, H = 170, pl = 30, pr = 12, pt = 12, pb = 22, n = mocks.length;
    const x = i => pl + (n === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1)), y = v => pt + (140 - v) / 140 * (H - pt - pb);
    const grid = [0, 35, 70, 105, 140].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="pl-grid"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" class="pl-ax">${v}</text>`).join('');
    const goal = target ? `<line x1="${pl}" x2="${W - pr}" y1="${y(target)}" y2="${y(target)}" class="pl-goal"/>` : '';
    const line = n > 1 ? `<polyline points="${mocks.map((m, i) => `${x(i)},${y(m.score)}`).join(' ')}" class="pl-line"/>` : '';
    const dots = mocks.map((m, i) => `<circle cx="${x(i)}" cy="${y(m.score)}" r="4" class="pl-dot"/>${i === n - 1 || n <= 6 ? `<text x="${x(i)}" y="${y(m.score) - 9}" text-anchor="middle" class="pl-val">${m.score}</text>` : ''}`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="pl-chart" role="img" aria-label="${t().chart}">${grid}${goal}${line}${dots}</svg>`;
  }
  // Общая часть для ученика и для родителей.
  function body(d, own) {
    const need = d.plan && d.last != null ? d.plan.target - d.last : null;
    const tile = (a, b) => `<div class="pl-tile"><span>${a}</span><b>${b}</b></div>`;
    const max = Math.max(d.daily.need, ...d.week.map(x => x.n));
    return `
      <div class="pl-tiles">
        ${tile(t().tGoal, d.plan ? d.plan.target : t().none)}${tile(t().tLast, d.last ?? t().none)}${tile(t().tBest, d.best ?? t().none)}
        ${tile(t().tNeed, need == null ? t().none : need > 0 ? `+${need}` : t().reached)}
      </div>
      ${d.plan ? `<p class="pl-left">${t().left(d.plan.left)} · ${d.streak ? t().streak(d.streak) : t().noStreak}</p>` : ''}
      <section class="pl-sec"><h2>${t().week}</h2>
        <div class="pl-week">${d.week.map(x => `<div class="pl-day${x.n >= d.daily.need ? ' ok' : ''}"><b>${x.n || ''}</b><i style="height:${Math.max(3, Math.round(x.n / max * 100))}%"></i><span>${x.d.slice(8)}.${x.d.slice(5, 7)}</span></div>`).join('')}</div>
        <p class="muted">${t().today}: ${t().todayOf(d.daily.done, d.daily.need)}</p></section>
      <section class="pl-sec"><h2>${t().chart}</h2>${chart(d.mocks, d.plan?.target)}</section>
      <section class="pl-sec"><h2>${t().weak}</h2>${d.weak.length ? `${own ? `<p class="muted">${t().weakLead}</p>` : ''}<ul class="prlist">${d.weak.map(w => `<li class="prow"><div class="prow__name"><b>${nm(w.name)}</b><span class="muted">${nm(X.meta().subjects?.[w.s] || { ru: w.s })} · ${t().acc(w.pct, w.answered)}</span></div>
          <div class="acc__bar"><i style="width:${w.pct}%" class="${cls(w.pct)}"></i></div>${own ? `<a class="btn btn--sm" href="${trainHref(w)}" data-link>${t().train}</a>` : '<span></span>'}</li>`).join('')}</ul>`
        : `<p class="muted">${t().noWeak}</p>${own ? `<p style="margin-top:12px"><a class="btn btn--sm" href="/ent" data-link>${t().mock}</a></p>` : ''}`}</section>
      ${d.subjects.length ? `<section class="pl-sec"><h2>${t().subjects}</h2><ul class="prlist">${d.subjects.map(s => `<li class="prow"><div class="prow__name"><b>${nm(s.name)}</b><span class="muted">${s.pct}%</span></div><div class="acc__bar"><i style="width:${s.pct}%" class="${cls(s.pct)}"></i></div><span></span></li>`).join('')}</ul></section>` : ''}`;
  }

  async function viewPlan() {
    X.setTitle(t().title);
    X.app.innerHTML = page(`${SKEL()}`);
    let d, link; try { [d, link] = await Promise.all([X.api('/api/plan'), X.api('/api/parent/link')]); } catch { return; }
    const today = new Date().toISOString().slice(0, 10);
    const render = () => {
      const url = link.token ? `${location.origin}/parent/${link.token}` : '';
      X.app.innerHTML = page(`
        <h1>${t().title}</h1><p class="page__lead">${t().lead}</p>
        <form class="pl-goal-form panel" id="plForm" novalidate>
          <label class="field"><span>${t().target}</span><input name="target" type="number" inputmode="numeric" min="50" max="140" value="${d.plan?.target ?? ''}" placeholder="100"></label>
          <label class="field"><span>${t().date}</span><input name="date" type="date" min="${today}" value="${d.plan?.date ?? ''}"></label>
          <button class="btn" id="plSave">${t().save}</button>
          <p class="form-error" id="plErr" role="alert"></p>
        </form>
        ${body(d, true)}
        <section class="pl-sec"><h2>${t().parent}</h2><p class="muted">${t().parentLead}</p>
          ${link.token ? `<div class="pl-link"><input readonly value="${esc(url)}" id="plUrl" aria-label="${t().parent}"><button class="btn btn--sm" id="plCopy">${t().copy}</button></div><button class="linkbtn" id="plOff">${t().off}</button>`
            : `<button class="btn btn--ghost" id="plMk">${t().mk}</button>`}
        </section>`);
      const f = $('#plForm');
      f.onsubmit = async e => {
        e.preventDefault(); $('#plErr').textContent = ''; $('#plSave').disabled = true;
        try { d = await X.api('/api/plan', { method: 'POST', body: { target: f.elements.target.value, date: f.elements.date.value } }); X.toast(t().saved); render(); }
        catch (x) { $('#plErr').textContent = t().err[x.code] || X.L().err.server; $('#plSave').disabled = false; }
      };
      const mk = $('#plMk'), cp = $('#plCopy'), off = $('#plOff');
      if (mk) mk.onclick = async () => { try { link = await X.api('/api/parent/link', { method: 'POST' }); render(); } catch {} };
      if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(url); } catch { $('#plUrl').select(); } X.toast(t().copied); };
      if (off) off.onclick = async () => { try { link = await X.api('/api/parent/link', { method: 'DELETE' }); X.toast(t().offOk); render(); } catch {} };
    };
    render();
  }

  async function viewParent(token) {
    X.app.innerHTML = page(`${SKEL()}`);
    let d; try { d = await X.api('/api/parent/' + encodeURIComponent(token)); }
    catch { X.setTitle(t().pGone); X.app.innerHTML = page(`<h1>${t().pGone}</h1><p class="page__lead">${t().pGoneLead}</p>`); return; }
    X.setTitle(t().pTitle(d.name));
    X.app.innerHTML = page(`<h1>${esc(t().pTitle(d.name))}</h1><p class="page__lead">${esc([schoolName(d.school), d.city && X.cityName(d.city)].filter(Boolean).join(', '))}</p><p class="muted" style="margin-top:6px">${t().pLead}</p>${body(d, false)}`);
  }

  return { init: ctx => { X = ctx; }, home, view: path => (path.startsWith('/parent/') ? viewParent(path.slice(8)) : viewPlan()) };
})();
