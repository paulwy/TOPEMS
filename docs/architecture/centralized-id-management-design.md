# 集中化ID编码体系设计方案

## 一、问题分析

### 1.1 现有问题

当前系统中各模块独立管理ID编码，存在以下问题：

| 问题 | 描述 | 影响 |
|------|------|------|
| **编码规则不统一** | 各模块自行定义编码规则 | 数据整合困难 |
| **编码重复冲突** | 不同模块可能产生相同编码 | 数据混淆 |
| **手工编码易错** | 依赖人工输入编码 | 编码不规范 |
| **缺乏追溯性** | 编码无法体现业务属性 | 统计分析困难 |
| **外部系统对接难** | 与外部ERP编码体系不一致 | 集成成本高 |

### 1.2 现有编码现状

```typescript
// HRM模块
Employee: { id: string, employee_number: string }
Department: { id: string, code?: string }

// CRM模块  
Customer: { id: string, code?: string }
Contact: { id: string }

// SRM模块
Supplier: { id: string } // 缺少code

// PM模块
Project: { id: string, code: string }
Contract: { id: string, contract_code: string }

// ERP模块
Account: { id: string, code: string }
Voucher: { id: string, voucher_number: string }

// 问题：各模块code字段不一致，有些是必填，有些是可选
```

---

## 二、设计方案

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        集中化ID编码体系架构                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        ID编码规则引擎                                  │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │  规则配置    │ │  编码生成   │ │  规则验证   │ │  批量编码   │ │ │
│  │  │  RuleConfig │ │CodeGenerator│ │RuleValidator│ │BatchEncoder │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        基础档案中心                                    │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│  │  │  组织架构    │ │  往来单位    │ │  项目合同    │ │  科目账户   │ │ │
│  │  │Organization │ │Counterparty │ │ ProjectContract│ │ AccountBook │ │ │
│  │  │ • 公司      │ │ • 客户      │ │ • 项目      │ │ • 科目     │ │ │
│  │  │ • 部门      │ │ • 供应商    │ │ • 合同     │ │ • 辅助核算 │ │ │
│  │  │ • 岗位      │ │ • 员工      │ │ • 里程碑   │ │           │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        编码分配记录                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐   │ │
│  │  │ code_history: { prefix, date, seq, owner_id, module }      │   │ │
│  │  └─────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 编码规则设计

#### 2.2.1 编码组成结构

```typescript
// 编码格式: {前缀}{日期}{流水号}{校验位}

// 示例:
// 公司编码:   C20240101001X
// 部门编码:   D20240101001
// 员工编码:   E20240101001
// 客户编码:   CU20240101001
// 供应商编码: SU20240101001
// 项目编码:   P20240101001
// 合同编码:   CT20240101001
// 科目编码:   A1001001
// 凭证编号:   V20240100001
// 发票编号:   I20240101001

interface CodeStructure {
  prefix: string;           // 前缀: 2-4位字母
  datePart: string;         // 日期部分: YYYYMMDD 或 YYYYMM
  sequencePart: string;     // 流水号: 3-6位数字
  checkDigit?: string;     // 校验位: 1位 (可选)
}
```

#### 2.2.2 编码前缀规则表

| 类别 | 模块 | 前缀 | 编码规则 | 示例 |
|------|------|------|---------|------|
| 组织架构 | HRM | C | C + YYYYMMDD + NNN | C20240101001 |
| 组织架构 | HRM | D | D + YYYYMMDD + NNN | D20240101001 |
| 组织架构 | HRM | P | P + YYYYMMDD + NNN | P20240101001 |
| 人员 | HRM | E | E + YYYYMMDD + NNN | E20240101001 |
| 往来单位 | CRM | CU | CU + YYYYMMDD + NNN | CU20240101001 |
| 往来单位 | CRM | CO | CO + YYYYMMDD + NNN | CO20240101001 |
| 往来单位 | SRM | SU | SU + YYYYMMDD + NNN | SU20240101001 |
| 项目合同 | PM | PRJ | PRJ + YYYYMMDD + NNN | PRJ20240101001 |
| 项目合同 | PM | CT | CT + YYYYMMDD + NNN | CT20240101001 |
| 项目合同 | PM | MS | MS + YYYYMMDD + NNN | MS20240101001 |
| 财务 | ERP | A | A + NNNN + NNNN | A1001001 |
| 财务 | ERP | V | V + YYYYMM + NNNNN | V20240100001 |
| 财务 | ERP | IV | IV + YYYYMMDD + NNN | IV20240101001 |
| 财务 | ERP | PV | PV + YYYYMMDD + NNN | PV20240101001 |
| 资产 | ERP | FA | FA + YYYYMMDD + NNN | FA20240101001 |
| 质量 | QMS | QI | QI + YYYYMMDD + NNN | QI20240101001 |
| 实验室 | LIMS | LI | LI + YYYYMMDD + NNN | LI20240101001 |

