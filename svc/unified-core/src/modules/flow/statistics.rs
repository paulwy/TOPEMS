use crate::AppState;
use axum::{extract::State, Json};
use topems_shared::ApiResponse;

use super::models::{MonthlyData, StatisticsResponse, WorkflowStat};

pub async fn get_statistics(
    State(state): State<AppState>,
) -> Json<ApiResponse<StatisticsResponse>> {
    let total_workflows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_workflows")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let active_workflows: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflows WHERE status = 'active'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let total_instances: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_instances")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let running_instances: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_instances WHERE status = 'pending'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let completed_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_workflow_instances WHERE status = 'completed'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let rejected_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_workflow_instances WHERE status = 'rejected'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let total_approvals: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let pending_approvals: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks WHERE status = 'pending'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let approved_approvals: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks WHERE status = 'completed'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let rejected_approvals: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks WHERE status = 'rejected'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let approval_rate = if total_approvals > 0 {
        (approved_approvals as f64 / total_approvals as f64) * 100.0
    } else {
        0.0
    };

    let rejection_rate = if total_approvals > 0 {
        (rejected_approvals as f64 / total_approvals as f64) * 100.0
    } else {
        0.0
    };

    let workflow_stats = sqlx::query_as::<_, WorkflowStat>(
        r#"SELECT 
            w.id::text AS workflow_id,
            w.name AS workflow_name,
            COUNT(i.id) AS instance_count,
            CASE 
                WHEN COUNT(i.id) > 0 
                THEN ROUND((COUNT(*) FILTER (WHERE i.status = 'completed')::numeric / COUNT(i.id)::numeric) * 100, 2)
                ELSE 0 
            END AS completion_rate,
            0.0 AS avg_duration
        FROM core_workflows w
        LEFT JOIN core_workflow_instances i ON i.workflow_id = w.id
        GROUP BY w.id, w.name
        ORDER BY instance_count DESC
        LIMIT 10"#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let monthly_data: Vec<MonthlyData> = Vec::new();

    Json(ApiResponse::success(
        StatisticsResponse {
            total_workflows,
            active_workflows,
            total_instances,
            running_instances,
            completed_instances,
            rejected_instances,
            total_approvals,
            pending_approvals,
            approved_approvals,
            rejected_approvals,
            avg_approval_time: 0.0,
            approval_rate,
            rejection_rate,
            workflow_stats,
            monthly_data,
        },
        "查询成功",
    ))
}
