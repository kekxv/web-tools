<template>
  <div class="mortgage-view page-container">
    <div class="mortgage-shell">
      <header class="hero">
        <div class="hero-text">
          <span class="eyebrow">PERSONAL FINANCE</span>
          <h1 class="page-title">房贷助手</h1>
          <p class="page-description">输入剩余贷款信息，快速估算月供、利息与提前还款方案。</p>
        </div>
        <div class="hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5.5 9.5V20h13V9.5" />
            <path d="M10 20v-5.5h4V20" />
          </svg>
        </div>
      </header>

      <el-card class="panel input-card" shadow="never">
        <el-tabs v-model="mode" class="mode-tabs">
          <el-tab-pane label="计算月供" name="payment" />
          <el-tab-pane label="由月供反推利率" name="rate" />
        </el-tabs>
        <div class="method-row">
          <div class="method-left">
            <span class="method-label">还款方式</span>
            <el-radio-group v-model="method" class="method-group">
              <el-radio-button value="equal-payment">等额本息</el-radio-button>
              <el-radio-button value="equal-principal">等额本金</el-radio-button>
            </el-radio-group>
          </div>
          <span class="method-hint">{{ methodHint }}</span>
        </div>
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
            <label>{{ method === 'equal-principal' ? '当前首月月供' : '当前月供' }}</label>
            <el-input v-model.number="paymentInput" type="number" min="0" step="0.01" placeholder="例如 5380">
              <template #append>元</template>
            </el-input>
            <span v-if="method === 'equal-principal'" class="input-tip">等额本金按首月月供反推利率</span>
          </div>
          <div class="form-field">
            <label>本期起始日期</label>
            <el-date-picker v-model="startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
          </div>
        </div>
        <div class="form-actions">
          <el-button type="primary" size="large" @click="calculate" @keyup.enter="calculate" :loading="calculating">开始计算</el-button>
          <el-button size="large" @click="openShareDialog">分享</el-button>
          <el-button size="large" @click="reset">重置</el-button>
        </div>
        <p class="form-hint">计算结果仅供参考，实际还款金额以贷款银行账单为准。</p>
      </el-card>

      <el-card v-if="!result" class="panel feature-guide" shadow="never">
        <div class="section-heading"><div><span class="section-kicker">GETTING STARTED</span><h2>房贷助手能帮你算什么？</h2></div></div>
        <p class="guide-intro">填写当前剩余本金和期数，选择还款方式，点击“开始计算”查看贷款概览，再比较适合你的还款方案。</p>
        <div class="guide-grid">
          <div class="guide-item"><span class="guide-number">01</span><h3>月供与利息</h3><p>输入年利率，估算月供、剩余利息、总还款额和到期日，支持等额本息与等额本金。</p></div>
          <div class="guide-item"><span class="guide-number">02</span><h3>由月供反推利率</h3><p>知道月供但不清楚利率？切换到反推模式；等额本金请填写当前首月月供。</p></div>
          <div class="guide-item"><span class="guide-number">03</span><h3>自有资金提前还款</h3><p>设置提前还款金额与时点，左右对比“缩短年限”和“降低月供”的月供、期限及节省利息。</p></div>
          <div class="guide-item"><span class="guide-number">04</span><h3>借款提前还款</h3><p>填写借款金额、期限和月利率或月供，查看房贷与借款合计还款、累计金额及扣除借款成本后的净节息。</p></div>
        </div>
      </el-card>

      <el-dialog v-model="shareDialogVisible" title="分享房贷计算" width="min(560px, calc(100vw - 32px))" destroy-on-close>
        <template v-if="shareDialogMode === 'create'">
          <p class="share-description">设置一个验证码，发送生成的链接和验证码给对方。贷款参数只会保存在链接的加密内容中。</p>
          <el-input v-model="shareCode" type="password" show-password maxlength="64" placeholder="请输入验证码" @keyup.enter="generateShare" />
          <el-alert v-if="shareError" class="share-error" type="error" :closable="false" :title="shareError" />
          <el-button class="share-action" type="primary" @click="generateShare">生成分享链接</el-button>
          <template v-if="shareUrl">
            <el-input v-model="shareUrl" type="textarea" :rows="3" readonly class="share-url" />
            <div class="share-result-actions">
              <span>请将链接和验证码一起发送给对方</span>
              <el-button size="small" @click="copyShareUrl">复制链接</el-button>
            </div>
          </template>
        </template>
        <template v-else>
          <p class="share-description">这是一个加密的房贷计算分享。输入发送方提供的验证码后即可查看。</p>
          <el-input v-model="shareCode" type="password" show-password maxlength="64" placeholder="请输入查看验证码" @keyup.enter="openEncryptedShare" />
          <el-alert v-if="shareError" class="share-error" type="error" :closable="false" :title="shareError" />
          <template v-if="shareToken">
            <el-input v-model="shareToken" type="textarea" :rows="3" readonly class="share-url" />
          </template>
          <el-button class="share-action" type="primary" @click="openEncryptedShare">输入验证码并查看</el-button>
        </template>
      </el-dialog>

      <template v-if="result">
        <el-card class="panel schedule-card" shadow="never">
          <div class="section-heading"><div><span class="section-kicker">DETAILS</span><h2>贷款概览</h2></div></div>
        <div class="summary-grid">
          <div class="summary-card highlight">
            <div class="summary-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5h5M9.5 14.5h5" /></svg>
              <span>{{ result.method === 'equal-principal' ? '首月月供' : '预计月供' }}</span>
            </div>
            <strong class="summary-value" :title="exact(result.payment)">{{ amount(result.payment) }}</strong>
            <small v-if="result.method === 'equal-principal'">等额本金 · 每月递减 {{ amount(result.monthlyDecrease) }}</small>
            <small v-else>等额本息 · 每月固定</small>
          </div>
          <div class="summary-card">
            <div class="summary-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 9.5 12l4 3.5L20 8" /><path d="M15 8h5v5" /></svg>
              <span>剩余利息</span>
            </div>
            <strong class="summary-value" :title="exact(result.totalInterest)">{{ amount(result.totalInterest) }}</strong>
            <small>按当前计划还款</small>
          </div>
          <div class="summary-card">
            <div class="summary-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3.5v3M16 3.5v3M3.5 10h17" /></svg>
              <span>预计到期</span>
            </div>
            <strong class="summary-value date-value">{{ result.endDate }}</strong>
            <small>剩余 {{ formatRemainingTerm(result.term) }}（{{ result.term }}期）</small>
          </div>
        </div>

          <div class="breakdown">
            <div class="breakdown-bar">
              <span class="bar-principal" :style="{ width: `${principalShare}%` }"></span>
              <span class="bar-interest"></span>
            </div>
            <div class="breakdown-legend">
              <span><i class="dot-principal"></i>本金 {{ amount(result.principal) }}（{{ principalShare.toFixed(0) }}%）</span>
              <span><i class="dot-interest"></i>利息 {{ amount(result.totalInterest) }}（{{ (100 - principalShare).toFixed(0) }}%）</span>
            </div>
          </div>
          <div class="detail-grid">
            <div><span>剩余本金</span><b :title="exact(result.principal)">{{ amount(result.principal) }}</b></div>
            <div><span>年利率</span><b>{{ formatRate(result.annualRate) }}</b></div>
            <div><span>还款总额</span><b :title="exact(result.totalPayment)">{{ amount(result.totalPayment) }}</b></div>
            <div><span>还款方式</span><b>{{ methodName(result.method) }}</b></div>
            <div v-if="result.method === 'equal-principal'"><span>月供区间</span><b class="range-value">{{ amount(result.payment) }} → {{ amount(result.lastPayment) }}</b></div>
          </div>
        </el-card>


        <el-card class="panel result-card" shadow="never">
          <div class="section-heading">
            <div><span class="section-kicker">REPAYMENT PLAN</span><h2>提前还款试算</h2></div>
            <el-button type="primary" plain @click="showPrepayment = !showPrepayment">{{ showPrepayment ? '收起方案' : '试算提前还款' }}</el-button>
          </div>
          <div v-if="!showPrepayment" class="empty-plan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2h5.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" /></svg>
            <p>输入提前还款本金，比较“缩短年限”和“降低月供”哪种方式更适合你。</p>
          </div>
          <div v-else class="prepay-content">
            <div class="funding-switch" role="group" aria-label="提前还款资金来源">
              <button type="button" :class="{ active: fundingMode === 'own' }" :aria-pressed="fundingMode === 'own'" @click="fundingMode = 'own'">自有资金</button>
              <button type="button" :class="{ active: fundingMode === 'borrow' }" :aria-pressed="fundingMode === 'borrow'" @click="fundingMode = 'borrow'">借款资金</button>
            </div>
            <p class="funding-hint">{{ fundingMode === 'own' ? '用现有资金提前还款，对比节息与月供变化。' : '立即借款偿还部分房贷，对比借款成本与房贷节息。' }}</p>
            <template v-if="fundingMode === 'own'">
            <div class="prepay-inputs">
              <div class="prepay-input">
                <label>提前偿还本金</label>
                <el-input v-model.number="prepaymentWan" type="number" min="0" :max="principalWan" placeholder="例如 15"><template #append>万元</template></el-input>
                <span class="input-tip">最多不超过剩余本金 {{ amount(result.principal) }}</span>
              </div>
              <div class="prepay-input timing-input">
                <label>提前还款时点</label>
                <div class="timing-fields">
                  <div class="timing-period">
                    <el-input v-model.number="prepayDelayMonths" type="number" min="0" :max="maxPrepayDelay" placeholder="0"><template #append>期后</template></el-input>
                  </div>
                  <el-date-picker v-model="prepayDate" type="date" value-format="YYYY-MM-DD" :clearable="false" :disabled-date="disabledPrepayDate" placeholder="或选择日期" />
                </div>
                <span class="input-tip">{{ prepayTimingText }}</span>
              </div>
            </div>
            <div v-if="plans" class="plan-list">
              <div v-for="(plan, key) in plans" :key="key" class="plan-row" :class="{ recommended: key === 'shorter' }">
                <div class="plan-identity">
                  <div class="plan-head">
                    <span class="plan-mark">{{ key === 'shorter' ? '✓' : '○' }}</span>
                    <b class="plan-name">{{ key === 'shorter' ? '缩短年限' : '降低月供' }}</b>
                    <em v-if="key === 'shorter'" class="plan-tag">更省利息</em>
                  </div>
                  <div class="plan-meta">
                    {{ plan.delayMonths > 0 ? `还满 ${plan.delayMonths} 期后提前还` : '立即提前还' }} ·
                    剩余 {{ formatRemainingTerm(plan.totalMonths) }}（{{ plan.totalMonths }}期） ·
                    到期 {{ calculateEndDate(startDate, plan.totalMonths) }}
                  </div>
                </div>
                <div class="plan-figures">
                  <strong>{{ result.method === 'equal-principal' ? '首月月供' : '月供约' }} {{ amount(plan.payment) }}</strong>
                  <span v-if="result.method === 'equal-principal'">每月递减 {{ amount(plan.monthlyDecrease ?? 0) }} · 共需还款 {{ amount(plan.totalPayment) }}</span>
                  <span v-else :title="exact(plan.totalPayment)">共需还款 {{ amount(plan.totalPayment) }}</span>
                </div>
                <div class="saving">
                  <span>节省利息</span>
                  <strong :title="exact(plan.savingInterest)">{{ amount(plan.savingInterest) }}</strong>
                </div>
              </div>
            </div>
            </template>
            <div v-else class="borrow-prepay">
              <div class="borrow-inputs">
                <div class="prepay-input">
                  <label>替代借款金额</label>
                  <el-input v-model.number="replacementBorrowWan" type="number" min="0" :max="principalWan" placeholder="例如 15"><template #append>万元</template></el-input>
                </div>
                <div class="prepay-input">
                  <label>借款期限</label>
                  <el-input v-model.number="replacementMonths" type="number" min="1" placeholder="例如 60"><template #append>期</template></el-input>
                </div>
                <div class="prepay-input">
                  <label>借款输入方式</label>
                  <el-radio-group v-model="replacementInputMode" class="borrow-mode">
                    <el-radio-button value="rate">月利率</el-radio-button>
                    <el-radio-button value="payment">月供</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="prepay-input">
                  <label>{{ replacementInputMode === 'rate' ? '借款月利率' : '借款月供' }}</label>
                  <el-input v-model.number="replacementInput" type="number" min="0" step="0.01" :placeholder="replacementInputMode === 'rate' ? '例如 0.3' : '例如 2735'"><template #append>{{ replacementInputMode === 'rate' ? '%' : '元' }}</template></el-input>
                </div>
                <div class="prepay-input">
                  <label>提前还款手续费（可选）</label>
                  <el-input v-model.number="prepaymentFee" type="number" min="0" placeholder="例如 1000"><template #append>元</template></el-input>
                </div>
              </div>
              <el-button class="borrow-calculate" type="primary" @click="calculateBorrowPrepayment">计算借款提前还款</el-button>
              <div v-if="borrowPlans" class="borrow-plan-list">
                <div class="borrow-summary">
                  <div class="borrow-summary-card emphasis"><span>推荐方案</span><strong>{{ recommendedBorrowKey === 'shorter' ? '缩短年限' : '降低月供' }}</strong><small>按净节省利息排序</small></div>
                  <div class="borrow-summary-card"><span>预计净节省</span><strong :class="borrowPlans[recommendedBorrowKey].netInterestSaving >= 0 ? 'saving-positive' : 'saving-negative'">{{ amount(Math.abs(borrowPlans[recommendedBorrowKey].netInterestSaving)) }}</strong><small>{{ borrowPlans[recommendedBorrowKey].netInterestSaving >= 0 ? '利息' : '预计增加成本' }}</small></div>
                  <div class="borrow-summary-card"><span>首月合计还款</span><strong>{{ amount(borrowPlans[recommendedBorrowKey].combinedPaymentDuringReplacement) }}</strong><small>房贷 + 借款</small></div>
                </div>
                <div v-for="(plan, key) in borrowPlans" :key="key" class="borrow-plan" :class="{ recommended: key === recommendedBorrowKey }">
                  <div class="borrow-plan-title"><b>{{ key === 'shorter' ? '缩短年限' : '降低月供' }}</b><em v-if="key === recommendedBorrowKey">推荐</em></div>
                  <div class="borrow-cashflow"><span>首月还款金额（房贷月供 + 借款还款）</span><strong>{{ amount(plan.mortgage.payment) }} + {{ amount(plan.replacement.payment) }} = {{ amount(plan.combinedPaymentDuringReplacement) }}/月</strong></div>
                  <div class="cashflow-chart" aria-label="月度还款构成"><i class="cashflow-mortgage" :style="{ width: `${cashflowMortgageShare(plan)}%` }"></i><i class="cashflow-loan" :style="{ width: `${100 - cashflowMortgageShare(plan)}%` }"></i></div>
                  <div class="cashflow-legend"><span><i class="dot-mortgage"></i>房贷 {{ amount(plan.mortgage.payment) }}</span><span><i class="dot-loan"></i>借款 {{ amount(plan.replacement.payment) }}</span></div>
                  <div class="borrow-facts">
                    <span>借款期间累计还款 <b>{{ amount(plan.replacementPeriodTotalPayment) }}</b></span>
                    <span>完整方案总还款 <b>{{ amount(plan.totalStrategyPayment) }}</b></span>
                    <span>借款利息 <b>{{ amount(plan.replacementInterest) }}</b></span>
                    <span :class="plan.netInterestSaving >= 0 ? 'saving-positive' : 'saving-negative'">{{ plan.netInterestSaving >= 0 ? '净节省利息' : '预计增加成本' }} <b>{{ amount(Math.abs(plan.netInterestSaving)) }}</b></span>
                  </div>
                </div>
              </div>
              <p class="borrow-note">累计金额按未四舍五入的还款计划计算；未计税费、违约金、投资收益和银行实际重定价。</p>
            </div>
          </div>
        </el-card>


        <el-card v-if="comparison" class="panel compare-card" shadow="never">
          <div class="section-heading">
            <div><span class="section-kicker">COMPARISON</span><h2>还款方式对比</h2></div>
            <span class="compare-caption">同一本金、利率与期数下测算</span>
          </div>
          <div class="compare-grid">
            <div class="method-card" :class="{ active: result.method === 'equal-payment' }" @click="selectMethod('equal-payment')">
              <div class="method-card-head">
                <b>等额本息</b>
                <em v-if="result.method === 'equal-payment'">当前方案</em>
              </div>
              <strong class="method-payment" :title="exact(comparison.equalPayment.payment)">{{ amount(comparison.equalPayment.payment) }}</strong>
              <span class="method-payment-note">每月月供固定</span>
              <dl class="method-facts">
                <div><dt>总利息</dt><dd :title="exact(comparison.equalPayment.totalInterest)">{{ amount(comparison.equalPayment.totalInterest) }}</dd></div>
                <div><dt>还款总额</dt><dd :title="exact(comparison.equalPayment.totalPayment)">{{ amount(comparison.equalPayment.totalPayment) }}</dd></div>
                <div><dt>利息占比</dt><dd>{{ interestShare(comparison.equalPayment) }}%</dd></div>
              </dl>
            </div>
            <div class="method-card" :class="{ active: result.method === 'equal-principal' }" @click="selectMethod('equal-principal')">
              <div class="method-card-head">
                <b>等额本金</b>
                <em v-if="result.method === 'equal-principal'">当前方案</em>
              </div>
              <strong class="method-payment" :title="exact(comparison.equalPrincipal.payment)">{{ amount(comparison.equalPrincipal.payment) }}</strong>
              <span class="method-payment-note">首月月供 · 每月递减 {{ amount(comparison.equalPrincipal.monthlyDecrease) }}</span>
              <dl class="method-facts">
                <div><dt>总利息</dt><dd :title="exact(comparison.equalPrincipal.totalInterest)">{{ amount(comparison.equalPrincipal.totalInterest) }}</dd></div>
                <div><dt>还款总额</dt><dd :title="exact(comparison.equalPrincipal.totalPayment)">{{ amount(comparison.equalPrincipal.totalPayment) }}</dd></div>
                <div><dt>利息占比</dt><dd>{{ interestShare(comparison.equalPrincipal) }}%</dd></div>
              </dl>
            </div>
          </div>
          <div class="compare-result">
            <p class="compare-saving">换等额本金可少付利息 <b :title="exact(comparison.interestSaving)">{{ amount(comparison.interestSaving) }}</b><em v-if="savingPercent > 0">省 {{ savingPercent.toFixed(1) }}%</em></p>
            <p class="compare-note">等额本金首月多付 {{ amount(firstPaymentGap) }}，之后逐月递减，适合前期现金流宽裕；等额本息月供固定，适合收入稳定但前期压力大的家庭。点击卡片即可切换试算。</p>
          </div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { calculateEndDate, calculateMonthsBetween, calculatePrepaymentPlans, calculateScheduleByMethod, compareRepaymentMethods, inferAnnualRate, inferAnnualRateFromFirstPayment, formatRemainingTerm, calculateBorrowPrepaymentPlans, type MortgageSchedule, type PrepaymentPlan, type BorrowPrepaymentPlan, type RepaymentMethod } from '../utils/mortgage'
