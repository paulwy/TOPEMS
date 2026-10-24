//! Search 服务 MCP 端点（Phase 3 B 档第 1 步 · Streamable HTTP）
//!
//! - `POST /mcp`：JSON-RPC 2.0 over HTTP 单请求-响应（MCP 2025-03-26 Streamable HTTP 形态，
//!   非标准旧式 HTTP+SSE；client 侧 `connect_http` 按本形态对接）
//! - 认证：`Authorization: Bearer <MCP_SERVER_TOKEN>`（fail-closed：未配置 token → 503 语义
//!   -32001；token 缺失/不匹配 → 401 + JSON-RPC error -32001）
//! - 工具：`search.global` / `search.suggest` / `search.documents`，桥接 `handlers` 查询函数
//!   （复用既有 SQL 与投影逻辑，不重复实现）

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::post,
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use topems_shared_mcp::jsonrpc::{JsonRpcError, JsonRpcRequest, JsonRpcResponse};
use topems_shared_mcp::protocol::{McpCapability, McpProtocolVersion, McpTool};

use crate::handlers::{search_all, search_documents, suggest_terms};

const TOOL_GLOBAL: &str = "search.global";
const TOOL_SUGGEST: &str = "search.suggest";
const TOOL_DOCUMENTS: &str = "search.documents";
const AUTH_HEADER: &str = "authorization";
const SERVER_NAME: &str = "topems-search";
const MAX_RESULTS: i64 = 50;

/// MCP 路由（有状态：需 PgPool）
pub fn mcp_routes() -> Router<PgPool> {
    Router::new().route("/mcp", post(handle_mcp))
}

fn server_token() -> Option<String> {
    std::env::var("MCP_SERVER_TOKEN")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// 纯认证逻辑（可单测）：expected 为 None 表示服务未启用 MCP（fail-closed）
fn authorize_with(expected: Option<&str>, headers: &HeaderMap) -> Result<(), JsonRpcError> {
    let Some(expected) = expected else {
        return Err(JsonRpcError::app_error(
            -32001,
            "MCP disabled: MCP_SERVER_TOKEN not configured",
            None,
        ));
    };
    let got = headers
        .get(AUTH_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| {
            v.strip_prefix("Bearer ")
                .or_else(|| v.strip_prefix("bearer "))
        })
        .map(str::trim);
    match got {
        Some(tok) if tok == expected => Ok(()),
        _ => Err(JsonRpcError::app_error(
            -32001,
            "Unauthorized: invalid or missing MCP token",
            None,
        )),
    }
}

fn authorize(headers: &HeaderMap) -> Result<(), JsonRpcError> {
    authorize_with(server_token().as_deref(), headers)
}

/// JsonRpcResponse → serde_json::Value（axum Json 提取器需要显式 Value）
fn resp_value(resp: JsonRpcResponse) -> Value {
    serde_json::to_value(resp).unwrap_or_else(|_| json!({ "jsonrpc": "2.0", "error": { "code": -32603, "message": "response serialization failed" } }))
}

/// POST /mcp —— 认证 + JSON-RPC 分派
async fn handle_mcp(
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(req): Json<Value>,
) -> (StatusCode, Json<Value>) {
    if let Err(e) = authorize(&headers) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(resp_value(JsonRpcResponse::error(Value::Null, e))),
        );
    }

    let rq: JsonRpcRequest = match serde_json::from_value(req) {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(resp_value(JsonRpcResponse::error(
                    Value::Null,
                    JsonRpcError::parse_error(None),
                ))),
            );
        }
    };

    let id = rq.id.clone().unwrap_or(Value::Null);
    if rq.is_notification() {
        // 通知：无响应（空 body，202 Accepted 语义保留在 HTTP 层）
        return (StatusCode::ACCEPTED, Json(json!({})));
    }

    let resp = match rq.method.as_str() {
        "initialize" => handle_initialize(id),
        "tools/list" => handle_tools_list(id),
        "tools/call" => handle_tools_call(&pool, id, rq.params).await,
        "ping" => JsonRpcResponse::success(id, json!({})),
        m => JsonRpcResponse::error(id, JsonRpcError::method_not_found(m)),
    };
    (StatusCode::OK, Json(resp_value(resp)))
}

