# TOPEMS 开发指南

本目录是 TOPEMS 开发者的工作入口，涵盖项目结构、开发命令、Git 规范、代码审查清单与质量门禁。
更深入的主题文档见下方目录导航。

## 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 后端语言 | Rust 1.75+ | 高性能系统编程语言 |
| 后端框架 | Axum 0.7+ | 异步 Web 框架 |
| 前端框架 | React 18 + TypeScript 5 | 组件化 UI |
| 构建工具 | Vite 5 + pnpm 8 | 前端构建与包管理 |
| 数据库 | PostgreSQL 14+ | 关系型数据库（含 RLS 行级安全） |
| 缓存 | Redis 7+ | 高性能缓存 |
| 容器化 | Docker 24+ / Docker Compose | 容器化部署 |
| CI/CD | GitHub Actions | 自动化构建部署 |
| 测试 | Playwright + k6 | E2E 与性能测试 |

> 架构已从 32 个独立微服务迁移到**模块化单体**，统一后端入口为 `svc/server/`。

## 项目结构

```
TOPEMS/
├── apps/
│   └── web/              # 前端应用（React + TypeScript + Vite）
│       ├── src/
│       │   ├── components/    # 公共组件（common / templates / layout）
│       │   ├── pages/         # 页面（按业务模块组织：erp/ crm/ hrm/ mes/ wms/ qms/ ...）
│       │   ├── api/           # API 客户端
│       │   ├── hooks/         # React Hooks
│       │   ├── stores/        # 状态管理（Zustand）
│       │   ├── utils/         # 工具函数
│       │   └── types/         # TypeScript 类型
│       └── package.json
├── svc/                  # 后端服务（Rust 工作空间）
│   ├── server/           # **统一入口（模块化单体）**
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── config/
│   │   │   └── modules/       # 模块适配器（27 个模块）
│   │   └── Cargo.toml         # Feature Flags（可选模块启用）
│   ├── unified-core/     # 核心服务（IAM, Doc, Flow, File, Monitor 等）
│   ├── erp/  crm/  hrm/  mes/  wms/  qms/  ...   # 各业务领域 crate
├── packages/              # 共享包（shared 类型、ui 组件）
├── config/                # 配置文件（ports.env、env/ 模板）
├── scripts/              # 运维与构建脚本（含 topems.sh 统一 CLI）
├── docs/                  # 项目文档（本目录所在）
├── database/migrations/    # 数据库迁移（sqlx）
└── Cargo.toml / pnpm-workspace.yaml / docker-compose.yml
```

## 常用开发命令

### 后端（Rust）

```bash
# 构建后端（统一入口）
cd svc/server && cargo build

# 运行开发服务器
cargo run

# 代码格式化
cargo fmt

# Lint 检查（零 warning 门槛）
cargo clippy --all-targets --all-features -- -D warnings

# 运行测试
cargo test

# 依赖安全审计
cargo audit
```

### 前端（TypeScript / React）

```bash
# 安装依赖
pnpm install

# 开发服务器
cd apps/web && pnpm dev

# 类型检查
pnpm typecheck

# Lint
pnpm lint

# 构建
pnpm build
```

### 统一脚本 CLI

```bash
# 启动全部服务
./scripts/topems.sh start

# 数据库迁移
./scripts/topems.sh db migrate

# 查看服务状态
./scripts/topems.sh status
```

### 数据库

```bash
# 运行迁移（主迁移链 database/migrations）
./scripts/topems.sh db migrate
# 或直接使用 sqlx
sqlx migrate run --source database/migrations

# 连接 PostgreSQL
psql "$DATABASE_URL"
```

## Git 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` / `ci` | 构建 / CI 相关 |
| `chore` | 其他杂项 |

详细分支流程与 PR 规范见 [git-workflow.md](./git-workflow.md)。

## 代码审查清单

提交 PR 前请逐项自查：

**功能性**
- [ ] 代码正确实现需求，边界条件（空值/极值）已处理
- [ ] 错误处理完善，异常场景（网络失败/超时/并发）已考虑
- [ ] 无遗漏功能点，与现有功能无冲突

**代码质量**
- [ ] 遵循项目命名规范，函数职责单一（≤ 50 行）
- [ ] 无重复代码、无魔法数字/字符串
- [ ] 公共 API 有文档注释

