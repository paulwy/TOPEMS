# ERP 插件化改造设计文档

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v1.0 |
| 日期 | 2026-06-18 |
| 状态 | 初稿 |

---

## 1. 背景与目标

### 1.1 背景

根据 [产品架构改造方案](../../product-architecture-plan.md)，TOPEMS 采用"7 合 1 核心平台 + 插件生态"的混合模式。核心平台（unified-core）已完成整合，包含 IAM、Doc、Flow、File、Communication 等核心服务。ERP 作为业务插件，需要改造为插件模式。

当前 ERP 服务（`svc/erp`）是独立服务，存在以下问题：
- 独立部署和运维
- 权限管理独立于核心平台
- 无法通过插件市场统一管理

### 1.2 目标

将 ERP 从独立服务改造为 **重量插件（独立进程）**，通过 REST API 与核心平台通信，实现：
- 统一的插件生命周期管理（安装、启用、禁用、卸载）
- 统一的权限管理（权限注册到 unified-core）
- 统一的路由入口（通过 unified-core 代理）

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         unified-core                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Plugin Registry                        │  │
│  │  - 插件注册表（code, name, url, status）                   │  │
│  │  - 插件生命周期管理                                         │  │
│  │  - 路由代理（/api/plugins/erp/* → erp:8010）               │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Permission Manager                      │  │
│  │  - 权限注册（erp:* 权限）                                   │  │
│  │  - 权限检查（通过中间件）                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (REST API)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      topems-erp (Plugin)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      API Layer                             │  │
│  │  - /api/erp/assets/*                                      │  │
│  │  - /api/erp/finance/*                                     │  │
│  │  - /api/erp/voucher/*                                     │  │
│  │  - ...                                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Business Logic                          │  │
│  │  - Asset Service                                          │  │
│  │  - Finance Service                                        │  │
│  │  - Voucher Service                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Data Layer (ERP Schema)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 插件接口协议

每个插件必须实现以下接口：

| 接口 | 路径 | 说明 | 必须实现 |
|------|------|------|---------|
| 健康检查 | `GET /health` | 返回插件健康状态 | ✅ |
| 插件信息 | `GET /api/plugins/info` | 返回插件元数据 | ✅ |
| 权限注册 | `POST /api/plugins/permissions` | 注册插件权限到核心平台 | ✅ |
| 功能路由 | `/*` | 插件业务功能 | ✅ |

### 2.3 插件元数据结构

```yaml
# plugin.yaml (放在 svc/erp/ 目录下)
code: erp
name: 企业资源计划
version: 1.0.0
description: ERP 企业资源计划系统，包含资产管理、财务管理、凭证管理等模块
plugin_type: business  # business | ai | industry

# 部署配置
deployment:
  type: standalone  # standalone | embedded
  port: 8010
  base_path: /api/erp

# 权限定义
permissions:
  - code: erp:asset:read
    name: 查看资产
    resource_type: asset
    action: read
  - code: erp:asset:write
    name: 管理资产
    resource_type: asset
    action: write
  - code: erp:finance:read
    name: 查看财务
    resource_type: finance
    action: read
  - code: erp:finance:write
    name: 管理财务
    resource_type: finance
    action: write
  # ... 其他权限

# 依赖
dependencies: []
```

---

## 3. 核心平台改造

### 3.1 插件注册表扩展

在 `core_plugins` 表基础上，新增插件运行时信息：

```sql
-- 插件运行时配置
ALTER TABLE core_plugins ADD COLUMN IF NOT EXISTS runtime_url VARCHAR(512);
ALTER TABLE core_plugins ADD COLUMN IF NOT EXISTS runtime_status VARCHAR(32) DEFAULT 'stopped';
ALTER TABLE core_plugins ADD COLUMN IF NOT EXISTS base_path VARCHAR(128) DEFAULT '/api/plugins/{code}';
```

### 3.2 插件运行时状态

```rust
pub enum PluginRuntimeStatus {
    Stopped,
    Starting,
    Running,
    Error(String),
}
```

### 3.3 路由代理中间件

```rust
// 在 unified-core 中新增插件代理中间件
async fn plugin_proxy(
    Path((plugin_code, remaining)): Path<(String, String)>,
    State(state): State<AppState>,
    request: Request,
) -> Result<Response, Infallible> {
    // 1. 从数据库查询插件 runtime_url
    let plugin = get_plugin_by_code(&state.pool, &plugin_code).await?;

    // 2. 构造目标 URL
    let target_url = format!("{}/{}", plugin.runtime_url, remaining);

    // 3. 转发请求（携带原始 Authorization header）
    let response = forward_request(target_url, request).await?;

    Ok(response)
}
```

### 3.4 权限注册流程

插件启动时，向 unified-core 注册权限：

```
ERP 启动
    │
    ▼
读取 plugin.yaml
    │
    ▼
调用 unified-core POST /api/core/plugin/dev/plugins/{code}/permissions
    │
    ▼
unified-core 将权限写入 iam.permissions 表
    │
    ▼
ERP 开始接受请求
```

---

## 4. ERP 插件改造

### 4.1 目录结构

```
svc/erp/
├── plugin.yaml              # 新增：插件元数据
├── src/
│   ├── api/
│   │   ├── mod.rs           # 修改：添加 /api/plugins/* 路由
│   │   └── ...
│   ├── main.rs              # 修改：实现插件接口
│   └── ...
├── migrations/
│   └── ...
└── Dockerfile               # 新增：插件容器化（可选）
```

### 4.2 新增接口实现

```rust
// main.rs 新增

/// 插件信息接口
async fn get_plugin_info() -> Json<PluginInfo> {
    Json(PluginInfo {
        code: "erp",
        name: "企业资源计划",
        version: env!("CARGO_PKG_VERSION"),
        description: "ERP 企业资源计划系统",
        permissions: vec![
            PermissionDef {
                code: "erp:asset:read",
                name: "查看资产",
                resource_type: "asset",
                action: "read",
            },
            // ... 其他权限
        ],
    })
}

/// 权限注册接口（供插件启动时调用）
async fn register_permissions(
    State(state): State<ApiState>,
    Json(permissions): Json<Vec<PermissionDef>>,
) -> Json<ApiResponse<()>> {
    for perm in permissions {
        // 调用 unified-core API 注册权限
        let url = format!("{}/api/core/iam/permissions", state.core_url);
        let client = reqwest::Client::new();
        client.post(&url)
            .json(&perm)
            .send()
            .await;
    }
    Json(ApiResponse::success((), "Permissions registered"))
}
```

### 4.3 路由调整

当前路由：
```
/api/v1/assets/*
/api/v1/finance/*
/api/v1/voucher/*
```

调整为（保持兼容性）：
```
/api/erp/assets/*
/api/erp/finance/*
/api/erp/voucher/*
/api/plugins/info        # 插件元数据
/health                  # 健康检查
```

### 4.4 认证中间件调整

ERP 认证现在有两种模式：

1. **通过 unified-core 代理访问**（推荐）
   - 请求携带 JWT token
   - unified-core 验证 token 并添加 `X-User-Id`、`X-Tenant-Id` 等 header
   - ERP 从 header 获取用户信息

2. **直接访问**（仅开发模式）
   - 请求携带 JWT token
   - ERP 自己验证 token

```rust
async fn auth_middleware(
    mut request: Request,
    next: Next,
) -> Response {
    // 优先从 header 获取（代理模式）
    if let Some(user_id) = request.headers().get("X-User-Id") {
        request.extensions_mut().insert(UserId(user_id.to_str().unwrap()));
        return next.run(request).await;
    }

    // 否则自己验证（直连模式）
    let auth_header = request.headers().get("Authorization").unwrap();
    let token = parse_jwt(auth_header).unwrap();
    // ...
}
```

---

## 5. 数据库设计

### 5.1 插件权限表

```sql
-- 插件权限注册表
CREATE TABLE IF NOT EXISTS core_plugin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_code VARCHAR(64) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    permission_name VARCHAR(255),
    resource_type VARCHAR(50),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plugin_code, permission_code)
);

CREATE INDEX idx_plugin_permissions_code ON core_plugin_permissions(plugin_code);
```

### 5.2 插件运行时状态表

```sql
-- 插件运行时状态
CREATE TABLE IF NOT EXISTS core_plugin_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id UUID NOT NULL REFERENCES core_plugins(id),
    instance_id VARCHAR(128),           -- 容器 ID 或进程 ID
    status VARCHAR(32) DEFAULT 'stopped', -- stopped | running | error
    host_url VARCHAR(512),               -- 实例地址
    last_heartbeat TIMESTAMP,
    started_at TIMESTAMP,
    stopped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plugin_id)
);
```

---

## 6. 部署方案

### 6.1 开发模式

```bash
# 1. 启动 unified-core
cd svc/unified-core && cargo run

# 2. 注册 ERP 插件（手动）
curl -X POST http://localhost:8000/api/core/plugin/dev/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "code": "erp",
    "name": "企业资源计划",
    "version": "1.0.0",
    "runtime_url": "http://localhost:8010",
    "base_path": "/api/erp"
  }'

# 3. 启动 ERP 插件
cd svc/erp && cargo run
```

### 6.2 生产模式

```yaml
# docker-compose.yml (示例)
services:
  unified-core:
    image: topems/unified-core:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://...
      - REDIS_URL=redis://...

  erp:
    image: topems/erp-plugin:latest
    ports:
      - "8010:8010"
    environment:
      - CORE_URL=http://unified-core:8000
      - DATABASE_URL=postgres://...
    depends_on:
      - unified-core
```

---

## 7. 改造任务清单

| 序号 | 任务 | 工期 | 依赖 |
|------|------|------|------|
| 1 | 在 unified-core 添加插件运行时状态表 | 0.5 天 | - |
| 2 | 实现插件路由代理中间件 | 1 天 | 1 |
| 3 | 实现插件权限自动注册机制 | 1 天 | 1 |
| 4 | 改造 ERP main.rs，添加插件接口 | 1 天 | - |
| 5 | 创建 ERP plugin.yaml 元数据 | 0.5 天 | - |
| 6 | 调整 ERP 路由前缀（`/api/v1` → `/api/erp`） | 1 天 | 4 |
| 7 | 调整 ERP 认证中间件（支持 header 模式） | 1 天 | - |
| 8 | 更新前端 API 调用（适配新路由） | 1 天 | 6 |
| 9 | 集成测试 | 2 天 | 6, 7, 8 |
| 10 | 文档更新 | 1 天 | 9 |

---

## 8. 风险与缓解

| 风险 | 影响 | 概率 | 缓解策略 |
|------|------|------|---------|
| 路由冲突 | 中 | 低 | 统一使用 `/api/plugins/{code}/*` 前缀 |
| 认证失败 | 高 | 中 | 详细测试直连模式和代理模式 |
| 插件启动顺序 | 低 | 中 | ERP 支持延迟注册权限 |
| 前端改动量大 | 中 | 中 | 分阶段改造，逐步上线 |

---

## 9. 后续扩展

### 9.1 其他插件改造

ERP 插件化完成后，可按相同模式改造：
- HRM → `plugin/hrm`
- CRM → `plugin/crm`
- PM → `plugin/pm`
- WMS → `plugin/wms`

### 9.2 插件市场完善

- 支持插件版本管理
- 支持插件市场在线安装/卸载
- 支持插件配置 UI

---

## 10. 实施状态

> 更新日期：2026-06-18

### 已完成

| 任务 | 状态 | 说明 |
|------|------|------|
| Task 1: unified-core 添加插件运行时状态表 | ✅ 完成 | 新增 `core_plugin_instances`, `core_plugin_permissions` 表 |
| Task 2: unified-core 实现插件注册处理器 | ✅ 完成 | 新增 `register_plugin`, `update_plugin_status`, `get_plugin_status`, `unregister_plugin`, `list_plugins_with_status` 处理器 |
| Task 3: unified-core 实现插件路由代理中间件 | ✅ 完成 | 新增 `plugin_proxy` 中间件，路由 `/api/plugins/{plugin_code}/*` |
| Task 4: ERP 添加插件元数据 plugin.yaml | ✅ 完成 | 创建 `svc/erp/plugin.yaml` |
| Task 5: ERP 实现插件接口 | ✅ 完成 | 实现 `/api/plugins/info` 和 `/health` 接口 |
| Task 6: ERP 调整路由前缀 | ✅ 完成 | 全部路由从 `/api/v1/*` 改为 `/api/erp/*` |
| Task 7: ERP 调整认证中间件 | ✅ 完成 | 支持 `X-User-Id` header（代理模式）和 Authorization header（直连模式） |
| Task 8: 前端适配新路由 | ✅ 完成 | Vite 配置添加 `/api/plugins/erp` 代理 |
| Task 9: 集成测试 | ✅ 完成 | 手动测试通过：插件信息接口、代理路由、认证流程 |

### 待完成

| 任务 | 状态 | 说明 |
|------|------|------|
| Task 10: 文档更新 | ✅ 完成 | 本文档 |

### 已修改文件清单

**unified-core:**
- `src/modules/plugin/mod.rs` - 新增表 `core_plugin_instances`, `core_plugin_permissions`
- `src/modules/plugin/models.rs` - 新增 `PluginInstance`, `RegisterPluginRequest`, `PluginWithRuntimeStatus`, `PermissionDef`, `PluginHeartbeatRequest`
- `src/modules/plugin/handlers.rs` - 新增注册、状态管理，心跳处理器
- `src/main.rs` - 新增插件代理中间件 `plugin_proxy`，新增 HTTP 客户端，新增路由
  - 修复路由通配符语法：`{plugin_code}/*` → `{plugin_code}/{*path}`
  - 修复插件代理路由应放在公开路由（无需认证）
  - 修复目标 URL 路径拼接逻辑（添加前导斜杠）
- `Cargo.toml` - 新增 `reqwest` 依赖

**ERP:**
- `plugin.yaml` - 新建插件元数据文件
- `src/api/plugin.rs` - 新建插件接口处理器（移除重复的 `/health` 路由）
- `src/api/mod.rs` - 添加 plugin 模块
- `src/main.rs` - 自定义认证中间件 `erp_auth_middleware`
- `src/api/*.rs` - 全部 API 路由前缀调整为 `/api/erp/*`

**前端:**
- `vite.config.ts` - 添加 `/api/plugins/erp` 代理配置

---

**文档结束**