/// initialize：能力声明（仅 tools，协议版本取 2025-03-26）
fn handle_initialize(id: Value) -> JsonRpcResponse {
    let capabilities = McpCapability {
        tools: Some(topems_shared_mcp::protocol::ToolsCapability {
            list_changed: Some(false),
        }),
        resources: None,
        prompts: None,
        sampling: None,
    };
    JsonRpcResponse::success(
        id,
        json!({
            "protocolVersion": McpProtocolVersion::V20250326,
            "capabilities": capabilities,
            "serverInfo": { "name": SERVER_NAME, "version": env!("CARGO_PKG_VERSION") },
        }),
    )
}

fn tool_definitions() -> Vec<McpTool> {
    vec![
        McpTool {
            name: TOOL_GLOBAL.to_string(),
            description:
                "全局搜索用户/客户/订单/文档（跨模块聚合检索，返回匹配实体标题、路径与摘要）"
                    .to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "搜索关键词（非空）" },
                    "limit": { "type": "integer", "minimum": 1, "maximum": MAX_RESULTS, "description": "返回条数上限，默认 10" },
                    "modules": { "type": "array", "items": { "type": "string" }, "description": "限定搜索模块：user/customer/order/document，默认全部" }
                },
                "required": ["query"]
            }),
        },
        McpTool {
            name: TOOL_SUGGEST.to_string(),
            description: "搜索建议词（按历史搜索频次聚合；q 可选，传前缀则按前缀过滤）".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "q": { "type": "string", "description": "建议词前缀（可选，空则返回 7 天热门）" },
                    "limit": { "type": "integer", "minimum": 1, "maximum": MAX_RESULTS, "description": "返回条数上限，默认 10" }
                }
            }),
        },
        McpTool {
            name: TOOL_DOCUMENTS.to_string(),
            description: "文档投影检索（仅 document 模块，基于 erp 事件投影表，返回文件实体结果）"
                .to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "检索关键词（非空）" },
                    "limit": { "type": "integer", "minimum": 1, "maximum": MAX_RESULTS, "description": "返回条数上限，默认 10" }
                },
                "required": ["query"]
            }),
        },
    ]
}

fn handle_tools_list(id: Value) -> JsonRpcResponse {
    JsonRpcResponse::success(id, json!({ "tools": tool_definitions() }))
}

/// 解析并钳制 limit 参数（1..=MAX_RESULTS，非法类型按默认）
fn extract_limit(params: &Value) -> i64 {
    params
        .get("limit")
        .and_then(Value::as_i64)
        .map(|l| l.clamp(1, MAX_RESULTS))
        .unwrap_or(10)
}

fn text_result(inner: Value) -> Value {
    json!({
        "content": [ { "type": "text", "text": inner.to_string() } ],
        "isError": false,
    })
}

