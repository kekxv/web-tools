import { describe, expect, it } from 'vitest'
import { findTileBounds, traceTileEdges } from '../utils/brick-edges'
import { detectBoard } from '../utils/brick-assistant'

describe('棋盘装饰边框与砖块外缘分离', () => {
  it.each(['left', 'top', 'right', 'bottom'] as const)('%s 边框隔着背景不能被并入砖块', side => {
    const width = 100, height = 100, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let colour = [140, 85, 25, 255]
      const frame = side === 'left' ? x >= 10 && x < 14 : side === 'top' ? y >= 10 && y < 14
        : side === 'right' ? x >= 66 && x < 70 : y >= 66 && y < 69
      if (frame) colour = [45, 45, 35, 255]
      if (x >= 20 && x < 60 && y >= 20 && y < 64) {
        colour = y >= 56 ? [100, 155, 60, 255] : [185, 180, 100, 255]
        if (x >= 22 && x < 58 && y >= 22 && y < 56) colour = [245, 250, 195, 255]
      }
      data.set(colour, (y * width + x) * 4)
    }
    const image = { data, width, height }
    const expected = { x: 20, y: 20, width: 40, height: 44 }
    expect(traceTileEdges(image, { x: 22, y: 22, width: 36, height: 34 })).toEqual(expected)
    expect(findTileBounds(image)).toEqual(expected)
  })

  it.each([1, 3])('顶部和左侧带木框的稀疏棋盘在 %i 倍分辨率下逐砖定位', scale => {
    const width = 300 * scale, height = 300 * scale
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const px = Math.floor(x / scale), py = Math.floor(y / scale)
      let colour = [140, 85, 25, 255]
      if ((px >= 10 && px < 14) || (py >= 10 && py < 14)) colour = [45, 45, 35, 255]
      const col = Math.floor((px - 20) / 44), row = Math.floor((py - 20) / 46)
      const tx = px - 20 - col * 44, ty = py - 20 - row * 46
      if (row >= 0 && row < 5 && col >= 0 && col < (row < 3 ? 5 : 3) && tx < 40 && ty < 44) {
        colour = ty >= 36 ? [100, 155, 60, 255] : [185, 180, 100, 255]
        if (tx >= 2 && tx < 38 && ty >= 2 && ty < 36) colour = [245, 250, 195, 255]
      }
      data.set(colour, (y * width + x) * 4)
    }
    const detection = detectBoard({ data, width, height })!
    expect(detection.cells).toHaveLength(21)
    expect([detection.rows, detection.cols]).toEqual([5, 5])
    for (const { row, col, box } of detection.cells) {
      expect(box).toEqual({ x: (20 + col * 44) * scale, y: (20 + row * 46) * scale, width: 40 * scale, height: 44 * scale })
    }
  })

  it('木框边的强光不会把边缘格子的框撑进木框和反光', () => {
    const width = 300, height = 300, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let colour = [140, 85, 25, 255]
      if ((x >= 10 && x < 14) || (y >= 10 && y < 14)) colour = [45, 45, 35, 255]
      // A lit patch of the wooden frame, right against the bricks of the first column.
      if (x >= 14 && x < 20 && y >= 20 && y < 250) colour = [250, 245, 230, 255]
      const col = Math.floor((x - 20) / 44), row = Math.floor((y - 20) / 46)
      const tx = x - 20 - col * 44, ty = y - 20 - row * 46
      if (row >= 0 && row < 5 && col >= 0 && col < 5 && tx < 40 && ty < 44) {
        colour = ty >= 36 ? [100, 155, 60, 255] : [185, 180, 100, 255]
        if (tx >= 2 && tx < 38 && ty >= 2 && ty < 36) colour = [245, 250, 195, 255]
      }
      data.set(colour, (y * width + x) * 4)
    }
    const detection = detectBoard({ data, width, height })!
    const pitch = 46
    for (const { row, col, box } of detection.cells) {
      const cell = { x: 20 + col * 44, y: 20 + row * 46, width: 44, height: 46 }
      // A brick may sit a little off its cell, but never grow into the frame or the glare.
      const slack = Math.ceil(pitch * 0.12) + 1
      expect(Math.max(box.width, box.height)).toBeLessThanOrEqual(pitch * 1.25)
      expect(box.x).toBeGreaterThanOrEqual(cell.x - slack)
      expect(box.x + box.width).toBeLessThanOrEqual(cell.x + cell.width + slack)
      expect(box.y).toBeGreaterThanOrEqual(cell.y - slack)
      expect(box.y + box.height).toBeLessThanOrEqual(cell.y + cell.height + slack)
    }
  })
})
