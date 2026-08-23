/**
 * OpenAPI 生成类型封装层
 *
 * 按服务/模块导出易用的类型别名，方便业务代码使用。
 *
 * 使用方式：
 *   import type { IamTypes, FinanceTypes } from '@topems/shared-types';
 *   type User = IamTypes.User;
 *
 * 注意：
 * - 生成类型中字段均为可选（openapi-typescript 默认行为），使用时需注意
 * - 对于生成类型中缺失的类型，保持手写类型并标注 TODO
 */

import type { components as ApiComponents } from './openapi';
import type {
  ApiResponse,
  PaginatedResponse as SharedPaginatedResponse,
  ErrorResponse as SharedErrorResponse,
} from '../common';

/**
 * 安全地从 OpenAPI schema 中获取类型。
 * 如果 schema 中存在该类型，返回实际类型；否则回退到 Record<string, unknown>。
 * 用于处理后端 ToSchema 尚未补充的类型，避免阻塞前端类型检查。
 */
type SafeSchema<K extends string> = ApiComponents['schemas'] extends infer S
  ? K extends keyof S
    ? S[K]
    : Record<string, unknown>
  : Record<string, unknown>;

// ============================================================================
// IAM 模块类型
// ============================================================================

export namespace IamTypes {
  export type User = ApiComponents['schemas']['User'];
  export type Role = ApiComponents['schemas']['Role'];
  export type Permission = ApiComponents['schemas']['Permission'];

  // TODO: 以下类型待 OpenAPI 规范补充后生成
  // - UserTenantInfo, AuthTokens, LoginResponseData, RefreshTokenResponseData
  // - UserPreferences, NotificationSettings, ShortcutItem, UserWithPermissions
  // - PermissionCheckRequest/Response, AccessLog, ResetPasswordRequest
  // - SetNewPasswordRequest, BatchOperationRequest/Response, CreateAccessLogRequest
  // - CreatePermissionRequest, UpdatePermissionRequest, UpdateRoleRequest, UpdateUserRequest
}

// ============================================================================
// Finance 模块类型
// ============================================================================

export namespace FinanceTypes {
  // 会计科目（A 类：openapi 已有 schema，直接引用）
  export type Account = ApiComponents['schemas']['Account'];
  export type AccountType = ApiComponents['schemas']['AccountType'];
  export type CreateAccountRequest = ApiComponents['schemas']['CreateAccountRequest'];

  // 凭证（A 类）
  export type Voucher = ApiComponents['schemas']['Voucher'];
  export type VoucherType = ApiComponents['schemas']['VoucherType'];
  export type VoucherStatus = ApiComponents['schemas']['VoucherStatus'];
  export type VoucherLine = ApiComponents['schemas']['VoucherLine'];
  export type VoucherResponse = ApiComponents['schemas']['VoucherResponse'];
  export type CreateVoucherRequest = ApiComponents['schemas']['CreateVoucherRequest'];
  export type VoucherLineRequest = ApiComponents['schemas']['VoucherLineRequest'];

  // 账簿报表（A 类）
  export type LedgerEntry = ApiComponents['schemas']['LedgerEntry'];
  export type TrialBalance = ApiComponents['schemas']['TrialBalance'];
  export type BalanceSheet = ApiComponents['schemas']['BalanceSheet'];
  export type BalanceItem = ApiComponents['schemas']['BalanceItem'];
  export type IncomeStatement = ApiComponents['schemas']['IncomeStatement'];
  export type IncomeItem = ApiComponents['schemas']['IncomeItem'];
  export type CashFlowStatement = ApiComponents['schemas']['CashFlowStatement'];
  export type CashFlowItem = ApiComponents['schemas']['CashFlowItem'];

  // 会计期间（A 类）
  export type Period = ApiComponents['schemas']['Period'];
  export type PeriodStatus = ApiComponents['schemas']['PeriodStatus'];

  // 辅助核算（A 类）
  export type AuxType = ApiComponents['schemas']['AuxType'];
  export type AuxiliaryAccount = ApiComponents['schemas']['AuxiliaryAccount'];

