<template>
  <div class="gobang-view page-container">
    <div class="card-container">
      <h2 class="page-title">五子棋</h2>
      <p class="page-description">简单有趣的五子棋游戏，支持双人对战和人机对战</p>

      <div class="game-container">
        <!-- 游戏设置 -->
        <div class="game-settings">
          <div class="setting-item">
            <label>游戏模式:</label>
            <el-radio-group v-model="gameMode" :disabled="gameStarted" size="default">
              <el-radio-button value="pve">人机对战</el-radio-button>
              <el-radio-button value="pvp">双人对战</el-radio-button>
            </el-radio-group>
          </div>
          <div class="setting-item">
            <label>先手:</label>
            <el-radio-group v-model="firstPlayer" :disabled="gameStarted" size="small">
              <el-radio :value="BLACK">黑棋</el-radio>
              <el-radio :value="WHITE">白棋</el-radio>
            </el-radio-group>
          </div>
        </div>

        <!-- 游戏状态 -->
        <div class="game-status">
          <div class="status-info">
            <span v-if="!gameStarted && !winner">
              请点击"开始游戏"
            </span>
            <span v-else-if="winner">
              <template v-if="winner === 'draw'">平局！</template>
              <template v-else>
                {{ winner === BLACK ? '黑棋' : '白棋' }} 获胜！
              </template>
            </span>
            <span v-else>
              当前：<span :class="['current-player', currentPlayer === BLACK ? 'black' : 'white']">
                {{ currentPlayer === BLACK ? '黑棋' : '白棋' }}
              </span>
            </span>
          </div>
        </div>

        <!-- 棋盘 -->
        <div class="board-wrapper">
          <div class="board" ref="boardRef">
            <!-- 线条容器 -->
            <div class="lines-container">
              <!-- 横线 -->
              <div class="lines-horizontal">
                <div
                  v-for="i in BOARD_SIZE"
                  :key="'h' + i"
                  class="line"
                ></div>
              </div>
              <!-- 竖线 -->
              <div class="lines-vertical">
                <div
                  v-for="i in BOARD_SIZE"
                  :key="'v' + i"
                  class="line"
                ></div>
              </div>
            </div>
            <!-- 棋子 -->
            <div
              v-for="(row, rowIndex) in board"
              :key="rowIndex"
              class="row"
              :style="rowStyle(rowIndex)"
            >
              <div
                v-for="(cell, colIndex) in row"
                :key="colIndex"
                class="cell"
                @click="handleCellClick(rowIndex, colIndex)"
              >
                <div v-if="cell === BLACK" class="stone black"></div>
                <div v-if="cell === WHITE" class="stone white"></div>
                <div v-if="lastMove && lastMove.row === rowIndex && lastMove.col === colIndex"
                     class="last-move-marker"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="btn-group">
          <el-button type="primary" @click="startGame" :disabled="gameStarted && !winner">
            <el-icon><VideoPlay /></el-icon>
            {{ gameStarted ? '重新开始' : '开始游戏' }}
          </el-button>
          <el-button @click="undoMove" :disabled="!canUndo">
            <el-icon><RefreshLeft /></el-icon>
            悔棋
          </el-button>
          <el-button @click="resetGame">
            <el-icon><Delete /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
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
import { VideoPlay, RefreshLeft, Delete } from '@element-plus/icons-vue'

const CELL_SIZE = 30 // 棋盘格子大小

const gameMode = ref('pve') // 'pve' 或 'pvp'
const firstPlayer = ref(BLACK)
const board = ref(createBoard())
const currentPlayer = ref(BLACK)
const gameStarted = ref(false)
const winner = ref(null)
const lastMove = ref(null)
const moveHistory = ref([])
const boardRef = ref(null)

const canUndo = computed(() => moveHistory.value.length > 0 && !winner.value)

const rowStyle = (rowIndex) => {
  return {
    top: `calc(${rowIndex} * var(--cell-size, 30px))`
  }
}

const startGame = () => {
  board.value = createBoard()
  currentPlayer.value = firstPlayer.value
  gameStarted.value = true
  winner.value = null
  lastMove.value = null
  moveHistory.value = []
}

