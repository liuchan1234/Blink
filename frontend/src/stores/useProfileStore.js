import { defineStore } from "pinia";

function createEmptyState() {
  return {
    blinkCode: null,
    mbti: null,
    attachment: null,
    poeticName: null,
    archetype: null,
    oneLine: "",
    monologue: "",
    description: "",
    loveLetter: "",
    strengths: [],
    blindSpots: [],
    soulMatchReason: "",
    eqScore: null,
    profile: null,
    gender: null,
    zodiac: null,
    currentStatus: null,
    lang: "en",
  };
}

function buildSeed(value = "") {
  return Array.from(String(value)).reduce((total, character) => total + character.charCodeAt(0), 0);
}

export const useProfileStore = defineStore("profile", {
  state: () => createEmptyState(),
  getters: {
    hasProfile: (state) => Boolean(state.blinkCode),
    attachmentLabel: (state) => (state.attachment ? String(state.attachment).toUpperCase() : "—"),
    sameTypePct: (state) => state.profile?.same_type_pct ?? null,
    sameTypePercentLabel() {
      if (this.sameTypePct === null || this.sameTypePct === undefined) return "—";
      return `${(Number(this.sameTypePct) * 100).toFixed(1)}% of users`;
    },
    sameTypeCount() {
      if (this.sameTypePct === null || this.sameTypePct === undefined) return null;
      const seed = buildSeed(this.blinkCode || this.mbti || "blink");
      const totalUsers = 48000 + (seed % 1200);
      return Math.floor(totalUsers * Number(this.sameTypePct));
    },
    openBlinkCount() {
      if (this.sameTypeCount === null) return null;
      const seed = buildSeed(this.poeticName || this.blinkCode || "blink");
      const pct = 0.08 + ((seed % 7) / 100);
      return Math.max(1, Math.floor(this.sameTypeCount * pct));
    },
    openBlinkPercent() {
      const seed = buildSeed(this.poeticName || this.blinkCode || "blink");
      return 8 + (seed % 7);
    },
    soulMatchMbti: (state) => state.profile?.soul_match_mbti || "—",
    soulMatchName: (state) => state.profile?.soul_match_name || "—",
    radarMetrics: (state) => ({
      depth: Number(state.profile?.depth || 0),
      guard: Number(state.profile?.guard || 0),
      heat: Number(state.profile?.heat || 0),
      heal: Number(state.profile?.heal || 0),
      read: Number(state.profile?.read_score || 0),
    }),
  },
  actions: {
    setProfileFromResponse(data = {}) {
      const profile = data.profile || {};

      this.blinkCode = data.blink_code || this.blinkCode;
      this.mbti = data.mbti || this.mbti;
      this.attachment = (data.attachment || this.attachment || "").toLowerCase() || null;
      this.poeticName = data.poetic_name || this.poeticName;
      this.archetype = data.archetype ?? this.archetype;
      this.oneLine = data.one_line || profile.one_line || this.oneLine;
      this.monologue = data.monologue || this.monologue;
      this.description = data.description || profile.description || this.description;
      this.loveLetter = data.love_letter || profile.love_letter || this.loveLetter;
      this.strengths = data.strengths || profile.strengths || [];
      this.blindSpots = data.blind_spots || profile.blind_spots || [];
      this.soulMatchReason = data.soul_match_reason || profile.soul_match_reason || this.soulMatchReason;
      this.eqScore = data.eq_score ?? profile.eq_score ?? this.eqScore;
      this.profile = {
        ...profile,
        one_line: data.one_line || profile.one_line,
        description: data.description || profile.description,
        love_letter: data.love_letter || profile.love_letter,
        strengths: data.strengths || profile.strengths || [],
        blind_spots: data.blind_spots || profile.blind_spots || [],
        soul_match_reason: data.soul_match_reason || profile.soul_match_reason,
        eq_score: data.eq_score ?? profile.eq_score,
      };
      this.gender = data.gender || this.gender;
      this.zodiac = data.zodiac || this.zodiac;
      this.currentStatus = data.current_status || this.currentStatus;
      this.lang = data.lang || this.lang;
    },
    clear() {
      Object.assign(this, createEmptyState());
    },
  },
});
