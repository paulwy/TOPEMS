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
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, require_tenant_bind, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

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
    security(("BearerAuth" = ["scm:settings:read"])),
    path = "/settings/{category}",
    params(
("category" = String, Path, description = "category")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/settings"
)]
pub async fn get_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(category): Path<String>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT key, value
        FROM scm.module_settings
        WHERE category = $1
          AND tenant_id = $2::uuid
        "#
    ))
    .bind(&category)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let mut settings = HashMap::new();
            for row in rows {
                let key: String = match row.try_get("key") {
                    Ok(key) => key,
                    Err(e) => {
                        tracing::error!("解析模块设置 key 失败: category={}, err={}", category, e);
                        return ApiResponse::from(TopemsError::internal("解析模块设置失败", e));
                    }
                };
                let value: String = match row.try_get("value") {
                    Ok(value) => value,
                    Err(e) => {
                        tracing::error!(
                            "解析模块设置 value 失败: category={}, key={}, err={}",
                            category,
                            key,
                            e
                        );
                        return ApiResponse::from(TopemsError::internal("解析模块设置失败", e));
                    }
                };
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
            tracing::error!("获取模块设置失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取模块设置失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/scm/settings/{category}",
    params(
        ("category" = String, Path, description = "category")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn update_settings(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(category): Path<String>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateSettingsRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now().naive_utc();

    let mut updated = 0;
    for (key, value) in &req.settings {
        let result = sqlx::query(only_own_schema_query!(
            "scm",
            r#"
            INSERT INTO scm.module_settings (category, key, value, created_at, updated_at, tenant_id)
            VALUES ($1, $2, $3, $4, $4, $5)
            ON CONFLICT (tenant_id, category, key)
            DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
            "#
        ))
        .bind(&category)
        .bind(key)
        .bind(value)
        .bind(now)
        .bind(tenant_bind)
        .execute(&mut **txn)
        .await;

        match result {
            Ok(_) => updated += 1,
            Err(e) => {
                tracing::error!("更新模块设置失败 (key={}): {}", key, e);
                return ApiResponse::from(TopemsError::Internal(format!(
                    "更新设置项失败: {}",
                    key
                )));
            }
        }
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    let response_data = serde_json::json!({
        "category": category,
        "updated_count": updated,
        "settings": req.settings,
    });

    log_audit_event(
        &state.system_pool,
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

    ApiResponse::success(response_data, "模块设置更新成功")
}
