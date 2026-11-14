// «Вузы и гранты»: мой шанс на грант, пороговые баллы, вузы Казахстана, зарубежные вузы.
window.UNI = (() => {
  let X, D = null, tab = 'chance';
  const $ = (s, el = document) => el.querySelector(s);
  const T = {
    ru: {
      title: 'Вузы и гранты', lead: 'Пороговые и проходные баллы, вузы Казахстана и зарубежные вузы, которые принимают ЕНТ.',
      tChance: 'Мой шанс', tRules: 'Пороги', tKz: 'Вузы Казахстана', tAbroad: 'За рубежом',
      combo: 'Профильные предметы', score: 'Мой балл ЕНТ', of: 'из 140', rural: 'Я из сельской местности (сельская квота)',
      fromMock: s => `Подставили результат последнего пробного ЕНТ: ${s}`, noMock: 'Сдайте пробный ЕНТ, и балл подставится сам.', toMock: 'Сдать пробный ЕНТ',
      group: 'Группа программ', paid: 'Платно: от', grantMin: 'Грант 2025: от', where: 'Где был грант с таким баллом', nowhere: 'В 2025 году грант на эту группу давали от более высокого балла.',
      need: n => `Не хватает ${n}`, ok: 'Проходите', edge: 'На грани', low: 'Мало', noData: 'Нет данных о грантах', below: n => 'не хватает до платного',
      paidOk: 'Платно — проходите', more: n => `и ещё ${n}`, chanceNote: 'Проходной балл — с каким баллом получил грант последний поступивший в 2025 году. В 2026 он может измениться на несколько баллов.',
      rTitle: 'Пороговые баллы ЕНТ-2026', rLead: 'Ниже порога нельзя участвовать в конкурсе на грант и поступить платно.',
      rGeneral: 'Большинство специальностей', rNational: 'Национальные вузы', rHealth: 'Медицина и здравоохранение', rPed: 'Педагогические специальности', rLaw: 'Право', rAgro: 'Сельское хозяйство и ветеринария (в т. ч. в национальных вузах)',
      rSubj: 'Минимум по каждому предмету', rSubjNote: 'Если по одному предмету ниже минимума — к конкурсу не допустят, даже при высокой сумме.',
      subj: { history: 'История Казахстана', mathlit: 'Математическая грамотность', reading: 'Грамотность чтения', profile1: 'Профильный предмет 1', profile2: 'Профильный предмет 2' },
      rHow: 'Как это работает', rHow1: 'Грант дают по конкурсу внутри группы образовательных программ, а не на отдельную специальность.', rHow2: 'Основное ЕНТ (май–июль) — для гранта и платного. Январь, март и август — только для платного.', rHow3: 'У вуза может быть свой порог выше государственного — он указан на странице вуза.',
      src: 'Источники', srcData: d => `Проходные баллы — итоги конкурса грантов 2025 года (данные НЦТ, сводка univision.kz). Обновлено ${d}.`,
      search: 'Название вуза', allCities: 'Все города', groups: n => `Групп с грантами: ${n}`, price: 'Обучение в год', noPrice: 'стоимость не указана', national: 'Национальный',
      uBack: 'Все вузы', uGrant: 'Грант 2025', uRural: 'Сельская квота', uGrants: 'Грантов', uPaid: 'Порог платного', uNoGroups: 'Данных о грантах в этот вуз нет — он мог не участвовать в конкурсе грантов.', uSrc: 'Подробнее на univision.kz',
      aTitle: 'Зарубежные вузы, которые принимают ЕНТ', aTurkey: 'Турция', aBranches: 'Филиалы зарубежных вузов в Казахстане', aBranchesLead: 'Диплом зарубежного вуза без переезда. Поступают выпускники казахстанских школ; почти везде нужен английский (IELTS или внутренний тест). Точные требования — на сайте вуза.',
      aMin: n => `ЕНТ от ${n}`, aSite: 'Сайт и требования', aNU: 'Назарбаев Университет', aNUText: 'Принимает не по ЕНТ, а по своим экзаменам (NUET) и IELTS.',
      loading: 'Загружаем…', empty: 'Данные о вузах ещё загружаются. Загляните чуть позже.', login: 'Войдите, чтобы подставить ваш балл'
    },
    kk: {
      title: 'ЖОО және гранттар', lead: 'Шекті және өту баллдары, Қазақстан ЖОО-лары және ҰБТ-ны қабылдайтын шетел ЖОО-лары.',
      tChance: 'Менің мүмкіндігім', tRules: 'Шекті балл', tKz: 'Қазақстан ЖОО', tAbroad: 'Шетелде',
      combo: 'Бейіндік пәндер', score: 'Менің ҰБТ баллым', of: '140-тан', rural: 'Мен ауылданмын (ауыл квотасы)',
      fromMock: s => `Соңғы сынақ ҰБТ нәтижесі қойылды: ${s}`, noMock: 'Сынақ ҰБТ тапсырыңыз — балл өзі қойылады.', toMock: 'Сынақ ҰБТ тапсыру',
      group: 'Бағдарламалар тобы', paid: 'Ақылы: бастап', grantMin: 'Грант 2025: бастап', where: 'Осы баллмен грант берілген жерлер', nowhere: '2025 жылы бұл топқа грант жоғарырақ баллдан берілді.',
      need: n => `${n} балл жетпейді`, ok: 'Өтесіз', edge: 'Шекте', low: 'Аз', noData: 'Грант туралы дерек жоқ', below: n => 'ақылыға жетпейді',
      paidOk: 'Ақылы — өтесіз', more: n => `тағы ${n}`, chanceNote: 'Өту баллы — 2025 жылы грант алған соңғы талапкердің баллы. 2026 жылы бірнеше баллға өзгеруі мүмкін.',
      rTitle: 'ҰБТ-2026 шекті баллдары', rLead: 'Шектен төмен болса, грант конкурсына қатыса алмайсыз және ақылы түсе алмайсыз.',
      rGeneral: 'Мамандықтардың көбі', rNational: 'Ұлттық ЖОО', rHealth: 'Медицина және денсаулық сақтау', rPed: 'Педагогикалық мамандықтар', rLaw: 'Құқық', rAgro: 'Ауыл шаруашылығы және ветеринария (ұлттық ЖОО-да да)',
      rSubj: 'Әр пән бойынша минимум', rSubjNote: 'Бір пән минимумнан төмен болса, жалпы балл жоғары болса да конкурсқа жіберілмейді.',
      subj: { history: 'Қазақстан тарихы', mathlit: 'Математикалық сауаттылық', reading: 'Оқу сауаттылығы', profile1: 'Бейіндік пән 1', profile2: 'Бейіндік пән 2' },
      rHow: 'Қалай жұмыс істейді', rHow1: 'Грант жеке мамандыққа емес, білім беру бағдарламалары тобы ішінде конкурспен беріледі.', rHow2: 'Негізгі ҰБТ (мамыр–шілде) — грант пен ақылы оқуға. Қаңтар, наурыз, тамыз — тек ақылы оқуға.', rHow3: 'ЖОО-ның мемлекеттік шектен жоғары өз шегі болуы мүмкін — ол ЖОО бетінде көрсетілген.',
      src: 'Дереккөздер', srcData: d => `Өту баллдары — 2025 жылғы грант конкурсының қорытындысы (ҰТО деректері, univision.kz жинағы). Жаңартылды ${d}.`,
      search: 'ЖОО атауы', allCities: 'Барлық қалалар', groups: n => `Грантты топтар: ${n}`, price: 'Жылдық оқу ақысы', noPrice: 'бағасы көрсетілмеген', national: 'Ұлттық',
      uBack: 'Барлық ЖОО', uGrant: 'Грант 2025', uRural: 'Ауыл квотасы', uGrants: 'Грант саны', uPaid: 'Ақылы шегі', uNoGroups: 'Бұл ЖОО-ға грант туралы дерек жоқ — ол грант конкурсына қатыспаған болуы мүмкін.', uSrc: 'Толығырақ univision.kz сайтында',
      aTitle: 'ҰБТ-ны қабылдайтын шетел ЖОО-лары', aTurkey: 'Түркия', aBranches: 'Қазақстандағы шетел ЖОО филиалдары', aBranchesLead: 'Көшпей-ақ шетел ЖОО дипломы. Қазақстан мектеп түлектері түседі; барлық жерде дерлік ағылшын тілі керек (IELTS немесе ішкі тест). Нақты талаптар — ЖОО сайтында.',
      aMin: n => `ҰБТ: ${n} балдан`, aSite: 'Сайт және талаптар', aNU: 'Назарбаев Университеті', aNUText: 'ҰБТ бойынша емес, өз емтихандары (NUET) мен IELTS бойынша қабылдайды.',
      loading: 'Жүктелуде…', empty: 'ЖОО деректері әлі жүктелуде. Сәл кейін қараңыз.', login: 'Балыңызды қою үшін кіріңіз'
    }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const norm = c => String(c).replace(/^BM/, 'B');
  const CN = { ru: { TR: 'Турция', GB: 'Великобритания', US: 'США', DE: 'Германия', FR: 'Франция', RU: 'Россия', CN: 'Китай', KR: 'Корея', HK: 'Гонконг' }, kk: { TR: 'Түркия', GB: 'Ұлыбритания', US: 'АҚШ', DE: 'Германия', FR: 'Франция', RU: 'Ресей', CN: 'Қытай', KR: 'Корея', HK: 'Гонконг' } };
  const country = c => (CN[X.lang()] || CN.ru)[c] || c;

  async function load() { if (!D) D = await fetch('/api/unis').then(r => r.json()); return D; }
  const KIND = c => { const n = +norm(c).slice(1); return n <= 20 ? 'pedagogy' : n === 49 ? 'law' : n >= 84 && n <= 89 ? 'health' : (n >= 77 && n <= 83) || n === 183 ? 'agro' : 'general'; };
  const ruleMin = (c, nat) => { const k = KIND(c), R = D.rules; return k === 'general' ? (nat ? R.national : R.general) : R[k]; };
  const paidMin = (u, c) => { const v = u.t && u.t[c]; return Math.max(ruleMin(c, u.nat), typeof v === 'number' ? v : 0); };
  const gname = c => (D.data?.groups || {})[norm(c)] || (D.data?.groups || {})[c] || c;

  function shell(body) {
    const tb = (k, n) => `<a href="/unis${k === 'chance' ? '' : '?tab=' + k}" data-link role="tab" aria-selected="${tab === k}">${n}</a>`;
    X.app.innerHTML = `<div class="page"><div class="wrap">
      <h1>${t().title}</h1><p class="page__lead">${t().lead}</p>
      <div class="tabs-sm uni-tabs" role="tablist" style="margin-top:20px">${tb('chance', t().tChance)}${tb('rules', t().tRules)}${tb('kz', t().tKz)}${tb('abroad', t().tAbroad)}</div>
      <div id="uBody">${body}</div></div></div>${X.footer()}`;
  }

  async function view(path) {
    X.setTitle(t().title);
    const q = new URLSearchParams(location.search).get('tab');
    tab = ['chance', 'rules', 'kz', 'abroad'].includes(q) ? q : 'chance';
    const m = path.match(/^\/unis\/(\d+)$/);
    if (m) tab = 'kz';
    shell(`${SKEL()}`);
    try { await load(); } catch { $('#uBody').innerHTML = `<div class="empty">${t().empty}</div>`; return; }
    if (m) return uni(m[1]);
    ({ chance, rules, kz, abroad })[tab]();
  }

  // ---------- мой шанс ----------
  async function chance() {
    const body = $('#uBody');
    if (!D.data) { body.innerHTML = `<div class="empty">${t().empty}</div>`; return; }
    let last = null;
    if (X.me()) { try { last = (await X.api('/api/ent')).tests.find(x => !x.flag || x.cleared) || null; } catch {} }
    const combos = Object.keys(D.combos).filter(c => X.meta().combos?.[c]);
    const st = { combo: last?.combo && D.combos[last.combo] ? last.combo : combos[0], score: last ? last.score : 80, rural: false };
    try { Object.assign(st, JSON.parse(localStorage.getItem('ba_uni') || '{}')); if (last) { st.combo = D.combos[last.combo] ? last.combo : st.combo; st.score = last.score; } } catch {}
    body.innerHTML = `<div class="uform">
        <label class="field">${t().combo}<select id="uc">${combos.map(c => `<option value="${c}">${esc(X.topicName('combo:' + c))}</option>`).join('')}</select></label>
        <label class="field">${t().score} · ${t().of}<input id="us" type="number" inputmode="numeric" min="0" max="140" value="${st.score}"></label>
        <label class="check"><input id="ur" type="checkbox"${st.rural ? ' checked' : ''}> ${t().rural}</label>
      </div>
      <p class="hint">${last ? t().fromMock(last.score) : `${X.me() ? t().noMock : t().login} · <a href="/ent" data-link>${t().toMock}</a>`}</p>
      <div id="uRes" class="ures"></div><p class="hint">${t().chanceNote}</p>${srcNote()}`;
    $('#uc').value = st.combo;
    const run = () => {
      st.combo = $('#uc').value; st.score = Math.max(0, Math.min(140, +$('#us').value || 0)); st.rural = $('#ur').checked;
      try { localStorage.setItem('ba_uni', JSON.stringify({ combo: st.combo, rural: st.rural })); } catch {}
      $('#uRes').innerHTML = result(st);
    };
    ['#uc', '#us', '#ur'].forEach(s => $(s).addEventListener('input', run));
    run();
  }
  function result({ combo, score, rural }) {
    const labels = [].concat(D.combos[combo] || []);
    const codes = [...new Set(labels.flatMap(l => D.data.subjects[l] || []))];
    const rows = codes.map(code => {
      const offers = D.data.unis.map(u => {
        const g = u.g[code] || u.g['BM' + code.slice(1)]; const r = u.r?.[code] ?? u.r?.['BM' + code.slice(1)];
        const min = rural && typeof r === 'number' ? r : g ? g[0] : null;
        return { u, min, grants: g ? g[1] : 0, paid: paidMin(u, code) };
      });
      const withGrant = offers.filter(o => o.min != null);
      const best = withGrant.length ? Math.min(...withGrant.map(o => o.min)) : null;
      const reach = withGrant.filter(o => score >= o.min).sort((a, b) => b.min - a.min);
      const paidAny = Math.min(...offers.map(o => o.paid));
      return { code, best, reach, paidAny, n: withGrant.length };
    }).filter(r => r.n).sort((a, b) => (b.reach.length > 0) - (a.reach.length > 0) || a.best - b.best);
    if (!rows.length) return `<div class="empty">${t().noData}</div>`;
    return rows.map(r => {
      const st = score >= r.best ? (score - r.best >= 3 ? 'ok' : 'edge') : (r.best - score <= 5 ? 'edge' : 'low');
      const badge = score >= r.best ? `<span class="ubadge ubadge--${st}">${st === 'ok' ? t().ok : t().edge}</span>` : `<span class="ubadge ubadge--${st}">${t().need(r.best - score)}</span>`;
      const list = r.reach.slice(0, 4).map(o => `<a href="/unis/${o.u.id}" data-link class="uchip">${esc(o.u.name)} <b class="num">${o.min}</b></a>`).join('');
      return `<article class="ucard">
        <header><div><span class="ucode">${esc(norm(r.code))}</span><h3>${esc(gname(r.code))}</h3></div>${badge}</header>
        <div class="unums"><span>${t().grantMin} <b class="num">${r.best}</b></span><span>${t().paid} <b class="num">${r.paidAny}</b>${score < r.paidAny ? ` · ${t().below(r.paidAny)}` : ''}</span></div>
        ${r.reach.length ? `<p class="ulbl">${t().where}</p><div class="uchips">${list}${r.reach.length > 4 ? `<span class="uchip uchip--more">${t().more(r.reach.length - 4)}</span>` : ''}</div>` : `<p class="hint">${t().nowhere}</p>`}
      </article>`;
    }).join('');
  }

  // ---------- пороги ----------
  function rules() {
    const R = D.rules;
    const card = (n, v) => `<div class="rcard"><b class="num">${v}</b><span>${n}</span></div>`;
    $('#uBody').innerHTML = `<h2 class="uh2">${t().rTitle}</h2><p class="hint" style="margin-top:4px">${t().rLead}</p>
      <div class="rgrid">${card(t().rGeneral, R.general)}${card(t().rNational, R.national)}${card(t().rHealth, R.health)}${card(t().rPed, R.pedagogy)}${card(t().rLaw, R.law)}${card(t().rAgro, R.agro)}</div>
      <h2 class="uh2">${t().rSubj}</h2>
      <div class="table-wrap"><table class="utable"><tbody>${R.subjects.map(([k, min, max]) => `<tr><td>${t().subj[k]}</td><td class="num"><b>${min}</b> / ${max}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint">${t().rSubjNote}</p>
      <h2 class="uh2">${t().rHow}</h2><ul class="ulist"><li>${t().rHow1}</li><li>${t().rHow2}</li><li>${t().rHow3}</li></ul>
      <h2 class="uh2">${t().src}</h2><ul class="ulist">${R.sources.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}</ul>`;
  }

  // ---------- вузы Казахстана ----------
  function kz() {
    const body = $('#uBody');
    if (!D.data) { body.innerHTML = `<div class="empty">${t().empty}</div>`; return; }
    const cities = [...new Set(D.data.unis.map(u => u.city))].sort((a, b) => a.localeCompare(b, 'ru'));
    body.innerHTML = `<div class="uform uform--kz"><label class="field">${t().search}<input id="uq" type="search" autocomplete="off"></label>
      <label class="field">&nbsp;<select id="ucity"><option value="">${t().allCities}</option>${cities.map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>
      <div id="uList" class="ugrid"></div>${srcNote()}`;
    const draw = () => {
      const q = $('#uq').value.trim().toLowerCase(), c = $('#ucity').value;
      const list = D.data.unis.filter(u => (!c || u.city === c) && (!q || u.name.toLowerCase().includes(q)))
        .sort((a, b) => Object.keys(b.g).length - Object.keys(a.g).length);
      $('#uList').innerHTML = list.map(u => `<a class="ucard ucard--link" href="/unis/${u.id}" data-link>
        <h3>${esc(u.name)}</h3><p class="muted">${esc(u.city)}${u.nat ? ` · <span class="tag tag--ok">${t().national}</span>` : ''}</p>
        <div class="unums"><span>${Object.keys(u.g).length ? t().groups(Object.keys(u.g).length) : '—'}</span><span>${u.price ? `${fmt(u.price[0])}${u.price[1] !== u.price[0] ? '–' + fmt(u.price[1]) : ''} ₸` : t().noPrice}</span></div></a>`).join('');
    };
    $('#uq').addEventListener('input', draw); $('#ucity').addEventListener('change', draw); draw();
  }
  function uni(id) {
    const u = D.data?.unis.find(x => String(x.id) === id);
    if (!u) return kz();
    X.setTitle(u.name);
    const codes = [...new Set([...Object.keys(u.g), ...Object.keys(u.t || {}).filter(c => typeof u.t[c] === 'number')])].sort((a, b) => norm(a).localeCompare(norm(b)));
    $('#uBody').innerHTML = `<a href="/unis?tab=kz" data-link class="back">← ${t().uBack}</a>
      <h2 class="uh2" style="margin-top:12px">${esc(u.name)}</h2>
      <p class="muted">${esc(u.city)}${u.nat ? ` · ${t().national}` : ''} · ${t().price}: ${u.price ? `${fmt(u.price[0])}${u.price[1] !== u.price[0] ? '–' + fmt(u.price[1]) : ''} ₸` : t().noPrice}</p>
      ${Object.keys(u.g).length ? '' : `<p class="hint">${t().uNoGroups}</p>`}
      ${codes.length ? `<div class="table-wrap"><table class="utable utable--uni"><thead><tr><th>${t().group}</th><th>${t().uGrant}</th><th>${t().uRural}</th><th>${t().uGrants}</th><th>${t().uPaid}</th></tr></thead><tbody>
        ${codes.map(c => `<tr><td><span class="ucode">${esc(norm(c))}</span> ${esc(gname(c))}</td><td class="num"><b>${u.g[c]?.[0] ?? '—'}</b></td><td class="num">${u.r?.[c] ?? '—'}</td><td class="num">${u.g[c]?.[1] ?? '—'}</td><td class="num">${paidMin(u, c)}</td></tr>`).join('')}
      </tbody></table></div>` : ''}
      <p class="hint"><a href="https://univision.kz${esc(u.path || '/univ/')}" target="_blank" rel="noopener">${t().uSrc}</a></p>${srcNote()}`;
  }

  // ---------- зарубежные ----------
  function abroad() {
    const nm = o => o[X.lang()] || o.ru;
    $('#uBody').innerHTML = `<h2 class="uh2">${t().aTitle}</h2>
      <h3 class="uh3">${t().aTurkey}</h3>
      <div class="ugrid">${D.foreign.map(f => `<article class="ucard"><h3>${esc(f.name)}</h3><p class="muted">${esc(f.city)}${f.ent ? ` · <b>${t().aMin(f.ent)}</b>` : ''}</p><p class="utext">${esc(nm(f.req))}</p><a href="${esc(f.url)}" target="_blank" rel="noopener">${t().aSite} →</a></article>`).join('')}</div>
      <h3 class="uh3">${t().aBranches}</h3><p class="hint" style="margin-top:0">${t().aBranchesLead}</p>
      <div class="table-wrap"><table class="utable"><tbody>${D.branches.map(b => `<tr><td>${esc(b.name)}</td><td class="muted">${country(b.country)}</td><td>${esc(b.city)}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint"><a href="${esc(D.branchesSrc)}" target="_blank" rel="noopener">informburo.kz</a></p>
      <article class="ucard" style="margin-top:20px"><h3>${t().aNU}</h3><p class="utext">${t().aNUText}</p></article>`;
  }

  const srcNote = () => D.data ? `<p class="hint usrc">${t().srcData(new Date(D.data.updated_at || D.data.updated).toLocaleDateString(X.lang() === 'kk' ? 'kk-KZ' : 'ru-RU'))}</p>` : '';

  function init(ctx) { X = ctx; }
  return { init, view };
})();
