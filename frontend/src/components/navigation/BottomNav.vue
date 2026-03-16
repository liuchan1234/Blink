<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionStore } from "../../stores/useSessionStore";
import { useProfileStore } from "../../stores/useProfileStore";
import { useCompatStore } from "../../stores/useCompatStore";
import { translate } from "../../utils/i18n";

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const compatStore = useCompatStore();

const navItems = computed(() => [
  {
    key: "result",
    label: translate(sessionStore.lang, "meTab"),
    icon: "👤",
    disabled: !profileStore.hasProfile,
    target: { name: profileStore.hasProfile ? "result" : "landing" },
  },
  {
    key: "compat",
    label: translate(sessionStore.lang, "compatTab"),
    icon: "💫",
    disabled: false,
    target: compatStore.currentReportId
      ? { name: "compat-report", params: { reportId: compatStore.currentReportId } }
      : sessionStore.pendingReportId
        ? { name: "compat-report", params: { reportId: sessionStore.pendingReportId } }
        : { name: "compat" },
  },
]);

function navigate(item) {
  router.push(item.target);
}
</script>

<template>
  <nav v-if="route.meta.nav" class="bottom-nav">
    <button
      v-for="item in navItems"
      :key="item.key"
      type="button"
      class="bottom-nav__item"
      :class="{ 'is-active': route.meta.navKey === item.key }"
      :disabled="item.disabled"
      @click="navigate(item)"
    >
      <span class="bottom-nav__icon">{{ item.icon }}</span>
      <span class="bottom-nav__label">{{ item.label }}</span>
    </button>
  </nav>
</template>
