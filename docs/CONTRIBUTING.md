# 贡献指南

> 欢迎参与 TOPEMS 项目的开发和改进！

## 行为准则

### 我们的承诺

为了营造一个开放、友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同情

### 不可接受的行为

- 使用性别化语言或图像
- 人身攻击或政治攻击
- 公开或私下骚扰
- 未经许可发布他人私人信息
- 其他不专业或不恰当的行为

---

## 如何贡献

### 报告 Bug

发现 Bug？请提交 [Issue](https://github.com/your-org/topems/issues) 并包含：

1. **清晰的标题** - 简要描述问题
2. **复现步骤** - 详细的复现过程
3. **预期行为** - 你期望发生什么
4. **实际行为** - 实际发生了什么
5. **环境信息** - 操作系统、版本等
6. **截图或日志** - 帮助理解问题

### 提出新功能

有新功能想法？提交 [Feature Request](https://github.com/your-org/topems/issues) 并包含：

1. **问题描述** - 你要解决什么问题
2. **解决方案** - 你建议如何解决
3. **替代方案** - 你考虑过的其他方案
4. **附加信息** - 截图、参考等

### 提交代码

#### 工作流程

```
1. Fork 项目
2. 创建特性分支 (git checkout -b feature/AmazingFeature)
3. 提交更改 (git commit -m 'feat: Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 提交 Pull Request
```

#### 分支命名

- `feature/*` - 新功能
- `fix/*` - Bug 修复
- `docs/*` - 文档更新
- `refactor/*` - 重构
- `test/*` - 测试
- `chore/*` - 构建/工具

#### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式（不影响功能）
- `refactor` - 重构
- `perf` - 性能优化
- `test` - 测试相关
- `chore` - 构建/工具

**示例**：

```bash
feat(hrm): add employee attendance tracking

- Add attendance record entity
- Add check-in/check-out API
- Add attendance report
- Update employee profile with attendance history

Closes #123
```

---

## 开发规范

### 代码风格

#### Rust

```bash
# 格式化代码
cargo fmt

# Lint 检查
cargo clippy

# 提交前检查
cargo fmt --check
cargo clippy -- -D warnings
```

**Rust 编码规范**：

- 遵循 [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- 使用 `cargo fmt` 格式化
- 使用 `cargo clippy` 检查
- 添加单元测试
- 添加文档注释
- 错误处理使用 `Result<T, E>`
- 异步代码使用 `tokio`

#### TypeScript

```bash
# Lint 检查
pnpm lint

# 格式化
pnpm format

# 类型检查
pnpm type-check
```

**TypeScript 编码规范**：

- 使用 ESLint 配置
- 使用 Prettier 格式化
- 严格 TypeScript 配置
- 避免 `any` 类型
- 组件使用函数式组件
- 使用 React Hooks

### 目录结构

#### 后端服务

```
svc/<service-name>/
├── src/
│   ├── main.rs              # 入口
│   ├── lib.rs               # 库代码
│   ├── config.rs            # 配置
│   ├── handlers/            # HTTP 处理器
│   │   ├── mod.rs
│   │   └── <resource>.rs
│   ├── models/              # 数据模型
│   │   ├── mod.rs
│   │   └── <entity>.rs
│   ├── services/            # 业务逻辑
│   │   ├── mod.rs
│   │   └── <service>.rs
│   ├── db/                  # 数据库
│   │   ├── mod.rs
│   │   └── migrations/      # 迁移文件
│   └── errors.rs            # 错误定义
├── tests/                   # 集成测试
├── Cargo.toml
└── README.md
```

#### 前端

```
apps/web/
├── src/
│   ├── main.tsx            # 入口
│   ├── App.tsx             # 根组件
│   ├── components/         # 通用组件
│   │   ├── ui/             # 基础 UI
│   │   └── business/       # 业务组件
│   ├── pages/              # 页面
│   │   └── <module>/       # 模块页面
│   ├── hooks/              # React Hooks
│   ├── stores/             # 状态管理
│   ├── services/           # API 服务
│   ├── types/              # 类型定义
│   ├── utils/              # 工具函数
│   └── router/             # 路由配置
├── public/                 # 静态资源
├── package.json
└── vite.config.ts
```

### 测试规范

#### 单元测试

```rust
// 业务逻辑必须有单元测试
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_employee() {
        // Arrange
        let employee = Employee::new("John", "Doe");
        
        // Act
        let result = service.create(employee);
        
        // Assert
        assert!(result.is_ok());
    }
}
```

#### 集成测试

```rust
// 关键 API 必须有集成测试
#[tokio::test]
async fn test_login_api() {
    let app = create_test_app().await;
    
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/iam/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"username":"admin","password":"admin123"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    
    assert_eq!(response.status(), StatusCode::OK);
}
```

#### 前端测试

```typescript
// 组件测试
describe('EmployeeList', () => {
  it('renders employee list', () => {
    const employees = [{ id: 1, name: 'John' }];
    render(<EmployeeList employees={employees} />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

### 文档规范

#### 代码文档

```rust
/// 创建员工
///
/// # 参数
/// * `name` - 员工姓名
/// * `email` - 员工邮箱
///
/// # 返回
/// * `Result<Employee, EmployeeError>` - 创建的员工或错误
///
/// # 示例
/// ```
/// let employee = service.create_employee("John", "john@example.com").await?;
/// ```
pub async fn create_employee(name: &str, email: &str) -> Result<Employee, EmployeeError> {
    // 实现
}
```

#### API 文档

所有 API 必须更新 [API 文档](../api/README.md)：

```yaml
/api/hrm/employees:
  post:
    summary: 创建员工
    description: 创建新员工
    tags:
      - HRM
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateEmployeeRequest'
    responses:
      '201':
        description: 创建成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Employee'
```

---

## Pull Request 流程

### 提交前检查

- [ ] 代码通过所有测试
- [ ] 代码通过 Lint 检查
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息符合规范
- [ ] 处理了所有冲突

### PR 描述模板

```markdown
## 变更说明

简要描述本次变更的内容。

## 变更类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] 重大变更
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化

## 测试

- [ ] 单元测试
- [ ] 集成测试
- [ ] 手动测试

## 检查清单

- [ ] 代码通过 Lint
- [ ] 代码通过测试
- [ ] 更新了文档
- [ ] 提交信息符合规范

## 相关 Issue

Closes #123
```

### 审查流程

1. 自动化检查（CI/CD）
2. 代码审查（至少 1 人）
3. 测试验证
4. 合并到主分支

---

## 发布流程

### 版本号规范

遵循 [Semantic Versioning](https://semver.org/)：

- **主版本号** - 不兼容的 API 变更
- **次版本号** - 向下兼容的新功能
- **修订号** - 向下兼容的问题修复

### 发布步骤

1. 更新版本号
2. 更新 CHANGELOG
3. 创建 Release 分支
4. 运行完整测试
5. 部署到测试环境
6. 验证功能
7. 合并到主分支
8. 打 Tag
9. 部署到生产环境

---

## 社区

### 联系方式

- **GitHub Issues**: [提交问题](https://github.com/your-org/topems/issues)
- **GitHub Discussions**: [参与讨论](https://github.com/your-org/topems/discussions)
- **邮件列表**: dev@topems.local
- **Slack**: [加入频道](https://topems.slack.com)

### 会议

- **周会**: 每周一 10:00 AM
- **月度回顾**: 每月最后一个周五
- **年度规划**: 每年 12 月

---

## 许可证

TOPEMS 项目采用 [MIT 许可证](../LICENSE) 开源。

---

## 相关文档

- [架构设计](../architecture/overview.md)
- [API 文档](../api/README.md)
- [部署指南](../deployment-guide.md)
- [变更日志](../CHANGELOG.md)
- [TODO 列表](../TODO.md)
