// Собирает банк: базовые вопросы (questions.js) + файлы предметов в этой папке.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const BASE = require('../questions');
const NAMES = {
  informatics: { ru: 'Информатика', kk: 'Информатика' },
  worldhistory: { ru: 'Всемирная история', kk: 'Дүниежүзі тарихы' },
  law: { ru: 'Основы права', kk: 'Құқық негіздері' },
  english: { ru: 'Английский язык', kk: 'Ағылшын тілі' },
  kazlang: { ru: 'Казахский язык', kk: 'Қазақ тілі' },
  kazlit: { ru: 'Казахская литература', kk: 'Қазақ әдебиеті' },
  ruslang: { ru: 'Русский язык', kk: 'Орыс тілі' },
  ruslit: { ru: 'Русская литература', kk: 'Орыс әдебиеті' }
};
const ORDER = ['history', 'mathlit', 'reading', 'math', 'physics', 'informatics', 'chemistry', 'biology', 'geography',
  'worldhistory', 'law', 'english', 'kazlang', 'kazlit', 'ruslang', 'ruslit'];
const BANK = {};
for (const k of ORDER) {
  // Файлы предмета: math.js, math2.js, math3.js…
  const extra = fs.readdirSync(__dirname).filter(f => new RegExp(`^${k}\\d*\\.js$`).test(f)).sort()
    .flatMap(f => require('./' + f).map((q, i) => ({ ...q, src: `${f.slice(0, -3)}#${i}` })));
  const name = BASE[k]?.name || NAMES[k];
  const q = [...(BASE[k]?.q || []), ...extra].map(x => ({
    ...x, id: k + ':' + crypto.createHash('sha1').update(JSON.stringify([x.t, x.o, x.l || null])).digest('hex').slice(0, 10)
  }));
  if (q.length) BANK[k] = { name, q };
}

// Английская версия: bank/en/<файл>.js — переводы по номеру задания в исходном файле (ключ «math2#0»).
const enDir = path.join(__dirname, 'en');
const EN = {}, ENCTX = {};
if (fs.existsSync(enDir)) for (const f of fs.readdirSync(enDir)) {
  const m = require(path.join(enDir, f));
  Object.assign(EN, m.q || {}); Object.assign(ENCTX, m.ctx || {});
}
for (const s of Object.values(BANK)) for (const q of s.q) {
  const tr = EN[q.src];
  if (!tr) continue;
  if (q.c && !ENCTX[q.c]) continue;
  q.t = { ...q.t, en: tr.t };
  q.o = { ...q.o, en: tr.o || q.o.ru };
  if (q.l) q.l = { ...q.l, en: tr.l || q.l.ru };
  q.e = { ...q.e, en: tr.e || '' };
  if (q.c) { q.ctx.en = ENCTX[q.c]; }
}
const ENNAMES = { history: 'History of Kazakhstan', mathlit: 'Mathematical literacy', reading: 'Reading literacy', math: 'Mathematics', physics: 'Physics',
  informatics: 'Computer science', chemistry: 'Chemistry', biology: 'Biology', geography: 'Geography', worldhistory: 'World history', law: 'Fundamentals of law',
  english: 'English', kazlang: 'Kazakh language', kazlit: 'Kazakh literature', ruslang: 'Russian language', ruslit: 'Russian literature' };
for (const [k, s] of Object.entries(BANK)) s.name = { ...s.name, en: ENNAMES[k] };

// Убранные задания (bank/retired.js) не попадают в тесты и игры, но по id их ещё можно найти — для старых результатов.
const RETIRED = require('./retired');
const ALL = new Map();
for (const s of Object.values(BANK)) { for (const q of s.q) ALL.set(q.id, q); s.q = s.q.filter(q => !RETIRED.has(q.id)); }
Object.defineProperty(BANK, 'ALL', { value: ALL, enumerable: false });
module.exports = BANK;
