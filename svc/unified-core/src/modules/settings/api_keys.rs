//! API Key vault handlers (P36-5)
//!
//! Endpoints:
//! - `GET /system/api-keys` — list stored API keys (secret masked to last 4)
//! - `POST /system/api-keys` — create a new API key entry
//! - `DELETE /system/api-keys/{id}` — delete an API key
//!
//! Keys are stored as individual rows in `core_tenant_settings` with the
//! `setting_key` prefix `api_key_{uuid}`. The `setting_value` column holds a
//! JSON blob `{name, key_type, secret, created_at, last_used}`.

use crate::modules::settings::{decrypt_secret, encrypt_secret, tenant_uuid};
use crate::AppState;
use axum::extract::{Path, State};
use axum::{Extension, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

const API_KEY_PREFIX: &str = "api_key_";

/// Allowed API key types.
const ALLOWED_TYPES: &[&str] = &["feishu", "dingtalk", "wecom", "smtp", "other"];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyEntry {
    pub id: String,
    pub name: String,
    pub key_type: String,
    pub secret: String,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub key_type: String,
    pub secret: String,
}

/// Mask a secret, showing only the last 4 characters.
fn mask_secret(secret: &str) -> String {
    let chars: Vec<char> = secret.chars().collect();
    if chars.len() <= 4 {
        "****".to_string()
    } else {
        format!(
            "****{}",
            chars
                .get(chars.len() - 4..)
                .map(|s| s.iter().collect::<String>())
                .unwrap_or_default()
        )
    }
}

fn setting_key(id: &str) -> String {
    format!("{}{}", API_KEY_PREFIX, id)
}

fn is_allowed_type(t: &str) -> bool {
    ALLOWED_TYPES.contains(&t)
}

/// `GET /system/api-keys`
pub async fn list_api_keys(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<ApiKeyEntry>> {
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(tenant_uuid(&claims))
    };
    let pattern = format!("{}%", API_KEY_PREFIX);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal(
            "获取 API Key 列表失败",
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to create API key read scope: {}", e);
            return ApiResponse::from(TopemsError::internal("获取 API Key 列表失败", e));
        }
    };

    let result = sqlx::query(
        "SELECT setting_key, setting_value, updated_at FROM public.core_tenant_settings WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND setting_key LIKE $2 ORDER BY updated_at DESC",
    )
    .bind(tenant_id)
    .bind(&pattern)
    .fetch_all(&mut scope)
    .await;

    scope.commit().await.ok();

    match result {
        Ok(rows) => {
            let mut entries: Vec<ApiKeyEntry> = Vec::new();
            for row in rows {
                let setting_key: String = row.get("setting_key");
                let raw: String = row.get("setting_value");
                let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");
                let id = setting_key
                    .strip_prefix(API_KEY_PREFIX)
                    .unwrap_or(&setting_key)
                    .to_string();

                let mut entry = match serde_json::from_str::<ApiKeyEntry>(&raw) {
                    Ok(e) => e,
                    Err(_) => continue,
                };
                // Use the canonical id from the row (not the stored value).
                entry.id = id;
                // Decrypt the stored secret (no-op for legacy plain text) before
                // applying the response mask.
                entry.secret = mask_secret(&decrypt_secret(&state, &entry.secret));
                entry.created_at = updated_at;
                entries.push(entry);
            }
            ApiResponse::success(entries, "获取 API Key 列表成功")
        }
        Err(e) => {
            tracing::error!("Failed to list API keys: {}", e);
            ApiResponse::from(TopemsError::internal("获取 API Key 列表失败", e))
        }
    }
}

/// `POST /system/api-keys`
pub async fn create_api_key(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateApiKeyRequest>,
) -> ApiResponse<ApiKeyEntry> {
    if payload.name.trim().is_empty() {
        return ApiResponse::bad_request("API Key 名称不能为空");
    }
    if payload.secret.is_empty() {
        return ApiResponse::bad_request("API Key 密钥不能为空");
    }
    if !is_allowed_type(&payload.key_type) {
        return ApiResponse::bad_request(&format!(
            "API Key 类型无效，允许: {}",
            ALLOWED_TYPES.join(", ")
        ));
    }

    let tenant_id = tenant_uuid(&claims);
    let id = Uuid::new_v4().to_string();
    let key = setting_key(&id);
    let created_at = chrono::Utc::now();

    // Keep the plaintext secret around so the response can mask the real value
    // rather than the ciphertext.
    let plaintext_secret = payload.secret.clone();

    let entry = ApiKeyEntry {
        id: id.clone(),
        name: payload.name,
        key_type: payload.key_type,
        secret: encrypt_secret(&state, &plaintext_secret),
        created_at,
        last_used: None,
    };

    let serialized = match serde_json::to_string(&entry) {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::from(TopemsError::internal("序列化 API Key 失败", e));
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal(
            "创建 API Key 失败",
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to create API key write scope: {}", e);
            return ApiResponse::from(TopemsError::internal("创建 API Key 失败", e));
        }
    };

    let result = sqlx::query(
        r#"
        INSERT INTO public.core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES ($1, $2, $3, FALSE)
        "#,
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&serialized)
    .execute(&mut scope)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to create API key: {}", e);
        return ApiResponse::from(TopemsError::internal("创建 API Key 失败", e));
    }

    scope.commit().await.ok();

    // Return the entry with a masked secret (mask the plaintext, not the
    // ciphertext that was persisted).
    let mut response = entry;
    response.secret = mask_secret(&plaintext_secret);
    ApiResponse::success(response, "创建 API Key 成功")
}

