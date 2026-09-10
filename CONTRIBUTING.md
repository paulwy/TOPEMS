# TOPEMS 贡献指南

感谢您对 TOPEMS 项目的关注和贡献！本文档描述了如何参与 TOPEMS 项目的开发，包括代码规范、提交规范、分支管理、PR 流程等内容。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境搭建](#开发环境搭建)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [分支管理](#分支管理)
- [Pull Request 流程](#pull-request-流程)
- [代码审查](#代码审查)
- [测试要求](#测试要求)
- [文档要求](#文档要求)
- [问题反馈](#问题反馈)
- [功能建议](#功能建议)
- [社区沟通](#社区沟通)

## 行为准则

参与本项目即表示您同意遵守以下行为准则：

- **尊重他人**：尊重所有贡献者和用户，不论其背景、经验水平或观点
- **友善沟通**：使用友善、专业的语言进行沟通，避免人身攻击和歧视性言论
- **包容合作**：欢迎不同背景和经验的贡献者，营造包容的社区氛围
- **建设性反馈**：提供建设性的反馈，帮助他人改进
- **承担责任**：对自己的言行负责，承认错误并从中学习

## 如何贡献

您可以通过以下方式贡献 TOPEMS 项目：

### 1. 报告 Bug

如果您发现了 Bug，请：

1. 先搜索 [Issue 列表](../../issues)，确认是否已有相同问题
2. 如果没有，请创建新的 Issue，使用 Bug 报告模板
3. 提供详细的复现步骤、预期行为和实际行为
4. 附上相关的日志、截图或代码片段

### 2. 提交功能建议

如果您有新功能或改进建议，请：

1. 先搜索 [Issue 列表](../../issues)，确认是否已有相同建议
2. 如果没有，请创建新的 Issue，使用功能建议模板
3. 详细描述功能需求、使用场景和预期效果
4. 如有可能，提供实现思路或原型代码

### 3. 贡献代码

如果您想贡献代码，请：

1. 选择一个未分配的 Issue，或创建新的 Issue 并说明您想实现的功能
2. 在 Issue 中评论表明您想接手该任务
3. 按照 [开发环境搭建](#开发环境搭建) 配置开发环境
4. 按照 [分支管理](#分支管理) 创建功能分支
5. 按照 [代码规范](#代码规范) 编写代码
6. 按照 [测试要求](#测试要求) 编写测试
7. 按照 [提交规范](#提交规范) 提交代码
8. 按照 [Pull Request 流程](#pull-request-流程) 提交 PR

### 4. 改进文档

文档也是项目的重要组成部分，您可以：

- 修正文档中的错误或不准确的描述
- 补充缺失的文档内容
- 改进文档的结构和可读性
- 翻译文档到其他语言
- 添加示例代码和使用教程

### 5. 帮助社区

- 回答 Issue 和讨论中的问题
- 审查其他贡献者的 PR
- 分享使用经验和最佳实践
- 帮助新贡献者上手

## 开发环境搭建

### 前置要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Rust | 1.75+ | 后端开发语言 |
| Node.js | 18+ | 前端开发运行时 |
| npm / pnpm | 最新版 | 前端包管理器 |
| MySQL | 8.0+ | 数据库（可选，开发可用 SQLite） |
| PostgreSQL | 14+ | 数据库（可选） |
| Redis | 7.0+ | 缓存（可选） |
| Docker | 24.0+ | 容器化部署（可选） |
| Git | 2.30+ | 版本控制 |

### 克隆项目

```bash
git clone https://github.com/your-org/TOPEMS.git
cd TOPEMS
```

### 后端环境

```bash
# 进入后端目录
cd backend

# 安装依赖（首次运行会自动下载）
cargo build

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件，配置数据库连接等

# 运行数据库迁移
cargo run -- migrate

# 启动开发服务器
cargo run -- serve
```

### 前端环境

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install
# 或使用 pnpm
pnpm install

# 启动开发服务器
npm run dev
```

### 使用 Docker（推荐）

```bash
# 启动所有依赖服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 运行测试

```bash
# 后端测试
cd backend
cargo test

# 前端测试
cd frontend
npm run test

# 端到端测试
cd e2e
npm run test
```

## 代码规范

### Rust 代码规范

后端代码遵循 Rust 官方规范和以下约定：

#### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类型/结构体/枚举 | UpperCamelCase | `UserService`, `ApiError` |
| 函数/方法 | snake_case | `get_user_by_id`, `create_order` |
| 变量/参数 | snake_case | `user_id`, `order_count` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| 模块/文件 | snake_case | `user_service.rs`, `auth_middleware` |
| Trait | UpperCamelCase，通常以 -able 结尾 | `Cacheable`, `Serializable` |

#### 代码格式

- 使用 `rustfmt` 格式化代码，运行 `cargo fmt`
- 使用 `clippy` 检查代码，运行 `RUSTC_WRAPPER="" cargo clippy --workspace`（注意：需临时禁用 sccache，因为 sccache 与 clippy-driver 存在兼容性问题；单 crate 检查可用 `RUSTC_WRAPPER="" cargo clippy -p <crate-name>`）
- 缩进使用 4 个空格
- 行宽不超过 100 个字符
- 文件末尾保留一个空行

#### 错误处理

- 使用 `thiserror` 定义自定义错误类型
- 使用 `anyhow` 处理应用层错误
- 函数返回 `Result<T, E>` 类型
- 不要使用 `unwrap()` 和 `expect()`，除非确定不会出错
- 错误信息要清晰、有意义

#### 注释规范

- 公共项必须有文档注释（`///`）
- 复杂逻辑要有行内注释（`//`）
- 注释要说明"为什么"，而不是"做什么"
- 使用中文注释

```rust
/// 用户服务，处理用户相关的业务逻辑
pub struct UserService {
    repo: UserRepository,
}

impl UserService {
    /// 根据用户 ID 获取用户信息
    ///
    /// # 参数
    /// - `user_id`: 用户 ID
    ///
    /// # 返回
    /// 返回用户信息，如果用户不存在返回 None
    pub async fn get_user_by_id(&self, user_id: &str) -> Result<Option<User>, ApiError> {
        // 先从缓存获取，减少数据库查询
        if let Some(user) = self.cache.get(user_id).await? {
            return Ok(Some(user));
        }
        
        self.repo.find_by_id(user_id).await
    }
}
```

### TypeScript/React 代码规范

前端代码遵循以下约定：

#### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | UpperCamelCase | `UserList`, `LoginForm` |
| 函数/方法 | camelCase | `getUserById`, `handleSubmit` |
| 变量/参数 | camelCase | `userId`, `orderCount` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 类型/接口 | UpperCamelCase，接口以 I 开头 | `IUser`, `ApiResponse` |
| Hook | 以 use 开头 | `useAuth`, `useUser` |
| 文件/组件 | UpperCamelCase（组件）或 kebab-case（工具） | `UserList.tsx`, `api-utils.ts` |

#### 代码格式

- 使用 `Prettier` 格式化代码
- 使用 `ESLint` 检查代码
- 缩进使用 2 个空格
- 行宽不超过 100 个字符
- 使用单引号，不使用双引号
- 语句末尾不使用分号

#### 类型规范

- 优先使用 TypeScript 类型，避免使用 `any`
- 接口定义要清晰、完整
- 使用泛型提高代码复用性

```typescript
// 用户信息接口
interface IUser {
  id: string
  username: string
  email: string
  role: UserRole
  createdAt: Date
}

// 用户角色枚举
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

// API 响应类型
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// 获取用户信息
async function getUserById(userId: string): Promise<ApiResponse<IUser>> {
  const response = await fetch(`/api/users/${userId}`)
  return response.json()
}
```

#### React 规范

- 使用函数组件和 Hooks，不使用类组件
- 组件文件使用 `.tsx` 扩展名
- 一个文件只导出一个组件
- 使用 `React.memo` 优化性能
- 使用 `useCallback` 和 `useMemo` 避免不必要的重渲染

```tsx
import React, { useState, useCallback } from 'react'
import { IUser } from '../types'

interface UserListProps {
  users: IUser[]
  onDelete: (userId: string) => void
}

const UserList: React.FC<UserListProps> = ({ users, onDelete }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleDelete = useCallback(
    (userId: string) => {
      if (window.confirm('确定要删除该用户吗？')) {
        onDelete(userId)
      }
    },
    [onDelete]
  )

  return (
    <div className="user-list">
      {users.map((user) => (
        <div
          key={user.id}
          className={`user-item ${selectedId === user.id ? 'selected' : ''}`}
          onClick={() => setSelectedId(user.id)}
        >
          <span>{user.username}</span>
          <button onClick={() => handleDelete(user.id)}>删除</button>
        </div>
      ))}
    </div>
  )
}

export default React.memo(UserList)
```

## 提交规范

### Commit Message 格式

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，Commit Message 格式如下：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 代码重构（不新增功能，不修复 Bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统或外部依赖变更 |
| `ci` | CI/CD 配置变更 |
| `chore` | 其他杂项 |
| `revert` | 回滚提交 |

### Scope 范围

Scope 表示变更影响的范围，可选值包括：

- `backend` - 后端
- `frontend` - 前端
- `api` - API 接口
- `db` - 数据库
- `auth` - 认证授权
- `ai` - AI 相关
- `docs` - 文档
- `test` - 测试
- `ci` - CI/CD
- `deps` - 依赖更新

### Subject 主题

- 简短描述变更内容，不超过 50 个字符
- 使用祈使句，如"添加"、"修复"、"更新"
- 末尾不加句号

### Body 正文（可选）

- 详细描述变更内容，每行不超过 72 个字符
- 说明变更的原因和目的
- 如有必要，说明实现思路

### Footer 页脚（可选）

- 关联 Issue：`Closes #123` 或 `Fixes #456`
- 破坏性变更：`BREAKING CHANGE: 描述`

### 提交示例

```
feat(auth): 添加用户注册功能

实现用户注册接口，支持用户名、邮箱和密码注册。
注册时进行密码强度校验，并发送验证邮件。

Closes #123
```

```
fix(api): 修复用户列表查询分页错误

修复分页参数计算错误，当 page=1 时 offset 应为 0。
添加分页参数的边界检查。

Fixes #456
```

```
docs(readme): 更新安装说明

补充 Docker 安装方式，更新依赖版本要求。
```

## 分支管理

### 分支命名规范

| 分支类型 | 命名规范 | 说明 |
|---------|---------|------|
| 主分支 | `main` | 生产环境代码，始终保持稳定 |
| 开发分支 | `develop` | 开发环境代码，集成最新功能 |
| 功能分支 | `feat/<功能描述>` | 新功能开发 |
| 修复分支 | `fix/<问题描述>` | Bug 修复 |
| 文档分支 | `docs/<文档描述>` | 文档更新 |
| 重构分支 | `refactor/<描述>` | 代码重构 |
| 性能分支 | `perf/<描述>` | 性能优化 |
| 发布分支 | `release/<版本号>` | 版本发布准备 |
| 热修复分支 | `hotfix/<描述>` | 生产环境紧急修复 |

### 分支命名示例

```
feat/user-registration
fix/login-error
docs/api-documentation
refactor/user-service
perf/query-optimization
release/v1.0.0
hotfix/critical-bug
```

### 工作流程

1. 从 `develop` 分支创建功能分支
2. 在功能分支上开发和提交
3. 开发完成后，推送分支到远程
4. 创建 Pull Request，合并到 `develop`
5. 代码审查通过后，合并到 `develop`
6. 版本发布时，从 `develop` 创建 `release` 分支
7. 发布完成后，合并 `release` 到 `main` 和 `develop`
8. 生产环境紧急修复，从 `main` 创建 `hotfix` 分支
9. 修复完成后，合并 `hotfix` 到 `main` 和 `develop`

### 同步上游代码

```bash
# 添加上游仓库
git remote add upstream https://github.com/your-org/TOPEMS.git

# 获取上游更新
git fetch upstream

# 合并上游更新到当前分支
git merge upstream/develop

# 或使用 rebase
git rebase upstream/develop
```

## Pull Request 流程

### 创建 PR 前的检查

- [ ] 代码已通过本地测试
- [ ] 代码已通过 lint 检查
- [ ] 代码已格式化
- [ ] 已添加必要的测试
- [ ] 已更新相关文档
- [ ] Commit Message 符合规范
- [ ] 分支已与最新的 `develop` 同步

### 创建 PR

1. 推送分支到远程仓库
2. 在 GitHub 上创建 Pull Request
3. 选择目标分支为 `develop`
4. 填写 PR 标题和描述
5. 关联相关的 Issue
6. 添加合适的标签（Label）
7. 请求代码审查（Reviewer）

### PR 标题格式

PR 标题遵循 Commit Message 格式：

```
<type>(<scope>): <subject>
```

示例：
- `feat(auth): 添加用户注册功能`
- `fix(api): 修复用户列表查询分页错误`
- `docs(readme): 更新安装说明`

### PR 描述模板

```markdown
## 变更说明

简要描述本次 PR 的变更内容。

## 变更类型

- [ ] 新功能（feat）
- [ ] Bug 修复（fix）
- [ ] 文档更新（docs）
- [ ] 代码重构（refactor）
- [ ] 性能优化（perf）
- [ ] 测试相关（test）
- [ ] 其他（chore）

## 关联 Issue

Closes #123

## 测试情况

- [ ] 单元测试已通过
- [ ] 集成测试已通过
- [ ] 端到端测试已通过
- [ ] 已添加新的测试用例

## 截图/录屏

（如有 UI 变更，请附上截图或录屏）

## 其他说明

（其他需要说明的内容）
```

### PR 审查流程

1. PR 创建后，自动触发 CI 检查
2. 至少需要 1 位审查者批准
3. 审查者提出修改意见
4. 贡献者根据意见修改代码
5. 修改完成后，重新请求审查
6. 审查通过后，合并到 `develop`
7. 删除已合并的功能分支

## 代码审查

### 审查清单

审查者应检查以下内容：

#### 功能正确性

- [ ] 代码实现了预期的功能
- [ ] 边界条件已处理
- [ ] 错误处理完善
- [ ] 没有明显的逻辑错误

#### 代码质量

- [ ] 代码符合项目规范
- [ ] 命名清晰、有意义
- [ ] 函数/类职责单一
- [ ] 没有重复代码
- [ ] 注释充分且准确

#### 性能

- [ ] 没有明显的性能问题
- [ ] 数据库查询已优化
- [ ] 没有 N+1 查询问题
- [ ] 缓存使用合理

#### 安全性

- [ ] 没有 SQL 注入风险
- [ ] 没有 XSS 风险
- [ ] 输入验证完善
- [ ] 敏感数据已加密
- [ ] 权限控制正确

#### 测试

- [ ] 测试覆盖了主要功能
- [ ] 测试用例命名清晰
- [ ] 测试可以独立运行
- [ ] 没有 flaky test

#### 文档

- [ ] 公共 API 有文档注释
- [ ] 复杂逻辑有说明
- [ ] README 或相关文档已更新
- [ ] 变更日志已更新

### 审查意见格式

审查意见应清晰、具体、有建设性：

```
**问题**：用户密码没有进行强度校验。

**建议**：添加密码强度校验，要求至少 8 个字符，包含大小写字母和数字。

**位置**：backend/src/auth/service.rs:45
```

### 审查级别

- **Request changes**：必须修改才能合并
- **Comment**：建议修改，可以讨论
- **Approve**：同意合并

## 测试要求

### 测试金字塔

```
        /\
       /  \
      / E2E \      端到端测试（少量）
     /--------\
    / Integration\   集成测试（适量）
   /--------------\
  /   Unit Tests   \  单元测试（大量）
  ------------------
```

### 单元测试

- 覆盖核心业务逻辑
- 每个函数至少有一个测试用例
- 测试正常情况和异常情况
- 测试边界条件
- 测试应独立、可重复
- 使用 `cargo test` 运行后端测试
- 使用 `npm run test` 运行前端测试

### 集成测试

- 测试模块间的交互
- 测试 API 接口
- 测试数据库操作
- 测试第三方服务集成
- 使用测试数据库，不使用生产数据库

### 端到端测试

- 测试核心用户流程
- 测试关键业务场景
- 使用 Playwright 进行 E2E 测试
- 测试应稳定，避免 flaky test

### 测试覆盖率

- 后端代码覆盖率不低于 80%
- 前端代码覆盖率不低于 70%
- 核心业务逻辑覆盖率不低于 90%
- 运行 `cargo tarpaulin` 检查后端覆盖率
- 运行 `npm run test:coverage` 检查前端覆盖率

### 测试命名规范

- 测试函数名应描述测试场景
- 使用 `test_` 前缀（Rust）或 `it should`（TypeScript）
- 示例：`test_get_user_by_id_not_found`、`it should return 404 when user not found`

## 文档要求

### 代码文档

- 公共函数、结构体、接口必须有文档注释
- 文档注释应包含功能说明、参数说明、返回值说明
- 复杂算法应有实现思路说明
- 使用 Rust 的 `///` 文档注释
- 使用 TypeScript 的 JSDoc 注释

### API 文档

- 所有 API 接口必须有文档
- 文档包含：接口路径、请求方法、请求参数、响应格式、错误码
- 使用 OpenAPI/Swagger 规范
- 保持文档与代码同步更新

### 用户文档

- 提供用户操作手册
- 提供常见问题解答（FAQ）
- 提供使用教程和示例
- 文档语言简洁、易懂

### 开发者文档

- 提供开发环境搭建指南
- 提供架构设计文档
- 提供 API 参考手册
- 提供开发指南和最佳实践
- 提供贡献指南（本文档）

### 文档更新

- 代码变更时，同步更新相关文档
- PR 中应包含文档更新
- 定期审查和更新文档
- 修复文档中的错误和过时内容

## 问题反馈

### 报告 Bug

如果您发现了 Bug，请按照以下步骤报告：

1. **搜索已有 Issue**：先搜索 Issue 列表，确认是否已有相同问题
2. **使用 Bug 模板**：创建新 Issue 时，选择 Bug 报告模板
3. **提供详细信息**：
   - 问题描述：简要描述遇到的问题
   - 复现步骤：详细的复现步骤
   - 预期行为：您期望的行为是什么
   - 实际行为：实际发生了什么
   - 环境信息：操作系统、浏览器、版本号等
   - 日志/截图：相关的错误日志或截图
4. **添加标签**：添加 `bug` 标签和相关的模块标签

### 功能建议

如果您有新功能或改进建议，请：

1. **搜索已有 Issue**：先搜索 Issue 列表，确认是否已有相同建议
2. **使用功能建议模板**：创建新 Issue 时，选择功能建议模板
3. **提供详细信息**：
   - 功能描述：简要描述您想要的功能
   - 使用场景：这个功能解决什么问题，在什么场景下使用
   - 预期效果：您期望这个功能如何工作
   - 实现思路（可选）：如果您有实现思路，可以提供
   - 参考资料（可选）：相关的链接、截图或示例
4. **添加标签**：添加 `enhancement` 标签和相关的模块标签

### 提问

如果您有问题需要解答，请：

1. **搜索文档和 FAQ**：先查看文档和常见问题，可能已有答案
2. **搜索已有 Issue**：搜索 Issue 列表，可能已有类似问题
3. **创建新 Issue**：如果没有找到答案，创建新 Issue
4. **使用提问模板**：选择 Question 模板
5. **提供详细信息**：
   - 问题描述：您遇到的问题
   - 已尝试的方法：您已经尝试了哪些解决方案
   - 环境信息：相关的环境信息
   - 相关代码/日志：相关的代码片段或日志

## 社区沟通

### 讨论区

使用 GitHub Discussions 进行社区讨论：

- **一般讨论**：项目相关的一般话题
- **想法分享**：分享您的想法和建议
- **问题求助**：寻求社区帮助
- **展示分享**：分享您使用 TOPEMS 做的项目

### 沟通规范

- 使用友善、专业的语言
- 尊重他人的观点和经验
- 提供有建设性的反馈
- 避免重复提问，先搜索已有内容
- 分享知识，帮助他人

### 联系方式

- **GitHub Issues**：[../../issues](../../issues) - Bug 报告和功能建议
- **GitHub Discussions**：[../../discussions](../../discussions) - 社区讨论
- **邮件**：[topems@example.com](mailto:topems@example.com) - 官方联系

## 致谢

感谢所有为 TOPEMS 项目做出贡献的人！

无论是提交代码、报告 Bug、改进文档，还是帮助社区，您的贡献都非常宝贵。

让我们一起打造更好的 TOPEMS！

---

*本文档最后更新：2026-08-28*
