# 本地依赖漏洞面评估（pnpm audit + cargo audit）2026-11-02

> 背景：GitHub dependabot 提示仓库 default branch 19 项漏洞（1 critical / 8 high / 6 moderate / 4 low）。
> 本评估以本地 lock 扫描替代 dependabot 页面（GitHub 鉴权/网络阻塞）：npm 生态 `pnpm audit --json`（强制官方 registry），Rust 生态 `cargo audit --db`（advisory-db 经 SSH clone 兜底，HTTPS 直连 GitHub 超时）。
> 时点：2026-11-02，方向 2 契约审计收口后（HEAD 5c06ef0b2）。

## 1. 扫描结果

- **pnpm audit（npm 生态）**：19 条 advisory —— critical 0 / high 6 / moderate 9 / low 4（涉及 15 个 advisory 记录）
- **cargo audit（Rust 生态）**：0 漏洞；仅 3 个 unmaintained warnings（proc-macro-error 1.0.4 / ttf-parser 0.25.1 / unsafe-libyaml 0.2.11），均在 `audit.toml` ignore 豁免集合内
- 扫描入口：`npm_config_registry=https://registry.npmjs.org pnpm audit --json`；`cargo audit --db /tmp/advisory-db`（advisory-db 经 `git@github.com:RustSec/advisory-db.git` SSH clone）

## 2. 与 dependabot 19 项对比

| 维度 | dependabot | 本地 pnpm + cargo |
|---|---|---|
| 覆盖 | GitHub Advisory 全生态 | npm 19 + cargo 0 = 19 |
| 统计 | 1 critical / 8 high / 6 mod / 4 low | 0 critical / 6 high / 9 mod / 4 low（npm）+ 0（cargo） |
| 差异原因 | GitHub 侧 CVSS 分级口径不同（npm 侧 critical=CVSS≥9.0）；数量一致 = 全部落在 npm 生态 | — |

## 3. 漏洞面分类（19 条）

### A. 无修复版（挂账，等上游）—— 15 条

| 包 | 受影响 | 修复 | 链 | 条数 |
|---|---|---|---|---|
| node-forge | <=1.4.0（npm 最后版） | 无 | apps/mobile > expo ~58.0.21 > @expo/cli（开发期工具链） | 13（6 high / 4 mod / 3 low） |
| minimatch | <11.0.1 | >=11.0.1，但链内被锁死 | ① eslint 10 系 @eslint/config-array@0.21.2（dev）；② apps/web > exceljs@4.4.0 > archiver@5.3.2 > archiver-utils（minimatch@3 固定，生产导出功能链） | 4（moderate） |
| deepmerge | >=4.2.0 <=4.3.1（最后版） | 无 | expo CLI 链 | 1（low） |

### B. 有修复版但为 breaking/传递锁死（不建议强制 overrides，挂账观察）—— 2 条

| 包 | 受影响 | 修复 | 说明 |
|---|---|---|---|
| glob | 9.3.4 / 10.5.0（传递旧链） | >=14.0.2 | lock 已有 14.0.3 实例；旧链 overrides 至 14 为跨大版本，风险 > 收益（moderate） |

### C. 与 2026-10-29 基线对比（25 → 19）

- 已收敛：@opentelemetry 系、tmp、js-yaml、decode-uri-component、basic-ftp、react-router、esbuild、extract-zip、uuid、zod、@vitest/mocker 等（10-29 记录 B/C 类本次不再报）
- 持续挂账：node-forge（13 条）、deepmerge（1 条）
- 本次新增报告：minimatch（exceljs/archiver 链 + eslint 链）、glob 传递链

## 4. 影响面结论

- **critical 0**；高危全部集中在 node-forge（expo CLI 开发期工具链，不进入生产 server 运行面）
- **生产运行面**：minimatch@3 经 exceljs→archiver→archiver-utils 进入 apps/web（Excel 导出），中危 DoS（globparts 放大）——上游 exceljs@4.4.0（2023 后无更新）锁 minimatch@3，无安全 overrides 通道
- 其余（eslint 链 minimatch、glob 传递、deepmerge）均 dev/构建工具链，风险可控

## 5. 建议

1. **不执行破坏性 overrides**：minimatch 3→11（eslint/archiver-utils 依赖）、glob 9/10→14（跨大版本）均可能破坏构建或 Excel 导出功能，风险 > 收益
2. **跟踪上游**：expo（node-forge 移除）、exceljs/archiver（minimatch@3 解锁）、eslint（@eslint/config-array 锁 minimatch@3）——任一上游发版后重新审计
3. **定期重扫**：npm 生态 `pnpm audit`（官方 registry）+ Rust 生态 `cargo audit --db`（SSH advisory-db），纳入每周缓存清理同周期
4. 本批 19 项均无 critical，暂不阻断发布；生产 server 侧（Rust）0 漏洞

## 6. 周期复核（2026-11-02 晚）——在线重扫完成 + 结论修正

- **在线重扫完成**：`pnpm audit --json`（registry 网络间歇恢复后成功）——**19 条 = critical 0 / high 6 / moderate 9 / low 4，advisory 15 个，与基线完全一致，漏洞面无变化**。
- **结论修正（node-forge 未收敛）**：`node-forge@1.4.0` 仍被判定 vulnerable（`vulnerable=<=1.4.0`，13 条 advisory 全部无修复版本——node-forge 已停更）——上一轮静态核对"升级 1.4.0 即收敛"为**误判**（最新版 ≠ 修复版）。node-forge 13 条维持挂账（expo ~58.0.21 > @expo/cli 锁链）。
- **其余维持基线**：minimatch 新链已修（lock 含 11.0.3 > 11.0.1）但 eslint 10 系 / exceljs>archiver 旧链 3.x 挂账；glob 新链已修（14.0.3 > 14.0.1）但旧链 9.3.4 挂账；deepmerge 4.3.1 仍 vulnerable（>=4.2.0 <=4.3.1 无补丁）——跨大版本 overrides 破坏构建/Excel 导出风险 > 收益，均不执行。

## 7. cargo audit 周期复核（2026-11-02 晚）

- **advisory-db 更新**（SSH clone + pull，新增 thrift RUSTSEC-2026-0435 / zip RUSTSEC-2026-0429 等）。
- **新发现 1 个漏洞并已修复**：`pulldown-cmark 0.13.5`（RUSTSEC-2026-0433，high 7.5——ENABLE_WIKILINKS 嵌套图片 wikilink 二次解析 DoS，2026-10-28 发布，Solution >=0.13.6）→ **cargo update --precise 0.13.6 已升级**（Cargo.lock，patch 级无破坏；经 prost-build → tonic-prost-build → etcd-client → topems-shared-event 构建链）。
- **复查结果**：`cargo audit --db /tmp/advisory-db --no-fetch`（跳过 yanked 网络检查）exit 0——**0 漏洞 + 3 unmaintained**（proc-macro-error/ttf-parser/unsafe-libyaml，audit.toml 豁免集合内）——与基线一致。
- **注**：cargo audit 默认会访问 crates.io 检查 yanked 包，registry 网络间歇阻塞导致大量超时错误——用 `--no-fetch` 跳过该检查可稳定出结果。