/// `DELETE /system/api-keys/{id}`
pub async fn delete_api_key(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = tenant_uuid(&claims);
    let key = setting_key(&id);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal(
            "删除 API Key 失败",
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to create API key write scope: {}", e);
            return ApiResponse::from(TopemsError::internal("删除 API Key 失败", e));
        }
    };

    let result =
        sqlx::query("UPDATE public.core_tenant_settings SET deleted_at = NOW() WHERE tenant_id = $1 AND setting_key = $2")
            .bind(tenant_id)
            .bind(&key)
            .execute(&mut scope)
            .await;

    scope.commit().await.ok();

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({ "id": id }), "删除 API Key 成功")
        }
        Ok(_) => ApiResponse::not_found("API Key 不存在"),
        Err(e) => {
            tracing::error!("Failed to delete API key: {}", e);
            ApiResponse::from(TopemsError::internal("删除 API Key 失败", e))
        }
    }
}

/// `GET /system/api-keys/{id}`
pub async fn get_api_key(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> ApiResponse<ApiKeyEntry> {
    let tenant_id = tenant_uuid(&claims);
    let key = setting_key(&id);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal(
            "获取 API Key 详情失败",
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to create API key read scope: {}", e);
            return ApiResponse::from(TopemsError::internal("获取 API Key 详情失败", e));
        }
    };

    let result = sqlx::query(
        "SELECT setting_key, setting_value, updated_at FROM public.core_tenant_settings WHERE tenant_id = $1 AND setting_key = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(&key)
    .fetch_one(&mut scope)
    .await;

    scope.commit().await.ok();

    match result {
        Ok(row) => {
            let setting_key: String = row.get("setting_key");
            let raw: String = row.get("setting_value");
            let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");

            let mut entry = match serde_json::from_str::<ApiKeyEntry>(&raw) {
                Ok(e) => e,
                Err(e) => {
                    return ApiResponse::from(TopemsError::internal("解析 API Key 数据失败", e));
                }
            };
            entry.id = setting_key
                .strip_prefix(API_KEY_PREFIX)
                .unwrap_or(&setting_key)
                .to_string();
            entry.secret = mask_secret(&decrypt_secret(&state, &entry.secret));
            entry.created_at = updated_at;
            ApiResponse::success(entry, "获取 API Key 详情成功")
        }
        Err(sqlx::error::Error::RowNotFound) => ApiResponse::not_found("API Key 不存在"),
        Err(e) => {
            tracing::error!("Failed to get API key: {}", e);
            ApiResponse::from(TopemsError::internal("获取 API Key 详情失败", e))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    pub key_type: Option<String>,
    pub secret: Option<String>,
}

/// `PUT /system/api-keys/{id}`
pub async fn update_api_key(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateApiKeyRequest>,
) -> ApiResponse<ApiKeyEntry> {
    let tenant_id = tenant_uuid(&claims);
    let key = setting_key(&id);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::from(TopemsError::internal(
            "更新 API Key 失败",
            "RLS 事务中间件未注入",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to create API key write scope: {}", e);
            return ApiResponse::from(TopemsError::internal("更新 API Key 失败", e));
        }
    };

    let existing = sqlx::query(
        "SELECT setting_key, setting_value, updated_at FROM public.core_tenant_settings WHERE tenant_id = $1 AND setting_key = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(&key)
    .fetch_one(&mut scope)
    .await;

    let row = match existing {
        Ok(row) => row,
        Err(sqlx::error::Error::RowNotFound) => {
            return ApiResponse::not_found("API Key 不存在");
        }
        Err(e) => {
            tracing::error!("Failed to load API key for update: {}", e);
            return ApiResponse::from(TopemsError::internal("更新 API Key 失败", e));
        }
    };

    let setting_key: String = row.get("setting_key");
    let raw: String = row.get("setting_value");
    let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");

    let mut entry = match serde_json::from_str::<ApiKeyEntry>(&raw) {
        Ok(e) => e,
        Err(e) => {
            return ApiResponse::from(TopemsError::internal("解析 API Key 数据失败", e));
        }
    };

    if let Some(name) = payload.name {
        if name.trim().is_empty() {
            return ApiResponse::bad_request("API Key 名称不能为空");
        }
        entry.name = name;
    }
    if let Some(key_type) = payload.key_type {
        if !is_allowed_type(&key_type) {
            return ApiResponse::bad_request(&format!(
                "API Key 类型无效，允许: {}",
                ALLOWED_TYPES.join(", ")
            ));
        }
        entry.key_type = key_type;
    }
    if let Some(secret) = payload.secret {
        if secret.is_empty() {
            return ApiResponse::bad_request("API Key 密钥不能为空");
        }
        entry.secret = encrypt_secret(&state, &secret);
    }

    let serialized = match serde_json::to_string(&entry) {
        Ok(s) => s,
        Err(e) => {
            return ApiResponse::from(TopemsError::internal("序列化 API Key 失败", e));
        }
    };

    let result = sqlx::query(
        "UPDATE public.core_tenant_settings SET setting_value = $1, updated_at = NOW() WHERE tenant_id = $2 AND setting_key = $3 AND deleted_at IS NULL",
    )
    .bind(&serialized)
    .bind(tenant_id)
    .bind(&key)
    .execute(&mut scope)
    .await;

    scope.commit().await.ok();

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            let mut response = entry;
            response.id = setting_key
                .strip_prefix(API_KEY_PREFIX)
                .unwrap_or(&setting_key)
                .to_string();
            response.secret = mask_secret(&decrypt_secret(&state, &response.secret));
            response.created_at = updated_at;
            ApiResponse::success(response, "更新 API Key 成功")
        }
        Ok(_) => ApiResponse::not_found("API Key 不存在"),
        Err(e) => {
            tracing::error!("Failed to update API key: {}", e);
            ApiResponse::from(TopemsError::internal("更新 API Key 失败", e))
        }
    }
}
