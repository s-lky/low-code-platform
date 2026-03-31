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

<style scoped>
/*  CSS变量控制主题  */
.project-container {
  /* 默认暗色模式颜色字典 */
  --bg-main: #151518;
  --bg-sidebar: #1d1e23;
  --bg-card: #22242b;
  --bg-image-area: #121214;
  --text-primary: #cfd3dc;
  --text-muted: #999;
  --border-color: #2d2d30;
  --hover-bg: rgba(255, 255, 255, 0.05);
  
  display: flex; height: 100vh; 
  background-color: var(--bg-main); 
  color: var(--text-primary); 
  font-family: sans-serif; overflow: hidden;
  transition: background-color 0.3s, color 0.3s; /* 主题切换动画 */
}

/* 亮色模式颜色字典 (应用此class时自动覆盖上面的变量) */
.project-container.light-theme {
  --bg-main: #f0f2f5;
  --bg-sidebar: #ffffff;
  --bg-card: #ffffff;
  --bg-image-area: #fafafa;
  --text-primary: #333333;
  --text-muted: #666666;
  --border-color: #ebeef5;
  --hover-bg: #f5f7fa;
}

/*  布局与侧边栏  */
.sidebar { 
  width: 250px; 
  background-color: var(--bg-sidebar); 
  border-right: 1px solid var(--border-color); 
  display: flex; flex-direction: column;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); /* 平滑折叠动画 */
  overflow: hidden; /* 防止文字溢出 */
  white-space: nowrap;
}
/* 折叠状态 */
.sidebar.collapsed { width: 0; border-right: none; }

.new-btn-box { padding: 24px; }
.btn-new { width: 100%; padding: 10px 0; background-color: rgba(24, 160, 88, 0.1); color: #18a058; border: 1px solid #18a058; border-radius: 6px; cursor: pointer; transition: 0.3s; }
.btn-new:hover { background-color: #18a058; color: #fff; }
.menu { padding: 0 12px; }
.menu-item { padding: 14px 20px; margin-bottom: 8px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.menu-item:hover { background-color: var(--hover-bg); }
.menu-item.active { background-color: rgba(24, 160, 88, 0.2); color: #18a058; font-weight: bold; }

/*  右侧主内容与折叠按钮  */
.main-content { flex: 1; display: flex; flex-direction: column; position: relative; }

.collapse-btn {
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 14px; height: 50px;
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-left: none;
  border-radius: 0 4px 4px 0;
  display: flex; justify-content: center; align-items: center;
  cursor: pointer; z-index: 10;
  color: var(--text-muted); font-size: 12px;
}
.collapse-btn:hover { color: #18a058; }

.header { height: 60px; display: flex; justify-content: flex-end; align-items: center; padding: 0 24px; background-color: var(--bg-sidebar); border-bottom: 1px solid var(--border-color); }
.header-right { display: flex; gap: 20px; align-items: center; cursor: pointer; }
.theme-toggle { font-size: 18px; user-select: none; transition: transform 0.3s;}
.theme-toggle:hover { transform: scale(1.2); }
.avatar { width: 32px; height: 32px; border-radius: 50%; background-color: #fca130; }

.content-body { flex: 1; padding: 24px; overflow-y: auto; }
.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }

/*  卡片样式  */
.project-card { 
  background-color: var(--bg-card); 
  border-radius: 8px; 
  border: 1px solid var(--border-color); 
  /* 注意：为了让下拉菜单不被切断，卡片不能用 overflow: hidden，我们把圆角移到内部元素上 */
  transition: transform 0.2s, box-shadow 0.2s; position: relative; z-index: 1;
}
.project-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); z-index: 5; }
.project-card.menu-active {z-index: 10;}

.card-image {
  height: 160px; background-color: var(--bg-image-area); 
  display: flex; justify-content: center; align-items: center; 
  border-bottom: 1px solid var(--border-color); 
  border-radius: 8px 8px 0 0; /* 内部圆角 */
  position: relative; cursor: pointer; overflow: hidden;
}
.real-image { width: 100%; height: 100%; object-fit: cover; }
.placeholder-text { color: var(--text-muted); font-size: 14px; }
.hover-mask { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; opacity: 0; transition: 0.3s; pointer-events: none;}
.card-image:hover .hover-mask { opacity: 1; }
.zoom-icon { color: #fff; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 4px;}
.dots { position: absolute; top: 10px; left: 10px; display: flex; gap: 6px; z-index: 2; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background-color: #f56c6c; }
.dot.green { background-color: #18a058; }

.card-footer { padding: 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 8px 8px;}
.info { display: flex; flex-direction: column; gap: 6px; }
.title { font-size: 14px; color: var(--text-primary); }
.status { font-size: 12px; display: flex; align-items: center; gap: 4px; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.status.published { color: #18a058; }
.status.published .status-dot { background-color: #18a058; }
.status.unpublished { color: #e6a23c; }
.status.unpublished .status-dot { background-color: #e6a23c; }

/*  下拉菜单样式  */
.actions { display: flex; gap: 8px; }
.action-btn { background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); border-radius: 4px; padding: 6px 10px; cursor: pointer; transition: 0.2s; }
.action-btn:hover { background: var(--hover-bg); color: var(--text-primary); }

.dropdown-wrapper { position: relative; } /* 菜单的相对定位容器 */
.dropdown-menu {
  position: absolute;
  top: 100%; right: 0;
  margin-top: 8px;
  width: 120px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 100; /* 保证在最顶层 */
  overflow: hidden;
}
.dropdown-item {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: 0.2s;
  display: flex; gap: 8px; align-items: center;
}
.dropdown-item:hover { background-color: var(--hover-bg); }
.dropdown-item.delete:hover { color: #f56c6c; background-color: rgba(245, 108, 108, 0.1); }

/*  分页及其他复用样式  */
.pagination-footer { padding: 16px 24px; background-color: var(--bg-sidebar); border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; }
.pagination { display: flex; align-items: center; gap: 8px; }
.page-btn { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-muted); width: 32px; height: 32px; border-radius: 4px; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: 0.2s;}
.page-btn:not(:disabled):hover { border-color: #18a058; color: #18a058; }
.page-btn.active { background: rgba(24, 160, 88, 0.1); border-color: #18a058; color: #18a058; cursor: default; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-size-select select { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); height: 32px; padding: 0 10px; border-radius: 4px; outline: none; cursor: pointer; }

/* 预览弹窗复用之前的样式...（未做修改，仅保持结构） */
.preview-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.8); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
.preview-box { width: 70vw; height: 70vh; background-color: var(--bg-sidebar); border: 1px solid var(--border-color); border-radius: 8px; position: relative; display: flex; flex-direction: column; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.close-btn { position: absolute; top: 12px; right: 16px; font-size: 20px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
.close-btn:hover { color: #f56c6c; transform: scale(1.1); }
.preview-title { margin: 0 0 16px 0; color: var(--text-primary); font-size: 18px; text-align: center; }
.preview-img-wrapper { flex: 1; background-color: var(--bg-image-area); border-radius: 4px; display: flex; justify-content: center; align-items: center; overflow: hidden; }
.preview-img-wrapper img { max-width: 100%; max-height: 100%; object-fit: contain; }
.big-placeholder { color: #fff; font-size: 20px; letter-spacing: 2px; }

/* 动画效果 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-5px); }

</style>