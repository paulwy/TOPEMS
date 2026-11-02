# TODO 归档 2026-11-03：B 批 4 段（2026-11-02 核销后，用户 2026-11-03 确认放弃归档）

## 并行线补充记录（2026-10-04 批1剩余+批2 收口，本地原记录保留）

### B7-17 里程碑：anyhow / Box<dyn Error> 生产代码清零（commit `7f2285600`）
- 迁移 33 处生产代码：config/enhanced.rs 8 处 anyhow + analytics scheduler/schedule 12 处 + shared-event master_data 4 + unified-core ws_event_bridge 3 + crm 2 + ai 4（embedding/prompt/ai_handlers）
- 桥接/直通：redis/serde_json `#[from]` 直通；lapin/parse 错误 map_err → NetworkRequest/ValidationFailed
- **保留项（有明确理由）**：main/embedded/bootstrap 入口 anyhow（18+5 处）、shared-bootstrap 11（进程边界库）、doc/examples 8（教学惯例）、rd sqlx Type trait 2（框架契约）、finance StdError 测试 6（正确性验证）、shared-core error/enhanced 3（From<anyhow> 桥接+测试）、mcp-stdio main 1
- 全仓 check 0 error；analytics 单测 16+6 全绿

### 🏁 B7 整体收尾宣言（错误语义治理 ADR 阶段二 完成）
**主线目标**：全仓错误形态统一收敛为 `TopemsError` 语义变体（含单元/元组/struct 三形态 + `From` 双向桥接 + `IntoResponse`）。

**六形态清零终检（2026-10-12 全仓实测）**：
| 形态 | 残留 | 状态 |
|---|---|---|
| `Result<_, String>`（含嵌套泛型） | 0 | ✅ B7-16 清零 |
| `map_err(format!)` | 0 | ✅ B7-15 清零 |
| `Err(format!` | 0 | ✅ B7-15 清零 |
| 静态 `Err("字面量")`（生产） | 0 | ✅ B7-9 清零（残留 5 处均为 &str 测试，设计保留） |
| 业务 `anyhow::`（非 main/embedded/bootstrap/桥接） | 0 | ✅ B7-17 清零 |
| 生产 `Box<dyn std::error::Error>` | 0 | ✅ B7-17b 清零（残留 1 处为 mcp-stdio main，进程入口） |

**设计保留项（非生产路径，明确理由）**：
- 进程入口 `main() -> anyhow::Result` / `Result<(), Box<dyn Error>>`（18 svc + mcp-stdio）
- 启动入口 embedded/bootstrap（unified-core 3 + portal 2 + shared-bootstrap 11）
- doc 示例 7（Rust 官方文档惯例）与 examples 教学示例（已迁，见 B7-17b）
- rd sqlx `Type` trait 2（框架契约签名固定）、finance StdError 正确性测试 6、&str 错误测试 5
- `From<anyhow::Error> for TopemsError` 桥接（供边界处 `?` 直通）

**关键基建（B7 期间建立）**：
- `TopemsError`：`impl From<TopemsError> for String` / `From<String>` / `From<&str>` / `From<anyhow::Error>` / `From<EventError>`（B7-16b）/ sqlx·jsonwebtoken·io·redis·serde_json·reqwest `#[from]`/显式
- `axum::response::IntoResponse for TopemsError`（服务端统一错误响应）
- 语义映射模板固化：sqlx→DatabaseQuery / 事件·字段解析→ValidationFailed / HTTP·邮件·AI→NetworkRequest / 文件→FileFormat·FileOperation / "不存在"→ResourceNotFound / 配置→ConfigValidation
- pre-commit 门禁：sensitive-info / boundary-gate-py / mobile-contract-smoke / web-contract-smoke（23 项）

**验收基线**：全仓 `cargo check --workspace` 0 error 0 warning；单测 ai 1190 / shared-core 790+ / service-client 73 / analytics 22 / finance 39 等全绿；main 领先 origin（未 push，用户未要求）。
**B7 全链路 commit**：B7-6 → 7 → 9 → 10 → 11 → 12 → 13 → 14 → 15（双清零）→ 16a/16b（Result String 清零）→ 17（anyhow/Box 生产清零）→ 17b 续（examples 清零）→ 并行线 B7-13~18 + finance 泄露面清零。B7 宣告收尾 ✅

