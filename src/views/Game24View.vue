<template>
  <div class="game24-view page-container">
    <div class="card-container">
      <h2 class="page-title">24 点游戏</h2>
      <p class="page-description">使用加减乘除和括号，将 4 张牌的数字计算出 24</p>

      <!-- 游戏结束视图 -->
      <div v-if="gameOver" class="game-over-overlay" :class="{ 'game-over-animate': showGameOverAnimate }">
        <div class="game-over-content">
          <div class="game-over-icon">
            <el-icon :size="80">
              <Trophy v-if="gameWon" />
              <CircleCloseFilled v-else />
            </el-icon>
          </div>
          <h3 class="game-over-title">{{ gameWon ? '恭喜升级！' : '游戏结束' }}</h3>
          <div class="game-result">
            <span class="result-text" :class="gameWon ? 'victory' : 'defeat'">
              {{ gameWon ? '胜利' : '失败' }}
            </span>
          </div>
          <div class="score-stats">
            <div class="stat-item">
              <el-icon><SuccessFilled /></el-icon>
              <span>{{ correctCount }} 正确</span>
            </div>
            <div class="stat-item">
              <el-icon><View /></el-icon>
              <span>{{ showSolutionCount }} 看答案</span>
            </div>
            <div class="stat-item">
              <el-icon><RefreshRight /></el-icon>
              <span>{{ skipCount }} 跳过</span>
            </div>
          </div>
          <div class="game-over-comment">{{ gameComment }}</div>
          <!-- 答案显示（看答案结束游戏时显示） -->
          <div v-if="endGameSolution && endGameAllSolutions.length > 0" class="end-game-solution">
            <div class="solution-title">
              <el-icon><MagicStick /></el-icon>
              <span>本题答案</span>
              <span class="solution-count" v-if="endGameAllSolutions.length > 1">
                ({{ endGameSolutionIndex + 1 }} / {{ endGameAllSolutions.length }})
              </span>
            </div>
            <div class="solution-preview">
              <template v-for="(item, idx) in parseSolution(endGameSolution)" :key="idx">
                <span v-if="typeof item === 'number'" class="sol-num">{{ getCardDisplay(item) }}</span>
                <span v-else class="sol-op">{{ formatOperator(item) }}</span>
              </template>
            </div>
            <div class="solution-nav-btns" v-if="endGameAllSolutions.length > 1">
              <el-button size="small" @click="prevEndGameSolution" :disabled="endGameSolutionIndex === 0" circle>
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
              <el-button size="small" @click="nextEndGameSolution" :disabled="endGameSolutionIndex >= endGameAllSolutions.length - 1" circle>
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
          <el-button type="primary" @click="restartGame" size="large" class="restart-btn">
            <el-icon><RefreshRight /></el-icon>
            重新开始
          </el-button>
        </div>
      </div>

      <div class="game-container">
        <!-- 积分显示 -->
        <div class="score-display">
          <div class="score-info">
            <el-icon :size="20"><Coin /></el-icon>
            <span class="score-label">积分</span>
          </div>
          <div class="score-value-wrap">
            <span class="current-score" :class="getScoreClass(score)">{{ score }}</span>
          </div>
          <!-- 分数变化动画 -->
          <transition name="score-change">
            <div v-if="showScoreChange" class="score-change" :class="scoreChangeType">
              {{ scoreChangeText }}
            </div>
          </transition>
        </div>

        <!-- 游戏牌面 - 可点击选择 -->
        <div class="cards-display">
          <div
            v-for="(card, index) in cards"
            :key="`card-${cardRefreshKey}-${index}`"
            class="card"
            :class="[getCardSuitClass(card), { 'card-used': cardUsed[index] }, { 'card-correct': showCorrectAnimate && cardUsed[index] }]"
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
          <el-button @click="skipGame" size="default" :disabled="score <= 1 || gameOver">
            <el-icon><RefreshRight /></el-icon>
            跳过
          </el-button>
          <el-button @click="showSolutionOrRestart" size="default">
            <el-icon><View /></el-icon>
            {{ gameOver || score <= 0 ? '重来一局' : '看答案' }}
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

        <!-- 庆祝特效 -->
        <div v-if="showCelebrate" class="celebrate-overlay">
          <div class="celebrate-content">
            <div class="celebrate-text">
              <span v-for="(char, i) in celebrateText" :key="i" :style="{ animationDelay: i * 0.1 + 's' }">
                {{ char }}
              </span>
            </div>
            <div class="celebrate-icons">
              <span class="icon-item" v-for="n in 5" :key="n" :style="{ animationDelay: n * 0.15 + 's' }">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#fbbf24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Operation, RefreshLeft, RefreshRight, View, InfoFilled,
  Coin, Star, ArrowLeft, ArrowRight, FolderDelete, CircleCloseFilled,
  Trophy, SuccessFilled, MagicStick
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

