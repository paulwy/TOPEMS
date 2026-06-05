# 模块单位/部门分类设计方案

## 概述

本设计文档旨在为财务报表、项目管理、效益分析、预算管理等模块提供统一的单位/部门分类能力设计，支持按公司、部门维度进行数据筛选和统计分析。

## 设计目标

1. **统一分类体验**：为各模块提供一致的单位/部门筛选交互
2. **多维度支持**：支持公司、部门、员工等多级组织架构维度
3. **灵活配置**：各模块可根据业务需求选择启用或禁用分类功能
4. **数据隔离**：确保不同公司/部门的数据安全隔离

## 架构设计

### 核心组件

#### 1. OrganizationFilter 组件

**位置**: `src/components/ui/OrganizationFilter.tsx`

**功能**: 统一的组织架构筛选组件，支持公司、部门、员工三级筛选

```typescript
interface OrganizationFilterProps {
  value: {
    companyId?: string;
    departmentId?: string;
    employeeId?: string;
  };
  onChange: (value: {
    companyId?: string;
    departmentId?: string;
    employeeId?: string;
  }) => void;
  showCompany?: boolean;  // 是否显示公司选择
  showDepartment?: boolean;  // 是否显示部门选择
  showEmployee?: boolean;  // 是否显示员工选择
  disabled?: boolean;
}
```

**设计要点**:
- 级联选择：选择公司后自动加载对应部门，选择部门后自动加载对应员工
- 支持多选模式
- 支持"全部"选项
- 支持树形选择器模式

#### 2. useOrganization 自定义 Hook

**位置**: `src/hooks/useOrganization.ts`

**功能**: 封装组织架构数据的获取和管理逻辑

```typescript
const useOrganization = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const loadCompanies = async () => { /* ... */ };
  const loadDepartments = async (companyId: string) => { /* ... */ };
  const loadEmployees = async (departmentId: string) => { /* ... */ };
  
  return { companies, departments, employees, loadCompanies, loadDepartments, loadEmployees };
};
```

### 数据模型

```typescript
interface Company {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  company_id: string;
  parent_id: string | null;
  level: number;
}

interface Employee {
  id: string;
  name: string;
  company_id: string;
  department_id: string;
  position: string;
}
```

## 模块适配方案

### 1. 财务报表模块 (FinanceReportsPage)

**启用的分类维度**: 公司、部门

**应用场景**:
- 按公司维度统计收入/支出
- 按部门维度分析费用分布
- 跨公司财务对比分析

**设计要点**:
- 在报表顶部添加 OrganizationFilter 组件
- 报表数据根据选择的组织维度进行过滤
- 支持按组织维度进行数据钻取

### 2. 项目管理模块 (PmProjectListPage)

**启用的分类维度**: 公司、部门

**应用场景**:
- 按部门查看项目列表
- 统计各公司项目数量和进度
- 部门项目分配管理

**设计要点**:
- 项目列表支持按公司/部门筛选
- 项目卡片显示所属部门信息
- 项目创建时关联公司和部门

### 3. 效益分析模块 (BIAnalyticsPage)

**启用的分类维度**: 公司、部门、员工

**应用场景**:
- 部门效益对比分析
- 员工绩效评估
- 跨公司效益排名

**设计要点**:
- 分析图表支持按组织维度切换
- 支持多维度组合分析
- 提供组织维度的同比/环比分析

### 4. 预算管理模块 (BudgetManagementPage)

**启用的分类维度**: 公司、部门

**应用场景**:
- 公司级预算分配
- 部门预算控制
- 预算执行情况追踪

**设计要点**:
- 预算编制按部门进行
- 预算执行数据按组织维度汇总
- 超预算预警按部门触发

## API 接口设计

### 获取公司列表

```
GET /api/organization/companies
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "items": [
      { "id": "c1", "name": "总公司", "code": "HQ", "status": "active" }
    ]
  }
}
```

### 获取部门列表

```
GET /api/organization/departments?company_id={companyId}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "items": [
      { "id": "d1", "name": "研发部", "company_id": "c1", "parent_id": null, "level": 1 }
    ]
  }
}
```

### 获取员工列表

```
GET /api/organization/employees?department_id={departmentId}
```

**响应**:
```json
{
  "code": 200,
  "data": {
    "items": [
      { "id": "e1", "name": "张三", "company_id": "c1", "department_id": "d1", "position": "工程师" }
    ]
  }
}
```

## 实现计划

### 第一阶段：基础组件开发

| 任务 | 描述 | 预估工时 |
|------|------|----------|
| 1.1 | 创建 OrganizationFilter 组件 | 4h |
| 1.2 | 创建 useOrganization Hook | 3h |
| 1.3 | 组织架构 API 封装 | 2h |

### 第二阶段：模块集成

| 任务 | 描述 | 预估工时 |
|------|------|----------|
| 2.1 | 财务报表模块集成 | 3h |
| 2.2 | 项目管理模块集成 | 3h |
| 2.3 | 效益分析模块集成 | 3h |
| 2.4 | 预算管理模块集成 | 3h |

### 第三阶段：测试与优化

| 任务 | 描述 | 预估工时 |
|------|------|----------|
| 3.1 | 单元测试编写 | 4h |
| 3.2 | 集成测试 | 3h |
| 3.3 | 性能优化 | 2h |

## 依赖与兼容性

### 依赖组件
- TreeView 组件 (已存在)
- Select 组件 (shadcn/ui)
- 后端 API 支持

### 浏览器兼容性
- Chrome >= 100
- Firefox >= 98
- Safari >= 15

## 安全性考虑

1. **数据隔离**: 后端需根据用户权限返回可访问的组织数据
2. **权限校验**: 前端需验证用户是否有权限查看所选组织的数据
3. **XSS 防护**: 组织名称等用户输入需进行安全处理

## 扩展计划

### 未来迭代方向

1. **多层级组织架构**：支持子公司、分公司等多层级结构
2. **自定义维度**：允许用户自定义组织维度
3. **时间维度**：支持按时间维度查看组织历史数据
4. **数据导出**：支持按组织维度导出报表

## 版本记录

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0 | 2026-05 | 系统设计 | 初始设计方案 |

---

**文档状态**: 待审批

**适用迭代**: v2.0+