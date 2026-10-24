//! 外部 MCP Server 注册器——DSH 消费外部 MCP（Phase 1 POC）。
//!
//! 从配置（环境变量 `MCP_EXTERNAL_SERVERS`）读取白名单外部 server 列表，
//! 对每个 server：spawn stdio 子进程 → MCP 握手 → `tools/list` 探测工具 →
//! 以 `ext.<server>.<tool>` 命名空间包装挂入共享 [`ToolRegistry`]。
//! 之后 DSH AgentOrchestrator / 外部 AI IDE 通过统一工具面透明调用
//! （orchestrator.rs 直调 ToolRegistry，零改动受益）。
//!
//! ## 配置格式（JSON 数组）
//!
//! ```json
//! [
//!   { "name": "toy", "command": "python3",
//!     "args": ["scripts/tools/mcp_mock_external_server.py"] }
//! ]
//! ```
//!
//! 可选字段：`env`（键值对数组，注入子进程环境）。
//!
//! ## 安全模型（POC → Phase 2 治理化）
//!
//! - **白名单**：仅显式配置的 server 会被连接，无自动发现。
//! - **fail-open 配置面**：配置解析失败 / server 不可达仅记录 warn 并跳过，
//!   不阻断主服务启动（外部能力可用性不影响内部工具面）。
//! - **source=external 标记**：工具描述前缀 `[external-mcp]`；审计事件统一
//!   携带 `source = "external"`（Phase 2，见 [`super::governance`]）。
//! - **结果消毒**：外部工具输出就地治理（Phase 2）——大小上限（默认 64 KiB）
//!   截断、敏感字段递归脱敏（复用 security::SENSITIVE_FIELDS 单一清单）、
//!   JSON 深度限制；双入口（orchestrator 直调 / server 响应层）均生效。
//! - **审计与指标**：每次调用结构化日志 + 原子计数器（calls_total/calls_failed/
//!   redacted_fields_total/truncated_total，[`super::governance::metrics_snapshot`]）。
//! - **命名空间隔离**：`ext.<server>.<tool>`，避免与本地 66 工具命名冲突。

use std::sync::Arc;

use serde_json::Value;
use tokio::sync::Mutex;
use tracing::{info, warn};

use super::client::McpClient;
use super::governance::{
    audit_external_call, record_outbound_call, sanitize_external_input, sanitize_external_output,
    AuditEvent, SanitizeLimits,
};
use super::server::McpServer;
use super::tools::ToolExecutionError;

/// 传输类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
enum TransportKind {
    /// stdio 子进程（Phase 1；缺省）
    Stdio,
    /// HTTP Streamable（Phase 3 B 档）
    Http,
}

fn default_transport() -> TransportKind {
    TransportKind::Stdio
}

/// 外部 server 配置
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExternalServerConfig {
    /// server 名（工具命名空间前缀）
    name: String,
    /// 传输类型（缺省 stdio）
    #[serde(default = "default_transport")]
    transport: TransportKind,
    /// 启动命令（stdio 必需；http 忽略）
    #[serde(default)]
    command: Option<String>,
    /// 命令参数（stdio）
    #[serde(default)]
    args: Vec<String>,
    /// 注入子进程的环境变量（stdio；可选）
    #[serde(default)]
    env: Vec<EnvEntry>,
    /// HTTP 端点完整地址（http 必需，如 http://127.0.0.1:8082/mcp）
    #[serde(default)]
    url: Option<String>,
    /// HTTP Bearer token（http 可选）
    #[serde(default)]
    token: Option<String>,
}

/// 环境变量键值对
#[derive(Debug, Clone, serde::Deserialize)]
struct EnvEntry {
    key: String,
    value: String,
}

/// 解析 `MCP_EXTERNAL_SERVERS` 环境变量为 server 配置列表。
/// 空/缺失 → 空列表；解析失败 → warn 并返回空（fail-open，不阻断启动）。
fn parse_external_servers(raw: &str) -> Vec<ExternalServerConfig> {
    if raw.trim().is_empty() {
        return vec![];
    }
    match serde_json::from_str::<Vec<ExternalServerConfig>>(raw) {
        Ok(servers) => servers,
        Err(e) => {
            warn!(
                error = %e,
                "MCP_EXTERNAL_SERVERS 解析失败，外部 MCP server 不启用（fail-open）"
            );
            vec![]
        }
    }
}

