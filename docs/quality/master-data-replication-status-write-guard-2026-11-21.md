# B65 · master-data 复制状态写入口收敛（2026-11-21）

## 现状（改动前）
- `master_data.mdm_replication_configs.status`：本地 2 行全 `stopped`；已有候选 `mdm_replication_configs_status_check`，尚未应用。
- 启动/停止复制两处 UPDATE 仍写死 `'running'` / `'stopped'`，响应体也写死同样的字符串。
- 两处 UPDATE 都不检查 `rows_affected`：配置在 SELECT 后被并发删除时仍返回成功，属于假成功。

## 改动
1. 启动、停止 SQL 的状态改为绑定 `replication_status_to_str(&ReplicationStatus::Running/Stopped())`。
2. 响应 `status` 字段同步使用枚举转换，不再写死字符串。
3. 两处 UPDATE 检查 `rows_affected`：0 行先显式 `rollback()` 再返回 409。
4. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql` 的 `mdm_replication_configs_status_check`。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `txn-write-non2xx --changed-only` 通过。
- 本地演练（事务内 ROLLBACK，残留 0）：添加同名候选约束后，2 行 stopped→running→paused→lagging→stopped 每步 `UPDATE 2`；`bogus` → 23514。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 读取侧 `replication_status_from_str` 仍是宽松解析，集合外值会回退 `Stopped`；候选 CHECK `VALIDATE` 后才真正不可达。
- 同文件 `mdm_failover_records`、`mdm_recovery_plans`、`mdm_continuity_plans` 的状态仍是同类宽松解析，未处理。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
