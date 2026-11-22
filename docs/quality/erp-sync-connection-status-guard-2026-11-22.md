# B162 · 外部 ERP 连接与同步日志状态（2026-11-22）

## 枚举
新增 `svc/integration/src/erp_status.rs`：

- `ErpConnectionStatus`：`active / inactive`，默认 `inactive`
- `ErpSyncLogStatus`：`running / success / failed`，默认 `running`

两个枚举均提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。库内 `integration` 与 `public` 镜像共用同一值源。

## 代码收口
- `handlers/erp_connections.rs`：创建连接从硬编码 `'inactive'` 改为绑定 `ErpConnectionStatus::DEFAULT`；更新连接 `status` 先枚举解析，非法值 HTTP 400。
- `external_erp.rs`：连接创建同样绑定默认枚举；更新入口非法 `status` 返回 400；同步日志插入从硬编码 `'running'` 改为绑定 `ErpSyncLogStatus::DEFAULT`；`update_sync_log_status` 参数改为枚举，所有 success/failed 调用改用枚举值。
- `sync_scheduler.rs`：`last_sync_status` 的 success/failed 从 SQL 字面量改为参数绑定枚举，成功/失败两条 UPDATE 的占位符同步重排。

## 本地 DB 应用
文件：`docs/database/erp-sync-connection-status-check-candidates-2026-11-22.sql`，五个约束均 `NOT VALID`：

- `integration.erp_connections.status` → `ck_erp_connections_status_standard`（active/inactive）
- `integration.erp_connections.last_sync_status` → `ck_erp_connections_last_sync_status_standard`（running/success/failed）
- `integration.external_erp_sync_logs.status` → `ck_external_erp_sync_logs_status_standard`（running/success/failed）
- `public.erp_connections.status` → `ck_erp_connections_status_standard`（active/inactive）
- `public.external_erp_sync_logs.status` → `ck_external_erp_sync_logs_status_standard`（running/success/failed）

存量核验：`integration.external_erp_sync_logs` 792 行全 `failed`；`public.external_erp_sync_logs` 315 行全 `failed`；`integration.erp_connections` 95 行全 `inactive`；`public.erp_connections` 38 行全 `inactive`；`last_sync_status` 全为 NULL，约束放行 NULL。

拦截验证：五列各执行一次 `'bogus'` UPDATE，均命中对应 `ck_*_status_standard` 被拒绝。

## 刷新结果
- catalog：**338 条状态 CHECK / 5 个 PG ENUM / 384 个无约束状态列**
- 盘点：**223 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **194 条**

## 门禁
- `cargo clippy -p topems-integration --all-targets -- -D warnings`：PASS
- `cargo test -p topems-integration --lib`：199 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。
