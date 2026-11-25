# B313 Finance 付款记录删除生命周期守卫（2026-11-25）

## 结论

`finance.erp_payment_records` 本地 281 行，未删除记录全部 `active`。

update 已有完整生命周期：预读当前态、迁移矩阵、`status=$6 AND deleted_at IS NULL` 并发谓词。delete 仍只有：

```sql
UPDATE finance.erp_payment_records SET deleted_at = NOW()
WHERE tenant_id = $1 AND id = $2
```

没有状态与软删过滤。281 条启用付款记录可直接删除；`archived/written_off` 终态台账也可删除；重复删除已软删记录仍命中并返回成功。

## 代码改动

- `PaymentRecordStatus` 新增 `deletable_from() = ["inactive"]`：
  - `active` 需先通过 update 停用；
  - `archived`、`written_off` 为终态台账，不允许删除。
- delete：
  - 预读未删除当前态（缺失 404、非法状态报错、非 `inactive` 拒绝）；
  - UPDATE 增加 `status = ANY($3) AND deleted_at IS NULL`；
  - 0 行返回“状态已被并发修改，删除失败”，不再假成功。

## 数据库

无 DDL。本地 281 行全 `active`，按新规则全部不可直接删除；需先停用。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib payment_record` 3 passed（新增 `deletable_from` 断言）。

## 遗留

付款记录核销接口已有 `status='active'` 与软删谓词，本批只封闭通用 delete。