---

## 三、数据模型设计

### 3.1 编码规则配置

```typescript
// src/types/master-data/code-rule.ts

/**
 * 编码规则配置
 */
export interface CodeRule {
  id: string;
  
  // 基本信息
  name: string;                   // 规则名称
  code: string;                   // 规则编码
  module: ModuleType;            // 所属模块
  entity_type: string;           // 实体类型 (如: company, department, customer)
  
  // 编码结构
  prefix: string;                 // 前缀
  prefix_type: 'fixed' | 'variable';  // 前缀类型
  prefix_variables?: {            // 可变前缀
    field: string;               // 引用的字段
    format?: string;             // 格式化方式
  }[];
  
  // 日期部分
  include_date: boolean;          // 是否包含日期
  date_format: 'YYYY' | 'YYYYMM' | 'YYYYMMDD';  // 日期格式
  date_source: 'current' | 'field';  // 日期来源
  date_field?: string;           // 日期字段 (当source为field时)
  
  // 流水号部分
  include_sequence: boolean;      // 是否包含流水号
  sequence_length: number;       // 流水号长度
  sequence_start: number;        // 起始值
  sequence_reset: 'never' | 'daily' | 'monthly' | 'yearly';  // 重置周期
  sequence_prefix?: string;       // 流水号前缀 (可填0)
  
  // 校验位
  include_check_digit: boolean;   // 是否包含校验位
  check_digit_type: 'mod10' | 'mod11' | 'custom';  // 校验算法
  
  // 分隔符
  separator: string;              // 分隔符 (如: -, /)
  separator_positions?: number[]; // 分隔符位置
  
  // 状态
  status: 'active' | 'inactive';
  is_default: boolean;           // 是否默认规则
  
  // 权限
  auto_generate: boolean;        // 是否自动生成
  allow_manual: boolean;         // 是否允许手工输入
  unique_constraint: boolean;     // 是否唯一约束
  
  // 审计
  created_at: string;
  updated_at: string;
}

export type ModuleType = 
  | 'hrm' | 'crm' | 'srm' | 'pm' | 'erp' | 'qms' | 'lims' | 'ehs' | 'wms';
```

### 3.2 基础档案统一模型

