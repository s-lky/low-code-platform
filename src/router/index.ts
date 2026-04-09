import { createRouter, createWebHistory } from 'vue-router'
import { useEidtorStore } from '../store/editor'

const router = createRouter({
    history:createWebHistory(),
    scrollBehavior(to, from, savedPosition) {
        // 返回到页面顶部，防止布局错乱
        return { top: 0, left: 0 }
    },
    routes:[
    {
        path:'/editor',
        name:'Workspace',
        component:()=>import('../views/workplace/index.vue')
    },
    {
        path:'/chart-editor',
        name:'ChartEditor',
        component:()=>import('../views/chart-editor/index.vue')
    },
    {
        path:'/preview',
        name:'Preview',
        component:() => import('../views/proview/index.vue')
    },
    {
        path:'/',
        name:'ProjectList',
        component:() => import('../views/project/index.vue')
    },
    ]
})

// 路由守卫：进入编辑器时确保画布是空白的
router.beforeEach((to, from) => {
  if (to.name === 'Workspace') {
    // 如果不是从预览页返回，说明是新建，清空画布
    if (from.name !== 'Preview') {
      const editorStore = useEidtorStore()
      editorStore.clearCanvas()
    }
  }
})

export default router