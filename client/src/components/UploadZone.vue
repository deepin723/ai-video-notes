<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ 'file-selected': [file: File] }>()

const ACCEPT = '.mp4,.mkv,.avi,.mov,.webm,.flv,.wmv,.mp3,.wav,.m4a,.ogg,.flac,.aac,.opus'
const MAX_SIZE = 500 * 1024 * 1024

const isDragging = ref(false)
const errorMsg = ref('')
const inputRef = ref<HTMLInputElement>()

function processFile(file: File) {
  errorMsg.value = ''
  if (file.size > MAX_SIZE) {
    errorMsg.value = '文件超过 500MB 限制'
    return
  }
  emit('file-selected', file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}
</script>

<template>
  <div class="upload-wrapper">
    <div
      class="upload-zone"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="inputRef?.click()"
    >
      <input ref="inputRef" type="file" :accept="ACCEPT" hidden @change="onFileChange" />

      <div class="upload-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      <p class="upload-title">拖放文件，或点击选择</p>
      <p class="upload-hint">视频：MP4 / MKV / AVI / MOV / WebM<br>音频：MP3 / WAV / M4A / FLAC / AAC</p>
      <p class="upload-limit">最大 500MB</p>
    </div>

    <p v-if="errorMsg" class="upload-error">⚠️ {{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.upload-wrapper { width: 100%; }

.upload-zone {
  border: 2.5px dashed #c4b5fd;
  border-radius: var(--radius);
  background: #faf8ff;
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.upload-zone:hover,
.upload-zone.dragging {
  border-color: var(--primary);
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(124, 58, 237, 0.15);
}

.upload-icon svg {
  width: 56px;
  height: 56px;
  color: var(--primary);
  margin-bottom: 16px;
}

.upload-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
}

.upload-hint {
  font-size: 0.88rem;
  color: var(--muted);
  line-height: 1.8;
  margin-bottom: 8px;
}

.upload-limit {
  font-size: 0.78rem;
  color: #94a3b8;
}

.upload-error {
  margin-top: 12px;
  font-size: 0.88rem;
  color: var(--error);
  text-align: center;
}
</style>
