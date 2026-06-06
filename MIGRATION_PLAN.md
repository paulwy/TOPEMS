# 公司-部门-员工数据迁移方案（方案3：职责分离）

## 一、目标架构

### 职责划分
| 服务 | 职责范围 | 数据管理 |
|------|----------|----------|
| **ERP** | 企业基础信息管理 | 公司(companies)、部门(departments)、员工(employees) |
| **HRM** | 人力资源业务管理 | 职位(positions)、考勤(attendance)、请假(leave)、薪酬(payroll)、绩效(performance)、培训(training) |

### 数据关系
```
ERP (基础数据)                          HRM (业务数据)
├── companies                        ├── positions
│   └── departments                      │   └── (关联 ERP.departments)
│       └── employees                    ├── attendance_records
│           └── (关联 HRM.*)              │   └── (关联 ERP.employees)
                                        ├── leave_requests
                                        │   └── (关联 ERP.employees)
                                        ├── payroll_runs
                                        │   └── (关联 ERP.employees)
                                        ├── performance_reviews
                                        │   └── (关联 ERP.employees)
                                        └── training_records
                                            └── (关联 ERP.employees)
```

---

## 二、迁移步骤

### Phase 1: 前端 API 调整（低风险）

#### 1.1 修改 hrm.ts API 文件
**文件**: [frontend/src/api/hrm.ts](file:///Users/air/TOPEMS/frontend/src/api/hrm.ts)

- 将 `departmentApi` 和 `employeeApi` 的调用从 HRM 改为 ERP
- 创建新的 HRM 特有 API（positions, attendance, leave 等保持不变）

#### 1.2 更新页面组件
**文件**: [frontend/src/pages/HrmDepartmentPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmDepartmentPage.tsx)
**文件**: [frontend/src/pages/HrmEmployeePage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmEmployeePage.tsx)
**文件**: [frontend/src/pages/HrmCompanyPage.tsx](file:///Users/air/TOPEMS/frontend/src/pages/HrmCompanyPage.tsx)

- 修改导入语句，使用 ERP API 替代 HRM API
- 调整数据结构以匹配 ERP 返回格式

#### 1.3 路由保持不变
**文件**: [frontend/src/App.tsx](file:///Users/air/TOPEMS/frontend/src/App.tsx)

```typescript
// 路由保持不变，用户访问路径不变
// /hrm/companies → 实际调用 ERP API
// /hrm/departments → 实际调用 ERP API
// /hrm/employees → 实际调用 ERP API
// /hrm/positions → 调用 HRM API（特有）
```

---

### Phase 2: ERP API 增强（中等风险）

#### 2.1 完善 ERP 的部门管理 API
**文件**: [services/topems-erp/backend/src/api/department.rs](file:///Users/air/TOPEMS/services/topems-erp/backend/src/api/department.rs)

- 添加树形结构支持（parent_id）
- 添加公司关联（company_id）
- 添加完整的 CRUD 操作

#### 2.2 完善 ERP 的员工管理 API
**文件**: [services/topems-erp/backend/src/api/employee.rs](file:///Users/air/TOPEMS/services/topems-erp/backend/src/api/employee.rs)

- 添加部门关联（department_id）
- 添加完整的 CRUD 操作

#### 2.3 数据库表结构调整
**文件**: [services/topems-erp/backend/src/main.rs](file:///Users/air/TOPEMS/services/topems-erp/backend/src/main.rs)

```sql
-- erp.departments 需要添加外键约束
ALTER TABLE erp.departments 
ADD CONSTRAINT fk_department_company 
FOREIGN KEY (company_id) REFERENCES erp.companies(id);

ALTER TABLE erp.departments 
ADD CONSTRAINT fk_department_parent 
FOREIGN KEY (parent_id) REFERENCES erp.departments(id);

-- erp.employees 需要添加外键约束
ALTER TABLE erp.employees 
ADD CONSTRAINT fk_employee_department 
FOREIGN KEY (department_id) REFERENCES erp.departments(id);
```

---

### Phase 3: HRM 服务调整（高风险）

#### 3.1 数据迁移脚本
创建数据迁移脚本，将 HRM 的部门和员工数据迁移到 ERP：

**文件**: `scripts/migrate_hrm_to_erp.py`

```python
# 迁移步骤：
# 1. 导出 HRM departments 数据
# 2. 将数据导入 ERP departments（添加 company_id）
# 3. 导出 HRM employees 数据
# 4. 将数据导入 ERP employees（更新 department_id 映射）
# 5. 更新 HRM 相关表的 employee_id 引用
```

#### 3.2 HRM 表结构调整
**文件**: [services/topems-hrm/backend/src/main.rs](file:///Users/air/TOPEMS/services/topems-hrm/backend/src/main.rs)

- 删除或保留 `hrm.departments` 和 `hrm.employees` 表（作为历史数据或删除）
- 修改 HRM 业务表，确保通过 ID 关联到 ERP 的员工

#### 3.3 HRM API 调整
**文件**: [services/topems-hrm/backend/src/api/department.rs](file:///Users/air/TOPEMS/services/topems-hrm/backend/src/api/department.rs)
**文件**: [services/topems-hrm/backend/src/api/employee.rs](file:///Users/air/TOPEMS/services/topems-hrm/backend/src/api/employee.rs)

- 将部门和员工 API 标记为 deprecated
- 或直接删除，返回错误提示用户使用 ERP API

---

## 三、数据迁移详细方案

### 3.1 数据映射关系

| HRM 字段 | ERP 字段 | 备注 |
|----------|----------|------|
| departments.id | departments.id | 保持不变 |
| departments.name | departments.name | 保持不变 |
| departments.code | departments.code | 保持不变 |
| departments.parent_id | departments.parent_id | 保持不变 |
| departments.manager_id | departments.manager_id | 保持不变 |
| departments.description | departments.description | 保持不变 |
| - | departments.company_id | **新增，需要默认值** |
| employees.id | employees.id | 保持不变 |
| employees.name | employees.name | 保持不变 |
| employees.employee_number | employees.employee_number | 保持不变 |
| employees.department_id | employees.department_id | 需要映射到新的 ERP ID |

### 3.2 迁移执行顺序

```
1. 备份数据库
   pg_dump -U topems -d topems -f backup_before_migration.sql

2. 创建 ERP 表的外键约束（如果尚未存在）

3. 迁移部门数据
   INSERT INTO erp.departments 
   SELECT id, name, code, parent_id, NULL as company_id, description, status, created_at, updated_at
   FROM hrm.departments;

4. 迁移员工数据
   INSERT INTO erp.employees
   SELECT id, employee_number, name, gender, birth_date, hire_date, department_id, 
          position, email, phone, address, emergency_contact_name, 
          emergency_contact_phone, status, created_at, updated_at
   FROM hrm.employees;

5. 更新 HRM 表中的员工引用（如考勤、请假等）
   -- HRM 的 employee_id 应该与 ERP 相同，无需修改

6. 验证数据完整性
   SELECT COUNT(*) FROM erp.departments;
   SELECT COUNT(*) FROM erp.employees;
   SELECT COUNT(*) FROM hrm.departments;
   SELECT COUNT(*) FROM hrm.employees;
```

---

## 四、前端页面调整清单

### 4.1 需要修改的页面

| 页面 | 当前 API | 目标 API | 状态 |
|------|----------|----------|------|
| HrmCompanyPage | ERP | ERP ✅ | 无需修改 |
| HrmDepartmentPage | HRM | **ERP** | 需要修改 |
| HrmEmployeePage | HRM | **ERP** | 需要修改 |
| HrmPositionPage | HRM | HRM ✅ | 无需修改 |
| HrmAttendancePage | HRM | HRM ✅ | 无需修改（关联 ERP.employees） |
| HrmLeavePage | HRM | HRM ✅ | 无需修改 |
| HrmPayrollPage | HRM | HRM ✅ | 无需修改 |
| HrmPerformancePage | HRM | HRM ✅ | 无需修改 |
| HrmTrainingPage | HRM | HRM ✅ | 无需修改 |

### 4.2 API 调整示例

**原 HRM API 调用**:
```typescript
import { departmentApi } from './hrm';

const response = await departmentApi.list();
```

**新 ERP API 调用**:
```typescript
import { departmentApi } from './erp';

const response = await departmentApi.list();
```

---

## 五、风险评估与回滚计划

### 5.1 风险评估

| 风险 | 级别 | 描述 | 缓解措施 |
|------|------|------|----------|
| 数据迁移失败 | 高 | 部门/员工数据丢失 | 迁移前备份，迁移后验证 |
| API 不兼容 | 中 | 前端调用旧 API 失败 | 逐步切换，保持旧 API 一段时间 |
| 事务不一致 | 中 | 迁移过程中数据变更 | 迁移期间暂停写操作或使用事务 |
| 性能影响 | 低 | 大量数据迁移影响系统 | 选择低峰期执行 |

### 5.2 回滚计划

```
1. 如果迁移失败，停止所有变更
2. 恢复数据库备份
   psql -U topems -d topems -f backup_before_migration.sql
3. 恢复前端代码到迁移前状态
   git checkout frontend/src/api/hrm.ts
4. 恢复后端代码到迁移前状态
   git checkout services/topems-hrm/backend/src/api/
5. 重启相关服务
```

---

## 六、测试验证清单

### 6.1 API 测试

| 测试项 | 期望结果 |
|--------|----------|
| GET /api/v1/companies (ERP) | 返回公司列表 |
| GET /api/v1/departments (ERP) | 返回部门列表，包含 company_id |
| GET /api/v1/employees (ERP) | 返回员工列表，包含 department_id |
| POST /api/v1/departments (ERP) | 创建部门成功 |
| POST /api/v1/employees (ERP) | 创建员工成功 |

### 6.2 前端测试

| 测试项 | 期望结果 |
|--------|----------|
| 访问 /hrm/companies | 正常显示公司列表 |
| 访问 /hrm/departments | 正常显示部门列表（树形结构） |
| 访问 /hrm/employees | 正常显示员工列表 |
| 创建部门 | 数据保存到 ERP |
| 创建员工 | 数据保存到 ERP |
| 考勤打卡 | 关联正确的员工 |

### 6.3 数据完整性测试

| 测试项 | 期望结果 |
|--------|----------|
| ERP.departments.count = HRM.departments.count | 数量相等 |
| ERP.employees.count = HRM.employees.count | 数量相等 |
| 部门树形结构正确 | parent_id 关联正确 |
| 员工部门关联正确 | department_id 关联正确 |

---

## 七、时间计划

| 阶段 | 预计时间 | 负责人 |
|------|----------|--------|
| Phase 1: 前端 API 调整 | 1-2 天 | 前端开发 |
| Phase 2: ERP API 增强 | 2-3 天 | 后端开发 |
| Phase 3: 数据迁移 | 1 天 | DBA/后端开发 |
| 测试验证 | 1-2 天 | QA |
| 总计 | 5-8 天 | - |

---

## 八、后续优化建议

1. **缓存策略**：ERP 的公司、部门、员工数据可以缓存，减少数据库查询
2. **事件驱动**：使用消息队列同步 ERP 和 HRM 的数据变更
3. **权限控制**：在 ERP 层面统一管理数据权限，HRM 继承权限
4. **API 网关**：考虑引入 API 网关统一处理跨服务调用