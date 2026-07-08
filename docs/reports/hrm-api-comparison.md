# HRM 模块前后端 API 对比报告

**生成时间**: 2026-07-05 04:50:12

> 数据源说明：
> - 前端 API：从 `apps/web/src/api/hrm/` 目录下 TypeScript 文件提取
> - 后端路由：从 `svc/hrm/src/api/` 目录下 Rust 源码提取

## 概览

| 指标 | 数量 |
|------|------|
| 前端 API 总数 | 120 |
| 后端路由总数 | 129 |
| 已对接 API | 107 |
| 前端有后端无 | 13 |
| 后端有前端无 | 22 |
| **API 对接率** | **89.17%** |

## 1. 已对接的 API（前后端都有）

共 107 个

| 方法 | 路径 | 前端文件 | 后端文件 | 后端 Handler |
|------|------|----------|----------|-------------|
| DELETE | `/attendance/${id}` | attendance.ts | attendance.rs | delete_attendance |
| DELETE | `/candidates/${id}` | recruitment.ts | recruitment.rs | delete_candidate |
| DELETE | `/companies/${id}` | company.ts | company.rs | delete_company |
| DELETE | `/contract-renewals/${id}` | contract.ts | contract.rs | delete_renewal |
| DELETE | `/contracts/${id}` | contract.ts | contract.rs | delete_contract |
| DELETE | `/departments/${id}` | department.ts | department.rs | delete_department |
| DELETE | `/employees/${id}` | employee.ts | employee.rs | delete_employee |
| DELETE | `/interviews/${id}` | recruitment.ts | recruitment.rs | delete_interview |
| DELETE | `/job-openings/${id}` | recruitment.ts | recruitment.rs | delete_job_opening |
| DELETE | `/leaves/${id}` | leave.ts | leave.rs | delete_leave |
| DELETE | `/payroll-runs/${id}` | payroll.ts | payroll.rs | delete_payroll_run |
| DELETE | `/performance-goals/${id}` | performance.ts | performance.rs | delete_goal |
| DELETE | `/performance-reviews/${id}` | performance.ts | performance.rs | delete_review |
| DELETE | `/positions/${id}` | employee.ts | position.rs | delete_position |
| DELETE | `/training-courses/${id}` | training.ts | training.rs | delete_course |
| DELETE | `/training-plans/${id}` | training.ts | training.rs | delete_plan |
| DELETE | `/training-records/${id}` | training.ts | training.rs | delete_record |
| GET | `/attendance${queryString}` | attendance.ts | attendance.rs | list_attendance |
| GET | `/attendance/${id}` | attendance.ts | attendance.rs | get_attendance |
| GET | `/candidates${queryString}` | recruitment.ts | recruitment.rs | list_candidates |
| GET | `/candidates/${id}` | recruitment.ts | recruitment.rs | get_candidate |
| GET | `/companies${queryString}` | company.ts | company.rs | list_companies |
| GET | `/companies/${id}` | company.ts | company.rs | get_company |
| GET | `/contract-renewals${queryString}` | contract.ts | contract.rs | list_renewals |
| GET | `/contract-renewals/${id}` | contract.ts | contract.rs | get_renewal |
| GET | `/contracts${queryString}` | contract.ts | contract.rs | list_contracts |
| GET | `/contracts/expiring${queryString}` | contract.ts | contract.rs | list_expiring_contracts |
| GET | `/contracts/${id}` | contract.ts | contract.rs | get_contract |
| GET | `/departments${queryString}` | department.ts | department.rs | list_departments |
| GET | `/departments/${id}` | department.ts | department.rs | get_department |
| GET | `/employees${queryString}` | employee.ts | employee.rs | list_employees |
| GET | `/employees/${id}` | employee.ts | employee.rs | get_employee |
| GET | `/employees/${employee_id}/performance-goals` | employee.ts | performance.rs | get_employee_goals |
| GET | `/employees/${employee_id}/performance-reviews` | employee.ts | performance.rs | get_employee_reviews |
| GET | `/interviews${queryString}` | recruitment.ts | recruitment.rs | list_interviews |
| GET | `/interviews/${id}` | recruitment.ts | recruitment.rs | get_interview |
| GET | `/job-openings${queryString}` | recruitment.ts | recruitment.rs | list_job_openings |
| GET | `/job-openings/${id}` | recruitment.ts | recruitment.rs | get_job_opening |
| GET | `/leaves${queryString}` | leave.ts | leave.rs | list_leaves |
| GET | `/leaves/${id}` | leave.ts | leave.rs | get_leave |
| GET | `/payroll-items${queryString}` | payroll.ts | payroll.rs | list_payroll_items |
| GET | `/payroll-items/${id}` | payroll.ts | payroll.rs | get_payroll_item |
| GET | `/payroll-runs${queryString}` | payroll.ts | payroll.rs | list_payroll_runs |
| GET | `/payroll-runs/${id}` | payroll.ts | payroll.rs | get_payroll_run |
| GET | `/performance-goals${queryString}` | performance.ts | performance.rs | list_goals |
| GET | `/performance-goals/${id}` | performance.ts | performance.rs | get_goal |
| GET | `/performance-reviews${queryString}` | performance.ts | performance.rs | list_reviews |
| GET | `/performance-reviews/${id}` | performance.ts | performance.rs | get_review |
| GET | `/positions${queryString}` | employee.ts | position.rs | list_positions |
| GET | `/positions/${id}` | employee.ts | position.rs | get_position |
| GET | `/salary-adjustments${queryString}` | payroll.ts | salary_adjustment.rs | list_salary_adjustments |
| GET | `/salary-adjustments/${id}` | payroll.ts | salary_adjustment.rs | get_salary_adjustment |
| GET | `/training-courses${queryString}` | training.ts | training.rs | list_courses |
| GET | `/training-courses/${id}` | training.ts | training.rs | get_course |
| GET | `/training-plans${queryString}` | training.ts | training.rs | list_plans |
| GET | `/training-plans/${id}` | training.ts | training.rs | get_plan |
| GET | `/training-records${queryString}` | training.ts | training.rs | list_records |
| GET | `/training-records/${id}` | training.ts | training.rs | get_record |
| POST | `/attendance` | attendance.ts | attendance.rs | create_attendance |
| POST | `/candidates` | recruitment.ts | recruitment.rs | create_candidate |
| POST | `/companies` | company.ts | company.rs | create_company |
| POST | `/contracts` | contract.ts | contract.rs | create_contract |
| POST | `/contracts/${contract_id}/renew` | contract.ts | contract.rs | create_renewal |
| POST | `/departments` | department.ts | department.rs | create_department |
| POST | `/employees` | employee.ts | employee.rs | create_employee |
| POST | `/interviews` | recruitment.ts | recruitment.rs | create_interview |
| POST | `/job-openings` | recruitment.ts | recruitment.rs | create_job_opening |
| POST | `/leaves` | leave.ts | leave.rs | create_leave |
| POST | `/payroll-runs` | payroll.ts | payroll.rs | create_payroll_run |
| POST | `/performance-goals` | performance.ts | performance.rs | create_goal |
| POST | `/performance-reviews` | performance.ts | performance.rs | create_review |
| POST | `/positions` | employee.ts | position.rs | create_position |
| POST | `/salary-adjustments` | payroll.ts | salary_adjustment.rs | create_salary_adjustment |
| POST | `/training-courses` | training.ts | training.rs | create_course |
| POST | `/training-plans` | training.ts | training.rs | create_plan |
| POST | `/training-records` | training.ts | training.rs | create_record |
| PUT | `/attendance/${id}` | attendance.ts | attendance.rs | update_attendance |
| PUT | `/candidates/${id}` | recruitment.ts | recruitment.rs | update_candidate |
| PUT | `/companies/${id}` | company.ts | company.rs | update_company |
| PUT | `/contract-renewals/${id}` | contract.ts | contract.rs | update_renewal |
| PUT | `/contract-renewals/${id}/approve` | contract.ts | contract.rs | approve_renewal |
| PUT | `/contract-renewals/${id}/execute` | contract.ts | contract.rs | execute_renewal |
| PUT | `/contract-renewals/${id}/reject` | contract.ts | contract.rs | reject_renewal |
| PUT | `/contracts/${id}` | contract.ts | contract.rs | update_contract |
| PUT | `/departments/${id}` | department.ts | department.rs | update_department |
| PUT | `/employees/${id}` | employee.ts | employee.rs | update_employee |
| PUT | `/interviews/${id}` | recruitment.ts | recruitment.rs | update_interview |
| PUT | `/interviews/${id}/complete` | recruitment.ts | recruitment.rs | complete_interview |
| PUT | `/job-openings/${id}` | recruitment.ts | recruitment.rs | update_job_opening |
| PUT | `/job-openings/${id}/close` | recruitment.ts | recruitment.rs | close_job_opening |
| PUT | `/job-openings/${id}/publish` | recruitment.ts | recruitment.rs | publish_job_opening |
| PUT | `/leaves/${id}` | leave.ts | leave.rs | update_leave |
| PUT | `/leaves/${id}/approve` | leave.ts | leave.rs | approve_leave |
| PUT | `/leaves/${id}/reject` | leave.ts | leave.rs | reject_leave |
| PUT | `/payroll-runs/${id}/calculate` | payroll.ts | payroll.rs | calculate_payroll_run |
| PUT | `/payroll-runs/${id}/pay` | payroll.ts | payroll.rs | pay_payroll_run |
| PUT | `/performance-goals/${id}` | performance.ts | performance.rs | update_goal |
| PUT | `/performance-reviews/${id}` | performance.ts | performance.rs | update_review |
| PUT | `/performance-reviews/${id}/approve` | performance.ts | performance.rs | approve_review |
| PUT | `/performance-reviews/${id}/submit` | performance.ts | performance.rs | submit_review |
| PUT | `/positions/${id}` | employee.ts | position.rs | update_position |
| PUT | `/salary-adjustments/${id}` | payroll.ts | salary_adjustment.rs | update_salary_adjustment |
| PUT | `/salary-adjustments/${id}/approve` | payroll.ts | salary_adjustment.rs | approve_salary_adjustment |
| PUT | `/salary-adjustments/${id}/reject` | payroll.ts | salary_adjustment.rs | reject_salary_adjustment |
| PUT | `/training-courses/${id}` | training.ts | training.rs | update_course |
| PUT | `/training-plans/${id}` | training.ts | training.rs | update_plan |
| PUT | `/training-records/${id}` | training.ts | training.rs | update_record |

