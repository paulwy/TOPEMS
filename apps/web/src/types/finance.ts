/**
 * 财务核心类型定义
 * 包含科目、凭证、财务报表、往来单位等核心实体类型
 */

// ============================================
// 一、会计科目体系
// ============================================

/**
 * 科目类别
 */
export type AccountCategory =
  | 'asset' // 资产类
  | 'liability' // 负债类
  | 'equity' // 权益类
  | 'cost' // 成本类
  | 'expense' // 费用类
  | 'income'; // 收入类

/**
 * 余额方向
 */
export type BalanceDirection = 'debit' | 'credit';

/**
 * 辅助核算维度
 */
export type AccountingDimension =
  | 'company' // 公司
  | 'department' // 部门
  | 'project' // 项目
  | 'customer' // 客户
  | 'supplier' // 供应商
  | 'employee' // 员工
  | 'product' // 产品
  | 'bank'; // 银行账户

/**
 * 会计科目
 */
export interface Account {
  id: string;
  code: string; // 科目编码
  name: string; // 科目名称
  name_en?: string; // 英文名称
  full_name?: string; // 全称

  // 科目属性
  category: AccountCategory; // 科目类别
  balance_direction: BalanceDirection; // 余额方向
  type?: string; // 科目类型（用于表单）

  // 层级关系
  parent_id?: string; // 上级科目ID
  parent_code?: string; // 上级科目编码
  level: number; // 层级深度
  haschildren: boolean; // 是否有下级
  children?: Account[]; // 子科目列表（用于树形结构）

  // 辅助核算
  dimensions: AccountingDimension[]; // 启用的辅助核算维度
  is_cash_flow: boolean; // 是否参与现金流量表

  // 数量核算
  enable_quantity: boolean; // 启用数量核算
  unit?: string; // 默认计量单位

  // 外币核算
  enable_foreign_currency: boolean; // 启用外币核算
  default_currency?: string; // 默认币种

  // 状态
  status: 'active' | 'disabled';
  isactive?: boolean; // 是否启用（表单字段）
  is_detail?: boolean; // 是否明细科目

  // 描述
  description?: string; // 科目描述

  // 审计字段
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * 科目期初余额
 */
export interface AccountOpeningBalance {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;

  // 辅助核算维度
  company_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  employee_id?: string;

  // 余额
  debit_balance: number; // 借方余额
  credit_balance: number; // 贷方余额
  quantity?: number; // 数量余额

  // 期间
  period: string; // 会计期间 YYYY-MM
  year: number; // 会计年度
  month: number; // 会计月份

  // 审计
  created_at: string;
  updated_at: string;
}

/**
 * 科目余额（实时）
 */
export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  category: AccountCategory;
  balance_direction: BalanceDirection;

  // 辅助核算
  company_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;

  // 余额
  debit_balance: number;
  credit_balance: number;
  quantity?: number;

  // 期间
  period: string;

  // 累计发生额
  period_debit: number; // 本期借方发生额
  period_credit: number; // 本期贷方发生额
  year_debit: number; // 本年借方累计
  year_credit: number; // 本年贷方累计
}

// ============================================
// 二、凭证管理
// ============================================

/**
 * 凭证状态
 */
export type VoucherStatus =
  | 'draft' // 草稿
  | 'submitted' // 已提交
  | 'approved' // 已审核
  | 'posted' // 已过账
  | 'reversed'; // 已冲销

/**
 * 凭证类型
 */
export type VoucherType =
  | 'general' // 记账凭证
  | 'payment' // 付款凭证
  | 'receipt' // 收款凭证
  | 'transfer'; // 转账凭证

/**
 * 凭证分录
 */
export interface VoucherEntry {
  id: string;
  line_no: number; // 行号

  // 科目信息
  account_id: string;
  account_code: string;
  account_name: string;

  // 金额
  debit_amount: number; // 借方金额
  credit_amount: number; // 贷方金额
  quantity?: number; // 数量
  unit_price?: number; // 单价

  // 外币
  currency_code?: string; // 币种
  exchange_rate?: number; // 汇率
  foreign_amount?: number; // 外币金额

  // 辅助核算维度
  company_id?: string;
  company_code?: string;
  company_name?: string;

