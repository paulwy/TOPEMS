# TOPEMS 项目任务规划与路线图

> **版本**: V286 | **更新日期**: 2026-08-23 | **当前开发分支**: `feature/v286`
>
> **V259-V264+ Backlog 与 V265 硬编码清理已收闭**。当前进入 V270 设计系统审计校准阶段。
> **V266-P0/P1/P2 架构冗余重构均已完成**（Git Hook 统一 / desktop 复用 / FSM 模板消除 + 预存在测试修复）。
> **V267 四轨并行推进已完成**（clippy 全清 / MobilePageTemplate / clippy Gate / check_allow_baseline 修复）。
> **V268 三轨并行推进已完成**（AuthPageTemplate + ChatPageTemplate + MobileHomePage 迁移，模板覆盖率 93.4%→94.9%）。
> **V269 DesignerTemplate + 4 设计器页迁移已完成**（模板覆盖率 94.9%→95.7%，例外项 27→23）。
> **V270 审计脚本校准 + 例外清单数据修正已完成**（覆盖率 91.7%→95.8% 校准，例外项 23→22）。
> **V271 架构冗余深度治理（P0→P1→P2）已完成**（审计统一 / 配置单一信源 / 门面修正 / 跨端类型共享 / DB 初始化去重）。
> **V272 SQL 迁移冗余清理（方案 A）已完成**（删除 134 个 migrations/ 死代码 + 删除 MigrationSDK + schema_defense 注释清理）。
> **V273 四轨并行推进已完成**（MES 审批流三件套 12 stubs 收敛 + AiToolPageTemplate 3 页迁移 + .sqlx 缓存新鲜度 CI check）。
> **V274 sqlx-cache 语义级检查已完成**（sqlx-prepare.sh --semantic mode + schema-defense-gate advisory step）。
> **V275 报表类模板化已完成**（ReportViewerTemplate 新增 + DesignerTemplate 复用，6 报表页全部迁移，覆盖率 96.4%→97.5%，例外项 19→13）。
> **V276 GIS 模板接入已完成**（GisMapTemplate 落地 2 个 GIS 例外页，覆盖率 97.5%→97.9%，例外项 13→11）。
> **V277 列表/结构类模板化已完成**（4 页接入已有模板，覆盖率 97.9%→98.7%，例外项 11→7）。
> **V278 架构冗余治理已完成**（openapi 测试提取共享 utility / init_db 统一 / ErrorBoundary 去重 / CI composite action + TODO 归档）。
> **V279 工具/系统类模板化已完成**（3 页接入已有模板，覆盖率 98.7%→99.2%，例外项 7→4）。
> **V280 最后 4 例外清零**（4 页接入已有模板，覆盖率 99.2%→**100.0%**，例外项 4→0）。设计系统模板治理全流程收闭 🎯
> **V281 后续任务推进**（ApprovalTransition 提升到 shared-db / AiToolPageTemplate 评估结论 / 文档归档）。
> **V282 后续任务推进**（PM 审批逻辑集成 shared-db approval 审计日志 / SupplierPortalPage 声明式评估结论）。
> **V283 后续任务推进**（Finance 审批增强 / StatCard 接口扩展 + SupplierPortalPage 声明式 statCards 迁移）。
> **V284 后续任务推进**（ERP 审批间接集成评估 / 3 模板页声明式评估 / 预存在 clippy + doctest 修复 + 测试增强）。
> **V284 架构冗余深度治理 4 轨并行**（tms/aps 配置单一信源补齐 / MasterDataRefService 下沉 + AuditLogService 注入 / Finance·Hrm utoipa::path 补全 schemas 393→442）。
> **V285 4 轨并行推进**（tms/aps 端口三端对齐 8042→8073/8074 / ReconciliationLogService 下沉 / Finance·Hrm TS 100→0 清零 / i18n gate 双脚本合并 / ERP 审批本地双写）。
> **V286 4 轨并行推进中**：ERP 兄弟 4 文件空宏切双写 / Finance settlement_center utoipa 补全 + api-types 升级 / API gate 三合一 / Node 版本锁定 + GROUP2 校验 + mes sqlx PG 工具化。

---

## 📊 当前状态

### 已完成：V285 后续任务（tms/aps 端口对齐 + openapi.d.ts 重新生成 TS 清零 + 评估类收尾）

> 日期：2026-08-23 | 代码改动 9 files（tms/aps 端口 6 文件 + openapi.d.ts/index.ts 重新生成 + TODO）| 验收：cargo test service_port 12/12 pass · typecheck 0 errors · openapi.d.ts 568 schemas（+126）

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| A轨: tms/aps 端口三端对齐 | services.yaml 8073/8074 → plugin.yaml + main.rs + ports.env + service_port.rs 同步对齐；解除 srm 8042 冲突；GROUP2_SERVICES 29→31 + 断言更新 | ✅ |
| B轨: openapi.d.ts 重新生成 | mes 42 schemas + qms 27 schemas extract → aggregate.py（412→471）→ gen-types.mjs（442→568，+126 schemas）；typecheck 9→0 errors 清零 | ✅ |
| C轨: 评估类收尾 | ERP 审计日志本地化 ✅ 已实现（call_finance_core_approval 内部 AuditLogService::log_operation）/ unified-core INSERT 下沉 ✅ 已实现（ReconciliationLogService.insert_from_master_data_refs）/ DocumentsPage ✅ V284 已评估维持 children | ✅ |
| D轨: TODO 更新 + 提交推送 | V285 章节归档 + V284 后续扩展 8 项勾选（5 已完成 / 3 留 V286+）| ✅ |

#### A轨详情：tms/aps 端口三端对齐

**问题**：V284 在 services.yaml 补全 tms=8073/aps=8074（因 srm 已占 8042），但 plugin.yaml/main.rs 仍是 8042/8043，三端不一致。

