<template>
  <div class="brick-tool" :class="{ 'has-board': hasBoard, dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
    <header v-if="hasBoard" class="bar">
      <ul class="bar-stats">
        <li><b>{{ remaining }}</b> 剩余</li>
        <li><b>{{ groupIds.length }}</b> 图案</li>
        <li><b>{{ board.length }} × {{ board[0].length }}</b> 棋盘</li>
      </ul>
      <button v-if="reviewItems.length" class="chip warn review-chip" :title="`${reviewItems.length} 处分组需要确认：相似但未合并，或刚达标的一对`" @click="showReview = true">⚠ {{ reviewItems.length }} 处分组待确认</button>
      <span v-else-if="warnGroups.length" class="chip warn" :title="`图案 ${warnGroups.join('、')} 的数量为奇数，请检查漏识别或错误分组`">⚠ 图案 {{ warnGroups.join('、') }} 数量为奇数</span>
      <div class="bar-actions">
        <span class="bar-note"><span aria-hidden="true">●</span> 本地处理</span>
        <button class="ghost" data-test="undo" :disabled="!history.length" @click="undo">撤销</button>
        <button class="ghost" data-test="review-toggle" :class="{ on: showReview }" @click="showReview = !showReview">核对</button>
        <button class="ghost" data-test="settings-toggle" :class="{ on: showSettings }" @click="showSettings = !showSettings">微调</button>
        <button class="ghost" data-test="import-toggle" @click="showImport = true">换一张图</button>
      </div>
    </header>

    <section v-if="!hasBoard || showImport" class="import" :class="{ sheet: hasBoard }" :aria-label="hasBoard ? '导入新的游戏画面' : '导入游戏画面'">
      <div class="import-inner">
        <button v-if="hasBoard" class="sheet-close" aria-label="关闭" @click="showImport = false">✕</button>
        <span class="import-icon" aria-hidden="true">🧱</span>
        <h2>导入游戏画面</h2>
        <p class="import-lead">拖入截图、粘贴，或用下面的方式：</p>
        <div class="import-actions">
          <button class="import-action primary" :disabled="busy" @click="upload?.click()"><span aria-hidden="true">↥</span>上传图片</button>
          <button class="import-action" :disabled="busy" @click="camera?.click()"><span aria-hidden="true">◎</span>拍照</button>
          <button class="import-action" data-test="capture" :disabled="busy" @click="captureScreen"><span aria-hidden="true">▣</span>截取画面</button>
          <button class="import-action" :disabled="busy" @click="pasteClipboard"><span aria-hidden="true">▤</span>粘贴</button>
        </div>
        <div class="import-links">
          <span>先试一下</span>
          <button data-test="push-demo" :disabled="busy" @click="loadPushDemo">鸡腿推动示例 ↗</button>
          <button data-test="demo" :disabled="busy" @click="loadDemo">试用示例 ↗</button>
        </div>
        <p class="hint">也可直接拖入图片，或按 Ctrl / ⌘ + V 粘贴。手机可拍照或从相册选择，拍照时请正对棋盘。图片只在本地处理。</p>
        <p v-if="busy" class="status" role="status">正在读取画面…</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="notice && !hasBoard" class="notice" role="status">{{ notice }}</p>
      </div>
      <input ref="upload" hidden type="file" accept="image/*" @change="onFile" />
      <input ref="camera" hidden type="file" accept="image/*" capture="environment" @change="onFile" />
    </section>

    <template v-if="hasBoard">
      <section class="strip">
        <div class="strip-row">
          <span class="strip-label">下一步</span>
          <strong class="strip-title">{{ moveTitle }}</strong>
          <span class="strip-meta"><span v-if="moves.length">{{ moves.length }} 组可选 · </span>框内推动 → 同图案直线消除</span>
          <button class="primary" :disabled="animating" @click="calculate">计算下一步</button>
          <button class="ghost" :class="{ on: showTips }" aria-label="规则与提示" @click="showTips = !showTips">规则</button>
        </div>
        <div v-if="showTips" class="strip-tips">
          <p>只推动起点处连续相邻的一组，隔着空格的砖块会挡住去路；中间有障碍不能消除。所有移动都受外框限制，不能拐弯或绕到框外。</p>
          <p>演示顺序是先推动整段砖块，再消除无遮挡的配对，完成后自动标出下一步。游戏有掉落、移动或重排时，请重新截取画面。</p>
        </div>
        <div v-if="moves.length" class="strip-pairs">
          <button v-for="(move, index) in moves.slice(0, 30)" :key="index" :title="`${position(move.from)} ↔ ${position(move.to)}`" :disabled="animating" class="move-option" :class="{ active: selectedMove === index }" @click="selectedMove = index; editing = null">
            <span class="index">{{ index + 1 }}</span>
            <img v-if="tileImages[move.from.row]?.[move.from.col]" class="pair-thumb" :src="tileImages[move.from.row][move.from.col]" alt="第一块" />
            <span aria-hidden="true">↔</span>
            <img v-if="tileImages[move.to.row]?.[move.to.col]" class="pair-thumb" :src="tileImages[move.to.row][move.to.col]" alt="第二块" />
            <span class="pair-note">{{ move.push ? `${directionLabel[move.push.direction]}推 ${move.push.distance}` : '直接消除' }}</span>
          </button>
        </div>
        <p v-if="!currentMove" class="muted">{{ remaining ? '没有找到可直接消除或推动一次后消除的操作，请核对棋盘范围与图案分组。' : '棋盘已清空，可以导入新的游戏画面。' }}</p>
      </section>

      <div v-if="error || notice || correctionMode" class="messages">
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>
        <p v-if="correctionMode" class="status">校正中：点击任意格子，为该格选择图案或设为空格。<template v-if="oddGroups.length">图案 {{ oddGroups.join('、') }} 的数量为奇数，注意漏识别或错误分组。</template></p>
      </div>

      <section ref="stageEl" class="stage" :style="stageStyle">
        <BrickImageBoard :image-url="imageUrl" :image-width="imageSize.width" :image-height="imageSize.height" :grid="recognizedGrid" :tiles="tileRects" :frames="showFrames"
          :board="board" :initial-board="initialBoard" :erased-cells="erasedCells" :tile-images="tileImages" :empty-image="emptyImage" :empty-color="emptyColor"
          :move="currentMove" :animating="animating" :phase="animationPhase" :editing="editing" :show-groups="correctionMode" @select="selectCell" @pushed="landPush" />
        <div v-if="editing" class="editor">
          <div class="editor-head">
            <strong>第 {{ editing.row + 1 }} 行 · 第 {{ editing.col + 1 }} 列</strong>
            <button class="ghost" @click="editing = null">完成</button>
          </div>
          <div v-if="tileImages[editing.row]?.[editing.col]" class="original-tile"><img :src="tileImages[editing.row][editing.col]" :style="cellAspect(editing)" alt="当前格子的原始图片" /><span class="hint">原始格子，请对照选择图案</span></div>
          <div class="palette">
            <button data-test="set-empty" @click="setCell(0)">空格</button>
            <button v-for="id in groupIds" :key="id" :title="`设为图案 ${id}`" @click="setCell(id)">
              <img v-if="groupImages[id]" :src="groupImages[id]" alt="" />{{ id }}
            </button>
            <button @click="setCell(Math.max(0, ...groupIds) + 1)">新图案</button>
          </div>
        </div>
        <div class="dock">
          <button class="primary" data-test="apply" :disabled="animating || !currentMove" @click="simulate(true)">{{ animating ? '播放中…' : '▶ 播放并消除' }}</button>
          <button v-if="animating" data-test="stop" @click="cancelAnimation">取消</button>
          <button data-test="preview" :disabled="animating || !currentMove" @click="simulate(false)">单步演示</button>
          <span class="dock-sep" aria-hidden="true"></span>
          <button data-test="edit-toggle" :disabled="animating" :class="{ on: correctionMode }" @click="correctionMode = !correctionMode; editing = null">{{ correctionMode ? '完成校正' : '校正图案' }}</button>
          <button data-test="toggle-frames" :class="{ on: showFrames }" @click="showFrames = !showFrames">{{ showFrames ? '隐藏边框' : '显示边框' }}</button>
        </div>
      </section>

      <section v-if="showReview" class="sheet review" aria-label="分组核对">
        <div class="sheet-body">
          <button class="sheet-close" aria-label="关闭" @click="showReview = false; picked = []">✕</button>
          <header class="card-head"><h2>分组核对</h2><span>分数越小越像，阈值 {{ threshold }}</span></header>
          <ul v-if="reviewItems.length" class="review-list">
            <li v-for="item in reviewItems" :key="item.key" class="review-item">
              <div class="review-pair">
                <img v-if="tileImages[item.a.row]?.[item.a.col]" :src="tileImages[item.a.row][item.a.col]" alt="第一块" />
                <span class="review-sign" aria-hidden="true">{{ item.kind === 'merge' ? '≠?' : '=?' }}</span>
                <img v-if="tileImages[item.b.row]?.[item.b.col]" :src="tileImages[item.b.row][item.b.col]" alt="第二块" />
              </div>
              <div class="review-text">
                <p v-if="item.kind === 'merge'">图案 {{ item.groupA }} 与图案 {{ item.groupB }} 很像但没到合并线（{{ Math.round(item.score) }} &gt; {{ Math.round(item.limit) }}），是同一图案吗？</p>
                <p v-else>图案 {{ item.groupA }} 共 {{ item.count }} 块，数量是奇数，其中这一对分数 {{ Math.round(item.score) }} 刚过线（阈值 {{ Math.round(item.limit) }}），确实是同一个图案吗？</p>
                <span class="review-where">{{ position(item.a) }} · {{ position(item.b) }}</span>
              </div>
              <div class="review-actions">
                <template v-if="item.kind === 'merge'">
                  <button class="primary" @click="mergeReview(item)">合并为一类</button>
                  <button @click="dismissReview(item)">不是同一类</button>
                </template>
                <template v-else>
                  <button class="primary" @click="confirmReview(item)">确实是同一图案</button>
                  <button @click="splitReview(item)">拆成新图案</button>
                </template>
              </div>
            </li>
          </ul>
          <p v-else class="muted">自动分组没有发现模棱两可的情况。</p>
          <div class="review-manual">
            <h3>手动合并</h3>
            <p class="hint">反光、遮挡会把同一个图案拆成两个编号：点两个编号，就能把它们并成一类。</p>
            <div class="review-groups">
              <button v-for="group in reviewGroups" :key="group.id" class="review-group" :class="{ picked: picked.includes(group.id), single: group.count < 2 }"
                :title="`图案 ${group.id}：${group.count} 块`" @click="togglePick(group.id)">
                <img v-if="group.image" :src="group.image" alt="" />
                <span class="review-group-id">{{ group.id }}</span>
                <span class="review-group-count">{{ group.count }}</span>
              </button>
            </div>
            <div class="review-manual-actions">
              <button class="primary" :disabled="picked.length !== 2" @click="mergePicked">合并这两个图案</button>
              <button :disabled="!picked.length" @click="picked = []">清除选择</button>
              <span v-if="picked.length === 1" class="hint">再点一个编号</span>
            </div>
          </div>
          <p class="hint">合并会把两组并成一类；拆开会把其中一块单独分到新图案，之后还能在「校正图案」里手动修改。</p>
        </div>
      </section>

      <section v-if="showSettings && imageUrl" class="sheet settings" aria-label="棋盘范围与识别设置">
        <div class="sheet-body">
          <button class="sheet-close" aria-label="关闭" @click="showSettings = false">✕</button>
          <header class="card-head"><h2>棋盘范围与识别</h2><span>自动定位不满意时再微调</span></header>
          <div class="crop-layout">
            <div ref="sourceEl" class="source-image" :class="{ 'perspective-picking': perspectiveMode }" @pointerdown="startPick" @pointermove="movePick" @pointerup="endPick" @pointercancel="endPick">
              <img :src="previewUrl" alt="导入的游戏画面，拖动以选择棋盘" draggable="false" />
              <span v-if="pickingOriginal" class="picking-badge">原图取点</span>
              <svg v-if="quadPreview" class="quad-preview" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
                <polygon :points="quadPreview" />
              </svg>
              <button v-for="(point, index) in perspectivePoints" :key="index" type="button" class="perspective-point"
                :data-test="`perspective-point-${index}`"
                :style="{ left: `${point.x / previewSize.width * 100}%`, top: `${point.y / previewSize.height * 100}%` }"
                :aria-label="`第 ${index + 1} 个角点，可拖动调整`" @pointerdown.stop="grabPoint(index, $event)">{{ index + 1 }}</button>
              <span v-if="inferredCorner" class="perspective-point inferred" data-test="perspective-point-inferred"
                :style="{ left: `${inferredCorner.x / previewSize.width * 100}%`, top: `${inferredCorner.y / previewSize.height * 100}%` }"
                aria-hidden="true">4</span>
              <div v-if="!pickingOriginal" class="crop-box" :style="cropStyle">
                <svg class="crop-grid" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                  <line v-for="n in previewCols - 1" :key="`c${n}`" :x1="n / previewCols" :x2="n / previewCols" y1="0" y2="1" />
                  <line v-for="n in previewRows - 1" :key="`r${n}`" :y1="n / previewRows" :y2="n / previewRows" x1="0" x2="1" />
                </svg>
                <span>{{ rows }} 行 × {{ cols }} 列</span>
              </div>
            </div>
            <div class="crop-controls">
              <div class="field-row">
                <label>行数<input v-model.number="rows" type="number" min="1" max="24" @change="manualGrid = true" /></label>
                <label>列数<input v-model.number="cols" type="number" min="1" max="24" @change="manualGrid = true" /></label>
                <label>合并阈值<input v-model.number="threshold" type="number" min="5" max="65" /></label>
              </div>
              <div class="field-row">
                <label>左边距<input data-test="crop-x" type="number" min="0" step="0.1" :value="roundedCrop('x')" @change="updateCrop('x', $event)" /></label>
                <label>上边距<input data-test="crop-y" type="number" min="0" step="0.1" :value="roundedCrop('y')" @change="updateCrop('y', $event)" /></label>
                <label>宽度<input data-test="crop-width" type="number" min="4" step="0.1" :value="roundedCrop('width')" @change="updateCrop('width', $event)" /></label>
                <label>高度<input data-test="crop-height" type="number" min="4" step="0.1" :value="roundedCrop('height')" @change="updateCrop('height', $event)" /></label>
              </div>
              <p class="hint">分格线要对齐砖块边缘。不同图案被合并时调低阈值，相同图案被拆开时调高。</p>
              <div class="button-row">
                <button data-test="auto-locate" @click="autoLocate">自动定位</button>
                <button data-test="perspective-toggle" :class="{ on: perspectiveMode }" @click="togglePerspective">{{ perspectiveMode ? `取点中 · ${perspectivePoints.length} 点` : '三点 / 四点透视' }}</button>
                <button v-if="perspectivePoints.length" data-test="perspective-undo" @click="undoPoint">撤销一点</button>
                <button v-if="perspectivePoints.length" data-test="perspective-clear" @click="clearPoints">清除点</button>
                <button v-if="perspectivePoints.length >= 3" class="primary" data-test="perspective-apply" @click="applyPerspective">应用透视校正</button>
                <button v-if="rectified" data-test="restore-original" @click="restoreOriginal">还原原图</button>
                <button class="primary" data-test="recognize" @click="recognizeAction">重新识别</button>
              </div>
              <p v-if="perspectiveMode" class="hint">依次点击左上、右上、右下三个角（顺时针）；第 4 个角会自动推算，想更精确可再点一下左下角。</p>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import BrickImageBoard from '../components/BrickImageBoard.vue'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { ANIMATION_SLACK_MS, CLEAR_MS, PUSH_MS } from '../utils/brick-animation'
