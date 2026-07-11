# TOPEMS 导航与页面布局设计方案

| 项目 | 内容 |
|------|------|
| **文档版本** | v3.1.0 |
| **创建日期** | 2026-06-18 |
| **设计原则** | 动态注册 + 三级导航 + 插件化架构 + 统一设计系统 |
| **状态** | 已完成 |
| **架构适配** | 支持插件化架构、Module Federation 微前端 |

---

## 一、设计目标

1. **动态导航**：支持插件启动时动态注册导航，无需修改主应用
2. **三级导航体系**：Header全局导航、侧边栏模块导航、页面内部导航
3. **插件化适配**：每个插件独立管理自己的导航配置
4. **权限过滤**：导航项根据用户权限动态显示/隐藏
5. **统一布局规范**：页面必须元素、导航关系、响应式适配统一设计
6. **独立部署支持**：插件可独立打包部署为单独产品
7. **NavigationRegistry 唯一数据源**：所有导航配置必须通过 Registry 管理

---

## 二、首页设计

### 2.1 首页布局模式

**采用混合模式（仪表盘 + 模块入口 + 服务监控）：**

| 布局区域 | 功能 | 优先级 |
|----------|------|--------|
| 顶部栏 | Logo、搜索、通知、主题切换、用户头像 | P0 |
| 欢迎语区 | 动态问候语、用户名 | P1 |
| 统计卡片区 | 待审批、待处理、在线用户、文件数量 | P0 |
| 服务监控区 | 实时健康状态、请求数、异常服务 | P0 |
| 模块入口区 | 已安装插件的大图标卡片网格 | P0 |
| 待办事项区 | 审批任务、待处理任务列表 | P1 |

### 2.2 首页分区结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPEMS 企业管理平台                            🔍 搜索  🔔 通知  🌙 主题 👤 │  ← 顶部栏
├─────────────────────────────────────────────────────────────────────────┤
│  👋 欢迎回来，管理员！上午好                                             │  ← 欢迎语
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │  📋     │ │  📝     │ │  👥     │ │  📁     │                   │
│  │ 待审批  │ │ 待处理  │ │ 在线用户 │ │ 文件数量 │                   │
│  │   12    │ │   8     │ │   23    │ │   456   │                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │  ← 统计卡片区
├─────────────────────────────────────────────────────────────────────────┤
│  📊 服务状态监控                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  🟢 健康度: 98.5%    📈 请求: 12,847    ⚠️ 异常: 1 (SRM)         │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ ✅IAM ✅HRM ✅CRM ✅PM ✅ERP ✅Flow ✅AI ✅Doc ✅RS                  │  │
│  │ ✅LIMS ✅QMS ✅EHS ✅GIS ✅IM ✅Mail ✅BI ⚠️SRM ✅PDM               │  │
│  │ ✅MES ✅WMS ✅SCM ✅Portal                                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │  ← 监控区
├─────────────────────────────────────────────────────────────────────────┤
│  🚀 模块导航                                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │    🏢      │ │    👥      │ │    📊      │ │    🔄      │           │
│  │   企业资源 │ │   人力资源 │ │   客户管理 │ │   工作流   │           │
│  │    ERP     │ │    HRM     │ │    CRM     │ │    Flow    │           │
│  │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │    📁      │ │    💬      │ │    🤖      │ │    ⚙️      │           │
│  │   项目管理 │ │   即时通讯 │ │   AI助手   │ │   系统管理 │           │
│  │    PM      │ │    IM      │ │    AI      │ │    IAM     │           │
│  │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │ │   🟢运行中  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │  ← 模块入口区
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │    🧪      │ │    🔧      │ │    🛡️      │ │    📍      │           │
│  │   研发管理 │ │   质量管理 │ │   供应链   │ │   地理信息 │           │
│  │    RS/LIMS │ │    QMS/EHS │ │    SCM/SRM │ │    GIS     │           │
│  │   🟢运行中  │ │   🟢运行中  │ │   ⚠️异常   │ │   🟢运行中  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
├─────────────────────────────────────────────────────────────────────────┤
│  📋 待办事项                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🔄 审批任务: 员工转正审批 (张三)      截止: 今天 18:00              │  │
│  │ 🔄 审批任务: 采购订单审批 (李四)      截止: 今天 17:00              │  │
│  │ 🔄 审批任务: 合同续签审批 (王五)      截止: 明天 10:00              │  │
│  └───────────────────────────────────────────────────────────────────┘  │  ← 待办事项区
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 首页入口简化

将原来的 **6个入口** 简化为 **1个入口**：

| 原入口 | 新入口 | 说明 |
|--------|--------|------|
| `/dashboard` | `/dashboard` | 首页唯一入口 |
| `/dashboard/recent` | 首页内"最近活动"区 | 合并到首页 |
| `/dashboard/shortcuts` | 首页内"快捷入口"区 | 合并到首页 |
| `/dashboard/tasks` | 首页内"待办事项"Tab | 合并到首页 |
| `/dashboard/followups` | 首页内"待办事项"Tab | 合并到首页 |
| `/flow/approvals` | 首页内"待办事项"Tab | 合并到首页 |

### 2.4 统计卡片区设计

四个关键指标卡片：

| 卡片 | 图标 | 数据来源 | 用途 |
|------|------|----------|------|
| 待审批 | ClipboardList | Flow服务 | 待处理的审批任务数 |
| 待处理 | CheckSquare | 各模块汇总 | 待处理的任务总数 |
| 在线用户 | Users | IAM服务 | 当前在线用户数 |
| 文件数量 | FolderOpen | File服务 | 系统文件总数 |

**卡片样式：**
- 圆角：12px
- 背景：白色 + 科技蓝渐变边框
- 悬停效果：轻微上移 + 阴影加深

### 2.5 服务状态监测设计

**位置：** 统计卡片下方，独立区块

**状态指示：**
- ✅ 正常 - 绿色背景 `#22c55e`
- ⚠️ 异常 - 橙色背景 `#f59e0b`，闪烁动画
- ❌ 离线 - 红色背景 `#ef4444`

**监控信息：**
- 健康度百分比
- 今日请求数
- 异常服务数量

**交互功能：**
- 自动刷新（30秒间隔）
- 手动刷新按钮
- 异常服务高亮提示
- 点击服务查看详情

### 2.6 模块入口区设计

模块卡片网格布局：

| 特性 | 说明 |
|------|------|
| 网格布局 | 4列（桌面端），响应式自适应 |
| 卡片尺寸 | 180px × 140px |
| 图标尺寸 | 48px |
| 状态指示 | 卡片底部显示服务状态 |
| 悬停效果 | 放大 + 阴影 + 边框高亮 |
| 动态显示 | 根据插件安装状态显示/隐藏 |

**模块卡片信息：**
- 图标（Lucide图标）
- 模块名称（中文）
- 模块代码（英文缩写）
- 服务状态（运行中/异常/离线）

### 2.7 待办事项区设计

显示待处理的审批任务：

| 字段 | 说明 |
|------|------|
| 类型图标 | 审批、任务、提醒等 |
| 标题 | 任务描述 |
| 关联人 | 相关人员 |
| 截止时间 | 截止日期和时间 |

---

## 三、动态导航注册机制

### 3.1 导航元数据规范

插件通过 `plugin.yaml` 声明导航配置，导航分为两级：

