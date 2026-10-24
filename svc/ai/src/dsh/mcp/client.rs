//! MCP Client（stdio / HTTP 双传输）——DSH 消费外部 MCP server（Phase 1 POC + Phase 3 B 档）。
//!
//! 方向与 [`super::stdio::run_stdio`]（server 角色）相反：本模块作为 **client 角色**，
//! 通过 stdio 子进程（Phase 1）或 HTTP POST（Phase 3 B 档第 2 步，Streamable HTTP）
//! 与外部 MCP server 交换 JSON-RPC，完成标准握手（initialize → notifications/initialized）
//! 后提供 `tools/list` / `tools/call` 调用面。
//!
//! - stdio：spawn 子进程 + 逐行交换（零网络面，天然隔离）
//! - HTTP：`POST {url}/mcp` 单请求-响应（MCP 2025-03-26 Streamable HTTP 形态），
//!   认证走 `Authorization: Bearer <token>`；握手/工具清单/调用循环与 stdio 对齐

use std::sync::atomic::{AtomicU64, Ordering};

use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, BufWriter};
use tokio::process::{Child, ChildStdin, ChildStdout};

use topems_shared_mcp::jsonrpc::{JsonRpcError, JsonRpcRequest, JsonRpcResponse};
use topems_shared_mcp::protocol::{McpContent, McpTool, McpToolResult};

use super::tools::ToolExecutionError;

/// MCP 协议版本（与 server 侧一致）
const PROTOCOL_VERSION: &str = "2025-03-26";

/// MCP Client 错误
#[derive(Debug, thiserror::Error)]
pub enum ClientError {
    /// 子进程 spawn 失败
    #[error("外部 MCP server 启动失败: {0}")]
    Spawn(String),
    /// IO 错误（读写 stdin/stdout）
    #[error("与外部 MCP server 通信失败: {0}")]
    Io(String),
    /// HTTP 传输错误（连接/非 2xx 且无 JSON-RPC 错误体）
    #[error("外部 MCP HTTP 传输失败: {0}")]
    Http(String),
    /// 子进程提前退出（EOF）
    #[error("外部 MCP server 意外退出（EOF，退出码: {0:?}）")]
    Eof(Option<u32>),
    /// JSON 解析失败
    #[error("外部 MCP server 返回无法解析的 JSON: {0}")]
    Parse(String),
    /// 协议握手失败
    #[error("外部 MCP 握手失败: {0}")]
    Handshake(String),
    /// 远端返回 JSON-RPC 错误
    #[error("外部 MCP 工具调用错误 [{code}]: {message}")]
    Remote {
        /// 错误码
        code: i32,
        /// 错误消息
        message: String,
    },
}

impl From<ClientError> for ToolExecutionError {
    fn from(e: ClientError) -> Self {
        ToolExecutionError::Execution(format!("外部 MCP 调用失败: {e}"))
    }
}

/// TopemsError 桥接（bridge-coverage 门禁：新增传播型错误必须桥接统一错误面）
impl From<ClientError> for topems_shared_core::error::TopemsError {
    fn from(e: ClientError) -> Self {
        topems_shared_core::error::TopemsError::Internal(format!("外部 MCP 调用失败: {e}"))
    }
}

/// 底层传输通道
enum McpTransport {
    /// stdio 子进程（单管道串行）
    Stdio {
        _child: Child,
        stdin: BufWriter<ChildStdin>,
        stdout: BufReader<ChildStdout>,
    },
    /// HTTP POST（Streamable HTTP；token 可选）
    Http {
        http: reqwest::Client,
        url: String,
        token: Option<String>,
    },
}

/// MCP Client：stdio / HTTP 双传输。
///
/// 同一时刻只处理一个请求-响应；`call_tool` 等方法需要 `&mut self`，
/// 外部工具注册器通过 `Mutex<McpClient>` 串行化。
pub struct McpClient {
    transport: McpTransport,
    next_id: AtomicU64,
}

