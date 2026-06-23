# 权限与导航整体设计方案

## 一、导航架构总览

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Header 顶部导航                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐   │
│  │ 首页 │ │ 人力 │ │ 客户 │ │ 项目 │ │ 数据 │ │   更多... │   │
│  └──────┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──────────┘   │
│              │        │        │        │                      │
│              ▼        ▼        ▼        ▼                      │
│        ┌──────────────────────────────────────────┐            │
│        │         二级菜单（分组）                   │            │
│        │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │            │
│        │  │人事管理  │ │组织管理  │ │考勤管理  │  │            │
│        │  └────┬─────┘ └────┬─────┘ └────┬─────┘  │            │
│        │       │            │            │         │            │
│        │       ▼            ▼            ▼         │            │
│        │  ┌──────────────────────────────────┐     │            │
│        │  │         三级菜单（页面）           │     │            │
│        │  │ 员工列表 │ 合同管理 │ 公司管理 │ ...  │     │            │
│        │  └──────────────────────────────────┘     │            │
│        └──────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      页面内容区域                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  模块Tab（如：概览 / 员工 / 部门 / 考勤 / ...）         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                       │   │
│  │              页面主体内容                               │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 导航层级定义

| 层级 | 名称 | 位置 | 作用 |
|------|------|------|------|
| **L1** | 顶部导航 | Header | 模块入口，一级分类 |
| **L2** | 分组菜单 | 下拉菜单 | 功能分组，二级分类 |
| **L3** | 页面菜单 | 下拉菜单 | 具体页面，最终入口 |
| **L4** | 模块Tab | 页面顶部 | 模块内快捷切换 |

---

## 二、完整菜单结构（三级）

### 2.1 HRM 人力资源模块

```
人力 (hrm:read)
├── 概览                    → /hrm
├── 人事管理
│   ├── 员工列表            → /hrm/employees
│   ├── 员工详情            → /hrm/employees/{id}
│   ├── 合同管理            → /hrm/contracts
│   └── 合同详情            → /hrm/contracts/{id}
├── 组织管理
│   ├── 公司管理            → /hrm/companies
│   ├── 公司详情            → /hrm/companies/{id}
│   ├── 部门管理            → /hrm/departments
│   ├── 部门详情            → /hrm/departments/{id}
│   ├── 岗位管理            → /hrm/positions
│   └── 岗位详情            → /hrm/positions/{id}
├── 考勤管理
│   ├── 考勤记录            → /hrm/attendance
│   ├── 考勤详情            → /hrm/attendance/{id}
│   ├── 请假管理            → /hrm/leave
│   └── 请假详情            → /hrm/leave/{id}
├── 薪酬绩效
│   ├── 薪酬管理            → /hrm/payroll
│   ├── 薪酬详情            → /hrm/payroll/{id}
│   ├── 绩效管理            → /hrm/performance
│   └── 绩效详情            → /hrm/performance/{id}
└── 人才发展
    ├── 招聘管理            → /hrm/recruitment
    ├── 招聘详情            → /hrm/recruitment/{id}
    ├── 培训管理            → /hrm/training
    └── 培训详情            → /hrm/training/{id}
```

### 2.2 CRM 客户关系模块

```
客户 (crm:read)
├── 概览                    → /crm
├── 客户关系
│   ├── 客户列表            → /crm/customers
│   ├── 客户详情            → /crm/customers/{id}
│   ├── 商机列表            → /crm/opportunities
│   ├── 商机详情            → /crm/opportunities/{id}
│   ├── 联系人              → /crm/contacts
│   └── 交互记录            → /crm/interactions
└── 销售分析
    ├── 客户评分            → /crm/scoring
    ├── 销售预测            → /crm/forecast
    └── 计费管理            → /crm/billing
```

### 2.3 PM 项目管理模块

```
项目 (pm:read)
├── 概览                    → /pm
├── 项目管理
│   ├── 项目列表            → /pm/projects
│   └── 项目详情            → /pm/projects/{id}
└── 合同与报表
    ├── 合同列表            → /pm/contracts
    ├── 合同详情            → /pm/contracts/{id}
    ├── 模板库              → /pm/templates
    └── 项目报表            → /pm/reports
```

### 2.4 BI 数据分析模块

```
数据 (bi:read)
├── 概览                    → /bi/dashboard
├── 数据可视化
│   ├── 分析仪表盘          → /bi/dashboard
│   ├── 报表中心            → /bi/reports
│   └── 可视化编辑          → /bi/visualizations
└── 数据管理
    ├── 数据源              → /bi/datasources
    └── 对比分析            → /bi/comparison
```

### 2.5 运营管理模块