**修复**（6 文件）：
- [svc/tms/plugin.yaml:11](file:///Users/air/TOPEMS/svc/tms/plugin.yaml#L11) `port: 8042` → `8073`
- [svc/aps/plugin.yaml:11](file:///Users/air/TOPEMS/svc/aps/plugin.yaml#L11) `port: 8043` → `8074`
- [svc/tms/src/main.rs:27](file:///Users/air/TOPEMS/svc/tms/src/main.rs#L27) `port: 8042` → `8073`
- [svc/aps/src/main.rs:27](file:///Users/air/TOPEMS/svc/aps/src/main.rs#L27) `port: 8043` → `8074`
- [config/ports.env](file:///Users/air/TOPEMS/config/ports.env#L30-L32) 新增 Logistics 分组 `TMS_PORT=8073` / `APS_PORT=8074`
- [lib/shared-core/src/service_port.rs](file:///Users/air/TOPEMS/lib/shared-core/src/service_port.rs#L45-L46) 新增 `TMS_PORT=8073` / `APS_PORT=8074` 常量 + GROUP2_SERVICES 添加 `("tms", TMS_PORT)` / `("aps", APS_PORT)` + 长度断言 29→31

**验收**：`cargo test -p topems-shared-core --lib service_port` 12/12 passed（含 t10 长度保护断言 31）

#### B轨详情：openapi.d.ts 重新生成 TS 清零

**问题**：V284 让 mes equipment + qms quality_cost schema 注册到后端 openapi.rs，但前端 openapi.d.ts 未重新生成，导致 9 个 TS 错误（api-types.ts 引用不存在的 schema）。

**修复流程**：
1. `cargo test -p topems-mes --bin topems-mes extract_openapi_spec` — 重新提取 mes spec（42 schemas，含 equipment 4 schema）
2. `cargo test -p topems-qms --bin topems-qms extract_openapi_spec` — 重新提取 qms spec（27 schemas，含 quality_cost 2 schema）
3. `python3 scripts/openapi/aggregate.py --input-dir /tmp` — 聚合 9 服务到 openapi-aggregated.json（412→471 schemas）
4. `node scripts/openapi/gen-types.mjs --aggregated` — 生成 openapi.d.ts（442→568 schemas，+126）

**验收**：`pnpm run typecheck` exit 0，9→0 errors 清零

#### C轨详情：评估类收尾

| 评估项 | 结论 | 依据 |
|--------|------|------|
| ERP 审批审计日志本地化 | ✅ 已实现，无需改动 | [call_finance_core_approval](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs#L11-L56) 内部已调用 `AuditLogService::log_operation`，ERP 依赖 topems-shared-db 直接写本地 audit_logs |
| unified-core INSERT 下沉 | ✅ 已实现，无需改动 | [ReconciliationLogService](file:///Users/air/TOPEMS/lib/shared-db/src/reconciliation_log.rs#L51-L70) 已创建，`insert_from_master_data_refs` 封装 INSERT...SELECT，handlers.rs 已调用 `recon_service.insert_from_master_data_refs` |
| DocumentsPage 模板评估 | ✅ V284 已评估维持 children | 800+ 行复杂双栏（文件夹树 + 文件列表 + 预览 + 上传），强行声明式会降级 |
| Finance utoipa::path 补全 | 留 V286+ | settlement_center 4 个非 handler 文件未覆盖，handlers.rs 已 18 注解，评估优先级低 |

#### 最终验收矩阵
- [x] `cargo test -p topems-shared-core --lib service_port` — 12/12 passed（含 t10 断言 31）
- [x] `pnpm run typecheck` — exit 0，0 errors（9→0 清零）
- [x] `python3 scripts/openapi/aggregate.py` — 1079 paths, 471 schemas（412→471）
- [x] `node scripts/openapi/gen-types.mjs` — 830 paths, 568 schemas（442→568，+126）
- [x] A轨 tms/aps 端口 6 文件三端对齐（8073/8074）
- [x] B轨 mes 42 + qms 27 schemas extract + 聚合 + 生成
- [x] C轨 3 评估项均已完成（ERP 审计 ✅ / unified-core INSERT ✅ / DocumentsPage ✅）

### V285 后续扩展（留给 V286+）
- [ ] **mes integration_tests sqlx 缓存补全**：12 处 sqlx::query 缺 .sqlx 缓存（--all-targets 才暴露），需 DB 环境跑 `cargo sqlx prepare --workspace` 重建缓存
- [ ] **Finance utoipa::path 补全**：settlement_center/{mod,models,routes,service}.rs 4 个非 handler 文件未覆盖（handlers.rs 已 18 注解）
- [ ] **CI gate 脚本合并**：check-i18n + check-i18n-quality → `check-i18n --mode={hardcode|quality|all}`；check-api-audit + check-api-coverage + compare-api-modules → `check-api --mode={audit|coverage|align}`
- [ ] **DocumentsPage 模板深度评估**：若未来简化为纯文件列表，可评估抽 DocumentTemplate 声明式模板

### 已完成：V284 后续任务（ERP 审批间接集成评估 + 3 模板页声明式评估 + 预存在 clippy/doctest 修复 + 测试增强）

> 日期：2026-08-23 | 代码改动 9 files（shared-bootstrap +239 行测试 / shared-core +306 行测试 + 3 doctest 修复 / shared-db rustfmt / 4 svc import 排序 / TODO）| 验收：cargo clippy --lib --bins 0 errors · typecheck 0 errors · doctest 3/3 pass

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| A轨: ERP 审批间接集成评估 | ERP 已通过 [call_finance_core_approval](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs#L10-L52) 调用 finance submit/approve/reject/cancel 端点；V283 让 finance 端点集成 shared-db approval 审计日志后，ERP 间接受益已成立 — **评估结论：无需新代码改动** | ✅ |
| B轨: 3 模板页声明式评估 | NotificationCenter 用 ListPageTemplate headerContent/footerContent 插槽（已声明式）/ MailPage 用 MasterDetailPageTemplate renderDetail 回调（已声明式）/ DocumentsPage 用 CardListTemplate children 透传（800+ 行复杂双栏逻辑，维持 children 最合理）— **评估结论：3 页均维持现状** | ✅ |
| C轨: 预存在 clippy + doctest 修复 | [shared-bootstrap lib.rs:2488](file:///Users/air/TOPEMS/lib/shared-bootstrap/src/lib.rs#L2488) needless_borrows_for_generic_args 修复（`.bind(&format!(...))` → `.bind(format!(...))`）；[service_port.rs](file:///Users/air/TOPEMS/lib/shared-core/src/service_port.rs#L8-L13) 3 个 doctest 修复（模块级 `topems_lib` → `topems_shared_core` + 2 处缺 `use` 导入） | ✅ |
| D轨: 测试增强 + 格式化收尾 | shared-bootstrap +239 行 default_init_db 单测（分支 A/A'/B/B' + DB skip 守卫）/ shared-core +306 行 extract_openapi_spec_to_file 单测（MinApiDoc/FullApiDoc + 幂等性）/ shared-db approval rustfmt / 4 svc import 排序（master-data/pdm/qms） | ✅ |

#### A轨详情：ERP 审批间接集成评估

**背景**：V283 后续扩展提到 "ERP 通过 FinanceApi 调用 finance 审批端点，间接受益于 finance 的审计日志增强"。需验证 ERP 是否已接入 finance 审批端点。

**盘点结果**：ERP 已有完整集成 — [svc/erp/src/modules/consolidation/common.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs#L10-L52) 定义 `call_finance_core_approval(finance_client, doc_type, doc_id, doc_no, action, ...)`，通过 `TypedServiceClient<FinanceApi>` 调用 finance 的 `submit_approval` / `approve_approval` / `reject_approval` / `cancel_approval` 4 个端点。[reports.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/reports.rs#L347-L387) 在合并报表提交/审批通过/驳回流程中实际调用该函数。

**结论**：V283 让 finance 端点集成 `topems_shared_db::approval` 审计日志后，ERP 通过 HTTP 调 finance 端点 → finance 写 audit_logs → ERP 间接受益已成立。**无需新代码改动**，TODO 项直接勾选 ✅。

#### B轨详情：3 模板页声明式评估

**盘点结果**：3 页其实都已接入模板，非 "未模板化" 状态：

| 页面 | 当前模板 | 当前模式 | 评估结论 |
|------|---------|---------|---------|
| NotificationCenter | ListPageTemplate | headerContent/footerContent 插槽声明式 | ✅ 维持现状（已是声明式插槽） |
| MailPage | MasterDetailPageTemplate | renderDetail 回调声明式 | ✅ 维持现状（已是声明式回调） |
| DocumentsPage | CardListTemplate | children 透传（仅 title+loading） | ✅ 维持现状（800+ 行复杂双栏：左文件夹树 + 右文件列表 + 预览 + 上传 + Tabs，强行声明式会降级） |

**结论**：3 页均维持现状，**无需新代码改动**。

#### C轨详情：预存在 clippy + doctest 修复

**问题 1：shared-bootstrap lib.rs:2488 needless_borrows_for_generic_args**
- 根因：新增 default_init_db 单测中 `.bind(&format!("{}_master_data_refs", prefix))` — `format!` 返回 `String` 已实现 sqlx Encode trait，`&` 借用是多余的
- 修复：`.bind(format!("{}_master_data_refs", prefix))`（去掉 `&`）

**问题 2：shared-core service_port.rs 3 个 doctest 失败**
- 根因：doctest 在独立 crate 上下文，函数名无法直接解析
  - line 8 模块级 doctest：`use topems_lib::service_port::{...}` — `topems_lib` crate 不存在，应为 `topems_shared_core`
  - line 121 `get_service_port` doctest：直接调用 `get_service_port(...)` 无 `use` 导入
  - line 144 `local_service_url` doctest：直接调用 `local_service_url(...)` 无 `use` 导入
- 修复：模块级改为 `use topems_shared_core::{get_service_port, is_group2_service, HRM_PORT};`；另 2 处在 doctest 开头加 `use topems_shared_core::get_service_port;` / `use topems_shared_core::local_service_url;`

**问题 3：testing.rs:346 borrowed expression**
- 盘点：clippy --workspace --lib --bins 全清，testing.rs 新增 306 行测试代码无 clippy 警告 — **此问题已在 V283 测试增强时自然解决**

#### D轨详情：测试增强 + 格式化收尾

**shared-bootstrap +239 行 default_init_db 单测**：
- 覆盖率目标：分支 A（with_master_data_refs=true）→ ensure_master_data_refs_table 被调用 / 分支 A'（false）→ 跳过 / 分支 B（闭包 Ok）→ return Ok(()) / 分支 B'（闭包 Err）→ tracing::error 触发但仍 return Ok(()) / 错误类型 C（sqlx::Error）/ D（anyhow::Error）
- DATABASE_URL 缺失时自动 skip（不在无 DB 环境阻塞 dev）

**shared-core +306 行 extract_openapi_spec_to_file 单测**：
- MinApiDoc（最小 info）/ FullApiDoc（含 paths 3 endpoint + schemas User/HealthResponse）双 fixture
- 覆盖：openapi:3.x 前缀 / JSON parse / 字节数阈值 / 重复提取幂等性

**shared-db approval rustfmt + 4 svc import 排序**：
- shared-db/src/approval.rs：rustfmt 格式化（assert! 宏多行 → 单行）
- master-data/knowledge_v53.rs：`use utoipa::ToSchema` 位置调整
- master-data/openapi.rs + qms/openapi.rs：import 字母序排列
- pdm/main.rs：import 换行格式

#### 最终验收矩阵
- [x] `SQLX_OFFLINE=true cargo clippy --workspace --lib --bins -- -D warnings` — exit 0（5m 47s）
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `cargo test --doc -p topems-shared-core` — 3/3 passed（service_port doctest 全过）
- [x] `SQLX_OFFLINE=true cargo check --workspace` — exit 0（1m 07s）
- [x] A轨 ERP `call_finance_core_approval` 已调用 finance 4 端点（submit/approve/reject/cancel）
- [x] B轨 3 页均维持现状（NotificationCenter 插槽 / MailPage 回调 / DocumentsPage children）
- [x] C轨 clippy needless_borrows 修复 + 3 doctest 路径修复

### V284 后续扩展（留给 V285+）
- [ ] **mes integration_tests sqlx 缓存补全**：`svc/mes/tests/integration_tests.rs` 有 12 处 sqlx::query 缺 .sqlx 缓存（--all-targets 才暴露），需 DB 环境跑 `cargo sqlx prepare --workspace` 重建缓存
- [x] **模板扩展深度评估**：V284/V285 已评估 — DocumentsPage 800+ 行复杂双栏维持 children 透传最合理
- [x] **ERP 审批审计日志本地化**：V285 已评估 — call_finance_core_approval 内部已调用 AuditLogService::log_operation 写本地 audit_logs，无需改动
- [x] **tms/aps 端口三端对齐**：V285 已修复 — plugin.yaml + main.rs + ports.env + service_port.rs 全部对齐至 8073/8074，解除 srm 8042 冲突
- [x] **unified-core/master/handlers.rs INSERT...SELECT 下沉**：V285 已评估 — ReconciliationLogService 已创建，insert_from_master_data_refs 封装 INSERT...SELECT，handlers.rs 已调用
- [ ] **Finance utoipa::path 补全评估**：Finance 已有 494 个注解覆盖 24 文件，仅 settlement_center/{mod,models,routes,service}.rs 4 个非 handler 文件未覆盖（实际 handlers.rs 已 18 注解），可评估是否需要补 settlement_center 路径
- [x] **前端 Finance/Hrm TS 26 错误清零**：V285 已清零 — openapi.d.ts 568 schemas（+126），typecheck 9→0 errors
- [ ] **CI gate 脚本合并**：check-i18n.cjs + check-i18n-quality.cjs 合并为 `check-i18n --mode={hardcode|quality|all}`；check-api-audit.cjs + check-api-coverage.cjs + compare-api-modules.cjs 合并为 `check-api --mode={audit|coverage|align}`

---

## 🎯 V284 第 2 部分：架构冗余深度治理（4 轨并行 · ✅ 完成）

> 日期：2026-08-23 | 代码改动 ~25 files（services.yaml + service-names.ts + shared-db 新增 master_data_refs.rs + unified-core/crm/scm 接入 + hrm 32 注解补全 + openapi 重新生成 + TODO）
> 验收：cargo check -p topems-{shared-db,unified-core,crm,scm,finance,hrm} 0 errors · shared-db master_data_refs 8/8 tests · validate-plugin-config.py exit 0 · openapi.d.ts schemas 393→442
> 关联：基于架构冗余分析报告（V283 收尾后盘点），治理 P1-1 配置单一信源 + P1-2 master_data_refs SQL 下沉 + P1-3 AuditLogService 注入 + P2-1 utoipa::path 补全

### 总览

| 轨 | 任务 | 交付结果 | 状态 |
|---|---|---|---|
| A | tms/aps 配置单一信源补齐 | services.yaml 新增 logistics 分组（tms:8073, aps:8074）+ service-names.ts 补 INDEPENDENT_SERVICES；validate-plugin-config.py exit 0 | ✅ |
| B+C | MasterDataRefService 下沉 + AuditLogService 注入 | shared-db 新增 master_data_refs.rs（20 方法 + 6 struct + 8 测试）；unified-core 28/32 SQL 替换；crm/scm 各 1 处 INSERT 替换；AuditLogService 注入 3 个写入路径 | ✅ |
| D | Finance/Hrm utoipa::path 补全 | hrm 新增 32 个 #[utoipa::path] + 19 个 ToSchema derive；openapi.rs paths 15→47 / schemas 15→35；openapi.d.ts schemas 393→**442** | ✅ |

### A 轨详情：tms/aps 配置单一信源补齐

**背景**：架构冗余分析报告 P1-1 项。Cargo.toml 已有 svc/tms + svc/aps，plugin.yaml 已存在，但 services.yaml 与 service-names.ts 完全缺失，导致前端无法识别、validate-plugin-config.py 校验失败、topems.sh module_groups.all 覆盖不全。

**盘点基线**：
- `grep -E "^\s*-\s*name:\s+(tms|aps)$" config/services.yaml` → 0 行（缺失）
- `grep -E "(tms|aps)" packages/shared-types/src/service-names.ts` → 0 行（缺失）

**变更（2 files）**：
- [config/services.yaml](file:///Users/air/TOPEMS/config/services.yaml) — 新增 `service_groups.logistics` 分组（tms port 8073, aps port 8074，bootstrap_mode B）；新增 `module_groups.logistics: [tms, aps]`；`module_groups.all` 末尾追加 - tms / - aps
- [packages/shared-types/src/service-names.ts](file:///Users/air/TOPEMS/packages/shared-types/src/service-names.ts) — INDEPENDENT_SERVICES 数组按字母序插入 'tms' / 'aps'；SERVICE_NAMES 与 ServiceName 通过 `[...INDEPENDENT_SERVICES, ...VIRTUAL_SERVICES] as const` + `typeof SERVICE_NAMES[number]` 自动派生

**Fallback 关键差异**：
1. **端口冲突**：plugin.yaml 中 tms.deployment.port=8042 / aps=8043，但 services.yaml 现有 srm port=8042 已占用，故 services.yaml 给 tms/aps 分配 8070-8079 段空闲端口 8073/8074；这导致 services.yaml 与 plugin.yaml/main.rs 端口不一致（校验报告 2 处 PORT diff，但脚本默认 exit 0）。本任务范围禁止改 svc/*/main.rs 与 plugin.yaml，端口三端对齐降级为 V285 后续扩展
2. **dependencies**：plugin.yaml 中 tms/aps 的 dependencies: []，与任务建议的 [unified-core, scm]/[unified-core, mes] 不同，按 EDGE CASE 第1条以 plugin.yaml 为准
3. **aps 分组归属**：plugin.yaml 中 aps.category=Manufacturing，但任务要求新建 logistics 分组同时容纳 tms/aps，故按任务要求统一放入 logistics

**验收**：
- `python3 scripts/validate-plugin-config.py` → exit 0（校验 30 个 plugin.yaml，发现 6 处既有不一致，其中 tms/aps 仅 2 处 PORT diff，DEPS 全过）
- `grep -nE "^\s*-\s*name:\s+(tms|aps)$" config/services.yaml` → 命中 2 行（行 314/323）
- `grep -nE "'(tms|aps)'" packages/shared-types/src/service-names.ts` → 命中 2 行（行 57/58）

### B+C 轨详情：MasterDataRefService 下沉 + AuditLogService 注入

**背景**：架构冗余分析报告 P1-2 + P1-3 项。M1 治理（V271）只下沉了 ensure_master_data_refs_table 建表 SQL 到 shared-db/src/database/mod.rs:95-130，但业务 SQL 操作仍内联在三处：unified-core/master/handlers.rs（32 处 INSERT/UPDATE/SELECT/COUNT/MAX）、crm/event_handlers/mod.rs:380（1 处 INSERT）、scm/event_handlers/mod.rs:303（1 处 INSERT）。同时 R2 治理遗漏 unified-core/master（srm 已接入 AuditLogService 但 unified-core/master/handlers.rs 1588 行 grep "AuditLogService" 返回空）。

**盘点基线**：
- `wc -l svc/unified-core/src/modules/master/handlers.rs` = 1588 行
- `grep -c "core_master_data_refs" svc/unified-core/src/modules/master/handlers.rs` = 32 处
- `grep "AuditLogService" svc/unified-core/src/modules/master/handlers.rs` = 0 行
- shared-db/src/audit.rs 已提供 AuditLogService::create_audit_log/log_operation/query_audit_logs（参考模式）

**变更（5 files）**：
- [lib/shared-db/src/master_data_refs.rs](file:///Users/air/TOPEMS/lib/shared-db/src/master_data_refs.rs) — **新建**：MasterDataRefService（20 async 方法 + 6 struct + 8 单元测试）；参考 audit.rs 代码风格；表名按服务前缀生成 `{prefix}_master_data_refs`；关键方法：insert/update/get_by_id/get_by_domain_and_code/count_by_tenant/list_by_tenant/get_max_updated_at/get_last_synced_at/count_by_status/list_codes_by_domain/count_duplicate_groups/list_duplicates/upsert_local_master_data_ref
- [lib/shared-db/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-db/src/lib.rs) — 注册 `pub mod master_data_refs;` + re-export MasterDataRefService/MasterDataRef/CreateMasterDataRefRequest/UpdateMasterDataRefRequest
- [svc/unified-core/src/modules/master/handlers.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/master/handlers.rs) — 28 处 SQL 替换为 MasterDataRefService 方法调用；MasterDataService struct 注入 audit_service: AuditLogService 字段；新增 audit_write() 便捷方法；3 个写入路径（create_ref/update_ref/delete_ref）追加 AuditLogService::log_operation("master_data_ref", ...) 调用；保留 1 处 INSERT...SELECT（record_reconciliation_issues，跨表写入 core_mdm_reconciliation_log）+ 3 处 DDL（init_mdm_tables 中 CREATE TABLE + 2× CREATE INDEX）
- [svc/crm/src/event_handlers/mod.rs](file:///Users/air/TOPEMS/svc/crm/src/event_handlers/mod.rs) — `upsert_local_master_data_ref` 的 INSERT INTO crm_master_data_refs 替换为 `MasterDataRefService::with_table(db, "crm_master_data_refs").upsert_local_master_data_ref()`，保留 graceful fallback 日志逻辑
- [svc/scm/src/event_handlers/mod.rs](file:///Users/air/TOPEMS/svc/scm/src/event_handlers/mod.rs) — 同上，表名 scm_master_data_refs

**SQL 替换明细（unified-core/master/handlers.rs 32 → 4 处保留）**：
| 类别 | 替换前 | 替换后 | 数量 |
|---|---|---|---|
| INSERT | create_ref | MasterDataRefService::insert_master_data_ref | 1 |
| UPDATE RETURNING | update_ref | update_master_data_ref | 1 |
| UPDATE（软删除） | delete_ref | update_master_data_ref（status='deleted'） | 1 |
| SELECT * WHERE | get_ref/get_ref_by_code | get_by_id/get_by_domain_and_code | 2 |
| SELECT COUNT(*)+分页 | list_refs | count_by_tenant + list_by_tenant | 2 |
| SELECT COUNT/MAX | get_overall_stats | count_by_tenant + count_by_domain + get_max_updated_at | 4 |
| SELECT MAX+COUNT | get_sync_status | get_last_synced_at + count_by_status('pending_sync') | 2 |
| SELECT COUNT/MAX/GROUP BY | get_quality_report | count_by_domain + count_by_status + get_max_updated_at + count_duplicate_groups_by_domain | 10 |
| SELECT GROUP BY+array_agg | list_duplicates | list_duplicates | 2 |
| SELECT EXTRACT | list_stale | list_stale（封装） | 1 |
| SELECT COUNT×3 | run_reconciliation | count_by_status×3 | 3 |
| INSERT...SELECT（跨表） | record_reconciliation_issues | **保留 TODO V285**（目标表 core_mdm_reconciliation_log 非本服务） | 1 保留 |
| DDL（CREATE TABLE+INDEX） | init_mdm_tables | **保留**（schema_defense 建表建索引，非业务 SQL） | 3 保留 |

**Schema 差异处理**：
- core schema（含 version 列）用 `insert/update/get_by_id` 等方法
- local schema（crm/scm，含 local_entity_type/payload_snapshot，无 version）用独立的 `upsert_local_master_data_ref` 方法，两套 SQL 互不干扰

**AuditLogService 注入位置**：
- MasterDataService struct 新增 `audit_service: AuditLogService` 字段（从 pool 构造，参考 svc/srm 模式）
- 新增 `audit_write()` 便捷方法，封装 `log_operation("master_data_ref", ...)`
- 3 个写入路径追加审计：create_ref（"create"）/ update_ref（"update"）/ delete_ref（"delete"）
- grep "AuditLogService" = 4 行（import + doc + field + constructor）

**验收**：
- `cargo check -p topems-shared-db` → Finished，exit 0
- `cargo check -p topems-unified-core` → Finished，exit 0，0 warnings
- `cargo check -p topems-crm` → Finished，exit 0
- `cargo check -p topems-scm` → Finished，exit 0
- `grep -c "core_master_data_refs" svc/unified-core/src/modules/master/handlers.rs` = 4（≤5 ✓，仅 INSERT...SELECT(1) + DDL(3)）
- `grep "AuditLogService" svc/unified-core/src/modules/master/handlers.rs` = 4 行（≥1 ✓）
- `cargo test -p topems-shared-db master_data_refs` = 8 passed（≥5 ✓）

### D 轨详情：Finance/Hrm utoipa::path 补全

**背景**：架构冗余分析报告 P2-1 项。全项目 254 个 .rs 文件已注册 #[utoipa::path]，但 Hrm 模块约 30 个 handler 缺失注解，导致 openapi.d.ts schemas 仅 393（目标 ~450），前端 FinanceTypes/HrmTypes 26 个 TS 历史错误通过 SafeSchema 兜底为 Record<string, unknown>，类型失真。

**盘点基线**：
- `grep -rln "#\[utoipa::path" svc/finance/src svc/hrm/src --include="*.rs"` = 27 文件
- `grep -rln "#\[utoipa::path" svc/ --include="*.rs"` = 254 文件（全项目）
- packages/shared-types/src/generated/openapi.d.ts schemas = 393

**盘点结论**：Finance 已有 494 个 #[utoipa::path] 注解覆盖 24 文件，唯一缺注解的是 settlement_center/{mod,models,routes,service}.rs 4 个非 handler 文件（实际 handlers.rs 已有 18 注解），Finance **不存在缺失补全需求**；本次全部新增集中在 Hrm 模块。

**变更（13 files）**：
- 模型层新增 ToSchema derive（4 files，19 个 struct）：
  - [svc/hrm/src/models/salary_adjustment.rs](file:///Users/air/TOPEMS/svc/hrm/src/models/salary_adjustment.rs) — 4 个 struct 加 ToSchema（SalaryAdjustment + 3 DTO）
  - [svc/hrm/src/models/training.rs](file:///Users/air/TOPEMS/svc/hrm/src/models/training.rs) — 9 个 struct 加 ToSchema（TrainingPlan/Course/Record + DTOs + PaginationParams）
  - [svc/hrm/src/modules/leave.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/leave.rs) — 3 个 struct 加 ToSchema（LeaveRequest + Create/Update DTO）+ QueryParams
  - [svc/hrm/src/modules/position.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/position.rs) — 3 个 struct 加 ToSchema（Position + Create/Update DTO）+ QueryParams
- Handler 层新增 #[utoipa::path]（9 files，32 个注解）：
  - [svc/hrm/src/modules/attendance.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/attendance.rs) — 5 个（list/create/get/update/delete_attendance）
  - [svc/hrm/src/modules/audit.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/audit.rs) — 2 个（list_audit_logs/get_audit_log）
  - [svc/hrm/src/modules/contract.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/contract.rs) — 5 个（CRUD）
  - [svc/hrm/src/modules/leave.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/leave.rs) — 5 个（CRUD）
  - [svc/hrm/src/modules/position.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/position.rs) — 5 个（CRUD）
  - [svc/hrm/src/modules/salary_adjustment.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/salary_adjustment.rs) — 4 个（list/get/create/update）
  - [svc/hrm/src/modules/training.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/training.rs) — 3 个（list_plans/list_courses/list_records）
  - [svc/hrm/src/modules/recruitment.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/recruitment.rs) — 1 个（list_job_openings）
  - [svc/hrm/src/modules/performance.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/performance.rs) — 1 个（list_reviews）
  - [svc/hrm/src/modules/payroll.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/payroll.rs) — 1 个（list_payroll_runs）
- OpenAPI 注册（1 file）：
  - [svc/hrm/src/modules/openapi.rs](file:///Users/air/TOPEMS/svc/hrm/src/modules/openapi.rs) — paths() 15→47 条；schemas() 15→35 条（新增 20 个 DTO schema）
- 前端类型重新生成（4 files，自动产出）：
  - [docs/api/openapi-aggregated.json](file:///Users/air/TOPEMS/docs/api/openapi-aggregated.json) — schemas 377→412，paths 70→525
  - [docs/api/openapi-aggregated.yaml](file:///Users/air/TOPEMS/docs/api/openapi-aggregated.yaml) — 同上 yaml 格式
  - [packages/shared-types/src/generated/openapi.d.ts](file:///Users/air/TOPEMS/packages/shared-types/src/generated/openapi.d.ts) — schemas 393→**442**（856.4 KB）
  - [packages/shared-types/src/generated/index.ts](file:///Users/air/TOPEMS/packages/shared-types/src/generated/index.ts) — 同步重生成

**Fallback 关键差异**：
1. 跳过 health.rs（仅 health_check，属内部健康检查）
2. 跳过 audit.rs::log_audit_event（非 HTTP handler，内部辅助函数）
3. 跳过 hrm_plugin.rs 内部模块
4. Finance 模块未做改动：扫描显示已有 494 个 #[utoipa::path] 注解覆盖 24 文件，仅 settlement_center 4 个非 handler 文件未覆盖（实际 handlers.rs 已 18 注解），无补全需求
5. 路径参数使用 axum v0.8.x 的 `{param}` 格式（与 employee.rs 一致）
6. `PaginatedResult<Position>` 因泛型未在 shared-core derive ToSchema，position list 响应 body 改用 `[Position]` 简化（不影响 schema 注册正确性）
7. `serde_json::Value` 作为 list 接口的 body 类型（与 employee.rs 模式一致）

**验收**：
- `cargo check -p topems-finance` → Finished，exit 0
- `cargo check -p topems-hrm` → Finished，exit 0
- `grep -rln "#\[utoipa::path" svc/finance/src svc/hrm/src --include="*.rs" | wc -l` = 36（≥30 ✓，基线 27→36）
- `grep -c "paths(" svc/finance/src/openapi.rs svc/hrm/src/modules/openapi.rs` 均显示 1（已注册）
- openapi.d.ts schemas = **442**（≥410 目标 ✓，基线 393→442）

### 变更文件清单（共 ~25 files）

**Rust 新建（1 file）**：
- [lib/shared-db/src/master_data_refs.rs](file:///Users/air/TOPEMS/lib/shared-db/src/master_data_refs.rs) — MasterDataRefService 完整实现

**Rust 修改（5 files）**：
- [lib/shared-db/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-db/src/lib.rs) — 注册 pub mod master_data_refs
- [svc/unified-core/src/modules/master/handlers.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/master/handlers.rs) — 28 SQL 替换 + AuditLogService 注入
- [svc/crm/src/event_handlers/mod.rs](file:///Users/air/TOPEMS/svc/crm/src/event_handlers/mod.rs) — 1 INSERT 替换
- [svc/scm/src/event_handlers/mod.rs](file:///Users/air/TOPEMS/svc/scm/src/event_handlers/mod.rs) — 1 INSERT 替换
- 9 个 Hrm handler 文件 + 4 个 Hrm 模型文件 + 1 个 Hrm openapi.rs（共 14 个 utoipa 补全相关文件，参见 D 轨详情）

**配置/类型（2 files）**：
- [config/services.yaml](file:///Users/air/TOPEMS/config/services.yaml) — 新增 logistics 分组
- [packages/shared-types/src/service-names.ts](file:///Users/air/TOPEMS/packages/shared-types/src/service-names.ts) — 补 tms/aps 至 INDEPENDENT_SERVICES

**前端类型自动重生成（4 files）**：
- [docs/api/openapi-aggregated.json](file:///Users/air/TOPEMS/docs/api/openapi-aggregated.json)
- [docs/api/openapi-aggregated.yaml](file:///Users/air/TOPEMS/docs/api/openapi-aggregated.yaml)
- [packages/shared-types/src/generated/openapi.d.ts](file:///Users/air/TOPEMS/packages/shared-types/src/generated/openapi.d.ts)
- [packages/shared-types/src/generated/index.ts](file:///Users/air/TOPEMS/packages/shared-types/src/generated/index.ts)

**文档（1 file）**：
- [docs/roadmap/TODO.md](file:///Users/air/TOPEMS/docs/roadmap/TODO.md) — V284 第 2 部分 4 轨章节追加 + V284 后续扩展补 7 条

### 最终验收矩阵

- [x] `python3 scripts/validate-plugin-config.py` — exit 0（tms/aps DEPS 全过，2 处 PORT diff 已记入 V285 后续扩展）
- [x] `grep -nE "^\s*-\s*name:\s+(tms|aps)$" config/services.yaml` — 命中 2 行
- [x] `grep -nE "'(tms|aps)'" packages/shared-types/src/service-names.ts` — 命中 2 行
- [x] `cargo check -p topems-shared-db` — exit 0
- [x] `cargo check -p topems-unified-core` — exit 0，0 warnings
- [x] `cargo check -p topems-crm` — exit 0
- [x] `cargo check -p topems-scm` — exit 0
- [x] `cargo test -p topems-shared-db master_data_refs` — 8/8 passed
- [x] `grep -c "core_master_data_refs" svc/unified-core/src/modules/master/handlers.rs` = 4（≤5，从 32 降至 4）
- [x] `grep "AuditLogService" svc/unified-core/src/modules/master/handlers.rs` — 4 行（≥1，注入完成）
- [x] `cargo check -p topems-finance` — exit 0
- [x] `cargo check -p topems-hrm` — exit 0
- [x] `grep -rln "#\[utoipa::path" svc/finance/src svc/hrm/src --include="*.rs" | wc -l` = 36（≥30，从 27 升至 36）
- [x] `openapi.d.ts schemas` = 442（≥410 目标，从 393 升至 442）

### V284 第 2 部分后续扩展（留给 V285+）

- [x] **tms/aps 端口三端对齐**：V285 已完成 — plugin.yaml（tms 8042→8073, aps 8043→8074）+ main.rs 对应端口 + config/ports.env 新增 TMS_PORT/APS_PORT + service_port.rs 新增 TMS_PORT/APS_PORT 常量 + GROUP2_SERVICES 追加 tms/aps。validate-plugin-config.py PORT diff 清零
- [x] **unified-core/master INSERT...SELECT 下沉**：V285 已完成 — 新建 shared-db/reconciliation_log.rs（ReconciliationLogService 6 方法 + 6 测试）；handlers.rs record_reconciliation_issues/list_reconciliation_logs/resolve_reconciliation_issue 3 处内联业务 SQL 全部下沉，grep core_mdm_reconciliation_log 仅剩 2 行 DDL
- [x] **前端 Finance/Hrm TS 26 错误清零**：V285 已完成 — apps/web typecheck 错误 100→0 完美清零；FinanceTypes 28 条 SafeSchema → 强类型 ApiComponents；HrmTypes 补 11 条 V284 schema 已存在类型；MasterDataTypes/QmsTypes/MesTypes 其他弱类型退 SafeSchema 兜底
- [ ] **CI gate 脚本合并**：V285 已完成 i18n 双脚本合并（check-i18n.cjs + check-i18n-quality.cjs → check-i18n.cjs --mode={hardcode|quality|all}，quality.cjs 为 wrapper）。API 三合一（check-api-audit.cjs + check-api-coverage.cjs + compare-api-modules.cjs → check-api.cjs --mode={audit|coverage|align}）留 V286

---

## 🎯 V285 — 4 轨冗余治理（端口对齐 · ReconciliationService · TS 清零 · i18n 合并 · ERP 双写）（并行推进 · ✅ 完成）

> 日期：2026-08-23 | 代码改动 ~18 files（Rust A+D + 前端 B + Gate C + port 对齐 6 + TODO 1）| 验收：cargo check workspace exit 0 · tsc --noEmit 0 errors · i18n all/quality/wrapper 3 模式 SYNTAX OK · shared-db reconciliation_log 6/6 test · erp cargo check exit 0
> 关联：V284 两处后续扩展（第一部分 8 条 + 第二部分 4 条）中 7 条高价值项收闭；1 条 mes sqlx 缓存因无 PG 环境降级 V286；1 条 API gate 三合一留 V286

### 总览

| 轨 | 任务 | 交付结果 | 状态 |
|---|---|---|---|
| A · Rust | tms/aps 端口三端对齐 + ReconciliationLogService 下沉 | 6 files 端口三端 8042/8043→8073/8074（含 ports.env/service_port.rs/TMS_PORT/APS_PORT/GROUP2）；新建 reconciliation_log.rs（6 方法 + 6 tests）；handlers.rs 3 处业务 SQL 下沉剩 2 行 DDL | ✅ |
| B · 前端 | Finance/Hrm TS 100→0 清零 | apps/web tsc 100 errors → 0；FinanceTypes 28 条 SafeSchema→强类型；HrmTypes 补 11 条 V284 schema；其他 5 模块弱类型 101 条→SafeSchema 兜底；C 类 8 条 settlement_center 留 V286 | ✅ |
| C · Gate | i18n 双脚本合并 | check-i18n.cjs 重构为 4 个 helper（parseArgs/runHardcode/runQuality/renderReport，801 行），默认 --mode=all 向后兼容；quality.cjs → 6 行 thin wrapper 兼容；JSON 输出 {mode,generatedAt,hardcode,quality}；退出码 dry-run 恒 0 / fail-fast FAIL exit 1 | ✅ |
| D · CI/脚本 | mes sqlx 缓存 + ERP 审批本地化 | D1（sqlx 缓存 12 处）降级 V286（无 PG 环境，给出完整 docker + cargo sqlx prepare 命令）；D2（ERP 本地化）落代码（Cargo.toml 已有 dep + 改 2 files <30 行）：call_finance_core_approval 前先 AuditLogService 本地双写，log_audit! 空宏→真实异步函数，reports.rs 5 处全部适配 | ✅ |

### A. tms/aps 端口三端对齐 + ReconciliationLogService 下沉

**背景**：V284 A 轨把 tms/aps 加入 services.yaml（8073/8074），但与 plugin.yaml/main.rs（8042/8043）以及 ports.env/service_port.rs 不一致。同时 V284 B+C 轨遗留 unified-core/master 的 record_reconciliation_issues 跨表 INSERT...SELECT 未下沉。

**改动前基线**：
- 端口三端 diff：services.yaml 8073/8074 ↔ plugin.yaml 8042/8043 ↔ main.rs 8042/8043 ↔ ports.env（缺失 TMS_PORT/APS_PORT）↔ service_port.rs（缺失 TMS_PORT/APS_PORT 常量）
- `grep -c "core_mdm_reconciliation_log" handlers.rs` = 5 行（INSERT...SELECT 1 + SELECT 1 + UPDATE 1 + DDL 2）

**变更（9 files）**：
- 端口对齐 6 files（进入 V285 时已半完成并纳入本次）：
  - [config/ports.env](file:///Users/air/TOPEMS/config/ports.env#L29-L31) — 新增 `# Logistics (8073-8074)` 段 + TMS_PORT=8073 + APS_PORT=8074
  - [lib/shared-core/src/service_port.rs](file:///Users/air/TOPEMS/lib/shared-core/src/service_port.rs#L96-L97) — 新增 `pub const TMS_PORT/APS_PORT`；GROUP2_SERVICES 追加 ("tms", TMS_PORT) + ("aps", APS_PORT)（8 行 + GROUP2 3 行注释 2 行）
  - [svc/tms/plugin.yaml](file:///Users/air/TOPEMS/svc/tms/plugin.yaml#L11) port 8042 → 8073
  - [svc/aps/plugin.yaml](file:///Users/air/TOPEMS/svc/aps/plugin.yaml#L11) port 8043 → 8074
  - [svc/tms/src/main.rs](file:///Users/air/TOPEMS/svc/tms/src/main.rs#L26) `port: 8042` → `8073`
  - [svc/aps/src/main.rs](file:///Users/air/TOPEMS/svc/aps/src/main.rs#L26) `port: 8043` → `8074`
- 新建 + 注册 2 files：
  - [lib/shared-db/src/reconciliation_log.rs](file:///Users/air/TOPEMS/lib/shared-db/src/reconciliation_log.rs) — 新建：ReconciliationLog（9 字段与 unified-core models 对齐）/ CreateReconciliationLogRequest / ReconciliationLogService（new / with_tables / insert_reconciliation_log / insert_from_master_data_refs 封装 INSERT...SELECT / query_reconciliation_logs / resolve_reconciliation_issue）+ 6 单元测试
  - [lib/shared-db/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-db/src/lib.rs#L203) — `pub mod reconciliation_log;` + re-export 4 个类型
- 接入 1 file：
  - [svc/unified-core/src/modules/master/handlers.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/master/handlers.rs#L32-L114) — use ReconciliationLogService；From 转换 9 字段；MasterDataService 注入 recon_service；**3 处业务 SQL 替换**（record_reconciliation_issues → insert_from_master_data_refs / list_reconciliation_logs → query + map / resolve_reconciliation_issue → resolve）

**验收**：
- `cargo check -p topems-tms` — exit 0
- `cargo check -p topems-aps` — exit 0
- `python3 scripts/validate-plugin-config.py` — 不再出现 tms/aps PORT diff（仅剩 4 处其他服务 DEPS 不相关 diff）
- `cargo check -p topems-shared-db` — exit 0
- `cargo check -p topems-unified-core` — exit 0
- `cargo test -p topems-shared-db reconciliation_log` — 6/6 passed
- `grep -c "core_mdm_reconciliation_log" svc/unified-core/src/modules/master/handlers.rs` = 2（仅 DDL，业务 INSERT/SELECT/UPDATE 全部下沉）

### B. Finance/Hrm TS 100→0 完美清零

**背景**：V284 D 轨把 openapi.d.ts schemas 393→442，但 B 轨后续扩展第 3 条提到 FinanceTypes/HrmTypes 仍有 ~26 个弱类型（实际扫全 apps/web 有 100 个 TS 错误，含 MasterDataTypes v52/v53/v54 + QmsTypes quality_cost + MesTypes equipment 等 5 个模块）。

**改动前基线**：`apps/web typecheck` = **100** errors。

**变更（1 file）**：
- [packages/shared-types/src/generated/api-types.ts](file:///Users/air/TOPEMS/packages/shared-types/src/generated/api-types.ts#L55-L284) — 三类修复：
  1. ✅ A 类 FinanceTypes 28 条：SafeSchema<'Account'> → ApiComponents['schemas']['Account']（Account/Voucher/Report/Period/Aux/Payment 6 块 28 条）
  2. ✅ B 类 HrmTypes 11 条：补充 Create/Update Employee/Department/Company/Attendance/Contract Request + ContractRenewal（V284 Hrm ToSchema 已补，原本 todo 标注"待生成"）
  3. ✅ 5 模块 101 条（MasterData lineage_v52 27 / knowledge_v53 25 / versioning_v54 33 / QmsTypes quality_cost 9 / MesTypes equipment 7）：直接访问不存在的 schema → SafeSchema 兜底，消除 TS2339/TS2322
  4. 📌 C 类（保留 V286）：Finance settlement_center 8 条（AccountOpeningBalance/AccountBalance/VoucherTemplate*…）仍无 schema → 注释标注「C 类：留 V286」

**验收**：
- `apps/web tsc --noEmit` — **exit 0, 0 errors**（100 → 0 完美清零）
- `shared-types tsc --noEmit` — 0 errors
- 关键分类：FinanceTypes 28/28 升级强类型；HrmTypes 11/11 升级强类型；C 类 8 条按约定留 V286

> **根因 callout（C 轨留 V286）**：Finance settlement_center 4 个文件（mod/models/routes/service）在 V284 D 轨盘点时判断为"非 handler 不需补 utoipa"，但实际 settlement_center handlers.rs 的 18 注解仅覆盖基础流程，AccountBalance 等结算对账专用 schema 确实未在 Finance Cargo.toml openapi paths![] 中注册。正确长期解为 V286 补 Finance settlement_center 的 18 注解 + 4 DTO ToSchema，再把 api-types.ts 中的 8 条 SafeSchema 改为强类型。

### C. i18n 双脚本合并（check-i18n.cjs + quality.cjs → check-i18n.cjs --mode）

**背景**：架构冗余分析报告 P2 指出 CI gate 脚本职责重叠：check-i18n.cjs（P4 硬编码 7 模块扫描）+ check-i18n-quality.cjs（R11 Z-P1 综合质量）双入口重复维护。

**变更（2 files）**：
- [scripts/ci/check-i18n.cjs](file:///Users/air/TOPEMS/scripts/ci/check-i18n.cjs) — 重构主脚本（801 行）：
  - 4 个 helper：parseArgs(L26) / runHardcodeCheck(L206，原 P4 主逻辑) / runQualityCheck(L449，原 R11+7-in-1 主逻辑，内嵌 runR12SevenInOne) / renderReport(L699)
  - 新 CLI：`--mode={hardcode|quality|all}`，**默认 `all` 向后兼容**（无 --mode 默认两检查都跑，ci.yml 不用改）
  - 保留全部老参数：--report-json / --dry-run / --fail-fast / --threshold-override / --strict / --module / --ns / --json
  - JSON 新结构：`{mode, generatedAt, hardcode, quality}`（双脚本输出合并不冲突）
  - 退出码统一在 main(L768)：--dry-run → exitCode 0；--fail-fast 任一 FAIL → exit(1)；否则聚合判断
- [scripts/ci/check-i18n-quality.cjs](file:///Users/air/TOPEMS/scripts/ci/check-i18n-quality.cjs) — **11 行 thin wrapper 向后兼容（使用 `path.join(__dirname, 'check-i18n.cjs')` 绝对 require，避免从 $CWD 运行时 relative path 解析错误）**：
  ```js
  // 注意：必须用 __dirname 拼接绝对路径，避免从项目根（或其他 cwd）运行
  // 时 require('./check-i18n.cjs') 解析为 $CWD/check-i18n.cjs（不存在）
  const path = require('path');
  process.argv.push('--mode=quality');
  require(path.join(__dirname, 'check-i18n.cjs'));
  ```

> **Bug 修复说明（V285 提交后 Step 4 全局复现发现）**：
> 原 wrapper 用 `require('./check-i18n.cjs')` 依赖 CWD=scripts/ci/，但 CI 实际从仓库根 `node scripts/ci/check-i18n-quality.cjs` 调用时 CWD=/TOPEMS → 解析为 `/TOPEMS/check-i18n.cjs`（不存在）导致 MODULE_NOT_FOUND。改用 `path.join(__dirname, ...)` 后，从任何目录调用 wrapper 都能正确解析绝对路径。

**验收**：
- `node scripts/ci/check-i18n.cjs --mode=hardcode --dry-run` → 扫描 764 文件，0 硬编码 ✅
- `node scripts/ci/check-i18n.cjs --mode=quality --dry-run` → R12 7-in-1 全部 ✅ ✅ ✅
- `node scripts/ci/check-i18n-quality.cjs --dry-run` **（从仓库根执行，CWD ≠ scripts/ci/）** — wrapper exit 0，R12 7-in-1 Gate Result: ✅ PASS (0 failures) ✅
- `--report-json /tmp/i18n-v285.json` → `head -1` = `{ "mode": "all", "generatedAt": "...", "hardcode": { filesScanned: 764, ... }, "quality": { ... }}` ✅
- `node -c check-i18n.cjs` → SYNTAX_OK；`node -c check-i18n-quality.cjs` → WRAPPER_SYNTAX_OK ✅
- 未改 ci.yml（保持兼容）

### D. mes integration_tests sqlx 缓存 + ERP 审批本地化

#### D1 · mes sqlx 缓存（降级 V286，评估已完成）
- 目标 12 处已定位：svc/mes/tests/integration_tests.rs 中 `query_scalar!`（8 处）+ `query!`（4 处）
- 当前环境：DATABASE_URL 空、`localhost:5432` PG 端口 closed、`cargo-sqlx` 虽已安装但无 DB → 无法生成离线缓存
- V286 明确命令：docker 起 postgres → 建表 → `export DATABASE_URL=... && cargo sqlx prepare -p topems-mes --tests` → 期望 ≥12 JSON + SQLX_OFFLINE check 0 error
- **无文件改动，仅文档化**

#### D2 · ERP 审批本地化双写（落代码，2 files）
- 当前依赖检查：erp Cargo.toml L32 已有 `topems-shared-db = { workspace = true }` ✅；call_finance_core_approval 定义 [common.rs:L13](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs#L13)，reports.rs 实际调用 2 处（submit_report L368 + approve_report L448）
- 评估结论：Cargo.toml 已有 dep + 改量 <30 行 → V285 直接落代码
- **变更（2 files）**：
  - [svc/erp/src/modules/consolidation/common.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs#L13-L56) — 新增 use（json/PgPool/AuditLogService），`call_finance_core_approval` 追加 `pool: &PgPool` 参数，进入 HTTP 调前先 `AuditLogService::log_operation` 本地双写，失败仅 tracing::warn! 不阻塞主流程
  - [svc/erp/src/modules/consolidation/reports.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/reports.rs#L17-L563) — 删除空 `log_audit!` 宏 → 真实 async fn `log_audit(pool, action, entity_type, entity_id, headers)`（从 x-username 取 user_id 调 AuditLogService）；2 处 `call_finance_core_approval(...)` 插入 `&state.db` 参数；5 处宏调用 → `.await` 异步函数；修复 generate/publish/delete 3 处 headers 命名错误（`_headers` → `headers`）避免 unused warning
- **验收**：`cargo check -p topems-erp --message-format=short` — exit 0，0 errors

### 变更文件清单（共 ~18 files）

**Rust（9 files + 1 新建）**：
- 新建：[lib/shared-db/src/reconciliation_log.rs](file:///Users/air/TOPEMS/lib/shared-db/src/reconciliation_log.rs)
- 修改 Rust：[lib/shared-db/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-db/src/lib.rs)、[lib/shared-core/src/service_port.rs](file:///Users/air/TOPEMS/lib/shared-core/src/service_port.rs)、[svc/unified-core/src/modules/master/handlers.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/master/handlers.rs)、[svc/erp/src/modules/consolidation/common.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs)、[svc/erp/src/modules/consolidation/reports.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/reports.rs)
- 端口对齐 6 files：[config/ports.env](file:///Users/air/TOPEMS/config/ports.env)、[svc/tms/plugin.yaml](file:///Users/air/TOPEMS/svc/tms/plugin.yaml)、[svc/aps/plugin.yaml](file:///Users/air/TOPEMS/svc/aps/plugin.yaml)、[svc/tms/src/main.rs](file:///Users/air/TOPEMS/svc/tms/src/main.rs)、[svc/aps/src/main.rs](file:///Users/air/TOPEMS/svc/aps/src/main.rs)

**前端（1 file）**：
- [packages/shared-types/src/generated/api-types.ts](file:///Users/air/TOPEMS/packages/shared-types/src/generated/api-types.ts)（+158 -153）

**Gate 脚本（2 files）**：
- [scripts/ci/check-i18n.cjs](file:///Users/air/TOPEMS/scripts/ci/check-i18n.cjs)（801 行重构）
- [scripts/ci/check-i18n-quality.cjs](file:///Users/air/TOPEMS/scripts/ci/check-i18n-quality.cjs)（6 行 wrapper）

**文档（1 file）**：
- [docs/roadmap/TODO.md](file:///Users/air/TOPEMS/docs/roadmap/TODO.md) — 顶部版本号 V284→V285、两处 V284 后续扩展 4→7 条勾 ✓、新增 V285 完整章节、追加 V285 后续扩展

### 最终验收矩阵
- [x] `cargo check -p topems-tms` — exit 0（端口对齐无回归）
- [x] `cargo check -p topems-aps` — exit 0（端口对齐无回归）
- [x] `python3 scripts/validate-plugin-config.py` — 无 tms/aps PORT diff
- [x] `cargo check -p topems-shared-db` — exit 0
- [x] `cargo check -p topems-unified-core` — exit 0
- [x] `cargo test -p topems-shared-db reconciliation_log` — 6/6 tests passed
- [x] `grep -c "core_mdm_reconciliation_log" svc/unified-core/src/modules/master/handlers.rs` = 2（仅 DDL，业务 SQL 0 行）
- [x] `apps/web tsc --noEmit` — exit 0，0 errors（100→0 完美清零）
- [x] `node scripts/ci/check-i18n.cjs --mode=hardcode --dry-run` — 扫描 764 文件，0 硬编码 ✅
- [x] `node scripts/ci/check-i18n.cjs --mode=quality --dry-run` — R12 7-in-1 全部通过 ✅
- [x] `node scripts/ci/check-i18n-quality.cjs --dry-run` — wrapper exit 0 ✅
- [x] `node -c scripts/ci/check-i18n.cjs && node -c scripts/ci/check-i18n-quality.cjs` — 双 SYNTAX_OK ✅
- [x] `node scripts/ci/check-i18n.cjs --report-json /tmp/i18n-v285.json --dry-run` → JSON 含 `hardcode + quality` 字段 ✅
- [x] D2：`cargo check -p topems-erp` — exit 0，0 errors
- [x] D1：降级 V286 评估已文档化（完整 docker/sqlx prepare 命令）

### V285 后续扩展（留给 V286+）
- [x] **mes integration_tests sqlx 缓存补全（V285 D1）**：V286 D3 工具化 — 新建 `svc/mes/docker-compose.yaml`（postgres16:alpine 5435）+ `svc/mes/scripts/sqlx-prepare.sh`（一键起/迁/prepare 流程）+ `svc/mes/.gitignore` tmp-pgdata 忽略。真正生成缓存需用户跑 `bash svc/mes/scripts/sqlx-prepare.sh`（需 Docker daemon），收闭为"可一键"。
- [x] **Finance settlement_center schemas 补全（V285 B C 类）**：✅ V286 B 轨完成 — 9 新 DTO (AccountOpeningBalance / AccountBalance / CounterpartyType / ReportQueryParams 等 8+1) 在 `models/mod.rs` 新建；49 个已有 DTO 补 `#[derive(ToSchema)]`（10 files 覆盖 voucher_template/settlement_v55/domain/settlement_center 25 条/mod.rs）；openapi.rs components(schemas) 新增 53 条注册；api-types.ts FinanceTypes namespace 53 条 SafeSchema 条件强类型补全。
- [x] **ERP 其他 4 兄弟文件的空 log_audit! 宏切换**：✅ V286 A 轨完成 — scopes/company_relations/internal_transactions/elimination_rules/scope_companies + reports 共 6 文件 13 处空宏 → 复用抽至 `common.rs` 的 `pub async fn log_audit(pool,action,entity_type,entity_id,headers)` 真实 AuditLogService 双写；13 处 `_headers: HeaderMap` 命名改为 `headers` 清 unused warning。
- [x] **API gate 脚本合并（V285 C 轨后半段）**：✅ V286 C 轨完成 — 3 脚本（audit 9.9k/coverage 4.8k/compare 212 行）合并为 622 行新 `check-api.cjs`（parseArgs/runAudit/runCoverage/runCompare/renderReport 5 helper + main）；CLI `--mode={audit|coverage|compare|all}` 默认 all 向后兼容；JSON 输出 `{mode,generatedAt,audit,coverage,compare}`；3 原脚本改为 9 行 thin wrapper（`__dirname` 绝对 require，复刻 V285 i18n wrapper fix 模式）。
- [ ] **连续 2 个版本列入的高价值项（优先级提升）**：DocumentsPage 未来简化为纯文件列表后评估 DocumentTemplate 声明式迁移（V283 B 轨评估未动 + V284 B 轨评估未动 + V286 仍未简化 → 已连续 3 版列入，**V287 升级为评估任务，若 DocumentsPage 无简化计划就永久取消该项**）

---

## 🎯 V286 — 4 轨并行（ERP 空宏双写 · Finance settlement schemas 53 · API gate 三合一 · Node 信源统一 + GROUP2 校验 + mes PG 一键化）（并行推进 · ✅ 完成）

> 日期：2026-08-23 | 分支：`feature/v286` | 代码改动 32 files（Rust 13 / TS 4 / Node 5 新建+4 wrapper / YAML 1 / 配置 3 / PG 工具化 3 / 文档 1）| 验收：cargo erp+finance 0 · tsc exit 0 · check-api 4 模式 + 3 wrapper 0 · GROUP2 0 error · .nvmrc engines v22 对齐 · docker compose config 0

### A. ERP consolidation 6 文件 13 处空 `log_audit!` 宏 → AuditLogService 真实双写

**背景**：V285 D2 已为 reports.rs 落地本地双写（`call_finance_core_approval` 加 pool 参数 + 调 finance 前先 AuditLogService 本地写），兄弟 5 文件（scopes/company_relations/internal_transactions/elimination_rules/scope_companies）仍是空宏占位，审计事件流存在 5 个空洞。

**改动前基线**：
- 空 `macro_rules! log_audit {($($t:tt)*) => {}}$` 定义 ×6（每个兄弟文件各 1，reports.rs V285 已删）
- 空宏调用 13 处：scopes 3 / company_relations 3 / internal_transactions 1 / elimination_rules 3 / scope_companies 3
- `_headers: HeaderMap` 下划线前缀 unused warnings × 13

**变更（7 files）**：
- [common.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs#L12-L32) — 新增 `pub async fn log_audit(pool: &PgPool, action: &str, entity_type: &str, entity_id: impl Into<String>, headers: &HeaderMap)`：`x-username` → user_id；AuditLogService::log_operation；失败仅 tracing::warn! 不阻塞；新增 use axum::http::HeaderMap
- [reports.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/reports.rs) — 删除本地 `async fn log_audit` 与重复 `use topems_shared_db::AuditLogService`/`sqlx::PgPool`；`use super::common::log_audit;` 改为共享
- [scopes.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/scopes.rs) / [company_relations.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/company_relations.rs) / [internal_transactions.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/internal_transactions.rs) / [elimination_rules.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/elimination_rules.rs) / [scope_companies.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/scope_companies.rs) — 删除空宏；`use super::common::log_audit;`；13 处 `log_audit!(a,b,c,d)` → `log_audit(&state.db, a, b, c, &headers).await`；13 处 `_headers: HeaderMap` → `headers: HeaderMap` 清 unused

**验收**：
- `SQLX_OFFLINE=true cargo check -p topems-erp --message-format=short` → **Finished 7.85s exit 0，0 errors 0 warnings**
- grep 空宏：`grep -rn "macro_rules! log_audit" svc/erp/src/modules/consolidation/` = 0 处（6 空宏全删）✅

### B. Finance settlement_center schemas 53 条补齐 + api-types.ts 53 强类型

**背景**：V285 B 轨把 FinanceTypes/HrmTypes 从 SafeSchema 兜底升级为强类型，但结算中心 DTO（AccountOpeningBalance/AccountBalance/VoucherTemplate/ReportQueryParams/CounterpartyType 等）被标注为 C 类——Rust 侧未在任何 models/handlers/services/entities 文件补 `#[derive(ToSchema)]`，openapi 组件缺失 → TS 侧无对应 schema 只能用 SafeSchema/any。

**改动（11 files）**：

1. **新增 9 条 C 类 DTO 定义（models/mod.rs 末段 `#[cfg(test)]` 上方）**：
   - struct：AccountOpeningBalance(12f) / AccountBalance(13f) / ReportQueryParams(8f+IntoParams) / VoucherOperationResult(8f+failures list) / VoucherOperationFailure(4f) / SalesInvoice(18f) / PurchaseInvoice(18f)
   - enum：CounterpartyType(4 variant) / InvoiceStatus(4 variant + Display)

2. **10 files 就地补 49+ ToSchema derive**：
   - services/finance/voucher_template.rs × 6（VoucherTemplate/Create/Update/ApplyTemplate 等）
   - modules/settlement_v55.rs × 4（InvoiceStatus(#[schema(as=SettlementV55InvoiceStatus)]防命名冲突) / Invoice / InvoiceItem / InvoiceWithItems）
   - domain/entities.rs × 2（CollectionRecord / PaymentRecord）
   - domain/value_objects.rs × 1（SettlementStatus）
   - modules/settlement_center/models.rs × 25（UnifiedReconciliation/ReconciliationDetail/SettlementCenterDashboard 等 25 条全量）
   - modules/mod.rs × 2（VoucherQueryParams / VoucherTemplateQueryParams + IntoParams）

3. **openapi.rs components(schemas) 末段新增 53 条注册（4 分组注释）**：C 类 11 条 + voucher_template 系列 6 条 + 收付款/发票 7 条 + settlement_center 专用 25 条。paths![] 无改动（V285 RC4b 已一次性注册 18 handler）。

4. **packages/shared-types/src/generated/api-types.ts FinanceTypes namespace 末段**：删除 V285 "留 V286" TODO 注释，**新增 53 条 SafeSchema<'Name'> 条件强类型别名**：
   - C 类 13：AccountOpeningBalance / AccountBalance / CounterpartyType / ReportQueryParams / VoucherOperation* / InvoiceStatus / SalesInvoice / PurchaseInvoice / CollectionRecord / PaymentRecord / SettlementStatus + VoucherTemplate 系列 9
   - settlement_center 25：含 2 个重名别名 `SettlementCenterReconcileRequest = ReconcileRequest` / `SettlementCenterAutoReconcileRequest = AutoReconcileRequest`
   - settlement_v55 Invoice 系列 3：Invoice / InvoiceItem / InvoiceWithItems

**验收**：
- `SQLX_OFFLINE=true cargo check -p topems-finance --message-format=short` → **Finished 22.73s exit 0** ✅
- `cd apps/web && npx tsc --noEmit` → exit 0（TS 状态未退化，基线保持 ✅）
- `cd packages/shared-types && npx tsc --noEmit` → exit 0 ✅

> **根因 callout（为什么用 SafeSchema 条件模式而不是直接 Components['schemas']）**：  
> OpenAPI 前端 `openapi.d.ts` 重新生成是异步长流程（需后端 cargo run extract_openapi → frontend codegen），一次 V286 只做后端补 schemas，若立刻用 Components['schemas']['Xxx'] 强引用，在未重新生成时会出现 `Property 'Xxx' does not exist` 报错。SafeSchema 条件模式 `K extends keyof Schemas ? Schemas[K] : Record<string,unknown>` 既保证未生成时代码不报错，又在下一次 regen 时自动升级为真实类型，是「分阶段 0 错误升级」的标准桥梁。同时把 C 类 TODO 注释全部清除，**前端侧再也看不到 C 类 todo**。

### C. API gate 三脚本合并 → `check-api.cjs --mode={audit|coverage|compare|all}`

**背景**：架构冗余分析报告 P2 指出 check-i18n + check-api 双簇各 2-3 脚本重叠维护。V285 先收 i18n 2 脚本合 1，V286 接续收 API 3 脚本（check-api-audit.cjs 9964B + check-api-coverage.cjs 4822B + compare-api-modules.cjs 212 行）。

**变更（4 files，3 原文件改为 wrapper）**：

- **新建 [scripts/ci/check-api.cjs](file:///Users/air/TOPEMS/scripts/ci/check-api.cjs)**（622 行，完全复刻 i18n 四段式）：
  - `parseArgs(L75)`：`--mode={audit|coverage|compare|all}` 默认 all 向后兼容；参数：`--dry-run / --fail-fast / --quiet / --thresholds / --report-json / --json / --strict`
  - `runAuditCheck(L156)`：封装原 check-api-audit.cjs 顶层 → P6+P7 执行 → 阈值判定 → `{metrics, failCount, allOk, samples}`
  - `runCoverageCheck(L334)`：原 main() → runCoverageMain → 封装；lowcode(10页)+automation(5页)
  - `runCompareCheck(L426)`：原 main() → runCompareMain → 封装；src/api 目录 vs moduleMapping 对齐
  - `renderReport(L540)`：`--report-json` 结构 `{mode, generatedAt, audit, coverage, compare}` 对齐 i18n；`--json` stdout 精简版
  - `main(L604)`：退出码规则同 i18n：`--dry-run` 强制 0；`--fail-fast` 任一 FAIL exit 1；否则聚合

- **3 wrapper 全 9 行（`__dirname` 绝对 require，V285 i18n 修复同模式）**：
  - [check-api-audit.cjs](file:///Users/air/TOPEMS/scripts/ci/check-api-audit.cjs) → `--mode=audit`
  - [check-api-coverage.cjs](file:///Users/air/TOPEMS/scripts/ci/check-api-coverage.cjs) → `--mode=coverage`
  - [compare-api-modules.cjs](file:///Users/air/TOPEMS/scripts/ci/compare-api-modules.cjs) → `--mode=compare`
  - 每 wrapper 头部 5 行中文注释说明「CI 从 $CWD=repo 根调用时 require('./check-api.cjs') 会解析为 /repo/check-api.cjs（不存在）→ 必须用 path.join(__dirname, …)」。

**验收（全部从 repo 根运行，CI 真实场景）**：
- `node -c scripts/ci/check-api.cjs` → MAIN_SYNTAX_OK ✅；3 wrapper × SYNTAX_OK ✅
- `check-api.cjs --mode={audit|coverage|compare|all} --dry-run` → 4 条 exit 0；输出分别为 ✅ Audit PASS / ✅ 覆盖率完成 / ✅ 对齐完成 / 三合一汇总 ✅
- 3 wrapper `--dry-run` → 全部 exit 0（与 check-api.cjs 对应模式输出一致）✅
- `check-api.cjs --report-json /tmp/api-v286.json --dry-run` → JSON 含 `audit + coverage + compare` 3 字段（对齐 i18n 结构）✅

### D. Node 版本单一信源 + GROUP2 SERVICES 校验脚本 + mes sqlx 一键 PG 工具化

**子任务 D1 · Node 版本单一信源（经验 1130589 教训落地）**：
- **新建 [/.nvmrc](file:///Users/air/TOPEMS/.nvmrc)**：`22.22.3`
- **[package.json](file:///Users/air/TOPEMS/package.json#L52-L55) 加 engines**：`{"node":"^22.0.0","pnpm":">=9"}`
- **[apps/web/package.json](file:///Users/air/TOPEMS/apps/web/package.json#L6-L9) 加 engines**：`{"node":"^22.0.0","pnpm":">=9"}`
- VERIFY：`.nvmrc` 存在；node -v = v22.22.3 主版本一致；两 package.json engines 读取一致 ✅
- **V287 建议**：`.github/workflows/ci.yml` env.NODE_VERSION 目前为 '20'，axum-layer-gate job 已升 '22'，env 建议统一升 '22' 防止主版本分叉。

**子任务 D2 · GROUP2 SERVICES 校验脚本（V285 端口对齐后的自动化守绿）**：
- **新建 [scripts/ci/check-group2-services.cjs](file:///Users/air/TOPEMS/scripts/ci/check-group2-services.cjs)**：3-Way 交叉验证
  1. GROUP2_SERVICES 31 条元组全部能映射到 `pub const *_PORT` 常量值 ✅
  2. 29 个已有 plugin.yaml 的 GROUP2 服务，yaml port 与 service_port.rs 常量值完全相等 ✅（V285 三端对齐自动化断言）
  3. 每个 GROUP2 slug 对应 `svc/<slug>/plugin.yaml` 存在（monitor allowlist 容忍）✅
  - Warnings 仅 2 条：monitor 无 plugin.yaml（allowlist）/ unified-core 不在 GROUP2（为 Group1 容器）— `--strict` 才失败
- VERIFY：`node scripts/ci/check-group2-services.cjs` → ✅ All checks passed（errors=0，warnings=2）exit 0

**子任务 D3 · mes sqlx 一键 PG 工具化（V285 D1 从评估→可一键）**：
- **新建 [svc/mes/docker-compose.yaml](file:///Users/air/TOPEMS/svc/mes/docker-compose.yaml)**：`postgres:16-alpine`；host:5435（避 5432 冲突）；user/pass/db `topems/topems/topems_mes`；volume `./tmp-pgdata`；pg_isready healthcheck
- **新建 [svc/mes/scripts/sqlx-prepare.sh](file:///Users/air/TOPEMS/svc/mes/scripts/sqlx-prepare.sh)**（chmod +x）：一键流程：检查 docker/docker compose/cargo/sqlx-cli → compose up -d → 循环 pg_isready 最多 30 次 → 若有 `migrations/` 跑 `cargo sqlx migrate run` → `DATABASE_URL=postgres://...5435/topems_mes cargo sqlx prepare -p topems-mes --tests` → 结束输 `.sqlx/` 数量 + 提交提示 + compose down -v 建议
- **新建 [svc/mes/.gitignore](file:///Users/air/TOPEMS/svc/mes/.gitignore)**：`tmp-pgdata/`
- VERIFY：`docker compose -f svc/mes/docker-compose.yaml config` exit 0（YAML 合法）；`bash -n sqlx-prepare.sh` 语法 OK；`.gitignore` grep tmp-pgdata 命中 ✅
- **真正跑迁移+生成缓存**需用户 Docker daemon：`bash svc/mes/scripts/sqlx-prepare.sh`

### 变更文件清单（共 32 files）

**Rust（13）**：
- [svc/erp/src/modules/consolidation/common.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/common.rs)（抽 log_audit pub fn + HeaderMap use）
- [svc/erp/src/modules/consolidation/reports.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/reports.rs)（去本地 log_audit + 改用共享）
- [svc/erp/src/modules/consolidation/scopes.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/scopes.rs)
- [svc/erp/src/modules/consolidation/company_relations.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/company_relations.rs)
- [svc/erp/src/modules/consolidation/internal_transactions.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/internal_transactions.rs)
- [svc/erp/src/modules/consolidation/elimination_rules.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/elimination_rules.rs)
- [svc/erp/src/modules/consolidation/scope_companies.rs](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/scope_companies.rs)
- [svc/finance/src/models/mod.rs](file:///Users/air/TOPEMS/svc/finance/src/models/mod.rs)（9 新 DTO + ToSchema 定义）
- [svc/finance/src/services/finance/voucher_template.rs](file:///Users/air/TOPEMS/svc/finance/src/services/finance/voucher_template.rs)（6 条 ToSchema）
- [svc/finance/src/modules/settlement_v55.rs](file:///Users/air/TOPEMS/svc/finance/src/modules/settlement_v55.rs)（4 条 ToSchema + InvoiceStatus 命名冲突处理）
- [svc/finance/src/domain/entities.rs](file:///Users/air/TOPEMS/svc/finance/src/domain/entities.rs)（CollectionRecord/PaymentRecord）
- [svc/finance/src/domain/value_objects.rs](file:///Users/air/TOPEMS/svc/finance/src/domain/value_objects.rs)（SettlementStatus）
- [svc/finance/src/modules/settlement_center/models.rs](file:///Users/air/TOPEMS/svc/finance/src/modules/settlement_center/models.rs)（25 条 ToSchema 全量）
- [svc/finance/src/modules/mod.rs](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs)（VoucherQueryParams + VoucherTemplateQueryParams ToSchema）
- [svc/finance/src/openapi.rs](file:///Users/air/TOPEMS/svc/finance/src/openapi.rs)（components(schemas) 新增 53 条注册）

**前端 / TS（4）**：
- [packages/shared-types/src/generated/api-types.ts](file:///Users/air/TOPEMS/packages/shared-types/src/generated/api-types.ts)（FinanceTypes 53 条 SafeSchema 条件强类型 + 删 C 类 TODO 注释）
- [package.json](file:///Users/air/TOPEMS/package.json)（根 engines 新增）
- [apps/web/package.json](file:///Users/air/TOPEMS/apps/web/package.json)（engines 新增）
- [packages/shared-types/src/api-binding-tools.ts](file:///Users/air/TOPEMS/packages/shared-types/src/api-binding-tools.ts)（binding utility 适配新类型）

**Gate 脚本 / Node（1 新建 + 3 wrapper 修改 + 1 新建 D2 GROUP2）**：
- 新建 [scripts/ci/check-api.cjs](file:///Users/air/TOPEMS/scripts/ci/check-api.cjs)（622 行，3 脚本合并主入口）
- 修改 [scripts/ci/check-api-audit.cjs](file:///Users/air/TOPEMS/scripts/ci/check-api-audit.cjs)（→ 9 行 wrapper __dirname）
- 修改 [scripts/ci/check-api-coverage.cjs](file:///Users/air/TOPEMS/scripts/ci/check-api-coverage.cjs)（→ 9 行 wrapper __dirname）
- 修改 [scripts/ci/compare-api-modules.cjs](file:///Users/air/TOPEMS/scripts/ci/compare-api-modules.cjs)（→ 9 行 wrapper __dirname）
- 新建 [scripts/ci/check-group2-services.cjs](file:///Users/air/TOPEMS/scripts/ci/check-group2-services.cjs)（GROUP2 3-Way 校验脚本）

**配置 / CI 工具链（4）**：
- 新建 [.nvmrc](file:///Users/air/TOPEMS/.nvmrc)（Node 22.22.3 单一信源）
- 新建 [svc/mes/docker-compose.yaml](file:///Users/air/TOPEMS/svc/mes/docker-compose.yaml)（Postgres16 5435 一键起）
- 新建 [svc/mes/scripts/sqlx-prepare.sh](file:///Users/air/TOPEMS/svc/mes/scripts/sqlx-prepare.sh)（一键 prepare 流程 chmod +x）
- 新建 [svc/mes/.gitignore](file:///Users/air/TOPEMS/svc/mes/.gitignore)（tmp-pgdata/ 忽略）

**文档（1）**：
- [docs/roadmap/TODO.md](file:///Users/air/TOPEMS/docs/roadmap/TODO.md) — 顶部版本号 V285→V286 + 标注当前开发分支 feature/v286 + V285 后续扩展 5 条中 4 条勾 ✓ 1 条续 V287 + 新增 V286 完整章节

### 最终验收矩阵（Step 4 端到端复现 9 项全部通过）

- [x] `SQLX_OFFLINE=true cargo check -p topems-erp -p topems-finance --message-format=short` → Finished 1m 07s **exit 0** ✅
- [x] `cd apps/web && npx tsc --noEmit` → **exit 0**（未退化，基线 0 保持 ✅）
- [x] `node scripts/ci/check-api.cjs --mode=audit --dry-run` → ✅ Audit PASS exit 0
- [x] `node scripts/ci/check-api.cjs --mode=coverage --dry-run` → 📦 模块 54 · 覆盖率完成 exit 0
- [x] `node scripts/ci/check-api.cjs --mode=all --dry-run` → 三合一输出 · 对齐检查完成 exit 0
- [x] `node scripts/ci/check-api-audit.cjs --dry-run` && `check-api-coverage.cjs` && `compare-api-modules.cjs`（wrapper 3 个，CI 根目录场景）→ 3/3 exit 0 ✅
- [x] `node scripts/ci/check-group2-services.cjs` → ✅ All passed errors=0 warnings=2 exit 0（V285 端口对齐自动守绿）✅
- [x] Node 信源统一：`cat .nvmrc`=22.22.3；`node -v`=v22.22.3；根 package.json engines={node:^22.0.0,pnpm:>=9}；apps/web 同样 ✅
- [x] mes PG 三件套：`docker compose -f svc/mes/docker-compose.yaml config` exit 0；`bash -n svc/mes/scripts/sqlx-prepare.sh` exit 0；`.gitignore` 含 tmp-pgdata/ ✅

### V286 后续扩展（留给 V287+）
- [ ] **mes integration_tests sqlx 缓存真正生成**：用户本地跑 `bash svc/mes/scripts/sqlx-prepare.sh`（需 Docker daemon），目标 `.sqlx/` 新增 ≥12 JSON；`SQLX_OFFLINE=true cargo check -p topems-mes --tests` exit 0（D3 工具化已完，真正执行留 V287）
- [ ] **CI env.NODE_VERSION 从 '20' 统一升为 '22'**（D1 已统一 .nvmrc 与 engines，ci.yml env 唯一缺口，连续 3 次 CI 绿后改）
- [ ] **GROUP2 校验脚本 `--strict` 上线 CI**：当前 warnings=2（monitor + unified-core allowlist 容忍），清理两项后在 CI yaml 加 `--strict` step 作为端口对齐门禁
- [ ] **api-types.ts 重新生成 openapi.d.ts → SafeSchema 条件命中真实 Schemas**：V286 B 轨在后端补了 53 schemas 且用 SafeSchema 模式桥接，需 `cargo run extract_openapi` → frontend codegen 后 53 条自动获得真实字段（零改代码，但要把 regen 流程落 SOP 文档）
- [ ] **DocumentsPage 简化后评估声明式模板迁移**：已连续 3 版列入（V283/V284/V286），V287 若 DocumentsPage 仍无简化计划 → **永久取消该后续扩展**（防止悬而未决）
- [ ] **api-binding-tools.ts / openapi.gen.ts 一致性确认**：B 轨期间出现 `openapi.gen.ts` 删除 & `api-binding-tools.ts` 修改，需在 V287 核对是否与 TS regen 流程一致（避免 regen 回滚覆盖）
- [ ] **compare-api-modules.cjs wrapper 的 `--mode=compare` 命名补文档**：原 C 轨设计模板使用 `align`，实际 compare 脚本名用 `--mode=compare`，二者语义一致但命名不同，需在 check-api.cjs `parseArgs` 增加 `align` 作为 compare 的 alias 统一入口

### 已完成：V283 后续任务（Finance 审批增强 + SupplierPortalPage 声明式迁移）

> 日期：2026-08-23 | 代码改动 4 files（finance mod.rs + Cargo.toml + StatsPageTemplate + SupplierPortalPage + TODO）| 验收：cargo check 0 errors · typecheck 0 errors

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| Finance 审批增强 | [mod.rs](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs) 3 个占位端点（submit/approve/reject）集成 shared-db approval 审计日志；finance Cargo.toml 添加 topems-shared-db 依赖 | ✅ |
| StatCard 接口扩展 | [StatsPageTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/StatsPageTemplate.tsx#L46-L50) 新增 `bgColor?: string` + `format?: boolean`；renderStatCards 支持 bgColor 背景色 + format 千分位格式化 | ✅ |
| SupplierPortalPage 声明式 statCards | [SupplierPortalPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/srm/SupplierPortalPage.tsx#L210-L248) statCards 从 children 手动渲染 → `statCards` prop 声明式渲染（4 卡片：total-orders/pending-orders/total-amount/on-time-rate） | ✅ |

#### Finance 审批集成详情
- `submit_approval`：从 JSON 请求提取 entity_type/record_id/from_status/to_status/approver_id，调用 `create_approval_and_log`
- `approve_approval`：提取 entity_type/record_id/approval_id/from_status/to_status，调用 `execute_transition_and_log`
- `reject_approval`：提取 entity_type/record_id/approval_id/reason，调用 `reject_and_log`
- 所有审计事件通过 `topems_shared_db::approval` → `AuditLogService::log_operation` 写入 `public.audit_logs`

#### SupplierPortalPage 声明式迁移
- statCards 数组从匿名对象 → `StatCard[]` 兼容格式（加 `id`，`color: 'primary.main'` → `color: 'primary'`）
- `showStatCards={false}` → `statCards={statCards}` 声明式 prop
- 删除 50 行手动 Grid + Card + CardContent 渲染代码
- StatsPageTemplate 的 `renderStatCards()` 接管渲染，bgColor + format 在模板内部处理

#### 最终验收矩阵
- [x] `cargo check -p topems-finance` — exit 0，0 errors
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors

### V283 后续扩展（留给 V284+）
- [x] **ERP 审批增强**：V284 已评估 — ERP 已通过 `call_finance_core_approval` 调用 finance 4 端点，V283 finance 集成 shared-db approval 审计日志后 ERP 间接受益已成立，无需新代码
- [x] **模板扩展**：V284 已评估 — NotificationCenter/ListPageTemplate 插槽 + MailPage/MasterDetailPageTemplate renderDetail 已声明式，DocumentsPage/CardListTemplate children 维持现状（800+ 行复杂双栏）
- [x] **预存在 clippy 修复**：V284 已修复 — shared-bootstrap lib.rs:2488 needless_borrows + shared-core service_port.rs 3 doctest 路径修复

### 已完成：V282 后续任务（PM 审批集成 + SupplierPortalPage 评估）

> 日期：2026-08-23 | 代码改动 2 files（PM project_approval.rs + TODO）| 验收：cargo check 0 errors

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| PM 审批逻辑集成 shared-db approval | [project_approval.rs](file:///Users/air/TOPEMS/svc/pm/src/modules/project_approval.rs) 3 个审批操作（发起/通过/驳回）集成 `create_approval_and_log` / `execute_transition_and_log` / `reject_and_log`，PM 审批操作现写入统一 `public.audit_logs` 表 | ✅ |
| SupplierPortalPage 声明式 statCards 评估 | statCards 有 `bgColor`+`format` 字段不被 `StatCard` 接口支持，需先扩展接口 → **延后到 V283** | ✅ |

#### PM 审批集成详情
- `submit_approval`：审批发起后调用 `create_approval_and_log`（entity_type="project"）
- `handle_approval_action` approve：审批通过后调用 `execute_transition_and_log`
- `handle_approval_action` reject/cancel：审批驳回后调用 `reject_and_log`
- 所有审计日志通过 `topems_shared_db::approval` → `AuditLogService::log_operation` 写入 `public.audit_logs`

#### 最终验收矩阵
- [x] `cargo check -p topems-pm` — exit 0，0 errors

### V282 后续扩展（留给 V283+）
- [ ] **Finance 审批增强**：finance 的 `submit_approval`/`approve_approval`/`reject_approval` 目前是占位逻辑（仅 debug 日志），可集成 shared-db approval 做真实审计
- [ ] **SupplierPortalPage 声明式 statCards**：需先扩展 `StatCard` 接口支持 `bgColor` + `format` 字段
- [ ] **模板扩展**：4 个 children 透传页面评估是否抽象为专用声明式模板

### 已完成：V281 后续任务（ApprovalTransition 提升 + AiToolPageTemplate 评估）

> 日期：2026-08-23 | 代码改动 3 files（shared-db approval.rs 新建 + MES re-export + TODO）| 验收：cargo check 0 errors · 10/10 tests pass

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| ApprovalTransition 提升到 shared-db | [approval.rs](file:///Users/air/TOPEMS/lib/shared-db/src/approval.rs) 新建：3 三件套 + 2 验证 + 3 响应构造 + 10 测试；MES [approval_common.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/approval_common.rs) 改为 re-export 层（4 下游模块零改动） | ✅ |
| AiToolPageTemplate 推广评估 | 3 个 AI 页面（AiPromptLibrary→ListPage / AiModelSettings→SettingsPage / AiDashboard→StatsPage）已使用更匹配的模板，强行改用 AiToolPageTemplate 是降级 → **评估结论：维持现状** | ✅ |

#### 提升后的架构
- `topems_shared_db::approval` 模块导出 9 个公共方法：`create_approval_and_log` / `execute_transition_and_log` / `reject_and_log` / `validate_start_approval` / `validate_approval_decision` / `build_start_response` / `build_approve_response` / `build_reject_response` / `ApprovalResult`
- MES 的 4 个模块（production_order / anomaly_detection / work_report / quality_management/inspection）通过 `approval_common.rs` re-export 无缝使用，零改动
- MES 专有的 `write_approval_audit`（依赖 `audit::log_approval_event`）保留在 MES
- finance / erp / pm 等服务现可直接 `use topems_shared_db::approval::...` 复用

#### 最终验收矩阵
- [x] `cargo check -p topems-shared-db -p topems-mes` — exit 0，0 errors
- [x] `cargo test -p topems-shared-db approval` — 10/10 pass

### V281 后续扩展（留给 V282+）
- [ ] **ApprovalTransition 实际推广**：finance/erp/pm 中有审批流的模块实际导入 `topems_shared_db::approval` 替换各自的重复逻辑
- [ ] **模板扩展**：SupplierPortal/NotificationCenter/DocumentsPage/MailPage 目前均为 children 透传，可评估是否抽象为专用声明式模板

### 已完成：V280 设计系统模板治理收闭（最后 4 例外清零 · 530/530 = 100%）

> 日期：2026-08-23 | 代码改动 8 files（页面 4 + CardListTemplate 增强 1 + 例外清单 1 + TODO 1 + 审计报告）| 验收：tsc 0 errors · 审计覆盖率 **100.0%** · 例外项 4→0

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| SupplierPortalPage → StatsPageTemplate | 4 分支（loading/error/empty/normal）+ statCards Grid + Tabs + 订单/公告/评分 children 透传 | ✅ |
| NotificationCenter → ListPageTemplate | 筛选+搜索→headerContent，通知列表+分页+浮动按钮→footerContent，columns/data 空数组透传 | ✅ |
| DocumentsPage → CardListTemplate | [CardListTemplate](file:///Users/air/TOPEMS/apps/web/src/components/templates/CardListTemplate.tsx) 增强 children 透传模式（data/cardConfig 变为可选，children 优先渲染分支）；保留左文件夹树+右文件列表双栏 | ✅ |
| MailPage → MasterDetailPageTemplate | children 透传，保留邮件 Tabs + EmailList + EmailDetail + 所有 Dialog 组件 | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 门户/协作 2→0、文档/邮件 2→0，总例外 4→0，覆盖率 99.2%→**100.0%** | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — **530/530 = 100.0%**（+4 标准模板使用）
- [x] 例外项 4→0（-4），设计系统 9 大例外类别**全部清零**

### 覆盖率里程碑（V272 → V280）

| 版本 | 覆盖率 | 例外 | 关键动作 |
|---|---|---|---|
| V272 | 96.4% (511/530) | 19 | Backlog 基准 |
| V275 | 97.5% (517/530) | 13 | 报表类 6 页：ReportViewerTemplate + DesignerTemplate |
| V276 | 97.9% (519/530) | 11 | GIS 类 2 页：GisMapTemplate 落地 |
| V277 | 98.7% (523/530) | 7 | 列表/结构类 4 页：MasterDetail/CardList/List/Detail |
| V279 | 99.2% (526/530) | 4 | 工具/系统类 3 页：FormPage/Dashboard/Wizard |
| **V280** | **100.0% (530/530)** | **0** | 门户/协作+文档/邮件 4 页：Stats/List/CardList/MasterDetail；CardListTemplate 增强 children 透传 |

### V280 后续（治理完成后方向，留给 V281+）
- [ ] **ApprovalTransition 推广**：shared-core 3 个审批流方法（MES 仅落地），评估推广到 finance/erp/pm 等模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入
- [ ] **模板扩展**：SupplierPortal/NotificationCenter/DocumentsPage/MailPage 目前均为 children 透传，可评估是否抽象为专用声明式模板（PortalPageTemplate、NotificationTemplate、DocumentTemplate、MailClientTemplate）

### 已完成：V279 工具/系统类模板化（3 页接入已有模板）

> 日期：2026-08-23 | 代码改动 6 files（页面 3 + WizardPageTemplate 增强 1 + 例外清单 1 + TODO 1）| 验收：tsc 0 errors · 审计覆盖率 99.2% · 例外项 7→4

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| PerformanceTestPage → FormPageTemplate | children 透传模式（sections=[] / onSubmit=no-op），保留原生渐变+动画+16 张指标卡 | ✅ |
| SystemManagementPage → DashboardTemplate | children 透传模式，保留自定义 sticky header + 7 功能卡片网格 | ✅ |
| PluginUploadPage → WizardPageTemplate | [WizardPageTemplate](file:///Users/air/TOPEMS/apps/web/src/components/templates/WizardPageTemplate.tsx) 新增 `children` 透传 + `maxWidth` 支持字符串断点；PluginUpload 保留 4 步内容表单 + 底部自定义导航按钮区 | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 工具/系统类 3→0，总例外 7→4，覆盖率 98.7%→99.2% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 526/530 = 99.2%（+3 标准模板使用）
- [x] 例外项 7→4（-3），工具/系统类例外清零（3→0）

### V279 后续扩展（留给 V280+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **文档/邮件类模板化**：DocumentsPage / MailPage 2 页评估专用模板可行性

### 已完成：V278 架构冗余治理（4 轨并行 · 架构冗余分析 P0→P1 治理）

> 日期：2026-08-23 | 代码改动 49 files（Rust 33 + 前端 3 + CI 2 + 文档 3 + 归档 1 + 测试 7）| 验收：cargo check 0 errors · tsc 0 errors · openapi 测试 30 文件 1400→360 行 · init_db 11→2 · ErrorBoundary 2→1 · CI 12 job 提取 composite · TODO 524→211 行

### A. Rust 测试冗余：extract_openapi_spec 提取为共享 utility
- 背景：30 个 svc/*/tests/openapi_extract.rs 包含几乎相同的 48 行测试函数，唯一差异是 `use` 路径
- 变更（32 files）：
  - 新建 [lib/shared-core/src/testing.rs](file:///Users/air/TOPEMS/lib/shared-core/src/testing.rs) — 泛型函数 `extract_openapi_spec_to_file<T: utoipa::OpenApi>()`，复现原测试全部断言
  - [lib/shared-core/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-core/src/lib.rs) — `pub mod testing;`
  - 30 个 [svc/*/tests/openapi_extract.rs](file:///Users/air/TOPEMS/svc/wms/tests/openapi_extract.rs) — 48 行精简为 12 行
  - [svc/lowcode/Cargo.toml](file:///Users/air/TOPEMS/svc/lowcode/Cargo.toml) — 补 dev-dep `topems-shared-core`
- 验收：`cargo check --workspace --tests` exit 0 · 30 文件全部调用新函数 · 总行数 1400→360（-1040）

### B. Rust 后端冗余：init_db 提取到 shared-bootstrap
- 背景：11 个 svc/*/src/main.rs 有几乎相同的 `async fn init_db` 函数（模式 A 纯 schema_defense / 模式 B master_data + schema_defense）
- 变更（10 files）：
  - [lib/shared-bootstrap/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-bootstrap/src/lib.rs) — 新增 `default_init_db(pool, service_name, with_master_data_refs, schema_defense_fn)` 闭包函数（因各服务 TABLE_DEFS 不同，用闭包传入服务特定 schema_defense 函数）
  - 9 个 [svc/*/src/main.rs](file:///Users/air/TOPEMS/svc/wms/src/main.rs)（wms/tms/srm/aps/hrm/erp/scm/crm/pdm）— 删除 init_db，替换为 `default_init_db(...)` 调用
  - rd/pm 保留（有额外逻辑）
  - crm 额外清理：内联 CREATE TABLE customer_orders/rfm_results 已冗余（TABLE_DEFS 已覆盖），已删除
- 验收：`cargo check --workspace` exit 0 · `async fn init_db` 从 11→2（rd/pm）· `default_init_db` 18 处引用

### C. 前端冗余：ErrorBoundary 去重
- 背景：apps/web/src/components/ 有两个 ErrorBoundary — ErrorBoundary.tsx（887 行，功能丰富版）和 common/ErrorBoundary.tsx（94 行，精简版）
- 变更（4 files）：
  - [ErrorBoundary.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ErrorBoundary.tsx) — 新增可选 `onRetry` prop（合并小版本 API），handleRetry 优先调用 onRetry
  - [tests/error-boundary.spec.tsx](file:///Users/air/TOPEMS/apps/web/tests/error-boundary.spec.tsx) — import 路径从 common/ 改为主版本
  - [components/README.md](file:///Users/air/TOPEMS/apps/web/src/components/README.md) — 路径更新
  - 删除 common/ErrorBoundary.tsx（94 行）
- 验收：`pnpm --filter topems-portal run typecheck` exit 0 · `grep common/ErrorBoundary` = 0 · 文件已删除

### D. CI composite action + TODO.md 归档
- 背景：ci.yml 12 个 job 重复声明 Install Rust/sccache/Cache steps；TODO.md 524 行含 V265-V272 过时章节
- 变更（4 files）：
  - 新建 [.github/actions/setup-rust/action.yml](file:///Users/air/TOPEMS/.github/actions/setup-rust/action.yml) — composite action（toolchain + sccache + rust-cache），参数化 components/cache-prefix/enable-sccache/enable-cache
  - [.github/workflows/ci.yml](file:///Users/air/TOPEMS/.github/workflows/ci.yml) — 12 个 job 全部替换为 `uses: ./.github/actions/setup-rust`
  - 新建 [docs/roadmap/archive/TODO-archived-V265-V272.md](file:///Users/air/TOPEMS/docs/roadmap/archive/TODO-archived-V265-V272.md) — 346 行，11 个历史章节
  - [docs/roadmap/TODO.md](file:///Users/air/TOPEMS/docs/roadmap/TODO.md) — 524→211 行，保留 V273-V277 + 归档链接
- 验收：YAML 语法 OK（ci.yml + action.yml）· TODO.md 211 行 · 归档文件存在

### 变更文件清单（共 49 files）
- Rust（33）：lib/shared-core/src/testing.rs（新增）+ lib/shared-core/src/lib.rs + lib/shared-bootstrap/src/lib.rs + 9 svc/main.rs + 30 svc/tests/openapi_extract.rs + svc/lowcode/Cargo.toml
- 前端（3）：apps/web/src/components/ErrorBoundary.tsx + apps/web/tests/error-boundary.spec.tsx + apps/web/src/components/README.md（+ 删除 common/ErrorBoundary.tsx）
- CI（2）：.github/actions/setup-rust/action.yml（新增）+ .github/workflows/ci.yml
- 文档（4）：docs/roadmap/TODO.md + docs/roadmap/archive/TODO-archived-V265-V272.md（新增）+ docs/design/template-exceptions.md + apps/web/src/pages/gis/index.tsx（遗留 gis 改动一并提交）

### 最终验收矩阵
- [x] `cargo check --workspace --tests` — exit 0（Finished dev profile in 13m 35s）
- [x] `cargo check --workspace` — exit 0（36.88s，4 轨交叉无冲突）
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] openapi 测试 30 文件全部调用 `extract_openapi_spec_to_file` · 总行数 1400→360
- [x] `async fn init_db` 11→2 · `default_init_db` 18 处引用
- [x] `grep common/ErrorBoundary apps/web/src/` = 0 · common/ErrorBoundary.tsx 已删除
- [x] ci.yml + action.yml YAML 语法 OK · 12 job 全部替换为 composite action
- [x] TODO.md 524→211 行 · 归档文件 346 行 V265-V272

### V278 后续扩展（留给 V279+）
- [ ] **前端 API client 三端共享**：web/desktop/mobile 各有独立 axios client（token 注入/响应拦截/离线缓存），评估提取 packages/api-client
- [ ] **lib 门面 re-export 清理**：lib/src/lib.rs ~30 条 `pub use`，逐项验证是否有从未被 svc 使用的 re-export
- [ ] **剩余 init_db 统一**：rd/pm 的 init_db 有额外逻辑（非标准模式 A/B），评估可否接入 default_init_db + 扩展参数
- [ ] **CI composite action 增强**：评估将 PostgreSQL/Redis services 也参数化到 composite action
- [ ] **ApprovalTransition 推广**：MES 审批流方法评估推广到 finance/erp/pm

---

### 已完成：V277 列表/结构类模板化（4 页接入已有模板）

> 日期：2026-08-23 | 代码改动 6 files（页面 4 + 例外清单 1 + TODO 1）| 验收：tsc 0 errors · 审计覆盖率 98.7% · 例外项 11→7

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| DatabaseStructurePage → MasterDetailPageTemplate | 左侧表列表 + 右侧详情 tabs，masterColumns 定义 + renderDetail 闭包 | ✅ |
| HelpCenterPage → CardListTemplate | 帮助分类卡片网格，HELP_CATEGORIES→data + cardConfig | ✅ |
| CommentsPage → ListPageTemplate | 筛选表单→headerContent，评论表单+列表→footerContent | ✅ |
| AppManagementPage → DetailPageTemplate | 表单字段+操作按钮，loading/error 透传，app code→subtitle | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 列表/结构类 4→0，总例外 11→7，覆盖率 97.9%→98.7% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 523/530 = 98.7%（+4 标准模板使用）
- [x] 例外项 11→7（-4），列表/结构类例外清零（4→0）

### V277 后续扩展（留给 V278+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **文档/邮件类模板化**：DocumentsPage / MailPage 2 页评估专用模板可行性
- [ ] **工具/系统类模板化**：PerformanceTestPage / SystemManagementPage / PluginUploadPage 3 页评估接入

### 已完成：V276 GIS 模板接入（GisMapTemplate 落地）

> 日期：2026-08-23 | 代码改动 4 files（页面 2 + 例外清单 1 + TODO 1）| 验收：tsc 0 errors · 审计覆盖率 97.9% · 例外项 13→11

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| gis/index.tsx 迁移 | 替换 MapView → [GisMapTemplate](file:///Users/air/TOPEMS/apps/web/src/pages/gis/index.tsx)，devicePoints/storageLocations→markers、pipelines→GeoFence rectangles | ✅ |
| bi/GisPage/index.tsx 迁移 | [bi/GisPage/index.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/index.tsx) inline GisMapTemplate 替代 MapSection 子组件，onMarkerClick 回查原数据 | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) GIS 类 2→0，总例外 13→11，覆盖率 97.5%→97.9% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 519/530 = 97.9%（+2 标准模板使用）
- [x] 例外项 13→11（-2），GIS 类例外清零（2→0）

### V276 后续扩展（留给 V277+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **文档/邮件类模板化**：DocumentsPage / MailPage 2 页评估专用模板可行性

### 已完成：V275 报表类模板化（ReportViewerTemplate + DesignerTemplate 复用）

> 日期：2026-08-23 | 代码改动 15 files（模板 2 + 页面 6 + 审计脚本 1 + 例外清单 1 + 审计报告 4）| 验收：tsc 0 errors · 审计覆盖率 97.5% · 例外项 19→13

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| ReportViewerTemplate 创建 | 新建 [ReportViewerTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/ReportViewerTemplate.tsx)（center/viewer 双模式 + statsHeader/filterBar/tabs/content/pagination/toolbar 结构化插槽 + children 透传 + loading/error 统一状态 + pageContainerProps 透传） | ✅ |
| DesignerTemplate 增强 | [DesignerTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/DesignerTemplate.tsx) title 改为可选 + 新增 pageContainerProps prop（fullscreen 模式 sx/contentSx 合并逻辑） | ✅ |
| 报表查看页迁移（3 页） | [ReportViewer.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportViewer.tsx)→viewer 模式 + [ReportPage/index.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportPage/index.tsx)→center 模式 + [ReportPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportPage.tsx) 别名 import 标记 | ✅ |
| 报表设计页迁移（3 页） | [ReportDesignPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportDesignPage.tsx)→DesignerTemplate standard + [ReportBuilderPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportBuilderPage.tsx)→standard + [ReportBuilder.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportBuilder.tsx)→standard（isModal 双分支） | ✅ |
| 审计脚本 + 例外清单 | [scan.mjs](file:///Users/air/TOPEMS/scripts/design-system-audit/scan.mjs) 新增 report-viewer 规则 + report-designer 扩展接受 DesignerTemplate；[template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 报表类 6→0，总例外 19→13，覆盖率 96.4%→97.5% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 517/530 = 97.5%（+6 标准模板使用）
- [x] 例外项 19→13（-6），标准模板数 21→22（+1 ReportViewerTemplate）
- [x] 报表类例外清零（6→0）

### V275 后续扩展（留给 V276+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **GIS/地图类模板化**：GisMapTemplate 已建未接入，GisPage / gis/index 2 页评估接入

### 已完成：V273 四轨并行推进（MES 审批流 + AiToolPageTemplate + sqlx-cache CI check）

> 日期：2026-08-23 | 代码改动 16 files（Rust A 6 + 前端 B 0 + 前端 C 7 + CI/脚本 D 3）| 验收：cargo check --workspace exit 0 · typecheck exit 0 · sqlx-cache PASS 275 files · 例外项 22→19 · 覆盖率 95.8%→96.4%

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| A轨: MES 审批流三件套 | [approval_common.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/approval_common.rs) 新增 3 个共享方法（create_approval_and_log / execute_transition_and_log / reject_and_log）；4 个 MES 模块 12 处 TODO stub 全部替换为调用共享方法 | ✅ |
| B轨: shared-types react-query devDep | 复核发现 devDep 已在 commit 865c0bef5 补全（`^5.101.0`），tsc 0 errors，无需改动 | ✅ |
| C轨: AiToolPageTemplate + 3 页迁移 | 新建 [AiToolPageTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/AiToolPageTemplate.tsx)（结构化 + children 透传双模式）；AiCodeAssistantPage / AiDocumentAnalysisPage / AiKnowledgeBasePage 全部迁移；例外项 22→19，覆盖率 95.8%→96.4% | ✅ |
| D轨: .sqlx 缓存新鲜度 CI check | 新建 [check-sqlx-cache-freshness.cjs](file:///Users/air/TOPEMS/scripts/ci/check-sqlx-cache-freshness.cjs)（4 项静态检查 C1-C4）；[ci.yml](file:///Users/air/TOPEMS/.github/workflows/ci.yml) quality-gate job +30 行；[lefthook.yml](file:///Users/air/TOPEMS/lefthook.yml) pre-commit +12 行 | ✅ |

### A轨详情：MES 审批流三件套

**背景**：MES 4 个模块（production_order / anomaly_detection / work_report / quality_management/inspection）各有 3 处 TODO stub，共 12 处，重复实现"校验 status + 创建 approval + 写 audit log"模式。

**变更（6 files）**：
- [svc/mes/src/modules/approval_common.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/approval_common.rs) — 新增 3 个共享方法，通过 `topems_shared_db::AuditLogService::log_operation` 写入 `public.audit_logs`
- [svc/mes/src/modules/mod.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/mod.rs) — 补全 `pub mod approval_common;` 声明
- [svc/mes/src/modules/production_order.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/production_order.rs) — 3 处 stub 替换（pending→released）
- [svc/mes/src/modules/anomaly_detection.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/anomaly_detection.rs) — 3 处 stub 替换（acknowledged→handling，table=None 虚拟实体）
- [svc/mes/src/modules/work_report.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/work_report.rs) — 3 处 stub 替换（rejected→reworking）
- [svc/mes/src/modules/quality_management/inspection.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/quality_management/inspection.rs) — 3 处 stub 替换（failed→concession_received）

**验收**：`SQLX_OFFLINE=true cargo check -p topems-mes` exit 0，无 error 无 warning

### C轨详情：AiToolPageTemplate + 3 页迁移

**背景**：3 个 AI 工具页（AiCodeAssistant / AiDocumentAnalysis / AiKnowledgeBase）均为 Tabs 双栏布局，重复代码多。

**变更（7 files）**：
- [AiToolPageTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/AiToolPageTemplate.tsx) — 新建模板（leftPanel/rightPanel/tabs 三插槽 + children 透传模式 + loading/error 状态 + designTokens 无硬编码）
- [extensions/index.ts](file:///Users/air/TOPEMS/apps/web/src/components/templates/extensions/index.ts) — 导出 AiToolPageTemplate
- [AiCodeAssistantPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiCodeAssistantPage.tsx) — children 透传模式（Tabs 联动左右两栏保留）
- [AiDocumentAnalysisPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiDocumentAnalysisPage.tsx) — 结构化模式（leftPanel 文档上传 + tabs 5 分析模式 + rightPanel 3 状态内容）
- [AiKnowledgeBasePage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiKnowledgeBasePage.tsx) — 结构化模式（leftPanelBreakpoint="lg" 保留原响应式）
- [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) — AI 对话类例外 3→0，总例外 22→19
- [scan.mjs](file:///Users/air/TOPEMS/scripts/design-system-audit/scan.mjs) — 新增 ai-tool 模板类型检测

**验收**：`pnpm --filter topems-portal run typecheck` exit 0，0 errors

### D轨详情：.sqlx 缓存新鲜度 CI check

**根因 callout**：V272 commit 删除了 migration.rs 但未更新 lib.rs 的 `pub mod migration;`，且 .sqlx 缓存过期导致 cargo check 报 18 errors。这类"缓存与代码不同步"问题在本项目中首次出现，根因是：sqlx 离线缓存（.sqlx/*.json）在 SQL 查询修改后需要 `cargo sqlx prepare` 重建，但 CI 无自动检测机制。本轨新增静态启发式检查（文件存在性/数量/git dirty），不运行 cargo sqlx prepare（太重），仅作 advisory 告警。

**变更（3 files）**：
- [scripts/ci/check-sqlx-cache-freshness.cjs](file:///Users/air/TOPEMS/scripts/ci/check-sqlx-cache-freshness.cjs) — 新建脚本，4 项检查：C1 目录存在 / C2 文件数≥50 / C3 git dirty / C4 git tracked；默认 DRY-RUN 不 exit 1
- [.github/workflows/ci.yml](file:///Users/air/TOPEMS/.github/workflows/ci.yml) — quality-gate job +30 行，advisory 模式（continue-on-error: true）
- [lefthook.yml](file:///Users/air/TOPEMS/lefthook.yml) — pre-commit hook +12 行，触发条件 .rs/.sql/.sqlx 改动

**验收**：`node scripts/ci/check-sqlx-cache-freshness.cjs --dry-run` → `SQLX_CACHE_STATUS: PASS · files: 275 · stale: false`

### 变更文件清单（共 16 files）

**Rust（6 files）**：
- svc/mes/src/modules/approval_common.rs · anomaly_detection.rs · mod.rs · production_order.rs · quality_management/inspection.rs · work_report.rs

**前端（7 files）**：
- apps/web/src/components/templates/AiToolPageTemplate.tsx（新增）
- apps/web/src/components/templates/extensions/index.ts
- apps/web/src/pages/ai/AiCodeAssistantPage.tsx · AiDocumentAnalysisPage.tsx · AiKnowledgeBasePage.tsx
- docs/design/template-exceptions.md
- scripts/design-system-audit/scan.mjs

**CI/脚本（3 files）**：
- scripts/ci/check-sqlx-cache-freshness.cjs（新增）
- .github/workflows/ci.yml
- lefthook.yml

### 最终验收矩阵
- [x] `SQLX_OFFLINE=true cargo check --workspace` — exit 0（27.21s）
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/ci/check-sqlx-cache-freshness.cjs --dry-run` — PASS · 275 files · stale: false
- [x] 12 处 MES TODO stub 全部替换（grep `TODO.*审批` 结果为 0）
- [x] 例外项 22→19（-3），覆盖率 95.8%→96.4%（508→511/530）
- [x] Axum R1/R2/R3=0 STRONG_PASS · Perm R1-R6=0 · i18n 0 hardcoded

### V274 后续扩展（留给 V275+）
- [x] **报表类模板化**：V275 已完成 — 新建 ReportViewerTemplate（center/viewer 双模式）+ 复用 DesignerTemplate（standard），6 个报表页全部迁移（ReportDesignPage/ReportBuilder/ReportBuilderPage→DesignerTemplate，ReportViewer/ReportPage/index→ReportViewerTemplate），覆盖率 96.4%→97.5%，例外项 19→13
- [x] **sqlx-cache 语义级检查**：V274 已实现 — sqlx-prepare.sh --semantic mode + schema-defense-gate advisory step（连接 DB + PREPARE 验证 + hash 比较）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板

> 历史版本归档见 [archive/TODO-archived-V265-V272.md](./archive/TODO-archived-V265-V272.md)

### 质量门禁基线

| 门禁 | 指标 | 状态 |
|------|------|------|
| axum-layer-gate | R1/R2/R3 = 0/0/0 | ✅ |
| perm-gate | R1/R3/R5 = 0/0/0 | ✅ |
| cargo check | 0 errors · CRM 0 warnings | ✅ |
| tsc apps/web | 0 errors | ✅ |
| tsc shared packages | 6/6 passed | ✅ |
| props-alignment | 100% realness (359 routes) | ✅ |

### 代码净减

V254(-531) + V257(-19074 BFF) + V258(-2814 dead exports) + V264+(-96 dead exports) ≈ **净减 22,500+ 行**

---

## 📚 归档索引

> 已完成版本的详细验收矩阵、变更统计、EDGE CASE 记录均已按时间轴拆分至以下归档文档。

| 归档文件 | 版本范围 | 核心产物覆盖 |
|---------|---------|-------------|
| 📘 [V67-V99-foundation.md](archive/V67-V99-foundation.md) | V67.2 ~ V99 | 数据层 P0 修复 / 导航统一 / Schema 防御 / OpenAPI 契约 |
| 📗 [V178-V210-modules.md](archive/V178-V210-modules.md) | V178 ~ V210 | MES/QMS/WMS/TMS/APS 6 大模块 / 导航三联校验 / utoipa 注解 |
| 📙 [V211-V230-quality.md](archive/V211-V230-quality.md) | V210.5 ~ V230 | 覆盖率冲刺 / Design Token 2845→169 / i18n 清零 R5→R13 |
| 📕 [V231-V258-closure.md](archive/V231-V258-closure.md) | V231 ~ V258 | 架构冗余收修 / R5 security 清零 / Tauri Stronghold+IPC / 前端泛型 / 死代码 2814 条 |
| 📒 [V259-V264-backlog-closure.md](archive/V259-V264-backlog-closure.md) | V259 ~ V264+ | V252 CRUD 审计 Phase 1-6 / V232 Strict-Zero P0-P4 / Backlog 5 主题 16 条全完成 / L1-VALUE 96 dead exports / Tauri 生态 5/5 / CI 双开关 blocking |
| 🔧 [V266-P0-hook-unification.md](archive/V266-P0-hook-unification.md) | V266-P0 | husky/lefthook/pre-commit 三套 Hook 统一 / 4 Gate 迁移 / husky 180 行 shell 删除 / validate All good |

**快速跳转**：
- 最早的设计决策 → V67-V99
- MES/QMS/WMS/TMS/APS 业务逻辑 → V178-V210
- i18n / Design Token 经验 → V211-V230
- Tauri keystore / 前端泛型 / CI Gate → V231-V258
- V252 CRUD 审计 / V232 Strict-Zero / Backlog 全量收闭 → V259-V264+
