import { describe, expect, it } from 'vitest'
import { findMoves, applyMove, classifyTiles, detectBoard, detectGrid, expandQuad, findTileBounds, isTileCandidate, needsRectification, pushTiles, quadFromPoints, rectifyPerspective, reviewGrouping, trimTile } from '../utils/brick-assistant'
import type { Pixels, TileBox } from '../utils/brick-assistant'

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
  it('同一图案缩放、偏移、明暗不同或被裁掉一角时仍归为一组', () => {
    const size = 32
    const pea = (cx: number, cy: number, rx: number, ry: number, angle: number) => (u: number, v: number) => {
      const dx = u - cx, dy = v - cy, cos = Math.cos(angle), sin = Math.sin(angle)
      const x = dx * cos + dy * sin, y = -dx * sin + dy * cos
      return x * x / (rx * rx) + y * y / (ry * ry) <= 1
    }
    const render = (shape: (u: number, v: number) => boolean, bright: number) => {
      const data = new Uint8ClampedArray(size * size * 4)
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
        data.set(shape((x + .5) / size, (y + .5) / size) ? [110 * bright, 200 * bright, 60 * bright, 255] : [245, 250, 195, 255], (y * size + x) * 4)
      return { data, width: size, height: size }
    }
    const base = render(pea(.5, .5, .34, .22, -.6), 1)
    const small = render(pea(.46, .53, .22, .14, -.6), 1.12)     // 同一图案，缩小 + 偏亮
    const clipped = render(pea(.36, .52, .34, .22, -.6), 1.05)   // 同一图案，被画面边缘裁掉一角
    const other = render((u, v) => u > .3 && u < .7 && v > .35 && v < .65, 1)
    const result = classifyTiles([base, small, clipped, other], 26)
    expect(result[0]).toBe(result[1])
    expect(result[0]).toBe(result[2])
    expect(result[3]).not.toBe(result[0])
  })
  it('只有一条细线的大片同色格子判为空，不算图案', () => {
    const build = (icon: (x: number, y: number) => boolean) => {
      const size = 16, data = new Uint8ClampedArray(size * size * 4)
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
        data.set(icon(x, y) ? [30, 160, 70, 255] : [245, 250, 195, 255], (y * size + x) * 4)
      return { data, width: size, height: size }
    }
    // A hairline across the tile (like the app's own moving-path overlay).
    expect(classifyTiles([build((_, y) => y === 7)], 26)).toEqual([0])
    // A real icon that happens to be a wide block is still a pattern.
    expect(classifyTiles([build((x, y) => x > 3 && x < 12 && y > 4 && y < 11)], 26)).toEqual([1])
  })
  it('同一图案在轻微明暗差异下仍归为一组', () => {
    const base = patch(230, 30, 40)
    const dimmed = { ...base, data: Uint8ClampedArray.from(base.data, (value, index) => index % 4 === 3 ? 255 : value * 0.9) }
    const brighter = { ...base, data: Uint8ClampedArray.from(base.data, (value, index) => index % 4 === 3 ? 255 : Math.min(255, value * 1.08)) }
    expect(classifyTiles([base, dimmed, brighter, patch(30, 60, 230)], 26)).toEqual([1, 1, 1, 2])
  })
  it('白底图案不能误判为空格', () => {
    const tile = patch(230, 30, 40)
    for (let i = 0; i < tile.data.length; i += 4) {
      if (tile.data[i] === 245) tile.data.set([255, 255, 255, 255], i)
    }
    expect(classifyTiles([tile], 25)).toEqual([1])
  })
  // 同一图案的两块砖不可能裁得一模一样：一块挨着木框、被测光打得发白、还被邻格挤偏一点，
  // 仍是同一图案；而两个不同的图标也不能因此被并成一组。
  describe('图案分组对裁切差异与反光稳健', () => {
    const size = 40
    const tile = (options: { icon: 'wheat' | 'axe'; glare?: boolean; strip?: 'left' | 'bottom'; shift?: number }) => {
      const data = new Uint8ClampedArray(size * size * 4)
      const shift = options.shift ?? 0
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        // Brick face, with the bevel ring the game draws around every brick.
        let colour = x < 2 || y < 2 || x >= size - 2 || y >= size - 2 ? [185, 180, 100, 255] : [245, 250, 195, 255]
        const u = (x - size / 2 - shift) / size, v = (y - size / 2) / size
        if (options.icon === 'wheat' && Math.abs(u) < 0.11 && Math.abs(v) < 0.3) colour = [225, 175, 45, 255]
        if (options.icon === 'wheat' && Math.abs(v) < 0.05 && Math.abs(u) < 0.2) colour = [150, 90, 30, 255]
        if (options.icon === 'axe' && Math.hypot(u + 0.1, v + 0.06) < 0.22) colour = [70, 70, 80, 255]
        if (options.icon === 'axe' && Math.abs(u - 0.14) < 0.045 && Math.abs(v) < 0.3) colour = [150, 90, 30, 255]
        // A glare blob and the wooden frame pulled into the crop by an unclamped outline.
        if (options.glare && Math.hypot(u - 0.42, v - 0.45) < 0.16) colour = [252, 250, 240, 255]
        if (options.strip === 'left' && x < 4) colour = [140, 85, 25, 255]
        if (options.strip === 'bottom' && y >= size - 4) colour = [100, 155, 60, 255]
        data.set(colour, (y * size + x) * 4)
      }
      return { data, width: size, height: size }
    }
    it('同一图标换裁切、被木框和反光挤到一边，仍是一组', () => {
      const wheatClean = tile({ icon: 'wheat' })
      const wheatHard = tile({ icon: 'wheat', glare: true, strip: 'left', shift: 3 })
      expect(classifyTiles([wheatClean, wheatHard], 26)).toEqual([1, 1])
    })
    it('同一图标在另一主题的底色和光线下仍是一组', () => {
      const clean = tile({ icon: 'axe' })
      const themed = tile({ icon: 'axe', strip: 'bottom' })
      // A dimmer, warmer copy of the same brick, as a photo of another screen would look.
      const dimmed = { ...themed, data: Uint8ClampedArray.from(themed.data, (value, index) => index % 4 === 3 ? 255 : value * 0.92) }
      expect(classifyTiles([clean, themed, dimmed], 26)).toEqual([1, 1, 1])
    })
    it('同色系的两个图标（黄铃铛与黄彩椒）不能并成一组', () => {
      // Both are the same yellow blob on the same face; only the lines drawn inside differ.
      const icon = (kind: 'bell' | 'pepper', options: { bright?: number; glare?: boolean; shiftX?: number } = {}) => {
        const bright = options.bright ?? 1, shiftX = options.shiftX ?? 0
        const data = new Uint8ClampedArray(size * size * 4)
        const tint = (colour: number[]) => colour.map(value => Math.max(0, Math.min(255, Math.round(value * bright))))
        const face = tint([246, 250, 198]), bevel = tint([182, 176, 96]), skin = tint([244, 190, 52])
        const shade = tint([206, 143, 30]), stalk = tint([108, 152, 58]), clapper = tint([146, 96, 34])
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const u = (x + 0.5) / size - shiftX, v = (y + 0.5) / size
          let colour = x < 2 || y < 2 || x >= size - 2 || y >= size - 2 ? bevel : face
          const body = Math.hypot((u - 0.5) / 0.3, (v - 0.56) / 0.27) <= 1
          if (body) {
            colour = skin
            if (kind === 'bell') {
              if (v > 0.52 && v < 0.575) colour = shade                     // rim across the skirt
              if (Math.hypot(u - 0.5, v - 0.72) < 0.075) colour = clapper   // clapper under it
              if (Math.hypot((u - 0.5) / 0.06, (v - 0.27) / 0.045) <= 1) colour = stalk
            } else {
              if (Math.abs(u - 0.5) < 0.035) colour = shade                  // cleft between lobes
              if (Math.abs(u - 0.5) < 0.055 && v > 0.22 && v < 0.34) colour = stalk
            }
          } else if (kind === 'pepper' && Math.abs(u - 0.5) < 0.05 && v > 0.24 && v < 0.34) {
            colour = stalk                                                  // stalk above the body
          }
          if (options.glare && Math.hypot(u - 0.84, v - 0.15) < 0.06) colour = tint([252, 250, 238])
          data.set([...colour, 255], (y * size + x) * 4)
        }
        return { data, width: size, height: size }
      }
      const bell = icon('bell'), bellDim = icon('bell', { bright: 0.96, glare: true, shiftX: 0.008 })
      const pepper = icon('pepper'), pepperBright = icon('pepper', { bright: 1.06 })
      expect(classifyTiles([bell, bellDim, pepper, pepperBright], 26)).toEqual([1, 1, 2, 2])
      // A brick cut by the frame is compared with 1.35 times the allowance: still two groups.
      expect(classifyTiles([bell, bellDim, pepper, pepperBright], 35)).toEqual([1, 1, 2, 2])
    })
    it('两个不同的图标不会因为背景相同被并成一组', () => {
      const wheat = tile({ icon: 'wheat' })
      const axe = tile({ icon: 'axe' })
      const wheatHard = tile({ icon: 'wheat', glare: true, strip: 'bottom' })
      const axeHard = tile({ icon: 'axe', strip: 'left' })
      const result = classifyTiles([wheat, axe, wheatHard, axeHard], 26)
      expect(result[0]).toBe(result[2])
      expect(result[1]).toBe(result[3])
      expect(result[0]).not.toBe(result[1])
    })
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