  // 付款管理（A 类）
  export type Payment = ApiComponents['schemas']['Payment'];
  export type PaymentItem = ApiComponents['schemas']['PaymentItem'];
  export type PaymentResponse = ApiComponents['schemas']['PaymentResponse'];
  export type CreatePaymentRequest = ApiComponents['schemas']['CreatePaymentRequest'];
  export type PaymentItemRequest = ApiComponents['schemas']['PaymentItemRequest'];

  // TODO: 以下类型待后端补充 ToSchema 后生成（C 类：finance settlement_center 留 V286）
  // - AccountOpeningBalance, AccountBalance, VoucherTemplate*, VoucherQueryParams
  // - VoucherOperationResult, CounterpartyType
  // - InvoiceStatus, SalesInvoice, PurchaseInvoice, CollectionRecord, PaymentRecord
  // - ReportQueryParams
}

// ============================================================================
// HRM 模块类型
// ============================================================================

export namespace HrmTypes {
  // 主数据类型（B 类：V284 Hrm ToSchema 已补，直接引用）
  export type Employee = ApiComponents['schemas']['Employee'];
  export type Department = ApiComponents['schemas']['Department'];
  export type Company = ApiComponents['schemas']['Company'];
  export type Contract = ApiComponents['schemas']['Contract'];
  export type Position = ApiComponents['schemas']['Position'];

  // 请求/响应类型（B 类：V284 Hrm ToSchema 已补）
  export type CreateEmployeeRequest = ApiComponents['schemas']['CreateEmployeeRequest'];
  export type UpdateEmployeeRequest = ApiComponents['schemas']['UpdateEmployeeRequest'];
  export type CreateDepartmentRequest = ApiComponents['schemas']['CreateDepartmentRequest'];
  export type UpdateDepartmentRequest = ApiComponents['schemas']['UpdateDepartmentRequest'];
  export type CreateCompanyRequest = ApiComponents['schemas']['CreateCompanyRequest'];
  export type UpdateCompanyRequest = ApiComponents['schemas']['UpdateCompanyRequest'];
  export type CreateAttendanceRequest = ApiComponents['schemas']['CreateAttendanceRequest'];
  export type UpdateAttendanceRequest = ApiComponents['schemas']['UpdateAttendanceRequest'];
  export type CreateContractRequest = ApiComponents['schemas']['CreateContractRequest'];
  export type UpdateContractRequest = ApiComponents['schemas']['UpdateContractRequest'];
  export type ContractRenewal = ApiComponents['schemas']['ContractRenewal'];

  // TODO: 以下类型待后端补充 ToSchema 后生成
  // - AttendanceRecord, LeaveRequest, PayrollRecord
  // - PerformanceReview, RecruitmentCandidate
}

// ============================================================================
// MasterData 模块类型
// ============================================================================

export namespace MasterDataTypes {
  // 数据质量闭环（quality_v51）
  export type QualityStatus = ApiComponents['schemas']['QualityStatus'];
  export type QualityCheckV51 = ApiComponents['schemas']['QualityCheckV51'];
  export type QualityRule = ApiComponents['schemas']['QualityRule'];
  export type AutoFixAction = ApiComponents['schemas']['AutoFixAction'];
  export type GovernanceSuggestion = ApiComponents['schemas']['GovernanceSuggestion'];
  export type GovernanceInsight = ApiComponents['schemas']['GovernanceInsight'];
  export type QualityScore = ApiComponents['schemas']['QualityScore'];
  export type QualityDashboard = ApiComponents['schemas']['QualityDashboard'];
  export type RunQualityCheckRequest = ApiComponents['schemas']['RunQualityCheckRequest'];
  export type CreateQualityRuleRequest = ApiComponents['schemas']['CreateQualityRuleRequest'];
  export type AutoFixRequest = ApiComponents['schemas']['AutoFixRequest'];
  export type GenerateSuggestionsRequest = ApiComponents['schemas']['GenerateSuggestionsRequest'];