```typescript
// src/types/master-data/organization.ts

/**
 * 组织架构档案 - 统一管理
 */
export interface Organization {
  id: string;
  code: string;                   // 统一编码
  
  // 基本信息
  name: string;
  short_name?: string;
  type: OrganizationType;
  
  // 层级关系
  parent_id?: string;             // 上级组织ID
  level: number;                  // 层级深度
  
  // 组织属性
  organization_type: OrganizationType;  // 组织类型
  industry?: string;             // 所属行业
  
  // 扩展属性
  legal_representative?: string;  // 法人代表
  contact_person?: string;        // 联系人
  contact_phone?: string;         // 联系电话
  
  // 地址信息
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  
  // 工商信息
  registration_number?: string;   // 工商注册号
  tax_number?: string;           // 税务登记号
  bank_account?: string;         // 银行账号
  bank_name?: string;            // 开户行
  
  // 财务属性
  accounting_currency?: string;  // 记账本位币
  fiscal_year_start?: number;     // 财年起始月
  tax_type?: string;             // 纳税人类型
  
  // 合并报表属性
  consolidation_type?: 'parent' | 'subsidiary' | 'associate';
  ownership_percentage?: number; // 持股比例
  
  // 状态
  status: 'active' | 'inactive' | 'liquidating';
  effective_date?: string;       // 生效日期
  expiry_date?: string;          // 到期日期
  
  // 审计
  created_at: string;
  updated_at: string;
}

export type OrganizationType = 
  | 'group'       // 企业集团
  | 'company'     // 公司
  | 'branch'      // 分公司
  | 'department'  // 部门
  | 'team'        // 班组
  | 'cost_center' // 成本中心
  | 'profit_center'; // 利润中心

/**
 * 人员档案 - 统一管理
 */
export interface Person {
  id: string;
  code: string;                   // 统一编码
  
  // 基本信息
  name: string;
  name_en?: string;
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  
  // 身份信息
  id_card_number?: string;
  id_card_type?: 'id_card' | 'passport' | 'military_id';
  
  // 联系信息
  phone?: string;
  phone_mobile?: string;
  email?: string;
  wechat?: string;
  address?: string;
  
  // 紧急联系人
  emergency_contact?: string;
  emergency_phone?: string;
  
  // 组织归属
  organization_id?: string;      // 所属组织ID
  department_id?: string;        // 所属部门ID
  position_id?: string;          // 岗位ID
  
  // 人员类型
  person_type: PersonType;
  
  // 财务信息
  bank_card_number?: string;
  bank_name?: string;
  salary?: number;
  
  // 税务信息
  tax_id?: string;               // 纳税人识别号
  tax_level?: number;            // 税级
  
  // 状态
  status: 'active' | 'inactive' | 'resigned';
  hire_date?: string;
  leave_date?: string;
  
  // 审计
  created_at: string;
  updated_at: string;
}

export type PersonType = 
  | 'employee'    // 员工
  | 'contractor'  // 合同工
  | 'temporary'   // 临时工
  | 'intern'      // 实习生
  | 'outsider';   // 外部人员

/**
 * 往来单位档案 - 统一管理客户和供应商
 */
export interface Counterparty {
  id: string;
  code: string;                   // 统一编码
  
  // 基本信息
  name: string;
  short_name?: string;
  name_en?: string;
  
  // 单位类型
  counterparty_type: CounterpartyType;
  
  // 联系信息
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  
  // 地址
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  zip_code?: string;
  
  // 行业
  industry?: string;
  business_scope?: string;
  
  // 工商信息
  registration_number?: string;
  tax_number?: string;
  legal_representative?: string;
  
  // 银行信息
  bank_accounts: BankAccount[];
  
  // 财务属性
  credit_limit?: number;          // 信用额度
  credit_term_days?: number;      // 信用期限(天)
  payment_terms?: string;         // 付款条款
  tax_type?: 'general' | 'small'; // 纳税人类型
  
  // 关联人员
  sales_id?: string;             // 关联销售员
  procurement_id?: string;        // 关联采购员
  
  // 分类标签
  tags?: string[];
  category?: string;
  
  // 状态
  status: 'active' | 'inactive' | 'blocked';
  cooperation_start?: string;
  cooperation_end?: string;
  
  // 审计
  created_at: string;
  updated_at: string;
}

export type CounterpartyType = 
  | 'customer'     // 客户
  | 'supplier'     // 供应商
  | 'both';        // 既是客户也是供应商

export interface BankAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_code?: string;           // 行号
  is_default: boolean;
}

/**
 * 项目档案 - 统一管理
 */
export interface Project {
  id: string;
  code: string;                   // 统一编码
  
  // 基本信息
  name: string;
  name_en?: string;
  description?: string;
  
  // 项目类型
  project_type: ProjectType;
  
  // 组织归属
  organization_id?: string;       // 所属公司
  department_id?: string;        // 所属部门
  owner_id?: string;             // 项目负责人
  
  // 时间
  start_date?: string;
  end_date?: string;
  actual_end_date?: string;
  
  // 合同信息
  contract_id?: string;          // 关联合同
  contract_amount?: number;      // 合同金额
  
  // 预算
  budget?: number;
  
  // 状态
  status: ProjectStatus;
  
  // 审计
  created_at: string;
  updated_at: string;
}

export type ProjectType = 
  | 'internal'      // 内部项目
  | 'contract'      // 合同项目
  | 'research'      // 研发项目
  | 'investment';   // 投资项目

export type ProjectStatus = 
  | 'draft' | 'approved' | 'in_progress' 
  | 'suspended' | 'completed' | 'cancelled';

/**
 * 科目档案 - 会计科目统一管理
 */
export interface AccountingSubject {
  id: string;
  code: string;                   // 科目编码
  
  // 基本信息
  name: string;
  name_en?: string;
  full_name?: string;
  
  // 科目属性
  category: AccountCategory;
  balance_direction: 'debit' | 'credit';  // 余额方向
  
  // 层级关系
  parent_id?: string;
  parent_code?: string;
  level: number;
  
  // 辅助核算
  dimensions: AccountingDimension[];
  is_cash_flow: boolean;
  
  // 期末处理
  is_year_end_close: boolean;     // 年末结转
  year_end_subject_id?: string;    // 结转对方科目
  
  // 数量核算
  enable_quantity: boolean;        // 启用数量核算
  unit?: string;                  // 默认单位
  
  // 外币核算
  enable_foreign_currency: boolean;
  default_currency?: string;
  
  // 状态
  status: 'active' | 'disabled';
  
  // 审计
  created_at: string;
  updated_at: string;
}

export type AccountCategory = 
  | 'asset'      // 资产
  | 'liability'  // 负债
  | 'equity'     // 权益
  | 'cost'       // 成本
  | 'expense'    // 费用
  | 'income';    // 收入

export type AccountingDimension = 
  | 'company'      // 公司
  | 'department'   // 部门
  | 'project'      // 项目
  | 'customer'     // 客户
  | 'supplier'     // 供应商
  | 'employee'     // 员工
  | 'product'      // 产品
  | 'bank';        // 银行账户
```

