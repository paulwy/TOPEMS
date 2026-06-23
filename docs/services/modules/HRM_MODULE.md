# HRM模块技术文档

## 1. 概述

HRM（人力资源管理）模块是TOPEMS平台的核心业务模块之一，提供员工管理、考勤管理、薪资管理、招聘管理等人力资源相关功能。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 员工管理 | 员工信息管理、组织架构、职位管理 |
| 考勤管理 | 打卡记录、请假申请、加班管理 |
| 薪资管理 | 工资核算、社保公积金、薪资报表 |
| 招聘管理 | 招聘流程、候选人管理、面试安排 |
| 培训管理 | 培训计划、课程管理、培训记录 |
| 绩效管理 | 绩效考核、目标管理、评估结果 |
| 合同管理 | 劳动合同、续签提醒、合同台账 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      HRM模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── hrm/                                              │
│  │       ├── EmployeePage.tsx      # 员工管理页            │
│  │       ├── AttendancePage.tsx    # 考勤管理页            │
│  │       ├── PayrollPage.tsx       # 薪资管理页            │
│  │       └── RecruitmentPage.tsx   # 招聘管理页            │
│  └── components/                                           │
│      └── hrm/                                              │
│          └── EmployeeForm.tsx      # 员工表单组件          │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── hrm.ts               # HRM API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── employee.rs      # 员工管理                      │
│  │   ├── attendance.rs    # 考勤管理                      │
│  │   ├── payroll.rs       # 薪资管理                      │
│  │   ├── recruitment.rs   # 招聘管理                      │
│  │   ├── training.rs      # 培训管理                      │
│  │   ├── performance.rs   # 绩效管理                      │
│  │   └── contract.rs      # 合同管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 员工管理

#### 2.1.1 员工信息管理

**功能说明**：管理员工基本信息、组织架构、职位分配等。

**数据模型**：

```typescript
interface Employee {
  id: string;                    // 员工ID
  name: string;                  // 姓名
  employee_no: string;           // 工号
  department_id: string;         // 部门ID
  department_name: string;       // 部门名称
  position_id: string;           // 职位ID
  position_name: string;         // 职位名称
  email: string;                 // 邮箱
  phone: string;                 // 电话
  status: 'active' | 'inactive'; // 状态
  hire_date: string;             // 入职日期
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

**使用示例**：

```tsx
import { useState, useEffect } from 'react';
import { hrmApi } from '../api/hrm';

const EmployeeList = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const response = await hrmApi.listEmployees();
    if (response.success) {
      setEmployees(response.data.data);
    }
  };

  return (
    <div>
      {employees.map(emp => (
        <div key={emp.id}>
          <h3>{emp.name}</h3>
          <p>{emp.department_name} - {emp.position_name}</p>
        </div>
      ))}
    </div>
  );
};
```

#### 2.1.2 组织架构管理

**功能说明**：管理公司部门结构、层级关系。

**数据模型**：

```typescript
interface Department {
  id: string;                    // 部门ID
  name: string;                  // 部门名称
  parent_id: string | null;      // 上级部门ID
  description: string;           // 描述
  manager_id: string;            // 部门经理ID
  created_at: string;            // 创建时间
}
```

### 2.2 考勤管理

#### 2.2.1 打卡记录

**功能说明**：管理员工打卡记录，支持多种打卡方式。

**数据模型**：

```typescript
interface AttendanceRecord {
  id: string;                    // 记录ID
  employee_id: string;           // 员工ID
  employee_name: string;         // 员工姓名
  check_in_time: string;         // 上班时间
  check_out_time?: string;       // 下班时间
  status: 'normal' | 'late' | 'early' | 'absent'; // 状态
  location?: string;             // 打卡地点
  created_at: string;            // 创建时间
}
```

#### 2.2.2 请假管理

**功能说明**：管理员工请假申请流程。

**数据模型**：

```typescript
interface LeaveRequest {
  id: string;                    // 申请ID
  employee_id: string;           // 员工ID
  employee_name: string;         // 员工姓名
  type: 'annual' | 'sick' | 'personal' | 'maternity'; // 请假类型
  start_date: string;            // 开始日期
  end_date: string;              // 结束日期
  duration: number;              // 请假天数
  reason: string;                // 请假原因
  status: 'pending' | 'approved' | 'rejected'; // 状态
  created_at: string;            // 创建时间
}
```

### 2.3 薪资管理

#### 2.3.1 工资核算

**功能说明**：自动核算员工工资，支持多种薪资项目。

**数据模型**：

```typescript
interface Payroll {
  id: string;                    // 薪资ID
  employee_id: string;           // 员工ID
  employee_name: string;         // 员工姓名
  month: string;                 // 薪资月份
  basic_salary: number;          // 基本工资
  bonus: number;                 // 奖金
  overtime_pay: number;          // 加班费
  deductions: number;            // 扣款
  net_salary: number;           // 实发工资
  status: 'calculated' | 'paid'; // 状态
  created_at: string;            // 创建时间
}
```

### 2.4 招聘管理

#### 2.4.1 职位发布

**功能说明**：发布招聘职位，管理候选人简历。

**数据模型**：

```typescript
interface JobPosting {
  id: string;                    // 职位ID
  title: string;                 // 职位名称
  department_id: string;         // 部门ID
  requirements: string;          // 任职要求
  responsibilities: string;      // 岗位职责
  status: 'open' | 'closed';     // 状态
  created_at: string;            // 创建时间
}

