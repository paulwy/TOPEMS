# B64 · master-data 地域状态写入口收敛（2026-11-21）

## 现状（改动前）
- `master_data.mdm_region_configs.status`：本地 3 行，online/offline/degraded 各 1；列已有候选 CHECK（ `master-data-status-check-candidates-2026-11-21.sql`），尚未应用。
- 故障转移与主地域切换共三处 UPDATE 仍写死 `'offline'` / `'online'` 字面量。
- 三处 UPDATE 都只判断数据库错误，不检查 `rows_affected`：地域不存在时接口仍返回成功，故障切换结果是假的。
- 主地域切换的重置语句曾被错误地多绑定一个状态参数（`$3` 不存在），本次一并修正。

## 改动
1. 三处地域状态写入改绑 `region_status_to_str(&RegionStatus::Offline/Online())`，不再写死字面量。
2. 源地域、目标地域、主地域三处 UPDATE 都检查 `rows_affected`：0 行先显式 `rollback()` 再返回 409，避免部分写入被请求事务静默丢弃，也不再假成功。
3. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql` 中的 `mdm_region_configs_status_check`，不新增文件。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- 本地演练（事务内 ROLLBACK，残留 0）：添加同名候选约束后，online→offline `UPDATE 1`、offline→degraded `UPDATE 2`、degraded→online `UPDATE 3`；`bogus` → 23514。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 读取侧 `region_status_from_str` 仍是宽松解析，遇到集合外值会回退 `Online`；候选 CHECK `VALIDATE` 后该路径才真正不可达。
- `mdm_replication_configs`、`mdm_failover_records`、`mdm_recovery_plans`、`mdm_continuity_plans` 仍是同类宽松解析，未在本批处理。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
