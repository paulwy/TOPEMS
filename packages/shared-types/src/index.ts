export type {
  AxiosInstance,
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  PaginationParams,
  PaginatedResult,
  QueryParams,
  BatchOperationResult,
} from './common';

export type {
  User,
  Role,
  Permission,
  LoginRequest,
  LoginResponse,
  AuthState,
} from './auth';

export { mapApiUserToUser } from './auth';

export type {
  Department,
  Position,
  UserPosition,
} from './org';

export type {
  DashboardStats,
  Task,
  Event,
  AttendanceRecord,
  InventoryItem,
  ProductionOrder,
  Notification,
  ApprovalTask,
  QuickAction,
  OfflineSyncRecord,
  DeviceInfo,
} from './mobile';

export type {
  AIFeatureType,
  ValidationIssue,
  Suggestion,
  ValidateRequest,
  ValidateResponse,
  CompleteRequest,
  CompletionItem,
  CompleteResponse,
  SummarizeRequest,
  SummarizeResponse,
  AITemplate,
  CodeGenerateContext,
  TextOptimizeContext,
} from './ai';

export type {
  AccountCategory,
  BalanceDirection,
  AccountingDimension,
  Account,
  AccountOpeningBalance,
  AccountBalance,
  VoucherStatus,
  VoucherType,
  VoucherEntry,
  Voucher,
  CreateVoucherRequest,
  CreateVoucherEntryRequest,
  CounterpartyType,
  BankAccount,
  CounterpartyFinanceInfo,
  Customer,
  Supplier,
  InvoiceStatus,
  SalesInvoice,
  PurchaseInvoice,
  CollectionRecord,
  PaymentRecord,
  BalanceSheetItem,
  BalanceSheetSection,
  BalanceSheet,
  IncomeStatementItem,
  IncomeStatementSection,
  IncomeStatement,
  CashFlowItem,
  CashFlowSection,
  CashFlowStatement,
  VoucherTemplateType,
  VoucherTemplateEntry,
  VoucherTemplate,
  VoucherQueryParams,
  ReportQueryParams,
  VoucherOperationResult,
} from './finance';

export type {
  AddressbookEntry,
  AddressbookDetail,
  AddressbookQueryParams,
  AddressbookSearchParams,
  ExportParams,
  ContactDetailParams,
  DepartmentNode,
} from './addressbook';

export type {
  ExternalErpType,
  ErpConnectionStatus,
  SyncDirection,
  SyncMode,
  ErpSyncStatus,
  AccountMappingDirection,
  ErpConnectionConfig,
  KingdeeConnectionConfig,
  YonyouConnectionConfig,
  SapConnectionConfig,
  CompanyMapping,
  PlantMapping,
  BaseMappingRule,
  AccountMappingRule,
  CustomerMappingRule,
  SupplierMappingRule,
  ProjectMappingRule,
  DepartmentMappingRule,
  EmployeeMappingRule,
  SyncLogType,
  SyncLogStatus,
  SyncLog,
  SyncError,
  BaseSyncRequest,
  AccountSyncRequest,
  CustomerSyncRequest,
  SupplierSyncRequest,
  VoucherSyncRequest,
  InvoiceSyncRequest,
  BaseSyncResult,
  AccountSyncResult,
  VoucherSyncResult,
  ExternalVoucher,
  KingdeeVoucherEntry,
  YonyouVoucherEntry,
  SapVoucherEntry,
  ConnectionTestRequest,
  ConnectionTestResult,
} from './external-erp';

export type {
  ConsolidationScopeStatus,
  ConsolidationScope,
  ConsolidationCompany,
  AddCompanyToScopeRequest,
  EliminationRuleType,
  EliminationRuleStatus,
  EliminationRule,
  InternalTransaction,
  ConsolidationReportType,
  ConsolidationReportStatus,
  ConsolidationReport,
  ConsolidationReportLine,
  GenerateConsolidationReportRequest,
  EliminationResult,
  ConsolidationReportGenerateResult,
  ConsolidationScopeQueryParams,
  EliminationRuleQueryParams,
  InternalTransactionQueryParams,
  ConsolidationReportQueryParams,
  CompanyRelationType,
  CompanyRelation,
  CompanyFinancialData,
  CompanyTreeNode,
  CompanyStructureItem,
  CreateCompanyRelationRequest,
  UpdateCompanyRelationRequest,
  CompanyRelationQueryParams,
} from './consolidation';

export type {
  SalaryPaymentStatus,
  EmployeeFinance,
  PayrollRecord,
  SocialSecurityRecord,
  HousingFundRecord,
  PaymentStatus,
  InvoiceStatusType,
  ProjectFinance,
  ProjectBudgetItem,
  ProjectSettlementItem,
} from './hrm-finance';

export type {
  MenuItem,
} from './ui';

export type {
  FieldType,
  FilterOperator,
  FilterFieldType,
  ValidationRule,
  FieldConfig,
  FormBuilderProps,
  FilterFieldConfig,
  FilterCondition,
  FilterPanelProps,
  DataTableColumn,
  ExportConfig,
  DataTableProps,
  PaginationProps,
  ConfirmDialogProps,
  ToastMessage,
  ToastNotificationProps,
  CrudConfig,
  CrudPageProps,
  UseCrudOptions,
  UseCrudResult,
  UseFormValidationOptions,
  UseFormValidationResult,
} from './component-types';

export type {
  WorkflowInstance,
  WorkflowTask,
  WorkflowStep,
  WorkflowDefinition,
  WorkflowTransition,
  WorkflowAction,
} from './workflow';

export type {
  Notification as WorkflowNotification,
  NotificationType,
  NotificationStatus,
} from './notification';

export type {
  FileInfo,
  FileUploadResult,
  FileDownloadResult,
} from './file';

export type {
  DictItem,
  DictType,
} from './dict';