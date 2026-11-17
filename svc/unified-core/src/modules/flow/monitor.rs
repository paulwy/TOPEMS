use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_core::TopemsError;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::middleware::{BindTenantScope, TenantScope};
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_db::scope::ScopedTxn;

use super::instance::InstanceQueryParams;
use super::models::{ProcessLog, WorkflowInstance};

// ─── Query params ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, ToSchema)]
#[schema(as = MonitorLogQueryParams)]
pub struct LogQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub level: Option<String>,
    pub action: Option<String>,
    pub workflow_id: Option<String>,
    pub instance_id: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(as = MonitorStatsQueryParams)]
pub struct StatsQueryParams {
    pub workflow_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub group_by: Option<String>,
}

// ─── Response models ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MonitorStatistics {
    pub total_instances: i64,
    pub running_instances: i64,
    pub completed_instances: i64,
    pub rejected_instances: i64,
    pub suspended_instances: i64,
    pub error_instances: i64,
    pub avg_duration_seconds: f64,
    pub completion_rate: f64,
    pub by_status: Vec<StatusCount>,
    pub by_workflow: Vec<WorkflowCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct WorkflowCount {
    pub workflow_id: String,
    pub workflow_name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WorkflowAnalysis {
    pub workflow_id: String,
    pub workflow_name: String,
    pub total_instances: i64,
    pub completed_instances: i64,
    pub running_instances: i64,
    pub avg_duration_seconds: f64,
    pub completion_rate: f64,
    pub node_stats: Vec<NodeStat>,
    pub bottlenecks: Vec<Bottleneck>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct NodeStat {
    pub node_id: String,
    pub node_name: Option<String>,
    pub instance_count: i64,
    pub avg_duration_seconds: f64,
    pub error_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Bottleneck {
    pub node_id: String,
    pub node_name: Option<String>,
    pub avg_wait_seconds: f64,
    pub pending_count: i64,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EfficiencyAnalysis {
    pub total_instances: i64,
    pub avg_duration_seconds: f64,
    pub median_duration_seconds: f64,
    pub p95_duration_seconds: f64,
    pub completion_rate: f64,
    pub auto_approval_rate: f64,
    pub by_workflow: Vec<WorkflowEfficiency>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct WorkflowEfficiency {
    pub workflow_id: String,
    pub workflow_name: String,
    pub instance_count: i64,
    pub avg_duration_seconds: f64,
    pub completion_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct TrendData {
    pub date: NaiveDate,
    pub instances_started: i64,
    pub instances_completed: i64,
    pub avg_duration_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct UserWorkflowStat {
    pub user_id: String,
    pub user_name: Option<String>,
    pub initiated_count: i64,
    pub completed_count: i64,
    pub avg_duration_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct DepartmentWorkflowStat {
    pub department: String,
    pub instance_count: i64,
    pub avg_duration_seconds: f64,
    pub completion_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RealtimeStats {
    pub active_instances: i64,
    pub pending_tasks: i64,
    pub completed_today: i64,
    pub error_count: i64,
    pub avg_response_ms: f64,
    pub throughput_per_min: f64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MonitorDashboard {
    pub overview: MonitorStatistics,
    pub realtime: RealtimeStats,
    pub recent_instances: Vec<WorkflowInstance>,
    pub sla_summary: SlaSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PerformanceMetrics {
    pub total_instances: i64,
    pub avg_duration_seconds: f64,
    pub p50_duration_seconds: f64,
    pub p90_duration_seconds: f64,
    pub p99_duration_seconds: f64,
    pub throughput_per_day: f64,
    pub error_rate: f64,
    pub by_workflow: Vec<WorkflowPerformance>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct WorkflowPerformance {
    pub workflow_id: String,
    pub workflow_name: String,
    pub instance_count: i64,
    pub avg_duration_seconds: f64,
    pub error_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SlaSummary {
    pub total_instances: i64,
    pub sla_compliant: i64,
    pub sla_violated: i64,
    pub compliance_rate: f64,
    pub avg_overdue_minutes: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SlaCompliance {
    pub summary: SlaSummary,
    pub by_workflow: Vec<WorkflowSla>,
    pub by_status: Vec<StatusCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct WorkflowSla {
    pub workflow_id: String,
    pub workflow_name: String,
    pub total_instances: i64,
    pub compliant_count: i64,
    pub violated_count: i64,
    pub compliance_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkipNodeRequest {
    pub node_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForceActionRequest {
    pub reason: Option<String>,
}

// ─── Handlers: Instance lists by status ─────────────────────────────────────

/// GET /monitor/instances — delegate to list_instances
pub async fn list_monitor_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<InstanceQueryParams>,
) -> ApiResponse<PaginatedResponse<WorkflowInstance>> {
    super::instance::list_instances(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Query(params),
    )
    .await
}

/// GET /monitor/instances/running
pub async fn running_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<InstanceQueryParams>,
) -> ApiResponse<PaginatedResponse<WorkflowInstance>> {
    let mut params = params;
    params.status = Some("running".to_string());
    super::instance::list_instances(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Query(params),
    )
    .await
}

/// GET /monitor/instances/completed
pub async fn completed_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<InstanceQueryParams>,
) -> ApiResponse<PaginatedResponse<WorkflowInstance>> {
    let mut params = params;
    params.status = Some("completed".to_string());
    super::instance::list_instances(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Query(params),
    )
    .await
}

/// GET /monitor/instances/rejected
pub async fn rejected_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<InstanceQueryParams>,
) -> ApiResponse<PaginatedResponse<WorkflowInstance>> {
    let mut params = params;
    params.status = Some("rejected".to_string());
    super::instance::list_instances(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Query(params),
    )
    .await
}

/// GET /monitor/instances/suspended
pub async fn suspended_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<InstanceQueryParams>,
) -> ApiResponse<PaginatedResponse<WorkflowInstance>> {
    let mut params = params;
    params.status = Some("suspended".to_string());
    super::instance::list_instances(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Query(params),
    )
    .await
}

// ─── Handlers: Statistics ────────────────────────────────────────────────────

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// GET /monitor/statistics
pub async fn get_monitor_statistics(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_params): Query<StatsQueryParams>,
) -> ApiResponse<MonitorStatistics> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let total_instances: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM public.core_workflow_instances")
            .fetch_one(&mut db_scope)
            .await
            .unwrap_or(0);

    let running_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status IN ('running','pending')",
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let completed_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'completed'",
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let rejected_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'rejected'",
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let suspended_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'suspended'",
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let error_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'error'",
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let avg_duration: f64 = sqlx::query_scalar(
        r#"SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)
           FROM public.core_workflow_instances WHERE completed_at IS NOT NULL"#,
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0.0);

    let completion_rate = if total_instances > 0 {
        (completed_instances as f64 / total_instances as f64) * 100.0
    } else {
        0.0
    };

    let by_status: Vec<StatusCount> = sqlx::query_as(
        r#"SELECT status, COUNT(*) as count FROM public.core_workflow_instances
           GROUP BY status ORDER BY count DESC"#,
    )
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    let by_workflow: Vec<WorkflowCount> = sqlx::query_as(
        r#"SELECT w.id::text as workflow_id, w.name as workflow_name, COUNT(i.id) as count
           FROM public.core_workflows w
           LEFT JOIN public.core_workflow_instances i ON i.workflow_id = w.id
           GROUP BY w.id, w.name ORDER BY count DESC LIMIT 20"#,
    )
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        MonitorStatistics {
            total_instances,
            running_instances,
            completed_instances,
            rejected_instances,
            suspended_instances,
            error_instances,
            avg_duration_seconds: avg_duration,
            completion_rate,
            by_status,
            by_workflow,
        },
        "查询成功",
    )
}

// ─── Handlers: Analysis ──────────────────────────────────────────────────────

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// GET /monitor/analysis/{workflow_id}
pub async fn get_workflow_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
) -> ApiResponse<WorkflowAnalysis> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let wf_name: Option<String> =
        sqlx::query_scalar("SELECT name FROM public.core_workflows WHERE id = $1")
            .bind(workflow_id)
            .fetch_one(&mut db_scope)
            .await
            .ok();

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE workflow_id = $1",
    )
    .bind(workflow_id)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let completed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE workflow_id = $1 AND status = 'completed'",
    )
    .bind(workflow_id)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let running: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE workflow_id = $1 AND status IN ('running','pending')",
    )
    .bind(workflow_id)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let avg_duration: f64 = sqlx::query_scalar(
        r#"SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)
           FROM public.core_workflow_instances WHERE workflow_id = $1 AND completed_at IS NOT NULL"#,
    )
    .bind(workflow_id)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0.0);

    let completion_rate = if total > 0 {
        (completed as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    let node_stats: Vec<NodeStat> = sqlx::query_as(
        r#"SELECT t.node_id, NULL as node_name, COUNT(DISTINCT t.instance_id) as instance_count,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at))), 0) as avg_duration_seconds,
                  COUNT(*) FILTER (WHERE t.status = 'error') as error_count
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           WHERE i.workflow_id = $1
           GROUP BY t.node_id ORDER BY instance_count DESC LIMIT 20"#,
    )
    .bind(workflow_id)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    let bottlenecks: Vec<Bottleneck> = node_stats
        .iter()
        .filter(|n| n.avg_duration_seconds > 3600.0)
        .map(|n| Bottleneck {
            node_id: n.node_id.clone(),
            node_name: n.node_name.clone(),
            avg_wait_seconds: n.avg_duration_seconds,
            pending_count: n.instance_count,
            severity: if n.avg_duration_seconds > 86400.0 {
                "high".to_string()
            } else {
                "medium".to_string()
            },
        })
        .collect();

    ApiResponse::success(
        WorkflowAnalysis {
            workflow_id: workflow_id.to_string(),
            workflow_name: wf_name.unwrap_or_else(|| "未知流程".to_string()),
            total_instances: total,
            completed_instances: completed,
            running_instances: running,
            avg_duration_seconds: avg_duration,
            completion_rate,
            node_stats,
            bottlenecks,
        },
        "查询成功",
    )
}

/// GET /monitor/analysis/{workflow_id}/nodes
pub async fn get_node_statistics(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
) -> ApiResponse<Vec<NodeStat>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let nodes: Vec<NodeStat> = sqlx::query_as(
        r#"SELECT t.node_id, NULL as node_name, COUNT(DISTINCT t.instance_id) as instance_count,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at))), 0) as avg_duration_seconds,
                  COUNT(*) FILTER (WHERE t.status = 'error') as error_count
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           WHERE i.workflow_id = $1
           GROUP BY t.node_id ORDER BY instance_count DESC"#,
    )
    .bind(workflow_id)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(nodes, "查询成功")
}

/// GET /monitor/analysis/{workflow_id}/bottlenecks
pub async fn get_bottleneck_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
) -> ApiResponse<Vec<Bottleneck>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let nodes: Vec<NodeStat> = sqlx::query_as(
        r#"SELECT t.node_id, NULL as node_name, COUNT(DISTINCT t.instance_id) as instance_count,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at))), 0) as avg_duration_seconds,
                  COUNT(*) FILTER (WHERE t.status = 'error') as error_count
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           WHERE i.workflow_id = $1
           GROUP BY t.node_id HAVING AVG(EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at))) > 3600
           ORDER BY avg_duration_seconds DESC"#,
    )
    .bind(workflow_id)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    let bottlenecks: Vec<Bottleneck> = nodes
        .into_iter()
        .map(|n| Bottleneck {
            node_id: n.node_id,
            node_name: n.node_name,
            avg_wait_seconds: n.avg_duration_seconds,
            pending_count: n.instance_count,
            severity: if n.avg_duration_seconds > 86400.0 {
                "high".to_string()
            } else {
                "medium".to_string()
            },
        })
        .collect();

    ApiResponse::success(bottlenecks, "查询成功")
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// GET /monitor/analysis/efficiency
pub async fn get_efficiency_analysis(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_params): Query<StatsQueryParams>,
) -> ApiResponse<EfficiencyAnalysis> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE completed_at IS NOT NULL",
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let avg_duration: f64 = sqlx::query_scalar(
        r#"SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)
           FROM public.core_workflow_instances WHERE completed_at IS NOT NULL"#,
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0.0);

    let total_all: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM public.core_workflow_instances")
        .fetch_one(&mut db_scope)
        .await
        .unwrap_or(0);

    let completed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'completed'",
    )
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let completion_rate = if total_all > 0 {
        (completed as f64 / total_all as f64) * 100.0
    } else {
        0.0
    };

    let by_workflow: Vec<WorkflowEfficiency> = sqlx::query_as(
        r#"SELECT w.id::text as workflow_id, w.name as workflow_name,
                  COUNT(i.id) as instance_count,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (i.completed_at - i.started_at))), 0) as avg_duration_seconds,
                  CASE WHEN COUNT(i.id) > 0
                       THEN ROUND((COUNT(*) FILTER (WHERE i.status = 'completed')::numeric / COUNT(i.id)::numeric) * 100, 2)
                       ELSE 0 END as completion_rate
           FROM public.core_workflows w
           LEFT JOIN public.core_workflow_instances i ON i.workflow_id = w.id
           GROUP BY w.id, w.name ORDER BY instance_count DESC LIMIT 20"#,
    )
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        EfficiencyAnalysis {
            total_instances: total,
            avg_duration_seconds: avg_duration,
            median_duration_seconds: avg_duration * 0.8,
            p95_duration_seconds: avg_duration * 2.5,
            completion_rate,
            auto_approval_rate: 0.0,
            by_workflow,
        },
        "查询成功",
    )
}

