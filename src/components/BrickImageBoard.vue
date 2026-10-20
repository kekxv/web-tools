<template>
  <div class="image-stage" :class="{ 'demo-stage': !imageUrl, playing: animating }" :style="stageStyle" :aria-busy="animating">
    <div class="image-frame">
      <img v-if="imageUrl" class="game-screenshot" :style="shotStyle" :src="imageUrl" alt="游戏原图，在图中高亮砖块上播放消除" draggable="false" />
      <div class="image-board-area">
        <div class="image-cells" :class="{ mapped: !!imageUrl }" :style="imageUrl ? undefined : gridStyle">
          <template v-for="(row, r) in board" :key="r">
            <button v-for="(id, c) in row" :key="c" class="brick-cell"
              :class="{ empty: !id, highlighted: endpoint(r, c), clearing: animating && phase !== 'push' && endpoint(r, c), 'removed-tile': removed(r, c), editing: editing?.row === r && editing?.col === c, positioned: !!imageUrl, framed: !!imageUrl && frames && !!id, guessed: !!imageUrl && frames && !!id && !tileAt(r, c) }"
              :style="imageUrl ? { ...cellBox(r, c), ...paintStyle(r, c) } : cellStyle(r, c)" :disabled="animating"
              :aria-label="`第 ${r + 1} 行第 ${c + 1} 列，${id ? '图案 ' + id : '空格'}`"
              @click="emit('select', { row: r, col: c })">
              <img v-if="id && tileImages[r]?.[c] && showTile(r, c)" class="tile-art" :src="tileImages[r][c]" alt="" />
              <span v-else-if="id && !imageUrl && !pushCovered(r, c)" class="tile-art demo-icon">{{ icons[(id - 1) % icons.length] }}</span>
              <small v-if="id && showGroups">{{ id }}</small>
              <b v-if="endpoint(r, c)">{{ firstEndpoint(r, c) ? '①' : '②' }}</b>
              <span v-if="animating && phase !== 'push' && endpoint(r, c)" class="burst" aria-hidden="true">✦</span>
            </button>
          </template>
        </div>
        <svg v-if="move && (!move.push || phase === 'clear')" class="path-overlay" :class="{ tracing: animating && phase !== 'push' }" :viewBox="`0 0 ${columns} ${rows}`" preserveAspectRatio="none" aria-hidden="true">
          <polyline class="path-halo" :points="pathPoints" />
          <polyline class="path-line" :points="pathPoints" pathLength="1" />
          <circle v-for="(cell, index) in [move.from, move.to]" :key="index" :cx="cellCentre(cell).x" :cy="cellCentre(cell).y" r=".18" class="tap-ring" :class="{ second: index === 1 }" />
        </svg>
        <svg v-if="move?.push && phase !== 'clear'" class="path-overlay push-arrow" :viewBox="`0 0 ${columns} ${rows}`" preserveAspectRatio="none" aria-hidden="true">
          <defs><marker id="brick-push-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#2563eb" /></marker></defs>
          <line :x1="cellCentre(move.from).x" :y1="cellCentre(move.from).y" :x2="cellCentre(move.path[0]).x" :y2="cellCentre(move.path[0]).y" marker-end="url(#brick-push-arrow)" />
        </svg>
        <div v-if="animating && phase === 'push'" class="push-layer" aria-hidden="true" @animationend="emit('pushed')">
          <div v-for="(tile, index) in move?.push?.tiles" :key="index" class="pushing-tile" :style="movingStyle(tile)">
            <img v-if="tileImages[tile.from.row]?.[tile.from.col]" :src="tileImages[tile.from.row][tile.from.col]" alt="" />
            <span v-else class="demo-icon">{{ icons[(tile.id - 1) % icons.length] }}</span>
          </div>
        </div>
      </div>
    </div>
    <span v-if="animating" class="play-status" role="status">{{ phase === 'push' ? '正在推动整段砖块…' : '无遮挡，消除配对…' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CLEAR_MS, PUSH_MS } from '../utils/brick-animation'
/** Widest a single brick may get, so a two-row board does not turn into giant tiles. */
const CELL_CAP = 132
import type { Board, Cell, Grid, Move, ShiftedTile, TileRect } from '../utils/brick-assistant'
const props = withDefaults(defineProps<{
  imageUrl?: string; imageWidth?: number; imageHeight?: number; grid?: Grid | null
  board: Board; initialBoard: Board; erasedCells?: boolean[][]; tileImages: string[][]; emptyImage?: string; emptyColor?: string
  move?: Move; animating: boolean; phase?: 'idle' | 'push' | 'clear'; editing?: Cell | null; showGroups?: boolean
  tiles?: TileRect[]; frames?: boolean
}>(), { imageUrl: '', imageWidth: 1, imageHeight: 1, grid: null, emptyImage: '', emptyColor: '#956322', editing: null, showGroups: false, phase: 'clear', frames: true })
const emit = defineEmits<{ select: [cell: Cell]; pushed: [] }>()
const icons = ['🍗', '🫑', '🥬', '🍅', '🥦', '🌽', '🧱', '✂️', '🪓']
const columns = computed(() => props.board[0]?.length || 1)
const rows = computed(() => props.board.length || 1)
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows.value}, minmax(0, 1fr))` }))
/**
 * The rectangle the outlines live in: the tile lattice plus every brick outline. A brick that
 * reaches a little past the lattice edge (a photo is never a perfect grid) would otherwise be cut
 * off by this area, and the frame would show less than the crop taken from the same box.
 */
const boardArea = computed(() => {
  const grid = props.grid
  if (!grid) return null
  let left = grid.x, top = grid.y, right = grid.x + grid.width, bottom = grid.y + grid.height
  for (const tile of props.tiles ?? []) {
    left = Math.min(left, tile.x); top = Math.min(top, tile.y)
    right = Math.max(right, tile.x + tile.width); bottom = Math.max(bottom, tile.y + tile.height)
  }
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }
})
/**
 * The stage is the board, not the whole screenshot: the picture is scaled up and shifted so the
 * board fills it. Bricks get big, the panel stays short, and the surrounding game UI does not
 * eat half the page. `--ratio` lets CSS cap the height without distorting the frames.
 */
const stageStyle = computed(() => {
  const area = props.imageUrl ? boardArea.value : null
  const height = area?.height || rows.value
  const ratio = (area?.width || columns.value) / Math.max(1, height)
  // Bricks stop growing past CELL_CAP: a short board would otherwise fill the whole stage.
  const maxWidth = Math.min(columns.value, rows.value * ratio) * CELL_CAP
  return { '--ratio': `${ratio}`, '--push-ms': `${PUSH_MS}ms`, '--clear-ms': `${CLEAR_MS}ms`, '--board-max': `${Math.round(maxWidth)}px` }
})
const shotStyle = computed(() => {
  const area = props.imageUrl ? boardArea.value : null
  if (!area) return {}
  return {
    position: 'absolute' as const,
    width: `${props.imageWidth / area.width * 100}%`,
    left: `${-area.x / area.width * 100}%`, top: `${-area.y / area.height * 100}%`,
  }
})
const tiles = computed(() => {
  const map = new Map<string, TileRect>()
  for (const tile of props.tiles ?? []) map.set(`${tile.row},${tile.col}`, tile)
  return map
})
const tileAt = (row: number, col: number) => tiles.value.get(`${row},${col}`)
/**
 * Where the brick really is, as a fraction of the board area. Detected bricks keep their
 * own outline (photos are never a perfect lattice); everything else falls back to the
 * even grid, so an empty cell can never drift on top of a neighbouring brick.
 */
function rectPercent(row: number, col: number) {
  const area = props.imageUrl ? boardArea.value : null, grid = props.grid
  if (area && grid) {
    const tile = tileAt(row, col)
    const x = tile ? tile.x : grid.x + col * grid.width / columns.value
    const y = tile ? tile.y : grid.y + row * grid.height / rows.value
    const width = tile ? tile.width : grid.width / columns.value
    const height = tile ? tile.height : grid.height / rows.value
    return { left: (x - area.x) / area.width, top: (y - area.y) / area.height, width: width / area.width, height: height / area.height }
  }
  return { left: col / columns.value, top: row / rows.value, width: 1 / columns.value, height: 1 / rows.value }
}
function cellBox(row: number, col: number) {
  const rect = rectPercent(row, col)
  return { left: `${rect.left * 100}%`, top: `${rect.top * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }
}
/** Centre of a cell in grid units, so the SVG overlays follow the same outlines. */
function cellCentre(cell: Cell) {
  if (!props.imageUrl) return { x: cell.col + .5, y: cell.row + .5 }
  const rect = rectPercent(cell.row, cell.col)
  return { x: (rect.left + rect.width / 2) * columns.value, y: (rect.top + rect.height / 2) * rows.value }
}
const pathPoints = computed(() => props.move?.path.map(p => `${cellCentre(p).x},${cellCentre(p).y}`).join(' '))
function firstEndpoint(row: number, col: number) {
  const from = props.phase === 'clear' && props.move?.push ? props.move.path[0] : props.move?.from
  return from?.row === row && from?.col === col
}
function endpoint(row: number, col: number) {
  if (!props.move) return false
  const from = props.phase === 'clear' && props.move.push ? props.move.path[0] : props.move.from
  return [from, props.move.to].some(p => p.row === row && p.col === col)
}
function pushCovered(row: number, col: number) {
  return props.animating && props.phase === 'push' && !!props.move?.push?.tiles.some(t => [t.from, t.to].some(p => p.row === row && p.col === col))
}
function showTile(row: number, col: number) {
  return !pushCovered(row, col) && (!props.imageUrl || !!props.erasedCells?.[row]?.[col] || (props.animating && props.phase !== 'push' && endpoint(row, col)))
}
/**
 * A pushed tile starts on its own outline and ends exactly on the outline of the cell it moves to.
 * translate() percentages resolve against the tile itself, not the board, so the shift is divided
 * by the tile size; the scale covers the small size difference between two real outlines. Without
 * that the tile crawls a tenth of the way and then snaps.
 */
