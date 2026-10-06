import { describe, expect, it } from 'vitest'
import {
  calculateMonthlyPayment,
  calculateSchedule,
  calculateEqualPrincipalSchedule,
  calculateScheduleByMethod,
  calculatePrepaymentPlans,
  compareRepaymentMethods,
  inferAnnualRate,
  inferAnnualRateFromFirstPayment,
  calculateEndDate,
  calculateMonthsBetween,
  formatRemainingTerm,
} from '../utils/mortgage'

describe('mortgage calculations', () => {
  it('calculates equal principal and interest payment and total interest', () => {
    expect(calculateMonthlyPayment(1000000, 0.049, 240)).toBeCloseTo(6544.44, 2)
    const schedule = calculateSchedule(1000000, 0.049, 240)
    expect(schedule.payment).toBeCloseTo(6544.44, 2)
    expect(schedule.totalInterest).toBeCloseTo(570665.7, 0)
    expect(schedule.remainingPrincipal).toBeCloseTo(0, 2)
  })

  it('supports zero interest', () => {
    expect(calculateMonthlyPayment(120000, 0, 12)).toBe(10000)
  })

  it('compares early repayment plans', () => {
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 150000)
    expect(plans.shorter.months).toBeLessThan(240)
    expect(plans.lowerPayment.months).toBe(240)
    expect(plans.shorter.savingInterest).toBeGreaterThan(plans.lowerPayment.savingInterest)
    expect(plans.shorter.payment).toBeCloseTo(4932.57, 0)
  })

  it('infers annual rate from monthly payment', () => {
    expect(inferAnnualRate(1000000, 240, 6544.44)).toBeCloseTo(0.049, 4)
  })

  it('returns zero for a payment that cannot amortize principal', () => {
    expect(inferAnnualRate(120000, 12, 9000)).toBe(0)
  })

  it('formats remaining months as years and months', () => {
    expect(formatRemainingTerm(188)).toBe('15年8个月')
    expect(formatRemainingTerm(236)).toBe('19年8个月')
    expect(formatRemainingTerm(12)).toBe('1年')
    expect(formatRemainingTerm(5)).toBe('5个月')
  })

  it('calculates end date by adding months', () => {
    expect(calculateEndDate('2025-01-31', 12)).toBe('2026-01-31')
    expect(calculateEndDate('2024-02-29', 12)).toBe('2025-02-28')
  })
})

describe('counting months between dates', () => {
  it('counts whole months from the start date', () => {
    expect(calculateMonthsBetween('2026-10-06', '2027-10-06')).toBe(12)
    expect(calculateMonthsBetween('2026-10-06', '2026-10-06')).toBe(0)
    expect(calculateMonthsBetween('2026-10-06', '2026-11-06')).toBe(1)
  })

  it('snaps a picked date to the nearest monthly boundary', () => {
    expect(calculateMonthsBetween('2026-10-06', '2026-11-05')).toBe(1)
    expect(calculateMonthsBetween('2026-10-06', '2026-10-20')).toBe(0)
    expect(calculateMonthsBetween('2026-10-06', '2026-11-07')).toBe(1)
  })

  it('never returns a negative count for a past date', () => {
    expect(calculateMonthsBetween('2026-10-06', '2026-09-06')).toBe(0)
  })

  it('tolerates month-end clamping in both directions', () => {
    expect(calculateMonthsBetween('2026-01-31', '2026-02-28')).toBe(1)
    expect(calculateMonthsBetween('2026-01-31', '2026-04-30')).toBe(3)
  })

  it('round-trips every month of a loan', () => {
    for (const start of ['2026-01-31', '2024-02-29', '2026-10-06', '2026-08-31']) {
      for (let month = 0; month <= 240; month += 1) {
        expect(calculateMonthsBetween(start, calculateEndDate(start, month))).toBe(month)
      }
    }
  })
})

