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
                <span class="name">AI 对家</span>
                <span class="score">{{ players[2]?.score }}</span>
              </div>
            </div>
            <!-- 手牌（横向，背面） -->
            <div class="hand-tiles horizontal">
              <div v-for="i in getHandCount(2)" :key="i" class="tile-back h-tile"></div>
            </div>
            <!-- 副露 -->
            <div class="exposed-zone">
              <div v-for="(set, idx) in players[2]?.exposedSets" :key="idx" class="exposed-set">
                <span v-for="(tile, i) in set.tiles" :key="i" class="exposed-tile" :class="getTileClass(tile)">
                  <span class="tile-num">{{ getTileNumber(tile) }}</span>
                  <span v-if="tile.color === 'man'" class="wan">萬</span>
                  <span v-else-if="tile.color === 'pin'" class="ping">筒</span>
                  <span v-else-if="tile.color === 'sou'" class="sou">索</span>
                </span>
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
                <span class="name">AI 上家</span>
                <span class="score">{{ players[1]?.score }}</span>
              </div>
            </div>
            <!-- 手牌（纵向，背面，两列） -->
            <div class="hand-tiles vertical double-column">
              <div v-for="i in getHandCount(1)" :key="i" class="tile-back v-tile"></div>
            </div>
            <!-- 副露 -->
            <div class="exposed-zone vertical">
              <div v-for="(set, idx) in players[1]?.exposedSets" :key="idx" class="exposed-set">
                <span v-for="(tile, i) in set.tiles" :key="i" class="exposed-tile small" :class="getTileClass(tile)">
                  <span class="tile-num">{{ getTileNumber(tile) }}</span>
                  <span v-if="tile.color === 'man'" class="wan">萬</span>
                  <span v-else-if="tile.color === 'pin'" class="ping">筒</span>
                  <span v-else-if="tile.color === 'sou'" class="sou">索</span>
                </span>
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
                <span class="name">AI 下家</span>
                <span class="score">{{ players[3]?.score }}</span>
              </div>
            </div>
            <!-- 手牌（纵向，背面，两列） -->
            <div class="hand-tiles vertical double-column">
              <div v-for="i in getHandCount(3)" :key="i" class="tile-back v-tile"></div>
            </div>
            <!-- 副露 -->
            <div class="exposed-zone vertical">
              <div v-for="(set, idx) in players[3]?.exposedSets" :key="idx" class="exposed-set">
                <span v-for="(tile, i) in set.tiles" :key="i" class="exposed-tile small" :class="getTileClass(tile)">
                  <span class="tile-num">{{ getTileNumber(tile) }}</span>
                  <span v-if="tile.color === 'man'" class="wan">萬</span>
                  <span v-else-if="tile.color === 'pin'" class="ping">筒</span>
                  <span v-else-if="tile.color === 'sou'" class="sou">索</span>
                </span>
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
                <div v-for="(tile, idx) in visibleDiscards" :key="idx"
                     class="discard-tile"
                     :class="[getTileClass(tile), { 'last': idx === visibleDiscards.length - 1 }]">
                  <span class="tile-num">{{ getTileNumber(tile) }}</span>
                  <span v-if="tile.color === 'man'" class="wan">萬</span>
                  <span v-else-if="tile.color === 'pin'" class="ping">筒</span>
                  <span v-else-if="tile.color === 'sou'" class="sou">索</span>
                </div>
              </div>
            </div>

            <!-- 状态消息 -->
            <div class="status-message" :class="messageType">
              {{ message }}
            </div>
          </div>

          <!-- 玩家区域（底部） -->
          <div class="player-zone" :class="{ 'active': currentPlayer === 0 }">
            <!-- 副露 -->
            <div class="exposed-zone player-exposed">
              <div v-for="(set, idx) in players[0]?.exposedSets" :key="idx" class="exposed-set">
                <span v-for="(tile, i) in set.tiles" :key="i" class="exposed-tile" :class="getTileClass(tile)">
                  <span class="tile-num">{{ getTileNumber(tile) }}</span>
                  <span v-if="tile.color === 'man'" class="wan">萬</span>
                  <span v-else-if="tile.color === 'pin'" class="ping">筒</span>
                  <span v-else-if="tile.color === 'sou'" class="sou">索</span>
                </span>
              </div>
            </div>

            <!-- 手牌区 -->
            <div class="hand-zone">
              <!-- 手牌 -->
              <div class="hand-cards">
                <!-- 摸到的牌（突出显示，整合到手牌行） -->
                <div v-if="drawnTile" class="tile card-tile drawn-tile" :class="getTileClass(drawnTile)" @click="handleDrawnTileClick">
                  <span class="tile-num">{{ getTileNumber(drawnTile) }}</span>
                  <span v-if="drawnTile.color === 'man'" class="wan">萬</span>
                  <span v-else-if="drawnTile.color === 'pin'" class="ping">筒</span>
                  <span v-else-if="drawnTile.color === 'sou'" class="sou">索</span>
                </div>

                <div v-for="(tile, idx) in playerHand" :key="idx"
                     class="tile card-tile"
                     :class="[getTileClass(tile), { 'selected': selectedDiscard === idx }]"
                     :style="{ marginLeft: getTileMargin(idx) }"
                     @click="handleTileClick(idx)">
                  <span class="tile-num">{{ getTileNumber(tile) }}</span>
                  <span v-if="tile.color === 'man'" class="wan">萬</span>
                  <span v-else-if="tile.color === 'pin'" class="ping">筒</span>
                  <span v-else-if="tile.color === 'sou'" class="sou">索</span>
                </div>
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
    <el-dialog v-model="showResultDialog" :show-close="false" width="400px" class="result-dialog">
      <div class="result-content" :class="resultClass">
        <div class="result-icon">
          <el-icon v-if="resultClass === 'win'"><Trophy /></el-icon>
          <el-icon v-else-if="resultClass === 'loss'"><CircleClose /></el-icon>
          <el-icon v-else><WarningFilled /></el-icon>
        </div>
        <h2>{{ resultTitle }}</h2>
        <div class="result-info">
          <p><span class="label">和牌者：</span>{{ winnerName }}</p>
          <p><span class="label">牌型：</span>{{ agariType }}</p>
          <p><span class="label">番数：</span><span class="fan">{{ fanCount }} 番</span></p>
          <p><span class="label">得分：</span><span class="score">{{ scoreChange }}</span></p>
        </div>
      </div>
      <template #footer>
        <el-button v-if="!isGameOver" type="primary" @click="closeResultDialog" round size="large">继续</el-button>
        <el-button v-else type="danger" @click="resetGame" round size="large">重新开始</el-button>
      </template>
    </el-dialog>

    <!-- 查看已出牌 -->
    <el-dialog v-model="showAllDiscards" title="已出牌" :close-on-click-modal="true" width="500px" class="discards-dialog">
      <div class="discards-content">
        <div class="discards-grid">
          <div v-for="(tile, idx) in discardPool" :key="idx"
               class="discard-tile"
               :class="getTileClass(tile)">
            <span class="tile-num">{{ getTileNumber(tile) }}</span>
            <span v-if="tile.color === 'man'" class="wan">萬</span>
            <span v-else-if="tile.color === 'pin'" class="ping">筒</span>
            <span v-else-if="tile.color === 'sou'" class="sou">索</span>
          </div>
        </div>
        <div class="discards-summary">
          <span>共 {{ discardPool.length }} 张</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import {
  RefreshRight, Van, Monitor, User, Trophy, CircleClose, WarningFilled
} from '@element-plus/icons-vue'
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

