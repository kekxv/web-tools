<template>
  <div class="json-compare-view page-container">
    <div class="card-container">
      <h2 class="page-title">JSON/XML 对比工具</h2>
      <p class="page-description">对比两个 JSON/XML 对象，高亮显示差异，支持数组匹配和 Base64 智能处理</p>

      <div class="compare-container">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-radio-group v-model="inputMode" size="default">
              <el-radio-button value="json">JSON</el-radio-button>
              <el-radio-button value="xml">XML</el-radio-button>
            </el-radio-group>
          </div>
          <div class="toolbar-right">
            <el-checkbox v-model="options.sortKeys">排序序列化</el-checkbox>
            <el-checkbox v-model="options.arrayMatch">数组匹配</el-checkbox>
            <el-checkbox v-model="options.collapseSame">折叠相同</el-checkbox>
            <el-dropdown @command="loadTestData">
              <el-button type="info">
                测试数据<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="json-simple">JSON 简单对比</el-dropdown-item>
                  <el-dropdown-item command="json-nested">JSON 嵌套对象</el-dropdown-item>
                  <el-dropdown-item command="json-array">JSON 数组匹配</el-dropdown-item>
                  <el-dropdown-item command="json-base64">JSON 含 Base64</el-dropdown-item>
                  <el-dropdown-item command="json-empty">JSON 空值对比</el-dropdown-item>
                  <el-dropdown-item command="json-type-change">JSON 类型变化</el-dropdown-item>
                  <el-dropdown-item command="json-same-base64">JSON 相同 Base64</el-dropdown-item>
                  <el-dropdown-item command="json-array-struct">JSON 数组结构变化</el-dropdown-item>
                  <el-dropdown-item command="xml-simple">XML 简单对比</el-dropdown-item>
                  <el-dropdown-item command="xml-nested">XML 嵌套结构</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="primary" @click="compare" :disabled="!leftInput || !rightInput">
              对比
            </el-button>
          </div>
        </div>

        <!-- 双栏输入 -->
        <div class="input-pane">
          <div class="input-box">
            <label class="input-label">左侧对象</label>
            <el-input
              v-model="leftInput"
              type="textarea"
              :rows="8"
              placeholder="请输入 JSON 或 XML..."
              @input="parseLeft"
            />
            <div class="input-status">
              <span v-if="leftError" class="status-error">{{ leftError }}</span>
              <span v-else-if="leftParsed" class="status-success">解析成功</span>
            </div>
          </div>
          <div class="input-box">
            <label class="input-label">右侧对象</label>
            <el-input
              v-model="rightInput"
              type="textarea"
              :rows="8"
              placeholder="请输入 JSON 或 XML..."
              @input="parseRight"
            />
            <div class="input-status">
              <span v-if="rightError" class="status-error">{{ rightError }}</span>
              <span v-else-if="rightParsed" class="status-success">解析成功</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="btn-group">
          <el-button @click="swapInputs" :disabled="!leftInput && !rightInput">
            <el-icon><Refresh /></el-icon>
            交换左右
          </el-button>
          <el-button @click="clearAll">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
          <el-button @click="formatInputs" :disabled="!leftParsed && !rightParsed">
            <el-icon><Document /></el-icon>
            格式化输入
          </el-button>
        </div>

        <!-- 对比结果 -->
        <div v-if="hasResult" class="result-section">
          <div class="result-header">
            <span class="result-title">对比结果</span>
            <el-tag :type="diffCount > 0 ? 'danger' : 'success'" size="small">
              {{ diffCount }} 处差异
            </el-tag>
            <div class="result-actions">
              <el-radio-group v-model="viewMode" size="small">
                <el-radio value="all">显示全部</el-radio>
                <el-radio value="diff">只看差异</el-radio>
              </el-radio-group>
            </div>
          </div>

          <!-- 树形差异展示 -->
          <div class="tree-container">
            <TreeNode
              v-if="diffTree"
              :node="diffTree"
              :collapse-same="viewMode === 'diff'"
              :show-diff-only="viewMode === 'diff'"
              :base64-threshold="base64Threshold"
              @view-base64="handleViewBase64"
              @view-web="handleViewWeb"
            />
          </div>
        </div>

        <!-- 空状态提示 -->
        <div v-if="!hasResult && !leftError && !rightError" class="empty-state">
          <el-icon class="empty-icon"><Document /></el-icon>
          <p>输入 JSON 或 XML 数据后点击"对比"按钮</p>
        </div>
      </div>
    </div>

    <!-- Base64 查看弹窗 -->
    <el-dialog
      v-model="base64DialogVisible"
      title="Base64 数据查看"
      width="90%"
      :close-on-click-modal="false"
      class="base64-compare-dialog"
    >
      <div class="base64-dialog-content">
        <!-- 左右对比模式 -->
        <div v-if="base64Data.left && base64Data.right && base64Data.left !== base64Data.right" class="compare-mode">
          <div class="compare-row">
            <!-- 左侧 -->
            <div class="compare-panel">
              <div class="panel-header">
                <span class="panel-title">左侧值</span>
                <el-tag size="small" type="info">{{ base64DataType.leftType || 'unknown' }}</el-tag>
              </div>
              <div class="panel-body">
                <div v-if="base64DataType.leftType === 'image'" class="preview-image">
                  <img :src="leftDataUrl" alt="左侧图片" />
                </div>
                <div v-else-if="base64DataType.leftType === 'pdf'" class="preview-pdf">
                  <iframe :src="leftDataUrl" class="preview-frame" title="Left PDF"></iframe>
                </div>
                <div v-else-if="base64DataType.leftType === 'json'" class="preview-json">
                  <pre>{{ leftJsonContent }}</pre>
                </div>
                <div v-else-if="base64DataType.leftType === 'xml'" class="preview-xml">
                  <pre>{{ leftXmlContent }}</pre>
                </div>
                <div v-else-if="base64DataType.leftType === 'html'" class="preview-html">
                  <iframe :srcdoc="leftHtmlContent" class="preview-frame" title="Left HTML"></iframe>
                </div>
                <div v-else-if="base64DataType.leftType === 'text'" class="preview-text">
                  <pre>{{ leftTextContent }}</pre>
                </div>
                <div v-else class="preview-raw">
                  <p>Base64 字符串（前 500 字符）:</p>
                  <pre class="raw-base64">{{ formatBase64Preview(base64Data.left, 500) }}</pre>
                </div>
              </div>
            </div>

            <!-- 右侧 -->
            <div class="compare-panel">
              <div class="panel-header">
                <span class="panel-title">右侧值</span>
                <el-tag size="small" type="info">{{ base64DataType.rightType || 'unknown' }}</el-tag>
              </div>
              <div class="panel-body">
                <div v-if="base64DataType.rightType === 'image'" class="preview-image">
                  <img :src="rightDataUrl" alt="右侧图片" />
                </div>
                <div v-else-if="base64DataType.rightType === 'pdf'" class="preview-pdf">
                  <iframe :src="rightDataUrl" class="preview-frame" title="Right PDF"></iframe>
                </div>
                <div v-else-if="base64DataType.rightType === 'json'" class="preview-json">
                  <pre>{{ rightJsonContent }}</pre>
                </div>
                <div v-else-if="base64DataType.rightType === 'xml'" class="preview-xml">
                  <pre>{{ rightXmlContent }}</pre>
                </div>
                <div v-else-if="base64DataType.rightType === 'html'" class="preview-html">
                  <iframe :srcdoc="rightHtmlContent" class="preview-frame" title="Right HTML"></iframe>
                </div>
                <div v-else-if="base64DataType.rightType === 'text'" class="preview-text">
                  <pre>{{ rightTextContent }}</pre>
                </div>
                <div v-else class="preview-raw">
                  <p>Base64 字符串（前 500 字符）:</p>
                  <pre class="raw-base64">{{ formatBase64Preview(base64Data.right, 500) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 单一值模式（相同值） -->
        <div v-else class="single-mode">
          <div class="single-panel">
            <div class="panel-header">
              <span class="panel-title">Base64 数据</span>
              <el-tag size="small" type="success">{{ base64DataType.leftType || 'unknown' }}</el-tag>
            </div>
            <div class="panel-body">
              <div v-if="base64DataType.leftType === 'image'" class="preview-image">
                <img :src="leftDataUrl" alt="图片" />
              </div>
              <div v-else-if="base64DataType.leftType === 'pdf'" class="preview-pdf">
                <iframe :src="leftDataUrl" class="preview-frame" title="PDF"></iframe>
              </div>
              <div v-else-if="base64DataType.leftType === 'json'" class="preview-json">
                <pre>{{ leftJsonContent }}</pre>
              </div>
              <div v-else-if="base64DataType.leftType === 'xml'" class="preview-xml">
                <pre>{{ leftXmlContent }}</pre>
              </div>
              <div v-else-if="base64DataType.leftType === 'html'" class="preview-html">
                <iframe :srcdoc="leftHtmlContent" class="preview-frame" title="HTML"></iframe>
              </div>
              <div v-else-if="base64DataType.leftType === 'text'" class="preview-text">
                <pre>{{ leftTextContent }}</pre>
              </div>
              <div v-else class="preview-raw">
                <p>Base64 字符串（前 500 字符）:</p>
                <pre class="raw-base64">{{ formatBase64Preview(base64Data.left || base64Data.right, 500) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="copyLeftBase64" v-if="base64Data.left">
          <el-icon><DocumentCopy /></el-icon>
          复制左侧
        </el-button>
        <el-button @click="copyRightBase64" v-if="base64Data.right && base64Data.left !== base64Data.right">
          <el-icon><DocumentCopy /></el-icon>
          复制右侧
        </el-button>
        <el-button @click="base64DialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 网页内容查看弹窗 -->
    <el-dialog
      v-model="webDialogVisible"
      title="内容预览"
      width="90%"
      :close-on-click-modal="false"
    >
      <div class="web-dialog-content">
        <div v-if="webContentType === 'image'" class="web-preview-image">
          <img :src="imageDataUrl" alt="图片预览" />
        </div>
        <div v-if="webContentType === 'html'" class="web-preview-html">
          <iframe :srcdoc="htmlContent" class="html-frame" title="HTML Preview"></iframe>
        </div>
      </div>
      <template #footer>
        <el-button @click="webDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import TreeNode from '../components/JsonCompare/TreeNode.vue'

const inputMode = ref('json')
const leftInput = ref('')
const rightInput = ref('')
const leftParsed = ref(null)
const rightParsed = ref(null)
const leftError = ref('')
const rightError = ref('')

const options = ref({
  sortKeys: true,
  arrayMatch: false,
  collapseSame: false
})

const base64Threshold = ref(100)

const hasResult = ref(false)
const diffTree = ref(null)
const diffCount = ref(0)
const viewMode = ref('all') // 'all' 或 'diff'

// Base64 弹窗相关
const base64DialogVisible = ref(false)
const base64Data = ref({ left: '', right: '', type: '' })
const base64DataType = ref({ leftType: '', rightType: '' })

// 左侧数据
const leftDataUrl = ref('')
const leftJsonContent = ref('')
const leftXmlContent = ref('')
const leftHtmlContent = ref('')
const leftTextContent = ref('')

// 右侧数据
const rightDataUrl = ref('')
const rightJsonContent = ref('')
const rightXmlContent = ref('')
const rightHtmlContent = ref('')
const rightTextContent = ref('')

// Web 内容弹窗相关
const webDialogVisible = ref(false)
const webContentType = ref('')
const htmlContent = ref('')

// 序列化并排序对象
const serializeAndSort = (obj) => {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeAndSort)
  } else if (typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = serializeAndSort(obj[key])
      return result
    }, {})
  }
  return obj
}

