# B348：MES 工单 status 标准态（NOT NULL + 五态标准约束）

- 日期：2026-11-26
- 迁移：`database/migrations/20261126150000_mes_work_orders_status_standard.sql`（rollback 同名 `.rollback.sql`）
- 关联：B340/B341（wips）、B345/B347（排产单）同口径的数据库层收口

## 缺口

`mes.work_orders.status` 在本机 56 行全为 `completed`，且 56 行全部已软删；NULL 0 行；`is_nullable=YES`、默认 `'pending'`；旧约束 `work_orders_status_check` 五态已 VALIDATE。列可空即意味着绕过 handler 的写入可以留 NULL，`WorkOrderStatus::from_db_str(None)` 只能靠应用层兜底。

## 处置

迁移 `20261126150000`：

1. `ALTER COLUMN status SET DEFAULT 'pending'`；
2. `UPDATE ... WHERE status IS NULL`（破坏性豁免标记：`max-rows=0` fail-closed、`pg_dump -t mes.work_orders` 备份、`ticket MES-WO-STATUS-20261126`、`expires 2027-05-20`）——本机 0 行命中；
3. `ALTER COLUMN status SET NOT NULL`；
4. `DROP CONSTRAINT IF EXISTS work_orders_status_check` + 重建 `ck_mes_work_orders_status_standard`（五态 pending/in_progress/paused/completed/cancelled，`NOT VALID`→`VALIDATE`）；
5. `DO` 块断言 `is_nullable=NO`。

五态与 `svc/mes/src/modules/work_order_status.rs::WorkOrderStatus::DB_VALUES` 一致；存量 56 行软删完工单的 `status` 值不改动，只加约束。新建入口原本就 `.bind(WorkOrderStatus::DEFAULT.as_db_str())`，无 Rust 改动、无需 `cargo sqlx prepare`。

## 验证

- 本地事务内 `\i` + 写 `_sqlx_migrations`（checksum = 文件 SHA-384），`success=t`。
- 列属性 `is_nullable=NO`；约束 `ck_mes_work_orders_status_standard` 且 `convalidated=t`。
- 事务内冒烟（均 `ROLLBACK`）：
  - `UPDATE ... SET status = NULL` → `23502 not-null constraint`；
  - `UPDATE ... SET status = 'bogus'` → `23514 violates check constraint "ck_mes_work_orders_status_standard"`。
- 门禁：`validate.sh` 连跑两次 Checksum errors 0 / Errors 0；`check-destructive-sql.mjs` PASS；`check-directed-migrations.mjs --changed-only` PASS；`gen-manifest.sh --check` 无漂移。

## 遗留

- 56 行工单全部软删且全 `completed`：是否清理是业务决定，本批不动数据。
- `mes.work_orders` 其它可空列（`order_id`/`process_id`/`work_station_id`/`end_date` 等）是否收口未评估，属下一轮结构审计范围。
- 工单状态机在 handler 层的并发谓词（`AND status = 当前态`）是否全覆盖未在本批复查。
