<template>
  <div class="page-container bitmap-view">
    <div class="card-container intro">
      <h2 class="page-title">图片转点阵</h2>
      <p>为 OLED / LED 生成单色位图与单片机数组。图片仅在本机处理。</p>
    </div>
    <div class="workspace">
      <section class="card-container settings">
        <h3>1. 图片与分辨率</h3>
        <div class="upload-area" :class="{ dragover }" @dragover.prevent="dragover = true" @dragleave.prevent="dragover = false" @drop.prevent="onDrop">
          <label for="bitmap-file">选择或拖入图片</label>
          <input id="bitmap-file" type="file" accept="image/*,.bmp" @change="onFileChange" />
          <p class="hint">PNG、JPEG、WebP、BMP 等浏览器可解码图片，最大 20 MB；输出为静态单色点阵</p>
        </div>
        <p v-if="source" class="hint file-name">{{ sourceName }} · {{ source.naturalWidth }} × {{ source.naturalHeight }}</p>
        <el-button class="sample-button" @click="loadSample">使用示例图片</el-button>
        <el-form label-position="top">
          <el-form-item label="常用分辨率">
            <el-select v-model="resolution" aria-label="常用分辨率" @change="applyResolution">
              <el-option label="自定义" value="custom" />
              <el-option v-for="size in resolutions" :key="size" :label="size.replace('x', ' × ')" :value="size" />
            </el-select>
          </el-form-item>
          <div class="two-fields">
            <el-form-item label="宽度（像素）"><el-input-number v-model="width" aria-label="宽度（像素）" :min="1" :max="1024" :precision="0" @change="resolution = 'custom'" /></el-form-item>
            <el-form-item label="高度（像素）"><el-input-number v-model="height" aria-label="高度（像素）" :min="1" :max="1024" :precision="0" @change="resolution = 'custom'" /></el-form-item>
          </div>
          <el-form-item label="缩放方式">
            <el-radio-group v-model="resizeMode"><el-radio value="contain">等比例（居中留白）</el-radio><el-radio value="stretch">强制转换（拉伸）</el-radio></el-radio-group>
            <p class="hint">输出始终为指定宽高。等比例保留完整图片，空白与透明区域使用白色背景。</p>
          </el-form-item>
          <el-form-item :label="`黑白阈值：${threshold}`"><el-slider v-model="threshold" :min="0" :max="255" aria-label="黑白阈值" /></el-form-item>
          <div class="two-fields switches"><el-checkbox v-model="invert">图片反色</el-checkbox><el-checkbox v-model="smooth">平滑缩放</el-checkbox></div>
        </el-form>
        <h3>2. 取模配置</h3>
        <el-form label-position="top">
          <el-form-item label="常见设备 / 图形库预设">
            <el-select v-model="preset" aria-label="设备预设" @change="applyPreset"><el-option label="自定义取模" value="custom" /><el-option v-for="item in BITMAP_PRESETS" :key="item.value" :label="item.label" :value="item.value" /></el-select>
            <p class="hint">{{ presetNote }}</p>
          </el-form-item>
          <div v-if="fixedFormat" class="format-note">{{ format === 'bmp' ? 'BMP 固定使用标准 1 位黑白图片编码，取模配置不影响 BMP。' : 'XBM 固定使用逐行式、低位在前、前景为 1，已锁定对应取模配置。' }}</div>
          <el-form-item label="点阵格式">
            <el-radio-group v-model="polarity" :disabled="fixedFormat" @change="preset = 'custom'"><el-radio value="positive">阴码（亮点 = 1）</el-radio><el-radio value="negative">阳码（亮点 = 0）</el-radio></el-radio-group>
          </el-form-item>
          <el-form-item label="取模方式">
            <el-select v-model="scan" aria-label="取模方式" :disabled="fixedFormat" @change="preset = 'custom'"><el-option v-for="item in SCAN_MODES" :key="item.value" :label="item.label" :value="item.value" /></el-select>
          </el-form-item>
          <el-form-item label="取模走向（字节内位顺序）">
            <el-radio-group v-model="bitOrder" :disabled="fixedFormat" @change="preset = 'custom'"><el-radio value="lsb">逆向（低位在前）</el-radio><el-radio value="msb">顺向（高位在前）</el-radio></el-radio-group>
          </el-form-item>
        </el-form>
        <div v-if="format !== 'bmp'" class="scan-help">
          <strong>取模说明</strong>
          <p>{{ scanDescription }}</p>
          <p>从左上角开始，{{ effectivePacking.bitOrder === 'lsb' ? '第一个点写入 bit0，随后 bit1…bit7' : '第一个点写入 bit7，随后 bit6…bit0' }}。末尾不足 8 点按背景补齐（阴码补 0，阳码补 1）。</p>
          <p>预览中的亮点对应原图深色部分。此处“走向”只改变字节内位顺序，不镜像图片。</p>
        </div>
      </section>
      <div class="output-column">
        <section class="card-container">
          <div class="section-heading"><h3>点阵预览</h3><el-tag v-if="bitmap">{{ bitmap.width }} × {{ bitmap.height }} · {{ format === 'bmp' ? `${bmp.length} 字节 BMP` : `${packed.length} 字节原始数据` }}</el-tag></div>
          <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
          <p v-if="loading" role="status" class="hint">正在读取图片…</p>
          <div v-show="bitmap" class="previews">
            <figure><figcaption>原图</figcaption><div class="source-preview"><img v-if="source" :src="source.src" alt="上传的原图" /></div></figure>
            <figure><figcaption>屏幕模拟 · 亮点为前景</figcaption><div class="matrix-preview"><canvas ref="previewCanvas" aria-label="转换后的点阵图片" :style="{ width: `${(bitmap?.width || 1) * zoom}px`, height: `${(bitmap?.height || 1) * zoom}px` }" /></div></figure>
          </div>
          <el-empty v-if="!bitmap && !loading" description="上传图片或使用示例，实时查看点阵效果" :image-size="90" />
          <div v-if="bitmap" class="zoom-control"><label>预览倍率</label><el-radio-group v-model="zoom" size="small"><el-radio-button :value="1">1×</el-radio-button><el-radio-button :value="2">2×</el-radio-button><el-radio-button :value="4">4×</el-radio-button><el-radio-button :value="8">8×</el-radio-button></el-radio-group></div>
        </section>
        <section class="card-container">
          <h3>3. 输出格式</h3>
          <el-form label-position="top">
            <el-form-item label="选择输出格式"><el-select v-model="format" aria-label="输出格式" @change="preset = 'custom'"><el-option v-for="item in formats" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
            <p class="hint output-note">{{ formatNote }}</p>
            <template v-if="isText">
              <el-form-item v-if="format !== 'hex'" :label="`数组名称：${safeIdentifier(textOptions.name)}${format === 'xbm' ? '_bits' : ''}`"><el-input v-model="textOptions.name" aria-label="数组名称" maxlength="64" /></el-form-item>
              <div class="two-fields">
                <el-form-item label="输出数制"><el-radio-group v-model="textOptions.radix"><el-radio :value="16">十六进制</el-radio><el-radio :value="10">十进制</el-radio></el-radio-group></el-form-item>
                <el-form-item label="每行字节数"><el-input-number v-model="textOptions.bytesPerLine" aria-label="每行字节数" :min="1" :max="64" :precision="0" /></el-form-item>
              </div>
              <template v-if="format === 'hex'">
                <el-checkbox v-model="textOptions.custom">自定义文本格式</el-checkbox>
                <div v-if="textOptions.custom" class="two-fields custom-fields"><el-form-item v-for="field in customFields" :key="field.key" :label="field.label"><el-input v-model="textOptions[field.key]" :aria-label="field.label" maxlength="80" /></el-form-item></div>
              </template>
            </template>
          </el-form>
          <p v-if="isText && !validTextOptions" class="hint" role="alert">请填写每行字节数（1–64 的整数）。</p>
          <div class="actions"><el-button type="primary" :disabled="!canExport" @click="download">下载 {{ extension.toUpperCase() }}</el-button><el-button v-if="isText" :disabled="!canExport" @click="copyOutput">复制完整数据</el-button><el-button :disabled="!hasValidBitmap" @click="downloadBmp">下载 BMP 兜底图片</el-button></div>
          <p v-if="bitmap" class="hint">{{ exportSize }} 字节{{ format === 'bin' ? '，纯数据，不含宽高和文件头' : '（当前导出文件）' }}</p>
          <textarea v-if="isText && bitmap" class="code-editor output-code" readonly aria-label="取模输出数据" :value="textPreview" spellcheck="false" />
          <p v-if="outputText.length > 24000 && isText" class="hint">预览仅显示前 24,000 个字符，复制和下载包含完整数据。</p>
          <details class="reference"><summary>格式与使用参考</summary><ul>
            <li><a href="https://github.com/adafruit/Adafruit_SSD1306" target="_blank" rel="noopener noreferrer">SSD1306 页缓冲</a>：x + (y / 8) × 宽度，bit = y % 8。</li>
            <li><a href="https://github.com/adafruit/Adafruit-GFX-Library/blob/master/Adafruit_GFX.cpp" target="_blank" rel="noopener noreferrer">Adafruit GFX</a>：drawBitmap 使用高位在前；drawXBitmap 使用低位在前。</li>
            <li><a href="https://github.com/olikraus/u8g2/wiki/u8g2reference#drawxbmp" target="_blank" rel="noopener noreferrer">U8g2 XBM</a>：每行独立补齐至完整字节。</li>
            <li><a href="https://learn.microsoft.com/en-us/windows/win32/api/wingdi/ns-wingdi-bitmapinfoheader" target="_blank" rel="noopener noreferrer">BMP</a>：1 位黑白调色板，自底向上，每行按 4 字节对齐。可交给其他取模软件继续转换。</li>
          </ul></details>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch, watchEffect } from 'vue'
