# TOPEMS Module Federation 架构方案

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v1.0.0 |
| 日期 | 2026-06-17 |
| 状态 | 草稿 |

---

## 一、总体架构

### 1.1 架构愿景

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TOPEMS 产品家族                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    Host (主应用 Shell)                           │   │
│   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│   │  │ 导航   │ │ 认证   │ │ 通知   │ │ 搜索   │ │ 主题   │        │   │
│   │  │ Layout │ │ Auth  │ │ Toast  │ │ Finder │ │ Theme  │        │   │
│   │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                    ┌────────────────┼────────────────┐                  │
│                    │                │                │                  │
│   ┌───────────────▼───┐  ┌────────▼────────┐  ┌──▼──────────────┐  │
│   │   Core Remote     │  │  HRM Remote      │  │  CRM Remote      │  │
│   │   (核心系统)       │  │  (人力资源)       │  │  (客户关系)       │  │
│   │  ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │
│   │  │ 用户/角色    │ │  │ │ 员工管理     │ │  │ │ 客户管理     │ │  │
│   │  │ 组织架构     │ │  │ │ 考勤薪酬     │ │  │ │ 销售机会     │ │  │
│   │  │ 权限        │ │  │ │ 招聘培训     │ │  │ │ 商机跟进     │ │  │
│   │  │ 工作流      │ │  │ └─────────────┘ │  │ └─────────────┘ │  │
│   │  │ 报表        │ │  └─────────────────┘  └─────────────────┘  │
│   │  │ 文件        │ │                                                │
│   │  │ 通知        │ │  ┌───────────────┐  ┌───────────────────┐    │
│   │  └─────────────┘ │  │ PM Remote      │  │  FIN Remote        │    │
│   └──────────────────┘  │ (项目管理)      │  │  (财务)             │    │
│                         └───────────────┘  └───────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
优先级说明：
[P0] 必须 - 无此模块其他模块无法运行
[P1] 核心 - 业务模块强烈依赖
[P2] 可选 - 可独立使用或按需集成
```

| 模块 | 优先级 | 依赖模块 | 说明 |
|------|--------|----------|------|
| Core Auth | P0 | - | 认证、授权、JWT |
| Core Org | P0 | Auth | 组织架构、用户 |
| Core Workflow | P1 | Auth, Org | 工作流引擎 |
| Core Report | P1 | Auth | 报表引擎 |
| Core File | P1 | Auth | 文件管理 |
| Core Notify | P1 | Auth | 通知系统 |
| HRM | P1 | Core全部 | 人力资源 |
| CRM | P1 | Core全部 | 客户关系 |
| PM | P1 | Core全部 | 项目管理 |
| SC | P1 | Core全部 | 供应链 |
| FIN | P1 | Core全部 | 财务管理 |
| QMS | P2 | Core全部 | 质量管理 |
| LIMS | P2 | Core全部 | 实验管理 |
| EHS | P2 | Core全部 | 环境健康 |

### 1.3 部署拓扑

```
                          ┌─────────────────┐
                          │   Nginx/Gateway  │
                          │   (路由分发)     │
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         │    ┌──────────────────▼──┐               ┌──────▼──────┐
         │    │   Host App          │               │  Core API   │
         │    │   (主应用)           │               │  :3001      │
         │    │   :3000             │               └─────────────┘
         │    └──────────┬─────────┘
         │               │ Federation
         │    ┌──────────┴──────────┐
         │    │                     │
         │ ┌──▼────┐  ┌──────┐  ┌──▼────┐  ┌──────┐
         │ │ HRM   │  │ CRM  │  │  PM   │  │ FIN  │
         │ │ Remote│  │Remote│  │Remote │  │Remote│
         │ │ :3002 │  │:3003 │  │ :3004 │  │:3005 │
         │ └───────┘  └──────┘  └───────┘  └──────┘
         │
         │    ┌──────────────────────────────────────┐
         │    │           各模块 API (微服务)         │
         │    │  :4001    :4002    :4003    :4004    │
         │    │  HRM-API  CRM-API  PM-API  FIN-API  │
         │    └──────────────────────────────────────┘
         │
         │    ┌──────────────────────────────────────┐
         │    │           Core API (微服务)           │
         │    │  :4101    :4102    :4103    :4104    │
         │    │  Auth-API Org-API  WF-API  Report-API │
         │    └──────────────────────────────────────┘
         │
         └─────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
               ┌────▼────┐              ┌───────▼──────┐
               │ PostgreSQL │              │   Redis     │
               │  (分库)   │              │  (共享缓存)  │
               └───────────┘              └─────────────┘
