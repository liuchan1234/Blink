<script setup>
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useCompatStore } from "../../stores/useCompatStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { useUiStore } from "../../stores/useUiStore";
import { translate } from "../../utils/i18n";

const router = useRouter();
const sessionStore = useSessionStore();

function t(key) {
  return translate(sessionStore.lang, key);
}

async function goToReport(reportId) {
  await router.push({ name: "compat-report", params: { reportId } });
}

async function confirm() {
  const result = await compatStore.startCompatCheckout();
  if (result.ok && result.reportId) {
    await goToReport(result.reportId);
  }
}

function close() {
  uiStore.closeCompatConfirm();
}

const compatStore = useCompatStore();
const uiStore = useUiStore();
const { compatConfirm } = storeToRefs(uiStore);

</script>

<template>
  <transition name="fade">
    <div v-if="compatConfirm.open" class="modal-overlay" @click.self="uiStore.closeCompatConfirm()">
      <div class="sheet-modal">
        <div class="sheet-modal__handle"></div>
        <div class="sheet-modal__pair">
          <div class="sheet-modal__code">{{ compatConfirm.codeA.slice(6) || "??????" }}</div>
          <span class="sheet-modal__heart">×</span>
          <div class="sheet-modal__code sheet-modal__code--alt">{{ compatConfirm.codeB.slice(6) || "??????" }}</div>
        </div>
        <div v-if="compatConfirm.poeticNameA && compatConfirm.poeticNameB" class="sheet-modal__names">
          {{ compatConfirm.poeticNameA }} × {{ compatConfirm.poeticNameB }}
        </div>
        <h3 class="sheet-modal__title">{{ t("confirmCompatTitle") }}</h3>
        <p class="sheet-modal__subtitle">{{ t("confirmCompatSubtitle") }}</p>
        <div class="sheet-modal__price">{{ t("confirmCompatPrice") }}</div>
        <button type="button" class="btn-primary" :disabled="compatConfirm.loading" @click="confirm">
          {{ compatConfirm.loading ? "…" : t("unlockReading") }}
        </button>
        <button type="button" class="btn-secondary" @click="close">
          {{ t("cancel") }}
        </button>
      </div>
    </div>
  </transition>
</template>
