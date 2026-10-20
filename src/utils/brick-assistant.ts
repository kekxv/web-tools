import { findTileBounds, isTileCandidate, tileBackground, tileSearchRegion, traceTileEdges } from './brick-edges'

export { findTileBounds, isTileCandidate } from './brick-edges'
export type Board = number[][]
export interface Cell { row: number; col: number }
export type Direction = 'right' | 'down' | 'left' | 'up'
export interface ShiftedTile { from: Cell; to: Cell; id: number }
export interface Push { direction: Direction; distance: number; tiles: ShiftedTile[] }
// from is the dragged tile's original position; path is the final straight elimination.
export interface Move { from: Cell; to: Cell; path: Cell[]; push?: Push }
export interface Pixels { data: Uint8ClampedArray; width: number; height: number }
export interface Grid { x: number; y: number; width: number; height: number; rows: number; cols: number }
export interface Point { x: number; y: number }
export interface Quad { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
export interface TileBox { x: number; y: number; width: number; height: number }
/** A tile outline placed on the board: what the overlay draws as a virtual border. */
export interface TileRect extends TileBox { row: number; col: number }
/** A detected tile together with the board cell the lattice assigns it to. */
export interface DetectedCell { row: number; col: number; box: TileBox }
/** Result of analysing a screenshot or photo: the tile lattice and its outline. */
export interface Detection { grid: Grid; quad: Quad; rows: number; cols: number; tilt: number; tiles: TileBox[]; cells: DetectedCell[]; confidence: number; framed?: boolean; face?: [number, number, number] }
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

// ── 砖块检测 ────────────────────────────────────────────────────────────────
// Screenshots and hand-held photos differ in exposure, white balance and tilt, so
// nothing here may rely on one fixed colour or an axis-aligned board.

const ANALYSIS_LIMIT = 640
const MAX_LINES = 24
const MIN_TILES = 4
const INK_THRESHOLD = 26
const BLANK_RATIO = 0.07
// A cell that is mostly one colour with a stray line (a UI arrow, a glare streak) is empty.
const SOLID_RATIO = 0.05
const FEATURE_SIZE = 24

interface Component { x: number; y: number; width: number; height: number; area: number }

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** Box-average to at most `limit` px on the long side: faster and noise tolerant. */
function downscale(image: Pixels, limit: number): { pixels: Pixels; scale: number } {
  const scale = Math.min(1, limit / Math.max(image.width, image.height))
  if (scale >= 1) return { pixels: image, scale: 1 }
  const width = Math.max(16, Math.round(image.width * scale)), height = Math.max(16, Math.round(image.height * scale))
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * image.height / height), y1 = Math.max(y0 + 1, Math.floor((y + 1) * image.height / height))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * image.width / width), x1 = Math.max(x0 + 1, Math.floor((x + 1) * image.width / width))
      let r = 0, g = 0, b = 0, count = 0
      for (let sy = y0; sy < y1; sy++) for (let sx = x0; sx < x1; sx++) {
        const i = (sy * image.width + sx) * 4
        r += image.data[i]; g += image.data[i + 1]; b += image.data[i + 2]; count++
      }
      const o = (y * width + x) * 4
      data[o] = r / count; data[o + 1] = g / count; data[o + 2] = b / count; data[o + 3] = 255
    }
  }
  return { pixels: { data, width, height }, scale }
}

// The pale tile face is much brighter than the board. Exposure and white balance
// move that cut-off, so several candidates are tried and the best lattice wins.
function tileThresholds(image: Pixels): number[] {
  const { data, width, height } = image
  const histogram = new Uint32Array(256)
  const total = width * height
  for (let i = 0, p = 0; i < total; i++, p += 4) histogram[Math.min(data[p], data[p + 1], data[p + 2])]++
  const percentile = (fraction: number) => {
    let seen = 0
    for (let value = 0; value < 256; value++) { seen += histogram[value]; if (seen >= total * fraction) return value }
    return 255
  }
  const values = new Set([120, 145, 170, 195])
  for (const fraction of [0.8, 0.9, 0.96]) values.add(percentile(fraction))
  return [...values].filter(value => value >= 60 && value <= 246).sort((a, b) => a - b)
}

function components(mask: Uint8Array, width: number, height: number): Component[] {
  const seen = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const parts: Component[] = []
  for (let start = 0; start < mask.length; start++) {
    if (seen[start] || !mask[start]) continue
    let head = 0, tail = 0
    queue[tail++] = start; seen[start] = 1
    let left = width, right = -1, top = height, bottom = -1
    while (head < tail) {
      const p = queue[head++], x = p % width, y = (p - x) / width
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; queue[tail++] = p - 1 }
      if (x < width - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; queue[tail++] = p + 1 }
      if (y > 0 && mask[p - width] && !seen[p - width]) { seen[p - width] = 1; queue[tail++] = p - width }
      if (y < height - 1 && mask[p + width] && !seen[p + width]) { seen[p + width] = 1; queue[tail++] = p + width }
    }
    parts.push({ x: left, y: top, width: right - left + 1, height: bottom - top + 1, area: tail })
  }
  return parts
}

/**
 * Tiles that touch each other merge into one blob. Cut such a blob into tile-sized
 * pieces along the darkest seam, which is the gap or the drop shadow between tiles.
 */
function splitPart(image: Pixels, part: Component, side: number): Component[] {
  const columns = Math.max(1, Math.round(part.width / side))
  const rows = Math.max(1, Math.round(part.height / side))
  if (columns * rows <= 1) return [part]
  const cuts = (count: number, start: number, length: number, axis: 'x' | 'y') => {
    const edges = [start]
    for (let index = 1; index < count; index++) {
      const expected = Math.round(start + length * index / count)
      let best = expected, darkest = Infinity
      const reach = Math.max(2, Math.round(length / count * 0.22))
      for (let at = Math.max(start + 1, expected - reach); at <= Math.min(start + length - 2, expected + reach); at++) {
        let sum = 0
        if (axis === 'x') {
          for (let y = part.y; y < part.y + part.height; y++) { const i = (y * image.width + at) * 4; sum += image.data[i] + image.data[i + 1] + image.data[i + 2] }
        } else {
          for (let x = part.x; x < part.x + part.width; x++) { const i = (at * image.width + x) * 4; sum += image.data[i] + image.data[i + 1] + image.data[i + 2] }
        }
        if (sum < darkest) { darkest = sum; best = at }
      }
      edges.push(best)
    }
    edges.push(start + length)
    return edges
  }
  const vertical = cuts(columns, part.x, part.width, 'x'), horizontal = cuts(rows, part.y, part.height, 'y')
  const pieces: Component[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    const width = vertical[c + 1] - vertical[c], height = horizontal[r + 1] - horizontal[r]
    if (width < 4 || height < 4) continue
    pieces.push({ x: vertical[c], y: horizontal[r], width, height, area: width * height })
  }
  return pieces
}

/** Keep square-ish blobs whose size matches the most common tile size. */
function tileSizeGroups(parts: Component[]): { boxes: Component[]; side: number } {
  let side = median(parts.map(part => (part.width + part.height) / 2))
  let boxes = parts
  for (let pass = 0; pass < 3; pass++) {
    const next = parts.filter(part => Math.abs(part.width - side) < side * 0.3 && Math.abs(part.height - side) < side * 0.3)
    if (next.length < MIN_TILES) return { boxes: [], side }
    boxes = next
    const refined = median(boxes.map(part => (part.width + part.height) / 2))
    if (Math.abs(refined - side) < 0.35) { side = refined; break }
    side = refined
  }
  const widths = boxes.map(part => part.width), heights = boxes.map(part => part.height)
  return { boxes, side: Math.max(median(widths), median(heights)) }
}

// Assign every tile a line number. Tiles are clustered into lines first, then the
// lines are numbered by walking them, so empty rows/columns and the slow pitch drift
// of a photo do not shift every later line by one.
function assignLines(values: number[], side: number): number[] | null {
  const sorted = [...values].sort((a, b) => a - b)
  const clusters: number[][] = []
  for (const value of sorted) {
    const last = clusters[clusters.length - 1]
    if (!last || value - last[0] > side * 0.45) clusters.push([value])
    else last.push(value)
  }
  if (clusters.length < 2) return null
  const centers = clusters.map(cluster => cluster.reduce((sum, value) => sum + value, 0) / cluster.length)
  // Lens and perspective distortion stretch the spacing across the board, so the step
  // between neighbouring lines follows the local spacing, capped near the tightest one so
  // detection jitter cannot invent rows.
  const raw = centers.slice(1).map((value, index) => value - centers[index])
  const tightest = raw.filter(gap => gap > side * 0.7 && gap < side * 1.6).sort((a, b) => a - b)
  const base = tightest.length ? tightest[Math.floor(tightest.length / 2)] : side
  const steps = raw.map((_, index) => {
    const window = raw.slice(Math.max(0, index - 3), index).filter(value => value > side * 0.7 && value < side * 2.8).sort((a, b) => a - b)
    const local = window.length ? window[Math.floor(window.length / 2)] : base
    return Math.max(base, Math.min(local, base * 1.25))
  })
  const lineIndices = [0]
  for (let index = 1; index < centers.length; index++) {
    lineIndices.push(lineIndices[index - 1] + Math.max(1, Math.round(raw[index - 1] / steps[index - 1])))
  }
  return values.map(value => {
    let best = 0, smallest = Infinity
    centers.forEach((center, index) => {
      const spread = Math.abs(value - center)
      if (spread < smallest) { smallest = spread; best = index }
    })
    return lineIndices[best]
  })
}

