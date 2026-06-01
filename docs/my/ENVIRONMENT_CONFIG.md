# TOPEMS 环境配置指南

## 一、统一环境变量

### 1.1 配置文件位置

所有服务共享统一的环境配置文件：

```
/Users/xingzhai/TOPEMS/.env
```

### 1.2 配置项说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| POSTGRES_HOST | localhost | 数据库主机 |
| POSTGRES_PORT | 5432 | 数据库端口 |
| POSTGRES_USER | topems | 数据库用户名 |
| POSTGRES_PASSWORD | topems_secret | 数据库密码 |
| POSTGRES_DB | topems | 数据库名称 |
| REDIS_HOST | localhost | Redis 主机 |
| REDIS_PORT | 6379 | Redis 端口 |
| IAM_PORT | 8002 | IAM 服务端口 |
| RS_PORT | 8005 | RS 服务端口 |
| LIMS_PORT | 8006 | LIMS 服务端口 |
| JWT_SECRET | topems-jwt-secret-key-change-in-production-2026 | JWT 密钥 |
| JWT_EXPIRATION | 3600 | Token 过期时间（秒） |

### 1.3 自动生成的连接字符串

```bash
# 数据库连接 URL
DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# Redis 连接 URL
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}
```

## 二、服务配置

### 2.1 服务端口分配

| 服务 | 端口 | 环境变量 |
|------|------|----------|
| TOPEMS-IAM | 8002 | IAM_PORT |
| TOPEMS-DOC | 8001 | DOC_PORT |
| TOPEMS-AI | 8003 | AI_PORT |
| TOPEMS-FLOW | 8004 | FLOW_PORT |
| TOPEMS-RS | 8005 | RS_PORT |
| TOPEMS-LIMS | 8006 | LIMS_PORT |
| TOPEMS-QMS | 8087 | QMS_PORT |
| TOPEMS-EHS | 8089 | EHS_PORT |
| TOPEMS-SRM | 8090 | SRM_PORT |

### 2.2 各服务配置文件

每个服务有独立的 `.env` 文件，引用统一环境变量：

```bash
# IAM 服务: /platform/topems-iam/backend/.env
PORT=${IAM_PORT:-8002}
DATABASE_URL=${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}

# RS 服务: /services/topems-rs/backend/.env
PORT=${RS_PORT:-8005}
DATABASE_URL=${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}

# LIMS 服务: /services/topems-lims/backend/.env
PORT=${LIMS_PORT:-8006}
DATABASE_URL=${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}
```

## 三、快速启动

### 3.1 使用启动脚本

```bash
# 启动所有服务
cd /Users/xingzhai/TOPEMS
./scripts/start-all-services.sh

# 停止所有服务
lsof -ti:8002 | xargs kill -9
lsof -ti:8005 | xargs kill -9
lsof -ti:8006 | xargs kill -9
```

### 3.2 手动启动

```bash
# 启动 IAM 服务
cd /platform/topems-iam/backend
cargo run

# 启动 RS 服务
cd /services/topems-rs/backend
cargo run

# 启动 LIMS 服务
cd /services/topems-lims/backend
cargo run
```

## 四、测试账号

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| admin | Admin123 | 管理员 | 全部权限（22项） |
| user | User123 | 普通用户 | 部分权限 |
| guest | Guest123 | 访客 | 只读权限 |

## 五、健康检查

```bash
# 检查所有服务状态
curl http://localhost:8002/health  # IAM
curl http://localhost:8005/health  # RS
curl http://localhost:8006/health  # LIMS
```

## 六、注意事项

1. **环境变量优先级**：服务本地 `.env` > 统一 `.env` > 默认值
2. **数据库配置**：确保 PostgreSQL 运行在端口 5432
3. **JWT 密钥**：生产环境请修改 `JWT_SECRET`
4. **端口冲突**：避免其他服务占用 8002/8005/8006 端口
5. **日志文件**：服务日志输出到 `/tmp/topems-*.log`

## 七、配置验证

```bash
# 验证环境变量加载
cd /Users/xingzhai/TOPEMS
export $(cat .env | grep -v '^#' | xargs)
echo "DATABASE_URL: $DATABASE_URL"
echo "IAM_PORT: $IAM_PORT"
echo "RS_PORT: $RS_PORT"
echo "LIMS_PORT: $LIMS_PORT"
```