import { buildMortgageShareUrl, decodeMortgageShare, encodeMortgageShare, type MortgageShareData } from '../utils/mortgage-share'

const mode = ref<'payment' | 'rate'>('payment')
const principalWan = ref(79.47)
const months = ref(188)
const annualRatePercent = ref(4.2)
const paymentInput = ref(5380.74)
const startDate = ref(new Date().toISOString().slice(0, 10))
const prepaymentWan = ref(15)
const prepayDelayMonths = ref(0)
const replacementBorrowWan = ref(15)
const replacementMonths = ref(60)
const replacementInputMode = ref<'rate' | 'payment'>('rate')
const replacementInput = ref(0.3)
const prepaymentFee = ref(0)
const borrowPlans = ref<{ shorter: BorrowPrepaymentPlan; lowerPayment: BorrowPrepaymentPlan } | null>(null)
const calculating = ref(false)
const showPrepayment = ref(false)
const fundingMode = ref<'own' | 'borrow'>('own')
const method = ref<RepaymentMethod>('equal-payment')
const result = ref<{ principal: number; term: number; payment: number; lastPayment: number; monthlyDecrease: number; totalInterest: number; totalPayment: number; endDate: string; annualRate: number; method: RepaymentMethod } | null>(null)
const plans = ref<{ shorter: PrepaymentPlan; lowerPayment: PrepaymentPlan } | null>(null)
const shareDialogVisible = ref(false)
const shareDialogMode = ref<'create' | 'decrypt'>('create')
const shareCode = ref('')
const shareToken = ref('')
const shareUrl = ref('')
const shareError = ref('')

