<script setup>
import { computed } from "vue";

const props = defineProps({
  values: {
    type: Object,
    default: () => ({
      depth: 0,
      guard: 0,
      heat: 0,
      heal: 0,
      read: 0,
    }),
  },
});

const metrics = computed(() => [
  { key: "depth", label: "Depth", color: "#a78bfa", value: Number(props.values.depth || 0) },
  { key: "guard", label: "Guard", color: "#60b8cc", value: Number(props.values.guard || 0) },
  { key: "heat", label: "Heat", color: "#c87a8a", value: Number(props.values.heat || 0) },
  { key: "heal", label: "Heal", color: "#5ec487", value: Number(props.values.heal || 0) },
  { key: "read", label: "Read", color: "#fbbf24", value: Number(props.values.read || 0) },
]);

const points = computed(() => {
  const centerX = 90;
  const centerY = 90;
  const radius = 62;
  const total = metrics.value.length;

  return metrics.value
    .map((metric, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
      const scale = Math.max(0, Math.min(1, metric.value));
      const x = centerX + Math.cos(angle) * radius * scale;
      const y = centerY + Math.sin(angle) * radius * scale;
      return `${x},${y}`;
    })
    .join(" ");
});

const gridPolygons = computed(() => {
  const centerX = 90;
  const centerY = 90;
  const radius = 62;
  const total = metrics.value.length;

  return [0.25, 0.5, 0.75, 1].map((step) =>
    metrics.value
      .map((_, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
        const x = centerX + Math.cos(angle) * radius * step;
        const y = centerY + Math.sin(angle) * radius * step;
        return `${x},${y}`;
      })
      .join(" "),
  );
});
</script>

<template>
  <div class="radar-chart">
    <svg viewBox="0 0 180 180" class="radar-chart__svg" aria-hidden="true">
      <polygon v-for="(polygon, index) in gridPolygons" :key="index" :points="polygon" class="radar-chart__grid" />
      <line
        v-for="(metric, index) in metrics"
        :key="metric.key"
        x1="90"
        y1="90"
        :x2="90 + Math.cos(-Math.PI / 2 + (Math.PI * 2 * index) / metrics.length) * 62"
        :y2="90 + Math.sin(-Math.PI / 2 + (Math.PI * 2 * index) / metrics.length) * 62"
        class="radar-chart__axis"
      />
      <polygon :points="points" class="radar-chart__shape" />
      <circle
        v-for="(metric, index) in metrics"
        :key="`${metric.key}-node`"
        :cx="90 + Math.cos(-Math.PI / 2 + (Math.PI * 2 * index) / metrics.length) * 62 * Math.max(0, Math.min(1, metric.value))"
        :cy="90 + Math.sin(-Math.PI / 2 + (Math.PI * 2 * index) / metrics.length) * 62 * Math.max(0, Math.min(1, metric.value))"
        r="4"
        :fill="metric.color"
      />
    </svg>
    <div class="radar-chart__legend">
      <div v-for="metric in metrics" :key="metric.key" class="radar-chart__legend-item">
        <div class="radar-chart__legend-top">
          <span class="radar-chart__dot" :style="{ backgroundColor: metric.color }"></span>
          <span>{{ metric.label }}</span>
          <span>{{ Math.round(metric.value * 100) }}</span>
        </div>
        <div class="radar-chart__bar-track">
          <div class="radar-chart__bar-fill" :style="{ width: `${Math.round(metric.value * 100)}%`, backgroundColor: metric.color }"></div>
        </div>
      </div>
    </div>
  </div>
</template>
