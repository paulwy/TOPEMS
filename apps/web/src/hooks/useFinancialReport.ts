/**
 * 财务报表Hooks
 * 封装财务报表生成和查询的React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from './useNotification';
import { financialReportApi } from '../api/financial-report';

// ============================================
// 一、财务报表生成与查询
// ============================================

/**
 * 生成资产负债表
 */
export function useGenerateBalanceSheet() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      company_id: string;
      period: string;
      compare_period?: string;
      currency_code?: string;
      include_disabled_accounts?: boolean;
    }) => financialReportApi.generateBalanceSheet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      success('资产负债表生成成功');
    },
    onError: (err) => {
      error(err.message || '资产负债表生成失败');
    },
  });
}

/**
 * 获取资产负债表
 */
export function useBalanceSheet(params: {
  company_id: string;
  period: string;
  currency_code?: string;
}) {
  return useQuery({
    queryKey: ['balance-sheet', params],
    queryFn: () => financialReportApi.getBalanceSheet(params),
    enabled: !!params.company_id && !!params.period,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取资产负债表历史
 */
export function useBalanceSheetHistory(params: {
  company_id: string;
  start_period: string;
  end_period: string;
  currency_code?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['balance-sheet-history', params],
    queryFn: () => financialReportApi.getBalanceSheetHistory(params),
    enabled: !!params.company_id && !!params.start_period && !!params.end_period,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 生成利润表
 */
export function useGenerateIncomeStatement() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      company_id: string;
      period: string;
      compare_period?: string;
      currency_code?: string;
      include_detail?: boolean;
    }) => financialReportApi.generateIncomeStatement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      success('利润表生成成功');
    },
    onError: (err) => {
      error(err.message || '利润表生成失败');
    },
  });
}

/**
 * 获取利润表
 */
export function useIncomeStatement(params: {
  company_id: string;
  period: string;
  currency_code?: string;
}) {
  return useQuery({
    queryKey: ['income-statement', params],
    queryFn: () => financialReportApi.getIncomeStatement(params),
    enabled: !!params.company_id && !!params.period,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取利润表历史
 */
export function useIncomeStatementHistory(params: {
  company_id: string;
  start_period: string;
  end_period: string;
  currency_code?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['income-statement-history', params],
    queryFn: () => financialReportApi.getIncomeStatementHistory(params),
    enabled: !!params.company_id && !!params.start_period && !!params.end_period,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 生成现金流量表
 */
export function useGenerateCashFlowStatement() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      company_id: string;
      period: string;
      compare_period?: string;
      currency_code?: string;
      method?: 'direct' | 'indirect';
    }) => financialReportApi.generateCashFlowStatement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-statement'] });
      success('现金流量表生成成功');
    },
    onError: (err) => {
      error(err.message || '现金流量表生成失败');
    },
  });
}

/**
 * 获取现金流量表
 */
export function useCashFlowStatement(params: {
  company_id: string;
  period: string;
  currency_code?: string;
}) {
  return useQuery({
    queryKey: ['cash-flow-statement', params],
    queryFn: () => financialReportApi.getCashFlowStatement(params),
    enabled: !!params.company_id && !!params.period,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取现金流量表历史
 */
export function useCashFlowStatementHistory(params: {
  company_id: string;
  start_period: string;
  end_period: string;
  currency_code?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['cash-flow-statement-history', params],
    queryFn: () => financialReportApi.getCashFlowStatementHistory(params),
    enabled: !!params.company_id && !!params.start_period && !!params.end_period,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// 二、财务报表审批
// ============================================

/**
 * 提交报表审批
 */
export function useSubmitReportForApproval() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      report_id: string;
    }) => financialReportApi.submitReportForApproval(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-statement'] });
      success('报表已提交审批');
    },
    onError: (err) => {
      error(err.message || '报表提交审批失败');
    },
  });
}

/**
 * 审批报表
 */
export function useApproveReport() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      report_id: string;
      comment?: string;
    }) => financialReportApi.approveReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-statement'] });
      success('报表审批通过');
    },
    onError: (err) => {
      error(err.message || '报表审批失败');
    },
  });
}

/**
 * 驳回报表
 */
export function useRejectReport() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      report_id: string;
      reason: string;
    }) => financialReportApi.rejectReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-statement'] });
      success('报表已驳回');
    },
    onError: (err) => {
      error(err.message || '报表驳回失败');
    },
  });
}

/**
 * 锁定报表
 */
export function useLockReport() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      report_id: string;
    }) => financialReportApi.lockReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-statement'] });
      success('报表已锁定');
    },
    onError: (err) => {
      error(err.message || '报表锁定失败');
    },
  });
}

/**
 * 解锁报表
 */
export function useUnlockReport() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      report_id: string;
    }) => financialReportApi.unlockReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow-statement'] });
      success('报表已解锁');
    },
    onError: (err) => {
      error(err.message || '报表解锁失败');
    },
  });
}

// ============================================
// 三、报表对比分析
// ============================================

/**
 * 获取报表对比分析
 */
