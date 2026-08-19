//! Dify 集成 HTTP handlers
//!
//! 路由统一前缀 `/api/core/ai/v1/dify`（由 routes.rs 装配）。
//! 所有 handler 从 AppState 取 `DifyService`，调用 Dify OpenAPI 后用 `ApiResponse<T>` 包装返回。
//!
//! 设计原则：
//! - handler 只做参数转译 + 错误映射，不写业务逻辑
//! - 网络错误返回 502，业务错误返回 400，未配置返回 503
//! - 流式调用直接转发 SSE 字节流

use crate::models::{
    DifyChatRequest, DifyChatResponse, DifyConversationListResponse, DifyFeedbackRequest,
    DifyFeedbackResponse, DifyInfoResponse, DifyListQuery, DifyMessageHistoryResponse,
    DifyMetaResponse, DifyParametersResponse, DifyStopRequest, DifyStopResponse,
};
use crate::services::DifyError;
use crate::shared::AppState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use topems_shared_core::response::ApiResponse as CoreApiResponse;

// 简化用别名
type ApiOk<T> = Json<CoreApiResponse<T>>;

fn err_to_response<T>(e: DifyError) -> ApiOk<T> {
    let (code, msg) = match e {
        DifyError::NotConfigured => (
            StatusCode::SERVICE_UNAVAILABLE,
            "Dify 未配置：请设置 DIFY_API_KEY 与 DIFY_BASE_URL".to_string(),
        ),
        DifyError::Network(m) => (StatusCode::BAD_GATEWAY, format!("Dify 网络错误: {}", m)),
        DifyError::Status { status, body } => (
            StatusCode::BAD_GATEWAY,
            format!("Dify 状态 {}: {}", status, body),
        ),
        DifyError::Deserialize(m) => (StatusCode::BAD_GATEWAY, format!("Dify 响应解析失败: {}", m)),
        DifyError::Business(m) => (StatusCode::BAD_REQUEST, format!("Dify 业务错误: {}", m)),
    };
    Json(CoreApiResponse::<T>::error(code.as_u16(), &msg))
}

