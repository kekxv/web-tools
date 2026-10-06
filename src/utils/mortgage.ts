export type RepaymentMethod = 'equal-payment' | 'equal-principal'

export interface MortgageSchedule {
  payment: number
  totalPayment: number
  totalInterest: number
  remainingPrincipal: number
  months: number
  /** Last month's payment; for equal principal-and-interest it equals `payment`. */
  lastPayment: number
  /** Amount the payment drops every month; always 0 for equal principal-and-interest. */
  monthlyDecrease: number
}

export interface PrepaymentPlan {
  payment: number
  /** Months still to pay after the prepayment. */
  months: number
  /** Months from today until the loan is cleared, including the waiting period. */
  totalMonths: number
  /** How many months pass before the prepayment is made (0 = right away). */
  delayMonths: number
  totalPayment: number
  totalInterest: number
  savingInterest: number
  endDate?: string
  /** Last month's payment; for equal principal-and-interest it equals `payment`. */
  lastPayment?: number
  /** Amount the payment drops every month; always 0 for equal principal-and-interest. */
  monthlyDecrease?: number
}

export interface RepaymentComparison {
  equalPayment: MortgageSchedule
  equalPrincipal: MortgageSchedule
  /** Interest saved by choosing equal principal over equal principal-and-interest. */
  interestSaving: number
}

const EPSILON = 1e-8
/** A loan is considered repaid once the balance drops below this amount. */
const BALANCE_EPSILON = 0.005

const emptySchedule = (): MortgageSchedule => ({
  payment: 0,
  totalPayment: 0,
  totalInterest: 0,
  remainingPrincipal: 0,
  months: 0,
  lastPayment: 0,
  monthlyDecrease: 0,
})

/** Calculate the fixed monthly payment for an equal principal-and-interest loan. */
export function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const monthlyRate = annualRate / 12
  if (Math.abs(monthlyRate) < EPSILON) return principal / months
  const factor = Math.pow(1 + monthlyRate, months)
  return principal * monthlyRate * factor / (factor - 1)
}

/** Build a repayment summary without rounding each month's internal balance. */
export function calculateSchedule(principal: number, annualRate: number, months: number, payment = calculateMonthlyPayment(principal, annualRate, months)): MortgageSchedule {
  if (principal <= 0 || months <= 0) return emptySchedule()
  const monthlyRate = annualRate / 12
  let balance = principal
  let totalPayment = 0
  let totalInterest = 0
  let actualMonths = 0
  while (balance > BALANCE_EPSILON && actualMonths < months) {
    const interest = balance * monthlyRate
    const installment = Math.min(payment, balance + interest)
    balance = Math.max(0, balance + interest - installment)
    totalPayment += installment
    totalInterest += interest
    actualMonths += 1
  }
  return { payment, lastPayment: payment, monthlyDecrease: 0, totalPayment, totalInterest, remainingPrincipal: balance, months: actualMonths }
}

/**
 * Build an equal-principal (等额本金) summary: the principal part is fixed every month,
 * so the payment decreases by a constant amount while interest shrinks with the balance.
 */
export function calculateEqualPrincipalSchedule(principal: number, annualRate: number, months: number, monthlyPrincipal = principal / months): MortgageSchedule {
  if (principal <= 0 || months <= 0) return emptySchedule()
  const perMonth = Math.min(Math.max(monthlyPrincipal, 0), principal)
  if (perMonth <= 0) return emptySchedule()
  const monthlyRate = annualRate / 12
  let balance = principal
  let totalPayment = 0
  let totalInterest = 0
  let actualMonths = 0
  let firstPayment = 0
  let lastPayment = 0
  while (balance > BALANCE_EPSILON && actualMonths < months) {
    const interest = balance * monthlyRate
    const principalPart = Math.min(perMonth, balance)
    const installment = principalPart + interest
    if (actualMonths === 0) firstPayment = installment
    lastPayment = installment
    balance = Math.max(0, balance - principalPart)
    totalPayment += installment
    totalInterest += interest
    actualMonths += 1
  }
  return { payment: firstPayment, lastPayment, monthlyDecrease: perMonth * monthlyRate, totalPayment, totalInterest, remainingPrincipal: balance, months: actualMonths }
}

/** Dispatch to the schedule builder of the given repayment method. */
export function calculateScheduleByMethod(method: RepaymentMethod, principal: number, annualRate: number, months: number): MortgageSchedule {
  return method === 'equal-principal'
    ? calculateEqualPrincipalSchedule(principal, annualRate, months)
    : calculateSchedule(principal, annualRate, months)
}

/**
 * Compare prepaying now against waiting `delayMonths` months.
 * The loan keeps running on its original plan until the prepayment, then continues either with the
 * same payment (shortening the term) or over the remaining term (lowering the payment).
 */
