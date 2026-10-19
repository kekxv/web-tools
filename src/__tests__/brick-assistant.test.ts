import { describe, expect, it } from 'vitest'
import { findMoves, applyMove, classifyTiles, detectGrid, pushTiles, rectifyPerspective } from '../utils/brick-assistant'

// These fixtures catch illegal paths through occupied cells and false image merges.
describe('框内推动与直线消除', () => {
  const chicken = [[1, 2, 3, 4, 0, 0], [5, 1, 6, 7, 8, 9]]
  it('鸡腿右推一格，同时推动右边三块，再与下方鸡腿消除', () => {
    const move = findMoves(chicken).find(m => m.from.row === 0 && m.from.col === 0 && m.push?.direction === 'right' && m.push.distance === 1)!
    expect(move).toBeDefined()
    expect(move.path).toEqual([{ row: 0, col: 1 }, { row: 1, col: 1 }])
    expect(move.push?.tiles).toHaveLength(4)
    expect(applyMove(chicken, move)).toEqual([[0, 0, 2, 3, 4, 0], [5, 0, 6, 7, 8, 9]])
    expect(chicken[0]).toEqual([1, 2, 3, 4, 0, 0])
  })
  it('不允许绕外框、拐弯连线或把砖推到外框之外', () => {
    expect(findMoves([[1, 2, 1]])).toEqual([])
    expect(findMoves([[1, 2], [3, 1]])).toEqual([])
    expect(() => pushTiles([[1, 2, 0]], { row: 0, col: 0 }, 'right', 2)).toThrow()
    expect(() => pushTiles([[1]], { row: 0, col: 0 }, 'left', 1)).toThrow()
  })
  it('推动后仍有障碍时不能配对，不能借用其他旧配对冒充推动结果', () => {
    const board = [[1, 2, 3, 0], [4, 8, 5, 6], [7, 1, 9, 10], [11, 11, 12, 13]]
    expect(findMoves(board).some(m => m.from.row === 0 && m.from.col === 0 && m.to.row === 2 && m.to.col === 1)).toBe(false)
  })
  it('空格后的水桶是障碍，只能把起点的帽子与白菜一起下推一格', () => {
    const board = [[1], [2], [0], [3], [0], [0]]
    const result = pushTiles(board, { row: 0, col: 0 }, 'down', 1)
    expect(result.board).toEqual([[0], [1], [2], [3], [0], [0]])
    expect(result.tiles).toHaveLength(2)
    expect(() => pushTiles(board, { row: 0, col: 0 }, 'down', 2)).toThrow()
    expect(() => pushTiles([[1, 2, 0, 3, 0, 0]], { row: 0, col: 0 }, 'right', 2)).toThrow()
  })
  it('起点只有一块时跨空格遇障碍停止，不能把后方独立砖块接入', () => {
    expect(pushTiles([[1, 0, 0, 2, 0]], { row: 0, col: 0 }, 'right', 2).board).toEqual([[0, 0, 1, 2, 0]])
    expect(() => pushTiles([[1, 0, 0, 2, 0]], { row: 0, col: 0 }, 'right', 3)).toThrow()
    const board = [[1, 2, 0, 3, 0, 0], [4, 5, 1, 6, 7, 8]]
    expect(findMoves(board).some(move => move.from.row === 0 && move.from.col === 0 && move.push?.direction === 'right' && move.push.distance > 1)).toBe(false)
  })
  it('向上、向下、向左推动同样受边框约束', () => {
    expect(pushTiles([[0, 1, 2]], { row: 0, col: 2 }, 'left', 1).board).toEqual([[1, 2, 0]])
    expect(pushTiles([[0], [1], [2]], { row: 2, col: 0 }, 'up', 1).board).toEqual([[1], [2], [0]])
    expect(pushTiles([[1], [2], [0]], { row: 0, col: 0 }, 'down', 1).board).toEqual([[0], [1], [2]])
  })
  it('原本无遮挡的直线配对可以直接消除；拒绝过期、穿障碍或伪造路径', () => {
    const move = findMoves([[1, 0, 1]]).find(m => !m.push)!
    expect(applyMove([[1, 0, 1]], move)).toEqual([[0, 0, 0]])
    expect(() => applyMove([[1, 2, 1]], move)).toThrow()
    expect(() => applyMove([[1, 0, 2]], move)).toThrow()
    expect(() => applyMove(chicken, { ...findMoves(chicken)[0], path: [{ row: -1, col: 0 }, { row: 1, col: 1 }] })).toThrow()
  })
})

