# ERP模块全模块整合设计方案

## 一、现有模块架构分析

### 1.1 当前模块结构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOPEMS 系统架构                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    HRM      │  │    CRM      │  │     PM      │  │    ERP      │        │
│  │  人力资源   │  │   客户关系   │  │   项目管理   │  │   企业资源   │        │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤        │
│  │ • Company   │  │ • Customer  │  │ • Project   │  │ • Asset     │        │
│  │ • Department│  │ • Contact   │  │ • Phase     │  │ • Expense   │        │
│  │ • Employee  │  │ • Opportunity│  │ • Milestone │  │ • Budget    │        │
│  │ • Role      │  │ • Interaction│ │ • Member    │  │ • Voucher   │        │
│  │ • Position  │  │             │  │             │  │ • Receivable│        │
│  │ • Attendance│  │             │  │             │  │ • Payable   │        │
│  │ • Leave     │  │             │  │             │  │ • Subject   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────────────────────┤
│                              共享基础设施                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   组织架构   │  │   权限管理   │  │   消息通知   │  │   工作流     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 各模块核心实体

#### HRM模块 (人力资源管理)

| 实体 | 核心字段 | 财务关联 |
|------|---------|---------|
| Company | id, name, tax_number, bank_info | 财务报表主体 |
| Department | id, name, company_id, parent_id | 费用归集部门 |
| Employee | id, name, department_id, position, salary | 工资核算、费用归属 |
| Position | id, name, department_id, min_salary, max_salary | 工资预算 |
| AttendanceRecord | id, employee_id, date, work_hours | 人工成本核算 |
| LeaveRequest | id, employee_id, leave_type, days | 人工成本核算 |

#### CRM模块 (客户关系管理)

| 实体 | 核心字段 | 财务关联 |
|------|---------|---------|
| Customer | id, name, credit_limit, industry | 应收账款、客户信用 |
| Contact | id, customer_id, email, phone | 客户联系信息 |
| Opportunity | id, customer_id, value, stage | 销售预测 |
| Interaction | id, customer_id, type, content | 客户服务成本 |

#### PM模块 (项目管理)

| 实体 | 核心字段 | 财务关联 |
|------|---------|---------|
| Project | id, name, budget, status, leader | 项目成本核算 |
| ProjectPhase | id, project_id, progress, dates | 项目进度跟踪 |
| ProjectMilestone | id, project_id, date, status | 项目验收结算 |
| ProjectMember | id, project_id, user_id, role | 项目人力成本 |

#### ERP模块 (企业资源计划)

| 实体 | 核心字段 | 业务来源 |
|------|---------|---------|
| Asset | id, purchase_amount, depreciation | 资产增加 |
| Expense | id, amount, department_id, applicant | 费用报销 |
| Budget | id, total_budget, used_amount | 预算控制 |
| Voucher | id, voucher_number, items[], status | 凭证分录 |
| Receivable | id, customer_name, amount, status | 应收账款 |
| Payable | id, supplier_name, amount, status | 应付账款 |
| Subject | id, code, name, category | 会计科目 |

---

## 二、模块间数据流转设计

### 2.1 数据流转总图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           模块间数据流转架构                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   HRM ──────────────────┐                                                    │
│   ├─ Employee ──────────┼──→ 工资凭证 ──→ 人工成本                           │
│   ├─ Department ────────┼──→ 部门费用 ──→ 利润表部门维度                      │
│   └─ Attendance ───────┴──→ 工时统计 ──→ 项目人工成本                        │
│                           │                                                  │
│   CRM ──────────────────┼──────────────────────────────┐                     │
│   ├─ Customer ──────────┼──→ 应收账款 ──→ 资产负债表   │                     │
│   │                     │                              │                     │
│   │                     │    ┌────────────────────────┘                     │
│   │                     │    │                                               │
│   │                     ▼    ▼                                               │
│   └─ Opportunity ───────┴──→ 销售预测 ──→ 收入预算                            │
│                               │                                               │
│   PM ────────────────────────┼──────────────────────────────┐                 │
│   ├─ Project ────────────────┼──→ 项目成本 ──→ 利润表项目维度 ─┐              │
│   │                         │                                │              │
│   │                         │    ┌────────────────────────────┘              │
│   │                         │    │                                            │
│   │                         ▼    ▼                                            │
│   ├─ ProjectPhase ──────────┴──→ 项目进度 ──→ 收入确认                         │
│   │                                                                          │
│   └─ ProjectMilestone ───────→ 里程碑结算 ──→ 开票/收款                        │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │                          凭证生成引擎                                    │ │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│   │  │ 报销凭证 │  │ 工资凭证 │  │ 销售凭证 │  │ 采购凭证 │  │ 资产凭证 │  │ │
│   │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │ │
│   │       │             │             │             │             │       │ │
│   │       └─────────────┴─────────────┴─────────────┴─────────────┘       │ │
│   │                                    │                                    │ │
│   │                                    ▼                                    │ │
│   │                         ┌──────────────────┐                           │ │
│   │                         │   凭证数据库      │                           │ │
│   │                         └────────┬─────────┘                           │ │
│   └──────────────────────────────────┼────────────────────────────────────┘ │
│                                      ▼                                       │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │                          财务报表生成                                  │ │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │ │
│   │  │ 资产负债表  │  │  利润表     │  │ 现金流量表  │                     │ │
│   │  └─────────────┘  └─────────────┘  └─────────────┘                     │ │
│   └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 业务场景与凭证生成规则

#### 场景1: 员工报销

```
用户提交报销申请
       │
       ▼
HRM模块: 验证员工信息和部门
       │
       ▼
审批流程 (工作流引擎)
       │
       ├─── 审批通过 ──→ ERP模块: 生成费用报销凭证
       │                    │
       │                    ├── 借: 管理费用/销售费用 (按部门、项目核算)
       │                    └── 贷: 银行存款/应付账款
       │
       └─── 审批拒绝 ──→ 返回申请人
```

#### 场景2: 工资发放

```
HRM模块: 计算工资
       │
       ├── 基本工资
       ├── 绩效奖金
       ├── 社保公积金代扣
       └── 个人所得税代扣
       │
       ▼
ERP模块: 生成工资发放凭证
       │
       ├── 借: 工资薪金支出 (按部门核算)
       ├── 借: 社会保险费 (按部门核算)
       ├── 贷: 应交个人所得税
       ├── 贷: 其他应付款-社保公积金
       └── 贷: 银行存款
       │
       ▼
HRM模块: 更新员工工资发放状态
```

#### 场景3: 销售收款

```
CRM模块: 商机转化
       │
       ▼
PM模块: 项目立项/合同签订
       │
       ▼
ERP模块: 生成销售发票
       │
       ├── 借: 应收账款 (客户核算)
       └── 贷: 主营业务收入 (项目核算)
       │
       ▼
收款时:
       │
       ├── 借: 银行存款
       └── 贷: 应收账款
       │
       ▼
CRM模块: 更新客户应收账款余额
```

