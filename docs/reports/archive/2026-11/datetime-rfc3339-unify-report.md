# API 时间字段 RFC3339 统一 —— 批 A/B/C/D 执行报告

日期：2026-11-05
执行口径：对外时间字段统一返回带时区偏移的 RFC3339（`...Z` 或 `...+00:00`），前端按本地时区渲染。

## 0. 结论

| 问题 | 结论 |
|---|---|
| 口径是否彻底统一 | **批准的 A/B/C/D 范围内已统一**：数据库直出的时间字段全部走 `chrono::DateTime<Utc>` 默认序列化；`to_plain_text` 全仓 0 引用；`_at::text` 仅剩 12 处且均有明确理由。**但不是全仓 100% 统一**：仍有计划外模块（portal/erp/ai 等）的 `_at` 字段以 `String` 承载，统计见 §4.3。 |
| 前端能否正确显示 `14:08:54` | **能**。`formatDateTime('2026-11-02T06:08:54.035752Z')` 与 `('2026-11-02T14:08:54.035752+08:00')` 在 `Asia/Shanghai` 下均实测输出 `2026-11-02 14:08:54`。 |
| 有无回归 | **无**。`cargo check` 0 错误；本轮 crate 单测全通过（ehs 231、ai 992、lims 151、master-data 451、qms 262）；`pnpm --filter topems-portal typecheck` exit 0；前端日期测试 23/23 通过。 |

未提交、未改 `.sqlx`、未改迁移文件、未写生产库、未动 `stock_take` 三列映射。

---

## 1. 分批改动与验证

### 批 A（上一窗口完成，本报告复核）
- 文件 14 个：wms `orders/rules/suggestions/safety_stock/stock_take/inbound_order`、unified-core `file/manage.rs`、scm `mrp.rs`、pm `project_type_config.rs`、master-data `master_data.rs`、qms `quality_task.rs`、mobile `missing_endpoints.rs`、`lib/shared-db/src/datetime_text.rs`（新增）、`lib/shared-db/src/lib.rs`。
- 内容：删除 `to_plain_text` 调用与导出；3 个 serde 结构体只保留 `deserialize_with`（输出走 chrono 默认 RFC3339）；`missing_endpoints.rs:315` 去掉 `.naive_utc()`。
- 验证：`cargo check -p topems-unified-core -p topems-wms -p topems-scm -p topems-pm -p topems-master-data -p topems-qms -p topems-mobile` = 0；`--lib` 测试 master-data 451 / mobile 250 / pm 497 / qms 262 / scm 337 / unified-core 540 / wms 541，0 failed；`pnpm --filter topems-portal typecheck` = 0。

### 批 B（ehs）
- 文件 **14 个**：`accident / data_sync / emergency_drill / emergency_plan / environment / environmental_compliance / hazard / hazardous_material / health / occupational_disease / occupational_health / risk / safety / training`。
- 内容：SQL 共移除 **281 处** `_at::text`；结构体字段与 `row.get`/`try_get` 全部改为 `DateTime<Utc>` / `Option<DateTime<Utc>>`；创建/更新链路里的 `to_rfc3339()` 字符串改为 `Utc::now()`；**纯日期列 `diagnosed_at`（DATE）保持 `::text`**。
- 验证：`cargo check -p topems-ehs` = 0；`cargo test -p topems-ehs --lib` → **231 passed, 0 failed**。
- 过程中修正的编译/契约问题：6 个请求 DTO 的 `*_at` 字段回退为 `Option<String>`（入参契约不变）；`emergency_plan` 局部变量、`accident` payload 转换、`risk.rs` 测试字面量同步修正。

### 批 C（ai / master-data commercial_v55 / lims / qms data_sync）
- 文件 **21 个**：
  - `svc/ai/src/handlers/business_copilot_handlers.rs`：3 个响应结构体 + 2 个 `query_as` 元组 + `RETURNING created_at`，移除 **9 处** `created_at::text`。
  - `svc/master-data/src/modules/commercial_v55.rs`：`SUBSCRIPTION_COLS / USAGE_COLS / SLA_MEASUREMENT_COLS` 去 `::text`（5 列），3 个响应结构体改 `DateTime<Utc>`；时间过滤比较改为解析后比较，不改变语义。
  - `svc/lims/src`：**18 个文件、397 处** `_at::TEXT` 移除；`report.rs` 含 `inspection_date`（实际为 timestamptz，非纯日期）。
  - `svc/qms/src/modules/data_sync.rs`：6 处。
