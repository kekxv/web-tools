<template>
  <div class="tree-node" :class="{ 'hide-same': showDiffOnly }">
    <div
      class="node-row"
      :class="{ 'is-same': node.status === 'same', 'is-diff': node.status !== 'same' }"
    >
      <!-- 展开/折叠图标 -->
      <span
        class="expand-icon"
        v-if="hasChildren"
        @click.stop="toggleExpand"
      >
        <el-icon><ArrowDown v-if="expanded" /><CaretRight v-else /></el-icon>
      </span>
      <span v-else class="placeholder"></span>

      <!-- 节点内容 -->
      <div class="node-content">
        <!-- 根节点 -->
        <template v-if="node.label === 'root'">
          <span class="bracket">{{ node.type === 'array' ? '[' : '{' }}</span>
        </template>

        <!-- 非根节点 -->
        <template v-else>
          <span class="node-key">{{ node.label }}</span>
          <span class="colon">: </span>

          <!-- Base64 (优先判断) -->
          <template v-if="node.diff?.isBase64 && node.diff.type === 'diff'">
            <span class="value-base64">{{ formatBase64Short(node.diff.left) }}</span>
            <span class="diff-arrow"> ↔ </span>
            <span class="value-base64">{{ formatBase64Short(node.diff.right) }}</span>
            <el-button link type="primary" size="small" class="view-btn" @click.stop="handleViewBase64">
              查看
            </el-button>
          </template>

          <!-- 差异值 -->
          <template v-else-if="node.diff?.type === 'diff'">
            <span class="value-left">{{ formatValue(node.diff.left) }}</span>
            <span class="diff-arrow"> ↔ </span>
            <span class="value-right">{{ formatValue(node.diff.right) }}</span>
          </template>

          <!-- 类型不匹配 -->
          <template v-else-if="node.diff?.type === 'type_mismatch'">
            <span class="value-type-mismatch">{{ formatValue(node.diff.left) }}</span>
            <span class="diff-arrow"> ↔ </span>
            <span class="value-type-mismatch">{{ formatValue(node.diff.right) }}</span>
          </template>

          <!-- 新增值 -->
          <template v-else-if="node.diff?.type === 'added'">
            <span class="value-added">{{ formatValue(node.diff.right) }}</span>
          </template>

          <!-- 删除值 -->
          <template v-else-if="node.diff?.type === 'removed'">
            <span class="value-removed">{{ formatValue(node.diff.left) }}</span>
          </template>

          <!-- 相同值 -->
          <template v-else-if="!hasChildren">
            <!-- 判断是否是 Base64 -->
            <template v-if="node.diff?.isBase64">
              <span class="value-same">{{ formatBase64Short(getValue()) }}</span>
              <el-button link type="primary" size="small" class="view-btn" @click.stop="handleViewSameBase64">
                查看
              </el-button>
            </template>
            <template v-else>
              <span class="value-same">{{ formatValue(getValue()) }}</span>
            </template>
          </template>

          <!-- 对象/数组 -->
          <template v-else-if="hasChildren && !expanded">
            <span class="bracket">{{ node.type === 'array' ? '[' : '{' }}</span>
            <span class="preview-text">... </span>
            <span class="bracket">{{ node.type === 'array' ? ']' : '}' }}</span>
          </template>

          <!-- 对象/数组 (展开) -->
          <template v-else-if="hasChildren">
            <span class="bracket">{{ node.type === 'array' ? '[' : '{' }}</span>
          </template>
        </template>
      </div>
    </div>

    <!-- 子节点 -->
    <div v-if="expanded && hasChildren" class="node-children">
      <template v-for="child in visibleChildren" :key="child.key">
        <TreeNode
          :node="child"
          :collapse-same="collapseSame"
          :show-diff-only="showDiffOnly"
          :base64-threshold="base64Threshold"
          @view-base64="$emit('view-base64', $event)"
          @view-web="$emit('view-web', $event)"
        />
      </template>

      <!-- 闭合符号 -->
      <div class="node-row closing-bracket" :class="{ 'is-root': node.label === 'root' }">
        <span v-if="node.label !== 'root'" class="placeholder"></span>
        <span class="bracket">{{ node.type === 'array' ? ']' : '}' }}</span>
      </div>
    </div>

    <!-- 根节点的闭合括号（没有子节点时） -->
    <div v-if="node.label === 'root' && !hasChildren" class="node-row closing-bracket is-root">
      <span class="bracket">{{ node.type === 'array' ? ']' : '}' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ArrowDown, CaretRight } from '@element-plus/icons-vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  collapseSame: {
    type: Boolean,
    default: false
  },
  showDiffOnly: {
    type: Boolean,
    default: false
  },
  base64Threshold: {
    type: Number,
    default: 100
  }
})

