<script setup lang="ts">
import { useEidtorStore } from '../../store/editor';
import { registry } from '../../packages/registry';
import DataConfigPanel from '../../components/DataConfigPanel.vue';
import { useRouter } from 'vue-router';
import { onMounted, onUnmounted, ref, computed } from 'vue';
import './index.css' // 导入独立的 CSS 文件

const router = useRouter()
const editorStore = useEidtorStore()

// 标记组件是否已注册完成（用于等待异步注册）
const isRegistryReady = ref(false)

// 右侧面板标签页切换
const activeTab = ref('style') // 'style' | 'animation'

// 自定义组件管理相关状态
const showCustomComponentDialog = ref(false)
const customComponentName = ref('')
const customComponentUrl = ref('')
const customComponents = ref<Array<{name: string; url: string}>>([])

// 动画相关状态
const showEmphasis = ref(true)
const showEntrance = ref(true)

// 强调动画列表
const emphasisAnimations = [
  { name: 'bounce', label: '弹跳' },
  { name: 'flash', label: '闪烁' },
  { name: 'pulse', label: '放大缩小' },
  { name: 'rubber-band', label: '放大缩小弹簧' },
  { name: 'shake-x', label: '左右晃动' },
  { name: 'swing', label: '扇形摇摆' },
  { name: 'tada', label: '放大晃动缩小' },
  { name: 'wobble', label: '左右上下晃动' },
  { name: 'jello', label: '扇形摇摆' },
]

// 移入动画列表
const entranceAnimations = [
  { name: 'fade-in', label: '渐显' },
  { name: 'slide-in-right', label: '向右进入' },
  { name: 'slide-in-left', label: '向左进入' },
  { name: 'slide-in-top', label: '向上进入' },
  { name: 'slide-in-bottom', label: '向下进入' },
  { name: 'slide-long-right', label: '向右长距进入' },
  { name: 'slide-long-left', label: '向左长距进入' },
  { name: 'slide-long-top', label: '向上长距进入' },
  { name: 'slide-long-bottom', label: '向下长距进入' },
  { name: 'rotate-in', label: '旋转进入' },
  { name: 'rotate-cw', label: '左顺时针旋转' },
  { name: 'rotate-ccw', label: '右逆时针旋转' },
  { name: 'bounce-in', label: '弹入' },
  { name: 'bounce-in-right', label: '向右弹入' },
  { name: 'bounce-in-left', label: '向左弹入' },
  { name: 'bounce-in-top', label: '向上弹入' },
  { name: 'bounce-in-bottom', label: '向下弹入' },
  { name: 'speed-in-right', label: '光速从右进入' },
  { name: 'speed-in-left', label: '光速从左进入' },
]

// 切换动画分组展开/收起
const toggleEmphasis = () => { showEmphasis.value = !showEmphasis.value }
const toggleEntrance = () => { showEntrance.value = !showEntrance.value }

// 应用动画到组件
const applyAnimation = (type: 'emphasis' | 'entrance', name: string) => {
  if (!editorStore.curComponent) return
  
  // 如果点击的是已选中的动画，则清除
  if (editorStore.curComponent.animation?.type === type && editorStore.curComponent.animation?.name === name) {
    clearAnimation()
    return
  }
  
  editorStore.curComponent.animation = {
    type,
    name,
    duration: 1,
    loop: type === 'emphasis'
  }
}

// 清除动画
const clearAnimation = () => {
  if (editorStore.curComponent) {
    editorStore.curComponent.animation = undefined
  }
}

// 计算属性：获取所有已注册的组件
// 依赖 version 响应式触发器，确保注册后 UI 能自动更新
const registeredComponents = computed(() => {
  // 读取 version 建立依赖关系
  const _version = registry.getVersion().value
  return registry.list()
})

// 左侧组件库相关状态
// 分类导航状态
const activeCategory = ref('all')

// 搜索关键词
const searchKeyword = ref('')

// 视图模式：list 或 grid
const viewMode = ref('list')

// 计算属性：根据分类和搜索过滤组件
const filteredComponents = computed(() => {
  let result = registeredComponents.value
  
  // 按分类过滤
  if (activeCategory.value !== 'all') {
    result = result.filter(item => item.category === activeCategory.value)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(item => 
      (item.displayName || item.icon || '').toLowerCase().includes(keyword)
    )
  }
  
  return result
})

// 同步到 localStorage 的辅助函数（用于持久化已加载的自定义组件元数据）
const syncCustomComponents = () => {
  const custom = registeredComponents.value.filter(item => item.remoteUrl)
  customComponents.value = custom.map(item => ({ name: item.name, url: item.remoteUrl! }))
}

// 返回主页
const goBack = () => {
  router.push('/')
}

// 对齐功能
const alignLeft = () => {
  if (editorStore.curComponent) {
    editorStore.curComponent.style.left = 0
  }
}

const alignCenterH = () => {
  if (editorStore.curComponent) {
    editorStore.curComponent.style.left = (editorStore.canvasConfig.width - editorStore.curComponent.style.width) / 2
  }
}

const alignRight = () => {
  if (editorStore.curComponent) {
    editorStore.curComponent.style.left = editorStore.canvasConfig.width - editorStore.curComponent.style.width
  }
}

