const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const BANK = require('./bank');
const mock = require('./mock');
const store = require('./store');

const db = store.create();
const app = express();
// Сжатие ответов: страница и скрипты весят в 4–5 раз меньше — быстрее на мобильном интернете.
app.use(require('compression')());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });

const QUESTION_MS = 20000;
const REVEAL_MS = 2600;
const COUNTDOWN_S = 3;
const ROUND = 10;

const SUBJECTS = Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v.name]));
const MANDATORY = ['history', 'mathlit', 'reading'];
const LANGS = ['kk', 'ru', 'en'];
const hasLang = (q, lang) => lang !== 'en' || mock.hasEn(q);
// Комбинации профильных предметов ЕНТ (все, кроме творческого экзамена).
const COMBOS = Object.fromEntries([
  ['math', 'physics'], ['math', 'informatics'], ['math', 'geography'], ['biology', 'chemistry'], ['biology', 'geography'],
  ['chemistry', 'physics'], ['worldhistory', 'geography'], ['worldhistory', 'law'], ['english', 'worldhistory'],
  ['geography', 'english'], ['kazlang', 'kazlit'], ['ruslang', 'ruslit']
].filter(([a, b]) => BANK[a] && BANK[b]).map(([a, b]) => [`${a}-${b}`, [a, b]]));
// Раскладка раунда по комбинации — в пропорции ЕНТ (20 : 10 : 10 : 40 : 40 из 120).
const COMBO_PLAN = [['history', 2], ['mathlit', 1], ['reading', 1], [0, 3], [1, 3]];

function topicName(topic) {
  if (topic.startsWith('combo:')) {
    const [a, b] = COMBOS[topic.slice(6)];
    return { ru: `${SUBJECTS[a].ru} — ${SUBJECTS[b].ru}`, kk: `${SUBJECTS[a].kk} — ${SUBJECTS[b].kk}` };
  }
  return SUBJECTS[topic];
}
function validTopic(t) {
  return typeof t === 'string' && (t.startsWith('combo:') ? !!COMBOS[t.slice(6)] : !!SUBJECTS[t]);
}

// Версия ассетов меняется при каждом запуске, поэтому после выкладки браузеры сразу берут новые файлы.
const fs = require('fs');
const VERSION = (process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || String(Date.now())).slice(0, 8);
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8').replace(/(\/(?:app\.css|app\.js|i18n\.js|ent\.js|account\.js|edu\.js|social\.js|session\.js|refs\.js|unis\.js|games\.js))"/g, `$1?v=${VERSION}"`);
// Для поисковиков: у каждой страницы свой заголовок, описание и канонический адрес.
const SITE = 'https://bilimarena.com';
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const LD = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'WebSite', name: 'Bilim Arena', alternateName: ['Білім Арена', 'Bilim Arena ЕНТ', 'bilimarena.com'], url: SITE + '/', inLanguage: ['ru', 'kk'] },
  { '@type': 'Organization', name: 'Bilim Arena', url: SITE + '/', logo: SITE + '/icon-512.png' }
] });
let seoUnis = null;
const seoFor = async req => {
  const p = req.path;
  if (p === '/unis') return { t: 'Вузы и гранты: пороговые и проходные баллы ЕНТ — Bilim Arena', d: 'Проходные баллы на грант 2025 по всем вузам Казахстана, пороговые баллы ЕНТ-2026, стоимость обучения и зарубежные вузы, которые принимают ЕНТ. Узнайте свой шанс на грант.' };
  const m = p.match(/^\/unis\/(\d+)$/);
  if (m) {
    try { if (!seoUnis || Date.now() - seoUnis.at > 600000) seoUnis = { at: Date.now(), v: (await db.kvGet('unis'))?.val }; } catch {}
    const u = seoUnis?.v?.unis?.find(x => String(x.id) === m[1]);
    if (u) return { t: `${u.name}: проходные баллы на грант и стоимость — Bilim Arena`, d: `${u.name} (${u.city}): проходные баллы на грант 2025 по группам программ, сельская квота, порог для платного${u.price ? `, обучение от ${u.price[0].toLocaleString('ru-RU')} ₸ в год` : ''}.` };
  }
  if (p === '/about') return { t: 'О проекте — Bilim Arena', d: 'Bilim Arena — подготовка к ЕНТ в формате дуэлей: пробный ЕНТ, турниры, рейтинг школ и разбор ошибок на казахском и русском.' };
  return null;
};
const sendIndex = async (req, res) => {
  res.set('Cache-Control', 'no-cache');
  let html = INDEX.replace('</head>', `<link rel="canonical" href="${SITE}${req.path === '/index.html' ? '/' : req.path}">\n<script type="application/ld+json">${LD}</script>\n</head>`);
  const s = await seoFor(req).catch(() => null);
  if (s) html = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(s.t)}</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escAttr(s.d)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escAttr(s.t)}">`).replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escAttr(s.d)}">`);
  res.type('html').send(html);
};
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /b/\n\nSitemap: ${SITE}/sitemap.xml\n`));
app.get('/sitemap.xml', async (req, res) => {
  let ids = [];
  try { ids = ((await db.kvGet('unis'))?.val?.unis || []).map(u => u.id); } catch {}
  const urls = ['/', '/unis', '/unis?tab=rules', '/unis?tab=kz', '/unis?tab=abroad', '/about', ...ids.map(i => `/unis/${i}`)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>\n`);
});
// Переезд на свой сервер. CANONICAL_HOST (задаётся на старом хостинге) — все страницы пересылаются на основной домен.
const CANON = (process.env.CANONICAL_HOST || '').trim();
if (CANON) app.use((req, res, next) => {
  if (req.method !== 'GET' || req.hostname === CANON || /^\/(api|socket\.io|healthz|i$)/.test(req.path)) return next();
  res.redirect(301, `https://${CANON}${req.originalUrl}`);
});
// Установщик для сервера: curl -sL <адрес>/i | bash -s КОД
app.get('/i', (req, res) => res.type('text/plain').sendFile(path.join(__dirname, 'deploy', 'install.sh')));
// Одноразовая передача настроек новому серверу. Работает, только пока на старом хостинге задан HANDOFF_TOKEN.
let handoffUsed = false, handoffFails = 0;
app.get('/api/handoff', (req, res) => {
  const want = (process.env.HANDOFF_TOKEN || '').trim(), got = String(req.get('x-handoff') || '');
  const ok = want.length >= 16 && got.length === want.length && require('crypto').timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (handoffUsed || handoffFails >= 10 || !ok) { handoffFails++; return res.status(403).type('text/plain').send('denied'); }
  handoffUsed = true;
  const env = { DATABASE_URL: process.env.DATABASE_URL, GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID };
  res.set('Cache-Control', 'no-store').type('text/plain').send(Object.entries(env).filter(([, v]) => v).map(([k, v]) => `${k}=${String(v).trim()}`).join('\n') + '\n');
});
app.get(['/', '/index.html'], sendIndex);
app.use(express.static(path.join(__dirname, 'public'), { index: false, maxAge: '30d', immutable: true }));
// Фото профиля отдельным файлом: в списках и рейтингах передаём только ссылку.
app.get('/p/:username', async (req, res) => {
  try {
    const p = await db.byUsernamePublic(String(req.params.username || '').toLowerCase());
    const m = p?.photo && /^data:(image\/(?:jpeg|webp|png));base64,(.+)$/.exec(p.photo);
    if (!m) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=86400').type(m[1]).send(Buffer.from(m[2], 'base64'));
  } catch { res.status(404).end(); }
});
app.get('/healthz', (req, res) => res.set('Cache-Control', 'no-store').send('ok'));
app.get('/api/subjects', (req, res) => res.json({ subjects: SUBJECTS, mandatory: MANDATORY, combos: COMBOS, count: Object.values(BANK).reduce((n, v) => n + v.q.length, 0) }));
app.get('/api/leaders', async (req, res) => {
  try { res.json(await db.leaders()); } catch (e) { console.error(e); res.status(500).json({ error: 'unavailable' }); }
});
app.get('/api/stats', (req, res) => res.json({ online: io.engine.clientsCount, battles: [...rooms.values()].filter(r => r.state === 'playing').length }));
app.get(['/b/:code', '/rating', '/play', '/me', '/about', '/privacy', '/ent', '/ent/:id', '/me/:tab', '/login', '/settings', '/settings/:tab', '/u/:username', '/tournaments', '/t/:id', '/practice', '/teacher', '/teacher/:id', '/join/:code', '/friends', '/ent/s/:id', '/unis', '/unis/:id', '/games'], sendIndex);

// ---------- аккаунты ----------
app.use(express.json({ limit: '300kb' }));

const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw) { const salt = crypto.randomBytes(16); return `${salt.toString('hex')}:${(await scrypt(pw, salt)).toString('hex')}`; }
async function checkPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const k = await scrypt(pw, Buffer.from(salt, 'hex'));
  return crypto.timingSafeEqual(k, Buffer.from(hash, 'hex'));
}

