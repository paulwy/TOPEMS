//! MCP Server 核心 — 请求路由和初始化管理。
//!
//! 处理 MCP 协议的 JSON-RPC 请求，包括 initialize、tools/list、tools/call 等方法。
//! 维护服务器初始化状态和工具注册表。

use std::sync::Arc;

use serde_json::{json, Value};
use tokio::sync::RwLock;

use topems_shared_mcp::jsonrpc::{JsonRpcError, JsonRpcRequest, JsonRpcResponse};
use topems_shared_mcp::protocol::{
    InitializeParams, InitializeResult, McpCapability, McpProtocolVersion, McpServerInfo,
    McpToolResult, ToolsCapability,
};

use super::security::McpSecurityMiddleware;
use super::tools::{ToolExecutionError, ToolRegistry};

/// MCP Server 状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ServerState {
    /// 未初始化（等待 initialize 请求）
    Uninitialized,
    /// 已初始化（收到 initialize 请求，等待 initialized 通知）
    Initializing,
    /// 运行中（收到 initialized 通知，可以处理业务请求）
    Running,
    /// 已关闭
    Shutdown,
}

/// MCP Server
///
/// 核心 MCP 协议服务器，处理 JSON-RPC 请求并路由到对应的处理函数。
///
/// # 示例
///
/// ```
/// use topems_ai::dsh::mcp::server::McpServer;
/// use topems_shared_mcp::jsonrpc::JsonRpcRequest;
/// use serde_json::json;
///
/// # async fn example() {
/// let server = McpServer::new("topems-mcp", "1.0.0");
///
/// // 处理 initialize 请求
/// let request = JsonRpcRequest::new(
///     "initialize",
///     json!(1),
///     Some(json!({
///         "protocolVersion": "2025-03-26",
///         "capabilities": {},
///         "clientInfo": { "name": "test-client", "version": "1.0" }
///     })),
/// );
///
/// let response = server.handle_request(request).await.unwrap();
/// assert!(response.is_success());
/// # }
/// ```
#[derive(Clone)]
pub struct McpServer {
    /// 服务器名称
    name: String,
    /// 服务器版本
    version: String,
    /// 服务器状态
    state: Arc<RwLock<ServerState>>,
    /// 工具注册表
    tools: ToolRegistry,
    /// 协议版本
    protocol_version: McpProtocolVersion,
    /// 安全中间件
    security: McpSecurityMiddleware,
}

