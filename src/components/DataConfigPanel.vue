<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import type { ComponentDataConfig } from '../types/component'

const props = defineProps<{
  modelValue: ComponentDataConfig | null
  curComponent?: any  // 新增：接收当前选中的组件
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ComponentDataConfig | null]
}>()

// Tab 切换
const activeTab = ref<'style' | 'data'>('data')

// 本地数据副本用于编辑
const localDataConfig = ref<ComponentDataConfig | null>(null)

// 监听外部数据变化
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localDataConfig.value = { ...newVal }
  }
}, { immediate: true, deep: true })

// 保存更改
const saveConfig = () => {
  if (localDataConfig.value) {
    emit('update:modelValue', localDataConfig.value)
  }
}

// 验证 JSON 格式
const isJsonValid = computed(() => {
  if (!localDataConfig.value?.staticData) return true
  try {
    JSON.parse(localDataConfig.value.staticData)
    return true
  } catch {
    return false
  }
})

// CodeMirror 配置
const extensions = [json()]
const cmTheme = oneDark

// API Headers 和 Params 的编辑器
const headersEditor = ref<string>('{}')
const paramsEditor = ref<string>('{}')

// 初始化 Headers 和 Params
watch(() => localDataConfig.value, (newVal) => {
  if (newVal) {
    headersEditor.value = newVal.apiHeaders || '{}'
    paramsEditor.value = newVal.apiParams || '{}'
  }
}, { immediate: true })

// 保存 Headers
const saveHeaders = () => {
  if (localDataConfig.value) {
    try {
      JSON.parse(headersEditor.value)
      localDataConfig.value.apiHeaders = headersEditor.value
    } catch (e) {
      alert('Headers JSON 格式不正确')
    }
  }
}

// 保存 Params
const saveParams = () => {
  if (localDataConfig.value) {
    try {
      JSON.parse(paramsEditor.value)
      localDataConfig.value.apiParams = paramsEditor.value
    } catch (e) {
      alert('参数 JSON 格式不正确')
    }
  }
}

// 测试 API 请求
const testApiRequest = async () => {
  if (!localDataConfig.value?.apiUrl) {
    alert('请先输入 API 地址')
    return
  }

  try {
    const headers = localDataConfig.value.apiHeaders 
      ? JSON.parse(localDataConfig.value.apiHeaders) 
      : {}
    
    const params = localDataConfig.value.apiParams 
      ? JSON.parse(localDataConfig.value.apiParams) 
      : {}

    const config: RequestInit = {
      method: localDataConfig.value.apiMethod || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    // GET 请求将参数添加到 URL
    let url = localDataConfig.value.apiUrl
    if (config.method === 'GET' && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params)
      url += (url.includes('?') ? '&' : '?') + searchParams.toString()
    } else if (config.method === 'POST') {
      config.body = JSON.stringify(params)
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    // 自动填充静态数据
    if (Array.isArray(data)) {
      localDataConfig.value.staticData = JSON.stringify(data, null, 2)
      alert('API 请求成功，数据已填充到静态数据区')
    } else if (typeof data === 'object') {
      // 如果是对象，尝试提取数组
      const arrayData = Object.values(data).find(v => Array.isArray(v))
      if (arrayData) {
        localDataConfig.value.staticData = JSON.stringify(arrayData, null, 2)
        alert('API 请求成功，已自动提取数组数据')
      } else {
        localDataConfig.value.staticData = JSON.stringify([data], null, 2)
        alert('API 请求成功，数据已转换为数组')
      }
    }
  } catch (error: any) {
    alert(`API 请求失败：${error.message}`)
  }
}

// 字段映射提示
const fieldMappingTips = computed(() => {
  if (!localDataConfig.value?.staticData) return ''
  
  try {
    const data = JSON.parse(localDataConfig.value.staticData)
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        const fields = Object.keys(firstItem)
        return `可用字段：${fields.join(', ')}`
      }
    }
  } catch {}
  return ''
})
</script>

