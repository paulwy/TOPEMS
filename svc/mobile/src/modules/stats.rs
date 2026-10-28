use axum::{
    extract::{Extension, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ActivityParams {
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardStats {
    pub today_patrols: i64,
    pub today_scans: i64,
    pub pending_tasks: i64,
    pub completed_tasks: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PatrolStats {
    pub total_patrols: i64,
    pub completed_patrols: i64,
    pub in_progress_patrols: i64,
    pub today_count: i64,
    pub weekly_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskStats {
    pub total_tasks: i64,
    pub pending_tasks: i64,
    pub completed_tasks: i64,
    pub overdue_tasks: i64,
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 计算 (min, max, avg, sum)。空切片时 min/max 返回 0.0、avg 返回 0.0、sum 返回 0.0。
pub fn mobile_summary_stats(values: &[f64]) -> (f64, f64, f64, f64) {
    if values.is_empty() {
        return (0.0, 0.0, 0.0, 0.0);
    }
    let mut min = f64::INFINITY;
    let mut max = f64::NEG_INFINITY;
    let mut sum = 0.0_f64;
    for v in values {
        if *v < min {
            min = *v;
        }
        if *v > max {
            max = *v;
        }
        sum += *v;
    }
    let avg = sum / values.len() as f64;
    (min, max, avg, sum)
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 计算完成率：completed / total * 100.0。total <= 0 时返回 0.0。
pub fn compute_completion_rate(completed: i64, total: i64) -> f64 {
    if total <= 0 {
        return 0.0;
    }
    let completed = completed.min(total).max(0);
    (completed as f64 / total as f64) * 100.0
}

/// 判断给定计数是否属于"高活跃"等级（>= threshold）。
pub fn is_high_activity(count: i64, threshold: i64) -> bool {
    count >= threshold && threshold > 0
}

/// 将统计计数转换为分级字符串。
pub fn classify_count_level(count: i64) -> &'static str {
    if count <= 0 {
        "none"
    } else if count < 10 {
        "low"
    } else if count < 50 {
        "medium"
    } else if count < 100 {
        "high"
    } else {
        "critical"
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:read"])),
    path = "/stats/dashboard",
    tag = "task",
    responses(
        (status = 200, description = "获取统计数据成功", body = serde_json::Value),
        (status = 401, description = "未授权")
    )
)]
pub async fn get_dashboard_stats(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let tenant_filter = tenant_filter(&claims);

    let today_patrols = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_scans = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.scan_records WHERE operator = $1 AND scanned_at >= CURRENT_DATE AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pending_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'pending' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'completed' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let stats = DashboardStats {
        today_patrols,
        today_scans,
        pending_tasks,
        completed_tasks,
    };

    (
        StatusCode::OK,
        ApiResponse::success(stats, "获取统计数据成功"),
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:stats:read"])),
    path = "/stats/patrol",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "stats"
)]
pub async fn get_patrol_stats(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let tenant_filter = tenant_filter(&claims);

    let total_patrols = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"
    ))
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_patrols = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND status = 'completed' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let in_progress_patrols = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND status = 'in_progress' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_count = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let weekly_count = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let stats = PatrolStats {
        total_patrols,
        completed_patrols,
        in_progress_patrols,
        today_count,
        weekly_count,
    };

    (
        StatusCode::OK,
        ApiResponse::success(stats, "获取巡逻统计数据成功"),
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:stats:read"])),
    path = "/stats/task",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "stats"
)]
pub async fn get_task_stats(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let tenant_filter = tenant_filter(&claims);

    let total_tasks = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"
    ))
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pending_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'pending' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'completed' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let overdue_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status != 'completed' AND due_date < CURRENT_DATE AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let stats = TaskStats {
        total_tasks,
        pending_tasks,
        completed_tasks,
        overdue_tasks,
    };

    (
        StatusCode::OK,
        ApiResponse::success(stats, "获取任务统计数据成功"),
    )
}

/// 最近动态（前端 GET /dashboard/activities?limit=N → 聚合最近任务记录）
pub async fn get_recent_activities(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ActivityParams>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let tenant_filter = tenant_filter(&claims);

    let limit = params.limit.unwrap_or(10).clamp(1, 50);

    let activities: Vec<serde_json::Value> = match sqlx::query(
        only_own_schema_query!("mobile", "SELECT id, title, status, updated_at FROM mobile.mobile_tasks WHERE deleted_at IS NULL AND (assignee = $1 OR assignee IS NULL) AND ($3::uuid IS NULL OR tenant_id = $3::uuid) ORDER BY updated_at DESC LIMIT $2"),
    )
    .bind(&user_id)
    .bind(limit)
    .bind(tenant_filter)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => rows
            .iter()
            .map(|r| {
                serde_json::json!({
                    "id": r.try_get::<Uuid, _>("id").ok(),
                    "title": r.try_get::<String, _>("title").ok(),
                    "status": r.try_get::<String, _>("status").ok(),
                    "time": r.try_get::<Option<DateTime<Utc>>, _>("updated_at").ok(),
                    "type": "task",
                })
            })
            .collect(),
        Err(e) => {
            tracing::error!("查询最近动态失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("获取最近动态失败"),
            );
        }
    };

    (
        StatusCode::OK,
        ApiResponse::success(activities, "获取最近动态成功"),
    )
}

// ===== 死代码端点轻量兜底（2026-10-05，页面未调用，占位实现防 404）=====

/// 快捷操作（前端 GET /dashboard/quick-actions → 内置业务快捷入口）
pub async fn get_quick_actions() -> impl IntoResponse {
    let actions = serde_json::json!([
        { "id": "scan", "title": "扫码", "icon": "scan", "url": "/scan", "order": 1 },
        { "id": "task", "title": "任务", "icon": "task", "url": "/tasks", "order": 2 },
        { "id": "approval", "title": "审批", "icon": "approval", "url": "/approvals", "order": 3 },
        { "id": "attendance", "title": "打卡", "icon": "attendance", "url": "/attendance", "order": 4 },
        { "id": "inventory", "title": "库存", "icon": "inventory", "url": "/inventory", "order": 5 },
        { "id": "production", "title": "生产", "icon": "production", "url": "/production", "order": 6 }
    ]);
    (
        StatusCode::OK,
        ApiResponse::success(actions, "获取快捷操作成功"),
    )
}

#[derive(Debug, Deserialize)]
pub struct KpiParams {
    pub period: Option<String>,
}

/// KPI 指标（前端 GET /dashboard/kpis?period= → 本地表聚合）
pub async fn get_dashboard_kpis(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<KpiParams>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    let tenant_filter = tenant_filter(&claims);

    let today_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE assignee = $1 AND created_at >= CURRENT_DATE AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_scans = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.scan_records WHERE operator = $1 AND scanned_at >= CURRENT_DATE AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_patrols = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"),
    )
    .bind(&user_id)
    .bind(tenant_filter)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let kpis = serde_json::json!({
        "tasks": { "value": today_tasks, "previousValue": 0, "trend": "stable", "trendValue": 0, "label": "今日任务" },
        "scans": { "value": today_scans, "previousValue": 0, "trend": "stable", "trendValue": 0, "label": "今日扫码" },
        "patrols": { "value": today_patrols, "previousValue": 0, "trend": "stable", "trendValue": 0, "label": "今日巡检" }
    });
    (StatusCode::OK, ApiResponse::success(kpis, "获取KPI成功"))
}