## 2. 前端有但后端没有的 API（前端超前）

共 13 个

| 方法 | 路径 | 前端文件 | 模块 |
|------|------|----------|------|
| DELETE | `/roles/${id}` | employee.ts | employee |
| DELETE | `/salary-adjustments/${id}` | payroll.ts | payroll |
| GET | `/health` | index.ts | index |
| GET | `/roles${queryString}` | employee.ts | employee |
| GET | `/roles/${id}` | employee.ts | employee |
| POST | `/attendance/check-in` | attendance.ts | attendance |
| POST | `/attendance/check-out` | attendance.ts | attendance |
| POST | `/roles` | employee.ts | employee |
| POST | `/training-records/enroll` | training.ts | training |
| PUT | `/roles/${id}` | employee.ts | employee |
| PUT | `/training-plans/${id}/activate` | training.ts | training |
| PUT | `/training-plans/${id}/deactivate` | training.ts | training |
| PUT | `/training-records/${id}/complete` | training.ts | training |

## 3. 后端有但前端没有的 API（后端超前）

共 22 个

| 方法 | 路径 | 后端文件 | 模块 | Handler |
|------|------|----------|------|---------|
| GET | `audit-logs` | audit.rs | audit | list_audit_logs |
| GET | `audit-logs/{param}` | audit.rs | audit | get_audit_log |
| GET | `employees/{param}/details` | employee.rs | employee | get_employee_details |
| GET | `employees/{param}/training-records` | training.rs | training | get_employee_records |
| GET | `hrm/setup/progress` | setup.rs | setup | get_init_progress |
| GET | `payroll-details` | payroll.rs | payroll | list_payroll_details |
| GET | `reports/attendance-summary` | reports.rs | reports | attendance_summary |
| GET | `reports/contract-summary` | reports.rs | reports | contract_summary |
| GET | `reports/department-summary` | reports.rs | reports | department_summary |
| GET | `reports/employee-summary` | reports.rs | reports | employee_summary |
| GET | `reports/payroll-summary` | reports.rs | reports | payroll_summary |
| GET | `reports/training-summary` | reports.rs | reports | training_summary |
| GET | `training-courses/{param}/records` | training.rs | training | get_course_records |
| POST | `employees/export` | employee.rs | employee | export_employees |
| POST | `hrm/setup/admin` | setup.rs | setup | setup_admin_user |
| POST | `hrm/setup/company` | setup.rs | setup | setup_company_info |
| POST | `hrm/setup/complete` | setup.rs | setup | complete_initialization |
| POST | `hrm/setup/departments` | setup.rs | setup | setup_departments |
| POST | `hrm/setup/positions` | setup.rs | setup | setup_positions |
| POST | `payroll-details` | payroll.rs | payroll | create_payroll_detail |
| POST | `payroll-runs/{param}/generate-voucher` | payroll.rs | payroll | generate_payroll_voucher |
| POST | `training-courses/{param}/enroll` | training.rs | training | enroll_course |