/** Where a cell sits on the board, interpolated inside the board quad (works for tilted photos). */
function cellRect(quad: Quad, rows: number, cols: number, row: number, col: number): TileBox {
  const mix = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  const corner = (u: number, v: number) => mix(mix(quad.topLeft, quad.topRight, u), mix(quad.bottomLeft, quad.bottomRight, u), v)
  const points = [corner(col / cols, row / rows), corner((col + 1) / cols, row / rows), corner((col + 1) / cols, (row + 1) / rows), corner(col / cols, (row + 1) / rows)]
  if (!points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) return { x: 0, y: 0, width: 0, height: 0 }
  const left = Math.min(...points.map(point => point.x)), top = Math.min(...points.map(point => point.y))
  return {
    x: left, y: top,
    width: Math.max(...points.map(point => point.x)) - left,
    height: Math.max(...points.map(point => point.y)) - top,
  }
}

/**
 * A brick may sit a little off its cell, but its outline must not reach into a neighbour or into
 * the board frame. Traced outlines grow outward from a bright face and have nothing stopping them
 * on the edge of the board, which used to pull in the frame and the glare.
 */
function fitToCell(box: TileBox, cell: TileBox, slack: number): TileBox {
  if (!(cell.width > 0 && cell.height > 0)) return box
  const left = Math.max(box.x, cell.x - slack), top = Math.max(box.y, cell.y - slack)
  const right = Math.min(box.x + box.width, cell.x + cell.width + slack), bottom = Math.min(box.y + box.height, cell.y + cell.height + slack)
  if (right - left < 4 || bottom - top < 4) return box
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Dominant rotation of the tile lattice, measured from neighbouring tile pairs. */
function latticeAngle(centers: Point[], pitch: number): number {
  const horizontal: number[] = [], vertical: number[] = []
  for (let i = 0; i < centers.length; i++) for (let j = i + 1; j < centers.length; j++) {
    const dx = centers[j].x - centers[i].x, dy = centers[j].y - centers[i].y
    if (Math.hypot(dx, dy) > pitch * 1.5) continue
    if (Math.abs(dx) > Math.abs(dy) * 2) horizontal.push(Math.atan2(dy, dx))
    else if (Math.abs(dy) > Math.abs(dx) * 2) vertical.push(Math.atan2(dy, dx) - Math.PI / 2)
  }
  const wrap = (value: number) => Math.atan2(Math.sin(value), Math.cos(value))
  const angles = [...horizontal, ...vertical].map(wrap)
  return angles.length ? median(angles) : 0
}

interface Pair { u: number; v: number; x: number; y: number; index: number }

function solveLinear(matrix: number[][], values: number[]): number[] | null {
  const size = values.length
  const rows = matrix.map((row, index) => [...row, values[index]])
  for (let col = 0; col < size; col++) {
    let pivot = col
    for (let row = col + 1; row < size; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row
    if (Math.abs(rows[pivot][col]) < 1e-10) return null
    ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
    const divisor = rows[col][col]
    for (let j = col; j <= size; j++) rows[col][j] /= divisor
    for (let row = 0; row < size; row++) if (row !== col) {
      const factor = rows[row][col]
      for (let j = col; j <= size; j++) rows[row][j] -= factor * rows[col][j]
    }
  }
  return rows.map(row => row[size])
}

// Least squares fit of a projective map (col,row) -> image point. A homography is
// what makes tilted photos work: the board is rarely a perfect rectangle.
function fitHomography(pairs: Pair[]): number[] | null {
  if (pairs.length < 4) return null
  const normal = Array.from({ length: 8 }, () => new Array(9).fill(0))
  for (const { u, v, x, y } of pairs) {
    const equations = [[u, v, 1, 0, 0, 0, -x * u, -x * v, x], [0, 0, 0, u, v, 1, -y * u, -y * v, y]]
    for (const equation of equations) {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) normal[i][j] += equation[i] * equation[j]
        normal[i][8] += equation[i] * equation[8]
      }
    }
  }
  const solved = solveLinear(normal.map(row => row.slice(0, 8)), normal.map(row => row[8]))
  if (!solved || !solved.every(Number.isFinite)) return null
  // A near-singular fit (all tiles on one line) yields huge coefficients; test it and
  // fall back to an affine mapping, which is always solvable for three tiles.
  if (!pairs.every(({ u, v, x, y }) => { const point = applyHomography(solved, u, v); return Number.isFinite(point.x) && Number.isFinite(point.y) && Math.abs(point.x - x) < 1e4 && Math.abs(point.y - y) < 1e4 })) return null
  return solved
}

/** Affine fallback: rotation, scale and shear are enough when four corners are degenerate. */
function fitAffine(pairs: Pair[]): number[] | null {
  if (pairs.length < 3) return null
  const normal = Array.from({ length: 6 }, () => new Array(7).fill(0))
  for (const { u, v, x, y } of pairs) {
    for (const [target, base] of [[x, [u, v, 1, 0, 0, 0]], [y, [0, 0, 0, u, v, 1]]] as [number, number[]][]) {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) normal[i][j] += base[i] * base[j]
        normal[i][6] += base[i] * target
      }
    }
  }
  const solved = solveLinear(normal.map(row => row.slice(0, 6)), normal.map(row => row[6]))
  return solved && solved.every(Number.isFinite) ? [...solved, 0, 0] : null
}

function applyHomography(transform: number[], u: number, v: number): Point {
  const denominator = transform[6] * u + transform[7] * v + 1
  return { x: (transform[0] * u + transform[1] * v + transform[2]) / denominator, y: (transform[3] * u + transform[4] * v + transform[5]) / denominator }
}

interface Lattice { rows: number; cols: number; quad: Quad; pitch: number; tilt: number; error: number; matched: number; cells: { row: number; col: number; index: number }[] }

