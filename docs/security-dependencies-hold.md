# 安全挂账：上游停更依赖（Dependency Holds）

> 2026-10-29 建立。目的：对 `cargo audit` / `pnpm audit` 报告中无法在当前依赖链内修复的漏洞做显式登记，
> 记录原因、暴露面与收敛路径，避免重复处置与告警噪音。状态需随上游更新定期复核。

## 挂账清单

| 包 | 版本 | 严重度 | 来源 | 暴露面 | 无法修复原因 | 收敛路径 | 复核触发 |
|---|---|---|---|---|---|---|---|
| node-forge | 1.4.0 | high（GHSA-86w9-cpqp-85rv：RSA PKCS#1 v1.5 签名验证接受多余嵌套 DigestAlgorithm） | apps/mobile → expo 58 → @expo/cli → @expo/code-signing-certificates | **构建期**（expo 签名/证书流程），不随 App 运行时发布 | npm 最后发布版即 1.4.0（漏洞版），上游停更无修复版；expo 58 升级后链仍残留（@expo/code-signing-certificates@0.0.7 依赖 node-forge） | 上游发布 1.4.1+；或 @expo/code-signing-certificates 移除依赖 | @expo/code-signing-certificates 或 expo 发布新版本时 |
| deepmerge | 4.3.1 | low（GHSA-gcqx-w48m-w2h4：mergeObject 原型污染返回对象） | apps/mobile → expo 58 → @expo/config 等（expo CLI 配置合并链） | **构建期**（expo prebuild 配置合并） | npm 最新发布版即 4.3.1（漏洞版），无修复版 | 上游发布 4.3.2+；或 expo 换依赖 | deepmerge 上游发布时 |
| deepmerge | 4.3.1 | low（GHSA-gcqx-w48m-w2h4：mergeObject 原型污染返回对象） | apps/mobile → expo → @expo/config 等（62 条路径） | **构建期**（expo prebuild 配置合并） | npm 最新发布版即 4.3.1（漏洞版），无修复版 | 上游发布 4.3.2+；或 expo 换依赖 | deepmerge 上游发布时 |

## 已执行的处置（历史基线）

- Rust 侧（cargo audit）：**0 vulnerability**（pulldown-cmark 0.13.4→0.13.5，RUSTSEC-2026-0414，commit `79d146f6c`）。
  剩余 3 个 unmaintained 警告（proc-macro-error / ttf-parser / unsafe-libyaml）非漏洞，不处理。
- 前端侧（pnpm audit）：**5 → 2**（commit `c76757954`）：
  - xlsx 0.18.5 → 0.20.3（SheetJS CDN 修复版；GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9 消除；npm 撤版无修复版，改 URL 依赖）。
  - qs 6.16.0 → 6.16.1（override，GHSA-6pq8-jhm2-2vcw 消除）。
- expo 补丁升级：57.0.28 → 57.0.31（commit `a0d4118f3`）。

## 2026-10-29 复核与收敛（expo 58 升级批次）

- **expo 58 升级**（commit `f2438b583`）：57.0.31 → 58.0.21 + RN 0.88 + react 19.3；**node-forge 链残留确认**（expo-server 已移除依赖，但 @expo/code-signing-certificates 仍依赖 node-forge 1.4.0）——挂账维持
- **pnpm overrides 根因修复**（commit `ede14836b`）：根 package.json 两个重复 `pnpm` 键合并（后段覆盖前段致 overrides 静默失效）——25 条 advisory → 2 条（仅 node-forge / deepmerge）
- **cargo audit 复核**：0 vulnerability 维持（654 包，3 unmaintained 非漏洞）
- **dependabot 本地覆盖面**：npm 收敛 23 + Rust 0 = 28 项闭环 26（详见 `docs/security/dependabot-local-audit-20261029.md`）

## 复核命令

```bash
# Rust（镜像环境需本地 advisory-db：git clone https://github.com/RustSec/advisory-db.git 后）
cargo audit --db /path/to/advisory-db

# 前端（镜像 registry 不支持 audit 端点，需显式官方 registry）
npm_config_registry=https://registry.npmjs.org pnpm audit --json
```

## 状态

- [x] 2026-10-29 登记
- [x] 2026-10-29 复核（expo 58 已升级、overrides 根因已修、收敛至极限 2 条）
- [ ] 复核（触发条件：@expo/code-signing-certificates 更新 / node-forge 1.4.1+ / deepmerge 4.3.2+ 发布）
