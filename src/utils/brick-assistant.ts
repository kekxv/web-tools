export type Board = number[][]
export interface Cell { row: number; col: number }
export type Direction = 'right' | 'down' | 'left' | 'up'
export interface ShiftedTile { from: Cell; to: Cell; id: number }
export interface Push { direction: Direction; distance: number; tiles: ShiftedTile[] }
// from is the dragged tile's original position; path is the final straight elimination.
export interface Move { from: Cell; to: Cell; path: Cell[]; push?: Push }
export interface Pixels { data: Uint8ClampedArray; width: number; height: number }
export interface Grid { x: number; y: number; width: number; height: number; rows: number; cols: number }
const vectors: Record<Direction, [number, number]> = { right: [0, 1], down: [1, 0], left: [0, -1], up: [-1, 0] }
const directions = Object.values(vectors)
const inside = (board: Board, p: Cell) => Number.isInteger(p.row) && Number.isInteger(p.col) && p.row >= 0 && p.row < board.length && p.col >= 0 && p.col < board[0].length
function straight(board: Board, a: Cell, b: Cell): boolean {
  if (!inside(board, a) || !inside(board, b) || (a.row === b.row && a.col === b.col) || (a.row !== b.row && a.col !== b.col)) return false
  if (!board[a.row][a.col] || board[a.row][a.col] !== board[b.row][b.col]) return false
  const dr = Math.sign(b.row - a.row), dc = Math.sign(b.col - a.col)
  for (let r = a.row + dr, c = a.col + dc; r !== b.row || c !== b.col; r += dr, c += dc) if (board[r][c]) return false
  return true
}
function targets(board: Board, from: Cell): Cell[] {
  const result: Cell[] = []
  for (const [dr, dc] of directions) {
    for (let row = from.row + dr, col = from.col + dc; inside(board, { row, col }); row += dr, col += dc) {
      if (!board[row][col]) continue
      if (board[row][col] === board[from.row][from.col]) result.push({ row, col })
      break
    }
  }
  return result
}
function pushState(board: Board) {
  const cols = board[0].length
  return { board: board.map(row => [...row]), origins: board.map((row, r) => row.map((id, c) => id ? r * cols + c : -1)) }
}
// The movable group is fixed at pointer-down. A tile beyond the first gap is a wall.
function chainLength(board: Board, from: Cell, direction: Direction): number {
  const [dr, dc] = vectors[direction]
  let count = 0
  while (inside(board, { row: from.row + dr * count, col: from.col + dc * count }) && board[from.row + dr * count][from.col + dc * count]) count++
  return count
}
function step(state: ReturnType<typeof pushState>, from: Cell, direction: Direction, length: number): boolean {
  const [dr, dc] = vectors[direction]
  const end = { row: from.row + dr * length, col: from.col + dc * length }
  if (!inside(state.board, end) || state.board[end.row][end.col]) return false
  for (let row = end.row, col = end.col; row !== from.row || col !== from.col; row -= dr, col -= dc) {
    state.board[row][col] = state.board[row - dr][col - dc]
    state.origins[row][col] = state.origins[row - dr][col - dc]
  }
  state.board[from.row][from.col] = 0; state.origins[from.row][from.col] = -1
  return true
}
function shiftedTiles(state: ReturnType<typeof pushState>): ShiftedTile[] {
  const cols = state.board[0].length, result: ShiftedTile[] = []
  state.origins.forEach((row, r) => row.forEach((origin, c) => {
    if (origin >= 0 && origin !== r * cols + c) result.push({ from: { row: Math.floor(origin / cols), col: origin % cols }, to: { row: r, col: c }, id: state.board[r][c] })
  }))
  return result.sort((a, b) => a.from.row - b.from.row || a.from.col - b.from.col)
}
export function pushTiles(board: Board, from: Cell, direction: Direction, distance: number): { board: Board; tiles: ShiftedTile[] } {
  if (!inside(board, from) || !board[from.row][from.col] || !vectors[direction] || !Number.isInteger(distance) || distance < 1 || distance > Math.max(board.length, board[0].length)) throw new Error('无效的推动操作')
  const state = pushState(board), [dr, dc] = vectors[direction], length = chainLength(board, from, direction)
  for (let i = 0; i < distance; i++) if (!step(state, { row: from.row + dr * i, col: from.col + dc * i }, direction, length)) throw new Error('推动被障碍或棋盘外框阻挡')
  return { board: state.board, tiles: shiftedTiles(state) }
}
export function findMoves(board: Board): Move[] {
  if (!board.length || !board[0].length) return []
  const moves: Move[] = [], counts = new Map<number, number>(), cols = board[0].length
  board.flat().forEach(id => { if (id) counts.set(id, (counts.get(id) ?? 0) + 1) })
  board.forEach((row, r) => row.forEach((id, c) => {
    if (!id || counts.get(id)! < 2) return
    const from = { row: r, col: c }
    for (const to of targets(board, from)) if (r * cols + c < to.row * cols + to.col) moves.push({ from, to, path: [from, to] })
    for (const direction of Object.keys(vectors) as Direction[]) {
      const state = pushState(board), [dr, dc] = vectors[direction], length = chainLength(board, from, direction)
      for (let distance = 1; ; distance++) {
        if (!step(state, { row: r + dr * (distance - 1), col: c + dc * (distance - 1) }, direction, length)) break
        const landed = { row: r + dr * distance, col: c + dc * distance }
        // Eliminate the dragged tile against a stationary matching tile, never an unrelated old pair.
        for (const to of targets(state.board, landed)) {
          if (state.origins[to.row][to.col] !== to.row * cols + to.col) continue
          moves.push({ from, to, path: [landed, to], push: { direction, distance, tiles: shiftedTiles(state) } })
        }
      }
    }
  }))
  return moves.sort((a, b) => (a.push?.distance ?? 0) - (b.push?.distance ?? 0) || (a.push?.tiles.length ?? 0) - (b.push?.tiles.length ?? 0))
}
export function applyMove(board: Board, move: Move): Board {
  const pushed = move.push ? pushTiles(board, move.from, move.push.direction, move.push.distance) : null
  const result = pushed ? pushed.board : board.map(row => [...row])
  const [dr, dc] = move.push ? vectors[move.push.direction] : [0, 0]
  const landed = { row: move.from.row + dr * (move.push?.distance ?? 0), col: move.from.col + dc * (move.push?.distance ?? 0) }
  if (pushed && JSON.stringify(pushed.tiles) !== JSON.stringify(move.push!.tiles)) throw new Error('棋盘已变化，请重新计算')
  if (move.path.length !== 2 || move.path[0].row !== landed.row || move.path[0].col !== landed.col || move.path[1].row !== move.to.row || move.path[1].col !== move.to.col || !straight(result, landed, move.to)) throw new Error('无法消除：需在框内直线相连且中间无障碍')
  result[landed.row][landed.col] = result[move.to.row][move.to.col] = 0
  return result
}