---

## 四、API设计

### 4.1 编码服务API

```typescript
// src/api/master-data/code.ts

/**
 * 编码服务API
 */
export const codeApi = {
  // 获取下一个编码
  getNextCode: (params: {
    entity_type: string;
    module: ModuleType;
    prefix_variables?: Record<string, string>;
    date_field_value?: string;
  }) => masterDataClient.post('/api/v1/master/codes/generate', params),
  
  // 批量获取编码
  batchGetNextCodes: (params: {
    requests: {
      entity_type: string;
      module: ModuleType;
      quantity: number;
      prefix_variables?: Record<string, string>;
    }[];
  }) => masterDataClient.post('/api/v1/master/codes/batch-generate', params),
  
  // 验证编码
  validateCode: (params: {
    entity_type: string;
    code: string;
  }) => masterDataClient.post('/api/v1/master/codes/validate', params),
  
  // 预留编码
  reserveCode: (params: {
    entity_type: string;
    module: ModuleType;
    quantity: number;
    reserve_days?: number;  // 预留天数
  }) => masterDataClient.post('/api/v1/master/codes/reserve', params),
  
  // 释放预留编码
  releaseCode: (reservation_id: string) =>
    masterDataClient.delete(`/api/v1/master/codes/reserve/${reservation_id}`),
  
  // 获取编码规则
  getCodeRules: (params?: { module?: ModuleType; entity_type?: string }) =>
    masterDataClient.get('/api/v1/master/code-rules', { params }),
  
  // 创建编码规则
  createCodeRule: (data: CreateCodeRuleRequest) =>
    masterDataClient.post('/api/v1/master/code-rules', data),
  
  // 更新编码规则
  updateCodeRule: (id: string, data: UpdateCodeRuleRequest) =>
    masterDataClient.put(`/api/v1/master/code-rules/${id}`, data),
  
  // 删除编码规则
  deleteCodeRule: (id: string) =>
    masterDataClient.delete(`/api/v1/master/code-rules/${id}`),
  
  // 预览编码格式
  previewCode: (params: {
    rule_id: string;
    date_value?: string;
    variables?: Record<string, string>;
  }) => masterDataClient.post('/api/v1/master/code-rules/preview', params),
};
```

### 4.2 基础档案API

