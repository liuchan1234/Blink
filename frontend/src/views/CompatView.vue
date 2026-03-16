<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useCompatStore } from "../stores/useCompatStore";
import { useSessionStore } from "../stores/useSessionStore";
import { formatMonthYear, formatPercent } from "../utils/formatters";
import { translate } from "../utils/i18n";

const router = useRouter();
const compatStore = useCompatStore();
const sessionStore = useSessionStore();

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

async function fillMine() {
  const filled = compatStore.fillMineCode();
  if (!filled) {
    sessionStore.setPendingDualIntent(true);
    router.push({ name: "profile" });
  }
}

async function submitCodes() {
  const prepared = await compatStore.prepareCompatConfirmation();
  if (!prepared.ok) return;
}

async function openHistoryReport(reportId) {
  await compatStore.fetchReport(reportId);
  await router.push({ name: "compat-report", params: { reportId } });
}

onMounted(async () => {
  if (!compatStore.historyLoaded) {
    await compatStore.loadHistory();
  }

  if (sessionStore.pendingReportId && compatStore.currentReportId !== sessionStore.pendingReportId) {
    compatStore.restorePendingReport({
      reportId: sessionStore.pendingReportId,
      codeA: sessionStore.pendingCodeA,
      codeB: sessionStore.pendingCodeB,
    });
  }
});
</script>

<template>
  <section class="screen-page compat-page">
    <header class="page-header">
      <div class="page-tag">{{ t("compatTag") }}</div>
      <h1 class="page-title">{{ t("compatTitle") }}</h1>
      <p class="page-subtitle">{{ t("compatSubtitle") }}</p>
    </header>

    <div class="section-card">
      <label class="field-label" for="compat-code-a">{{ t("personA") }}</label>
      <div class="code-input-row">
        <input
          id="compat-code-a"
          :value="compatStore.codeA"
          class="code-input"
          maxlength="13"
          placeholder="BLINK-XXXXXX"
          @input="compatStore.setCode('codeA', $event.target.value)"
        />
        <button type="button" class="btn-inline" @click="fillMine">{{ t("fillMine") }}</button>
      </div>
      <p v-if="compatStore.codeErrors.codeA" class="field-error">{{ compatStore.codeErrors.codeA }}</p>
    </div>

    <div class="section-card">
      <label class="field-label" for="compat-code-b">{{ t("personB") }}</label>
      <div class="code-input-row">
        <input
          id="compat-code-b"
          :value="compatStore.codeB"
          class="code-input"
          maxlength="13"
          placeholder="BLINK-XXXXXX"
          @input="compatStore.setCode('codeB', $event.target.value)"
        />
        <button type="button" class="btn-inline" @click="compatStore.swapCodes()">{{ t("swap") }}</button>
      </div>
      <p v-if="compatStore.codeErrors.codeB" class="field-error">{{ compatStore.codeErrors.codeB }}</p>
    </div>

    <button type="button" class="btn-primary" :disabled="compatStore.lookupLoading" @click="submitCodes">
      {{ compatStore.lookupLoading ? "…" : `${t("match")} →` }}
    </button>

    <div v-if="compatStore.currentReportId && compatStore.isCurrentReportPending" class="section-card section-card--highlight">
      <div class="field-label">{{ t("pendingReport") }}</div>
      <p class="section-card__body">
        {{ compatStore.codeA || "BLINK-XXXXXX" }} × {{ compatStore.codeB || "BLINK-XXXXXX" }}
      </p>
      <button type="button" class="btn-secondary" @click="openHistoryReport(compatStore.currentReportId)">
        {{ t("pendingReport") }}
      </button>
    </div>

    <div class="section-card">
      <div class="field-label">{{ t("history") }}</div>
      <div v-if="compatStore.historyLoading" class="history-empty">{{ t("loadingHistory") }}</div>
      <div v-else-if="!compatStore.history.length" class="history-empty">{{ t("noHistory") }}</div>
      <div v-else class="history-stack">
        <button
          v-for="item in compatStore.history"
          :key="item.report_id"
          type="button"
          class="history-item"
          @click="openHistoryReport(item.report_id)"
        >
          <div>
            <div class="history-item__codes">{{ item.code_a }} × {{ item.code_b }}</div>
            <div class="history-item__date">{{ formatMonthYear(item.generated_at, sessionStore.lang) }}</div>
          </div>
          <div class="history-item__score">{{ formatPercent(item.compat_score) }}</div>
        </button>
      </div>
    </div>
  </section>
</template>