- 验证：`cargo check -p topems-ai -p topems-master-data -p topems-lims` = 0；`cargo test --lib` → ai **992** / lims **151** / master-data **451**，0 failed；`cargo check -p topems-qms` = 0；qms `--lib` → **262 passed**。
- 过程中发现并修复：`instrument_data/models.rs` 因不含 SQL 被首轮脚本跳过，导致 3 个响应结构体仍为 `String` 而 SQL 已返回 timestamptz（运行时会解码失败）——已补改为 `DateTime<Utc>` 并重跑 151 测试通过。

### 批 D（前端 + 接口复验）
- 文件 **9 个**：7 个页面脚本改用 `formatDateTime`，`AutomationRunsPage` 2 处（`started_at` / `finished_at` 空值保留 `-`），`date.test.ts` 新增 4 用例。
- 验证：`TZ=Asia/Shanghai pnpm --filter topems-portal exec vitest run src/utils/__tests__/date.test.ts` → **23 passed**；`pnpm --filter topems-portal typecheck` = 0；5 接口实测见 §2。

---

## 2. 5 条接口改前/改后对比（硬证据）

造数：仅 `topems_test`，6 张表共 14 行，统一写入 `2026-11-02 14:08:54.035752+08`（= `06:08:54.035752Z`）。服务以精简特性启动（`module-core,module-wms,module-scm,module-mobile`，端口 18080，`DEVELOPMENT_MODE=true` 本地旁路鉴权）。

| 接口 | 改前（旧格式/旧行为） | 改后 API（实测原样） | 前端 `formatDateTime` |
|---|---|---|---|
| `GET /api/wms/smart-replenishment/orders` | `created_at: null`（旧 String 解码失败，上一轮实测） | `2026-11-02T06:08:54.035752Z` | `2026-11-02 14:08:54` |
| `GET /api/core/file/files` | `2026-11-02 06:08:54.035752`（旧 `to_plain_text`） | `2026-11-02T06:08:54.035752Z` | `2026-11-02 14:08:54` |
| `GET /api/core/system/api-keys` | `2026-11-02T06:08:54.035752+00:00` | `2026-11-02T06:08:54.035752+00:00`（本就用 `to_rfc3339`，未改） | `2026-11-02 14:08:54` |
| `GET /api/wms/analytics/flow-trend?group_by=day` | 空数组（表空） | `period: "2026-11-02"`，`inbound_count: 1`、`outbound_count: 1` | 业务周期串，例外（见 §4.2） |
| `GET /api/scm/mrp/suggestions` | `2026-11-02 06:08:54.035752`（空格格式） | `2026-11-02T06:08:54.035752Z` | `2026-11-02 14:08:54` |

同库原始值核对（`SET TIME ZONE 'Asia/Shanghai'`）：

```
db_raw | TZ-RO-001 | 2026-11-02 14:08:54.035752+08
```

返回的 `06:08:54.035752Z` 与库内 `14:08:54.035752+08` 是同一瞬间；`formatDateTime` 按本地 `Asia/Shanghai` 渲染为 `14:08:54`。

> 说明：`orders` 的“改前 null”、`files/mrp` 的“空格格式”取自上一轮同库实测记录；本轮因库表初始为空，重新造数后重放同一瞬间进行对照。

---

## 3. 前端“直接把时间字段渲染成文本”的 grep 与处理

- 开工前扫描 `apps/**/*.tsx`：`{xxx_at}` / `value={xxx_at}` 共 **9 处**，全部命中后端时间戳字段，均已改为 `formatDateTime(...)`：
  1. `pages/rd/RsExperimentDetailPage.tsx` `record.recorded_at`
  2. `pages/erp/DatabaseManagementPage.tsx` `row.created_at`
  3. `pages/automation/AutomationVariablesPage.tsx` `row.updated_at`
  4. `pages/rd/RsFormulaDetailPage.tsx` `v.created_at`
  5. `pages/erp/PurchaseOrderPage.tsx` `selectedOrder.created_at`
  6. `pages/admin/components/PluginMarketplaceList.tsx` `plugin.published_at`
  7. `pages/admin/PluginManagementPage.tsx` `plugin.published_at`
  8. `pages/automation/AutomationRunsPage.tsx` `run.started_at`
  9. `pages/automation/AutomationRunsPage.tsx` `run.finished_at`（空值仍显示 `-`）