export function calculatePrepaymentPlans(principal: number, annualRate: number, months: number, prepayment: number, method: RepaymentMethod = 'equal-payment', delayMonths = 0): { shorter: PrepaymentPlan; lowerPayment: PrepaymentPlan } {
  const term = Math.max(Math.floor(months) || 0, 0)
  const delay = Math.min(Math.max(Math.floor(delayMonths) || 0, 0), Math.max(term - 1, 0))
  const base = calculateScheduleByMethod(method, principal, annualRate, term)
  // The original plan runs on untouched until the prepayment is made.
  const firstLeg = method === 'equal-principal'
    ? calculateEqualPrincipalSchedule(principal, annualRate, delay, term > 0 ? principal / term : 0)
    : calculateSchedule(principal, annualRate, delay, base.payment)
  const balance = delay > 0 ? firstLeg.remainingPrincipal : Math.max(principal, 0)
  const paid = Math.min(Math.max(prepayment, 0), Math.max(balance, 0))
  const remaining = Math.max(0, balance - paid)
  const remainingTerm = Math.max(0, term - delay)

  // Only the money still owed can be prepaid, so the interest of both legs is summed up.
  const buildPlan = (schedule: MortgageSchedule): PrepaymentPlan => {
    const totalInterest = firstLeg.totalInterest + schedule.totalInterest
    return {
      payment: schedule.payment,
      months: schedule.months,
      totalMonths: delay + schedule.months,
      delayMonths: delay,
      totalPayment: firstLeg.totalPayment + paid + schedule.totalPayment,
      totalInterest,
      savingInterest: Math.max(0, base.totalInterest - totalInterest),
      lastPayment: schedule.lastPayment,
      monthlyDecrease: schedule.monthlyDecrease,
    }
  }

  if (method === 'equal-principal') {
    // Keeping the monthly principal unchanged keeps the payment level and shortens the term.
    const shorterSchedule = calculateEqualPrincipalSchedule(remaining, annualRate, remainingTerm, term > 0 ? principal / term : 0)
    // Keeping the term spreads the remaining principal over the same number of months.
    const lowerSchedule = calculateEqualPrincipalSchedule(remaining, annualRate, remainingTerm)
    return { shorter: buildPlan(shorterSchedule), lowerPayment: buildPlan(lowerSchedule) }
  }
  const shorterSchedule = calculateSchedule(remaining, annualRate, remainingTerm, base.payment)
  const lowerSchedule = calculateSchedule(remaining, annualRate, remainingTerm)
  return { shorter: buildPlan(shorterSchedule), lowerPayment: buildPlan(lowerSchedule) }
}

/** Infer annual rate as a decimal (e.g. 0.049 = 4.9%). */
export function inferAnnualRate(principal: number, months: number, payment: number): number {
  if (principal <= 0 || months <= 0 || payment <= 0) return 0
  // A payment below principal / months cannot amortize the loan with a non-negative rate.
  if (payment < principal / months - 0.01) return 0
  if (Math.abs(payment * months - principal) < 0.01) return 0
  let low = -0.99 / 12
  let high = 1 / 12
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    const candidate = calculateMonthlyPayment(principal, mid * 12, months)
    if (candidate < payment) low = mid
    else high = mid
  }
  return ((low + high) / 2) * 12
}

/**
 * Infer the annual rate of an equal-principal loan from its first payment.
 * The first payment is `principal / months + principal * monthlyRate`, which solves directly.
 */
export function inferAnnualRateFromFirstPayment(principal: number, months: number, firstPayment: number): number {
  if (principal <= 0 || months <= 0 || firstPayment <= 0) return 0
  const monthlyPrincipal = principal / months
  // A first payment below the monthly principal cannot amortize the loan.
  if (firstPayment < monthlyPrincipal - 0.01) return 0
  const monthlyRate = (firstPayment - monthlyPrincipal) / principal
  return Math.max(0, monthlyRate) * 12
}

/** Compare both repayment methods on the same principal, rate and term. */
export function compareRepaymentMethods(principal: number, annualRate: number, months: number): RepaymentComparison {
  const equalPayment = calculateSchedule(principal, annualRate, months)
  const equalPrincipal = calculateEqualPrincipalSchedule(principal, annualRate, months)
  return {
    equalPayment,
    equalPrincipal,
    interestSaving: Math.max(0, equalPayment.totalInterest - equalPrincipal.totalInterest),
  }
}

const parseDate = (value: string | Date): Date | null => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function calculateEndDate(startDate: string | Date, months: number): string {
  const source = parseDate(startDate)
  if (!source) return ''
  const day = source.getDate()
  const result = new Date(source)
  result.setDate(1)
  result.setMonth(result.getMonth() + Math.max(0, months))
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  const y = result.getFullYear()
  const m = String(result.getMonth() + 1).padStart(2, '0')
  const d = String(result.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Inverse of `calculateEndDate`: how many whole months from `startDate` land on `endDate`.
 * The picked date is snapped to the nearest monthly boundary, so a date a few days off the
 * anniversary still maps to the expected month even when the day is clamped (Jan 31 -> Feb 28).
 */
export function calculateMonthsBetween(startDate: string | Date, endDate: string | Date): number {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end) return 0
  const naive = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of [naive - 1, naive, naive + 1]) {
    const months = Math.max(0, candidate)
    const target = parseDate(calculateEndDate(start, months))
    if (!target) continue
    const distance = Math.abs(target.getTime() - end.getTime())
    if (distance < bestDistance) {
      bestDistance = distance
      best = months
    }
  }
  return best
}

/** Format a remaining term for display in Chinese year/month units. */
export function formatRemainingTerm(months: number): string {
  const safeMonths = Math.max(0, Math.floor(months))
  const years = Math.floor(safeMonths / 12)
  const rest = safeMonths % 12
  if (years > 0 && rest > 0) return `${years}年${rest}个月`
  if (years > 0) return `${years}年`
  return `${rest}个月`
}
