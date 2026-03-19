import prettier from 'prettier/standalone'
import * as parserBabel from 'prettier/plugins/babel'
import * as parserTypescript from 'prettier/plugins/typescript'
import * as parserHtml from 'prettier/plugins/html'
import * as parserCss from 'prettier/plugins/postcss'
import * as parserMarkdown from 'prettier/plugins/markdown'
import * as parserYaml from 'prettier/plugins/yaml'
import * as parserEstree from 'prettier/plugins/estree'
import { js as jsBeautify, css as cssBeautify, html as htmlBeautify } from 'js-beautify'

export interface FormatterInfo {
  name: string
  parser: string
}

/**
 * 支持的语言格式
 */
export const FORMATTERS: Record<string, FormatterInfo> = {
  json: { name: 'JSON', parser: 'json' },
  javascript: { name: 'JavaScript', parser: 'javascript' },
  typescript: { name: 'TypeScript', parser: 'typescript' },
  html: { name: 'HTML', parser: 'html' },
  css: { name: 'CSS', parser: 'css' },
  less: { name: 'Less', parser: 'css' },
  scss: { name: 'SCSS', parser: 'css' },
  markdown: { name: 'Markdown', parser: 'markdown' },
  yaml: { name: 'YAML', parser: 'yaml' },
  xml: { name: 'XML', parser: 'xml' },
  sql: { name: 'SQL', parser: 'sql' },
  java: { name: 'Java', parser: 'java' },
  python: { name: 'Python', parser: 'python' },
  go: { name: 'Go', parser: 'go' },
  rust: { name: 'Rust', parser: 'rust' },
  cpp: { name: 'C/C++', parser: 'cpp' },
  csharp: { name: 'C#', parser: 'csharp' },
  php: { name: 'PHP', parser: 'php' },
  ruby: { name: 'Ruby', parser: 'ruby' },
  swift: { name: 'Swift', parser: 'swift' },
  kotlin: { name: 'Kotlin', parser: 'kotlin' },
  shell: { name: 'Shell/Bash', parser: 'shell' },
  lua: { name: 'Lua', parser: 'lua' },
  toml: { name: 'TOML', parser: 'toml' },
  ini: { name: 'INI', parser: 'ini' },
  graphql: { name: 'GraphQL', parser: 'graphql' },
  dockerfile: { name: 'Dockerfile', parser: 'dockerfile' },
  nginx: { name: 'Nginx', parser: 'nginx' },
  powershell: { name: 'PowerShell', parser: 'powershell' },
  r: { name: 'R Language', parser: 'r' },
  perl: { name: 'Perl', parser: 'perl' },
  vue: { name: 'Vue', parser: 'vue' },
  diff: { name: 'Diff/Patch', parser: 'diff' }
}

// Prettier 支持的 parser 映射
const PRETTIER_PARSERS: Record<string, string> = {
  json: 'json',
  javascript: 'babel',
  typescript: 'typescript',
  html: 'html',
  css: 'css',
  less: 'less',
  scss: 'scss',
  markdown: 'markdown',
  yaml: 'yaml',
  graphql: 'graphql',
  vue: 'vue'
}

// 所有 Prettier 插件（扁平数组）
const ALL_PRETTIER_PLUGINS = [
  parserBabel,
  parserTypescript,
  parserHtml,
  parserCss,
  parserMarkdown,
  parserYaml,
  parserEstree
]

// js-beautify 配置
const BEAUTIFY_OPTIONS = {
  indent_size: 2,
  indent_char: ' ',
  preserve_newlines: true,
  max_preserve_newlines: 2,
  brace_style: 'expand' as const
}

/**
 * 使用 Prettier 格式化代码
 */
async function formatWithPrettier(code: string, parser: string): Promise<string> {
  const prettierParser = PRETTIER_PARSERS[parser]

  if (!prettierParser) {
    throw new Error(`Prettier 不支持的格式：${parser}`)
  }

  try {
    const formatted = await prettier.format(code, {
      parser: prettierParser,
      plugins: ALL_PRETTIER_PLUGINS,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
      trailingComma: 'none',
      bracketSpacing: true,
      arrowParens: 'avoid',
      endOfLine: 'lf'
    })
    return formatted
  } catch (error) {
    throw new Error(`Prettier 格式化失败：${(error as Error).message}`)
  }
}

/**
 * 使用 js-beautify 格式化 HTML
 */
function formatHTML(code: string): string {
  return htmlBeautify(code, {
    indent_size: 2,
    indent_inner_html: true,
    wrap_line_length: 80,
    preserve_newlines: true,
    max_preserve_newlines: 2
  })
}

/**
 * 使用 js-beautify 格式化 CSS
 */
function formatCSS(code: string): string {
  return cssBeautify(code, {
    indent_size: 2,
    preserve_newlines: true,
    max_preserve_newlines: 2
  })
}

