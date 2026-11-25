# B285 Finance 凭证审核生命周期守卫（2026-11-25）

## 结论

`core_finance_vouchers` 的提交/审核/驳回/过账四个入口都已带来源态条件，但存在两个一致性问题：

- 前置读取用 `fetch_one`，状态不符时直接落到数据库错误，接口返回 500，而不是明确的 400。
- 最终 UPDATE 只校验来源态，没有 `deleted_at IS NULL`。读与写之间若凭证被软删，仍可完成提交/审核/驳回/过账。

本批统一为前置 `fetch_optional` + 400，并在四条状态 UPDATE 上补软删条件。

## 代码改动

`svc/finance/src/services/finance/voucher.rs`

- `submit_voucher`：
  - 前置读取 `fetch_optional`，非 draft/不存在返回 400。
  - UPDATE 增加 `AND deleted_at IS NULL`，0 行返回 400。
- `approve_voucher`：同上，目标 `submitted → approved`。
- `reject_voucher`：同上，目标 `submitted → rejected`。
- `post_voucher`：
  - 前置读取 `fetch_optional`，非 approved/不存在返回 400。
  - 最终原子 UPDATE 增加 `AND deleted_at IS NULL`。

`post_voucher` 的 ledger/aux 写入仍在同一请求事务内；最终状态认领失败会整体回滚，不会留下半套账簿。

## 数据库

无 DDL。状态仍由 `voucher_status` 原生枚举约束。

## 本地验证

- `EXPLAIN` 校验 draft→submitted、approved→posted 两条 UPDATE，`deleted_at IS NULL` 与来源态均进入过滤。
- `cargo check -p topems-finance` 通过。
- `cargo test -p topems-finance test_voucher_status --lib`：20 passed。
- 枚举 322 不变，无迁移文件。

## 残留

- `post_voucher` 在最终状态认领前会先写 ledger/aux，依赖同一事务回滚；后续可考虑先认领再写账簿，进一步缩短锁窗口。
- 批量提交/审核/过账在独立入口中仍逐条调用本方法，错误聚合策略不变。