const money = (value: number) => Number.isFinite(value) ? value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
/** Amounts of 10,000 元 and above are shown in 万元 so long figures stay readable. */
const amount = (value: number) => {
  if (!Number.isFinite(value)) return '¥0.00'
  if (Math.abs(value) >= 10000) return `¥${(value / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}万`
  return `¥${money(value)}`
}
/** Exact 元 figure for the 万元 values, so hovering keeps full precision. */
const exact = (value: number) => Number.isFinite(value) && Math.abs(value) >= 10000 ? `¥${money(value)}` : ''
const formatRate = (value: number) => `${(value * 100).toFixed(2)}%`
const methodName = (value: RepaymentMethod) => value === 'equal-principal' ? '等额本金' : '等额本息'

const methodHint = computed(() => method.value === 'equal-principal'
  ? '月供逐月递减，总利息更少，前期压力较大'
  : '每月月供固定，前期压力小，总利息略多')

// Share of the total repayment that is principal, used by the overview bar.
const principalShare = computed(() => {
  const total = result.value?.totalPayment ?? 0
  if (!Number.isFinite(total) || total <= 0) return 0
  const share = (result.value?.principal ?? 0) / total * 100
  return Math.min(100, Math.max(0, share))
})

// Both methods on the numbers that produced the current result.
const comparison = computed(() => {
  const current = result.value
  if (!current) return null
  return compareRepaymentMethods(current.principal, current.annualRate, current.term)
})