// 解析 JSON
const parseJSON = (str) => {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

// 解析 XML 为对象
const parseXML = (str) => {
  if (!str) return null
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(str, 'text/xml')

    // 检查解析错误
    const parserError = xmlDoc.getElementsByTagName('parsererror')
    if (parserError.length > 0) {
      console.error('XML 解析错误:', parserError[0].textContent)
      return null
    }

    // 获取根元素（documentElement）
    const rootElement = xmlDoc.documentElement
    if (!rootElement) {
      return null
    }

    const result = xmlToObject(rootElement)
    // 包装根节点，保留根元素名称
    return {
      [rootElement.nodeName]: result || {}
    }
  } catch (e) {
    console.error('XML 解析异常:', e)
    return null
  }
}

// XML 转对象
const xmlToObject = (node) => {
  if (!node) return null

  // 文本节点
  if (node.nodeType === 3) {
    const text = node.textContent.trim()
    return text || null
  }

  // 元素节点
  if (node.nodeType === 1) {
    const result = {}

    // 处理属性
    if (node.attributes && node.attributes.length > 0) {
      result['@attributes'] = {}
      for (let attr of node.attributes) {
        result['@attributes'][attr.name] = attr.value
      }
    }

    // 处理子节点
    const children = node.childNodes
    let hasText = false
    let textValue = ''

    for (let child of children) {
      if (child.nodeType === 3) {
        const text = child.textContent.trim()
        if (text) {
          hasText = true
          textValue += text
        }
      } else if (child.nodeType === 1) {
        const childName = child.nodeName
        const childValue = xmlToObject(child)

        if (result[childName]) {
          if (!Array.isArray(result[childName])) {
            result[childName] = [result[childName]]
          }
          result[childName].push(childValue)
        } else {
          result[childName] = childValue
        }
      }
    }

    // 如果只有文本内容，直接返回文本
    if (hasText && Object.keys(result).length === 0) {
      return textValue
    }

    // 如果只有文本和属性，添加 #text 字段
    if (hasText) {
      result['#text'] = textValue
    }

    return result
  }

  return null
}