describe('照片自动定位', () => {
  // A rendered board with tiles in the given cells; `angle` tilts the whole board, the
  // way a hand-held photo of a screen looks.
  function render(cells?: [number, number][], angle = 0) {
    const width = 460, height = 640, data = new Uint8ClampedArray(width * height * 4)
    const radians = angle * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians)
    const cx = width / 2, cy = height / 2
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const bx = (x - cx) * cos + (y - cy) * sin + cx, by = -(x - cx) * sin + (y - cy) * cos + cy
      const col = Math.floor((bx - 30) / 40), row = Math.floor((by - 40) / 40)
      const px = (bx - 30) % 40, py = (by - 40) % 40
      const inside = row >= 0 && row < 14 && col >= 0 && col < 10 && px >= 3 && px < 37 && py >= 3 && py < 37
      const wanted = !cells || cells.some(([r, c]) => r === row && c === col)
      data.set(inside && wanted ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * width + x) * 4)
    }
    return { data, width, height }
  }
  // Scattered bricks whose rows drift apart, the way lens distortion stretches a photo;
  // no single straight-line lattice describes this board.
  function cropCell(image: Pixels, box: { x: number; y: number; width: number; height: number }, size = 64): Pixels {
    const data = new Uint8ClampedArray(size * size * 4)
    for (let ty = 0; ty < size; ty++) for (let tx = 0; tx < size; tx++) {
      const sx = Math.min(image.width - 1, Math.max(0, Math.round(box.x + box.width * tx / size)))
      const sy = Math.min(image.height - 1, Math.max(0, Math.round(box.y + box.height * ty / size)))
      const from = (sy * image.width + sx) * 4, to = (ty * size + tx) * 4
      data[to] = image.data[from]; data[to + 1] = image.data[from + 1]; data[to + 2] = image.data[from + 2]; data[to + 3] = 255
    }
    return { data, width: size, height: size }
  }

  function renderWarped(cells: [number, number][], stretch: number) {
    const width = 460, height = 800, data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) data.set([140, 85, 25, 255], i * 4)
    for (const [row, col] of cells) {
      const x0 = Math.round(33 + col * 40), y0 = Math.round(43 + row * 40 + row * row * stretch)
      for (let dy = 0; dy < 34; dy++) for (let dx = 0; dx < 34; dx++) {
        const x = x0 + dx, y = y0 + dy
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        data.set([245, 250, 195, 255], (y * width + x) * 4)
      }
    }
    return { data, width, height }
  }
  const scattered: [number, number][] = []
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) scattered.push([row, col])
  scattered.push([8, 2], [9, 2], [10, 2], [12, 2], [9, 5], [10, 5], [11, 5])

  it('同一块砖换个位置，裁出来还要归成一组', () => {
    const width = 300, height = 300, data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) data.set([140, 85, 25, 255], i * 4)
    const spots: [number, number][] = [[20, 20], [150, 20], [20, 150], [150, 150]]
    spots.forEach(([x0, y0], index) => {
      const shift = index * 2
      for (let dy = 0; dy < 56; dy++) for (let dx = 0; dx < 56; dx++) {
        const x = x0 + dx + shift, y = y0 + dy
        if (x >= width || y >= height) continue
        const green = dy > 48
        const colour = green ? [120, 175, 70] : [245, 250, 195]
        data.set([colour[0], colour[1], colour[2], 255], (y * width + x) * 4)
      }
      // The same icon on every tile: a blue disc over a red bar.
      for (let dy = 12; dy < 30; dy++) for (let dx = 12; dx < 44; dx++) {
        const x = x0 + dx + shift, y = y0 + dy
        if (x >= width || y >= height) continue
        data.set([40, 80, 200, 255], (y * width + x) * 4)
      }
      for (let dy = 30; dy < 44; dy++) for (let dx = 20; dx < 36; dx++) {
        const x = x0 + dx + shift, y = y0 + dy
        if (x >= width || y >= height) continue
        data.set([200, 60, 60, 255], (y * width + x) * 4)
      }
    })
    const detection = detectBoard({ data, width, height })!
    expect(detection.cells).toHaveLength(4)
    // Every crop is one brick, framed the same way.
    const sides = detection.cells.map(cell => Math.min(cell.box.width, cell.box.height))
    expect(Math.max(...sides) - Math.min(...sides)).toBeLessThan(2)
    const ordered = [...detection.cells].sort((a, b) => a.row - b.row || a.col - b.col)
    const ids = classifyTiles(ordered.map(cell => cropCell({ data, width, height }, cell.box)), 26)
    expect(new Set(ids.filter(Boolean)).size).toBe(1)
  })
  it('先认出棋盘，再在棋盘上认砖块：天空和房子不会被当成砖', () => {
    // A phone screenshot: bright sky with a white house on top, the brown board below.
    const width = 480, height = 640, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const sky = y < 220
      const colour = sky ? [150, 205, 245] : [140, 85, 25]
      data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2]; data[i + 3] = 255
    }
    // The house: a big white blob well above the board.
    for (let y = 40; y < 180; y++) for (let x = 300; x < 440; x++) data.set([255, 255, 255, 255], (y * width + x) * 4)
    const tiles: TileBox[] = []
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x0 = 20 + col * 60, y0 = 250 + row * 60
      tiles.push({ x: x0, y: y0, width: 50, height: 50 })
    }
    for (const tile of tiles) {
      for (let dy = 0; dy < tile.height; dy++) for (let dx = 0; dx < tile.width; dx++) {
        if (dx > tile.width * 0.45 && dx < tile.width * 0.8 && dy > tile.height * 0.2 && dy < tile.height * 0.8) continue
        const colour = dy > tile.height * 0.85 ? [120, 175, 70] : [245, 250, 195]
        data.set([colour[0], colour[1], colour[2], 255], ((tile.y + dy) * width + tile.x + dx) * 4)
      }
    }
    const detection = detectBoard({ data, width, height })!
    expect(detection.rows).toBe(4)
    expect(detection.cols).toBe(4)
    expect(detection.cells).toHaveLength(16)
    // The grid must stay on the board, not reach up into the sky.
    expect(detection.grid.y).toBeGreaterThan(200)
    expect(detection.cells.every(cell => cell.box.y > 200)).toBe(true)
  })
  it('被眩光糊掉的砖，靠棋盘格子补回来', () => {
    const width = 300, height = 300, data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) data.set([140, 85, 25, 255], i * 4)
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x0 = 20 + col * 60, y0 = 20 + row * 60
      for (let dy = 0; dy < 50; dy++) for (let dx = 0; dx < 50; dx++) {
        if (dx > 22 && dx < 38 && dy > 10 && dy < 40) continue
        data.set(dy > 42 ? [120, 175, 70, 255] : [245, 250, 195, 255], ((y0 + dy) * width + x0 + dx) * 4)
      }
    }
    // A glare spot swallows part of the brick at row 1 column 1, so the blob pass loses it.
    for (let y = 70; y < 140; y++) for (let x = 70; x < 140; x++) {
      if (Math.hypot(x - 105, y - 105) > 18) continue
      data.set([255, 255, 255, 255], (y * width + x) * 4)
    }
    const detection = detectBoard({ data, width, height })!
    expect(detection.rows).toBe(4)
    expect(detection.cols).toBe(4)
    expect(detection.cells.map(cell => `${cell.row},${cell.col}`).sort()).toEqual(
      Array.from({ length: 16 }, (_, index) => `${Math.floor(index / 4)},${index % 4}`).sort(),
    )
  })
  it('稀疏棋盘每块砖都拿到自己的格子，行列不因空白被压扁', () => {
    const detection = detectBoard(renderWarped(scattered, 0.3))!
    expect(detection.rows).toBe(13)
    expect(detection.cols).toBe(6)
    expect(detection.cells).toHaveLength(scattered.length)
    // The layout keeps every brick's own row and column, gaps included.
    const got = detection.cells.map(cell => `${cell.row},${cell.col}`).sort()
    expect(got).toEqual(scattered.map(([row, col]) => `${row},${col}`).sort())
  })
  it('被直线网格判为离群的砖块，也会填进相邻的空格', () => {
    // One brick sits clearly off the line the others follow, the way distortion pushes a
    // brick out; it still belongs to the board.
    const width = 240, height = 240, data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) data.set([140, 85, 25, 255], i * 4)
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x0 = 20 + col * 50, y0 = 20 + row * 50 + (row === 1 && col === 2 ? 11 : 0)
      for (let dy = 0; dy < 44; dy++) for (let dx = 0; dx < 44; dx++) data.set([245, 250, 195, 255], ((y0 + dy) * width + x0 + dx) * 4)
    }
    const detection = detectBoard({ data, width, height })!
    expect(detection.rows).toBe(4)
    expect(detection.cols).toBe(4)
    expect(detection.cells).toHaveLength(16)
  })
  it('相邻砖块连成一片时按缝隙切开，不丢砖块', () => {
    // A 4x4 board whose tiles touch vertically in the middle column.
    const width = 220, height = 220, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const col = Math.floor((x - 20) / 45), row = Math.floor((y - 20) / 45)
      const px = (x - 20) % 45, py = (y - 20) % 45
      const touching = col === 1 && row > 0
      const inside = row >= 0 && row < 4 && col >= 0 && col < 4 && px < 40 && py < 40 && (touching || (py >= 3 || px >= 3))
      data.set(inside ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * width + x) * 4)
    }
    const detection = detectBoard({ data, width, height })!
    expect(detection.rows).toBe(4)
    expect(detection.cols).toBe(4)
    expect(detection.cells).toHaveLength(16)
  })
  it('只有一行砖块时不会产出无效坐标', () => {
    const width = 300, height = 120, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const col = Math.floor((x - 20) / 50), px = (x - 20) % 50, py = (y - 30) % 50
      const inside = col >= 0 && col < 4 && y >= 30 && y < 70 && px >= 3 && px < 43 && py >= 3 && py < 33
      data.set(inside ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * width + x) * 4)
    }
    const detection = detectBoard({ data, width, height })
    if (detection) {
      expect(Number.isFinite(detection.grid.x)).toBe(true)
      expect(Number.isFinite(detection.grid.width)).toBe(true)
      expect(Number.isFinite(detection.quad.topLeft.x)).toBe(true)
      expect(detection.cols).toBeGreaterThanOrEqual(3)
    }
  })
  it('倾斜照片也能定位行列，校正后不再需要拉正', () => {
    const tilted = render(undefined, 4)
    const detection = detectBoard(tilted)!
    expect(detection.rows).toBe(14)
    expect(detection.cols).toBe(10)
    expect(needsRectification(detection)).toBe(true)
    const straight = detectBoard(rectifyPerspective(tilted, detection.quad, 420, 560))!
    expect(needsRectification(straight)).toBe(false)
    expect(straight.rows).toBe(14)
    expect(straight.cols).toBe(10)
  })
  it('稀疏摆放时给每块砖标注正确行列，跨度按空格补齐', () => {
    const cells: [number, number][] = [[0, 0], [0, 1], [1, 1], [2, 0], [9, 8], [13, 9]]
    const detection = detectBoard(render(cells))!
    expect(detection.rows).toBe(14)
    expect(detection.cols).toBe(10)
    expect(detection.cells.map(cell => [cell.row, cell.col]))
      .toEqual(expect.arrayContaining(cells.map(([row, col]) => [row, col])))
    expect(detection.cells).toHaveLength(cells.length)
  })
})