// 积分系统
const score = ref(10) // 初始 10 分
const finalScore = ref(0)
const gameOver = ref(false)
const gameWon = ref(false) // 是否胜利（达到 45 分）
const showGameOverAnimate = ref(false)
const correctCount = ref(0)
const showSolutionCount = ref(0)
const skipCount = ref(0)

// 当前题目状态
const currentRound = ref(0) // 当前回合数
const viewedSolution = ref(false) // 当前题目是否看过答案
const viewedSolutionRound = ref(-1) // 看答案的回合数
const cardRefreshKey = ref(0) // 卡片刷新 key，用于触发动画

// 按钮防重复点击
const isProcessing = ref(false) // 是否正在处理中

// 游戏结束时答案显示
const endGameSolution = ref('')
const endGameAllSolutions = ref([])
const endGameSolutionIndex = ref(0)

// 趣味效果
const shakeEffect = ref(false)
const showScoreChange = ref(false)
const scoreChangeText = ref('')
const scoreChangeType = ref('') // 'positive' or 'negative'
const showCorrectAnimate = ref(false)
const showCelebrate = ref(false)
const celebrateText = ref('')

// 游戏评论
const gameComments = {
  victory: ['恭喜升级！', '太厉害了！', '完美通关！'],
  defeat: ['再接再厉', '别灰心，加油！', '从头再来，你可以的！']
}

const gameComment = computed(() => {
  if (gameWon.value) {
    return gameComments.victory[Math.floor(Math.random() * gameComments.victory.length)]
  } else {
    return gameComments.defeat[Math.floor(Math.random() * gameComments.defeat.length)]
  }
})

// 是否可以看答案
const canShowSolution = computed(() => {
  return score.value > 0 || !gameOver.value
})

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
  showCorrectAnimate.value = false
  showCelebrate.value = false
  isProcessing.value = false
  currentRound.value++
  endGameSolution.value = ''
  cardRefreshKey.value++ // 触发卡牌动画
}

// 跳过游戏
const skipGame = () => {
  if (isProcessing.value || gameOver.value) return

  if (score.value <= 1) {
    message.value = '分数不足，无法跳过'
    messageType.value = 'warning'
    return
  }

  isProcessing.value = true
  updateScore(-1, 'skip')
  skipCount.value++
  viewedSolution.value = false
  viewedSolutionRound.value = -1
  setTimeout(() => {
    newGame()
  }, 500)
}

// 更新分数
const updateScore = (delta, reason) => {
  const oldScore = score.value
  score.value += delta

  // 显示分数变化动画
  scoreChangeText.value = (delta > 0 ? '+' : '') + delta
  scoreChangeType.value = delta > 0 ? 'positive' : 'negative'
  showScoreChange.value = true

  setTimeout(() => { showScoreChange.value = false }, 1000)

  // 检查游戏升级（达到 45 分）
  if (score.value >= 45 && reason === 'correct') {
    triggerCelebrate() // 触发庆祝动画
    setTimeout(() => {
      endGame(true) // 胜利
    }, 1000)
    return
  }

  // 检查游戏结束（分数 <= 0）
  if (score.value <= 0 && reason !== 'correct') {
    endGame(false) // 失败
  }
}