```
运营 (erp:read)
├── 概览                    → /assets
├── 资产设备
│   ├── 资产台账            → /assets
│   └── 设备管理            → /equipment
└── 行政综合
    ├── 行政管理            → /administration
    ├── 办公用品            → /office-supplies
    ├── 车辆管理            → /vehicles
    └── 会议室              → /meeting-rooms
```

### 2.6 工作流模块

```
工作流 (workflow:read)
├── 概览                    → /flow
├── 流程审批
│   ├── 审批中心            → /flow/approvals
│   ├── 实例管理            → /flow/instances
│   └── 版本历史            → /flow/history
└── 流程统计
    ├── 流程设计器          → /workflow-designer
    └── 流程统计            → /flow/statistics
```

### 2.7 协作模块

```
协作 (im:read / doc:read / ai:read)
├── 概览                    → /im
├── 沟通协作
│   ├── 即时通讯            → /im
│   ├── 邮件                → /mail
│   └── 文件管理            → /docs
└── AI助手
    ├── AI助手              → /ai
    └── 知识库              → /knowledge-base
```

### 2.8 更多模块

```
更多
├── 研发创新
│   ├── LIMS               → /lims
│   ├── RS研发             → /rs
│   └── PDM                → /pdm
├── 质量安全
│   ├── QMS                → /qms
│   └── EHS                → /ehs
├── 供应链
│   └── SRM                → /srm
├── 生产
│   ├── MES                → /mes
│   ├── SCM                → /scm
│   └── WMS                → /wms
├── 地理信息
│   └── GIS                → /gis
├── 系统管理 (iam:read)
│   ├── 概览               → /iam
│   ├── 用户管理           → /iam/users
│   ├── 角色管理           → /iam/roles
│   ├── 权限配置           → /iam/permissions
│   ├── 插件市场           → /plugins
│   ├── 通知管理           → /notifications
│   └── 系统集成           → /integration
└── 帮助
    └── 帮助中心           → /help
```

---

## 三、首页入口设计

### 3.1 首页内容结构

```
┌─────────────────────────────────────────────────────────────┐
│                        首页仪表盘                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 欢迎信息    │ │ 快捷操作    │ │ 服务状态    │           │
│  │ 用户问候    │ │ 常用功能入口 │ │ 在线监测    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              模块入口卡片网格                         │   │
│  │  HRM | CRM | PM | BI | 运营 | 工作流 | 协作 | ...   │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 数据统计    │ │ 最近活动    │ │ 待办事项    │           │
│  │ 图表展示    │ │ 操作记录    │ │ 审批任务    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 首页模块卡片配置

| 模块 | 图标 | 路径 | 权限 | 状态 |
|------|------|------|------|------|
| 人力资源 | Users | /hrm | hrm:read | online |
| 客户关系 | Building2 | /crm | crm:read | online |
| 项目管理 | Briefcase | /pm | pm:read | online |
| 数据分析 | BarChart3 | /bi/dashboard | bi:read | online |
| 运营管理 | Package | /assets | erp:read | online |
| 工作流 | Activity | /flow | workflow:read | online |
| 即时通讯 | MessageCircle | /im | im:read | online |
| AI助手 | Brain | /ai | ai:read | new |
| 地理信息 | Map | /gis | gis:read | beta |
| 研发管理 | FlaskConical | /rs | rs:read | plan |
| 质量管理 | Shield | /qms | qms:read | online |
| 系统管理 | Settings | /iam | iam:read | online |

---

## 四、页面Tab导航设计

### 4.1 Tab导航规则

| 规则 | 说明 |
|------|------|
| **显示位置** | 页面顶部，Header下方 |
| **显示条件** | 进入模块页面后自动显示 |
| **固定Tab** | 概览Tab始终固定在首位 |
| **权限过滤** | 根据用户权限动态显示/隐藏 |
| **自定义顺序** | 用户可拖拽调整顺序（可选） |

### 4.2 模块Tab配置表

| 模块 | Tab名称 | 路径 | 权限 |
|------|---------|------|------|
| **HRM** | 概览 | /hrm | hrm:read |
| | 员工 | /hrm/employees | hrm:read |
| | 部门 | /hrm/departments | hrm:read |
| | 岗位 | /hrm/positions | hrm:read |
| | 考勤 | /hrm/attendance | hrm:read |
| | 薪酬 | /hrm/payroll | hrm:read |
| | 绩效 | /hrm/performance | hrm:read |
| | 招聘 | /hrm/recruitment | hrm:read |
| | 培训 | /hrm/training | hrm:read |
| | 合同 | /hrm/contracts | hrm:read |
| **CRM** | 概览 | /crm | crm:read |
| | 客户 | /crm/customers | crm:read |
| | 商机 | /crm/opportunities | crm:read |
| | 联系人 | /crm/contacts | crm:read |
| | 交互 | /crm/interactions | crm:read |
| | 评分 | /crm/scoring | crm:read |
| | 预测 | /crm/forecast | crm:read |
| | 计费 | /crm/billing | crm:read |
| **PM** | 概览 | /pm | pm:read |
| | 项目 | /pm/projects | pm:read |
| | 合同 | /pm/contracts | pm:read |
| | 模板 | /pm/templates | pm:read |
| | 报表 | /pm/reports | pm:read |
| **BI** | 概览 | /bi/dashboard | bi:read |
| | 仪表盘 | /bi/dashboard | bi:read |
| | 报表 | /bi/reports | bi:read |
| | 可视化 | /bi/visualizations | bi:read |
| | 数据源 | /bi/datasources | bi:read |
| | 对比 | /bi/comparison | bi:read |
| **Workflow** | 概览 | /flow | workflow:read |
| | 审批中心 | /flow/approvals | workflow:read |
| | 实例管理 | /flow/instances | workflow:read |
| | 版本历史 | /flow/history | workflow:read |
| | 流程设计器 | /workflow-designer | workflow:write |
| | 流程统计 | /flow/statistics | workflow:read |
| **IAM** | 概览 | /iam | iam:read |
| | 用户管理 | /iam/users | iam:read |
| | 角色管理 | /iam/roles | iam:read |
| | 权限配置 | /iam/permissions | iam:read |
| | 插件市场 | /plugins | iam:read |
| | 通知管理 | /notifications | notification:read |
| | 系统集成 | /integration | integration:read |

---

## 五、面包屑导航设计

### 5.1 面包屑结构规则

```
首页 > 模块概览 > 功能分组 > 页面名称 > 详情ID

