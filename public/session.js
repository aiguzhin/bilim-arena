// Запись на пробный ЕНТ (как на настоящий), пропуск, зал ожидания и итоги сессии.
window.SES = (() => {
  let X;
  const $ = (s, el = document) => el.querySelector(s);
  const T = {
    ru: {
      title: 'Запись на пробный ЕНТ', lead: 'Тест проходит в одно время для всех: общий старт, 4 часа, общий финиш. Результат — сертификат с баллами по каждому предмету.',
      steps: ['Личные данные', 'Предметы', 'Язык', 'Дата и время', 'Подтверждение'],
      next: 'Далее', back: 'Назад', confirm: 'Записаться', saveChange: 'Сохранить изменения',
      s1lead: 'Данные берутся из профиля. Проверьте, что всё верно: они попадут в пропуск и сертификат.',
      fio: 'Фамилия, имя', birth: 'Дата рождения', phone: 'Телефон', school: 'Школа', city: 'Город', login: 'Логин', fix: 'Исправить в профиле', dataOk: 'Данные верны',
      s2lead: 'Выберите пару профильных предметов. Обязательные предметы есть у всех:', mandatory: 'История Казахстана · Математическая грамотность · Грамотность чтения',
      s3lead: 'На каком языке вы будете сдавать тест?', langs: { kk: 'Қазақ тілі', ru: 'Русский язык', en: 'English' },
      s4lead: 'Выберите день, затем время начала. Каждый день — три смены; запись закрывается за час до начала.', pickDay: 'День сдачи', pickTime: 'Время начала', online: 'Онлайн · Bilim Arena', forSchool: 'Для вашей школы', regCount: n => `записано: ${n}`, regUntil: t => `запись до ${t}`, noSlots: 'Сейчас нет открытых дат для записи. Новые даты появляются каждую неделю.',
      s5lead: 'Проверьте запись и подтвердите правила.',
      rules: ['Тест начинается у всех одновременно. Зал ожидания открывается за 15 минут до начала.', 'Опоздавшие могут войти в течение 30 минут после начала, но закончить придётся вместе со всеми.', 'Длительность — 4 часа, 120 заданий, максимум 140 баллов.', 'Переходы на другие вкладки фиксируются; подозрительные результаты не попадают в рейтинг.'],
      agree: 'С правилами ознакомлен(а)', sumSession: 'Дата и время', sumCombo: 'Профильные предметы', sumLang: 'Язык',
      ticket: 'Пропуск на пробный ЕНТ', yourTicket: 'Ваш пропуск', statusOk: 'Вы записаны', tDate: 'Дата', tTime: 'Время', tPlace: 'Место', tRoom: 'Вход в зал ожидания', untilStart: 'До начала теста', units: ['дн', 'ч', 'мин', 'сек'], ikt: 'ИКТ', iktHint: 'Индивидуальный код тестируемого', start: 'Начало', roomOpens: t => `Зал ожидания откроется в ${t}`, duration: '4 часа · 120 заданий · 140 баллов',
      print: 'Распечатать', ics: 'В календарь', change: 'Изменить запись', cancel: 'Отменить запись', cancelAsk: 'Отменить запись на пробный ЕНТ? Пропуск станет недействительным.',
      already: 'Вы уже записаны', newReg: 'Записаться', toTicket: 'Мой пропуск', startsIn: s => `До начала: ${s}`,
      room: 'Зал ожидания', roomLead: 'Тест начнётся автоматически для всех в одно время. Не закрывайте страницу.', startNow: 'Начать тест', startSoon: 'Кнопка станет активной в момент старта',
      live: 'Тест идёт', lateLeft: t => `Вход открыт до ${t}`, resume: 'Продолжить тест', closedLate: 'Вход закрыт: с начала теста прошло больше 30 минут.', notReg: 'Вы не записаны на эту дату.',
      runningOthers: t => `Участники ещё сдают тест. Общие итоги появятся в ${t}.`,
      resTitle: 'Итоги сессии', resPrelim: 'Предварительно — тест ещё идёт', myScore: 'Ваш балл', place: (p, n) => `${p} место из ${n}`, cert: 'Открыть сертификат',
      stReg: 'Записались', stTook: 'Сдавали', stAvg: 'Средний балл', stPass: 'Набрали порог', stBest: 'Лучший балл', hist: 'Распределение баллов', top: 'Лучшие результаты',
      my: 'Мои записи', past: 'Прошедшие', scoreOf: s => `${s} из 140`, inProgress: 'идёт', missed: 'не сдавал(а)',
      teacher: 'Назначить пробный ЕНТ для школы', teacherLead: 'Ученики вашей школы увидят эту дату при записи. Тест длится 4 часа, начало — в выбранное время.', tStart: 'Начало', tTitle: 'Название (необязательно)', tCreate: 'Назначить', tMine: 'Назначено вами', tDel: 'Удалить',
      banner: 'Пробный ЕНТ в одно время для всех', chooseReg: 'Записаться на пробный ЕНТ', chooseRegText: 'Как на настоящем ЕНТ: выберите день и время, сдавайте вместе со всеми и получите сертификат с ИКТ.', chooseNow: 'Сдать пробный ЕНТ сейчас', chooseNowText: 'Тренировочный вариант в любое время: 120 заданий, 4 часа, разбор ошибок сразу после теста.', chooseNowBtn: 'Выбрать предметы', bannerNext: (d, t) => `Ближайшая дата: ${d}, ${t}`, bannerMine: (d, t) => `Вы записаны: ${d}, ${t}`,
      memoTitle: 'Памятка участника',
      memoOnline: [
        ['clock', 'Приходите заранее', 'Откройте сайт и войдите в зал ожидания за 15 минут до начала. Опоздание больше чем на 30 минут — вход закрыт.'],
        ['id', 'Держите под рукой пропуск', 'Запомните или запишите свой ИКТ — он указан в пропуске и в сертификате.'],
        ['wifi', 'Проверьте связь и зарядку', 'Нужен стабильный интернет и заряженное устройство (лучше — компьютер или ноутбук) на все 4 часа.'],
        ['pen', 'Подготовьте черновик', 'Возьмите чистые листы и ручку для расчётов. Калькулятор на ЕНТ не разрешён.'],
        ['ban', 'Не переключайтесь на другие вкладки', 'Уходы со страницы фиксируются; такой результат не попадёт в рейтинг, пока его не проверит учитель.'],
        ['water', 'Позаботьтесь о себе', 'Выспитесь, поешьте заранее, поставьте рядом воду. Время идёт, даже если вы отошли.']
      ],
      memoSchool: [
        ['clock', 'Приходите заранее', 'Будьте в школе за 30 минут до начала: проверка, рассадка и вход в систему занимают время.'],
        ['id', 'Возьмите документы', 'Удостоверение личности (или свидетельство о рождении) и пропуск с ИКТ — распечатанный или на телефоне.'],
        ['pen', 'Только разрешённые вещи', 'Ручка и черновик выдаются на месте. Телефоны, шпаргалки, калькуляторы и смарт-часы сдайте до начала.'],
        ['ban', 'Не переключайтесь на другие вкладки', 'Уходы со страницы фиксируются, учитель видит их в отчёте.'],
        ['water', 'Позаботьтесь о себе', 'Выспитесь, поешьте заранее, возьмите воду в прозрачной бутылке.']
      ],
      err: { regClosed: 'Запись на эту дату уже закрыта', regExists: 'У вас уже есть запись. Отмените её, чтобы выбрать другую дату', profileNeeded: 'Заполните дату рождения и телефон в профиле', notRegistered: 'Вы не записаны на эту дату', sessSoon: 'Тест ещё не начался', sessLate: 'Вход уже закрыт', regStarted: 'Тест уже начат — запись нельзя отменить', sessStart: 'Начало — не раньше чем через 15 минут' }
    },
    kk: {
      title: 'Сынақ ҰБТ-ға тіркелу', lead: 'Тест барлығы үшін бір уақытта өтеді: ортақ басталу, 4 сағат, ортақ аяқталу. Нәтиже — әр пән бойынша балдары бар сертификат.',
      steps: ['Жеке деректер', 'Пәндер', 'Тіл', 'Күні мен уақыты', 'Растау'],
      next: 'Келесі', back: 'Артқа', confirm: 'Тіркелу', saveChange: 'Өзгерістерді сақтау',
      s1lead: 'Деректер профильден алынады. Бәрі дұрыс екенін тексеріңіз: олар рұқсатнамаға және сертификатқа енеді.',
      fio: 'Тегі, аты', birth: 'Туған күні', phone: 'Телефон', school: 'Мектеп', city: 'Қала', login: 'Логин', fix: 'Профильде түзету', dataOk: 'Деректер дұрыс',
      s2lead: 'Бейіндік пәндер жұбын таңдаңыз. Міндетті пәндер барлығында бар:', mandatory: 'Қазақстан тарихы · Математикалық сауаттылық · Оқу сауаттылығы',
      s3lead: 'Тестті қай тілде тапсырасыз?', langs: { kk: 'Қазақ тілі', ru: 'Орыс тілі', en: 'English' },
      s4lead: 'Алдымен күнді, сосын басталу уақытын таңдаңыз. Күн сайын үш ауысым; тіркелу басталуға бір сағат қалғанда жабылады.', pickDay: 'Тапсыру күні', pickTime: 'Басталу уақыты', online: 'Онлайн · Bilim Arena', forSchool: 'Сіздің мектебіңізге', regCount: n => `тіркелгендер: ${n}`, regUntil: t => `тіркелу ${t} дейін`, noSlots: 'Қазір тіркелуге ашық күн жоқ. Жаңа күндер әр апта сайын шығады.',
      s5lead: 'Тіркелуді тексеріп, ережелерді растаңыз.',
      rules: ['Тест барлығында бір уақытта басталады. Күту залы басталуға 15 минут қалғанда ашылады.', 'Кешіккендер басталғаннан кейін 30 минут ішінде кіре алады, бірақ барлығымен бірге аяқтайды.', 'Ұзақтығы — 4 сағат, 120 тапсырма, ең көбі 140 балл.', 'Басқа беттерге өту белгіленеді; күдікті нәтижелер рейтингке кірмейді.'],
      agree: 'Ережелермен таныстым', sumSession: 'Күні мен уақыты', sumCombo: 'Бейіндік пәндер', sumLang: 'Тіл',
      ticket: 'Сынақ ҰБТ-ға рұқсатнама', yourTicket: 'Сіздің рұқсатнамаңыз', statusOk: 'Тіркелдіңіз', tDate: 'Күні', tTime: 'Уақыты', tPlace: 'Орны', tRoom: 'Күту залына кіру', untilStart: 'Тест басталуына', units: ['күн', 'сағ', 'мин', 'сек'], ikt: 'ТЖК', iktHint: 'Тестіленушінің жеке коды', start: 'Басталуы', roomOpens: t => `Күту залы ${t}-де ашылады`, duration: '4 сағат · 120 тапсырма · 140 балл',
      print: 'Басып шығару', ics: 'Күнтізбеге', change: 'Тіркелуді өзгерту', cancel: 'Тіркелуден бас тарту', cancelAsk: 'Сынақ ҰБТ-ға тіркелуден бас тартасыз ба? Рұқсатнама жарамсыз болады.',
      already: 'Сіз тіркелгенсіз', newReg: 'Тіркелу', toTicket: 'Рұқсатнамам', startsIn: s => `Басталуына: ${s}`,
      room: 'Күту залы', roomLead: 'Тест барлығы үшін бір уақытта өздігінен басталады. Бетті жаппаңыз.', startNow: 'Тестті бастау', startSoon: 'Батырма басталу сәтінде белсенді болады',
      live: 'Тест жүріп жатыр', lateLeft: t => `Кіру ${t} дейін ашық`, resume: 'Тестті жалғастыру', closedLate: 'Кіру жабық: тест басталғаннан бері 30 минуттан көп өтті.', notReg: 'Сіз бұл күнге тіркелмегенсіз.',
      runningOthers: t => `Қатысушылар әлі тапсырып жатыр. Жалпы қорытынды ${t}-де шығады.`,
      resTitle: 'Сессия қорытындысы', resPrelim: 'Алдын ала — тест әлі жүріп жатыр', myScore: 'Сіздің балыңыз', place: (p, n) => `${n} ішінде ${p}-орын`, cert: 'Сертификатты ашу',
      stReg: 'Тіркелді', stTook: 'Тапсырды', stAvg: 'Орташа балл', stPass: 'Шектен өтті', stBest: 'Ең жоғары балл', hist: 'Балдардың таралуы', top: 'Үздік нәтижелер',
      my: 'Менің тіркелулерім', past: 'Өткендер', scoreOf: s => `140-тан ${s}`, inProgress: 'жүріп жатыр', missed: 'тапсырмады',
      teacher: 'Мектепке сынақ ҰБТ тағайындау', teacherLead: 'Мектебіңіздің оқушылары бұл күнді тіркелу кезінде көреді. Тест 4 сағат, басталуы — таңдалған уақытта.', tStart: 'Басталуы', tTitle: 'Атауы (міндетті емес)', tCreate: 'Тағайындау', tMine: 'Сіз тағайындаған', tDel: 'Жою',
      banner: 'Барлығына бір уақытта сынақ ҰБТ', chooseReg: 'Сынақ ҰБТ-ға тіркелу', chooseRegText: 'Нағыз ҰБТ сияқты: күн мен уақытты таңдап, барлығымен бірге тапсырыңыз және ТЖК бар сертификат алыңыз.', chooseNow: 'Сынақ ҰБТ-ны қазір тапсыру', chooseNowText: 'Кез келген уақытта жаттығу нұсқасы: 120 тапсырма, 4 сағат, тесттен кейін бірден қателерді талдау.', chooseNowBtn: 'Пәндерді таңдау', bannerNext: (d, t) => `Жақын күн: ${d}, ${t}`, bannerMine: (d, t) => `Сіз тіркелдіңіз: ${d}, ${t}`,
      memoTitle: 'Қатысушы жадынамасы',
      memoOnline: [
        ['clock', 'Ертерек келіңіз', 'Басталуға 15 минут қалғанда сайтты ашып, күту залына кіріңіз. 30 минуттан артық кешіксеңіз — кіру жабылады.'],
        ['id', 'Рұқсатнаманы жаныңызда ұстаңыз', 'ТЖК-ны есте сақтаңыз немесе жазып алыңыз — ол рұқсатнамада және сертификатта көрсетілген.'],
        ['wifi', 'Интернет пен зарядты тексеріңіз', 'Барлық 4 сағатқа тұрақты интернет пен зарядталған құрылғы (жақсысы — компьютер немесе ноутбук) керек.'],
        ['pen', 'Жоба қағазын дайындаңыз', 'Есептеулерге таза парақ пен қалам алыңыз. ҰБТ-да калькуляторға рұқсат жоқ.'],
        ['ban', 'Басқа беттерге ауыспаңыз', 'Беттен кету белгіленеді; мұндай нәтиже мұғалім тексермейінше рейтингке кірмейді.'],
        ['water', 'Өзіңізді күтіңіз', 'Жақсылап ұйықтаңыз, алдын ала тамақтаныңыз, жаныңызға су қойыңыз. Сіз тұрып кетсеңіз де уақыт жүреді.']
      ],
      memoSchool: [
        ['clock', 'Ертерек келіңіз', 'Басталуға 30 минут қалғанда мектепте болыңыз: тексеру, отырғызу және жүйеге кіру уақыт алады.'],
        ['id', 'Құжаттарды алыңыз', 'Жеке куәлік (немесе туу туралы куәлік) және ТЖК бар рұқсатнама — басып шығарылған немесе телефонда.'],
        ['pen', 'Тек рұқсат етілген заттар', 'Қалам мен жоба қағазы орнында беріледі. Телефон, шпаргалка, калькулятор мен смарт-сағатты басталғанға дейін тапсырыңыз.'],
        ['ban', 'Басқа беттерге ауыспаңыз', 'Беттен кету белгіленеді, мұғалім оны есептен көреді.'],
        ['water', 'Өзіңізді күтіңіз', 'Жақсылап ұйықтаңыз, алдын ала тамақтаныңыз, мөлдір бөтелкеде су алыңыз.']
      ],
      err: { regClosed: 'Бұл күнге тіркелу жабылды', regExists: 'Сізде тіркелу бар. Басқа күнді таңдау үшін оны болдырмаңыз', profileNeeded: 'Профильде туған күн мен телефонды толтырыңыз', notRegistered: 'Сіз бұл күнге тіркелмегенсіз', sessSoon: 'Тест әлі басталған жоқ', sessLate: 'Кіру жабылды', regStarted: 'Тест басталды — тіркелуді болдырмау мүмкін емес', sessStart: 'Басталуы — кемінде 15 минуттан кейін' }
    }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const errT = x => t().err[x?.code] || X.L().err?.[x?.code] || X.L().err?.server || 'Error';
  let offset = 0; const now = () => Date.now() + offset;
  const hm = ms => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const DOW = { ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'], kk: ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'] };
  const day = ms => `${(DOW[X.lang()] || DOW.ru)[new Date(ms).getDay()]}, ${fmtDate(new Date(ms).toISOString(), X.lang())}`;
  const comboName = c => X.topicName(`combo:${c}`);
  const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return `${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(ss).padStart(2, '0')}`; };
  const longIn = ms => { const m = Math.max(1, Math.ceil(ms / 60000)); const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return X.lang() === 'kk' ? `${d ? d + ' күн ' : ''}${d || h ? h + ' сағ ' : ''}${m % 60} мин` : `${d ? d + ' д ' : ''}${d || h ? h + ' ч ' : ''}${m % 60} мин`; };
  const page = body => `<div class="page"><div class="wrap narrow">${body}</div></div>${X.footer()}`;

  // ---------- памятка участника ----------
  const MI = {
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13h3"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.3a9.5 9.5 0 0 1 13 0M8.6 15.6a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>', pen: '<path d="M4 20l4.5-1 10-10-3.5-3.5-10 10z"/><path d="M13.5 6.5l3.5 3.5"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>', water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'
  };
  const memo = (kind, open = true) => {
    const list = kind === 'school' ? t().memoSchool : t().memoOnline;
    return `<details class="memo" ${open ? 'open' : ''}><summary><span class="memo__badge" aria-hidden="true">!</span>${t().memoTitle}</summary><ul>${list.map(([ic, h, tx]) => `<li><span class="memo__ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${MI[ic]}</svg></span><div><b>${h}</b><p>${tx}</p></div></li>`).join('')}</ul></details>`;
  };

  // ---------- пропуск ----------
  // Декоративный штрихкод из цифр ИКТ (для вида пропуска; это не машиночитаемый код).
  function barcode(code) {
    let x = 0, bars = '';
    const add = (w, on) => { if (on) bars += `<rect x="${x}" y="0" width="${w}" height="44"/>`; x += w; };
    add(2, 1); add(1, 0); add(1, 1); add(2, 0);
    for (const ch of String(code)) { const d = +ch; add(1 + (d % 3), 1); add(1 + ((d + 1) % 2), 0); add(1 + ((d + 2) % 3), 1); add(2, 0); }
    add(1, 1); add(1, 0); add(2, 1);
    return `<svg class="tk__bar" viewBox="0 0 ${x} 44" preserveAspectRatio="none" aria-hidden="true"><g fill="currentColor">${bars}</g></svg>`;
  }
  const ikt3 = v => String(v).replace(/(\d{3})(?=\d)/g, '$1 ');
  function ticketHtml(s, reg, prof) {
    const L = t(), d = new Date(s.startsAt);
    const dateLong = `${(DOW[X.lang()] || DOW.ru)[d.getDay()]}, ${fmtDate(d.toISOString(), X.lang(), true)}`;
    return `<article class="tk" id="ticket">
      <div class="tk__main">
        <header class="tk__head">${window.LOGO_MARK ? LOGO_MARK(36) : ''}<div><span>Bilim Arena</span><b>${L.ticket}</b></div><span class="tk__ok">${L.statusOk}</span></header>
        <div class="tk__body">
          <span class="tk__lbl">${L.fio}</span>
          <div class="tk__name">${esc(prof?.name || X.me().name)}</div>
          <dl class="tk__grid">
            <div><dt>${L.tDate}</dt><dd>${dateLong}</dd></div>
            <div><dt>${L.tTime}</dt><dd class="num">${hm(s.startsAt)} – ${hm(s.endsAt)}</dd></div>
            <div><dt>${L.sumCombo}</dt><dd>${esc(comboName(reg.combo))}</dd></div>
            <div><dt>${L.sumLang}</dt><dd>${L.langs[reg.lang]}</dd></div>
            <div><dt>${L.tPlace}</dt><dd>${s.kind === 'weekly' ? L.online : L.forSchool}</dd></div>
            <div><dt>${L.tRoom}</dt><dd class="num">${hm(s.roomAt)}</dd></div>
          </dl>
        </div>
      </div>
      <div class="tk__stub">
        <span class="tk__lbl">${L.ikt}</span>
        <div class="tk__ikt num">${ikt3(reg.ikt)}</div>
        <small>${L.iktHint}</small>
        ${barcode(reg.ikt)}
        <div class="tk__fmt">${L.duration}</div>
      </div>
    </article>`;
  }
  // Обратный отсчёт плитками: дни / часы / минуты / секунды.
  function countdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    const U = t().units, cell = (v, u) => `<div><b class="num">${String(v).padStart(2, '0')}</b><span>${u}</span></div>`;
    return (dd ? cell(dd, U[0]) : '') + cell(hh, U[1]) + cell(mm, U[2]) + (dd ? '' : cell(ss, U[3]));
  }
  function ics(s, reg) {
    const f = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bilim Arena//RU', 'BEGIN:VEVENT', `UID:${s.id}-${reg.ikt}@bilim-arena`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(s.startsAt)}`, `DTEND:${f(s.endsAt)}`,
      `SUMMARY:${t().ticket} (${t().ikt} ${reg.ikt})`, `URL:${location.origin}/ent/s/${s.id}`, 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${t().ticket}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = `ent-${reg.ikt}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- запись: пошагово ----------
  async function viewRegister() {
    X.setTitle(t().title);
    let d; try { d = await X.api('/api/sessions'); } catch { return; }
    offset = d.now - Date.now();
    const params = new URLSearchParams(location.search);
    const active = d.regs.find(r => r.session.phase !== 'done' && !r.mockId);
    const editing = params.get('edit') === '1' && active ? active : null;
    if (active && !editing) {
      X.app.innerHTML = page(`<h1>${t().already}</h1><p class="page__lead">${t().lead}</p><div style="margin-top:24px">${ticketHtml(active.session, active, d.profile)}</div>
        <div class="ticket__actions"><a class="btn" href="/ent/s/${active.session.id}" data-link>${t().toTicket}</a></div>${memo(active.session.kind, false)}${myList(d)}${teacherBox(d)}`);
      bindTeacher();
      return;
    }
    const open = d.sessions.filter(s => s.phase === 'reg');
    const st = { step: 1, combo: editing?.combo || localStorage.getItem('ba_ent_combo') || Object.keys(X.meta().combos)[0], lang: editing?.lang || X.lang(), sid: params.get('s') || editing?.session.id || open[0]?.id || null, ok: !!editing, agree: false };
    if (!open.some(s => s.id === st.sid)) st.sid = open[0]?.id || null;
    const p = d.profile;
    const draw = () => {
      const steps = t().steps.map((n, i) => `<li class="${i + 1 === st.step ? 'is-cur' : i + 1 < st.step ? 'is-done' : ''}"><span>${i + 1 < st.step ? '✓' : i + 1}</span><b>${n}</b></li>`).join('');
      let body = '';
      if (st.step === 1) body = `<p class="muted">${t().s1lead}</p><dl class="rdata">
          <div><dt>${t().fio}</dt><dd>${esc(p.name)}</dd></div><div><dt>${t().birth}</dt><dd>${p.birthDate ? fmtDate(p.birthDate + 'T12:00:00Z', X.lang(), true) : '—'}</dd></div>
          <div><dt>${t().phone}</dt><dd>${esc(p.phone || '—')}</dd></div><div><dt>${t().school}</dt><dd>${esc(p.school)}</dd></div>
          <div><dt>${t().city}</dt><dd>${esc(X.cityName(p.city))}</dd></div><div><dt>${t().login}</dt><dd>@${esc(p.username)}</dd></div></dl>
          <a href="/me" data-link class="fsmall">${t().fix}</a>
          <label class="check" style="margin-top:16px"><input type="checkbox" id="rOk" ${st.ok ? 'checked' : ''}> <span>${t().dataOk}</span></label>`;
      else if (st.step === 2) body = `<p class="muted">${t().s2lead}</p><p class="rmand">${t().mandatory}</p>
          <div class="combos combos--ent rcombos">${Object.keys(X.meta().combos).map(c => `<label><input type="radio" name="rc" value="${c}" ${c === st.combo ? 'checked' : ''}><div class="opt">${esc(comboName(c))}</div></label>`).join('')}</div>`;
      else if (st.step === 3) body = `<p class="muted">${t().s3lead}</p><div class="rlangs">${['kk', 'ru', 'en'].map(l => `<label><input type="radio" name="rl" value="${l}" ${l === st.lang ? 'checked' : ''}><span><b>${t().langs[l]}</b></span></label>`).join('')}</div>`;
      else if (st.step === 4) {
        // Сначала день, потом время — как при записи на ЕНТ.
        const dayKey = ms => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
        const days = [...new Map(open.map(x => [dayKey(x.startsAt), x.startsAt])).entries()];
        if (!st.day || !days.some(([k]) => k === st.day)) st.day = st.sid ? dayKey(open.find(x => x.id === st.sid)?.startsAt || open[0]?.startsAt) : days[0]?.[0];
        const DW = X.lang() === 'kk' ? ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'] : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const slots = open.filter(x => dayKey(x.startsAt) === st.day);
        body = `<p class="muted">${t().s4lead}</p>${open.length ? `
          <div class="rdays" role="radiogroup" aria-label="${t().pickDay}">${days.map(([k, ms]) => { const d = new Date(ms); return `<button type="button" class="rday" data-day="${k}" aria-pressed="${k === st.day}"><small>${DW[d.getDay()]}</small><b class="num">${d.getDate()}</b><small>${fmtDate(d.toISOString(), X.lang()).split(' ').slice(1).join(' ')}</small></button>`; }).join('')}</div>
          <p class="rsub">${t().pickTime}</p>
          <div class="rslots">${slots.map(x => `<label><input type="radio" name="rs" value="${x.id}" ${x.id === st.sid ? 'checked' : ''}><span class="rslot">
            <b class="rslot__time num">${hm(x.startsAt)}</b><span class="rslot__day">${hm(x.startsAt)}–${hm(x.endsAt)}</span><span class="rslot__meta">${x.kind === 'weekly' ? t().online : t().forSchool + (x.title ? ' · ' + esc(x.title) : '')}</span>
            <span class="rslot__meta">${t().regCount(x.count || 0)} · ${t().regUntil(hm(x.regUntil))}</span></span></label>`).join('')}</div>` : `<div class="empty">${t().noSlots}</div>`}`;
      }
      else {
        const s = open.find(x => x.id === st.sid);
        body = `<p class="muted">${t().s5lead}</p><dl class="rdata">
          <div><dt>${t().fio}</dt><dd>${esc(p.name)}</dd></div><div><dt>${t().sumSession}</dt><dd>${s ? `${day(s.startsAt)}, <b>${hm(s.startsAt)}</b>` : '—'}</dd></div>
          <div><dt>${t().sumCombo}</dt><dd>${esc(comboName(st.combo))}</dd></div><div><dt>${t().sumLang}</dt><dd>${t().langs[st.lang]}</dd></div></dl>
          ${memo(s?.kind === 'school' ? 'school' : 'online')}
          <ul class="rrules">${t().rules.map(r => `<li>${r}</li>`).join('')}</ul>
          <label class="check"><input type="checkbox" id="rAgree" ${st.agree ? 'checked' : ''}> <span>${t().agree}</span></label>`;
      }
      const canNext = st.step === 1 ? st.ok : st.step === 4 ? !!st.sid && open.some(x => x.id === st.sid) : st.step === 5 ? st.agree : true;
      X.app.innerHTML = page(`<h1>${t().title}</h1><p class="page__lead">${t().lead}</p>
        <ol class="rsteps">${steps}</ol>
        <section class="rcard"><h2>${st.step}. ${t().steps[st.step - 1]}</h2>${body}<p class="form-error" id="rErr" role="alert"></p>
          <div class="rnav">${st.step > 1 ? `<button class="btn btn--ghost" id="rBack">${t().back}</button>` : '<span></span>'}<button class="btn" id="rNext" ${canNext ? '' : 'disabled'}>${st.step < 5 ? t().next : editing ? t().saveChange : t().confirm}</button></div>
        </section>${st.step === 1 ? myList(d) + teacherBox(d) : ''}`);
      const on = (sel, ev, f) => { const el = $(sel); if (el) el[ev] = f; };
      on('#rOk', 'onchange', e => { st.ok = e.target.checked; $('#rNext').disabled = !st.ok; });
      on('#rAgree', 'onchange', e => { st.agree = e.target.checked; $('#rNext').disabled = !st.agree; });
      X.app.querySelectorAll('[name=rc]').forEach(r => r.onchange = () => { st.combo = r.value; });
      X.app.querySelectorAll('[name=rl]').forEach(r => r.onchange = () => { st.lang = r.value; });
      X.app.querySelectorAll('[name=rs]').forEach(r => r.onchange = () => { st.sid = r.value; $('#rNext').disabled = false; });
      X.app.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { st.day = b.dataset.day; st.sid = null; draw(); });
      on('#rBack', 'onclick', () => { st.step--; draw(); window.scrollTo(0, 0); });
      on('#rNext', 'onclick', async () => {
        if (st.step < 5) { st.step++; draw(); window.scrollTo(0, 0); return; }
        $('#rNext').disabled = true;
        try {
          if (editing && editing.session.id !== st.sid) await X.api(`/api/sessions/${editing.session.id}/register`, { method: 'DELETE' });
          await X.api(`/api/sessions/${st.sid}/register`, { method: 'POST', body: { combo: st.combo, lang: st.lang } });
          X.go(`/ent/s/${st.sid}`);
        } catch (x) { $('#rErr').textContent = errT(x); $('#rNext').disabled = false; }
      });
      bindTeacher();
    };
    draw();
  }

  function myList(d) {
    const past = d.regs.filter(r => r.session.phase === 'done' || r.mockId);
    if (!past.length) return '';
    return `<h2 class="me__h2">${t().my}</h2><ul class="rmy">${past.map(r => `<li><a href="/ent/s/${r.session.id}" data-link><span>${day(r.session.startsAt)}, ${hm(r.session.startsAt)}<small>${esc(comboName(r.combo))} · ${t().ikt} ${esc(r.ikt)}</small></span>
      <b class="num">${r.result?.score != null ? t().scoreOf(r.result.score) : r.result?.inProgress ? t().inProgress : t().missed}</b></a></li>`).join('')}</ul>`;
  }
  function teacherBox(d) {
    if (X.me().role !== 'teacher') return '';
    const mine = d.sessions.filter(s => s.mine === X.me().id && s.kind === 'school');
    const local = new Date(Date.now() + 864e5 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 11) + '10:00';
    return `<section class="rcard rteacher"><h2>${t().teacher}</h2><p class="muted">${t().teacherLead}</p>
      <form id="sNew" class="tform__row" style="align-items:end"><label class="field"><span>${t().tStart}</span><input type="datetime-local" name="at" value="${local}" required></label>
        <label class="field"><span>${t().tTitle}</span><input name="title" maxlength="60"></label><button class="btn">${t().tCreate}</button></form><p class="form-error" id="sErr"></p>
      ${mine.length ? `<p class="fsmall muted" style="margin-top:10px">${t().tMine}:</p><ul class="rmy">${mine.map(s => `<li><a href="/ent/s/${s.id}" data-link><span>${day(s.startsAt)}, ${hm(s.startsAt)}<small>${esc(s.title || '')} · ${t().regCount(s.count || 0)}</small></span></a><button class="linkbtn" data-sdel="${s.id}">${t().tDel}</button></li>`).join('')}</ul>` : ''}</section>`;
  }
  function bindTeacher() {
    const f = $('#sNew');
    if (f) f.onsubmit = async e => {
      e.preventDefault();
      try { await X.api('/api/sessions', { method: 'POST', body: { startsAt: new Date(f.at.value).toISOString(), title: f.title.value } }); viewRegister(); } catch (x) { $('#sErr').textContent = errT(x); }
    };
    X.app.querySelectorAll('[data-sdel]').forEach(b => b.onclick = async () => { await X.api(`/api/sessions/${b.dataset.sdel}`, { method: 'DELETE' }).catch(() => {}); viewRegister(); });
  }

  // ---------- страница сессии: пропуск → зал ожидания → тест → итоги ----------
  async function viewSession(id) {
    let d; try { d = await X.api(`/api/sessions/${id}`); } catch (x) { X.app.innerHTML = page(`<h1>${errT(x)}</h1><p style="margin-top:20px"><a class="btn" href="/ent/register" data-link>${t().title}</a></p>`); return; }
    offset = d.now - Date.now();
    const s = d.session, reg = d.reg, ph = s.phase;
    X.setTitle(reg ? t().ticket : t().title);
    let main = '';
    if (!reg && ph !== 'done') {
      main = ph === 'reg' ? `<div class="tbig"><p>${day(s.startsAt)}, <b>${hm(s.startsAt)}</b></p><a class="btn btn--lg" href="/ent/register?s=${s.id}" data-link>${t().newReg}</a></div>` : `<div class="empty">${t().notReg}</div>`;
    } else if (reg && (ph === 'reg' || ph === 'closed')) {
      const ic = p => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
      main = `${ticketHtml(s, reg)}
        <section class="tcount"><span class="tcount__k">${t().untilStart}</span><div class="tcount__cells" id="sClock">${countdown(s.startsAt - now())}</div>
          <p class="tcount__note">${t().roomOpens(hm(s.roomAt))}</p></section>
        <div class="tk__actions">
          <button class="btn btn--ghost" id="sPrint">${ic('<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>')}${t().print}</button>
          <button class="btn btn--ghost" id="sIcs">${ic('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/>')}${t().ics}</button>
          ${ph === 'reg' ? `<a class="btn btn--ghost" href="/ent/register?edit=1" data-link>${ic('<path d="M4 20l4.5-1 10-10-3.5-3.5-10 10z"/>')}${t().change}</a>` : ''}
          <button class="linkbtn tk__cancel" id="sCancel">${t().cancel}</button>
        </div>${memo(s.kind)}`;
    } else if (reg && ph === 'room') {
      main = `<section class="sroom"><span class="live-dot"></span><h2>${t().room}</h2><p class="muted">${t().roomLead}</p>
        <div class="tbig__clock num" id="sClock">${clock(s.startsAt - now())}</div><button class="btn btn--lg" disabled>${t().startNow}</button><p class="fsmall muted">${t().startSoon}</p></section>${memo(s.kind)}${ticketHtml(s, reg)}`;
    } else if (reg && !d.my?.done && (ph === 'live' || (ph === 'running' && reg.mockId))) {
      main = `<section class="sroom"><span class="live-dot"></span><h2>${t().live}</h2>${!reg.mockId ? `<p class="muted">${t().lateLeft(hm(s.lateUntil))}</p>` : ''}
        <button class="btn btn--lg" id="sStart">${reg.mockId ? t().resume : t().startNow}</button><p class="form-error" id="sErr"></p></section>`;
    } else if (reg && ph === 'running' && !reg.mockId) {
      main = `<div class="empty">${t().closedLate}</div>`;
    }
    let res = '';
    if (d.results) {
      const r = d.results, max = Math.max(1, ...r.hist);
      res = `<section class="sres"><h2>${t().resTitle}</h2>${!r.final ? `<p class="muted">${t().resPrelim} · ${t().runningOthers(hm(s.endsAt))}</p>` : ''}
        ${d.my?.done ? `<div class="tmine"><div><span class="tmine__k">${t().myScore}</span><b class="num">${d.my.score}</b><span class="muted">/ 140</span></div>${r.place && r.final ? `<div class="tmine__place">${t().place(r.place, r.finished)}</div>` : ''}<a class="btn btn--sm" href="/ent/${reg.mockId}" data-link>${t().cert}</a></div>` : ''}
        <div class="sstats"><div><b class="num">${r.registered}</b><span>${t().stReg}</span></div><div><b class="num">${r.finished}</b><span>${t().stTook}</span></div>
          <div><b class="num">${r.avg ?? '—'}</b><span>${t().stAvg}</span></div><div><b class="num">${r.passRate != null ? r.passRate + '%' : '—'}</b><span>${t().stPass}</span></div><div><b class="num">${r.best ?? '—'}</b><span>${t().stBest}</span></div></div>
        ${r.finished ? `<h3>${t().hist}</h3><div class="shist">${r.hist.map((n, i) => `<div title="${i * 10}–${i === 13 ? 140 : i * 10 + 9}: ${n}"><i style="height:${Math.round(n / max * 100)}%" class="${i < 5 ? 'low' : ''}"></i><span>${i * 10}</span></div>`).join('')}</div>` : ''}
        ${r.top?.length ? `<h3>${t().top}</h3><table class="table"><tbody>${r.top.map(x => `<tr class="${x.me ? 'is-me' : ''} ${x.place <= 3 ? 'top3' : ''}"><td class="pos">${x.place}</td><td><span class="who">${ACC.avatar(x, 'sm')}<span><a class="plink" href="/u/${esc(x.username)}" data-link>${esc(x.name)}</a><div class="sub">${esc(x.school)} · ${esc(comboName(x.combo))}</div></span></span></td><td class="r num"><b>${x.score}</b></td></tr>`).join('')}</tbody></table>` : ''}
      </section>`;
    }
    X.app.innerHTML = page(`<p class="ps__top"><a href="/ent/register" data-link class="ps__back">← ${t().title}</a></p>
      <h1>${reg && ph !== 'done' && !d.my?.done ? t().yourTicket : s.kind === 'school' ? esc(s.title || t().forSchool) : t().banner}</h1><p class="page__lead">${day(s.startsAt)}, ${hm(s.startsAt)}–${hm(s.endsAt)} · ${s.kind === 'weekly' ? t().online : t().forSchool}</p>
      <div style="margin-top:22px">${main}</div>${res}`);
    const on = (sel, f) => { const el = $(sel); if (el) el.onclick = f; };
    on('#sPrint', () => window.print());
    on('#sIcs', () => ics(s, reg));
    on('#sCancel', async () => { if (!confirm(t().cancelAsk)) return; try { await X.api(`/api/sessions/${s.id}/register`, { method: 'DELETE' }); X.go('/ent/register'); } catch (x) { X.toast(errT(x)); } });
    on('#sStart', async () => { try { const r = await X.api(`/api/sessions/${s.id}/start`, { method: 'POST' }); X.go(`/ent/${r.id}`); } catch (x) { $('#sErr').textContent = errT(x); } });
    // Таймер: в нужный момент страница сама переходит к следующему этапу (зал → старт → итоги).
    const nextAt = ph === 'reg' ? s.regUntil : ph === 'closed' ? s.roomAt : ph === 'room' ? s.startsAt : ph === 'live' ? s.lateUntil : ph === 'running' ? s.endsAt : null;
    const iv = setInterval(() => {
      if (location.pathname !== `/ent/s/${id}`) return clearInterval(iv);
      const el = $('#sClock'); const left = s.startsAt - now();
      if (el) { if (ph === 'room') el.textContent = clock(left); else el.innerHTML = countdown(left); }
      if (nextAt && now() >= nextAt) { clearInterval(iv); viewSession(id); }
    }, 1000);
    X.onCleanup(() => clearInterval(iv));
  }

  // ---------- выбор на странице «Пробный ЕНТ»: записаться или сдать сейчас ----------
  async function banner(el) {
    if (!el) return;
    let d = null; try { d = await X.api('/api/sessions'); offset = d.now - Date.now(); } catch {}
    const mine = d?.regs.find(r => r.session.phase !== 'done' && !(r.result?.score != null));
    const next = d?.sessions.find(s => s.phase === 'reg');
    const ico = p => `<span class="echoice__ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg></span>`;
    el.innerHTML = `<div class="echoice">
      <a class="echoice__card echoice__card--main" href="${mine ? `/ent/s/${mine.session.id}` : '/ent/register'}" data-link>
        ${ico('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')}
        <b>${t().chooseReg}</b>
        <span>${mine ? t().bannerMine(day(mine.session.startsAt), hm(mine.session.startsAt)) + ` · ${t().ikt} ${esc(mine.ikt)}` : t().chooseRegText}</span>
        ${!mine && next ? `<small>${t().bannerNext(day(next.startsAt), hm(next.startsAt))}</small>` : ''}
        <span class="btn">${mine ? t().toTicket : t().newReg}</span>
      </a>
      <button type="button" class="echoice__card" id="echNow">
        ${ico('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>')}
        <b>${t().chooseNow}</b><span>${t().chooseNowText}</span>
        <span class="btn btn--ghost">${t().chooseNowBtn}</span>
      </button>
    </div>`;
    $('#echNow').onclick = () => { const f = document.getElementById('entForm'); f?.scrollIntoView({ behavior: 'smooth', block: 'start' }); f?.querySelector('input:checked')?.focus({ preventScroll: true }); };
  }

  return {
    init(ctx) { X = ctx; },
    view(path) {
      const m = path.match(/^\/ent\/s\/([\w-]{6,64})$/);
      return m ? viewSession(m[1]) : viewRegister();
    },
    banner
  };
})();
