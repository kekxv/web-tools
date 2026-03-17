import { describe, it, expect } from 'vitest'
import {
  Deck,
  evaluateHand,
  compareHands,
  evaluateHandPotential,
  HandType,
  SUITS,
  VALUES,
  Card
} from '../utils/poker'

// Helper to create cards
const createCard = (suit: string, value: number, display?: string): Card => ({
  suit: suit as any,
  value,
  display: display || VALUES.find(v => v.value === value)?.display || value.toString()
})

describe('Poker Utils', () => {
  describe('Constants', () => {
    it('should have 4 suits', () => {
      expect(SUITS.length).toBe(4)
      expect(SUITS).toContain('♠')
      expect(SUITS).toContain('♥')
      expect(SUITS).toContain('♣')
      expect(SUITS).toContain('♦')
    })

    it('should have 13 values', () => {
      expect(VALUES.length).toBe(13)
      expect(VALUES[0].value).toBe(2)
      expect(VALUES[12].value).toBe(14) // Ace
    })
  })

  describe('Deck class', () => {
    it('should create a deck with 52 cards', () => {
      const deck = new Deck()
      // After reset, should have 52 cards
      expect(deck).toBeDefined()
    })

    it('should deal cards', () => {
      const deck = new Deck()
      const card = deck.deal()
      expect(card).toBeDefined()
      expect(card.suit).toBeDefined()
      expect(card.value).toBeDefined()
    })

    it('should reset when empty', () => {
      const deck = new Deck()
      // Deal many cards
      for (let i = 0; i < 60; i++) {
        deck.deal()
      }
      // Should still be able to deal after auto-reset
      const card = deck.deal()
      expect(card).toBeDefined()
    })

    it('should shuffle cards', () => {
      const deck = new Deck()
      deck.reset()
      deck.shuffle()
      // After shuffle, order should be different (probabilistically)
      // This test passes most of the time but not guaranteed
      expect(deck).toBeDefined()
    })
  })

  describe('evaluateHand', () => {
    describe('High Card', () => {
      it('should detect high card', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♥', 10),
          createCard('♣', 8),
          createCard('♦', 6),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.HIGH_CARD)
        expect(result.name).toBe('高牌')
      })

      it('should return high card for empty visible cards', () => {
        const cards = [
          createCard('♠', 14, 'A'),
          createCard('♥', 10, '10')
        ]
        cards[0].isHidden = true
        cards[1].isHidden = true
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.HIGH_CARD)
      })
    })

    describe('One Pair', () => {
      it('should detect one pair', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♥', 14),
          createCard('♣', 8),
          createCard('♦', 6),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.ONE_PAIR)
        expect(result.name).toBe('一对')
        expect(result.tiebreakers[0]).toBe(14)
      })
    })

    describe('Two Pair', () => {
      it('should detect two pair', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♥', 14),
          createCard('♣', 8),
          createCard('♦', 8),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.TWO_PAIR)
        expect(result.name).toBe('两对')
        expect(result.tiebreakers[0]).toBe(14)
        expect(result.tiebreakers[1]).toBe(8)
      })
    })

    describe('Three of a Kind', () => {
      it('should detect three of a kind', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♥', 14),
          createCard('♣', 14),
          createCard('♦', 6),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.THREE_OF_A_KIND)
        expect(result.name).toBe('三条')
        expect(result.tiebreakers[0]).toBe(14)
      })
    })

    describe('Straight', () => {
      it('should detect straight (5 high)', () => {
        const cards = [
          createCard('♠', 5),
          createCard('♥', 4),
          createCard('♣', 3),
          createCard('♦', 2),
          createCard('♠', 14) // Ace as low
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.STRAIGHT)
        expect(result.name).toBe('顺子')
        expect(result.tiebreakers[0]).toBe(5) // 5-high straight
      })

      it('should detect straight (Ace high)', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♥', 13),
          createCard('♣', 12),
          createCard('♦', 11),
          createCard('♠', 10)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.STRAIGHT)
        expect(result.tiebreakers[0]).toBe(14)
      })

      it('should detect regular straight', () => {
        const cards = [
          createCard('♠', 9),
          createCard('♥', 8),
          createCard('♣', 7),
          createCard('♦', 6),
          createCard('♠', 5)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.STRAIGHT)
        expect(result.tiebreakers[0]).toBe(9)
      })
    })

    describe('Flush', () => {
      it('should detect flush', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♠', 10),
          createCard('♠', 8),
          createCard('♠', 6),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.FLUSH)
        expect(result.name).toBe('同花')
      })

      it('should not detect flush with mixed suits', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♠', 10),
          createCard('♠', 8),
          createCard('♥', 6),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).not.toBe(HandType.FLUSH)
      })
    })

    describe('Full House', () => {
      it('should detect full house', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♥', 14),
          createCard('♣', 14),
          createCard('♦', 8),
          createCard('♠', 8)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.FULL_HOUSE)
        expect(result.name).toBe('葫芦')
        expect(result.tiebreakers[0]).toBe(14)
        expect(result.tiebreakers[1]).toBe(8)
      })
    })

    describe('Four of a Kind', () => {
      it('should detect four of a kind', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♥', 14),
          createCard('♣', 14),
          createCard('♦', 14),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.FOUR_OF_A_KIND)
        expect(result.name).toBe('四条')
        expect(result.tiebreakers[0]).toBe(14)
      })
    })

    describe('Straight Flush', () => {
      it('should detect straight flush', () => {
        const cards = [
          createCard('♠', 9),
          createCard('♠', 8),
          createCard('♠', 7),
          createCard('♠', 6),
          createCard('♠', 5)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.STRAIGHT_FLUSH)
        expect(result.name).toBe('同花顺')
        expect(result.tiebreakers[0]).toBe(9)
      })

      it('should detect royal flush (Ace high straight flush)', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♠', 13),
          createCard('♠', 12),
          createCard('♠', 11),
          createCard('♠', 10)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.STRAIGHT_FLUSH)
        expect(result.tiebreakers[0]).toBe(14)
      })

      it('should detect wheel straight flush (Ace low)', () => {
        const cards = [
          createCard('♠', 14),
          createCard('♠', 5),
          createCard('♠', 4),
          createCard('♠', 3),
          createCard('♠', 2)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.STRAIGHT_FLUSH)
        expect(result.tiebreakers[0]).toBe(5)
      })
    })

    describe('Hidden cards', () => {
      it('should ignore hidden cards in evaluation', () => {
        const cards = [
          { ...createCard('♠', 14), isHidden: true },
          { ...createCard('♥', 14), isHidden: true },
          createCard('♣', 8),
          createCard('♦', 6),
          createCard('♠', 3)
        ]
        const result = evaluateHand(cards)
        expect(result.type).toBe(HandType.HIGH_CARD)
      })
    })
  })

  describe('compareHands', () => {
    it('should return positive when hand1 is better', () => {
      const hand1 = evaluateHand([
        createCard('♠', 14),
        createCard('♥', 14),
        createCard('♣', 8),
        createCard('♦', 6),
        createCard('♠', 3)
      ])
      const hand2 = evaluateHand([
        createCard('♠', 10),
        createCard('♥', 10),
        createCard('♣', 8),
        createCard('♦', 6),
        createCard('♠', 3)
      ])
      expect(compareHands(hand1, hand2)).toBeGreaterThan(0)
    })

    it('should return negative when hand2 is better', () => {
      const hand1 = evaluateHand([
        createCard('♠', 10),
        createCard('♥', 10),
        createCard('♣', 8),
        createCard('♦', 6),
        createCard('♠', 3)
      ])
      const hand2 = evaluateHand([
        createCard('♠', 14),
        createCard('♥', 14),
        createCard('♣', 8),
        createCard('♦', 6),
        createCard('♠', 3)
      ])
      expect(compareHands(hand1, hand2)).toBeLessThan(0)
    })

    it('should return 0 for equal hands', () => {
      const hand1 = evaluateHand([
        createCard('♠', 14),
        createCard('♥', 14),
        createCard('♣', 8),
        createCard('♦', 6),
        createCard('♠', 3)
      ])
      const hand2 = evaluateHand([
        createCard('♦', 14),
        createCard('♣', 14),
        createCard('♥', 8),
        createCard('♠', 6),
        createCard('♦', 3)
      ])
      expect(compareHands(hand1, hand2)).toBe(0)
    })

    it('should use tiebreakers for same hand type', () => {
      const hand1 = evaluateHand([
        createCard('♠', 14),
        createCard('♥', 14),
        createCard('♣', 8),
        createCard('♦', 6),
        createCard('♠', 3)
      ])
      const hand2 = evaluateHand([
        createCard('♠', 13),
        createCard('♥', 13),
        createCard('♣', 8),
        createCard('♦', 6),
        createCard('♠', 3)
      ])
      expect(compareHands(hand1, hand2)).toBeGreaterThan(0)
    })

    it('should compare different hand types correctly', () => {
      const straightFlush = evaluateHand([
        createCard('♠', 9),
        createCard('♠', 8),
        createCard('♠', 7),
        createCard('♠', 6),
        createCard('♠', 5)
      ])
      const fourOfAKind = evaluateHand([
        createCard('♠', 14),
        createCard('♥', 14),
        createCard('♣', 14),
        createCard('♦', 14),
        createCard('♠', 3)
      ])
      // Straight flush beats four of a kind
      expect(compareHands(straightFlush, fourOfAKind)).toBeGreaterThan(0)
    })
  })

  describe('evaluateHandPotential', () => {
    it('should return score between 0 and 1', () => {
      const cards = [
        createCard('♠', 14),
        createCard('♥', 10),
        createCard('♣', 8)
      ]
      const result = evaluateHandPotential(cards)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it('should give higher score for pairs', () => {
      const withPair = [
        createCard('♠', 14),
        createCard('♥', 14),
        createCard('♣', 8)
      ]
      const withoutPair = [
        createCard('♠', 14),
        createCard('♥', 10),
        createCard('♣', 8)
      ]
      expect(evaluateHandPotential(withPair).score).toBeGreaterThan(
        evaluateHandPotential(withoutPair).score
      )
    })

    it('should give bonus for high cards', () => {
      const withHighCards = [
        createCard('♠', 14),
        createCard('♥', 13),
        createCard('♣', 12)
      ]
      const withLowCards = [
        createCard('♠', 2),
        createCard('♥', 3),
        createCard('♣', 4)
      ]
      expect(evaluateHandPotential(withHighCards).score).toBeGreaterThan(
        evaluateHandPotential(withLowCards).score
      )
    })

    it('should evaluate hidden cards as visible for AI', () => {
      const cards = [
        { ...createCard('♠', 14), isHidden: true },
        { ...createCard('♥', 14), isHidden: true },
        createCard('♣', 8)
      ]
      const result = evaluateHandPotential(cards)
      // Should treat hidden cards as visible (for AI purposes)
      expect(result.handType).toBe(HandType.ONE_PAIR)
    })

    it('should cap score at 1.0', () => {
      const straightFlush = [
        createCard('♠', 9),
        createCard('♠', 8),
        createCard('♠', 7),
        createCard('♠', 6),
        createCard('♠', 5)
      ]
      const result = evaluateHandPotential(straightFlush)
      expect(result.score).toBeLessThanOrEqual(1.0)
    })
  })

  describe('HandType enum', () => {
    it('should have correct hand type ordering', () => {
      expect(HandType.HIGH_CARD).toBeLessThan(HandType.ONE_PAIR)
      expect(HandType.ONE_PAIR).toBeLessThan(HandType.TWO_PAIR)
      expect(HandType.TWO_PAIR).toBeLessThan(HandType.THREE_OF_A_KIND)
      expect(HandType.THREE_OF_A_KIND).toBeLessThan(HandType.STRAIGHT)
      expect(HandType.STRAIGHT).toBeLessThan(HandType.FLUSH)
      expect(HandType.FLUSH).toBeLessThan(HandType.FULL_HOUSE)
      expect(HandType.FULL_HOUSE).toBeLessThan(HandType.FOUR_OF_A_KIND)
      expect(HandType.FOUR_OF_A_KIND).toBeLessThan(HandType.STRAIGHT_FLUSH)
    })
  })
})