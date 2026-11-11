// Справочные материалы на экзамене (как на ЕНТ по химии): периодическая таблица и таблица растворимости.
window.REFS = (() => {
  // [Z, символ, относительная атомная масса (округлённо, как в школьных таблицах)]
  const EL = 'H 1|He 4|Li 7|Be 9|B 11|C 12|N 14|O 16|F 19|Ne 20|Na 23|Mg 24|Al 27|Si 28|P 31|S 32|Cl 35,5|Ar 40|K 39|Ca 40|Sc 45|Ti 48|V 51|Cr 52|Mn 55|Fe 56|Co 59|Ni 59|Cu 64|Zn 65|Ga 70|Ge 73|As 75|Se 79|Br 80|Kr 84|Rb 85|Sr 88|Y 89|Zr 91|Nb 93|Mo 96|Tc 98|Ru 101|Rh 103|Pd 106|Ag 108|Cd 112|In 115|Sn 119|Sb 122|Te 128|I 127|Xe 131|Cs 133|Ba 137|La 139|Ce 140|Pr 141|Nd 144|Pm 145|Sm 150|Eu 152|Gd 157|Tb 159|Dy 163|Ho 165|Er 167|Tm 169|Yb 173|Lu 175|Hf 178|Ta 181|W 184|Re 186|Os 190|Ir 192|Pt 195|Au 197|Hg 201|Tl 204|Pb 207|Bi 209|Po 209|At 210|Rn 222|Fr 223|Ra 226|Ac 227|Th 232|Pa 231|U 238|Np 237|Pu 244|Am 243|Cm 247|Bk 247|Cf 251|Es 252|Fm 257|Md 258|No 259|Lr 262|Rf 267|Db 268|Sg 269|Bh 270|Hs 269|Mt 278|Ds 281|Rg 282|Cn 285|Nh 286|Fl 289|Mc 290|Lv 293|Ts 294|Og 294'
    .split('|').map((x, i) => { const [s, m] = x.split(' '); return [i + 1, s, m]; });
  // Положение в таблице: [ряд, группа]; лантаноиды и актиноиды — отдельными рядами 9 и 10.
  function pos(z) {
    if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
    const lay = [[3, 10, 2], [11, 18, 3], [19, 36, 4], [37, 54, 5]];
    for (const [a, b, p] of lay) if (z >= a && z <= b) {
      const i = z - a, n = b - a + 1;
      return n === 8 ? [p, i < 2 ? i + 1 : i + 11] : [p, i + 1];
    }
    if (z >= 58 && z <= 71) return [9, z - 58 + 4];
    if (z >= 90 && z <= 103) return [10, z - 90 + 4];
    const p = z < 87 ? 6 : 7, a = p === 6 ? 55 : 87;
    if (z - a < 3) return [p, z - a + 1];               // Cs, Ba, La / Fr, Ra, Ac
    return [p, z - (p === 6 ? 72 : 104) + 4];            // Hf…Rn / Rf…Og
  }
  const block = (z, [r, g]) => (r >= 9 ? 'f' : g <= 2 || z === 2 ? 's' : g >= 13 ? 'p' : 'd');
  const periodic = () => `<div class="ptable">${EL.map(([z, s, m]) => {
    const p = pos(z);
    return `<div class="pt pt--${block(z, p)}" style="grid-row:${p[0] + (p[0] >= 9 ? 0 : 0)};grid-column:${p[1]}"><small>${z}</small><b>${s}</b><i>${m}</i></div>`;
  }).join('')}<div class="pt pt--gap" style="grid-row:8;grid-column:1/19"></div></div>`;

  // Растворимость: Р — растворимо, М — малорастворимо, Н — нерастворимо, — — не существует или разлагается водой.
  const CAT = ['H⁺', 'Na⁺', 'K⁺', 'NH₄⁺', 'Ba²⁺', 'Ca²⁺', 'Mg²⁺', 'Al³⁺', 'Zn²⁺', 'Fe²⁺', 'Fe³⁺', 'Cu²⁺', 'Ag⁺', 'Pb²⁺'];
  const SOL = {
    'OH⁻': '—РРРРМНННННН—Н', 'Cl⁻': 'РРРРРРРРРРРРНМ', 'Br⁻': 'РРРРРРРРРРРРНМ', 'I⁻': 'РРРРРРРРРР——НН',
    'NO₃⁻': 'РРРРРРРРРРРРРР', 'SO₄²⁻': 'РРРРНМРРРРРРМН', 'PO₄³⁻': 'РРРРНННННННННН', 'CO₃²⁻': '—РРРННН—НН——НН'
  };
  const sol = L => `<div class="soltbl"><table><thead><tr><th></th>${CAT.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${Object.entries(SOL).map(([a, row]) => `<tr><th>${a}</th>${[...row].map(v => `<td class="sv sv--${v === 'Р' ? 'r' : v === 'М' ? 'm' : v === 'Н' ? 'n' : 'x'}">${L.sv[v]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="hint">${L.solLegend}</p>`;

  const T = {
    ru: { title: 'Справочные материалы', pt: 'Периодическая таблица', sol: 'Растворимость', close: 'Закрыть', solLegend: 'Р — растворимо, М — малорастворимо, Н — нерастворимо, «—» — не существует или разлагается водой.', sv: { 'Р': 'Р', 'М': 'М', 'Н': 'Н', '—': '—' } },
    kk: { title: 'Анықтамалық материалдар', pt: 'Периодтық кесте', sol: 'Ерігіштік', close: 'Жабу', solLegend: '+ — ериді, ± — аз ериді, − — ерімейді, × — болмайды немесе сумен ыдырайды.', sv: { 'Р': '+', 'М': '±', 'Н': '−', '—': '×' } }
  };
  T.en = { ...T.ru, title: 'Reference materials', pt: 'Periodic table', sol: 'Solubility', close: 'Close', solLegend: 'S — soluble, SS — slightly soluble, I — insoluble, “—” — does not exist or decomposes in water.', sv: { 'Р': 'S', 'М': 'SS', 'Н': 'I', '—': '—' } };

  function open(lang, tab = 'pt') {
    const L = T[lang] || T.ru;
    document.querySelector('#refDlg')?.remove();
    const d = document.createElement('dialog'); d.className = 'dlg dlg--wide'; d.id = 'refDlg';
    d.innerHTML = `<div class="dlg__body"><div class="ref__head"><h2>${L.title}</h2><button class="iconbtn" data-x aria-label="${L.close}">✕</button></div>
      <div class="tabs-sm" role="tablist"><button role="tab" data-t="pt">${L.pt}</button><button role="tab" data-t="sol">${L.sol}</button></div><div class="ref__body"></div></div>`;
    document.body.appendChild(d);
    const show = t => { d.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t)); d.querySelector('.ref__body').innerHTML = t === 'pt' ? periodic() : sol(L); };
    d.onclick = e => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); if (e.target.closest('[data-x]') || e.target === d) d.close(); };
    d.addEventListener('close', () => d.remove());
    show(tab); d.showModal();
  }
  return { open };
})();
