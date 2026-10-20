import { expect, it } from 'vitest'
import { detectBoard, rectifyPerspective } from '../utils/brick-assistant'

// Independent inverse projection: x=(ox+u)/(1+k*v), y=(oy+v)/(1+k*v).
function framed(ox: number, oy: number, k: number) {
  const width = 360, height = 360, data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const v = (y - oy) / (1 - k * y), u = x * (1 + k * v) - ox
    let colour = [45, 50, 65, 255]
    if (u >= -7 && u < 247 && v >= -7 && v < 287) colour = [90, 45, 15, 255]
    if (u >= 0 && u < 240 && v >= 0 && v < 280) colour = [160, 100, 30, 255]
    const col = Math.floor(u / 40), row = Math.floor(v / 40)
    if (row >= 2 && row <= 4 && col >= 1 && col <= 3 && u % 40 >= 3 && u % 40 < 37 && v % 40 >= 3 && v % 40 < 37)
      colour = [245, 250, 195, 255]
    data.set(colour, (y * width + x) * 4)
  }
  return { data, width, height }
}

it.each([[35, 30, 0], [60, 40, 0.0007]])('四角随图片变化且保留外围空行列 (%i,%i,%f)', (ox, oy, k) => {
  const result = detectBoard(framed(ox, oy, k))!
  expect(result).not.toBeNull()
  expect([result.rows, result.cols]).toEqual([7, 6])
  expect(result.cells.map(c => `${c.row},${c.col}`).sort()).toEqual(['2,1','2,2','2,3','3,1','3,2','3,3','4,1','4,2','4,3'])
  const want = [[ox, oy], [ox + 240, oy], [(ox + 240)/(1+k*280), (oy+280)/(1+k*280)], [ox/(1+k*280), (oy+280)/(1+k*280)]]
  Object.values(result.quad).forEach((point, i) => {
    expect(Math.abs(point.x - want[i][0])).toBeLessThan(2)
    expect(Math.abs(point.y - want[i][1])).toBeLessThan(2)
  })
  const straight = rectifyPerspective(framed(ox, oy, k), result.quad, 240, 280)
  const again = detectBoard(straight, { topLeft: { x: 0, y: 0 }, topRight: { x: 240, y: 0 }, bottomRight: { x: 240, y: 280 }, bottomLeft: { x: 0, y: 280 } })!
  expect([again.rows, again.cols]).toEqual([7, 6])
  expect(again.cells.map(c => `${c.row},${c.col}`).sort()).toEqual(result.cells.map(c => `${c.row},${c.col}`).sort())
})