/**
 * 使用 js-beautify 格式化 JavaScript
 */
function formatJavaScript(code: string): string {
  return jsBeautify(code, {
    ...BEAUTIFY_OPTIONS,
    e4x: true
  })
}

/**
 * 格式化 XML
 */
function formatXML(code: string): string {
  const tab = '  '
  let formatted = ''
  let indent = 0

  code = code.replace(/>\s+</g, '><')

  for (let i = 0; i < code.length; i++) {
    const char = code[i]

    if (char === '<') {
      // 检查是否是结束标签
      if (code[i + 1] === '/') {
        indent--
        formatted += '\n' + tab.repeat(indent)
      } else if (code[i + 1] === '?') {
        formatted += char
        continue
      } else {
        // 检查是否是自闭合标签或单行标签
        const closeIndex = code.indexOf('>', i)
        if (closeIndex !== -1) {
          const tagContent = code.slice(i, closeIndex + 1)

          // 自闭合标签 <tag/> 保持单行
          if (tagContent.endsWith('/>')) {
            formatted += '\n' + tab.repeat(indent)
          } else {
            // 检查是否有对应的结束标签
            const tagNameMatch = tagContent.match(/^<([a-zA-Z][\w:-]*)/)
            if (tagNameMatch) {
              const tagName = tagNameMatch[1]
              const closeTagPattern = `</${tagName}>`
              const nextCloseTagIndex = code.indexOf(closeTagPattern, closeIndex)

              // 如果是短内容且没有嵌套元素，保持单行
              if (nextCloseTagIndex !== -1) {
                const innerContent = code.slice(closeIndex + 1, nextCloseTagIndex)
                // 检查内部是否包含子元素（< 字符）且长度较短
                if (!innerContent.includes('<') && innerContent.length < 80) {
                  // 单行标签，添加缩进但不换行
                  formatted += '\n' + tab.repeat(indent) + tagContent + innerContent + `</${tagName}>`
                  i = nextCloseTagIndex + closeTagPattern.length - 1
                  continue
                }
              }
            }
            formatted += '\n' + tab.repeat(indent)
          }
        } else {
          formatted += '\n' + tab.repeat(indent)
        }
      }

      if (code.slice(i, i + 2) === '/>') {
        i++
      } else if (code[i + 1] !== '/') {
        indent++
      }
    }

    formatted += char
  }

  return formatted.trim()
}

/**
 * 格式化 Diff/Patch
 */
function formatDiff(code: string): string {
  const lines = code.split('\n')
  return lines.map(line => {
    if (line.startsWith('diff --git')) {
      return '\n' + line
    }
    if (line.startsWith('index ')) {
      return line
    }
    if (line.startsWith('---') || line.startsWith('+++')) {
      return line
    }
    if (line.startsWith('@@')) {
      return '\n' + line
    }
    return line
  }).join('\n').trim()
}

/**
 * 格式化 SQL
 */
function formatSQL(code: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
    'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
    'ALL', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE',
    'IS NULL', 'IS NOT NULL', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'INDEX',
    'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'CASCADE', 'DEFAULT',
    'CONSTRAINT', 'CHECK', 'UNIQUE', 'ADD', 'MODIFY', 'COLUMN'
  ]

  let result = code.toUpperCase()

  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'g')
    result = result.replace(regex, '\n' + keyword + ' ')
  })

  return result
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ',\n  ')
    .trim()
}

/**
 * 格式化 Python
 */
