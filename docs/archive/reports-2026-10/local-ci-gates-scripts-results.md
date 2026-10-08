# 本地 CI 复刻验证 — 脚本/静态门禁类 job 结果

- 日期：2026-10-08
- 仓库：/Users/xingzhai/TOPEMS
- 基线：HEAD 起测于 `e0bc4fa3e`（=origin/main）；测试期间并行前端代理提交 `745310ae6`，本 agent 修复提交 `7fc6f4bb4`
- 环境：macOS (zsh/BSD)，node v22.23.2，python3 3.14.7，shellcheck 0.11.0 (homebrew)
- 范围：ci.yml 中「脚本/静态门禁类」共 17 个 job 的本地等价复刻（不跑 cargo/pnpm 构建类）
- 说明：工作区为多人共享，测试期间其他组有未提交 WIP（rustfmt 重排 svc/finance 等）；凡受 WIP 影响的条目均在备注标明。

## 结果总表

| # | job 名 | 本地等价命令 | exit code | 结果 | 关键证据行 | 备注 |
|---|--------|--------------|-----------|------|-----------|------|
| 1 | changes | （dorny/paths-filter，无本地等价） | n/a | skip | — | CI 机制 job，按 push/PR 事件计算路径过滤输出；本地 git 无 paths-filter 语义，跳过 |
| 2 | shellcheck | `bash scripts/ci/check-shellcheck.sh` | 0 | pass | `✅ [shellcheck] 78 个脚本 0 告警 0 语法错误` | `sudo apt-get install shellcheck` 为 Ubuntu 专属，跳过该步；macOS 本机已有 shellcheck 0.11.0 |
| 3 | config-registry-gate | `python3 scripts/check-workspace-registry.py --check`; `node scripts/ci/check-config-sources.cjs --check` | 0 / 0 | pass | py: `✓ Cargo.toml members / config/services.yaml / config/ports.env 三向一致`; node: `✅ 全部一致` | `pip install pyyaml` 跳过（本机已有 pyyaml 6.0.3） |
| 4 | changelog-gate | CI 条件 `if: github.ref_type == 'tag'`；本地试跑 `./scripts/release.sh check` | 0（release.sh） | skip(CI) / 本地可跑绿 | `✅ 校验通过：CHANGELOG 结构完整，草案可生成` | CI 侧非 tag 事件不触发 → skip；其底层脚本本地可跑且 exit 0 |
| 5 | date-type-audit | `python3 scripts/date-type-audit.py` | 0 | pass | `实体层违规：0 ✅` / `Instant 序列化边界违规：0 ✅` | 纯静态，无 DB |
| 6 | schema-defense-drift | `python3 scripts/check-schema-defense-drift.py` | 0 | pass | `对拍表数=63  无双写跳过表数=575  drift 处数=0 ... PASS (exit 0)` | 纯静态 |
| 7 | frontend-audit (7 步) | 见下方明细 | 混合 | **fail（3/7 红）** | 见明细 | 3 个红均为 main 基线既存问题，非本次引入 |
| 8 | i18n-quality-gate (3 步) | 见下方明细 | 混合 | **fail（1/3 红）** | 见明细 | 硬编码 CJK 25 处超阈值 0 |
| 9 | permission-matrix-gate | `node scripts/ci/perm-matrix-toolkit.cjs ci-report --report-json=/tmp/perm-gate-ci.json` | 1 | fail | `integrity.passed=true`; `summary={R1:0,R2:0,R3:9,R4:0,R5:7,R6:0}`; `exit code: 1` | STRICT 模式 FAIL(R1/R4/R5/R6)>0 即红；R5=7（svc/ai settings.rs、svc/wms analytics.rs）。R3=9 为 WARN 不阻断 |
| 10 | menu-health-gate | `node scripts/analyze-menu.cjs --fail-fast --thresholds '{"T1":0,"T2":0,"P1":0,"R3":0}' --report-json=/tmp/menu-gate-ci.json --quiet` | 1 | fail（已修硬 bug） | 修复前：`Error: Cannot find module '.../scripts/analyze-menu.cjs'` MODULE_NOT_FOUND；修复后：`P1: count=52 > threshold=0`、`R3: count=271 > threshold=0` | 根因：清理提交 fc6ba69fc 误删脚本（自称"0 workflow 引用"，实际 ci.yml:1090 仍引用）。已从 git 历史恢复并本地提交 7fc6f4bb4。恢复后 P1/R3 内容层红属前端 v2 路由重构后的对齐债，不在本 agent 编辑范围 |
| 11 | axum-layer-gate (2 步) | 见下方明细 | 0 / 1 | **fail（group2 红）** | layer-order: `R1: 0 · FAIL ... Integrity PASS: true` exit 0; group2: `③ GROUP2 "aps" — 无匹配 plugin.yaml` / `"feedback" — 无匹配 plugin.yaml` | layer-order 绿；group2-services --strict 红（aps/feedback 在 GROUP2 清单但无 plugin.yaml） |
| 12 | api-audit-gate | `node scripts/ci/check-api-audit.cjs --fail-fast --thresholds '{"p6.red":0,"p7.not_legal":0,"p7.mismatch":0}' --report-json=/tmp/api-audit-ci.json --quiet` | 0 | pass | `p6.red=0 / p6.yellow=0 / p6.amber=0 / p7.not_legal=0 / p7.mismatch=0` 全 PASS | quiet 模式无 stdout，JSON 确认全阈值 PASS |
| 13 | error-handling-gate | `node scripts/ci/check-error-handling.cjs --changed-only` | 1 | fail（WIP 触发） | `❌ 本次改动新增 11 处错误出口违规`（svc/finance/src/modules/mod.rs） | 根因：脚本按"文件级"判定（非行级），共享工作区中他组 rustfmt 重排 finance/mod.rs → 该文件存量违规被整体顶出。干净 checkout 上本 job 应为绿。非本 agent 引入 |
| 14 | quality-gate（可复刻部分） | `node scripts/ci/check-sqlx-cache-freshness.cjs --dry-run --report-json=/tmp/sqlx-cache-report.json` | 0 | pass | `SQLX_CACHE_STATUS: PASS · files: 197 · stale: false` | 该 job 的 needs-汇总 PASS/FAIL 判定为 CI 内部编排，本地只复刻脚本部分；本步 advisory 非阻断，exit 0 |
| 15 | schema-boundary-gate (2 步) | `python3 scripts/check_schema_boundary.py`; `node scripts/ci/check-schema-boundary.cjs` | 0 / 0 | pass | py: `✓ Schema 边界门禁通过`（28 服务全 PASS）; node: `checked 29 services / 1468 files / 3143 bare sqlx call sites ... PASS` | 纯静态 |
| 16 | code-quality (4 步) | 见下方明细 | 混合 | **fail（4/4 红）** | 见明细 | 均为 main 基线既存债 |
| 17 | environment-check | python3 heredoc 复刻（YAML 语法 / rust-toolchain channel / target-dir 相对路径 / 门禁脚本存在性） | 0 | pass | `✅ 环境一致性检查通过（YAML / 工具链 / target-dir / 门禁脚本）` | `sudo apt install python3-yaml` 跳过（本机 pyyaml 已有） |