impl McpServer {
    /// 创建新的 MCP Server
    pub fn new(name: impl Into<String>, version: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            version: version.into(),
            state: Arc::new(RwLock::new(ServerState::Uninitialized)),
            tools: ToolRegistry::new(),
            protocol_version: McpProtocolVersion::default(),
            security: McpSecurityMiddleware::new(),
        }
    }

    /// 获取工具注册表（用于注册工具）
    pub fn tool_registry(&self) -> &ToolRegistry {
        &self.tools
    }

    /// 获取服务器状态
    pub async fn state(&self) -> ServerState {
        *self.state.read().await
    }

    /// 获取服务器名称
    pub fn name(&self) -> &str {
        &self.name
    }

    /// 获取服务器版本
    pub fn version(&self) -> &str {
        &self.version
    }

    /// 处理 JSON-RPC 请求
    ///
    /// 根据请求方法路由到对应的处理函数。
    pub async fn handle_request(&self, request: JsonRpcRequest) -> Option<JsonRpcResponse> {
        // 通知（无 ID）不需要响应
        if request.is_notification() {
            self.handle_notification(&request).await;
            return None;
        }

        let id = request.id.clone().unwrap_or(json!(0));

        // 检查服务器状态（initialize 除外）
        if request.method != "initialize" {
            let state = *self.state.read().await;
            if state != ServerState::Running {
                return Some(JsonRpcResponse::error(
                    id,
                    JsonRpcError::invalid_request(Some(json!({
                        "message": "Server not initialized. Call initialize first.",
                        "state": format!("{:?}", state)
                    }))),
                ));
            }
        }

        match request.method.as_str() {
            "initialize" => Some(self.handle_initialize(id, request.params).await),
            "tools/list" => Some(self.handle_tools_list(id).await),
            "tools/call" => Some(self.handle_tools_call(id, request.params).await),
            "ping" => Some(JsonRpcResponse::success(id, json!({}))),
            _ => Some(JsonRpcResponse::error(
                id,
                JsonRpcError::method_not_found(&request.method),
            )),
        }
    }

    /// 处理通知
    async fn handle_notification(&self, request: &JsonRpcRequest) {
        match request.method.as_str() {
            "notifications/initialized" => {
                let mut state = self.state.write().await;
                if *state == ServerState::Initializing {
                    *state = ServerState::Running;
                    tracing::info!("MCP Server initialized and running");
                }
            }
            "notifications/cancelled" => {
                tracing::debug!("Request cancelled notification received");
            }
            _ => {
                tracing::debug!("Unhandled notification: {}", request.method);
            }
        }
    }

    /// 处理 initialize 请求
    async fn handle_initialize(&self, id: Value, params: Option<Value>) -> JsonRpcResponse {
        // 解析参数
        let _params: InitializeParams = match params {
            Some(p) => match serde_json::from_value(p) {
                Ok(p) => p,
                Err(e) => {
                    return JsonRpcResponse::error(
                        id,
                        JsonRpcError::invalid_params(Some(json!({"error": e.to_string()}))),
                    )
                }
            },
            None => {
                return JsonRpcResponse::error(
                    id,
                    JsonRpcError::invalid_params(Some(json!({"error": "Missing params"}))),
                )
            }
        };

        // 更新状态为 Initializing
        let mut state = self.state.write().await;
        *state = ServerState::Initializing;

        let result = InitializeResult {
            protocol_version: self.protocol_version,
            capabilities: McpCapability {
                tools: Some(ToolsCapability {
                    list_changed: Some(true),
                }),
                resources: None,
                prompts: None,
                sampling: None,
            },
            server_info: McpServerInfo {
                name: self.name.clone(),
                version: self.version.clone(),
            },
            instructions: Some(
                "TOPEMS MCP Server - 提供 ERP/CRM/Finance 等业务模块的 AI 工具调用能力".to_string(),
            ),
        };

        match serde_json::to_value(result) {
            Ok(v) => JsonRpcResponse::success(id, v),
            Err(e) => JsonRpcResponse::error(id, JsonRpcError::internal_error(e.to_string(), None)),
        }
    }

    /// 处理 tools/list 请求
    async fn handle_tools_list(&self, id: Value) -> JsonRpcResponse {
        let tools = self.tools.list_tools().await;
        JsonRpcResponse::success(id, json!({ "tools": tools }))
    }

    /// 处理 tools/call 请求
    async fn handle_tools_call(&self, id: Value, params: Option<Value>) -> JsonRpcResponse {
        let params = match params {
            Some(p) => p,
            None => {
                return JsonRpcResponse::error(
                    id,
                    JsonRpcError::invalid_params(Some(json!({"error": "Missing params"}))),
                )
            }
        };

        let tool_name = match params["name"].as_str() {
            Some(name) => name.to_string(),
            None => {
                return JsonRpcResponse::error(
                    id,
                    JsonRpcError::invalid_params(Some(json!({"error": "Missing tool name"}))),
                )
            }
        };

        let arguments = params["arguments"].clone();

        // 安全检查：校验工具输入
        if let Err(e) = self.security.validate_tool_input(&tool_name, &arguments).await {
            let (code, message) = match e {
                ToolExecutionError::NotFound(_) => (-32601, e.to_string()),
                ToolExecutionError::Validation(_) => (-32602, e.to_string()),
                ToolExecutionError::Execution(_) => (-32000, e.to_string()),
                ToolExecutionError::PermissionDenied(_) => (-32001, e.to_string()),
            };
            return JsonRpcResponse::error(id, JsonRpcError::app_error(code, message, None));
        }

        match self.tools.call_tool(&tool_name, arguments).await {
            Ok(result) => {
                let result_value = match serde_json::to_value(result) {
                    Ok(v) => v,
                    Err(e) => {
                        return JsonRpcResponse::error(
                            id,
                            JsonRpcError::internal_error(e.to_string(), None),
                        )
                    }
                };
                // 安全检查：脱敏输出
                let sanitized = self.security.sanitize_output(result_value);
                JsonRpcResponse::success(id, sanitized)
            }
            Err(e) => {
                let (code, message) = match e {
                    ToolExecutionError::NotFound(_) => (-32601, e.to_string()),
                    ToolExecutionError::Validation(_) => (-32602, e.to_string()),
                    ToolExecutionError::Execution(_) => (-32000, e.to_string()),
                    ToolExecutionError::PermissionDenied(_) => (-32001, e.to_string()),
                };

                JsonRpcResponse::error(id, JsonRpcError::app_error(code, message, None))
            }
        }
    }

    /// 注册系统工具（内置工具）
    pub async fn register_system_tools(&self) {
        use topems_shared_mcp::protocol::McpContent;
        use topems_shared_mcp::schema::SchemaBuilder;

        // ping 工具
        self.tools
            .register(
                "system.ping",
                "ping 测试，返回 pong",
                SchemaBuilder::object().build(),
                |_| {
                    Ok(McpToolResult {
                        content: vec![McpContent::text("pong")],
                        is_error: None,
                    })
                },
            )
            .await;

        // server_info 工具
        let name = self.name.clone();
        let version = self.version.clone();
        self.tools
            .register(
                "system.info",
                "获取服务器信息",
                SchemaBuilder::object().build(),
                move |_| {
                    Ok(McpToolResult {
                        content: vec![McpContent::text(format!("Server: {} v{}", name, version))],
                        is_error: None,
                    })
                },
            )
            .await;

        tracing::info!("Registered {} system tools", self.tools.len().await);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_mcp::protocol::McpContent;
    use topems_shared_mcp::schema::SchemaBuilder;

    #[tokio::test]
    async fn test_server_initial_state() {
        let server = McpServer::new("test", "1.0.0");
        assert_eq!(server.state().await, ServerState::Uninitialized);
    }

    #[tokio::test]
    async fn test_initialize() {
        let server = McpServer::new("test", "1.0.0");

        let request = JsonRpcRequest::new(
            "initialize",
            json!(1),
            Some(json!({
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "test-client", "version": "1.0" }
            })),
        );

        let response = server.handle_request(request).await.unwrap();
        assert!(response.is_success());
        assert_eq!(server.state().await, ServerState::Initializing);
    }

    #[tokio::test]
    async fn test_initialized_notification() {
        let server = McpServer::new("test", "1.0.0");

        // initialize
        let init_request = JsonRpcRequest::new(
            "initialize",
            json!(1),
            Some(json!({
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "test", "version": "1.0" }
            })),
        );
        server.handle_request(init_request).await;

        // initialized notification
        let notif = JsonRpcRequest::notification("notifications/initialized", None);
        server.handle_request(notif).await;

        assert_eq!(server.state().await, ServerState::Running);
    }

    #[tokio::test]
    async fn test_tools_list_before_init() {
        let server = McpServer::new("test", "1.0.0");

        let request = JsonRpcRequest::new("tools/list", json!(1), None);
        let response = server.handle_request(request).await.unwrap();

        // 未初始化时应该返回错误
        assert!(!response.is_success());
    }

    #[tokio::test]
    async fn test_tools_list_after_init() {
        let server = McpServer::new("test", "1.0.0");
        server.register_system_tools().await;

        // initialize
        let init_request = JsonRpcRequest::new(
            "initialize",
            json!(1),
            Some(json!({
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "test", "version": "1.0" }
            })),
        );
        server.handle_request(init_request).await;

        // initialized notification
        let notif = JsonRpcRequest::notification("notifications/initialized", None);
        server.handle_request(notif).await;

        // tools/list
        let request = JsonRpcRequest::new("tools/list", json!(2), None);
        let response = server.handle_request(request).await.unwrap();
        assert!(response.is_success());

        let result = response.result.unwrap();
        let tools = result["tools"].as_array().unwrap();
        assert_eq!(tools.len(), 2); // system.ping + system.info
    }

    #[tokio::test]
    async fn test_tools_call() {
        let server = McpServer::new("test", "1.0.0");
        server.register_system_tools().await;

        // initialize + initialized
        let init_request = JsonRpcRequest::new(
            "initialize",
            json!(1),
            Some(json!({
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "test", "version": "1.0" }
            })),
        );
        server.handle_request(init_request).await;
        server
            .handle_request(JsonRpcRequest::notification(
                "notifications/initialized",
                None,
            ))
            .await;

        // tools/call system.ping
        let request = JsonRpcRequest::new(
            "tools/call",
            json!(2),
            Some(json!({ "name": "system.ping", "arguments": {} })),
        );
        let response = server.handle_request(request).await.unwrap();
        assert!(response.is_success());
    }

    #[tokio::test]
    async fn test_method_not_found() {
        let server = McpServer::new("test", "1.0.0");

        // initialize first
        let init_request = JsonRpcRequest::new(
            "initialize",
            json!(1),
            Some(json!({
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "test", "version": "1.0" }
            })),
        );
        server.handle_request(init_request).await;
        server
            .handle_request(JsonRpcRequest::notification(
                "notifications/initialized",
                None,
            ))
            .await;

        let request = JsonRpcRequest::new("nonexistent/method", json!(2), None);
        let response = server.handle_request(request).await.unwrap();
        assert!(!response.is_success());
    }

    #[tokio::test]
    async fn test_ping() {
        let server = McpServer::new("test", "1.0.0");

        // initialize first
        let init_request = JsonRpcRequest::new(
            "initialize",
            json!(1),
            Some(json!({
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": { "name": "test", "version": "1.0" }
            })),
        );
        server.handle_request(init_request).await;
        server
            .handle_request(JsonRpcRequest::notification(
                "notifications/initialized",
                None,
            ))
            .await;

        let request = JsonRpcRequest::new("ping", json!(2), None);
        let response = server.handle_request(request).await.unwrap();
        assert!(response.is_success());
    }
}
