//! MES 模块设置 CRUD 端点
//!
//! 补齐 mes 4 个设置页的后端持久化。从 mes.module_settings 表读写设置项。
//! 路由：GET /settings/{category}、PUT /settings/{category}

use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_core::response::{api_error, ApiResponse};

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new().route("/settings/{category}", get(get_settings).put(update_settings))
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSettingsRequest {
    pub settings: HashMap<String, String>,
}

pub async fn get_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(category): Path<String>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "SELECT key, value FROM mes.module_settings WHERE tenant_id = $1 AND category = $2",
    )
    .bind(tenant_id)
    .bind(&category)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let mut settings = HashMap::new();
            for row in rows {
                let key: String = row.try_get("key").unwrap_or_default();
                let value: String = row.try_get("value").unwrap_or_default();
                settings.insert(key, value);
            }
            Json(ApiResponse::success(
                serde_json::json!({
                    "category": category,
                    "settings": settings,
                }),
                "获取模块设置成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取MES模块设置失败: {}", e);
            Json(api_error(500, "获取模块设置失败"))
        }
    }
}

pub async fn update_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(category): Path<String>,
    headers: HeaderMap,
    Json(req): Json<UpdateSettingsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = chrono::Utc::now().naive_utc();

    let mut updated = 0;
    for (key, value) in &req.settings {
        let result = sqlx::query(
            r#"
            INSERT INTO mes.module_settings (tenant_id, category, key, value, created_at, updated_at)
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
        .execute(&state.pool)
        .await;

        match result {
            Ok(_) => updated += 1,
            Err(e) => {
                tracing::error!("更新MES模块设置失败 (key={}): {}", key, e);
                return Json(api_error(500, &format!("更新设置项失败: {}", key)));
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "category": category,
            "updated_count": updated,
            "settings": req.settings,
        }),
        "模块设置更新成功",
    ))
}