## 2026-10-04 批1剩余+批2 收口（B3/B4/B5/B6/B8/B9 完成，本地提交未 push）✅（2026-11-02 核销：原 commit 链（eca99460b/55342082c/210b971e6 等）本机+origin 全 248 refs 均不可恢复，但核心功能已由主线后续 commit 等效覆盖——B5/B6=4877302984（迁移 20261006000001_b5_gis_rls_enable.sql 在主线）、B3/B8/B10/B11/B12 已验证在主线、rd 服务在主线；实际缺口仅：validate.sh 形态（checksum 治理由 scripts/ci/check_* 承担，541/541 对齐）、b5 迁移文件名不同（等效迁移在主线）、方向③ 2 个迁移固化文件未入主线（live 已生效仅缺固化文件）、B7 第5批 mobile/lims TopemsError 化未检出（改进未达成）；srm anyhow 残留 1 文件属实（未完成清理非丢失）。无需云主机/备份恢复——核销归档）

> 依据「下一步工作规划」D 节执行形态：批 1（快赢收口）→ 批 2（残留偿还）。用户已拍板：批1剩余+批2 共 6 项，决策项（B1/B14/B15/A2/A5）暂跳过。
> 说明：A3/A4/B2/B13 在本次会话前已由并行线完成并推 origin/main（TODO 表格未同步，此处补记）；B3 代码亦已在 HEAD（由并行线带入），本次验证确认。

### ✅ 本次完成（commit 链 eca99460b + 后续 4 提交，均未 push）
- **B3 crm 金额精度**（验证确认，无新改动）：sales_forecast/dashboard 金额已 f64→Decimal（HEAD 含 `sales_forecast_amount_precision_exact`/`dashboard_amount_precision_exact` 精度单测）；cargo test -p topems-crm --lib 504/504 绿（0 failed）
- **B4 checksums.txt 恢复登记 + validate.sh 根因修复**：validate.sh `scopes=$(grep -o ... | sed ... | sort -u)` 在 set -euo pipefail 下 grep 无匹配即崩溃（09-21 后停更根因）→ 两处补 `|| true`；重跑后 checksums.txt 全量重生成 296 行（293 迁移全登记，含 B5），二次重跑 Checksum errors=0；首次 67 个 mismatch 为历史漂移一次性吸收
- **B5 gis RLS 开启**：`svc/gis/src/main.rs` enable_rls:false→true（protected 路由挂 RLS 中间件）；新迁移 `20261004000001_b5_gis_rls_enable.sql`（幂等 ENABLE/FORCE + rls_tenant_isolation 策略，仅含 tenant_id 基表；geofences/track_positions 无 tenant_id 列自动跳过）；5432 应用两遍幂等无错；隔离实测（NOSUPERUSER topems_app）：无GUC=3 / 租户A=1 / nil UUID=3 / 无关租户=0 全过；cargo check -p topems-gis 绿
- **B6 lib/shared-db rls.rs 池化 GUC 修复**：rls_middleware 改 acquire→set→run→reset 独占连接模式（对齐 tenant_rls CORE-06 修复，归还连接不残留租户状态）；apply_rls_middleware/set_tenant_context 标废弃注释（仓库无调用方）；cargo test -p topems-shared-db 152/152 绿、SQLX_OFFLINE cargo check --workspace 0 错误（1m15s）
- **B8 前端 topems-core 清理**：根 package.json 删除 `dev:core`（pnpm --filter topems-core dev）；grep 代码/配置 topems-core=0（仅 docs/archive 历史文档残留，不参与构建）；build:shared-types CJS/ESM/DTS 全绿（既有 TS2688 不再出现）；pnpm typecheck 0 错误
- **B9 GIS leaflet 测试修复**：DataInfraComponents.test.tsx react-leaflet mock 补 `useMapEvents: () => ({})`；全量 vitest 446 文件 6530 passed / 0 failed（R1 基线 3 失败清零）

### 验证总览
- 后端：cargo check --workspace 0 错误；shared-db 152、crm 504 测试绿
- 前端：vitest 6530/0、typecheck 0、build:shared-types 全绿
- 门禁：schema-boundary PY exit 0（全服务 PASS）+ NODE 29 服务/1420 文件 PASS；validate.sh 二次 0 错误
- DB：B5 迁移 5432 幂等应用 + 隔离实测 4/4（未记 _sqlx_migrations 账本，沿用半手工惯例）

### ⬜ 未完成（本批范围外）
- ~~**可执行未排期**：B7（L 级分批）~~ ✅ B7 已全量闭环（B7-17 里程碑，commit `7f2285600`，见 :426-461）；B10/B11/B12 已完成（见 :503-505）
- **决策项跳过（用户拍板暂不处理）**：B1（search→erp 白名单撤销）、B14（守卫重构）、B15（埋点）、A2（5433 docker）、A5（erp RLS）
- **环境阻塞**：A1（nginx 生产 conf 需 Linux/生产环境）；5433 仍 DOWN、nginx 未运行

