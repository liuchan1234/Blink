<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useProfileStore } from "../../stores/useProfileStore";
import { useSessionStore } from "../../stores/useSessionStore";
import { useUiStore } from "../../stores/useUiStore";
import { translate } from "../../utils/i18n";

const uiStore = useUiStore();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const { posterSheet } = storeToRefs(uiStore);
const canvasRef = ref(null);

const posterText = computed(() => ({
  title: profileStore.mbti || "BLINK",
  subtitle: profileStore.poeticName || "Preview",
  attachment: profileStore.attachmentLabel || "—",
  code: profileStore.blinkCode || "BLINK-XXXXXX",
  quote: profileStore.monologue || profileStore.oneLine || "A soft reading for browser preview.",
}));

function drawPoster() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#0a0818";
  context.fillRect(0, 0, width, height);

  const gradient = context.createRadialGradient(width * 0.35, height * 0.2, 0, width * 0.35, height * 0.2, width * 0.7);
  gradient.addColorStop(0, "rgba(155,109,255,0.35)");
  gradient.addColorStop(1, "rgba(10,8,24,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#f4f2ff";
  context.font = "700 70px Inter";
  context.textAlign = "center";
  context.fillText(posterText.value.title, width / 2, 190);

  context.font = "italic 44px Playfair Display, serif";
  context.fillStyle = "#d7cafc";
  context.fillText(posterText.value.subtitle, width / 2, 255);

  context.strokeStyle = "rgba(255,255,255,0.16)";
  context.beginPath();
  context.moveTo(90, 330);
  context.lineTo(width - 90, 330);
  context.stroke();

  context.font = "600 24px Inter";
  context.fillStyle = "#d4ff00";
  context.fillText(posterText.value.attachment, width / 2, 395);

  context.font = "500 28px Inter";
  context.fillStyle = "#f4f2ff";
  wrapText(context, posterText.value.quote, width / 2, 510, 500, 38);

  context.font = "700 26px JetBrains Mono, monospace";
  context.fillStyle = "#9b6dff";
  context.fillText(posterText.value.code, width / 2, 830);

  context.font = "500 20px Inter";
  context.fillStyle = "rgba(244,242,255,0.75)";
  context.fillText(translate(sessionStore.lang, "posterHint"), width / 2, 930);
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) lines.push(currentLine);

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function downloadPoster() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const link = document.createElement("a");
  link.download = `${profileStore.blinkCode || "blink-poster"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

watch(
  () => posterSheet.value.open,
  (open) => {
    if (open) {
      requestAnimationFrame(() => drawPoster());
    }
  },
);
</script>

<template>
  <transition name="fade">
    <div v-if="posterSheet.open" class="modal-overlay" @click.self="uiStore.closePoster()">
      <div class="sheet-modal sheet-modal--poster">
        <div class="sheet-modal__handle"></div>
        <canvas ref="canvasRef" class="poster-canvas" width="750" height="1125"></canvas>
        <div class="poster-actions">
          <button type="button" class="btn-primary" @click="downloadPoster">
            {{ translate(sessionStore.lang, "savePoster") }}
          </button>
          <button type="button" class="btn-secondary" @click="uiStore.closePoster()">
            {{ translate(sessionStore.lang, "close") }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
