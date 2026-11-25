# B312 MES 生产记录完成软删守卫（2026-11-25）

## 结论

`mes.production_records` 本地 3 行，全部 `in_progress`。

通用 update、delete 和 `start` 已有状态与软删谓词，唯一缺口在 `POST /production-records/{id}/complete`：

```sql
UPDATE mes.production_records SET ...
WHERE id = $1 AND status = $5 AND tenant_id = $3::uuid
```

没有 `deleted_at IS NULL`。一条已软删但状态仍为 `in_progress` 的记录仍可被完成，返回成功并刷新 `end_time/updated_at`，形成“已删除却仍在推进”的脏状态。

## 代码改动

- `complete_record` UPDATE 增加 `AND deleted_at IS NULL`。
- 0 行响应由 404 改为 409：“不存在、已删除或状态不允许完成”，与同模块 update/delete 的并发语义一致。

## 数据库

无 DDL。本地 3 行均未删除，完成行为不变；已软删记录不再可完成。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- 其余 production_record 单测覆盖时间转换；本批为纯 SQL 谓词，未新增运行时测试。

## 遗留

生产记录状态迁移矩阵 `pending → in_progress → completed` 已由 `ProductionRecordStatus` 守卫，本批只补终态写入的软删隔离。
