# 通讯录功能设计文档

**版本**: v1.0
**日期**: 2026-06-01
**状态**: 待审核
**作者**: AI Assistant

## 1. 项目概述

### 1.1 功能目标
为企业内部门户提供统一的通讯录功能，整合员工、部门、公司三类联系人，支持搜索筛选、分组浏览、详情查看、导出，并为其他模块（聊天、邮件、会议、项目等）提供 API 支撑。

### 1.2 设计原则
- **一站式**：统一入口，用户体验一致
- **可扩展**：预留扩展点，支持未来新增联系人类型
- **高性能**：使用数据库视图减少关联查询
- **易集成**：为其他模块提供标准化 API

---

## 2. 技术架构

### 2.1 技术栈
- **后端**：Rust + Axum + SQLx + PostgreSQL
- **前端**：React + TypeScript + Tailwind CSS
- **数据库**：PostgreSQL

### 2.2 项目结构
```
services/topems-erp/
├── backend/
│   └── src/
│       ├── api/
│       │   └── addressbook.rs      # 通讯录 API
│       ├── models/
│       │   └── addressbook.rs      # 通讯录数据模型
│       └── main.rs                 # 路由注册
└── frontend/
    └── src/
        ├── pages/
        │   └── AddressbookPage.tsx # 通讯录主页面
        ├── components/
        │   └── addressbook/
        │       ├── AddressbookSidebar.tsx
        │       ├── AddressbookHeader.tsx
        │       ├── AddressbookFilters.tsx
        │       ├── AddressbookList.tsx
        │       ├── ContactCard.tsx
        │       └── ContactDetailModal.tsx
        └── api/
            └── addressbook.ts      # 前端 API 调用
```

---

## 3. 数据库设计

### 3.1 通讯录视图
创建统一的通讯录视图，整合员工、部门、公司数据：

```sql
-- 通讯录联合视图
CREATE OR REPLACE VIEW v_addressbook AS
SELECT
    'EMPLOYEE' as contact_type,
    e.id,
    e.name,
    e.employee_number as code,
    e.position,
    e.email,
    e.phone,
    e.department_id,
    d.name as department_name,
    d.code as department_code,
    e.status,
    e.created_at,
    e.updated_at
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id

UNION ALL

SELECT
    'DEPARTMENT' as contact_type,
    d.id,
    d.name,
    d.code,
    NULL as position,
    NULL as email,
    NULL as phone,
    d.parent_id as department_id,
    p.name as department_name,
    p.code as department_code,
    d.status,
    d.created_at,
    d.updated_at
FROM departments d
LEFT JOIN departments p ON d.parent_id = p.id

UNION ALL

SELECT
    'COMPANY' as contact_type,
    c.id,
    c.name,
    c.registration_number as code,
    NULL as position,
    c.email,
    c.contact_phone as phone,
    NULL as department_id,
    NULL as department_name,
    NULL as department_code,
    c.status,
    c.created_at,
    c.updated_at
FROM companies c;
```

### 3.2 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| contact_type | VARCHAR(20) | 联系人类型：EMPLOYEE, DEPARTMENT, COMPANY |
| id | UUID | 联系人唯一标识 |
| name | VARCHAR(255) | 姓名/名称 |
| code | VARCHAR(100) | 编码（工号/部门编码/注册号） |
| position | VARCHAR(100) | 职位（仅员工有） |
| email | VARCHAR(255) | 邮箱 |
| phone | VARCHAR(50) | 电话 |
| department_id | UUID | 所属部门 ID |
| department_name | VARCHAR(255) | 部门名称 |
| department_code | VARCHAR(100) | 部门编码 |
| status | VARCHAR(50) | 状态 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

---

## 4. API 设计

### 4.1 通讯录列表查询

