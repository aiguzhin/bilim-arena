// Конструкторы заданий в формате ЕНТ.
// S — один правильный ответ из 4 (1 балл); M — один или несколько из 6 (до 2 баллов);
// P — соответствие: два пункта слева, четыре варианта справа (до 2 баллов);
// C — контекст: общий текст и задания к нему с одним ответом (по 1 баллу).
// Казахский вариант можно не указывать (null) — тогда берётся русский (числа, формулы, языковые предметы).
const two = (ru, kk) => ({ ru, kk: kk ?? ru });
const S = (ru, kk, oru, okk, a, eru = '', ekk) => ({ t: two(ru, kk), o: two(oru, okk), a, e: two(eru, ekk) });
const M = (ru, kk, oru, okk, a, eru = '', ekk) => ({ type: 'm', t: two(ru, kk), o: two(oru, okk), a, e: two(eru, ekk) });
const P = (ru, kk, lru, lkk, oru, okk, a, eru = '', ekk) => ({ type: 'p', t: two(ru, kk), l: two(lru, lkk), o: two(oru, okk), a, e: two(eru, ekk) });
const C = (id, ru, kk, qs) => qs.map(q => ({ ...q, c: id, ctx: two(ru, kk) }));
// Одноязычные варианты (казахский/русский язык и литература, английский): текст одинаков в обеих версиях сайта.
const s = (t, o, a, e = '') => S(t, null, o, null, a, e);
const m = (t, o, a, e = '') => M(t, null, o, null, a, e);
const p = (t, l, o, a, e = '') => P(t, null, l, null, o, null, a, e);
const c = (id, text, qs) => C(id, text, null, qs);
module.exports = { S, M, P, C, s, m, p, c };
