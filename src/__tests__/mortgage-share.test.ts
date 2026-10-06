import { describe, expect, it } from 'vitest'
import { decodeMortgageShare, encodeMortgageShare, type MortgageShareData } from '../utils/mortgage-share'

const data: MortgageShareData = {
  mode: 'payment',
  method: 'equal-payment',
  principalWan: 79.47,
  months: 188,
  annualRatePercent: 4.2,
  paymentInput: 5380.74,
  startDate: '2026-10-06',
}

describe('mortgage sharing', () => {
  it('round-trips form data with a verification code', () => {
    const token = encodeMortgageShare(data, '123456')
    expect(token).toMatch(/^m2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(token.length).toBeLessThan(240)
    expect(decodeMortgageShare(token, '123456')).toEqual(data)
  })

  it('rejects an incorrect verification code', () => {
    const token = encodeMortgageShare(data, '123456')
    expect(() => decodeMortgageShare(token, '654321')).toThrow()
  })

  it('rejects a tampered ciphertext', () => {
    const token = encodeMortgageShare(data, '123456')
    const [prefix, ciphertext, mac] = token.split('.')
    const changed = `${prefix}.${ciphertext.slice(0, -1)}${ciphertext.endsWith('A') ? 'B' : 'A'}.${mac}`
    expect(() => decodeMortgageShare(changed, '123456')).toThrow()
  })

  it('rejects decrypted payloads with invalid fields', () => {
    const invalid = { ...data, method: 'invalid' as MortgageShareData['method'] }
    expect(() => encodeMortgageShare(invalid, '123456')).toThrow('分享内容格式无效')
  })

  it('rejects empty verification codes', () => {
    expect(() => encodeMortgageShare(data, ' ')).toThrow('验证码不能为空')
    expect(() => decodeMortgageShare('m1.invalid', '')).toThrow('验证码不能为空')
  })
})
