/**
 * 五子棋游戏逻辑
 */

// 棋盘大小
export const BOARD_SIZE = 15

// 玩家标识
export const EMPTY = 0
export const BLACK = 1
export const WHITE = 2

/**
 * 创建新棋盘
 * @returns {number[][]} 棋盘数组
 */
export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(EMPTY)
  )
}

/**
 * 检查落子是否有效
 * @param {number[][]} board - 棋盘
 * @param {number} row - 行
 * @param {number} col - 列
 * @returns {boolean} 是否有效
 */
export function isValidMove(board, row, col) {
  return (
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE &&
    board[row][col] === EMPTY
  )
}

/**
 * 检查是否获胜
 * @param {number[][]} board - 棋盘
 * @param {number} row - 最后落子的行
 * @param {number} col - 最后落子的列
 * @param {number} player - 玩家
 * @returns {boolean} 是否获胜
 */
export function checkWin(board, row, col, player) {
  const directions = [
    [1, 0],   // 垂直
    [0, 1],   // 水平
    [1, 1],   // 对角线
    [1, -1]   // 反对角线
  ]

  for (const [dx, dy] of directions) {
    let count = 1

    // 正向计数
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i
      const newCol = col + dy * i
      if (
        newRow < 0 ||
        newRow >= BOARD_SIZE ||
        newCol < 0 ||
        newCol >= BOARD_SIZE ||
        board[newRow][newCol] !== player
      ) {
        break
      }
      count++
    }

    // 反向计数
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i
      const newCol = col - dy * i
      if (
        newRow < 0 ||
        newRow >= BOARD_SIZE ||
        newCol < 0 ||
        newCol >= BOARD_SIZE ||
        board[newRow][newCol] !== player
      ) {
        break
      }
      count++
    }

    if (count >= 5) {
      return true
    }
  }

  return false
}

/**
 * 检查是否平局
 * @param {number[][]} board - 棋盘
 * @returns {boolean} 是否平局
 */
export function checkDraw(board) {
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] === EMPTY) {
        return false
      }
    }
  }
  return true
}

/**
 * AI 落子（增强版 - 带进攻和防守策略）
 * @param {number[][]} board - 棋盘
 * @param {number} player - 玩家
 * @returns {{row: number, col: number}} 落子位置
 */
export function getAIMove(board, player) {
  const opponent = player === BLACK ? WHITE : BLACK
  let bestScore = -Infinity
  let bestMoves = []
  let isEmptyBoard = true

  // 检查是否是空棋盘
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] !== EMPTY) {
        isEmptyBoard = false
        break
      }
    }
    if (!isEmptyBoard) break
  }

  // 空棋盘时直接下中心
  if (isEmptyBoard) {
    const center = Math.floor(BOARD_SIZE / 2)
    return { row: center, col: center }
  }

  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (board[i][j] === EMPTY) {
        // 进攻分数：自己落子后的价值
        const attackScore = evaluateMove(board, i, j, player)
        // 防守分数：阻挡对手的价值
        const defenseScore = evaluateMove(board, i, j, opponent)

        // 综合评分（进攻权重稍高）
        const score = attackScore + defenseScore * 0.9

        if (score > bestScore) {
          bestScore = score
          bestMoves = [{ row: i, col: j }]
        } else if (score === bestScore) {
          bestMoves.push({ row: i, col: j })
        }
      }
    }
  }

  // 如果没有好的落子点，选择中心附近
  if (bestMoves.length === 0) {
    const center = Math.floor(BOARD_SIZE / 2)
    for (let i = center - 2; i <= center + 2; i++) {
      for (let j = center - 2; j <= center + 2; j++) {
        if (isValidMove(board, i, j)) {
          return { row: i, col: j }
        }
      }
    }
  }

  // 随机选择一个最佳位置
  return bestMoves[Math.floor(Math.random() * bestMoves.length)]
}

/**
 * 评估某一步棋的价值
 * @param {number[][]} board - 棋盘
 * @param {number} row - 行
 * @param {number} col - 列
 * @param {number} player - 玩家
 * @returns {number} 分数
 */
function evaluateMove(board, row, col, player) {
  let score = 0

  // 临时落子
  board[row][col] = player

  // 检查连五
  if (checkWin(board, row, col, player)) {
    board[row][col] = EMPTY
    return 1000000
  }

  // 评估四个方向
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of directions) {
    const result = evaluateDirection(board, row, col, dx, dy, player)
    score += result
  }

  // 恢复棋盘
  board[row][col] = EMPTY
  return score
}

/**
 * 评估某个方向的棋型
 * @param {number[][]} board - 棋盘
 * @param {number} row - 行
 * @param {number} col - 列
 * @param {number} dx - 方向 X
 * @param {number} dy - 方向 Y
 * @param {number} player - 玩家
 * @returns {number} 分数
 */
function evaluateDirection(board, row, col, dx, dy, player) {
  let count = 1  // 连子数
  let openEnds = 0  // 开放端数
  let blocked = 0

  // 正向检查
  let i = 1
  while (i <= 4) {
    const newRow = row + dx * i
    const newCol = col + dy * i
    if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
      break
    }
    if (board[newRow][newCol] === player) {
      count++
    } else if (board[newRow][newCol] === EMPTY) {
      openEnds++
      break
    } else {
      blocked++
      break
    }
    i++
  }

  // 反向检查
  i = 1
  while (i <= 4) {
    const newRow = row - dx * i
    const newCol = col - dy * i
    if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
      break
    }
    if (board[newRow][newCol] === player) {
      count++
    } else if (board[newRow][newCol] === EMPTY) {
      openEnds++
      break
    } else {
      blocked++
      break
    }
    i++
  }

  // 根据棋型评分
  if (count >= 5) return 100000  // 连五
  if (count === 4) {
    if (openEnds === 2) return 10000  // 活四
    if (openEnds === 1) return 1000   // 冲四
  }
  if (count === 3) {
    if (openEnds === 2) return 1000   // 活三
    if (openEnds === 1) return 100    // 眠三
  }
  if (count === 2) {
    if (openEnds === 2) return 100    // 活二
    if (openEnds === 1) return 10     // 眠二
  }
  if (count === 1 && openEnds === 2) return 10  // 活一

  return 1
}
