# TOPEMS 系统完整实施方案

## 一、项目概述

TOPEMS (Total Optimized Platform for Enterprise Management System) 是一个面向制造业的企业级综合管理平台，采用微服务架构，包含 IAM、ERP、HRM 等多个核心模块。

### 1.1 技术栈

**后端**
- 编程语言: Rust 1.75+
- Web 框架: Axum 0.8
- 数据库: PostgreSQL 14+
- ORM: SQLx 0.8
- 认证: JWT (JSON Web Token)
- 异步运行时: Tokio

**前端**
- 框架: React 18
- 语言: TypeScript
- 构建工具: Vite
- UI 组件: Tailwind CSS + Lucide Icons
- 状态管理: React Hooks (Context)
- HTTP 客户端: Axios

### 1.2 服务架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Vite)                          │
│                  http://localhost:3000                    │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┼─────────────┐
         ▼            ▼             ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │  IAM    │  │   ERP   │  │  HRM    │
    │ :8002   │  │ :8009   │  │ :8010   │
    └────┬────┘  └────┬────┘  └────┬────┘
         │            │             │
         └────────────┼─────────────┘
                      ▼
              ┌───────────────┐
              │  PostgreSQL   │
              │   :5432       │
              └───────────────┘
```

## 二、当前已实现功能

### 2.1 IAM 服务 (身份认证与访问管理)

**已实现功能:**
- ✅ 用户注册与登录
- ✅ JWT Token 认证
- ✅ 用户管理 (CRUD)
- ✅ 角色管理 (CRUD)
- ✅ 权限管理
- ✅ 审计日志
- ✅ 登录接口无认证保护

**服务端口:** 8002

**API 端点:**
```
POST /api/v1/auth/login          # 用户登录
POST /api/v1/auth/register       # 用户注册
POST /api/v1/auth/logout         # 用户退出

GET  /api/v1/users               # 用户列表
POST /api/v1/users               # 创建用户
GET  /api/v1/users/{id}          # 获取用户详情
PUT  /api/v1/users/{id}          # 更新用户
DELETE /api/v1/users/{id}        # 删除用户

GET  /api/v1/roles               # 角色列表
POST /api/v1/roles               # 创建角色
GET  /api/v1/roles/{id}          # 获取角色详情
PUT  /api/v1/roles/{id}          # 更新角色
DELETE /api/v1/roles/{id}        # 删除角色

GET  /api/v1/permissions         # 权限列表
POST /api/v1/permissions         # 创建权限
GET  /api/v1/permissions/{id}    # 获取权限详情
PUT  /api/v1/permissions/{id}    # 更新权限
DELETE /api/v1/permissions/{id}  # 删除权限

GET  /api/v1/audit-logs          # 审计日志列表
GET  /api/v1/audit-logs/{id}     # 获取审计日志详情
```

**数据库表:**
- `users` - 用户表
- `roles` - 角色表
- `permissions` - 权限表
- `user_roles` - 用户角色关联表
- `role_permissions` - 角色权限关联表
- `audit_logs` - 审计日志表

### 2.2 ERP 服务 (企业资源规划)

**已实现功能:**
- ✅ 公司管理 (CRUD)
- ✅ 部门管理 (CRUD)
- ✅ 员工管理 (CRUD)
- ✅ 员工与 IAM 用户自动关联
- ✅ 创建员工时自动创建 IAM 用户
- ✅ 删除员工时自动删除关联的 IAM 用户
- ✅ 审计日志

**服务端口:** 8009

**API 端点:**
```
GET  /api/v1/companies               # 公司列表
POST /api/v1/companies               # 创建公司
GET  /api/v1/companies/{id}          # 获取公司详情
PUT  /api/v1/companies/{id}          # 更新公司
DELETE /api/v1/companies/{id}        # 删除公司

GET  /api/v1/departments             # 部门列表
POST /api/v1/departments             # 创建部门
GET  /api/v1/departments/{id}        # 获取部门详情
PUT  /api/v1/departments/{id}        # 更新部门
DELETE /api/v1/departments/{id}      # 删除部门

GET  /api/v1/employees               # 员工列表
POST /api/v1/employees               # 创建员工（自动创建 IAM 用户）
GET  /api/v1/employees/{id}          # 获取员工详情
PUT  /api/v1/employees/{id}          # 更新员工
DELETE /api/v1/employees/{id}        # 删除员工（自动删除 IAM 用户）

