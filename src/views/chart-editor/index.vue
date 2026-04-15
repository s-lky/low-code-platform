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
            柱状图
          </button>
          <button 
            class="type-btn" 
            :class="{ active: chartType === 'line' }"
            @click="switchChartType('line')"
          >
            折线图
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
        <!-- AI 智能生成区域 -->
        <div class="ai-generator-section" :class="{ 'dark-theme': isDarkMode }">
          <div class="ai-top-row">
            <!-- 左侧：用户输入区域 -->
            <div class="ai-input-area">
              <textarea 
                v-model="aiPrompt" 
                placeholder="描述你想要的图表，例如：生成一个展示2020-2024年各季度销售额的柱状图..."
                class="ai-prompt-input"
                @keydown.ctrl.enter="handleAIGenerate"
              ></textarea>
            </div>
            <!-- 右侧：AI生成的JSON数据 -->
            <div class="ai-json-area">
              <div v-if="aiStore.streamContent" class="json-preview">
                <pre>{{ aiStore.streamContent }}</pre>
              </div>
              <div v-else class="json-placeholder">
                <span class="placeholder-text">AI 生成的 JSON 数据将在这里显示</span>
              </div>
            </div>
            <!-- 生成按钮 -->
            <button class="btn ai-generate-btn" @click="handleAIGenerate" :disabled="aiStore.loading">
              <span v-if="aiStore.loading" class="loading-spinner"></span>
              {{ aiStore.loading ? 'AI 生成中...' : 'AI 生成图表' }}
            </button>
          </div>
        </div>

        <!-- 图表展示区域（可滚动查看所有生成的图表） -->
        <div class="charts-display-area" :class="{ 'dark-theme': isDarkMode }">
          <div v-if="!generatedCharts.length" class="charts-empty">
            <span class="empty-text">使用 AI 生成图表或手动编辑数据</span>
          </div>
          <div v-else class="charts-list">
            <div 
              v-for="(chart, index) in generatedCharts" 
              :key="index" 
              class="chart-item"
            >
              <div class="chart-item-header">
                <h4>{{ chart.title || `图表 ${index + 1}` }}</h4>
                <button class="btn-small" @click="loadChart(index)">编辑此图表</button>
              </div>
              <div ref="chartRefs" :id="`chart-${index}`" class="chart-item-container"></div>
            </div>
          </div>
          
          <!-- 当前图表预览（保留原有功能） -->
          <div class="current-chart-wrapper">
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
        </div>
      </div>

      <!-- 右侧Excel数据编辑区 -->
      <div class="data-editor-area">
        <div class="data-editor-header">
          <div class="editor-tabs">
            <button class="tab-btn" :class="{ active: activeTab === 'data' }" @click="switchTab('data')">数据</button>
            <button class="tab-btn" :class="{ active: activeTab === 'import' }" @click="switchTab('import')">导入</button>
            <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="switchTab('settings')">设置</button>
          </div>
          <div class="editor-actions">
            <button class="btn-small" @click="clearData">清空</button>
            <button class="btn-small" @click="exportData">导出</button>
          </div>
        </div>
        
        <!-- 数据标签页内容 -->
        <div v-if="activeTab === 'data'" class="excel-table-wrapper">
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
        
        <!-- 导入标签页内容 -->
        <div v-if="activeTab === 'import'" class="import-panel">
          <div class="import-steps">
            <div class="step">
              <span class="step-number">1</span>
              <span class="step-label">下载模板</span>
              <span class="step-desc">使用Excel打开</span>
            </div>
            <div class="step-connector"></div>
            <div class="step">
              <span class="step-number">2</span>
              <span class="step-label">填数据</span>
              <span class="step-desc">编辑你的数据</span>
            </div>
            <div class="step-connector"></div>
            <div class="step">
              <span class="step-number">3</span>
              <span class="step-label">拖拽到这</span>
              <span class="step-desc">或点击导入</span>
            </div>
          </div>
          
          <div class="import-actions">
            <button class="btn-download" @click="downloadTemplate">
              📥 下载模板
            </button>
            <button class="btn-upload" @click="triggerFileInput">
              📤 选择文件导入
            </button>
          </div>
          
          <input 
            ref="fileInputRef"
            type="file" 
            accept=".xlsx,.xls,.csv"
            @change="handleFileImport"
            style="display: none"
          />
        </div>
        
        <!-- 设置标签页内容 -->
        <div v-if="activeTab === 'settings'" class="settings-panel">
          <div class="settings-group">
            <h4 class="settings-group-title">标题</h4>
            <div class="settings-row">
              <label>主标题</label>
              <input v-model="chartTitle" type="text" placeholder="请输入标题" />
            </div>
            <div class="settings-row">
              <label>字体大小</label>
              <select v-model="titleFontSize">
                <option :value="12">12号</option>
                <option :value="14">14号</option>
                <option :value="16">16号</option>
                <option :value="18">18号</option>
                <option :value="20">20号</option>
              </select>
            </div>
          </div>
          
          <div class="settings-group">
            <h4 class="settings-group-title">X轴</h4>
            <div class="settings-row">
              <label>名称</label>
              <input v-model="xAxisName" type="text" placeholder="例如：时间" />
            </div>
            <div class="settings-row">
              <label>字体大小</label>
              <select v-model="xAxisFontSize">
                <option :value="12">12号</option>
                <option :value="14">14号</option>
                <option :value="16">16号</option>
              </select>
            </div>
          </div>

          <div class="settings-group">
            <h4 class="settings-group-title">Y轴</h4>
            <div class="settings-row">
              <label>名称</label>
              <input v-model="yAxisName" type="text" placeholder="例如：数量" />
            </div>
            <div class="settings-row">
              <label>字体大小</label>
              <select v-model="yAxisFontSize">
                <option :value="12">12号</option>
                <option :value="14">14号</option>
                <option :value="16">16号</option>
              </select>
            </div>
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
import * as XLSX from 'xlsx'
import { useAIChartStore } from '../../store/useAIChartStore'
import './index.css' // 导入样式

