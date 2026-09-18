import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { encodeBmp, fitRect, formatBitmap, monochrome, packBitmap, safeIdentifier } from '../utils/bitmap'
import type { MonoImage, TextOptions } from '../utils/bitmap'

const image = (width: number, height: number, values: number[]): MonoImage => ({
  width,
  height,
  pixels: Uint8Array.from(values),
})

describe('点阵取模', () => {
  it('支持逐行的高位与低位在前', () => {
    const source = image(8, 1, [1, 0, 0, 0, 0, 0, 0, 1])
    assert.deepEqual(Array.from(packBitmap(source, { scan: 'row', bitOrder: 'msb', polarity: 'positive' })), [0x81])
    assert.deepEqual(Array.from(packBitmap(image(8, 1, [1, 0, 0, 0, 0, 0, 0, 0]), { scan: 'row', bitOrder: 'lsb', polarity: 'positive' })), [0x01])
  })

  it('SSD1306 页模式按页再按列排列', () => {
    const pixels = new Array(2 * 9).fill(0)
    pixels[0] = 1
    pixels[1] = 1
    pixels[8 * 2] = 1
    assert.deepEqual(Array.from(packBitmap(image(2, 9, pixels), { scan: 'column-row', bitOrder: 'lsb', polarity: 'positive' })), [0x01, 0x01, 0x01, 0x00])
  })

  it('逐列式先输出同一列的所有字节', () => {
    const pixels = new Array(2 * 9).fill(0)
    pixels[0] = 1
    pixels[1] = 1
    pixels[8 * 2 + 1] = 1
    assert.deepEqual(Array.from(packBitmap(image(2, 9, pixels), { scan: 'column', bitOrder: 'lsb', polarity: 'positive' })), [0x01, 0x00, 0x01, 0x01])
    assert.deepEqual(Array.from(packBitmap(image(2, 9, pixels), { scan: 'column-row', bitOrder: 'lsb', polarity: 'positive' })), [0x01, 0x01, 0x00, 0x01])
  })

  it('行列式先输出同一组横向八点的所有行', () => {
    const pixels = new Array(9 * 2).fill(0)
    pixels[0] = 1
    pixels[9] = 1
    pixels[17] = 1
    assert.deepEqual(Array.from(packBitmap(image(9, 2, pixels), { scan: 'row', bitOrder: 'msb', polarity: 'positive' })), [0x80, 0, 0x80, 0x80])
    assert.deepEqual(Array.from(packBitmap(image(9, 2, pixels), { scan: 'row-column', bitOrder: 'msb', polarity: 'positive' })), [0x80, 0x80, 0, 0x80])
  })

  it('宽度不是八的倍数时每行独立补齐，XBM 左像素使用 bit0', () => {
    const source = image(9, 2, [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0])
    assert.deepEqual(Array.from(packBitmap(source, { scan: 'row', bitOrder: 'lsb', polarity: 'positive' })), [1, 1, 2, 0])
  })

  it('阳码将前景取反并用 1 补齐不足八点的背景', () => {
    const source = image(3, 1, [1, 0, 1])
    assert.deepEqual(Array.from(packBitmap(source, { scan: 'row', bitOrder: 'msb', polarity: 'negative' })), [0x5f])
  })
})

