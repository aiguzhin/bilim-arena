// Вузы, пороговые и проходные баллы. Данные о вузах Казахстана лежат в хранилище kv['unis'] (снимок с univision.kz,
// источник — итоги конкурса грантов НЦТ); правила порогов и зарубежные вузы — ниже, со ссылками на источники.
const crypto = require('crypto');
const express = require('express');

const ADMIN_HASH = '9fec17eaf0d66962cfd9b5644de08a88062109cac75afbdea95f38bdbef59a3a';

// Правила ЕНТ-2026: общий порог зависит от направления и статуса вуза; плюс минимум по каждому предмету.
const RULES = {
  year: 2026,
  max: 140,
  general: 50, national: 65, health: 70, pedagogy: 75, law: 75, agro: 50,
  subjects: [['history', 5, 20], ['mathlit', 3, 10], ['reading', 3, 10], ['profile1', 5, 50], ['profile2', 5, 50]],
  sources: [
    ['nur.kz — пороговые баллы ЕНТ-2026', 'https://www.nur.kz/society/2348017-porogovye-bally-i-granty-vypusknikam-kazahstana-raskryli-informaciyu-po-ent-2026/'],
    ['bilim-plus.kz — пороги по предметам', 'https://bilim-plus.kz/articles/ent-porogovyj-ball'],
    ['univision.kz — проходные баллы на грант 2025', 'https://univision.kz/grant/passing.html']
  ]
};
// Группа ОП → какой порог действует.
function kindOf(code) {
  const n = +String(code).replace(/^BM?/, '');
  if (n >= 1 && n <= 20) return 'pedagogy';
  if (n === 49) return 'law';
  if (n >= 84 && n <= 89) return 'health';
  if ((n >= 77 && n <= 83) || n === 183) return 'agro';
  return 'general';
}
function ruleMin(code, national) {
  const k = kindOf(code);
  if (k === 'pedagogy' || k === 'law' || k === 'health') return RULES[k];
  if (k === 'agro') return RULES.agro;
  return national ? RULES.national : RULES.general;
}

// Наши комбинации профильных предметов → группы ОП (по справочнику univision.kz «По предмету на ЕНТ»).
const COMBO_GROUPS = {
  'math-physics': 'Математика и Физика', 'math-informatics': 'Математика и Информатика', 'math-geography': 'Математика и География',
  'biology-chemistry': 'Биология и Химия', 'biology-geography': 'Биология и География', 'chemistry-physics': 'Химия и Физика',
  'worldhistory-geography': 'Всемирная история и География', 'worldhistory-law': 'Всемирная история и Основы права',
  'english-worldhistory': 'Иностранный язык и Всемирная история', 'geography-english': 'География и Иностранный язык',
  'kazlang-kazlit': ['Казахский язык и Казахская литература', 'Казахский/Русский язык и Казахская/Русская литература'],
  'ruslang-ruslit': ['Русский язык и Русская литература', 'Казахский/Русский язык и Казахская/Русская литература']
};

