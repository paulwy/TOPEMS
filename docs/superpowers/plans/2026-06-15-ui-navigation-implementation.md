# UI导航与页面布局实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现分层导航体系、严格页面拆分、柔和渐变风格、完整公共组件库

**Architecture:** 采用三级导航体系（Header全局导航 → 模块Tab导航 → 页面内部导航），页面严格拆分（一页一功能），使用MUI sx实现柔和渐变风格

**Tech Stack:** React 18.3+, TypeScript 5.4+, MUI v9.x, Lucide React, React Router 6.22+

---

## 文件结构

### 新增文件

```
apps/web/src/
├── config/
│   └── navigation-v2.ts          # 新版导航配置
├── components/
│   ├── layout/
│   │   ├── PageHeader.tsx        # 页面头部组件
│   │   ├── PageBreadcrumb.tsx    # 面包屑组件
│   │   ├── ModuleTabs.tsx        # 模块Tab组件（更新）
│   │   ├── ServiceMonitor.tsx    # 服务状态监测组件
│   │   └── MobileDrawer.tsx      # 移动端抽屉导航
│   ├── common/
│   │   ├── TreeView.tsx          # 树状目录组件
│   │   ├── ProgressBar.tsx       # 进度条组件
│   │   ├── GanttChart.tsx        # 甘特图组件
│   │   ├── Stepper.tsx           # 步骤器组件
│   │   ├── Timeline.tsx          # 时间线组件
│   │   ├── EmptyState.tsx        # 空状态组件
│   │   ├── LoadingState.tsx      # 加载状态组件
│   │   ├── StatusBadge.tsx       # 状态徽章组件
│   │   ├── FilterBar.tsx         # 筛选栏组件
│   │   ├── ActionBar.tsx         # 操作栏组件
│   │   ├── ConfirmDialog.tsx     # 确认对话框组件
│   │   ├── NotificationToast.tsx # 通知提示组件
│   │   └── HelpButton.tsx        # 帮助按钮组件
│   └── dashboard/
│   │   ├── DashboardSections.tsx # 首页分区组件
│   │   ├── QuickActions.tsx      # 快捷入口组件
│   │   ├── TodoTabs.tsx          # 待办事项Tab组件
│   │   └── ModuleNavigation.tsx  # 模块导航卡片组件
│   └── theme/
│   │   ├── GradientColors.tsx    # 渐变颜色组件
│   │   └── ThemeSwitcher.tsx     # 主题切换组件
│   └── responsive/
│   │   ├── ResponsiveHeader.tsx  # 响应式Header
│   │   └── ResponsiveTable.tsx   # 响应式表格
│   └── index.ts                  # 组件导出
├── hooks/
│   ├── useNavigation.ts          # 导航状态Hook
│   ├── usePageState.ts           # 页面状态Hook
│   └── useResponsive.ts          # 响应式Hook
├── theme/
│   └── gradients.ts              # 渐变颜色配置
└── types/
│   └── navigation.ts             # 导航类型定义
```

### 修改文件

```
apps/web/src/
├── config/navigation.ts          # 更新导航配置
├── components/layout/TopNav.tsx  # 更新Header导航
├── components/layout/GlobalLayout.tsx  # 更新全局布局
├── pages/DashboardPage.tsx       # 更新首页
├── theme/theme.ts                # 更新主题配置
```

---

## Task 1: 导航配置更新

**Files:**
- Create: `apps/web/src/config/navigation-v2.ts`
- Create: `apps/web/src/types/navigation.ts`
- Modify: `apps/web/src/config/navigation.ts`

- [ ] **Step 1: 创建导航类型定义**

```typescript
// apps/web/src/types/navigation.ts

export interface NavMenuItem {
  label: string;
  path?: string;
  icon?: string;
  badge?: string | number;
}

export interface NavGroup {
  label: string;
  path?: string;
  isGroup?: boolean;
  children?: NavMenuItem[] | NavGroup[];
}

export interface TabItem {
  label: string;
  path: string;
  closable?: boolean;
  pinned?: boolean;
}

export interface ModuleTabsConfig {
  module: string;
  tabs: TabItem[];
}

export interface PageType {
  type: 'dashboard' | 'list' | 'detail' | 'form' | 'special';
  gradient: string;
}
```

