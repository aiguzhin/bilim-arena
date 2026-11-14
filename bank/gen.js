// Генераторы заданий: каждое задание собирается по шаблону с числами, ответ вычисляется,
// неверные варианты — типичные ошибки. Случайность детерминированная (seed), поэтому набор
// заданий не меняется между перезапусками и id остаются прежними.
const { S } = require('./h');

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const tools = r => ({
  int: (a, b) => a + Math.floor(r() * (b - a + 1)),
  pick: arr => arr[Math.floor(r() * arr.length)],
  shuffle: arr => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
});
// Число в записи ЕНТ: десятичная запятая, без лишних нулей.
const num = (v, d = 2) => {
  const s = (Math.round(v * 10 ** d) / 10 ** d).toString();
  return s.replace('.', ',').replace('-', '−');
};
// Собирает 4 варианта: правильный + три различных неверных. Если неверных не хватает — добивает соседними значениями.
function options(T, right, wrong, fmt = x => (typeof x === 'number' ? num(x, 3) : String(x))) {
  const R = fmt(right);
  const out = [];
  for (const w of wrong) { const f = fmt(w); if (f !== R && !out.includes(f) && !/NaN|Infinity/.test(f)) out.push(f); if (out.length === 3) break; }
  let k = 1;
  while (out.length < 3) {
    const cand = typeof right === 'number' ? fmt(right + k * (Number.isInteger(right) ? 1 : 0.5) * (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.max(1, Math.round(Math.abs(right) / 10))) : R + k;
    if (cand !== R && !out.includes(cand)) out.push(cand);
    k++;
  }
  const o = T.shuffle([R, ...out]);
  return { o, a: o.indexOf(R) };
}
// Строит n заданий одного шаблона. make(T) возвращает { ru, kk, right, wrong, fmt?, e: [ru, kk], okk? }.
function series(seed, n, make) {
  const r = rng(seed), T = tools(r), out = [], seen = new Set();
  for (let tries = 0; out.length < n && tries < n * 20; tries++) {
    const q = make(T);
    if (!q || seen.has(q.ru)) continue;
    seen.add(q.ru);
    const minus = t => t.replace(/(^|[^\w)])-(?=\d)/g, '$1−');
    q.ru = minus(q.ru); q.kk = minus(q.kk); q.e = q.e.map(minus);
    const { o, a } = options(T, q.right, q.wrong, q.fmt);
    const okk = q.okk ? o.map(q.okk) : null;
    out.push(S(q.ru, q.kk, o, okk, a, q.e[0], q.e[1]));
  }
  return out;
}
module.exports = { rng, tools, num, options, series };
