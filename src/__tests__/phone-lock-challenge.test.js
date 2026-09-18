import { describe, it, expect, beforeAll } from 'vitest'
import {
  CHALLENGE_VERSION,
  CHALLENGE_ITERATIONS,
  MIN_CHALLENGE_ITERATIONS,
  MAX_CHALLENGE_ITERATIONS,
  createChallenge,
  verifyChallenge,
  encodeChallenge,
  parseChallenge,
  estimateBruteForceSeconds
} from '../utils/phone-lock-challenge'

// 测试里用低迭代次数，跑得快；逻辑跟线上完全一致
const FAST = 10000

describe('phone-lock-challenge', () => {
  describe('createChallenge / verifyChallenge', () => {
    it('生成的挑战码里不含密码明文', async () => {
      const challenge = await createChallenge('1357', FAST)
      const token = encodeChallenge(challenge)

      expect(token).not.toContain('1357')
      expect(JSON.stringify(challenge)).not.toContain('1357')
      expect(challenge.hash).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('猜对了返回 true，猜错了返回 false', async () => {
      const challenge = await createChallenge('1357', FAST)

      expect(await verifyChallenge(challenge, '1357')).toBe(true)
      expect(await verifyChallenge(challenge, '1358')).toBe(false)
      expect(await verifyChallenge(challenge, '0000')).toBe(false)
      expect(await verifyChallenge(challenge, '2468')).toBe(false)
    })

    it('位数不对直接判错，不用跑 KDF', async () => {
      const challenge = await createChallenge('1357', FAST)
      expect(await verifyChallenge(challenge, '135')).toBe(false)
      expect(await verifyChallenge(challenge, '13579')).toBe(false)
      expect(await verifyChallenge(challenge, '')).toBe(false)
    })

    it('六位密码一样能校验', async () => {
      const challenge = await createChallenge('246813', FAST)
      expect(challenge.length).toBe(6)
      expect(await verifyChallenge(challenge, '246813')).toBe(true)
      expect(await verifyChallenge(challenge, '246814')).toBe(false)
    })

    it('同一个密码每次生成的结果都不同（每次都有新盐）', async () => {
      const a = await createChallenge('1357', FAST)
      const b = await createChallenge('1357', FAST)

      expect(a.salt).not.toBe(b.salt)
      expect(a.hash).not.toBe(b.hash)
      // 但都能校验通过
      expect(await verifyChallenge(a, '1357')).toBe(true)
      expect(await verifyChallenge(b, '1357')).toBe(true)
    })

    it('换掉盐会让原来的密码失效（防止拿别人的哈希套用）', async () => {
      const challenge = await createChallenge('1357', FAST)
      const tampered = { ...challenge, salt: (await createChallenge('0000', FAST)).salt }
      expect(await verifyChallenge(tampered, '1357')).toBe(false)
    })
  })

  describe('encodeChallenge / parseChallenge', () => {
    it('打包再解析能还原', async () => {
      const challenge = await createChallenge('1357', FAST)
      const parsed = parseChallenge(encodeChallenge(challenge))
      expect(parsed).toEqual(challenge)
    })

    it('格式是 v1.位数.迭代次数.盐.哈希', async () => {
      const challenge = await createChallenge('1357', FAST)
      const parts = encodeChallenge(challenge).split('.')
      expect(parts).toHaveLength(5)
      expect(parts[0]).toBe(CHALLENGE_VERSION)
      expect(parts[1]).toBe('4')
      expect(parts[2]).toBe(String(FAST))
    })

    it('乱编的令牌一律拒绝', () => {
      expect(parseChallenge(null)).toBeNull()
      expect(parseChallenge(undefined)).toBeNull()
      expect(parseChallenge(12345)).toBeNull()
      expect(parseChallenge('')).toBeNull()
      expect(parseChallenge('1357')).toBeNull()
      expect(parseChallenge('v1.4.10000.abc')).toBeNull()
      expect(parseChallenge('v2.4.10000.AAECAwQFBgcICQoLDA0ODw.AAECAwQFBgcICQoLDA0ODw')).toBeNull()
    })

    it('位数只能是 4 或 6', () => {
      const base = `v1.5.10000.AAECAwQFBgcICQoLDA0ODw.AAECAwQFBgcICQoLDA0ODw`
      expect(parseChallenge(base)).toBeNull()
      expect(parseChallenge(base.replace('v1.5.', 'v1.4.'))).not.toBeNull()
      expect(parseChallenge(base.replace('v1.5.', 'v1.6.'))).not.toBeNull()
    })

    it('迭代次数超出范围会被拒绝（防止有人塞个天文数字卡死页面）', () => {
      const salt = 'AAECAwQFBgcICQoLDA0ODw'
      const hash = 'AAECAwQFBgcICQoLDA0ODw'
      expect(parseChallenge(`v1.4.${MIN_CHALLENGE_ITERATIONS - 1}.${salt}.${hash}`)).toBeNull()
      expect(parseChallenge(`v1.4.${MIN_CHALLENGE_ITERATIONS}.${salt}.${hash}`)).not.toBeNull()
      expect(parseChallenge(`v1.4.${MAX_CHALLENGE_ITERATIONS}.${salt}.${hash}`)).not.toBeNull()
      expect(parseChallenge(`v1.4.${MAX_CHALLENGE_ITERATIONS + 1}.${salt}.${hash}`)).toBeNull()
      expect(parseChallenge(`v1.4.999999999999.${salt}.${hash}`)).toBeNull()
      expect(parseChallenge(`v1.4.abc.${salt}.${hash}`)).toBeNull()
      expect(parseChallenge(`v1.4.-10000.${salt}.${hash}`)).toBeNull()
    })

    it('盐或哈希长度不对会被拒绝', () => {
      expect(parseChallenge('v1.4.10000.short.AAECAwQFBgcICQoLDA0ODw')).toBeNull()
      expect(parseChallenge('v1.4.10000.AAECAwQFBgcICQoLDA0ODw.short')).toBeNull()
      expect(parseChallenge('v1.4.10000.!!!!.AAECAwQFBgcICQoLDA0ODw')).toBeNull()
    })

    it('解析出来的令牌能直接拿去校验', async () => {
      const challenge = await createChallenge('2468', FAST)
      const parsed = parseChallenge(encodeChallenge(challenge))
      expect(await verifyChallenge(parsed, '2468')).toBe(true)
      expect(await verifyChallenge(parsed, '2469')).toBe(false)
    })

    it('默认迭代次数够高，足以拖慢离线穷举', () => {
      expect(CHALLENGE_ITERATIONS).toBeGreaterThanOrEqual(2_000_000)
    })
  })

  describe('estimateBruteForceSeconds', () => {
    it('按位数和单次耗时估算穷举时间', () => {
      // 4 位：10000 种组合，平均试一半
      expect(estimateBruteForceSeconds(4, 1)).toBe(5000)
      // 6 位：1000000 种组合
      expect(estimateBruteForceSeconds(6, 0.2)).toBe(100000)
    })

    it('非法耗时返回 0', () => {
      expect(estimateBruteForceSeconds(4, 0)).toBe(0)
      expect(estimateBruteForceSeconds(4, -1)).toBe(0)
      expect(estimateBruteForceSeconds(4, Number.NaN)).toBe(0)
    })
  })
})
