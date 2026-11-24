# B280 QMS APQP 阶段/任务状态值域与写入口守卫（2026-11-25）

## 问题

`qms.qa_apqp_phases.status` 与 `qms.qa_apqp_tasks.status` 只有 `pending / in_progress / completed` 三种业务取值（前端 mock 同口径），但：

- 两列均可空、默认 `pending`、无 CHECK；
- `PUT /apqp/phases/{id}` 与 `PUT /apqp/tasks/{id}` 都是 `status = COALESCE($n, status)` 直接覆盖任意字符串；
- 终态 `completed` 可被回退，`pending` 可跳步，且 UPDATE 无来源态条件；
- 当前两表各 0 行，无脏数据。

## 处置

### 1. 新增唯一值源

`svc/qms/src/modules/apqp_item_status.rs`：

- `ApqpItemStatus`：`Pending / InProgress / Completed`，默认 `Pending`；
- `DB_VALUES`、`as_db_str`、`from_db_str`（trim + lower，未知 `None`）；
- `can_transition_to`：
  - `pending → in_progress / completed`
  - `in_progress → completed`
  - `completed` 终态，同态幂等
- 2 条单测覆盖值域往返与迁移矩阵。

### 2. 写入口守卫

`svc/qms/src/modules/apqp.rs`：

- `update_apqp_phase` / `update_apqp_task`：
  - 请求携带 `status` 时先 trim/lower，非法值 400；
  - 按 `id + tenant_id` 读当前态；不存在 404，库内空/非法 409；
  - 目标与当前不同才调用 `can_transition_to`，非法 400；同态幂等；
  - UPDATE 增加 `AND status = $12` 绑定当前态。

## 数据库迁移

`database/migrations/20261125009000_qms_apqp_item_status_standard.sql`：

- 两张表 `status` 默认固定 `pending`、`NULL → pending`、`SET NOT NULL`；
- 各新增三态 CHECK 并 `VALIDATE`：
  - `ck_qa_apqp_phases_status_standard`
  - `ck_qa_apqp_tasks_status_standard`

回滚 `database/rollback/20261125009000_qms_apqp_item_status_standard.rollback.sql`：删除两条 CHECK，恢复可空。

## 验证

- `cargo test -p topems-qms`：268 + 230 + 12 + 13 + 13 全通过（含新增 2 条）；
- `cargo clippy -p topems-qms --all-targets -- -D warnings`：通过；
- 本地 `topems` 应用迁移后：
  - 两表 `is_nullable=NO`，默认 `'pending'::character varying`；
  - 两条 CHECK `convalidated=t`；
- 回滚：两表 `is_nullable=YES`、CHECK 计数 0；重放恢复 `NO` + 已 VALIDATE；
- 两表真实表探针（事务内 `session_replication_role=replica` 绕 FK，随后 ROLLBACK）：
  - `status='bogus'` → `23514` 被 CHECK 拒绝；
  - `status=NULL` → `23502` 被 NOT NULL 拒绝；
  - 省略 status → 默认 `pending`；
- 状态门禁：
  - `dump-status-code-inventory --check --strict-palette`：321 Rust 枚举 / 241 值 / 251 前端键，PASS；
  - `status-db-check-queue --check`、`check-status-enum-contract`、`dump-status-checks --check`：PASS。

## 备注

参考库 `topems_status_baseline_verify` 尚未应用本迁移，`dump-status-checks` 仍按基线口径输出；本地已实际应用并 VALIDATE。
