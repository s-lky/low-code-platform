<template>
    <!-- 动态绑定light-theme类名来实现亮色模式 -->
  <div class="project-container" :class="{ 'light-theme':isLightMode }">
    <!-- 左侧侧边栏(动态绑定collapsed类名) -->
    <aside class="sidebar" :class="{ 'collapsed': isSidebarCollapsed }">
      <div class="new-btn-box">
        <button class="btn-new" @click="showCreateDialog = true">
          <span class="icon">+</span> 新建
        </button>
      </div>
      <nav class="menu">
        <div class="menu-item" :class="{ active: activeMenu === 'projects' }" @click="activeMenu = 'projects'">全部项目</div>
        <div class="menu-item" :class="{ active: activeMenu === 'templates' }" @click="activeMenu = 'templates'">我的模板</div>
        <div class="menu-item" :class="{ active: activeMenu === 'market' }" @click="activeMenu = 'market'">模板市场</div>
      </nav>
    </aside>

    <!-- 右侧内容区 -->
    <main class="main-content">
        <!-- 折叠展开控制按钮 -->
         <div class="collapse-btn" @click="toggleSidebar">
            {{ isSidebarCollapsed ? '>' : '<' }}
         </div>
      <header class="header">
        <div class="header-right">
          <span>文</span>
          <span class="theme-toggle" @click="toggleTheme" :title="isLightMode ? '切换暗色':'切换亮色'">
            {{ isLightMode ? '🌙' : '☀️' }}
          </span>
          <div class="avatar"></div>
        </div>
      </header>

      <!-- 卡片列表区 -->
      <div class="content-body">
        <div class="project-grid">
          <!-- 这里循环的数据换成了 paginatedList（分页后的数据） -->
          <div class="project-card" v-for="item in paginatedList" :key="item.id" :class="{'menu-active':activeMenuId === item.id}">
            <!-- 新增点击事件 @click="openPreview" -->
            <div class="card-image" @click="openPreview(item)" title="点击放大预览">
              <img v-if="item.image" :src="item.image" alt="preview" class="real-image" />
              <span v-else class="placeholder-text">预览图占位 - {{ item.title }}</span>
              <div class="dots">
                <span class="dot red"></span>
                <span class="dot green"></span>
              </div>
              <!-- 悬浮提示放大图标 -->
              <div class="hover-mask">
                <span class="zoom-icon">预览</span>
              </div>
            </div>
            
            <div class="card-footer">
              <div class="info">
                <span class="title">{{ item.title }}</span>
                <span class="status" :class="item.status === 1 ? 'published' : 'unpublished'">
                  <span class="status-dot"></span>
                  {{ item.status === 1 ? '已发布' : '未发布' }}
                </span>
              </div>
              <div class="actions">
                <button class="action-btn" @click="editProject(item.id)" title="编辑">编辑</button>
                <!-- 更多操作下拉菜单 -->
                <div class="dropdown-wrapper">
                    <button class="action-btn" @click.stop="toggleMenu(item.id)">•••</button>
                <!-- 下拉面板 -->
                  <Transition name="fade">
                    <div class="dropdown-menu" v-if="activeMenuId === item.id" @click.stop>
                      <div class="dropdown-item" @click="handleAction('preview', item)">
                        <span></span> 预览
                      </div>
                      <div class="dropdown-item" @click="handleAction('toggleStatus', item)">
                        <span></span> {{ item.status === 1 ? '取消发布' : '发布' }}
                      </div>
                      <div class="dropdown-item delete" @click="handleAction('delete', item)">
                        <span></span> 删除
                      </div>
                    </div>
                  </Transition>
                </div>

            </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增：右下角分页区 -->
      <footer class="pagination-footer">
        <div class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">&lt;</button>
          <button class="page-btn active">{{ currentPage }}</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">&gt;</button>
          
          <div class="page-size-select">
            <select v-model="pageSize" @change="currentPage = 1">
              <option :value="10">10 / 页</option>
              <option :value="20">20 / 页</option>
              <option :value="50">50 / 页</option>
            </select>
          </div>
        </div>
      </footer>
    </main>

    <!--  新增：全屏放大预览的遮罩层 (Teleport 挂载到 body 上防止被局部样式影响) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPreview" class="preview-overlay" @click="closePreview">
          <div class="preview-box" @click.stop>
            <button class="close-btn" @click="closePreview">✕</button>
            <h3 class="preview-title">{{ currentPreviewItem?.title }}</h3>
            <div class="preview-img-wrapper">
              <img v-if="currentPreviewItem?.image" :src="currentPreviewItem?.image" alt="大图" />
              <div v-else class="big-placeholder">暂无真实截图大图</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!--  新增：创建项目弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreateDialog" class="create-dialog-overlay" @click="showCreateDialog = false">
          <div class="create-dialog" @click.stop>
            <div class="dialog-header">
              <h3>从哪里出发好呢？</h3>
              <button class="dialog-close" @click="showCreateDialog = false">×</button>
            </div>
            <div class="dialog-body">
              <div class="create-options">
                <button class="create-option-btn" @click="createChartEditor">
                  <span class="option-icon"></span>
                  <span class="option-label">生成图表</span>
                </button>
                <button class="create-option-btn" @click="createComponentEditor">
                  <span class="option-icon"></span>
                  <span class="option-label">组件编辑</span>
                </button>
                <button class="create-option-btn" @click="showTemplateList = true">
                  <span class="option-icon"></span>
                  <span class="option-label">我的模板</span>
                </button>
                <button class="create-option-btn" @click="showTemplateMarket = true">
                  <span class="option-icon"></span>
                  <span class="option-label">模板市场</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!--  新增：模板选择弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showTemplateList" class="template-dialog-overlay" @click="showTemplateList = false">
          <div class="template-dialog" @click.stop>
            <div class="dialog-header">
              <h3>选择模板</h3>
              <button class="dialog-close" @click="showTemplateList = false">×</button>
            </div>
            <div class="dialog-body">
              <div class="template-list" v-if="myTemplates.length > 0">
                <div 
                  class="template-item" 
                  v-for="template in myTemplates" 
                  :key="template.id"
                  @click="createFromTemplate(template)"
                >
                  <div class="template-preview">
                    <img v-if="template.image" :src="template.image" alt="模板" />
                    <div v-else class="template-placeholder">{{ template.title }}</div>
                  </div>
                  <div class="template-info">
                    <div class="template-title">{{ template.title }}</div>
                    <div class="template-date">{{ template.createdAt }}</div>
                  </div>
                </div>
              </div>
              <div class="empty-state" v-else>
                <div class="empty-icon"></div>
                <p>暂无模板，请先保存一些模板吧！</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!--  新增：模板市场弹窗（预留） -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showTemplateMarket" class="market-dialog-overlay" @click="showTemplateMarket = false">
          <div class="market-dialog" @click.stop>
            <div class="dialog-header">
              <h3>模板市场</h3>
              <button class="dialog-close" @click="showTemplateMarket = false">×</button>
            </div>
            <div class="dialog-body">
              <div class="empty-state">
                <div class="empty-icon"></div>
                <p>模板市场即将上线，敬请期待！</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import img1 from '../../assets/images/111.png'
