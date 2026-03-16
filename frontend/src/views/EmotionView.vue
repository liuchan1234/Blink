<script setup>
import { useRouter } from "vue-router";
import { useQuizStore } from "../stores/useQuizStore";
import { useSessionStore } from "../stores/useSessionStore";
import { EMOTION_OPTIONS } from "../utils/constants";
import { translate } from "../utils/i18n";

const router = useRouter();
const quizStore = useQuizStore();
const sessionStore = useSessionStore();

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

function selectEmotion(option) {
  quizStore.setEmotion(option);
  router.push({ name: "quiz" });
}
</script>

<template>
  <section class="screen-page">
    <header class="page-header">
      <div class="page-tag">{{ t("emotionTag") }}</div>
      <h1 class="page-title">{{ t("emotionTitle") }}</h1>
      <p class="page-subtitle">{{ t("emotionSubtitle") }}</p>
    </header>

    <div class="emotion-grid">
      <button
        v-for="option in EMOTION_OPTIONS"
        :key="option.value"
        type="button"
        class="emotion-card"
        :class="[`emotion-card--${option.accent}`, { 'is-selected': quizStore.emotion === option.value }]"
        @click="selectEmotion(option)"
      >
        <span class="emotion-card__emoji">{{ option.emoji }}</span>
        <span class="emotion-card__title">{{ option.title[sessionStore.lang] || option.title.en }}</span>
        <span class="emotion-card__subtitle">{{ option.subtitle[sessionStore.lang] || option.subtitle.en }}</span>
      </button>
    </div>
  </section>
</template>
