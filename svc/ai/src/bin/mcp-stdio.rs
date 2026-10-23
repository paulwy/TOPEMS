//! MCP stdio 传输 — 独立二进制入口。
//!
//! 通过标准输入/输出（stdin/stdout）进行 JSON-RPC 通信，供本地 AI Agent
//! （如 Cursor Local、Claude Desktop 等）直接调用 TOPEMS MCP 工具。
//!
//! # 身份注入
//! - 可选环境变量 `MCP_STDIO_SUBJECT`：JSON `{ "user_id": "...", "tenant_id": "...", "roles": [...] }`，
//!   注入后以该业务身份执行全部工具调用（工具级权限检查据此生效）。
//! - 未注入 / 解析失败 → 匿名会话（fail-closed），业务工具返回 -32001 权限拒绝。
//!
//! # 通信协议
//! - 每行一个 JSON-RPC 请求（NDJSON 格式）
//! - 响应同样按行输出到 stdout
//! - 通知（无 id 字段）不需要响应
//! - EOF 表示客户端关闭连接，服务器退出

use std::io::{BufRead, Write};

use serde_json::Value;

use topems_shared_mcp::jsonrpc::JsonRpcRequest;

use topems_ai::dsh::mcp::security::AuthenticatedUser;
use topems_ai::dsh::mcp::{
    register_aps_tools, register_bi_tools, register_crm_tools, register_cs_tools,
    register_ehs_tools, register_erp_tools, register_finance_tools, register_hr_tools,
    register_iot_tools, register_lims_tools, register_mes_tools, register_oa_tools,
    register_pm_tools, register_qms_tools, register_scm_tools, register_wms_tools, McpServer,
};

/// `MCP_STDIO_SUBJECT` 环境变量格式：JSON 对象 `{ user_id, tenant_id, roles }`
#[derive(Debug, serde::Deserialize)]
struct StdioSubject {
    user_id: String,
    tenant_id: String,
    #[serde(default)]
    roles: Vec<String>,
}

/// MCP stdio 服务器主入口
#[tokio::main]
#[allow(clippy::expect_used)] // tokio::main 宏展开内含 runtime.build().expect()，启动失败即崩溃属预期
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

    // 1. 服务间认证密钥：fail-closed。JWT_SECRET 缺失时拒绝启动，
    //    不落入任何硬编码默认值（历史 "test-jwt-secret" 回退已在安全审计中移除）。
    let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| {
        "JWT_SECRET environment variable is required for TOPEMS MCP server (service-to-service auth)"
            .to_string()
    })?;

    // 2. 创建 McpServer 实例
    let server = McpServer::new("topems-mcp", env!("CARGO_PKG_VERSION"), jwt_secret.clone());
    tracing::info!(
        "MCP Server created: name={}, version={}",
        "topems-mcp",
        env!("CARGO_PKG_VERSION")
    );

    // 3. 注册系统工具和所有业务工具（同步等待注册完成）
    //    服务间认证：从 JWT_SECRET 读取签发密钥，ai-service 身份调用下游业务 API
    server.register_system_tools().await;
    register_crm_tools(&server, &jwt_secret).await;
    register_erp_tools(&server, &jwt_secret).await;
    register_finance_tools(&server, &jwt_secret).await;
    register_hr_tools(&server, &jwt_secret).await;
    register_mes_tools(&server, &jwt_secret).await;
    register_ehs_tools(&server, &jwt_secret).await;
    register_wms_tools(&server, &jwt_secret).await;
    register_qms_tools(&server, &jwt_secret).await;
    register_pm_tools(&server, &jwt_secret).await;
    register_lims_tools(&server, &jwt_secret).await;
    register_bi_tools(&server, &jwt_secret).await;
    register_aps_tools(&server, &jwt_secret).await;
    register_cs_tools(&server, &jwt_secret).await;
    register_scm_tools(&server, &jwt_secret).await;
    register_iot_tools(&server, &jwt_secret).await;
    register_oa_tools(&server, &jwt_secret).await;

    // 3. 注册业务资源（crm/erp/finance URI）
    server.register_resources().await;
    let resource_count = server.resource_registry().len().await;
    tracing::info!("Resources registered: {} resources total", resource_count);

    let tool_count = server.tool_registry().len().await;
    tracing::info!("All tools registered: {} tools total", tool_count);

    // 3.5 可选身份注入：MCP_STDIO_SUBJECT（JSON { user_id, tenant_id, roles }）
    //     注入 → 以该业务身份执行全部工具调用（权限检查按工具声明生效）；
    //     缺失/解析失败 → 匿名会话（fail-closed，业务工具返回 -32001）。
    let stdio_user: Option<AuthenticatedUser> = match std::env::var("MCP_STDIO_SUBJECT") {
        Ok(raw) if !raw.trim().is_empty() => match serde_json::from_str::<StdioSubject>(&raw) {
            Ok(subject) => {
                tracing::info!(
                    user_id = %subject.user_id,
                    tenant_id = %subject.tenant_id,
                    roles = ?subject.roles,
                    "MCP_STDIO_SUBJECT injected; business tools enabled for this identity"
                );
                Some(AuthenticatedUser::new(
                    subject.user_id,
                    subject.tenant_id,
                    subject.roles,
                ))
            }
            Err(e) => {
                tracing::error!(
                    "MCP_STDIO_SUBJECT parse failed; staying anonymous (fail-closed): {}",
                    e
                );
                None
            }
        },
        _ => None,
    };

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

        // stdio 通道身份：MCP_STDIO_SUBJECT 注入的身份（若有），否则匿名（None）——
        // 匿名会话业务工具由 check_tool_permission 拒绝（-32001，fail-closed）。
        let response = server.handle_request(request, stdio_user.clone()).await;

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
