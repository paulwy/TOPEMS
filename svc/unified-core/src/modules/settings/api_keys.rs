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

use crate::modules::settings::tenant_uuid;
use crate::AppState;
use axum::extract::{Path, State};
use axum::{Extension, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
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
    pub created_at: String,
    pub last_used: Option<String>,
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
            chars[chars.len() - 4..].iter().collect::<String>()
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
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ApiKeyEntry>>> {
    let tenant_id = tenant_uuid(&claims);
    let pattern = format!("{}%", API_KEY_PREFIX);

    let result = sqlx::query(
        "SELECT setting_key, setting_value, updated_at FROM core_tenant_settings WHERE tenant_id = $1 AND setting_key LIKE $2 ORDER BY updated_at DESC",
    )
    .bind(tenant_id)
    .bind(&pattern)
    .fetch_all(&state.pool)
    .await;

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
                entry.secret = mask_secret(&entry.secret);
                entry.created_at = updated_at.to_rfc3339();
                entries.push(entry);
            }
            Json(ApiResponse::success(entries, "获取 API Key 列表成功"))
        }
        Err(e) => {
            tracing::error!("Failed to list API keys: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("获取 API Key 列表失败: {}", e),
            ))
        }
    }
}

/// `POST /system/api-keys`
pub async fn create_api_key(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateApiKeyRequest>,
) -> Json<ApiResponse<ApiKeyEntry>> {
    if payload.name.trim().is_empty() {
        return Json(ApiResponse::error(400, "API Key 名称不能为空"));
    }
    if payload.secret.is_empty() {
        return Json(ApiResponse::error(400, "API Key 密钥不能为空"));
    }
    if !is_allowed_type(&payload.key_type) {
        return Json(ApiResponse::error(
            400,
            &format!("API Key 类型无效，允许: {}", ALLOWED_TYPES.join(", ")),
        ));
    }

    let tenant_id = tenant_uuid(&claims);
    let id = Uuid::new_v4().to_string();
    let key = setting_key(&id);
    let created_at = chrono::Utc::now().to_rfc3339();

    let entry = ApiKeyEntry {
        id: id.clone(),
        name: payload.name,
        key_type: payload.key_type,
        secret: payload.secret,
        created_at: created_at.clone(),
        last_used: None,
    };

    let serialized = match serde_json::to_string(&entry) {
        Ok(s) => s,
        Err(e) => {
            return Json(ApiResponse::error(
                500,
                &format!("序列化 API Key 失败: {}", e),
            ));
        }
    };

    let result = sqlx::query(
        r#"
        INSERT INTO core_tenant_settings (tenant_id, setting_key, setting_value, is_public)
        VALUES ($1, $2, $3, FALSE)
        "#,
    )
    .bind(tenant_id)
    .bind(&key)
    .bind(&serialized)
    .execute(&state.pool)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to create API key: {}", e);
        return Json(ApiResponse::error(
            500,
            &format!("创建 API Key 失败: {}", e),
        ));
    }

    // Return the entry with a masked secret.
    let mut response = entry;
    response.secret = mask_secret(&response.secret);
    Json(ApiResponse::success(response, "创建 API Key 成功"))
}

/// `DELETE /system/api-keys/{id}`
pub async fn delete_api_key(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = tenant_uuid(&claims);
    let key = setting_key(&id);

    let result =
        sqlx::query("DELETE FROM core_tenant_settings WHERE tenant_id = $1 AND setting_key = $2")
            .bind(tenant_id)
            .bind(&key)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({ "id": id }),
            "删除 API Key 成功",
        )),
        Ok(_) => Json(ApiResponse::error(404, "API Key 不存在")),
        Err(e) => {
            tracing::error!("Failed to delete API key: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("删除 API Key 失败: {}", e),
            ))
        }
    }
}