describe('拉正与边框', () => {
  it('四角向外扩出边距，避免裁掉最外一列砖', () => {
    const quad = { topLeft: { x: 10, y: 20 }, topRight: { x: 110, y: 20 }, bottomRight: { x: 110, y: 220 }, bottomLeft: { x: 10, y: 220 } }
    const grown = expandQuad(quad, 0.05)
    expect(grown.topLeft).toEqual({ x: 5, y: 10 })
    expect(grown.bottomRight).toEqual({ x: 115, y: 230 })
  })
  it('拉正时越界像素按边缘延展，不留透明空洞', () => {
    const width = 20, height = 20, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(x < 10 ? [220, 40, 40, 255] : [40, 60, 220, 255], (y * width + x) * 4)
    const rectified = rectifyPerspective({ data, width, height }, { topLeft: { x: -6, y: -6 }, topRight: { x: 26, y: -6 }, bottomRight: { x: 26, y: 26 }, bottomLeft: { x: -6, y: 26 } }, 32, 32)
    const transparent = []
    for (let i = 3; i < rectified.data.length; i += 4) if (rectified.data[i] !== 255) transparent.push(i)
    expect(transparent).toHaveLength(0)
    expect(Array.from(rectified.data.slice(0, 3))).toEqual([220, 40, 40])
  })
})

