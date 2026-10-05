export interface MortgageSchedule {
  payment: number
  totalPayment: number
  totalInterest: number
  remainingPrincipal: number
  months: number
}

export interface PrepaymentPlan {
  payment: number
  months: number
  totalPayment: number
  totalInterest: number
  savingInterest: number
  endDate?: string
}

const EPSILON = 1e-8

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
  if (principal <= 0 || months <= 0) return { payment: 0, totalPayment: 0, totalInterest: 0, remainingPrincipal: 0, months: 0 }
  const monthlyRate = annualRate / 12
  let balance = principal
  let totalPayment = 0
  let actualMonths = 0
  while (balance > 0.005 && actualMonths < months) {
    const interest = balance * monthlyRate
    const installment = Math.min(payment, balance + interest)
    balance = Math.max(0, balance + interest - installment)
    totalPayment += installment
    actualMonths += 1
  }
  return { payment, totalPayment, totalInterest: totalPayment - principal, remainingPrincipal: balance, months: actualMonths }
}

export function calculatePrepaymentPlans(principal: number, annualRate: number, months: number, prepayment: number): { shorter: PrepaymentPlan; lowerPayment: PrepaymentPlan } {
  const paid = Math.min(Math.max(prepayment, 0), Math.max(principal, 0))
  const base = calculateSchedule(principal, annualRate, months)
  const remaining = Math.max(0, principal - paid)
  const lowerSchedule = calculateSchedule(remaining, annualRate, months)
  const shorterPayment = base.payment
  const shorterSchedule = calculateSchedule(remaining, annualRate, months, shorterPayment)
  return {
    shorter: {
      payment: shorterPayment,
      months: shorterSchedule.months,
      totalPayment: shorterSchedule.totalPayment + paid,
      totalInterest: shorterSchedule.totalInterest,
      savingInterest: Math.max(0, base.totalInterest - shorterSchedule.totalInterest),
    },
    lowerPayment: {
      payment: lowerSchedule.payment,
      months: lowerSchedule.months,
      totalPayment: lowerSchedule.totalPayment + paid,
      totalInterest: lowerSchedule.totalInterest,
      savingInterest: Math.max(0, base.totalInterest - lowerSchedule.totalInterest),
    },
  }
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

export function calculateEndDate(startDate: string | Date, months: number): string {
  const source = typeof startDate === 'string' ? new Date(`${startDate}T00:00:00`) : new Date(startDate)
  if (Number.isNaN(source.getTime())) return ''
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

/** Format a remaining term for display in Chinese year/month units. */
export function formatRemainingTerm(months: number): string {
  const safeMonths = Math.max(0, Math.floor(months))
  const years = Math.floor(safeMonths / 12)
  const rest = safeMonths % 12
  if (years > 0 && rest > 0) return `${years}年${rest}个月`
  if (years > 0) return `${years}年`
  return `${rest}个月`
}
