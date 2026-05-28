# TOPEMS 开发指南

## 项目概述

TOPEMS 是一个企业级智慧研发管理平台，采用微服务架构，基于 Rust + Axum 后端和 React + TypeScript 前端。

## 项目结构

```text
TOPEMS/
├── platform/              # 核心平台服务
│   ├── topems-iam/       # 身份认证和权限管理
│   ├── topems-doc/       # 文档管理系统
│   └── topems-flow/      # 工作流管理
├── services/             # 业务服务
│   ├── topems-ai/        # AI 知识库
│   ├── topems-lims/      # LIMS 实验室管理
│   ├── topems-rs/        # 科研研发管理
│   ├── topems-qms/       # 质量管理系统
│   ├── topems-ehs/       # 环境健康安全
│   ├── topems-srm/       # 供应商关系管理
│   └── topems-pdm/       # 生产数据管理
├── frontend/             # 前端门户
├── infrastructure/       # 基础设施
│   └── docker/           # Docker 配置
└── docs/                # 文档
```

## 现有服务分析

### 已完善的服务_(开发环境)

1. **IAM (topems-iam)** - 完整的身份认证和权限管理
2. **DOC (topems-doc)** - 完善的文档管理系统
3. **FLOW (topems-flow)** - 工作流管理
4. **AI (topems-ai)** - AI 知识库

所有这些服务都支持：

- 内存模式和数据库模式
- RESTful API
- CORS 支持
- 健康检查
- 环境变量配置

### 待完善的服务_(开发环境)

1. **LIMS (topems-lims)** - 已有基础，需要数据库持久化
2. **RS (topems-rs)** - 已有基础，需要数据库持久化
3. **QMS (topems-qms)** - 需要从零开始
4. **EHS (topems-ehs)** - 需要从零开始
5. **SRM (topems-srm)** - 需要从零开始
6. **PDM (topems-pdm)** - 需要从零开始

## 如何完善一个新服务

### 以 LIMS 为例，添加数据库持久化支持

#### 1. 了解现有架构

首先查看 IAM 服务的架构，作为参考：

```text
topems-iam/backend/src/
├── main.rs           # 主程序入口
├── db/               # 数据库相关
│   ├── mod.rs        # 数据库连接池
│   ├── repository.rs # 数据访问层
│   └── schema.rs     # 数据库模式
├── api/              # API 处理
│   ├── handlers/     # 处理函数
│   └── mod.rs
├── models/           # 数据模型
│   └── mod.rs
└── middleware/       # 中间件
    └── mod.rs
```

#### 2. 复制参考结构

从 IAM 或 DOC 服务复制结构到目标服务：

```bash
# 以 LIMS 为例
cd services/topems-lims/backend

# 从 DOC 服务复制 db/ 目录
cp -r ../../../platform/topems-doc/backend/src/db/ src/

# 复制 models/ 目录
cp -r ../../../platform/topems-doc/backend/src/models/ src/

# 复制 api/ 目录结构
cp -r ../../../platform/topems-doc/backend/src/api/ src/
```

#### 3. 设计数据模型

根据数据库结构设计数据模型，参考 `infrastructure/docker/init.sql` 中的表定义。

#### 4. 更新 Cargo.toml

确保包含所有必要的依赖：

```toml
[dependencies]
axum = "0.7"
tower-http = { version = "0.5", features = ["cors"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
tracing = "0.1"
tracing-subscriber = "0.3"
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde", "utc"] }
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-native-tls", "macros", "chrono", "uuid", "json"] }
dotenvy = "0.15"
```

#### 5. 更新 main.rs

添加数据库连接和存储模式切换逻辑：

```rust
// 添加依赖
use dotenvy::dotenv;
use std::env;

// 添加存储模式枚举
enum StorageMode {
    Memory,
    Database,
}

// 更新 AppState
#[derive(Clone)]
struct AppState {
    db_pool: Option<sqlx::PgPool>,
    storage_mode: StorageMode,
    // ... 其他状态
}

// 添加数据库连接函数
async fn try_connect_db() -> (Option<sqlx::PgPool>, StorageMode) {
    // 检查环境变量
    if let Ok(use_memory) = env::var("USE_MEMORY_STORAGE") {
        if use_memory.to_lowercase() == "true" {
            return (None, StorageMode::Memory);
        }
    }
    
    // 尝试连接数据库
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    match db::create_pool(&database_url).await {
        Ok(pool) => {
            tracing::info!("✅ 数据库连接成功");
            (Some(pool), StorageMode::Database)
        }
        Err(e) => {
            tracing::warn!("⚠️ 数据库连接失败: {}, 使用内存模式", e);
            (None, StorageMode::Memory)
        }
    }
}
```

#### 6. 更新 API 处理函数

让处理函数同时支持内存模式和数据库模式：