## 明细

### 7 · frontend-audit（7 个 --strict 子检查）
| 子命令 | exit | 结果 | 证据 |
|--------|------|------|------|
| `node scripts/ci/page-audit.cjs --strict` | 0 | pass | `✅ 审计完成` |
| `node scripts/ci/check-icons.cjs --strict` | 0 | pass | `✅ 图标完整性检查完成` |
| `node scripts/ci/check-nav-route.cjs --strict` | 1 | **fail** | `lazy.ts 模块数: 0`；`routes/v2 有但 lazy.ts 没有: iam, admin, ...`。根因：脚本读 `lib/navigation/modules/lazy.ts`，前端已重构为 `NavigationRegistryV2.ts`，旧文件不存在（readFile 吞错返回空 → 35 路由全部判为"未注册"） |
| `node scripts/ci/compare-api-modules.cjs --strict` | 1 | **fail** | `API 独有 - 非白名单（需检查）: aps, tms, unified-core`（3 个） |
| `node scripts/ci/check-api-coverage.cjs --strict` | 0 | pass | `✅ API 覆盖率检查完成` |
| `node scripts/ci/check-a11y.cjs --strict` | 1 | **fail** | `未覆盖组件数: 20`（阈值 10）；均为 `[IconButton]` 缺 aria-label，分布 ai/automation/bff/gis 等 9 文件 |
| `node scripts/ci/check-i18n.cjs --strict` | 0 | pass | `7-in-1 Gate Result: ✅ PASS (0 failures)` |

