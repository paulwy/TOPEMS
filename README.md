# TOPEMS - 化工新材料企业数字化平台

> 面向高科技添加剂、精细化工、新材料研发生产型企业的全业务数字化平台

## 🚀 快速开始

### 本地开发（推荐）

使用我们的一键启动脚本快速开始：

```bash
# 1. 一键启动所有服务
cd /Users/air/TOPEMS
./scripts/start-all.sh

# 2. 访问 http://localhost:3000
# 账号: admin
# 密码: admin123
```

### 一键停止所有服务：
```bash
./scripts/stop-all.sh
```

### Docker 部署

查看 [docker 目录文档](./docker/README.md) 了解 Docker 部署方案。

## 📦 已实现服务

| 服务 | 端口 | 说明 |
|------|------|------|
| **Frontend** | 3000 | 统一前端门户 |
| **IAM** | 8002 | 身份认证与权限管理 |
| **DOC** | 8001 | 文档管理 |
| **AI** | 8003 | AI 知识库（Ollama） |
| **FLOW** | 8004 | 工作流引擎 |
| **RS** | 8005 | 研发项目管理 |
| **LIMS** | 8006 | 实验室信息管理 |
| **QMS** | 8012 | 质量管理 |
| **ERP** | 8009 | 企业资源管理 |
| **HRM** | 8010 | 人力资源管理 |
| **GIS** | 8011 | 地理信息管理 |
| **EHS** | 8016 | 环境安全管理 |
| **PDM** | 8015 | 产品数据管理 |
| **SRM** | 8018 | 供应商管理 |
| **IM** | 8017 | 即时通讯 |

## 📖 文档

| 文档 | 说明 |
|------|------|
| [用户指南](docs/guides/USER_GUIDE.md) | 完整的用户使用指南 |
| [架构设计](docs/architecture/overview.md) | 系统架构设计文档 |
| [Docker 部署](docker/README.md) | Docker 部署指南 |
| [脚本说明](scripts/README.md) | 开发与运维脚本说明 |
| [API 文档](docs/) | 各服务 API 文档（`docs/API_*.md`） |

## 🛠 技术栈

**前端**: React 18 + TypeScript + Vite + Tailwind CSS

**后端**: Rust + Axum + SQLx + Tokio

**基础设施**: PostgreSQL + Redis + Docker

## 📁 项目结构

```
TOPEMS/
├── docs/                    # 项目文档
│   ├── guides/             # 用户指南
│   ├── services/          # 服务文档
│   ├── architecture/        # 架构文档
│   └── API_*.md          # API 文档
├── frontend/               # 前端应用
├── services/               # 业务微服务
├── platform/               # 平台服务
├── shared/                 # 共享库
├── docker/                 # Docker 配置
└── scripts/                # 工具脚本
```

## 🤝 贡献

查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何贡献代码。

## 📄 许可证

MIT License

---

**版本**: v2.2.0 | **更新**: 2026-05-31
