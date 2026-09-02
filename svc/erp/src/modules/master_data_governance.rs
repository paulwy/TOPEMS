//! V40.0 AC-12: 主数据治理仪表盘
//!
//! 提供治理仪表盘统计数据，包括主数据总量、质量、冲突、版本、审计等指标。
//! 从 master_data_refs.rs 拆分。

use axum::extract::State;
use axum::Json;
use serde::Serialize;
use sqlx::Row;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;

use super::ApiState;

#[derive(Debug, Serialize)]
pub struct GovernanceDashboardStats {
    pub total_domains: u64,
    pub total_records: u64,
    pub active_records: u64,
    pub archived_records: u64,
    pub pending_destruction: u64,
    pub destroyed_records: u64,
    pub quality_rules_count: u64,
    pub quality_issues_count: u64,
    pub quality_score: f64,
    pub conflict_count: u64,
    pub unresolved_conflicts: u64,
    pub version_count: u64,
    pub audit_events_last_7d: u64,
    pub synced_services: Vec<String>,
    pub sync_coverage: f64,
}

/// V40.0 AC-12: 获取治理仪表盘统计数据
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/governance/dashboard",
    tag = "Master Data",
    operation_id = "get_governance_dashboard",
    responses((status = 200, description = "OK")),
)]
pub async fn get_governance_dashboard(
    State(state): State<ApiState>,
) -> Json<ApiResponse<GovernanceDashboardStats>> {
    let db = &state.db;

    let total_domains: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(DISTINCT domain) FROM erp.erp_master_data_refs WHERE status != 'destroyed'"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let total_records: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.erp_master_data_refs WHERE status != 'destroyed'"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let active_records: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.erp_master_data_refs WHERE status = 'active'"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let archived_records: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.erp_master_data_refs WHERE status = 'archived'"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let pending_destruction: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.erp_master_data_refs WHERE status = 'pending_destruction'"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let destroyed_records: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.erp_master_data_refs WHERE status = 'destroyed'"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let quality_rules_count: i64 = sqlx::query_scalar(
        only_own_schema_query!("erp", "SELECT COUNT(*) FROM erp_master_data_quality_rules WHERE deleted_at IS NULL AND is_active = TRUE"),
    )
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let latest_report = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT total_checked, total_issues, errors, warnings, info
           FROM erp_master_data_quality_reports
           ORDER BY generated_at DESC LIMIT 1"#
    ))
    .fetch_optional(db)
    .await
    .ok()
    .flatten();

    let (quality_issues_count, quality_score) = if let Some(row) = latest_report {
        let total_checked: i64 = row.try_get("total_checked").unwrap_or(0);
        let total_issues: i64 = row.try_get("total_issues").unwrap_or(0);
        let errors: i64 = row.try_get("errors").unwrap_or(0);
        let warnings: i64 = row.try_get("warnings").unwrap_or(0);
        let score = if total_checked > 0 {
            let weighted_issues = (errors * 3 + warnings) as f64;
            let max_possible = (total_checked * 3) as f64;
            ((1.0 - weighted_issues / max_possible.max(1.0)) * 100.0).max(0.0)
        } else {
            100.0
        };
        (total_issues as u64, score)
    } else {
        (0u64, 100.0f64)
    };

    let conflict_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp_master_data_conflicts"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let unresolved_conflicts: i64 = sqlx::query_scalar(
        only_own_schema_query!("erp", "SELECT COUNT(*) FROM erp_master_data_conflicts WHERE status IN ('detected', 'pending_review')"),
    )
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let version_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp_master_data_versions"
    ))
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let seven_days_ago = chrono::Utc::now() - chrono::Duration::days(7);
    let audit_events_last_7d: i64 = sqlx::query_scalar(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp_master_data_audit_trail WHERE created_at >= $1"
    ))
    .bind(seven_days_ago)
    .fetch_one(db)
    .await
    .unwrap_or(0);

    let synced_services_rows = sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "erp",
        "SELECT DISTINCT source_service FROM erp.erp_master_data_refs WHERE status != 'destroyed'"
    ))
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let all_services = ["erp", "crm", "hrm", "finance", "mes", "workflow"];
    let synced_set: std::collections::HashSet<_> =
        synced_services_rows.iter().map(|s| s.as_str()).collect();
    let sync_coverage = if all_services.is_empty() {
        0.0
    } else {
        (synced_set.len() as f64) / (all_services.len() as f64) * 100.0
    };

    Json(ApiResponse::success(
        GovernanceDashboardStats {
            total_domains: total_domains as u64,
            total_records: total_records as u64,
            active_records: active_records as u64,
            archived_records: archived_records as u64,
            pending_destruction: pending_destruction as u64,
            destroyed_records: destroyed_records as u64,
            quality_rules_count: quality_rules_count as u64,
            quality_issues_count,
            quality_score,
            conflict_count: conflict_count as u64,
            unresolved_conflicts: unresolved_conflicts as u64,
            version_count: version_count as u64,
            audit_events_last_7d: audit_events_last_7d as u64,
            synced_services: synced_services_rows,
            sync_coverage,
        },
        "治理仪表盘统计数据",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_governance_dashboard_stats_serialization() {
        let stats = GovernanceDashboardStats {
            total_domains: 10,
            total_records: 10000,
            active_records: 9500,
            archived_records: 400,
            pending_destruction: 50,
            destroyed_records: 50,
            quality_rules_count: 25,
            quality_issues_count: 100,
            quality_score: 95.5,
            conflict_count: 10,
            unresolved_conflicts: 3,
            version_count: 5000,
            audit_events_last_7d: 200,
            synced_services: vec!["crm".to_string(), "wms".to_string()],
            sync_coverage: 85.0,
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_domains"], 10);
        assert_eq!(json["total_records"], 10000);
        assert_eq!(json["active_records"], 9500);
        assert_eq!(json["archived_records"], 400);
        assert_eq!(json["pending_destruction"], 50);
        assert_eq!(json["destroyed_records"], 50);
        assert_eq!(json["quality_rules_count"], 25);
        assert_eq!(json["quality_issues_count"], 100);
        assert_eq!(json["quality_score"], 95.5);
        assert_eq!(json["conflict_count"], 10);
        assert_eq!(json["unresolved_conflicts"], 3);
        assert_eq!(json["version_count"], 5000);
        assert_eq!(json["audit_events_last_7d"], 200);
        assert_eq!(json["synced_services"][0], "crm");
        assert_eq!(json["synced_services"][1], "wms");
        assert_eq!(json["sync_coverage"], 85.0);
    }

    #[test]
    fn test_governance_dashboard_stats_empty() {
        let stats = GovernanceDashboardStats {
            total_domains: 0,
            total_records: 0,
            active_records: 0,
            archived_records: 0,
            pending_destruction: 0,
            destroyed_records: 0,
            quality_rules_count: 0,
            quality_issues_count: 0,
            quality_score: 0.0,
            conflict_count: 0,
            unresolved_conflicts: 0,
            version_count: 0,
            audit_events_last_7d: 0,
            synced_services: vec![],
            sync_coverage: 0.0,
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_domains"], 0);
        assert_eq!(json["total_records"], 0);
        assert_eq!(json["quality_score"], 0.0);
        assert!(json["synced_services"].as_array().unwrap().is_empty());
    }
}
