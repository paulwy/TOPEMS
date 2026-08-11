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

export { accountApi } from './account';
export { voucherApi } from './voucher';
export { receivablePayableApi } from './receivablePayable';
export { reportApi } from './report';
export { periodApi } from './period';
export { counterpartyFinanceApi } from './counterparty';
export { paymentApi } from './payment';
export { expenseApprovalApi } from './expenseApproval';
export { cashFlowApi } from './cashFlow';
export { voucherTemplateApi } from './voucherTemplate';
export { settlementCenterApi } from './settlementCenter';
export { expenseApi } from './expense';
export { budgetApi } from './budget';
export { reconciliationApi } from './reconciliation';

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

  async getDashboard(): Promise<ApiResponse<FinanceDashboardStats>> {
    return apiClient.finance.get<FinanceDashboardStats>('/dashboard');
  },
};

export default financeApi;