// Ограничение попыток входа и регистрации: не больше 10 в 10 минут с одного адреса.
const attempts = new Map();
function limited(req) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), a = attempts.get(ip);
  if (!a || now - a.start > 10 * 60 * 1000) { attempts.set(ip, { start: now, n: 1 }); return false; }
  a.n += 1; return a.n > 10;
}
setInterval(() => { const now = Date.now(); for (const [k, a] of attempts) if (now - a.start > 10 * 60 * 1000) attempts.delete(k); }, 10 * 60 * 1000);

const tokenOf = req => (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
async function auth(req, res, next) {
  const t = tokenOf(req);
  const p = t && /^[a-f0-9]{64}$/.test(t) ? await db.sessionPlayer(t).catch(() => null) : null;
  if (!p) return res.status(401).json({ error: 'auth' });
  req.player = p; req.token = t; next();
}
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'server' }); });

function readProfile(b) {
  const name = store.clean(b.name, 24), school = store.clean(b.school, 60), city = store.clean(b.city, 40);
  if (name.length < 2) return { error: 'name' };
  if (school.length < 2) return { error: 'school' };
  if (!city) return { error: 'city' };
  return { name, school, city };
}

// Дата рождения (возраст 10–100 лет) и телефон в международном формате; казахстанское «8…» превращаем в «+7…».
function readRequired(b) {
  const birth = String(b.birth || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const age = d && (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (!d || d.getUTCDate() !== +m[3] || !(age >= 10 && age <= 100)) return { error: 'birth' };
  let digits = String(b.phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1);
  if (digits.length === 10 && digits[0] === '7') digits = '7' + digits;
  if (!(digits.length >= 10 && digits.length <= 15)) return { error: 'phone' };
  return { birth_date: birth, phone: '+' + digits };
}
const validUsername = u => /^[a-z0-9_.]{3,20}$/.test(u);

app.post('/api/register', wrap(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'limit' });
  const b = req.body || {};
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return res.status(400).json({ error: 'username' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'password' });
  if (b.consent !== true) return res.status(400).json({ error: 'consent' });
  const prof = readProfile(b);
  if (prof.error) return res.status(400).json(prof);
  const reqd = readRequired(b);
  if (reqd.error) return res.status(400).json(reqd);
  const row = await db.createAccount({ id: crypto.randomUUID(), username, pass_hash: await hashPassword(password), ...prof, ...reqd });
  if (!row) return res.status(409).json({ error: 'taken' });
  await newSession(row, res);
}));

app.post('/api/login', wrap(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'limit' });
  const username = String(req.body?.username || '').trim().toLowerCase();
  const row = await db.findByUsername(username);
  if (!row || !(await checkPassword(String(req.body?.password || ''), row.pass_hash))) return res.status(401).json({ error: 'wrong' });
  await newSession(row, res);
}));

app.post('/api/logout', auth, wrap(async (req, res) => { await db.deleteSession(req.token); res.json({ ok: true }); }));

