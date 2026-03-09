<template>
  <div class="game24-view page-container">
    <div class="card-container">
      <h2 class="page-title">24 点游戏</h2>
      <p class="page-description">使用加减乘除和括号，将 4 张牌的数字计算出 24</p>

      <div class="game-container">
        <!-- 游戏牌面 - 可点击选择 -->
        <div class="cards-display">
          <div
            v-for="(card, index) in cards"
            :key="index"
            class="card"
            :class="[getCardSuitClass(card), { 'card-used': cardUsed[index] }]"
            @click="addCardToExpression(index)"
          >
            <div class="card-value">{{ card.display }}</div>
            <div class="card-suit">{{ card.suit }}</div>
            <!-- 已使用标记 -->
            <div v-if="cardUsed[index]" class="card-used-mask">
              <el-icon><CircleCloseFilled /></el-icon>
            </div>
          </div>
        </div>

        <!-- 游戏状态 -->
        <div class="game-status">
          <el-alert
            v-if="message"
            :title="message"
            :type="messageType"
            :closable="false"
            show-icon
            class="message-alert"
          />
          <div v-else class="hint-text">
            <el-icon><InfoFilled /></el-icon>
            <span>点击牌添加到下方，点击运算符组成表达式，点击表达式中的牌可取消</span>
          </div>
        </div>

        <!-- 表达式显示区 - 扑克牌样式 -->
        <div class="expression-area">
          <div class="expression-label">
            <el-icon><Coin /></el-icon>
            <span>当前表达式</span>
          </div>
          <div class="expression-display">
            <template v-for="(item, index) in expression" :key="index">
              <!-- 数字使用扑克牌样式，可点击移除 -->
              <div
                v-if="item.type === 'number'"
                class="expression-card"
                :class="getExpressionCardClass(item)"
                @click="removeFromExpression(index)"
              >
                <div class="expr-card-value">{{ getCardDisplay(item.value) }}</div>
                <div class="expr-card-suit">{{ getCardSuit(item) }}</div>
              </div>
              <!-- 运算符样式，也可点击移除 -->
              <div
                v-else
                class="expression-operator"
                @click="removeFromExpression(index)"
              >
                {{ formatOperator(item.value) }}
              </div>
            </template>
            <span v-if="expression.length === 0" class="placeholder">点击牌添加到下方...</span>
          </div>
        </div>

        <!-- 运算符选择区 -->
        <div class="operator-section">
          <div class="operator-buttons">
            <el-button @click="addOperator('+')" size="default" class="op-btn">+</el-button>
            <el-button @click="addOperator('-')" size="default" class="op-btn">-</el-button>
            <el-button @click="addOperator('*')" size="default" class="op-btn">×</el-button>
            <el-button @click="addOperator('/')" size="default" class="op-btn">÷</el-button>
            <el-button @click="addOperator('(')" size="default" class="op-btn">(</el-button>
            <el-button @click="addOperator(')')" size="default" class="op-btn">)</el-button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="btn-group">
          <el-button type="primary" @click="checkResult" :disabled="expression.length === 0" size="default">
            <el-icon><Operation /></el-icon>
            计算
          </el-button>
          <el-button @click="clearExpression" size="default">
            <el-icon><RefreshLeft /></el-icon>
            清除
          </el-button>
          <el-button @click="newGame" size="default">
            <el-icon><RefreshRight /></el-icon>
            换一局
          </el-button>
          <el-button @click="showSolution" size="default">
            <el-icon><View /></el-icon>
            看答案
          </el-button>
        </div>

        <!-- 答案区域 -->
        <div v-if="showSolutionArea" class="solution-area">
          <div class="solution-header">
            <span class="solution-label">
              <el-icon><Star /></el-icon>
              参考答案 ({{ currentSolutionIndex + 1 }} / {{ allSolutions.length }})
            </span>
            <div class="solution-nav" v-if="allSolutions.length > 1">
              <el-button size="small" @click="prevSolution" :disabled="currentSolutionIndex === 0" circle>
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
              <el-button size="small" @click="nextSolution" :disabled="currentSolutionIndex >= allSolutions.length - 1" circle>
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="solution-content">
            <!-- 答案也用扑克牌样式显示 -->
            <template v-for="(item, idx) in parseSolution(currentSolution)" :key="idx">
              <div v-if="typeof item === 'number'" class="solution-card">
                <span class="sol-card-value">{{ getCardDisplay(item) }}</span>
              </div>
              <span v-else class="solution-operator">{{ formatOperator(item) }}</span>
            </template>
          </div>
          <div class="solution-actions">
            <el-button type="primary" size="small" @click="fillSolution">
              <el-icon><FolderDelete /></el-icon>
              填入表达式
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Operation, RefreshLeft, RefreshRight, View, InfoFilled,
  Coin, Star, ArrowLeft, ArrowRight, FolderDelete, CircleCloseFilled
} from '@element-plus/icons-vue'

