// stores/useAIChartStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAIChartStore = defineStore('aiChart', () => {
  const loading = ref(false)
  const streamContent = ref('')

  // 系统 Prompt 模板
  const SYSTEM_PROMPT = `你是一个 Echarts 图表配置生成专家。
用户会用自然语言描述他们想要的图表，你需要：
1. 根据描述生成完整的 Echarts option 配置
2. 只返回纯 JSON，不要包含任何解释文字、Markdown 标记或代码块符号（如 \`\`\`json）
3. 必须包含 title、xAxis、yAxis、series 等必要字段
4. 数据如果用户没给，就生成合理的模拟数据（5-8个数据点）
5. 配色要美观专业，使用 ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'] 等颜色
6. 图表类型只能是 'bar' (柱状图) 或 'line' (折线图)
7. 确保 series 中的 data 数组长度与 xAxis.data 长度一致
8. 如果有多个系列，每个系列的 name 要有意义

示例输出格式：
{
  "title": { "text": "销售趋势" },
  "xAxis": { "type": "category", "data": ["2020", "2021", "2022", "2023", "2024"], "name": "年份" },
  "yAxis": { "type": "value", "name": "销售额(万元)" },
  "series": [
    { "name": "产品A", "type": "bar", "data": [120, 200, 150, 80, 70] },
    { "name": "产品B", "type": "bar", "data": [100, 180, 130, 90, 60] }
  ]
}`

  // SSE 流式调用 AI
  async function generateChart(userPrompt: string): Promise<any> {
    loading.value = true
    streamContent.value = ''

    try {
      const response = await fetch('/api/ai/generate-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          stream: true
        })
      })

      // SSE 流式读取（对应图一的亮点4）
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            streamContent.value += content
          } catch (e) {
            // skip
          }
        }
      }

      // 解析最终的 Echarts option
      console.log('[AI Debug] 原始流内容:', streamContent.value)
      
      // 尝试多种 JSON 提取方式
      let jsonStr = streamContent.value
      
      // 方法1: 直接尝试解析整个内容
      try {
        const result = JSON.parse(jsonStr)
        console.log('[AI Debug] 方法1成功:', result)
        return result
      } catch (e) {
        console.log('[AI Debug] 方法1失败，尝试方法2')
        
        // 方法2: 清理 Markdown 代码块标记
        const cleaned = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        console.log('[AI Debug] 清理后的内容:', cleaned)
        
        // 尝试解析清理后的内容
        try {
          const result = JSON.parse(cleaned)
          console.log('[AI Debug] 方法2成功:', result)
          return result
        } catch (e2) {
          console.log('[AI Debug] 方法2失败，尝试方法3')
          
          // 方法3: 提取第一个完整的 JSON 对象
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try {
              const result = JSON.parse(jsonMatch[0])
              console.log('[AI Debug] 方法3成功:', result)
              return result
            } catch (e3) {
              console.log('[AI Debug] 方法3失败:', e3)
            }
          }
        }
        
        console.error('[AI Debug] 所有解析方法都失败，原始内容:', jsonStr)
        throw new Error('AI 返回格式异常，无法解析为有效的 JSON。请检查 AI 返回的内容格式。')
      }
    } finally {
      loading.value = false
    }
  }

  return { loading, streamContent, generateChart }
})