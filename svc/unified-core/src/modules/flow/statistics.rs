use crate::AppState;
use axum::extract::State;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

use super::models::{MonthlyData, StatisticsResponse, WorkflowStat};

/// 跨租户全局统计。
///
/// 看板口径为平台全量，不收窄到租户内；因此显式走系统通道
/// （`scope_read_system`：nil 租户 + `app.rls_system='on'`），
/// 不再依赖池直连 + 宽松策略恰好放行。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:stat:read"])),
    path = "/api/core/flow/statistics",
    tag = "Flow-Monitor",
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<StatisticsResponse>),
        (status = 500, description = "查询失败"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_statistics(State(state): State<AppState>) -> ApiResponse<StatisticsResponse> {
    let mut scope = match state.db.scope_read_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化统计系统通道失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询失败".to_string()));
        }
    };

    let total_workflows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM public.core_workflows")
        .fetch_one(&mut scope)
        .await
        .unwrap_or(0);

    let active_workflows: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM public.core_workflows WHERE status = 'active'")
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);

    let total_instances: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM public.core_workflow_instances")
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);

    let running_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'pending'",
    )
    .fetch_one(&mut scope)
    .await
    .unwrap_or(0);

    let completed_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'completed'",
    )
    .fetch_one(&mut scope)
    .await
    .unwrap_or(0);

    let rejected_instances: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_instances WHERE status = 'rejected'",
    )
    .fetch_one(&mut scope)
    .await
    .unwrap_or(0);

    let total_approvals: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM public.core_workflow_tasks")
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);

    let pending_approvals: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_tasks WHERE status = 'pending'",
    )
    .fetch_one(&mut scope)
    .await
    .unwrap_or(0);

    let approved_approvals: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_tasks WHERE status = 'completed'",
    )
    .fetch_one(&mut scope)
    .await
    .unwrap_or(0);

    let rejected_approvals: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM public.core_workflow_tasks WHERE status = 'rejected'",
    )
    .fetch_one(&mut scope)
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
        FROM public.core_workflows w
        LEFT JOIN public.core_workflow_instances i ON i.workflow_id = w.id
        GROUP BY w.id, w.name
        ORDER BY instance_count DESC
        LIMIT 10"#,
    )
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();

    let monthly_data: Vec<MonthlyData> = Vec::new();

    if let Err(e) = scope.commit().await {
        tracing::warn!("关闭统计系统通道事务失败: {}", e);
    }

    ApiResponse::success(
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
    )
}