// 扑克牌花色和值
const SUITS = ['♠', '♥', '♣', '♦']
const VALUES = [
  { display: 'A', value: 1 },
  { display: '2', value: 2 },
  { display: '3', value: 3 },
  { display: '4', value: 4 },
  { display: '5', value: 5 },
  { display: '6', value: 6 },
  { display: '7', value: 7 },
  { display: '8', value: 8 },
  { display: '9', value: 9 },
  { display: '10', value: 10 },
  { display: 'J', value: 11 },
  { display: 'Q', value: 12 },
  { display: 'K', value: 13 }
]

// 数字到卡牌显示的映射
const numberToCardDisplay = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K'
}

// 游戏状态
const cards = ref([])
const cardUsed = ref([false, false, false, false])
const expression = ref([]) // 存储 { type: 'number'|'operator', value: string, cardIndex?: number }
const message = ref('')
const messageType = ref('info')
const showSolutionArea = ref(false)
const allSolutions = ref([])
const currentSolutionIndex = ref(0)
const currentSolution = ref('')

// 生成随机卡牌
const generateCards = () => {
  const newCards = []
  for (let i = 0; i < 4; i++) {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)]
    const valueObj = VALUES[Math.floor(Math.random() * VALUES.length)]
    newCards.push({
      suit,
      display: valueObj.display,
      value: valueObj.value
    })
  }
  return newCards
}

// 检查是否有解
const hasSolution = (nums) => {
  const solve = (arr) => {
    if (arr.length === 1) {
      return Math.abs(arr[0] - 24) < 0.000001
    }
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue
        const remaining = arr.filter((_, k) => k !== i && k !== j)
        if (solve([arr[i] + arr[j], ...remaining])) return true
        if (solve([arr[i] - arr[j], ...remaining])) return true
        if (solve([arr[i] * arr[j], ...remaining])) return true
        if (arr[j] !== 0 && solve([arr[i] / arr[j], ...remaining])) return true
      }
    }
    return false
  }
  return solve(nums)
}

// 寻找所有解
const findAllSolutions = (nums) => {
  const solutions = new Set()

  const solve = (arr, exprs) => {
    if (arr.length === 1) {
      if (Math.abs(arr[0] - 24) < 0.000001) {
        let expr = exprs[0]
        while (expr.startsWith('(') && expr.endsWith(')')) {
          const inner = expr.slice(1, -1)
          let count = 0
          let valid = true
          for (let i = 0; i < inner.length; i++) {
            if (inner[i] === '(') count++
            else if (inner[i] === ')') count--
            if (count < 0) { valid = false; break; }
          }
          if (valid && count === 0) expr = inner
          else break
        }
        solutions.add(expr)
      }
      return
    }

    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue
        const remaining = arr.filter((_, k) => k !== i && k !== j)
        const exprRemaining = exprs.filter((_, k) => k !== i && k !== j)

        for (let op = 0; op < 4; op++) {
          let newVal, newExpr
          const a = arr[i], b = arr[j]
          const exprA = exprs[i], exprB = exprs[j]

          if (op === 0) {
            newVal = a + b
            newExpr = `(${exprA}+${exprB})`
          } else if (op === 1) {
            newVal = a - b
            newExpr = `(${exprA}-${exprB})`
          } else if (op === 2) {
            newVal = a * b
            newExpr = `(${exprA}*${exprB})`
          } else {
            if (b === 0) continue
            newVal = a / b
            newExpr = `(${exprA}/${exprB})`
          }

          solve([newVal, ...remaining], [newExpr, ...exprRemaining])
        }
      }
    }
  }

  const strNums = nums.map(n => n.toString())
  solve(nums, strNums)
  return Array.from(solutions)
}

