<template>
  <div class="showhand-view" ref="gameContainer">
    <div class="game-wrapper">
      <!-- Optimized Header -->
      <header class="app-header">
        <div class="header-content">
          <div class="header-left">
            <button @click="toggleMenu" class="menu-trigger-btn">
              <el-icon><Menu /></el-icon>
            </button>
            <div class="brand-box">
              <h1 class="brand-title">梭哈对决</h1>
              <span class="brand-sub">PRO EDITION</span>
            </div>
          </div>
          <div class="header-center mobile-hide"></div>
          <div class="header-right">
            <div class="round-indicator-modern">
              <span class="l">局</span>
              <span class="v">{{ roundCount + 1 }}</span>
            </div>
            <button @click="resetGame" class="header-reset-btn" title="重开本局">
              <el-icon><RefreshRight /></el-icon>
            </button>
          </div>
        </div>
      </header>

      <!-- Poker Table Container -->
      <div class="poker-table-container">
        <div class="poker-table">
          <!-- Setup Overlay -->
          <div v-if="gameState === 'not_started'" class="setup-overlay">
            <div class="setup-card">
              <el-icon class="hero-icon"><Coin /></el-icon>
              <h3>准备开局</h3>
              <div class="setup-form">
                <div class="form-row">
                  <span class="label">初始筹码</span>
                  <el-input-number v-model="initialChips" :min="100" :max="10000" :step="500" controls-position="right" class="full-w" />
                </div>
                <div class="form-row">
                  <span class="label">对手数量</span>
                  <el-radio-group v-model="aiCount" class="full-w custom-radio">
                    <el-radio-button :value="1">1 VS 1</el-radio-button>
                    <el-radio-button :value="2">1 VS 2</el-radio-button>
                    <el-radio-button :value="3">1 VS 3</el-radio-button>
                  </el-radio-group>
                </div>
              </div>
              <button @click="startGame" class="start-btn-modern">开始游戏</button>
            </div>
          </div>

          <!-- Table Felt -->
          <div class="table-felt">
            <!-- Opponents Zone -->
            <div v-for="(ai, index) in opponents" :key="ai.id" 
                class="ai-node" 
                :class="[`pos-${aiCount}-${index}`, { 'active': activePlayerIndex === index && (gameState === 'ai_turn' || gameState === 'choosing_hole_card'), 'folded': ai.isFolded }]"
              >
                <div class="ai-profile-box">
                  <div class="avatar-box ai">
                    <el-icon><Monitor /></el-icon>
                    <Transition name="bubble-fade"><div v-if="ai.message" class="bubble ai">{{ ai.message }}</div></Transition>
                  </div>
                  <div class="ai-info-pill">
                    <span class="name">{{ ai.name }}</span>
                    <span class="chips">{{ ai.chips }}</span>
                  </div>
                </div>
                <!-- AI Hands -->
                <div class="cards-area stacked mini ai-hand-row">
                  <TransitionGroup name="deal">
                    <div v-if="ai.hiddenCard" :key="`ai-${ai.id}-h`" class="card-slot mini">
                      <div class="card mini card-back" :class="{ 'is-flipped': showCardsRevealed }">
                        <div class="card-front" :class="getCardClass(ai.hiddenCard)">
                          <div class="card-num"><span>{{ ai.hiddenCard.display }}</span><span class="suit-mini">{{ ai.hiddenCard.suit }}</span></div>
                        </div>
                        <div class="card-pattern"></div>
                      </div>
                    </div>
                    <div v-for="(card, cIdx) in ai.visibleCards" :key="`ai-${ai.id}-v-${cIdx}`" class="card-slot mini">
                      <div class="card mini" :class="getCardClass(card)">
                        <div class="card-num"><span>{{ card.display }}</span><span class="suit-mini">{{ card.suit }}</span></div>
                      </div>
                    </div>
                  </TransitionGroup>
                </div>
                <div v-if="ai.currentBet > 0" class="bet-chip-pill">投: {{ ai.currentBet }}</div>
            </div>

            <!-- Center Zone -->
            <div v-if="gameState !== 'not_started'" class="center-zone">
              <div class="pot-display-modern">
                <span class="label">POT</span>
                <div class="val"><el-icon><Coin /></el-icon> {{ pot }}</div>
              </div>
              <div class="round-tag">ROUND {{ currentRound }}</div>
              <div class="status-hint" :class="messageType">{{ message }}</div>
            </div>

            <!-- Player Zone -->
            <div v-if="gameState !== 'not_started'" class="player-zone" :class="{ 'active': activePlayerIndex === opponents.length && gameState === 'player_turn', 'folded': isPlayerFolded }">
              <div class="cards-area stacked player-hand-row">
                <TransitionGroup name="deal">
                  <!-- Hidden Card -->
                  <div v-if="playerHiddenCard" key="ph" class="card-slot" 
                    :class="{ 'selectable': gameState === 'choosing_hole_card' }"
                    @click="handleCardClick(-1)"
                  >
                    <div class="card" :class="[getCardClass(playerHiddenCard), { 'selection-glow': gameState === 'choosing_hole_card' }]">
                      <div class="card-num"><span>{{ playerHiddenCard.display }}</span><span class="suit-mini">{{ playerHiddenCard.suit }}</span></div>
                      <div class="hole-card-sash bottom-left"><span>底</span></div>
                    </div>
                  </div>
                  <!-- Visible Cards -->
                  <div v-for="(card, idx) in playerVisibleCards" :key="'pv'+idx" class="card-slot" 
                    :class="{ 'selectable': gameState === 'choosing_hole_card' && idx === playerVisibleCards.length - 1 }"
                    @click="handleCardClick(idx)"
                  >
                    <div class="card" :class="[getCardClass(card), { 'selection-glow': gameState === 'choosing_hole_card' && idx === playerVisibleCards.length - 1 }]">
                      <div class="card-num"><span>{{ card.display }}</span><span class="suit-mini">{{ card.suit }}</span></div>
                    </div>
                  </div>
                </TransitionGroup>
              </div>
              
              <div class="user-seat-modern">
                <div class="avatar-box user"><el-icon><User /></el-icon></div>
                <div class="user-info-card">
                  <div class="row-top">
                    <span class="label">我的筹码</span>
                    <div v-if="currentBet > 0" class="bet-tag">本轮: {{ currentBet }}</div>
                  </div>
                  <div class="chips-val">{{ playerChips }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Controls -->
      <div v-if="gameState !== 'not_started'" class="bottom-controls">
        <!-- Selection Phase UI (Integrated into bottom bar) -->
        <div v-if="gameState === 'choosing_hole_card'" class="selection-phase-ui-v2">
          <div class="hint-stack">
            <span class="l1">发牌中...</span>
            <span class="l2">点击牌面切换底牌</span>
          </div>
          <button @click="confirmHoleCard" class="confirm-selection-btn">
            确定底牌 <span class="v2-timer">({{ selectionCountdown }}s)</span>
          </button>
        </div>

        <!-- Normal Betting Controls -->
        <div v-if="gameState === 'player_turn'" class="btn-group">
          <button @click="fold" class="game-btn gray">弃牌</button>
          <button v-if="canCheck" @click="check" class="game-btn blue">过牌</button>
          <button v-if="canCall" @click="call" class="game-btn green">跟注</button>
          <button v-if="playerChips > 0" @click="openRaiseDialog" class="game-btn orange">加注</button>
          <button v-if="playerChips > 0 && canAllIn" @click="allIn" class="game-btn red pulse">梭哈</button>
        </div>

        <div v-if="gameState === 'ai_turn'" class="thinking-ui">
          <div class="loader-dots"><span></span><span></span><span></span></div>
          <span class="txt">{{ opponents[activePlayerIndex]?.name }} 行动中...</span>
        </div>

        <div v-if="gameState === 'round_over'" class="end-actions">
          <el-button type="primary" @click="newRound" size="large" round v-if="playerChips > 0">下一局</el-button>
          <el-button @click="resetGame" size="large" round plain>重新开局</el-button>
        </div>
      </div>
    </div>

    <!-- Raise Dialog -->
    <el-dialog v-model="showRaiseInput" title="加注" width="340px" class="poker-dialog-v2" :align-center="true">
      <div class="dialog-body-v2">
        <div class="val-header">
          <span class="l">选择加注额</span>
          <strong class="v">{{ raiseAmount }}</strong>
        </div>
        <el-slider v-model="raiseAmount" :min="minRaise" :max="maxRaise" :step="10" />
        <div class="quick-bet-grid">
          <button @click="raiseAmount = Math.min(maxRaise, 100)">+100</button>
          <button @click="raiseAmount = Math.min(maxRaise, Math.floor(pot/2))">1/2 池</button>
          <button @click="raiseAmount = maxRaise">全押</button>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="raise" round size="large" class="dialog-action-btn">确定加注</el-button>
      </template>
    </el-dialog>

    <!-- Result Dialog -->
    <el-dialog v-model="showResult" :show-close="false" width="400px" class="poker-dialog-v2 result-mode" :align-center="true">
      <div class="result-wrap-v2" :class="resultClass">
        <div class="res-head">
          <el-icon class="res-icon">
            <Trophy v-if="resultClass==='win'"/>
            <CircleClose v-else-if="resultClass==='loss'"/>
            <WarningFilled v-else/>
          </el-icon>
          <h2>{{ resultTitle }}</h2>
        </div>
        <div v-if="showdownResults.length > 0" class="showdown-list">
          <div v-for="p in showdownResults" :key="p.name" class="showdown-item" :class="{ 'is-winner': p.isWinner }">
            <div class="p-info">
              <span class="p-name">{{ p.name }}</span>
              <span class="p-type">{{ p.handType }}</span>
            </div>
            <div class="p-hand">
              <span v-for="(c, i) in p.cards" :key="i" :class="getCardClass(c)">{{ c.display }}{{ c.suit }}</span>
            </div>
          </div>
        </div>
        <div class="res-footer">
          <span v-if="resultClass !== 'game_over'">总底池: <strong>{{ lastPot }}</strong></span>
          <span v-else>您已输光所有筹码，请重新开始</span>
        </div>
      </div>
      <template #footer>
        <el-button v-if="resultClass !== 'game_over'" type="primary" @click="closeResultDialog" round size="large" class="dialog-action-btn">继续</el-button>
        <el-button v-else type="danger" @click="resetGame" round size="large" class="dialog-action-btn">回到大厅</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Menu, RefreshRight, Coin, Monitor, Money, User, Trophy, CircleClose, WarningFilled
} from '@element-plus/icons-vue'
import { Deck, Card, HandType, evaluateHand, compareHands, evaluateHandPotential } from '../utils/poker'