describe('按砖块边缘切割', () => {
  it('纯白眩光没有绿色底边，不算砖块', () => {
    const data = new Uint8ClampedArray(48 * 48 * 4)
    for (let i = 0; i < data.length; i += 4) data.set([255, 255, 255, 255], i)
    expect(isTileCandidate({ data, width: 48, height: 48 }, { x: 0, y: 0, width: 48, height: 48 })).toBe(false)
  })
  it.each([[65, 70, 35], [50, 150, 50]])('底边颜色 %j 比背景更暗或总亮度相同时仍保留完整厚度', (...shadow) => {
    const width = 64, height = 64, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let colour = [140, 85, 25, 255]
      if (x >= 10 && x < 50 && y >= 8 && y < 54) {
        colour = y >= 44 ? [...shadow, 255] : [185, 180, 100, 255]
        if (x >= 12 && x < 48 && y >= 10 && y < 44) colour = [245, 250, 195, 255]
      }
      data.set(colour, (y * width + x) * 4)
    }
    expect(findTileBounds({ data, width, height })).toEqual({ x: 10, y: 8, width: 40, height: 46 })
  })
  it('补充检测不能把近邻细条的离开边缘当成自己的外缘', () => {
    const width = 64, height = 64, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const face = y >= 8 && y < 54 && ((x >= 10 && x < 50) || (x >= 55 && x < 60))
      data.set(face ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * width + x) * 4)
    }
    expect(findTileBounds({ data, width, height })).toEqual({ x: 10, y: 8, width: 40, height: 46 })
  })
  it('裁剪保留整块砖的暗色边框和底部厚度，不只截取亮色砖面', () => {
    const width = 64, height = 64, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let colour = [140, 85, 25, 255]
      if (x >= 10 && x < 50 && y >= 8 && y < 54) {
        colour = y >= 44 ? [100, 155, 60, 255] : [185, 180, 100, 255]
        if (x >= 12 && x < 48 && y >= 10 && y < 44) colour = [245, 250, 195, 255]
      }
      data.set(colour, (y * width + x) * 4)
    }
    const tile = trimTile({ data, width, height })!
    expect([tile.width, tile.height]).toEqual([40, 46])
    expect(Array.from(tile.data.slice(-4))).toEqual([100, 155, 60, 255])
    // A manual cell is a seed-search area; its line must not cut the bottom bevel.
    expect(findTileBounds({ data, width, height }, { x: 6, y: 6, width: 48, height: 44 })).toEqual({ x: 10, y: 8, width: 40, height: 46 })
    data.set([255, 255, 255, 255], (20 * width + 49) * 4)
    expect(findTileBounds({ data, width, height })).toEqual({ x: 10, y: 8, width: 40, height: 46 })
  })
  it('邻砖露出的一小条亮边不会并入当前砖的裁剪框', () => {
    const width = 64, height = 64, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const face = (x >= 10 && x < 48 && y >= 8 && y < 54) || (x >= 61 && y >= 8 && y < 54)
      data.set(face ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * width + x) * 4)
    }
    const tile = trimTile({ data, width, height })!
    expect([tile.width, tile.height]).toEqual([38, 46])
  })
  it('偏心的砖块被裁到自己的边缘，纯背景格返回空', () => {
    const size = 40, data = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const tile = x >= 12 && x < 36 && y >= 6 && y < 30
      data.set(tile ? [245, 250, 195, 255] : [140, 85, 25, 255], (y * size + x) * 4)
    }
    const trimmed = trimTile({ data, width: size, height: size })!
    expect(trimmed.width).toBe(24)
    expect(trimmed.height).toBe(24)
    expect(Array.from(trimmed.data.slice(0, 3))).toEqual([245, 250, 195])
    const board = { data: new Uint8ClampedArray(Array.from({ length: size * size }, () => [140, 85, 25, 255]).flat()), width: size, height: size }
    expect(trimTile(board)).toBeNull()
  })
})