- [ ] **Step 2: 创建新版导航配置**

```typescript
// apps/web/src/config/navigation-v2.ts

import { NavGroup, ModuleTabsConfig } from '../types/navigation';

export const topNavItemsV2: NavGroup[] = [
  {
    label: "首页",
    path: "/dashboard",
    isGroup: false,
  },
  {
    label: "人力",
    path: "/hrm",
    isGroup: true,
    children: [
      { label: "概览", path: "/hrm" },
      { label: "人事管理", children: [
        { label: "员工列表", path: "/hrm/employees" },
        { label: "合同管理", path: "/hrm/contracts" },
      ]},
      { label: "组织管理", children: [
        { label: "公司管理", path: "/hrm/companies" },
        { label: "部门管理", path: "/hrm/departments" },
        { label: "岗位管理", path: "/hrm/positions" },
      ]},
      { label: "考勤管理", children: [
        { label: "考勤记录", path: "/hrm/attendance" },
        { label: "请假管理", path: "/hrm/leave" },
      ]},
      { label: "薪酬绩效", children: [
        { label: "薪酬管理", path: "/hrm/payroll" },
        { label: "绩效管理", path: "/hrm/performance" },
      ]},
      { label: "人才发展", children: [
        { label: "招聘管理", path: "/hrm/recruitment" },
        { label: "培训管理", path: "/hrm/training" },
      ]},
    ],
  },
  // ... 其他模块配置（参考设计文档）
];

export const moduleTabsConfigV2: ModuleTabsConfig[] = [
  {
    module: "hrm",
    tabs: [
      { label: "概览", path: "/hrm", pinned: true },
      { label: "员工", path: "/hrm/employees" },
      { label: "部门", path: "/hrm/departments" },
      { label: "岗位", path: "/hrm/positions" },
      { label: "考勤", path: "/hrm/attendance" },
      { label: "薪酬", path: "/hrm/payroll" },
      { label: "绩效", path: "/hrm/performance" },
      { label: "招聘", path: "/hrm/recruitment" },
      { label: "培训", path: "/hrm/training" },
      { label: "合同", path: "/hrm/contracts" },
    ],
  },
  // ... 其他模块Tab配置
];
```

- [ ] **Step 3: 更新原导航配置文件**

修改 `apps/web/src/config/navigation.ts`，导入新配置：

```typescript
// apps/web/src/config/navigation.ts

export { topNavItemsV2 as topNavItems } from './navigation-v2';
export { moduleTabsConfigV2 as moduleTabsConfig } from './navigation-v2';
export type { NavGroup, NavMenuItem, TabItem, ModuleTabsConfig } from '../types/navigation';
```

- [ ] **Step 4: 验证导航配置**

运行开发服务器，检查导航配置是否正确加载：

```bash
cd apps/web && npm run dev
```

Expected: 导航菜单正常显示，首页入口简化为单一入口

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/config/navigation-v2.ts apps/web/src/types/navigation.ts apps/web/src/config/navigation.ts
git commit -m "feat(nav): update navigation config with simplified structure"
```

---

## Task 2: 页面头部组件开发

**Files:**
- Create: `apps/web/src/components/layout/PageHeader.tsx`
- Create: `apps/web/src/components/layout/PageBreadcrumb.tsx`
- Create: `apps/web/src/components/common/HelpButton.tsx`

- [ ] **Step 1: 创建页面头部组件**

```tsx
// apps/web/src/components/layout/PageHeader.tsx

