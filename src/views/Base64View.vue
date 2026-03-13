<template>
  <div class="base64-view page-container">
    <div class="card-container">
      <h2 class="page-title">Base64 数据查看</h2>
      <p class="page-description">粘贴 Base64 字符串，自动清理干扰字符并智能解析显示</p>

      <div class="base64-container">
        <!-- 输入区域 -->
        <div class="input-area">
          <label class="input-label">Base64 字符串:</label>
          <el-input
            v-model="base64Input"
            type="textarea"
            :rows="6"
            placeholder="请粘贴 Base64 字符串（自动清理引号、换行等干扰字符）..."
            @input="handleInput"
          />
          <div class="input-hints">
            <span class="hint-tag">自动清理双引号</span>
            <span class="hint-tag">自动清理单引号</span>
            <span class="hint-tag">自动清理换行符</span>
            <span class="hint-tag">自动清理空格</span>
          </div>
        </div>

        <!-- 信息按钮组 -->
        <div class="btn-group">
          <el-button @click="pasteFromClipboard" :disabled="!canPaste" size="default">
            <el-icon><DocumentCopy /></el-icon>
            粘贴剪贴板
          </el-button>
          <el-button @click="clearAll" size="default">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>

        <!-- 解析结果信息 -->
        <div v-if="detectedType" class="info-section">
          <div class="info-header">
            <el-icon class="info-icon"><InfoFilled /></el-icon>
            <span class="info-title">检测结果</span>
          </div>
          <div class="info-content">
            <div class="info-row">
              <span class="info-label">数据类型:</span>
              <el-tag :type="getTypeTag(detectedType.type)" size="default">
                {{ detectedType.name }}
              </el-tag>
            </div>
            <div v-if="detectedType.mime" class="info-row">
              <span class="info-label">MIME 类型:</span>
              <span class="info-value">{{ detectedType.mime }}</span>
            </div>
            <div v-if="detectedType.fileExt" class="info-row">
              <span class="info-label">文件扩展名:</span>
              <span class="info-value">.{{ detectedType.fileExt }}</span>
            </div>
            <div v-if="cleanedBase64" class="info-row">
              <span class="info-label">数据大小:</span>
              <span class="info-value">{{ formatSize(cleanedBase64.length) }}</span>
            </div>
          </div>
        </div>

        <!-- 图片预览 -->
        <div v-if="showImage" class="preview-section image-preview">
          <div class="preview-header">
            <el-icon><Picture /></el-icon>
            <span>图片预览</span>
          </div>
          <div class="image-container">
            <img :src="imageUrl" alt="Base64 图片预览" />
          </div>
          <div class="preview-actions">
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载图片
            </el-button>
          </div>
        </div>

        <!-- PDF 预览 -->
        <div v-if="showPDF" class="preview-section pdf-preview">
          <div class="preview-header">
            <el-icon><Document /></el-icon>
            <span>PDF 预览</span>
          </div>
          <iframe :src="pdfUrl" class="pdf-frame" title="PDF Preview"></iframe>
          <div class="preview-actions">
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载 PDF
            </el-button>
          </div>
        </div>

        <!-- SVG 预览 -->
        <div v-if="showSVG" class="preview-section svg-preview">
          <div class="preview-header">
            <el-icon><Picture /></el-icon>
            <span>SVG 预览</span>
          </div>
          <div class="svg-container" v-html="svgContent"></div>
          <div class="preview-actions">
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载 SVG
            </el-button>
          </div>
        </div>

        <!-- 文本预览 -->
        <div v-if="showText" class="preview-section text-preview">
          <div class="preview-header">
            <el-icon><Document /></el-icon>
            <span>文本内容</span>
          </div>
          <pre class="text-content">{{ textContent }}</pre>
          <div class="preview-actions">
            <el-button @click="copyText" size="small">
              <el-icon><DocumentCopy /></el-icon>
              复制文本
            </el-button>
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
          </div>
        </div>

        <!-- JSON 预览 -->
        <div v-if="showJSON" class="preview-section json-preview">
          <div class="preview-header">
            <el-icon><Document /></el-icon>
            <span>JSON 内容</span>
          </div>
          <pre class="json-content">{{ formattedJSON }}</pre>
          <div class="preview-actions">
            <el-button @click="copyText" size="small">
              <el-icon><DocumentCopy /></el-icon>
              复制 JSON
            </el-button>
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载 JSON
            </el-button>
          </div>
        </div>

        <!-- XML 预览 -->
        <div v-if="showXML" class="preview-section xml-preview">
          <div class="preview-header">
            <el-icon><Document /></el-icon>
            <span>XML 内容</span>
          </div>
          <pre class="xml-content">{{ formattedXML }}</pre>
          <div class="preview-actions">
            <el-button @click="copyText" size="small">
              <el-icon><DocumentCopy /></el-icon>
              复制 XML
            </el-button>
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载 XML
            </el-button>
          </div>
        </div>

        <!-- HTML 预览 -->
        <div v-if="showHTML" class="preview-section html-preview">
          <div class="preview-header">
            <el-icon><Document /></el-icon>
            <span>HTML 内容</span>
          </div>
          <div class="html-tabs">
            <el-tabs v-model="htmlTab">
              <el-tab-pane label="预览" name="preview"></el-tab-pane>
              <el-tab-pane label="源码" name="source"></el-tab-pane>
            </el-tabs>
          </div>
          <div v-if="htmlTab === 'preview'" class="html-preview-frame">
            <iframe :srcdoc="textContent" class="html-frame" title="HTML Preview"></iframe>
          </div>
          <pre v-else class="html-source">{{ textContent }}</pre>
          <div class="preview-actions">
            <el-button @click="copyText" size="small">
              <el-icon><DocumentCopy /></el-icon>
              复制 HTML
            </el-button>
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载 HTML
            </el-button>
          </div>
        </div>

        <!-- CSV 预览 -->
        <div v-if="showCSV" class="preview-section csv-preview">
          <div class="preview-header">
            <el-icon><Grid /></el-icon>
            <span>CSV/TXT 内容</span>
          </div>
          <el-table :data="csvData" border style="width: 100%" max-height="500">
            <el-table-column
              v-for="(header, index) in csvHeaders"
              :key="index"
              :label="header"
              :prop="header"
            />
          </el-table>
          <div class="preview-actions">
            <el-button @click="copyText" size="small">
              <el-icon><DocumentCopy /></el-icon>
              复制内容
            </el-button>
            <el-button @click="downloadFile" size="small">
              <el-icon><Download /></el-icon>
              下载文件
            </el-button>
          </div>
        </div>

        <!-- 原始数据预览 -->
        <div v-if="showRaw" class="preview-section raw-preview">
          <div class="preview-header">
            <el-icon><Document /></el-icon>
            <span>Base64 数据</span>
          </div>
          <pre class="raw-content">{{ cleanedBase64 }}</pre>
          <div class="preview-actions">
            <el-button @click="copyBase64" size="small">
              <el-icon><DocumentCopy /></el-icon>
              复制 Base64
            </el-button>
          </div>
        </div>

        <!-- 不支持的格式提示 -->
        <div v-if="isUnknown" class="unknown-section">
          <el-alert
            title="未知格式"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>无法识别具体格式，显示原始 Base64 数据</p>
            </template>
          </el-alert>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const base64Input = ref('')
