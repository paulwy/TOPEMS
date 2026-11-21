# B67 · master-data 恢复计划重复执行防护（2026-11-21）

## 现状（改动前）
- `master_data.mdm_recovery_plans`：本地 draft 2 行、completed 1 行；已有候选 `mdm_recovery_plans_status_check`，未应用。
- 执行恢复计划接口没有任何起始状态限制：已 completed / failed 的计划仍可再次执行，所有步骤会被重新刷成 completed，响应仍成功。
- UPDATE 不检查 `rows_affected`，并发删除后仍是假成功。

## 改动
1. 执行前校验计划状态：completed / failed 直接 409，不再重复执行。
2. UPDATE 增加原子状态谓词 `AND status IN ('draft','active')`，阻止并发下已完结计划被改写。
3. UPDATE 检查 `rows_affected`：0 行显式 `rollback()` 后 409。
4. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql`。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `txn-write-non2xx --changed-only` 通过。
- 本地演练（事务内 ROLLBACK，残留 0）：draft→completed `UPDATE 1`；对已 completed 行再执行 `UPDATE 0`；`bogus` → 23514。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 恢复计划读取侧仍宽松解析，集合外值回退 `Draft`。
- 没有恢复计划的状态动作端点，编辑接口仍允许状态任意互转，未与执行防护统一。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