import { ElMessage } from 'element-plus'
import { BITMAP_PRESETS, SCAN_MODES, encodeBmp, fitRect, formatBitmap, monochrome, packBitmap, safeIdentifier, validateSize } from '../utils/bitmap'
import type { BitOrder, MonoImage, OutputFormat, PackingOptions, Polarity, ScanMode, TextOptions } from '../utils/bitmap'

const source = shallowRef<HTMLImageElement | null>(null)
const sourceName = ref('')
const loading = ref(false)
const error = ref('')
const dragover = ref(false)
const width = ref(128)
const height = ref(64)
const resolution = ref('128x64')
const resolutions = ['8x8', '16x16', '32x16', '32x32', '64x32', '64x48', '128x32', '128x64', '128x128', '200x200', '240x128']
const resizeMode = ref<'contain' | 'stretch'>('contain')
const threshold = ref(128)
const invert = ref(false)
const smooth = ref(true)
const preset = ref('ssd1306')
const scan = ref<ScanMode>('column-row')
const bitOrder = ref<BitOrder>('lsb')
const polarity = ref<Polarity>('positive')
const format = ref<OutputFormat>('c')
const zoom = ref(4)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const bitmap = shallowRef<MonoImage | null>(null)
const textOptions = reactive<TextOptions>({ name: 'image', radix: 16, bytesPerLine: 16, custom: false, dataPrefix: '0x', dataSuffix: ',', linePrefix: '', lineSuffix: '' })
const customFields = [{ key: 'dataPrefix', label: '数据前缀' }, { key: 'dataSuffix', label: '数据后缀' }, { key: 'linePrefix', label: '行前缀' }, { key: 'lineSuffix', label: '行后缀' }] as const
const formats: { value: OutputFormat; label: string; note: string }[] = [
  { value: 'c', label: 'C / C++ 数组（.h）', note: '标准 uint8_t 数组，包含宽高定义与取模参数注释。' },
  { value: 'c51', label: 'Keil C51 数组（.h）', note: 'unsigned char code 数组，将数据存入 8051 程序存储区。' },
  { value: 'arduino', label: 'Arduino PROGMEM 数组（.h）', note: '带 Arduino.h 与 PROGMEM 修饰的数组；选择与绘图接口匹配的取模预设。' },
  { value: 'hex', label: '文本数据 / 自定义格式（.txt）', note: '支持十六进制、十进制和自定义数据/行前后缀。这是字节文本，不是 Intel HEX 固件文件。' },
  { value: 'bin', label: '原始二进制（.bin）', note: '直接导出取模字节。驱动需另外提供分辨率和取模参数。' },
  { value: 'xbm', label: 'XBM 位图源码（.xbm）', note: '标准逐行 LSB 位图源码，包含 width / height 定义和 bits 数组。' },
  { value: 'bmp', label: '1 位黑白 BMP（.bmp，兜底）', note: '标准黑白 BMP，保留当前分辨率、阈值与反色效果。文件有头部和调色板，不能直接当作屏幕缓冲区。' },
]
const fixedFormat = computed(() => format.value === 'bmp' || format.value === 'xbm')
const effectivePacking = computed<PackingOptions>(() => format.value === 'xbm'
  ? { scan: 'row', bitOrder: 'lsb', polarity: 'positive' }
  : { scan: scan.value, bitOrder: bitOrder.value, polarity: polarity.value })