import './index.css' // 导入独立的 CSS 文件

const router = useRouter()

// 当前选中的菜单
const activeMenu = ref('projects') // 'projects' | 'templates' | 'market'

// 模拟后端返回的[全部]项目列表数据
const projectList = ref([
  { id: 1, title: '物料1-假数据...', status: 1, image: img1 },
  { id: 2, title: '物料2-假数据...', status: 0, image: '' },
  { id: 3, title: '物料3-假数据...', status: 0, image: '' },
  { id: 4, title: '物料4-假数据...', status: 0, image: '' },
  { id: 5, title: '物料5-假数据...', status: 0, image: '' },
  { id: 6, title: '物料6-第二页测试', status: 1, image: '' },
  { id: 7, title: '物料7-第二页测试', status: 0, image: '' },
  { id: 8, title: '物料8-第二页测试', status: 1, image: '' },
  { id: 9, title: '物料9-第二页测试', status: 0, image: '' },
  { id: 10, title: '物料10-第二页测试', status: 0, image: '' },
  { id: 11, title: '物料11-第二页测试', status: 0, image: '' },
])

// 从 localStorage 加载我的模板
const loadMyTemplates = () => {
  const stored = localStorage.getItem('my-go-view-templates')
  if (stored) {
    try {
      return JSON.parse(stored).map((t: any) => ({
        ...t,
        status: 0, // 模板默认未发布
        type: 'template'
      }))
    } catch {
      return []
    }
  }
  return []
}

// 我的模板列表
const myTemplates = ref(loadMyTemplates())

// 根据当前菜单返回对应的列表
const currentList = computed(() => {
  if (activeMenu.value === 'templates') return myTemplates.value
  return projectList.value
})

