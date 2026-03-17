import CryptoJS from 'crypto-js'

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
 * 计算字符串的哈希值
 */
export function hashString(content: string, algorithm: string, asBase64: boolean = false): string {
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
 * 将 ArrayBuffer 转换为 CryptoJS 的 WordArray
 */
function arrayBufferToWordArray(buffer: ArrayBuffer): CryptoJS.lib.WordArray {
  const bytes = new Uint8Array(buffer)
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      (bytes[i] << 24) |
      (bytes[i + 1] << 16) |
      (bytes[i + 2] << 8) |
      (bytes[i + 3] || 0)
    )
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

/**
 * 计算文件的哈希值
 */
export async function hashFile(file: File, algorithm: string, asBase64: boolean = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer
        // 将 ArrayBuffer 转换为 CryptoJS 的 WordArray
        const wordArray = arrayBufferToWordArray(arrayBuffer)

        let result: CryptoJS.lib.WordArray
        switch (algorithm.toUpperCase()) {
          case 'MD5':
            result = CryptoJS.MD5(wordArray)
            break
          case 'SHA1':
            result = CryptoJS.SHA1(wordArray)
            break
          case 'SHA256':
            result = CryptoJS.SHA256(wordArray)
            break
          case 'SHA384':
            result = CryptoJS.SHA384(wordArray)
            break
          case 'SHA512':
            result = CryptoJS.SHA512(wordArray)
            break
          case 'RIPEMD160':
            result = CryptoJS.RIPEMD160(wordArray)
            break
          default:
            throw new Error(`不支持的算法：${algorithm}`)
        }

        resolve(asBase64 ? result.toString(CryptoJS.enc.Base64) : result.toString())
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsArrayBuffer(file)
  })
}