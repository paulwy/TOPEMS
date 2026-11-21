# B26 · erp 状态盘点与归因（2026-11-21）

## 结论
`svc/erp` 的 10 个状态枚举全部是**内存计算 / JSONB 快照 / 展示投影**，没有一个是独立 `status` 列的写入源，因此不入 CHECK 候选；全部在 `docs/database/status-db-check-mappings.json` 标记 `persisted:false`（队列 `resolved` 55→65，未解析 43→33）。

| 枚举 | 位置 | 归因 |
| --- | --- | --- |
| `CreditStatus` | `modules/customer_calc.rs` | 按 `credit_limit`/`used_credit` 比例实时计算；`erp.customers.status` 是客户生命周期（active/inactive，已有 CHECK），不是信用状态 |
| `ComplianceStatus` | `modules/master_data_compliance_audit.rs` | 内存审计引擎规则评估结果，模块零 SQL |
| `FindingStatus` | 同上 | 审计发现处理态，无对应表列 |
| `KpiStatus` | `modules/master_data_dashboard.rs` | KPI 阈值分级，计算值 |
| `QualityTicketStatus` | `modules/master_data_quality_loop.rs` | 内存工单 FSM，工单仅进 `mdm_collections` JSONB |
| `ReportStatus` | `modules/master_data_report_automation.rs` | 内存报告生成 FSM；`public.reports` 由别的服务写 |
| `SyncStatus` | `modules/master_data_sync.rs` | 内存同步编排（含 compensating/compensated） |
| `TaskStatus` / `RetirementStatus` | `modules/mdm_v49_types.rs` | 随 `LifecycleEntity` 进 `mdm_collections` JSONB，无独立列 |
| `ProductionStatusCategory` | `modules/order_calc.rs` | 把外部 `erp_production_orders.status` 自由文本归类的展示投影，本身不写库 |

验证方式：8 个模块 `sqlx`/`query!` 命中数均为 0；`mdm_collections` 为 `flush_on_write` 整体 JSONB 快照，不存在可加 CHECK 的标量列。

## 发现：erp schema 才是缺口的真实所在
- `erp` schema 共 **39** 个 `*status*` 列，其中 **21** 个没有任何 CHECK（`erp` 全 schema 只有 24 条 CHECK，且多为通用 active/inactive）。
- 本地有数据的 6 个：`audit_logs.status` 4462（success/error）、`sales_orders.status` 17（draft 16 / confirmed 1）、`receivables.status` 5（pending）、`announcements.status` 4（published）、`assets.status` 1（active）、`customers.status` 1（active，已有 CHECK）。
- 这些列都有真实 Rust 写入口，典型：`svc/erp/src/modules/sales_order.rs`、`event_handlers/mod.rs`（`INSERT INTO erp.sales_orders`）、`customer.rs`（`UPDATE erp.customers SET status = $1`）、`leave_request.rs`（写死 `pending`/`cancelled`）、`asset.rs`、`announcement.rs`、`audit.rs`。
- `sales_orders`/`purchase_orders` 的状态流转在 create/confirm 路径里是自由文本，没有枚举、没有起始状态谓词——与 WMS 单据同类问题，且 `erp.sales_orders` 是当前唯一有真实流量的业务单据（17 行）。

## 下一批（B27 候选，按优先级）
1. `erp.sales_orders.status`：`draft → confirmed → shipped? → completed/cancelled`。先定值集（读 create/update/confirm 全部写点 + 前端 erp 页面键），再补 Rust 枚举 + CHECK `NOT VALID` 演练。
2. `erp.receivables.status`：本地 5 行 pending，需确认是否有 confirmed/paid 写点。
3. `erp.announcements.status` / `erp.assets.status`：单值为主，先做候选 DDL 低成本收口。
4. `erp.audit_logs.status`（success/error）不是生命周期而是结果标记，宜命名 `outcome` 或直接枚举化后留 2 值 CHECK。
5. 其余 15 个零行列表（`purchase_orders`/`leave_requests`/`vehicles`/`vouchers` 等）随后按域并批。

## 残留
- 未改任何 erp 代码：本批只做归因与队列收敛，避免在无窗口的情况下动业务写路径。
- `erp` schema 的 21 个无约束列未进 `status-check-catalog` 之外的候选文件，待 B27 起逐批产出。
- 映射新增 10 条（共 65 条），队列统计四桶仍按启发式计值，`resolved` 不改变桶计数，属预期。
