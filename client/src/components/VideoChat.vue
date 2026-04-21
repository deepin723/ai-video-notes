<script setup lang="ts">
import { ref, nextTick } from 'vue'

const props = defineProps<{
  transcript: string
  notes: string
}>()

interface Message { role: 'user' | 'assistant'; content: string }

const messages = ref<Message[]>([])
const input = ref('')
const loading = ref(false)
const listRef = ref<HTMLElement>()
const open = ref(false)

const scrollToBottom = async () => {
  await nextTick()
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
}

const send = async () => {
  const text = input.value.trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true

  const assistantMsg: Message = { role: 'assistant', content: '' }
  messages.value.push(assistantMsg)
  await scrollToBottom()

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.slice(0, -1).map(({ role, content }) => ({ role, content })),
        transcript: props.transcript,
        notes: props.notes,
      }),
    })

    if (!response.body) throw new Error('无响应')

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
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              assistantMsg.content += parsed.text
              await scrollToBottom()
            }
            if (parsed.error) assistantMsg.content = `出错：${parsed.error}`
          } catch { /**/ }
        }
      }
    }
  } catch (err) {
    assistantMsg.content = '请求失败，请重试。'
  } finally {
    loading.value = false
  }
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}
</script>

<template>
  <div class="chat-card">
    <button class="chat-toggle" @click="open = !open">
      <span>💬 与视频对话</span>
      <span class="toggle-icon" :class="{ rotated: open }">▾</span>
    </button>

    <div v-if="open" class="chat-body">
      <div v-if="messages.length === 0" class="chat-empty">
        有问题就问吧，AI 已读取视频内容 ✅
      </div>

      <div ref="listRef" class="chat-messages">
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="msg"
          :class="msg.role"
        >
          <div class="bubble">
            <span v-if="!msg.content && msg.role === 'assistant'" class="thinking">...</span>
            <span v-else>{{ msg.content }}</span>
          </div>
        </div>
      </div>

      <div class="chat-input-row">
        <textarea
          v-model="input"
          :disabled="loading"
          placeholder="问关于这个视频的任何问题…"
          rows="1"
          @keydown="onKeydown"
        />
        <button :disabled="loading || !input.trim()" @click="send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.chat-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: none;
  border: none;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s;
}
.chat-toggle:hover { background: #f8f7ff; }

.toggle-icon { transition: transform 0.2s; font-size: 1.1rem; color: var(--muted); }
.toggle-icon.rotated { transform: rotate(180deg); }

.chat-body { border-top: 1px solid var(--border); }

.chat-empty {
  padding: 20px 24px;
  font-size: 0.88rem;
  color: var(--muted);
  text-align: center;
}

.chat-messages {
  max-height: 320px;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg { display: flex; }
.msg.user  { justify-content: flex-end; }
.msg.assistant { justify-content: flex-start; }

.bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
}
.msg.user .bubble {
  background: linear-gradient(135deg, var(--primary), #9333ea);
  color: white;
  border-bottom-right-radius: 4px;
}
.msg.assistant .bubble {
  background: #f1f5f9;
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.thinking { color: var(--muted); animation: blink 1s infinite; }

.chat-input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--border);
}

textarea {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: none;
  outline: none;
  max-height: 100px;
  overflow-y: auto;
  transition: border-color 0.15s;
}
textarea:focus { border-color: var(--primary); }
textarea:disabled { background: #f9fafb; cursor: not-allowed; }

button {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--primary), #9333ea);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s, transform 0.1s;
}
button:disabled { opacity: 0.35; cursor: not-allowed; }
button:hover:not(:disabled) { transform: scale(1.06); }
button svg { width: 18px; height: 18px; }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
</style>
