# B68 · master-data 恢复计划读取侧状态过滤（2026-11-21）

## 现状（改动前）
- `mdm_recovery_plans` 列表、执行、详情三处 SELECT 都直接读原值；`recovery_plan_status_from_str` 遇到集合外状态静默回退 `Draft`，损坏数据会被当成草稿展示，执行接口也会把它当正常计划。
- 候选 `mdm_recovery_plans_status_check` 尚未应用，存量无法依赖 DB 拦截。

## 改动
1. 恢复计划列表、执行、详情三处 SELECT 统一加 `status IN ('draft','active','executing','completed','failed')`。
2. 集合外状态不再被解析成 `Draft`：列表不会返回，详情/执行返回 404，避免伪合法展示与误执行。
3. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql`，本批不新增。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK，残留 0）：临时把 1 行改成 `bogus`，全表 3 行、过滤后可见 2 行，确认损坏行不再进入读链路。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 连续性计划、复制配置、地域配置、故障转移记录四处读取仍无状态过滤，集合外值仍会静默回退，需继续逐表处理。
- 过滤只是隐藏损坏行，不能替代候选 CHECK 与存量修订；`VALIDATE CONSTRAINT` 仍会因这些行失败。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
