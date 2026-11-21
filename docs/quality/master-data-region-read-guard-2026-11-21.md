# B71 · master-data 地域配置读取侧状态过滤（2026-11-21）

## 现状（改动前）
- RegionConfig 的 4 处 SELECT（复制状态汇总、主地域切换目标校验、切换后快照、健康检查）直接读原值；`region_status_from_str` 对集合外值回退 `Online`，损坏地域会被当成健康在线。
- 候选 `mdm_region_configs_status_check` 三值 online/offline/degraded，未应用。

## 改动
1. 4 处 SELECT 统一加 `status IN ('online','offline','degraded')`。
2. 集合外状态不再进入读链路：健康检查/快照不展示，主地域切换目标校验为 0 行走 404，不会对损坏地域执行切换。
3. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql`。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK）：临时把 1 行改 `bogus`，全表 3 行、过滤后可见 2 行。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 故障转移记录读取仍未过滤。
- 过滤只隐藏损坏行，不能替代候选 CHECK 和存量修订。
- 候选 CHECK 未在生产执行。