  // 数据血缘 + 影响分析（lineage_v52）
  export type EdgeType = SafeSchema<'EdgeType'>;
  export type LineageNode = SafeSchema<'LineageNode'>;
  export type LineageEdge = SafeSchema<'LineageEdge'>;
  export type LineageGraph = SafeSchema<'LineageGraph'>;
  export type ChangeType = SafeSchema<'ChangeType'>;
  export type ImpactAnalysisRequest = SafeSchema<'ImpactAnalysisRequest'>;
  export type RiskLevel = SafeSchema<'RiskLevel'>;
  export type AffectedNode = SafeSchema<'AffectedNode'>;
  export type AffectedService = SafeSchema<'AffectedService'>;
  export type ChainReaction = SafeSchema<'ChainReaction'>;
  export type ImpactAnalysisResult = SafeSchema<'ImpactAnalysisResult'>;
  export type ImpactSimulation = SafeSchema<'ImpactSimulation'>;
  export type ChangeEvent = SafeSchema<'ChangeEvent'>;
  export type PropagationAction = SafeSchema<'PropagationAction'>;
  export type PropagationRule = SafeSchema<'PropagationRule'>;
  export type PropagationLog = SafeSchema<'PropagationLog'>;
  export type RegisterLineageRequest = SafeSchema<'RegisterLineageRequest'>;
  export type LineageQuery = SafeSchema<'LineageQuery'>;
  export type ExportQuery = SafeSchema<'ExportQuery'>;
  export type DeleteLineageRequest = SafeSchema<'DeleteLineageRequest'>;
  export type AnalyzeImpactRequest = SafeSchema<'AnalyzeImpactRequest'>;
  export type SimulateChangeRequest = SafeSchema<'SimulateChangeRequest'>;
  export type AffectedScopeQuery = SafeSchema<'AffectedScopeQuery'>;
  export type PropagateChangeRequest = SafeSchema<'PropagateChangeRequest'>;
  export type AddPropagationRuleRequest = SafeSchema<'AddPropagationRuleRequest'>;
  export type PropagationLogQuery = SafeSchema<'PropagationLogQuery'>;
  export type RollbackPropagationRequest = SafeSchema<'RollbackPropagationRequest'>;

  // 知识图谱 + 推荐系统（knowledge_v53）
  export type KGNodeType = SafeSchema<'KGNodeType'>;
  export type KGNode = SafeSchema<'KGNode'>;
  export type KGRelationType = SafeSchema<'KGRelationType'>;
  export type KGEdge = SafeSchema<'KGEdge'>;
  export type KnowledgeGraph = SafeSchema<'KnowledgeGraph'>;
  export type RecommendationSource = SafeSchema<'RecommendationSource'>;
  export type Recommendation = SafeSchema<'Recommendation'>;
  export type InteractionRecord = SafeSchema<'InteractionRecord'>;
  export type AssetType = SafeSchema<'AssetType'>;
  export type DataAsset = SafeSchema<'DataAsset'>;
  export type AssetCategory = SafeSchema<'AssetCategory'>;
  export type AssetCatalog = SafeSchema<'AssetCatalog'>;
  export type AssetStats = SafeSchema<'AssetStats'>;
  export type AddKGNodeRequest = SafeSchema<'AddKGNodeRequest'>;
  export type AddKGEdgeRequest = SafeSchema<'AddKGEdgeRequest'>;
  export type SubgraphQuery = SafeSchema<'SubgraphQuery'>;
  export type PathQuery = SafeSchema<'PathQuery'>;
  export type SimilarQuery = SafeSchema<'SimilarQuery'>;
  export type ExportKGQuery = SafeSchema<'ExportKGQuery'>;
  export type RecommendationQuery = SafeSchema<'RecommendationQuery'>;
  export type RecordInteractionRequest = SafeSchema<'RecordInteractionRequest'>;
  export type SimilarItemsQuery = SafeSchema<'SimilarItemsQuery'>;
  export type TrendingQuery = SafeSchema<'TrendingQuery'>;
  export type RegisterAssetRequest = SafeSchema<'RegisterAssetRequest'>;
  export type SearchAssetsQuery = SafeSchema<'SearchAssetsQuery'>;
  export type UpdateAssetRequest = ApiComponents['schemas']['UpdateAssetRequest'];