// 游戏结束
const endGame = (isVictory = false) => {
  gameWon.value = isVictory
  // 先保存所有答案（如果看过答案）
  if (viewedSolution.value && endGameAllSolutions.value.length > 0) {
    // 答案已经保存在 endGameAllSolutions 中
    endGameSolutionIndex.value = Math.min(endGameSolutionIndex.value, endGameAllSolutions.value.length - 1)
    endGameSolution.value = endGameAllSolutions.value[endGameSolutionIndex.value]
  } else {
    endGameSolution.value = ''
    endGameAllSolutions.value = []
    endGameSolutionIndex.value = 0
  }

  gameOver.value = true
  showGameOverAnimate.value = true
}

// 上一个答案（游戏结束页面）
const prevEndGameSolution = () => {
  if (endGameSolutionIndex.value > 0) {
    endGameSolutionIndex.value--
    endGameSolution.value = endGameAllSolutions.value[endGameSolutionIndex.value]
  }
}

// 下一个答案（游戏结束页面）
const nextEndGameSolution = () => {
  if (endGameSolutionIndex.value < endGameAllSolutions.value.length - 1) {
    endGameSolutionIndex.value++
    endGameSolution.value = endGameAllSolutions.value[endGameSolutionIndex.value]
  }
}

// 重新开始游戏
const restartGame = () => {
  if (isProcessing.value) return

  score.value = 10
  finalScore.value = 0
  gameWon.value = false
  gameOver.value = false
  showGameOverAnimate.value = false
  correctCount.value = 0
  showSolutionCount.value = 0
  skipCount.value = 0
  currentRound.value = 0
  viewedSolution.value = false
  viewedSolutionRound.value = -1
  newGame()
}

// 获取分数样式类
const getScoreClass = (val) => {
  if (val >= 15) return 'score-excellent'
  if (val >= 10) return 'score-good'
  if (val >= 5) return 'score-normal'
  return 'score-low'
}

