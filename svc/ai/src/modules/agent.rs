use axum::{
    extract::{Json, State},
    routing::{get, post},
    Router,
};
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<crate::shared::AppState> {
    Router::new()
        .route("/agent/run", post(agent_run))
        .route("/agent/tools", get(list_agent_tools))
}

#[utoipa::path(
    post,
    path = "/api/ai/agent/run",
    request_body = crate::services::AgentRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn agent_run(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<crate::services::AgentRequest>,
) -> Json<ApiResponse<crate::services::AgentResponse>> {
    match state.agent_service.run(req).await {
        Ok(response) => Json(ApiResponse::success(response, "Agent 执行成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

#[utoipa::path(
    get,
    path = "/api/ai/agent/tools",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_agent_tools() -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let tools = vec![
        serde_json::json!({
            "name": "search",
            "description": "向量搜索知识库",
            "parameters": [
                { "name": "query", "type": "string", "required": true, "description": "搜索查询" }
            ]
        }),
        serde_json::json!({
            "name": "document_qa",
            "description": "文档问答",
            "parameters": [
                { "name": "document_id", "type": "string", "required": true, "description": "文档ID" },
                { "name": "question", "type": "string", "required": true, "description": "问题" }
            ]
        }),
        serde_json::json!({
            "name": "calculator",
            "description": "数学计算",
            "parameters": [
                { "name": "expression", "type": "string", "required": true, "description": "数学表达式" }
            ]
        }),
        serde_json::json!({
            "name": "weather",
            "description": "查询天气",
            "parameters": [
                { "name": "city", "type": "string", "required": true, "description": "城市名称" }
            ]
        }),
        serde_json::json!({
            "name": "database_query",
            "description": "数据库查询",
            "parameters": [
                { "name": "query", "type": "string", "required": true, "description": "SQL 查询" }
            ]
        }),
        serde_json::json!({
            "name": "code_execution",
            "description": "代码执行",
            "parameters": [
                { "name": "code", "type": "string", "required": true, "description": "代码" }
            ]
        }),
        serde_json::json!({
            "name": "web_search",
            "description": "Web 搜索",
            "parameters": [
                { "name": "query", "type": "string", "required": true, "description": "搜索查询" }
            ]
        }),
    ];

    Json(ApiResponse::success(tools, "获取可用工具列表成功"))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── create_routes ──

    #[test]
    fn test_create_routes_returns_router() {
        // 仅验证路由能创建（不实际调用）
        let _router = create_routes();
    }

    // ── list_agent_tools handler ──

    #[tokio::test]
    async fn test_list_agent_tools_returns_seven_tools() {
        let resp = list_agent_tools().await;
        let body = resp.0.data.expect("tools list should be present");
        assert_eq!(body.len(), 7);
        let names: Vec<&str> = body
            .iter()
            .map(|v| v.get("name").and_then(|n| n.as_str()).unwrap_or(""))
            .collect();
        assert!(names.contains(&"search"));
        assert!(names.contains(&"calculator"));
        assert!(names.contains(&"weather"));
        assert!(names.contains(&"database_query"));
        assert!(names.contains(&"code_execution"));
        assert!(names.contains(&"web_search"));
        assert!(names.contains(&"document_qa"));
    }

    #[tokio::test]
    async fn test_list_agent_tools_search_has_query_param() {
        let resp = list_agent_tools().await;
        let body = resp.0.data.expect("tools list should be present");
        let search = body
            .iter()
            .find(|v| v.get("name").and_then(|n| n.as_str()) == Some("search"))
            .expect("search tool should exist");
        let params = search
            .get("parameters")
            .and_then(|p| p.as_array())
            .expect("parameters should be array");
        assert!(!params.is_empty());
    }

    #[tokio::test]
    async fn test_list_agent_tools_calculator_has_expression_param() {
        let resp = list_agent_tools().await;
        let body = resp.0.data.expect("tools list should be present");
        let calc = body
            .iter()
            .find(|v| v.get("name").and_then(|n| n.as_str()) == Some("calculator"))
            .expect("calculator tool should exist");
        let params = calc
            .get("parameters")
            .and_then(|p| p.as_array())
            .expect("parameters should be array");
        let param_names: Vec<&str> = params
            .iter()
            .map(|p| p.get("name").and_then(|n| n.as_str()).unwrap_or(""))
            .collect();
        assert!(param_names.contains(&"expression"));
    }

    #[tokio::test]
    async fn test_list_agent_tools_response_has_success_true() {
        let resp = list_agent_tools().await;
        assert!(resp.0.success);
    }

    #[tokio::test]
    async fn test_list_agent_tools_response_message() {
        let resp = list_agent_tools().await;
        assert!(!resp.0.message.is_empty());
    }
}
