import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import { createReadStream, promises as fs } from 'fs'
import { tmpdir } from 'os'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import OpenAI from 'openai'

dotenv.config()
ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5174' }))
app.use(express.json())

const upload = multer({
  dest: tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
})

const SUPPORTED = /\.(mp4|mkv|avi|mov|webm|flv|wmv|mp3|wav|m4a|ogg|flac|aac|opus)$/i

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
  })
}

// Convert any video/audio to a compact mono MP3 via ffmpeg
function toMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('64k')
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on('end', resolve)
      .on('error', (err) => reject(new Error(`FFmpeg: ${err.message}`)))
      .run()
  })
}

// POST /api/analyze — SSE stream: progress → transcript → notes_delta → done
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' })
  if (!SUPPORTED.test(req.file.originalname)) {
    await fs.unlink(req.file.path).catch(() => {})
    return res.status(400).json({ error: '不支持的文件格式' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
  const inputPath = req.file.path
  const audioPath = `${inputPath}.mp3`

  try {
    const openai = getOpenAI()

    // Step 1: Extract audio
    send({ type: 'progress', step: 1, message: '正在用 FFmpeg 提取音轨...' })
    await toMp3(inputPath, audioPath)
    const { size } = await fs.stat(audioPath)
    const sizeMB = (size / 1024 / 1024).toFixed(1)

    if (size > 24 * 1024 * 1024) {
      send({ type: 'warning', message: `音频 ${sizeMB}MB，接近 Whisper 25MB 限制，如失败请用更短的视频` })
    }

    // Step 2: Whisper transcription
    send({ type: 'progress', step: 2, message: `转录中（${sizeMB}MB），请稍候...` })
    const result = await openai.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: process.env.WHISPER_MODEL || 'whisper-1',
      response_format: 'text',
    })
    const transcript = typeof result === 'string' ? result : result.text
    send({ type: 'transcript', text: transcript })

    // Step 3: GPT note generation (streaming)
    send({ type: 'progress', step: 3, message: 'AI 正在整理笔记...' })
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是专业的笔记整理助手，将音视频转录内容整理成清晰的 Markdown 结构化笔记。',
        },
        {
          role: 'user',
          content: `请整理以下转录内容，生成结构化笔记，包含：

## 核心摘要
（2-3 句话概括最重要的内容）

## 关键要点
（用 - 列表，5-10 条，每条简洁有力）

## 详细内容
（段落式整理核心信息，保留重要细节）

---
转录内容：
${transcript.slice(0, 8000)}`,
        },
      ],
      stream: true,
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) send({ type: 'notes_delta', text })
    }

    send({ type: 'done' })
  } catch (err) {
    console.error('[analyze]', err.message)
    send({ type: 'error', message: err.message || '处理失败，请重试' })
  } finally {
    res.end()
    fs.unlink(inputPath).catch(() => {})
    fs.unlink(audioPath).catch(() => {})
  }
})

// POST /api/chat — chat about the video
app.post('/api/chat', async (req, res) => {
  const { messages, transcript, notes } = req.body
  if (!Array.isArray(messages)) return res.status(400).json({ error: '参数错误' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const openai = getOpenAI()
    const ctx = [
      notes ? `## 视频笔记\n${notes.slice(0, 2000)}` : '',
      transcript ? `## 原文转录\n${transcript.slice(0, 4000)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `你是基于视频内容的智能问答助手。请根据以下内容回答用户的问题：\n\n${ctx}`,
        },
        ...messages,
      ],
      stream: true,
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message || '请求失败' })}\n\n`)
  } finally {
    res.end()
  }
})

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🎬 Server: http://localhost:${PORT}`))
