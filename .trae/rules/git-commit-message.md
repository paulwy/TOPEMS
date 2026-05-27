---
alwaysApply: true
scene: git_message
---

# Git 提交信息规范

## 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Type 类型

- **feat**: 新功能
- **fix**: 修复 bug
- **docs**: 文档更新
- **style**: 代码格式调整（不影响代码运行）
- **refactor**: 重构（既不是新增功能，也不是修改 bug）
- **perf**: 性能优化
- **test**: 测试相关
- **chore**: 构建过程或辅助工具的变动
- **revert**: 回滚提交
- **ci**: CI/CD 相关改动

## Scope 范围（可选）

指定本次提交影响的模块或功能范围，例如：
- `api`, `ui`, `auth`, `utils`, `components`, `pages` 等

## Subject 主题

- 以动词开头，使用现在时
- 简洁明了，不超过 50 个字符
- 首字母小写
- 结尾不加句号

## Body 正文（可选）

- 详细说明本次提交的目的和内容
- 每行不超过 72 个字符
- 说明为什么要做这个改动，而不是怎么做

## Footer 页脚（可选）

- 关联 Issue 或 PR
- 破坏性变更说明（BREAKING CHANGE）

## 示例

```
feat(auth): add social login support

Add support for Google and WeChat social login
- Implement OAuth 2.0 flow
- Add user profile sync
- Update UI for social login buttons

Closes #123
```

```
fix(api): handle null response in user endpoint

Add null check for user response to prevent NPE
The error occurred when fetching deleted user profiles

Fixes #456
```
