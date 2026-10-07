# Dependabot 剩余不可修依赖评估（2026-10-07）

> 背景：2026-10-07 Dependabot alerts 启用后首份扫描报 45 项依赖告警（3 critical / 8 high / 34 moderate，路径展开计数）。经本地核验（pnpm audit 官方 registry + cargo audit SSH 拉取 advisory-db），唯一漏洞约 20 个；**15 项已通过 `pnpm.overrides` 升级修复**（commit `39703d180`，pnpm audit 19→4，portal typecheck 通过）。本文件评估**剩余 4 项无上游修复版本的依赖**的替换可行性。

## 一、结论摘要

| 依赖 | 当前版本 | 漏洞（严重度） | 上游修复 | 父链来源 | 替换可行性 | 结论 |
|---|---|---|---|---|---|---|
| `ip` | 1.1.9 | SSRF / isPublic 分类不当（high） | **无**（1.1.9 为最终版，已停止维护） | RN CLI 12.x 工具链（`internal-ip@4.3.0` → `ip`）、`@puppeteer/browsers`、`@prisma/instrumentation`、`@react-leaflet/core` | 需升级 RN 0.73 → 新版（破坏性大工程） | **风险接受** |
| `node-forge` | 1.4.0 | RSA PKCS#1 v1.5 签名验证（high） | **无**（1.4.0 为最终版，已停止维护） | `@expo/cli`、`@expo/code-signing-certificates`、`@expo/bunyan`、`@eslint/plugin-kit`（0.4.1/0.7.2 均依赖） | 需升级 Expo 工具链（与 RN 生态配套，破坏性） | **风险接受** |
| `braces` | 3.0.3 | 栈耗尽 DoS（high） | **无**（3.0.3 为最终版） | `micromatch@4.0.8`、`micromark-util-*`（Remark 文档处理生态） | 无新版可覆盖（micromatch 仍锁定 braces 3.x） | **风险接受** |
| `sprintf-js` | 1.1.3 | 无界 DoS（moderate） | **无**（1.1.3 为最终版） | `argparse@1.0.10`（js-yaml 3.x 生态）+ 12 个旧工具链父包 | 需升级 js-yaml 3→4 及其父链（RN CLI 锁定 cosmiconfig@5） | **风险接受** |

## 二、评估依据

### 2.1 父链定位方法
- 解析 `pnpm-lock.yaml`（v9 格式）的 packages 段依赖块，定位直接依赖目标包的父包。
- 结合 npm 生态已知事实（RN 0.73 配套 `@react-native-community/cli@12.x`；Expo SDK 配套 `@expo/cli`；ESLint 9 配套 `@eslint/plugin-kit`）。

### 2.2 为何无法升级修复
- 4 个包均为 **npm 生态中已停止维护（EOL）的库**，上游无任何修复版本（`fix: <0.0.0`），Dependabot 亦无修复建议。
- 父链被 **RN 0.73 / Expo SDK / ESLint 9 / micromatch / js-yaml3 生态版本锁定**：
  - 升级父包（如 RN 0.73 → 最新）将牵动原生依赖、babel/编译器配套、CLI 插件矩阵，属**大版本破坏性迁移**（数天级工作量、回归风险高），非依赖层可解决。
  - 用 overrides 强制替换为替代库（如 `ip` → `ipaddr.js`）会因 **API 不兼容**导致编译失败。

### 2.3 实际风险研判（为何可接受）
| 依赖 | 利用前提 | 实际暴露面 |
|---|---|---|
| `ip` | 服务需用 `isPublic()` 处理**用户可控 IP** 并据此做信任决策 | 均出现在**构建/开发期工具**（RN CLI 内部本机地址判断、Puppeteer 浏览器管理、Prisma 遥测、前端地图库），非生产运行时网络服务，**无用户输入到达该路径** |
| `node-forge` | 服务需用其 PKCS#1 v1.5 验证**不可信签名** | Expo 代码签名工具（开发期）、ESLint 插件内部 util；**非生产证书校验路径**（生产凭证轮换已闭环，见凭证轮换指引） |
| `braces` | 攻击者可控 glob 模式触发**递归展开** | micromatch/micromark 用于**构建脚本与文档处理**（路径/文件名匹配），模式来自仓库内常量与脚本，非外部输入 |
| `sprintf-js` | 攻击者可控格式化字符串触发无界分配 | js-yaml 3.x 生态的**开发期解析工具**；无直接代码引用（grep 验证），非网络服务输入面 |

### 2.4 如需彻底清零的路径（成本与风险）
1. **升级 React Native 0.73 → 最新 LTS**：消除 RN CLI 12.x 链（`internal-ip`/`ip`、`cosmiconfig@5`/`sprintf-js`）。成本：原生工程迁移、babel/新架构配套、各第三方库兼容验证，**预计 1 周级工作量**。
2. **升级 Expo SDK 工具链**：消除 `@expo/cli`/`node-forge` 链。与 RN 升级联动。
3. **替换 ESLint 插件**或等待 `@eslint/plugin-kit` 移除 node-forge（当前 0.7.2 仍依赖，上游未排期）。
4. **Dependabot 官方 dismiss 机制**：在 GitHub Dependabot 页面对这 4 个包（及路径实例）以 `fix unavailable / tolerable risk` 原因 dismiss，使告警列表清零——**推荐**（官方支持，不隐藏风险、可审计）。

## 三、建议处置

- **短期**：在 Dependabot 页面 **dismiss 这 4 个依赖的全部告警**（原因：上游无修复版 + 构建期工具非暴露面），并保持文档记录（本文件）作为审计凭证。
- **中期**：规划 RN/Expo 大版本升级时，将本清单作为升级验收项（升级后应自然消除）。
- **监控**：Dependabot 已启用，若上游未来发布修复版本会自动重新告警，届时再升级处理。

## 四、关联提交

- `39703d180` build(deps)：pnpm overrides 修复 15 项（proxy-addr/sharp/fast-xml-parser/basic-ftp/brace-expansion/opentelemetry）
- `57c8ebde6` fix(desktop)：DesktopError 错误形态统一
- `2e8ad5a29` docs(security)：审计报告 Dependabot 处理闭环记录
- `64927930b` test(desktop)：DesktopError 断言适配