```yaml
navigation:
  top_nav:
    - code: erp
      label: 企业资源
      icon: Building2
      path: /erp
      permission: erp:access
      order: 6
  
  sidebar_nav:
    - code: erp-asset
      label: 资产
      icon: Package
      path: /erp/assets
      permission: erp:asset:read
    - code: erp-finance
      label: 财务
      icon: DollarSign
      path: /erp/finance
      permission: erp:finance:read

  module_tabs:
    - label: 概览
      path: /erp
      icon: LayoutDashboard
    - label: 资产
      path: /erp/assets
      icon: Package
      permission: erp:asset:read
  
  module_card:
    code: erp
    name: 企业资源
    icon: Building2
    path: /erp
    status: online
    order: 6
```

### 3.2 导航数据模型

```typescript
// types/navigation.ts
export interface NavItem {
  code: string;           // 唯一标识
  label: string;          // 显示文本
  icon?: string;          // Lucide 图标名称
  path?: string;          // 路由路径
  permission?: string;    // 权限码
  order?: number;         // 排序
  children?: NavItem[];   // 子导航项
  badge?: number | string; // 徽章
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
}

export interface ModuleCardConfig {
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  status?: 'online' | 'beta' | 'plan' | 'new';
  order?: number;
}

export interface PluginNavConfig {
  top_nav?: NavItem[];       // Header 导航项
  sidebar_nav?: NavItem[];    // 侧边栏导航项
  module_tabs?: NavItem[];   // 模块 Tab
  module_card?: ModuleCardConfig;  // 首页模块卡片
}
```

### 3.3 NavigationRegistry API

```typescript
// lib/NavigationRegistry.ts
class NavigationRegistry {
  // 单例获取
  static getInstance(): NavigationRegistry;

  // 注册插件导航
  register(pluginCode: string, config: PluginNavConfig): void;

  // 注销插件导航
  unregister(pluginCode: string): void;

  // 获取 Header 导航项
  getTopNavItems(): NavItem[];

  // 获取侧边栏导航项
  getSidebarNavItems(pluginCode: string): NavItem[];

  // 获取模块 Tab
  getModuleTabs(pluginCode: string): NavItem[];

  // 获取首页模块卡片
  getModuleCards(): ModuleCardConfig[];

  // 按权限过滤导航项
  getNavItemsByPermission(hasPermission: (perm: string) => boolean): NavItem[];

  // 更新插件状态
  updateModuleStatus(pluginCode: string, status: 'online' | 'beta' | 'plan' | 'new'): void;

  // 事件发射器（导航更新通知）
  emitter: EventEmitter;
}
```

### 3.4 导航注册中心实现

```typescript
// lib/NavigationRegistry.ts
import { EventEmitter } from 'events';

interface NavItem {
  code: string;
  label: string;
  icon?: string;
  path?: string;
  permission?: string;
  order?: number;
  children?: NavItem[];
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
}

interface ModuleCardConfig {
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  status?: 'online' | 'beta' | 'plan' | 'new';
  order?: number;
}

interface PluginNavConfig {
  top_nav?: NavItem[];
  sidebar_nav?: NavItem[];
  module_tabs?: NavItem[];
  module_card?: ModuleCardConfig;
}

class NavigationRegistry {
  private static instance: NavigationRegistry;
  private navItems: Map<string, NavItem[]> = new Map();
  private moduleCards: Map<string, ModuleCardConfig> = new Map();
  private moduleStatuses: Map<string, string> = new Map();
  public emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  static getInstance(): NavigationRegistry {
    if (!NavigationRegistry.instance) {
      NavigationRegistry.instance = new NavigationRegistry();
    }
    return NavigationRegistry.instance;
  }

  register(pluginCode: string, config: PluginNavConfig): void {
    if (config.top_nav) {
      this.navItems.set(`${pluginCode}:top`, config.top_nav);
    }
    if (config.sidebar_nav) {
      this.navItems.set(`${pluginCode}:sidebar`, config.sidebar_nav);
    }
    if (config.module_tabs) {
      this.navItems.set(`${pluginCode}:tabs`, config.module_tabs);
    }
    if (config.module_card) {
      this.moduleCards.set(pluginCode, config.module_card);
      this.moduleStatuses.set(pluginCode, config.module_card.status || 'online');
    }
    this.emitter.emit('navigationUpdated', pluginCode);
  }

  unregister(pluginCode: string): void {
    this.navItems.delete(`${pluginCode}:top`);
    this.navItems.delete(`${pluginCode}:sidebar`);
    this.navItems.delete(`${pluginCode}:tabs`);
    this.moduleCards.delete(pluginCode);
    this.moduleStatuses.delete(pluginCode);
    this.emitter.emit('navigationUpdated', pluginCode);
  }

  getTopNavItems(): NavItem[] {
    const items: NavItem[] = [];
    this.navItems.forEach((navItems, key) => {
      if (key.endsWith(':top')) {
        items.push(...navItems);
      }
    });
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getSidebarNavItems(pluginCode: string): NavItem[] {
    const items = this.navItems.get(`${pluginCode}:sidebar`) || [];
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getModuleTabs(pluginCode: string): NavItem[] | undefined {
    return this.navItems.get(`${pluginCode}:tabs`);
  }

  getModuleCards(): ModuleCardConfig[] {
    return Array.from(this.moduleCards.values())
      .filter(card => this.moduleStatuses.get(card.code) === 'online')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  updateModuleStatus(pluginCode: string, status: 'online' | 'beta' | 'plan' | 'new'): void {
    this.moduleStatuses.set(pluginCode, status);
    const card = this.moduleCards.get(pluginCode);
    if (card) {
      card.status = status;
    }
    this.emitter.emit('navigationUpdated', pluginCode);
  }

  getAllPluginCodes(): string[] {
    const codes = new Set<string>();
    this.navItems.forEach((_, key) => {
      const parts = key.split(':');
      codes.add(parts[0]);
    });
    return Array.from(codes);
  }
}

export const navigationRegistry = NavigationRegistry.getInstance();
```

### 3.5 核心模块导航配置

| 模块 | 路径 | 图标 | 权限 | 排序 |
|------|------|------|------|------|
| **首页** | `/dashboard` | Home | - | 0 |
| **人力** | `/hrm` | Users | hrm:access | 1 |
| **客户** | `/crm` | Users2 | crm:access | 2 |
| **项目** | `/pm` | FolderKanban | pm:access | 3 |
| **工作流** | `/flow` | GitBranch | flow:access | 4 |
| **协作** | `/im` | MessageCircle | im:access | 5 |
| **系统** | `/iam` | Settings | iam:access | 99 |

### 3.6 旧导航配置迁移

| 旧配置 | 新配置 | 说明 |
|--------|--------|------|
| `navigation-v2.ts` | `NavigationRegistry` | 合并到注册中心 |
| `topNavItems` | `registry.getTopNavItems()` | 动态获取 |
| `pluginNavigation` | `registry.register()` | 动态注册 |
| `suiteNavigation` | `registry.register()` | 按套件分组注册 |
| `moduleTabsConfig` | `registry.getModuleTabs()` | 按模块获取 |
| `navigation.ts` | `NavigationRegistry` | 整合所有导航 |
| `routes/v2/*.ts` + `*.nav.ts` | `modules/{module}/config.ts` | 统一配置（V5.8） |

**迁移步骤**：