/** Fit a rotated/projective lattice over the detected tile boxes. */
function fitLattice(boxes: Component[], board?: TileBox | null): Lattice | null {
  if (boxes.length < MIN_TILES) return null
  const centers = boxes.map(box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }))
  const side = median(boxes.map(box => (box.width + box.height) / 2))
  const nearest = centers.map((center, index) => {
    let closest = Infinity
    centers.forEach((other, otherIndex) => {
      if (otherIndex !== index) closest = Math.min(closest, Math.hypot(center.x - other.x, center.y - other.y))
    })
    return closest
  })
  const pitch = median(nearest)
  if (!(pitch > side * 0.75 && pitch < side * 2.4)) return null
  const angle = latticeAngle(centers, pitch)
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const projected = centers.map(center => ({ u: center.x * cos + center.y * sin, v: -center.x * sin + center.y * cos, x: center.x, y: center.y }))
  const columnIndices = assignLines(projected.map(point => point.u), side)
  const rowIndices = assignLines(projected.map(point => point.v), side)
  if (!columnIndices || !rowIndices) return null
  if (Math.max(...columnIndices) + 1 > MAX_LINES || Math.max(...rowIndices) + 1 > MAX_LINES) return null
  // Indices are integers: cell (col,row) spans col..col+1, so its centre is +0.5.
  const raw = projected.map((point, index) => ({ u: columnIndices[index], v: rowIndices[index], x: point.x, y: point.y, index }))
  const minU = Math.min(...raw.map(pair => pair.u)), minV = Math.min(...raw.map(pair => pair.v))
  const pairs = raw.map(pair => ({ ...pair, u: pair.u - minU, v: pair.v - minV }))
  const lift = (pair: Pair): Pair => ({ ...pair, u: pair.u + 0.5, v: pair.v + 0.5 })
  let transform = fitHomography(pairs.map(lift)) ?? fitAffine(pairs.map(lift))
  if (!transform) return null
  // Drop detections that do not sit on the lattice (glare, icons, UI panels). This only
  // decides which bricks the lattice is *fitted* on; every brick is placed below.
  let inliers = pairs, error = 0
  for (let pass = 0; pass < 4; pass++) {
    const distances = inliers.map(pair => {
      const point = applyHomography(transform!, pair.u + 0.5, pair.v + 0.5)
      return Math.hypot(point.x - pair.x, point.y - pair.y)
    })
    error = median(distances)
    const limit = Math.max(2, error * 3)
    const kept = inliers.filter((_, index) => distances[index] <= limit)
    if (kept.length === inliers.length) break
    const refit = kept.length >= MIN_TILES ? fitHomography(kept.map(lift)) ?? fitAffine(kept.map(lift)) : null
    if (!refit) break
    transform = refit; inliers = kept
  }
  if (inliers.length < MIN_TILES) return null
  // The fitted board keeps the bricks that agree with it; the ones it had to leave out
  // (a brick pushed off the straight lines by lens distortion) still get a cell of their
  // own if there is a free one next to them. A brick is never thrown away while the board
  // has room for it.
  const residual = (pair: Pair, u: number, v: number) => {
    const point = applyHomography(transform!, u + 0.5, v + 0.5)
    return Math.hypot(point.x - pair.x, point.y - pair.y)
  }
  const cells = new Map<string, { row: number; col: number; index: number; x: number; y: number; distance: number }>()
  for (const pair of inliers) cells.set(`${pair.u},${pair.v}`, { row: pair.v, col: pair.u, index: pair.index, x: pair.x, y: pair.y, distance: residual(pair, pair.u, pair.v) })
  let minCol = Math.min(...inliers.map(pair => pair.u)), maxCol = Math.max(...inliers.map(pair => pair.u))
  let minRow = Math.min(...inliers.map(pair => pair.v)), maxRow = Math.max(...inliers.map(pair => pair.v))
  for (const pair of pairs) {
    if (inliers.includes(pair)) continue
    let bestU = 0, bestV = 0, bestDistance = Infinity
    for (let dv = -2; dv <= 2; dv++) for (let du = -2; du <= 2; du++) {
      const u = pair.u + du, v = pair.v + dv
      if (cells.has(`${u},${v}`)) continue
      // Stay inside board cells or extend the board by one line at most.
      // Off the straight lines but still on the board: any free cell will do.
      if (board) {
        const point = applyHomography(transform!, u + 0.5, v + 0.5)
        if (point.x < board.x || point.x > board.x + board.width || point.y < board.y || point.y > board.y + board.height) continue
      } else if (u < minCol - 1 || u > maxCol + 1 || v < minRow - 1 || v > maxRow + 1) continue
      const candidate = residual(pair, u, v)
      if (candidate < bestDistance) { bestDistance = candidate; bestU = u; bestV = v }
    }
    if (bestDistance > pitch * 0.55) continue
    cells.set(`${bestU},${bestV}`, { row: bestV, col: bestU, index: pair.index, x: pair.x, y: pair.y, distance: bestDistance })
    minCol = Math.min(minCol, bestU); maxCol = Math.max(maxCol, bestU)
    minRow = Math.min(minRow, bestV); maxRow = Math.max(maxRow, bestV)
  }
  const active = [...cells.values()]
  if (active.length < MIN_TILES) return null
  const cols = maxCol - minCol + 1, rows = maxRow - minRow + 1
  if (cols < 1 || rows < 1 || cols > MAX_LINES || rows > MAX_LINES) return null
  const quad: Quad = {
    topLeft: applyHomography(transform, minCol, minRow), topRight: applyHomography(transform, maxCol + 1, minRow),
    bottomRight: applyHomography(transform, maxCol + 1, maxRow + 1), bottomLeft: applyHomography(transform, minCol, maxRow + 1),
  }
  // Anything non-finite here would poison the crop box further down the pipeline.
  if (![quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft].every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) return null
  if (!Number.isFinite(pitch) || pitch <= 0) return null
  return {
    rows, cols, pitch, tilt: angle * 180 / Math.PI, error: error / pitch, matched: active.length,
    cells: active.map(cell => ({ row: cell.row - minRow, col: cell.col - minCol, index: cell.index })),
    quad,
  }
}

/**
 * The board comes first: a big, flat, evenly coloured area that the bricks sit on. Finding it
 * keeps sky, scenery and UI panels from being taken for bricks.
 */
function boardRegion(image: Pixels, width: number, height: number, parts: Component[]): (TileBox & { quad?: Quad }) | null {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    const i = (y * width + x) * 4
    const key = ((image.data[i] >> 4) << 8) | ((image.data[i + 1] >> 4) << 4) | (image.data[i + 2] >> 4)
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    bucket.count += 1
    bucket.r += image.data[i]; bucket.g += image.data[i + 1]; bucket.b += image.data[i + 2]
    buckets.set(key, bucket)
  }
  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  let best: { box: TileBox & { quad?: Quad }; score: number } | null = null
  for (const bucket of ranked) {
    const r = bucket.r / bucket.count, g = bucket.g / bucket.count, b = bucket.b / bucket.count
    // A board is a coloured surface; white paper or a washed out photo is not.
    if (Math.min(r, g, b) > 225) continue
    const mask = new Uint8Array(width * height)
    for (let i = 0, p = 0; i < width * height; i++, p += 4) {
      if (Math.abs(image.data[p] - r) < 42 && Math.abs(image.data[p + 1] - g) < 42 && Math.abs(image.data[p + 2] - b) < 42) mask[i] = 1
    }
    const region = components(mask, width, height).reduce<Component | null>((largest, part) => !largest || part.area > largest.area ? part : largest, null)
    if (!region || region.area < width * height * 0.1) continue
    // A board is a filled rectangle, not a scattering of same coloured specks.
    if (region.area < region.width * region.height * 0.5) continue
    const box = { x: region.x, y: region.y, width: region.width, height: region.height }
    const inside = parts.filter(part => {
      const x = part.x + part.width / 2, y = part.y + part.height / 2
      return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
    }).length
    // The board is the surface that carries the bricks.
    if (inside < MIN_TILES) continue
    const quad = enclosedQuad(mask, width, height, box) ?? undefined
    if (!best || inside > best.score || (inside === best.score && quad && !best.box.quad)) best = { box: { ...box, quad }, score: inside }
  }
  return best ? best.box : null
}

/** Fit supported straight inner edges; cropped or non-rectangular surfaces are ambiguous. */
function enclosedQuad(mask: Uint8Array, width: number, height: number, box: TileBox): Quad | null {
  if (box.x < 2 || box.y < 2 || box.x + box.width > width - 2 || box.y + box.height > height - 2) return null
  const fit = (vertical: boolean, far: boolean): number[] | null => {
    const start = vertical ? box.y : box.x, span = vertical ? box.height : box.width
    const normal = vertical ? box.x : box.y, length = vertical ? box.width : box.height
    const points: [number, number][] = []
    for (let t = Math.ceil(start + span * 0.2); t < start + span * 0.8; t++) {
      for (let n = 0; n < length; n++) {
        const at = far ? normal + length - 1 - n : normal + n
        if (mask[vertical ? t * width + at : at * width + t]) { points.push([t, at + (far ? 1 : 0)]); break }
      }
    }
    if (points.length < span * 0.5) return null
    const solve = (samples: [number, number][]) => solveLinear([
      [samples.reduce((s, p) => s + p[0] ** 2, 0), samples.reduce((s, p) => s + p[0], 0)],
      [samples.reduce((s, p) => s + p[0], 0), samples.length],
    ], [samples.reduce((s, p) => s + p[0] * p[1], 0), samples.reduce((s, p) => s + p[1], 0)])
    let line = solve(points)
    if (!line) return null
    const kept = points.filter(([t, n]) => Math.abs(n - line![0] * t - line![1]) < 2)
    if (kept.length < points.length * 0.85) return null
    line = solve(kept)
    return line
  }
  const left = fit(true, false), right = fit(true, true), top = fit(false, false), bottom = fit(false, true)
  if (!left || !right || !top || !bottom) return null
  const cross = (v: number[], h: number[]): Point => {
    const x = (v[0] * h[1] + v[1]) / (1 - v[0] * h[0])
    return { x, y: h[0] * x + h[1] }
  }
  const quad = { topLeft: cross(left, top), topRight: cross(right, top), bottomRight: cross(right, bottom), bottomLeft: cross(left, bottom) }
  if (!Object.values(quad).every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 1 && p.y >= 1 && p.x < width - 1 && p.y < height - 1)) return null
  return quad
}

/** Confirm that the inner frame contains an integral grid aligned with observed bricks. */
function frameLattice(lattice: Lattice, boxes: Component[], quad: Quad): Lattice | null {
  const corners = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  const targets = [[0, 0], [1, 0], [1, 1], [0, 1]]
  const inverse = fitHomography(corners.map((p, index) => ({ u: p.x, v: p.y, x: targets[index][0], y: targets[index][1], index })))
  if (!inverse) return null
  const mapped = lattice.cells.map(cell => {
    const box = boxes[cell.index]
    return { ...cell, point: applyHomography(inverse, box.x + box.width / 2, box.y + box.height / 2) }
  })
  const count = (axis: 'x' | 'y', key: 'col' | 'row') => {
    const steps: number[] = []
    for (let i = 0; i < mapped.length; i++) for (let j = i + 1; j < mapped.length; j++) {
      const a = mapped[i], b = mapped[j], other = key === 'col' ? 'row' : 'col'
      if (a[other] === b[other] && a[key] !== b[key]) steps.push(Math.abs((a.point[axis] - b.point[axis]) / (a[key] - b[key])))
    }
    const pitch = median(steps), result = Math.round(1 / pitch)
    return result >= 2 && result <= MAX_LINES && Math.abs(result * pitch - 1) < 0.07 ? result : 0
  }
  const cols = count('x', 'col'), rows = count('y', 'row')
  if (!rows || !cols || rows < lattice.rows || cols < lattice.cols) return null
  const cells = mapped.map(cell => ({ row: Math.floor(cell.point.y * rows), col: Math.floor(cell.point.x * cols), index: cell.index }))
  if (cells.some((cell, i) => cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols ||
    Math.abs(mapped[i].point.x * cols - cell.col - 0.5) > 0.22 || Math.abs(mapped[i].point.y * rows - cell.row - 0.5) > 0.22)) return null
  if (new Set(cells.map(c => `${c.row},${c.col}`)).size !== cells.length) return null
  return { ...lattice, rows, cols, quad, cells }
}

