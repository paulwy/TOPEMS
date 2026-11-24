# B271 工单状态值域与批量更新守卫

日期：2026-11-25
范围：`ticket.core_tickets.status`（六态工单状态）

## 根因

- `svc/ticket/src/models.rs` 已有 `TicketStatus` 六态（`open/in_progress/pending/resolved/closed/cancelled`），单条更新 `update_ticket` 会先校验值域、再按 `is_valid_ticket_transition` 校验来源态。
- 但 `POST /api/ticket/tickets/batch-update` 直接拼 `SET status = $3`，既未校验状态值，也未校验每张工单当前态，可绕过单条状态机把 `closed/cancelled` 回退或写入域外值；同一入口的 `priority` 也直接写入 `severity`，未校验优先级值集。
- `ticket.core_tickets.status` 只有 `NOT NULL`，没有值域 CHECK。

## 改动

- `svc/ticket/src/ticket_ext.rs` 的 `batch_update_tickets`：
  - 进入事务前校验 `status ∈ ALL_STATUSES`，非法直接 400；
  - 校验 `priority` 为 `low/medium/high/critical`，非法直接 400；
  - 事务内先按 `ids + tenant_id + deleted_at IS NULL` 读取每张工单当前状态，逐单调用 `is_valid_ticket_transition`；任一非法转移整批回滚并 400；
  - 校验通过后才执行原批量 UPDATE。
- 新增迁移 `database/migrations/20261125002000_ticket_status_standard.sql`：
  - `DO` 幂等检查并添加 `ck_core_tickets_status_standard CHECK (status IN (...)) NOT VALID`；
  - 本地显式 `VALIDATE CONSTRAINT`；列默认 `'open'`、`NOT NULL` 保持不变。
- 回滚 `database/rollback/20261125002000_ticket_status_standard.rollback.sql`：只移除约束。
- `docs/database/status-db-check-mappings.json` 新增 `TicketStatus → ticket.core_tickets.status` 映射。
- 队列重新生成；枚举/前端状态键不变。

## 本地验证

- 迁移应用成功；约束 `ck_core_tickets_status_standard` `convalidated=t`，六个值集。
- 探针（事务回滚）：
  - `status='bogus'` → `23514` 违反 CHECK；
  - `status='in_progress'` → `UPDATE 1` 成功；
  - 回滚后目标工单仍为 `open`。
- `cargo test -p topems-ticket`：226 passed + OpenAPI 1 passed，0 failed。
- `bash scripts/migration/validate.sh` 连跑两次：873 个迁移，0 errors / 0 checksum / 0 drift。
- 状态台账：188 队列 / 192 值、`db_covered 118 / real_gap 0` 不变；映射新增 1 条。

## 说明

本批没有改单条更新的既有状态机矩阵，只让批量入口复用同一套 `TicketStatus` 值域与 `is_valid_ticket_transition`；批量内任一工单非法转移会整批拒绝，避免部分成功造成状态分裂。
