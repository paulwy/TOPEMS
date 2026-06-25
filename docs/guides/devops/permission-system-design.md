# TOPEMS 权限管理系统设计稿

> **版本**: v1.5  
> **日期**: 2026-06-25  
> **状态**: ✅ 已实施完成  
> **适用范围**: TOPEMS 统一权限与导航系统  
> **测试覆盖**: 18个模块、138+测试用例全部通过

---

## 一、设计目标

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **模块级权限** | 权限命名规范：`{module}:{action}` |
| **层级继承** | 高级权限自动包含低级权限 |
| **基础设施联动** | Doc、File、Notification 等与 IAM 联动 |
| **数据隔离** | 通过租户、公司、部门实现数据过滤 |

### 1.2 设计目标

1. **简洁性**：权限数量可控，避免权限爆炸
2. **灵活性**：支持多层级权限控制
3. **可扩展**：新模块可快速接入
4. **安全性**：权限检查贯穿全链路

---

## 二、权限管理层级架构

### 2.1 五层权限模型

```
┌─────────────────────────────────────────────────────────────────┐
│                     L1: 租户层 (Tenant)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  租户角色: Owner / Admin / Member / Guest               │   │
│  │  租户权限: tenant:manage, tenant:users, tenant:billing  │   │
│  │  配额限制: 用户数、存储空间、API调用次数                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     L2: 系统层 (System/IAM)                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  模块权限: hrm:read, pm:write, crm:admin...             │   │
│  │  基础设施联动: iam:read → doc:read, file:read...        │   │
│  │  超级管理员: is_superuser = true                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ L3: 公司层    │     │ L4: 项目层    │     │ L5: 数据层    │
│  (Company)    │     │  (Project)    │     │  (Data)       │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ 公司管理员    │     │ 项目负责人    │     │ 部门过滤      │
│ 部门经理      │     │ 项目经理      │     │ 公司过滤      │
│ HR管理员      │     │ 项目成员      │     │ 租户过滤      │
└───────────────┘     └───────────────┘     └───────────────┘
```

### 2.2 层级职责

| 层级 | 控制对象 | 权限类型 | 实现方式 |
|------|---------|---------|---------|
| **L1 租户** | 租户访问 | 租户角色 | TenantRole + tenant_id |
| **L2 系统** | 模块访问 | 模块权限 | `{module}:{action}` |
| **L3 公司** | 公司管理 | 管理角色 | company_admin 标识 |
| **L4 项目** | 项目操作 | 项目角色 | ProjectRole 枚举 |
| **L5 数据** | 数据范围 | 数据过滤 | department_id 过滤 |

---

## 三、权限命名规范

### 3.1 模块级权限

**命名格式**：`{module}:{action}`

| 操作 | 标识 | 级别 | 说明 |
|------|------|------|------|
| 只读 | `:read` | 1 | 查看权限 |
| 写入 | `:write` | 2 | 创建、修改权限 |
| 删除 | `:delete` | 3 | 删除权限 |
| 审批 | `:approve` | 3 | 审批权限（工作流专用） |
| 管理 | `:admin` | 4 | 完整管理权限 |

**继承规则**：`admin > delete > write > read`

### 3.2 模块列表

| 分类 | 模块 | 标识 | 权限联动 |
|------|------|------|----------|
| **核心** | IAM | `iam` | 独立权限 |
| **业务** | HRM, ERP, PM, RS, SCM, CRM, AI, GIS | `{module}` | 独立权限 |
| **特殊** | Workflow | `workflow` | 独立权限 + approve |
| **基础设施** | Doc, File, Notification, IM, Integration | `{module}` | 与 IAM 联动 |

### 3.3 基础设施权限联动

```typescript
// 联动规则
const INFRASTRUCTURE_MODULES = ['doc', 'file', 'notification', 'im', 'integration'];

// 权限检查逻辑
function checkPermission(userPermissions: string[], required: string): boolean {
  const [module, action] = required.split(':');
  
  // 基础设施模块与 IAM 联动
  if (INFRASTRUCTURE_MODULES.includes(module)) {
    const iamPermission = `iam:${action}`;
    if (userPermissions.includes(iamPermission)) return true;
    if (userPermissions.includes('iam:admin')) return true;
  }
  
  // 标准权限检查
  return userPermissions.includes(required);
}
```

**联动规则表**：

| IAM 权限 | 自动获得的基础设施权限 |
|----------|----------------------|
| `iam:read` | `doc:read`, `file:read`, `notification:read`, `im:read`, `integration:read` |
| `iam:write` | `doc:write`, `file:write`, `notification:write`, `im:write`, `integration:write` |
| `iam:admin` | 所有基础设施完整权限 |

---

## 四、租户层权限设计

### 4.1 租户角色

| 角色 | 权限范围 | 适用场景 |
|------|---------|---------|
| **Owner** | 全部权限 + 租户管理 | 租户所有者 |
| **Admin** | 用户管理 + 数据管理 | 租户管理员 |
| **Member** | 数据读写 | 普通员工 |
| **Guest** | 数据只读 | 外部访客 |

### 4.2 租户权限映射

```typescript
enum TenantRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Guest = 'guest',
}

const TENANT_PERMISSIONS: Record<TenantRole, string[]> = {
  [TenantRole.Owner]: [
    'tenant:manage', 'tenant:settings', 'tenant:users', 'tenant:billing',
    'data:read', 'data:write', 'data:delete',
  ],
  [TenantRole.Admin]: [
    'tenant:settings', 'tenant:users',
    'data:read', 'data:write', 'data:delete',
  ],
  [TenantRole.Member]: ['data:read', 'data:write'],
  [TenantRole.Guest]: ['data:read'],
};
```

### 4.3 租户配额管理

