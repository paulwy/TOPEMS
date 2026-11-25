# B310 Finance 付款单草稿并发守卫（2026-11-25）

## 结论

`finance.core_finance_payments` 本地仅 1 行，`completed`。

update/delete 都先预读 `deleted_at IS NULL + tenant` 并校验 `draft`、关联凭证为 `draft`，但写 SQL 没有带上状态谓词：

- update 的 `UPDATE ... WHERE tenant_id=$9 AND id=$10` 无 `status='draft' AND deleted_at IS NULL`。预读后并发提交（`pending`）仍会被改金额/供应商，且凭证行已被重写。
- delete 的 `UPDATE ... SET deleted_at=NOW() WHERE id=$1` 无 tenant、状态、软删谓词。预读后并发提交仍会被软删，甚至命中别的租户同名 id（依赖 RLS 兜底）。

## 代码改动

- `PaymentStatus` 新增 `DRAFT_ONLY = ["draft"]`，作为可编辑/可删除的唯一状态集合。
- update：
  - UPDATE 增加 `AND status = ANY($11) AND deleted_at IS NULL`；
  - 检查 `rows_affected`，0 行返回“已提交、已删除或状态已变化”，整个请求事务回滚（凭证行重写不会留下半成品）。
- delete：
  - UPDATE 增加 `tenant_id = $2 AND status = ANY($3) AND deleted_at IS NULL`；
  - 0 行返回“已提交、已删除或状态已变化”，不再假成功。

## 数据库

无 DDL。本地唯一付款单为 `completed`，按新规则编辑/删除均被拒绝；草稿路径行为不变。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib ap_payment_status` 4 passed（新增 `DRAFT_ONLY` 断言）。

## 遗留

付款执行/审批的状态迁移仍走 `payment_workflow`，本批只封闭通用编辑与删除的并发窗口。
