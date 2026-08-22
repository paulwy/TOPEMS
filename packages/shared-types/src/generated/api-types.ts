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
  // 会计科目
  export type Account = ApiComponents['schemas']['Account'];
  export type AccountType = ApiComponents['schemas']['AccountType'];
  export type CreateAccountRequest = ApiComponents['schemas']['CreateAccountRequest'];

  // 凭证
  export type Voucher = ApiComponents['schemas']['Voucher'];
  export type VoucherType = ApiComponents['schemas']['VoucherType'];
  export type VoucherStatus = ApiComponents['schemas']['VoucherStatus'];
  export type VoucherLine = ApiComponents['schemas']['VoucherLine'];
  export type VoucherResponse = ApiComponents['schemas']['VoucherResponse'];
  export type CreateVoucherRequest = ApiComponents['schemas']['CreateVoucherRequest'];
  export type VoucherLineRequest = ApiComponents['schemas']['VoucherLineRequest'];

  // 账簿报表
  export type LedgerEntry = ApiComponents['schemas']['LedgerEntry'];
  export type TrialBalance = ApiComponents['schemas']['TrialBalance'];
  export type BalanceSheet = ApiComponents['schemas']['BalanceSheet'];
  export type BalanceItem = ApiComponents['schemas']['BalanceItem'];
  export type IncomeStatement = ApiComponents['schemas']['IncomeStatement'];
  export type IncomeItem = ApiComponents['schemas']['IncomeItem'];
  export type CashFlowStatement = ApiComponents['schemas']['CashFlowStatement'];
  export type CashFlowItem = ApiComponents['schemas']['CashFlowItem'];

  // 会计期间
  export type Period = ApiComponents['schemas']['Period'];
  export type PeriodStatus = ApiComponents['schemas']['PeriodStatus'];

  // 辅助核算
  export type AuxType = ApiComponents['schemas']['AuxType'];
  export type AuxiliaryAccount = ApiComponents['schemas']['AuxiliaryAccount'];

  // 付款管理
  export type Payment = ApiComponents['schemas']['Payment'];
  export type PaymentItem = ApiComponents['schemas']['PaymentItem'];
  export type PaymentResponse = ApiComponents['schemas']['PaymentResponse'];
  export type CreatePaymentRequest = ApiComponents['schemas']['CreatePaymentRequest'];
  export type PaymentItemRequest = ApiComponents['schemas']['PaymentItemRequest'];

  // TODO: 以下类型待后端补充 ToSchema 后生成
  // - AccountOpeningBalance, AccountBalance, VoucherTemplate*, VoucherQueryParams
  // - VoucherOperationResult, CounterpartyType, BankAccount, Customer, Supplier
  // - InvoiceStatus, SalesInvoice, PurchaseInvoice, CollectionRecord, PaymentRecord
  // - ReportQueryParams
}

// ============================================================================
// HRM 模块类型
// ============================================================================

export namespace HrmTypes {
  // 员工管理
  export type Employee = ApiComponents['schemas']['Employee'];
  // 部门管理
  export type Department = ApiComponents['schemas']['Department'];
  // 公司管理
  export type Company = ApiComponents['schemas']['Company'];
  // 合同管理
  export type Contract = ApiComponents['schemas']['Contract'];
  // 职位管理
  export type Position = ApiComponents['schemas']['Position'];