const emit = defineEmits(['view-base64', 'view-web'])

const expanded = ref(true)

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

// 根据 showDiffOnly 和 collapseSame 决定是否展开
const shouldExpand = computed(() => {
  if (props.showDiffOnly) {
    return hasDiffChild(props.node)
  }
  if (props.collapseSame) {
    return props.node.status !== 'same'
  }
  return true
})

// 检查节点或其子节点是否有差异
const hasDiffChild = (node) => {
  if (node.status !== 'same') return true
  if (node.children) {
    for (const child of node.children) {
      if (hasDiffChild(child)) return true
    }
  }
  return false
}

// 初始化展开状态
expanded.value = shouldExpand.value

// 可见的子节点（根据 showDiffOnly 过滤）
const visibleChildren = computed(() => {
  if (!props.node.children) return []
  if (!props.showDiffOnly) return props.node.children
  return props.node.children.filter(child => child.status !== 'same')
})

const toggleExpand = () => {
  expanded.value = !expanded.value
}

const getValue = () => {
  if (props.node.diff) {
    return props.node.diff.right !== undefined ? props.node.diff.right : props.node.diff.left
  }
  return ''
}

const formatValue = (value) => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') {
    // 检测 Base64 并省略
    const isBase64Str = /^[A-Za-z0-9+/]+=*$/.test(value.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '')) && value.length > 50
    if (isBase64Str) {
      const cleaned = value.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '')
      return `"${cleaned.substring(0, 30)}..."`
    }
    return `"${value}"`
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const handleViewBase64 = () => {
  if (props.node.diff) {
    // 传递左右两个值，以便弹窗中判断是否相同
    emit('view-base64', {
      left: props.node.diff.left || '',
      right: props.node.diff.right || '',
      type: props.node.diff.type
    })
  }
}

// 处理相同的 Base64 值（传递同一个值两次）
const handleViewSameBase64 = () => {
  if (props.node.diff) {
    emit('view-base64', {
      left: props.node.diff.left || '',
      right: props.node.diff.right || '',
      type: 'same'
    })
  }
}

// 格式化 Base64 短显示
const formatBase64Short = (value) => {
  if (!value) return '<Base64...>'
  const cleaned = String(value).replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '')
  if (cleaned.length > 20) {
    return `<Base64:${cleaned.substring(0, 20)}...>`
  }
  return `<Base64:${cleaned}>`
}
</script>

<style scoped>
.tree-node {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
}

/* 隐藏相同的节点 */
.tree-node.hide-same .is-same {
  display: none;
}

.node-row {
  display: flex;
  align-items: flex-start;
  padding: 1px 0;
  min-height: 22px;
  white-space: pre;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 22px;
  color: #909399;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.expand-icon:hover {
  color: #409eff;
}

.placeholder {
  width: 16px;
  flex-shrink: 0;
}

.node-content {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 4px;
}

.node-key {
  color: #303133;
  font-weight: 500;
}

.colon {
  color: #909399;
}

.bracket {
  color: #909399;
}

/* 值样式 */
.value-same {
  color: #303133;
}

.value-left {
  color: #f56c6c;
}

.value-right {
  color: #67c23a;
}

.value-added {
  color: #67c23a;
}

.value-removed {
  color: #f56c6c;
}

.value-type-mismatch {
  color: #e6a23c;
  font-style: italic;
}

.value-base64 {
  color: #909399;
  font-style: italic;
}

.diff-arrow {
  color: #909399;
  font-weight: bold;
}

.preview-text {
  color: #909399;
}

/* 子节点缩进 */
.node-children {
  margin-left: 20px;
}

.node-children.is-root {
  margin-left: 0;
}

.closing-bracket {
  padding: 1px 0;
}

.closing-bracket .bracket {
  color: #909399;
}

.closing-bracket.is-root {
  padding-left: 0;
}

/* 查看按钮 */
.view-btn {
  margin-left: 8px;
  font-size: 12px;
  height: auto;
  padding: 0 4px;
  line-height: 1;
  vertical-align: middle;
}

/* Base64 值样式 */
.value-base64 {
  color: #909399;
  font-style: italic;
}
</style>
