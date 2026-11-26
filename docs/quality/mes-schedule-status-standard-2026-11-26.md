# B347：MES 排产单 status 标准态（NOT NULL + 六态标准约束）

- 日期：2026-11-26
- 迁移：`database/migrations/20261126140000_mes_production_schedules_status_standard.sql`（rollback 同名 `.rollback.sql`）
- 关联：B345（handler 层空状态/并发口径）之后的数据库层收口

## 缺口

`mes.production_schedules.status` 在本机 9678 行全为 `scheduled`，`is_nullable=YES`、默认 `'pending'`，旧约束名 `production_schedules_status_check`（六态、已 VALIDATE）。列可空意味着任何绕过 handler 的写入都能留下 NULL：B345 之前读当前态直接解码 500，现在只能靠应用层返回 409 兜底，数据库本身没有防线。

## 处置

迁移按 B341（`mes.wips`）同口径：

1. `ALTER COLUMN status SET DEFAULT 'pending'`；
2. `UPDATE ... WHERE status IS NULL`（带破坏性豁免标记：`max-rows=0`、备份 `pg_dump -t mes.production_schedules`、`ticket MES-SCHED-STATUS-20261126`、`expires 2027-05-20`）——本机命中 0 行；
3. `ALTER COLUMN status SET NOT NULL`；
4. `DROP CONSTRAINT IF EXISTS production_schedules_status_check` + 重建 `ck_mes_production_schedules_status_standard`（六态：pending/scheduled/released/running/completed/cancelled，`NOT VALID` 后 `VALIDATE`）；
5. 收尾 `DO` 块断言 `is_nullable` 已为 `NO`。

六态与 `svc/mes/src/modules/production_schedule_status.rs::ProductionScheduleStatus::DB_VALUES` 完全一致；未改 Rust、未改写入字面量（新建仍走 `'pending'` 字面量，与 SQLx 编译期缓存无冲突，避免 `cargo sqlx prepare`）。

## 验证

- 本地事务内 `\i` + 写 `_sqlx_migrations`（checksum = 文件 SHA-384），`success=t`。
- 列属性：`is_nullable=NO`；约束 `ck_mes_production_schedules_status_standard` 且 `convalidated=t`。
- 事务内冒烟（均 `ROLLBACK`）：
  - `UPDATE ... SET status = NULL` → `23502 null value ... violates not-null constraint`；
  - `UPDATE ... SET status = 'bogus'` → `23514 violates check constraint "ck_mes_production_schedules_status_standard"`。
- 门禁：`validate.sh` Checksum errors 0 / Errors 0（连跑两次，首跑重生成 checksums）；`check-destructive-sql.mjs` PASS（UPDATE 带标记进 approvals）；`check-directed-migrations.mjs --changed-only` PASS；`gen-manifest.sh --check` 无漂移。

## 遗留

- `mes.work_orders.status` 仍可空（56 行全 completed 且全软删），同口径迁移可作下一批（需先确认软删行的状态回填口径）。
- `mes.production_schedules` 有 9678 行 APS 生成数据，`tenant_id` 在部分行仍为 NULL（本批未触碰；租户回填需业务确认归属）。
- 前端排产状态筛选仍接受任意字符串，非法值由 handler 400 兜底。
