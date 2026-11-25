# B284 Finance 凭证反过账并发守卫（2026-11-25）

## 结论

`finance.core_finance_vouchers.status` 是原生枚举 `voucher_status`，值域由 DB 锁定，`unpost_voucher` 也已用 `VoucherStatus::validate_unpost()` 只允许 posted 进入。但状态更新和账簿回滚顺序有并发缺口：

- 先读当前态校验，再软删 `core_finance_ledger`，最后才 `UPDATE ... WHERE tenant_id AND id` 改回 approved。
- 读与写之间没有来源态谓词。并发请求可以同时读到 posted、同时软删账簿，最后都“成功”改状态。
- 如果另一端在此期间把凭证取消/红冲，最终 UPDATE 仍会把凭证改回 approved，造成状态与账簿不一致。

本批把“posted → approved”改成先原子认领，再回滚账簿。

## 代码改动

`svc/finance/src/services/finance/voucher.rs::unpost_voucher`

1. 保留当前态读取与 `validate_unpost()`，用于 404 与明确 400。
2. 把状态更新提前到账簿软删之前，并增加 `AND status = 'posted' AND deleted_at IS NULL`。
3. 使用 `fetch_optional`；0 行返回 `ValidationFailed("凭证状态已被并发修改，只有已过账凭证可以反过账")`。
4. 只有认领成功后才软删 `core_finance_ledger` 并按 aux 行回滚 `core_finance_aux_balances`。
5. 最终直接返回认领时的 `RETURNING *` 记录，不再做第二次状态更新。

## 数据库

无 DDL。`status voucher_status NOT NULL DEFAULT 'draft'`，已有原生枚举锁定七态：
`draft / submitted / approved / posted / rejected / cancelled / reversed`。

当前本地数据：draft 14、posted 7、approved 1，共 22 行。

## 本地验证

- `EXPLAIN` 校验新的 UPDATE 谓词，确认 `status = 'posted'` 与 `deleted_at IS NULL` 均进入过滤条件。
- `cargo check -p topems-finance` 通过。
- `test_voucher_status_can_unpost` 通过（仅 posted 可反过账）。
- 无迁移文件，枚举 322 不变，checksums/manifest 不变。

## 残留

- 反过账目前没有独立权限/审计事件；本批只收敛状态与账簿原子性。
- `core_finance_ledger` 的软删仍按 `voucher_id` 全量处理，依赖凭证状态认领成功作为前置门。