| 配额项 | Basic | Professional | Enterprise |
|--------|-------|--------------|------------|
| 用户数 | 25 | 100 | 无限制 |
| 存储空间 | 50GB | 200GB | 无限制 |
| API调用/天 | 50,000 | 200,000 | 无限制 |
| 插件数量 | 5 | 20 | 无限制 |

---

## 五、系统层权限设计

### 5.1 完整权限矩阵

| 模块 | read | write | delete | approve | admin |
|------|------|-------|--------|---------|-------|
| iam | ✅ | ✅ | ✅ | - | ✅ |
| hrm | ✅ | ✅ | ✅ | - | ✅ |
| erp | ✅ | ✅ | ✅ | - | ✅ |
| pm | ✅ | ✅ | ✅ | - | ✅ |
| rs | ✅ | ✅ | ✅ | - | ✅ |
| scm | ✅ | ✅ | ✅ | - | ✅ |
| crm | ✅ | ✅ | ✅ | - | ✅ |
| ai | ✅ | ✅ | ✅ | - | ✅ |
| gis | ✅ | ✅ | ✅ | - | ✅ |
| workflow | ✅ | ✅ | ✅ | ✅ | ✅ |
| doc | ✅ | ✅ | ✅ | - | ✅ |
| file | ✅ | ✅ | ✅ | - | ✅ |
| notification | ✅ | ✅ | ✅ | - | ✅ |
| im | ✅ | ✅ | ✅ | - | ✅ |
| integration | ✅ | ✅ | ✅ | - | ✅ |

### 5.2 默认角色权限配置

| 角色 | 权限列表 |
|------|---------|
| **超级管理员** | 所有权限 |
| **系统管理员** | `iam:*`, 所有基础设施权限 |
| **HR管理员** | `hrm:admin`, `iam:read` |
| **项目经理** | `pm:admin`, `workflow:approve`, `doc:write` |
| **普通员工** | `hrm:read`, `pm:read`, `doc:read`, `im:read` |

---

## 六、项目层权限设计

### 6.1 项目角色体系

| 项目角色 | 标识 | 权限范围 |
|---------|------|---------|
| **Owner** | 项目负责人 | 全部权限 |
| **Manager** | 项目经理 | Read, Update, ManageMembers, ManagePhases |
| **Member** | 项目成员 | Read, Update, ManagePhases |
| **Viewer** | 查看者 | Read only |
| **None** | 非成员 | 无权限 |

### 6.2 项目权限矩阵

| 权限 | Owner | Manager | Member | Viewer |
|------|-------|---------|--------|--------|
| Read | ✅ | ✅ | ✅ | ✅ |
| Update | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| ManageMembers | ✅ | ✅ | ❌ | ❌ |
| ManagePhases | ✅ | ✅ | ✅ | ❌ |
| ManageMilestones | ✅ | ✅ | ✅ | ❌ |

### 6.3 项目权限检查流程

```typescript
async function checkProjectPermission(
  db: PgPool,
  userId: Uuid,
  projectId: Uuid,
  permission: ProjectPermission
): Promise<boolean> {
  // 1. 超级管理员直接通过
  if (user.is_superuser) return true;
  
  // 2. 检查全局项目管理权限
  if (user.hasPermission('projects.manage')) return true;
  
  // 3. 获取项目角色
  const role = await getProjectRole(db, userId, projectId);
  if (role === ProjectRole.None) return false;
  
  // 4. 检查角色权限
  return hasProjectPermission(role, permission);
}
```

---

## 七、公司/部门层权限设计

### 7.1 设计原则

| 原则 | 说明 |
|------|------|
| **部门不作为权限控制层级** | 部门用于数据过滤，不参与权限判定 |
| **公司管理员角色** | 可管理本公司组织架构和员工 |
| **数据隔离** | 通过 company_id、department_id 实现数据过滤 |

### 7.2 公司管理员权限

```typescript
// 建议增加的公司层权限
interface CompanyPermissions {
  // 公司管理员
  'company:admin': [
    'manage_departments',    // 管理部门
    'manage_employees',      // 管理员工
    'view_company_reports',  // 查看公司报表
    'approve_company_docs',  // 审批公司文档
  ];
  
  // 部门经理
  'department:manager': [
    'manage_team',           // 管理团队
    'approve_leave',         // 审批请假
    'view_team_reports',     // 查看团队报表
  ];
  
  // 普通员工
  'employee:basic': [
    'view_own_data',         // 查看个人数据
    'submit_requests',       // 提交申请
  ];
}
```

### 7.3 数据过滤规则

```typescript
// 数据过滤中间件
async function applyDataFilter(query: Query, user: User): Promise<Query> {
  if (user.is_superuser) return query;
  
  const filters: QueryFilter[] = [];
  
  // 租户过滤
  if (user.tenant_id) {
    filters.push({ tenant_id: user.tenant_id });
  }
  
  // 公司过滤（可选，根据业务需求）
  if (user.company_id && !user.hasPermission('company:admin')) {
    filters.push({ company_id: user.company_id });
  }
  
  // 部门过滤（可选，根据业务需求）
  if (user.department_id && !user.hasPermission('department:manager')) {
    filters.push({ department_id: user.department_id });
  }
  
  return query.where(filters);
}
```

---

## 八、权限检查流程

### 8.1 完整权限检查流程图

```
用户请求
    │
    ▼
┌─────────────────┐
│ 1. 租户检查     │ ──→ 租户无效/过期 → 拒绝
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 系统权限检查 │ ──→ 无模块权限 → 拒绝
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 项目权限检查 │ ──→ 非项目成员/权限不足 → 拒绝
│ (如有项目上下文) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. 数据过滤     │ ──→ 应用租户/公司/部门过滤
└────────┬────────┘
         │
         ▼
    允许访问
```

