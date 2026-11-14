// Школьная часть: турниры, работа над ошибками, кабинет учителя, класс ученика, достижения и рейтинги.
window.EDU = (() => {
  let X;
  const $ = (s, el = document) => el.querySelector(s);
  const LET = ['A', 'B', 'C', 'D', 'E', 'F'];

  const T = {
    ru: {
      loading: 'Загрузка…', back: 'Назад', cancel: 'Отмена', save: 'Сохранить', del: 'Удалить', copied: 'Скопировано', min: 'мин',
      mandatory: 'Обязательные предметы',
      dow: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
      months: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
      tasks: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'задание' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'задания' : 'заданий'}`,
      people: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'участник' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'участника' : 'участников'}`,
      students: n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'ученик' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'ученика' : 'учеников'}`,
      inT: (d, h, m) => `через ${d ? d + ' д ' : ''}${d || h ? h + ' ч ' : ''}${m} мин`,

      // турниры
      toursTitle: 'Турниры',
      toursLead: 'Все участники начинают в одно время и решают одни и те же задания. Порядок заданий и вариантов у каждого свой, время ограничено, попытка одна.',
      weeklyMain: 'Турнир недели', weeklyProfile: 'Профильный турнир', classTour: 'Турнир класса', schoolTour: 'Турнир школы',
      forAll: 'Для всех школ', forClass: 'Для класса', forSchool: 'Для школы',
      live: 'Идёт сейчас', soon: 'Ближайшие', past: 'Мои прошедшие турниры', none: 'Пока нет запланированных турниров.',
      schedule: 'Каждую среду в 19:00 — профильный турнир, каждую субботу в 15:00 — турнир недели по обязательным предметам. Время — по Астане.',
      startsIn: s => `Начало ${s}`, at: (d, t) => `${d}, ${t}`, joinUntil: t => `Вход открыт до ${t}`, closesIn: s => `Вход закроется ${s}`,
      register: 'Участвовать', registered: 'Вы участвуете', start: 'Начать', resume: 'Продолжить', results: 'Результаты', closed: 'Вход закрыт', finishedMine: 'Вы завершили',
      rulesTitle: 'Правила',
      rules: ['Одна попытка, время ограничено.', 'Задания идут по одному, вернуться к прошлому нельзя.', 'Переходы на другие вкладки и слишком быстрые ответы отмечаются; такие результаты проверяет учитель.', 'Разбор ответов открывается после окончания турнира.'],
      chooseLangNote: 'Язык заданий выберете при старте.',
      myResult: 'Ваш результат', place: (p, n) => `${p} место из ${n}`, standings: 'Таблица участников', schoolsTable: 'Школы в турнире', schoolsNote: 'Средний балл пяти лучших участников школы.',
      thPlace: '#', thName: 'Участник', thSchool: 'Школа', thScore: 'Балл', thTime: 'Время', thN: 'Участников', thAvg: 'Средний',
      reviewTitle: 'Разбор заданий', reviewLater: t => `Разбор откроется после окончания турнира, в ${t}.`, yourAns: 'Ваш ответ', noAns: 'нет ответа', rightAns: 'Верный ответ',
      underReview: f => `Результат на проверке: ${f}. В таблицу он попадёт после подтверждения учителем.`,
      waitTable: 'Таблица появится, когда вы завершите турнир.',
      qOf: (i, n) => `Задание ${i} из ${n}`, answer: 'Ответить', skip: 'Пропустить', finishEarly: 'Завершить',
      finishAsk: 'Завершить турнир? Оставшиеся задания останутся без ответа.', warnTabs: 'Не переключайтесь на другие вкладки — это отмечается в результате.',
      timeLeft: 'Осталось', done: 'Готово', doneLead: 'Ответы приняты.', toTour: 'К результатам', delTour: 'Удалить турнир', delTourAsk: 'Удалить турнир вместе с результатами?',
      homeNext: 'Ближайший турнир', homeAll: 'Все турниры',

      // работа над ошибками
      prTitle: 'Работа над ошибками',
      prLead: 'Задания, в которых вы ошиблись на пробных ЕНТ и в турнирах. Решите их ещё раз — исправленные уходят из списка.',
      prWait: n => `Ждут исправления: <b class="num">${n}</b>`, prFixed: n => `Исправлено: <b class="num">${n}</b>`, prToday: n => `Сегодня решено: <b class="num">${n}</b>`,
      prAll: 'Решить 10 ошибок', prPlan: 'Личный план', prPlanLead: 'Предметы с самой низкой точностью по вашим пробным ЕНТ и баттлам. Начните с них.',
      prSubjects: 'Все предметы', prMist: n => `${n} ош.`, prAcc: p => `точность ${p}%`, prNoData: 'нет данных', prTrain: 'Тренировать',
      prEmpty: 'Ошибок пока нет. Решите пробный ЕНТ или турнир — задания с ошибками появятся здесь.',
      check: 'Проверить', next: 'Дальше', finish: 'Завершить', right: 'Верно', wrong: 'Неверно', partial: 'Частично верно', explain: 'Пояснение',
      sDone: 'Тренировка завершена', sScore: (c, n) => `Верно ${c} из ${n}`, sAgain: 'Ещё 10', sList: 'К списку', fromMist: 'ваша ошибка', fresh: 'новое задание',
      multiHint: 'Выберите все верные ответы', matchHint: 'Сопоставьте: для каждой буквы выберите номер',

      // учитель
      tTitle: 'Кабинет учителя',
      tLead: 'Создайте класс, отправьте ученикам код и следите за подготовкой: пробные ЕНТ, прогресс, слабые предметы, турниры и честность результатов.',
      becomeTitle: 'Кабинет для учителей и кураторов',
      becomePts: ['Классы с кодом приглашения — ученики вступают за минуту', 'Статистика по каждому ученику: пробные ЕНТ, прогресс, слабые предметы, активность', 'Турниры для класса или всей школы в назначенное время', 'Проверка подозрительных результатов', 'Выгрузка таблицы класса в CSV'],
      becomeBtn: 'Я учитель — открыть кабинет', becomeNote: 'Учителя не участвуют в рейтингах учеников. Если вы ученик, вступите в класс в профиле.',
      newClass: 'Новый класс', className: 'Название класса', classNamePh: '11 «А»', create: 'Создать', classes: 'Мои классы', noClasses: 'Классов пока нет. Создайте первый — ученики вступят по коду.',
      code: 'Код', copyLink: 'Ссылка-приглашение', inviteHint: 'Ученики вступают по коду в профиле → «Класс» или по ссылке.',
      tabStudents: 'Ученики', tabSubjects: 'Предметы', tabTours: 'Турниры', tabCheck: 'Проверка',
      thStudent: 'Ученик', thMocks: 'Пробных', thBest: 'Лучший', thLast: 'Последний', thProg: 'Рост', thWeak: 'Слабый предмет', thAct: 'Активность', thSeen: 'Был(а)',
      actNote: 'Активность — очки за 30 дней: пробный ЕНТ 5, турнир 4, баттл и тренировка по ошибкам по 1.',
      noStudents: 'В классе пока нет учеников. Отправьте им код или ссылку.',
      csv: 'Скачать CSV', remove: 'Убрать', removeAsk: n => `Убрать ${n} из класса?`,
      teamGoal: 'Цель класса на месяц', teamGoalText: (d, t) => `${d} из ${t} пробных ЕНТ`, goalEdit: 'Изменить', goalAsk: 'Сколько пробных ЕНТ класс должен решить за месяц?',
      subjLead: 'Средний процент класса по предметам во всех засчитанных пробных ЕНТ. Сверху — самые слабые.', noSubj: 'Данные появятся после первых пробных ЕНТ учеников.',
      newTour: 'Новый турнир', fTitle: 'Название', fTitlePh: 'Например, «Контрольный срез»', fTopic: 'Предмет', fN: 'Заданий', fMin: 'Время, мин', fStart: 'Начало', fStartNow: 'Сейчас', fStartAt: 'В назначенное время',
      fJoin: 'Вход открыт, мин', fScope: 'Участники', scopeClass: 'Только этот класс', scopeSchool: 'Вся школа', createTour: 'Создать турнир', noTours: 'Турниров этого класса пока не было.',
      flagsLead: 'Система отмечает результаты, где тест решён слишком быстро или ученик часто уходил со страницы. В рейтинг они не попадают, пока вы их не подтвердите.',
      approve: 'Засчитать', noFlags: 'Подозрительных результатов нет.', mockShort: 'Пробный ЕНТ', tourShort: 'Турнир',
      leftInfo: (n, m) => `ушёл со страницы ${n} раз${m ? `, всего ${m} мин` : ''}`, fastInfo: n => `быстрых верных ответов: ${n}`,
      delClass: 'Удалить класс', delClassAsk: 'Удалить класс? Ученики останутся на платформе, но выйдут из класса.', rename: 'Переименовать',
      roleBack: 'Перейти в режим ученика',

      // класс ученика
      cTitle: 'Класс', joinTitle: 'Вступить в класс', joinLead: 'Попросите у учителя код класса из 6 символов — тогда учитель увидит вашу подготовку, а вы будете участвовать в турнирах класса.',
      joinPh: 'Код, например K7Q2MX', joinBtn: 'Вступить', teacherLbl: 'Учитель', leave: 'Выйти из класса', leaveAsk: 'Выйти из класса?', mates: 'Одноклассники',
      matesNote: 'Сортировка по активности за 30 дней.', classTours: 'Турниры класса', joinPage: 'Приглашение в класс', joinAsk: 'Вас пригласили в класс', joined: 'Вы в классе',
      teacherMode: 'Вы учитель: классы — в кабинете учителя.', toCabinet: 'Кабинет учителя',

      // достижения
      achNew: 'Новое достижение', achTitle: 'Достижения', streak: 'Серия', streakDays: n => `${n} дн. подряд`, bestStreak: n => `Лучшая серия — ${n} дн.`, activeDays: n => `Дней с занятиями: ${n}`,
      achCount: (a, b) => `Получено ${a} из ${b}`, streakHint: 'Занимайтесь каждый день: пробный ЕНТ, турнир, баттл или работа над ошибками.',
      ach: {
        mock1: ['Первый шаг', 'Решить первый пробный ЕНТ'], mock5: ['Система', 'Решить 5 пробных ЕНТ'], mock15: ['Марафонец', 'Решить 15 пробных ЕНТ'],
        pass: ['Порог пройден', 'Набрать пороговые баллы по всем предметам и 50+ в сумме'], score100: ['Сотня', 'Набрать 100+ баллов в пробном ЕНТ'], score120: ['Отличник', 'Набрать 120+ баллов'],
        prog10: ['Рост', 'Поднять средний балл на 10'], prog25: ['Прорыв', 'Поднять средний балл на 25'],
        tour1: ['Дебют', 'Сыграть в турнире'], tour5: ['Турнирный боец', 'Сыграть в 5 турнирах'], podium: ['Призёр', 'Войти в тройку турнира'],
        duel1: ['Первая победа', 'Выиграть дуэль'], duel10: ['Дуэлянт', 'Выиграть 10 дуэлей'],
        fix50: ['Над ошибками', 'Исправить 50 ошибок'], fix200: ['Без пробелов', 'Исправить 200 ошибок'],
        streak3: ['Три дня', 'Заниматься 3 дня подряд'], streak7: ['Неделя', 'Заниматься 7 дней подряд'], streak30: ['Месяц', 'Заниматься 30 дней подряд'], streak100: ['Сто дней', 'Заниматься 100 дней подряд'],
        team: ['В команде', 'Вступить в класс']
      },

      // рейтинги
      rTitle: 'Рейтинг',
      rLead: 'Три рейтинга, чтобы побеждали не только самые сильные: по результатам ЕНТ, по прогрессу и по активности. Школы соревнуются внутри своей лиги.',
      rSchools: 'Школы', rStudents: 'Ученики', kResults: 'Результаты ЕНТ', kProgress: 'Прогресс', kActivity: 'Активность', kBattle: 'Баттлы',
      expl: {
        schools: { results: 'Средний лучший балл пяти сильнейших учеников школы за сезон (пробный ЕНТ, из 140).', progress: 'Средний рост учеников: среднее двух последних пробных минус среднее двух первых. Учитываются ученики с 3+ пробными.', activity: 'Сумма очков учеников за сезон: пробный ЕНТ — 5, турнир — 4, баттл и тренировка по ошибкам — по 1 (не больше 300 у одного ученика).', battle: 'Средний рейтинг Эло учеников по дуэлям и баттлам.' },
        students: { results: 'Лучший балл пробного ЕНТ за сезон, из 140.', progress: 'Среднее двух последних пробных минус среднее двух первых. Нужно минимум 3 пробных.', activity: 'Очки за сезон: пробный ЕНТ — 5, турнир — 4, баттл и тренировка по ошибкам — по 1. Максимум 300.', battle: 'Рейтинг Эло по дуэлям и баттлам.' }
      },
      season: 'Сезон', allTime: 'За всё время', leagueAll: 'Все лиги', leagues: { high: 'Высшая лига', first: 'Первая лига', second: 'Вторая лига' },
      leagueNote: 'Лига зависит от стартового уровня школы — среднего балла первых пробных ЕНТ учеников: высшая — от 90, первая — 60–89, вторая — до 60.',
      myCity: 'Только мой город', verified: 'На платформе есть учитель школы', rEmpty: 'В этом рейтинге пока никого нет.', rEmptyCta: 'Решить пробный ЕНТ',
      thPts: 'Очки', thLeague: 'Лига', thRise: 'Рост', thStud: 'Учеников', thRating: 'Рейтинг', thWins: 'Победы', you: 'вы',
      err: { teacher: 'Доступно только учителям', className: 'Введите название класса', classGoal: 'Цель — от 1 до 500', classCode: 'Класс с таким кодом не найден', classFull: 'В классе уже 60 учеников', teacherJoin: 'Учитель не может вступить в класс как ученик', hasClasses: 'Сначала удалите свои классы', tourClosed: 'Вход в турнир уже закрыт', tourSoon: 'Турнир ещё не начался', tourMinutes: 'Время — от 5 до 90 минут', tourStart: 'Проверьте время начала', limitClasses: 'Не больше 20 классов', notfound: 'Не найдено' }
    },
    kk: {
      loading: 'Жүктелуде…', back: 'Артқа', cancel: 'Болдырмау', save: 'Сақтау', del: 'Жою', copied: 'Көшірілді', min: 'мин',
      mandatory: 'Міндетті пәндер',
      dow: ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі'],
      months: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
      tasks: n => `${n} тапсырма`, people: n => `${n} қатысушы`, students: n => `${n} оқушы`,
      inT: (d, h, m) => `${d ? d + ' күн ' : ''}${d || h ? h + ' сағ ' : ''}${m} мин кейін`,

      toursTitle: 'Турнирлер',
      toursLead: 'Барлық қатысушы бір уақытта бастап, бірдей тапсырмаларды шешеді. Тапсырмалар мен жауап нұсқаларының реті әркімде әртүрлі, уақыт шектеулі, әрекет — біреу.',
      weeklyMain: 'Апта турнирі', weeklyProfile: 'Бейіндік турнир', classTour: 'Сынып турнирі', schoolTour: 'Мектеп турнирі',
      forAll: 'Барлық мектепке', forClass: 'Сыныпқа', forSchool: 'Мектепке',
      live: 'Қазір жүріп жатыр', soon: 'Жақындағы', past: 'Өткен турнирлерім', none: 'Әзірге жоспарланған турнир жоқ.',
      schedule: 'Әр сәрсенбі 19:00 — бейіндік турнир, әр сенбі 15:00 — міндетті пәндер бойынша апта турнирі. Уақыт — Астана бойынша.',
      startsIn: s => `Басталуы: ${s}`, at: (d, t) => `${d}, ${t}`, joinUntil: t => `Кіру ${t} дейін ашық`, closesIn: s => `Кіру жабылады: ${s}`,
      register: 'Қатысу', registered: 'Сіз қатысасыз', start: 'Бастау', resume: 'Жалғастыру', results: 'Нәтижелер', closed: 'Кіру жабық', finishedMine: 'Сіз аяқтадыңыз',
      rulesTitle: 'Ережелер',
      rules: ['Бір әрекет, уақыт шектеулі.', 'Тапсырмалар бір-бірден беріледі, алдыңғысына оралуға болмайды.', 'Басқа беттерге өту және тым жылдам жауаптар белгіленеді; мұндай нәтижені мұғалім тексереді.', 'Жауаптарды талдау турнир аяқталғаннан кейін ашылады.'],
      chooseLangNote: 'Тапсырма тілін бастарда таңдайсыз.',
      myResult: 'Сіздің нәтижеңіз', place: (p, n) => `${n} қатысушының ішінде ${p}-орын`, standings: 'Қатысушылар кестесі', schoolsTable: 'Турнирдегі мектептер', schoolsNote: 'Мектептің ең үздік бес қатысушысының орташа балы.',
      thPlace: '#', thName: 'Қатысушы', thSchool: 'Мектеп', thScore: 'Балл', thTime: 'Уақыт', thN: 'Қатысушы', thAvg: 'Орташа',
      reviewTitle: 'Тапсырмаларды талдау', reviewLater: t => `Талдау турнир аяқталғаннан кейін, ${t}-де ашылады.`, yourAns: 'Сіздің жауабыңыз', noAns: 'жауап жоқ', rightAns: 'Дұрыс жауап',
      underReview: f => `Нәтиже тексеруде: ${f}. Мұғалім растағаннан кейін кестеге енеді.`,
      waitTable: 'Кесте турнирді аяқтағаннан кейін көрінеді.',
      qOf: (i, n) => `${n} тапсырманың ${i}-сі`, answer: 'Жауап беру', skip: 'Өткізу', finishEarly: 'Аяқтау',
      finishAsk: 'Турнирді аяқтайсыз ба? Қалған тапсырмалар жауапсыз қалады.', warnTabs: 'Басқа беттерге ауыспаңыз — бұл нәтижеде белгіленеді.',
      timeLeft: 'Қалды', done: 'Дайын', doneLead: 'Жауаптар қабылданды.', toTour: 'Нәтижелерге', delTour: 'Турнирді жою', delTourAsk: 'Турнирді нәтижелерімен бірге жоясыз ба?',
      homeNext: 'Жақындағы турнир', homeAll: 'Барлық турнирлер',

      prTitle: 'Қатемен жұмыс',
      prLead: 'Сынақ ҰБТ мен турнирлерде қате жіберген тапсырмаларыңыз. Оларды қайта шешіңіз — түзетілгендері тізімнен шығады.',
      prWait: n => `Түзетуді күтіп тұр: <b class="num">${n}</b>`, prFixed: n => `Түзетілді: <b class="num">${n}</b>`, prToday: n => `Бүгін шешілді: <b class="num">${n}</b>`,
      prAll: '10 қатені шешу', prPlan: 'Жеке жоспар', prPlanLead: 'Сынақ ҰБТ мен баттлдар бойынша дәлдігі ең төмен пәндер. Солардан бастаңыз.',
      prSubjects: 'Барлық пәндер', prMist: n => `${n} қате`, prAcc: p => `дәлдік ${p}%`, prNoData: 'дерек жоқ', prTrain: 'Жаттығу',
      prEmpty: 'Әзірге қате жоқ. Сынақ ҰБТ немесе турнир тапсырыңыз — қате тапсырмалар осында шығады.',
      check: 'Тексеру', next: 'Келесі', finish: 'Аяқтау', right: 'Дұрыс', wrong: 'Қате', partial: 'Жартылай дұрыс', explain: 'Түсініктеме',
      sDone: 'Жаттығу аяқталды', sScore: (c, n) => `${n} тапсырманың ${c}-і дұрыс`, sAgain: 'Тағы 10', sList: 'Тізімге', fromMist: 'сіздің қатеңіз', fresh: 'жаңа тапсырма',
      multiHint: 'Барлық дұрыс жауапты таңдаңыз', matchHint: 'Сәйкестендіріңіз: әр әріпке нөмір таңдаңыз',

      tTitle: 'Мұғалім кабинеті',
      tLead: 'Сынып құрып, оқушыларға кодты жіберіңіз — дайындықты бақылаңыз: сынақ ҰБТ, өсу, әлсіз пәндер, турнирлер және нәтиженің адалдығы.',
      becomeTitle: 'Мұғалімдер мен кураторларға арналған кабинет',
      becomePts: ['Шақыру коды бар сыныптар — оқушылар бір минутта қосылады', 'Әр оқушы бойынша статистика: сынақ ҰБТ, өсу, әлсіз пәндер, белсенділік', 'Сыныпқа немесе бүкіл мектепке белгіленген уақытта турнир', 'Күдікті нәтижелерді тексеру', 'Сынып кестесін CSV-ге жүктеу'],
      becomeBtn: 'Мен мұғаліммін — кабинетті ашу', becomeNote: 'Мұғалімдер оқушылар рейтингіне қатыспайды. Оқушы болсаңыз, профильде сыныпқа қосылыңыз.',
      newClass: 'Жаңа сынып', className: 'Сынып атауы', classNamePh: '11 «А»', create: 'Құру', classes: 'Менің сыныптарым', noClasses: 'Әзірге сынып жоқ. Біріншісін құрыңыз — оқушылар кодпен қосылады.',
      code: 'Код', copyLink: 'Шақыру сілтемесі', inviteHint: 'Оқушылар профильдегі «Сынып» бөлімінде кодпен немесе сілтеме арқылы қосылады.',
      tabStudents: 'Оқушылар', tabSubjects: 'Пәндер', tabTours: 'Турнирлер', tabCheck: 'Тексеру',
      thStudent: 'Оқушы', thMocks: 'Сынақ', thBest: 'Үздік', thLast: 'Соңғы', thProg: 'Өсу', thWeak: 'Әлсіз пән', thAct: 'Белсенділік', thSeen: 'Соңғы кіру',
      actNote: 'Белсенділік — 30 күндегі ұпай: сынақ ҰБТ 5, турнир 4, баттл мен қатемен жұмыс 1-ден.',
      noStudents: 'Сыныпта әзірге оқушы жоқ. Оларға код немесе сілтеме жіберіңіз.',
      csv: 'CSV жүктеу', remove: 'Шығару', removeAsk: n => `${n} сыныптан шығарылсын ба?`,
      teamGoal: 'Сыныптың айлық мақсаты', teamGoalText: (d, t) => `${t} сынақ ҰБТ-ның ${d}-і`, goalEdit: 'Өзгерту', goalAsk: 'Сынып бір айда неше сынақ ҰБТ шешуі керек?',
      subjLead: 'Есептелген барлық сынақ ҰБТ бойынша сыныптың пәндік орташа пайызы. Жоғарыда — ең әлсіздері.', noSubj: 'Деректер оқушылардың алғашқы сынақ ҰБТ-сынан кейін шығады.',
      newTour: 'Жаңа турнир', fTitle: 'Атауы', fTitlePh: 'Мысалы, «Бақылау кесімі»', fTopic: 'Пән', fN: 'Тапсырма', fMin: 'Уақыт, мин', fStart: 'Басталуы', fStartNow: 'Қазір', fStartAt: 'Белгіленген уақытта',
      fJoin: 'Кіру ашық, мин', fScope: 'Қатысушылар', scopeClass: 'Тек осы сынып', scopeSchool: 'Бүкіл мектеп', createTour: 'Турнир құру', noTours: 'Бұл сыныптың турнирі әлі болған жоқ.',
      flagsLead: 'Жүйе тест тым жылдам шешілген немесе оқушы беттен жиі кеткен нәтижелерді белгілейді. Сіз растамайынша олар рейтингке кірмейді.',
      approve: 'Есептеу', noFlags: 'Күдікті нәтиже жоқ.', mockShort: 'Сынақ ҰБТ', tourShort: 'Турнир',
      leftInfo: (n, m) => `беттен ${n} рет кетті${m ? `, барлығы ${m} мин` : ''}`, fastInfo: n => `жылдам дұрыс жауаптар: ${n}`,
      delClass: 'Сыныпты жою', delClassAsk: 'Сыныпты жоясыз ба? Оқушылар платформада қалады, бірақ сыныптан шығады.', rename: 'Атауын өзгерту',
      roleBack: 'Оқушы режиміне өту',

      cTitle: 'Сынып', joinTitle: 'Сыныпқа қосылу', joinLead: 'Мұғалімнен 6 таңбалы сынып кодын сұраңыз — сонда мұғалім дайындығыңызды көреді, ал сіз сынып турнирлеріне қатысасыз.',
      joinPh: 'Код, мысалы K7Q2MX', joinBtn: 'Қосылу', teacherLbl: 'Мұғалім', leave: 'Сыныптан шығу', leaveAsk: 'Сыныптан шығасыз ба?', mates: 'Сыныптастар',
      matesNote: '30 күндік белсенділік бойынша сұрыпталған.', classTours: 'Сынып турнирлері', joinPage: 'Сыныпқа шақыру', joinAsk: 'Сізді сыныпқа шақырды', joined: 'Сіз сыныптасыз',
      teacherMode: 'Сіз мұғалімсіз: сыныптар — мұғалім кабинетінде.', toCabinet: 'Мұғалім кабинеті',

      achNew: 'Жаңа жетістік', achTitle: 'Жетістіктер', streak: 'Серия', streakDays: n => `${n} күн қатарынан`, bestStreak: n => `Ең ұзақ серия — ${n} күн`, activeDays: n => `Сабақ болған күндер: ${n}`,
      achCount: (a, b) => `${b}-нің ${a}-і алынды`, streakHint: 'Күн сайын айналысыңыз: сынақ ҰБТ, турнир, баттл немесе қатемен жұмыс.',
      ach: {
        mock1: ['Алғашқы қадам', 'Алғашқы сынақ ҰБТ-ны шешу'], mock5: ['Жүйелілік', '5 сынақ ҰБТ шешу'], mock15: ['Марафоншы', '15 сынақ ҰБТ шешу'],
        pass: ['Шекті балл', 'Барлық пәннен шекті балл және жалпы 50+ жинау'], score100: ['Жүздік', 'Сынақ ҰБТ-да 100+ балл жинау'], score120: ['Үздік', '120+ балл жинау'],
        prog10: ['Өсу', 'Орташа балды 10-ға көтеру'], prog25: ['Серпіліс', 'Орташа балды 25-ке көтеру'],
        tour1: ['Дебют', 'Турнирге қатысу'], tour5: ['Турнир жауынгері', '5 турнирге қатысу'], podium: ['Жүлдегер', 'Турнирде үздік үштікке кіру'],
        duel1: ['Алғашқы жеңіс', 'Дуэльде жеңу'], duel10: ['Дуэлянт', '10 дуэльде жеңу'],
        fix50: ['Қатемен жұмыс', '50 қатені түзету'], fix200: ['Олқылықсыз', '200 қатені түзету'],
        streak3: ['Үш күн', '3 күн қатарынан айналысу'], streak7: ['Апта', '7 күн қатарынан айналысу'], streak30: ['Ай', '30 күн қатарынан айналысу'], streak100: ['Жүз күн', '100 күн қатарынан айналысу'],
        team: ['Командада', 'Сыныпқа қосылу']
      },

      rTitle: 'Рейтинг',
      rLead: 'Тек ең мықтылар ғана емес жеңе алуы үшін үш рейтинг бар: ҰБТ нәтижесі, өсу және белсенділік бойынша. Мектептер өз лигасы ішінде жарысады.',
      rSchools: 'Мектептер', rStudents: 'Оқушылар', kResults: 'ҰБТ нәтижесі', kProgress: 'Өсу', kActivity: 'Белсенділік', kBattle: 'Баттлдар',
      expl: {
        schools: { results: 'Мектептің ең мықты бес оқушысының маусымдағы үздік балының орташасы (сынақ ҰБТ, 140-тан).', progress: 'Оқушылардың орташа өсуі: соңғы екі сынақтың орташасы минус алғашқы екеуінің орташасы. 3+ сынақ тапсырған оқушылар есептеледі.', activity: 'Оқушылардың маусымдағы ұпайлары: сынақ ҰБТ — 5, турнир — 4, баттл мен қатемен жұмыс — 1-ден (бір оқушыда 300-ден аспайды).', battle: 'Дуэль мен баттлдар бойынша оқушылардың орташа Эло рейтингі.' },
        students: { results: 'Маусымдағы сынақ ҰБТ-ның үздік балы, 140-тан.', progress: 'Соңғы екі сынақтың орташасы минус алғашқы екеуінің орташасы. Кемінде 3 сынақ керек.', activity: 'Маусымдағы ұпайлар: сынақ ҰБТ — 5, турнир — 4, баттл мен қатемен жұмыс — 1-ден. Ең көбі 300.', battle: 'Дуэль мен баттлдар бойынша Эло рейтингі.' }
      },
      season: 'Маусым', allTime: 'Барлық уақыт', leagueAll: 'Барлық лига', leagues: { high: 'Жоғары лига', first: 'Бірінші лига', second: 'Екінші лига' },
      leagueNote: 'Лига мектептің бастапқы деңгейіне байланысты — оқушылардың алғашқы сынақ ҰБТ-сының орташа балы: жоғары — 90-нан, бірінші — 60–89, екінші — 60-қа дейін.',
      myCity: 'Тек менің қалам', verified: 'Платформада мектеп мұғалімі бар', rEmpty: 'Бұл рейтингте әзірге ешкім жоқ.', rEmptyCta: 'Сынақ ҰБТ тапсыру',
      thPts: 'Ұпай', thLeague: 'Лига', thRise: 'Өсу', thStud: 'Оқушы', thRating: 'Рейтинг', thWins: 'Жеңіс', you: 'сіз',
      err: { teacher: 'Тек мұғалімдерге қолжетімді', className: 'Сынып атауын енгізіңіз', classGoal: 'Мақсат — 1-ден 500-ге дейін', classCode: 'Мұндай кодты сынып табылмады', classFull: 'Сыныпта 60 оқушы бар', teacherJoin: 'Мұғалім сыныпқа оқушы ретінде қосыла алмайды', hasClasses: 'Алдымен сыныптарыңызды жойыңыз', tourClosed: 'Турнирге кіру жабылды', tourSoon: 'Турнир әлі басталған жоқ', tourMinutes: 'Уақыт — 5-тен 90 минутқа дейін', tourStart: 'Басталу уақытын тексеріңіз', limitClasses: '20 сыныптан артық емес', notfound: 'Табылмады' }
    }
  };
  const t = () => T[X.lang()] || T.ru;
  const esc = s => X.esc(s);
  const errText = x => t().err[x?.code] || X.L().err?.[x?.code] || X.L().err?.server || 'Error';
  const page = (body, cls = 'narrow') => `<div class="page"><div class="wrap ${cls}">${body}</div></div>${X.footer()}`;
  const loading = () => { X.app.innerHTML = page(`${SKEL()}`); };
  const ava = (u, s = 'sm') => ACC.avatar({ username: u.username || u.name || '?', name: u.name, photo: u.photo, avatar: u.avatar }, s);
  const subj = k => X.pick(X.meta().subjects[k]) || k;
  const topicOf = k => (k === 'mandatory' ? t().mandatory : k?.startsWith('combo:') ? X.topicName(k) : subj(k));
  const hm = ms => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const dayName = ms => {
    const d = new Date(ms), today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today) / 864e5);
    const L = X.lang() === 'kk' ? ['бүгін', 'ертең'] : ['сегодня', 'завтра'];
    if (diff === 0 || diff === 1) return L[diff];
    return `${t().dow[d.getDay()]}, ${fmtDate(d.toISOString(), X.lang())}`;
  };
  const inText = ms => { const m = Math.max(1, Math.ceil(ms / 60000)); return t().inT(Math.floor(m / 1440), Math.floor(m % 1440 / 60), m % 60); };
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const dur = ms => (ms == null ? '—' : clock(ms));
  const pctClass = p => (p < 50 ? 'low' : p < 75 ? 'mid' : '');
  const tourName = tr => (tr.kind === 'weekly' ? (tr.title === 'main' ? t().weeklyMain : t().weeklyProfile) : tr.title || (tr.kind === 'school' ? t().schoolTour : t().classTour));
  const scopeOf = tr => (tr.kind === 'weekly' ? t().forAll : tr.kind === 'school' ? t().forSchool : t().forClass);
  const fmtTxt = s => esc(s).replace(/\n/g, '<br>');
  let offset = 0; // разница часов сервера и устройства
  const now = () => Date.now() + offset;
  const confirmDlg = (text, yes = t().del) => new Promise(res => {
    const d = document.createElement('dialog'); d.className = 'dlg';
    d.innerHTML = `<div class="dlg__body"><p>${esc(text)}</p><div class="dlg__actions"><button class="btn btn--ghost" data-v="0">${t().cancel}</button><button class="btn" data-v="1">${esc(yes)}</button></div></div>`;
    document.body.appendChild(d); d.addEventListener('close', () => d.remove());
    d.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { d.close(); res(b.dataset.v === '1'); } };
    d.addEventListener('cancel', () => res(false)); d.showModal();
  });
  const copy = async text => { try { await navigator.clipboard.writeText(text); X.toast(t().copied); } catch { X.toast(text); } };

  // ---------- значки достижений ----------
  const GLYPH = {
    mock: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    score: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    progress: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
    tour: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/>',
    duel: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    fix: '<circle cx="12" cy="12" r="8"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    streak: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 2 3 1-2 1-4 1-7z"/>',
    team: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1 6 4"/>'
  };
  const glyph = g => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[g] || GLYPH.score}</svg>`;

  // ---------- задание (общий вид для турниров и тренировки) ----------
  // value: число (один ответ), массив (несколько ответов / соответствие).
  function qHtml(q, lang, value, opts = {}) {
    const pk = o => (o && typeof o === 'object' ? o[lang] ?? o.ru : o);
    const o = pk(q.o) || [];
    let h = '';
    if (q.ctx) h += `<div class="eq__ctx">${fmtTxt(pk(q.ctx))}${q.cimg ? `<figure class="qfig">${q.cimg}</figure>` : ''}</div>`;
    h += `<div class="eq__text">${fmtTxt(pk(q.t))}</div>`;
    if (q.img) h += `<figure class="qfig">${q.img}</figure>`;
    const rev = opts.key != null;
    const mark = n => {
      if (!rev) return '';
      const right = Array.isArray(opts.key) ? opts.key.includes(n) : opts.key === n;
      const mine = Array.isArray(value) ? value.includes(n) : value === n;
      return right ? 'is-right' : mine ? 'is-wrong' : '';
    };
    if (q.type === 'p') {
      const left = pk(q.l) || [];
      h += `<p class="qhint">${t().matchHint}</p><div class="match__cols"><ol>${left.map((x, j) => `<li><b>${LET[j]}</b><span>${fmtTxt(x)}</span></li>`).join('')}</ol>
        <ol>${o.map((x, j) => `<li><b>${j + 1}</b><span>${fmtTxt(x)}</span></li>`).join('')}</ol></div>
        <div class="match__pick">${left.map((_, j) => `<div class="match__row"><b>${LET[j]}</b>${o.map((__, n) => {
          const sel = Array.isArray(value) && value[j] === n;
          const k = rev ? (opts.key[j] === n ? 'is-right' : sel ? 'is-wrong' : '') : '';
          return `<button type="button" class="mbtn ${k}" data-l="${j}" data-n="${n}" aria-pressed="${sel}" ${rev ? 'disabled' : ''}>${n + 1}</button>`;
        }).join('')}</div>`).join('')}</div>`;
    } else {
      const multi = q.type === 'm';
      if (multi) h += `<p class="qhint">${t().multiHint}</p>`;
      h += `<div class="eopts ${multi ? 'eopts--multi' : ''}" role="${multi ? 'group' : 'radiogroup'}">${o.map((x, n) => {
        const sel = multi ? Array.isArray(value) && value.includes(n) : value === n;
        return `<button type="button" class="eopt ${mark(n)}" data-n="${n}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${sel}" ${rev ? 'disabled' : ''}><b>${LET[n]}</b><span>${fmtTxt(x)}</span></button>`;
      }).join('')}</div>`;
    }
    return h;
  }
  // Возвращает новое значение ответа после клика.
  function qClick(q, value, e) {
    const m = e.target.closest('.mbtn'); const b = e.target.closest('.eopt');
    if (m) { const v = Array.isArray(value) ? value.slice() : (X.pick(q.l) || []).map(() => null); const j = +m.dataset.l, n = +m.dataset.n; v[j] = v[j] === n ? null : n; return v; }
    if (b) {
      const n = +b.dataset.n;
      if (q.type === 'm') { const v = Array.isArray(value) ? value.slice() : []; const i = v.indexOf(n); i < 0 ? v.push(n) : v.splice(i, 1); return v; }
      return n;
    }
    return undefined;
  }
  const hasAnswer = v => (Array.isArray(v) ? v.some(x => x != null) : v != null);

  // ---------- турниры: список ----------
  function tourCard(tr, mode = 'list') {
    const n = now();
    let when, action = '';
    if (tr.status === 'soon') {
      when = `${t().at(dayName(tr.startsAt), hm(tr.startsAt))} · <span class="tcard__in">${t().startsIn(inText(tr.startsAt - n))}</span>`;
      action = tr.me ? `<span class="tag tag--ok">${t().registered}</span>` : `<button class="btn btn--sm" data-reg="${tr.id}">${t().register}</button>`;
    } else if (tr.status === 'live') {
      const open = n < tr.joinUntil;
      when = `<span class="live-dot"></span>${t().live} · ${open ? t().closesIn(inText(tr.joinUntil - n)) : t().closed}`;
      action = tr.me === 'finished' ? `<a class="btn btn--sm btn--ghost" href="/t/${tr.id}" data-link>${t().results}</a>`
        : tr.me === 'started' ? `<a class="btn btn--sm" href="/t/${tr.id}" data-link>${t().resume}</a>`
          : open ? `<a class="btn btn--sm" href="/t/${tr.id}" data-link>${t().start}</a>` : `<a class="btn btn--sm btn--ghost" href="/t/${tr.id}" data-link>${t().results}</a>`;
    } else {
      when = `${fmtDate(new Date(tr.startsAt).toISOString(), X.lang())}`;
      action = `<a class="btn btn--sm btn--ghost" href="/t/${tr.id}" data-link>${t().results}</a>`;
    }
    const place = tr.place ? `<span class="tcard__place">${t().place(tr.place, tr.of)} · <b class="num">${tr.score}</b></span>` : '';
    return `<article class="tcard tcard--${tr.status} ${mode === 'home' ? 'tcard--home' : ''}">
      <div class="tcard__main">
        <div class="tcard__kicker">${scopeOf(tr)}</div>
        <h3><a href="/t/${tr.id}" data-link>${esc(tourName(tr))}</a></h3>
        <p class="tcard__meta">${esc(topicOf(tr.topic))} · ${t().tasks(tr.n)} · ${tr.minutes} ${t().min}${tr.count ? ` · ${t().people(tr.count)}` : ''}</p>
        <p class="tcard__when">${when}</p>${place}
      </div>
      <div class="tcard__act">${action}</div>
    </article>`;
  }
  function bindReg(root, after) {
    root.querySelectorAll('[data-reg]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await X.api(`/api/tours/${b.dataset.reg}/register`, { method: 'POST' }); after(); } catch (x) { X.toast(errText(x)); b.disabled = false; }
    });
  }

  async function viewTours() {
    X.setTitle(t().toursTitle); loading();
    let d; try { d = await X.api('/api/tours'); } catch { return; }
    offset = d.now - Date.now();
    const live = d.tours.filter(x => x.status === 'live'), soon = d.tours.filter(x => x.status === 'soon'), past = d.past.filter(x => x.status === 'done');
    X.app.innerHTML = page(`
      <h1>${t().toursTitle}</h1><p class="page__lead">${t().toursLead}</p>
      ${live.length ? `<h2 class="me__h2">${t().live}</h2><div class="tlist">${live.map(x => tourCard(x)).join('')}</div>` : ''}
      <h2 class="me__h2">${t().soon}</h2>
      ${soon.length ? `<div class="tlist">${soon.map(x => tourCard(x)).join('')}</div>` : `<div class="empty">${t().none}<br><a class="btn" href="/games" data-link>${X.lang() === 'kk' ? 'Апта турниріне — Блиц' : 'Турнир недели — Блиц'}</a></div>`}
      <p class="muted tnote">${t().schedule}</p>
      <section class="trules"><h2>${t().rulesTitle}</h2><ul>${t().rules.map(r => `<li>${r}</li>`).join('')}</ul></section>
      ${past.length ? `<h2 class="me__h2">${t().past}</h2><div class="tlist">${past.map(x => tourCard({ ...x, me: 'finished' })).join('')}</div>` : ''}
    `);
    bindReg(X.app, viewTours);
    const iv = setInterval(() => { if (!document.querySelector('.tlist')) return clearInterval(iv); document.querySelectorAll('.tcard__in').length && viewToursSoft(d); }, 30000);
    X.onCleanup(() => clearInterval(iv));
  }
  function viewToursSoft() { if (location.pathname === '/tournaments') viewTours(); }

  // Блок на главной: ближайший турнир.
  async function homeBlock(el) {
    if (!el) return;
    try {
      const d = await X.api('/api/tours'); offset = d.now - Date.now();
      const next = d.tours.find(x => x.status === 'live' && x.me !== 'finished') || d.tours.find(x => x.status === 'soon');
      if (!next) { el.hidden = true; return; }
      el.innerHTML = `<div class="wrap"><div class="block__head"><h2>${t().homeNext}</h2><a href="/tournaments" data-link class="btn btn--ghost btn--sm">${t().homeAll}</a></div>${tourCard(next, 'home')}</div>`;
      el.hidden = false;
      bindReg(el, () => homeBlock(el));
    } catch { el.hidden = true; }
  }

  // ---------- турнир: страница, игра, результаты ----------
  async function viewTour(id) {
    loading();
    let d; try { d = await X.api(`/api/tours/${id}`); } catch (x) { X.app.innerHTML = page(`<h1>${errText(x)}</h1><p style="margin-top:20px"><a class="btn" href="/tournaments" data-link>${t().toursTitle}</a></p>`); return; }
    offset = d.now - Date.now();
    const tr = d.tour, me = d.me, n = now();
    X.setTitle(tourName(tr));
    if (tr.status === 'live' && me?.state === 'started') return play(tr);
    let main = '';
    if (tr.status === 'soon') {
      main = `<div class="tbig"><div class="tbig__clock num" id="tClock">${clock(tr.startsAt - n)}</div><p>${t().at(dayName(tr.startsAt), hm(tr.startsAt))} · ${t().joinUntil(hm(tr.joinUntil))}</p>
        ${me ? `<p class="tag tag--ok">${t().registered}</p>` : `<button class="btn" data-reg="${tr.id}">${t().register}</button>`}<p class="muted">${t().chooseLangNote}</p></div>`;
    } else if (tr.status === 'live' && !me?.state?.startsWith('fin') && n < tr.joinUntil) {
      main = `<div class="tbig"><p class="tbig__live"><span class="live-dot"></span>${t().live}</p><button class="btn btn--lg" id="tStart">${t().start}</button><p class="muted">${t().closesIn(inText(tr.joinUntil - n))}</p></div>`;
    }
    let mine = '';
    if (me?.state === 'finished') {
      const row = d.table?.myRow;
      mine = `<section class="tmine"><div><span class="tmine__k">${t().myResult}</span><b class="num">${me.score}</b><span class="muted">/ ${me.max}</span></div>
        ${row ? `<div class="tmine__place">${t().place(row.place, d.table.rows.length)}</div>` : ''}<div class="muted">${t().thTime}: ${dur(me.time)}</div></section>
        ${me.flag ? `<p class="eres__flag">${t().underReview(FLAG_WHY(X.lang(), me.flag))}</p>` : ''}`;
    }
    let table = '';
    if (d.table) {
      const rows = d.table.rows;
      table = `<h2 class="me__h2">${t().standings}</h2>${rows.length ? `<table class="table"><thead><tr><th>${t().thPlace}</th><th>${t().thName}</th><th class="r">${t().thScore}</th><th class="r hide-sm">${t().thTime}</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="${r.me ? 'is-me' : ''} ${r.place <= 3 ? 'top3' : ''}"><td class="pos">${r.place}</td><td><span class="who">${ava(r)}<span><a class="plink" href="/u/${esc(r.username)}" data-link>${esc(r.name)}</a><div class="sub">${esc(schoolName(r.school))}, ${esc(X.cityName(r.city))}</div></span></span></td>
        <td class="r num"><b>${r.score}</b> / ${r.max}</td><td class="r num hide-sm">${dur(r.time)}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">—</div>`}
        ${d.table.schools.length > 1 ? `<h2 class="me__h2">${t().schoolsTable}</h2><p class="muted" style="margin:-6px 0 12px">${t().schoolsNote}</p><table class="table"><thead><tr><th>#</th><th>${t().thSchool}</th><th class="r hide-sm">${t().thN}</th><th class="r">${t().thAvg}</th></tr></thead><tbody>
        ${d.table.schools.map(s => `<tr><td class="pos">${s.place}</td><td>${esc(schoolName(s.name))}<div class="sub">${esc(X.cityName(s.city))}</div></td><td class="r num hide-sm">${s.n}</td><td class="r num"><b>${s.avg}</b></td></tr>`).join('')}</tbody></table>` : ''}`;
    } else if (tr.status !== 'soon') table = `<p class="muted" style="margin-top:24px">${t().waitTable}</p>`;
    let review = '';
    if (d.review) {
      const lang = X.lang();
      review = `<h2 class="me__h2">${t().reviewTitle}</h2><ol class="treview">${d.review.map((q, i) => `<li class="${q.got === q.max ? 'ok' : 'bad'}"><div class="treview__n">${i + 1}${q.ms != null ? ` · ${clock(q.ms)}` : ''}</div>${qHtml(q, lang, q.mine, { key: q.a })}${q.e ? `<p class="qexp">${fmtTxt(X.pick(q.e))}</p>` : ''}</li>`).join('')}</ol>`;
    } else if (me?.state === 'finished' && tr.status !== 'done') review = `<p class="muted" style="margin-top:20px">${t().reviewLater(hm(tr.endsAt))}</p>`;
    X.app.innerHTML = page(`
      <p class="tcard__kicker">${scopeOf(tr)}</p>
      <h1>${esc(tourName(tr))}</h1>
      <p class="page__lead">${esc(topicOf(tr.topic))} · ${t().tasks(tr.n)} · ${tr.minutes} ${t().min} · ${t().people(tr.count || 0)}</p>
      ${main}${mine}
      ${tr.status !== 'done' && !me?.state?.startsWith('fin') ? `<section class="trules"><h2>${t().rulesTitle}</h2><ul>${t().rules.map(r => `<li>${r}</li>`).join('')}</ul></section>` : ''}
      ${table}${review}
      ${tr.createdBy ? `<p style="margin-top:28px"><button class="btn btn--ghost btn--sm" id="tDel">${t().delTour}</button></p>` : ''}
    `);
    bindReg(X.app, () => viewTour(id));
    const st = $('#tStart');
    if (st) st.onclick = async () => {
      const lang = await X.chooseLang(); if (!lang) return;
      st.disabled = true;
      try { await X.api(`/api/tours/${id}/start`, { method: 'POST', body: { lang } }); play(tr); } catch (x) { X.toast(errText(x)); st.disabled = false; }
    };
    const del = $('#tDel');
    if (del) del.onclick = async () => { if (await confirmDlg(t().delTourAsk)) { await X.api(`/api/tours/${id}`, { method: 'DELETE' }).catch(() => {}); X.go('/tournaments'); } };
    if (tr.status === 'soon') {
      const iv = setInterval(() => { const el = $('#tClock'); if (!el) return clearInterval(iv); const left = tr.startsAt - now(); if (left <= 0) { clearInterval(iv); viewTour(id); } else el.textContent = left > 3600e3 ? inText(left) : clock(left); }, 1000);
      X.onCleanup(() => clearInterval(iv));
    } else if (tr.status === 'live' && d.table) {
      const iv = setInterval(() => { if (location.pathname === `/t/${id}`) viewTour(id); }, 20000);
      X.onCleanup(() => clearInterval(iv));
    }
  }

  async function play(tr) {
    let st; try { st = await X.api(`/api/tours/${tr.id}/play`); } catch (x) { X.toast(errText(x)); return; }
    let value = null, busy = false, meta = { hidden: 0, hiddenMs: 0 }, hidAt = 0, tickT;
    document.body.classList.add('in-exam');
    const send = () => fetch(`/api/tours/${tr.id}/meta`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${X.token()}` }, body: JSON.stringify({ meta }) }).catch(() => {});
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hidAt = Date.now(); meta.hidden += 1; send(); }
      else if (hidAt) { meta.hiddenMs += Date.now() - hidAt; hidAt = 0; send(); }
    };
    const block = e => { if (e.target.closest('.tplay')) e.preventDefault(); };
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('copy', block); document.addEventListener('contextmenu', block);
    X.onCleanup(() => { document.body.classList.remove('in-exam'); clearInterval(tickT); document.removeEventListener('visibilitychange', onVis); document.removeEventListener('copy', block); document.removeEventListener('contextmenu', block); });

    const render = () => {
      if (st.done) return doneScreen();
      offset = st.now - Date.now();
      value = null;
      X.app.innerHTML = `<div class="tplay"><div class="exam__bar"><div class="wrap exam__bar-in">
          <div class="exam__combo">${esc(tourName(tr))}</div>
          <div class="exam__right"><span class="tplay__n num">${t().qOf(st.i + 1, st.n)}</span><span class="exam__timer num" id="tpTimer"></span><button class="btn btn--sm btn--light" id="tpEnd">${t().finishEarly}</button></div>
        </div><div class="tplay__prog"><i style="width:${Math.round(st.i / st.n * 100)}%"></i></div></div>
        <div class="wrap narrow"><div class="tplay__card">
          <div class="tplay__q" id="tpQ"></div>
          <div class="tplay__acts"><button class="btn btn--ghost" id="tpSkip">${t().skip}</button><button class="btn" id="tpAns" disabled>${t().answer}</button></div>
          <p class="tplay__warn">${t().warnTabs}</p>
        </div></div></div>`;
      const draw = () => { $('#tpQ').innerHTML = qHtml(st.q, st.lang, value); $('#tpAns').disabled = !hasAnswer(value); };
      draw();
      $('#tpQ').onclick = e => { const v = qClick(st.q, value, e); if (v !== undefined) { value = v; draw(); } };
      $('#tpAns').onclick = () => submit(value);
      $('#tpSkip').onclick = () => submit(null);
      $('#tpEnd').onclick = async () => { if (await confirmDlg(t().finishAsk, t().finishEarly)) submit(value, true); };
      tick();
    };
    const tick = () => {
      const el = $('#tpTimer'); if (!el) return;
      const left = st.deadline - now();
      el.textContent = clock(left); el.classList.toggle('is-low', left < 60000);
      if (left <= 0) { clearInterval(tickT); submit(value, true); }
    };
    clearInterval(tickT); tickT = setInterval(tick, 500);
    const submit = async (v, finish) => {
      if (busy) return; busy = true;
      try {
        if (hidAt) { meta.hiddenMs += Date.now() - hidAt; hidAt = 0; }
        st = await X.api(`/api/tours/${tr.id}/answer`, { method: 'POST', body: { i: st.i, choice: Number.isInteger(v) ? v : null, finish: !!finish, meta } });
        window.scrollTo(0, 0); render();
      } catch (x) { X.toast(errText(x)); } finally { busy = false; }
    };
    const onKey = e => {
      if (st.done || e.target.closest('input, textarea') || document.querySelector('dialog[open]')) return;
      const n = Number(e.key) - 1;
      if (n >= 0 && n < (X.pick(st.q?.o) || []).length && st.q.type !== 'p') { value = n; $('#tpQ').innerHTML = qHtml(st.q, st.lang, value); $('#tpAns').disabled = false; }
      if (e.key === 'Enter' && hasAnswer(value)) submit(value);
    };
    document.addEventListener('keydown', onKey); X.onCleanup(() => document.removeEventListener('keydown', onKey));
    const doneScreen = () => {
      clearInterval(tickT); document.body.classList.remove('in-exam');
      X.app.innerHTML = page(`<div class="tbig"><h1>${t().done}</h1><p class="page__lead">${t().doneLead}</p><a class="btn" href="/t/${tr.id}" data-link>${t().toTour}</a></div>`);
      setTimeout(() => { if (location.pathname === `/t/${tr.id}`) viewTour(tr.id); }, 1200);
    };
    render();
  }

  // ---------- работа над ошибками ----------
  async function viewPractice() {
    X.setTitle(t().prTitle); loading();
    const qs = new URLSearchParams(location.search);
    if (qs.get('s')) { history.replaceState({}, '', '/practice'); return session(qs.get('s'), qs.get('tp') || null); }
    let d; try { d = await X.api('/api/practice'); } catch { return; }
    const TT = X.lang() === 'kk'
      ? { h: 'Әлсіз тақырыптар', lead: 'Дұрыс жауабы 75%-дан аз тақырыптар. Тақырып бойынша 10 сұрақ.', acc: (p, n) => `${n} жауаптың ${p}%-ы дұрыс`, plan: 'Дайындық жоспары' }
      : { h: 'Слабые темы', lead: 'Темы, где меньше 75% верных ответов. По 10 вопросов на тему.', acc: (p, n) => `${p}% верных из ${n}`, plan: 'План подготовки' };
    const tline = w => `<li class="prow"><div class="prow__name"><b>${esc(X.pick(w.name))}</b><span class="muted">${esc(subj(w.s))} · ${TT.acc(w.pct, w.answered)}</span></div>
      <div class="acc__bar"><i style="width:${w.pct}%" class="${pctClass(w.pct)}"></i></div><button class="btn btn--sm" data-ts="${w.s}" data-tp="${w.k}">${t().prTrain}</button></li>`;
    const rows = d.subjects.filter(s => s.mistakes || s.pct != null).sort((a, b) => b.mistakes - a.mistakes || (a.pct ?? 101) - (b.pct ?? 101));
    const rest = d.subjects.filter(s => !s.mistakes && s.pct == null);
    const line = s => `<li class="prow"><div class="prow__name"><b>${esc(subj(s.k))}</b><span class="muted">${s.mistakes ? t().prMist(s.mistakes) : ''}${s.mistakes && s.pct != null ? ' · ' : ''}${s.pct != null ? t().prAcc(s.pct) : s.mistakes ? '' : t().prNoData}</span></div>
      ${s.pct != null ? `<div class="acc__bar"><i style="width:${s.pct}%" class="${pctClass(s.pct)}"></i></div>` : '<div></div>'}
      <button class="btn btn--sm ${s.mistakes ? '' : 'btn--ghost'}" data-s="${s.k}">${t().prTrain}</button></li>`;
    X.app.innerHTML = page(`
      <h1>${t().prTitle}</h1><p class="page__lead">${t().prLead}</p>
      <div class="pstats"><span>${t().prWait(d.total)}</span><span>${t().prFixed(d.fixed)}</span><span>${t().prToday(d.today)}</span></div>
      ${d.total ? `<button class="btn" data-s="">${t().prAll}</button>` : `<div class="empty">${t().prEmpty}<br><a class="btn" href="/ent" data-link>${X.L().navEnt}</a></div>`}
      ${d.weakTopics?.length ? `<section class="pplan"><h2>${TT.h}</h2><p class="muted">${TT.lead} <a href="/plan" data-link>${TT.plan} →</a></p><ul class="prlist">${d.weakTopics.map(tline).join('')}</ul></section>` : ''}
      ${d.weak.length ? `<section class="pplan"><h2>${t().prPlan}</h2><p class="muted">${t().prPlanLead}</p><ul class="prlist">${d.weak.map(k => line(d.subjects.find(s => s.k === k))).join('')}</ul></section>` : ''}
      <h2 class="me__h2">${t().prSubjects}</h2>
      <ul class="prlist">${rows.concat(rest).map(line).join('')}</ul>`);
    X.app.querySelectorAll('[data-s]').forEach(b => b.onclick = () => session(b.dataset.s || null));
    X.app.querySelectorAll('[data-ts]').forEach(b => b.onclick = () => session(b.dataset.ts, b.dataset.tp));
  }
  async function session(k, tp = null) {
    loading();
    let d; try { d = await X.api('/api/practice/start', { method: 'POST', body: { subject: k, topic: tp } }); } catch (x) { X.toast(errText(x)); return viewPractice(); }
    if (!d.items.length) return viewPractice();
    const lang = X.lang();
    let i = 0, value = null, res = null, right = 0;
    const draw = () => {
      const it = d.items[i];
      X.app.innerHTML = page(`
        <div class="ps__top"><a href="/practice" data-link class="ps__back">← ${t().prTitle}</a><span class="num muted">${i + 1} / ${d.items.length}</span></div>
        <div class="tplay__prog ps__prog"><i style="width:${Math.round(i / d.items.length * 100)}%"></i></div>
        <div class="tplay__card">
          <p class="ps__kicker">${esc(subj(it.k))} · ${it.mistake ? t().fromMist : t().fresh}</p>
          <div id="psQ">${qHtml(it.q, lang, value, res ? { key: res.a } : {})}</div>
          ${res ? `<div class="ps__res ${res.got === res.max ? 'ok' : res.got ? 'mid' : 'bad'}"><b>${res.got === res.max ? t().right : res.got ? t().partial : t().wrong}</b>${res.e ? `<p>${fmtTxt(X.pick(res.e))}</p>` : ''}${res.note ? `<div class="ps__note"><b>${esc(X.pick(res.note.topic))}</b><p>${fmtTxt(X.pick(res.note.text))}</p></div>` : ''}</div>` : ''}
          <div class="tplay__acts">${res ? `<button class="btn" id="psNext">${i + 1 < d.items.length ? t().next : t().finish}</button>` : `<button class="btn" id="psCheck" ${hasAnswer(value) ? '' : 'disabled'}>${t().check}</button>`}</div>
        </div>`);
      if (!res) $('#psQ').onclick = e => { const v = qClick(it.q, value, e); if (v !== undefined) { value = v; draw(); } };
      const c = $('#psCheck');
      if (c) c.onclick = async () => {
        c.disabled = true;
        try { res = await X.api('/api/practice/check', { method: 'POST', body: { id: it.id, ord: it.ord, answer: value } }); if (res.got === res.max) right++; draw(); }
        catch (x) { X.toast(errText(x)); c.disabled = false; }
      };
      const nx = $('#psNext');
      if (nx) { nx.onclick = () => { i++; value = null; res = null; if (i >= d.items.length) return done(); draw(); window.scrollTo(0, 0); }; nx.focus(); }
    };
    const done = async () => {
      X.api('/api/practice/done', { method: 'POST', body: { n: d.items.length, correct: right } }).catch(() => {});
      X.app.innerHTML = page(`<div class="tbig"><h1>${t().sDone}</h1><div class="tbig__clock num">${right} / ${d.items.length}</div><p class="page__lead">${t().sScore(right, d.items.length)}</p>
        <div class="tbig__btns"><button class="btn" id="psAgain">${t().sAgain}</button><a class="btn btn--ghost" href="/practice" data-link>${t().sList}</a></div></div>`);
      $('#psAgain').onclick = () => session(k, tp);
    };
    draw();
  }

  // ---------- кабинет учителя ----------
  async function viewTeacher() {
    X.setTitle(t().tTitle);
    const me = X.me();
    if (me.role !== 'teacher') {
      X.app.innerHTML = page(`<h1>${t().tTitle}</h1><p class="page__lead">${t().tLead}</p>
        <section class="tbecome"><h2>${t().becomeTitle}</h2><ul class="auth__points">${t().becomePts.map(x => `<li>${x}</li>`).join('')}</ul>
        <button class="btn" id="tBecome">${t().becomeBtn}</button><p class="muted">${t().becomeNote}</p></section>`);
      $('#tBecome').onclick = async () => {
        try { const r = await X.api('/api/me/role', { method: 'POST', body: { role: 'teacher' } }); X.setMe(r.user); viewTeacher(); } catch (x) { X.toast(errText(x)); }
      };
      return;
    }
    loading();
    let d; try { d = await X.api('/api/classes'); } catch { return; }
    X.app.innerHTML = page(`
      <h1>${t().tTitle}</h1><p class="page__lead">${esc(schoolName(me.school))}, ${esc(X.cityName(me.city))}</p>
      <form class="tnew" id="cNew"><label class="field"><span>${t().newClass}</span><input name="name" maxlength="24" placeholder="${t().classNamePh}" required></label><button class="btn">${t().create}</button></form>
      <p class="form-error" id="cErr" role="alert"></p>
      <h2 class="me__h2">${t().classes}</h2>
      ${d.classes.length ? `<div class="clist">${d.classes.map(c => `<a class="ccard" href="/teacher/${c.id}" data-link><b>${esc(c.name)}</b><span class="muted">${t().students(c.students)}</span><span class="ccard__code">${t().code}: <b class="num">${c.code}</b></span></a>`).join('')}</div>` : `<div class="empty">${t().noClasses}</div>`}
      <p style="margin-top:36px"><button class="btn btn--ghost btn--sm" id="tBack">${t().roleBack}</button></p>`, '');
    $('#cNew').onsubmit = async e => {
      e.preventDefault();
      try { const r = await X.api('/api/classes', { method: 'POST', body: { name: e.target.name.value } }); X.go(`/teacher/${r.class.id}`); } catch (x) { $('#cErr').textContent = errText(x); }
    };
    $('#tBack').onclick = async () => { try { const r = await X.api('/api/me/role', { method: 'POST', body: { role: 'student' } }); X.setMe(r.user); X.go('/me'); } catch (x) { X.toast(errText(x)); } };
  }

  let classTab = 'students';
  async function viewClassT(id) {
    loading();
    let d; try { d = await X.api(`/api/classes/${id}`); } catch (x) { X.app.innerHTML = page(`<h1>${errText(x)}</h1><p style="margin-top:20px"><a class="btn" href="/teacher" data-link>${t().tTitle}</a></p>`); return; }
    offset = d.now - Date.now();
    const c = d.class;
    X.setTitle(c.name);
    const link = `${location.origin}/join/${c.code}`;
    const flags = d.students.flatMap(s => s.flags.map(f => ({ ...f, s })));
    const goalPct = Math.min(100, Math.round(d.goal.done / Math.max(1, d.goal.target) * 100));
    const tabs = [['students', t().tabStudents], ['subjects', t().tabSubjects], ['tours', t().tabTours], ['check', t().tabCheck + (flags.length ? ` <span class="badge">${flags.length}</span>` : '')]];
    X.app.innerHTML = page(`
      <p class="ps__top"><a href="/teacher" data-link class="ps__back">← ${t().tTitle}</a></p>
      <div class="chead"><div><h1>${esc(c.name)}</h1><p class="page__lead">${esc(schoolName(c.school))}, ${esc(X.cityName(c.city))} · ${t().students(d.students.length)}</p></div>
        <div class="chead__code"><span>${t().code}</span><b class="num">${c.code}</b><button class="btn btn--ghost btn--sm" id="cLink">${t().copyLink}</button></div></div>
      <p class="muted">${t().inviteHint}</p>
      <section class="cgoal"><div class="cgoal__top"><span>${t().teamGoal}</span><button class="linkbtn" id="cGoal">${t().goalEdit}</button></div>
        <div class="goal__bar"><i style="width:${goalPct}%"></i></div><p class="goal__note">${t().teamGoalText(d.goal.done, d.goal.target)}</p></section>
      <div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button role="tab" data-ct="${k}" aria-selected="${k === classTab}">${n}</button>`).join('')}</div>
      <div id="cBody"></div>
      <div class="cfoot"><button class="btn btn--ghost btn--sm" id="cRename">${t().rename}</button><button class="btn btn--ghost btn--sm" id="cDel">${t().delClass}</button></div>`, '');
    $('#cLink').onclick = () => copy(link);
    $('#cGoal').onclick = async () => {
      const v = prompt(t().goalAsk, d.goal.target); if (v == null) return;
      try { await X.api(`/api/classes/${id}`, { method: 'PATCH', body: { goal: Number(v) } }); viewClassT(id); } catch (x) { X.toast(errText(x)); }
    };
    $('#cRename').onclick = async () => {
      const v = prompt(t().className, c.name); if (!v) return;
      try { await X.api(`/api/classes/${id}`, { method: 'PATCH', body: { name: v } }); viewClassT(id); } catch (x) { X.toast(errText(x)); }
    };
    $('#cDel').onclick = async () => { if (await confirmDlg(t().delClassAsk)) { await X.api(`/api/classes/${id}`, { method: 'DELETE' }).catch(() => {}); X.go('/teacher'); } };
    X.app.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { classTab = b.dataset.ct; X.app.querySelectorAll('[data-ct]').forEach(x => x.setAttribute('aria-selected', x === b)); body(); });
    let sortKey = 'name', sortDir = 1;
    const body = () => {
      const el = $('#cBody');
      if (classTab === 'students') {
        if (!d.students.length) { el.innerHTML = `<div class="empty">${t().noStudents}<br><button class="btn" id="cLink2">${t().copyLink}</button></div>`; $('#cLink2').onclick = () => copy(link); return; }
        const cols = [['name', t().thStudent], ['mocks', t().thMocks], ['best', t().thBest], ['last', t().thLast], ['progress', t().thProg], ['weak', t().thWeak], ['activity', t().thAct], ['lastAt', t().thSeen]];
        const val = (s, k) => (k === 'weak' ? s.weak?.pct ?? 999 : k === 'name' ? s.name.toLowerCase() : s[k] ?? -1e9);
        const list = d.students.slice().sort((a, b) => (val(a, sortKey) > val(b, sortKey) ? 1 : val(a, sortKey) < val(b, sortKey) ? -1 : 0) * sortDir);
        el.innerHTML = `<div class="tscroll"><table class="table ctable"><thead><tr>${cols.map(([k, n]) => `<th class="${k === 'name' ? '' : 'r'}"><button class="sortbtn" data-k="${k}" aria-sort="${sortKey === k ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'}">${n}</button></th>`).join('')}<th></th></tr></thead><tbody>
          ${list.map(s => `<tr><td><span class="who">${ava(s)}<span><a class="plink" href="/u/${esc(s.username)}" data-link>${esc(s.name)}</a>${s.flags.length ? ` <span class="badge badge--warn" title="${t().tabCheck}">!</span>` : ''}<div class="sub">@${esc(s.username)}</div></span></span></td>
            <td class="r num">${s.mocks}</td><td class="r num"><b>${s.best ?? '—'}</b></td><td class="r num">${s.last ?? '—'}</td>
            <td class="r num ${s.progress > 0 ? 'pos-d' : s.progress < 0 ? 'neg-d' : ''}">${s.progress == null ? '—' : (s.progress > 0 ? '+' : '') + s.progress}</td>
            <td class="r">${s.weak ? `${esc(subj(s.weak.k))} <span class="muted num">${s.weak.pct}%</span>` : '—'}</td>
            <td class="r num">${s.activity}</td><td class="r muted">${s.lastAt ? fmtDate(s.lastAt, X.lang()) : '—'}</td>
            <td class="r"><button class="linkbtn" data-rm="${s.id}" data-nm="${esc(s.name)}">${t().remove}</button></td></tr>`).join('')}</tbody></table></div>
          <p class="muted tnote">${t().actNote}</p><p style="margin-top:14px"><button class="btn btn--ghost btn--sm" id="cCsv">${t().csv}</button></p>`;
        el.querySelectorAll('.sortbtn').forEach(b => b.onclick = () => { if (sortKey === b.dataset.k) sortDir = -sortDir; else { sortKey = b.dataset.k; sortDir = b.dataset.k === 'name' || b.dataset.k === 'weak' ? 1 : -1; } body(); });
        el.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { if (await confirmDlg(t().removeAsk(b.dataset.nm), t().remove)) { await X.api(`/api/classes/${id}/members/${b.dataset.rm}`, { method: 'DELETE' }).catch(() => {}); viewClassT(id); } });
        $('#cCsv').onclick = () => {
          const head = [t().thStudent, 'login', t().thMocks, t().thBest, t().thLast, t().thProg, t().thWeak, t().thAct, t().thSeen];
          const rows = d.students.map(s => [s.name, s.username, s.mocks, s.best ?? '', s.last ?? '', s.progress ?? '', s.weak ? `${subj(s.weak.k)} ${s.weak.pct}%` : '', s.activity, s.lastAt ? s.lastAt.slice(0, 10) : '']);
          const csv = '﻿' + [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${c.name.replace(/[^\p{L}\p{N}]+/gu, '_')}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        };
      } else if (classTab === 'subjects') {
        el.innerHTML = d.subjects.length ? `<p class="muted" style="margin-bottom:14px">${t().subjLead}</p><ul class="acc">${d.subjects.map(s => `<li><div class="acc__top"><span>${esc(subj(s.k))}</span><span class="num"><b>${s.pct}%</b> <span class="muted">· ${t().students(s.n)}</span></span></div><div class="acc__bar"><i style="width:${s.pct}%" class="${pctClass(s.pct)}"></i></div></li>`).join('')}</ul>` : `<div class="empty">${t().noSubj}</div>`;
      } else if (classTab === 'tours') {
        const topics = ['mandatory', ...Object.keys(X.meta().subjects)];
        const local = new Date(Date.now() + 3600e3 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        el.innerHTML = `<form class="tform" id="tNew">
            <h3>${t().newTour}</h3>
            <label class="field"><span>${t().fTitle}</span><input name="title" maxlength="60" placeholder="${t().fTitlePh}"></label>
            <div class="tform__row">
              <label class="field"><span>${t().fTopic}</span><select name="topic">${topics.map(k => `<option value="${k}">${esc(topicOf(k))}</option>`).join('')}</select></label>
              <label class="field"><span>${t().fN}</span><select name="n">${[10, 15, 20, 30].map(n => `<option ${n === 20 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
              <label class="field"><span>${t().fMin}</span><input name="minutes" type="number" min="5" max="90" value="25"></label>
            </div>
            <div class="tform__row">
              <label class="field"><span>${t().fStart}</span><select name="when"><option value="now">${t().fStartNow}</option><option value="at">${t().fStartAt}</option></select></label>
              <label class="field" id="tAt" hidden><span>&nbsp;</span><input name="at" type="datetime-local" value="${local}"></label>
              <label class="field"><span>${t().fJoin}</span><input name="join" type="number" min="2" max="30" value="10"></label>
              <label class="field"><span>${t().fScope}</span><select name="scope"><option value="class">${t().scopeClass}</option><option value="school">${t().scopeSchool}</option></select></label>
            </div>
            <p class="form-error" id="tErr" role="alert"></p>
            <button class="btn">${t().createTour}</button>
          </form>
          <h2 class="me__h2">${t().tabTours}</h2>
          ${d.tours.length ? `<div class="tlist">${d.tours.map(x => tourCard({ ...x, me: null })).join('')}</div>` : `<div class="empty">${t().noTours}</div>`}`;
        const f = $('#tNew');
        f.when.onchange = () => { $('#tAt').hidden = f.when.value !== 'at'; };
        f.onsubmit = async e => {
          e.preventDefault();
          const body = { classId: id, title: f.title.value, topic: f.topic.value, n: Number(f.n.value), minutes: Number(f.minutes.value), joinMinutes: Number(f.join.value), scope: f.scope.value, startsAt: f.when.value === 'now' ? 'now' : new Date(f.at.value).toISOString() };
          try { const r = await X.api('/api/tours', { method: 'POST', body }); X.go(`/t/${r.tour.id}`); } catch (x) { $('#tErr').textContent = errText(x); }
        };
      } else {
        el.innerHTML = `<p class="muted" style="margin-bottom:14px">${t().flagsLead}</p>${flags.length ? `<table class="table"><tbody>${flags.map(f => `<tr>
          <td><span class="who">${ava(f.s)}<span><b>${esc(f.s.name)}</b><div class="sub">${f.kind === 'mock' ? t().mockShort : t().tourShort} · ${fmtDate(f.at, X.lang())} · ${f.score}${f.max ? ' / ' + f.max : ''}</div></span></span></td>
          <td class="hide-sm"><div>${esc(FLAG_WHY(X.lang(), f.flag))}</div><div class="sub">${[f.meta?.hidden ? t().leftInfo(f.meta.hidden, Math.round((f.meta.hiddenMs || 0) / 60000)) : '', f.meta?.fast ? t().fastInfo(f.meta.fast) : ''].filter(Boolean).join(' · ')}</div></td>
          <td class="r"><button class="btn btn--sm btn--ghost" data-ok='${JSON.stringify({ kind: f.kind, id: f.id, pid: f.s.id })}'>${t().approve}</button></td></tr>`).join('')}</tbody></table>` : `<div class="empty">${t().noFlags}</div>`}`;
        el.querySelectorAll('[data-ok]').forEach(b => b.onclick = async () => { b.disabled = true; try { await X.api(`/api/classes/${id}/clear`, { method: 'POST', body: JSON.parse(b.dataset.ok) }); viewClassT(id); } catch (x) { X.toast(errText(x)); b.disabled = false; } });
      }
    };
    body();
  }

  // ---------- класс ученика ----------
  async function classBody() {
    const me = X.me();
    if (me.role === 'teacher') return `<div class="empty">${t().teacherMode}<br><a class="btn" href="/teacher" data-link>${t().toCabinet}</a></div>`;
    let d; try { d = await X.api('/api/class'); } catch { return ''; }
    if (d.now) offset = d.now - Date.now();
    if (!d.class) return `<section class="cjoin"><h2>${t().joinTitle}</h2><p class="muted">${t().joinLead}</p>
      <form id="jForm" class="tnew"><label class="field"><span>${t().code}</span><input name="code" maxlength="6" autocapitalize="characters" spellcheck="false" placeholder="${t().joinPh}" required></label><button class="btn">${t().joinBtn}</button></form>
      <p class="form-error" id="jErr" role="alert"></p></section>
      <p style="margin-top:28px" class="muted">${t().becomeTitle}: <a href="/teacher" data-link>${t().tTitle}</a></p>`;
    const c = d.class, pct = Math.min(100, Math.round(d.goal.done / Math.max(1, d.goal.target) * 100));
    return `<section class="cmine"><div class="cmine__top"><div><h2>${esc(c.name)}</h2><p class="muted">${esc(schoolName(c.school))}, ${esc(X.cityName(c.city))} · ${t().teacherLbl}: ${esc(c.teacher)}</p></div><span class="tag">${t().code} ${c.code}</span></div>
      <div class="cgoal"><div class="cgoal__top"><span>${t().teamGoal}</span></div><div class="goal__bar"><i style="width:${pct}%"></i></div><p class="goal__note">${t().teamGoalText(d.goal.done, d.goal.target)}</p></div></section>
      ${d.tours.length ? `<h2 class="me__h2">${t().classTours}</h2><div class="tlist">${d.tours.map(x => tourCard(x)).join('')}</div>` : ''}
      <h2 class="me__h2">${t().mates}</h2><p class="muted" style="margin:-6px 0 12px">${t().matesNote}</p>
      <table class="table"><thead><tr><th>#</th><th>${t().thStudent}</th><th class="r">${t().thBest}</th><th class="r hide-sm">${t().thProg}</th><th class="r">${t().thAct}</th></tr></thead><tbody>
      ${d.mates.map((m, i) => `<tr class="${m.me ? 'is-me' : ''}"><td class="pos">${i + 1}</td><td><span class="who">${ava(m)}<a class="plink" href="/u/${esc(m.username)}" data-link>${esc(m.name)}</a></span></td><td class="r num">${m.best ?? '—'}</td><td class="r num hide-sm">${m.progress == null ? '—' : (m.progress > 0 ? '+' : '') + m.progress}</td><td class="r num">${m.activity}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:24px"><button class="btn btn--ghost btn--sm" id="cLeave">${t().leave}</button></p>`;
  }
  function bindClass(rerender) {
    const f = $('#jForm');
    if (f) f.onsubmit = async e => {
      e.preventDefault();
      try { const r = await X.api('/api/class/join', { method: 'POST', body: { code: f.code.value } }); X.setMe(r.user); rerender(); } catch (x) { $('#jErr').textContent = errText(x); }
    };
    const l = $('#cLeave');
    if (l) l.onclick = async () => { if (await confirmDlg(t().leaveAsk, t().leave)) { const r = await X.api('/api/class/leave', { method: 'POST' }).catch(() => null); if (r) X.setMe(r.user); rerender(); } };
    bindReg(X.app, rerender);
  }
  async function viewJoin(code) {
    X.setTitle(t().joinPage); loading();
    let d; try { d = await X.api(`/api/class/lookup/${encodeURIComponent(code)}`); } catch (x) { X.app.innerHTML = page(`<h1>${errText(x)}</h1><p style="margin-top:20px"><a class="btn" href="/me/class" data-link>${t().cTitle}</a></p>`); return; }
    const c = d.class, me = X.me();
    X.app.innerHTML = page(`<div class="tbig"><p class="muted">${t().joinAsk}</p><h1>${esc(c.name)}</h1><p class="page__lead">${esc(schoolName(c.school))}, ${esc(X.cityName(c.city))}<br>${t().teacherLbl}: ${esc(c.teacher)}</p>
      ${me.role === 'teacher' ? `<p class="form-error">${t().err.teacherJoin}</p>` : `<button class="btn btn--lg" id="jYes">${t().joinBtn}</button>`}<p class="form-error" id="jErr"></p></div>`);
    const y = $('#jYes');
    if (y) y.onclick = async () => { try { const r = await X.api('/api/class/join', { method: 'POST', body: { code } }); X.setMe(r.user); X.toast(t().joined); X.go('/me/class'); } catch (x) { $('#jErr').textContent = errText(x); } };
  }

  // ---------- достижения ----------
  // Ступень значка внутри группы: первое — бронза, второе — серебро, третье и дальше — золото.
  const tierOf = (list, a) => Math.min(3, list.filter(x => x.group === a.group).sort((x, y) => x.target - y.target).indexOf(a) + 1);
  const medal = a => `<span class="bdg__ico bdg__ico--${a.group} tier${a.tier || 1} medal">${glyph(a.group)}</span>`;
  // Новое достижение — показываем награду один раз (на этом устройстве).
  async function checkAwards() {
    let d; try { d = await X.api('/api/me/achievements'); } catch { return; }
    const key = 'ba_ach_' + (X.me()?.username || ''), done = d.list.filter(a => a.done);
    let seen = null; try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    try { localStorage.setItem(key, JSON.stringify(done.map(a => a.key))); } catch {}
    if (!seen) return;
    const fresh = done.find(a => !seen.includes(a.key));
    if (fresh) { const [n] = t().ach[fresh.key] || [fresh.key]; FX.award(medal({ ...fresh, tier: tierOf(d.list, fresh) }), `${t().achNew}: ${n}`); }
  }
  async function achBody() {
    let d; try { d = await X.api('/api/me/achievements'); } catch { return ''; }
    const done = d.list.filter(a => a.done).length;
    return `<section class="streak"><div class="streak__ico">${glyph('streak')}</div><div><span class="streak__k">${t().streak}</span><b>${t().streakDays(d.streak)}</b><p class="muted">${t().bestStreak(d.bestStreak)} · ${t().activeDays(d.days)}</p></div><p class="muted streak__hint">${t().streakHint}</p></section>
      <div class="goal__head"><h2>${t().achTitle}</h2><span class="muted">${t().achCount(done, d.list.length)}</span></div>
      <ul class="badges">${d.list.sort((a, b) => b.done - a.done).map(a => { const [n, desc] = t().ach[a.key] || [a.key, '']; return `<li class="bdg ${a.done ? 'is-done' : ''}">
        <span class="bdg__ico bdg__ico--${a.group} tier${tierOf(d.list, a)}">${glyph(a.group)}</span><div><b>${esc(n)}</b><p>${esc(desc)}</p>
        ${a.done ? '' : `<div class="bdg__bar"><i style="width:${Math.round(a.cur / a.target * 100)}%"></i></div><small class="num">${a.cur} / ${a.target}</small>`}</div></li>`; }).join('')}</ul>`;
  }

  // ---------- рейтинги ----------
  const rs = { scope: 'schools', kind: 'results', season: null, league: 'all', city: false };
  async function viewRatings() {
    X.setTitle(t().rTitle);
    X.app.innerHTML = page(`<h1>${t().rTitle}</h1><p class="page__lead">${t().rLead}</p><div id="rBox" style="margin-top:24px">${SKEL()}</div>`);
    let data, battle;
    const load = async () => {
      try { data = await fetch(`/api/ratings?season=${rs.season || ''}`).then(r => r.json()); rs.season ||= data.season; } catch { $('#rBox').innerHTML = `<div class="empty">${X.L().loadFail}</div>`; return; }
      draw();
    };
    const seasonName = s => (s === 'all' ? t().allTime : `${t().months[+s.slice(5) - 1]} ${s.slice(0, 4)}`);
    const draw = async () => {
      const box = $('#rBox'); if (!box) return;
      if (rs.kind === 'battle' && !battle) { try { battle = await fetch('/api/leaders').then(r => r.json()); } catch { battle = { players: [], schools: [] }; } }
      const me = X.me();
      const scopes = [['schools', t().rSchools], ['students', t().rStudents]];
      const kinds = [['results', t().kResults], ['progress', t().kProgress], ['activity', t().kActivity], ['battle', t().kBattle]];
      let rows = rs.kind === 'battle' ? (rs.scope === 'schools' ? battle.schools : battle.players) : data[rs.scope][rs.kind];
      if (rs.league !== 'all' && rs.kind !== 'battle') rows = rows.filter(r => r.league === rs.league);
      if (rs.city) rows = rows.filter(r => r.city === me.city);
      const val = r => (rs.kind === 'results' ? (rs.scope === 'schools' ? r.results : r.best) : rs.kind === 'progress' ? r.progress : rs.kind === 'activity' ? r.activity : r.rating);
      const colName = { results: t().thScore, progress: t().thRise, activity: t().thPts, battle: t().thRating }[rs.kind];
      const nOf = r => (rs.kind === 'battle' ? (rs.scope === 'schools' ? r.players : X.L().winsOf(r.wins, r.games)) : rs.scope === 'schools' ? (rs.kind === 'results' ? r.resultsN : rs.kind === 'progress' ? r.progressN : r.activeN) : rs.kind === 'results' ? r.mocks : '');
      const fmtV = v => (rs.kind === 'progress' ? `${v > 0 ? '+' : ''}${v}` : v);
      const mine = r => (rs.scope === 'schools' ? r.name === me.school && r.city === me.city : r.username === me.username);
      box.innerHTML = `
        <div class="tabs" role="tablist">${scopes.map(([k, n]) => `<button role="tab" data-sc="${k}" aria-selected="${k === rs.scope}">${n}</button>`).join('')}</div>
        <div class="rkinds" role="tablist">${kinds.map(([k, n]) => `<button role="tab" data-k="${k}" aria-selected="${k === rs.kind}">${n}</button>`).join('')}</div>
        <p class="rexpl">${t().expl[rs.scope][rs.kind]}</p>
        <div class="rfilters">
          ${rs.kind !== 'battle' ? `<label class="rsel"><span>${t().season}</span><select id="rSeason">${[...data.seasons, 'all'].map(s => `<option value="${s}" ${s === rs.season ? 'selected' : ''}>${seasonName(s)}</option>`).join('')}</select></label>
          <div class="chips">${['all', 'high', 'first', 'second'].map(l => `<button class="chipbtn" data-lg="${l}" aria-pressed="${rs.league === l}">${l === 'all' ? t().leagueAll : t().leagues[l]}</button>`).join('')}</div>` : ''}
          <label class="check rcity"><input type="checkbox" id="rCity" ${rs.city ? 'checked' : ''}> <span>${t().myCity}</span></label>
        </div>
        ${rows.length ? `<table class="table rtable"><thead><tr><th></th><th>${rs.scope === 'schools' ? t().thSchool : t().thStudent}</th>${rs.kind !== 'battle' && rs.scope === 'schools' ? `<th class="hide-sm">${t().thLeague}</th>` : ''}<th class="r hide-sm">${rs.scope === 'schools' ? t().thStud : rs.kind === 'battle' ? t().thWins : rs.kind === 'results' ? t().thMocks : ''}</th><th class="r">${colName}</th></tr></thead><tbody>
          ${rows.map((r, i) => `<tr class="${i < 3 ? 'top3' : ''} ${mine(r) ? 'is-me' : ''}"><td class="pos">${i + 1}</td>
            <td>${rs.scope === 'schools' ? `${esc(schoolName(r.name))}${r.verified ? ` <span class="vmark" title="${t().verified}" aria-label="${t().verified}">${glyph('fix')}</span>` : ''}<div class="sub">${esc(X.cityName(r.city || ''))}</div>`
              : `<span class="who">${r.username ? ava(r) : ''}<span>${r.username ? `<a class="plink" href="/u/${esc(r.username)}" data-link>${esc(r.name)}</a>` : esc(r.name)}<div class="sub">${esc(schoolName(r.school))}${r.city ? ', ' + esc(X.cityName(r.city)) : ''}</div></span></span>`}</td>
            ${rs.kind !== 'battle' && rs.scope === 'schools' ? `<td class="hide-sm"><span class="lg lg--${r.league}">${t().leagues[r.league].split(' ')[0]}</span></td>` : ''}
            <td class="r num hide-sm">${nOf(r)}</td><td class="r num"><b>${fmtV(val(r))}</b></td></tr>`).join('')}</tbody></table>`
          : `<div class="empty">${t().rEmpty}<br><a class="btn" href="/ent" data-link>${t().rEmptyCta}</a></div>`}
        ${rs.kind !== 'battle' && rs.scope === 'schools' ? `<p class="muted tnote">${t().leagueNote}</p>` : ''}`;
      box.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { rs.scope = b.dataset.sc; draw(); });
      box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { rs.kind = b.dataset.k; draw(); });
      box.querySelectorAll('[data-lg]').forEach(b => b.onclick = () => { rs.league = b.dataset.lg; draw(); });
      const s = $('#rSeason'); if (s) s.onchange = () => { rs.season = s.value; load(); };
      $('#rCity').onchange = e => { rs.city = e.target.checked; draw(); };
    };
    load();
  }

  return {
    checkAwards: ctx => { X = ctx; return checkAwards(); },
    homeBlock: (ctx, el) => { X = ctx; return homeBlock(el); },
    // Вкладки профиля: «Класс» и «Достижения» (оболочку даёт ACC).
    async tab(ctx, which, shell) {
      X = ctx;
      const body = which === 'class' ? await classBody() : await achBody();
      X.app.innerHTML = shell(body);
      if (which === 'class') bindClass(() => EDU.tab(ctx, which, shell));
    },
    view(ctx, path) {
      X = ctx;
      let m;
      if (path === '/tournaments') return viewTours();
      if ((m = path.match(/^\/t\/([\w-]{3,64})$/))) return viewTour(m[1]);
      if (path === '/practice') return viewPractice();
      if (path === '/teacher') return viewTeacher();
      if ((m = path.match(/^\/teacher\/([\w-]{8,64})$/))) return viewClassT(m[1]);
      if ((m = path.match(/^\/join\/([A-Z0-9]{6})$/i))) return viewJoin(m[1].toUpperCase());
      if (path === '/rating') return viewRatings();
      return viewTours();
    }
  };
})();
