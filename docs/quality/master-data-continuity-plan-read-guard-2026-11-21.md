# B69 · master-data 连续性计划读取侧状态过滤（2026-11-21）

## 现状（改动前）
- ContinuityPlan 的 6 处 SELECT（列表、详情、编辑回读、备份测试、统计）都直接读原值；`continuity_status_from_str` 遇到集合外状态静默回退 `Draft`。
- 候选 `mdm_continuity_plans_status_check` 尚未应用，损坏数据会被当成合法草稿参与列表和统计。

## 改动
1. 6 处 SELECT 统一加 `status IN ('draft','active','tested','expired')`。
2. 集合外状态不再进入读链路：列表/统计不返回，详情与编辑返回 404，避免伪合法展示。
3. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql`。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK，残留 0）：临时把 1 行改成 `bogus`，全表 2 行、过滤后可见 1 行，确认损坏行不再进入读链路。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 复制配置、地域配置、故障转移记录三处读取仍无状态过滤，集合外值仍会静默回退。
- 过滤只隐藏损坏行，不能替代候选 CHECK 和存量修订。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
