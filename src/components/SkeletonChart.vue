<!-- components/SkeletonChart.vue -->
<template>
  <div class="skeleton-chart">
    <div class="skeleton-title" />
    <div class="skeleton-body">
      <div
        v-for="i in barCount"
        :key="i"
        class="skeleton-bar"
        :style="{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.1}s` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({ barCount: { type: Number, default: 7 } })
</script>

<style scoped>
.skeleton-chart {
  padding: 20px;
  background: #1a1a2e;
  border-radius: 8px;
}
.skeleton-title {
  width: 30%;
  height: 16px;
  background: linear-gradient(90deg, #2a2a3e 25%, #3a3a4e 50%, #2a2a3e 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 20px;
}
.skeleton-body {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 200px;
}
.skeleton-bar {
  flex: 1;
  background: linear-gradient(90deg, #2a2a3e 25%, #3a3a4e 50%, #2a2a3e 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px 4px 0 0;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>