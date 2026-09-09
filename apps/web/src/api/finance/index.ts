import apiClient from '../client';
import type { ApiResponse } from '../client';
import { accountApi } from './account';
import { voucherApi } from './voucher';
import { receivablePayableApi } from './receivablePayable';
import { reportApi } from './report';
import { periodApi } from './period';
import { counterpartyFinanceApi } from './counterparty';
import { paymentApi } from './payment';
import { expenseApprovalApi } from './expenseApproval';
import { cashFlowApi } from './cashFlow';
import { voucherTemplateApi } from './voucherTemplate';
import { settlementCenterApi } from './settlementCenter';
import { expenseApi } from './expense';
import { budgetApi } from './budget';
import { reconciliationApi } from './reconciliation';
import { riskV54Api } from './riskV54';
import { taxApi } from './tax';

export { accountApi } from './account';
export { voucherApi } from './voucher';
export { reportApi } from './report';
export { financeReportApi } from './report';
export { counterpartyFinanceApi } from './counterparty';
export { paymentApi } from './payment';
export { expenseApprovalApi } from './expenseApproval';
export { cashFlowApi } from './cashFlow';
export { expenseApi } from './expense';
export { budgetApi } from './budget';
export { taxApi } from './tax';
export { accountingSubjectApi } from './accountingSubject';

// ============================================================================
// ERP → Finance 类型迁移（B1 阶段）
// 语义上属于财务模块的 Budget / AccountingSubject / FinancialVoucher 等类型
// 已从 @/api/erp/types.ts 迁移至此，Finance 页面请使用此来源。ERP 侧同名
// 类型已标记 @deprecated，后续将移除。
// Budget 取 @/api/finance/budget 的 API 完整模型（可空字段 + 页面详情字段），
// types.ts 的 Budget 为展示模型（id/status 必填），页面数据流以 API 模型为准。
// ============================================================================
export type { Budget, BudgetItem } from './budget';
export type { AccountingSubject, FinancialVoucher, VoucherItem, VoucherItemRequest } from './types';

export interface FinanceDashboardStats {
  total_vouchers: number;
  draft_vouchers: number;
  submitted_vouchers: number;
  approved_vouchers: number;
  posted_vouchers: number;
  total_payments: number;
  pending_payments: number;
  total_receivables: number;
  overdue_receivables: number;
  total_payables: number;
  overdue_payables: number;
  pending_approvals: number;
}

export const financeApi = {
  account: accountApi,
  voucher: voucherApi,
  receivablePayable: receivablePayableApi,
  report: reportApi,
  period: periodApi,
  counterparty: counterpartyFinanceApi,
  payment: paymentApi,
  expenseApproval: expenseApprovalApi,
  cashFlow: cashFlowApi,
  voucherTemplate: voucherTemplateApi,
  settlementCenter: settlementCenterApi,
  expense: expenseApi,
  budget: budgetApi,
  reconciliation: reconciliationApi,
  riskV54: riskV54Api,
  tax: taxApi,

  async getDashboard(): Promise<ApiResponse<FinanceDashboardStats>> {
    return apiClient.finance.get<FinanceDashboardStats>('/dashboard');
  },
};

export { receivableApi, payableApi } from './receivablePayable';
export type { Receivable, Payable } from '../erp/types';
export default financeApi;