#[derive(Debug, Deserialize)]
pub struct ChartParams {
    pub chart_type: Option<String>,
    pub period: Option<String>,
}

/// 图表数据（前端 GET /dashboard/charts → 近 7 天任务趋势）
pub async fn get_dashboard_charts(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(_params): Query<ChartParams>,
) -> impl IntoResponse {
    let tenant_filter = tenant_filter(&claims);
    let rows = sqlx::query(
        only_own_schema_query!(
            "mobile",
            "SELECT created_at::date as d, COUNT(*) as count FROM mobile.mobile_tasks WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' AND ($1::uuid IS NULL OR tenant_id = $1::uuid) GROUP BY d ORDER BY d"
        ),
    )
    .bind(tenant_filter)
    .fetch_all(&pool)
    .await;

    let mut daily: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    if let Ok(rows) = rows {
        for r in rows {
            if let (Ok(d), Ok(c)) = (
                r.try_get::<Option<chrono::NaiveDate>, _>("d"),
                r.try_get::<Option<i64>, _>("count"),
            ) {
                if let (Some(d), Some(c)) = (d, c) {
                    daily.insert(d.to_string(), c);
                }
            }
        }
    }

    let mut labels = Vec::new();
    let mut data = Vec::new();
    let today = chrono::Utc::now().date_naive();
    for i in (0..7).rev() {
        let d = today - chrono::Duration::days(i);
        let key = d.to_string();
        labels.push(key.clone());
        data.push(daily.get(&key).copied().unwrap_or(0));
    }

    let chart = serde_json::json!({
        "labels": labels,
        "datasets": [ { "label": "任务数", "data": data } ]
    });
    (
        StatusCode::OK,
        ApiResponse::success(chart, "获取图表数据成功"),
    )
}

/// 告警列表（前端 GET /dashboard/alerts → 空列表占位，告警需告警中心接入）
pub async fn get_dashboard_alerts() -> impl IntoResponse {
    (
        StatusCode::OK,
        ApiResponse::success(serde_json::json!([]), "获取告警列表成功"),
    )
}

