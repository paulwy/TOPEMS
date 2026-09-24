//! MCP 业务工具模块。
//!
//! 包含 ToolRegistry（工具注册和执行）以及各业务模块的 MCP 工具注册函数。
//!
//! ## 已注册工具
//!
//! - 系统工具：system.ping, system.info（由 McpServer::register_system_tools 注册）
//! - CRM：crm.list_customers, crm.get_customer, crm.create_customer
//! - ERP：待实现（V336+）
//! - Finance：待实现（V337+）

use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use serde_json::Value;
use tokio::sync::RwLock;

use topems_shared_mcp::protocol::{McpTool, McpToolResult};

pub mod aps;
pub mod bi;
pub mod crm;
pub mod cs;
pub mod ehs;
pub mod erp;
pub mod finance;
pub mod hr;
pub mod iot;
pub mod lims;
pub mod mes;
pub mod oa;
pub mod pm;
pub mod qms;
pub mod scm;
pub mod wms;

pub use aps::register_aps_tools;
pub use bi::register_bi_tools;
pub use crm::register_crm_tools;
pub use cs::register_cs_tools;
pub use ehs::register_ehs_tools;
pub use erp::register_erp_tools;
pub use finance::register_finance_tools;
pub use hr::register_hr_tools;
pub use iot::register_iot_tools;
pub use lims::register_lims_tools;
pub use mes::register_mes_tools;
pub use oa::register_oa_tools;
pub use pm::register_pm_tools;
pub use qms::register_qms_tools;
pub use scm::register_scm_tools;
pub use wms::register_wms_tools;

/// 工具处理函数类型
/// 工具处理函数（同步）
///
/// 接收工具参数（JSON Value），返回工具执行结果。
pub type ToolHandler =
    Arc<dyn Fn(Value) -> Result<McpToolResult, ToolExecutionError> + Send + Sync + 'static>;

/// 工具处理函数（异步）——用于 TypedServiceClient 等 async 业务调用
pub type AsyncToolHandler = Arc<
    dyn Fn(Value) -> Pin<Box<dyn Future<Output = Result<McpToolResult, ToolExecutionError>> + Send>>
        + Send
        + Sync
        + 'static,
>;