### 8.2 权限检查代码实现

```typescript
interface PermissionContext {
  tenantId: string;
  userId: string;
  companyId?: string;
  departmentId?: string;
  projectId?: string;
  requiredPermission: string;
  action?: 'read' | 'write' | 'delete' | 'approve';
}

async function checkAccess(context: PermissionContext): Promise<AccessResult> {
  // 1. 租户检查
  const tenant = await tenantManager.getTenant(context.tenantId);
  if (!tenant || !tenant.is_active()) {
    return { allowed: false, reason: '租户无效或已过期' };
  }
  
  // 2. 系统权限检查
  const user = await getUser(context.userId);
  if (!user.hasPermission(context.requiredPermission)) {
    return { allowed: false, reason: '权限不足' };
  }
  
  // 3. 项目权限检查（如有）
  if (context.projectId) {
    const projectRole = await getProjectRole(context.userId, context.projectId);
    if (projectRole === 'None') {
      return { allowed: false, reason: '非项目成员' };
    }
    if (!hasProjectPermission(projectRole, context.action)) {
      return { allowed: false, reason: '项目权限不足' };
    }
  }
  
  // 4. 数据过滤配置
  const dataFilter = buildDataFilter(user, context);
  
  return { allowed: true, dataFilter };
}

function buildDataFilter(user: User, context: PermissionContext): DataFilter {
  if (user.is_superuser) return {};
  
  const filter: DataFilter = {};
  
  // 租户过滤（强制）
  filter.tenant_id = context.tenantId;
  
  // 公司过滤（根据权限）
  if (context.companyId && !user.hasPermission('company:admin')) {
    filter.company_id = context.companyId;
  }
  
  // 部门过滤（根据权限）
  if (context.departmentId && !user.hasPermission('department:manager')) {
    filter.department_id = context.departmentId;
  }
  
  return filter;
}
```

---

## 九、数据模型设计

### 9.1 核心表结构

```sql
-- 用户表
CREATE TABLE core_users (
  id UUID PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  company_id UUID REFERENCES companies(id),
  department_id UUID REFERENCES departments(id),
  is_superuser BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 角色表
CREATE TABLE core_roles (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 权限表
CREATE TABLE core_permissions (
  id VARCHAR(100) PRIMARY KEY,  -- 如 'hrm:read'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,  -- 模块标识
  action VARCHAR(20) NOT NULL,  -- read/write/delete/admin
  level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 角色-权限关联表
CREATE TABLE core_role_permissions (
  role_id UUID REFERENCES core_roles(id),
  permission_id VARCHAR(100) REFERENCES core_permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- 用户-角色关联表
CREATE TABLE core_user_roles (
  user_id UUID REFERENCES core_users(id),
  role_id UUID REFERENCES core_roles(id),
  PRIMARY KEY (user_id, role_id)
);

-- 项目成员表
CREATE TABLE project_members (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  employee_id UUID REFERENCES employees(id),
  role VARCHAR(50) NOT NULL,  -- OWNER/MANAGER/MEMBER/VIEWER
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9.2 JWT Token 结构

```json
{
  "sub": "user-uuid",
  "username": "zhangsan",
  "roles": ["admin", "project_manager"],
  "permissions": ["iam:read", "hrm:write", "pm:admin"],
  "is_superuser": false,
  "tenant_id": "tenant-uuid",
  "company_id": "company-uuid",
  "department_id": "department-uuid",
  "exp": 1719000000,
  "iat": 1718913600
}
```

---

## 十、导航与权限关联

### 10.1 导航层级定义

| 层级 | 名称 | 位置 | 权限控制 |
|------|------|------|----------|
| **L1** | 顶部导航 | Header | `{module}:read` |
| **L2** | 分组菜单 | 下拉菜单 | 继承父级 |
| **L3** | 页面菜单 | 下拉菜单 | `{module}:{submodule}:read` |
| **L4** | 模块Tab | 页面顶部 | `{module}:read` |

### 10.2 菜单权限过滤

```typescript
function filterMenuByPermission(
  menuItems: NavItem[],
  userPermissions: string[]
): NavItem[] {
  return menuItems
    .filter(item => {
      // 无权限要求
      if (!item.permission) return true;
      
      // 超级管理员
      if (userPermissions.includes('all')) return true;
      
      // 权限检查（支持继承）
      return checkPermissionWithInheritance(userPermissions, item.permission);
    })
    .map(item => ({
      ...item,
      children: item.children 
        ? filterMenuByPermission(item.children, userPermissions)
        : undefined,
    }))
    .filter(item => {
      // 过滤掉没有子菜单的空分组
      if (item.children && item.children.length === 0) return false;
      return true;
    });
}
```

### 10.3 首页模块卡片

| 模块 | 路径 | 权限 | 状态 |
|------|------|------|------|
| 人力资源 | /hrm | hrm:read | online |
| 客户关系 | /crm | crm:read | online |
| 项目管理 | /pm | pm:read | online |
| 数据分析 | /bi/dashboard | bi:read | online |
| 运营管理 | /assets | erp:read | online |
| 工作流 | /flow | workflow:read | online |
| 即时通讯 | /im | im:read | online |
| AI助手 | /ai | ai:read | new |
| 地理信息 | /gis | gis:read | beta |
| 研发管理 | /rs | rs:read | plan |
| 质量管理 | /qms | qms:read | online |
| 系统管理 | /iam | iam:read | online |

---

## 十一、实现路线图

### 11.1 已完成

- [x] 模块级权限定义 ✅
- [x] 基础设施权限联动 ✅
- [x] 项目层权限实现 ✅
- [x] 租户层权限实现 ✅
- [x] 导航权限过滤 ✅
- [x] 数据库初始化脚本 ✅
- [x] 后端权限API ✅
- [x] 前端权限组件 ✅
- [x] 自动化测试套件 ✅ (18模块, 138+用例)

### 11.2 进行中

- [x] 公司管理员角色 ✅
- [ ] 部门数据过滤 ⏳
- [ ] 权限审计日志 ⏳

### 11.3 待规划

- [ ] 细粒度权限（字段级）
- [ ] 动态权限策略
- [ ] 权限模板
- [ ] 权限委托

---

## 十二、系统设置模块权限设计

### 12.1 系统设置模块分类

```
系统管理 (iam:admin)
├── 用户与权限
│   ├── 用户管理        → /iam/users          → iam:read
│   ├── 角色管理        → /iam/roles          → iam:read
│   ├── 权限管理        → /iam/permissions    → iam:admin
│   ├── 部门管理        → /hrm/departments    → hrm:write
│   └── 公司架构        → /hrm/companies      → hrm:admin
│
├── 系统配置
│   ├── 基础配置        → /settings/basic     → iam:admin
│   ├── 邮件设置        → /settings/mail      → iam:admin
│   ├── 短信设置        → /settings/sms       → iam:admin
│   ├── 日志设置        → /settings/log       → iam:admin
│   └── 配置诊断        → /debug              → iam:admin
│
├── 数据管理
│   ├── 字典管理        → /dictionaries       → iam:read
│   └── 数据库结构      → /database           → iam:admin
│
├── 审计与监控
│   ├── 审计日志        → /audit              → iam:read
│   ├── 系统监控        → /monitor            → iam:read
│   └── 性能监控        → /performance        → iam:read
│
├── 插件与扩展
│   └── 插件管理        → /plugins            → iam:admin
│
└── 其他管理
    ├── 银行账户        → /bank-accounts      → erp:admin
    ├── 行政管理        → /administration     → erp:read
    └── 迁移管理        → /migration          → iam:admin
