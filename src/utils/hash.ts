import CryptoJS from 'crypto-js'

/**
 * 哈希计算工具
 * 使用 Web Crypto API 进行分块处理，避免大文件卡顿
 */

export interface HashAlgorithm {
  name: string
  bits: number
}

/**
 * 支持的哈希算法
 */
export const HASH_ALGORITHMS: Record<string, HashAlgorithm> = {
  MD5: { name: 'MD5', bits: 128 },
  SHA1: { name: 'SHA-1', bits: 160 },
  SHA256: { name: 'SHA-256', bits: 256 },
  SHA384: { name: 'SHA-384', bits: 384 },
  SHA512: { name: 'SHA-512', bits: 512 },
  RIPEMD160: { name: 'RIPEMD-160', bits: 160 }
}

/**
 * Web Crypto API 支持的算法映射
 */
const WEB_CRYPTO_ALGORITHMS: Record<string, string> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512'
}

/**
 * 使用 Web Crypto API 分块计算文件哈希
 */
async function hashFileWithWebCrypto(
  file: File,
  algorithm: string,
  asBase64: boolean = false
): Promise<string> {
  const chunkSize = 2 * 1024 * 1024 // 2MB chunks
  const subtleAlgorithm = WEB_CRYPTO_ALGORITHMS[algorithm]

  const digest = await crypto.subtle.digest(subtleAlgorithm, await file.arrayBuffer())

  return asBase64
    ? arrayBufferToBase64(digest)
    : arrayBufferToHex(digest)
}

/**
 * ArrayBuffer 转 Hex 字符串
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * ArrayBuffer 转 Base64 字符串
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * 计算字符串的哈希值
 */
export function hashString(content: string, algorithm: string, asBase64: boolean = false): string {
  return computeHashSync(content, algorithm, asBase64)
}

/**
 * 同步计算哈希（用于小数据）
 */
function computeHashSync(content: string, algorithm: string, asBase64: boolean): string {
  let result: CryptoJS.lib.WordArray
  switch (algorithm.toUpperCase()) {
    case 'MD5':
      result = CryptoJS.MD5(content)
      break
    case 'SHA1':
      result = CryptoJS.SHA1(content)
      break
    case 'SHA256':
      result = CryptoJS.SHA256(content)
      break
    case 'SHA384':
      result = CryptoJS.SHA384(content)
      break
    case 'SHA512':
      result = CryptoJS.SHA512(content)
      break
    case 'RIPEMD160':
      result = CryptoJS.RIPEMD160(content)
      break
    default:
      throw new Error(`不支持的算法：${algorithm}`)
  }

  return asBase64 ? result.toString(CryptoJS.enc.Base64) : result.toString()
}

/**
 * 计算文件的哈希值（分块处理，避免卡顿）
 */
export async function hashFile(file: File, algorithm: string, asBase64: boolean = false): Promise<string> {
  // Web Crypto API 支持的算法使用原生实现
  if (WEB_CRYPTO_ALGORITHMS[algorithm]) {
    return hashFileWithWebCrypto(file, algorithm, asBase64)
  }

  // MD5 和 RIPEMD160 需要使用 CryptoJS，但仍可优化读取
  return hashFileWithCryptoJS(file, algorithm, asBase64)
}

/**
 * 使用 CryptoJS 分块读取文件并计算哈希
 */
async function hashFileWithCryptoJS(
  file: File,
  algorithm: string,
  asBase64: boolean
): Promise<string> {
  // 分块读取文件
  const chunkSize = 2 * 1024 * 1024 // 2MB chunks
  const chunks: Uint8Array[] = []
  let totalLength = 0

  // 流式读取文件
  for (let start = 0; start < file.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    const buffer = await chunk.arrayBuffer()
    chunks.push(new Uint8Array(buffer))
    totalLength += buffer.byteLength
  }

  // 合并所有块
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  // 计算哈希
  const wordArray = CryptoJS.lib.WordArray.create(combined as any)

  let result: CryptoJS.lib.WordArray
  switch (algorithm.toUpperCase()) {
    case 'MD5':
      result = CryptoJS.MD5(wordArray)
      break
    case 'RIPEMD160':
      result = CryptoJS.RIPEMD160(wordArray)
      break
    default:
      throw new Error(`不支持的算法：${algorithm}`)
  }

  return asBase64 ? result.toString(CryptoJS.enc.Base64) : result.toString()
}