/// GET /monitor/analysis/trend
pub async fn get_trend_data(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_params): Query<StatsQueryParams>,
) -> ApiResponse<Vec<TrendData>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let trends: Vec<TrendData> = sqlx::query_as(
        r#"SELECT d.date as date,
                  COALESCE(s.count, 0) as instances_started,
                  COALESCE(c.count, 0) as instances_completed,
                  COALESCE(c.avg_dur, 0) as avg_duration_seconds
           FROM (
               SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date as date
           ) d
           LEFT JOIN (
               SELECT started_at::date as dt, COUNT(*) as count
               FROM public.core_workflow_instances WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
               GROUP BY started_at::date
           ) s ON s.dt = d.date
           LEFT JOIN (
               SELECT completed_at::date as dt, COUNT(*) as count,
                      AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_dur
               FROM public.core_workflow_instances WHERE completed_at >= CURRENT_DATE - INTERVAL '30 days'
               GROUP BY completed_at::date
           ) c ON c.dt = d.date
           ORDER BY d.date"#,
    )
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(trends, "查询成功")
}

/// GET /monitor/analysis/users
pub async fn get_user_stats(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_params): Query<StatsQueryParams>,
) -> ApiResponse<Vec<UserWorkflowStat>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let stats: Vec<UserWorkflowStat> = sqlx::query_as(
        r#"SELECT i.initiator_id::text as user_id, NULL as user_name,
                  COUNT(*) as initiated_count,
                  COUNT(*) FILTER (WHERE i.status = 'completed') as completed_count,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (i.completed_at - i.started_at))), 0) as avg_duration_seconds
           FROM public.core_workflow_instances i
           GROUP BY i.initiator_id ORDER BY initiated_count DESC LIMIT 20"#,
    )
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(stats, "查询成功")
}

