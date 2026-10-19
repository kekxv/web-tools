<template>
  <div class="brick-assistant">
    <header class="intro">
      <div class="intro-copy">
        <span class="eyebrow">休闲一下 · 解题小帮手</span>
        <h1><span class="hero-icon" aria-hidden="true">🧱</span>砖了个砖助手</h1>
        <p>卡住了？导入一张截图，让下一步变得一目了然。</p>
        <span class="local-badge"><span aria-hidden="true">●</span> 图片仅在本地处理</span>
      </div>
      <div class="hero-art" aria-hidden="true"><span>🍗</span><span>🥬</span><span>🍅</span><span>🍗</span></div>
    </header>

    <ol class="workflow" aria-label="使用步骤">
      <li :class="{ current: !imageUrl && !board.length, complete: imageUrl || board.length }"><span>01</span>导入画面</li>
      <li :class="{ current: imageUrl && !board.length, complete: board.length }"><span>02</span>确认棋盘</li>
      <li :class="{ current: board.length }"><span>03</span>演示消除</li>
    </ol>

    <section class="panel import-panel" @dragover.prevent @drop.prevent="onDrop">
      <div class="section-heading"><div><span class="section-kicker">从这里开始</span><h2>导入游戏画面</h2></div><span class="section-note">支持拖放图片</span></div>
      <div class="import-actions">
        <button class="import-action featured" :disabled="busy" @click="upload?.click()"><span class="action-icon" aria-hidden="true">↥</span><strong>上传图片</strong><small>选择相册或游戏截图</small></button>
        <button class="import-action" :disabled="busy" @click="camera?.click()"><span class="action-icon" aria-hidden="true">◎</span><strong>拍照</strong><small>用手机拍下当前棋盘</small></button>
        <button class="import-action" data-test="capture" :disabled="busy" @click="captureScreen"><span class="action-icon" aria-hidden="true">▣</span><strong>截取游戏画面</strong><small>选择窗口或浏览器标签页</small></button>
        <button class="import-action" :disabled="busy" @click="pasteClipboard"><span class="action-icon" aria-hidden="true">▤</span><strong>粘贴图片</strong><small>读取剪贴板中的截图</small></button>
      </div>
      <div class="demo-actions"><span>先体验一下？</span><button data-test="push-demo" :disabled="busy" @click="loadPushDemo">鸡腿推动示例 <span aria-hidden="true">↗</span></button><button data-test="demo" :disabled="busy" @click="loadDemo">试用示例 <span aria-hidden="true">↗</span></button></div>
      <input ref="upload" hidden type="file" accept="image/*" @change="onFile" />
      <input ref="camera" hidden type="file" accept="image/*" capture="environment" @change="onFile" />
      <p class="hint">也可拖入图片或按 Ctrl / ⌘ + V。手机可拍照或上传截图；拍照请正对棋盘。截取画面时选择游戏窗口或标签页。</p>
      <p v-if="busy" role="status">正在读取画面…</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    </section>

    <details v-if="imageUrl" class="panel crop-settings" :open="!board.length">
      <summary>2 · 调整棋盘范围与识别</summary>
      <p class="hint">在原图上拖框，范围需紧贴完整棋盘外沿（包含空格，不含边框和道具）。自动定位适用于浅色砖块，无法识别时请手动框选。</p>
      <div class="crop-layout">
        <div class="source-image" @pointerdown="startCrop" @pointermove="moveCrop" @pointerup="finishCrop" @pointercancel="cancelCrop">
          <img :src="imageUrl" alt="导入的游戏画面，拖动以选择棋盘" draggable="false" />
          <div class="crop-box" :style="cropStyle">
            <svg class="crop-grid" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
              <line v-for="n in previewCols - 1" :key="`c${n}`" :x1="n / previewCols" :x2="n / previewCols" y1="0" y2="1" />
              <line v-for="n in previewRows - 1" :key="`r${n}`" :y1="n / previewRows" :y2="n / previewRows" x1="0" x2="1" />
            </svg>
            <span>{{ rows }} 行 × {{ cols }} 列</span>
          </div>
        </div>
        <div class="crop-controls">
          <label>行数 <input v-model.number="rows" type="number" min="1" max="24" /></label>
          <label>列数 <input v-model.number="cols" type="number" min="1" max="24" /></label>
          <label>图案合并阈值 <input v-model.number="threshold" type="number" min="5" max="65" /></label>
          <p class="hint">不同图案被合并时调低阈值；相同图案被拆开时调高。调整后点击重新识别。</p>
          <div class="crop-numbers">
            <label>左边距（像素）<input data-test="crop-x" type="number" min="0" step="0.1" :value="roundedCrop('x')" @change="updateCrop('x', $event)" /></label>
            <label>上边距（像素）<input data-test="crop-y" type="number" min="0" step="0.1" :value="roundedCrop('y')" @change="updateCrop('y', $event)" /></label>
            <label>宽度（像素）<input data-test="crop-width" type="number" min="4" step="0.1" :value="roundedCrop('width')" @change="updateCrop('width', $event)" /></label>
            <label>高度（像素）<input data-test="crop-height" type="number" min="4" step="0.1" :value="roundedCrop('height')" @change="updateCrop('height', $event)" /></label>
          </div>
          <p class="hint">分格线应对齐砖块边缘。可微调边距和尺寸，再重新识别，避免裁入相邻砖块。</p>
          <button @click="autoLocate">自动定位</button>
          <button class="primary" @click="recognize">识别 / 重新识别</button>
        </div>
      </div>
    </details>

    <div v-if="board.length" class="analysis-layout">
      <section class="panel board-panel">
        <div class="section-heading"><div><span class="section-kicker">跟着高亮，轻松消除</span><h2>原图消除演示</h2></div><span class="live-badge">{{ animating ? '演示中' : '可交互棋盘' }}</span></div>
        <div class="board-stats"><span><strong>{{ remaining }}</strong> 剩余砖块</span><span><strong>{{ groupIds.length }}</strong> 种图案</span><span><strong>{{ board.length }} × {{ board[0].length }}</strong> 棋盘</span></div>
        <div class="board-toolbar actions">
          <button class="primary" data-test="apply" :disabled="animating || !currentMove" @click="simulate(true)">{{ animating ? '正在播放…' : '▶ 播放并消除' }}</button>
          <button v-if="animating" data-test="stop" @click="cancelAnimation">取消播放</button>
          <button data-test="preview" :disabled="animating || !currentMove" @click="simulate(false)">▷ 只演示这一步</button>
          <button data-test="edit-toggle" :disabled="animating" :class="{ 'edit-active': correctionMode }" @click="correctionMode = !correctionMode; editing = null">{{ correctionMode ? '完成校正' : '校正图案' }}</button>
        </div>
        <p class="hint">{{ correctionMode ? '点击原图中的格子，校正图案分组或设为空格。' : '点击绿色高亮砖块即可播放消除；点击其他砖块可切换配对。' }}</p>
        <BrickImageBoard :image-url="imageUrl" :image-width="imageSize.width" :image-height="imageSize.height" :grid="recognizedGrid"
          :board="board" :initial-board="initialBoard" :erased-cells="erasedCells" :tile-images="tileImages" :empty-image="emptyImage" :empty-color="emptyColor"
          :move="currentMove" :animating="animating" :phase="animationPhase" :editing="editing" :show-groups="correctionMode" @select="selectCell" />
        <div v-if="editing" class="editor">
          <strong>校正第 {{ editing.row + 1 }} 行、第 {{ editing.col + 1 }} 列</strong>
          <div v-if="tileImages[editing.row]?.[editing.col]" class="original-tile"><img :src="tileImages[editing.row][editing.col]" alt="当前格子的原始图片" /><span class="hint">原始格子（包含被识别为空格的位置），请对照选择图案。</span></div>
          <div class="palette">
            <button data-test="set-empty" @click="setCell(0)">空格</button>
            <button v-for="id in groupIds" :key="id" :title="`设为图案 ${id}`" @click="setCell(id)">
              <img v-if="groupImages[id]" :src="groupImages[id]" alt="" />{{ id }}
            </button>
            <button @click="setCell(Math.max(0, ...groupIds) + 1)">新图案</button>
            <button @click="editing = null">关闭</button>
          </div>
        </div>

        <p v-if="oddGroups.length" class="warning">图案 {{ oddGroups.join('、') }} 的数量为奇数，请检查是否有漏识别或错误分组。</p>
      </section>

      <section class="panel suggestions">
        <div class="section-heading"><div><span class="section-kicker">NEXT MOVE</span><h2>下一步操作</h2></div><span class="move-count">{{ moves.length }} 组可选</span></div>
        <p class="rule-description">框内推动 → 同图案直线消除</p>
        <p class="hint">只推动起点处连续相邻的一组，隔着空格的砖块会挡住去路；中间有障碍不能消除。所有移动都受外框限制，不能拐弯或绕到框外。</p>
        <p v-if="currentMove?.push" class="push-instruction">{{ directionLabel[currentMove.push.direction] }}推 {{ currentMove.push.distance }} 格 · 带动 {{ currentMove.push.tiles.length }} 块</p>
        <div class="actions">
          <button class="primary" :disabled="animating" @click="calculate">计算下一步</button>
          <button data-test="undo" :disabled="!history.length" @click="undo">撤销模拟 / 校正</button>
        </div>
        <template v-if="currentMove">
          <p class="hint">原图先演示整段砖块推动，再演示无遮挡直线消除。完成后自动标出下一步。</p>
          <p class="hint">这里的消除用于演示。游戏有掉落、移动或重排时，请重新截取画面。</p>
        </template>
        <p v-else class="empty-state">{{ remaining ? '没有找到可直接消除或推动一次后消除的操作。请核对棋盘范围和图案分组。' : '棋盘已清空。可以导入新的游戏画面。' }}</p>
        <details v-if="moves.length">
          <summary>共 {{ moves.length }} 组可选配对（显示前 30 组）</summary>
          <button v-for="(move, index) in moves.slice(0, 30)" :key="index" :title="`${position(move.from)} ↔ ${position(move.to)}`" :disabled="animating" class="move-option" :class="{ active: selectedMove === index }" @click="selectedMove = index; editing = null">
            <span>{{ index + 1 }}.</span>
            <img v-if="tileImages[move.from.row]?.[move.from.col]" class="pair-thumb" :src="tileImages[move.from.row][move.from.col]" alt="第一块" />
            <span>↔</span>
            <img v-if="tileImages[move.to.row]?.[move.to.col]" class="pair-thumb" :src="tileImages[move.to.row][move.to.col]" alt="第二块" />
            <span>{{ move.push ? `${directionLabel[move.push.direction]}推 ${move.push.distance} 格` : '直接消除' }}</span>
          </button>
        </details>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import BrickImageBoard from '../components/BrickImageBoard.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { applyMove, classifyTiles, detectGrid, findMoves, pushTiles } from '../utils/brick-assistant'
