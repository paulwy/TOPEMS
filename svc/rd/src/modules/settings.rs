//! RD 模块设置 CRUD 端点
//!
//! 补齐 RsSettingsPage 的后端持久化。从 rs.module_settings 表读写设置项。
//! 路由：GET /settings/{category}、PUT /settings/{category}

use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new().route(
        "/settings/{category}",
        get(get_settings).put(update_settings),
    )
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSettingsRequest {
    pub settings: HashMap<String, String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/settings/{category}",
    params(
("category" = String, Path, description = "category")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn get_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(category): Path<String>,
) -> ApiResponse<serde_json::Value> {
    // 普通用户必须有有效租户，缺失即拒绝；行级隔离由请求作用域 + 表级 RLS 承担。
    if !claims.is_superuser
        && claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
            .is_none()
    {
        return ApiResponse::unauthorized("缺少租户上下文");
    }

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let db = state.db.clone();
    let mut scope = match db.scope_with(&mut *txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启请求事务作用域失败: {}", e);
            return ApiResponse::server_error("查询失败");
        }
    };

    let result = sqlx::query(
        "SELECT key, value FROM rs.module_settings \
         WHERE category = $1",
    )
    .bind(&category)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(rows) => {
            let mut settings = HashMap::new();
            for row in rows {
                let key: String = row.try_get("key").unwrap_or_default();
                let value: String = row.try_get("value").unwrap_or_default();
                settings.insert(key, value);
            }
            ApiResponse::success(
                serde_json::json!({
                    "category": category,
                    "settings": settings,
                }),
                "获取模块设置成功",
            )
        }
        Err(e) => {
            tracing::error!("获取RD模块设置失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取模块设置失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["rd:write"])),
    path = "/settings/{category}",
    params(
        ("category" = String, Path, description = "category")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn update_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(category): Path<String>,
    Json(req): Json<UpdateSettingsRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());
    let now = chrono::Utc::now().naive_utc();

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let db = state.db.clone();
    let mut scope = match db.scope_with(&mut *txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启请求事务作用域失败: {}", e);
            return ApiResponse::server_error("更新设置项失败");
        }
    };

    let mut updated = 0;
    for (key, value) in &req.settings {
        let result = sqlx::query(
            r#"
            INSERT INTO rs.module_settings (tenant_id, category, key, value, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $5)
            ON CONFLICT (tenant_id, category, key)
            DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(tenant_id)
        .bind(&category)
        .bind(key)
        .bind(value)
        .bind(now)
        .execute(&mut scope)
        .await;

        match result {
            Ok(_) => updated += 1,
            Err(e) => {
                tracing::error!("更新RD模块设置失败 (key={}): {}", key, e);
                return ApiResponse::from(TopemsError::Internal("更新设置项失败".to_string()));
            }
        }
    }

    drop(scope);
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::server_error("事务提交失败");
        }
    }

    ApiResponse::success(
        serde_json::json!({
            "category": category,
            "updated_count": updated,
            "settings": req.settings,
        }),
        "模块设置更新成功",
    )
}
