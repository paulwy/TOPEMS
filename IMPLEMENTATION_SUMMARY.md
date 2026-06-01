# TOPEMS HRM模块实施总结

## 项目概述

本项目已完成人力资源管理系统（HRM）的核心功能实施，包括岗位管理、考勤管理、招聘管理、薪资管理、绩效管理和请假管理等模块。

---

## 服务架构

| 服务 | 端口 | 状态 | 技术栈 |
|------|------|------|--------|
| IAM (身份认证) | 8002 | ✅ 运行中 | Rust + Axum |
| ERP (企业资源计划) | 8009 | ✅ 运行中 | Rust + Axum |
| HRM (人力资源管理) | 8010 | ✅ 运行中 | Rust + Axum |
| Document (文档管理) | 8001 | ✅ 运行中 | Rust + Axum |
| Frontend (前端) | 3000 | ✅ 运行中 | React + Vite |

---

## HRM模块功能清单

### 1. 岗位管理 (Position Management)

**API端点:**
- `GET /api/v1/positions` - 查询岗位列表
- `POST /api/v1/positions` - 创建岗位
- `GET /api/v1/positions/{id}` - 获取岗位详情
- `PUT /api/v1/positions/{id}` - 更新岗位
- `DELETE /api/v1/positions/{id}` - 删除岗位

**功能特性:**
- 岗位信息管理（名称、编码、级别、薪资范围）
- 部门关联
- 状态管理（启用/禁用）
- 分页和搜索支持

**数据库表:** `positions`

---

### 2. 考勤管理 (Attendance Management)

**API端点:**
- `GET /api/v1/attendance` - 查询考勤记录
- `POST /api/v1/attendance` - 创建考勤记录
- `GET /api/v1/attendance/{id}` - 获取考勤详情
- `PUT /api/v1/attendance/{id}` - 更新考勤记录
- `DELETE /api/v1/attendance/{id}` - 删除考勤记录

**功能特性:**
- 打卡时间记录
- 工时计算
- 员工考勤统计
- 状态管理

**数据库表:** `attendance_records`

---

### 3. 招聘管理 (Recruitment Management)

#### 3.1 职位发布
**API端点:**
- `GET /api/v1/job-openings` - 查询职位列表
- `POST /api/v1/job-openings` - 创建职位
- `PUT /api/v1/job-openings/{id}/publish` - 发布职位
- `PUT /api/v1/job-openings/{id}/close` - 关闭职位

#### 3.2 候选人管理
**API端点:**
- `GET /api/v1/candidates` - 查询候选人
- `POST /api/v1/candidates` - 添加候选人
- `PUT /api/v1/candidates/{id}` - 更新候选人状态

#### 3.3 面试安排
**API端点:**
- `GET /api/v1/interviews` - 查询面试列表
- `POST /api/v1/interviews` - 安排面试
- `PUT /api/v1/interviews/{id}/complete` - 完成面试

**数据库表:** `job_openings`, `candidates`, `interviews`

---

### 4. 薪资管理 (Payroll Management)

**API端点:**
- `GET /api/v1/payroll-runs` - 查询薪资周期
- `POST /api/v1/payroll-runs` - 创建薪资周期
- `PUT /api/v1/payroll-runs/{id}/calculate` - 计算薪资
- `PUT /api/v1/payroll-runs/{id}/pay` - 发放薪资
- `GET /api/v1/payroll-items` - 查询薪资明细

**功能特性:**
- 薪资周期管理
- 薪资计算（基本工资、税费、扣除项）
- 发放流程管理

**数据库表:** `payroll_runs`, `payroll_items`, `payroll_details`

---

### 5. 绩效管理 (Performance Management)

#### 5.1 绩效评核
**API端点:**
- `GET /api/v1/performance-reviews` - 查询评核列表
- `POST /api/v1/performance-reviews` - 创建评核
- `PUT /api/v1/performance-reviews/{id}/submit` - 提交评核
- `PUT /api/v1/performance-reviews/{id}/approve` - 批准评核

#### 5.2 绩效目标
**API端点:**
- `GET /api/v1/performance-goals` - 查询目标列表
- `POST /api/v1/performance-goals` - 创建目标
- `PUT /api/v1/performance-goals/{id}` - 更新目标进度

