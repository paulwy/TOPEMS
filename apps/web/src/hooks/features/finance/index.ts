// 财务模块聚合导出

// 外部 ERP 对接（包含多个 hooks）
export { useErpConnections } from '../../useExternalErp';

// 基础财务（账户/科目/期初余额等）
export {
  useAccountTree,
  useOpeningBalances,
  useSetOpeningBalance,
  useCarryForwardOpeningBalance,
} from '../../useFinance';

// CRM 财务（销售发票/收款等）
export {
  useCustomerFinanceInfo,
  useSalesInvoices,
  useCollectionRecords,
} from '../../useCrmFinance';

// HRM 财务（员工薪资等）
export { useEmployeeFinanceInfo, useUpdateEmployeeFinanceInfo } from '../../useHrmFinance';

// 凭证模板
export { useVoucherTemplate } from '../../useVoucherTemplate';

// 合并报表
export {
  useConsolidationScopes,
  useConsolidationScope,
  useCreateConsolidationScope,
  useUpdateConsolidationScope,
  useDeleteConsolidationScope,
  useScopeCompanies,
  useAddCompanyToScope,
  useRemoveCompanyFromScope,
  useConsolidationReports,
  useGenerateConsolidationReport,
  useConsolidationReportLines,
  useApproveConsolidationReport,
  usePublishConsolidationReport,
  useCompanyRelations,
  useCreateCompanyRelation,
  useUpdateCompanyRelation,
  useDeleteCompanyRelation,
  useCompanyTree,
} from '../../useConsolidation';
