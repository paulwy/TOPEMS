# B276 QMS 整改措施状态值域与写入口守卫（2026-11-25）

## 结论

QMS `shared/fsm::ACTION` 已定义五态状态机，但 `qms.qa_corrective_actions.status` 可空、无 CHECK；`PUT /api/qms/actions/{id}` 直接写任意字符串，`POST /api/qms/actions/{id}/complete` 只判断 `status <> 'completed'`。本批把列收口到五态非空，并让更新/完成入口复用 ACTION 状态机。

## 根因与影响

- `update_action` 对 `req.status` 不做值域校验，可写入任意字符串。
- `update_action` 可把 `verified/cancelled` 终态改回 `pending/in_progress`，绕过 FSM。
- `complete_action` 只排除 `completed`，`verified` 可被回退为 `completed`，`pending` 可跳过 `in_progress` 直接完成。
- 数据库列可空且无 CHECK，Rust 侧与 DB 侧没有共同的强约束。
- 更新 SQL 无来源态条件，并发请求可互相覆盖。

## 处置

`svc/qms/src/modules/corrective_action.rs`：

- 引入 `crate::shared::fsm::{action_can_transition, is_valid_action_status}`。
- `update_action`：
  - `status` 先 `trim + lowercase`，非五态 400。
  - 按 `id + tenant_id + deleted_at IS NULL` 读当前状态：不存在 404，非法库值 409。
  - 目标态与当前态不同时调用 `action_can_transition`，非法流转 400，文案带来源/目标态。
  - `completed_at` 联动：转 `completed` 补 `COALESCE(completed_at, NOW())`；回 `pending/in_progress/cancelled` 清空；`verified` 保留。
  - UPDATE 增加 `AND status = 当前态`；并发改变返回 409。
- `complete_action`：先读当前态并校验 `action_can_transition(current, "completed")`；`completed` 冲突、`verified/cancelled` 400、`pending` 400；UPDATE 带 `AND status = 当前态`。

`database/migrations/20261125005000_qms_corrective_action_status_standard.sql`：

1. 默认值固定 `pending`。
2. NULL 归 `pending`。
3. `SET NOT NULL`。
4. 新增 `ck_qa_corrective_actions_status_standard` 五态 CHECK 并 `VALIDATE`。
5. 回滚恢复可空并移除 CHECK。

## 验证

| 验证项 | 结果 |
| --- | --- |
| 本地应用 | `is_nullable=NO`、默认 `pending`、约束 `convalidated=t` |
| 幂等复跑 | 第二次应用成功，`UPDATE 0` |
| 约束探针 | `bogus` 被 CHECK 拒绝；`NULL` 被 NOT NULL 拒绝；`in_progress` 可写 |
| 回滚/重放 | 回滚后 `is_nullable=YES`、NULL 可写；重放后回填 `pending`、`is_nullable=NO` |
| QMS 测试 | 268 + 230 + 12 + 13 + 13 passed，0 failed |
| clippy | `cargo clippy -p topems-qms --all-targets -- -D warnings` 通过 |
| 迁移校验 | 876 文件，`Checksum errors 0`、`Schema drift 0`、`Errors 0` |