#### 场景4: 采购付款

```
CRM模块: 供应商管理
       │
       ▼
PM模块: 项目采购需求
       │
       ▼
ERP模块: 生成采购入库单/发票
       │
       ├── 借: 库存商品/在途物资 (项目核算)
       └── 贷: 应付账款 (供应商核算)
       │
       ▼
付款时:
       │
       ├── 借: 应付账款
       └── 贷: 银行存款
       │
       ▼
CRM模块: 更新供应商应付账款余额
```

---

## 三、整合数据模型设计

### 3.1 扩展的科目体系

```typescript
// src/types/finance/accounting-subject.ts

/**
 * 会计科目类别枚举
 */
export enum AccountCategory {
  ASSET = 'asset',           // 资产类
  LIABILITY = 'liability',    // 负债类
  EQUITY = 'equity',          // 权益类
  COST = 'cost',              // 成本类
  EXPENSE = 'expense',        // 费用类
  INCOME = 'income',          // 收入类
}

/**
 * 核算维度枚举
 */
export enum AccountingDimension {
  COMPANY = 'company',           // 公司维度
  DEPARTMENT = 'department',     // 部门维度
  PROJECT = 'project',           // 项目维度
  CUSTOMER = 'customer',         // 客户维度
  SUPPLIER = 'supplier',        // 供应商维度
  EMPLOYEE = 'employee',         // 员工维度
  PRODUCT = 'product',           // 产品维度
  BANK = 'bank',                 // 银行账户维度
}

/**
 * 会计科目
 */
export interface AccountingSubject {
  id: string;
  code: string;                    // 科目编码 (如: 1001 库存现金)
  name: string;                    // 科目名称
  category: AccountCategory;        // 科目类别
  parent_id?: string;               // 上级科目ID
  level: number;                   // 层级深度
  balance_direction: 'debit' | 'credit';  // 余额方向
  
  // 辅助核算设置
  dimensions: AccountingDimension[];  // 启用的辅助核算维度
  
  // 现金流量表相关
  is_cash_flow: boolean;           // 是否参与现金流量表
  cash_flow_type?: 'operating' | 'investing' | 'financing';  // 现金流量类型
  
  // 期末处理
  is_year_end: boolean;            // 年末结转科目
  year_end_subject_id?: string;    // 年末结转对方科目
  
  // 状态与审计
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

/**
 * 辅助核算维度值
 */
export interface DimensionValue {
  id: string;
  dimension: AccountingDimension;
  code: string;
  name: string;
  parent_id?: string;
  company_id?: string;            // 所属公司 (用于多公司场景)
}

/**
 * 凭证分录 - 增强版
 */
export interface VoucherEntry {
  id: string;
  voucher_id: string;
  line_number: number;
  
  // 科目信息
  subject_id: string;
  subject_code: string;
  subject_name: string;
  
  // 金额
  debit_amount: number;
  credit_amount: number;
  
  // 辅助核算维度
  company_id?: string;            // 公司维度
  company_name?: string;
  department_id?: string;         // 部门维度
  department_name?: string;
  project_id?: string;            // 项目维度
  project_name?: string;
  customer_id?: string;           // 客户维度
  customer_name?: string;
  supplier_id?: string;           // 供应商维度
  supplier_name?: string;
  employee_id?: string;           // 员工维度
  employee_name?: string;
  product_id?: string;            // 产品维度
  product_name?: string;
  bank_id?: string;              // 银行账户维度
  bank_name?: string;
  
  // 数量核算
  quantity?: number;
  unit?: string;
  unit_price?: number;
  
  // 描述
  summary?: string;
  
  // 时间戳
  created_at: string;
  updated_at: string;
}
```

### 3.2 多公司组织架构

```typescript
// src/types/finance/organization.ts

/**
 * 公司主体
 */
export interface Company {
  id: string;
  parent_id?: string;              // 母公司ID (用于集团架构)
  code: string;                    // 公司编码
  name: string;                    // 公司名称
  short_name?: string;
  
  // 工商信息
  registration_number?: string;     // 工商注册号
  tax_number?: string;             // 税务登记号
  bank_account?: string;           // 基本户账号
  bank_name?: string;              // 开户行
  
  // 地址与联系方式
  address?: string;
  phone?: string;
  email?: string;
  
  // 财务核算设置
  accounting_currency: string;     // 记账本位币
  fiscal_year_start: number;        // 财年起始月份 (1-12)
  tax_type?: string;               // 纳税人类型 (一般纳税人/小规模)
  
  // 合并报表设置
  consolidation_type?: 'parent' | 'subsidiary' | 'associate';
  ownership_percentage?: number;   // 持股比例 (子公司用)
  
  // 状态
  status: 'active' | 'inactive' | 'liquidation';
  effective_date?: string;         // 生效日期
  created_at: string;
  updated_at: string;
}

/**
 * 组织架构树
 */
export interface OrganizationTree {
  company: Company;
  departments: DepartmentNode[];
}

export interface DepartmentNode {
  department: Department;
  children: DepartmentNode[];
  employees: Employee[];
}

/**
 * 部门
 */
export interface Department {
  id: string;
  company_id: string;              // 所属公司
  code: string;
  name: string;
  parent_id?: string;              // 上级部门
  manager_id?: string;            // 部门经理(员工ID)
  cost_center_code?: string;       // 成本中心编码
  
  // 预算相关
  budget_control: boolean;         // 是否进行预算控制
  
  // 状态
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
```

### 3.3 员工与财务关联

