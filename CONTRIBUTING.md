# 贡献指南

## 开发环境搭建

### 系统要求

- **Rust**: 1.75+（推荐通过 rustup 安装）
- **Node.js**: 20+（推荐通过 nvm 安装）
- **pnpm**: 8+（`npm install -g pnpm`）
- **PostgreSQL**: 16+（macOS: `brew install postgresql@16`）
- **Redis**: 7+（macOS: `brew install redis`）
- **Python**: 3.9+（用于 CLI 工具，macOS 自带 python3）

### 初始化

```bash
# 克隆项目
git clone <repository-url>
cd TOPEMS

# 安装前端依赖
pnpm install

# 安装 Python CLI 依赖
cd cli && pip3 install pyyaml click rich httpx && cd ..

# 配置环境变量
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 等

# 启动数据库
brew services start postgresql@16
brew services start redis
createdb topems

# 首次编译后端
cargo build --workspace

# 一键启动开发环境
./scripts/topems.sh dev
```

## 代码规范

### Rust

- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量
- 遵循 [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- 避免在生产代码中使用 `unwrap()`，使用 `?` 或 `unwrap_or()` 代替
- 数据库查询使用 SQLx 的编译时检查

### TypeScript/React

- 使用 ESLint + Prettier 格式化代码
- 遵循 TypeScript strict 模式
- 使用函数组件和 Hooks
- 使用 `src/utils/logger.ts` 而非 `console.log`

## 分支管理

- `main` - 生产环境代码
- `develop` - 开发环境代码
- `feature/*` - 功能分支
- `fix/*` - 修复分支

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档更新 |
| `style` | 代码格式调整（不影响运行） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建过程或辅助工具变动 |
| `revert` | 回滚提交 |
| `ci` | CI/CD 相关改动 |

### 示例

```
feat(auth): add social login support

Add support for Google and WeChat social login
- Implement OAuth 2.0 flow
- Add user profile sync

Closes #123
```

```
fix(api): handle null response in user endpoint

Add null check for user response to prevent NPE
```

## 测试

### 后端测试

```bash
# 运行所有后端测试
./scripts/topems.sh test-backend

# 运行单个服务测试
cargo test -p topems-erp

# 运行特定测试
cargo test -p topems-erp -- test_name
```

### 前端测试

前端测试分为 **unit**（工具/Hook/API 层）和 **component**（页面/组件层）两个 project，component 层进一步拆分为 8 个分片以并行执行。

```bash
# 运行全部前端测试（unit + 8 分片，串行）
cd apps/web && pnpm test:all

# 仅运行 unit 测试（~626 用例，约 15s）
cd apps/web && pnpm test:unit

# 运行单个分片（每片 ~130-1500 用例）
cd apps/web && pnpm test:shard:1   # shard:1 ~ shard:8

# 运行覆盖率测试
cd apps/web && pnpm test:coverage

# 运行端到端测试
cd apps/web && pnpm run e2e
```

> **ESM 兼容性**：首次安装依赖后需执行 `node scripts/patch-react-transition-group.js` 修补 `react-transition-group` / `dom-helpers` / `@opentelemetry/resources` 的 ESM 导入问题，否则 component 分片会因 `Directory import is not supported` 崩溃。

### CI/CD 流水线

GitHub Actions 配置在 `.github/workflows/` 目录：

| Workflow | 文件 | 触发条件 | 说明 |
|----------|------|---------|------|
| CI | `ci.yml` | push/PR（main/develop）、tag `v*`、每日 02:00 UTC、手动 | Lint + Type Check + 9 路分片测试 + 覆盖率 + 构建 + Rust 测试 |
| E2E | `e2e.yml` | 每日 03:00 UTC、手动 | Playwright 端到端测试 |

**CI 分片策略**：`unit`（1 job）+ `shard-1` ~ `shard-8`（8 个并行 matrix job），共 9 路并行，总 ~2936 用例。

**本地模拟 CI**：

```bash
# 模拟完整 CI 前端测试流程（9 路分片串行）
cd apps/web && pnpm test:all

# 模拟单个 CI 分片
cd apps/web && pnpm test:shard:3

# 模拟 CI 覆盖率检查
cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 pnpm test:coverage
```

**CI 失败排查**：

```bash
# 使用 gh CLI 查看失败日志
gh run list --workflow=ci.yml --limit 5
gh run view <run-id> --log-failed

# 本地复现失败分片
cd apps/web && pnpm test:shard:<N>
```

**覆盖率阈值**：statements 60%、branches 50%、functions 55%、lines 60%。

**Bundle 限制**：单 chunk ≤ 500KB，vendor chunk ≤ 2.5MB。

## 代码审查

- 所有 PR 需要至少 1 人 review
- 遵循代码风格指南
- 通过所有 CI 检查
- 新功能需要包含测试
- API 变更需要更新 API 文档
- 重大变更需要更新架构文档

## 文档维护

- 保持 README.md 更新
- API 变更需要更新 [docs/api/](docs/api/) 下的文档
- 新服务需要更新 [scripts/services.conf](scripts/services.conf) 和 [config/services.yaml](config/services.yaml)
- 端口变更需要同步到: `.env.example`, `scripts/services.conf`, `config/services.yaml`, `config/ports.env`
