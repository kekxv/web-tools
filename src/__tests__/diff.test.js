import { describe, it, expect } from 'vitest'
import { generatePatch, parsePatch } from '../utils/diff'

describe('Diff Utils', () => {
  describe('generatePatch', () => {
    it('应该生成基本的 patch', () => {
      const oldText = 'hello world'
      const newText = 'hello vue'
      const patch = generatePatch(oldText, newText, 'old.txt', 'new.txt')

      expect(patch).toContain('--- old.txt')
      expect(patch).toContain('+++ new.txt')
      expect(patch).toContain('-hello world')
      expect(patch).toContain('+hello vue')
    })

    it('应该处理多行文本', () => {
      const oldText = `line 1
line 2
line 3`
      const newText = `line 1
line 2 modified
line 3`
      const patch = generatePatch(oldText, newText)

      expect(patch).toContain('-line 2')
      expect(patch).toContain('+line 2 modified')
    })

    it('应该处理空字符串', () => {
      const patch = generatePatch('', 'new content')
      expect(patch).toContain('+new content')
    })

    it('应该处理相同文本', () => {
      const text = 'same content'
      const patch = generatePatch(text, text)
      // 相同文本应该没有差异标记
      expect(patch).not.toContain('+-')
    })
  })

  describe('parsePatch', () => {
    it('应该解析 patch 内容', () => {
      const patch = `--- old.txt
+++ new.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3`

      const changes = parsePatch(patch)
      expect(changes.length).toBeGreaterThan(0)

      const addChange = changes.find(c => c.type === 'add')
      const removeChange = changes.find(c => c.type === 'remove')

      expect(addChange).toBeDefined()
      expect(removeChange).toBeDefined()
      expect(addChange.content).toContain('line 2 modified')
      expect(removeChange.content).toContain('-line 2')
    })

    it('应该处理 hunk 标记', () => {
      const patch = `@@ -1,5 +1,5 @@`
      const changes = parsePatch(patch)

      const hunk = changes.find(c => c.type === 'hunk')
      expect(hunk).toBeDefined()
      expect(hunk.oldLine).toBe(1)
      expect(hunk.newLine).toBe(1)
    })
  })
})
