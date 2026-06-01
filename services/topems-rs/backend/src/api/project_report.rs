use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPool, FromRow, Row};
use std::sync::Arc;
use uuid::Uuid;

use topems_shared::response::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub total_projects: i64,
    pub active_projects: i64,
    pub completed_projects: i64,
    pub delayed_projects: i64,
    pub total_budget: f64,
    pub total_actual_cost: f64,
    pub avg_progress: f64,
    pub total_members: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendData {
    pub date: String,
    pub project_count: i64,
    pub completed_count: i64,
    pub avg_progress: f64,
    pub total_budget: f64,
    pub total_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectTypeStats {
    pub project_type: String,
    pub count: i64,
    pub total_budget: f64,
    pub avg_progress: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub on_time_delivery_rate: f64,
    pub budget_adherence_rate: f64,
    pub avg_completion_time_days: f64,
    pub resource_utilization_rate: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReportQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub project_type: Option<String>,
}

pub async fn create_routes(db: PgPool) -> topems_shared::Result<Router> {
    let state = Arc::new(AppState { db });

    let router = Router::new()
        .route("/api/v1/reports/projects/summary", get(get_project_summary))
        .route("/api/v1/reports/projects/trends", get(get_project_trends))
        .route("/api/v1/reports/projects/types", get(get_project_type_stats))
        .route("/api/v1/reports/projects/performance", get(get_performance_metrics))
        .route("/api/v1/reports/projects/{id}/details", get(get_project_detail_report))
        .with_state(state);

    Ok(router)
}

pub async fn get_project_summary(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ReportQuery>,
) -> Json<ApiResponse<ProjectSummary>> {
    let start_date = query.start_date.clone().unwrap_or_else(|| {
        (Utc::now() - Duration::days(30)).format("%Y-%m-%d").to_string()
    });
    let end_date = query.end_date.clone().unwrap_or_else(|| {
        Utc::now().format("%Y-%m-%d").to_string()
    });

    let result = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_projects,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
            SUM(CASE WHEN status = 'delayed' OR (end_date < NOW() AND status != 'completed') THEN 1 ELSE 0 END) as delayed_projects,
            COALESCE(SUM(budget), 0) as total_budget,
            COALESCE(SUM(actual_cost), 0) as total_actual_cost,
            COALESCE(AVG(progress), 0) as avg_progress
        FROM rs.projects
        WHERE created_at >= $1 AND created_at <= $2
        "#
    )
    .bind(format!("{} 00:00:00", start_date))
    .bind(format!("{} 23:59:59", end_date))
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let member_count: i64 = sqlx::query(
                r#"
                SELECT COUNT(DISTINCT employee_id) as total_members
                FROM rs.project_members
                WHERE status = 'active'
                "#
            )
            .fetch_one(&state.db)
            .await
            .map(|r| r.get("total_members"))
            .unwrap_or(0);

            let summary = ProjectSummary {
                total_projects: row.get("total_projects"),
                active_projects: row.get("active_projects"),
                completed_projects: row.get("completed_projects"),
                delayed_projects: row.get("delayed_projects"),
                total_budget: row.get::<Option<i64>, _>("total_budget").unwrap_or(0) as f64,
                total_actual_cost: row.get::<Option<i64>, _>("total_actual_cost").unwrap_or(0) as f64,
                avg_progress: row.get::<Option<f64>, _>("avg_progress").unwrap_or(0.0),
                total_members: member_count,
            };

            Json(ApiResponse::success(summary, "获取项目汇总成功"))
        }
        Err(e) => {
            tracing::error!("获取项目汇总失败: {}", e);
            Json(ApiResponse::error(500, "获取项目汇总失败"))
        }
    }
}

pub async fn get_project_trends(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ReportQuery>,
) -> Json<ApiResponse<Vec<TrendData>>> {
    let start_date = query.start_date.clone().unwrap_or_else(|| {
        (Utc::now() - Duration::days(90)).format("%Y-%m-%d").to_string()
    });

    let result = sqlx::query(
        r#"
        SELECT 
            DATE_TRUNC('week', created_at) as period,
            COUNT(*) as project_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
            COALESCE(AVG(progress), 0) as avg_progress,
            COALESCE(SUM(budget), 0) as total_budget,
            COALESCE(SUM(actual_cost), 0) as total_cost
        FROM rs.projects
        WHERE created_at >= $1
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY period ASC
        "#
    )
    .bind(format!("{} 00:00:00", start_date))
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let trends: Vec<TrendData> = rows
                .into_iter()
                .map(|row| TrendData {
                    date: row.get::<Option<DateTime<Utc>>, _>("period")
                        .map(|p| p.format("%Y-%m-%d").to_string())
                        .unwrap_or_default(),
                    project_count: row.get("project_count"),
                    completed_count: row.get("completed_count"),
                    avg_progress: row.get::<Option<f64>, _>("avg_progress").unwrap_or(0.0),
                    total_budget: row.get::<Option<i64>, _>("total_budget").unwrap_or(0) as f64,
                    total_cost: row.get::<Option<i64>, _>("total_cost").unwrap_or(0) as f64,
                })
                .collect();

            Json(ApiResponse::success(trends, "获取项目趋势成功"))
        }
        Err(e) => {
            tracing::error!("获取项目趋势失败: {}", e);
            Json(ApiResponse::error(500, "获取项目趋势失败"))
        }
    }
}