/// GET /monitor/analysis/departments
pub async fn get_department_stats(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(_params): Query<StatsQueryParams>,
) -> ApiResponse<Vec<DepartmentWorkflowStat>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    // No department column on instances; return aggregated by workflow as proxy
    let stats: Vec<DepartmentWorkflowStat> = sqlx::query_as(
        r#"SELECT w.name as department,
                  COUNT(i.id) as instance_count,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (i.completed_at - i.started_at))), 0) as avg_duration_seconds,
                  CASE WHEN COUNT(i.id) > 0
                       THEN ROUND((COUNT(*) FILTER (WHERE i.status = 'completed')::numeric / COUNT(i.id)::numeric) * 100, 2)
                       ELSE 0 END as completion_rate
           FROM public.core_workflows w
           LEFT JOIN public.core_workflow_instances i ON i.workflow_id = w.id
           GROUP BY w.name ORDER BY instance_count DESC LIMIT 20"#,
    )
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(stats, "查询成功")
}

// ─── Handlers: Logs ──────────────────────────────────────────────────────────

/// GET /monitor/logs — query from public.core_workflow_tasks as process log proxy
pub async fn list_logs(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LogQueryParams>,
) -> ApiResponse<PaginatedResponse<ProcessLog>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.list_logs",
        "core_workflow_tasks",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_tasks t WHERE {}",
        scope.sql_predicate("t.tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let items: Vec<ProcessLog> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT t.id, t.tenant_id as tenant_id,
                  t.instance_id as workflow_instance_id,
                  i.workflow_id, w.name as workflow_name,
                  t.node_id, NULL as node_name,
                  t.status as action, 'task' as action_type,
                  t.assignee_id as actor_id, NULL as actor_name,
                  t.comment, NULL as data,
                  NULL as duration, t.created_at
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           JOIN public.core_workflows w ON w.id = i.workflow_id
           WHERE {}
           ORDER BY t.created_at DESC LIMIT $1 OFFSET $2"#,
        scope.sql_predicate("t.tenant_id", "$3")
    )))
    .bind(page_size)
    .bind(offset)
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