const router = useRouter()

type GameState = 'not_started' | 'choosing_hole_card' | 'player_turn' | 'ai_turn' | 'round_over'
const gameState = ref<GameState>('not_started')
const initialChips = ref(1000)
const aiCount = ref(1)

interface AIPlayer {
  id: number; name: string; chips: number;
  hiddenCard: Card | null; visibleCards: Card[];
  currentBet: number; isFolded: boolean; message: string; hasActed: boolean;
  personality: 'aggressive' | 'tight' | 'balanced';
}
const opponents = ref<AIPlayer[]>([])
const playerChips = ref(1000)
const playerHiddenCard = ref<Card | null>(null)
const playerVisibleCards = ref<Card[]>([])
const currentBet = ref(0)
const isPlayerFolded = ref(false)
const playerHasActed = ref(false)

const pot = ref(0)
const highestBet = ref(0)
const currentRound = ref(1)
const activePlayerIndex = ref(0)
const roundCount = ref(0)
const playerWins = ref(0)
const aiWins = ref(0)
const deck = ref<Deck | null>(null)

const message = ref('')
const messageType = ref<'info'|'success'|'warning'>('info')
const showResult = ref(false)
const resultTitle = ref('')
const resultClass = ref('')
const lastPot = ref(0)
const showCardsRevealed = ref(false)
const showdownResults = ref<any[]>([])
const showRaiseInput = ref(false)
const raiseAmount = ref(0)
const minRaise = ref(10)
const maxRaise = ref(1000)
const canCall = ref(false)
const canCheck = ref(false)
const canAllIn = ref(false)
const callAmount = ref(0)