const interestShare = (schedule: MortgageSchedule) => schedule.totalPayment > 0
  ? (schedule.totalInterest / schedule.totalPayment * 100).toFixed(1)
  : '0.0'

const savingPercent = computed(() => {
  const base = comparison.value?.equalPayment.totalInterest ?? 0
  if (base <= 0) return 0
  return (comparison.value?.interestSaving ?? 0) / base * 100
})

const firstPaymentGap = computed(() => {
  if (!comparison.value) return 0
  return Math.max(0, comparison.value.equalPrincipal.payment - comparison.value.equalPayment.payment)
})

const recommendedBorrowKey = computed<'shorter' | 'lowerPayment'>(() => {
  if (!borrowPlans.value) return 'shorter'
  return borrowPlans.value.lowerPayment.netInterestSaving > borrowPlans.value.shorter.netInterestSaving ? 'lowerPayment' : 'shorter'
})

const cashflowMortgageShare = (plan: BorrowPrepaymentPlan) => {
  const total = plan.mortgage.payment + plan.replacement.payment
  return total > 0 ? Math.min(100, Math.max(0, plan.mortgage.payment / total * 100)) : 0
}

const selectMethod = (value: RepaymentMethod) => { method.value = value }

/** Human readable description of when the prepayment happens. */
const prepayTimingText = computed(() => {
  const delay = prepayDelayMonths.value
  if (delay <= 0) return `0 表示当前立即提前还款（${calculateEndDate(startDate.value, 0)}）`
  return `还满 ${delay} 期后提前还款 · 约 ${calculateEndDate(startDate.value, delay)}`
})

/** The loan has to be running when the prepayment is made. */
const maxPrepayDelay = computed(() => Math.max((result.value?.term ?? 1) - 1, 0))
const clampDelayMonths = (value: number) => Math.min(Math.max(Math.floor(Number(value) || 0), 0), maxPrepayDelay.value)

// 期数与日期是同一个值的两种输入方式：改任意一边，另一边自动跟随。
const prepayDate = computed({
  get: () => calculateEndDate(startDate.value, prepayDelayMonths.value),
  set: (value: string) => { prepayDelayMonths.value = clampDelayMonths(calculateMonthsBetween(startDate.value, value)) },
})

const disabledPrepayDate = (date: Date) => {
  const earliest = new Date(`${calculateEndDate(startDate.value, 0)}T00:00:00`).getTime()
  const latest = new Date(`${calculateEndDate(startDate.value, maxPrepayDelay.value)}T00:00:00`).getTime()
  return date.getTime() < earliest || date.getTime() > latest
}

const calculate = () => {
  const principal = Number(principalWan.value) * 10000
  const term = Number(months.value)
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(term) || term <= 0) {
    ElMessage.warning('请输入有效的剩余本金和剩余期数')
    return
  }
  let annualRate = Number(annualRatePercent.value) / 100
  if (mode.value === 'payment') {
    if (!Number.isFinite(annualRate) || annualRate < 0) { ElMessage.warning('请输入有效的年利率'); return }
  } else {
    const payment = Number(paymentInput.value)
    if (!Number.isFinite(payment) || payment <= 0) { ElMessage.warning('请输入有效的月供金额'); return }
    if (payment < principal / term - 0.01) { ElMessage.warning(`月供不能低于 ${amount(principal / term)}，否则无法覆盖本金`); return }
    annualRate = method.value === 'equal-principal'
      ? inferAnnualRateFromFirstPayment(principal, term, payment)
      : inferAnnualRate(principal, term, payment)
    annualRatePercent.value = annualRate * 100
  }
  calculating.value = true
  const schedule = calculateScheduleByMethod(method.value, principal, annualRate, term)
  result.value = {
    principal,
    term,
    payment: schedule.payment,
    lastPayment: schedule.lastPayment,
    monthlyDecrease: schedule.monthlyDecrease,
    totalInterest: schedule.totalInterest,
    totalPayment: schedule.totalPayment,
    endDate: calculateEndDate(startDate.value, term),
    annualRate,
    method: method.value,
  }
  plans.value = calculatePrepaymentPlans(principal, annualRate, term, Number(prepaymentWan.value) * 10000, method.value, Number(prepayDelayMonths.value) || 0)
  borrowPlans.value = null
  calculating.value = false
}

