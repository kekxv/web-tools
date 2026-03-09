<template>
  <div class="diff-view page-container">
    <div class="card-container">
      <h2 class="page-title">Diff 工具</h2>
      <p class="page-description">对比两段文本的差异，并生成 patch 文件下载</p>

      <!-- 工具栏：文件名设置和操作按钮 -->
      <div class="toolbar">
        <div class="options-row">
          <div class="input-group">
            <label>原始文件名:</label>
            <el-input v-model="oldFileName" placeholder="old" size="default" style="width: 150px;" />
          </div>
          <div class="input-group">
            <label>新文件名:</label>
            <el-input v-model="newFileName" placeholder="new" size="default" style="width: 150px;" />
          </div>
        </div>

        <div class="btn-group">
          <el-button type="primary" @click="generateDiff" :disabled="!originalText || !newText">
            <el-icon><Files /></el-icon>
            生成 Diff
          </el-button>
          <el-button type="success" @click="handleDownload" :disabled="!patchResult">
            <el-icon><Download /></el-icon>
            下载 Patch
          </el-button>
          <el-button @click="clearAll">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>
      </div>

      <!-- 左右并排编辑器 -->
      <div class="editor-container">
        <div class="editor-box">
          <label class="editor-label">原始文本</label>
          <textarea
            v-model="originalText"
            class="code-editor"
            placeholder="请输入原始文本..."
            spellcheck="false"
          ></textarea>
        </div>

        <div class="editor-box">
          <label class="editor-label">新文本</label>
          <textarea
            v-model="newText"
            class="code-editor"
            placeholder="请输入新文本..."
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <!-- Patch 结果 -->
      <div v-if="patchResult" class="result-area">
        <div class="result-header">
          <span class="result-label">Patch 结果（语法高亮）</span>
          <el-button size="small" @click="copyPatch">
            <el-icon><DocumentCopy /></el-icon>
            复制
          </el-button>
        </div>
        <div class="patch-output" ref="patchContainer">
          <pre><code v-html="highlightedPatch"></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { generatePatch, parsePatch, downloadPatch as downloadPatchFile } from '../utils/diff'

const originalText = ref('')
const newText = ref('')
const oldFileName = ref('old')
const newFileName = ref('new')
const patchResult = ref('')
const patchContainer = ref(null)

const highlightedPatch = computed(() => {
  if (!patchResult.value) return ''
  return highlightPatch(patchResult.value)
})

// 为 patch 内容添加语法高亮（亮色主题）
function highlightPatch(patch) {
  const lines = patch.split('\n')
  return lines.map(line => {
    // 转义 HTML
    const escaped = escapeHtml(line)

    if (line.startsWith('diff --git')) {
      return `<span class="diff-git">${escaped}</span>`
    } else if (line.startsWith('---')) {
      return `<span class="diff-old-file">${escaped}</span>`
    } else if (line.startsWith('+++')) {
      return `<span class="diff-new-file">${escaped}</span>`
    } else if (line.startsWith('@@')) {
      return `<span class="diff-hunk">${escaped}</span>`
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      return `<span class="diff-add">${escaped}</span>`
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      return `<span class="diff-remove">${escaped}</span>`
    } else if (line.startsWith(' ')) {
      return `<span class="diff-context">${escaped}</span>`
    } else if (line.startsWith('\\')) {
      return `<span class="diff-meta">${escaped}</span>`
    } else {
      return `<span class="diff-context">${escaped}</span>`
    }
  }).join('\n')
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const generateDiff = () => {
  if (!originalText.value || !newText.value) {
    return
  }
  patchResult.value = generatePatch(
    originalText.value,
    newText.value,
    oldFileName.value,
    newFileName.value
  )
}

const handleDownload = () => {
  if (patchResult.value) {
    downloadPatchFile(patchResult.value, 'changes.patch')
  }
}

const copyPatch = async () => {
  if (patchResult.value) {
    try {
      await navigator.clipboard.writeText(patchResult.value)
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

const clearAll = () => {
  originalText.value = ''
  newText.value = ''
  patchResult.value = ''
}
</script>

<style scoped>
.diff-view {
  height: 100%;
  overflow-y: auto;
}

.page-description {
  color: var(--text-secondary);
  margin-bottom: 25px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 16px;
}

.options-row {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-group label {
  font-size: 14px;
  color: var(--text-regular);
  white-space: nowrap;
}

.btn-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.editor-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.code-editor {
  width: 100%;
  height: 300px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 12px;
  resize: vertical;
  transition: border-color 0.3s;
  background: #fafafa;
}

.code-editor:focus {
  outline: none;
  border-color: var(--primary-color);
  background: #fff;
}

.options-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-group label {
  font-size: 14px;
  color: var(--text-regular);
  white-space: nowrap;
}

.result-area {
  margin-top: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
}

.result-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-regular);
}

.patch-output {
  background: #f8f9fa;
  padding: 16px;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
}

.patch-output pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
}

/* Patch 语法高亮 - 亮色主题 */
:deep(.diff-git) {
  color: #0066cc;
  font-weight: bold;
}

:deep(.diff-old-file) {
  color: #cc0000;
}

:deep(.diff-new-file) {
  color: #00aa00;
}

:deep(.diff-hunk) {
  color: #9933cc;
  font-weight: bold;
}

:deep(.diff-add) {
  color: #006600;
  background-color: #e8f5e9;
}

:deep(.diff-remove) {
  color: #cc0000;
  background-color: #ffebee;
}

:deep(.diff-context) {
  color: #666666;
}

:deep(.diff-meta) {
  color: #999999;
  font-style: italic;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .page-container {
    padding: 10px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-description {
    font-size: 13px;
    margin-bottom: 15px;
  }

  .toolbar {
    padding: 12px;
    margin-bottom: 15px;
  }

  .options-row {
    width: 100%;
    gap: 10px;
  }

  .input-group {
    width: 100%;
  }

  .input-group label {
    font-size: 13px;
  }

  .btn-group {
    width: 100%;
    justify-content: stretch;
  }

  .btn-group .el-button {
    flex: 1;
    min-width: 80px;
    padding: 10px 8px;
    font-size: 13px;
  }

  .editor-container {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .code-editor {
    height: 200px;
    font-size: 13px;
  }

  .editor-label {
    font-size: 13px;
  }

  .result-header {
    padding: 10px 12px;
  }

  .result-label {
    font-size: 13px;
  }

  .patch-output {
    padding: 12px;
    font-size: 12px;
  }
}
</style>
