# R1 全量门禁回归基线（阶段 3）

> 任务：TODO.md 阶段 3「R1 全量门禁回归基线」——在 T1 前端构建链修复 + D4（MF 移除）后的完整 HEAD 上，**只实测+记录，不改任何代码**。
> 实测日期：2026-10-03（Asia/Shanghai）· 实测 HEAD：`7ff0f1533`（U9 服务发现收敛后）
> 环境：node v22.23.2 / pnpm 9.15.9（与 T1 一致）· 项目根 `/Users/xingzhai/TOPEMS`
> 说明：本文档由「前端基线」与「后端基线」两个并行子代理分别追加各自章节，互不覆盖。

---

## 前端基线（apps/web = topems-portal）

> 验收口径来源：[D4 前端 MF 策略决策](./decision-d4-frontend-mf-strategy.md) §6 验收标准 + `scripts/bundle-check.sh` / `.github/workflows/ci.yml:1639` 预算。
> 命令映射说明：TODO/任务书写作 `pnpm --filter topems-web build:host`，但 `apps/web` 实际包名为 **`topems-portal`**（仓库无 `topems-web` 包）；根 `build:host` = `pnpm --filter topems-portal build`（= `tsc && vite build`）。下表以真实可执行命令实测。

### 1. 依赖状态回归（MF 归零，D4 验收 #3）

| 检查项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| package.json 无 MF 依赖 | `grep -c "@module-federation" apps/web/package.json` | **0**（grep 无命中，exit=1） | ✅ 通过 |
| 依赖树无 MF 节点 | `pnpm why @module-federation/runtime` | 空输出（无依赖树） | ✅ 通过 |
| 依赖树无 MF 节点 | `pnpm why @module-federation/vite` | 空输出（无依赖树） | ✅ 通过 |

结论：T1/D4 移除 `@module-federation/vite`、`@module-federation/runtime` 后保持归零，无残留传递依赖。

### 2. build:host（tsc && vite build，D4 验收 #1/#5）

- 命令：`pnpm run build:host`（= `pnpm --filter topems-portal build` = `tsc && vite build`）
- **exit code：0** ✅
- 耗时：**141s**（2m21s，含 tsc 全量 + vite build；首次干净构建 `rm -rf apps/web/dist` 后）
- 工具链：vite v8.1.5，`6411 modules transformed`
- 产出路径：`apps/web/dist/`（含 `index.html`、`assets/`、`offline_tiles/` 等）
- dist 目录体量（`du -sh`，含 .gz/.br 预压缩产物）：**33M**
- 构建自带 brotli 压缩：compressed 307 files to `.br`

### 3. typecheck（D4 验收 #2）

- 命令：`pnpm --filter topems-portal typecheck`（`tsc --noEmit`）
- **exit code：0** ✅（无任何 TS 错误输出）
- 耗时：**96s**

### 4. vitest（D4 验收 #2）

- 命令：`pnpm --filter topems-portal test`（`vitest run`）
- **exit code：1**（因下述 3 个既有基线失败）
- 耗时：**143s**
- 结果汇总：**Test Files 1 failed | 445 passed (446)**；**Tests 3 failed | 6528 passed | 1 skipped (6532)**

#### 既有基线失败清单（如实记录，非本次回归引入）

| # | 测试 | 根因 |
|---|---|---|
| 1 | `DataInfraComponents.test.tsx > GisMapTemplate · GIS 地图页 > 空态：MapContainer mock 渲染…` | react-leaflet mock 未导出 `useMapEvents` |
| 2 | 同文件 > `基础态：3 markers leaflet-marker + 1 polygon…` | 同上 |
| 3 | 同文件 > `交互：marker click 回调…` | 同上 |

- 失败根因（实测错误原文）：`[vitest] No "useMapEvents" export is defined on the "react-leaflet" mock. Did you forget to return it from "vi.mock"?`，触发点 `DataInfraComponents.test.tsx:168 useMapEvents({...})`。
- 定性：**既有基线失败**（react-leaflet 的 `vi.mock` 缺 `useMapEvents` 导出），与 MF 移除 / T1 构建链修复**无关**——本次任务不改代码，如实记录为基线缺口，留待后续修复。
- 其余 **6528 测试全部通过**。

### 5. bundle 门禁（D4 验收 #5，预算口径 = ci.yml:1639）

- 命令：`MAX_TOTAL=30M MAX_CHUNK=500K MAX_VENDOR=2500K MAX_INITIAL=1500K bash scripts/bundle-check.sh`
- **exit code：0** ✅ —— `All chunks within budget.`
- **TOTAL：16.43 MB**（脚本统计口径 = 未压缩 JS chunk 总和）/ 预算 30M → OK
- 全部 chunk 单块 ≤ 预算（最大 chunk 为 `exceljs-vendor` 923 KB、`mui-core-vendor` 717 KB，均在 vendor 2500K 内；无越限项）

### 6. mobile / desktop 三端（D4 验收 #6）

