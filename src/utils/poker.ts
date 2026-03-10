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
  isHidden?: boolean 
}

// 牌型
export enum HandType {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9
}

export interface HandResult {
  type: HandType
  name: string
  tiebreakers: number[]
}

export class Deck {
  private cards: Card[] = []
  constructor() { this.reset() }
  reset() {
    this.cards = []
    for (const suit of SUITS) {
      for (const valueObj of VALUES) {
        this.cards.push({ suit, display: valueObj.display, value: valueObj.value })
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
}

export function evaluateHand(cards: Card[]): HandResult {
  const activeCards = cards.filter(c => !c.isHidden)
  if (activeCards.length === 0) return { type: HandType.HIGH_CARD, name: '高牌', tiebreakers: [0] }

  const sorted = [...activeCards].sort((a, b) => b.value - a.value)
  const values = sorted.map(c => c.value)
  const suits = sorted.map(c => c.suit)

  const valueCount: Record<number, number> = {}
  values.forEach(v => valueCount[v] = (valueCount[v] || 0) + 1)
  const countEntries = Object.entries(valueCount).map(([v, c]) => ({ value: parseInt(v), count: c }))
  countEntries.sort((a, b) => b.count !== a.count ? b.count - a.count : b.value - a.value)

  const isFlush = activeCards.length === 5 && suits.every(s => s === suits[0])
  let isStraight = false
  if (activeCards.length === 5) {
    const uniqueValues = [...new Set(values)]
    if (uniqueValues.length === 5) {
      if (values[0] - values[4] === 4) isStraight = true
      else if (values[0] === 14 && values[1] === 5 && values[4] === 2) isStraight = true
    }
  }

  const top = countEntries[0]
  const second = countEntries[1]

  if (isFlush && isStraight) return { type: HandType.STRAIGHT_FLUSH, name: '同花顺', tiebreakers: [values[0] === 14 && values[1] === 5 ? 5 : values[0]] }
  if (top.count === 4) return { type: HandType.FOUR_OF_A_KIND, name: '四条', tiebreakers: [top.value, second.value] }
  if (top.count === 3 && second?.count === 2) return { type: HandType.FULL_HOUSE, name: '葫芦', tiebreakers: [top.value, second.value] }
  if (isFlush) return { type: HandType.FLUSH, name: '同花', tiebreakers: values }
  if (isStraight) return { type: HandType.STRAIGHT, name: '顺子', tiebreakers: [values[0] === 14 && values[1] === 5 ? 5 : values[0]] }
  if (top.count === 3) return { type: HandType.THREE_OF_A_KIND, name: '三条', tiebreakers: [top.value, ...countEntries.slice(1).map(e => e.value)] }
  if (top.count === 2 && second?.count === 2) return { type: HandType.TWO_PAIR, name: '两对', tiebreakers: [top.value, second.value, countEntries[2].value] }
  if (top.count === 2) return { type: HandType.ONE_PAIR, name: '一对', tiebreakers: [top.value, ...countEntries.slice(1).map(e => e.value)] }

  return { type: HandType.HIGH_CARD, name: '高牌', tiebreakers: values }
}

export function compareHands(hand1: HandResult, hand2: HandResult): number {
  if (hand1.type !== hand2.type) return hand1.type - hand2.type
  for (let i = 0; i < Math.max(hand1.tiebreakers.length, hand2.tiebreakers.length); i++) {
    const t1 = hand1.tiebreakers[i] || 0
    const t2 = hand2.tiebreakers[i] || 0
    if (t1 !== t2) return t1 - t2
  }
  return 0
}

// Optimized potential calculation for AI
export function evaluateHandPotential(cards: Card[]): { score: number, handType: HandType } {
  // Use ALL cards (including hidden ones) for AI evaluation
  const result = evaluateHand(cards.map(c => ({...c, isHidden: false})))
  let score = result.type / 9 // Base score from current hand type

  const values = cards.map(c => c.value)
  const highCards = values.filter(v => v >= 12).length // Q, K, A
  
  // Add weight for high cards even if no pair yet
  score += (highCards * 0.05)

  // Extra weight for pairs/trips in early rounds
  if (result.type === HandType.ONE_PAIR) score += 0.2
  if (result.type >= HandType.THREE_OF_A_KIND) score += 0.3

  return { score: Math.min(score, 1.0), handType: result.type }
}
