/**
 * QMS 模块全量 DTO 定义 — 单一事实源 (Single Source of Truth)
 *
 * 本文件定义 QMS 10 实体的完整 DTO（Data Transfer Object）：
 * - Response DTO：完整实体（含 id/tenant_id/created_at/updated_at）
 * - Request DTO：创建请求（不含 id/时间戳）
 * - Update DTO：更新请求（所有字段可选）
 *
 * 字段命名规则：snake_case（与后端 Rust svc/qms Schema 一致）
 * 字段类型规则：
 *   - id / tenant_id / created_at / updated_at 为 string
 *   - 可空字段用 `string | null` 或 `number | null`
 *   - 数量字段为 number
 *   - 日期字段为 string（ISO 8601）
 *
 * 10 实体清单：
 *   E-1  QualityStandard（+ StandardRevision）
 *   E-2  QualityInspection（+ InspectionResultItem + InspectionAudit）
 *   E-3  QualityIssue
 *   E-4  CorrectiveAction（+ ActionItem）
 *   E-5  AuditPlan + AuditTask + AuditFinding
 *   E-6  SpcChart + SpcDataPoint + ControlLimitsResult
 *   E-7  QualityCost + QualityCostStatistics
 *   E-8  EightDReport + EightDAuditLog
 *   E-9  FmeaAnalysis + FmeaItem + FmeaStatistics
 *   E-10 ApqpProject + ApqpPhase + ApqpTask + ApqpRisk + ApqpApproval
 */

// ============================================================================
// FSM 状态枚举常量（7 个有限状态机）
// ============================================================================

// ============================================================================
// E-1 QualityStandard（+ StandardRevision）
// ============================================================================

// ============================================================================
// E-2 QualityInspection（+ InspectionResultItem + InspectionAudit）
// ============================================================================

// ============================================================================
// E-3 QualityIssue
// ============================================================================

// ============================================================================
// E-4 CorrectiveAction（+ ActionItem）
// ============================================================================

// ============================================================================
// E-5 AuditPlan + AuditTask + AuditFinding
// ============================================================================

// ============================================================================
// E-6 SpcChart + SpcDataPoint + ControlLimitsResult
// ============================================================================

// ============================================================================
// E-7 QualityCost + QualityCostStatistics
// ============================================================================

// ============================================================================
// E-8 EightDReport + EightDAuditLog
// ============================================================================

// ============================================================================
// E-9 FmeaAnalysis + FmeaItem + FmeaStatistics
// ============================================================================

// ============================================================================
// E-10 ApqpProject + ApqpPhase + ApqpTask + ApqpRisk + ApqpApproval
// ============================================================================

// ============================================================================
// 审批 DTO（通用 ApprovalRequest / ApprovalResponse）
// ============================================================================

export type ApprovalAction = 'approve' | 'reject' | 'rework' | 'cancel';

export type ApprovalEntityType =
  | 'inspection'
  | 'issue'
  | 'corrective_action'
  | 'audit_plan'
  | 'audit_finding'
  | 'eight_d_report'
  | 'apqp_project'
  | 'apqp_approval';

// ============================================================================
// BI 聚合类型（QualityOverview / QualityTrendItem / DefectDistribution）
// ============================================================================
