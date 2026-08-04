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

```bash
# 运行所有前端测试
./scripts/topems.sh test-frontend

# 运行端到端测试
cd apps/web && pnpm run e2e
```

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