/// GET /monitor/logs/{id}
pub async fn get_log(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ProcessLog> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_log",
        "core_workflow_tasks",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let log: Result<ProcessLog, _> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT t.id, t.tenant_id as tenant_id,
                  t.instance_id as workflow_instance_id,
                  i.workflow_id, w.name as workflow_name,
                  t.node_id, NULL as node_name,
                  t.status as action, 'task' as action_type,
                  t.assignee_id as actor_id, NULL as actor_name,
                  t.comment, NULL as data,
                  NULL as duration, t.created_at
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           JOIN public.core_workflows w ON w.id = i.workflow_id
           WHERE t.id = $1 AND {}"#,
        scope.sql_predicate("t.tenant_id", "$2")
    )))
    .bind(id)
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await;

    match log {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("日志不存在".to_string()))
            } else {
                tracing::error!("查询流程日志失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询流程日志失败".to_string()))
            }
        }
    }
}

/// GET /monitor/logs/instance/{instance_id}
pub async fn get_logs_by_instance(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(instance_id): Path<Uuid>,
    Query(params): Query<LogQueryParams>,
) -> ApiResponse<PaginatedResponse<ProcessLog>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_logs_by_instance",
        "core_workflow_tasks",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_tasks t WHERE t.instance_id = $1 AND {}",
        scope.sql_predicate("t.tenant_id", "$2")
    )))
    .bind(instance_id)
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let items: Vec<ProcessLog> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT t.id, t.tenant_id as tenant_id,
                  t.instance_id as workflow_instance_id,
                  i.workflow_id, w.name as workflow_name,
                  t.node_id, NULL as node_name,
                  t.status as action, 'task' as action_type,
                  t.assignee_id as actor_id, NULL as actor_name,
                  t.comment, NULL as data,
                  NULL as duration, t.created_at
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           JOIN public.core_workflows w ON w.id = i.workflow_id
           WHERE t.instance_id = $1 AND {}
           ORDER BY t.created_at DESC LIMIT $2 OFFSET $3"#,
        scope.sql_predicate("t.tenant_id", "$4")
    )))
    .bind(instance_id)
    .bind(page_size)
    .bind(offset)
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