/** The face colour of a brick: the colour that covers most of the detected bricks. */
function faceColour(image: Pixels, boxes: Component[]): [number, number, number] {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (const box of boxes) {
    const step = Math.max(1, Math.round(Math.min(box.width, box.height) / 14))
    for (let y = box.y + box.height * 0.15; y < box.y + box.height * 0.85; y += step) {
      for (let x = box.x + box.width * 0.15; x < box.x + box.width * 0.85; x += step) {
        const sx = Math.round(x), sy = Math.round(y)
        if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) continue
        const i = (sy * image.width + sx) * 4
        const key = ((image.data[i] >> 4) << 8) | ((image.data[i + 1] >> 4) << 4) | (image.data[i + 2] >> 4)
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
        bucket.count += 1
        bucket.r += image.data[i]; bucket.g += image.data[i + 1]; bucket.b += image.data[i + 2]
        buckets.set(key, bucket)
      }
    }
  }
  let best: { count: number; r: number; g: number; b: number } | null = null
  for (const bucket of buckets.values()) if (!best || bucket.count > best.count) best = bucket
  if (!best || best.count < 12) return [245, 250, 195]
  return [best.r / best.count, best.g / best.count, best.b / best.count]
}

/** Bounding box of the pixels of a cell that carry the brick face colour, if a brick fits. */
/**
 * A glare spot or a lit patch of the board: brighter than a brick face of this board and yet
 * carrying almost none of that face colour. A brick in shadow fails the share test too, but it is
 * darker than the face, so it is kept.
 */
function isGlare(image: Pixels, box: TileBox, face: [number, number, number]): boolean {
  if (faceShare(image, box, face) >= 0.25) return false
  const left = Math.max(0, Math.floor(box.x + box.width * 0.2)), top = Math.max(0, Math.floor(box.y + box.height * 0.2))
  const right = Math.min(image.width, Math.ceil(box.x + box.width * 0.8)), bottom = Math.min(image.height, Math.ceil(box.y + box.height * 0.8))
  if (right - left < 4 || bottom - top < 4) return false
  let sum = 0, count = 0
  for (let y = top; y < bottom; y += 2) for (let x = left; x < right; x += 2) {
    const i = (y * image.width + x) * 4
    sum += image.data[i] + image.data[i + 1] + image.data[i + 2]
    count++
  }
  const brightness = count ? sum / count / 3 : 0
  return brightness > (face[0] + face[1] + face[2]) / 3 + 12
}

/** How much of a box has the brick face colour of this board: bricks cover most of theirs, glare does not. */
export function faceShare(image: Pixels, box: TileBox, face: [number, number, number], tolerance = 48): number {
  const left = Math.max(0, Math.floor(box.x)), top = Math.max(0, Math.floor(box.y))
  const right = Math.min(image.width, Math.ceil(box.x + box.width)), bottom = Math.min(image.height, Math.ceil(box.y + box.height))
  if (right <= left || bottom <= top) return 0
  let hits = 0, total = 0
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const i = (y * image.width + x) * 4
    total++
    if (Math.abs(image.data[i] - face[0]) > tolerance || Math.abs(image.data[i + 1] - face[1]) > tolerance || Math.abs(image.data[i + 2] - face[2]) > tolerance) continue
    hits++
  }
  return total ? hits / total : 0
}

function faceBounds(image: Pixels, box: TileBox, face: [number, number, number], pitch: number): TileBox | null {
  const left = Math.max(0, Math.floor(box.x)), top = Math.max(0, Math.floor(box.y))
  const right = Math.min(image.width, Math.ceil(box.x + box.width)), bottom = Math.min(image.height, Math.ceil(box.y + box.height))
  if (right - left < 6 || bottom - top < 6) return null
  let minX = right, minY = bottom, maxX = left - 1, maxY = top - 1, hits = 0
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const i = (y * image.width + x) * 4
    if (Math.abs(image.data[i] - face[0]) > 48 || Math.abs(image.data[i + 1] - face[1]) > 48 || Math.abs(image.data[i + 2] - face[2]) > 48) continue
    hits++
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const area = (right - left) * (bottom - top)
  // A brick fills most of its cell; glare, a shadow or a lit patch does not cover one.
  if (hits < area * 0.45) return null
  const width = maxX - minX + 1, height = maxY - minY + 1
  if (width < 6 || height < 6) return null
  const ratio = width / height
  if (ratio < 0.55 || ratio > 1.8) return null
  // Validate coloured/grey bevel structure rather than a theme-specific hue.
  const outer = findTileBounds(image, box)
  if (!outer || !isTileCandidate(image, outer)) return null
  // The face is a brick, so it is about one pitch big and sits in the middle of the cell.
  if (width < pitch * 0.45 || width > pitch * 1.3) return null
  if (height < pitch * 0.45 || height > pitch * 1.3) return null
  const dx = (minX + maxX) / 2 - (left + right) / 2, dy = (minY + maxY) / 2 - (top + bottom) / 2
  if (Math.hypot(dx, dy) > pitch * 0.45) return null
  return { x: minX, y: minY, width, height }
}

function detectionAt(image: Pixels, threshold: number, confirmedFrame?: Quad): Detection | null {
  const { data, width, height } = image
  const mask = new Uint8Array(width * height)
  for (let i = 0, p = 0; i < width * height; i++, p += 4) mask[i] = Math.min(data[p], data[p + 1], data[p + 2]) >= threshold ? 1 : 0
  const minimum = Math.max(24, Math.round(width * height / 6000))
  const parts = components(mask, width, height).filter(part => {
    if (part.area < minimum || part.width < 8 || part.height < 8) return false
    if (part.area < part.width * part.height * 0.5) return false
    const ratio = part.width / part.height
    return ratio > 0.33 && ratio < 3
  })
  if (parts.length < MIN_TILES) return null
  // Board first, bricks second: only bright blobs standing on the board are bricks.
  const board = boardRegion(image, width, height, parts)
  const onBoard = board ? parts.filter(part => {
    const x = part.x + part.width / 2, y = part.y + part.height / 2
    return x >= board.x && x <= board.x + board.width && y >= board.y && y <= board.y + board.height
  }) : parts
  const scoped = onBoard.length >= MIN_TILES ? onBoard : parts
  // Lattice fitting is quadratic in the number of blobs; a photo of a desk can produce
  // thousands of bright specks. Keep the largest ones, which is where the tiles are.
  const candidates = scoped.length > 600 ? [...scoped].sort((a, b) => b.area - a.area).slice(0, 600) : scoped
  const rough = Math.max(6, median(candidates.map(part => Math.min(part.width, part.height))))
  const split = candidates.flatMap(part => splitPart(image, part, rough))
  if (split.length < MIN_TILES) return null
  const { boxes, side } = tileSizeGroups(split)
  if (boxes.length < MIN_TILES) return null
  if (side < 6) return null
  let lattice = fitLattice(boxes, board)
  if (!lattice || lattice.error > 0.35) return null
  const frame = confirmedFrame ?? board?.quad
  const framed = frame ? frameLattice(lattice, boxes, frame) : null
  if (framed) lattice = framed
  // Board first, bricks second: the cell the board predicts is checked for a brick face, so
  // a brick the blob pass missed (glare, a shadow, half a brick cut by the UI) is still found.
  const face = faceColour(image, boxes)
  const blobs = boxes.length
  // The brightness pass can read a glare spot on the board as a tile; it is brighter than the
  // brick face and covers none of it, while a brick in shadow is darker but still has its face.
  const cells = [...lattice.cells].filter(cell => !isGlare(image, boxes[cell.index], face))
  const taken = new Set(cells.map(cell => `${cell.row},${cell.col}`))
  for (let row = 0; row < lattice.rows; row++) for (let col = 0; col < lattice.cols; col++) {
    if (taken.has(`${row},${col}`)) continue
    const box = cellRect(lattice.quad, lattice.rows, lattice.cols, row, col)
    if (!box.width || !box.height) continue
    if (board && (box.x < board.x || box.y < board.y || box.x + box.width > board.x + board.width || box.y + box.height > board.y + board.height)) continue
    const found = faceBounds(image, box, face, lattice.pitch)
    if (!found) continue
    const index = boxes.length
    boxes.push({ ...found, area: found.width * found.height })
    cells.push({ row, col, index })
  }
  const coverage = cells.length / (lattice.rows * lattice.cols)
  const confidence = cells.length * (1 - Math.min(0.8, lattice.error * 2.5)) * (0.4 + 0.6 * Math.min(1, coverage * 2.5))
  // Sparse boards are allowed: four matching tiles already beat an empty board.
  if (confidence < 2) return null
  const corners = [lattice.quad.topLeft, lattice.quad.topRight, lattice.quad.bottomRight, lattice.quad.bottomLeft]
  let left = Math.max(0, Math.min(...corners.map(point => point.x)))
  let top = Math.max(0, Math.min(...corners.map(point => point.y)))
  let right = Math.min(width, Math.max(...corners.map(point => point.x)))
  let bottom = Math.min(height, Math.max(...corners.map(point => point.y)))
  // The board bounds the grid: no cell may reach past it.
  if (board) {
    left = Math.max(left, board.x); top = Math.max(top, board.y)
    right = Math.min(right, board.x + board.width); bottom = Math.min(bottom, board.y + board.height)
  }
  if (![left, top, right, bottom].every(Number.isFinite)) return null
  if (right - left < 8 || bottom - top < 8) return null
  return {
    grid: { x: left, y: top, width: right - left, height: bottom - top, rows: lattice.rows, cols: lattice.cols },
    quad: lattice.quad, rows: lattice.rows, cols: lattice.cols, tilt: lattice.tilt, framed: !!framed,
    tiles: boxes.slice(0, blobs).map(box => ({ x: box.x, y: box.y, width: box.width, height: box.height })),
    cells: cells.map(cell => ({ row: cell.row, col: cell.col, box: { x: boxes[cell.index].x, y: boxes[cell.index].y, width: boxes[cell.index].width, height: boxes[cell.index].height } })),
    confidence, face,
  }
}

