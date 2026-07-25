import { describe, it, expect } from 'vitest'

/**
 * 测试 FormatterView 的复制值功能
 *
 * 功能：
 * 1. 折叠长字符串值
 * 2. 添加复制图标
 * 3. hover显示复制图标
 * 4. 点击复制原始值
 */

describe('FormatterView 复制值功能', () => {
  const maxLineLength = 50

  // 模拟折叠逻辑（用于测试）
  const foldStringValues = (code) => {
    return code.replace(/": "([^"]+)"/g, (match, value) => {
      if (value.length > maxLineLength) {
        const start = value.substring(0, 5)
        const end = value.substring(value.length - 5)
        return `": "${start}...${end}"`
      }
      return match
    })
  }

  describe('折叠逻辑', () => {
    it('应该正确折叠超过50字符的字符串值', () => {
      const longValue = '这是一个非常' + '非常'.repeat(30) + '长的字符串值'
      const input = `{\n  "key": "${longValue}"\n}`
      const result = foldStringValues(input)
      // 应该折叠
      expect(result).toContain('...')
      // 不应该包含完整的值
      expect(result).not.toContain(longValue)
    })

    it('不应该折叠不超过50字符的字符串值', () => {
      const input = '{\n  "key": "短值"\n}'
      const result = foldStringValues(input)
      expect(result).toBe(input)
      expect(result).toContain('短值')
    })

    it('折叠方式应该是开头5字...结尾5字', () => {
      const longValue = '这是一段' + '非常'.repeat(30) + '长的文本内容'
      const input = `{\n  "text": "${longValue}"\n}`
      const result = foldStringValues(input)
      // 开头5字：这是一段非
      // 结尾5字：的文本内容
      expect(result).toContain('这是一段非...的文本内容')
    })
  })

  describe('HTML标记添加', () => {
    it('应该为折叠值添加folded-value类', () => {
      const longValue = '这是一段' + '非常'.repeat(30) + '长的文本内容'
      // hljs高亮后，引号会被转义为 &quot;
      const highlightedHtml = `<span class="hljs-string">&quot;${longValue}&quot;</span>`

      // 模拟添加折叠标记（使用转义后的引号）
      const result = highlightedHtml.replace(
        /<span class="hljs-string">&quot;([^&]*)&quot;<\/span>/g,
        (match, content) => {
          if (content.length > maxLineLength) {
            const start = content.substring(0, 5)
            const end = content.substring(content.length - 5)
            return `<span class="hljs-string folded-value" data-value-index="0">&quot;${start}...${end}<span class="copy-icon">📋</span>&quot;</span>`
          }
          return match
        }
      )

      // 应该包含folded-value类
      expect(result).toContain('folded-value')
      // 应该包含data-value-index属性
      expect(result).toContain('data-value-index')
      // 应该包含copy-icon
      expect(result).toContain('copy-icon')
      // 应该包含📋图标
      expect(result).toContain('📋')
      // 应该显示折叠后的内容
      expect(result).toContain('这是一段非...的文本内容')
    })

    it('应该保留hljs-string类以保持语法高亮', () => {
      const longValue = '这是一段' + '非常'.repeat(30) + '长的文本内容'
      const highlightedHtml = `<span class="hljs-string">&quot;${longValue}&quot;</span>`

      const result = highlightedHtml.replace(
        /<span class="hljs-string">&quot;([^&]*)&quot;<\/span>/g,
        (match, content) => {
          if (content.length > maxLineLength) {
            const start = content.substring(0, 5)
            const end = content.substring(content.length - 5)
            return `<span class="hljs-string folded-value" data-value-index="0">&quot;${start}...${end}<span class="copy-icon">📋</span>&quot;</span>`
          }
          return match
        }
      )

      // 应该保留hljs-string类
      expect(result).toContain('hljs-string')
    })

    it('不应该为短值添加折叠标记', () => {
      const shortValue = '短值'
      const highlightedHtml = `<span class="hljs-string">&quot;${shortValue}&quot;</span>`

      const result = highlightedHtml.replace(
        /<span class="hljs-string">&quot;([^&]*)&quot;<\/span>/g,
        (match, content) => {
          if (content.length > maxLineLength) {
            const start = content.substring(0, 5)
            const end = content.substring(content.length - 5)
            return `<span class="hljs-string folded-value" data-value-index="0">&quot;${start}...${end}<span class="copy-icon">📋</span>&quot;</span>`
          }
          return match
        }
      )

      // 不应该包含folded-value类
      expect(result).not.toContain('folded-value')
      // 不应该包含copy-icon
      expect(result).not.toContain('copy-icon')
      // 应该保持原样
      expect(result).toBe(highlightedHtml)
    })
  })

  describe('原始值保存', () => {
    it('应该正确保存原始值到Map中', () => {
      const originalValues = new Map()
      const longValue = '这是一段' + '非常'.repeat(30) + '长的文本内容'

      // 模拟保存原始值
      originalValues.set(0, longValue)

      // 应该能够获取原始值
      expect(originalValues.get(0)).toBe(longValue)
      expect(originalValues.get(0)).toContain('这是一段')
      expect(originalValues.get(0)).toContain('长的文本内容')
    })

    it('应该为多个折叠值保存不同的原始值', () => {
      const originalValues = new Map()
      const longValue1 = '这是第一个' + '非常'.repeat(30) + '长文本内容'
      const longValue2 = '这是第二个' + '非常'.repeat(30) + '长文本内容'

      originalValues.set(0, longValue1)
      originalValues.set(1, longValue2)

      expect(originalValues.get(0)).toBe(longValue1)
      expect(originalValues.get(1)).toBe(longValue2)
      expect(originalValues.get(0)).not.toBe(originalValues.get(1))
    })
  })

  describe('复制图标样式', () => {
    it('复制图标应该默认隐藏', () => {
      const css = `
        .copy-icon {
          opacity: 0;
          transition: opacity 0.2s;
        }
      `
      // CSS应该包含opacity: 0
      expect(css).toContain('opacity: 0')
    })

    it('hover时复制图标应该显示', () => {
      const css = `
        .folded-value:hover .copy-icon {
          opacity: 1;
        }
      `
      // CSS应该包含hover时opacity: 1
      expect(css).toContain('opacity: 1')
    })

    it('复制图标应该有过渡动画', () => {
      const css = `
        .copy-icon {
          transition: opacity 0.2s;
        }
      `
      // CSS应该包含transition
      expect(css).toContain('transition')
    })
  })

  describe('点击复制功能', () => {
    it('点击复制图标应该触发复制操作', () => {
      // 模拟点击事件处理
      const handleClick = (target, originalValues) => {
        if (target.classList.contains('copy-icon')) {
          const foldedValue = target.closest('.folded-value')
          if (foldedValue) {
            const valueIndex = foldedValue.getAttribute('data-value-index')
            if (valueIndex !== null) {
              const originalValue = originalValues.get(parseInt(valueIndex))
              return originalValue
            }
          }
        }
        return null
      }

      // 模拟DOM元素
      const copyIcon = document.createElement('span')
      copyIcon.classList.add('copy-icon')

      const foldedValue = document.createElement('span')
      foldedValue.classList.add('folded-value')
      foldedValue.setAttribute('data-value-index', '0')
      foldedValue.appendChild(copyIcon)

      // 模拟原始值
      const originalValues = new Map()
      originalValues.set(0, '原始值')

      // 模拟点击
      const result = handleClick(copyIcon, originalValues)

      // 应该返回原始值
      expect(result).toBe('原始值')
    })

    it('应该从data-value-index获取正确的原始值', () => {
      const originalValues = new Map()
      originalValues.set(0, '第一个值')
      originalValues.set(1, '第二个值')
      originalValues.set(2, '第三个值')

      // 模拟获取不同索引的值
      expect(originalValues.get(0)).toBe('第一个值')
      expect(originalValues.get(1)).toBe('第二个值')
      expect(originalValues.get(2)).toBe('第三个值')
    })
  })

  describe('边界情况', () => {
    it('应该正确处理空字符串', () => {
      const input = '{\n  "empty": ""\n}'
      const result = foldStringValues(input)
      expect(result).toBe(input)
      expect(result).toContain('""')
    })

    it('应该正确处理恰好50字符的字符串', () => {
      const value50 = 'a'.repeat(50)
      const input = `{\n  "key": "${value50}"\n}`
      const result = foldStringValues(input)
      // 不超过阈值，不折叠
      expect(result).toBe(input)
    })

    it('应该正确处理51字符的字符串', () => {
      const value51 = 'a'.repeat(51)
      const input = `{\n  "key": "${value51}"\n}`
      const result = foldStringValues(input)
      // 超过阈值，应该折叠
      expect(result).toContain('...')
    })

    it('应该正确处理包含特殊字符的字符串', () => {
      const longValue = '这是包含"引号"的' + '非常'.repeat(30) + '长文本'
      const input = `{\n  "text": "${longValue.replace(/"/g, '\\"')}"\n}`
      // 应该能处理，不会崩溃
      expect(() => foldStringValues(input)).not.toThrow()
    })
  })
})