// 初始化游戏
const newGame = () => {
  let newCards
  let nums
  do {
    newCards = generateCards()
    nums = newCards.map(c => c.value)
  } while (!hasSolution(nums))

  cards.value = newCards
  cardUsed.value = [false, false, false, false]
  expression.value = []
  message.value = ''
  messageType.value = 'info'
  showSolutionArea.value = false
  allSolutions.value = []
  currentSolutionIndex.value = 0
  currentSolution.value = ''
}

// 获取花色样式类
const getCardSuitClass = (card) => {
  if (card.suit === '♥' || card.suit === '♦') {
    return 'card-red'
  }
  return 'card-black'
}

// 获取卡牌显示
const getCardDisplay = (value) => {
  const num = parseInt(value)
  return numberToCardDisplay[num] || value
}

// 获取表达式中卡牌的花色
const getCardSuit = (item) => {
  if (item.cardIndex !== undefined && cards.value[item.cardIndex]) {
    return cards.value[item.cardIndex].suit
  }
  return ''
}

// 获取表达式中卡牌的样式类
const getExpressionCardClass = (item) => {
  const suit = getCardSuit(item)
  if (suit === '♥' || suit === '♦') {
    return 'expr-card-red'
  }
  return 'expr-card-black'
}

// 格式化运算符显示
const formatOperator = (op) => {
  if (op === '*') return '×'
  if (op === '/') return '÷'
  return op
}

// 添加卡牌到表达式
const addCardToExpression = (index) => {
  // 清除之前的消息
  message.value = ''

  if (cardUsed.value[index]) {
    message.value = '这张牌已经使用过了'
    messageType.value = 'warning'
    return
  }

  expression.value.push({
    type: 'number',
    value: cards.value[index].value.toString(),
    cardIndex: index
  })

  // 使用 splice 确保响应式更新
  cardUsed.value.splice(index, 1, true)
}

// 添加运算符到表达式
const addOperator = (op) => {
  expression.value.push({
    type: 'operator',
    value: op
  })
  message.value = ''
}

// 从表达式移除
const removeFromExpression = (index) => {
  const item = expression.value[index]
  if (item.type === 'number' && item.cardIndex !== undefined) {
    // 使用 splice 确保响应式更新
    cardUsed.value.splice(item.cardIndex, 1, false)
  }
  expression.value.splice(index, 1)
  message.value = ''
}

// 清除表达式
const clearExpression = () => {
  // 释放所有已使用的牌
  expression.value.forEach(item => {
    if (item.type === 'number' && item.cardIndex !== undefined) {
      cardUsed.value.splice(item.cardIndex, 1, false)
    }
  })
  expression.value = []
  message.value = ''
  showSolutionArea.value = false
  allSolutions.value = []
  currentSolutionIndex.value = 0
  currentSolution.value = ''
}

// 计算表达式
const evaluateExpression = (expr) => {
  try {
    let safeExpr = expr.replace(/[^0-9+\-*/()]/g, '')
    const openParens = (safeExpr.match(/\(/g) || []).length
    const closeParens = (safeExpr.match(/\)/g) || []).length
    if (openParens !== closeParens) {
      return null
    }
    const result = new Function('return ' + safeExpr)()
    return result
  } catch {
    return null
  }
}