app.get('/api/me', auth, wrap(async (req, res) => {
  const [stats, mocks] = await Promise.all([db.profileStats(req.player.id), db.mockSummary(req.player.id)]);
  res.json({ user: store.PUBLIC(req.player), ...stats, mocks });
}));

// Дополнительные поля профиля: о себе, цель на ЕНТ, комбинация, цвет аватара.
const AVATARS = ['blue', 'green', 'red', 'violet', 'orange', 'teal', 'pink', 'graphite'];
app.patch('/api/me/extra', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const goal = b.goal == null || b.goal === '' ? null : Math.round(Number(b.goal));
  if (goal !== null && !(goal >= 50 && goal <= 140)) return res.status(400).json({ error: 'goal' });
  const x = {
    bio: store.clean(b.bio, 160), goal,
    goal_combo: COMBOS[b.goalCombo] ? b.goalCombo : null,
    avatar: AVATARS.includes(b.avatar) ? b.avatar : null
  };
  res.json({ user: store.PUBLIC(await db.updateExtra(req.player.id, x)) });
}));

// Фото профиля: квадратный JPEG, ужатый в браузере до 256×256.
app.put('/api/me/photo', auth, wrap(async (req, res) => {
  const ph = req.body?.photo;
  if (ph !== null && !(typeof ph === 'string' && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(ph) && ph.length <= 200000)) return res.status(400).json({ error: 'photo' });
  res.json({ user: store.PUBLIC(await db.setPhoto(req.player.id, ph)) });
}));

const SETTINGS = { theme: ['system', 'light', 'dark'], accent: ['classic', 'emerald', 'garnet', 'indigo'], fs: ['md', 'lg'], lang: ['ru', 'kk'], examLang: ['kk', 'ru', 'en'], timer: ['show', 'hide'], confirmNext: ['on', 'off'] };
app.put('/api/me/settings', auth, wrap(async (req, res) => {
  const b = req.body || {}, st = { ...(req.player.settings || {}) };
  for (const [k, vals] of Object.entries(SETTINGS)) if (vals.includes(b[k])) st[k] = b[k];
  res.json({ user: store.PUBLIC(await db.saveSettings(req.player.id, st)) });
}));

app.post('/api/me/password', auth, wrap(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'limit' });
  const next = String(req.body?.next || '');
  if (req.player.pass_hash && !(await checkPassword(String(req.body?.current || ''), req.player.pass_hash))) return res.status(401).json({ error: 'wrongPass' });
  if (next.length < 6 || next.length > 72) return res.status(400).json({ error: 'password' });
  await db.setPassword(req.player.id, await hashPassword(next));
  await db.dropSessions(req.player.id, req.token);
  res.json({ user: store.PUBLIC(await db.get(req.player.id)) });
}));

app.post('/api/me/logout-all', auth, wrap(async (req, res) => { await db.dropSessions(req.player.id, req.token); res.json({ ok: true }); }));

app.delete('/api/me', auth, wrap(async (req, res) => {
  if (String(req.body?.confirm || '').trim().toLowerCase() !== req.player.username) return res.status(400).json({ error: 'confirm' });
  await db.deleteAccount(req.player.id);
  res.json({ ok: true });
}));

// Публичная страница игрока.
app.get('/api/users/:username', auth, wrap(async (req, res) => {
  const p = await db.byUsernamePublic(String(req.params.username || '').toLowerCase());
  if (!p) return res.status(404).json({ error: 'notfound' });
  const [stats, mocks] = await Promise.all([db.profileStats(p.id), db.mockSummary(p.id)]);
  res.json({ user: store.OPEN(p), subjects: stats.subjects, mocks, me: p.id === req.player.id });
}));

app.patch('/api/me', auth, wrap(async (req, res) => {
  const prof = readProfile(req.body || {});
  if (prof.error) return res.status(400).json(prof);
  res.json({ user: store.PUBLIC(await db.updateProfile(req.player.id, prof)) });
}));

// ---------- вход через Google ----------
// Кнопка Google на сайте отдаёт подписанный ID-токен; сервер проверяет подпись и адресата (наш Client ID).
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const { OAuth2Client } = require('google-auth-library');
const gClient = new OAuth2Client();
async function verifyGoogle(credential) {
  if (!GOOGLE_CLIENT_ID || typeof credential !== 'string' || credential.length > 4096) return null;
  try {
    const t = await gClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const p = t.getPayload();
    if (!p?.sub || p.email_verified === false) return null;
    return { sub: p.sub, email: p.email || '', name: p.given_name || p.name || '' };
  } catch { return null; }
}
// Новые пользователи Google сначала указывают город и школу; до этого их данные ждут 15 минут.
const pendingGoogle = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of pendingGoogle) if (now - v.at > 15 * 60 * 1000) pendingGoogle.delete(k); }, 5 * 60 * 1000);

async function newSession(row, res) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(token, row.id);
  res.json({ token, user: store.PUBLIC(row) });
}

