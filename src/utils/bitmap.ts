export type ScanMode = 'column' | 'row' | 'column-row' | 'row-column'
export type BitOrder = 'lsb' | 'msb'
export type Polarity = 'positive' | 'negative'
export type OutputFormat = 'c' | 'c51' | 'arduino' | 'hex' | 'bin' | 'xbm' | 'bmp'
export interface MonoImage { width: number; height: number; pixels: Uint8Array }
export interface PackingOptions { scan: ScanMode; bitOrder: BitOrder; polarity: Polarity }

export const SCAN_MODES: { value: ScanMode; label: string; description: string }[] = [
  { value: 'column', label: '逐列式', description: '每字节取纵向 8 点；先取完一整列，再向右换列。' },
  { value: 'row', label: '逐行式', description: '每字节取横向 8 点；先取完一整行，再向下换行。' },
  { value: 'column-row', label: '列行式（OLED 页模式）', description: '每字节取纵向 8 点；先向右遍历所有列，再向下进入下一页（8 行）。' },
  { value: 'row-column', label: '行列式', description: '每字节取横向 8 点；先向下遍历所有行，再向右进入下一组（8 列）。' },
]

export const BITMAP_PRESETS: { value: string; label: string; packing: PackingOptions; format: OutputFormat; note: string }[] = [
  { value: 'ssd1306', label: 'SSD1306 / SSD1309 · 页缓冲', packing: { scan: 'column-row', bitOrder: 'lsb', polarity: 'positive' }, format: 'c', note: '纵向 8 点一个字节，顶点为 bit0。用于页排列帧缓冲；直接传输时需匹配控制器寻址模式。SH1106 的列偏移由驱动处理。' },
  { value: 'gfx', label: 'Adafruit GFX · drawBitmap', packing: { scan: 'row', bitOrder: 'msb', polarity: 'positive' }, format: 'arduino', note: '逐行排列，左侧像素为 bit7，适用于 Adafruit GFX drawBitmap。不是 SSD1306 原生页缓冲。' },
  { value: 'u8g2', label: 'U8g2 / XBM · drawXBMP', packing: { scan: 'row', bitOrder: 'lsb', polarity: 'positive' }, format: 'xbm', note: '逐行排列，左侧像素为 bit0。XBM 可用于 U8g2 drawXBMP / drawXBM 或 Adafruit GFX drawXBitmap；AVR Flash 数据请使用 PROGMEM 和相应接口。' },
  { value: 'max7219', label: 'MAX7219 · 单块 8×8 行数据', packing: { scan: 'row', bitOrder: 'msb', polarity: 'positive' }, format: 'c', note: '常见单块 8×8 行位图，不包含寄存器地址。实际行列方向取决于模块接线；多块级联需由驱动拆分和映射。' },
]

export function validateSize(width: number, height: number) {
  if (![width, height].every(n => Number.isInteger(n) && n >= 1 && n <= 1024)) {
    throw new Error('宽度和高度须为 1–1024 的整数')
  }
}

function validateImage(image: MonoImage) {
  validateSize(image.width, image.height)
  if (image.pixels.length !== image.width * image.height) throw new Error('像素数据与分辨率不匹配')
}

export function fitRect(sourceWidth: number, sourceHeight: number, width: number, height: number, mode: 'contain' | 'stretch') {
  validateSize(width, height)
  if (![sourceWidth, sourceHeight].every(n => Number.isFinite(n) && n > 0)) throw new Error('图片尺寸无效')
  if (mode === 'stretch') return { x: 0, y: 0, width, height }
  const scale = Math.min(width / sourceWidth, height / sourceHeight)
  const w = Math.max(1, Math.round(sourceWidth * scale))
  const h = Math.max(1, Math.round(sourceHeight * scale))
  return { x: Math.floor((width - w) / 2), y: Math.floor((height - h) / 2), width: w, height: h }
}

// Pixels always describe visible foreground (dark = 1); electrical polarity is applied only when packing.
export function monochrome(rgba: Uint8ClampedArray, width: number, height: number, threshold: number, invert = false): MonoImage {
  validateSize(width, height)
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 255) throw new Error('阈值须为 0–255')
  if (rgba.length !== width * height * 4) throw new Error('RGBA 数据与分辨率不匹配')
  const pixels = new Uint8Array(width * height)
  for (let i = 0; i < pixels.length; i++) {
    const offset = i * 4
    const alpha = rgba[offset + 3] / 255
    const gray = (0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2]) * alpha + 255 * (1 - alpha)
    pixels[i] = Number((gray < threshold) !== invert)
  }
  return { width, height, pixels }
}

