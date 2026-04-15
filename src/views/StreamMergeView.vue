<template>
  <div class="stream-merge-view page-container">
    <div class="card-container">
      <h2 class="page-title">LLM 流式输出整理</h2>
      <p class="page-description">将 LLM API 的流式响应数据合并为单个完整 JSON 对象</p>

      <div class="toolbar">
        <el-button type="primary" @click="handleMerge" :disabled="!inputData" size="default">
          <el-icon><Operation /></el-icon>
          合并对象
        </el-button>
        <el-button @click="copyResult" :disabled="!outputData" size="default">
          <el-icon><DocumentCopy /></el-icon>
          复制结果
        </el-button>
        <el-button @click="clearAll" size="default">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="errorMsg"
        title="处理失败"
        type="error"
        :closable="false"
        show-icon
        class="error-alert"
      >
        {{ errorMsg }}
      </el-alert>

      <!-- 统计信息 -->
      <div v-if="stats.chunks > 0" class="stats-panel">
        <span class="stat-item">已处理: {{ stats.chunks }} 个数据块</span>
        <span class="stat-item">有效: {{ stats.valid }} 个</span>
        <span class="stat-item" v-if="stats.invalid > 0">无效: {{ stats.invalid }} 个</span>
      </div>

      <!-- 输入面板 - 可折叠 -->
      <div class="input-section" :class="{ collapsed: inputCollapsed }">
        <div class="panel-header" @click="inputCollapsed = !inputCollapsed">
          <el-icon><Edit /></el-icon>
          <span>流式数据输入</span>
          <el-icon class="collapse-icon" :class="{ rotated: inputCollapsed }">
            <ArrowDown />
          </el-icon>
        </div>
        <div class="input-content" v-show="!inputCollapsed">
          <textarea
            v-model="inputData"
            class="code-editor"
            placeholder="粘贴 SSE 流式数据，例如：
data: {&quot;id&quot;:&quot;chatcmpl-123&quot;,...&quot;choices&quot;:[{&quot;delta&quot;:{&quot;content&quot;:&quot;Hello&quot;}}]}
data: {&quot;id&quot;:&quot;chatcmpl-123&quot;,...&quot;choices&quot;:[{&quot;delta&quot;:{&quot;content&quot;:&quot; world&quot;}}]}
data: [DONE]"
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <!-- 输出面板 - 语法高亮 -->
      <div class="output-section" v-if="outputData">
        <div class="panel-header">
          <el-icon><View /></el-icon>
          <span>合并后的对象</span>
          <el-button size="small" @click="copyResult">
            <el-icon><DocumentCopy /></el-icon>
            复制
          </el-button>
        </div>
        <div class="output-content">
          <pre class="code-highlight"><code v-html="highlightedOutput"></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import 'highlight.js/styles/atom-one-light.css'
import { parseSSEData, mergeStreamObjects } from '../utils/stream-merge'

hljs.registerLanguage('json', json)

const inputData = ref('')
const outputData = ref('')
const errorMsg = ref('')
const inputCollapsed = ref(false)

const stats = ref({
  chunks: 0,
  valid: 0,
  invalid: 0
})

const highlightedOutput = computed(() => {
  if (!outputData.value) return ''
  try {
    const parsed = JSON.parse(outputData.value)
    const formatted = JSON.stringify(parsed, null, 2)
    return hljs.highlight(formatted, { language: 'json' }).value
  } catch {
    const div = document.createElement('div')
    div.textContent = outputData.value
    return div.innerHTML
  }
})

/**
 * 处理合并
 */
const handleMerge = () => {
  if (!inputData.value) return

  errorMsg.value = ''
  outputData.value = ''

  try {
    const objects = parseSSEData(inputData.value)

    stats.value = {
      chunks: inputData.value.split('\n').filter(l => l.trim() && l.trim().startsWith('data:')).length,
      valid: objects.length,
      invalid: inputData.value.split('\n').filter(l => {
        const t = l.trim()
        if (!t || !t.startsWith('data:')) return false
        const j = t.slice(5).trim()
        if (j === '[DONE]') return false
        try { JSON.parse(j); return false } catch { return true }
      }).length
    }

    if (objects.length === 0) {
      errorMsg.value = '未找到有效的 JSON 数据'
      return
    }

    const merged = mergeStreamObjects(objects)

    if (merged) {
      outputData.value = JSON.stringify(merged)
      ElMessage.success(`成功合并 ${objects.length} 个数据块`)
    } else {
      errorMsg.value = '合并结果为空'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '处理失败'
  }
}

const copyResult = async () => {
  if (outputData.value) {
    try {
      await navigator.clipboard.writeText(outputData.value)
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

const clearAll = () => {
  inputData.value = ''
  outputData.value = ''
  errorMsg.value = ''
  stats.value = { chunks: 0, valid: 0, invalid: 0 }
}
</script>

<style scoped>
.stream-merge-view {
  height: 100%;
  overflow-y: auto;
}

.page-description {
  color: var(--text-secondary);
  margin-bottom: 25px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.stats-panel {
  display: flex;
  gap: 20px;
  padding: 12px 16px;
  background: #e8f4e8;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #c8e6c8;
}

.stat-item {
  font-size: 13px;
  color: #2e7d32;
}

/* 输入区域 */
.input-section {
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.input-section.collapsed {
  margin-bottom: 10px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}

.input-section .panel-header:hover {
  background: linear-gradient(180deg, #f5f5f5 0%, #f0f0f0 100%);
}

.panel-header .el-icon {
  color: var(--primary-color);
}

.panel-header .collapse-icon {
  margin-left: auto;
  transition: transform 0.3s;
}

.panel-header .collapse-icon.rotated {
  transform: rotate(-90deg);
}

.panel-header .el-button {
  margin-left: auto;
}

.input-content {
  padding: 0;
}

.code-editor {
  width: 100%;
  height: 200px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  padding: 16px;
  resize: vertical;
  transition: all 0.3s;
  background: #fafafa;
  color: var(--text-primary);
  box-sizing: border-box;
}

.code-editor:focus {
  outline: none;
  background: #fff;
}

/* 输出区域 */
.output-section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.output-section .panel-header {
  cursor: default;
}

.output-content {
  max-height: 500px;
  overflow: auto;
}

.code-highlight {
  background: #fafafa;
  padding: 16px;
  margin: 0;
}

.code-highlight code {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre;
}

.error-alert {
  margin-bottom: 20px;
  border: 1px solid #f56c6c;
  border-radius: 8px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .toolbar {
    padding: 12px;
    margin-bottom: 15px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .code-editor {
    height: 150px;
    font-size: 13px;
    padding: 12px;
  }

  .output-content {
    max-height: 400px;
  }

  .code-highlight {
    padding: 12px;
  }

  .code-highlight code {
    font-size: 12px;
  }

  .stats-panel {
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>