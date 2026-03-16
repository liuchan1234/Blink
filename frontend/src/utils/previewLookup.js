import { loadPreviewProfile } from "./previewProfile";

function hashCode(code = "") {
  return Array.from(code).reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function buildPreviewLookup(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const existing = loadPreviewProfile();

  if (existing?.blink_code === normalizedCode) {
    return {
      blink_code: existing.blink_code,
      mbti: existing.mbti,
      attachment: existing.attachment,
      poetic_name: existing.poetic_name,
      archetype: existing.archetype,
      monologue: existing.monologue,
      eq_score: existing.eq_score,
      profile: existing.profile,
    };
  }

  const seed = hashCode(normalizedCode);
  const mbtiOptions = ["INFP", "ENFJ", "INFJ", "INTJ", "ENFP", "ISFP", "ENTP", "ESFJ"];
  const poeticNames = [
    "The Quiet Flame",
    "The Silver Current",
    "The Soft Orbit",
    "The Night Bloom",
    "The Golden Thread",
    "The Velvet Signal",
  ];

  return {
    blink_code: normalizedCode,
    mbti: mbtiOptions[seed % mbtiOptions.length],
    attachment: ["anxious", "secure", "avoidant"][seed % 3],
    poetic_name: poeticNames[seed % poeticNames.length],
    archetype: null,
    monologue: "Preview lookup for local browser development.",
    eq_score: 66 + (seed % 28),
    profile: {
      eq_score: 66 + (seed % 28),
      same_type_pct: Number((0.05 + (seed % 15) / 100).toFixed(2)),
      soul_match_mbti: mbtiOptions[(seed + 3) % mbtiOptions.length],
      soul_match_name: "Preview Pair",
    },
  };
}
