import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MortgageView from '../views/MortgageView.vue'

/**
 * 提前还款时点：期数与日期两个输入框互相同步。
 * Element Plus 组件用轻量 stub 替代，只保留 v-model 行为。
 */
const stubs = {
  'el-card': { template: '<div class="stub-card"><slot /></div>' },
  'el-tabs': { props: ['modelValue'], template: '<div><slot /></div>' },
  'el-tab-pane': { template: '<div><slot /></div>' },
  'el-radio-group': { props: ['modelValue'], template: '<div><slot /></div>' },
  'el-radio-button': { props: ['value'], template: '<button type="button"><slot /></button>' },
  // `emits` keeps the parent listener from being attached natively as well, which would fire twice.
  'el-button': { emits: ['click'], template: '<button type="button" @click="$emit(\'click\')"><slot /></button>' },
  'el-input': {
    props: ['modelValue'],
    template: '<input class="stub-input" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />'
  },
  'el-date-picker': {
    props: ['modelValue'],
    template: '<input class="stub-date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}

/** 打开页面 → 设定起始日期 → 计算 → 展开提前还款 */
async function openPrepayment(wrapper) {
  await wrapper.findAll('.stub-date')[0].setValue('2026-10-06')
  const calculate = wrapper.findAll('button').find((btn) => btn.text().includes('开始计算'))
  await calculate.trigger('click')
  const toggle = wrapper.findAll('button').find((btn) => btn.text().includes('试算提前还款'))
  await toggle.trigger('click')
}

const prepayPeriodInput = (wrapper) => wrapper.find('input[placeholder="0"]')
const prepayDateInput = (wrapper) => wrapper.findAll('.stub-date')[1]

describe('MortgageView prepayment timing', () => {
  it('fills the date when the number of periods is typed', async () => {
    const wrapper = mount(MortgageView, { global: { stubs } })
    await openPrepayment(wrapper)
    await prepayPeriodInput(wrapper).setValue('12')
    expect(prepayDateInput(wrapper).element.value).toBe('2027-10-06')
  })

  it('fills the number of periods when a date is picked', async () => {
    const wrapper = mount(MortgageView, { global: { stubs } })
    await openPrepayment(wrapper)
    await prepayDateInput(wrapper).setValue('2028-10-06')
    expect(Number(prepayPeriodInput(wrapper).element.value)).toBe(24)
  })

  it('snaps a date outside the loan back to an immediate prepayment', async () => {
    const wrapper = mount(MortgageView, { global: { stubs } })
    await openPrepayment(wrapper)
    await prepayPeriodInput(wrapper).setValue('12')
    // 贷款开始之前的日期无法提前还款，回落到 0 期并同步回起始日期
    await prepayDateInput(wrapper).setValue('2020-01-01')
    expect(Number(prepayPeriodInput(wrapper).element.value)).toBe(0)
    expect(prepayDateInput(wrapper).element.value).toBe('2026-10-06')
  })

  it('moves the prepayment date when the loan start date changes', async () => {
    const wrapper = mount(MortgageView, { global: { stubs } })
    await openPrepayment(wrapper)
    await prepayPeriodInput(wrapper).setValue('12')
    await wrapper.findAll('.stub-date')[0].setValue('2027-03-15')
    expect(prepayDateInput(wrapper).element.value).toBe('2028-03-15')
  })

  it('shows the resulting payoff date for each plan', async () => {
    const wrapper = mount(MortgageView, { global: { stubs } })
    await openPrepayment(wrapper)
    await prepayPeriodInput(wrapper).setValue('12')
    const meta = wrapper.findAll('.plan-meta').map((node) => node.text())
    expect(meta).toHaveLength(2)
    for (const text of meta) expect(text).toContain('还满 12 期后提前还')
    expect(meta[0]).not.toBe(meta[1])
  })
})
