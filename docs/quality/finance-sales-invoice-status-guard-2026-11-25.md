# B288 Finance 销售发票状态守卫（2026-11-25）

## 结论

`finance.sales_invoices.status` 已有五态 CHECK（draft/issued/paid/overdue/cancelled）、NOT NULL、默认 draft，但模块内只有裸字符串，没有唯一状态源：

- `cancel_sales_invoice` 允许 `draft/issued`，**漏掉 overdue**，逾期未收发票无法取消。
- `red_flush_sales_invoice` 先读 `issued`，但随后取消原票的 UPDATE **没有任何来源态谓词**：并发两次红冲都会成功，或在发票已被回款改为 paid 后仍覆盖为 cancelled。
- 单条与批量回款确认回写发票只有 `WHERE id AND tenant_id`：draft、cancelled 发票都能被回款；已 paid 发票在余额检查前也可能进入更新路径。

## 状态机

`svc/finance/src/modules/sales_invoice.rs::SalesInvoiceStatus`

- `draft → issued / cancelled`
- `issued → paid / overdue / cancelled`
- `overdue → paid / cancelled`
- `paid / cancelled` 为终态
- 同态幂等

## 代码改动

- 新增 `SalesInvoiceStatus`：`as_str/from_db_str/can_transition_to`，2 项单测。
- `cancel_sales_invoice`：来源态白名单补 `overdue`。
- `red_flush_sales_invoice`：原票状态经枚举解析，非规范值 409；用状态机校验是否可取消；取消 UPDATE 改为 `AND status IN ('issued','overdue') RETURNING id`，0 行返回 409 并发冲突。
- 单条 `confirm_collection` 与 `batch_confirm_collections` 的发票回写：WHERE 增加 `AND status IN ('issued','overdue')`，`rows_affected=0` 返回冲突，阻止 draft/cancelled/paid 发票被回款。

## 数据库

无 DDL。`sales_invoices_status_check` 五态 CHECK 已存在并 VALIDATE，本地 `finance.sales_invoices` 当前 0 行。

## 验证

- `cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance sales_invoice_status --lib` 1 passed。
- `cargo test -p topems-finance sales_invoice_transition --lib` 1 passed。

## 遗留

`overdue` 目前没有自动标记任务，报表按 due_date 现算逾期；状态字段只在人工/未来任务写入。本批只收口写入口，不新增定时迁移。
