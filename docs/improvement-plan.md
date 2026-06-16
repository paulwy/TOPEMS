# TOPEMS 前端完善计划

> 创建时间: 2026-06-16
> 版本: v1.0.0
> 状态: 进行中

---

## 一、编译问题修复 (P0)

### 1.1 问题概述
- 项目原有 TypeScript 错误: ~2800 个
- 主要分布在 src/pages, src/components, src/api 目录

### 1.2 修复计划

| 阶段 | 任务 | 说明 |
|------|------|------|
| 1.2.1 | 修复 src/pages 错误 | 按模块逐个修复 |
| 1.2.2 | 修复 src/components 错误 | 修复公共组件 |
| 1.2.3 | 修复 src/api 错误 | 修复 API 定义 |
| 1.2.4 | 统一 FilterConfig 类型 | 解决组件间类型不一致 |
| 1.2.5 | 完善 ColumnDef 类型 | 规范表格列定义 |

### 1.3 执行命令
```bash
# 查看错误数量
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "error" | wc -l

# 按文件修复
npx tsc --noEmit 2>&1 | grep "error" | head -50

# 验证修复
npm run typecheck
```

### 1.4 验收标准
- [ ] TypeScript 错误数量 < 100
- [ ] 所有新增代码无错误
- [ ] `npm run typecheck` 通过

---

## 二、测试完善 (P1)

### 2.1 当前状态
- 单元测试: 392 个通过
- 测试文件: 52 个
- 测试框架: Vitest

### 2.2 完善计划

| 任务 | 说明 | 优先级 |
|------|------|--------|
| 恢复详细测试用例 | 恢复页面组件的功能测试 | P1 |
| 添加 E2E 测试 | 使用 Playwright 添加关键流程测试 | P1 |
| 添加覆盖率报告 | 配置测试覆盖率统计 | P2 |
| 添加集成测试 | 测试组件间的交互 | P2 |

### 2.3 执行命令
```bash
# 运行测试
npm run test

# 运行 E2E 测试
npm run e2e

# 生成覆盖率报告
npm run test:coverage
```

### 2.4 E2E 测试用例
```
e2e/tests/
├── auth.spec.ts              # 登录登出
├── navigation.spec.ts        # 导航测试
├── hrm.spec.ts               # HRM 模块
├── crm.spec.ts               # CRM 模块
├── pm.spec.ts                # PM 模块
└── common.spec.ts            # 公共功能
```

### 2.5 验收标准
- [ ] 单元测试覆盖率 > 60%
- [ ] E2E 测试覆盖主要流程
- [ ] 所有测试通过

---

## 三、功能完善 (P1)

### 3.1 模板组件完善

#### ListPageTemplate
- [ ] 增强筛选功能（多选、级联）
- [ ] 增强排序功能（多列排序）
- [ ] 增强分页功能（每页条数选择）
- [ ] 添加行展开功能
- [ ] 添加行拖拽排序
- [ ] 添加列配置（显示/隐藏、拖拽）

#### FormPageTemplate
- [ ] 增强表单验证（实时验证、远程验证）
- [ ] 支持动态字段
- [ ] 支持字段联动
- [ ] 支持文件上传字段
- [ ] 支持分组折叠

#### DetailPageTemplate
- [ ] 增强 Tab 配置
- [ ] 添加侧边栏支持
- [ ] 支持操作日志

#### DashboardTemplate
- [ ] 集成图表组件
- [ ] 支持拖拽布局
- [ ] 支持全屏模式

### 3.2 新增公共组件

| 组件 | 说明 | 优先级 |
|------|------|--------|
| TreeSelect | 树形选择器 | P1 |
| ImageUpload | 图片上传 | P1 |
| FileUpload | 文件上传 | P1 |
| DataExport | 数据导出 | P1 |
| BatchOperations | 批量操作 | P1 |
| QuickSearch | 快速搜索 | P2 |
| StatusTimeline | 状态时间线 | P2 |
| CommentList | 评论列表 | P2 |
| UserSelect | 用户选择器 | P2 |
| DepartmentSelect | 部门选择器 | P2 |

