//! 业务 Copilot API Handlers
//!
//! 提供业务 Copilot 模块的 HTTP API 端点

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::dsh::business_copilot::{
    BusinessModule, ConversationMessage, CopilotRequest, CopilotSessionManager,
};

/// 应用状态（共享的会话管理器）
#[derive(Clone)]
pub struct CopilotAppState {
    pub session_manager: Arc<RwLock<CopilotSessionManager>>,
}

impl CopilotAppState {
    pub fn new() -> Self {
        Self {
            session_manager: Arc::new(RwLock::new(
                CopilotSessionManager::with_defaults().with_llm_provider(
                    crate::dsh::provider::ProviderFactory::build_resilient_provider(),
                ),
            )),
        }
    }
}

impl Default for CopilotAppState {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== 请求/响应类型 ====================

/// 创建会话请求
#[derive(Debug, Deserialize)]
pub struct CreateSessionRequest {
    pub user_id: String,
    pub module: Option<String>,
    pub tenant_id: Option<String>,
}

/// 创建会话响应
#[derive(Debug, Serialize)]
pub struct CreateSessionResponse {
    pub session_id: String,
    pub module: String,
    pub created_at: String,
}

/// 发送消息请求
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub user_id: String,
    pub message: String,
    pub module: Option<String>,
}

/// 会话信息响应
#[derive(Debug, Serialize)]
pub struct SessionInfoResponse {
    pub session_id: String,
    pub module: String,
    pub user_id: String,
    pub message_count: usize,
    pub created_at: String,
    pub updated_at: String,
}

/// 活跃会话列表响应
#[derive(Debug, Serialize)]
pub struct ActiveSessionsResponse {
    pub total: usize,
}

/// 意图识别请求
#[derive(Debug, Deserialize)]
pub struct IntentRecognizeRequest {
    pub text: String,
}

/// 意图识别响应
#[derive(Debug, Serialize)]
pub struct IntentRecognizeResponse {
    pub intent: String,
    pub confidence: f64,
}

/// 模块配置响应
#[derive(Debug, Serialize)]
pub struct ModuleConfigResponse {
    pub module: String,
    pub display_name: String,
}

/// 模块列表响应
#[derive(Debug, Serialize)]
pub struct ModuleListResponse {
    pub total: usize,
    pub modules: Vec<ModuleConfigResponse>,
}

/// API 错误响应
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub error: String,
    pub message: String,
}

// ==================== API Handlers ====================

/// 创建会话
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/copilot/sessions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn create_session(
    State(state): State<CopilotAppState>,
    Json(req): Json<CreateSessionRequest>,
) -> impl IntoResponse {
    let module = req.module.unwrap_or_else(|| "erp".to_string());
    let business_module = parse_business_module(&module);

    let session_id = {
        let manager = state.session_manager.read().await;
        let tenant_id = req.tenant_id.unwrap_or_else(|| "default".to_string());
        let context = manager.create_session(&req.user_id, &tenant_id, business_module);
        context.session_id
    };

    (
        StatusCode::CREATED,
        Json(CreateSessionResponse {
            session_id: session_id.clone(),
            module,
            created_at: chrono::Utc::now().to_rfc3339(),
        }),
    )
        .into_response()
}

/// 获取会话信息
pub async fn get_session(
    State(state): State<CopilotAppState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let manager = state.session_manager.read().await;
    match manager.get_session(&session_id) {
        Some(context) => (
            StatusCode::OK,
            Json(SessionInfoResponse {
                session_id: context.session_id.clone(),
                module: context.module.as_str().to_string(),
                user_id: context.user_id.clone(),
                message_count: context.conversation_history.len(),
                created_at: context.created_at.clone(),
                updated_at: context.updated_at.clone(),
            }),
        )
            .into_response(),
        None => (
            StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "session_not_found".to_string(),
                message: format!("Session {} not found", session_id),
            }),
        )
            .into_response(),
    }
}

