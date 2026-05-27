# TOPEMS 前端架构文档

## 目录

1. [项目概述](#项目概述)
2. [目录结构](#目录结构)
3. [核心模块](#核心模块)
4. [API 调用规范](#api-调用规范)
5. [统一响应格式](#统一响应格式)
6. [环境配置](#环境配置)
7. [开发指南](#开发指南)

---

## 项目概述

TOPEMS 前端是一个基于 React + TypeScript 的现代企业级应用，采用模块化设计，支持多服务架构。

### 技术栈

- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: React Hooks
- **路由**: React Router
- **HTTP 客户端**: Axios
- **UI 库**: Lucide Icons

---

## 目录结构

```
frontend/
├── src/
│   ├── api/                    # API 模块
│   │   ├── client.ts          # API 客户端配置
│   │   ├── erp.ts             # ERP 服务 API
│   │   ├── hrm.ts             # HRM 服务 API
│   │   ├── request.ts         # 请求工具函数
│   │   └── ...                # 其他服务 API
│   ├── components/            # 可复用组件
│   │   ├── NotificationContainer.tsx  # 通知容器
│   │   └── ...
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useNotification.ts        # 通知 Hook
│   │   ├── useAuth.ts                # 认证 Hook
│   │   └── ...
│   ├── pages/                 # 页面组件
│   │   ├── CompanyManagementPage.tsx
│   │   ├── DepartmentManagementPage.tsx
│   │   ├── EmployeeManagementPage.tsx
│   │   └── ...
│   ├── utils/                 # 工具函数
│   │   ├── errors.ts          # 错误处理
│   │   ├── logger.ts          # 日志工具
│   │   └── ...
│   ├── config/                # 配置文件
│   │   └── runtime.ts         # 运行时配置
│   ├── App.tsx
│   └── main.tsx
├── .env.development           # 开发环境变量
├── .env.production            # 生产环境变量
└── package.json
```

---

## 核心模块

### 1. API 客户端 (`src/api/client.ts`)

统一的 Axios 客户端配置，负责：

- 多服务 API 实例管理
- 请求/响应拦截器
- 认证 Token 管理
- 超时配置

```typescript
// 使用示例
import apiClient from './api/client';

// 获取 ERP 服务客户端
const erpClient = apiClient.erp;

// 调用 API
const response = await erpClient.get('/api/v1/departments');
```

### 2. 统一响应格式 (`ApiResponse`)

所有后端 API 响应都遵循统一格式：

```typescript
interface ApiResponse<T> {
  code: number;         // HTTP 状态码
  success: boolean;     // 是否成功
  data: T;              // 响应数据
  message: string;      // 提示消息
  timestamp: string;    // 时间戳
}
```

### 3. 请求工具 (`src/api/request.ts`)

提供安全的 API 请求包装器：

```typescript
import { safeRequest, handleResponse } from './api/request';

// 安全请求
const data = await safeRequest(() => companyApi.list(params));

// 处理响应
const result = handleResponse(apiResponse);
```

### 4. 错误处理 (`src/utils/errors.ts`)

统一的错误处理机制：

```typescript
import { handleApiError, getErrorMessage } from './utils/errors';

try {
  await apiCall();
} catch (error) {
  const appError = handleApiError(error);
  console.error(getErrorMessage(appError));
}
```

### 5. 通知系统 (`useNotification`)

全局通知管理：

```typescript
import { useNotification } from './hooks/useNotification';

function Component() {
  const { success, error, notifications, hideNotification } = useNotification();

  const handleAction = async () => {
    try {
      await doSomething();
      success('操作成功');
    } catch (err) {
      error('操作失败');
    }
  };

  return (
    <>
      <NotificationContainer 
        notifications={notifications} 
        onClose={hideNotification} 
      />
    </>
  );
}
```

---

## API 调用规范

### 1. API 模块结构

每个服务都应该有自己的 API 文件：

```typescript
// src/api/[service].ts
export interface Entity {
  id: string;
  name: string;
  // ...
}

export const entityApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Entity>>> {
    return apiClient.service.get('/api/v1/entities');
  },

  async get(id: string): Promise<ApiResponse<Entity>> {
    return apiClient.service.get(`/api/v1/entities/${id}`);
  },

  async create(data: Partial<Entity>): Promise<ApiResponse<Entity>> {
    return apiClient.service.post('/api/v1/entities', data);
  },

  async update(id: string, data: Partial<Entity>): Promise<ApiResponse<Entity>> {
    return apiClient.service.put(`/api/v1/entities/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.service.delete(`/api/v1/entities/${id}`);
  },
};
```

### 2. API 路径规范

所有 API 路径都应该包含 `/api/v1` 前缀：

```
✅ /api/v1/departments
❌ /departments
```

### 3. 分页查询

分页查询统一使用以下参数：

```typescript
interface PaginationParams {
  page?: number;       // 页码，从 1 开始
  page_size?: number;  // 每页数量
  search?: string;     // 搜索关键词
  status?: string;     // 状态筛选
}
```

分页响应格式：

```typescript
interface PaginatedResult<T> {
  items: T[];          // 数据列表
  total: number;       // 总数
  page: number;        // 当前页码
  page_size: number;   // 每页数量
}
```

---

## 统一响应格式

### 成功响应

```json
{
  "code": 200,
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2024-05-27T10:30:00Z"
}
```

### 错误响应

```json
{
  "code": 404,
  "success": false,
  "data": null,
  "message": "资源不存在",
  "timestamp": "2024-05-27T10:30:00Z"
}
```

---

## 环境配置

### 服务端口映射

| 服务 | 环境变量 | 默认端口 | 说明 |
|------|----------|----------|------|
| IAM | `VITE_IAM_SERVICE_URL` | `http://localhost:8001` | 身份认证服务 |
| RS | `VITE_RS_SERVICE_URL` | `http://localhost:8002` | 研发管理服务 |
| LIMS | `VITE_LIMS_SERVICE_URL` | `http://localhost:8003` | 实验室系统 |
| QMS | `VITE_QMS_SERVICE_URL` | `http://localhost:8004` | 质量管理系统 |
| MES | `VITE_MES_SERVICE_URL` | `http://localhost:8005` | 生产执行系统 |
| ERP | `VITE_ERP_SERVICE_URL` | `http://localhost:8006` | 企业资源计划 |
| SCM | `VITE_SCM_SERVICE_URL` | `http://localhost:8007` | 供应链系统 |
| WMS | `VITE_WMS_SERVICE_URL` | `http://localhost:8008` | 仓库管理系统 |
| CRM | `VITE_CRM_SERVICE_URL` | `http://localhost:8009` | 客户关系管理 |
| HRM | `VITE_HRM_SERVICE_URL` | `http://localhost:8010` | 人力资源管理 |
| GIS | `VITE_GIS_SERVICE_URL` | `http://localhost:8011` | 地理信息系统 |
| BI | `VITE_BI_SERVICE_URL` | `http://localhost:8012` | 商业智能 |
| EHS | `VITE_EHS_SERVICE_URL` | `http://localhost:8013` | 安全管理系统 |
| PDM | `VITE_PDM_SERVICE_URL` | `http://localhost:8014` | 产品数据管理 |
| SRM | `VITE_SRM_SERVICE_URL` | `http://localhost:8015` | 供应商管理 |
| IM | `VITE_IM_SERVICE_URL` | `http://localhost:8016` | 即时通讯 |
| AI | `VITE_AI_SERVICE_URL` | `http://localhost:8017` | AI 知识库 |
| Mobile | `VITE_MOBILE_SERVICE_URL` | `http://localhost:8018` | 移动端服务 |
| Integration | `VITE_INTEGRATION_SERVICE_URL` | `http://localhost:8019` | 集成服务 |
| Portal | `VITE_PORTAL_SERVICE_URL` | `http://localhost:8020` | 企业门户 |
| Doc | `VITE_DOC_SERVICE_URL` | `http://localhost:8021` | 文档服务 |
| Flow | `VITE_FLOW_SERVICE_URL` | `http://localhost:8022` | 工作流服务 |
| Notification | `VITE_NOTIFICATION_SERVICE_URL` | `http://localhost:8023` | 通知服务 |
| Report | `VITE_REPORT_SERVICE_URL` | `http://localhost:8024` | 报表服务 |

### 环境变量文件

- `.env.development` - 开发环境
- `.env.production` - 生产环境
- `.env.test` - 测试环境
- `.env.local` - 本地覆盖（不提交到 Git）

---

## 开发指南

### 添加新服务 API

1. 在 `src/api/` 目录下创建新文件 `[service].ts`
2. 定义数据接口
3. 实现 API 方法
4. 在 `src/config/runtime.ts` 中添加服务配置
5. 在 `.env.example` 和各环境文件中添加环境变量

### 创建新页面

1. 在 `src/pages/` 目录下创建页面组件
2. 使用 `useNotification` Hook 管理通知
3. 遵循组件设计模式
4. 添加路由配置（如果需要）

### 错误处理最佳实践

```typescript
// 推荐做法
const handleAction = async () => {
  try {
    setLoading(true);
    const response = await apiCall();
    
    if (response.success) {
      success('操作成功');
      // 更新数据
    } else {
      error(response.message);
    }
  } catch (err) {
    const appError = handleApiError(err);
    error(appError.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 代码规范

### 命名约定

- **组件**: `PascalCase` (e.g., `UserManagementPage`)
- **Hook**: `useCamelCase` (e.g., `useNotification`)
- **文件**: `PascalCase` (组件), `camelCase` (工具)
- **常量**: `UPPER_SNAKE_CASE`

### 类型定义

始终使用 TypeScript 类型定义，避免 `any` 类型：

```typescript
// ✅ 好的做法
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ 避免
const user: any = { ... };
```

---

## 更新日志

### v1.1.0 (2024-05-27)

- ✅ 统一服务端口配置
- ✅ 完善 API 路径格式（添加 /api/v1 前缀）
- ✅ 添加 HRM 服务 API 模块
- ✅ 创建统一的请求工具函数
- ✅ 实现通知系统（Hook + 组件）
- ✅ 添加分页查询支持
- ✅ 完善错误处理机制
- ✅ 撰写架构文档
