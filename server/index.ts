// server/index.ts
import express from 'express'
import cors from 'cors'
import aiRouter from './routes/ai'

const app = express()
const PORT = Number(process.env.PORT || 3001)
// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/ai', aiRouter)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AI服务运行中' })
})

app.listen(PORT,'0.0.0.0',() => {
  console.log(`AI服务已启动: http://localhost:${PORT}`)
  console.log(`健康检查: http://localhost:${PORT}/api/health`)
})