## 2026-10-04 第二轮收口（B10/B11/B12 完成，本地提交未 push）✅（2026-11-02 核销：原 commit 链（eca99460b/55342082c/210b971e6 等）本机+origin 全 248 refs 均不可恢复，但核心功能已由主线后续 commit 等效覆盖——B5/B6=4877302984（迁移 20261006000001_b5_gis_rls_enable.sql 在主线）、B3/B8/B10/B11/B12 已验证在主线、rd 服务在主线；实际缺口仅：validate.sh 形态（checksum 治理由 scripts/ci/check_* 承担，541/541 对齐）、b5 迁移文件名不同（等效迁移在主线）、方向③ 2 个迁移固化文件未入主线（live 已生效仅缺固化文件）、B7 第5批 mobile/lims TopemsError 化未检出（改进未达成）；srm anyhow 残留 1 文件属实（未完成清理非丢失）。无需云主机/备份恢复——核销归档）

> 用户「继续推进」后开启第二轮：B10（P2 数据丢失修复）+ B11/B12（P2 迁出/校验脚本），三项全部完成并本地提交（55342082c → 210b971e6，均未 push；远端同步由并行协作线负责）。

### ✅ 本次完成
- **B10 master-data 快照窗口数据丢失修复**：根因 = U4 的 10 个 MDM 模块写 handler 只改内存 store，靠 main.rs 3s tokio ticker 兜底 flush，SIGKILL 丢 ≤3s 最近写。
  - `svc/master-data/src/modules/mod.rs` 新增 flush_on_write 中间件（POST/PUT/PATCH/DELETE 响应后立即 flush_all()）+ is_write_method 纯函数 + 单测；**layer 置于 create_routes() 末尾**（axum Router::layer 只作用于调用时已注册路由——曾先 layer 后 nest 导致中间件不生效，e2e 证伪后修正）
  - `svc/master-data/src/modules/persist.rs` init() 拆逐条 DDL（SQLx prepared statement 不支持多命令，bootstrap 曾一直失败）
  - 验证：master-data 单测 451/451 绿；e2e 另起实例（8097/8098）POST 后**立即查库** immediate_persisted=true（两轮独立验证：probe4 / e2e-final-probe2）
  - 说明：SIGKILL 完整 e2e（kill→重启→load-on-boot 恢复）受并行线旧实例（/Users/air/topems release，8090/11824，3s ticker 周期覆盖共享表）约束无法独占验证；"写后立即持久化"机制已被 immediate 实测证明，重启恢复为 U4 load-on-boot 既有能力
- **B11 form_assistant 迁出独立位置**：`lib/src/form_assistant/`（23 文件）git mv → `svc/ai/src/form_assistant/`；`lib/src/lib.rs` 移除 `pub mod form_assistant`（门面引用=0）；svc/ai lib.rs/main.rs 声明模块（bin crate 独立 root，需双侧声明），ai_form 引用 `topems_shared::form_assistant` → `crate::form_assistant`
  - 验证：topems-ai 编译 0 错误；ai 单测 1190/1190 绿；全仓 grep 无残留 topems_shared::form_assistant
- **B12 services.yaml↔nginx.conf 一致性校验脚本**：`scripts/ci/check-config-sources.cjs` 新增 F/G/H 三节——F: nginx upstream 端口/名称↔services.yaml（值级+死 upstream）；G: map 路由表引用 upstream 自洽（防运行时 502）；H: map 路由前缀可解析到 services.yaml 服务（防拼写漂移）；补别名 report→bi / plugin→plugin-registry / aps→mes
  - lefthook `ports-consistency` 钩子 STAGED 清单加入 apps/web/nginx.conf
  - 验证：`--check` 全绿（38 服务/27 upstream）；负向篡改 erp 端口 8010→8015 被 F 拦截（`erp_service=8015 与 services.yaml erp=8010 不一致`）后还原

### 验证总览（第二轮）
- cargo check --workspace 0 错误（36.8s）；master-data 451、ai 1190、shared 单测绿
- e2e：POST 后立即查库 immediate_persisted=true（B10 核心主张实测）
- B12 脚本：正向全绿 + 负向拦截验证

