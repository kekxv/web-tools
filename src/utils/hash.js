import CryptoJS from 'crypto-js'

/**
 * 支持的哈希算法
 */
export const HASH_ALGORITHMS = {
  MD5: { name: 'MD5', bits: 128 },
  SHA1: { name: 'SHA-1', bits: 160 },
  SHA256: { name: 'SHA-256', bits: 256 },
  SHA384: { name: 'SHA-384', bits: 384 },
  SHA512: { name: 'SHA-512', bits: 512 },
  RIPEMD160: { name: 'RIPEMD-160', bits: 160 }
}

/**
 * 计算字符串的哈希值
 * @param {string} content - 内容
 * @param {string} algorithm - 算法名称
 * @param {boolean} asBase64 - 是否输出 Base64 格式
 * @returns {string} 哈希值
 */
export function hashString(content, algorithm, asBase64 = false) {
  let result

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
 * 计算文件的哈希值
 * @param {File} file - 文件对象
 * @param {string} algorithm - 算法名称
 * @param {boolean} asBase64 - 是否输出 Base64 格式
 * @returns {Promise<string>} 哈希值
 */
export async function hashFile(file, algorithm, asBase64 = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const content = event.target.result
        const hash = hashString(content, algorithm, asBase64)
        resolve(hash)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsBinaryString(file)
  })
}