describe('完整砖块外缘定位', () => {
  it('密集的10列14行棋盘按连通背景区分缝隙和大面积绿色底边', () => {
    const width = 460, height = 644, data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const px = x % 46, py = y % 46
      let colour = [140, 85, 25, 255]
      if (px < 44 && py < 44) {
        colour = py >= 36 ? [100, 155, 60, 255] : [185, 180, 100, 255]
        if (px >= 2 && px < 42 && py >= 2 && py < 36) colour = [245, 250, 195, 255]
      }
      data.set(colour, (y * width + x) * 4)
    }
    const image = { data, width, height }, found = detectBoard(image)!
    expect(found.cells).toHaveLength(140)
    expect(found.cells.find(cell => cell.row === 1 && cell.col === 1)?.box).toEqual({ x: 46, y: 46, width: 44, height: 44 })
    expect(findTileBounds(image, { x: 46, y: 46, width: 46, height: 46 })).toEqual({ x: 46, y: 46, width: 44, height: 44 })
  })
  function edgeBoard(scale = 1) {
    const width = 360 * scale, height = 400 * scale, data = new Uint8ClampedArray(width * height * 4)
    const bricks = [
      { x: 20, y: 20, width: 40, height: 44 }, { x: 100, y: 20, width: 36, height: 42 },
      { x: 20, y: 100, width: 42, height: 46 }, { x: 100, y: 100, width: 38, height: 40 },
    ]
    for (let i = 0; i < width * height; i++) data.set([140, 85, 25, 255], i * 4)
    for (const brick of bricks) for (let y = 0; y < brick.height * scale; y++) for (let x = 0; x < brick.width * scale; x++) {
      const face = x >= 2 * scale && x < (brick.width - 2) * scale && y >= 2 * scale && y < (brick.height - 8) * scale
      const colour = face ? [245, 250, 195, 255] : y >= (brick.height - 8) * scale ? [100, 155, 60, 255] : [185, 180, 100, 255]
      data.set(colour, ((brick.y * scale + y) * width + brick.x * scale + x) * 4)
    }
    return { data, width, height }
  }
  it('每块砖使用自己的四条外缘，稀疏网格不会把砖框放大成格子', () => {
    const found = detectBoard(edgeBoard())!
    expect(found).not.toBeNull()
    const cells = [...found.cells].sort((a, b) => a.row - b.row || a.col - b.col)
    expect(cells.map(cell => cell.box)).toEqual([
      { x: 20, y: 20, width: 40, height: 44 }, { x: 100, y: 20, width: 36, height: 42 },
      { x: 20, y: 100, width: 42, height: 46 }, { x: 100, y: 100, width: 38, height: 40 },
    ])
  })
  it('大图缩小定位后回原图细化边缘，坐标不因缩放丢失边框', () => {
    const found = detectBoard(edgeBoard(3))!
    expect(found).not.toBeNull()
    const cell = found.cells.find(cell => cell.row === 0 && cell.col === 0)!
    expect(cell.box).toEqual({ x: 60, y: 60, width: 120, height: 132 })
  })
  it('砖块紧邻时保留底部厚度，靠图片边缘的框不会越界', () => {
    const width = 100, height = 100, data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) data.set([140, 85, 25, 255], i * 4)
    for (const y0 of [0, 48]) for (const x0 of [0, 46]) {
      for (let y = 0; y < 46; y++) for (let x = 0; x < 44; x++) {
        const face = x >= 2 && x < 42 && y >= 2 && y < 38
        data.set(face ? [245, 250, 195, 255] : y >= 38 ? [100, 155, 60, 255] : [185, 180, 100, 255], ((y0 + y) * width + x0 + x) * 4)
      }
    }
    const found = detectBoard({ data, width, height })!
    expect(found.cells.find(cell => cell.row === 0 && cell.col === 0)?.box).toEqual({ x: 0, y: 0, width: 44, height: 46 })
    expect(found.cells.every(({ box }) => box.x >= 0 && box.y >= 0 && box.x + box.width <= 100 && box.y + box.height <= 100)).toBe(true)
  })
})

