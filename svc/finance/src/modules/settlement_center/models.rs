//! Settlement Center - 统一结算对账中心数据模型
//!
//! 聚合 erp.fin_reconciliations 与 pm.settlements 数据，
//! 并提供关联、差异调整、仪表盘等统一视图层模型。

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

// ============================================================
// 统一对账视图模型（聚合自 erp.fin_reconciliations）
// ============================================================

/// 统一对账视图（聚合自 erp.fin_reconciliations）
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ReconciliationDetail {
    #[serde(flatten)]
    pub reconciliation: UnifiedReconciliation,
    pub linked_settlements: Vec<LinkedSettlementSummary>,
}

/// 关联结算摘要
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReconcileRequest {
    pub record_ids: Vec<Uuid>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AutoReconcileRequest {
    pub entity_id: Option<Uuid>,
    pub period: String,
    pub recon_type: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
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
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SettlementDetail {
    #[serde(flatten)]
    pub settlement: UnifiedSettlement,
    pub linked_reconciliations: Vec<LinkedReconciliationSummary>,
}

/// 关联对账摘要
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateLinkRequest {
    pub reconciliation_id: Uuid,
    pub settlement_id: Uuid,
    pub link_type: String,
    pub amount: Option<Decimal>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, utoipa::IntoParams, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CenterStatistics {
    pub reconciliation: ReconciliationStatistics,
    pub settlement: SettlementStatistics,
    pub difference: DifferenceStatistics,
    pub link: LinkStatistics,
}

#[derive(Debug, Serialize, Deserialize, Default, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, Default, ToSchema)]
pub struct SettlementStatistics {
    pub total_count: i64,
    pub draft_count: i64,
    pub pending_count: i64,
    pub approved_count: i64,
    pub total_budget: Decimal,
    pub total_actual: Decimal,
    pub total_variance: Decimal,
}

#[derive(Debug, Serialize, Deserialize, Default, ToSchema)]
pub struct DifferenceStatistics {
    pub total_count: i64,
    pub pending_count: i64,
    pub approved_count: i64,
    pub rejected_count: i64,
    pub total_difference_amount: Decimal,
    pub total_adjustment_amount: Decimal,
}

#[derive(Debug, Serialize, Deserialize, Default, ToSchema)]
pub struct LinkStatistics {
    pub total_count: i64,
    pub active_count: i64,
    pub cancelled_count: i64,
    pub total_amount: Decimal,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DashboardSummary {
    pub statistics: CenterStatistics,
    pub recent_reconciliations: Vec<UnifiedReconciliation>,
    pub recent_settlements: Vec<UnifiedSettlement>,
    pub pending_differences: Vec<DifferenceAdjustment>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }
    fn now() -> DateTime<Utc> {
        Utc::now()
    }
    fn uuid() -> Uuid {
        Uuid::new_v4()
    }
    fn dec() -> Decimal {
        Decimal::from(0)
    }

    #[test]
    fn rt_unified_reconciliation() {
        roundtrip(&UnifiedReconciliation {
            id: uuid(),
            recon_code: None,
            recon_name: "x".into(),
            recon_type: "x".into(),
            status: "x".into(),
            period: "x".into(),
            entity_id: None,
            entity_type: None,
            total_debit: None,
            total_credit: None,
            difference: None,
            matched_count: None,
            unmatched_count: None,
            description: None,
            created_by: None,
            approved_by: None,
            approved_at: None,
            created_at: now(),
            updated_at: now(),
        });
    }
    #[test]
    fn rt_reconciliation_detail() {
        roundtrip(&ReconciliationDetail {
            reconciliation: UnifiedReconciliation {
                id: uuid(),
                recon_code: None,
                recon_name: "x".into(),
                recon_type: "x".into(),
                status: "x".into(),
                period: "x".into(),
                entity_id: None,
                entity_type: None,
                total_debit: None,
                total_credit: None,
                difference: None,
                matched_count: None,
                unmatched_count: None,
                description: None,
                created_by: None,
                approved_by: None,
                approved_at: None,
                created_at: now(),
                updated_at: now(),
            },
            linked_settlements: vec![],
        });
    }
    #[test]
    fn rt_linked_settlement_summary() {
        roundtrip(&LinkedSettlementSummary {
            link_id: uuid(),
            link_type: "x".into(),
            link_amount: None,
            link_status: "x".into(),
            settlement_id: uuid(),
            settlement_code: None,
            settlement_name: "x".into(),
            settlement_type: "x".into(),
            settlement_status: "x".into(),
            settlement_amount: None,
        });
    }
    #[test]
    fn rt_unified_settlement() {
        roundtrip(&UnifiedSettlement {
            id: uuid(),
            project_id: uuid(),
            settlement_code: None,
            settlement_name: "x".into(),
            settlement_type: "x".into(),
            status: "x".into(),
            budget_amount: None,
            actual_amount: None,
            variance_amount: None,
            variance_percent: None,
            settlement_period_start: None,
            settlement_period_end: None,
            description: None,
            created_by: None,
            approved_by: None,
            approved_at: None,
            created_at: now(),
            updated_at: now(),
        });
    }
    #[test]
    fn rt_settlement_detail() {
        roundtrip(&SettlementDetail {
            settlement: UnifiedSettlement {
                id: uuid(),
                project_id: uuid(),
                settlement_code: None,
                settlement_name: "x".into(),
                settlement_type: "x".into(),
                status: "x".into(),
                budget_amount: None,
                actual_amount: None,
                variance_amount: None,
                variance_percent: None,
                settlement_period_start: None,
                settlement_period_end: None,
                description: None,
                created_by: None,
                approved_by: None,
                approved_at: None,
                created_at: now(),
                updated_at: now(),
            },
            linked_reconciliations: vec![],
        });
    }
    #[test]
    fn rt_linked_reconciliation_summary() {
        roundtrip(&LinkedReconciliationSummary {
            link_id: uuid(),
            link_type: "x".into(),
            link_amount: None,
            link_status: "x".into(),
            reconciliation_id: uuid(),
            recon_code: None,
            recon_name: "x".into(),
            recon_type: "x".into(),
            recon_status: "x".into(),
            recon_difference: None,
        });
    }
    #[test]
    fn rt_reconciliation_settlement_link() {
        roundtrip(&ReconciliationSettlementLink {
            id: uuid(),
            tenant_id: uuid(),
            reconciliation_id: uuid(),
            settlement_id: uuid(),
            link_type: "x".into(),
            amount: None,
            status: "x".into(),
            remark: None,
            created_by: uuid(),
            created_at: now(),
            updated_at: now(),
        });
    }
    #[test]
    fn rt_difference_adjustment() {
        roundtrip(&DifferenceAdjustment {
            id: uuid(),
            tenant_id: uuid(),
            source_type: "x".into(),
            source_id: uuid(),
            difference_type: "x".into(),
            difference_amount: dec(),
            reason: "x".into(),
            adjustment_amount: None,
            adjustment_type: None,
            status: "x".into(),
            approved_by: None,
            approved_at: None,
            remark: None,
            created_by: uuid(),
            created_at: now(),
            updated_at: now(),
        });
    }
    #[test]
    fn rt_dashboard() {
        roundtrip(&SettlementCenterDashboard {
            id: uuid(),
            tenant_id: uuid(),
            name: "x".into(),
            config: serde_json::Value::Null,
            is_active: true,
            created_by: uuid(),
            created_at: now(),
            updated_at: now(),
        });
    }
    #[test]
    fn rt_center_statistics() {
        roundtrip(&CenterStatistics {
            reconciliation: ReconciliationStatistics::default(),
            settlement: SettlementStatistics::default(),
            difference: DifferenceStatistics::default(),
            link: LinkStatistics::default(),
        });
    }
    #[test]
    fn rt_reconciliation_statistics() {
        roundtrip(&ReconciliationStatistics::default());
    }
    #[test]
    fn rt_settlement_statistics() {
        roundtrip(&SettlementStatistics::default());
    }
    #[test]
    fn rt_difference_statistics() {
        roundtrip(&DifferenceStatistics::default());
    }
    #[test]
    fn rt_link_statistics() {
        roundtrip(&LinkStatistics::default());
    }
    #[test]
    fn rt_dashboard_summary() {
        roundtrip(&DashboardSummary {
            statistics: CenterStatistics {
                reconciliation: ReconciliationStatistics::default(),
                settlement: SettlementStatistics::default(),
                difference: DifferenceStatistics::default(),
                link: LinkStatistics::default(),
            },
            recent_reconciliations: vec![],
            recent_settlements: vec![],
            pending_differences: vec![],
        });
    }
}