```typescript
// src/types/finance/employee-finance.ts

/**
 * 员工财务信息
 */
export interface EmployeeFinance {
  employee_id: string;
  employee_name: string;
  department_id: string;
  department_name: string;
  company_id: string;
  
  // 银行账户信息 (用于工资发放)
  bank_card_number?: string;
  bank_name?: string;
  
  // 薪资信息
  base_salary: number;            // 基本工资
  position_salary?: number;       // 岗位工资
  social_security_base?: number;   // 社保缴费基数
  housing_fund_base?: number;     // 公积金缴费基数
  
  // 个人所得税
  tax_id?: string;               // 纳税人识别号
  tax_level?: string;             // 税级
  
  // 借款信息
  personal_advance_balance?: number;  // 个人借款余额
}

/**
 * 工资单
 */
export interface Payroll {
  id: string;
  company_id: string;
  department_id: string;
  employee_id: string;
  period: string;                 // 工资期间 (YYYY-MM)
  
  // 应发项目
  base_salary: number;
  position_salary: number;
  performance_bonus: number;
  overtime_pay: number;
  allowances: number;             // 补贴
  other_additions: number;       // 其他加项
  
  // 扣除项目
  absence_deduction: number;     // 缺勤扣款
  late_deduction: number;        // 迟到扣款
  social_security: number;        // 社保扣款(个人)
  housing_fund: number;          // 公积金扣款(个人)
  individual_income_tax: number; // 个人所得税
  other_deductions: number;      // 其他扣款
  
  // 计算结果
  gross_salary: number;           // 应发工资
  total_deductions: number;       // 扣款合计
  net_salary: number;             // 实发工资
  
  // 状态
  status: 'calculating' | 'pending' | 'approved' | 'paid';
  paid_at?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * 报销单 - 增强版
 */
export interface ExpenseReport {
  id: string;
  company_id: string;
  expense_number: string;
  
  // 申请信息
  applicant_id: string;
  applicant_name: string;
  department_id: string;
  department_name: string;
  
  // 费用信息
  expense_type: ExpenseType;
  amount: number;
  tax_amount?: number;           // 税额
  total_amount: number;          // 含税金额
  
  // 关联信息
  project_id?: string;           // 项目 (可选)
  project_name?: string;
  customer_id?: string;          // 客户 (可选)
  supplier_id?: string;          // 供应商 (可选)
  
  // 发票信息
  invoice_count: number;
  has_tax_invoice: boolean;
  
  // 描述
  description?: string;
  
  // 审批流程
  status: ExpenseStatus;
  approver_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  
  // 报销时间
  expense_date: string;          // 费用发生日期
  reimbursed_at?: string;
  
  created_at: string;
  updated_at: string;
}

export enum ExpenseType {
  TRAVEL = 'travel',             // 差旅费
  MEAL = 'meal',                 // 餐费
  ENTERTAINMENT = 'entertainment', // 招待费
  TRANSPORTATION = 'transportation', // 交通费
  ACCOMMODATION = 'accommodation', // 住宿费
  OFFICE_SUPPLIES = 'office_supplies', // 办公用品
  COMMUNICATION = 'communication', // 通讯费
  TRAINING = 'training',         // 培训费
  BUSINESS = 'business',         // 业务费
  OTHER = 'other',               // 其他
}

export enum ExpenseStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REIMBURSED = 'reimbursed',
  CANCELLED = 'cancelled',
}
```

### 3.4 客户与供应商

```typescript
// src/types/finance/customer-supplier.ts

/**
 * 客户财务信息
 */
export interface CustomerFinance {
  customer_id: string;
  customer_name: string;
  
  // 信用管理
  credit_limit: number;           // 信用额度
  credit_term_days: number;      // 信用期限(天)
  current_credit_used: number;   // 已用信用额度
  
  // 应收应付
  accounts_receivable: number;  // 应收账款余额
  advance_receivable: number;    // 预收账款余额
  overdue_receivable: number;    // 逾期应收账款
  
  // 交易统计
  total_sales: number;           // 累计销售额
  total_receipts: number;       // 累计收款
  last_transaction_date?: string;
  
  // 银行账户
  bank_accounts: BankAccount[];
  
  // 税号
  tax_number?: string;
  
  // 状态
  status: 'active' | 'blocked' | 'inactive';
}

/**
 * 供应商财务信息
 */
export interface SupplierFinance {
  supplier_id: string;
  supplier_name: string;
  
  // 付款条件
  payment_terms: string;         // 付款条款
  payment_days: number;         // 付款天数
  
  // 应收应付
  accounts_payable: number;      // 应付账款余额
  advance_payable: number;       // 预付账款余额
  overdue_payable: number;       // 逾期应付账款
  
  // 交易统计
  total_purchases: number;       // 累计采购额
  total_payments: number;        // 累计付款
  last_transaction_date?: string;
  
  // 银行账户
  bank_accounts: BankAccount[];
  
  // 税号
  tax_number?: string;
  
  // 状态
  status: 'active' | 'blocked' | 'inactive';
}

export interface BankAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
}

/**
 * 应收账款/应付账款明细
 */
export interface ReceivableRecord {
  id: string;
  company_id: string;
  customer_id?: string;
  customer_name?: string;
  
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  
  amount: number;
  tax_amount?: number;
  total_amount: number;
  
  received_amount: number;
  received_date?: string;
  
  // 关联项目
  project_id?: string;
  project_name?: string;
  
  // 核销状态
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  overdue_days?: number;
  
  created_at: string;
  updated_at: string;
}

export interface PayableRecord {
  id: string;
  company_id: string;
  supplier_id?: string;
  supplier_name?: string;
  
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  
  amount: number;
  tax_amount?: number;
  total_amount: number;
  
  paid_amount: number;
  paid_date?: string;
  
  // 关联项目
  project_id?: string;
  project_name?: string;
  
  // 核销状态
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  overdue_days?: number;
  
  created_at: string;
  updated_at: string;
}
```

### 3.5 项目财务信息

```typescript
// src/types/finance/project-finance.ts

/**
 * 项目财务信息
 */
export interface ProjectFinance {
  project_id: string;
  project_name: string;
  project_code: string;
  company_id: string;
  
  // 项目阶段
  phase: ProjectPhase;
  
  // 合同信息
  contract_amount: number;        // 合同金额(含税)
  contract_amount_ex_tax: number; // 合同金额(不含税)
  tax_rate: number;              // 税率
  tax_amount: number;            // 税额
  
  // 回款情况
  total_invoiced: number;        // 累计开票金额
  total_received: number;        // 累计收款金额
  pending_invoice: number;       // 待开票金额
  pending_receipt: number;       // 应收款金额
  
  // 成本情况
  budget_amount: number;         // 预算金额
  total_cost: number;            // 累计发生成本
  labor_cost: number;           // 人工成本
  material_cost: number;         // 材料成本
  other_cost: number;           // 其他成本
  remaining_budget: number;      // 剩余预算
  
  // 利润分析
  expected_profit: number;       // 预计利润
  actual_profit: number;         // 实际利润
  profit_margin: number;         // 利润率
  
  // 状态
  status: ProjectFinanceStatus;
  
  // 时间
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export enum ProjectPhase {
  PROSPECTING = 'prospecting',       // 意向跟踪
  NEGOTIATION = 'negotiation',       // 商务洽谈
  CONTRACT_SIGNING = 'contract_signing', // 合同签订
  EXECUTION = 'execution',           // 项目执行
  ACCEPTANCE = 'acceptance',         // 项目验收
  COMPLETED = 'completed',            // 项目完成
  CLOSED = 'closed',                 // 项目关闭
}

export enum ProjectFinanceStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  FROZEN = 'frozen',
  COMPLETED = 'completed',
  LOSS = 'loss',                     // 亏损
}

/**
 * 项目成本明细
 */
export interface ProjectCostDetail {
  id: string;
  project_id: string;
  period: string;                   // 成本期间
  
  // 成本构成
  labor_cost: LaborCostDetail[];
  material_cost: MaterialCostDetail[];
  expense_cost: ExpenseCostDetail[];
  subcontract_cost: SubcontractCostDetail[];
  
  // 合计
  total_cost: number;
  
  created_at: string;
}

export interface LaborCostDetail {
  employee_id: string;
  employee_name: string;
  department_name: string;
  work_hours: number;
  unit_price: number;
  amount: number;
}

export interface MaterialCostDetail {
  material_name: string;
  specification?: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface ExpenseCostDetail {
  expense_type: string;
  description: string;
  amount: number;
}

export interface SubcontractCostDetail {
  supplier_name: string;
  contract_no: string;
  amount: number;
}
```

