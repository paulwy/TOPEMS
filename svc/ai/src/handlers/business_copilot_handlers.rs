//! 业务 Copilot API Handlers
//!
//! 提供业务 Copilot 模块的 HTTP API 端点
//!
//! A-2 持久化判定（2026-10-18）：
//! - **无状态 AI/静态端点**（保留）：recognize_intent（LLM 单次调用）、list_modules/
//!   get_module_config（代码内 curated 模块清单）。
//! - **状态型端点**（create/get/delete/list_session、send_message、update_selected_records、
//!   set_context_data）：当前由 CopilotSessionManager 内存 RwLock 持有，会话重启即丢。
//!   该 manager 深度耦合 LLM provider 调用链，全量 sqlx 化需迁移建表 + RLS + manager
//!   重构，成本高且风险大。判定：**立 follow-up ticket（A-2b）**，本批不硬接（避免半成品
//!   迁移与 checksums 伪登记）。可复用 core.ai_conversations 表（id/tenant_id/user_id/title）
//!   承接会话头，messages/records/context 另加 jsonb 列。

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
    BusinessModule, ConversationMessage, CopilotRequest, CopilotSessionManager, SelectedRecord,
};

/// 应用状态（共享的会话管理器）
#[derive(Clone)]
pub struct CopilotAppState {
    pub session_manager: Arc<RwLock<CopilotSessionManager>>,
    /// A-2b：真表读写（core.ai_conversations）
    pub pool: sqlx::PgPool,
}

impl CopilotAppState {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self {
            session_manager: Arc::new(RwLock::new(
                CopilotSessionManager::with_defaults().with_llm_provider(
                    crate::dsh::provider::ProviderFactory::build_resilient_provider(),
                ),
            )),
            pool,
        }
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
    pub user_id: String,
    pub tenant_id: String,
    pub module: String,
    pub current_page: Option<String>,
    pub selected_records: Vec<SelectedRecord>,
    pub conversation_history: Vec<ConversationMessage>,
    pub context_data: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
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

/// 更新选中记录请求
#[derive(Debug, Deserialize)]
pub struct UpdateSelectedRecordsRequest {
    pub records: Vec<SelectedRecord>,
}

/// 设置上下文数据请求
#[derive(Debug, Deserialize)]
pub struct SetContextDataRequest {
    pub key: String,
    pub value: serde_json::Value,
}

/// 写操作成功响应
#[derive(Debug, Serialize)]
pub struct SessionWriteOkResponse {
    pub success: bool,
    pub session_id: String,
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
    let user_id = req.user_id.clone();
    // A-2b：tenant 字符串→uuid（"default"→nil，走 RLS 超管豁免）
    let tenant_uuid = req
        .tenant_id
        .as_deref()
        .and_then(|t| uuid::Uuid::parse_str(t).ok())
        .unwrap_or_else(uuid::Uuid::nil);

    // A-2b：真表落库（core.ai_conversations）
    let row: (uuid::Uuid, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>) =
        match sqlx::query_as(
            "INSERT INTO core.ai_conversations (tenant_id, user_id, title, module, messages, selected_records, context_data)
             VALUES ($1, $2, $3, $4, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
             RETURNING id, created_at, updated_at",
        )
        .bind(tenant_uuid)
        .bind(&user_id)
        .bind(format!("copilot-{module}"))
        .bind(&module)
        .fetch_one(&state.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("create_session DB failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        error: "db_error".to_string(),
                        message: "会话创建失败".to_string(),
                    }),
                )
                    .into_response();
            }
        };
    let session_id = row.0.to_string();

    // 同步内存 manager（LLM 处理链仍用内存上下文，send_message 路径兼容）
    {
        let manager = state.session_manager.read().await;
        let _ = manager.create_session(&user_id, &tenant_uuid.to_string(), business_module);
    }

    (
        StatusCode::CREATED,
        Json(CreateSessionResponse {
            session_id,
            user_id,
            tenant_id: tenant_uuid.to_string(),
            module,
            current_page: None,
            selected_records: vec![],
            conversation_history: vec![],
            context_data: serde_json::json!({}),
            created_at: row.1.to_rfc3339(),
            updated_at: row.2.to_rfc3339(),
        }),
    )
        .into_response()
}