  department_id?: string;
  department_code?: string;
  department_name?: string;

  project_id?: string;
  project_code?: string;
  project_name?: string;

  customer_id?: string;
  customer_code?: string;
  customer_name?: string;

  supplier_id?: string;
  supplier_code?: string;
  supplier_name?: string;

  employee_id?: string;
  employee_code?: string;
  employee_name?: string;

  bank_account_id?: string;
  bank_account_no?: string;
  bank_name?: string;

  // 摘要
  summary?: string;

  // 凭证ID（反向引用）
  voucher_id?: string;
}

/**
 * 凭证
 */
export interface Voucher {
  id: string;
  voucher_no: string; // 凭证编号
  voucher_type: VoucherType; // 凭证类型
  period: string; // 会计期间 YYYY-MM
  year: number;
  month: number;

  // 日期
  voucher_date: string; // 凭证日期
  created_at: string;

  // 金额
  total_amount: number; // 凭证金额（借方合计=贷方合计）
  total_debit: number; // 借方合计
  total_credit: number; // 贷方合计
  currency_code: string; // 币种

  // 分录
  entries: VoucherEntry[];

  // 状态
  status: VoucherStatus;

  // 审批信息
  submitter_id?: string;
  submitter_name?: string;
  submitted_at?: string;

  approver_id?: string;
  approver_name?: string;
  approved_at?: string;

  poster_id?: string;
  poster_name?: string;
  posted_at?: string;

  // 冲销信息
  is_reversed: boolean; // 是否被冲销
  reverse_voucher_id?: string; // 冲销凭证ID
  reversed_at?: string;

  // 附件
  attachment_count: number; // 附件数量

  // 摘要
  summary?: string; // 凭证摘要

  // 来源信息
  source_module?: string; // 来源模块
  source_id?: string; // 来源单据ID

  // 审计字段
  created_by?: string;
  updated_by?: string;
  updated_at?: string;
}

/**
 * 创建凭证请求
 */
export interface CreateVoucherRequest {
  voucher_type?: VoucherType;
  voucher_date: string;
  period: string;
  summary?: string;
  entries: CreateVoucherEntryRequest[];
  source_module?: string;
  source_id?: string;
}

/**
 * 创建凭证分录请求
 */
export interface CreateVoucherEntryRequest {
  account_id: string;
  debit_amount?: number;
  credit_amount?: number;
  quantity?: number;
  unit_price?: number;
  currency_code?: string;
  exchange_rate?: number;
  foreign_amount?: number;

  company_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  employee_id?: string;
  bank_account_id?: string;

  summary?: string;
}

// ============================================
// 三、往来单位管理
// ============================================

/**
 * 往来单位类型
 */
export type CounterpartyType = 'customer' | 'supplier' | 'both';

/**
 * 银行账户信息
 */
export interface BankAccount {
  bank_name: string; // 开户行
  account_number: string; // 账号
  account_name: string; // 户名
  bank_code?: string; // 行号
  is_default: boolean; // 是否默认
}

/**
 * 客户/供应商财务信息
 */
export interface CounterpartyFinanceInfo {
  id: string;
  counterparty_id: string;

  // 银行信息
  bank_accounts: BankAccount[];

  // 税务信息
  tax_number?: string; // 纳税识别号
  invoice_title?: string; // 发票抬头
  invoice_type: 'normal' | 'special'; // 发票类型

  // 信用管理
  credit_limit: number; // 信用额度
  credit_term_days: number; // 信用期限（天）
  payment_terms?: string; // 付款条款

  // 应收应付余额
  accounts_receivable: number; // 应收账款余额
  accounts_payable: number; // 应付账款余额
  overdue_receivable: number; // 逾期应收
  overdue_payable: number; // 逾期应付

  // 交易统计
  total_sales?: number; // 累计销售额（客户）
  total_purchases?: number; // 累计采购额（供应商）
  total_received?: number; // 累计收款（客户）
  total_paid?: number; // 累计付款（供应商）

  // 状态
  status: 'normal' | 'blocked' | 'inactive';
  block_reason?: string;

  // 审计
  created_at: string;
  updated_at: string;
}

/**
 * 客户信息
 */
export interface Customer {
  id: string;
  code: string; // 客户编码
  name: string; // 客户名称
  short_name?: string;

