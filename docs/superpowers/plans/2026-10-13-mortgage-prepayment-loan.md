# 借贷提前还款 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在房贷助手中增加“借款资金提前偿还房贷”的试算，比较房贷利息节省、替代借款成本、提前还款后的房贷月供与替代借款月供，并给出净节省利息。

**Architecture:** 在 `src/utils/mortgage.ts` 增加纯函数，分别计算提前还款后的房贷计划和“用于提前还款的替代借款”计划，再由页面汇总两者。页面沿用当前 MortgageView 的表单、结果卡片和 Element Plus 风格，新增一个独立的“借款提前还款”模式；现有普通房贷计算和原有提前还款方案保持不变。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Element Plus, Vitest。

**Spec:** 本文件同时作为本次用户需求的可执行规格；实现时以“当前剩余房贷 + 借款金额 + 替代借款利率/月供 + 替代借款期限”为输入。

## Global Constraints

- 房贷金额和替代借款金额在界面使用“万元”，计算引擎使用“元”。
- 用户可用替代借款“月利率 + 期限”计算月供，也可用“月供 + 期限”反推月利率；月利率输入按百分比展示，例如 `0.3%`。
- 当同时填写月利率和月供时，以月利率计算，并展示两者校验差额；不静默覆盖用户输入。
- “净节省利息” = 原房贷剩余利息 − 提前还款后房贷剩余利息 − 替代借款利息 − 可选提前还款手续费。
- 结果需同时展示名义节省利息、替代借款利息、净节省利息和月度现金流；净节省为负数时明确显示“成本增加”。
- 结果需展示“还款金额（房贷月供 + 借款还款）”的月度拆分，并计算替代借款期间累计还款和完整还款周期累计还款。
- 所有输入缺失、非有限数、负数、期限非正整数或替代借款金额超过当前房贷本金时不得计算，并给出中文提示。
- 计算过程使用未四舍五入的余额，金额仅在展示层保留 2 位小数。

## Product behavior

输入分为两组：

1. 当前房贷：剩余本金、剩余期限、还款方式（等额本息/等额本金）、当前年利率或当前月供（复用现有模式）。
2. 替代借款：借款金额（即提前偿还本金）、期限，以及“按月利率计算”或“按月供反推利率”。可选输入提前还款手续费。

计算两种房贷处理方式：

- **缩短期限**：提前偿还本金后保持原房贷月供水平，重新计算剩余期数。
- **降低月供**：提前偿还本金后保持原剩余期限，重新计算房贷月供。

替代借款的月供独立计算。结果区域按方案展示：`还款金额（房贷月供 + 借款还款）`，例如 `8,000 + 2,700 = 10,700 元/月`，并注明替代借款结束后每月负担。累计金额分为两项：

- **借款期间累计还款**：按替代借款期限逐月累加房贷月供和借款月供；如果缩短期限导致房贷提前结清，结清后月份只累加借款月供。
- **完整方案累计还款**：提前还款后的房贷总还款额 + 替代借款总还款额 + 手续费；该金额用于与继续按原房贷还款的总还款额比较。

默认推荐净节省利息更高的方案；若两种方案相同则不做强推荐。

## File Structure

- Modify: `src/utils/mortgage.ts` — 新增替代借款计划与借贷提前还款汇总类型/函数。
- Modify: `src/__tests__/mortgage.test.ts` — 覆盖公式、边界和净节省结果。
- Modify: `src/views/MortgageView.vue` — 新增入口、表单和结果区域，复用已有房贷结果。
- Modify: `src/utils/mortgage-share.ts` — 扩展分享数据结构，保证新模式可分享；旧链接解码时使用默认值。
- Modify: `src/__tests__/mortgage-view-prepay-date.test.ts` 或新增 `src/__tests__/mortgage-borrow-prepay-view.test.ts` — 覆盖页面输入和结果文案。

### Task 1: 替代借款计算引擎

**Files:**
- Modify: `src/utils/mortgage.ts`
- Test: `src/__tests__/mortgage.test.ts`

**Interfaces:**
- Produces `interface ReplacementLoanPlan { principal; months; monthlyRate; payment; totalPayment; totalInterest }`，金额单位为元，`monthlyRate` 为小数月利率。
- Produces `calculateReplacementLoan(principal: number, months: number, monthlyRate?: number, payment?: number): ReplacementLoanPlan`。
- 当提供 `monthlyRate` 时用等额本息公式计算 `payment`；仅提供 `payment` 时用二分法反推 `monthlyRate`；两者均无效时返回空计划或由页面阻止调用。

