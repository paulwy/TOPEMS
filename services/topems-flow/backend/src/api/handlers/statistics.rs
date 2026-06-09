use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct StatisticsResponse {
    pub total_workflows: i64,
    pub active_workflows: i64,
    pub total_instances: i64,
    pub running_instances: i64,
    pub completed_instances: i64,
    pub rejected_instances: i64,
    pub total_approvals: i64,
    pub pending_approvals: i64,
    pub approved_approvals: i64,
    pub rejected_approvals: i64,
    pub avg_approval_time: f64,
    pub approval_rate: f64,
    pub rejection_rate: f64,
    pub workflow_stats: Vec<WorkflowStat>,
    pub monthly_data: Vec<MonthlyData>,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct WorkflowStat {
    pub workflow_id: Uuid,
    pub workflow_name: String,
    pub instance_count: i64,
    pub completion_rate: f64,
    pub avg_duration: f64,
}

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct MonthlyData {
    pub month: String,
    pub instances_started: i64,
    pub instances_completed: i64,
    pub approvals_processed: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StatisticsQuery {
    pub time_range: Option<String>,
}

pub async fn get_statistics(
    State(state): State<AppState>,
) -> Json<StatisticsResponse> {
    let pool = state.repo.get_pool();

    let total_workflows = get_count(pool, "SELECT COUNT(*) as count FROM flow.workflows").await;
    let active_workflows = get_count(pool, "SELECT COUNT(*) as count FROM flow.workflows WHERE is_active = true").await;
    let total_instances = get_count(pool, "SELECT COUNT(*) as count FROM flow.workflow_instances").await;
    let running_instances = get_count_with_param(pool, "SELECT COUNT(*) as count FROM flow.workflow_instances WHERE status = $1", "running").await;
    let completed_instances = get_count_with_param(pool, "SELECT COUNT(*) as count FROM flow.workflow_instances WHERE status = $1", "completed").await;
    let rejected_instances = get_count_with_param(pool, "SELECT COUNT(*) as count FROM flow.workflow_instances WHERE status = $1", "rejected").await;
    let total_approvals = get_count(pool, "SELECT COUNT(*) as count FROM flow.approvals").await;
    let pending_approvals = get_count_with_param(pool, "SELECT COUNT(*) as count FROM flow.approvals WHERE status = $1", "pending").await;
    let approved_approvals = get_count_with_param(pool, "SELECT COUNT(*) as count FROM flow.approvals WHERE status = $1", "approved").await;
    let rejected_approvals = get_count_with_param(pool, "SELECT COUNT(*) as count FROM flow.approvals WHERE status = $1", "rejected").await;

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

    let avg_approval_time = get_avg_hours(pool).await;

    let workflow_stats: Vec<WorkflowStat> = sqlx::query_as(
        "SELECT 
            w.id as workflow_id,
            w.name as workflow_name,
            COUNT(i.id) as instance_count,
            AVG(CASE WHEN i.status = 'completed' THEN 100.0 ELSE 0.0 END) as completion_rate,
            AVG(EXTRACT(EPOCH FROM (i.completed_at - i.created_at))/3600) as avg_duration
        FROM flow.workflows w
        LEFT JOIN flow.workflow_instances i ON w.id = i.workflow_id
        GROUP BY w.id, w.name
        ORDER BY instance_count DESC
        LIMIT 10"
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    let monthly_data: Vec<MonthlyData> = sqlx::query_as(
        "SELECT 
            TO_CHAR(i.created_at, 'YYYY-MM') as month,
            COUNT(*) as instances_started,
            SUM(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as instances_completed,
            (SELECT COUNT(*) FROM flow.approvals a WHERE TO_CHAR(a.created_at, 'YYYY-MM') = TO_CHAR(i.created_at, 'YYYY-MM')) as approvals_processed
        FROM flow.workflow_instances i
        GROUP BY TO_CHAR(i.created_at, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12"
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    Json(StatisticsResponse {
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
        avg_approval_time: avg_approval_time.round() / 10.0 * 10.0,
        approval_rate: (approval_rate * 10.0).round() / 10.0,
        rejection_rate: (rejection_rate * 10.0).round() / 10.0,
        workflow_stats,
        monthly_data,
    })
}

async fn get_count(pool: &sqlx::PgPool, query: &str) -> i64 {
    #[derive(sqlx::FromRow)]
    struct CountRow {
        count: Option<i64>,
    }
    sqlx::query_as::<_, CountRow>(query)
        .fetch_one(pool)
        .await
        .map(|r| r.count.unwrap_or(0))
        .unwrap_or(0)
}

async fn get_count_with_param(pool: &sqlx::PgPool, query: &str, param: &str) -> i64 {
    #[derive(sqlx::FromRow)]
    struct CountRow {
        count: Option<i64>,
    }
    sqlx::query_as::<_, CountRow>(query)
        .bind(param)
        .fetch_one(pool)
        .await
        .map(|r| r.count.unwrap_or(0))
        .unwrap_or(0)
}

async fn get_avg_hours(pool: &sqlx::PgPool) -> f64 {
    #[derive(sqlx::FromRow)]
    struct AvgRow {
        avg_hours: Option<f64>,
    }
    sqlx::query_as::<_, AvgRow>(
        "SELECT AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_hours 
         FROM flow.approvals 
         WHERE approved_at IS NOT NULL"
    )
    .fetch_one(pool)
    .await
    .map(|r| r.avg_hours.unwrap_or(0.0))
    .unwrap_or(0.0)
}
