# B50 · ehs.qa_ehs_incident_actions 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_incident_actions`：本地 232 行，全部 `pending`，列默认 `'pending'`，无 CHECK。
- 创建写死 `'pending'`；更新接口从 JSON 里取 `status`，缺省为 `'in_progress'`，接受任意字符串，且不检查 `rows_affected`，不存在或状态不允许时仍返回成功（假成功）。
- 更新先 `commit`、再判断 SQL 结果，SQL 出错也会先提交事务；前端 `IncidentAction.status` 已声明四态（pending/in_progress/completed/verified），后端实际只有一个默认值。

## 改动
1. 新增 `svc/ehs/src/modules/incident_action_status.rs`：`IncidentActionStatus` 四态（pending/in_progress/completed/verified），默认 pending，`update_from` 只允许停留或前进，附 2 单测。
2. `accident.rs`：
   - 创建状态绑定 `DEFAULT`，响应引用枚举；
   - 更新要求显式状态，缺失 400，未知 400；
   - 加起始态谓词，0 行由假成功改 409；
   - 改为 `RETURNING status`，按数据库实际值返回，并把 `commit` 移到查询成功之后。
3. 候选 DDL `docs/database/ehs-incident-action-status-check-candidates-2026-11-21.sql`：四值 CHECK，`NOT VALID`。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib incident_action_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：pending → in_progress → completed → verified 各 `UPDATE 1`；verified → `'done'` → 23514。
- 盘点：枚举 160→161、值 163、不在 DB CHECK 124、色板缺口 0；映射 95→96；队列 112→113。

## 残留
- 本地 232 行全部 pending，in_progress/completed/verified 只靠演练覆盖。
- 更新接口现在缺失 `status` 直接 400，原来会静默写 `in_progress`；依赖旧默认的调用方需同步。
- 前端 `IncidentAction` 其他字段（action_type/description/responsible/due_date）在表里并不存在，列表接口也只返回 id/title/status/created_at，前后端契约仍有缺口，待后续批次处理。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
