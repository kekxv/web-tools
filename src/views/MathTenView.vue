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

          <!-- 步骤区域 -->
          <div class="step-area" v-if="showSteps">
            <div class="step-badge">第 {{ step + 1 }} 步</div>
            <div class="step-question" :class="{ shake: showWrong }">
              <template v-if="currentQuestion.type === 'makeTen'">
                <span v-if="step === 0">{{ currentQuestion.num1 }} + <b>?</b> = 10</span>
                <span v-else-if="step === 1">{{ currentQuestion.num2 }} - {{ currentQuestion.splitNum }} = <b>?</b></span>
                <span v-else>10 + {{ currentQuestion.remainNum }} = <b>?</b></span>
              </template>
              <template v-else>
                <span v-if="step === 0">10 - {{ currentQuestion.subtractor }} = <b>?</b></span>
                <span v-else>{{ currentQuestion.ones }} + {{ currentQuestion.tenMinus }} = <b>?</b></span>
              </template>
            </div>
          </div>
        </div>

        <!-- 答案显示 -->
        <div class="answer-display" :class="{ hasValue: inputValue, correct: showCorrect, wrong: showWrong }">
          <span class="answer-text">{{ inputValue || '?' }}</span>
          <span v-if="showCorrect" class="correct-emoji">✨</span>
        </div>

        <!-- 数字键盘 -->
        <div class="keypad">
          <button v-for="n in [7,8,9,4,5,6,1,2,3]" :key="n" @click="inputDigit(n)">{{ n }}</button>
          <button class="key-clear" @click="clearInput">C</button>
          <button @click="inputDigit(0)">0</button>
          <button class="key-del" @click="deleteDigit">⌫</button>
        </div>

        <div class="skip-btn">
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
const targetScore = 20 // 降低目标分数
const score = ref(10)
const combo = ref(0)
const step = ref(0)
const inputValue = ref('')
const showWrong = ref(false)
const showCorrect = ref(false)
const showSteps = ref(false)
const showCelebrate = ref(false)
const celebrateMsg = ref('')
const timer = ref(15)
let timerInterval = null

const timerPercent = computed(() => (Math.max(0, timer.value) / 15) * 100)
const progressPercent = computed(() => ((score.value - 10) / (targetScore - 10)) * 100)

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
  score.value = 10; combo.value = 0; step.value = 0
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
  if (showCorrect.value || !showSteps.value) return
  if (inputValue.value.length < 2) {
    inputValue.value += d
    checkAnswer()
  }
}

const deleteDigit = () => { inputValue.value = inputValue.value.slice(0, -1) }
const clearInput = () => { inputValue.value = '' }

const getExpectedAnswer = () => {
  const q = currentQuestion.value
  if (q.type === 'makeTen') {
    if (step.value === 0) return q.splitNum
    if (step.value === 1) return q.remainNum
    return q.answer
  } else {
    if (step.value === 0) return q.tenMinus
    return q.answer
  }
}

const getMaxStep = () => {
  return currentQuestion.value.type === 'makeTen' ? 2 : 1
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
    showCorrect.value = true
    setTimeout(() => {
      showCorrect.value = false
      if (step.value < getMaxStep()) {
        step.value++
        inputValue.value = ''
        startTimer()
        triggerCelebrate('对了！')
      } else {
        score.value += 2
        combo.value++
        if (combo.value === 3) { score.value += 1; triggerCelebrate('3连击！+1') }
        else if (combo.value === 5) { score.value += 2; triggerCelebrate('5连击！+2') }
        else if (combo.value >= 10) { score.value += 3; triggerCelebrate('太棒了！+3') }
        else { triggerCelebrate('正确！') }

        if (score.value >= targetScore) {
          gameOver.value = true
          gameWon.value = true
        } else {
          nextQuestion()
        }
      }
    }, 300)
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
  border-radius: 24px;
  padding: 20px;
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
.question-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 16px; }

.question-box {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%);
  border-radius: 14px;
  padding: 0 24px;
  font-size: 36px;
  font-weight: 700;
  color: #2c3e50;
  white-space: nowrap;
  transform: scale(1);
  transform-origin: center center;
  transition: transform 0.4s ease;
}
.question-box.shrink { transform: scale(0.7); }

.step-area { text-align: center; margin-top: 12px; animation: slideUp 0.4s ease; }
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
.step-question { font-size: 32px; font-weight: 600; color: #2c3e50; }
.step-question.shake { animation: shake 0.3s; }
.step-question b { color: #f5a623; border-bottom: 3px solid #f5a623; padding: 0 6px; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

/* 答案显示 */
.answer-display {
  text-align: center;
  font-size: 48px;
  font-weight: 700;
  color: #bdc3c7;
  margin-bottom: 20px;
  transition: all 0.2s;
}
.answer-display.hasValue { color: #2c3e50; }
.answer-display.correct {
  color: #27ae60;
  animation: correctBounce 0.4s ease;
}
.answer-display.wrong { animation: wrongShake 0.3s ease; }
.correct-emoji {
  display: inline-block;
  margin-left: 8px;
  animation: emojiPop 0.5s ease;
}
@keyframes correctBounce {
  0%, 100% { transform: scale(1); }
  30% { transform: scale(1.2); }
  60% { transform: scale(0.95); }
}
@keyframes wrongShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
@keyframes emojiPop {
  0% { transform: scale(0) rotate(-30deg); opacity: 0; }
  50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

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

/* 响应式 */
@media (max-width: 400px) {
  .math-ten-view { padding-top: 50px; padding: 12px; padding-top: 50px; }
  .card-container { padding: 16px; }
  .question-box { font-size: 32px; height: 64px; padding: 0 20px; }
  .step-question { font-size: 28px; }
  .answer-display { font-size: 42px; margin-bottom: 16px; }
  .keypad button { height: 46px; font-size: 20px; }
  .keypad { gap: 6px; }
}
</style>