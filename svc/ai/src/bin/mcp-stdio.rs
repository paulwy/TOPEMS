//! MCP stdio 传输 — 独立二进制入口。
//!
//! 通过标准输入/输出（stdin/stdout）进行 JSON-RPC 通信，供本地 AI Agent
//! （如 Cursor Local、Claude Desktop 等）直接调用 TOPEMS MCP 工具。
//!
//! # 通信协议
//! - 每行一个 JSON-RPC 请求（NDJSON 格式）
//! - 响应同样按行输出到 stdout
//! - 通知（无 id 字段）不需要响应
//! - EOF 表示客户端关闭连接，服务器退出

use std::io::{BufRead, Write};

use serde_json::Value;

use topems_shared_mcp::jsonrpc::JsonRpcRequest;

use topems_ai::dsh::mcp::{
    register_aps_tools, register_bi_tools, register_crm_tools, register_cs_tools,
    register_ehs_tools, register_erp_tools, register_finance_tools, register_hr_tools,
    register_iot_tools, register_lims_tools, register_mes_tools, register_oa_tools,
    register_pm_tools, register_qms_tools, register_scm_tools, register_wms_tools, McpServer,
};

/// MCP stdio 服务器主入口
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日志（stderr，不干扰 stdout 的 JSON-RPC 通信）
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tracing::info!("TOPEMS MCP stdio server starting...");

    // 1. 创建 McpServer 实例
    let server = McpServer::new("topems-mcp", env!("CARGO_PKG_VERSION"));
    tracing::info!(
        "MCP Server created: name={}, version={}",
        "topems-mcp",
        env!("CARGO_PKG_VERSION")
    );

    // 2. 注册系统工具和所有业务工具（同步等待注册完成）
    server.register_system_tools().await;
    register_crm_tools(&server).await;
    register_erp_tools(&server).await;
    register_finance_tools(&server).await;
    register_hr_tools(&server).await;
    register_mes_tools(&server).await;
    register_ehs_tools(&server).await;
    register_wms_tools(&server).await;
    register_qms_tools(&server).await;
    register_pm_tools(&server).await;
    register_lims_tools(&server).await;
    register_bi_tools(&server).await;
    register_aps_tools(&server).await;
    register_cs_tools(&server).await;
    register_scm_tools(&server).await;
    register_iot_tools(&server).await;
    register_oa_tools(&server).await;

    // 3. 注册业务资源（crm/erp/finance URI）
    server.register_resources().await;
    let resource_count = server.resource_registry().len().await;
    tracing::info!("Resources registered: {} resources total", resource_count);

    let tool_count = server.tool_registry().len().await;
    tracing::info!("All tools registered: {} tools total", tool_count);

    // 3. 从 stdin 逐行读取 JSON-RPC 请求
    let stdin = std::io::stdin();
    let mut reader = std::io::BufReader::new(stdin.lock());
    let mut stdout = std::io::stdout();

    tracing::info!("MCP stdio server ready, waiting for requests on stdin...");

    let mut line = String::new();
    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line)?;

        // EOF — 客户端关闭连接
        if bytes_read == 0 {
            tracing::info!("EOF received, client disconnected. Shutting down.");
            break;
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        // 解析 JSON-RPC 请求
        let request: JsonRpcRequest = match serde_json::from_str(trimmed) {
            Ok(req) => req,
            Err(e) => {
                tracing::error!("Failed to parse JSON-RPC request: {}", e);
                let error_response = serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": null,
                    "error": {
                        "code": -32700,
                        "message": "Parse error",
                        "data": e.to_string()
                    }
                });
                writeln!(stdout, "{}", error_response)?;
                stdout.flush()?;
                continue;
            }
        };

        let method = request.method.clone();
        let is_notification = request.is_notification();
        tracing::debug!(
            "Received request: method={}, is_notification={}",
            method,
            is_notification
        );

        // 4. 调用 server.handle_request 处理
        let response = server.handle_request(request).await;

        // 5. 将响应序列化为 JSON 写入 stdout（通知不需要响应）
        if let Some(resp) = response {
            let resp_json: Value = serde_json::to_value(&resp)?;
            writeln!(stdout, "{}", resp_json)?;
            stdout.flush()?;
            tracing::debug!("Response sent for method={}", method);
        } else {
            tracing::debug!("Notification processed, no response: method={}", method);
        }
    }

    tracing::info!("TOPEMS MCP stdio server shutdown complete.");
    Ok(())
}
