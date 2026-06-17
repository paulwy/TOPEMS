# 前端架构优化总结

**更新日期**: 2026-06-18
**优化范围**: packages/, apps/web, apps/core

---

## 一、优化概述

本次优化主要针对前端 monorepo 架构中的共享代码组织、类型统一和环境兼容性问题。

### 优化前问题

| 问题 | 描述 |
|------|------|
| shared-utils/format.ts 职责混乱 | 混合了日期、数字、字符串等多种函数 |
| shared-types/common.ts 体积过大 | 包含 API、UI、通知、字典等多种无关类型 |
| validate.ts 中文硬编码 | 密码验证错误消息直接返回中文，无法国际化 |
| core 模块 useAuth 重复 | useAuth Hook 和 authStore 状态管理重复 |
| API client 代码重复 | 每个 API 文件都重复编写 axios 实例和拦截器 |
| shared-components 未抽取 | OrgTree/UserSelect 在 core 内部，未共享 |
| Web User 类型未统一 | web 和 shared-types 各有一份 User 定义 |
| request.ts 环境兼容问题 | 使用 localStorage 在 Node.js 环境会报错 |
| vite.config.ts 冗余代码 | 大量被注释的 Module Federation 配置 |

---

## 二、优化内容

### 2.1 shared-utils 重构

**拆分前**:
```
shared-utils/src/
├── format.ts    # 混合了日期、数字、字符串
├── validate.ts  # 中文硬编码错误消息
└── storage.ts
```

**拆分后**:
```
shared-utils/src/
├── date.ts         # 日期处理
├── string.ts       # truncateText, toSnakeCase, toCamelCase
├── number.ts       # formatCurrency, formatNumber, formatFileSize
├── function.ts     # debounce, throttle (新增)
├── clone.ts        # deepClone (新增)
├── id.ts           # generateId (新增)
├── validate.ts     # 使用 i18n key
├── storage.ts      # localStorage 封装
├── i18n.ts         # 国际化工具 (新增)
└── request.ts      # Axios 封装 (新增)
```

### 2.2 shared-types 重构

**拆分前**:
```
shared-types/src/
├── auth.ts      # User, Role, Permission
├── org.ts       # Department, Position
├── workflow.ts  # Workflow types
└── common.ts    # 混合了 API、UI、通知、字典等
```

**拆分后**:
```
shared-types/src/
├── api.ts           # ApiResponse, PaginatedResponse (新增)
├── auth.ts          # User, Role, Permission + mapApiUserToUser
├── org.ts           # Department, Position
├── workflow.ts      # Workflow types
├── ui.ts            # MenuItem (从 common 拆分)
├── notification.ts  # Notification (从 common 拆分)
├── file.ts          # FileRecord (从 common 拆分)
└── dict.ts          # DictType, DictData (从 common 拆分)
```

### 2.3 API 封装

新增 `request.ts`，提供统一的 Axios 封装：

```typescript
// 特性：
// - 自动添加 Authorization header
// - 自动处理 401 跳转登录
// - 公开路径（/health, /api/v1/auth/*）跳过认证
// - 支持浏览器和 Node.js 环境

import { createRequest } from '@topems/shared-utils';

const authApi = createRequest('/api/v1/auth');
```

### 2.4 shared-components 抽取

```
packages/shared-components/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    └── components/
        ├── OrgTree.tsx      # 纯 UI 组件
        └── UserSelect.tsx   # 纯 UI 组件
```

**架构模式**:
```
shared-components (纯 UI，无副作用)
        ↑
        │ props
        │
core 组件 (Container，有副作用 - 数据获取)
```

### 2.5 User 类型统一

```typescript
// shared-types/auth.ts
interface User {
  // 核心字段（camelCase）
  id: string;
  username: string;
  realName: string;
  status: 'active' | 'inactive' | 'locked';

  // Web 兼容字段（snake_case 别名）
  full_name?: string;      // realName 别名
  roles?: string[];
  is_active?: boolean;     // status 别名
  created_at?: string;     // createdAt 别名
}

// 转换函数
export const mapApiUserToUser = (apiResponse: Record<string, any>): User => {
  // 自动处理 snake_case → camelCase
};
```

### 2.6 request.ts 环境兼容

```typescript
// 环境检测
const isBrowser = typeof window !== 'undefined';

// 请求拦截器
if (!isBrowser) {
  return config;  // 非浏览器环境直接跳过
}

// 响应拦截器
if (error.response?.status === 401 && isBrowser) {
  // 只有浏览器环境才处理 401
}
```

### 2.7 其他清理

| 文件 | 清理内容 |
|------|----------|
| apps/core/src/hooks/useAuth.ts | 已删除，统一使用 authStore |
| apps/web/vite.config.ts | 移除被注释的 Module Federation 配置 (~70行) |

---

## 三、优化后架构

```
TOPEMS/
├── packages/
│   ├── shared-utils/           # 工具函数库
│   │   ├── date.ts
│   │   ├── string.ts
│   │   ├── number.ts
│   │   ├── function.ts
│   │   ├── clone.ts
│   │   ├── id.ts
│   │   ├── validate.ts
│   │   ├── storage.ts
│   │   ├── i18n.ts
│   │   └── request.ts
│   │
│   ├── shared-types/           # 类型定义库
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── org.ts
│   │   ├── workflow.ts
│   │   ├── ui.ts
│   │   ├── notification.ts
│   │   ├── file.ts
│   │   └── dict.ts
│   │
│   └── shared-components/      # 共享组件库
│       ├── OrgTree.tsx
│       └── UserSelect.tsx
│
└── apps/
    ├── core/                   # MFE Remote
    │   ├── api/                # 使用 createRequest
    │   ├── components/         # Container 组件
    │   ├── hooks/              # usePermission (保留)
    │   ├── store/              # authStore, orgStore
    │   └── pages/
    │
    └── web/                    # MFE Host
        ├── api/                # 独立 API 客户端
        ├── components/         # Web 特有组件
        ├── hooks/              # useAuth (使用 shared-types)
        ├── store/              # 独立 store
        └── pages/
```

---

## 四、编译验证

所有模块 TypeScript 编译通过：

| Module | Status |
|--------|--------|
| shared-types | ✅ |
| shared-utils | ✅ |
| shared-components | ✅ |
| apps/core | ✅ |
| apps/web | ✅ |

---

## 五、后续建议

### 可选优化（投入产出比不高）

1. **importExport.ts 抽取到 shared** - Excel/CSV 工具函数抽取
2. **packages 添加构建脚本** - 如需发布 npm 包
3. **web api/client.ts 拆分** - 300+ 行可按功能拆分

### 保持现状

1. **web 中的 UI 组件类型** - 如 UserSelect.tsx 的简化 User 类型，与 shared-types 是不同用途
2. **core store 持久化** - authStore 持久化，orgStore 无需持久化
3. **TypeScript baseUrl 警告** - TypeScript 6.0 预告，不影响当前

---

## 六、相关文档

- [TOPEMS 前端门户 README](../apps/web/README.md)
- [架构优化方案](ARCHITECTURE_OPTIMIZATION_PLAN.md)
- [总体架构设计](OVERALL_ARCHITECTURE_DESIGN.md)