  // 联系信息
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;

  // 地址
  address?: string;
  province?: string;
  city?: string;
  district?: string;

  // 行业
  industry?: string;
  business_scope?: string;

  // 财务信息（扩展）
  finance_info?: CounterpartyFinanceInfo;

  // 状态
  status: 'active' | 'inactive' | 'blocked';

  created_at: string;
  updated_at: string;
}

/**
 * 供应商信息
 */
export interface Supplier {
  id: string;
  code: string; // 供应商编码
  name: string; // 供应商名称
  short_name?: string;

  // 联系信息
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;

  // 地址
  address?: string;
  province?: string;
  city?: string;

  // 行业
  industry?: string;

  // 财务信息（扩展）
  finance_info?: CounterpartyFinanceInfo;

  // 状态
  status: 'active' | 'inactive' | 'blocked';

  created_at: string;
  updated_at: string;
}

// ============================================
// 四、应收应付管理
// ============================================

/**
 * 发票状态
 */
export type InvoiceStatus =
  | 'draft' // 草稿
  | 'approved' // 已审核
  | 'invoiced' // 已开票
  | 'partial_received' // 部分收款
  | 'received' // 已收款
  | 'overdue'; // 已逾期

/**
 * 销售发票（应收）
 */
export interface SalesInvoice {
  id: string;
  invoice_no: string; // 发票编号
  customer_id: string;
  customer_code: string;
  customer_name: string;

  // 关联信息
  opportunity_id?: string;
  project_id?: string;
  contract_id?: string;
  voucher_id?: string; // 关联凭证

  // 金额
  amount: number; // 不含税金额
  tax_amount: number; // 税额
  total_amount: number; // 含税金额
  received_amount: number; // 已收款
  pending_amount: number; // 待收款

  // 发票信息
  invoice_date: string; // 开票日期
  due_date: string; // 到期日期
  invoice_type: 'normal' | 'special';

  // 状态
  status: InvoiceStatus;
  overdue_days?: number; // 逾期天数

  // 审计
  created_at: string;
  created_by?: string;
}

/**
 * 采购发票（应付）
 */
export interface PurchaseInvoice {
  id: string;
  invoice_no: string; // 发票编号
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;

  // 关联信息
  order_id?: string;
  receive_id?: string;
  project_id?: string;
  voucher_id?: string; // 关联凭证

  // 金额
  amount: number; // 不含税金额
  tax_amount: number; // 税额
  total_amount: number; // 含税金额
  paid_amount: number; // 已付款
  pending_amount: number; // 待付款

  // 发票信息
  invoice_date: string; // 收票日期
  due_date: string; // 到期日期
  invoice_type: 'normal' | 'special';

  // 状态
  status: InvoiceStatus;
  overdue_days?: number; // 逾期天数

  // 审计
  created_at: string;
  created_by?: string;
}

/**
 * 收款记录
 */
export interface CollectionRecord {
  id: string;
  collection_no: string; // 收款单号
  customer_id: string;
  customer_name: string;

  // 金额
  amount: number; // 收款金额
  collection_date: string; // 收款日期

  // 关联发票
  invoice_ids: string[]; // 关联发票ID列表
  invoice_amounts?: {
    // 各发票分摊金额
    invoice_id: string;
    amount: number;
  }[];

  // 银行信息
  bank_account_id: string;
  bank_account_no: string;
  bank_name: string;

  // 凭证信息
  voucher_id?: string;
  voucher_no?: string;

  // 状态
  status: 'recorded' | 'matched' | 'cancelled';

  created_at: string;
  created_by?: string;
}

/**
 * 付款记录
 */
export interface PaymentRecord {
  id: string;
  payment_no: string; // 付款单号
  supplier_id: string;
  supplier_name: string;

  // 金额
  amount: number; // 付款金额
  payment_date: string; // 付款日期

  // 关联发票
  invoice_ids: string[]; // 关联发票ID列表
  invoice_amounts?: {
    // 各发票分摊金额
    invoice_id: string;
    amount: number;
  }[];

  // 银行信息
  bank_account_id: string;
  bank_account_no: string;
  bank_name: string;

  // 凭证信息
  voucher_id?: string;
  voucher_no?: string;

