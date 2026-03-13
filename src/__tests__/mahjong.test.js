import { describe, it, expect } from 'vitest'
import {
  checkAgari, Tile, TILE_TYPE, TILE_VALUE,
  canChii, canPon, canDaiminkan, canAnkan, canKakan,
  sortHand
} from '../utils/mahjong'

// 增强版辅助函数，支持全花色
const createTile = (type, index) => {
  let value, color, display;
  if (type === TILE_TYPE.MANZU) {
    value = index; color = 'man'; display = index.toString();
  } else if (type === TILE_TYPE.PINZU) {
    value = 10 + index; color = 'pin'; display = index.toString();
  } else if (type === TILE_TYPE.SOUZU) {
    value = 20 + index; color = 'sou'; display = index.toString();
  } else {
    // 字牌使用 TILE_VALUE 中的定义
    value = index; color = 'ji'; display = '字';
  }
  return new Tile(value, type, index, display, color);
}

describe('Mahjong Core Logic', () => {

  describe('Agari (Winning) Logic', () => {
    it('should detect Thirteen Orphans (十三幺)', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.PINZU, 1), createTile(TILE_TYPE.PINZU, 9),
        createTile(TILE_TYPE.SOUZU, 1), createTile(TILE_TYPE.SOUZU, 9),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST), createTile(TILE_TYPE.JIHAI, TILE_VALUE.SOUTH),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.WEST), createTile(TILE_TYPE.JIHAI, TILE_VALUE.NORTH),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.WHITE), createTile(TILE_TYPE.JIHAI, TILE_VALUE.GREEN),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.RED), createTile(TILE_TYPE.JIHAI, TILE_VALUE.RED) // 雀头红中
      ]
      const result = checkAgari(hand)
      expect(result.agari).toBe(true)
      expect(result.type).toBe('十三幺')
    })

    it('should detect Pung-Pung Hu (碰碰胡)', () => {
      // 111万 222筒 555索 东东东 发发
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.PINZU, 2), createTile(TILE_TYPE.PINZU, 2), createTile(TILE_TYPE.PINZU, 2),
        createTile(TILE_TYPE.SOUZU, 5), createTile(TILE_TYPE.SOUZU, 5), createTile(TILE_TYPE.SOUZU, 5),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST), createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST), createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.GREEN), createTile(TILE_TYPE.JIHAI, TILE_VALUE.GREEN)
      ]
      const result = checkAgari(hand)
      expect(result.agari).toBe(true)
      expect(result.fan).toBeGreaterThanOrEqual(3) // 碰碰胡至少 3 番
    })

    it('should detect Pure Suit (清一色)', () => {
      // 全万子：123 456 789 111 22
      const hand = [
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 2), createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 4), createTile(TILE_TYPE.MANZU, 5), createTile(TILE_TYPE.MANZU, 6),
        createTile(TILE_TYPE.MANZU, 7), createTile(TILE_TYPE.MANZU, 8), createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 1),
        createTile(TILE_TYPE.MANZU, 2), createTile(TILE_TYPE.MANZU, 2)
      ]
      const result = checkAgari(hand)
      expect(result.agari).toBe(true)
      expect(result.fan).toBe(6) // 清一色 6 番
    })

    it('should detect Agari with Exposed Sets (带副露)', () => {
      // 手牌：789筒 11万
      const hand = [
        createTile(TILE_TYPE.PINZU, 7), createTile(TILE_TYPE.PINZU, 8), createTile(TILE_TYPE.PINZU, 9),
        createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 1)
      ]
      // 副露：123万吃，456万吃，111索碰
      const exposed = [
        { type: 'chi', tiles: [createTile(TILE_TYPE.MANZU, 1), createTile(TILE_TYPE.MANZU, 2), createTile(TILE_TYPE.MANZU, 3)] },
        { type: 'chi', tiles: [createTile(TILE_TYPE.MANZU, 4), createTile(TILE_TYPE.MANZU, 5), createTile(TILE_TYPE.MANZU, 6)] },
        { type: 'pon', tiles: [createTile(TILE_TYPE.SOUZU, 1), createTile(TILE_TYPE.SOUZU, 1), createTile(TILE_TYPE.SOUZU, 1)] }
      ]
      const result = checkAgari(hand, exposed)
      expect(result.agari).toBe(true)
    })

    it('should detect Agari with Kan in Exposed Sets (带杠的副露)', () => {
      // 模拟用户截图中的情况
      // 副露：456索吃，345索吃，1111索杠 (10张牌)
      const exposed = [
        { type: 'chi', tiles: [createTile(TILE_TYPE.SOUZU, 4), createTile(TILE_TYPE.SOUZU, 5), createTile(TILE_TYPE.SOUZU, 6)] },
        { type: 'chi', tiles: [createTile(TILE_TYPE.SOUZU, 3), createTile(TILE_TYPE.SOUZU, 4), createTile(TILE_TYPE.SOUZU, 5)] },
        { type: 'kan', tiles: [createTile(TILE_TYPE.SOUZU, 1), createTile(TILE_TYPE.SOUZU, 1), createTile(TILE_TYPE.SOUZU, 1), createTile(TILE_TYPE.SOUZU, 1)] }
      ]
      // 手牌：234筒，44万 (5张)
      const hand = [
        createTile(TILE_TYPE.PINZU, 2), createTile(TILE_TYPE.PINZU, 3), createTile(TILE_TYPE.PINZU, 4),
        createTile(TILE_TYPE.MANZU, 4), createTile(TILE_TYPE.MANZU, 4)
      ]
      const result = checkAgari(hand, exposed)
      expect(result.agari).toBe(true)
    })
  })

  describe('Player Action Checks', () => {
    it('should correctly identify Chii (吃) options', () => {
      const hand = [
        createTile(TILE_TYPE.MANZU, 2),
        createTile(TILE_TYPE.MANZU, 3),
        createTile(TILE_TYPE.MANZU, 5),
      ]
      const discarded = createTile(TILE_TYPE.MANZU, 4)
      const options = canChii(hand, discarded)

      // 4万可以跟 23 组成 234（高位吃），可以跟 35 组成 345（夹吃），可以跟 56 组成 456（但手牌没6）
      expect(options.length).toBe(2)
      expect(options.some(o => o.type === 'high')).toBe(true) // 234
      expect(options.some(o => o.type === 'mid')).toBe(true)  // 345
    })

    it('should not allow Chii on Jihai (字牌不能吃)', () => {
      const hand = [
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST),
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.SOUTH)
      ]
      const discarded = createTile(TILE_TYPE.JIHAI, TILE_VALUE.WEST)
      const options = canChii(hand, discarded)
      expect(options.length).toBe(0)
    })

    it('should correctly identify Pon (碰) and Daiminkan (明杠)', () => {
      const hand = [
        createTile(TILE_TYPE.PINZU, 5),
        createTile(TILE_TYPE.PINZU, 5),
        createTile(TILE_TYPE.PINZU, 5)
      ]
      const discarded = createTile(TILE_TYPE.PINZU, 5)

      expect(canPon(hand, discarded)).toBe(true)
      expect(canDaiminkan(hand, discarded)).toBe(true)
    })

    it('should correctly identify Ankan (暗杠)', () => {
      const hand = [
        createTile(TILE_TYPE.SOUZU, 9),
        createTile(TILE_TYPE.SOUZU, 9),
        createTile(TILE_TYPE.SOUZU, 9),
        createTile(TILE_TYPE.SOUZU, 9),
        createTile(TILE_TYPE.MANZU, 1)
      ]
      const ankanTiles = canAnkan(hand)
      expect(ankanTiles.length).toBe(1)
      expect(ankanTiles[0].index).toBe(9)
    })

    it('should correctly identify Kakan (加杠)', () => {
      const exposed = [
        { type: 'pon', tiles: [createTile(TILE_TYPE.PINZU, 5), createTile(TILE_TYPE.PINZU, 5), createTile(TILE_TYPE.PINZU, 5)] }
      ]
      const drawnTile = createTile(TILE_TYPE.PINZU, 5)
      const result = canKakan(exposed, drawnTile)
      expect(result.can).toBe(true)
      expect(result.setIndex).toBe(0)
    })
  })

  describe('Scoring Logic', () => {
    it('should calculate base score for different fan counts', () => {
      const { calculateScore } = require('../utils/mahjong')
      // 广东麻将逻辑：1番 (非庄家) -> base 1, 3番 (非庄家) -> base 4
      expect(calculateScore(1, false).base).toBe(1)
      expect(calculateScore(3, false).base).toBe(4)
      expect(calculateScore(6, false).base).toBe(32)
    })
  })

  describe('Utility Functions', () => {
    it('should sort hand correctly by type and index', () => {
      const hand = [
        createTile(TILE_TYPE.JIHAI, TILE_VALUE.EAST),
        createTile(TILE_TYPE.MANZU, 9),
        createTile(TILE_TYPE.PINZU, 1),
        createTile(TILE_TYPE.MANZU, 1)
      ]
      const sorted = sortHand(hand)
      expect(sorted[0].type).toBe(TILE_TYPE.MANZU)
      expect(sorted[0].index).toBe(1)
      expect(sorted[1].index).toBe(9)
      expect(sorted[2].type).toBe(TILE_TYPE.PINZU)
      expect(sorted[3].type).toBe(TILE_TYPE.JIHAI)
    })
  })
})
