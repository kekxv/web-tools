<template>
  <el-button
    :size="size"
    :type="buttonType"
    :link="link"
    @click="handleCopy"
    class="copy-button"
    v-bind="$attrs"
  >
    <el-icon><DocumentCopy /></el-icon>
    <span v-if="showLabel">{{ label }}</span>
  </el-button>
</template>

<script setup lang="ts">
import { DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

interface Props {
  /** 要复制的文本内容 */
  text: string
  /** 按钮大小 */
  size?: 'small' | 'default' | 'large'
  /** 按钮类型 */
  buttonType?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | ''
  /** 是否为 link 按钮 */
  link?: boolean
  /** 是否显示标签文字 */
  showLabel?: boolean
  /** 标签文字 */
  label?: string
  /** 成功提示消息 */
  successMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  buttonType: '',
  link: false,
  showLabel: false,
  label: '复制',
  successMessage: '已复制到剪贴板'
})

const handleCopy = async () => {
  if (!props.text) {
    ElMessage.warning('没有可复制的内容')
    return
  }

  try {
    await navigator.clipboard.writeText(props.text)
    ElMessage.success(props.successMessage)
  } catch (error) {
    // 降级方案：使用 document.execCommand（旧版浏览器）
    try {
      const textArea = document.createElement('textarea')
      textArea.value = props.text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success(props.successMessage)
    } catch (fallbackError) {
      ElMessage.error('复制失败，请手动复制')
    }
  }
}
</script>

<style scoped>
.copy-button {
  transition: all 0.2s ease;
}

.copy-button:hover {
  transform: translateY(-1px);
}

.copy-button:active {
  transform: translateY(0);
}
</style>