impl McpClient {
    /// spawn 外部 MCP server 子进程（stdio 传输），完成 initialize 握手。
    ///
    /// 握手失败（子进程立即退出 / 协议版本不匹配 / 返回错误）返回 Err。
    pub async fn connect_stdio(
        command: &str,
        args: &[String],
        envs: &[(String, String)],
    ) -> Result<Self, ClientError> {
        let mut cmd = tokio::process::Command::new(command);
        cmd.args(args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::inherit()); // 外部 server 日志透传 stderr，便于排障
        for (k, v) in envs {
            cmd.env(k, v);
        }
        let mut child = cmd
            .spawn()
            .map_err(|e| ClientError::Spawn(format!("{command}: {e}")))?;
        let stdin = BufWriter::new(
            child
                .stdin
                .take()
                .ok_or_else(|| ClientError::Spawn("stdin 管道不可用".to_string()))?,
        );
        let stdout = BufReader::new(
            child
                .stdout
                .take()
                .ok_or_else(|| ClientError::Spawn("stdout 管道不可用".to_string()))?,
        );

        let mut client = Self {
            transport: McpTransport::Stdio {
                _child: child,
                stdin,
                stdout,
            },
            next_id: AtomicU64::new(1),
        };
        client.initialize().await?;
        Ok(client)
    }

    /// 连接远端 MCP server（HTTP Streamable 传输，Phase 3 B 档），完成 initialize 握手。
    ///
    /// `url` 为 MCP 端点完整地址（如 `http://127.0.0.1:8082/mcp`）；`token` 为
    /// server 白名单 token（可选，为空则不携带 Authorization 头）。
    pub async fn connect_http(url: &str, token: Option<&str>) -> Result<Self, ClientError> {
        let mut client = Self {
            transport: McpTransport::Http {
                http: reqwest::Client::new(),
                url: url.to_string(),
                token: token.map(String::from),
            },
            next_id: AtomicU64::new(1),
        };
        client.initialize().await?;
        Ok(client)
    }

