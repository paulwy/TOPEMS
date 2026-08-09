// ============================================================================
// OpenAPI 生成类型 ↔ 手写业务类型 适配层（V71.5 A3）
// ============================================================================
// 后端 utoipa 生成 snake_case 字段（is_enabled / created_at / parent_id），
// 前端手写业务类型用 camelCase（isEnabled / createdAt / parentId）。
// 本模块提供：
//   1. FIELD_MAPPING 白名单字典（蛇形 → 驼峰，24+ 条冲突字段）
//   2. Adapt<T> 泛型工具类型（编译期字段重命名）
//   3. adapt() 运行时转换函数（蛇形数据 → 驼峰数据）
//   4. adaptReverse() 反向转换函数（驼峰数据 → 蛇形数据，用于发请求前）
// ============================================================================

// ----------------------------------------------------------------------------
// 1. 白名单字段字典：snake_case → camelCase
// ----------------------------------------------------------------------------
// 仅记录已确认存在命名冲突的字段（openapi 蛇形 ↔ 手写驼峰）。
// 语义重命名字段（如 account_type → category）单列在 SEMANTIC_MAPPING 中。

/**
 * 蛇形 → 驼峰 字段映射白名单（直接命名冲突，无语义变化）
 */
export const FIELD_MAPPING = {
  // 时间戳类
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  approved_at: 'approvedAt',
  submitted_at: 'submittedAt',
  posted_at: 'postedAt',
  reversed_at: 'reversedAt',
  closed_at: 'closedAt',
  completed_at: 'completedAt',
  scheduled_at: 'scheduledAt',
  payment_date: 'paymentDate',
  close_date: 'closeDate',
  actual_payment_date: 'actualPaymentDate',
  executed_at: 'executedAt',
  write_off_date: 'writeOffDate',
  start_date: 'startDate',
  end_date: 'endDate',

  // 布尔标志类
  is_active: 'isActive',
  is_enabled: 'isEnabled',
  is_cash_flow: 'isCashFlow',
  is_detail: 'isDetail',
  is_primary: 'isPrimary',
  is_reversed: 'isReversed',
  is_trial: 'isTrial',
  has_children: 'hasChildren',

  // 外键 ID 类
  parent_id: 'parentId',
  user_id: 'userId',
  account_id: 'accountId',
  voucher_id: 'voucherId',
  department_id: 'departmentId',
  project_id: 'projectId',
  customer_id: 'customerId',
  supplier_id: 'supplierId',
  employee_id: 'employeeId',
  contact_id: 'contactId',
  tag_id: 'tagId',
  plan_id: 'planId',
  template_id: 'templateId',
  invoice_id: 'invoiceId',
  payable_id: 'payableId',
  payment_id: 'paymentId',
  approver_id: 'approverId',
  submitter_id: 'submitterId',
  poster_id: 'posterId',
  checker_id: 'checkerId',
  maker_id: 'makerId',
  bookkeeper_id: 'bookkeeperId',
  bank_account_id: 'bankAccountId',
  source_id: 'sourceId',
  reverse_voucher_id: 'reverseVoucherId',

  // 编码/名称类
  account_code: 'accountCode',
  account_name: 'accountName',
  account_type: 'accountType',
  parent_code: 'parentCode',
  full_name: 'fullName',
  first_name: 'firstName',
  last_name: 'lastName',
  name_en: 'nameEn',
  voucher_no: 'voucherNo',
  voucher_date: 'voucherDate',
  voucher_type: 'voucherType',
  voucher_number: 'voucherNumber',
  payment_no: 'paymentNo',
  payment_method: 'paymentMethod',
  bank_name: 'bankName',
  bank_account_no: 'bankAccountNo',
  bank_transaction_no: 'bankTransactionNo',
  customer_name: 'customerName',
  supplier_name: 'supplierName',
  customer_type: 'customerType',
  company_size: 'companySize',
  employee_count: 'employeeCount',
  postal_code: 'postalCode',
  period_name: 'periodName',
  currency_code: 'currencyCode',
  aux_type: 'auxType',
  item_code: 'itemCode',
  item_name: 'itemName',
  item_type: 'itemType',
  metric_name: 'metricName',
  metric_type: 'metricType',
  source_module: 'sourceModule',
  license_type: 'licenseType',

  // 金额类
  total_amount: 'totalAmount',
  total_debit: 'totalDebit',
  total_credit: 'totalCredit',
  total_assets: 'totalAssets',
  total_equity: 'totalEquity',
  total_liabilities: 'totalLiabilities',
  total_revenue: 'totalRevenue',
  total_expense: 'totalExpense',
  net_income: 'netIncome',
  net_change: 'netChange',
  debit_balance: 'debitBalance',
  credit_balance: 'creditBalance',
  opening_balance: 'openingBalance',
  closing_balance: 'closingBalance',
  total_inflow: 'totalInflow',
  total_outflow: 'totalOutflow',
  payable_amount: 'payableAmount',
  payment_amount: 'paymentAmount',
  remaining_amount: 'remainingAmount',
  write_off_amount: 'writeOffAmount',
  cost_cents: 'costCents',
  price_cents: 'priceCents',
  base_cost_cents: 'baseCostCents',
  overage_cost_cents: 'overageCostCents',
  plugin_cost_cents: 'pluginCostCents',
  total_cost_cents: 'totalCostCents',

  // 其他
  balance_direction: 'balanceDirection',
  default_currency: 'defaultCurrency',
  enable_foreign_currency: 'enableForeignCurrency',
  enable_quantity: 'enableQuantity',
  tenant_id: 'tenantId',
  line_no: 'lineNo',
  approved_by: 'approvedBy',
  updated_by: 'updatedBy',
  created_by: 'createdBy',
  closed_by: 'closedBy',
  executed_by: 'executedBy',
  write_off_by: 'writeOffBy',
  posted_by: 'postedBy',
  approver_name: 'approverName',
  submitter_name: 'submitterName',
  poster_name: 'posterName',
  checker_name: 'checkerName',
  maker_name: 'makerName',
  bookkeeper_name: 'bookkeeperName',
  attachment_count: 'attachmentCount',
  write_off_status: 'writeOffStatus',
  cancel_at_period_end: 'cancelAtPeriodEnd',
  price_period: 'pricePeriod',
  trial_days: 'trialDays',
  api_calls: 'apiCalls',
  percent_used: 'percentUsed',
  period_end: 'periodEnd',
  period_start: 'periodStart',
  included_api_calls: 'includedApiCalls',
  included_modules: 'includedModules',
  included_storage_gb: 'includedStorageGb',
  included_users: 'includedUsers',
  overage_api_calls_cents: 'overageApiCallsCents',
  overage_storage_cents: 'overageStorageCents',
  overage_users_cents: 'overageUsersCents',
} as const;