```

---

## 二、Module Federation 配置方案

### 2.1 Host 配置 (主应用)

```javascript
// apps/host/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { dependencies } = require('./package.json');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'topems_host',
      filename: 'remoteEntry.js',
      remotes: {
        // 核心模块 - 必须
        topems_core: 'topems_core@http://localhost:3001/remoteEntry.js',
        // 业务模块 - 按需加载
        topems_hrm: 'topems_hrm@http://localhost:3002/remoteEntry.js',
        topems_crm: 'topems_crm@http://localhost:3003/remoteEntry.js',
        topems_pm: 'topems_pm@http://localhost:3004/remoteEntry.js',
        topems_fin: 'topems_fin@http://localhost:3005/remoteEntry.js',
        topems_sc: 'topems_sc@http://localhost:3006/remoteEntry.js',
        topems_qms: 'topems_qms@http://localhost:3007/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: dependencies.react,
          eager: true,  // Auth 模块需要立即加载
        },
        'react-dom': {
          singleton: true,
          requiredVersion: dependencies['react-dom'],
          eager: true,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: dependencies['react-router-dom'],
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: dependencies['@mui/material'],
        },
        '@emotion/react': {
          singleton: true,
          requiredVersion: dependencies['@emotion/react'],
        },
        '@emotion/styled': {
          singleton: true,
          requiredVersion: dependencies['@emotion/styled'],
        },
        axios: {
          singleton: true,
          requiredVersion: dependencies.axios,
        },
        'zustand': {
          singleton: true,
        },
        'i18next': {
          singleton: true,
        },
      },
      exposes: {
        './Layout': './src/bootstrap/Layout',
        './NavMenu': './src/bootstrap/NavMenu',
        './Header': './src/bootstrap/Header',
        './Footer': './src/bootstrap/Footer',
        './ThemeProvider': './src/providers/ThemeProvider',
        './AuthProvider': './src/providers/AuthProvider',
        './NotificationProvider': './src/providers/NotificationProvider',
      },
    }),
  ],
  // 开发模式配置
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
```

### 2.2 Core Remote 配置

```javascript
// apps/core/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { dependencies } = require('./package.json');
const path = require('path');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'topems_core',
      filename: 'remoteEntry.js',
      // Core 不依赖其他远程模块
      remotes: {},
      shared: {
        react: {
          singleton: true,
          requiredVersion: dependencies.react,
          eager: true,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: dependencies['react-dom'],
          eager: true,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: dependencies['react-router-dom'],
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: dependencies['@mui/material'],
        },
        '@emotion/react': {
          singleton: true,
          requiredVersion: dependencies['@emotion/react'],
        },
        axios: {
          singleton: true,
          requiredVersion: dependencies.axios,
        },
        zustand: {
          singleton: true,
        },
        i18next: {
          singleton: true,
        },
      },
      exposes: {
        // API 模块
        './api/auth': './src/api/auth.ts',
        './api/org': './src/api/org.ts',
        './api/workflow': './src/api/workflow.ts',
        './api/file': './src/api/file.ts',
        './api/notify': './src/api/notify.ts',
        './api/report': './src/api/report.ts',
        // 组件
        './components/UserSelect': './src/components/UserSelect',
        './components/OrgTree': './src/components/OrgTree',
        './components/WorkflowDesigner': './src/components/WorkflowDesigner',
        './components/FileUpload': './src/components/FileUpload',
        './components/NotifyBell': './src/components/NotifyBell',
        './components/ReportViewer': './src/components/ReportViewer',
        // Hooks
        './hooks/useAuth': './src/hooks/useAuth.ts',
        './hooks/usePermission': './src/hooks/usePermission.ts',
        './hooks/useOrg': './src/hooks/useOrg.ts',
        './hooks/useWorkflow': './src/hooks/useWorkflow.ts',
        // Store
        './store/authStore': './src/store/authStore.ts',
        './store/orgStore': './src/store/orgStore.ts',
        // 页面片段
        './pages/UserManagement': './src/pages/UserManagement',
        './pages/RoleManagement': './src/pages/RoleManagement',
        './pages/OrgChart': './src/pages/OrgChart',
        './pages/WorkflowList': './src/pages/WorkflowList',
        './pages/FileManager': './src/pages/FileManager',
        './pages/NotifySettings': './src/pages/NotifySettings',
        // 路由配置
        './routes': './src/routes/index.ts',
        './routes/auth': './src/routes/auth.ts',
        './routes/org': './src/routes/org.ts',
        './routes/workflow': './src/routes/workflow.ts',
        // 菜单配置
        './menus/core': './src/config/menus.ts',
        // 类型
        './types/auth': './src/types/auth.ts',
        './types/org': './src/types/org.ts',
      },
    }),
  ],
  devServer: {
    port: 3001,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
```

### 2.3 HRM Remote 配置

```javascript
// apps/hrm/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { dependencies } = require('./package.json');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'topems_hrm',
      filename: 'remoteEntry.js',
      // HRM 依赖 Core 模块
      remotes: {
        topems_core: 'topems_core@http://localhost:3001/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: dependencies.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: dependencies['react-dom'],
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: dependencies['react-router-dom'],
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: dependencies['@mui/material'],
        },
        axios: {
          singleton: true,
          requiredVersion: dependencies.axios,
        },
        zustand: {
          singleton: true,
        },
        i18next: {
          singleton: true,
        },
      },
      exposes: {
        // API
        './api/employee': './src/api/employee.ts',
        './api/attendance': './src/api/attendance.ts',
        './api/payroll': './src/api/payroll.ts',
        './api/recruitment': './src/api/recruitment.ts',
        './api/training': './src/api/training.ts',
        // 组件
        './components/EmployeeTable': './src/components/EmployeeTable',
        './components/AttendanceCalendar': './src/components/AttendanceCalendar',
        './components/PayrollCalculator': './src/components/PayrollCalculator',
        // 页面
        './pages/EmployeeList': './src/pages/EmployeeList',
        './pages/AttendancePage': './src/pages/AttendancePage',
        './pages/PayrollPage': './src/pages/PayrollPage',
        './pages/RecruitmentPage': './src/pages/RecruitmentPage',
        './pages/TrainingPage': './src/pages/TrainingPage',
        // 路由
        './routes': './src/routes/index.ts',
        // 菜单
        './menus/hrm': './src/config/menus.ts',
        // 类型
        './types': './src/types/index.ts',
      },
    }),
  ],
  devServer: {
    port: 3002,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
```

### 2.4 类型共享方案

```typescript
// packages/shared-types/src/index.ts
// 核心类型定义，所有模块共享

// 用户相关
export interface User {
  id: string;
  username: string;
  email: string;
  realName: string;
  avatar?: string;
  phone?: string;
  departmentId: string;
  positionId: string;
  status: 'active' | 'inactive' | 'locked';
  createdAt: string;
  updatedAt: string;
}

// 组织架构
export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  managerId?: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  children?: Department[];
}