1. 将静态 `topNavItems` 改为 Registry 注册调用
2. 将 `pluginNavigation` 配置转为 `register()` 调用
3. 删除 `navigation-v2.ts` 或标记为废弃
4. 更新 TopNav 组件使用 Registry
5. 实现 Sidebar 组件使用 `getSidebarNavItems()`

### 3.6.1 统一配置方案（V5.8 路径重构）

> 详细方案见 [路径重构实施方案](../../superpowers/specs/2026-07-11-path-refactor-implementation-plan.md)

**问题**：路径在 3 处重复定义（`routes/v2/*.ts`、`lib/navigation/modules/*.nav.ts`、组件硬编码），导致死链。

**方案**：每个模块合并为 `modules/{module}/config.ts`，路径常量作为唯一真相源。

```typescript
// modules/hrm/config.ts
export const HRM_PATHS = {
  root: '/hrm',
  employees: '/hrm/employees',
  employeeDetail: '/hrm/employees/:id',
} as const;

export const hrmModuleConfig: RouteModuleConfig = { /* routes 引用 HRM_PATHS */ };
export const hrmNavConfig: ModuleNavConfig = { /* navItems 引用 HRM_PATHS */ };
```

**组件引用**：

```typescript
// ✅ 引用路径常量
import { HRM_PATHS } from '@/modules/hrm/config';
navigate(HRM_PATHS.employees);

// ❌ 禁止硬编码
navigate('/hrm/employees');
```

**迁移进度**：hrm 试点完成，剩余 30 个模块分 5 个 Wave 迁移，全部完成后删除 `compatibility.tsx`。

### 3.7 TopNav 组件改造

```tsx
// components/layout/TopNav.tsx
export const TopNav: React.FC = observer(() => {
  const registry = NavigationRegistry.getInstance();
  const [topNavItems, setTopNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const updateNav = () => setTopNavItems(registry.getTopNavItems());
    registry.emitter.on('navigationUpdated', updateNav);
    updateNav();
    return () => registry.emitter.off('navigationUpdated', updateNav);
  }, []);

  return (
    <AppBar position="sticky">
      <Box display="flex" alignItems="center" gap={2}>
        <Box sx={{ width: 36, height: 36, bgcolor: 'primary.main', borderRadius: 1 }}>
          <Building sx={{ color: 'white', width: 20, height: 20 }} />
        </Box>
        <Typography variant="h6" fontWeight={700}>TOPEMS</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {topNavItems.map(item => (
          <NavMenuItem key={item.code} item={item} />
        ))}
      </Box>
    </AppBar>
  );
});
```

### 3.8 Sidebar 组件实现

```tsx
// components/layout/Sidebar.tsx
interface SidebarProps {
  pluginCode: string;
  activePath: string;
}

export const Sidebar: React.FC<SidebarProps> = observer(({ pluginCode, activePath }) => {
  const registry = NavigationRegistry.getInstance();
  const sidebarItems = registry.getSidebarNavItems(pluginCode);

  if (!sidebarItems.length) return null;

  return (
    <Box sx={{ width: 220, borderRight: 1, borderColor: 'divider', p: 1 }}>
      {sidebarItems.map(item => (
        <SidebarNavItem key={item.code} item={item} activePath={activePath} />
      ))}
    </Box>
  );
});
```

### 3.9 插件导航注册流程

```typescript
// 插件入口文件
import { navigationRegistry } from '@topems/shared';

export const pluginManifest = {
  pluginCode: 'hrm',
  name: '人力资源',
  version: '1.0.0',
  navigation: {
    top_nav: [
      { code: 'hrm', label: '人力资源', icon: 'Users', path: '/hrm', order: 1, permission: 'hrm:read' }
    ],
    sidebar_nav: [
      { code: 'hrm-employee', label: '员工管理', icon: 'Users', path: '/hrm/employees' },
      { code: 'hrm-department', label: '部门管理', icon: 'Building', path: '/hrm/departments' }
    ],
    module_tabs: [
      { code: 'hrm-dashboard', label: '仪表盘', path: '/hrm/dashboard', pinned: true },
      { code: 'hrm-employee', label: '员工', path: '/hrm/employees' },
      { code: 'hrm-attendance', label: '考勤', path: '/hrm/attendance' }
    ],
    module_card: {
      code: 'hrm',
      name: '人力资源管理',
      icon: 'Users',
      path: '/hrm',
      status: 'online',
      order: 1
    }
  }
};

// 初始化时注册
navigationRegistry.register('hrm', pluginManifest.navigation);
```

### 3.10 插件导航配置示例

#### ERP 插件

```yaml
navigation:
  top_nav:
    - code: erp
      label: 企业资源
      icon: Building2
      path: /erp
      permission: erp:access
      order: 6
  
  sidebar_nav:
    - code: erp-asset
      label: 资产
      icon: Package
      path: /erp/assets
      permission: erp:asset:read
    - code: erp-finance
      label: 财务
      icon: DollarSign
      path: /erp/finance
      permission: erp:finance:read
    - code: erp-budget
      label: 预算
      icon: PieChart
      path: /erp/budget
      permission: erp:budget:read

  module_tabs:
    - label: 概览
      path: /erp
      icon: LayoutDashboard
    - label: 资产
      path: /erp/assets
      icon: Package
      permission: erp:asset:read
    - label: 财务
      path: /erp/finance
      icon: DollarSign
      permission: erp:finance:read
    - label: 预算
      path: /erp/budget
      icon: PieChart
      permission: erp:budget:read
```

#### 供应链插件

```yaml
navigation:
  top_nav:
    - code: scm
      label: 供应链
      icon: Truck
      path: /scm
      permission: scm:access
      order: 7
  
  sidebar_nav:
    - code: scm-purchasing
      label: 采购
      icon: ShoppingCart
      path: /scm/purchasing
      permission: scm:purchase:read
    - code: scm-inventory
      label: 库存
      icon: Warehouse
      path: /scm/inventory
      permission: scm:inventory:read

  module_tabs:
    - label: 概览
      path: /scm
      icon: LayoutDashboard
    - label: 采购
      path: /scm/purchasing
      icon: ShoppingCart
      permission: scm:purchase:read
    - label: 库存
      path: /scm/inventory
      icon: Warehouse
      permission: scm:inventory:read
```

### 3.11 模块Tab动态渲染

模块Tab由插件通过 `plugin.yaml` 配置，Host 根据权限过滤后渲染：

```tsx
interface ModuleTabsProps {
  pluginCode: string;
  activePath: string;
  onTabChange: (path: string) => void;
}

export const ModuleTabs: React.FC<ModuleTabsProps> = ({ 
  pluginCode, 
  activePath, 
  onTabChange 
}) => {
  const registry = NavigationRegistry.getInstance();
  const tabs = registry.getModuleTabs(pluginCode) || [];
  
  const filteredTabs = tabs.filter(tab => {
    if (!tab.permission) return true;
    return hasPermission(tab.permission);
  });

  if (filteredTabs.length === 0) return null;

  return (
    <Tabs 
      variant="scrollable"
      scrollButtons="auto"
      sx={{ borderBottom: 1, borderColor: 'divider' }}
      value={activePath}
      onChange={(e, value) => onTabChange(value as string)}
    >
      {filteredTabs.map(tab => (
        <Tab 
          key={tab.path} 
          label={tab.label}
          value={tab.path}
        />
      ))}
    </Tabs>
  );
};
```

### 3.6 导航权限过滤机制

