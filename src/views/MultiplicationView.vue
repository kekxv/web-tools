<template>
  <div class="multiplication-view page-container">
    <div class="card-container">
      <!-- 游戏结束 -->
      <div v-if="gameOver" class="game-over">
        <div class="celebrate-animation" v-if="gameWon">
          <span v-for="i in 30" :key="i" class="confetti" :style="getConfettiStyle(i)">{{ getConfettiEmoji(i) }}</span>
          <div class="fireworks-container">
            <span v-for="j in 5" :key="j" class="firework" :style="getFireworkStyle(j)">🎆</span>
          </div>
        </div>
        <span class="result-emoji" :class="{ 'trophy-shine': gameWon }">{{ gameWon ? '🏆' : '💪' }}</span>
        <h3>{{ gameWon ? '🎉 恭喜通关！🎉' : '继续加油！' }}</h3>
        <p class="final-score">得分：{{ score }} / {{ targetScore }}</p>
        <el-button type="primary" round @click="restartGame">再玩一次</el-button>
      </div>

      <!-- 模式选择 -->
      <div v-else-if="!gameStarted" class="mode-select">
        <h2 class="title">小小乘法表</h2>
        <p class="subtitle">1-9 乘法口诀练习</p>
        <div class="mode-options">
          <div class="mode-option" :class="{ active: mode === 'challenge' }" @click="mode = 'challenge'">
            <div class="mode-icon">⏱️</div>
            <div>挑战模式</div>
            <small>6 秒倒计时，35 分通关</small>
          </div>
          <div class="mode-option" :class="{ active: mode === 'practice' }" @click="mode = 'practice'">
            <div class="mode-icon">📚</div>
            <div>练习模式</div>
            <small>不限时间，慢慢算</small>
          </div>
        </div>
        <el-button type="primary" round size="large" @click="startGame">
          开始游戏
        </el-button>
      </div>

      <!-- 游戏区 -->
      <div v-else class="game-area">
        <!-- 顶部状态 -->
        <div class="top-bar">
          <div class="score-info">⭐ {{ score }}/{{ targetScore }}</div>
          <div class="timer-info" v-if="mode === 'challenge'">⏱️ {{ Math.max(0, timer) }}s</div>
          <div class="combo-info" v-if="combo >= 2">🔥 {{ combo }}连击</div>
        </div>
        <div class="progress-bar" v-if="mode === 'challenge'">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>

        <!-- 题目区域 -->
        <div class="question-box" :class="{ shake: showWrong, flash: showFlash, warning: mode === 'challenge' && timer <= 2 && timer > 0 }">
          {{ currentQuestion.num1 }} × {{ currentQuestion.num2 }} = ?
        </div>

        <!-- 答案显示 -->
        <div class="answer-display" :class="{ hasValue: inputValue.length > 0, wrong: showWrong }">
          <span class="answer-text">{{ inputValue || '?' }}</span>
        </div>

        <!-- 数字键盘 -->
        <div class="keypad">
          <button v-for="n in [7,8,9,4,5,6,1,2,3]" :key="n" @click="inputDigit(n)">{{ n }}</button>
          <button class="key-clear" @click="clearInput">C</button>
          <button @click="inputDigit(0)">0</button>
          <button class="key-del" @click="deleteDigit">⌫</button>
        </div>

        <div class="skip-btn" v-if="mode === 'challenge'">
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

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const gameStarted = ref(false)
const gameOver = ref(false)
const gameWon = ref(false)
const mode = ref('challenge') // 'challenge' or 'practice'
const targetScore = 35
const score = ref(0)
const combo = ref(0)
const inputValue = ref('')
const showWrong = ref(false)
const showFlash = ref(false)
const showCelebrate = ref(false)
const celebrateMsg = ref('')
const timer = ref(6)
let timerInterval = null

const progressPercent = computed(() => (score.value / targetScore) * 100)

const currentQuestion = ref({ num1: 4, num2: 5, answer: 20 })

