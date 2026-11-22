# WMS 库位状态治理（B110）

日期：2026-11-22
范围：`wms.locations.status`

## 问题

库位状态存在两套口径：

- 后端建表默认 `available`，状态统计 SQL 按 `available / partial / full` 计数；
- 前端 schema 展示映射用 `empty / partially_filled / full / inactive`；
- 列表把 `status` 原样过滤，未知值返回空集；
- 详情不过滤状态，也不过滤 `deleted_at`，已删除库位仍能查到；
- 创建写死 `'available'`；
- 更新接受任意 `req.status`，且 UPDATE 没有旧状态谓词。

本地 `wms.locations` 10 行，全部 `available`。

## 决策

- 规范集合采用后端实际口径：`available / partial / full / inactive`，默认 `available`。
- 旧前端值只读映射：`empty -> available`、`partially_filled -> partial`，不进入写入。
- 这是属性型状态，不设审批 FSM；允许四个值之间改判。

## 代码变更

新增 `svc/wms/src/modules/location_status.rs`：

- `LocationStatus` 四值、`DB_VALUES`、`DEFAULT = Available`；
- 严格 `from_db_str`，旧值 `from_read_str`；
- 2 个单测：默认值/往返/别名，以及别名不得进入写入。

`svc/wms/src/modules/location.rs`：

- 列表 `status` 参数严格解析，`all`/空不过滤，未知 400；SELECT 与 COUNT 都加 `status = ANY(canonical)`；SELECT 补上原先漏掉的 `deleted_at IS NULL`；
- 详情加 `status = ANY($2::text[])` 与 `deleted_at IS NULL`，集合外行 404；
- 创建不再写死 `'available'`，INSERT 绑定 `LocationStatus::DEFAULT`；
- 更新预读只取规范集合行；当前状态严格解析；传了 `status` 只接受四值，未传保持旧值；UPDATE 加旧状态谓词，0 行 409。

前端 `apps/web/src/schemas/wms/location.ts` 展示映射改为 `available / partial / full / inactive`；`apps/web/src/utils/status.ts` 补 `full: error`。

## 验证

- `cargo check -p topems-wms`：通过
- `cargo clippy -p topems-wms --all-targets -- -D warnings`：通过
- `cargo test -p topems-wms --lib`：`563 passed`（B109 为 561）
- Web typecheck：通过；lint：0 errors（156 warnings，存量）
- `dump-status-code-inventory --check --strict-palette`：185 枚举 / 200 前端键，色板缺口 0
- `status-db-check-queue --check`：129 枚举 / 146 值，分桶一致

## 候选约束演练

候选文件：`docs/database/wms-location-status-check-candidates-2026-11-22.sql`
约束：`ck_wms_locations_status_standard`（避免与 `gis.locations` 同名），四值，`NOT VALID`。

本地事务内：

1. `ALTER TABLE wms.locations ADD CONSTRAINT ... NOT VALID` 成功；
2. 任取一行 `available` 改 `partial`，`UPDATE 1`；
3. 同一行改 `bogus`，触发 `23514 ck_wms_locations_status_standard`；
4. 事务回滚后 `wms.locations` 上的约束计数 `0`，10 行仍全部 `available`。

## 残留

- 候选 CHECK 尚未进入迁移、未在生产执行。
- 库位删除仍未限制状态；本批只统一 `status` 值域和写入口。
- 库位占用状态若由库存变化自动推导，当前没有联动逻辑，仍由写入方显式维护。
