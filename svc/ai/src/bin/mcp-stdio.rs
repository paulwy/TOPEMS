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

use topems_ai::dsh::mcp::security::AuthenticatedUser;
use topems_ai::dsh::mcp::stdio::run_stdio;
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

    // 4. 运行 stdio 传输循环（P2-1：与 stdio.rs 统一实现——MAX_LINE_BYTES=1MiB 行长度保护、
    //    NDJSON 逐行解析、通知无响应；身份为 MCP_STDIO_SUBJECT 注入值或匿名 None）
    tracing::info!("MCP stdio server ready, waiting for requests on stdin...");
    run_stdio(&server, stdio_user, tokio::io::stdin(), tokio::io::stdout()).await?;

    tracing::info!("TOPEMS MCP stdio server shutdown complete.");
    Ok(())
}
