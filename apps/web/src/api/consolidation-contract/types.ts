/**
 * 合并报表 API 契约类型定义
 */

// 合并方法类型
export type ConsolidationMethod = 'full' | 'equity' | 'proportional';

// 合并范围状态
export type ScopeStatus = 'active' | 'inactive' | 'draft';

// 控制类型
export type ControlType = 'full_control' | 'joint_venture' | 'associate';

// 抵消规则类型
export type EliminationRuleType = string;

// 抵消方向
export type EliminationDirection = 'debit' | 'credit' | 'both';

// 抵消状态
export type EliminationStatus = 'pending' | 'eliminated' | 'partial' | 'not_applicable';

// 报表类型
export type ConsolidationReportType = string;

// 报表状态
export type ReportStatus = 'draft' | 'calculating' | 'completed' | 'published';

// 审批状态
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// 公司关系类型
export type CompanyRelationType = 'parent' | 'subsidiary' | 'associate' | 'joint_venture' | 'branch';

// 公司关系状态
export type CompanyRelationStatus = 'active' | 'inactive';