import type { Board, Cell, Grid, Move } from '../utils/brick-assistant'

const upload = ref<HTMLInputElement>(), camera = ref<HTMLInputElement>()
const imageUrl = ref(''), error = ref(''), notice = ref(''), busy = ref(false)
const rows = ref(14), cols = ref(10), threshold = ref(18)
const crop = ref<Grid>({ x: 0, y: 0, width: 1, height: 1, rows: 14, cols: 10 })
const board = ref<Board>([]), groupImages = ref<Record<number, string>>({})
const tileImages = ref<string[][]>([])
const moves = ref<Move[]>([]), selectedMove = ref(0)
const editing = ref<Cell | null>(null), history = ref<Snapshot[]>([])
const animating = ref(false), correctionMode = ref(false)
const imageSize = ref({ width: 1, height: 1 }), recognizedGrid = ref<Grid | null>(null)
const erasedCells = ref<boolean[][]>([])
let emptySample: Cell | null = null
const initialBoard = ref<Board>([]), emptyImage = ref(''), emptyColor = ref('#956322')
interface Snapshot { board: Board; erased: boolean[][]; tiles: string[][] }
let animationSnapshot: Snapshot | null = null
const animationPhase = ref<'idle' | 'push' | 'clear'>('idle')
const directionLabel = { right: '向右', left: '向左', up: '向上', down: '向下' }
let animationTimer: ReturnType<typeof setTimeout> | undefined
let source: HTMLCanvasElement | null = null
let cropStart: { x: number; y: number } | null = null
let priorCrop: Grid | null = null
let stream: MediaStream | null = null
let disposed = false
const currentMove = computed(() => moves.value[selectedMove.value])
const groupIds = computed(() => [...new Set(board.value.flat().filter(Boolean))].sort((a, b) => a - b))
const remaining = computed(() => board.value.flat().filter(Boolean).length)
const oddGroups = computed(() => groupIds.value.filter(id => board.value.flat().filter(v => v === id).length % 2))
const previewCols = computed(() => Number.isInteger(cols.value) && cols.value >= 1 && cols.value <= 24 ? cols.value : 1)
const previewRows = computed(() => Number.isInteger(rows.value) && rows.value >= 1 && rows.value <= 24 ? rows.value : 1)
type CropField = 'x' | 'y' | 'width' | 'height'
const roundedCrop = (field: CropField) => Math.round(crop.value[field] * 10) / 10
function updateCrop(field: CropField, event: Event) {
  if (!source) return
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) { error.value = '裁剪坐标需为有效数字。'; return }
  const next = { ...crop.value, [field]: value }
  next.x = Math.max(0, Math.min(source.width - 4, next.x))
  next.y = Math.max(0, Math.min(source.height - 4, next.y))
  next.width = Math.max(4, Math.min(source.width - next.x, next.width))
  next.height = Math.max(4, Math.min(source.height - next.y, next.height))
  crop.value = next; error.value = ''; notice.value = '范围已调整，请核对分格线后重新识别。'
}
const cropStyle = computed(() => ({
  left: `${crop.value.x / (source?.width || 1) * 100}%`, top: `${crop.value.y / (source?.height || 1) * 100}%`,
  width: `${crop.value.width / (source?.width || 1) * 100}%`, height: `${crop.value.height / (source?.height || 1) * 100}%`,
}))
const position = (cell: Cell) => `第 ${cell.row + 1} 行，第 ${cell.col + 1} 列`
function selectCell(cell: Cell) {
  if (animating.value) return
  if (correctionMode.value) { editing.value = cell; return }
  if (currentMove.value && [currentMove.value.from, currentMove.value.to].some(p => p.row === cell.row && p.col === cell.col)) {
    simulate(true); return
  }
  const index = moves.value.findIndex(move => [move.from, move.to].some(p => p.row === cell.row && p.col === cell.col))
  if (index >= 0) selectedMove.value = index
}
function takeSnapshot(): Snapshot { return { board: board.value.map(row => [...row]), erased: erasedCells.value.map(row => [...row]), tiles: tileImages.value.map(row => [...row]) } }
function restore(snapshot: Snapshot) { board.value = snapshot.board; erasedCells.value = snapshot.erased; tileImages.value = snapshot.tiles }
function cancelAnimation() {
  clearTimeout(animationTimer); animationTimer = undefined
  if (animationSnapshot) restore(animationSnapshot)
  animationSnapshot = null; animating.value = false; animationPhase.value = 'idle'
}
function calculate() {
  cancelAnimation()
  editing.value = null
  moves.value = findMoves(board.value.map(row => [...row]))
  selectedMove.value = 0
}
function saveHistory() { history.value.push(takeSnapshot()) }
function setCell(id: number) {
  if (!editing.value) return
  saveHistory()
  if (id && !groupImages.value[id] && tileImages.value[editing.value.row]?.[editing.value.col]) groupImages.value[id] = tileImages.value[editing.value.row][editing.value.col]
  const { row, col } = editing.value
  if (id && emptySample?.row === row && emptySample.col === col) { emptyImage.value = ''; emptySample = null }
  erasedCells.value[row][col] = !id
  board.value[row][col] = id
  calculate()
}
function simulate(commit: boolean) {
  if (!currentMove.value || animating.value) return
  const move = currentMove.value
  const snapshot = takeSnapshot()
  animationSnapshot = snapshot
  editing.value = null; correctionMode.value = false; animating.value = true
  function finish() {
    animationTimer = undefined
    if (commit) {
      history.value.push(snapshot)
      board.value = applyMove(snapshot.board, move)
      for (const cell of move.path) erasedCells.value[cell.row][cell.col] = true
      animationSnapshot = null; animating.value = false; animationPhase.value = 'idle'
      calculate()
    } else cancelAnimation()
  }
  if (move.push) {
    animationPhase.value = 'push'
    animationTimer = setTimeout(() => {
      const pushed = pushTiles(snapshot.board, move.from, move.push!.direction, move.push!.distance)
      const tiles = snapshot.tiles.map(row => [...row]), erased = snapshot.erased.map(row => [...row])
      for (const tile of pushed.tiles) {
        erased[tile.from.row][tile.from.col] = true; erased[tile.to.row][tile.to.col] = true
        if (tiles[tile.from.row]) tiles[tile.from.row][tile.from.col] = ''
      }
      for (const tile of pushed.tiles) if (tiles[tile.to.row]) tiles[tile.to.row][tile.to.col] = snapshot.tiles[tile.from.row]?.[tile.from.col] || groupImages.value[tile.id] || ''
      board.value = pushed.board; tileImages.value = tiles; erasedCells.value = erased
      animationPhase.value = 'clear'
      animationTimer = setTimeout(finish, 1100)
    }, 750)
  } else {
    animationPhase.value = 'clear'
    animationTimer = setTimeout(finish, 1100)
  }
}
function undo() {
  cancelAnimation()
  const previous = history.value.pop()
  if (previous) { restore(previous); calculate() }
}
function resetBoard() { cancelAnimation(); erasedCells.value = []; emptySample = null; initialBoard.value = []; recognizedGrid.value = null; emptyImage.value = ''; correctionMode.value = false; board.value = []; moves.value = []; history.value = []; editing.value = null; groupImages.value = {}; tileImages.value = [] }
function loadDemo() {
  imageUrl.value = ''; source = null; error.value = ''; notice.value = '这是演示棋盘，可体验建议、校正与撤销。'
  resetBoard()
  board.value = [[1, 1, 2, 3], [4, 0, 2, 3], [4, 5, 5, 0], [6, 0, 0, 6]]
  initialBoard.value = board.value.map(row => [...row])
  erasedCells.value = board.value.map(row => row.map(() => false))
  calculate()
}
function loadPushDemo() {
  imageUrl.value = ''; source = null; error.value = ''; notice.value = '鸡腿向右推动一格，右边三块一起移动，再与下方鸡腿消除。'
  resetBoard()
  board.value = [[1, 2, 3, 4, 0, 0], [5, 1, 6, 7, 8, 9]]
  initialBoard.value = board.value.map(row => [...row])
  erasedCells.value = board.value.map(row => row.map(() => false))
  calculate()
}
function autoLocate() {
  if (!source) return
  const ctx = source.getContext('2d')!
  const grid = detectGrid(ctx.getImageData(0, 0, source.width, source.height))
  if (grid) {
    crop.value = grid; rows.value = grid.rows; cols.value = grid.cols
    notice.value = '已估计棋盘范围和行列，请核对是否包含所有空格。'
  } else {
    crop.value = { x: 0, y: 0, width: source.width, height: source.height, rows: rows.value, cols: cols.value }
    notice.value = '未能自动定位。请在图片上拖框选择棋盘，并设置行列数。'
  }
}
function recognize() {
  if (!source) return
  error.value = ''
  if (![rows.value, cols.value].every(v => Number.isInteger(v) && v >= 1 && v <= 24) || !Number.isFinite(threshold.value) || threshold.value < 5 || threshold.value > 65) {
    error.value = '行列数需为 1–24 的整数，合并阈值需为 5–65。'; return
  }
  const { x, y, width, height } = crop.value
  if (width / cols.value < 4 || height / rows.value < 4) { error.value = '范围太小，请重新框选清晰的棋盘。'; return }
  const ctx = source.getContext('2d')!
  const patches = [], thumbnails: string[] = []
  const tile = document.createElement('canvas'); tile.width = tile.height = 64
  const tileCtx = tile.getContext('2d')!
  for (let r = 0; r < rows.value; r++) for (let c = 0; c < cols.value; c++) {
    const sx = x + c * width / cols.value, sy = y + r * height / rows.value
    tileCtx.clearRect(0, 0, 64, 64)
    tileCtx.drawImage(ctx.canvas, sx, sy, width / cols.value, height / rows.value, 0, 0, 64, 64)
    patches.push(tileCtx.getImageData(0, 0, 64, 64)); thumbnails.push(tile.toDataURL())
  }
  const ids = classifyTiles(patches, threshold.value)
  resetBoard()
  tileImages.value = Array.from({ length: rows.value }, (_, r) => thumbnails.slice(r * cols.value, (r + 1) * cols.value))
  ids.forEach((id, index) => { if (id && !groupImages.value[id]) groupImages.value[id] = thumbnails[index] })
  board.value = Array.from({ length: rows.value }, (_, r) => ids.slice(r * cols.value, (r + 1) * cols.value))
  initialBoard.value = board.value.map(row => [...row])
  erasedCells.value = board.value.map(row => row.map(() => false))
  recognizedGrid.value = { ...crop.value, rows: rows.value, cols: cols.value }
  const blankIndex = ids.findIndex(id => id === 0)
  emptyImage.value = blankIndex >= 0 ? thumbnails[blankIndex] : ''
  emptySample = blankIndex >= 0 ? { row: Math.floor(blankIndex / cols.value), col: blankIndex % cols.value } : null
  // A full starting board has no empty tile sample: use the surrounding board color.
  const sample = ctx.getImageData(Math.max(0, Math.floor(x) - 6), Math.min(source.height - 1, Math.floor(y + height / 2)), 1, 1).data
  emptyColor.value = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`
  notice.value = '识别完成，请核对相同图案的编号及空格。识别按图片相似度分组，未进行语义识别。'
  calculate()
}
function point(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return { x: Math.max(0, Math.min(source!.width, (event.clientX - rect.left) / rect.width * source!.width)),
    y: Math.max(0, Math.min(source!.height, (event.clientY - rect.top) / rect.height * source!.height)) }
}
function startCrop(event: PointerEvent) {
  if (!source || event.button !== 0) return
  priorCrop = { ...crop.value }; cropStart = point(event)
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function moveCrop(event: PointerEvent) {
  if (!cropStart || !source) return
  const end = point(event)
  crop.value = { ...crop.value, x: Math.min(end.x, cropStart.x), y: Math.min(end.y, cropStart.y), width: Math.abs(end.x - cropStart.x), height: Math.abs(end.y - cropStart.y) }
}
function finishCrop(event: PointerEvent) {
  if (!cropStart) return
  moveCrop(event)
  if (crop.value.width < 8 || crop.value.height < 8) cancelCrop()
  else { cropStart = null; priorCrop = null }
}
function cancelCrop() { if (priorCrop) crop.value = priorCrop; cropStart = null; priorCrop = null }

async function loadFile(file: File) {
  if (busy.value) return
  error.value = ''; notice.value = ''
  if (!file.type.startsWith('image/')) { error.value = '请选择图片文件。'; return }
  if (file.size > 25 * 1024 * 1024) { error.value = '图片超过 25 MB，请压缩后再试。'; return }
  busy.value = true
  const url = URL.createObjectURL(file)
  try {
    const img = new Image(); img.src = url; await img.decode()
    if (disposed) return
    if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 40_000_000) throw new Error('图片尺寸过大，请缩小后重试。')
    setSource(img, img.naturalWidth, img.naturalHeight)
  } catch (e) { error.value = e instanceof Error && e.message.includes('尺寸') ? e.message : '图片读取失败，请使用 PNG、JPG 或 WebP 截图重试。' }
  finally { URL.revokeObjectURL(url); busy.value = false }
}
function setSource(image: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, 1400 / Math.max(width, height))
  const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  imageSize.value = { width: canvas.width, height: canvas.height }
  source = canvas; imageUrl.value = canvas.toDataURL('image/png'); resetBoard(); autoLocate()
}
function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) void loadFile(input.files[0])
  input.value = ''
}
function onDrop(event: DragEvent) { if (event.dataTransfer?.files[0]) void loadFile(event.dataTransfer.files[0]) }
function onPaste(event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.items ?? []).find(item => item.type.startsWith('image/'))?.getAsFile()
  if (file) { event.preventDefault(); void loadFile(file) }
}
async function pasteClipboard() {
  error.value = ''
  if (!navigator.clipboard?.read) { error.value = '当前浏览器不支持读取图片，请按 Ctrl / ⌘ + V 或上传截图。'; return }
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const type = item.types.find(t => t.startsWith('image/'))
      if (type) { const blob = await item.getType(type); await loadFile(new File([blob], 'clipboard.png', { type })); return }
    }
    error.value = '剪贴板中没有图片，请先复制图片或截图。'
  } catch { error.value = '未能读取剪贴板，请按 Ctrl / ⌘ + V 粘贴或上传截图。' }
}
async function captureScreen() {
  error.value = ''; notice.value = ''
  if (!navigator.mediaDevices?.getDisplayMedia) { error.value = '当前浏览器不支持截取屏幕，请使用系统截图后粘贴或上传。'; return }
  busy.value = true
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    if (disposed) return
    const video = document.createElement('video'); video.srcObject = stream; video.muted = true; video.playsInline = true
    await video.play()
    if (!disposed) setSource(video, video.videoWidth, video.videoHeight)
    video.pause(); video.srcObject = null
  } catch (e) {
    error.value = e instanceof DOMException && e.name === 'NotAllowedError' ? '屏幕选择已取消或未获授权，可改为上传或粘贴截图。' : '截取画面失败，请使用系统截图后粘贴或上传。'
  } finally { stream?.getTracks().forEach(track => track.stop()); stream = null; busy.value = false }
}
onMounted(() => document.addEventListener('paste', onPaste))
onUnmounted(() => { cancelAnimation(); disposed = true; document.removeEventListener('paste', onPaste); stream?.getTracks().forEach(track => track.stop()) })
</script>

<style scoped>
.brick-assistant { --accent: #13815f; --ink: #233c35; --muted: #6c7f77; max-width: 1320px; margin: auto; padding: 32px; color: var(--ink); font-size: 14px; }
.brick-assistant, .brick-assistant * { box-sizing: border-box; }
.intro { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; overflow: hidden; padding: 32px 36px; border: 1px solid #dbece1; border-radius: 24px; background: radial-gradient(ellipse at top right, #d2edc3 0, transparent 65%), #edf7f0; }
.eyebrow, .section-kicker { display: block; color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 10px; }
h1 { display: flex; align-items: center; gap: 12px; font-size: clamp(24px, 3vw, 32px); line-height: 1.3; letter-spacing: -.8px; margin: 0 0 12px; } h2 { font-size: 18px; line-height: 1.4; margin: 0; }
p { line-height: 1.75; } .intro p { margin: 0; color: #577165; }
.hero-icon { display: grid; place-items: center; width: 48px; height: 48px; background: #fff9; border: 1px solid white; border-radius: 15px; font-size: 28px; }
.local-badge { display: inline-flex; align-items: center; gap: 7px; color: #42715b; margin-top: 18px; font-size: 12px; }.local-badge > span { color: #389369; font-size: 9px; }
.hero-art { flex: 0 0 140px; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; transform: rotate(-9deg); margin-right: 18px; }.hero-art span { display: grid; place-items: center; height: 62px; font-size: 34px; border: 2px solid #fff; border-radius: 16px; background: #fff9e6; box-shadow: 0 6px 0 #b2ceab55; }.hero-art span:nth-child(2), .hero-art span:nth-child(3) { background: #f9fff3; }
.workflow { display: flex; gap: 12px; padding: 0; margin: 24px 0; list-style: none; }.workflow li { flex: 1; display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 10px; color: #7b8982; border: 1px solid #e4ebe6; background: #fff; font-size: 13px; }.workflow li > span { font-size: 11px; font-weight: 700; color: #93a49a; }.workflow .current { color: #12684c; background: #e6f3eb; border-color: #a9d4bb; font-weight: 600; }.workflow .current > span, .workflow .complete > span { color: var(--accent); }
.panel { background: #fff; border: 1px solid #e3ebe6; padding: 24px; border-radius: 18px; margin-bottom: 22px; min-width: 0; box-shadow: 0 4px 18px #234b3511; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }.section-kicker { font-size: 10px; letter-spacing: 1px; margin-bottom: 5px; }.section-note { color: #8b9991; font-size: 12px; }
.import-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }.import-action { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 18px; text-align: left; background: #fafcfb; border-color: #e4ece7; border-radius: 14px; }.import-action strong { font-size: 14px; font-weight: 600; }.import-action small { font-size: 12px; color: var(--muted); line-height: 1.5; }.action-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; color: var(--accent); background: #e8f2ec; font-size: 24px; line-height: 1; margin-bottom: 4px; }.import-action.featured { background: #f0f8f2; border-color: #a8d4b6; }.import-action.featured .action-icon { color: white; background: var(--accent); }
.demo-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; margin-top: 18px; color: var(--muted); font-size: 12px; }.demo-actions button { padding: 4px 0; min-height: 32px; border: 0; background: transparent; color: var(--accent); font-size: 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
button, input, select { font: inherit; border: 1px solid #dce6df; border-radius: 9px; background: white; padding: 10px 13px; color: var(--ink); }
button { cursor: pointer; min-height: 44px; transition: border-color .15s, background-color .15s, box-shadow .15s; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }button:disabled { opacity: .45; cursor: not-allowed; }button:focus-visible, input:focus-visible { outline: 3px solid #66b89a; outline-offset: 3px; }
button.primary { background: var(--accent); border-color: var(--accent); color: white; font-weight: 600; box-shadow: 0 3px 7px #13815f22; }
@media (hover: hover) { button:not(:disabled):hover { border-color: #75b596; color: var(--accent); background: #f0f8f3; }button.primary:not(:disabled):hover { background: #0c6a4c; color: #fff; }.import-action:not(:disabled):hover { box-shadow: 0 4px 12px #234b3510; } }
.hint { font-size: 12px; color: var(--muted); line-height: 1.8; }.import-panel > .hint { margin-bottom: 0; }.error, .notice, .warning { font-size: 13px; padding: 12px 14px; border-radius: 9px; }.error { color: #b23c3c; background: #fff0ef; }.notice { color: #23764e; background: #edf7f0; }.warning { color: #936523; background: #fff7e8; }
.crop-layout { display: grid; grid-template-columns: minmax(0, 1fr) 250px; gap: 24px; align-items: start; }
.source-image { position: relative; max-width: 580px; touch-action: none; user-select: none; cursor: crosshair; line-height: 0; }
.source-image > img { width: 100%; display: block; }.crop-box { position: absolute; box-shadow: inset 0 0 0 2px #16b77b; pointer-events: none; background: #16b77b11; }
.crop-grid { position: absolute; inset: 0; width: 100%; height: 100%; }.crop-grid line { stroke: #05dcaa; stroke-width: 1; vector-effect: non-scaling-stroke; stroke-dasharray: 4 3; }.crop-numbers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.crop-box span { font-size: 12px; line-height: 20px; position: absolute; top: 0; left: 0; color: white; background: #16865d; padding: 2px 6px; white-space: nowrap; }
.crop-controls { display: grid; gap: 12px; padding: 16px; border-radius: 12px; background: #f7faf8; }label { display: grid; gap: 8px; font-size: 12px; color: #577165; }input, select { width: 100%; min-width: 0; }
.analysis-layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(285px, .8fr); gap: 22px; align-items: start; }.analysis-layout .panel { margin-bottom: 0; }
.live-badge, .move-count { white-space: nowrap; font-size: 11px; padding: 5px 9px; background: #edf7f0; color: var(--accent); border-radius: 20px; }
.board-stats { display: flex; justify-content: space-between; gap: 10px; padding: 14px 0; margin-bottom: 12px; border-block: 1px solid #edf1ee; color: var(--muted); font-size: 11px; }.board-stats strong { color: var(--ink); font-size: 16px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.original-tile { display: flex; align-items: center; gap: 12px; margin-top: 12px; }.original-tile img { width: 64px; height: 64px; border: 1px solid #dce6df; border-radius: 8px; }
.editor { padding: 14px; border: 1px solid #b9dac9; background: #f2f9f5; border-radius: 12px; }.palette { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }.palette button { display: flex; align-items: center; gap: 4px; padding: 5px 8px; }.palette img { width: 30px; height: 30px; }
.empty-state { color: var(--muted); padding: 20px; background: #f7faf8; border-radius: 12px; }summary { cursor: pointer; font-size: 12px; margin: 18px 0 12px; min-height: 44px; align-content: center; }.suggestions details { max-height: 420px; overflow-y: auto; overscroll-behavior: contain; }.move-option { display: flex; align-items: center; gap: 10px; text-align: left; font-size: 12px; width: 100%; margin: 6px 0; }.move-option.active { border-color: #89c3a7; background: #edf8f2; }
.push-instruction { background: #edf8f2; border: 1px solid #cce6d6; border-radius: 12px; padding: 16px; font-weight: 600; color: #166b4e; }.rule-description { font-weight: 600; font-size: 13px; }
.pair-thumb { width: 36px; height: 36px; object-fit: cover; border-radius: 7px; }.crop-settings > summary { font-weight: 600; font-size: 16px; margin: 0; }.crop-settings[open] > summary { margin-bottom: 16px; }.board-toolbar { position: sticky; top: 0; z-index: 8; background: #ffffffed; backdrop-filter: blur(12px); padding: 10px 0; }.edit-active { border-color: #13815f; color: var(--accent); background: #edf8f2; }
@media (max-width: 1100px) { .brick-assistant { padding: 24px; }.analysis-layout { grid-template-columns: minmax(0, 1fr) 285px; gap: 16px; }.panel { padding: 20px; }.import-action { padding: 14px; }.import-action small { font-size: 11px; } }
@media (max-width: 900px) { .analysis-layout { grid-template-columns: 1fr; }.import-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }.crop-layout { grid-template-columns: minmax(0, 1fr) 230px; }.suggestions { margin-top: 0; }.hero-art { flex-basis: 120px; }.hero-art span { height: 52px; font-size: 28px; } }
@media (max-width: 600px) { .brick-assistant { padding: 16px 12px calc(24px + env(safe-area-inset-bottom)); }.intro { padding: 24px 20px; border-radius: 18px; }.intro-copy { position: relative; z-index: 1; }.intro p { max-width: 235px; font-size: 12px; }.hero-icon { width: 38px; height: 38px; font-size: 23px; border-radius: 12px; }h1 { font-size: 23px; gap: 8px; }.hero-art { position: absolute; right: -32px; bottom: -16px; width: 100px; opacity: .2; margin: 0; }.hero-art span { height: 44px; font-size: 25px; }.eyebrow { font-size: 10px; }.local-badge { margin-top: 14px; font-size: 11px; }.workflow { margin: 16px 0; gap: 6px; }.workflow li { padding: 10px 7px; gap: 5px; font-size: 11px; justify-content: center; }.workflow li > span { font-size: 10px; }.panel { padding: 18px 14px; border-radius: 15px; margin-bottom: 16px; }.section-heading { margin-bottom: 16px; }h2 { font-size: 17px; }.section-note { display: none; }.import-actions { gap: 8px; }.import-action { padding: 14px 12px; gap: 6px; }.import-action strong { font-size: 13px; }.import-action small { font-size: 11px; }.action-icon { width: 32px; height: 32px; font-size: 22px; }.demo-actions { gap: 6px 12px; }.demo-actions > span { width: 100%; }.demo-actions button { min-height: 44px; }.crop-layout { grid-template-columns: 1fr; gap: 16px; }.crop-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 12px; }.crop-controls .hint, .crop-numbers { grid-column: 1 / -1; }.crop-controls input { font-size: 16px; }.crop-controls label { min-width: 0; }.board-toolbar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }.board-toolbar > .primary { grid-column: 1 / -1; }.board-toolbar button { padding: 10px 6px; font-size: 12px; }.board-stats { gap: 4px; font-size: 10px; }.board-stats strong { font-size: 15px; margin-right: 2px; }.analysis-layout { gap: 16px; }.suggestions .actions { display: grid; grid-template-columns: 1fr 1fr; }.suggestions .actions button { font-size: 12px; padding-inline: 6px; }.live-badge { font-size: 10px; }.original-tile { align-items: flex-start; }.original-tile img { flex-shrink: 0; }.move-option { gap: 8px; } }
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>