**接口**：`GET /api/v1/addressbook`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 联系人类型：EMPLOYEE, DEPARTMENT, COMPANY |
| department_id | UUID | 否 | 部门 ID（查询该部门及子部门） |
| search | string | 否 | 关键字搜索（姓名、职位、电话、邮箱） |
| status | string | 否 | 状态筛选（active, inactive） |
| page | integer | 否 | 页码（默认 1） |
| page_size | integer | 否 | 每页数量（默认 20，最大 100） |
| fields | string | 否 | 指定返回字段（逗号分隔） |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "contact_type": "EMPLOYEE",
        "name": "张三",
        "code": "EMP001",
        "position": "高级工程师",
        "email": "zhangsan@topems.com",
        "phone": "13800138000",
        "department_id": "660e8400-e29b-41d4-a716-446655440001",
        "department_name": "研发部",
        "status": "active"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  },
  "message": "获取通讯录成功"
}
```

### 4.2 联系人详情查询

**接口**：`GET /api/v1/addressbook/{id}`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 联系人类型：EMPLOYEE, DEPARTMENT, COMPANY |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_type": "EMPLOYEE",
    "name": "张三",
    "code": "EMP001",
    "position": "高级工程师",
    "email": "zhangsan@topems.com",
    "phone": "13800138000",
    "department_id": "660e8400-e29b-41d4-a716-446655440001",
    "department_name": "研发部",
    "status": "active",
    "hire_date": "2023-01-15T00:00:00Z",
    "created_at": "2023-01-15T08:30:00Z"
  },
  "message": "获取联系人详情成功"
}
```

### 4.3 部门树结构查询

**接口**：`GET /api/v1/addressbook/departments/tree`

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "总公司",
      "code": "HQ",
      "children": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "name": "研发部",
          "code": "RD",
          "children": []
        }
      ]
    }
  ],
  "message": "获取部门树成功"
}
```

### 4.4 通讯录导出

**接口**：`GET /api/v1/addressbook/export`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 联系人类型（默认导出全部） |
| format | string | 否 | 导出格式：csv（默认）, xlsx |

**响应**：文件下载流

### 4.5 快速搜索（供其他模块调用）

**接口**：`GET /api/v1/addressbook/search`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 联系人类型 |
| search | string | 否 | 搜索关键字 |
| limit | integer | 否 | 返回数量限制（默认 10） |
| fields | string | 否 | 返回字段（逗号分隔） |

**响应示例**：
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "张三",
      "email": "zhangsan@topems.com"
    }
  ],
  "message": "搜索成功"
}
```

---

## 5. 前端设计

### 5.1 页面布局

采用 **左侧树 + 右侧列表** 的经典布局：

```
┌─────────────────────────────────────────────────────────┐
│  通讯录                    [🔍 搜索...] [📥 导出]      │
├──────────────┬──────────────────────────────────────────┤
│ ▼ 部门结构    │  [全部] [员工] [部门] [公司]            │
│   ├─ 总公司   ├──────────────────────────────────────────┤
│   │  ├─ 研发部 │  ┌────────────────────────────────────┐ │
│   │  │  ├─ 前端 │  │ 张三  │ 高级工程师 │ 研发部  │ ⋮ │ │
│   │  │  └─ 后端 │  ├────────────────────────────────────┤ │
│   │  ├─ 市场部 │  │ 李四  │ 项目经理   │ 市场部  │ ⋮ │ │
│   │  └─ 财务部 │  ├────────────────────────────────────┤ │
│   └─ 分公司   │  │ 王五  │ 财务主管   │ 财务部  │ ⋮ │ │
│              │  └────────────────────────────────────┘ │
│ ▼ 快速筛选    ├──────────────────────────────────────────┤
│   ○ 全部     │  < 1 / 5 >   第 1 页，共 100 条         │
│   ○ 员工     │                                       │
│   ○ 部门     │                                       │
│   ○ 公司     │                                       │
└──────────────┴──────────────────────────────────────────┘
```

### 5.2 组件结构

