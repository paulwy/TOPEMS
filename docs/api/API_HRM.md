# TOPEMS-HRM 人力资源管理服务 API 文档

**版本**: v1
**更新日期**: 2026-06-10
**服务地址**: `http://localhost:8011`

---

## 目录

1. [服务概述](#1-服务概述)
2. [初始化向导 API](#2-初始化向导-api)
3. [公司管理 API](#3-公司管理-api)
4. [部门管理 API](#4-部门管理-api)
5. [职位管理 API](#5-职位管理-api)
6. [员工管理 API](#6-员工管理-api)
7. [健康检查 API](#7-健康检查-api)
8. [数据模型](#8-数据模型)

---

## 1. 服务概述

TOPEMS-HRM 是企业人力资源管理系统，提供员工、部门、职位、合同、考勤、薪资等管理功能。

### 1.1 认证方式

所有业务 API 需要通过 IAM 服务认证，使用 Bearer Token：

```
Authorization: Bearer <token>
```

### 1.2 响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

### 1.3 错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 500 | 服务器内部错误 |

---

## 2. 初始化向导 API

### 2.1 获取初始化进度

```
GET /api/v1/hrm/setup/progress
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "is_completed": false,
    "current_step": 2,
    "steps": [
      { "name": "company_info", "order": 1, "status": "completed", "is_current": false },
      { "name": "departments", "order": 2, "status": "in_progress", "is_current": true },
      { "name": "positions", "order": 3, "status": "pending", "is_current": false },
      { "name": "admin_user", "order": 4, "status": "pending", "is_current": false },
      { "name": "completion", "order": 5, "status": "pending", "is_current": false }
    ],
    "company_id": "00000000-0000-0000-0000-000000000001"
  }
}
```

### 2.2 更新公司信息

```
POST /api/v1/hrm/setup/company
```

**请求体**：
```json
{
  "name": "TOPEMS科技有限公司",
  "short_name": "TOPEMS",
  "registration_number": "91310000XXXXXXXXXX",
  "tax_number": "310XXXXXXXXXXXXX",
  "address": "上海市浦东新区...",
  "contact_phone": "400-123-4567",
  "email": "hr@topems.com",
  "website": "https://www.topems.com",
  "description": "专注于企业管理系统研发"
}
```

### 2.3 批量创建部门

```
POST /api/v1/hrm/setup/departments
```

**请求体**：
```json
{
  "departments": [
    { "name": "技术部", "code": "TECH" },
    { "name": "人力资源部", "code": "HR" },
    { "name": "财务部", "code": "FIN" }
  ]
}
```

### 2.4 批量创建职位

```
POST /api/v1/hrm/setup/positions
```

**请求体**：
```json
{
  "positions": [
    { "name": "软件工程师", "code": "SE", "level": 3 },
    { "name": "技术经理", "code": "TM", "level": 5 }
  ]
}
```

### 2.5 创建管理员账户

```
POST /api/v1/hrm/setup/admin
```

**请求体**：
```json
{
  "name": "张三",
  "employee_number": "ADMIN001",
  "gender": "male",
  "hire_date": "2026-06-10",
  "department_id": "uuid",
  "position_id": "uuid",
  "email": "admin@topems.com",
  "phone": "13800138000",
  "password": "secure_password"
}
```

### 2.6 完成初始化

```
POST /api/v1/hrm/setup/complete
```

**请求体**：
```json
{
  "confirm": true
}
```

---

## 3. 公司管理 API

### 3.1 获取公司列表

```
GET /api/v1/hrm/companies?page=1&page_size=20&search=关键词
```

### 3.2 获取公司详情

```
GET /api/v1/hrm/companies/{id}
```

### 3.3 创建公司

```
POST /api/v1/hrm/companies
```

**请求体**：
```json
{
  "organization_id": "uuid",
  "name": "公司名称",
  "short_name": "简称",
  "registration_number": "注册号",
  "status": "active"
}
```

### 3.4 更新公司

```
PUT /api/v1/hrm/companies/{id}
```

### 3.5 删除公司

```
DELETE /api/v1/hrm/companies/{id}
```

---

## 4. 部门管理 API

### 4.1 获取部门列表

```
GET /api/v1/hrm/departments?page=1&page_size=20&company_id=uuid&status=active
```

### 4.2 获取部门详情

```
GET /api/v1/hrm/departments/{id}
```

### 4.3 创建部门

```
POST /api/v1/hrm/departments
```

**请求体**：
```json
{
  "organization_id": "uuid",
  "company_id": "uuid",
  "name": "部门名称",
  "code": "DEPT",
  "parent_id": "uuid",
  "manager_id": "uuid",
  "description": "部门描述",
  "status": "active"
}
```

### 4.4 更新部门

```
PUT /api/v1/hrm/departments/{id}
```

### 4.5 删除部门

```
DELETE /api/v1/hrm/departments/{id}
```

---

## 5. 职位管理 API

### 5.1 获取职位列表

```
GET /api/v1/hrm/positions?page=1&page_size=20&company_id=uuid&department_id=uuid
```

### 5.2 获取职位详情

```
GET /api/v1/hrm/positions/{id}
```

### 5.3 创建职位

```
POST /api/v1/hrm/positions
```

**请求体**：
```json
{
  "organization_id": "uuid",
  "company_id": "uuid",
  "department_id": "uuid",
  "name": "职位名称",
  "code": "POS",
  "level": 3,
  "min_salary": 10000,
  "max_salary": 30000,
  "description": "职位描述",
  "requirements": "职位要求"
}
```

### 5.4 更新职位

```
PUT /api/v1/hrm/positions/{id}
```

### 5.5 删除职位

```
DELETE /api/v1/hrm/positions/{id}
```

---

## 6. 员工管理 API

### 6.1 获取员工列表

```
GET /api/v1/hrm/employees?page=1&page_size=20&company_id=uuid&department_id=uuid&status=active
```

### 6.2 获取员工详情

```
GET /api/v1/hrm/employees/{id}
```

### 6.3 创建员工

```
POST /api/v1/hrm/employees
```

**请求体**：
```json
{
  "organization_id": "uuid",
  "company_id": "uuid",
  "department_id": "uuid",
  "position_id": "uuid",
  "employee_number": "EMP001",
  "name": "员工姓名",
  "gender": "male",
  "birth_date": "1990-01-01",
  "id_card_number": "身份证号",
  "hire_date": "2026-01-01",
  "email": "email@company.com",
  "phone": "手机号",
  "status": "active"
}
```

### 6.4 更新员工

```
PUT /api/v1/hrm/employees/{id}
```

### 6.5 删除员工

```
DELETE /api/v1/hrm/employees/{id}
```

---

## 7. 健康检查 API

### 7.1 基础健康检查

```
GET /api/v1/health
```

### 7.2 详细健康检查

```
GET /api/v1/health/detailed
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "service_name": "topems-hrm",
    "status": "healthy",
    "uptime": "2 hours 30 minutes",
    "message": "所有服务运行正常",
    "dependencies": [
      { "name": "database", "status": "healthy", "message": "数据库连接正常" },
      { "name": "iam-service", "status": "healthy", "message": "IAM 服务正常" }
    ]
  }
}
```

### 7.3 服务指标

```
GET /api/v1/metrics
```

---

## 8. 数据模型

### 8.1 Company (公司)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| name | VARCHAR(255) | 公司名称 |
| short_name | VARCHAR(100) | 简称 |
| registration_number | VARCHAR(50) | 注册号 |
| tax_number | VARCHAR(50) | 税务登记号 |
| address | TEXT | 地址 |
| contact_phone | VARCHAR(20) | 联系电话 |
| email | VARCHAR(100) | 邮箱 |
| website | VARCHAR(255) | 官网 |
| description | TEXT | 描述 |
| status | VARCHAR(20) | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 8.2 Department (部门)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| company_id | UUID | 公司ID |
| name | VARCHAR(255) | 部门名称 |
| code | VARCHAR(50) | 部门代码 |
| parent_id | UUID | 上级部门ID |
| manager_id | UUID | 部门经理ID |
| description | TEXT | 描述 |
| status | VARCHAR(20) | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 8.3 Position (职位)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| company_id | UUID | 公司ID |
| department_id | UUID | 所属部门ID |
| name | VARCHAR(255) | 职位名称 |
| code | VARCHAR(50) | 职位代码 |
| level | INTEGER | 职级 |
| min_salary | DECIMAL | 最低薪资 |
| max_salary | DECIMAL | 最高薪资 |
| description | TEXT | 描述 |
| requirements | TEXT | 任职要求 |
| status | VARCHAR(20) | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 8.4 Employee (员工)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| company_id | UUID | 公司ID |
| department_id | UUID | 部门ID |
| position_id | UUID | 职位ID |
| employee_number | VARCHAR(50) | 员工编号 |
| name | VARCHAR(100) | 姓名 |
| gender | VARCHAR(20) | 性别 |
| birth_date | DATE | 出生日期 |
| id_card_number | VARCHAR(18) | 身份证号 |
| hire_date | DATE | 入职日期 |
| email | VARCHAR(100) | 邮箱 |
| phone | VARCHAR(20) | 手机号 |
| address | TEXT | 住址 |
| status | VARCHAR(20) | 状态 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

---

## 附录：初始化流程说明

系统首次部署时，需要通过初始化向导完成基础数据配置：

1. **步骤1：公司信息** - 完善公司基本信息
2. **步骤2：部门设置** - 创建公司组织架构
3. **步骤3：职位设置** - 创建职位信息
4. **步骤4：管理员账户** - 创建系统管理员
5. **步骤5：完成初始化** - 确认并完成配置

详细API见本文档第2章。

---

**版本**: 1.0.0
**最后更新**: 2026-06-10
