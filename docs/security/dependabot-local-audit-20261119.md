# 本地依赖漏洞面评估与治理（pnpm audit + cargo audit）2026-11-19

> 背景：GitHub default branch 提示 28 项漏洞（1 critical / 10 high / 11 moderate / 6 low）。
> 本评估以本地 lock 扫描替代 dependabot 页面：npm 生态 `pnpm audit --json --registry https://registry.npmjs.org`
> （默认 registry npmmirror 缺审计端点，必须显式切官方源）；Rust 生态 `cargo audit`。
> 时点：2026-11-19，HEAD `3f13ac268`（门禁基线刷新后）。

## 1. 扫描结果对比

| 生态 | 治理前 | 治理后 | 处理方式 |
|---|---|---|---|
| Rust（cargo audit） | 7 漏洞（lettre 6 + libsqlite3-sys 1） | 0 漏洞（5 allowed warnings） | lettre 升级；libsqlite3-sys 按既有约定登记豁免 |
| npm（pnpm audit） | 26（8 high / 12 mod / 6 low） | 0（0/0/0/0） | overrides 收敛 + 仅更新补丁版本 |

## 2. Rust 侧

| 包 | 治理前 | 治理后 | 说明 |
|---|---|---|---|
| lettre | 0.11.22 | 0.11.24 | 清除 RUSTSEC-2026-0560~0565（6 条，邮件头/解析相关） |
| sqlx 系 | 0.9.0 | 0.9.1 | 常规补丁升级；`sqlx-sqlite` 仍锁 `libsqlite3-sys 0.30.1` |
| libsqlite3-sys | 0.30.1 | 0.30.1（保留） | RUSTSEC-2026-0459：仅进 lock、不编译不链接，已登记 `.cargo/audit.toml` + `deny.toml` + `audit-ignore-registry.md` |

`cargo audit`：0 vulnerability，5 allowed warnings（含 yanked `async-executor 1.14.0`，另行跟踪）。

## 3. npm 侧（26 → 0）

| 包 | 治理前 | 治理后 | 引入链 | 处置 |
|---|---|---|---|---|
| node-forge | 1.4.0（21 条，8 high / 7 mod / 6 low） | 1.4.3 | apps/mobile > expo 58.0.21 > @expo/cli / @expo/code-signing-certificates | `overrides.node-forge` |
| basic-ftp | 6.2.3 | 6.2.6 | apps/web(dev) > @lhci/cli > lighthouse > puppeteer-core > @puppeteer/browsers > proxy-agent > pac-proxy-agent | `overrides.basic-ftp`（原 pin 6.2.3 即漏洞版本，直接更新） |
| glob | 9.3.4 / 10.5.0 | 14.0.3 | babel-plugin-module-resolver（dev）、istanbul 链（dev） | `overrides.glob` + 原 `glob@>=10 <11` pin 10.5.0 更新为 14.0.3 |
| minimatch | 8.0.7 / 9.0.9 | 11.0.3（除 a11y 插件保留原版） | 9.0.9 来自 lighthouse > @sentry/node 9.47.1 | 定向 `overrides["@sentry/node>minimatch"]`，**不做全量强制** |

### 3.1 为什么 minimatch 只做定向 override

全量 `minimatch@<11.0.1 → 11.0.3` 会让 `eslint-plugin-jsx-a11y@6.10.2` 崩溃
（该插件用 `require('minimatch')` 的 default 形态：`(0, _minimatch.default) is not a function`），
lint 直接中断。改为只覆盖使用 `minimatch.minimatch` 命名导出的 `@sentry/node`，
并已在包内实测：`require('minimatch').minimatch` 为函数、返回布尔值正常。

## 4. 验证记录

- `cargo check --workspace --all-targets`：通过（9m09s，target 冷启动全量编译）
- `cargo audit`：0 vulnerability / 5 allowed warnings
- `pnpm audit --registry https://registry.npmjs.org`：0 critical / 0 high / 0 moderate / 0 low
- `pnpm run typecheck`（apps/web tsc --noEmit）：通过
- `pnpm run lint`（eslint apps/ packages/）：0 errors，152 warnings（仓库既有存量，`--max-warnings 100` 仍会报退出码，属既有状态；pre-commit 门禁只对暂存的 `apps/web/src` 文件执行 `--fix`，不受影响）
- 附带修复：`apps/web/src/api/finance/openingBalance.ts` 的两处 prettier 格式漂移（存量，非本次引入）

## 5. 遗留与跟踪

- `libsqlite3-sys 0.30.1`：等上游 sqlx 改用 `libsqlite3-sys >=0.39` 后解除豁免。
- `async-executor 1.14.0` yanked：随 async-std/smol 生态滚动升级消除。
- npm 侧当前 0 条；若未来 `glob`/`minimatch` 再出 advisory，优先评估"升级父包"而非"全量强制大版本"。

