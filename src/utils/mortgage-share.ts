import CryptoJS from 'crypto-js'
import LZString from 'lz-string'
import type { RepaymentMethod } from './mortgage'

export interface MortgageShareData {
  mode: 'payment' | 'rate'
  method: RepaymentMethod
  principalWan: number
  months: number
  annualRatePercent: number
  paymentInput: number
  startDate: string
}

const PREFIX = 'm2.'

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
  if (!isValidMortgageShareData(data)) throw new Error('分享内容格式无效')
  const compact = [data.mode === 'payment' ? 0 : 1, data.method === 'equal-payment' ? 0 : 1, data.principalWan, data.months, data.annualRatePercent, data.paymentInput, data.startDate]
  const plaintext = LZString.compressToEncodedURIComponent(JSON.stringify(compact))
  const encrypted = CryptoJS.AES.encrypt(plaintext, code.trim()).toString()
  const mac = CryptoJS.HmacSHA256(encrypted, code.trim()).toString(CryptoJS.enc.Base64)
  return PREFIX + toUrlSafe(encrypted) + '.' + toUrlSafe(mac)
}

export function decodeMortgageShare(token: string, code: string): MortgageShareData {
  assertCode(code)
  if (!token.startsWith('m1.') && !token.startsWith(PREFIX)) throw new Error('分享内容格式无效')
  try {
    const legacy = token.startsWith('m1.')
    const parts = token.slice(legacy ? 3 : PREFIX.length).split('.')
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('分享内容格式无效')
    const encrypted = fromUrlSafe(parts[0])
    const expectedMac = toUrlSafe(CryptoJS.HmacSHA256(encrypted, code.trim()).toString(CryptoJS.enc.Base64))
    if (expectedMac !== parts[1]) throw new Error('验证码错误或分享内容已损坏')
    const plaintext = CryptoJS.AES.decrypt(encrypted, code.trim()).toString(CryptoJS.enc.Utf8)
    if (!plaintext) throw new Error('验证码错误或分享内容已损坏')
    const data = legacy ? JSON.parse(plaintext) as MortgageShareData : decodeCompact(LZString.decompressFromEncodedURIComponent(plaintext))
    if (!isValidMortgageShareData(data)) throw new Error('分享内容格式无效')
    return data
  } catch (error) {
    if (error instanceof Error && (error.message === '验证码错误或分享内容已损坏' || error.message === '分享内容格式无效')) throw error
    throw new Error('验证码错误或分享内容已损坏')
  }
}

function decodeCompact(plaintext: string | null): MortgageShareData {
  if (!plaintext) throw new Error('验证码错误或分享内容已损坏')
  const values = JSON.parse(plaintext) as unknown[]
  if (!Array.isArray(values) || values.length !== 7) throw new Error('分享内容格式无效')
  return {
    mode: values[0] === 0 ? 'payment' : 'rate',
    method: values[1] === 0 ? 'equal-payment' : 'equal-principal',
    principalWan: values[2] as number,
    months: values[3] as number,
    annualRatePercent: values[4] as number,
    paymentInput: values[5] as number,
    startDate: values[6] as string,
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
  return true
}

export function buildMortgageShareUrl(token: string, currentUrl = window.location.href): string {
  const url = new URL(currentUrl)
  url.search = ''
  url.hash = `/mortgage?share=${encodeURIComponent(token)}`
  return url.toString()
}