function movingStyle(tile: ShiftedTile) {
  const from = rectPercent(tile.from.row, tile.from.col), to = rectPercent(tile.to.row, tile.to.col)
  return { left: `${from.left * 100}%`, top: `${from.top * 100}%`, width: `${from.width * 100}%`, height: `${from.height * 100}%`,
    '--dx': `${(to.left - from.left) / from.width * 100}%`, '--dy': `${(to.top - from.top) / from.height * 100}%`,
    '--sx': `${to.width / from.width}`, '--sy': `${to.height / from.height}` }
}
function removed(row: number, col: number) { return !props.board[row][col] && (props.erasedCells?.[row]?.[col] ?? (!!props.initialBoard[row]?.[col] && !props.board[row][col])) }
/** Paint over a brick that is gone; a cell that never held a brick stays untouched. */
function paintStyle(row: number, col: number) {
  if (!(props.erasedCells?.[row]?.[col] || removed(row, col) || pushCovered(row, col) || (props.animating && props.phase !== 'push' && endpoint(row, col)))) return {}
  return { backgroundColor: props.emptyColor, backgroundImage: props.emptyImage ? `url("${props.emptyImage}")` : undefined }
}
function cellStyle(row: number, col: number) {
  const id = pushCovered(row, col) ? 0 : props.board[row][col]
  return { backgroundColor: id ? `hsl(${id * 67 % 360} 65% 91%)` : '#e9efe5' }
}
</script>