## 6. 桌面端（`apps/desktop/src-tauri`，独立 `Cargo.lock`，700 crates）

`cargo audit --no-fetch` 命中（均属构建期工具链，不进服务端运行时）：

| 包 | 版本 | 条数 | 最高级别 | 引入链 | 处置 |
|---|---|---|---|---|---|
| zip | ~~8.6.0~~ → 9.7.3 | ~~8~~ → **0** | 9.1 critical（RUSTSEC-2026-0369） | tauri-plugin-stronghold → stronghold-runtime → libsodium-sys-stable **1.24.6** → zip ^9.5 | **已修复**（见下） |
| crypto-bigint | 0.5.5 | 1 | moderate | 同主仓 jwtn/p256 链 | 上游未发版，同主仓豁免口径 |
| bincode | 1.3.3 | 1 | unmaintained | tauri 生态 | 随 tauri 滚动 |
| chrono | 0.4.45 | 1 | informational | tauri 生态 | 随 tauri 滚动 |

**zip 8.6.0 已清零（本文件此前登记为"接受风险"，已推翻）**：修复要求 `zip >= 9.0.0`，此前
`libsodium-sys-stable` 停 1.24.3（约束 `^8.6`）看似无解；实际上游 **1.24.4 起已切 `zip ^9.4`**，
只是 `tauri-plugin-updater` 把锁里的 zip 压在 9.1.3，导致 `cargo update -p libsodium-sys-stable`
报 "all possible versions conflict" 而非明确的版本不可用。正确顺序是**先升 zip 再升 libsodium**：

```bash
cd apps/desktop/src-tauri
cargo update -p zip@9.1.3 --precise 9.7.3          # 解开 updater 的 9.1.3 锚点
cargo update -p libsodium-sys-stable@1.24.3 --precise 1.24.6
```

结果：`zip 8.6.0` 整个条目被移除，锁里只剩 `zip 9.7.3`；连带 `cc 1.10→1.11.2`、
`ureq 3.5.0→3.5.2`、`ureq-proto 0.6.5→0.7.1`，移除 `minisign-verify 0.2.5`、`typed-path 0.12.4`。
**验证**：`libsodium-sys-stable 1.24.6` + `zip 9.7.3` 在独立临时 crate 中完整编译通过（4m17s，
含 vendored libsodium C 编译），确认非"锁能解但编不过"。

**已排除的错误做法**：对桌面锁 `cargo update` 全量刷新会带来 `syn 3.0.9→2.0.119`、
`windows-sys 0.61.2→0.59.0` 等**解析回退**，既无安全收益又可能打挂桌面构建，已还原。

## 7. GitHub 口径 28 → 5 的对应关系

- 26 → 0：pnpm 工作区（第三、四节已闭环）。
- 28 → 5 中的 1 critical + 3 high **即为桌面端 zip 8.6.0**，已于第六节清零（`zip 9.7.3`）。
- 剩余项为**上游未发版导致无法解析，不是没做**，逐条证据：

| advisory | 需要的修复版本 | 卡点 |
|---|---|---|
| RUSTSEC-2026-0387 crypto-bigint | `>= 0.7.6` | 需 `jsonwebtoken 12`（`p256 0.14` 已不再依赖 crypto-bigint）；但 jwtn 12 的 `rust_crypto` 后端要求 `rsa ^0.10`，生态里只有 `0.10.0-rc.20` 预发布版，`^0.10` 无法解析；改 `aws_lc_rs` 后端则需 cmake 构建 BoringSSL（本机无 cmake、CI 面风险） |
| RUSTSEC-2023-0071 rsa（Marvin） | `>= 0.10.0` | 同上，被 jwtn 12 的预发布 rsa 卡住；且代码里 **RS256 真在用**（`lib/shared-auth/src/auth.rs` 验签先 RS256 后 HS256），不能靠删依赖绕过 |
| RUSTSEC-2026-0459 libsqlite3-sys | `>= 0.39.0` | 需 rusqlite 0.41；`sqlx` 目前 crates.io 最新即 0.9.1，`sqlx-sqlite` 仍 pin `^0.30`，只能等 sqlx 发版 |

- `tests/integration/package-lock.json`、`tests/e2e/package-lock.json` 被 `.gitignore` 忽略，
  **不在 GitHub 扫描面**；本地仍已刷新（integration 的 lock 过期锁在 vitest 2.1.9 且有结构损坏，
  package.json 早已是 `^4.1.11`，按 package.json 重生成后两处 `npm audit` 均 0 条）。