const selectionCountdown = ref(5)
let countdownInterval: any = null

const getCardClass = (c: Card | null) => (!c ? '' : (c.suit === '♥' || c.suit === '♦' ? 'card-red' : 'card-black'))

const toggleMenu = () => {
  // 触发自定义事件，通知父组件切换菜单
  window.dispatchEvent(new CustomEvent('toggle-sidebar'))
}

const startGame = () => {
  const personalities: ('aggressive' | 'tight' | 'balanced')[] = ['aggressive', 'tight', 'balanced'];
  opponents.value = Array.from({ length: aiCount.value }, (_, i) => ({
    id: i, name: `AI 对手 ${i + 1}`, chips: initialChips.value,
    hiddenCard: null, visibleCards: [], currentBet: 0, isFolded: false, message: '', hasActed: false,
    personality: personalities[i % 3]
  }))
  playerChips.value = initialChips.value
  roundCount.value = 0; playerWins.value = 0; aiWins.value = 0; newRound()
}

const newRound = () => {
  if (playerChips.value <= 0) { resetGame(); return }
  deck.value = new Deck(); deck.value.shuffle(); pot.value = 0; highestBet.value = 0; currentRound.value = 1
  currentBet.value = 0; isPlayerFolded.value = false; playerVisibleCards.value = []; playerHasActed.value = false
  opponents.value.forEach(ai => { ai.isFolded = false; ai.visibleCards = []; ai.currentBet = 0; ai.message = ''; ai.hasActed = false; ai.chips = Math.max(ai.chips, 100) })
  
  showCardsRevealed.value = false; showResult.value = false; showdownResults.value = []
  playerHiddenCard.value = deck.value.deal(); 
  playerVisibleCards.value.push(deck.value.deal())
  opponents.value.forEach(ai => { ai.hiddenCard = deck.value!.deal(); ai.visibleCards.push(deck.value!.deal()) })
  
  enterSelectionPhase()
}

const enterSelectionPhase = () => {
  gameState.value = 'choosing_hole_card'
  message.value = '点击牌选择底牌'
  startSelectionCountdown()
}

const startSelectionCountdown = () => {
  selectionCountdown.value = 5
  if (countdownInterval) clearInterval(countdownInterval)
  countdownInterval = setInterval(() => {
    selectionCountdown.value--
    if (selectionCountdown.value <= 0) confirmHoleCard()
  }, 1000)
}

