/**
 * Features - Finance
 *
 * 财务相关：ERP 主数据、外部 ERP 对接、基础财务、CRM/HRM/PM 财务模块
 */

// ERP 主数据（包含 useAssets/useExpenses/useBudgets 等多个 hooks）
export {
  useAssets,
  useExpenses,
  useBudgets,
  useReceivables,
  usePayables,
  useAccountingSubjects,
  useVouchers,
  useOfficeSupplies,
  useMeetingRooms,
  useMeetingBookings,
  useVehicles,
  useVehicleRequests,
  useAnnouncements,
  useFinanceReports,
} from '../../useErp';
export type { UseErpResult } from '../../useErp';

// 外部 ERP 对接（包含多个 hooks）
export {
  useErpConnections,
  useErpConnection,
  useCreateErpConnection,
  useUpdateErpConnection,
  useDeleteErpConnection,
  useTestErpConnection,
  useToggleErpConnection,
  useSyncAccounts,
  useSyncCustomers,
  useSyncSuppliers,
  useSyncVouchers,
  useFullSync,
  useSyncLogs,
  useSyncLogDetail,
  useSyncStatistics,
  useAccountMappings,
  useImportAccountMappings,
  useAutoMatchAccountMappings,
  useUpdateAccountMapping,
  useCustomerMappings,
  useImportCustomerMappings,
  useUpdateCustomerMapping,
  useSupplierMappings,
  useImportSupplierMappings,
  useUpdateSupplierMapping,
  usePreviewExternalAccounts,
  usePreviewExternalCustomers,
  usePreviewExternalSuppliers,
  useExportSyncLogs,
  useExportMappingRules,
} from '../../useExternalErp';

// 基础财务（账户/科目/期初余额等）
export {
  useAccounts,
  useAccountTree,
  useAccount,
  useAccountBalances,
  useOpeningBalances,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useSetOpeningBalance,
  useCarryForwardOpeningBalance,
} from '../../useFinance';

// CRM 财务（销售发票/收款等）
export {
  useCustomerFinanceInfo,
  useUpdateCustomerFinanceInfo,
  useSalesInvoices,
  useSalesInvoice,
  useCreateSalesInvoice,
  useUpdateSalesInvoice,
  useDeleteSalesInvoice,
  useIssueSalesInvoice,
  useVoidSalesInvoice,
  useRedFlushSalesInvoice,
  useCollectionRecords,
  useCollectionRecord,
  useCreateCollectionRecord,
  useConfirmCollection,
  useBatchConfirmCollections,
  useReceivableAging,
  useCustomerReceivableSummary,
  useOverdueReceivables,
  useExportSalesInvoices,
  useExportCollectionRecords,
  useExportReceivableAging,
} from '../../useCrmFinance';

// HRM 财务（员工薪资等）
export {
  useEmployeeFinance,
  useEmployeeFinanceInfo,
  useUpdateEmployeeFinanceInfo,
  useEmployeePayrolls,
  useDepartmentPayrollSummary,
  usePayrollPeriods,
} from '../../useHrmFinance';

// PM 财务（项目财务等）
export {
  useProjectFinance,
  useProjectBudgetItems,
  useProjectCostPerformance,
} from '../../usePmFinance';

// 凭证模板
export {
  useVoucherTemplates,
  useVoucherTemplate,
  useCreateVoucherTemplate,
  useUpdateVoucherTemplate,
  useDeleteVoucherTemplate,
  useCopyVoucherTemplate,
  useSetDefaultVoucherTemplate,
  useToggleVoucherTemplate,
  usePreviewGeneratedVouchers,
  useGenerateVoucherFromSource,
  useBatchGenerateVouchers,
  useAutoGenerateVouchers,
  useRegenerateReversedVoucher,
  useMatchVoucherTemplate,
  useVoucherTemplateUsageStats,
  useGenerationRules,
  useCreateGenerationRule,
  useUpdateGenerationRule,
  useDeleteGenerationRule,
  useToggleGenerationRule,
} from '../../useVoucherTemplate';

// 合并报表
export {
  useConsolidationScopes,
  useConsolidationScope,
  useCreateConsolidationScope,
  useUpdateConsolidationScope,
  useDeleteConsolidationScope,
  useScopeCompanies,
  useAddCompanyToScope,
  useUpdateScopeCompany,
  useRemoveCompanyFromScope,
  useEliminationRules,
  useEliminationRule,
  useCreateEliminationRule,
  useUpdateEliminationRule,
  useDeleteEliminationRule,
  useInternalTransactions,
  useInternalTransaction,
  useExecuteElimination,
  useConsolidationReports,
  useConsolidationReport,
  useGenerateConsolidationReport,
  useConsolidationReportLines,
  useApproveConsolidationReport,
  usePublishConsolidationReport,
  useDeleteConsolidationReport,
  useCompanyRelations,
  useCreateCompanyRelation,
  useUpdateCompanyRelation,
  useDeleteCompanyRelation,
  useCompanyTree,
} from '../../useConsolidation';