const getTileClass = (tile) => {
  if (!tile) return ''
  // 返回花色类型
  return `tile-${tile.color}`
}

const getTileType = (tile) => {
  if (!tile) return ''
  return tile.color
}

const getTileNumber = (tile) => {
  if (!tile) return ''
  // 字牌直接显示
  if (tile.color === 'ji') return tile.display
  // 数牌显示数字
  return tile.index.toString()
}

const getHandCount = (playerId) => {
  if (players.value[playerId]?.isFolded) return 0
  return players.value[playerId]?.hand?.length || 13
}

const getTileMargin = (idx) => {
  // 紧凑排列，不需要额外间距
  return '0px'
}

// 开始游戏
const startGame = () => {
  players.value = [
    { id: 0, name: '你', score: initialScore.value, hand: [], exposedSets: [], isFolded: false, isDealer: isDealer.value },
    new AIPlayer(1, 'AI 上家', aiConfig[aiDifficulty.value]),
    new AIPlayer(2, 'AI 对家', aiConfig[aiDifficulty.value]),
    new AIPlayer(3, 'AI 下家', aiConfig[aiDifficulty.value])
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
  gameState.value = 'ai_thinking'
  const ai = players.value[currentPlayer.value]

  // 确保 AI 手牌数量正确
  if (ai.hand.length < 13) {
    console.error('AI 手牌数量不足:', ai.hand.length)
    handleExhaustedDraw()
    return
  }

  await nextTick()

  // 如果 AI 手牌是 13 张，先摸牌
  if (ai.hand.length === 13) {
    const drawnTile = deck.value.draw()
    if (!drawnTile) {
      handleExhaustedDraw()
      return
    }
    ai.addTile(drawnTile)
    remainingTiles.value = deck.value.remaining()

    // 稍微延迟，模拟思考
    setTimeout(async () => {
      // 传入 13 张手牌和摸到的牌
      const hand13 = ai.hand.slice(0, 13)
      const decision = await ai.think('draw', drawnTile, hand13)

      if (decision.tsumo) {
        endRound(ai.id, { type: '自摸', fan: 1, isZimo: true }, true)
        return
      }

      if (decision.discardIndex !== undefined) {
        const discarded = ai.discardTile(decision.discardIndex)
        if (discarded) {
          discardPool.value.push(discarded)
          lastDiscard.value = discarded
          lastDiscardFrom.value = ai.id
          checkNextAction(ai.id)
        }
      }
    }, ai.config.THINK_TIME)
  } else if (ai.hand.length === 14) {
    // AI 是庄家，已经有 14 张牌，直接打牌
    setTimeout(async () => {
      const decision = await ai.think('discard', null)

      if (decision.discardIndex !== undefined) {
        const discarded = ai.discardTile(decision.discardIndex)
        if (discarded) {
          discardPool.value.push(discarded)
          lastDiscard.value = discarded
          lastDiscardFrom.value = ai.id
          checkNextAction(ai.id)
        }
      }
    }, ai.config.THINK_TIME)
  }
}

// 检查下一步行动
const checkNextAction = (fromPlayer) => {
  // 按座位顺序，下一个玩家
  const nextPlayer = (fromPlayer + 1) % 4

  if (nextPlayer === 0) {
    // 玩家行动
    checkPlayerActions(lastDiscard.value)
  } else {
    // 检查 AI 是否可以碰、杠、胡
    checkAiActions(nextPlayer, lastDiscard.value)
  }
}

// 检查 AI 可执行操作
const checkAiActions = (aiIndex, tile) => {
  const ai = players.value[aiIndex]

  // 检查荣和
  const canRon = checkCanRon(ai.hand, tile, ai.exposedSets)
  if (canRon) {
    // AI 荣和
    setTimeout(() => {
      doAiRon(aiIndex)
    }, ai.config.THINK_TIME)
    return
  }

  // 检查碰
  const canPeng = canPon(ai.hand, tile)
  if (canPeng && Math.random() < ai.config.PON_PROBABILITY) {
    // AI 碰
    setTimeout(() => {
      doAiPeng(aiIndex)
    }, ai.config.THINK_TIME)
    return
  }

  // 检查杠
  const canGang = canDaiminkan(ai.hand, tile)
  if (canGang && Math.random() < 0.75) {
    // AI 杠
    setTimeout(() => {
      doAiGang(aiIndex)
    }, ai.config.THINK_TIME)
    return
  }

  // 检查吃（只能吃上家的牌）
  const chiPatterns = canChii(ai.hand, tile)
  const canChi = chiPatterns.length > 0 && ((aiIndex === 2 && fromPlayer === 1) || (aiIndex === 3 && fromPlayer === 2) || (aiIndex === 1 && fromPlayer === 0))
  if (canChi && Math.random() < ai.config.CHII_PROBABILITY) {
    // AI 吃
    setTimeout(() => {
      doAiChi(aiIndex, chiPatterns[0].tiles)
    }, ai.config.THINK_TIME)
    return
  }

  // 没有特殊操作，轮到下家
  setTimeout(() => {
    const nextPlayer = (aiIndex + 1) % 4
    if (nextPlayer === 0) {
      // 玩家摸牌
      playerDrawPhase()
    } else {
      // 继续检查下家
      currentPlayer.value = nextPlayer
      aiTurn()
    }
  }, 100)
}

// AI 碰
const doAiPeng = (aiIndex) => {
  const ai = players.value[aiIndex]
  const tile = lastDiscard.value

  // 从手牌中移除两张相同的牌
  let removed = 0
  for (let i = ai.hand.length - 1; i >= 0 && removed < 2; i--) {
    if (ai.hand[i].value === tile.value) {
      ai.hand.splice(i, 1)
      removed++
    }
  }

  ai.exposedSets.push({ type: 'pon', tiles: [tile, tile, tile] })

  // 从 discardPool 移除最后一张牌
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 碰后打牌
  setTimeout(() => {
    const decision = ai.think('discard', null)
    const discarded = ai.discardTile(decision.discardIndex || 0)
    if (discarded) {
      discardPool.value.push(discarded)
      lastDiscard.value = discarded
      lastDiscardFrom.value = aiIndex
      checkNextAction(aiIndex)
    }
  }, ai.config.THINK_TIME)
}

// AI 杠
const doAiGang = (aiIndex) => {
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

  // 杠后摸牌
  const drawnTile = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  setTimeout(() => {
    const testHand = [...ai.hand, drawnTile]
    const result = checkAgari(testHand)
    if (result.agari) {
      endRound(aiIndex, { type: '杠上开花', fan: 3, isZimo: true }, true)
      return
    }

    // 打牌
    const decision = ai.think('discard', null)
    const discarded = ai.discardTile(decision.discardIndex || 0)
    if (discarded) {
      discardPool.value.push(discarded)
      lastDiscard.value = discarded
      lastDiscardFrom.value = aiIndex
      checkNextAction(aiIndex)
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
const doAiChi = (aiIndex, tiles) => {
  const ai = players.value[aiIndex]
  const tile = lastDiscard.value

  // 从手牌中移除用于吃的两张牌
  for (const idx of tiles) {
    const tileIdx = ai.hand.findIndex(t => t.type === tile.type && t.index === idx)
    if (tileIdx >= 0) {
      ai.hand.splice(tileIdx, 1)
    }
  }

  ai.exposedSets.push({ type: 'chi', tiles: [tile] })

  // 从 discardPool 移除最后一张牌
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 吃后打牌
  setTimeout(() => {
    const decision = ai.think('discard', null)
    const discarded = ai.discardTile(decision.discardIndex || 0)
    if (discarded) {
      discardPool.value.push(discarded)
      lastDiscard.value = discarded
      lastDiscardFrom.value = aiIndex
      checkNextAction(aiIndex)
    }
  }, ai.config.THINK_TIME)
}

// 检查玩家可执行操作
const checkPlayerActions = (tile) => {
  gameState.value = 'player_action'
  currentPlayer.value = 0

  // 检查荣和
  canRon.value = checkCanRon(playerHand.value, tile, players.value[0].exposedSets)

  // 检查碰
  canPeng.value = canPon(playerHand.value, tile)

  // 检查杠
  canGang.value = canDaiminkan(playerHand.value, tile)

  // 检查吃（只能吃上家的牌）
  const chiPatterns = canChii(playerHand.value, tile)
  canChi.value = chiPatterns.length > 0 && lastDiscardFrom.value === 1

  if (canChi.value) {
    chiOptions.value = chiPatterns.map(p => ({
      pattern: formatChiPattern(p.tiles)
    }))
  }

  showPassOption.value = canRon.value || canPeng.value || canGang.value || canChi.value

  // 如果没有特殊操作，进入摸牌阶段
  if (!canRon.value && !canPeng.value && !canGang.value && !canChi.value) {
    playerDrawPhase()
  } else {
    message.value = '请选择操作'
  }
}

// 玩家摸牌
const playerDrawPhase = () => {
  gameState.value = 'player_turn'
  drawnTile.value = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  if (!drawnTile.value) {
    handleExhaustedDraw()
    return
  }

  // 摸牌后先不加入手牌，单独显示
  // 检查是否能自摸（14 张牌）
  const testHand = [...playerHand.value, drawnTile.value]
  const result = checkAgari(testHand)
  if (result.agari) {
    canZimo.value = true
    message.value = '可以自摸！'
  }

  const ankanTiles = canAnkan(testHand)
  if (ankanTiles.length > 0) canGang.value = true

  canDiscard.value = true
  canSelectDiscard.value = true
  message.value = '请选择要打出的牌'
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
  if (chiOptions.value.length === 1) {
    completeChi(0)
  } else {
    showChiDialog.value = true
  }
}

const selectChi = (idx) => {
  showChiDialog.value = false
  completeChi(idx)
}

const completeChi = (idx) => {
  const tile = lastDiscard.value
  const option = chiOptions.value[idx]

  // 从手牌中移除用于吃的两张牌
  for (let i = playerHand.value.length - 1; i >= 0; i--) {
    if (option.tiles.includes(playerHand.value[i].index)) {
      playerHand.value.splice(i, 1)
    }
  }

  players.value[0].exposedSets.push({ type: 'chi', tiles: [tile] })
  players.value[0].hand = playerHand.value

  // 从 discardPool 移除最后一张牌（被吃的牌）
  if (discardPool.value.length > 0) {
    discardPool.value.pop()
  }

  // 重置其他操作状态
  canRon.value = false
  canPeng.value = false
  canGang.value = false
  canChi.value = false
  showPassOption.value = false

  gameState.value = 'player_turn'
  canDiscard.value = true
  canSelectDiscard.value = true
  selectedDiscard.value = -1
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

  // 重置其他操作状态
  canRon.value = false
  canPeng.value = false
  canGang.value = false
  canChi.value = false
  showPassOption.value = false

  message.value = `碰了 ${tile.display}`
  gameState.value = 'player_turn'
  canDiscard.value = true
  canSelectDiscard.value = true
  selectedDiscard.value = -1
  currentPlayer.value = 0
  message.value = '请选择要打出的牌'
}

// 杠
const doGang = () => {
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

  // 重置其他操作状态
  canRon.value = false
  canPeng.value = false
  canGang.value = false
  canChi.value = false
  showPassOption.value = false

  // 杠后摸牌
  drawnTile.value = deck.value.draw()
  remainingTiles.value = deck.value.remaining()

  const result = checkAgari([...playerHand.value, drawnTile.value])
  if (result.agari) {
    doZimo()
    return
  }

  gameState.value = 'player_turn'
  canDiscard.value = true
  canSelectDiscard.value = true
  selectedDiscard.value = -1
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
  currentPlayer.value = (currentPlayer.value + 1) % 4

  if (currentPlayer.value === 0) {
    playerDrawPhase()
  } else {
    aiTurn()
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
  padding: 10px;
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
  max-height: 100%;
  aspect-ratio: 16/10;
  background: #15803d;
  border-radius: 40px;
  border: 12px solid #374151;
  position: relative;
  box-shadow: inset 0 0 100px rgba(0,0,0,0.4);
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
  gap: 4px;
  padding: 0;
  transition: all 0.3s;
  max-width: 200px;
  max-height: 40%;
  overflow: hidden;
}

.ai-zone.active {
  background: rgba(250, 204, 21, 0.15);
  border-radius: 12px;
}

.top-zone {
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
}

.left-zone {
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.right-zone {
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.player-info-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.95);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.player-info-box .avatar {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
}

.player-info-box .info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: transparent;
  padding: 0;
}

.player-info-box .top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.player-info-box .name {
  color: #1e293b;
  font-size: 0.8rem;
  font-weight: 700;
}

.player-info-box .score {
  color: #f59e0b;
  font-size: 0.85rem;
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

/* AI 区域的信息框保持纵向 */
.ai-zone .player-info-box {
  flex-direction: row;
  background: transparent;
  padding: 0;
  box-shadow: none;
  align-items: center;
  gap: 4px;
}

.ai-zone .player-info-box .avatar {
  width: 24px;
  height: 24px;
  background: #ffffff;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-zone .player-info-box .info {
  background: rgba(255,255,255,0.95);
  padding: 2px 6px;
  border-radius: 10px;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ai-zone .player-info-box .info .name {
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
}

.ai-zone .player-info-box .info .score {
  font-size: 0.65rem;
  font-weight: 800;
  color: #f59e0b;
  white-space: nowrap;
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

.tile-back {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.3);
  flex-shrink: 0;
}

.h-tile {
  width: 20px;
  height: 26px;
}

.v-tile {
  width: 18px;
  height: 24px;
}

/* 副露 */
.exposed-zone {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.exposed-zone.vertical {
  flex-direction: column;
}

.exposed-set {
  display: flex;
  gap: 2px;
}

.exposed-tile {
  width: 42px;
  height: 56px;
  background: linear-gradient(180deg, #fefefe, #f5f5f5);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  border: 1px solid #d0d0d0;
  box-shadow: 1px 2px 4px rgba(0,0,0,0.2);
  position: relative;
}

.exposed-tile .tile-num {
  font-size: 1.3rem;
  font-weight: 900;
}

.exposed-tile.tile-man .tile-num {
  color: #dc2626;
  font-size: 1.6rem;
}

.exposed-tile.tile-man .wan {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 1rem;
  color: #dc2626;
  font-weight: 900;
}

.exposed-tile.tile-pin .tile-num {
  color: #2563eb;
  font-size: 1.6rem;
}

.exposed-tile.tile-pin .ping {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.85rem;
  color: #2563eb;
  font-weight: 900;
}

.exposed-tile.tile-sou .tile-num {
  color: #16a34a;
  font-size: 1.6rem;
}

.exposed-tile.tile-sou .sou {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 1rem;
  color: #16a34a;
  font-weight: 900;
}

.exposed-tile.tile-ji .tile-num {
  font-size: 1.4rem;
}

.exposed-tile.tile-ji .tile-num.red {
  color: #dc2626;
}

.exposed-tile.tile-ji .tile-num.green {
  color: #16a34a;
}

.exposed-tile.tile-ji .tile-num.black {
  color: #1e293b;
}

.exposed-tile.small {
  width: 32px;
  height: 44px;
  font-size: 0.85rem;
}

.exposed-tile.small .tile-num {
  font-size: 1rem;
}

.exposed-tile.small .wan,
.exposed-tile.small .ping,
.exposed-tile.small .sou {
  font-size: 0.7rem;
  bottom: 3px;
  right: 3px;
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
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
}

.remaining-tiles .count {
  color: #fbbf24;
  font-size: 0.85rem;
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
  width: 10px;
  height: 14px;
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
  gap: 3px;
  padding: 8px;
  background: rgba(255,255,255,0.5);
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1);
}

.discard-tile {
  width: 42px;
  height: 56px;
  background: linear-gradient(180deg, #fefefe, #f5f5f5);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  border: 1px solid #d0d0d0;
  box-shadow: 1px 2px 4px rgba(0,0,0,0.2);
  position: relative;
}

.discard-tile .tile-num {
  font-size: 1.3rem;
  font-weight: 900;
}

.discard-tile.tile-man .tile-num {
  color: #dc2626;
  font-size: 1.6rem;
}

.discard-tile.tile-man .wan {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 1rem;
  color: #dc2626;
  font-weight: 900;
}

.discard-tile.tile-pin .tile-num {
  color: #2563eb;
  font-size: 1.6rem;
}

.discard-tile.tile-pin .ping {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.85rem;
  color: #2563eb;
  font-weight: 900;
}

.discard-tile.tile-sou .tile-num {
  color: #16a34a;
  font-size: 1.6rem;
}

.discard-tile.tile-sou .sou {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 1rem;
  color: #16a34a;
  font-weight: 900;
}

.discard-tile.tile-ji .tile-num {
  font-size: 1.4rem;
}

.discard-tile.tile-ji .tile-num.red {
  color: #dc2626;
}

.discard-tile.tile-ji .tile-num.green {
  color: #16a34a;
}

.discard-tile.tile-ji .tile-num.black {
  color: #1e293b;
}

.discard-tile.last {
  box-shadow: 0 0 6px rgba(250, 204, 21, 0.6);
  border-color: #fbbf24;
}

.status-message {
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  min-height: 16px;
  padding: 4px 12px;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
}

/* 玩家区域 */
.player-zone {
  position: absolute;
  bottom: 10px;
  left: 18%;
  right: 18%;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0,0,0,0.15);
  border-radius: 16px;
  transition: all 0.3s;
  max-width: calc(100% - 20px);
}

.player-zone.active {
  background: rgba(250, 204, 21, 0.2);
}

.player-exposed {
  margin-bottom: 4px;
}

/* 手牌区 */
.hand-zone {
  display: flex;
  align-items: flex-start;
  gap: 3px;
  max-width: 100%;
  overflow: visible;
  padding-bottom: 4px;
  justify-content: center;
  min-height: 124px; /* 两行牌 + gap 的高度 */
}

.hand-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 90%;
  line-height: 1;
}

.drawn-tile {
  border: 2px solid #fbbf24;
  position: relative;
}

.drawn-tile::after {
  content: '摸';
  position: absolute;
  bottom: -12px;
  font-size: 0.45rem;
  color: #fbbf24;
  font-weight: 700;
}

/* 麻将牌基础样式 */
.tile {
  width: 38px;
  height: 52px;
  background: linear-gradient(180deg, #fefefe, #f5f5f5);
  border-radius: 6px;
  font-size: 1.2rem;
  font-weight: 900;
  border: 1px solid #d0d0d0;
  box-shadow:
    2px 3px 6px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.8);
  position: relative;
  cursor: default;
  transition: all 0.2s;
  flex-shrink: 0;
  overflow: hidden;
}

/* 数字左上角显示 */
.tile-num {
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1;
  display: block;
  position: absolute;
  top: 4px;
  left: 4px;
}

/* 万子 - 红色数字 + 万字符 */
.tile-man {
  background: linear-gradient(180deg, #fff5f5, #fefefe);
}

.tile-man .tile-num {
  color: #dc2626;
  font-size: 1.5rem;
}

.tile-man .wan {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 1.3rem;
  color: #dc2626;
  font-weight: 900;
}

/* 筒子 - 显示圆点 */
.tile-pin {
  background: linear-gradient(180deg, #fefefe, #f5f5f5);
}

.tile-pin .tile-num {
  color: #2563eb;
  font-size: 1.5rem;
}

.tile-pin .ping {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 1.2rem;
  color: #2563eb;
  font-weight: 900;
}

/* 索子 - 绿色数字 */
.tile-sou {
  background: linear-gradient(180deg, #fefefe, #f5f5f5);
}

.tile-sou .tile-num {
  color: #16a34a;
  font-size: 1.5rem;
}

.tile-sou .sou {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 1.3rem;
  color: #16a34a;
  font-weight: 900;
}

/* 字牌 - 文字居中显示 */
.tile-ji {
  background: linear-gradient(180deg, #fefefe, #f5f5f5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-ji .tile-num {
  position: static;
  font-size: 1.1rem;
}

/* 小屏幕手牌两行显示，无滚动条 */
@media (max-width: 768px) {
  .hand-zone {
    overflow: visible;
    padding-bottom: 8px;
    min-height: 108px; /* 两行牌 + gap 的高度 */
    width: 100%;
  }

  .hand-cards {
    gap: 3px;
    justify-content: center;
    max-width: 100%;
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
  }

  .tile {
    width: 28px;
    height: 40px;
    border-radius: 4px;
    flex-shrink: 0;
    display: inline-block;
    position: relative;
  }

  /* 数字左上角显示 - 调小字体 */
  .tile-num {
    font-size: 0.55rem !important;
    font-weight: 900;
    line-height: 1;
    display: block;
    position: absolute !important;
    top: 2px !important;
    left: 2px !important;
  }

  .tile-man .tile-num {
    color: #dc2626;
    font-size: 0.75rem !important;
  }

  .tile-pin .tile-num {
    color: #2563eb;
    font-size: 0.75rem !important;
  }

  .tile-sou .tile-num {
    color: #16a34a;
    font-size: 0.75rem !important;
  }

  /* 小屏幕字牌居中显示 */
  .tile-ji {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .tile-ji .tile-num {
    color: #1e293b;
    font-size: 0.75rem !important;
    font-weight: 900;
    position: static !important;
    top: auto !important;
    left: auto !important;
  }

  /* 类型标识在右下角 - 调大字体 */
  .tile-man .wan,
  .tile-pin .ping,
  .tile-sou .sou {
    font-size: 0.6rem !important;
    font-weight: 900;
    position: absolute !important;
    bottom: 2px !important;
    right: 2px !important;
  }

  .tile-man .wan {
    color: #dc2626;
  }

  .tile-pin .ping {
    color: #2563eb;
  }

  .tile-sou .sou {
    color: #16a34a;
  }

  .drawn-tile::after {
    bottom: -8px;
    font-size: 0.3rem;
  }

  .discard-tile {
    width: 20px;
    height: 28px;
    font-size: 0.65rem;
    position: relative;
  }

  .discard-tile .tile-num {
    font-size: 0.6rem !important;
    position: absolute !important;
    top: 2px !important;
    left: 2px !important;
  }

  .discard-tile.tile-man .wan,
  .discard-tile.tile-pin .ping,
  .discard-tile.tile-sou .sou {
    font-size: 0.5rem !important;
    position: absolute !important;
    bottom: 2px !important;
    right: 2px !important;
  }

  .discard-tile.tile-ji .tile-num {
    position: static !important;
    font-size: 0.75rem !important;
  }

  .exposed-tile {
    width: 32px;
    height: 42px;
    font-size: 0.7rem;
    position: relative;
  }

  .exposed-tile .tile-num {
    font-size: 0.6rem !important;
    position: absolute !important;
    top: 2px !important;
    left: 2px !important;
  }

  .exposed-tile.tile-man .wan,
  .exposed-tile.tile-pin .ping,
  .exposed-tile.tile-sou .sou {
    font-size: 0.5rem !important;
    position: absolute !important;
    bottom: 2px !important;
    right: 2px !important;
  }

  .exposed-tile.tile-ji .tile-num {
    position: static !important;
    font-size: 0.8rem !important;
  }
}

/* 超小屏幕进一步缩放 */
@media (max-width: 480px) {
  /* 剩余牌和弃牌区移到左上角 */
  .center-zone {
    position: absolute;
    top: 10px;
    left: 10px;
    transform: none;
    align-items: flex-start;
    max-width: 150px;
  }

  .remaining-tiles {
    padding: 3px 8px;
    font-size: 0.65rem;
  }

  .wall-zone {
    display: none;
  }

  .discard-zone {
    justify-content: flex-start;
  }

  .discard-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 2px;
    padding: 4px;
    background: rgba(255,255,255,0.4);
  }

  .discard-tile {
    width: 18px;
    height: 24px;
    font-size: 0.6rem;
    position: relative;
  }

  .discard-tile .tile-num {
    font-size: 0.55rem !important;
    position: absolute !important;
    top: 1px !important;
    left: 1px !important;
  }

  .discard-tile.tile-man .wan,
  .discard-tile.tile-pin .ping,
  .discard-tile.tile-sou .sou {
    font-size: 0.45rem !important;
    position: absolute !important;
    bottom: 1px !important;
    right: 1px !important;
  }

  .discard-tile.tile-ji .tile-num {
    position: static !important;
    font-size: 0.7rem !important;
  }

  .exposed-tile {
    width: 28px;
    height: 38px;
    font-size: 0.65rem;
    position: relative;
  }

  .exposed-tile .tile-num {
    font-size: 0.55rem !important;
    position: absolute !important;
    top: 1px !important;
    left: 1px !important;
  }

  .exposed-tile.tile-man .wan,
  .exposed-tile.tile-pin .ping,
  .exposed-tile.tile-sou .sou {
    font-size: 0.45rem !important;
    position: absolute !important;
    bottom: 1px !important;
    right: 1px !important;
  }

  .exposed-tile.tile-ji .tile-num {
    position: static !important;
    font-size: 0.7rem !important;
  }

  .status-message {
    font-size: 0.65rem;
    padding: 3px 8px;
    margin-top: 5px;
  }

  .hand-zone {
    min-height: 50px;
    margin-top: 5px;
  }

  .hand-cards {
    gap: 2px;
  }

  .tile {
    width: 24px;
    height: 32px;
    font-size: 1rem;
    border-radius: 4px;
    flex-shrink: 0;
    position: relative;
  }

  .tile-ji {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .tile-ji .tile-num {
    position: static !important;
    font-size: 1rem;
    font-weight: 900;
  }

  .tile-num {
    font-size: 0.8rem !important;
    font-weight: 900;
    position: absolute !important;
    top: 1px !important;
    left: 1px !important;
  }

  .tile-man .tile-num {
    font-size: 1rem !important;
  }

  .tile-pin .tile-num {
    font-size: 1rem !important;
  }

  .tile-sou .tile-num {
    font-size: 1rem !important;
  }

  .tile-man .wan,
  .tile-pin .ping,
  .tile-sou .sou {
    font-size: 0.8rem !important;
    position: absolute !important;
    bottom: 1px !important;
    right: 1px !important;
  }

  .drawn-tile-container .tile {
    width: 22px;
    height: 30px;
    font-size: 1rem;
  }

  .btn {
    padding: 6px 10px;
    font-size: 0.75rem;
  }

  .actions {
    gap: 4px;
  }

  /* 对家位置往下移 */
  .top-zone {
    top: 70px;
  }

  /* AI 区域适配 */
  .ai-zone {
    transform: scale(0.8);
  }

  /* 左侧 AI 适配 */
  .left-zone {
    top: 180px;
  }

  /* 右侧 AI 适配 */
  .right-zone {
    top: 180px;
  }
}

/* 大屏时手牌最多显示两行 */
@media (min-width: 769px) {
  .hand-cards {
    max-width: 600px;
    gap: 8px;
  }

  .tile {
    width: 40px;
    height: 54px;
    font-size: 1.3rem;
  }

  /* 数字左上角显示 */
  .tile-num {
    font-size: 1rem;
    font-weight: 900;
    line-height: 1;
    display: block;
    position: absolute;
    top: 4px;
    left: 4px;
  }

  /* 万子 */
  .tile-man .tile-num {
    color: #dc2626;
    font-size: 1.6rem;
  }

  .tile-man .wan {
    position: absolute;
    bottom: 5px;
    right: 5px;
    font-size: 1.4rem;
    color: #dc2626;
    font-weight: 900;
  }

  /* 筒子 */
  .tile-pin .tile-num {
    color: #2563eb;
    font-size: 1.6rem;
  }

  .tile-pin .ping {
    position: absolute;
    bottom: 5px;
    right: 5px;
    font-size: 1.3rem;
    color: #2563eb;
    font-weight: 900;
  }

  /* 索子 */
  .tile-sou .tile-num {
    color: #16a34a;
    font-size: 1.6rem;
  }

  .tile-sou .sou {
    position: absolute;
    bottom: 5px;
    right: 5px;
    font-size: 1.4rem;
    color: #16a34a;
    font-weight: 900;
  }

  /* 字牌 - 居中显示 */
  .tile-ji {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tile-ji .tile-num {
    position: static;
    font-size: 1.2rem;
  }
}

/* selected 状态 */
.tile.selected {
  transform: translateY(-12px);
  box-shadow:
    0 8px 20px rgba(59, 130, 246, 0.5),
    inset 0 1px 0 rgba(255,255,255,0.9);
  border-color: #3b82f6;
}

.tile.card-tile:hover {
  transform: translateY(-8px);
  box-shadow:
    3px 6px 12px rgba(0,0,0,0.35),
    inset 0 1px 0 rgba(255,255,255,0.9);
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

.h-tile {
  width: 20px;
  height: 26px;
}

.v-tile {
  width: 18px;
  height: 24px;
}

/* 操作栏 */
.action-bar {
  height: 70px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  flex-shrink: 0;
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
  padding: 12px 22px;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.9rem;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 3px 0 rgba(0,0,0,0.2);
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

/* 结果对话框 */
.result-content {
  text-align: center;
  padding: 10px;
}

.result-icon {
  font-size: 3rem;
  margin-bottom: 10px;
}

.win .result-icon { color: #fbbf24; }
.loss .result-icon { color: #ef4444; }

.result-content h2 {
  font-size: 1.4rem;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 16px;
}

.result-info {
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1.5px solid #e2e8f0;
}

.result-info p {
  display: flex;
  justify-content: space-between;
  margin: 0;
  font-size: 0.85rem;
}

.result-info .label {
  color: #64748b;
  font-weight: 700;
}

.result-info .fan {
  color: #f59e0b;
  font-weight: 800;
}

.result-info .score {
  color: #22c55e;
  font-weight: 900;
}

/* 查看已出牌按钮 */
.view-discards-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 8px;
}

.view-discards-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.1);
}

/* 已出牌对话框 */
.discards-dialog .el-dialog__body {
  padding: 0;
}

.discards-content {
  padding: 20px;
}

.discards-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  background: rgba(255,255,255,0.5);
  border-radius: 8px;
}

.discards-grid .discard-tile {
  width: 24px;
  height: 32px;
  margin: 0;
}

.discards-summary {
  text-align: center;
  margin-top: 12px;
  padding: 8px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #64748b;
}
</style>