/**
 * 语义重命名字段映射（字段名和语义均有变化）
 * account_type → category（枚举值一致，字段名不同）
 * is_enabled → isactive（finance.ts 手写用 lowercase concat）
 */
export const SEMANTIC_MAPPING = {
  account_type: 'category',
  is_enabled: 'isactive',
} as const;

/**
 * 合并映射（FIELD_MAPPING + SEMANTIC_MAPPING），用于全量适配
 */
export const FULL_MAPPING = {
  ...FIELD_MAPPING,
  ...SEMANTIC_MAPPING,
} as const;

// ----------------------------------------------------------------------------
// 2. 泛型工具类型
// ----------------------------------------------------------------------------

/**
 * 字段映射配置的类型
 */
export type FieldMapping = Readonly<Record<string, string>>;

/**
 * Adapt<T, M> — 将生成类型 T 中 M 字典指定的蛇形字段重命名为驼峰字段。
 *
 * @example
 * type AdaptedAccount = Adapt<FinanceTypes.Account, typeof FIELD_MAPPING>;
 * // created_at → createdAt, is_enabled → isEnabled, parent_id → parentId, ...
 */
export type Adapt<T, M extends FieldMapping> = Omit<T, keyof M> & {
  [K in keyof M as M[K]]: K extends keyof T ? T[K] : never;
};

/**
 * 提取映射后的字段名列表（用于类型推导）
 */
export type AdaptedKeys<M extends FieldMapping> = M[keyof M];

// ----------------------------------------------------------------------------
// 3. 运行时转换函数
// ----------------------------------------------------------------------------

/**
 * 将蛇形字段数据适配为驼峰字段数据（生成类型 → 业务类型方向）。
 *
 * @param data  - 后端返回的蛇形字段数据
 * @param mapping - 字段映射字典（默认 FIELD_MAPPING）
 * @returns 适配后的驼峰字段数据
 *
 * @example
 * const account = adapt(apiResponse, FIELD_MAPPING);
 * // { created_at: '...' } → { createdAt: '...' }
 */
export function adapt<T extends Record<string, unknown>>(
  data: T,
  mapping: FieldMapping = FIELD_MAPPING,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const newKey = mapping[key] ?? key;
    result[newKey] = value;
  }
  return result;
}

/**
 * 将驼峰字段数据适配为蛇形字段数据（业务类型 → 生成类型方向，用于发请求前）。
 *
 * @param data - 前端业务层的驼峰字段数据
 * @param mapping - 字段映射字典（默认 FIELD_MAPPING，自动反转）
 * @returns 反向适配后的蛇形字段数据
 *
 * @example
 * const payload = adaptReverse({ createdAt: '...' });
 * // { created_at: '...' }
 */
export function adaptReverse<T extends Record<string, unknown>>(
  data: T,
  mapping: FieldMapping = FIELD_MAPPING,
): Record<string, unknown> {
  const reverseMapping: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(mapping)) {
    reverseMapping[camel] = snake;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const newKey = reverseMapping[key] ?? key;
    result[newKey] = value;
  }
  return result;
}

/**
 * snake_case → camelCase 通用转换（不依赖白名单，用于动态字段）
 */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * camelCase → snake_case 通用转换（不依赖白名单，用于动态字段）
 */
export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