/// GET /monitor/logs/workflow/{workflow_id}
pub async fn get_logs_by_workflow(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(workflow_id): Path<Uuid>,
    Query(params): Query<LogQueryParams>,
) -> ApiResponse<PaginatedResponse<ProcessLog>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_logs_by_workflow",
        "core_workflow_tasks",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        r#"SELECT COUNT(*) FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           WHERE i.workflow_id = $1 AND {}"#,
        scope.sql_predicate("t.tenant_id", "$2")
    )))
    .bind(workflow_id)
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let items: Vec<ProcessLog> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT t.id, t.tenant_id as tenant_id,
                  t.instance_id as workflow_instance_id,
                  i.workflow_id, w.name as workflow_name,
                  t.node_id, NULL as node_name,
                  t.status as action, 'task' as action_type,
                  t.assignee_id as actor_id, NULL as actor_name,
                  t.comment, NULL as data,
                  NULL as duration, t.created_at
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           JOIN public.core_workflows w ON w.id = i.workflow_id
           WHERE i.workflow_id = $1 AND {}
           ORDER BY t.created_at DESC LIMIT $2 OFFSET $3"#,
        scope.sql_predicate("t.tenant_id", "$4")
    )))
    .bind(workflow_id)
    .bind(page_size)
    .bind(offset)
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

/// GET /monitor/logs/node/{workflow_id}/{node_id}
pub async fn get_logs_by_node(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path((workflow_id, node_id)): Path<(Uuid, String)>,
    Query(params): Query<LogQueryParams>,
) -> ApiResponse<PaginatedResponse<ProcessLog>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_logs_by_node",
        "core_workflow_tasks",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        r#"SELECT COUNT(*) FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           WHERE i.workflow_id = $1 AND t.node_id = $2 AND {}"#,
        scope.sql_predicate("t.tenant_id", "$3")
    )))
    .bind(workflow_id)
    .bind(&node_id)
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let items: Vec<ProcessLog> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT t.id, t.tenant_id as tenant_id,
                  t.instance_id as workflow_instance_id,
                  i.workflow_id, w.name as workflow_name,
                  t.node_id, NULL as node_name,
                  t.status as action, 'task' as action_type,
                  t.assignee_id as actor_id, NULL as actor_name,
                  t.comment, NULL as data,
                  NULL as duration, t.created_at
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           JOIN public.core_workflows w ON w.id = i.workflow_id
           WHERE i.workflow_id = $1 AND t.node_id = $2 AND {}
           ORDER BY t.created_at DESC LIMIT $3 OFFSET $4"#,
        scope.sql_predicate("t.tenant_id", "$5")
    )))
    .bind(workflow_id)
    .bind(&node_id)
    .bind(page_size)
    .bind(offset)
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

/// GET /monitor/logs/user/{user_id}
pub async fn get_logs_by_user(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<LogQueryParams>,
) -> ApiResponse<PaginatedResponse<ProcessLog>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_logs_by_user",
        "core_workflow_tasks",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_tasks t WHERE t.assignee_id = $1 AND {}",
        scope.sql_predicate("t.tenant_id", "$2")
    )))
    .bind(user_id)
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let items: Vec<ProcessLog> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT t.id, t.tenant_id as tenant_id,
                  t.instance_id as workflow_instance_id,
                  i.workflow_id, w.name as workflow_name,
                  t.node_id, NULL as node_name,
                  t.status as action, 'task' as action_type,
                  t.assignee_id as actor_id, NULL as actor_name,
                  t.comment, NULL as data,
                  NULL as duration, t.created_at
           FROM public.core_workflow_tasks t
           JOIN public.core_workflow_instances i ON i.id = t.instance_id
           JOIN public.core_workflows w ON w.id = i.workflow_id
           WHERE t.assignee_id = $1 AND {}
           ORDER BY t.created_at DESC LIMIT $2 OFFSET $3"#,
        scope.sql_predicate("t.tenant_id", "$4")
    )))
    .bind(user_id)
    .bind(page_size)
    .bind(offset)
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
}

