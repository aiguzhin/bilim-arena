// Теория по темам: правило и формулы (bank/topics.js) + разобранные задания из банка + переход к тренировке.
// Страницы открыты без входа — их индексирует Google.
const TOPICS = require('./bank/topics');

module.exports = function (app, { BANK }) {
  const list = () => Object.entries(TOPICS.TOPICS).filter(([s]) => BANK[s]).map(([s, ts]) => ({
    s, name: BANK[s].name, topics: ts.filter(t => t.note).map(t => ({ k: t.k, name: t.name, n: BANK[s].q.filter(q => q.tp === t.k).length }))
  })).filter(x => x.topics.length);
  function page(s, k) {
    const t = TOPICS.info(s, k);
    if (!t?.note || !BANK[s]) return null;
    // Примеры: задания с одним ответом и объяснением, по возможности без рисунков, короткие.
    const pool = BANK[s].q.filter(q => q.tp === k && !q.type && !q.c && q.e?.ru && q.e.ru.length > 20 && q.t.ru.length < 260);
    const step = Math.max(1, Math.floor(pool.length / 3));
    const ex = [0, step, step * 2].map(i => pool[i]).filter(Boolean).slice(0, 3)
      .map(q => ({ t: q.t, o: q.o, a: q.a, e: q.e, img: q.img || null }));
    const others = (TOPICS.TOPICS[s] || []).filter(x => x.note && x.k !== k).map(x => ({ k: x.k, name: x.name }));
    return { s, subject: BANK[s].name, k, name: t.name, note: t.note, examples: ex, count: BANK[s].q.filter(q => q.tp === k).length, others };
  }
  // Все темы предмета (для домашних заданий): ключ, название, сколько заданий.
  app.get('/api/topics/:s', (req, res) => {
    const s = String(req.params.s);
    if (!BANK[s]) return res.json({ topics: [] });
    res.json({ topics: (TOPICS.TOPICS[s] || []).map(t => ({ k: t.k, name: t.name, n: BANK[s].q.filter(q => q.tp === t.k).length })).filter(t => t.n >= 5) });
  });
  app.get('/api/theory', (req, res) => { res.set('Cache-Control', 'public, max-age=600'); res.json({ subjects: list() }); });
  app.get('/api/theory/:s/:k', (req, res) => {
    const d = page(String(req.params.s), String(req.params.k));
    if (!d) return res.status(404).json({ error: 'notfound' });
    res.set('Cache-Control', 'public, max-age=600').json(d);
  });
  return { list, page };
};
