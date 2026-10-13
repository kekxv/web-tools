import { describe, expect, it } from 'vitest'
import { decodeMortgageShare, encodeMortgageShare, type MortgageShareData } from '../utils/mortgage-share'
import CryptoJS from 'crypto-js'
import LZString from 'lz-string'

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
  it('opens existing m1 and m2 links without borrowing parameters', () => {
    const compact = [0, 0, data.principalWan, data.months, data.annualRatePercent, data.paymentInput, data.startDate]
    for (const [prefix, plaintext] of [['m1', JSON.stringify(data)], ['m2', LZString.compressToEncodedURIComponent(JSON.stringify(compact))]]) {
      const encrypted = CryptoJS.AES.encrypt(plaintext, '123456').toString()
      const safe = (value: string) => value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      const mac = CryptoJS.HmacSHA256(encrypted, '123456').toString(CryptoJS.enc.Base64)
      expect(decodeMortgageShare(`${prefix}.${safe(encrypted)}.${safe(mac)}`, '123456')).toEqual(data)
    }
  })
  it('round-trips borrowing settings in both rate and payment modes', () => {
    for (const inputMode of ['rate', 'payment'] as const) {
      const shared = { ...data, prepayment: { fundingMode: 'borrow' as const, expanded: true, amountWan: 12, delayMonths: 6, borrowWan: 15, borrowMonths: 60, inputMode, input: inputMode === 'rate' ? 0.3 : 2800, fee: 1200 } }
      expect(decodeMortgageShare(encodeMortgageShare(shared, '123456'), '123456')).toEqual(shared)
    }
  })

  it('rejects invalid borrowing parameters', () => {
    const shared = { ...data, prepayment: { fundingMode: 'borrow' as const, expanded: true, amountWan: 12, delayMonths: 6, borrowWan: 15, borrowMonths: 60, inputMode: 'rate' as const, input: 0.3, fee: -10 } }
    expect(() => encodeMortgageShare(shared, '123456')).toThrow('分享内容格式无效')
  })

  it('allows sharing a small mortgage when the unused borrowing amount exceeds its balance', () => {
    const shared = { ...data, principalWan: 5, prepayment: { fundingMode: 'own' as const, expanded: false, amountWan: 0, delayMonths: 0, borrowWan: 15, borrowMonths: 60, inputMode: 'rate' as const, input: 0.3, fee: 0 } }
    expect(decodeMortgageShare(encodeMortgageShare(shared, '123456'), '123456')).toEqual(shared)
  })
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