/// tools/call：按工具名分发到 handlers 查询
async fn handle_tools_call(pool: &PgPool, id: Value, params: Option<Value>) -> JsonRpcResponse {
    let params = params.unwrap_or_else(|| json!({}));
    let tool = params
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let args = params
        .get("arguments")
        .cloned()
        .unwrap_or_else(|| json!({}));

    match tool {
        TOOL_GLOBAL => {
            let query = args
                .get("query")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let Some(query) = query else {
                return JsonRpcResponse::error(
                    id,
                    JsonRpcError::invalid_params(Some(json!({ "reason": "query 必填且不能为空" }))),
                );
            };
            let limit = extract_limit(&args);
            let modules = args.get("modules").and_then(Value::as_array).map(|arr| {
                arr.iter()
                    .filter_map(Value::as_str)
                    .map(String::from)
                    .collect()
            });
            let results = search_all(pool, query, &modules, limit).await;
            let items: Vec<Value> = results
                .into_iter()
                .map(|r| {
                    json!({
                        "id": r.id,
                        "title": r.title,
                        "module": r.module,
                        "path": r.path,
                        "type_name": r.type_name,
                        "description": r.description,
                        "snippet": r.snippet,
                    })
                })
                .collect();
            JsonRpcResponse::success(
                id,
                text_result(json!({ "items": items, "total": items.len() })),
            )
        }
        TOOL_SUGGEST => {
            let q = args
                .get("q")
                .and_then(Value::as_str)
                .map(str::trim)
                .map(String::from);
            let limit = extract_limit(&args);
            let suggestions = suggest_terms(pool, q.as_deref(), limit).await;
            JsonRpcResponse::success(id, text_result(json!({ "suggestions": suggestions })))
        }
        TOOL_DOCUMENTS => {
            let query = args
                .get("query")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let Some(query) = query else {
                return JsonRpcResponse::error(
                    id,
                    JsonRpcError::invalid_params(Some(json!({ "reason": "query 必填且不能为空" }))),
                );
            };
            let limit = extract_limit(&args);
            let results = search_documents(pool, query, limit).await;
            let items: Vec<Value> = results
                .into_iter()
                .map(|r| {
                    json!({
                        "id": r.id,
                        "title": r.title,
                        "module": r.module,
                        "path": r.path,
                        "type_name": r.type_name,
                        "description": r.description,
                    })
                })
                .collect();
            JsonRpcResponse::success(
                id,
                text_result(json!({ "items": items, "total": items.len() })),
            )
        }
        other => JsonRpcResponse::error(
            id,
            JsonRpcError::invalid_params(Some(
                json!({ "reason": format!("unknown tool: {other}") }),
            )),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::header::{HeaderValue, AUTHORIZATION};

    fn headers_with(token: Option<&str>) -> HeaderMap {
        let mut h = HeaderMap::new();
        if let Some(t) = token {
            h.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {t}")).unwrap(),
            );
        }
        h
    }

    #[test]
    fn auth_disabled_without_token() {
        let err = authorize_with(None, &headers_with(Some("x"))).unwrap_err();
        assert_eq!(err.code, -32001);
        assert!(err.message.contains("not configured"));
    }

    #[test]
    fn auth_rejects_missing_and_wrong_token() {
        assert!(authorize_with(Some("secret"), &headers_with(None)).is_err());
        assert!(authorize_with(Some("secret"), &headers_with(Some("wrong"))).is_err());
    }

    #[test]
    fn auth_accepts_bearer_case_insensitive() {
        assert!(authorize_with(Some("secret"), &headers_with(Some("secret"))).is_ok());
        assert!(authorize_with(Some("secret"), &headers_with(Some("SeCrEt"))).is_err());
    }

    #[test]
    fn initialize_returns_protocol_and_capabilities() {
        let resp = handle_initialize(json!(1));
        assert!(resp.is_success());
        let result = resp.result.unwrap();
        assert_eq!(result["protocolVersion"], "2025-03-26");
        assert_eq!(result["serverInfo"]["name"], SERVER_NAME);
        assert!(result["capabilities"]["tools"]["listChanged"].is_boolean());
    }

    #[test]
    fn tools_list_exposes_three_namespaced_tools() {
        let resp = handle_tools_list(json!(2));
        let tools = resp.result.unwrap()["tools"].as_array().unwrap().clone();
        assert_eq!(tools.len(), 3);
        let names: Vec<&str> = tools.iter().map(|t| t["name"].as_str().unwrap()).collect();
        assert!(names.contains(&TOOL_GLOBAL));
        assert!(names.contains(&TOOL_SUGGEST));
        assert!(names.contains(&TOOL_DOCUMENTS));
        // 每个工具都声明 input_schema 且含 type=object
        for t in &tools {
            assert_eq!(t["input_schema"]["type"], "object");
        }
    }

    #[test]
    fn limit_clamped() {
        assert_eq!(extract_limit(&json!({"limit": 0})), 1);
        assert_eq!(extract_limit(&json!({"limit": 1000})), MAX_RESULTS);
        assert_eq!(extract_limit(&json!({"limit": 7})), 7);
        assert_eq!(extract_limit(&json!({})), 10);
        assert_eq!(extract_limit(&json!({"limit": "x"})), 10);
    }
}
