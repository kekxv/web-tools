import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import BrickImageBoard from '../components/BrickImageBoard.vue'

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
  expect(wrapper.get('.image-board-area').attributes('style')).toContain('left: 10%')
  expect(wrapper.get('.image-board-area').attributes('style')).toContain('top: 20%')
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
