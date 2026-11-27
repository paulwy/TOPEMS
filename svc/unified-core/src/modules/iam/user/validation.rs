use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

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
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/users/check-email",
    tag = "Core-IAM",
    responses((status = 200, description = "Core users/check-email GET"), (status = 500, description = "服务内部错误")),
)]
pub async fn check_email_availability(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<CheckEmailQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "数据库事务上下文缺失",
            )),
        );
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 用户作用域失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    tracing::info!(
        "IAM user check_email_availability called with email: {}",
        query.email
    );

    let email = query.email.trim();

    if email.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "email 不能为空",
            )),
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
        match sqlx::query_scalar("SELECT COUNT(*) FROM iam.users WHERE email = $1")
            .bind(email)
            .fetch_one(&mut rls_scope)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check email: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询邮箱失败: {}", e),
                    )),
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
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/users/check-username",
    tag = "Core-IAM",
    responses((status = 200, description = "Core users/check-username GET"), (status = 500, description = "服务内部错误")),
)]
pub async fn check_username_availability(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<CheckUsernameQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "数据库事务上下文缺失",
            )),
        );
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 用户作用域失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    tracing::info!(
        "IAM user check_username_availability called with username: {}",
        query.username
    );

    let username = query.username.trim();

    if username.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "username 不能为空",
            )),
        );
    }

    let existing_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM iam.users WHERE username = $1")
            .bind(username)
            .fetch_one(&mut rls_scope)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check username: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询用户名失败: {}", e),
                    )),
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