所有导航项必须通过权限校验才能显示：

```typescript
const hasPermission = (permissionCode: string): boolean => {
  const userPermissions = useUserPermissions();
  return userPermissions.includes(permissionCode);
};

const getFilteredTopNav = (): NavItem[] => {
  const registry = NavigationRegistry.getInstance();
  const allItems = registry.getTopNavItems();
  return allItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });
};
```

### 3.12 移动端导航 (MobileNav)

移动端使用 Drawer + 汉堡菜单的导航模式。

**文件**：`apps/web/src/components/layout/MobileNav.tsx`

**核心特性**：

| 特性 | 说明 |
|------|------|
| **数据源** | 从 `NavigationRegistry` 动态获取 `top_nav` |
| **事件监听** | 监听 `navigationUpdated` 事件自动更新 |
| **图标映射** | 完整的 Lucide 图标映射表 |
| **响应式** | 仅在 `xs` 到 `lg` 断点显示汉堡菜单 |
| **快捷入口** | 底部提供通知、AI、帮助快捷入口 |

**API 变更**：

| 旧版本 | 新版本 | 说明 |
|--------|--------|------|
| `navItems: NavigationItem[]` | （移除） | 改为内部从 Registry 获取 |
| `open: boolean` | `open: boolean` | 不变 |
| `onClose: () => void` | `onClose: () => void` | 不变 |
| `onOpen: () => void` | `onOpen: () => void` | 不变 |

**使用示例**：

```tsx
// 直接使用，无需传 navItems
<MobileNav
  open={mobileMenuOpen}
  onClose={() => setMobileMenuOpen(false)}
  onOpen={() => setMobileMenuOpen(true)}
/>
```

### 3.13 导航下拉菜单 (NavDropdown)

Hover/Click 触发的下拉导航组件。

**文件**：`apps/web/src/components/layout/NavDropdown.tsx`

**核心特性**：

| 特性 | 说明 |
|------|------|
| **数据模型** | 使用 `NavItem` 类型 |
| **Provider 模式** | 提供 `DropdownProvider` 和 `useDropdown` Hook |
| **多列布局** | 子项自动多列平铺 |
| **鼠标悬停保持** | 进入子菜单区域不立即关闭 |

**API 变更**：

| 旧版本 | 新版本 | 说明 |
|--------|--------|------|
| `NavigationItem` 类型 | `NavItem` 类型 | 统一为 Registry 类型 |
| `isGroup` 字段 | （移除） | 简化为多列平铺 |
| `title` 字段 | `label` 字段 | 与 NavItem 对齐 |

### 3.14 模块布局组件 (ModuleLayout)

整合三级导航的模块页面布局容器。

**文件**：`apps/web/src/components/layout/ModuleLayout.tsx`

**布局结构**：

```
┌─────────────────────────────────────────────────┐
│ Header (L1) - TopNav                            │
├──────────┬──────────────────────────────────────┤
│          │ ModuleTabs (L3)                       │
│ Sidebar  ├──────────────────────────────────────┤
│ (L2)     │ Breadcrumb                            │
│          │ PageHeader                            │
│          ├──────────────────────────────────────┤
│          │                                      │
│          │ Page Content                          │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

**使用示例**：

```tsx
import { ModuleLayout } from '@/components/layout/ModuleLayout';

<ModuleLayout pluginCode="erp">
  <Outlet />
