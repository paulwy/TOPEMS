## 变更描述

<!-- 简单说下改了什么，为什么改 -->

## 类型

- [ ] feat 新功能
- [ ] fix 修 bug
- [ ] docs 文档更新
- [ ] refactor 重构
- [ ] perf 性能优化
- [ ] test 测试
- [ ] chore 构建/工具

## 影响范围

<!-- 本次变更影响的模块或文件 -->

- [ ] 后端 (svc/**)
- [ ] 前端 (apps/web/**)
- [ ] 公共库 (lib/**, packages/**)
- [ ] 数据库 (database/**, migrations/**)
- [ ] CI/CD 配置 (.github/workflows/**)
- [ ] 部署配置 (deploy/**, k8s/**)

## 文档检查

- [ ] **API 变了吗？** → 相关 API 文档已更新
- [ ] **有新功能吗？** → 用户指南/模块文档已补充
- [ ] **改了架构/设计？** → 架构文档已更新
- [ ] **改了部署相关？** → 部署文档已更新
- [ ] **不需要更新文档** → （说明原因：比如改了内部实现，不影响外部）

## 测试

- [ ] 本地测试通过
- [ ] 有相关单测/集成测
- [ ] 测试覆盖率达标（≥60%）

## 代码审查检查项

- [ ] 无 `console.log` 或 debugger 语句遗留
- [ ] 无硬编码的 API URL 或密钥（使用环境变量）
- [ ] 新组件使用 MUI theme tokens（无硬编码颜色）
- [ ] 新页面使用 PageContainerV2 和 ListPageTemplate/FormPageTemplate
- [ ] API 路由遵循 `/api/{service}/v1/*` 格式
- [ ] 业务表包含 `tenant_id` 字段
- [ ] 未引入循环依赖
- [ ] Bundle 大小未显著增加

## 关联 Issue

<!-- 如果有相关的 Issue，请在此引用 -->

Closes #

## 截图/演示

<!-- 如果有 UI 变更，附上截图或演示链接 -->

## 备注

<!-- 其他需要说明的事项 -->