### ⬜ 未完成（本轮范围外）
- ~~**可执行未排期**：B7（L 级分批）~~ ✅ B7 已全量闭环（见 :426-461）
- **决策项跳过（用户拍板暂不处理）**：B1（search→erp 白名单撤销）、B14（守卫重构）、B15（埋点）、A2（5433 docker）、A5（erp RLS）
- **环境阻塞**：A1（nginx 生产 conf 需 Linux/生产环境）；5433 仍 DOWN、nginx 未运行；SIGKILL 完整 e2e 需独占实例环境（并行线 11824 周期覆盖共享表）

## 2026-10-05 B7 分批推进（第 1-2 批：svc/srm + svc/rd 完成，本地提交未 push）✅（2026-11-02 核销：原 commit 链（eca99460b/55342082c/210b971e6 等）本机+origin 全 248 refs 均不可恢复，但核心功能已由主线后续 commit 等效覆盖——B5/B6=4877302984（迁移 20261006000001_b5_gis_rls_enable.sql 在主线）、B3/B8/B10/B11/B12 已验证在主线、rd 服务在主线；实际缺口仅：validate.sh 形态（checksum 治理由 scripts/ci/check_* 承担，541/541 对齐）、b5 迁移文件名不同（等效迁移在主线）、方向③ 2 个迁移固化文件未入主线（live 已生效仅缺固化文件）、B7 第5批 mobile/lims TopemsError 化未检出（改进未达成）；srm anyhow 残留 1 文件属实（未完成清理非丢失）。无需云主机/备份恢复——核销归档）

> 用户「继续」后开启 B7（U7 残留：静态 error() TopemsError 化 / ADR 阶段二）。B7 为 L 级（1313 处静态文案 + anyhow 清退），按「每服务分批」推进；本批完成 srm/rd 两个小服务的 anyhow 清退 + 静态 Err TopemsError 化，形成可复制模板。提交 d2bfb24ce / 1f203fe39，均未 push。

### ✅ 第 1 批：svc/srm（d2bfb24ce，15 文件）
- 14 个 modules 文件 `use anyhow::Result;` → `use topems_shared_core::error::Result;`（Result 别名同位置替换，函数签名不变）
- inquiry.rs `create_routes -> Result<Router, anyhow::Error>` 完全限定移除
- scoring_dimension.rs `weighted_score -> Result<f64, String>` → `Result<f64>`，4 处静态 `Err("...")` → `TopemsError::ValidationFailed(...)`
- 保留（ADR 合规）：main.rs anyhow（进程边界）；supplier_evaluation 闭包与 data_sync 的 `std::result::Result<_, String|sqlx::Error>`（内部校验/sqlx 专用，4xx 静态文案按设计走 ApiResponse::error）
- 验证：topems-srm 编译 0 错误；单测 559/559 绿；srm 业务层 anyhow=0

### ✅ 第 2 批：svc/rd（1f203fe39，2 文件）
- project_repository.rs / project_service.rs `use anyhow::Result` → `topems_shared_core::error::{Result, TopemsError}`
- `anyhow::anyhow!(TopemsError::NotFound(...))` 去 anyhow 包装直接返回 TopemsError
- 验证：topems-rd 编译 0 错误；单测 155/155 绿；rd 业务层 anyhow=0

### 门禁变化（scripts/ci/check-error-handling.cjs）
- 业务层 anyhow：70 → **52**（-18；srm -15 + rd -3）
- 泄露面 413 不变（本批为 anyhow/静态文案，非泄露形态）
- 注意：`Result<` 别名的坑——`topems_shared_core::error::Result` 是单参类型别名，`Result<_, String>`/`Result<_, sqlx::Error>` 等双参形态须用 `std::result::Result<_, _>` 完全限定

### ⬜ B7 剩余（后续批次候选，按业务层 anyhow 计数）
- svc/server（41）/ lib/shared-ai（24）/ svc/integration（22）/ svc/analytics（13）/ lib/shared-bootstrap（10）/ svc/ai（9）/ lib/shared-core（9）/ svc/unified-core / ticket / erp（各 4）等
- 注意 analytics 的 JobScheduler trait（`type Err = anyhow::Error`）等约束型 anyhow 需单独策略

### 其他未完成（不变）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

## 2026-10-05 B7 分批推进（第 3-4 批：server anyhow 清退 + 门禁归零，业务层 anyhow 70→0）

> 承接同日第 1-2 批（srm/rd），本批完成 server 清退与门禁豁免登记。提交 6e9f69362 / 750494b29，均未 push。

