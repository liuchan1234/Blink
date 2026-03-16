export const QUIZ_QUESTIONS = [
  { en: "I can tell something's off with my partner before they say a word.", ru: "Я чувствую, что с партнёром что-то не так, ещё до того, как он скажет слово.", zh: "伴侣还没开口，我就能察觉出不对劲。" },
  { en: "After a long day with people I love, I still need an hour alone.", ru: "После долгого дня с близкими мне всё равно нужен час наедине.", zh: "和爱的人待了一整天后，我仍需要独处一小时。" },
  { en: "When I'm upset, I go quiet — I need to process it myself first.", ru: "Когда расстроена, я замолкаю — мне нужно сначала самой разобраться.", zh: "难过时我会沉默，需要先自己消化。" },
  { en: "Even when things are going well, I catch myself waiting for something to go wrong.", ru: "Даже когда всё хорошо, я ловлю себя на ожидании, что что-то пойдёт не так.", zh: "即使一切顺利，我也会不自觉地担心出问题。" },
  { en: "I trust patterns more than words. Actions over time mean everything to me.", ru: "Я доверяю паттернам больше, чем словам. Поступки со временем для меня важнее всего.", zh: "比起言语，我更相信行为模式。长期的行动对我最重要。" },
  { en: "I feel closest to someone when I don't have to explain myself.", ru: "Я чувствую себя ближе всего к человеку, когда мне не нужно объясняться.", zh: "当我不必解释自己时，才感到和对方最亲近。" },
  { en: "I'd rather figure things out alone than ask someone to carry it with me.", ru: "Я предпочитаю разбираться сама, чем просить кого-то разделить это со мной.", zh: "我宁愿自己消化，也不想让别人分担。" },
  { en: "I have a clear sense of what kind of love I want — and what I won't accept.", ru: "У меня чёткое понимание, какую любовь я хочу — и чего не приму.", zh: "我清楚自己想要什么样的爱，以及什么是我不能接受的。" },
  { en: "Small, consistent things move me more than big gestures.", ru: "Мелкие, но постоянные вещи трогают меня больше, чем громкие жесты.", zh: "细小而持续的举动比大场面更打动我。" },
  { en: "When they go quiet, my brain immediately starts writing stories.", ru: "Когда они замолкают, мой мозг сразу начинает сочинять истории.", zh: "对方一沉默，我的大脑就开始编故事。" },
];

export const GENDER_OPTIONS = [
  { value: "male", label: { en: "Male", ru: "Мужчина", zh: "男" } },
  { value: "female", label: { en: "Female", ru: "Женщина", zh: "女" } },
  { value: "other", label: { en: "Other", ru: "Другое", zh: "其他" } },
];

export const ZODIAC_OPTIONS = [
  { value: "aries", symbol: "♈", label: { en: "Aries", ru: "Овен", zh: "白羊座" } },
  { value: "taurus", symbol: "♉", label: { en: "Taurus", ru: "Телец", zh: "金牛座" } },
  { value: "gemini", symbol: "♊", label: { en: "Gemini", ru: "Близнецы", zh: "双子座" } },
  { value: "cancer", symbol: "♋", label: { en: "Cancer", ru: "Рак", zh: "巨蟹座" } },
  { value: "leo", symbol: "♌", label: { en: "Leo", ru: "Лев", zh: "狮子座" } },
  { value: "virgo", symbol: "♍", label: { en: "Virgo", ru: "Дева", zh: "处女座" } },
  { value: "libra", symbol: "♎", label: { en: "Libra", ru: "Весы", zh: "天秤座" } },
  { value: "scorpio", symbol: "♏", label: { en: "Scorpio", ru: "Скорпион", zh: "天蝎座" } },
  { value: "sagittarius", symbol: "♐", label: { en: "Sagittarius", ru: "Стрелец", zh: "射手座" } },
  { value: "capricorn", symbol: "♑", label: { en: "Capricorn", ru: "Козерог", zh: "摩羯座" } },
  { value: "aquarius", symbol: "♒", label: { en: "Aquarius", ru: "Водолей", zh: "水瓶座" } },
  { value: "pisces", symbol: "♓", label: { en: "Pisces", ru: "Рыбы", zh: "双鱼座" } },
];

