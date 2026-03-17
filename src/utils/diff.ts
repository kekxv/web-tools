import { createTwoFilesPatch } from 'diff'

export interface PatchChange {
  type: 'hunk' | 'add' | 'remove' | 'context'
  content: string
  oldLine?: number
  oldCount?: number
  newLine?: number
  newCount?: number
}

/**
 * 生成统一格式的 patch
 */
export function generatePatch(
  oldStr: string,
  newStr: string,
  oldFileName: string = 'old',
  newFileName: string = 'new'
): string {
  const patch = createTwoFilesPatch(
    oldFileName,
    newFileName,
    oldStr,
    newStr
  )
  // 移除 "\ No newline at end of file" 提示行
  return patch.replace(/^\\ No newline at end of file$\n?/gm, '')
}

/**
 * 解析 patch 内容，返回变更信息
 */
export function parsePatch(patchContent: string): PatchChange[] {
  const lines = patchContent.split('\n')
  const changes: PatchChange[] = []

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // 变更块标记
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
      if (match) {
        changes.push({
          type: 'hunk',
          oldLine: parseInt(match[1]),
          oldCount: parseInt(match[2]) || 1,
          newLine: parseInt(match[3]),
          newCount: parseInt(match[4]) || 1,
          content: line
        })
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      changes.push({ type: 'add', content: line })
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      changes.push({ type: 'remove', content: line })
    } else if (line.startsWith(' ') || line.startsWith('\\') || line === '') {
      changes.push({ type: 'context', content: line })
    }
  }

  return changes
}

/**
 * 下载 patch 文件
 */
export function downloadPatch(content: string, filename: string = 'changes.patch'): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}