```rust
async fn list_samples(State(state): State<AppState>) -> Json<ApiResponse<Vec<Sample>>> {
    match state.storage_mode {
        StorageMode::Database => {
            // 从数据库查询
            let samples = db::repository::list_samples(&state.db_pool.unwrap()).await;
            Json(ApiResponse::success(samples, "查询成功".to_string()))
        }
        StorageMode::Memory => {
            // 从内存查询
            let samples = state.samples.lock().unwrap().clone();
            Json(ApiResponse::success(samples, "查询成功".to_string()))
        }
    }
}
```

### 从零开始创建新服务（以 QMS 为例）

#### 1. 创建目录结构

```bash
cd services/topems-qms/backend

# 创建目录结构
mkdir -p src/api/handlers
mkdir -p src/db
mkdir -p src/models
mkdir -p src/middleware
```

#### 2. 复制基础文件

从 DOC 或 IAM 服务复制基础文件：

```bash
# 复制 Cargo.toml
cp ../../../platform/topems-doc/backend/Cargo.toml .

# 复制 main.rs 模板
cp ../../../platform/topems-doc/backend/src/main.rs src/

# 复制 db/ 目录
cp -r ../../../platform/topems-doc/backend/src/db/ src/

# 复制 models/ 目录
cp -r ../../../platform/topems-doc/backend/src/models/ src/

# 复制 api/ 目录
cp -r ../../../platform/topems-doc/backend/src/api/ src/
```

#### 3. 修改 Cargo.toml

```toml
[package]
name = "topems-qms"
version = "0.1.0"
edition = "2021"

[dependencies]
# 复制 DOC 服务的依赖
```

#### 4. 根据数据库表设计数据模型

查看 `infrastructure/docker/init.sql` 中的 QMS 相关表：

- `qms.quality_standards` - 质量标准
- `qms.quality_checks` - 质量检查
- `qms.check_items` - 检查项目
- `qms.quality_issues` - 质量问题
- `qms.quality_improvements` - 质量改进

#### 5. 实现 CRUD API

为每个实体实现：

- GET /api/v1/entity - 列表
- POST /api/v1/entity - 创建
- GET /api/v1/entity/:id - 详情
- PUT /api/v1/entity/:id - 更新
- DELETE /api/v1/entity/:id - 删除

## 前端开发

### API 客户端

前端 API 客户端已创建在 `frontend/src/api/` 目录：

- `lims.ts`
- `rs.ts`
- `qms.ts`
- `ehs.ts`
- `srm.ts`
- `pdm.ts`

### 页面组件

页面组件已创建在 `frontend/src/pages/` 目录：

- `Limspage.tsx`
- `Rspage.tsx`
- `Qmspage.tsx`
- `Ehspage.tsx`
- `Srmpage.tsx`
- `Pdmpage.tsx`

### 路由配置

路由已在 `frontend/src/App.tsx` 中配置。

## 测试

### 单元测试

在服务的 `tests/` 目录中创建测试文件。

### 集成测试

参考 `services/backend/tests/` 目录中的测试结构。

## CI/CD

### GitHub Actions

可以在 `.github/workflows/` 中配置 CI/CD 流程。

## 性能优化

### Redis 缓存

1. 添加 Redis 依赖
2. 创建缓存层
3. 为热点数据添加缓存

### 数据库优化

1. 添加索引
2. 优化查询
3. 使用连接池
4. 分页查询

## 部署

### Docker

每个服务都有自己的 Dockerfile。

### 环境变量

关键环境变量：

- `DATABASE_URL` - 数据库连接字符串
- `USE_MEMORY_STORAGE` - 是否使用内存模式
- `SERVER_PORT` - 服务端口
- `RUST_LOG` - 日志级别

## 开发最佳实践

1. **先实现内存模式** - 快速迭代
2. **再添加数据库支持** - 完善持久化
3. **保持 API 一致性** - 遵循 RESTful 原则
4. **添加详细日志** - 便于调试
5. **编写测试** - 确保质量
6. **文档化 API** - 使用 OpenAPI/Swagger

## 下一步优先级

1. 完善 LIMS 服务（已有基础）- 阶段二重点
2. 完善 RS 服务（已有基础）- 阶段二重点
3. 实现 QMS 服务
4. 实现 EHS 服务
5. 实现 SRM 服务
6. 实现 PDM 服务
7. 添加完整测试
8. 配置 CI/CD
9. 性能优化

---

## LIMS/RS 数据库集成指南

### 1. 数据库 Schema 结构

#### LIMS 模块表结构
```sql
-- 样品表
CREATE TABLE lims.samples (
    id UUID PRIMARY KEY,
    sample_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 检验记录表
CREATE TABLE lims.inspection_records (
    id UUID PRIMARY KEY,
    sample_id UUID REFERENCES lims.samples(id),
    inspector_id VARCHAR(50),
    inspection_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 检验项目表
CREATE TABLE lims.inspection_items (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    min_value DECIMAL,
    max_value DECIMAL,
    standard_value DECIMAL
);
```

