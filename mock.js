// Пробный ЕНТ: вариант из 120 заданий в формате настоящего экзамена, 240 минут, максимум 140 баллов.
const BANK = require('./bank');

const DURATION_MS = 240 * 60 * 1000;
const GRACE_MS = 2 * 60 * 1000;
// Обязательные предметы: число заданий и порог. Профильные: 25 с одним ответом, 5 по контексту,
// 5 с одним или несколькими ответами, 5 на соответствие — 40 заданий, 50 баллов, порог 5.
// История: 10 заданий с одним ответом + 10 по двум историческим источникам; грамотности — задания к текстам и таблицам.
const MANDATORY = { history: { n: 20, c: 10, min: 5 }, mathlit: { n: 10, c: 10, min: 3 }, reading: { n: 10, c: 10, min: 3 } };
const PROFILE = { s: 25, c: 5, m: 5, p: 5, min: 5 };

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const byId = new Map(Object.values(BANK).flatMap(s => s.q.map(q => [q.id, q])));
// Языковые предметы одинаковы во всех версиях; остальные идут на английском, если есть перевод.
const NEUTRAL = new Set(['english', 'kazlang', 'kazlit', 'ruslang', 'ruslit']);
const hasEn = q => NEUTRAL.has(q.id.split(':')[0]) || !!q.t.en;
const kindOf = q => (q.type === 'm' ? 'm' : q.type === 'p' ? 'p' : q.c ? 'c' : 's');

// Сначала то, чего ученик ещё не видел в прошлых пробных: так варианты не повторяются, пока хватает банка.
let SEEN = new Set();
const fresh = list => shuffle(list).sort((a, b) => a.seen - b.seen);
// Контекстные задания берём группами (один текст — несколько вопросов).
function takeContext(pool, n, used) {
  const groups = {};
  for (const q of pool) if (q.c && !used.has(q.id)) (groups[q.c] ||= []).push(q);
  const out = [];
  const ordered = fresh(Object.values(groups).map(g => ({ g, seen: g.some(q => SEEN.has(q.id)) ? 1 : 0 }))).map(x => x.g);
  for (const g of ordered) {
    if (out.length >= n) break;
    const part = g.slice(0, n - out.length);
    part.forEach(q => used.add(q.id)); out.push(...part);
  }
  return out;
}
function takeKind(pool, kind, n, used) {
  const list = fresh(pool.filter(q => kindOf(q) === kind && !used.has(q.id)).map(q => ({ q, seen: SEEN.has(q.id) ? 1 : 0 }))).map(x => x.q).slice(0, n);
  list.forEach(q => used.add(q.id));
  return list;
}
// Если какого-то типа не хватает — добираем заданиями с одним ответом, чтобы вариант был полным.
function fill(pool, list, n, used) {
  if (list.length < n) list.push(...takeKind(pool, 's', n - list.length, used));
  if (list.length < n) list.push(...takeKind(pool, 'c', n - list.length, used));
  return list;
}

function item(q) {
  const kind = kindOf(q);
  const n = q.o.ru.length;
  const ord = kind === 'p' ? shuffle([...Array(n).keys()]) : shuffle([...Array(n).keys()]);
  return { id: q.id, ord };
}

function build(pair, seen = new Set(), lang = 'ru') {
  SEEN = seen;
  const poolOf = (k, need) => { const all = BANK[k].q; if (lang !== 'en') return all; const en = all.filter(hasEn); return en.length >= need ? en : all; };
  const sections = [];
  for (const [k, cfg] of Object.entries(MANDATORY)) {
    const pool = poolOf(k, cfg.n), used = new Set();
    const ctx = takeContext(pool, cfg.c, used);
    const single = takeKind(pool, 's', cfg.n - ctx.length, used);
    // В истории сначала задания с одним ответом, потом задания по источникам — как в настоящем варианте.
    const list = fill(pool, k === 'history' ? single.concat(ctx) : ctx.concat(single), cfg.n, used);
    sections.push({ k, items: list.map(item) });
  }
  for (const k of pair) {
    const pool = poolOf(k, 40), used = new Set();
    const s = takeKind(pool, 's', PROFILE.s, used);
    const c = takeContext(pool, PROFILE.c, used);
    const m = takeKind(pool, 'm', PROFILE.m, used);
    const p = takeKind(pool, 'p', PROFILE.p, used);
    const total = PROFILE.s + PROFILE.c + PROFILE.m + PROFILE.p;
    // Недостающие m/p заменяем одиночными так, чтобы заданий всё равно было 40.
    const singles = fill(pool, s.concat(c), total - m.length - p.length, used);
    sections.push({ k, items: [...singles, ...m, ...p].map(item) });
  }
  return sections;
}