watch(format, value => { if (value === 'xbm') { scan.value = 'row'; bitOrder.value = 'lsb'; polarity.value = 'positive' } })
const scanDescription = computed(() => SCAN_MODES.find(item => item.value === effectivePacking.value.scan)?.description)
const presetNote = computed(() => BITMAP_PRESETS.find(item => item.value === preset.value)?.note || '按驱动要求选择扫描、位顺序及极性；不同软件命名可能不同，请以取模说明为准。')
const formatNote = computed(() => formats.find(item => item.value === format.value)?.note)
const packed = computed(() => bitmap.value ? packBitmap(bitmap.value, effectivePacking.value) : new Uint8Array())
const bmp = computed(() => bitmap.value ? encodeBmp(bitmap.value) : new Uint8Array())
const isText = computed(() => !['bin', 'bmp'].includes(format.value))
const validTextOptions = computed(() => Number.isInteger(textOptions.bytesPerLine) && textOptions.bytesPerLine >= 1 && textOptions.bytesPerLine <= 64)
const outputText = computed(() => bitmap.value && isText.value && validTextOptions.value ? formatBitmap(packed.value, bitmap.value, format.value, effectivePacking.value, textOptions) : '')
const textPreview = computed(() => outputText.value.slice(0, 24000))
const exportSize = computed(() => format.value === 'bmp' ? bmp.value.length : format.value === 'bin' ? packed.value.length : new TextEncoder().encode(outputText.value).length)
const extension = computed(() => ({ c: 'h', c51: 'h', arduino: 'h', hex: 'txt', bin: 'bin', xbm: 'xbm', bmp: 'bmp' })[format.value])
const hasValidBitmap = computed(() => !!bitmap.value && !loading.value && !error.value)
const canExport = computed(() => hasValidBitmap.value && (!isText.value || validTextOptions.value))

