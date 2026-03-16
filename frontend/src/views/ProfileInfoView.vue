<script setup>
import { useRouter } from "vue-router";
import { useQuizStore } from "../stores/useQuizStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useUiStore } from "../stores/useUiStore";
import {
  BIRTH_YEAR_OPTIONS,
  GENDER_OPTIONS,
  REL_HISTORY_OPTIONS,
  ZODIAC_OPTIONS,
} from "../utils/constants";
import { translate } from "../utils/i18n";

const router = useRouter();
const quizStore = useQuizStore();
const sessionStore = useSessionStore();
const uiStore = useUiStore();

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

function goNext() {
  uiStore.clearError();
  if (!quizStore.gender || !quizStore.zodiac) {
    uiStore.showError(t("pickGenderZodiac"));
    return;
  }

  router.push({ name: "emotion" });
}
</script>

<template>
  <section class="screen-page">
    <div v-if="sessionStore.pendingDualIntent" class="info-banner">
      {{ t("profileRequired") }}
    </div>

    <header class="page-header">
      <div class="page-tag">{{ t("profileTag") }}</div>
      <h1 class="page-title">{{ t("profileTitle") }}</h1>
      <p class="page-subtitle">{{ t("profileSubtitle") }}</p>
    </header>

    <div class="section-card">
      <label class="field-label">{{ t("gender") }}</label>
      <div class="chip-group">
        <button
          v-for="option in GENDER_OPTIONS"
          :key="option.value"
          type="button"
          class="chip"
          :class="{ 'is-selected': quizStore.gender === option.value }"
          @click="quizStore.setProfileField('gender', option.value)"
        >
          {{ option.label[sessionStore.lang] || option.label.en }}
        </button>
      </div>
    </div>

    <div class="section-card">
      <label class="field-label" for="birth-year">{{ t("birthYear") }}</label>
      <div class="select-wrap">
        <select id="birth-year" :value="quizStore.birthYear" @change="quizStore.setProfileField('birthYear', Number($event.target.value))">
          <option v-for="year in BIRTH_YEAR_OPTIONS" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </div>

    <div class="section-card">
      <label class="field-label">{{ t("zodiac") }}</label>
      <div class="zodiac-grid">
        <button
          v-for="sign in ZODIAC_OPTIONS"
          :key="sign.value"
          type="button"
          class="zodiac-chip"
          :class="{ 'is-selected': quizStore.zodiac === sign.value }"
          @click="quizStore.setProfileField('zodiac', sign.value)"
        >
          <span class="zodiac-chip__symbol">{{ sign.symbol }}</span>
          <span class="zodiac-chip__label">{{ sign.label[sessionStore.lang] || sign.label.en }}</span>
        </button>
      </div>
    </div>

    <div class="section-card">
      <label class="field-label">{{ t("relationships") }}</label>
      <div class="chip-group chip-group--stretch">
        <button
          v-for="option in REL_HISTORY_OPTIONS"
          :key="option.value"
          type="button"
          class="chip chip--compact"
          :class="{ 'is-selected': quizStore.relHistory === option.value }"
          @click="quizStore.setProfileField('relHistory', option.value)"
        >
          <span>{{ option.shortLabel }}</span>
          <small>{{ option.label[sessionStore.lang] || option.label.en }}</small>
        </button>
      </div>
    </div>

    <button type="button" class="btn-primary page-footer-button" @click="goNext">
      {{ t("continue") }} →
    </button>
  </section>
</template>