const router = useRouter()
const aiStore = useAIChartStore()

// AI 相关状态
const aiPrompt = ref('')

// 生成的图表历史列表
const generatedCharts = ref<Array<any>>([])
const chartInstanceList = ref<Array<echarts.ECharts | null>>([])
const chartRefs = ref<Array<HTMLElement>>([])

// 主题切换：false=白天（默认），true=黑夜
const isDarkMode = ref(false)

// 切换主题
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  // 更新图表样式
  updateChart()
}

// 右侧面板标签页
const activeTab = ref<'data' | 'import' | 'settings'>('data')

// 隐藏的文件输入框
const fileInputRef = ref<HTMLInputElement | null>(null)

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

// 设置相关变量
const xAxisName = ref('')
const yAxisName = ref('')
const titleFontSize = ref(16)
const xAxisFontSize = ref(14)
const yAxisFontSize = ref(14)

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
      top: 10,
      textStyle: {
        fontSize: titleFontSize.value,
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
      name: xAxisName.value,
      nameTextStyle: {
        fontSize: xAxisFontSize.value,
        color: isDarkMode.value ? '#ccc' : '#666'
      },
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
      name: yAxisName.value,
      nameTextStyle: {
        fontSize: yAxisFontSize.value,
        color: isDarkMode.value ? '#ccc' : '#666'
      },
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
watch([chartType, chartTitle, columnCount, columnHeaders, rowHeaders, rowData, xAxisName, yAxisName, titleFontSize, xAxisFontSize, yAxisFontSize], () => {
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

// 切换标签页
const switchTab = (tab: 'data' | 'import' | 'settings') => {
  activeTab.value = tab
}

// 下载Excel模板
const downloadTemplate = () => {
  // 创建工作簿
  const wb = XLSX.utils.book_new()
  
  // 准备表头数据
  const headers = [['', '分类一', '分类二']]
  
  // 准备示例数据
  const data = [
    ['2017', '55', '76'],
    ['2018', '65', '49'],
    ['2019', '80', '71'],
    ['2020', '46', '65'],
    ['2021', '44', '58'],
    ['2022', '71', '31'],
    ['2023', '88', '64'],
    ['2024', '80', '75']
  ]
  
  // 合并表头和数据
  const worksheetData = [...headers, ...data]
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(worksheetData)
  
  // 设置列宽
  ws['!cols'] = [
    { wch: 15 }, // 第一列（年份）
    { wch: 15 }, // 分类一
    { wch: 15 }  // 分类二
  ]
  
  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '图表数据')
  
  // 生成Excel文件并下载
  XLSX.writeFile(wb, '图表数据模板.xlsx')
}

// 触发文件选择
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// 处理文件导入
const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const data = e.target?.result
      const workbook = XLSX.read(data, { type: 'array' })
      
      // 获取第一个工作表
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // 将工作表转换为JSON（数组格式）
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      
      if (jsonData.length === 0) {
        alert('Excel文件为空，请检查文件内容')
        return
      }
      
      // 解析表头（第一行）
      const headerRow = jsonData[0] || []
      const newColumnHeaders = headerRow.map((h: any) => String(h || ''))
      
      // 解析数据行（从第二行开始）
      const dataRows = jsonData.slice(1).filter((row: any[]) => row.length > 0 && row[0] !== undefined && row[0] !== '')
      
      if (dataRows.length === 0) {
        alert('Excel文件没有有效数据行')
        return
      }
      
      // 提取行标题（第一列）和数据
      const newRowHeaders: string[] = []
      const newRowData: string[][] = []
      
      dataRows.forEach((row: any[]) => {
        newRowHeaders.push(String(row[0] || ''))
        newRowData.push(row.slice(1).map((cell: any) => String(cell || '0')))
      })
      
      // 更新数据
      columnHeaders.value = newColumnHeaders
      rowHeaders.value = newRowHeaders
      rowData.value = newRowData
      columnCount.value = newColumnHeaders.length
      
      // 切换到数据标签页
      activeTab.value = 'data'
      
      alert('Excel数据导入成功！')
    } catch (error) {
      console.error('导入Excel文件失败:', error)
      alert('导入失败，请检查文件格式是否正确')
    }
  }
  
  reader.readAsArrayBuffer(file)
  
  // 清空文件输入框，允许重复选择同一文件
  target.value = ''
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

