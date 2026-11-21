# B48 · ehs.qa_ehs_investigations 状态单一源（2026-11-21）

## 现状（改动前）
- `ehs.qa_ehs_investigations`：本地 233 行，全部 `completed`，列默认 `'in_progress'`，无 CHECK。
- 启动调查写死 `'in_progress'`；更新 `status = COALESCE($4, status)` 接受任意字符串；完成调查写死 `'completed'`，重复完成时返回"不存在"（404），未区分状态冲突。
- 行映射在读不到 status 时回退字面量 `in_progress`。

## 改动
1. 新增 `svc/ehs/src/modules/investigation_status.rs`：`InvestigationStatus`（in_progress/completed，`DEFAULT = InProgress`，完成只允许从 in_progress，编辑 completed 终态不可回退），严格解析 + 2 单测。
2. `accident.rs`：
   - 启动调查状态改为绑定 `DEFAULT`；
   - 更新调查状态严格解析，未知 400，加 `status = ANY($n)` 起始谓词，0 行改 409；
   - 完成调查状态绑定 `Completed`，加只允许 `in_progress` 的起始谓词，0 行改 409；
   - 行映射默认值改引用枚举。
3. 候选 DDL `docs/database/ehs-investigation-status-check-candidates-2026-11-21.sql`：`qa_ehs_investigations_status_check`（两值，`NOT VALID`）。

## 验证
- `cargo check -p topems-ehs`、`cargo clippy -p topems-ehs --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-ehs --lib investigation_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：insert in_progress → completed `UPDATE 1`；in_progress → `'closed'` → 23514。
- 盘点：枚举 157→158、值 163、不在 DB CHECK 124、色板缺口 0；映射 92→93；队列 112 不变（新增 1、映射 resolved 1）。

## 残留
- 已有 233 行全部 completed，`in_progress` 仅靠演练覆盖；需要真实事故流程启动一次调查。
- 同一事故可重复启动调查（每次插新行），本批未做「已有未完成调查则拒绝」；需产品确认是一对一还是多次。
- `complete_investigation` 仍为 404→409 的语义变更；前端如依赖 404 文案需同步。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