/**
 * Locate the tile lattice in a screenshot or photo. Tiles are found by brightness
 * (their pale faces stand out from the board), then a rotated/projective lattice is
 * fitted to their centres. The best of several brightness cut-offs wins, so the same
 * code handles crisp screenshots and dim, tilted photos.
 */
export function detectBoard(image: Pixels, confirmedFrame?: Quad): Detection | null {
  if (!image.width || !image.height || image.data.length < image.width * image.height * 4) return null
  const analysis = downscale(image, ANALYSIS_LIMIT)
  const scaleCorner = (point: Point) => ({ x: point.x * analysis.pixels.width / image.width, y: point.y * analysis.pixels.height / image.height })
  const frame = confirmedFrame ? { topLeft: scaleCorner(confirmedFrame.topLeft), topRight: scaleCorner(confirmedFrame.topRight), bottomRight: scaleCorner(confirmedFrame.bottomRight), bottomLeft: scaleCorner(confirmedFrame.bottomLeft) } : undefined
  let best: Detection | null = null
  for (const threshold of tileThresholds(analysis.pixels)) {
    const detection = detectionAt(analysis.pixels, threshold, frame)
    if (detection && (!best || detection.confidence > best.confidence)) best = detection
  }
  if (!best) return null
  const lattice = best
  const scaleX = image.width / analysis.pixels.width, scaleY = image.height / analysis.pixels.height
  const scalePoint = (point: Point) => ({ x: point.x * scaleX, y: point.y * scaleY })
  const scaleBox = (box: TileBox): TileBox => ({ x: box.x * scaleX, y: box.y * scaleY, width: box.width * scaleX, height: box.height * scaleY })
  const seeds = lattice.cells.map(cell => ({ ...cell, box: scaleBox(cell.box) }))
  const faces = seeds.map(cell => cell.box)
  const grid = scaleBox(lattice.grid), margin = median(faces.map(box => Math.max(box.width, box.height)))
  const quad = { topLeft: scalePoint(lattice.quad.topLeft), topRight: scalePoint(lattice.quad.topRight), bottomRight: scalePoint(lattice.quad.bottomRight), bottomLeft: scalePoint(lattice.quad.bottomLeft) }
  const background = tileBackground(image, faces, { x: grid.x - margin, y: grid.y - margin, width: grid.width + margin * 2, height: grid.height + margin * 2 })
  const cells = seeds.map(cell => {
    const traced = traceTileEdges(image, cell.box, tileSearchRegion(image, cell.box, faces), background)
    return { ...cell, box: fitToCell(traced, cellRect(quad, lattice.rows, lattice.cols, cell.row, cell.col), margin * 0.12) }
  })
  return {
    ...lattice,
    grid: { ...scaleBox(lattice.grid), rows: lattice.rows, cols: lattice.cols },
    quad,
    tiles: cells.map(cell => cell.box), cells,
  }
}

/** Axis-aligned board rectangle; kept for callers that only need the crop box. */
export function detectGrid(image: Pixels): Grid | null {
  return detectBoard(image)?.grid ?? null
}

/** True when the fitted board is visibly rotated or keystoned and should be rectified. */
export function needsRectification(detection: Detection): boolean {
  const { topLeft, topRight, bottomRight, bottomLeft } = detection.quad
  const angle = (from: Point, to: Point) => Math.atan2(to.y - from.y, to.x - from.x)
  const wrap = (value: number) => Math.atan2(Math.sin(value), Math.cos(value))
  const top = angle(topLeft, topRight), bottom = angle(bottomLeft, bottomRight)
  const left = wrap(angle(topLeft, bottomLeft) - Math.PI / 2), right = wrap(angle(topRight, bottomRight) - Math.PI / 2)
  const rotation = Math.max(Math.abs(top), Math.abs(bottom), Math.abs(left), Math.abs(right)) * 180 / Math.PI
  const skew = Math.max(Math.abs(wrap(top - bottom)), Math.abs(wrap(left - right))) * 180 / Math.PI
  return rotation > 0.45 || skew > 0.9
}

/**
 * Cut a cell crop down to the tile it contains, using the brightness step between the
 * pale tile face and the board around it. Returns null when the cell is just board.
 */
export function trimTile(tile: Pixels): Pixels | null {
  const { data, width } = tile
  const box = findTileBounds(tile)
  if (!box) return null
  const { x: left, y: top, width: boxWidth, height: boxHeight } = box
  const out = new Uint8ClampedArray(boxWidth * boxHeight * 4)
  for (let y = 0; y < boxHeight; y++) for (let x = 0; x < boxWidth; x++) {
    const from = ((top + y) * width + left + x) * 4, to = (y * boxWidth + x) * 4
    for (let channel = 0; channel < 4; channel++) out[to + channel] = data[from + channel]
  }
  return { data: out, width: boxWidth, height: boxHeight }
}

// ── 图案分组 ────────────────────────────────────────────────────────────────
// Two bricks of one pattern never land on exactly the same pixels: the outline is traced per
// brick, the lighting differs and a glare spot or a neighbour sliver may sit in one crop only.
// The comparison therefore happens on the icon itself, after removing the tile border, and is
// tolerant of a small offset and of a few contaminated samples.
const BORDER_INSET = 0.14
const SHIFT = 1
const SHAPE_WEIGHT = 100
const STRUCTURE_WEIGHT = 70
const ASPECT_WEIGHT = 18
const COLOUR_WEIGHT = 0.5

interface TileSignature {
  pixels: Float32Array
  edges: Float32Array
  colour: [number, number, number]
  ink: number
  solid: number
  span: number
  aspect: number
  partial: boolean
  /** Share of the crop a reflection burned out to plain white: the brick is barely readable there. */
  glare: number
}

/** Area-average a rectangle of the tile into a square RGB sample. */
function sampleSquare(tile: Pixels, left: number, top: number, width: number, height: number): Float32Array {
  const size = FEATURE_SIZE, out = new Float32Array(size * size * 3)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const x0 = Math.floor(left + width * x / size), x1 = Math.max(x0 + 1, Math.floor(left + width * (x + 1) / size))
    const y0 = Math.floor(top + height * y / size), y1 = Math.max(y0 + 1, Math.floor(top + height * (y + 1) / size))
    let r = 0, g = 0, b = 0, count = 0
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
      if (px < 0 || py < 0 || px >= tile.width || py >= tile.height) continue
      const i = (py * tile.width + px) * 4
      r += tile.data[i]; g += tile.data[i + 1]; b += tile.data[i + 2]; count++
    }
    const o = (y * size + x) * 3
    out[o] = count ? r / count : 0
    out[o + 1] = count ? g / count : 0
    out[o + 2] = count ? b / count : 0
  }
  return out
}

/**
 * The flat colour the icon is drawn on. Icons fill the middle of a brick and the busiest ones
 * cover more than half of it, so the dominant colour is not reliable. The border of the sample is
 * plain face on every theme, so blocks along it are read and their median is taken: an icon that
 * reaches one block, or a sliver of board pulled into the crop, cannot move the estimate.
 */