import { recognizeBoardPixels } from '../utils/brick-recognition'
import { analyzeTiles, applyMove, detectBoard, expandQuad, findMoves, needsRectification, pushTiles, quadFromPoints, rectifyPerspective, reviewGrouping } from '../utils/brick-assistant'
import type { Board, Cell, Detection, Grid, GroupReview, Move, Pixels, Point, Quad, TileAnalysis, TileRect } from '../utils/brick-assistant'

const upload = ref<HTMLInputElement>(), camera = ref<HTMLInputElement>()
const imageUrl = ref(''), error = ref(''), notice = ref(''), busy = ref(false)
const rows = ref(14), cols = ref(10), threshold = ref(26)
const crop = ref<Grid>({ x: 0, y: 0, width: 1, height: 1, rows: 14, cols: 10 })
const board = ref<Board>([]), groupImages = ref<Record<number, string>>({})
const tileImages = ref<string[][]>([])
const moves = ref<Move[]>([]), selectedMove = ref(0)
const editing = ref<Cell | null>(null), history = ref<Snapshot[]>([])
const animating = ref(false), correctionMode = ref(false), perspectiveMode = ref(false), perspectivePoints = ref<Point[]>([])
const detection = ref<Detection | null>(null), sourceEl = ref<HTMLElement | null>(null)
const manualGrid = ref(false), rectified = ref(false), tileRects = ref<TileRect[]>([]), showFrames = ref(true)
const showImport = ref(false), showSettings = ref(false), showTips = ref(false), showReview = ref(false), dragging = ref(false)
const tileAnalysis = ref<TileAnalysis | null>(null)
/** Two pattern numbers the user picked to merge by hand, for the cases the scores cannot settle. */
const picked = ref<number[]>([])
/** Suggestions the user already answered, so they do not come back after every edit. */
const dismissed = ref(new Set<string>())
const stageEl = ref<HTMLElement | null>(null), stageCap = ref(0)
// The board scales to the space the stage actually has; the ResizeObserver is optional so
// tests and older browsers simply fall back to the component's own viewport-based cap.
let stageObserver: ResizeObserver | null = null
watch(stageEl, el => {
  stageObserver?.disconnect()
  stageObserver = null
  if (!el || typeof ResizeObserver === 'undefined') return
  stageObserver = new ResizeObserver(entries => {
    const height = entries[0]?.contentRect.height ?? 0
    if (height) stageCap.value = Math.max(140, Math.round(height - 16))
  })
  stageObserver.observe(el)
})
onBeforeUnmount(() => { stageObserver?.disconnect(); stageObserver = null })
const stageStyle = computed(() => stageCap.value ? { '--stage-cap': `${stageCap.value}px` } : {})
const originalUrl = ref(''), originalSize = ref({ width: 1, height: 1 })
let originalCanvas: HTMLCanvasElement | null = null
let dragPoint: number | null = null
const imageSize = ref({ width: 1, height: 1 }), recognizedGrid = ref<Grid | null>(null)
const erasedCells = ref<boolean[][]>([])
let emptySample: Cell | null = null
const initialBoard = ref<Board>([]), emptyImage = ref(''), emptyColor = ref('#956322')
interface Snapshot { board: Board; erased: boolean[][]; tiles: string[][] }
let animationSnapshot: Snapshot | null = null
let animationMove: Move | null = null
let animationCommit = false
const animationPhase = ref<'idle' | 'push' | 'clear'>('idle')
const directionLabel = { right: '向右', left: '向左', up: '向上', down: '向下' }
let animationTimer: ReturnType<typeof setTimeout> | undefined
let source: HTMLCanvasElement | null = null
let confirmedGeometry: { canvas: HTMLCanvasElement; quad: Quad } | null = null
let cropStart: { x: number; y: number } | null = null
let priorCrop: Grid | null = null
let stream: MediaStream | null = null
let disposed = false
const currentMove = computed(() => moves.value[selectedMove.value])
const hasBoard = computed(() => board.value.length > 0)
const moveTitle = computed(() => {
  const move = currentMove.value
  if (!move) return remaining.value ? '暂无可执行的操作' : '棋盘已清空'
  return move.push ? `${directionLabel[move.push.direction]}推 ${move.push.distance} 格 · 带动 ${move.push.tiles.length} 块` : '直接消除一对'
})
const groupIds = computed(() => [...new Set(board.value.flat().filter(Boolean))].sort((a, b) => a - b))
const remaining = computed(() => board.value.flat().filter(Boolean).length)
const oddGroups = computed(() => groupIds.value.filter(id => board.value.flat().filter(v => v === id).length % 2))
// A handful of odd counts is a useful hint that grouping went wrong; a real board always has many.
const warnGroups = computed(() => oddGroups.value.length > 0 && oddGroups.value.length <= 4 ? oddGroups.value : [])
/**
 * Borderline groupings worth a human yes/no: two groups that only just missed the merge limit,
 * and an odd group whose weakest pair only just passed it. Answered cases stay answered.
 */
