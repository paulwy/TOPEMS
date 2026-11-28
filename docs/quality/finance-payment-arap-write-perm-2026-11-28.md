# Finance 付款域 / 应收应付域：写端点全部挂在读权限码后面（B376）

- 日期：2026-11-28
- 范围：`svc/finance/src/modules/mod.rs`（`create_routes` 内 `payment_routes`、`ar_ap_routes`）
- 结论：**只读角色可建/改/删付款单、提交审批执行付款、核销、批量核销、导出付款数据，以及建/改/删收款单、批量建应收应付**。属于 B375 同类问题里最大的一处，不是文档口径问题，而是真实越权。

## 1. 暴露出来的问题

两个域各自只挂了一个模块级读门，域内所有写方法都在同一层 `layer` 之下：

| 域 | 当时唯一门 | 被一概放行的写端点 |
| --- | --- | --- |
| 付款 | `finance:payment:read` | `POST /payments`、`PUT/DELETE /payments/{id}`、`POST /payments/{id}/submit｜approve｜reject｜execute`、`POST /payments/write-off`、`POST /payments/export`、`POST /payment-records`、`POST /ap/payments`、`POST /ap/payments/{id}/approve｜reject`、`PUT/DELETE /payment-records/{id}`、`POST /payment-records/write-off`、`POST /payment-records/batch-write-off`（15 个） |
| 应收/应付 | `finance:receivable:read` | `POST /receivables/batch`、`POST /payables/batch`、`POST /collections`、`PUT/DELETE /collections/{id}`、`POST /collections/write-off`、`POST /collections/batch-write-off`、`POST /ar/collections`（8 个） |

原代码在两块 `layer` 上方没有「网关兜底」注释，但注释缺失并不影响判断：这些端点在独立部署（不经网关 `require_finance_write`）时对任何持读权限的角色敞开，而付款单建单/审批/执行、核销、批量核销都是**直接落账**的动作。

顺带命中的脏码：`export_payments_handler` 与 `batch_write_off_payments_handler` 的 `utoipa::path` 写的是
`finance:payment:admin`，这个码在 `public.core_permissions` 里**不存在**（字典只有 `finance:payment:create/read/update/delete`），
注解声明了一个运行时不存在的权限。

## 2. 修法

按动作拆子 Router，各挂字典里真实存在的细码，再 `merge` 回原域名：

- 付款：`read`（只 GET：付款单列表/详情、付款记录列表/详情）= `finance:payment:read`；
  `create`（`POST /payments`、`POST /payment-records`、`POST /ap/payments`）= `finance:payment:create`；
  `update`（PUT、submit/approve/reject/execute、两种 write-off、ap approve/reject）= `finance:payment:update`；
  `delete`（`DELETE /payments/{id}`、`DELETE /payment-records/{id}`）= `finance:payment:delete`；
  `admin`（`POST /payments/export`）= `require_module_write("finance")`（= `finance:admin`），沿用原注解里
  `// gate: admin-only` 的意图——批量导出付款数据不因为「能看单条」就放行。
- 应收/应付：`read`（12 个 GET，含 aging 系列）= `finance:receivable:read`；
  `create`（`POST /collections`、`POST /ar/collections`、`POST /receivables/batch`）= `finance:receivable:create`；
  批量建应付单独一块 = `finance:receivable_payable:create`（字典里没有 `finance:payable:*`，不臆造新码）；
  `update`（`PUT /collections/{id}`、`POST /collections/write-off`、`POST /collections/batch-write-off`）= `finance:receivable:update`；
  `delete`（`DELETE /collections/{id}`）= `finance:receivable:delete`。
- 注解修正：两处 `finance:payment:admin` → `finance:admin`，与运行时门一致。

注意：`/collections` 与 `/ar/collections`、`/payment-records` 与 `/ap/payments` 是同一 handler 的两个路径别名，读写都按同一规则拆，不存在某个别名漏挂写门的情况（棘轮按块断言，别名与主路径同块）。

## 3. 防回归

`svc/finance/src/write_perm_split_ratchet.rs` 新增 3 条（累计 7 条）：

1. `payment_routes_are_split_by_action`：付款读块内不允许出现 `routing::post/put/delete` 或 `.post()/.put()/.delete()`；建/改/删三块分别挂对应细码；导出块必须 `require_module_write("finance")`；全文件不得再出现 `finance:payment:admin`。
2. `ar_ap_routes_are_split_by_action`：同上，应收应付四个写块分别挂 `receivable:create`、`receivable_payable:create`、`receivable:update`、`receivable:delete`。
3. `collection_and_payment_write_paths_are_not_in_read_blocks`：审批/执行/批量核销/核销/批量建应收这些具体写路径不得回落到读块。

## 4. 验证

- `cargo test -p topems-finance --lib` → **1175 passed**（含新增 3 条棘轮），0 failed。
- `cargo clippy -p topems-finance --all-targets -- -D warnings` → 通过。
- `cargo fmt --all --check` → 通过。
- `node scripts/ci/check-openapi-coverage.cjs` → 无新漂移（missing=0 / extra=0）；本批只改挂载方式，未新增 path，未改 `docs/api/openapi.json`。

## 5. 遗留（同类欠账，未在本批处理）

`svc/finance/src/modules/mod.rs` 里仍有其它「一个读码一门统吃」或注解脏码，需另立批次：

- `finance:write`（7 处注解）、`finance:mod:write`（4 处）、`finance:mod:read`（2 处）、`finance:invoice:write`（1 处）——这些码在权限字典里都不存在，属注解层面的假声明。
- `sales_invoice`、`treasury_v58`、`forecasting`、`compliance_v51`、`cqrs_routes`、`event_routes`、`decision_v60`、`report_center`、`accounting_subjects` 是否仍有写端点挂在读码后面，待逐域核对。
- 审批流的「建单人与审批人不得同一角色」只靠细码区分（`finance:payment:create` vs `finance:payment:update`），没有强制职责分离（同一角色可同时持两码）；若安全侧要求 SoD，需要在 handler 级加「创建人 ≠ 审批人」校验。