function faceColor(sample: Float32Array): [number, number, number] {
  const block = Math.max(2, Math.round(FEATURE_SIZE * 0.18))
  const middle = Math.round((FEATURE_SIZE - block) / 2), far = FEATURE_SIZE - block
  const corners: number[][] = []
  for (const [startX, startY] of [[0, 0], [far, 0], [0, far], [far, far], [middle, 0], [middle, far], [0, middle], [far, middle]]) {
    const sum = [0, 0, 0]
    let count = 0
    for (let y = startY; y < startY + block; y++) for (let x = startX; x < startX + block; x++) {
      const index = y * FEATURE_SIZE + x
      const i = index * 3
      sum[0] += sample[i]; sum[1] += sample[i + 1]; sum[2] += sample[i + 2]; count++
    }
    if (count) corners.push([sum[0] / count, sum[1] / count, sum[2] / count])
  }
  if (!corners.length) return [0, 0, 0]
  const centre = [0, 1, 2].map(channel => {
    const values = corners.map(corner => corner[channel]).sort((a, b) => a - b)
    return values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2
  })
  // Average the flat samples around that colour: uneven light along the brick is measured here.
  const near = [0, 0, 0]
  let nearCount = 0
  for (let i = 0, index = 0; i < sample.length; i += 3, index++) {
    if (Math.abs(sample[i] - centre[0]) >= 24 || Math.abs(sample[i + 1] - centre[1]) >= 24 || Math.abs(sample[i + 2] - centre[2]) >= 24) continue
    near[0] += sample[i]; near[1] += sample[i + 1]; near[2] += sample[i + 2]; nearCount++
  }
  if (nearCount < FEATURE_SIZE * FEATURE_SIZE * 0.05) return centre as [number, number, number]
  return [0, 1, 2].map(channel => near[channel] / nearCount) as [number, number, number]
}

/** Largest 8-connected blob of a binary mask: a thin line cannot pass for a icon. */
function largestBlob(mask: Uint8Array): number {
  const seen = new Uint8Array(mask.length), size = FEATURE_SIZE
  let largest = 0
  for (let start = 0; start < mask.length; start++) {
    if (seen[start] || !mask[start]) continue
    let count = 0
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const index = stack.pop()!
      count++
      const x = index % size, y = (index - x) / size
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
        const next = ny * size + nx
        if (mask[next] && !seen[next]) { seen[next] = 1; stack.push(next) }
      }
    }
    if (count > largest) largest = count
  }
  return largest
}

/**
 * Where the icon's lines are, as opposed to what colour they are. A bell and a yellow pepper fill
 * the same yellow blob and match on colour, but one draws a rim and a clapper and the other draws
 * lobes and a stalk, so their edges point in different directions.
 */
function edgeMap(pixels: Float32Array): Float32Array {
  const size = FEATURE_SIZE, out = new Float32Array(size * size)
  const light = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= size ? size - 1 : x, cy = y < 0 ? 0 : y >= size ? size - 1 : y
    const i = (cy * size + cx) * 3
    return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
  }
  let total = 0
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = light(x + 1, y) - light(x - 1, y), gy = light(x, y + 1) - light(x, y - 1)
    const magnitude = Math.hypot(gx, gy)
    out[y * size + x] = magnitude
    total += magnitude
  }
  // Brightness and exposure scale every edge together; the pattern is in how they are spread.
  const mean = total / out.length
  if (mean > 1) for (let i = 0; i < out.length; i++) out[i] /= mean
  // Same icon on two bricks is never equally sharp (a scaled crop, a photo, a straightered scan),
  // so compare where the lines are rather than how crisp they are.
  const blurred = new Float32Array(out.length)
  const weights = [1, 2, 1]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let sum = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      sum += out[ny * size + nx] * weights[dx + 1] * weights[dy + 1]
    }
    blurred[y * size + x] = sum / 16
  }
  return blurred
}

/**
 * How much of a crop a reflection burned out. A brick face is light but still tinted, so only a
 * highlight that clipped to plain white counts - that is the spot the detector reads as a tile
 * and the matcher cannot read at all, while a bright brick must keep all of its pixels.
 */
const BURNED_OUT = (r: number, g: number, b: number) => Math.min(r, g, b) >= 246 && Math.max(r, g, b) - Math.min(r, g, b) <= 10
function signature(tile: Pixels): TileSignature {
  const traced = findTileBounds(tile)
  // A brick fills its cell, so a traced box that drifts far off the middle is the reflection or a
  // neighbour it latched onto, not the brick: the whole crop is the safer frame then.
  const drifted = !!traced && (Math.abs(traced.x + traced.width / 2 - tile.width / 2) > tile.width * 0.22 ||
    Math.abs(traced.y + traced.height / 2 - tile.height / 2) > tile.height * 0.22)
  const box = traced && !drifted ? traced : { x: 0, y: 0, width: tile.width, height: tile.height }
  // The brick's own bevel is a frame around every brick of every pattern: keeping it only adds
  // the noise of where the frame happened to be traced, so the comparison starts inside it.
  const left = box.x + box.width * BORDER_INSET, top = box.y + box.height * BORDER_INSET
  const sample = sampleSquare(tile, left, top, Math.max(1, box.width * (1 - BORDER_INSET * 2)), Math.max(1, box.height * (1 - BORDER_INSET * 2)))
  let glare = 0
  for (let i = 0; i < sample.length; i += 3) if (BURNED_OUT(sample[i], sample[i + 1], sample[i + 2])) glare++
  glare /= sample.length / 3
  const background = faceColor(sample)
  const delta = new Float32Array(sample.length)
  for (let i = 0; i < sample.length; i += 3) {
    delta[i] = sample[i] - background[0]; delta[i + 1] = sample[i + 1] - background[1]; delta[i + 2] = sample[i + 2] - background[2]
  }

  const mask = new Uint8Array(FEATURE_SIZE * FEATURE_SIZE)
  const colour: [number, number, number] = [0, 0, 0]
  let inked = 0, inkLeft = FEATURE_SIZE, inkTop = FEATURE_SIZE, inkRight = -1, inkBottom = -1
  for (let i = 0, index = 0; i < delta.length; i += 3, index++) {
    if (Math.max(Math.abs(delta[i]), Math.abs(delta[i + 1]), Math.abs(delta[i + 2])) < INK_THRESHOLD) continue
    mask[index] = 1; inked++
    colour[0] += delta[i]; colour[1] += delta[i + 1]; colour[2] += delta[i + 2]
    const x = index % FEATURE_SIZE, y = (index - x) / FEATURE_SIZE
    if (x < inkLeft) inkLeft = x
    if (x > inkRight) inkRight = x
    if (y < inkTop) inkTop = y
    if (y > inkBottom) inkBottom = y
  }
  if (inked) for (let c = 0; c < 3; c++) colour[c] /= inked
  const total = FEATURE_SIZE * FEATURE_SIZE
  if (!inked) return { pixels: delta, edges: edgeMap(delta), colour, ink: 0, solid: 0, span: 0, aspect: 1, partial: false, glare }
  const boxWidth = inkRight - inkLeft + 1, boxHeight = inkBottom - inkTop + 1
  // Resample the picture onto its own ink box: the same icon can sit at a slightly different
  // offset or scale on two bricks (a grid brick vs. a scaled-up free one), and this makes the
  // comparison blind to both.
  const pixels = new Float32Array(total * 3)
  const fetch = (x: number, y: number, channel: number) => {
    const sx = Math.min(FEATURE_SIZE - 1, Math.max(0, Math.round(x))), sy = Math.min(FEATURE_SIZE - 1, Math.max(0, Math.round(y)))
    return delta[(sy * FEATURE_SIZE + sx) * 3 + channel]
  }
  for (let y = 0; y < FEATURE_SIZE; y++) for (let x = 0; x < FEATURE_SIZE; x++) {
    const sx = inkLeft + (x + 0.5) * boxWidth / FEATURE_SIZE - 0.5, sy = inkTop + (y + 0.5) * boxHeight / FEATURE_SIZE - 0.5
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0, out = (y * FEATURE_SIZE + x) * 3
    for (let channel = 0; channel < 3; channel++) {
      const upper = fetch(x0, y0, channel) * (1 - fx) + fetch(x0 + 1, y0, channel) * fx
      const lower = fetch(x0, y0 + 1, channel) * (1 - fx) + fetch(x0 + 1, y0 + 1, channel) * fx
      pixels[out + channel] = upper * (1 - fy) + lower * fy
    }
  }
  // A picture cut by the edge of the frame is genuinely incomplete: comparisons with it get slack.
  const partial = inkLeft <= 0 || inkTop <= 0 || inkRight >= FEATURE_SIZE - 1 || inkBottom >= FEATURE_SIZE - 1
  return { pixels, edges: edgeMap(pixels), colour, ink: inked / total, solid: largestBlob(mask) / total, span: Math.min(boxWidth, boxHeight), aspect: boxWidth / boxHeight, partial, glare }
}

