import { describe, expect, it } from 'vitest'
import {
  calculateMonthlyPayment,
  calculateSchedule,
  calculatePrepaymentPlans,
  inferAnnualRate,
  calculateEndDate,
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
