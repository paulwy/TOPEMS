use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use super::models::record_audit_log;
use crate::modules::iam::auth::validate_password_strength;
use crate::modules::iam::tenant_scope::{self, UserTarget};

pub async fn disable_user(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user disable_user called with id: {}", id);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法停用用户"),
    };

    match tenant_scope::check_user_target(&state.db, &txn_arc, scope, user_id, claims.is_superuser)
        .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权停用超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    let result =
        sqlx::query("UPDATE iam.users SET status = 'inactive', updated_at = NOW() WHERE id = $1")
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("User disabled successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "禁用用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "disable",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to disable user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("禁用用户失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "disable",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

pub async fn enable_user(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user enable_user called with id: {}", id);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法启用用户"),
    };

    match tenant_scope::check_user_target(&state.db, &txn_arc, scope, user_id, claims.is_superuser)
        .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权启用超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    let result =
        sqlx::query("UPDATE iam.users SET status = 'active', updated_at = NOW() WHERE id = $1")
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("User enabled successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "启用用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "enable",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to enable user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("启用用户失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "enable",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

pub async fn change_password(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user change_password called with id: {} and payload: {:?}",
        id,
        payload
    );

    // 仅允许超级管理员或本人修改密码
    if !claims.is_superuser && claims.sub != id {
        return (
            StatusCode::FORBIDDEN,
            Json(topems_shared_core::response::error_value(
                403,
                "无权修改他人密码",
            )),
        );
    }

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM iam.users WHERE id = $1::UUID")
            .bind(&id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询用户失败: {}", e),
                    )),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(topems_shared_core::response::error_value(404, "用户不存在")),
        );
    }

    let new_password = payload
        .get("new_password")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if new_password.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "新密码不能为空",
            )),
        );
    }
    if let Err(message) = validate_password_strength(new_password) {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(400, &message)),
        );
    }

    let hashed_password = bcrypt::hash(new_password, bcrypt::DEFAULT_COST).unwrap_or_else(|_| {
        tracing::error!("Failed to hash password");
        "".to_string()
    });

    if hashed_password.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "密码加密失败",
            )),
        );
    }

    let result =
        sqlx::query("UPDATE iam.users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
            .bind(hashed_password)
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("Password changed successfully for user: {}", id);
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "message": "修改密码成功",
                    "data": null,
                    "code": 200
                })),
            )
        }
        Err(e) => {
            tracing::error!("Failed to change password: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("修改密码失败: {}", e),
                )),
            )
        }
    }
}