GET  /api/v1/audit-logs              # 审计日志列表
GET  /api/v1/audit-logs/{id}         # 获取审计日志详情
```

**数据库表:**
- `companies` - 公司表
- `departments` - 部门表
- `employees` - 员工表 (含 user_id 关联 IAM 用户)

**员工与用户关联设计:**
1. 创建员工时，ERP 服务调用 IAM API 创建用户账号
2. 密码由管理员在创建员工时指定
3. 用户和员工是一对一强制关联
4. 删除员工时，自动删除关联的 IAM 用户

### 2.3 HRM 服务 (人力资源管理)

**已实现功能:**
- ✅ 员工管理 (CRUD)
- ✅ 部门管理 (CRUD)
- ✅ 考勤管理 (CRUD)
- ✅ 合同管理 (CRUD)
- ✅ 审计日志

**服务端口:** 8010

**API 端点:**
```
GET  /api/v1/employees               # 员工列表
POST /api/v1/employees               # 创建员工
GET  /api/v1/employees/{id}          # 获取员工详情
PUT  /api/v1/employees/{id}          # 更新员工
DELETE /api/v1/employees/{id}        # 删除员工

GET  /api/v1/departments             # 部门列表
POST /api/v1/departments             # 创建部门
GET  /api/v1/departments/{id}        # 获取部门详情
PUT  /api/v1/departments/{id}        # 更新部门
DELETE /api/v1/departments/{id}      # 删除部门

GET  /api/v1/attendance              # 考勤记录列表
POST /api/v1/attendance              # 创建考勤记录
GET  /api/v1/attendance/{id}         # 获取考勤记录详情
PUT  /api/v1/attendance/{id}         # 更新考勤记录
DELETE /api/v1/attendance/{id}       # 删除考勤记录
POST /api/v1/attendance/check-in     # 签到
POST /api/v1/attendance/check-out    # 签退

GET  /api/v1/contracts               # 合同列表
POST /api/v1/contracts               # 创建合同
GET  /api/v1/contracts/{id}          # 获取合同详情
PUT  /api/v1/contracts/{id}          # 更新合同
DELETE /api/v1/contracts/{id}        # 删除合同

