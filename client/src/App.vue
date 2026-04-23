<script setup lang="ts">
import { ref } from 'vue'

const isEmbed = new URLSearchParams(window.location.search).has('embed')
import UploadZone from './components/UploadZone.vue'
import StepProgress from './components/StepProgress.vue'
import NoteResult from './components/NoteResult.vue'
import VideoChat from './components/VideoChat.vue'

type AppState = 'idle' | 'processing' | 'done' | 'error'

const appState = ref<AppState>('idle')
const processingStep = ref(0)
const processingMessage = ref('')
const fileName = ref('')
const transcript = ref('')
const notes = ref('')
const errorMessage = ref('')
const warningMessage = ref('')

function handleEvent(event: Record<string, unknown>) {
  switch (event.type) {
    case 'progress':
      processingStep.value = event.step as number
      processingMessage.value = event.message as string
      break
    case 'transcript':
      transcript.value = event.text as string
      break
    case 'notes_delta':
      notes.value += event.text as string
      break
    case 'warning':
      warningMessage.value = event.message as string
      break
    case 'done':
      appState.value = 'done'
      break
    case 'error':
      errorMessage.value = event.message as string
      appState.value = 'error'
      break
  }
}

async function analyzeFile(file: File) {
  fileName.value = file.name
  appState.value = 'processing'
  processingStep.value = 1
  processingMessage.value = '正在上传文件...'
  transcript.value = ''
  notes.value = ''
  errorMessage.value = ''
  warningMessage.value = ''

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch('/api/analyze', { method: 'POST', body: formData })

    if (!response.ok || !response.body) {
      throw new Error(`上传失败（${response.status}）`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''

      for (const block of blocks) {
        for (const line of block.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try { handleEvent(JSON.parse(line.slice(6))) } catch { /**/ }
        }
      }
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '处理失败，请重试'
    appState.value = 'error'
  }
}

function reset() {
  appState.value = 'idle'
  transcript.value = ''
  notes.value = ''
  fileName.value = ''
  processingStep.value = 0
  processingMessage.value = ''
  errorMessage.value = ''
  warningMessage.value = ''
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header v-if="!isEmbed" class="header">
      <div class="header-inner">
        <div class="logo">🎬</div>
        <div>
          <h1>AI 视频笔记助手</h1>
          <p>上传视频 / 音频，自动生成结构化笔记，还能对话提问</p>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="main">
      <transition name="fade" mode="out-in">

        <!-- Idle: upload -->
        <div v-if="appState === 'idle'" key="idle">
          <UploadZone @file-selected="analyzeFile" />
        </div>

        <!-- Processing -->
        <div v-else-if="appState === 'processing'" key="processing" class="processing-wrapper">
          <p v-if="warningMessage" class="warning-banner">⚠️ {{ warningMessage }}</p>
          <StepProgress
            :step="processingStep"
            :message="processingMessage"
            :file-name="fileName"
          />
          <!-- Live notes preview while streaming -->
          <div v-if="notes" class="notes-preview">
            <p class="notes-preview-label">✨ 正在生成笔记...</p>
            <div class="notes-preview-text">{{ notes }}</div>
          </div>
        </div>

        <!-- Done: results + chat -->
        <div v-else-if="appState === 'done'" key="done">
          <p v-if="warningMessage" class="warning-banner">⚠️ {{ warningMessage }}</p>
          <NoteResult
            :transcript="transcript"
            :notes="notes"
            :file-name="fileName"
            @reset="reset"
          />
          <VideoChat :transcript="transcript" :notes="notes" />
        </div>

        <!-- Error -->
        <div v-else key="error" class="error-card">
          <div class="error-icon">⚠️</div>
          <h2>处理失败</h2>
          <p class="error-message">{{ errorMessage }}</p>
          <button class="btn-primary" @click="reset">重新开始</button>
        </div>

      </transition>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
  padding: 20px 0;
  flex-shrink: 0;
}

.header-inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
}

.logo {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
}

h1 {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 3px;
}

.header p {
  font-size: 0.84rem;
  opacity: 0.85;
}

.main {
  flex: 1;
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px 48px;
}

.processing-wrapper { display: flex; flex-direction: column; gap: 20px; }

.notes-preview {
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px 24px;
}

.notes-preview-label {
  font-size: 0.84rem;
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 12px;
}

.notes-preview-text {
  font-size: 0.88rem;
  color: var(--muted);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.7;
}

.warning-banner {
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 0.85rem;
  color: #92400e;
  margin-bottom: 4px;
}

.error-card {
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 48px 32px;
  text-align: center;
}

.error-icon { font-size: 3rem; margin-bottom: 16px; }

.error-card h2 {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: var(--error);
}

.error-message {
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 24px;
  max-width: 400px;
  margin-inline: auto;
}

.btn-primary {
  padding: 10px 28px;
  background: linear-gradient(135deg, var(--primary), #9333ea);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from  { opacity: 0; transform: translateY(8px); }
.fade-leave-to    { opacity: 0; transform: translateY(-8px); }
</style>