const alignTop = () => {
  if (editorStore.curComponent) {
    editorStore.curComponent.style.top = 0
  }
}

const alignCenterV = () => {
  if (editorStore.curComponent) {
    editorStore.curComponent.style.top = (editorStore.canvasConfig.height - editorStore.curComponent.style.height) / 2
  }
}

const alignBottom = () => {
  if (editorStore.curComponent) {
    editorStore.curComponent.style.top = editorStore.canvasConfig.height - editorStore.curComponent.style.height
  }
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  // 判断是否正在输入框中
  const target = e.target as HTMLElement
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
  
  // Ctrl+Z 撤销
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey && !isInput) {
    e.preventDefault()
    editorStore.undo()
    return
  }
  
  // Ctrl+Y 或 Ctrl+Shift+Z 重做
  if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z') && !isInput) {
    e.preventDefault()
    editorStore.redo()
    return
  }
  
  // Delete 或 Backspace 删除组件
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 如果正在输入文字，直接跳过删除逻辑
    if (isInput) {
      return
    }

    // 如果当前有选中的组件，执行删除
    if (editorStore.curComponent) {
      // 删除前先保存历史
      editorStore.pushHistory()
      editorStore.removeComponent(editorStore.curComponent.id)
    }
  }
}

// 页面挂载时执行
onMounted(async () => {
  // 监听全局键盘事件
  window.addEventListener('keydown', handleKeyDown)
  
  // ========== 组件注册中心：静态注册所有内置组件 ==========
  // 动态 import 所有内置组件及其变体
  const modules = await Promise.all([
    // 柱状图系列
    import('../../packages/VBarChart.vue'),
    import('../../packages/VBarChartGrouped.vue'),
    import('../../packages/VBarChartStacked.vue'),
    import('../../packages/VBarChartHorizontal.vue'),
    import('../../packages/VBarChartCapsule.vue'),
    import('../../packages/VBarChartLine.vue'),
    // 折线图系列
    import('../../packages/VLineChart.vue'),
    import('../../packages/VLineChartSmooth.vue'),
    import('../../packages/VLineChartArea.vue'),
    // 饼图系列
    import('../../packages/VPieChart.vue'),
    import('../../packages/VPieChartMulti.vue'),
    import('../../packages/VPieChartDonut.vue'),
    // 文本系列
    import('../../packages/VText.vue'),
    import('../../packages/VTextGradient.vue'),
    import('../../packages/VTextScroll.vue'),
    // 其他图表
    import('../../packages/VScatterChart.vue'),
    import('../../packages/VWordCloud.vue'),
    import('../../packages/VFunnelChart.vue'),
    import('../../packages/VAreaChart.vue'),
    import('../../packages/VRadarChart.vue'),
    import('../../packages/VHeatmapChart.vue'),
    import('../../packages/VTreeChart.vue'),
    // 表单组件系列
    import('../../packages/VInput.vue'),
    import('../../packages/VTextarea.vue'),
    import('../../packages/VSelect.vue'),
    import('../../packages/VDatePicker.vue'),
    import('../../packages/VTimePicker.vue'),
    import('../../packages/VSlider.vue'),
    import('../../packages/VSwitch.vue'),
    import('../../packages/VCheckbox.vue'),
    import('../../packages/VRadioGroup.vue'),
    import('../../packages/VButton.vue'),
    import('../../packages/VBadge.vue'),
    import('../../packages/VProgress.vue'),
    import('../../packages/VTabs.vue'),
    import('../../packages/VPagination.vue'),
  ])
  
  // 批量注册到 Registry（添加中文显示名称、缩略图类型、变体标识）
  registry.registerBatch([
    // 柱状图系列
    { name: 'VBarChart', component: modules[0].default, meta: { icon: '柱状图', category: 'chart', displayName: '柱状图', thumbnail: 'bar', variant: 'default' } },
    { name: 'VBarChartGrouped', component: modules[1].default, meta: { icon: '并列柱状图', category: 'chart', displayName: '并列柱状图', thumbnail: 'bar', variant: 'grouped' } },
    { name: 'VBarChartStacked', component: modules[2].default, meta: { icon: '堆叠柱状图', category: 'chart', displayName: '堆叠柱状图', thumbnail: 'bar', variant: 'stacked' } },
    { name: 'VBarChartHorizontal', component: modules[3].default, meta: { icon: '横向柱状图', category: 'chart', displayName: '横向柱状图', thumbnail: 'bar', variant: 'horizontal' } },
    { name: 'VBarChartCapsule', component: modules[4].default, meta: { icon: '胶囊柱状图', category: 'chart', displayName: '胶囊柱状图', thumbnail: 'bar', variant: 'capsule' } },
    { name: 'VBarChartLine', component: modules[5].default, meta: { icon: '柱状折线图', category: 'chart', displayName: '柱状 & 折线图', thumbnail: 'bar', variant: 'line' } },
    // 折线图系列
    { name: 'VLineChart', component: modules[6].default, meta: { icon: '折线图', category: 'chart', displayName: '折线图', thumbnail: 'line', variant: 'default' } },
    { name: 'VLineChartSmooth', component: modules[7].default, meta: { icon: '平滑折线图', category: 'chart', displayName: '平滑折线图', thumbnail: 'line', variant: 'smooth' } },
    { name: 'VLineChartArea', component: modules[8].default, meta: { icon: '面积折线图', category: 'chart', displayName: '面积折线图', thumbnail: 'line', variant: 'area' } },
    // 饼图系列
    { name: 'VPieChart', component: modules[9].default, meta: { icon: '饼图', category: 'chart', displayName: '饼图', thumbnail: 'pie', variant: 'default' } },
    { name: 'VPieChartMulti', component: modules[10].default, meta: { icon: '饼图多环', category: 'chart', displayName: '饼图多环', thumbnail: 'pie', variant: 'multi' } },
    { name: 'VPieChartDonut', component: modules[11].default, meta: { icon: '环形图', category: 'chart', displayName: '环形图', thumbnail: 'pie', variant: 'donut' } },
    // 文本系列
    { name: 'VText', component: modules[12].default, meta: { icon: '文本', category: 'text', displayName: '普通文本', thumbnail: 'text', variant: 'default' } },
    { name: 'VTextGradient', component: modules[13].default, meta: { icon: '渐变文本', category: 'text', displayName: '渐变文本', thumbnail: 'text', variant: 'gradient' } },
    { name: 'VTextScroll', component: modules[14].default, meta: { icon: '弹幕文本', category: 'text', displayName: '弹幕文本', thumbnail: 'text', variant: 'scroll' } },
    // 其他图表
    { name: 'VScatterChart', component: modules[15].default, meta: { icon: '散点图', category: 'chart', displayName: '散点图', thumbnail: 'scatter', variant: 'default' } },
    { name: 'VWordCloud', component: modules[16].default, meta: { icon: '词云图', category: 'chart', displayName: '词云图', thumbnail: 'cloud', variant: 'default' } },
    { name: 'VFunnelChart', component: modules[17].default, meta: { icon: '漏斗图', category: 'chart', displayName: '漏斗图', thumbnail: 'funnel', variant: 'default' } },
    { name: 'VAreaChart', component: modules[18].default, meta: { icon: '面积图', category: 'chart', displayName: '面积图', thumbnail: 'area', variant: 'default' } },
    { name: 'VRadarChart', component: modules[19].default, meta: { icon: '雷达图', category: 'chart', displayName: '雷达图', thumbnail: 'radar', variant: 'default' } },
    { name: 'VHeatmapChart', component: modules[20].default, meta: { icon: '热力图', category: 'chart', displayName: '热力图', thumbnail: 'heatmap', variant: 'default' } },
    { name: 'VTreeChart', component: modules[21].default, meta: { icon: '树形图', category: 'chart', displayName: '树形图', thumbnail: 'tree', variant: 'default' } },
    // 表单组件系列
    { name: 'VInput', component: modules[22].default, meta: { icon: '输入框', category: 'form', displayName: '输入框', thumbnail: 'input', variant: 'default' } },
    { name: 'VTextarea', component: modules[23].default, meta: { icon: '多行文本', category: 'form', displayName: '多行文本框', thumbnail: 'textarea', variant: 'default' } },
    { name: 'VSelect', component: modules[24].default, meta: { icon: '下拉选择器', category: 'form', displayName: '下拉选择器', thumbnail: 'select', variant: 'default' } },
    { name: 'VDatePicker', component: modules[25].default, meta: { icon: '日期选择器', category: 'form', displayName: '日期选择器', thumbnail: 'datepicker', variant: 'default' } },
    { name: 'VTimePicker', component: modules[26].default, meta: { icon: '时间选择器', category: 'form', displayName: '时间选择器', thumbnail: 'timepicker', variant: 'default' } },
    { name: 'VSlider', component: modules[27].default, meta: { icon: '滑动条', category: 'form', displayName: '滑动条', thumbnail: 'slider', variant: 'default' } },
    { name: 'VSwitch', component: modules[28].default, meta: { icon: '开关', category: 'form', displayName: '开关', thumbnail: 'switch', variant: 'default' } },
    { name: 'VCheckbox', component: modules[29].default, meta: { icon: '复选框', category: 'form', displayName: '复选框', thumbnail: 'checkbox', variant: 'default' } },
    { name: 'VRadioGroup', component: modules[30].default, meta: { icon: '单选按钮组', category: 'form', displayName: '单选按钮组', thumbnail: 'radio', variant: 'default' } },
    { name: 'VButton', component: modules[31].default, meta: { icon: '按钮', category: 'form', displayName: '按钮', thumbnail: 'button', variant: 'default' } },
    { name: 'VBadge', component: modules[32].default, meta: { icon: '徽标', category: 'form', displayName: '徽标', thumbnail: 'badge', variant: 'default' } },
    { name: 'VProgress', component: modules[33].default, meta: { icon: '进度条', category: 'form', displayName: '进度条', thumbnail: 'progress', variant: 'default' } },
    { name: 'VTabs', component: modules[34].default, meta: { icon: '标签页', category: 'form', displayName: '标签页', thumbnail: 'tabs', variant: 'default' } },
    { name: 'VPagination', component: modules[35].default, meta: { icon: '分页器', category: 'form', displayName: '分页器', thumbnail: 'pagination', variant: 'default' } },
  ])
  
  // 恢复自定义组件并等待注册完成
  const savedCustom = registry.restoreFromStorage()
  customComponents.value = savedCustom
  
  // 标记为已就绪
  isRegistryReady.value = true
  
  // 检查是否有从模板加载的数据
  const savedData = localStorage.getItem('my-go-view-data')
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 使用批量设置方法（会清空旧数据）
        editorStore.setComponentData(parsed)
      }
    } catch (e) {
      console.error('加载保存数据失败:', e)
    }
  }
  
  // 初始化历史记录
  editorStore.pushHistory()
})