// 解析左侧输入
const parseLeft = () => {
  leftError.value = ''
  leftParsed.value = null

  if (!leftInput.value) return

  if (inputMode.value === 'json') {
    const parsed = parseJSON(leftInput.value)
    if (parsed !== null) {
      leftParsed.value = options.value.sortKeys ? serializeAndSort(parsed) : parsed
    } else {
      leftError.value = 'JSON 格式错误'
    }
  } else {
    const parsed = parseXML(leftInput.value)
    if (parsed !== null) {
      leftParsed.value = options.value.sortKeys ? serializeAndSort(parsed) : parsed
    } else {
      leftError.value = 'XML 格式错误'
    }
  }
}

// 解析右侧输入
const parseRight = () => {
  rightError.value = ''
  rightParsed.value = null

  if (!rightInput.value) return

  if (inputMode.value === 'json') {
    const parsed = parseJSON(rightInput.value)
    if (parsed !== null) {
      rightParsed.value = options.value.sortKeys ? serializeAndSort(parsed) : parsed
    } else {
      rightError.value = 'JSON 格式错误'
    }
  } else {
    const parsed = parseXML(rightInput.value)
    if (parsed !== null) {
      rightParsed.value = options.value.sortKeys ? serializeAndSort(parsed) : parsed
    } else {
      rightError.value = 'XML 格式错误'
    }
  }
}