### 3.3 组件目录结构
```
src/components/
├── common/
│   ├── TreeSelect.tsx          # ✅ 已有
│   ├── ProgressBar.tsx          # ✅ 已有
│   ├── Stepper.tsx              # ✅ 已有
│   ├── StatusBadge.tsx          # ✅ 已有
│   ├── AmountDisplay.tsx         # ✅ 已有
│   ├── DateRangePicker.tsx      # ✅ 已有
│   ├── HelpButton.tsx           # ✅ 已有
│   ├── TreeSelect.tsx           # 📝 待完善
│   ├── ImageUpload.tsx          # 📝 待创建
│   ├── FileUpload.tsx           # 📝 待创建
│   ├── DataExport.tsx           # 📝 待创建
│   ├── BatchOperations.tsx      # 📝 待创建
│   ├── QuickSearch.tsx          # 📝 待创建
│   ├── StatusTimeline.tsx       # 📝 待创建
│   ├── CommentList.tsx          # 📝 待创建
│   ├── UserSelect.tsx           # 📝 待创建
│   └── DepartmentSelect.tsx     # 📝 待创建
└── ...
```

---

## 四、页面完善 (P1)

### 4.1 页面重构完成情况

| 模块 | 页面数 | 已完成 | 待完成 |
|------|--------|--------|--------|
| HRM | 15 | 15 | 0 |
| CRM | 8 | 8 | 0 |
| PM | 10 | 10 | 0 |
| Finance | 12 | 12 | 0 |
| Flow | 8 | 8 | 0 |
| BI | 8 | 8 | 0 |
| RS | 13 | 13 | 0 |
| LIMS | 4 | 4 | 0 |
| QMS | 3 | 3 | 0 |
| EHS | 3 | 3 | 0 |
| 运营管理 | 6 | 6 | 0 |
| 系统管理 | 7 | 7 | 0 |
| **总计** | **~100** | **~100** | **0** |

### 4.2 页面完善计划

| 任务 | 说明 | 优先级 |
|------|------|--------|
| 添加空状态组件 | 各列表页空状态优化 | P1 |
| 添加加载状态 | 各页面骨架屏优化 | P1 |
| 完善响应式布局 | 移动端适配 | P1 |
| 完善暗色模式 | 暗色模式细节优化 | P2 |

### 4.3 空状态组件设计
```tsx
// src/components/common/EmptyState.tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

## 五、文档完善 (P2)

### 5.1 文档清单

| 文档 | 状态 | 说明 |
|------|------|------|
| components-guide.md | ✅ 已完成 | 组件使用指南 |
| page-refactoring-guide.md | ✅ 已完成 | 页面重构指南 |
| template-usage-guide.md | 📝 待创建 | 模板使用指南 |
| migration-guide.md | 📝 待创建 | 迁移指南 |

### 5.2 文档目录结构
```
docs/
├── ui-design-spec.md              # ✅ UI 设计规范
├── ui-navigation-design.md        # ✅ 导航设计方案
├── components-guide.md            # ✅ 组件使用指南
├── page-refactoring-guide.md     # ✅ 页面重构指南
├── template-usage-guide.md        # 📝 模板使用指南 (待创建)
├── migration-guide.md              # 📝 迁移指南 (待创建)
└── api-documentation.md           # 📝 API 文档 (待创建)
```

---

## 六、执行时间估算

| 阶段 | 任务数 | 预计时间 | 优先级 |
|------|--------|----------|--------|
| **编译修复** | 20 | 2-3 天 | P0 |
| **测试完善** | 10 | 1-2 天 | P1 |
| **功能完善** | 15 | 3-4 天 | P1 |
| **页面完善** | 10 | 2-3 天 | P1 |
| **文档完善** | 5 | 0.5 天 | P2 |
| **总计** | **60** | **8-12 天** | - |

---

## 七、里程碑

### M1: 编译通过 (Day 1-3)
- [ ] TypeScript 错误 < 100
- [ ] 新增代码无错误
- [ ] CI/CD 流水线通过

### M2: 测试完善 (Day 4-6)
- [ ] 单元测试覆盖率 > 60%
- [ ] E2E 测试覆盖主要流程
- [ ] 测试报告生成

### M3: 功能完善 (Day 7-10)
- [ ] 模板组件功能完善
- [ ] 新增 5+ 公共组件
- [ ] 组件文档完善

### M4: 发布 (Day 11-12)
- [ ] 所有页面重构完成
- [ ] 文档完善
- [ ] 代码审查通过

---

## 八、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 编译错误过多 | 影响开发效率 | 优先修复高频使用组件 |
| 测试覆盖率不足 | 质量风险 | 增加关键路径测试 |
| 进度延期 | 影响交付 | 调整优先级，延后非关键任务 |

---

## 九、参与者

| 角色 | 职责 |
|------|------|
| 前端开发 | 组件开发、页面重构 |
| 测试 | 测试用例编写、自动化测试 |
| UI/UX | 设计规范、交互设计 |
| 产品 | 需求确认、优先级排序 |

---

## 版本历史

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| v1.0.0 | 2026-06-16 | 初始版本 | - |
