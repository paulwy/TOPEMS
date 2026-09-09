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
pub async fn list_settings(
    State(state): State<AppState>,
    Query(params): Query<SettingsQuery>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<std::collections::HashMap<String, JsonValue>>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    let rows = if let Some(cat) = &params.category {
        sqlx::query(
            "SELECT key, value FROM public.monitor_settings
             WHERE (tenant_id IS NULL OR tenant_id = $1) AND category = $2
             ORDER BY key",
        )
        .bind(tenant_id)
        .bind(cat)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query(
            "SELECT key, value FROM public.monitor_settings
             WHERE (tenant_id IS NULL OR tenant_id = $1)
             ORDER BY key",
        )
        .bind(tenant_id)
        .fetch_all(&state.pool)
        .await
    };

    let mut map = std::collections::HashMap::new();
    match rows {
        Ok(rows) => {
            for row in rows {
                let key: String = row.try_get("key").unwrap_or_default();
                let value: JsonValue = row.try_get("value").unwrap_or(JsonValue::Null);
                map.insert(key, value);
            }
        }
        Err(e) => return Json(ApiResponse::<std::collections::HashMap<String, JsonValue>>::error(500, &e.to_string())),
    }

    Json(ApiResponse::success(map, "获取设置成功"))
}

/// PUT /settings — 批量 upsert 设置
pub async fn batch_update_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<BatchUpdateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let mut updated = 0;

    for (key, value) in &payload.settings {
        let category = key.split('_').next().map(|s| s.to_string());
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
        .execute(&state.pool)
        .await;

        if result.is_ok() {
            updated += 1;
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({ "updated": updated, "total": payload.settings.len() }),
        "设置保存成功",
    ))
}

/// GET /settings/{key} — 获取单个设置
pub async fn get_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<SettingItem>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    match sqlx::query(
        "SELECT key, value, category FROM public.monitor_settings
         WHERE (tenant_id IS NULL OR tenant_id = $1) AND key = $2",
    )
    .bind(tenant_id)
    .bind(&key)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => {
            let k: String = row.try_get("key").unwrap_or(key);
            let v: JsonValue = row.try_get("value").unwrap_or(JsonValue::Null);
            let cat: Option<String> = row.try_get("category").ok();
            Json(ApiResponse::success(SettingItem { key: k, value: v, category: cat }, "获取设置成功"))
        }
        Ok(None) => Json(ApiResponse::<SettingItem>::error(404, "设置不存在")),
        Err(e) => Json(ApiResponse::<SettingItem>::error(500, &e.to_string())),
    }
}

/// PUT /settings/{key} — 更新单个设置
pub async fn update_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<SingleUpdateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let category = payload.category.or_else(|| key.split('_').next().map(|s| s.to_string()));

    match sqlx::query(
        "INSERT INTO public.monitor_settings (tenant_id, key, value, category)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, key) DO UPDATE
         SET value = EXCLUDED.value, category = EXCLUDED.category, updated_at = CURRENT_TIMESTAMP",
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&payload.value)
    .bind(category)
    .execute(&state.pool)
    .await
    {
        Ok(_) => Json(ApiResponse::success(serde_json::json!({ "key": key }), "设置更新成功")),
        Err(e) => Json(ApiResponse::<serde_json::Value>::error(500, &e.to_string())),
    }
}

/// DELETE /settings/{key} — 删除单个设置
pub async fn delete_setting(
    State(state): State<AppState>,
    Path(key): Path<String>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    match sqlx::query(
        "DELETE FROM public.monitor_settings WHERE (tenant_id IS NULL OR tenant_id = $1) AND key = $2",
    )
    .bind(tenant_id)
    .bind(&key)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success(serde_json::json!({ "key": key }), "设置删除成功"))
        }
        Ok(_) => Json(ApiResponse::<serde_json::Value>::error(404, "设置不存在")),
        Err(e) => Json(ApiResponse::<serde_json::Value>::error(500, &e.to_string())),
    }
}