// 离开页面时销毁监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

//保存功能
const saveData = () =>{
  // 显示保存选项弹窗
  showSaveDialog.value = true
}

// 保存弹窗相关状态
const showSaveDialog = ref(false)
const templateName = ref('')

// 确认保存到模板
const confirmSaveToTemplate = () => {
  if (!templateName.value.trim()) {
    alert('请输入模板名称！')
    return
  }
  
  // 保存当前画布数据到模板
  const templateData = {
    id: Date.now(),
    title: templateName.value,
    data: JSON.stringify(editorStore.componentData),
    image: '', // 可以后续添加截图功能
    createdAt: new Date().toLocaleString()
  }
  
  // 从 localStorage 读取现有模板列表
  const existingTemplates = localStorage.getItem('my-go-view-templates')
  const templates = existingTemplates ? JSON.parse(existingTemplates) : []
  templates.push(templateData)
  
  // 保存到 localStorage
  localStorage.setItem('my-go-view-templates', JSON.stringify(templates))
  
  // 关闭弹窗并清空输入
  showSaveDialog.value = false
  templateName.value = ''
  
  alert('模板保存成功！')
}

// 仅保存到预览（保持原有逻辑）
const saveToPreview = () => {
  // 把pinia里的画布数据变成字符串存进浏览器的本地存储里
  localStorage.setItem('my-go-view-data', JSON.stringify(editorStore.componentData))
  showSaveDialog.value = false
  alert('保存成功，点击预览可查看')
}

