<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuizStore } from "../stores/useQuizStore";
import { useSessionStore } from "../stores/useSessionStore";
import { QUIZ_QUESTIONS, QUIZ_SCALE } from "../utils/constants";
import { translate } from "../utils/i18n";

const router = useRouter();
const quizStore = useQuizStore();
const sessionStore = useSessionStore();
const firstUnanswered = quizStore.quizAnswers.findIndex((value) => typeof value !== "number");
const currentIndex = ref(firstUnanswered === -1 ? 0 : firstUnanswered);

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

const currentQuestion = computed(() => QUIZ_QUESTIONS[currentIndex.value]);
const progressWidth = computed(() => `${((currentIndex.value + 1) / QUIZ_QUESTIONS.length) * 100}%`);
const selectedValue = computed(() => quizStore.quizAnswers[currentIndex.value]);

function answer(value) {
  quizStore.setAnswer(currentIndex.value, value);
  if (currentIndex.value === QUIZ_QUESTIONS.length - 1) {
    router.push({ name: "generating" });
    return;
  }

  currentIndex.value += 1;
}

function goBack() {
  if (currentIndex.value === 0) {
    router.push({ name: "emotion" });
    return;
  }

  currentIndex.value -= 1;
}
</script>

<template>
  <section class="screen-page screen-page--quiz">
    <header class="quiz-header">
      <button type="button" class="btn-link" @click="goBack">←</button>
      <span>{{ t("quizProgress", { current: currentIndex + 1, total: QUIZ_QUESTIONS.length }) }}</span>
    </header>

    <div class="quiz-progress">
      <div class="quiz-progress__fill" :style="{ width: progressWidth }"></div>
    </div>

    <div class="quiz-card">
      <h1 class="quiz-card__question">{{ currentQuestion[sessionStore.lang] || currentQuestion.en }}</h1>
    </div>

    <div class="quiz-scale">
      <button
        v-for="option in QUIZ_SCALE"
        :key="option.value"
        type="button"
        class="quiz-scale__button"
        :class="{ 'is-selected': selectedValue === option.value }"
        @click="answer(option.value)"
      >
        <span class="quiz-scale__value">{{ option.value }}</span>
        <span class="quiz-scale__label">{{ option.label[sessionStore.lang] || option.label.en }}</span>
      </button>
    </div>
  </section>
</template>
