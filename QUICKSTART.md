# TOPEMS 快速开始指南

## 🚀 项目概览

TOPEMS 是面向化工新材料研发生产企业的全业务数字化平台，包含以下核心服务：

| 服务 | 端口 | 说明 |
|------|------|------|
| topems-iam | 8002 | 身份认证与权限管理 |
| topems-doc | 8001 | 文档管理服务 |
| topems-ai | 8003 | AI 智能知识库 |
| topems-flow | 8004 | 工作流与 OA |

## ✅ 环境要求

- **Rust**: 1.70 或更高版本
- **Node.js**: 18 或更高版本
- **Docker**: 用于运行基础设施服务（可选）
- **Git**: 版本控制

## 🔧 快速开始

### 1. 验证服务（推荐首先运行）

在开始任何开发工作前，先验证所有核心服务是否可以正常编译：

```bash
./verify-services.sh
```

如果看到所有服务都显示 "编译通过"，说明你的环境已经准备好！

### 2. 启动项目

项目提供了灵活的启动脚本：

#### 选项 1: 仅启动后端服务（最简单）

如果你只想测试后端 API，可以分别在独立终端中运行以下服务：

**启动 IAM 服务:**
```bash
cd platform/topems-iam/backend
cargo run
```

**启动 DOC 服务:**
```bash
cd platform/topems-doc/backend
cargo run
```

**启动 AI 服务:**
```bash
cd services/topems-ai/backend
cargo run
```

**启动 FLOW 服务:**
```bash
cd platform/topems-flow/backend
cargo run
```

#### 选项 2: 启动全部服务

```bash
# 首次使用需要添加执行权限
chmod +x start.sh stop.sh

# 启动基础架构服务（PostgreSQL + Redis）
./start.sh --infra

# 启动后端服务
./start.sh --backend

# 启动前端服务
./start.sh --frontend

# 一键启动全部服务
./start.sh --all
```

### 3. 停止服务

```bash
./stop.sh
```

## 📡 API 测试

### 健康检查

所有服务都提供健康检查接口：

```bash
# IAM 服务
curl http://localhost:8002/health

# DOC 服务
curl http://localhost:8001/health

# AI 服务
curl http://localhost:8003/health

# FLOW 服务
curl http://localhost:8004/health
```

### 统一的 API 响应格式

所有服务的 API 都使用统一的响应格式：

```json
{
  "code": 200,
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2024-05-21T12:34:56Z"
}
```

## 🎯 下一步

### 继续开发

1. 选择你想开发或测试的服务
2. 使用 `cargo run` 启动该服务
3. 使用 Postman、curl 或其他工具测试 API
4. 查看项目文档了解更多详情

### 配置 AI 服务（可选）

如果你想使用真实的 AI 服务，在 `services/topems-ai/backend/.env` 中配置：

```env
# OpenAI
OPENAI_API_KEY=your-key-here

# 或阿里云通义千问
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=qwen-turbo

# 或本地 Ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=llama2
```

## 📚 更多文档

- [项目 README](./README.md) - 完整项目说明
- [系统架构](./docs/architecture/overview.md) - 架构设计文档
- [API 规范](./docs/api-specification.md) - 完整 API 文档

## 💡 常见问题

**Q: 编译报错怎么办？**
A: 确保使用了较新版本的 Rust，并运行 `cargo update` 更新依赖。

**Q: 端口被占用？**
A: 检查是否有其他服务正在运行，或修改 `.env` 文件中的端口配置。

**Q: 数据库连接失败？**
A: 当前版本的核心服务使用内存存储作为演示，不需要数据库连接！

## 🎉 开始编码！

你现在已经准备好开始使用 TOPEMS 项目了！如果有任何问题，欢迎查看文档或提问。
