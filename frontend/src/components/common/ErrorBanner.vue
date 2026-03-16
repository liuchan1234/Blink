<script setup>
import { storeToRefs } from "pinia";
import { useSessionStore } from "../../stores/useSessionStore";
import { useUiStore } from "../../stores/useUiStore";
import { translate } from "../../utils/i18n";

const sessionStore = useSessionStore();
const uiStore = useUiStore();
const { errorBanner } = storeToRefs(uiStore);
</script>

<template>
  <transition name="fade-up">
    <div v-if="errorBanner.visible" class="error-banner">
      <div class="error-banner__content">
        <strong class="error-banner__title">{{ translate(sessionStore.lang, "error") }}</strong>
        <p class="error-banner__message">{{ errorBanner.message }}</p>
      </div>
      <button class="error-banner__close" type="button" @click="uiStore.clearError()">×</button>
    </div>
  </transition>
</template>