const resetGame = () => {
  board.value = createBoard()
  currentPlayer.value = BLACK
  gameStarted.value = false
  winner.value = null
  lastMove.value = null
  moveHistory.value = []
}

const handleCellClick = async (row, col) => {
  if (!gameStarted.value || winner.value) return

  // 人机模式下，玩家不能点击 AI 的回合
  if (gameMode.value === 'pve' && currentPlayer.value !== firstPlayer.value) return

  if (!isValidMove(board.value, row, col)) return

  makeMove(row, col)

  // AI 回合
  if (gameMode.value === 'pve' && !winner.value && gameStarted.value) {
    await nextTick()
    setTimeout(() => {
      if (!winner.value && gameStarted.value) {
        const aiMove = getAIMove(board.value, currentPlayer.value)
        if (aiMove) {
          makeMove(aiMove.row, aiMove.col)
        }
      }
    }, 500)
  }
}

const makeMove = (row, col) => {
  // 创建新的棋盘数组以触发响应式更新
  const newBoard = board.value.map(r => [...r])
  newBoard[row][col] = currentPlayer.value
  board.value = newBoard

  moveHistory.value.push({
    row,
    col,
    player: currentPlayer.value,
    boardState: board.value.map(r => [...r])
  })
  lastMove.value = { row, col }

  if (checkWin(board.value, row, col, currentPlayer.value)) {
    winner.value = currentPlayer.value
    gameStarted.value = false
  } else if (checkDraw(board.value)) {
    winner.value = 'draw'
    gameStarted.value = false
  } else {
    currentPlayer.value = currentPlayer.value === BLACK ? WHITE : BLACK
  }
}

const undoMove = () => {
  if (moveHistory.value.length === 0 || winner.value) return

  // 人机模式撤销两步
  const steps = gameMode.value === 'pve' ? 2 : 1

  for (let i = 0; i < steps && moveHistory.value.length > 0; i++) {
    const last = moveHistory.value.pop()
    if (last) {
      board.value = last.boardState.map(r => [...r])
      currentPlayer.value = last.player
    }
  }

  lastMove.value = moveHistory.value.length > 0
    ? { row: moveHistory.value[moveHistory.value.length - 1].row, col: moveHistory.value[moveHistory.value.length - 1].col }
    : null
}
</script>

<style scoped>
.gobang-view {
  height: 100%;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 30px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  text-align: center;
}

.page-description {
  color: #909399;
  margin-bottom: 25px;
  text-align: center;
  font-size: 14px;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 500px;
  margin: 0 auto;
}