// 检查结果
const checkResult = () => {
  const exprStr = expression.value.map(item => item.value).join('')
  if (!exprStr) {
    message.value = '请输入表达式'
    messageType.value = 'warning'
    return
  }

  // 检查是否所有卡牌都已使用
  const usedCount = cardUsed.value.filter(u => u).length
  if (usedCount < 4) {
    message.value = `还有 ${4 - usedCount} 张牌未使用，请使用所有卡牌`
    messageType.value = 'warning'
    return
  }

  const result = evaluateExpression(exprStr)
  if (result === null) {
    message.value = '无效的表达式'
    messageType.value = 'error'
    return
  }

  if (Math.abs(result - 24) < 0.000001) {
    message.value = '恭喜！计算正确！'
    messageType.value = 'success'
  } else {
    message.value = `结果是 ${result}，不是 24，再试一次！`
    messageType.value = 'error'
  }
}

// 解析答案表达式为数字和运算符
const parseSolution = (expr) => {
  const result = []
  let i = 0
  while (i < expr.length) {
    const char = expr[i]
    if (char >= '0' && char <= '9') {
      let numStr = char
      while (i + 1 < expr.length && expr[i + 1] >= '0' && expr[i + 1] <= '9') {
        numStr += expr[i + 1]
        i++
      }
      result.push(parseInt(numStr))
    } else if (['+', '-', '*', '/', '(', ')'].includes(char)) {
      result.push(char)
    }
    i++
  }
  return result
}

// 显示答案
const showSolution = () => {
  const nums = cards.value.map(c => c.value)
  allSolutions.value = findAllSolutions(nums)

  if (allSolutions.value.length > 0) {
    currentSolutionIndex.value = 0
    currentSolution.value = allSolutions.value[0]
    showSolutionArea.value = true
    message.value = `找到 ${allSolutions.value.length} 种解法`
    messageType.value = 'info'
  } else {
    message.value = '未找到解法'
    messageType.value = 'error'
  }
}

// 上一个答案
const prevSolution = () => {
  if (currentSolutionIndex.value > 0) {
    currentSolutionIndex.value--
    currentSolution.value = allSolutions.value[currentSolutionIndex.value]
  }
}

// 下一个答案
const nextSolution = () => {
  if (currentSolutionIndex.value < allSolutions.value.length - 1) {
    currentSolutionIndex.value++
    currentSolution.value = allSolutions.value[currentSolutionIndex.value]
  }
}

// 填入表达式
const fillSolution = () => {
  // 先清除表达式并释放所有牌
  expression.value = []
  cardUsed.value = [false, false, false, false]

  const parsed = parseSolution(currentSolution.value)
  const usedCards = new Set() // 记录已使用的卡牌索引

  parsed.forEach(item => {
    if (typeof item === 'number') {
      // 找到对应的卡牌（未被使用的）
      for (let i = 0; i < cards.value.length; i++) {
        if (cards.value[i].value === item && !usedCards.has(i)) {
          expression.value.push({
            type: 'number',
            value: item.toString(),
            cardIndex: i
          })
          usedCards.add(i)
          cardUsed.value.splice(i, 1, true)
          break
        }
      }
    } else {
      expression.value.push({
        type: 'operator',
        value: item
      })
    }
  })
  showSolutionArea.value = false
  message.value = '答案已填入表达式，点击"计算"验证'
  messageType.value = 'info'
}

// 初始化游戏
newGame()
</script>

<style scoped>
.game24-view {
  height: 100%;
  overflow-y: auto;
}

.page-description {
  color: var(--text-secondary);
  margin-bottom: 25px;
}

.game-container {
  max-width: 600px;
  margin: 0 auto;
}

