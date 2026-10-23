//! MCP Client（stdio 传输）——DSH 消费外部 MCP server（Phase 1 POC）。
//!
//! 方向与 [`super::stdio::run_stdio`]（server 角色）相反：本模块作为 **client 角色**，
//! spawn 一个外部 MCP server 子进程，通过 stdin/stdout 逐行交换 JSON-RPC，
//! 完成标准握手（initialize → notifications/initialized）后提供
//! `tools/list` / `tools/call` 调用面。
//!
//! 传输当前仅支持 stdio（零新依赖，子进程沙箱天然隔离）；HTTP/SSE 传输
//! 与第三方开放属后续阶段（见 `docs/developer/backend/mcp-external-agent-integration.md`
//! 与 TODO.md「DSH 消费外部 MCP」登记）。

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

/// 基于子进程 stdio 的 MCP Client。
///
/// 同一时刻只处理一个请求-响应（stdio 单管道天然串行）；`call_tool` 等
/// 方法需要 `&mut self`，外部工具注册器通过 `Mutex<McpClient>` 串行化。
pub struct McpClient {
    _child: Child,
    stdin: BufWriter<ChildStdin>,
    stdout: BufReader<ChildStdout>,
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
            _child: child,
            stdin,
            stdout,
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
        let line = serde_json::to_string(&req)
            .map_err(|e| ClientError::Parse(format!("序列化通知失败: {e}")))?;
        self.stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;
        self.stdin
            .write_all(b"\n")
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;
        self.stdin
            .flush()
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;
        Ok(())
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
        let line = serde_json::to_string(&req)
            .map_err(|e| ClientError::Parse(format!("序列化请求失败: {e}")))?;
        self.stdin
            .write_all(line.as_bytes())
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;
        self.stdin
            .write_all(b"\n")
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;
        self.stdin
            .flush()
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;

        loop {
            let mut buf = String::new();
            let n = self
                .stdout
                .read_line(&mut buf)
                .await
                .map_err(|e| ClientError::Io(e.to_string()))?;
            if n == 0 {
                return Err(ClientError::Eof(self._child.id()));
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
            if let Some(err) = resp.error {
                return Err(ClientError::Remote {
                    code: err.code,
                    message: err.message,
                });
            }
            return Ok(resp.result.unwrap_or(Value::Null));
        }
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
}