- [ ] 写测试：借款 150000、月利率 0.3%、60 期，断言月供、总利息和总还款额与公式一致。
- [ ] 写测试：用已知月供反推月利率，结果与 0.3% 接近；月供低于本金/期数时返回无效结果。
- [ ] 写测试：零利率时月供等于本金/期数，总利息为 0。
- [ ] 运行 `npm test -- src/__tests__/mortgage.test.ts`，确认新增测试先失败。
- [ ] 实现函数，复用现有 `calculateMonthlyPayment`/`inferAnnualRate` 的数值边界处理，不复制第二套摊销循环。
- [ ] 运行同一测试文件，确认新增和原有用例全绿。

### Task 2: 借贷提前还款汇总

**Files:**
- Modify: `src/utils/mortgage.ts`
- Test: `src/__tests__/mortgage.test.ts`

**Interfaces:**
- Produces `interface BorrowPrepaymentPlan { mortgage: PrepaymentPlan; replacement: ReplacementLoanPlan; mortgagePaymentDuringReplacement; replacementPaymentDuringReplacement; combinedPaymentDuringReplacement; replacementPeriodTotalPayment; totalStrategyPayment; originalStrategyPayment; mortgageInterestSaving; replacementInterest; fee; netInterestSaving }`。
- Produces `calculateBorrowPrepaymentPlans(principal, annualRate, months, borrowedAmount, replacementMonths, replacementMonthlyRate?, replacementPayment?, method = 'equal-payment', fee = 0)`，返回 `shorter` 与 `lowerPayment` 两个方案。

- [ ] 写测试：基准房贷 800000、年利率 4.2%、240 期，借款 150000、月利率 0.3%、60 期，分别断言缩短期限/降低月供的房贷月供、替代借款月供、`combinedPaymentDuringReplacement` 和 `replacementPeriodTotalPayment`。
- [ ] 写测试：缩短期限后房贷在替代借款期内结清时，结清后的月份只累加替代借款月供，不能继续累加房贷月供。
- [ ] 写测试：净节省公式满足 `原房贷利息 - 新房贷利息 - 替代借款利息 - 手续费`，且手续费增加时净节省等量减少。
- [ ] 写测试：借款金额为 0、超过余额或替代借款期限无效时返回安全结果，不出现负数利息或无穷循环。
- [ ] 运行测试确认失败，再实现汇总函数；替代借款本金计入替代借款总还款，但净节省比较只比较利息，避免把本金重复计入“收益”。
- [ ] 运行完整 `mortgage.test.ts`，确认原有提前还款行为不变。

### Task 3: 页面输入和结果展示

**Files:**
- Modify: `src/views/MortgageView.vue`

- [ ] 在现有结果区增加“借贷提前还款”入口或独立卡片，默认借款金额沿用当前提前还款本金，避免重复输入。
- [ ] 增加替代借款期限、输入模式（月利率/月供）、对应输入框和可选手续费；切换模式时清除不适用的校验提示，不丢失当前房贷结果。
- [ ] 增加计算按钮和中文校验：借款金额不得大于当前剩余本金；替代借款月供不得低于借款本金/期限；月利率不得小于 0。
- [ ] 结果按“缩短期限/降低月供”展示：提前还款后房贷月供、替代借款月供、`还款金额（房贷月供 + 借款还款）`、借款期间累计还款、完整方案累计还款、原房贷利息、替代借款利息、净节省利息和节省比例。
- [ ] 处理负净节省：使用“预计增加成本”文案和醒目颜色；正数显示“预计节省利息”。
- [ ] 在结果旁增加口径说明：“未计税费、违约金、投资收益和银行实际重定价；实际以合同和账单为准”。
- [ ] 保持现有响应式断点；移动端将两种方案纵向排列，金额和月供使用等宽数字。

### Task 4: 分享数据和页面测试

**Files:**
- Modify: `src/utils/mortgage-share.ts`
- Modify: `src/views/MortgageView.vue`
- Test: `src/__tests__/mortgage-borrow-prepay-view.test.ts`

- [ ] 扩展分享 payload：保存入口模式、借款金额、替代借款期限、月利率/月供模式、输入值和手续费；旧 payload 缺失字段使用默认值。
- [ ] 写页面测试：输入替代借款参数并点击计算，页面同时出现房贷月供、替代借款月供和净节省利息。
- [ ] 写页面测试：切换“月利率/月供”时对应字段标签变化，非法金额显示中文警告且不生成结果。
- [ ] 写页面测试：分享后解密能恢复新字段，旧分享链接仍可完成普通房贷计算。

### Task 5: 验证

- [ ] 执行 `npm test`，确认全部测试通过。
- [ ] 执行 `npm run build`，确认 TypeScript/Vite 构建成功。
- [ ] 手工检查 1400px 和 390px 宽度：普通房贷、缩短期限、降低月供、替代借款月供反推、净节省为负数五种状态无布局错位。
- [ ] 复核一个手算样例：借款金额、替代借款利息、房贷节省利息和净节省利息四者关系与公式一致。