/* 游戏设置 */
.game-settings {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-item label {
  font-size: 14px;
  color: #606266;
}

/* 游戏状态 */
.game-status {
  margin-bottom: 20px;
  padding: 10px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.status-info {
  font-size: 15px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.current-player {
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 4px;
  background: #f0f2f5;
}

.current-player.black {
  color: #333;
}

.current-player.white {
  color: #666;
}

/* 棋盘 */
.board-wrapper {
  padding: 16px;
  background: #f8d588;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: visible;
}

.board {
  position: relative;
  /* 15 条线，14 个间隔，加上边距容纳棋子 */
  width: calc(14 * var(--cell-size, 30px));
  height: calc(14 * var(--cell-size, 30px));
  background: #f8d588;
}

.lines-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.lines-horizontal,
.lines-vertical {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.lines-horizontal .line,
.lines-vertical .line {
  position: absolute;
  background: #5c3f0f;
}

.lines-horizontal .line {
  width: 100%;
  height: 1px;
}

.lines-vertical .line {
  width: 1px;
  height: 100%;
}

/* 生成横线位置 - 15 条线，每条线间距为 cell-size */
.lines-horizontal .line:nth-child(1) { top: 0; }
.lines-horizontal .line:nth-child(2) { top: calc(1 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(3) { top: calc(2 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(4) { top: calc(3 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(5) { top: calc(4 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(6) { top: calc(5 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(7) { top: calc(6 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(8) { top: calc(7 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(9) { top: calc(8 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(10) { top: calc(9 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(11) { top: calc(10 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(12) { top: calc(11 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(13) { top: calc(12 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(14) { top: calc(13 * var(--cell-size, 30px)); }
.lines-horizontal .line:nth-child(15) { top: calc(14 * var(--cell-size, 30px)); }

/* 生成竖线位置 - 15 条线，每条线间距为 cell-size */
.lines-vertical .line:nth-child(1) { left: 0; }
.lines-vertical .line:nth-child(2) { left: calc(1 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(3) { left: calc(2 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(4) { left: calc(3 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(5) { left: calc(4 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(6) { left: calc(5 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(7) { left: calc(6 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(8) { left: calc(7 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(9) { left: calc(8 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(10) { left: calc(9 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(11) { left: calc(10 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(12) { left: calc(11 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(13) { left: calc(12 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(14) { left: calc(13 * var(--cell-size, 30px)); }
.lines-vertical .line:nth-child(15) { left: calc(14 * var(--cell-size, 30px)); }

/* 行和棋子 - 棋子中心对准交叉点 */
.row {
  position: absolute;
  display: flex;
  left: 0;
  top: 0;
  /* 行高为 0，让棋子中心精确对准交叉点 */
  height: 0;
  width: 100%;
}

.cell {
  width: calc(var(--cell-size, 30px));
  height: calc(var(--cell-size, 30px));
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* 向左上偏移 50%，让棋子中心（而非单元格）对准交叉点 */
  transform: translate(-50%, -50%);
}

.cell::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--cell-size, 30px));
  height: calc(var(--cell-size, 30px));
}

.cell:hover::before {
  opacity: 1;
}

.cell::before {
  content: '';
  position: absolute;
  width: calc(var(--cell-size, 30px) * 0.27);
  height: calc(var(--cell-size, 30px) * 0.27);
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.stone {
  width: calc(var(--cell-size, 30px) * 0.8);
  height: calc(var(--cell-size, 30px) * 0.8);
  border-radius: 50%;
  z-index: 2;
  pointer-events: none;
}

.stone.black {
  background: #333;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
}

.stone.white {
  background: #fff;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
  border: 1px solid #ddd;
}

.last-move-marker {
  position: absolute;
  width: calc(var(--cell-size, 30px) * 0.2);
  height: calc(var(--cell-size, 30px) * 0.2);
  background: #f56c6c;
  border-radius: 50%;
  z-index: 3;
}

/* 按钮组 */
.btn-group {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 移动端适配 */
@media screen and (max-width: 500px) {
  .gobang-view {
    padding: 10px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-description {
    font-size: 13px;
    margin-bottom: 20px;
  }

  .game-container {
    max-width: 100%;
  }

  .game-settings {
    gap: 12px;
    width: 100%;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .setting-item label {
    font-size: 13px;
  }

  .game-status {
    width: 100%;
    margin-bottom: 15px;
    padding: 8px 15px;
  }

  .status-info {
    font-size: 14px;
  }

  /* 使用 CSS 变量调整棋盘大小 */
  .board-wrapper {
    --cell-size: min(20px, (100vw - 40px) / 16);
    padding: 10px;
  }

  .btn-group {
    width: 100%;
    justify-content: stretch;
    gap: 10px;
  }

  .btn-group .el-button {
    flex: 1;
    min-width: 70px;
    padding: 10px 8px;
    font-size: 13px;
  }
}

/* iPhone SE 等超小屏幕适配 */
@media screen and (max-width: 375px) {
  .gobang-view {
    padding: 8px;
  }

  .board-wrapper {
    --cell-size: min(18px, (100vw - 32px) / 16);
    padding: 8px;
  }

  .page-title {
    font-size: 18px;
  }

  .page-description {
    font-size: 12px;
    margin-bottom: 15px;
  }

  .game-status {
    padding: 6px 12px;
    margin-bottom: 12px;
  }

  .status-info {
    font-size: 13px;
  }

  .btn-group .el-button {
    padding: 8px 6px;
    font-size: 12px;
  }
}
</style>