GET  /api/v1/audit-logs              # 审计日志列表
GET  /api/v1/audit-logs/{id}         # 获取审计日志详情
```

**已创建但未启用 API 的数据库表:**
- `positions` - 岗位表
- `leave_requests` - 请假申请表
- `job_openings` - 招聘职位表
- `candidates` - 候选人表
- `interviews` - 面试表
- `payroll_runs` - 薪资发放表
- `payroll_items` - 薪资明细项表
- `performance_reviews` - 绩效评核表
- `performance_goals` - 绩效目标表

### 2.4 前端功能

**已实现页面:**
- ✅ 登录页面 (`/login`)
- ✅ 仪表盘 (`/dashboard`)
- ✅ 用户管理 (`/users`)
- ✅ 角色管理 (`/roles`)
- ✅ 权限管理 (`/permissions`)
- ✅ 公司管理 (`/companies`)
- ✅ 部门管理 (`/departments`)
- ✅ 员工管理 (`/employees`)
- ✅ 考勤管理 (`/hrm-attendance`)
- ✅ 薪酬管理 (`/hrm-payroll`)
- ✅ 绩效管理 (`/hrm-performance`)
- ✅ 招聘管理 (`/hrm-recruitment`)
- ✅ 审计日志 (`/audit`)
- ✅ 报表中心 (`/reports`)

**API 集成:**
- ✅ IAM API 集成 (用户、角色、权限)
- ✅ ERP API 集成 (公司、部门、员工)
- ✅ HRM API 集成 (考勤、合同)

## 三、服务职责划分

### 3.1 ERP vs HRM 管理范围

| 功能模块 | ERP 服务 | HRM 服务 | 说明 |
|---------|----------|----------|------|
| 公司管理 | ✅ 核心管理 | ❌ | 属于企业资源规划范畴 |
| 部门管理 | ✅ 组织架构 | ✅ 同步维护 | 两者都有，建议统一 |
| 员工档案 | ✅ 主数据管理 | ✅ 同步维护 | 两者都有，建议统一 |
| 员工-用户关联 | ✅ 自动创建 | ❌ | ERP 负责调用 IAM |
| 考勤管理 | ❌ | ✅ 核心管理 | 属于人力资源范畴 |
| 合同管理 | ❌ | ✅ 核心管理 | 属于人力资源范畴 |
| 岗位管理 | ❌ | ✅ 待实现 | 数据库表已创建 |
| 请假管理 | ❌ | ✅ 待实现 | 数据库表已创建 |
| 招聘管理 | ❌ | ✅ 待实现 | 数据库表已创建 |
| 薪酬管理 | ❌ | ✅ 待实现 | 数据库表已创建 |
| 绩效管理 | ❌ | ✅ 待实现 | 数据库表已创建 |

### 3.2 建议的职责优化

**短期方案 (已实现):**
- ERP 管理：公司、部门、员工（带自动用户创建）
- HRM 管理：考勤、合同

**长期方案 (待迭代):**
- 统一数据模型，避免员工/部门表重复
- ERP 专注于：供应链、财务、资产
- HRM 专注于：所有人力资源相关功能

## 四、待实现功能 (后续迭代)

### 4.1 HRM 后端 API (高优先级)

需要在 `/services/topems-hrm/backend/src/api/` 目录下创建以下模块：

#### 4.1.1 岗位管理 (position.rs)

**功能:**
- 岗位 CRUD
- 按部门筛选岗位
- 按状态筛选 (active/inactive)
- 薪资范围查询

**API 设计:**
```
GET    /api/v1/positions          # 岗位列表（分页、筛选）
POST   /api/v1/positions          # 创建岗位
GET    /api/v1/positions/{id}     # 获取岗位详情
PUT    /api/v1/positions/{id}     # 更新岗位
DELETE /api/v1/positions/{id}     # 删除岗位
```

**数据模型:**
```rust
pub struct Position {
    pub id: Uuid,
    pub name: String,              // 岗位名称
    pub code: Option<String>,      // 岗位编码
    pub department_id: Option<Uuid>, // 所属部门
    pub level: Option<String>,     // 岗位级别
    pub min_salary: Option<BigDecimal>, // 最低薪资
    pub max_salary: Option<BigDecimal>, // 最高薪资
    pub description: Option<String>, // 岗位描述
    pub requirements: Option<String>, // 任职要求
    pub status: String,            // 状态: active/inactive
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

#### 4.1.2 请假管理 (leave.rs)

**功能:**
- 请假申请 CRUD
- 审批流程 (待审批/已批准/已拒绝)
- 按员工查询请假记录
- 按状态筛选

**API 设计:**
```
GET    /api/v1/leaves                  # 请假列表（分页、筛选）
POST   /api/v1/leaves                  # 提交请假申请
GET    /api/v1/leaves/{id}             # 获取请假详情
PUT    /api/v1/leaves/{id}             # 更新请假申请
DELETE /api/v1/leaves/{id}             # 取消请假申请
PUT    /api/v1/leaves/{id}/approve     # 批准请假
PUT    /api/v1/leaves/{id}/reject      # 拒绝请假
GET    /api/v1/leaves/employee/{emp_id} # 员工请假历史
```

**数据模型:**
```rust
pub struct LeaveRequest {
    pub id: Uuid,
    pub employee_id: Uuid,          // 员工ID
    pub leave_type: String,         // 请假类型: 年假/病假/事假/产假等
    pub start_date: DateTime<Utc>,  // 开始日期
    pub end_date: DateTime<Utc>,    // 结束日期
    pub days: BigDecimal,           // 请假天数
    pub reason: Option<String>,     // 请假原因
    pub status: String,             // 状态: pending/approved/rejected/cancelled
    pub approver_id: Option<Uuid>,  // 审批人ID
    pub approved_at: Option<DateTime<Utc>>, // 审批时间
    pub rejection_reason: Option<String>,   // 拒绝原因
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

#### 4.1.3 招聘管理 (recruitment.rs)

**功能:**
- 招聘职位管理 (job_openings)
- 候选人管理 (candidates)
- 面试管理 (interviews)

**API 设计:**
```
# 招聘职位
GET    /api/v1/job-openings          # 职位列表
POST   /api/v1/job-openings          # 发布职位
GET    /api/v1/job-openings/{id}     # 职位详情
PUT    /api/v1/job-openings/{id}     # 更新职位
DELETE /api/v1/job-openings/{id}     # 关闭职位
PUT    /api/v1/job-openings/{id}/publish # 发布职位
PUT    /api/v1/job-openings/{id}/close   # 关闭职位

# 候选人
GET    /api/v1/candidates            # 候选人列表
POST   /api/v1/candidates            # 添加候选人
GET    /api/v1/candidates/{id}       # 候选人详情
PUT    /api/v1/candidates/{id}       # 更新候选人
DELETE /api/v1/candidates/{id}       # 删除候选人

# 面试
GET    /api/v1/interviews            # 面试列表
POST   /api/v1/interviews            # 安排面试
GET    /api/v1/interviews/{id}       # 面试详情
PUT    /api/v1/interviews/{id}       # 更新面试
DELETE /api/v1/interviews/{id}       # 取消面试
PUT    /api/v1/interviews/{id}/complete # 完成面试（提交结果）
```

#### 4.1.4 薪酬管理 (payroll.rs)

**功能:**
- 薪资发放批次管理 (payroll_runs)
- 薪资明细管理 (payroll_items)
- 自动计算净工资

**API 设计:**
```
# 薪资发放批次
GET    /api/v1/payroll-runs              # 发放列表
POST   /api/v1/payroll-runs              # 创建发放批次
GET    /api/v1/payroll-runs/{id}         # 发放详情
PUT    /api/v1/payroll-runs/{id}         # 更新发放批次
DELETE /api/v1/payroll-runs/{id}         # 删除发放批次
PUT    /api/v1/payroll-runs/{id}/process # 计算薪资
PUT    /api/v1/payroll-runs/{id}/run     # 执行发放

# 薪资明细
GET    /api/v1/payroll-items                     # 薪资明细列表
GET    /api/v1/payroll-items/run/{run_id}        # 批次内的明细
GET    /api/v1/payroll-items/employee/{emp_id}   # 员工薪资历史
POST   /api/v1/payroll-items                     # 添加薪资明细
GET    /api/v1/payroll-items/{id}                # 薪资明细详情
PUT    /api/v1/payroll-items/{id}                # 更新薪资明细
DELETE /api/v1/payroll-items/{id}                # 删除薪资明细
```

#### 4.1.5 绩效管理 (performance.rs)

**功能:**
- 绩效评核管理 (performance_reviews)
- 绩效目标管理 (performance_goals)

**API 设计:**
```
# 绩效评核
GET    /api/v1/performance-reviews              # 评核列表
POST   /api/v1/performance-reviews              # 创建评核
GET    /api/v1/performance-reviews/{id}         # 评核详情
PUT    /api/v1/performance-reviews/{id}         # 更新评核
DELETE /api/v1/performance-reviews/{id}         # 删除评核
GET    /api/v1/performance-reviews/employee/{emp_id} # 员工评核历史

# 绩效目标
GET    /api/v1/performance-goals               # 目标列表
POST   /api/v1/performance-goals               # 创建目标
GET    /api/v1/performance-goals/{id}          # 目标详情
PUT    /api/v1/performance-goals/{id}          # 更新目标
DELETE /api/v1/performance-goals/{id}          # 删除目标
GET    /api/v1/performance-goals/employee/{emp_id} # 员工目标列表
PUT    /api/v1/performance-goals/{id}/update-progress # 更新进度
```

### 4.2 前端页面集成

需要在 `/frontend/src/pages/` 下的现有页面中集成后端 API：

| 页面文件 | 当前状态 | 需要完成 |
|---------|----------|----------|
| HrmAttendancePage.tsx | 已创建 | 集成 HRM API (部分完成) |
| HrmPayrollPage.tsx | 已创建 | 集成 HRM API (待实现) |
| HrmPerformancePage.tsx | 已创建 | 集成 HRM API (待实现) |
| HrmRecruitmentPage.tsx | 已创建 | 集成 HRM API (待实现) |

### 4.3 App.tsx 路由添加

需要在 `App.tsx` 中添加 HRM 模块路由：

```tsx
import HrmAttendancePage from './pages/HrmAttendancePage';
import HrmPayrollPage from './pages/HrmPayrollPage';
import HrmPerformancePage from './pages/HrmPerformancePage';
import HrmRecruitmentPage from './pages/HrmRecruitmentPage';

// 在 Routes 中添加
<Route
    path="/hrm-attendance"
    element={
        <ProtectedRoute requiredPermissions={['hrm:attendance:read']}>
            <ModuleGate module="hrm" action="attendance:read">
                <HrmAttendancePage />
            </ModuleGate>
        </ProtectedRoute>
    }
/>
<Route
    path="/hrm-payroll"
    element={
        <ProtectedRoute requiredPermissions={['hrm:payroll:read']}>
            <ModuleGate module="hrm" action="payroll:read">
                <HrmPayrollPage />
            </ModuleGate>
        </ProtectedRoute>
    }
/>
<Route
    path="/hrm-performance"
    element={
        <ProtectedRoute requiredPermissions={['hrm:performance:read']}>
            <ModuleGate module="hrm" action="performance:read">
                <HrmPerformancePage />
            </ModuleGate>
        </ProtectedRoute>
    }
/>
<Route
    path="/hrm-recruitment"
    element={
        <ProtectedRoute requiredPermissions={['hrm:recruitment:read']}>
            <ModuleGate module="hrm" action="recruitment:read">
                <HrmRecruitmentPage />
            </ModuleGate>
        </ProtectedRoute>
    }
/>
```

## 五、环境配置

### 5.1 数据库配置

**PostgreSQL 要求:**
- 版本: 14 或更高
- 扩展: 需要启用 `uuid-ossp` 扩展

**数据库初始化:**

所有服务在启动时会自动执行数据库迁移，创建所需的表结构。

### 5.2 环境变量配置

**IAM 服务** (`services/topems-iam/backend/.env`):
```env
DATABASE_URL=postgres://username@localhost/topems_iam
SERVER_PORT=8002
JWT_SECRET=topems-jwt-secret
```

**ERP 服务** (`services/topems-erp/backend/.env`):
```env
DATABASE_URL=postgres://username@localhost/topems_erp
PORT=8009
JWT_SECRET=topems-jwt-secret
IAM_API_URL=http://localhost:8002
IAM_ADMIN_USERNAME=admin
IAM_ADMIN_PASSWORD=admin123
```

**HRM 服务** (`services/topems-hrm/backend/.env`):
```env
DATABASE_URL=postgres://username@localhost/topems_hrm
PORT=8010
JWT_SECRET=topems-jwt-secret
```

**前端** (`frontend/.env.development`):
```env
VITE_API_BASE_URL=/api
VITE_IAM_SERVICE_URL=/iam
VITE_ERP_SERVICE_URL=/erp
VITE_HRM_SERVICE_URL=/hrm
```

### 5.3 JWT 密钥统一

**重要**: 所有服务的 `JWT_SECRET` 必须保持一致，否则跨服务认证会失败。

当前统一密钥: `topems-jwt-secret`

## 六、启动流程

### 6.1 本地开发启动

**方式一: 使用脚本 (推荐)**
```bash
# 启动所有服务
./start-local.sh

# 或者单独启动
cd services/topems-iam/backend && cargo run
cd services/topems-erp/backend && cargo run
cd services/topems-hrm/backend && cargo run
cd frontend && npm run dev
```

**方式二: 使用 Docker**
```bash
cd docker
docker-compose -f docker-compose.dev.yml up
```

### 6.2 服务健康检查

启动后访问以下端点确认服务正常：

| 服务 | 健康检查端点 | 预期响应 |
|------|-------------|----------|
| IAM | http://localhost:8002/health | `{"status":"ok"}` |
| ERP | http://localhost:8009/health | `{"status":"ok"}` |
| HRM | http://localhost:8010/health | `{"status":"ok"}` |
| 前端 | http://localhost:3000/ | 登录页面 |

## 七、测试流程

### 7.1 后端测试

```bash
# IAM 服务测试
cd services/topems-iam/backend
cargo test

# ERP 服务测试
cd services/topems-erp/backend
cargo test

# HRM 服务测试
cd services/topems-hrm/backend
cargo test
```

### 7.2 前端测试

```bash
cd frontend
npm run test        # 单元测试
npm run test:e2e    # 端到端测试
```

### 7.3 集成测试

```bash
python scripts/test_api.py
```

## 八、常见问题

### 8.1 401 Unauthorized

**可能原因:**
1. JWT_SECRET 在各服务间不一致
2. Token 已过期
3. 请求未携带 Authorization Header

**解决方法:**
- 确认所有服务的 `JWT_SECRET` 环境变量相同
- 检查 Token 是否有效
- 确认请求头包含 `Authorization: Bearer <token>`

### 8.2 405 Method Not Allowed

**可能原因:**
1. 路由参数格式错误 (Axum 0.8 使用 `{param}` 而非 `:param`)
2. 服务端口配置错误

**解决方法:**
- 检查路由定义，确认使用 `{param}` 格式
- 确认 Vite 代理配置与实际服务端口一致

### 8.3 422 Unprocessable Entity

**可能原因:**
1. 请求体格式不正确
2. 必填字段缺失
3. 日期格式不匹配

**解决方法:**
- 检查请求体是否符合 API 要求
- 确认日期格式为 ISO 8601 (RFC3339) 或 "YYYY-MM-DD"

### 8.4 数据库连接失败

**可能原因:**
1. PostgreSQL 未启动
2. 数据库不存在
3. 连接参数错误

**解决方法:**
- 确认 PostgreSQL 服务正在运行
- 检查 `.env` 中的 `DATABASE_URL`
- 使用 `psql` 命令测试连接

## 九、迭代计划

### Phase 1: 基础功能完善 (当前)
- ✅ 员工-用户自动关联
- ✅ 数据库表创建 (HRM 扩展模块)
- ✅ 前端 HRM 页面框架
- ⏳ 服务编译修复与稳定

### Phase 2: HRM API 实现 (下一阶段)
- 📋 岗位管理 API
- 📋 请假管理 API
- 📋 招聘管理 API
- 📋 薪酬管理 API
- 📋 绩效管理 API

### Phase 3: 前端集成
- 📋 考勤页面 API 集成
- 📋 薪酬页面 API 集成
- 📋 绩效页面 API 集成
- 📋 招聘页面 API 集成
- 📋 权限配置

### Phase 4: 数据统一与优化
- 📋 员工/部门数据模型统一
- 📋 服务间数据同步机制
- 📋 性能优化
- 📋 单元测试覆盖率提升

## 十、文件变更记录

### 已修改文件

**后端 - IAM 服务:**
- `services/topems-iam/backend/.env` - 端口和 JWT_SECRET 配置
- `services/topems-iam/backend/src/main.rs` - 路由格式修复 (Axum 0.8 兼容)

**后端 - ERP 服务:**
- `services/topems-erp/backend/Cargo.toml` - 添加 reqwest 依赖
- `services/topems-erp/backend/src/services/iam_client.rs` - 新增 IAM API 客户端
- `services/topems-erp/backend/src/main.rs` - 数据库迁移 (employees 表添加 user_id)
- `services/topems-erp/backend/src/models/employee.rs` - 添加 user_id 和 password 字段
- `services/topems-erp/backend/src/api/employee.rs` - 员工创建/删除联动 IAM 用户

**后端 - HRM 服务:**
- `services/topems-hrm/backend/src/main.rs` - 新增数据库表 (positions, leave_requests, job_openings, candidates, interviews, payroll_runs, payroll_items, performance_reviews, performance_goals)

**前端:**
- `frontend/vite.config.ts` - 添加 HRM 代理配置
- `frontend/src/config/runtime.ts` - HRM 服务 URL 配置

### 新增文件

**后端 - ERP 服务:**
- `services/topems-erp/backend/src/services/iam_client.rs` - IAM API 客户端

**前端:**
- `frontend/src/pages/HrmAttendancePage.tsx` - 考勤管理页面
- `frontend/src/pages/HrmPayrollPage.tsx` - 薪酬管理页面
- `frontend/src/pages/HrmPerformancePage.tsx` - 绩效管理页面
- `frontend/src/pages/HrmRecruitmentPage.tsx` - 招聘管理页面

## 十一、参考文档

- [API 总览](file:///Users/air/TOPEMS/docs/API_OVERVIEW.md)
- [开发指南](file:///Users/air/TOPEMS/DEVELOPMENT_GUIDE.md)
- [部署指南](file:///Users/air/TOPEMS/DEPLOYMENT_GUIDE.md)
- [快速开始](file:///Users/air/TOPEMS/QUICKSTART.md)
- [权限系统使用指南](file:///Users/air/TOPEMS/docs/权限系统使用指南.md)

---

**文档版本:** v1.0  
**创建日期:** 2025-01-27  
**最后更新:** 2025-01-27  
**维护者:** TOPEMS 开发团队
