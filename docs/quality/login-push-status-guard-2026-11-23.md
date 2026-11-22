# B164 · 登录日志与移动推送状态（2026-11-23）

## 枚举
- `svc/unified-core/src/modules/audit/login_status.rs` → `LoginStatus`：`success / failed`，默认 `failed`；提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。
- 复用仓库既有 `svc/mobile/src/modules/push_status.rs` → `PushNotificationStatus`：`pending / sent / failed`，默认 `pending`；本轮不新建、不覆盖该文件。

## 代码收口
- 登录审计：`record_login` 先解析请求 `status`，非法值返回校验错误；统一插入函数 `insert_login_log` 内再次校验枚举，非法值返回 `Protocol`，SQL 绑定 `as_db_str()`；登录日志列表 `query.status` 解析后只绑定规范值。
- 移动推送：事件处理插入 `mobile.mobile_push_notifications` 时，硬编码 `'pending'` 改为绑定 `PushNotificationStatus::DEFAULT.as_db_str()`，SQL 占位符同步重排为 `$1..$11`。

## 本地 DB 应用
文件：`docs/database/login-push-status-check-candidates-2026-11-23.sql`，三个约束均 `NOT VALID`：

- `public.core_login_logs.status` → `ck_core_login_logs_status_standard`（success/failed）
- `mobile.push_notifications.status` → `ck_push_notifications_status_standard`（pending/sent/failed）
- `mobile.mobile_push_notifications.status` → `ck_mobile_push_notifications_status_standard`（pending/sent/failed）

存量：`core_login_logs` 181 行（119 failed / 62 success）；`push_notifications` 194 行（191 pending / 3 sent）；`mobile_push_notifications` 76 行全 pending，均在集合内。三表各执行一次 `'bogus'` UPDATE，均被对应标准约束拦截。`mobile_push_notifications` 应用时旧约束不存在（NOTICE skipping），新约束正常建立。

## 刷新结果
- catalog：**343 条状态 CHECK / 5 个 PG ENUM / 380 个无约束状态列**
- 盘点：**226 个 Rust 枚举 / 203 个值 / 59 个不在 DB CHECK / 214 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**70**
- 映射：共 **198 条**

## 门禁
- `cargo clippy -p topems-mobile --all-targets -- -D warnings`：PASS
- `cargo clippy -p topems-unified-core --lib --tests --no-default-features -- -D warnings`：PASS
  - 默认 feature 的 `utoipa-swagger-ui` 构建脚本需联网下载 Swagger UI，本轮 GitHub 下载返回空响应；改用无 Swagger feature 校验库与测试代码，业务代码覆盖不受影响。
- `cargo test -p topems-unified-core --lib`：566 passed / 0 failed
- `cargo test -p topems-mobile --lib`：254 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`mail.emails` 虽有状态列，但仓库未找到对应 Rust 写入模块，本轮不纳入，避免只加约束不绑代码。
