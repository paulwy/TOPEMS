# TOPEMS 页面模板规范

## 一、概述

本文档定义了 TOPEMS 前端项目中页面模板的使用规范，旨在确保所有页面具有一致的结构、风格和交互体验。

## 二、模板分类及适用场景

### 2.1 通用业务模板

| 模板名称 | 适用场景 | 典型页面示例 |
|---------|---------|-------------|
| **ListPageTemplate** | 数据列表展示、搜索筛选、分页操作 | 用户列表、订单列表、客户列表、合同列表 |
| **FormPageTemplate** | 数据录入、编辑、表单验证 | 创建用户、编辑订单、新建合同、申请审批 |
| **DetailPageTemplate** | 数据详情展示、多标签页、关联信息 | 用户详情、订单详情、合同详情、项目详情 |
| **StatsPageTemplate** | 数据统计、图表展示、关键指标 | Dashboard、统计报表、数据分析 |
| **TreePageTemplate** | 层级数据展示、组织架构、分类管理 | 部门树、组织架构、产品分类、文件目录 |
| **CardListTemplate** | 卡片网格展示、资源浏览、快速预览 | 设备列表、文档卡片、联系人、会议室 |

### 2.2 特殊功能模板

| 模板名称 | 适用场景 | 典型页面示例 |
|---------|---------|-------------|
| **WizardPageTemplate** | 多步骤流程引导、复杂配置、分步表单 | 入职流程、项目创建向导、设备配置、报表配置 |
| **KanbanPageTemplate** | 看板视图、任务管理、状态流转 | 任务看板、工单管理、审批队列、敏捷看板 |
| **TimelinePageTemplate** | 时间线展示、事件序列、操作日志 | 操作日志、项目进度、订单跟踪、活动记录 |
| **SettingsPageTemplate** | 设置管理、配置项、偏好设置 | 系统设置、用户设置、模块配置、全局配置 |
| **ReportDesignerTemplate** | 报表设计、自定义报表、数据可视化 | 报表设计器、自定义图表、数据看板 |
| **GisMapTemplate** | 地图展示、定位、围栏管理 | 设备定位、区域监控、轨迹回放、地图分析 |
| **MarkdownEditorTemplate** | 文档编辑、富文本、内容创作 | 帮助文档、公告编辑、知识库、文档中心 |

## 三、模板选择决策流程

```
页面功能分析
    │
    ├─→ 数据展示为主？
    │       │
    │       ├─→ 列表形式 → ListPageTemplate
    │       ├─→ 卡片形式 → CardListTemplate
    │       ├─→ 层级结构 → TreePageTemplate
    │       └─→ 时间序列 → TimelinePageTemplate
    │
    ├─→ 数据操作为主？
    │       │
    │       ├─→ 单表单 → FormPageTemplate
    │       ├─→ 多步骤 → WizardPageTemplate
    │       └─→ 状态流转 → KanbanPageTemplate
    │
    ├─→ 数据详情为主？
    │       │
    │       └─→ DetailPageTemplate
    │
    ├─→ 数据统计为主？
    │       │
    │       └─→ StatsPageTemplate
    │
    ├─→ 特殊功能？
    │       │
    │       ├─→ 设置配置 → SettingsPageTemplate
    │       ├─→ 报表设计 → ReportDesignerTemplate
    │       ├─→ 地图展示 → GisMapTemplate
    │       └─→ 文档编辑 → MarkdownEditorTemplate
    │
    └─→ 无匹配模板？
            │
            └─→ 自定义实现（需经过架构评审）
```

## 四、模板使用规范

### 4.1 ListPageTemplate 使用规范

**必须包含**：
- `title`: 页面标题
- `columns`: 列定义数组（ColumnDef）
- `data`: 数据数组
- `loading`: 加载状态

**推荐包含**：
- `searchable`: 搜索功能
- `filters`: 筛选条件
- `rowActions`: 行操作
- `batchActions`: 批量操作
- `pagination`: 分页配置

**使用示例**：
```tsx
<ListPageTemplate
  title="客户列表"
  columns={columns}
  data={data}
  loading={loading}
  searchable
  filters={filters}
  rowActions={rowActions}
  pagination={{ page: 1, pageSize: 20, total: 100 }}
/>
```

### 4.2 FormPageTemplate 使用规范

**必须包含**：
- `title`: 页面标题
- `sections`: 表单区块数组（FormSection）
- `onSubmit`: 提交回调

**推荐包含**：
- `mode`: 表单模式（create/edit/view）
- `initialValues`: 初始值
- `validationSchema`: Zod 验证规则
- `onCancel`: 取消回调

**使用示例**：
```tsx
<FormPageTemplate
  title="新建客户"
  mode="create"
  sections={sections}
  initialValues={initialValues}
  validationSchema={schema}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### 4.3 DetailPageTemplate 使用规范

**必须包含**：
- `title`: 页面标题
- `tabs` 或 `sections`: 内容配置

**推荐包含**：
- `infoCard`: 信息卡片
- `actions`: 操作按钮
- `backHref`: 返回链接

**使用示例**：
```tsx
<DetailPageTemplate
  title="客户详情"
  infoCard={infoCard}
  tabs={tabs}
  actions={actions}
  backHref="/crm/customers"