const stopSelectionCountdown = () => { if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null } }

const handleCardClick = (idx: number) => {
  if (gameState.value !== 'choosing_hole_card' || !playerHiddenCard.value) return
  stopSelectionCountdown()
  if (idx === playerVisibleCards.value.length - 1) {
    const temp = playerHiddenCard.value; playerHiddenCard.value = playerVisibleCards.value[idx]; playerVisibleCards.value[idx] = temp
  }
}

const confirmHoleCard = () => {
  stopSelectionCountdown()
  opponents.value.forEach(ai => {
    if (ai.isFolded) return
    const newCard = ai.visibleCards[ai.visibleCards.length - 1]
    if (newCard.value > ai.hiddenCard!.value) {
      const temp = ai.hiddenCard!; ai.hiddenCard = newCard; ai.visibleCards[ai.visibleCards.length - 1] = temp
    }
  })
  if (currentRound.value === 1) {
    placeBet(-1, 10); opponents.value.forEach((_, i) => placeBet(i, 10))
  }
  determineFirstPlayer()
}

const placeBet = (idx: number, amt: number) => {
  const player = idx === -1 ? { chips: playerChips.value, currentBet: currentBet.value } : opponents.value[idx]
  if (player.chips <= 0 && amt > 0) return 
  const actual = idx === -1 ? Math.min(amt, playerChips.value) : Math.min(amt, opponents.value[idx].chips)
  if (idx === -1) { playerChips.value -= actual; currentBet.value += actual }
  else { opponents.value[idx].chips -= actual; opponents.value[idx].currentBet += actual }
  pot.value += actual
  const totalBet = idx === -1 ? currentBet.value : opponents.value[idx].currentBet
  if (totalBet > highestBet.value) {
    highestBet.value = totalBet
    playerHasActed.value = (idx === -1); opponents.value.forEach((ai, i) => { if (i !== idx) ai.hasActed = false })
  }
}

const determineFirstPlayer = () => {
  let scores = opponents.value.map((ai, i) => ({ idx: i, hand: evaluateHand(ai.visibleCards) }))
  if (!isPlayerFolded.value) scores.push({ idx: opponents.value.length, hand: evaluateHand(playerVisibleCards.value) })
  scores.sort((a, b) => compareHands(b.hand, a.hand))
  activePlayerIndex.value = scores[0].idx; nextTurn()
}

const nextTurn = () => {
  if (gameState.value === 'round_over' || gameState.value === 'not_started') return

  const activeCount = [!isPlayerFolded.value, ...opponents.value.map(ai => !ai.isFolded)].filter(v => v).length
  if (activeCount <= 1) { showdown(); return }
  
  const totalPlayers = opponents.value.length + 1
  if (activePlayerIndex.value >= totalPlayers) activePlayerIndex.value = 0

  const players = [...opponents.value.map(ai => ({ isFolded: ai.isFolded, currentBet: ai.currentBet, hasActed: ai.hasActed, chips: ai.chips })), 
                   { isFolded: isPlayerFolded.value, currentBet: currentBet.value, hasActed: playerHasActed.value, chips: playerChips.value }]
  
  const everyoneActed = players.every(p => p.isFolded || (p.hasActed && (p.currentBet === highestBet.value || p.chips === 0)) || (p.chips === 0 && p.currentBet <= highestBet.value))
  
  if (everyoneActed) {
    if (currentRound.value < 4) nextRound(); else showdown(); return
  }

  const currentPlayer = activePlayerIndex.value === opponents.value.length ? 
    { isFolded: isPlayerFolded.value, chips: playerChips.value } : 
    opponents.value[activePlayerIndex.value];

  if (!currentPlayer || currentPlayer.isFolded || (currentPlayer.chips === 0 && (activePlayerIndex.value !== opponents.value.length || playerHasActed.value))) {
    activePlayerIndex.value = (activePlayerIndex.value + 1) % totalPlayers
    nextTurn()
    return
  }

  if (activePlayerIndex.value === opponents.value.length) startPlayerTurn()
  else { gameState.value = 'ai_turn'; setTimeout(aiDecision, 1000) }
}

const startPlayerTurn = () => {
  if (isPlayerFolded.value || playerChips.value <= 0) {
    playerHasActed.value = true
    activePlayerIndex.value = (activePlayerIndex.value + 1) % (opponents.value.length + 1)
    nextTurn()
    return
  }
  gameState.value = 'player_turn'; message.value = '到你了'
  callAmount.value = highestBet.value - currentBet.value
  canCall.value = callAmount.value > 0 && playerChips.value >= callAmount.value
  canCheck.value = callAmount.value === 0; canAllIn.value = playerChips.value > 0
  minRaise.value = callAmount.value + 10; maxRaise.value = playerChips.value; raiseAmount.value = minRaise.value
}