function applyResolution(value: string) {
  if (value !== 'custom') [width.value, height.value] = value.split('x').map(Number)
}
function applyPreset(value: string) {
  const item = BITMAP_PRESETS.find(item => item.value === value)
  if (!item) return
  scan.value = item.packing.scan; bitOrder.value = item.packing.bitOrder; polarity.value = item.packing.polarity; format.value = item.format
  if (value === 'max7219') { resolution.value = '8x8'; applyResolution('8x8') }
}

let loadVersion = 0
let sourceUrl = ''
const urls = new Set<string>()
async function loadFile(file: File) {
  const version = ++loadVersion
  error.value = ''; loading.value = true; source.value = null
  if (sourceUrl) { URL.revokeObjectURL(sourceUrl); urls.delete(sourceUrl); sourceUrl = '' }
  let url = ''
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('图片不能超过 20 MB')
    url = URL.createObjectURL(file); urls.add(url)
    const image = new Image()
    image.src = url
    await image.decode()
    if (version !== loadVersion) return
    if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('原图像素超过 4000 万，请先缩小图片')
    sourceUrl = url; source.value = image; sourceName.value = file.name
    textOptions.name = file.name.replace(/\.[^.]+$/, '').slice(0, 64)
  } catch (reason) {
    if (version === loadVersion) {
      const message = reason instanceof Error ? reason.message : ''
      error.value = /^(图片|原图)/.test(message) ? message : '无法读取图片，请选择有效的 PNG、JPEG、WebP 或 BMP 图片'
    }
  } finally {
    if (url && url !== sourceUrl) { URL.revokeObjectURL(url); urls.delete(url) }
    if (version === loadVersion) loading.value = false
  }
}
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) void loadFile(input.files[0])
  input.value = ''
}
function onDrop(event: DragEvent) {
  dragover.value = false
  if (event.dataTransfer?.files[0]) void loadFile(event.dataTransfer.files[0])
}
function loadSample() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64"><rect width="128" height="64" fill="white"/><rect x="3" y="3" width="122" height="58" rx="8" fill="none" stroke="black" stroke-width="2"/><path d="M14 18h24v24H14zM20 12v6m12-6v6m-12 24v6m12-6v6M8 24h6m-6 12h6m24-12h6m-6 12h6" fill="none" stroke="black" stroke-width="3"/><text x="51" y="31" font-family="monospace" font-size="17" font-weight="bold">OLED</text><text x="51" y="47" font-family="monospace" font-size="11">128x64</text></svg>'
  void loadFile(new File([svg], 'oled-demo.svg', { type: 'image/svg+xml' }))
}