const cleanedBase64 = ref('')
const detectedType = ref(null)
const htmlTab = ref('preview')

// 解析后的数据
const imageUrl = ref('')
const pdfUrl = ref('')
const svgContent = ref('')
const textContent = ref('')
const formattedJSON = ref('')
const formattedXML = ref('')
const csvData = ref([])
const csvHeaders = ref([])

// 文件类型映射
const fileTypes = {
  // 图片
  'image/png': { type: 'image', name: 'PNG 图片', fileExt: 'png' },
  'image/jpeg': { type: 'image', name: 'JPEG 图片', fileExt: 'jpg' },
  'image/jpg': { type: 'image', name: 'JPEG 图片', fileExt: 'jpg' },
  'image/gif': { type: 'image', name: 'GIF 图片', fileExt: 'gif' },
  'image/bmp': { type: 'image', name: 'BMP 图片', fileExt: 'bmp' },
  'image/webp': { type: 'image', name: 'WebP 图片', fileExt: 'webp' },
  'image/svg+xml': { type: 'svg', name: 'SVG 矢量图', fileExt: 'svg' },
  'image/x-icon': { type: 'image', name: 'ICO 图标', fileExt: 'ico' },
  // 文档
  'application/pdf': { type: 'pdf', name: 'PDF 文档', fileExt: 'pdf' },
  'application/json': { type: 'json', name: 'JSON 数据', fileExt: 'json' },
  'text/xml': { type: 'xml', name: 'XML 文档', fileExt: 'xml' },
  'application/xml': { type: 'xml', name: 'XML 文档', fileExt: 'xml' },
  'text/html': { type: 'html', name: 'HTML 文档', fileExt: 'html' },
  'text/plain': { type: 'text', name: '纯文本', fileExt: 'txt' },
  'text/csv': { type: 'csv', name: 'CSV 文件', fileExt: 'csv' },
  // 视频
  'video/mp4': { type: 'video', name: 'MP4 视频', fileExt: 'mp4' },
  'video/webm': { type: 'video', name: 'WebM 视频', fileExt: 'webm' },
  // 音频
  'audio/mpeg': { type: 'audio', name: 'MP3 音频', fileExt: 'mp3' },
  'audio/wav': { type: 'audio', name: 'WAV 音频', fileExt: 'wav' },
  'audio/ogg': { type: 'audio', name: 'OGG 音频', fileExt: 'ogg' }
}

