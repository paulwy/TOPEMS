//! Settlement Center - 统一结算对账中心数据模型
//!
//! 聚合 erp.fin_reconciliations 与 pm.settlements 数据，
//! 并提供关联、差异调整、仪表盘等统一视图层模型。

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ============================================================
// 统一对账视图模型（聚合自 erp.fin_reconciliations）
// ============================================================

/// 统一对账视图（聚合自 erp.fin_reconciliations）
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UnifiedReconciliation {
    pub id: Uuid,
    pub recon_code: Option<String>,
    pub recon_name: String,
    pub recon_type: String,
    pub status: String,
    pub period: String,
    pub entity_id: Option<Uuid>,
    pub entity_type: Option<String>,
    pub total_debit: Option<Decimal>,
    pub total_credit: Option<Decimal>,
    pub difference: Option<Decimal>,
    pub matched_count: Option<i32>,
    pub unmatched_count: Option<i32>,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 对账详情（含关联结算列表）
#[derive(Debug, Serialize, Deserialize)]
pub struct ReconciliationDetail {
    #[serde(flatten)]
    pub reconciliation: UnifiedReconciliation,
    pub linked_settlements: Vec<LinkedSettlementSummary>,
}

/// 关联结算摘要
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct LinkedSettlementSummary {
    pub link_id: Uuid,
    pub link_type: String,
    pub link_amount: Option<Decimal>,
    pub link_status: String,
    pub settlement_id: Uuid,
    pub settlement_code: Option<String>,
    pub settlement_name: String,
    pub settlement_type: String,
    pub settlement_status: String,
    pub settlement_amount: Option<Decimal>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReconciliationRequest {
    pub recon_code: Option<String>,
    pub recon_name: String,
    pub recon_type: String,
    pub period: String,
    pub entity_id: Option<Uuid>,
    pub entity_type: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReconcileRequest {
    pub record_ids: Vec<Uuid>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AutoReconcileRequest {
    pub entity_id: Option<Uuid>,
    pub period: String,
    pub recon_type: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ReconciliationListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub recon_type: Option<String>,
    pub period: Option<String>,
    pub search: Option<String>,
}

// ============================================================
// 统一结算视图模型（聚合自 pm.settlements）
// ============================================================

/// 统一结算视图（聚合自 pm.settlements）
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UnifiedSettlement {
    pub id: Uuid,
    pub project_id: Uuid,
    pub settlement_code: Option<String>,
    pub settlement_name: String,
    pub settlement_type: String,
    pub status: String,
    pub budget_amount: Option<Decimal>,
    pub actual_amount: Option<Decimal>,
    pub variance_amount: Option<Decimal>,
    pub variance_percent: Option<Decimal>,
    pub settlement_period_start: Option<DateTime<Utc>>,
    pub settlement_period_end: Option<DateTime<Utc>>,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 结算详情（含关联对账列表）
#[derive(Debug, Serialize, Deserialize)]
pub struct SettlementDetail {
    #[serde(flatten)]
    pub settlement: UnifiedSettlement,
    pub linked_reconciliations: Vec<LinkedReconciliationSummary>,
}

/// 关联对账摘要
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct LinkedReconciliationSummary {
    pub link_id: Uuid,
    pub link_type: String,
    pub link_amount: Option<Decimal>,
    pub link_status: String,
    pub reconciliation_id: Uuid,
    pub recon_code: Option<String>,
    pub recon_name: String,
    pub recon_type: String,
    pub recon_status: String,
    pub recon_difference: Option<Decimal>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSettlementRequest {
    pub project_id: Uuid,
    pub settlement_code: Option<String>,
    pub settlement_name: String,
    pub settlement_type: String,
    pub settlement_period_start: Option<String>,
    pub settlement_period_end: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct SettlementListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub settlement_type: Option<String>,
    pub project_id: Option<Uuid>,
    pub search: Option<String>,
}

// ============================================================
// 对账-结算关联模型
// ============================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ReconciliationSettlementLink {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub reconciliation_id: Uuid,
    pub settlement_id: Uuid,
    pub link_type: String,
    pub amount: Option<Decimal>,
    pub status: String,
    pub remark: Option<String>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkRequest {
    pub reconciliation_id: Uuid,
    pub settlement_id: Uuid,
    pub link_type: String,
    pub amount: Option<Decimal>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct LinkListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub reconciliation_id: Option<Uuid>,
    pub settlement_id: Option<Uuid>,
    pub link_type: Option<String>,
    pub status: Option<String>,
}

// ============================================================
// 差异调整模型
// ============================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DifferenceAdjustment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub source_type: String,
    pub source_id: Uuid,
    pub difference_type: String,
    pub difference_amount: Decimal,
    pub reason: String,
    pub adjustment_amount: Option<Decimal>,
    pub adjustment_type: Option<String>,
    pub status: String,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDifferenceRequest {
    pub source_type: String,
    pub source_id: Uuid,
    pub difference_type: String,
    pub difference_amount: Decimal,
    pub reason: String,
    pub adjustment_amount: Option<Decimal>,
    pub adjustment_type: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct DifferenceListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub source_type: Option<String>,
    pub source_id: Option<Uuid>,
    pub difference_type: Option<String>,
    pub status: Option<String>,
}

// ============================================================
// 仪表盘与统计模型
// ============================================================

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SettlementCenterDashboard {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub config: serde_json::Value,
    pub is_active: bool,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CenterStatistics {
    pub reconciliation: ReconciliationStatistics,
    pub settlement: SettlementStatistics,
    pub difference: DifferenceStatistics,
    pub link: LinkStatistics,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ReconciliationStatistics {
    pub total_count: i64,
    pub pending_count: i64,
    pub approved_count: i64,
    pub total_debit: Decimal,
    pub total_credit: Decimal,
    pub total_difference: Decimal,
    pub matched_count: i64,
    pub unmatched_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SettlementStatistics {
    pub total_count: i64,
    pub draft_count: i64,
    pub pending_count: i64,
    pub approved_count: i64,
    pub total_budget: Decimal,
    pub total_actual: Decimal,
    pub total_variance: Decimal,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct DifferenceStatistics {
    pub total_count: i64,
    pub pending_count: i64,
    pub approved_count: i64,
    pub rejected_count: i64,
    pub total_difference_amount: Decimal,
    pub total_adjustment_amount: Decimal,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct LinkStatistics {
    pub total_count: i64,
    pub active_count: i64,
    pub cancelled_count: i64,
    pub total_amount: Decimal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub statistics: CenterStatistics,
    pub recent_reconciliations: Vec<UnifiedReconciliation>,
    pub recent_settlements: Vec<UnifiedSettlement>,
    pub pending_differences: Vec<DifferenceAdjustment>,
}
