# 砖了个砖助手 Implementation Plan

**Goal:** 在休闲一下提供本地图片导入、可校正的棋盘识别和可解释的消除建议。
**Architecture:** Vue 页面负责图片采集、裁剪和校正；纯 TypeScript 工具负责图像分组与棋盘求解。截图只读采集，不自动操作其他游戏。
**Tech Stack:** Vue 3、Canvas、MediaDevices、Vitest。
**Spec:** 用户本次需求与两张游戏截图；移动规则待用户确认。

## Tasks
- [x] 用失败测试覆盖直线配对、障碍、空格、不可达配对、图像分组与空白识别；实现纯函数工具 `src/utils/brick-assistant.ts`。
- [x] 实现 `src/views/BrickAssistantView.vue`：上传、拍照、拖放、粘贴、屏幕采集；自动估计网格并支持拖选范围和行列调整；按图案编号分组并逐格校正；显示操作坐标和连线、模拟和撤销。
- [x] 在 `src/router/index.ts`、桌面/手机侧栏和 `src/views/Home.vue` 注册入口。
- [x] 对当前直线与两拐配对规则完善求解器测试（拖动规则尚待用户确认）；运行全量测试与构建，检查差异。

## Validation
`npm test -- src/__tests__/brick-assistant.test.ts` 验证算法，页面交互测试验证模拟与撤销，`npm test` 与 `npm run build` 验证集成。识别不承诺任意照片精确：提供范围、阈值、分组校正，明确透视照片需要正对棋盘。

## Results
- 20 个测试文件，364 项测试通过；生产构建通过（原有大包体积提示）。
- Chromium 实测：上传 PNG、粘贴事件、拖放、Canvas 媒体流截帧与停止、识别、模拟、撤销、空格原图校正；390px 手机布局无横向溢出、无页面异常。拍照设备与真实屏幕选择对话框需要实际设备授权使用。
- 独立审查后修复白底识别与大棋盘同步卡顿；24×24 稀疏棋盘约 15–20ms，随机棋盘独立路径枚举对照一致。
- `npx tsc --noEmit` 仍被已有 mortgage 测试、hash/totp 未使用变量错误阻挡；未报告本次新增 TypeScript 文件错误。
- 限制：图像按相似度分组，需人工核对；不包含透视矫正、拖动砖块、道具、掉落推演和自动操控游戏。
- 末轮视觉检查发现暖色图案易被相同底色稀释，改为仅比较图案区域并降低默认合并阈值；增加回归测试及浏览器6类分组断言。

## Follow-up: 原图消除动画
- 新增 `BrickImageBoard.vue`：保留完整原图，按识别范围映射透明交互层；高亮、点击环、路径描画、闪光缩小淡出，1100ms 后提交；支持只预览、取消、校正与撤销。
- 空格样本遮罩与独立 erasedCells 随历史恢复；漏识别校正后的砖块也正确遮盖；样本被校正为砖块后废弃。
- 范围设置在识别后折叠，主操作放在图片上方，配对列表采用缩略图。
- 验证：367 项测试通过、生产构建通过；Chromium 实测原图动画、预览不提交、点击提交、消除遮罩、撤销、漏识别校正后的消除与样本废弃，手机无横向溢出、无页面报错。独立代码复审通过。

## Rule correction: 框内链推（取代以上所有连连看规则）
- 用户确认游戏为链推消除：推动选中的砖块，同方向连续砖块一起移动；移动后与同图案横/纵直线无遮挡才能消除；不允许超过矩形外框，也不支持拐弯连线。
- 删除 `Rule` / 连连看求解及UI，新增四方向 `pushTiles`，逐格推进并合并新接触的砖块。建议包含可直接消除或拖动一次后消除，不计算多次非消除推动的完整关卡解。
- `applyMove` 重新验证推动位移、影响砖块、消除路径与障碍；原图先播放750ms推动，再播放1100ms消除；移动图案缩略图和遮罩一起更新，预览/取消/撤销恢复完整快照。
- 新增“鸡腿推动示例”：右推一格带动4块、两鸡腿消除，其余砖块保持移位。
- 验证：371 项测试、生产构建通过；Chromium实测原图链推动画、纹理搬移、消除、预览、撤销和取消，390px无横向溢出。独立oracle对照57,072次推动一致，4,176条建议合法且每次减少两块；24×24稀疏棋盘约26ms。

## Fixed-group rule and crop alignment correction
- 用户明确：起始连续砖组固定，遇到空格后另一块砖是障碍，不能再并入。`pushTiles` 与 `findMoves` 均在起点固定组长；四方向仅能移动到下一障碍前的连续空位，取代上文“新接触砖块一起推”的错误规则。
- 用帽子/白菜/空格/水桶回归验证下推1格可行、2格拒绝；独立单块跨两空格后碰障也停止。
- 裁剪偏移复现为不同边框厚度让旧定位14行误算15行；改以砖块中心聚类拟合整张棋盘的原点与格距，避免逐格误差累积。
- 裁剪框改用不占尺寸的内阴影边线，显示分格线，并支持边距/宽高像素微调。
- 验证：373项测试、生产构建通过；浏览器检查14×10棋盘四角缩略图、390px缩放下拖框像素坐标一致，原推动动画/撤销/预览继续通过；新固定组oracle核对57,072次推动一致、4,331条建议合法。

## UI polish and mobile support
- [x] Restructure `BrickAssistantView.vue` with a green hero, import action cards, progress strip, board statistics and clear section hierarchy; preserve existing solver and image coordinates.
- [x] Add responsive single-column layout, 44px touch controls, safe-area spacing, 16px mobile inputs and scrollable pairing options. Polish `BrickImageBoard.vue` frame without changing its internal coordinate system.
- [x] Verify desktop and 320/390/768px mobile layouts, crop selection, playback and undo in Chromium; run all tests/build, review changes, and commit all assistant feature files and navigation.

- UI validation: 373 tests passed; production build passed with existing chunk-size warnings. Chromium checked 320/390/768/1440px widths: no page/content horizontal overflow, 44px playback buttons, playback and undo passed. Original image push/preview/cancel and four-corner crop alignment passed; mobile pointer crop remains [30,40,400,560].
