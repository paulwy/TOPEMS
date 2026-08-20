export type {
  AxiosInstance,
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  PaginationParams,
  PaginatedResult,
  QueryParams,
  BatchOperationResult,
  SelectOption,
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
  // OpenAPI 生成类型别名（推广阶段）
  GeneratedAccount,
  GeneratedVoucher,
  GeneratedVoucherLine,
  GeneratedVoucherResponse,
  GeneratedCreateAccountRequest,
  GeneratedCreateVoucherRequest,
  GeneratedVoucherLineRequest,
  GeneratedLedgerEntry,
  GeneratedTrialBalance,
  GeneratedBalanceSheet,
  GeneratedIncomeStatement,
  GeneratedCashFlowStatement,
  GeneratedPeriod,
  GeneratedPayment,
  GeneratedPaymentItem,
  GeneratedPaymentResponse,
  GeneratedCreatePaymentRequest,
  GeneratedAuxType,
  GeneratedAuxiliaryAccount,
  // 适配类型
  AdaptedAccount,
} from './finance';

// 字段适配函数（值导出）
export { adaptAccountFromGenerated } from './finance';

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
  CrudListParams,
  CrudListResult,
  CrudAdapter,
  UseCrudUnifiedOptions,
  UseCrudUnifiedResult,
  CrudPageApiAdapter,
  CrudApiClient,
  CrudOperationResult,
  CrudApiAdapterConfig,
  CrudApiAdapter,
  CrudOperations,
  CrudResourceConfig,
  CrudMutationCallbacks,
  CrudResultHooks,
} from './crud';

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
  NotificationStatus as NotificationStatusType,
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

export {
  BusinessStatusCode,
  WorkflowStatus,
  OrderStatus,
  FinanceStatus,
  ProjectStatus,
  QualityStatus,
  DocumentStatus,
  NotificationStatus,
  TaskStatus,
  TicketStatus,
  CommonStatus,
  ProductionStatus,
  InventoryStatus,
  getStatusLabel,
  getStatusColor,
  getStatusConfig,
  getAllStatusOptions,
} from './business-status';

export type {
  StatusConfig,
} from './business-status';

// OpenAPI 自动生成类型（从后端 schema 自动生成，消除类型漂移）
export type {
  ApiPaths,
  ApiComponents,
  ApiOperations,
} from './generated';

// OpenAPI 生成类型封装层（按模块命名空间导出，方便业务使用）
export type {
  IamTypes,
  HrmTypes,
  FinanceTypes,
  MasterDataTypes,
  QmsTypes,
  MesTypes,
  CommonTypes,
} from './generated';

// 类型桥接工具（连接生成类型与手写业务类型）
export {
  defineApiSchema,
  createTypedApiClient,
  typeCheck,
} from './typeBridge';

export type {
  ApiSchemaMapping,
  InferEntity,
  InferCreateRequest,
  InferUpdateRequest,
  TypedCrudApiClient,
  FieldsOf,
} from './typeBridge';

// OpenAPI 类型适配层（蛇形 ↔ 驼峰 字段映射）
export {
  FIELD_MAPPING,
  SEMANTIC_MAPPING,
  FULL_MAPPING,
  adapt,
  adaptReverse,
  snakeToCamel,
  camelToSnake,
} from './openapi-adapter';

export type {
  FieldMapping,
  Adapt,
  AdaptedKeys,
} from './openapi-adapter';

// OpenAPI 绑定工具（V72 A4 — 按 OperationId 绑定 query/request/response 类型）
export {
  toOpenApiParams,
  toOpenApiRequestBody,
  fromOpenApiResponse,
} from './api-binding-tools';

export type {
  OpenApiOperation,
  OpenApiQueryParams,
  OpenApiRequestBody,
  OpenApiPathParams,
  OpenApiResponseSchema,
  AdaptedQuery,
  AdaptedRequestBody,
  TypedApiResponse,
  TypedPaginatedResponse,
  OpenApiSchema,
} from './api-binding-tools';