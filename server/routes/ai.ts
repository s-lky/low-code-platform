// server/routes/ai.ts
import express from 'express'

const router = express.Router()

router.post('/generate-chart', async (req, res) => {
  const { messages } = req.body

  console.log('[AI Server] 收到请求，消息数量:', messages?.length)
  console.log("当前读取的API KEY是:", process.env.DEEPSEEK_API_KEY);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        //写死测试：'Bearer sk-key'
        // 'Authorization': `Bearer sk-xxxxxxxxxx` 
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI Server] API 错误:', errorText)
      return res.status(response.status).json({ error: errorText })
    }

    // 设置标准的 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    //利用 ReadableStream 透传，不需要手动 decode 和拼接
    if (response.body) {
      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // value 是 Uint8Array 字节流，直接原封不动写给前端
        res.write(value) 
      }
    }
    
    res.end()
    console.log('[AI Server] 转发完成')

  } catch (error) {
    console.error('[AI Server] 异常:', error)
    res.status(500).json({ error: '服务端异常' })
  }
})

export default router