/* 卡牌显示 */
.cards-display {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.card {
  width: 70px;
  height: 100px;
  border-radius: 12px;
  background: linear-gradient(145deg, #fff 0%, #f8f9fa 100%);
  border: 2px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.card:hover:not(.card-used) {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
}

.card:active:not(.card-used) {
  transform: scale(0.95);
}

/* 已使用样式 */
.card-used {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(80%);
}

.card-used .card-value,
.card-used .card-suit {
  opacity: 0.5;
}

/* 已使用标记 */
.card-used-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: #f56c6c;
}

.card-red {
  color: #e74c3c;
}

.card-black {
  color: #333;
}

.card-value {
  font-size: 28px;
  line-height: 1;
}

.card-suit {
  font-size: 20px;
  margin-top: 5px;
}

/* 游戏状态 */
.game-status {
  margin-bottom: 20px;
  min-height: 50px;
}

.message-alert {
  border-radius: 8px;
}

.hint-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.hint-text .el-icon {
  color: #409eff;
}

/* 表达式显示区 */
.expression-area {
  margin-bottom: 25px;
}

.expression-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular);
  margin-bottom: 10px;
}

.expression-label .el-icon {
  color: #409eff;
}

.expression-display {
  background: linear-gradient(145deg, #fafafa 0%, #f5f5f5 100%);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 15px;
  min-height: 80px;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  gap: 8px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  justify-content: center;
}

.expression-display::-webkit-scrollbar {
  height: 6px;
}

.expression-display::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.expression-display::-webkit-scrollbar-track {
  background: #f5f7fa;
  border-radius: 3px;
}

.placeholder {
  color: var(--text-secondary);
  font-size: 14px;
}

/* 表达式中的扑克牌样式 */
.expression-card {
  width: 45px;
  height: 60px;
  border-radius: 8px;
  background: linear-gradient(145deg, #fff 0%, #f8f9fa 100%);
  border: 2px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.expression-card:hover {
  transform: scale(1.05);
  border-color: #f56c6c;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
}

.expression-card:active {
  transform: scale(0.95);
}

.expr-card-value {
  pointer-events: none;
  font-size: 18px;
  line-height: 1;
}

.expr-card-suit {
  pointer-events: none;
  font-size: 12px;
  margin-top: 2px;
}

.expr-card-red {
  color: #e74c3c;
}

.expr-card-black {
  color: #333;
}

/* 运算符样式 */
.expression-operator {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 0 6px;
  min-width: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expression-operator:hover {
  color: #f56c6c;
}

.expression-operator:active {
  transform: scale(0.9);
}

/* 运算符选择区 */
.operator-section {
  margin: 20px 0;
}

.operator-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  justify-content: center;
  padding-bottom: 5px;
}

.operator-buttons::-webkit-scrollbar {
  height: 6px;
}

.operator-buttons::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.op-btn {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 10px;
}

/* 答案区域 */
.solution-area {
  margin-top: 25px;
  padding: 20px;
  background: linear-gradient(145deg, #f0f9eb 0%, #e8f5e9 100%);
  border: 2px solid #c8e6c9;
  border-radius: 12px;
}

.solution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.solution-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular);
}

.solution-label .el-icon {
  color: #f59e0b;
}

.solution-nav {
  display: flex;
  gap: 8px;
}

.solution-content {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 15px;
}

.solution-content::-webkit-scrollbar {
  height: 6px;
}

.solution-content::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

.solution-card {
  width: 40px;
  height: 55px;
  border-radius: 8px;
  background: linear-gradient(145deg, #fff 0%, #f8f9fa 100%);
  border: 2px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.sol-card-value {
  font-size: 18px;
  line-height: 1;
}

.solution-operator {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 5px 8px;
  background: #ecf5ff;
  border-radius: 6px;
}

.solution-actions {
  display: flex;
  justify-content: center;
}

/* 按钮组 */
.btn-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .game-container {
    max-width: 100%;
  }

  .cards-display {
    gap: 12px;
    margin-bottom: 20px;
  }

  .card {
    width: 65px;
    height: 90px;
    border-radius: 10px;
  }

  .card-value {
    font-size: 24px;
  }

  .card-suit {
    font-size: 16px;
    margin-top: 4px;
  }

  .expression-area {
    margin-bottom: 20px;
  }

  .expression-label {
    font-size: 13px;
    margin-bottom: 8px;
  }

  .expression-display {
    padding: 12px;
    min-height: 70px;
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .expression-display::-webkit-scrollbar {
    height: 4px;
  }

  .expression-display::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 2px;
  }

  .expression-card {
    width: 42px;
    height: 58px;
    border-radius: 7px;
  }

  .expr-card-value {
    font-size: 16px;
  }

  .expr-card-suit {
    font-size: 11px;
    margin-top: 2px;
  }

  .expression-operator {
    font-size: 18px;
    padding: 0 4px;
    min-width: 20px;
  }

  .placeholder {
    font-size: 13px;
  }

  /* 运算符按钮 */
  .operator-section {
    margin: 20px 0;
  }

  .operator-buttons {
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
    padding-bottom: 4px;
  }

  .operator-buttons::-webkit-scrollbar {
    height: 4px;
  }

  .operator-buttons::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 2px;
  }

  .op-btn {
    flex-shrink: 0;
    width: 45px;
    height: 45px;
    font-size: 16px;
    border-radius: 8px;
  }

  /* 答案区域 */
  .solution-area {
    padding: 15px;
  }

  .solution-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .solution-label {
    font-size: 13px;
  }

  .solution-content {
    padding: 12px;
    gap: 6px;
  }

  .solution-card {
    width: 38px;
    height: 52px;
    border-radius: 7px;
  }

  .sol-card-value {
    font-size: 16px;
  }

  .solution-operator {
    font-size: 18px;
    padding: 4px 7px;
  }

  .solution-actions {
    margin-top: 10px;
  }

  .solution-actions .el-button {
    width: 100%;
  }

  /* 按钮组 */
  .btn-group {
    width: 100%;
    gap: 8px;
  }

  .btn-group .el-button {
    flex: 1;
    min-width: 70px;
    padding: 10px 8px;
    font-size: 13px;
  }
}

/* 超小屏幕适配 */
@media screen and (max-width: 375px) {
  .game-container {
    padding: 0 5px;
  }

  .cards-display {
    gap: 8px;
    margin-bottom: 15px;
  }

  .card {
    width: 55px;
    height: 78px;
    border-radius: 8px;
  }

  .card-value {
    font-size: 20px;
  }

  .card-suit {
    font-size: 14px;
    margin-top: 3px;
  }

  .expression-display {
    padding: 10px;
    gap: 5px;
  }

  .expression-card {
    width: 38px;
    height: 52px;
    border-radius: 6px;
  }

  .expr-card-value {
    font-size: 14px;
  }

  .expr-card-suit {
    font-size: 10px;
  }

  .expression-operator {
    font-size: 16px;
    padding: 0 3px;
    min-width: 18px;
  }

  .placeholder {
    font-size: 12px;
  }

  /* 运算符按钮 */
  .operator-buttons {
    gap: 5px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
    padding-bottom: 3px;
  }

  .operator-buttons::-webkit-scrollbar {
    height: 3px;
  }

  .op-btn {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    font-size: 14px;
    border-radius: 7px;
  }

  /* 答案区域 */
  .solution-area {
    padding: 12px;
  }

  .solution-label {
    font-size: 12px;
  }

  .solution-content {
    padding: 10px;
    gap: 5px;
  }

  .solution-card {
    width: 34px;
    height: 46px;
    border-radius: 6px;
  }

  .sol-card-value {
    font-size: 14px;
  }

  .solution-operator {
    font-size: 16px;
    padding: 3px 6px;
  }

  /* 按钮组 */
  .btn-group .el-button {
    padding: 9px 6px;
    font-size: 12px;
  }
}
</style>