---

## 四、整合API设计

### 4.1 API分层架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API 分层设计                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     聚合API层 (Facade API)                           │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │  │ /api/v1/finance│  │ /api/v1/reports│  │ /api/v1/consol │          │   │
│  │  │   财务总账     │  │    财务报表     │  │    合并报表    │          │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     业务API层 (Business API)                         │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │   │
│  │  │ /api/v1/erp    │  │ /api/v1/hrm    │  │ /api/v1/crm    │          │   │
│  │  │   ERP模块      │  │   HRM模块      │  │   CRM模块      │          │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 核心API端点

#### 4.2.1 凭证管理API

```typescript
// src/api/finance/voucher.ts

/**
 * 凭证管理API
 */
export const voucherApi = {
  // 基础CRUD
  list: (params: VoucherQueryParams) => get('/api/v1/finance/vouchers', params),
  get: (id: string) => get(`/api/v1/finance/vouchers/${id}`),
  create: (data: CreateVoucherRequest) => post('/api/v1/finance/vouchers', data),
  update: (id: string, data: UpdateVoucherRequest) => put(`/api/v1/finance/vouchers/${id}`, data),
  delete: (id: string) => delete(`/api/v1/finance/vouchers/${id}`),
  
  // 凭证处理
  submit: (id: string) => post(`/api/v1/finance/vouchers/${id}/submit`, {}),
  approve: (id: string, data: { comment?: string }) => post(`/api/v1/finance/vouchers/${id}/approve`, data),
  reject: (id: string, data: { reason: string }) => post(`/api/v1/finance/vouchers/${id}/reject`, data),
  post: (id: string) => post(`/api/v1/finance/vouchers/${id}/post`, {}),
  reverse: (id: string, data: { reason: string }) => post(`/api/v1/finance/vouchers/${id}/reverse`, data),
  
  // 批量操作
  batchCreate: (data: CreateVoucherRequest[]) => post('/api/v1/finance/vouchers/batch', data),
  batchDelete: (ids: string[]) => post('/api/v1/finance/vouchers/batch-delete', { ids }),
  
  // 导入导出
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return post('/api/v1/finance/vouchers/import', formData);
  },
  export: (params: VoucherQueryParams) => getBlob('/api/v1/finance/vouchers/export', params),
};

/**
 * 查询参数
 */
export interface VoucherQueryParams {
  page?: number;
  page_size?: number;
  period?: string;              // 会计期间
  start_date?: string;
  end_date?: string;
  status?: VoucherStatus[];
  maker_id?: string;
  department_id?: string;
  project_id?: string;
  subject_id?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;             // 搜索凭证号或摘要
}

export type VoucherStatus = 'draft' | 'submitted' | 'approved' | 'posted' | 'reversed';
```

#### 4.2.2 跨模块数据获取API

```typescript
// src/api/finance/integration.ts

/**
 * 整合API - 获取其他模块的数据用于财务核算
 */
export const integrationApi = {
  // 获取员工列表 (用于工资核算)
  getEmployeesForPayroll: (params: {
    company_id: string;
    department_ids?: string[];
    status?: string[];
  }) => get('/api/v1/finance/integration/employees', params),
  
  // 获取部门费用汇总 (用于费用报表)
  getDepartmentExpenseSummary: (params: {
    company_id: string;
    start_date: string;
    end_date: string;
    department_ids?: string[];
  }) => get('/api/v1/finance/integration/department-expenses', params),
  
  // 获取项目成本明细 (用于项目利润表)
  getProjectCostDetails: (params: {
    project_ids: string[];
    start_date?: string;
    end_date?: string;
  }) => get('/api/v1/finance/integration/project-costs', params),
  
  // 获取客户应收款 (用于对账)
  getCustomerReceivables: (params: {
    company_id: string;
    customer_ids?: string[];
  }) => get('/api/v1/finance/integration/customer-receivables', params),
  
  // 获取供应商应付款 (用于对账)
  getSupplierPayables: (params: {
    company_id: string;
    supplier_ids?: string[];
  }) => get('/api/v1/finance/integration/supplier-payables', params),
  
  // 获取银行余额
  getBankBalances: (params: {
    company_id: string;
  }) => get('/api/v1/finance/integration/bank-balances', params),
  
  // 批量生成工资凭证
  generatePayrollVouchers: (params: {
    company_id: string;
    period: string;
    department_ids?: string[];
  }) => post('/api/v1/finance/integration/generate-payroll', params),
  
  // 批量生成报销凭证
  generateExpenseVouchers: (params: {
    expense_ids: string[];
  }) => post('/api/v1/finance/integration/generate-expenses', params),
};
```

#### 4.2.3 财务报表API

```typescript
// src/api/finance/reports.ts

/**
 * 财务报表API
 */
export const reportApi = {
  // 资产负债表
  getBalanceSheet: (params: {
    company_id: string;
    period: string;            // 报表期间 YYYY-MM 或 YYYY-Q1 等
    compare_period?: string;    // 对比期间
  }) => get('/api/v1/reports/balance-sheet', params),
  
  // 利润表
  getIncomeStatement: (params: {
    company_id: string;
    period: string;
    compare_period?: string;
    view_by?: 'company' | 'department' | 'project';  // 维度
  }) => get('/api/v1/reports/income-statement', params),
  
  // 现金流量表
  getCashFlowStatement: (params: {
    company_id: string;
    period: string;
    compare_period?: string;
  }) => get('/api/v1/reports/cash-flow', params),
  
  // 科目余额表
  getSubjectBalance: (params: {
    company_id: string;
    period: string;
    subject_id?: string;       // 可指定科目
    level?: number;            // 显示层级
    show_zero_balance?: boolean;
  }) => get('/api/v1/reports/subject-balance', params),
  
  // 明细账
  getAccountLedger: (params: {
    company_id: string;
    subject_id: string;
    start_date: string;
    end_date: string;
    department_id?: string;
    project_id?: string;
    customer_id?: string;
    supplier_id?: string;
  }) => get('/api/v1/reports/account-ledger', params),
  
  // 辅助核算明细表
  getDimensionDetail: (params: {
    company_id: string;
    dimension: AccountingDimension;
    dimension_value_id: string;
    start_date: string;
    end_date: string;
  }) => get('/api/v1/reports/dimension-detail', params),
  
  // 应收款账龄分析
  getReceivableAging: (params: {
    company_id: string;
    as_of_date: string;
    customer_ids?: string[];
  }) => get('/api/v1/reports/receivable-aging', params),
  
  // 应付款账龄分析
  getPayableAging: (params: {
    company_id: string;
    as_of_date: string;
    supplier_ids?: string[];
  }) => get('/api/v1/reports/payable-aging', params),
  
  // 部门费用报表
  getDepartmentExpenseReport: (params: {
    company_id: string;
    start_date: string;
    end_date: string;
    department_ids?: string[];
    group_by?: 'department' | 'expense_type' | 'employee';
  }) => get('/api/v1/reports/department-expense', params),
  
  // 项目利润表
  getProjectProfitReport: (params: {
    project_ids: string[];
    start_date?: string;
    end_date?: string;
  }) => get('/api/v1/reports/project-profit', params),
  
  // 导出报表
  exportReport: (params: {
    report_type: string;
    format: 'excel' | 'pdf';
    [key: string]: any;
  }) => getBlob('/api/v1/reports/export', params),
};
```

