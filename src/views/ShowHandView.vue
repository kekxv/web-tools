<template>
  <div class="showhand-view" ref="gameContainer">
    <div class="game-wrapper">
      <!-- 顶部精美导航栏 -->
      <header class="app-header">
        <div class="header-content">
          <div class="header-left">
            <button @click="showMenu = true" class="icon-action-btn" title="呼出菜单">
              <el-icon><Menu /></el-icon>
            </button>
            <div class="brand">
              <h2 class="title">梭哈对决</h2>
              <span class="subtitle">Show Hand Classic</span>
            </div>
          </div>
          
          <div class="header-center">
            <div class="scoreboard">
              <div class="score-item win">
                <span class="dot"></span>
                <span class="label">胜局</span>
                <span class="val">{{ playerWins }}</span>
              </div>
              <div class="score-divider"></div>
              <div class="score-item loss">
                <span class="dot"></span>
                <span class="label">负局</span>
                <span class="val">{{ aiWins }}</span>
              </div>
            </div>
          </div>

          <div class="header-right">
            <div class="round-counter">
              <span class="label">第</span>
              <span class="count">{{ roundCount + 1 }}</span>
              <span class="label">局</span>
            </div>
            <button @click="resetGame" class="icon-action-btn danger" title="重新设置游戏">
              <el-icon><RefreshRight /></el-icon>
            </button>
          </div>
        </div>
      </header>

      <!-- 侧边菜单抽屉 -->
      <el-drawer
        v-model="showMenu"
        title="游戏菜单"
        direction="ltr"
        size="280px"
        custom-class="game-drawer"
      >
        <div class="menu-list">
          <div class="menu-section">
            <div class="menu-item" @click="goHome">
              <el-icon><HomeFilled /></el-icon>
              <span>返回首页</span>
            </div>
            <div class="menu-item" @click="resetGame(); showMenu = false">
              <el-icon><Refresh /></el-icon>
              <span>重新设置</span>
            </div>
          </div>
          
          <div class="menu-section">
            <div class="section-title">游戏规则</div>
            <div class="rules-text">
              <p>1. 初始发两张牌，一张暗牌，一张明牌。</p>
              <p>2. 每轮发放一张明牌，共计五张。</p>
              <p>3. 牌面最大者优先下注。</p>
              <p>4. 牌型：同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 高牌。</p>
            </div>
          </div>
        </div>
      </el-drawer>

      <!-- 牌局核心区域 -->
      <div class="poker-table-container">
        <div class="poker-table">
          <!-- 美化后的初始界面 -->
          <div v-if="gameState === 'not_started'" class="setup-overlay">
            <div class="setup-hero-card">
              <div class="card-glow"></div>
              <div class="setup-content">
                <div class="icon-stack">
                  <div class="floating-card c1">♠</div>
                  <div class="floating-card c2">♥</div>
                  <el-icon class="center-coin"><Coin /></el-icon>
                </div>
                <h3>开启经典对决</h3>
                <p class="description">凭智慧博弈，凭胆识夺魁。设置您的初始筹码，挑战顶级 AI 牌手。</p>
                
                <div class="chip-input-group">
                  <span class="input-label">初始携带筹码</span>
                  <el-input-number 
                    v-model="initialChips" 
                    :min="100" 
                    :max="10000" 
                    :step="500" 
                    size="large" 
                    controls-position="right"
                    class="poker-input"
                  />
                </div>

                <div class="setup-footer">
                  <el-button type="primary" size="large" @click="startGame" class="big-start-btn">
                    开始发牌
                    <el-icon class="el-icon--right"><CaretRight /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 游戏桌布 -->
          <div class="table-felt">
            <!-- AI 区域 -->
            <div v-if="gameState !== 'not_started'" class="ai-side">
              <div class="player-profile ai">
                <div class="avatar-box ai">
                  <el-icon><Monitor /></el-icon>
                </div>
                <div class="player-info-card">
                  <span class="role">AI 对手</span>
                  <div class="chips-val">
                    <el-icon><Money /></el-icon>
                    <span>{{ aiChips }}</span>
                  </div>
                </div>
                <Transition name="fade">
                  <div v-if="aiMessage" class="bubble ai">{{ aiMessage }}</div>
                </Transition>
              </div>

              <div class="cards-area ai-cards">
                <TransitionGroup name="deal">
                  <!-- AI 底牌 -->
                  <div v-if="aiHiddenCard" key="ai-hidden" class="card-slot">
                    <div class="card card-back" :class="{ 'is-flipped': showCardsRevealed }">
                      <div class="card-front" :class="getCardClass(aiHiddenCard)">
                        <div class="card-num top-left">
                          <span>{{ aiHiddenCard.display }}</span>
                          <span class="suit-mini">{{ aiHiddenCard.suit }}</span>
                        </div>
                        <div class="card-center">{{ aiHiddenCard.suit }}</div>
                      </div>
                      <div class="card-pattern"></div>
                    </div>
                  </div>
                  <!-- AI 明牌 -->
                  <div v-for="(card, index) in aiVisibleCards" :key="'ai-' + index" class="card-slot">
                    <div class="card" :class="getCardClass(card)">
                      <div class="card-num top-left">
                        <span>{{ card.display }}</span>
                        <span class="suit-mini">{{ card.suit }}</span>
                      </div>
                      <div class="card-center">{{ card.suit }}</div>
                    </div>
                  </div>
                </TransitionGroup>
              </div>
            </div>

            <!-- 中心区域 -->
            <div v-if="gameState !== 'not_started'" class="center-stage">
              <div class="pot-box">
                <span class="pot-tag">POT</span>
                <div class="pot-num"><el-icon><Coin /></el-icon> {{ pot }}</div>
              </div>
              <div class="round-text">ROUND {{ currentRound }}</div>
              <div class="game-msg-container">
                <Transition name="fade">
                  <div v-if="message" class="game-msg" :class="messageType">{{ message }}</div>
                </Transition>
              </div>
            </div>

            <!-- 玩家区域 -->
            <div v-if="gameState !== 'not_started'" class="player-side">
              <div class="cards-area player-cards">
                <TransitionGroup name="deal">
                  <div v-if="playerHiddenCard" key="player-hidden" class="card-slot">
                    <div class="card player-card bottom-card" :class="getCardClass(playerHiddenCard)">
                      <div class="card-num top-left">
                        <span>{{ playerHiddenCard.display }}</span>
                        <span class="suit-mini">{{ playerHiddenCard.suit }}</span>
                      </div>
                      <div class="card-center">{{ playerHiddenCard.suit }}</div>
                      <div class="hole-tag">底牌</div>
                    </div>
                  </div>
                  <div v-for="(card, index) in playerVisibleCards" :key="'player-' + index" class="card-slot">
                    <div class="card" :class="getCardClass(card)">
                      <div class="card-num top-left">
                        <span>{{ card.display }}</span>
                        <span class="suit-mini">{{ card.suit }}</span>
                      </div>
                      <div class="card-center">{{ card.suit }}</div>
                    </div>
                  </div>
                </TransitionGroup>
              </div>

              <div class="player-profile user">
                <div class="player-info-card">
                  <div class="info-main">
                    <div class="role-group">
                      <span class="role">我的筹码</span>
                      <div v-if="currentBet > 0" class="bet-tag">本轮: {{ currentBet }}</div>
                    </div>
                    <div class="chips-val"><el-icon><Money /></el-icon> <span>{{ playerChips }}</span></div>
                  </div>
                </div>
                <div class="avatar-box user"><el-icon><User /></el-icon></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div v-if="gameState !== 'not_started'" class="bottom-controls">
        <div v-if="gameState === 'player_turn'" class="btn-grid">
          <button @click="fold" class="game-btn gray">弃牌</button>
          <button v-if="canCheck" @click="check" class="game-btn blue">过牌</button>
          <button v-if="canCall" @click="call" class="game-btn green">跟注({{ callAmount }})</button>
          <button v-if="playerChips > 0" @click="openRaiseDialog" class="game-btn orange">加注</button>
          <button v-if="playerChips > 0 && canAllIn" @click="allIn" class="game-btn red pulse">梭哈</button>
        </div>

        <div v-if="gameState === 'ai_turn'" class="thinking-state">
          <div class="dots-loader"><span></span><span></span><span></span></div>
          AI 思考中...
        </div>

        <div v-if="gameState === 'round_over'" class="end-actions">
          <el-button type="primary" @click="newGame" size="large" round class="main-action">下一局</el-button>
          <el-button @click="resetGame" size="large" round>重新设置</el-button>
        </div>

        <div v-if="gameState === 'game_over'" class="end-actions">
          <el-button type="primary" @click="playAgain" size="large" round class="main-action">再来一次</el-button>
          <el-button @click="resetGame" size="large" round>返回</el-button>
        </div>
      </div>
    </div>

    <!-- 加注弹窗 - 修复样式丢失 -->
    <el-dialog 
      v-model="showRaiseInput" 
      title="筹码决策" 
      width="340px" 
      class="poker-modern-dialog"
      :align-center="true"
      :close-on-click-modal="false"
    >
      <div class="raise-container">
        <div class="raise-display">
          <div class="display-item">
            <span class="label">加注额</span>
            <span class="value text-orange">{{ raiseAmount }}</span>
          </div>
          <div class="display-divider"></div>
          <div class="display-item">
            <span class="label">总投入</span>
            <span class="value text-blue">{{ currentBet + raiseAmount }}</span>
          </div>
        </div>
        
        <div class="slider-wrapper">
          <el-slider v-model="raiseAmount" :min="minRaise" :max="maxRaise" :step="10" />
        </div>
        
        <div class="quick-bet-grid">
          <button @click="raiseAmount = Math.min(maxRaise, minRaise + 50)">+50</button>
          <button @click="raiseAmount = Math.min(maxRaise, Math.floor(pot / 2))">1/2 池</button>
          <button @click="raiseAmount = Math.min(maxRaise, pot)">全池</button>
          <button @click="raiseAmount = maxRaise" class="all-in-btn">ALL IN</button>
        </div>
        
        <div class="remaining-chips">
          剩余筹码: <span>{{ playerChips - raiseAmount }}</span>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showRaiseInput = false" round size="large" style="flex: 1">放弃</el-button>
          <el-button type="primary" @click="raise" round size="large" class="confirm-raise-btn">确认加注</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 结算弹窗 -->
    <el-dialog 
      v-model="showResult" 
      :show-close="false"
      width="380px" 
      class="poker-modern-dialog result-mode"
      :align-center="true"
      :close-on-click-modal="false"
    >
      <div class="result-container" :class="resultClass">
        <div class="result-header-decoration">
          <div class="icon-circle">
            <el-icon v-if="resultClass === 'win'"><Trophy /></el-icon>
            <el-icon v-else-if="resultClass === 'loss'"><CircleClose /></el-icon>
            <el-icon v-else><Switch /></el-icon>
          </div>
        </div>
        
        <h2 class="result-title">{{ resultTitle }}</h2>
        <p class="result-subtitle">{{ resultMessage }}</p>

        <!-- 亮牌区域 -->
        <div class="showdown-reveal">
          <div class="reveal-hand-box">
            <div class="hand-info">
              <span class="player-tag">我的手牌</span>
              <span class="type-tag">{{ playerHandType }}</span>
            </div>
            <div class="hand-cards-list">
              <div v-for="(card, idx) in finalPlayerCards" :key="idx" class="mini-card" :class="getCardClass(card)">
                <span class="v">{{ card.display }}</span>
                <span class="s">{{ card.suit }}</span>
              </div>
            </div>
          </div>

          <div class="vs-divider-line"><span>VS</span></div>

          <div class="reveal-hand-box">
            <div class="hand-info">
              <span class="player-tag">AI 对手</span>
              <span class="type-tag">{{ aiHandType }}</span>
            </div>
            <div class="hand-cards-list">
              <div v-for="(card, idx) in finalAiCards" :key="idx" class="mini-card" :class="getCardClass(card)">
                <span class="v">{{ card.display }}</span>
                <span class="s">{{ card.suit }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="profit-display">
          <span class="label">本局收益</span>
          <span class="value" :class="resultClass">
            {{ resultClass === 'win' ? '+' : (resultClass === 'loss' ? '-' : '') }}{{ lastPot }}
          </span>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="closeResultDialog" style="width: 100%" size="large" round class="next-round-btn">
          继续下一局
        </el-button>
      </template>
    </el-dialog>

    <!-- 游戏结束弹窗 -->
    <el-dialog 
      v-model="showGameOver" 
      :show-close="false"
      width="360px" 
      class="poker-modern-dialog game-over-mode"
      :align-center="true"
      :close-on-click-modal="false"
    >
      <div class="game-over-container">
        <div class="trophy-wrapper">
          <el-icon size="80" color="#facc15"><StarFilled /></el-icon>
        </div>
        <h2 class="over-title">{{ gameOverTitle }}</h2>
        <p class="over-msg">{{ gameOverMessage }}</p>
        <div class="stats-grid">
          <div class="stat-box">
            <span class="label">最终资产</span>
            <span class="value" :class="playerChips > initialChips ? 'win' : 'loss'">{{ playerChips }}</span>
          </div>
          <div class="stat-box">
            <span class="label">对局总数</span>
            <span class="value">{{ roundCount }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="footer-vertical">
          <el-button type="primary" @click="playAgain" size="large" round class="restart-btn">再来一局</el-button>
          <el-button @click="resetGame" size="large" round class="exit-btn">返回设置</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  VideoPlay, Money, Coin, User, Monitor, CaretRight,
  CircleClose, Switch, Check, Plus, Loading, Menu, HomeFilled,
  Refresh, RefreshRight, Star, Trophy, ArrowLeft, StarFilled
} from '@element-plus/icons-vue'
import {
  Deck, Card, HandType, HandResult,
  evaluateHand, compareHands, evaluateHandPotential,
  getHandTypeName
} from '../utils/poker'

const router = useRouter()
const showMenu = ref(false)

// 游戏状态
type GameState = 'not_started' | 'player_turn' | 'ai_turn' | 'round_over' | 'game_over'

// 响应式数据
const gameState = ref<GameState>('not_started')
const initialChips = ref(1000)
const playerChips = ref(1000)
const aiChips = ref(1000)
const pot = ref(0)
const currentBet = ref(0)
const aiCurrentBet = ref(0)

// 统计
const roundCount = ref(0)
const playerWins = ref(0)
const aiWins = ref(0)
const drawCount = ref(0)

// 牌
const deck = ref<Deck | null>(null)
const playerHiddenCard = ref<Card | null>(null)
const playerVisibleCards = ref<Card[]>([])
const aiHiddenCard = ref<Card | null>(null)
const aiVisibleCards = ref<Card[]>([])

// 结算完整手牌
const finalPlayerCards = ref<Card[]>([])
const finalAiCards = ref<Card[]>([])

// 轮次
const currentRound = ref(1)
const playerTurnFirst = ref(false)

// 消息
const message = ref('')
const messageType = ref<'info' | 'success' | 'warning' | 'error'>('info')
const aiMessage = ref('')

// 操作
const canCheck = ref(false)
const canCall = ref(false)
const canAllIn = ref(false)
const callAmount = ref(0)
const showRaiseInput = ref(false)
const raiseAmount = ref(0)
const minRaise = ref(0)
const maxRaise = ref(0)

// 结果
const showResult = ref(false)
const resultTitle = ref('')
const resultMessage = ref('')
const resultClass = ref('')
const playerHandType = ref('')
const aiHandType = ref('')
const lastPot = ref(0)
const showCardsRevealed = ref(false)

// 游戏结束
const showGameOver = ref(false)
const gameOverTitle = ref('')
const gameOverMessage = ref('')

const goHome = () => router.push('/')

const getCardClass = (card: Card | null) => {
  if (!card) return ''
  return (card.suit === '♥' || card.suit === '♦') ? 'card-red' : 'card-black'
}

const compareVisibleCards = (): boolean => {
  const pMax = playerVisibleCards.value.reduce((max, c) => Math.max(max, c.value), 0)
  const aMax = aiVisibleCards.value.reduce((max, c) => Math.max(max, c.value), 0)
  return pMax >= aMax
}

const startGame = () => {
  playerChips.value = initialChips.value
  aiChips.value = initialChips.value
  roundCount.value = 0; playerWins.value = 0; aiWins.value = 0
  newRound()
}

const newRound = () => {
  deck.value = new Deck(); deck.value.shuffle()
  playerHiddenCard.value = null; playerVisibleCards.value = []
  aiHiddenCard.value = null; aiVisibleCards.value = []
  finalPlayerCards.value = []; finalAiCards.value = []
  pot.value = 0; currentBet.value = 0; aiCurrentBet.value = 0
  currentRound.value = 1; message.value = ''; aiMessage.value = ''
  showResult.value = false; showCardsRevealed.value = false

  playerHiddenCard.value = deck.value.deal()
  aiHiddenCard.value = deck.value.deal()
  playerVisibleCards.value.push(deck.value.deal())
  aiVisibleCards.value.push(deck.value.deal())

  const blind = Math.min(10, playerChips.value, aiChips.value)
  placeBet('player', blind); placeBet('ai', blind)

  playerTurnFirst.value = compareVisibleCards()
  if (playerTurnFirst.value) {
    gameState.value = 'player_turn'; message.value = '你先行动'; messageType.value = 'info'
  } else {
    gameState.value = 'ai_turn'; message.value = 'AI 先行动'; messageType.value = 'warning'
    setTimeout(aiDecision, 1000)
  }
  updateAvailableActions()
}

const placeBet = (who: 'player' | 'ai', amount: number) => {
  if (who === 'player') {
    const act = Math.min(amount, playerChips.value)
    playerChips.value -= act; pot.value += act; currentBet.value += act
  } else {
    const act = Math.min(amount, aiChips.value)
    aiChips.value -= act; pot.value += act; aiCurrentBet.value += act
  }
}

const updateAvailableActions = () => {
  if (gameState.value !== 'player_turn' || playerChips.value <= 0) {
    canCheck.value = false; canCall.value = false; canAllIn.value = false; return
  }
  if (aiCurrentBet.value > currentBet.value) {
    canCheck.value = false; canCall.value = true
    callAmount.value = aiCurrentBet.value - currentBet.value
    canAllIn.value = playerChips.value > callAmount.value
  } else {
    canCheck.value = true; canCall.value = false; callAmount.value = 0
    canAllIn.value = playerChips.value > 0
  }
  const diff = aiCurrentBet.value - currentBet.value + 10
  minRaise.value = Math.max(10, diff); maxRaise.value = playerChips.value
  if (minRaise.value > maxRaise.value) minRaise.value = maxRaise.value
  raiseAmount.value = minRaise.value
}

const check = () => {
  if (!canCheck.value) return
  if (playerTurnFirst.value) { gameState.value = 'ai_turn'; setTimeout(aiDecision, 800) }
  else endPlayerTurn()
}

const call = () => {
  if (!canCall.value) return
  placeBet('player', callAmount.value); currentBet.value = aiCurrentBet.value; endPlayerTurn()
}

const raise = () => {
  if (raiseAmount.value < minRaise.value || raiseAmount.value > maxRaise.value) return
  placeBet('player', raiseAmount.value); showRaiseInput.value = false; endPlayerTurn()
}

const openRaiseDialog = () => { updateAvailableActions(); showRaiseInput.value = true }

const allIn = () => {
  if (playerChips.value <= 0) return
  placeBet('player', playerChips.value); showRaiseInput.value = false
  if (currentRound.value >= 4) showdown()
  else nextRoundAfterAllIn()
}

const nextRoundAfterAllIn = () => {
  currentRound.value++
  if (aiChips.value > 0) {
    const toCall = Math.min(currentBet.value - aiCurrentBet.value, aiChips.value)
    if (toCall > 0) placeBet('ai', toCall)
  }
  playerVisibleCards.value.push(deck.value!.deal())
  aiVisibleCards.value.push(deck.value!.deal())
  if (currentRound.value < 4) setTimeout(nextRoundAfterAllIn, 800)
  else setTimeout(showdown, 800)
}

const fold = () => {
  message.value = '你弃牌了'; aiChips.value += pot.value; pot.value = 0
  roundCount.value++; aiWins.value++; gameState.value = 'round_over'
  resultTitle.value = 'AI 获胜'; resultMessage.value = '你选择了弃牌'
  resultClass.value = 'loss'; showResult.value = true
  finalPlayerCards.value = [playerHiddenCard.value!, ...playerVisibleCards.value]
  finalAiCards.value = [aiHiddenCard.value!, ...aiVisibleCards.value]
}

const endPlayerTurn = () => {
  if (currentBet.value === aiCurrentBet.value) {
    if (currentRound.value >= 4) showdown()
    else nextRound()
  } else {
    gameState.value = 'ai_turn'; setTimeout(aiDecision, 1000)
  }
}

const nextRound = () => {
  currentRound.value++; currentBet.value = 0; aiCurrentBet.value = 0
  playerVisibleCards.value.push(deck.value!.deal())
  aiVisibleCards.value.push(deck.value!.deal())
  playerTurnFirst.value = compareVisibleCards()
  if (playerTurnFirst.value) gameState.value = 'player_turn'
  else { gameState.value = 'ai_turn'; setTimeout(aiDecision, 1000) }
  updateAvailableActions()
}

const aiDecision = () => {
  if (gameState.value !== 'ai_turn') return
  const allCards = [aiHiddenCard.value!, ...aiVisibleCards.value]
  const evalPot = evaluateHandPotential(allCards)
  const toCall = Math.max(0, currentBet.value - aiCurrentBet.value)
  
  let action: 'fold' | 'check' | 'call' | 'raise' | 'allin' = 'check'
  let raiseAmt = 0

  if (evalPot.handType >= HandType.STRAIGHT) {
    action = Math.random() > 0.7 ? 'allin' : 'raise'
    raiseAmt = toCall + Math.floor(pot.value * (1 + Math.random()))
  } else if (evalPot.handType >= HandType.TWO_PAIR) {
    action = Math.random() > 0.4 ? 'raise' : 'call'
    raiseAmt = toCall + Math.floor(pot.value * 0.5)
  } else if (toCall > aiChips.value * 0.5 && evalPot.handType < HandType.ONE_PAIR) {
    action = 'fold'
  } else {
    action = toCall > 0 ? 'call' : 'check'
  }

  if (action === 'fold' && toCall > 0) {
    aiMessage.value = '我撤了'
    playerChips.value += pot.value; pot.value = 0; roundCount.value++; playerWins.value++
    gameState.value = 'round_over'; resultTitle.value = '你赢了'
    resultMessage.value = 'AI 选择了弃牌'; resultClass.value = 'win'; showResult.value = true
    finalPlayerCards.value = [playerHiddenCard.value!, ...playerVisibleCards.value]
    finalAiCards.value = [aiHiddenCard.value!, ...aiVisibleCards.value]
    return
  }

  if (action === 'allin') { placeBet('ai', aiChips.value); aiMessage.value = '梭哈！' }
  else if (action === 'raise') {
    const fr = Math.min(aiChips.value, Math.max(toCall + 10, raiseAmt))
    placeBet('ai', fr); aiMessage.value = `加注至 ${aiCurrentBet.value}`
  } else if (toCall > 0) { placeBet('ai', toCall); aiMessage.value = '跟了' }
  else { aiMessage.value = '过' }

  setTimeout(() => {
    if (currentBet.value === aiCurrentBet.value) {
      if (currentRound.value >= 4) showdown()
      else nextRound()
    } else { gameState.value = 'player_turn'; updateAvailableActions() }
  }, 800)
}

const showdown = () => {
  gameState.value = 'round_over'; roundCount.value++
  finalPlayerCards.value = [playerHiddenCard.value!, ...playerVisibleCards.value]
  finalAiCards.value = [aiHiddenCard.value!, ...aiVisibleCards.value]
  const pH = evaluateHand([{...playerHiddenCard.value!, isHidden: false}, ...playerVisibleCards.value])
  const aH = evaluateHand([{...aiHiddenCard.value!, isHidden: false}, ...aiVisibleCards.value])
  playerHandType.value = pH.name; aiHandType.value = aH.name
  const curPot = pot.value; const res = compareHands(pH, aH)
  showCardsRevealed.value = true

  setTimeout(() => {
    if (res > 0) {
      playerChips.value += curPot; playerWins.value++; resultTitle.value = '恭喜获胜'; resultClass.value = 'win'
    } else if (res < 0) {
      aiChips.value += curPot; aiWins.value++; resultTitle.value = '遗憾落败'; resultClass.value = 'loss'
    } else {
      playerChips.value += Math.floor(curPot/2); aiChips.value += Math.floor(curPot/2); resultTitle.value = '平局'; resultClass.value = 'draw'
    }
    pot.value = 0; lastPot.value = curPot; showResult.value = true
    setTimeout(() => {
      if (playerChips.value <= 0 || aiChips.value <= 0) {
        gameOverTitle.value = playerChips.value <= 0 ? '对局结束' : '大获全胜'
        gameOverMessage.value = playerChips.value <= 0 ? '筹码已耗尽' : 'AI 已彻底出局'
        showGameOver.value = true; gameState.value = 'game_over'
      }
    }, 1000)
  }, 1000)
}

const newGame = () => { showResult.value = false; newRound() }
const resetGame = () => { showResult.value = false; showGameOver.value = false; gameState.value = 'not_started' }
const playAgain = () => { showGameOver.value = false; startGame() }
const closeResultDialog = () => { showResult.value = false; if (gameState.value !== 'game_over') newRound() }
</script>

<style scoped>
.showhand-view {
  background: #f8fafc;
  height: 100vh; width: 100vw; color: #1e293b;
  display: flex; flex-direction: column; overflow: hidden;
  position: fixed; top: 0; left: 0;
}

.game-wrapper { flex: 1; display: flex; flex-direction: column; height: 100%; }

/* 顶部栏 */
.app-header {
  background: #ffffff; padding: 12px 24px; border-bottom: 1px solid #f1f5f9;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03); z-index: 100;
}
.header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 16px; }
.brand .title { font-size: 1.1rem; margin: 0; font-weight: 800; color: #0f172a; }
.brand .subtitle { font-size: 0.65rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.header-center { flex: 1; display: flex; justify-content: center; }
.scoreboard { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; display: flex; align-items: center; padding: 4px 8px; }
.score-item { display: flex; align-items: center; gap: 8px; padding: 4px 12px; }
.score-item.win .dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; }
.score-item.loss .dot { width: 6px; height: 6px; background: #ef4444; border-radius: 50%; }
.score-item .label { font-size: 0.75rem; color: #64748b; font-weight: 600; }
.score-item .val { font-size: 1rem; color: #0f172a; font-weight: 800; }
.score-divider { width: 1px; height: 20px; background: #e2e8f0; }
.round-counter { display: flex; align-items: center; gap: 4px; font-weight: 700; color: #64748b; }
.round-counter .count { color: #0ea5e9; font-size: 1.1rem; }
.icon-action-btn { background: #fff; border: 1.5px solid #e2e8f0; width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #475569; cursor: pointer; }

/* 初始界面美化 */
.setup-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); z-index: 200; display: flex; align-items: center; justify-content: center; }
.setup-hero-card { background: #fff; border-radius: 32px; width: 90%; max-width: 400px; padding: 40px; position: relative; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.15); overflow: hidden; }
.card-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 70%); pointer-events: none; }
.icon-stack { position: relative; height: 100px; display: flex; justify-content: center; align-items: center; margin-bottom: 20px; }
.floating-card { position: absolute; width: 50px; height: 70px; background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
.floating-card.c1 { transform: rotate(-15deg) translateX(-30px); color: #1e293b; }
.floating-card.c2 { transform: rotate(15deg) translateX(30px); color: #ef4444; z-index: 1; }
.center-coin { font-size: 3rem; color: #f59e0b; z-index: 2; filter: drop-shadow(0 4px 12px rgba(245,158,11,0.3)); }
.setup-content h3 { font-size: 1.8rem; font-weight: 900; color: #0f172a; margin: 0 0 12px; }
.setup-content .description { color: #64748b; font-size: 0.9rem; line-height: 1.6; margin-bottom: 30px; }
.chip-input-group { background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9; margin-bottom: 30px; }
.input-label { display: block; font-size: 0.75rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; }
.poker-input { width: 100%; }
.big-start-btn { width: 100%; height: 60px !important; font-size: 1.2rem !important; font-weight: 800 !important; border-radius: 18px !important; background: linear-gradient(135deg, #0ea5e9, #2563eb) !important; border: none !important; box-shadow: 0 10px 25px -5px rgba(37,99,235,0.4) !important; }

/* 加注弹窗样式修复 */
.raise-container { text-align: center; }
.raise-display { background: #f8fafc; border-radius: 16px; padding: 15px; display: flex; align-items: center; margin-bottom: 20px; border: 1px solid #f1f5f9; }
.display-item { flex: 1; display: flex; flex-direction: column; }
.display-divider { width: 1px; height: 30px; background: #e2e8f0; margin: 0 15px; }
.display-item .label { font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
.display-item .value { font-size: 1.4rem; font-weight: 800; }
.text-orange { color: #f59e0b; }
.text-blue { color: #0ea5e9; }
.slider-wrapper { padding: 0 10px; margin-bottom: 25px; }
.quick-bet-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
.quick-bet-grid button { background: #fff; border: 1.5px solid #e2e8f0; padding: 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; color: #475569; cursor: pointer; }
.quick-bet-grid .all-in-btn { background: #fef2f2; border-color: #fecaca; color: #ef4444; }
.remaining-chips { font-size: 0.8rem; color: #94a3b8; margin-top: 10px; }
.dialog-footer { display: flex; gap: 12px; width: 100%; }
.confirm-raise-btn { flex: 2; background: linear-gradient(135deg, #0ea5e9, #2563eb) !important; border: none !important; font-weight: 800 !important; }

/* 牌桌样式 */
.poker-table-container { flex: 1; padding: 15px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #f1f5f9 0%, #e2e8f0 100%); }
.poker-table { width: 100%; max-width: 900px; height: 100%; max-height: 580px; background: #15803d; border: 10px solid #cbd5e1; border-radius: 80px; position: relative; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15), inset 0 0 80px rgba(0,0,0,0.3); overflow: hidden; }
.table-felt { height: 100%; padding: 25px; display: flex; flex-direction: column; justify-content: space-between; position: relative; }

/* 角色 & 卡牌 */
.ai-side, .player-side { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.player-profile { display: flex; align-items: center; gap: 12px; position: relative; }
.player-info-card { background: rgba(255,255,255,0.95); padding: 5px 15px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-width: 120px; }
.info-main { display: flex; flex-direction: column; gap: 2px; }
.role-group { display: flex; justify-content: space-between; align-items: center; }
.role { font-size: 0.65rem; color: #64748b; font-weight: 600; }
.bet-tag { background: #ef4444; color: #fff; padding: 1px 4px; border-radius: 4px; font-size: 0.6rem; font-weight: 800; }
.chips-val { color: #f59e0b; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; gap: 4px; }
.avatar-box { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #fff; }
.avatar-box.ai { background: #1e293b; }
.avatar-box.user { background: #0ea5e9; }

.cards-area { display: flex; gap: 6px; min-height: 90px; }
.card { width: 60px; height: 84px; background: #fff; border-radius: 6px; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transform-style: preserve-3d; transition: transform 0.6s; }
.card-pattern { position: absolute; inset: 0; background: #3b82f6; border: 2px solid #fff; border-radius: 6px; background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 6px 6px; }
.card-front { position: absolute; inset: 0; background: #fff; border-radius: 6px; backface-visibility: hidden; transform: rotateY(180deg); }
.card-back.is-flipped { transform: rotateY(180deg); }
.card-num { position: absolute; top: 2px; left: 5px; line-height: 1; font-weight: 800; display: flex; flex-direction: column; }
.card-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; opacity: 0.1; }
.hole-tag { position: absolute; bottom: -4px; right: -4px; background: #facc15; color: #000; font-size: 0.6rem; padding: 0 4px; border-radius: 2px; font-weight: 800; border: 1px solid #000; }

.center-stage { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.pot-box { background: rgba(0,0,0,0.6); padding: 6px 25px; border-radius: 30px; border: 2px solid #facc15; }
.pot-num { color: #facc15; font-weight: 900; font-size: 1.6rem; display: flex; align-items: center; gap: 6px; }
.round-text { font-size: 0.7rem; color: #fff; opacity: 0.7; font-weight: 700; }
.game-msg { font-size: 0.85rem; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
.game-msg.info { color: #fff; }
.game-msg.warning { color: #facc15; }
.game-msg.success { color: #4ade80; }

.bottom-controls { background: #fff; padding: 15px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; min-height: 100px; }
.btn-grid { display: flex; gap: 8px; overflow-x: auto; justify-content: center; align-items: center; }
.game-btn { border: none; border-radius: 8px; padding: 10px 18px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; color: #fff; }
.game-btn.gray { background: #64748b; }
.game-btn.blue { background: #0ea5e9; }
.game-btn.green { background: #22c55e; }
.game-btn.orange { background: #f59e0b; }
.game-btn.red { background: #ef4444; }
.pulse { animation: btn-pulse 2s infinite; }
@keyframes btn-pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

.bubble.ai { position: absolute; top: -20px; right: -60px; background: #fff; color: #1e293b; padding: 4px 10px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 50; }

:deep(.poker-modern-dialog) { border-radius: 24px !important; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important; }
:deep(.poker-modern-dialog .el-dialog__header) { text-align: center; padding: 20px 24px 10px !important; }
:deep(.poker-modern-dialog .el-dialog__title) { font-weight: 800; font-size: 1.2rem; }

.showdown-reveal { margin: 20px 0; display: flex; flex-direction: column; gap: 12px; }
.reveal-hand-box { background: #f8fafc; border-radius: 16px; padding: 12px; border: 1px solid #f1f5f9; }
.hand-info { display: flex; justify-content: space-between; margin-bottom: 8px; }
.type-tag { font-size: 0.7rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 800; }
.hand-cards-list { display: flex; gap: 4px; justify-content: center; }
.mini-card { width: 36px; height: 50px; background: #fff; border-radius: 4px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.mini-card .v { font-size: 0.9rem; font-weight: 900; }
.card-red { color: #ef4444; }
.card-black { color: #1e293b; }

.profit-display .value { font-size: 2.2rem; font-weight: 900; }
.value.win { color: #22c55e; }
.value.loss { color: #ef4444; }

@media (max-width: 600px) {
  .header-center { display: none; }
  .poker-table { border-radius: 40px; border-width: 6px; }
  .card { width: 46px; height: 64px; }
  .setup-hero-card { padding: 25px; }
  .setup-content h3 { font-size: 1.4rem; }
  .mini-card { width: 30px; height: 42px; }
}
</style>
