<template>
  <div class="totp-view page-container">
    <div class="card-container">
      <h2 class="page-title">TOTP 验证码</h2>
      <p class="page-description">生成和管理基于时间的一次性密码（TOTP）</p>

      <div class="totp-container">
        <!-- 添加新密钥 -->
        <div class="add-section">
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
            <el-button @click="generateAndAdd">
              <el-icon><Refresh /></el-icon>
              随机生成
            </el-button>
          </div>
        </div>

        <!-- 已保存的 TOTP 列表 -->
        <div v-if="savedTotps.length > 0" class="totp-list">
          <h3 class="section-title">已保存的验证码</h3>
          <div
            v-for="totp in savedTotps"
            :key="totp.id"
            class="totp-item"
          >
            <div class="totp-header">
              <div class="totp-info">
                <span class="totp-issuer" v-if="totp.issuer">{{ totp.issuer }}</span>
                <span class="totp-account">{{ totp.account || '未命名' }}</span>
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
            <div class="totp-code-section">
              <div class="totp-code">
                <span class="code-prefix">{{ totp.currentCode.slice(0, 3) }}</span>
                <span class="code-separator"> </span>
                <span class="code-suffix">{{ totp.currentCode.slice(3) }}</span>
              </div>
              <div class="totp-actions">
                <el-button size="small" @click="copyCode(totp.currentCode)">
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
              </div>
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
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <el-empty description="暂无保存的 TOTP，请添加密钥" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  generateTOTP,
  generateRandomSecret,
  parseOtpAuthUrl,
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

const loadTotps = () => {
  const totps = getSavedTotps()
  savedTotps.value = totps.map(t => ({
    ...t,
    currentCode: generateTOTP(t.secret, undefined, { digits: t.digits, period: t.period, algorithm: t.algorithm }),
    remaining: getRemainingSeconds(t.period),
    progress: 0
  }))
  updateCodes()
}

const updateCodes = () => {
  savedTotps.value.forEach(totp => {
    totp.remaining = getRemainingSeconds(totp.period)
    totp.progress = (totp.remaining / totp.period) * 100
    totp.currentCode = generateTOTP(totp.secret, undefined, {
      digits: totp.digits,
      period: totp.period,
      algorithm: totp.algorithm
    })
  })
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

const generateAndAdd = () => {
  const secret = generateRandomSecret()
  manualInput.value.secret = secret
  inputMode.value = 'manual'
  ElMessage.success('已生成随机密钥，请填写账户信息后添加')
}

const removeTotp = (id: string) => {
  deleteTotp(id)
  loadTotps()
  ElMessage.success('已删除')
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const clearInput = () => {
  manualInput.value = { secret: '', account: '', issuer: '' }
  urlInput.value = ''
}

onMounted(() => {
  loadTotps()
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
  max-width: 800px;
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

.totp-list {
  margin-top: 30px;
}

.section-title {
  font-size: 16px;
  color: #303133;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.totp-item {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.totp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.totp-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.totp-issuer {
  font-weight: 600;
  color: #409eff;
}

.totp-account {
  color: #606266;
  font-size: 14px;
}

.totp-code-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.totp-code {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 4px;
  color: #303133;
}

.code-separator {
  margin: 0 4px;
}

.totp-timer {
  display: flex;
  align-items: center;
  gap: 10px;
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

.empty-state {
  margin-top: 30px;
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

  .totp-code {
    font-size: 24px;
  }

  .totp-code-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .totp-actions {
    width: 100%;
  }

  .totp-actions .el-button {
    width: 100%;
  }
}
</style>