import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import BrickImageBoard from '../components/BrickImageBoard.vue'
import { CLEAR_MS, PUSH_MS } from '../utils/brick-animation'
import type { Move } from '../utils/brick-assistant'

it('直接在完整原图上定位棋盘和消除遮罩，保留原本空格', async () => {
  const wrapper = mount(BrickImageBoard, { props: {
    imageUrl: '/game.png', imageWidth: 400, imageHeight: 600,
    grid: { x: 40, y: 120, width: 320, height: 400, rows: 2, cols: 2 },
    board: [[1, 0], [0, 1]], initialBoard: [[1, 1], [0, 1]],
    tileImages: [['/one.png', '/two.png'], ['', '/one.png']],
    emptyImage: '/empty.png',
    move: { from: { row: 0, col: 0 }, to: { row: 1, col: 1 }, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }] },
    animating: false,
  } })
  expect(wrapper.get('.game-screenshot').attributes('src')).toBe('/game.png')
  // The stage is zoomed to the board area, so the whole screenshot is scaled and shifted.
  const stage = wrapper.get('.image-stage').attributes('style')!
  expect(Number(/--ratio: ([\d.]+)/.exec(stage)![1])).toBeCloseTo(320 / 400, 3)
  const shot = wrapper.get('.game-screenshot').attributes('style')!
  expect(shot).toContain('width: 125%')
  expect(shot).toContain('left: -12.5%')
  expect(shot).toContain('top: -30%')
  expect(wrapper.findAll('.removed-tile')).toHaveLength(1)
  expect(wrapper.get('.removed-tile').attributes('style')).toContain('/empty.png')
  await wrapper.setProps({ animating: true })
  expect(wrapper.findAll('.clearing')).toHaveLength(2)
  expect(wrapper.findAll('.clearing .tile-art')).toHaveLength(2)
  await wrapper.setProps({ animating: false })
  await wrapper.get('.brick-cell').trigger('click')
  expect(wrapper.emitted('select')?.[0]).toEqual([{ row: 0, col: 0 }])
})

it('漏识别后校正的砖块也能被遮盖，撤销时恢复原图', async () => {
  const wrapper = mount(BrickImageBoard, { props: {
    imageUrl: '/game.png', board: [[0, 0]], initialBoard: [[0, 1]], tileImages: [['/missed.png', '/one.png']],
    erasedCells: [[true, true]], animating: false,
  } })
  expect(wrapper.findAll('.removed-tile')).toHaveLength(2)
  await wrapper.setProps({ board: [[1, 1]], erasedCells: [[false, false]] })
  expect(wrapper.findAll('.removed-tile')).toHaveLength(0)
})

it('识别到的砖块按真实外框定位，并画出虚拟边框', () => {
  const wrapper = mount(BrickImageBoard, { props: {
    imageUrl: '/game.png', imageWidth: 200, imageHeight: 200,
    grid: { x: 0, y: 0, width: 200, height: 200, rows: 2, cols: 2 },
    board: [[1, 1], [1, 1]], initialBoard: [[1, 1], [1, 1]], tileImages: [['', ''], ['', '']],
    tiles: [{ row: 0, col: 1, x: 120, y: 8, width: 60, height: 60 }],
    animating: false,
  } })
  const cells = wrapper.findAll('.brick-cell')
  // The detected brick keeps its own outline instead of the even grid.
  expect(cells[1].attributes('style')).toContain('left: 60%')
  expect(cells[1].attributes('style')).toContain('width: 30%')
  expect(cells[1].classes()).toContain('framed')
  // A cell without a detection falls back to the grid and reads as a guess.
  expect(cells[0].classes()).toContain('guessed')
  expect(cells[0].attributes('style')).toContain('width: 50%')
})

