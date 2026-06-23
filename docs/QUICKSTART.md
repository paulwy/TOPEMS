# TOPEMS 快速入门指南

> 5 分钟内启动 TOPEMS 平台

## 概述

本指南帮助你在最短时间内启动并运行 TOPEMS 企业级数字化平台。

## 前提条件

| 软件 | 最低版本 | 检查命令 |
|------|----------|----------|
| Rust | 1.70+ | `rustc --version` |
| Node.js | 18+ | `node --version` |
| PostgreSQL | 14+ | `psql --version` |
| Redis | 7+ | `redis-cli --version` |
| Docker | 20+ | `docker --version` |
| pnpm | 8+ | `pnpm --version` |

## 快速启动

### 步骤 1：克隆项目

```bash
git clone <repository-url>
cd TOPEMS
```

### 步骤 2：配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 生成 JWT 密钥
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env
```

### 步骤 3：启动数据库

使用 Docker 启动 PostgreSQL 和 Redis：

```bash
cd docker
docker compose up -d postgres redis
cd ..
```

### 步骤 4：启动后端服务

```bash
# 启动所有服务（编译 + 启动）
./scripts/topems.sh start

# 查看服务状态
./scripts/topems.sh status
```

**预期输出**：

```
✅ unified-core (8000) - 运行中
✅ erp (8010) - 运行中
✅ hrm (8020) - 运行中
✅ pm (8023) - 运行中
✅ crm (8029) - 运行中
✅ mes (8030) - 运行中
✅ pdm (8031) - 运行中
✅ scm (8040) - 运行中
✅ wms (8041) - 运行中
✅ srm (8042) - 运行中
✅ qms (8050) - 运行中
✅ lims (8051) - 运行中
✅ ehs (8052) - 运行中
✅ rs (8053) - 运行中
✅ bi (8060) - 运行中
✅ report (8061) - 运行中
✅ monitor (8062) - 运行中
✅ portal (8063) - 运行中
✅ ai (8064) - 运行中
✅ mobile (8070) - 运行中
✅ gis (8071) - 运行中
✅ integration (8072) - 运行中
```

### 步骤 5：启动前端

```bash
cd apps/web
pnpm install
pnpm dev
```

### 步骤 6：访问系统

| 服务 | URL |
|------|-----|
| 前端 | http://localhost:3000 |
| API 网关 | http://localhost:8000 |
| 健康检查 | http://localhost:8000/health |

**默认账号**：
- 用户名：`admin`
- 密码：`admin123`

---

## 验证安装

### 1. 健康检查

```bash
# 核心服务
curl http://localhost:8000/health

# AI 服务
curl http://localhost:8064/health

# HRM 服务
curl http://localhost:8020/health
```

### 2. API 测试

```bash
# 登录获取 Token
TOKEN=$(curl -s -X POST http://localhost:8000/api/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# 获取当前用户
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/iam/users/me

# 获取员工列表
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8020/api/hrm/employees
```

### 3. AI 测试

```bash
# 智能对话
curl -X POST http://localhost:8064/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"你好，TOPEMS"}'
```

---

## 常用命令

### 服务管理

```bash
# 启动所有服务
./scripts/topems.sh start

# 启动指定服务
./scripts/topems.sh start hrm

# 停止所有服务
./scripts/topems.sh stop

# 重启服务
./scripts/topems.sh restart hrm

# 查看服务状态
./scripts/topems.sh status

# 查看日志
./scripts/topems.sh logs

# 验证环境
./scripts/topems.sh validate-env
```

### 数据库

```bash
# 连接数据库
psql -U topems -d topems

# 查看表
\dt

# 查看数据
SELECT * FROM iam.users LIMIT 10;
```

### Docker

```bash
# 查看容器
docker ps

# 查看日志
docker compose logs -f postgres

# 停止
docker compose down
```

---

## 下一步

- 📖 阅读 [架构设计](./architecture/overview.md) 了解系统架构
- 🚀 阅读 [部署指南](./deployment-guide.md) 部署到生产环境
- 🔌 阅读 [API 文档](./api/README.md) 集成 API
- 🔧 遇到问题查看 [故障排查手册](./TROUBLESHOOTING.md)

---

## 常见问题

### Q: 启动失败，提示端口被占用？

A: 清理端口后重试：

```bash
# 清理所有 TOPEMS 端口
for port in 8000 8010 8020 8023 8029 8030 8031 8040 8041 8042 8050 8051 8052 8053 8060 8061 8062 8063 8064 8070 8071 8072; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null
done

./scripts/topems.sh start
```

### Q: 数据库连接失败？

A: 检查 PostgreSQL 是否运行：

```bash
# Docker 方式
docker ps | grep postgres

# 本地方式
sudo systemctl status postgresql
```

### Q: AI 服务无法响应？

A: 启动 Ollama 并下载模型：

```bash
ollama serve
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
```

### Q: 如何修改默认端口？

A: 编辑 `config/services.yaml` 和 `.env` 文件，参考 [端口分配规则](./port-allocation-rules.md)。

---

## 获取帮助

- 📖 [完整文档中心](./README.md)
- 🐛 [故障排查](./TROUBLESHOOTING.md)
- 🔄 [变更日志](./CHANGELOG.md)
- 📋 [TODO 列表](./TODO.md)
- 💬 提交 Issue
