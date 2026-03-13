/**
 * 麻将 AI 逻辑 - 广东麻将
 * 基于牌效算法的 AI 决策
 */

import {
  TILE_TYPE, TILE_VALUE,
  checkAgari, canChii, canPon, canDaiminkan, canRon,
  isShuntsu, isKotsu, isYan,
  sortHand
} from './mahjong'

/**
 * AI 配置
 */
export const AI_CONFIG = {
  THINK_TIME: 800,           // 思考时间（毫秒）
  CHII_PROBABILITY: 0.6,     // 吃牌概率（广东麻将吃牌较谨慎）
  PON_PROBABILITY: 0.85,     // 碰牌概率
  AGGRESSIVE: 0.5            // 进攻性（0-1）
}

/**
 * 评估手牌的价值（广东麻将）
 */
export function evaluateHandValue(hand) {
  let value = 0
  const counts = {}

  // 统计牌
  for (const tile of hand) {
    const key = `${tile.type}-${tile.index}`
    counts[key] = (counts[key] || 0) + 1
  }

  // 对子价值（广东麻将重视对子，容易碰牌）
  for (const key in counts) {
    if (counts[key] === 2) value += 4
    if (counts[key] === 3) value += 8
    if (counts[key] === 4) value += 12
  }

  // 搭子价值
  value += evaluateShapes(hand)

  // 字牌价值
  value += evaluateZihai(hand)

  // 幺九牌价值
  value += evaluateYaojiu(hand)

  return value
}

/**
 * 评估搭子（顺子潜力）
 */
function evaluateShapes(hand) {
  let value = 0

  // 分组
  const byType = {}
  for (const tile of hand) {
    if (!byType[tile.type]) byType[tile.type] = []
    byType[tile.type].push(tile.index)
  }

  // 评估每种花色的搭子
  for (const type of [TILE_TYPE.MANZU, TILE_TYPE.PINZU, TILE_TYPE.SOUZU]) {
    const indices = (byType[type] || []).sort((a, b) => a - b)

    // 检查两面搭子（最好）
    for (let i = 0; i < indices.length - 1; i++) {
      const diff = indices[i + 1] - indices[i]
      if (diff === 1) {
        // 两面搭子：如 34，可以等 2 或 5
        value += 3
      } else if (diff === 2) {
        // 坎张搭子：如 35，等 4
        value += 1.5
      }
    }

    // 检查边张搭子
    if (indices.includes(1) && indices.includes(2)) value += 1  // 12 边张
    if (indices.includes(8) && indices.includes(9)) value += 1  // 89 边张
  }

  return value
}

/**
 * 评估字牌价值
 */
function evaluateZihai(hand) {
  let value = 0
  const zihai = hand.filter(t => t.type === TILE_TYPE.JIHAI)
  const counts = {}

  for (const tile of zihai) {
    counts[tile.value] = (counts[tile.value] || 0) + 1
  }

  for (const val in counts) {
    if (counts[val] === 1) {
      value -= 1  // 单张字牌价值低，想打掉
    } else if (counts[val] === 2) {
      value += 5  // 字牌对子价值高，容易碰
    } else if (counts[val] >= 3) {
      value += 10 // 字牌刻子
    }
  }

  return value
}

/**
 * 评估幺九牌
 */
function evaluateYaojiu(hand) {
  let value = 0
  const yaojiu = hand.filter(t => t.index === 1 || t.index === 9 || t.type === TILE_TYPE.JIHAI)

  // 幺九牌多可能做混全带、全带幺
  if (yaojiu.length >= 8) {
    value += 3
  }
  if (yaojiu.length >= 10) {
    value += 6
  }

  return value
}

/**
 * 计算向听数（简化版，广东麻将）
 */
export function calculateShanten(hand) {
  if (hand.length < 2) return 8

  // 数对子数
  const counts = {}
  for (const tile of hand) {
    const key = `${tile.type}-${tile.index}`
    counts[key] = (counts[key] || 0) + 1
  }

  let pairs = 0
  let sets = 0

  for (const key in counts) {
    if (counts[key] >= 2) pairs++
    if (counts[key] >= 3) sets++
  }

  // 向听数 = 4 - (面子数 + max(1, 对子数))
  const shanten = 4 - Math.min(sets, 4) - Math.min(1, pairs)

  return Math.max(0, shanten)
}

