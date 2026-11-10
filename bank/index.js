// Собирает банк: базовые вопросы (questions.js) + файлы предметов в этой папке.
const crypto = require('crypto');
const fs = require('fs');
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
  const extra = fs.readdirSync(__dirname).filter(f => new RegExp(`^${k}\\d*\\.js$`).test(f)).sort().flatMap(f => require('./' + f));
  const name = BASE[k]?.name || NAMES[k];
  const q = [...(BASE[k]?.q || []), ...extra].map(x => ({
    ...x, id: k + ':' + crypto.createHash('sha1').update(JSON.stringify([x.t, x.o, x.l || null])).digest('hex').slice(0, 10)
  }));
  if (q.length) BANK[k] = { name, q };
}
module.exports = BANK;
