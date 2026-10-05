<template>
  <div class="mortgage-view page-container">
    <div class="mortgage-shell">
      <div class="hero">
        <div>
          <span class="eyebrow">PERSONAL FINANCE</span>
          <h1 class="page-title">房贷助手</h1>
          <p class="page-description">输入剩余贷款信息，快速估算月供、利息与提前还款方案。</p>
        </div>
        <div class="hero-icon">⌂</div>
      </div>

      <el-card class="input-card" shadow="never">
        <el-tabs v-model="mode" class="mode-tabs">
          <el-tab-pane label="计算月供" name="payment" />
          <el-tab-pane label="由月供反推利率" name="rate" />
        </el-tabs>
        <div class="form-grid">
          <div class="form-field">
            <label>剩余贷款本金</label>
            <el-input v-model.number="principalWan" type="number" min="0" placeholder="例如 80">
              <template #append>万元</template>
            </el-input>
          </div>
          <div class="form-field">
            <label>剩余期数</label>
            <el-input v-model.number="months" type="number" min="1" placeholder="例如 188">
              <template #append>期</template>
            </el-input>
          </div>
          <div v-if="mode === 'payment'" class="form-field">
            <label>年利率</label>
            <el-input v-model.number="annualRatePercent" type="number" min="0" step="0.01" placeholder="例如 4.2">
              <template #append>%</template>
            </el-input>
          </div>
          <div v-else class="form-field">
            <label>当前月供</label>
            <el-input v-model.number="paymentInput" type="number" min="0" step="0.01" placeholder="例如 5380">
              <template #append>元</template>
            </el-input>
          </div>
          <div class="form-field">
            <label>本期起始日期</label>
            <el-date-picker v-model="startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
          </div>
        </div>
        <div class="form-actions">
          <el-button type="primary" size="large" @click="calculate" @keyup.enter="calculate" :loading="calculating">开始计算</el-button>
          <el-button size="large" @click="reset">重置</el-button>
        </div>
        <p class="form-hint">计算结果仅供参考，实际还款金额以贷款银行账单为准。</p>
      </el-card>

      <template v-if="result">
        <div class="summary-grid">
          <div class="summary-card highlight"><span>预计月供</span><strong>¥{{ money(result.payment) }}</strong><small>等额本息</small></div>
          <div class="summary-card"><span>剩余利息</span><strong>¥{{ money(result.totalInterest) }}</strong><small>按当前计划还款</small></div>
          <div class="summary-card"><span>预计到期</span><strong class="date-value">{{ result.endDate }}</strong><small>剩余 {{ formatRemainingTerm(months) }}（{{ months }}期）</small></div>
        </div>

        <el-card class="result-card" shadow="never">
          <div class="section-heading">
            <div><span class="section-kicker">REPAYMENT PLAN</span><h2>提前还款试算</h2></div>
            <el-button type="primary" plain @click="showPrepayment = !showPrepayment">{{ showPrepayment ? '收起方案' : '试算提前还款' }}</el-button>
          </div>
          <div v-if="!showPrepayment" class="empty-plan"><span>💡</span><p>输入提前还款本金，比较“缩短年限”和“降低月供”哪种方式更适合你。</p></div>
          <div v-else class="prepay-content">
            <div class="prepay-input">
              <label>提前偿还本金</label>
              <el-input v-model.number="prepaymentWan" type="number" min="0" :max="principalWan" placeholder="例如 15"><template #append>万元</template></el-input>
              <span class="input-tip">最多不超过剩余本金 ¥{{ money(principalWan * 10000) }}</span>
            </div>
            <div v-if="plans" class="plan-list">
              <div v-for="(plan, key) in plans" :key="key" class="plan-row" :class="{ recommended: key === 'shorter' }">
                <div class="plan-radio"><span>{{ key === 'shorter' ? '✓' : '○' }}</span><b>{{ key === 'shorter' ? '缩短年限' : '降低月供' }}</b><em v-if="key === 'shorter'">更省利息</em></div>
                <div class="plan-detail"><strong>月供约 ¥{{ money(plan.payment) }}</strong><span>剩余 {{ formatRemainingTerm(plan.months) }}（{{ plan.months }}期） · 到期 {{ calculateEndDate(startDate, plan.months) }}</span></div>
                <div class="saving">节省 {{ money(plan.savingInterest) }} 元</div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="schedule-card" shadow="never">
          <div class="section-heading"><div><span class="section-kicker">DETAILS</span><h2>贷款概览</h2></div></div>
          <div class="detail-grid">
            <div><span>剩余本金</span><b>¥{{ money(principalWan * 10000) }}</b></div>
            <div><span>年利率</span><b>{{ formatRate(result.annualRate) }}</b></div>
            <div><span>还款总额</span><b>¥{{ money(result.totalPayment) }}</b></div>
            <div><span>还款方式</span><b>等额本息</b></div>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { calculateEndDate, calculateMonthlyPayment, calculatePrepaymentPlans, calculateSchedule, inferAnnualRate, formatRemainingTerm, type PrepaymentPlan } from '../utils/mortgage'