## 4. 按模块分类统计

| 模块 | 前端 API | 后端 API | 已对接 | 对接率 |
|------|----------|----------|--------|--------|
| attendance | 7 | 5 | 5 | 71.4% |
| audit | 0 | 2 | 0 | N/A |
| company | 5 | 5 | 5 | 100.0% |
| contract | 14 | 14 | 14 | 100.0% |
| department | 5 | 5 | 5 | 100.0% |
| employee | 17 | 7 | 5 | 29.4% |
| index | 1 | 0 | 0 | 0.0% |
| leave | 7 | 7 | 7 | 100.0% |
| payroll | 15 | 11 | 8 | 53.3% |
| performance | 12 | 14 | 12 | 100.0% |
| position | 0 | 5 | 0 | N/A |
| recruitment | 18 | 18 | 18 | 100.0% |
| reports | 0 | 6 | 0 | N/A |
| salary_adjustment | 0 | 6 | 0 | N/A |
| setup | 0 | 6 | 0 | N/A |
| training | 19 | 18 | 15 | 78.9% |

## 5. 主要缺失项摘要

### 5.1 前端已定义但后端未实现的 API

需要后端优先实现的前端 API：

**attendance 模块 (2 个)**：
- `POST /attendance/check-in`
- `POST /attendance/check-out`