### 8 · i18n-quality-gate（3 步）
| 子命令 | exit | 结果 | 证据 |
|--------|------|------|------|
| `node scripts/ci/check-i18n-quality.cjs --strict` | 0 | pass | `7-in-1 Gate Result: ✅ PASS (0 failures)` |
| `node scripts/ci/verify-glossary.cjs --strict` | 0 | pass | `非标准译法总数: 0` / `Glossary 一致性门禁通过` |
| `node scripts/i18n/scan-hardcoded-precise.cjs --strict --details 50` | 1 | **fail** | `❌ Strict mode FAILED: 25 hardcoded CJK UI strings detected`（如 `pages/mes/MesWorkOrderPage.tsx` `件`） |

### 11 · axum-layer-gate（2 步）
| 子命令 | exit | 结果 | 证据 |
|--------|------|------|------|
| `node scripts/ci/check-axum-layer-order.cjs --fail-fast --thresholds=R1:0,R2:0,R3:999999 --report-json=/tmp/axum-layer-report.json` | 0 | pass | `R1: 0 · FAIL`、`R2: 22 · WARN`、`R3: 3 · WARN`；WARN 不阻断，Integrity PASS |
| `node scripts/ci/check-group2-services.cjs --strict` | 1 | **fail** | `Errors (2): GROUP2 "aps" 无匹配 plugin.yaml / GROUP2 "feedback" 无匹配 plugin.yaml` |

### 16 · code-quality（4 步）
| 子命令 | exit | 结果 | 证据 / 根因 |
|--------|------|------|------|
| `python scripts/tools/check_api_duplicates_ci.py --ci` | 1 | **fail** | `✗ [ai] POST /search (重复 2 次) — ai/src/routes.rs:147 / :175`（该文件无 WIP 改动，main 基线既存）。注：聚合进程在沙箱 host-audit 拥塞下间歇阻塞；结果由 `--service ai` 单项 exit=1 + 脚本 `sys.exit(1 if error_count>0 else 0)` 退出逻辑确证 |
| `python scripts/tools/check_component_naming.py --ci` | 1 | **fail** | `FAIL: 发现 4 个错误, 3 个警告, 共检查 1047 个文件` |
| console.log grep（ci.yml 原命令） | 1 | **fail** | 命中 `apps/web/src/services/TauriAuth.ts` 5 处真实 `console.log('[TauriAuth] ...')`、`microfrontend/devex/code-completion.ts` 等；其余多为注释/字符串字面量，但 ci.yml 命令本身只排除 test/spec/stories，命中即红 |
| `bash scripts/check_allow_baseline.sh` | 1 | **fail** | 列出 `svc/unified-core/src/shared/k8s_service_discovery.rs`、`util.rs` 多处 `#[allow(clippy::...)]` 超基线；提示 `update the baseline` |

## 修复记录
- **menu-health-gate 硬 bug**：`scripts/analyze-menu.cjs` 被清理提交 fc6ba69fc 删除，但 ci.yml:1090 仍引用 → CI 上 MODULE_NOT_FOUND。已从 `fc6ba69fc^` 恢复该脚本（1375 行），本地提交 `7fc6f4bb4`（仅 add 此一文件，未 push，lefthook 25 hooks 全过）。
- 恢复后该 gate 可执行，但 P1=52/R3=271 内容层红：判断为该 8 月版脚本按旧 `config.ts routes` 解析，而路由注册已迁至 `routes/v2/index.ts`（35 模块），R3 多为结构性误报；P1 为权限码注册对齐。此部分需前端团队按 v2 模型校准，不在本 agent（脚本/静态门禁）编辑范围，亦不改 frontend 源码 / ci.yml。

## 未修项（如实说明，非本 agent 范围）
- frontend-audit 的 nav-route / compare-api-modules / a11y 三红：检查器指向已重构的 `lazy.ts`、3 个 API 模块未入白名单、20 个 IconButton 缺 aria-label（跨 ai/automation/bff/gis 9 文件）——均前端其他组文件/产品基线债。
- i18n scan-hardcoded 25 处硬编码 CJK、permission-matrix R5=7、group2 aps/feedback 缺 plugin.yaml、code-quality 四红（api 重复 / component-naming / console.log / allow-baseline）：均 main 基线既存，涉及后端/前端其他组源码。
- error-handling --changed-only 红由共享工作区他组 WIP（rustfmt 重排 finance/mod.rs）触发，干净 checkout 应为绿。

## 环境差异（跳过项）
- `changes`：paths-filter 为 GitHub Actions 机制，无本地等价。
- `changelog-gate`：CI 仅 tag 触发；本地非 tag，底层 `release.sh check` 已跑通 exit 0。
- 各处 `sudo apt-get install`（shellcheck / python3-yaml / postgresql-client）为 Ubuntu 专属，macOS 无等价；对应脚本本体均已本地执行。