**性能**
- [ ] 无 N+1 查询，数据库查询已优化并加索引
- [ ] 缓存使用合理，大数据量已分页

**安全性**
- [ ] 使用参数化查询（防 SQL 注入），用户输入已验证转义
- [ ] 无硬编码密钥/密码，敏感数据已加密
- [ ] 权限控制正确，无越权风险

**测试与文档**
- [ ] 新增功能有对应测试，Bug 修复有回归测试
- [ ] 相关文档（README、CHANGELOG）已更新

## 质量门禁指标

PR 合并必须满足以下门禁：

| 指标 | 门槛 |
|------|------|
| 测试覆盖率 | ≥ 80%（核心模块 ≥ 90%） |
| 代码重复率 | ≤ 5% |
| 圈复杂度 | 函数 ≤ 10，类 ≤ 20 |
| 高危安全漏洞 | 0 个 |
| Bug 密度 | ≤ 2 个/千行 |
| 代码审查 | 至少 1 名审查者 Approve |
| CI 检查 | 全部通过 |

---

## 目录导航

### backend/ — 后端开发文档

| 文档 | 说明 |
|------|------|
| [environment-setup.md](./backend/environment-setup.md) | 后端开发环境搭建 |
| [backend-services.md](./backend/backend-services.md) | 服务架构与模块组织 |
| [api-design.md](./backend/api-design.md) | API 设计规范 |
| [code-standards.md](./backend/code-standards.md) | Rust 代码规范 |
| [database-development.md](./backend/database-development.md) | 数据库开发与迁移 |
| [debugging.md](./backend/debugging.md) | 后端调试技巧 |
| [template-guidelines.md](./backend/template-guidelines.md) | 代码模板指南 |
| [backend-i18n-guide.md](./backend/backend-i18n-guide.md) | 后端国际化指南 |
| [mes-compile-mechanism.md](./backend/mes-compile-mechanism.md) | MES 编译机制 |
| [event-driven-cache-invalidation.md](./backend/event-driven-cache-invalidation.md) | 事件驱动缓存失效 |
| [mcp-external-agent-integration.md](./backend/mcp-external-agent-integration.md) | MCP 外部 Agent 集成 |

### frontend/ — 前端开发文档

| 文档 | 说明 |
|------|------|
| [design-system.md](./frontend/design-system.md) | 设计系统 |
| [module-federation-architecture.md](./frontend/module-federation-architecture.md) | 模块联邦架构 |
| [module-federation-workflow.md](./frontend/module-federation-workflow.md) | 模块联邦工作流 |
| [component-migration-guide.md](./frontend/component-migration-guide.md) | 组件迁移指南 |
| [plugin-lifecycle-guide.md](./frontend/plugin-lifecycle-guide.md) | 插件生命周期 |
| [accessibility.md](./frontend/accessibility.md) | 无障碍规范 |

### standards/ — 跨端技术标准

| 文档 | 说明 |
|------|------|
| [architecture-standards.md](./standards/architecture-standards.md) | 架构标准 |
| [api-path-standardization.md](./standards/api-path-standardization.md) | API 路径标准化 |
| [websocket-path-mapping.md](./standards/websocket-path-mapping.md) | WebSocket 路径映射 |
| [migration-naming-convention.md](./standards/migration-naming-convention.md) | 数据库迁移命名约定 |
| [date-type-convention.md](./standards/date-type-convention.md) | 日期类型约定 |
| [cache-key-naming-standard.md](./standards/cache-key-naming-standard.md) | 缓存键命名标准 |
| [mcp-tools-resources-standard.md](./standards/mcp-tools-resources-standard.md) | MCP 工具与资源标准 |

### 根级专题文档

| 文档 | 说明 |
|------|------|
| [git-workflow.md](./git-workflow.md) | Git 分支模型与工作流详解 |
| [lefthook-guide.md](./lefthook-guide.md) | Lefthook Git Hooks 使用指南 |
| [event-design-guide.md](./event-design-guide.md) | 事件驱动设计指南 |
| [monolith.md](./monolith.md) | 模块化单体架构说明 |

---

*本文档由 TOPEMS 团队维护，最后更新：2026-09-26*
