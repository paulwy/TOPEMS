//! MCP 协议常量与类型定义。
//!
//! 基于 Model Context Protocol 规范，定义协议版本、能力声明、
//! 工具/资源/提示模板等核心概念。

use serde::{Deserialize, Serialize};

/// MCP 协议版本
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum McpProtocolVersion {
    /// 2024-11-05 版本
    #[serde(rename = "2024-11-05")]
    V20241105,
    /// 2025-03-26 版本
    #[serde(rename = "2025-03-26")]
    V20250326,
}

impl Default for McpProtocolVersion {
    fn default() -> Self {
        Self::V20250326
    }
}

impl std::fmt::Display for McpProtocolVersion {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::V20241105 => write!(f, "2024-11-05"),
            Self::V20250326 => write!(f, "2025-03-26"),
        }
    }
}

/// MCP Server 能力声明
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpCapability {
    /// 工具能力
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<ToolsCapability>,
    /// 资源能力
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resources: Option<ResourcesCapability>,
    /// 提示模板能力
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompts: Option<PromptsCapability>,
    /// 采样能力（请求 LLM 生成文本）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sampling: Option<serde_json::Value>,
}

/// 工具能力配置
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolsCapability {
    /// 是否支持工具列表变更通知
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
}

/// 资源能力配置
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourcesCapability {
    /// 是否支持资源列表变更通知
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
    /// 是否支持资源订阅
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscribe: Option<bool>,
}

/// 提示模板能力配置
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptsCapability {
    /// 是否支持提示模板列表变更通知
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
}

/// MCP 工具定义
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpTool {
    /// 工具名称（唯一标识，格式：{service}.{action}）
    pub name: String,
    /// 工具描述（AI 可理解的中文描述）
    pub description: String,
    /// 输入参数的 JSON Schema
    pub input_schema: serde_json::Value,
}

/// MCP 资源定义
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpResource {
    /// 资源 URI（格式：{service}://{resource_type}/{id}）
    pub uri: String,
    /// 资源名称
    pub name: String,
    /// 资源描述
    pub description: String,
    /// MIME 类型
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

/// MCP 工具执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolResult {
    /// 结果内容
    pub content: Vec<McpContent>,
    /// 是否为错误结果
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_error: Option<bool>,
}

/// MCP 内容块
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum McpContent {
    /// 文本内容
    Text {
        /// 文本内容
        text: String,
    },
    /// 图片内容
    Image {
        /// 图片数据（base64）
        data: String,
        /// MIME 类型
        mime_type: String,
    },
    /// 资源内容
    Resource {
        /// 资源 URI
        uri: String,
        /// 资源文本内容
        #[serde(skip_serializing_if = "Option::is_none")]
        text: Option<String>,
    },
}

impl McpContent {
    /// 创建文本内容
    pub fn text(text: impl Into<String>) -> Self {
        Self::Text { text: text.into() }
    }
}

/// MCP 初始化请求参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeParams {
    /// 协议版本
    pub protocol_version: McpProtocolVersion,
    /// 客户端能力
    pub capabilities: serde_json::Value,
    /// 客户端信息
    pub client_info: McpClientInfo,
}

/// MCP 客户端信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpClientInfo {
    /// 客户端名称
    pub name: String,
    /// 客户端版本
    pub version: String,
}

/// MCP 初始化结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeResult {
    /// 协议版本
    pub protocol_version: McpProtocolVersion,
    /// 服务端能力
    pub capabilities: McpCapability,
    /// 服务端信息
    pub server_info: McpServerInfo,
    /// 指令（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
}

/// MCP 服务端信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerInfo {
    /// 服务端名称
    pub name: String,
    /// 服务端版本
    pub version: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protocol_version_serialization() {
        let v = McpProtocolVersion::V20250326;
        let json = serde_json::to_string(&v).unwrap();
        assert_eq!(json, "\"2025-03-26\"");
    }

    #[test]
    fn test_mcp_tool_serialization() {
        let tool = McpTool {
            name: "crm.list_customers".to_string(),
            description: "查询客户列表".to_string(),
            input_schema: serde_json::json!({"type": "object", "properties": {}}),
        };
        let json = serde_json::to_string(&tool).unwrap();
        assert!(json.contains("crm.list_customers"));
    }

    #[test]
    fn test_mcp_content_text() {
        let content = McpContent::text("hello");
        let json = serde_json::to_string(&content).unwrap();
        assert!(json.contains("hello"));
    }
}
