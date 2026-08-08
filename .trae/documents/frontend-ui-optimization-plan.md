# 前端UI代码优化方案

## Context

当前TOPEMS前端项目存在以下问题需要优化：
1. **组件重复定义**：`mui/` 和 `common/` 目录存在功能重叠的组件（StatCard、DataGrid等）
2. **TypeScript错误**：约80+个错误，主要分布在测试文件、业务页面和组件定义中
3. **组件导出不一致**：多个目录有独立的index.ts，缺乏统一的导出策略
4. **代码规范待完善**：部分代码未遵循设计文档中的规范

本次优化旨在提升代码质量、消除重复组件、建立统一的组件架构。

---

## Phase 1: 组件去重与整合

### 1.1 清理重复组件

需要整合以下重复组件（mui/ vs common/）：

| 组件 | mui版本 | common版本 | 建议 |
|------|---------|------------|------|
| StatCard | [mui/StatCard.tsx](file:///Users/air/TOPEMS/apps/web/src/components/mui/StatCard.tsx) | [common/StatCard.tsx](file:///Users/air/TOPEMS/apps/web/src/components/common/StatCard.tsx) | 保留common/版本，标记mui/为deprecated |
| DataGrid | [mui/DataGrid.tsx](file:///Users/air/TOPEMS/apps/web/src/components/mui/DataGrid.tsx) | [common/DataTable.tsx](file:///Users/air/TOPEMS/apps/web/src/components/common/DataTable.tsx) | DataTable已整合功能，统一使用DataTable |
| FilterBar | mui/FilterBar | common/AdvancedFilter | 保留common/AdvancedFilter |
| EmptyState | mui/EmptyState | templates/EmptyState | 统一使用templates/EmptyState |
| LoadingState | mui/LoadingState | common/LoadingSpinner | 保留common/LoadingSpinner |

### 1.2 更新组件导出

修改 [mui/index.ts](file:///Users/air/TOPEMS/apps/web/src/components/mui/index.ts)，将重复组件标记为deprecated并重新导出common版本：

```typescript
// 将 StatCard 标记为 deprecated，重新导出 common 版本
export { default as StatCard } from '@/components/common/StatCard';
```

---

## Phase 2: TypeScript错误修复

### 2.1 错误分类统计

```
测试文件错误 (vi/vitest): ~50个
业务页面API类型不匹配: ~20个
组件Props类型问题: ~10个
其他: ~5个
```

### 2.2 优先修复高优先级错误

**Critical - 影响构建**:
- [HrmContractPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/hrm/HrmContractPage.tsx) - Chip组件未导入
- [HrmPositionPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/hrm/HrmPositionPage.tsx) - DialogContent未闭合

**High - 影响功能**:
- [pages/hrm/HrmContractDetailPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/hrm/HrmContractDetailPage.tsx) - Contract类型缺少属性
- [pages/bi/BIVisualizationPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/bi/BIVisualizationPage.tsx) - WidgetPosition类型缺少width/height

**Medium - 代码质量**:
- [components/templates/ReportDesignerTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/ReportDesignerTemplate.tsx) - yFields可能为undefined

### 2.3 测试文件错误处理

测试文件中的 `vi` 命名空间错误，需要在测试文件顶部添加：
```typescript
import { vi } from 'vitest';
```

或更新 `tsconfig.json` 中的 `types` 配置。

---

## Phase 3: 统一组件导出架构

### 3.1 建立三层组件体系

```
components/
├── common/     # 原子组件（Button, Input, Badge等基础组件）
├── templates/  # 页面模板（ListPageTemplate, DashboardTemplate等）
└── mui/       # MUI封装组件（保留已封装的复杂组件）
```

### 3.2 统一导出入口

建议创建 [components/index.ts](file:///Users/air/TOPEMS/apps/web/src/components/index.ts) 作为统一导出入口：

```typescript
// 统一导出所有组件
export * from './common';
export * from './templates';
export * from './mui';
```

---

## Phase 4: 代码规范落地

### 4.1 检查设计规范执行情况

根据 [design-system.md](file:///Users/air/TOPEMS/docs/guides/ui/design-system.md)：

- [ ] 所有组件使用MUI的sx prop进行样式定义
- [ ] 避免使用Tailwind CSS（检查是否有遗留使用）
- [ ] 组件导入使用绝对路径 `@/components/...`
- [ ] MUI v5+ API使用（如Grid v2, Stack）

### 4.2 统一工具函数导出

当前 [utils/index.ts](file:///Users/air/TOPEMS/apps/web/src/utils/index.ts) 已导出format/date/string模块，需确认：

- [ ] format.ts 中的函数命名符合规范
- [ ] 日期格式化使用统一入口
- [ ] 字符串工具函数无重复定义

---

## 实施计划

### Sprint 1: 组件去重 (1天)
1. 识别所有重复组件
2. 统一保留common/版本
3. 更新mui/index.ts重新导出
4. 全局搜索替换引用

### Sprint 2: TypeScript修复 (2天)
1. 修复Critical级别错误
2. 修复High级别错误
3. 批量处理测试文件vi导入

### Sprint 3: 导出架构统一 (0.5天)
1. 创建统一导出入口
2. 更新各模块index.ts
3. 清理废弃导出

### Sprint 4: 规范落地检查 (0.5天)
1. 检查设计规范执行
2. 修复遗留规范问题
3. 更新代码注释

---

## Verification

### 验证步骤

1. **TypeScript检查**
   ```bash
   npx tsc --noEmit --project apps/web/tsconfig.json
   ```
   目标：错误数降至<10

2. **构建验证**
   ```bash
   cd apps/web && npm run build
   ```
   目标：构建成功

3. **组件引用检查**
   ```bash
   grep -r "from '@/components/mui/StatCard'" apps/web/src
   grep -r "from '@/components/common/StatCard'" apps/web/src
   ```
   目标：无直接引用mui版本的代码

---

## 关键文件清单

### 需要修改的文件
- [apps/web/src/components/mui/index.ts](file:///Users/air/TOPEMS/apps/web/src/components/mui/index.ts) - 更新导出
- [apps/web/src/components/index.ts](file:///Users/air/TOPEMS/apps/web/src/components/index.ts) - 新建统一入口
- [apps/web/src/pages/hrm/HrmContractPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/hrm/HrmContractPage.tsx) - 修复导入
- [apps/web/src/pages/hrm/HrmContractDetailPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/hrm/HrmContractDetailPage.tsx) - 类型修复
- [apps/web/src/pages/bi/BIVisualizationPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/bi/BIVisualizationPage.tsx) - 类型修复
- [apps/web/src/components/templates/ReportDesignerTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/ReportDesignerTemplate.tsx) - undefined处理

### 需要删除/标记deprecated的文件
- `apps/web/src/components/mui/StatCard.tsx`
- `apps/web/src/components/mui/DataGrid.tsx`
- 其他重复组件