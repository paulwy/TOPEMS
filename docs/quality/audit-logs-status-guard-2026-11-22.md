# B159 · 13 张审计表状态收口（2026-11-22）

## 枚举
`lib/shared-db/src/audit.rs` 新增 `AuditLogStatus`：

- 值集：`active / inactive / archived / success / failure / failed / error / pending / unknown / not_found`
- 默认：`success`
- `AUDIT_LOG_STATUS_STANDARD` 改为直接引用 `AuditLogStatus::DB_VALUES`
- `is_valid_audit_log_status` 改为枚举解析，消除独立字符串集合
- 保留 `error`/`failed`，避免审计失败被写成 success 或旁路到其他表

## 本地 DB 应用
文件：`docs/database/audit-logs-status-check-candidates-2026-11-22.sql`

覆盖 13 个 schema 的 `audit_logs.status`：

`bi / crm / erp / hrm / iam / mes / plugin_mes / public / rs / scm / shared / srm / wms`

- 统一 `DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard` 后重建
- CHECK：`status IS NULL OR status = ANY(10 值)`
- 全部 `NOT VALID`

本次净增 **8** 个库端状态约束，另 **5** 个旧约束（bi/crm/iam/shared/srm）由三值或九值替换为统一十值。

存量值核验：

- `public.audit_logs`：success 21880 / failed 14329 / error 20 / unknown 8
- `wms.audit_logs`：error 4543 / not_found 1884 / success 816
- 其余各 schema 为 success/error 或空表，全部落在十值集合
- `public.audit_logs`、`wms.audit_logs`、`crm.audit_logs` 的 `status='bogus'` UPDATE 均被 23514 拦截，事务回滚后数据不变

## 门禁
- `cargo clippy -p topems-shared-db --all-targets -- -D warnings`：PASS
- `cargo test -p topems-shared-db --lib`：182 passed / 0 failed
- catalog：**329 条 CHECK / 5 ENUM / 393 无约束列**
- 盘点：**216 Rust 枚举 / 201 值 / 60 不在 DB CHECK / 213 前端键 / 色板缺口 0**
- 队列：**45 枚举 / 60 值全部 `internal_state`**
- 前端键不在 DB CHECK：**72**
- `request-txn`/`scope-api` 未增、`txn-write-non2xx` PASS、glossary/i18n PASS、web typecheck PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。发布需执行候选并按窗口 `VALIDATE`。
