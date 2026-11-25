# Finance 收款核销软删守卫（B327）

日期：2026-11-25

## 背景

`finance.erp_collection_records` 本地 553 行，状态全部为 `pending`，当前无已软删记录。

收款模块的 `update_collection`、`delete_collection` 均已在当前态查询与写条件中补齐 `tenant_id`、`deleted_at IS NULL` 和状态谓词，但 `write_off_collection` 的核销 UPDATE 仍只按 `tenant_id + id` 定位，并只校验 `pending/confirmed`：

```sql
UPDATE finance.erp_collection_records
SET status = 'written_off'
WHERE tenant_id = $1 AND id = $2
  AND COALESCE(status, 'pending') IN ('pending', 'confirmed')
```

记录被软删后，只要状态仍停留在 `pending/confirmed`，仍可通过核销接口把 `deleted_at` 已置位的行改成 `written_off`，等于让软删台账重新产生业务终态写入。

## 改动

`svc/finance/src/services/finance/collection.rs`：

- `write_off_collection` 的 UPDATE 增加 `AND deleted_at IS NULL`；
- 0 行返回文案改为“收款记录不存在、已删除或当前状态不可核销”，与已删记录的实际原因一致；
- 租户条件、状态集合、目标态 `written_off`、事务提交方式均不变。

## 验证

- `cargo fmt -p topems-finance`
- `cargo check -p topems-finance` PASS
- `cargo test -p topems-finance --lib collection_status`：5 passed

本批无 migration、无 DDL。

## 风险与遗留

- 本地 553 行均为 `pending` 且无软删记录，无法用存量触发“已删后核销”路径；改动属于防御性收紧。
- 核销仍只落 `erp_collection_records.status`，`receivable_id` / `write_off_amount` 仅回显，应收台账核销回写仍待立项。
- 前端若在记录删除后仍展示核销入口，应结合 `deleted_at` 隐藏，避免用户收到 400。