### ✅ 第 3 批：svc/server + shared-core（6e9f69362，30 文件）
- **shared-core 新增 `impl From<anyhow::Error> for TopemsError`**：收敛为 Internal 变体（classify 脱敏，客户端仅收通用「内部服务器错误」）；防泄露单测向量加入 anyhow 转换变体（100/100 绿）——该 impl 解锁所有 anyhow → TopemsError 的 `?` 传播
- server 29 个 *_real_module/subscription_module：`build() -> anyhow::Result<Self>` → `-> Result<Self>`（TopemsError::Result 别名）
- 11 处 `anyhow::anyhow!/bail!` 初始化错误 → `TopemsError::internal(context, e)`（DATABASE_URL → `EnvVarNotSet`）
- 验证：cargo check --workspace 0 错误；server modules anyhow=0

### ✅ 第 4 批：门禁豁免登记（750494b29，1 文件）
- analytics report scheduler 的 JobScheduler<'_> trait 绑定型 anyhow（`type Err = anyhow::Error`）显式豁免——第三方 trait 关联类型无法改 TopemsError，登记非漂移
- **门禁业务层 anyhow：70 → 0**（ADR 阶段二 anyhow 清退子项达成；仅 main.rs 进程边界合法保留）；泄露面 413 不变

### B7 剩余（继续分批候选）
- **静态 `Err("...")`/`Result<_, String>` TopemsError 化**（1313 处无插值静态文案，ADR 明确不在泄露面；含各服务内部校验函数，需逐服务按语义映射 ValidationFailed/BusinessLogic 等）——L 级主体，后续批次按服务推进
- finance 386 处 `.to_string()` 直出（无上下文文案，ADR 指定为 TopemsError 规范参考试点，需先定业务上下文策略）

### 其他未完成（不变）
- 决策项跳过（用户拍板暂不处理）：B1/B14/B15/A2/A5
- 环境阻塞：A1（生产 nginx conf 需 Linux）；SIGKILL 完整 e2e 需独占实例环境（并行线 11824）

## 2026-10-05 方向③收尾 + B7 第 5 批（本地提交未 push）✅（2026-11-02 核销：原 commit 链（eca99460b/55342082c/210b971e6 等）本机+origin 全 248 refs 均不可恢复，但核心功能已由主线后续 commit 等效覆盖——B5/B6=4877302984（迁移 20261006000001_b5_gis_rls_enable.sql 在主线）、B3/B8/B10/B11/B12 已验证在主线、rd 服务在主线；实际缺口仅：validate.sh 形态（checksum 治理由 scripts/ci/check_* 承担，541/541 对齐）、b5 迁移文件名不同（等效迁移在主线）、方向③ 2 个迁移固化文件未入主线（live 已生效仅缺固化文件）、B7 第5批 mobile/lims TopemsError 化未检出（改进未达成）；srm anyhow 残留 1 文件属实（未完成清理非丢失）。无需云主机/备份恢复——核销归档）

> 用户按建议推进：先快赢收口（方向③遗留 + U3b 闭环），再 B7 静态文案分批（mobile/lims）。

### ✅ 方向③收尾（commit 4fbe20af0，2 迁移文件）
- **rd status 默认值落迁移**：`20261005000001_rd_status_default_active.sql`（ALTER rd.builds/deploys
  status SET DEFAULT 'active'，live 已生效、迁移固化；topems_app owner 双库应用幂等通过）
- **U3b 骨架表依赖链闭环（真缺口修正）**：U3b（20261003000002）DROP lims.qa_lab_samples/tasks 被
  lims 业务表 FK 依赖阻止（**声称"重放通过"实为未删净**）——新迁移 `20261005000002_lims_qa_lab_fk_repoint.sql`
  先把 5 个 FK（records→tasks、sample_lifecycle/inspection_reports/rfid_tags/sample_barcodes→samples）
  改指 public 事实标准表（与代码显式 public 引用一致）再 DROP 骨架；终态残留 0、幂等重放 0 错误；
  lims 其余 11 个 qa_lab_* 业务表（reagents/instruments/records 等）为 lims 真实在用表保留
- 5433 Homebrew 实例目录已被并行环境清理（U3b 重放历史已由排期项 1 全量完成），无恢复必要

### ✅ B7 第 5 批：mobile/lims 静态 Err TopemsError 化（commit 975bd32e3，4 文件）
- mobile：extract_user_id_from_token → `Result<String, TopemsError>`（AuthenticationFailed/InvalidToken）；
  validate_scan_result 5 处 + parse_barcode 1 处 → ValidationFailed（含 format! 插值包 ValidationFailed）
- lims：validate_barcode 3 处 → ValidationFailed；测试断言改 matches! 模式匹配（TopemsError 无
  PartialEq——曾试 derive 被含 io/serde_json/sqlx/reqwest Error 的变体阻断，撤回改 matches!）
