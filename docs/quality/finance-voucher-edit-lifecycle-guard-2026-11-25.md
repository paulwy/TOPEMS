# B323 Finance 凭证编辑生命周期守卫（2026-11-25）

## 结论

`finance.core_finance_vouchers` 本地 22 行：draft 14、approved 1、posted 8。

`update_voucher` 注释写的是“仅 draft/submitted/rejected 可更新”，实现却只拦截 `posted`：

- `approved` 凭证可以继续改日期、类型、摘要、金额与分录；
- 分录分支先更新主表、删除旧分录，再重建分录，整个过程没有当前态并发谓词；
- 读取 `company_id` 只按 `id`，无租户、无软删过滤；
- 付款单联动重建分录的 `update_voucher_lines_with_tx` 也只按 `id` 更新凭证合计，未限定租户与 `draft`。

## 代码改动

`svc/finance/src/models/mod.rs`：

- 新增 `VoucherStatus::can_edit`：仅 `draft/submitted/rejected`；
- 新增 `validate_edit`，错误信息明确列出允许状态；
- 新增 `test_voucher_status_can_edit`。

`svc/finance/src/services/finance/voucher.rs`：

1. `update_voucher` 用 `validate_edit` 替换原来的只挡 `posted`。
2. 读取 `company_id` 补 `tenant_id` 和 `deleted_at IS NULL`。
3. 分录分支主表 UPDATE 补 `tenant_id` 与 `status::text = 当前态`；`rows_affected=0` 直接返回“凭证状态已变化，请刷新后重试”，不再继续删旧分录。
4. 无分录分支 UPDATE 补 `status::text = 当前态`，`fetch_optional` 为 `None` 时返回同一冲突提示。
5. `update_voucher_lines_with_tx` 的合计 UPDATE 补 `tenant_id`、`status::text='draft'`、`deleted_at IS NULL`，0 行直接失败；`company_id` 查询补租户与软删。

无 DDL；删除、提交、审批、过账、反过账路径未改。

## 验证

- `cargo fmt -p topems-finance` PASS
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib voucher`：124 passed，含新增 `test_voucher_status_can_edit`

## 影响与风险

- 本地 1 行 `approved` 凭证由“可编辑”变为只读，符合函数注释与财务台账语义；前端若仍提供编辑入口，将收到 ValidationFailed，需要按状态隐藏。
- `posted` 8 行原本已拦截，不受影响。
- 付款单编辑联动仅允许 `draft` 凭证，与付款单自身 `DRAFT_ONLY` 状态守卫一致。