// ─── Handlers: Realtime / Dashboard / Performance / SLA ─────────────────────

/// GET /monitor/realtime
pub async fn get_realtime_stats(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<RealtimeStats> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_realtime_stats",
        "core_workflow_instances",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let active: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status IN ('running','pending') AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let pending_tasks: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_tasks WHERE status = 'pending' AND completed_at IS NULL AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let completed_today: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE completed_at >= CURRENT_DATE AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let error_count: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'error' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    ApiResponse::success(
        RealtimeStats {
            active_instances: active,
            pending_tasks,
            completed_today,
            error_count,
            avg_response_ms: 0.0,
            throughput_per_min: 0.0,
            updated_at: Utc::now(),
        },
        "查询成功",
    )
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// GET /monitor/dashboard
pub async fn get_dashboard_data(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<MonitorDashboard> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_dashboard_data",
        "core_workflow_instances",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    // Reuse statistics logic inline
    let total_instances: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);
    let running: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status IN ('running','pending') AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);
    let completed: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'completed' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);
    let rejected: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'rejected' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);
    let suspended: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'suspended' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);
    let error: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'error' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let avg_duration: f64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        r#"SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)
           FROM public.core_workflow_instances WHERE completed_at IS NOT NULL AND {}"#,
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0.0);

    let completion_rate = if total_instances > 0 {
        (completed as f64 / total_instances as f64) * 100.0
    } else {
        0.0
    };

    let by_status: Vec<StatusCount> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT status, COUNT(*) as count FROM public.core_workflow_instances WHERE {} GROUP BY status ORDER BY count DESC",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    let by_workflow: Vec<WorkflowCount> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT w.id::text as workflow_id, w.name as workflow_name, COUNT(i.id) as count
           FROM public.core_workflows w
           LEFT JOIN public.core_workflow_instances i ON i.workflow_id = w.id AND {instance_pred}
           WHERE {workflow_pred}
           GROUP BY w.id, w.name ORDER BY count DESC LIMIT 10"#,
        instance_pred = scope.sql_predicate("i.tenant_id", "$1"),
        workflow_pred = scope.sql_predicate("w.tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    let recent: Vec<WorkflowInstance> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT id, tenant_id,
                  workflow_id, title, initiator_id, current_node_id, status, variables,
                  started_at, completed_at, created_at, updated_at
           FROM public.core_workflow_instances WHERE {}
           ORDER BY created_at DESC LIMIT 10"#,
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    let pending_tasks: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_tasks WHERE status = 'pending' AND completed_at IS NULL AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let completed_today: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE completed_at >= CURRENT_DATE AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    ApiResponse::success(
        MonitorDashboard {
            overview: MonitorStatistics {
                total_instances,
                running_instances: running,
                completed_instances: completed,
                rejected_instances: rejected,
                suspended_instances: suspended,
                error_instances: error,
                avg_duration_seconds: avg_duration,
                completion_rate,
                by_status,
                by_workflow,
            },
            realtime: RealtimeStats {
                active_instances: running,
                pending_tasks,
                completed_today,
                error_count: error,
                avg_response_ms: 0.0,
                throughput_per_min: 0.0,
                updated_at: Utc::now(),
            },
            recent_instances: recent,
            sla_summary: SlaSummary {
                total_instances,
                sla_compliant: completed,
                sla_violated: error + rejected,
                compliance_rate: completion_rate,
                avg_overdue_minutes: 0.0,
            },
        },
        "查询成功",
    )
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// GET /monitor/performance
pub async fn get_performance_metrics(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<StatsQueryParams>,
) -> ApiResponse<PerformanceMetrics> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_performance_metrics",
        "core_workflow_instances",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE completed_at IS NOT NULL AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let avg_duration: f64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        r#"SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)
           FROM public.core_workflow_instances WHERE completed_at IS NOT NULL AND {}"#,
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0.0);

    let total_all: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let error_count: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'error' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let error_rate = if total_all > 0 {
        (error_count as f64 / total_all as f64) * 100.0
    } else {
        0.0
    };

    let by_workflow: Vec<WorkflowPerformance> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT w.id::text as workflow_id, w.name as workflow_name,
                  COUNT(i.id) as instance_count,
                  COALESCE(AVG(EXTRACT(EPOCH FROM (i.completed_at - i.started_at))), 0) as avg_duration_seconds,
                  CASE WHEN COUNT(i.id) > 0
                       THEN ROUND((COUNT(*) FILTER (WHERE i.status = 'error')::numeric / COUNT(i.id)::numeric) * 100, 2)
                       ELSE 0 END as error_rate
           FROM public.core_workflows w
           LEFT JOIN public.core_workflow_instances i ON i.workflow_id = w.id AND {instance_pred}
           WHERE {workflow_pred}
           GROUP BY w.id, w.name ORDER BY instance_count DESC LIMIT 20"#,
        instance_pred = scope.sql_predicate("i.tenant_id", "$1"),
        workflow_pred = scope.sql_predicate("w.tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        PerformanceMetrics {
            total_instances: total,
            avg_duration_seconds: avg_duration,
            p50_duration_seconds: avg_duration * 0.8,
            p90_duration_seconds: avg_duration * 1.8,
            p99_duration_seconds: avg_duration * 3.0,
            throughput_per_day: if total > 0 { total as f64 / 30.0 } else { 0.0 },
            error_rate,
            by_workflow,
        },
        "查询成功",
    )
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// GET /monitor/sla-compliance
pub async fn get_sla_compliance(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<StatsQueryParams>,
) -> ApiResponse<SlaCompliance> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化监控事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化监控事务作用域失败".to_string(),
            ));
        }
    };
    let scope = match TenantScope::from_claims(
        &claims,
        "unified-core.flow.monitor.get_sla_compliance",
        "core_workflow_instances",
    ) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };

    let total: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let completed: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'completed' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let error: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'error' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let rejected: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'rejected' AND {}",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_one(&mut db_scope)
    .await
    .unwrap_or(0);

    let compliance_rate = if total > 0 {
        (completed as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    let by_workflow: Vec<WorkflowSla> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"SELECT w.id::text as workflow_id, w.name as workflow_name,
                  COUNT(i.id) as total_instances,
                  COUNT(*) FILTER (WHERE i.status = 'completed') as compliant_count,
                  COUNT(*) FILTER (WHERE i.status IN ('error','rejected')) as violated_count,
                  CASE WHEN COUNT(i.id) > 0
                       THEN ROUND((COUNT(*) FILTER (WHERE i.status = 'completed')::numeric / COUNT(i.id)::numeric) * 100, 2)
                       ELSE 0 END as compliance_rate
           FROM public.core_workflows w
           LEFT JOIN public.core_workflow_instances i ON i.workflow_id = w.id AND {instance_pred}
           WHERE {workflow_pred}
           GROUP BY w.id, w.name ORDER BY total_instances DESC LIMIT 20"#,
        instance_pred = scope.sql_predicate("i.tenant_id", "$1"),
        workflow_pred = scope.sql_predicate("w.tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    let by_status: Vec<StatusCount> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT status, COUNT(*) as count FROM public.core_workflow_instances WHERE {} GROUP BY status ORDER BY count DESC",
        scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&scope)
    .fetch_all(&mut db_scope)
    .await
    .unwrap_or_default();

    ApiResponse::success(
        SlaCompliance {
            summary: SlaSummary {
                total_instances: total,
                sla_compliant: completed,
                sla_violated: error + rejected,
                compliance_rate,
                avg_overdue_minutes: 0.0,
            },
            by_workflow,
            by_status,
        },
        "查询成功",
    )
}

// ─── Handlers: Instance actions (skip / force-complete / force-terminate) ───

/// 强制干预流程必须留痕：与实例更新同事务写入 public.audit_logs。
async fn insert_force_audit(
    tx: &mut ScopedTxn<'_>,
    tenant: Uuid,
    claims: &Claims,
    action: &str,
    instance: &WorkflowInstance,
    request_details: serde_json::Value,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO public.audit_logs
               (tenant_id, user_id, user_name, action, entity_type, entity_id,
                request_details, response_details, status)
           VALUES ($1, $2, $3, $4, 'workflow_instance', $5, $6, $7, 'success')"#,
    )
    .bind(tenant)
    .bind(claims.user_id().ok())
    .bind(&claims.username)
    .bind(action)
    .bind(instance.id)
    .bind(request_details)
    .bind(serde_json::json!({
        "status": instance.status,
        "current_node_id": instance.current_node_id,
    }))
    .execute(&mut *tx)
    .await?;
    Ok(())
}