  // TODO: 以下类型待 OpenAPI 规范补充后生成
  // - CreateEmployeeRequest, UpdateEmployeeRequest
  // - CreateDepartmentRequest, UpdateDepartmentRequest
  // - CreateCompanyRequest, UpdateCompanyRequest
  // - AttendanceRecord, CreateAttendanceRequest, UpdateAttendanceRequest
  // - CreateContractRequest, UpdateContractRequest, ContractRenewal
  // - LeaveRequest, PayrollRecord, PerformanceReview, RecruitmentCandidate
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
  export type EdgeType = ApiComponents['schemas']['EdgeType'];
  export type LineageNode = ApiComponents['schemas']['LineageNode'];
  export type LineageEdge = ApiComponents['schemas']['LineageEdge'];
  export type LineageGraph = ApiComponents['schemas']['LineageGraph'];
  export type ChangeType = ApiComponents['schemas']['ChangeType'];
  export type ImpactAnalysisRequest = ApiComponents['schemas']['ImpactAnalysisRequest'];
  export type RiskLevel = ApiComponents['schemas']['RiskLevel'];
  export type AffectedNode = ApiComponents['schemas']['AffectedNode'];
  export type AffectedService = ApiComponents['schemas']['AffectedService'];
  export type ChainReaction = ApiComponents['schemas']['ChainReaction'];
  export type ImpactAnalysisResult = ApiComponents['schemas']['ImpactAnalysisResult'];
  export type ImpactSimulation = ApiComponents['schemas']['ImpactSimulation'];
  export type ChangeEvent = ApiComponents['schemas']['ChangeEvent'];
  export type PropagationAction = ApiComponents['schemas']['PropagationAction'];
  export type PropagationRule = ApiComponents['schemas']['PropagationRule'];
  export type PropagationLog = ApiComponents['schemas']['PropagationLog'];
  export type RegisterLineageRequest = ApiComponents['schemas']['RegisterLineageRequest'];
  export type LineageQuery = ApiComponents['schemas']['LineageQuery'];
  export type ExportQuery = ApiComponents['schemas']['ExportQuery'];
  export type DeleteLineageRequest = ApiComponents['schemas']['DeleteLineageRequest'];
  export type AnalyzeImpactRequest = ApiComponents['schemas']['AnalyzeImpactRequest'];
  export type SimulateChangeRequest = ApiComponents['schemas']['SimulateChangeRequest'];
  export type AffectedScopeQuery = ApiComponents['schemas']['AffectedScopeQuery'];
  export type PropagateChangeRequest = ApiComponents['schemas']['PropagateChangeRequest'];
  export type AddPropagationRuleRequest = ApiComponents['schemas']['AddPropagationRuleRequest'];
  export type PropagationLogQuery = ApiComponents['schemas']['PropagationLogQuery'];
  export type RollbackPropagationRequest = ApiComponents['schemas']['RollbackPropagationRequest'];

  // 知识图谱 + 推荐系统（knowledge_v53）
  export type KGNodeType = ApiComponents['schemas']['KGNodeType'];
  export type KGNode = ApiComponents['schemas']['KGNode'];
  export type KGRelationType = ApiComponents['schemas']['KGRelationType'];
  export type KGEdge = ApiComponents['schemas']['KGEdge'];
  export type KnowledgeGraph = ApiComponents['schemas']['KnowledgeGraph'];
  export type RecommendationSource = ApiComponents['schemas']['RecommendationSource'];
  export type Recommendation = ApiComponents['schemas']['Recommendation'];
  export type InteractionRecord = ApiComponents['schemas']['InteractionRecord'];
  export type AssetType = ApiComponents['schemas']['AssetType'];
  export type DataAsset = ApiComponents['schemas']['DataAsset'];
  export type AssetCategory = ApiComponents['schemas']['AssetCategory'];
  export type AssetCatalog = ApiComponents['schemas']['AssetCatalog'];
  export type AssetStats = ApiComponents['schemas']['AssetStats'];
  export type AddKGNodeRequest = ApiComponents['schemas']['AddKGNodeRequest'];
  export type AddKGEdgeRequest = ApiComponents['schemas']['AddKGEdgeRequest'];
  export type SubgraphQuery = ApiComponents['schemas']['SubgraphQuery'];
  export type PathQuery = ApiComponents['schemas']['PathQuery'];
  export type SimilarQuery = ApiComponents['schemas']['SimilarQuery'];
  export type ExportKGQuery = ApiComponents['schemas']['ExportKGQuery'];
  export type RecommendationQuery = ApiComponents['schemas']['RecommendationQuery'];
  export type RecordInteractionRequest = ApiComponents['schemas']['RecordInteractionRequest'];
  export type SimilarItemsQuery = ApiComponents['schemas']['SimilarItemsQuery'];
  export type TrendingQuery = ApiComponents['schemas']['TrendingQuery'];
  export type RegisterAssetRequest = ApiComponents['schemas']['RegisterAssetRequest'];
  export type SearchAssetsQuery = ApiComponents['schemas']['SearchAssetsQuery'];
  export type UpdateAssetRequest = ApiComponents['schemas']['UpdateAssetRequest'];

