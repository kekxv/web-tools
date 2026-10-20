import { describe, expect, it } from 'vitest'
import { detectBoard, findMoves } from '../utils/brick-assistant'
import { isTileCandidate } from '../utils/brick-edges'
import { recognizeBoardPixels } from '../utils/brick-recognition'
import type { Pixels, TileBox } from '../utils/brick-assistant'

function fixture(rim: number[], sparse = false) {
  const width = 280, height = 280, data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([70, 110, 135, 255], i * 4)
  const boxes: TileBox[] = []
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    if (sparse && row === 3 && col === 3) continue
    const box = { x: 20 + col * 50, y: 20 + row * 50, width: 44, height: 46 }
    boxes.push(box)
    for (let y = 0; y < box.height; y++) for (let x = 0; x < box.width; x++) {
      let colour = [...rim, 255]
      if (x >= 3 && x < 41 && y >= 3 && y < 40) colour = [235, 248, 250, 255]
      if (x >= 13 && x < 31 && y >= 12 && y < 30) colour = row % 2 === 0 ? [220, 40, 30, 255] : [30, 40, 220, 255]
      data.set(colour, ((box.y + y) * width + box.x + x) * 4)
    }
  }
  return { image: { data, width, height } as Pixels, boxes }
}

describe('识别框、裁剪和求解使用同一结果', () => {
  it.each([[80, 170, 215], [100, 155, 60], [170, 100, 190]])('不同颜色边框 %j 支持检测到求解', (...rim) => {
    const { image, boxes } = fixture(rim)
    expect(isTileCandidate(image, boxes[0])).toBe(true)
    const detection = detectBoard(image)!
    expect(detection.cells).toHaveLength(16)
    const result = recognizeBoardPixels(image, detection.grid, detection, 26)
    expect(result.rects).toHaveLength(16)
    expect(result.board.flat().every(Boolean)).toBe(true)
    expect(result.board[0][0]).toBe(result.board[0][1])
    expect(result.board[0][0]).not.toBe(result.board[1][0])
    expect(findMoves(result.board).some(move => move.from.row === 0 && move.to.row === 0)).toBe(true)
    for (const rect of result.rects) {
      expect(rect).toEqual({ row: rect.row, col: rect.col, ...detection.cells.find(c => c.row === rect.row && c.col === rect.col)!.box })
    }
  })
  it('偏心砖使用检测框采样，空格不产生框或求解ID', () => {
    const { image } = fixture([80, 170, 215], true)
    const detection = detectBoard(image)!
    const result = recognizeBoardPixels(image, detection.grid, detection, 26)
    expect(result.board[3][3]).toBe(0)
    expect(result.rects).toHaveLength(15)
    const first = result.patches[0]
    expect(Array.from(first.data.slice(0, 3))).toEqual([80, 170, 215])
  })
  it('手动网格补检接受蓝边砖，拒绝均匀背景和白色眩光', () => {
    const { image } = fixture([80, 170, 215], true)
    const result = recognizeBoardPixels(image, { x: 18, y: 18, width: 200, height: 200, rows: 4, cols: 4 }, null, 26)
    expect(result.rects).toHaveLength(15)
    expect(result.board[3][3]).toBe(0)
    const white = { width: 48, height: 48, data: new Uint8ClampedArray(48 * 48 * 4).fill(255) }
    expect(isTileCandidate(white, { x: 0, y: 0, width: 48, height: 48 })).toBe(false)
  })
})

it('蓝色主题10列14行密集棋盘，顶部场景不进入求解棋盘', () => {
  const width = 480, height = 760, data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let colour = y < 100 ? [170, 210, 245, 255] : [190, 225, 245, 255]
    if (y >= 20 && y < 65 && x >= 350 && x < 410) colour = [250, 250, 250, 255]
    const col = Math.floor((x - 10) / 46), row = Math.floor((y - 100) / 46)
    const tx = x - 10 - col * 46, ty = y - 100 - row * 46
    if (col >= 0 && col < 10 && row >= 0 && row < 14 && tx < 44 && ty < 44) {
      colour = [80, 170, 215, 255]
      if (tx >= 3 && tx < 41 && ty >= 3 && ty < 41) colour = [235, 248, 250, 255]
      if (tx >= 14 && tx < 30 && ty >= 12 && ty < 30) colour = col % 2 ? [220, 40, 30, 255] : [30, 40, 220, 255]
    }
    data.set(colour, (y * width + x) * 4)
  }
  const image = { data, width, height }, detection = detectBoard(image)!
  expect([detection.rows, detection.cols]).toEqual([14, 10])
  const result = recognizeBoardPixels(image, detection.grid, detection, 26)
  expect(result.rects).toHaveLength(140)
  expect(new Set(result.board.flat()).size).toBe(2)
  expect(result.board.flat().every(Boolean)).toBe(true)
})

it('移动框选区域但行列数相同，也按新位置重新映射检测框', () => {
  const { image } = fixture([80, 170, 215])
  const detection = detectBoard(image)!
  const grid = { ...detection.grid, x: detection.grid.x + detection.grid.width / detection.cols }
  const result = recognizeBoardPixels(image, grid, detection, 26)
  expect(result.rects).toHaveLength(12)
  expect(result.board.every(row => row[3] === 0)).toBe(true)
  expect(result.rects.find(rect => rect.row === 0 && rect.col === 0)?.x).toBe(70)
})

it('棋盘上的反光不算砖块，不会凭空多出一格', () => {
  const width = 260, height = 260, data = new Uint8ClampedArray(width * height * 4)
  const pitch = 60, start = 20
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let colour = [140, 85, 25, 255]
    const col = Math.floor((x - start) / pitch), row = Math.floor((y - start) / pitch)
    const tx = x - start - col * pitch, ty = y - start - row * pitch
    if (row >= 0 && row < 3 && col >= 0 && col < 3 && tx < 52 && ty < 52) {
      colour = [185, 180, 100, 255]
      if (tx >= 2 && tx < 50 && ty >= 2 && ty < 46) colour = [245, 250, 195, 255]
      if (tx >= 16 && tx < 36 && ty >= 14 && ty < 34) colour = [100, 155, 60, 255]
    }
    // A glare spot on the wooden board, inside a cell of the lattice but on no brick.
    if (row === 2 && col === 2 && Math.hypot(tx - 26, ty - 26) < 24) colour = [252, 252, 250, 255]
    if (row === 2 && col === 2 && Math.hypot(tx - 26, ty - 26) < 16) colour = [255, 255, 255, 255]
    data.set(colour, (y * width + x) * 4)
  }
  const image = { data, width, height }
  const detection = detectBoard(image)!
  expect([detection.rows, detection.cols]).toEqual([3, 3])
  expect(detection.cells).toHaveLength(8)
  expect(detection.face).toBeDefined()
  const result = recognizeBoardPixels(image, detection.grid, detection, 26)
  expect(result.rects).toHaveLength(8)
  expect(result.board[2][2]).toBe(0)
  expect(result.board.flat().filter(Boolean)).toHaveLength(8)
})
