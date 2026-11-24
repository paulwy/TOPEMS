# B278 QMS 审核任务状态值域与写入口守卫（2026-11-25）

## 问题

`qms.qa_audit_tasks.status` 只有 `pending / in_progress / completed` 三种业务取值（前端 mock 同口径），但数据库层：

- 列可空，默认 `pending`，无 CHECK；
- `create_audit_task` 以字符串 `'pending'` 落库；
- `complete_audit_task` 直接 `SET status='completed'`，不读取来源态、不校验流转，UPDATE 也不带 `AND status=...`；
- 并发下同一任务可被重复完成，或把非规范状态直接覆盖成 `completed`。

本地表当前 0 行，未命中脏数据。

## 处置

### 1. 新增唯一值源

`svc/qms/src/modules/audit_task_status.rs`：

- `AuditTaskStatus`：`Pending / InProgress / Completed`，默认 `Pending`；
- `DB_VALUES` 三态、`as_db_str`、`from_db_str`（trim + lower，未知返回 `None`）；
- `can_transition_to`：
  - `pending → in_progress / completed`
  - `in_progress → completed`
  - `completed` 终态
  - 同态幂等
- 2 条单测覆盖值域往返与完整迁移矩阵。

### 2. 写入口守卫

`svc/qms/src/modules/audit.rs`：

- 创建任务的状态值改为绑定 `AuditTaskStatus::DEFAULT.as_db_str()`，不再硬编码 `'pending'`；
- `complete_audit_task`：
  - 先按 `id + tenant_id` 读当前状态；
  - 不存在返回 404；库内值不在三态返回 409；
  - 已 `completed` 返回 409；非法流转返回 400；
  - UPDATE 增加 `AND status = 当前态`，返回空行按并发变更返回 409。

## 数据库迁移

`database/migrations/20261125007000_qms_audit_task_status_standard.sql`：

1. `status` 默认固定 `pending`；
2. `NULL → pending`；
3. `SET NOT NULL`；
4. DROP 同名旧约束后新增
   `ck_qa_audit_tasks_status_standard CHECK (status IN ('pending','in_progress','completed')) NOT VALID`；
5. `VALIDATE CONSTRAINT`。

回滚 `database/rollback/20261125007000_qms_audit_task_status_standard.rollback.sql`：删除 CHECK，恢复可空。

## 验证

- `cargo test -p topems-qms`：268 + 230 + 12 + 13 + 13 全通过（含新增 2 条）；
- `cargo clippy -p topems-qms --all-targets -- -D warnings`：通过；
- 本地 `topems` 应用迁移后：
  - `is_nullable=NO`，默认 `'pending'::character varying`；
  - CHECK `convalidated=t`；
- 回滚：`is_nullable=YES`、CHECK 计数 0；重放恢复 `NO` + 已 VALIDATE；
- 真实表探针（事务内 `session_replication_role=replica` 绕 FK，随后 ROLLBACK）：
  - `status='bogus'` → `23514` 被 CHECK 拒绝；
  - `status=NULL` → `23502` 被 NOT NULL 拒绝；
  - 省略 status → 默认写入 `pending`；
- 状态门禁：
  - `dump-status-code-inventory --check --strict-palette`：320 Rust 枚举 / 241 值 / 251 前端键，PASS；
  - `status-db-check-queue --check`：188 枚举 / 192 值，PASS；
  - `check-status-enum-contract`：12/12 一致；
  - `dump-status-checks --check`：基于参考库基线口径 PASS。

## 备注

参考库 `topems_status_baseline_verify` 尚未应用本迁移，因此 `dump-status-checks` 仍按基线输出，不反映本批新增 CHECK；本地已实际应用并 VALIDATE。