const mode = ref<'payment' | 'rate'>('payment')
const principalWan = ref(79.47)
const months = ref(188)
const annualRatePercent = ref(4.2)
const paymentInput = ref(5380.74)
const startDate = ref(new Date().toISOString().slice(0, 10))
const prepaymentWan = ref(15)
const calculating = ref(false)
const showPrepayment = ref(false)
const result = ref<{ payment: number; totalInterest: number; totalPayment: number; endDate: string; annualRate: number } | null>(null)
const plans = ref<{ shorter: PrepaymentPlan; lowerPayment: PrepaymentPlan } | null>(null)

const money = (value: number) => Number.isFinite(value) ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
const formatRate = (value: number) => `${(value * 100).toFixed(2)}%`

const calculate = () => {
  const principal = Number(principalWan.value) * 10000
  const term = Number(months.value)
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(term) || term <= 0) {
    ElMessage.warning('请输入有效的剩余本金和剩余期数')
    return
  }
  let annualRate = Number(annualRatePercent.value) / 100
  let payment: number
  if (mode.value === 'payment') {
    if (!Number.isFinite(annualRate) || annualRate < 0) { ElMessage.warning('请输入有效的年利率'); return }
    payment = calculateMonthlyPayment(principal, annualRate, term)
  } else {
    payment = Number(paymentInput.value)
    if (!Number.isFinite(payment) || payment <= 0) { ElMessage.warning('请输入有效的月供金额'); return }
    if (payment < principal / term - 0.01) { ElMessage.warning(`月供不能低于 ¥${money(principal / term)}，否则无法覆盖本金`); return }
    annualRate = inferAnnualRate(principal, term, payment)
    annualRatePercent.value = annualRate * 100
  }
  calculating.value = true
  const schedule = calculateSchedule(principal, annualRate, term, payment)
  result.value = { payment: schedule.payment, totalInterest: schedule.totalInterest, totalPayment: schedule.totalPayment, endDate: calculateEndDate(startDate.value, term), annualRate }
  plans.value = calculatePrepaymentPlans(principal, annualRate, term, Number(prepaymentWan.value) * 10000)
  calculating.value = false
}

const reset = () => { result.value = null; plans.value = null; showPrepayment.value = false; prepaymentWan.value = 15 }

// Recalculate only the plan when its input changes, keeping the main result stable.
const refreshPlans = () => {
  if (prepaymentWan.value > principalWan.value) prepaymentWan.value = principalWan.value
  if (result.value) plans.value = calculatePrepaymentPlans(principalWan.value * 10000, result.value.annualRate, months.value, prepaymentWan.value * 10000)
}

watch(prepaymentWan, refreshPlans)
watch(startDate, (value) => {
  if (result.value) result.value.endDate = calculateEndDate(value, months.value)
})
</script>

