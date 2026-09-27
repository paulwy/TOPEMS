use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::shared::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct AiSettings {
    pub default_model: String,
    pub max_tokens: i32,
    pub temperature: f64,
    pub enable_streaming: bool,
    pub enable_function_calling: bool,
    pub available_models: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAiSettingsRequest {
    pub default_model: Option<String>,
    pub max_tokens: Option<i32>,
    pub temperature: Option<f64>,
    pub enable_streaming: Option<bool>,
    pub enable_function_calling: Option<bool>,
    pub available_models: Option<Vec<String>>,
}

/// 获取AI配置
#[utoipa::path(
    get,
    path = "/api/ai/settings",
    tag = "AI",
    responses(
        (status = 200, description = "获取成功", body = Value)
    )
)]
pub async fn get_settings(State(state): State<AppState>) -> Json<Value> {
    let pool = &state.pool;

    // 从请求头获取租户ID
    let tenant_id = match get_tenant_id_from_header(&state).await {
        Some(id) => id,
        None => {
            // 如果没有租户ID，返回默认配置
            return Json(json!({
                "success": true,
                "data": {
                    "default_model": "gpt-3.5-turbo",
                    "max_tokens": 4096,
                    "temperature": 0.7,
                    "enable_streaming": true,
                    "enable_function_calling": true,
                    "available_models": ["gpt-3.5-turbo", "gpt-4", "claude-3-opus", "claude-3-sonnet"]
                }
            }));
        }
    };

    // 从数据库查询配置
    let result = sqlx::query!(
        "SELECT default_model, max_tokens, temperature, enable_streaming, enable_function_calling, available_models FROM ai.ai_settings WHERE tenant_id = $1",
        tenant_id
    )
    .fetch_optional(pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let available_models: Vec<String> =
                serde_json::from_value(row.available_models).unwrap_or_default();
            Json(json!({
                "success": true,
                "data": {
                    "default_model": row.default_model,
                    "max_tokens": row.max_tokens,
                    "temperature": row.temperature,
                    "enable_streaming": row.enable_streaming,
                    "enable_function_calling": row.enable_function_calling,
                    "available_models": available_models
                }
            }))
        }
        Ok(None) => {
            // 如果没有配置，插入默认配置
            let _ = sqlx::query!(
                "INSERT INTO ai.ai_settings (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING",
                tenant_id
            )
            .execute(pool)
            .await;

            // 返回默认配置
            Json(json!({
                "success": true,
                "data": {
                    "default_model": "gpt-3.5-turbo",
                    "max_tokens": 4096,
                    "temperature": 0.7,
                    "enable_streaming": true,
                    "enable_function_calling": true,
                    "available_models": ["gpt-3.5-turbo", "gpt-4", "claude-3-opus", "claude-3-sonnet"]
                }
            }))
        }
        Err(e) => {
            tracing::error!("获取AI配置失败: {}", e);
            Json(json!({
                "success": false,
                "message": format!("获取AI配置失败: {}", e)
            }))
        }
    }
}

/// 更新AI配置
#[utoipa::path(
    put,
    path = "/api/ai/settings",
    tag = "AI",
    request_body = UpdateAiSettingsRequest,
    responses(
        (status = 200, description = "更新成功", body = Value)
    )
)]
pub async fn update_settings(
    State(state): State<AppState>,
    Json(req): Json<UpdateAiSettingsRequest>,
) -> Json<Value> {
    let pool = &state.pool;

    let tenant_id = match get_tenant_id_from_header(&state).await {
        Some(id) => id,
        None => {
            return Json(json!({
                "success": false,
                "message": "未找到租户ID"
            }));
        }
    };

    // 更新配置
    let result = sqlx::query!(
        r#"
        INSERT INTO ai.ai_settings (
            tenant_id, default_model, max_tokens, temperature, 
            enable_streaming, enable_function_calling, available_models, updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW()
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
            default_model = COALESCE($2, ai.ai_settings.default_model),
            max_tokens = COALESCE($3, ai.ai_settings.max_tokens),
            temperature = COALESCE($4, ai.ai_settings.temperature),
            enable_streaming = COALESCE($5, ai.ai_settings.enable_streaming),
            enable_function_calling = COALESCE($6, ai.ai_settings.enable_function_calling),
            available_models = COALESCE($7, ai.ai_settings.available_models),
            updated_at = NOW()
        RETURNING default_model, max_tokens, temperature, enable_streaming, enable_function_calling, available_models
        "#,
        tenant_id,
        req.default_model,
        req.max_tokens,
        req.temperature,
        req.enable_streaming,
        req.enable_function_calling,
        req.available_models.map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
    )
    .fetch_one(pool)
    .await;

    match result {
        Ok(row) => {
            let available_models: Vec<String> =
                serde_json::from_value(row.available_models).unwrap_or_default();
            Json(json!({
                "success": true,
                "data": {
                    "default_model": row.default_model,
                    "max_tokens": row.max_tokens,
                    "temperature": row.temperature,
                    "enable_streaming": row.enable_streaming,
                    "enable_function_calling": row.enable_function_calling,
                    "available_models": available_models
                }
            }))
        }
        Err(e) => {
            tracing::error!("更新AI配置失败: {}", e);
            Json(json!({
                "success": false,
                "message": format!("更新AI配置失败: {}", e)
            }))
        }
    }
}

// 辅助函数：从请求头获取租户ID
async fn get_tenant_id_from_header(_state: &AppState) -> Option<Uuid> {
    // 这里我们可以从auth_state或者请求头获取租户ID
    // 暂时返回None，后面我们再完善
    None
}