/>
```

### 4.4 StatsPageTemplate 使用规范

**必须包含**：
- `title`: 页面标题
- `statCards`: 统计卡片数组

**推荐包含**：
- `chartConfigs`: 图表配置
- `timeRangeOptions`: 时间范围选项
- `searchable`: 搜索功能

**使用示例**：
```tsx
<StatsPageTemplate
  title="数据统计"
  statCards={statCards}
  chartConfigs={chartConfigs}
  timeRangeOptions={timeRangeOptions}
/>
```

## 五、模板扩展规范

### 5.1 何时扩展模板

当现有模板无法满足以下需求时，可以考虑扩展：

1. **新的页面模式**：现有模板完全不适用的全新页面类型
2. **功能缺失**：现有模板缺少关键功能，且无法通过 props 扩展
3. **性能问题**：现有模板在特定场景下存在性能瓶颈

### 5.2 扩展方式

| 方式 | 适用场景 | 示例 |
|------|---------|------|
| **Props 扩展** | 添加简单功能 | 添加 `customHeader`、`customFooter` props |
| **Slot 扩展** | 添加自定义内容区域 | 添加 `headerContent`、`footerContent` slots |
| **HOC 扩展** | 添加高阶功能 | 添加权限控制、数据缓存 |
| **继承扩展** | 大幅修改模板 | 创建新模板继承基础模板 |

### 5.3 扩展审批流程

1. 提出扩展需求
2. 进行架构评审
3. 编写设计文档
4. 实现扩展
5. 更新本规范文档

## 六、模板版本管理

### 6.1 版本号规则

模板版本号遵循语义化版本控制（Semantic Versioning）：

- **主版本号**：模板 API 发生破坏性变更
- **次版本号**：模板添加新功能，向后兼容
- **修订版本号**：模板修复 bug，向后兼容

### 6.2 版本兼容性

- 主版本号变更时，需要更新所有使用该模板的页面
- 次版本号和修订版本号变更时，页面无需修改

## 七、模板维护规范

### 7.1 代码风格

- 遵循项目统一的代码风格指南
- 使用 TypeScript，确保类型定义完整
- 添加必要的注释和文档

### 7.2 测试要求

- 每个模板必须包含单元测试
- 每个模板必须包含集成测试
- 测试覆盖率不低于 80%

### 7.3 文档更新

- 模板变更时必须更新本规范文档
- 模板 API 变更时必须更新 README 文档
- 模板添加新功能时必须添加使用示例

## 八、附录

### 8.1 模板文件清单

| 模板名称 | 文件路径 | 状态 |
|---------|---------|------|
| ListPageTemplate | components/templates/ListPageTemplate.tsx | ✅ 稳定 |
| FormPageTemplate | components/templates/FormPageTemplate.tsx | ✅ 稳定 |
| DetailPageTemplate | components/templates/DetailPageTemplate.tsx | ✅ 稳定 |
| StatsPageTemplate | components/templates/StatsPageTemplate.tsx | ✅ 稳定 |
| TreePageTemplate | components/templates/TreePageTemplate.tsx | ✅ 稳定 |
| CardListTemplate | components/templates/CardListTemplate.tsx | ✅ 稳定 |
| WizardPageTemplate | components/templates/WizardPageTemplate.tsx | ✅ 稳定 |
| KanbanPageTemplate | components/templates/KanbanPageTemplate.tsx | ✅ 稳定 |
| TimelinePageTemplate | components/templates/TimelinePageTemplate.tsx | ✅ 稳定 |
| SettingsPageTemplate | components/templates/SettingsPageTemplate.tsx | ✅ 稳定 |
| ReportDesignerTemplate | components/templates/ReportDesignerTemplate.tsx | ⚠️ 测试中 |
| GisMapTemplate | components/templates/GisMapTemplate.tsx | ⚠️ 测试中 |
| MarkdownEditorTemplate | components/templates/MarkdownEditorTemplate.tsx | ⚠️ 测试中 |

### 8.2 模板导出清单

所有模板通过 `components/templates/index.ts` 统一导出：

```typescript
// 通用业务模板
export { ListPageTemplate } from './ListPageTemplate';
export { FormPageTemplate } from './FormPageTemplate';
export { DetailPageTemplate } from './DetailPageTemplate';
export { StatsPageTemplate } from './StatsPageTemplate';
export { TreePageTemplate } from './TreePageTemplate';
export { CardListTemplate } from './CardListTemplate';

// 特殊功能模板
export { WizardPageTemplate } from './WizardPageTemplate';
export { KanbanPageTemplate } from './KanbanPageTemplate';
export { TimelinePageTemplate } from './TimelinePageTemplate';
export { SettingsPageTemplate } from './SettingsPageTemplate';
export { ReportDesignerTemplate } from './ReportDesignerTemplate';
export { GisMapTemplate } from './GisMapTemplate';
export { MarkdownEditorTemplate } from './MarkdownEditorTemplate';
```

---

**文档版本**: 1.0  
**创建日期**: 2026-06-25  
**最后更新**: 2026-06-25  
**适用项目**: TOPEMS 前端项目