const maxOf = q => (q.type === 'm' || q.type === 'p' ? 2 : 1);
const thresholdOf = k => MANDATORY[k]?.min ?? PROFILE.min;

// Ответ клиента хранится в порядке показа; переводим в исходные индексы варианта.
function scoreOne(q, it, ans) {
  if (!q || ans == null) return 0;
  const orig = i => it.ord[i];
  if (q.type === 'p') {
    if (!Array.isArray(ans)) return 0;
    return q.a.reduce((n, a, i) => n + (Number.isInteger(ans[i]) && orig(ans[i]) === a ? 1 : 0), 0);
  }
  if (q.type === 'm') {
    if (!Array.isArray(ans) || !ans.length) return 0;
    const picked = new Set(ans.filter(Number.isInteger).map(orig));
    let c = 0, w = 0;
    for (const x of picked) q.a.includes(x) ? c++ : w++;
    const n = q.a.length;
    if (w >= 2) return 0;
    if (c === n && w === 0) return 2;
    if ((c === n && w === 1) || (c === n - 1 && c >= 1)) return 1;
    return 0;
  }
  return Number.isInteger(ans) && orig(ans) === q.a ? 1 : 0;
}

function score(sections, answers = {}) {
  const subjects = sections.map(sec => {
    let got = 0, max = 0, right = 0;
    sec.items.forEach((it, i) => {
      const q = byId.get(it.id);
      const mx = q ? maxOf(q) : 1;
      const pts = scoreOne(q, it, answers[`${sec.k}.${i}`]);
      got += pts; max += mx; if (pts === mx) right++;
    });
    const min = thresholdOf(sec.k);
    return { k: sec.k, score: got, max, right, count: sec.items.length, min, pass: got >= min };
  });
  const total = subjects.reduce((n, s) => n + s.score, 0);
  const max = subjects.reduce((n, s) => n + s.max, 0);
  return { total, max, subjects, pass: total >= 50 && subjects.every(s => s.pass) };
}

// Задание для экрана теста: без ключа, варианты в порядке показа.
function view(it, withKey, answer) {
  const q = byId.get(it.id);
  if (!q) return { gone: true };
  const reorder = arr => Object.fromEntries(Object.entries(arr).map(([l, a]) => [l, it.ord.map(i => a[i])]));
  const v = { type: kindOf(q), t: q.t, o: reorder(q.o) };
  if (q.l) v.l = q.l;
  if (q.ctx) { v.ctx = q.ctx; v.c = q.c; }
  if (q.type === 'm') v.need = q.a.length > 1 ? 'many' : 'any';
  if (withKey) {
    const shown = x => it.ord.indexOf(x);
    v.a = Array.isArray(q.a) ? q.a.map(shown) : shown(q.a);
    v.e = q.e; v.max = maxOf(q); v.got = scoreOne(q, it, answer);
  }
  return v;
}

function cleanAnswers(sections, raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const sec of sections) sec.items.forEach((it, i) => {
    const key = `${sec.k}.${i}`, v = raw[key], q = byId.get(it.id);
    if (!q || v == null) return;
    const n = q.o.ru.length, ok = x => Number.isInteger(x) && x >= 0 && x < n;
    if (q.type === 'm') { if (Array.isArray(v)) { const a = [...new Set(v.filter(ok))].slice(0, n); if (a.length) out[key] = a; } }
    else if (q.type === 'p') { if (Array.isArray(v)) out[key] = q.l.ru.map((_, j) => (ok(v[j]) ? v[j] : null)); }
    else if (ok(v)) out[key] = v;
  });
  return out;
}

const names = k => BANK[k]?.name;
module.exports = { hasEn, build, score, view, cleanAnswers, names, DURATION_MS, GRACE_MS };