/**
 * 计算有效进张数（简化版）
 */
export function calculateUkeire(hand) {
  const ukeire = []
  const allTiles = []

  // 生成所有可能的牌
  for (let type = 0; type < 3; type++) {
    for (let i = 1; i <= 9; i++) {
      allTiles.push({ type: [TILE_TYPE.MANZU, TILE_TYPE.PINZU, TILE_TYPE.SOUZU][type], index: i })
    }
  }
  for (let v of [31, 32, 33, 34, 35, 36, 37]) {
    allTiles.push({ type: TILE_TYPE.JIHAI, value: v })
  }

  // 统计手牌
  const handCounts = {}
  for (const tile of hand) {
    const key = `${tile.type}-${tile.index || tile.value}`
    handCounts[key] = (handCounts[key] || 0) + 1
  }

  // 检查每种牌
  for (const t of allTiles) {
    const key = `${t.type}-${t.index || t.value}`
    if ((handCounts[key] || 0) >= 4) continue

    // 检查是否能改善手牌
    const improves = checkImproves(hand, t)
    if (improves) {
      ukeire.push({
        ...t,
        count: 4 - (handCounts[key] || 0),
        improvement: improves
      })
    }
  }

  return ukeire
}

/**
 * 检查进张是否改善手牌
 */
function checkImproves(hand, newTile) {
  // 检查是否形成对子
  const hasSame = hand.some(t => t.value === newTile.value)
  if (hasSame) return 'pair'

  // 检查是否形成顺子搭子
  if (newTile.type !== TILE_TYPE.JIHAI) {
    const indices = hand.filter(t => t.type === newTile.type).map(t => t.index)
    for (const idx of indices) {
      if (Math.abs(idx - newTile.index) <= 2) {
        return 'shape'
      }
    }
  }

  return null
}

/**
 * AI 选择打出的牌
 */
export function aiSelectDiscard(hand, config = {}) {
  if (hand.length === 0) return 0

  const { aggressive = false } = config

  // 评估每张牌的价值
  const tileValues = hand.map((tile, index) => ({
    index,
    tile,
    value: evaluateTileForDiscard(tile, hand, aggressive)
  }))

  // 排序，选择价值最低的牌
  tileValues.sort((a, b) => a.value - b.value)

  // 从最低的几张里随机选（增加变化）
  const minValue = tileValues[0].value
  const candidates = tileValues.filter(t => t.value <= minValue + 2)
  const selected = candidates[Math.floor(Math.random() * candidates.length)]

  return selected.index
}

/**
 * 评估单张牌是否该打
 */
function evaluateTileForDiscard(tile, hand, aggressive) {
  let value = 0

  // 检查是否能组成对子
  const sameCount = hand.filter(t => t.value === tile.value && t !== tile).length
  if (sameCount >= 1) {
    value += 5  // 有对子价值高
  }

  // 检查是否能组成顺子
  if (tile.type !== TILE_TYPE.JIHAI) {
    const nearbyTiles = hand.filter(t =>
      t.type === tile.type &&
      t !== tile &&
      Math.abs(t.index - tile.index) <= 2
    )
    value += nearbyTiles.length * 2

    // 中张牌价值高
    if (tile.index >= 3 && tile.index <= 7) {
      value += 2
    }

    // 边张牌价值低
    if (tile.index === 1 || tile.index === 9) {
      value -= 1
    }
  }

  // 字牌
  if (tile.type === TILE_TYPE.JIHAI) {
    if (sameCount === 0) {
      value -= 3  // 单张字牌最想打
    } else {
      value += 4  // 字牌对子价值高
    }

    // 三元牌保留价值高
    if ([TILE_VALUE.WHITE, TILE_VALUE.GREEN, TILE_VALUE.RED].includes(tile.value)) {
      value += 2
    }

    // 圈风、门风价值高
    if ([TILE_VALUE.EAST, TILE_VALUE.SOUTH, TILE_VALUE.WEST, TILE_VALUE.NORTH].includes(tile.value)) {
      value += 1
    }
  }

  // 三元牌、风牌的价值
  if ([TILE_VALUE.RED, TILE_VALUE.GREEN].includes(tile.value)) {
    value += 3
  }

  return value
}