export function useReportComparison(params: {
  report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
  company_id: string;
  period_from: string;
  period_to: string;
  currency_code?: string;
}) {
  return useQuery({
    queryKey: ['report-comparison', params],
    queryFn: () => financialReportApi.getReportComparison(params),
    enabled:
      !!params.report_type && !!params.company_id && !!params.period_from && !!params.period_to,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取报表趋势分析
 */
export function useReportTrend(params: {
  report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
  company_id: string;
  period_from: string;
  period_to: string;
  account_codes?: string[];
  currency_code?: string;
}) {
  return useQuery({
    queryKey: ['report-trend', params],
    queryFn: () => financialReportApi.getReportTrend(params),
    enabled:
      !!params.report_type && !!params.company_id && !!params.period_from && !!params.period_to,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取报表同比分析
 */
export function useReportYearOverYear(params: {
  report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
  company_id: string;
  current_period: string;
  previous_year_period: string;
  currency_code?: string;
}) {
  return useQuery({
    queryKey: ['report-year-over-year', params],
    queryFn: () => financialReportApi.getReportYearOverYear(params),
    enabled:
      !!params.report_type &&
      !!params.company_id &&
      !!params.current_period &&
      !!params.previous_year_period,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取报表环比分析
 */
export function useReportPeriodOverPeriod(params: {
  report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
  company_id: string;
  current_period: string;
  previous_period: string;
  currency_code?: string;
}) {
  return useQuery({
    queryKey: ['report-period-over-period', params],
    queryFn: () => financialReportApi.getReportPeriodOverPeriod(params),
    enabled:
      !!params.report_type &&
      !!params.company_id &&
      !!params.current_period &&
      !!params.previous_period,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// 四、合并报表
// ============================================

/**
 * 生成合并报表
 */
export function useGenerateConsolidatedReport() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      consolidation_id: string;
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      period: string;
      currency_code?: string;
      eliminate_intercompany?: boolean;
    }) => financialReportApi.generateConsolidatedReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-reports'] });
      success('合并报表生成成功');
    },
    onError: (err) => {
      error(err.message || '合并报表生成失败');
    },
  });
}

/**
 * 获取合并报表
 */
export function useConsolidatedReport(
  consolidationId: string,
  params: {
    report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    period: string;
    currency_code?: string;
  }
) {
  return useQuery({
    queryKey: ['consolidated-report', consolidationId, params],
    queryFn: () => financialReportApi.getConsolidatedReport(consolidationId, params),
    enabled: !!consolidationId && !!params.report_type && !!params.period,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取合并主体列表
 */
export function useConsolidationEntities(params?: {
  parent_id?: string;
  include_disabled?: boolean;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ['consolidation-entities', params],
    queryFn: () => financialReportApi.getConsolidationEntities(params),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 创建合并主体
 */
export function useCreateConsolidationEntity() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (data: {
      name: string;
      code: string;
      parent_id?: string;
      entity_type: 'holding' | 'subsidiary' | 'associate' | 'joint_venture';
      ownership_percentage: number;
      currency_code?: string;
    }) => financialReportApi.createConsolidationEntity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidation-entities'] });
      success('合并主体创建成功');
    },
    onError: (err) => {
      error(err.message || '合并主体创建失败');
    },
  });
}

/**
 * 更新合并主体
 */
export function useUpdateConsolidationEntity() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ entityId, data }: { entityId: string; data: any }) =>
      financialReportApi.updateConsolidationEntity(entityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidation-entities'] });
      success('合并主体更新成功');
    },
    onError: (err) => {
      error(err.message || '合并主体更新失败');
    },
  });
}

/**
 * 删除合并主体
 */
export function useDeleteConsolidationEntity() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (entityId: string) => financialReportApi.deleteConsolidationEntity(entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidation-entities'] });
      success('合并主体删除成功');
    },
    onError: (err) => {
      error(err.message || '合并主体删除失败');
    },
  });
}

// ============================================
// 五、导出
// ============================================

/**
 * 导出财务报表
 */
export function useExportFinancialReport() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      report_id?: string;
      company_id: string;
      period: string;
      currency_code?: string;
      format: 'pdf' | 'xlsx' | 'csv';
      include_notes?: boolean;
      include_comparison?: boolean;
    }) => {
      const blob = await financialReportApi.exportReport(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${params.report_type}-${params.period}.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      success('财务报表导出成功');
    },
    onError: (err) => {
      error(err.message || '导出失败');
    },
  });
}

/**
 * 导出合并报表
 */
export function useExportConsolidatedReport() {
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: async (params: {
      consolidation_id: string;
      report_type: 'balance_sheet' | 'income_statement' | 'cash_flow';
      period: string;
      currency_code?: string;
      format: 'pdf' | 'xlsx';
    }) => {
      const blob = await financialReportApi.exportConsolidatedReport(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consolidated-${params.report_type}-${params.period}.${params.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      success('合并报表导出成功');
    },
    onError: (err) => {
      error(err.message || '导出失败');
    },
  });
}