const reviewItems = computed(() => {
  const analysis = tileAnalysis.value
  if (!analysis || !board.value.length) return []
  return reviewGrouping(board.value, analysis.distance, analysis.limit)
    .filter(item => !dismissed.value.has(item.key))
    .slice(0, 12)
})
const reviewGroups = computed(() => {
  const seen = new Map<number, { id: number; count: number; image: string }>()
  board.value.forEach((row, r) => row.forEach((id, c) => {
    if (!id) return
    const entry = seen.get(id)
    if (entry) entry.count++
    else seen.set(id, { id, count: 1, image: groupImages.value[id] || tileImages.value[r]?.[c] || '' })
  }))
  return [...seen.values()].sort((one, two) => one.id - two.id)
})
function togglePick(id: number) {
  const index = picked.value.indexOf(id)
  if (index >= 0) picked.value = picked.value.filter(value => value !== id)
  else picked.value = picked.value.length >= 2 ? [picked.value[1], id] : [...picked.value, id]
}
function mergePicked() {
  if (picked.value.length !== 2) return
  const [keep, drop] = [...picked.value].sort((one, two) => one - two)
  board.value = board.value.map(row => row.map(id => id === drop ? keep : id))
  if (!groupImages.value[keep]) groupImages.value[keep] = groupImages.value[drop] ?? ''
  delete groupImages.value[drop]
  picked.value = []
  dismissed.value = new Set()
  notice.value = `已把图案 ${drop} 并入图案 ${keep}。`
  calculate()
}
function dismiss(key: string) { const next = new Set(dismissed.value); next.add(key); dismissed.value = next }
function mergeReview(item: GroupReview) {
  const keep = item.groupA, drop = item.groupB
  board.value = board.value.map(row => row.map(id => id === drop ? keep : id))
  if (!groupImages.value[keep]) groupImages.value[keep] = groupImages.value[drop] ?? ''
  delete groupImages.value[drop]
  notice.value = `已把图案 ${drop} 并入图案 ${keep}。`
  calculate()
}
function splitReview(item: GroupReview) {
  const next = Math.max(0, ...board.value.flat()) + 1
  const rows = board.value.map(row => [...row])
  rows[item.b.row][item.b.col] = next
  board.value = rows
  if (!groupImages.value[next]) groupImages.value[next] = tileImages.value[item.b.row]?.[item.b.col] ?? ''
  notice.value = `已把第 ${item.b.row + 1} 行第 ${item.b.col + 1} 列拆成图案 ${next}。`
  calculate()
}
function dismissReview(item: GroupReview) { dismiss(item.key) }
function confirmReview(item: GroupReview) { dismiss(item.key) }
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
  animationSnapshot = null; animationMove = null; animating.value = false; animationPhase.value = 'idle'
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
  animationSnapshot = takeSnapshot()
  animationMove = currentMove.value
  animationCommit = commit
  editing.value = null; correctionMode.value = false; animating.value = true
  if (currentMove.value.push) {
    animationPhase.value = 'push'
    // The push ends with its CSS animation so the tiles land exactly on the cells that take over;
    // the timer is only a fallback for a dropped event or a skipped animation.
    animationTimer = setTimeout(landPush, PUSH_MS + ANIMATION_SLACK_MS)
  } else {
    animationPhase.value = 'clear'
    animationTimer = setTimeout(finishAnimation, CLEAR_MS + ANIMATION_SLACK_MS)
  }
}
function landPush() {
  const snapshot = animationSnapshot, move = animationMove
  if (animationPhase.value !== 'push' || !snapshot || !move?.push) return
  clearTimeout(animationTimer); animationTimer = undefined
  const pushed = pushTiles(snapshot.board, move.from, move.push.direction, move.push.distance)
  const tiles = snapshot.tiles.map(row => [...row]), erased = snapshot.erased.map(row => [...row])
  for (const tile of pushed.tiles) {
    erased[tile.from.row][tile.from.col] = true; erased[tile.to.row][tile.to.col] = true
    if (tiles[tile.from.row]) tiles[tile.from.row][tile.from.col] = ''
  }
  for (const tile of pushed.tiles) if (tiles[tile.to.row]) tiles[tile.to.row][tile.to.col] = snapshot.tiles[tile.from.row]?.[tile.from.col] || groupImages.value[tile.id] || ''
  board.value = pushed.board; tileImages.value = tiles; erasedCells.value = erased
  animationPhase.value = 'clear'
  animationTimer = setTimeout(finishAnimation, CLEAR_MS + ANIMATION_SLACK_MS)
}
function finishAnimation() {
  animationTimer = undefined
  const snapshot = animationSnapshot, move = animationMove
  if (!snapshot || !move) { cancelAnimation(); return }
  if (!animationCommit) { cancelAnimation(); return }
  history.value.push(snapshot)
  board.value = applyMove(snapshot.board, move)
  for (const cell of move.path) erasedCells.value[cell.row][cell.col] = true
  // The image layer is independent from the numeric board. Clear every source
  // and destination used by the move, otherwise a solved brick remains painted
  // over the screenshot after the animation ends.
  const tiles = tileImages.value.map(row => [...row])
  for (const cell of move.path) if (tiles[cell.row]) tiles[cell.row][cell.col] = ''
  tileImages.value = tiles
  animationSnapshot = null; animationMove = null; animating.value = false; animationPhase.value = 'idle'
  calculate()
}
function undo() {
  cancelAnimation()
  const previous = history.value.pop()
  if (previous) { restore(previous); calculate() }
}
function resetBoard() { cancelAnimation(); erasedCells.value = []; emptySample = null; initialBoard.value = []; recognizedGrid.value = null; emptyImage.value = ''; correctionMode.value = false; board.value = []; moves.value = []; history.value = []; editing.value = null; groupImages.value = {}; tileImages.value = []; tileRects.value = []; tileAnalysis.value = null; dismissed.value = new Set() }
function forgetDetection() { detection.value = null; perspectivePoints.value = []; perspectiveMode.value = false; dragPoint = null }
function loadDemo() {
  showImport.value = false; showSettings.value = false; showReview.value = false
  imageUrl.value = ''; source = null; originalCanvas = null; originalUrl.value = ''; rectified.value = false; error.value = ''; notice.value = '这是演示棋盘，可体验建议、校正与撤销。'
  forgetDetection()
  resetBoard()
  board.value = [[1, 1, 2, 3], [4, 0, 2, 3], [4, 5, 5, 0], [6, 0, 0, 6]]
  initialBoard.value = board.value.map(row => [...row])
  erasedCells.value = board.value.map(row => row.map(() => false))
  calculate()
}
function loadPushDemo() {
  showImport.value = false; showSettings.value = false; showReview.value = false
  imageUrl.value = ''; source = null; originalCanvas = null; originalUrl.value = ''; rectified.value = false; error.value = ''; notice.value = '鸡腿向右推动一格，右边三块一起移动，再与下方鸡腿消除。'
  forgetDetection()
  resetBoard()
  board.value = [[1, 2, 3, 4, 0, 0], [5, 1, 6, 7, 8, 9]]
  initialBoard.value = board.value.map(row => [...row])
  erasedCells.value = board.value.map(row => row.map(() => false))
  calculate()
}
const readPixels = (canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
const polygonOf = (quad: Quad) => [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  .map(point => `${point.x / previewSize.value.width * 1000} ${point.y / previewSize.value.height * 1000}`).join(' ')
// Corner picking always shows the untouched import: the straightened copy has no
// perspective left to correct, and repeated corrections would compound distortion.
const pickingOriginal = computed(() => perspectiveMode.value && !!originalUrl.value)
const previewUrl = computed(() => pickingOriginal.value ? originalUrl.value : imageUrl.value)
const previewSize = computed(() => pickingOriginal.value ? originalSize.value : imageSize.value)
const quadPreview = computed(() => { const quad = quadFromPoints(perspectivePoints.value); return quad ? polygonOf(quad) : '' })
const inferredCorner = computed(() => {
  if (perspectivePoints.value.length !== 3) return null
  const [topLeft, topRight, bottomRight] = perspectivePoints.value
  return { x: topLeft.x + bottomRight.x - topRight.x, y: topLeft.y + bottomRight.y - topRight.y }
})
function applyDetection(result: Detection) {
  detection.value = result
  manualGrid.value = false
  rows.value = result.rows; cols.value = result.cols
  crop.value = { ...result.grid, rows: result.rows, cols: result.cols }
}
function replaceSource(pixels: Pixels) {
  const canvas = document.createElement('canvas')
  canvas.width = pixels.width; canvas.height = pixels.height
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height), 0, 0)
  source = canvas
  imageSize.value = { width: canvas.width, height: canvas.height }
  imageUrl.value = canvas.toDataURL('image/png')
  rectified.value = true
}
// Photos shot at an angle are straightened first, so the grid can stay a plain lattice.
function straighten(quad: Quad, base: HTMLCanvasElement | null = source, keepFrame = false) {
  if (!source || !base) return false
  try {
    const span = Math.max(1, Math.min(24, Math.round(Math.max(rows.value, cols.value))))
    const cell = Math.round(Math.max(44, Math.min(110, 1400 / span)))
    // Confirmed inner corners define the full grid; uncertain fits retain a margin.
    replaceSource(rectifyPerspective(readPixels(base), (keepFrame ? quad : expandQuad(quad, 0.02)), Math.round(cols.value * cell), Math.round(rows.value * cell)))
    const frame = keepFrame ? { topLeft: { x: 0, y: 0 }, topRight: { x: source.width, y: 0 }, bottomRight: { x: source.width, y: source.height }, bottomLeft: { x: 0, y: source.height } } : undefined
    confirmedGeometry = frame ? { canvas: source, quad: frame } : null
    const again = safeDetect(frame)
    if (again) applyDetection(again)
    else {
      detection.value = null
      crop.value = { x: 0, y: 0, width: source.width, height: source.height, rows: rows.value, cols: cols.value }
    }
    return true
  } catch { return false }
}
function safeDetect(frame?: Quad): Detection | null {
  if (!source) return null
  try { return detectBoard(readPixels(source), frame ?? (confirmedGeometry?.canvas === source ? confirmedGeometry.quad : undefined)) } catch { return null }
}
function locateBoard() {
  if (!source) return false
  error.value = ''
  const result = safeDetect()
  if (!result) {
    detection.value = null
    crop.value = { x: 0, y: 0, width: source.width, height: source.height, rows: rows.value, cols: cols.value }
    notice.value = '未能自动定位棋盘。可拖框选择棋盘范围，或用三点透视校正点击左上、右上、右下三个角。'
    return false
  }
  applyDetection(result)
  if (needsRectification(result)) {
    if (!straighten(result.quad, source, result.framed)) { notice.value = '检测到棋盘但拉正失败，已按原图识别，可手动框选后重试。'; return true }
    notice.value = '已自动定位并拉正倾斜的画面，请核对分格线。'
  } else {
    notice.value = '已自动定位棋盘范围与行列，请核对分格线。'
  }
  return true
}
function autoLocate() { if (locateBoard()) recognize() }
function recognizeAction() { recognize() }
function clampCrop() {
  const width = source?.width ?? 1, height = source?.height ?? 1
  const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback
  const x = Math.min(Math.max(0, finite(crop.value.x, 0)), Math.max(0, width - 4))
  const y = Math.min(Math.max(0, finite(crop.value.y, 0)), Math.max(0, height - 4))
  const boxWidth = Math.min(Math.max(4, finite(crop.value.width, width)), width - x)
  const boxHeight = Math.min(Math.max(4, finite(crop.value.height, height)), height - y)
  crop.value = { x, y, width: boxWidth, height: boxHeight, rows: crop.value.rows, cols: crop.value.cols }
  return { x, y, width: boxWidth, height: boxHeight }
}
function recognize() {
  if (!source) return
  try { recognizePixels() } catch { error.value = '识别时出了点问题，请重新框选棋盘或点「自动定位」后再试。' }
}
function recognizePixels() {
  error.value = ''
  if (![rows.value, cols.value].every(v => Number.isInteger(v) && v >= 1 && v <= 24) || !Number.isFinite(threshold.value) || threshold.value < 5 || threshold.value > 65) {
    error.value = '行列数需为 1–24 的整数，合并阈值需为 5–65。'; return
  }
  const found = detection.value
  // The detector reads the gaps between tiles, so its grid wins unless the user typed
  // a row/column count by hand.
  if (found && !manualGrid.value && (found.rows !== rows.value || found.cols !== cols.value)) {
    rows.value = found.rows; cols.value = found.cols
    crop.value = { ...found.grid, rows: found.rows, cols: found.cols }
  }
  const { x, y, width, height } = clampCrop()
  if (width / cols.value < 4 || height / rows.value < 4) { error.value = '框选范围太小，请拖框重新选择完整棋盘，或点「自动定位」。'; return }
  const ctx = source.getContext('2d')!
  const pixels = readPixels(source)
  const result = recognizeBoardPixels(pixels, { x, y, width, height, rows: rows.value, cols: cols.value }, found, threshold.value)
  const tile = document.createElement('canvas'); tile.width = tile.height = 64
  const tileCtx = tile.getContext('2d')!
  const thumbnails = result.patches.map(patch => {
    const frame = tileCtx.createImageData(patch.width, patch.height)
    frame.data.set(patch.data)
    tileCtx.putImageData(frame, 0, 0)
    return tile.toDataURL()
  })
  const ids = result.board.flat()
  resetBoard()
  tileAnalysis.value = analyzeTiles(result.patches, threshold.value)
  tileRects.value = result.rects
  tileImages.value = Array.from({ length: rows.value }, (_, r) => thumbnails.slice(r * cols.value, (r + 1) * cols.value))
  ids.forEach((id, index) => { if (id && !groupImages.value[id]) groupImages.value[id] = thumbnails[index] })
  board.value = result.board
  initialBoard.value = board.value.map(row => [...row])
  erasedCells.value = board.value.map(row => row.map(() => false))
  recognizedGrid.value = { ...crop.value, rows: rows.value, cols: cols.value }
  const blankIndex = ids.findIndex(id => id === 0)
  emptyImage.value = blankIndex >= 0 ? thumbnails[blankIndex] : ''
  emptySample = blankIndex >= 0 ? { row: Math.floor(blankIndex / cols.value), col: blankIndex % cols.value } : null
  // A full starting board has no empty tile sample: use the surrounding board color.
  const sample = ctx.getImageData(Math.max(0, Math.floor(x) - 6), Math.min(source.height - 1, Math.floor(y + height / 2)), 1, 1).data
  emptyColor.value = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`
  notice.value = '识别完成，请核对相同图案的编号及空格；识别按图片相似度分组，未做语义识别。'
  calculate()
}
/**
 * Crops are resampled to a square for comparing, so show this one at the shape of the outline it
 * was cut from: then the picture in the dialog and the dashed frame on the board are the same
 * piece of the screenshot.
 */
function cellAspect(cell: Cell | null) {
  const rect = cell && tileRects.value.find(item => item.row === cell.row && item.col === cell.col)
  return rect && rect.width > 0 && rect.height > 0 ? { aspectRatio: `${rect.width} / ${rect.height}` } : undefined
}
function point(event: PointerEvent): Point {
  const rect = (sourceEl.value ?? (event.currentTarget as HTMLElement)).getBoundingClientRect()
  const width = previewSize.value.width || 1, height = previewSize.value.height || 1
  return {
    x: Math.max(0, Math.min(width, (event.clientX - rect.left) / Math.max(1, rect.width) * width)),
    y: Math.max(0, Math.min(height, (event.clientY - rect.top) / Math.max(1, rect.height) * height)),
  }
}
function startPick(event: PointerEvent) {
  if (!source) return
  if (!perspectiveMode.value) { startCrop(event); return }
  if (dragPoint !== null || perspectivePoints.value.length >= 4) return
  perspectivePoints.value = [...perspectivePoints.value, point(event)]
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  if (perspectivePoints.value.length >= 3) notice.value = '已选 3 点，第 4 个角会自动推算；可拖动圆点微调，或点「应用透视校正」。'
}
function grabPoint(index: number, event: PointerEvent) {
  if (index >= perspectivePoints.value.length) return
  dragPoint = index
  sourceEl.value?.setPointerCapture?.(event.pointerId)
}
function movePick(event: PointerEvent) {
  if (dragPoint !== null) {
    const next = [...perspectivePoints.value]
    next[dragPoint] = point(event)
    perspectivePoints.value = next
    return
  }
  moveCrop(event)
}
function endPick(event: PointerEvent) {
  if (dragPoint !== null) { dragPoint = null; return }
  finishCrop(event)
}
function undoPoint() {
  perspectivePoints.value = perspectivePoints.value.slice(0, -1)
  notice.value = perspectivePoints.value.length ? '已撤销最后一个点，可重新点选。' : '已清空定位点，请重新点击左上、右上、右下三个角。'
}
function clearPoints() { perspectivePoints.value = []; perspectiveMode.value = false; notice.value = '' }
function startCrop(event: PointerEvent) {
  if (perspectiveMode.value || !source || event.button !== 0) return
  priorCrop = { ...crop.value }; cropStart = point(event)
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}
function moveCrop(event: PointerEvent) {
  if (perspectiveMode.value || !cropStart || !source) return
  const end = point(event)
  crop.value = { ...crop.value, x: Math.min(end.x, cropStart.x), y: Math.min(end.y, cropStart.y), width: Math.abs(end.x - cropStart.x), height: Math.abs(end.y - cropStart.y) }
}
function finishCrop(event: PointerEvent) {
  if (perspectiveMode.value || !cropStart) return
  moveCrop(event)
  if (crop.value.width < 8 || crop.value.height < 8) cancelCrop()
  else { cropStart = null; priorCrop = null }
}
function cancelCrop() { if (priorCrop) crop.value = priorCrop; cropStart = null; priorCrop = null }
function togglePerspective() {
  perspectiveMode.value = !perspectiveMode.value
  if (perspectiveMode.value) {
    perspectivePoints.value = []
    notice.value = '在画面上依次点击棋盘的左上、右上、右下三个角；第 4 个角自动推算，也可继续点左下角。'
  }
}
function restoreOriginal() {
  if (!originalCanvas) return
  cancelAnimation()
  source = originalCanvas
  imageUrl.value = originalUrl.value
  imageSize.value = { ...originalSize.value }
  rectified.value = false
  perspectiveMode.value = false; perspectivePoints.value = []; dragPoint = null
  resetBoard()
  detection.value = null
  const result = safeDetect()
  if (result) applyDetection(result)
  else crop.value = { x: 0, y: 0, width: imageSize.value.width, height: imageSize.value.height, rows: rows.value, cols: cols.value }
  recognize()
  notice.value = '已还原为导入的原图，可以重新框选、重新定位或用三点透视校正。'
}
function applyPerspective() {
  const quad = quadFromPoints(perspectivePoints.value)
  if (!quad || !source) { error.value = '请至少选择左上、右上、右下三个角点。'; return }
  error.value = ''
  if (!straighten(quad, originalCanvas ?? source)) { error.value = '透视校正失败，请重新点选三个角点。'; return }
  perspectiveMode.value = false
  perspectivePoints.value = []
  if (!detection.value) {
    // No lattice found on the straightened image: fall back to an even grid so the
    // board and the suggested move are still refreshed.
    crop.value = { x: 0, y: 0, width: source.width, height: source.height, rows: rows.value, cols: cols.value }
  }
  recognize()
  notice.value = detection.value
    ? '透视校正完成，已按砖块边缘重新识别，请核对分格线。'
    : '透视校正完成，但未能检测到砖块网格，已按设置的行列平均切分，可再拖动框选或调整行列。'
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('decode'))
    image.src = url
  })
}
async function loadFile(file: File) {
  if (busy.value) return
  error.value = ''; notice.value = ''
  const looksImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/i.test(file.name)
  if (!looksImage) { error.value = '请选择图片文件（PNG、JPG、WebP 截图）。'; return }
  if (file.size > 25 * 1024 * 1024) { error.value = '图片超过 25 MB，请压缩后再试。'; return }
  busy.value = true
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    if (disposed) return
    if (!img.naturalWidth || !img.naturalHeight) { error.value = '图片是空的，请重新选择或重新截图。'; return }
    if (img.naturalWidth * img.naturalHeight > 40_000_000) { error.value = '图片尺寸过大（超过 4000 万像素），请缩小后重试。'; return }
    setSource(img, img.naturalWidth, img.naturalHeight)
  } catch {
    error.value = '这个图片无法解码。iPhone 拍照的 HEIC 格式请先在相册里导出为 JPG，或直接上传截图（PNG / JPG / WebP）。'
  } finally { URL.revokeObjectURL(url); busy.value = false }
}
function setSource(image: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, 1400 / Math.max(width, height))
  const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  imageSize.value = { width: canvas.width, height: canvas.height }
  source = canvas; imageUrl.value = canvas.toDataURL('image/png')
  originalCanvas = canvas; originalUrl.value = imageUrl.value; originalSize.value = { width: canvas.width, height: canvas.height }
  rectified.value = false
  resetBoard()
  // Imports are detected and recognised straight away: on a phone the fewest taps win.
  autoLocate()
  showImport.value = false
  showSettings.value = !board.value.length
}
function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) void loadFile(input.files[0])
  input.value = ''
}
function onDrop(event: DragEvent) { dragging.value = false; if (event.dataTransfer?.files[0]) void loadFile(event.dataTransfer.files[0]) }
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
.brick-tool {
  --accent: #2563eb; --accent-ink: #1d4ed8; --accent-soft: #eef3ff;
  --ink: #1f2430; --muted: #6b7280; --line: #e3e6ec; --surface: #fff; --soft: #f4f5f7;
  display: flex; flex-direction: column; gap: 10px;
  height: 100%; min-height: 0; color: var(--ink); font-size: 13px;
}
.brick-tool, .brick-tool * { box-sizing: border-box; }
button { font: inherit; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 0 10px; min-height: 32px; cursor: pointer; transition: background .15s, border-color .15s, color .15s; }
button:not(:disabled):hover { border-color: #c6cdd9; background: var(--soft); }
button:disabled { opacity: .45; cursor: default; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
button.primary:not(:disabled):hover { background: var(--accent-ink); border-color: var(--accent-ink); color: #fff; }
button.ghost { border-color: transparent; background: transparent; color: var(--muted); padding: 0 8px; }
button.ghost:not(:disabled):hover { background: var(--soft); color: var(--ink); }
button.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

/* ---- top bar ---- */
.bar { display: flex; flex: 0 0 auto; align-items: center; gap: 12px; padding: 6px 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
.bar-stats { display: flex; align-items: center; gap: 16px; margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: 12px; white-space: nowrap; }
.bar-stats b { color: var(--ink); font-weight: 600; margin-right: 4px; font-variant-numeric: tabular-nums; }
.bar-actions { display: flex; align-items: center; gap: 2px; margin-left: auto; }
.bar-note { display: inline-flex; align-items: center; gap: 5px; margin-right: 6px; color: var(--muted); font-size: 11px; white-space: nowrap; }
.bar-note span { color: #16a34a; font-size: 8px; }
.chip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; white-space: nowrap; }
.chip.warn { color: #92400e; background: #fffbeb; border: 1px solid #fbe3a5; }
.chip.review-chip { min-height: 26px; padding: 3px 10px; font: inherit; font-size: 11px; cursor: pointer; }
.chip.review-chip:hover { background: #fef3c7; border-color: #f5d78a; }

/* ---- import: the empty state, and the sheet once a board is open ---- */
.import { flex: 1 1 auto; display: grid; place-items: center; min-height: 0; padding: 8px; }
.import-inner { position: relative; width: min(680px, 100%); min-height: 300px; display: flex; flex-direction: column; justify-content: center; padding: 36px 28px; text-align: center; background: var(--surface); border: 1px dashed #ccd4e0; border-radius: 16px; }
.import-icon { display: block; font-size: 36px; line-height: 1; }
.brick-tool.dragging .import-inner { border-color: var(--accent); border-style: solid; background: var(--accent-soft); }
.import-inner h2 { margin: 12px 0 6px; font-size: 17px; font-weight: 600; }
.import-lead { margin: 0 0 16px; color: var(--muted); font-size: 12.5px; }
.import-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.import-action { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; font-size: 12.5px; }
.import-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 14px; margin-top: 16px; color: var(--muted); font-size: 12px; }
.import-links button { min-height: 28px; border-color: transparent; background: transparent; color: var(--accent); }
.hint { margin: 12px auto 0; max-width: 460px; color: var(--muted); font-size: 11.5px; line-height: 1.6; }
.status { margin: 8px 0 0; color: var(--muted); font-size: 12px; }
.error, .notice { margin: 8px 0 0; padding: 7px 10px; border-radius: 8px; font-size: 12px; text-align: left; border: 1px solid transparent; }
.error { color: #b91c1c; background: #fef2f2; border-color: #f6d5d5; }
.notice { color: var(--accent-ink); background: var(--accent-soft); border-color: #d3e0ff; }

/* ---- next-move strip ---- */
.strip { flex: 0 0 auto; display: grid; gap: 8px; padding: 9px 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
.strip-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.strip-label { color: var(--muted); font-size: 11px; letter-spacing: .6px; }
.strip-title { font-size: 15px; font-weight: 600; }
.strip-meta { margin-right: auto; color: var(--muted); font-size: 11.5px; }
.strip-tips { display: grid; gap: 4px; padding: 8px 10px; background: var(--soft); border-radius: 8px; }
.strip-tips p { margin: 0; color: var(--muted); font-size: 11.5px; line-height: 1.6; }
.strip-pairs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: thin; }
.strip-pairs .move-option { flex: 0 0 auto; margin: 0; min-height: 34px; padding: 0 9px 0 7px; border-radius: 999px; }
.move-option { display: flex; align-items: center; gap: 6px; font-size: 12px; text-align: left; }
.move-option.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.index { color: var(--muted); font-variant-numeric: tabular-nums; }
.pair-thumb { width: 24px; height: 24px; border: 1px solid var(--line); border-radius: 5px; object-fit: cover; }
.pair-note { color: var(--muted); font-size: 11px; white-space: nowrap; }
.muted { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; }

/* ---- board stage ---- */
.stage { position: relative; flex: 1 1 auto; display: flex; align-items: center; justify-content: center; min-height: 0; padding: 8px 8px 58px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
.messages { flex: 0 0 auto; display: grid; gap: 6px; }
.messages > p { margin: 0; font-size: 11.5px; }
.messages > .status { padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--muted); }
.editor { position: absolute; left: 12px; right: 12px; bottom: 68px; z-index: 7; display: grid; gap: 8px; max-height: 48%; overflow: auto; padding: 10px 12px; background: #fffffff5; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 12px 32px #0b12201c; }
.editor-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
.editor-head button { min-height: 26px; }
.original-tile { display: flex; align-items: center; gap: 10px; }
.original-tile img { flex: 0 0 auto; width: 52px; border: 1px solid var(--line); border-radius: 6px; }
.original-tile .hint { margin: 0; }
.palette { display: flex; flex-wrap: wrap; gap: 6px; }
.palette button { display: flex; align-items: center; gap: 5px; min-height: 30px; padding: 0 8px; font-size: 12px; }
.palette img { width: 22px; height: 22px; border-radius: 4px; object-fit: cover; }
.dock { position: absolute; left: 50%; bottom: 10px; z-index: 8; display: flex; align-items: center; gap: 2px; max-width: calc(100% - 24px); padding: 5px; transform: translateX(-50%); background: #ffffffec; border: 1px solid var(--line); border-radius: 999px; box-shadow: 0 10px 28px #0b122014; backdrop-filter: blur(8px); }
.dock button { min-height: 32px; padding: 0 12px; white-space: nowrap; border-color: transparent; background: transparent; border-radius: 999px; }
.dock button.on { background: var(--accent-soft); color: var(--accent); }
.dock button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
.dock button.primary:not(:disabled):hover { background: var(--accent-ink); border-color: var(--accent-ink); color: #fff; }
.dock-sep { width: 1px; height: 18px; margin: 0 2px; background: var(--line); }

/* ---- settings sheet ---- */
.import.sheet, .sheet { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 16px; background: #0f172a66; overflow: auto; }
.import.sheet .import-inner { text-align: left; border-style: solid; border-color: var(--line); box-shadow: 0 24px 60px #0b12202b; }
.sheet-body { position: relative; display: grid; gap: 14px; width: min(1000px, 100%); max-height: 92vh; overflow: auto; padding: 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 24px 60px #0b12202b; }
.sheet-close { position: absolute; top: 8px; right: 8px; width: 30px; min-height: 30px; padding: 0; border-color: transparent; background: transparent; color: var(--muted); }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-right: 34px; }
.card-head h2 { margin: 0; font-size: 15px; font-weight: 600; }
.card-head span { color: var(--muted); font-size: 11.5px; }
.review-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.review-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.review-pair { display: flex; align-items: center; gap: 6px; }
.review-pair img { width: 52px; height: 52px; object-fit: cover; border: 1px solid var(--line); border-radius: 8px; background: var(--soft); }
.review-sign { color: var(--muted); font-size: 13px; font-weight: 600; }
.review-text p { margin: 0; font-size: 12.5px; line-height: 1.6; }
.review-where { color: var(--muted); font-size: 11px; }
.review-actions { display: flex; gap: 6px; }
.review-actions button { min-height: 32px; white-space: nowrap; }
.review-manual { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
.review-manual h3 { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
.review-manual .hint { text-align: left; }
.review-groups { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.review-group { position: relative; display: grid; place-items: center; width: 46px; height: 46px; padding: 0; border: 1px solid var(--line); border-radius: 8px; background: var(--soft); cursor: pointer; overflow: hidden; }
.review-group img { width: 100%; height: 100%; object-fit: cover; }
.review-group.picked { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
.review-group-id { position: absolute; right: 2px; bottom: 1px; padding: 0 3px; border-radius: 4px; background: rgb(31 36 48 / 72%); color: #fff; font-size: 10px; line-height: 14px; }
.review-group-count { position: absolute; top: 1px; left: 2px; color: var(--ink); font-size: 10px; line-height: 13px; }
.review-group.single .review-group-count { color: #b45309; }
.review-manual-actions { display: flex; align-items: center; gap: 8px; }
.review-manual-actions button { min-height: 32px; }
.crop-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
.source-image { position: relative; overflow: hidden; max-width: 100%; background: var(--soft); border-radius: 8px; line-height: 0; cursor: crosshair; touch-action: none; user-select: none; }
.source-image > img { display: block; width: 100%; }
.crop-box { position: absolute; background: #2563eb14; box-shadow: inset 0 0 0 2px var(--accent); pointer-events: none; }
.crop-grid { position: absolute; inset: 0; width: 100%; height: 100%; }
.crop-grid line { stroke: var(--accent); stroke-width: 1; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
.crop-box span { position: absolute; top: 0; left: 0; padding: 2px 6px; background: var(--accent); color: #fff; font-size: 11px; line-height: 18px; white-space: nowrap; }
.crop-controls { display: grid; gap: 10px; }
.field-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 8px; }
label { display: grid; gap: 4px; color: var(--muted); font-size: 11.5px; }
input { width: 100%; min-width: 0; min-height: 32px; padding: 0 8px; color: var(--ink); font: inherit; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
input:focus-visible { outline: 2px solid var(--accent); outline-offset: -1px; }
.button-row { display: flex; flex-wrap: wrap; gap: 6px; }
.perspective-picking { outline: 2px dashed var(--accent); outline-offset: 3px; }
.quad-preview { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; pointer-events: none; }
.quad-preview polygon { fill: #2563eb1f; stroke: var(--accent); stroke-width: 2; stroke-dasharray: 7 5; vector-effect: non-scaling-stroke; }
.perspective-point { position: absolute; z-index: 5; display: grid; place-items: center; width: 40px; height: 40px; min-height: 0; margin: -20px 0 0 -20px; padding: 0; border: 2px solid #fff; border-radius: 50%; background: var(--accent); color: #fff; font-size: 13px; font-weight: 700; line-height: 1; box-shadow: 0 2px 8px #0b12205c; cursor: grab; touch-action: none; }
.perspective-point:active { cursor: grabbing; }
.perspective-point.inferred { background: #ffffffcc; border: 2px dashed var(--accent); color: var(--accent); pointer-events: none; }
.picking-badge { position: absolute; z-index: 6; top: 8px; left: 8px; padding: 3px 9px; border-radius: 14px; background: #2563ebee; color: #fff; font-size: 11px; pointer-events: none; }

@media (max-width: 900px) {
  .brick-tool { height: 100%; }
  .stage { flex: 0 0 auto; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; padding: 6px; }
  .dock { position: static; transform: none; margin-top: 8px; max-width: none; flex-wrap: wrap; justify-content: center; background: var(--soft); border-radius: 12px; box-shadow: none; backdrop-filter: none; }
  .editor { position: static; margin-top: 8px; max-height: none; }
  .crop-layout { grid-template-columns: 1fr; }
  .review-item { grid-template-columns: auto minmax(0, 1fr); }
  .review-actions { grid-column: 1 / -1; justify-content: flex-end; }
  .sheet-body { width: min(100%, 640px); }
}
@media (max-width: 600px) {
  .bar { flex-wrap: wrap; gap: 6px 8px; }
  .bar-stats { gap: 12px; font-size: 11px; }
  .bar-note { display: none; }
  .import { padding: 0; }
  .import-inner { padding: 22px 16px; border-radius: 14px; }
  .import-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .strip { padding: 8px 10px; gap: 6px; }
  .strip-title { font-size: 14px; }
  .strip-meta { order: 4; flex-basis: 100%; margin: 0; }
  .dock { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 6px; }
  .dock button.primary, .dock button[data-test='stop'] { grid-column: 1 / -1; }
  .dock button { border-color: var(--line); background: var(--surface); border-radius: 8px; min-height: 36px; padding: 0 8px; font-size: 12px; }
  .dock button.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-size: 13px; }
  .dock-sep { display: none; }
  .field-row { grid-template-columns: 1fr 1fr; }
  input { font-size: 16px; }
  .sheet, .import.sheet { padding: 8px; align-items: start; }
  .sheet-body { max-height: none; padding: 14px; }
  .perspective-point { width: 44px; height: 44px; margin: -22px 0 0 -22px; }
}
@media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>