/// 注册外部 MCP server 的全部工具到共享 ToolRegistry。
///
/// - 配置为空 → 直接返回（无外部能力）。
/// - 单个 server 连接/握手/探测失败 → warn 跳过该 server，不影响其余。
/// - 工具以 `ext.<server>.<tool>` 命名注册；调用经 `McpClient::call_tool` 转发
///   （`Arc<Mutex<Option<McpClient>>>` 串行化单管道，注册后 client 保留供调用）。
///
/// 返回成功注册的工具总数（便于日志与测试断言）。
pub async fn register_external_tools(server: &McpServer, raw_config: &str) -> usize {
    let servers = parse_external_servers(raw_config);
    let mut total = 0usize;
    for cfg in servers {
        let envs: Vec<(String, String)> = cfg
            .env
            .iter()
            .map(|e| (e.key.clone(), e.value.clone()))
            .collect();
        // 按传输类型连接：stdio spawn 子进程；http 走 Streamable HTTP（token 可选）
        let connected = match cfg.transport {
            TransportKind::Stdio => match cfg.command.as_deref().filter(|c| !c.is_empty()) {
                Some(cmd) => McpClient::connect_stdio(cmd, &cfg.args, &envs).await,
                None => {
                    warn!(server = %cfg.name, "stdio 传输缺少 command，跳过（fail-open）");
                    continue;
                }
            },
            TransportKind::Http => match cfg.url.as_deref().filter(|u| !u.is_empty()) {
                Some(url) => McpClient::connect_http(url, cfg.token.as_deref()).await,
                None => {
                    warn!(server = %cfg.name, "http 传输缺少 url，跳过（fail-open）");
                    continue;
                }
            },
        };
        match connected {
            Ok(client) => {
                let client_handle: Arc<Mutex<Option<McpClient>>> =
                    Arc::new(Mutex::new(Some(client)));
                let list_result = {
                    let mut guard = client_handle.lock().await;
                    match guard.as_mut() {
                        Some(c) => c.list_tools().await,
                        None => Err(super::client::ClientError::Spawn(
                            "外部 MCP client 初始化失败".to_string(),
                        )),
                    }
                };
                match list_result {
                    Ok(tools) => {
                        let mut registered = 0usize;
                        for tool in tools {
                            let full_name = format!("ext.{}.{}", cfg.name, tool.name);
                            // source=external 标记：描述前缀显式标注来源
                            let description = format!(
                                "[external-mcp] 外部 MCP 工具（server: {}）：{}",
                                cfg.name, tool.description
                            );
                            let input_schema = tool.input_schema;
                            let raw_tool_name = tool.name;
                            let handle = client_handle.clone();
                            let registry = server.tool_registry().clone();
                            let name_for_reg = full_name.clone();
                            let server_name = cfg.name.clone();
                            registry
                                .register_async(
                                    &name_for_reg,
                                    &description,
                                    input_schema,
                                    move |args| {
                                        let handle = handle.clone();
                                        let tool_name = raw_tool_name.clone();
                                        let server_name = server_name.clone();
                                        Box::pin(async move {
                                            let started = std::time::Instant::now();
                                            let mut guard = handle.lock().await;
                                            let client = guard.as_mut().ok_or_else(|| {
                                                ToolExecutionError::Execution(
                                                    "外部 MCP client 已失效".to_string(),
                                                )
                                            })?;
                                            // Phase 4：出站输入脱敏——调用参数剥离 SENSITIVE_FIELDS
                                            // 命中的键后整体发送（业务数据不出网），并记录审计指标
                                            let (clean_args, outbound) = sanitize_external_input(
                                                &args,
                                                SanitizeLimits::default().max_json_depth,
                                            );
                                            record_outbound_call(
                                                outbound.keys_total,
                                                outbound.redacted,
                                            );
                                            if outbound.redacted > 0 {
                                                warn!(
                                                    server = %server_name,
                                                    tool = %tool_name,
                                                    redacted = outbound.redacted,
                                                    keys = outbound.keys_total,
                                                    "外部 MCP 出站参数剥离敏感字段（不发送）"
                                                );
                                            }
                                            let call = client
                                                .call_tool(&tool_name, clean_args)
                                                .await
                                                .map_err(|e| {
                                                    ToolExecutionError::Execution(format!(
                                                        "外部 MCP 调用失败: {e}"
                                                    ))
                                                });
                                            let duration_ms =
                                                u64::try_from(started.elapsed().as_millis())
                                                    .unwrap_or(u64::MAX);
                                            match call {
                                                Ok(result) => {
                                                    // Phase 2：就地消毒（大小上限/敏感字段脱敏/深度限制）
                                                    let (clean, report) = sanitize_external_output(
                                                        super::client::normalize_result(result),
                                                        &SanitizeLimits::default(),
                                                    );
                                                    audit_external_call(&AuditEvent {
                                                        server: &server_name,
                                                        tool: &tool_name,
                                                        status: "ok",
                                                        duration_ms,
                                                        report,
                                                    });
                                                    Ok(clean)
                                                }
                                                Err(e) => {
                                                    audit_external_call(&AuditEvent {
                                                        server: &server_name,
                                                        tool: &tool_name,
                                                        status: "error",
                                                        duration_ms,
                                                        report: Default::default(),
                                                    });
                                                    Err(e)
                                                }
                                            }
                                        })
                                    },
                                )
                                .await;
                            registered += 1;
                        }
                        total += registered;
                        info!(
                            server = %cfg.name,
                            tools = registered,
                            "外部 MCP server 工具已注册（ext.{}.<tool>）",
                            cfg.name
                        );
                    }
                    Err(e) => {
                        warn!(
                            server = %cfg.name,
                            error = %e,
                            "外部 MCP server 工具探测失败，跳过"
                        );
                    }
                }
            }
            Err(e) => {
                warn!(server = %cfg.name, error = %e, "外部 MCP server 连接失败，跳过");
            }
        }
    }
    total
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn parse_empty_config() {
        assert!(parse_external_servers("").is_empty());
        assert!(parse_external_servers("  ").is_empty());
    }

    #[test]
    fn parse_invalid_config_warns_and_empty() {
        assert!(parse_external_servers("not-json").is_empty());
    }

    #[test]
    fn parse_valid_config() {
        let servers = parse_external_servers(
            r#"[{"name":"toy","command":"python3","args":["a.py"],"env":[{"key":"K","value":"V"}]}]"#,
        );
        assert_eq!(servers.len(), 1);
        assert_eq!(servers[0].name, "toy");
        assert_eq!(servers[0].transport, TransportKind::Stdio); // 缺省 stdio（向后兼容）
        assert_eq!(servers[0].command.as_deref(), Some("python3"));
        assert_eq!(servers[0].args, vec!["a.py"]);
        assert_eq!(servers[0].env.len(), 1);
        assert!(servers[0].url.is_none());
        assert!(servers[0].token.is_none());
    }

    #[test]
    fn parse_http_config() {
        let servers = parse_external_servers(
            r#"[{"name":"search","transport":"http","url":"http://127.0.0.1:8082/mcp","token":"s3cret"}]"#,
        );
        assert_eq!(servers.len(), 1);
        assert_eq!(servers[0].transport, TransportKind::Http);
        assert_eq!(servers[0].url.as_deref(), Some("http://127.0.0.1:8082/mcp"));
        assert_eq!(servers[0].token.as_deref(), Some("s3cret"));
        assert!(servers[0].command.is_none());
    }

    #[test]
    fn parse_mixed_transports() {
        let servers = parse_external_servers(
            r#"[{"name":"a","command":"x"},{"name":"b","transport":"http","url":"http://h/mcp"}]"#,
        );
        assert_eq!(servers.len(), 2);
        assert_eq!(servers[0].transport, TransportKind::Stdio);
        assert_eq!(servers[1].transport, TransportKind::Http);
    }

    #[test]
    fn parse_unknown_transport_fails_open() {
        // transport 值非法 → 整条配置解析失败 → fail-open 空列表（不阻断启动）
        assert!(parse_external_servers(r#"[{"name":"x","transport":"carrier"}]"#).is_empty());
    }
}
