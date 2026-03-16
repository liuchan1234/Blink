function hashValue(input = "") {
  return Array.from(input).reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function buildPreviewCompatReport(codeA, codeB) {
  const seed = hashValue(`${codeA}:${codeB}`);
  const compatScore = 68 + (seed % 27);
  const emotional = 60 + (seed % 30);
  const communication = 58 + ((seed * 3) % 32);
  const growth = 55 + ((seed * 5) % 34);
  const intimacy = 63 + ((seed * 7) % 28);

  return {
    generated_at: new Date().toISOString(),
    code_a: codeA,
    code_b: codeB,
    compat_score: compatScore,
    pairing_name: "Preview Constellation",
    dim_emotional: emotional,
    dim_communication: communication,
    dim_growth: growth,
    dim_intimacy: intimacy,
    core_energy: "In browser preview mode, this pair reads as emotionally curious, slightly uneven in pacing, and strongest when both people communicate expectations clearly.",
    growth_edges: [
      {
        trigger: "Silence after conflict",
        suggestion: "Name whether the silence means reflection or withdrawal before assumptions take over.",
      },
      {
        trigger: "Different pacing",
        suggestion: "Agree on a check-in rhythm so one person does not feel rushed while the other feels ignored.",
      },
      {
        trigger: "Mixed reassurance needs",
        suggestion: "Alternate between direct reassurance and quiet presence instead of defaulting to only one style.",
      },
    ],
    love_languages: {
      person_a: "Quality Time",
      person_b: "Words of Affirmation",
      match_note: "This preview pair works best when presence and explicit reassurance happen together.",
    },
    letter: "This is a browser-preview compatibility report.\n\nThe full Telegram payment flow is required for real paid generation, but the page, polling state, and report layout remain previewable locally.",
  };
}