describe('图片处理与输出', () => {
  it('等比例缩放后居中，强制缩放占满画布', () => {
    assert.deepEqual(fitRect(100, 50, 64, 64, 'contain'), { x: 0, y: 16, width: 64, height: 32 })
    assert.deepEqual(fitRect(100, 50, 64, 64, 'stretch'), { x: 0, y: 0, width: 64, height: 64 })
    assert.deepEqual(fitRect(50, 100, 64, 64, 'contain'), { x: 16, y: 0, width: 32, height: 64 })
  })

  it('透明像素按白色背景参与二值化', () => {
    const result = monochrome(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 0]), 2, 1, 128)
    assert.deepEqual(Array.from(result.pixels), [1, 0])
  })

  it('二值化处理阈值边界和反色', () => {
    const rgba = new Uint8ClampedArray([127, 127, 127, 255, 129, 129, 129, 255])
    assert.deepEqual(Array.from(monochrome(rgba, 2, 1, 128).pixels), [1, 0])
    assert.deepEqual(Array.from(monochrome(rgba, 2, 1, 128, true).pixels), [0, 1])
    assert.deepEqual(Array.from(monochrome(rgba, 2, 1, 0).pixels), [0, 0])
  })

  it('生成标准 1bpp BMP 文件头、调色板与四字节行对齐', () => {
    const bmp = encodeBmp(image(2, 2, [1, 0, 0, 1]))
    const view = new DataView(bmp.buffer)
    assert.deepEqual(Array.from(bmp.slice(0, 2)), [0x42, 0x4d])
    assert.equal(view.getUint32(2, true), 70)
    assert.equal(view.getUint32(10, true), 62)
    assert.equal(view.getInt32(18, true), 2)
    assert.equal(view.getInt32(22, true), 2)
    assert.equal(view.getUint16(28, true), 1)
    assert.deepEqual(Array.from(bmp.slice(54, 62)), [0, 0, 0, 0, 255, 255, 255, 0])
    assert.equal(bmp[62], 0x80)
    assert.equal(bmp[66], 0x40)
  })

  it('独立解码 BMP 验证非整字节宽度和行对齐边界', () => {
    for (const width of [1, 7, 8, 9, 31, 32, 33, 128]) {
      const height = 9
      const source = image(width, height, Array.from({ length: width * height }, (_, i) => Number(i % 3 === 0)))
      const bmp = encodeBmp(source)
      const view = new DataView(bmp.buffer)
      const stride = Math.floor((view.getInt32(18, true) + 31) / 32) * 4
      const offset = view.getUint32(10, true)
      assert.equal(bmp.length, offset + stride * height)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (bmp[offset + (height - 1 - y) * stride + Math.floor(x / 8)] >> (7 - x % 8)) & 1
          const paletteGray = bmp[54 + index * 4]
          assert.equal(paletteGray, source.pixels[y * width + x] ? 0 : 255)
        }
      }
    }
  })

  it('拒绝无效尺寸和不完整像素数据', () => {
    assert.throws(() => fitRect(20, 20, 0, 64, 'contain'), /整数/)
    assert.throws(() => fitRect(Infinity, 20, 64, 64, 'contain'), /无效/)
    assert.throws(() => encodeBmp(image(1025, 1, [])), /整数/)
    assert.throws(() => encodeBmp(image(2, 2, [1])), /不匹配/)
    assert.throws(() => monochrome(new Uint8ClampedArray(4), 1, 1, NaN), /阈值/)
  })

  it('格式化 C51、Arduino 和自定义文本', () => {
    const options: TextOptions = { name: '1 图标', radix: 16, bytesPerLine: 2, custom: false, dataPrefix: '', dataSuffix: '', linePrefix: '', lineSuffix: '' }
    const source = image(8, 1, new Array(8).fill(0))
    const packing = { scan: 'row', bitOrder: 'msb', polarity: 'positive' } as const
    assert.equal(safeIdentifier(options.name), 'bitmap_1')
    assert.ok(formatBitmap(Uint8Array.of(0, 255), source, 'c51', packing, options).includes('unsigned char code bitmap_1[]'))
    assert.ok(formatBitmap(Uint8Array.of(0, 255), source, 'arduino', packing, options).includes('PROGMEM'))
    assert.ok(formatBitmap(Uint8Array.of(0, 255), source, 'c', packing, options).includes('#include <stdint.h>'))
    assert.ok(formatBitmap(Uint8Array.of(0, 255), source, 'xbm', packing, options).includes('static unsigned char bitmap_1_bits[]'))
    options.radix = 10
    assert.ok(formatBitmap(Uint8Array.of(0, 255), source, 'c', packing, options).includes('0, 255,'))
    options.radix = 16
    options.custom = true
    options.dataPrefix = '['
    options.dataSuffix = ']'
    options.linePrefix = '<'
    options.lineSuffix = '>'
    assert.equal(formatBitmap(Uint8Array.of(0, 255), source, 'hex', packing, options), '<[00] [FF]>')
    options.bytesPerLine = 0
    assert.throws(() => formatBitmap(Uint8Array.of(0), source, 'c', packing, options), /每行数据/)
  })
})