// 对比两个对象
const compareObjects = (left, right, path = '', arrayMatch = false) => {
  const diffs = []

  // 检测 Base64
  const isBase64 = (val) => {
    if (typeof val !== 'string') return false
    const cleaned = val.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '')
    // 降低阈值到 50，确保测试数据的 Base64 能被检测到
    return /^[A-Za-z0-9+/]+=*$/.test(cleaned) && cleaned.length > 50
  }

  // 递归对比
  const compare = (l, r, p) => {
    // 类型不同
    if (typeof l !== typeof r) {
      diffs.push({
        path: p || 'root',
        type: 'type_mismatch',
        left: l,
        right: r
      })
      return
    }

    // 都是 null/undefined
    if (l === null && r === null) return
    if (l === undefined && r === undefined) return

    // Base64 检测
    if (isBase64(l) && isBase64(r)) {
      if (l === r) return
      diffs.push({
        path: p || 'root',
        type: 'diff',
        left: l,
        right: r,
        isBase64: true
      })
      return
    }

    // 数组处理
    if (Array.isArray(l) && Array.isArray(r)) {
      if (arrayMatch) {
        // 数组匹配模式：尝试匹配元素
        const matchedL = new Set()
        const matchedR = new Set()

        for (let i = 0; i < l.length; i++) {
          for (let j = 0; j < r.length; j++) {
            if (!matchedR.has(j)) {
              const subDiffs = []
              compareRecursive(l[i], r[j], '', subDiffs)
              if (subDiffs.length === 0) {
                matchedL.add(i)
                matchedR.add(j)
                break
              }
            }
          }
        }

        // 处理未匹配的元素
        const unmatchedL = []
        const unmatchedR = []

        for (let i = 0; i < l.length; i++) {
          if (!matchedL.has(i)) {
            unmatchedL.push({ index: i, value: l[i] })
          }
        }

        for (let j = 0; j < r.length; j++) {
          if (!matchedR.has(j)) {
            unmatchedR.push({ index: j, value: r[j] })
          }
        }

        // 记录数组长度差异
        if (unmatchedL.length > 0 || unmatchedR.length > 0) {
          diffs.push({
            path: p || 'root',
            type: 'array_mismatch',
            unmatchedLeft: unmatchedL,
            unmatchedRight: unmatchedR
          })
        }
      } else {
        // 普通模式：按索引对比
        const maxLen = Math.max(l.length, r.length)
        for (let i = 0; i < maxLen; i++) {
          if (i >= l.length) {
            diffs.push({
              path: `${p}[${i}]`,
              type: 'added',
              right: r[i]
            })
          } else if (i >= r.length) {
            diffs.push({
              path: `${p}[${i}]`,
              type: 'removed',
              left: l[i]
            })
          } else {
            compareRecursive(l[i], r[i], `${p}[${i}]`)
          }
        }
      }
      return
    }

    // 对象处理
    if (typeof l === 'object' && typeof r === 'object') {
      const allKeys = new Set([...Object.keys(l || {}), ...Object.keys(r || {})])

      for (const key of allKeys) {
        const newPath = p ? `${p}.${key}` : key
        if (l && !l.hasOwnProperty(key)) {
          diffs.push({
            path: newPath,
            type: 'added',
            right: r[key]
          })
        } else if (r && !r.hasOwnProperty(key)) {
          diffs.push({
            path: newPath,
            type: 'removed',
            left: l[key]
          })
        } else if (l[key] !== r[key]) {
          compareRecursive(l[key], r[key], newPath)
        }
      }
      return
    }

    // 基本类型对比 - 值和类型都相等才算相同
    if (l !== r || typeof l !== typeof r) {
      diffs.push({
        path: p || 'root',
        type: typeof l !== typeof r ? 'type_mismatch' : 'diff',
        left: l,
        right: r
      })
    }
  }

  const compareRecursive = (l, r, p, diffArray = diffs) => {
    const localDiffs = []
    compare(l, r, p)
    if (diffArray !== localDiffs && localDiffs.length > 0) {
      diffArray.push(...localDiffs)
    }
  }

  compare(left, right, path)
  return diffs
}

