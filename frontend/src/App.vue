<script setup>
import { onMounted, onUnmounted, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import CompatConfirmModal from "./components/compat/CompatConfirmModal.vue";
import ErrorBanner from "./components/common/ErrorBanner.vue";
import LoadingOverlay from "./components/common/LoadingOverlay.vue";
import BottomNav from "./components/navigation/BottomNav.vue";
import PosterSheet from "./components/poster/PosterSheet.vue";
import { useBootstrapRouting } from "./composables/useBootstrapRouting";
import { useTelegramWebApp } from "./composables/useTelegramWebApp";
import { useSessionStore } from "./stores/useSessionStore";
import { useUiStore } from "./stores/useUiStore";
import { translate } from "./utils/i18n";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const uiStore = useUiStore();
const telegram = useTelegramWebApp();
const { bootstrap } = useBootstrapRouting(router);

let cleanupViewport = null;
let cleanupBackButton = null;

function setLanguage(lang) {
  sessionStore.setLang(lang);
}

async function runBootstrap() {
  uiStore.startLoading();
  try {
    await bootstrap();
  } finally {
    uiStore.stopLoading();
  }
}

function updateBackButtonVisibility() {
  telegram.setBackButtonVisible(!route.meta.backRoot);
}

onMounted(async () => {
  telegram.ready();
  telegram.expand();
  cleanupViewport = telegram.initViewportListener();
  cleanupBackButton = telegram.bindBackButton(() => {
    router.back();
  });
  updateBackButtonVisibility();
  await runBootstrap();
});

watch(
  () => route.fullPath,
  () => {
    updateBackButtonVisibility();
  },
);

onUnmounted(() => {
  cleanupViewport?.();
  cleanupBackButton?.();
});
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__bg"></div>
    <div class="app-shell__bg app-shell__bg--secondary"></div>

    <div class="app-shell__chrome">
      <div class="lang-switcher">
        <button type="button" class="lang-switcher__btn" :class="{ 'is-active': sessionStore.lang === 'en' }" @click="setLanguage('en')">
          EN
        </button>
        <button type="button" class="lang-switcher__btn" :class="{ 'is-active': sessionStore.lang === 'ru' }" @click="setLanguage('ru')">
          RU
        </button>
        <button type="button" class="lang-switcher__btn" :class="{ 'is-active': sessionStore.lang === 'zh' }" @click="setLanguage('zh')">
          中
        </button>
      </div>

      <div v-if="sessionStore.browserPreview" class="preview-pill">
        {{ translate(sessionStore.lang, "browserPreview") }}
      </div>
    </div>

    <main class="app-shell__main">
      <RouterView />
    </main>

    <BottomNav />
    <ErrorBanner />
    <LoadingOverlay />
    <CompatConfirmModal />
    <PosterSheet />

    <transition name="fade-up">
      <div v-if="uiStore.toast.visible" class="toast" :class="`toast--${uiStore.toast.type}`">
        {{ uiStore.toast.message }}
      </div>
    </transition>
  </div>
</template>