export interface Position {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  level: number;
  status: 'active' | 'inactive';
}

// 权限相关
export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  status: 'active' | 'inactive';
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  type: 'menu' | 'button' | 'api';
  resource?: string;
  action?: string;
}

// 工作流相关
export interface WorkflowDefinition {
  id: string;
  name: string;
  code: string;
  version: number;
  status: 'draft' | 'active' | 'disabled';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionVersion: number;
  status: 'running' | 'completed' | 'cancelled';
  currentNodeId: string;
  initiatorId: string;
  variables: Record<string, any>;
  history: WorkflowHistory[];
}

// 通知相关
export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  content: string;
  userId: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

// 文件相关
export interface FileRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  bucket: string;
  folder?: string;
  uploaderId: string;
  createdAt: string;
}

// 通用响应
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 菜单配置
export interface MenuItem {
  id: string;
  path: string;
  name: string;
  icon?: string;
  component?: string;
  children?: MenuItem[];
  permissions?: string[];
  hidden?: boolean;
  external?: boolean;
}
```

---

## 三、Core 模块抽取方案

### 3.1 抽取范围

```
┌─────────────────────────────────────────────────────────┐
│                    Core 模块 (必须抽取)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  1. Auth (认证授权)                              │    │
│  │     - JWT Token 管理                             │    │
│  │     - 登录/登出                                  │    │
│  │     - 密码重置                                   │    │
│  │     - OAuth 集成 (可选)                          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  2. IAM (身份与访问管理)                          │    │
│  │     - 用户 CRUD                                  │    │
│  │     - 角色管理                                   │    │
│  │     - 权限管理                                   │    │
│  │     - 部门管理                                   │    │
│  │     - 岗位管理                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  3. Workflow (工作流引擎)                         │    │
│  │     - 流程定义                                   │    │
│  │     - 流程实例                                   │    │
│  │     - 任务分配                                   │    │
│  │     - 审批处理                                   │    │
│  │     - 会签/或签                                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  4. File (文件管理)                              │    │
│  │     - 上传下载                                   │    │
│  │     - 文件预览                                   │    │
│  │     - 文件夹管理                                 │    │
│  │     - 权限控制                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  5. Notify (通知中心)                           │    │
│  │     - 站内通知                                  │    │
│  │     - 邮件通知                                  │    │
│  │     - 短信通知 (可选)                            │    │
│  │     - WebSocket 推送                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  6. Report (报表引擎)                           │    │
│  │     - 报表设计                                   │    │
│  │     - 数据查询                                   │    │
│  │     - 图表渲染                                   │    │
│  │     - 导出功能                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  7. Dict (字典管理)                              │    │
│  │     - 字典类型                                   │    │
│  │     - 字典数据                                   │    │
│  │     - 缓存管理                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  8. Audit (审计日志)                             │    │
│  │     - 操作日志                                   │    │
│  │     - 登录日志                                   │    │
│  │     - 数据变更日志                                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 目录结构设计