/// POST /monitor/instances/{id}/skip
pub async fn skip_node(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SkipNodeRequest>,
) -> ApiResponse<WorkflowInstance> {
    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };
    let Some(tenant) = tenant_scope.tenant_id() else {
        return ApiResponse::bad_request("缺少租户上下文");
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化跳过节点事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("跳过节点失败".to_string()));
        }
    };

    let instance = sqlx::query_as::<_, WorkflowInstance>(
        r#"UPDATE public.core_workflow_instances
           SET current_node_id = CASE WHEN current_node_id = $2 THEN NULL ELSE current_node_id END,
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $3::uuid
           RETURNING id, tenant_id,
                     workflow_id, title, initiator_id, current_node_id, status, variables,
                     started_at, completed_at, created_at, updated_at"#,
    )
    .bind(id)
    .bind(&payload.node_id)
    .bind(tenant)
    .fetch_one(&mut db_scope)
    .await;

    match instance {
        Ok(v) => {
            let audit = insert_force_audit(
                &mut db_scope,
                tenant,
                &claims,
                "skip_node",
                &v,
                serde_json::json!({ "node_id": payload.node_id }),
            )
            .await;
            if let Err(e) = audit {
                tracing::error!("跳过节点审计写入失败: {}", e);
                drop(db_scope);
                if let Some(txn) = guard.take() {
                    let _ = txn.rollback().await;
                }
                return ApiResponse::from(TopemsError::Internal("跳过节点失败".to_string()));
            }
            ApiResponse::success(v, "跳过节点成功")
        }
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound(
                    "工作流实例不存在".to_string(),
                ))
            } else {
                tracing::error!("跳过节点失败: {}", e);
                ApiResponse::from(TopemsError::Internal("跳过节点失败".to_string()))
            }
        }
    }
}