import React from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { ArrowLeft, Search, Plus, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HelpButton } from '../common/HelpButton';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  showSearch?: boolean;
  showAdd?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  onSearch?: (value: string) => void;
  helpContent?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  showBack = false,
  showSearch = false,
  showAdd = false,
  addLabel = '新建',
  onAdd,
  onSearch,
  helpContent,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 2,
        px: 3,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showBack && (
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ borderRadius: 1 }}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </IconButton>
        )}
        <Typography variant="h5" fontWeight={600}>
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showSearch && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'grey.100',
              borderRadius: 1,
              px: 2,
              py: 0.5,
            }}
          >
            <Search style={{ width: 16, height: 16, color: 'grey.500' }} />
            <input
              placeholder="搜索..."
              onChange={(e) => onSearch?.(e.target.value)}
              sx={{ ml: 1, border: 'none', outline: 'none', bgcolor: 'transparent' }}
            />
          </Box>
        )}
        {showAdd && (
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={onAdd}
            sx={{
              bgcolor: 'primary.main',
              borderRadius: 1,
            }}
          >
            {addLabel}
          </Button>
        )}
        <HelpButton content={helpContent} />
      </Box>
    </Box>
  );
};
```

- [ ] **Step 2: 创建面包屑组件**

```tsx
// apps/web/src/components/layout/PageBreadcrumb.tsx

import React from 'react';
import { Box, Typography, Link, Breadcrumbs } from '@mui/material';
import { Home, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ px: 3, py: 1, bgcolor: 'grey.50' }}>
      <Breadcrumbs
        separator={<ChevronRight style={{ width: 16, height: 16 }} />}
        sx={{ fontSize: '0.875rem' }}
      >
        <Link
          onClick={() => navigate('/dashboard')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: 'grey.600',
            '&:hover': { color: 'primary.main' },
          }}
        >
          <Home style={{ width: 16, height: 16 }} />
        </Link>
        {items.map((item, index) =>
          item.path && index < items.length - 1 ? (
            <Link
              key={item.label}
              onClick={() => navigate(item.path!)}
              sx={{
                cursor: 'pointer',
                color: 'grey.600',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {item.label}
            </Link>
          ) : (
            <Typography key={item.label} color="text.primary">
              {item.label}
            </Typography>
          )
        )}
      </Breadcrumbs>
    </Box>
  );
};
```

- [ ] **Step 3: 创建帮助按钮组件**

```tsx
// apps/web/src/components/common/HelpButton.tsx

