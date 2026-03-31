<template>
    <!-- 动态绑定light-theme类名来实现亮色模式 -->
  <div class="project-container" :class="{ 'light-theme':isLightMode }">
    <!-- 左侧侧边栏(动态绑定collapsed类名) -->
    <aside class="sidebar" :class="{ 'collapsed': isSidebarCollapsed }">
      <div class="new-btn-box">
        <button class="btn-new" @click="createNewProject">
          <span class="icon">+</span> 新建
        </button>
      </div>
      <nav class="menu">
        <div class="menu-item active">全部项目</div>
        <div class="menu-item">我的模板</div>
        <div class="menu-item">模板市场</div>
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
                        <span>🖥️</span> 预览
                      </div>
                      <div class="dropdown-item" @click="handleAction('toggleStatus', item)">
                        <span>✈️</span> {{ item.status === 1 ? '取消发布' : '发布' }}
                      </div>
                      <div class="dropdown-item delete" @click="handleAction('delete', item)">
                        <span>🗑️</span> 删除
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import img1 from '../../assets/images/111.png'
import './index.css' // 导入独立的 CSS 文件

const router = useRouter()

// 模拟后端返回的[全部]项目列表数据（我多加了几个数据，方便测试分页）
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
  { id: 11, title: '物料11-第二页测试', status: 0, image: '' }, // 第11个数据，触发第二页
])

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
        item.status = item.status === 1 ? 0 : 1 //切换发布状态
    }else if(action === 'delete'){
        const index = projectList.value.findIndex(p=>p.id === item.id)
        if(index>-1) projectList.value.splice(index,1)
    }
}
//  新增分页逻辑 
const currentPage = ref(1)
const pageSize = ref(10) // 默认每页10条

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(projectList.value.length / pageSize.value) || 1
})

// 计算当前页应该显示的数据 (前端切片假分页)
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return projectList.value.slice(start, end)
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
const editProject = (id: number) => router.push({ path: '/editor', query: { id: id.toString() } })
</script>
