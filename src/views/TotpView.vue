<template>
  <div class="totp-view page-container">
    <div class="card-container">
      <h2 class="page-title">TOTP 验证码</h2>
      <p class="page-description">生成和管理基于时间的一次性密码（TOTP）</p>

      <div class="totp-container">
        <div class="main-layout">
          <!-- 左侧：输入区域 -->
          <div class="input-section">
            <el-tabs v-model="inputMode" class="input-tabs">
              <el-tab-pane label="手动输入" name="manual"></el-tab-pane>
              <el-tab-pane label="otpauth URL" name="url"></el-tab-pane>
            </el-tabs>

            <!-- 手动输入 -->
            <div v-if="inputMode === 'manual'" class="input-area">
              <div class="form-row">
                <label class="input-label">密钥 (Base32):</label>
                <el-input
                  v-model="manualInput.secret"
                  placeholder="请输入 Base32 密钥..."
                  clearable
                />
              </div>
              <div class="form-row">
                <label class="input-label">账户名:</label>
                <el-input
                  v-model="manualInput.account"
                  placeholder="例如: user@example.com"
                />
              </div>
              <div class="form-row">
                <label class="input-label">发行者 (可选):</label>
                <el-input
                  v-model="manualInput.issuer"
                  placeholder="例如: Google, GitHub"
                />
              </div>
            </div>

            <!-- URL 输入 -->
            <div v-else class="input-area">
              <div class="form-row">
                <label class="input-label">otpauth URL:</label>
                <el-input
                  v-model="urlInput"
                  type="textarea"
                  :rows="3"
                  placeholder="otpauth://totp/Example:user@example.com?secret=XXXX&issuer=Example"
                />
              </div>
            </div>

            <div class="btn-group">
              <el-button type="primary" @click="addTotp" :disabled="!canAdd">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
              <el-button @click="generateRandom">
                <el-icon><Refresh /></el-icon>
                随机生成
              </el-button>
            </div>
          </div>

          <!-- 右侧：实时预览 -->
          <div class="preview-section">
            <h3 class="section-title">实时预览</h3>
            <div v-if="previewCode" class="code-display">
              <div class="code-info">
                <span class="code-issuer" v-if="previewData.issuer">{{ previewData.issuer }}</span>
                <span class="code-name">{{ previewData.account || maskSecret(previewData.secret) }}</span>
              </div>
              <div class="totp-code">
                <span class="code-prefix">{{ previewCode.slice(0, 3) }}</span>
                <span class="code-separator"> </span>
                <span class="code-suffix">{{ previewCode.slice(3) }}</span>
              </div>
              <div class="totp-timer">
                <el-progress
                  :percentage="previewProgress"
                  :show-text="false"
                  :stroke-width="6"
                  :color="progressColor"
                />
                <span class="remaining-time">{{ previewRemaining }}秒</span>
              </div>
              <div class="code-actions">
                <el-button size="small" @click="copyCode(previewCode)">
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
                <el-button size="small" @click="copyOtpAuthUrl(previewData)">
                  <el-icon><Link /></el-icon>
                  URL
                </el-button>
              </div>
            </div>
            <div v-else class="empty-preview">
              <el-empty description="输入密钥查看验证码" :image-size="60" />
            </div>
          </div>
        </div>

        <!-- 已保存的 TOTP 列表 -->
        <div v-if="savedTotps.length > 0" class="totp-list">
          <h3 class="section-title">已保存的密钥</h3>
          <div class="totp-grid">
            <div
              v-for="totp in savedTotps"
              :key="totp.id"
              class="totp-item"
            >
              <div class="totp-header">
                <div class="totp-info">
                  <span class="totp-issuer" v-if="totp.issuer">{{ totp.issuer }}</span>
                  <span class="totp-name">{{ totp.account || maskSecret(totp.secret) }}</span>
                </div>
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="removeTotp(totp.id)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <div class="totp-secret-masked">{{ maskSecret(totp.secret) }}</div>
              <div class="totp-code">
                <span class="code-prefix">{{ totp.currentCode.slice(0, 3) }}</span>
                <span class="code-separator"> </span>
                <span class="code-suffix">{{ totp.currentCode.slice(3) }}</span>
              </div>
              <div class="totp-timer">
                <el-progress
                  :percentage="totp.progress"
                  :show-text="false"
                  :stroke-width="4"
                  :color="progressColor"
                />
                <span class="remaining-time">{{ totp.remaining }}秒</span>
              </div>
              <div class="totp-actions">
                <el-button size="small" @click="copyCode(totp.currentCode)">
                  <el-icon><DocumentCopy /></el-icon>
                  复制验证码
                </el-button>
                <el-button size="small" @click="copyOtpAuthUrl(totp)">
                  <el-icon><Link /></el-icon>
                  复制 URL
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  generateTOTP,
  generateRandomSecret,
  parseOtpAuthUrl,
  generateOtpAuthUrl,
  getSavedTotps,
  saveTotp,
  deleteTotp,
  getRemainingSeconds,
  type SavedTotp
} from '../utils/totp'