/** Correlation of two pictures at a small shift: framing noise cannot decide the group. */
function correlation(a: TileSignature, b: TileSignature, dx: number, dy: number): number {
  const means = [[0, 0, 0], [0, 0, 0]]
  let count = 0
  for (let y = 0; y < FEATURE_SIZE; y++) {
    const sy = y + dy
    if (sy < 0 || sy >= FEATURE_SIZE) continue
    for (let x = 0; x < FEATURE_SIZE; x++) {
      const sx = x + dx
      if (sx < 0 || sx >= FEATURE_SIZE) continue
      const i = (y * FEATURE_SIZE + x) * 3, j = (sy * FEATURE_SIZE + sx) * 3
      for (let c = 0; c < 3; c++) { means[0][c] += a.pixels[i + c]; means[1][c] += b.pixels[j + c] }
      count++
    }
  }
  if (count * 3 < FEATURE_SIZE) return 0
  for (let c = 0; c < 3; c++) { means[0][c] /= count; means[1][c] /= count }
  let dot = 0, energyA = 0, energyB = 0
  for (let y = 0; y < FEATURE_SIZE; y++) {
    const sy = y + dy
    if (sy < 0 || sy >= FEATURE_SIZE) continue
    for (let x = 0; x < FEATURE_SIZE; x++) {
      const sx = x + dx
      if (sx < 0 || sx >= FEATURE_SIZE) continue
      const i = (y * FEATURE_SIZE + x) * 3, j = (sy * FEATURE_SIZE + sx) * 3
      for (let c = 0; c < 3; c++) {
        const valueA = a.pixels[i + c] - means[0][c], valueB = b.pixels[j + c] - means[1][c]
        dot += valueA * valueB; energyA += valueA * valueA; energyB += valueB * valueB
      }
    }
  }
  return energyA > 0 && energyB > 0 ? dot / Math.sqrt(energyA * energyB) : 0
}

/** Correlation of two single-channel maps, allowing the same small shift as the colour pass. */
function mapCorrelation(a: Float32Array, b: Float32Array, dx: number, dy: number): number {
  const size = FEATURE_SIZE
  let meanA = 0, meanB = 0, count = 0
  for (let y = 0; y < size; y++) {
    const sy = y + dy
    if (sy < 0 || sy >= size) continue
    for (let x = 0; x < size; x++) {
      const sx = x + dx
      if (sx < 0 || sx >= size) continue
      meanA += a[y * size + x]; meanB += b[sy * size + sx]; count++
    }
  }
  if (count < size) return 0
  meanA /= count; meanB /= count
  let dot = 0, energyA = 0, energyB = 0
  for (let y = 0; y < size; y++) {
    const sy = y + dy
    if (sy < 0 || sy >= size) continue
    for (let x = 0; x < size; x++) {
      const sx = x + dx
      if (sx < 0 || sx >= size) continue
      const valueA = a[y * size + x] - meanA, valueB = b[sy * size + sx] - meanB
      dot += valueA * valueB; energyA += valueA * valueA; energyB += valueB * valueB
    }
  }
  return energyA > 0 && energyB > 0 ? dot / Math.sqrt(energyA * energyB) : 0
}

/**
 * Distance between two pictures on the pattern-merge scale: 0 for the same icon, above the
 * threshold for another one. Shape and colour are judged separately, because a brick icon is
 * mostly shape and two patterns may share one outline in two colours.
 */
function signatureDistance(a: TileSignature, b: TileSignature): number {
  let best = -1
  for (let dy = -SHIFT; dy <= SHIFT; dy++) for (let dx = -SHIFT; dx <= SHIFT; dx++) best = Math.max(best, correlation(a, b, dx, dy))
  const shape = SHAPE_WEIGHT * (1 - Math.min(1, Math.max(-1, best)))
  let bestEdges = -1
  for (let dy = -SHIFT; dy <= SHIFT; dy++) for (let dx = -SHIFT; dx <= SHIFT; dx++) bestEdges = Math.max(bestEdges, mapCorrelation(a.edges, b.edges, dx, dy))
  const structure = STRUCTURE_WEIGHT * (1 - Math.min(1, Math.max(-1, bestEdges)))
  // Photos of one screen are lit unevenly: align the icon's overall contrast before comparing.
  const gainA = Math.hypot(...a.colour) || 1, gainB = Math.hypot(...b.colour) || 1
  const scale = gainB / gainA
  const colour = COLOUR_WEIGHT * Math.hypot(a.colour[0] * scale - b.colour[0], a.colour[1] * scale - b.colour[1], a.colour[2] * scale - b.colour[2])
  // A brick cut by the frame stretches its ink box, so an unequal shape costs points instead of
  // rejecting the pair outright; two different patterns are already far apart in shape and colour.
  const stretch = Math.max(0, Math.abs(Math.log(a.aspect / b.aspect)) - 0.25)
  return shape + structure + colour + ASPECT_WEIGHT * stretch
}

const emptySignature = (): TileSignature => ({ pixels: new Float32Array(FEATURE_SIZE * FEATURE_SIZE * 3), edges: new Float32Array(FEATURE_SIZE * FEATURE_SIZE), colour: [0, 0, 0], ink: 0, solid: 0, span: 0, aspect: 1, partial: false, glare: 1 })

/** A cell that holds no pattern: board, a hairline drawn over it, or a highlight over all of it. */
function isBlank(sig: TileSignature): boolean {
  // A washed-out crop with nothing solid left is a reflection, not a brick: the detector reads
  // the bright spot as a cell, and every such cell used to become a pattern of its own.
  if (sig.glare >= 0.4 && sig.solid < 0.4) return true
  // Do not test the *average* ink colour here. A light-grey gate drawn in dark outlines averages
  // back to the face colour, and a stray bright patch that averages to grey is not worth losing a
  // brick over: the puzzle breaks when a brick goes missing, while an extra cell is one click.
  return sig.ink < BLANK_RATIO || sig.solid < SOLID_RATIO || sig.span <= Math.max(2, FEATURE_SIZE * 0.12)
}

/** A reflection hides part of the picture, so comparisons against it get the same extra room a cut crop gets. */
function slackOf(...signatures: TileSignature[]): number {
  return signatures.some(sig => sig.partial || sig.glare >= 0.15) ? 1.35 : 1
}

function averageSignature(members: TileSignature[]): TileSignature {
  const pixels = new Float32Array(members[0].pixels.length)
  const edges = new Float32Array(members[0].edges.length)
  const colour: [number, number, number] = [0, 0, 0]
  let ink = 0, solid = 0, span = 0, aspect = 0
  for (const member of members) {
    for (let i = 0; i < pixels.length; i++) pixels[i] += member.pixels[i]
    for (let i = 0; i < edges.length; i++) edges[i] += member.edges[i]
    ink += member.ink; solid += member.solid; span += member.span; aspect += member.aspect
    for (let c = 0; c < 3; c++) colour[c] += member.colour[c]
  }
  const count = Math.max(1, members.length)
  for (let i = 0; i < pixels.length; i++) pixels[i] /= count
  for (let i = 0; i < edges.length; i++) edges[i] /= count
  return {
    pixels, edges, colour: [colour[0] / count, colour[1] / count, colour[2] / count],
    ink: ink / count, solid: solid / count, span: span / count, aspect: aspect / count,
    partial: members.some(member => member.partial),
    glare: Math.max(...members.map(member => member.glare)),
  }
}

function buildSignatures(tiles: Pixels[]): TileSignature[] {
  return tiles.map(tile => tile.width < 2 || tile.height < 2 ? emptySignature() : signature(tile))
}
export function classifyTiles(tiles: Pixels[], threshold: number): number[] {
  return classifySignatures(buildSignatures(tiles), threshold)
}
/**
 * Grouping plus the numbers behind it, so the view can ask the user about the borderline
 * cases: pairs that only just missed the merge limit and pairs inside an odd group that only
 * just passed it. `distance` is the very metric the grouping uses, on patch indices.
 */
export interface TileAnalysis {
  /** 1-based group per patch, 0 for a blank crop. */
  groups: number[]
  distance: (a: number, b: number) => number
  limit: (a: number, b: number) => number
}
export function analyzeTiles(tiles: Pixels[], threshold: number): TileAnalysis {
  const signatures = buildSignatures(tiles)
  const blank = signatures.map(sig => isBlank(sig))
  return {
    groups: classifySignatures(signatures, threshold),
    distance(a, b) {
      if (blank[a] || blank[b]) return Infinity
      return signatureDistance(signatures[a], signatures[b])
    },
    limit(a, b) {
      return threshold * (signatures[a] && signatures[b] ? slackOf(signatures[a], signatures[b]) : 1)
    },
  }
}
export interface GroupReview {
  kind: 'merge' | 'split'
  a: Cell
  b: Cell
  groupA: number
  groupB: number
  /** distance between the two bricks, in the same units as the merge threshold */
  score: number
  /** the limit that pair was measured against (partial crops get slack) */
  limit: number
  /** how many bricks the questionable group holds */
  count: number
  key: string
}
/**
 * Borderline groupings that deserve a human yes/no, because the score is too close to the
 * limit to be sure: two groups that only just missed it, and an odd group whose weakest pair
 * only just passed. Blank or certain cases are left alone instead of nagging.
 */