const pale = (r: number, g: number, b: number) => r > 175 && g > 180 && b > 95 && g > r * 0.85 && (r + g > b * 2.35 || (b > 210 && Math.max(r, g, b) - Math.min(r, g, b) < 35))

// Compare aligned icon crops against a fixed representative, avoiding transitive cluster drift.
export function classifyTiles(tiles: Pixels[], threshold: number): number[] {
  const representatives: number[][] = []
  return tiles.map(tile => {
    let background = 0
    const feature: number[] = []
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const px = Math.min(tile.width - 1, Math.floor((0.12 + x / 16 * 0.76) * tile.width))
      const py = Math.min(tile.height - 1, Math.floor((0.12 + y / 16 * 0.76) * tile.height))
      const i = (py * tile.width + px) * 4
      const [r, g, b] = tile.data.slice(i, i + 3)
      if (pale(r, g, b)) background++
      feature.push(r, g, b)
    }
    if (background < 256 * 0.14) return 0
    let best = -1, distance = Infinity
    representatives.forEach((other, index) => {
      let squared = 0, samples = 0
      for (let i = 0; i < feature.length; i += 3) {
        if (pale(feature[i], feature[i + 1], feature[i + 2]) && pale(other[i], other[i + 1], other[i + 2])) continue
        for (let channel = 0; channel < 3; channel++) squared += (feature[i + channel] - other[i + channel]) ** 2
        samples += 3
      }
      const rms = samples ? Math.sqrt(squared / samples) : 0
      if (rms < distance) { distance = rms; best = index }
    })
    if (distance <= threshold) return best + 1
    representatives.push(feature)
    return representatives.length
  })
}