import React, { useState } from 'react';
import { IconButton, Tooltip, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { HelpCircle, X } from 'lucide-react';

interface HelpButtonProps {
  content?: string;
  title?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  content = '当前页面使用指南',
  title = '帮助',
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="查看帮助">
        <IconButton
          onClick={() => setOpen(true)}
          sx={{ borderRadius: 1 }}
        >
          <HelpCircle style={{ width: 20, height: 20, color: 'grey.500' }} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {title}
          <IconButton onClick={() => setOpen(false)}>
            <X style={{ width: 20, height: 20 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">{content}</Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};
```

- [ ] **Step 4: 验证组件**

创建测试页面验证组件：

```bash
cd apps/web && npm run dev
```

Expected: 页面头部组件正常显示，返回按钮、搜索框、帮助按钮功能正常

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/components/layout/PageHeader.tsx apps/web/src/components/layout/PageBreadcrumb.tsx apps/web/src/components/common/HelpButton.tsx
git commit -m "feat(layout): add PageHeader, PageBreadcrumb, HelpButton components"
```

---

## Task 3: 服务状态监测组件开发

**Files:**
- Create: `apps/web/src/components/layout/ServiceMonitor.tsx`

- [ ] **Step 1: 创建服务状态监测组件**

```tsx
// apps/web/src/components/layout/ServiceMonitor.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ServiceStatus {
  name: string;
  key: string;
  status: 'online' | 'warning' | 'offline';
}

interface ServiceMonitorProps {
  services: ServiceStatus[];
  onRefresh?: () => void;
  refreshInterval?: number;
}

export const ServiceMonitor: React.FC<ServiceMonitorProps> = ({
  services,
  onRefresh,
  refreshInterval = 30000,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  }, [onRefresh]);

  useEffect(() => {
    const interval = setInterval(handleRefresh, refreshInterval);
    return () => clearInterval(interval);
  }, [handleRefresh, refreshInterval]);

  const onlineCount = services.filter(s => s.status === 'online').length;
  const warningCount = services.filter(s => s.status === 'warning').length;
  const offlineCount = services.filter(s => s.status === 'offline').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle style={{ width: 14, height: 14, color: '#22c55e' }} />;
      case 'warning':
        return <AlertTriangle style={{ width: 14, height: 14, color: '#f59e0b' }} />;
      case 'offline':
        return <XCircle style={{ width: 14, height: 14, color: '#ef4444' }} />;
      default:
        return null;
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'grey.50',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          🟢 服务状态监测
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ borderRadius: 1 }}
          >
            <RefreshCw
              style={{
                width: 16,
                height: 16,
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </IconButton>
          <Typography variant="caption" color="grey.600">
            {onlineCount}在线 {warningCount > 0 && `| ${warningCount}异常`}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 1,
        }}
      >
        {services.map((service) => (
          <Box
            key={service.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              p: 0.5,
              borderRadius: 1,
              bgcolor: service.status === 'warning' ? 'warning.light' : 'transparent',
            }}
          >
            {getStatusIcon(service.status)}
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              {service.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
```

- [ ] **Step 2: 验证组件**

```bash
cd apps/web && npm run dev
```

Expected: 服务状态监测组件正常显示，自动刷新功能正常

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/layout/ServiceMonitor.tsx
git commit -m "feat(layout): add ServiceMonitor component"
```

---

## Task 4: 公共组件开发 - TreeView

**Files:**
- Create: `apps/web/src/components/common/TreeView.tsx`

- [ ] **Step 1: 创建树状目录组件**

```tsx
// apps/web/src/components/common/TreeView.tsx

import React, { useState } from 'react';
import { Box, Typography, IconButton, Collapse } from '@mui/material';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';

interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  badge?: string | number;
  disabled?: boolean;
}

interface TreeViewProps {
  data: TreeNode[];
  selected?: string;
  expanded?: string[];
  onSelect?: (node: TreeNode) => void;
  onExpand?: (nodeId: string) => void;
  density?: 'compact' | 'normal' | 'comfortable';
}

export const TreeView: React.FC<TreeViewProps> = ({
  data,
  selected,
  expanded = [],
  onSelect,
  onExpand,
  density = 'normal',
}) => {
  const [localExpanded, setLocalExpanded] = useState<string[]>(expanded);

  const handleExpand = (nodeId: string) => {
    const newExpanded = localExpanded.includes(nodeId)
      ? localExpanded.filter(id => id !== nodeId)
      : [...localExpanded, nodeId];
    setLocalExpanded(newExpanded);
    onExpand?.(nodeId);
  };

  const handleSelect = (node: TreeNode) => {
    if (!node.disabled) {
      onSelect?.(node);
    }
  };

  const densityStyles = {
    compact: { py: 0.5, fontSize: '0.75rem' },
    normal: { py: 1, fontSize: '0.875rem' },
    comfortable: { py: 1.5, fontSize: '1rem' },
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = localExpanded.includes(node.id);
    const isSelected = selected === node.id;

    return (
      <Box key={node.id}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pl: level * 2,
            py: densityStyles[density].py,
            cursor: node.disabled ? 'default' : 'pointer',
            bgcolor: isSelected ? 'primary.light' : 'transparent',
            borderRadius: 1,
            transition: 'background-color 0.2s',
            '&:hover': {
              bgcolor: node.disabled ? 'transparent' : 'action.hover',
            },
          }}
          onClick={() => handleSelect(node)}
        >
          {hasChildren && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown style={{ width: 16, height: 16 }} />
              ) : (
                <ChevronRight style={{ width: 16, height: 16 }} />
              )}
            </IconButton>
          )}

          {!hasChildren && (
            <Box sx={{ width: 24, display: 'flex', alignItems: 'center' }}>
              {node.icon || <File style={{ width: 16, height: 16, color: 'grey.500' }} />}
            </Box>
          )}

          {hasChildren && (
            node.icon || <Folder style={{ width: 16, height: 16, color: 'primary.main' }} />
          )}

          <Typography
            sx={{
              fontSize: densityStyles[density].fontSize,
              color: node.disabled ? 'grey.400' : 'text.primary',
              fontWeight: isSelected ? 600 : 400,
            }}
          >
            {node.label}
          </Typography>

          {node.badge && (
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.25,
                bgcolor: 'primary.main',
                color: 'white',
                borderRadius: 1,
                fontSize: '0.75rem',
              }}
            >
              {node.badge}
            </Typography>
          )}
        </Box>

        {hasChildren && (
          <Collapse in={isExpanded}>
            {node.children!.map(child => renderNode(child, level + 1))}
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ py: 1 }}>
      {data.map(node => renderNode(node))}
    </Box>
  );
};
```

- [ ] **Step 2: 验证组件**

```bash
cd apps/web && npm run dev
```

Expected: TreeView组件正常显示，展开/折叠、选择功能正常

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/common/TreeView.tsx
git commit -m "feat(common): add TreeView component"
```