  // 状态
  status: 'recorded' | 'matched' | 'cancelled';

  created_at: string;
  created_by?: string;
}

// ============================================
// 五、三大财务报表
// ============================================

/**
 * 资产负债表项目
 */
export interface BalanceSheetItem {
  account_code: string;
  account_name: string;
  amount: number;
  quantity?: number;

  // 辅助核算
  company_id?: string;
  department_id?: string;
  project_id?: string;
}

/**
 * 资产负债表段落
 */
export interface BalanceSheetSection {
  title: string;
  items: BalanceSheetItem[];
  total: number;
}

/**
 * 资产负债表
 */
export interface BalanceSheet {
  id: string;
  report_no?: string; // 报表编号

  // 基本信息
  company_id: string;
  company_name: string;
  period: string; // 报表期间 YYYY-MM
  year: number;
  month: number;

  // 币种
  currency_code: string;
  currency_name: string;

  // 资产
  assets: {
    current: BalanceSheetSection;
    non_current: BalanceSheetSection;
    total: number;
  };

  // 负债
  liabilities: {
    current: BalanceSheetSection;
    non_current: BalanceSheetSection;
    total: number;
  };

  // 所有者权益
  equity: {
    paid_in: BalanceSheetSection; // 实收资本
    reserves: BalanceSheetSection; // 资本公积+盈余公积
    retained_earnings: BalanceSheetSection; // 未分配利润
    total: number;
  };

  // 平衡检查
  total_liabilities_equity: number; // 负债+所有者权益
  balance_check: boolean; // 资产=负债+所有者权益

  // 审计信息
  prepared_by?: string;
  prepared_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_by?: string;
  approved_at?: string;
}

/**
 * 利润表项目
 */
export interface IncomeStatementItem {
  account_code: string;
  account_name: string;
  amount: number;
  percentage?: number; // 占收入比例
}

/**
 * 利润表段落
 */
export interface IncomeStatementSection {
  title: string;
  items: IncomeStatementItem[];
  total: number;
}

/**
 * 利润表
 */
export interface IncomeStatement {
  id: string;
  report_no?: string;

  // 基本信息
  company_id: string;
  company_name: string;
  period: string;
  year: number;
  month: number;

  // 币种
  currency_code: string;

  // 营业收入
  revenue: {
    main_revenue: IncomeStatementSection; // 主营业务收入
    other_revenue: IncomeStatementSection; // 其他业务收入
    total: number;
  };

  // 营业成本
  cost_of_sales: {
    main_cost: IncomeStatementSection; // 主营业务成本
    other_cost: IncomeStatementSection; // 其他业务成本
    total: number;
  };

  // 毛利润
  gross_profit: number;
  gross_margin: number; // 毛利率

  // 期间费用
  operating_expenses: {
    selling_expense: IncomeStatementSection; // 销售费用
    administrative_expense: IncomeStatementSection; // 管理费用
    rd_expense: IncomeStatementSection; // 研发费用
    financial_expense: IncomeStatementSection; // 财务费用
    total: number;
  };

  // 营业利润
  operating_profit: number;
  operating_margin: number; // 营业利润率

  // 营业外收支
  non_operating: {
    income: IncomeStatementSection; // 营业外收入
    expenses: IncomeStatementSection; // 营业外支出
    total: number;
  };

  // 利润总额
  total_profit: number;

  // 所得税
  income_tax: number;

  // 净利润
  net_profit: number;
  net_margin: number; // 净利率

  // 每股收益
  eps: number; // 每股收益

  // 审计信息
  prepared_by?: string;
  prepared_at?: string;
  reviewed_by?: string;
  approved_by?: string;
}

/**
 * 现金流量表项目
 */
export interface CashFlowItem {
  description: string;
  amount: number;
  detail?: CashFlowItem[]; // 明细项目
}

/**
 * 现金流量表段落
 */
export interface CashFlowSection {
  title: string;
  items: CashFlowItem[];
  total: number;
}

/**
 * 现金流量表
 */
export interface CashFlowStatement {
  id: string;
  report_no?: string;

  // 基本信息
  company_id: string;
  company_name: string;
  period: string;
  year: number;
  month: number;

  // 币种
  currency_code: string;