/**
 * AI 决定是否吃牌
 */
export function aiDecideChii(hand, discardedTile, exposedSets = [], config = {}) {
  const { chiiProbability = AI_CONFIG.CHII_PROBABILITY } = config

  const chiiPatterns = canChii(hand, discardedTile)
  if (chiiPatterns.length === 0) return { chii: false }

  // 评估吃牌后的改善
  let bestImprovement = 0
  let bestPattern = null

  for (const pattern of chiiPatterns) {
    // 模拟吃牌后的手牌
    let newHand = [...hand]
    // 移除用于吃的牌
    for (const idx of pattern.tiles) {
      const tileIdx = newHand.findIndex(t => t.type === discardedTile.type && t.index === idx)
      if (tileIdx >= 0) newHand.splice(tileIdx, 1)
    }
    newHand.push(discardedTile)

    const oldValue = evaluateHandValue(hand)
    const newValue = evaluateHandValue(newHand)
    const improvement = newValue - oldValue

    if (improvement > bestImprovement) {
      bestImprovement = improvement
      bestPattern = pattern
    }
  }

  // 根据改善程度和概率决定是否吃
  if (bestImprovement > 0 && Math.random() < chiiProbability) {
    return {
      chii: true,
      pattern: bestPattern.tiles
    }
  }

  // 如果听了，肯定吃
  const nextExposedSets = [...exposedSets, { type: 'chi', tiles: [discardedTile, ...hand.filter(t => t.type === discardedTile.type && bestPattern?.tiles.includes(t.index))] }]
  if (checkAgari(hand.filter(t => !(t.type === discardedTile.type && bestPattern?.tiles.includes(t.index))), nextExposedSets).agari) {
    return { chii: true, pattern: bestPattern?.tiles || chiiPatterns[0].tiles }
  }

  return { chii: false }
}

/**
 * AI 决定是否碰牌
 */
export function aiDecidePon(hand, discardedTile, exposedSets = [], config = {}) {
  const { ponProbability = AI_CONFIG.PON_PROBABILITY } = config

  if (!canPon(hand, discardedTile)) return { pon: false }

  // 检查是否已经有 3 张（考虑杠）
  const sameCount = hand.filter(t => t.value === discardedTile.value).length
  if (sameCount === 3) {
    return aiDecideDaiminkan(hand, discardedTile, config)
  }

  // 碰牌通常有利（形成刻子）
  // 但如果是字牌且想做清一色，可能不碰
  const isZihai = discardedTile.type === TILE_TYPE.JIHAI

  if (isZihai || Math.random() < ponProbability) {
    return { pon: true }
  }

  return { pon: false }
}

/**
 * AI 决定是否大明杠
 */
export function aiDecideDaiminkan(hand, discardedTile, config = {}) {
  if (!canDaiminkan(hand, discardedTile)) return { kan: false }

  // 杠牌通常有利（多摸岭上牌）
  if (Math.random() < 0.75) {
    return { kan: true }
  }

  return { kan: false }
}

/**
 * AI 决定是否加杠
 */
export function aiDecideKakan(hand, exposedSets, config = {}) {
  // 检查是否有可以加杠的牌
  for (const set of exposedSets) {
    if (set.type === 'pon' && set.tiles.length === 3) {
      const hasFourth = hand.some(t => t.value === set.tiles[0].value)
      if (hasFourth && Math.random() < 0.7) {
        return { kakan: true, tile: set.tiles[0] }
      }
    }
  }

  return { kakan: false }
}

/**
 * AI 决定是否暗杠
 */
export function aiDecideAnkan(hand, config = {}) {
  // 统计每种牌的数量
  const counts = {}
  for (const tile of hand) {
    counts[tile.value] = (counts[tile.value] || 0) + 1
  }

  // 找到可以暗杠的牌
  for (const value in counts) {
    if (counts[value] === 4) {
      const tile = hand.find(t => t.value === parseInt(value))
      if (tile && Math.random() < 0.85) {
        return {
          ankan: true,
          tile
        }
      }
    }
  }

  return { ankan: false }
}

