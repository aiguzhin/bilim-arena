// Рисунки к заданиям (SVG). Цвета берутся из темы сайта, поэтому рисунки читаются и в светлой, и в тёмной теме.
// Подписи на рисунках — только буквы, числа и обозначения, одинаковые для казахской и русской версии.
const K = {
  ink: 'var(--ink, #1a2233)', soft: 'var(--ink-3, #7b8597)', grid: 'var(--line, #e3e8ef)', axis: 'var(--ink-2, #3b4556)',
  blue: 'var(--blue, #2563eb)', fill: 'var(--blue-soft, #e6efff)', red: 'var(--bad, #d14343)', green: 'var(--good, #1f9d55)', gold: 'var(--gold, #e3a400)', card: 'var(--card, #fff)'
};
const r2 = v => Math.round(v * 100) / 100;
const svg = (w, h, body) => `<svg class="qsvg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Arial, sans-serif" font-size="14" role="img">${body}</svg>`;
const txt = (x, y, s, o = {}) => `<text x="${r2(x)}" y="${r2(y)}" fill="${o.c || K.ink}" font-size="${o.size || 14}" text-anchor="${o.a || 'middle'}"${o.it ? ' font-style="italic"' : ''}${o.b ? ' font-weight="700"' : ''} dominant-baseline="middle">${s}</text>`;
const line = (x1, y1, x2, y2, o = {}) => `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${o.c || K.ink}" stroke-width="${o.w || 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''} stroke-linecap="round"/>`;
const dot = (x, y, o = {}) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${o.r || 4}" fill="${o.c || K.ink}"/>`;
const poly = (pts, o = {}) => `<polygon points="${pts.map(p => p.map(r2).join(',')).join(' ')}" fill="${o.fill || 'none'}" stroke="${o.c || K.ink}" stroke-width="${o.w || 2}" stroke-linejoin="round"/>`;
const path = (pts, o = {}) => `<polyline points="${pts.map(p => p.map(r2).join(',')).join(' ')}" fill="none" stroke="${o.c || K.blue}" stroke-width="${o.w || 2.5}" stroke-linejoin="round" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
const arrow = (x1, y1, x2, y2, o = {}) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 9;
  const p1 = [x2 - L * Math.cos(a - 0.4), y2 - L * Math.sin(a - 0.4)], p2 = [x2 - L * Math.cos(a + 0.4), y2 - L * Math.sin(a + 0.4)];
  return line(x1, y1, x2, y2, o) + `<polygon points="${r2(x2)},${r2(y2)} ${p1.map(r2).join(',')} ${p2.map(r2).join(',')}" fill="${o.c || K.ink}"/>`;
};

// Координатная плоскость с графиками. fns: [{ f, c, dash }] или { pts } для ломаной; area: { f, from, to } — закрашенная площадь.
function graph({ x: [x0, x1], y: [y0, y1], w = 340, h = 280, step = 1, labelStep = 1, ystep = step, ylabelStep = labelStep, fns = [], points = [], area = null, guides = [], xl = 'x', yl = 'y', ticks = true }) {
  const pad = 26;
  const X = v => pad + (v - x0) / (x1 - x0) * (w - 2 * pad), Y = v => h - pad - (v - y0) / (y1 - y0) * (h - 2 * pad);
  let b = '';
  for (let v = Math.ceil(x0 / step) * step; v <= x1 + 1e-9; v += step) b += line(X(v), Y(y0), X(v), Y(y1), { c: K.grid, w: 1 });
  for (let v = Math.ceil(y0 / ystep) * ystep; v <= y1 + 1e-9; v += ystep) b += line(X(x0), Y(v), X(x1), Y(v), { c: K.grid, w: 1 });
  if (area) {
    const pts = [];
    for (let i = 0; i <= 80; i++) { const v = area.from + (area.to - area.from) * i / 80; pts.push([X(v), Y(area.f(v))]); }
    b += `<polygon points="${[[X(area.from), Y(0)], ...pts, [X(area.to), Y(0)]].map(p => p.map(r2).join(',')).join(' ')}" fill="${K.fill}" stroke="none"/>`;
  }
  const ax = Y(Math.min(Math.max(0, y0), y1)), ay = X(Math.min(Math.max(0, x0), x1));
  b += arrow(X(x0), ax, X(x1) + 12, ax, { c: K.axis, w: 1.5 }) + arrow(ay, Y(y0), ay, Y(y1) - 12, { c: K.axis, w: 1.5 });
  b += txt(X(x1) + 4, ax - 14, xl, { it: true, c: K.axis, a: 'end' }) + txt(ay + 8, Y(y1) - 10, yl, { it: true, c: K.axis, a: 'start' });
  if (ticks) {
    for (let v = Math.ceil(x0 / labelStep) * labelStep; v <= x1 + 1e-9; v += labelStep) if (Math.abs(v) > 1e-9) b += txt(X(v), ax + 13, String(+v.toFixed(2)).replace('-', '−').replace('.', ','), { size: 11, c: K.soft });
    for (let v = Math.ceil(y0 / ylabelStep) * ylabelStep; v <= y1 + 1e-9; v += ylabelStep) if (Math.abs(v) > 1e-9) b += txt(ay - 9, Y(v), String(+v.toFixed(2)).replace('-', '−').replace('.', ','), { size: 11, c: K.soft, a: 'end' });
    b += txt(ay - 9, ax + 12, 'O', { size: 12, c: K.soft, a: 'end' });
  }
  for (const g of guides) b += line(X(g[0]), Y(g[1]), X(g[2]), Y(g[3]), { c: K.soft, w: 1.2, dash: '4 4' });
  const clip = `c${Math.random().toString(36).slice(2, 8)}`;
  b += `<clipPath id="${clip}"><rect x="${pad}" y="${pad - 6}" width="${w - 2 * pad}" height="${h - 2 * pad + 12}"/></clipPath><g clip-path="url(#${clip})">`;
  for (const fn of fns) {
    if (fn.pts) { b += path(fn.pts.map(([a, c]) => [X(a), Y(c)]), { c: fn.c || K.blue, dash: fn.dash }); continue; }
    let seg = [];
    const flush = () => { if (seg.length > 1) b += path(seg, { c: fn.c || K.blue, dash: fn.dash }); seg = []; };
    for (let i = 0; i <= 140; i++) {
      const v = (fn.from ?? x0) + ((fn.to ?? x1) - (fn.from ?? x0)) * i / 140, yv = fn.f(v);
      if (!Number.isFinite(yv) || yv < y0 - (y1 - y0) || yv > y1 + (y1 - y0)) { flush(); continue; }
      seg.push([X(v), Y(yv)]);
    }
    flush();
  }
  b += '</g>';
  for (const [a, c, label, pos = 'ne'] of points) {
    b += dot(X(a), Y(c), { c: K.red });
    if (label) b += txt(X(a) + (pos.includes('w') ? -8 : 8), Y(c) + (pos.includes('s') ? 14 : -12), label, { size: 12, a: pos.includes('w') ? 'end' : 'start' });
  }
  return svg(w, h, b);
}

// Столбчатая диаграмма: data [[подпись, значение]].
function bars(data, { max, step, w = 360, h = 240, unit = '', color = K.blue }) {
  const pad = { l: 44, r: 12, t: 16, b: 32 };
  const Y = v => h - pad.b - v / max * (h - pad.t - pad.b);
  const bw = (w - pad.l - pad.r) / data.length;
  let b = '';
  for (let v = 0; v <= max + 1e-9; v += step) b += line(pad.l, Y(v), w - pad.r, Y(v), { c: K.grid, w: 1 }) + txt(pad.l - 8, Y(v), `${v}${unit}`, { size: 11, c: K.soft, a: 'end' });
  data.forEach(([l, v], i) => {
    const x = pad.l + i * bw + bw * 0.2;
    b += `<rect x="${r2(x)}" y="${r2(Y(v))}" width="${r2(bw * 0.6)}" height="${r2(Y(0) - Y(v))}" rx="3" fill="${color}"/>`;
    b += txt(x + bw * 0.3, Y(v) - 10, String(v), { size: 12, b: true }) + txt(x + bw * 0.3, h - pad.b + 16, l, { size: 12, c: K.axis });
  });
  b += line(pad.l, Y(0), w - pad.r, Y(0), { c: K.axis, w: 1.5 });
  return svg(w, h, b);
}

// Круговая диаграмма: data [[подпись, доля в процентах]].
function pie(data, { w = 320, h = 220 } = {}) {
  const cx = 110, cy = h / 2, R = 88, colors = [K.blue, K.gold, K.green, K.red, K.soft];
  let a = -Math.PI / 2, b = '';
  data.forEach(([l, p], i) => {
    const a2 = a + p / 100 * 2 * Math.PI, big = p > 50 ? 1 : 0;
    b += `<path d="M${cx},${cy} L${r2(cx + R * Math.cos(a))},${r2(cy + R * Math.sin(a))} A${R},${R} 0 ${big} 1 ${r2(cx + R * Math.cos(a2))},${r2(cy + R * Math.sin(a2))} Z" fill="${colors[i]}" stroke="${K.card}" stroke-width="2"/>`;
    const m = (a + a2) / 2; b += txt(cx + R * 0.62 * Math.cos(m), cy + R * 0.62 * Math.sin(m), `${p}%`, { size: 13, b: true, c: '#fff' });
    b += `<rect x="216" y="${36 + i * 30}" width="16" height="16" rx="3" fill="${colors[i]}"/>` + txt(240, 44 + i * 30, l, { a: 'start', b: true });
    a = a2;
  });
  return svg(w, h, b);
}

module.exports = { K, svg, txt, line, dot, poly, path, arrow, graph, bars, pie };