const setAiMessage = (ai: any, msg: string) => {
  ai.message = msg; setTimeout(() => { if (ai.message === msg) ai.message = '' }, 2500)
}

const aiDecision = () => {
  if (gameState.value !== 'ai_turn') return
  const ai = opponents.value[activePlayerIndex.value]
  if (!ai) return

  const { score } = evaluateHandPotential([ai.hiddenCard!, ...ai.visibleCards])
  const toCall = highestBet.value - ai.currentBet
  let action: 'fold' | 'call' | 'raise' | 'check' = toCall > 0 ? 'call' : 'check'
  const aggroFactor = ai.personality === 'aggressive' ? 1.3 : (ai.personality === 'tight' ? 0.7 : 1.0)
  if (score > 0.4 / aggroFactor || Math.random() < (ai.personality === 'aggressive' ? 0.15 : 0.05)) action = 'raise'
  if (toCall > ai.chips * 0.4 && score < 0.15 * aggroFactor) action = 'fold'
  if (toCall === 0 && action === 'check' && Math.random() < (0.4 * aggroFactor)) action = 'raise'
  if (action === 'fold') { ai.isFolded = true; setAiMessage(ai, '弃牌') }
  else if (action === 'raise') { 
    const raiseAmt = Math.max(50, highestBet.value); const actualAdd = Math.min(ai.chips, toCall + raiseAmt)
    placeBet(activePlayerIndex.value, actualAdd); setAiMessage(ai, '加注') 
  }
  else if (toCall > 0) { placeBet(activePlayerIndex.value, toCall); setAiMessage(ai, '跟注') }
  else setAiMessage(ai, '过牌')
  ai.hasActed = true; activePlayerIndex.value = (activePlayerIndex.value + 1) % (opponents.value.length + 1); nextTurn()
}

const updatePlayerAction = () => { playerHasActed.value = true; activePlayerIndex.value = (activePlayerIndex.value + 1) % (opponents.value.length + 1); nextTurn() }
const check = () => updatePlayerAction()
const call = () => { placeBet(-1, callAmount.value); updatePlayerAction() }
const fold = () => { isPlayerFolded.value = true; showdown() }
const raise = () => { placeBet(-1, raiseAmount.value); showRaiseInput.value = false; updatePlayerAction() }
const openRaiseDialog = () => { showRaiseInput.value = true }
const allIn = () => { raiseAmount.value = playerChips.value; raise() }

const nextRound = () => {
  currentRound.value++; playerHasActed.value = false; opponents.value.forEach(ai => ai.hasActed = false)
  playerVisibleCards.value.push(deck.value!.deal())
  opponents.value.forEach(ai => { if (!ai.isFolded) ai.visibleCards.push(deck.value!.deal()) })
  enterSelectionPhase()
}

const showdown = () => {
  gameState.value = 'round_over'; roundCount.value++; showCardsRevealed.value = true
  const results = []
  if (!isPlayerFolded.value) results.push({ name: '你', hand: evaluateHand([playerHiddenCard.value!, ...playerVisibleCards.value]), cards: [playerHiddenCard.value!, ...playerVisibleCards.value], type: 'player' })
  opponents.value.forEach(ai => { if (!ai.isFolded) results.push({ name: ai.name, hand: evaluateHand([ai.hiddenCard!, ...ai.visibleCards]), cards: [ai.hiddenCard!, ...ai.visibleCards], type: 'ai' }) })
  
  if (results.length === 0) { resetGame(); return }
  results.sort((a, b) => compareHands(b.hand, a.hand)); const winner = results[0]
  showdownResults.value = results.map(r => ({ name: r.name, handType: r.hand.name, cards: r.cards, isWinner: r.name === winner.name }))
  lastPot.value = pot.value
  
  if (winner.type === 'player') { playerChips.value += pot.value; playerWins.value++; resultTitle.value = '胜利!'; resultClass.value = 'win' }
  else {
    const aiIdx = opponents.value.findIndex(ai => ai.name === winner.name); if (aiIdx !== -1) opponents.value[aiIdx].chips += pot.value
    aiWins.value++; resultTitle.value = '落败'; resultClass.value = 'loss'
  }
  // Check Game Over
  if (playerChips.value < 10) { resultTitle.value = '筹码耗尽！'; resultClass.value = 'game_over' }
  setTimeout(() => { showResult.value = true }, 1000)
}

const closeResultDialog = () => { showResult.value = false; newRound() }
const resetGame = () => { stopSelectionCountdown(); gameState.value = 'not_started'; showResult.value = false; showdownResults.value = [] }
onUnmounted(() => stopSelectionCountdown())
</script>

