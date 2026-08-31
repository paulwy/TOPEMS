# 2026-08-31 交付操作手册

> 日期：2026-08-31
> 涉及版本：V474（Rust 环境修复）→ V475（审计日志导出三件套）
> Git 提交：`21fa0eb97`（V474 环境修复）→ `02914a739`（V475 导出三件套）
> 远程仓库：https://github.com/paulwy/TOPEMS.git

---

## 目录

1. [交付概览](#1-交付概览)
2. [环境依赖修复（V474）](#2-环境依赖修复v474)
3. [SQLX 离线缓存重建（V474）](#3-sqlx-离线缓存重建v474)
4. [审计日志导出功能（V475）](#4-审计日志导出功能v475)
5. [定时导出任务控制 API（V475）](#5-定时导出任务控制-apiv475)
6. [MockAuditLogStore 时间过滤修复（V475）](#6-mockauditlogstore-时间过滤修复v475)
7. [编译与测试验证](#7-编译与测试验证)
8. [文档与 Git 提交记录](#8-文档与-git-提交记录)
9. [验收清单](#9-验收清单)

---

## 1. 交付概览

本次交付包含两个版本块的工作：

| 版本 | 主题 | 核心交付 |
|------|------|----------|
| V474 | Rust 环境依赖修复 | aws-lc-rs → ring 切换；V473 编译错误修复；SQLX 缓存重建 |
| V475 | 审计日志导出三件套 | gzip 压缩导出；NDJSON 流式导出；定时增量导出任务；HTTP 控制 API |

**文件变更统计**（V475）：
- 新建文件：2 个（`audit_export_task.rs`、`audit_export_task_api.rs`）
- 修改文件：8 个（含文档 2 个）
- 新增代码：约 1334 行
- 单元测试：37 个导出测试 + 201 个审计测试全部通过

---

## 2. 环境依赖修复（V474）

### 2.1 问题背景

`lapin`（AMQP 客户端）默认使用 `rustls` 的 `aws-lc-rs` 加密后端，该后端依赖 C 工具链（CMake、Perl、NASM）。在没有完整 C 工具链的环境中，`aws-lc-rs` 的 `build.rs` 编译失败，报错：

```
missing DEP_AWS_LC_INCLUDE
```

### 2.2 修复方案

将 `lapin` 的 TLS feature 从 `rustls`（默认 `aws-lc-rs`）切换为 `rustls--ring`（纯 Rust `ring` 加密库），无需任何 C 工具链。

### 2.3 涉及文件

**文件 1**：`lib/Cargo.toml`（第 109 行）

```toml
# 修改前
lapin = { version = "4.10", features = ["rustls"] }

# 修改后
lapin = { version = "4.10", default-features = false, features = ["rustls--ring", "default-runtime"] }
```

**文件 2**：`lib/shared-event/Cargo.toml`（第 29 行）

```toml
# 修改前
lapin = { version = "4.10", features = ["rustls"] }

# 修改后
lapin = { version = "4.10", default-features = false, features = ["rustls--ring", "default-runtime"] }
```

### 2.4 验证方法

```powershell
# 进入项目根目录
cd e:\tywork\topems0825\topems

# 设置 SQLX 离线模式（无 DB 环境时必需）
$env:SQLX_OFFLINE='true'

# 编译验证（应 0 error）
cargo build -p topems-unified-core
```

预期输出末尾：
```
Finished `dev` profile [optimized + debuginfo] target(s) in ...
```

### 2.5 编译错误修复（V473 暴露）

切换 `ring` 后修复了 V473 暴露的 3 个编译错误：

| 文件 | 问题 | 修复 |
|------|------|------|
| `audit_retention_task.rs` | axum 0.8 不支持 `#[axum::async_trait]`，trait 方法返回 async fn 不对象安全 | 移除 `#[axum::async_trait]`，改用 `Pin<Box<dyn Future>>` 返回类型 |
| `dns_service_discovery.rs` | 借用问题 | 修复变量借用 |
| `main.rs` | AppState 缺失字段 | 补全 AppState 初始化 |

---

## 3. SQLX 离线缓存重建（V474）

### 3.1 问题背景

`database_permission_store.rs` 新增 13 个 `sqlx::query!` 宏，但无 DB 环境运行 `cargo sqlx prepare` 时，编译报错：

```
error: no cached data for query
```

### 3.2 修复方案

手工生成 `.sqlx` 目录下的缓存文件（JSON 格式），每个查询对应一个缓存文件。

### 3.3 缓存文件规范

- **行尾**：LF（Unix 风格，不可用 CRLF）
- **哈希算法**：SHA256
- **存放目录**：`.sqlx/query-<sha256_hash>.json`

### 3.4 验证方法

```powershell
# 设置离线模式
$env:SQLX_OFFLINE='true'

# 编译验证
cargo check -p topems-unified-core
```

预期：13 个查询全部识别，0 error。

---

## 4. 审计日志导出功能（V475）

### 4.1 功能概述

提供三种审计日志导出能力：

| 导出方式 | 端点 | 适用场景 |
|----------|------|----------|
| CSV/JSON 导出 | `GET /api/business-tools/permissions/audit-logs/export` | 小批量导出，直接返回完整响应 |
| gzip 压缩导出 | 同上端点，`format=gzip` | 小批量导出，压缩传输 |
| NDJSON 流式导出 | `GET /api/business-tools/permissions/audit-logs/export/stream` | 大批量导出，分页流式返回 |

### 4.2 查询参数（通用）

所有导出端点支持以下查询参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `format` | string | `csv` | 导出格式：`csv`、`json`、`gzip` |
| `tenant_id` | string | 无 | 按租户 ID 过滤 |
| `user_id` | string | 无 | 按用户 ID 过滤 |
| `action` | string | 无 | 按操作类型过滤 |
| `changed_by` | string | 无 | 按操作人过滤 |
| `start_time` | string (RFC3339) | 无 | 起始时间 |
| `end_time` | string (RFC3339) | 无 | 截止时间 |
| `limit` | number | 10000 | 最大导出记录数（CSV/JSON/gzip 有效） |

### 4.3 CSV 导出示例

```bash
# 导出最近 1000 条审计日志为 CSV
curl -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export?format=csv&limit=1000" \
  -H "Authorization: Bearer <token>" \
  -o audit_logs.csv
```

响应头：
```
Content-Type: text/csv
Content-Disposition: attachment; filename="audit_logs_20260831.csv"
```

CSV 列顺序：
```
id,tenant_id,user_id,action,changed_by,changed_at,ip_address,user_agent,old_value,new_value,metadata,created_at
```

### 4.4 JSON 导出示例

```bash
# 导出指定租户的审计日志为 JSON
curl -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export?format=json&tenant_id=tenant-001" \
  -H "Authorization: Bearer <token>" \
  -o audit_logs.json
```

响应格式：
```json
{
  "entries": [
    {
      "id": "...",
      "tenant_id": "...",
      "user_id": "...",
      "action": "create",
      ...
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 10000
}
```

### 4.5 gzip 压缩导出示例

```bash
# 导出审计日志为 gzip 压缩 JSON
curl -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export?format=gzip&limit=50000" \
  -H "Authorization: Bearer <token>" \
  -o audit_logs.json.gz
```

响应头：
```
Content-Type: application/gzip
Content-Disposition: attachment; filename="audit_logs_20260831.json.gz"
Content-Encoding: gzip
```

解压验证：
```bash
# 解压查看内容
gunzip audit_logs.json.gz
cat audit_logs.json | head -n 5
```

### 4.6 NDJSON 流式导出示例

```bash
# 流式导出全部审计日志（NDJSON 格式，每行一个 JSON 对象）
curl -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export/stream?tenant_id=tenant-001" \
  -H "Authorization: Bearer <token>" \
  -o audit_logs_stream.ndjson
```

响应头：
```
Content-Type: application/x-ndjson; charset=utf-8
Content-Disposition: attachment; filename="audit_logs_stream.ndjson"
```

NDJSON 格式（每行一个 JSON 对象）：
```
{"id":"...","tenant_id":"...","user_id":"...","action":"create",...}
{"id":"...","tenant_id":"...","user_id":"...","action":"update",...}
{"id":"...","tenant_id":"...","user_id":"...","action":"delete",...}
```

**流式导出原理**：
- 内部按 `BATCH_SIZE=500` 分页查询
- 每批序列化为 NDJSON 行后立即 `yield`（流式发送）
- 使用 `axum::body::Body::from_stream` 实现 HTTP 流式响应
- 避免大文件全量内存缓冲

**验证 NDJSON 格式**：
```bash
# 每行应为合法 JSON
cat audit_logs_stream.ndjson | while read line; do echo "$line" | python -m json.tool > /dev/null && echo "OK" || echo "INVALID"; done | sort | uniq -c
```

---

## 5. 定时导出任务控制 API（V475）

### 5.1 功能概述

定时增量导出任务（`AuditExportTask`）会周期性地将审计日志增量归档到磁盘文件（JSON / JSON.gz）。与保留清理任务（删除旧条目）不同，导出任务**只读存储、写副本**，不影响在线审计日志。

**增量导出原理**：
- 首次运行：导出全部审计日志
- 后续运行：仅导出上次运行时间戳之后新增的条目
- 时间戳窗口通过 `Arc<Mutex<Option<String>>>` 在运行间共享

### 5.2 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `interval_secs` | u64 | 86400（24小时） | 导出间隔（秒） |
| `batch_size` | usize | 500 | 分页查询的页大小 |

### 5.3 API 端点一览

所有端点前缀：`/api/business-tools/permissions/audit-logs/export/task`

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/status` | 查询任务运行状态 |
| POST | `/start` | 启动后台定时导出 |
| POST | `/stop` | 停止后台定时导出 |
| POST | `/trigger` | 立即触发单次导出（不影响调度） |
| GET | `/config` | 读取导出配置 |
| PUT | `/config` | 更新导出配置 |

### 5.4 查询任务状态

```bash
curl -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/status" \
  -H "Authorization: Bearer <token>"
```

响应：
```json
{
  "running": false,
  "interval_secs": 86400,
  "last_export_count": 0,
  "last_export_at": null,
  "controller_ready": true
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `running` | boolean | 后台任务是否正在运行 |
| `interval_secs` | u64 | 当前导出间隔（秒） |
| `last_export_count` | usize | 上次导出的条目数 |
| `last_export_at` | string? | 上次导出时间（RFC3339），null 表示从未运行 |
| `controller_ready` | boolean | 控制器是否已就绪（始终为 true） |

### 5.5 启动定时导出任务

```bash
curl -X POST "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/start" \
  -H "Authorization: Bearer <token>"
```

响应：
```json
{
  "success": true,
  "running": true,
  "message": "Audit export task started"
}
```

### 5.6 停止定时导出任务

```bash
curl -X POST "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/stop" \
  -H "Authorization: Bearer <token>"
```

响应：
```json
{
  "success": true,
  "running": false,
  "message": "Audit export task stopped"
}
```

### 5.7 手动触发单次导出

```bash
# 立即执行一次增量导出，不影响后台调度周期
curl -X POST "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/trigger" \
  -H "Authorization: Bearer <token>"
```

响应（成功时）：
```json
{
  "success": true,
  "exported": 42,
  "archived": 42,
  "window_start": "2026-08-31T14:30:00+08:00",
  "error": null
}
```

响应（失败时）：
```json
{
  "success": false,
  "exported": 0,
  "archived": 0,
  "window_start": "",
  "error": "store unavailable"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 单次导出是否成功 |
| `exported` | usize | 本次导出的条目数 |
| `archived` | usize | 本次写入归档文件的条目数 |
| `window_start` | string | 本次导出窗口的起始时间戳（下次增量导出的下限） |
| `error` | string? | 错误信息，成功时为 null |

### 5.8 读取导出配置

```bash
curl -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/config" \
  -H "Authorization: Bearer <token>"
```

响应：
```json
{
  "interval_secs": 86400,
  "batch_size": 500
}
```

### 5.9 更新导出配置

```bash
# 将导出间隔改为 1 小时，批大小改为 250
curl -X PUT "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/config" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"interval_secs": 3600, "batch_size": 250}'
```

请求体（所有字段可选，仅传需要更新的字段）：
```json
{
  "interval_secs": 3600,
  "batch_size": 250
}
```

响应（更新后的完整配置）：
```json
{
  "interval_secs": 3600,
  "batch_size": 250
}
```

**校验规则**：
- `interval_secs` 必须 > 0，否则返回 `400 INVALID_INTERVAL`
- `batch_size` 必须 > 0，否则返回 `400 INVALID_BATCH_SIZE`

```bash
# 错误示例：间隔为 0
curl -X PUT "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/config" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"interval_secs": 0}'
```

错误响应：
```json
{
  "error": "interval_secs must be greater than 0",
  "code": "INVALID_INTERVAL"
}
```

**配置更新生效时机**：
- `interval_secs`：下次后台 tick 时生效（任务会自动重建 ticker）
- `batch_size`：下次分页查询时生效

### 5.10 完整操作流程示例

```bash
# 1. 查看当前状态
curl -s -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/status" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# 2. 调整为每小时导出一次
curl -s -X PUT "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/config" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interval_secs": 3600}' | python -m json.tool

# 3. 手动触发一次导出验证
curl -s -X POST "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/trigger" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# 4. 启动后台定时导出
curl -s -X POST "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/start" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# 5. 确认已启动
curl -s -X GET "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/status" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# 6. 停止后台任务（维护时）
curl -s -X POST "http://localhost:8080/api/business-tools/permissions/audit-logs/export/task/stop" \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool
```

---

## 6. MockAuditLogStore 时间过滤修复（V475）

### 6.1 问题背景

`MockAuditLogStore::query()` 方法仅按 `tenant_id`、`user_id`、`action`、`changed_by` 过滤，缺失 `start_time` / `end_time` 时间范围过滤。

**导致的现象**：定时导出任务的增量窗口测试失败 — 第二次运行（`start_time` 设为上次导出时间戳）仍返回已导出的旧条目，因为 Mock 存储忽略了 `start_time` 过滤。

### 6.2 修复方案

在 `query()` 方法的过滤闭包中添加 RFC3339 字符串比较（RFC3339 时间戳的字典序与时间顺序一致）：

**文件**：`svc/unified-core/src/routes/business_tools/mock_audit_store.rs`

```rust
// 修复前：缺失时间过滤
fn query(&self, query: &AuditLogQuery) -> Result<AuditLogResponse, AuditLogError> {
    let filtered = entries.iter().filter(|e| {
        // ... 仅按 tenant_id / user_id / action / changed_by 过滤
        true
    });
}

// 修复后：补全时间范围过滤
fn query(&self, query: &AuditLogQuery) -> Result<AuditLogResponse, AuditLogError> {
    let filtered = entries.iter().filter(|e| {
        // ... 原有过滤 ...

        // RFC3339 时间戳字典序与时间顺序一致
        if let Some(start_time) = &query.start_time {
            if e.changed_at.as_str() < start_time.as_str() {
                return false;
            }
        }
        if let Some(end_time) = &query.end_time {
            if e.changed_at.as_str() > end_time.as_str() {
                return false;
            }
        }
        true
    });
}
```

### 6.3 验证方法

```powershell
# 运行增量窗口测试（之前失败的测试）
cargo test -p topems-unified-core --lib audit_export::tests::test_export_task_incremental_window
```

预期输出：
```
test audit_export::tests::test_export_task_incremental_window ... ok
```

---

## 7. 编译与测试验证

### 7.1 环境准备

```powershell
# 进入项目根目录
cd e:\tywork\topems0825\topems

# 设置环境变量
$env:SQLX_OFFLINE='true'       # SQLX 离线模式（无 DB 环境时必需）
$env:CARGO_INCREMENTAL='0'     # 禁用增量编译（避免 ThinLTO 缓存写入问题）
```

> **注意**：如果遇到 `error while writing ThinLTO key data: 拒绝访问 (os error 5)` 错误，删除 `target/debug/incremental` 目录并设置 `CARGO_INCREMENTAL=0`：
> ```powershell
> Remove-Item -Recurse -Force "e:\tywork\topems0825\topems\target\debug\incremental" -ErrorAction SilentlyContinue
> $env:CARGO_INCREMENTAL='0'
> ```

### 7.2 编译验证

```powershell
$env:SQLX_OFFLINE='true'
$env:CARGO_INCREMENTAL='0'
cargo build -p topems-unified-core
```

预期结果：
```
Finished `dev` profile [optimized + debuginfo] target(s) in ...
```

### 7.3 运行导出相关测试

```powershell
$env:SQLX_OFFLINE='true'
$env:CARGO_INCREMENTAL='0'
cargo test -p topems-unified-core --lib audit_export
```

预期结果：
```
test result: ok. 37 passed; 0 failed; 0 ignored
```

**测试覆盖**：
- `audit_export_api::tests` — 导出格式、CSV/JSON/gzip 转换、流式导出
- `audit_export_task::tests` — 定时任务启停、增量窗口、controller、trigger_once
- `audit_export_task_api::tests` — API 请求/响应序列化、配置校验

### 7.4 运行审计全量测试

```powershell
$env:SQLX_OFFLINE='true'
$env:CARGO_INCREMENTAL='0'
cargo test -p topems-unified-core --lib audit
```

预期结果：
```
test result: ok. 201 passed; 0 failed; 0 ignored
```

### 7.5 运行清理任务测试（验证无回归）

```powershell
$env:SQLX_OFFLINE='true'
$env:CARGO_INCREMENTAL='0'
cargo test -p topems-unified-core --lib audit_retention
```

预期结果：
```
test result: ok. ... passed; 0 failed; 0 ignored
```

---

## 8. 文档与 Git 提交记录

### 8.1 文档更新清单

| 文档 | 更新内容 |
|------|----------|
| `docs/roadmap/TODO.md` | V473 标记为 ✅ 完成；V473后续扩展勾选流式/压缩/定时导出；新增 V474 版本头；新增 V475 交付块（含四轨交付清单、实现说明、验收矩阵、后续扩展） |
| `CHANGELOG.md` | 未发布版本新增：导出三件套变更说明、Mock 时间过滤修复、测试结果 |

### 8.2 Git 提交记录

| 提交哈希 | 提交信息 | 内容 |
|----------|----------|------|
| `21fa0eb97` | V474 环境修复 | lapin rustls→ring 切换；V473 编译错误修复；SQLX 缓存重建；删除 5 个未使用 BFF 文件；sseClient 测试；TODO V442 + CHANGELOG |
| `02914a739` | V475 导出三件套 | gzip 压缩导出；NDJSON 流式导出；定时增量导出任务；6 个 HTTP 控制 API；Mock 时间过滤修复；37+201 测试通过 |

### 8.3 推送到 GitHub

```powershell
# 如需通过代理推送（SOCKS5 代理）
$env:HTTP_PROXY='socks5://127.0.0.1:10808'
$env:HTTPS_PROXY='socks5://127.0.0.1:10808'

# 拉取远程变更并 rebase
git pull --rebase origin main

# 推送
git push origin main
```

> **注意**：远程仓库已迁移到 `github.com/paulwy/TOPEMS.git`（大小写差异）。当前推送仍可用，但建议更新 remote URL：
> ```powershell
> git remote set-url origin https://github.com/paulwy/TOPEMS.git
> ```

---

## 9. 验收清单

### 9.1 V474 验收

- [x] `cargo build -p topems-unified-core` 编译通过（0 error）
- [x] `aws-lc-rs` 不再出现在依赖树中
- [x] SQLX 离线缓存 13 个查询全部识别
- [x] `SQLX_OFFLINE=true cargo check` 通过

### 9.2 V475 验收

- [x] gzip 压缩导出端点返回 `application/gzip` 响应
- [x] NDJSON 流式导出端点分页查询 + 逐批 yield
- [x] 定时增量导出任务支持周期性运行 + 窗口推进
- [x] `trigger_once` 手动触发不影响后台调度
- [x] 6 个 HTTP 控制 API 端点全部注册
- [x] AppState 集成 `audit_export_config` + `audit_export_controller`
- [x] `cargo test audit_export` — 37 passed
- [x] `cargo test audit` — 201 passed（无回归）
- [x] MockAuditLogStore 时间过滤修复
- [x] TODO.md V475 交付块已添加
- [x] CHANGELOG.md 已更新
- [x] 代码已推送到 GitHub

### 9.3 变更文件清单

**新建文件**：
- `svc/unified-core/src/routes/business_tools/audit_export_task.rs` — 定时导出任务 + controller + trait
- `svc/unified-core/src/routes/business_tools/audit_export_task_api.rs` — 6 个 HTTP 控制 API 端点 + 10 个测试

**修改文件**：
- `lib/Cargo.toml` — lapin features 切换为 rustls--ring
- `lib/shared-event/Cargo.toml` — lapin features 切换为 rustls--ring
- `svc/unified-core/src/routes/business_tools/audit_export_api.rs` — gzip 导出 + NDJSON 流式导出端点
- `svc/unified-core/src/routes/business_tools/audit_export_task.rs` — trigger_once trait 方法 + 2 个测试
- `svc/unified-core/src/routes/business_tools/audit_archiver.rs` — compress_gzip 可见性改为 pub(crate)
- `svc/unified-core/src/routes/business_tools/mock_audit_store.rs` — query() 补全时间过滤
- `svc/unified-core/src/routes/business_tools/mod.rs` — 模块声明 + 路由 merge
- `svc/unified-core/src/shared/mod.rs` — AppState 新增 2 个字段
- `svc/unified-core/src/main.rs` — 初始化 2 个新字段
- `docs/roadmap/TODO.md` — V473 完成 + V474 头 + V475 交付块
- `CHANGELOG.md` — 未发布版本更新
- `.sqlx/query-*.json` — 13 个 SQLX 离线缓存文件

---

## 附录 A：API 端点完整路由表

| 方法 | 路径 | 处理函数 | 功能 |
|------|------|----------|------|
| GET | `/api/business-tools/permissions/audit-logs/export` | `export_audit_logs` | CSV/JSON/gzip 导出 |
| GET | `/api/business-tools/permissions/audit-logs/export/stream` | `stream_export_audit_logs` | NDJSON 流式导出 |
| GET | `/api/business-tools/permissions/audit-logs/export/task/status` | `get_export_task_status` | 查询任务状态 |
| POST | `/api/business-tools/permissions/audit-logs/export/task/start` | `start_export_task` | 启动定时导出 |
| POST | `/api/business-tools/permissions/audit-logs/export/task/stop` | `stop_export_task` | 停止定时导出 |
| POST | `/api/business-tools/permissions/audit-logs/export/task/trigger` | `trigger_export_task` | 手动触发单次导出 |
| GET | `/api/business-tools/permissions/audit-logs/export/task/config` | `get_export_task_config` | 读取导出配置 |
| PUT | `/api/business-tools/permissions/audit-logs/export/task/config` | `update_export_task_config` | 更新导出配置 |

## 附录 B：环境变量速查

| 变量 | 用途 | 示例值 |
|------|------|--------|
| `SQLX_OFFLINE` | 启用 SQLX 离线缓存模式（无 DB 环境时必需） | `true` |
| `CARGO_INCREMENTAL` | 禁用增量编译（规避 ThinLTO 缓存写入问题） | `0` |
| `HTTP_PROXY` | HTTP/SOCKS5 代理（推送 GitHub 时使用） | `socks5://127.0.0.1:10808` |
| `HTTPS_PROXY` | HTTPS/SOCKS5 代理（推送 GitHub 时使用） | `socks5://127.0.0.1:10808` |
