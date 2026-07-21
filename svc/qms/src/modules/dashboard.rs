//! Dashboard handlers

use axum::{extract::State, routing::get, Json, Router};
use bigdecimal::{BigDecimal, ToPrimitive};
use serde::Serialize;
use topems_shared::ApiResponse;

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_inspections: i64,
    pub pending_inspections: i64,
    pub completed_inspections: i64,
    pub qualified_rate: f64,
    pub total_issues: i64,
    pub open_issues: i64,
    pub resolved_issues: i64,
    pub pending_actions: i64,
    pub total_audit_plans: i64,
    pub in_progress_plans: i64,
}

pub async fn get_dashboard_stats(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<DashboardStats>> {
    // Total inspections
    let total_inspections: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_inspections")
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_inspections = total_inspections.unwrap_or(0);

    // Pending inspections
    let pending_inspections: Option<i64> = sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_inspections WHERE status = 'pending' OR status = 'in_progress' OR status = 'pending_audit'")
    .fetch_one(&state.pool)
    .await
    .ok();
    let pending_inspections = pending_inspections.unwrap_or(0);

    // Completed inspections
    let completed_inspections: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_quality_inspections WHERE status = 'completed'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let completed_inspections = completed_inspections.unwrap_or(0);

    // Qualification rate
    let qualified_rate: Option<BigDecimal> = sqlx::query_scalar::<_, _>(r#"SELECT COALESCE(AVG(qualification_rate), 0) FROM qa_quality_inspections WHERE status = 'completed'"#)
    .fetch_one(&state.pool)
    .await
    .ok();
    let qualified_rate: f64 = qualified_rate
        .map(|v| v.to_f64().unwrap_or(0.0))
        .unwrap_or(0.0);

    // Total issues
    let total_issues: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_issues")
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_issues = total_issues.unwrap_or(0);

    // Open issues
    let open_issues: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_quality_issues WHERE status = 'open'")
            .fetch_one(&state.pool)
            .await
            .ok();
    let open_issues = open_issues.unwrap_or(0);

    // Resolved issues
    let resolved_issues: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_quality_issues WHERE status = 'resolved'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let resolved_issues = resolved_issues.unwrap_or(0);

    // Pending actions
    let pending_actions: Option<i64> = sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_corrective_actions WHERE status = 'pending' OR status = 'in_progress'")
    .fetch_one(&state.pool)
    .await
    .ok();
    let pending_actions = pending_actions.unwrap_or(0);

    // Total audit plans
    let total_audit_plans: Option<i64> =
        sqlx::query_scalar::<_, _>("SELECT COUNT(*) FROM qa_audit_plans")
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_audit_plans = total_audit_plans.unwrap_or(0);

    // In progress audit plans
    let in_progress_plans: Option<i64> = sqlx::query_scalar::<_, _>(
        "SELECT COUNT(*) FROM qa_audit_plans WHERE status = 'in_progress'",
    )
    .fetch_one(&state.pool)
    .await
    .ok();
    let in_progress_plans = in_progress_plans.unwrap_or(0);

    let stats = DashboardStats {
        total_inspections,
        pending_inspections,
        completed_inspections,
        qualified_rate: (qualified_rate * 100.0).round() / 100.0,
        total_issues,
        open_issues,
        resolved_issues,
        pending_actions,
        total_audit_plans,
        in_progress_plans,
    };

    Json(ApiResponse::success(stats, "获取仪表盘统计成功"))
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new().route("/dashboard", get(get_dashboard_stats))
}
