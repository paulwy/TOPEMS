use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, Row};
use topems_shared_boundary::only_own_schema_query;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

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
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let today_patrols = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_scans = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.scan_records WHERE operator = $1 AND scanned_at >= CURRENT_DATE"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pending_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'pending'"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'completed'"),
    )
    .bind(&user_id)
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
        Json(ApiResponse::success(stats, "获取统计数据成功")),
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
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let total_patrols = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1"
    ))
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_patrols = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND status = 'completed'"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let in_progress_patrols = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND status = 'in_progress'"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_count = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let weekly_count = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'"),
    )
    .bind(&user_id)
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
        Json(ApiResponse::success(stats, "获取巡逻统计数据成功")),
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
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let total_tasks = sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE assignee = $1 OR assignee IS NULL"
    ))
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pending_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'pending'"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'completed'"),
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let overdue_tasks = sqlx::query(
        only_own_schema_query!("mobile", "SELECT COUNT(*) as count FROM mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status != 'completed' AND due_date < CURRENT_DATE"),
    )
    .bind(&user_id)
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
        Json(ApiResponse::success(stats, "获取任务统计数据成功")),
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
