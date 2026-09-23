// ============================================================================
// ERP → Finance 类型迁移（B1 阶段：仅迁移类型；B2 阶段：API 函数迁移）
// ============================================================================
// 背景：以下类型历史上定义在 @/api/erp/types.ts 中，但语义上属于财务模块，
// 且 Finance 页面大量引用导致依赖反链。B1 阶段先在此 re-declare 并更新
// Finance 页面的 type-only import。
//
// B2 阶段已于 V513 完成（2026-09-07）：budgetApi/voucherApi/financeReportApi
// 已迁移至 @/api/finance，6 个 Finance 页面直连 @/api/finance 不再引用 @/api/erp。
// ============================================================================

export interface Budget {
  id: string;
  code?: string;
  name?: string;
  period?: string;
  department_id?: string;
  budget_type?: string;
  fiscal_year?: string;
  total_budget?: number;
  total_amount?: number;
  used_amount?: number;
  remaining_amount?: number;
  usage_rate?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountingSubject {
  id: string;
  code: string;
  name: string;
  name_en?: string | null;
  category?: string | null;
  level: number;
  parent_code?: string | null;
  description?: string | null;
  is_cash_flow: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialVoucher {
  id: string;
  voucher_number: string;
  voucher_date: string;
  period: string;
  attachment_count?: number;
  summary?: string;
  maker_id?: string;
  maker_name?: string;
  submitter_id?: string;
  submitter_name?: string;
  checker_id?: string;
  checker_name?: string;
  approver_id?: string;
  approver_name?: string;
  bookkeeper_id?: string;
  bookkeeper_name?: string;
  poster_id?: string;
  poster_name?: string;
  status: string;
  total_debit: number;
  total_credit: number;
  source_system?: string;
  source_id?: string;
  project_id?: string;
  contract_id?: string;
  submitted_at?: string;
  approved_at?: string;
  checked_at?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherItem {
  id: string;
  voucher_id: string;
  line_number: number;
  subject_code: string;
  subject_name: string;
  summary?: string;
  debit_amount: number;
  credit_amount: number;
  quantity?: number;
  unit?: string;
  price?: number;
  department_id?: string;
  project_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherItemRequest {
  line_number: number;
  subject_code: string;
  subject_name?: string;
  summary?: string;
  debit_amount: number;
  credit_amount: number;
  quantity?: number;
  unit?: string;
  price?: number;
  department_id?: string;
  project_id?: string;
  contract_id?: string;
  /** 辅助核算类型：customer/supplier/project/department/employee */
  aux_type?: string;
  /** 辅助核算对象 id（aux_accounts.id） */
  aux_id?: string;
}

export interface AuxAccount {
  id: string;
  tenant_id?: string;
  aux_type: string;
  code: string;
  name?: string;
  name_en?: string;
  parent_id?: string | null;
  level?: number;
  is_enabled?: boolean;
}
