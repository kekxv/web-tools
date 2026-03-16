<template>
  <div class="math-ten-view page-container">
    <div class="card-container">
      <!-- 游戏结束 -->
      <div v-if="gameOver" class="game-over">
        <div class="celebrate-animation" v-if="gameWon">
          <span v-for="i in 20" :key="i" class="confetti" :style="getConfettiStyle(i)">🎉</span>
        </div>
        <span class="result-emoji">{{ gameWon ? '🎉' : '💪' }}</span>
        <h3>{{ gameWon ? '恭喜通关！' : '继续加油！' }}</h3>
        <p class="final-score">得分: {{ score }}</p>
        <el-button type="primary" round @click="restartGame">再玩一次</el-button>
      </div>

      <!-- 模式选择 -->
      <div v-else-if="!gameStarted" class="mode-select">
        <h2 class="title">凑十破十</h2>
        <p class="subtitle">小学数学练习</p>
        <div class="mode-options">
          <div class="mode-option" :class="{ active: modes.makeTen }" @click="modes.makeTen = !modes.makeTen">
            <div class="mode-icon">🔟</div>
            <div>凑十法</div>
            <small>如 6+7 → 6+4+3</small>
          </div>
          <div class="mode-option" :class="{ active: modes.breakTen }" @click="modes.breakTen = !modes.breakTen">
            <div class="mode-icon">➖</div>
            <div>破十法</div>
            <small>如 13-6 → 3+(10-6)</small>
          </div>
        </div>
        <el-button type="primary" round size="large" @click="startGame" :disabled="!modes.makeTen && !modes.breakTen">
          开始游戏
        </el-button>
      </div>

      <!-- 游戏区 -->
      <div v-else class="game-area">
        <!-- 顶部状态 -->
        <div class="top-bar">
          <div class="score-info">⭐ {{ score }}/{{ targetScore }}</div>
          <div class="timer-info">⏱️ {{ Math.max(0, timer) }}s</div>
          <div class="combo-info" v-if="combo >= 2">🔥 {{ combo }}连击</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>

        <!-- 题目区域 -->
        <div class="question-wrap">
          <!-- 原题 -->
          <div class="question-box" :class="{ shrink: showSteps }">
            <template v-if="currentQuestion.type === 'makeTen'">
              {{ currentQuestion.num1 }} + {{ currentQuestion.num2 }} = ?
            </template>
            <template v-else>
              {{ currentQuestion.teenNum }} - {{ currentQuestion.subtractor }} = ?
            </template>
          </div>

          <!-- 分支图步骤区域 -->
          <div class="step-area" v-if="showSteps">
            <div class="step-badge">第 {{ step + 1 }} 步</div>

            <!-- 凑十法二叉树 -->
            <div v-if="currentQuestion.type === 'makeTen' && step < getMaxStep()" class="tree-diagram">
              <!-- 根节点：原题 -->
              <div class="tree-root">
                <span>{{ currentQuestion.num1 }} + {{ currentQuestion.num2 }} = ?</span>
              </div>

              <!-- step 0: 第一层分支 -->
              <div class="tree-branch" v-if="step === 0">
                <div class="branch-left">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node" :class="{ active: true, shake: showWrong }">
                    <span class="node-label">{{ currentQuestion.num1 }} + <b>?</b> = 10</span>
                  </div>
                </div>
                <div class="branch-right">
                  <div class="branch-symbol">╲</div>
                  <div class="branch-node pending">
                    <span class="node-label">{{ currentQuestion.num2 }} - ? = ?</span>
                  </div>
                </div>
              </div>

              <!-- step 1: 第一层分支（显示答案）+ 第二层 -->
              <div class="tree-branch" v-if="step >= 1 && step < 2">
                <div class="branch-left">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node done">
                    <span class="node-label">{{ currentQuestion.num1 }} + <b>{{ currentQuestion.splitNum }}</b> = 10</span>
                    <span class="node-answer">{{ currentQuestion.splitNum }}</span>
                  </div>
                </div>
                <div class="branch-right">
                  <div class="branch-symbol">╲</div>
                  <div class="branch-node" :class="{ active: step === 1, shake: step === 1 && showWrong }">
                    <span class="node-label">{{ currentQuestion.num2 }} - {{ currentQuestion.splitNum }} = <b>?</b></span>
                  </div>
                </div>
              </div>

              <!-- step 2: 第二层分支（第一层全为 done） -->
              <div class="tree-branch" v-if="step >= 2">
                <div class="branch-left">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node done">
                    <span class="node-label">{{ currentQuestion.num1 }} + <b>{{ currentQuestion.splitNum }}</b> = 10</span>
                    <span class="node-answer">{{ currentQuestion.splitNum }}</span>
                  </div>
                </div>
                <div class="branch-right">
                  <div class="branch-symbol">╲</div>
                  <div class="branch-node done">
                    <span class="node-label">{{ currentQuestion.num2 }} - {{ currentQuestion.splitNum }} = <b>{{ currentQuestion.remainNum }}</b></span>
                    <span class="node-answer">{{ currentQuestion.remainNum }}</span>
                  </div>
                </div>
              </div>

              <!-- step 2: 居中分支（回答中） -->
              <div class="tree-branch" v-if="step === 2">
                <div class="branch-center">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node" :class="{ active: step === 2, shake: step === 2 && showWrong }">
                    <span class="node-label">10 + {{ currentQuestion.remainNum }} = <b>?</b></span>
                  </div>
                </div>
              </div>

              <!-- step 2完成后：显示绿色然后隐藏 -->
              <div class="tree-branch" v-if="step >= 3" style="animation: none;">
                <div class="branch-center">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node done">
                    <span class="node-label">10 + {{ currentQuestion.remainNum }} = <b>{{ currentQuestion.answer }}</b></span>
                    <span class="node-answer">{{ currentQuestion.answer }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 破十法二叉树 -->
            <div v-else-if="currentQuestion.type === 'breakTen' && step < getMaxStep()" class="tree-diagram">
              <!-- 根节点：原题 -->
              <div class="tree-root">
                <span>{{ currentQuestion.teenNum }} - {{ currentQuestion.subtractor }} = ?</span>
              </div>

              <!-- step 0: 第一层分支 -->
              <div class="tree-branch" v-if="step === 0">
                <div class="branch-left">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node" :class="{ active: true, shake: showWrong }">
                    <span class="node-label">{{ currentQuestion.teenNum }} = 10 + <b>?</b></span>
                  </div>
                </div>
                <div class="branch-right">
                  <div class="branch-symbol">╲</div>
                  <div class="branch-node pending">
                    <span class="node-label">10 - {{ currentQuestion.subtractor }} = ?</span>
                  </div>
                </div>
              </div>

              <!-- step 1: 第一层 + 第二层 -->
              <div class="tree-branch" v-if="step >= 1 && step < 2">
                <div class="branch-left">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node done">
                    <span class="node-label">{{ currentQuestion.teenNum }} = 10 + <b>{{ currentQuestion.ones }}</b></span>
                    <span class="node-answer">{{ currentQuestion.ones }}</span>
                  </div>
                </div>
                <div class="branch-right">
                  <div class="branch-symbol">╲</div>
                  <div class="branch-node" :class="{ active: step === 1, shake: step === 1 && showWrong }">
                    <span class="node-label">10 - {{ currentQuestion.subtractor }} = <b>?</b></span>
                  </div>
                </div>
              </div>

              <!-- step 2: 第一层全为 done -->
              <div class="tree-branch" v-if="step >= 2">
                <div class="branch-left">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node done">
                    <span class="node-label">{{ currentQuestion.teenNum }} = 10 + <b>{{ currentQuestion.ones }}</b></span>
                    <span class="node-answer">{{ currentQuestion.ones }}</span>
                  </div>
                </div>
                <div class="branch-right">
                  <div class="branch-symbol">╲</div>
                  <div class="branch-node done">
                    <span class="node-label">10 - {{ currentQuestion.subtractor }} = <b>{{ currentQuestion.tenMinus }}</b></span>
                    <span class="node-answer">{{ currentQuestion.tenMinus }}</span>
                  </div>
                </div>
              </div>

              <!-- step 2: 居中分支（回答中） -->
              <div class="tree-branch" v-if="step === 2">
                <div class="branch-center">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node" :class="{ active: step === 2, shake: step === 2 && showWrong }">
                    <span class="node-label">{{ currentQuestion.ones }} + {{ currentQuestion.tenMinus }} = <b>?</b></span>
                  </div>
                </div>
              </div>

              <!-- step 2完成后：显示绿色 -->
              <div class="tree-branch" v-if="step >= getMaxStep() + 1" style="animation: none;">
                <div class="branch-center">
                  <div class="branch-symbol">╱</div>
                  <div class="branch-node done">
                    <span class="node-label">{{ currentQuestion.ones }} + {{ currentQuestion.tenMinus }} = <b>{{ currentQuestion.answer }}</b></span>
                    <span class="node-answer">{{ currentQuestion.answer }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部提示区域 -->
            <div v-if="step < getMaxStep()" class="breakdown-display">
              <span class="breakdown-label">当前步骤：</span>
              <template v-if="currentQuestion.type === 'makeTen'">
                <div class="breakdown-hint">
                  <template v-if="step === 0">
                    <span>先把 <b>{{ currentQuestion.num1 }}</b> 凑成 10</span>
                  </template>
                  <template v-else-if="step === 1">
                    <span>计算 <b>{{ currentQuestion.num2 }} - {{ currentQuestion.splitNum }}</b></span>
                  </template>
                  <template v-else-if="step === 2">
                    <span>计算 <b>10 + {{ currentQuestion.remainNum }}</b></span>
                  </template>
                  <template v-else>
                    <span>最终答案：<b>{{ currentQuestion.num1 }} + {{ currentQuestion.num2 }}</b></span>
                  </template>
                </div>
              </template>
              <template v-else>
                <div class="breakdown-hint">
                  <template v-if="step === 0">
                    <span>把 <b>{{ currentQuestion.teenNum }}</b> 拆成 10 + ?</span>
                  </template>
                  <template v-else-if="step === 1">
                    <span>计算 <b>10 - {{ currentQuestion.subtractor }}</b></span>
                  </template>
                  <template v-else-if="step === 2">
                    <span>计算 <b>{{ currentQuestion.ones }} + {{ currentQuestion.tenMinus }}</b></span>
                  </template>
                </div>
              </template>
            </div>

            <!-- 完成后显示完整等式 -->
            <div v-if="isStepComplete" class="complete-display">
              <div class="complete-formula">
                <template v-if="currentQuestion.type === 'makeTen'">
                  {{ currentQuestion.num1 }} + {{ currentQuestion.splitNum }} + {{ currentQuestion.remainNum }} = <b>{{ currentQuestion.answer }}</b>
                </template>
                <template v-else>
                  {{ currentQuestion.teenNum }} - {{ currentQuestion.subtractor }} = 10 + {{ currentQuestion.ones }} - {{ currentQuestion.subtractor }} = <b>{{ currentQuestion.answer }}</b>
                </template>
              </div>
              <div class="complete-hint">
                <span>✅ 回答正确！</span>
                <button class="next-btn" @click="goNextQuestion">下一题</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 答案显示 -->
        <div v-if="!isStepComplete" class="answer-display" :class="{ hasValue: inputValue, wrong: showWrong }">
          <span class="answer-text">{{ inputValue || '?' }}</span>
        </div>

        <!-- 数字键盘 -->
        <div v-if="!isStepComplete" class="keypad">
          <button v-for="n in [7,8,9,4,5,6,1,2,3]" :key="n" @click="inputDigit(n)">{{ n }}</button>
          <button class="key-clear" @click="clearInput">C</button>
          <button @click="inputDigit(0)">0</button>
          <button class="key-del" @click="deleteDigit">⌫</button>
        </div>

        <div v-if="!isStepComplete" class="skip-btn">
          <el-button text type="info" @click="skipQuestion">跳过此题</el-button>
        </div>

        <!-- 答对庆祝动画 -->
        <div v-if="showCelebrate" class="celebrate-popup">
          <span class="celebrate-star" v-for="i in 8" :key="i" :style="getStarStyle(i)">⭐</span>
          <div class="celebrate-msg">
            <span class="msg-icon">✅</span>
            <span class="msg-text">{{ celebrateMsg }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const gameStarted = ref(false)
const gameOver = ref(false)
const gameWon = ref(false)
const modes = ref({ makeTen: true, breakTen: true })
const targetScore = 50 // 通关分数
const score = ref(10)
const combo = ref(0)
const step = ref(0)
const inputValue = ref('')
const showWrong = ref(false)
const showSteps = ref(false)
const showCelebrate = ref(false)
const showComplete = ref(false)
const celebrateMsg = ref('')
const timer = ref(15)
let timerInterval = null

const timerPercent = computed(() => (Math.max(0, timer.value) / 15) * 100)

// 当前步骤是否已完成（用于控制输入框显示）
const isStepComplete = computed(() => {
  // 在completeQuestion中step会+1，所以完成时step = getMaxStep() + 1
  return step.value >= getMaxStep() + 1
})
const progressPercent = computed(() => (score.value / targetScore) * 100)

const currentQuestion = ref({ type: 'makeTen', num1: 6, num2: 7, splitNum: 4, remainNum: 3, answer: 13, teenNum: 13, subtractor: 6, ones: 3, tenMinus: 4 })

const generateQuestion = () => {
  if (Math.random() < 0.5 && modes.value.makeTen || !modes.value.breakTen) {
    const num1 = Math.floor(Math.random() * 9) + 1
    const minNum2 = Math.max(1, 11 - num1)
    const num2 = Math.floor(Math.random() * (9 - minNum2 + 1)) + minNum2
    return { type: 'makeTen', num1, num2, splitNum: 10 - num1, remainNum: num2 - (10 - num1), answer: num1 + num2 }
  } else {
    const ones = Math.floor(Math.random() * 8) + 1
    const teenNum = 10 + ones
    const subtractor = Math.floor(Math.random() * (9 - ones)) + ones + 1
    return { type: 'breakTen', teenNum, subtractor, ones, tenMinus: 10 - subtractor, answer: teenNum - subtractor }
  }
}

const startTimer = () => {
  clearInterval(timerInterval)
  timer.value = 15
  timerInterval = setInterval(() => {
    if (--timer.value <= 0) { clearInterval(timerInterval); combo.value = 0 }
  }, 1000)
}

const startGame = () => {
  gameStarted.value = true
  score.value = 0; combo.value = 0; step.value = 0
  nextQuestion()
}

const nextQuestion = () => {
  currentQuestion.value = generateQuestion()
  step.value = 0
  inputValue.value = ''
  showSteps.value = false

  setTimeout(() => {
    showSteps.value = true
    startTimer()
  }, 1200)
}

const inputDigit = (d) => {
  // 步骤4最终确认时也可以输入答案
  if (!showSteps.value) return

  if (inputValue.value.length < 2) {
    inputValue.value += d
    checkAnswer()
  }
}

const deleteDigit = () => { inputValue.value = inputValue.value.slice(0, -1) }
const clearInput = () => { inputValue.value = '' }

const getExpectedAnswer = () => {
  const q = currentQuestion.value
  // 凑十法: 4步 (step 0-3)
  if (q.type === 'makeTen') {
    if (step.value === 0) return q.splitNum      // num1 + ? = 10 → 答案: splitNum
    if (step.value === 1) return q.remainNum     // num2 - splitNum = ? → 答案: remainNum
    if (step.value === 2) return q.answer        // 10 + remainNum = ? → 答案: answer
    return q.answer                               // step 3: 确认步骤，不作答
  }
  // 破十法: 3步 (step 0-2)
  if (q.type === 'breakTen') {
    if (step.value === 0) return q.ones           // teenNum = 10 + ? → 答案: ones
    if (step.value === 1) return q.tenMinus       // 10 - subtractor = ? → 答案: tenMinus
    return q.answer                               // ones + tenMinus = ? → 答案: answer
  }
  return 0
}

const getMaxStep = () => {
  // 统一为4步: 0,1,2,3
  return 3
}

const triggerCelebrate = (msg) => {
  celebrateMsg.value = msg
  showCelebrate.value = true
  setTimeout(() => { showCelebrate.value = false }, 1200)
}

const checkAnswer = () => {
  const answer = parseInt(inputValue.value)
  const expected = getExpectedAnswer()

  if (answer < expected && inputValue.value.length === 1 && expected >= 10) return

  if (answer === expected) {
    // 正确答案后延迟
    setTimeout(() => {
      if (step.value < getMaxStep()) {
        step.value++
        inputValue.value = ''
        startTimer()
        // 不显示"对了"的提示
      } else {
        completeQuestion()
      }
    }, 600)
  } else if (answer > expected || inputValue.value.length >= String(expected).length) {
    score.value = Math.max(0, score.value - 1)
    combo.value = 0
    showWrong.value = true
    setTimeout(() => {
      showWrong.value = false
      inputValue.value = ''
      if (score.value <= 0) {
        gameOver.value = true
        gameWon.value = false
      }
    }, 300)
  }
}

const completeQuestion = () => {
  // 停止计时器
  clearInterval(timerInterval)

  // 显示完成状态（触发绿色节点显示）
  step.value++

  // 加分
  score.value += 5
  combo.value++
  if (combo.value === 3) { score.value += 1 }
  else if (combo.value === 5) { score.value += 2 }
  else if (combo.value >= 10) { score.value += 3 }

  // 检查是否通关
  if (score.value >= targetScore) {
    gameOver.value = true
    gameWon.value = true
  }
  // 否则不自动跳转，等用户点击按钮
}

const goNextQuestion = () => {
  nextQuestion()
}

const skipQuestion = () => { combo.value = 0; nextQuestion() }
const restartGame = () => { gameStarted.value = false; gameOver.value = false }

const getConfettiStyle = (i) => ({
  '--x': Math.random() * 100 + '%',
  '--delay': Math.random() * 2 + 's',
  '--duration': (Math.random() * 2 + 2) + 's'
})

const getStarStyle = (i) => ({
  '--angle': (i - 1) * 45 + 'deg',
  '--delay': i * 0.05 + 's'
})

onUnmounted(() => clearInterval(timerInterval))
</script>

<style scoped>
.math-ten-view {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  padding-top: 60px;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.card-container {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(252, 182, 159, 0.3);
  position: relative;
  overflow: hidden;
}

/* 模式选择 */
.mode-select { text-align: center; }
.title { font-size: 26px; color: #e67e22; margin-bottom: 4px; }
.subtitle { color: #95a5a6; font-size: 14px; margin-bottom: 20px; }
.mode-options { display: flex; gap: 10px; margin-bottom: 20px; }
.mode-option {
  flex: 1;
  padding: 14px 10px;
  border: 2px solid #ecf0f1;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  background: #fafafa;
}
.mode-option:hover { border-color: #f5a623; background: #fffbf0; }
.mode-option.active {
  border-color: #f5a623;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%);
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.2);
}
.mode-icon { font-size: 24px; margin-bottom: 4px; }
.mode-option small { display: block; font-size: 11px; color: #95a5a6; margin-top: 4px; }

/* 游戏结束 */
.game-over { text-align: center; padding: 20px 0; position: relative; }
.celebrate-animation { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }
.confetti {
  position: absolute;
  top: -20px;
  left: var(--x);
  font-size: 24px;
  animation: fall var(--duration) var(--delay) linear infinite;
  opacity: 0.8;
}
@keyframes fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
}
.result-emoji { font-size: 64px; display: block; margin-bottom: 8px; }
.game-over h3 { font-size: 22px; color: #2c3e50; margin-bottom: 8px; }
.final-score { color: #f5a623; font-size: 20px; font-weight: 600; margin-bottom: 16px; }

/* 游戏区 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 14px;
  color: #7f8c8d;
}
.score-info { font-weight: 600; color: #f5a623; }
.timer-info { font-weight: 600; color: #3498db; }
.combo-info { color: #e74c3c; font-weight: 600; animation: pulse 0.5s infinite alternate; }
@keyframes pulse { from { transform: scale(1); } to { transform: scale(1.1); } }

.progress-bar {
  height: 6px;
  background: #ecf0f1;
  border-radius: 3px;
  margin-bottom: 14px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #27ae60, #2ecc71);
  border-radius: 3px;
  transition: width 0.3s;
}

/* 题目区域 */
.question-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 12px; }

.question-box {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%);
  border-radius: 12px;
  padding: 0 20px;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  white-space: nowrap;
  transform: scale(1);
  transform-origin: center center;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
}
.question-box.shrink {
  transform: scale(0.8);
  opacity: 0.7;
}

.step-area { text-align: center; margin-top: 8px; animation: slideUp 0.4s ease; }
@keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
.step-badge {
  display: inline-block;
  padding: 5px 16px;
  background: linear-gradient(135deg, #f5a623 0%, #f7931e 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 16px;
  margin-bottom: 10px;
}

/* 二叉树样式 */
.tree-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: linear-gradient(180deg, #f8f9fa 0%, #fff 100%);
  border-radius: 16px;
  border: 2px solid #e9ecef;
}

.tree-root {
  padding: 10px 16px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  color: #d63031;
  border: 2px solid #f39c12;
  text-align: center;
  min-width: 160px;
}

.tree-branch {
  display: flex;
  justify-content: center;
  gap: 24px;
  width: 100%;
  animation: branchSlideIn 0.4s ease;
}

@keyframes branchSlideIn {
  from { opacity: 0; transform: scale(0.8) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.branch-left,
.branch-right,
.branch-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.branch-center { max-width: 180px; }

.branch-symbol {
  font-size: 20px;
  color: #636e72;
  font-weight: bold;
  line-height: 1.2;
}

.branch-node {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  width: 100%;
  text-align: center;
  min-width: 120px;
  min-height: 40px;
  justify-content: center;
  animation: nodeFadeIn 0.4s ease;
}

@keyframes nodeFadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.branch-node.done {
  background: linear-gradient(135deg, #d5f5e3 0%, #abebc6 100%);
  color: #1e8449;
  border: 2px solid #27ae60;
  min-width: 140px;
}

.branch-node.done .node-answer {
  background: #27ae60;
  color: #fff;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
}

.branch-node.pending {
  background: linear-gradient(135deg, #f1f2f6 0%, #dfe4ea 100%);
  color: #a4b0be;
  border: 2px solid #ced6e0;
}

.branch-node.active {
  background: linear-gradient(135deg, #fff9e6 0%, #ffdd99 100%);
  color: #e67e22;
  border: 3px solid #f39c12;
  box-shadow: 0 0 20px rgba(243, 156, 18, 0.4);
  min-width: 140px;
  animation: pulseGlow 1s infinite alternate;
}

@keyframes pulseGlow {
  from { box-shadow: 0 0 15px rgba(243, 156, 18, 0.3); }
  to { box-shadow: 0 0 25px rgba(243, 156, 18, 0.6); }
}

.branch-node.active.shake { animation: shake 0.3s, pulseGlow 1s infinite alternate; }

.branch-node b {
  color: #d63031;
  border-bottom: 3px solid #e74c3c;
  padding: 0 4px;
  font-size: 1.2em;
}

.node-answer {
  font-size: 13px;
  font-weight: 700;
}

/* 底部完整拆分显示 */
.breakdown-display {
  margin-top: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #e8f4fd 0%, #d6eaf8 100%);
  border-radius: 12px;
  border: 2px solid #3498db;
  text-align: center;
  animation: slideUpFade 0.4s ease;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.breakdown-label {
  font-size: 13px;
  color: #2980b9;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.breakdown-formula {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
}

.breakdown-hint {
  padding: 10px 16px;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%);
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #e67e22;
  text-align: center;
  animation: slideUpFade 0.4s ease;
}

.breakdown-hint b {
  color: #d63031;
  font-weight: 700;
}

/* 完成显示 */
.complete-display {
  text-align: center;
  animation: slideUpFade 0.5s ease;
}

.complete-formula {
  padding: 16px 24px;
  background: linear-gradient(135deg, #d5f5e3 0%, #abebc6 100%);
  border-radius: 14px;
  border: 3px solid #27ae60;
  font-size: 24px;
  font-weight: 700;
  color: #1e8449;
  margin-bottom: 12px;
}

.complete-formula b {
  color: #e74c3c;
  font-size: 28px;
}

.complete-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #27ae60;
  animation: popIn 0.4s ease;
}

.next-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.next-btn:active {
  transform: scale(0.95);
}

@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

/* 答案显示 */
.answer-display {
  text-align: center;
  font-size: 40px;
  font-weight: 700;
  color: #bdc3c7;
  margin-bottom: 12px;
  transition: all 0.2s;
}
.answer-display.hasValue { color: #2c3e50; }
.answer-display.wrong { animation: wrongShake 0.3s ease; }
@keyframes wrongShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

/* 数字键盘 */
.keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.keypad button {
  height: 52px;
  font-size: 22px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%);
  color: #2c3e50;
  transition: all 0.15s;
}
.keypad button:hover { background: linear-gradient(135deg, #f5f6f7 0%, #d5dbdb 100%); }
.keypad button:active { transform: scale(0.95); }
.keypad .key-clear { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: #fff; }
.keypad .key-del { background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: #fff; font-size: 18px; }

.skip-btn { text-align: center; }

/* 庆祝弹窗 */
.celebrate-popup {
  position: absolute;
  top: 65%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  z-index: 10;
}
.celebrate-star {
  position: absolute;
  font-size: 24px;
  animation: starBurst 0.8s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
}
@keyframes starBurst {
  0% { opacity: 1; transform: rotate(var(--angle)) translateX(0); }
  100% { opacity: 0; transform: rotate(var(--angle)) translateX(100px); }
}
.celebrate-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: #fff;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 20px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(39, 174, 96, 0.4);
  animation: popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  white-space: nowrap;
}
.msg-icon { font-size: 24px; }
@keyframes popIn { 0% { transform: scale(0) rotate(-10deg); } 100% { transform: scale(1) rotate(0); } }

/* 响应式 - 小屏幕优化 */
@media (max-width: 400px) {
  .math-ten-view {
    padding-top: 30px;
    padding-left: 8px;
    padding-right: 8px;
    padding-bottom: 10px;
  }
  .card-container { padding-top: 30px; margin-top: 5rem; }
  .card-container { padding: 12px; border-radius: 16px; }
  .question-box { font-size: 22px; height: 44px; padding: 0 14px; }

  .tree-diagram { padding: 5px 3px; }
  .tree-root { padding: 6px 10px; font-size: 13px; min-width: 100px; }
  .tree-branch { gap: 8px; }
  .branch-symbol { font-size: 14px; }
  .branch-node { padding: 5px 7px; font-size: 11px; min-width: 80px; min-height: 32px; }
  .branch-node.done, .branch-node.active { min-width: 90px; }
  .branch-node .node-answer { font-size: 10px; padding: 1px 6px; }

  .breakdown-display { padding: 6px 8px; margin-top: 6px; }
  .breakdown-label { font-size: 11px; }
  .breakdown-hint { font-size: 12px; padding: 6px 10px; }

  .complete-formula { padding: 12px 18px; font-size: 18px; }
  .complete-formula b { font-size: 20px; }
  .complete-hint { font-size: 15px; }

  .answer-display { font-size: 36px; margin-bottom: 12px; }

  /* 更大的按键，便于点击 */
  .keypad { gap: 6px; margin-bottom: 8px; }
  .keypad button { height: 52px; font-size: 22px; border-radius: 12px; }

  .skip-btn { margin-top: 6px; }
  .top-bar { font-size: 13px; margin-bottom: 4px; }
}
</style>