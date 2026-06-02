# TOPEMS

> 企业级数字化平台 - 文档管理、AI 协作、流程自动化、数据分析

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Rust](https://img.shields.io/badge/rust-1.70%2B-orange)
![React](https://img.shields.io/badge/react-18-blue)

## 🌟 功能特性

### 核心功能

- 📄 **文档管理** - 智能文档管理，版本控制，协作编辑
- 🤖 **AI 协作** - 智能问答，文档摘要，自动化建议
- 🔀 **流程自动化** - 可视化流程设计，审批工作流
- 📊 **数据分析** - 实时报表，数据可视化
- 🔐 **统一认证** - 多租户，权限管理，安全审计
- 🏭 **质量管控** - QMS质量管理，EHS安全环保
- 💼 **资源规划** - ERP企业资源，MES制造执行
- 📦 **供应链** - SCM供应链，SRM供应商，CRM客户关系
- 📦 **仓储物流** - WMS仓库管理
- 📈 **商业智能** - BI数据分析，PORTAL统一门户
- 👥 **人力资源** - HRM人力资源管理
- 🔬 **实验室** - LIMS实验室管理
- 🔬 **研发管理** - RS科研研发

### 技术亮点

- ⚡ **高性能** - Rust 后端，极快响应
- 📱 **响应式** - 完美适配移动端
- 🎨 **现代化** - 优雅的 UI 设计
- 🔒 **安全** - 企业级安全保障
- 🌐 **PWA 支持** - 离线访问，快速启动
- 🎯 **微服务架构** - 17个独立服务，灵活扩展

## 🚀 快速开始

### 使用 Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-org/topems.git
cd topems

# 2. 启动所有服务
chmod +x scripts/start-all-services.sh
./scripts/start-all-services.sh

# 3. 访问应用
# 前端: http://localhost:3000
# IAM API: http://localhost:8002
```

### 手动启动

查看 [项目指南](./docs/PROJECT_GUIDE.md) 了解详细步骤。

## 📁 项目结构

```
topems/
├── docs/                          # 文档
├── scripts/                       # 脚本工具
├── frontend/                      # 前端应用
│   ├── src/
│   │   ├── components/           # 可复用组件
│   │   ├── pages/               # 页面组件
│   │   ├── hooks/               # 自定义 hooks
│   │   ├── api/                 # API 客户端
│   │   └── store/               # Zustand 状态管理
│   └── vite.config.ts           # Vite 配置
├── services/                      # 后端微服务
│   ├── topems-iam/              # IAM 身份认证服务 (8002)
│   ├── topems-doc/              # DOC 文档管理服务 (8001)
│   ├── topems-ai/               # AI 服务 (8003)
│   ├── topems-flow/             # FLOW 工作流服务 (8004)
│   ├── topems-rs/               # RS 研发管理服务 (8005)
│   ├── topems-lims/             # LIMS 实验室管理 (8006)
│   ├── topems-hrm/              # HRM 人力资源 (8010)
│   ├── topems-qms/              # QMS 质量管理 (8007)
│   ├── topems-ehs/              # EHS 安全环保 (8008)
│   ├── topems-bi/               # BI 商业智能 (8022)
│   ├── topems-portal/           # PORTAL 统一门户 (9021)
│   ├── topems-erp/              # ERP 企业资源 (8009)
│   ├── topems-scm/              # SCM 供应链 (8016)
│   ├── topems-srm/              # SRM 供应商 (8018)
│   ├── topems-mail/             # MAIL 邮件服务 (8026)
│   ├── topems-notification/     # NOTIFICATION 通知服务 (8023)
│   ├── topems-mes/              # MES 制造执行 (8014)
│   ├── topems-crm/              # CRM 客户关系 (8013)
│   └── topems-wms/              # WMS 仓库管理 (8020)
├── docker-compose.yml             # Docker 配置
└── README.md                      # 本文档
```

## 📖 文档

- [项目指南](./docs/PROJECT_GUIDE.md) - 详细的开发和部署指南
- [服务状态报告](./docs/SERVICE_STATUS_REPORT.md) - 最新服务状态
- [优化报告](./docs/OPTIMIZATION_REPORT.md) - 性能优化报告
- [代码审查](./docs/CODE_REVIEW_REPORT.md) - 代码质量报告

## 🛠️ 开发

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3001

### 后端开发

```bash
# 启动单个服务（示例 IAM）
cd services/topems-iam/backend
cargo run
```

服务运行在 http://localhost:8002

### 启动所有服务

```bash
# 使用启动脚本
cd /Users/xingzhai/TOPEMS
chmod +x scripts/start-all-services.sh
./scripts/start-all-services.sh

# 检查服务状态
chmod +x scripts/check-services-status.sh
./scripts/check-services-status.sh
```

## 📦 部署

### 前端部署

```bash
cd frontend
npm run build

# 使用 Nginx 部署
# 详见 docs/PROJECT_GUIDE.md
```

### 后端部署

```bash
# 编译所有服务
cd services/topems-iam/backend
cargo build --release

# 使用部署脚本
chmod +x ../../scripts/deploy-backend.sh
../../scripts/deploy-backend.sh
```

## 🧪 测试

```bash
# 前端测试
cd frontend
npm run test

# 后端测试
cd services/topems-iam/backend
cargo test
```

## 📊 性能指标

| 指标 | 当前值 | 状态 |
|------|--------|------|
| 首屏加载时间 | 1.5s | ✅ |
| 包体积 | 600KB (gzip) | ✅ |
| API 响应时间 | 50ms | ✅ |
| 数据库查询 | 20ms | ✅ |
| 服务数量 | 17个 | ✅ |

详细信息请查看 [优化报告](./docs/OPTIMIZATION_REPORT.md)。

## 🔄 CI/CD

使用 GitHub Actions 自动化构建和部署，详见 [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)。

## 🤝 贡献

欢迎贡献！请查看 [项目指南](./docs/PROJECT_GUIDE.md#贡献指南)。

### 提交规范

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变动

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。

## 👥 团队

- Product Manager
- Engineering Lead
- Frontend Engineers
- Backend Engineers
- DevOps Engineers

## 📞 联系我们

- Issues: [GitHub Issues](https://github.com/your-org/topems/issues)
- Discussions: [GitHub Discussions](https://github.com/your-org/topems/discussions)
- Mail: team@topems.example.com

---

**最后更新**: 2026-06-02
**版本**: v2.0.0