describe('透视点选取', () => {
  it('三点按顺时针推算第四角，四点直接采用', () => {
    const quad = quadFromPoints([{ x: 10, y: 20 }, { x: 210, y: 24 }, { x: 208, y: 224 }])!
    expect([quad.topLeft, quad.topRight, quad.bottomRight]).toEqual([{ x: 10, y: 20 }, { x: 210, y: 24 }, { x: 208, y: 224 }])
    expect(quad.bottomLeft.x).toBeCloseTo(8, 5)
    expect(quad.bottomLeft.y).toBeCloseTo(220, 5)
    const explicit = quadFromPoints([{ x: 10, y: 20 }, { x: 210, y: 24 }, { x: 208, y: 224 }, { x: 6, y: 218 }])!
    expect(explicit.bottomLeft).toEqual({ x: 6, y: 218 })
    expect(quadFromPoints([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toBeNull()
    expect(quadFromPoints([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }])).toBeNull()
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

// Borderline grouping: only ask the user where the score is too close to the limit to be sure.
describe('分组复核', () => {
  const flat = (pair: number, other = 90) => (a: number, b: number) => Math.abs(a - b) === 1 ? pair : other
  const gate = () => 26
  it('相似但没过线的两组会问要不要合并', () => {
    const items = reviewGrouping([[1, 2]], flat(28), gate)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'merge', groupA: 1, groupB: 2, score: 28, limit: 26 })
    expect(items[0].a).toEqual({ row: 0, col: 0 })
    expect(items[0].b).toEqual({ row: 0, col: 1 })
  })
  it('差得远、正好到线或空格的组合都不打扰', () => {
    expect(reviewGrouping([[1, 2]], flat(60), gate)).toEqual([])
    expect(reviewGrouping([[1, 2]], flat(26), gate)).toEqual([])
    expect(reviewGrouping([[1, 2]], () => Infinity, gate)).toEqual([])
  })
  it('奇数图案里刚过线的一对会问是不是同一图案', () => {
    // Three bricks in one group: the pair (0, 2) is the weakest at 22 against a limit of 26.
    const distance = (a: number, b: number) => (Math.min(a, b) === 0 && Math.max(a, b) === 2 ? 22 : 4)
    const items = reviewGrouping([[1, 1, 1]], distance, gate)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'split', groupA: 1, count: 3, score: 22, limit: 26 })
    expect(items[0].b).toEqual({ row: 0, col: 2 })
  })
  it('数量是双数、只有一块或分数差得远的奇数图案都不问', () => {
    const weak = (a: number, b: number) => (a === 0 && b === 1 ? 22 : 3)
    expect(reviewGrouping([[1, 1]], weak, gate)).toEqual([])
    expect(reviewGrouping([[1]], weak, gate)).toEqual([])
    expect(reviewGrouping([[1, 1, 1]], () => 3, gate)).toEqual([])
    // Two odd groups far apart must not turn into a merge question either.
    expect(reviewGrouping([[1, 2, 2]], () => 70, gate)).toEqual([])
  })
})

// A reflection: bright enough to read as a tile, and it hides whatever sits under it.
describe('反光', () => {
  const size = 40
  const brick = (options: { icon?: boolean; radius?: number; cx?: number; cy?: number } = {}) => {
    const data = new Uint8ClampedArray(size * size * 4)
    const { icon = true, radius = 0, cx = 0.3, cy = -0.3 } = options
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let colour: number[] = x < 2 || y < 2 || x >= size - 2 || y >= size - 2 ? [185, 180, 100] : [245, 250, 195]
      const u = (x - size / 2) / size, v = (y - size / 2) / size
      if (icon) {
        // A fork: handle, shoulder and three tines.
        if (Math.abs(u) < 0.045 && v > -0.05 && v < 0.42) colour = [150, 95, 50]
        if (Math.abs(u) < 0.22 && v > 0.3 && v < 0.42) colour = [120, 125, 130]
        for (const tine of [-0.16, 0, 0.16]) if (Math.abs(u - tine) < 0.035 && v > 0.12 && v < 0.32) colour = [120, 125, 130]
      }
      if (radius > 0) {
        // A reflection clips towards white, the way a screen overexposes under a light.
        const d = Math.hypot(u - cx, v - cy) / radius
        if (d < 1) colour = colour.map(channel => Math.min(255, channel * (1 + 0.4 * Math.pow(1 - d, 0.5))))
      }
      data.set([...colour.map(Math.round), 255], (y * size + x) * 4)
    }
    return { data, width: size, height: size }
  }
  it('反光扫过整格、又没有图标时不算图案', () => {
    // The detector traces the bright spot as a cell; without this it became a pattern of its own.
    const clean = brick()
    expect(classifyTiles([clean, brick({ icon: false })], 26)).toEqual([1, 0])
    expect(classifyTiles([clean, brick({ icon: false, radius: 0.5, cx: 0.2, cy: 0.1 })], 26)).toEqual([1, 0])
  })
  it('被反光整体烧白的格子不算图案', () => {
    const clean = brick()
    const washed = { data: new Uint8ClampedArray(size * size * 4).fill(255), width: size, height: size }
    expect(classifyTiles([clean, washed], 26)).toEqual([1, 0])
  })
  it('反光落在砖块旁边而不是图标上时，还是同一个图案', () => {
    const clean = brick()
    const beside = brick({ radius: 0.35, cx: 0.5, cy: 0.5 })
    const corner = brick({ radius: 0.15, cx: 0.45, cy: -0.45 })
    expect(classifyTiles([clean, beside, corner], 26)).toEqual([1, 1, 1])
  })
})
