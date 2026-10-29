# 决策记录 D8：apps/mobile Expo 57 → 58 升级评估（排期）

> 状态：评估完成，待排期实施
> 日期：2026-10-29
> 决策人：paulwy（技术负责人拍板"排期评估 expo 58 升级"）
> 关联：遗留项"expo 生态传递依赖（node-forge@1.4.0 为 npm 最后版）"挂账条件复核；预期收敛 node-forge 相关 2 项漏洞

## 1. 背景与目标

- **挂账项**：`node-forge@1.4.0` 为 npm 最后发布版（无修复版），经由 `expo-server@57.0.3`（expo 57 生态传递依赖）进入依赖树；此前结论为"等 expo 更新"。
- **条件变化**：Expo SDK 58 已发布（npm `expo@58.0.21`，stable），**`expo-server@58.0.6` 的 dependencies 已移除 node-forge** —— 收敛路径成立。
- **目标**：评估 apps/mobile 从 expo `~57.0.31` 升级到 `~58.x` 的可行性、影响面、步骤与风险，输出排期建议；不实际升级（升级需按排期分批执行 + 回归）。

## 2. 现状 vs 目标版本（官方绑定）

| 维度 | 当前（SDK 57） | 目标（SDK 58） | 差异 |
| --- | --- | --- | --- |
| expo | ~57.0.31 | ~58.0.x | 大版本 +1 |
| react-native | 0.86.3 | 0.88 | 跨 2 个次版本 |
| react | 19.2.3 | 19.3.0 | minor |
| expo-* 模块 | camera 57.0.6 / device 57.0.2 / notifications 57.0.22 / splash-screen 57.0.10 / status-bar 57.0.1 | 58 系（expo-camera@58.0.14、expo-notifications@58.1.6 等已发布） | 逐模块升 58 |
| @expo/cli | 57 系 | ^58.1.17 | 工具链升级 |
| Metro | 57 系 | 58.0.x（@expo/metro ~58.0.0） | 打包器升级 |
| Node.js | v22.23.2 | 最低 22.13.x | 满足 ✓ |
| Android | compileSdk 36 / targetSdk 36 | compileSdk 37 / targetSdk 36 | 构建 SDK 升 1 |
| iOS / Xcode | iOS 16.4+ / Xcode 26.4+ | 同 57 | 无新增要求 |

## 3. 兼容性评估

### 3.1 React Native 0.86 → 0.88

- RN 官方：0.88 为继 0.83/0.86 后**第三个"无用户可见 breaking changes"** 的 release（博客 2026-10-19）。
- 主要行为变化（需回归关注）：
  - **Web-based event dispatching 默认切换**：事件分发走 Web 路径，依赖传统事件时序/自定义 dispatch 的交互逻辑需验证。
  - Variable fonts（`fontVariationSettings`，Text/TextInput）—— 新增能力，无破坏。
  - iOS SceneDelegate 生命周期支持；React 19.3.0；Metro 0.87。

### 3.2 第三方库（peer 声明核查）

| 库 | 当前版本 | peer react-native | 结论 |
| --- | --- | --- | --- |
| react-native-paper | ^5.15.3 | `*` | 宽松，运行时测试确认 |
| react-native-svg | 15.15.4 | （未声明 peer） | 宽松 |
| react-native-screens | ~4.26.0 | 宽松 | 需验证 RN 0.88 兼容 |
| react-native-safe-area-context | ~5.7.0 | 宽松 | 需验证 |
| @react-navigation/native 等 | 6.x | `*` | 宽松，6.x 无 RN 版本硬绑定 |
| zustand / dexie / axios / lucide | 无 RN 绑定 | — | 不受影响 |

### 3.3 原生构建

- Android：`compileSdkVersion` 36 → 37，需 Gradle/AGP 环境匹配（本地构建或 CNG 云端构建验证）。
- iOS：Xcode 26.4+（与 57 相同要求，无新增）。
- 若走 EAS 云构建：SDK 58 模板由 Expo 托管，风险低；本地构建需核对本机 Xcode/Android SDK。

### 3.4 node-forge 收敛预期