<style scoped>
.mortgage-view { min-height: 100%; background: linear-gradient(180deg, #f3f8f7 0, #f8fafb 260px); }
.mortgage-shell { max-width: 1040px; margin: 0 auto; }
.hero { display: flex; justify-content: space-between; align-items: center; padding: 18px 0 24px; }
.eyebrow, .section-kicker { letter-spacing: .14em; color: #338d83; font-size: 11px; font-weight: 700; }
.page-title { margin: 7px 0 6px; font-size: 30px; color: #173047; }
.page-description { margin: 0; color: #68808b; }
.hero-icon { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 20px; background: #d9efeb; color: #318c83; font-size: 36px; }
.input-card, .result-card, .schedule-card { border: 1px solid #e0ebeb; border-radius: 18px; margin-bottom: 18px; }
.input-card { padding: 4px 10px 2px; }
.mode-tabs { margin-bottom: 22px; }
.form-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.form-field label, .prepay-input label { display: block; margin-bottom: 8px; color: #425969; font-size: 13px; font-weight: 600; }
.form-field .el-date-editor { width: 100%; }
.form-actions { display: flex; gap: 12px; margin-top: 24px; }
.form-actions .el-button--primary { min-width: 140px; background: #318c83; border-color: #318c83; }
.form-hint { margin: 15px 0 8px; color: #9aaab0; font-size: 12px; }
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 22px 0; }
.summary-card { padding: 22px; border: 1px solid #deebea; border-radius: 16px; background: #fff; }
.summary-card.highlight { background: #ecf8f5; border-color: #84bdb4; }
.summary-card span, .summary-card small { display: block; color: #69818a; font-size: 13px; }
.summary-card strong { display: block; color: #257c73; font-size: 27px; line-height: 1.4; margin: 7px 0 3px; }
.summary-card .date-value { font-size: 22px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.section-heading h2 { margin: 5px 0 0; color: #1d3748; font-size: 20px; }
.empty-plan { display: flex; align-items: center; gap: 12px; padding: 20px; border-radius: 12px; background: #f6fbfa; color: #648087; }
.empty-plan p { margin: 0; font-size: 14px; }
.prepay-input { max-width: 340px; margin-bottom: 18px; }
.input-tip { display: block; color: #98a8ad; font-size: 12px; margin-top: 6px; }
.plan-list { display: grid; gap: 12px; }
.plan-row { display: grid; grid-template-columns: 1.2fr 1.3fr auto; align-items: center; gap: 18px; border: 1px solid #dde6e8; border-radius: 14px; padding: 17px 20px; }
.plan-row.recommended { border: 2px solid #409a90; background: #f2fbf8; }
.plan-radio { color: #5c646b; display: flex; align-items: center; gap: 10px; }
.plan-radio span { color: #2d8e84; font-size: 22px; }
.plan-radio b { font-size: 16px; }
.plan-radio em { background: #dff3ee; color: #2d877c; padding: 3px 7px; border-radius: 5px; font-size: 11px; font-style: normal; }
.plan-detail strong, .plan-detail span { display: block; }
.plan-detail strong { color: #304c5b; font-size: 17px; }
.plan-detail span { color: #6c7e8e; font-size: 13px; margin-top: 5px; }
.saving { color: #2d857b; font-weight: 700; white-space: nowrap; }
.detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.detail-grid div { padding: 16px; border-radius: 10px; background: #f7fafb; }
.detail-grid span, .detail-grid b { display: block; }
.detail-grid span { color: #82929a; font-size: 12px; margin-bottom: 8px; }
.detail-grid b { color: #304b5a; font-size: 16px; }
@media (max-width: 768px) { .mortgage-shell { padding: 0 2px; } .hero { padding-top: 4px; } .hero-icon { width: 48px; height: 48px; font-size: 26px; } .page-title { font-size: 25px; } .form-grid, .summary-grid, .detail-grid { grid-template-columns: 1fr; gap: 12px; } .summary-card { padding: 16px; } .plan-row { grid-template-columns: 1fr; gap: 9px; padding: 15px; } .saving { justify-self: start; } .section-heading { align-items: flex-start; gap: 10px; } .section-heading .el-button { padding: 8px 10px; } }
</style>