// 生成所有 1-9 乘法题目（包括交换律）
const allQuestions = []
for (let i = 1; i <= 9; i++) {
  for (let j = 1; j <= 9; j++) {
    allQuestions.push({ num1: i, num2: j, answer: i * j })
  }
}

const generateQuestion = () => {
  const index = Math.floor(Math.random() * allQuestions.length)
  return { ...allQuestions[index] }
}

const startTimer = () => {
  if (mode.value !== 'challenge') return
  clearInterval(timerInterval)
  timer.value = 6
  timerInterval = setInterval(() => {
    timer.value--
    if (timer.value <= 0) {
      clearInterval(timerInterval)
      handleTimeout()
    }
  }, 1000)
}

const handleTimeout = () => {
  score.value = Math.max(0, score.value - 1)
  combo.value = 0
  showFlash.value = true
  setTimeout(() => {
    showFlash.value = false
    nextQuestion()
  }, 500)
}

const startGame = () => {
  gameStarted.value = true
  score.value = 0
  combo.value = 0
  nextQuestion()
}

const nextQuestion = () => {
  currentQuestion.value = generateQuestion()
  inputValue.value = ''
  showWrong.value = false
  startTimer()
}

const inputDigit = (d) => {
  if (inputValue.value.length < 2) {
    inputValue.value += d
    checkAnswer()
  }
}

const deleteDigit = () => {
  inputValue.value = inputValue.value.slice(0, -1)
}

const clearInput = () => {
  inputValue.value = ''
}

const triggerCelebrate = (msg) => {
  celebrateMsg.value = msg
  showCelebrate.value = true
  setTimeout(() => {
    showCelebrate.value = false
  }, 1000)
}

const checkAnswer = () => {
  const answer = parseInt(inputValue.value)
  if (answer < currentQuestion.value.answer && inputValue.value.length === 1 && currentQuestion.value.answer >= 10) {
    return // 答案可能是两位数，继续输入
  }

  if (answer === currentQuestion.value.answer) {
    // 答对了
    handleCorrect()
  } else if (answer > currentQuestion.value.answer || inputValue.value.length >= String(currentQuestion.value.answer).length) {
    // 答错了
    handleWrong()
  }
}

const handleCorrect = () => {
  clearInterval(timerInterval)

  let points = 0
  if (mode.value === 'challenge') {
    const timeUsed = 6 - timer.value
    if (timeUsed <= 2) points = 2
    else if (timeUsed <= 4) points = 1
    else if (timeUsed <= 6) points = 0
  } else {
    points = 1
  }

  score.value += points
  combo.value++

  // 连击奖励
  if (combo.value === 3) {
    score.value += 1
    triggerCelebrate('3 连击！+1')
  } else if (combo.value === 5) {
    score.value += 2
    triggerCelebrate('5 连击！+2')
  } else if (combo.value >= 10) {
    score.value += 3
    triggerCelebrate('10 连击！+3')
  } else {
    const msgs = ['太棒了！', '继续加油！', '真厉害！', '好快！', '满分！']
    triggerCelebrate(msgs[Math.floor(Math.random() * msgs.length)])
  }

  // 检查是否通关
  if (score.value >= targetScore) {
    gameOver.value = true
    gameWon.value = true
  } else {
    setTimeout(() => {
      nextQuestion()
    }, 800)
  }
}

const handleWrong = () => {
  score.value = Math.max(0, score.value - 1)
  combo.value = 0
  showWrong.value = true

  setTimeout(() => {
    showWrong.value = false
    inputValue.value = ''
    if (mode.value === 'challenge' && score.value <= 0) {
      gameOver.value = true
      gameWon.value = false
    } else {
      nextQuestion()
    }
  }, 500)
}

const skipQuestion = () => {
  combo.value = 0
  nextQuestion()
}

const restartGame = () => {
  gameStarted.value = false
  gameOver.value = false
  score.value = 0
  combo.value = 0
}