```typescript
// src/api/master-data/organization.ts

/**
 * 组织架构API
 */
export const organizationApi = {
  // 列表
  list: (params?: {
    type?: OrganizationType[];
    parent_id?: string;
    status?: string[];
    page?: number;
    page_size?: number;
  }) => masterDataClient.get('/api/v1/master/organizations', { params }),
  
  // 树形结构
  getTree: (params?: {
    root_id?: string;
    include_inactive?: boolean;
  }) => masterDataClient.get('/api/v1/master/organizations/tree', { params }),
  
  // 详情
  get: (id: string) =>
    masterDataClient.get(`/api/v1/master/organizations/${id}`),
  
  // 创建
  create: (data: CreateOrganizationRequest) =>
    masterDataClient.post('/api/v1/master/organizations', data),
  
  // 更新
  update: (id: string, data: UpdateOrganizationRequest) =>
    masterDataClient.put(`/api/v1/master/organizations/${id}`, data),
  
  // 删除
  delete: (id: string) =>
    masterDataClient.delete(`/api/v1/master/organizations/${id}`),
  
  // 启用/禁用
  setStatus: (id: string, status: string) =>
    masterDataClient.put(`/api/v1/master/organizations/${id}/status`, { status }),
  
  // 获取下级组织
  getChildren: (id: string) =>
    masterDataClient.get(`/api/v1/master/organizations/${id}/children`),
  
  // 获取人员列表
  getPersons: (id: string, params?: { role?: string }) =>
    masterDataClient.get(`/api/v1/master/organizations/${id}/persons`, { params }),
};

/**
 * 往来单位API
 */
export const counterpartyApi = {
  list: (params?: {
    type?: CounterpartyType[];
    status?: string[];
    industry?: string;
    tags?: string[];
    page?: number;
    page_size?: number;
  }) => masterDataClient.get('/api/v1/master/counterparties', { params }),
  
  get: (id: string) =>
    masterDataClient.get(`/api/v1/master/counterparties/${id}`),
  
  create: (data: CreateCounterpartyRequest) =>
    masterDataClient.post('/api/v1/master/counterparties', data),
  
  update: (id: string, data: UpdateCounterpartyRequest) =>
    masterDataClient.put(`/api/v1/master/counterparties/${id}`, data),
  
  delete: (id: string) =>
    masterDataClient.delete(`/api/v1/master/counterparties/${id}`),
  
  // 转为客户
  convertToCustomer: (id: string) =>
    masterDataClient.post(`/api/v1/master/counterparties/${id}/convert-customer`, {}),
  
  // 转为供应商
  convertToSupplier: (id: string) =>
    masterDataClient.post(`/api/v1/master/counterparties/${id}/convert-supplier`, {}),
};

/**
 * 人员API
 */
export const personApi = {
  list: (params?: {
    type?: PersonType[];
    organization_id?: string;
    department_id?: string;
    status?: string[];
    page?: number;
    page_size?: number;
  }) => masterDataClient.get('/api/v1/master/persons', { params }),
  
  get: (id: string) =>
    masterDataClient.get(`/api/v1/master/persons/${id}`),
  
  create: (data: CreatePersonRequest) =>
    masterDataClient.post('/api/v1/master/persons', data),
  
  update: (id: string, data: UpdatePersonRequest) =>
    masterDataClient.put(`/api/v1/master/persons/${id}`, data),
  
  delete: (id: string) =>
    masterDataClient.delete(`/api/v1/master/persons/${id}`),
  
  // 批量导入
  batchImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return masterDataClient.post('/api/v1/master/persons/import', formData);
  },
};

/**
 * 项目API
 */
export const projectApi = {
  list: (params?: {
    type?: ProjectType[];
    status?: ProjectStatus[];
    organization_id?: string;
    page?: number;
    page_size?: number;
  }) => masterDataClient.get('/api/v1/master/projects', { params }),
  
  get: (id: string) =>
    masterDataClient.get(`/api/v1/master/projects/${id}`),
  
  create: (data: CreateProjectRequest) =>
    masterDataClient.post('/api/v1/master/projects', data),
  
  update: (id: string, data: UpdateProjectRequest) =>
    masterDataClient.put(`/api/v1/master/projects/${id}`, data),
  
  delete: (id: string) =>
    masterDataClient.delete(`/api/v1/master/projects/${id}`),
};

/**
 * 科目API
 */
export const accountApi = {
  list: (params?: {
    category?: AccountCategory[];
    parent_id?: string;
    level?: number;
    status?: string[];
    page?: number;
    page_size?: number;
  }) => masterDataClient.get('/api/v1/master/accounts', { params }),
  
  getTree: () => masterDataClient.get('/api/v1/master/accounts/tree'),
  
  get: (id: string) =>
    masterDataClient.get(`/api/v1/master/accounts/${id}`),
  
  create: (data: CreateAccountRequest) =>
    masterDataClient.post('/api/v1/master/accounts', data),
  
  update: (id: string, data: UpdateAccountRequest) =>
    masterDataClient.put(`/api/v1/master/accounts/${id}`, data),
  
  delete: (id: string) =>
    masterDataClient.delete(`/api/v1/master/accounts/${id}`),
  
  // 批量创建下级
  batchCreateChildren: (parent_id: string, accounts: CreateAccountRequest[]) =>
    masterDataClient.post(`/api/v1/master/accounts/${parent_id}/children-batch`, { accounts }),
};
```