```
topems/
├── apps/
│   ├── host/                    # 主应用 (Shell)
│   │   ├── webpack.config.js
│   │   ├── public/
│   │   └── src/
│   │       ├── bootstrap.tsx    # 动态加载远程模块
│   │       ├── bootstrap/
│   │       │   ├── Layout.tsx
│   │       │   ├── NavMenu.tsx
│   │       │   ├── Header.tsx
│   │       │   └── Footer.tsx
│   │       ├── providers/        # 全局 Provider
│   │       ├── routes/          # 路由配置
│   │       ├── pages/           # 页面
│   │       └── App.tsx
│   │
│   ├── core/                    # Core 远程模块
│   │   ├── webpack.config.js
│   │   ├── server/              # Core API 服务
│   │   │   ├── src/
│   │   │   │   ├── auth/        # 认证服务
│   │   │   │   ├── iam/         # IAM 服务
│   │   │   │   ├── workflow/    # 工作流服务
│   │   │   │   ├── file/        # 文件服务
│   │   │   │   ├── notify/      # 通知服务
│   │   │   │   ├── report/      # 报表服务
│   │   │   │   └── common/      # 公共模块
│   │   │   └── package.json
│   │   └── web/                 # Core 前端
│   │       ├── webpack.config.js
│   │       └── src/
│   │           ├── api/         # Core API 封装
│   │           ├── components/  # Core 组件
│   │           ├── hooks/       # Core Hooks
│   │           ├── store/       # Core Store
│   │           ├── pages/       # Core 页面
│   │           └── routes/      # Core 路由
│   │
│   ├── hrm/                     # HRM 远程模块
│   ├── crm/                     # CRM 远程模块
│   ├── pm/                       # PM 远程模块
│   ├── fin/                     # FIN 远程模块
│   ├── sc/                      # SC 远程模块
│   └── qms/                     # QMS 远程模块
│
├── packages/
│   ├── shared-types/            # 共享类型定义
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   ├── org.ts
│   │   │   ├── workflow.ts
│   │   │   └── common.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared-utils/            # 共享工具函数
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── date.ts
│   │   │   ├── format.ts
│   │   │   └── validate.ts
│   │   └── package.json
│   │
│   ├── shared-hooks/           # 共享 Hooks
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── useAsync.ts
│   │   │   ├── usePagination.ts
│   │   │   └── useDebounce.ts
│   │   └── package.json
│   │
│   ├── shared-components/      # 共享 UI 组件
│   │   ├── src/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Table/
│   │   │   └── Modal/
│   │   └── package.json
│   │
│   ├── shared-constants/       # 共享常量
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes.ts
│   │   │   └── config.ts
│   │   └── package.json
│   │
│   └── ui-kit/                 # UI 组件库
│       ├── src/
│       ├── stories/
│       └── package.json
│
├── tools/                      # 构建工具
│   ├── mf-cli/                 # MF 辅助 CLI
│   └── scripts/
│
├── docs/                       # 文档
│
├── package.json               # 根 package.json (pnpm workspaces)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

### 3.3 Core API 服务设计

```yaml
# apps/core/server/src/appsettings.yml

