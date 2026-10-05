# 房贷助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Web Tools 中增加房贷助手，支持月供计算、提前还款缩短期限/降低月供方案、由月供反推利率和贷款到期日。

**Architecture:** 将等额本息/等额本金计算、利率反推、日期推算放入独立的 `src/utils/mortgage.ts`，Vue 页面只负责表单状态与展示。通过路由、首页卡片、侧边栏提供入口，结果区域使用卡片和方案对比表呈现。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Element Plus, Vitest。

**Spec:** 用户需求与参考截图（房贷助手与提前部分还款方案）。

## Global Constraints

- 金额输入单位为万元，利率输入为年利率百分比，期数单位为月。
- 默认采用等额本息；提前还款需展示缩短年限和降低月供两种方案。
- 输入缺失或无效时不得计算，并给出中文提示。
- 计算结果金额保留 2 位小数，计算过程避免除零和无穷循环。

### Task 1: Mortgage calculation engine

**Files:**
- Create: `src/utils/mortgage.ts`
- Test: `src/__tests__/mortgage.test.ts`

- [ ] 写失败测试，覆盖等额本息月供/总利息、提前还款两方案、月供反推月利率、到期日期。
- [ ] 运行 `npm test -- src/__tests__/mortgage.test.ts` 确认因模块不存在失败。
- [ ] 实现 `calculateMonthlyPayment`, `calculateSchedule`, `calculatePrepaymentPlans`, `inferAnnualRate`, `calculateEndDate`。
- [ ] 运行测试确认通过，并处理零利率与边界输入。

### Task 2: Mortgage assistant page

**Files:**
- Create: `src/views/MortgageView.vue`

- [ ] 先增加页面行为测试所需的计算调用与表单状态，再确认测试失败。
- [ ] 实现模式切换（计算月供 / 反推利率）、金额/期数/利率/月供/起始日期表单、结果卡片。
- [ ] 展示剩余本金、月供、剩余利息、到期日，并用弹窗/区域展示提前还款金额及缩短期限、降低月供方案。
- [ ] 添加响应式样式，复用 Element Plus 和项目 `page-container/card-container` 视觉。

### Task 3: Routing and navigation

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/views/Home.vue`
- Modify: `src/components/Layout/MainLayout.vue`

- [ ] 注册 `/mortgage` 路由及标题。
- [ ] 在首页工具列表与桌面/移动侧边栏加入房贷助手入口和图标。
- [ ] 运行完整测试与生产构建。

### Task 4: Verification

- [ ] 执行 `npm test`。
- [ ] 执行 `npm run build`。
- [ ] 检查输入校验、零利率、手机宽度页面布局与提前还款结果。
