<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuizStore } from "../stores/useQuizStore";
import { useSessionStore } from "../stores/useSessionStore";
import { useUiStore } from "../stores/useUiStore";
import { GENERATING_PHASES } from "../utils/constants";
import { translate } from "../utils/i18n";

const router = useRouter();
const quizStore = useQuizStore();
const sessionStore = useSessionStore();
const uiStore = useUiStore();
const progress = ref(0);
const phaseIndex = ref(0);

let progressTimer = null;
let phaseTimer = null;

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

const phaseLabel = computed(() => GENERATING_PHASES[phaseIndex.value]?.[sessionStore.lang] || GENERATING_PHASES[0].en);

async function completeFlow() {
  uiStore.startLoading();
  try {
    const result = await quizStore.submitQuiz();
    if (result.ok) {
      if (sessionStore.consumePendingDualIntent()) {
        router.replace({ name: "compat" });
        return;
      }
      router.replace({ name: "result" });
      return;
    }

    return;
  } finally {
    uiStore.stopLoading();
  }
}

function goBackToQuiz() {
  router.replace({ name: "quiz" });
}

async function unlockRetest() {
  uiStore.startLoading();
  try {
    const payment = await quizStore.startRetestCheckout();
    if (!payment.ok) {
      return;
    }

    const retryResult = await quizStore.submitQuiz({ paidSubmit: true });
    if (retryResult.ok) {
      if (sessionStore.consumePendingDualIntent()) {
        router.replace({ name: "compat" });
        return;
      }
      router.replace({ name: "result" });
      return;
    }

    router.replace({ name: "quiz" });
  } finally {
    uiStore.stopLoading();
  }
}

const showSubmitError = computed(() => Boolean(quizStore.submitError));
const isPaymentRequired = computed(() => quizStore.submitError?.code === "payment_required");
const ERROR_CODE_TO_I18N = {
  payment_required: "paymentRequired",
  duplicate_submit: "duplicateSubmit",
  rate_limited: "rateLimited",
};
const submitErrorMessage = computed(() => {
  const err = quizStore.submitError;
  if (!err) return t("genericError");
  const key = ERROR_CODE_TO_I18N[err.code];
  return key ? t(key) : err.rawMessage || t("genericError");
});
const shouldShowLoading = computed(() => !quizStore.submitError);
const primaryActionLabel = computed(() => (isPaymentRequired.value ? t("unlockRetest") : t("backToQuiz")));
const showSecondaryAction = computed(() => isPaymentRequired.value);

function stopAnimations() {
  window.clearInterval(progressTimer);
  window.clearInterval(phaseTimer);
}

watch(
  () => quizStore.submitError,
  (error) => {
    if (!error) return;
    stopAnimations();
    progress.value = 100;
  },
  { immediate: true },
);

async function handlePrimaryAction() {
  if (isPaymentRequired.value) {
    await unlockRetest();
    return;
  }

  goBackToQuiz();
}

function resetSubmitErrorAndReturn() {
  quizStore.clearSubmitError();
  goBackToQuiz();
}

function secondaryAction() {
  if (isPaymentRequired.value) {
    resetSubmitErrorAndReturn();
    return;
  }

  quizStore.clearSubmitError();
  goBackToQuiz();
}

onMounted(() => {
  progressTimer = window.setInterval(() => {
    progress.value = Math.min(progress.value + 3, 96);
  }, 120);

  phaseTimer = window.setInterval(() => {
    phaseIndex.value = (phaseIndex.value + 1) % GENERATING_PHASES.length;
  }, 1800);

  window.setTimeout(() => {
    void completeFlow();
  }, 2200);
});

onUnmounted(() => {
  window.clearInterval(progressTimer);
  window.clearInterval(phaseTimer);
});
</script>

<template>
  <section class="screen-page screen-page--center generating-page">
    <template v-if="shouldShowLoading">
      <div class="loading-orbit"></div>
      <div class="loading-orbit loading-orbit--secondary"></div>
      <div class="loading-orbit loading-orbit--tertiary"></div>

      <h1 class="page-title page-title--center">{{ t("generatingTitle") }}</h1>
      <p class="page-subtitle page-subtitle--center">{{ t("generatingSubtitle") }}</p>
      <p class="loading-phase">{{ phaseLabel }}</p>

      <div class="loading-track">
        <div class="loading-track__fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="loading-percent">{{ progress }}%</div>
    </template>

    <template v-else>
      <div class="section-card section-card--danger generating-error-card">
        <div class="field-label">{{ t("submitFailedTitle") }}</div>
        <p class="section-card__body">{{ submitErrorMessage }}</p>
        <button type="button" class="btn-primary" @click="handlePrimaryAction">
          {{ primaryActionLabel }}
        </button>
        <button v-if="showSecondaryAction" type="button" class="btn-secondary" @click="secondaryAction">
          {{ t("backToQuiz") }}
        </button>
      </div>
    </template>
  </section>
</template>
