# B166 · SCM 同步日志状态（2026-11-23）

## 枚举
- `svc/scm/src/modules/sync_log_status.rs` → `SyncLogStatus`：`pending / in_progress / success / failed`，默认 `pending`。
  - 与既有 `SyncRecordStatus`（`pending / running / completed / failed`）区分：`scm.sync_logs` 的存量与统计口径使用 `success`，不能复用记录表的 `completed` 词表。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 同步日志写入 `record_sync_log_txn`：入口先解析状态枚举，非法值返回 `sqlx::Error::Protocol`；`executed_at` 判定从字符串比较改为 `SyncLogStatus::Success`。
- 同步日志列表 `get_sync_logs`：`status` 过滤支持空 / `all` 不过滤，非法值返回 400，SQL 只绑定规范值。
- 失败重试 `retry_failed_syncs`：`SET status = 'pending'` 改为参数绑定 `SyncLogStatus::Pending`，占位符同步重排为 `$1..$6`。

## 本地 DB 应用
文件：`docs/database/scm-sync-log-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `scm.sync_logs.status` → `ck_scm_sync_logs_status_standard`（四值）

存量 131 行全 `failed`，在集合内。执行一次 `'bogus'` UPDATE，被标准约束拦截。

## 刷新结果
- catalog：**345 条状态 CHECK / 5 个 PG ENUM / 378 个无约束状态列**
- 盘点：**228 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **200 条**

## 门禁
- `cargo clippy -p topems-scm --all-targets -- -D warnings`：PASS
- `cargo test -p topems-scm --lib`：347 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`scm.sync_record_details.status` 当前无写入方，本轮不纳入，避免只加约束不绑代码。
