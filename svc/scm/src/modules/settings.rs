use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use topems_shared_boundary::only_own_schema_query;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/settings/{category}", get(get_settings).put(update_settings))
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSettingsRequest {
    pub settings: HashMap<String, String>,
}

pub async fn get_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(category): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT key, value
        FROM scm.module_settings
        WHERE category = $1
        "#
    ))
    .bind(&category)
    .fetch_all(&mut **txn)
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
            tracing::error!("获取模块设置失败: {}", e);
            Json(api_error(500, "获取模块设置失败"))
        }
    }
}

pub async fn update_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(category): Path<String>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateSettingsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let mut updated = 0;
    for (key, value) in &req.settings {
        let result = sqlx::query(only_own_schema_query!(
            "scm",
            r#"
            INSERT INTO scm.module_settings (category, key, value, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (tenant_id, category, key)
            DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
            "#
        ))
        .bind(&category)
        .bind(key)
        .bind(value)
        .bind(now)
        .execute(&mut **txn)
        .await;

        match result {
            Ok(_) => updated += 1,
            Err(e) => {
                tracing::error!("更新模块设置失败 (key={}): {}", key, e);
                return Json(api_error(500, &format!("更新设置项失败: {}", key)));
            }
        }
    }

    let response_data = serde_json::json!({
        "category": category,
        "updated_count": updated,
        "settings": req.settings,
    });

    log_audit_event(
        &state.db,
        "update".to_string(),
        "module_settings".to_string(),
        None,
        None,
        None,
        None,
        request_data,
        Some(response_data.clone()),
        "success".to_string(),
        None,
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        response_data,
        "模块设置更新成功",
    ))
}