---

## Task 5: 公共组件开发 - ProgressBar

**Files:**
- Create: `apps/web/src/components/common/ProgressBar.tsx`

- [ ] **Step 1: 创建进度条组件**

```tsx
// apps/web/src/components/common/ProgressBar.tsx

import React from 'react';
import { Box, Typography, LinearProgress, CircularProgress } from '@mui/material';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'linear' | 'circular' | 'segmented';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  striped?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
  variant = 'linear',
  color = 'primary',
  size = 'medium',
  animated = false,
  striped = false,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeStyles = {
    small: { height: 4, circularSize: 32 },
    medium: { height: 8, circularSize: 48 },
    large: { height: 12, circularSize: 64 },
  };

  const gradientColors = {
    primary: 'linear-gradient(90deg, #3b82f6, #2563eb)',
    success: 'linear-gradient(90deg, #22c55e, #16a34a)',
    warning: 'linear-gradient(90deg, #f59e0b, #d97706)',
    error: 'linear-gradient(90deg, #ef4444, #dc2626)',
    gradient: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
  };

  if (variant === 'circular') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={percentage}
            size={sizeStyles[size].circularSize}
            sx={{
              color: color === 'gradient' ? 'primary.main' : `${color}.main`,
            }}
          />
          {showValue && (
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" fontWeight={600}>
                {Math.round(percentage)}%
              </Typography>
            </Box>
          )}
        </Box>
        {label && <Typography variant="body2">{label}</Typography>}
      </Box>
    );
  }

  if (variant === 'segmented') {
    const segments = 5;
    const filledSegments = Math.round(percentage / (100 / segments));

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {label && <Typography variant="body2">{label}</Typography>}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {Array.from({ length: segments }).map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 20,
                height: sizeStyles[size].height,
                borderRadius: 1,
                bgcolor: index < filledSegments ? gradientColors[color] : 'grey.200',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </Box>
        {showValue && (
          <Typography variant="caption" fontWeight={600}>
            {Math.round(percentage)}%
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      {label && <Typography variant="body2" sx={{ minWidth: 80 }}>{label}</Typography>}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height: sizeStyles[size].height,
            borderRadius: sizeStyles[size].height / 2,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: sizeStyles[size].height / 2,
              background: gradientColors[color],
              animation: animated ? 'pulse 2s infinite' : 'none',
              backgroundImage: striped
                ? 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)'
                : 'none',
              backgroundSize: striped ? '40px 40px' : 'auto',
            },
          }}
        />
      </Box>
      {showValue && (
        <Typography variant="caption" fontWeight={600} sx={{ minWidth: 40 }}>
          {Math.round(percentage)}%
        </Typography>
      )}
    </Box>
  );
};
```

- [ ] **Step 2: 验证组件**

```bash
cd apps/web && npm run dev
```

Expected: ProgressBar组件正常显示，linear、circular、segmented三种变体正常

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/common/ProgressBar.tsx
git commit -m "feat(common): add ProgressBar component with gradient support"
```

---

## Task 6: 公共组件开发 - Stepper

**Files:**
- Create: `apps/web/src/components/common/Stepper.tsx`

- [ ] **Step 1: 创建步骤器组件**

```tsx
// apps/web/src/components/common/Stepper.tsx

import React from 'react';
import { Box, Typography, Step, StepLabel, Stepper as MuiStepper } from '@mui/material';
import { Check, AlertCircle } from 'lucide-react';

interface StepItem {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'pending' | 'active' | 'completed' | 'error';
}