// 取消保存
const cancelSave = () => {
  showSaveDialog.value = false
  templateName.value = ''
}

//跳转预览页
const goToPreview = () =>{
    router.push({ path: '/preview', query: { from: 'editor' } })
}

// ========== 自定义组件管理功能 ==========

// 添加自定义组件
const addCustomComponent = async () => {
  if (!customComponentName.value.trim() || !customComponentUrl.value.trim()) {
    alert('请填写组件名称和URL！')
    return
  }
  
  try {
    // 动态加载远程组件
    await registry.loadRemoteComponent(customComponentName.value.trim(), customComponentUrl.value.trim())
    
    // 更新自定义组件列表
    customComponents.value.push({
      name: customComponentName.value.trim(),
      url: customComponentUrl.value.trim()
    })
    
    // 保存到 localStorage
    registry.saveToStorage(customComponents.value)
    
    // 关闭弹窗
    showCustomComponentDialog.value = false
    customComponentName.value = ''
    customComponentUrl.value = ''
    
    alert('自定义组件添加成功！')
  } catch (error) {
    console.error('添加自定义组件失败:', error)
    alert('添加失败: ' + (error as Error).message)
  }
}

// 删除自定义组件
const removeCustomComponent = (name: string) => {
  if (confirm(`确定要删除自定义组件 ${name} 吗？`)) {
    customComponents.value = customComponents.value.filter(c => c.name !== name)
    registry.saveToStorage(customComponents.value)
    alert('删除成功！刷新页面后生效。')
  }
}

//关闭自定义组件弹窗
const closeCustomDialog = () => {
  showCustomComponentDialog.value = false
  customComponentName.value = ''
  customComponentUrl.value = ''
}

//定义八个方向的控制点，以及他们对应的鼠标光标样式
const pointList = ['t','b','l','r','lt','rt','lb','rb']
const cursorMap: Record<string,string> = {
    t:'n-resize', b:'s-resize', l:'w-resize', r:'e-resize',
    lt:'nw-resize', rt:'ne-resize', lb:'sw-resize', rb:'se-resize'
}

//处理八个控制点的拖拽缩放
const handleResizeMouseDown = (e:MouseEvent,point:string,item:any) => {
    e.stopPropagation()
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = item.style.width
    const startHeight = item.style.height
    const startLeft = item.style.left
    const startTop =  item.style.top
    
    const move = (moveEvent :MouseEvent)=>{
        //计算鼠标移动的距离
        const disX = moveEvent.clientX-startX
        const disY = moveEvent.clientY-startY

        let newWidth = startWidth
        let newHeight = startHeight
        let newLeft = startLeft
        let newTop = startTop

        //核心逻辑-根据拖拽的哪个点来计算对应的宽高和位置
        if(point.includes('b')) newHeight = startHeight+disY // 往下拉，高度增加
        if(point.includes('t')) { //往上拉，高度增加，top减小
            newHeight = startHeight-disY
            newTop = startTop+disY
        }
        if(point.includes('r')) newWidth = startWidth+disX //往右拉，宽度增加
        if(point.includes('l')){ //往左拉，宽度增加，left减小
            newWidth = startWidth - disX
            newLeft = startLeft + disX
        }

        //防止宽高变成负数导致页面崩溃
        if(newWidth > 20){
            item.style.width = Math.round(newWidth / GRID_SIZE) * GRID_SIZE
            item.style.left = Math.round(newLeft / GRID_SIZE) * GRID_SIZE
        }
        if(newHeight >20 ){
            item.style.height = Math.round(newHeight / GRID_SIZE) * GRID_SIZE
            item.style.top = Math.round(newTop / GRID_SIZE) * GRID_SIZE
        }
    }

    const up = () =>{
        // 缩放结束时保存历史记录
        editorStore.pushHistory()
        document.removeEventListener('mousemove',move)
        document.removeEventListener('mouseup',up)
    }

    document.addEventListener('mousemove',move)
    document.addEventListener('mouseup',up)
}

