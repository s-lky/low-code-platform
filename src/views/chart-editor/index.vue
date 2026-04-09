<template>
  <div class="chart-editor-container" :class="{ 'dark-theme': isDarkMode }">
    <!-- 顶部工具栏 -->
    <header class="chart-editor-header">
      <div class="header-left">
        <h2 class="page-title">生成图表</h2>
        <div class="chart-type-selector">
          <button 
            class="type-btn" 
            :class="{ active: chartType === 'bar' }"
            @click="switchChartType('bar')"
          >
            📊 柱状图
          </button>
          <button 
            class="type-btn" 
            :class="{ active: chartType === 'line' }"
            @click="switchChartType('line')"
          >
            📈 折线图
          </button>
        </div>
      </div>
      <div class="header-right">
        <button class="btn theme-btn" @click="toggleTheme" :title="isDarkMode ? '切换白天' : '切换黑夜'">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </button>
        <button class="btn icon-btn" @click="goBack" title="返回主页">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button class="btn" @click="saveChart">保存</button>
        <button class="btn" @click="previewChart">预览</button>
        <button class="btn primary" @click="publishChart">发布</button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="chart-editor-content">
      <!-- 左侧图表展示区 -->
      <div class="chart-preview-area">
        <div class="chart-title-input">
          <input 
            type="text" 
            v-model="chartTitle" 
            placeholder="输入图表标题"
            class="title-input"
          />
        </div>
        <div class="chart-wrapper">
          <div ref="chartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 右侧Excel数据编辑区 -->
      <div class="data-editor-area">
        <div class="data-editor-header">
          <div class="editor-tabs">
            <button class="tab-btn active">数据</button>
            <button class="tab-btn">导入</button>
            <button class="tab-btn">设置</button>
          </div>
          <div class="editor-actions">
            <button class="btn-small" @click="clearData">清空</button>
            <button class="btn-small" @click="exportData">导出</button>
          </div>
        </div>
        
        <div class="excel-table-wrapper">
          <table class="excel-table">
            <thead>
              <tr>
                <th class="row-header-cell"></th>
                <th 
                  v-for="(col, index) in columnCount" 
                  :key="index"
                  class="column-header"
                >
                  <input 
                    v-model="columnHeaders[index]" 
                    class="header-input"
                    placeholder="分类"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in rowData" :key="rowIndex">
                <td class="row-header">
                  <input 
                    v-model="rowHeaders[rowIndex]" 
                    class="row-header-input"
                    placeholder=""
                  />
                </td>
                <td 
                  v-for="(cell, cellIndex) in columnCount" 
                  :key="cellIndex"
                  class="data-cell"
                  :class="{ 'first-column': cellIndex === 0 }"
                >
                  <input 
                    v-model="rowData[rowIndex][cellIndex]" 
                    class="cell-input"
                    :placeholder="cellIndex === 0 ? '数据' : '0'"
                    type="text"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="table-actions">
            <button class="btn-small" @click="addRow">+ 添加行</button>
            <button class="btn-small" @click="removeRow" :disabled="rowData.length <= 2">- 删除行</button>
            <button class="btn-small" @click="addColumn" :disabled="columnCount >= 10">+ 添加列</button>
            <button class="btn-small" @click="removeColumn" :disabled="columnCount <= 2">- 删除列</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, markRaw, computed } from 'vue'
import * as echarts from 'echarts'
import { useResizeObserver } from '@vueuse/core'
import { useRouter } from 'vue-router'
import './index.css' // 导入样式

const router = useRouter()

// 主题切换：false=白天（默认），true=黑夜
const isDarkMode = ref(false)

// 切换主题
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  // 更新图表样式
  updateChart()
}

// 图表类型
const chartType = ref<'bar' | 'line'>('bar')

// 图表标题
const chartTitle = ref('温度变化趋势')

// 图表引用
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 表格数据
const columnCount = ref(3) // 列数（包括第一列）
const rowHeaders = ref(['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'])
const columnHeaders = ref(['', '分类一', '分类二'])
const rowData = ref([
  ['55', '76'],
  ['65', '49'],
  ['80', '71'],
  ['46', '65'],
  ['44', '58'],
  ['71', '31'],
  ['88', '64'],
  ['80', '75']
])

// 返回主页
const goBack = () => {
  router.push('/')
}

// 切换图表类型
const switchChartType = (type: 'bar' | 'line') => {
  chartType.value = type
  updateChart()
}

// 获取图表配置
const getChartOption = () => {
  // 构建系列数据
  const series = []
  const seriesNames = []
  
  // 从第二列开始是数据列
  for (let col = 1; col < columnCount.value; col++) {
    const seriesData: number[] = []
    for (let row = 0; row < rowData.value.length; row++) {
      const value = rowData.value[row][col - 1]
      seriesData.push(Number(value) || 0)
    }
    
    series.push({
      name: columnHeaders.value[col],
      type: chartType.value,
      data: seriesData,
      smooth: chartType.value === 'line',
      symbol: chartType.value === 'line' ? 'circle' : undefined,
      symbolSize: chartType.value === 'line' ? 6 : undefined
    })
    
    seriesNames.push(columnHeaders.value[col])
  }
  
  // X轴数据
  const xAxisData = rowHeaders.value
  
  // 颜色配置
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']
  
  return {
    title: {
      text: chartTitle.value,
      left: 'center',
      textStyle: {
        fontSize: 16,
        color: isDarkMode.value ? '#fff' : '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: chartType.value === 'bar' ? 'shadow' : 'line'
      }
    },
    legend: {
      data: seriesNames,
      bottom: 10,
      textStyle: {
        color: isDarkMode.value ? '#fff' : '#666'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '50px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        color: isDarkMode.value ? '#ccc' : '#666'
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode.value ? '#555' : '#ddd'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: isDarkMode.value ? '#ccc' : '#666'
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode.value ? '#555' : '#ddd'
        }
      },
      splitLine: {
        lineStyle: {
          color: isDarkMode.value ? '#333' : '#eee'
        }
      }
    },
    series: series,
    color: colors
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return
  chartInstance.setOption(getChartOption())
}

