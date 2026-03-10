// 扑克牌工具函数 - 用于梭哈游戏

// 花色
export const SUITS = ['♠', '♥', '♣', '♦'] as const
export type Suit = typeof SUITS[number]

// 牌面值
export const VALUES = [
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
  { display: 'K', value: 13 },
  { display: 'A', value: 14 }
] as const

export interface Card {
  suit: Suit
  display: string
  value: number
  isHidden?: boolean // 是否为底牌
}

// 牌型
export enum HandType {
  HIGH_CARD = 1,      // 高牌
  ONE_PAIR = 2,       // 一对
  TWO_PAIR = 3,       // 两对
  THREE_OF_A_KIND = 4, // 三条
  STRAIGHT = 5,       // 顺子
  FLUSH = 6,          // 同花
  FULL_HOUSE = 7,     // 葫芦
  FOUR_OF_A_KIND = 8, // 四条
  STRAIGHT_FLUSH = 9  // 同花顺
}

export interface HandResult {
  type: HandType
  name: string
  tiebreakers: number[] // 用于比较同牌型的牌
}

// 牌组类
export class Deck {
  private cards: Card[] = []

  constructor() {
    this.reset()
  }

  reset() {
    this.cards = []
    for (const suit of SUITS) {
      for (const valueObj of VALUES) {
        this.cards.push({
          suit,
          display: valueObj.display,
          value: valueObj.value
        })
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  deal(): Card {
    return this.cards.pop()!
  }

  remaining(): number {
    return this.cards.length
  }
}

// 获取牌型名称
export function getHandTypeName(type: HandType): string {
  const names: Record<HandType, string> = {
    [HandType.HIGH_CARD]: '高牌',
    [HandType.ONE_PAIR]: '一对',
    [HandType.TWO_PAIR]: '两对',
    [HandType.THREE_OF_A_KIND]: '三条',
    [HandType.STRAIGHT]: '顺子',
    [HandType.FLUSH]: '同花',
    [HandType.FULL_HOUSE]: '葫芦',
    [HandType.FOUR_OF_A_KIND]: '四条',
    [HandType.STRAIGHT_FLUSH]: '同花顺'
  }
  return names[type]
}

// 评估牌型（梭哈：5 张牌）
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length !== 5) {
    return { type: HandType.HIGH_CARD, name: '高牌', tiebreakers: [] }
  }

  // 排除暗牌，只评估明牌
  const visibleCards = cards.filter(c => !c.isHidden)

  // 按牌值排序（降序）
  const sorted = [...visibleCards].sort((a, b) => b.value - a.value)
  const values = sorted.map(c => c.value)
  const suits = sorted.map(c => c.suit)

  // 检查是否同花
  const isFlush = suits.every(s => s === suits[0])

  // 检查是否顺子
  let isStraight = true
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      isStraight = false
      break
    }
  }

  // 特殊顺子：A-2-3-4-5
  if (!isStraight && values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true
  }

  // 统计牌值出现次数
  const valueCount: Record<number, number> = {}
  for (const v of values) {
    valueCount[v] = (valueCount[v] || 0) + 1
  }

  const counts = Object.values(valueCount)
  const countValues = Object.entries(valueCount).map(([v, c]) => ({ value: parseInt(v), count: c }))

  // 按出现次数降序，再按牌值降序
  countValues.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.value - a.value
  })

  // 判断牌型
  if (isFlush && isStraight) {
    return {
      type: HandType.STRAIGHT_FLUSH,
      name: '同花顺',
      tiebreakers: values
    }
  }

  if (counts[0] === 4) {
    const fourValue = countValues.find(c => c.count === 4)!.value
    const kicker = countValues.find(c => c.count === 1)!.value
    return {
      type: HandType.FOUR_OF_A_KIND,
      name: '四条',
      tiebreakers: [fourValue, kicker]
    }
  }

  if (counts[0] === 3 && counts[1] === 2) {
    const threeValue = countValues.find(c => c.count === 3)!.value
    const pairValue = countValues.find(c => c.count === 2)!.value
    return {
      type: HandType.FULL_HOUSE,
      name: '葫芦',
      tiebreakers: [threeValue, pairValue]
    }
  }

  if (isFlush) {
    return {
      type: HandType.FLUSH,
      name: '同花',
      tiebreakers: values
    }
  }

  if (isStraight) {
    // 处理 A-2-3-4-5 顺子
    if (values[0] === 14 && values[1] === 5) {
      return {
        type: HandType.STRAIGHT,
        name: '顺子',
        tiebreakers: [5, 4, 3, 2, 1]
      }
    }
    return {
      type: HandType.STRAIGHT,
      name: '顺子',
      tiebreakers: values
    }
  }

  if (counts[0] === 3) {
    const threeValue = countValues.find(c => c.count === 3)!.value
    const kickers = countValues.filter(c => c.count === 1).map(c => c.value)
    return {
      type: HandType.THREE_OF_A_KIND,
      name: '三条',
      tiebreakers: [threeValue, ...kickers]
    }
  }

  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = countValues.filter(c => c.count === 2).map(c => c.value).sort((a, b) => b - a)
    const kicker = countValues.find(c => c.count === 1)!.value
    return {
      type: HandType.TWO_PAIR,
      name: '两对',
      tiebreakers: [...pairs, kicker]
    }
  }

  if (counts[0] === 2) {
    const pairValue = countValues.find(c => c.count === 2)!.value
    const kickers = countValues.filter(c => c.count === 1).map(c => c.value)
    return {
      type: HandType.ONE_PAIR,
      name: '一对',
      tiebreakers: [pairValue, ...kickers]
    }
  }

  return {
    type: HandType.HIGH_CARD,
    name: '高牌',
    tiebreakers: values
  }
}

