use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use topems_shared::Claims;

use super::models::is_valid_email;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CheckEmailQuery {
    pub email: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct CheckUsernameQuery {
    pub username: String,
}

/// GET /users/check-email?email=xxx — 检查邮箱可用性
pub async fn check_email_availability(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<CheckEmailQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user check_email_availability called with email: {}",
        query.email
    );

    let email = query.email.trim();

    if email.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "email 不能为空",
                "data": null,
                "code": 400
            })),
        );
    }

    if !is_valid_email(email) {
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "邮箱格式不正确",
                "data": {
                    "available": false
                },
                "code": 200
            })),
        );
    }

    let existing_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE email = $1")
            .bind(email)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check email: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询邮箱失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    let available = existing_count == 0;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": if available { "邮箱可用" } else { "邮箱已被占用" },
            "data": {
                "available": available
            },
            "code": 200
        })),
    )
}

/// GET /users/check-username?username=xxx — 检查用户名可用性
pub async fn check_username_availability(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<CheckUsernameQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user check_username_availability called with username: {}",
        query.username
    );

    let username = query.username.trim();

    if username.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "username 不能为空",
                "data": null,
                "code": 400
            })),
        );
    }

    let existing_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE username = $1")
            .bind(username)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check username: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户名失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    let available = existing_count == 0;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": if available { "用户名可用" } else { "用户名已被占用" },
            "data": {
                "available": available
            },
            "code": 200
        })),
    )
}