export function detectGrid(image: Pixels): Grid | null {
  const { width, height, data } = image
  const visited = new Uint8Array(width * height)
  const parts: { x: number; y: number; w: number; h: number }[] = []
  for (let start = 0; start < visited.length; start++) {
    if (visited[start]) continue
    visited[start] = 1
    if (!pale(data[start * 4], data[start * 4 + 1], data[start * 4 + 2])) continue
    const queue = [start]
    let left = width, right = 0, top = height, bottom = 0
    for (let k = 0; k < queue.length; k++) {
      const p = queue[k], x = p % width, y = Math.floor(p / width)
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy, n = ny * width + nx
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited[n]) continue
        visited[n] = 1
        if (pale(data[n * 4], data[n * 4 + 1], data[n * 4 + 2])) queue.push(n)
      }
    }
    const w = right - left + 1, h = bottom - top + 1
    if (w >= 12 && h >= 12 && w / h > 0.65 && w / h < 1.45 && queue.length > w * h * 0.18) parts.push({ x: left, y: top, w, h })
  }
  if (parts.length < 4) return null
  // Use the most common size, so unrelated pale UI panels do not expand the board.
  const typical = [...parts].sort((a, b) => parts.filter(p => Math.abs(p.w - b.w) < b.w * 0.18).length - parts.filter(p => Math.abs(p.w - a.w) < a.w * 0.18).length)[0]
  const tiles = parts.filter(p => Math.abs(p.w - typical.w) < typical.w * 0.2 && Math.abs(p.h - typical.h) < typical.h * 0.2)
  if (tiles.length < 4) return null
  // Border thickness changes the pale region's top-left corner. Fit tile centers
  // across all rows/columns instead of accumulating gaps between those corners.
  const fitAxis = (values: number[], tileSize: number) => {
    const sorted = [...values].sort((a, b) => a - b)
    const clusters: number[][] = []
    for (const value of sorted) {
      const last = clusters[clusters.length - 1]
      if (!last || value - last[0] > tileSize * 0.45) clusters.push([value])
      else last.push(value)
    }
    const centers = clusters.map(cluster => cluster.reduce((sum, v) => sum + v, 0) / cluster.length)
    const gaps = centers.slice(1).map((v, i) => v - centers[i]).filter(gap => gap > tileSize * 0.7 && gap < tileSize * 1.6).sort((a, b) => a - b)
    const estimate = gaps.length ? gaps[Math.floor(gaps.length / 2)] : tileSize + 2
    const indices = centers.map(v => Math.round((v - centers[0]) / estimate))
    const meanI = indices.reduce((sum, v) => sum + v, 0) / indices.length
    const meanX = centers.reduce((sum, v) => sum + v, 0) / centers.length
    const variance = indices.reduce((sum, i) => sum + (i - meanI) ** 2, 0)
    const pitch = variance ? centers.reduce((sum, v, i) => sum + (indices[i] - meanI) * (v - meanX), 0) / variance : estimate
    return { origin: meanX - pitch * meanI - pitch / 2, pitch, count: Math.max(...indices) + 1 }
  }
  const horizontal = fitAxis(tiles.map(p => p.x + p.w / 2), typical.w)
  const vertical = fitAxis(tiles.map(p => p.y + p.h / 2), typical.h)
  const cols = horizontal.count, rows = vertical.count
  if (cols > 24 || rows > 24) return null
  const x = Math.max(0, horizontal.origin), y = Math.max(0, vertical.origin)
  return { x, y, width: Math.min(width, horizontal.origin + cols * horizontal.pitch) - x,
    height: Math.min(height, vertical.origin + rows * vertical.pitch) - y, rows, cols }
}

export interface Point { x: number; y: number }
export interface Quad { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }

function solveHomography(matrix: number[][], values: number[]): number[] | null {
  const a = matrix.map((row, i) => [...row, values[i]])
  for (let col = 0; col < values.length; col++) {
    let pivot = col
    for (let row = col + 1; row < values.length; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
    if (Math.abs(a[pivot][col]) < 1e-10) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    const divisor = a[col][col]
    for (let j = col; j <= values.length; j++) a[col][j] /= divisor
    for (let row = 0; row < values.length; row++) if (row !== col) {
      const factor = a[row][col]
      for (let j = col; j <= values.length; j++) a[row][j] -= factor * a[col][j]
    }
  }
  return a.map(row => row[values.length])
}

/** Rectify a board quadrilateral into a front-facing canvas. The input points are clockwise. */
export function rectifyPerspective(source: Pixels, quad: Quad, outputWidth = 800, outputHeight = 800): Pixels {
  const corners = quadToPairs(quad), destination = [{ x: 0, y: 0 }, { x: outputWidth - 1, y: 0 }, { x: outputWidth - 1, y: outputHeight - 1 }, { x: 0, y: outputHeight - 1 }]
  // Solve the inverse mapping (rectified pixel -> source pixel), so every output
  // pixel can be sampled directly. Parallelograms are singular in the projective
  // system; the bilinear fallback still handles that common three-point case.
  const matrix: number[][] = [], valuesX: number[] = [], valuesY: number[] = []
  destination.forEach((point, i) => {
    const u = point.x, v = point.y, x = corners[i].x, y = corners[i].y
    matrix.push([u, v, 1, 0, 0, 0, -x * u, -x * v]); valuesX.push(x)
    matrix.push([0, 0, 0, u, v, 1, -y * u, -y * v]); valuesY.push(y)
  })
  const hx = solveHomography(matrix.map(row => [...row]), valuesX), hy = solveHomography(matrix.map(row => [...row]), valuesY)
  const data = new Uint8ClampedArray(outputWidth * outputHeight * 4)
  const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  for (let v = 0; v < outputHeight; v++) for (let u = 0; u < outputWidth; u++) {
    let point: Point
    if (hx && hy) {
      const denominator = hx[6] * u + hx[7] * v + 1
      point = { x: (hx[0] * u + hx[1] * v + hx[2]) / denominator, y: (hy[0] * u + hy[1] * v + hy[2]) / denominator }
    } else {
      const tx = outputWidth === 1 ? 0 : u / (outputWidth - 1), ty = outputHeight === 1 ? 0 : v / (outputHeight - 1)
      point = lerp(lerp(quad.topLeft, quad.topRight, tx), lerp(quad.bottomLeft, quad.bottomRight, tx), ty)
    }
    const sx = Math.round(point.x), sy = Math.round(point.y), out = (v * outputWidth + u) * 4
    if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) continue
    const input = (sy * source.width + sx) * 4
    data.set(source.data.slice(input, input + 4), out)
  }
  return { data, width: outputWidth, height: outputHeight }
}
function quadToPairs(quad: Quad): Point[] { return [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft] }