// Вход через Google переадресацией (без всплывающего окна): Google присылает форму сюда,
// мы сверяем защитный токен и возвращаем ученика на ту же страницу сайта, где он нажал кнопку.
app.post('/api/google/redirect', express.urlencoded({ extended: false, limit: '20kb' }), (req, res) => {
  const body = req.body || {};
  const cookie = /(?:^|;\s*)g_csrf_token=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  const cred = String(body.credential || '');
  const ok = cookie && body.g_csrf_token && cookie === body.g_csrf_token && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(cred);
  res.set('Cache-Control', 'no-store').type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bilim Arena</title>
<script>try{${ok ? `sessionStorage.setItem('ba_gcred',${JSON.stringify(cred)});` : `sessionStorage.setItem('ba_gerr','google');`}}catch(e){}
var r='/login';try{r=sessionStorage.getItem('ba_greturn')||'/login'}catch(e){}if(!/^\\/(?!\\/)/.test(r))r='/login';location.replace(r);</script>`);
});

app.get('/api/config', (req, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID || null }));

// Подсказки школ: справочник + школы, которые указали минимум два ученика этого города.
const SCHOOLS = require('./schools');
const schoolCache = new Map();
app.get('/api/schools', wrap(async (req, res) => {
  const city = store.clean(req.query.city, 40);
  if (!city) return res.json({ schools: [] });
  const hit = schoolCache.get(city);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return res.json({ schools: hit.list });
  const fromUsers = await db.schoolsOf(city).catch(() => []);
  const list = [...new Set([...(SCHOOLS[city] || []), ...fromUsers])];
  schoolCache.set(city, { at: Date.now(), list });
  res.set('Cache-Control', 'public, max-age=300').json({ schools: list });
}));

app.post('/api/google', wrap(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'limit' });
  const g = await verifyGoogle(req.body?.credential);
  if (!g) return res.status(401).json({ error: 'google' });
  const row = await db.findByGoogle(g.sub);
  if (row) return newSession(row, res);
  const pending = crypto.randomBytes(24).toString('hex');
  pendingGoogle.set(pending, { ...g, at: Date.now() });
  const base = (g.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 16);
  res.json({ needProfile: true, pending, name: store.clean(g.name, 24), username: base.length >= 3 && !(await db.findByUsername(base)) ? base : '' });
}));

app.post('/api/google/complete', wrap(async (req, res) => {
  const b = req.body || {};
  const g = pendingGoogle.get(String(b.pending || ''));
  if (!g) return res.status(400).json({ error: 'expired' });
  if (b.consent !== true) return res.status(400).json({ error: 'consent' });
  const prof = readProfile(b);
  if (prof.error) return res.status(400).json(prof);
  const existing = await db.findByGoogle(g.sub);
  if (existing) { pendingGoogle.delete(b.pending); return newSession(existing, res); }
  const username = String(b.username || '').trim().toLowerCase();
  if (!validUsername(username)) return res.status(400).json({ error: 'username' });
  const reqd = readRequired(b);
  if (reqd.error) return res.status(400).json(reqd);
  const row = await db.createAccount({ id: crypto.randomUUID(), username, pass_hash: null, google_sub: g.sub, email: g.email, ...prof, ...reqd });
  if (!row) return res.status(409).json({ error: 'taken' });
  pendingGoogle.delete(b.pending);
  newSession(row, res);
}));

// Аккаунты, созданные до появления обязательных полей: дописать дату рождения и телефон.
// Тем, кто вошёл через Google и ещё не выбирал ник, можно один раз сменить логин.
app.post('/api/me/required', auth, wrap(async (req, res) => {
  const b = req.body || {}, p = req.player;
  const reqd = readRequired(b);
  if (reqd.error) return res.status(400).json(reqd);
  let username = p.username;
  if (b.username != null && String(b.username).trim().toLowerCase() !== p.username) {
    if (!(p.google_sub && !p.birth_date)) return res.status(400).json({ error: 'username' });
    username = String(b.username).trim().toLowerCase();
    if (!validUsername(username)) return res.status(400).json({ error: 'username' });
    const other = await db.findByUsername(username);
    if (other && other.id !== p.id) return res.status(409).json({ error: 'taken' });
  }
  const row = await db.setRequired(p.id, { username, ...reqd });
  if (!row) return res.status(409).json({ error: 'taken' });
  res.json({ user: store.PUBLIC(row) });
}));

app.post('/api/google/link', auth, wrap(async (req, res) => {
  const g = await verifyGoogle(req.body?.credential);
  if (!g) return res.status(401).json({ error: 'google' });
  if (!(await db.linkGoogle(req.player.id, g.sub, g.email))) return res.status(409).json({ error: 'googleTaken' });
  res.json({ user: store.PUBLIC(await db.get(req.player.id)) });
}));

app.get('/api/site', wrap(async (req, res) => {
  res.json({ ...(await db.siteStats()), questions: Object.values(BANK).reduce((n, v) => n + v.q.length, 0), combos: Object.keys(COMBOS).length });
}));

// ---------- школы, турниры, рейтинги, достижения, работа над ошибками ----------
const edu = require('./edu')(app, { db, auth, wrap, store, COMBOS, SUBJECTS, LANGS });

// ---------- пробный ЕНТ ----------
const mockPublic = (t, withKey) => {
  const answers = t.answers || {};
  return {
    id: t.id, combo: t.combo, lang: t.lang || 'ru', done: !!t.finished_at, endsAt: new Date(t.ends_at).getTime(), now: Date.now(),
    startedAt: new Date(t.started_at).getTime(), finishedAt: t.finished_at ? new Date(t.finished_at).getTime() : null,
    answers, result: t.result || null, flag: t.flag && !t.cleared ? t.flag : null,
    sections: t.sections.map(sec => ({ k: sec.k, name: mock.names(sec.k), items: sec.items.map((it, i) => mock.view(it, withKey, answers[`${sec.k}.${i}`])) }))
  };
};
async function finishMock(t, raw, rawMeta) {
  const answers = mock.cleanAnswers(t.sections, raw ?? t.answers);
  const result = mock.score(t.sections, answers);
  const meta = mock.cleanMeta(rawMeta, t.meta || {});
  const out = (await db.finishMock(t.id, answers, result, { meta, flag: mock.flagOf(t, result, meta) })) || (await db.getMock(t.id, t.player_id));
  edu.ratingCache.clear();
  return out;
}
// Просроченный тест завершается сам — с теми ответами, что успели сохраниться.
async function loadMock(id, pid) {
  const t = await db.getMock(id, pid);
  if (t && !t.finished_at && Date.now() > new Date(t.ends_at).getTime() + mock.GRACE_MS) return finishMock(t);
  return t;
}

const sessions = require('./session')(app, { db, auth, wrap, store, mock, COMBOS, LANGS, finishMock });

app.get('/api/ent/active', auth, wrap(async (req, res) => {
  let t = await db.activeMock(req.player.id);
  if (t && Date.now() > new Date(t.ends_at).getTime() + mock.GRACE_MS) { await finishMock(t); t = null; }
  res.json({ id: t?.id || null, combo: t?.combo || null });
}));
app.get('/api/ent', auth, wrap(async (req, res) => res.json({ tests: await db.listMocks(req.player.id) })));
app.post('/api/ent', auth, wrap(async (req, res) => {
  const combo = String(req.body?.combo || '');
  const lang = LANGS.includes(req.body?.lang) ? req.body.lang : 'ru';
  if (!COMBOS[combo]) return res.status(400).json({ error: 'pick' });
  const active = await db.activeMock(req.player.id);
  if (active && Date.now() <= new Date(active.ends_at).getTime() + mock.GRACE_MS) {
    // Тест общей сессии нельзя сбросить новым пробным — сначала его нужно завершить.
    if (req.body?.restart !== true || active.session_id) return res.json({ id: active.id, resumed: true });
    await finishMock(active);
  }
  const t = { id: crypto.randomUUID(), player_id: req.player.id, combo, lang, sections: mock.build(COMBOS[combo], new Set(await db.seenIds(req.player.id).catch(() => [])), lang), ends_at: new Date(Date.now() + mock.DURATION_MS).toISOString() };
  await db.createMock(t);
  res.json({ id: t.id });
}));
app.get('/api/ent/:id', auth, wrap(async (req, res) => {
  const t = await loadMock(String(req.params.id), req.player.id);
  if (!t) return res.status(404).json({ error: 'notfound' });
  res.json({ ...mockPublic(t, !!t.finished_at), session: await sessions.sessionOfMock(t), who: { name: req.player.name, school: req.player.school, city: req.player.city } });
}));
app.put('/api/ent/:id', auth, wrap(async (req, res) => {
  const t = await loadMock(String(req.params.id), req.player.id);
  if (!t) return res.status(404).json({ error: 'notfound' });
  if (t.finished_at) return res.status(409).json({ error: 'finished' });
  await db.saveMock(t.id, mock.cleanAnswers(t.sections, req.body?.answers), mock.cleanMeta(req.body?.meta, t.meta || {}));
  res.json({ ok: true, now: Date.now() });
}));
app.post('/api/ent/:id/finish', auth, wrap(async (req, res) => {
  let t = await loadMock(String(req.params.id), req.player.id);
  if (!t) return res.status(404).json({ error: 'notfound' });
  if (!t.finished_at) t = await finishMock(t, req.body?.answers, req.body?.meta);
  res.json({ ...mockPublic(t, true), session: await sessions.sessionOfMock(t), who: { name: req.player.name, school: req.player.school, city: req.player.city } });
}));

// ---------- комнаты ----------
const rooms = new Map();
const queues = new Map(); // тема|язык|размер -> { list: [сокеты], since }
const QUICK_SIZES = [2, 4, 5, 10];
const QUICK_WAIT_MS = 40000; // арена стартует с теми, кто нашёлся (от двух), если группа не набралась за 40 секунд
const notifyQueue = q => { const players = q.list.map(s => s.data.card).filter(Boolean); for (const s of q.list) s.emit('queue', { n: q.list.length, size: q.size, players, startsIn: q.size > 2 && q.list.length >= 2 ? Math.max(0, q.since + QUICK_WAIT_MS - Date.now()) : null }); };
function leaveQueues(socket) {
  for (const [k, q] of queues) {
    const before = q.list.length;
    q.list = q.list.filter(s => s.id !== socket.id);
    if (!q.list.length) queues.delete(k); else if (q.list.length !== before) notifyQueue(q);
  }
}
function formMatch(key) {
  const q = queues.get(key); if (!q) return;
  const list = q.list.splice(0, q.size);
  if (!q.list.length) queues.delete(key); else { q.since = Date.now(); notifyQueue(q); }
  const r = makeRoom(list.length === 2 ? 'duel' : 'arena', q.subject, list[0].id, q.lang);
  r.expect = list.length;
  for (const s of list) s.emit('matched', { code: r.code });
  // Если кто-то не дошёл до комнаты, через 12 секунд начинаем с теми, кто на месте.
  setTimeout(() => { if (r.state === 'lobby' && r.players.size >= 2 && rooms.has(r.code)) startGame(r); }, 12000);
}
setInterval(() => {
  for (const [k, q] of queues) {
    q.list = q.list.filter(s => s.connected);
    if (!q.list.length) { queues.delete(k); continue; }
    if (q.size > 2 && q.list.length >= 2 && Date.now() - q.since >= QUICK_WAIT_MS) formMatch(k);
  }
}, 2000);

function code() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join(''); } while (rooms.has(c));
  return c;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// В баттлах — только задания с одним ответом и без общего текста: на них хватает 20 секунд.
const QUICK = Object.fromEntries(Object.entries(BANK).map(([k, v]) => [k, v.q.filter(q => !q.type && !q.c)]));
// Для английских баттлов, где одиночных заданий мало, берём задания к текстам (текст ставим перед вопросом).
const withCtx = q => ({ ...q, t: Object.fromEntries(Object.entries(q.t).map(([l, v]) => [l, `${q.ctx[l] ?? q.ctx.ru}\n\n${v}`])) });
const QUICK_EN = Object.fromEntries(Object.entries(BANK).map(([k, v]) => {
  const single = v.q.filter(q => !q.type && !q.c && mock.hasEn(q));
  return [k, single.length >= 10 ? single : single.concat(v.q.filter(q => !q.type && q.c && mock.hasEn(q)).map(withCtx))];
}));
function take(subject, n, lang) {
  const pool = lang === 'en' ? QUICK_EN[subject] : QUICK[subject];
  return shuffle((pool.length >= n ? pool : QUICK[subject]).slice()).slice(0, n).map(q => ({ ...q, k: subject, s: BANK[subject].name }));
}

function pickQuestions(topic, lang) {
  let list;
  if (topic.startsWith('combo:')) {
    const pair = COMBOS[topic.slice(6)];
    list = COMBO_PLAN.flatMap(([sub, n]) => take(typeof sub === 'number' ? pair[sub] : sub, n, lang));
  } else list = take(topic, ROUND, lang);
  return list.map(q => {
    const order = shuffle([0, 1, 2, 3]);
    const o = Object.fromEntries(Object.entries(q.o).map(([l, arr]) => [l, order.map(i => arr[i])]));
    return { k: q.k, t: q.t, s: q.s, o, a: order.indexOf(q.a), e: q.e, img: q.img || q.cimg || null };
  });
}

function makeRoom(mode, subject, hostSid, lang) {
  const r = {
    code: code(), mode, subject, hostSid, lang: LANGS.includes(lang) ? lang : null, state: 'lobby', players: new Map(),
    questions: [], i: -1, endsAt: 0, timer: null, touched: Date.now()
  };
  rooms.set(r.code, r);
  return r;
}

function publicRoom(r) {
  const players = [...r.players.values()].map(p => ({
    sid: p.sid, name: p.name, username: p.username, avatar: p.avatar, photo: p.photo, school: p.school, city: p.city, team: p.team,
    score: p.score, connected: p.connected, answered: r.state === 'playing' && p.answers[r.i] !== undefined
  }));
  return {
    code: r.code, mode: r.mode, subject: r.subject, lang: r.lang, subjectName: topicName(r.subject), state: r.state,
    hostSid: r.hostSid, players, teams: teamScores(r), total: ROUND, expect: r.expect || null
  };
}

function teamScores(r) {
  const t = { A: { sum: 0, n: 0 }, B: { sum: 0, n: 0 } };
  for (const p of r.players.values()) if (t[p.team]) { t[p.team].sum += p.score; t[p.team].n += 1; }
  return {
    A: { players: t.A.n, avg: t.A.n ? Math.round(t.A.sum / t.A.n) : 0 },
    B: { players: t.B.n, avg: t.B.n ? Math.round(t.B.sum / t.B.n) : 0 }
  };
}

const emitRoom = r => io.to(r.code).emit('room', publicRoom(r));

function startGame(r) {
  if (r.state !== 'lobby') return;
  r.state = 'countdown';
  r.questions = pickQuestions(r.subject, r.lang);
  for (const p of r.players.values()) { p.score = 0; p.answers = []; }
  emitRoom(r);
  io.to(r.code).emit('countdown', { seconds: COUNTDOWN_S });
  r.timer = setTimeout(() => { r.state = 'playing'; nextQuestion(r); }, COUNTDOWN_S * 1000);
}

function nextQuestion(r) {
  r.i += 1;
  if (r.i >= r.questions.length) return finish(r);
  const q = r.questions[r.i];
  r.endsAt = Date.now() + QUESTION_MS;
  r.qStart = Date.now();
  emitRoom(r);
  io.to(r.code).emit('question', { i: r.i, total: r.questions.length, t: q.t, s: q.s, o: q.o, img: q.img || null, endsAt: r.endsAt, duration: QUESTION_MS });
  clearTimeout(r.timer);
  r.timer = setTimeout(() => reveal(r), QUESTION_MS + 300);
}

function reveal(r) {
  if (r.state !== 'playing' || r.revealed === r.i) return;
  r.revealed = r.i;
  clearTimeout(r.timer);
  const q = r.questions[r.i];
  const picks = {};
  for (const p of r.players.values()) picks[p.sid] = p.answers[r.i] || { choice: null, gained: 0 };
  io.to(r.code).emit('reveal', { i: r.i, a: q.a, e: q.e, picks, room: publicRoom(r) });
  r.timer = setTimeout(() => nextQuestion(r), REVEAL_MS);
}

function maybeEarlyReveal(r) {
  const active = [...r.players.values()].filter(p => p.connected);
  if (active.length && active.every(p => p.answers[r.i] !== undefined)) setTimeout(() => reveal(r), 400);
}

async function finish(r) {
  r.state = 'done';
  clearTimeout(r.timer);
  const list = [...r.players.values()];
  const ranking = [...list].sort((a, b) => b.score - a.score || a.time - b.time);
  const changes = {};
  let winner = null;

  const deltas = {}, wins = {};
  if (r.mode === 'duel' && list.length === 2) {
    const [a, b] = list;
    const ra = await db.ratingOf(a.pid).catch(() => 1000);
    const rb = await db.ratingOf(b.pid).catch(() => 1000);
    const res = a.score === b.score ? (a.time === b.time ? 0.5 : a.time < b.time ? 1 : 0) : a.score > b.score ? 1 : 0;
    const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
    const da = Math.round(32 * (res - ea));
    deltas[a.sid] = da; deltas[b.sid] = -da;
    wins[a.sid] = res === 1; wins[b.sid] = res === 0;
    winner = res === 1 ? a.sid : res === 0 ? b.sid : null;
  } else if (r.mode === 'arena') {
    // Каждый сам за себя: очки рейтинга по занятому месту — от +24 за первое до −24 за последнее.
    const n = ranking.length;
    ranking.forEach((p, i) => { deltas[p.sid] = n > 1 ? Math.round(24 * (n - 1 - 2 * i) / (n - 1)) : 0; wins[p.sid] = n > 1 && i === 0; });
    winner = n > 1 ? ranking[0].sid : null;
  } else if (r.mode === 'class') {
    const t = teamScores(r);
    winner = t.A.avg === t.B.avg ? null : t.A.avg > t.B.avg ? 'A' : 'B';
    for (const p of list) { deltas[p.sid] = winner === null ? 4 : p.team === winner ? 10 : 2; wins[p.sid] = p.team === winner; }
  }
  Object.assign(changes, deltas);

  // Сохраняем игру: счёт, рейтинг и статистику по предметам для каждого игрока.
  const seen = new Set();
  const rows = list.filter(p => !seen.has(p.pid) && seen.add(p.pid)).map(p => {
    const subjects = {};
    r.questions.forEach((q, i) => {
      const s = subjects[q.k] ||= { answered: 0, correct: 0 };
      s.answered += 1; if (p.answers[i]?.correct) s.correct += 1;
    });
    return { id: p.pid, score: p.score, correct: p.answers.filter(x => x?.correct).length, total: r.questions.length, delta: deltas[p.sid] || 0, win: !!wins[p.sid], subjects };
  });
  await db.recordGame({ mode: r.mode, topic: r.subject, players: rows }).catch(console.error);

  const review = r.questions.map(q => ({ t: q.t, s: q.s, o: q.o, a: q.a, e: q.e }));
  for (const p of list) {
    io.to(p.sid).emit('end', {
      room: publicRoom(r), mode: r.mode, winner, change: changes[p.sid] ?? 0,
      ranking: ranking.map(x => ({ sid: x.sid, name: x.name, username: x.username, avatar: x.avatar, photo: x.photo, school: x.school, team: x.team, score: x.score, correct: x.answers.filter(a => a?.correct).length })),
      teams: teamScores(r), review, mine: r.questions.map((_, i) => p.answers[i]?.choice ?? null)
    });
  }
}

// Карточка игрока для комнат и поиска: имя, ник, цвет аватара и ссылка на фото (не само фото).
const card = p => ({ id: p.id, name: p.name, school: p.school, city: p.city, username: p.username, avatar: p.avatar || null,
  photo: p.photo ? `/p/${p.username}?v=${crypto.createHash('md5').update(p.photo).digest('hex').slice(0, 8)}` : null });

// Кто сейчас на сайте: игрок -> его открытые вкладки (сокеты).
const online = new Map();
const emitTo = (pid, ev, data) => { for (const sid of online.get(pid) || []) io.to(sid).emit(ev, data); };
const social = require('./social')(app, { db, auth, wrap, store, online, emitTo, cardOf: p => { const c = card(p); delete c.id; return c; } });
require('./unis')(app, db);
require('./minigames')(app, { db, auth, wrap, BANK, QUICK, shuffle });
// Живые баттлы для главной: что идёт прямо сейчас и чем закончились последние. Без текста вопросов и ответов.
const photoUrl = (u, v) => (v ? `/p/${u}?v=${String(v).slice(0, 8)}` : null);
app.get('/api/arena/live', wrap(async (req, res) => {
  const live = [...rooms.values()].filter(r => ['countdown', 'playing'].includes(r.state) && r.mode !== 'solo' && r.players.size >= 2)
    .sort((a, b) => b.players.size - a.players.size).slice(0, 3).map(r => ({
      mode: r.mode, subject: topicName(r.subject), i: Math.max(0, r.i), total: r.questions.length || ROUND, teams: r.mode === 'class' ? teamScores(r) : null,
      players: [...r.players.values()].sort((a, b) => b.score - a.score).slice(0, 4).map(p => ({ name: p.name, username: p.username, avatar: p.avatar, photo: p.photo ? photoUrl(p.username, crypto.createHash('md5').update(p.photo).digest('hex')) : null, school: p.school, city: p.city, score: p.score }))
    }));
  let recent = [];
  if (live.length < 1) {
    recent = (await db.recentBattles(4).catch(() => [])).map(g => ({ ...g, subject: validTopic(g.topic) ? topicName(g.topic) : null, players: g.players.slice(0, 4).map(p => ({ ...p, photo: photoUrl(p.username, p.photo_v), photo_v: undefined })) }));
  }
  const playing = [...rooms.values()].filter(r => r.state === 'playing').length;
  res.set('Cache-Control', 'no-store').json({ live, recent, playing, online: io.engine.clientsCount });
}));

// ---------- сокеты ----------
io.use(async (socket, next) => {
  const t = String(socket.handshake.auth?.token || '');
  const p = /^[a-f0-9]{64}$/.test(t) ? await db.sessionPlayer(t).catch(() => null) : null;
  if (!p) return next(new Error('auth'));
  socket.data.player = p; next();
});

io.on('connection', socket => {
  const pl = socket.data.player;
  let profile = card(pl);
  if (!online.has(pl.id)) online.set(pl.id, new Set());
  online.get(pl.id).add(socket.id);
  socket.on('profile_updated', async () => {
    const p = await db.get(profile.id).catch(() => null);
    if (p) profile = card(p);
  });

  const join = (r, team) => {
    for (const p of r.players.values()) {
      if (p.pid === profile.id && !p.connected) { r.players.delete(p.sid); p.sid = socket.id; p.connected = true; r.players.set(socket.id, p); socket.join(r.code); return true; }
    }
    if (r.state !== 'lobby') return false;
    if (r.mode === 'duel' && r.players.size >= 2) return false;
    if (r.mode === 'solo' && r.players.size >= 1) return false;
    if (r.mode === 'arena' && r.players.size >= (r.expect || 10)) return false;
    const counts = teamScores(r);
    r.players.set(socket.id, {
      sid: socket.id, pid: profile.id, name: profile.name, school: profile.school, city: profile.city, username: profile.username, avatar: profile.avatar, photo: profile.photo,
      team: r.mode === 'class' ? (team === 'A' || team === 'B' ? team : counts.A.players <= counts.B.players ? 'A' : 'B') : null,
      score: 0, time: 0, answers: [], connected: true
    });
    socket.join(r.code);
    r.touched = Date.now();
    return true;
  };

  socket.on('create', ({ mode, subject, lang } = {}, ack) => {
    if (!profile) return ack?.({ error: 'profile' });
    if (!['duel', 'class', 'solo'].includes(mode) || !validTopic(subject)) return ack?.({ error: 'pick' });
    const r = makeRoom(mode, subject, socket.id, lang);
    join(r);
    ack?.({ code: r.code });
    emitRoom(r);
    if (mode === 'solo') startGame(r);
  });

  socket.on('join', ({ code, team } = {}, ack) => {
    if (!profile) return ack?.({ error: 'profile' });
    const r = rooms.get(String(code || '').toUpperCase());
    if (!r) return ack?.({ error: 'notfound' });
    if (!join(r, team)) return ack?.({ error: r.state === 'lobby' ? 'full' : 'started' });
    ack?.({ code: r.code });
    emitRoom(r);
    if (r.state === 'playing') {
      const q = r.questions[r.i];
      socket.emit('question', { i: r.i, total: r.questions.length, t: q.t, s: q.s, o: q.o, img: q.img || null, endsAt: r.endsAt, duration: QUESTION_MS });
    }
    if (r.mode === 'duel' && r.state === 'lobby' && r.players.size === 2) startGame(r);
    if (r.mode === 'arena' && r.state === 'lobby' && r.players.size >= r.expect) startGame(r);
  });

  socket.on('team', ({ code, team } = {}) => {
    const r = rooms.get(code); const p = r?.players.get(socket.id);
    if (!p || r.state !== 'lobby' || r.mode !== 'class' || !['A', 'B'].includes(team)) return;
    p.team = team; emitRoom(r);
  });

  socket.on('start', ({ code } = {}, ack) => {
    const r = rooms.get(code);
    if (!r || r.hostSid !== socket.id) return ack?.({ error: 'host' });
    const t = teamScores(r);
    if (r.mode === 'class' && (!t.A.players || !t.B.players)) return ack?.({ error: 'teams' });
    startGame(r); ack?.({ ok: true });
  });

  socket.on('answer', ({ code, i, choice } = {}) => {
    const r = rooms.get(code); const p = r?.players.get(socket.id);
    if (!p || r.state !== 'playing' || i !== r.i || p.answers[i] !== undefined || Date.now() > r.endsAt) return;
    const ms = Date.now() - r.qStart;
    const correct = choice === r.questions[i].a;
    const gained = correct ? 10 + Math.round(5 * Math.max(0, r.endsAt - Date.now()) / QUESTION_MS) : 0;
    p.answers[i] = { choice: Number.isInteger(choice) ? choice : null, correct, gained };
    p.score += gained; p.time += ms;
    emitRoom(r);
    maybeEarlyReveal(r);
  });

  // Быстрый поиск: дуэль (2 игрока) или арена на 4, 5, 10 игроков — каждый сам за себя.
  socket.on('quick', ({ subject, lang, size } = {}, ack) => {
    if (!profile || !validTopic(subject)) return ack?.({ error: 'pick' });
    const ql = LANGS.includes(lang) ? lang : 'ru';
    const n = QUICK_SIZES.includes(size) ? size : 2;
    leaveQueues(socket);
    const key = `${subject}|${ql}|${n}`;
    const q = queues.get(key) || { list: [], since: Date.now(), subject, lang: ql, size: n };
    q.list = q.list.filter(s => s.connected && s.data.pid !== profile.id);
    if (!q.list.length) q.since = Date.now();
    socket.data.pid = profile.id; socket.data.card = { name: profile.name, username: profile.username, avatar: profile.avatar, photo: profile.photo, school: profile.school };
    q.list.push(socket); queues.set(key, q);
    if (q.list.length === 2) q.since = Date.now();
    if (q.list.length >= n) { ack?.({ waiting: true, n: q.list.length, size: n }); formMatch(key); } else { ack?.({ waiting: true }); notifyQueue(q); }
  });

  socket.on('cancel_quick', () => leaveQueues(socket));

  socket.on('invite', ({ from, code } = {}) => {
    if (profile && rooms.has(code) && typeof from === 'string') socket.to(from).emit('invite', { code, name: profile.name });
  });

  socket.on('leave', ({ code } = {}) => leaveRoom(code));

  function leaveRoom(code) {
    const r = rooms.get(code); const p = r?.players.get(socket.id);
    if (!p) return;
    socket.leave(code);
    if (r.state === 'lobby') {
      r.players.delete(socket.id);
      if (r.hostSid === socket.id) r.hostSid = r.players.keys().next().value;
    } else p.connected = false;
    if (!r.players.size || ![...r.players.values()].some(x => x.connected)) { clearTimeout(r.timer); rooms.delete(code); return; }
    emitRoom(r);
    if (r.state === 'playing') maybeEarlyReveal(r);
  }

  // Приглашение друга в свою комнату (дуэль или класс) прямо на сайте.
  socket.on('invite_friend', async ({ code, username } = {}, ack) => {
    const r = rooms.get(code);
    if (!r || !r.players.has(socket.id) || r.state !== 'lobby') return ack?.({ error: 'notfound' });
    const f = await db.findByUsername(String(username || '').toLowerCase()).catch(() => null);
    if (!f || !(await social.isFriend(profile.id, f.id).catch(() => false))) return ack?.({ error: 'notFriend' });
    if (!online.has(f.id)) return ack?.({ error: 'offline' });
    const from = card(await db.get(profile.id).catch(() => null) || profile); delete from.id;
    emitTo(f.id, 'battle_invite', { code: r.code, mode: r.mode, topic: topicName(r.subject), lang: r.lang, from });
    ack?.({ ok: true });
  });
  socket.on('invite_decline', ({ code } = {}) => {
    const r = rooms.get(code);
    if (r) for (const p of r.players.values()) if (p.sid === r.hostSid) io.to(p.sid).emit('invite_declined', { name: profile.name });
  });

  socket.on('disconnect', () => {
    const set = online.get(profile.id); if (set) { set.delete(socket.id); if (!set.size) online.delete(profile.id); }
    leaveQueues(socket);
    for (const r of rooms.values()) if (r.players.has(socket.id)) leaveRoom(r.code);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) if (now - r.touched > 60 * 60 * 1000 && r.state !== 'playing') { clearTimeout(r.timer); rooms.delete(r.code); }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
db.init().then(() => edu.ensureWeekly()).then(() => sessions.ensureWeekly()).then(() => server.listen(PORT, () => {
  console.log(`Bilim Arena: http://localhost:${PORT}`);
  // Бесплатный тариф Render усыпляет сервис после 15 минут без запросов. Раз в 10 минут обращаемся
  // к сайту по внешнему адресу — запрос проходит через Render и считается активностью.
  const self = process.env.RENDER_EXTERNAL_URL;
  if (self) setInterval(() => fetch(`${self}/healthz`).catch(() => {}), 10 * 60 * 1000);
}))
  .catch(e => { console.error('DB init failed', e); process.exit(1); });