interface StepperProps {
  steps: StepItem[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'outlined' | 'gradient';
  showLabels?: boolean;
  showDescriptions?: boolean;
  onStepClick?: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  activeStep,
  orientation = 'horizontal',
  variant = 'gradient',
  showLabels = true,
  showDescriptions = false,
  onStepClick,
}) => {
  const getStepIcon = (index: number, status?: string) => {
    switch (status) {
      case 'completed':
        return <Check style={{ width: 20, height: 20, color: '#22c55e' }} />;
      case 'error':
        return <AlertCircle style={{ width: 20, height: 20, color: '#ef4444' }} />;
      case 'active':
        return (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
            }}
          >
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
              {index + 1}
            </Typography>
          </Box>
        );
      default:
        return (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {index + 1}
            </Typography>
          </Box>
        );
    }
  };

  return (
    <MuiStepper
      activeStep={activeStep}
      orientation={orientation}
      sx={{
        '& .MuiStepConnector-line': {
          borderColor: variant === 'gradient' ? 'transparent' : 'grey.300',
          background: variant === 'gradient'
            ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
            : 'grey.300',
          minHeight: orientation === 'horizontal' ? 3 : 40,
        },
      }}
    >
      {steps.map((step, index) => (
        <Step
          key={step.label}
          completed={step.status === 'completed'}
          active={step.status === 'active'}
          onClick={() => onStepClick?.(index)}
          sx={{ cursor: onStepClick ? 'pointer' : 'default' }}
        >
          <StepLabel
            StepIconComponent={() => getStepIcon(index, step.status)}
            sx={{
              '& .MuiStepLabel-label': {
                fontWeight: step.status === 'active' ? 600 : 400,
                color: step.status === 'error' ? 'error.main' : 'text.primary',
              },
            }}
          >
            {showLabels && step.label}
            {showDescriptions && step.description && (
              <Typography variant="caption" color="grey.500">
                {step.description}
              </Typography>
            )}
          </StepLabel>
        </Step>
      ))}
    </MuiStepper>
  );
};
```

- [ ] **Step 2: 验证组件**

```bash
cd apps/web && npm run dev
```

Expected: Stepper组件正常显示，步骤切换功能正常

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/common/Stepper.tsx
git commit -m "feat(common): add Stepper component with gradient variant"
```

---

## Task 7: 渐变颜色系统配置

**Files:**
- Create: `apps/web/src/theme/gradients.ts`
- Modify: `apps/web/src/theme/theme.ts`

- [ ] **Step 1: 创建渐变颜色配置**

```typescript
// apps/web/src/theme/gradients.ts

export const gradients = {
  // 主色调渐变
  primary: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  secondary: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  success: 'linear-gradient(135deg, #22c55e, #16a34a)',
  warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
  error: 'linear-gradient(135deg, #ef4444, #dc2626)',
  info: 'linear-gradient(135deg, #0ea5e9, #0284c7)',

  // 模块专属渐变
  modules: {
    hrm: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    crm: 'linear-gradient(135deg, #22c55e, #4ade80)',
    pm: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    finance: 'linear-gradient(135deg, #6366f1, #818cf8)',
    flow: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
    bi: 'linear-gradient(135deg, #ec4899, #f472b6)',
    gis: 'linear-gradient(135deg, #10b981, #34d399)',
    im: 'linear-gradient(135deg, #f43f5e, #fb7185)',
    lims: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
    rs: 'linear-gradient(135deg, #f97316, #fb923c)',
    qms: 'linear-gradient(135deg, #6366f1, #818cf8)',
    ehs: 'linear-gradient(135deg, #ef4444, #f87171)',
    srm: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    pdm: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    iam: 'linear-gradient(135deg, #374151, #4b5563)',
  },

  // 背景渐变
  backgrounds: {
    page: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)',
    card: 'linear-gradient(to bottom, #ffffff, #fafafa)',
    dark: 'linear-gradient(to bottom right, #111827, #1f2937)',
    header: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
  },

  // 过渡色
  transitions: {
    blueToGreen: '#4ade80',
    greenToOrange: '#fbbf24',
    orangeToPurple: '#818cf8',
    purpleToBlue: '#60a5fa',
  },
};

export type GradientKey = keyof typeof gradients;
export type ModuleGradientKey = keyof typeof gradients.modules;
```

