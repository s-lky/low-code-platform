<!-- components/AIChartGenerator.vue -->
<template>
  <div class="ai-chart-generator">
    <div class="input-area">
      <textarea
        v-model="prompt"
        placeholder="描述你想要的图表，例如：生成一个展示2020-2024年各季度销售额的堆叠柱状图..."
        @keydown.ctrl.enter="handleGenerate"
      />
      <button @click="handleGenerate" :disabled="aiStore.loading">
        <span v-if="aiStore.loading" class="loading-spinner" />
        {{ aiStore.loading ? 'AI 生成中...' : 'AI 生成图表' }}
      </button>
    </div>

    <!-- 流式输出的 Markdown 预览区（对应图一亮点3） -->
    <div v-if="aiStore.streamContent" class="stream-preview">
      <div class="skeleton" v-if="aiStore.loading && !chartOption">
        <!-- 骨架屏（对应图一亮点4） -->
        <div class="skeleton-bar" v-for="i in 5" :key="i" />
      </div>
      <pre>{{ aiStore.streamContent }}</pre>
    </div>

    <!-- 生成的图表预览 -->
    <div v-if="chartOption" ref="chartRef" class="chart-preview" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useAIChartStore } from '@/store/useAIChartStore'

const aiStore = useAIChartStore()
const prompt = ref('')
const chartOption = ref<any>(null)
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

async function handleGenerate() {
  if (!prompt.value.trim()) return
  try {
    const option = await aiStore.generateChart(prompt.value)
    chartOption.value = option
    await nextTick()
    renderChart(option)
  } catch (e: any) {
    console.error('生成失败:', e)
    alert('AI 生成失败: ' + (e.message || '未知错误，请重试'))
  }
}

function renderChart(option: any) {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption(option)
}
</script>