<template>
  <div class="code-display">
    <!-- 头部 -->
    <div class="code-header">
      <div class="header-left">
        <el-icon v-if="icon"><component :is="icon" /></el-icon>
        <span class="title">{{ title }}</span>
        <el-tag v-if="language" size="small" type="info">{{ language }}</el-tag>
      </div>
      <div class="header-right">
        <el-button
          v-if="hasLongLines && showToggle"
          size="small"
          @click="toggleExpand"
          :type="allExpanded ? 'info' : 'primary'"
          link
        >
          <el-icon><ArrowDown v-if="!allExpanded" /><ArrowUp v-else /></el-icon>
          {{ allExpanded ? '折叠' : '展开' }}长行
        </el-button>
        <CopyButton
          v-if="showCopy && code"
          :text="code"
          size="small"
          button-type="primary"
          link
          show-label
          label="复制"
        />
      </div>
    </div>

    <!-- 代码区 -->
    <div class="code-content" :class="{ 'with-line-numbers': showLineNumbers }">
      <div v-if="showLineNumbers" class="line-numbers">
        <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
      </div>
      <pre class="code-pre"><code
        ref="codeRef"
        class="code-block"
        v-html="displayedCode"
      ></code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import hljs from 'highlight.js/lib/core'
import CopyButton from './CopyButton.vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'

interface Props {
  /** 要显示的代码 */
  code: string
  /** 语言类型（用于语法高亮） */
  language?: string
  /** 每行最大字符数，超过则省略 */
  maxLineLength?: number
  /** 是否显示复制按钮 */
  showCopy?: boolean
  /** 是否显示行号 */
  showLineNumbers?: boolean
  /** 标题 */
  title?: string
  /** 图标组件 */
  icon?: any
  /** 是否显示展开/折叠按钮 */
  showToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  language: '',
  maxLineLength: 100,
  showCopy: true,
  showLineNumbers: false,
  title: '',
  icon: null,
  showToggle: true
})

const codeRef = ref<HTMLElement | null>(null)
const allExpanded = ref(false)

// 计算行数
const lineCount = computed(() => {
  return props.code ? props.code.split('\n').length : 0
})

// 检查是否有超长行
const hasLongLines = computed(() => {
  if (!props.code) return false
  const lines = props.code.split('\n')
  return lines.some(line => line.length > props.maxLineLength)
})

// 处理后的代码（带省略）
const processedCode = computed(() => {
  if (!props.code) return ''

  const lines = props.code.split('\n')

  if (allExpanded.value || !hasLongLines.value) {
    return props.code
  }

  // 省略长行
  return lines.map(line => {
    if (line.length > props.maxLineLength) {
      return line.substring(0, props.maxLineLength) + '...'
    }
    return line
  }).join('\n')
})

// 语法高亮后的代码
const displayedCode = computed(() => {
  if (!processedCode.value) return ''

  try {
    if (props.language && hljs.getLanguage(props.language)) {
      return hljs.highlight(processedCode.value, { language: props.language }).value
    } else {
      return hljs.highlightAuto(processedCode.value).value
    }
  } catch {
    // 如果高亮失败，返回原始文本（转义HTML）
    return processedCode.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
})

// 切换展开/折叠
const toggleExpand = () => {
  allExpanded.value = !allExpanded.value
}

// 监听代码变化，重置展开状态
watch(() => props.code, () => {
  allExpanded.value = false
})
</script>

<style scoped>
.code-display {
  border: 1px solid var(--border-color, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  border-bottom: 1px solid var(--border-color, #e4e7ed);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #303133);
}

.header-left .el-icon {
  color: #1976d2;
  font-size: 18px;
}

.title {
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-content {
  display: flex;
  background: #fafafa;
  max-height: 600px;
  overflow: auto;
}

.code-content.with-line-numbers {
  display: flex;
}

.line-numbers {
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  background: #f5f5f5;
  border-right: 1px solid var(--border-color, #e4e7ed);
  user-select: none;
  min-width: 50px;
}

.line-number {
  padding: 0 12px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #999;
  text-align: right;
}

.code-pre {
  margin: 0;
  padding: 16px;
  flex: 1;
  overflow-x: auto;
}

.code-block {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #303133);
  white-space: pre;
  tab-size: 2;
}

/* 滚动条美化 */
.code-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.code-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.code-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式 */
@media (max-width: 768px) {
  .code-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .code-pre {
    padding: 12px;
  }

  .code-block {
    font-size: 12px;
  }
}
</style>