server:
  port: 4100
  host: 0.0.0.0

services:
  auth:
    path: ./services/auth
    routes:
      - path: /api/auth/login
        method: POST
        handler: authController.login
      - path: /api/auth/logout
        method: POST
        handler: authController.logout
      - path: /api/auth/refresh
        method: POST
        handler: authController.refresh
      - path: /api/auth/me
        method: GET
        handler: authController.me

  iam:
    path: ./services/iam
    routes:
      - path: /api/users
        method: GET
        handler: userController.list
      - path: /api/users
        method: POST
        handler: userController.create
      - path: /api/users/:id
        method: GET
        handler: userController.get
      - path: /api/users/:id
        method: PUT
        handler: userController.update
      - path: /api/users/:id
        method: DELETE
        handler: userController.delete
      - path: /api/roles
        method: GET
        handler: roleController.list
      - path: /api/departments
        method: GET
        handler: departmentController.list

  workflow:
    path: ./services/workflow
    routes:
      - path: /api/workflows
        method: GET
        handler: workflowController.listDefinitions
      - path: /api/workflows
        method: POST
        handler: workflowController.createDefinition
      - path: /api/workflow-instances
        method: GET
        handler: workflowController.listInstances
      - path: /api/workflow-instances/:id/start
        method: POST
        handler: workflowController.startInstance
      - path: /api/workflow-tasks
        method: GET
        handler: workflowController.listTasks

  file:
    path: ./services/file
    routes:
      - path: /api/files
        method: POST
        handler: fileController.upload
      - path: /api/files/:id
        method: GET
        handler: fileController.get
      - path: /api/files/:id
        method: DELETE
        handler: fileController.delete

  notify:
    path: ./services/notify
    routes:
      - path: /api/notifications
        method: GET
        handler: notifyController.list
      - path: /api/notifications/:id/read
        method: PUT
        handler: notifyController.markRead
      - path: /api/notifications/send
        method: POST
        handler: notifyController.send

  report:
    path: ./services/report
    routes:
      - path: /api/reports
        method: GET
        handler: reportController.list
      - path: /api/reports/:id/execute
        method: POST
        handler: reportController.execute
      - path: /api/reports/:id/export
        method: POST
        handler: reportController.export