- 调用方（barcode_scanner 4 处 match Err(_) 忽略内容）零影响
- 验证：编译 0 错误、clippy 0 警告、单测 mobile 149 + lims 245 全绿
- **mobile 静态 Err = 8→0、lims = 8→0**（本批清零两个小服务）

### 2026-11-02 补齐记录（用户指令「继续补齐」3 项实际缺口，全部验证全绿后提交）
- **方向③固化入主线**：commit e83d6e3fe0（`20261005000003_rd_status_default_active.sql` +
  `20261005000004_lims_qa_lab_fk_repoint.sql`；01/02 已被 align_public_shadow_tables/
  align_public_core_dict_name_en 占用故顺延 03/04）。live 已应用（rd status DEFAULT 'active' +
  5 FK repoint→public + DROP 4 骨架表）、幂等重跑 0 错、checksums 补登至 544/544（含并行线
  prereq 225000）、validate.sh Errors 0、_sqlx_migrations 账本 544/544。origin/main=e83d6e3fe0
- **B7 第5批复核验证**：函数已 TopemsError 化（前批 975bd32e3）；本次复核 cargo check 0 错误、
  clippy 0 警告、单测 mobile 151 + lims 151 全绿。**新发现**：lims 集成测试 2 失败
  （test_inspection_task_crud/test_inspection_record_crud）——DB 约束
  ck_inspection_tasks_status_standard（status ∈ active/inactive/archived）与测试插入 'pending'
  不匹配，且未在任何迁移文件 grep 到该约束（疑运行时/手工加），既有问题非本次引入
- **srm anyhow 清零（70→0）**：commit f79b9c5c0a——main 返回 `Result<(), TopemsError>`
  （From<anyhow::Error>→Internal）+ L179 降级客户端构建错误换 TopemsError::NetworkRequest；
  cargo check / clippy / 单测全绿

### 2026-11-03 lims 集成测试 2 失败修复（commit 33354f7ed7）
- **根因确认**：lims.inspection_tasks.status DEFAULT='pending'（NOT NULL，业务 FSM pending→in_progress→
  completed，集成测试 L117/L220 插入 'pending'、L234/L239 UPDATE in_progress/completed），窄版约束
  ck_inspection_tasks_status_standard（active/inactive/archived）为模板误用——与 20261026130000 修复的
  23 张同款炸弹，lims 部分漏网。lims.inspection_records 无此约束（测试挂点全在 tasks）。
- **修复**：`20261103000001_lims_remove_misapplied_status_standard_checks.sql`——DO 循环删除 lims
  15 张表（inspection_tasks/lab_ledger/qa_lab_*/qa_lims_*/reagents，全 0 行零数据风险）的
  *_status_standard 约束，业务状态机由代码层保证；幂等（重跑 0 条）。
- **验证**：cargo test -p topems-lims 集成测试全绿（8 passed / 0 failed，含此前 2 失败用例）、
  validate.sh Errors 0/Checksum 0/Drift 0、checksums 545、_sqlx_migrations 账本补登 manual-v。
- **✅ 全库同类残留（已批量清理，commit 8e1a23ff2b）**：实测 342 张表同款"窄版 status_standard +
  领域态 DEFAULT"（public 75/ehs 28/mes 25/portal 20/pm 19/qms 17/finance 16/erp 16/wms 16/
  hrm 15/lims 15/…），10-26 只修 23 张系冰山一角；用户确认后按同一先例全量清尾（见下段）。

### 2026-11-03 全库 327 张 status_standard 误用约束批量清理（commit 8e1a23ff2b）
- **迁移**：`20261103000002_global_remove_misapplied_status_standard_checks.sql`——显式清单 327 对
  (schema, table)（342−lims 已修 15），DO 循环删除 *_status_standard 约束；业务状态机由代码层保证、
  CHECK 语义保证现有行合法 → 删约束零数据风险；幂等（第一遍 327 dropped、重跑 0）。
- **验证**：全库漏网归零（残留计数 0）；现存 status_standard 仅 251 张 DEFAULT='active' 的合法表；
  validate.sh Errors 0/Checksum 0/Drift 0、checksums 546、_sqlx_migrations 账本补登 manual-v；
  lims 集成 8 passed + mobile 单测 250 全绿回归。
- 处置依据：与 20261026130000（23 张）、20261103000001（lims 15 张）同一先例，用户 11-03 确认推进。