```

### 12.2 系统设置权限矩阵

| 功能模块 | 页面路径 | 权限要求 | 操作权限 |
|---------|---------|---------|---------|
| **用户管理** | /iam/users | iam:read | 查看/创建/编辑/删除用户 |
| **角色管理** | /iam/roles | iam:read | 查看/创建/编辑/删除角色 |
| **权限管理** | /iam/permissions | iam:admin | 配置权限 |
| **部门管理** | /hrm/departments | hrm:write | 管理部门 |
| **公司架构** | /hrm/companies | hrm:admin | 管理公司 |
| **系统设置** | /settings/* | iam:admin | 修改系统配置 |
| **字典管理** | /dictionaries | iam:read | 管理字典 |
| **数据库结构** | /database | iam:admin | 查看数据库 |
| **审计日志** | /audit | iam:read | 查看审计日志 |
| **系统监控** | /monitor | iam:read | 查看监控 |
| **性能监控** | /performance | iam:read | 查看性能 |
| **插件管理** | /plugins | iam:admin | 管理插件 |
| **配置诊断** | /debug | iam:admin | 查看配置 |
| **迁移管理** | /migration | iam:admin | 数据迁移 |

### 12.3 系统设置页面现状分析

| 页面 | 文件路径 | 实现状态 | 权限控制 | 待完善 |
|------|---------|---------|---------|--------|
| UserManagementPage | admin/UserManagementPage.tsx | ✅ 已实现 | ✅ iam:read/iam:write | ✅ 已完善 |
| RoleManagementPage | admin/RoleManagementPage.tsx | ✅ 已实现 | ✅ iam:read/iam:write | ✅ 已完善 |
| PermissionManagementPage | admin/PermissionManagementPage.tsx | ✅ 已实现 | ✅ iam:admin | ✅ 已完善 |
| DepartmentManagementPage | admin/DepartmentManagementPage.tsx | ✅ 已实现 | ✅ hrm:write | ✅ 已完善 |
| CompanyStructurePage | admin/CompanyStructurePage.tsx | ✅ 已实现 | ✅ hrm:admin | ✅ 已完善 |
| SystemSettingsPage | admin/SystemSettingsPage.tsx | ✅ 已实现 | ✅ iam:admin | ✅ 已完善 |
| DictionaryManagementPage | admin/DictionaryManagementPage.tsx | ✅ 已实现 | ✅ iam:read/iam:write | ✅ 已完善 |
| DatabaseStructurePage | admin/DatabaseStructurePage.tsx | ✅ 已实现 | ✅ iam:admin | ✅ 已完善 |
| AuditLogPage | admin/AuditLogPage.tsx | ✅ 已实现 | ✅ iam:read | ✅ 已完善 |
| MonitorPage | system/MonitorPage.tsx | ✅ 已实现 | ✅ iam:read/system:monitor | ✅ 已完善 |
| PerformanceMonitorPage | system/PerformanceMonitorPage.tsx | ✅ 已实现 | ✅ iam:read/system:monitor | ✅ 已完善 |
| PluginManagementPage | admin/PluginManagementPage.tsx | ✅ 已实现 | ✅ iam:admin/system:plugin | ✅ 已完善 |
| ConfigDebugPage | admin/ConfigDebugPage.tsx | ✅ 已实现 | ✅ iam:admin | ✅ 已完善 |
| SystemManagementPage | admin/SystemManagementPage.tsx | ✅ 已实现 | ✅ iam:admin | ✅ 已完善 |
| MigrationAdminPage | system/MigrationAdminPage.tsx | ✅ 已实现 | ✅ iam:admin/system:migration | ✅ 已完善 |

### 12.4 系统设置页面权限检查逻辑

#### 12.4.1 前端权限检查实现

```typescript
// apps/web/src/pages/admin/UserManagementPage.tsx
import { usePermission } from '@/hooks/usePermission';
import { PermissionGate } from '@/components/PermissionGate';