- [ ] **Step 2: 更新主题配置**

修改 `apps/web/src/theme/theme.ts`，添加渐变配置：

```typescript
// apps/web/src/theme/theme.ts

import { createTheme, Theme } from '@mui/material/styles';
import { gradients } from './gradients';

// ... 原有配置

declare module '@mui/material/styles' {
  interface Theme {
    gradients: typeof gradients;
  }
  interface ThemeOptions {
    gradients?: typeof gradients;
  }
}

export const createCustomTheme = (mode: PaletteMode): Theme => {
  return createTheme({
    // ... 原有配置
    gradients,
  });
};
```

- [ ] **Step 3: 验证渐变配置**

```bash
cd apps/web && npm run dev
```

Expected: 渐变颜色配置正常加载，组件可使用渐变

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/theme/gradients.ts apps/web/src/theme/theme.ts
git commit -m "feat(theme): add gradient color system"
```

---

## Task 8: 首页更新

**Files:**
- Modify: `apps/web/src/pages/DashboardPage.tsx`
- Create: `apps/web/src/components/dashboard/DashboardSections.tsx`

- [ ] **Step 1: 创建首页分区组件**

```tsx
// apps/web/src/components/dashboard/DashboardSections.tsx

import React from 'react';
import { Box, Typography, Paper, Collapse, IconButton } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DashboardSectionProps {
  title: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  icon,
  collapsible = false,
  defaultExpanded = true,
  children,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <Paper
      sx={{
        mb: 3,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          bgcolor: 'grey.50',
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={() => collapsible && setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        {collapsible && (
          <IconButton size="small">
            {expanded ? (
              <ChevronUp style={{ width: 20, height: 20 }} />
            ) : (
              <ChevronDown style={{ width: 20, height: 20 }} />
            )}
          </IconButton>
        )}
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
};
```

- [ ] **Step 2: 更新首页布局**

修改 `apps/web/src/pages/DashboardPage.tsx`，使用分区组件：

```tsx
// 在 DashboardPage.tsx 中添加

import { DashboardSection } from '../components/dashboard/DashboardSections';
import { ServiceMonitor } from '../components/layout/ServiceMonitor';

// ... 在渲染部分

<Box sx={{ mb: 4 }}>
  <DashboardSection title="📊 今日概览" collapsible={false}>
    {/* 统计卡片 */}
  </DashboardSection>

  <DashboardSection title="🚀 快捷入口" collapsible={true} defaultExpanded={true}>
    {/* 快捷入口 */}
  </DashboardSection>

  <DashboardSection title="📋 待办事项" collapsible={false}>
    {/* 待办Tab */}
  </DashboardSection>

  <DashboardSection title="🏢 模块导航" collapsible={true} defaultExpanded={true}>
    {/* 模块导航卡片 */}
  </DashboardSection>

  <ServiceMonitor services={serviceStatusList} onRefresh={checkAllServicesStatus} />

  <DashboardSection title="📈 最近活动" collapsible={true} defaultExpanded={false}>
    {/* 最近活动 */}
  </DashboardSection>
</Box>
```

- [ ] **Step 3: 验证首页更新**

```bash
cd apps/web && npm run dev
```

Expected: 首页分区布局正常，服务状态监测显示在模块导航下方

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/components/dashboard/DashboardSections.tsx apps/web/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): update dashboard with section layout and service monitor"
```

---

## Task 9: 响应式适配

**Files:**
- Create: `apps/web/src/hooks/useResponsive.ts`
- Create: `apps/web/src/components/responsive/ResponsiveHeader.tsx`
- Modify: `apps/web/src/components/layout/TopNav.tsx`

- [ ] **Step 1: 创建响应式Hook**

```typescript
// apps/web/src/hooks/useResponsive.ts

import { useMediaQuery, useTheme } from '@mui/material';

export const useResponsive = () => {
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
};
```

- [ ] **Step 2: 创建响应式Header**

```tsx
// apps/web/src/components/responsive/ResponsiveHeader.tsx

import React from 'react';
import { AppBar, Box, IconButton, Drawer, Typography } from '@mui/material';
import { Menu, Bell, Sun, Moon, User } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { TopNav } from '../layout/TopNav';

interface ResponsiveHeaderProps {
  onThemeToggle: () => void;
  themeMode: 'light' | 'dark';
}

export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({
  onThemeToggle,
  themeMode,
}) => {
  const { isMobile } = useResponsive();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (isMobile) {
    return (
      <AppBar position="sticky" sx={{ bgcolor: 'background.paper', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
          <IconButton onClick={() => setDrawerOpen(true)}>
            <Menu style={{ width: 24, height: 24 }} />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>TOPEMS</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={onThemeToggle}>
              {themeMode === 'dark' ? <Sun /> : <Moon />}
            </IconButton>
            <IconButton><Bell /></IconButton>
            <IconButton><User /></IconButton>
          </Box>
        </Box>

        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {/* 移动端导航菜单 */}
        </Drawer>
      </AppBar>
    );
  }

  return <TopNav onThemeToggle={onThemeToggle} themeMode={themeMode} />;
};
```

- [ ] **Step 3: 更新TopNav组件**

修改 `apps/web/src/components/layout/TopNav.tsx`，添加响应式支持：

```tsx
// 在 TopNav.tsx 中添加

import { useResponsive } from '../../hooks/useResponsive';

// 在组件内部

const { isDesktop, isTablet } = useResponsive();

// 根据断点调整导航显示
const visibleNavItems = isDesktop
  ? navItems
  : navItems.slice(0, 5); // 平板端只显示前5个
```

- [ ] **Step 4: 验证响应式**

```bash
cd apps/web && npm run dev
```

Expected: 桌面端完整导航，平板端折叠导航，移动端汉堡菜单

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/hooks/useResponsive.ts apps/web/src/components/responsive/ResponsiveHeader.tsx apps/web/src/components/layout/TopNav.tsx
git commit -m "feat(responsive): add responsive header and navigation"
```

---

## Task 10: 组件导出整理

**Files:**
- Create: `apps/web/src/components/index.ts`

- [ ] **Step 1: 创建组件导出文件**

```typescript
// apps/web/src/components/index.ts

// Layout components
export { TopNav } from './layout/TopNav';
export { ModuleTabs } from './layout/ModuleTabs';
export { PageHeader } from './layout/PageHeader';
export { PageBreadcrumb } from './layout/PageBreadcrumb';
export { ServiceMonitor } from './layout/ServiceMonitor';
export { GlobalLayout } from './layout/GlobalLayout';

// Common components
export { TreeView } from './common/TreeView';
export { ProgressBar } from './common/ProgressBar';
export { Stepper } from './common/Stepper';
export { HelpButton } from './common/HelpButton';
export { EmptyState } from './common/EmptyState';
export { LoadingState } from './common/LoadingState';
export { StatusBadge } from './common/StatusBadge';
export { FilterBar } from './common/FilterBar';
export { ActionBar } from './common/ActionBar';
export { ConfirmDialog } from './common/ConfirmDialog';
export { NotificationToast } from './common/NotificationToast';

// Dashboard components
export { DashboardSection } from './dashboard/DashboardSections';
export { MetricCard } from './dashboard/MetricCard';
export { ModuleCard } from './dashboard/ModuleCard';

// Responsive components
export { ResponsiveHeader } from './responsive/ResponsiveHeader';

// Type exports
export type { TreeNode } from './common/TreeView';
export type { ProgressBarProps } from './common/ProgressBar';
export type { StepItem } from './common/Stepper';
```

- [ ] **Step 2: 验证导出**

```bash
cd apps/web && npm run dev
```

Expected: 所有组件正常导出，无导入错误

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/index.ts
git commit -m "feat(components): create unified component exports"
```

---

## 实施完成检查

- [ ] 所有导航配置更新完成
- [ ] 页面头部组件可用
- [ ] 服务状态监测组件可用
- [ ] TreeView组件可用
- [ ] ProgressBar组件可用
- [ ] Stepper组件可用
- [ ] 渐变颜色系统配置完成
- [ ] 首页分区布局更新完成
- [ ] 响应式适配完成
- [ ] 组件导出整理完成

---

**实施计划完成。**