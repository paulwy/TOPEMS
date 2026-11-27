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
    extract::{Extension, Path, Query, State},
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
use crate::shared::permission::{has_ai_permission, AiPermission};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

/// 应用状态（共享的会话管理器）
#[derive(Clone)]
pub struct CopilotAppState {
    pub session_manager: Arc<RwLock<CopilotSessionManager>>,
    /// A-2b：真表读写（core.ai_conversations），事务级 search_path
    pub db: topems_shared_db::scope::Db,
}

impl CopilotAppState {
    pub fn new(db: topems_shared_db::scope::Db) -> Self {
        Self {
            session_manager: Arc::new(RwLock::new(
                CopilotSessionManager::with_defaults().with_llm_provider(
                    crate::dsh::provider::ProviderFactory::build_resilient_provider(),
                ),
            )),
            db,
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
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
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
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
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

/// FAQ 搜索查询参数（前端契约：GET /dsh/copilot/modules/{module}/faq?q=...）
#[derive(Debug, Deserialize)]
pub struct FaqQuery {
    pub q: Option<String>,
}

/// FAQ 条目（字段对齐前端 businessCopilot.ts FAQItem）
#[derive(Debug, Serialize, ToSchema)]
pub struct FaqItem {
    pub question: String,
    pub answer: String,
    pub keywords: Vec<String>,
    pub category: String,
}

// ==================== FAQ 管理端（admin CRUD）类型 ====================

/// 管理端 FAQ 条目（含 id / tenant_id / status 等管理字段）
#[derive(Debug, Serialize, ToSchema)]
pub struct AdminFaqItem {
    pub id: String,
    pub tenant_id: String,
    pub module: String,
    pub question: String,
    pub answer: String,
    pub keywords: Vec<String>,
    pub category: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// 管理端 FAQ 列表查询参数
#[derive(Debug, Deserialize)]
pub struct AdminFaqQuery {
    pub module: Option<String>,
    pub q: Option<String>,
}

/// 创建 FAQ 请求
#[derive(Debug, Deserialize)]
pub struct CreateFaqRequest {
    pub module: String,
    pub question: String,
    pub answer: String,
    pub keywords: Option<Vec<String>>,
    pub category: Option<String>,
}

/// 更新 FAQ 请求（部分更新：仅传需变更的字段；status ∈ active/disabled）
#[derive(Debug, Deserialize)]
pub struct UpdateFaqRequest {
    pub module: Option<String>,
    pub question: Option<String>,
    pub answer: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub category: Option<String>,
    pub status: Option<String>,
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
    Extension(txn_arc): Extension<RlsTxnCell>,
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
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("create_session begin failed: {}", e);
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
        .fetch_one(&mut scope)
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
    let _ = scope.commit().await;
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
            created_at: row.1,
            updated_at: row.2,
        }),
    )
        .into_response()
}

/// 获取会话信息
#[utoipa::path(
    get,
    path = "/api/ai/dsh/copilot/sessions/{session_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn get_session(
    Extension(txn_arc): Extension<RlsTxnCell>,
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
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (
            StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "session_not_found".to_string(),
                message: format!("Session {} not found", session_id),
            }),
        )
            .into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
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
    let row: Option<(
        String,
        String,
        i32,
        chrono::DateTime<chrono::Utc>,
        chrono::DateTime<chrono::Utc>,
    )> = sqlx::query_as(
        "SELECT module, user_id, jsonb_array_length(messages), created_at, updated_at
         FROM core.ai_conversations WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(sid)
    .fetch_optional(&mut scope)
    .await
    .unwrap_or(None);
    let _ = scope.commit().await;

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
#[utoipa::path(
    delete,
    path = "/api/ai/dsh/copilot/sessions/{session_id}",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn delete_session(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<CopilotAppState>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let sid = match uuid::Uuid::parse_str(&session_id) {
        Ok(s) => s,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };
    // A-2b：软删
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let affected = sqlx::query(
        "UPDATE core.ai_conversations SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(sid)
    .execute(&mut scope)
    .await
    .map(|r| r.rows_affected())
    .unwrap_or(0);
    let _ = scope.commit().await;
    // 幂等删除：会话不存在也视为成功（契约 smoke 对假 id 期望 2xx）
    if affected > 0 {
        StatusCode::NO_CONTENT.into_response()
    } else {
        StatusCode::OK.into_response()
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
#[utoipa::path(
    put,
    path = "/api/ai/dsh/copilot/sessions/{session_id}/records",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn update_selected_records(
    Extension(txn_arc): Extension<RlsTxnCell>,
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
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let affected = sqlx::query("UPDATE core.ai_conversations SET selected_records = $2::jsonb, updated_at = now() WHERE id = $1 AND deleted_at IS NULL")
        .bind(sid)
        .bind(serde_json::to_value(&req.records).unwrap_or(serde_json::json!([])))
        .execute(&mut scope)
        .await
        .map(|r| r.rows_affected())
        .unwrap_or(0);
    let _ = scope.commit().await;
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
#[utoipa::path(
    put,
    path = "/api/ai/dsh/copilot/sessions/{session_id}/context",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn set_context_data(
    Extension(txn_arc): Extension<RlsTxnCell>,
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
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };
    let affected = sqlx::query(
        "UPDATE core.ai_conversations SET context_data = context_data || jsonb_build_object($2::text, $3::jsonb), updated_at = now() WHERE id = $1 AND deleted_at IS NULL"
    )
        .bind(sid)
        .bind(&req.key)
        .bind(&req.value)
        .execute(&mut scope)
        .await
        .map(|r| r.rows_affected())
        .unwrap_or(0);
    let _ = scope.commit().await;
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
#[utoipa::path(
    get,
    path = "/api/ai/dsh/copilot/sessions",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn list_active_sessions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<CopilotAppState>,
) -> impl IntoResponse {
    // A-2b：真表计数
    let total: i64 = {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        };
        let x = match state.db.scope_with(txn).await {
            Ok(mut scope) => {
                let total = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM core.ai_conversations WHERE deleted_at IS NULL",
                )
                .fetch_one(&mut scope)
                .await
                .unwrap_or(0);
                let _ = scope.commit().await;
                total
            }
            Err(_) => 0,
        };
        x
    };
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

/// 搜索模块 FAQ
///
/// 前端契约：GET /dsh/copilot/modules/{module}/faq?q=...（hook 活调 useBusinessCopilot.ts:258）。
/// 数据来源（2026-10-24 升级，迁移 20261024000015）：
///   1. 优先查 core.ai_faqs（本租户自有行 ∪ 全零全局行，按 module + q 过滤）；
///   2. 表未迁移 / 查询失败 / 该模块无任何行 → 回落代码内 curated_faq()，
///      保持前端体验不回空，响应结构（ApiResponse<Vec<FaqItem>>）不变。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/dsh/copilot/modules/{module}/faq",
    params(
        ("module" = String, Path, description = "module"),
        ("q" = Option<String>, Query, description = "搜索关键词（问题/答案/关键词，大小写不敏感）")
    ),
    responses(
        (status = 200, description = "OK", body = ApiResponse<Vec<FaqItem>>),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn search_faq(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<CopilotAppState>,
    Extension(claims): Extension<Claims>,
    Path(module): Path<String>,
    Query(query): Query<FaqQuery>,
) -> impl IntoResponse {
    let business_module = parse_business_module(&module);
    let module_key = business_module.as_str();
    let tenant_uuid = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);
    let q = query.q.as_deref().map(str::trim).filter(|s| !s.is_empty());

    // 1. 本租户语料（请求事务内，租户 RLS 通道）
    type FaqRow = (
        String,
        String,
        serde_json::Value,
        String,
        chrono::DateTime<chrono::Utc>,
    );
    let tenant_rows: Result<Vec<FaqRow>, sqlx::Error> = {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        };
        let rows = match state.db.scope_with(txn).await {
            Ok(mut scope) => match q {
                Some(q) => {
                    sqlx::query_as(
                        "SELECT question, answer, keywords, category, updated_at FROM core.ai_faqs
                         WHERE deleted_at IS NULL AND status = 'active'
                           AND module = $1
                           AND tenant_id = $2
                           AND (question || ' ' || answer || ' ' || COALESCE(keywords::text, '') ILIKE '%' || $3 || '%')
                         ORDER BY updated_at DESC",
                    )
                    .bind(module_key)
                    .bind(tenant_uuid)
                    .bind(q)
                    .fetch_all(&mut scope)
                    .await
                }
                None => {
                    sqlx::query_as(
                        "SELECT question, answer, keywords, category, updated_at FROM core.ai_faqs
                         WHERE deleted_at IS NULL AND status = 'active'
                           AND module = $1
                           AND tenant_id = $2
                         ORDER BY updated_at DESC",
                    )
                    .bind(module_key)
                    .bind(tenant_uuid)
                    .fetch_all(&mut scope)
                    .await
                }
            },
            Err(e) => Err(e),
        };
        rows
    };

    // 2. 平台内置语料（全零租户）：平台只读作用域，只取平台那批，不跨界
    let platform_rows: Result<Vec<FaqRow>, sqlx::Error> = match state.db.scope_read_platform().await
    {
        Ok(mut scope) => {
            let rows = match q {
                Some(q) => {
                    sqlx::query_as(
                        "SELECT question, answer, keywords, category, updated_at FROM core.ai_faqs
                         WHERE deleted_at IS NULL AND status = 'active'
                           AND module = $1
                           AND tenant_id = $2
                           AND (question || ' ' || answer || ' ' || COALESCE(keywords::text, '') ILIKE '%' || $3 || '%')
                         ORDER BY updated_at DESC",
                    )
                    .bind(module_key)
                    .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
                    .bind(q)
                    .fetch_all(&mut scope)
                    .await
                }
                None => {
                    sqlx::query_as(
                        "SELECT question, answer, keywords, category, updated_at FROM core.ai_faqs
                         WHERE deleted_at IS NULL AND status = 'active'
                           AND module = $1
                           AND tenant_id = $2
                         ORDER BY updated_at DESC",
                    )
                    .bind(module_key)
                    .bind(topems_shared_db::scope::PLATFORM_TENANT_ID)
                    .fetch_all(&mut scope)
                    .await
                }
            };
            let _ = scope.rollback().await;
            rows
        }
        Err(e) => Err(e),
    };

    // 3. 合并：同一问题文本以租户自身优先，合并后按原排序规则（updated_at DESC）
    let db_result: Result<Vec<FaqRow>, sqlx::Error> = match (tenant_rows, platform_rows) {
        (Ok(mut rows), Ok(platform)) => {
            let mut seen: std::collections::HashSet<String> =
                rows.iter().map(|r| r.0.trim().to_lowercase()).collect();
            for row in platform {
                if seen.insert(row.0.trim().to_lowercase()) {
                    rows.push(row);
                }
            }
            rows.sort_by(|a, b| b.4.cmp(&a.4));
            Ok(rows)
        }
        // 平台语料读取失败不拖垮本租户结果：降级为仅本租户语料
        (Ok(rows), Err(e)) => {
            tracing::warn!("search_faq 平台语料读取失败，仅返回本租户语料: {}", e);
            Ok(rows)
        }
        (Err(e), _) => Err(e),
    };

    // 4. DB 有数据 → 直接返回；否则回落 curated 静态语料（与历史行为一致）
    match db_result {
        Ok(rows) if !rows.is_empty() => {
            let items = rows
                .into_iter()
                .map(|(question, answer, keywords, category, _)| FaqItem {
                    question,
                    answer,
                    keywords: jsonb_keywords_to_vec(keywords),
                    category,
                })
                .collect::<Vec<_>>();
            Json(ApiResponse::success(items, "ok")).into_response()
        }
        other => {
            if let Err(e) = &other {
                tracing::error!("search_faq DB 查询失败，回落 curated: {}", e);
            }
            let items = curated_faq(&business_module);
            let filtered = match q {
                Some(q) => {
                    let q_lower = q.to_lowercase();
                    items
                        .into_iter()
                        .filter(|item| {
                            item.question.to_lowercase().contains(&q_lower)
                                || item.answer.to_lowercase().contains(&q_lower)
                                || item
                                    .keywords
                                    .iter()
                                    .any(|k| k.to_lowercase().contains(&q_lower))
                        })
                        .collect::<Vec<_>>()
                }
                None => items,
            };
            Json(ApiResponse::success(filtered, "ok")).into_response()
        }
    }
}

// ==================== FAQ 管理端 Handlers ====================

/// 管理端鉴权：需 ai:admin（或超管）。
fn faq_admin_forbidden() -> (StatusCode, Json<ApiError>) {
    (
        StatusCode::FORBIDDEN,
        Json(ApiError {
            error: "forbidden".to_string(),
            message: "需要 ai:admin 权限".to_string(),
        }),
    )
}

/// 列表查询 FAQ（admin）
///
/// GET /dsh/copilot/admin/faqs?module=&q=...：超管看全部（含全局行），
/// 普通租户管理员仅看本租户自有行。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:admin"])),
    path = "/dsh/copilot/admin/faqs",
    params(
        ("module" = Option<String>, Query, description = "按模块过滤"),
        ("q" = Option<String>, Query, description = "按问题/答案关键词过滤")
    ),
    responses(
        (status = 200, description = "OK", body = ApiResponse<Vec<AdminFaqItem>>),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn list_admin_faqs(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<CopilotAppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<AdminFaqQuery>,
) -> impl IntoResponse {
    if !has_ai_permission(&claims, &AiPermission::Manage) {
        return faq_admin_forbidden().into_response();
    }
    let tenant_uuid = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);

    // 超管不加租户过滤；普通管理员只看本租户行
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("list_admin_faqs begin failed: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    error: "db_error".to_string(),
                    message: "FAQ 查询失败".to_string(),
                }),
            )
                .into_response();
        }
    };
    let rows: Result<
        Vec<(
            Uuid,
            Uuid,
            String,
            String,
            String,
            serde_json::Value,
            String,
            String,
            chrono::DateTime<chrono::Utc>,
        )>,
        sqlx::Error,
    > = if claims.is_superuser {
        match query.q.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                Some(q) => {
                    sqlx::query_as(
                        "SELECT id, tenant_id, module, question, answer, keywords, category, status, created_at
                         FROM core.ai_faqs
                         WHERE deleted_at IS NULL
                           AND ($1::text IS NULL OR module = $1)
                           AND (question || ' ' || answer || ' ' || COALESCE(keywords::text, '') ILIKE '%' || $2 || '%')
                         ORDER BY updated_at DESC LIMIT 200",
                    )
                    .bind(query.module.as_deref())
                    .bind(q)
                    .fetch_all(&mut scope)
                    .await
                }
                None => {
                    sqlx::query_as(
                        "SELECT id, tenant_id, module, question, answer, keywords, category, status, created_at
                         FROM core.ai_faqs
                         WHERE deleted_at IS NULL
                           AND ($1::text IS NULL OR module = $1)
                         ORDER BY updated_at DESC LIMIT 200",
                    )
                    .bind(query.module.as_deref())
                    .fetch_all(&mut scope)
                    .await
                }
            }
    } else {
        match query.q.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                Some(q) => {
                    sqlx::query_as(
                        "SELECT id, tenant_id, module, question, answer, keywords, category, status, created_at
                         FROM core.ai_faqs
                         WHERE deleted_at IS NULL AND tenant_id = $1
                           AND ($2::text IS NULL OR module = $2)
                           AND (question || ' ' || answer || ' ' || COALESCE(keywords::text, '') ILIKE '%' || $3 || '%')
                         ORDER BY updated_at DESC LIMIT 200",
                    )
                    .bind(tenant_uuid)
                    .bind(query.module.as_deref())
                    .bind(q)
                    .fetch_all(&mut scope)
                    .await
                }
                None => {
                    sqlx::query_as(
                        "SELECT id, tenant_id, module, question, answer, keywords, category, status, created_at
                         FROM core.ai_faqs
                         WHERE deleted_at IS NULL AND tenant_id = $1
                           AND ($2::text IS NULL OR module = $2)
                         ORDER BY updated_at DESC LIMIT 200",
                    )
                    .bind(tenant_uuid)
                    .bind(query.module.as_deref())
                    .fetch_all(&mut scope)
                    .await
                }
            }
    };
    let _ = scope.commit().await;

    match rows {
        Ok(items) => {
            let items = items
                .into_iter()
                .map(
                    |(
                        id,
                        tenant_id,
                        module,
                        question,
                        answer,
                        keywords,
                        category,
                        status,
                        created_at,
                    )| {
                        AdminFaqItem {
                            id: id.to_string(),
                            tenant_id: tenant_id.to_string(),
                            module,
                            question,
                            answer,
                            keywords: jsonb_keywords_to_vec(keywords),
                            category,
                            status,
                            created_at,
                        }
                    },
                )
                .collect::<Vec<_>>();
            Json(ApiResponse::success(items, "ok")).into_response()
        }
        Err(e) => {
            tracing::error!("list_admin_faqs DB failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    error: "db_error".to_string(),
                    message: "FAQ 列表查询失败".to_string(),
                }),
            )
                .into_response()
        }
    }
}