#### 4.2.4 合并报表API

```typescript
// src/api/finance/consolidation.ts

/**
 * 合并报表API
 */
export const consolidationApi = {
  // 合并范围管理
  getConsolidationScope: (params: {
    group_id: string;
  }) => get('/api/v1/consolidation/scope', params),
  
  addToScope: (data: {
    group_id: string;
    company_id: string;
    ownership_percentage: number;
    consolidation_method: 'full' | 'proportionate' | 'equity';
  }) => post('/api/v1/consolidation/scope', data),
  
  removeFromScope: (scope_id: string) => delete(`/api/v1/consolidation/scope/${scope_id}`),
  
  // 内部交易
  getInternalTransactions: (params: {
    group_id: string;
    period: string;
    status?: string;
  }) => get('/api/v1/consolidation/internal-transactions', params),
  
  // 抵消分录
  generateEliminationEntries: (params: {
    group_id: string;
    period: string;
  }) => post('/api/v1/consolidation/generate-eliminations', params),
  
  getEliminationEntries: (params: {
    group_id: string;
    period: string;
  }) => get('/api/v1/consolidation/eliminations', params),
  
  // 合并财务报表
  getConsolidatedBalanceSheet: (params: {
    group_id: string;
    period: string;
    currency?: string;
  }) => get('/api/v1/consolidation/balance-sheet', params),
  
  getConsolidatedIncomeStatement: (params: {
    group_id: string;
    period: string;
  }) => get('/api/v1/consolidation/income-statement', params),
  
  getConsolidatedCashFlow: (params: {
    group_id: string;
    period: string;
  }) => get('/api/v1/consolidation/cash-flow', params),
  
  // 合并工作底稿
  getConsolidationWorksheet: (params: {
    group_id: string;
    period: string;
    report_type: 'balance_sheet' | 'income_statement';
  }) => get('/api/v1/consolidation/worksheet', params),
  
  // 汇率管理
  getExchangeRates: (params: {
    from_currency: string;
    to_currency: string;
    date: string;
  }) => get('/api/v1/consolidation/exchange-rates', params),
};
```

---

## 五、三大财务报表整合设计

### 5.1 资产负债表整合

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           资产负债表数据来源                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │    资产类科目     │◄──────────────────────────────────┐                 │
│  │  (1001-1999)     │                                   │                 │
│  └────────┬────────┘                                    │                 │
│           │                                              │                 │
│           ├──► 银行存款 ◄──┐                            │                 │
│           │                 │                             │                 │
│           ├──► 应收账款 ◄──┼── CRM: 客户应收款          │                 │
│           │                 │                             │                 │
│           ├──► 预付账款 ◄──┤                             │                 │
│           │                 │                             │                 │
│           ├──► 固定资产 ◄──┼── ERP: 固定资产原值-累计折旧 │                 │
│           │                 │                             │                 │
│           └──► 在建工程 ◄──┴── PM: 项目成本              │                 │
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │    负债类科目     │◄──────────────────────────────────┐                 │
│  │  (2001-2999)     │                                   │                 │
│  └────────┬────────┘                                    │                 │
│           │                                              │                 │
│           ├──► 应付账款 ◄──┐                            │                 │
│           │                 │                             │                 │
│           ├──► 应付票据 ◄──┼── CRM: 供应商应付款        │                 │
│           │                 │                             │                 │
│           ├──► 预收账款 ◄──┤                             │                 │
│           │                 │                             │                 │
│           ├──► 应付工资 ◄──┴── HRM: 工资发放              │                 │
│           │                                                    │                 │
│           └──► 应交税费 ◄───── HRM/ERP: 税务计算           │                 │
│                                                                              │
│  ┌─────────────────┐                                                        │
│  │    权益类科目     │◄──────────────────────────────────┐                 │
│  │  (3001-3999)     │                                   │                 │
│  └────────┬────────┘                                    │                 │
│           │                                              │                 │
│           ├──► 实收资本 ◄─── 公司成立资金                 │                 │
│           │                                                    │                 │
│           ├──► 资本公积 ◄─── 资本溢价等                    │                 │
│           │                                                    │                 │
│           ├──► 盈余公积 ◄─── 利润分配                      │                 │
│           │                                                    │                 │
│           └──► 未分配利润 ◄── PM: 项目利润 - 费用支出      │                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 利润表整合

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           利润表数据来源                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           收入确认                                   │   │
│  │                                                                      │   │
│  │  PM: 项目/合同 ◄──► 收入确认规则 ◄──► 主营业务收入                   │   │
│  │       │                      │                                     │   │
│  │       ├──► 里程碑确认 ◄──────┤                                     │   │
│  │       │                      │                                     │   │
│  │       └──► 完工百分比法 ◄────┴──── CRM: 商机转化率                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           成本结转                                   │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐      ┌─────────────────┐                       │   │
│  │  │   项目成本       │      │   工资成本       │                       │   │
│  │  │  (PM模块)       │      │  (HRM模块)      │                       │   │
│  │  ├─────────────────┤      ├─────────────────┤                       │   │
│  │  │ • 人工成本      │      │ • 工资薪金      │                       │   │
│  │  │ • 材料成本      │      │ • 社保公积金    │                       │   │
│  │  │ • 分包成本      │      │ • 福利费        │                       │   │
│  │  │ • 费用支出      │      │ • 培训费        │                       │   │
│  │  └────────┬────────┘      └────────┬────────┘                       │   │
│  │           │                        │                                 │   │
│  │           └──────────┬─────────────┘                                 │   │
│  │                      ▼                                                 │   │
│  │              主营业务成本                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           费用归集                                   │   │
│  │                                                                      │   │
│  │  HRM: 部门员工 ◄──────────────────┐                                   │   │
│  │       │                          │                                   │   │
│  │       ├──► 管理部门 ─────────────┼──► 管理费用 (按部门核算)          │   │
│  │       │                          │                                   │   │
│  │       ├──► 销售部门 ─────────────┼──► 销售费用 (按部门核算)          │   │
│  │       │                          │                                   │   │
│  │       └──► 研发部门 ─────────────┴──► 研发费用 (按项目核算)          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 现金流量表整合

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           现金流量表数据来源                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    经营活动现金流                                    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                      收款类                                 │   │   │
│  │  │                                                              │   │   │
│  │  │  销货收票/收款 ◄── ERP: 应收账款减少 ◄── CRM: 客户收款      │   │   │
│  │  │         │                        │                           │   │   │
│  │  │         └────────────────────────┘                           │   │   │
│  │  │                          │                                    │   │   │
│  │  │                          ▼                                    │   │   │
│  │  │                   销售商品、提供劳务收到的现金                  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                      付款类                                 │   │   │
│  │  │                                                              │   │   │
│  │  │  购货付款 ◄── ERP: 应付账款减少 ◄── CRM: 供应商付款         │   │   │
│  │  │         │                        │                           │   │   │
│  │  │  工资发放 ◄── HRM: 工资核算 ◄─── 员工管理                   │   │   │
│  │  │         │                        │                           │   │   │
│  │  │  费用报销 ◄── ERP: 费用报销 ◄─── 员工报销申请               │   │   │
│  │  │                                                              │   │   │
│  │  │  税费支出 ◄── ERP: 税务计提 ◄─── 税务计算                   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    投资活动现金流                                    │   │
│  │                                                                      │   │
│  │  • 购建固定资产、无形资产 ◄── ERP: 资产购置                         │   │
│  │  • 处置固定资产、无形资产 ◄── ERP: 资产处置                         │   │
│  │  • 收回投资 ◄─────────── 投资管理                                   │   │
│  │  • 取得投资收益 ◄───────── 投资收益                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    筹资活动现金流                                    │   │
│  │                                                                      │   │
│  │  • 吸收投资 ◄───────────── 股权融资                                 │   │
│  │  • 取得借款 ◄───────────── 银行借款 (ERP: 银行模块)                 │   │
│  │  • 偿还债务 ◄───────────── 银行还款                                 │   │
│  │  • 分配股利 ◄───────────── 利润分配                                 │   │
│  │  • 利息支出 ◄───────────── 财务费用                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 六、多公司合并报表设计