</ModuleLayout>
```

### 3.15 插件生命周期管理 (PluginLifecycleManager)

**文件**：`apps/web/src/lib/PluginLifecycleManager.ts`

**核心职责**：

| 职责 | 说明 |
|------|------|
| 插件加载 | 自动调用 `NavigationRegistry.register()` |
| 插件卸载 | 自动调用 `NavigationRegistry.unregister()` |
| 事件通知 | 通过 `EventEmitter` 通知状态变更 |
| 并发保护 | 避免同一插件重复加载 |

**事件列表**：

| 事件 | 触发时机 |
|------|----------|
| `pluginLoaded` | 插件加载完成 |
| `pluginUnloaded` | 插件卸载完成 |
| `pluginError` | 加载/卸载错误 |
| `pluginNavUpdated` | 导航配置更新 |

---

## 四、页面拆分设计

### 4.1 页面拆分原则

| 原则 | 说明 |
|------|------|
| **一页一功能** | 每个页面只展示一个核心功能 |
| **列表独立** | 列表页独立，不与详情页混合 |
| **详情独立** | 详情页独立，通过Tab组织多维度内容 |
| **表单独立** | 创建/编辑表单独立，不与列表页混合 |
| **仪表盘独立** | 数据仪表盘独立，不与列表页混合 |

### 4.2 页面类型分类

| 类型 | 图标 | 主色调 | 风格特点 | 适用场景 |
|------|------|--------|----------|----------|
| **列表型** | 📋 | 蓝色渐变 | 清爽简洁，数据密集 | 数据列表页 |
| **详情型** | 📄 | 紫色渐变 | 优雅精致，信息丰富 | 详情展示页 |
| **表单型** | 📝 | 绿色渐变 | 专业高效，引导明确 | 创建/编辑页 |
| **仪表盘型** | 📊 | 橙色渐变 | 活力动感，数据驱动 | 数据看板 |
| **特殊交互型** | ⚡ | 红色渐变 | 个性鲜明，交互丰富 | GIS/IM/设计器 |

### 4.3 核心模块页面拆分

#### HRM 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| HRM仪表盘 | `/hrm` | HRM模块概览统计 | 仪表盘型 |
| 员工列表 | `/hrm/employees` | 员工数据列表 | 列表型 |
| 员工详情 | `/hrm/employees/:id` | 单个员工详细信息 | 详情型 |
| 创建员工 | `/hrm/employees/create` | 新建员工表单 | 表单型 |
| 编辑员工 | `/hrm/employees/:id/edit` | 编辑员工表单 | 表单型 |
| 部门列表 | `/hrm/departments` | 部门数据列表 | 列表型 |
| 部门详情 | `/hrm/departments/:id` | 部门详细信息 | 详情型 |
| 岗位列表 | `/hrm/positions` | 岗位数据列表 | 列表型 |
| 公司列表 | `/hrm/companies` | 公司数据列表 | 列表型 |
| 考勤列表 | `/hrm/attendance` | 考勤记录列表 | 列表型 |
| 请假列表 | `/hrm/leave` | 请假记录列表 | 列表型 |
| 薪酬列表 | `/hrm/payroll` | 薪酬记录列表 | 列表型 |
| 绩效列表 | `/hrm/performance` | 绩效记录列表 | 列表型 |
| 招聘列表 | `/hrm/recruitment` | 招聘职位列表 | 列表型 |
| 培训列表 | `/hrm/training` | 培训课程列表 | 列表型 |
| 合同列表 | `/hrm/contracts` | 合同记录列表 | 列表型 |

#### CRM 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| CRM仪表盘 | `/crm` | CRM模块概览统计 | 仪表盘型 |
| 客户列表 | `/crm/customers` | 客户数据列表 | 列表型 |
| 客户详情 | `/crm/customers/:id` | 客户详细信息 | 详情型 |
| 商机列表 | `/crm/opportunities` | 商机数据列表 | 列表型 |
| 联系人列表 | `/crm/contacts` | 联系人数据列表 | 列表型 |
| 交互记录列表 | `/crm/interactions` | 交互记录列表 | 列表型 |
| 客户评分列表 | `/crm/scoring` | 客户评分列表 | 列表型 |
| 销售预测列表 | `/crm/forecast` | 销售预测列表 | 列表型 |

#### PM 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| PM仪表盘 | `/pm` | PM模块概览统计 | 仪表盘型 |
| 项目列表 | `/pm/projects` | 项目数据列表 | 列表型 |
| 项目详情 | `/pm/projects/:id` | 项目详细信息 | 详情型 |
| 创建项目 | `/pm/projects/create` | 新建项目表单 | 表单型 |
| 合同列表 | `/pm/contracts` | 合同数据列表 | 列表型 |
| 合同详情 | `/pm/contracts/:id` | 合同详细信息 | 详情型 |
| 模板列表 | `/pm/templates` | 项目模板列表 | 列表型 |
| 报表列表 | `/pm/reports` | 项目报表列表 | 列表型 |

#### Finance 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| Finance仪表盘 | `/finance` | 财务概览统计 | 仪表盘型 |
| 凭证列表 | `/finance/vouchers` | 凭证数据列表 | 列表型 |
| 应收应付列表 | `/finance/receivable-payable` | 应收应付列表 | 列表型 |
| 预算列表 | `/finance/budget` | 预算数据列表 | 列表型 |
| 固定资产列表 | `/finance/fixed-assets` | 固定资产列表 | 列表型 |
| 银行账户列表 | `/finance/bank-accounts` | 银行账户列表 | 列表型 |

#### Flow 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| Flow仪表盘 | `/flow` | 流程概览统计 | 仪表盘型 |
| 审批列表 | `/flow/approvals` | 待审批列表 | 列表型 |
| 实例列表 | `/flow/instances` | 流程实例列表 | 列表型 |
| 实例详情 | `/flow/instances/:id` | 实例详细信息 | 详情型 |
| 版本历史列表 | `/flow/history` | 版本历史列表 | 列表型 |
| 流程设计器 | `/workflow-designer` | 流程设计编辑器 | 特殊交互型 |
| 流程统计列表 | `/flow/statistics` | 流程统计列表 | 列表型 |

#### 运营模块（ERP）

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| 运营仪表盘 | `/assets` | 运营概览统计 | 仪表盘型 |
| 资产列表 | `/assets` | 资产台账列表 | 列表型 |
| 资产详情 | `/assets/:id` | 资产详细信息 | 详情型 |
| 设备列表 | `/equipment` | 设备管理列表 | 列表型 |
| 设备详情 | `/equipment/:id` | 设备详细信息 | 详情型 |
| 行政管理列表 | `/administration` | 行政管理列表 | 列表型 |
| 办公用品列表 | `/office-supplies` | 办公用品列表 | 列表型 |
| 车辆列表 | `/vehicles` | 车辆管理列表 | 列表型 |
| 会议室列表 | `/meeting-rooms` | 会议室预约列表 | 列表型 |

#### 研发创新模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| LIMS仪表盘 | `/lims` | 实验室概览统计 | 仪表盘型 |
| 样品列表 | `/lims/samples` | 样品管理列表 | 列表型 |
| 样品详情 | `/lims/samples/:id` | 样品详细信息 | 详情型 |
| 检测记录列表 | `/lims/tests` | 检测记录列表 | 列表型 |
| 试剂列表 | `/lims/reagents` | 试剂管理列表 | 列表型 |
| 仪器列表 | `/lims/instruments` | 仪器管理列表 | 列表型 |
| RS仪表盘 | `/rs` | 研发概览统计 | 仪表盘型 |
| 项目列表 | `/rs/projects` | 研发项目列表 | 列表型 |
| 项目详情 | `/rs/projects/:id` | 研发项目详情 | 详情型 |
| 配方列表 | `/rs/formulas` | 配方管理列表 | 列表型 |
| 材料列表 | `/rs/materials` | 材料管理列表 | 列表型 |
| PDM仪表盘 | `/pdm` | 产品数据概览 | 仪表盘型 |
| 产品列表 | `/pdm/products` | 产品管理列表 | 列表型 |
| 产品详情 | `/pdm/products/:id` | 产品详细信息 | 详情型 |

#### 质量安全模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| QMS仪表盘 | `/qms` | 质量概览统计 | 仪表盘型 |
| 质量审核列表 | `/qms/audits` | 质量审核列表 | 列表型 |
| 质量标准列表 | `/qms/standards` | 质量标准列表 | 列表型 |
| 不合格品列表 | `/qms/nonconformances` | 不合格品列表 | 列表型 |
| EHS仪表盘 | `/ehs` | 安全环保概览 | 仪表盘型 |
| 风险评估列表 | `/ehs/risks` | 风险评估列表 | 列表型 |
| 应急预案列表 | `/ehs/emergencies` | 应急预案列表 | 列表型 |
| 安全培训列表 | `/ehs/training` | 安全培训列表 | 列表型 |

#### 供应链模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| SRM仪表盘 | `/srm` | 供应商概览统计 | 仪表盘型 |
| 供应商列表 | `/srm/suppliers` | 供应商管理列表 | 列表型 |
| 供应商详情 | `/srm/suppliers/:id` | 供应商详细信息 | 详情型 |
| 采购订单列表 | `/srm/orders` | 采购订单列表 | 列表型 |

#### GIS模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| GIS仪表盘 | `/gis` | GIS概览统计 | 仪表盘型 |
| 地图监控 | `/gis/map` | 地图实时监控 | 特殊交互型 |
| 设备点位列表 | `/gis/devices` | 设备点位列表 | 列表型 |
| 管线列表 | `/gis/pipelines` | 管线管理列表 | 列表型 |
| 区域列表 | `/gis/areas` | 区域管理列表 | 列表型 |

#### 协作模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| IM仪表盘 | `/im` | 即时通讯概览 | 仪表盘型 |
| 聊天列表 | `/im/chats` | 聊天会话列表 | 列表型 |
| 聊天详情 | `/im/chats/:id` | 聊天会话详情 | 特殊交互型 |
| Mail仪表盘 | `/mail` | 邮件概览统计 | 仪表盘型 |
| 邮件列表 | `/mail/inbox` | 邮件收件箱 | 列表型 |
| 邮件详情 | `/mail/:id` | 邮件详细信息 | 详情型 |
| 写邮件 | `/mail/compose` | 编写邮件表单 | 表单型 |
| Docs仪表盘 | `/docs` | 文件概览统计 | 仪表盘型 |
| 文件列表 | `/docs/files` | 文件管理列表 | 列表型 |
| 文件详情 | `/docs/files/:id` | 文件详细信息 | 详情型 |

#### AI模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| AI仪表盘 | `/ai` | AI概览统计 | 仪表盘型 |
| AI聊天 | `/ai/chat` | AI对话交互 | 特殊交互型 |
| 文档生成列表 | `/ai/documents` | 文档生成列表 | 列表型 |
| 文本分析列表 | `/ai/analysis` | 文本分析列表 | 列表型 |
| 数据补全列表 | `/ai/completion` | 数据补全列表 | 列表型 |
| 编码生成列表 | `/ai/code` | 编码生成列表 | 列表型 |
| 知识库列表 | `/knowledge-base` | 知识库列表 | 列表型 |
| 知识库详情 | `/knowledge-base/:id` | 知识库详情 | 详情型 |

#### 系统管理模块（IAM）

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| IAM仪表盘 | `/iam` | 系统概览统计 | 仪表盘型 |
| 用户列表 | `/iam/users` | 用户管理列表 | 列表型 |
| 用户详情 | `/iam/users/:id` | 用户详细信息 | 详情型 |
| 创建用户 | `/iam/users/create` | 新建用户表单 | 表单型 |
| 编辑用户 | `/iam/users/:id/edit` | 编辑用户表单 | 表单型 |
| 角色列表 | `/iam/roles` | 角色管理列表 | 列表型 |
| 角色详情 | `/iam/roles/:id` | 角色详细信息 | 详情型 |
| 权限列表 | `/iam/permissions` | 权限配置列表 | 列表型 |
| 通知列表 | `/notifications` | 通知管理列表 | 列表型 |
| 集成列表 | `/integration` | 系统集成列表 | 列表型 |

#### 帮助模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| 帮助中心 | `/help` | 帮助中心首页 | 仪表盘型 |
| 使用文档 | `/docs/guide` | 使用文档列表 | 列表型 |
| 文档详情 | `/docs/guide/:id` | 文档详细内容 | 详情型 |

---

### 4.4 页面统计汇总

| 模块 | 仪表盘 | 列表页 | 详情页 | 表单页 | 特殊交互 | 总计 |
|------|--------|--------|--------|--------|----------|------|
| HRM | 1 | 10 | 2 | 2 | 0 | 15 |
| CRM | 1 | 6 | 1 | 0 | 0 | 8 |
| PM | 1 | 4 | 2 | 1 | 0 | 8 |
| Finance | 1 | 5 | 0 | 0 | 0 | 6 |
| Flow | 1 | 4 | 1 | 0 | 1 | 7 |
| 运营(ERP) | 1 | 6 | 2 | 0 | 0 | 9 |
| 研发(LIMS/RS/PDM) | 3 | 9 | 3 | 0 | 0 | 15 |
| 质量(QMS/EHS) | 2 | 7 | 0 | 0 | 0 | 9 |
| 供应链(SRM) | 1 | 2 | 1 | 0 | 0 | 4 |
| GIS | 1 | 3 | 0 | 0 | 1 | 5 |
| 协作(IM/Mail/Docs) | 3 | 5 | 3 | 1 | 1 | 13 |
| AI | 1 | 5 | 1 | 0 | 1 | 8 |
| 系统管理(IAM) | 1 | 6 | 2 | 2 | 0 | 11 |
| 帮助 | 1 | 1 | 1 | 0 | 0 | 3 |
| **总计** | **17** | **68** | **16** | **6** | **3** | **104** |

---

## 五、页面布局统一设计

### 5.1 页面必须元素清单

| 元素 | 类型 | 位置 | 说明 |
|------|------|------|------|
| **返回按钮** | 导航 | 页面头部左侧 | 详情页、表单页必须有 |
| **页面标题** | 信息 | 页面头部中央 | 所有页面必须有 |
| **面包屑** | 导航 | 页面头部上方 | 非首页必须有 |
| **搜索框** | 功能 | 列表页头部 | 列表页必须有 |
| **帮助按钮** | 功能 | 页面头部右侧 | 所有页面必须有 |
| **主题切换** | 功能 | Header右侧 | 全局必须有 |
| **操作按钮组** | 功能 | 页面头部右侧 | 根据页面类型配置 |
| **动态Tab标签页** | 导航 | 页面头部下方 | 插件注册的模块Tab |

### 5.2 插件化页面布局架构

**首页布局：**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOPEMS 企业管理平台                            🔍 搜索  🔔 通知  🌙 主题 👤 │  ← L1: Header全局导航
├─────────────────────────────────────────────────────────────────────────┤
│  👋 欢迎回来，管理员！上午好                                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ 待审批  │ │ 待处理  │ │ 在线用户 │ │ 文件数量 │                   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                   │
├─────────────────────────────────────────────────────────────────────────┤
│  📊 服务状态监控                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🟢健康度: 98.5%  📈请求: 12,847  ⚠️异常: 1 (SRM)                   │  │
│  │ ✅IAM ✅HRM ✅CRM ✅PM ✅ERP ✅Flow ✅AI                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  🚀 模块导航                                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ 企业资源 │ │ 人力资源 │ │ 客户管理 │ │ 工作流   │           │
│  │   ERP     │ │   HRM     │ │   CRM     │ │   Flow    │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
├─────────────────────────────────────────────────────────────────────────┤
│  📋 待办事项                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 审批任务: 员工转正审批 (张三)  截止: 今天 18:00                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**模块内页面布局（侧边栏导航）：**

```
┌──────────────────────────────────────────────────────────────┐
│  TOPEMS 企业管理平台              🔍 搜索  🔔 通知  🌙 主题 👤 │  ← L1: Header全局导航
├──────────────┬───────────────────────────────────────────────┤
│              │  首页 > 企业资源 > 资产台账                   │  ← 面包屑
│              ├───────────────────────────────────────────────┤
│              │  ← 返回    资产台账    🔍 搜索  ➕ 新增  ❓ 帮助 │  ← 页面头部
│              ├───────────────────────────────────────────────┤
│    侧边栏    │                                                │
│    导航      │                                                │
│              │                                                │
│  ┌────────┐  │                                                │
│  │ 🏠 概览│  │                                                │
│  ├────────┤  │                                                │
│  │📦 资产 │  │              页面内容区域                        │  ← 插件页面内容
│  ├────────┤  │                                                │     (Module Federation)
│  │💰 财务 │  │                                                │
│  ├────────┤  │                                                │
│  │📊 预算 │  │                                                │
│  ├────────┤  │                                                │
│  │⚙️ 设置 │  │                                                │
│  └────────┘  │                                                │
│              │                                                │  ← L2: 侧边栏导航
│              │                                                │     (插件注册的模块导航)
└──────────────┴───────────────────────────────────────────────┘
```

### 5.3 三级导航体系

| 级别 | 名称 | 位置 | 功能 | 数据源 |
|------|------|------|------|--------|
| **L1** | Header全局导航 | 页面顶部固定 | 模块间切换、全局功能 | 核心模块 + 插件动态注册 |
| **L2** | 侧边栏导航 | 左侧固定（模块内） | 模块内页面切换 | 插件 `plugin.yaml` 配置 |
| **L3** | 页面内部导航 | 页面内容区 | 详情页Tab、表单步骤等 | 插件页面内部定义 |

### 5.4 侧边栏导航设计

| 特性 | 说明 |
|------|------|
| 宽度 | 220px |
| 固定位置 | 左侧固定 |
| 激活状态 | 科技蓝背景 + 白色文字 |
| 折叠功能 | 支持收起为图标模式 |
| 动态生成 | 根据插件配置生成导航项 |

### 5.4 页面进入逻辑

| 场景 | 进入方式 | 页面状态 |
|------|----------|----------|
| **从Header进入核心模块** | 点击核心菜单 | 进入核心模块仪表盘页 |
| **从Header进入插件** | 点击插件菜单 | 动态加载插件，进入插件仪表盘页 |
| **从Tab进入** | 点击模块Tab | 进入对应列表页，权限过滤 |
| **从列表进入详情** | 点击数据行 | 进入详情页，显示返回按钮 |
| **从详情进入编辑** | 点击编辑按钮 | 进入编辑表单，显示返回按钮 |
| **从列表进入创建** | 点击新建按钮 | 进入创建表单，显示返回按钮 |
| **返回上一页** | 点击返回按钮 | 返回来源页面，保持筛选状态 |

### 5.5 插件动态加载流程

```
用户点击插件菜单项 (如 ERP)
       │
       ▼
  检查插件是否已加载
       │
       ├── 已加载 → 直接导航到 /erp
       │
       └── 未加载 → 动态加载 remoteEntry.js
              │
              ▼
        注册导航元数据
              │
              ▼
        加载插件页面组件
              │
              ▼
        导航到 /erp
