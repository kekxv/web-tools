<template>
  <div class="hash-view page-container">
    <div class="card-container">
      <h2 class="page-title">Hash 计算</h2>
      <p class="page-description">计算文件或文本的哈希值，支持多种算法</p>

      <div class="hash-container">
        <!-- 输入方式选择 -->
        <el-tabs v-model="inputMode" class="input-tabs">
          <el-tab-pane label="文本输入" name="text"></el-tab-pane>
          <el-tab-pane label="文件上传" name="file"></el-tab-pane>
        </el-tabs>

        <!-- 文本输入 -->
        <div v-if="inputMode === 'text'" class="input-area">
          <label class="input-label">输入文本:</label>
          <el-input
            v-model="textInput"
            type="textarea"
            :rows="6"
            placeholder="请输入要计算哈希的文本内容..."
          />
        </div>

        <!-- 文件上传 -->
        <div v-else class="input-area">
          <label class="input-label">选择文件:</label>
          <div
            class="upload-area"
            @click="triggerFileInput"
            @dragover.prevent="dragover = true"
            @dragleave.prevent="dragover = false"
            @drop.prevent="handleDrop"
            :class="{ dragover: dragover }"
          >
            <el-icon :size="48" color="#409eff">
              <UploadFilled />
            </el-icon>
            <p>点击或拖拽文件到此处</p>
            <p class="hint">支持任意类型文件</p>
          </div>
          <input
            ref="fileInput"
            type="file"
            @change="handleFileSelect"
            style="display: none"
          />
          <div v-if="selectedFile" class="file-info">
            <el-icon><Document /></el-icon>
            <span>{{ selectedFile.name }}</span>
            <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
          </div>
        </div>

        <!-- 算法选择 -->
        <div class="algorithm-section">
          <label class="section-label">选择算法:</label>
          <div class="algorithm-buttons">
            <el-button
              v-for="(config, key) in algorithms"
              :key="key"
              :type="selectedAlgorithm === key ? 'primary' : ''"
              @click="selectedAlgorithm = key; clearResults()"
              size="default"
            >
              {{ config.name }}
            </el-button>
          </div>
        </div>

        <!-- 计算按钮 -->
        <div class="btn-group">
          <el-button
            type="primary"
            @click="calculateHash"
            :disabled="!canCalculate"
            size="large"
          >
            <el-icon><Operation /></el-icon>
            计算哈希
          </el-button>
          <el-button @click="copyHexResult" :disabled="!hashResultHex">
            <el-icon><DocumentCopy /></el-icon>
            复制 Hex
          </el-button>
          <el-button @click="copyBase64Result" :disabled="!hashResultBase64">
            <el-icon><DocumentCopy /></el-icon>
            复制 Base64
          </el-button>
          <el-button @click="clearAll">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>

        <!-- 结果显示 -->
        <div v-if="hashResultHex" class="result-area">
          <div class="result-label">
            {{ algorithms[selectedAlgorithm].name }} - Hex:
          </div>
          <div class="hash-result">
            <code>{{ hashResultHex }}</code>
          </div>
        </div>

        <div v-if="hashResultBase64" class="result-area">
          <div class="result-label">
            {{ algorithms[selectedAlgorithm].name }} - Base64:
          </div>
          <div class="hash-result">
            <code>{{ hashResultBase64 }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { hashString, hashFile, HASH_ALGORITHMS } from '../utils/hash'

const inputMode = ref('text')
const textInput = ref('')
const selectedFile = ref(null)
const selectedAlgorithm = ref('SHA256')
const hashResultHex = ref('')
const hashResultBase64 = ref('')
const dragover = ref(false)
const fileInput = ref(null)

const algorithms = HASH_ALGORITHMS

const canCalculate = computed(() => {
  if (inputMode.value === 'text') {
    return textInput.value.length > 0
  }
  return selectedFile.value !== null
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    selectedFile.value = file
    hashResult.value = ''
  }
}

const handleDrop = (event) => {
  dragover.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    selectedFile.value = file
    hashResult.value = ''
  }
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const calculateHash = async () => {
  hashResultHex.value = ''
  hashResultBase64.value = ''

  try {
    if (inputMode.value === 'text') {
      hashResultHex.value = hashString(textInput.value, selectedAlgorithm.value, false)
      hashResultBase64.value = hashString(textInput.value, selectedAlgorithm.value, true)
    } else if (selectedFile.value) {
      hashResultHex.value = await hashFile(selectedFile.value, selectedAlgorithm.value, false)
      hashResultBase64.value = await hashFile(selectedFile.value, selectedAlgorithm.value, true)
    }
  } catch (error) {
    ElMessage.error(`计算失败：${error.message}`)
  }
}

const copyHexResult = async () => {
  if (hashResultHex.value) {
    try {
      await navigator.clipboard.writeText(hashResultHex.value)
      ElMessage.success('Hex 已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

const copyBase64Result = async () => {
  if (hashResultBase64.value) {
    try {
      await navigator.clipboard.writeText(hashResultBase64.value)
      ElMessage.success('Base64 已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

const clearAll = () => {
  textInput.value = ''
  selectedFile.value = null
  hashResultHex.value = ''
  hashResultBase64.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const clearResults = () => {
  hashResultHex.value = ''
  hashResultBase64.value = ''
}
</script>

<style scoped>
.hash-view {
  height: 100%;
  overflow-y: auto;
}

.page-description {
  color: #909399;
  margin-bottom: 25px;
}

.hash-container {
  max-width: 800px;
}

.input-tabs {
  margin-bottom: 20px;
}

.input-area {
  margin-bottom: 20px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #409eff;
}

.upload-area.dragover {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.05);
}

.upload-area p {
  margin-top: 15px;
  color: #606266;
}

.upload-area .hint {
  font-size: 12px;
  color: #909399;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-top: 15px;
  color: #606266;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.algorithm-section {
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 10px;
}

.algorithm-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.result-area {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
  margin-top: 15px;
  border: 1px solid #e4e7ed;
}

.result-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 10px;
}

.hash-result {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  word-break: break-all;
}

.hash-result code {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  color: #303133;
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

  .hash-container {
    max-width: 100%;
  }

  .input-tabs {
    --el-font-size-base: 13px;
  }

  .input-label {
    font-size: 13px;
  }

  .upload-area {
    padding: 30px 15px;
  }

  .upload-area p {
    font-size: 14px;
  }

  .algorithm-buttons {
    gap: 8px;
  }

  .algorithm-buttons .el-button {
    flex: 1;
    min-width: calc(50% - 4px);
    padding: 10px 12px;
    font-size: 13px;
  }

  .btn-group {
    width: 100%;
    justify-content: stretch;
  }

  .btn-group .el-button {
    flex: 1;
    min-width: 70px;
    padding: 10px 8px;
    font-size: 13px;
  }

  .result-label {
    font-size: 13px;
  }

  .hash-result code {
    font-size: 12px;
  }

  .file-info {
    flex-wrap: wrap;
    font-size: 13px;
  }

  .file-size {
    font-size: 12px;
    width: 100%;
  }
}
</style>
