<template>
  <div class="formatter-view page-container">
    <div class="card-container">
      <h2 class="page-title">代码格式化工具</h2>
      <p class="page-description">支持多种编程语言和格式的 Beautifier，带语法高亮显示</p>

      <div class="toolbar">
        <div class="tool-group">
          <div class="format-selector">
            <label>选择格式:</label>
            <el-select v-model="selectedFormat" size="default" @change="onFormatChange" placeholder="请选择代码格式" style="width: 200px;">
              <el-option
                v-for="(config, key) in formatters"
                :key="key"
                :label="config.name"
                :value="key"
              />
            </el-select>
            <el-button @click="autoDetect" size="default">
              <el-icon><MagicStick /></el-icon>
              自动检测
            </el-button>
          </div>
        </div>

        <div class="tool-group">
          <el-checkbox v-model="parseEscape" size="default">解析转义</el-checkbox>
          <el-checkbox v-model="detectBase64Image" size="default">Base64 图片检测</el-checkbox>
        </div>

        <div class="tool-group">
          <el-button type="primary" @click="handleFormat" :disabled="!inputCode" size="default">
            <el-icon><Operation /></el-icon>
            格式化
          </el-button>
          <el-button @click="copyResult" :disabled="!outputCode" size="default">
            <el-icon><DocumentCopy /></el-icon>
            复制结果
          </el-button>
          <el-button @click="clearAll" size="default">
            <el-icon><Delete /></el-icon>
            清空
          </el-button>
        </div>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="errorMsg"
        title="格式化失败"
        type="error"
        :closable="false"
        show-icon
        class="error-alert"
      >
        {{ errorMsg }}
      </el-alert>

      <div class="editor-section">
        <!-- 输入面板 -->
        <div class="editor-panel">
          <div class="panel-header">
            <el-icon><Edit /></el-icon>
            <span>输入代码</span>
          </div>
          <textarea
            v-model="inputCode"
            class="code-editor"
            placeholder="请输入需要格式化的代码，例如：{'name':'test','value':123}"
            spellcheck="false"
          ></textarea>
        </div>

        <!-- 输出面板 - 高亮模式 -->
        <div class="editor-panel highlight-panel">
          <div class="panel-header">
            <el-icon><View /></el-icon>
            <span>格式化结果（语法高亮）</span>
            <el-button size="small" @click="copyResult" :disabled="!outputCode">
              <el-icon><DocumentCopy /></el-icon>
              复制
            </el-button>
          </div>
          <!-- Base64 图片缩略图 - 支持多个 -->
          <div v-if="base64Images.length > 0" class="base64-preview">
            <div class="preview-label">
              <el-icon><Picture /></el-icon>
              <span>检测到 {{ base64Images.length }} 个 Base64 图片</span>
            </div>
            <div class="thumbnail-list">
              <img
                v-for="(img, idx) in base64Images"
                :key="idx"
                :src="img"
                :alt="'Base64 预览 ' + (idx + 1)"
                class="thumbnail"
                @click="openImageDialog(idx)"
              />
            </div>
          </div>
          <div class="code-highlight-wrapper">
            <div class="code-highlight" ref="highlightContainer">
              <pre><code ref="highlightCode" v-html="highlightedCode"></code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Base64 图片查看对话框 -->
    <el-dialog v-model="showImageDialog" title="Base64 图片预览" class="image-preview-dialog" width="80%">
      <div class="image-viewer">
        <img :src="currentImage" alt="Base64 大图" />
      </div>
      <div class="image-info" v-if="currentImageIndex >= 0">
        <span>图片 {{ currentImageIndex + 1 }} / {{ base64Images.length }}</span>
      </div>
      <template #footer>
        <el-button @click="copyCurrentBase64Image" size="default">
          <el-icon><DocumentCopy /></el-icon>
          复制 Base64
        </el-button>
        <el-button @click="prevImage" :disabled="currentImageIndex <= 0" size="default">
          <el-icon><ArrowLeft /></el-icon>
          上一个
        </el-button>
        <el-button @click="nextImage" :disabled="currentImageIndex >= base64Images.length - 1" size="default">
          下一个
          <el-icon><ArrowRight /></el-icon>
        </el-button>
        <el-button type="primary" @click="showImageDialog = false" size="default">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { formatCode, FORMATTERS, detectLanguage } from '../utils/formatter'
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/atom-one-light.css'

