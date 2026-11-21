# B49 · ehs.qa_ehs_treatments / qa_ehs_treatment_actions 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_treatments`、`ehs.qa_ehs_treatment_actions`：本地均 0 行；列默认分别为 `'in_progress'` / `'pending'`；无 CHECK。
- 创建处理方案写死 `'in_progress'`、动作写死 `'pending'`；动作插入失败只打日志，主单仍提交，接口返回成功（假成功）；动作状态更新 `COALESCE($1, status)` 接受任意字符串，且每次更新都用 `completed_at=$2` 覆盖，未完成更新会把已有完成时间清空。
- 完成处理主行写死 `'completed'`，重复完成返回 404；动作 0 行被当成状态冲突返回 409，零动作处理单永远无法完成。

## 改动
1. 新增 `svc/ehs/src/modules/treatment_status.rs`：`TreatmentStatus`（in_progress/completed）与 `TreatmentActionStatus`（pending/completed），默认值、严格解析、终态不可回退，附 2 单测。
2. `accident.rs`：
   - 创建处理方案和动作改为绑定枚举默认值；动作插入失败回滚并 500，不再假成功；
   - 动作状态严格解析，未知 400，加起始态谓词，0 行由 404 改 409；
   - `completed_at` 改为仅在目标为 completed 且为空时补 `now()`，其余更新保留原值；
   - 完成处理主行绑定 completed 并限 `in_progress` 起始态，0 行 404→409；
   - 动作批量完成去掉“0 行即 409”的错误判断，零动作处理单可正常完成。
3. 候选 DDL `docs/database/ehs-treatment-status-check-candidates-2026-11-21.sql`：两个 CHECK，均 `NOT VALID`。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib treatment_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：treatment in_progress → completed `UPDATE 1`；action pending → completed `UPDATE 1`；action completed → `'done'` → 23514。
- 盘点：枚举 158→160、值 163、不在 DB CHECK 124、色板缺口 0；映射 93→95；队列 112 不变。

## 残留
- 两表 0 行，合法链只能靠演练覆盖；需要在真实事故里创建处理方案并完成一次。
- 完成处理会把该处理单下所有动作直接置 completed，即使个别动作未开始；是否要求“全部动作完成才允许完成主单”需产品确认，当前保持原语义。
- 同一事故可创建多个处理方案，`complete_treatment` 只更新 `LIMIT 1` 子查询命中的那条，其他处理单不受影响；需确认是否应限制单事故一个处理单。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