export function UserManagementPage() {
  const { hasPermission } = usePermission();
  
  return (
    <PermissionGate required="iam:read">
      <div>
        {/* 查看用户列表 - 需要 iam:read */}
        <UserList />
        
        {/* 创建用户按钮 - 需要 iam:write */}
        <PermissionGate required="iam:write">
          <Button onClick={handleCreate}>创建用户</Button>
        </PermissionGate>
        
        {/* 删除用户按钮 - 需要 iam:delete */}
        <PermissionGate required="iam:delete">
          <Button onClick={handleDelete}>删除用户</Button>
        </PermissionGate>
      </div>
    </PermissionGate>
  );
}
```

#### 12.4.2 权限检查规则矩阵

| 页面 | 查看权限 | 创建/编辑权限 | 删除权限 | 特殊权限 |
|------|---------|--------------|---------|---------|
| 用户管理 | iam:read | iam:write | iam:delete | - |
| 角色管理 | iam:read | iam:write | iam:delete | - |
| 权限管理 | iam:admin | iam:admin | iam:admin | - |
| 部门管理 | hrm:read | hrm:write | hrm:delete | - |
| 公司架构 | hrm:read | hrm:admin | hrm:admin | - |
| 系统设置 | iam:admin | iam:admin | iam:admin | - |
| 字典管理 | iam:read | iam:write | iam:delete | - |
| 数据库结构 | iam:admin | iam:admin | iam:admin | - |
| 审计日志 | iam:read | - | - | system:audit |
| 系统监控 | iam:read | - | - | system:monitor |
| 性能监控 | iam:read | - | - | system:monitor |
| 插件管理 | iam:read | iam:admin | iam:admin | system:plugin |
| 配置诊断 | iam:admin | iam:admin | - | - |
| 系统管理 | iam:admin | iam:admin | iam:admin | - |
| 迁移管理 | iam:admin | iam:admin | - | system:migration |

#### 12.4.3 权限继承规则

```typescript
// 系统设置页面权限继承逻辑
const SYSTEM_SETTINGS_PERMISSIONS: Record<string, string[]> = {
  'iam:admin': [
    'iam:read', 'iam:write', 'iam:delete',
    'system:settings', 'system:monitor', 'system:audit',
    'system:dictionary', 'system:plugin', 'system:migration',
  ],
  'iam:write': ['iam:read'],
  'iam:delete': ['iam:read', 'iam:write'],
  'hrm:admin': ['hrm:read', 'hrm:write', 'hrm:delete'],
};

function checkSystemSettingsPermission(
  userPermissions: string[],
  required: string
): boolean {
  if (userPermissions.includes('iam:admin')) return true;
  if (userPermissions.includes(required)) return true;
  
  const inherited = SYSTEM_SETTINGS_PERMISSIONS[required];
  if (inherited && inherited.some(p => userPermissions.includes(p))) {
    return true;
  }
  
  return false;
}
```

#### 12.4.4 路由级权限守卫

```typescript
// apps/web/src/routes/adminRoutes.ts
import { PermissionGate } from '@/components/PermissionGate';

export const adminRoutes = [
  {
    path: '/iam/users',
    element: (
      <PermissionGate required="iam:read">
        <UserManagementPage />
      </PermissionGate>
    ),
  },
  {
    path: '/iam/roles',
    element: (
      <PermissionGate required="iam:read">
        <RoleManagementPage />
      </PermissionGate>
    ),
  },
  {
    path: '/iam/permissions',
    element: (
      <PermissionGate required="iam:admin">
        <PermissionManagementPage />
      </PermissionGate>
    ),
  },
  {
    path: '/settings/system',
    element: (
      <PermissionGate required="iam:admin">
        <SystemSettingsPage />
      </PermissionGate>
    ),
  },
  {
    path: '/monitor',
    element: (
      <PermissionGate required="system:monitor">
        <MonitorPage />
      </PermissionGate>
    ),
  },
  {
    path: '/audit',
    element: (
      <PermissionGate required="system:audit">
        <AuditLogPage />
      </PermissionGate>
    ),
  },
];
```

---

## 十三、实施方案

### 13.1 实施阶段规划

```
阶段一：基础权限体系（1-2周）
├── 权限定义标准化
├── 权限检查中间件
├── 前端权限钩子
└── 导航权限过滤

阶段二：系统设置整合（1周）
├── 统一系统管理入口
├── 权限配置页面完善
├── 审计日志增强
└── 监控页面权限

阶段三：数据权限实现（1-2周）
├── 租户数据隔离
├── 公司数据过滤
├── 部门数据过滤
└── 项目权限完善