// AI 智能生成图表
const handleAIGenerate = async () => {
  if (!aiPrompt.value.trim()) {
    alert('请输入图表描述')
    return
  }

  try {
    const option = await aiStore.generateChart(aiPrompt.value)
    
    if (option) {
      // 将生成的图表配置保存到历史列表
      generatedCharts.value.push({
        option: JSON.parse(JSON.stringify(option)),
        title: option.title?.text || '未命名图表'
      })
      
      // 同时应用到当前编辑的图表
      applyAIChartOption(option)
      
      // 等待 DOM 更新后渲染所有图表
      await nextTick()
      renderAllGeneratedCharts()
      
      alert('AI 图表生成成功！')
    }
  } catch (error) {
    console.error('AI 生成失败:', error)
    alert('AI 生成失败，请重试')
  }
}

// 渲染所有已生成的图表
const renderAllGeneratedCharts = () => {
  // 销毁旧的实例
  chartInstanceList.value.forEach(instance => {
    if (instance) {
      instance.dispose()
    }
  })
  chartInstanceList.value = []
  
  // 渲染每个图表
  generatedCharts.value.forEach((chart, index) => {
    const chartElement = document.getElementById(`chart-${index}`)
    if (chartElement && chart.option) {
      const instance = markRaw(echarts.init(chartElement))
      instance.setOption(chart.option)
      chartInstanceList.value.push(instance)
    }
  })
}

// 加载指定图表到编辑器
const loadChart = (index: number) => {
  const chart = generatedCharts.value[index]
  if (chart && chart.option) {
    applyAIChartOption(chart.option)
  }
}

// 应用 AI 生成的图表配置
const applyAIChartOption = (option: any) => {
  // 提取标题
  if (option.title && option.title.text) {
    chartTitle.value = option.title.text
  }

  // 提取 X 轴数据
  if (option.xAxis && option.xAxis.data) {
    rowHeaders.value = option.xAxis.data.map((item: any) => String(item))
  }

  // 提取系列数据
  if (option.series && Array.isArray(option.series)) {
    const firstSeries = option.series[0]
    if (firstSeries) {
      // 判断图表类型
      if (firstSeries.type === 'line') {
        chartType.value = 'line'
      } else {
        chartType.value = 'bar'
      }

      // 提取列头和数据
      const newColumnHeaders = ['', ...option.series.map((s: any) => s.name || '分类')]
      const newRowData = rowHeaders.value.map((_, rowIndex) => {
        return option.series.map((s: any) => String(s.data[rowIndex] || 0))
      })

      columnHeaders.value = newColumnHeaders
      rowData.value = newRowData
      columnCount.value = newColumnHeaders.length
    }
  }

  // 提取轴名称
  if (option.xAxis && option.xAxis.name) {
    xAxisName.value = option.xAxis.name
  }
  if (option.yAxis && option.yAxis.name) {
    yAxisName.value = option.yAxis.name
  }

  // 更新图表显示
  updateChart()
}
</script>