// 注册常用语言
import json from 'highlight.js/lib/languages/json'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'
import yaml from 'highlight.js/lib/languages/yaml'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import sql from 'highlight.js/lib/languages/sql'
import shell from 'highlight.js/lib/languages/shell'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import lua from 'highlight.js/lib/languages/lua'
import r from 'highlight.js/lib/languages/r'
import perl from 'highlight.js/lib/languages/perl'
import powershell from 'highlight.js/lib/languages/powershell'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import ini from 'highlight.js/lib/languages/ini'
import properties from 'highlight.js/lib/languages/properties'
import graphql from 'highlight.js/lib/languages/graphql'
import nginx from 'highlight.js/lib/languages/nginx'
import vim from 'highlight.js/lib/languages/vim'
import erlang from 'highlight.js/lib/languages/erlang'
import elixir from 'highlight.js/lib/languages/elixir'
import haskell from 'highlight.js/lib/languages/haskell'
import scala from 'highlight.js/lib/languages/scala'
import clojure from 'highlight.js/lib/languages/clojure'
import groovy from 'highlight.js/lib/languages/groovy'
import dart from 'highlight.js/lib/languages/dart'
import ocaml from 'highlight.js/lib/languages/ocaml'
import fsharp from 'highlight.js/lib/languages/fsharp'
import tcl from 'highlight.js/lib/languages/tcl'
import vbnet from 'highlight.js/lib/languages/vbnet'
import erlangRepl from 'highlight.js/lib/languages/erlang-repl'
import protobuf from 'highlight.js/lib/languages/protobuf'

// 注册语言
hljs.registerLanguage('json', json)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('lua', lua)
hljs.registerLanguage('r', r)
hljs.registerLanguage('perl', perl)
hljs.registerLanguage('powershell', powershell)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('properties', properties)
hljs.registerLanguage('graphql', graphql)
hljs.registerLanguage('nginx', nginx)
hljs.registerLanguage('vim', vim)
hljs.registerLanguage('erlang', erlang)
hljs.registerLanguage('elixir', elixir)
hljs.registerLanguage('haskell', haskell)
hljs.registerLanguage('scala', scala)
hljs.registerLanguage('clojure', clojure)
hljs.registerLanguage('groovy', groovy)
hljs.registerLanguage('dart', dart)
hljs.registerLanguage('ocaml', ocaml)
hljs.registerLanguage('fsharp', fsharp)
hljs.registerLanguage('tcl', tcl)
hljs.registerLanguage('vbnet', vbnet)
hljs.registerLanguage('erlang-repl', erlangRepl)
hljs.registerLanguage('protobuf', protobuf)

const formatters = FORMATTERS
const selectedFormat = ref('json')
const inputCode = ref('')
const outputCode = ref('')
const errorMsg = ref('')
const highlightContainer = ref(null)

// 新增状态
const parseEscape = ref(false)
const detectBase64Image = ref(false)
const base64Images = ref<string[]>([])
const showImageDialog = ref(false)
const currentImageIndex = ref(-1)

// 当前查看的图片
const currentImage = computed(() => {
  if (currentImageIndex.value >= 0 && currentImageIndex.value < base64Images.value.length) {
    return base64Images.value[currentImageIndex.value]
  }
  return ''
})