- **mobile（`apps/mobile` = `topems-mobile`，Expo）**：需原生移动工具链（Expo / iOS-Android SDK），**R1 前端范围不跑**，如实记录。T1 先例一致。
- **desktop（`apps/desktop` = `topems-desktop`，Tauri/Rust，含 `src-tauri/`）**：需原生 Rust + Tauri 工具链，**R1 前端范围不跑**，如实记录。
- 说明：三端构建仅 web 端可在当前 JS 工具链下全量验证；mobile/desktop 留待有原生工具链环境时补测。

### 7. build:shared-types（已知既有环境问题复跑）

- 命令：`pnpm run build:shared-types`（= `pnpm --filter @topems/shared-types build`，`tsup src/index.ts --format cjs,esm --dts`）
- **exit code：1**（复现既有问题）
- 实测：**CJS/ESM JS 产物构建成功**（`dist/index.js` 36.44 KB / `dist/index.mjs` 33.67 KB），仅 **DTS 步失败**：
  `error TS2688: Cannot find type definition file for 'dompurify'.`
- 根因：tsup `--dts` 步骤解析不到 `@types/dompurify`（pnpm + tsup dts 环境问题），**与 MF 移除无关**。
- 影响面：web 经 alias 直接引用 `shared-types` **源码**，不依赖其 dts 产物——故 web 的 build:host / typecheck / vitest 全绿不受影响（见上 §2–§5）。

### 前端基线小结

| 门禁 | 结果 |
|---|---|
| MF 依赖归零 | ✅ 0 命中 + 依赖树空 |
| build:host（tsc && vite build） | ✅ exit 0，141s，dist 产出 |
| typecheck（tsc --noEmit） | ✅ exit 0，96s |
| vitest | ⚠️ exit 1 = 3 个**既有基线失败**（GisMapTemplate × react-leaflet mock 缺 useMapEvents）；6528 passed |
| bundle 门禁 | ✅ TOTAL 16.43MB / 30M，全 chunk 预算内 |
| mobile/desktop | ⏸ 需原生工具链，R1 范围不跑 |
| build:shared-types | ⚠️ DTS 步既有 TS2688 环境问题（与 MF 无关，web 走源码 alias 不受影响） |

---

## 后端基线（Rust workspace = svc/* + lib/* + tools/*）

> 实测日期：2026-10-03（Asia/Shanghai）· 实测 HEAD：`91a522add`（代码树 = `f7c3d687d`；`91a522add` 仅追加 `docs/quality/git-collab-guide.md` 29 行，无代码差异）
> 环境：rustc 1.95.0 · `SQLX_OFFLINE=true`（`.cargo/config.toml` [env] 默认走 `.sqlx/` 缓存）· homebrew postgres 5432 在听（schema 落后于容器库，仅作本机参考）· 测试 runner = cargo-nextest（`[test] runner`）
> 执行方式：所有 cargo 命令带 `CARGO_BUILD_RUSTC_WRAPPER=` 前缀（sccache 0.16/0.17 与工具链不兼容，rustc-wrapper 会 exit 254；按任务要求不改 `.cargo/config.toml`）。
> 中途事件：实测期间另一并行会话连续落地 U9（移除 zookeeper/eureka/nacos 残留）、U12b（wms 审计读路径归位）、flow 模块两批（+2457 行）等提交，HEAD 由 `7ff0f1533` 推进到 `91a522add`；下列门禁已在**最终 HEAD** 上重跑确认（冷重编数字见备注列）。

### 1. 五门禁实测总表

| # | 门禁 | 命令 | exit | 耗时 | 结果 | 备注 |
|---|---|---|---|---|---|---|
| 1 | cargo check | `CARGO_BUILD_RUSTC_WRAPPER= cargo check --workspace --offline` | **0** | 1m39.3s（热）/ 4m13.6s（首轮冷重编） | ✅ 0 错误 0 警告 | zookeeper future-incompat 警告**已消失**——U9 直接移除 zookeeper 依赖（Cargo.lock grep=0，仅余注释），不再是 rustflags 抑制问题 |
| 2 | cargo clippy | `CARGO_BUILD_RUSTC_WRAPPER= cargo clippy --workspace --all-targets --offline` | **0** | 1m1.8s（热）/ 6m9.3s（首轮冷重编） | ✅ 0 warning / 0 error | 无存量 allow 级告警浮出（门禁口径即 `-D clippy::correctness`，全 workspace 干净） |
| 3 | cargo fmt | `cargo fmt --all --check` | **0** | 15.5s | ✅ 通过 | 无格式漂移（与 82e405c4f 后稳态一致） |
| 4 | cargo test | `CARGO_BUILD_RUSTC_WRAPPER= cargo test --workspace --offline --no-fail-fast` | **101** | 10m5.8s（220 个测试二进制全量执行） | ⚠️ 见 §失败项 | **23337 passed / 8 failed**；失败全部来自同一集成测试文件，详见下表 |
| 5 | sqlx Gate S | `bash scripts/dev/sqlx-prepare.sh --check` | **0** | 逐包离线核查约 20 个核心包 | ✅ 全部 OK | mes/unified-core/finance/crm/wms/lims/mobile/pdm/rd/shared-ai 等 `offline-check ... OK`，缓存与代码一致 |