const calculateBorrowPrepayment = () => {
  const current = result.value
  if (!current) return
  const borrowed = Number(replacementBorrowWan.value) * 10000
  const term = Number(replacementMonths.value)
  const input = Number(replacementInput.value)
  if (!Number.isFinite(borrowed) || borrowed <= 0 || borrowed > current.principal) { ElMessage.warning('替代借款金额必须大于 0 且不超过剩余本金'); return }
  if (!Number.isInteger(term) || term <= 0) { ElMessage.warning('请输入有效的借款期限'); return }
  if (!Number.isFinite(input) || input < 0) { ElMessage.warning('请输入有效的借款月利率或月供'); return }
  const options = replacementInputMode.value === 'rate'
    ? { rate: input / 100, payment: undefined }
    : { rate: undefined, payment: input }
  borrowPlans.value = calculateBorrowPrepaymentPlans(current.principal, current.annualRate, current.term, borrowed, term, options.rate, options.payment, current.method, Math.max(0, Number(prepaymentFee.value) || 0))
}

const shareData = (): MortgageShareData => ({
  mode: mode.value,
  method: method.value,
  principalWan: Number(principalWan.value),
  months: Number(months.value),
  annualRatePercent: Number(annualRatePercent.value),
  paymentInput: Number(paymentInput.value),
  startDate: startDate.value,
})

const openShareDialog = () => {
  shareDialogMode.value = 'create'
  shareCode.value = ''
  shareToken.value = ''
  shareUrl.value = ''
  shareError.value = ''
  shareDialogVisible.value = true
}

const generateShare = () => {
  shareError.value = ''
  try {
    shareToken.value = encodeMortgageShare(shareData(), shareCode.value)
    shareUrl.value = buildMortgageShareUrl(shareToken.value)
  } catch (error) {
    shareError.value = error instanceof Error ? error.message : '生成分享链接失败'
  }
}

const copyShareUrl = async () => {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    ElMessage.success('分享链接已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制链接')
  }
}

const applyShareData = (data: MortgageShareData) => {
  mode.value = data.mode
  method.value = data.method
  principalWan.value = data.principalWan
  months.value = data.months
  annualRatePercent.value = data.annualRatePercent
  paymentInput.value = data.paymentInput
  startDate.value = data.startDate
  prepaymentWan.value = 0
  prepayDelayMonths.value = 0
}

const openEncryptedShare = () => {
  shareError.value = ''
  try {
    applyShareData(decodeMortgageShare(shareToken.value, shareCode.value))
    shareDialogVisible.value = false
    calculate()
    ElMessage.success('分享内容已解密并完成计算')
  } catch (error) {
    shareError.value = error instanceof Error ? error.message : '解密失败，请检查验证码'
  }
}

const promptEncryptedShare = (value: unknown) => {
  if (typeof value !== 'string' || !value) return
  shareDialogMode.value = 'decrypt'
  shareToken.value = value
  shareCode.value = ''
  shareUrl.value = ''
  shareError.value = ''
  shareDialogVisible.value = true
}

const shareFromCurrentHash = () => {
  const queryStart = window.location.hash.indexOf('?')
  if (queryStart < 0) return
  promptEncryptedShare(new URLSearchParams(window.location.hash.slice(queryStart + 1)).get('share'))
}

onMounted(() => {
  shareFromCurrentHash()
  window.addEventListener('hashchange', shareFromCurrentHash)
})
onUnmounted(() => window.removeEventListener('hashchange', shareFromCurrentHash))

const reset = () => { result.value = null; plans.value = null; borrowPlans.value = null; showPrepayment.value = false; prepaymentWan.value = 15; replacementBorrowWan.value = 15; prepayDelayMonths.value = 0 }

// Recalculate only the plan when its inputs change, keeping the main result stable.
const refreshPlans = () => {
  const current = result.value
  if (!current) return
  const maxWan = current.principal / 10000
  if (prepaymentWan.value > maxWan) prepaymentWan.value = maxWan
  // The prepayment has to happen while the loan is still running.
  const maxDelay = Math.max(current.term - 1, 0)
  const delay = Math.floor(Number(prepayDelayMonths.value) || 0)
  if (delay < 0) prepayDelayMonths.value = 0
  else if (delay > maxDelay) prepayDelayMonths.value = maxDelay
  plans.value = calculatePrepaymentPlans(current.principal, current.annualRate, current.term, prepaymentWan.value * 10000, current.method, Number(prepayDelayMonths.value) || 0)
}

watch(prepaymentWan, refreshPlans)
watch(prepayDelayMonths, refreshPlans)
// Switching the repayment method re-runs the calculation so every card stays in sync.
watch(method, () => { if (result.value) calculate() })
watch(startDate, (value) => {
  if (result.value) result.value.endDate = calculateEndDate(value, result.value.term)
})
</script>

