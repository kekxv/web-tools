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
              @click="selectedAlgorithm = key"
              size="default"
            >
              {{ config.name }}
            </el-button>
          </div>
        </div>

        <!-- 输出格式 -->
        <div class="output-section">
          <label class="section-label">输出格式:</label>
          <el-radio-group v-model="outputAsHex">
            <el-radio :value="true">Hex (十六进制)</el-radio>
            <el-radio :value="false">Base64</el-radio>
          </el-radio-group>
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
          <el-button @click="copyResult" :disabled="!hashResult">
            <el-icon><DocumentCopy /></el-icon>
            复制结果
          </el-button>
          <el-button @click="clearAll">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>

        <!-- 结果显示 -->
        <div v-if="hashResult" class="result-area">
          <div class="result-label">
            {{ algorithms[selectedAlgorithm].name }} ({{ outputAsHex ? 'Hex' : 'Base64' }}):
          </div>
          <div class="hash-result">
            <code>{{ hashResult }}</code>
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
const outputAsHex = ref(true)
const hashResult = ref('')
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
  hashResult.value = ''

  try {
    if (inputMode.value === 'text') {
      hashResult.value = hashString(
        textInput.value,
        selectedAlgorithm.value,
        !outputAsHex.value
      )
    } else if (selectedFile.value) {
      hashResult.value = await hashFile(
        selectedFile.value,
        selectedAlgorithm.value,
        !outputAsHex.value
      )
    }
  } catch (error) {
    ElMessage.error(`计算失败：${error.message}`)
  }
}

const copyResult = async () => {
  if (hashResult.value) {
    try {
      await navigator.clipboard.writeText(hashResult.value)
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

const clearAll = () => {
  textInput.value = ''
  selectedFile.value = null
  hashResult.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
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

.algorithm-section,
.output-section {
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

.hash-result {
  background: #f5f7fa;
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
</style>