<style scoped>
.showhand-view { background: #f1f5f9; height: 100vh; width: 100vw; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; overflow: hidden; }
.game-wrapper { flex: 1; display: flex; flex-direction: column; height: 100%; }

/* Optimized Header Style */
.app-header { background: #fff; padding: 0 20px; height: 64px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; z-index: 100; box-shadow: 0 2px 10px rgba(0,0,0,0.02); flex-shrink: 0; }
.header-content { width: 100%; max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }

.header-left { display: flex; align-items: center; gap: 15px; }
.menu-trigger-btn { background: #f8fafc; border: 1.5px solid #e2e8f0; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #1e293b; transition: all 0.2s; }
.menu-trigger-btn:hover { background: #fff; border-color: #3b82f6; color: #3b82f6; }

.brand-box { display: flex; flex-direction: column; line-height: 1.1; }
.brand-title { font-size: 1.1rem; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
.brand-sub { font-size: 0.55rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

.header-center { flex: 1; display: flex; justify-content: center; }
.header-right { display: flex; align-items: center; gap: 15px; }
.round-indicator-modern { font-size: 0.85rem; font-weight: 900; color: #64748b; }
.round-indicator-modern .v { color: #3b82f6; font-size: 1.2rem; margin-left: 2px; }
.header-reset-btn { background: #fff; border: 1.5px solid #e2e8f0; width: 38px; height: 38px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #64748b; transition: all 0.2s; }
.header-reset-btn:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

/* Table Felt */
.poker-table-container { flex: 1; padding: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.poker-table { width: 100%; max-width: 1100px; height: 100%; max-height: 75vh; background: #15803d; border: 12px solid #475569; border-radius: 60px; position: relative; box-shadow: inset 0 0 120px rgba(0,0,0,0.6); }
.table-felt { height: 100%; padding: 25px; display: flex; flex-direction: column; justify-content: space-between; position: relative; }

/* AI Seating - Adjusted for larger elements */
.opponents-zone { position: relative; flex: 0 0 220px; width: 100%; }
.ai-node { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.4s; width: 160px; } 
.pos-1-0 { top: 15px; left: 50%; transform: translateX(-50%); }
.pos-2-0 { top: 5%; left: 20%; transform: translateX(-50%); }
.pos-2-1 { top: 5%; left: 80%; transform: translateX(-50%); }
.pos-3-0 { top: 5%; left: 15%; transform: translateX(-50%); }
.pos-3-1 { top: 15px; left: 50%; transform: translateX(-50%); }
.pos-3-2 { top: 5%; left: 85%; transform: translateX(-50%); }

.ai-profile-box { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
.avatar-box { width: 60px; height: 60px; border-radius: 16px; background: #1e293b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: 0 6px 15px rgba(0,0,0,0.4); position: relative; }
.active .avatar-box { outline: 5px solid #facc15; box-shadow: 0 0 35px #facc15; z-index: 2; }
.folded { opacity: 0.4; filter: grayscale(1); }

.ai-info-pill { background: rgba(255,255,255,0.98); padding: 4px 14px; border-radius: 20px; display: flex; gap: 8px; font-size: 0.8rem; font-weight: 800; box-shadow: 0 2px 8px rgba(0,0,0,0.15); white-space: nowrap; max-width: 150px; justify-content: center; border: 1px solid #e2e8f0; }
.ai-info-pill .chips { color: #f59e0b; }

.cards-area { display: flex; justify-content: center; position: relative; }
.cards-area.stacked .card-slot + .card-slot { margin-left: -30px; }
.cards-area.stacked.mini .card-slot + .card-slot { margin-left: -20px; }
.cards-area .card-slot { flex-shrink: 0; position: relative; }

.card { width: 76px; height: 106px; background: #fff; border-radius: 10px; position: relative; transform-style: preserve-3d; transition: transform 0.6s; box-shadow: 3px 5px 15px rgba(0,0,0,0.3); border: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; }
.card.mini { width: 52px; height: 72px; }
.card-front { position: absolute; inset: 0; background: #fff; border-radius: 10px; backface-visibility: hidden; transform: rotateY(180deg); display: flex; flex-direction: column; align-items: flex-start; padding: 6px 8px; box-sizing: border-box; }
.card.mini .card-front { padding: 4px 6px; }

/* Card Components */
.card-num { display: flex; flex-direction: column; align-items: flex-start; line-height: 0.9; }
.card-num span:first-child { font-weight: 900; font-size: 1.5rem; letter-spacing: -1px; }
.card.mini .card-num span:first-child { font-size: 1.1rem; }
.suit-mini { font-size: 1.1rem; margin-top: 2px; }
.card.mini .suit-mini { font-size: 0.8rem; }

.card-pattern { position: absolute; inset: 0; background: #3b82f6; border: 3px solid #fff; border-radius: 10px; background-image: radial-gradient(circle, #fff 1.5px, transparent 1.5px); background-size: 7px 7px; }
.is-flipped { transform: rotateY(180deg); }
.card-red { color: #ef4444; } .card-black { color: #1e293b; }

/* Hole Card Sash Style Update */
.hole-card-sash.bottom-left { 
  position: absolute; bottom: 0; left: 0; width: 32px; height: 32px; 
  overflow: hidden; z-index: 10; border-radius: 0 0 0 10px;
}
.hole-card-sash.bottom-left span { 
  position: absolute; bottom: 6px; left: -15px; width: 55px; 
  background: linear-gradient(to right, #facc15, #fbbf24); 
  color: #000; font-size: 0.65rem; font-weight: 900; 
  transform: rotate(45deg); text-align: center; border: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.bet-chip-pill { background: #fff; color: #ef4444; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 900; box-shadow: 0 2px 6px rgba(0,0,0,0.2); margin-top: -4px; }

/* Center Zone - Fills middle space and centers content vertically */
.center-zone { 
  flex: 1; display: flex; flex-direction: column; align-items: center; 
  justify-content: center; gap: 12px; z-index: 60; margin-top: 125px;
}
.pot-display-modern { background: rgba(0,0,0,0.85); padding: 12px 45px; border-radius: 50px; border: 4px solid #facc15; color: #facc15; text-align: center; box-shadow: 0 12px 35px rgba(0,0,0,0.4); }
.pot-display-modern .label { font-size: 0.65rem; font-weight: 900; letter-spacing: 3px; }
.pot-display-modern .val { font-size: 2.4rem; font-weight: 900; display: flex; align-items: center; gap: 10px; }
.round-tag { font-size: 0.85rem; color: #fff; font-weight: 900; background: rgba(255,255,255,0.15); padding: 4px 18px; border-radius: 14px; }
.status-hint { font-size: 1.1rem; font-weight: 800; color: #fff; height: 30px; text-shadow: 0 2px 6px rgba(0,0,0,0.6); }

/* Selection UI (Integrated into bottom bar) */
.selection-phase-ui-v2 { 
  display: flex; align-items: center; justify-content: space-between; 
  width: 100%; max-width: 500px; background: #f0f9ff; 
  padding: 8px 15px; border-radius: 16px; border: 2px solid #3b82f6; 
}
.hint-stack { display: flex; flex-direction: column; text-align: left; line-height: 1.2; }
.hint-stack .l1 { color: #3b82f6; font-size: 0.75rem; font-weight: 900; }
.hint-stack .l2 { color: #1e40af; font-size: 0.9rem; font-weight: 800; }
.confirm-selection-btn { 
  background: #22c55e; color: #fff; border: none; padding: 10px 24px; 
  border-radius: 12px; font-weight: 900; font-size: 1rem; cursor: pointer; 
  box-shadow: 0 4px 0 #16a34a; transition: all 0.1s; 
}
.confirm-selection-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #16a34a; }
.v2-timer { font-size: 0.85rem; opacity: 0.9; margin-left: 4px; }

@media (max-width: 600px) {
  .poker-table { border-radius: 40px; }
  .opponents-zone { flex: 0 0 110px; }
  .center-zone { margin-top: 135px; gap: 3px; } /* Increased margin to 135px and tighter gaps */
  .pot-display-modern { padding: 3px 15px; border-width: 2px; }
  .pot-display-modern .label { font-size: 0.45rem; letter-spacing: 1px; }
  .pot-display-modern .val { font-size: 1rem; gap: 4px; }
  .round-tag { font-size: 0.6rem; padding: 1px 8px; }
  .status-hint { font-size: 0.7rem; height: 16px; }
  .ai-node { width: 120px; }
  .pos-3-0 { top: 10%; } .pos-3-2 { top: 10%; }
  .selection-phase-ui-v2 { scale: 0.8; padding: 6px 8px; }
  .confirm-selection-btn { padding: 8px 12px; font-size: 0.8rem; }
}
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

/* Player Zone */
.player-zone { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.player-hand-row { min-height: 80px; }
.card-slot.selectable { cursor: pointer; transition: transform 0.3s ease; }
.selection-glow { 
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4), 0 0 10px rgba(59, 130, 246, 0.2);
  transform: translateY(25px) scale(1.05);
  z-index: 50;
  border: 2px solid #3b82f6 !important;
}

.user-seat-modern { display: flex; align-items: center; gap: 12px; }
.user-info-card { background: #fff; padding: 6px 16px; border-radius: 14px; min-width: 150px; box-shadow: 0 4px 15px rgba(0,0,0,0.25); }
.user-info-card .row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
.user-info-card .label { font-size: 0.6rem; color: #94a3b8; font-weight: 800; }
.chips-val { font-size: 1.4rem; font-weight: 900; color: #f59e0b; }
.bet-tag { background: #ef4444; color: #fff; padding: 2px 6px; border-radius: 6px; font-size: 0.6rem; font-weight: 900; }

/* Control Bar */
.bottom-controls { background: #fff; padding: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; min-height: 90px; flex-shrink: 0; }

.btn-group { display: flex; gap: 10px; width: 100%; max-width: 540px; }
.game-btn { flex: 1; border: none; border-radius: 12px; padding: 12px 0; font-weight: 900; font-size: 0.85rem; color: #fff; cursor: pointer; box-shadow: 0 4.5px 0 rgba(0,0,0,0.1); transition: all 0.2s; }
.game-btn:active { transform: translateY(3px); box-shadow: none; }
.gray { background: #64748b; } .blue { background: #0ea5e9; } .green { background: #22c55e; } .orange { background: #f59e0b; } .red { background: #ef4444; }

.bubble.ai { position: absolute; top: -45px; left: 50%; transform: translateX(-50%); background: #fff; padding: 4px 14px; border-radius: 14px; font-size: 0.75rem; font-weight: 900; color: #1e293b; box-shadow: 0 5px 15px rgba(0,0,0,0.2); white-space: nowrap; z-index: 100; }
.bubble.ai::after { color: #fff; }

/* Transitions for AI Messages */
.bubble-fade-enter-active, .bubble-fade-leave-active { transition: all 0.3s ease; }
.bubble-fade-enter-from, .bubble-fade-leave-to { opacity: 0; transform: translate(-50%, 10px); }

/* Setup Dialog Polish */
.setup-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.95); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 12px; border-radius: 38px; }
.setup-card { background: #fff; padding: 30px; border-radius: 32px; box-shadow: 0 25px 50px rgba(0,0,0,0.12); text-align: center; width: 100%; max-width: 320px; }
.hero-icon { font-size: 3rem; color: #f59e0b; margin-bottom: 12px; }
.setup-form .form-row { display: flex; flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 20px; }
.setup-form .label { font-size: 0.9rem; font-weight: 800; color: #64748b; text-align: left; }
.start-btn-modern { width: 100%; height: 56px; background: linear-gradient(135deg, #0ea5e9, #2563eb); border: none; border-radius: 16px; color: #fff; font-size: 1.15rem; font-weight: 900; cursor: pointer; margin-top: 20px; box-shadow: 0 8px 20px rgba(37,99,235,0.3); }

/* Premium Dialog V2 Styles */
:deep(.poker-dialog-v2) { border-radius: 24px !important; overflow: hidden; border: none; }
:deep(.poker-dialog-v2 .el-dialog__header) { background: #f8fafc; margin: 0; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
:deep(.poker-dialog-v2 .el-dialog__title) { font-weight: 900; color: #1e293b; font-size: 1.1rem; }
:deep(.poker-dialog-v2 .el-dialog__body) { padding: 20px; }
:deep(.poker-dialog-v2 .el-dialog__footer) { padding: 0 20px 20px; }

.val-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.val-header .l { color: #64748b; font-weight: 800; font-size: 0.9rem; }
.val-header .v { font-size: 2.2rem; color: #f59e0b; font-weight: 900; }

.quick-bet-grid { display: flex; gap: 10px; margin-top: 30px; }
.quick-bet-grid button { flex: 1; height: 40px; background: #f1f5f9; border: 1.5px solid #e2e8f0; border-radius: 10px; font-weight: 800; font-size: 0.8rem; cursor: pointer; color: #475569; }
.dialog-action-btn { width: 100%; height: 50px; font-weight: 900 !important; font-size: 1rem !important; }

/* Result V2 */
.result-wrap-v2 { text-align: center; }
.res-head { margin-bottom: 20px; }
.res-icon { font-size: 3.5rem; margin-bottom: 10px; }
.win .res-icon { color: #facc15; } .loss .res-icon { color: #94a3b8; } .game_over .res-icon { color: #ef4444; }
.res-head h2 { font-size: 1.8rem; font-weight: 900; margin: 0; color: #1e293b; }

.showdown-list { background: #f8fafc; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; border: 1.5px solid #e2e8f0; }
.showdown-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; }
.showdown-item.is-winner { border: 2px solid #facc15; background: #fffbeb; }
.p-info { text-align: left; }
.p-name { display: block; font-weight: 900; font-size: 0.85rem; color: #1e293b; }
.p-type { font-size: 0.7rem; color: #64748b; font-weight: 800; }
.p-hand { display: flex; gap: 3px; }
.p-hand span { font-size: 0.8rem; font-weight: 800; width: 22px; height: 32px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.res-footer { font-size: 1rem; color: #475569; border-top: 1.5px solid #e2e8f0; padding-top: 15px; }
.res-footer strong { color: #f59e0b; font-size: 1.5rem; }

@media (max-width: 480px) {
  .app-header { padding: 0 12px; height: 56px; }
  .brand-title { font-size: 1rem; }
  .round-indicator-modern .v { font-size: 1.1rem; }
  .poker-table { border-radius: 50px; }
  .ai-hand-row { gap: 0 !important; }
  .card { width: 44px; height: 62px; }
  .card.mini { width: 30px; height: 42px; }
  .user-info-card { min-width: 130px; }
  .game-btn { font-size: 0.75rem; }
  .mobile-hide { display: none; }
}
</style>