---

## 五、前端实现

### 5.1 编码输入组件

```typescript
// src/components/master-data/CodeInput.tsx

interface CodeInputProps {
  value?: string;
  onChange: (value: string) => void;
  entityType: string;
  module: ModuleType;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  error?: string;
}

export const CodeInput: React.FC<CodeInputProps> = ({
  value,
  onChange,
  entityType,
  module,
  disabled,
  readOnly,
  placeholder,
  error,
}) => {
  const [showGenerate, setShowGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 获取下一个编码
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await codeApi.getNextCode({
        entity_type: entityType,
        module,
      });
      onChange(response.data.code);
    } catch (err) {
      toast.error('生成编码失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 验证编码
  const handleValidate = async (code: string) => {
    if (!code) return true;
    try {
      const response = await codeApi.validateCode({
        entity_type: entityType,
        code,
      });
      return response.data.valid;
    } catch {
      return false;
    }
  };
  
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        disabled={disabled || readOnly}
        placeholder={placeholder || '系统自动生成'}
        className={error ? 'border-red-500' : ''}
      />
      
      {!readOnly && (
        <>
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={disabled || loading}
            title="自动生成编码"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
          
          {value && (
            <Button
              variant="ghost"
              onClick={() => setShowGenerate(true)}
              disabled={disabled}
              title="查看编码规则"
            >
              <Info className="w-4 h-4" />
            </Button>
          )}
        </>
      )}
      
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
};
```

### 5.2 基础档案选择器