const highlightedCode = computed(() => {
  if (!outputCode.value) return ''
  const lang = getHighlightLanguage(selectedFormat.value)
  try {
    return hljs.highlight(outputCode.value, { language: lang }).value
  } catch {
    // 如果语言不支持，返回纯文本
    return escapeHtml(outputCode.value)
  }
})

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function getHighlightLanguage(format) {
  const map = {
    json: 'json',
    javascript: 'javascript',
    typescript: 'typescript',
    html: 'html',
    css: 'css',
    markdown: 'markdown',
    yaml: 'yaml',
    xml: 'xml',
    diff: 'diff',
    sql: 'sql',
    python: 'python',
    go: 'go',
    rust: 'rust',
    java: 'java',
    cpp: 'cpp',
    csharp: 'csharp',
    php: 'php',
    ruby: 'ruby',
    shell: 'shell',
    swift: 'swift',
    kotlin: 'kotlin',
    lua: 'lua',
    r: 'r',
    perl: 'perl',
    powershell: 'powershell',
    dockerfile: 'dockerfile',
    toml: 'ini',
    ini: 'ini',
    properties: 'properties',
    graphql: 'graphql',
    nginx: 'nginx',
    vim: 'vim',
    protobuf: 'protobuf',
    // 使用类似语言的高亮
    c: 'cpp',
    objc: 'objectivec',
    bash: 'shell',
    sh: 'shell',
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    kt: 'kotlin',
    cs: 'csharp',
    fs: 'fsharp',
    hs: 'haskell',
    clj: 'clojure',
    erl: 'erlang',
    ex: 'elixir',
    exs: 'elixir',
    dart: 'dart',
    ml: 'ocaml',
    groovy: 'groovy',
    scala: 'scala'
  }
  return map[format] || 'plaintext'
}

/**
 * 解析转义字符
 */
function unescapeText(text: string): string {
  let result = text

  try {
    // 1. URL 解码
    if (text.match(/%[0-9A-Fa-f]{2}/)) {
      result = decodeURIComponent(result)
    }

    // 2. HTML 实体解码
    const htmlEntities: Record<string, string> = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
      '&#160;': ' ',
      '&frasl;': '/',
      '&bsol;': '\\',
      '&sol;': '/',
      '&comma;': ',',
      '&period;': '.',
      '&colon;': ':',
      '&semicolon;': ';',
      '&excl;': '!',
      '&quest;': '?',
      '&num;': '#',
      '&dollar;': '$',
      '&percnt;': '%',
      '&ast;': '*',
      '&at;': '@',
      '&plus;': '+',
      '&equals;': '=',
      '&lpar;': '(',
      '&rpar;': ')',
      '&lbrack;': '[',
      '&rbrack;': ']',
      '&lcub;': '{',
      '&rcub;': '}',
      '&lsqb;': '[',
      '&rsqb;': ']',
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&lsquo;': "'",
      '&rsquo;': "'",
      '&hellip;': '…',
      '&mdash;': '—',
      '&ndash;': '–',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
      '&yen;': '¥',
      '&euro;': '€',
      '&pound;': '£',
      '&cent;': '¢',
    }

    Object.entries(htmlEntities).forEach(([entity, char]) => {
      const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      result = result.replace(regex, char)
    })

    // 3. Unicode 转义 (\uXXXX)
    result = result.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })

    // 4. JSON 字符串转义
    const jsonEscapes: Record<string, string> = {
      '\\\\n': '\n',
      '\\\\r': '\r',
      '\\\\t': '\t',
      '\\\\b': '\b',
      '\\\\f': '\f',
      '\\\\v': '\v',
      '\\\\0': '\0',
    }

    Object.entries(jsonEscapes).forEach(([escape, char]) => {
      const regex = new RegExp(escape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      result = result.replace(regex, char)
    })

    // 5. 十六进制转义 (\xXX)
    result = result.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16))
    })
  } catch {
    // 解码失败，返回原文本
    return text
  }

  return result
}