```

### 3.4 数据库设计 (Core 模块)

```sql
-- Core 模块数据库 schema
-- 数据库名: topems_core

-- 用户表
CREATE TABLE sys_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    real_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(50),
    password_changed_at TIMESTAMP,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_user_status CHECK (status IN ('active', 'inactive', 'locked'))
);

-- 部门表
CREATE TABLE sys_department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    parent_id UUID REFERENCES sys_department(id),
    manager_id UUID REFERENCES sys_user(id),
    sort_order INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_dept_status CHECK (status IN ('active', 'inactive'))
);

-- 岗位表
CREATE TABLE sys_position (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    department_id UUID NOT NULL REFERENCES sys_department(id),
    level INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 用户岗位关联表 (用户可有多岗位)
CREATE TABLE sys_user_position (
    user_id UUID REFERENCES sys_user(id),
    position_id UUID REFERENCES sys_position(id),
    is_primary BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    PRIMARY KEY (user_id, position_id)
);

-- 角色表
CREATE TABLE sys_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 用户角色关联表
CREATE TABLE sys_user_role (
    user_id UUID REFERENCES sys_user(id),
    role_id UUID REFERENCES sys_role(id),
    PRIMARY KEY (user_id, role_id)
);

-- 权限表
CREATE TABLE sys_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    resource VARCHAR(100),
    action VARCHAR(50),
    description TEXT,
    parent_id UUID REFERENCES sys_permission(id),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色权限关联表
CREATE TABLE sys_role_permission (
    role_id UUID REFERENCES sys_role(id),
    permission_id UUID REFERENCES sys_permission(id),
    PRIMARY KEY (role_id, permission_id)
);

-- 用户会话表 (用于 JWT 黑名单)
CREATE TABLE sys_user_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES sys_user(id),
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

-- 字典类型表
CREATE TABLE sys_dict_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 字典数据表
CREATE TABLE sys_dict_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_id UUID NOT NULL REFERENCES sys_dict_type(id),
    label VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    css_class VARCHAR(50),
    list_class VARCHAR(50),
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type_id, value)
);

-- 操作日志表
CREATE TABLE sys_oper_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES sys_user(id),
    username VARCHAR(50),
    module VARCHAR(50),
    business_type VARCHAR(50),
    method VARCHAR(100),
    request_method VARCHAR(10),
    request_url VARCHAR(500),
    request_params JSONB,
    response_data JSONB,
    status VARCHAR(20),
    error_msg TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    execution_time INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 登录日志表
CREATE TABLE sys_login_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES sys_user(id),
    username VARCHAR(50),
    status VARCHAR(20),
    msg TEXT,
    ip_address VARCHAR(50),
    login_location VARCHAR(255),
    browser VARCHAR(100),
    os VARCHAR(100),
    device VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知表
