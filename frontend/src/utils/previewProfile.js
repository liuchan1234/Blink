const PREVIEW_PROFILE_KEY = "blink_preview_profile";

function hashAnswers(payload = {}) {
  const answers = Array.isArray(payload.quiz_answers) ? payload.quiz_answers : [];
  return answers.reduce((total, value, index) => total + Number(value || 0) * (index + 3), 0);
}

function pickFromSeed(options, seed) {
  return options[seed % options.length];
}

export function buildPreviewProfileResult(payload = {}) {
  const seed = hashAnswers(payload) + Number(payload.birth_year || 2000) + Number(payload.rel_history || 0) * 13;
  const mbtiOptions = ["INFP", "ENFJ", "INFJ", "INTJ", "ENFP", "ISFP", "ENTP", "ESFJ"];
  const attachmentOptions = ["anxious", "secure", "avoidant"];
  const poeticNames = [
    "The Grounded Rose",
    "The Midnight Letter",
    "The Quiet Flame",
    "The Soft Orbit",
    "The Golden Thread",
    "The Velvet Current",
  ];
  const monologues = [
    "Full signal. Never sends first.",
    "Reads the room before reading the text.",
    "Soft heart. Sharp intuition.",
    "Feels deeply, edits carefully.",
  ];
  const soulMatchNames = [
    "The Protagonist",
    "The Diplomat",
    "The Strategist",
    "The Dream Mirror",
  ];

  const mbti = pickFromSeed(mbtiOptions, seed);
  const attachment = pickFromSeed(attachmentOptions, seed * 3);
  const poeticName = pickFromSeed(poeticNames, seed * 5);
  const monologue = pickFromSeed(monologues, seed * 7);
  const soulMatchMbti = pickFromSeed(mbtiOptions.filter((item) => item !== mbti), seed * 11);
  const soulMatchName = pickFromSeed(soulMatchNames, seed * 13);
  const blinkCode = `BLINK-${Math.abs(seed * 971).toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").padEnd(6, "7").slice(0, 6)}`;
  const sameTypePct = Number((0.06 + (seed % 18) / 100).toFixed(2));
  const eqScore = 72 + (seed % 24);

  const profile = {
    eq_score: eqScore,
    same_type_pct: sameTypePct,
    one_line: `${poeticName} loves with intuition first and explanations second.`,
    description: `This browser preview profile is generated locally for development. It mirrors the shape of the backend result and keeps the result/detail pages previewable without Telegram auth.`,
    soul_match_mbti: soulMatchMbti,
    soul_match_name: soulMatchName,
    soul_match_reason: `${soulMatchMbti} brings clarity to ${mbti}'s emotional depth without flattening it.`,
    strengths: [
      { text: "You catch emotional nuance before most people notice it." },
      { text: "You create intimacy through consistency rather than performance." },
      { text: "You stay loyal to the connections that feel honest." },
    ],
    blind_spots: [
      { text: "You may over-interpret distance when communication slows down." },
      { text: "You can protect your feelings by delaying direct asks." },
      { text: "You sometimes test safety internally instead of out loud." },
    ],
    love_letter: `Dear you,\n\nThis is a locally generated preview profile for browser development. Your final product flow, result layout, and share interactions remain previewable even when Telegram auth is unavailable.`,
    depth: Number((0.65 + (seed % 20) / 100).toFixed(2)),
    guard: Number((0.42 + (seed % 25) / 100).toFixed(2)),
    heat: Number((0.38 + (seed % 18) / 100).toFixed(2)),
    heal: Number((0.44 + (seed % 22) / 100).toFixed(2)),
    read_score: Number((0.71 + (seed % 20) / 100).toFixed(2)),
  };

  return {
    blink_code: blinkCode,
    mbti,
    attachment,
    poetic_name: poeticName,
    archetype: null,
    one_line: profile.one_line,
    monologue,
    description: profile.description,
    love_letter: profile.love_letter,
    strengths: profile.strengths,
    blind_spots: profile.blind_spots,
    soul_match_reason: profile.soul_match_reason,
    eq_score: eqScore,
    profile,
    free_submits_used: 0,
    gender: payload.gender || null,
    zodiac: payload.zodiac || null,
    current_status: payload.current_status || null,
    lang: payload.lang || "en",
  };
}

export function savePreviewProfile(result) {
  try {
    localStorage.setItem(PREVIEW_PROFILE_KEY, JSON.stringify(result));
  } catch {
    // ignore storage failures in preview mode
  }
}

export function loadPreviewProfile() {
  try {
    const raw = localStorage.getItem(PREVIEW_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPreviewProfile() {
  try {
    localStorage.removeItem(PREVIEW_PROFILE_KEY);
  } catch {
    // ignore storage failures in preview mode
  }
}