<template>
  <div class="data-config-panel">
    <!-- Tab 切换 -->
    <div class="tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'style' }"
        @click="activeTab = 'style'"
      >
        样式配置
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'data' }"
        @click="activeTab = 'data'"
      >
        数据配置
      </button>
    </div>

    <!-- 数据配置内容 -->
    <div v-if="activeTab === 'data'" class="data-content">
      <!-- 数据源类型选择 -->
      <div class="form-item">
        <label class="form-label">数据源类型</label>
        <select v-model="localDataConfig.type" class="form-select">
          <option value="static">静态数据</option>
          <option value="api">动态 API</option>
        </select>
      </div>

      <!-- 静态数据配置 -->
      <div v-if="localDataConfig.type === 'static'" class="section">
        <div class="section-header">
          <h4>静态 JSON 数据</h4>
          <span v-if="!isJsonValid" class="error-tip">JSON 格式错误</span>
        </div>
        <Codemirror
          v-model="localDataConfig.staticData"
          :extensions="extensions"
          :theme="cmTheme"
          style="height: 300px; border-radius: 4px;"
          :tab-size="2"
          :autofocus="true"
          @change="saveConfig"
        />
        <p class="tips">请输入 JSON 数组格式，例如：[{"name": "周一", "value": 120}]</p>
      </div>

      <!-- 动态 API 配置 -->
      <div v-else class="section api-section">
        <div class="form-item">
          <label class="form-label">API 地址</label>
          <input 
            type="text" 
            v-model="localDataConfig.apiUrl" 
            placeholder="https://api.example.com/data"
            class="form-input full-width"
          />
        </div>

        <div class="form-item">
          <label class="form-label">请求方式</label>
          <select v-model="localDataConfig.apiMethod" class="form-select">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
        </div>

        <div class="form-item">
          <label class="form-label">请求 Headers (JSON)</label>
          <Codemirror
            v-model="headersEditor"
            :extensions="extensions"
            :theme="cmTheme"
            style="height: 100px; border-radius: 4px;"
            :tab-size="2"
            @blur="saveHeaders"
          />
        </div>

        <div class="form-item">
          <label class="form-label">请求参数 (JSON)</label>
          <Codemirror
            v-model="paramsEditor"
            :extensions="extensions"
            :theme="cmTheme"
            style="height: 100px; border-radius: 4px;"
            :tab-size="2"
            @blur="saveParams"
          />
        </div>

        <button class="btn btn-test" @click="testApiRequest">
          🧪 测试请求
        </button>

        <div class="form-item" style="margin-top: 15px;">
          <label class="form-label">
            <input 
              type="checkbox" 
              v-model="localDataConfig.autoUpdate" 
              style="margin-right: 5px;"
            />
            自动刷新
          </label>
        </div>

        <div v-if="localDataConfig.autoUpdate" class="form-item">
          <label class="form-label">刷新间隔（秒）</label>
          <input 
            type="number" 
            v-model.number="localDataConfig.interval" 
            min="1"
            placeholder="30"
            class="form-input"
          />
        </div>
      </div>

      <!-- 数据映射 -->
      <div class="section mapping-section">
        <h4>数据映射</h4>
        <p v-if="fieldMappingTips" class="mapping-tips">{{ fieldMappingTips }}</p>
        
        <div class="form-item">
          <label class="form-label">X 轴字段</label>
          <input 
            type="text" 
            v-model="localDataConfig.xField" 
            placeholder="例如：name, date, category"
            class="form-input"
          />
        </div>

        <div class="form-item">
          <label class="form-label">Y 轴字段</label>
          <input 
            type="text" 
            v-model="localDataConfig.yField" 
            placeholder="例如：value, amount, count"
            class="form-input"
          />
        </div>

        <button class="btn btn-primary" @click="saveConfig">
          💾 保存配置
        </button>
      </div>
    </div>

    <!-- 样式配置内容 -->
    <div v-else class="style-content">
      <div v-if="props.curComponent" class="form-container">
        <h3 style="margin-bottom: 20px; color: #00e5ff;">{{ props.curComponent.component }}</h3>

        <!-- 业务属性配置 -->
        <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #444;">
          <h4 style="color: #aaa; margin-bottom: 10px;">业务配置</h4>
          <div class="form-item">
            <label>图表标题：</label>
            <input 
              type="text" 
              v-model="props.curComponent.propValue.title" 
              class="form-input full-width"
            />
          </div>
        </div>

        <!-- 样式配置区 -->
        <h4 style="color: #aaa; margin-bottom: 10px;">样式配置</h4>
        <div class="form-item">
          <label>X 坐标 (Left)</label>
          <input 
            type="number" 
            v-model.number="props.curComponent.style.left" 
            class="form-input"
          />
        </div>
        <div class="form-item">
          <label>Y 坐标 (Top)</label>
          <input 
            type="number" 
            v-model.number="props.curComponent.style.top" 
            class="form-input"
          />
        </div>
        <div class="form-item">
          <label>宽度 (Width)</label>
          <input 
            type="number" 
            v-model.number="props.curComponent.style.width" 
            class="form-input"
          />
        </div>
        <div class="form-item">
          <label>高度 (Height)</label>
          <input 
            type="number" 
            v-model.number="props.curComponent.style.height" 
            class="form-input"
          />
        </div>
      </div>
      <p v-else style="color: #666; font-size: 14px; text-align: center; padding: 20px;">
        请先在画布中选中组件
      </p>
    </div>
  </div>
</template>

<style scoped>
.data-config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #444;
  margin-bottom: 15px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: #00e5ff;
  border-bottom-color: #00e5ff;
  font-weight: bold;
}

.data-content, .style-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
}

.form-item {
  margin-bottom: 15px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #aaa;
  margin-bottom: 6px;
}

.form-input, .form-select {
  width: 100%;
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
}

.form-input.full-width {
  width: 100%;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #00e5ff;
}

.section {
  background: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section h4 {
  color: #00e5ff;
  margin: 0 0 10px 0;
  font-size: 14px;
}

.error-tip {
  color: #ff4d4f;
  font-size: 12px;
}

.tips, .mapping-tips {
  color: #999;
  font-size: 12px;
  margin-top: 8px;
}

.mapping-tips {
  background: rgba(0, 229, 255, 0.1);
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-primary {
  background: #00e5ff;
  color: #000;
  font-weight: bold;
  width: 100%;
}

.btn-primary:hover {
  opacity: 0.8;
}

.btn-test {
  background: rgba(24, 160, 88, 0.2);
  color: #18a058;
  border: 1px solid #18a058;
  margin-top: 10px;
  width: 100%;
}

.btn-test:hover {
  background: #18a058;
  color: #fff;
}

/* 滚动条样式 */
.data-content::-webkit-scrollbar,
.style-content::-webkit-scrollbar {
  width: 6px;
}

.data-content::-webkit-scrollbar-thumb,
.style-content::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.data-content::-webkit-scrollbar-track,
.style-content::-webkit-scrollbar-track {
  background: #222;
}
</style>