describe('本地图片识别', () => {
  const patch = (red: number, green: number, blue: number) => ({
    data: new Uint8ClampedArray(Array.from({ length: 16 * 16 }, (_, i) =>
      i % 16 > 3 && i % 16 < 12 && i > 64 && i < 192 ? [red, green, blue, 255] : [245, 250, 195, 255]).flat()),
    width: 16, height: 16,
  })
  it('同图案分组，区分不同颜色，空棋盘格保持为空', () => {
    const blank = { data: new Uint8ClampedArray(Array(256).fill([146, 89, 25, 255]).flat()), width: 16, height: 16 }
    const result = classifyTiles([patch(230, 30, 40), patch(225, 33, 42), patch(30, 60, 230), blank], 25)
    expect(result[0]).toBe(result[1])
    expect(result[2]).not.toBe(result[0])
    expect(result[3]).toBe(0)
  })
  it('相似暖色图案不能被大面积相同底色稀释为一组', () => {
    const result = classifyTiles([patch(221, 153, 0), patch(238, 119, 17)], 18)
    expect(result).toEqual([1, 2])
  })
  it('白底图案不能误判为空格', () => {
    const tile = patch(230, 30, 40)
    for (let i = 0; i < tile.data.length; i += 4) {
      if (tile.data[i] === 245) tile.data.set([255, 255, 255, 255], i)
    }
    expect(classifyTiles([tile], 25)).toEqual([1])
  })
  it('14行棋盘中砖块边框厚度有差异时，不逐行累积裁剪偏移', () => {
    const width = 460, height = 640
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const r = Math.floor((y - 40) / 40), c = Math.floor((x - 30) / 40)
      const dx = 2 + (r % 3), dy = 2 + (c % 3)
      const px = (x - 30) % 40, py = (y - 40) % 40
      const tile = r >= 0 && r < 14 && c >= 0 && c < 10 && px >= dx && px < 40 - dx && py >= dy && py < 40 - dy
      data.set(tile ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * width + x) * 4)
    }
    const grid = detectGrid({ data, width, height })!
    expect(grid.rows).toBe(14)
    expect(grid.cols).toBe(10)
    expect(grid.x).toBeCloseTo(30, 1)
    expect(grid.y).toBeCloseTo(40, 1)
    expect(grid.width).toBeCloseTo(400, 1)
    expect(grid.height).toBeCloseTo(560, 1)
  })
  it('从浅色方块估计网格，忽略外围背景', () => {
    const width = 100, height = 100
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const tile = x >= 10 && x < 70 && y >= 20 && y < 80 && (x - 10) % 20 < 18 && (y - 20) % 20 < 18
      data.set(tile ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * width + x) * 4)
    }
    const grid = detectGrid({ data, width, height })!
    expect(grid.cols).toBe(3)
    expect(grid.rows).toBe(3)
    expect(grid.x).toBeCloseTo(9, 0)
    expect(detectGrid({ data: new Uint8ClampedArray(400), width: 10, height: 10 })).toBeNull()
  })
})

describe('棋盘透视校正', () => {
  it('四点透视把四角颜色映射到校正图对应角落', () => {
    const width = 10, height = 10, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([x < 5 ? 255 : 0, y < 5 ? 255 : 0, 40, 255], (y * width + x) * 4)
    const result = rectifyPerspective({ data, width, height }, { topLeft: { x: 1, y: 1 }, topRight: { x: 8, y: 0 }, bottomRight: { x: 9, y: 8 }, bottomLeft: { x: 0, y: 8 } }, 8, 8)
    expect(Array.from(result.data.slice(0, 3))).toEqual([255, 255, 40])
    expect(result.width).toBe(8)
    expect(result.height).toBe(8)
  })
})
