# 房贷助手・等额本金与还款方式对比 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在房贷助手中补齐等额本金还款方式，并新增「两种还款方式对比」，覆盖月供、总利息、提前还款与利率反推四个入口。

**Architecture:** 计算逻辑全部下沉到 `src/utils/mortgage.ts`（纯函数 + Vitest 覆盖），`MortgageView.vue` 只负责表单状态与展示。`RepaymentMethod` 作为唯一开关贯穿月供计算、提前还款试算与利率反推；对比卡片复用同一批纯函数，不新增第二套算法。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Element Plus, Vitest。

**Spec:** 用户需求：在既有房贷助手上「增加更多的常见计算」，本轮确认范围为等额本金 + 两种还款方式对比，新增内容平铺成卡片分区。

## Global Constraints

- 金额输入单位为万元，利率输入为年利率百分比，期数单位为月。
- 计算结果金额保留 2 位小数展示，计算过程不得除零或死循环（余额阈值沿用 `0.005`）。
- 新增函数必须是纯函数，放在 `src/utils/mortgage.ts`，不得引入新依赖。
- `calculatePrepaymentPlans` 新增的 method 参数必须带默认值，保证既有调用与测试不受影响。
- 输入缺失或无效时不得计算，并给出中文提示。

## 关键公式（等额本金）

设月利率 `r = annualRate / 12`，`monthlyPrincipal = principal / months`。

- 首月月供：`monthlyPrincipal + principal * r`
- 末月月供：`monthlyPrincipal * (1 + r)`
- 每月递减：`monthlyPrincipal * r`
- 总利息：`r * principal * (months + 1) / 2`
- 总还款额：`principal + 总利息`

提前还款（`paid` 为提前偿还本金，`remaining = principal - paid`）：

- 降低月供：每月本金改为 `remaining / months`，期数不变。
- 缩短年限：每月本金保持 `principal / months`（月供水平不变），期数自然缩短。

## File Structure

- Modify: `src/utils/mortgage.ts` — 计算引擎（唯一的算法出处）。
- Test: `src/__tests__/mortgage.test.ts` — 全部新增行为的回归测试。
- Modify: `src/views/MortgageView.vue` — 还款方式选择、结果文案、提前还款、对比卡片。

---

### Task 1: 等额本金计算引擎

**Files:**
- Modify: `src/utils/mortgage.ts`
- Test: `src/__tests__/mortgage.test.ts`

**Interfaces:**
- Produces:
  - `type RepaymentMethod = 'equal-payment' | 'equal-principal'`
  - `interface MortgageSchedule` 新增两个必填字段：`lastPayment: number`、`monthlyDecrease: number`（等额本息分别等于 `payment` 和 `0`）
  - `calculateEqualPrincipalSchedule(principal: number, annualRate: number, months: number, monthlyPrincipal?: number): MortgageSchedule`
  - `calculateScheduleByMethod(method: RepaymentMethod, principal: number, annualRate: number, months: number): MortgageSchedule`

- [ ] 写失败测试：等额本金 100 万 / 4.9% / 240 期，断言首月月供 ≈ 8250.00、末月月供 ≈ 4183.68、每月递减 ≈ 17.01、总利息 ≈ 492041.67、`months` = 240。
- [ ] 写失败测试：利率为 0 时等额本金首末月月供相等（= 本金/期数）且总利息为 0。
- [ ] 写失败测试：`calculateScheduleByMethod('equal-payment', ...)` 与 `calculateSchedule(...)` 结果一致。
- [ ] 运行 `npm test -- src/__tests__/mortgage.test.ts`，确认因函数未定义而失败（RED）。
- [ ] 实现上述两个函数，并让 `calculateSchedule` 回填 `lastPayment` / `monthlyDecrease`。
- [ ] 再跑一次测试确认全绿（GREEN）。

### Task 2: 等额本金提前还款试算

**Files:**
- Modify: `src/utils/mortgage.ts`
- Test: `src/__tests__/mortgage.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `calculateEqualPrincipalSchedule`、`RepaymentMethod`
- Produces:
  - `interface PrepaymentPlan` 新增可选字段 `lastPayment?: number`、`monthlyDecrease?: number`
  - `calculatePrepaymentPlans(principal, annualRate, months, prepayment, method: RepaymentMethod = 'equal-payment')`

- [ ] 写失败测试：80 万 / 4.2% / 240 期、提前还 15 万，等额本金「缩短年限」期数 < 240 且少于「降低月供」的期数。
- [ ] 写失败测试：等额本金「降低月供」的 `payment`（首月）小于未提前还款的首月月供，且 `savingInterest` 非负。
- [ ] 运行测试确认失败（RED）。
- [ ] 在 `calculatePrepaymentPlans` 内按 method 分支：等额本金用 `monthlyPrincipal` 入参表达「月供水平不变 / 期数不变」两种方案。
- [ ] 运行测试确认全绿（GREEN），且既有等额本息用例仍通过。

### Task 3: 还款方式对比与等额本金利率反推

**Files:**
- Modify: `src/utils/mortgage.ts`
- Test: `src/__tests__/mortgage.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `calculateScheduleByMethod`
- Produces:
  - `compareRepaymentMethods(principal, annualRate, months): { equalPayment: MortgageSchedule; equalPrincipal: MortgageSchedule; interestSaving: number }`
  - `inferAnnualRateFromFirstPayment(principal: number, months: number, firstPayment: number): number`（等额本金：`monthlyRate = (首月月供 - 本金/期数) / 本金`）

- [ ] 写失败测试：100 万 / 4.9% / 240 期，等额本金总利息小于等额本息，且 `interestSaving` 等于两者总利息之差。
- [ ] 写失败测试：`inferAnnualRateFromFirstPayment(1000000, 240, 8250)` ≈ 0.049。
- [ ] 写失败测试：首月月供低于每月本金时返回 0（不可摊销）。
- [ ] 运行测试确认失败（RED）。
- [ ] 实现两个函数并跑绿（GREEN）。

### Task 4: 页面接入

**Files:**
- Modify: `src/views/MortgageView.vue`

- [ ] 表单新增「还款方式」选择（等额本息 / 等额本金），计算月供与反推利率两个模式都可见。
- [ ] 主结果跟随所选方式：等额本金展示首月月供、末月月供与每月递减，摘要卡文案随之变化。
- [ ] 反推利率模式下，等额本金用首月月供反推，输入框标签改为「当前首月月供」并补提示文案。
- [ ] 提前还款卡片传入当前方式，等额本金方案展示首月月供与每月递减。
- [ ] 新增平铺卡片「还款方式对比」：同一本金/利率/期数下并排展示两种方式的首月月供、总利息、总还款额，并给出利息差额结论。
- [ ] 保持既有视觉体系（青绿主色、`panel` 卡片、`summary-value` 数字样式）与 900/768/420px 响应式断点。

### Task 5: 验证

- [ ] `npm test` 全绿。
- [ ] `npm run build` 成功。
- [ ] 用 headless Chrome 在 1400px 与 390px 下核对：等额本息、等额本金、反推利率、提前还款、对比卡片四种状态无布局错位。
