# TOPEMS Industrial OS 组件库（v3）

> 基于 Industrial OS 设计语言的 React 组件库，为 TOPEMS UI 重设计提供统一的组件基础。

## 目录结构

```
components/redesign/
├── primitives/     # 基础组件（8个）
├── layout/         # 布局组件（4个）
├── data/           # 数据展示组件（5个）
├── overlay/        # 浮层组件（3个）
├── feedback/       # 反馈组件（5个）
├── templates/      # 页面模板（3个）
└── index.ts        # 统一导出
```

## 组件清单

### Primitives（基础组件）

| 组件 | 说明 | 常用属性 |
|------|------|----------|
| `Button` | 按钮 | variant, size, leftIcon, rightIcon, loading, disabled |
| `Card` | 卡片 | title, subtitle, actions, padding |
| `Badge` | 徽标 | variant, size |
| `Tag` | 标签 | variant, size, closable |
| `Input` | 输入框 | type, placeholder, error, disabled, label |
| `Select` | 选择器 | options, value, onChange, placeholder |
| `Tabs` | 标签页 | tabs, activeTab, onChange |
| `Toggle` | 开关 | checked, onChange, disabled, label |
| `Avatar` | 用户头像 | src, name, size, variant, status, badge |
| `FileUpload` | 文件上传 | value, onChange, accept, multiple, maxSize, customRequest |
| `DateRangePicker` | 日期范围选择 | value, onChange, presets, minDate, maxDate |

### Layout（布局组件）

| 组件 | 说明 | 常用属性 |
|------|------|----------|
| `AppShell` | 应用外壳 | sidebar, topbar, children |
| `TopBar` | 顶部栏 | title, actions, onMenuClick |
| `SideRail` | 侧边导航 | items, activeItem, onItemClick |
| `PageHeader` | 页面标题 | title, subtitle, actions, breadcrumbs |

### Data（数据展示）

| 组件 | 说明 | 常用属性 |
|------|------|----------|
| `DataTable` | 数据表格 | columns, data, loading, emptyText, onRowClick |
| `StatTile` | 统计卡片 | label, value, trend, icon, status |
| `StatusLight` | 状态指示灯 | status, size, label |
| `FilterChip` | 筛选标签 | label, active, onRemove, onClick |
| `TrendLine` | 迷你趋势图 | data, color, height |
| `Pagination` | 分页 | current, total, pageSize, onChange, showSizeChanger |

### Overlay（浮层组件）

| 组件 | 说明 | 常用属性 |
|------|------|----------|
| `Modal` | 模态框 | open, title, onClose, children, footer |
| `Drawer` | 抽屉 | open, title, onClose, children, size, placement |
| `Tooltip` | 提示气泡 | content, placement, children |

### Feedback（反馈组件）

| 组件 | 说明 | 常用属性 |
|------|------|----------|
| `Alert` | 警告提示 | type, title, message, closable |
| `Toast` | 全局通知 | type, message, duration |
| `EmptyState` | 空状态 | icon, title, description, action |
| `ErrorState` | 错误状态 | error, onRetry |
| `LoadingOverlay` | 加载遮罩 | loading, text, fullscreen |

### Templates（页面模板）

| 组件 | 说明 | 常用属性 |
|------|------|----------|
| `ListPageTemplate` | 列表页模板 | header, filters, table, actions |
| `FormPageTemplate` | 表单页模板 | header, onSubmit, actions, children |
| `DetailPageTemplate` | 详情页模板 | header, tabs, sidebar, children |

## 使用方式

### 基础用法

```tsx
import { Button, Card, DataTable } from '@/components/redesign';

function Example() {
  return (
    <Card title="示例卡片">
      <Button variant="primary" onClick={handleClick}>
        点击按钮
      </Button>
      <DataTable columns={columns} data={data} />
    </Card>
  );
}
```

### 页面模板用法

```tsx
import { ListPageTemplate } from '@/components/redesign';

function UserListPage() {
  return (
    <ListPageTemplate
      header={{ title: '用户管理', subtitle: '管理系统用户' }}
      actions={<Button>新建用户</Button>}
    >
      <DataTable columns={columns} data={data} />
    </ListPageTemplate>
  );
}
```

## Design Tokens

组件库使用 CSS 变量作为 Design Tokens，定义在：
- `src/theme/redesign-tokens.css` — 颜色、间距、圆角、阴影、动效
- `src/theme/redesign-global.css` — 全局样式重置和工具类

### 常用 Token

```css
/* 颜色 */
--bg-primary, --bg-secondary, --bg-elevated
--surface-1, --surface-2, --surface-3, --surface-4
--text-primary, --text-secondary, --text-tertiary
--primary-500, --success-500, --warning-500, --error-500

/* 间距 */
--space-1 (4px), --space-2 (8px), ..., --space-8 (32px)

/* 圆角 */
--radius-sm (4px), --radius-md (8px), --radius-lg (12px)

/* 动效 */
--duration-fast (150ms), --duration-base (200ms), --duration-slow (300ms)
```

## 开发规范

1. **样式**：使用 CSS 变量，禁止硬编码颜色值
2. **属性**：继承 `React.HTMLAttributes` 时需显式排除 `action` 属性
3. **无障碍**：支持键盘操作、ARIA 标签、焦点管理
4. **类型安全**：所有组件必须有完整的 TypeScript 类型定义
5. **测试**：关键交互组件需有单元测试

## 相关文档

- [UI_REDESIGN_v3.md](../../../UI_REDESIGN_v3.md) — 设计系统规范
- [UI_MIGRATION_GUIDE.md](../../../UI_MIGRATION_GUIDE.md) — UI 迁移指南
- [UI_MIGRATION_TEST_CHECKLIST.md](../../../UI_MIGRATION_TEST_CHECKLIST.md) — 测试验证清单