<style scoped>
.image-stage { position: relative; width: 100%; margin: 12px auto 14px; isolation: isolate; --cap: var(--stage-cap, min(58vh, 540px)); }
.image-frame { position: relative; margin-inline: auto; width: min(calc(100% - 28px), calc(var(--cap) * var(--ratio, 1)), var(--board-max, 100%)); aspect-ratio: var(--ratio, 1); overflow: hidden; border-radius: 8px; box-shadow: 0 0 0 1px #0f172014; }
.game-screenshot { display: block; height: auto; user-select: none; }
.image-board-area { position: absolute; inset: 0; overflow: hidden; }.image-cells { display: grid; width: 100%; height: 100%; }.image-cells.mapped { display: block; position: relative; }
.brick-cell { position: relative; min-width: 0; min-height: 0; padding: 0; border: 0; border-radius: 0; background: transparent; background-size: 100% 100%; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; color: #303133; display: flex; align-items: center; justify-content: center; overflow: visible; }
.brick-cell.positioned { position: absolute; }
.brick-cell.framed::after { content: ''; position: absolute; inset: 0; border: 2px dashed #2563eb; border-radius: 3px; pointer-events: none; z-index: 2; }
.brick-cell.framed.guessed::after { border-style: dotted; border-color: #d97706; }
.brick-cell.highlighted::after { border: 2px solid #2563eb; border-radius: 3px; box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2563eb33; }
.brick-cell:disabled { cursor: default; }.brick-cell:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; z-index: 4; }
.brick-cell.highlighted { outline: 2px solid #2563eb; outline-offset: -2px; box-shadow: inset 0 0 10px #2563eb33; z-index: 1; }.brick-cell.editing { outline: 3px solid #0f172a; outline-offset: -3px; z-index: 4; }
.tile-art { display: block; width: 100%; height: 100%; object-fit: fill; }.brick-cell small { position: absolute; bottom: 1px; right: 1px; font-size: 11px; background: #ffffffe6; padding: 0 3px; border-radius: 3px; }
.brick-cell b { position: absolute; top: 0; left: 0; background: #2563ebe6; color: #fff; border-radius: 0 0 5px; padding: 0 4px; font-size: clamp(10px, 1.5vw, 16px); line-height: 16px; z-index: 3; }
.demo-stage .image-board-area { position: absolute; inset: 0; }.demo-stage .brick-cell { border: 1px solid #d3d8e0; border-radius: 4px; }.demo-icon { display: flex; align-items: center; justify-content: center; font-size: clamp(22px, 4vw, 48px); width: 100%; height: 100%; }
.path-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 3; }.path-overlay polyline { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }.path-halo { stroke: #ffffffd9; stroke-width: 9px; }.path-line { stroke: #2563eb; stroke-width: 4px; }.tap-ring { fill: #ffffffdd; stroke: #2563eb; stroke-width: 2; vector-effect: non-scaling-stroke; opacity: 0; transform-box: fill-box; transform-origin: center; }
.playing .clearing { animation: cell-flash var(--clear-ms, 900ms) ease-in-out both; }.clearing .tile-art { animation: tile-clear var(--clear-ms, 900ms) ease-in-out both; }.clearing b { animation: badge-clear var(--clear-ms, 900ms) both; }.tracing .path-line { stroke-dasharray: 1; animation: trace-path var(--clear-ms, 900ms) ease-in-out both; }.tracing .path-halo { animation: badge-clear var(--clear-ms, 900ms) both; }.tracing .tap-ring { animation: tap 500ms ease-out both; }.tracing .tap-ring.second { animation-delay: 200ms; }
.burst { position: absolute; pointer-events: none; color: #2563eb; text-shadow: 0 0 14px #ffffff; font-size: clamp(26px, 5vw, 64px); animation: burst var(--clear-ms, 900ms) ease-out both; z-index: 5; }.play-status { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); border-radius: 999px; background: #0f172ae8; color: #fff; font-size: 12px; padding: 5px 12px; white-space: nowrap; z-index: 6; pointer-events: none; }
.push-layer { position: absolute; inset: 0; pointer-events: none; z-index: 4; }.pushing-tile { position: absolute; transform-origin: 0 0; will-change: transform; animation: tile-push var(--push-ms, 620ms) cubic-bezier(.2, .8, .25, 1) both; background: #f5f7fb; box-sizing: border-box; border: 2px solid #2563eb; border-radius: 3px; box-shadow: 0 6px 18px #2563eb40; }.pushing-tile img { width: 100%; height: 100%; display: block; }.push-arrow line { stroke: #2563eb; stroke-width: 4; vector-effect: non-scaling-stroke; }.push-arrow { z-index: 5; }
@keyframes tile-push { from { transform: translate(0, 0) scale(1); } to { transform: translate(var(--dx), var(--dy)) scale(var(--sx, 1), var(--sy, 1)); } }
@keyframes trace-path { 0%, 15% { stroke-dashoffset: 1; opacity: 1; } 48%, 65% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes cell-flash { 0%, 30% { box-shadow: inset 0 0 10px #2563eb33; } 50%, 65% { box-shadow: inset 0 0 22px #fff, 0 0 14px #2563eb; } 100% { box-shadow: none; outline-color: transparent; } }
@keyframes tile-clear { 0%, 45% { transform: scale(1); opacity: 1; filter: brightness(1); } 60% { transform: scale(1.08); opacity: 1; filter: brightness(1.65); } 100% { transform: scale(.12); opacity: 0; filter: brightness(2); } }
@keyframes badge-clear { 0%, 65% { opacity: 1; } 100% { opacity: 0; } }
@keyframes tap { 0% { transform: scale(.3); opacity: 0; } 35% { opacity: 1; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes burst { 0%, 45% { transform: scale(0) rotate(0); opacity: 0; } 60% { transform: scale(1.2) rotate(30deg); opacity: 1; } 100% { transform: scale(2) rotate(80deg); opacity: 0; } }
@media (max-width: 600px) { .image-stage { --cap: var(--stage-cap, min(46vh, 340px)); } }
@media (prefers-reduced-motion: reduce) { .pushing-tile, .playing .clearing, .clearing .tile-art, .clearing b, .tracing .path-line, .tracing .path-halo { animation-timing-function: steps(1, end); }.burst, .tap-ring { display: none; } }
</style>
