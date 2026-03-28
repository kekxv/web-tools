import CryptoJS from 'crypto-js'

/**
 * TOTP 配置选项
 */
export interface TotpOptions {
  digits?: number // 验证码位数，默认 6
  period?: number // 时间周期（秒），默认 30
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512' // 算法，默认 SHA1
}

/**
 * OTPAuth URL 解析结果
 */
export interface OtpAuthConfig {
  secret: string
  account: string
  issuer: string
  digits: number
  period: number
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
}

// Base32 字符表
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Base32 解码
 */
function base32Decode(str: string): Uint8Array {
  // 移除空格和等号
  const cleaned = str.toUpperCase().replace(/\s/g, '').replace(/=+$/g, '')

  const result: number[] = []
  let bits = 0
  let value = 0

  for (const char of cleaned) {
    const index = BASE32_CHARS.indexOf(char)
    if (index === -1) {
      throw new Error(`无效的 Base32 字符: ${char}`)
    }

    value = (value << 5) | index
    bits += 5

    while (bits >= 8) {
      result.push((value >> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return new Uint8Array(result)
}

/**
 * Base32 编码
 */
function base32Encode(bytes: Uint8Array): string {
  let result = ''
  let bits = 0
  let value = 0

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      result += BASE32_CHARS[(value >> (bits - 5)) & 0x1f]
      bits -= 5
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f]
  }

  return result
}

/**
 * 生成随机 Base32 密钥
 * @param length 密钥字节长度，默认 20（160位，生成 32 字符的 Base32）
 */
export function generateRandomSecret(length: number = 20): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

/**
 * 获取当前时间步
 */
function getTimeStep(period: number): number {
  return Math.floor(Date.now() / 1000 / period)
}

/**
 * 获取当前周期剩余秒数
 */
export function getRemainingSeconds(period: number = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period)
}

/**
 * 生成 TOTP 验证码
 * @param secret Base32 编码的密钥
 * @param timestamp 可选的时间戳（用于测试），默认使用当前时间
 * @param options 配置选项
 */
export function generateTOTP(
  secret: string,
  timestamp?: number,
  options: TotpOptions = {}
): string {
  const digits = options.digits ?? 6
  const period = options.period ?? 30
  const algorithm = options.algorithm ?? 'SHA1'

  // 检查空密钥
  const cleanedSecret = secret.toUpperCase().replace(/\s/g, '').replace(/=+$/g, '')
  if (!cleanedSecret) {
    throw new Error('密钥不能为空')
  }

  // 解码密钥
  const keyBytes = base32Decode(cleanedSecret)
  const keyWordArray = CryptoJS.lib.WordArray.create(keyBytes as any)

  // 计算时间步
  const time = timestamp ?? Date.now()
  let timeStepValue = Math.floor(time / 1000 / period)

  // 时间步转换为 8 字节大端序
  const timeBytes = new Uint8Array(8)
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = timeStepValue & 0xff
    timeStepValue = Math.floor(timeStepValue / 256)
  }
  const timeWordArray = CryptoJS.lib.WordArray.create(timeBytes as any)

  // 计算 HMAC - 注意顺序：HMAC(key, message)
  let hmac: CryptoJS.lib.WordArray
  switch (algorithm) {
    case 'SHA256':
      hmac = CryptoJS.HmacSHA256(timeWordArray, keyWordArray)
      break
    case 'SHA512':
      hmac = CryptoJS.HmacSHA512(timeWordArray, keyWordArray)
      break
    default:
      hmac = CryptoJS.HmacSHA1(timeWordArray, keyWordArray)
  }

  // 动态截取
  const hmacBytes = wordArrayToUint8Array(hmac)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f
  const binary =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)

  const otp = binary % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

/**
 * WordArray 转 Uint8Array
 */
function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const words = wordArray.words
  const sigBytes = wordArray.sigBytes
  const bytes = new Uint8Array(sigBytes)

  for (let i = 0; i < sigBytes; i++) {
    bytes[i] = (words[i >> 2] >> (24 - (i % 4) * 8)) & 0xff
  }

  return bytes
}

