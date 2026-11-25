# B314 Finance 凭证删除生命周期守卫（2026-11-25）

## 结论

`finance.core_finance_vouchers` 本地 18 行：`draft` 10、`posted` 7、`approved` 1。

删除入口注释写的是“仅 draft/submitted/rejected/cancelled 可删除”，实际只拦住 `posted`：

- `approved` 凭证可通过通用 delete 直接软删，绕开“审批后必须过账”的流程。
- 删除先删凭证行，再软删主表；UPDATE 只按 `tenant+id`，没有当前态与软删谓词。预读后并发过账仍会被删，凭证行已删且主表被软删。
- 重复删除已软删凭证仍会命中并返回成功。

## 代码改动

- `VoucherStatus` 新增 `can_delete()`：仅 `draft/submitted/rejected/cancelled` 允许删除；`approved/posted/reversed` 保留台账。
- delete：
  - 预读后按 `can_delete()` 拒绝，`approved` 不再可删；
  - 凭证行删除补充 `tenant_id`；
  - 主表 UPDATE 增加 `status::text = $3 AND deleted_at IS NULL`，0 行返回“状态已被并发修改”，整个事务回滚，凭证行删除不会留下半成品。

## 数据库

无 DDL。本地 18 行中 10 行草稿仍可删，7 行已过账原本就不可删；新增拦截 1 行 `approved`。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib test_voucher_status_can_delete` 1 passed（覆盖 7 个状态）。

## 遗留

反过账/反冲流程仍按 `posted` 状态走 `unpost_voucher`，本批只封闭通用删除。
