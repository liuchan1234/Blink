import { pick, randInt } from "./utils.js";

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP"
];

const POETIC_NAMES = {
  INTJ: "The Quiet Architect",
  INTP: "The Thought Echo",
  ENTJ: "The Horizon Captain",
  ENTP: "The Spark Tactician",
  INFJ: "The Moonbound Oracle",
  INFP: "The Grounded Rose",
  ENFJ: "The Warm Compass",
  ENFP: "The Wild Lantern",
  ISTJ: "The Steady Atlas",
  ISFJ: "The Gentle Harbor",
  ESTJ: "The Stone Standard",
  ESFJ: "The Golden Host",
  ISTP: "The Silent Current",
  ISFP: "The Velvet Pulse",
  ESTP: "The Bright Instinct",
  ESFP: "The Festival Heart"
};

const ARCHETYPES = [
  "Navigator", "Alchemist", "Guardian", "Visionary",
  "Storykeeper", "Catalyst", "Composer", "Sentinel"
];

const ATTACHMENTS = ["anxious", "secure", "avoidant"];

const MONOLOGUES = {
  anxious: [
    "Heart first. Logic catches up later.",
    "Reads every silence like a weather map.",
    "Soft voice, full volume feelings."
  ],
  secure: [
    "Steady signal. Calm in chaos.",
    "Clear words, open hands, real presence.",
    "You feel safe before you realize why."
  ],
  avoidant: [
    "Needs space to stay honest.",
    "Slow to open, deep once trusted.",
    "Protects peace like sacred ground."
  ]
};

const SOUL_MATCH = {
  INTJ: ["ENFP", "The Muse Fire"],
  INTP: ["ENTJ", "The Momentum Maker"],
  ENTJ: ["INFP", "The Warm Lens"],
  ENTP: ["INFJ", "The Quiet Gravity"],
  INFJ: ["ENTP", "The Playful Mind"],
  INFP: ["ENFJ", "The Protagonist"],
  ENFJ: ["INFP", "The Dream Listener"],
  ENFP: ["INTJ", "The North Star"],
  ISTJ: ["ESFP", "The Heartbeat"],
  ISFJ: ["ESTP", "The Pulse Driver"],
  ESTJ: ["ISFP", "The Soft Wild"],
  ESFJ: ["ISTP", "The Calm Blade"],
  ISTP: ["ESFJ", "The Social Sun"],
  ISFP: ["ESTJ", "The Steel Bloom"],
  ESTP: ["ISFJ", "The Gentle Anchor"],
  ESFP: ["ISTJ", "The Quiet Rock"]
};

