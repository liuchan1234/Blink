<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useProfileStore } from "../stores/useProfileStore";
import { useQuizStore } from "../stores/useQuizStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useUiStore } from "../stores/useUiStore";
import { translate } from "../utils/i18n";

const router = useRouter();
const profileStore = useProfileStore();
const quizStore = useQuizStore();
const sessionStore = useSessionStore();
const uiStore = useUiStore();

function retake() {
  quizStore.prepareForRetake();
  router.push({ name: "profile" });
}

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

const sameTypeCount = computed(() =>
  typeof profileStore.sameTypeCount === "number" ? profileStore.sameTypeCount.toLocaleString() : "—",
);
const eqScore = computed(() => (profileStore.eqScore != null ? `${profileStore.eqScore}%` : "—"));

async function copyCode() {
  if (!profileStore.blinkCode) return;
  await navigator.clipboard?.writeText(profileStore.blinkCode).catch(() => {});
  uiStore.showToast(t("copied"), "success");
}

function share() {
  const text = `${profileStore.mbti || "BLINK"} — ${profileStore.poeticName || ""}\n${profileStore.blinkCode || ""}`;
  const shareUrl = window.location.origin;
  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <section class="screen-page result-page">
    <header class="result-hero">
      <div class="result-hero__type">{{ profileStore.mbti || "—" }}</div>
      <div class="result-hero__name">{{ profileStore.poeticName || "—" }}</div>
      <div class="result-hero__attachment">{{ profileStore.attachmentLabel }} · {{ t("attachmentStyle") }}</div>
    </header>

    <div class="section-card section-card--highlight">
      <div class="section-card__label">{{ t("resultTag") }}</div>
      <p class="section-card__body">{{ profileStore.oneLine || profileStore.description || "—" }}</p>
    </div>

    <div class="stats-grid">
      <div class="metric-card">
        <div class="metric-card__label">{{ t("sameType") }}</div>
        <div class="metric-card__value">{{ sameTypeCount }}</div>
        <div class="metric-card__hint">{{ profileStore.sameTypePct != null ? `${(profileStore.sameTypePct * 100).toFixed(1)}% ${t("ofUsers")}` : "—" }}</div>
      </div>
      <div class="metric-card metric-card--accent">
        <div class="metric-card__label">{{ t("eqScore") }}</div>
        <div class="metric-card__value">{{ eqScore }}</div>
        <div class="metric-card__hint">{{ profileStore.description ? t("profileSynced") : "—" }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__label">{{ t("soulMatch") }}</div>
        <div class="metric-card__value">{{ profileStore.soulMatchMbti }}</div>
        <div class="metric-card__hint">{{ profileStore.soulMatchName }}</div>
      </div>
    </div>

    <div class="section-card">
      <div class="field-label">{{ t("codeLabel") }}</div>
      <div class="code-row">
        <div class="code-pill">{{ profileStore.blinkCode || "—" }}</div>
        <button type="button" class="icon-button" @click="copyCode">{{ t("copy") }}</button>
        <button type="button" class="icon-button" @click="share">{{ t("share") }}</button>
        <button type="button" class="icon-button" @click="uiStore.openPoster()">{{ t("poster") }}</button>
      </div>
    </div>

    <div class="section-card">
      <p class="section-card__body">{{ profileStore.description || "—" }}</p>
    </div>

    <button type="button" class="btn-primary" @click="router.push({ name: 'result-details' })">
      {{ t("resultButton") }} →
    </button>
    <button type="button" class="btn-secondary" @click="retake">
      {{ t("retake") }}
    </button>
  </section>
</template>