CREATE TABLE sys_notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    sender_id UUID REFERENCES sys_user(id),
    receiver_id UUID NOT NULL REFERENCES sys_user(id),
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文件表
CREATE TABLE sys_file (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    size BIGINT,
    mime_type VARCHAR(100),
    extension VARCHAR(20),
    bucket VARCHAR(50) NOT NULL,
    path VARCHAR(500) NOT NULL,
    url VARCHAR(500),
    uploader_id UUID REFERENCES sys_user(id),
    folder_id UUID,
    is_folder BOOLEAN DEFAULT FALSE,
    parent_id UUID REFERENCES sys_file(id),
    status VARCHAR(20) DEFAULT 'active',
    downloads INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 工作流定义表
CREATE TABLE wf_definition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    version INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    form_id UUID,
    variables JSONB,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    svg_xml TEXT,
    created_by UUID REFERENCES sys_user(id),
    published_by UUID REFERENCES sys_user(id),
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 工作流实例表
CREATE TABLE wf_instance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    definition_id UUID NOT NULL REFERENCES wf_definition(id),
    definition_version INT NOT NULL,
    name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'running',
    initiator_id UUID NOT NULL REFERENCES sys_user(id),
    variables JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工作流任务表
CREATE TABLE wf_task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES wf_instance(id),
    node_id VARCHAR(50) NOT NULL,
    node_name VARCHAR(100),
    assignee_id UUID REFERENCES sys_user(id),
    candidate_users UUID[],
    candidate_roles UUID[],
    status VARCHAR(20) DEFAULT 'pending',
    action VARCHAR(20),
    comment TEXT,
    form_data JSONB,
    due_date TIMESTAMP,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_user_department ON sys_user(department_id);
CREATE INDEX idx_user_status ON sys_user(status);
CREATE INDEX idx_dept_parent ON sys_department(parent_id);
CREATE INDEX idx_position_dept ON sys_position(department_id);
CREATE INDEX idx_notification_receiver ON sys_notification(receiver_id);
CREATE INDEX idx_notification_read ON sys_notification(receiver_id, is_read);
CREATE INDEX idx_file_folder ON sys_file(folder_id);
CREATE INDEX idx_file_uploader ON sys_file(uploader_id);
CREATE INDEX idx_wf_instance_def ON wf_instance(definition_id);
CREATE INDEX idx_wf_instance_status ON wf_instance(status);
CREATE INDEX idx_wf_task_instance ON wf_task(instance_id);
CREATE INDEX idx_wf_task_assignee ON wf_task(assignee_id);
CREATE INDEX idx_wf_task_status ON wf_task(status);
CREATE INDEX idx_oper_log_user ON sys_oper_log(user_id);
CREATE INDEX idx_oper_log_created ON sys_oper_log(created_at);
CREATE INDEX idx_login_log_user ON sys_login_log(user_id);
CREATE INDEX idx_login_log_created ON sys_login_log(created_at);
```

---

## 四、实施步骤

### 4.1 阶段一：Monorepo 重构 (1-2周)

```
目标：建立 Monorepo 结构，为 Module Federation 准备

任务清单：
□ 1. 配置 pnpm workspace
□ 2. 创建 packages/shared-types
□ 3. 创建 packages/shared-utils
□ 4. 创建 packages/shared-hooks
□ 5. 创建 packages/shared-constants
□ 6. 创建 apps/host (主应用)
□ 7. 创建 apps/core (核心模块)
□ 8. 配置共享依赖

产出：
- Monorepo 项目结构
- 共享包发布流程
- 统一的依赖管理
```

### 4.2 阶段二：Core 模块抽取 (4-6周)

```
目标：抽取 Core 远程模块

任务清单：
□ 1. 抽取 Auth 服务
   □ 1.1 创建 Auth API (apps/core/server/src/auth)
   □ 1.2 创建 Auth 前端封装 (apps/core/web/src/api/auth)
   □ 1.3 抽取 Auth 组件 (UserSelect, LoginForm)
   □ 1.4 创建 Auth Hooks (useAuth, useLogin)
   □ 1.5 导出 Auth RemoteEntry

□ 2. 抽取 IAM 服务
   □ 2.1 创建 IAM API
   □ 2.2 抽取用户管理页面
   □ 2.3 抽取角色管理页面
   □ 2.4 抽取部门管理页面
   □ 2.5 导出 IAM RemoteEntry

□ 3. 抽取 Workflow 服务
   □ 3.1 创建 Workflow API
   □ 3.2 抽取流程设计器
   □ 3.3 抽取审批组件
   □ 3.4 导出 Workflow RemoteEntry

□ 4. 抽取 File 服务
□ 5. 抽取 Notify 服务
□ 6. 抽取 Report 服务
□ 7. 抽取 Dict 服务
□ 8. Core 模块集成测试

产出：
- Core Remote 可独立部署
- Core RemoteEntry 可被其他模块消费
- Core 前后端 API 规范
```

### 4.3 阶段三：业务模块抽取 (8-12周)

```
目标：抽取各业务模块为 Remote

任务清单：
□ 1. HRM 模块 (2-3周)
□ 2. CRM 模块 (2-3周)
□ 3. PM 模块 (2-3周)
□ 4. SC 模块 (2-3周)
□ 5. FIN 模块 (2-3周)
□ 6. QMS 模块 (1-2周)

每个模块任务：
□ 1. 创建 Remote Webpack 配置
□ 2. 抽取 API 服务
□ 3. 抽取组件
□ 4. 抽取页面
□ 5. 配置 Remote 依赖 (依赖 Core)
□ 6. 导出 RemoteEntry
□ 7. 与 Host 集成测试
```

### 4.4 阶段四：Host 整合 (2-3周)

```
目标：完善 Host 应用，整合所有模块

任务清单：
□ 1. 完善动态路由加载
□ 2. 实现模块加载状态管理
□ 3. 实现全局错误边界
□ 4. 实现模块间通信
□ 5. 完善导航菜单
□ 6. 完善主题切换
□ 7. 完善加载动画
□ 8. 性能优化
□ 9. 安全审计
□ 10. 文档完善
```

---

## 五、关键技术决策

### 5.1 共享策略

| 依赖类型 | 策略 | 说明 |
|----------|------|------|
| React/ReactDOM | singleton + eager | 全局唯一，立即加载 |
| Router | singleton | 统一路由管理 |
| UI 库 | singleton | 主题一致性 |
| 状态管理 | singleton | 共享状态 |
| 业务 Hooks | 不共享 | 各模块独立 |
| 业务组件 | 不共享 | 各模块独立 |
| 工具函数 | 按需复制 | 避免耦合 |

### 5.2 版本策略

```
主版本对齐：
- React: 18.x (所有模块)
- MUI: 5.x (所有模块)
- TypeScript: 5.x (所有模块)
- Node: 20.x (所有服务)

共享包版本：
- shared-types: ^1.0.0
- shared-utils: ^1.0.0
- shared-hooks: ^1.0.0
- shared-constants: ^1.0.0
```

### 5.3 部署策略

```
开发环境：
- Host: localhost:3000
- Core: localhost:3001
- HRM: localhost:3002
- CRM: localhost:3003
- ...

测试环境：
- 独立 K8s Pod
- 共享 ConfigMap
- 独立 Service

生产环境：
- Nginx Ingress 路由
- CDN 加速 RemoteEntry
- 独立扩缩容
```

---

## 六、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 模块间版本冲突 | 运行失败 | 使用 singleton + requiredVersion |
| 加载性能差 | 用户体验差 | 预加载关键模块 + 懒加载 |
| 调试困难 | 开发效率低 | 完善 DevTools 插件 |
| 类型不一致 | 运行时错误 | 严格使用 shared-types |
| 部署复杂 | 运维成本高 | 完善部署脚本 + 文档 |

---

## 七、验收标准

```
□ 1. Host 可动态加载所有 Remote
□ 2. 各模块可独立开发、独立部署
□ 3. 模块间无循环依赖
□ 4. 共享依赖无版本冲突
□ 5. 类型定义完全共享
□ 6. CI/CD 流程完善
□ 7. 开发文档完整
□ 8. 性能指标达标
   □ 首屏加载 < 3s
   □ 模块切换 < 1s
   □ 内存占用合理
```

---

## 八、附录

### A. Webpack 版本要求

```json
{
  "webpack": "^5.88.0",
  "webpack-cli": "^5.1.4",
  "webpack-dev-server": "^4.15.1"
}
```

### B. 推荐的 pnpm 版本

```json
{
  "pnpm": "^8.0.0"
}
```

### C. 参考资料

- [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Module Federation Examples](https://github.com/module-federation/module-federation-examples)
- [Module Federation Type Plugin](https://github.com/module-federation/type-plugin)

---

## 九、相关文档

| 文档 | 说明 |
|------|------|
| [backend-service-integration-plan.md](backend-service-integration-plan.md) | 后端服务整合实施方案 |
| [improvement-plan.md](improvement-plan.md) | 项目整体改进计划 |