interface Candidate {
  id: string;                    // 候选人ID
  name: string;                  // 姓名
  email: string;                 // 邮箱
  phone: string;                 // 电话
  resume_url: string;            // 简历链接
  job_posting_id: string;        // 应聘职位ID
  status: 'applied' | 'interview' | 'offer' | 'rejected'; // 状态
  created_at: string;            // 创建时间
}
```

---

## 3. API接口文档

### 3.1 员工管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取员工列表 | GET | `/api/v1/employees` |
| 获取单个员工 | GET | `/api/v1/employees/:id` |
| 创建员工 | POST | `/api/v1/employees` |
| 更新员工 | PUT | `/api/v1/employees/:id` |
| 删除员工 | DELETE | `/api/v1/employees/:id` |

**GET /api/v1/employees**

请求参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| page_size | number | 每页数量 |
| department_id | string | 部门筛选 |
| status | string | 状态筛选 |

响应示例：

```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "data": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

### 3.2 考勤管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取打卡记录 | GET | `/api/v1/attendance/records` |
| 创建打卡记录 | POST | `/api/v1/attendance/records` |
| 获取请假列表 | GET | `/api/v1/attendance/leaves` |
| 创建请假申请 | POST | `/api/v1/attendance/leaves` |
| 审批请假申请 | PUT | `/api/v1/attendance/leaves/:id/approve` |

### 3.3 薪资管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取薪资列表 | GET | `/api/v1/payroll` |
| 获取单个薪资 | GET | `/api/v1/payroll/:id` |
| 核算薪资 | POST | `/api/v1/payroll/calculate` |
| 发放薪资 | PUT | `/api/v1/payroll/:id/pay` |

### 3.4 招聘管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取职位列表 | GET | `/api/v1/recruitment/jobs` |
| 创建职位 | POST | `/api/v1/recruitment/jobs` |
| 获取候选人列表 | GET | `/api/v1/recruitment/candidates` |
| 创建候选人 | POST | `/api/v1/recruitment/candidates` |
| 更新候选人状态 | PUT | `/api/v1/recruitment/candidates/:id/status` |

---

## 4. 使用指南

### 4.1 前端集成

#### 4.1.1 获取员工列表

```typescript
import { hrmApi } from './api/hrm';

const employees = await hrmApi.listEmployees({
  page: 1,
  page_size: 20,
  department_id: 'dept-001'
});
```

#### 4.1.2 创建员工

```typescript
const newEmployee = await hrmApi.createEmployee({
  name: '张三',
  employee_no: 'EMP001',
  department_id: 'dept-001',
  position_id: 'pos-001',
  email: 'zhangsan@example.com',
  phone: '13800138000',
  hire_date: '2024-01-01'
});
```

### 4.2 后端部署

#### 4.2.1 环境要求

| 依赖 | 版本 |
|------|------|
| Rust | >= 1.70 |
| PostgreSQL | >= 14 |

#### 4.2.2 启动服务

```bash
cd svc/hrm
cargo run --release
```

---

## 5. 最佳实践

### 5.1 性能优化

**1. 批量操作**：使用批量API减少请求次数

```typescript
// 批量导入员工
const response = await hrmApi.batchImportEmployees(employeesData);
```

**2. 缓存策略**：缓存部门、职位等静态数据

### 5.2 安全注意事项

**1. 权限控制**：根据角色限制访问权限

**2. 敏感数据加密**：薪资等敏感数据加密存储

---

## 6. 常见问题

### 6.1 考勤打卡失败

**问题原因**：网络问题或定位权限未开启

**解决方案**：检查网络连接，确保定位权限已开启

### 6.2 薪资核算错误

**问题原因**：数据异常或计算公式错误

**解决方案**：检查员工信息和薪资配置，核对计算公式

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队