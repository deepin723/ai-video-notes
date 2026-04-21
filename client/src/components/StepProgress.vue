<script setup lang="ts">
defineProps<{
  step: number
  message: string
  fileName: string
}>()

const STEPS = [
  { label: '提取音轨', icon: '🎵' },
  { label: '语音转录', icon: '📝' },
  { label: 'AI 生成笔记', icon: '✨' },
]
</script>

<template>
  <div class="progress-card">
    <div class="file-name">
      <span class="file-icon">🎬</span>
      <span class="file-text">{{ fileName }}</span>
    </div>

    <div class="steps">
      <template v-for="(s, i) in STEPS" :key="i">
        <div class="step" :class="{ done: step > i + 1, active: step === i + 1, waiting: step < i + 1 }">
          <div class="step-bubble">
            <span v-if="step > i + 1" class="check">✓</span>
            <span v-else-if="step === i + 1" class="spinner" />
            <span v-else class="num">{{ i + 1 }}</span>
          </div>
          <p class="step-label">{{ s.icon }} {{ s.label }}</p>
        </div>
        <div v-if="i < STEPS.length - 1" class="step-line" :class="{ done: step > i + 1 }" />
      </template>
    </div>

    <p class="step-message">{{ message }}</p>
  </div>
</template>

<style scoped>
.progress-card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 36px 32px;
  text-align: center;
}

.file-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
  font-size: 0.95rem;
  color: var(--muted);
}

.file-icon { font-size: 1.2rem; }
.file-text {
  font-weight: 500;
  color: var(--text);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  margin-bottom: 24px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 96px;
}

.step-bubble {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  transition: all 0.3s;
}

.step.done .step-bubble {
  background: var(--success);
  color: white;
}

.step.active .step-bubble {
  background: var(--primary);
  color: white;
  box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.2);
  animation: pulse 1.5s ease-in-out infinite;
}

.step.waiting .step-bubble {
  background: var(--border);
  color: var(--muted);
}

.step-label {
  font-size: 0.78rem;
  color: var(--muted);
  white-space: nowrap;
}

.step.active .step-label,
.step.done .step-label {
  color: var(--text);
  font-weight: 500;
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin-top: 22px;
  max-width: 60px;
  transition: background 0.3s;
}

.step-line.done { background: var(--success); }

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: block;
}

.check { font-size: 1.1rem; }
.num  { font-size: 1rem; }

.step-message {
  font-size: 0.9rem;
  color: var(--muted);
  min-height: 1.4em;
}

@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(124,58,237,0.2); } 50% { box-shadow: 0 0 0 10px rgba(124,58,237,0.1); } }
</style>