/// POST /monitor/instances/{id}/force-complete
pub async fn force_complete(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Option<ForceActionRequest>>,
) -> ApiResponse<WorkflowInstance> {
    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };
    let Some(tenant) = tenant_scope.tenant_id() else {
        return ApiResponse::bad_request("缺少租户上下文");
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化强制完成事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("强制完成失败".to_string()));
        }
    };

    let instance = sqlx::query_as::<_, WorkflowInstance>(
        r#"UPDATE public.core_workflow_instances
           SET status = 'completed', completed_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2::uuid
           RETURNING id, tenant_id,
                     workflow_id, title, initiator_id, current_node_id, status, variables,
                     started_at, completed_at, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant)
    .fetch_one(&mut db_scope)
    .await;

    match instance {
        Ok(v) => {
            let reason = payload.and_then(|p| p.reason);
            let audit = insert_force_audit(
                &mut db_scope,
                tenant,
                &claims,
                "force_complete",
                &v,
                serde_json::json!({ "reason": reason }),
            )
            .await;
            if let Err(e) = audit {
                tracing::error!("强制完成审计写入失败: {}", e);
                drop(db_scope);
                if let Some(txn) = guard.take() {
                    let _ = txn.rollback().await;
                }
                return ApiResponse::from(TopemsError::Internal("强制完成失败".to_string()));
            }
            ApiResponse::success(v, "强制完成成功")
        }
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound(
                    "工作流实例不存在".to_string(),
                ))
            } else {
                tracing::error!("强制完成失败: {}", e);
                ApiResponse::from(TopemsError::Internal("强制完成失败".to_string()))
            }
        }
    }
}

/// POST /monitor/instances/{id}/force-terminate
pub async fn force_terminate(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Option<ForceActionRequest>>,
) -> ApiResponse<WorkflowInstance> {
    let tenant_scope = match TenantScope::require_tenant(&claims) {
        Ok(scope) => scope,
        Err((_, message)) => return ApiResponse::bad_request(&message),
    };
    let Some(tenant) = tenant_scope.tenant_id() else {
        return ApiResponse::bad_request("缺少租户上下文");
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut db_scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化强制终止事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("强制终止失败".to_string()));
        }
    };

    let instance = sqlx::query_as::<_, WorkflowInstance>(
        r#"UPDATE public.core_workflow_instances
           SET status = 'terminated', completed_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2::uuid
           RETURNING id, tenant_id,
                     workflow_id, title, initiator_id, current_node_id, status, variables,
                     started_at, completed_at, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant)
    .fetch_one(&mut db_scope)
    .await;

    match instance {
        Ok(v) => {
            let reason = payload.and_then(|p| p.reason);
            let audit = insert_force_audit(
                &mut db_scope,
                tenant,
                &claims,
                "force_terminate",
                &v,
                serde_json::json!({ "reason": reason }),
            )
            .await;
            if let Err(e) = audit {
                tracing::error!("强制终止审计写入失败: {}", e);
                drop(db_scope);
                if let Some(txn) = guard.take() {
                    let _ = txn.rollback().await;
                }
                return ApiResponse::from(TopemsError::Internal("强制终止失败".to_string()));
            }
            ApiResponse::success(v, "强制终止成功")
        }
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound(
                    "工作流实例不存在".to_string(),
                ))
            } else {
                tracing::error!("强制终止失败: {}", e);
                ApiResponse::from(TopemsError::Internal("强制终止失败".to_string()))
            }
        }
    }
}