```

### 5.6 搜索功能规范

| 页面类型 | 搜索位置 | 搜索范围 |
|----------|----------|----------|
| **列表页** | 页面头部右侧 | 当前列表数据 |
| **全局搜索** | Header搜索框 | 全系统数据（快捷入口） |
| **详情页** | 详情页内Tab | 当前详情页关联数据 |

### 5.7 帮助功能规范

| 帮助类型 | 触发方式 | 内容 |
|----------|----------|------|
| **页面帮助** | 点击❓按钮 | 当前页面使用指南（插件可自定义） |
| **字段帮助** | 字段旁Tooltip | 字段说明 |
| **全局帮助** | Header帮助入口 | 系统帮助中心 |
| **插件帮助** | 插件内帮助入口 | 插件专属帮助文档 |

### 5.8 主题切换规范

| 位置 | 触发方式 | 效果 |
|------|----------|------|
| **Header右侧** | 点击☀️/🌙图标 | 全局主题切换 |
| **自动跟随** | 系统设置 | 跟随系统主题 |
| **记忆保存** | localStorage | 下次访问保持选择 |
| **插件定制** | `plugin.yaml` 配置 | 插件可覆盖主色调 |

---

## 六、响应式设计规范

### 6.1 桌面端布局（≥1200px）

```
┌─────────────────────────────────────────────────────┐
│ Header: 完整导航 + 搜索 + 通知 + 主题 + 用户        │
├─────────────────────────────────────────────────────┤
│ 面包屑 + 页面头部 + Tab                             │
├─────────────────────────────────────────────────────┤
│ 内容区: 多列布局，侧边栏可选                        │
└─────────────────────────────────────────────────────┘
```

**特点：**
- Header完整展示所有导航项
- 模块Tab横向排列
- 列表页支持多列筛选
- 详情页支持主内容+侧边栏双栏布局

### 6.2 平板端布局（768-1199px）

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo + 核心导航 + 更多▼ + 功能按钮          │
├─────────────────────────────────────────────────────┤
│ 面包屑 + 页面头部                                   │
├─────────────────────────────────────────────────────┤
│ Tab: 可滚动                                         │
├─────────────────────────────────────────────────────┤
│ 内容区: 双列布局                                    │
└─────────────────────────────────────────────────────┘
```

