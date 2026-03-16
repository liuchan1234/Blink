<script setup>
import { storeToRefs } from "pinia";
import { useUiStore } from "../../stores/useUiStore";

const uiStore = useUiStore();
const { isLoading } = storeToRefs(uiStore);
</script>

<template>
  <transition name="fade">
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-overlay__card">
        <div class="loading-overlay__spinner"></div>
        <span>Loading…</span>
      </div>
    </div>
  </transition>
</template>
