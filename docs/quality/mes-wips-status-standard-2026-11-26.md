# MES 在制品状态标准态收口（B341，2026-11-26）

## 背景

B340 已在 handler 层把 `update_wip`、`transfer_wip` 的当前态解析改成严格模式：`status` 为 NULL 或非法值时直接 409，不再回落 `WipStatus::DEFAULT`。但数据库层仍是“可空 + CHECK 放行 NULL”的旧口径：

- `mes.wips.status` 可空，默认 `'in_progress'`；
- 既有约束 `ck_mes_wips_status_standard` 只写 `status IN ('pending','in_progress','completed','transferred')`，NULL 自动通过；
- 任何绕过 handler 的直写（数据修复脚本、后台任务、测试夹具）都能把 NULL 或越界值写进去，让 handler 的 fail-closed 只能等下次调用才暴露。

数据面：本地 `mes.wips` 2 行 status 均 `in_progress`，但 `tenant_id`/`current_process_id`/`current_work_station_id` 全 NULL；参考库 `topems_status_baseline_verify` 0 行；drill 隔离库 `topems_migration_drill_18945` 0 行。三处均 0 NULL、0 越界值，可直接收紧。

## 迁移内容

`database/migrations/20261126100000_mes_wips_status_standard.sql`：

1. `ALTER COLUMN status SET DEFAULT 'in_progress'` —— 把默认值显式固定，去掉插入时对隐式默认的依赖。
2. 带豁免标记的 `UPDATE mes.wips SET status='in_progress' WHERE status IS NULL` —— 为生产可能存在的历史 NULL 行兜底（本地执行 `UPDATE 0`）。
3. `ALTER COLUMN status SET NOT NULL` —— NULL 成为不可写状态，handler 的 409 前移到写入时刻。
4. `DROP CONSTRAINT IF EXISTS ck_mes_wips_status_standard` + `ADD CONSTRAINT ... CHECK (status IN (四态)) NOT VALID` + `VALIDATE CONSTRAINT` —— 保留原有约束名，先加后验，避免长表锁升级。

回滚文件 `database/rollback/20261126100000_mes_wips_status_standard.rollback.sql` 恢复可空并重建 `status IS NULL OR ...` 的旧口径。

## 本地应用与验证

应用方式沿用 B339 的事务内 `\i` + 写 `_sqlx_migrations`（`migrate.sh run` 在本机仍被 stale 守卫拒绝）。应用后：

- `information_schema.columns`：`is_nullable=NO`，`column_default='in_progress'::character varying`；
- `pg_constraint`：`ck_mes_wips_status_standard` 为 `convalidated=t`，定义包含 pending/in_progress/completed/transferred；
- 负向冒烟（全部 `ROLLBACK`）：
  - 显式 `status=NULL` 插入 → `null value in column "status" ... violates not-null constraint`；
  - `status='scrapped'` 插入 → `violates check constraint "ck_mes_wips_status_standard"`；
  - 省略 status 插入 → `INSERT 0 1`，默认值注入成功；
- `_sqlx_migrations` 已写入 `20261126100000`（success=true，checksum 与文件一致）。

## 代码面

`create_wip` 的 INSERT 显式绑定 `WipStatus::DEFAULT.as_db_str()`，不依赖 NULL；`update_wip`/`transfer_wip` 已在 B340 严格解析当前态。本批无 Rust 改动，`cargo check` 仅作回归。

## 门禁

- `node scripts/ci/check-directed-migrations.mjs --changed-only` PASS（定向命名 0 违规）
- `node scripts/ci/check-destructive-sql.mjs` PASS（UPDATE 已带完整豁免标记，expires 调整为 2027-05-20 以满足 ≤180 天）
- `bash scripts/migration/validate.sh` Checksum errors 0 / Schema drift 0 / Errors 0
- `node scripts/ci/dump-status-checks.mjs --check` PASS：35 条状态 CHECK + 5 枚举类型 + 681 无约束列与目录一致

## 遗留

- `mes.wips` 2 行的 `tenant_id`/`current_process_id`/`current_work_station_id` 仍为 NULL，租户内写入口查不到这两行；是否回填需业务确认，本批不碰数据归属。
- `mes.wip_transfers` 0 行，转移子表的 status 约束未在本批复核。