const inputMode = ref('manual')
const urlInput = ref('')
const manualInput = ref({
  secret: '',
  account: '',
  issuer: ''
})

interface TotpDisplay extends SavedTotp {
  currentCode: string
  remaining: number
  progress: number
}

const savedTotps = ref<TotpDisplay[]>([])
const previewCode = ref('')
const previewRemaining = ref(30)
const previewProgress = ref(100)
const previewData = ref<any>({})

let updateInterval: ReturnType<typeof setInterval> | null = null

const canAdd = computed(() => {
  if (inputMode.value === 'manual') {
    return manualInput.value.secret.trim().length > 0
  }
  return urlInput.value.trim().length > 0
})

const progressColor = computed(() => {
  return (percentage: number) => {
    if (percentage > 50) return '#67c23a'
    if (percentage > 20) return '#e6a23c'
    return '#f56c6c'
  }
})

const maskSecret = (secret: string) => {
  if (!secret || secret.length <= 8) return secret
  return secret.slice(0, 4) + '****' + secret.slice(-4)
}

const loadTotps = () => {
  const totps = getSavedTotps()
  savedTotps.value = totps.map(t => ({
    ...t,
    currentCode: generateTOTP(t.secret, undefined, { digits: t.digits, period: t.period, algorithm: t.algorithm }),
    remaining: getRemainingSeconds(t.period),
    progress: 100
  }))
}

const updateCodes = () => {
  // 更新已保存的验证码
  savedTotps.value.forEach(totp => {
    totp.remaining = getRemainingSeconds(totp.period)
    totp.progress = (totp.remaining / totp.period) * 100
    totp.currentCode = generateTOTP(totp.secret, undefined, {
      digits: totp.digits,
      period: totp.period,
      algorithm: totp.algorithm
    })
  })

  // 更新预览
  updatePreview()
}

const updatePreview = () => {
  let secret = ''
  let account = ''
  let issuer = ''
  let digits = 6
  let period = 30
  let algorithm: 'SHA1' | 'SHA256' | 'SHA512' = 'SHA1'

  if (inputMode.value === 'manual') {
    secret = manualInput.value.secret.trim()
    account = manualInput.value.account.trim()
    issuer = manualInput.value.issuer.trim()
  } else if (urlInput.value.trim()) {
    try {
      const config = parseOtpAuthUrl(urlInput.value.trim())
      secret = config.secret
      account = config.account
      issuer = config.issuer
      digits = config.digits
      period = config.period
      algorithm = config.algorithm
    } catch {
      // 解析失败时不显示
    }
  }

  if (secret) {
    try {
      previewCode.value = generateTOTP(secret, undefined, { digits, period, algorithm })
      previewRemaining.value = getRemainingSeconds(period)
      previewProgress.value = (previewRemaining.value / period) * 100
      previewData.value = { secret, account, issuer, digits, period, algorithm }
    } catch {
      previewCode.value = ''
    }
  } else {
    previewCode.value = ''
  }
}