// =============================================================================
// 对话
// =============================================================================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/dify/chat",
    request_body = DifyChatRequest,
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn chat(
    State(state): State<AppState>,
    Json(mut req): Json<DifyChatRequest>,
) -> ApiOk<DifyChatResponse> {
    // 强制 blocking；流式调用请走 /dify/chat/stream
    req.response_mode = "blocking".to_string();
    match state.dify_service.chat(req).await {
        Ok(resp) => Json(CoreApiResponse::success(resp, "Dify chat 成功")),
        Err(e) => err_to_response(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/dify/chat/stream",
    request_body = DifyChatRequest,
    tag = "ai-dify",
    responses((status = 200, description = "SSE 流式响应")),
)]
pub async fn chat_stream(
    State(state): State<AppState>,
    Json(mut req): Json<DifyChatRequest>,
) -> Result<axum::response::Response, ApiOk<DifyChatResponse>> {
    req.response_mode = "streaming".to_string();
    match state.dify_service.chat_stream(req).await {
        Ok(body) => {
            let mut resp = axum::response::Response::new(body);
            let headers = resp.headers_mut();
            headers.insert(
                axum::http::header::CONTENT_TYPE,
                axum::http::HeaderValue::from_static("text/event-stream"),
            );
            headers.insert(
                axum::http::header::CACHE_CONTROL,
                axum::http::HeaderValue::from_static("no-cache"),
            );
            headers.insert(
                axum::http::header::CONNECTION,
                axum::http::HeaderValue::from_static("keep-alive"),
            );
            Ok(resp)
        }
        Err(e) => Err(err_to_response(e)),
    }
}

// =============================================================================
// 应用元信息
// =============================================================================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dify/info",
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn info(State(state): State<AppState>) -> ApiOk<DifyInfoResponse> {
    match state.dify_service.info().await {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify info")),
        Err(e) => err_to_response(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dify/parameters",
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn parameters(
    State(state): State<AppState>,
    Query(q): Query<DifyListQuery>,
) -> ApiOk<DifyParametersResponse> {
    match state.dify_service.parameters(&q.user).await {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify parameters")),
        Err(e) => err_to_response(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dify/meta",
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn meta(State(state): State<AppState>) -> ApiOk<DifyMetaResponse> {
    match state.dify_service.meta().await {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify meta")),
        Err(e) => err_to_response(e),
    }
}

// =============================================================================
// 会话与消息历史
// =============================================================================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dify/conversations",
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn list_conversations(
    State(state): State<AppState>,
    Query(q): Query<DifyListQuery>,
) -> ApiOk<DifyConversationListResponse> {
    match state
        .dify_service
        .list_conversations(&q.user, q.limit)
        .await
    {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify conversations")),
        Err(e) => err_to_response(e),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dify/messages",
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn list_messages(
    State(state): State<AppState>,
    Query(q): Query<DifyListQuery>,
) -> ApiOk<DifyMessageHistoryResponse> {
    let conv = q.conversation_id.unwrap_or_default();
    if conv.is_empty() {
        return Json(CoreApiResponse::error(
            StatusCode::BAD_REQUEST.as_u16(),
            "缺少 conversation_id 参数",
        ));
    }
    match state
        .dify_service
        .list_messages(&q.user, &conv, q.limit)
        .await
    {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify messages")),
        Err(e) => err_to_response(e),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ai:delete"])),
    path = "/api/ai/dify/conversations/{conversation_id}",
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_conversation(
    State(state): State<AppState>,
    Path(conversation_id): Path<String>,
    Query(q): Query<DifyListQuery>,
) -> ApiOk<serde_json::Value> {
    match state
        .dify_service
        .delete_conversation(&conversation_id, &q.user)
        .await
    {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify 会话已删除")),
        Err(e) => err_to_response(e),
    }
}

// =============================================================================
// 反馈与停止
// =============================================================================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/dify/messages/{message_id}/feedbacks",
    request_body = DifyFeedbackRequest,
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn feedback(
    State(state): State<AppState>,
    Path(message_id): Path<String>,
    Json(mut req): Json<DifyFeedbackRequest>,
) -> ApiOk<DifyFeedbackResponse> {
    if req.user.is_empty() {
        req.user = "topems-user".to_string();
    }
    match state.dify_service.feedback(&message_id, req).await {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify feedback 成功")),
        Err(e) => err_to_response(e),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/dify/messages/{message_id}/stop",
    request_body = DifyStopRequest,
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn stop(
    State(state): State<AppState>,
    Path(message_id): Path<String>,
    Json(mut req): Json<DifyStopRequest>,
) -> ApiOk<DifyStopResponse> {
    if req.user.is_empty() {
        req.user = "topems-user".to_string();
    }
    match state.dify_service.stop(&message_id, req).await {
        Ok(v) => Json(CoreApiResponse::success(v, "Dify stop 成功")),
        Err(e) => err_to_response(e),
    }
}

// =============================================================================
// 健康检查
// =============================================================================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dify/health",
    tag = "ai-dify",
    responses((status = 200, description = "OK")),
)]
pub async fn health(State(state): State<AppState>) -> ApiOk<serde_json::Value> {
    match state.dify_service.health().await {
        Ok(()) => Json(CoreApiResponse::success(
            serde_json::json!({ "status": "healthy", "provider": "dify" }),
            "Dify 可达",
        )),
        Err(e) => {
            let v = serde_json::json!({ "status": "unhealthy", "error": e.to_string() });
            Json(CoreApiResponse::success(v, "Dify 不可达"))
        }
    }
}

// 让 unused 警告静默：从 AppState 提取 DifyService 时可能用到 FromRef
#[allow(dead_code)]
fn _assert_dify_service_in_appstate(state: &AppState) -> crate::services::DifyService {
    state.dify_service.clone()
}