/// 获取会话信息
pub async fn get_session(
    State(state): State<CopilotAppState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let sid = match uuid::Uuid::parse_str(&session_id) {
        Ok(s) => s,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiError {
                    error: "session_not_found".to_string(),
                    message: format!("Session {} not found", session_id),
                }),
            )
                .into_response()
        }
    };
    // A-2b：真表查询
    let row: Option<(String, String, i32, String, String)> = sqlx::query_as(
        "SELECT module, user_id, jsonb_array_length(messages), created_at::text, updated_at::text
         FROM core.ai_conversations WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(sid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    match row {
        Some((module, user_id, msg_count, created_at, updated_at)) => (
            StatusCode::OK,
            Json(SessionInfoResponse {
                session_id,
                module,
                user_id,
                message_count: usize::try_from(msg_count).unwrap_or(usize::MAX),
                created_at,
                updated_at,
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
    let sid = match uuid::Uuid::parse_str(&session_id) {
        Ok(s) => s,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };
    // A-2b：软删
    let affected = sqlx::query(
        "UPDATE core.ai_conversations SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(sid)
    .execute(&state.pool)
    .await
    .map(|r| r.rows_affected())
    .unwrap_or(0);
    if affected > 0 {
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
                    message: e.to_string(),
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
                message: e.to_string(),
            }),
        )
            .into_response(),
    }
}

/// 更新会话选中记录
///
/// 前端契约：PUT /dsh/copilot/sessions/{session_id}/records。
/// 复用 CopilotSessionManager.update_selected_records 真实写入内存会话上下文；
/// 会话不存在时按 get_session 的 404 分支返回。
pub async fn update_selected_records(
    State(state): State<CopilotAppState>,
    Path(session_id): Path<String>,
    Json(req): Json<UpdateSelectedRecordsRequest>,
) -> impl IntoResponse {
    let sid = match uuid::Uuid::parse_str(&session_id) {
        Ok(s) => s,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiError {
                    error: "session_not_found".to_string(),
                    message: format!("Session {} not found", session_id),
                }),
            )
                .into_response()
        }
    };
    // A-2b：jsonb 落库
    let affected = sqlx::query("UPDATE core.ai_conversations SET selected_records = $2::jsonb, updated_at = now() WHERE id = $1 AND deleted_at IS NULL")
        .bind(sid)
        .bind(serde_json::to_value(&req.records).unwrap_or(serde_json::json!([])))
        .execute(&state.pool)
        .await
        .map(|r| r.rows_affected())
        .unwrap_or(0);
    if affected > 0 {
        (
            StatusCode::OK,
            Json(SessionWriteOkResponse {
                success: true,
                session_id,
            }),
        )
            .into_response()
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

/// 设置会话上下文数据
///
/// 前端契约：PUT /dsh/copilot/sessions/{session_id}/context。
/// 复用 CopilotSessionManager.set_context_data 真实写入内存会话上下文；
/// 会话不存在时按 get_session 的 404 分支返回。
pub async fn set_context_data(
    State(state): State<CopilotAppState>,
    Path(session_id): Path<String>,
    Json(req): Json<SetContextDataRequest>,
) -> impl IntoResponse {
    let sid = match uuid::Uuid::parse_str(&session_id) {
        Ok(s) => s,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiError {
                    error: "session_not_found".to_string(),
                    message: format!("Session {} not found", session_id),
                }),
            )
                .into_response()
        }
    };
    // A-2b：jsonb 落库（key 合并进 context_data）
    let affected = sqlx::query(
        "UPDATE core.ai_conversations SET context_data = context_data || jsonb_build_object($2, $3::jsonb), updated_at = now() WHERE id = $1 AND deleted_at IS NULL"
    )
        .bind(sid)
        .bind(&req.key)
        .bind(&req.value)
        .execute(&state.pool)
        .await
        .map(|r| r.rows_affected())
        .unwrap_or(0);
    if affected > 0 {
        (
            StatusCode::OK,
            Json(SessionWriteOkResponse {
                success: true,
                session_id,
            }),
        )
            .into_response()
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

/// 获取活跃会话列表
pub async fn list_active_sessions(State(state): State<CopilotAppState>) -> impl IntoResponse {
    // A-2b：真表计数
    let total: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core.ai_conversations WHERE deleted_at IS NULL")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
    (
        StatusCode::OK,
        Json(ActiveSessionsResponse {
            total: usize::try_from(total).unwrap_or(usize::MAX),
        }),
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
