# B279 QMS APQP 项目状态值域与写入口守卫（2026-11-25）

## 问题

`shared/fsm::APQP` 已定义六态 `planning / in_design / in_pilot / in_production / completed / cancelled`，但 `qms.qa_apqp_projects.status`：

- 可空、默认 `planning`、无 CHECK；
- `PUT /apqp/projects/{id}` 的 `status = COALESCE($7, status)` 直接覆盖任意字符串，终态可回退、可跳步；
- `/approve`、`/complete`、`/cancel` 虽然先读当前态并调用 FSM，但 UPDATE 只带 `id + tenant_id`，没有 `AND status=当前态`，并发下可重复推进；
- 当前表 0 行，无脏数据。

## 处置

`svc/qms/src/modules/apqp.rs`：

- `update_apqp_project`：
  - 请求携带 `status` 时先 trim/lower，并用 `is_valid_apqp_status` 校验值域，非法 400；
  - 成功开启事务后按 `id + tenant_id + deleted_at IS NULL` 读当前态；不存在 404，库内空/非法 409；
  - 目标与当前不同才调用 `apqp_can_transition`，非法 400；同态幂等；
  - UPDATE 增加 `AND status = $17` 绑定当前态。
- `approve_apqp / complete_apqp / cancel_apqp`：
  - UPDATE 增加 `AND status = $3` 并绑定已读当前态；
  - `fetch_one` 改 `fetch_optional`，空行返回 409「状态已变更」。

未新增 Rust 枚举：六态唯一源继续使用 `shared/fsm::APQP`，避免第二套定义。

## 数据库迁移

`database/migrations/20261125008000_qms_apqp_project_status_standard.sql`：

1. `status` 默认固定 `planning`；
2. `NULL → planning`；
3. `SET NOT NULL`；
4. DROP 同名旧约束后新增
   `ck_qa_apqp_projects_status_standard CHECK (status IN (六态)) NOT VALID`；
5. `VALIDATE CONSTRAINT`。

回滚 `database/rollback/20261125008000_qms_apqp_project_status_standard.rollback.sql`：删除 CHECK，恢复可空。

## 验证

- `cargo test -p topems-qms`：268 + 230 + 12 + 13 + 13 全通过；
- `cargo clippy -p topems-qms --all-targets -- -D warnings`：通过；
- 本地 `topems` 应用迁移后：
  - `is_nullable=NO`，默认 `'planning'::character varying`；
  - CHECK `convalidated=t`；
- 回滚：`is_nullable=YES`、CHECK 计数 0；重放恢复 `NO` + 已 VALIDATE；
- 真实表探针（事务内 INSERT 后 ROLLBACK）：
  - `status='bogus'` → `23514` 被 CHECK 拒绝；
  - `status=NULL` → `23502` 被 NOT NULL 拒绝；
  - 省略 status → 默认 `planning`。

## 备注

本批不改变 API 契约，仅收紧状态值域与来源态；前端不需要新状态值。