    /// MCP 握手：initialize + notifications/initialized。
    async fn initialize(&mut self) -> Result<(), ClientError> {
        let result = self
            .request(
                "initialize",
                Some(json!({
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": { "name": "topems-dsh", "version": "1.0" }
                })),
            )
            .await?;
        let got = result
            .get("protocolVersion")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ClientError::Handshake("响应缺少 protocolVersion".to_string()))?;
        if got != PROTOCOL_VERSION {
            return Err(ClientError::Handshake(format!(
                "协议版本不匹配: server={got}, client={PROTOCOL_VERSION}"
            )));
        }
        // notifications/initialized：通知无响应，直接发送不等待
        let req = JsonRpcRequest::notification("notifications/initialized", None);
        self.send_notification(&req).await
    }

    /// 发送通知（stdio 写行不等待；HTTP POST 单发忽略响应体）
    async fn send_notification(&mut self, req: &JsonRpcRequest) -> Result<(), ClientError> {
        match &mut self.transport {
            McpTransport::Stdio { stdin, .. } => {
                let line = serde_json::to_string(req)
                    .map_err(|e| ClientError::Parse(format!("序列化通知失败: {e}")))?;
                stdin
                    .write_all(line.as_bytes())
                    .await
                    .map_err(|e| ClientError::Io(e.to_string()))?;
                stdin
                    .write_all(b"\n")
                    .await
                    .map_err(|e| ClientError::Io(e.to_string()))?;
                stdin
                    .flush()
                    .await
                    .map_err(|e| ClientError::Io(e.to_string()))?;
                Ok(())
            }
            McpTransport::Http { http, url, token } => {
                let mut req_builder = http
                    .post(url.as_str())
                    .header("Content-Type", "application/json");
                if let Some(t) = token {
                    req_builder = req_builder.header("Authorization", format!("Bearer {t}"));
                }
                let body = serde_json::to_string(req)
                    .map_err(|e| ClientError::Parse(format!("序列化通知失败: {e}")))?;
                let _ = req_builder
                    .body(body)
                    .send()
                    .await
                    .map_err(|e| ClientError::Http(format!("POST {url}: {e}")))?;
                Ok(())
            }
        }
    }

    /// 获取外部 server 的工具清单（`tools/list`）。
    pub async fn list_tools(&mut self) -> Result<Vec<McpTool>, ClientError> {
        let result = self.request("tools/list", None).await?;
        let tools = result
            .get("tools")
            .and_then(|v| v.as_array())
            .ok_or_else(|| ClientError::Handshake("tools/list 响应缺少 tools 数组".to_string()))?;
        tools
            .iter()
            .map(|t| {
                serde_json::from_value::<McpTool>(t.clone())
                    .map_err(|e| ClientError::Parse(format!("工具定义无法解析: {e}")))
            })
            .collect()
    }

    /// 调用外部工具（`tools/call`）。
    pub async fn call_tool(
        &mut self,
        name: &str,
        args: Value,
    ) -> Result<McpToolResult, ClientError> {
        let result = self
            .request(
                "tools/call",
                Some(json!({ "name": name, "arguments": args })),
            )
            .await?;
        serde_json::from_value::<McpToolResult>(result)
            .map_err(|e| ClientError::Parse(format!("tools/call 结果无法解析: {e}")))
    }

    /// 发送单个 JSON-RPC 请求并等待同 id 响应（单请求-响应模型）。
    async fn request(&mut self, method: &str, params: Option<Value>) -> Result<Value, ClientError> {
        let id = json!(self.next_id.fetch_add(1, Ordering::SeqCst));
        let req = JsonRpcRequest::new(method, id.clone(), params);
        match &mut self.transport {
            McpTransport::Stdio {
                stdin,
                stdout,
                _child,
            } => {
                let line = serde_json::to_string(&req)
                    .map_err(|e| ClientError::Parse(format!("序列化请求失败: {e}")))?;
                stdin
                    .write_all(line.as_bytes())
                    .await
                    .map_err(|e| ClientError::Io(e.to_string()))?;
                stdin
                    .write_all(b"\n")
                    .await
                    .map_err(|e| ClientError::Io(e.to_string()))?;
                stdin
                    .flush()
                    .await
                    .map_err(|e| ClientError::Io(e.to_string()))?;

                loop {
                    let mut buf = String::new();
                    let n = stdout
                        .read_line(&mut buf)
                        .await
                        .map_err(|e| ClientError::Io(e.to_string()))?;
                    if n == 0 {
                        return Err(ClientError::Eof(_child.id()));
                    }
                    let trimmed = buf.trim_end();
                    if trimmed.is_empty() {
                        continue;
                    }
                    let resp: JsonRpcResponse = serde_json::from_str(trimmed)
                        .map_err(|e| ClientError::Parse(format!("{trimmed}: {e}")))?;
                    if resp.id != id {
                        // 忽略非本请求 id 的响应（过期响应/杂散行）
                        continue;
                    }
                    return Self::finish_response(resp);
                }
            }
            McpTransport::Http { http, url, token } => {
                let mut req_builder = http
                    .post(url.as_str())
                    .header("Content-Type", "application/json");
                if let Some(t) = token {
                    req_builder = req_builder.header("Authorization", format!("Bearer {t}"));
                }
                let body = serde_json::to_string(&req)
                    .map_err(|e| ClientError::Parse(format!("序列化请求失败: {e}")))?;
                let resp = req_builder
                    .body(body)
                    .send()
                    .await
                    .map_err(|e| ClientError::Http(format!("POST {url}: {e}")))?;
                let status = resp.status();
                let text = resp
                    .text()
                    .await
                    .map_err(|e| ClientError::Http(format!("读取响应体失败: {e}")))?;
                let parsed: JsonRpcResponse = serde_json::from_str(&text)
                    .map_err(|e| ClientError::Parse(format!("{text}: {e}")))?;
                if !status.is_success() {
                    // 非 2xx：若 body 含 JSON-RPC error（如认证 -32001）则透传，否则按状态码报错
                    if let Some(err) = &parsed.error {
                        return Err(ClientError::Remote {
                            code: err.code,
                            message: err.message.clone(),
                        });
                    }
                    return Err(ClientError::Http(format!("HTTP {status}: {text}")));
                }
                if parsed.id != id {
                    return Err(ClientError::Handshake(format!(
                        "响应 id 不匹配: got={:?}, want={id}",
                        parsed.id
                    )));
                }
                Self::finish_response(parsed)
            }
        }
    }

    fn finish_response(resp: JsonRpcResponse) -> Result<Value, ClientError> {
        if let Some(err) = resp.error {
            return Err(ClientError::Remote {
                code: err.code,
                message: err.message,
            });
        }
        Ok(resp.result.unwrap_or(Value::Null))
    }
}

