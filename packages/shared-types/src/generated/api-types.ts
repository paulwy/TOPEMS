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

  // TODO: 待补充模块（V52-V60）：lineage, knowledge, versioning, commercial,
  // disaster, semantic, governance, ai_governance, metadata
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

  // TODO: 待补充模块：quality_cost, apqp, fmea, eight_d, corrective_action, spc, dashboard
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

  // TODO: 待补充模块：equipment, process_flow, process_route, material_bom,
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