// 庆祝动画
const triggerCelebrate = () => {
  const texts = ['太棒了！', '完美！', '正确！', '厉害！', '666！']
  celebrateText.value = texts[Math.floor(Math.random() * texts.length)].split('')
  showCelebrate.value = true
  setTimeout(() => { showCelebrate.value = false }, 2000)
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
  if (isProcessing.value) return

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

  isProcessing.value = true

  if (Math.abs(result - 24) < 0.000001) {
    message.value = '恭喜！计算正确！'
    messageType.value = 'success'

    // 如果看过答案，不加分
    if (!viewedSolution.value || viewedSolutionRound.value !== currentRound.value) {
      updateScore(1, 'correct')
      correctCount.value++
    }

    // 播放庆祝动画
    showCorrectAnimate.value = true
    triggerCelebrate()

    setTimeout(() => {
      showCorrectAnimate.value = false
      viewedSolution.value = false
      viewedSolutionRound.value = -1
      // 自动进入下一局
      setTimeout(() => newGame(), 1500)
    }, 1000)
  } else {
    message.value = `结果是 ${result}，不是 24，再试一次！`
    messageType.value = 'error'
    isProcessing.value = false
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
  if (isProcessing.value || gameOver.value) return

  // 同一道题只扣一次分
  if (viewedSolution.value && viewedSolutionRound.value === currentRound.value) {
    message.value = '当前题目已看过答案，不再重复扣分'
    messageType.value = 'info'
    showSolutionArea.value = true
    return
  }

  isProcessing.value = true
  const nums = cards.value.map(c => c.value)
  const solutions = findAllSolutions(nums)

  if (solutions.length > 0) {
    // 先保存答案数据
    endGameAllSolutions.value = solutions
    endGameSolutionIndex.value = 0
    endGameSolution.value = solutions[0]

    currentSolutionIndex.value = 0
    currentSolution.value = solutions[0]
    showSolutionArea.value = true
    message.value = `找到 ${solutions.length} 种解法`
    messageType.value = 'info'
    showSolutionCount.value++
    viewedSolution.value = true
    viewedSolutionRound.value = currentRound.value

    // 扣分
    score.value -= 2

    // 显示分数变化动画
    scoreChangeText.value = '-2'
    scoreChangeType.value = 'negative'
    showScoreChange.value = true
    setTimeout(() => { showScoreChange.value = false }, 1000)

    // 如果分数 <= 0，延迟结束游戏
    if (score.value <= 0) {
      setTimeout(() => {
        endGame()
      }, 800)
    }
    isProcessing.value = false
  } else {
    message.value = '未找到解法'
    messageType.value = 'error'
    isProcessing.value = false
  }
}

// 看答案或重来一局
const showSolutionOrRestart = () => {
  if (gameOver.value) {
    restartGame()
    return
  }

  if (score.value <= 0) {
    restartGame()
    return
  }

  showSolution()
}

// 上一个答案
const prevSolution = () => {
  if (isProcessing.value) return
  if (currentSolutionIndex.value > 0) {
    currentSolutionIndex.value--
    currentSolution.value = allSolutions.value[currentSolutionIndex.value]
  }
}

// 下一个答案
const nextSolution = () => {
  if (isProcessing.value) return
  if (currentSolutionIndex.value < allSolutions.value.length - 1) {
    currentSolutionIndex.value++
    currentSolution.value = allSolutions.value[currentSolutionIndex.value]
  }
}

// 填入表达式
const fillSolution = () => {
  if (isProcessing.value) return

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
  position: relative;
}

/* 游戏结束覆盖层 */
.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.game-over-animate {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.game-over-content {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px;
  padding: 35px 30px;
  text-align: center;
  color: #1e293b;
  max-width: 488px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid #e2e8f0;
}

.game-over-icon {
  color: #ffd700;
  margin-bottom: 20px;
  animation: bounceIn 0.8s ease;
}

@keyframes bounceIn {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.game-over-title {
  font-size: 24px;
  margin-bottom: 18px;
  color: #f59e0b;
}

.game-result {
  background: rgba(241, 245, 249, 0.8);
  border-radius: 15px;
  padding: 18px;
  margin-bottom: 18px;
}

.game-result .result-text {
  font-size: 42px;
  font-weight: bold;
  line-height: 1;
}

.game-result .result-text.victory {
  color: #16a34a;
}

.game-result .result-text.defeat {
  color: #dc2626;
}

.score-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 18px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #475569;
}

.stat-item .el-icon {
  color: #64748b;
}

.game-over-comment {
  font-size: 15px;
  color: #475569;
  margin-bottom: 22px;
  font-style: italic;
}

/* 游戏结束答案显示 */
.end-game-solution {
  background: rgba(241, 245, 249, 0.8);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 22px;
  border: 1px solid #cbd5e1;
}

.solution-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #f59e0b;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 15px;
}

.solution-title .el-icon {
  font-size: 18px;
}

.solution-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.solution-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
  background: rgba(203, 213, 225, 0.3);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
}

.sol-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 50px;
  background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  font-size: 19px;
  font-weight: bold;
  color: #1e293b;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.sol-op {
  font-size: 20px;
  font-weight: 700;
  color: #f59e0b;
  padding: 0 1px;
}