/// 创建 FAQ（admin）
///
/// POST /dsh/copilot/admin/faqs：普通管理员落本租户行；超管落全局行（tenant_id = 全零）。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:admin"])),
    path = "/dsh/copilot/admin/faqs",
    responses(
        (status = 200, description = "OK", body = ApiResponse<AdminFaqItem>),
        (status = 400, description = "Bad request"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn create_admin_faq(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<CopilotAppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateFaqRequest>,
) -> impl IntoResponse {
    if !has_ai_permission(&claims, &AiPermission::Manage) {
        return faq_admin_forbidden().into_response();
    }
    if req.module.trim().is_empty()
        || req.question.trim().is_empty()
        || req.answer.trim().is_empty()
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                error: "validation_failed".to_string(),
                message: "module / question / answer 不能为空".to_string(),
            }),
        )
            .into_response();
    }
    // 超管 → 全局行（全零）；普通管理员 → 本租户行（缺租户则 400）
    let tenant_uuid = if claims.is_superuser {
        Uuid::nil()
    } else {
        match claims
            .tenant_id
            .as_ref()
            .and_then(|t| Uuid::parse_str(t).ok())
        {
            Some(t) => t,
            None => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ApiError {
                        error: "validation_failed".to_string(),
                        message: "缺少租户ID".to_string(),
                    }),
                )
                    .into_response()
            }
        }
    };
    let keywords_vec: Vec<String> = req.keywords.unwrap_or_default();
    let keywords_json = serde_json::to_value(&keywords_vec).unwrap_or(serde_json::json!([]));
    let category = req.category.unwrap_or_default();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let row: Result<(Uuid, chrono::DateTime<chrono::Utc>), sqlx::Error> =
        match state.db.scope_with(txn).await {
            Ok(mut scope) => {
                let row = sqlx::query_as(
                "INSERT INTO core.ai_faqs (tenant_id, module, question, answer, keywords, category)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6)
                 RETURNING id, created_at",
            )
            .bind(tenant_uuid)
            .bind(req.module.trim())
            .bind(req.question.trim())
            .bind(req.answer.trim())
            .bind(keywords_json)
            .bind(&category)
            .fetch_one(&mut scope)
            .await;
                let _ = scope.commit().await;
                row
            }
            Err(e) => Err(e),
        };

    match row {
        Ok((id, created_at)) => Json(ApiResponse::success(
            AdminFaqItem {
                id: id.to_string(),
                tenant_id: tenant_uuid.to_string(),
                module: req.module.trim().to_string(),
                question: req.question.trim().to_string(),
                answer: req.answer.trim().to_string(),
                keywords: keywords_vec,
                category,
                status: "active".to_string(),
                created_at,
            },
            "ok",
        ))
        .into_response(),
        Err(e) => {
            tracing::error!("create_admin_faq DB failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    error: "db_error".to_string(),
                    message: "FAQ 创建失败".to_string(),
                }),
            )
                .into_response()
        }
    }
}

