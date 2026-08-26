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
use std::sync::Arc;

use serde_json::Value;
use tokio::sync::RwLock;

use topems_shared_mcp::protocol::{McpTool, McpToolResult};

pub mod crm;
pub mod ehs;
pub mod erp;
pub mod finance;
pub mod hr;
pub mod mes;

pub use crm::register_crm_tools;
pub use ehs::register_ehs_tools;
pub use erp::register_erp_tools;
pub use finance::register_finance_tools;
pub use hr::register_hr_tools;
pub use mes::register_mes_tools;

/// 工具处理函数类型
///
/// 接收工具参数（JSON Value），返回工具执行结果。
pub type ToolHandler =
    Arc<dyn Fn(Value) -> Result<McpToolResult, ToolExecutionError> + Send + Sync + 'static>;

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
    /// 工具处理函数
    handler: ToolHandler,
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
            required_permission: None,
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

        (tool.handler)(arguments)
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