const LETTER_OPENERS = [
  "Love asks both of you to be brave in different ways.",
  "This pairing works when honesty arrives before assumptions.",
  "Your dynamic has real chemistry, but timing matters as much as feeling.",
  "What you build together grows fastest when expectations are named early."
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAnswers(answers = []) {
  const safe = Array.isArray(answers) ? answers : [];
  if (!safe.length) return 0.6;
  const sum = safe.reduce((acc, n) => acc + (Number(n) || 0), 0);
  const avg = sum / safe.length;
  return clamp(avg / 5, 0.2, 1);
}

function pickAttachment(emotion, currentStatus, relHistory) {
  if (currentStatus === "relationship") return "secure";
  if (emotion === "anxiety" || relHistory >= 2) return "anxious";
  if (emotion === "numbness") return "avoidant";
  return pick(ATTACHMENTS);
}

function pickMbti(seedNum) {
  const idx = Math.abs(seedNum) % MBTI_TYPES.length;
  return MBTI_TYPES[idx];
}

export function buildUserReading(payload = {}) {
  const answerSignal = normalizeAnswers(payload.quiz_answers);
  const relHistory = Number(payload.rel_history || 0);
  const birthYear = Number(payload.birth_year || 2000);
  const lang = payload.lang === "ru" ? "ru" : "en";
  const seed = Math.round(answerSignal * 1000) + birthYear + relHistory * 17;

  const mbti = pickMbti(seed);
  const attachment = pickAttachment(payload.emotion, payload.current_status, relHistory);
  const poetic_name = POETIC_NAMES[mbti] || "The Grounded Rose";
  const archetype = pick(ARCHETYPES);
  const monologue = pick(MONOLOGUES[attachment]);
  const [soulMbti, soulName] = SOUL_MATCH[mbti] || ["ENFJ", "The Protagonist"];

  const eqBase = 70 + Math.round(answerSignal * 25);
  const eq_score = clamp(eqBase + randInt(-3, 4), 62, 99);
  const same_type_pct = clamp(Number((0.08 + answerSignal * 0.13 + randInt(-2, 2) / 100).toFixed(3)), 0.06, 0.22);

  const depth = clamp(0.45 + answerSignal * 0.45 + randInt(-6, 6) / 100, 0.2, 0.98);
  const guard = clamp(0.4 + (1 - answerSignal) * 0.4 + randInt(-8, 8) / 100, 0.15, 0.95);
  const heat = clamp(0.4 + answerSignal * 0.35 + randInt(-8, 8) / 100, 0.15, 0.96);
  const heal = clamp(0.35 + answerSignal * 0.45 + randInt(-8, 8) / 100, 0.2, 0.95);
  const read_score = clamp(0.5 + answerSignal * 0.35 + randInt(-6, 6) / 100, 0.2, 0.97);

  const oneLine =
    attachment === "secure"
      ? "Grounded empathy. Clear emotional boundaries."
      : attachment === "anxious"
        ? "Big heart, high sensitivity, and strong emotional radar."
        : "Reserved outside, deep and loyal inside.";

  const description =
    lang === "ru"
      ? "Ты считываешь эмоции тонко и быстро. Когда уязвимость встречается с ясной коммуникацией, твоя связь становится особенно глубокой."
      : "You read emotional nuance quickly. When vulnerability meets clear communication, your connections become unusually deep.";

  const strengths = [
    { text: "Reads subtle shifts in tone before conflict escalates." },
    { text: "Builds trust through consistency rather than performance." },
    { text: "Can turn emotional intensity into meaningful intimacy." }
  ];

  const blind_spots = [
    { text: "May over-interpret delayed replies as emotional distance." },
    { text: "Can suppress needs to keep the emotional weather stable." },
    { text: "Sometimes waits too long before naming boundaries." }
  ];

  const love_letter =
    "Dear heart,\nYou are not too much. You are precise.\nThe right person will not fear your depth.";

  return {
    mbti,
    attachment,
    poetic_name,
    archetype,
    monologue,
    profile: {
      eq_score,
      same_type_pct,
      one_line: oneLine,
      description,
      soul_match_mbti: soulMbti,
      soul_match_name: soulName,
      soul_match_reason: "They balance your pace with emotional clarity.",
      strengths,
      blind_spots,
      love_letter,
      depth: Number(depth.toFixed(2)),
      guard: Number(guard.toFixed(2)),
      heat: Number(heat.toFixed(2)),
      heal: Number(heal.toFixed(2)),
      read_score: Number(read_score.toFixed(2))
    }
  };
}

function mbtiPairName(mbtiA, mbtiB) {
  const letters = `${mbtiA || "INFP"} × ${mbtiB || "ENFJ"}`;
  return `${letters} Resonance`;
}

export function buildCompatReport(personA, personB, codeA, codeB) {
  const pA = personA?.profile || {};
  const pB = personB?.profile || {};
  const avg = (x, y) => (Number(x || 0.6) + Number(y || 0.6)) / 2;
  const dist = (x, y) => Math.abs(Number(x || 0.6) - Number(y || 0.6));

  const dim_emotional = clamp(Math.round(avg(pA.depth, pB.depth) * 100 - dist(pA.guard, pB.guard) * 14), 55, 98);
  const dim_communication = clamp(Math.round(avg(pA.read_score, pB.read_score) * 100 - dist(pA.heat, pB.heat) * 10), 50, 97);
  const dim_growth = clamp(Math.round(avg(pA.heal, pB.heal) * 100 - dist(pA.depth, pB.depth) * 8), 52, 99);
  const dim_intimacy = clamp(Math.round(avg(pA.heat, pB.heat) * 100 - dist(pA.guard, pB.guard) * 12), 50, 98);
  const compat_score = clamp(Math.round((dim_emotional + dim_communication + dim_growth + dim_intimacy) / 4), 50, 99);

  const mbtiA = personA?.mbti || "INFP";
  const mbtiB = personB?.mbti || "ENFJ";

  return {
    generated_at: new Date().toISOString(),
    code_a: codeA,
    code_b: codeB,
    compat_score,
    pairing_name: mbtiPairName(mbtiA, mbtiB),
    dim_emotional,
    dim_communication,
    dim_growth,
    dim_intimacy,
    core_energy: pick([
      "This connection is strongest when both people verbalize needs before tension builds.",
      "You balance emotional depth with practical momentum when pacing stays explicit.",
      "Your pairing thrives on reassurance plus predictable follow-through."
    ]),
    growth_edges: [
      {
        trigger: "Delayed replies are interpreted as rejection.",
        suggestion: "Agree on communication windows before busy days."
      },
      {
        trigger: "One person seeks closeness while the other needs distance.",
        suggestion: "Use a reset ritual: 20 minutes alone, then reconnect intentionally."
      },
      {
        trigger: "Conflict loops around tone instead of topic.",
        suggestion: "Name one concrete request each before discussing emotions."
      }
    ],
    love_languages: {
      person_a: pick(["Words of affirmation", "Quality time", "Acts of service"]),
      person_b: pick(["Physical touch", "Quality time", "Gift giving", "Acts of service"]),
      match_note: "Compatibility rises when appreciation style is translated, not assumed."
    },
    letter: `${pick(LETTER_OPENERS)}\nLet conflict become information, not proof of incompatibility.\nChoose clarity over guessing, and this bond becomes durable.`
  };
}