export function packBitmap(image: MonoImage, options: PackingOptions): Uint8Array {
  validateImage(image)
  const { width, height, pixels } = image
  const vertical = options.scan === 'column' || options.scan === 'column-row'
  const groups = Math.ceil((vertical ? height : width) / 8)
  const lines = vertical ? width : height
  const bytes = new Uint8Array(groups * lines)
  const groupFirst = options.scan === 'column-row' || options.scan === 'row-column'
  for (let line = 0; line < lines; line++) {
    for (let group = 0; group < groups; group++) {
      let byte = 0
      for (let bit = 0; bit < 8; bit++) {
        const x = vertical ? line : group * 8 + bit
        const y = vertical ? group * 8 + bit : line
        const foreground = x < width && y < height ? pixels[y * width + x] !== 0 : false
        const on = options.polarity === 'positive' ? foreground : !foreground
        if (on) byte |= 1 << (options.bitOrder === 'lsb' ? bit : 7 - bit)
      }
      bytes[groupFirst ? group * lines + line : line * groups + group] = byte
    }
  }
  return bytes
}

// Windows BITMAPINFOHEADER, 1 bpp, black/white palette, bottom-up rows aligned to 4 bytes.
export function encodeBmp(image: MonoImage): Uint8Array {
  validateImage(image)
  const { width, height, pixels } = image
  const stride = Math.ceil(width / 32) * 4
  const bytes = new Uint8Array(62 + stride * height)
  const view = new DataView(bytes.buffer)
  bytes.set([0x42, 0x4d])
  view.setUint32(2, bytes.length, true)
  view.setUint32(10, 62, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 1, true)
  view.setUint32(34, stride * height, true)
  view.setUint32(46, 2, true)
  bytes.set([255, 255, 255, 0], 58)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!pixels[y * width + x]) bytes[62 + (height - 1 - y) * stride + (x >> 3)] |= 0x80 >> (x % 8)
    }
  }
  return bytes
}

export function safeIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_') || 'image'
  // Prefix avoids leading digits, C/C++ keywords and reserved leading underscores.
  return `bitmap_${cleaned.replace(/^_+|_+$/g, '') || 'image'}`
}

export interface TextOptions {
  name: string
  radix: 16 | 10
  bytesPerLine: number
  custom: boolean
  dataPrefix: string
  dataSuffix: string
  linePrefix: string
  lineSuffix: string
}

export function formatBitmap(bytes: Uint8Array, image: MonoImage, format: OutputFormat, packing: PackingOptions, options: TextOptions): string {
  if (!Number.isInteger(options.bytesPerLine) || options.bytesPerLine < 1 || options.bytesPerLine > 64) throw new Error('每行数据须为 1–64 字节')
  const name = safeIdentifier(options.name)
  const custom = format === 'hex' && options.custom
  const prefix = custom ? options.dataPrefix : options.radix === 16 ? '0x' : ''
  const suffix = custom ? options.dataSuffix : ','
  const lines: string[] = []
  for (let i = 0; i < bytes.length; i += options.bytesPerLine) {
    const values = Array.from(bytes.subarray(i, i + options.bytesPerLine), byte =>
      prefix + (options.radix === 16 ? byte.toString(16).toUpperCase().padStart(2, '0') : byte.toString()) + suffix)
    lines.push((custom ? options.linePrefix : '  ') + values.join(' ') + (custom ? options.lineSuffix : ''))
  }
  const body = lines.join('\n')
  if (format === 'hex') return body
  const dimensions = `#define ${name}_width ${image.width}\n#define ${name}_height ${image.height}`
  const comment = `/* ${image.width} x ${image.height}, ${bytes.length} bytes; ${packing.scan}, ${packing.bitOrder}, foreground=${packing.polarity === 'positive' ? 1 : 0} */`
  if (format === 'xbm') return `${comment}\n${dimensions}\nstatic unsigned char ${name}_bits[] = {\n${body}\n};\n`
  if (format === 'c51') return `${comment}\n${dimensions}\nunsigned char code ${name}[] = {\n${body}\n};\n`
  const include = format === 'arduino' ? '#include <Arduino.h>' : '#include <stdint.h>'
  return `${include}\n${comment}\n${dimensions}\nstatic const uint8_t ${name}[]${format === 'arduino' ? ' PROGMEM' : ''} = {\n${body}\n};\n`
}
