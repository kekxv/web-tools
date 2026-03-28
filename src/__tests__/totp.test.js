import {
  generateTOTP,
  generateRandomSecret,
  parseOtpAuthUrl,
  generateOtpAuthUrl,
  getRemainingSeconds
} from '../utils/totp'

// 内部函数需要导出才能测试，这里直接从模块中导入
// 如果没有导出，我们通过其他方式测试

describe('TOTP Utils', () => {
  describe('generateTOTP', () => {
    it('应该生成正确的 TOTP 验证码', () => {
      // 使用 RFC 6238 附录 B 测试向量
      // 密钥 "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" (Base32 编码的 "12345678901234567890")
      // 时间步 T = 1 对应 TOTP = "287082"
      const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
      const timestamp = 30 * 1000 // Unix 时间 30 秒 = 时间步 1
      const result = generateTOTP(secret, timestamp)
      expect(result).toBe('287082')
    })

    it('应该生成 6 位验证码', () => {
      const secret = generateRandomSecret()
      const result = generateTOTP(secret)
      expect(result.length).toBe(6)
      expect(/^\d{6}$/.test(result)).toBe(true)
    })

    it('应该支持自定义位数', () => {
      const secret = generateRandomSecret()
      const result = generateTOTP(secret, undefined, { digits: 8 })
      expect(result.length).toBe(8)
      expect(/^\d{8}$/.test(result)).toBe(true)
    })

    it('应该支持 SHA256 算法', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const result = generateTOTP(secret, undefined, { algorithm: 'SHA256' })
      expect(result.length).toBe(6)
      expect(/^\d{6}$/.test(result)).toBe(true)
    })

    it('应该支持 SHA512 算法', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const result = generateTOTP(secret, undefined, { algorithm: 'SHA512' })
      expect(result.length).toBe(6)
      expect(/^\d{6}$/.test(result)).toBe(true)
    })

    it('应该处理包含空格的密钥', () => {
      const secret = 'JBSW Y3DP EHPK 3PXP'
      const result = generateTOTP(secret)
      expect(result.length).toBe(6)
    })

    it('应该抛出错误对于无效密钥', () => {
      expect(() => generateTOTP('invalid!')).toThrow()
    })

    it('应该抛出错误对于空密钥', () => {
      expect(() => generateTOTP('')).toThrow()
    })
  })

  describe('generateRandomSecret', () => {
    it('应该生成有效的 Base32 密钥', () => {
      const secret = generateRandomSecret()
      expect( /^[A-Z2-7]+$/.test(secret) ).toBe(true)
    })

    it('应该生成默认长度的密钥', () => {
      const secret = generateRandomSecret()
      // 20 字节 = 32 个 Base32 字符
      expect(secret.length).toBe(32)
    })

    it('应该支持自定义长度', () => {
      const secret = generateRandomSecret(10)
      // 10 字节 = 16 个 Base32 字符
      expect(secret.length).toBe(16)
    })

    it('每次生成的密钥应该不同', () => {
      const secrets = [generateRandomSecret(), generateRandomSecret(), generateRandomSecret()]
      expect(new Set(secrets).size).toBe(3)
    })
  })

  describe('parseOtpAuthUrl', () => {
    it('应该正确解析标准 otpauth URL', () => {
      const url = 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example'
      const config = parseOtpAuthUrl(url)
      expect(config.secret).toBe('JBSWY3DPEHPK3PXP')
      expect(config.account).toBe('alice@example.com')
      expect(config.issuer).toBe('Example')
      expect(config.digits).toBe(6)
      expect(config.period).toBe(30)
      expect(config.algorithm).toBe('SHA1')
    })

    it('应该正确解析不带 issuer 的 URL', () => {
      const url = 'otpauth://totp/alice@example.com?secret=JBSWY3DPEHPK3PXP'
      const config = parseOtpAuthUrl(url)
      expect(config.secret).toBe('JBSWY3DPEHPK3PXP')
      expect(config.account).toBe('alice@example.com')
      expect(config.issuer).toBe('')
    })

    it('应该正确解析自定义参数', () => {
      const url = 'otpauth://totp/Test:test?secret=JBSWY3DPEHPK3PXP&digits=8&period=60&algorithm=SHA256'
      const config = parseOtpAuthUrl(url)
      expect(config.digits).toBe(8)
      expect(config.period).toBe(60)
      expect(config.algorithm).toBe('SHA256')
    })

    it('应该抛出错误对于无效 URL', () => {
      expect(() => parseOtpAuthUrl('https://example.com')).toThrow('无效的 otpauth URL 格式')
    })

    it('应该抛出错误对于缺少 secret 的 URL', () => {
      expect(() => parseOtpAuthUrl('otpauth://totp/Test:test?')).toThrow('otpauth URL 缺少 secret 参数')
    })

    it('应该支持 HOTP 类型', () => {
      const url = 'otpauth://hotp/Test:test?secret=ABC&counter=1'
      const config = parseOtpAuthUrl(url)
      expect(config.secret).toBe('ABC')
    })
  })

  describe('generateOtpAuthUrl', () => {
    it('应该生成正确的 otpauth URL', () => {
      const url = generateOtpAuthUrl('JBSWY3DPEHPK3PXP', 'alice@example.com', 'Example')
      expect(url).toContain('otpauth://totp/')
      expect(url).toContain('secret=JBSWY3DPEHPK3PXP')
      expect(url).toContain('issuer=Example')
    })

    it('应该包含所有必要参数', () => {
      const url = generateOtpAuthUrl('TESTSECRET', 'user', 'issuer', { digits: 8, period: 60 })
      expect(url).toContain('digits=8')
      expect(url).toContain('period=60')
    })

    it('应该正确处理不带 issuer 的情况', () => {
      const url = generateOtpAuthUrl('TESTSECRET', 'user', '')
      expect(url).not.toContain('issuer=')
    })
  })

  describe('getRemainingSeconds', () => {
    it('应该返回 0-30 之间的值', () => {
      const remaining = getRemainingSeconds()
      expect(remaining).toBeGreaterThanOrEqual(0)
      expect(remaining).toBeLessThanOrEqual(30)
    })

    it('应该支持自定义周期', () => {
      const remaining = getRemainingSeconds(60)
      expect(remaining).toBeGreaterThanOrEqual(0)
      expect(remaining).toBeLessThanOrEqual(60)
    })
  })
})