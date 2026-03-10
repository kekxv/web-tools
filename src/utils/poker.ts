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
    if (this.cards.length === 0) this.reset()
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

// 评估牌型（梭哈：支持 1-5 张牌评估）
export function evaluateHand(cards: Card[]): HandResult {
  // 排除暗牌，只评估当前可见牌或结算时的全牌
  const activeCards = cards.filter(c => !c.isHidden)
  if (activeCards.length === 0) {
    return { type: HandType.HIGH_CARD, name: '高牌', tiebreakers: [0] }
  }

  // 按牌值排序（降序）
  const sorted = [...activeCards].sort((a, b) => b.value - a.value)
  const values = sorted.map(c => c.value)
  const suits = sorted.map(c => c.suit)

  // 统计牌值出现次数
  const valueCount: Record<number, number> = {}
  for (const v of values) {
    valueCount[v] = (valueCount[v] || 0) + 1
  }

  const countEntries = Object.entries(valueCount).map(([v, c]) => ({ 
    value: parseInt(v), 
    count: c 
  }))

  // 按出现次数降序，再按牌值降序
  countEntries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.value - a.value
  })

  // 辅助判断
  const isFlush = activeCards.length === 5 && suits.every(s => s === suits[0])
  let isStraight = false
  if (activeCards.length === 5) {
    const uniqueValues = [...new Set(values)]
    if (uniqueValues.length === 5) {
      if (values[0] - values[4] === 4) {
        isStraight = true
      } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        // 特殊顺子：A-2-3-4-5
        isStraight = true
      }
    }
  }

  // 判断牌型 - 严格按照 countEntries 顺序
  const topCount = countEntries[0].count
  const secondCount = countEntries[1]?.count || 0

  if (isFlush && isStraight) {
    const tiebreakers = (values[0] === 14 && values[1] === 5) ? [5] : [values[0]]
    return { type: HandType.STRAIGHT_FLUSH, name: '同花顺', tiebreakers }
  }

  if (topCount === 4) {
    return { 
      type: HandType.FOUR_OF_A_KIND, 
      name: '四条', 
      tiebreakers: [countEntries[0].value, countEntries[1].value] 
    }
  }

  if (topCount === 3 && secondCount === 2) {
    return { 
      type: HandType.FULL_HOUSE, 
      name: '葫芦', 
      tiebreakers: [countEntries[0].value, countEntries[1].value] 
    }
  }

  if (isFlush) {
    return { type: HandType.FLUSH, name: '同花', tiebreakers: values }
  }

  if (isStraight) {
    const tiebreakers = (values[0] === 14 && values[1] === 5) ? [5] : [values[0]]
    return { type: HandType.STRAIGHT, name: '顺子', tiebreakers }
  }

  if (topCount === 3) {
    const kickers = countEntries.slice(1).map(e => e.value)
    return { type: HandType.THREE_OF_A_KIND, name: '三条', tiebreakers: [countEntries[0].value, ...kickers] }
  }

  if (topCount === 2 && secondCount === 2) {
    const pairs = [countEntries[0].value, countEntries[1].value].sort((a, b) => b - a)
    const kicker = countEntries[2].value
    return { type: HandType.TWO_PAIR, name: '两对', tiebreakers: [...pairs, kicker] }
  }

  if (topCount === 2) {
    const kickers = countEntries.slice(1).map(e => e.value).sort((a, b) => b - a)
    return { type: HandType.ONE_PAIR, name: '一对', tiebreakers: [countEntries[0].value, ...kickers] }
  }

  return { type: HandType.HIGH_CARD, name: '高牌', tiebreakers: values }
}

// 比较两手牌
export function compareHands(hand1: HandResult, hand2: HandResult): number {
  if (hand1.type !== hand2.type) {
    return hand1.type - hand2.type
  }

  for (let i = 0; i < Math.max(hand1.tiebreakers.length, hand2.tiebreakers.length); i++) {
    const t1 = hand1.tiebreakers[i] || 0
    const t2 = hand2.tiebreakers[i] || 0
    if (t1 !== t2) return t1 - t2
  }

  return 0
}

// 评估当前牌面的潜力
export function evaluateHandPotential(cards: Card[]): {
  currentStrength: number
  potential: number
  handType: HandType
} {
  const handResult = evaluateHand(cards)
  const currentStrength = handResult.type / 9
  
  let potential = currentStrength
  const values = cards.filter(c => !c.isHidden).map(c => c.value)
  const valueCount: Record<number, number> = {}
  values.forEach(v => valueCount[v] = (valueCount[v] || 0) + 1)
  
  const counts = Object.values(valueCount).sort((a, b) => b - a)
  if (counts[0] === 3) potential = 0.8
  else if (counts[0] === 2 && counts[1] === 2) potential = 0.7
  else if (counts[0] === 2) potential = 0.5
  
  return { currentStrength, potential, handType: handResult.type }
}