**特点：**
- Header折叠部分导航到"更多"菜单
- 模块Tab可横向滚动
- 列表页筛选区折叠
- 详情页单栏布局

### 6.3 移动端布局（<768px）

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo + ☰菜单 + 🔔 + 👤                      │
├─────────────────────────────────────────────────────┤
│ 页面标题 + 操作按钮                                 │
├─────────────────────────────────────────────────────┤
│ 内容区: 单列布局                                    │
├─────────────────────────────────────────────────────┤
│ 底部导航: 首页 │ 消息 │ 我的                        │
└─────────────────────────────────────────────────────┘
```

**特点：**
- Header折叠为汉堡菜单
- 隐藏面包屑和模块Tab
- 列表页筛选区折叠到抽屉
- 详情页全屏展示
- 底部固定导航栏

### 6.4 响应式组件适配

| 组件 | 桌面端 | 平板端 | 移动端 |
|------|--------|--------|--------|
| **Header** | 完整导航 | 折叠导航 | 汉堡菜单 |
| **面包屑** | 完整显示 | 简化显示 | 隐藏 |
| **侧边栏** | 固定显示（220px） | 可折叠 | 抽屉式 |
| **搜索框** | 展开输入 | 展开输入 | 点击图标展开 |
| **筛选栏** | 展开显示 | 折叠显示 | 抽屉显示 |
| **表格** | 多列显示 | 关键列显示 | 卡片列表 |
| **模块卡片** | 4列 | 3列 | 2列 |

---

## 七、柔和渐变颜色系统

### 7.1 主色调渐变

| 颜色名称 | 渐变值 | 用途 |
|----------|--------|------|
| **Primary** | `linear-gradient(135deg, #3b82f6 → #2563eb)` | 品牌色、主要按钮 |
| **Secondary** | `linear-gradient(135deg, #8b5cf6 → #7c3aed)` | 次要操作、详情页 |
| **Success** | `linear-gradient(135deg, #22c55e → #16a34a)` | 成功状态 |
| **Warning** | `linear-gradient(135deg, #f59e0b → #d97706)` | 警告状态 |
| **Error** | `linear-gradient(135deg, #ef4444 → #dc2626)` | 错误状态 |
| **Info** | `linear-gradient(135deg, #0ea5e9 → #0284c7)` | 信息状态 |

### 7.2 模块专属渐变色

| 模块 | 渐变色 | 说明 |
|------|--------|------|
| **HRM** | `linear-gradient(135deg, #3b82f6 → #60a5fa)` | 蓝色系，稳重专业 |
| **CRM** | `linear-gradient(135deg, #22c55e → #4ade80)` | 绿色系，活力增长 |
| **PM** | `linear-gradient(135deg, #f59e0b → #fbbf24)` | 橙色系，项目管理 |
| **Finance** | `linear-gradient(135deg, #6366f1 → #818cf8)` | 紫色系，财务专业 |
| **Flow** | `linear-gradient(135deg, #14b8a6 → #2dd4bf)` | 青色系，流程流转 |
| **BI** | `linear-gradient(135deg, #ec4899 → #f472b6)` | 粉色系，数据分析 |
| **GIS** | `linear-gradient(135deg, #10b981 → #34d399)` | 绿色系，地理空间 |
| **IM** | `linear-gradient(135deg, #f43f5e → #fb7185)` | 红色系，即时通讯 |

### 7.3 背景渐变

| 场景 | 渐变值 |
|------|--------|
| **页面背景** | `linear-gradient(to bottom right, #f8fafc → #f1f5f9)` |
| **卡片背景** | `linear-gradient(to bottom, #ffffff → #fafafa)` |
| **深色背景** | `linear-gradient(to bottom right, #111827 → #1f2937)` |

### 7.4 过渡色系

用于相邻模块间的视觉过渡：

```
HRM(蓝) → CRM(绿): 过渡色 #4ade80 (浅绿)
CRM(绿) → PM(橙): 过渡色 #fbbf24 (浅橙)
PM(橙) → Finance(紫): 过渡色 #818cf8 (浅紫)
```

---

## 八、公共组件设计

### 8.1 树状目录 TreeView

**用途：** 展示层级结构，如组织架构、文件目录、权限树

**组件结构：**
```tsx
interface TreeViewProps {
  data: TreeNode[];
  selected?: string;
  expanded?: string[];
  onSelect?: (node: TreeNode) => void;
  onExpand?: (nodeId: string) => void;
  showIcons?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
}

interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  badge?: string | number;
  disabled?: boolean;
}
```

**视觉设计：**
- 节点展开/折叠动画过渡
- 选中节点高亮渐变背景
- 层级缩进柔和递进
- 图标与文字对齐

### 8.2 进度条 ProgressBar

**用途：** 展示任务进度、流程状态、数据加载

**组件结构：**
```tsx
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'linear' | 'circular' | 'segmented';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  striped?: boolean;
}
```

**视觉设计：**
- 渐变填充色
- 流动动画效果
- 分段进度支持多状态
- 圆形进度带中心数值

### 8.3 甘特图 GanttChart

**用途：** 项目管理、时间规划、任务排期

**组件结构：**
```tsx
interface GanttChartProps {
  tasks: GanttTask[];
  startDate: Date;
  endDate: Date;
  viewMode?: 'day' | 'week' | 'month';
  showDependencies?: boolean;
  showProgress?: boolean;
  onTaskClick?: (task: GanttTask) => void;
  onTaskDrag?: (task: GanttTask, newStart: Date, newEnd: Date) => void;
}

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  color?: string;
  dependencies?: string[];
  assignee?: string;
}
```

**视觉设计：**
- 任务条渐变色
- 时间轴柔和分隔
- 依赖关系连线动画
- 今日线高亮标记

### 8.4 步骤器 Stepper

**用途：** 流程步骤、表单填写进度、审批流程

**组件结构：**
```tsx
interface StepperProps {
  steps: StepItem[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'outlined' | 'gradient';
  showLabels?: boolean;
  showDescriptions?: boolean;
  onStepClick?: (step: number) => void;
}

interface StepItem {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'pending' | 'active' | 'completed' | 'error';
}
```

**视觉设计：**
- 步骤圆点渐变填充
- 连接线柔和过渡
- 当前步骤脉冲动画
- 完成步骤勾选图标

### 8.5 补充公共组件

| 组件 | 用途 | 说明 |
|------|------|------|
| **Timeline** | 时间线 | 展示事件序列、历史记录 |
| **Breadcrumb** | 面包屑 | 页面层级导航 |
| **EmptyState** | 空状态 | 无数据时的友好提示 |
| **LoadingState** | 加载状态 | 数据加载时的骨架屏 |
| **StatusBadge** | 状态徽章 | 多彩状态指示 |
| **MetricCard** | 指标卡片 | 数据统计展示 |
| **FilterBar** | 筛选栏 | 数据筛选组件 |
| **ActionBar** | 操作栏 | 页面操作按钮组 |
| **PageHeader** | 页面头部 | 标题、面包屑、操作区 |
| **ConfirmDialog** | 确认对话框 | 操作确认弹窗 |
| **NotificationToast** | 通知提示 | 操作反馈消息 |

---

## 九、实施计划

### 9.1 阶段规划（与 TODO.md 同步）

| 阶段 | 任务 | 优先级 | 状态 |
|------|------|--------|------|
| **阶段1** | 导航注册中心 | P0 | ✅ 已完成 |
| | - NavigationRegistry 扩展 sidebar_nav | P0 | ✅ |
| | - 添加事件 emitter 支持 | P0 | ✅ |
| | - 实现 getSidebarNavItems() | P0 | ✅ |
| | - 实现 getModuleCards() | P1 | ✅ |
| **阶段2** | Host Shell 基础 | P0 | ✅ 已完成 |
| | - TopNav 组件改造 | P0 | ✅ |
| | - Sidebar 组件实现 | P0 | ✅ |
| | - 页面布局容器 | P0 | ✅ |
| **阶段3** | Module Federation 配置 | P0 | ✅ 已完成 |
| | - Host 配置 | P0 | ✅ |
| | - Core Remote 配置 | P0 | ✅ |
| | - 共享依赖管理 | P1 | ✅ |
| **阶段4** | 插件化UI框架 | P1 | ✅ 已完成 |
| | - 插件路由动态加载 | P1 | ✅ |
| | - 插件主题定制 | P1 | ✅ |
| | - 插件独立部署模式 | P1 | ✅ |
| **阶段5** | 共享设计系统 | P1 | ✅ 已完成 |
| | - shared-components | P1 | ✅ |
| | - design-tokens | P0 | ✅ |
| | - shared-types | P1 | ✅ |
| **阶段6** | 核心模块迁移 | P2 | ✅ 已完成 |
| | - HRM 插件化 | P2 | ✅ |
| | - CRM 插件化 | P2 | ✅ |
| | - ERP/供应链插件化 | P2 | ✅ |
| **阶段7** | 测试与优化 | P2 | ✅ 已完成 |
| | - 端到端测试 | P2 | ✅ |
| | - 性能优化 | P2 | ✅ |
| | - 文档完善 | P2 | ✅ |

### 9.2 迁移检查清单

- [x] NavigationRegistry 是导航唯一数据源
- [x] TopNav 从 Registry 动态读取
- [x] Sidebar 从 Registry 获取 sidebar_nav
- [x] ModuleTabs 从 Registry 获取 module_tabs
- [x] 模块卡片从 Registry 获取 module_card
- [x] 权限过滤正常
- [x] 事件通知正常
- [x] navigation-v2.ts 标记废弃

---

## 十、验收标准

### 10.1 导航验收

- [x] 导航注册中心工作正常
- [x] 插件导航动态注册正常
- [x] 权限过滤功能正常
- [x] 三级导航体系完整（Header + 侧边栏 + 页面内部）
- [x] 侧边栏导航正常
- [x] 导航排序正确

### 10.2 页面布局验收

- [x] 页面必须元素齐全
- [x] 页面进入逻辑正确
- [x] 返回功能正常
- [x] 搜索功能正常
- [x] 帮助功能正常
- [x] 主题切换正常
- [x] 插件动态加载正常

### 10.3 首页混合模式验收

- [x] 顶部栏功能正常（Logo、搜索、通知、主题、用户头像）
- [x] 统计卡片数据正确显示（待审批、待处理、在线用户、文件数量）
- [x] 服务监控实时更新（健康度、请求数、异常服务）
- [x] 模块卡片动态生成（根据插件安装状态显示/隐藏）
- [x] 待办事项列表正常
- [x] 模块卡片悬停效果正常

### 10.4 插件化验收

- [x] Module Federation配置正确
- [x] 共享依赖singleton模式正常
- [x] 插件独立部署模式可用
- [x] 插件主题定制可用
- [x] 插件导航权限控制正常

### 10.5 响应式验收

- [x] 桌面端布局正常
- [x] 平板端布局正常
- [x] 移动端布局正常
- [x] 组件响应式适配

### 10.6 公共组件验收

- [x] TreeView组件可用
- [x] ProgressBar组件可用
- [x] GanttChart组件可用
- [x] Stepper组件可用
- [x] 补充组件可用

---

**文档审批**

| 角色 | 签名 | 日期 |
|------|------|------|
| 前端负责人 | - | 2026-06-24 |
| UI设计师 | - | - |
| QA负责人 | - | - |

---

## 十一、更新记录

| 版本 | 日期 | 更新内容 | 更新人 |
|------|------|---------|--------|
| v3.0.0 | 2026-06-18 | 初始版本，完成导航与页面布局设计方案 | 前端团队 |
| v3.1.0 | 2026-06-25 | 更新实施状态，阶段1-7均已完成，验收通过 | 前端团队 |

---

*本文档由 TOPEMS 前端团队维护*
*版本: v3.1.0*
*最后更新: 2026-06-25*