  // 经营活动
  operating: {
    inflows: CashFlowSection; // 流入
    outflows: CashFlowSection; // 流出
    net_flow: number;
  };

  // 投资活动
  investing: {
    inflows: CashFlowSection;
    outflows: CashFlowSection;
    net_flow: number;
  };

  // 筹资活动
  financing: {
    inflows: CashFlowSection;
    outflows: CashFlowSection;
    net_flow: number;
  };

  // 汇总
  net_cash_flow: number; // 净现金流量
  beginning_cash: number; // 期初现金
  ending_cash: number; // 期末现金
  cash_equivalent_change: number; // 现金及现金等价物净增加额

  // 审计信息
  prepared_by?: string;
  prepared_at?: string;
  reviewed_by?: string;
  approved_by?: string;
}

// ============================================
// 六、凭证模板
// ============================================

/**
 * 凭证模板类型
 */
export type VoucherTemplateType =
  | 'payroll' // 工资凭证
  | 'sales_invoice' // 销售发票
  | 'purchase_invoice' // 采购发票
  | 'collection' // 收款凭证
  | 'payment' // 付款凭证
  | 'depreciation' // 折旧凭证
  | 'expense' // 费用报销
  | 'cost_allocation'; // 成本归集

/**
 * 凭证模板分录规则
 */
export interface VoucherTemplateEntry {
  id: string;
  line_no: number;

  // 科目规则
  account_rule_type: 'fixed' | 'dynamic'; // 固定科目还是动态规则
  account_id?: string; // 固定科目ID
  account_code?: string;
  account_name?: string;

  // 动态规则
  account_expression?: string; // 表达式，如: ${source === 'HRM' ? '6602.01' : '6602.99'}

  // 金额规则
  amount_rule_type: 'fixed' | 'field' | 'expression';
  fixed_amount?: number;
  amount_field?: string; // 字段路径，如: payload.net_salary
  amount_expression?: string; // 表达式

  // 方向规则
  direction_rule_type: 'fixed' | 'expression';
  fixed_direction?: 'debit' | 'credit';
  direction_expression?: string;

  // 辅助核算规则
  dimension_rules?: {
    dimension: AccountingDimension;
    source_type: 'fixed' | 'field' | 'expression';
    fixed_value?: string;
    field?: string;
    expression?: string;
  }[];

  // 摘要规则
  summary_rule_type: 'fixed' | 'field' | 'expression';
  fixed_summary?: string;
  summary_field?: string;
  summary_expression?: string;

  // 启用条件
  condition?: string; // 启用条件表达式
}

/**
 * 凭证模板
 */
export interface VoucherTemplate {
  id: string;
  code: string; // 模板编码
  name: string; // 模板名称
  type: VoucherTemplateType; // 模板类型
  description?: string;

  // 适用条件
  applicable_modules?: string[]; // 适用模块
  applicable_companies?: string[]; // 适用公司
  condition?: string; // 启用条件

  // 分录
  entries: VoucherTemplateEntry[];

  // 状态
  status: 'active' | 'inactive';
  is_default: boolean; // 是否默认模板

  // 审计
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ============================================
// 七、辅助工具类型
// ============================================

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  pagesize?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
  total_pages: number;
}

/**
 * 查询参数基础接口
 */
export interface QueryParams extends PaginationParams {
  keyword?: string;
  status?: string | string[];
  start_date?: string;
  end_date?: string;
  company_id?: string;
  department_id?: string;
}

/**
 * 凭证查询参数
 */
export interface VoucherQueryParams extends QueryParams {
  voucher_type?: VoucherType | VoucherType[];
  period?: string | string[];
  account_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  amount_min?: number;
  amount_max?: number;
}

/**
 * 报表查询参数
 */
export interface ReportQueryParams {
  company_id: string;
  period: string;
  year?: number;
  month?: number;
  compare_period?: string; // 对比期间
  currency_code?: string;
  include_detail?: boolean; // 是否包含明细
}

// ============================================
// 八、API响应类型
// ============================================

/**
 * API统一响应
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: {
    id: string;
    error: string;
  }[];
}

/**
 * 凭证操作结果
 */
export interface VoucherOperationResult {
  success: boolean;
  voucher_id?: string;
  voucher_no?: string;
  message?: string;
}