export function reviewGrouping(
  board: Board,
  distance: (a: number, b: number) => number,
  limit: (a: number, b: number) => number,
): GroupReview[] {
  if (!board.length) return []
  const width = board[0].length
  const groups = new Map<number, Cell[]>()
  board.forEach((row, r) => row.forEach((id, c) => {
    if (!id) return
    const list = groups.get(id)
    if (list) list.push({ row: r, col: c })
    else groups.set(id, [{ row: r, col: c }])
  }))
  const at = (cell: Cell) => cell.row * width + cell.col
  const items: GroupReview[] = []
  const ids = [...groups.keys()].sort((one, two) => one - two)
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = groups.get(ids[i])![0], b = groups.get(ids[j])![0]
    const score = distance(at(a), at(b)), gate = limit(at(a), at(b))
    if (!Number.isFinite(score) || score <= gate || score > gate * 1.2) continue
    items.push({ kind: 'merge', a, b, groupA: ids[i], groupB: ids[j], score, limit: gate, count: groups.get(ids[i])!.length + groups.get(ids[j])!.length, key: `merge:${ids[i]}-${ids[j]}` })
  }
  ids.forEach(id => {
    const members = groups.get(id)!
    if (members.length < 2 || members.length % 2 === 0) return
    const base = members[0]
    let weakest: Cell | null = null, worst = -Infinity, gate = 0
    for (const cell of members.slice(1)) {
      const score = distance(at(base), at(cell)), limitForPair = limit(at(base), at(cell))
      if (!Number.isFinite(score) || score > limitForPair || score <= worst) continue
      worst = score; gate = limitForPair; weakest = cell
    }
    if (!weakest || worst < gate * 0.75) return
    items.push({ kind: 'split', a: base, b: weakest, groupA: id, groupB: id, score: worst, limit: gate, count: members.length, key: `split:${id}:${weakest.row}-${weakest.col}` })
  })
  return items
}
function classifySignatures(signatures: TileSignature[], threshold: number): number[] {
  const usable = signatures.map(sig => !isBlank(sig))
  const groups: TileSignature[][] = [], templates: TileSignature[] = []
  const assignment: number[] = signatures.map(() => -1)
  // First pass: every brick joins the closest group it already has, or opens a group of its own.
  signatures.forEach((sig, index) => {
    if (!usable[index]) return
    let best = -1, smallest = Infinity
    templates.forEach((template, group) => {
      const value = signatureDistance(sig, template)
      if (value < smallest) { smallest = value; best = group }
    })
    if (best >= 0) {
      const limit = threshold * slackOf(sig, templates[best])
      if (smallest <= limit) { groups[best].push(sig); templates[best] = averageSignature(groups[best]); assignment[index] = best; return }
    }
    groups.push([sig]); templates.push(sig); assignment[index] = groups.length - 1
  })
  // Re-cluster against the group averages and merge what has converged: with a greedy pass the
  // first crop of a pattern decides what the whole group has to look like, and one contaminated
  // or badly framed brick could split the pattern in two.
  for (let pass = 0; pass < 2; pass++) {
    const centres = groups.map(averageSignature)
    const next: number[][] = groups.map(() => [])
    signatures.forEach((sig, index) => {
      if (!usable[index]) return
      let best = assignment[index]
      if (best >= centres.length) best = 0
      let smallest = signatureDistance(sig, centres[best])
      centres.forEach((centre, group) => {
        if (group === best) return
        const value = signatureDistance(sig, centre)
        if (value < smallest) { smallest = value; best = group }
      })
      next[best].push(index)
    })
    const members: number[][] = [], averages: TileSignature[] = []
    next.forEach(indices => {
      if (!indices.length) return
      const centre = averageSignature(indices.map(index => signatures[index]))
      const hit = averages.findIndex(other => signatureDistance(centre, other) <= threshold)
      if (hit >= 0) { members[hit].push(...indices); averages[hit] = averageSignature(members[hit].map(index => signatures[index])) }
      else { members.push([...indices]); averages.push(centre) }
    })
    groups.length = 0
    members.forEach((indices, group) => {
      groups.push(indices.map(index => signatures[index]))
      indices.forEach(index => { assignment[index] = group })
    })
  }
  return assignment.map(group => group < 0 ? 0 : group + 1)
}

// ── 透视校正 ────────────────────────────────────────────────────────────────
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Corners are picked clockwise: 3 points mean top-left, top-right, bottom-right and
 * the bottom-left corner is inferred; 4 points add the explicit bottom-left corner.
 */
export function quadFromPoints(points: Point[]): Quad | null {
  if (points.length < 3) return null
  const [topLeft, topRight, third, fourth] = points
  const bottomRight = third
  const bottomLeft = fourth ?? { x: topLeft.x + third.x - topRight.x, y: topLeft.y + third.y - topRight.y }
  const corners = [topLeft, topRight, bottomRight, bottomLeft]
  for (let i = 0; i < corners.length; i++) {
    if (!Number.isFinite(corners[i].x) || !Number.isFinite(corners[i].y)) return null
    if (distance(corners[i], corners[(i + 1) % corners.length]) < 8) return null
  }
  // Shoelace area stays positive only for the documented clockwise order.
  let area = 0
  for (let i = 0; i < corners.length; i++) {
    const next = corners[(i + 1) % corners.length]
    area += corners[i].x * next.y - next.x * corners[i].y
  }
  if (area <= 0) return null
  return { topLeft, topRight, bottomRight, bottomLeft }
}

/** Longest opposite edges: the rectified canvas keeps the board's proportions. */
export function quadSize(quad: Quad): { width: number; height: number } {
  return {
    width: Math.max(1, distance(quad.topLeft, quad.topRight), distance(quad.bottomLeft, quad.bottomRight)),
    height: Math.max(1, distance(quad.topLeft, quad.bottomLeft), distance(quad.topRight, quad.bottomRight)),
  }
}

/** Grow a quad outward from its centre, so the straightened board keeps a margin. */
export function expandQuad(quad: Quad, ratio = 0.02): Quad {
  const points = quadToPairs(quad)
  const centreX = points.reduce((sum, point) => sum + point.x, 0) / 4, centreY = points.reduce((sum, point) => sum + point.y, 0) / 4
  const width = Math.max(...points.map(point => point.x)) - Math.min(...points.map(point => point.x))
  const height = Math.max(...points.map(point => point.y)) - Math.min(...points.map(point => point.y))
  const grow = (point: Point): Point => ({ x: point.x + Math.sign(point.x - centreX) * width * ratio, y: point.y + Math.sign(point.y - centreY) * height * ratio })
  return { topLeft: grow(quad.topLeft), topRight: grow(quad.topRight), bottomRight: grow(quad.bottomRight), bottomLeft: grow(quad.bottomLeft) }
}

/** Rectify a board quadrilateral into a front-facing canvas. The input points are clockwise. */
export function rectifyPerspective(source: Pixels, quad: Quad, outputWidth = 800, outputHeight = 800): Pixels {
  // Coordinates come from user taps and from fits, so sanitise both before sampling.
  const limit = (value: number, fallback: number) => Number.isFinite(value) ? Math.min(4000, Math.max(8, Math.round(value))) : fallback
  outputWidth = limit(outputWidth, 800); outputHeight = limit(outputHeight, 800)
  const corners = quadToPairs(quad).map(point => ({ x: Number.isFinite(point.x) ? point.x : 0, y: Number.isFinite(point.y) ? point.y : 0 }))
  const destination = [{ x: 0, y: 0 }, { x: outputWidth - 1, y: 0 }, { x: outputWidth - 1, y: outputHeight - 1 }, { x: 0, y: outputHeight - 1 }]
  // Both coordinates share one eight-parameter projective transform.
  const transform = fitHomography(destination.map((point, index) => ({
    u: point.x, v: point.y, x: corners[index].x, y: corners[index].y, index,
  })))
  const data = new Uint8ClampedArray(outputWidth * outputHeight * 4)
  const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  for (let v = 0; v < outputHeight; v++) for (let u = 0; u < outputWidth; u++) {
    let point: Point
    if (transform) {
      point = applyHomography(transform, u, v)
    } else {
      const tx = outputWidth === 1 ? 0 : u / (outputWidth - 1), ty = outputHeight === 1 ? 0 : v / (outputHeight - 1)
      point = lerp(lerp(quad.topLeft, quad.topRight, tx), lerp(quad.bottomLeft, quad.bottomRight, tx), ty)
    }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
    // Edge-extend rather than skip: a skipped pixel stays transparent and shows up as a
    // white band along the straightened board.
    const sx = Math.min(source.width - 1, Math.max(0, Math.round(point.x))), sy = Math.min(source.height - 1, Math.max(0, Math.round(point.y)))
    const out = (v * outputWidth + u) * 4
    const input = (sy * source.width + sx) * 4
    data.set(source.data.slice(input, input + 4), out)
  }
  return { data, width: outputWidth, height: outputHeight }
}
function quadToPairs(quad: Quad): Point[] { return [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft] }