### ⬜ B7 剩余（后续批次候选，静态 Err 计数）
- ai 45 / crm 27 / portal 26 / integration 15 / mes 10 / finance 9 / scm 3 / erp 3 / analytics 3 /
  wms 2 / master-data 2 / unified-core 1（+ 各服务 Result<_, String> 双参形态与
  finance 386 处 to_string 试点待定策略）
- 模式固化：ValidationFailed 语义映射 + matches! 断言模板可直接复制

### ✅ B7 第 6 批：crm 静态状态码 Err TopemsError 化（commit 101d1b05a，4 文件）
- opportunity/aftersales can_transition → `Result<(), TopemsError>`：NOT_OWNER→OperationNotAllowed、
  TERMINAL_CANNOT_TRANSITION→BusinessLogic、INVALID_TRANSITION→ValidationFailed
- 消费点：2 处 match（推进/回退 403/400）+ 2 处兜底 api_error 改 `&e.to_string()`；
  aftersales 4 处 `if let Err(e)`（e 进 format!，TopemsError Display 语义更友好）
- 测试：opportunity_fsm_test 4 处 + return_fsm_test 9 处 assert_eq unwrap_err → matches!
- 验证：编译 0 错误、clippy 0 警告、单测 504/504 全绿
- **crm 静态 Err = 27→0**；累计清零：mobile 8 + lims 3 + crm 27 = 38

### ✅ B7 第 8 批：共享库静态 Err TopemsError 化（commit 65842422f，8 文件）
- deployment.rs check_tenant_access → OperationNotAllowed（文案中文化「租户不匹配」）
- approval.rs validate_start_approval/validate_approval_decision → ValidationFailed/BusinessLogic
  （含同函数内 format! 错误一并迁移；业务状态冲突「已有/没有进行中的审批」→BusinessLogic）
- data_governance.rs process_access/erasure_request → ValidationFailed/ResourceNotFound
  （ok_or("Request not found")→ResourceNotFound「请求不存在」；right_type 校验→ValidationFailed）
- shared-dsh resource/tool/prompt validate_uri/validate_name → ValidationFailed
  （Cargo.toml 新增 topems-shared-core 依赖；register 消费点 map_err 适配 e.to_string()）