- 处理后再 grep：**0 命中**。
- 非 `_at` 的自定义 `item.time/date`（时间线输入等）不在此列，未动。

---

## 4. 例外项清单

### 4.1 纯日期（业务约定，保留文本）
- 全仓 `*_date::text` 87 处/10 文件，未动。
- ehs `diagnosed_at`（列为 `DATE`）：`occupational_disease.rs` 4 处、`occupational_health.rs` 2 处，仍走 `::text AS diagnosis_date/diagnosed_at`。
- 前端 `lims/InspectionResultPage.tsx:109 {row.inspection_date}` 保持原样（纯日期展示）。

### 4.2 周期串（业务约定，保留）
- `flow-trend` 的 `period` 为 `2026-11-02` / `2026-11` / `2026-W44` 周期标识，不是时间戳。

### 4.3 剩余 `_at::text`（12 处，均有理由）
| 位置 | 数量 | 理由 |
|---|---|---|
| `svc/ehs/...occupational_disease.rs` / `occupational_health.rs` | 6 | 列为 DATE，纯日期 |
| `svc/master-data/src/modules/commercial_v55.rs` | 5 | 仅用于 `WHERE recorded_at/measured_at` 过滤比较，不对外输出 |
| `svc/integration/src/handlers/conversion_rules.rs` | 1 | integration 模块不在 A/B/C/D 范围 |

### 4.4 计划外遗留（未在本轮处理，需下一轮）
- 全仓仍有 **352** 个 `pub *_at: (Option<String>|String)` 字段：portal 142、erp 59、ai 48（非 copilot 文件）、master-data 44、unified-core 15、mobile 8、ehs 7（全部为请求 DTO）、lims 7（全部为请求 DTO，已逐条核对）、analytics 5、integration 5、communication 4、finance 2、qms 2（`corrective_action.completed_at` 列已迁移为 text，代码注释注明豁免）、其余 1~2。
- `svc/integration` 还有 4 处 `AT TIME ZONE 'UTC'`（输出为无时区 timestamp），未动。
- 写入侧的 `Utc::now().naive_utc()` 绑定（wms/scm/mes/erp 等）属入参，不在输出口径内，未改。
- 上述均因原清单未覆盖，且改动面远超批准的 20 文件上限，按约定未擅自扩大范围。

---

## 5. 造数与清理

- 造数范围：仅 `topems_test`。涉及 `wms.replenishment_orders`(3)、`public.core_files`(3)、`public.core_tenant_settings`(1)、`scm.mrp_suggestions`(3)、`wms.inbound_orders`(1)、`wms.outbound_orders`(1)。
- 固定 ID 前缀：`a1/b1/c1/d1/e1/f1` + 可辨识单号 `TZ-*`。
- 验证后按 ID 前缀删除，复查计数：`0|0|0|0`。服务进程已停止（端口 18080 无监听）。

---

## 6. `git status --short` 与 `git diff --stat`

