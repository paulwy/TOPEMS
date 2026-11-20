// ERP · 系统设置模块
//
// 缺口#22：前端 systemSettingApi（apps/web/src/api/admin/systemSetting.ts）
// 调用 /api/erp/system/settings CRUD+batch，此前全库无路由。
// 表：system_settings（id, tenant_id, key, value, description, category, created_at, updated_at）

use axum::{
    extract::{Path, Query, State},
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/system/settings", get(list_settings).post(create_setting))
        .route("/system/settings/batch", put(batch_update_settings))
        .route(
            "/system/settings/{key}",
            get(get_setting).put(update_setting).delete(delete_setting),
        )
}

// ─── Models ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SystemSetting {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub category: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListSettingsQuery {
    pub category: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSettingRequest {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub category: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingRequest {
    pub value: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchUpdateRequest {
    pub settings: Value,
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/system/settings",
    responses(
        (status = 200, description = "list_settings OK")
    ),
    tag = "ERP/settings"
)]

pub async fn list_settings(
    State(pool): State<PgPool>,
    Query(params): Query<ListSettingsQuery>,
) -> ApiResponse<Vec<SystemSetting>> {
    let category = params.category.clone();
    let search = params.search.clone().unwrap_or_default();

    let items: Vec<SystemSetting> = sqlx::query_as(
        r#"SELECT * FROM public.system_settings
           WHERE ($1::text IS NULL OR category = $1)
             AND ($2 = '' OR key ILIKE '%' || $2 || '%' OR value ILIKE '%' || $2 || '%')
           ORDER BY category, key"#,
    )
    .bind(&category)
    .bind(&search)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    ApiResponse::success(items, "查询成功")
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/system/settings/{key}",
    params(
        ("key" = String, Path, description = "key")
    ),
    responses(
        (status = 200, description = "get_setting OK")
    ),
    tag = "ERP/settings"
)]

pub async fn get_setting(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
) -> ApiResponse<SystemSetting> {
    let setting: Result<SystemSetting, _> =
        sqlx::query_as("SELECT * FROM public.system_settings WHERE key = $1")
            .bind(&key)
            .fetch_one(&pool)
            .await;

    match setting {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("设置项不存在".to_string()))
            } else {
                tracing::error!("查询设置项失败: {}", e);
                ApiResponse::from(TopemsError::Internal("查询设置项失败".to_string()))
            }
        }
    }
}

pub async fn create_setting(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateSettingRequest>,
) -> ApiResponse<SystemSetting> {
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"INSERT INTO public.system_settings (key, value, description, category)
           VALUES ($1, $2, $3, $4)
           RETURNING *"#,
    )
    .bind(&payload.key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&payload.category)
    .fetch_one(&pool)
    .await;

    match setting {
        Ok(v) => ApiResponse::success(v, "创建成功"),
        Err(e) => {
            tracing::error!("创建设置项失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建设置项失败".to_string()))
        }
    }
}

pub async fn update_setting(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
    Json(payload): Json<UpdateSettingRequest>,
) -> ApiResponse<SystemSetting> {
    let setting: Result<SystemSetting, _> = sqlx::query_as(
        r#"UPDATE public.system_settings SET
              value = COALESCE($2, value),
              description = COALESCE($3, description),
              category = COALESCE($4, category),
              updated_at = NOW()
           WHERE key = $1 RETURNING *"#,
    )
    .bind(&key)
    .bind(&payload.value)
    .bind(&payload.description)
    .bind(&payload.category)
    .fetch_one(&pool)
    .await;

    match setting {
        Ok(v) => ApiResponse::success(v, "更新成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                ApiResponse::from(TopemsError::ResourceNotFound("设置项不存在".to_string()))
            } else {
                tracing::error!("更新设置项失败: {}", e);
                ApiResponse::from(TopemsError::Internal("更新设置项失败".to_string()))
            }
        }
    }
}

pub async fn delete_setting(
    State(pool): State<PgPool>,
    Path(key): Path<String>,
) -> ApiResponse<String> {
    let result = sqlx::query("DELETE FROM public.system_settings WHERE key = $1")
        .bind(&key)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success("删除成功".to_string(), "删除成功"),
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("设置项不存在".to_string())),
        Err(e) => {
            tracing::error!("删除设置项失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除设置项失败".to_string()))
        }
    }
}
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/system/settings/batch",
    responses(
        (status = 200, description = "batch_update_settings OK")
    ),
    tag = "ERP/settings"
)]

pub async fn batch_update_settings(
    State(pool): State<PgPool>,
    Json(payload): Json<BatchUpdateRequest>,
) -> ApiResponse<Vec<SystemSetting>> {
    let settings_map = match payload.settings.as_object() {
        Some(m) => m,
        None => {
            return ApiResponse::from(TopemsError::ValidationFailed(
                "settings 必须为对象".to_string(),
            ))
        }
    };

    let mut updated = Vec::new();

    for (key, value) in settings_map {
        let value_str = match value {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        };

        let result: Result<SystemSetting, _> = sqlx::query_as(
            r#"INSERT INTO public.system_settings (key, value, category)
               VALUES ($1, $2, 'general')
               ON CONFLICT (tenant_id, key) DO UPDATE
               SET value = EXCLUDED.value, updated_at = NOW()
               RETURNING *"#,
        )
        .bind(key)
        .bind(&value_str)
        .fetch_one(&pool)
        .await;

        if let Ok(s) = result {
            updated.push(s);
        }
    }

    ApiResponse::success(updated, "批量更新成功")
}
