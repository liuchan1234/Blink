<script setup>
import { useRouter } from "vue-router";
import { useProfileStore } from "../stores/useProfileStore";
import { useSessionStore } from "../stores/useSessionStore";
import { translate } from "../utils/i18n";

const router = useRouter();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

function start() {
  router.push({ name: "profile" });
}
</script>

<template>
  <section class="screen-page screen-page--center landing-page">
    <div class="brand-pill">✦ {{ t("landingTag") }} ✦</div>
    <div class="landing-orb"></div>
    <h1 class="hero-title">{{ t("landingTitle") }}</h1>
    <p class="hero-subtitle">{{ t("landingSubtitle") }}</p>

    <div class="hero-actions">
      <button type="button" class="btn-primary" @click="start">
        {{ t("landingCta") }} →
      </button>
      <button v-if="profileStore.hasProfile" type="button" class="btn-secondary" @click="router.push({ name: 'result' })">
        {{ t("resultTitle") }}
      </button>
    </div>

    <div class="feature-pills">
      <span class="feature-pill">2 min</span>
      <span class="feature-pill">10 questions</span>
      <span class="feature-pill">Telegram Mini App</span>
    </div>
  </section>
</template>
