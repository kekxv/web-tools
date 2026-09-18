/**
 * 挑战码：把设置的人设的密码打包成一个「只能校验、不能反解」的令牌
 *
 * 分享给别人时，链接里放的就是这个令牌。设计目标是不让猜的人作弊：
 *
 * 1. 单向 —— 令牌里只有 PBKDF2 的派生结果。整个前端没有任何一条代码路径能把
 *    密码还原出来，所以就算有人把打包后的 JS 反编译、翻遍源码，也找不到一个
 *    「解密函数」可以直接调用。这是「不给捷径」，不是「藏起来」。
 * 2. 加盐 —— 每条挑战码带 16 字节随机盐，彩虹表 / 预计算表全部失效，
 *    每猜一个密码都必须老老实实跑一次 KDF。
 * 3. 慢哈希 —— PBKDF2-SHA256 默认 250 万次迭代，实测一次校验约 0.2 秒（桌面浏览器），
 *    手机上大约 0.5~1 秒。想拿浏览器写个循环把 6 位密码全部试一遍，
 *    光这一项成本就是一天起（单线程），换个玩法比这划算得多。
 *    迭代次数写在令牌里，以后想调高不用作废旧链接。
 * 4. 限幅 —— 解析时把迭代次数限制在合理区间，别人塞一个 10 亿次的令牌也卡不死页面。
 * 5. 迭代次数、盐、哈希长度都做校验，随手编的令牌会被直接拒绝。
 *
 * 需要说清楚的边界：客户端能做的只是「抬高成本」，做不到「绝对安全」。
 * 4 位密码只有 1 万种组合，用 GPU 跑离线穷举仍然很快，所以分享时会提示改用 6 位；
 * 想要真正无法破解，得把校验放到服务端做限流 —— 这个纯前端小游戏没有后端。
 */

import { PASSCODE_LENGTHS, type PasscodeLength } from './phone-lock'

export const CHALLENGE_VERSION = 'v1'

/**
 * 默认 KDF 迭代次数。
 * 实测（桌面 Chrome）：25 万次 ≈ 21ms、100 万次 ≈ 82ms、250 万次 ≈ 207ms。
 * 取 250 万：校验一次 0.2 秒（手机 0.5~1 秒）用户能接受，
 * 而离线穷举 6 位密码在浏览器里要跑一天以上。
 */
export const CHALLENGE_ITERATIONS = 2_500_000

/** 解析令牌时允许的迭代次数区间，防止恶意令牌把浏览器卡死 */
export const MIN_CHALLENGE_ITERATIONS = 10_000
export const MAX_CHALLENGE_ITERATIONS = 20_000_000

/** 跟密码一起下锅的固定 pepper：让通用破解工具不能拿着令牌直接开跑（只是提速门槛，不是安全边界） */
const PEPPER = 'web-tools/phone-lock/challenge'

const SALT_BYTES = 16
const HASH_BYTES = 16

export interface Challenge {
  version: string
  /** 密码位数，用来决定界面上画几个点 */
  length: PasscodeLength
  iterations: number
  /** base64url 编码的盐 */
  salt: string
  /** base64url 编码的派生结果 */
  hash: string
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4)
  try {
    const binary = atob(withPadding)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

/** 逐字节比较，不做提前返回（避免按位猜哈希） */
function isSameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('当前浏览器不支持 WebCrypto，无法生成或校验挑战码')
  }
  return subtle
}

/** 跑一次 PBKDF2，返回 base64url 结果。这是唯一能算出答案的路径，无法绕过 */
async function deriveHash(passcode: string, salt: Uint8Array, iterations: number): Promise<string> {
  const subtle = getSubtle()
  const material = new TextEncoder().encode(`${PEPPER}|${passcode}`)
  const key = await subtle.importKey('raw', material, 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    HASH_BYTES * 8
  )
  return toBase64Url(new Uint8Array(bits))
}

/**
 * 用密码生成一条挑战码（只有设置的人知道原密码）
 */
export async function createChallenge(
  passcode: string,
  iterations: number = CHALLENGE_ITERATIONS
): Promise<Challenge> {
  const random = globalThis.crypto?.getRandomValues
  if (typeof random !== 'function') {
    throw new Error('当前浏览器不支持安全随机数，无法生成挑战码')
  }
  const saltBytes = new Uint8Array(SALT_BYTES)
  random.call(globalThis.crypto, saltBytes)

  const hash = await deriveHash(passcode, saltBytes, iterations)

  return {
    version: CHALLENGE_VERSION,
    length: passcode.length as PasscodeLength,
    iterations,
    salt: toBase64Url(saltBytes),
    hash
  }
}

/**
 * 校验一次猜测。猜的人拿到令牌后，只能这样一位一位试
 */
export async function verifyChallenge(challenge: Challenge, guess: string): Promise<boolean> {
  if (guess.length !== challenge.length) return false

  const salt = fromBase64Url(challenge.salt)
  if (!salt || salt.length !== SALT_BYTES) return false

  const hash = await deriveHash(guess, salt, challenge.iterations)
  return isSameHash(hash, challenge.hash)
}

/** 打包成可以放进链接的字符串：v1.4.250000.<salt>.<hash> */
export function encodeChallenge(challenge: Challenge): string {
  return [
    challenge.version,
    challenge.length,
    challenge.iterations,
    challenge.salt,
    challenge.hash
  ].join('.')
}

/**
 * 解析挑战码，任何不合规的输入都返回 null（不抛异常）
 */
export function parseChallenge(raw: unknown): Challenge | null {
  if (typeof raw !== 'string') return null
  const parts = decodeURIComponent(raw).trim().split('.')
  if (parts.length !== 5) return null

  const [version, lengthText, iterationText, salt, hash] = parts
  if (version !== CHALLENGE_VERSION) return null

  const length = Number(lengthText)
  if (!(PASSCODE_LENGTHS as readonly number[]).includes(length)) return null

  const iterations = Number(iterationText)
  if (
    !Number.isInteger(iterations) ||
    iterations < MIN_CHALLENGE_ITERATIONS ||
    iterations > MAX_CHALLENGE_ITERATIONS
  ) {
    return null
  }

  const saltBytes = fromBase64Url(salt)
  const hashBytes = fromBase64Url(hash)
  if (!saltBytes || saltBytes.length !== SALT_BYTES) return null
  if (!hashBytes || hashBytes.length !== HASH_BYTES) return null

  return {
    version,
    length: length as PasscodeLength,
    iterations,
    salt,
    hash
  }
}

/**
 * 离线穷举完所有组合预计要多久（平均试一半就命中）
 */
export function estimateBruteForceSeconds(
  length: PasscodeLength,
  verifySeconds: number
): number {
  if (!Number.isFinite(verifySeconds) || verifySeconds <= 0) return 0
  return (Math.pow(10, length) * verifySeconds) / 2
}
