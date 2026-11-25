# Finance 会计期间生命周期软删隔离（B328）

日期：2026-11-26

## 背景

`finance.core_finance_periods` 本地 1489 行，状态全部为 `open`，当前无软删记录。表同时有 `deleted_at` 与 `(tenant_id, year, month)` 唯一索引。

期间的打开/关闭链路 `open_period`、`close_period` 直接按 `tenant_id + year + month` 读取和更新，所有查询都没有 `deleted_at IS NULL`：

- 已软删的期间仍能被 `open_period` 读取并按状态重开/回滚为 `open`；
- 已软删的期间仍能被 `close_period` 读取并写成 `closed`；
- 关账前检查子期间时，会把已软删子期间一并参与“是否全部关闭”的判断；
- 两条状态 UPDATE 使用 `fetch_one`，并发下 0 行会落到数据库 `RowNotFound`，而不是明确的业务冲突。

## 改动

`svc/finance/src/services/finance/periods.rs`：

- `check_period_open`、`open_period`、`close_period` 的期间存在性查询统一补 `deleted_at IS NULL`；
- `close_period` 的子期间状态查询补 `deleted_at IS NULL`；
- 当按 `tenant/year/month` 查不到有效期间时，额外检查是否存在同名软删期间；存在则返回“会计期间已删除，不可重新开启/关闭”，避免用 INSERT 撞唯一索引变成 500；
- 两条状态 UPDATE 补 `deleted_at IS NULL`，并改为 `fetch_optional`；0 行返回“会计期间状态已变化或已删除，请刷新后重试”，不再 `fetch_one` 抛 `RowNotFound`；
- 状态机 `validate_reopen` / `validate_close` 与事务提交方式不变。

## 验证

- `cargo fmt -p topems-finance`
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib period`：83 passed

本批无 migration、无 DDL。

## 风险与遗留

- 本地 1489 行期间全部为 `open` 且无软删记录，无法用存量触发“已删期间重开/关账”路径，改动属于防御性收紧。
- 关账仍要求所有更早月份期间均为 `closed`；软删子期间不再参与判断，若业务上需要保留“已删但曾关账”的审计语义，应另建审计视图，而不是恢复软删行。
- 前端若在期间删除后仍展示重开/关账按钮，应结合删除状态隐藏，避免收到 400。