**employee 模块 (5 个)**：
- `DELETE /roles/${id}`
- `GET /roles${queryString}`
- `GET /roles/${id}`
- `POST /roles`
- `PUT /roles/${id}`

**index 模块 (1 个)**：
- `GET /health`

**payroll 模块 (1 个)**：
- `DELETE /salary-adjustments/${id}`

**training 模块 (4 个)**：
- `POST /training-records/enroll`
- `PUT /training-plans/${id}/activate`
- `PUT /training-plans/${id}/deactivate`
- `PUT /training-records/${id}/complete`

### 5.2 后端已实现但前端未对接的 API

前端可以考虑对接的后端 API：

**audit 模块 (2 个)**：
- `GET audit-logs` (list_audit_logs)
- `GET audit-logs/{param}` (get_audit_log)

**employee 模块 (2 个)**：
- `GET employees/{param}/details` (get_employee_details)
- `POST employees/export` (export_employees)

**payroll 模块 (3 个)**：
- `GET payroll-details` (list_payroll_details)
- `POST payroll-details` (create_payroll_detail)
- `POST payroll-runs/{param}/generate-voucher` (generate_payroll_voucher)

**reports 模块 (6 个)**：
- `GET reports/attendance-summary` (attendance_summary)
- `GET reports/contract-summary` (contract_summary)
- `GET reports/department-summary` (department_summary)
- `GET reports/employee-summary` (employee_summary)
- `GET reports/payroll-summary` (payroll_summary)
- `GET reports/training-summary` (training_summary)

**setup 模块 (6 个)**：
- `GET hrm/setup/progress` (get_init_progress)
- `POST hrm/setup/admin` (setup_admin_user)
- `POST hrm/setup/company` (setup_company_info)
- `POST hrm/setup/complete` (complete_initialization)
- `POST hrm/setup/departments` (setup_departments)
- `POST hrm/setup/positions` (setup_positions)

**training 模块 (3 个)**：
- `GET employees/{param}/training-records` (get_employee_records)
- `GET training-courses/{param}/records` (get_course_records)
- `POST training-courses/{param}/enroll` (enroll_course)
