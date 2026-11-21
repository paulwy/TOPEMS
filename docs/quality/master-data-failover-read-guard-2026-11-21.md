# B72 · master-data 故障转移记录读取侧状态过滤（2026-11-21）

## 现状（改动前）
- FailoverRecord 的 2 处 SELECT（完成转移回读、历史列表）直接读原值；`failover_status_from_str` 对集合外值回退，损坏记录会被当作可完成对象。
- 候选 `mdm_failover_records_status_check` 四值 initiated/in_progress/completed/rolled_back，未应用。

## 改动
1. 2 处 SELECT 统一加 `status IN ('initiated','in_progress','completed','rolled_back')`。
2. 集合外记录不再进入读链路：历史列表不展示，完成转移回读为 0 行走 404，不会对损坏记录执行状态更新。
3. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql`。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK）：唯一 1 行临时改 `bogus`，全表 1 行、过滤后可见 0 行。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 过滤只隐藏损坏行，不能替代候选 CHECK 和存量修订。
- 五类灾害恢复表的读取过滤已全部完成，但候选 CHECK 均未在生产执行。
