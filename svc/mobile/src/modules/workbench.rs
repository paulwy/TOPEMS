use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared::{ApiResponse, AuthState};

use super::auth_utils::extract_user_id_from_token;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileWorkbenchData {
    pub pending_tasks: i64,
    pub pending_approvals: i64,
    pub unread_notifications: i64,
    pub today_attendance_status: String,
    pub today_production_output: i64,
    pub today_quality_pass_rate: f64,
    pub shortcuts: Vec<Shortcut>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shortcut {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub path: String,
    pub color: String,
}

pub async fn get_workbench_data(
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

    let pending_tasks = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'pending'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pending_approvals = sqlx::query(
        "SELECT COUNT(*) as count FROM mobile_approvals WHERE assignee_id = $1 AND status = 'pending'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let unread_notifications = sqlx::query(
        "SELECT COUNT(*) as count FROM mobile_notifications WHERE user_id = $1 AND read = false",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_attendance_status = check_attendance_status(&pool, &user_id).await;

    let today_production_output = sqlx::query(
        "SELECT COALESCE(SUM(good_quantity), 0) as output FROM plugin_mobile.work_reports WHERE operator = $1 AND created_at >= CURRENT_DATE",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("output").unwrap_or(0))
    .unwrap_or(0);

    let today_quality_pass_rate = calculate_quality_pass_rate(&pool).await;

    let shortcuts = get_shortcuts(&pool, &user_id).await;

    let workbench_data = MobileWorkbenchData {
        pending_tasks,
        pending_approvals,
        unread_notifications,
        today_attendance_status,
        today_production_output,
        today_quality_pass_rate,
        shortcuts,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(workbench_data, "获取工作台数据成功")),
    )
}

async fn check_attendance_status(pool: &PgPool, user_id: &str) -> String {
    let today_check_in = sqlx::query(
        "SELECT check_in_time FROM mobile_attendance WHERE user_id = $1 AND date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await;

    let today_check_out = sqlx::query(
        "SELECT check_out_time FROM mobile_attendance WHERE user_id = $1 AND date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await;

    match (today_check_in, today_check_out) {
        (Ok(Some(_)), Ok(Some(_))) => "checked_out".to_string(),
        (Ok(Some(_)), Ok(None)) => "checked_in".to_string(),
        _ => "not_checked_in".to_string(),
    }
}

async fn calculate_quality_pass_rate(pool: &PgPool) -> f64 {
    let total = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.quality_tasks WHERE status = 'passed' AND created_at >= CURRENT_DATE",
    )
    .fetch_one(pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let passed = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.quality_tasks WHERE status = 'passed' AND created_at >= CURRENT_DATE",
    )
    .fetch_one(pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    if total == 0 {
        0.0
    } else {
        (passed as f64 / total as f64) * 100.0
    }
}

async fn get_shortcuts(pool: &PgPool, user_id: &str) -> Vec<Shortcut> {
    let rows = sqlx::query(
        "SELECT id, name, icon, path, color FROM plugin_mobile.shortcuts WHERE user_id = $1 OR user_id IS NULL ORDER BY sort_order",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await;

    match rows {
        Ok(rows) => rows
            .into_iter()
            .map(|r| Shortcut {
                id: r.get::<String, _>("id"),
                name: r.get::<String, _>("name"),
                icon: r.get::<String, _>("icon"),
                path: r.get::<String, _>("path"),
                color: r.get::<String, _>("color"),
            })
            .collect(),
        Err(_) => vec![
            Shortcut {
                id: "patrol".to_string(),
                name: "巡检".to_string(),
                icon: "patrol".to_string(),
                path: "/mobile/patrol".to_string(),
                color: "#1890ff".to_string(),
            },
            Shortcut {
                id: "scan".to_string(),
                name: "扫码".to_string(),
                icon: "scan".to_string(),
                path: "/mobile/scan".to_string(),
                color: "#52c41a".to_string(),
            },
            Shortcut {
                id: "approval".to_string(),
                name: "审批".to_string(),
                icon: "approval".to_string(),
                path: "/mobile/approval".to_string(),
                color: "#faad14".to_string(),
            },
            Shortcut {
                id: "task".to_string(),
                name: "任务".to_string(),
                icon: "task".to_string(),
                path: "/mobile/task".to_string(),
                color: "#722ed1".to_string(),
            },
            Shortcut {
                id: "attendance".to_string(),
                name: "考勤".to_string(),
                icon: "attendance".to_string(),
                path: "/mobile/attendance".to_string(),
                color: "#13c2c2".to_string(),
            },
            Shortcut {
                id: "inventory".to_string(),
                name: "库存".to_string(),
                icon: "inventory".to_string(),
                path: "/mobile/inventory".to_string(),
                color: "#eb2f96".to_string(),
            },
        ],
    }
}
