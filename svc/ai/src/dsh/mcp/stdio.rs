//! V530h: MCP stdio transport
//!
//! Enables local AI agents (e.g. Cursor Local, Claude Code) to talk to the
//! TOPEMS MCP server over stdin/stdout, one JSON-RPC message per line.

use std::io;

use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use super::server::McpServer;
use topems_shared_mcp::jsonrpc::{JsonRpcError, JsonRpcRequest, JsonRpcResponse};

/// Default maximum JSON-RPC line length (1 MiB).
const MAX_LINE_BYTES: usize = 1024 * 1024;

/// Build a JSON-RPC parse-error response with the given detail.
fn parse_error_response(detail: Value) -> JsonRpcResponse {
    JsonRpcResponse::error(Value::Null, JsonRpcError::parse_error(Some(detail)))
}

/// Run the stdio transport loop against the given reader/writer.
///
/// Reads one JSON-RPC message per line from `reader`, dispatches to the
/// server, and writes responses (one per line) to `writer`. Notifications
/// (requests without an id) produce no output.
pub async fn run_stdio<R, W>(
    server: &McpServer,
    reader: R,
    mut writer: W,
) -> Result<(), std::io::Error>
where
    R: tokio::io::AsyncRead + Unpin,
    W: tokio::io::AsyncWrite + Unpin,
{
    let mut lines = BufReader::new(reader).lines();
    while let Some(line) = lines.next_line().await? {
        if line.trim().is_empty() {
            continue;
        }
        if line.len() > MAX_LINE_BYTES {
            let err = parse_error_response(
                json!({"message": "message too large", "max": MAX_LINE_BYTES}),
            );
            write_line(&mut writer, &err).await?;
            continue;
        }

        let request: JsonRpcRequest = match serde_json::from_str(&line) {
            Ok(req) => req,
            Err(e) => {
                let err =
                    parse_error_response(json!({"message": format!("invalid JSON-RPC: {}", e)}));
                write_line(&mut writer, &err).await?;
                continue;
            }
        };

        if let Some(response) = server.handle_request(request).await {
            write_line(&mut writer, &response).await?;
        }
    }
    Ok(())
}

/// Serialize a response as a single line and flush.
async fn write_line<W: tokio::io::AsyncWrite + Unpin>(
    writer: &mut W,
    response: &JsonRpcResponse,
) -> Result<(), io::Error> {
    let payload = serde_json::to_string(response)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("serialize: {}", e)))?;
    writer.write_all(payload.as_bytes()).await?;
    writer.write_all(b"\n").await?;
    writer.flush().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dsh::mcp::server::McpServer;

    /// Drive a request/response exchange over in-memory pipes and return
    /// all output lines.
    async fn exchange(server: &McpServer, input: &str) -> Vec<serde_json::Value> {
        let (mut client_w, server_r) = tokio::io::duplex(8192);
        let (server_w, mut client_r) = tokio::io::duplex(8192);

        client_w.write_all(input.as_bytes()).await.unwrap();
        drop(client_w); // EOF on the server read side

        // Run the loop in-place (no spawn, so no 'static requirement).
        run_stdio(server, server_r, server_w).await.unwrap();

        // Read all output until EOF.
        let mut buf = String::new();
        let _ = tokio::io::AsyncReadExt::read_to_string(&mut client_r, &mut buf).await;
        buf.lines()
            .filter_map(|l| serde_json::from_str(l).ok())
            .collect()
    }

    #[tokio::test]
    async fn test_stdio_initialize_returns_result_fields() {
        let server = McpServer::new("test-mcp", "1.0.0");
        let input = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}"#;
        let outputs = exchange(&server, input).await;
        assert_eq!(outputs.len(), 1);
        let resp = &outputs[0];
        assert_eq!(resp["id"], 1);
        assert!(resp["result"]["protocolVersion"].is_string());
        assert!(resp["result"]["capabilities"]["tools"].is_object());
        assert_eq!(resp["result"]["serverInfo"]["name"], "test-mcp");
        assert_eq!(resp["result"]["serverInfo"]["version"], "1.0.0");
    }

    #[tokio::test]
    async fn test_stdio_full_session_roundtrip() {
        let server = McpServer::new("test-mcp", "1.0.0");
        let input = concat!(
            r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}"#,
            "\n",
            r#"{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}"#,
            "\n",
            r#"{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}"#,
            "\n",
            r#"{"jsonrpc":"2.0","id":3,"method":"ping","params":{}}"#,
            "\n"
        );
        let outputs = exchange(&server, input).await;
        // initialize response + tools/list + ping (notification produces no output)
        assert_eq!(outputs.len(), 3);
        // tools/list must succeed after initialized notification
        assert!(outputs[1]["result"]["tools"].is_array());
        // ping echoes empty object
        assert_eq!(outputs[2]["result"], serde_json::json!({}));
    }

    #[tokio::test]
    async fn test_stdio_notification_no_response() {
        let server = McpServer::new("test-mcp", "1.0.0");
        let input = r#"{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}"#;
        let outputs = exchange(&server, input).await;
        assert!(outputs.is_empty());
    }

    #[tokio::test]
    async fn test_stdio_invalid_json_returns_parse_error() {
        let server = McpServer::new("test-mcp", "1.0.0");
        let input = "{not-json}\n";
        let outputs = exchange(&server, input).await;
        assert_eq!(outputs.len(), 1);
        assert!(outputs[0]["error"]["code"].is_number());
    }

    #[tokio::test]
    async fn test_stdio_requires_initialize_first() {
        let server = McpServer::new("test-mcp", "1.0.0");
        let input = r#"{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}"#;
        let outputs = exchange(&server, input).await;
        assert_eq!(outputs.len(), 1);
        assert!(outputs[0]["error"].is_object());
        assert!(outputs[0]["result"].is_null());
    }
}
