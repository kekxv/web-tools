<template>
  <div class="mahjong-view">
    <!-- 麻将桌 -->
    <div class="table-container">
      <div class="mahjong-table">

        <!-- 开始界面 -->
        <div v-if="gameState === 'not_started'" class="setup-overlay">
          <div class="setup-card">
            <el-icon class="hero-icon"><Van /></el-icon>
            <h3>准备开局</h3>
            <div class="setup-form">
              <div class="form-row">
                <span class="label">初始分数</span>
                <el-input-number v-model="initialScore" :min="1000" :max="10000" :step="500" controls-position="right" />
              </div>
              <div class="form-row">
                <span class="label">AI 难度</span>
                <el-radio-group v-model="aiDifficulty" size="small">
                  <el-radio-button value="easy">简单</el-radio-button>
                  <el-radio-button value="normal">普通</el-radio-button>
                  <el-radio-button value="hard">困难</el-radio-button>
                </el-radio-group>
              </div>
              <div class="form-row">
                <span class="label">庄家</span>
                <el-radio-group v-model="isDealer" size="small">
                  <el-radio :value="true">我坐庄</el-radio>
                  <el-radio :value="false">AI 坐庄</el-radio>
                </el-radio-group>
              </div>
            </div>
            <button @click="startGame" class="start-btn">开始游戏</button>
          </div>
        </div>

        <!-- 游戏区域 -->
        <div v-else class="game-area">

          <!-- 风位和局数 -->
          <div class="info-bar">
            <div class="wind-round">
              <span class="wind">{{ currentWind }}风</span>
              <span class="round">{{ roundCount }}局</span>
            </div>
            <button @click="resetGame" class="reset-btn" title="重新开始">
              <el-icon><RefreshRight /></el-icon>
            </button>
          </div>

          <!-- 上方 AI（对家） -->
          <div class="ai-zone top-zone" :class="{ 'active': currentPlayer === 2 }">
            <div class="player-info-box">
              <div class="avatar">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="info">
                <span class="name">对家</span>
                <span class="score">{{ players[2]?.score }}</span>
              </div>
            </div>
            <!-- 手牌（只显示一张） -->
            <div class="hand-tiles horizontal single-tile">
              <div class="tile-back h-tile"></div>
              <span class="hand-count-label">{{ getHandCount(2) }}牌</span>
            </div>
            <!-- 副露 -->
            <div class="exposed-zone">
              <div v-for="(set, idx) in players[2]?.exposedSets" :key="idx" class="exposed-set">
                <!-- 大屏：显示所有牌 -->
                <div class="exposed-tiles-full">
                  <MahjongTile v-for="(tile, i) in set.tiles" :key="i" :tile="tile" size="small" />
                </div>
                <!-- 小屏：只显示一张牌 + 标签 -->
                <div class="exposed-tile-simple">
                  <MahjongTile :tile="set.tiles[0]" size="mini" />
                  <span class="exposed-label">{{ set.type }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 左侧 AI（上家） -->
          <div class="ai-zone left-zone" :class="{ 'active': currentPlayer === 1 }">
            <div class="player-info-box vertical">
              <div class="avatar">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="info">
                <span class="name">上家</span>
                <span class="score">{{ players[1]?.score }}</span>
              </div>
            </div>
            <!-- 手牌（只显示一张） -->
            <div class="hand-tiles vertical single-tile">
              <div class="tile-back v-tile"></div>
              <span class="hand-count-label">{{ getHandCount(1) }}牌</span>
            </div>
            <!-- 副露 -->
            <div class="exposed-zone vertical">
              <div v-for="(set, idx) in players[1]?.exposedSets" :key="idx" class="exposed-set">
                <!-- 大屏：显示所有牌 -->
                <div class="exposed-tiles-full">
                  <MahjongTile v-for="(tile, i) in set.tiles" :key="i" :tile="tile" size="mini" />
                </div>
                <!-- 小屏：只显示一张牌 + 标签 -->
                <div class="exposed-tile-simple">
                  <MahjongTile :tile="set.tiles[0]" size="mini" />
                  <span class="exposed-label">{{ set.type }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧 AI（下家） -->
          <div class="ai-zone right-zone" :class="{ 'active': currentPlayer === 3 }">
            <div class="player-info-box vertical">
              <div class="avatar">
                <el-icon><Monitor /></el-icon>
              </div>
              <div class="info">
                <span class="name">下家</span>
                <span class="score">{{ players[3]?.score }}</span>
              </div>
            </div>
            <!-- 手牌（只显示一张） -->
            <div class="hand-tiles vertical single-tile">
              <div class="tile-back v-tile"></div>
              <span class="hand-count-label">{{ getHandCount(3) }}牌</span>
            </div>
            <!-- 副露 -->
            <div class="exposed-zone vertical">
              <div v-for="(set, idx) in players[3]?.exposedSets" :key="idx" class="exposed-set">
                <!-- 大屏：显示所有牌 -->
                <div class="exposed-tiles-full">
                  <MahjongTile v-for="(tile, i) in set.tiles" :key="i" :tile="tile" size="mini" />
                </div>
                <!-- 小屏：只显示一张牌 + 标签 -->
                <div class="exposed-tile-simple">
                  <MahjongTile :tile="set.tiles[0]" size="mini" />
                  <span class="exposed-label">{{ set.type }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 中央区域 -->
          <div class="center-zone">
            <!-- 剩余牌数 -->
            <div class="remaining-tiles">
              <span class="label">剩余牌</span>
              <span class="count">{{ remainingTiles }}</span>
              <button class="view-discards-btn" @click="showAllDiscards = true" title="查看已出牌">
                🀄
              </button>
            </div>

            <!-- 牌墙（示意） -->
            <div class="wall-preview">
              <div class="wall-row" v-for="row in 2" :key="row">
                <div v-for="i in 9" :key="i" class="wall-block"></div>
              </div>
            </div>

            <!-- 弃牌区 -->
            <div class="discard-zone">
              <div class="discard-grid">
                <MahjongTile v-for="(tile, idx) in visibleDiscards" :key="idx"
                             :tile="tile"
                             size="small"
                             :class="{ 'last': idx === visibleDiscards.length - 1 }" />
              </div>
            </div>
          </div>

          <!-- 玩家区域（底部） -->
          <div class="player-zone" :class="{ 'active': currentPlayer === 0 }">
            <!-- 副露 -->
            <div class="exposed-zone player-exposed">
              <div v-for="(set, idx) in players[0]?.exposedSets" :key="idx" class="exposed-set">
                <!-- 大屏：显示所有牌 -->
                <div class="exposed-tiles-full">
                  <MahjongTile v-for="(tile, i) in set.tiles" :key="i" :tile="tile" size="small" />
                </div>
                <!-- 小屏：只显示一张牌 + 标签 -->
                <div class="exposed-tile-simple">
                  <MahjongTile :tile="set.tiles[0]" size="mini" />
                  <span class="exposed-label">{{ set.type }}</span>
                </div>
              </div>
            </div>

            <!-- 手牌区 -->
            <div class="hand-zone">
              <!-- 手牌 -->
              <div class="hand-cards">
                <!-- 摸到的牌 -->
                <MahjongTile v-if="drawnTile" 
                            :tile="drawnTile" 
                            is-drawn 
                            @click="handleDrawnTileClick" />

                <MahjongTile v-for="(tile, idx) in playerHand" :key="idx"
                            :tile="tile"
                            :selected="selectedDiscard === idx"
                            @click="handleTileClick(idx)" />
              </div>
            </div>

            <!-- 玩家信息 -->
            <div class="player-info-box">
              <div class="avatar user">
                <el-icon><User /></el-icon>
              </div>
              <div class="info">
                <div class="top">
                  <span class="name">你</span>
                  <span v-if="isDealer" class="dealer-badge">庄</span>
                </div>
                <span class="score">{{ players[0]?.score || initialScore }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div v-if="gameState !== 'not_started'" class="action-bar">
      <!-- AI 思考中 -->
      <div v-if="gameState === 'ai_thinking'" class="thinking">
        <div class="spinner"></div>
        <span>{{ currentAiName }} 思考中...</span>
      </div>

      <!-- 玩家操作 -->
      <div v-else-if="gameState === 'player_turn' || gameState === 'player_action'" class="actions">
        <button v-if="canRon" @click="doRon" class="btn btn-win">
          <span class="icon">🀄</span> 胡
        </button>
        <button v-if="canZimo" @click="doZimo" class="btn btn-win">
          <span class="icon">🀄</span> 自摸
        </button>
        <button v-if="canPeng" @click="doPeng" class="btn btn-pon">
          碰
        </button>
        <button v-if="canGang" @click="doGang" class="btn btn-gang">
          杠
        </button>
        <button v-if="canChi" @click="doChi" class="btn btn-chi">
          吃
        </button>
        <button v-if="canDiscard" @click="confirmDiscard" class="btn btn-discard">
          出牌
        </button>
        <button v-if="showPassOption" @click="passAction" class="btn btn-pass">
          过
        </button>
      </div>

      <!-- 回合结束 -->
      <div v-else-if="gameState === 'round_over'" class="round-actions">
        <el-button type="primary" @click="nextRound" round size="large">下一局</el-button>
        <el-button @click="resetGame" round size="large" plain>重新开始</el-button>
      </div>
    </div>

    <!-- 吃牌选择对话框 -->
    <el-dialog v-model="showChiDialog" title="选择吃牌方式" width="360px" class="chi-dialog">
      <div class="chi-options">
        <button v-for="(opt, idx) in chiOptions" :key="idx" @click="selectChi(idx)" class="chi-btn">
          {{ opt.pattern }}
        </button>
      </div>
    </el-dialog>

    <!-- 结果对话框 -->
    <el-dialog v-model="showResultDialog" :show-close="false" width="90%" class="modern-result-dialog">
      <div class="result-card" :class="resultClass">
        <div class="result-header">
          <div class="result-status-icon">
            <el-icon v-if="resultClass === 'win'"><Trophy /></el-icon>
            <el-icon v-else-if="resultClass === 'loss'"><CircleClose /></el-icon>
            <el-icon v-else><WarningFilled /></el-icon>
          </div>
          <h2 class="result-title">{{ resultTitle }}</h2>
        </div>

        <div class="result-body">
          <div class="result-item">
            <span class="label">和牌者</span>
            <span class="value">{{ winnerName }}</span>
          </div>
          <div class="result-item">
            <span class="label">牌型</span>
            <span class="value highlight">{{ agariType }}</span>
          </div>
          <div class="result-divider"></div>
          <div class="result-stats">
            <div class="stat-box">
              <span class="stat-label">番数</span>
              <span class="stat-value fan">{{ fanCount }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">得分</span>
              <span class="stat-value score">{{ scoreChange }}</span>
            </div>
          </div>
        </div>

        <div class="result-footer">
          <el-button v-if="!isGameOver" type="primary" @click="closeResultDialog" round size="large" class="action-btn">
            继续下一局
          </el-button>
          <el-button v-else type="danger" @click="resetGame" round size="large" class="action-btn">
            重新开始游戏
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 查看已出牌 -->
    <el-dialog v-model="showAllDiscards" title="本局弃牌记录" :close-on-click-modal="true" width="95%" class="modern-discards-dialog">
      <div class="discards-container">
        <div class="discards-scroll-area">
          <div class="discards-grid-modern">
            <MahjongTile v-for="(tile, idx) in discardPool" :key="idx"
                        :tile="tile"
                        size="small" />
          </div>
        </div>
        <div class="discards-footer">
          <div class="summary-badge">已出 {{ discardPool.length }} 张牌</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import {
  RefreshRight, Van, Monitor, User, Trophy, CircleClose, WarningFilled
} from '@element-plus/icons-vue'
import MahjongTile from '../components/Mahjong/MahjongTile.vue'
import {
  MahjongDeck, TILE_TYPE, TILE_VALUE,
  checkAgari, canChii, canPon, canDaiminkan, canRon as checkCanRon, canKakan, canAnkan,
  sortHand
} from '../utils/mahjong'
import { AIPlayer, AI_CONFIG } from '../utils/mahjong-ai'

// 游戏状态
const gameState = ref('not_started')
const initialScore = ref(2000)
const aiDifficulty = ref('normal')

// AI 执行锁，防止多个 AI 同时执行
let isAiProcessing = false
const isDealer = ref(true)
const roundCount = ref(0)
const currentWind = ref('东')

// 牌堆
const deck = ref(null)
const remainingTiles = ref(0)

// 玩家数据
const players = ref([])
const playerHand = ref([])
const drawnTile = ref(null)
const discardPool = ref([])

// 当前行动
const currentPlayer = ref(0)
const lastDiscard = ref(null)
const lastDiscardFrom = ref(-1)

// 操作状态
const canDiscard = ref(false)
const canRon = ref(false)
const canZimo = ref(false)
const canPeng = ref(false)
const canGang = ref(false)
const canChi = ref(false)
const canSelectDiscard = ref(false)
const selectedDiscard = ref(-1)
const showPassOption = ref(false)

// 吃牌
const showChiDialog = ref(false)
const chiOptions = ref([])

// 结果
const showResultDialog = ref(false)
const resultTitle = ref('')
const resultClass = ref('')
const winnerName = ref('')
const agariType = ref('')
const fanCount = ref(0)
const scoreChange = ref('')
const isGameOver = ref(false)

// 查看已出牌
const showAllDiscards = ref(false)

// 消息
const message = ref('')
const messageType = ref('info')

const aiConfig = {
  easy: { THINK_TIME: 1500, CHII_PROBABILITY: 0.4, PON_PROBABILITY: 0.6, AGGRESSIVE: 0.3 },
  normal: { THINK_TIME: 1000, CHII_PROBABILITY: 0.6, PON_PROBABILITY: 0.8, AGGRESSIVE: 0.5 },
  hard: { THINK_TIME: 800, CHII_PROBABILITY: 0.7, PON_PROBABILITY: 0.9, AGGRESSIVE: 0.7 }
}

const currentAiName = computed(() => {
  const names = ['AI 上家', 'AI 对家', 'AI 下家']
  return names[currentPlayer.value - 1] || ''
})

const visibleDiscards = computed(() => {
  // 只显示最新的一些弃牌，避免溢出
  return discardPool.value.slice(-18)
})

const isYaojiu = (tile) => {
  if (!tile) return false
  return tile.index === 1 || tile.index === 9 || tile.type === TILE_TYPE.JIHAI
}

const getHandCount = (playerId) => {
  if (players.value[playerId]?.isFolded) return 0
  return players.value[playerId]?.hand?.length || 13
}

// 开始游戏
const startGame = () => {
  players.value = [
    { id: 0, name: '你', score: initialScore.value, hand: [], exposedSets: [], isFolded: false, isDealer: isDealer.value },
    new AIPlayer(1, '上家', aiConfig[aiDifficulty.value]),
    new AIPlayer(2, '对家', aiConfig[aiDifficulty.value]),
    new AIPlayer(3, '下家', aiConfig[aiDifficulty.value])
  ]

  roundCount.value = 1
  currentWind.value = '东'
  newRound()
}

// 新的一局
const newRound = () => {
  deck.value = new MahjongDeck()
  remainingTiles.value = deck.value.remaining()
  discardPool.value = []
  drawnTile.value = null
  lastDiscard.value = null
  showResultDialog.value = false
  
  // 重置操作状态
  canRon.value = false
  canZimo.value = false
  canPeng.value = false
  canGang.value = false
  canChi.value = false
  canDiscard.value = false
  canSelectDiscard.value = false
  selectedDiscard.value = -1
  showPassOption.value = false

  players.value.forEach(p => {
    p.hand = []
    p.exposedSets = []
    p.isFolded = false
  })

  // 配牌 - 每人 13 张
  for (let i = 0; i < 13; i++) {
    for (const player of players.value) {
      player.hand.push(deck.value.draw())
    }
  }

  // 庄家摸第 14 张牌
  const dealerIdx = isDealer.value ? 0 : 1
  const dealerTile = deck.value.draw()

  playerHand.value = sortHand(players.value[0].hand)
  remainingTiles.value = deck.value.remaining()

  if (isDealer.value) {
    // 玩家是庄家，第 14 张牌作为摸到的牌（不加入手牌）
    drawnTile.value = dealerTile
    gameState.value = 'player_turn'
    canDiscard.value = true
    canSelectDiscard.value = true
    message.value = '你坐庄，请出牌'
  } else {
    // AI 是庄家，庄家先打牌
    players.value[dealerIdx].hand.push(dealerTile)
    currentPlayer.value = dealerIdx
    aiTurn()
  }
}

// AI 回合
const aiTurn = async () => {
  // 防止多个 AI 同时执行
  if (isAiProcessing) {
    console.log(`[AI 等待] 玩家${currentPlayer.value} 等待其他 AI 执行，100ms 后重试`)
    setTimeout(() => aiTurn(), 100)
    return
  }
  isAiProcessing = true
  console.log(`[AI 锁获取] 玩家${currentPlayer.value} 获取锁`)

  gameState.value = 'ai_thinking'
  const ai = players.value[currentPlayer.value]

  // 计算正常手牌数量
  // 麻将规则：13 张手牌，摸牌后 14 张，打牌后回 13 张
  // 吃/碰：移除 2 张 + 别人 1 张组成副露，然后打 1 张 → 手牌 = 13 - 3 = 10 张（待摸）
  // 杠：移除 3 张 + 别人 1 张组成副露，然后摸 1 张打 1 张 → 手牌 = 13 - 3 = 10 张（待摸）
  const chiPonCount = ai.exposedSets.length
  const expectedHandSize = 13 - chiPonCount * 3

  console.log(`[AI 回合] 玩家${currentPlayer.value} (${ai.name}), 手牌数：${ai.hand.length}, 预期：${expectedHandSize}, 副露：${JSON.stringify(ai.exposedSets.map(s => ({ type: s.type, tiles: s.tiles.length })))}`)

  // 手牌数量应该是 expectedHandSize（待摸牌）或 expectedHandSize + 1（已摸牌）
  if (ai.hand.length < expectedHandSize) {
    console.error('AI 手牌数量不足:', ai.hand.length, 'expected:', expectedHandSize, 'exposedSets:', ai.exposedSets)
    handleExhaustedDraw()
    return
  }

  await nextTick()

  // 如果 AI 手牌是 expectedHandSize 张，先摸牌
  if (ai.hand.length === expectedHandSize) {
    const drawnTile = deck.value.draw()
    if (!drawnTile) {
      console.log(`[AI 流局] 玩家${currentPlayer.value} 摸不到牌，流局`)
      handleExhaustedDraw()
      return
    }
    ai.addTile(drawnTile)
    remainingTiles.value = deck.value.remaining()
    console.log(`[AI 摸牌] 玩家${currentPlayer.value} 摸到 ${drawnTile.display}`)

  // 稍微延迟，模拟思考
    setTimeout(async () => {
      console.log(`[AI 思考] 玩家${currentPlayer.value} 开始思考`)
      try {
        // 直接传入完整手牌（14 张），让 AI 基于实际手牌做决策
        const decision = await ai.think('draw', drawnTile, ai.hand)
        console.log(`[AI 决策] 玩家${currentPlayer.value} 决策：${JSON.stringify(decision)}`)

        if (decision.tsumo) {
          console.log(`[AI 自摸] 玩家${currentPlayer.value} 自摸`)
          endRound(ai.id, { type: '自摸', fan: 1, isZimo: true }, true)
          return
        }

        let discardIdx = decision.index !== undefined ? decision.index : (decision.discardIndex !== undefined ? decision.discardIndex : -1)

        // 边界检查：确保索引在有效范围内
        if (discardIdx < 0 || discardIdx >= ai.hand.length) {
          console.warn(`[AI 警告] 玩家${currentPlayer.value} 决策索引无效：${discardIdx}, 手牌数：${ai.hand.length}, 重新决策`)
          // 重新调用 AI 决策，传入实际手牌
          const retryDecision = await ai.think('discard', null, ai.hand)
          discardIdx = retryDecision.index !== undefined ? retryDecision.index : (retryDecision.discardIndex !== undefined ? retryDecision.discardIndex : 0)
          // 如果还是无效，使用默认索引 0
          if (discardIdx < 0 || discardIdx >= ai.hand.length) {
            discardIdx = 0
          }
        }

        if (discardIdx >= 0 && discardIdx < ai.hand.length) {
          const discarded = ai.discardTile(discardIdx)
          if (discarded) {
            console.log(`[AI 打牌] 玩家${currentPlayer.value} 打出 ${discarded.display}`)
            discardPool.value.push(discarded)
            lastDiscard.value = discarded
            lastDiscardFrom.value = ai.id
            console.log(`[AI 完成] 玩家${currentPlayer.value} 完成，调用 checkNextAction`)
            checkNextAction(ai.id)
          } else {
            console.error(`[AI 错误] 玩家${currentPlayer.value} 打牌失败，尝试随机打牌`)
            // 尝试随机打一张牌
            const randomIdx = Math.floor(Math.random() * ai.hand.length)
            const randomDiscarded = ai.discardTile(randomIdx)
            if (randomDiscarded) {
              discardPool.value.push(randomDiscarded)
              lastDiscard.value = randomDiscarded
              lastDiscardFrom.value = ai.id
              checkNextAction(ai.id)
            } else {
              console.error(`[AI 致命] 玩家${currentPlayer.value} 手牌为空，强制流局`)
              handleExhaustedDraw()
            }
          }
        } else {
          console.error(`[AI 错误] 玩家${currentPlayer.value} 决策索引无效：${discardIdx}, 手牌数：${ai.hand.length}`)
          // 尝试随机打一张牌
          if (ai.hand.length > 0) {
            const randomIdx = Math.floor(Math.random() * ai.hand.length)
            const randomDiscarded = ai.discardTile(randomIdx)
            if (randomDiscarded) {
              discardPool.value.push(randomDiscarded)
              lastDiscard.value = randomDiscarded
              lastDiscardFrom.value = ai.id
              checkNextAction(ai.id)
            } else {
              handleExhaustedDraw()
            }
          } else {
            handleExhaustedDraw()
          }
        }
      } catch (e) {
        console.error(`[AI 异常] 玩家${currentPlayer.value} 思考出错：`, e)
      } finally {
        console.log(`[AI 锁释放] 玩家${currentPlayer.value} 释放锁`)
        isAiProcessing = false
      }
    }, ai.config.THINK_TIME)
  } else if (ai.hand.length === expectedHandSize + 1) {
    // AI 是庄家或刚摸过牌，直接打牌
    setTimeout(async () => {
      console.log(`[AI 思考] 玩家${currentPlayer.value} 开始思考（直接打牌）`)
      try {
        const decision = await ai.think('discard', null)
        let discardIdx = decision.index !== undefined ? decision.index : (decision.discardIndex !== undefined ? decision.discardIndex : 0)

        // 边界检查
        if (discardIdx < 0 || discardIdx >= ai.hand.length) {
          console.warn(`[AI 警告] 玩家${currentPlayer.value} 决策索引无效：${discardIdx}, 手牌数：${ai.hand.length}, 使用默认索引 0`)
          discardIdx = 0
        }

        const discarded = ai.discardTile(discardIdx)
        if (discarded) {
          console.log(`[AI 打牌] 玩家${currentPlayer.value} 打出 ${discarded.display}`)
          discardPool.value.push(discarded)
          lastDiscard.value = discarded
          lastDiscardFrom.value = ai.id
          checkNextAction(ai.id)
        } else {
          console.error(`[AI 错误] 玩家${currentPlayer.value} 打牌失败，尝试随机打牌`)
          const randomIdx = Math.floor(Math.random() * ai.hand.length)
          const randomDiscarded = ai.discardTile(randomIdx)
          if (randomDiscarded) {
            discardPool.value.push(randomDiscarded)
            lastDiscard.value = randomDiscarded
            lastDiscardFrom.value = ai.id
            checkNextAction(ai.id)
          } else {
            handleExhaustedDraw()
          }
        }
      } catch (e) {
        console.error(`[AI 异常] 玩家${currentPlayer.value} 思考出错：`, e)
      } finally {
        console.log(`[AI 锁释放] 玩家${currentPlayer.value} 释放锁`)
        isAiProcessing = false
      }
    }, ai.config.THINK_TIME)
  } else {
    // 手牌数量异常，强制处理
    console.error(`[AI 异常] 玩家${currentPlayer.value} 手牌数量异常：${ai.hand.length}, 预期：${expectedHandSize}`)
    // 强制摸牌或打牌
    if (ai.hand.length > expectedHandSize) {
      // 手牌多了，直接打出一张
      setTimeout(async () => {
        try {
          const decision = await ai.think('discard', null)
          const discardIdx = decision.index !== undefined ? decision.index : (decision.discardIndex !== undefined ? decision.discardIndex : 0)
          const discarded = ai.discardTile(discardIdx)
          if (discarded) {
            discardPool.value.push(discarded)
            lastDiscard.value = discarded
            lastDiscardFrom.value = ai.id
            checkNextAction(ai.id)
          }
        } finally {
          console.log(`[AI 锁释放] 玩家${currentPlayer.value} 异常分支释放锁`)
          isAiProcessing = false
        }
      }, ai.config.THINK_TIME)
    } else {
      // 手牌少了，摸一张
      const drawnTile = deck.value.draw()
      if (drawnTile) {
        ai.addTile(drawnTile)
        remainingTiles.value = deck.value.remaining()
        setTimeout(async () => {
          try {
            const decision = await ai.think('draw', drawnTile, ai.hand)
            const discardIdx = decision.index !== undefined ? decision.index : (decision.discardIndex !== undefined ? decision.discardIndex : -1)
            if (discardIdx >= 0) {
              const discarded = ai.discardTile(discardIdx)
              if (discarded) {
                discardPool.value.push(discarded)
                lastDiscard.value = discarded
                lastDiscardFrom.value = ai.id
                checkNextAction(ai.id)
              }
            }
          } finally {
            console.log(`[AI 锁释放] 玩家${currentPlayer.value} 摸牌分支释放锁`)
            isAiProcessing = false
          }
        }, ai.config.THINK_TIME)
      } else {
        // 摸不到牌，流局
        console.log(`[AI 流局] 玩家${currentPlayer.value} 手牌异常且摸不到牌`)
        handleExhaustedDraw()
      }
    }
  }
}

// 检查下一步行动
// 麻将规则：任何玩家打牌后，其他玩家都有机会检查吃碰胡
// 优先级：胡 > 碰/杠 > 吃（只能吃上家）
const checkNextAction = (fromPlayer) => {
  console.log(`[checkNextAction] 玩家${fromPlayer} 打牌后`)

  if (fromPlayer === 0) {
    // 玩家 0 打牌后，按顺序检查 AI（只有下家可以吃）
    const nextPlayer = (fromPlayer + 1) % 4
    console.log(`[checkNextAction] 调用 checkAiActions(${nextPlayer})`)
    checkAiActions(nextPlayer, lastDiscard.value, lastDiscardFrom.value)
  } else {
    // 任何 AI 打牌后，先检查玩家是否有吃碰胡的需求
    // 玩家可以吃上家（玩家 1）的牌，可以碰/胡任何玩家的牌
    checkPlayerActions(lastDiscard.value)
  }
}

// 检查是否有其他玩家可以吃碰胡，如果没有，下家摸牌
const continueToNextPlayer = (fromPlayer) => {
  const nextPlayer = (fromPlayer + 1) % 4
  console.log(`[continueToNextPlayer] 玩家${fromPlayer} 打牌后，所有玩家都过，下一个摸牌玩家：${nextPlayer}`)

  if (nextPlayer === 0) {
    // 玩家摸牌
    playerDrawPhase()
  } else {
    // AI 摸牌
    currentPlayer.value = nextPlayer
    aiTurn()
  }
}

// 检查 AI 可执行操作
// continueChain: 如果为 true，AI 没有特殊操作时继续检查下一个玩家，而不是摸牌
const checkAiActions = (aiIndex, tile, fromPlayer, continueChain = false) => {
  const ai = players.value[aiIndex]
  console.log(`[checkAiActions] 玩家${aiIndex}, 牌：${tile?.display}, from: ${fromPlayer}, continueChain: ${continueChain}`)

  // 检查荣和
  const canRon = checkCanRon(ai.hand, tile, ai.exposedSets)
  if (canRon) {
    console.log(`[checkAiActions] 玩家${aiIndex} 可以荣和`)
    // AI 荣和
    setTimeout(() => {
      isAiProcessing = true
      console.log(`[checkAiActions] 玩家${aiIndex} 荣和执行`)
      doAiRon(aiIndex)
    }, ai.config.THINK_TIME)
    return
  }

  // 检查碰
  const canPeng = canPon(ai.hand, tile)
  if (canPeng && Math.random() < ai.config.PON_PROBABILITY) {
    console.log(`[checkAiActions] 玩家${aiIndex} 可以碰`)
    // AI 碰
    setTimeout(() => {
      isAiProcessing = true
      console.log(`[checkAiActions] 玩家${aiIndex} 碰执行`)
      doAiPeng(aiIndex)
    }, ai.config.THINK_TIME)
    return
  }

  // 检查杠
  const canGang = canDaiminkan(ai.hand, tile)
  if (canGang && Math.random() < 0.75) {
    console.log(`[checkAiActions] 玩家${aiIndex} 可以杠`)
    // AI 杠
    setTimeout(() => {
      isAiProcessing = true
      console.log(`[checkAiActions] 玩家${aiIndex} 杠执行`)
      doAiGang(aiIndex)
    }, ai.config.THINK_TIME)
    return
  }

  // 检查吃（只能吃上家的牌）
  const chiPatterns = canChii(ai.hand, tile)
  const canChi = chiPatterns.length > 0 && ((aiIndex === 2 && fromPlayer === 1) || (aiIndex === 3 && fromPlayer === 2) || (aiIndex === 1 && fromPlayer === 0))
  if (canChi && Math.random() < ai.config.CHII_PROBABILITY) {
    console.log(`[checkAiActions] 玩家${aiIndex} 可以吃`)
    // AI 吃
    setTimeout(() => {
      isAiProcessing = true
      console.log(`[checkAiActions] 玩家${aiIndex} 吃执行`)
      doAiChi(aiIndex, chiPatterns[0].tiles)
    }, ai.config.THINK_TIME)
    return
  }

  // 没有特殊操作
  if (continueChain) {
    // 继续检查下一个玩家
    console.log(`[checkAiActions] 玩家${aiIndex} 无特殊操作，继续检查下一个玩家`)
    const nextPlayer = (aiIndex + 1) % 4
    if (nextPlayer === 0) {
      // 下一个是玩家，但玩家已经选择过，所以打牌者的下家摸牌
      continueToNextPlayer(fromPlayer)
    } else {
      // 检查下一个 AI
      checkAiActions(nextPlayer, tile, fromPlayer, true)
    }
  } else {
    // 正常流程，AI 摸牌打牌
    console.log(`[checkAiActions] 玩家${aiIndex} 无特殊操作，调用 aiTurn`)
    currentPlayer.value = aiIndex
    aiTurn()
  }
}

// AI 碰
const doAiPeng = async (aiIndex) => {
  const ai = players.value[aiIndex]
  const tile = lastDiscard.value

  console.log(`[AI 碰] 玩家${aiIndex} 碰 ${tile.display}, 碰前手牌：${ai.hand.length}张`)

  // 从手牌中移除两张相同的牌
  let removed = 0
  for (let i = ai.hand.length - 1; i >= 0 && removed < 2; i--) {
    if (ai.hand[i].value === tile.value) {
      ai.hand.splice(i, 1)
      removed++
    }
  }

  console.log(`[AI 碰] 移除了${removed}张牌，碰后手牌：${ai.hand.length}张`)

  ai.exposedSets.push({ type: 'pon', tiles: [tile, tile, tile] })

  // 从 discardPool 移除最后一张牌
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 设置当前玩家为碰牌的 AI，并设置为碰后打牌状态
  currentPlayer.value = aiIndex
  gameState.value = 'ai_discarding'

  // 碰后打牌
  setTimeout(async () => {
    try {
      const decision = await ai.think('discard', null)
      const discarded = ai.discardTile(decision.index !== undefined ? decision.index : (decision.discardIndex || 0))
      if (discarded) {
        discardPool.value.push(discarded)
        lastDiscard.value = discarded
        lastDiscardFrom.value = aiIndex
        gameState.value = 'ai_thinking'
        checkNextAction(aiIndex)
      }
    } finally {
      isAiProcessing = false
    }
  }, ai.config.THINK_TIME)
}

// AI 杠
const doAiGang = async (aiIndex) => {
  const ai = players.value[aiIndex]
  const tile = lastDiscard.value

  // 从手牌中移除三张相同的牌
  let removed = 0
  for (let i = ai.hand.length - 1; i >= 0 && removed < 3; i--) {
    if (ai.hand[i].value === tile.value) {
      ai.hand.splice(i, 1)
      removed++
    }
  }

  ai.exposedSets.push({ type: 'kan', tiles: [tile, tile, tile, tile] })

  // 从 discardPool 移除最后一张牌
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 设置当前玩家为杠牌的 AI
  currentPlayer.value = aiIndex
  gameState.value = 'ai_discarding'

  // 杠后摸牌
  const drawnTile = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  setTimeout(async () => {
    try {
      const testHand = [...ai.hand, drawnTile]
      const result = checkAgari(testHand)
      if (result.agari) {
        endRound(aiIndex, { type: '杠上开花', fan: 3, isZimo: true }, true)
        return
      }

      // 打牌
      const decision = await ai.think('discard', null)
      const discarded = ai.discardTile(decision.index !== undefined ? decision.index : (decision.discardIndex || 0))
      if (discarded) {
        discardPool.value.push(discarded)
        lastDiscard.value = discarded
        lastDiscardFrom.value = aiIndex
        gameState.value = 'ai_thinking'
        checkNextAction(aiIndex)
      }
    } finally {
      isAiProcessing = false
    }
  }, ai.config.THINK_TIME)
}

// AI 荣和
const doAiRon = (aiIndex) => {
  const ai = players.value[aiIndex]
  const tile = lastDiscard.value
  const testHand = [...ai.hand, tile]
  const result = checkAgari(testHand, ai.exposedSets, { isZimo: false, isDealer: ai.isDealer })
  endRound(aiIndex, result, false)
}

// AI 吃
const doAiChi = async (aiIndex, tiles) => {
  const ai = players.value[aiIndex]
  const tile = lastDiscard.value

  // 吃牌：手牌 2 张 + 别人 1 张 = 3 张
  const chiTiles = [tile]

  // 从手牌中移除用于吃的两张牌，并加入副露
  for (const idx of tiles) {
    const tileIdx = ai.hand.findIndex(t => t.type === tile.type && t.index === idx)
    if (tileIdx >= 0) {
      chiTiles.push(ai.hand[tileIdx])
      ai.hand.splice(tileIdx, 1)
    }
  }

  ai.exposedSets.push({ type: 'chi', tiles: chiTiles })

  // 从 discardPool 移除最后一张牌
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 设置当前玩家为吃牌的 AI，并设置为吃后打牌状态
  currentPlayer.value = aiIndex
  gameState.value = 'ai_discarding'

  // 吃后打牌
  setTimeout(async () => {
    try {
      const decision = await ai.think('discard', null)
      const discarded = ai.discardTile(decision.index !== undefined ? decision.index : (decision.discardIndex || 0))
      if (discarded) {
        discardPool.value.push(discarded)
        lastDiscard.value = discarded
        lastDiscardFrom.value = aiIndex
        gameState.value = 'ai_thinking'
        checkNextAction(aiIndex)
      }
    } finally {
      isAiProcessing = false
    }
  }, ai.config.THINK_TIME)
}

// 检查玩家可执行操作
const checkPlayerActions = (tile) => {
  gameState.value = 'player_action'
  currentPlayer.value = 0

  console.log(`[玩家行动] 检查玩家可执行操作，牌：${tile?.display}, 手牌数：${playerHand.value.length}, 打牌者：${lastDiscardFrom.value}`)

  // 检查荣和（任何玩家打牌都可以胡）
  const ronResult = checkCanRon(playerHand.value, tile, players.value[0].exposedSets)
  canRon.value = ronResult
  console.log(`[玩家行动] 荣和：${ronResult}`)

  // 检查碰（任何玩家打牌都可以碰）
  canPeng.value = canPon(playerHand.value, tile)
  console.log(`[玩家行动] 碰：${canPeng.value}`)

  // 检查杠（大明杠，任何玩家打牌都可以杠）
  canGang.value = canDaiminkan(playerHand.value, tile)
  console.log(`[玩家行动] 大明杠：${canGang.value}`)

  // 检查吃（只能吃上家的牌，上家是玩家 1 - 左侧 AI）
  const chiPatterns = canChii(playerHand.value, tile)
  canChi.value = chiPatterns.length > 0 && lastDiscardFrom.value === 1
  console.log(`[玩家行动] 吃：${canChi.value}, 上家打牌：${lastDiscardFrom.value === 1}`)

  if (canChi.value) {
    chiOptions.value = chiPatterns.map(p => ({
      pattern: formatChiPattern(p.allTiles || p.tiles),  // 显示完整的顺子
      tiles: p.tiles  // 保存需要从手牌中拿出的牌
    }))
  }

  showPassOption.value = canRon.value || canPeng.value || canGang.value || canChi.value

  console.log(`[玩家行动] 状态：canRon=${canRon.value}, canPeng=${canPeng.value}, canGang=${canGang.value}, canChi=${canChi.value}`)

  // 如果有可执行的操作，提示用户选择
  if (canRon.value || canPeng.value || canGang.value || canChi.value) {
    message.value = '请选择操作'
  } else {
    // 玩家没有可执行的操作，继续检查下一个 AI（碰/胡）
    console.log(`[玩家行动] 玩家没有可执行的操作，继续检查下一个 AI`)
    const nextAi = (lastDiscardFrom.value + 1) % 4
    if (nextAi === 0) {
      // 下一个是玩家 0，说明所有人都过，打牌者的下家摸牌
      continueToNextPlayer(lastDiscardFrom.value)
    } else {
      // 检查下一个 AI，continueChain = true 表示继续检查链
      checkAiActions(nextAi, lastDiscard.value, lastDiscardFrom.value, true)
    }
  }
}

// 玩家吃、碰、杠、胡、摸牌后，重置操作按钮状态，只显示出牌按钮
const resetPlayerActions = () => {
  canRon.value = false
  canZimo.value = false
  canPeng.value = false
  canGang.value = false
  canChi.value = false
  canDiscard.value = true
  canSelectDiscard.value = true
  showPassOption.value = false
  selectedDiscard.value = -1
}

// 玩家摸牌
const playerDrawPhase = () => {
  gameState.value = 'player_turn'
  drawnTile.value = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  console.log(`[玩家摸牌] 摸到：${drawnTile.value?.display}, 手牌数：${playerHand.value.length}`)

  if (!drawnTile.value) {
    handleExhaustedDraw()
    return
  }

  // 摸牌后先不加入手牌，单独显示
  // 检查是否能自摸（14 张牌）
  const testHand = [...playerHand.value, drawnTile.value]
  // 确保使用最新的副露数据
  const exposedSets = players.value[0]?.exposedSets || []

  console.log(`[玩家摸牌] 手牌：${testHand.map(t => t.display).join(',')}, 副露：${exposedSets.map(s => s.type + '(' + s.tiles.map(t => t?.display || t).join(',') + ')').join(', ')}`)
  console.log(`[玩家摸牌] 手牌数：${testHand.length}, 副露数：${exposedSets.length}`)

  const result = checkAgari(testHand, exposedSets, { isZimo: true, isDealer: players.value[0]?.isDealer })

  console.log(`[玩家摸牌] 自摸检查：${result.agari}, 牌型：${result.type || '无'}`)

  // 先重置操作状态
  resetPlayerActions()

  // 如果自摸，覆盖出牌状态
  if (result.agari) {
    canZimo.value = true
    canDiscard.value = false  // 可以自摸时不能出牌
    showPassOption.value = true  // 显示过按钮，让用户选择不胡
    message.value = '可以自摸！'
  } else {
    message.value = ''
  }

  // 检查暗杠
  const ankanTiles = canAnkan(testHand)
  // 检查加杠
  const kakanResult = canKakan(exposedSets, drawnTile.value)

  if (ankanTiles.length > 0 || kakanResult.can) {
    canGang.value = true
    console.log(`[玩家摸牌] 可以${ankanTiles.length > 0 ? '暗杠' : '加杠'}`)
  }

  // 确保 UI 刷新
  nextTick()
}

// 玩家点击手牌
const handleTileClick = (idx) => {
  if (!canSelectDiscard.value) return
  // 如果点击的是已选中的牌，取消选中
  if (selectedDiscard.value === idx) {
    selectedDiscard.value = -1
  } else {
    selectedDiscard.value = idx
  }
}

// 玩家点击摸到的牌
const handleDrawnTileClick = () => {
  if (!canDiscard.value) return
  // 直接打出摸到的牌
  const discarded = drawnTile.value
  discardPool.value.push(discarded)
  lastDiscard.value = discarded
  lastDiscardFrom.value = 0
  drawnTile.value = null

  canDiscard.value = false
  canSelectDiscard.value = false
  selectedDiscard.value = -1

  currentPlayer.value = 1
  checkNextAction(0)
}

// 确认出牌
const confirmDiscard = () => {
  if (!canDiscard.value) return

  let discarded = null

  // 如果用户选择了手牌中的牌，打出手牌，将摸到的牌加入手牌
  if (selectedDiscard.value >= 0 && selectedDiscard.value < playerHand.value.length) {
    discarded = playerHand.value.splice(selectedDiscard.value, 1)[0]
    // 将摸到的牌加入手牌
    if (drawnTile.value) {
      playerHand.value.push(drawnTile.value)
      playerHand.value = sortHand(playerHand.value)
      players.value[0].hand = playerHand.value
      drawnTile.value = null
    }
  } else if (drawnTile.value) {
    // 否则打出摸到的牌
    discarded = drawnTile.value
    drawnTile.value = null
  } else {
    // 默认打出最后一张手牌
    discarded = playerHand.value.pop()
    players.value[0].hand = playerHand.value
    playerHand.value = sortHand(playerHand.value)
  }

  discardPool.value.push(discarded)
  lastDiscard.value = discarded
  lastDiscardFrom.value = 0

  canDiscard.value = false
  canSelectDiscard.value = false
  selectedDiscard.value = -1

  currentPlayer.value = 1
  checkNextAction(0)
}

// 吃
const doChi = () => {
  if (chiOptions.value.length === 0) {
    console.warn('[doChi] 没有可用的吃牌选项')
    return
  }
  if (chiOptions.value.length === 1) {
    completeChi(0)
  } else {
    showChiDialog.value = true
  }
}

const selectChi = (idx) => {
  if (idx < 0 || idx >= chiOptions.value.length) {
    console.warn(`[selectChi] 无效的吃牌索引：${idx}, chiOptions.length: ${chiOptions.value.length}`)
    return
  }
  showChiDialog.value = false
  completeChi(idx)
}

const completeChi = (idx) => {
  const tile = lastDiscard.value
  const option = chiOptions.value[idx]

  console.log(`[completeChi] idx: ${idx}, chiOptions: ${JSON.stringify(chiOptions.value)}, option: ${JSON.stringify(option)}`)

  if (!option || !option.tiles) {
    console.error(`[completeChi] 无效的吃牌选项：${idx}, option:`, option)
    return
  }

  // 吃牌：手牌 2 张 + 别人 1 张 = 3 张
  const chiTiles = [tile]

  // 需要同类型同花色的牌，不能只看 index
  const tileType = tile.type
  const neededIndices = option.tiles.filter(idx => idx !== tile.index)

  console.log(`[completeChi] 需要移除的手牌索引：${neededIndices.join(',')}, 类型：${tileType}`)

  // 跟踪已经拿走的索引，避免重复拿相同的牌
  const usedIndices = []

  for (let i = playerHand.value.length - 1; i >= 0; i--) {
    const handTile = playerHand.value[i]
    // 同时检查类型和索引，并且确保每个索引只拿一张
    if (handTile && handTile.type === tileType &&
        neededIndices.includes(handTile.index) &&
        !usedIndices.includes(handTile.index)) {
      chiTiles.push(handTile)
      usedIndices.push(handTile.index)
      playerHand.value.splice(i, 1)
    }
  }
  players.value[0].exposedSets.push({ type: 'chi', tiles: chiTiles })
  players.value[0].hand = playerHand.value

  // 从 discardPool 移除最后一张牌（被吃的牌）
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 重置操作状态，只保留出牌
  resetPlayerActions()

  currentPlayer.value = 0
  message.value = '请选择要打出的牌'
}

// 碰
const doPeng = () => {
  const tile = lastDiscard.value
  // 从手牌中移除两张相同的牌
  let removed = 0
  for (let i = playerHand.value.length - 1; i >= 0 && removed < 2; i--) {
    if (playerHand.value[i].value === tile.value) {
      playerHand.value.splice(i, 1)
      removed++
    }
  }
  players.value[0].exposedSets.push({ type: 'pon', tiles: [tile, tile, tile] })
  players.value[0].hand = playerHand.value

  // 从 discardPool 移除最后一张牌（被碰的牌）
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 重置操作状态，只保留出牌
  resetPlayerActions()

  currentPlayer.value = 0
  message.value = '请选择要打出的牌'
}

// 杠 - 根据情况处理大明杠、暗杠或加杠
const doGang = () => {
  // 1. 检查是否是加杠（摸到之前碰过的牌）
  const kakanResult = canKakan(players.value[0].exposedSets, drawnTile.value)
  if (kakanResult.can) {
    doKakan(kakanResult.setIndex)
    return
  }

  // 2. 检查是否是暗杠（摸牌后手上有4张一样的）
  const testHand = drawnTile.value ? [...playerHand.value, drawnTile.value] : playerHand.value
  const counts = {}
  for (const tile of testHand) {
    counts[tile.value] = (counts[tile.value] || 0) + 1
  }
  const ankanValue = Object.keys(counts).find(v => counts[v] === 4)

  if (ankanValue) {
    doAnkan(parseInt(ankanValue))
  } else if (lastDiscard.value) {
    // 3. 大明杠
    doDaiminkan()
  } else {
    console.warn('[doGang] 无法确定杠的类型')
  }
}

// 加杠
const doKakan = (setIndex) => {
  const tile = drawnTile.value
  console.log(`[加杠] 杠牌：${tile.display}, 索引：${setIndex}`)

  // 更新副露：从 pon 变为 kan
  const set = players.value[0].exposedSets[setIndex]
  set.type = 'kan'
  set.tiles.push(tile)
  
  // 清空摸到的牌
  drawnTile.value = null

  // 杠后摸牌
  drawnTile.value = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  console.log(`[加杠] 摸到新牌：${drawnTile.value?.display}`)

  // 检查是否杠上开花
  const result = checkAgari([...playerHand.value, drawnTile.value], players.value[0]?.exposedSets || [], { isZimo: true, isDealer: players.value[0]?.isDealer })
  if (result.agari) {
    message.value = '杠上开花！'
    doZimo()
    return
  }

  resetPlayerActions()
  currentPlayer.value = 0
  message.value = '请选择要打出的牌'
}

// 暗杠
const doAnkan = (tileValue) => {
  // 找到 4 张相同的牌
  const kanTiles = []
  for (let i = playerHand.value.length - 1; i >= 0; i--) {
    if (playerHand.value[i].value === tileValue) {
      kanTiles.push(playerHand.value[i])
      playerHand.value.splice(i, 1)
      if (kanTiles.length === 4) break
    }
  }

  console.log(`[暗杠] 暗杠牌：${kanTiles.map(t => t.display).join(',')}`)

  players.value[0].exposedSets.push({ type: 'kan', tiles: kanTiles })
  players.value[0].hand = playerHand.value

  // 暗杠后摸牌
  drawnTile.value = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  console.log(`[暗杠] 摸到：${drawnTile.value?.display}`)

  // 检查是否杠上开花
  const result = checkAgari([...playerHand.value, drawnTile.value], players.value[0]?.exposedSets || [], { isZimo: true, isDealer: players.value[0]?.isDealer })
  if (result.agari) {
    // 杠上开花，直接自摸
    message.value = '杠上开花！'
    doZimo()
    return
  }

  // 重置操作状态，只保留出牌
  resetPlayerActions()

  currentPlayer.value = 0
  message.value = '请选择要打出的牌'
}

// 大明杠
const doDaiminkan = () => {
  const tile = lastDiscard.value
  // 从手牌中移除三张相同的牌
  let removed = 0
  for (let i = playerHand.value.length - 1; i >= 0 && removed < 3; i--) {
    if (playerHand.value[i].value === tile.value) {
      playerHand.value.splice(i, 1)
      removed++
    }
  }
  players.value[0].exposedSets.push({ type: 'kan', tiles: [tile, tile, tile, tile] })
  players.value[0].hand = playerHand.value

  // 从 discardPool 移除最后一张牌（被杠的牌）
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 杠后摸牌
  drawnTile.value = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  // 检查是否杠上开花
  const result = checkAgari([...playerHand.value, drawnTile.value], players.value[0]?.exposedSets || [], { isZimo: true, isDealer: players.value[0]?.isDealer })
  if (result.agari) {
    // 杠上开花，直接自摸
    message.value = '杠上开花！'
    doZimo()
    return
  }

  // 重置操作状态，只保留出牌
  resetPlayerActions()

  currentPlayer.value = 0
  message.value = '请选择要打出的牌'
}

// 荣和
const doRon = () => {
  const tile = lastDiscard.value
  const testHand = [...playerHand.value, tile]
  const result = checkAgari(testHand, players.value[0].exposedSets, { isZimo: false, isDealer: players.value[0].isDealer })
  endRound(0, result, false)
}

// 自摸
const doZimo = () => {
  const testHand = [...playerHand.value, drawnTile.value]
  const result = checkAgari(testHand, players.value[0].exposedSets, { isZimo: true, isDealer: players.value[0].isDealer })
  endRound(0, result, true)
}

// 结束一局
const endRound = (winnerId, result, isZimo) => {
  isAiProcessing = false  // 释放锁
  gameState.value = 'round_over'
  showResultDialog.value = true

  const winner = players.value[winnerId]
  winnerName.value = winnerId === 0 ? '你' : winner.name
  resultClass.value = winnerId === 0 ? 'win' : 'loss'
  resultTitle.value = isZimo ? '自摸！' : '和牌！'

  agariType.value = result.type
  fanCount.value = result.fan || 1

  const score = calculateScore(fanCount.value, winner.isDealer, isZimo)
  winner.score += score.total
  scoreChange.value = `+${score.total}`

  if (players.value.some(p => p.score <= 0)) {
    isGameOver.value = true
  }

  roundCount.value++
}

// 流局
const handleExhaustedDraw = () => {
  isAiProcessing = false  // 释放锁
  gameState.value = 'round_over'
  message.value = '流局'
}

// 下一局
const nextRound = () => {
  showResultDialog.value = false
  newRound()
}

// 重新开始
const resetGame = () => {
  gameState.value = 'not_started'
  showResultDialog.value = false
}

const closeResultDialog = () => {
  showResultDialog.value = false
  nextRound()
}

const passAction = () => {
  canRon.value = false
  canPeng.value = false
  canGang.value = false
  canChi.value = false
  showPassOption.value = false

  // 玩家选择"过"后，继续检查下一个 AI
  // 下一个 AI 是 (lastDiscardFrom.value + 1) % 4
  const nextAi = (lastDiscardFrom.value + 1) % 4
  console.log(`[passAction] 玩家选择过，检查下一个 AI：${nextAi}`)

  if (nextAi === 0) {
    // 下一个是玩家 0，说明所有人都过，打牌者的下家摸牌
    continueToNextPlayer(lastDiscardFrom.value)
  } else {
    // 检查下一个 AI，continueChain = true 表示继续检查链
    checkAiActions(nextAi, lastDiscard.value, lastDiscardFrom.value, true)
  }
}

const calculateScore = (fan, isDealer, isZimo) => {
  const base = Math.pow(2, fan) || 1
  if (isZimo) {
    return { total: isDealer ? base * 3 : base * 2 }
  }
  return { total: base * 2 }
}

const formatChiPattern = (tiles) => {
  const sorted = [...tiles].sort((a, b) => a - b)
  return sorted.map(t => t.toString()).join('')
}
</script>

<style scoped>
.mahjong-view {
  height: 100%;
  width: 100%;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 信息栏 - 风位和局数 */
.info-bar {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.wind-round {
  background: rgba(255,255,255,0.9);
  padding: 4px 12px;
  border-radius: 20px;
  display: flex;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.wind { color: #3b82f6; }
.round { color: #64748b; }

.reset-btn {
  width: 34px;
  height: 34px;
  border: 1.5px solid rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.2);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: rgba(255,255,255,0.3);
}

/* 麻将桌 */
.table-container {
  flex: 1;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
}

.mahjong-table {
  width: 100%;
  height: 100%;
  max-width: 1200px;
  aspect-ratio: 9/14;
  background: #15803d;
  border-radius: 24px;
  border: 8px solid #374151;
  position: relative;
  box-shadow: inset 0 0 60px rgba(0,0,0,0.4);
  overflow: hidden;
}

/* 开始界面 */
.setup-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.95);
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.setup-card {
  background: #fff;
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  text-align: center;
  max-width: 320px;
}

.hero-icon {
  font-size: 2.5rem;
  color: #16a34a;
  margin-bottom: 12px;
}

.setup-card h3 {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 16px;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.form-row .label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}

.start-btn {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  margin-top: 16px;
  cursor: pointer;
}

/* 游戏区域 */
.game-area {
  width: 100%;
  height: 100%;
  position: relative;
}

/* AI 区域 */
.ai-zone {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0;
  transition: all 0.3s;
  z-index: 10;
}

.top-zone {
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.left-zone {
  left: 4px;
  top: 40%;
  transform: translateY(-50%);
}

.right-zone {
  right: 4px;
  top: 40%;
  transform: translateY(-50%);
}

.player-info-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.95);
  padding: 4px 10px;
  border-radius: 14px;
  font-size: 0.85rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  color: #1e293b;
}

.ai-zone .player-info-box {
  background: rgba(15, 23, 42, 0.8);
  color: #ffffff;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 4px 12px;
}

.ai-zone .player-info-box .info {
  background: #409eff;
  padding: 2px 8px;
  border-radius: 10px;
}

.player-info-box .avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #1e293b;
}

.ai-zone .player-info-box .avatar {
  background: rgba(255,255,255,0.2);
  color: #ffffff;
}

.player-info-box .name {
  font-size: 0.85rem;
  font-weight: 700;
  color: inherit;
}

.player-info-box .score {
  color: #f59e0b;
  font-size: 0.95rem;
  font-weight: 800;
}

.player-info-box .dealer-badge {
  background: #f59e0b;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 手牌 */
.hand-tiles {
  display: flex;
  gap: 2px;
}

.hand-tiles.horizontal {
  flex-direction: row;
}

.hand-tiles.vertical {
  flex-direction: column;
}

/* 双列布局 - 左右两侧 AI 手牌 */
.hand-tiles.vertical.double-column {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  max-height: none;
  overflow: visible;
}

/* 单张牌显示 - 小屏幕优化 */
.hand-tiles.single-tile {
  position: relative;
  display: inline-block;
}

/* 手牌数标签 */
.hand-count-label {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(4px);
  color: #fbbf24;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 900;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  z-index: 5;
}

/* 副露 */
.exposed-zone {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
  justify-content: center;
}

.exposed-zone.vertical {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.exposed-set {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* 大屏：显示所有牌 */
.exposed-tiles-full {
  display: flex;
  gap: 2px;
}

/* 小屏：简化显示 */
.exposed-tile-simple {
  width: 28px;
  height: 38px;
  background: linear-gradient(180deg, #fefefe, #f5f5f5);
  border-radius: 6px;
  border: 1px solid #d0d0d0;
  box-shadow: 1px 2px 4px rgba(0,0,0,0.2);
  position: relative;
  display: none; /* 默认隐藏，小屏显示 */
}

.exposed-tile-simple .tile-num {
  font-size: 0.9rem;
  font-weight: 900;
}

.exposed-tile-simple.tile-man .tile-num {
  color: #dc2626;
  font-size: 1.2rem;
}

.exposed-tile-simple.tile-pin .tile-num {
  color: #2563eb;
  font-size: 1.2rem;
}

.exposed-tile-simple.tile-sou .tile-num {
  color: #16a34a;
  font-size: 1.2rem;
}

.exposed-tile-simple .wan,
.exposed-tile-simple .ping,
.exposed-tile-simple .sou {
  position: absolute;
  bottom: 3px;
  right: 3px;
  font-size: 0.6rem;
  font-weight: 900;
}

/* 标签：吃/碰/杠 */
.exposed-label {
  position: absolute;
  bottom: -2px;
  left: -2px;
  background: #f59e0b;
  color: #fff;
  font-size: 0.5rem;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
  z-index: 2;
}

/* 中央区域 */
.center-zone {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: 280px;
}

.remaining-tiles {
  background: rgba(0,0,0,0.6);
  padding: 4px 12px;
  border-radius: 16px;
  display: flex;
  gap: 6px;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.remaining-tiles .count {
  color: #fbbf24;
  font-size: 0.9rem;
}

.wall-preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wall-row {
  display: flex;
  gap: 1px;
}

.wall-block {
  width: 12px;
  height: 16px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.2);
}

.discard-zone {
  display: flex;
  justify-content: center;
}

.discard-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  padding: 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  min-height: 150px;
  min-width: 240px;
}

/* 玩家区域 */
.player-zone {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0,0,0,0.15);
  border-radius: 16px;
  width: 98%;
  backdrop-filter: blur(2px);
  z-index: 50;
}

.player-zone.active {
  background: rgba(250, 204, 21, 0.1);
}

.player-zone .player-info-box {
  order: 3;
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  border: 1px solid rgba(0,0,0,0.05);
  padding: 2px 10px;
  min-width: 80px;
  border-radius: 12px;
}

.player-zone .player-info-box .avatar {
  width: 18px;
  height: 18px;
  font-size: 0.7rem;
}

.player-zone .player-info-box .score {
  font-size: 0.8rem;
}

/* 手牌区 */
.hand-zone {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.hand-cards {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}

@media (max-width: 400px) {
  .mahjong-table {
    border-radius: 12px;
    border-width: 4px;
  }
  
  .player-zone {
    width: 98%;
    padding: 4px;
  }
  
  .hand-zone {
    gap: 2px;
  }
}

/* 小屏幕适配 */
@media (max-width: 768px) {
  .mahjong-table {
    border-radius: 20px;
    border-width: 6px;
  }
  
  .discard-grid {
    grid-template-columns: repeat(6, 1fr);
    padding: 6px;
    gap: 2px;
    min-height: 80px;
    min-width: 180px;
  }
  
  .exposed-tile-simple {
    display: flex;
    position: relative;
  }
  
  .exposed-tiles-full {
    display: none;
  }
  
  .wall-preview {
    display: none;
  }
}

/* 超小屏幕进一步缩放 */
@media (max-width: 480px) {
  .player-zone {
    padding: 4px;
    bottom: 4px;
    gap: 4px;
    background: transparent;
    backdrop-filter: none;
    width: 100%;
  }

  .player-zone .player-info-box {
    order: 3;
    width: auto;
    max-width: none;
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0 10px;
    margin-top: 4px;
    flex-direction: row;
    height: 24px;
    gap: 6px;
    color: #ffffff;
    display: flex;
    align-items: center;
  }

  .player-zone .player-info-box .avatar {
    width: 16px;
    height: 16px;
    font-size: 0.6rem;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .player-zone .player-info-box .info {
    flex-direction: row;
    gap: 6px;
    align-items: center;
    width: auto;
    display: flex;
  }

  .player-zone .player-info-box .info .top {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
  }

  .player-zone .player-info-box .name {
    color: #ffffff;
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .player-zone .player-info-box .score {
    color: #fbbf24;
    font-size: 0.8rem;
    font-weight: 900;
    margin-left: 4px;
    border-left: 1px solid rgba(255,255,255,0.2);
    padding-left: 6px;
  }

  /* 手机端 AI 信息框 - 强制配色 */
  .ai-zone .player-info-box {
    background: rgba(15, 23, 42, 0.8) !important;
    color: #ffffff !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    padding: 4px 10px;
  }

  .ai-zone .player-info-box .name {
    color: #ffffff !important;
    font-size: 0.75rem;
  }

  .ai-zone .player-info-box .score {
    color: #fbbf24 !important;
  }

  /* 手机端标签放大 */
  .hand-count-label {
    font-size: 0.8rem !important;
    padding: 2px 8px;
    bottom: -6px;
    right: -6px;
  }

  .discard-grid {
    grid-template-columns: repeat(6, 1fr);
    min-width: 160px;
  }

  .hand-cards {
    flex-wrap: wrap;
    justify-content: center;
    max-width: 240px;
    gap: 2px 2px;
  }

  .hand-zone {
    padding-bottom: 2px;
    min-height: 72px;
  }
}

/* 幺九标记 */
.yj-mark {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: 0.4rem;
  color: #dc2626;
  font-weight: 900;
  opacity: 0.7;
}

/* 牌背 */
.tile-back {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 5px;
  border: 1px solid rgba(255,255,255,0.3);
  box-shadow: 1px 2px 4px rgba(0,0,0,0.3);
  position: relative;
}

/* 默认尺寸（手机端） */
.h-tile {
  width: 32px;
  height: 44px;
}

.v-tile {
  width: 30px;
  height: 42px;
}

.tile-back::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60%;
  height: 70%;
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.2);
}

/* 大屏幕适配 - 放大重点区域 */
@media (min-width: 800px) {
  .ai-zone {
    gap: 12px;
  }

  .player-info-box {
    padding: 8px 20px;
    border-radius: 24px;
    gap: 12px;
  }

  .player-info-box .avatar {
    width: 36px;
    height: 36px;
    font-size: 1.4rem;
  }

  .player-info-box .name {
    font-size: 1.1rem;
  }

  .player-info-box .score {
    font-size: 1.2rem;
  }

  .center-zone {
    gap: 20px;
    top: 40%; /* 上移位置，防止挡住下方两排手牌 */
  }

  .remaining-tiles {
    padding: 10px 24px;
    font-size: 1.2rem;
    border-radius: 28px;
  }

  .remaining-tiles .count {
    font-size: 1.5rem;
  }

  .wall-block {
    width: 18px;
    height: 24px;
    border-radius: 4px;
  }

  .discard-grid {
    gap: 6px;
    padding: 16px;
  }

  .h-tile {
    width: 46px;
    height: 62px;
  }

  .v-tile {
    width: 42px;
    height: 58px;
  }

  .hand-count-label {
    font-size: 1.1rem;
    padding: 4px 10px;
    bottom: -10px;
    right: -10px;
    border-radius: 8px;
  }
}

/* 操作栏 */
.action-bar {
  height: 64px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  flex-shrink: 0;
  z-index: 100;
}
.thinking {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 700;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.9rem;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 0 rgba(0,0,0,0.2);
  transition: all 0.1s;
}

.btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.2);
}

.btn-win {
  background: #dc2626;
  font-size: 1rem;
}

.btn-pon { background: #f59e0b; }
.btn-gang { background: #8b5cf6; }
.btn-chi { background: #06b6d4; }
.btn-discard { background: #22c55e; }
.btn-pass { background: #64748b; }

.round-actions {
  display: flex;
  gap: 12px;
}

/* 对话框 */
:deep(.chi-dialog .el-dialog__header) {
  background: #f8fafc;
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.chi-dialog .el-dialog__title) {
  font-weight: 800;
}

.chi-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 16px;
}

.chi-btn {
  padding: 16px;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 800;
  font-size: 1rem;
  transition: all 0.2s;
}

.chi-btn:hover {
  background: #e0f2fe;
  border-color: #3b82f6;
}

/* 弹窗样式重置与美化 */
:deep(.el-dialog.modern-result-dialog),
:deep(.el-dialog.modern-discards-dialog) {
  border-radius: 24px;
  overflow: hidden;
  padding: 0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  max-width: 480px;
}

:deep(.el-dialog.modern-discards-dialog) {
  max-width: 600px;
}

:deep(.el-dialog__header) {
  padding: 20px 24px 0;
  margin: 0;
  text-align: center;
}

:deep(.el-dialog__title) {
  font-weight: 800;
  color: #1e293b;
  font-size: 1.2rem;
}

:deep(.el-dialog__body) {
  padding: 16px 24px 24px;
}

/* 结果卡片 */
.result-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px 0;
}

.result-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.result-status-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  background: #f1f5f9;
}

.win .result-status-icon { background: #fef3c7; color: #d97706; }
.loss .result-status-icon { background: #fee2e2; color: #dc2626; }
.draw .result-status-icon { background: #f1f5f9; color: #64748b; }

.result-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -0.025em;
}

.win .result-title { color: #d97706; }
.loss .result-title { color: #dc2626; }

.result-body {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-item .label {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
}

.result-item .value {
  color: #1e293b;
  font-weight: 800;
  font-size: 1rem;
}

.result-item .value.highlight {
  color: #3b82f6;
}

.result-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0;
}

.result-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-box {
  background: #f8fafc;
  padding: 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 900;
}

.stat-value.fan { color: #3b82f6; }
.stat-value.score { color: #16a34a; }

.result-footer {
  display: flex;
  justify-content: center;
}

.action-btn {
  width: 100%;
  height: 54px;
  font-size: 1.1rem;
  font-weight: 800;
  border-radius: 16px;
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
}

/* 已出牌区域 */
.discards-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
}

.discards-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.discards-scroll-area::-webkit-scrollbar {
  width: 6px;
}

.discards-scroll-area::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}

.discards-grid-modern {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 8px;
}

.discards-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.summary-badge {
  background: #e2e8f0;
  color: #475569;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
}

@media (max-width: 640px) {
  .result-title { font-size: 1.5rem; }
}
</style>