/**
 * 解析 otpauth:// URL
 * @param url otpauth URL 字符串
 */
export function parseOtpAuthUrl(url: string): OtpAuthConfig {
  if (!url.startsWith('otpauth://')) {
    throw new Error('无效的 otpauth URL 格式')
  }

  // 解析 URL - 使用正则方式以兼容不同环境
  const match = url.match(/^otpauth:\/\/(\w+)\/(.+)\?(.*)$/)
  if (!match) {
    throw new Error('无效的 otpauth URL 格式')
  }

  const [, protocol, path, queryString] = match

  if (protocol !== 'totp' && protocol !== 'hotp') {
    throw new Error(`不支持的 OTP 类型: ${protocol}`)
  }
  // 解析 account 和 issuer
  let account = path
  let issuer = ''

  if (path.includes(':')) {
    const parts = path.split(':')
    issuer = decodeURIComponent(parts[0])
    account = decodeURIComponent(parts[1])
  }

  // 解析参数
  const params = new URLSearchParams(queryString)
  const secret = params.get('secret')
  if (!secret) {
    throw new Error('otpauth URL 缺少 secret 参数')
  }

  const issuerParam = params.get('issuer')
  if (issuerParam) {
    issuer = decodeURIComponent(issuerParam)
  }

  const digits = parseInt(params.get('digits') || '6', 10)
  const period = parseInt(params.get('period') || '30', 10)
  const algorithmParam = params.get('algorithm') || 'SHA1'

  const algorithm: 'SHA1' | 'SHA256' | 'SHA512' =
    algorithmParam.toUpperCase() === 'SHA256' ? 'SHA256' :
    algorithmParam.toUpperCase() === 'SHA512' ? 'SHA512' : 'SHA1'

  return {
    secret,
    account,
    issuer,
    digits,
    period,
    algorithm
  }
}

/**
 * 生成 otpauth:// URL
 */
export function generateOtpAuthUrl(
  secret: string,
  account: string,
  issuer: string = '',
  options: TotpOptions = {}
): string {
  const digits = options.digits ?? 6
  const period = options.period ?? 30
  const algorithm = options.algorithm ?? 'SHA1'

  // 构建路径
  let path = encodeURIComponent(account)
  if (issuer) {
    path = `${encodeURIComponent(issuer)}:${path}`
  }

  // 构建参数
  const params = new URLSearchParams()
  params.set('secret', secret)
  if (issuer) {
    params.set('issuer', issuer)
  }
  params.set('digits', digits.toString())
  params.set('period', period.toString())
  params.set('algorithm', algorithm)

  return `otpauth://totp/${path}?${params.toString()}`
}

/**
 * 已保存的 TOTP 配置
 */
export interface SavedTotp {
  id: string
  secret: string
  account: string
  issuer: string
  digits: number
  period: number
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
  createdAt: number
}

const STORAGE_KEY = 'totp_secrets'

/**
 * 获取已保存的 TOTP 列表
 */
export function getSavedTotps(): SavedTotp[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * 保存 TOTP 配置
 */
export function saveTotp(config: Omit<SavedTotp, 'id' | 'createdAt'>): SavedTotp {
  const totps = getSavedTotps()
  const newTotp: SavedTotp = {
    ...config,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  }
  totps.push(newTotp)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(totps))
  return newTotp
}

/**
 * 删除已保存的 TOTP
 */
export function deleteTotp(id: string): void {
  const totps = getSavedTotps()
  const filtered = totps.filter(t => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * 更新已保存的 TOTP
 */
export function updateTotp(id: string, config: Partial<SavedTotp>): SavedTotp | null {
  const totps = getSavedTotps()
  const index = totps.findIndex(t => t.id === id)
  if (index === -1) return null

  totps[index] = { ...totps[index], ...config }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(totps))
  return totps[index]
}