```typescript
// src/components/master-data/EntitySelector.tsx

/**
 * 往来单位选择器
 */
interface CounterpartySelectorProps {
  value?: string;
  onChange: (value: string, entity?: Counterparty) => void;
  types?: CounterpartyType[];  // 筛选类型
  multiple?: boolean;
  placeholder?: string;
}

export const CounterpartySelector: React.FC<CounterpartySelectorProps> = ({
  value,
  onChange,
  types,
  multiple,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['counterparties', { types, search }],
    queryFn: () => counterpartyApi.list({
      type: types,
      status: ['active'],
    }),
  });
  
  const selectedEntity = data?.items.find(item => item.id === value);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          {selectedEntity ? (
            <span>{selectedEntity.code} - {selectedEntity.name}</span>
          ) : (
            <span className="text-gray-400">{placeholder || '选择往来单位'}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[400px] p-0">
        <div className="p-2">
          <Input
            placeholder="搜索编码或名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {data?.items.map((entity) => (
              <div
                key={entity.id}
                className={cn(
                  "flex items-center justify-between p-2 cursor-pointer rounded hover:bg-slate-100",
                  value === entity.id && "bg-slate-100"
                )}
                onClick={() => {
                  onChange(entity.id, entity);
                  setOpen(false);
                }}
              >
                <div>
                  <div className="font-medium">{entity.code} - {entity.name}</div>
                  <div className="text-sm text-gray-500">
                    {entity.counterparty_type === 'customer' ? '客户' : 
                     entity.counterparty_type === 'supplier' ? '供应商' : '客户/供应商'}
                  </div>
                </div>
                {entity.status === 'blocked' && (
                  <Badge variant="destructive">已禁用</Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

/**
 * 项目选择器
 */
interface ProjectSelectorProps {
  value?: string;
  onChange: (value: string, entity?: Project) => void;
  organizationId?: string;
  types?: ProjectType[];
  status?: ProjectStatus[];
  multiple?: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  value,
  onChange,
  organizationId,
  types,
  status,
  multiple,
}) => {
  // 类似CounterpartySelector的实现
  // ...
};

/**
 * 组织架构选择器
 */
interface OrganizationSelectorProps {
  value?: string;
  onChange: (value: string, entity?: Organization) => void;
  types?: OrganizationType[];
  showPersonCount?: boolean;
  multiple?: boolean;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  value,
  onChange,
  types,
  showPersonCount,
  multiple,
}) => {
  const [open, setOpen] = useState(false);
  
  const { data: treeData } = useQuery({
    queryKey: ['organizations-tree', { types }],
    queryFn: () => organizationApi.getTree({ type: types }),
  });
  
  const renderTree = (nodes: OrganizationTreeNode[]) => {
    return nodes.map((node) => (
      <TreeItem
        key={node.id}
        nodeId={node.id}
        label={
          <div className="flex items-center justify-between w-full">
            <span>{node.code} - {node.name}</span>
            {showPersonCount && (
              <Badge variant="secondary">{node.person_count || 0}</Badge>
            )}
          </div>
        }
      >
        {node.children?.length > 0 && renderTree(node.children)}
      </TreeItem>
    ));
  };
  
  return (
    <TreeView
      className="w-full"
      defaultExpandedIds={[]}
      nodes={treeData?.items || []}
      renderNode={renderTree}
      onSelect={(id) => {
        onChange(id, treeData?.items.find(n => n.id === id));
        setOpen(false);
      }}
    />
  );
};
```

### 5.3 编码规则配置页面

```typescript
// src/pages/master-data/CodeRuleConfigPage.tsx

export const CodeRuleConfigPage: React.FC = () => {
  const { data: rules, isLoading } = useQuery({
    queryKey: ['code-rules'],
    queryFn: () => codeApi.getCodeRules(),
  });
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">编码规则配置</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建规则
        </Button>
      </div>
      
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>模块</TableHead>
                <TableHead>实体类型</TableHead>
                <TableHead>编码格式</TableHead>
                <TableHead>示例</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.items.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.module.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>{rule.entity_type}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatCodePattern(rule)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {rule.preview}
                  </TableCell>
                  <TableCell>
                    {rule.is_default && <Check className="w-4 h-4 text-green-500" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                      {rule.status === 'active' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleTest(rule)}>
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// 编码格式预览
function formatCodePattern(rule: CodeRule): string {
  const parts: string[] = [];
  
  // 前缀
  if (rule.prefix_type === 'fixed') {
    parts.push(rule.prefix);
  } else if (rule.prefix_variables) {
    parts.push(`{${ule.rule.prefix_variables.map(v => v.field).join('+')}}`);
  }
  
  // 日期
  if (rule.include_date) {
    parts.push(rule.date_format);
  }
  
  // 流水号
  if (rule.include_sequence) {
    const seq = rule.sequence_prefix || '';
    parts.push(seq.padEnd(rule.sequence_length, 'N'));
  }
  
  // 校验位
  if (rule.include_check_digit) {
    parts.push('X');
  }
  
  return parts.join(rule.separator || '');
}
```

---

## 六、实施建议

### 6.1 编码体系迁移策略

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         编码迁移实施步骤                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Phase 1: 基础数据清理 (1周)                                               │
│  ├── 导出各模块现有数据                                                     │
│  ├── 分析现有编码规则                                                     │
│  ├── 识别重复编码和异常数据                                                │
│  └── 数据清洗和规范化                                                      │
│                                                                              │
│  Phase 2: 编码规则配置 (1周)                                               │
│  ├── 定义统一编码规则                                                      │
│  ├── 配置编码生成器                                                        │
│  ├── 测试编码生成逻辑                                                      │
│  └── 设置编码预留机制                                                      │
│                                                                              │
│  Phase 3: 历史数据编码补录 (1周)                                           │
│  ├── 按规则批量生成历史编码                                                │
│  ├── 更新各模块数据                                                        │
│  ├── 验证数据完整性                                                        │
│  └── 建立编码映射表                                                        │
│                                                                              │
│  Phase 4: 新增数据启用新编码 (持续)                                        │
│  ├── 前端集成CodeInput组件                                                │
│  ├── 后端启用自动编码生成                                                  │
│  └── 监控编码使用情况                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 关键配置示例

