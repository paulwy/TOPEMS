# B295 MES 生产工序生命周期守卫（2026-11-25）

## 结论

`mes.production_processes` 本地 10 行、status 全为 `active`，三态 CHECK 已存在，但三个写入口都缺软删过滤：

- `PUT /production-processes/{id}`：WHERE 只有 `status='active'`，没有 `deleted_at IS NULL`，已软删工序仍可改名/改版本/改工位。
- `PUT /production-processes/{id}/deactivate`：同样只判 `status='active'`，已软删工序仍可被停用。
- `DELETE /production-processes/{id}`：只按 `id + tenant_id`，可对 `inactive`、`archived`（历史）或已软删记录重复软删。

## 代码改动

- update：`WHERE id AND status='active' AND tenant_id AND deleted_at IS NULL`。
- deactivate：`WHERE id AND status='active' AND tenant_id AND deleted_at IS NULL`。
- delete：`WHERE id AND tenant_id AND status IN ('active','inactive') AND deleted_at IS NULL`，保留 `archived` 台账不被误删；已归档/已删除时 0 行，返回原“不存在”语义。

## 数据库

无 DDL。`ck_production_processes_status_standard` 三态 CHECK 已存在；本地 10 行全部 `active`，合法。

## 验证

- `cargo check -p topems-mes` PASS。

## 遗留

三态中的 `archived` 没有写入口，也没有归档接口；本批只保证 archived 不被 delete 误删，归档动作待业务流程确认后单独补。
