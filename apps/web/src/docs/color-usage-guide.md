# TOPEMS 颜色使用指南

## 1. 颜色系统概述

TOPEMS 颜色系统采用三层结构：

1. **基础色板（Palette）**：定义在 `src/theme/tokens.ts` 中，包含 6 种语义色（primary、secondary、success、warning、error、info），每种色提供 50-900 共 10 级色阶，以及 `main`、`light`、`dark` 三个便捷别名。
2. **模块主题色（Module Themes）**：定义在 `src/lib/moduleThemes.ts` 中，为每个业务模块分配独特的主题色和渐变色。
3. **功能色**：包括中性色（grey）、背景色、文字色、边框色、操作色等，确保 UI 各元素视觉层次分明。

### 色阶规则

每个语义色遵循统一的 10 级色阶规则：

- **50-100**：极浅色，用于背景高亮、hover 态
- **200-300**：浅色，用于柔和中性背景
- **400**：light 别名的备选
- **500**：main 主色，用于核心交互元素
- **600**：dark 别名的备选，按压态
- **700-900**：深色，用于深色强调、渐变终点

---

## 2. 主色板使用场景

### Primary（主色）- #3b82f6

| 场景 | 色阶 | 说明 |
|------|------|------|
| 主按钮 | `primary.main` (#3b82f6) | 主要操作入口 |
| 主按钮悬停 | `primary.dark` (#2563eb) | 按钮悬停态 |
| 选中态背景 | `primary.50` (#eff6ff) | 行选中、标签激活背景 |
| 链接文字 | `primary.main` (#3b82f6) | 可点击链接 |
| 进度条 | `primary.400`~`primary.600` | 渐变进度指示 |
| 标签高亮 | `primary.100` (#dbeafe) | 信息标签背景 |

### Secondary（次要色）- #8b5cf6

| 场景 | 色阶 | 说明 |
|------|------|------|
| 次要操作 | `secondary.main` | 辅助按钮 |
| 标签 | `secondary.light` | 辅助信息标签背景 |
| 渐变装饰 | `secondary.500`~`secondary.700` | 页面装饰渐变 |

### Success（成功色）- #22c55e

| 场景 | 色阶 | 说明 |
|------|------|------|
| 成功状态 | `success.main` | 已完成、已通过状态 |
| 成功背景 | `success.50` | 成功提示背景 |
| 成功标签 | `success.light` | 成功状态标签背景 |

### Warning（警告色）- #f59e0b

| 场景 | 色阶 | 说明 |
|------|------|------|
| 警告提示 | `warning.main` | 待处理、需注意 |
| 警告背景 | `warning.50` | 警告提示面板背景 |
| 低库存 | `warning.dark` | 数量告警 |

### Error（错误色）- #ef4444

| 场景 | 色阶 | 说明 |
|------|------|------|
| 错误状态 | `error.main` | 失败、已拒绝 |
| 错误背景 | `error.50` | 错误提示背景 |
| 危险操作 | `error.dark` (#dc2626) | 删除确认按钮 |

### Info（信息色）- #0ea5e9

| 场景 | 色阶 | 说明 |
|------|------|------|
| 信息提示 | `info.main` | 提示、帮助 |
| 处理中 | `info.light` | 处理中状态标签 |
| 链接装饰 | `info.100` | 信息面板背景 |

---

## 3. 模块颜色分配

每个业务模块在 `moduleThemes` 中定义了专属的主题色和渐变色，用于侧边栏图标、模块卡片、页面头部等视觉标识。

| 模块代码 | 模块名称 | 主题色 | 渐变色 | 图标 | 使用场景 |
|---------|---------|--------|--------|------|---------|
| `iam` | 系统管理 | `#6366F1` | `linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)` | Shield | 系统设置、权限管理页面 |
| `crm` | 客户关系管理 | `#0EA5E9` | `linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)` | Users | 客户列表、商机看板 |
| `erp` | 企业资源规划 | `#F97316` | `linear-gradient(135deg, #F97316 0%, #EA580C 100%)` | Building2 | ERP 模块导航、报表 |
| `wms` | 仓储管理 | `#0EA5E9` | `linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)` | Package | 库存管理、出入库 |
| `mes` | 制造执行系统 | `#EF4444` | `linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)` | Factory | 生产管理、工单 |
| `qms` | 质量管理系统 | `#06B6D4` | `linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)` | ClipboardCheck | 质检报告、不合格品 |
| `hrm` | 人力资源管理 | `#22C55E` | `linear-gradient(135deg, #22C55E 0%, #15803D 100%)` | Users | 员工管理、考勤薪酬 |
| `finance` | 财务管理 | `#10B981` | `linear-gradient(135deg, #10B981 0%, #059669 100%)` | Wallet | 凭证、报表、对账 |
| `scm` | 供应链管理 | `#F59E0B` | `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)` | Truck | 供应链可视化 |
| `srm` | 供应商关系管理 | `#14B8A6` | `linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)` | Handshake | 供应商列表、评估 |
| `pm` | 项目管理 | `#F59E0B` | `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)` | FolderKanban | 项目列表、甘特图 |
| `oa` | 办公自动化 | `#06B6D4` | `linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)` | CalendarCheck | 审批流程、日程 |
| `ehs` | 安全环保健康 | `#22C55E` | `linear-gradient(135deg, #22C55E 0%, #16A34A 100%)` | Activity | 安全检查、环境监测 |
| `lims` | 实验室信息管理 | `#14B8A6` | `linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)` | FlaskConical | 样品管理、检测报告 |
| `bi` | 商业智能 | `#8B5CF6` | `linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)` | BarChart3 | 数据看板、图表 |
| `workflow` | 工作流 | `#0EA5E9` | `linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)` | Workflow | 流程设计、审批 |
| `docs` | 文档管理 | `#F59E0B` | `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)` | BookOpen | 文档库、模板 |
| `monitor` | 系统监控 | `#EF4444` | `linear-gradient(135deg, #EF4444 0%, #DC2626 100%)` | Activity | 服务监控、告警 |
| `notification` | 通知中心 | `#F59E0B` | `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)` | Bell | 消息列表、设置 |
| `integration` | 系统集成 | `#64748B` | `linear-gradient(135deg, #64748B 0%, #475569 100%)` | Plug | 接口管理、日志 |
| `gis` | 地理信息系统 | `#10B981` | `linear-gradient(135deg, #10B981 0%, #059669 100%)` | Map | 地图标注、区域 |
| `pdm` | 产品数据管理 | `#06B6D4` | `linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)` | Database | BOM 管理、版本 |
| `rs` | 研发管理 | `#D946EF` | `linear-gradient(135deg, #D946EF 0%, #C026D3 100%)` | Code2 | 研发项目、版本管理 |
| `report` | 报表管理 | `#3B82F6` | `linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)` | FileBarChart | 报表生成、导出 |
| `plugin` | 插件市场 | `#F59E0B` | `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)` | Puzzle | 插件列表、安装 |
| `ai` | AI 助手 | `#3B82F6` | `linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)` | Zap | AI 对话、配置 |
| `admin` | 管理后台 | `#6B7280` | `linear-gradient(135deg, #6B7280 0%, #4B5563 100%)` | Settings | 后台管理页面 |
| `asset` | 资产管理 | `#14B8A6` | `linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)` | Layers | 资产台账、盘点 |
| `im` | 即时通讯 | `#10B981` | `linear-gradient(135deg, #10B981 0%, #059669 100%)` | MessageSquare | 聊天、群组 |

### 使用模块主题色的代码示例

```typescript
import { getModuleTheme, getModuleThemeFromPath } from '@/lib/moduleThemes';

// 通过模块代码获取主题
const crmTheme = getModuleTheme('crm');
// => { code: 'crm', name: '客户关系管理', icon: Users, gradient: '...', color: '#0EA5E9' }

// 通过当前路径自动获取
const theme = getModuleThemeFromPath('/crm/customers');
// => 自动识别 crm 模块
```

---

## 4. 状态色映射

语义色对应 UI 中常见的状态，以下是标准映射：

| 状态 | 颜色 | 令牌 | 典型场景 |
|------|------|------|---------|
| 成功 / 已完成 / 已通过 | 绿色 | `success.main` (#22c55e) | 状态徽章、操作成功提示 |
| 警告 / 待处理 / 需注意 | 黄色 | `warning.main` (#f59e0b) | 待审批、低库存、即将到期 |
| 错误 / 失败 / 已拒绝 | 红色 | `error.main` (#ef4444) | 表单校验、操作失败、已拒绝 |
| 信息 / 提示 / 处理中 | 蓝色 | `info.main` (#0ea5e9) | 帮助提示、处理中状态 |
| 主要 / 激活 / 选中 | 蓝色 | `primary.main` (#3b82f6) | 主操作按钮、选中标签 |
| 次要 / 辅助 | 紫色 | `secondary.main` (#8b5cf6) | 辅助操作、次要信息 |
| 中性 / 禁用 / 已取消 | 灰色 | `grey.400` (#9ca3af) | 禁用态、已取消 |

### StatusBadge 预设状态颜色映射

`StatusBadge` 组件内置了大量预设状态，以下是与颜色相关的核心映射：

| 状态值 | 标签 | 颜色 |
|--------|------|------|
| `active` | 启用 | success |
| `inactive` | 禁用 | default（灰） |
| `pending` | 待处理 | warning |
| `approved` | 已批准 | success |
| `rejected` | 已拒绝 | error |
| `draft` | 草稿 | default |
| `completed` | 已完成 | success |
| `processing` | 处理中 | info |
| `failed` | 失败 | error |

---

## 5. 暗色模式适配

### 原则

暗色模式下不应简单反转颜色，而是通过降低亮度、调整对比度来保证可读性。主要变化：

| 元素 | 亮色模式 | 暗色模式策略 |
|------|---------|-------------|
| 背景色 | `#f8fafc` / `#ffffff` | 使用 `grey.900` / `grey.800` |
| 主文字 | `#1e293b` (深色) | `grey.50` / `grey.100` (浅色) |
| 次文字 | `#64748b` | `grey.400` / `grey.300` |
| 边框 | `#e2e8f0` | `grey.700` / `grey.600` |
| 卡片背景 | `#ffffff` | `grey.900` |
| 语义色 main | 不变 | 保持不变或略微调亮 |
| 语义色 50/100 | 浅背景 | 改用语义色的 800/900 低透明度 |

### 阴影适配

暗色模式下，令牌提供了专用的 `darkShadows` 对象，使用更高的 alpha 值（0.15~0.45）确保阴影在深色背景上可见：

```typescript
const isDark = theme.palette.mode === 'dark';
const shadow = isDark ? designTokens.darkShadows.md : designTokens.shadows.md;
```

### 使用示例

```tsx
<Box sx={{
  // MUI 会自动处理 palette 在暗色模式下的值
  bgcolor: 'background.paper',
  color: 'text.primary',
  borderColor: 'divider',
  // 阴影需手动切换
  boxShadow: theme.palette.mode === 'dark'
    ? designTokens.darkShadows.md
    : designTokens.shadows.md,
}}>
  内容
</Box>
```

---

## 6. 无障碍性（Accessibility）

### WCAG AA 对比度要求

所有文字与背景色的对比度必须满足 **WCAG AA 4.5:1**（正文）和 **3:1**（大号文字/图标）标准。

### 安全的文字-背景组合

以下组合满足 WCAG AA 4.5:1 要求：

| 背景色 | 安全文字色 |
|--------|-----------|
| 白色 (`#ffffff`) | `text.primary` (#1e293b)、`grey.800`、`primary.main`、`secondary.main`、`success.main`、`error.main`、`info.main` |
| `primary.main` (#3b82f6) | 白色 (`#ffffff`) |
| `error.main` (#ef4444) | 白色 (`#ffffff`) |
| `success.main` (#22c55e) | 白色 (`#ffffff`) |
| `warning.main` (#f59e0b) | `grey.800` (#1f2937) - **白色不满足 4.5:1** |
| `grey.100` (#f3f4f6) | `text.primary`、`grey.800` |

### 避免的对比组合

- `primary.200` 背景上使用 `text.secondary`（对比度不足）
- `warning.main` 背景上使用白色文字（对比度约 1.85:1，不满足标准）
- `grey.300` 背景上使用 `text.muted`
- 任何浅色背景（50/100）上使用浅色文字

### 检查工具

使用浏览器开发者工具或在线工具验证对比度：
- Chrome DevTools → Elements → Color contrast ratio
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## 7. 最佳实践

### 推荐做法（Do）

- **使用语义色名**：`success.main` 而非 `#22c55e`，便于主题切换
- **使用 `main`/`light`/`dark` 别名**：而非直接使用 500/400/600 色阶
- **浅色用 50/100，深色用 700/800/900**：保持色阶语义一致
- **状态色与语义对应**：成功用 green，错误用 red，不要反过来
- **模块色用于视觉标识**：侧边栏图标、模块卡片头部、页面装饰
- **保持足够的颜色对比度**：确保 WCAG AA 合规

### 不推荐做法（Don't）

- **不要在代码中硬编码颜色值**：使用设计令牌或 CSS 变量
- **不要在同一页面过多使用高饱和度颜色**：视觉噪音过大
- **不要用颜色作为唯一信息载体**：色盲用户无法区分，需配合图标/文字
- **不要将 warning.main 作为按钮背景色配白色文字**：对比度不达标
- **不要在暗色模式下使用亮色模式的 50/100 背景**：过于刺眼
- **不要混用不同模块的主题色**：保持模块内视觉一致性
- **不要自行定义渐变色**：使用 `moduleThemes` 中预定义的渐变
- **不要在相邻元素使用色轮对立色**（如红色和绿色大面积相邻）：色弱用户难以区分