/**
 * 从文本中提取 Base64 图片（支持多个）
 */
function extractBase64Images(text: string): string[] {
  const images: string[] = []

  // 匹配 data:image 格式的 Base64 - 支持 jpg 和 jpeg
  const dataUrlPattern = /data:image\/(png|jpeg|jpg|gif|svg\+xml|webp|bmp|ico);?base64[,\s]*([A-Za-z0-9+/=\s]+)/gi

  let match
  while ((match = dataUrlPattern.exec(text)) !== null) {
    const format = match[1]
    const base64Data = match[2].replace(/\s+/g, '')
    // 规范化格式：jpg → jpeg
    const normalizedFormat = format === 'jpg' ? 'jpeg' : format
    const dataUrl = `data:image/${normalizedFormat};base64,${base64Data}`

    if (base64Data.length > 0 && !images.includes(dataUrl)) {
      images.push(dataUrl)
    }
  }

  // 如果没有找到 data:image 格式，尝试查找纯 Base64（单独一行的情况）
  if (images.length === 0) {
    const lines = text.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      // 检查是否是较长的 Base64 字符串（至少 64 字符）
      if (trimmed.length >= 64 && /^[A-Za-z0-9+/]+=*$/.test(trimmed)) {
        try {
          // 尝试判断是否是图片
          const takeLength = Math.min(12, trimmed.length)
          const base64Start = trimmed.slice(0, takeLength)
          const decodedStart = atob(base64Start)

          // PNG: 89 50 4E 47
          if (decodedStart.charCodeAt(0) === 0x89 && decodedStart.slice(1, 4) === 'PNG') {
            const dataUrl = 'data:image/png;base64,' + trimmed
            if (!images.includes(dataUrl)) images.push(dataUrl)
          }
          // JPEG: FF D8 FF
          else if (decodedStart.charCodeAt(0) === 0xFF && decodedStart.charCodeAt(1) === 0xD8) {
            const dataUrl = 'data:image/jpeg;base64,' + trimmed
            if (!images.includes(dataUrl)) images.push(dataUrl)
          }
          // GIF: 47 49 46 38
          else if (decodedStart.startsWith('GIF8')) {
            const dataUrl = 'data:image/gif;base64,' + trimmed
            if (!images.includes(dataUrl)) images.push(dataUrl)
          }
          // BMP: 42 4D
          else if (decodedStart.startsWith('BM')) {
            const dataUrl = 'data:image/bmp;base64,' + trimmed
            if (!images.includes(dataUrl)) images.push(dataUrl)
          }
          // WEBP: 52 49 46 46 ... 57 45 42 50
          else if (decodedStart.startsWith('RIFF') && decodedStart.slice(8, 12) === 'WEBP') {
            const dataUrl = 'data:image/webp;base64,' + trimmed
            if (!images.includes(dataUrl)) images.push(dataUrl)
          }
        } catch {
          // 解码失败，跳过
        }
      }
    }
  }

  return images
}

const onFormatChange = () => {
  errorMsg.value = ''
}

const autoDetect = () => {
  if (inputCode.value) {
    const detected = detectLanguage(inputCode.value)
    selectedFormat.value = detected
  }
}

const handleFormat = async () => {
  if (!inputCode.value) return

  errorMsg.value = ''
  outputCode.value = ''
  base64Images.value = []

  let codeToFormat = inputCode.value

  // 如果勾选了解析转义，先解码
  if (parseEscape.value) {
    codeToFormat = unescapeText(codeToFormat)
  }

  try {
    outputCode.value = await formatCode(codeToFormat, selectedFormat.value)

    // 如果勾选了 Base64 图片检测，检查并显示预览
    if (detectBase64Image.value) {
      const extracted = extractBase64Images(outputCode.value)
      if (extracted.length > 0) {
        base64Images.value = extracted
        ElMessage.success(`检测到 ${extracted.length} 个 Base64 图片，点击缩略图可查看大图`)
      }
    }
  } catch (err) {
    errorMsg.value = err.message
  }
}

