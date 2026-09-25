//! 智能表单 API Handlers（3.2b 真实数据联调）
//!
//! 提供智能表单模块的 HTTP API 端点：
//! - GET  /dsh/smart-forms/templates          — 内置表单模板列表
//! - GET  /dsh/smart-forms/templates/{id}     — 指定模板详情
//! - POST /dsh/smart-forms/ai-fill            — AI 智能填充（LLM 真实生成，无 LLM 时规则兜底）
//! - POST /dsh/smart-forms/validate           — 表单校验（必填/类型/长度/范围规则）

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;

use crate::dsh::provider::LlmProvider;
use crate::dsh::smart_forms::{
    builtin_templates, AiFillRequest, SmartFormEngine, ValidationRequest,
};

/// 应用状态（共享 LLM Provider）
#[derive(Clone)]
pub struct SmartFormsAppState {
    provider: Option<Arc<dyn LlmProvider>>,
}

impl SmartFormsAppState {
    pub fn new() -> Self {
        Self {
            provider: Some(crate::dsh::provider::ProviderFactory::build_resilient_provider()),
        }
    }

    /// 无 Provider 状态（测试/纯规则模式）
    pub fn without_provider() -> Self {
        Self { provider: None }
    }
}

impl Default for SmartFormsAppState {
    fn default() -> Self {
        Self::new()
    }
}

/// 表单模板列表
pub async fn list_templates() -> impl IntoResponse {
    let templates = builtin_templates::all_templates();
    Json(templates)
}

/// 指定模板详情
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/smart-forms/templates/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_template(Path(id): Path<String>) -> impl IntoResponse {
    let templates = builtin_templates::all_templates();
    match templates.into_iter().find(|t| t.id == id) {
        Some(template) => Json(template).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "template_not_found", "message": format!("模板 {} 不存在", id) })),
        )
            .into_response(),
    }
}

/// AI 智能填充
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/smart-forms/ai-fill",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn ai_fill(
    State(state): State<SmartFormsAppState>,
    Json(req): Json<AiFillRequest>,
) -> impl IntoResponse {
    let templates = builtin_templates::all_templates();
    let Some(template) = templates.into_iter().find(|t| t.id == req.form_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "template_not_found", "message": format!("模板 {} 不存在", req.form_id) })),
        )
            .into_response();
    };

    let engine = SmartFormEngine;
    let result = engine.fill(&template, &req, state.provider.as_ref()).await;
    (StatusCode::OK, Json(result)).into_response()
}

/// 表单校验
pub async fn validate(
    State(state): State<SmartFormsAppState>,
    Json(req): Json<ValidationRequest>,
) -> impl IntoResponse {
    let templates = builtin_templates::all_templates();
    let Some(template) = templates.into_iter().find(|t| t.id == req.form_id) else {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "template_not_found", "message": format!("模板 {} 不存在", req.form_id) })),
        )
            .into_response();
    };

    let engine = SmartFormEngine;
    let _ = state; // 规则校验无 LLM 依赖；AI 警告为启发式
    let result = engine.validate(&template, &req);
    (StatusCode::OK, Json(result)).into_response()
}