### 6.1 合并架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           多公司合并报表架构                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          集团母公司 (A公司)                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  A公司单体报表                                               │   │   │
│  │  │  • 资产: 5000万                                             │   │   │
│  │  │  • 负债: 2000万                                             │   │   │
│  │  │  • 收入: 3000万                                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│           ┌────────────────────────┼────────────────────────┐               │
│           │                        │                        │               │
│           ▼                        ▼                        ▼               │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐     │
│  │   B公司 (60%)      │  │   C公司 (100%)     │  │   D公司 (30%)     │     │
│  │                    │  │                    │  │                    │     │
│  │ • 资产: 2000万    │  │ • 资产: 1000万    │  │ • 资产: 800万    │     │
│  │ • 收入: 1500万    │  │ • 收入: 800万     │  │ • 收入: 600万     │     │
│  │                    │  │                    │  │                    │     │
│  │ 合并方法: 100%    │  │ 合并方法: 100%    │  │ 合并方法: 权益法  │     │
│  │ (母公司报表合并)  │  │ (母公司报表合并)  │  │ (仅确认投资收益)  │     │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          合并抵消分录                                │   │
│  │                                                                      │   │
│  │  1. 投资成本与子公司净资产抵消                                       │   │
│  │     借: 长期股权投资 (A对B投资)                                      │   │
│  │     借: 少数股东权益                                                 │   │
│  │     贷: 子公司净资产                                                 │   │
│  │                                                                      │   │
│  │  2. 内部交易抵消                                                    │   │
│  │     内部销售: A公司 → B公司 200万                                   │   │
│  │     未实现利润: 200 × 20% = 40万                                   │   │
│  │                                                                      │   │
│  │  3. 债权债务抵消                                                    │   │
│  │     A公司应收B公司账款 ↔ B公司应付A公司账款                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          合并财务报表                                │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  A集团合并报表                                                │   │   │
│  │  │  ─────────────────────────────────────────────────────────  │   │   │
│  │  │  资产总计: 5000 + 2000 + 1000 - 400 = 7600万                │   │   │
│  │  │  负债总计: 2000 + 800 + 400 - 200 = 3000万                  │   │   │
│  │  │  所有者权益: 4600万 (含少数股东权益)                        │   │   │
│  │  │  ─────────────────────────────────────────────────────────  │   │   │
│  │  │  收入总计: 3000 + 1500 + 800 - 200 = 5100万                │   │   │
│  │  │  净利润: 按持股比例计算                                      │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 合并抵消规则引擎

```typescript
// src/services/finance/consolidation-engine.ts

/**
 * 合并抵消规则
 */
export interface ConsolidationRule {
  id: string;
  type: EliminationType;
  description: string;
  
  // 触发条件
  conditions: RuleCondition[];
  
  // 抵消借贷方向
  debit_account: string;    // 借方科目
  credit_account: string;   // 贷方科目
  
  // 计算方式
  calculation_method: CalculationMethod;
  
  // 适用公司
  apply_to: string[];       // 公司ID列表
  
  // 状态
  enabled: boolean;
}

export type EliminationType = 
  | 'investment_elimination'      // 股权投资抵消
  | 'internal_sales'              // 内部销售抵消
  | 'internal_profit'             // 未实现利润抵消
  | 'receivable_payable'          // 债权债务抵消
  | 'dividend_elimination';       // 股利分配抵消

export type CalculationMethod = 
  | 'full'           // 全额抵消 (母公司报表)
  | 'percentage'    // 按持股比例抵消
  | 'minority'      // 抵消少数股权部分
  | 'equity';       // 权益法调整

export interface RuleCondition {
  field: string;           // 字段名 (如: counterparty_id, transaction_type)
  operator: 'eq' | 'ne' | 'in' | 'gt' | 'lt';
  value: any;
}

/**
 * 抵消分录生成
 */
export interface EliminationEntry {
  id: string;
  consolidation_id: string;
  period: string;
  
  // 分录信息
  description: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  
  // 来源信息
  source_transaction_id: string;
  source_transaction_type: string;
  
  // 抵消信息
  elimination_type: EliminationType;
  company_id: string;
  counterparty_id: string;
  
  // 金额来源
  gross_amount: number;
  elimination_amount: number;
  minority_amount?: number;
  
  // 状态
  status: 'pending' | 'approved' | 'posted';
  created_at: string;
}

/**
 * 合并报表数据
 */
export interface ConsolidatedReport {
  group_id: string;
  period: string;
  
  // 报表数据
  balance_sheet: BalanceSheetData;
  income_statement: IncomeStatementData;
  cash_flow: CashFlowData;
  
  // 合并信息
  consolidation_method: string;
  exchange_rate?: number;        // 汇率 (外币报表折算用)
  
  // 工作底稿
  worksheet: WorksheetData;
  
  // 审计信息
  auditor?: string;
  audit_date?: string;
  status: 'draft' | 'reviewing' | 'approved' | 'published';
}
```

