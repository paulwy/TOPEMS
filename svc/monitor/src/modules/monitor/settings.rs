//! Monitor 设置持久化 Handlers
//!
//! 提供通用 key-value 设置存储，支持批量读写。
//! - GET  /settings          — 获取所有设置（key -> value JSON）
//! - PUT  /settings          — 批量 upsert 设置（接收 key-value map）
//! - GET  /settings/{key}    — 获取单个设置
//! - PUT  /settings/{key}    — 更新单个设置
//! - DELETE /settings/{key}  — 删除单个设置

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::Row;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Serialize)]
pub struct SettingItem {
    pub key: String,
    pub value: JsonValue,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SettingsQuery {
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchUpdateRequest {
    pub settings: std::collections::HashMap<String, JsonValue>,
}

#[derive(Debug, Deserialize)]
pub struct SingleUpdateRequest {
    pub value: JsonValue,
    pub category: Option<String>,
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/settings", get(list_settings))
        .route("/settings", put(batch_update_settings))
        .route("/settings/{key}", get(get_setting))
        .route("/settings/{key}", put(update_setting))
        .route("/settings/{key}", delete(delete_setting))
}

/// GET /settings — 获取当前租户所有设置
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings",
    responses(
        (status = 200, description = "设置列表", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn list_settings(
    State(state): State<AppState>,
    Query(params): Query<SettingsQuery>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<std::collections::HashMap<String, JsonValue>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    // 读出作用域（只读事务 + SET LOCAL search_path=public）。
    let mut scope = match state.db.scope_read().await {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::<std::collections::HashMap<String, JsonValue>>::from(
                TopemsError::internal("获取设置列表失败", e),
            )
        }
    };

    let rows = if let Some(cat) = &params.category {
        sqlx::query(
            "SELECT key, value FROM public.monitor_settings
             WHERE (tenant_id IS NULL OR tenant_id = $1) AND category = $2
             ORDER BY key",
        )
        .bind(tenant_id)
        .bind(cat)
        .fetch_all(&mut scope)
        .await
    } else {
        sqlx::query(
            "SELECT key, value FROM public.monitor_settings
             WHERE (tenant_id IS NULL OR tenant_id = $1)
             ORDER BY key",
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await
    };

    if let Err(e) = scope.commit().await {
        return ApiResponse::<std::collections::HashMap<String, JsonValue>>::from(
            TopemsError::internal("获取设置列表失败", e),
        );
    }

    let mut map = std::collections::HashMap::new();
    match rows {
        Ok(rows) => {
            for row in rows {
                let key: String = row.try_get("key").unwrap_or_default();
                let value: JsonValue = row.try_get("value").unwrap_or(JsonValue::Null);
                map.insert(key, value);
            }
        }
        Err(e) => {
            return ApiResponse::<std::collections::HashMap<String, JsonValue>>::from(
                TopemsError::internal("获取设置列表失败", e),
            );
        }
    }

    ApiResponse::success(map, "获取设置成功")
}

/// PUT /settings — 批量 upsert 设置
#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings",
    responses(
        (status = 200, description = "批量更新设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn batch_update_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BatchUpdateRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut updated = 0;

    for (key, value) in &payload.settings {
        let category = key.split('_').next().map(|s| s.to_string());
        // 逐 key 独立事务：与改造前的 autocommit 语义一致（单条失败不影响其它 key）。
        let mut scope = match state.db.scope().await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("设置保存作用域创建失败: {}", e);
                continue;
            }
        };
        let result = sqlx::query(
            "INSERT INTO public.monitor_settings (tenant_id, key, value, category)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tenant_id, key) DO UPDATE
             SET value = EXCLUDED.value, category = EXCLUDED.category, updated_at = CURRENT_TIMESTAMP",
        )
        .bind(tenant_id)
        .bind(key)
        .bind(value)
        .bind(category)
        .execute(&mut scope)
        .await;

        if result.is_ok() && scope.commit().await.is_ok() {
            updated += 1;
        }
    }

    ApiResponse::success(
        serde_json::json!({ "updated": updated, "total": payload.settings.len() }),
        "设置保存成功",
    )
}

/// GET /settings/{key} — 获取单个设置
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings/{key}",
    params(
        ("key" = String, Path, description = "设置键")
    ),
    responses(
        (status = 200, description = "获取设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn get_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<SettingItem> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    let mut scope = match state.db.scope_read().await {
        Ok(s) => s,
        Err(e) => return ApiResponse::<SettingItem>::from(TopemsError::internal("操作失败", e)),
    };

    let fetched = sqlx::query(
        "SELECT key, value, category FROM public.monitor_settings
         WHERE (tenant_id IS NULL OR tenant_id = $1) AND key = $2",
    )
    .bind(tenant_id)
    .bind(&key)
    .fetch_optional(&mut scope)
    .await;

    if let Err(e) = scope.commit().await {
        return ApiResponse::<SettingItem>::from(TopemsError::internal("操作失败", e));
    }

    match fetched {
        Ok(Some(row)) => {
            let k: String = row.try_get("key").unwrap_or(key);
            let v: JsonValue = row.try_get("value").unwrap_or(JsonValue::Null);
            let cat: Option<String> = row.try_get("category").ok();
            ApiResponse::success(
                SettingItem {
                    key: k,
                    value: v,
                    category: cat,
                },
                "获取设置成功",
            )
        }
        Ok(None) => ApiResponse::<SettingItem>::not_found("设置不存在"),
        Err(e) => ApiResponse::<SettingItem>::from(TopemsError::internal("操作失败", e)),
    }
}

/// PUT /settings/{key} — 更新单个设置
#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings/{key}",
    params(
        ("key" = String, Path, description = "设置键")
    ),
    responses(
        (status = 200, description = "更新设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn update_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<SingleUpdateRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let category = payload
        .category
        .or_else(|| key.split('_').next().map(|s| s.to_string()));

    let mut scope = match state.db.scope().await {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    };

    let result = sqlx::query(
        "INSERT INTO public.monitor_settings (tenant_id, key, value, category)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, key) DO UPDATE
         SET value = EXCLUDED.value, category = EXCLUDED.category, updated_at = CURRENT_TIMESTAMP",
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&payload.value)
    .bind(category)
    .execute(&mut scope)
    .await;

    match result {
        Ok(_) => match scope.commit().await {
            Ok(()) => ApiResponse::success(serde_json::json!({ "key": key }), "设置更新成功"),
            Err(e) => ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e)),
        },
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    }
}

/// DELETE /settings/{key} — 删除单个设置
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/settings/{key}",
    params(
        ("key" = String, Path, description = "设置键")
    ),
    responses(
        (status = 200, description = "删除设置", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settings"
)]
pub async fn delete_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    let mut scope = match state.db.scope().await {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    };

    let result = sqlx::query(
        "DELETE FROM public.monitor_settings WHERE (tenant_id IS NULL OR tenant_id = $1) AND key = $2",
    )
    .bind(tenant_id)
    .bind(&key)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => match scope.commit().await {
            Ok(()) => ApiResponse::success(serde_json::json!({ "key": key }), "设置删除成功"),
            Err(e) => ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e)),
        },
        Ok(_) => {
            let _ = scope.rollback().await;
            ApiResponse::<serde_json::Value>::not_found("设置不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::<serde_json::Value>::from(TopemsError::internal("操作失败", e))
        }
    }
}
