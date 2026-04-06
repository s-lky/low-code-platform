<script setup lang="ts">
import { useEidtorStore } from '../../store/editor';
import VBarChart from '../../packages/VBarChart.vue';
import VLineChart from '../../packages/VLineChart.vue';
import DataConfigPanel from '../../components/DataConfigPanel.vue';
import { useRouter } from 'vue-router';
import { onMounted, onUnmounted, ref } from 'vue';
import './index.css' // 导入独立的 CSS 文件

const router = useRouter()

// 处理键盘删除事件
const handleKeyDown = (e: KeyboardEvent) => {
  // 1. 判断是否按下了 Delete 或 Backspace
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 2. 极其关键：判断当前焦点是不是在 input 或 textarea 标签上
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return // 如果正在输入文字，直接跳过删除逻辑
    }

    // 3. 如果当前有选中的组件，执行删除
    if (editorStore.curComponent) {
      editorStore.removeComponent(editorStore.curComponent.id)
    }
  }
}

// 页面挂载时执行
onMounted(() => {
  // 监听全局键盘事件
  window.addEventListener('keydown', handleKeyDown)
  
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
    router.push('/preview')
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
        //鼠标松开，卸载事件监听，结束拖拽
        document.removeEventListener('mousemove',move)
        document.removeEventListener('mouseup',up)
    }

    //把移动和松开事件挂载到全局document上（预防拖拽时鼠标可能移出组件区域的情况）
    document.addEventListener('mousemove',move)
    document.addEventListener('mouseup',up)
}

const editorStore = useEidtorStore()

// 低代码核心：组件映射表（根据JSON里的字符串，找到对应的vue组件）
const componentMap: Record<string,any> = {
    VBarChart,
    VLineChart,
}

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
  editorStore.addComponent(newComponent)
}


</script>

<template>
    <div class="workspace-container">
        <!-- 顶部工具栏 -->
         <header class="header">
            <div class="logo"> My Go-View </div>
            <div class="actions">
                <!-- 以后这里放撤销重做保存预览等按钮 -->
                 <button class="btn" @click="goToPreview">预览</button>
                 <button class="btn primary" @click="saveData">保存</button>
            </div>
         </header>

         <!-- 下方主工作区（使用 Grid 布局，更稳定） -->
          <main class="main-content">

            <!-- 左侧：图表物料库 -->
             <aside class="left-panel">
                <div class="panel-title">图表组件库</div>
                <div class="component-list">
                    <!-- 加上draggable="true"并在拖拽时开始塞入包裹 -->
                     <div 
                        class="mock-item"
                        draggable="true"
                        @dragstart="handleDragStart($event,'VBarChart')"
                     >
                     柱状图
                     </div>
                     <div
                        class="mock-item"
                        draggable="true"
                        @dragstart="handleDragStart($event,'VLineChart')"
                     >
                        折线图
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
                            v-for="n in Math.ceil(editorStore.canvasConfig.width / 100) + 1"
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
                                v-for="n in Math.ceil(editorStore.canvasConfig.height / 100) + 1"
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
                            :class="{ active:editorStore.curComponent?.id === item.id }"
                            :style="{
                                left:item.style.left + 'px',
                                top:item.style.top + 'px',
                                width:item.style.width + 'px',
                                height:item.style.height + 'px',
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
                <!-- 使用数据配置面板组件 -->
                <DataConfigPanel 
                  v-if="editorStore.curComponent"
                  v-model="editorStore.curComponent.dataConfig"
                  :cur-component="editorStore.curComponent"
                />
                <!-- 否则提示选中 -->
                <p v-else style="color: #666; font-size: 14px; text-align: center; margin-top: 50px;">
                  请先在画布中选中组件
                </p>
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
</template>