示例：
首页 > HRM > 人事管理 > 员工列表 > 张三
首页 > CRM > 客户关系 > 客户列表 > 某公司
```

### 5.2 面包屑组件设计

| 属性 | 类型 | 说明 |
|------|------|------|
| items | BreadcrumbItem[] | 面包屑项列表 |
| showHome | boolean | 是否显示首页图标 |
| homeHref | string | 首页链接 |
| separator | ReactNode | 自定义分隔符 |
| maxItems | number | 最大显示项数 |

### 5.3 面包屑与页面的配合逻辑

```typescript
// 自动生成面包屑（基于路由）
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
const pathSegments = pathname.split('/').filter(Boolean);
const breadcrumbs: BreadcrumbItem[] = [];

// 根据路径映射生成面包屑
const pathMap: Record<string, string> = {
    'hrm': 'HRM',
    'employees': '员工列表',
    'departments': '部门管理',
    // ... 更多映射
};

let currentPath = '';
pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    breadcrumbs.push({
    label: pathMap[segment] || segment,
    href: index < pathSegments.length - 1 ? currentPath : undefined,
    });
});

return breadcrumbs;
};
```

---

## 六、权限与导航的关联

### 6.1 权限过滤机制

```typescript
// 菜单权限过滤
const filterMenuByPermission = (menuItems: NavItem[], permissions: string[]): NavItem[] => {
return menuItems.filter((item) => {
    // 无权限要求的菜单项始终显示
    if (!item.permission) return true;
    
    // 超级管理员拥有所有权限
    if (permissions.includes('all')) return true;
    
    // 检查权限
    return permissions.includes(item.permission);
});
};
```

### 6.2 权限与导航的映射关系

| 权限表达式 | 导航控制 | 说明 |
|-----------|---------|------|
| `{module}:read` | 显示模块入口 | 允许查看模块概览 |
| `{module}:write` | 显示创建/编辑按钮 | 允许修改数据 |
| `{module}:delete` | 显示删除按钮 | 允许删除数据 |
| `{module}:admin` | 显示管理功能 | 完整管理权限 |

### 6.3 模块权限汇总

| 模块 | 权限标识 | 权限名称 |
|------|---------|---------|
| 身份管理 | `iam:*` | 系统管理权限 |
| 人力资源 | `hrm:*` | HRM权限 |
| 客户关系 | `crm:*` | CRM权限 |
| 项目管理 | `pm:*` | PM权限 |
| 数据分析 | `bi:*` | BI权限 |
| 企业资源 | `erp:*` | ERP权限 |
| 工作流 | `workflow:*` | 工作流权限 |
| AI助手 | `ai:*` | AI权限 |
| 地理信息 | `gis:*` | GIS权限 |
| 研发管理 | `rs:*` | RS权限 |
| 质量管理 | `qms:*` | QMS权限 |
| 安全环保 | `ehs:*` | EHS权限 |
| 供应链 | `scm:*` | SCM权限 |
| 生产管理 | `mes:*` | MES权限 |
| 仓储管理 | `wms:*` | WMS权限 |

---

## 七、导航状态管理

### 7.1 导航状态定义

| 状态 | 触发条件 | UI表现 |
|------|---------|--------|
| **选中态** | 当前路径匹配 | 高亮显示，背景色变化 |
| **展开态** | 鼠标悬停/点击 | 显示子菜单 |
| **禁用态** | 无权限 | 灰色显示，不可点击 |
| **激活态** | 当前页面 | 保持展开，高亮显示 |

### 7.2 状态管理逻辑

```typescript
// 选中态判断
const isActive = (path: string): boolean => {
return location.pathname === path || 
        location.pathname.startsWith(path + '/');
};