// Base64 头前缀映射
const base64Prefixes = {
  'data:image/png;base64,': 'image/png',
  'data:image/jpeg;base64,': 'image/jpeg',
  'data:image/jpg;base64,': 'image/jpeg',
  'data:image/gif;base64,': 'image/gif',
  'data:image/bmp;base64,': 'image/bmp',
  'data:image/webp;base64,': 'image/webp',
  'data:image/svg+xml;base64,': 'image/svg+xml',
  'data:image/x-icon;base64,': 'image/x-icon',
  'data:application/pdf;base64,': 'application/pdf',
  'data:application/json;base64,': 'application/json',
  'data:text/xml;base64,': 'text/xml',
  'data:application/xml;base64,': 'application/xml',
  'data:text/html;base64,': 'text/html',
  'data:text/plain;base64,': 'text/plain',
  'data:text/csv;base64,': 'text/csv',
  'data:video/mp4;base64,': 'video/mp4',
  'data:video/webm;base64,': 'video/webm',
  'data:audio/mpeg;base64,': 'audio/mpeg',
  'data:audio/wav;base64,': 'audio/wav',
  'data:audio/ogg;base64,': 'audio/ogg'
}

const canPaste = ref(true)

// 清理 Base64 字符串
const cleanBase64 = (input) => {
  if (!input) return ''

  let cleaned = input
    // 移除双引号
    .replace(/"/g, '')
    // 移除单引号
    .replace(/'/g, '')
    // 移除换行符（包括 \r\n 和 \n）
    .replace(/\r?\n/g, '')
    // 移除回车符
    .replace(/\r/g, '')
    // 移除制表符
    .replace(/\t/g, '')
    // 移除多余空格（但保留 base64 内部可能的空格）
    .replace(/^\s+|\s+$/g, '')

  return cleaned
}

// 检测并提取 MIME 类型
const detectMimeType = (base64Str) => {
  if (!base64Str) return null

  // 检查是否有 data URI 前缀
  for (const [prefix, mime] of Object.entries(base64Prefixes)) {
    if (base64Str.toLowerCase().startsWith(prefix.toLowerCase())) {
      return mime
    }
  }

  // 检查是否有 data: 前缀但类型未知
  const dataPrefixMatch = base64Str.match(/^data:([^;,]+);base64,/i)
  if (dataPrefixMatch) {
    return dataPrefixMatch[1]
  }

  // 尝试通过 Base64 文件头魔数判断
  const magicNumbers = {
    'JVBERi': 'application/pdf',           // PDF
    'iVBORw0KGgo': 'image/png',           // PNG
    '/9j/': 'image/jpeg',                   // JPEG
    'R0lGODdh': 'image/gif',                // GIF (GIF89a)
    'R0lGODlh': 'image/gif',                // GIF (GIF89a)
    'Qk': 'image/bmp',                      // BMP
    'UklGR': 'image/webp',                  // WebP
    'PHN2Z': 'image/svg+xml',               // SVG (<svg)
    'PD94bW': 'text/xml',                   // XML (<?xml)
    'ew': 'application/json',               // JSON ({)
    'Ww': 'application/json',               // JSON ([)
    'PCFET0': 'text/html',                  // HTML (<!DOC)
    'PGh0bW': 'text/html',                  // HTML (<html)
    'PGgx': 'text/html',                    // HTML (<h1)
    'VXpu': 'video/mp4',                    // MP4
    'UklGRi': 'audio/wav'                   // WAV (RIFF)
  }

  for (const [magic, mime] of Object.entries(magicNumbers)) {
    if (base64Str.startsWith(magic)) {
      return mime
    }
  }

  return null
}

// 处理输入
const handleInput = () => {
  const cleaned = cleanBase64(base64Input.value)
  cleanedBase64.value = cleaned

  if (!cleaned) {
    detectedType.value = null
    resetViews()
    return
  }

  const mime = detectMimeType(cleaned)

  if (mime) {
    const fileInfo = fileTypes[mime] || { type: 'unknown', name: '未知格式', fileExt: 'unknown' }
    detectedType.value = {
      type: fileInfo.type,
      name: fileInfo.name,
      mime: mime,
      fileExt: fileInfo.fileExt
    }

    processBase64(cleaned, mime)
  } else {
    // 未知格式，但可能只是缺少前缀
    detectedType.value = {
      type: 'unknown',
      name: '未知格式',
      mime: null,
      fileExt: null
    }
    content.value = cleaned
  }
}

const resetViews = () => {
  imageUrl.value = ''
  pdfUrl.value = ''
  svgContent.value = ''
  textContent.value = ''
  formattedJSON.value = ''
  formattedXML.value = ''
  csvData.value = []
  csvHeaders.value = []
}

// 处理 Base64 数据
const processBase64 = (base64Str, mime) => {
  resetViews()

  // 确保有 data URI 前缀
  let withPrefix = base64Str
  if (!base64Str.toLowerCase().startsWith('data:')) {
    withPrefix = `data:${mime};base64,${base64Str.replace(/^data:[^;]+;base64,/i, '')}`
  }

  // 提取纯 Base64 部分（无前缀）
  const pureBase64 = withPrefix.replace(/^data:[^;]+;base64,/i, '')

  switch (mime) {
    case 'image/png':
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/gif':
    case 'image/bmp':
    case 'image/webp':
    case 'image/x-icon':
      imageUrl.value = withPrefix
      break

    case 'image/svg+xml':
      try {
        svgContent.value = atob(pureBase64)
      } catch {
        svgContent.value = pureBase64
      }
      break

    case 'application/pdf':
      pdfUrl.value = withPrefix
      break

    case 'application/json':
      try {
        const jsonStr = atob(pureBase64)
        formattedJSON.value = JSON.stringify(JSON.parse(jsonStr), null, 2)
      } catch {
        formattedJSON.value = atob(pureBase64)
      }
      break

    case 'text/xml':
    case 'application/xml':
      try {
        formattedXML.value = formatXML(atob(pureBase64))
      } catch {
        formattedXML.value = atob(pureBase64)
      }
      break

    case 'text/html':
      try {
        textContent.value = atob(pureBase64)
      } catch {
        textContent.value = pureBase64
      }
      break

    case 'text/plain':
      try {
        textContent.value = atob(pureBase64)
      } catch {
        textContent.value = pureBase64
      }
      // 检查是否为 CSV
      if (textContent.value.includes(',') && textContent.value.includes('\n')) {
        parseCSV(textContent.value)
      }
      break

    case 'text/csv':
      try {
        const csvStr = atob(pureBase64)
        parseCSV(csvStr)
      } catch {
        textContent.value = pureBase64
      }
      break

    case 'video/mp4':
    case 'video/webm':
      // 视频可以嵌入，但可能太大
      imageUrl.value = withPrefix
      break

    case 'audio/mpeg':
    case 'audio/wav':
    case 'audio/ogg':
      // 音频用 audio 标签
      imageUrl.value = withPrefix
      break

    default:
      textContent.value = pureBase64
  }
}

// 解析 CSV
const parseCSV = (csvStr) => {
  const lines = csvStr.trim().split('\n')
  if (lines.length < 2) return

  // 简单 CSV 解析
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }

  csvHeaders.value = headers
  csvData.value = data
}

// 格式化 XML
const formatXML = (xmlStr) => {
  // 简单格式化
  let formatted = ''
  let pad = 0

  xmlStr.split(/>\s*</).forEach(node => {
    if (node.match(/^\/\w/)) pad -= 1
    formatted += '  '.repeat(pad) + '<' + node + '>\n'
    if (node.match(/^<?\w[^>]*[^/]$/)) pad += 1
  })

  return formatted.substring(1, formatted.length - 1)
}

// 显示条件
const showImage = computed(() => detectedType.value?.type === 'image' && imageUrl.value)
const showPDF = computed(() => detectedType.value?.type === 'pdf' && pdfUrl.value)
const showSVG = computed(() => detectedType.value?.type === 'svg' && svgContent.value)
const showText = computed(() => detectedType.value?.type === 'text' && textContent.value && !showCSV.value)
const showJSON = computed(() => detectedType.value?.type === 'json')
const showXML = computed(() => ['xml'].includes(detectedType.value?.type))
const showHTML = computed(() => detectedType.value?.type === 'html')
const showCSV = computed(() => csvData.value.length > 0)
const showRaw = computed(() => cleanedBase64.value && !showImage.value && !showPDF.value && !showSVG.value && !showJSON.value && !showXML.value && !showHTML.value && !showCSV.value)
const isUnknown = computed(() => detectedType.value?.type === 'unknown')

// 获取标签类型
const getTypeTag = (type) => {
  const tagMap = {
    image: 'success',
    pdf: 'danger',
    svg: 'success',
    json: 'warning',
    xml: 'info',
    html: 'primary',
    text: '',
    csv: 'warning',
    video: 'danger',
    audio: 'success',
    unknown: 'info'
  }
  return tagMap[type] || ''
}

// 格式化大小
const formatSize = (length) => {
  const bytes = Math.ceil(length * 0.75) // Base64 解码后大约是这个大小
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// 粘贴剪贴板
const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    base64Input.value = text
    handleInput()
    ElMessage.success('已粘贴剪贴板内容')
  } catch {
    ElMessage.error('无法读取剪贴板内容')
  }
}

