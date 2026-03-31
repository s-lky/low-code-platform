<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, markRaw, computed } from 'vue'
import * as echarts from 'echarts'
import { useResizeObserver } from '@vueuse/core' // 监听元素大小变化的超级神器
import type { ComponentDataConfig } from '../types/component'

// 1. 接收父组件（中间画布）传过来的属性
const props = defineProps<{
  propValue: {
    title: string;
    // 以后这里可以加上 color, data 等各种属性
  }
  dataConfig?: ComponentDataConfig;  // 新增：数据配置
}>()

// 2. 获取 DOM 元素的引用
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 3. ECharts 初始化配置
const getOption = () => {
  // 从 dataConfig 中解析数据
  let xAxisData: string[] = []
  let seriesData: number[] = []
  
  if (props.dataConfig?.staticData) {
    try {
      const data = JSON.parse(props.dataConfig.staticData)
      if (Array.isArray(data)) {
        // 根据字段映射提取数据
        xAxisData = data.map((item: any) => item[props.dataConfig.xField])
        seriesData = data.map((item: any) => item[props.dataConfig.yField])
      }
    } catch (e) {
      console.error('解析静态数据失败:', e)
    }
  }
  
  return {
    // 标题文字直接使用传进来的 propValue.title
    title: { 
      text: props.propValue.title, 
      textStyle: { color: '#fff' } 
    },
    tooltip: {},
    grid: {
      top: '40px',
      left: '10%',
      right: '10%',
      bottom: '20px',
      containLabel: true // 确保坐标轴标签不会超出边界
    },
    xAxis: {
      type: 'category',
      data: xAxisData.length > 0 ? xAxisData : ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLabel: { color: '#ccc' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#ccc' }
    },
    series: [
      {
        name: '销量',
        type: 'bar',
        data: seriesData.length > 0 ? seriesData : [120, 200, 150, 80, 70, 110, 130],
        itemStyle: { color: '#00e5ff' } 
      }
    ]
  }
}

// 4. 组件挂载时初始化图表（合并为你写的最优版本）
onMounted(async () => {
  //让 DOM 完全画好再去初始化图表
  await nextTick() 
  
  if (chartRef.value) {
    //用 markRaw 告诉 Vue “不要代理这个 ECharts 对象"
    chartInstance = markRaw(echarts.init(chartRef.value))
    chartInstance.setOption(getOption())
  }
})

// 5.监听容器大小变化
// 在外层拖拽外框修改宽度高度时，自动让图表重新自适应
useResizeObserver(chartRef, () => {
  if (chartInstance) {
    chartInstance.resize()
  }
})

// 6.监听业务属性变化
// 当你在右侧面板修改了标题等数据时，重新 setOption
watch(() => props.propValue, () => {
  if (chartInstance) {
    chartInstance.setOption(getOption())
  }
}, { deep: true }) // 深度监听对象内部的变化

// 7. 监听 dataConfig 变化
watch(() => props.dataConfig, () => {
  if (chartInstance) {
    chartInstance.setOption(getOption())
  }
}, { deep: true })

// 7. 组件销毁时一定要销毁 ECharts 实例
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<template>
  <!-- ECharts 图表真正的容器，必须是 100% 宽高才能跟随父元素（拖拽框）变化 -->
  <div ref="chartRef" style="width: 100%; height: 100%;"></div>
</template>