/// 工具执行错误
#[derive(Debug, thiserror::Error)]
pub enum ToolExecutionError {
    /// 工具未找到
    #[error("Tool not found: {0}")]
    NotFound(String),
    /// 参数验证失败
    #[error("Parameter validation failed: {0}")]
    Validation(String),
    /// 执行失败
    #[error("Execution failed: {0}")]
    Execution(String),
    /// 权限不足
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

/// 已注册的工具定义
struct RegisteredTool {
    /// 工具元数据
    definition: McpTool,
    /// 工具处理函数（同步）
    handler: ToolHandler,
    /// 工具处理函数（异步，优先于同步 handler）
    async_handler: Option<AsyncToolHandler>,
    /// 所需权限（可选）
    required_permission: Option<String>,
}

/// MCP Tool Registry
///
/// 线程安全的工具注册表，支持动态注册和执行工具。
#[derive(Clone, Default)]
pub struct ToolRegistry {
    tools: Arc<RwLock<HashMap<String, RegisteredTool>>>,
}

impl ToolRegistry {
    /// 创建新的 ToolRegistry
    pub fn new() -> Self {
        Self {
            tools: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 注册工具
    pub async fn register<F>(&self, name: &str, description: &str, input_schema: Value, handler: F)
    where
        F: Fn(Value) -> Result<McpToolResult, ToolExecutionError> + Send + Sync + 'static,
    {
        let tool = RegisteredTool {
            definition: McpTool {
                name: name.to_string(),
                description: description.to_string(),
                input_schema,
            },
            handler: Arc::new(handler),
            async_handler: None,
            required_permission: None,
        };

        self.tools.write().await.insert(name.to_string(), tool);
    }

    /// 注册异步工具（handler 返回 Future，用于 TypedServiceClient 等 async 调用）
    pub async fn register_async<F, Fut>(
        &self,
        name: &str,
        description: &str,
        input_schema: Value,
        handler: F,
    ) where
        F: Fn(Value) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<McpToolResult, ToolExecutionError>> + Send + 'static,
    {
        let async_handler: AsyncToolHandler = Arc::new(move |args| Box::pin(handler(args)));
        // 同步 handler 占位（不会被调用，因为 async_handler 优先）
        let sync_handler: ToolHandler = Arc::new(|_| {
            Err(ToolExecutionError::Execution(
                "async tool called via sync path".to_string(),
            ))
        });
        let tool = RegisteredTool {
            definition: McpTool {
                name: name.to_string(),
                description: description.to_string(),
                input_schema,
            },
            handler: sync_handler,
            async_handler: Some(async_handler),
            required_permission: None,
        };

        self.tools.write().await.insert(name.to_string(), tool);
    }

    /// 注册带权限要求的异步工具
    pub async fn register_async_with_permission<F, Fut>(
        &self,
        name: &str,
        description: &str,
        input_schema: Value,
        required_permission: &str,
        handler: F,
    ) where
        F: Fn(Value) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<McpToolResult, ToolExecutionError>> + Send + 'static,
    {
        let async_handler: AsyncToolHandler = Arc::new(move |args| Box::pin(handler(args)));
        let sync_handler: ToolHandler = Arc::new(|_| {
            Err(ToolExecutionError::Execution(
                "async tool called via sync path".to_string(),
            ))
        });
        let tool = RegisteredTool {
            definition: McpTool {
                name: name.to_string(),
                description: description.to_string(),
                input_schema,
            },
            handler: sync_handler,
            async_handler: Some(async_handler),
            required_permission: Some(required_permission.to_string()),
        };

        self.tools.write().await.insert(name.to_string(), tool);
    }

    /// 注册带权限要求的工具
    pub async fn register_with_permission<F>(
        &self,
        name: &str,
        description: &str,
        input_schema: Value,
        required_permission: &str,
        handler: F,
    ) where
        F: Fn(Value) -> Result<McpToolResult, ToolExecutionError> + Send + Sync + 'static,
    {
        let tool = RegisteredTool {
            definition: McpTool {
                name: name.to_string(),
                description: description.to_string(),
                input_schema,
            },
            handler: Arc::new(handler),
            async_handler: None,
            required_permission: Some(required_permission.to_string()),
        };

        self.tools.write().await.insert(name.to_string(), tool);
    }

    /// 列出所有已注册的工具
    pub async fn list_tools(&self) -> Vec<McpTool> {
        self.tools
            .read()
            .await
            .values()
            .map(|t| t.definition.clone())
            .collect()
    }

    /// 检查工具是否存在
    pub async fn has_tool(&self, name: &str) -> bool {
        self.tools.read().await.contains_key(name)
    }

    /// 获取工具定义
    pub async fn get_tool(&self, name: &str) -> Option<McpTool> {
        self.tools
            .read()
            .await
            .get(name)
            .map(|t| t.definition.clone())
    }

    /// 获取工具所需权限（无权限要求返回 None）
    pub async fn required_permission(&self, name: &str) -> Option<String> {
        self.tools
            .read()
            .await
            .get(name)
            .and_then(|t| t.required_permission.clone())
    }

    /// 执行工具
    pub async fn call_tool(
        &self,
        name: &str,
        arguments: Value,
    ) -> Result<McpToolResult, ToolExecutionError> {
        let tools = self.tools.read().await;

        let tool = tools
            .get(name)
            .ok_or_else(|| ToolExecutionError::NotFound(name.to_string()))?;

        if let Some(async_handler) = &tool.async_handler {
            async_handler(arguments).await
        } else {
            (tool.handler)(arguments)
        }
    }

    /// 获取已注册工具数量
    pub async fn len(&self) -> usize {
        self.tools.read().await.len()
    }

    /// 检查是否为空
    pub async fn is_empty(&self) -> bool {
        self.tools.read().await.is_empty()
    }

    /// 注销工具
    pub async fn unregister(&self, name: &str) -> bool {
        self.tools.write().await.remove(name).is_some()
    }
}

// =====================================================================
// 通用同步 HTTP 工具（std TcpStream，可在同步 handler 内安全使用，无 tokio 依赖）
// 供各业务工具文件（crm/erp/finance/...）调用真实服务 HTTP API
// =====================================================================

/// URL 查询参数编码（非 ASCII / 特殊字符 → %XX）
pub fn url_encode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{:02X}", b));
        }
    }
    out
}

/// 服务基础地址：优先环境变量 <SVC>_SERVICE_URL，否则 http://localhost:<port>
pub fn service_base_url(env_var: &str, default_port: u16) -> String {
    std::env::var(env_var).unwrap_or_else(|_| format!("http://localhost:{}", default_port))
}