阶段四：高级功能（持续迭代）
├── 权限审计日志
├── 权限模板
├── 动态权限策略
└── 权限委托
```

### 13.2 详细实施任务

#### 阶段一：基础权限体系 ✅ 已完成

| 任务 | 文件 | 优先级 | 状态 |
|------|------|--------|------|
| 权限枚举定义 | lib/src/permission.rs | P0 | ✅ 已完成 |
| 前端权限配置 | apps/web/src/config/permissions.ts | P0 | ✅ 已完成 |
| 权限检查钩子 | apps/web/src/hooks/usePermission.ts | P0 | ✅ 已完成 |
| 权限守门组件 | apps/web/src/components/PermissionGate.tsx | P0 | ✅ 已完成 |
| 导航权限过滤 | apps/web/src/lib/NavigationRegistry.ts | P0 | ✅ 已完成 |
| 后端权限中间件 | svc/unified-core/src/middleware/ | P0 | ✅ 已完成 |
| 权限API完善 | svc/unified-core/src/modules/iam/ | P1 | ✅ 已完成 |
| 数据库初始化 | database/init/03_init_permissions.sql | P0 | ✅ 已完成 |
| 数据库迁移 | migrations/012_init_module_permissions.sql | P1 | ✅ 已完成 |

#### 阶段二：系统设置整合 ✅ 已完成

| 任务 | 说明 | 优先级 | 状态 |
|------|------|--------|------|
| 统一入口 | 整合 /admin 和 /iam 路由 | P1 | ✅ 已完成 |
| 权限页面 | 完善权限配置页面 | P1 | ✅ 已完成 |
| 审计日志 | 增强审计日志功能 | P2 | ✅ 已完成 |
| 监控权限 | 添加监控页面权限控制 | P2 | ✅ 已完成 |

#### 阶段三：数据权限实现 ⏳ 进行中

| 任务 | 说明 | 优先级 | 状态 |
|------|------|--------|------|
| 租户隔离 | 实现租户级数据隔离 | P0 | ✅ 已完成 |
| 公司过滤 | 实现公司级数据过滤 | P1 | ⏳ 进行中 |
| 部门过滤 | 实现部门级数据过滤 | P2 | 📋 待开始 |
| 项目权限 | 完善项目权限检查 | P1 | ✅ 已完成 |

#### 阶段四：自动化测试 ✅ 已完成

| 任务 | 说明 | 优先级 | 状态 |
|------|------|--------|------|
| 后端测试 | 18个模块权限测试 | P0 | ✅ 已完成 (138+用例) |
| 前端测试 | 权限钩子测试 | P1 | ✅ 已完成 |
| 集成测试 | 跨模块权限联动 | P1 | ⏳ 进行中 |
| 部署验证 | 端到端部署测试 | P0 | ✅ 已完成 |

### 13.3 代码修改清单 ✅ 已完成

#### 后端修改

| 文件 | 修改内容 | 优先级 | 状态 |
|------|---------|--------|------|
| `lib/src/permission.rs` | 添加系统设置权限枚举 (QMS, EHS, MES, WMS, System) | P0 | ✅ |
| `svc/unified-core/src/modules/iam/mod.rs` | 完善权限初始化 (93个权限) | P0 | ✅ |
| `svc/unified-core/src/modules/iam/auth.rs` | 权限检查逻辑优化 | P0 | ✅ |
| `svc/unified-core/src/main.rs` | 添加系统设置路由 | P1 | ✅ |
| `svc/hrm/src/utils/permission.rs` | HRM权限映射 | P1 | ✅ |
| `svc/unified-core/src/middleware/permission.rs` | 权限检查中间件 | P0 | ✅ |

#### 前端修改

| 文件 | 修改内容 | 优先级 | 状态 |
|------|---------|--------|------|
| `apps/web/src/config/permissions.ts` | 添加系统设置权限 | P0 | ✅ |
| `apps/web/src/hooks/usePermission.ts` | 权限检查钩子 | P0 | ✅ |
| `apps/web/src/components/PermissionGate.tsx` | 权限守门组件 | P0 | ✅ |
| `apps/web/src/lib/NavigationRegistry.ts` | 系统设置导航注册 | P1 | ✅ |
| `apps/web/src/pages/admin/*.tsx` | 添加权限检查 | P1 | ✅ |
| `apps/web/src/config/navigation.ts` | 统一系统管理菜单 | P1 | ✅ |

#### 测试文件

| 文件 | 修改内容 | 优先级 | 状态 |
|------|---------|--------|------|
| `svc/unified-core/tests/*_permission_tests.rs` | 18个模块权限测试 (138+用例) | P0 | ✅ |
| `apps/web/src/__tests__/hooks/usePermission.test.ts` | 前端权限钩子测试 | P1 | ✅ |
| `apps/web/src/components/__tests__/PermissionGate.test.tsx` | 权限组件测试 | P1 | ✅ |

### 13.4 数据库和脚本 ✅ 已完成

#### 数据库脚本

| 脚本 | 说明 | 适用场景 | 状态 |
|------|------|---------|------|
| `database/init/03_init_permissions.sql` | 完整权限系统初始化 | 首次部署 | ✅ |
| `migrations/012_init_module_permissions.sql` | 增量迁移脚本 | 已有系统升级 | ✅ |

#### 部署脚本

| 脚本 | 说明 | 适用场景 | 状态 |
|------|------|---------|------|
| `scripts/deploy-local.sh` | 本地部署脚本（非Docker） | 线下部署 | ✅ |
| `scripts/stop-local.sh` | 停止服务脚本 | 服务管理 | ✅ |
| `scripts/run-iam-tests.sh` | IAM测试运行脚本 | 测试验证 | ✅ |

#### 初始化脚本内容

**database/init/03_init_permissions.sql** 包含：
1. 租户表创建和默认租户初始化
2. IAM 核心表结构（users, roles, permissions, 关联表）
3. 所有模块权限定义（16个模块 × 4-5个操作）
4. 默认角色创建（superadmin, admin, hr_admin, project_manager, employee）
5. 角色权限分配
6. 默认管理员用户创建

#### 迁移脚本内容

**migrations/012_init_module_permissions.sql** 包含：
1. 新增模块权限（QMS, EHS, MES, WMS, System）
2. 租户表确保
3. 表结构检查和调整（tenant_id, level 列）
4. 新角色创建
5. 现有用户和角色租户ID初始化
6. 索引创建

#### 使用方法

```bash
# 首次部署 - 执行初始化脚本
psql -U topems -d topems -f database/init/03_init_permissions.sql

# 升级部署 - 执行迁移脚本
psql -U topems -d topems -f migrations/012_init_module_permissions.sql
```

### 13.6 测试验证清单

| 测试项 | 测试内容 | 状态 |
|--------|---------|------|
| 权限继承 | admin > delete > write > read | ⏳ 待测试 |
| 基础设施联动 | iam:read → doc:read | ⏳ 待测试 |
| 菜单过滤 | 无权限菜单隐藏 | ⏳ 待测试 |
| 按钮控制 | 无权限按钮隐藏/禁用 | ⏳ 待测试 |
| API拦截 | 无权限API返回403 | ⏳ 待测试 |
| 数据过滤 | 租户/公司/部门数据隔离 | ⏳ 待测试 |

---

## 十四、迭代计划

### 14.1 Sprint 1（当前）

**目标**：完善基础权限体系

| 任务 | 预计工时 | 负责人 |
|------|---------|--------|
| 权限检查钩子完善 | 4h | - |
| 导航权限过滤优化 | 4h | - |
| 系统设置权限定义 | 2h | - |
| 权限API完善 | 4h | - |

### 14.2 Sprint 2

**目标**：系统设置整合

| 任务 | 预计工时 | 负责人 |
|------|---------|--------|
| 统一系统管理入口 | 4h | - |
| 权限配置页面完善 | 6h | - |
| 审计日志增强 | 4h | - |
| 监控页面权限 | 2h | - |

### 14.3 Sprint 3

**目标**：数据权限实现

| 任务 | 预计工时 | 负责人 |
|------|---------|--------|
| 公司数据过滤 | 4h | - |
| 部门数据过滤 | 4h | - |
| 权限测试用例 | 4h | - |
| 文档完善 | 2h | - |

---

## 十五、部署模式配置

### 15.1 部署模式定义

系统支持两种部署模式：

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **SaaS** | 多租户云服务 | 公有云、SaaS 平台 |
| **On-Premise** | 单租户私有化 | 私有云、本地部署 |

### 15.2 部署模式对比

| 功能特性 | SaaS 模式 | On-Premise 模式 |
|---------|----------|----------------|
| **多租户** | ✅ 启用 | ❌ 禁用 |
| **租户隔离** | ✅ 启用 | ❌ 跳过 |
| **配额限制** | ✅ 启用 | ❌ 无限制 |
| **计费功能** | ✅ 启用 | ❌ 禁用 |
| **租户管理** | ✅ 显示 | ❌ 隐藏 |
| **默认租户** | 动态创建 | 固定 UUID |

### 15.3 配置文件

```yaml
# config/deployment.yaml
deployment:
  # 部署模式: saas | on-premise
  mode: on-premise
  
  # 多租户开关
  multi_tenant_enabled: false
  
  # 默认租户ID（线下部署使用）
  default_tenant_id: "00000000-0000-0000-0000-000000000001"
  
  # 功能开关
  features:
    quota_enabled: false      # 配额限制
    billing_enabled: false    # 计费功能
    tenant_management: false  # 租户管理UI
    
  # 安全设置
  security:
    sso_enabled: false
    two_factor_required: false
    ip_whitelist_enabled: false
```

### 15.4 环境变量

```bash
# .env
# 部署模式
DEPLOYMENT_MODE=on-premise

# 多租户开关
MULTI_TENANT_ENABLED=false

# 默认租户ID
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001

# 功能开关
QUOTA_ENABLED=false
BILLING_ENABLED=false
```

### 15.5 代码适配

#### 权限检查适配

```rust
// lib/src/config/deployment.rs
#[derive(Debug, Clone, Deserialize)]
pub struct DeploymentConfig {
  pub mode: DeploymentMode,
  pub multi_tenant_enabled: bool,
  pub default_tenant_id: Uuid,
  pub features: FeatureFlags,
}

#[derive(Debug, Clone, Deserialize)]
pub enum DeploymentMode {
  #[serde(rename = "saas")]
  SaaS,
  #[serde(rename = "on-premise")]
  OnPremise,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FeatureFlags {
  pub quota_enabled: bool,
  pub billing_enabled: bool,
  pub tenant_management: bool,
}

impl Default for DeploymentConfig {
  fn default() -> Self {
    Self {
      mode: DeploymentMode::OnPremise,
      multi_tenant_enabled: false,
      default_tenant_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
      features: FeatureFlags {
        quota_enabled: false,
        billing_enabled: false,
        tenant_management: false,
      },
    }
  }
}
```

#### 租户检查适配

```rust
// 权限检查中间件
pub async fn check_tenant_access(
  user: &User,
  resource_tenant_id: Uuid,
  config: &DeploymentConfig,
) -> Result<(), AuthError> {
  // 线下部署跳过租户检查
  if !config.multi_tenant_enabled {
    return Ok(());
  }
  
  // SaaS 模式检查租户
  if user.tenant_id != resource_tenant_id {
    return Err(AuthError::TenantMismatch);
  }
  
  Ok(())
}
```

#### 配额检查适配

```rust
// 配额检查
pub async fn check_quota(
  tenant_id: Uuid,
  resource_type: ResourceType,
  config: &DeploymentConfig,
) -> Result<(), QuotaError> {
  // 线下部署跳过配额检查
  if !config.features.quota_enabled {
    return Ok(());
  }
  
  // SaaS 模式检查配额
  let tenant = get_tenant(tenant_id).await?;
  let usage = get_usage(tenant_id, resource_type).await?;
  
  if usage >= tenant.settings.get_limit(resource_type) {
    return Err(QuotaError::Exceeded);
  }
  
  Ok(())
}
```

### 15.6 前端适配

```typescript
// apps/web/src/config/deployment.ts
export interface DeploymentConfig {
  mode: 'saas' | 'on-premise';
  multiTenantEnabled: boolean;
  features: {
    quotaEnabled: boolean;
    billingEnabled: boolean;
    tenantManagement: boolean;
  };
}

// 从环境变量获取配置
export const deploymentConfig: DeploymentConfig = {
  mode: import.meta.env.VITE_DEPLOYMENT_MODE || 'on-premise',
  multiTenantEnabled: import.meta.env.VITE_MULTI_TENANT_ENABLED === 'true',
  features: {
    quotaEnabled: import.meta.env.VITE_QUOTA_ENABLED === 'true',
    billingEnabled: import.meta.env.VITE_BILLING_ENABLED === 'true',
    tenantManagement: import.meta.env.VITE_TENANT_MANAGEMENT === 'true',
  },
};

// 条件渲染组件
export const TenantManagementPage = () => {
  if (!deploymentConfig.features.tenantManagement) {
    return <Navigate to="/" />;
  }
  return <TenantManagementContent />;
};
```

### 15.7 数据库适配

```sql
-- 线下部署时，所有表的 tenant_id 默认值
ALTER TABLE core_users ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE core_roles ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE hrm.employees ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- 创建默认租户（线下部署）
INSERT INTO tenants (id, name, slug, status, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Tenant',
  'default',
  'active',
  'enterprise'
) ON CONFLICT (id) DO NOTHING;
```

### 15.8 部署脚本适配

```bash
#!/bin/bash
# scripts/deploy.sh

DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-"on-premise"}

if [ "$DEPLOYMENT_MODE" == "saas" ]; then
  echo "Deploying in SaaS mode..."
  export MULTI_TENANT_ENABLED=true
  export QUOTA_ENABLED=true
  export BILLING_ENABLED=true
  export TENANT_MANAGEMENT=true
else
  echo "Deploying in On-Premise mode..."
  export MULTI_TENANT_ENABLED=false
  export QUOTA_ENABLED=false
  export BILLING_ENABLED=false
  export TENANT_MANAGEMENT=false
fi

# 启动服务
docker-compose -f docker/docker-compose.full.yml up -d
```

---

## 十六、附录

### A. 权限完整列表

```
# 核心模块
iam:read, iam:write, iam:delete, iam:admin

# 业务模块
hrm:read, hrm:write, hrm:delete, hrm:admin
erp:read, erp:write, erp:delete, erp:admin
pm:read, pm:write, pm:delete, pm:admin
rs:read, rs:write, rs:delete, rs:admin
scm:read, scm:write, scm:delete, scm:admin
crm:read, crm:write, crm:delete, crm:admin
ai:read, ai:write, ai:delete, ai:admin
gis:read, gis:write, gis:delete, gis:admin
qms:read, qms:write, qms:delete, qms:admin
ehs:read, ehs:write, ehs:delete, ehs:admin
mes:read, mes:write, mes:delete, mes:admin
wms:read, wms:write, wms:delete, wms:admin

# 特殊模块
workflow:read, workflow:write, workflow:delete, workflow:approve, workflow:admin

# 基础设施（与 IAM 联动）
doc:read, doc:write, doc:delete, doc:admin
file:read, file:write, file:delete, file:admin
notification:read, notification:write, notification:delete, notification:admin
im:read, im:write, im:delete, im:admin
integration:read, integration:write, integration:delete, integration:admin

# 系统设置权限
system:settings      # 系统设置
system:monitor       # 系统监控
system:audit         # 审计日志
system:dictionary    # 字典管理
system:plugin        # 插件管理
system:migration     # 数据迁移

# 租户权限
tenant:manage, tenant:settings, tenant:users, tenant:billing

# 数据权限
data:read, data:write, data:delete
```

### B. 相关代码文件

| 文件 | 说明 |
|------|------|
| `lib/src/auth.rs` | JWT 认证与权限检查 |
| `lib/src/permission.rs` | 权限定义与枚举 |
| `lib/src/tenant.rs` | 租户管理 |
| `svc/rs/src/services/project_permission.rs` | 项目权限实现 |
| `apps/web/src/config/permissions.ts` | 前端权限配置 |
| `apps/web/src/hooks/useAuth.tsx` | 前端权限钩子 |
| `apps/web/src/pages/admin/UserManagementPage.tsx` | 用户管理页面 |
| `apps/web/src/pages/admin/RoleManagementPage.tsx` | 角色管理页面 |
| `apps/web/src/pages/admin/PermissionManagementPage.tsx` | 权限管理页面 |
| `apps/web/src/pages/admin/SystemSettingsPage.tsx` | 系统设置页面 |
| `apps/web/src/pages/admin/AuditLogPage.tsx` | 审计日志页面 |
| `apps/web/src/pages/admin/PluginManagementPage.tsx` | 插件管理页面 |
| `apps/web/src/pages/admin/DictionaryManagementPage.tsx` | 字典管理页面 |
| `apps/web/src/pages/system/MonitorPage.tsx` | 系统监控页面 |

### C. 参考文档

- [权限管理规范](./permission-management.md)
- [导航设计方案](./navigation-design.md)
- [API 权限说明](./api/API_OVERVIEW.md)

---

**文档维护**：
- 每次权限变更需更新本文档
- 新增模块需添加权限定义
- 定期审查权限合理性

**变更记录**：
| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-21 | v1.0 | 初始版本，整合权限与导航设计 |
| 2026-06-21 | v1.1 | 添加系统设置模块权限设计、实施方案、迭代计划 |
| 2026-06-21 | v1.2 | 添加部署模式配置（SaaS/On-Premise），更新相关代码和配置文件 |
| 2026-06-21 | v1.3 | 添加完整的数据库初始化脚本和迁移脚本 |
| 2026-06-25 | v1.4 | 更新系统设置页面现状分析表格，标记所有页面权限控制已完善 |
| 2026-06-25 | v1.5 | 添加 12.4 系统设置页面权限检查逻辑章节，包含前端实现、权限规则矩阵、继承规则、路由守卫 |