/// 删除会话
pub async fn delete_session(
    State(state): State<CopilotAppState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let manager = state.session_manager.write().await;
    if manager.delete_session(&session_id) {
        StatusCode::NO_CONTENT.into_response()
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "session_not_found".to_string(),
                message: format!("Session {} not found", session_id),
            }),
        )
            .into_response()
    }
}

/// 发送消息并获取响应
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/copilot/sessions/{session_id}/messages",
    params(
        ("session_id" = String, Path, description = "session_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn send_message(
    State(state): State<CopilotAppState>,
    Path(session_id): Path<String>,
    Json(req): Json<SendMessageRequest>,
) -> impl IntoResponse {
    let module = req.module.unwrap_or_else(|| "erp".to_string());
    let business_module = parse_business_module(&module);

    let user_message = ConversationMessage {
        message_id: Uuid::new_v4().to_string(),
        role: "user".to_string(),
        content: req.message.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        tool_calls: vec![],
    };

    // 添加用户消息
    {
        let manager = state.session_manager.read().await;
        if let Err(e) = manager.add_message(&session_id, user_message) {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiError {
                    error: "session_not_found".to_string(),
                    message: e,
                }),
            )
                .into_response();
        }
    }

    // 处理请求
    let copilot_request = CopilotRequest {
        session_id: session_id.clone(),
        user_input: req.message,
        module: business_module,
        current_page: None,
        selected_records: vec![],
        additional_context: None,
        stream: false,
    };

    let manager = state.session_manager.read().await;
    match manager.process_request(copilot_request).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                error: "processing_failed".to_string(),
                message: e,
            }),
        )
            .into_response(),
    }
}

/// 获取活跃会话列表
pub async fn list_active_sessions(State(state): State<CopilotAppState>) -> impl IntoResponse {
    let manager = state.session_manager.read().await;
    let count = manager.active_session_count();

    (
        StatusCode::OK,
        Json(ActiveSessionsResponse { total: count }),
    )
        .into_response()
}

/// 意图识别
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/dsh/copilot/intent/recognize",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn recognize_intent(Json(req): Json<IntentRecognizeRequest>) -> impl IntoResponse {
    let recognizer = crate::dsh::business_copilot::IntentRecognizer::new();
    let (intent, confidence) = recognizer.recognize(&req.text);

    (
        StatusCode::OK,
        Json(IntentRecognizeResponse {
            intent: intent.as_str().to_string(),
            confidence,
        }),
    )
        .into_response()
}

/// 获取模块列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/copilot/modules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn list_modules() -> impl IntoResponse {
    let modules = vec![
        ModuleConfigResponse {
            module: "erp".to_string(),
            display_name: "ERP 企业资源计划".to_string(),
        },
        ModuleConfigResponse {
            module: "finance".to_string(),
            display_name: "财务管理".to_string(),
        },
        ModuleConfigResponse {
            module: "crm".to_string(),
            display_name: "客户关系管理".to_string(),
        },
        ModuleConfigResponse {
            module: "wms".to_string(),
            display_name: "仓储管理系统".to_string(),
        },
    ];

    (
        StatusCode::OK,
        Json(ModuleListResponse {
            total: modules.len(),
            modules,
        }),
    )
        .into_response()
}

/// 获取模块配置
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/copilot/modules/{module}",
    params(
        ("module" = String, Path, description = "module")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_module_config(Path(module): Path<String>) -> impl IntoResponse {
    let business_module = parse_business_module(&module);
    let config = ModuleConfigResponse {
        module: business_module.as_str().to_string(),
        display_name: business_module.display_name().to_string(),
    };

    (StatusCode::OK, Json(config)).into_response()
}

// ==================== 辅助函数 ====================

/// 解析业务模块字符串
fn parse_business_module(module: &str) -> BusinessModule {
    match module.to_lowercase().as_str() {
        "erp" => BusinessModule::ERP,
        "finance" => BusinessModule::Finance,
        "crm" => BusinessModule::CRM,
        "wms" => BusinessModule::WMS,
        "hr" | "hrm" => BusinessModule::HR,
        "oa" => BusinessModule::OA,
        _ => BusinessModule::General,
    }
}