<style scoped>
.mortgage-view {
  --mq-primary: #2f8b81;
  --mq-primary-dark: #216f67;
  --mq-ink: #1b3546;
  --mq-ink-soft: #66808a;
  --mq-muted: #8ba0a7;
  --mq-line: #e3eded;
  --mq-radius: 18px;
  min-height: 100%;
  background:
    radial-gradient(1100px 340px at 50% -170px, #e3f4f0 0%, rgba(227, 244, 240, 0) 72%),
    linear-gradient(180deg, #f4f9f8 0, #f9fbfb 340px);
}
.mortgage-shell { max-width: 1040px; margin: 0 auto; padding-bottom: 40px; }

/* ---------- Hero ---------- */
.hero { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 22px 0 26px; }
.eyebrow, .section-kicker { letter-spacing: .14em; color: #338d83; font-size: 11px; font-weight: 700; }
.page-title { margin: 8px 0 7px; font-size: 31px; font-weight: 700; letter-spacing: -.01em; color: var(--mq-ink); }
.page-description { margin: 0; color: var(--mq-ink-soft); font-size: 14.5px; }
.hero-icon {
  flex: none; width: 68px; height: 68px; display: grid; place-items: center; border-radius: 22px;
  color: #fff; background: linear-gradient(145deg, #47a99c, #2b7d74);
  box-shadow: 0 16px 30px -16px rgba(43, 125, 116, .85), inset 0 1px 0 rgba(255, 255, 255, .35);
}
.hero-icon svg { width: 32px; height: 32px; }

/* ---------- Panels ---------- */
.panel {
  border: 1px solid var(--mq-line); border-radius: var(--mq-radius); background: #fff;
  box-shadow: 0 1px 2px rgba(23, 58, 72, .03), 0 18px 34px -30px rgba(23, 58, 72, .45);
  margin-bottom: 18px;
}
.panel :deep(.el-card__body) { padding: 24px 28px 22px; }
.guide-intro { margin: -6px 0 22px; color: var(--mq-ink-soft); font-size: 14px; line-height: 1.8; }
.guide-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.guide-item { position: relative; padding: 18px 20px; border-radius: 14px; background: #f7fbfa; }
.guide-number { color: #73aaa2; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.guide-item h3 { margin: 8px 0; color: var(--mq-ink); font-size: 15px; }
.guide-item p { margin: 0; color: var(--mq-ink-soft); font-size: 13px; line-height: 1.8; }

/* ---------- Form ---------- */
.mode-tabs { margin-bottom: 0; }
.mode-tabs :deep(.el-tabs__header) { margin: 0; }
.mode-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background: var(--mq-line); }
.mode-tabs :deep(.el-tabs__item) { height: 42px; padding: 0 4px; margin-right: 28px; font-size: 14px; font-weight: 600; color: #7d929a; }
.mode-tabs :deep(.el-tabs__item.is-active) { color: var(--mq-primary-dark); }
.mode-tabs :deep(.el-tabs__item:hover) { color: var(--mq-primary); }
.mode-tabs :deep(.el-tabs__active-bar) { height: 3px; border-radius: 3px 3px 0 0; background: var(--mq-primary); }

/* ---------- Repayment method picker ---------- */
.method-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; padding: 18px 0 22px; border-bottom: 1px dashed var(--mq-line); margin-bottom: 22px; }
.method-left { display: flex; align-items: center; gap: 14px; }
.method-label { color: #4a6270; font-size: 13px; font-weight: 600; }
.method-hint { color: var(--mq-muted); font-size: 12.5px; }
.method-group :deep(.el-radio-button__inner) { border-color: #dfe9ea; color: #5d7d82; font-weight: 600; box-shadow: none; transition: all .2s; }
.method-group :deep(.el-radio-button:first-child .el-radio-button__inner) { border-radius: 10px 0 0 10px; }
.method-group :deep(.el-radio-button:last-child .el-radio-button__inner) { border-radius: 0 10px 10px 0; }
.method-group :deep(.el-radio-button__inner:hover) { color: var(--mq-primary); }
.method-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, #3d9c90, #2a7d74); border-color: transparent; color: #fff;
  box-shadow: 0 10px 20px -16px rgba(42, 125, 116, .95);
}

.form-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px 18px; }
.form-field label, .prepay-input label { display: block; margin-bottom: 9px; color: #4a6270; font-size: 13px; font-weight: 600; }
/* The date picker root is rendered without the scoped attribute, so it must be reached with :deep. */
.form-field :deep(.el-date-editor) { width: 100%; }
.form-field :deep(.el-date-editor .el-input__inner) { color: #2b4553; }
.form-field :deep(.el-input__wrapper),
.prepay-input :deep(.el-input__wrapper) {
  height: 42px; border-radius: 10px; background: #fbfdfd;
  box-shadow: 0 0 0 1px #dfe9ea inset;
  transition: box-shadow .2s, background-color .2s;
}
.form-field :deep(.el-input__wrapper:hover),
.prepay-input :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px #bcd6d3 inset; }
.form-field :deep(.el-input__wrapper.is-focus),
.prepay-input :deep(.el-input__wrapper.is-focus) { background: #fff; box-shadow: 0 0 0 1px var(--mq-primary) inset, 0 0 0 3px rgba(47, 139, 129, .13); }
.form-field :deep(.el-input-group__append),
.prepay-input :deep(.el-input-group__append) {
  height: 42px; padding: 0 14px; border-radius: 0 10px 10px 0; border: none;
  background: #eef7f5; color: #5d7d82; font-size: 13px; box-shadow: none;
}
.form-field :deep(.el-input__inner) { font-variant-numeric: tabular-nums; }

.form-actions { display: flex; gap: 12px; margin-top: 26px; }
.form-actions .el-button { border-radius: 11px; }
.form-actions .el-button--primary {
  min-width: 150px; border-color: transparent; font-weight: 600; letter-spacing: .02em;
  background: linear-gradient(135deg, #3d9c90, #2a7d74);
  box-shadow: 0 14px 24px -16px rgba(42, 125, 116, .95);
  transition: transform .2s, box-shadow .2s, background .2s;
}
.form-actions .el-button--primary:hover { background: linear-gradient(135deg, #46ab9e, #2f8b81); transform: translateY(-1px); box-shadow: 0 18px 28px -16px rgba(42, 125, 116, .95); }
.form-hint { margin: 16px 0 2px; color: #9fb0b5; font-size: 12px; }

/* ---------- Summary ---------- */
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 18px; }
.summary-card {
  position: relative; overflow: hidden; padding: 20px 22px; border: 1px solid var(--mq-line);
  border-radius: 16px; background: #fff;
  box-shadow: 0 1px 2px rgba(23, 58, 72, .03), 0 16px 30px -30px rgba(23, 58, 72, .5);
  transition: transform .22s, box-shadow .22s, border-color .22s;
}
.summary-card:hover { transform: translateY(-2px); border-color: #d2e4e2; box-shadow: 0 22px 36px -30px rgba(23, 58, 72, .6); }
.summary-card.highlight { background: linear-gradient(150deg, #f0fbf8, #e1f3ef); border-color: #a9d6ce; }
.summary-card.highlight::after {
  content: ''; position: absolute; right: -46px; bottom: -64px; width: 150px; height: 150px; border-radius: 50%;
  background: radial-gradient(circle, rgba(63, 154, 144, .18), rgba(63, 154, 144, 0) 70%);
}
.summary-head { position: relative; display: flex; align-items: center; gap: 8px; color: var(--mq-ink-soft); font-size: 13px; font-weight: 500; }
.summary-head svg { width: 16px; height: 16px; color: var(--mq-primary); opacity: .9; }
.summary-value {
  position: relative; display: block; margin: 11px 0 5px; color: #1f6b63; font-size: 28px;
  line-height: 1.25; font-weight: 700; letter-spacing: -.01em; font-variant-numeric: tabular-nums;
}
.summary-card .date-value { font-size: 24px; }
.summary-card small { position: relative; display: block; color: var(--mq-muted); font-size: 12.5px; }
.schedule-card .summary-grid { margin-bottom: 24px; }
.schedule-card .summary-card { border: none; background: #f7fbfb; box-shadow: none; }
.schedule-card .summary-card.highlight { background: linear-gradient(150deg, #f0fbf8, #e1f3ef); }
.schedule-card .summary-card:hover { transform: none; box-shadow: none; }

/* ---------- Section heading ---------- */
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.section-heading h2 { margin: 6px 0 0; color: #1d3748; font-size: 20px; font-weight: 700; }
.section-heading .el-button { border-radius: 10px; font-weight: 600; }
.section-heading .el-button--primary.is-plain { color: var(--mq-primary-dark); background: #f1faf8; border-color: #b6dbd5; }
.section-heading .el-button--primary.is-plain:hover { color: #fff; background: var(--mq-primary); border-color: var(--mq-primary); }

/* ---------- Prepayment ---------- */
.empty-plan {
  display: flex; align-items: center; gap: 16px; padding: 18px 20px; border: 1px dashed #cfe4e1;
  border-radius: 14px; background: linear-gradient(120deg, #f5fbfa, #fbfdfd); color: #5e7c82;
}
.empty-plan svg { flex: none; width: 34px; height: 34px; padding: 8px; box-sizing: content-box; border-radius: 12px; background: #e4f4f1; color: var(--mq-primary); }
.empty-plan p { margin: 0; font-size: 14px; line-height: 1.6; }

.funding-switch { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: #eef5f4; }
.funding-switch button { padding: 9px 22px; border: none; border-radius: 9px; background: transparent; color: #66808a; font: inherit; font-size: 14px; cursor: pointer; }
.funding-switch button.active { background: #fff; color: var(--mq-primary-dark); font-weight: 600; box-shadow: 0 2px 6px rgba(23, 58, 72, .08); }
.funding-switch button:focus-visible { outline: 2px solid var(--mq-primary); outline-offset: 2px; }
.funding-hint { margin: 12px 0 20px; color: #8298a0; font-size: 13px; line-height: 1.6; }
.prepay-inputs { display: grid; grid-template-columns: 1fr 1.25fr; gap: 18px; margin-bottom: 20px; padding: 18px; background: #f7fbfa; border-radius: 14px; }
.prepay-inputs .prepay-input { max-width: none; min-width: 0; }
.prepay-input { flex: 1 1 240px; max-width: 340px; }
.timing-input { flex: 1 1 340px; max-width: 420px; }
.timing-fields { display: flex; gap: 10px; }
.timing-period { flex: 0 0 120px; }
.timing-fields :deep(.el-date-editor) { flex: 1 1 auto; width: 100%; min-width: 0; }
.input-tip { display: block; margin-top: 7px; color: #9fb0b5; font-size: 12px; }

/* ---------- Encrypted sharing ---------- */
.share-description { margin: 0 0 14px; color: #66808a; font-size: 13px; line-height: 1.7; }
.share-action { width: 100%; margin-top: 16px; }
.share-url { margin-top: 14px; }
.share-url :deep(.el-textarea__inner) { font-size: 12px; line-height: 1.5; word-break: break-all; }
.share-result-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; color: #8298a0; font-size: 12px; }
.share-error { margin-top: 12px; }

.plan-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.plan-row {
  display: flex; flex-direction: column;
  align-items: stretch; gap: 18px; padding: 20px 22px; min-width: 0;
  border: 1px solid #e4eef0; border-radius: 16px; background: #fff;
  transition: border-color .2s, box-shadow .2s, transform .2s;
}
.plan-row:hover { border-color: #cbe0de; transform: translateY(-1px); box-shadow: 0 18px 32px -30px rgba(23, 58, 72, .7); }
.plan-row.recommended { border-color: #7cc0b6; background: linear-gradient(140deg, #f5fcf9, #e9f7f3); }
.plan-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.plan-mark {
  width: 24px; height: 24px; flex: none; display: grid; place-items: center; border-radius: 50%;
  border: 1.5px solid #d5e2e4; background: #fff; color: #a4b6ba; font-size: 12px;
}
.plan-row.recommended .plan-mark { border-color: var(--mq-primary); background: var(--mq-primary); color: #fff; }
.plan-name { font-size: 16px; font-weight: 600; color: #26404f; }
.plan-tag { padding: 2px 9px; border-radius: 999px; background: #d9f1eb; color: #23786e; font-size: 11px; font-weight: 600; font-style: normal; }
.plan-meta { margin-top: 9px; color: var(--mq-muted); font-size: 12.5px; line-height: 1.5; }
.plan-figures strong { display: block; color: #1f6b63; font-size: 25px; font-weight: 700; font-variant-numeric: tabular-nums; }
.plan-figures span { display: block; margin-top: 5px; color: #7f939c; font-size: 13px; font-variant-numeric: tabular-nums; }
.saving { margin-top: auto; padding-top: 15px; border-top: 1px dashed #dbe8e6; text-align: left; white-space: nowrap; }
.saving span { display: block; color: var(--mq-muted); font-size: 12px; }
.saving strong { display: block; margin-top: 5px; color: #26857a; font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums; }
.borrow-prepay { margin-top: 0; }
.borrow-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.borrow-heading h3 { margin: 5px 0 0; color: #1d3748; font-size: 18px; }
.borrow-inputs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-bottom: 16px; padding: 18px; background: #f7fbfa; border-radius: 14px; }
.borrow-inputs .prepay-input { min-width: 0; max-width: none; }
.borrow-calculate { --el-button-bg-color: var(--mq-primary); --el-button-border-color: var(--mq-primary); --el-button-hover-bg-color: var(--mq-primary-dark); --el-button-hover-border-color: var(--mq-primary-dark); border-radius: 10px; }
.borrow-mode { display: flex; width: 100%; }
.borrow-mode :deep(.el-radio-button) { flex: 1; }
.borrow-mode :deep(.el-radio-button__inner) { width: 100%; padding: 11px 8px; }
.borrow-mode { --el-color-primary: var(--mq-primary); }
.borrow-plan-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.borrow-summary { grid-column: 1 / -1; display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.borrow-summary-card { padding: 14px 16px; border: 1px solid #e2eeee; border-radius: 13px; background: #f8fcfb; }
.borrow-summary-card.emphasis { background: linear-gradient(135deg, #e8f7f3, #f4fbf9); border-color: #b8ddd6; }
.borrow-summary-card span, .borrow-summary-card small { display: block; color: #8298a0; font-size: 12px; }
.borrow-summary-card strong { display: block; margin: 7px 0 3px; color: #1f6b63; font-size: 20px; font-variant-numeric: tabular-nums; }
.borrow-summary-card.emphasis strong { color: #216f67; }
.borrow-plan { min-width: 0; padding: 20px 22px; border: 1px solid #e4eef0; border-radius: 16px; background: #fff; }
.borrow-plan.recommended { border-color: #7cc0b6; background: linear-gradient(140deg, #f5fcf9, #e9f7f3); }
.borrow-plan-title { display: flex; align-items: center; gap: 9px; color: #26404f; }
.borrow-plan-title em { padding: 2px 8px; border-radius: 999px; background: #2f8b81; color: #fff; font-size: 11px; font-style: normal; }
.borrow-cashflow { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-top: 16px; color: #6d858d; font-size: 13px; }
.borrow-cashflow strong { color: #1f6b63; font-size: 17px; font-variant-numeric: tabular-nums; }
.cashflow-chart { display: flex; height: 8px; margin-top: 13px; overflow: hidden; border-radius: 999px; background: #edf3f3; }
.cashflow-chart i { display: block; height: 100%; transition: width .3s ease; }
.cashflow-mortgage { background: #3b9b90; }
.cashflow-loan { background: #e6ad60; }
.cashflow-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 7px; color: #8298a0; font-size: 11.5px; }
.cashflow-legend span { display: inline-flex; align-items: center; gap: 5px; }
.cashflow-legend i { width: 7px; height: 7px; border-radius: 2px; }
.cashflow-legend .dot-mortgage { background: #3b9b90; }
.cashflow-legend .dot-loan { background: #e6ad60; }
.borrow-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 14px; padding-top: 15px; border-top: 1px dashed #dbe8e6; color: #8298a0; font-size: 12px; }
.borrow-facts b { display: block; margin-top: 5px; color: #2b4553; font-size: 14px; font-variant-numeric: tabular-nums; }
.borrow-facts .saving-positive b { color: #1f7a70; }
.borrow-facts .saving-negative b { color: #c26b43; }
.borrow-note { margin: 13px 0 0; color: #9fb0b5; font-size: 12px; line-height: 1.6; }

/* ---------- Overview ---------- */
.breakdown { margin-bottom: 20px; }
.breakdown-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: #eef2f4; }
.breakdown-bar .bar-principal { background: linear-gradient(90deg, #43a195, #2b7d74); transition: width .4s ease; }
.breakdown-bar .bar-interest { flex: 1; background: linear-gradient(90deg, #f0c07f, #e6ad60); }
.breakdown-legend { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 11px; color: var(--mq-ink-soft); font-size: 12.5px; font-variant-numeric: tabular-nums; }
.breakdown-legend span { display: flex; align-items: center; gap: 7px; }
.breakdown-legend i { width: 9px; height: 9px; border-radius: 3px; }
.breakdown-legend .dot-principal { background: #2f8b81; }
.breakdown-legend .dot-interest { background: #e6ad60; }

.detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
.detail-grid div { padding: 16px 18px; border-radius: 12px; background: #f7fbfb; border: 1px solid #ebf3f3; }
.detail-grid span, .detail-grid b { display: block; }
.detail-grid span { color: #8298a0; font-size: 12px; margin-bottom: 8px; }
.detail-grid b { color: #2b4553; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.detail-grid b.range-value { font-size: 14px; }

/* ---------- Repayment method comparison ---------- */
.compare-caption { color: var(--mq-muted); font-size: 12.5px; }
.compare-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.method-card {
  padding: 20px 22px; border: 1px solid #e4eef0; border-radius: 16px; background: #fff; cursor: pointer;
  transition: transform .2s, box-shadow .2s, border-color .2s, background .2s;
}
.method-card:hover { transform: translateY(-2px); border-color: #cbe0de; box-shadow: 0 20px 34px -30px rgba(23, 58, 72, .7); }
.method-card.active { border-color: #7cc0b6; background: linear-gradient(140deg, #f5fcf9, #e9f7f3); box-shadow: inset 0 0 0 1px rgba(124, 192, 182, .35); }
.method-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.method-card-head b { color: #26404f; font-size: 15px; font-weight: 700; }
.method-card-head em { padding: 2px 9px; border-radius: 999px; background: #2f8b81; color: #fff; font-size: 11px; font-style: normal; font-weight: 600; }
.method-payment { display: block; color: #1f6b63; font-size: 25px; font-weight: 700; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.method-payment-note { display: block; margin-top: 5px; color: var(--mq-muted); font-size: 12.5px; }
.method-facts { display: grid; gap: 9px; margin: 16px 0 0; padding-top: 15px; border-top: 1px dashed #dbe8e6; }
.method-facts div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.method-facts dt { color: #8298a0; font-size: 12.5px; }
.method-facts dd { margin: 0; color: #2b4553; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.compare-result { margin-top: 18px; padding: 16px 20px; border-radius: 14px; background: linear-gradient(120deg, #f2faf8, #f8fcfb); border: 1px solid #dcebe9; }
.compare-saving { margin: 0; color: #2b4a55; font-size: 14.5px; }
.compare-saving b { color: #1f7a70; font-size: 17px; font-variant-numeric: tabular-nums; }
.compare-saving em { margin-left: 9px; padding: 2px 8px; border-radius: 999px; background: #d9f1eb; color: #23786e; font-size: 11.5px; font-style: normal; font-weight: 600; }
.compare-note { margin: 9px 0 0; color: #6d858d; font-size: 12.5px; line-height: 1.7; }

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .form-grid { grid-template-columns: repeat(2, 1fr); }
  .borrow-inputs { grid-template-columns: repeat(2, 1fr); }
  .borrow-facts { grid-template-columns: repeat(2, 1fr); }
  .detail-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .mortgage-shell { padding: 0 2px 24px; }
  .hero { padding: 6px 0 18px; gap: 14px; }
  .hero-icon { width: 52px; height: 52px; border-radius: 17px; }
  .hero-icon svg { width: 26px; height: 26px; }
  .page-title { font-size: 25px; }
  .page-description { font-size: 13px; }
  .panel :deep(.el-card__body) { padding: 18px 16px 16px; }
  .mode-tabs :deep(.el-tabs__item) { margin-right: 18px; padding: 0 2px; }
  .method-row { gap: 10px; padding: 14px 0 16px; margin-bottom: 18px; }
  .method-left { gap: 10px; }
  .method-hint { width: 100%; }
  .form-grid, .summary-grid, .compare-grid, .borrow-inputs, .prepay-inputs, .plan-list, .borrow-plan-list, .guide-grid { grid-template-columns: 1fr; gap: 14px; }
  .borrow-summary { grid-template-columns: 1fr; }
  .form-actions { margin-top: 20px; }
  .form-actions .el-button--primary { min-width: 0; flex: 1; }
  .summary-card { padding: 16px 18px; }
  .summary-value { font-size: 25px; }
  .section-heading { align-items: flex-start; }
  .section-heading .el-button { padding: 8px 12px; }
  .plan-row, .borrow-plan { gap: 12px; padding: 17px 18px; }
  .saving { text-align: left; padding-top: 12px; border-top: 1px dashed #d7e6e4; }
  .breakdown-legend { gap: 6px 16px; }
  .detail-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .detail-grid div { padding: 13px 14px; }
  .method-card { padding: 17px 18px; }
  .method-payment { font-size: 23px; }
  .borrow-heading, .borrow-cashflow { align-items: flex-start; flex-direction: column; gap: 7px; }
  .compare-result { padding: 14px 16px; }
  .compare-caption { display: none; }
}
@media (max-width: 420px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
