use axum::{
    extract::{Json, State},
    routing::{get, post},
    Router,
};
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<crate::shared::AppState> {
    Router::new()
        .route("/api/ai/agent/run", post(agent_run))
        .route("/api/ai/agent/tools", get(list_agent_tools))
}

async fn agent_run(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<crate::services::AgentRequest>,
) -> Json<ApiResponse<crate::services::AgentResponse>> {
    match state.agent_service.run(req).await {
        Ok(response) => Json(ApiResponse::success(response, "Agent 执行成功")),
        Err(e) => Json(ApiResponse::error(500, &e)),
    }
}

async fn list_agent_tools() -> Json<ApiResponse<Vec<serde_json::Value>>> {
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
