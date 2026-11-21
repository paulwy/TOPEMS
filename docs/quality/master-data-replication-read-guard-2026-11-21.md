# B70 · master-data 复制配置读取侧状态过滤（2026-11-21）

## 现状（改动前）
- ReplicationConfig 的 3 处 SELECT（列表、启动回读、停止回读）直接读原值，集合外状态会被 `replication_status_from_str` 静默回退 `Stopped`，可能被当作可启动对象操作。
- 候选 `mdm_replication_configs_status_check` 仅有四值定义，未应用。

## 改动
1. 3 处 SELECT 统一加 `status IN ('stopped','running','paused','lagging')`。
2. 集合外状态不再进入读链路：列表不返回，启动/停止回读为 0 行并走已有 404 分支，不会对损坏行发起 UPDATE。
3. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql`。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK）：临时把 1 行改 `bogus`，全表 2 行、过滤后可见 1 行。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 地域配置、故障转移记录读取仍未过滤。
- 过滤只隐藏损坏行，不能替代候选 CHECK 和存量修订。
- 候选 CHECK 未在生产执行。