it('砖块被消掉或推走后，空格子上不再留虚线框', () => {
  const wrapper = mount(BrickImageBoard, { props: {
    imageUrl: '/game.png', imageWidth: 200, imageHeight: 200,
    grid: { x: 0, y: 0, width: 200, height: 200, rows: 1, cols: 2 },
    board: [[1, 0]], initialBoard: [[1, 1]], tileImages: [['', '']],
    tiles: [{ row: 0, col: 0, x: 0, y: 0, width: 100, height: 100 }, { row: 0, col: 1, x: 100, y: 0, width: 100, height: 100 }],
    animating: false,
  } })
  const cells = wrapper.findAll('.brick-cell')
  expect(cells[0].classes()).toContain('framed')
  // The outline marks a brick that is there now, not a brick the detector once saw there.
  expect(cells[1].classes()).not.toContain('framed')
  expect(cells[1].classes()).toContain('removed-tile')
})

it('可以关掉虚拟边框', () => {
  const wrapper = mount(BrickImageBoard, { props: {
    imageUrl: '/game.png', board: [[1]], initialBoard: [[1]], tileImages: [['']], frames: false, animating: false,
  } })
  expect(wrapper.get('.brick-cell').classes()).not.toContain('framed')
})

it('砖块外框超出格线时，板面区域跟着外扩，边框不会被裁掉', () => {
  const wrapper = mount(BrickImageBoard, { props: {
    imageUrl: '/game.png', imageWidth: 200, imageHeight: 200,
    // The lattice the detector fitted; the left brick was traced a little past its left edge.
    grid: { x: 40, y: 40, width: 120, height: 120, rows: 2, cols: 2 },
    board: [[1, 1], [1, 1]], initialBoard: [[1, 1], [1, 1]], tileImages: [['', ''], ['', '']],
    tiles: [{ row: 0, col: 0, x: 20, y: 40, width: 70, height: 70 }],
    animating: false,
  } })
  // The area starts at the brick, not at the lattice: the frame is drawn in full, exactly where
  // the crop was taken from, and the stage takes the shape of that area.
  const stage = wrapper.get('.image-stage').attributes('style')!
  expect(Number(/--ratio: ([\d.]+)/.exec(stage)![1])).toBeCloseTo(140 / 120, 3)
  const shot = wrapper.get('.game-screenshot').attributes('style')!
  expect(shot).toContain('width: 142.85714285714286%')
  expect(shot).toContain('left: -14.285714285714285%')
  const cells = wrapper.findAll('.brick-cell')
  expect(cells[0].attributes('style')).toContain('left: 0%')
  expect(cells[0].attributes('style')).toContain('width: 50%')
  // Cells without a traced outline still sit on the even grid inside that same area.
  expect(cells[3].attributes('style')).toContain('left: 57.14285714285714%')
  expect(cells[3].attributes('style')).toContain('width: 42.857142857142854%')
})

it('推动的砖块按自身尺寸换算位移，正好落到目标格上', async () => {
  const move: Move = { from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, path: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    push: { direction: 'right', distance: 1, tiles: [{ id: 1, from: { row: 0, col: 0 }, to: { row: 0, col: 1 } }] } }
  const wrapper = mount(BrickImageBoard, { props: {
    imageUrl: '/game.png', imageWidth: 200, imageHeight: 100,
    grid: { x: 0, y: 0, width: 200, height: 100, rows: 2, cols: 2 },
    board: [[1, 0], [0, 0]], initialBoard: [[1, 0], [0, 0]], tileImages: [['/a.png', ''], ['', '']],
    move, animating: true, phase: 'push',
    // The brick is narrower than its cell, so "one cell to the right" is 150% of the brick.
    tiles: [{ row: 0, col: 0, x: 10, y: 10, width: 60, height: 40 }],
  } })
  const style = wrapper.get('.pushing-tile').attributes('style')!
  expect(style).toContain('width: 30%')
  expect(style).toContain('--dx: 150%')
  // The brick sits lower than its cell, so it also rises onto the destination outline.
  expect(style).toContain('--dy: -25%')
  expect(Number(/--sx: ([\d.]+)/.exec(style)![1])).toBeCloseTo(50 / 30, 4)
  // The phase timers in the view use the same durations as these animations.
  const stage = wrapper.get('.image-stage').attributes('style')!
  expect(stage).toContain(`--push-ms: ${PUSH_MS}ms`)
  expect(stage).toContain(`--clear-ms: ${CLEAR_MS}ms`)
  await wrapper.get('.push-layer').trigger('animationend')
  expect(wrapper.emitted('pushed')).toHaveLength(1)
})
