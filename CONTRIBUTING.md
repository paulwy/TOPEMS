# 贡献指南

## 开发规范

### 代码规范

- Rust 代码遵循 `cargo fmt` 格式化
- TypeScript 代码遵循 ESLint 规则
- 所有提交信息使用中文

### 分支管理

- `main` - 生产环境代码
- `develop` - 开发环境代码
- `feature/*` - 功能分支
- `fix/*` - 修复分支

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 代码审查

- 所有 PR 需要至少 1 人 review
- 遵循代码风格指南
- 通过所有 CI 检查

## 文档

- 保持 README.md 更新
- API 变更需要更新 API 文档
- 重大变更需要更新架构文档
