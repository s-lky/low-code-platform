// server/index.ts
import express from 'express'
import cors from 'cors'
import aiRouter from './routes/ai'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// 在 ES 模块中获取 __dirname 的替代方法
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 强制指定读取项目根目录的 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../.env') }) 

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
  console.log(`http://localhost:${PORT}`) // 查看AI服务是否启动成功
  console.log(`http://localhost:${PORT}/api/health`) // 查看健康检查是否正常
})
