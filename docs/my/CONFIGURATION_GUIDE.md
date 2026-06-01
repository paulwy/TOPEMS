# TOPEMS 环境变量配置指南

## 📋 概述

本文档详细介绍 TOPEMS 系统的环境变量配置管理，包括配置文件的组织、加载优先级、安全管理等内容。

## 📁 配置文件结构

```text
TOPEMS/
├── .env.example              # 主模板文件（包含所有配置项）
├── .env.development          # 开发环境配置
├── .env.test                 # 测试环境配置
├── .env.production           # 生产环境配置
├── .env.docker               # Docker 环境配置
├── .gitignore                # Git 忽略规则
├── .gitignore.example        # .gitignore 配置示例
├── frontend/
│   ├── .env.example          # 前端环境变量模板
│   ├── .env.development      # 前端开发环境
│   ├── .env.test             # 前端测试环境
│   ├── .env.production       # 前端生产环境
│   └── src/config/           # 前端配置加载模块
├── platform/
│   ├── topems-doc/
│   │   └── backend/
│   │       ├── .env.example  # 文档服务配置模板
│   │       └── src/
│   │           └── db/migrations/  # 数据库迁移文件
│   ├── topems-iam/
│   │   └── backend/
│   │       └── src/
│   │           └── db/migrations/  # IAM 服务迁移文件
│   └── topems-flow/
│       └── backend/
│           └── .env.example  # 工作流服务配置
├── services/
│   └── notification-service/
│       └── .env.example      # 通知服务配置
├── scripts/                  # 配置和管理脚本
├── docker/                   # Docker Compose 配置
└── shared/
    └── lib/
        └── src/
            └── config/        # Rust 配置加载模块
```

## 🚀 快速开始

### 1. 开发环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 复制前端环境变量模板
cp frontend/.env.development frontend/.env.local
```

### 2. 配置数据库和依赖服务

```bash
# 使用 Docker 启动基础设施
cd docker
docker-compose up -d

# 检查服务状态
docker-compose ps
```

### 3. 启动文档服务

```bash
# 启动文档服务（使用内存模式，无需数据库）
cd platform/topems-doc/backend
cargo run

# 访问健康检查
curl http://localhost:8001/health
```

## ⚙️ 配置分类详解

### 1. 数据库配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| DATABASE_URL | 数据库连接 URL | `postgres://user:pass@host:5432/db` |
| POSTGRES_HOST | 数据库主机 | `localhost` |
| POSTGRES_PORT | 数据库端口 | `5432` |
| POSTGRES_DB | 数据库名称 | `topems` |
| POSTGRES_USER | 数据库用户名 | `topems` |
| POSTGRES_PASSWORD | 数据库密码 | `your_password` |
| DB_POOL_MAX_SIZE | 连接池最大大小 | `20` |
| DB_POOL_MIN_SIZE | 连接池最小大小 | `5` |

### 2. 认证配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| JWT_SECRET | JWT 签名密钥（至少 32 字符） | `your-secret-key-here` |
| JWT_EXPIRATION | JWT 过期时间（秒） | `86400` |
| JWT_REFRESH_SECRET | Refresh Token 密钥 | `your-refresh-secret` |
| JWT_REFRESH_EXPIRY_DAYS | Refresh Token 过期天数 | `7` |
| SESSION_SECRET | 会话密钥 | `session-secret` |
| SESSION_TIMEOUT_MINUTES | 会话超时时间（分钟） | `120` |

### 3. 服务配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| IAM_PORT | IAM 服务端口 | `8002` |
| DOC_PORT | 文档服务端口 | `8001` |
| AI_PORT | AI 服务端口 | `8003` |
| FLOW_PORT | 工作流服务端口 | `8004` |
| BACKEND_PORT | 主后端端口 | `8080` |
| NOTIFICATION_PORT | 通知服务端口 | `8081` |
| REPORT_PORT | 报告服务端口 | `8082` |
| LIMS_PORT | LIMS 服务端口 | `8086` |
| QMS_PORT | QMS 服务端口 | `8087` |
| RS_PORT | RS 服务端口 | `8088` |
| EHS_PORT | EHS 服务端口 | `8089` |
| SRM_PORT | SRM 服务端口 | `8090` |
| CORS_ORIGINS | 允许的跨域来源 | `http://localhost:5173,http://localhost:3000` |
| RATE_LIMIT_REQUESTS | 速率限制（请求数/时间窗口） | `100` |
| RATE_LIMIT_WINDOW_SECONDS | 速率限制时间窗口（秒） | `60` |

### 4. Redis 配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| REDIS_URL | Redis 连接 URL | `redis://localhost:6379` |
| REDIS_HOST | Redis 主机 | `localhost` |
| REDIS_PORT | Redis 端口 | `6379` |
| REDIS_PASSWORD | Redis 密码（可选） | `password` |
| REDIS_DB | Redis 数据库编号 | `0` |
| REDIS_POOL_MAX_SIZE | 连接池最大大小 | `10` |

