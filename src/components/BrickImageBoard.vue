<template>
  <div class="image-stage" :class="{ 'demo-stage': !imageUrl, playing: animating }" :aria-busy="animating">
    <img v-if="imageUrl" class="game-screenshot" :src="imageUrl" alt="游戏原图，在图中高亮砖块上播放消除" draggable="false" />
    <div class="image-board-area" :style="areaStyle">
      <div class="image-cells" :style="{ gridTemplateColumns: `repeat(${board[0].length}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${board.length}, minmax(0, 1fr))` }">
        <template v-for="(row, r) in board" :key="r">
          <button v-for="(id, c) in row" :key="c" class="brick-cell"
            :class="{ empty: !id, highlighted: endpoint(r, c), clearing: animating && phase !== 'push' && endpoint(r, c), 'removed-tile': removed(r, c), editing: editing?.row === r && editing?.col === c }"
            :style="cellStyle(r, c)" :disabled="animating"
            :aria-label="`第 ${r + 1} 行第 ${c + 1} 列，${id ? '图案 ' + id : '空格'}`"
            @click="$emit('select', { row: r, col: c })">
            <img v-if="id && tileImages[r]?.[c] && showTile(r, c)" class="tile-art" :src="tileImages[r][c]" alt="" />
            <span v-else-if="id && !imageUrl && !pushCovered(r, c)" class="tile-art demo-icon">{{ icons[(id - 1) % icons.length] }}</span>
            <small v-if="id && showGroups">{{ id }}</small>
            <b v-if="endpoint(r, c)">{{ firstEndpoint(r, c) ? '①' : '②' }}</b>
            <span v-if="animating && phase !== 'push' && endpoint(r, c)" class="burst" aria-hidden="true">✦</span>
          </button>
        </template>
      </div>
      <svg v-if="move && (!move.push || phase === 'clear')" class="path-overlay" :class="{ tracing: animating && phase !== 'push' }" :viewBox="`0 0 ${board[0].length} ${board.length}`" preserveAspectRatio="none" aria-hidden="true">
        <polyline class="path-halo" :points="pathPoints" />
        <polyline class="path-line" :points="pathPoints" pathLength="1" />
        <circle v-for="(cell, index) in [move.from, move.to]" :key="index" :cx="cell.col + .5" :cy="cell.row + .5" r=".18" class="tap-ring" :class="{ second: index === 1 }" />
      </svg>
      <svg v-if="move?.push && phase !== 'clear'" class="path-overlay push-arrow" :viewBox="`0 0 ${board[0].length} ${board.length}`" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id="brick-push-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#ffb627" /></marker></defs>
        <line :x1="move.from.col + .5" :y1="move.from.row + .5" :x2="move.path[0].col + .5" :y2="move.path[0].row + .5" marker-end="url(#brick-push-arrow)" />
      </svg>
      <div v-if="animating && phase === 'push'" class="push-layer" aria-hidden="true">
        <div v-for="(tile, index) in move?.push?.tiles" :key="index" class="pushing-tile" :style="movingStyle(tile)">
          <img v-if="tileImages[tile.from.row]?.[tile.from.col]" :src="tileImages[tile.from.row][tile.from.col]" alt="" />
          <span v-else class="demo-icon">{{ icons[(tile.id - 1) % icons.length] }}</span>
        </div>
      </div>
    </div>
    <span v-if="animating" class="play-status" role="status">{{ phase === 'push' ? '正在推动整段砖块…' : '无遮挡，消除配对…' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Board, Cell, Grid, Move, ShiftedTile } from '../utils/brick-assistant'
const props = withDefaults(defineProps<{
  imageUrl?: string; imageWidth?: number; imageHeight?: number; grid?: Grid | null
  board: Board; initialBoard: Board; erasedCells?: boolean[][]; tileImages: string[][]; emptyImage?: string; emptyColor?: string
  move?: Move; animating: boolean; phase?: 'idle' | 'push' | 'clear'; editing?: Cell | null; showGroups?: boolean
}>(), { imageUrl: '', imageWidth: 1, imageHeight: 1, grid: null, emptyImage: '', emptyColor: '#956322', editing: null, showGroups: false, phase: 'clear' })
defineEmits<{ select: [cell: Cell] }>()
const icons = ['🍗', '🫑', '🥬', '🍅', '🥦', '🌽', '🧱', '✂️', '🪓']
const areaStyle = computed(() => props.imageUrl && props.grid ? {
  left: `${props.grid.x / props.imageWidth * 100}%`, top: `${props.grid.y / props.imageHeight * 100}%`,
  width: `${props.grid.width / props.imageWidth * 100}%`, height: `${props.grid.height / props.imageHeight * 100}%`,
} : { aspectRatio: `${props.board[0].length} / ${props.board.length}` })
const pathPoints = computed(() => props.move?.path.map(p => `${p.col + .5},${p.row + .5}`).join(' '))
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
function movingStyle(tile: ShiftedTile) {
  return { left: `${tile.from.col / props.board[0].length * 100}%`, top: `${tile.from.row / props.board.length * 100}%`,
    width: `${100 / props.board[0].length}%`, height: `${100 / props.board.length}%`,
    '--dx': `${(tile.to.col - tile.from.col) * 100}%`, '--dy': `${(tile.to.row - tile.from.row) * 100}%` }
}
function removed(row: number, col: number) { return !props.board[row][col] && (props.erasedCells?.[row]?.[col] ?? (!!props.initialBoard[row]?.[col] && !props.board[row][col])) }
function cellStyle(row: number, col: number) {
  if (props.imageUrl) {
    return props.erasedCells?.[row]?.[col] || removed(row, col) || pushCovered(row, col) || (props.animating && props.phase !== 'push' && endpoint(row, col)) ? {
      backgroundColor: props.emptyColor, backgroundImage: props.emptyImage ? `url("${props.emptyImage}")` : undefined,
    } : {}
  }
  const id = pushCovered(row, col) ? 0 : props.board[row][col]
  return { backgroundColor: id ? `hsl(${id * 67 % 360} 65% 91%)` : '#e9efe5' }
}
</script>

<style scoped>
.image-stage { position: relative; width: 100%; max-width: 680px; margin: 18px auto 24px; isolation: isolate; border-radius: 12px; box-shadow: 0 0 0 1px #254b3514, 0 8px 24px #254b3510; }
.game-screenshot { display: block; width: 100%; border-radius: 8px; user-select: none; }
.image-board-area { position: absolute; overflow: hidden; }.image-cells { display: grid; width: 100%; height: 100%; }
.brick-cell { position: relative; min-width: 0; min-height: 0; padding: 0; border: 0; border-radius: 0; background: transparent; background-size: 100% 100%; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; color: #303133; display: flex; align-items: center; justify-content: center; overflow: visible; }
.brick-cell:disabled { cursor: default; }.brick-cell:focus-visible { outline: 3px solid #409eff; outline-offset: -3px; z-index: 4; }
.brick-cell.highlighted { outline: 3px solid #00eea2; outline-offset: -3px; box-shadow: inset 0 0 12px #00eea266; z-index: 1; }.brick-cell.editing { outline: 3px solid #409eff; outline-offset: -3px; z-index: 4; }
.tile-art { display: block; width: 100%; height: 100%; object-fit: fill; }.brick-cell small { position: absolute; bottom: 1px; right: 1px; font-size: 11px; background: #ffffffe6; padding: 0 3px; border-radius: 3px; }
.brick-cell b { position: absolute; top: 0; left: 0; background: #007f51; color: white; border-radius: 0 0 6px; padding: 1px 4px; font-size: clamp(11px, 1.6vw, 18px); z-index: 2; }
.demo-stage .image-board-area { position: relative; aspect-ratio: 1; }.demo-stage .brick-cell { border: 1px solid #a7b898; border-radius: 4px; }.demo-icon { display: flex; align-items: center; justify-content: center; font-size: clamp(22px, 4vw, 48px); width: 100%; height: 100%; }
.path-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 3; }.path-overlay polyline { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }.path-halo { stroke: #073c2bcc; stroke-width: 8px; }.path-line { stroke: #5bffb9; stroke-width: 4px; }.tap-ring { fill: #ffffffe0; stroke: #00bd80; stroke-width: 2; vector-effect: non-scaling-stroke; opacity: 0; transform-box: fill-box; transform-origin: center; }
.playing .clearing { animation: cell-flash 1100ms ease-in-out both; }.clearing .tile-art { animation: tile-clear 1100ms ease-in-out both; }.clearing b { animation: badge-clear 1100ms both; }.tracing .path-line { stroke-dasharray: 1; animation: trace-path 1100ms ease-in-out both; }.tracing .path-halo { animation: badge-clear 1100ms both; }.tracing .tap-ring { animation: tap 500ms ease-out both; }.tracing .tap-ring.second { animation-delay: 200ms; }
.burst { position: absolute; pointer-events: none; color: #fffbd0; text-shadow: 0 0 12px #ffb300; font-size: clamp(26px, 5vw, 64px); animation: burst 1100ms ease-out both; z-index: 5; }.play-status { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); border-radius: 20px; background: #073c2be8; color: white; font-size: 13px; padding: 7px 15px; white-space: nowrap; z-index: 6; pointer-events: none; }
.push-layer { position: absolute; inset: 0; pointer-events: none; z-index: 4; }.pushing-tile { position: absolute; animation: tile-push 750ms ease-in-out both; background: #f5fac3; box-sizing: border-box; border: 1px solid #cca54e; }.pushing-tile img { width: 100%; height: 100%; display: block; }.push-arrow line { stroke: #ffb627; stroke-width: 5; vector-effect: non-scaling-stroke; }.push-arrow { z-index: 5; }
@keyframes tile-push { from { transform: translate(0, 0); } to { transform: translate(var(--dx), var(--dy)); } }
@keyframes trace-path { 0%, 15% { stroke-dashoffset: 1; opacity: 1; } 48%, 65% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes cell-flash { 0%, 30% { box-shadow: inset 0 0 12px #00eea266; } 50%, 65% { box-shadow: inset 0 0 25px #fffbd0, 0 0 16px #00eea2; } 100% { box-shadow: none; outline-color: transparent; } }
@keyframes tile-clear { 0%, 45% { transform: scale(1); opacity: 1; filter: brightness(1); } 60% { transform: scale(1.08); opacity: 1; filter: brightness(1.65); } 100% { transform: scale(.12); opacity: 0; filter: brightness(2); } }
@keyframes badge-clear { 0%, 65% { opacity: 1; } 100% { opacity: 0; } }
@keyframes tap { 0% { transform: scale(.3); opacity: 0; } 35% { opacity: 1; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes burst { 0%, 45% { transform: scale(0) rotate(0); opacity: 0; } 60% { transform: scale(1.2) rotate(30deg); opacity: 1; } 100% { transform: scale(2) rotate(80deg); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .pushing-tile, .playing .clearing, .clearing .tile-art, .clearing b, .tracing .path-line, .tracing .path-halo { animation-timing-function: steps(1, end); }.burst, .tap-ring { display: none; } }
</style>