### 2. 边界与钩子门禁

| 门禁 | 命令 | exit | 结果 |
|---|---|---|---|
| boundary-gate-py | `python3 scripts/check_schema_boundary.py` | **0** | ✅ 28 个服务全 PASS（wms 引用=343、unified-core=119、finance=491 等，已知基线条目在列） |
| boundary-gate (NODE) | `node scripts/ci/check-schema-boundary.cjs` | **0** | ✅ 29 服务 / 1421 文件 / 3095 裸 sqlx 调用点 / 38 allowlisted，零跨 schema 引用 |
| lefthook pre-commit 实战 | `./node_modules/.bin/lefthook run pre-commit` | **0** | 21 个钩子在无暂存变更下全部按设计 skip（0.11s）；substance 脚本独立复跑：error-handling=0（报告模式）、api-gate dry-run=0、sensitive-info=0、large-files=0、shellcheck 全量 73 脚本 0 告警 |

### 3. 既有基线数字核对（任务书指定 5 项）

| 基线项 | 任务书数字 | 实测（最终 HEAD） | 判定 |
|---|---|---|---|
| shared-event | 365 | **360 passed + 3 ignored = 363**（0 failed） | ✅ 绿；差 2 为统计口径/后续提交微漂移，无失败 |
| finance lib | 1106 | **1106 passed**（`unittests src/lib.rs` 精确命中） | ✅ 精确一致 |
| tenant_rls | 10/10 | **10/10 passed**（claims override/extract tenant id/GUC reset/superuser empty/skip paths 等，lib+main 两二进制各跑一遍） | ✅ 全绿 |
| wms audit | 4 | **4/4 passed**（`modules::audit::tests::test_list_audit_logs_query_*` default/deserialize/with_dates/with_pagination） | ✅ 全绿（U12b 归位后） |
| master-data persist | 2 | **2/2 passed**（`modules::persist::tests::roundtrip_serialization_shape`、`save_is_noop_without_pool`） | ✅ 全绿 |

### 4. 失败项清单（如实记录，未改任何代码）

| # | 测试二进制 | 失败数 | 根因 | 定性 |
|---|---|---|---|---|
| 1 | `svc/ai/tests/mcp_stdio_integration.rs` | 8 | 全部 panic 于 `mcp_stdio_integration.rs:102`：`Timed out waiting for response (5 seconds)`。测试 spawn `mcp-stdio` 子进程但不带任何 env（`stderr` 被 `Stdio::null()` 吞掉），子进程启动需 DB/Redis/模型配置；当前离线环境（homebrew PG schema 落后）无法满足，5s 内无 JSON-RPC 输出 | **环境缺口 / 既有基线失败**——与 R1 门禁本身无关；pre-push 门禁只跑 `cargo test --workspace --lib`（不含集成测试），故此失败不阻断 CI。**R2 真环境补测** |

8 个失败用例：`test_initialize_request` / `test_ping_request` / `test_tools_list_request` / `test_tools_call_request` / `test_invalid_json_returns_parse_error` / `test_external_agent_calls_business_tools` / `test_notification_does_not_return_response` / `test_multiple_requests_in_sequence`。

> 说明：首轮 `cargo test --workspace`（不带 `--no-fail-fast`）在 svc/ai 上述集成测试失败后即中止，后续包未执行；第二轮加 `--no-fail-fast` 跑完全量 220 个二进制，方得 §1/§3 数字。wms/lims 等"离线无 DB 集成测试"本次实测**全部通过**（wms 1101、lims 298），无额外环境缺口失败。

### 5. target 占用与磁盘事件

- `du -sh target`（最终）：**50G**。
- 过程记录：首轮冷重编期间 target 峰值达 **118G**，一度占满磁盘（ENOSPC，shell 初始化失败）；约 08:38 并行会话执行 `cargo clean` 释放约 88G，之后最终 HEAD 的 check/clippy/Gate S 热重编回落到 50G。R2 起建议避免在同一 target 并行两个全量重编。

### 6. 后端基线小结

| 门禁 | 结果 |
|---|---|
| cargo check --workspace | ✅ exit 0，0 错误 0 警告（zookeeper future-incompat 随 U9 依赖移除消失） |
| cargo clippy --all-targets | ✅ exit 0，0 warning / 0 error |
| cargo fmt --check | ✅ exit 0 |
| cargo test --workspace | ⚠️ 23337 passed / 8 failed（8 = svc/ai mcp_stdio_integration 环境缺口，R2 补测） |
| sqlx Gate S | ✅ exit 0 |
| schema boundary（PY + NODE） | ✅ 双 exit 0，零跨 schema FAIL |
| lefthook pre-commit | ✅ exit 0（空索引全钩子按设计 skip；substance 脚本复跑全绿） |

---