// 监听数据变化自动更新图表
watch([chartType, chartTitle, columnCount, columnHeaders, rowHeaders, rowData], () => {
  updateChart()
}, { deep: true })

// 初始化图表
onMounted(async () => {
  await nextTick()
  
  if (chartRef.value) {
    chartInstance = markRaw(echarts.init(chartRef.value))
    updateChart()
  }
  
  // 尝试从 localStorage 加载之前保存的数据（包括模板）
  const savedData = localStorage.getItem('chart-editor-data')
  if (savedData) {
    try {
      const data = JSON.parse(savedData)
      chartType.value = data.chartType || 'bar'
      chartTitle.value = data.title || '温度变化趋势'
      columnHeaders.value = data.columnHeaders || ['', '分类一', '分类二']
      rowHeaders.value = data.rowHeaders || ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024']
      rowData.value = data.rowData || [
        ['55', '76'],
        ['65', '49'],
        ['80', '71'],
        ['46', '65'],
        ['44', '58'],
        ['71', '31'],
        ['88', '64'],
        ['80', '75']
      ]
      columnCount.value = columnHeaders.value.length
    } catch (e) {
      console.error('加载图表数据失败:', e)
    }
  }
})

// 监听容器大小变化
useResizeObserver(chartRef, () => {
  if (chartInstance) {
    chartInstance.resize()
  }
})

// 销毁图表实例
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

// 添加行
const addRow = () => {
  rowHeaders.value.push(`${new Date().getFullYear() + rowData.value.length - 2017}`)
  rowData.value.push(new Array(columnCount.value - 1).fill('0'))
}

// 删除行
const removeRow = () => {
  if (rowData.value.length > 2) {
    rowHeaders.value.pop()
    rowData.value.pop()
  }
}

// 添加列
const addColumn = () => {
  if (columnCount.value < 10) {
    columnCount.value++
    columnHeaders.value.push(`分类${columnCount.value - 1}`)
    rowData.value.forEach(row => {
      row.push('0')
    })
  }
}

// 删除列
const removeColumn = () => {
  if (columnCount.value > 2) {
    columnCount.value--
    columnHeaders.value.pop()
    rowData.value.forEach(row => {
      row.pop()
    })
  }
}

// 清空数据
const clearData = () => {
  if (confirm('确定要清空所有数据吗？')) {
    rowHeaders.value = ['2017', '2018']
    columnHeaders.value = ['', '分类一', '分类二']
    rowData.value = [
      ['0', '0'],
      ['0', '0']
    ]
    columnCount.value = 3
  }
}

// 导出数据
const exportData = () => {
  const data = {
    chartType: chartType.value,
    title: chartTitle.value,
    columnHeaders: columnHeaders.value,
    rowHeaders: rowHeaders.value,
    rowData: rowData.value
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chart-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

// 保存图表 - 保存到预览存储，可以在预览页查看
const saveChart = () => {
  const chartData = {
    chartType: chartType.value,
    title: chartTitle.value,
    columnHeaders: columnHeaders.value,
    rowHeaders: rowHeaders.value,
    rowData: rowData.value,
    savedAt: new Date().toLocaleString()
  }
  
  // 保存到预览存储（my-go-view-data），这样预览页可以读取
  localStorage.setItem('my-go-view-data', JSON.stringify(chartData))
  localStorage.setItem('chart-editor-data', JSON.stringify(chartData))
  alert('图表保存成功！点击“预览”按钮可以查看')
}

// 预览图表
const previewChart = () => {
  // 将当前图表数据保存到预览存储
  const chartData = {
    chartType: chartType.value,
    title: chartTitle.value,
    columnHeaders: columnHeaders.value,
    rowHeaders: rowHeaders.value,
    rowData: rowData.value
  }
  
  localStorage.setItem('chart-preview-data', JSON.stringify(chartData))
  router.push({ path: '/preview', query: { type: 'chart', from: 'chart-editor' } })
}

// 发布图表 - 发布到“我的模板”
const publishChart = () => {
  const templateName = prompt('请输入模板名称：', chartTitle.value || '我的图表')
  if (!templateName || !templateName.trim()) {
    return
  }
  
  const chartData = {
    chartType: chartType.value,
    title: chartTitle.value,
    columnHeaders: columnHeaders.value,
    rowHeaders: rowHeaders.value,
    rowData: rowData.value,
    publishedAt: new Date().toLocaleString()
  }
  
  // 构建模板数据，格式与组件编辑器的模板一致
  const templateData = {
    id: Date.now(),
    title: templateName.trim(),
    data: JSON.stringify(chartData),
    image: '',
    createdAt: new Date().toLocaleString(),
    type: 'chart' // 标记为图表模板
  }
  
  // 从 localStorage 读取现有模板列表
  const existingTemplates = localStorage.getItem('my-go-view-templates')
  const templates = existingTemplates ? JSON.parse(existingTemplates) : []
  templates.push(templateData)
  
  // 保存到 localStorage
  localStorage.setItem('my-go-view-templates', JSON.stringify(templates))
  
  alert('图表发布成功！已保存到“我的模板”')
}
</script>
