import { describe, it, expect } from 'vitest'
import { formatCode, FORMATTERS, detectLanguage } from '../utils/formatter'

describe('Formatter Utils', () => {
  describe('FORMATTERS', () => {
    it('应该包含所有支持的格式', () => {
      const expectedFormats = [
        'json',
        'javascript',
        'typescript',
        'html',
        'css',
        'markdown',
        'yaml',
        'xml',
        'diff',
        'sql',
        'python',
        'go',
        'rust',
        'java',
        'cpp',
        'php',
        'ruby',
        'shell'
      ]
      expect(Object.keys(FORMATTERS)).toEqual(expect.arrayContaining(expectedFormats))
    })

    it('每个格式应该有 name 和 parser 属性', () => {
      for (const [key, config] of Object.entries(FORMATTERS)) {
        expect(config).toHaveProperty('name')
        expect(config).toHaveProperty('parser')
      }
    })
  })

  describe('formatCode', () => {
    it('应该格式化 JSON', async () => {
      const input = '{"name":"test","value":123}'
      const result = await formatCode(input, 'json')
      expect(result).toContain('{')
      expect(result).toContain('}')
      expect(result).toContain('"name":')
      expect(result).toContain('"value":')
    })

    it('应该格式化紧凑的 JSON 数组', async () => {
      const input = '[1,2,3,4,5]'
      const result = await formatCode(input, 'json')
      expect(result).toContain('[')
      expect(result).toContain(']')
    })

    it('应该格式化 YAML', async () => {
      const input = 'name: test\nvalue: 123'
      const result = await formatCode(input, 'yaml')
      expect(result).toBeDefined()
    })

    it('应该格式化 XML', async () => {
      const input = '<root><item>test</item></root>'
      const result = await formatCode(input, 'xml')
      expect(result).toContain('<root>')
      expect(result).toContain('</root>')
      expect(result).toContain('<item>')
      expect(result).toContain('</item>')
    })

    it('应该正确处理包含长文本的 XML 而不抛出错误', async () => {
      // 长文本可能导致负缩进错误
      const longText = 'a'.repeat(100)
      const input = `<root><item>${longText}</item></root>`
      // 不应该抛出 RangeError
      const result = await formatCode(input, 'xml')
      expect(result).toContain('<root>')
      expect(result).toContain('</root>')
      expect(result).toContain(longText)
    })

    it('应该格式化 Diff', async () => {
      const input = 'diff --git a/test.js b/test.js\n--- a/test.js\n+++ b/test.js'
      const result = await formatCode(input, 'diff')
      expect(result).toContain('diff --git')
    })

    it('应该格式化 SQL', async () => {
      const input = 'select * from users where id=1'
      const result = await formatCode(input, 'sql')
      expect(result).toContain('SELECT')
      expect(result).toContain('FROM')
      expect(result).toContain('WHERE')
      // 验证关键字大写
      expect(result).toMatch(/SELECT.*FROM.*WHERE/s)
    })

    it('应该保留 SQL 字符串字面量的大小写', async () => {
      const input = "SELECT * FROM users WHERE name = 'Alice'"
      const result = await formatCode(input, 'sql')
      // 字符串字面量应该保持原样，不被大写
      expect(result).toContain("'Alice'")
      // 关键字应该大写
      expect(result).toContain('SELECT')
      expect(result).toContain('FROM')
      expect(result).toContain('WHERE')
    })

    it('应该格式化 JavaScript', async () => {
      const input = 'function test(){return 1;}'
      const result = await formatCode(input, 'javascript')
      expect(result).toContain('function')
    })

    it('应该格式化 CSS', async () => {
      const input = 'body{margin:0;padding:0;}'
      const result = await formatCode(input, 'css')
      expect(result).toContain('body')
      expect(result).toContain('{')
      expect(result).toContain('margin')
    })

    it('应该格式化 HTML', async () => {
      const input = '<html><body><div>test</div></body></html>'
      const result = await formatCode(input, 'html')
      expect(result).toContain('<html>')
      expect(result).toContain('</html>')
    })

    it('应该格式化 Python', async () => {
      const input = 'def hello():\n    print("hi")'
      const result = await formatCode(input, 'python')
      expect(result).toContain('def')
      expect(result).toContain('hello')
      expect(result).toContain('print')
    })

    it('应该正确处理 Python 的 else 缩进', async () => {
      const input = 'if x > 0:\n    print("positive")\nelse:\n    print("negative")'
      const result = await formatCode(input, 'python')
      // else 应该与 if 同级缩进
      const lines = result.split('\n')
      const ifLine = lines.find(l => l.includes('if x'))
      const elseLine = lines.find(l => l.trim().startsWith('else'))
      expect(ifLine).toBeDefined()
      expect(elseLine).toBeDefined()
      // 计算缩进空格数
      const ifIndent = ifLine.length - ifLine.trimStart().length
      const elseIndent = elseLine.length - elseLine.trimStart().length
      // else 应该与 if 有相同的缩进
      expect(elseIndent).toBe(ifIndent)
    })

    it('应该格式化 TypeScript', async () => {
      const input = 'interface User{name:string;age:number;}'
      const result = await formatCode(input, 'typescript')
      expect(result).toContain('interface')
      expect(result).toContain('User')
      expect(result).toContain('name')
      expect(result).toContain('string')
    })

    it('应该抛出错误对于无效 JSON', async () => {
      const input = '{"invalid": json}'
      await expect(formatCode(input, 'json')).rejects.toThrow()
    })
  })

  describe('detectLanguage', () => {
    it('应该检测 JSON 对象', () => {
      expect(detectLanguage('{"key": "value"}')).toBe('json')
    })

    it('应该检测 JSON 数组', () => {
      expect(detectLanguage('[1, 2, 3]')).toBe('json')
    })

    it('应该检测 Diff', () => {
      expect(detectLanguage('diff --git a/test.js b/test.js')).toBe('diff')
      expect(detectLanguage('--- a\n+++ b')).toBe('diff')
    })

    it('应该检测 XML', () => {
      expect(detectLanguage('<?xml version="1.0"?><root></root>')).toBe('xml')
    })

    it('应该检测 HTML', () => {
      expect(detectLanguage('<!DOCTYPE html><html></html>')).toBe('html')
      expect(detectLanguage('<html><body></body></html>')).toBe('html')
    })

    it('应该检测 SQL', () => {
      expect(detectLanguage('SELECT * FROM users')).toBe('sql')
      expect(detectLanguage('insert into table')).toBe('sql')
    })

    it('应该检测 Python', () => {
      expect(detectLanguage('def hello():\n    pass')).toBe('python')
    })

    it('应该检测 JavaScript', () => {
      expect(detectLanguage('const x = 1')).toBe('javascript')
      expect(detectLanguage('function test() {}')).toBe('javascript')
    })

    it('应该检测 TypeScript', () => {
      expect(detectLanguage('const x: number = 1')).toBe('typescript')
      expect(detectLanguage('interface User { name: string }')).toBe('typescript')
      expect(detectLanguage('type Result<T> = Promise<T>')).toBe('typescript')
      expect(detectLanguage('function greet(name: string): void')).toBe('typescript')
      expect(detectLanguage('Array<string>')).toBe('typescript')
    })

    it('应该检测 YAML', () => {
      expect(detectLanguage('name: test\nvalue: 123')).toBe('yaml')
    })

    it('应该检测 Markdown', () => {
      expect(detectLanguage('# Heading\n- list')).toBe('markdown')
    })

    it('默认返回 javascript', () => {
      expect(detectLanguage('some random code')).toBe('javascript')
    })
  })
})