function formatPython(code: string): string {
  const lines = code.split('\n')
  let indent = 0
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()

    if (line && !line.startsWith('#') && indent > 0) {
      const prevLine = result[result.length - 1] || ''
      if (prevLine && !prevLine.trimEnd().endsWith(':')) {
        indent = Math.max(0, indent - 1)
      }
    }

    result.push('  '.repeat(indent) + line)

    if (line.match(/[:]\s*(#.*)?$/) ||
        line.match(/\b(if|else|elif|for|while|def|class|try|except|finally|with|async)\b/)) {
      indent++
    }
  }

  return result.join('\n')
}

/**
 * 格式化代码（主函数）
 */
export async function formatCode(code: string, parser: string): Promise<string> {
  try {
    // 使用 Prettier 格式化
    if (PRETTIER_PARSERS[parser]) {
      return await formatWithPrettier(code, parser)
    }

    // 使用 js-beautify 或自定义格式化
    switch (parser) {
      case 'xml':
        return formatXML(code)
      case 'diff':
        return formatDiff(code)
      case 'sql':
        return formatSQL(code)
      case 'python':
        return formatPython(code)
      case 'javascript':
      case 'babel':
        return formatJavaScript(code)
      case 'html':
        return formatHTML(code)
      case 'css':
      case 'less':
      case 'scss':
        return formatCSS(code)
      case 'java':
      case 'cpp':
      case 'csharp':
      case 'kotlin':
      case 'swift':
      case 'go':
      case 'rust':
      case 'php':
      case 'ruby':
        return jsBeautify(code, BEAUTIFY_OPTIONS)
      case 'shell':
      case 'lua':
      case 'perl':
      case 'r':
      case 'powershell':
        return code.trim()
      default:
        return code.trim()
    }
  } catch (error) {
    throw new Error(`格式化失败：${(error as Error).message}`)
  }
}

/**
 * 检测代码类型
 */
export function detectLanguage(code: string): string {
  const trimmed = code.trim()
  const firstLine = trimmed.split('\n')[0].toLowerCase()

  // Diff/Patch 检测
  if (trimmed.includes('diff --git') ||
      (trimmed.includes('--- ') && trimmed.includes('+++ ')) ||
      trimmed.match(/^index [a-f0-9]+\.[a-f0-9]+/m)) {
    return 'diff'
  }

  // JSON 检测
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // 不是有效的 JSON
    }
  }

  // HTML 检测
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') ||
      trimmed.match(/<\/(html|body|head)>/)) {
    return 'html'
  }

  // XML 检测
  if (trimmed.startsWith('<?xml') ||
      (trimmed.startsWith('<') && trimmed.endsWith('>'))) {
    return 'xml'
  }

  // SQL 检测
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/i.test(trimmed)) {
    return 'sql'
  }

  // Vue 检测
  if (trimmed.includes('<template>') && trimmed.includes('<script>')) {
    return 'vue'
  }

  // Shell/Bash 检测
  if (firstLine.startsWith('#!') && (firstLine.includes('bash') || firstLine.includes('sh')) ||
      trimmed.match(/^\s*(if \[|for |while |export |cd |mkdir |rm |cp |mv )/m)) {
    return 'shell'
  }

  // TypeScript 检测（在 JavaScript 之前）
  if (trimmed.includes('interface ') ||
      trimmed.includes('type ') && trimmed.includes('=') ||
      trimmed.includes(' as ') ||
      trimmed.includes('Array<') ||
      trimmed.includes('Record<') ||
      trimmed.includes('Promise<') ||
      trimmed.includes('<') && trimmed.includes('>') && trimmed.includes(':') ||
      trimmed.match(/[:]\s*(string|number|boolean|any|void|null|undefined|object|symbol|bigint)\b/)) {
    return 'typescript'
  }

  // JavaScript 检测
  if (trimmed.includes('function ') ||
      trimmed.includes('const ') ||
      trimmed.includes('let ') ||
      trimmed.includes('var ') ||
      trimmed.includes('=>') ||
      trimmed.includes('console.log') ||
      trimmed.includes('import ') && trimmed.includes('from')) {
    return 'javascript'
  }

  // Python 检测
  if (firstLine.includes('python') ||
      trimmed.includes('def ') && trimmed.includes(':') ||
      trimmed.match(/^\s*(import |from .+ import )/m)) {
    return 'python'
  }

  // Java 检测
  if (trimmed.includes('public class ') ||
      trimmed.includes('public static void main')) {
    return 'java'
  }

  // Go 检测
  if (trimmed.includes('package main') ||
      trimmed.includes('func main(') ||
      firstLine.includes('go:')) {
    return 'go'
  }

  // Rust 检测
  if (trimmed.includes('fn main()') ||
      trimmed.includes('let mut') ||
      trimmed.includes('impl ')) {
    return 'rust'
  }

  // PHP 检测
  if (trimmed.startsWith('<?php') || trimmed.includes('<?php')) {
    return 'php'
  }

  // Ruby 检测
  if (trimmed.match(/\b(def |class |module |require |puts )/)) {
    return 'ruby'
  }

  // CSS 检测
  if (trimmed.includes('{') && trimmed.includes('}') && trimmed.includes(':')) {
    const firstBrace = trimmed.indexOf('{')
    const beforeBrace = trimmed.substring(0, firstBrace).trim()
    if (beforeBrace.match(/^[\w\s#,\.\-+\[\]="':>*~\s]+$/)) {
      return 'css'
    }
  }

  // YAML 检测
  if (trimmed.includes(': ') && !trimmed.includes(';') &&
      !trimmed.includes('{') && !trimmed.includes('(') &&
      trimmed.match(/^\w+:/m)) {
    return 'yaml'
  }

  // Markdown 检测
  if (trimmed.match(/^#{1,6}\s/m) ||
      trimmed.match(/^- \[/m) ||
      trimmed.match(/^\|.*\|/m)) {
    return 'markdown'
  }

  // 默认 JSON（如果看起来像对象/数组）
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json'
  }

  return 'javascript'
}