/// 删除 FAQ（admin，软删）
///
/// DELETE /dsh/copilot/admin/faqs/{id}：普通管理员仅可删本租户自有行；
/// 全局行（全零）仅超管可删。
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ai:admin"])),
    path = "/dsh/copilot/admin/faqs/{id}",
    params(
        ("id" = String, Path, description = "faq id")
    ),
    responses(
        (status = 204, description = "No content"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Not found")
    ),
    tag = "ai"
)]
pub async fn delete_admin_faq(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<CopilotAppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if !has_ai_permission(&claims, &AiPermission::Manage) {
        return faq_admin_forbidden().into_response();
    }
    let faq_id = match Uuid::parse_str(&id) {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiError {
                    error: "not_found".to_string(),
                    message: format!("FAQ {} 不存在", id),
                }),
            )
                .into_response()
        }
    };
    let tenant_uuid = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);

    // 超管不加租户过滤；普通管理员仅软删本租户行
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("delete_admin_faq begin failed: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };
    let affected = if claims.is_superuser {
        sqlx::query(
            "UPDATE core.ai_faqs SET deleted_at = now(), updated_at = now()
             WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(faq_id)
        .execute(&mut scope)
        .await
        .map(|r| r.rows_affected())
        .unwrap_or(0)
    } else {
        sqlx::query(
            "UPDATE core.ai_faqs SET deleted_at = now(), updated_at = now()
             WHERE id = $1 AND deleted_at IS NULL AND tenant_id = $2",
        )
        .bind(faq_id)
        .bind(tenant_uuid)
        .execute(&mut scope)
        .await
        .map(|r| r.rows_affected())
        .unwrap_or(0)
    };
    let _ = scope.commit().await;

    if affected > 0 {
        StatusCode::NO_CONTENT.into_response()
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "not_found".to_string(),
                message: format!("FAQ {} 不存在或无权删除", id),
            }),
        )
            .into_response()
    }
}