### 5. 文件存储配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| UPLOAD_DIR | 上传文件存储目录 | `./uploads` |
| MAX_UPLOAD_SIZE | 最大上传文件大小（字节） | `104857600` |
| ALLOWED_FILE_TYPES | 允许的文件类型 | `jpg,pdf,doc,docx,xlsx,pptx` |
| STORAGE_PROVIDER | 存储提供者 | `local` 或 `s3` 或 `minio` |
| STORAGE_LOCAL_PATH | 本地存储路径 | `./storage/files` |

### 6. 邮件配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| SMTP_HOST | SMTP 服务器地址 | `smtp.example.com` |
| SMTP_PORT | SMTP 端口 | `587` |
| SMTP_USER | SMTP 用户名 | `noreply@example.com` |
| SMTP_PASSWORD | SMTP 密码 | `password` |
| SMTP_FROM | 发件人地址 | `topems@example.com` |
| SMTP_USE_TLS | 是否启用 TLS | `true` |

### 7. AI 服务配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| OLLAMA_BASE_URL | Ollama 服务地址 | `http://localhost:11434` |
| OLLAMA_MODEL | Ollama 模型名称 | `qwen2.5:7b-instruct` |
| RAG_CHUNK_SIZE | RAG 分块大小 | `500` |
| RAG_CHUNK_OVERLAP | RAG 块重叠大小 | `50` |
| AI_API_KEY | 第三方 AI API 密钥 | `sk-xxx` |

### 8. 日志配置

| 变量名 | 说明 | 示例值 |
| ------ | ------ | ------ |  
| LOG_LEVEL | 日志级别 | `info`, `debug`, `warn` |
| LOG_FORMAT | 日志格式 | `json`, `pretty` |
| RUST_LOG | Rust 日志级别 | `info,topems=debug` |
| RUST_BACKTRACE | 错误回溯信息 | `1` |
| LOG_FILE_ENABLED | 是否启用文件日志 | `true` |
| LOG_FILE_PATH | 日志文件路径 | `./logs/app.log` |

## 📝 文档管理服务配置详解

### 文档服务特定配置

| 变量名 | 说明 | 示例值 | 必需 |
| ------ | ------ | ------ | ------ |  
| **DATABASE_URL** | 文档服务数据库连接 | `postgres://topems:topems_secret@localhost:5432/topems_doc` | 否（内存模式可用） |
| **SERVER_HOST** | 服务监听地址 | `0.0.0.0` | 否 |
| **SERVER_PORT** | 服务端口 | `8001` | 否 |
| **STORAGE_TYPE** | 存储类型 | `local` | 否 |
| **STORAGE_LOCAL_PATH** | 本地存储路径 | `./storage/files` | 否 |
| **STORAGE_PATH** | 文件存储路径 | `./uploads` | 否 |
| **JWT_SECRET** | JWT 验证密钥 | 与 IAM 服务一致 | 否 |
| **JWT_EXPIRES_IN** | JWT 过期时间 | `86400` | 否 |

### 存储服务配置

文档服务支持多种存储后端：

#### 本地存储模式（默认）

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

### 混合存储模式

文档服务支持灵活的存储模式：

1. **内存模式（默认）**：无需数据库，使用内存存储
2. **数据库模式**：使用 PostgreSQL 存储元数据
3. **混合模式**：尝试数据库连接，失败时自动回退到内存模式

## 🔒 安全性配置

### 开发环境

- 调试模式已启用
- CORS 允许本地开发地址
- 速率限制已禁用
- 详细的日志输出
- 支持内存模式无需数据库

### 生产环境

- 调试模式已禁用
- HTTPS 强制启用
- 严格的 CORS 配置
- 速率限制启用
- 敏感信息通过环境变量注入
- 日志仅输出关键信息
- 各服务独立的数据库 Schema

## 🔄 配置加载优先级

### 微服务配置加载

```text
服务本地 .env > 项目根目录 .env > 环境变量 > 默认值
```

### Rust 后端配置

```text
命令行参数 > 环境变量 > .env 文件 > 默认值
```

在 Rust 后端，配置按以下优先级加载（从高到低）：

1. **命令行参数**（最高优先级）
2. **环境变量**（如 `APP_ENV=production`）
3. **.env 文件**
   - `.env.[APP_ENV].local` （本地覆盖，不提交）
   - `.env.[APP_ENV]` （环境特定配置）
   - `.env.local` （本地覆盖，不提交）
   - `.env` （基础配置）
4. **默认值**（最低优先级）

### 前端 (Vite)

```text
.env.local > .env.[MODE].local > .env.[MODE] > .env
```

