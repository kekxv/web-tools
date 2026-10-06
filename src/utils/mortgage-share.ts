import CryptoJS from 'crypto-js'
import type { RepaymentMethod } from './mortgage'

export interface MortgageShareData {
  mode: 'payment' | 'rate'
  method: RepaymentMethod
  principalWan: number
  months: number
  annualRatePercent: number
  paymentInput: number
  startDate: string
  prepaymentWan: number
  prepayDelayMonths: number
}

const PREFIX = 'm1.'

const toUrlSafe = (value: string) => value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
const fromUrlSafe = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
}

const assertCode = (code: string) => {
  if (!code || !code.trim()) throw new Error('验证码不能为空')
}

export function encodeMortgageShare(data: MortgageShareData, code: string): string {
  assertCode(code)
  const plaintext = JSON.stringify(data)
  const encrypted = CryptoJS.AES.encrypt(plaintext, code.trim()).toString()
  const mac = CryptoJS.HmacSHA256(encrypted, code.trim()).toString(CryptoJS.enc.Base64)
  return PREFIX + toUrlSafe(encrypted) + '.' + toUrlSafe(mac)
}

export function decodeMortgageShare(token: string, code: string): MortgageShareData {
  assertCode(code)
  if (!token.startsWith(PREFIX)) throw new Error('分享内容格式无效')
  try {
    const parts = token.slice(PREFIX.length).split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('分享内容格式无效')
    const encrypted = fromUrlSafe(parts[0])
    const expectedMac = toUrlSafe(CryptoJS.HmacSHA256(encrypted, code.trim()).toString(CryptoJS.enc.Base64))
    if (expectedMac !== parts[1]) throw new Error('验证码错误或分享内容已损坏')
    const plaintext = CryptoJS.AES.decrypt(encrypted, code.trim()).toString(CryptoJS.enc.Utf8)
    if (!plaintext) throw new Error('验证码错误或分享内容已损坏')
    const data = JSON.parse(plaintext) as MortgageShareData
    if (!isValidMortgageShareData(data)) throw new Error('分享内容格式无效')
    return data
  } catch (error) {
    if (error instanceof Error && (error.message === '验证码错误或分享内容已损坏' || error.message === '分享内容格式无效')) throw error
    throw new Error('验证码错误或分享内容已损坏')
  }
}

function isValidMortgageShareData(data: MortgageShareData): boolean {
  if (!data || (data.mode !== 'payment' && data.mode !== 'rate')) return false
  if (data.method !== 'equal-payment' && data.method !== 'equal-principal') return false
  if (!Number.isFinite(data.principalWan) || data.principalWan <= 0) return false
  if (!Number.isInteger(data.months) || data.months <= 0) return false
  if (!Number.isFinite(data.annualRatePercent) || data.annualRatePercent < 0 || data.annualRatePercent > 100) return false
  if (!Number.isFinite(data.paymentInput) || data.paymentInput <= 0) return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) return false
  const parsedDate = new Date(`${data.startDate}T00:00:00`)
  const [year, month, day] = data.startDate.split('-').map(Number)
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getFullYear() !== year || parsedDate.getMonth() + 1 !== month || parsedDate.getDate() !== day) return false
  if (!Number.isFinite(data.prepaymentWan) || data.prepaymentWan < 0 || data.prepaymentWan > data.principalWan) return false
  if (!Number.isInteger(data.prepayDelayMonths) || data.prepayDelayMonths < 0 || data.prepayDelayMonths >= data.months) return false
  return true
}

export function buildMortgageShareUrl(token: string, currentUrl = window.location.href): string {
  const url = new URL(currentUrl)
  url.search = ''
  url.hash = `/mortgage?share=${encodeURIComponent(token)}`
  return url.toString()
}