**功能特性:**
- 自评/互评机制
- 多维度评分
- 目标跟踪

**数据库表:** `performance_reviews`, `performance_goals`

---

### 6. 请假管理 (Leave Management)

**API端点:**
- `GET /api/v1/leave-requests` - 查询请假申请
- `POST /api/v1/leave-requests` - 提交请假申请
- `PUT /api/v1/leave-requests/{id}/approve` - 批准请假
- `PUT /api/v1/leave-requests/{id}/reject` - 拒绝请假

**功能特性:**
- 多种请假类型（事假、病假、年假等）
- 审批流程
- 自动计算请假天数

**数据库表:** `leave_requests`

---

## 前端页面清单

| 页面路径 | 文件 | 功能描述 |
|----------|------|----------|
| `/hrm/positions` | `HrmPositionPage.tsx` | 岗位管理 |
| `/hrm/leave` | `HrmLeavePage.tsx` | 请假管理 |
| `/hrm/recruitment` | `HrmRecruitmentPage.tsx` | 招聘管理 |
| `/hrm/payroll` | `HrmPayrollPage.tsx` | 薪资管理 |
| `/hrm/performance` | `HrmPerformancePage.tsx` | 绩效管理 |
| `/hrm/attendance` | `HrmAttendancePage.tsx` | 考勤管理 |
| `/hrm/employees/{id}` | `HrmEmployeeDetailPage.tsx` | 员工详情 |

---

## 数据库架构

### HRM数据库表

```
employees (员工信息)
├── id (UUID)
├── employee_number (工号)
├── name (姓名)
├── gender (性别)
├── birth_date (出生日期)
├── hire_date (入职日期)
├── department_id (部门ID)
├── position (岗位)
├── job_title (职位)
├── email (邮箱)
├── phone (电话)
├── status (状态)
└── timestamps

departments (部门)
├── id (UUID)
├── name (名称)
├── code (编码)
├── parent_id (上级部门)
├── manager_id (负责人)
└── status

positions (岗位)
├── id (UUID)
├── name (名称)
├── code (编码)
├── department_id (所属部门)
├── level (级别)
├── min_salary (最低薪资)
├── max_salary (最高薪资)
└── status

leave_requests (请假申请)
├── id (UUID)
├── employee_id (员工ID)
├── leave_type (请假类型)
├── start_date (开始日期)
├── end_date (结束日期)
├── days (天数)
├── status (状态: pending/approved/rejected)
└── approver_id (审批人)

performance_reviews (绩效评核)
├── id (UUID)
├── employee_id (员工ID)
├── review_period (评核周期)
├── self_rating (自评)
├── manager_rating (主管评分)
├── final_rating (最终评分)
└── status (状态)

performance_goals (绩效目标)
├── id (UUID)
├── employee_id (员工ID)
├── title (目标标题)
├── target (目标值)
├── weight (权重)
├── achieved (完成值)
└── status
```

---

## 测试验证

### 测试账号
- **用户名:** admin
- **密码:** admin123

### API测试结果

| 模块 | 测试项 | 状态 |
|------|--------|------|
| 岗位管理 | 创建岗位 | ✅ 通过 |
| 岗位管理 | 查询列表 | ✅ 通过 |
| 薪资管理 | 创建周期 | ✅ 通过 |
| 绩效管理 | 创建目标 | ✅ 通过 |
| 身份认证 | JWT令牌 | ✅ 通过 |

---

## 访问地址

- **前端:** http://localhost:3000
- **IAM API:** http://localhost:8002
- **HRM API:** http://localhost:8010
- **ERP API:** http://localhost:8009
- **文档服务:** http://localhost:8001

---

## 后续迭代计划

### 待实现功能
1. **员工合同管理** - 合同创建、到期提醒、续签流程
2. **培训管理** - 培训计划、课程管理、培训记录
3. **员工档案** - 完整的员工信息管理
4. **数据分析** - HR报表、统计分析
5. **移动端适配** - 移动端访问优化

### 技术优化
1. 缓存策略优化
2. API性能监控
3. 日志系统完善
4. 单元测试覆盖

---

## 文档版本

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-06-01 | System | 初始版本 |

---

*文档创建时间: 2026-06-01*