/// 更新 FAQ（admin，部分更新）
///
/// PUT /dsh/copilot/admin/faqs/{id}：仅更新请求中传入的字段（COALESCE 语义），
/// status 传 "active"/"disabled" 即切换（搜索路径已过滤 disabled）。
/// 权限与 delete 一致：普通管理员仅可改本租户自有行；全局行（全零）仅超管可改。
#[utoipa::path(
    put,
    security(("BearerAuth" = ["ai:admin"])),
    path = "/dsh/copilot/admin/faqs/{id}",
    params(
        ("id" = String, Path, description = "faq id")
    ),
    responses(
        (status = 200, description = "OK", body = ApiResponse<AdminFaqItem>),
        (status = 400, description = "Bad request"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Not found")
    ),
    tag = "ai"
)]
pub async fn update_admin_faq(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<CopilotAppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<UpdateFaqRequest>,
) -> impl IntoResponse {
    if !has_ai_permission(&claims, &AiPermission::Manage) {
        return faq_admin_forbidden().into_response();
    }
    // 全部字段缺省 → 400（避免空更新）
    if req.module.is_none()
        && req.question.is_none()
        && req.answer.is_none()
        && req.keywords.is_none()
        && req.category.is_none()
        && req.status.is_none()
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                error: "validation_failed".to_string(),
                message: "至少提供一个待更新字段".to_string(),
            }),
        )
            .into_response();
    }
    if let Some(status) = req.status.as_deref() {
        if status != "active" && status != "disabled" {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiError {
                    error: "validation_failed".to_string(),
                    message: "status 仅支持 active/disabled".to_string(),
                }),
            )
                .into_response();
        }
    }
    let faq_id = match Uuid::parse_str(&id) {
        Ok(v) => v,
        Err(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(ApiError {
                    error: "not_found".to_string(),
                    message: format!("FAQ {} 不存在", id),
                }),
            )
                .into_response()
        }
    };
    let tenant_uuid = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);
    let keywords_json = req
        .keywords
        .as_ref()
        .map(|k| serde_json::to_value(k).unwrap_or(serde_json::json!([])));

    // COALESCE 部分更新：传 NULL 的列保持原值；超管不加租户过滤
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("update_admin_faq begin failed: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };
    let row: Result<
        Option<(
            Uuid,
            Uuid,
            String,
            String,
            String,
            serde_json::Value,
            String,
            String,
            chrono::DateTime<chrono::Utc>,
        )>,
        sqlx::Error,
    > = if claims.is_superuser {
        sqlx::query_as(
            "UPDATE core.ai_faqs SET
                 module = COALESCE($2, module),
                 question = COALESCE($3, question),
                 answer = COALESCE($4, answer),
                 keywords = COALESCE($5::jsonb, keywords),
                 category = COALESCE($6, category),
                 status = COALESCE($7, status),
                 updated_at = now()
             WHERE id = $1 AND deleted_at IS NULL
             RETURNING id, tenant_id, module, question, answer, keywords, category, status, created_at",
        )
        .bind(faq_id)
        .bind(req.module.as_deref())
        .bind(req.question.as_deref())
        .bind(req.answer.as_deref())
        .bind(keywords_json)
        .bind(req.category.as_deref())
        .bind(req.status.as_deref())
        .fetch_optional(&mut scope)
        .await
    } else {
        sqlx::query_as(
            "UPDATE core.ai_faqs SET
                 module = COALESCE($2, module),
                 question = COALESCE($3, question),
                 answer = COALESCE($4, answer),
                 keywords = COALESCE($5::jsonb, keywords),
                 category = COALESCE($6, category),
                 status = COALESCE($7, status),
                 updated_at = now()
             WHERE id = $1 AND deleted_at IS NULL AND tenant_id = $8
             RETURNING id, tenant_id, module, question, answer, keywords, category, status, created_at",
        )
        .bind(faq_id)
        .bind(req.module.as_deref())
        .bind(req.question.as_deref())
        .bind(req.answer.as_deref())
        .bind(keywords_json)
        .bind(req.category.as_deref())
        .bind(req.status.as_deref())
        .bind(tenant_uuid)
        .fetch_optional(&mut scope)
        .await
    };
    let _ = scope.commit().await;

    match row {
        Ok(Some(item)) => Json(ApiResponse::success(
            AdminFaqItem {
                id: item.0.to_string(),
                tenant_id: item.1.to_string(),
                module: item.2,
                question: item.3,
                answer: item.4,
                keywords: jsonb_keywords_to_vec(item.5),
                category: item.6,
                status: item.7,
                created_at: item.8,
            },
            "ok",
        ))
        .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiError {
                error: "not_found".to_string(),
                message: format!("FAQ {} 不存在或无权修改", id),
            }),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("update_admin_faq DB failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    error: "db_error".to_string(),
                    message: "FAQ 更新失败".to_string(),
                }),
            )
                .into_response()
        }
    }
}

