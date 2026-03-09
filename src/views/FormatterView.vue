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
          <div class="output-format">
            <span class="format-label">输出格式:</span>
            <el-radio-group v-model="outputAs" size="default">
              <el-radio-button value="code">代码</el-radio-button>
              <el-radio-button value="highlight">高亮</el-radio-button>
            </el-radio-group>
          </div>
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

      <!-- 错误提示 - 移到上方 -->
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

        <!-- 输出面板 - 代码模式 -->
        <div class="editor-panel" v-show="outputAs === 'code'">
          <div class="panel-header">
            <el-icon><DocumentChecked /></el-icon>
            <span>格式化结果</span>
            <el-button size="small" @click="copyResult" :disabled="!outputCode">
              <el-icon><DocumentCopy /></el-icon>
              复制
            </el-button>
          </div>
          <textarea
            v-model="outputCode"
            class="code-editor output"
            readonly
            placeholder="格式化结果将显示在这里..."
          ></textarea>
        </div>

        <!-- 输出面板 - 高亮模式 -->
        <div class="editor-panel highlight-panel" v-show="outputAs === 'highlight'">
          <div class="panel-header">
            <el-icon><View /></el-icon>
            <span>格式化结果（语法高亮）</span>
            <el-button size="small" @click="copyResult" :disabled="!outputCode">
              <el-icon><DocumentCopy /></el-icon>
              复制
            </el-button>
          </div>
          <div class="code-highlight-wrapper">
            <div class="code-highlight" ref="highlightContainer">
              <pre><code ref="highlightCode" v-html="highlightedCode"></code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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
const outputAs = ref('highlight')
const inputCode = ref('')
const outputCode = ref('')
const errorMsg = ref('')
const highlightContainer = ref(null)

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

  try {
    outputCode.value = await formatCode(inputCode.value, selectedFormat.value)
  } catch (err) {
    errorMsg.value = err.message
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

const clearAll = () => {
  inputCode.value = ''
  outputCode.value = ''
  errorMsg.value = ''
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

.error-alert {
  margin-bottom: 20px;
  border: 1px solid #f56c6c;
  border-radius: 8px;
}

@media screen and (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .format-selector,
  .output-format {
    flex-direction: column;
    align-items: flex-start;
  }

  .editor-section {
    grid-template-columns: 1fr;
  }

  .btn-group-center {
    flex-wrap: wrap;
  }
}
</style>
