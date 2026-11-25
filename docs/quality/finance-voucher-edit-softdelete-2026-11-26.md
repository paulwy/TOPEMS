# Finance 凭证编辑/反审核剩余软删路径（B329）

日期：2026-11-26

## 背景

`finance.core_finance_vouchers` 本地 22 行：`draft` 14 行，其中 4 行已软删；`approved` 1 行；`posted` 7 行。

B323 已给 `update_voucher` 的主表 UPDATE 补了状态谓词，但仍有三个写路径未覆盖 `deleted_at`：

- `update_voucher` 的当前态查询使用 `fetch_one`，命中已软删或不存在凭证时抛 `RowNotFound`，接口表现为 500，而不是“凭证不存在/已删除”；
- 两条凭证主表 UPDATE（有分录变更、无分录变更）只带 `status::text = 当前态`，并发软删后仍可写入；
- `unapprove_voucher` 直接按 `tenant_id + id + status IN ('approved','posted')` 反审核，已软删的 approved/posted 凭证可以被写回 `submitted`，且 0 行只返回 404，无法区分状态冲突。

## 改动

`svc/finance/src/services/finance/voucher.rs`：

- `update_voucher` 当前态查询改为 `fetch_optional`，无有效行返回“凭证不存在或已删除，不能编辑”；
- 两条主表 UPDATE 补 `AND deleted_at IS NULL`，0 行文案改为“凭证状态已变化或已删除，请刷新后重试”；
- 状态机 `validate_edit`、分录重建与事务逻辑不变。

`svc/finance/src/modules/mod.rs`：

- `unapprove_voucher` 的 UPDATE 补 `AND deleted_at IS NULL`；
- 0 行由 404 改为 409，文案“凭证不存在、已删除或状态不允许反审核”。

## 验证

- `cargo fmt -p topems-finance`
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib voucher`：124 passed / 1 ignored

本批无 migration、无 DDL。

## 风险与遗留

- 本地 4 行已软删 draft 凭证此前编辑会落到 `RowNotFound`（500）；现在统一为 400“不存在或已删除”，前端需要按 400 文案提示并刷新列表。
- `unapprove_voucher` 仍没有显式状态机校验函数，只靠 SQL 状态集合；本次仅补软删与冲突返回，未改反审核业务规则。
- 反审核入口未见 handler 级权限注解，是否由路由中间件统一拦截需另行确认；不在本批范围。