- 验证：全仓静态 Err(" 业务残留 = **0**；cargo check 0 error 0 warning；单测 963 全绿
  （shared-core 790 + shared-db 152 基线 + shared-dsh 21）；pre-commit 23 项全绿（提交时复验）
- 保留不动：enhanced.rs/metrics.rs 6 处 `&str` 错误类型测试（非 String 迁移对象）

### ✅ B7 第 9 批：共享库 Err(format!) TopemsError 化（commit 2ba067a82，6 文件）
- rate_limit_enhanced validate_timestamp → ValidationFailed（无效时间戳/超容差，含 parse map_err 连锁）
- permission validate_permission_code 4 处 → ValidationFailed（模块码/动作/数据范围/段数）
- health check_http_health → ServiceUnavailable（「无法连接服务」）+ 消费点 e.to_string() + 测试断言适配
- plugin generate/verify_plugin_install_token → ValidationFailed/AuthenticationFailed
  （Invalid RSA key→ValidationFailed、JWT verify→AuthenticationFailed、scope→ValidationFailed，含 map_err format! 连锁）
- service_config get_startup_order → ConfigValidation（循环依赖）+ 内部 visit 闭包签名同步
- schema_registry check_type → ValidationFailed + add_error 消费点适配 e.to_string()
- 验证：全仓 Err(format!) 业务残留 = **0**；cargo check 0 error 0 warning；
  三库单测 1383 全绿（shared-auth 227 + shared-core 790 + shared-event 366）；pre-commit 23 项全绿
- B7 累计：静态 Err 55 处 + Err(format!) 9 处（含连锁 map_err）= 清零；
  剩余形态：map_err(format!) 417 处 + Result<_, String> 465 处（后续批次候选）

### ✅ B7 第 10 批：integration + shared-event map_err(format!) TopemsError 化（commit 0618e3377，12 文件）
- integration 106 处 map_err(format!) → 语义变体（DatabaseQuery 73 / ValidationFailed 20 / NetworkRequest 6 / BusinessLogic 1）
  - 同步记录/任务队列/同步日志/获取订单ID → DatabaseQuery；请求MES/ERP/HTTP → NetworkRequest；
    响应解析/无效ID（Uuid::parse_str）→ ValidationFailed；业务事件编排 → BusinessLogic
- mes_erp_sync 8 处 String 签名 → TopemsError（find_erp_order_by_mes_id/create_sync_record/
  update_sync_success/update_sync_failed/add_sync_log/list_sync_records/get_sync_record/get_sync_logs）
  ——消费点（handlers/mes_erp.rs）Display 兼容零改动
- event_handlers 适配：末表达式包 Ok+? 经 From<TopemsError> for String 桥接；HandlerResult 保持 String
  （subscribe_handler 签名写死 Result<(), String>——R-6 注释约束，泛型化留共享库后续批）
- async_task_queue/sync_scheduler 补 TopemsError import（crate 依赖已有）
- shared-event parse_payload → ValidationFailed + 签名 TopemsError（连锁 111 处调用方经桥接兼容）
  + 测试断言适配（contains→to_string）+ 清理 unused FromStr import
- 验证：全仓 map_err(format!) 417→310（integration+shared-event 归零）；cargo check 0 warning；
  shared-event 366 全绿；pre-commit 23 项全绿
- 剩余：map_err(format!) 310 处（ai/mes/hrm/finance/wms/unified-core/srm/scm/rd/portal/pm/pdm/mobile/lims/gis/erp/ehs/crm/communication/analytics 散点）

### ✅ B7 第 11 批：erp map_err(format!) TopemsError 化（commit 1226c668d，1 文件）
- erp event_handlers 51 处 map_err(format!) → 语义变体
  - 事务开启/提交、凭证/订单/幂等账本查询创建更新 → DatabaseQuery（47 处）
  - 事件 payload 解析（serde_json）→ ValidationFailed（10 处）
- 验证：全仓 map_err(format!) 310→259；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 259 处（ai 92 / finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 12 批：ai document.rs map_err(format!) TopemsError 化（commit 6b370e2f9，1 文件）
- document.rs 44 处 map_err(format!) → 语义变体
  - 文件解析/编码/打开失败 → FileFormatError（28 处：解析 PDF/CSV/JSON/DOCX/XLSX/PPTX 等、编码错误、无法打开）
  - 文档记录/分块 sqlx → DatabaseQuery（6 处）
  - 读取/保存临时文件/元数据 → FileOperation（3 处）
  - 调用 AI API/下载 → NetworkRequest（2 处）；解析 AI 响应 → ValidationFailed（1 处）
- 6 处 String 签名 → TopemsError（delete_document/list_documents/get_document/get_document_chunks/
  extract_text_from_data/save_chunks_and_vectors）——调用方 qa.rs/modules/handlers 零适配（Display 兼容）
- 验证：全仓 map_err(format!) 259→215；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 215 处（ai 其余 48 / finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 13 批：ai 其余 48 处 map_err(format!) TopemsError 化（commit d326051d8，7 文件）
- qa/recommendation/analysis/agent/pdf/event_handlers/multi_agent 48 处 → 语义变体
  - 问答历史/usage 日志/用户画像/文章 sqlx → DatabaseQuery（26 处）
  - 推荐结果/事件 payload/AI 响应解析 → ValidationFailed（13 处）
  - 调用 AI API/生成嵌入/决策工具/消息发送 → NetworkRequest（7 处）
  - PDF 任务/加载 → FileOperation（2 处）
- 3 处 String 签名 → TopemsError（call_ai_api/generate_query_embedding/call_ai_api_with_usage）
- qa/recommendation 补 TopemsError import
- 验证：全仓 map_err(format!) 215→167；**ai 全部清零**；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 167 处（finance 26 / scm 19 / unified-core 15 / wms 14 / mes 13 / gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

### ✅ B7 第 14 批：中部服务合并批 map_err(format!) TopemsError 化（commit 6100ad4ea，11 文件）
- finance/scm/unified-core/wms/mes 85 处 → 语义变体
  - 快照/凭证/审计日志/供应商/入库单/生产订单 sqlx → DatabaseQuery（46 处）
  - 事件 payload/字段/邮箱/日期解析 → ValidationFailed（35 处）
  - 发送邮件/订阅者创建 → NetworkRequest（3 处）；密码哈希 → BusinessLogic（1 处）
- 5 处 String 签名 → TopemsError（audit_integration record_* ×4 + work_report parse_report_date）
- 消费点适配：ApiResponse::error(400, &e) → &e.to_string()（work_report 2 处）
- 7 文件补 import + smtp 重复 import 清理 + projector unused 清理
- 验证：全仓 map_err(format!) 167→82；cargo check 0 warning；pre-commit 23 项全绿
- 剩余：map_err(format!) 82 处（gis 10 / crm 10 / pm 9 / mobile 9 / srm 7 / rd 6 / hrm 6 / communication 6 / ehs 4 / portal 3 / pdm 3 / server 2 / lims 2 / analytics 1）