const addTotp = () => {
  try {
    if (inputMode.value === 'manual') {
      const secret = manualInput.value.secret.trim()
      if (!secret) {
        ElMessage.error('请输入密钥')
        return
      }
      saveTotp({
        secret,
        account: manualInput.value.account.trim(),
        issuer: manualInput.value.issuer.trim(),
        digits: 6,
        period: 30,
        algorithm: 'SHA1'
      })
    } else {
      const config = parseOtpAuthUrl(urlInput.value.trim())
      saveTotp({
        secret: config.secret,
        account: config.account,
        issuer: config.issuer,
        digits: config.digits,
        period: config.period,
        algorithm: config.algorithm
      })
    }
    loadTotps()
    clearInput()
    ElMessage.success('添加成功')
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  }
}

const generateRandom = () => {
  const secret = generateRandomSecret()
  manualInput.value.secret = secret
  inputMode.value = 'manual'
  updatePreview()
  ElMessage.success('已生成随机密钥')
}

const removeTotp = (id: string) => {
  deleteTotp(id)
  loadTotps()
  ElMessage.success('已删除')
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('验证码已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

const copyOtpAuthUrl = (data: any) => {
  try {
    const url = generateOtpAuthUrl(data.secret, data.account, data.issuer, {
      digits: data.digits,
      period: data.period,
      algorithm: data.algorithm
    })
    navigator.clipboard.writeText(url)
    ElMessage.success('otpauth URL 已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

const clearInput = () => {
  manualInput.value = { secret: '', account: '', issuer: '' }
  urlInput.value = ''
}

// 监听输入变化
watch([manualInput, urlInput, inputMode], () => {
  updatePreview()
}, { deep: true })

onMounted(() => {
  loadTotps()
  updatePreview()
  updateInterval = setInterval(updateCodes, 1000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.totp-view {
  height: 100%;
  overflow-y: auto;
}

.page-description {
  color: #909399;
  margin-bottom: 25px;
}

.totp-container {
  max-width: 1000px;
}

.main-layout {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
}

.input-section {
  flex: 1;
  min-width: 0;
}

.preview-section {
  width: 280px;
  flex-shrink: 0;
}

.input-tabs {
  margin-bottom: 20px;
}

.input-area {
  margin-bottom: 20px;
}

.form-row {
  margin-bottom: 15px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.btn-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  color: #303133;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.code-display {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.code-info {
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.code-issuer {
  font-weight: 600;
  color: #409eff;
}

.code-name {
  color: #606266;
  font-size: 14px;
}

.totp-code {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 4px;
  color: #303133;
  margin-bottom: 12px;
}

.code-separator {
  margin: 0 4px;
}

.totp-timer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.totp-timer .el-progress {
  flex: 1;
}

.remaining-time {
  font-size: 14px;
  color: #909399;
  min-width: 40px;
  text-align: right;
}

.code-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.empty-preview {
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  padding: 30px 20px;
}

/* 已保存列表 */
.totp-list {
  margin-top: 20px;
}

.totp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.totp-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
}

.totp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.totp-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.totp-issuer {
  font-weight: 600;
  color: #409eff;
  white-space: nowrap;
}

.totp-name {
  color: #606266;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.totp-secret-masked {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
}

.totp-item .totp-code {
  font-size: 32px;
  text-align: center;
  margin-bottom: 12px;
}

.totp-item .totp-timer {
  margin-bottom: 12px;
}

.totp-actions {
  display: flex;
  gap: 8px;
}

.totp-actions .el-button {
  flex: 1;
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

  .totp-container {
    max-width: 100%;
  }

  .main-layout {
    flex-direction: column;
  }

  .preview-section {
    width: 100%;
    order: -1;
    margin-bottom: 20px;
  }

  .input-tabs {
    --el-font-size-base: 13px;
  }

  .input-label {
    font-size: 13px;
  }

  .btn-group {
    width: 100%;
    justify-content: stretch;
  }

  .btn-group .el-button {
    flex: 1;
    padding: 10px 12px;
    font-size: 13px;
  }

  .totp-grid {
    grid-template-columns: 1fr;
  }

  .totp-item .totp-code {
    font-size: 28px;
  }

  .totp-actions {
    flex-direction: column;
  }
}
</style>