const getConfettiStyle = (i) => ({
  '--x': Math.random() * 100 + '%',
  '--delay': Math.random() * 0.5 + 's',
  '--duration': (Math.random() * 1.5 + 1.5) + 's',
  '--emoji': ['🎉', '⭐', '🌟', '✨', '🎊'][Math.floor(Math.random() * 5)]
})

const getConfettiEmoji = (i) => {
  const emojis = ['🎉', '⭐', '🌟', '✨', '🎊', '🏆', '🎈', '🌈']
  return emojis[Math.floor(Math.random() * emojis.length)]
}

const getFireworkStyle = (j) => ({
  '--fw-angle': (j - 1) * 72 + 'deg',
  '--fw-delay': j * 0.15 + 's'
})

const getStarStyle = (i) => ({
  '--angle': (i - 1) * 45 + 'deg',
  '--delay': i * 0.05 + 's'
})

onUnmounted(() => clearInterval(timerInterval))
</script>

<style scoped>
.multiplication-view {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  padding-top: 60px;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.card-container {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(168, 237, 234, 0.4);
  position: relative;
  overflow: hidden;
}

/* 模式选择 */
.mode-select {
  text-align: center;
  padding: 20px 0;
}

.title {
  font-size: 28px;
  color: #e91e63;
  margin-bottom: 4px;
  font-weight: 700;
}

.subtitle {
  color: #95a5a6;
  font-size: 14px;
  margin-bottom: 24px;
}

.mode-options {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.mode-option {
  flex: 1;
  padding: 16px 12px;
  border: 2px solid #ecf0f1;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  background: #fafafa;
}

.mode-option:hover {
  border-color: #e91e63;
  background: #fff0f5;
}

.mode-option.active {
  border-color: #e91e63;
  background: linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%);
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.25);
}

.mode-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.mode-option small {
  display: block;
  font-size: 11px;
  color: #95a5a6;
  margin-top: 6px;
}

/* 游戏结束 */
.game-over {
  text-align: center;
  padding: 30px 0;
  position: relative;
}

.celebrate-animation {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  top: -30px;
  left: var(--x);
  font-size: 28px;
  animation: fall var(--duration) var(--delay) linear infinite, sway 2s ease-in-out infinite;
  opacity: 0.9;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

@keyframes fall {
  0% {
    transform: translateY(0) rotate(0deg) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translateY(500px) rotate(720deg) scale(1.2);
    opacity: 0;
  }
}

@keyframes sway {
  0%, 100% {
    margin-left: 0;
  }
  50% {
    margin-left: 30px;
  }
}

.fireworks-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  pointer-events: none;
}

.firework {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 48px;
  animation: fireworkExplode 1.5s ease-out var(--fw-delay) infinite;
  transform-origin: center;
}

@keyframes fireworkExplode {
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

.result-emoji {
  font-size: 80px;
  display: block;
  margin-bottom: 12px;
}

.result-emoji.trophy-shine {
  animation: trophyShine 1.5s ease-in-out infinite;
}

@keyframes trophyShine {
  0%, 100% {
    transform: scale(1) rotate(0deg);
    filter: drop-shadow(0 0 10px #ffd700);
  }
  50% {
    transform: scale(1.1) rotate(-5deg);
    filter: drop-shadow(0 0 30px #ffd700) brightness(1.3);
  }
}

.game-over h3 {
  font-size: 26px;
  color: #2c3e50;
  margin-bottom: 10px;
  animation: bounce 0.6s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.final-score {
  color: #e91e63;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #e91e63 0%, #ff4081 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 游戏区 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 15px;
  color: #555;
}

.score-info {
  font-weight: 600;
  color: #f5a623;
}

.timer-info {
  font-weight: 600;
  color: #3498db;
}

.combo-info {
  color: #e74c3c;
  font-weight: 600;
  animation: pulse 0.5s infinite alternate;
}

@keyframes pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.1);
  }
}

.progress-bar {
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e91e63, #ff4081);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* 题目显示 */
.question-box {
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%);
  border-radius: 16px;
  padding: 0 24px;
  font-size: 36px;
  font-weight: 700;
  color: #2c3e50;
  white-space: nowrap;
  border: 3px solid #f8bbd0;
  transition: all 0.3s;
}

.question-box.shake {
  animation: shake 0.4s ease;
}

.question-box.flash {
  animation: flash 0.4s ease;
}

.question-box.warning {
  animation: warningPulse 0.5s infinite;
}

@keyframes warningPulse {
  0%, 100% {
    background: linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%);
    border-color: #f8bbd0;
    transform: scale(1);
  }
  50% {
    background: linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%);
    border-color: #e53935;
    transform: scale(1.02);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  50% {
    transform: translateX(10px);
  }
  75% {
    transform: translateX(-10px);
  }
}