```
AddressbookPage (主容器)
├── AddressbookSidebar (左侧边栏)
│   ├── DepartmentTree (部门树组件)
│   │   └── TreeNode (树节点，支持展开/折叠)
│   └── QuickFilter (快速筛选组件)
│       └── RadioGroup (单选按钮组)
├── AddressbookMain (右侧主区域)
│   ├── AddressbookHeader (顶部工具栏)
│   │   ├── SearchInput (搜索输入框)
│   │   └── ExportButton (导出按钮)
│   ├── AddressbookFilters (筛选工具栏)
│   │   ├── TypeFilter (类型筛选标签)
│   │   └── StatusFilter (状态筛选下拉)
│   ├── AddressbookList (联系人列表)
│   │   ├── ListView (表格视图)
│   │   └── CardView (卡片视图 - 可选)
│   └── Pagination (分页组件)
└── ContactDetailModal (详情弹窗)
    ├── ContactInfo (联系人信息)
    └── ContactActions (操作按钮组)
        ├── EmailButton (发邮件)
        ├── PhoneButton (拨打电话)
        └── MoreActions (更多操作)
```

### 5.3 状态管理

使用 React Hooks 管理组件状态：

```typescript
// 通讯录页面状态
interface AddressbookState {
  // 数据
  contacts: Contact[];
  departmentTree: DepartmentNode[];
  total: number;
  page: number;
  pageSize: number;

  // 筛选条件
  filters: {
    type: ContactType | null;
    departmentId: string | null;
    search: string;
    status: string | null;
  };

  // UI 状态
  loading: boolean;
  error: string | null;
  selectedContact: Contact | null;
  detailModalOpen: boolean;
  viewMode: 'list' | 'card';
}
```

### 5.4 API 调用

前端使用统一的 API 客户端调用后端接口：

```typescript
// src/api/addressbook.ts
import apiClient from './client';

export const addressbookApi = {
  // 获取通讯录列表
  getContacts: (params: ContactQueryParams) =>
    apiClient.get('/api/v1/addressbook', { params }),

  // 获取联系人详情
  getContactDetail: (id: string, type: ContactType) =>
    apiClient.get(`/api/v1/addressbook/${id}`, { params: { type } }),

  // 获取部门树
  getDepartmentTree: () =>
    apiClient.get('/api/v1/addressbook/departments/tree'),

  // 导出通讯录
  exportContacts: (type?: ContactType, format?: 'csv' | 'xlsx') =>
    apiClient.get('/api/v1/addressbook/export', {
      params: { type, format },
      responseType: 'blob',
    }),

  // 快速搜索
  search: (params: SearchParams) =>
    apiClient.get('/api/v1/addressbook/search', { params }),
};
```

---

## 6. 路由配置

### 6.1 前端路由

```typescript
// 在 App.tsx 或路由配置文件中
const routes = [
  {
    path: '/addressbook',
    component: AddressbookPage,
    meta: {
      title: '通讯录',
      permission: 'addressbook:read',
    },
  },
  {
    path: '/addressbook/employees',
    component: AddressbookPage,
    meta: {
      title: '员工通讯录',
      permission: 'addressbook:read',
      defaultFilters: { type: 'EMPLOYEE' },
    },
  },
  {
    path: '/addressbook/departments',
    component: AddressbookPage,
    meta: {
      title: '部门通讯录',
      permission: 'addressbook:read',
      defaultFilters: { type: 'DEPARTMENT' },
    },
  },
  {
    path: '/addressbook/companies',
    component: AddressbookPage,
    meta: {
      title: '公司通讯录',
      permission: 'addressbook:read',
      defaultFilters: { type: 'COMPANY' },
    },
  },
];
```

### 6.2 后端路由

```rust
// 在 main.rs 中注册路由
let addressbook_router = Router::new()
    .route("/api/v1/addressbook", get(list_addressbook).post(create_contact))  // 预留创建接口
    .route("/api/v1/addressbook/search", get(search_addressbook))
    .route("/api/v1/addressbook/export", get(export_addressbook))
    .route("/api/v1/addressbook/departments/tree", get(get_department_tree))
    .route("/api/v1/addressbook/{id}", get(get_contact_detail))
    .layer(axum::middleware::from_fn_with_state(auth_state, auth_middleware));
```

