// Теория по темам ЕНТ: правило, формулы, разобранные задания, кнопка тренировки. Доступна без входа.
window.THEORY = (() => {
  let X;
  const $ = (s, el = document) => el.querySelector(s);
  const T = {
    ru: { title: 'Теория для ЕНТ', lead: 'Кратко о главном по каждой теме: правило, формулы и разобранные задания. После — 10 вопросов на закрепление.', rule: 'Главное', ex: 'Разберём задания', show: 'Показать ответ', ans: 'Ответ', train: n => `Тренировать тему · ${n} заданий в базе`, login: 'Войдите, чтобы тренироваться', others: 'Другие темы предмета', all: 'Все темы', notFound: 'Тема не найдена', topics: n => `${n} тем` },
    kk: { title: 'ҰБТ-ға теория', lead: 'Әр тақырып бойынша қысқаша: ереже, формулалар және талданған тапсырмалар. Соңында — бекітуге 10 сұрақ.', rule: 'Ең маңыздысы', ex: 'Тапсырмаларды талдаймыз', show: 'Жауабын көрсету', ans: 'Жауабы', train: n => `Тақырыпты жаттығу · базада ${n} тапсырма`, login: 'Жаттығу үшін кіріңіз', others: 'Пәннің басқа тақырыптары', all: 'Барлық тақырыптар', notFound: 'Тақырып табылмады', topics: n => `${n} тақырып` }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const pk = o => (o ? o[X.lang()] || o.ru : '');
  const txt = s => esc(s).replace(/\n/g, '<br>');
  const page = h => `<div class="page"><div class="wrap narrow">${h}</div></div>${X.footer()}`;

  async function viewList() {
    X.setTitle(t().title);
    X.app.innerHTML = page(SKEL());
    let d; try { d = await (await fetch('/api/theory')).json(); } catch { return; }
    X.app.innerHTML = page(`<h1>${t().title}</h1><p class="page__lead">${t().lead}</p>
      <div class="th-subjects">${d.subjects.map(s => `<section class="th-subj"><h2>${esc(pk(s.name))} <small class="muted">${t().topics(s.topics.length)}</small></h2>
        <div class="th-grid">${s.topics.map(x => `<a class="th-card" href="/theory/${s.s}/${x.k}" data-link><b>${esc(pk(x.name))}</b><span>${x.n}</span></a>`).join('')}</div></section>`).join('')}</div>`);
  }
  async function viewTopic(s, k) {
    X.app.innerHTML = page(SKEL(6));
    let d; try { const r = await fetch(`/api/theory/${encodeURIComponent(s)}/${encodeURIComponent(k)}`); if (!r.ok) throw 0; d = await r.json(); }
    catch { X.app.innerHTML = page(`<h1>${t().notFound}</h1><p><a href="/theory" data-link>${t().all} →</a></p>`); return; }
    X.setTitle(`${pk(d.name)} — ${pk(d.subject)}`);
    const me = X.me();
    X.app.innerHTML = page(`<p class="th-crumb"><a href="/theory" data-link>${t().title}</a> · ${esc(pk(d.subject))}</p>
      <h1>${esc(pk(d.name))}</h1>
      <section class="th-rule"><h2>${t().rule}</h2><p>${txt(pk(d.note))}</p></section>
      ${d.examples.length ? `<h2 class="th-h">${t().ex}</h2>${d.examples.map((q, i) => `<article class="th-ex"><span class="th-ex__n">${i + 1}</span>
        <p class="th-ex__q">${txt(pk(q.t))}</p>${q.img ? `<figure class="qfig">${q.img}</figure>` : ''}
        <ol class="th-ex__o" type="A">${pk(q.o).map(o => `<li>${esc(o)}</li>`).join('')}</ol>
        <details><summary>${t().show}</summary><p><b>${t().ans}: ${'ABCD'[q.a]}) ${esc(pk(q.o)[q.a])}</b></p><p>${txt(pk(q.e))}</p></details></article>`).join('')}` : ''}
      <div class="th-cta">${me ? `<a class="btn btn--lg" href="/practice?s=${d.s}&tp=${d.k}" data-link>${t().train(d.count)}</a>` : `<a class="btn btn--lg" href="/login" data-link>${t().login}</a>`}</div>
      ${d.others.length ? `<h2 class="th-h">${t().others}</h2><div class="th-grid">${d.others.map(x => `<a class="th-card" href="/theory/${d.s}/${x.k}" data-link><b>${esc(pk(x.name))}</b></a>`).join('')}</div>` : ''}`);
  }
  return { init: ctx => { X = ctx; }, view: path => { const m = path.match(/^\/theory\/(\w+)\/(\w+)$/); return m ? viewTopic(m[1], m[2]) : viewList(); } };
})();