- `expo-server@58.0.6` dependencies 为空（无 node-forge）—— 升级后 `pnpm-lock.yaml` 中 3 处 `node-forge: 1.4.0` 传递引用应消失。
- 验收：升级后 `grep node-forge pnpm-lock.yaml` 无命中 + `npm audit`（pnpm `audit`）相关漏洞清零。

## 4. 升级步骤（排期实施时）

1. **分支**：`feat/expo58-upgrade`，本地环境 Node ≥ 22.13 确认（当前 22.23.2 ✓）。
2. **升级 expo 主包与模块**：
   - `npx expo install expo@~58.0.0`（官方推荐路径，自动对齐 SDK 版本）
   - `npx expo install --fix` 校正 expo-* 模块与 RN/react 至 58 配套版本（camera/device/notifications/splash-screen/status-bar 逐项核对 `~58.x`）
   - `npx expo install react-native@0.88 react@19.3.0`
3. **pnpm 安装**：`pnpm install` 更新 lock；核对 node-forge 移除、无 peer 冲突。
4. **原生配置**：`app.json`/`app.config.ts` 核对（如有 `expo-build-properties` 确认 compileSdk 37）；Android 本地构建冒烟。
5. **类型与代码**：`tsc`/`eslint` 全量；按编译错误修正 API 变化（预计极少）。
6. **回归**：见 §5 测试清单。

## 5. 测试清单（升级后必测）

- [ ] `pnpm install` 后 lock 无 node-forge；`pnpm audit` 相关漏洞清零（收敛验收）
- [ ] Metro bundle 起服（`expo start`）无报错；web/ios/android 三端均可启动
- [ ] **交互回归（Web 事件分发默认切换重点）**：列表滚动、点击、键盘、下拉刷新、导航跳转时序
- [ ] 相机（expo-camera）拍摄/权限流；通知（expo-notifications）注册与前台/后台投递；设备信息
- [ ] 登录态（async-storage/token 刷新）、离线缓存（dexie）读写
- [ ] 第三方 UI（paper/svg/screens/safe-area）关键页面渲染与导航转场
- [ ] TypeScript 全量编译 0 error；CI（lint + tsc + 依赖审计）全绿
- [ ] Android 本地构建（compileSdk 37）出包成功；iOS 模拟器启动（如本机具备 Xcode 26.4+）

## 6. 风险与缓解

| 风险 | 等级 | 缓解 |
| --- | --- | --- |
| Web 事件分发默认切换导致交互时序变化 | 中 | 回归清单重点覆盖交互；异常时评估 `unstable_event_target` 类回退配置 |
| expo 58 模块 API 变更（SDK 级） | 低-中 | 逐模块查 changelog；以编译错误驱动修正 |
| react-navigation/paper/screens 对 RN 0.88 运行时兼容 | 低 | peer 宽松 + RN 无 breaking；列入回归 |
| Android compileSdk 37 构建环境不匹配 | 低-中 | 核对本机 AGP/Gradle；必要时临时降级或 CNG |
| 升级本身引入回归风险（大版本动作） | 中 | 独立分支 + 完整回归清单 + 可回滚（git） |

## 7. 排期建议

- **建议作为独立迭代任务排期**（预计 1-2 天工作量，含回归）。
- 前置：确认 Android 本地构建环境（AGP/Gradle）或采用 CNG 云端构建。
- 顺序建议：① 分支升级 + 编译修正 → ② node-forge 收敛验收（lock 审计）→ ③ 三端冒烟 + 交互回归 → ④ 合并 + 推送（协作机并发期按 fetch+rebase 纪律）。

## 8. 结论

升级可行：官方绑定版本链（expo 58 ↔ RN 0.88 ↔ react 19.3.0）已稳定发布，RN 官方声明无 breaking，Node/第三方 peer 条件满足，且可**确定性收敛 node-forge 2 项传递漏洞**。风险集中在交互时序与构建环境，均有明确测试/缓解路径。待排期实施。

## 附：信息来源

- Expo SDK 版本与 RN 绑定表：https://docs.expo.dev/versions/v58.0.0/
- React Native 0.88 release notes（no breaking changes）：https://reactnative.dev/blog
- npm registry（expo@58.0.21 / expo-server@58.0.6 / expo-camera@58.0.14 等版本与 dependencies 核查）
