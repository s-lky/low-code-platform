/**
 * 示例：如何创建一个可热插拔的自定义组件
 * 
 * 用户可以在外部开发这样的组件，然后通过以下方式集成到平台：
 * 
 * 方式一：Vite 构建 ESM 模块
 * 1. 新建一个 Vue 项目或使用 Vite 库模式
 * 2. 编写组件代码（如下所示）
 * 3. 运行 `vite build --mode lib` 构建
 * 4. 将生成的 dist 目录部署到 CDN 或静态服务器
 * 5. 在平台中点击"添加自定义组件"，填入：
 *    - 组件名称: MyCustomChart
 *    - 组件URL: http://your-cdn.com/MyCustomChart.js
 * 
 * 方式二：UMD 模块
 * 1. 使用 webpack 或 rollup 打包成 UMD 格式
 * 2. 确保组件暴露在 window 对象上
 * 3. 在平台中注册即可
 */

import { defineComponent, ref, onMounted, onBeforeUnmount, markRaw } from 'vue'
import * as echarts from 'echarts'

export default defineComponent({
  name: 'MyCustomChart',
  props: {
    propValue: {
      type: Object,
      default: () => ({
        title: '自定义图表'
      })
    },
    dataConfig: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const chartRef = ref(null)
    let chartInstance = null

    const getOption = () => {
      let seriesData = []
      
      // 支持静态数据和 API 数据
      if (props.dataConfig?.staticData) {
        try {
          const data = JSON.parse(props.dataConfig.staticData)
          if (Array.isArray(data)) {
            seriesData = data.map(item => ({
              name: item[props.dataConfig.xField],
              value: item[props.dataConfig.yField]
            }))
          }
        } catch (e) {
          console.error('解析数据失败:', e)
        }
      }

      // 默认数据
      if (seriesData.length === 0) {
        seriesData = [
          { name: '类别 A', value: 335 },
          { name: '类别 B', value: 310 },
          { name: '类别 C', value: 274 },
          { name: '类别 D', value: 235 },
          { name: '类别 E', value: 400 }
        ]
      }

      return {
        title: {
          text: props.propValue?.title || '自定义图表',
          textStyle: { color: '#fff', fontSize: 14 }
        },
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#0f1011',
            borderWidth: 2
          },
          label: {
            show: true,
            color: '#fff',
            formatter: '{b}\n{d}%'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#fff'
            }
          },
          data: seriesData
        }]
      }
    }

    onMounted(() => {
      if (chartRef.value) {
        chartInstance = markRaw(echarts.init(chartRef.value))
        chartInstance.setOption(getOption())
      }
    })

    onBeforeUnmount(() => {
      if (chartInstance) {
        chartInstance.dispose()
        chartInstance = null
      }
    })

    return () => (
      <div ref={chartRef} style={{ width: '100%', height: '100%' }}></div>
    )
  }
})