/// 确认告警（前端 POST /dashboard/alerts/{id}/acknowledge → 占位兜底）
pub async fn acknowledge_alert(
    State(auth_state): State<AuthState>,
    headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    (
        StatusCode::OK,
        ApiResponse::success((), "告警已确认（占位实现，待告警中心接入）"),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- mobile_summary_stats ----

    #[test]
    fn test_mobile_summary_stats_empty() {
        let (min, max, avg, sum) = mobile_summary_stats(&[]);
        assert_eq!(min, 0.0);
        assert_eq!(max, 0.0);
        assert_eq!(avg, 0.0);
        assert_eq!(sum, 0.0);
    }

    #[test]
    fn test_mobile_summary_stats_single() {
        let (min, max, avg, sum) = mobile_summary_stats(&[5.0]);
        assert_eq!(min, 5.0);
        assert_eq!(max, 5.0);
        assert_eq!(avg, 5.0);
        assert_eq!(sum, 5.0);
    }

    #[test]
    fn test_mobile_summary_stats_multiple() {
        let (min, max, avg, sum) = mobile_summary_stats(&[1.0, 2.0, 3.0, 4.0]);
        assert_eq!(min, 1.0);
        assert_eq!(max, 4.0);
        assert!((avg - 2.5).abs() < 1e-9);
        assert_eq!(sum, 10.0);
    }

    #[test]
    fn test_mobile_summary_stats_negative() {
        let (min, max, avg, sum) = mobile_summary_stats(&[-5.0, -1.0, -3.0]);
        assert_eq!(min, -5.0);
        assert_eq!(max, -1.0);
        assert!((avg - (-3.0)).abs() < 1e-9);
        assert_eq!(sum, -9.0);
    }

    #[test]
    fn test_mobile_summary_stats_with_zero() {
        let (min, max, avg, sum) = mobile_summary_stats(&[0.0, 0.0, 0.0]);
        assert_eq!(min, 0.0);
        assert_eq!(max, 0.0);
        assert_eq!(avg, 0.0);
        assert_eq!(sum, 0.0);
    }

    #[test]
    fn test_mobile_summary_stats_mixed_signs() {
        let (min, max, _, sum) = mobile_summary_stats(&[-10.0, 5.0, 0.0, 3.0]);
        assert_eq!(min, -10.0);
        assert_eq!(max, 5.0);
        assert!((sum - (-2.0)).abs() < 1e-9);
    }

    // ---- compute_completion_rate ----

    #[test]
    fn test_compute_completion_rate_zero_total() {
        assert_eq!(compute_completion_rate(5, 0), 0.0);
        assert_eq!(compute_completion_rate(5, -1), 0.0);
    }

    #[test]
    fn test_compute_completion_rate_full() {
        assert_eq!(compute_completion_rate(10, 10), 100.0);
    }

    #[test]
    fn test_compute_completion_rate_half() {
        assert_eq!(compute_completion_rate(5, 10), 50.0);
    }

    #[test]
    fn test_compute_completion_rate_exceeds_total_clamped() {
        // 完成数超过总数应被截断到 100%
        assert_eq!(compute_completion_rate(20, 10), 100.0);
    }

    #[test]
    fn test_compute_completion_rate_negative_completed() {
        // 负完成数应被截断到 0
        assert_eq!(compute_completion_rate(-5, 10), 0.0);
    }

    #[test]
    fn test_compute_completion_rate_none_completed() {
        assert_eq!(compute_completion_rate(0, 10), 0.0);
    }

    // ---- is_high_activity ----

    #[test]
    fn test_is_high_activity_above_threshold() {
        assert!(is_high_activity(10, 5));
        assert!(is_high_activity(5, 5));
    }

    #[test]
    fn test_is_high_activity_below_threshold() {
        assert!(!is_high_activity(4, 5));
        assert!(!is_high_activity(0, 5));
    }

    #[test]
    fn test_is_high_activity_zero_threshold() {
        assert!(!is_high_activity(100, 0));
        assert!(!is_high_activity(0, 0));
    }

    #[test]
    fn test_is_high_activity_negative_threshold() {
        assert!(!is_high_activity(100, -1));
    }

    // ---- classify_count_level ----

    #[test]
    fn test_classify_count_level_none() {
        assert_eq!(classify_count_level(0), "none");
        assert_eq!(classify_count_level(-5), "none");
    }

    #[test]
    fn test_classify_count_level_low() {
        assert_eq!(classify_count_level(1), "low");
        assert_eq!(classify_count_level(9), "low");
    }

    #[test]
    fn test_classify_count_level_medium() {
        assert_eq!(classify_count_level(10), "medium");
        assert_eq!(classify_count_level(49), "medium");
    }

    #[test]
    fn test_classify_count_level_high() {
        assert_eq!(classify_count_level(50), "high");
        assert_eq!(classify_count_level(99), "high");
    }

    #[test]
    fn test_classify_count_level_critical() {
        assert_eq!(classify_count_level(100), "critical");
        assert_eq!(classify_count_level(1000), "critical");
    }
}