/// 将远端工具执行结果归一化为统一的 `McpContent` 文本形式。
///
/// 外部 server 的 `tools/call` 返回内容类型与内部工具一致（McpContent），
/// 直接透传；若内容为空（兼容非标准实现），包装为纯文本空结果。
pub fn normalize_result(result: McpToolResult) -> McpToolResult {
    if result.content.is_empty() {
        return McpToolResult {
            content: vec![McpContent::Text {
                text: serde_json::json!({"result": null}).to_string(),
            }],
            is_error: result.is_error,
        };
    }
    result
}

/// 构建 JSON-RPC 错误响应（供 mock/测试辅助复用）。
#[allow(dead_code)]
pub(crate) fn error_response(code: i32, message: &str) -> JsonRpcResponse {
    JsonRpcResponse::error(
        Value::Null,
        JsonRpcError {
            code,
            message: message.to_string(),
            data: None,
        },
    )
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use axum::routing::post;
    use axum::Router;

    /// client 错误可映射为 ToolExecutionError（外部工具注册链统一错误面）
    #[test]
    fn client_error_maps_to_tool_error() {
        let err = ClientError::Spawn("python3: not found".to_string());
        let tool_err: ToolExecutionError = err.into();
        assert!(tool_err.to_string().contains("外部 MCP"));
    }

    /// 空结果归一化为纯文本占位（兼容非标准外部实现）
    #[test]
    fn normalize_empty_result() {
        let result = McpToolResult {
            content: vec![],
            is_error: None,
        };
        let normalized = normalize_result(result);
        assert_eq!(normalized.content.len(), 1);
        match &normalized.content[0] {
            McpContent::Text { text } => assert!(text.contains("null")),
            _ => panic!("应为文本内容"),
        }
    }

    // ==================== HTTP 传输（Phase 3 B 档第 2 步） ====================

    /// 模拟 search /mcp 端点的 Streamable HTTP server（认证 + initialize + tools/list + tools/call）
    async fn start_mock_http_server(expected_token: &'static str) -> String {
        let app = Router::new()
            .route("/mcp", post(mock_mcp_handler))
            .with_state(expected_token);
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind 测试端口");
        let addr = listener.local_addr().expect("取测试地址");
        tokio::spawn(async move {
            axum::serve(listener, app.into_make_service())
                .await
                .expect("mock MCP server 退出");
        });
        format!("http://{addr}/mcp")
    }

    async fn mock_mcp_handler(
        axum::extract::State(expected): axum::extract::State<&'static str>,
        headers: axum::http::HeaderMap,
        axum::Json(req): axum::Json<Value>,
    ) -> (axum::http::StatusCode, axum::Json<Value>) {
        use axum::http::StatusCode;
        let ok = headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .map(|v| v == format!("Bearer {expected}"))
            .unwrap_or(false);
        if !ok {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(json!({
                    "jsonrpc": "2.0", "id": req.get("id").cloned().unwrap_or(Value::Null),
                    "error": { "code": -32001, "message": "Unauthorized: invalid or missing MCP token" }
                })),
            );
        }
        let rq: topems_shared_mcp::jsonrpc::JsonRpcRequest =
            serde_json::from_value(req).expect("mock 收到合法请求");
        let id = rq.id.clone().unwrap_or(Value::Null);
        let resp = match rq.method.as_str() {
            "initialize" => json!({
                "jsonrpc": "2.0", "id": id,
                "result": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": { "tools": { "listChanged": false } },
                    "serverInfo": { "name": "mock-search", "version": "1.0" }
                }
            }),
            "tools/list" => json!({
                "jsonrpc": "2.0", "id": id,
                "result": { "tools": [
                    { "name": "search.global", "description": "全局检索", "inputSchema": { "type": "object" } }
                ] }
            }),
            "tools/call" => json!({
                "jsonrpc": "2.0", "id": id,
                "result": {
                    "content": [ { "type": "text", "text": json!({ "items": [], "total": 0 }).to_string() } ],
                    "isError": false
                }
            }),
            "notifications/initialized" => json!({ "jsonrpc": "2.0", "id": id, "result": {} }),
            m => json!({
                "jsonrpc": "2.0", "id": id,
                "error": { "code": -32601, "message": format!("Method not found: {m}") }
            }),
        };
        (StatusCode::OK, axum::Json(resp))
    }

    #[tokio::test]
    async fn connect_http_full_handshake_list_and_call() {
        let url = start_mock_http_server("s3cret").await;
        let mut client = McpClient::connect_http(&url, Some("s3cret"))
            .await
            .expect("连接");
        let tools = client.list_tools().await.expect("list");
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].name, "search.global");
        let result = client
            .call_tool("search.global", json!({ "query": "x" }))
            .await
            .expect("call");
        assert!(!result.is_error.unwrap_or(false));
    }

    #[tokio::test]
    async fn connect_http_rejects_wrong_token() {
        let url = start_mock_http_server("s3cret").await;
        let err = match McpClient::connect_http(&url, Some("wrong")).await {
            Err(e) => e,
            Ok(_) => panic!("应拒绝错误 token"),
        };
        match err {
            ClientError::Remote { code, .. } => assert_eq!(code, -32001),
            other => panic!("应为 Remote 错误: {other:?}"),
        }
    }

    #[tokio::test]
    async fn connect_http_rejects_missing_token() {
        let url = start_mock_http_server("s3cret").await;
        let err = match McpClient::connect_http(&url, None).await {
            Err(e) => e,
            Ok(_) => panic!("应拒绝缺 token"),
        };
        assert!(matches!(err, ClientError::Remote { code: -32001, .. }));
    }

    #[tokio::test]
    async fn connect_http_rejects_protocol_mismatch() {
        // server 声明旧协议版本 → 握手失败（协议不匹配路径）
        let app = Router::new().route(
            "/mcp",
            post(|axum::Json(req): axum::Json<Value>| async move {
                let id = req.get("id").cloned().unwrap_or(Value::Null);
                axum::Json(json!({
                    "jsonrpc": "2.0", "id": id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "serverInfo": { "name": "legacy", "version": "0.1" }
                    }
                }))
            }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind");
        let addr = listener.local_addr().expect("addr");
        tokio::spawn(async move {
            axum::serve(listener, app.into_make_service())
                .await
                .expect("serve");
        });
        let err = match McpClient::connect_http(&format!("http://{addr}/mcp"), None).await {
            Err(e) => e,
            Ok(_) => panic!("协议不匹配应失败"),
        };
        assert!(matches!(err, ClientError::Handshake(_)), "{err:?}");
    }

    #[tokio::test]
    async fn connect_http_connection_refused_is_http_error() {
        // 无 server 监听（随机端口立即释放）→ Http 错误
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind");
        let addr = listener.local_addr().expect("addr");
        drop(listener); // 释放端口，确保连接被拒
        let err = match McpClient::connect_http(&format!("http://{addr}/mcp"), None).await {
            Err(e) => e,
            Ok(_) => panic!("连接拒绝应失败"),
        };
        assert!(matches!(err, ClientError::Http(_)), "{err:?}");
    }
}
