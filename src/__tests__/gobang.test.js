import { describe, it, expect } from 'vitest'
import {
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE,
  createBoard,
  isValidMove,
  checkWin,
  checkDraw,
  getAIMove
} from '../utils/gobang'

describe('Gobang Utils', () => {
  describe('createBoard', () => {
    it('应该创建 15x15 的棋盘', () => {
      const board = createBoard()
      expect(board.length).toBe(BOARD_SIZE)
      expect(board[0].length).toBe(BOARD_SIZE)
    })

    it('应该初始化所有位置为空', () => {
      const board = createBoard()
      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          expect(board[i][j]).toBe(EMPTY)
        }
      }
    })
  })

  describe('isValidMove', () => {
    it('应该接受棋盘内的空位置', () => {
      const board = createBoard()
      expect(isValidMove(board, 7, 7)).toBe(true)
      expect(isValidMove(board, 0, 0)).toBe(true)
      expect(isValidMove(board, 14, 14)).toBe(true)
    })

    it('应该拒绝棋盘外的位置', () => {
      const board = createBoard()
      expect(isValidMove(board, -1, 7)).toBe(false)
      expect(isValidMove(board, 15, 7)).toBe(false)
      expect(isValidMove(board, 7, 15)).toBe(false)
    })

    it('应该拒绝已有棋子的位置', () => {
      const board = createBoard()
      board[7][7] = BLACK
      expect(isValidMove(board, 7, 7)).toBe(false)
    })
  })

  describe('checkWin', () => {
    it('应该检测横向五连', () => {
      const board = createBoard()
      for (let i = 0; i < 5; i++) {
        board[7][i] = BLACK
      }
      expect(checkWin(board, 7, 4, BLACK)).toBe(true)
    })

    it('应该检测纵向五连', () => {
      const board = createBoard()
      for (let i = 0; i < 5; i++) {
        board[i][7] = WHITE
      }
      expect(checkWin(board, 4, 7, WHITE)).toBe(true)
    })

    it('应该检测对角线五连', () => {
      const board = createBoard()
      for (let i = 0; i < 5; i++) {
        board[i][i] = BLACK
      }
      expect(checkWin(board, 4, 4, BLACK)).toBe(true)
    })

    it('应该检测反对角线五连', () => {
      const board = createBoard()
      for (let i = 0; i < 5; i++) {
        board[i][4 - i] = WHITE
      }
      expect(checkWin(board, 4, 0, WHITE)).toBe(true)
    })

    it('应该检测超过五子的情况', () => {
      const board = createBoard()
      for (let i = 0; i < 6; i++) {
        board[7][i] = BLACK
      }
      expect(checkWin(board, 7, 5, BLACK)).toBe(true)
    })

    it('四子不应该获胜', () => {
      const board = createBoard()
      for (let i = 0; i < 4; i++) {
        board[7][i] = BLACK
      }
      expect(checkWin(board, 7, 3, BLACK)).toBe(false)
    })
  })

  describe('checkDraw', () => {
    it('应该检测平局', () => {
      const board = Array.from({ length: BOARD_SIZE }, () =>
        Array(BOARD_SIZE).fill(BLACK)
      )
      expect(checkDraw(board)).toBe(true)
    })

    it('应该检测非平局', () => {
      const board = createBoard()
      board[7][7] = BLACK
      expect(checkDraw(board)).toBe(false)
    })
  })

  describe('getAIMove', () => {
    it('应该返回有效的落子位置', () => {
      const board = createBoard()
      const move = getAIMove(board, BLACK)
      expect(move).toHaveProperty('row')
      expect(move).toHaveProperty('col')
      expect(isValidMove(board, move.row, move.col)).toBe(true)
    })

    it('应该优先选择获胜位置', () => {
      const board = createBoard()
      // 创建黑棋四子连珠
      for (let i = 0; i < 4; i++) {
        board[7][i] = BLACK
      }
      const move = getAIMove(board, BLACK)
      // AI 应该落子在 (7, 4) 来获胜
      expect(move.row).toBe(7)
      expect(move.col).toBe(4)
    })

    it('应该阻挡对手获胜', () => {
      const board = createBoard()
      // 创建白棋四子连珠
      for (let i = 0; i < 4; i++) {
        board[7][i] = WHITE
      }
      const move = getAIMove(board, BLACK)
      // AI 应该阻挡 (7, 4)
      expect(move.row).toBe(7)
      expect(move.col).toBe(4)
    })

    it('空棋盘应该选择中心附近', () => {
      const board = createBoard()
      const move = getAIMove(board, BLACK)
      const center = Math.floor(BOARD_SIZE / 2)
      const distToCenter = Math.abs(move.row - center) + Math.abs(move.col - center)
      expect(distToCenter).toBeLessThanOrEqual(2)
    })
  })
})
