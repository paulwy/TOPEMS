//! DSH Agent API 处理器
//!
//! 提供基于 DSH Agent 编排器的 REST API 端点，支持：
//! - 同步执行 Agent
//! - 流式执行 Agent（SSE）
//! - 获取会话上下文
//! - 清除会话
//! - 列出可用工具

use axum::{
    extract::{Path, State},
    response::sse::{Event, Sse},
    Json,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::pin::Pin;
use topems_shared_core::response::ApiResponse;
use tracing::info;

use crate::dsh::agent::orchestrator::AgentExecuteRequest;
use crate::dsh::agent::ExecutionStep;
use crate::shared::AppState;

/// Agent 执行请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DshAgentExecuteRequest {
    /// 用户查询
    pub query: String,
    /// 会话 ID（可选，用于多轮对话）
    pub session_id: Option<String>,
    /// 最大迭代次数（可选）
    pub max_iterations: Option<usize>,
    /// 可用工具列表（可选，为空表示使用所有工具）
    pub available_tools: Option<Vec<String>>,
}

/// Agent 执行响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DshAgentExecuteResponse {
    /// 会话 ID
    pub session_id: String,
    /// 最终答案
    pub answer: String,
    /// 执行步骤
    pub steps: Vec<ExecutionStep>,
    /// 使用的工具列表
    pub tools_used: Vec<String>,
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
    /// 迭代次数
    pub iterations: usize,
}

/// 会话信息响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfoResponse {
    /// 会话 ID
    pub session_id: String,
    /// 消息数量
    pub message_count: usize,
    /// 上下文变量
    pub variables: serde_json::Value,
}

/// 同步执行 Agent
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/dsh/agent/execute",
    request_body = DshAgentExecuteRequest,
    tag = "ai",
    responses(
        (status = 200, description = "Agent 执行成功"),
    ),
)]
pub async fn execute_agent(
    State(state): State<AppState>,
    Json(req): Json<DshAgentExecuteRequest>,
) -> Json<ApiResponse<DshAgentExecuteResponse>> {
    let orchestrator = match &state.dsh_agent_orchestrator {
        Some(o) => o,
        None => {
            return Json(ApiResponse::error(503, "DSH Agent 编排器未初始化"));
        }
    };

    let session_id = req
        .session_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let execute_request = AgentExecuteRequest {
        query: req.query,
        session_id: Some(session_id.clone()),
        max_iterations: req.max_iterations,
        available_tools: req.available_tools,
        stream: Some(false),
        context_variables: None,
    };

    info!(session_id = %session_id, "DSH Agent execution started");

    let response = orchestrator.execute(execute_request).await;

    let tools_used = response
        .steps
        .iter()
        .filter_map(|s| s.tool_name.clone())
        .collect::<Vec<_>>();

    let result = DshAgentExecuteResponse {
        session_id: response.session_id,
        answer: response.answer,
        steps: response.steps,
        tools_used,
        total_duration_ms: response.total_duration_ms,
        iterations: response.total_iterations,
    };

    Json(ApiResponse::success(result, "Agent 执行成功"))
}

/// 流式执行 Agent（SSE）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/dsh/agent/stream",
    request_body = DshAgentExecuteRequest,
    tag = "ai",
    responses(
        (status = 200, description = "Agent 流式执行"),
    ),
)]
pub async fn stream_agent(
    State(state): State<AppState>,
    Json(req): Json<DshAgentExecuteRequest>,
) -> Sse<Pin<Box<dyn Stream<Item = Result<Event, Infallible>> + Send>>> {
    let orchestrator = match &state.dsh_agent_orchestrator {
        Some(o) => o.clone(),
        None => {
            let stream = futures::stream::iter(vec![Ok(Event::default()
                .event("error")
                .data(r#"{"error":"DSH Agent 编排器未初始化"}"#))]);
            return Sse::new(Box::pin(stream));
        }
    };

    let session_id = req
        .session_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let execute_request = AgentExecuteRequest {
        query: req.query,
        session_id: Some(session_id.clone()),
        max_iterations: req.max_iterations,
        available_tools: req.available_tools,
        stream: Some(true),
        context_variables: None,
    };

    info!(session_id = %session_id, "DSH Agent streaming execution started");

    match orchestrator.execute_streaming(execute_request).await {
        Ok(streaming_response) => streaming_response.into_pinned_sse(),
        Err(e) => {
            let stream = futures::stream::iter(vec![Ok(Event::default()
                .event("error")
                .data(format!(r#"{{"error":"{}"}}"#, e.replace('"', "'"))))]);
            Sse::new(Box::pin(stream))
        }
    }
}

/// 获取会话上下文
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dsh/agent/session/{session_id}",
    tag = "ai",
    responses(
        (status = 200, description = "会话信息"),
    ),
)]
pub async fn get_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Json<ApiResponse<Option<SessionInfoResponse>>> {
    let orchestrator = match &state.dsh_agent_orchestrator {
        Some(o) => o,
        None => {
            return Json(ApiResponse::error(503, "DSH Agent 编排器未初始化"));
        }
    };

    match orchestrator.get_session_context(&session_id).await {
        Some(context) => {
            let info = SessionInfoResponse {
                session_id: session_id.clone(),
                message_count: context.messages.len(),
                variables: serde_json::to_value(&context.variables).unwrap_or_default(),
            };
            Json(ApiResponse::success(Some(info), "获取会话成功"))
        }
        None => Json(ApiResponse::success(None, "会话不存在")),
    }
}

/// 清除会话
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/dsh/agent/session/{session_id}",
    tag = "ai",
    responses(
        (status = 200, description = "会话已清除"),
    ),
)]
pub async fn clear_session(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Json<ApiResponse<bool>> {
    let orchestrator = match &state.dsh_agent_orchestrator {
        Some(o) => o,
        None => {
            return Json(ApiResponse::error(503, "DSH Agent 编排器未初始化"));
        }
    };

    let cleared = orchestrator.clear_session(&session_id).await;
    Json(ApiResponse::success(cleared, "会话清除操作完成"))
}

/// 列出可用工具
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dsh/agent/tools",
    tag = "ai",
    responses(
        (status = 200, description = "可用工具列表"),
    ),
)]
pub async fn list_tools(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let orchestrator = match &state.dsh_agent_orchestrator {
        Some(o) => o,
        None => {
            return Json(ApiResponse::error(503, "DSH Agent 编排器未初始化"));
        }
    };

    let tools = orchestrator
        .tool_registry()
        .list_tools()
        .await
        .into_iter()
        .map(|tool| {
            serde_json::json!({
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.input_schema,
            })
        })
        .collect::<Vec<_>>();

    Json(ApiResponse::success(tools, "获取工具列表成功"))
}

/// 获取活跃会话数
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/dsh/agent/active-sessions",
    tag = "ai",
    responses(
        (status = 200, description = "活跃会话数"),
    ),
)]
pub async fn active_sessions(State(state): State<AppState>) -> Json<ApiResponse<usize>> {
    let orchestrator = match &state.dsh_agent_orchestrator {
        Some(o) => o,
        None => {
            return Json(ApiResponse::error(503, "DSH Agent 编排器未初始化"));
        }
    };

    let count = orchestrator.active_sessions().await;
    Json(ApiResponse::success(count, "获取活跃会话数成功"))
}
