import { createTwoFilesPatch } from 'diff'

/**
 * 生成统一格式的 patch
 * @param {string} oldStr - 原始文本
 * @param {string} newStr - 新文本
 * @param {string} oldFileName - 原始文件名
 * @param {string} newFileName - 新文件名
 * @returns {string} patch 内容
 */
export function generatePatch(oldStr, newStr, oldFileName = 'old', newFileName = 'new') {
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
 * @param {string} patchContent - patch 内容
 * @returns {Array} 变更行数组
 */
export function parsePatch(patchContent) {
  const lines = patchContent.split('\n')
  const changes = []

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
 * @param {string} content - patch 内容
 * @param {string} filename - 文件名
 */
export function downloadPatch(content, filename = 'changes.patch') {
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