/// 纯同步 HTTP 请求（GET/POST），返回响应 JSON 的 data 字段；失败返回 None（调用方降级）
pub fn http_call(base: &str, method: &str, path: &str, body: Option<Value>) -> Option<Value> {
    use std::io::{Read, Write};
    use std::net::TcpStream;

    let base = base.trim_end_matches('/');
    let rest = base.strip_prefix("http://")?;
    let (host, port) = match rest.split_once(':') {
        Some((h, p)) => (h.to_string(), p.parse::<u16>().ok()?),
        None => (rest.to_string(), 80u16),
    };
    let path_full = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{}", path)
    };

    let mut conn = TcpStream::connect((host.as_str(), port)).ok()?;
    let _ = conn.set_read_timeout(Some(std::time::Duration::from_secs(5)));
    let _ = conn.set_write_timeout(Some(std::time::Duration::from_secs(5)));

    let (request, body_bytes) = if matches!(method, "POST" | "PUT" | "DELETE") {
        let b = body.unwrap_or(Value::Null).to_string();
        let req = format!(
            "{} {} HTTP/1.1\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            method, path_full, host, b.len()
        );
        (req, b)
    } else {
        let req = format!(
            "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n",
            path_full, host
        );
        (req, String::new())
    };
    conn.write_all(request.as_bytes()).ok()?;
    if !body_bytes.is_empty() {
        conn.write_all(body_bytes.as_bytes()).ok()?;
    }

    let mut response = String::new();
    conn.read_to_string(&mut response).ok()?;
    let (head, body) = response.split_once("\r\n\r\n")?;
    if !head.starts_with("HTTP/1.1 2") {
        return None;
    }
    let parsed: Value = serde_json::from_str(body).ok()?;
    parsed.get("data").cloned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_mcp::protocol::McpContent;
    use topems_shared_mcp::schema::SchemaBuilder;

    #[tokio::test]
    async fn test_register_and_list() {
        let registry = ToolRegistry::new();

        registry
            .register(
                "test.tool",
                "测试工具",
                SchemaBuilder::object().build(),
                |_| {
                    Ok(McpToolResult {
                        content: vec![McpContent::text("result")],
                        is_error: None,
                    })
                },
            )
            .await;

        let tools = registry.list_tools().await;
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].name, "test.tool");
    }

    #[tokio::test]
    async fn test_call_tool() {
        let registry = ToolRegistry::new();

        registry
            .register(
                "echo",
                "回显工具",
                SchemaBuilder::object()
                    .property("message", SchemaBuilder::string())
                    .build(),
                |params| {
                    let msg = params["message"].as_str().unwrap_or("");
                    Ok(McpToolResult {
                        content: vec![McpContent::text(msg.to_string())],
                        is_error: None,
                    })
                },
            )
            .await;

        let result = registry
            .call_tool("echo", serde_json::json!({"message": "hello"}))
            .await
            .unwrap();

        assert_eq!(result.content.len(), 1);
        if let McpContent::Text { text } = &result.content[0] {
            assert_eq!(text, "hello");
        } else {
            panic!("Expected text content");
        }
    }

    #[tokio::test]
    async fn test_call_nonexistent_tool() {
        let registry = ToolRegistry::new();
        let result = registry
            .call_tool("nonexistent", serde_json::json!({}))
            .await;

        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ToolExecutionError::NotFound(_)
        ));
    }

    #[tokio::test]
    async fn test_has_tool() {
        let registry = ToolRegistry::new();
        assert!(!registry.has_tool("test").await);

        registry
            .register("test", "test", SchemaBuilder::object().build(), |_| {
                Ok(McpToolResult {
                    content: vec![],
                    is_error: None,
                })
            })
            .await;

        assert!(registry.has_tool("test").await);
    }

    #[tokio::test]
    async fn test_unregister() {
        let registry = ToolRegistry::new();

        registry
            .register("test", "test", SchemaBuilder::object().build(), |_| {
                Ok(McpToolResult {
                    content: vec![],
                    is_error: None,
                })
            })
            .await;

        assert!(registry.has_tool("test").await);
        assert!(registry.unregister("test").await);
        assert!(!registry.has_tool("test").await);
    }

    #[tokio::test]
    async fn test_len_and_is_empty() {
        let registry = ToolRegistry::new();
        assert!(registry.is_empty().await);
        assert_eq!(registry.len().await, 0);

        registry
            .register("test", "test", SchemaBuilder::object().build(), |_| {
                Ok(McpToolResult {
                    content: vec![],
                    is_error: None,
                })
            })
            .await;

        assert!(!registry.is_empty().await);
        assert_eq!(registry.len().await, 1);
    }
}
