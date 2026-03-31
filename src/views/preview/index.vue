<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import VBarChart from '../../packages/VBarChart.vue'
import VLineChart from '../../packages/VLineChart.vue'
import type { ComponentDataConfig } from '../../types/component'

const router = useRouter()
const componentMap: Record<string, any> = { VBarChart, VLineChart }

const componentData = ref<any[]>([])
// 假设我们的设计稿就是 1920 * 1080
const canvasWidth = 1920
const canvasHeight = 1080

// 记录当前的缩放比例
const scale = ref(1)

// 计算缩放比例
const updateScale = () => {
  // 获取当前浏览器视口的宽高
  const currentW = window.innerWidth
  const currentH = window.innerHeight

  // 分别计算宽度比例和高度比例
  const wScale = currentW / canvasWidth
  const hScale = currentH / canvasHeight

  // 选用最小的那个比例，保证大屏能完整地、等比例地显示在屏幕里，不被裁剪！
  scale.value = Math.min(wScale, hScale)
}

onMounted(() => {
  const savedData = localStorage.getItem('my-go-view-data')
  if (savedData) componentData.value = JSON.parse(savedData)

  // 进页面时先算一次比例
  updateScale()
  // 监听浏览器窗口大小改变，实时重新计算比例！
  window.addEventListener('resize', updateScale)
})

onUnmounted(() => {
  // 离开页面时销毁监听，保持好习惯
  window.removeEventListener('resize', updateScale)
})
</script>

<template>
  <div class="preview-viewport">
    <button class="back-btn" @click="router.push('/')">🔙 返回编辑器</button>

    <!-- 宽高固定是 1920x1080 -->
    <!-- 利用 scale 进行缩放，利用 translate(-50%, -50%) 把它永远钉在屏幕正中间 -->
    <div 
      class="canvas-screen"
      :style="{
        width: canvasWidth + 'px',
        height: canvasHeight + 'px',
        transform: `translate(-50%, -50%) scale(${scale})`
      }"
    >
      <div
        v-for="item in componentData"
        :key="item.id"
        class="preview-component"
        :style="{
          left: item.style.left + 'px',
          top: item.style.top + 'px',
          width: item.style.width + 'px',
          height: item.style.height + 'px'
        }"
      >
        <component 
          :is="componentMap[item.component]" 
          :propValue="item.propValue"
          :dataConfig="item.dataConfig"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 最外层的视口，充满整个浏览器，超出部分隐藏，防止出现滚动条 */
.preview-viewport {
  width: 100vw;
  height: 100vh;
  background-color: #000; /* 视口背景通常是纯黑 */
  overflow: hidden;
  position: relative;
}

/* 核心大屏容器：永远 1920x1080，利用绝对定位配合 transform 居中缩放 */
.canvas-screen {
  position: absolute;
  top: 50%;
  left: 50%;
  /* 这里的 transform 已经在 inline-style 里动态绑定了 */
  transform-origin: center center;
  background-color: #0f1011;
  /* 边框和发光 */
  box-shadow: 0 0 30px rgba(0, 229, 255, 0.2);
  border: 1px solid rgba(0, 229, 255, 0.1);
}

.preview-component {
  position: absolute;
}

.back-btn {
  position: absolute; top: 20px; right: 20px; z-index: 999;
  padding: 10px 20px; background: rgba(255, 255, 255, 0.1);
  color: #00e5ff; border: 1px solid #00e5ff; border-radius: 4px; cursor: pointer;
}
.back-btn:hover { background: rgba(0, 229, 255, 0.2); }
</style>