// Зарубежные вузы. Турция: ЕНТ входит в список экзаменов, которые турецкие вузы принимают вместо YÖS.
// Филиалы зарубежных вузов работают в Казахстане и принимают выпускников казахстанских школ.
const FOREIGN = [
  { country: 'TR', name: 'Middle East Technical University — Northern Cyprus Campus (METU NCC)', city: 'Северный Кипр', ent: 65,
    req: { ru: 'ЕНТ от 65 из 140 (2 профильных предмета по программе) + английский. Скидки: от 75 — 25%, от 80 — 50%, от 90 — 75%.', kk: 'ҰБТ 140-тан 65-тен бастап (бағдарламаға сай 2 бейіндік пән) + ағылшын. Жеңілдік: 75-тен — 25%, 80-нен — 50%, 90-нан — 75%.' },
    url: 'https://international.ncc.metu.edu.tr/en/admission-criteria-for-your-country/kazakhstan' },
  { country: 'TR', name: 'Süleyman Demirel University', city: 'Испарта, Турция', ent: 70,
    req: { ru: 'В списке принимаемых экзаменов: ЕНТ, минимум 70 баллов. Проверьте актуальные условия на сайте вуза.', kk: 'Қабылданатын емтихандар тізімінде: ҰБТ, кемінде 70 балл. Нақты шарттарды университет сайтынан тексеріңіз.' },
    url: 'https://uluslararasi.sdu.edu.tr/assets/uploads/sites/188/files/accepted-exams-diplomas-and-minimum-scores-for-application-24022014.pdf' },
  { country: 'TR', name: 'Другие вузы Турции', city: 'Турция', ent: null,
    req: { ru: 'Многие государственные и частные вузы Турции принимают ЕНТ вместо экзамена YÖS. Минимум у каждого свой — ищите на сайте вуза раздел «Accepted exams».', kk: 'Түркияның көп ЖОО-лары YÖS орнына ҰБТ-ны қабылдайды. Әр ЖОО-ның өз минимумы бар — сайттағы «Accepted exams» бөлімін қараңыз.' },
    url: 'https://www.study-abroad.org/blog/trk-application-guide' }
];
const BRANCHES = [
  ['De Montfort University Kazakhstan', 'GB', 'Алматы'], ['Cardiff University Kazakhstan', 'GB', 'Астана'], ['Coventry University Kazakhstan', 'GB', 'Астана'],
  ['Heriot-Watt University (на базе университета им. Жубанова)', 'GB', 'Актобе'], ['University of Minnesota', 'US', 'Актобе'],
  ['University of Arizona (на базе СКУ им. Козыбаева)', 'US', 'Петропавловск'], ['Queen\'s University Belfast (с Университетом Нархоз)', 'GB', 'Алматы'],
  ['City University of Hong Kong (с Satbayev University)', 'HK', 'Алматы'], ['Pennsylvania State University (совместные программы)', 'US', 'Алматы'],
  ['University of Exeter', 'GB', 'Караганда'], ['Технический университет Берлина', 'DE', 'Актау'], ['Anhalt University of Applied Sciences', 'DE', 'Алматы'],
  ['Université de Lorraine', 'FR', 'Алматы'], ['РГУ нефти и газа им. Губкина', 'RU', 'Атырау'], ['РХТУ им. Менделеева', 'RU', 'Тараз'], ['МГИМО', 'RU', 'Астана'],
  ['Beijing Language and Culture University', 'CN', 'Астана'], ['Woosong University', 'KR', 'Туркестан']
].map(([name, country, city]) => ({ name, country, city }));
const BRANCHES_SRC = 'https://informburo.kz/stati/diplom-mirovogo-urovnia-bez-pereezda-zacem-kazaxstanu-zarubeznye-universitety';

function validUnis(v) {
  return v && Array.isArray(v.unis) && v.unis.length > 20 && v.unis.length < 400 && v.groups && typeof v.groups === 'object' && v.subjects && typeof v.subjects === 'object';
}

module.exports = function (app, db) {
  let cache = null, cacheAt = 0;
  async function load() {
    if (cache && Date.now() - cacheAt < 10 * 60 * 1000) return cache;
    const row = await db.kvGet('unis');
    cache = row ? { ...row.val, updated_at: row.updated_at } : null; cacheAt = Date.now();
    return cache;
  }

  app.get('/api/unis', async (req, res) => {
    try {
      const d = await load();
      res.set('Cache-Control', 'public, max-age=120');
      res.json({ rules: RULES, combos: COMBO_GROUPS, foreign: FOREIGN, branches: BRANCHES, branchesSrc: BRANCHES_SRC, data: d });
    } catch (e) { console.error(e); res.status(500).json({ error: 'unavailable' }); }
  });

  // Загрузка снимка данных (только по секретному ключу). CORS — чтобы снимок можно было отправить из браузера.
  const cors = (req, res, next) => {
    res.set({ 'Access-Control-Allow-Origin': 'https://univision.kz', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, x-admin', 'Access-Control-Max-Age': '600' });
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
  app.options('/api/admin/import/unis', cors);
  app.post('/api/admin/import/unis', cors, express.json({ limit: '3mb' }), async (req, res) => {
    const got = crypto.createHash('sha256').update(String(req.get('x-admin') || '')).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(got), Buffer.from(ADMIN_HASH))) return res.status(403).json({ error: 'denied' });
    if (!validUnis(req.body)) return res.status(400).json({ error: 'bad data' });
    await db.kvSet('unis', req.body);
    cache = null;
    res.json({ ok: true, unis: req.body.unis.length, groups: Object.keys(req.body.groups).length });
  });
};
module.exports.kindOf = kindOf;
module.exports.ruleMin = ruleMin;