#### RS 模块表结构
```sql
-- 项目表
CREATE TABLE rs.projects (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    progress INT DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 试验记录表
CREATE TABLE rs.experiments (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES rs.projects(id),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50),
    parameters JSONB,
    results JSONB,
    conclusion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 材料表
CREATE TABLE rs.materials (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    spec TEXT,
    supplier VARCHAR(200),
    stock_quantity DECIMAL DEFAULT 0,
    unit VARCHAR(50)
);
```

### 2. LIMS 服务数据库集成步骤

#### 步骤 1: 添加数据库依赖
```toml
# services/topems-lims/backend/Cargo.toml
[dependencies]
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-native-tls", "macros", "chrono", "uuid", "json"] }
```

#### 步骤 2: 创建 db 模块
```bash
cd services/topems-lims/backend
mkdir -p src/db
cp -r ../../../platform/topems-iam/backend/src/db/ src/
```

#### 步骤 3: 更新 main.rs
```rust
use dotenvy::dotenv;
use std::env;

enum StorageMode {
    Memory,
    Database,
}

#[derive(Clone)]
struct AppState {
    db_pool: Option<sqlx::PgPool>,
    storage_mode: StorageMode,
}

async fn try_connect_db() -> (Option<sqlx::PgPool>, StorageMode) {
    if let Ok(use_memory) = env::var("USE_MEMORY_STORAGE") {
        if use_memory.to_lowercase() == "true" {
            return (None, StorageMode::Memory);
        }
    }
    
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    match db::create_pool(&database_url).await {
        Ok(pool) => {
            tracing::info!("✅ LIMS 数据库连接成功");
            (Some(pool), StorageMode::Database)
        }
        Err(e) => {
            tracing::warn!("⚠️ LIMS 数据库连接失败: {}, 使用内存模式", e);
            (None, StorageMode::Memory)
        }
    }
}
```

#### 步骤 4: 实现 LIMS Repository
```rust
// src/db/repository.rs
pub async fn list_samples(pool: &sqlx::PgPool) -> Result<Vec<Sample>, sqlx::Error> {
    let samples = sqlx::query_as!(
        Sample,
        "SELECT id, sample_code, name, type, status, created_at FROM lims.samples ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await?;
    Ok(samples)
}

pub async fn get_sample(pool: &sqlx::PgPool, sample_id: &str) -> Result<Option<Sample>, sqlx::Error> {
    let sample = sqlx::query_as!(
        Sample,
        "SELECT id, sample_code, name, type, status, created_at FROM lims.samples WHERE id = $1",
        sample_id
    )
    .fetch_optional(pool)
    .await?;
    Ok(sample)
}
```

### 3. RS 服务数据库集成步骤

#### 步骤 1: 添加数据库依赖
```toml
# services/topems-rs/backend/Cargo.toml
[dependencies]
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-native-tls", "macros", "chrono", "uuid", "json"] }
```

#### 步骤 2: 创建 db 模块
```bash
cd services/topems-rs/backend
mkdir -p src/db
cp -r ../../../platform/topems-iam/backend/src/db/ src/
```

#### 步骤 3: 更新 main.rs
参考 LIMS 的数据库连接模式实现

#### 步骤 4: 实现 RS Repository
```rust
// src/db/repository.rs
pub async fn list_projects(pool: &sqlx::PgPool) -> Result<Vec<Project>, sqlx::Error> {
    let projects = sqlx::query_as!(
        Project,
        "SELECT id, name, code, description, status, progress, start_date, end_date, created_at FROM rs.projects ORDER BY created_at DESC"
    )
    .fetch_all(pool)
    .await?;
    Ok(projects)
}

pub async fn create_project(pool: &sqlx::PgPool, project: &NewProject) -> Result<Project, sqlx::Error> {
    let new_project = sqlx::query_as!(
        Project,
        r#"INSERT INTO rs.projects (id, name, code, description, status, progress, start_date, end_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *"#,
        project.id,
        project.name,
        project.code,
        project.description,
        project.status,
        project.progress,
        project.start_date,
        project.end_date
    )
    .fetch_one(pool)
    .await?;
    Ok(new_project)
}
```

### 4. API 处理函数适配

```rust
async fn list_samples(State(state): State<AppState>) -> Json<ApiResponse<Vec<Sample>>> {
    match state.storage_mode {
        StorageMode::Database => {
            let samples = db::repository::list_samples(&state.db_pool.unwrap()).await?;
            Json(ApiResponse::success(samples, "查询成功".to_string()))
        }
        StorageMode::Memory => {
            let samples = state.samples.lock().unwrap().clone();
            Json(ApiResponse::success(samples, "查询成功".to_string()))
        }
    }
}
```

### 5. 环境变量配置

在 `.env` 文件中添加：
```env
# LIMS 数据库配置
LIMS_DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# RS 数据库配置
RS_DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# 存储模式
USE_MEMORY_STORAGE=false
```

## 参考资源

- [Axum 文档](https://docs.rs/axum)
- [SQLx 文档](https://docs.rs/sqlx)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