// ==================== 辅助函数 ====================

/// jsonb keywords 列（字符串数组）→ Vec<String>；非数组/元素非字符串时降级为空数组。
fn jsonb_keywords_to_vec(v: serde_json::Value) -> Vec<String> {
    v.as_array()
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

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

/// 模块 curated FAQ 知识库（静态内置；无 DB 表）。
///
/// 这是 Copilot 的兜底指引语料：当用户提问命中 FAQ 关键词时，前端可直接展示；
/// 未命中的复杂问题仍由 LLM 会话（send_message）生成回答。qms/scm/aps/ehs/bi
/// 等未单独建库的模块回落到 General 通用条目。
fn curated_faq(module: &BusinessModule) -> Vec<FaqItem> {
    let item = |q: &str, a: &str, keywords: &[&str], category: &str| FaqItem {
        question: q.to_string(),
        answer: a.to_string(),
        keywords: keywords.iter().map(|k| k.to_string()).collect(),
        category: category.to_string(),
    };
    match module {
        BusinessModule::ERP => vec![
            item(
                "如何创建一张销售订单？",
                "在 ERP 销售模块点击「新建订单」，选择客户与物料后录入数量、价格并提交；保存后可在订单列表跟踪审批与出库状态。",
                &["销售订单", "创建", "客户", "订单"],
                "订单管理",
            ),
            item(
                "采购订单审批流程是怎样的？",
                "采购订单提交后按金额分级审批：5 万以下部门经理审批，5 万以上需财务复核；审批通过后自动生成收货预告并通知仓储。",
                &["采购", "审批", "流程", "金额"],
                "采购管理",
            ),
            item(
                "库存与 ERP 数据不一致怎么办？",
                "先在库存模块发起盘点单核对账面与实物；差异经审批后调整库存并同步 ERP 物料账，全程留痕可追溯。",
                &["库存", "盘点", "对账", "差异"],
                "库存对账",
            ),
        ],
        BusinessModule::Finance => vec![
            item(
                "如何提交一张费用报销单？",
                "进入财务模块「费用报销」，选择费用类型、上传发票并填写金额后提交；发票会自动校验重复与真伪，审批流直达部门负责人。",
                &["报销", "费用", "发票", "提交"],
                "费用报销",
            ),
            item(
                "付款审批需要哪些材料？",
                "付款申请需关联对应采购合同与入库单；对公付款还需供应商银行账户信息复核，全部材料齐备后财务出纳方可付款。",
                &["付款", "审批", "合同", "出纳"],
                "资金管理",
            ),
            item(
                "月结结账的步骤是什么？",
                "先完成应收应付核销与折旧计提，再执行试算平衡；确认无误后锁定当期期间，生成月结报表，结账后不可再补录凭证。",
                &["月结", "结账", "试算平衡", "报表"],
                "总账月结",
            ),
        ],
        BusinessModule::CRM => vec![
            item(
                "如何把一条线索转为客户？",
                "在线索列表中选择记录，点击「转化为客户」并确认联系人、公司信息；转化后线索自动归档，客户进入跟进阶段。",
                &["线索", "转化", "客户", "联系人"],
                "线索管理",
            ),
            item(
                "销售漏斗各阶段如何定义？",
                "默认阶段为：初步接触 → 需求确认 → 方案报价 → 商务谈判 → 赢单/输单。阶段推进需填写下一步计划与预计成交日期。",
                &["销售漏斗", "阶段", "赢单", "报价"],
                "销售过程",
            ),
            item(
                "如何查看客户的跟进记录？",
                "进入客户详情页的「动态」页签，可看到该客户全部跟进记录、任务与商机历史；也可在工作台按时间线筛选。",
                &["客户", "跟进", "动态", "历史"],
                "客户跟进",
            ),
        ],
        BusinessModule::WMS => vec![
            item(
                "入库收货的流程是什么？",
                "到货后凭采购订单创建收货单，逐 SKU 扫码验收数量与批次；质检合格后上架，库存实时增加并回写 ERP。",
                &["入库", "收货", "上架", "扫码"],
                "入库作业",
            ),
            item(
                "拣货任务如何分配？",
                "系统按波次规则自动合并出库订单并分配拣货员；拣货员用 PDA 领取任务，按推荐库位路径作业，完成后提交复核。",
                &["拣货", "波次", "PDA", "分配"],
                "出库作业",
            ),
            item(
                "库存预警在哪里设置？",
                "在仓储「库存预警」中按物料设置上下限阈值；低于下限自动生成补货建议，超出上限提醒滞销处理，阈值可按仓库维度配置。",
                &["预警", "阈值", "补货", "上下限"],
                "库存预警",
            ),
        ],
        _ => vec![
            item(
                "Copilot 能帮我做什么？",
                "Copilot 可以理解你的业务提问，识别意图后调用相应模块工具回答，例如查询订单、提交报销、创建客户；涉及写操作时会先请你确认。",
                &["Copilot", "能力", "意图", "帮助"],
                "通用",
            ),
            item(
                "操作提交后多久生效？",
                "查询类请求即时返回；写操作经确认后由对应业务服务处理，审批类单据按企业配置的审批流流转，可在对应模块追踪进度。",
                &["生效", "审批", "进度", "写操作"],
                "通用",
            ),
            item(
                "回答不准确怎么办？",
                "可以换一种说法补充上下文（例如说明当前所在页面或选中的单据），Copilot 会结合会话上下文重新理解；仍不满意可反馈给管理员优化知识库。",
                &["不准确", "反馈", "上下文", "重试"],
                "通用",
            ),
        ],
    }
}
use utoipa::ToSchema;
