import { classifyTiles, faceShare } from './brick-assistant'
import { findTileBounds, isTileCandidate } from './brick-edges'
import type { Board, Detection, Grid, Pixels, TileBox, TileRect } from './brick-assistant'

/**
 * A cell the lattice did not confirm may still hold a brick the brightness pass missed, but it
 * must look like a brick of this board. A glare spot on the wooden frame is bright enough to
 * trace as an outline, yet its gradient hardly ever repeats the precise brick face colour, while
 * a real brick covers most of its outline with that colour.
 */
function looksLikeBrick(image: Pixels, box: TileBox, cell: TileBox, face?: [number, number, number]): boolean {
  // A brick fills its cell in both directions and is about as wide as it is tall; a glare sliver
  // hugging the frame is neither, which is what a pure colour test still lets through on some
  // straightened photos.
  if (box.width < cell.width * 0.55 || box.height < cell.height * 0.55) return false
  if (Math.abs(Math.log((box.width / box.height) / (cell.width / Math.max(1, cell.height)))) > 0.35) return false
  if (!face) return true
  return faceShare(image, box, face, 20) >= 0.12 || faceShare(image, box, face) >= 0.33
}

/** Area-average the exact observed rectangle, independently of the logical cell size. */
function cropPatch(image: Pixels, box: TileBox): Pixels {
  const size = 64, data = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const left = Math.max(0, Math.floor(box.x + x * box.width / size))
    const top = Math.max(0, Math.floor(box.y + y * box.height / size))
    const right = Math.min(image.width, Math.max(left + 1, Math.ceil(box.x + (x + 1) * box.width / size)))
    const bottom = Math.min(image.height, Math.max(top + 1, Math.ceil(box.y + (y + 1) * box.height / size)))
    const sum = [0, 0, 0, 0]
    let count = 0
    for (let sy = top; sy < bottom; sy++) for (let sx = left; sx < right; sx++) {
      const offset = (sy * image.width + sx) * 4
      for (let c = 0; c < 4; c++) sum[c] += image.data[offset + c]
      count++
    }
    for (let c = 0; c < 4; c++) data[(y * size + x) * 4 + c] = count ? sum[c] / count : 0
  }
  return { data, width: size, height: size }
}

export function recognizeBoardPixels(image: Pixels, grid: Grid, detection: Detection | null, threshold: number): { board: Board; rects: TileRect[]; patches: Pixels[] } {
  const cellWidth = grid.width / grid.cols, cellHeight = grid.height / grid.rows
  const boxes = new Map<string, TileBox>()
  if (detection) for (const cell of detection.cells) {
    const same = detection.rows === grid.rows && detection.cols === grid.cols &&
      Math.abs(detection.grid.x - grid.x) < 1 && Math.abs(detection.grid.y - grid.y) < 1 &&
      Math.abs(detection.grid.width - grid.width) < 1 && Math.abs(detection.grid.height - grid.height) < 1
    const col = same ? cell.col : Math.floor((cell.box.x + cell.box.width / 2 - grid.x) / cellWidth)
    const row = same ? cell.row : Math.floor((cell.box.y + cell.box.height / 2 - grid.y) / cellHeight)
    if (row >= 0 && row < grid.rows && col >= 0 && col < grid.cols) boxes.set(`${row},${col}`, cell.box)
  }
  // Bricks found elsewhere bound the fallback search, exactly as they bound detection itself.
  const known = detection ? detection.cells.map(cell => cell.box) : []
  const patches: Pixels[] = []
  for (let row = 0; row < grid.rows; row++) for (let col = 0; col < grid.cols; col++) {
    const cell = { x: grid.x + col * cellWidth, y: grid.y + row * cellHeight, width: cellWidth, height: cellHeight }
    const detected = boxes.get(`${row},${col}`)
    const accepted = detected ?? null
    // A cell without a lattice detection may only be corrected inside its own grid cell: an
    // unbounded trace would pull in the next brick or the board frame, so the crop no longer
    // matches the outline drawn on the picture.
    const slack = Math.min(cellWidth, cellHeight) * 0.08
    const clampToCell = (traced: TileBox): TileBox => {
      const left = Math.max(traced.x, cell.x - slack), top = Math.max(traced.y, cell.y - slack)
      const right = Math.min(traced.x + traced.width, cell.x + cell.width + slack)
      const bottom = Math.min(traced.y + traced.height, cell.y + cell.height + slack)
      return { x: left, y: top, width: right - left, height: bottom - top }
    }
    const traced = accepted ? null : findTileBounds(image, cell, known)
    const fallback = traced ? clampToCell(traced) : null
    const box = accepted ?? (fallback && fallback.width > 3 && fallback.height > 3 && looksLikeBrick(image, fallback, cell, detection?.face) && isTileCandidate(image, fallback) ? fallback : null)
    const belongs = box && box.x + box.width / 2 >= cell.x && box.x + box.width / 2 < cell.x + cell.width &&
      box.y + box.height / 2 >= cell.y && box.y + box.height / 2 < cell.y + cell.height
    if (box && (detected || belongs)) boxes.set(`${row},${col}`, box)
    else boxes.delete(`${row},${col}`)
    patches.push(cropPatch(image, boxes.get(`${row},${col}`) ?? cell))
  }
  // Background samples are for erasing only: they must never seed a pattern group.
  const occupied = patches.map((_, index) => index).filter(index => boxes.has(`${Math.floor(index / grid.cols)},${index % grid.cols}`))
  const groups = classifyTiles(occupied.map(index => patches[index]), threshold)
  const ids = patches.map(() => 0)
  occupied.forEach((index, i) => { ids[index] = groups[i] })
  const rects = Array.from(boxes, ([key, box]) => {
    const [row, col] = key.split(',').map(Number)
    return { row, col, ...box }
  }).filter(rect => ids[rect.row * grid.cols + rect.col])
  return { board: Array.from({ length: grid.rows }, (_, row) => ids.slice(row * grid.cols, (row + 1) * grid.cols)), rects, patches }
}