pub async fn get_project_type_stats(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<Vec<ProjectTypeStats>>> {
    let result = sqlx::query(
        r#"
        SELECT 
            project_type,
            COUNT(*) as count,
            COALESCE(SUM(budget), 0) as total_budget,
            COALESCE(AVG(progress), 0) as avg_progress
        FROM rs.projects
        GROUP BY project_type
        ORDER BY count DESC
        "#
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let stats: Vec<ProjectTypeStats> = rows
                .into_iter()
                .map(|row| ProjectTypeStats {
                    project_type: row.get("project_type"),
                    count: row.get("count"),
                    total_budget: row.get::<Option<i64>, _>("total_budget").unwrap_or(0) as f64,
                    avg_progress: row.get::<Option<f64>, _>("avg_progress").unwrap_or(0.0),
                })
                .collect();

            Json(ApiResponse::success(stats, "获取项目类型统计成功"))
        }
        Err(e) => {
            tracing::error!("获取项目类型统计失败: {}", e);
            Json(ApiResponse::error(500, "获取项目类型统计失败"))
        }
    }
}

pub async fn get_performance_metrics(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<PerformanceMetrics>> {
    let on_time_result = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN actual_end_date <= end_date THEN 1 ELSE 0 END) as on_time
        FROM rs.projects
        WHERE status = 'completed' AND end_date IS NOT NULL
        "#
    )
    .fetch_one(&state.db)
    .await;

    let budget_result = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN actual_cost <= budget THEN 1 ELSE 0 END) as on_budget
        FROM rs.projects
        WHERE status = 'completed' AND budget IS NOT NULL AND actual_cost IS NOT NULL
        "#
    )
    .fetch_one(&state.db)
    .await;

    let duration_result = sqlx::query(
        r#"
        SELECT COALESCE(AVG(EXTRACT(DAY FROM (actual_end_date - start_date))), 0) as avg_days
        FROM rs.projects
        WHERE status = 'completed' AND start_date IS NOT NULL
        "#
    )
    .fetch_one(&state.db)
    .await;

    let utilization_result = sqlx::query(
        r#"
        SELECT 
            COALESCE(AVG(allocation), 0) as avg_allocation,
            COUNT(*) as total_members
        FROM rs.project_members
        WHERE status = 'active'
        "#
    )
    .fetch_one(&state.db)
    .await;

    match (on_time_result, budget_result, duration_result, utilization_result) {
        (Ok(on_time), Ok(budget), Ok(duration), Ok(utilization)) => {
            let total_on_time: i64 = on_time.get("total");
            let on_time_count: i64 = on_time.get("on_time");
            let on_time_rate = if total_on_time > 0 {
                (on_time_count as f64 / total_on_time as f64) * 100.0
            } else {
                0.0
            };

            let total_budget: i64 = budget.get("total");
            let on_budget_count: i64 = budget.get("on_budget");
            let budget_rate = if total_budget > 0 {
                (on_budget_count as f64 / total_budget as f64) * 100.0
            } else {
                0.0
            };

            let metrics = PerformanceMetrics {
                on_time_delivery_rate: on_time_rate,
                budget_adherence_rate: budget_rate,
                avg_completion_time_days: duration.get::<Option<f64>, _>("avg_days").unwrap_or(0.0),
                resource_utilization_rate: utilization.get::<Option<f64>, _>("avg_allocation").unwrap_or(0.0) * 100.0,
            };

            Json(ApiResponse::success(metrics, "获取绩效指标成功"))
        }
        _ => {
            Json(ApiResponse::error(500, "获取绩效指标失败"))
        }
    }
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ProjectDetailReport {
    pub id: Uuid,
    pub name: String,
    pub project_type: String,
    pub status: String,
    pub progress: i32,
    pub budget: Option<i64>,
    pub actual_cost: Option<i64>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub phase_count: i64,
    pub completed_phases: i64,
    pub milestone_count: i64,
    pub achieved_milestones: i64,
    pub member_count: i64,
    pub contract_count: i64,
    pub contract_total_amount: Option<i64>,
}

pub async fn get_project_detail_report(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectDetailReport>> {
    let project = sqlx::query_as::<_, ProjectDetailReport>(
        r#"
        SELECT 
            p.id, p.name, p.project_type, p.status, 
            COALESCE(p.progress, 0) as progress,
            p.budget, p.actual_cost, p.start_date, p.end_date,
            COALESCE((SELECT COUNT(*) FROM rs.project_phases WHERE project_id = p.id), 0) as phase_count,
            COALESCE((SELECT SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) FROM rs.project_phases WHERE project_id = p.id), 0) as completed_phases,
            COALESCE((SELECT COUNT(*) FROM rs.project_milestones WHERE project_id = p.id), 0) as milestone_count,
            COALESCE((SELECT SUM(CASE WHEN status = 'achieved' THEN 1 ELSE 0 END) FROM rs.project_milestones WHERE project_id = p.id), 0) as achieved_milestones,
            COALESCE((SELECT COUNT(*) FROM rs.project_members WHERE project_id = p.id), 0) as member_count,
            0 as contract_count,
            0 as contract_total_amount
        FROM rs.projects p
        WHERE p.id = $1
        "#
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match project {
        Ok(Some(report)) => {
            Json(ApiResponse::success(report, "获取项目详情报告成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("获取项目详情报告失败: {}", e);
            Json(ApiResponse::error(500, "获取项目详情报告失败"))
        }
    }
}