.solution-nav-btns {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.solution-nav-btns .el-button {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.restart-btn {
  width: 100%;
  padding: 15px 30px;
  font-size: 18px;
}

/* 积分显示 */
.score-display {
  position: absolute;
  top: -45px;
  right: 0;
  background: #f0fdf4;
  border-radius: 20px;
  padding: 8px 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #86efac;
  z-index: 10;
}

.score-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.score-info .score-label {
  color: #15803d;
  font-weight: 600;
  font-size: 14px;
}

.game-over-content .score-label {
  color: #64748b;
}

.score-value-wrap {
  position: relative;
}

.current-score {
  font-size: 24px;
  font-weight: bold;
  color: #166534;
}

.current-score.score-excellent { color: #a855f7; }
.current-score.score-good { color: #16a34a; }
.current-score.score-normal { color: #2563eb; }
.current-score.score-low { color: #dc2626; }

/* 分数变化动画 */
.score-change-enter-active,
.score-change-leave-active {
  transition: all 0.5s ease;
}

.score-change-enter-from,
.score-change-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.score-change {
  position: absolute;
  top: -35px;
  right: 10px;
  font-size: 16px;
  font-weight: bold;
  animation: floatUp 1s ease forwards;
}

.score-change.positive {
  color: #16a34a;
}

.score-change.negative {
  color: #dc2626;
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px) scale(1.2);
  }
}

/* 答对动画 */
.card-correct {
  animation: correctFade 0.4s ease forwards;
}

@keyframes correctFade {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
    background: #f0fdf4;
  }
}

/* 庆祝特效 */
.celebrate-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.celebrate-content {
  text-align: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 30px 40px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  animation: celebrate-pop 0.4s ease-out forwards;
}

@keyframes celebrate-pop {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.celebrate-text {
  font-size: 36px;
  font-weight: bold;
  color: #16a34a;
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.celebrate-text span {
  display: inline-block;
  animation: celebrateFade 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes celebrateFade {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  50% {
    opacity: 1;
    transform: translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.celebrate-icons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.icon-item {
  animation: starFade 0.6s ease-out forwards;
  opacity: 0;
}

.icon-item .el-icon {
  color: #fbbf24;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

@keyframes starFade {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
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
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 249, 250, 0.8) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid rgba(228, 231, 237, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  position: relative;
  overflow: hidden;
  animation: card-fade-in 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card:nth-child(1) { animation-delay: 0.1s; }
.card:nth-child(2) { animation-delay: 0.2s; }
.card:nth-child(3) { animation-delay: 0.3s; }
.card:nth-child(4) { animation-delay: 0.4s; }

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

  /* 积分显示移动端适配 */
  .score-display {
    position: relative;
    top: auto;
    right: auto;
    justify-content: center;
    margin-bottom: 15px;
  }

  .score-info {
    font-size: 13px;
  }

  .score-label {
    font-size: 14px;
  }

  .current-score {
    font-size: 20px;
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
    justify-content: center;
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
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .solution-content::-webkit-scrollbar {
    height: 4px;
  }

  .solution-content::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 2px;
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

  /* 游戏结束覆盖层移动端适配 */
  .game-over-overlay {
    padding: 15px;
  }

  .game-over-content {
    padding: 25px 20px;
  }

  .game-over-title {
    font-size: 20px;
  }

  .score-value {
    font-size: 42px;
  }

  .score-stats {
    gap: 10px;
  }

  .stat-item {
    font-size: 11px;
  }

  .stat-item .el-icon {
    font-size: 18px;
  }

  .game-over-comment {
    font-size: 13px;
  }

  /* 游戏结束答案显示移动端适配 */
  .end-game-solution {
    padding: 15px 18px;
  }

  .solution-title {
    font-size: 14px;
    margin-bottom: 12px;
  }

  .solution-preview {
    padding: 10px;
    gap: 5px;
  }

  .sol-num {
    width: 34px;
    height: 46px;
    font-size: 17px;
  }

  .sol-op {
    font-size: 18px;
    padding: 0 1px;
  }

  .solution-nav-btns .el-button {
    width: 28px;
    height: 28px;
  }

  /* 庆祝特效移动端适配 */
  .celebrate-text {
    font-size: 36px;
  }

  .celebrate-icons .el-icon {
    width: 25px;
    height: 25px;
  }
}

/* 超小屏幕适配（iPhone SE） */
@media screen and (max-width: 375px) {
  .game-container {
    padding: 0 5px;
  }

  /* 积分显示超小屏幕适配 */
  .score-display {
    padding: 6px 12px;
    border-radius: 15px;
  }

  .score-info {
    font-size: 12px;
  }

  .current-score {
    font-size: 18px;
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
    justify-content: center;
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
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    justify-content: center;
  }

  .solution-content::-webkit-scrollbar {
    height: 3px;
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

  /* 游戏结束覆盖层超小屏幕适配 */
  .game-over-content {
    padding: 20px 15px;
  }

  .game-over-title {
    font-size: 20px;
  }

  .score-value {
    font-size: 40px;
  }

  .score-unit {
    font-size: 14px;
  }

  .stat-item {
    font-size: 11px;
  }

  .stat-item .el-icon {
    font-size: 18px;
  }

  .game-over-comment {
    font-size: 13px;
  }

  .restart-btn {
    padding: 12px 20px;
    font-size: 15px;
  }

  /* 庆祝特效超小屏幕适配 */
  .celebrate-text {
    font-size: 28px;
  }

  .celebrate-icons {
    gap: 10px;
  }
}
</style>