```typescript
// 公司编码规则配置
const companyCodeRule: CodeRule = {
  id: 'rule-company',
  name: '公司编码规则',
  code: 'COMPANY',
  module: 'hrm',
  entity_type: 'company',
  
  prefix: 'C',
  prefix_type: 'fixed',
  
  include_date: true,
  date_format: 'YYYYMMDD',
  date_source: 'current',
  
  include_sequence: true,
  sequence_length: 3,
  sequence_start: 1,
  sequence_reset: 'never',  // 不重置，保证唯一性
  
  include_check_digit: true,
  check_digit_type: 'mod10',
  
  separator: '',
  auto_generate: true,
  allow_manual: false,
  unique_constraint: true,
  is_default: true,
};

// 客户编码规则配置
const customerCodeRule: CodeRule = {
  id: 'rule-customer',
  name: '客户编码规则',
  code: 'CUSTOMER',
  module: 'crm',
  entity_type: 'customer',
  
  prefix: 'CU',
  prefix_type: 'fixed',
  
  include_date: true,
  date_format: 'YYYYMMDD',
  date_source: 'current',
  
  include_sequence: true,
  sequence_length: 4,
  sequence_start: 1,
  sequence_reset: 'never',
  
  include_check_digit: false,
  
  separator: '',
  auto_generate: true,
  allow_manual: true,  // 允许手工输入
  unique_constraint: true,
  is_default: true,
};

// 科目编码规则配置
const accountCodeRule: CodeRule = {
  id: 'rule-account',
  name: '会计科目编码规则',
  code: 'ACCOUNT',
  module: 'erp',
  entity_type: 'account',
  
  prefix: '',
  prefix_type: 'fixed',
  
  include_date: false,  // 科目不需要日期
  
  include_sequence: false,
  
  // 使用自定义格式: 4-2-2-2-2... 分级编码
  // 规则: A + NNNN + NN + NN + NN...
  
  separator: '',
  auto_generate: true,
  allow_manual: true,
  unique_constraint: true,
  is_default: true,
};
```

### 6.3 与外部ERP的编码映射

```typescript
// 外部ERP编码映射配置
interface ExternalCodeMapping {
  id: string;
  
  // 内部编码
  internal_entity_type: string;
  internal_code_rule_id: string;
  
  // 外部编码
  external_erp_type: ExternalErpType;
  external_entity_type: string;
  external_code_field: string;
  
  // 映射规则
  mapping_type: 'direct' | 'lookup' | 'transform';
  transform_expression?: string;  // 如: 'CU' + SUBSTRING(code, 2)
  
  // 同步策略
  sync_direction: 'import' | 'export' | 'bidirectional';
  conflict_strategy: 'internal_wins' | 'external_wins' | 'newest_wins';
  
  status: 'active' | 'inactive';
}

// 示例映射配置
const customerMapping: ExternalCodeMapping = {
  id: 'mapping-customer-kingdee',
  internal_entity_type: 'customer',
  internal_code_rule_id: 'rule-customer',
  
  external_erp_type: 'kingdee_cloud',
  external_entity_type: 'Customer',
  external_code_field: 'FNumber',
  
  mapping_type: 'direct',
  
  sync_direction: 'bidirectional',
  conflict_strategy: 'internal_wins',
  
  status: 'active',
};
```

---

## 七、总结

集中化ID编码体系的核心价值:

1. **统一性**: 全系统使用统一的编码规则，避免重复和冲突
2. **可追溯性**: 编码包含业务属性，便于统计分析
3. **自动化**: 自动生成编码，减少人工错误
4. **规范化**: 强制校验，确保数据质量
5. **可扩展性**: 支持外部系统映射，便于集成

通过本方案的实施，可以建立起完善的基础档案管理体系，为后续的业务闭环和财务报表打下坚实的数据基础。
