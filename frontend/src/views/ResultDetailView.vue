<script setup>
import { computed, ref } from "vue";
import RadarChart from "../components/common/RadarChart.vue";
import { useProfileStore } from "../stores/useProfileStore";
import { useSessionStore } from "../stores/useSessionStore";
import { translate } from "../utils/i18n";

const profileStore = useProfileStore();
const sessionStore = useSessionStore();
const activeTab = ref("analysis");

function t(key, params) {
  return translate(sessionStore.lang, key, params);
}

const strengths = computed(() => profileStore.strengths || []);
const blindSpots = computed(() => profileStore.blindSpots || []);
</script>

<template>
  <section class="screen-page detail-page">
    <header class="result-hero result-hero--detail">
      <div class="result-hero__type">{{ profileStore.mbti || "—" }}</div>
      <div class="result-hero__name">{{ profileStore.poeticName || "—" }}</div>
      <div class="result-hero__attachment">{{ profileStore.attachmentLabel }} · Attachment Style</div>
    </header>

    <div class="tab-row">
      <button type="button" class="tab-button" :class="{ 'is-active': activeTab === 'analysis' }" @click="activeTab = 'analysis'">
        {{ t("analysisTab") }}
      </button>
      <button type="button" class="tab-button" :class="{ 'is-active': activeTab === 'letter' }" @click="activeTab = 'letter'">
        {{ t("loveLetterTab") }}
      </button>
    </div>

    <template v-if="activeTab === 'analysis'">
      <div class="section-card">
        <div class="field-label">{{ t("emotionalScan") }}</div>
        <RadarChart :values="profileStore.radarMetrics" />
      </div>

      <div class="section-card">
        <div class="field-label">{{ t("soulMatch") }}</div>
        <div class="match-row">
          <div class="match-chip">{{ profileStore.soulMatchMbti }}</div>
          <div>
            <strong>{{ profileStore.soulMatchName }}</strong>
            <p class="section-card__body">{{ profileStore.soulMatchReason || "—" }}</p>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="field-label">{{ t("strengths") }}</div>
        <div class="bullet-stack">
          <div v-for="(item, index) in strengths" :key="`strength-${index}`" class="bullet-card">
            <span class="bullet-card__index">{{ index + 1 }}</span>
            <span>{{ item.text || item }}</span>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="field-label">{{ t("blindSpots") }}</div>
        <div class="bullet-stack">
          <div v-for="(item, index) in blindSpots" :key="`blind-${index}`" class="bullet-card bullet-card--muted">
            <span class="bullet-card__index">{{ index + 1 }}</span>
            <span>{{ item.text || item }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="section-card">
      <div class="field-label">{{ t("loveLetterTab") }}</div>
      <p class="letter-body">{{ profileStore.loveLetter || "—" }}</p>
    </div>
  </section>
</template>
