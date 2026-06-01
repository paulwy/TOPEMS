# TOPEMS 环境变量配置管理系统

## 📋 完成概览

已成功为 TOPEMS 系统创建完整的环境变量配置管理系统，包括：

- ✅ 主环境变量模板文件
- ✅ 环境特定配置文件（development, test, production）
- ✅ Rust 后端统一配置加载系统
- ✅ 配置验证和热重载支持
- ✅ 前端环境变量配置
- ✅ 敏感信息保护（.gitignore）
- ✅ 完整配置说明文档
- ✅ 初始化和验证脚本
- ✅ 文档管理服务独立配置
- ✅ IAM 服务独立配置
- ✅ 各微服务独立配置支持

## 📁 创建的文件列表

### 1. 主配置文件

| 文件路径 | 说明 | 追踪 |
| ------ ------ ------ |
| [`.env.example`](file:///Users/xingzhai/TOPEMS/.env.example) | 完整环境变量模板 | ✅ |
| [`.env.development`](file:///Users/xingzhai/TOPEMS/.env.development) | 开发环境配置 | ✅ |
| [`.env.test`](file:///Users/xingzhai/TOPEMS/.env.test) | 测试环境配置 | ✅ |
| [`.env.production`](file:///Users/xingzhai/TOPEMS/.env.production) | 生产环境配置（已脱敏） | ✅ |
| [`.env.docker`](file:///Users/xingzhai/TOPEMS/.env.docker) | Docker 环境配置 | ✅ |

### 2. 前端配置文件

| 文件路径 | 说明 | 追踪 |
| ------ ------ ------ |
| [`frontend/.env.example`](file:///Users/xingzhai/TOPEMS/frontend/.env.example) | 前端环境变量模板 | ✅ |
| [`frontend/.env.development`](file:///Users/xingzhai/TOPEMS/frontend/.env.development) | 前端开发环境 | ✅ |
| [`frontend/.env.test`](file:///Users/xingzhai/TOPEMS/frontend/.env.test) | 前端测试环境 | ✅ |
| [`frontend/.env.production`](file:///Users/xingzhai/TOPEMS/frontend/.env.production) | 前端生产环境 | ✅ |

### 3. 微服务独立配置

| 文件路径 | 说明 | 追踪 |
| ------ ------ ------ |
| [`platform/topems-doc/backend/.env.example`](file:///Users/xingzhai/TOPEMS/platform/topems-doc/backend/.env.example) | 文档服务环境变量模板 | ✅ |
| [`platform/topems-iam/backend/Cargo.toml`](file:///Users/xingzhai/TOPEMS/platform/topems-iam/backend/Cargo.toml) | IAM 服务配置 | ✅ |
| [`platform/topems-flow/backend/.env.example`](file:///Users/xingzhai/TOPEMS/platform/topems-flow/backend/.env.example) | 工作流服务环境变量模板 | ✅ |
| [`services/notification-service/.env.example`](file:///Users/xingzhai/TOPEMS/services/notification-service/.env.example) | 通知服务环境变量模板 | ✅ |

### 4. Rust 配置模块

| 文件路径 | 说明 |
| ------ ------ ------ |
| [`shared/lib/Cargo.toml`](file:///Users/xingzhai/TOPEMS/shared/lib/Cargo.toml) | 共享库依赖配置 |
| [`shared/lib/src/lib.rs`](file:///Users/xingzhai/TOPEMS/shared/lib/src/lib.rs) | 模块入口 |
| [`shared/lib/src/config/mod.rs`](file:///Users/xingzhai/TOPEMS/shared/lib/src/config/mod.rs) | 配置加载和验证 |
| [`shared/lib/src/error.rs`](file:///Users/xingzhai/TOPEMS/shared/lib/src/error.rs) | 错误处理 |

### 5. 前端配置模块

| 文件路径 | 说明 |
| ------ ------ ------ |
| [`frontend/src/config/runtime.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/config/runtime.ts) | 运行时配置加载器 |
| [`frontend/src/config/types.ts`](file:///Users/xingzhai/TOPEMS/frontend/src/config/types.ts) | TypeScript 类型定义 |
| [`frontend/src/config/README.md`](file:///Users/xingzhai/TOPEMS/frontend/src/config/README.md) | 使用说明 |

### 6. 脚本和工具

| 文件路径 | 说明 | 权限 |
| ------ ------ ------ |
| [`scripts/setup-env.sh`](file:///Users/xingzhai/TOPEMS/scripts/setup-env.sh) | 环境初始化脚本 | ✅ 可执行 |
| [`scripts/validate-config.sh`](file:///Users/xingzhai/TOPEMS/scripts/validate-config.sh) | 配置验证脚本 | ✅ 可执行 |
| [`scripts/db_migrate.sh`](file:///Users/xingzhai/TOPEMS/scripts/db_migrate.sh) | 数据库迁移脚本 | ✅ 可执行 |
| [`scripts/setup-test-env.sh`](file:///Users/xingzhai/TOPEMS/scripts/setup-test-env.sh) | 测试环境设置脚本 | ✅ 可执行 |

### 7. 文档

| 文件路径 | 说明 |
| ------ ------ ------ |
| [`docs/my/CONFIGURATION_GUIDE.md`](file:///Users/xingzhai/TOPEMS/docs/my/CONFIGURATION_GUIDE.md) | 完整配置指南 |
| [`.gitignore.example`](file:///Users/xingzhai/TOPEMS/.gitignore.example) | .gitignore 配置示例 |

### 8. 安全配置

| 文件路径 | 说明 |
| ------ ------ ------ |
| [`.gitignore`](file:///Users/xingzhai/TOPEMS/.gitignore) | 已更新，排除所有敏感文件 |

## 🔧 配置分类详解

### 数据库配置

- **DATABASE_URL**: PostgreSQL 连接字符串
- **POSTGRES_HOST/PORT/NAME/USER/PASSWORD**: 数据库连接参数
- **DB_POOL_MAX_SIZE/MIN_SIZE**: 连接池配置

### 认证配置

- **JWT_SECRET/EXPIRATION**: JWT 令牌配置
- **JWT_REFRESH_SECRET/EXPIRY_DAYS**: Refresh Token 配置
- **SESSION_SECRET/TIMEOUT_MINUTES**: 会话配置

### 服务配置

- **各服务端口**: IAM, DOC, AI, FLOW, EHS, LIMS, PDM, QMS, RS, SRM, ERP, NOTIFICATION, REPORT
- **CORS_ORIGINS**: 跨域白名单
- **RATE_LIMIT**: 速率限制配置

### Redis 配置

- **REDIS_URL/HOST/PORT/PASSWORD**: Redis 连接
- **REDIS_DB/POOL_MAX_SIZE**: 连接池配置

### 文件存储配置

- **UPLOAD_DIR/MAX_SIZE**: 上传配置
- **ALLOWED_FILE_TYPES**: 文件类型限制
- **STORAGE_PROVIDER**: 存储提供者
- **STORAGE_LOCAL_PATH**: 本地存储路径
- **STORAGE_TYPE**: 存储类型（local, s3, minio）

### AI 服务配置

- **OLLAMA_BASE_URL/MODEL/TIMEOUT**: Ollama 配置
- **RAG_CHUNK_SIZE/OVERLAP/MAX_RESULTS**: RAG 配置

### 日志配置

- **LOG_LEVEL/FORMAT**: 日志级别和格式
- **RUST_LOG**: Rust 日志配置
- **LOG_FILE_ENABLED/PATH**: 文件日志配置

## 📝 文档管理服务配置

### 文档服务特定配置

| 变量名 | 说明 | 示例值 |
| ------ ------ ------ |
| **DATABASE_URL** | 文档服务数据库连接 | `postgres://topems:topems_secret@localhost:5432/topems_doc` |
| **SERVER_HOST** | 服务监听地址 | `0.0.0.0` |
| **SERVER_PORT** | 服务端口 | `8001` |
| **STORAGE_TYPE** | 存储类型 | `local` |
| **STORAGE_LOCAL_PATH** | 本地存储路径 | `./storage/files` |
| **STORAGE_PATH** | 文件存储路径 | `./uploads` |
| **JWT_SECRET** | JWT 验证密钥 | 与 IAM 服务一致 |
| **JWT_EXPIRES_IN** | JWT 过期时间 | `86400` |

### 存储服务配置

文档服务支持多种存储后端：

#### 本地存储模式

```env
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./storage/files
```

#### MinIO/S3 模式

```env
STORAGE_TYPE=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=topems-docs
MINIO_REGION=us-east-1
```

## 🚀 快速开始

### 1. 初始化环境

```bash
# 运行初始化脚本
./scripts/setup-env.sh

# 或手动复制配置文件
cp .env.example .env
cp frontend/.env.development frontend/.env.local
```

### 2. 配置验证

```bash
# 运行验证脚本
./scripts/validate-config.sh
```

### 3. 启动服务

#### 使用 Docker（推荐）

```bash
# 启动基础设施
cd docker
docker-compose up -d

# 检查服务状态
docker-compose ps
```

#### 手动启动

```bash
# 启动文档服务（示例）
cd platform/topems-doc/backend
cargo run

# 启动 IAM 服务
cd platform/topems-iam/backend
cargo run

# 启动前端
cd frontend
npm install
npm run dev
```

## 🔒 安全性特性

### 1. 敏感信息保护

- `.env` 文件已加入 `.gitignore`
- 仅模板文件（`.env.example`）被追踪
- 本地覆盖文件（`.env.local`）不会被提交
- 各微服务独立的 `.env` 配置

### 2. 生产环境配置

- 使用环境变量注入敏感信息
- 支持 Kubernetes Secrets 集成
- 支持 Vault 密钥管理
- 各服务独立的数据库 Schema

### 3. 密钥管理

- JWT 密钥最少 32 字符
- 会话密钥最少 32 字符
- 数据库密码建议最少 8 字符
- 各服务独立的密钥配置

## 📊 配置优先级

### Rust 后端

```text
命令行参数 > 环境变量 > .env 文件 > 默认值
```

### 前端 (Vite)

```text
.env.local > .env.[MODE].local > .env.[MODE] > .env
```

### 微服务配置

```text
服务本地 .env > 项目根目录 .env > 默认值
```

## 🔥 热重载支持

配置热重载已在开发环境中启用：

```rust
// 使用共享配置库
use topems_shared::config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::load().await?;
    config.validate()?;
    
    let db_config = config.get_database().await;
    println!("Database: {}:{}", db_config.host, db_config.port);
    
    Ok(())
}
```

## 📝 使用示例

### 后端使用

```rust
use topems_shared::config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::load().await?;
    config.validate()?;
    
    let db_config = config.get_database().await;
    println!("Database: {}:{}", db_config.host, db_config.port);
    
    Ok(())
}
```

### 前端使用

```typescript
import config from './config/runtime';

// API 配置
const apiUrl = config.api.baseUrl;
const wsUrl = config.ws.url;

// 功能开关
if (config.features.debugMode) {
  console.log('Debug mode enabled');
}

// 服务 URL
const iamUrl = config.services.iam;
const docUrl = config.services.doc;
```

## 🧪 测试配置

```bash
# 运行测试（使用测试环境）
APP_ENV=test cargo test

# 验证配置
./scripts/validate-config.sh

# 设置测试环境
./scripts/setup-test-env.sh
```

## 📈 最佳实践

1. **始终使用模板创建新环境**

   ```bash
   cp .env.example .env
   ```

2. **定期轮换密钥**

   ```bash
   # 生成新密钥
   openssl rand -base64 32
   ```

3. **验证配置**

   ```bash
   ./scripts/validate-config.sh
   ```

4. **生产环境使用密钥管理服务**
   - Kubernetes Secrets
   - HashiCorp Vault
   - AWS Secrets Manager

5. **各服务独立配置**
   - 文档服务有独立的数据库 Schema
   - IAM 服务有独立的权限系统
   - 使用服务发现机制连接各服务

## 🔍 故障排查

| 问题 | 解决方案 |
| ------ ------ ------ |
| 配置未加载 | 检查 `.env` 文件是否存在 |
| 敏感信息泄露 | 确认 `.gitignore` 配置正确 |
| 验证失败 | 运行 `./scripts/validate-config.sh` |
| 端口冲突 | 检查各服务端口配置 |
| 数据库连接失败 | 检查 PostgreSQL 是否运行及连接字符串 |
| 存储服务初始化失败 | 检查存储路径权限和配置 |

## 📞 支持

如遇问题，请参考：

- [配置指南](./CONFIGURATION_GUIDE.md)
- [数据库使用指南](./数据库使用指南.md)
- [文档服务拆分指南](./最先拆分模块及拆分要求与原则-文档管理服务.md)
- 运行验证脚本检查配置

---

**版本**: 2.0.0  
**最后更新**: 2026-05-23  
**维护者**: TOPEMS Team