  // 版本管理 + 审计 + 权限（versioning_v54）
  export type VersionSnapshot = SafeSchema<'VersionSnapshot'>;
  export type VersionDiff = SafeSchema<'VersionDiff'>;
  export type BranchType = SafeSchema<'BranchType'>;
  export type VersionBranch = SafeSchema<'VersionBranch'>;
  export type AuditEventType = SafeSchema<'AuditEventType'>;
  export type AuditEventCategory = SafeSchema<'AuditEventCategory'>;
  export type AuditEvent = SafeSchema<'AuditEvent'>;
  export type AuditExportLog = SafeSchema<'AuditExportLog'>;
  export type PermissionAction = SafeSchema<'PermissionAction'>;
  export type DataPermission = SafeSchema<'DataPermission'>;
  export type PermissionRole = SafeSchema<'PermissionRole'>;
  export type UserRoleAssignment = SafeSchema<'UserRoleAssignment'>;
  export type CreateSnapshotRequest = SafeSchema<'CreateSnapshotRequest'>;
  export type VersionQuery = SafeSchema<'VersionQuery'>;
  export type VersionDiffQuery = SafeSchema<'VersionDiffQuery'>;
  export type RestoreVersionRequest = SafeSchema<'RestoreVersionRequest'>;
  export type VersionHistoryQuery = SafeSchema<'VersionHistoryQuery'>;
  export type CreateBranchRequest = SafeSchema<'CreateBranchRequest'>;
  export type MergeBranchRequest = SafeSchema<'MergeBranchRequest'>;
  export type CherryPickRequest = SafeSchema<'CherryPickRequest'>;
  export type AuditLogQuery = ApiComponents['schemas']['AuditLogQuery'];
  export type UserActivityQuery = SafeSchema<'UserActivityQuery'>;
  export type EntityHistoryQuery = SafeSchema<'EntityHistoryQuery'>;
  export type ExportAuditLogRequest = SafeSchema<'ExportAuditLogRequest'>;
  export type ComplianceAuditQuery = SafeSchema<'ComplianceAuditQuery'>;
  export type GrantPermissionRequest = SafeSchema<'GrantPermissionRequest'>;
  export type RevokePermissionRequest = SafeSchema<'RevokePermissionRequest'>;
  export type CheckPermissionQuery = SafeSchema<'CheckPermissionQuery'>;
  export type UserPermissionsQuery = SafeSchema<'UserPermissionsQuery'>;
  export type ResourcePermissionsQuery = SafeSchema<'ResourcePermissionsQuery'>;
  export type CreateRoleRequest = SafeSchema<'CreateRoleRequest'>;
  export type AssignRoleRequest = SafeSchema<'AssignRoleRequest'>;
  export type RevokeRoleRequest = SafeSchema<'RevokeRoleRequest'>;

  // TODO: 待补充模块（V55-V60）：commercial, disaster, semantic, governance,
  // ai_governance, metadata
}

// ============================================================================
// QMS 模块类型
// ============================================================================

export namespace QmsTypes {
  // 质量标准
  export type QualityStandard = ApiComponents['schemas']['QualityStandard'];
  export type StandardRevision = ApiComponents['schemas']['StandardRevision'];
  export type ListStandardsResponse = ApiComponents['schemas']['ListStandardsResponse'];
  export type CreateStandardRequest = ApiComponents['schemas']['CreateStandardRequest'];
  export type UpdateStandardRequest = ApiComponents['schemas']['UpdateStandardRequest'];

  // 质量检验
  export type Inspection = ApiComponents['schemas']['Inspection'];
  export type InspectionAudit = ApiComponents['schemas']['InspectionAudit'];
  export type InspectionResultItem = ApiComponents['schemas']['InspectionResultItem'];
  export type ListInspectionsResponse = ApiComponents['schemas']['ListInspectionsResponse'];
  export type CreateInspectionRequest = ApiComponents['schemas']['CreateInspectionRequest'];
  export type UpdateInspectionRequest = ApiComponents['schemas']['UpdateInspectionRequest'];
  export type AssignInspectionRequest = ApiComponents['schemas']['AssignInspectionRequest'];
  export type SubmitInspectionResultRequest = ApiComponents['schemas']['SubmitInspectionResultRequest'];
  export type AuditInspectionRequest = ApiComponents['schemas']['AuditInspectionRequest'];

