<script setup>
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useCompatStore } from "../stores/useCompatStore";
import { useSessionStore } from "../stores/useSessionStore";
import { formatMonthYear, formatPercent, newlineToBr } from "../utils/formatters";
import { translate } from "../utils/i18n";

const route = useRoute();
const compatStore = useCompatStore();
const sessionStore = useSessionStore();

const reportId = computed(() => String(route.params.reportId || ""));
const report = computed(() => compatStore.currentReport || {});
const dimensions = computed(() => [
  { label: t("dimEmotional"), value: report.value.dim_emotional },
  { label: t("dimCommunication"), value: report.value.dim_communication },
  { label: t("dimGrowth"), value: report.value.dim_growth },
  { label: t("dimIntimacy"), value: report.value.dim_intimacy },
]);

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

async function loadReport() {
  if (!reportId.value) return;
  await compatStore.ensureReportLoaded(reportId.value);
}

onMounted(async () => {
  await loadReport();
});

watch(reportId, async () => {
  await loadReport();
});
</script>

<template>
  <section class="screen-page report-page">
    <header class="report-hero-card">
      <div class="report-hero-card__codes">{{ compatStore.codeA || report.code_a || "BLINK-XXXXXX" }} × {{ compatStore.codeB || report.code_b || "BLINK-XXXXXX" }}</div>
      <div class="report-hero-card__score">{{ formatPercent(report.compat_score, compatStore.isCurrentReportPending ? "…" : "—") }}</div>
      <div class="report-hero-card__date">{{ t("generatedAt") }} · {{ formatMonthYear(report.generated_at, sessionStore.lang) }}</div>
    </header>

    <div v-if="compatStore.isCurrentReportPending" class="section-card section-card--highlight">
      <div class="field-label">{{ t("pendingReport") }}</div>
      <p class="section-card__body">{{ t("generatingCompatTitle") }}</p>
    </div>

    <div v-else-if="compatStore.isCurrentReportFailed" class="section-card section-card--danger">
      <div class="field-label">{{ t("failedReport") }}</div>
      <p class="section-card__body">{{ compatStore.currentErrorCode || t("genericError") }}</p>
      <button type="button" class="btn-primary" :disabled="compatStore.retryLoading" @click="compatStore.retryCompatReport()">
        {{ compatStore.retryLoading ? "…" : t("retryFree") }}
      </button>
    </div>

    <template v-else-if="compatStore.isCurrentReportDone">
      <div class="section-card">
        <div class="field-label">{{ t("coreEnergy") }}</div>
        <p class="section-card__body">{{ report.core_energy }}</p>
      </div>

      <div class="section-card">
        <div class="field-label">{{ t("breakdown") }}</div>
        <div class="dimension-stack">
          <div v-for="dimension in dimensions" :key="dimension.label" class="dimension-row">
            <span>{{ dimension.label }}</span>
            <div class="dimension-row__track">
              <div class="dimension-row__fill" :style="{ width: `${Math.max(0, Math.min(100, Number(dimension.value || 0)))}%` }"></div>
            </div>
            <span>{{ formatPercent(dimension.value) }}</span>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="field-label">{{ t("growthEdges") }}</div>
        <div class="bullet-stack">
          <div v-for="(item, index) in report.growth_edges || []" :key="index" class="bullet-card bullet-card--muted">
            <span class="bullet-card__index">{{ index + 1 }}</span>
            <div>
              <strong>{{ item.trigger }}</strong>
              <p class="section-card__body">{{ item.suggestion }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="field-label">{{ t("loveLanguages") }}</div>
        <div class="language-grid">
          <div class="metric-card">
            <div class="metric-card__label">A</div>
            <div class="metric-card__value language-card__value">{{ report.love_languages?.person_a || "—" }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">B</div>
            <div class="metric-card__value language-card__value">{{ report.love_languages?.person_b || "—" }}</div>
          </div>
        </div>
        <p class="section-card__body">{{ report.love_languages?.match_note || "—" }}</p>
      </div>

      <div class="section-card">
        <div class="field-label">{{ t("letterToPair") }}</div>
        <p class="letter-body" v-html="newlineToBr(report.letter || '')"></p>
      </div>
    </template>

    <div v-else class="section-card section-card--highlight">
      <div class="field-label">{{ t("reportNotFound") }}</div>
      <p class="section-card__body">{{ t("genericError") }}</p>
    </div>
  </section>
</template>