describe('equal principal repayment', () => {
  it('decreases the payment every month by a fixed amount', () => {
    const schedule = calculateEqualPrincipalSchedule(1000000, 0.049, 240)
    expect(schedule.payment).toBeCloseTo(8250, 2)
    expect(schedule.lastPayment).toBeCloseTo(4183.68, 2)
    expect(schedule.monthlyDecrease).toBeCloseTo(17.01, 2)
    expect(schedule.totalInterest).toBeCloseTo(492041.67, 2)
    expect(schedule.totalPayment).toBeCloseTo(1492041.67, 2)
    expect(schedule.months).toBe(240)
    expect(schedule.remainingPrincipal).toBeCloseTo(0, 2)
  })

  it('keeps the payment flat when the rate is zero', () => {
    const schedule = calculateEqualPrincipalSchedule(120000, 0, 12)
    expect(schedule.payment).toBeCloseTo(10000, 6)
    expect(schedule.lastPayment).toBeCloseTo(10000, 6)
    expect(schedule.monthlyDecrease).toBeCloseTo(0, 6)
    expect(schedule.totalInterest).toBeCloseTo(0, 6)
  })

  it('reports equal principal and interest schedules through one dispatcher', () => {
    const byMethod = calculateScheduleByMethod('equal-payment', 1000000, 0.049, 240)
    const direct = calculateSchedule(1000000, 0.049, 240)
    expect(byMethod.payment).toBeCloseTo(direct.payment, 6)
    expect(byMethod.totalInterest).toBeCloseTo(direct.totalInterest, 6)
    expect(byMethod.lastPayment).toBeCloseTo(direct.payment, 6)
    expect(byMethod.monthlyDecrease).toBe(0)

    const principalByMethod = calculateScheduleByMethod('equal-principal', 1000000, 0.049, 240)
    expect(principalByMethod.payment).toBeCloseTo(8250, 2)
    expect(principalByMethod.lastPayment).toBeCloseTo(4183.68, 2)
  })

  it('marks equal principal and interest payments as flat', () => {
    const schedule = calculateSchedule(1000000, 0.049, 240)
    expect(schedule.lastPayment).toBeCloseTo(schedule.payment, 6)
    expect(schedule.monthlyDecrease).toBe(0)
  })
})

describe('equal principal prepayment plans', () => {
  const base = calculateEqualPrincipalSchedule(800000, 0.042, 240)

  it('shortens the term while keeping the monthly principal unchanged', () => {
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-principal')
    // The principal part stays at 800000 / 240, so only the interest part of the first payment shrinks.
    expect(plans.shorter.months).toBe(195)
    expect(plans.shorter.payment).toBeCloseTo(5608.33, 2)
    expect(plans.shorter.payment).toBeLessThan(base.payment)
    expect(plans.shorter.monthlyDecrease).toBeCloseTo(11.67, 2)
    expect(plans.shorter.savingInterest).toBeCloseTo(114450, 0)
  })

  it('lowers the payment over the original remaining term', () => {
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-principal')
    expect(plans.lowerPayment.months).toBe(240)
    expect(plans.lowerPayment.payment).toBeCloseTo(4983.33, 2)
    expect(plans.lowerPayment.payment).toBeLessThan(base.payment)
    expect(plans.lowerPayment.savingInterest).toBeCloseTo(63262.5, 0)
  })

  it('always saves more interest by shortening the term', () => {
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-principal')
    expect(plans.shorter.savingInterest).toBeGreaterThan(plans.lowerPayment.savingInterest)
    expect(plans.shorter.totalPayment).toBeGreaterThan(0)
  })

  it('defaults to equal principal-and-interest when no method is given', () => {
    const withDefault = calculatePrepaymentPlans(800000, 0.042, 240, 150000)
    const explicit = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-payment')
    expect(withDefault.shorter.months).toBe(explicit.shorter.months)
    expect(withDefault.shorter.savingInterest).toBeCloseTo(explicit.shorter.savingInterest, 6)
  })
})