---

## 七、整合Hooks设计

### 7.1 财务数据获取Hooks

```typescript
// src/hooks/useFinance.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voucherApi, integrationApi, reportApi } from '@/api/finance';

/**
 * 凭证列表查询
 */
export function useVouchers(params: VoucherQueryParams) {
  return useQuery({
    queryKey: ['vouchers', params],
    queryFn: () => voucherApi.list(params),
  });
}

/**
 * 凭证详情
 */
export function useVoucher(id: string) {
  return useQuery({
    queryKey: ['voucher', id],
    queryFn: () => voucherApi.get(id),
    enabled: !!id,
  });
}

/**
 * 创建凭证
 */
export function useCreateVoucher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: voucherApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

/**
 * 跨模块数据获取
 */
export function useDepartmentExpenses(params: {
  company_id: string;
  start_date: string;
  end_date: string;
}) {
  return useQuery({
    queryKey: ['department-expenses', params],
    queryFn: () => integrationApi.getDepartmentExpenseSummary(params),
    enabled: !!params.company_id && !!params.start_date && !!params.end_date,
  });
}

export function useProjectCosts(params: {
  project_ids: string[];
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ['project-costs', params],
    queryFn: () => integrationApi.getProjectCostDetails(params),
    enabled: params.project_ids.length > 0,
  });
}

/**
 * 财务报表查询
 */
export function useBalanceSheet(params: {
  company_id: string;
  period: string;
}) {
  return useQuery({
    queryKey: ['balance-sheet', params],
    queryFn: () => reportApi.getBalanceSheet(params),
    enabled: !!params.company_id && !!params.period,
  });
}

export function useIncomeStatement(params: {
  company_id: string;
  period: string;
  view_by?: 'company' | 'department' | 'project';
}) {
  return useQuery({
    queryKey: ['income-statement', params],
    queryFn: () => reportApi.getIncomeStatement(params),
    enabled: !!params.company_id && !!params.period,
  });
}

export function useCashFlow(params: {
  company_id: string;
  period: string;
}) {
  return useQuery({
    queryKey: ['cash-flow', params],
    queryFn: () => reportApi.getCashFlowStatement(params),
    enabled: !!params.company_id && !!params.period,
  });
}

/**
 * 工资凭证生成
 */
export function useGeneratePayrollVouchers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: integrationApi.generatePayrollVouchers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

/**
 * 报销凭证生成
 */
export function useGenerateExpenseVouchers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: integrationApi.generateExpenseVouchers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
```

### 7.2 合并报表Hooks

```typescript
// src/hooks/useConsolidation.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consolidationApi } from '@/api/finance';

/**
 * 合并范围查询
 */
export function useConsolidationScope(group_id: string) {
  return useQuery({
    queryKey: ['consolidation-scope', group_id],
    queryFn: () => consolidationApi.getConsolidationScope({ group_id }),
    enabled: !!group_id,
  });
}

/**
 * 内部交易查询
 */
export function useInternalTransactions(params: {
  group_id: string;
  period: string;
}) {
  return useQuery({
    queryKey: ['internal-transactions', params],
    queryFn: () => consolidationApi.getInternalTransactions(params),
    enabled: !!params.group_id && !!params.period,
  });
}

/**
 * 抵消分录生成
 */
export function useGenerateEliminations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: consolidationApi.generateEliminationEntries,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['eliminations', variables.group_id] 
      });
    },
  });
}

/**
 * 合并资产负债表
 */
export function useConsolidatedBalanceSheet(params: {
  group_id: string;
  period: string;
}) {
  return useQuery({
    queryKey: ['consolidated-balance-sheet', params],
    queryFn: () => consolidationApi.getConsolidatedBalanceSheet(params),
    enabled: !!params.group_id && !!params.period,
  });
}

/**
 * 合并利润表
 */
export function useConsolidatedIncomeStatement(params: {
  group_id: string;
  period: string;
}) {
  return useQuery({
    queryKey: ['consolidated-income-statement', params],
    queryFn: () => consolidationApi.getConsolidatedIncomeStatement(params),
    enabled: !!params.group_id && !!params.period,
  });
}

/**
 * 合并现金流量表
 */
export function useConsolidatedCashFlow(params: {
  group_id: string;
  period: string;
}) {
  return useQuery({
    queryKey: ['consolidated-cash-flow', params],
    queryFn: () => consolidationApi.getConsolidatedCashFlow(params),
    enabled: !!params.group_id && !!params.period,
  });
}
```

---

## 八、整合页面设计