  // 版本管理 + 审计 + 权限（versioning_v54）
  export type VersionSnapshot = ApiComponents['schemas']['VersionSnapshot'];
  export type VersionDiff = ApiComponents['schemas']['VersionDiff'];
  export type BranchType = ApiComponents['schemas']['BranchType'];
  export type VersionBranch = ApiComponents['schemas']['VersionBranch'];
  export type AuditEventType = ApiComponents['schemas']['AuditEventType'];
  export type AuditEventCategory = ApiComponents['schemas']['AuditEventCategory'];
  export type AuditEvent = ApiComponents['schemas']['AuditEvent'];
  export type AuditExportLog = ApiComponents['schemas']['AuditExportLog'];
  export type PermissionAction = ApiComponents['schemas']['PermissionAction'];
  export type DataPermission = ApiComponents['schemas']['DataPermission'];
  export type PermissionRole = ApiComponents['schemas']['PermissionRole'];
  export type UserRoleAssignment = ApiComponents['schemas']['UserRoleAssignment'];
  export type CreateSnapshotRequest = ApiComponents['schemas']['CreateSnapshotRequest'];
  export type VersionQuery = ApiComponents['schemas']['VersionQuery'];
  export type VersionDiffQuery = ApiComponents['schemas']['VersionDiffQuery'];
  export type RestoreVersionRequest = ApiComponents['schemas']['RestoreVersionRequest'];
  export type VersionHistoryQuery = ApiComponents['schemas']['VersionHistoryQuery'];
  export type CreateBranchRequest = ApiComponents['schemas']['CreateBranchRequest'];
  export type MergeBranchRequest = ApiComponents['schemas']['MergeBranchRequest'];
  export type CherryPickRequest = ApiComponents['schemas']['CherryPickRequest'];
  export type AuditLogQuery = ApiComponents['schemas']['AuditLogQuery'];
  export type UserActivityQuery = ApiComponents['schemas']['UserActivityQuery'];
  export type EntityHistoryQuery = ApiComponents['schemas']['EntityHistoryQuery'];
  export type ExportAuditLogRequest = ApiComponents['schemas']['ExportAuditLogRequest'];
  export type ComplianceAuditQuery = ApiComponents['schemas']['ComplianceAuditQuery'];
  export type GrantPermissionRequest = ApiComponents['schemas']['GrantPermissionRequest'];
  export type RevokePermissionRequest = ApiComponents['schemas']['RevokePermissionRequest'];
  export type CheckPermissionQuery = ApiComponents['schemas']['CheckPermissionQuery'];
  export type UserPermissionsQuery = ApiComponents['schemas']['UserPermissionsQuery'];
  export type ResourcePermissionsQuery = ApiComponents['schemas']['ResourcePermissionsQuery'];
  export type CreateRoleRequest = ApiComponents['schemas']['CreateRoleRequest'];
  export type AssignRoleRequest = ApiComponents['schemas']['AssignRoleRequest'];
  export type RevokeRoleRequest = ApiComponents['schemas']['RevokeRoleRequest'];

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
  export type QualityCost = ApiComponents['schemas']['QualityCost'];
  export type QualityCostQuery = ApiComponents['schemas']['QualityCostQuery'];
  export type ListQualityCostsResponse = ApiComponents['schemas']['ListQualityCostsResponse'];
  export type CreateQualityCostRequest = ApiComponents['schemas']['CreateQualityCostRequest'];
  export type UpdateQualityCostRequest = ApiComponents['schemas']['UpdateQualityCostRequest'];
  export type CostCategorySummary = ApiComponents['schemas']['CostCategorySummary'];
  export type CostDepartmentSummary = ApiComponents['schemas']['CostDepartmentSummary'];
  export type CostTrendItem = ApiComponents['schemas']['CostTrendItem'];
  export type QualityCostStatistics = ApiComponents['schemas']['QualityCostStatistics'];

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
  export type EquipmentResponse = ApiComponents['schemas']['EquipmentResponse'];
  export type ListEquipmentResponse = ApiComponents['schemas']['ListEquipmentResponse'];
  export type CreateEquipmentRequest = ApiComponents['schemas']['CreateEquipmentRequest'];
  export type UpdateEquipmentRequest = ApiComponents['schemas']['UpdateEquipmentRequest'];
  export type MaintenanceRecord = ApiComponents['schemas']['MaintenanceRecord'];
  export type CreateMaintenanceRecord = ApiComponents['schemas']['CreateMaintenanceRecord'];
  export type UpdateMaintenanceStatus = ApiComponents['schemas']['UpdateMaintenanceStatus'];

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