```
 M apps/web/src/pages/admin/PluginManagementPage.tsx
 M apps/web/src/pages/admin/components/PluginMarketplaceList.tsx
 M apps/web/src/pages/automation/AutomationRunsPage.tsx
 M apps/web/src/pages/automation/AutomationVariablesPage.tsx
 M apps/web/src/pages/erp/DatabaseManagementPage.tsx
 M apps/web/src/pages/erp/PurchaseOrderPage.tsx
 M apps/web/src/pages/rd/RsExperimentDetailPage.tsx
 M apps/web/src/pages/rd/RsFormulaDetailPage.tsx
 M apps/web/src/utils/__tests__/date.test.ts
 M lib/shared-db/src/lib.rs
 M scripts/date-type-audit.py
 M svc/ai/src/handlers/business_copilot_handlers.rs
 M svc/ehs/src/modules/accident.rs
 M svc/ehs/src/modules/data_sync.rs
 M svc/ehs/src/modules/emergency_drill.rs
 M svc/ehs/src/modules/emergency_plan.rs
 M svc/ehs/src/modules/environment.rs
 M svc/ehs/src/modules/environmental_compliance.rs
 M svc/ehs/src/modules/hazard.rs
 M svc/ehs/src/modules/hazardous_material.rs
 M svc/ehs/src/modules/health.rs
 M svc/ehs/src/modules/occupational_disease.rs
 M svc/ehs/src/modules/occupational_health.rs
 M svc/ehs/src/modules/risk.rs
 M svc/ehs/src/modules/safety.rs
 M svc/ehs/src/modules/training.rs
 M svc/lims/src/main.rs
 M svc/lims/src/modules/data_sync.rs
 M svc/lims/src/modules/inspection_record.rs
 M svc/lims/src/modules/inspection_task.rs
 M svc/lims/src/modules/instrument.rs
 M svc/lims/src/modules/instrument_data/collection_tasks.rs
 M svc/lims/src/modules/instrument_data/data_parsing.rs
 M svc/lims/src/modules/instrument_data/instrument_data_crud.rs
 M svc/lims/src/modules/instrument_data/models.rs
 M svc/lims/src/modules/instrument_data/parse_rules.rs
 M svc/lims/src/modules/process.rs
 M svc/lims/src/modules/proficiency_testing.rs
 M svc/lims/src/modules/reagent.rs
 M svc/lims/src/modules/report.rs
 M svc/lims/src/modules/sample.rs
 M svc/lims/src/modules/sample_barcode.rs
 M svc/lims/src/modules/test_method.rs
 M svc/lims/src/modules/uncertainty.rs
 M svc/master-data/src/modules/commercial_v55.rs
 M svc/master-data/src/modules/master_data.rs
 M svc/mes/src/modules/process_flow.rs
 M svc/mobile/src/modules/missing_endpoints.rs
 M svc/pm/src/modules/project_type_config.rs
 M svc/qms/src/models/corrective_action.rs
 M svc/qms/src/modules/data_sync.rs
 M svc/qms/src/modules/quality_task.rs
 M svc/scm/src/modules/mrp.rs
 M svc/scm/src/modules/supply_chain_dashboard.rs
 M svc/srm/src/models/quotation.rs
 M svc/unified-core/src/modules/audit/models.rs
 M svc/unified-core/src/modules/file/manage.rs
 M svc/unified-core/src/modules/settings/api_keys.rs
 M svc/wms/src/modules/analytics.rs
 M svc/wms/src/modules/inbound_order.rs
 M svc/wms/src/modules/inventory.rs
 M svc/wms/src/modules/smart_replenishment/orders.rs
 M svc/wms/src/modules/smart_replenishment/rules.rs
 M svc/wms/src/modules/smart_replenishment/safety_stock.rs
 M svc/wms/src/modules/smart_replenishment/suggestions.rs
 M svc/wms/src/modules/stock_take.rs
?? database/migrations/20261106000000_tz_unify_timestamp_without_tz.sql
?? deploy-notes.md.bak-1105
?? lib/shared-db/src/datetime_text.rs
?? scripts/date-type-baseline.json
```

```
 66 files changed, 1036 insertions(+), 794 deletions(-)
```

说明：工作区还包含上一轮遗留改动（`mes/process_flow.rs`、`qms/models/corrective_action.rs`、`srm/models/quotation.rs`、`unified-core/audit/models.rs`、`wms/analytics.rs`、`wms/inventory.rs`、`scm/supply_chain_dashboard.rs` 等），本轮未额外修改它们。4 个未跟踪文件中，`datetime_text.rs` 为批 A 新增的 serde 适配；迁移脚本与 `.bak/.json` 为既存文件，未改。

---

## 7. 未验证 / 风险

1. ehs、lims、ai、commercial_v55、qms 本轮只做了 `cargo check` + `--lib`，未逐接口起服务实跑（精简 server 未挂 ehs/lims 特性）。SQL 由 `::text` 改为直出 timestamptz，解码类型同步改为 `DateTime<Utc>`，但**未对 ehs/lims 每条 GET 做线上复验**。
2. 计划外模块（portal/erp/ai 其余文件等）仍以 `String` 承载时间，若其值来自 timestamptz 且未显式 `to_rfc3339()`，仍可能是无偏移字符串；需下一轮按 crate 盘点。
3. 前端仅验证了 `formatDateTime` 及 5 条接口的数据形态，未做整站回归。
