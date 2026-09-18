/**
 * 猜密码（模拟 iPhone 锁屏）小游戏逻辑
 *
 * 玩法：先设置一个密码并锁定手机，把手机交给别人来猜。
 * 连续猜错会被「停用」一段时间（模拟真实 iPhone 的锁定机制）。
 *
 * 注意：密码只属于设置的人，这里刻意不提供任何
 * 「位置正确 / 数字正确」之类的命中提示，也不提供揭晓答案的能力。
 */

// 支持的密码位数
export const PASSCODE_LENGTHS = [4, 6] as const
export type PasscodeLength = (typeof PASSCODE_LENGTHS)[number]

// 第几次猜错开始停用手机（即前 4 次猜错不锁）
export const ATTEMPTS_BEFORE_LOCKOUT = 5

// 停用时长（秒）阶梯：第一次 5 秒，每次多 5 秒，最后一项为上限
export const LOCKOUT_STEPS = [5, 10, 15, 20, 25, 30]

/**
 * 校验密码格式
 */
export function isValidPasscode(passcode: unknown, length: PasscodeLength = 4): boolean {
  return typeof passcode === 'string' && new RegExp(`^\\d{${length}}$`).test(passcode)
}

/**
 * 随机生成一个密码
 */
export function randomPasscode(length: PasscodeLength = 4): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10)
  }
  return result
}

/**
 * 猜错 failedAttempts 次后需要停用的秒数（0 表示不停用）
 */
export function getLockoutSeconds(failedAttempts: number): number {
  if (!Number.isFinite(failedAttempts) || failedAttempts < ATTEMPTS_BEFORE_LOCKOUT) {
    return 0
  }
  const index = Math.min(failedAttempts - ATTEMPTS_BEFORE_LOCKOUT, LOCKOUT_STEPS.length - 1)
  return LOCKOUT_STEPS[index]
}

/**
 * 距离下一次停用还剩几次机会
 */
export function getRemainingAttemptsBeforeLockout(failedAttempts: number): number {
  if (!Number.isFinite(failedAttempts)) return ATTEMPTS_BEFORE_LOCKOUT
  return Math.max(0, ATTEMPTS_BEFORE_LOCKOUT - Math.max(0, failedAttempts))
}

/**
 * 停用倒计时格式化：65 -> "1:05"
 */
export function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

/**
 * 粗略时长格式化，用于「穷举要跑多久」这类估算：65 -> "1 分钟"，7200 -> "2 小时"
 */
export function formatRoughDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} 秒`
  const minutes = Math.round(total / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.round(total / 3600)
  if (hours < 24) return `${hours} 小时`
  return `${Math.round(total / 86400)} 天`
}

/**
 * 用时格式化：65 -> "1 分 5 秒"
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return minutes > 0 ? `${minutes} 分 ${rest} 秒` : `${rest} 秒`
}