describe('prepayment timing', () => {
  const base = calculateSchedule(800000, 0.042, 240)

  it('counts the first leg on the original plan before the prepayment', () => {
    const firstLeg = calculateSchedule(800000, 0.042, 12, base.payment)
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-payment', 12)
    const secondLeg = calculateSchedule(firstLeg.remainingPrincipal - 150000, 0.042, 228, base.payment)
    expect(plans.shorter.delayMonths).toBe(12)
    expect(plans.shorter.months).toBe(secondLeg.months)
    expect(plans.shorter.totalMonths).toBe(12 + secondLeg.months)
    expect(plans.shorter.totalInterest).toBeCloseTo(firstLeg.totalInterest + secondLeg.totalInterest, 2)
    expect(plans.shorter.totalPayment).toBeCloseTo(firstLeg.totalPayment + 150000 + secondLeg.totalPayment, 2)
  })

  it('keeps the full term when the payment is lowered after a delayed prepayment', () => {
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-payment', 12)
    expect(plans.lowerPayment.totalMonths).toBe(240)
    expect(plans.lowerPayment.payment).toBeLessThan(base.payment)
  })

  it('saves less interest when the prepayment happens later', () => {
    const immediate = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-payment', 0)
    const delayed = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-payment', 60)
    expect(delayed.shorter.savingInterest).toBeLessThan(immediate.shorter.savingInterest)
    expect(delayed.shorter.totalMonths).toBeGreaterThan(immediate.shorter.totalMonths)
  })

  it('handles a zero delay exactly like an immediate prepayment', () => {
    const immediate = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-payment')
    expect(immediate.shorter.delayMonths).toBe(0)
    expect(immediate.shorter.totalMonths).toBe(immediate.shorter.months)
  })

  it('never prepays more than the balance owed at that time', () => {
    const firstLeg = calculateSchedule(800000, 0.042, 239, base.payment)
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 900000, 'equal-payment', 239)
    expect(plans.shorter.totalMonths).toBe(239)
    expect(plans.shorter.totalPayment).toBeCloseTo(firstLeg.totalPayment + firstLeg.remainingPrincipal, 2)
  })

  it('delays an equal principal prepayment too', () => {
    const firstLeg = calculateEqualPrincipalSchedule(800000, 0.042, 24, 800000 / 240)
    const plans = calculatePrepaymentPlans(800000, 0.042, 240, 150000, 'equal-principal', 24)
    const secondLeg = calculateEqualPrincipalSchedule(firstLeg.remainingPrincipal - 150000, 0.042, 216)
    expect(plans.lowerPayment.totalMonths).toBe(240)
    expect(plans.lowerPayment.totalInterest).toBeCloseTo(firstLeg.totalInterest + secondLeg.totalInterest, 2)
    expect(plans.shorter.totalMonths).toBeLessThan(240)
  })
})

describe('repayment method comparison', () => {
  it('shows equal principal paying less interest but a higher first payment', () => {
    const comparison = compareRepaymentMethods(1000000, 0.049, 240)
    expect(comparison.equalPayment.payment).toBeCloseTo(6544.44, 2)
    expect(comparison.equalPrincipal.payment).toBeCloseTo(8250, 2)
    expect(comparison.equalPayment.totalInterest).toBeCloseTo(570665.7, 0)
    expect(comparison.equalPrincipal.totalInterest).toBeCloseTo(492041.67, 2)
    expect(comparison.interestSaving).toBeCloseTo(78624.05, 2)
    expect(comparison.interestSaving).toBeCloseTo(comparison.equalPayment.totalInterest - comparison.equalPrincipal.totalInterest, 6)
  })

  it('never reports a negative saving', () => {
    const comparison = compareRepaymentMethods(120000, 0, 12)
    expect(comparison.interestSaving).toBe(0)
    expect(comparison.equalPrincipal.payment).toBeCloseTo(10000, 6)
  })
})

describe('inferring the rate of an equal principal loan', () => {
  it('recovers the annual rate from the first payment', () => {
    expect(inferAnnualRateFromFirstPayment(1000000, 240, 8250)).toBeCloseTo(0.049, 6)
  })

  it('returns zero when the first payment cannot cover the monthly principal', () => {
    expect(inferAnnualRateFromFirstPayment(120000, 12, 9000)).toBe(0)
  })

  it('returns zero for invalid input', () => {
    expect(inferAnnualRateFromFirstPayment(0, 240, 8000)).toBe(0)
    expect(inferAnnualRateFromFirstPayment(1000000, 0, 8000)).toBe(0)
  })
})