watchEffect(() => {
  bitmap.value = null
  if (!source.value) return
  try {
    validateSize(width.value, height.value)
    const canvas = document.createElement('canvas')
    canvas.width = width.value; canvas.height = height.value
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('浏览器不支持 Canvas 图片处理')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width.value, height.value)
    ctx.imageSmoothingEnabled = smooth.value
    const rect = fitRect(source.value.naturalWidth, source.value.naturalHeight, width.value, height.value, resizeMode.value)
    ctx.drawImage(source.value, rect.x, rect.y, rect.width, rect.height)
    bitmap.value = monochrome(ctx.getImageData(0, 0, width.value, height.value).data, width.value, height.value, threshold.value, invert.value)
    error.value = ''
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '图片转换失败' }
})
watchEffect(() => {
  if (!bitmap.value || !previewCanvas.value) return
  const { width, height, pixels } = bitmap.value
  const canvas = previewCanvas.value
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const frame = ctx.createImageData(width, height)
  pixels.forEach((pixel, i) => frame.data.set(pixel ? [151, 232, 247, 255] : [14, 25, 34, 255], i * 4))
  ctx.putImageData(frame, 0, 0)
}, { flush: 'post' })

function save(data: Uint8Array | string, ext: string, mime: string) {
  const blob = new Blob([typeof data === 'string' ? data : new Uint8Array(data).buffer], { type: mime })
  const url = URL.createObjectURL(blob); urls.add(url)
  const link = document.createElement('a')
  link.href = url; link.download = `${safeIdentifier(textOptions.name)}_${width.value}x${height.value}.${ext}`
  document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url) }, 1000)
}
function download() {
  if (!canExport.value) return
  if (format.value === 'bmp') downloadBmp()
  else if (format.value === 'bin') save(packed.value, 'bin', 'application/octet-stream')
  else save(outputText.value, extension.value, 'text/plain;charset=utf-8')
}
function downloadBmp() { if (hasValidBitmap.value) save(bmp.value, 'bmp', 'image/bmp') }
async function copyOutput() {
  if (!canExport.value) return
  try { await navigator.clipboard.writeText(outputText.value); ElMessage.success('完整数据已复制') }
  catch { ElMessage.error('复制失败，请下载文件或手动复制') }
}
onBeforeUnmount(() => { loadVersion++; urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() })
</script>

<style scoped>
.bitmap-view { max-width: 1600px; margin: 0 auto; }
.intro .page-title { margin-bottom: 10px; }
.intro p, .hint { color: #606266; font-size: 13px; line-height: 1.7; }
.workspace { display: grid; grid-template-columns: minmax(300px, 390px) minmax(0, 1fr); gap: 20px; align-items: start; }
.workspace .card-container { min-width: 0; }
.output-column, figure { min-width: 0; }
h3 { font-size: 17px; margin-bottom: 18px; }
.settings h3:not(:first-child) { margin-top: 28px; }
.upload-area { padding: 20px 12px; }
.upload-area label { display: block; color: #409eff; margin-bottom: 12px; cursor: pointer; }
.upload-area input { width: 100%; font-size: 12px; margin-bottom: 10px; }
.file-name { overflow-wrap: anywhere; margin-top: 10px; }
.sample-button { margin: 12px 0 20px; }
.two-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.two-fields :deep(.el-input-number), :deep(.el-select) { width: 100%; }
.switches { margin-top: -8px; }
.scan-help, .format-note { background: #ecf5ff; border-radius: 6px; padding: 12px; font-size: 13px; line-height: 1.8; color: #365574; }
.scan-help p { margin-top: 6px; }
.format-note { margin-bottom: 18px; }
.section-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.section-heading h3 { margin: 0; }
.previews { display: grid; gap: 16px; }
figcaption { font-size: 13px; color: #606266; margin: 10px 0; }
.source-preview { height: 140px; background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.source-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
.matrix-preview { background: #0e1922; border-radius: 6px; padding: 16px; overflow: auto; max-height: 440px; }
.matrix-preview canvas { display: block; image-rendering: pixelated; margin: auto; }
.zoom-control { display: flex; align-items: center; gap: 14px; margin-top: 16px; flex-wrap: wrap; }
.output-note { margin: -6px 0 18px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 12px; }
.actions .el-button { margin: 0; }
.output-code { margin-top: 12px; min-height: 240px; font-size: 12px; white-space: pre; }
.custom-fields { margin-top: 12px; }
.reference { margin-top: 20px; font-size: 13px; line-height: 1.8; color: #606266; }
.reference summary { cursor: pointer; }
.reference ul { padding-left: 20px; margin-top: 10px; }
.reference a { color: #337ecc; }
@media (max-width: 1100px) { .workspace { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .two-fields { grid-template-columns: 1fr; gap: 0; } .switches { grid-template-columns: 1fr 1fr; } }
</style>
