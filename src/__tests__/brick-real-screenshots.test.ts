import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { classifyTiles, detectBoard, needsRectification, rectifyPerspective } from '../utils/brick-assistant'
import type { Pixels } from '../utils/brick-assistant'
import { recognizeBoardPixels } from '../utils/brick-recognition'

/**
 * Screenshots of the game, scaled down and reduced to a small palette (see `fixtures/NOTICE.md`).
 * They are third-party artwork, kept as small as the pipeline tolerates: one photograph of a screen
 * with perspective and a reflection, one full board, and two rows of icons at a size the matcher
 * still reads.
 */
const fixture = (name: string, width: number, height: number): Pixels => {
  const rgb = gunzipSync(readFileSync(`src/__tests__/fixtures/${name}.rgb.gz`))
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgb[i * 3]; data[i * 4 + 1] = rgb[i * 3 + 1]; data[i * 4 + 2] = rgb[i * 3 + 2]; data[i * 4 + 3] = 255
  }
  return { data, width, height }
}

/** What the app does with an imported picture: detect, straighten if the photo is tilted, read it. */
const readBoard = (pixels: Pixels) => {
  const detection = detectBoard(pixels)
  expect(detection).not.toBeNull()
  if (!detection) throw new Error('no board')
  let image = pixels, board = detection
  if (needsRectification(detection)) {
    const cell = Math.round(Math.min(pixels.width, pixels.height) / Math.max(detection.rows, detection.cols))
    image = rectifyPerspective(pixels, detection.quad, Math.round(detection.cols * cell), Math.round(detection.rows * cell))
    board = detectBoard(image) ?? detection
  }
  const result = recognizeBoardPixels(image, board.grid, board, 26)
  const ids = result.board.flat().filter(Boolean)
  return { board, bricks: ids.length, groups: new Set(ids).size }
}

const sliceRows = (image: Pixels, cols: number, rows: number): Pixels[] => {
  const patches: Pixels[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x0 = Math.round(image.width * c / cols), x1 = Math.round(image.width * (c + 1) / cols)
    const y0 = Math.round(image.height * r / rows), y1 = Math.round(image.height * (r + 1) / rows)
    const data = new Uint8ClampedArray((x1 - x0) * (y1 - y0) * 4)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const from = (y * image.width + x) * 4, to = ((y - y0) * (x1 - x0) + (x - x0)) * 4
      data[to] = image.data[from]; data[to + 1] = image.data[from + 1]; data[to + 2] = image.data[from + 2]; data[to + 3] = 255
    }
    patches.push({ data, width: x1 - x0, height: y1 - y0 })
  }
  return patches
}

describe('真实截图', () => {
  it('翻拍照片里能定位出完整棋盘，砖块数量对得上', () => {
    // Photographed at an angle with a reflection on the glass, then scaled to 240 px wide.
    const { board, bricks } = readBoard(fixture('board-photo', 240, 348))
    expect({ rows: board.rows, cols: board.cols }).toEqual({ rows: 14, cols: 10 })
    // The player counted 30 bricks (15 pairs) on that board. At this scale the reading may be a
    // brick or two either way, but it must stay in the neighbourhood instead of losing the board.
    expect(bricks).toBeGreaterThanOrEqual(28)
    expect(bricks).toBeLessThanOrEqual(32)
  })
  it('满盘截图里每一格都有砖', () => {
    const { board, bricks } = readBoard(fixture('board-full', 240, 326))
    expect({ rows: board.rows, cols: board.cols }).toEqual({ rows: 14, cols: 10 })
    // A full board: the cell count is the brick count, nothing may be dropped.
    expect(bricks).toBe(board.rows * board.cols)
  })
  it('两行 20 个图标分成 14 类', () => {
    // Two rows of the same screenshot at a size the matcher still reads: leek twice, cabbage three
    // times, bonfire twice, basket twice, straw hat twice, plus eight singletons.
    const ids = classifyTiles(sliceRows(fixture('row-pair', 397, 82), 10, 2), 26)
    expect(ids.filter(Boolean).length).toBe(20)
    expect(new Set(ids).size).toBe(14)
    // The two leeks are the first and the last cell of the top row, nine cells apart.
    expect(ids[0]).toBe(ids[9])
  })
})
