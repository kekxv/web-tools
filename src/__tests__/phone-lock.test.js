import { describe, it, expect } from 'vitest'
import {
  ATTEMPTS_BEFORE_LOCKOUT,
  LOCKOUT_STEPS,
  isValidPasscode,
  randomPasscode,
  getLockoutSeconds,
  getRemainingAttemptsBeforeLockout,
  formatCountdown,
  formatDuration
} from '../utils/phone-lock'

describe('PhoneLock Utils', () => {
  describe('isValidPasscode', () => {
    it('应该接受对应长度的纯数字密码', () => {
      expect(isValidPasscode('1234', 4)).toBe(true)
      expect(isValidPasscode('123456', 6)).toBe(true)
    })

    it('应该拒绝长度不符、含非数字或非字符串的输入', () => {
      expect(isValidPasscode('123', 4)).toBe(false)
      expect(isValidPasscode('12345', 4)).toBe(false)
      expect(isValidPasscode('12a4', 4)).toBe(false)
      expect(isValidPasscode(null, 4)).toBe(false)
      expect(isValidPasscode(1234, 4)).toBe(false)
    })

    it('默认按 4 位校验', () => {
      expect(isValidPasscode('0000')).toBe(true)
      expect(isValidPasscode('000000')).toBe(false)
    })
  })

  describe('randomPasscode', () => {
    it('应该生成指定长度的纯数字密码', () => {
      for (let i = 0; i < 20; i++) {
        expect(isValidPasscode(randomPasscode(4), 4)).toBe(true)
        expect(isValidPasscode(randomPasscode(6), 6)).toBe(true)
      }
    })
  })

  describe('getLockoutSeconds', () => {
    it('免锁次数内不停用', () => {
      for (let i = 0; i < ATTEMPTS_BEFORE_LOCKOUT; i++) {
        expect(getLockoutSeconds(i)).toBe(0)
      }
    })

    it('从第 5 次猜错开始按阶梯停用：5 秒起，每次多 5 秒', () => {
      expect(getLockoutSeconds(5)).toBe(5)
      expect(getLockoutSeconds(6)).toBe(10)
      expect(getLockoutSeconds(7)).toBe(15)
      expect(getLockoutSeconds(8)).toBe(20)
      expect(getLockoutSeconds(9)).toBe(25)
      expect(getLockoutSeconds(10)).toBe(30)
    })

    it('停用时长封顶 30 秒，不再继续加', () => {
      expect(getLockoutSeconds(11)).toBe(30)
      expect(getLockoutSeconds(50)).toBe(30)
      expect(getLockoutSeconds(9999)).toBe(LOCKOUT_STEPS[LOCKOUT_STEPS.length - 1])
    })
  })

  describe('getRemainingAttemptsBeforeLockout', () => {
    it('应该返回距离停用还剩的次数', () => {
      expect(getRemainingAttemptsBeforeLockout(0)).toBe(ATTEMPTS_BEFORE_LOCKOUT)
      expect(getRemainingAttemptsBeforeLockout(3)).toBe(ATTEMPTS_BEFORE_LOCKOUT - 3)
    })

    it('超过次数后不应该出现负数', () => {
      expect(getRemainingAttemptsBeforeLockout(5)).toBe(0)
      expect(getRemainingAttemptsBeforeLockout(50)).toBe(0)
    })
  })

  describe('formatCountdown', () => {
    it('应该格式化为 m:ss', () => {
      expect(formatCountdown(0)).toBe('0:00')
      expect(formatCountdown(9)).toBe('0:09')
      expect(formatCountdown(65)).toBe('1:05')
      expect(formatCountdown(300)).toBe('5:00')
    })

    it('负数按 0 处理', () => {
      expect(formatCountdown(-3)).toBe('0:00')
    })
  })

  describe('formatDuration', () => {
    it('应该格式化为中文用时', () => {
      expect(formatDuration(0)).toBe('0 秒')
      expect(formatDuration(45)).toBe('45 秒')
      expect(formatDuration(65)).toBe('1 分 5 秒')
      expect(formatDuration(120)).toBe('2 分 0 秒')
    })
  })
})