@keyframes flash {
  0%, 100% {
    background: linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%);
  }
  50% {
    background: linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%);
  }
}

/* 答案显示 */
.answer-display {
  text-align: center;
  font-size: 48px;
  font-weight: 700;
  color: #bdc3c7;
  margin: 16px 0;
  min-height: 60px;
  transition: all 0.2s;
}

.answer-display.hasValue {
  color: #2c3e50;
}

.answer-display.wrong {
  animation: wrongShake 0.4s ease;
}

@keyframes wrongShake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-12px);
  }
  50% {
    transform: translateX(12px);
  }
  75% {
    transform: translateX(-8px);
  }
}

/* 数字键盘 */
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.keypad button {
  height: 56px;
  font-size: 24px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  color: #2c3e50;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.keypad button:hover {
  background: linear-gradient(135deg, #fff 0%, #f0f2f5 100%);
  transform: translateY(-2px);
}

.keypad button:active {
  transform: scale(0.95) translateY(0);
}

.keypad .key-clear {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.keypad .key-clear:hover {
  background: linear-gradient(135deg, #ff5252 0%, #e04545 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
}

.keypad .key-del {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: #fff;
  font-size: 20px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.keypad .key-del:hover {
  background: linear-gradient(135deg, #5dade2 0%, #0870c7 100%);
  box-shadow: 0 4px 12px rgba(116, 185, 255, 0.4);
}

.skip-btn {
  text-align: center;
  margin-top: 8px;
}

/* 庆祝弹窗 */
.celebrate-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  z-index: 10;
}

.celebrate-star {
  position: absolute;
  font-size: 28px;
  animation: starBurst 0.8s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes starBurst {
  0% {
    opacity: 1;
    transform: rotate(var(--angle)) translateX(0);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle)) translateX(120px);
  }
}

.celebrate-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  color: #fff;
  padding: 14px 28px;
  border-radius: 30px;
  font-size: 20px;
  font-weight: 600;
  box-shadow: 0 6px 24px rgba(76, 175, 80, 0.4);
  animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  white-space: nowrap;
}

.msg-icon {
  font-size: 28px;
}

@keyframes popIn {
  0% {
    transform: scale(0) rotate(-10deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

/* 响应式 - 小屏幕优化 */
@media (max-width: 400px) {
  .multiplication-view {
    padding-top: 30px;
    padding-left: 8px;
    padding-right: 8px;
    padding-bottom: 10px;
  }

  .card-container {
    padding: 12px;
    border-radius: 16px;
    margin-top: 2rem;
  }

  .title {
    font-size: 24px;
  }

  .mode-option {
    padding: 12px 8px;
  }

  .mode-icon {
    font-size: 24px;
  }

  .question-box {
    font-size: 28px;
    height: 56px;
    padding: 0 16px;
  }

  .answer-display {
    font-size: 40px;
    margin: 12px 0;
  }

  .keypad {
    gap: 8px;
    margin-bottom: 12px;
  }

  .keypad button {
    height: 52px;
    font-size: 22px;
    border-radius: 12px;
  }
}
</style>
