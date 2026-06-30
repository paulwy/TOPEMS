# Portal 服务 Mock 数据清理计划

> **目标**：将 Portal 服务中 13 个返回硬编码数据的 mock handler 替换为真实的数据持久化与外部服务调用实现。
>
> **当前状态**：`svc/portal/src/main.rs`（688 行）包含 13 个 mock handler，Cargo.toml 中无数据库依赖，6 张迁移表已存在但未使用，且缺少 todos、notifications、alerts、monitoring_logs 等必要表。

---

## 目录

- [Phase A: 数据库基础设施搭建](#phase-a-数据库基础设施搭建)
- [Phase B: CRUD Handler 转换（Todos / Notifications / Alerts）](#phase-b-crud-handler-转换todos--notifications--alerts)
- [Phase C: 用户信息 Handler](#phase-c-用户信息-handler)
- [Phase D: 监控相关 Handler](#phase-d-监控相关-handler)
- [Phase E: 清理死代码](#phase-e-清理死代码)
- [完整 SQL 迁移脚本](#完整-sql-迁移脚本)
- [风险评估与注意事项](#风险评估与注意事项)
- [时间线总览](#时间线总览)

---

## Phase A: 数据库基础设施搭建

**预计工期：2 天**

### A1. 添加 sqlx 依赖

在 `svc/portal/Cargo.toml` 中添加：

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "chrono", "uuid"] }
```

### A2. 初始化数据库连接池

在 `main.rs` 中添加数据库连接池初始化逻辑：

```rust
let db_pool = sqlx::postgres::PgPoolOptions::new()
    .max_connections(5)
    .connect(&env::var("DATABASE_URL").expect("DATABASE_URL must be set"))
    .await
    .expect("Failed to connect to database");
```

### A3. 创建迁移文件

在 `svc/portal/migrations/` 目录下创建缺失表的迁移文件（SQL 内容见文末附录）。

- `20240601000001_create_todos_table.sql`
- `20240601000002_create_notifications_table.sql`
- `20240601000003_create_alerts_table.sql`
- `20240601000004_create_monitoring_logs_table.sql`

### A4. 运行迁移

使用 `sqlx migrate run` 执行迁移，验证所有表创建成功。

### A5. 将连接池注入 AppState

```rust
struct AppState {
    db: sqlx::PgPool,
}
```

所有 handler 函数签名更新为接收 `State<AppState>` 参数。

---

## Phase B: CRUD Handler 转换（Todos / Notifications / Alerts）

**预计工期：3 天**

转换优先级：**Todos → Notifications → Alerts**

### B1. Todos（1 天）

| Handler | 当前行为 | 目标行为 |
|---------|---------|---------|
| `get_todos` (GET /api/v1/todos) | 返回 6 条硬编码数据 | `SELECT * FROM todos ORDER BY created_at DESC` |
| `add_todo` (POST /api/v1/todos) | 内存中追加，不持久化 | `INSERT INTO todos (title, description, priority) VALUES (...)` |
| `complete_todo` (POST /api/v1/todos/{id}) | 空操作 | `UPDATE todos SET completed = true, completed_at = NOW() WHERE id = $1` |
| `delete_todo` (DELETE /api/v1/todos/{id}) | 空操作 | `DELETE FROM todos WHERE id = $1` |

实现步骤：
1. 定义 `Todo` 结构体，derive `sqlx::FromRow`
2. 编写查询函数（`todo_repository.rs`）
3. 替换 handler 中的硬编码返回
4. 添加输入校验（title 非空、priority 枚举值）
5. 返回合理的 HTTP 状态码（201 Created, 204 No Content 等）

### B2. Notifications（1 天）

| Handler | 当前行为 | 目标行为 |
|---------|---------|---------|
| `get_notifications` (GET /api/v1/notifications) | 返回 5 条硬编码数据 | `SELECT * FROM notifications ORDER BY created_at DESC` |
| `mark_notification_read` (POST /api/v1/notifications/{id}) | 空操作 | `UPDATE notifications SET is_read = true WHERE id = $1` |
| `mark_all_notifications_read` (POST /api/v1/notifications/mark-all-read) | 返回固定数量 | `UPDATE notifications SET is_read = true WHERE is_read = false RETURNING COUNT(*)` |

实现步骤：
1. 定义 `Notification` 结构体
2. 编写查询与更新函数
3. 支持分页参数（`?page=1&limit=20`）
4. `mark_all_notifications_read` 返回实际受影响行数
5. 添加 `user_id` 过滤（从请求上下文中获取当前用户）

### B3. Alerts（1 天）

| Handler | 当前行为 | 目标行为 |
|---------|---------|---------|
| `get_monitoring_alerts` (GET /api/v1/monitoring/alerts) | 返回 3 条硬编码数据 | `SELECT * FROM alerts ORDER BY created_at DESC` |
| `acknowledge_alert` (POST /api/v1/monitoring/alerts/{id}) | 空操作 | `UPDATE alerts SET acknowledged = true, acknowledged_at = NOW() WHERE id = $1` |

实现步骤：
1. 定义 `Alert` 结构体
2. 编写查询与更新函数
3. 支持按 `severity` 和 `status` 过滤
4. 添加分页支持

---

## Phase C: 用户信息 Handler

**预计工期：1 天**

### C1. 替换 get_user_info（GET /api/v1/user）

| 项目 | 内容 |
|------|------|
| 当前行为 | 返回硬编码 `"张三"` |
| 目标行为 | 通过 HTTP 调用 `unified-core` IAM 服务获取真实用户信息 |

实现步骤：
1. 在 `AppState` 中添加 HTTP 客户端：`reqwest::Client`
2. 从请求的 Authorization header 中提取 JWT token
3. 调用 `unified-core` 服务端点（如 `GET http://unified-core:8080/api/v1/users/me`）
4. 将响应透传回客户端（或做字段映射）
5. 添加错误处理：token 缺失返回 401、上游超时返回 502

```rust
// 伪代码
async fn get_user_info(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let token = headers.get("Authorization")
        .and_then(|v| v.to_str().ok())
        .ok_or(ApiError::Unauthorized)?;

    let resp = state.http_client
        .get("http://unified-core:8080/api/v1/users/me")
        .header("Authorization", token)
        .send()
        .await?;

    // 透传或映射字段
}
```

---

## Phase D: 监控相关 Handler

**预计工期：3-4 天**

### D1. Services（GET /api/v1/monitoring/services）— 1 天

| 项目 | 内容 |
|------|------|
| 当前行为 | 返回 8 条硬编码服务数据 |
| 目标行为 | 调用 Consul Health Check API |

实现步骤：
1. 调用 `GET http://consul:8500/v1/health/service/{service_id}` 获取各服务健康状态
2. 或调用 `GET http://consul:8500/v1/catalog/services` 获取所有注册服务列表
3. 遍历 TOPEMS 相关服务，聚合健康检查结果
4. 映射为统一的 `ServiceStatus` 响应格式

```rust
// 伪代码
async fn get_monitoring_services(State(state): State<AppState>) -> impl IntoResponse {
    let services = vec!["unified-core", "portal", "mes", "wms", "qms", "ehs", "lims", "pdm"];
    let mut results = Vec::new();

    for svc in &services {
        let resp = state.http_client
            .get(&format!("http://consul:8500/v1/health/service/{}", svc))
            .send().await?;
        // 解析健康检查结果
    }
    results
}
```

### D2. Metrics（GET /api/v1/monitoring/metrics）— 1 天

| 项目 | 内容 |
|------|------|
| 当前行为 | 返回固定数值（CPU 45%, 内存 62% 等） |
| 目标行为 | 调用 Prometheus Query API |

实现步骤：
1. 调用 `GET http://prometheus:9090/api/v1/query?query=...` 查询实时指标
2. 关键指标查询：
   - CPU 使用率：`100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
   - 内存使用率：`1 - avg(node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`
   - 服务响应时间：`histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
   - 活跃连接数：`sum(gauge(go_goroutines))`
3. 缓存策略：设置 30 秒 TTL，避免频繁查询 Prometheus

### D3. Logs（GET /api/v1/monitoring/logs）— 0.5-1 天

| 项目 | 内容 |
|------|------|
| 当前行为 | 返回 5 条硬编码日志 |
| 目标行为 | 方案一：调用 Loki API / 方案二：查询 DB |

实现步骤（Loki 方案优先）：
1. 调用 `POST http://loki:3100/loki/api/v1/query_range` 查询日志
2. 支持参数：`?level=error&service=portal&limit=50&start=...&end=...`
3. 解析 Loki 响应，映射为统一的日志格式

备选方案（DB 查询）：
- 使用已创建的 `monitoring_logs` 表
- 通过日志采集管道（如 Vector/Fluentd）将日志写入 PostgreSQL
- 适用于日志量可控的场景

### D4. Alerts 完善 — 0.5-1 天

| 项目 | 内容 |
|------|------|
| Phase B 已完成 | DB-backed 的 alert CRUD |
| 本阶段补充 | 对接真实告警源 |

实现步骤：
1. 创建告警接收 API（供 Prometheus AlertManager webhook 回调）
2. `POST /api/v1/monitoring/alerts/ingest` — 接收 AlertManager 告警并写入 DB
3. 自动去重：相同 `fingerprint` 的告警更新而非新建
4. 告警自动解决：超过 `expires_at` 的告警标记为 resolved

---

## Phase E: 清理死代码

**预计工期：1 天**

### E1. 删除硬编码数据结构

移除以下 mock 数据定义：

```rust
// 删除所有类似以下的硬编码数据
let mock_todos = vec![...];
let mock_services = vec![...];
let mock_alerts = vec![...];
let mock_logs = vec![...];
let mock_notifications = vec![...];
```

### E2. 清理未使用的导入

运行 `cargo check --all-targets 2>&1 | grep unused`，逐一清理。

### E3. 删除无用的迁移表

检查现有 6 张迁移表的使用情况，如果确认无其他服务依赖则考虑移除或保留为空。

### E4. 代码格式化与 lint

```bash
cd svc/portal
cargo fmt
cargo clippy -- -D warnings
```

### E5. 更新测试

- 移除依赖 mock 数据的现有测试
- 为每个真实 handler 添加集成测试（使用 `sqlx::test` 或测试数据库容器）

---

## 完整 SQL 迁移脚本

### 20240601000001_create_todos_table.sql

```sql
-- Todos 表：用户待办事项
CREATE TABLE IF NOT EXISTS todos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     VARCHAR(64) NOT NULL,
    title       VARCHAR(256) NOT NULL,
    description TEXT,
    priority    VARCHAR(16) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    completed   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 索引：按用户查询待办
CREATE INDEX idx_todos_user_id ON todos (user_id);
-- 索引：按完成状态过滤
CREATE INDEX idx_todos_completed ON todos (user_id, completed);
-- 索引：按创建时间排序
CREATE INDEX idx_todos_created_at ON todos (user_id, created_at DESC);

COMMENT ON TABLE todos IS '用户待办事项表';
COMMENT ON COLUMN todos.priority IS '优先级: low, medium, high, urgent';
COMMENT ON COLUMN todos.user_id IS '所属用户 ID，从 JWT token 中提取';
```

### 20240601000002_create_notifications_table.sql

```sql
-- Notifications 表：系统通知
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     VARCHAR(64) NOT NULL,
    title       VARCHAR(256) NOT NULL,
    content     TEXT NOT NULL,
    type        VARCHAR(32) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'system')),
    category    VARCHAR(64),
    source      VARCHAR(64),
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at     TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ
);

-- 索引：按用户查询未读通知
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
-- 索引：按类型过滤
CREATE INDEX idx_notifications_type ON notifications (user_id, type);
-- 索引：过期清理
CREATE INDEX idx_notifications_expires ON notifications (expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE notifications IS '系统通知表';
COMMENT ON COLUMN notifications.type IS '通知类型: info, warning, error, success, system';
COMMENT ON COLUMN notifications.source IS '通知来源模块，如 mes, wms, qms 等';
```

### 20240601000003_create_alerts_table.sql

```sql
-- Alerts 表：监控告警
CREATE TABLE IF NOT EXISTS alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint     VARCHAR(128) NOT NULL,
    rule_name       VARCHAR(256) NOT NULL,
    severity        VARCHAR(16) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    status          VARCHAR(16) NOT NULL DEFAULT 'firing' CHECK (status IN ('firing', 'resolved', 'acknowledged', 'suppressed')),
    source_service  VARCHAR(64),
    description     TEXT,
    labels          JSONB DEFAULT '{}',
    annotations     JSONB DEFAULT '{}',
    acknowledged    BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(64),
    fired_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：唯一告警指纹（去重）
CREATE UNIQUE INDEX idx_alerts_fingerprint ON alerts (fingerprint);
-- 索引：按状态查询活跃告警
CREATE INDEX idx_alerts_status ON alerts (status, severity, fired_at DESC);
-- 索引：按来源服务过滤
CREATE INDEX idx_alerts_source ON alerts (source_service, status);
-- 索引：过期清理
CREATE INDEX idx_alerts_expires ON alerts (expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE alerts IS '监控告警表';
COMMENT ON COLUMN alerts.fingerprint IS 'AlertManager 告警指纹，用于去重';
COMMENT ON COLUMN alerts.status IS '告警状态: firing, resolved, acknowledged, suppressed';
COMMENT ON COLUMN alerts.labels IS 'Prometheus 标签键值对';
```

### 20240601000004_create_monitoring_logs_table.sql

```sql
-- Monitoring Logs 表：监控日志（备选 DB 方案）
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id          BIGSERIAL PRIMARY KEY,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level       VARCHAR(16) NOT NULL CHECK (level IN ('trace', 'debug', 'info', 'warn', 'error', 'fatal')),
    service     VARCHAR(64) NOT NULL,
    message     TEXT NOT NULL,
    source      VARCHAR(64),
    trace_id    VARCHAR(64),
    span_id     VARCHAR(64),
    labels      JSONB DEFAULT '{}',
    metadata    JSONB DEFAULT '{}'
);

-- 索引：按服务查询
CREATE INDEX idx_monitoring_logs_service ON monitoring_logs (service, timestamp DESC);
-- 索引：按日志级别过滤
CREATE INDEX idx_monitoring_logs_level ON monitoring_logs (level, timestamp DESC);
-- 索引：按 trace_id 查询（链路追踪）
CREATE INDEX idx_monitoring_logs_trace ON monitoring_logs (trace_id) WHERE trace_id IS NOT NULL;
-- 索引：按时间范围查询
CREATE INDEX idx_monitoring_logs_timestamp ON monitoring_logs (timestamp DESC);

COMMENT ON TABLE monitoring_logs IS '监控日志表（备选方案，优先使用 Loki）';
COMMENT ON COLUMN monitoring_logs.level IS '日志级别: trace, debug, info, warn, error, fatal';
COMMENT ON COLUMN monitoring_logs.trace_id IS '分布式追踪 ID，用于链路关联';
```

---

## 风险评估与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 外部服务（Consul、Prometheus、Loki）不可达 | 监控 handler 无法获取真实数据 | 添加超时与降级逻辑，返回缓存数据 + 标记数据源状态 |
| 用户身份信息缺失 | todos/notifications 无法正确过滤 | 统一从 JWT middleware 中提取 user_id，添加缺失时 401 拒绝 |
| 数据库迁移与现有 6 张表冲突 | 迁移失败 | 先审查现有迁移文件，确认无同名表冲突后再执行 |
| 并发告警写入重复 | alerts 表出现重复记录 | 使用 `fingerprint` 字段做 `ON CONFLICT DO UPDATE` 去重 |
| 前端依赖 mock 数据的固定格式 | 前端展示异常 | 保持响应结构不变，仅数据来源从硬编码改为真实查询 |

---

## 时间线总览

```
Week 1
  Day 1-2  Phase A: 数据库基础设施搭建（sqlx 依赖、连接池、迁移文件）
  Day 3    Phase B - Todos: CRUD handler 转换
  Day 4    Phase B - Notifications: CRUD handler 转换
  Day 5    Phase B - Alerts: CRUD handler 转换

Week 2
  Day 6    Phase C: 用户信息 handler（对接 unified-core IAM）
  Day 7    Phase D - Services: 对接 Consul Health Check
  Day 8    Phase D - Metrics: 对接 Prometheus Query API
  Day 9    Phase D - Logs: 对接 Loki / DB 查询
  Day 10   Phase D - Alerts 补充：告警接收与自动解决

Week 3
  Day 11   Phase E: 清理死代码、格式化、lint
  Day 12   集成测试与联调
  Day 13   文档更新（API 文档补充）
  Day 14   代码评审与合并
```

**总工期估算：约 10-14 个工作日（2-3 周）**

---

## 检查清单

- [ ] Phase A: sqlx 依赖添加并通过编译
- [ ] Phase A: 数据库连接池初始化成功
- [ ] Phase A: 4 张新表迁移执行成功
- [ ] Phase B: 4 个 todos handler 全部替换为 sqlx 查询
- [ ] Phase B: 3 个 notifications handler 全部替换为 sqlx 查询
- [ ] Phase B: 2 个 alerts handler 全部替换为 sqlx 查询
- [ ] Phase C: get_user_info 对接 unified-core IAM 成功
- [ ] Phase D: get_monitoring_services 对接 Consul 成功
- [ ] Phase D: get_monitoring_metrics 对接 Prometheus 成功
- [ ] Phase D: get_monitoring_logs 对接 Loki/DB 成功
- [ ] Phase D: AlertManager webhook 告警接收可用
- [ ] Phase E: 所有硬编码 mock 数据已删除
- [ ] Phase E: cargo clippy 无 warning
- [ ] 集成测试覆盖所有 13 个 handler
- [ ] API 文档更新完毕