//处理画布内组件的拖拽移动
const GRID_SIZE = 20 //定义网格步长
const handleMouseDown = (e:MouseEvent,item:any) => {

    e.preventDefault() //阻止选中文等默认行为
    e.stopPropagation() //阻止冒泡

    editorStore.setCurComponent(item)    //鼠标按下时-立即选中

    const startY = e.clientY     //记录鼠标按下的初始屏幕坐标
    const startX = e.clientX
    
    //记录组件当前的初始位置
    const startTop = item.style.top
    const startLeft = item.style.left

    //定义鼠标移动时的函数
    const move = (moveEvent : MouseEvent) =>{
        //计算鼠标移动的距离（当前坐标-初始坐标）
        const currX = moveEvent.clientX
        const currY = moveEvent.clientY

        //实时修改pinia里的组件位置
        item.style.top = startTop + (currY-startY)
        item.style.left = startLeft + (currX-startX)
        
        //算出鼠标真实的偏移位置
        const rawTop = startTop + (moveEvent.clientY-startY)
        const rawLeft = startLeft + (moveEvent.clientX-startX)
        //套用吸附公式使组件吸附在网格上
        item.style.top = Math.round(rawTop / GRID_SIZE)*GRID_SIZE
        item.style.left = Math.round(rawLeft / GRID_SIZE)*GRID_SIZE
    } 

    //定义鼠标松开时的函数
    const up = () =>{
        // 鼠标松开时保存历史记录（记录拖拽后的位置）
        editorStore.pushHistory()
        //鼠标松开，卸载事件监听，结束拖拽
        document.removeEventListener('mousemove',move)
        document.removeEventListener('mouseup',up)
    }

    //把移动和松开事件挂载到全局document上（预防拖拽时鼠标可能移出组件区域的情况）
    document.addEventListener('mousemove',move)
    document.addEventListener('mouseup',up)
}

// 低代码核心：组件映射表（根据JSON里的字符串，找到对应的vue组件）
// 使用 registry.getVersion() 确保 Vue 响应式追踪到注册变化
const componentMap: Record<string,any> = computed(() => {
    // 依赖 version ref，当有新组件注册时自动重新计算
    const _version = registry.getVersion().value
    
    const map: Record<string,any> = {}
    registeredComponents.value.forEach(item => {
        map[item.name] = item.component
    })
    return map
})

//左侧拖拽开始把“我是谁”这个信息存入包裹里
const handleDragStart = (e:DragEvent,componentName:string) =>{
    //dataTransfer只能装字符串
    e.dataTransfer?.setData('componentName',componentName)
}

// 中间-拖拽放下：组装JSON，塞入pinia
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()

  // 取出刚才存的信息名字
  const componentName = e.dataTransfer?.getData('componentName')
  if (!componentName) return

  // 计算鼠标在画布上的相对坐标
  const top = e.offsetY
  const left = e.offsetX

  //组件JSON结构
  const newComponent = {
    id: 'id_' + Date.now(),
    component: componentName,
    style: {
      top: top,
      left: left,
      width: 200,
      height: 150,
    },
    dataConfig: {
      type: 'static' as const,
      staticData: JSON.stringify([
        { name: '数据1', value: 100 },
        { name: '数据2', value: 200 }
      ]),
      xField: 'name',
      yField: 'value'
    },
    propValue: { title: '默认标题' } // 业务属性
  }

  // 把这个JSON丢给pinia的数据中心
  // 添加前先保存历史
  editorStore.pushHistory()
  editorStore.addComponent(newComponent)
}


</script>

