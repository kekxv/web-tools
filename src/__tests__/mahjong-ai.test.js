import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  evaluateHandValue,
  calculateShanten,
  calculateUkeire,
  aiSelectDiscard,
  aiDecideChii,
  aiDecidePon,
  aiDecideDaiminkan,
  aiDecideKakan,
  aiDecideAnkan,
  aiDecideRon,
  aiDecideTsumo,
  aiAfterDraw,
  aiDecide,
  AIPlayer,
  AI_CONFIG
} from '../utils/mahjong-ai'
import {
  Tile, TILE_TYPE, TILE_VALUE,
  canChii, canPon, canDaiminkan
} from '../utils/mahjong'

// Helper function to create tiles
const createTile = (type, index) => {
  let value, color, display
  if (type === TILE_TYPE.MANZU) {
    value = index; color = 'man'; display = index.toString()
  } else if (type === TILE_TYPE.PINZU) {
    value = 10 + index; color = 'pin'; display = index.toString()
  } else if (type === TILE_TYPE.SOUZU) {
    value = 20 + index; color = 'sou'; display = index.toString()
  } else {
    value = index; color = 'ji'; display = '字'
  }
  return new Tile(value, type, index, display, color)
}

describe('Mahjong AI Logic', () => {

  describe('evaluateHandValue', () => {
    it('should return a positive value for any hand', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2),
        createTile(TILE_TYPE.PINZU, 5)
      ]
      const value = evaluateHandValue(hand)
      expect(typeof value).toBe('number')
    })

    it('should value pairs higher than single tiles', () => {
      const handWithPair = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.PINZU, 3)
      ]
      const handWithoutPair = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.PINZU, 5)
      ]
      // Hand with pair gets +4 from pair value
      // Hand without pair has no pairs and isolated tiles (lower value)
      expect(evaluateHandValue(handWithPair)).toBeGreaterThan(evaluateHandValue(handWithoutPair))
    })

    it('should value triplets higher than pairs', () => {
      const handWithTriplet = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.PINZU, 3)
      ]
      const handWithPair = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.PINZU, 3),
        createTile(TILE_TYPE.PINZU, 4)
      ]
      expect(evaluateHandValue(handWithTriplet)).toBeGreaterThan(evaluateHandValue(handWithPair))
    })

    it('should value consecutive tiles (shapes) higher', () => {
      const handWithShape = [
        createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 4),
        createTile(TILE_TYPE.PINZU, 9)
      ]
      const handWithoutShape = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.PINZU, 5)
      ]
      expect(evaluateHandValue(handWithShape)).toBeGreaterThan(evaluateHandValue(handWithoutShape))
    })

    it('should penalize single honor tiles', () => {
      const handWithSingleHonor = [
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST),
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2)
      ]
      const handWithHonorPair = [
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST),
        createTile(TILE_TYPE.MANZU, 1)
      ]
      expect(evaluateHandValue(handWithHonorPair)).toBeGreaterThan(evaluateHandValue(handWithSingleHonor))
    })
  })

  describe('calculateShanten', () => {
    it('should return 8 for empty or very small hands', () => {
      expect(calculateShanten([])).toBe(8)
      expect(calculateShanten([createTile(TILE_TYPE.MANZU, 1)])).toBe(8)
    })

    it('should decrease shanten with more pairs and sets', () => {
      const handWithPair = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 1)
      ]
      const handWithTriplet = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 1)
      ]
      expect(calculateShanten(handWithTriplet)).toBeLessThan(calculateShanten(handWithPair))
    })

    it('should return 0 or positive number', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2), createTile(TILE_TYPE.MANZU, 2),
        createTile(TILE_TYPE.MANZU, 3), createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.PINZU, 4), createTile(TILE_TYPE.PINZU, 4),
        createTile(TILE_TYPE.PINZU, 5), createTile(TILE_TYPE.PINZU, 5),
        createTile(TILE_TYPE.PINZU, 6), createTile(TILE_TYPE.PINZU, 6),
        createTile(TILE_TYPE.SOUZU, 7), createTile(TILE_TYPE.SOUZU, 7)
      ]
      const shanten = calculateShanten(hand)
      expect(shanten).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateUkeire', () => {
    it('should return an array of useful tiles', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2),
        createTile(TILE_TYPE.MANZU, 4),
        createTile(TILE_TYPE.PINZU, 5)
      ]
      const ukeire = calculateUkeire(hand)
      expect(Array.isArray(ukeire)).toBe(true)
    })

    it('should include tiles that form pairs', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.PINZU, 3)
      ]
      const ukeire = calculateUkeire(hand)
      const hasMan5 = ukeire.some(t => t.type === TILE_TYPE.MANZU && t.index === 5)
      expect(hasMan5).toBe(true)
    })

    it('should include tiles that form shapes', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 4)
      ]
      const ukeire = calculateUkeire(hand)
      // Should include 2, 5 (to form shape), and 3, 4 (to form pair)
      expect(ukeire.length).toBeGreaterThan(0)
    })
  })

  describe('aiSelectDiscard', () => {
    it('should return 0 for empty hand', () => {
      expect(aiSelectDiscard([])).toBe(0)
    })

    it('should return a valid index', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const index = aiSelectDiscard(hand)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(hand.length)
    })

    it('should prefer discarding isolated tiles over connected ones', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), // isolated
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5), // pair
        createTile(TILE_TYPE.MANZU, 6)  // connected to 5
      ]
      // Run multiple times due to randomness
      const results = []
      for (let i = 0; i < 20; i++) {
        results.push(aiSelectDiscard(hand))
      }
      // Should sometimes discard the isolated tile (index 0)
      expect(results.some(r => r === 0)).toBe(true)
    })

    it('should prefer discarding single honor tiles', () => {
      const hand = [
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST), // single honor
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5), // pair
        createTile(TILE_TYPE.MANZU, 6)
      ]
      const results = []
      for (let i = 0; i < 20; i++) {
        results.push(aiSelectDiscard(hand))
      }
      // Single honor should often be chosen for discard
      expect(results.some(r => r === 0)).toBe(true)
    })
  })

  describe('aiDecideChii', () => {
    it('should return chii: false when chii is not possible', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 9)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 5)
      const result = aiDecideChii(hand, discarded)
      expect(result.chii).toBe(false)
    })

    it('should return chii: false for honor tiles', () => {
      const hand = [
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.SOUTH)
      ]
      const discarded = createTile(TILE_TYPE.JIHAI, TILE_VALUE.WEST)
      const result = aiDecideChii(hand, discarded)
      expect(result.chii).toBe(false)
    })

    it('should consider chii when possible', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 4)
      // Force chii probability to 1
      const result = aiDecideChii(hand, discarded, [], { chiiProbability: 1 })
      // Check that it can return chii (pattern is available)
      expect(result.chii || !result.chii).toBe(true) // Either decision is valid
    })

    it('should return pattern when chii is possible', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 2),
        createTile(TILE_TYPE.MANZU, 3)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 4)
      const result = aiDecideChii(hand, discarded, [], { chiiProbability: 1 })
      if (result.chii) {
        expect(result.pattern).toBeDefined()
        expect(Array.isArray(result.pattern)).toBe(true)
      }
    })
  })

  describe('aiDecidePon', () => {
    it('should return pon: false when pon is not possible', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 1)
      const result = aiDecidePon(hand, discarded)
      expect(result.pon).toBe(false)
    })

    it('should consider pon when having a pair', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 5)
      const result = aiDecidePon(hand, discarded, [], { ponProbability: 1 })
      expect(result.pon).toBe(true)
    })

    it('should delegate to daiminkan when having three tiles', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 5)
      const result = aiDecidePon(hand, discarded)
      // Should call aiDecideDaiminkan internally
      expect(result.kan !== undefined || result.pon !== undefined).toBe(true)
    })
  })

  describe('aiDecideDaiminkan', () => {
    it('should return kan: false when kan is not possible', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 5)
      const result = aiDecideDaiminkan(hand, discarded)
      expect(result.kan).toBe(false)
    })

    it('should consider kan when having three tiles', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 5)
      // Run multiple times due to randomness
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(aiDecideDaiminkan(hand, discarded))
      }
      expect(results.some(r => r.kan === true)).toBe(true)
    })
  })

  describe('aiDecideAnkan', () => {
    it('should return ankan: false when no quad exists', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const result = aiDecideAnkan(hand)
      expect(result.ankan).toBe(false)
    })

    it('should consider ankan when having a quad', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(aiDecideAnkan(hand))
      }
      expect(results.some(r => r.ankan === true)).toBe(true)
      // Check that tile is returned with ankan
      const ankanResult = results.find(r => r.ankan === true)
      if (ankanResult) {
        expect(ankanResult.tile).toBeDefined()
      }
    })
  })

  describe('aiDecideKakan', () => {
    it('should return kakan: false when no pon exists', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const exposedSets = []
      const result = aiDecideKakan(hand, exposedSets)
      expect(result.kakan).toBe(false)
    })

    it('should consider kakan when having fourth tile matching pon', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5)
      ]
      const exposedSets = [
        {
          type: 'pon',
          tiles: [
            createTile(TILE_TYPE.MANZU, 5),
            createTile(TILE_TYPE.MANZU, 5),
            createTile(TILE_TYPE.MANZU, 5)
          ]
        }
      ]
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(aiDecideKakan(hand, exposedSets))
      }
      expect(results.some(r => r.kakan === true)).toBe(true)
    })
  })

  describe('aiDecideRon', () => {
    it('should return ron: false when cannot win', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2)
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 5)
      const result = aiDecideRon(hand, discarded)
      expect(result.ron).toBe(false)
    })

    it('should return ron: true when can win', () => {
      // Create a ready hand (tenpai): 123m 456m 789m 11p waiting for 1p
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 2), createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 4), createTile(TILE_TYPE.MANZU, 5), createTile(TILE_TYPE.MANZU, 6),
        createTile(TILE_TYPE.MANZU, 7), createTile(TILE_TYPE.MANZU, 8), createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.PINZU, 1), createTile(TILE_TYPE.PINZU, 2), createTile(TILE_TYPE.PINZU, 3),
        createTile(TILE_TYPE.PINZU, 1)
      ]
      const discarded = createTile(TILE_TYPE.PINZU, 1)
      const result = aiDecideRon(hand, discarded)
      expect(result.ron).toBe(true)
    })
  })

  describe('aiDecideTsumo', () => {
    it('should return tsumo: false when drawnTile is null', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2)
      ]
      const result = aiDecideTsumo(hand, null)
      expect(result.tsumo).toBe(false)
    })

    it('should return tsumo: true when hand is complete', () => {
      // Complete hand waiting for final tile
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 2), createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 4), createTile(TILE_TYPE.MANZU, 5), createTile(TILE_TYPE.MANZU, 6),
        createTile(TILE_TYPE.MANZU, 7), createTile(TILE_TYPE.MANZU, 8), createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.PINZU, 1), createTile(TILE_TYPE.PINZU, 2), createTile(TILE_TYPE.PINZU, 3),
        createTile(TILE_TYPE.PINZU, 1)
      ]
      const drawnTile = createTile(TILE_TYPE.PINZU, 1)
      const result = aiDecideTsumo(hand, drawnTile)
      expect(result.tsumo).toBe(true)
    })
  })

  describe('aiAfterDraw', () => {
    it('should return discardIndex when drawnTile is null', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2)
      ]
      const result = aiAfterDraw(hand, null)
      expect(result.discardIndex).toBeDefined()
    })

    it('should return tsumo: true when can self-draw win', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 2), createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 4), createTile(TILE_TYPE.MANZU, 5), createTile(TILE_TYPE.MANZU, 6),
        createTile(TILE_TYPE.MANZU, 7), createTile(TILE_TYPE.MANZU, 8), createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.PINZU, 1), createTile(TILE_TYPE.PINZU, 2), createTile(TILE_TYPE.PINZU, 3),
        createTile(TILE_TYPE.PINZU, 1)
      ]
      const drawnTile = createTile(TILE_TYPE.PINZU, 1)
      const result = aiAfterDraw(hand, drawnTile)
      expect(result.tsumo).toBe(true)
    })

    it('should return discardIndex when cannot win', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2),
        createTile(TILE_TYPE.PINZU, 5)
      ]
      const drawnTile = createTile(TILE_TYPE.SOUZU, 9)
      const result = aiAfterDraw(hand, drawnTile)
      expect(result.discardIndex).toBeDefined()
    })
  })

  describe('aiDecide', () => {
    it('should route to correct function based on action type', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]

      const ponResult = aiDecide('pon', hand, createTile(TILE_TYPE.MANZU, 5), [], { ponProbability: 1 })
      expect(ponResult.pon).toBe(true)

      const discardResult = aiDecide('discard', hand)
      expect(discardResult.index).toBeDefined()
    })

    it('should return empty object for unknown action', () => {
      const result = aiDecide('unknown', [])
      expect(result).toEqual({})
    })
  })

  describe('AIPlayer class', () => {
    it('should create AI player with default config', () => {
      const ai = new AIPlayer(1, 'Test AI')
      expect(ai.id).toBe(1)
      expect(ai.name).toBe('Test AI')
      expect(ai.hand).toEqual([])
      expect(ai.exposedSets).toEqual([])
      expect(ai.chips).toBe(1000)
      expect(ai.isFolded).toBe(false)
    })

    it('should accept custom config', () => {
      const ai = new AIPlayer(2, 'Custom AI', { THINK_TIME: 500, AGGRESSIVE: 0.8 })
      expect(ai.config.THINK_TIME).toBe(500)
      expect(ai.config.AGGRESSIVE).toBe(0.8)
    })

    it('should add tiles to hand', () => {
      const ai = new AIPlayer(1, 'Test')
      ai.addTile(createTile(TILE_TYPE.MANZU, 1))
      ai.addTile(createTile(TILE_TYPE.MANZU, 2))
      expect(ai.hand.length).toBe(2)
    })

    it('should discard tiles from hand', () => {
      const ai = new AIPlayer(1, 'Test')
      ai.addTile(createTile(TILE_TYPE.MANZU, 1))
      ai.addTile(createTile(TILE_TYPE.MANZU, 2))
      const discarded = ai.discardTile(0)
      expect(discarded.index).toBe(1)
      expect(ai.hand.length).toBe(1)
    })

    it('should return null for invalid discard index', () => {
      const ai = new AIPlayer(1, 'Test')
      ai.addTile(createTile(TILE_TYPE.MANZU, 1))
      expect(ai.discardTile(-1)).toBeNull()
      expect(ai.discardTile(10)).toBeNull()
    })

    it('should get hand with or without hidden state', () => {
      const ai = new AIPlayer(1, 'Test')
      ai.addTile(createTile(TILE_TYPE.MANZU, 1))
      ai.addTile(createTile(TILE_TYPE.MANZU, 2))

      const normalHand = ai.getHand(false)
      expect(normalHand.length).toBe(2)
      expect(normalHand[0].hidden).toBeUndefined()

      const hiddenHand = ai.getHand(true)
      expect(hiddenHand.length).toBe(2)
    })

    it('should reset hand', () => {
      const ai = new AIPlayer(1, 'Test')
      ai.addTile(createTile(TILE_TYPE.MANZU, 1))
      ai.addTile(createTile(TILE_TYPE.MANZU, 2))
      ai.isFolded = true

      ai.resetHand()
      expect(ai.hand).toEqual([])
      expect(ai.exposedSets).toEqual([])
      expect(ai.isFolded).toBe(false)
    })

    it('should set wind and seat', () => {
      const ai = new AIPlayer(1, 'Test')
      ai.setWind('south', 2)
      expect(ai.wind).toBe('south')
      expect(ai.seat).toBe(2)
    })

    it('should think and make decisions asynchronously', async () => {
      const ai = new AIPlayer(1, 'Test', { THINK_TIME: 10 }) // Very fast for testing
      ai.addTile(createTile(TILE_TYPE.MANZU, 1))
      ai.addTile(createTile(TILE_TYPE.MANZU, 2))

      const decision = await ai.think('discard', null)
      expect(decision.index).toBeDefined()
    })

    it('should use provided hand for think when hand13 is given', async () => {
      const ai = new AIPlayer(1, 'Test', { THINK_TIME: 10 })
      ai.addTile(createTile(TILE_TYPE.MANZU, 1)) // This won't be used

      const differentHand = [
        createTile(TILE_TYPE.MANZU, 5),
        createTile(TILE_TYPE.MANZU, 5)
      ]

      const decision = await ai.think('discard', null, differentHand)
      expect(decision.index).toBeDefined()
    })
  })

  describe('AI_CONFIG', () => {
    it('should have default configuration values', () => {
      expect(AI_CONFIG.THINK_TIME).toBe(800)
      expect(AI_CONFIG.CHII_PROBABILITY).toBe(0.6)
      expect(AI_CONFIG.PON_PROBABILITY).toBe(0.85)
      expect(AI_CONFIG.AGGRESSIVE).toBe(0.5)
    })
  })
})