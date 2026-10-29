# 安全挂账：上游停更依赖（Dependency Holds）

> 2026-10-29 建立。目的：对 `cargo audit` / `pnpm audit` 报告中无法在当前依赖链内修复的漏洞做显式登记，
> 记录原因、暴露面与收敛路径，避免重复处置与告警噪音。状态需随上游更新定期复核。

## 挂账清单

| 包 | 版本 | 严重度 | 来源 | 暴露面 | 无法修复原因 | 收敛路径 | 复核触发 |
|---|---|---|---|---|---|---|---|
| node-forge | 1.4.0 | high（GHSA-86w9-cpqp-85rv：RSA PKCS#1 v1.5 签名验证接受多余嵌套 DigestAlgorithm） | apps/mobile → expo → @expo/code-signing-certificates | **构建期**（expo 签名/证书流程），不随 App 运行时发布 | npm 最后发布版即 1.4.0（漏洞版），上游停更无修复版；expo 57.0.31 peerDependencies **pin 死 node-forge 1.4.0** | expo 58 大版本升级（依赖链可能换库）；或上游发布 1.4.1+ | expo 发布新版本时 |
| deepmerge | 4.3.1 | low（GHSA-gcqx-w48m-w2h4：mergeObject 原型污染返回对象） | apps/mobile → expo → @expo/config 等（62 条路径） | **构建期**（expo prebuild 配置合并） | npm 最新发布版即 4.3.1（漏洞版），无修复版 | 上游发布 4.3.2+；或 expo 换依赖 | deepmerge 上游发布时 |

## 已执行的处置（历史基线）

- Rust 侧（cargo audit）：**0 vulnerability**（pulldown-cmark 0.13.4→0.13.5，RUSTSEC-2026-0414，commit `79d146f6c`）。
  剩余 3 个 unmaintained 警告（proc-macro-error / ttf-parser / unsafe-libyaml）非漏洞，不处理。
- 前端侧（pnpm audit）：**5 → 2**（commit `c76757954`）：
  - xlsx 0.18.5 → 0.20.3（SheetJS CDN 修复版；GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9 消除；npm 撤版无修复版，改 URL 依赖）。
  - qs 6.16.0 → 6.16.1（override，GHSA-6pq8-jhm2-2vcw 消除）。
- expo 补丁升级：57.0.28 → 57.0.31（commit `a0d4118f3`）。

## 复核命令

```bash
# Rust
cargo audit
# 前端（镜像 registry 不支持 audit 端点，需显式官方 registry）
pnpm audit --registry https://registry.npmjs.org --audit-level=low
```

## 状态

- [x] 2026-10-29 登记
- [ ] 复核（触发条件：expo 58 发布 / node-forge / deepmerge 上游发布新版本）