<template>
    <div class="workspace-container">
        <!-- 顶部工具栏 -->
         <header class="header">
            <div class="logo"> My Go-View </div>
            <div class="actions">
                <!-- 撤销/重做按钮 -->
                 <button 
                   class="btn icon-btn" 
                   :disabled="!editorStore.canUndo" 
                   @click="editorStore.undo()"
                   title="撤销 (Ctrl+Z)"
                 >
                   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                     <polyline points="9 14 4 9 9 4"/>
                     <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
                   </svg>
                 </button>
                 <button 
                   class="btn icon-btn" 
                   :disabled="!editorStore.canRedo" 
                   @click="editorStore.redo()"
                   title="重做 (Ctrl+Y)"
                 >
                   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                     <polyline points="15 14 20 9 15 4"/>
                     <path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
                   </svg>
                 </button>
                 <button class="btn" @click="goToPreview">预览</button>
                 <button class="btn primary" @click="saveData">保存</button>
                 <button class="btn icon-btn" @click="goBack" title="返回主页">
                   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                     <polyline points="15 18 9 12 15 6"/>
                   </svg>
                 </button>
            </div>
         </header>

         <!-- 下方主工作区（使用 Grid 布局，更稳定） -->
          <main class="main-content">

            <!-- 左侧：图表物料库 -->
             <aside class="left-panel">
                <!-- 左侧分类导航 -->
                <div class="category-nav">
                  <div 
                    class="nav-item" 
                    :class="{ active: activeCategory === 'all' }"
                    @click="activeCategory = 'all'"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    <span>所有</span>
                  </div>
                  <div 
                    class="nav-item" 
                    :class="{ active: activeCategory === 'chart' }"
                    @click="activeCategory = 'chart'"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    <span>图表</span>
                  </div>
                  <div 
                    class="nav-item" 
                    :class="{ active: activeCategory === 'text' }"
                    @click="activeCategory = 'text'"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="4 7 4 4 20 4 20 7"/>
                      <line x1="9" y1="20" x2="15" y2="20"/>
                      <line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                    <span>文本</span>
                  </div>
                  <div 
                    class="nav-item" 
                    :class="{ active: activeCategory === 'form' }"
                    @click="activeCategory = 'form'"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    <span>控件</span>
                  </div>
                </div>
                
                <!-- 右侧组件列表面板 -->
                <div class="component-list-panel">
                  <!-- 顶部搜索和视图切换 -->
                  <div class="list-header">
                    <input 
                      type="text" 
                      placeholder="搜索组件" 
                      v-model="searchKeyword" 
                    />
                    <div class="view-toggle">
                      <button 
                        :class="{ active: viewMode === 'list' }" 
                        @click="viewMode = 'list'"
                        title="列表视图"
                      >☰</button>
                      <button 
                        :class="{ active: viewMode === 'grid' }" 
                        @click="viewMode = 'grid'"
                        title="网格视图"
                      >⊞</button>
                    </div>
                    <button class="add-custom-btn" @click="showCustomComponentDialog = true" title="添加自定义组件">+</button>
                  </div>
                  
                  <!-- 组件列表 -->
                  <div class="component-list" :class="viewMode" v-if="isRegistryReady">
                    <div 
                      v-for="item in filteredComponents" 
                      :key="item.name"
                      class="component-card"
                      draggable="true"
                      @dragstart="handleDragStart($event, item.name)"
                      :title="item.remoteUrl ? '自定义组件' : '内置组件'"
                      :class="{ 'custom-item': item.remoteUrl }"
                    >
                      <!-- 占位图 -->
                      <div class="component-thumbnail" :class="item.thumbnail">
                        <div class="placeholder-icon"></div>
                      </div>
                      <!-- 组件名称 -->
                      <div class="component-name">{{ item.displayName || item.icon }}</div>
                    </div>
                    <div v-if="filteredComponents.length === 0" class="empty-state">
                      暂无匹配的组件
                    </div>
                  </div>
                  <div class="component-list" :class="viewMode" v-else>
                    <div class="empty-state">加载中...</div>
                  </div>
                </div>
            </aside>

            <!-- 中间：核心编辑画布区 -->
             <section class="center-board">

                <!-- 外层滚动包裹区 -->
                 <div class="scroll-wrapper">
                    <!-- 标尺行：左上角固定块 + 顶部水平标尺 -->
                    <div class="ruler-row">
                        <div class="ruler-corner"></div>
                        <!-- 顶部标尺宽度跟随pinia的画布宽度 -->
                        <div class="ruler-x" :style="{ width:editorStore.canvasConfig.width + 'px' }">
                        <!-- 纯前端动态生成刻度数字，每100px一个 -->
                         <span
                            v-for="n in Math.ceil(editorStore.canvasConfig.width / 100)"
                            :key="'x' + n"
                            class="tick-label-x"
                            :style="{ left: (n-1)*100 + 'px' }"
                         >{{ (n-1)*100 }}</span>
                      </div>
                    </div>

                    <div class="canvas-row">
                        <!-- 左侧垂直标尺 -->
                        <!-- 左侧标尺的高度跟随pinia里的画布高度 -->
                        <div class="ruler-y" :style="{ height: editorStore.canvasConfig.height + 'px' }">
                            <span
                                v-for="n in Math.ceil(editorStore.canvasConfig.height / 100)"
                                :key="'y' + n"
                                class="tick-label-y"
                                :style="{ top: (n-1)*100 + 'px' }"
                            >{{ (n-1)*100 }}</span>
                        </div>
                        <!-- 真正的画布 -->
                        <div 
                            class="canvas-area" 
                            :style="{ 
                            width: editorStore.canvasConfig.width + 'px', 
                            height: editorStore.canvasConfig.height + 'px' 
                        }"
                            @dragover.prevent 
                            @drop="handleDrop" 
                            @mousedown.self="editorStore.setCurComponent(null)"
                        >
                        <!-- 画布区域加上@click="editorStore.setCurComponent(null)"点击空白处取消选中 -->
                        <p v-if="editorStore.componentData.length === 0" style="color: #666; text-align: center; margin-top: 200px;">
                            请从左侧拖拽组件到这里
                        </p>
                        <!-- 数据驱动渲染的核心：遍历pinia里的数组 -->
                        <!-- 用position:absolute才能根据left和top定位 -->
                        <div
                            v-for="item in editorStore.componentData"
                            :key="item.id"
                            class="shape-component"
                            :class="{ 
                                active: editorStore.curComponent?.id === item.id,
                                [`anim-${item.animation?.type}-${item.animation?.name}`]: item.animation?.name
                            }"
                            :style="{
                                left:item.style.left + 'px',
                                top:item.style.top + 'px',
                                width:item.style.width + 'px',
                                height:item.style.height + 'px',
                                '--anim-duration': (item.animation?.duration || 1) + 's'
                            }"
                            @mousedown="handleMouseDown($event,item)"
                            @click.stop
                        >
                            <!-- 动态渲染映射表里的组件 -->
                            <component 
                              :is="componentMap[item.component]" 
                              :propValue="item.propValue"
                              :dataConfig="item.dataConfig"
                            />

                            <!-- 新增：只有选中时才显示的删除图标 -->
                            <div 
                                v-if="editorStore.curComponent?.id === item.id" 
                                class="delete-icon"
                                title="删除组件"
                                @mousedown.stop="editorStore.removeComponent(item.id)"
                            >
                                ×
                            </div>
                            <!-- 新增八个控制点-只有当前被选中的组件-才显示这八个点 -->
                            <div v-if="editorStore.curComponent?.id === item.id">
                                <div
                                    v-for="point in pointList"
                                    :key="point"
                                    class="shape-point"
                                    :class="point"
                                    :style="{ cursor:cursorMap[point] }"
                                    @mousedown.stop="handleResizeMouseDown($event,point,item)"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

             <!-- 右侧：属性配置面板 -->
              <aside class="right-panel">
                <template v-if="editorStore.curComponent">
                  <!-- 顶部标签页切换 -->
                  <div class="panel-tabs">
                    <div 
                      class="panel-tab" 
                      :class="{ active: activeTab === 'style' }"
                      @click="activeTab = 'style'"
                    >
                      <span class="tab-icon"></span>
                      <span>定制</span>
                    </div>
                    <div 
                      class="panel-tab" 
                      :class="{ active: activeTab === 'animation' }"
                      @click="activeTab = 'animation'"
                    >
                      <span class="tab-icon"></span>
                      <span>动画</span>
                    </div>
                  </div>

                  <!-- 定制选项卡内容 -->
                  <div v-show="activeTab === 'style'" class="tab-content">
                    <!-- 组件名称 -->
                    <div class="config-section">
                      <div class="section-label">
                        <span>名称</span>
                        <span class="component-count">{{ editorStore.curComponent.component }} - {{ editorStore.curComponent.id.slice(-4) }}</span>
                      </div>
                      <input 
                        type="text" 
                        v-model="editorStore.curComponent.propValue.title"
                        class="name-input"
                        placeholder="请输入组件名称"
                      />
                    </div>

                    <!-- 尺寸设置 -->
                    <div class="config-section">
                      <div class="section-label">尺寸</div>
                      <div class="size-row">
                        <div class="size-item">
                          <span class="size-label">宽度</span>
                          <div class="number-control">
                            <input 
                              type="number" 
                              v-model.number="editorStore.curComponent.style.width"
                              class="number-input"
                            />
                            <div class="control-btns">
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.width = Math.max(20, editorStore.curComponent.style.width - 10)">−</button>
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.width += 10">+</button>
                            </div>
                          </div>
                        </div>
                        <div class="size-item">
                          <span class="size-label">高度</span>
                          <div class="number-control">
                            <input 
                              type="number" 
                              v-model.number="editorStore.curComponent.style.height"
                              class="number-input"
                            />
                            <div class="control-btns">
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.height = Math.max(20, editorStore.curComponent.style.height - 10)">−</button>
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.height += 10">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 对齐方式 -->
                    <div class="config-section">
                      <div class="align-btns">
                        <button class="align-btn" @click="alignLeft" title="左对齐">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M3 3v18h2V3H3zm16 4H7v2h12V7zm-4 4H7v2h8v-2zm4 4H7v2h12v-2z"/>
                          </svg>
                        </button>
                        <button class="align-btn" @click="alignCenterH" title="水平居中">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M11 3v18h2V3h-2zM3 7v2h18V7H3zm0 8v2h18v-2H3z"/>
                          </svg>
                        </button>
                        <button class="align-btn" @click="alignRight" title="右对齐">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M19 3v18h2V3h-2zm-12 4h12V7H7v2zm4 4h8v-2h-8v2zm-4 4h12v-2H7v2z"/>
                          </svg>
                        </button>
                        <button class="align-btn" @click="alignTop" title="顶部对齐">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M3 3h18v2H3V3zm4 16V7h2v12H7zm8 0V7h2v12h-2z"/>
                          </svg>
                        </button>
                        <button class="align-btn" @click="alignCenterV" title="垂直居中">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M3 11v2h18v-2H3zm4-8v8h2V3H7zm8 0v8h2V3h-2z"/>
                          </svg>
                        </button>
                        <button class="align-btn" @click="alignBottom" title="底部对齐">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M3 19h18v2H3v-2zm4-14v12h2V5H7zm8 0v12h2V5h-2z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- 位置设置 -->
                    <div class="config-section">
                      <div class="section-label">位置</div>
                      <div class="size-row">
                        <div class="size-item">
                          <span class="size-label">上</span>
                          <div class="number-control">
                            <input 
                              type="number" 
                              v-model.number="editorStore.curComponent.style.top"
                              class="number-input"
                            />
                            <div class="control-btns">
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.top = Math.max(0, editorStore.curComponent.style.top - 10)">−</button>
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.top += 10">+</button>
                            </div>
                          </div>
                        </div>
                        <div class="size-item">
                          <span class="size-label">左</span>
                          <div class="number-control">
                            <input 
                              type="number" 
                              v-model.number="editorStore.curComponent.style.left"
                              class="number-input"
                            />
                            <div class="control-btns">
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.left = Math.max(0, editorStore.curComponent.style.left - 10)">−</button>
                              <button class="ctrl-btn" @click="editorStore.curComponent.style.left += 10">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 动画选项卡内容 -->
                  <div v-show="activeTab === 'animation'" class="tab-content">
                    <!-- 清除动画按钮 -->
                    <div class="config-section">
                      <button class="btn-clear-animation" @click="clearAnimation" :disabled="!editorStore.curComponent?.animation?.name">
                        清除动画
                      </button>
                    </div>

                    <!-- 强调动画 -->
                    <div class="animation-group">
                      <div class="animation-group-title" @click="toggleEmphasis">
                        <span>强调动画</span>
                        <span class="arrow" :class="{ open: showEmphasis }">▼</span>
                      </div>
                      <div class="animation-grid" v-show="showEmphasis">
                        <button 
                          v-for="anim in emphasisAnimations" 
                          :key="anim.name"
                          class="animation-btn"
                          :class="{ active: editorStore.curComponent?.animation?.name === anim.name && editorStore.curComponent?.animation?.type === 'emphasis' }"
                          @click="applyAnimation('emphasis', anim.name)"
                        >
                          {{ anim.label }}
                        </button>
                      </div>
                    </div>

                    <!-- 移入动画 -->
                    <div class="animation-group">
                      <div class="animation-group-title" @click="toggleEntrance">
                        <span>移入动画</span>
                        <span class="arrow" :class="{ open: showEntrance }">▼</span>
                      </div>
                      <div class="animation-grid" v-show="showEntrance">
                        <button 
                          v-for="anim in entranceAnimations" 
                          :key="anim.name"
                          class="animation-btn"
                          :class="{ active: editorStore.curComponent?.animation?.name === anim.name && editorStore.curComponent?.animation?.type === 'entrance' }"
                          @click="applyAnimation('entrance', anim.name)"
                        >
                          {{ anim.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </template>
                <!-- 否则提示选中 -->
                <div v-else class="no-selection">
                  <div class="empty-icon"></div>
                  <p>请先在画布中选中组件</p>
                </div>
              </aside>

          </main>
    </div>

    <!-- 保存弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSaveDialog" class="save-dialog-overlay" @click="cancelSave">
          <div class="save-dialog" @click.stop>
            <div class="dialog-header">
              <h3>保存项目</h3>
              <button class="dialog-close" @click="cancelSave">×</button>
            </div>
            <div class="dialog-body">
              <div class="form-group">
                <label>模板名称：</label>
                <input 
                  type="text" 
                  v-model="templateName" 
                  placeholder="请输入模板名称"
                  class="dialog-input"
                  @keyup.enter="confirmSaveToTemplate"
                />
              </div>
            </div>
            <div class="dialog-footer">
              <button class="btn-cancel" @click="cancelSave">取消</button>
              <button class="btn-save-preview" @click="saveToPreview">保存到预览</button>
              <button class="btn-save-template" @click="confirmSaveToTemplate">保存到模板</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 自定义组件添加弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCustomComponentDialog" class="custom-dialog-overlay" @click="closeCustomDialog">
          <div class="custom-dialog" @click.stop>
            <div class="dialog-header">
              <h3>添加自定义组件</h3>
              <button class="dialog-close" @click="closeCustomDialog">×</button>
            </div>
            <div class="dialog-body">
              <div class="form-group">
                <label>组件名称：</label>
                <input 
                  type="text" 
                  v-model="customComponentName" 
                  placeholder="例如: MyCustomChart"
                  class="dialog-input"
                />
              </div>
              <div class="form-group">
                <label>组件URL：</label>
                <input 
                  type="text" 
                  v-model="customComponentUrl" 
                  placeholder="例如: http://example.com/MyCustomChart.js"
                  class="dialog-input"
                />
                <p class="form-hint">支持 ESM 模块或 UMD 模块，组件需要 default export 或命名导出</p>
              </div>
              <div class="form-group" v-if="customComponents.length > 0">
                <label>已添加的自定义组件：</label>
                <div class="custom-list">
                  <div class="custom-list-item" v-for="item in customComponents" :key="item.name">
                    <span class="custom-list-name"> {{ item.name }}</span>
                    <div class="custom-list-actions">
                      <span class="custom-list-url" :title="item.url">{{ item.url }}</span>
                      <button class="custom-list-delete" @click="removeCustomComponent(item.name)">删除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="dialog-footer">
              <button class="btn-cancel" @click="closeCustomDialog">关闭</button>
              <button class="btn-save-template" @click="addCustomComponent">添加组件</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
</template>