// 构建树形结构
const buildDiffTree = (diffs, leftObj, rightObj) => {
  if (!leftObj && !rightObj) return null

  // 创建差异映射，方便查找
  const diffMap = new Map()
  for (const diff of diffs) {
    diffMap.set(diff.path, diff)
  }

  // 检测 Base64
  const isBase64 = (val) => {
    if (typeof val !== 'string') return false
    const cleaned = val.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '')
    // 降低阈值到 50，确保测试数据的 Base64 能被检测到
    return /^[A-Za-z0-9+/]+=*$/.test(cleaned) && cleaned.length > 50
  }

  // 递归构建树
  const buildTree = (left, right, path = '', key = '') => {
    const node = {
      key: path || 'root',
      label: key || 'root',
      type: 'object',
      children: [],
      status: 'same',
      diff: diffMap.get(path) || null
    }

    // 如果有差异，设置状态
    if (node.diff) {
      node.status = node.diff.type
    }

    // 处理数组
    if (Array.isArray(left) || Array.isArray(right)) {
      node.type = 'array'
      const leftArr = left || []
      const rightArr = right || []
      const maxLen = Math.max(leftArr.length, rightArr.length)

      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${path}[${i}]`
        const leftItem = leftArr[i]
        const rightItem = rightArr[i]

        if (i >= leftArr.length) {
          // 右侧新增
          node.children.push({
            key: itemPath,
            label: `[${i}]`,
            type: 'field',
            status: 'added',
            diff: { type: 'added', right: rightItem },
            children: []
          })
        } else if (i >= rightArr.length) {
          // 左侧删除
          node.children.push({
            key: itemPath,
            label: `[${i}]`,
            type: 'field',
            status: 'removed',
            diff: { type: 'removed', left: leftItem },
            children: []
          })
        } else if (leftItem !== null && rightItem !== null && typeof leftItem === 'object' && typeof rightItem === 'object') {
          // 两个都是对象/数组，递归对比
          const childNode = buildTree(
            leftItem,
            rightItem,
            itemPath,
            `[${i}]`
          )
          node.children.push(childNode)
        } else if (leftItem !== rightItem || typeof leftItem !== typeof rightItem) {
          // 值变化 - 检查 Base64（值和类型都相等才算相同）
          const leftIsBase64 = isBase64(leftItem)
          const rightIsBase64 = isBase64(rightItem)
          node.children.push({
            key: itemPath,
            label: `[${i}]`,
            type: 'field',
            status: typeof leftItem !== typeof rightItem ? 'type_mismatch' : 'diff',
            diff: {
              type: typeof leftItem !== typeof rightItem ? 'type_mismatch' : 'diff',
              left: leftItem,
              right: rightItem,
              isBase64: leftIsBase64 && rightIsBase64
            },
            children: []
          })
        } else {
          // 相同的值 - 保存值信息，检查是否是 Base64
          const isBase64Val = isBase64(leftItem)
          node.children.push({
            key: itemPath,
            label: `[${i}]`,
            type: 'field',
            status: 'same',
            diff: { type: 'same', left: leftItem, right: leftItem, isBase64: isBase64Val },
            children: []
          })
        }
      }

      // 如果子节点有差异，更新当前节点状态
      if (node.children.some(c => c.status !== 'same')) {
        node.status = 'diff'
      }

      return node
    }

    // 处理对象
    if (typeof left === 'object' || typeof right === 'object') {
      const allKeys = new Set([
        ...Object.keys(left || {}),
        ...Object.keys(right || {})
      ])

      for (const key of allKeys) {
        const childPath = path ? `${path}.${key}` : key
        const leftVal = left?.[key]
        const rightVal = right?.[key]

        if (left && !left.hasOwnProperty(key)) {
          // 新增
          node.children.push({
            key: childPath,
            label: key,
            type: 'field',
            status: 'added',
            diff: { type: 'added', right: rightVal },
            children: []
          })
        } else if (right && !right.hasOwnProperty(key)) {
          // 删除
          node.children.push({
            key: childPath,
            label: key,
            type: 'field',
            status: 'removed',
            diff: { type: 'removed', left: leftVal },
            children: []
          })
        } else if (leftVal !== null && rightVal !== null && typeof leftVal === 'object' && typeof rightVal === 'object') {
          // 两个都是对象/数组，递归对比
          const childNode = buildTree(leftVal, rightVal, childPath, key)
          node.children.push(childNode)
        } else if (leftVal !== rightVal || typeof leftVal !== typeof rightVal) {
          // 值变化或类型不同 - 检查 Base64
          const leftIsBase64 = isBase64(leftVal)
          const rightIsBase64 = isBase64(rightVal)
          node.children.push({
            key: childPath,
            label: key,
            type: 'field',
            status: typeof leftVal !== typeof rightVal ? 'type_mismatch' : 'diff',
            diff: {
              type: typeof leftVal !== typeof rightVal ? 'type_mismatch' : 'diff',
              left: leftVal,
              right: rightVal,
              isBase64: leftIsBase64 && rightIsBase64
            },
            children: []
          })
        } else {
          // 相同的值 - 保存值信息，检查是否是 Base64
          const isBase64Val = isBase64(leftVal)
          node.children.push({
            key: childPath,
            label: key,
            type: 'field',
            status: 'same',
            diff: { type: 'same', left: leftVal, right: leftVal, isBase64: isBase64Val },
            children: []
          })
        }
      }

      // 如果子节点有差异，更新当前节点状态
      if (node.children.some(c => c.status !== 'same')) {
        node.status = 'diff'
      }

      return node
    }

    // 基本类型
    return node
  }

  return buildTree(leftObj, rightObj)
}

// 执行对比
const compare = () => {
  if (!leftParsed.value || !rightParsed.value) {
    ElMessage.warning('请输入有效的 JSON 或 XML 数据')
    return
  }

  const diffs = compareObjects(
    leftParsed.value,
    rightParsed.value,
    '',
    options.value.arrayMatch
  )

  diffTree.value = buildDiffTree(diffs, leftParsed.value, rightParsed.value)
  diffCount.value = diffs.length
  hasResult.value = true
}

// 交换输入
const swapInputs = () => {
  const temp = leftInput.value
  leftInput.value = rightInput.value
  rightInput.value = temp

  const tempParsed = leftParsed.value
  leftParsed.value = rightParsed.value
  rightParsed.value = tempParsed

  const tempError = leftError.value
  leftError.value = rightError.value
  rightError.value = tempError
}

// 清空
const clearAll = () => {
  leftInput.value = ''
  rightInput.value = ''
  leftParsed.value = null
  rightParsed.value = null
  leftError.value = ''
  rightError.value = ''
  hasResult.value = false
  diffTree.value = null
  diffCount.value = 0
}

// 格式化输入
const formatInputs = () => {
  if (inputMode.value === 'json') {
    if (leftParsed.value) {
      leftInput.value = JSON.stringify(leftParsed.value, null, 2)
    }
    if (rightParsed.value) {
      rightInput.value = JSON.stringify(rightParsed.value, null, 2)
    }
  } else {
    // XML 格式化比较简单，暂时不做复杂处理
    ElMessage.info('XML 格式化暂不支持')
  }
}

// 测试数据
const testDataMap = {
  // JSON 简单对比
  'json-simple': {
    left: JSON.stringify({
      name: '张三',
      age: 25,
      city: '北京',
      email: 'zhangsan@example.com'
    }, null, 2),
    right: JSON.stringify({
      name: '李四',
      age: 25,
      city: '上海',
      phone: '13800138000'
    }, null, 2)
  },
  // JSON 嵌套对象
  'json-nested': {
    left: JSON.stringify({
      user: {
        name: '张三',
        profile: {
          age: 25,
          address: {
            city: '北京',
            district: '朝阳'
          }
        },
        skills: ['JavaScript', 'Vue', 'React']
      },
      status: 'active'
    }, null, 2),
    right: JSON.stringify({
      user: {
        name: '张三',
        profile: {
          age: 26,
          address: {
            city: '北京',
            district: '海淀'
          }
        },
        skills: ['JavaScript', 'Vue', 'Angular']
      },
      status: 'inactive'
    }, null, 2)
  },
  // JSON 数组匹配
  'json-array': {
    left: JSON.stringify({
      users: [
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 30 },
        { id: 3, name: 'Charlie', age: 35 }
      ],
      total: 3
    }, null, 2),
    right: JSON.stringify({
      users: [
        { id: 2, name: 'Bob', age: 31 },
        { id: 3, name: 'Charlie', age: 35 },
        { id: 4, name: 'David', age: 28 }
      ],
      total: 3
    }, null, 2)
  },
  // JSON 含 Base64
  'json-base64': {
    left: JSON.stringify({
      id: 1,
      name: '测试数据',
      avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      description: '这是一个测试'
    }, null, 2),
    right: JSON.stringify({
      id: 1,
      name: '测试数据修改',
      avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      description: '这是一个测试'
    }, null, 2)
  },
  // XML 简单对比
  'xml-simple': {
    left: `<?xml version="1.0" encoding="UTF-8"?>
<person>
  <name>张三</name>
  <age>25</age>
  <city>北京</city>
</person>`,
    right: `<?xml version="1.0" encoding="UTF-8"?>
<person>
  <name>李四</name>
  <age>30</age>
  <city>上海</city>
</person>`
  },
  // XML 嵌套结构
  'xml-nested': {
    left: `<?xml version="1.0" encoding="UTF-8"?>
<company>
  <name>科技公司</name>
  <departments>
    <department id="1">
      <name>研发部</name>
      <employees>
        <employee>
          <id>101</id>
          <name>张三</name>
          <position>工程师</position>
        </employee>
        <employee>
          <id>102</id>
          <name>李四</name>
          <position>高级工程师</position>
        </employee>
      </employees>
    </department>
  </departments>
</company>`,
    right: `<?xml version="1.0" encoding="UTF-8"?>
<company>
  <name>科技公司</name>
  <departments>
    <department id="1">
      <name>研发部</name>
      <employees>
        <employee>
          <id>101</id>
          <name>张三</name>
          <position>资深工程师</position>
        </employee>
        <employee>
          <id>103</id>
          <name>王五</name>
          <position>工程师</position>
        </employee>
      </employees>
    </department>
  </departments>
</company>`
  },
  // JSON 空值对比
  'json-empty': {
    left: JSON.stringify({
      id: '',
      name: '测试',
      description: '',
      count: 0,
      enabled: false,
      data: null
    }, null, 2),
    right: JSON.stringify({
      id: '123',
      name: '测试',
      description: '描述信息',
      count: 0,
      enabled: false,
      data: null
    }, null, 2)
  },
  // JSON 类型变化
  'json-type-change': {
    left: JSON.stringify({
      id: 123,
      value: 'string',
      list: [1, 2, 3],
      active: true
    }, null, 2),
    right: JSON.stringify({
      id: '123',
      value: 456,
      list: 'not-an-array',
      active: 'yes'
    }, null, 2)
  },
  // JSON 相同 Base64
  'json-same-base64': {
    left: JSON.stringify({
      id: 1,
      name: '相同 Base64 测试',
      avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      description: '这是一个测试'
    }, null, 2),
    right: JSON.stringify({
      id: 1,
      name: '相同 Base64 测试',
      avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      description: '这是一个测试'
    }, null, 2)
  },
  // JSON 数组结构变化
  'json-array-struct': {
    left: JSON.stringify({
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ],
      count: 2
    }, null, 2),
    right: JSON.stringify({
      items: [
        { id: 1, name: 'Item 1', extra: 'new field' },
        { id: 2, name: 'Item 2 Modified' },
        { id: 3, name: 'Item 3' }
      ],
      count: 3
    }, null, 2)
  }
}

// 加载测试数据
const loadTestData = (command) => {
  const data = testDataMap[command]
  if (!data) return

  inputMode.value = command.startsWith('xml') ? 'xml' : 'json'
  leftInput.value = data.left
  rightInput.value = data.right

  // 清空之前的解析状态
  leftParsed.value = null
  rightParsed.value = null
  leftError.value = ''
  rightError.value = ''
  hasResult.value = false

  // 自动解析
  setTimeout(() => {
    parseLeft()
    parseRight()
    // 解析成功后自动对比
    setTimeout(() => {
      if (leftParsed.value && rightParsed.value) {
        compare()
      }
    }, 100)
  }, 50)

  const typeMap = {
    'json-simple': 'JSON 简单对比',
    'json-nested': 'JSON 嵌套对象',
    'json-array': 'JSON 数组匹配',
    'json-base64': 'JSON 含 Base64',
    'json-empty': 'JSON 空值对比',
    'json-type-change': 'JSON 类型变化',
    'json-same-base64': 'JSON 相同 Base64',
    'json-array-struct': 'JSON 数组结构变化',
    'xml-simple': 'XML 简单对比',
    'xml-nested': 'XML 嵌套结构'
  }
  ElMessage.success(`已加载测试数据：${typeMap[command]}`)
}

// Base64 检测
const isBase64 = (str) => {
  if (typeof str !== 'string') return false
  const cleaned = str.replace(/\s/g, '')
  return /^[A-Za-z0-9+/]+=*$/.test(cleaned) && cleaned.length > base64Threshold.value
}

// 检测 Base64 类型
const detectBase64Type = (base64Str) => {
  if (!base64Str) return 'unknown'
  const cleaned = base64Str.replace(/\s/g, '')

  // 检查是否有 data URI 前缀
  const dataPrefixMatch = cleaned.match(/^data:([^;,]+);base64,/i)
  if (dataPrefixMatch) {
    const mime = dataPrefixMatch[1]
    if (mime.startsWith('image/')) return 'image'
    if (mime === 'application/json') return 'json'
    if (mime === 'application/pdf') return 'pdf'
    if (mime.includes('xml')) return 'xml'
    if (mime === 'text/html') return 'html'
    if (mime === 'text/plain') return 'text'
  }

  // 通过魔数检测
  try {
    const decoded = atob(cleaned.substring(0, 100))
    if (decoded.startsWith('%PNG') || decoded.startsWith('GIF8') || decoded.startsWith('\xFF\xD8')) {
      return 'image'
    }
    if (decoded.startsWith('%PDF')) {
      return 'pdf'
    }
    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      try {
        JSON.parse(decoded)
        return 'json'
      } catch {}
    }
    if (decoded.startsWith('<?xml') || decoded.startsWith('<')) {
      return 'xml'
    }
  } catch {}

  return 'unknown'
}

// 格式化 Base64 预览
const formatBase64Preview = (str, maxLength = 500) => {
  if (!str) return ''
  const cleaned = str.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '')
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...'
  }
  return cleaned
}

// 处理左右 Base64 数据
const processBase64Data = (base64Str, side) => {
  const type = detectBase64Type(base64Str)
  const pureBase64 = base64Str.replace(/^data:[^;]+;base64,/i, '')
  const dataUrl = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${pureBase64}`

  if (side === 'left') {
    base64DataType.value.leftType = type
    if (type === 'image' || type === 'pdf') {
      leftDataUrl.value = dataUrl
    } else if (type === 'json') {
      try {
        const json = JSON.parse(atob(pureBase64))
        leftJsonContent.value = JSON.stringify(json, null, 2)
      } catch {
        leftJsonContent.value = atob(pureBase64)
      }
    } else if (type === 'xml') {
      leftXmlContent.value = atob(pureBase64)
    } else if (type === 'html') {
      leftHtmlContent.value = atob(pureBase64)
    } else if (type === 'text') {
      leftTextContent.value = atob(pureBase64)
    }
  } else {
    base64DataType.value.rightType = type
    if (type === 'image' || type === 'pdf') {
      rightDataUrl.value = dataUrl
    } else if (type === 'json') {
      try {
        const json = JSON.parse(atob(pureBase64))
        rightJsonContent.value = JSON.stringify(json, null, 2)
      } catch {
        rightJsonContent.value = atob(pureBase64)
      }
    } else if (type === 'xml') {
      rightXmlContent.value = atob(pureBase64)
    } else if (type === 'html') {
      rightHtmlContent.value = atob(pureBase64)
    } else if (type === 'text') {
      rightTextContent.value = atob(pureBase64)
    }
  }
}

// 处理查看 Base64
const handleViewBase64 = (data) => {
  // data 现在是一个对象：{ left, right, type }
  base64Data.value = data
  base64DialogVisible.value = true

  // 处理左右数据
  if (data.left) {
    processBase64Data(data.left, 'left')
  }
  if (data.right) {
    processBase64Data(data.right, 'right')
  }
}

// 处理查看网页内容
const handleViewWeb = (content, type) => {
  webContentType.value = type
  if (type === 'image') {
    imageDataUrl.value = content
  } else if (type === 'html') {
    htmlContent.value = content
  }
  webDialogVisible.value = true
}

// 复制左侧 Base64
const copyLeftBase64 = async () => {
  if (base64Data.value.left) {
    try {
      await navigator.clipboard.writeText(base64Data.value.left)
      ElMessage.success('已复制左侧 Base64')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

// 复制右侧 Base64
const copyRightBase64 = async () => {
  if (base64Data.value.right) {
    try {
      await navigator.clipboard.writeText(base64Data.value.right)
      ElMessage.success('已复制右侧 Base64')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

onMounted(() => {
  // 可以从 URL 参数加载示例数据
})
</script>

<style scoped>
.json-compare-view {
  height: 100%;
  overflow-y: auto;
}

.page-description {
  color: #909399;
  margin-bottom: 25px;
}

.compare-container {
  max-width: 1400px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

/* 双栏输入 */
.input-pane {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.input-box {
  display: flex;
  flex-direction: column;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.input-status {
  margin-top: 8px;
  font-size: 13px;
  min-height: 20px;
}

.status-error {
  color: #f56c6c;
}

.status-success {
  color: #67c23a;
}

/* 按钮组 */
.btn-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* 结果区域 */
.result-section {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.result-actions {
  margin-left: auto;
}

.tree-container {
  min-height: 200px;
  max-height: 600px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 16px;
}

/* Base64 弹窗 */
.base64-dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}

.base64-info {
  margin-bottom: 20px;
}

.base64-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.base64-preview {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
}

.base64-preview-area {
  min-height: 200px;
}

.preview-image img {
  max-width: 100%;
  max-height: 400px;
  display: block;
  margin: 0 auto;
}

.preview-json pre,
.preview-xml pre,
.preview-text pre {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

/* Web 内容弹窗 */
.web-dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}

.web-preview-image img {
  max-width: 100%;
  max-height: 600px;
  display: block;
  margin: 0 auto;
}

.web-preview-html .html-frame {
  width: 100%;
  height: 500px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
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
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: center;
  }

  .toolbar-right {
    justify-content: flex-start;
  }

  .input-pane {
    grid-template-columns: 1fr;
  }

  .btn-group {
    width: 100%;
  }

  .btn-group .el-button {
    flex: 1;
    min-width: 100px;
  }

  .tree-container {
    font-size: 12px;
  }

  .base64-dialog-content,
  .web-dialog-content {
    max-height: 60vh;
  }
}
</style>
