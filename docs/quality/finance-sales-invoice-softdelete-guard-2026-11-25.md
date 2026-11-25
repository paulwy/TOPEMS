# B320 Finance 销售发票软删与租户隔离（2026-11-25）

## 结论

`finance.sales_invoices` 本地 0 行。表本身有 `deleted_at`，但写入口只依赖 RLS，软删与租户过滤不一致：

- `fetch_invoice_in` 接收 `tenant_id` 却完全忽略，SQL 只按 `id` 查，也没有 `deleted_at IS NULL`；GET 详情可读到已软删发票，普通租户仅靠 RLS 兜底。
- update / issue / cancel / red-flush 的 UPDATE 都没有软删过滤，已软删草稿仍可编辑、开具、取消或红冲。
- delete 使用硬 `DELETE`，没有软删语义；重复删除返回 409，但审计记录被物理删除。
- 回款确认与批量确认在锁定、回写发票时也未过滤已软删发票。

## 代码改动

- `fetch_invoice_in`：
  - 真正使用 `tenant_id`：`($2::uuid IS NULL OR tenant_id = $2::uuid)`，超级用户保留全租户读；
  - 增加 `deleted_at IS NULL`。
- update / issue / cancel / red-flush：所有发票 UPDATE 增加 `deleted_at IS NULL`。
- delete：硬删除改为软删 `SET deleted_at = NOW()`，条件为 `tenant_id + status='draft' + deleted_at IS NULL`；0 行仍返回 409。
- 回款写回：单条与批量确认的 `SELECT ... FOR UPDATE`、`UPDATE paid_amount/status` 都增加 `deleted_at IS NULL`。
- 六个发票写入口（create/update/delete/issue/cancel/red-flush）统一 nil 租户 400。

## 数据库

无 DDL。本地 0 行，不修改数据；生产已软删草稿不会再被编辑或回款写回。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance sales_invoice` 2 passed。

## 遗留

销售发票状态机（draft/issued/overdue/paid/cancelled）未改；本批只补软删、显式租户和删除语义。
