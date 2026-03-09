import { describe, it, expect } from 'vitest'
import { hashString, HASH_ALGORITHMS } from '../utils/hash'

describe('Hash Utils', () => {
  describe('hashString', () => {
    it('应该计算正确的 MD5 值', () => {
      const result = hashString('hello world', 'MD5')
      expect(result).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3')
    })

    it('应该计算正确的 SHA256 值', () => {
      const result = hashString('hello world', 'SHA256')
      expect(result).toBe(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      )
    })

    it('应该计算正确的 SHA1 值', () => {
      const result = hashString('hello world', 'SHA1')
      expect(result).toBe('2aae6c35c94fcfb415dbe95f408b9ce91ee846ed')
    })

    it('应该计算正确的 SHA512 值', () => {
      const result = hashString('hello world', 'SHA512')
      expect(result).toBe(
        '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f'
      )
    })

    it('应该输出 Base64 格式', () => {
      const hexResult = hashString('hello', 'MD5', false)
      const base64Result = hashString('hello', 'MD5', true)

      // Base64 结果应该不同于 Hex 格式
      expect(hexResult).not.toBe(base64Result)
      // Base64 结果应该包含 Base64 特征字符
      expect(base64Result.length).toBeLessThan(hexResult.length)
    })

    it('应该处理空字符串', () => {
      const result = hashString('', 'MD5')
      expect(result).toBe('d41d8cd98f00b204e9800998ecf8427e')
    })

    it('应该处理中文字符', () => {
      const result = hashString('你好世界', 'SHA256')
      expect(result.length).toBe(64) // SHA256 输出 64 位十六进制
    })

    it('应该抛出错误对于不支持的算法', () => {
      expect(() => hashString('test', 'INVALID')).toThrow('不支持的算法')
    })
  })

  describe('HASH_ALGORITHMS', () => {
    it('应该包含所有支持的算法', () => {
      expect(Object.keys(HASH_ALGORITHMS)).toEqual([
        'MD5',
        'SHA1',
        'SHA256',
        'SHA384',
        'SHA512',
        'RIPEMD160'
      ])
    })

    it('每个算法应该有 name 和 bits 属性', () => {
      for (const [key, config] of Object.entries(HASH_ALGORITHMS)) {
        expect(config).toHaveProperty('name')
        expect(config).toHaveProperty('bits')
        expect(typeof config.bits).toBe('number')
      }
    })
  })
})