const openImageDialog = (idx: number) => {
  currentImageIndex.value = idx
  showImageDialog.value = true
}

const prevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

const nextImage = () => {
  if (currentImageIndex.value < base64Images.value.length - 1) {
    currentImageIndex.value++
  }
}

const copyResult = async () => {
  if (outputCode.value) {
    try {
      await navigator.clipboard.writeText(outputCode.value)
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

const copyCurrentBase64Image = async () => {
  if (currentImage.value) {
    try {
      await navigator.clipboard.writeText(currentImage.value)
      ElMessage.success('Base64 已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败')
    }
  }
}

const clearAll = () => {
  inputCode.value = ''
  outputCode.value = ''
  errorMsg.value = ''
  base64Images.value = []
  currentImageIndex.value = -1
}
</script>

<style scoped>
.formatter-view {
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
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.format-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.format-selector label {
  font-size: 14px;
  color: var(--text-regular);
  font-weight: 500;
  white-space: nowrap;
}

.output-format {
  display: flex;
  align-items: center;
  gap: 12px;
}

.format-label {
  font-size: 14px;
  color: var(--text-regular);
  font-weight: 500;
}

.editor-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.editor-panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-header .el-icon {
  color: var(--primary-color);
}

.panel-header .el-button {
  margin-left: auto;
}

.code-editor {
  width: 100%;
  height: 350px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  padding: 16px;
  resize: vertical;
  transition: all 0.3s;
  background: #fafafa;
  color: var(--text-primary);
}

.code-editor:focus {
  outline: none;
  background: #fff;
}

.code-editor.output {
  background: #f8f9fa;
  color: var(--text-primary);
}

.highlight-panel {
  background: #fff;
}

.code-highlight-wrapper {
  padding: 0;
}

.code-highlight {
  background: #fafafa;
  border-radius: 0;
  padding: 16px;
  overflow-x: auto;
  height: 350px;
  overflow-y: auto;
  border: none;
}

.code-highlight pre {
  margin: 0;
}

.code-highlight code {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre;
}

/* Base64 图片预览 */
.base64-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.preview-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #1976d2;
  font-weight: 500;
}

.preview-label .el-icon {
  color: #1976d2;
}

.thumbnail-list {
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}

.thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.thumbnail:hover {
  border-color: #1976d2;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 图片预览对话框 */
.image-preview-dialog .image-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 70vh;
  overflow: auto;
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

.image-viewer img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.image-preview-dialog .image-info {
  text-align: center;
  padding: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.error-alert {
  margin-bottom: 20px;
  border: 1px solid #f56c6c;
  border-radius: 8px;
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

  .tool-group {
    width: 100%;
    justify-content: stretch;
  }

  .format-selector,
  .output-format {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .format-selector label,
  .format-label {
    font-size: 13px;
    margin-bottom: 6px;
  }

  .format-selector .el-select {
    width: 100% !important;
  }

  .format-selector .el-button,
  .output-format .el-radio-group {
    width: 100%;
  }

  .editor-section {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .code-editor {
    height: 250px;
    font-size: 13px;
    padding: 12px;
  }

  .code-highlight {
    height: 300px;
    padding: 12px;
  }

  .code-highlight code {
    font-size: 12px;
  }

  .panel-header {
    padding: 10px 12px;
    font-size: 13px;
  }

  .panel-header .el-button {
    padding: 6px 10px;
    font-size: 12px;
  }

  .error-alert {
    padding: 10px 12px;
    font-size: 13px;
  }

  .base64-preview {
    flex-direction: column;
    align-items: flex-start;
  }

  .thumbnail-list {
    margin-left: 0;
    width: 100%;
    justify-content: flex-start;
  }

  .thumbnail {
    width: 40px;
    height: 40px;
  }
}
</style>