//主题切换逻辑
const isLightMode = ref(false)
const toggleTheme = () =>{
    isLightMode.value = !isLightMode.value
}
//侧边栏折叠逻辑
const isSidebarCollapsed = ref(false)
const toggleSidebar = () =>{
    isSidebarCollapsed.value = !isSidebarCollapsed.value
}
//更多选项（下拉菜单逻辑
const activeMenuId = ref<number | null>(null)
//切换菜单显示
const toggleMenu = (id:number) =>{
    activeMenuId.value = activeMenuId.value === id ? null : id
}
//点击页面其他地方关闭菜单
const closeMenu = () =>{
    activeMenuId.value = null
}
onMounted(() =>window.addEventListener('click',closeMenu))
onUnmounted(() =>window.removeEventListener('click',closeMenu))
//处理下拉菜单的具体点击事件
const handleAction = (action:string,item:any) =>{
    if(action === 'preview'){
        openPreview(item)
    }else if(action === 'toggleStatus'){
        // 只对全部项目有效，模板不支持发布状态切换
        if (activeMenu.value === 'projects') {
            item.status = item.status === 1 ? 0 : 1
        }
    }else if(action === 'delete'){
        // 根据当前菜单决定从哪个列表中删除
        if (activeMenu.value === 'templates') {
            const index = myTemplates.value.findIndex(p => p.id === item.id)
            if(index > -1) {
                myTemplates.value.splice(index, 1)
                // 同时更新 localStorage
                localStorage.setItem('my-go-view-templates', JSON.stringify(myTemplates.value))
            }
        } else {
            const index = projectList.value.findIndex(p => p.id === item.id)
            if(index > -1) projectList.value.splice(index, 1)
        }
    }
    activeMenuId.value = null // 关闭菜单
}
//  新增分页逻辑 
const currentPage = ref(1)
const pageSize = ref(10) // 默认每页10条

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(currentList.value.length / pageSize.value) || 1
})

// 计算当前页应该显示的数据 (前端切片假分页)
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return currentList.value.slice(start, end)
})

//  新增放大预览逻辑 
const showPreview = ref(false)
const currentPreviewItem = ref<any>(null)

const openPreview = (item: any) => {
  currentPreviewItem.value = item
  showPreview.value = true
}

const closePreview = () => {
  showPreview.value = false
  currentPreviewItem.value = null
}

// 路由跳转
const createNewProject = () => router.push({ path: '/editor' })

// 创建弹窗相关状态
const showCreateDialog = ref(false)
const showTemplateList = ref(false)
const showTemplateMarket = ref(false)

// 生成图表编辑器
const createChartEditor = () => {
  // 清空 localStorage 中的编辑器数据
  localStorage.removeItem('my-go-view-data')
  localStorage.removeItem('chart-editor-data')
  showCreateDialog.value = false
  router.push({ path: '/chart-editor' })
}

// 组件编辑器（原新项目）
const createComponentEditor = () => {
  // 清空 localStorage 中的编辑器数据，确保新建是空白画布
  localStorage.removeItem('my-go-view-data')
  showCreateDialog.value = false
  router.push({ path: '/editor' })
}

// 从模板创建项目
const createFromTemplate = (template: any) => {
  if (!template.data) {
    alert('模板数据不完整！')
    return
  }
  
  // 判断是否是图表模板
  const isChartTemplate = template.type === 'chart'
  
  if (isChartTemplate) {
    // 图表模板：将数据保存到 chart-editor-data
    localStorage.setItem('chart-editor-data', template.data)
    showTemplateList.value = false
    showCreateDialog.value = false
    router.push({ path: '/chart-editor' })
  } else {
    // 组件模板：将数据保存到 my-go-view-data
    localStorage.setItem('my-go-view-data', template.data)
    showTemplateList.value = false
    showCreateDialog.value = false
    router.push({ path: '/editor' })
  }
}

const editProject = (id: number) => {
  // 判断是否是模板
  const isTemplate = activeMenu.value === 'templates'
  router.push({ 
    path: '/editor', 
    query: { 
      id: id.toString(),
      type: isTemplate ? 'template' : 'project'
    } 
  })
}

// 加载模板数据到编辑器
const loadTemplateToEditor = () => {
  const queryId = router.currentRoute.value.query.id
  const queryType = router.currentRoute.value.query.type
  
  if (queryType === 'template' && queryId) {
    const template = myTemplates.value.find(t => t.id === Number(queryId))
    if (template && template.data) {
      // 将模板数据保存到预览存储，供编辑器加载
      localStorage.setItem('my-go-view-data', template.data)
    }
  }
}

// 页面挂载时检查是否需要加载模板
onMounted(() => {
  window.addEventListener('click', closeMenu)
  // 如果有路由参数，尝试加载模板数据
  loadTemplateToEditor()
})
</script>