前端只能访问以 `VITE_` 为前缀的变量。

## 🔥 配置热重载

开发环境支持配置热重载：

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

当配置文件发生变化时，可以触发配置重新加载：

```bash
# 发送 SIGHUP 信号重启配置
kill -HUP <pid>
```

## 🛡️ 敏感信息管理

### 开发环境_配置

- 使用 `.env.local` 文件存储本地敏感配置
- `.gitignore` 已排除所有敏感文件
- 各微服务独立的 `.env` 文件

### 生产环境_配置

######## 方案 1：环境变量注入

```yaml
# Kubernetes Deployment
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: topems-secrets
        key: db-password
```

######## 方案 2：Vault 集成

```rust
// 从 Vault 读取敏感配置
let secret = vault.read("secret/topems/db").await?;
```

######## 方案 3：配置加密

```bash
# 使用加密工具加密敏感配置
topems-config encrypt --input secrets.json --output secrets.enc
```

## 📊 前端环境变量

前端只能访问以 `VITE_` 为前缀的变量：

```bash
# 正确的用法
VITE_API_BASE_URL=http://localhost:8080
VITE_DOC_SERVICE_URL=http://localhost:8001

# 错误的用法（不会暴露）
SECRET_API_KEY=xxx
```

### 前端配置示例

```typescript
// 使用环境变量
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const docUrl = import.meta.env.VITE_DOC_SERVICE_URL;

// TypeScript 类型提示
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DOC_SERVICE_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_LOG_LEVEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## 🧪 测试配置

### 单元测试

```bash
# 使用测试环境配置
APP_ENV=test cargo test

# 使用测试环境设置脚本
./scripts/setup-test-env.sh
```

### 集成测试

```bash
# 使用独立的测试数据库
TEST_DATABASE_URL=postgres://... cargo test --test integration
```

## 🐳 Docker 环境

### 开发环境

```bash
cd docker
docker-compose up -d

# 检查服务
docker-compose ps
```

### 生产环境_配置_示例

```bash
# 从环境变量读取配置
docker run -e DB_HOST=db -e DB_PASSWORD=$DB_PASSWORD topems
```

### Docker 专用配置

使用 `.env.docker` 文件配置 Docker Compose 环境。

## 🛠️ 故障排查

### 配置未加载

1. 检查 `.env` 文件是否存在
2. 确认环境变量名拼写正确
3. 检查 `.gitignore` 是否误排除了配置文件
4. 确认各微服务的 `.env` 文件位置正确

### 数据库连接失败

1. 检查 PostgreSQL 服务是否运行
2. 验证连接字符串是否正确
3. 确认数据库用户权限
4. 查看服务日志获取详细错误

### 存储服务初始化失败

1. 检查存储路径是否存在并有写入权限
2. 验证存储配置是否正确
3. 检查 MinIO/S3 服务是否正常运行

### 配置验证失败

运行配置验证脚本：

```bash
./scripts/validate-config.sh
```

### 端口冲突

检查各服务端口配置，修改 `.env` 文件中的端口设置。

### 敏感信息泄露

1. 检查 `.gitignore` 是否正确配置
2. 确认 `.env` 文件未被提交
3. 生产环境使用密钥管理服务

## 📝 配置文件模板说明

### .env.example

包含所有配置项的完整模板，用于快速创建新环境。

### .env.development

开发环境专用配置，包含：

- 详细的日志输出
- 宽松的 CORS 配置
- 本地服务地址
- 内存模式默认支持

### .env.test

测试环境专用配置，包含：

- 独立的测试数据库
- Mock 服务配置
- 简化的认证配置

### .env.production

生产环境配置，包含：

- 脱敏的敏感信息占位符
- 生产级别参数
- 安全加固配置

### .env.docker

Docker 环境专用配置，包含：

- 容器间网络配置
- Docker 内部服务地址
- 容器存储路径配置

## 📞 支持

如遇到配置问题，请：

1. 查看服务日志输出
2. 运行配置验证：`./scripts/validate-config.sh`
3. 参考示例配置：`.env.example`
4. 查阅相关文档：
   - [配置摘要](./CONFIGURATION_SUMMARY.md)
   - [数据库使用指南](./数据库使用指南.md)
   - [文档服务拆分指南](./最先拆分模块及拆分要求与原则-文档管理服务.md)
5. 联系技术支持团队

## 🔗 相关文档

- [配置摘要](./CONFIGURATION_SUMMARY.md)
- [数据库使用指南](./数据库使用指南.md)
- [文档服务拆分指南](./最先拆分模块及拆分要求与原则-文档管理服务.md)
- [Docker 快速入门](../../infrastructure/DOCKER_QUICK_GUIDE.md)

---

**版本**: 2.0.0  
**最后更新**: 2026-05-23  
**维护者**: TOPEMS Team