export const REL_HISTORY_OPTIONS = [
  { value: 0, shortLabel: "0", label: { en: "None", ru: "Нет", zh: "无" } },
  { value: 1, shortLabel: "1-2", label: { en: "1-2", ru: "1-2", zh: "1-2" } },
  { value: 2, shortLabel: "3-5", label: { en: "3-5", ru: "3-5", zh: "3-5" } },
  { value: 3, shortLabel: "6+", label: { en: "6+", ru: "6+", zh: "6+" } },
];

export const EMOTION_OPTIONS = [
  {
    value: "joy",
    status: "single",
    accent: "purple",
    emoji: "🔮",
    title: { en: "Open & Ready", ru: "Открыта новому", zh: "开放且期待" },
    subtitle: { en: "Excited for something new", ru: "Готова к новому", zh: "对新事物充满期待" },
  },
  {
    value: "anxiety",
    status: "relationship",
    accent: "pink",
    emoji: "💘",
    title: { en: "Deeply in Love", ru: "Глубоко влюблена", zh: "深陷爱中" },
    subtitle: { en: "Head and heart both in", ru: "И сердце, и разум внутри", zh: "身心都在其中" },
  },
  {
    value: "melancholy",
    status: "complicated",
    accent: "blue",
    emoji: "🌫️",
    title: { en: "It's Complicated", ru: "Все сложно", zh: "一言难尽" },
    subtitle: { en: "Push and pull energy", ru: "Энергия притяжения и дистанции", zh: "拉扯与拉扯" },
  },
  {
    value: "numbness",
    status: "casual",
    accent: "teal",
    emoji: "🌧️",
    title: { en: "Healing Mode", ru: "Режим восстановления", zh: "疗愈期" },
    subtitle: { en: "Taking time for myself", ru: "Беру время для себя", zh: "给自己时间" },
  },
];

export const QUIZ_SCALE = [
  { value: 5, label: { en: "Strongly agree", ru: "Полностью согласна", zh: "非常同意" } },
  { value: 4, label: { en: "Agree", ru: "Согласна", zh: "同意" } },
  { value: 3, label: { en: "Neutral", ru: "Нейтрально", zh: "中立" } },
  { value: 2, label: { en: "Disagree", ru: "Не согласна", zh: "不同意" } },
  { value: 1, label: { en: "Strongly disagree", ru: "Совсем не согласна", zh: "非常不同意" } },
];

export const GENERATING_PHASES = [
  { en: "Tracing your emotional memory…", ru: "Сканируем эмоциональную память…", zh: "追溯你的情感记忆…" },
  { en: "Finding your attachment signature…", ru: "Ищем сигнатуру привязанности…", zh: "寻找你的依恋特征…" },
  { en: "Matching your energy…", ru: "Сопоставляем вашу энергию…", zh: "匹配你的能量…" },
  { en: "Writing your story…", ru: "Собираем вашу историю…", zh: "书写你的故事…" },
];

export const COMPAT_GENERATING_PHASES = [
  { en: "Reading emotional patterns…", ru: "Считываем эмоциональные паттерны…", zh: "读取情感模式…" },
  { en: "Analyzing attachment styles…", ru: "Анализируем стили привязанности…", zh: "分析依恋风格…" },
  { en: "Modeling love dynamics…", ru: "Моделируем динамику отношений…", zh: "建模爱情动态…" },
  { en: "Generating your reading…", ru: "Генерируем ваш разбор…", zh: "生成你的解读…" },
];

export const BIRTH_YEAR_OPTIONS = Array.from({ length: 31 }, (_, index) => 2015 - index);
