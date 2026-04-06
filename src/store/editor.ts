import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ComponentDataConfig, EditorComponent } from '../types/component'

export const defaultBarChartConfig = {
  id: 'xxx',
  component: 'VBarChart',
  style: { /* 宽、高、位置等 */ },
  dataConfig: {
    type: 'static',
    staticData: JSON.stringify([
      { name: '周一', value: 120 },
      { name: '周二', value: 200 },
      { name: '周三', value: 150 },
      { name: '周四', value: 80 }
    ], null, 2),
    xField: 'name',
    yField: 'value'
  }
}

export const useEidtorStore = defineStore('editor',()=>{
    // 画布上的组件列表
  // 给 componentData 加上类型约束
    const componentData = ref<Array<EditorComponent>>([])
    // 当前选中的组件
    const curComponent = ref<EditorComponent | null>(null)

    const canvasConfig = ref({
        width: 1920,
        height: 1080,
        background:'#0f1011'
    })

    const removeComponent = (id: string) =>{
        const index = componentData.value.findIndex(item => item.id === id)
        if(index !== -1){
            componentData.value.splice(index,1)
            //清空选中态
            if(curComponent.value?.id === id){
                curComponent.value = null
            }
        }
    }

    //添加组件的方法
    const addComponent = (component: EditorComponent) => {
        componentData.value.push(component)
    }

    //设置当前选中的组件
    const setCurComponent = (component: any | null) => {
        curComponent.value = component
    }

    // 清空画布数据
    const clearCanvas = () => {
        componentData.value = []
        curComponent.value = null
    }

    // 批量设置画布数据（用于加载模板）
    const setComponentData = (data: Array<EditorComponent>) => {
        componentData.value = data
    }

    return{
        componentData,
        curComponent,
        canvasConfig,
        removeComponent,
        addComponent,
        setCurComponent,
        clearCanvas,
        setComponentData,
    }
})