---

## 7. 权限设计

### 7.1 权限定义

| 权限码 | 名称 | 说明 |
|--------|------|------|
| addressbook:read | 查看通讯录 | 可查看通讯录列表和详情 |
| addressbook:export | 导出通讯录 | 可导出通讯录数据 |
| addressbook:manage | 管理通讯录 | 可编辑联系人信息（预留） |

### 7.2 权限配置

在现有的权限配置文件中添加：

```typescript
// frontend/src/config/permissions.ts
export const permissions = {
  // ... 现有权限
  addressbook: {
    read: 'addressbook:read',
    export: 'addressbook:export',
    manage: 'addressbook:manage',
  },
};

// frontend/src/config/permissionMapping.ts
export const permissionMapping = {
  '/addressbook': ['addressbook:read'],
  '/addressbook/*': ['addressbook:read'],
};
```

---

## 8. 为其他模块提供 API 支撑

### 8.1 模块集成示例

**项目模块 - 获取项目成员**：
```typescript
// 调用通讯录 API 获取项目成员
const members = await addressbookApi.getContacts({
  department_id: projectDepartmentId,
  type: 'EMPLOYEE',
  fields: 'id,name,position,email,phone',
});
```

**聊天模块 - 搜索用户**：
```typescript
// 搜索用户用于添加好友/群聊
const users = await addressbookApi.search({
  type: 'EMPLOYEE',
  search: query,
  limit: 20,
  fields: 'id,name,email,department_name',
});
```

**邮件模块 - 获取收件人**：
```typescript
// 获取部门员工邮箱列表
const recipients = await addressbookApi.getContacts({
  type: 'EMPLOYEE',
  department_id: departmentId,
  fields: 'id,name,email',
});
```

**会议模块 - 选择参会人**：
```typescript
// 快速选择参会人员
const participants = await addressbookApi.search({
  type: 'EMPLOYEE',
  limit: 50,
  fields: 'id,name,department_name,position',
});
```

---

## 9. 性能优化

### 9.1 数据库优化
- 使用视图避免多表关联查询
- 为常用查询字段创建索引
- 支持分页减少数据传输量

### 9.2 前端优化
- 部门树使用虚拟滚动（大量部门时）
- 列表使用分页或无限滚动
- 搜索使用防抖减少请求频率
- 详情弹窗使用懒加载

---

## 10. 未来扩展

### 10.1 可扩展功能
- **外部联系人**：支持添加客户、供应商等外部联系人
- **收藏夹**：用户可收藏常用联系人
- **最近联系**：显示最近联系的联系人
- **组织架构图**：可视化展示组织结构
- **批量操作**：批量导入、批量更新

### 10.2 第三方集成
- **飞书/Lark 集成**：同步飞书通讯录
- **钉钉集成**：同步钉钉通讯录
- **企业微信集成**：同步企业微信通讯录

---

## 11. 验收标准

### 11.1 功能验收
- [ ] 可以查看所有员工、部门、公司联系人
- [ ] 可以按类型、部门、关键字筛选
- [ ] 可以查看联系人详情
- [ ] 可以导出通讯录（CSV/Excel）
- [ ] 可以按部门树导航
- [ ] 页面加载时间 < 2秒
- [ ] 支持移动端适配

### 11.2 API 验收
- [ ] 列表查询接口返回正确分页数据
- [ ] 详情查询接口返回完整信息
- [ ] 部门树接口返回正确层级结构
- [ ] 导出接口生成正确格式文件
- [ ] 其他模块可正常调用 API

### 11.3 代码质量验收
- [ ] 遵循现有代码规范
- [ ] 添加必要的注释和文档
- [ ] 包含单元测试
- [ ] 无编译警告和错误

---

## 12. 实施计划

详见 `docs/superpowers/specs/2026-06-01-addressbook-implementation-plan.md`

---

**文档状态**：待审核

**下一步**：
1. 审核设计文档
2. 创建实施计划
3. 开始代码实现