// 比较两手牌
// 返回值：>0 表示 hand1 赢，<0 表示 hand2 赢，=0 表示平局
export function compareHands(hand1: HandResult, hand2: HandResult): number {
  if (hand1.type !== hand2.type) {
    return hand1.type - hand2.type
  }

  for (let i = 0; i < Math.max(hand1.tiebreakers.length, hand2.tiebreakers.length); i++) {
    const t1 = hand1.tiebreakers[i] || 0
    const t2 = hand2.tiebreakers[i] || 0
    if (t1 !== t2) {
      return t1 - t2
    }
  }

  return 0
}

// 评估当前牌面的潜力（用于 AI 决策）
export function evaluateHandPotential(cards: Card[]): {
  currentStrength: number
  potential: number
  handType: HandType
} {
  const visibleCards = cards.filter(c => !c.isHidden)

  if (visibleCards.length < 2) {
    return { currentStrength: 0.5, potential: 0.5, handType: HandType.HIGH_CARD }
  }

  const handResult = evaluateHand(cards)

  // 当前强度（0-1）
  const currentStrength = handResult.type / 9

  // 潜力评估
  let potential = 0.5

  // 有对子
  const values = visibleCards.map(c => c.value)
  const valueCount: Record<number, number> = {}
  for (const v of values) {
    valueCount[v] = (valueCount[v] || 0) + 1
  }

  const pairs = Object.values(valueCount).filter(c => c === 2).length
  const threeOfAKind = Object.values(valueCount).some(c => c === 3)
  const fourOfAKind = Object.values(valueCount).some(c => c === 4)

  if (fourOfAKind) potential = 1.0
  else if (threeOfAKind) potential = 0.85
  else if (pairs >= 2) potential = 0.75
  else if (pairs === 1) potential = 0.6

  // 同花潜力
  const suits = visibleCards.map(c => c.suit)
  const suitCount: Record<string, number> = {}
  for (const s of suits) {
    suitCount[s] = (suitCount[s] || 0) + 1
  }
  const maxSuitCount = Math.max(...Object.values(suitCount))
  if (maxSuitCount >= 4 && visibleCards.length >= 4) {
    potential = Math.max(potential, 0.7)
  }
  if (maxSuitCount === 5) {
    potential = Math.max(potential, 0.85)
  }

  // 顺子潜力
  const uniqueValues = [...new Set(values)].sort((a, b) => a - b)
  let consecutiveCount = 1
  let maxConsecutive = 1
  for (let i = 1; i < uniqueValues.length; i++) {
    if (uniqueValues[i] - uniqueValues[i - 1] === 1) {
      consecutiveCount++
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount)
    } else {
      consecutiveCount = 1
    }
  }

  // 检查 A-2-3-4-5 的情况
  if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) {
    maxConsecutive = Math.max(maxConsecutive, 5)
  }

  if (maxConsecutive >= 4 && visibleCards.length >= 4) {
    potential = Math.max(potential, 0.65)
  }

  return { currentStrength, potential, handType: handResult.type }
}
