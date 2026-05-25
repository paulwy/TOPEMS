# TOPEMS - 化工新材料企业数字化平台

TOPEMS 是面向高科技添加剂、精细化工、新材料研发生产型企业的全业务数字化平台。

## 📦 项目概览

### 🎉 最新更新 (v2.1.0)

**统一前端门户已上线！**
- ✅ 统一的登录/注册界面
- ✅ 简洁的仪表板
- ✅ 服务状态实时监控
- ✅ 集成所有后端服务
- ✅ 访问地址: http://localhost:3000

### 已完成服务状态
| 服务 | 状态 | 后端 | 前端 | 端口 | 优先级 |
|-----|------|------|------|------|--------|
| **统一门户** | ✅ 新上线 | - | React | 3000 | ⭐⭐⭐ |
| **topems-doc** | ✅ 可用 | ✅ Rust | ✅ React | 8001 / 5173 | 基础 |
| **topems-iam** | ✅ 可用 | ✅ Rust | ✅ React | 8002 / 5174 | 基础 |
| **topems-ai** | ✅ 可用 | ✅ Rust | ✅ React | 8003 / 5175 | 基础 |
| **topems-flow** | ✅ 可用 | ✅ Rust | ✅ React | 8004 / 5176 | 基础 |
| **topems-rs** | ✅ 可用 | ✅ Rust | ✅ React | 8005 / 5177 | ⭐⭐⭐ |
| **topems-lims** | ✅ 可用 | ✅ Rust | ✅ React | 8006 / 5178 | ⭐⭐⭐ |

### 完整产品列表
| 服务 | 优先级 | 说明 |
|-----|--------|------|
| topems-ai | ⭐⭐⭐ | 智能AI知识库 (Ollama 集成) |
| topems-rs | ⭐⭐⭐ | 科研研发管理系统 |
| topems-lims | ⭐⭐⭐ | 实验室信息管理系统 |
| topems-qms | ⭐⭐ | 质量合规管理系统 |
| topems-ehs | ⭐⭐ | 安全环保职业健康系统 |
| topems-erp | ⭐⭐ | 新材料专用ERP |
| topems-srm | ⭐ | 供应商管理系统 |
| topems-gis | ⭐ | 厂区空间数字化系统 |
| topems-bi | ⭐ | 数据大屏与报表中台 |

## 🚀 快速开始

### 1. 启动统一前端门户 (推荐)

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000 并使用以下演示账号登录：
- 用户名: `testuser`
- 密码: `Test123456`

### 2. 启动后端服务

在不同的终端窗口中运行：

```bash
# IAM 服务 (身份认证)
cd platform/topems-iam/backend && cargo run

# DOC 服务 (文档管理)
cd platform/topems-doc/backend && cargo run

# AI 服务 (AI 知识库 - 需要 Ollama)
cd services/topems-ai/backend && cargo run

# FLOW 服务 (工作流)
cd platform/topems-flow/backend && cargo run
```

### 3. 测试所有服务

```bash
./verify-services.sh    # 验证后端编译
./test_all_services.sh  # 测试所有服务
```

### 查看详细文档

- [快速开始指南](./QUICKSTART.md)
- [项目状态报告](./PROJECT_STATUS_REPORT.md)
- [服务测试报告](./SERVICE_TEST_REPORT_FINAL.md)
- [API 规范](./docs/api-specification.md)
- [完整文档索引](./docs/my/README.md)

## 📖 文档

- [PROJECT_STATUS_REPORT.md](PROJECT_STATUS_REPORT.md) - **项目状态报告（推荐阅读）**
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - 项目进度
- [QUICKSTART.md](QUICKSTART.md) - 快速启动指南
- [GETTING_STARTED.md](GETTING_STARTED.md) - 详细启动指南
- [AI_SETUP_GUIDE.md](AI_SETUP_GUIDE.md) - AI 配置指南
- [infrastructure/DOCKER_TROUBLESHOOT.md](infrastructure/DOCKER_TROUBLESHOOT.md) - Docker 配置
- [docs/architecture/overview.md](docs/architecture/overview.md) - 架构设计

## 🛠 技术栈

### 前端
- **框架**: React 18
- **语言**: TypeScript 5
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4
- **路由**: React Router 6
- **HTTP 客户端**: Axios

### 后端
- **语言**: Rust
- **框架**: Axum
- **ORM**: SQLx
- **异步**: Tokio

### 基础设施
- **数据库**: PostgreSQL 16 + Redis 7
- **容器化**: Docker + Docker Compose
- **AI**: Ollama + qwen2.5:7b-instruct

## 🌟 核心功能

### ✅ 已完成

- 用户认证与权限管理 (JWT)
- 文档管理 (上传、下载、版本控制)
- AI 知识库 (基于 Ollama 本地模型)
- 工作流引擎 (审批、任务管理)
- 统一前端门户
- 完整的 RESTful API
- 服务健康检查
- Docker 容器化部署

### 🔄 开发中

- 数据库持久化集成
- 完整的 API 网关
- 前端功能页面开发

### 📋 计划中

- Kubernetes 部署方案
- 监控告警系统
- CI/CD 自动化
- 业务系统 (RS, LIMS, QMS)

## 💡 技术亮点

1. **现代化技术栈**: React + TypeScript + Rust
2. **高性能**: Rust 后端提供卓越的性能
3. **AI 集成**: 本地部署 Ollama，保护数据隐私
4. **容器化**: Docker 一键部署
5. **模块化设计**: 微服务架构，易于扩展

## 📞 支持

- 📖 **完整架构设计**: 查看 [docs/my/TOPEMS 2.0 总体架构设计（完整版）.md](./docs/my/TOPEMS%202.0%20总体架构设计（完整版）.md)
- 📅 **实施计划**: 查看 [docs/my/TOPEMS 2.0 分阶段实施计划（详细版）.md](./docs/my/TOPEMS%202.0%20分阶段实施计划（详细版）.md)
- 📋 **当前进度**: 查看 [docs/my/阶段一完成报告.md](./docs/my/阶段一完成报告.md)
- 📚 **文档索引**: 查看 [docs/my/README.md](./docs/my/README.md) 所有文档索引
- 🐛 问题反馈: GitHub Issues
- 💡 功能建议: GitHub Discussions

## 版本历史

- **v2.1.0** (2026-05-21) - 统一前端门户上线，AI 服务集成 Ollama
- **v2.0.0** (2026-05-21) - 第二阶段完成，TOPEMS-RS 和 TOPEMS-LIMS 可用
- **v1.0.0** (2026-05-21) - 第一阶段完成，基础服务可用

## 🤝 贡献

欢迎提交 Pull Request！

## 📄 许可证

MIT License

---

**准备好开始了吗？** 访问 http://localhost:3000 体验统一前端门户！