// 清空
const clearAll = () => {
  base64Input.value = ''
  cleanedBase64.value = ''
  detectedType.value = null
  resetViews()
  textContent.value = ''
  formattedJSON.value = ''
  formattedXML.value = ''
  csvData.value = []
  csvHeaders.value = []
}

// 下载文件
const downloadFile = () => {
  if (!detectedType.value) return

  const link = document.createElement('a')
  link.download = `file.${detectedType.value.fileExt || 'dat'}`
  link.href = imageUrl.value || pdfUrl.value

  if (textContent.value) {
    const blob = new Blob([textContent.value], { type: detectedType.value.mime || 'text/plain' })
    link.href = URL.createObjectURL(blob)
  }

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  ElMessage.success('文件已开始下载')
}

// 复制文本
const copyText = async () => {
  const text = formattedJSON.value || formattedXML.value || textContent.value
  if (text) {
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

// 复制 Base64
const copyBase64 = async () => {
  if (cleanedBase64.value) {
    try {
      await navigator.clipboard.writeText(cleanedBase64.value)
      ElMessage.success('Base64 已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

// 页面加载时检查剪贴板权限
const checkClipboardPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'clipboard-read' })
    canPaste.value = result.state === 'granted'
  } catch {
    canPaste.value = false
  }
}

onMounted(() => {
  checkClipboardPermission()
})
</script>

<style scoped>
.base64-view {
  height: 100%;
  overflow-y: auto;
}

.page-description {
  color: #909399;
  margin-bottom: 25px;
}

.base64-container {
  max-width: 900px;
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

.input-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.hint-tag {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* 信息区域 */
.info-section {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.info-icon {
  color: #67c23a;
  font-size: 18px;
}

.info-title {
  font-weight: 600;
  color: #67c23a;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-label {
  font-size: 13px;
  color: #909399;
  min-width: 80px;
}

.info-value {
  font-size: 14px;
  color: #606266;
}

/* 预览区域通用样式 */
.preview-section {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.preview-header .el-icon {
  color: #409eff;
}

.preview-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  justify-content: flex-end;
}

/* 图片预览 */
.image-preview .image-container {
  text-align: center;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 20px;
  max-height: 500px;
  overflow: auto;
}

.image-preview img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

/* PDF 预览 */
.pdf-preview .pdf-frame {
  width: 100%;
  height: 500px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

/* SVG 预览 */
.svg-preview .svg-container {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 20px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-preview :deep(svg) {
  max-width: 100%;
  max-height: 400px;
}

/* 文本预览 */
.text-preview .text-content,
.json-preview .json-content,
.xml-preview .xml-content,
.html-source {
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

/* HTML 预览 */
.html-tabs {
  margin-bottom: 15px;
}

.html-preview-frame {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.html-frame {
  width: 100%;
  height: 400px;
  border: none;
  background: #fff;
}

/* CSV 表格 */
.csv-preview :deep(.el-table) {
  font-size: 13px;
}

/* 未知格式 */
.unknown-section {
  margin-top: 20px;
}

/* 滚动条优化 */
.text-content::-webkit-scrollbar,
.json-content::-webkit-scrollbar,
.xml-content::-webkit-scrollbar,
.image-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.text-content::-webkit-scrollbar-thumb,
.json-content::-webkit-scrollbar-thumb,
.xml-content::-webkit-scrollbar-thumb,
.image-container::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 4px;
}

.text-content::-webkit-scrollbar-thumb:hover,
.json-content::-webkit-scrollbar-thumb:hover,
.xml-content::-webkit-scrollbar-thumb:hover,
.image-container::-webkit-scrollbar-thumb:hover {
  background: #909399;
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

  .base64-container {
    max-width: 100%;
  }

  .input-label {
    font-size: 13px;
  }

  .btn-group {
    width: 100%;
  }

  .btn-group .el-button {
    flex: 1;
    min-width: 120px;
  }

  .info-row {
    flex-wrap: wrap;
  }

  .info-label {
    width: 100%;
    font-size: 12px;
  }

  .preview-header {
    font-size: 13px;
  }

  .image-preview img {
    max-height: 300px;
  }

  .pdf-frame,
  .html-frame {
    height: 300px;
  }

  .text-content,
  .json-content,
  .xml-content {
    font-size: 12px;
    padding: 10px;
  }

  .preview-actions {
    flex-wrap: wrap;
  }

  .preview-actions .el-button {
    flex: 1;
    min-width: 100px;
  }
}
</style>