  // 质量问题
  export type QualityIssue = ApiComponents['schemas']['QualityIssue'];
  export type QualityIssueWithWorkflow = ApiComponents['schemas']['QualityIssueWithWorkflow'];
  export type CreateIssueRequest = ApiComponents['schemas']['CreateIssueRequest'];
  export type UpdateIssueRequest = ApiComponents['schemas']['UpdateIssueRequest'];

  // 质量成本（quality_cost）
  export type QualityCost = SafeSchema<'QualityCost'>;
  export type QualityCostQuery = SafeSchema<'QualityCostQuery'>;
  export type ListQualityCostsResponse = SafeSchema<'ListQualityCostsResponse'>;
  export type CreateQualityCostRequest = SafeSchema<'CreateQualityCostRequest'>;
  export type UpdateQualityCostRequest = SafeSchema<'UpdateQualityCostRequest'>;
  export type CostCategorySummary = SafeSchema<'CostCategorySummary'>;
  export type CostDepartmentSummary = SafeSchema<'CostDepartmentSummary'>;
  export type CostTrendItem = SafeSchema<'CostTrendItem'>;
  export type QualityCostStatistics = SafeSchema<'QualityCostStatistics'>;

  // TODO: 待补充模块：apqp, fmea, eight_d, corrective_action, spc, dashboard
  // @差异 手写类型区分 Backend/Frontend 两套命名（snake_case/camelCase）
}

// ============================================================================
// MES 模块类型
// ============================================================================

export namespace MesTypes {
  // 工单
  export type CreateWorkOrderRequest = ApiComponents['schemas']['CreateWorkOrderRequest'];
  export type UpdateWorkOrderRequest = ApiComponents['schemas']['UpdateWorkOrderRequest'];
  export type WorkOrderResponse = ApiComponents['schemas']['WorkOrderResponse'];

  // 生产报工
  export type CreateWorkReportRequest = ApiComponents['schemas']['CreateWorkReportRequest'];
  export type UpdateWorkReportRequest = ApiComponents['schemas']['UpdateWorkReportRequest'];
  export type WorkReportResponse = ApiComponents['schemas']['WorkReportResponse'];

  // 生产订单
  export type ErpSalesOrderInfo = ApiComponents['schemas']['ErpSalesOrderInfo'];
  export type CreateFromErpRequest = ApiComponents['schemas']['CreateFromErpRequest'];
  export type CreateProductionOrderRequest = ApiComponents['schemas']['CreateProductionOrderRequest'];
  export type UpdateProductionOrderRequest = ApiComponents['schemas']['UpdateProductionOrderRequest'];
  export type ProductionOrderResponse = ApiComponents['schemas']['ProductionOrderResponse'];

  // 设备管理（equipment）
  export type EquipmentResponse = SafeSchema<'EquipmentResponse'>;
  export type ListEquipmentResponse = SafeSchema<'ListEquipmentResponse'>;
  export type CreateEquipmentRequest = SafeSchema<'CreateEquipmentRequest'>;
  export type UpdateEquipmentRequest = SafeSchema<'UpdateEquipmentRequest'>;
  export type MaintenanceRecord = SafeSchema<'MaintenanceRecord'>;
  export type CreateMaintenanceRecord = SafeSchema<'CreateMaintenanceRecord'>;
  export type UpdateMaintenanceStatus = SafeSchema<'UpdateMaintenanceStatus'>;

  // TODO: 待补充模块：process_flow, process_route, material_bom,
  // material_requirement, production_kanban, production_process, production_record,
  // production_scheduling, quality_management, quality_traceability, team, wip,
  // work_station, aps_scheduling, production_cost, energy_management, anomaly_detection
  // @实际差异：后端 schema 使用 snake_case（order_no, plan_start_date, planned_quantity,
  // actual_start_date, actual_end_date），前端手写类型混用两种命名，映射时需注意
}

// ============================================================================
// 通用响应类型
// ============================================================================

export namespace CommonTypes {
  export type SuccessResponse<T = unknown> = ApiResponse<T>;
  export type ErrorResponse = SharedErrorResponse;
  export type PaginatedResponse<T = unknown> = SharedPaginatedResponse<T>;
}