### 8.1 财务中心首页

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              财务中心                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  公司选择: [▼ A公司    ]  期间: [▼ 2024-01   ]  [刷新] [导出]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          关键财务指标卡片                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ 资产总计  │  │ 负债总计  │  │ 净利润    │  │ 现金余额  │          │   │
│  │  │  5,000万 │  │  2,000万  │  │   800万   │  │  1,200万  │          │   │
│  │  │  ↑12%    │  │   ↓5%     │  │   ↑15%    │  │   ↑8%     │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        财务趋势图表                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                        📈 收入/利润趋势                      │   │   │
│  │  │           3000│        ■■■■■■■■■■■■                         │   │   │
│  │  │           2500│      ■■■■■■■■■■■■■■■■                       │   │   │
│  │  │           2000│    ■■■■■■■■■■■■■■■■■■■■                     │   │   │
│  │  │           1500│  ■■■■■■■■■■■■■■■■■■■■■■■■■                 │   │   │
│  │  │               └─────────────────────────────────             │   │   │
│  │  │                  1月   2月   3月   4月   5月   6月            │   │   │
│  │  │                  ── 收入   ── 成本   ── 利润                  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │      待处理事项              │  │        快捷操作                       │ │
│  │  • 待审批凭证 (3)           │  │  [+ 新增凭证]  [+ 报销申请]          │ │
│  │  • 待收款提醒 (5)           │  │  [工资核算]  [期末结账]              │ │
│  │  • 预算预警 (2)             │  │  [查看报表]  [合并报表]              │ │
│  └────────────────────────────┘  └────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 凭证管理页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            凭证管理                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [▼ 高级筛选]  [导出]                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  期间: [2024-01    ]  状态: [▼ 全部]  部门: [▼ 全部]  项目: [▼ 全部] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  已选择 5 项                    [批量审核]  [批量删除]  [批量生成凭证]         │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ □ │ 凭证号 │ 日期 │ 摘要 │ 借方合计 │ 贷方合计 │ 状态 │ 制单人 │ 操作 │   │
│  ├───┼────────┼──────┼──────┼─────────┼─────────┼──────┼────────┼──────┤   │
│  │ □ │ PZ001  │ 01-05 │ 工资 │ 500,000 │ 500,000 │ 已过 │ 张三   │ 👁 ✏ │   │
│  │ □ │ PZ002  │ 01-08 │ 采购 │ 117,000 │ 117,000 │ 待审 │ 李四   │ 👁 ✏ │   │
│  │ ☑ │ PZ003  │ 01-10 │ 报销 │ 3,500   │ 3,500   │ 待审 │ 王五   │ 👁 ✏ │   │
│  │ ☑ │ PZ004  │ 01-12 │ 收款 │ 50,000  │ 50,000  │ 待审 │ 赵六   │ 👁 ✏ │   │
│  │ ☑ │ PZ005  │ 01-15 │ 折旧 │ 8,500   │ 8,500   │ 待审 │ 张三   │ 👁 ✏ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  共 125 条记录  < 1 2 3 ... 13 >  每页 10条                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 合并报表页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          多公司合并报表                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  集团选择: [▼ A集团          ]  合并期间: [▼ 2024-Q1 ]  [刷新]               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           合并范围                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ 公司名称 │ 持股比例 │ 合并方法 │ 资产 │ 收入 │ 净利润 │ 操作  │   │   │
│  │  ├─────────┼──────────┼─────────┼──────┼──────┼────────┼──────┤   │   │
│  │  │ A公司   │   100%   │ 母公司   │ 5000 │ 3000 │  800  │ [详情] │   │   │
│  │  │ B公司   │   60%    │ 完全合并 │ 2000 │ 1500 │  300  │ [详情] │   │   │
│  │  │ C公司   │   100%   │ 完全合并 │ 1000 │  800 │  150  │ [详情] │   │   │
│  │  │ D公司   │   30%    │ 权益法   │  800 │  600 │  100  │ [详情] │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  报表选择: [资产负债表] [利润表] [现金流量表] [工作底稿]              │   │
│  │  ───────────────────────────────────────────────────────────────   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ 合并资产负债表                    2024年3月31日               │   │   │
│  │  │ ─────────────────────────────────────────────────────────── │   │   │
│  │  │                              期末余额      期初余额    增减   │   │   │
│  │  │ 流动资产:                                                  │   │   │
│  │  │ 货币资金                    2,500,000  2,200,000    +300,000│   │   │
│  │  │ 应收账款                    1,800,000  1,600,000    +200,000│   │   │
│  │  │ 存货                        1,200,000  1,300,000    -100,000│   │   │
│  │  │ ─────────────────────────────────────────────────────────│   │   │
│  │  │ 流动资产合计                5,500,000  5,100,000    +400,000│   │   │
│  │  │ ...                                                        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  [导出Excel]  [导出PDF]  [打印]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  抵消分录 (本月新增: 5条)                    [重新生成]  [审核确认]  │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  1. 内部交易抵消 - A公司销售给B公司商品 ¥200,000                    │   │
│  │  2. 债权债务抵消 - A公司应收B公司账款 ¥50,000                     │   │
│  │  3. 投资成本抵消 - A对B投资 ¥1,200,000                             │   │
│  │  ...                                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 九、实施计划与里程碑

### 9.1 阶段一: 基础整合 (4周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第1周 | 扩展科目体系，增加辅助核算维度 | 科目数据模型、API |
| 第2周 | 凭证模块增强，支持多维度核算 | 凭证API、页面 |
| 第3周 | 跨模块数据获取API开发 | integrationApi |
| 第4周 | 基础财务报表API开发 | 资产负债表、利润表API |

### 9.2 阶段二: 业务整合 (4周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第5周 | HRM工资模块对接财务 | 工资凭证自动生成 |
| 第6周 | 报销模块对接财务 | 报销凭证自动生成 |
| 第7周 | CRM客户供应商对接 | 应收应付自动记账 |
| 第8周 | PM项目成本对接 | 项目利润表 |

### 9.3 阶段三: 报表完善 (4周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第9周 | 现金流量表开发 | 现金流量表API |
| 第10周 | 辅助核算报表 | 部门/项目/客户明细表 |
| 第11周 | 报表导出功能 | Excel/PDF导出 |
| 第12周 | 报表权限与订阅 | 权限控制、报表订阅 |

### 9.4 阶段四: 合并报表 (3周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 第13周 | 合并范围管理 | 合并范围API |
| 第14周 | 抵消规则引擎 | 抵消分录生成 |
| 第15周 | 合并报表生成 | 合并三大报表 |

---

## 十、数据接口契约

### 10.1 统一响应格式

```typescript
// src/api/response.ts

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    detail?: string;
  };
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  meta?: {
    [key: string]: any;
  };
}
```

### 10.2 错误码定义

```typescript
// src/constants/errors.ts

export enum ErrorCode {
  // 通用错误 (1000-1999)
  VALIDATION_ERROR = '1001',
  UNAUTHORIZED = '1002',
  FORBIDDEN = '1003',
  NOT_FOUND = '1004',
  
  // 财务模块错误 (2000-2999)
  VOUCHER_IMBALANCED = '2001',      // 凭证借贷不平衡
  VOUCHER_ALREADY_POSTED = '2002',  // 凭证已过账
  PERIOD_LOCKED = '2003',           // 期间已结账
  INSUFFICIENT_BUDGET = '2004',     // 预算不足
  DUPLICATE_VOUCHER = '2005',       // 凭证号重复
  
  // 合并报表错误 (3000-3999)
  CONSOLIDATION_CIRCULAR = '3001',  // 循环持股
  ELIMINATION_FAILED = '3002',      // 抵消失败
  EXCHANGE_RATE_MISSING = '3003',   // 缺少汇率
}
```

---

## 十一、总结

本设计方案整合了HRM、CRM、PM等模块与ERP财务模块，通过以下核心机制实现数据贯通:

1. **统一科目体系**: 扩展会计科目支持多维度辅助核算
2. **跨模块API**: 提供integrationApi获取各模块财务相关数据
3. **自动凭证生成**: 工资、报销、收付款等业务自动生成会计凭证
4. **多维度报表**: 财务报表支持按部门、项目、客户等多维度分析
5. **合并报表引擎**: 支持多公司合并，自动处理内部交易抵消

通过以上设计，实现了企业财务业务的一体化管理,提高了财务数据的准确性和及时性。
