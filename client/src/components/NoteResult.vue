<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  transcript: string
  notes: string
  fileName: string
}>()

const emit = defineEmits<{ reset: [] }>()

const activeTab = ref<'notes' | 'transcript'>('notes')

const notesHtml = computed(() => String(marked.parse(props.notes)))

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}
</script>

<template>
  <div class="result-card">
    <div class="result-header">
      <div class="result-title">
        <span>📄</span>
        <span class="file-name-text">{{ fileName }}</span>
      </div>
      <button class="btn-outline" @click="emit('reset')">↩ 重新分析</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">
        ✨ 笔记
      </button>
      <button class="tab" :class="{ active: activeTab === 'transcript' }" @click="activeTab = 'transcript'">
        📝 原文转录
      </button>
    </div>

    <!-- Notes tab -->
    <div v-if="activeTab === 'notes'" class="tab-content">
      <div class="tab-actions">
        <button class="btn-ghost" @click="copyText(notes)">复制笔记</button>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="markdown" v-html="notesHtml" />
    </div>

    <!-- Transcript tab -->
    <div v-else class="tab-content">
      <div class="tab-actions">
        <button class="btn-ghost" @click="copyText(transcript)">复制全文</button>
      </div>
      <div class="transcript">{{ transcript }}</div>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  overflow: hidden;
}

.file-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
  color: var(--muted);
  font-weight: 400;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 24px;
}

.tab {
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2.5px solid transparent;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -1px;
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab:hover:not(.active) { color: var(--text); }

.tab-content { padding: 20px 24px 28px; }

.tab-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.transcript {
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--muted);
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.btn-outline {
  padding: 6px 14px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: none;
  font-size: 0.84rem;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-outline:hover { border-color: var(--primary); color: var(--primary); }

.btn-ghost {
  padding: 5px 12px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.82rem;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-ghost:hover { background: var(--primary-light); color: var(--primary); border-color: #c4b5fd; }
</style>