/**
 * AI 决定是否荣和
 */
export function aiDecideRon(hand, discardedTile, exposedSets = [], config = {}) {
  // 能和牌一定和（广东麻将）
  return { ron: canRon(hand, discardedTile, exposedSets) }
}

/**
 * AI 决定是否自摸和
 */
export function aiDecideTsumo(hand, drawnTile, exposedSets = [], config = {}) {
  if (!drawnTile) return { tsumo: false }
  const testHand = [...hand, drawnTile]
  const result = checkAgari(testHand, exposedSets)
  return { tsumo: result.agari }
}

/**
 * AI 摸牌后决定打出哪张
 */
export function aiAfterDraw(hand, drawnTile, exposedSets = [], config = {}) {
  if (!drawnTile) {
    // 没有摸到牌，随机打出一张
    return { discardIndex: Math.floor(Math.random() * hand.length) }
  }

  // 检查手牌是否已经包含摸到的牌（14 张）
  const fullHand = hand.length === 14 ? hand : [...hand, drawnTile]

  // 检查是否能和
  const tsumoResult = aiDecideTsumo(hand, drawnTile, exposedSets, config)
  if (tsumoResult.tsumo) {
    return { tsumo: true }
  }

  // 选择打出的牌
  const discardIndex = aiSelectDiscard(fullHand, config)

  return {
    discardIndex
  }
}

/**
 * AI 综合决策
 */
export function aiDecide(actionType, hand, tile, exposedSets = [], config = {}) {
  switch (actionType) {
    case 'draw':
      return aiAfterDraw(hand, tile, exposedSets, config)
    case 'discard':
      return { index: aiSelectDiscard(hand, config) }
    case 'chii':
      return aiDecideChii(hand, tile, exposedSets, config)
    case 'pon':
      return aiDecidePon(hand, tile, exposedSets, config)
    case 'daiminkan':
      return aiDecideDaiminkan(hand, tile, config)
    case 'kakan':
      return aiDecideKakan(hand, exposedSets, config)
    case 'ankan':
      return aiDecideAnkan(hand, config)
    case 'ron':
      return aiDecideRon(hand, tile, exposedSets, config)
    case 'tsumo':
      return aiDecideTsumo(hand, tile, exposedSets, config)
    default:
      return {}
  }
}

/**
 * AI 玩家类
 */
export class AIPlayer {
  constructor(id, name, config = {}) {
    this.id = id
    this.name = name
    this.config = { ...AI_CONFIG, ...config }
    this.hand = []
    this.exposedSets = []
    this.chips = 1000
    this.isFolded = false
    this.wind = 'east'  // 自风
    this.seat = 0       // 座位号
  }

  /**
   * AI 思考并行动
   */
  async think(action, tile, hand13 = null) {
    return new Promise(resolve => {
      setTimeout(() => {
        // 如果传入了 13 张手牌，使用它而不是 this.hand
        const hand = hand13 || this.hand
        const decision = aiDecide(action, hand, tile, this.exposedSets, this.config)
        resolve(decision)
      }, this.config.THINK_TIME + Math.random() * 400)
    })
  }

  /**
   * 摸牌
   */
  addTile(tile) {
    this.hand.push(tile)
  }

  /**
   * 打牌
   */
  discardTile(index) {
    if (index >= 0 && index < this.hand.length) {
      return this.hand.splice(index, 1)[0]
    }
    return null
  }

  /**
   * 获取手牌（隐藏状态）
   */
  getHand(hidden = false) {
    if (hidden) {
      return this.hand.map((t, i) => ({ ...t, hidden: i >= this.hand.length - 1 }))
    }
    return [...this.hand]
  }

  /**
   * 重置手牌
   */
  resetHand() {
    this.hand = []
    this.exposedSets = []
    this.isFolded = false
  }

  /**
   * 设置风位
   */
  setWind(wind, seat) {
    this.wind = wind
    this.seat = seat
  }
}

export default AIPlayer