// 展开态判断
const isExpanded = (code: string): boolean => {
return expandedItems.has(code) || 
        location.pathname.includes(`/${code}/`);
};
```

---

## 八、设计规范检查清单

### 8.1 完整性检查

- [x] 所有模块都有对应的三级菜单结构
- [x] 每个页面都有明确的路由路径
- [x] 权限与菜单一一对应
- [x] 面包屑覆盖所有层级

### 8.2 一致性检查

- [x] 菜单命名统一（如"概览"统一使用）
- [x] 路径格式统一（/模块/功能/详情）
- [x] 权限命名统一（{module}:{action}）
- [x] 状态样式统一

### 8.3 可访问性检查

- [x] 支持键盘导航
- [x] 支持屏幕阅读器
- [x] 响应式布局适配
- [x] 权限过滤后的反馈

---

## 九、代码实现要点

### 9.1 导航注册

```typescript
// NavigationRegistry.ts - 模块注册
navigationRegistry.register("hrm", {
top_nav: [{ code: "hrm", label: "人力", path: "/hrm" }],
module_tabs: [
    { code: "hrm-overview", label: "概览", path: "/hrm", permission: "hrm:read" },
    { code: "hrm-employees", label: "员工", path: "/hrm/employees", permission: "hrm:read" },
    // ...
],
module_card: { code: "hrm", name: "人力资源", icon: "Users", path: "/hrm", status: "online" },
});
```

### 9.2 权限检查钩子

```typescript
// usePermission.ts
export const usePermission = () => {
const { permissions, isSuperuser } = useAuth();

const checkPermission = (permission: string): boolean => {
    if (isSuperuser) return true;
    if (!permission) return true;
    
    // 检查精确权限
    if (permissions.includes(permission)) return true;
    
    // 检查模块级权限继承
    const [module] = permission.split(':');
    if (permissions.includes(`${module}:admin`)) return true;
    
    // 检查权限层级继承
    const actionLevel = getActionLevel(permission.split(':')[1]);
    const modulePermissions = permissions.filter(p => p.startsWith(`${module}:`));
    return modulePermissions.some(p => getActionLevel(p.split(':')[1]) >= actionLevel);
};

return { checkPermission, isSuperuser };
};
```

### 9.3 面包屑生成

```typescript
// BreadcrumbGenerator.ts
export const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
const breadcrumbs: BreadcrumbItem[] = [];
const segments = pathname.split('/').filter(Boolean);

// 首页始终作为第一个面包屑
breadcrumbs.push({ label: '首页', href: '/' });

// 根据路由配置生成面包屑
segments.reduce((currentPath, segment, index) => {
    currentPath += `/${segment}`;
    
    // 查找对应菜单配置
    const menuItem = findMenuItemByPath(currentPath);
    breadcrumbs.push({
    label: menuItem?.label || segment,
    href: index < segments.length - 1 ? currentPath : undefined,
    });
    
    return currentPath;
}, '');

return breadcrumbs;
};
```

---

## 十、总结

### 10.1 架构优势

1. **层次清晰**：四级导航结构（Header→分组→页面→Tab）
2. **权限统一**：基于模块级权限的统一控制
3. **灵活扩展**：插件化的导航注册机制
4. **用户体验**：支持快捷操作、服务状态监测、自定义顺序

### 10.2 待优化项

| 项 | 说明 | 优先级 |
|----|------|--------|
| 快捷方式定制 | 用户可自定义首页快捷入口 | 中 |
| 搜索导航 | 全局搜索菜单和页面 | 中 |
| 导航记忆 | 记住用户展开状态 | 低 |
| 移动端优化 | 移动端专用导航组件 | 中 |

---

**文档版本**: v1.0  
**创建日期**: 2026-06-21  
**适用范围**: TOPEMS 统一权限与