//! MCP 传输层抽象。
//!
//! 支持 stdio、SSE、HTTP 三种传输方式，提供统一的 Transport trait。

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::fmt;

use crate::jsonrpc::{JsonRpcRequest, JsonRpcResponse};

/// 传输类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum TransportType {
    /// 标准输入输出（本地 AI Agent，如 Cursor Local）
    Stdio,
    /// Server-Sent Events（远程 AI Agent，如 Cursor Remote）
    #[default]
    Sse,
    /// HTTP POST（自研 AI Agent 集成）
    Http,
}

impl fmt::Display for TransportType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Stdio => write!(f, "stdio"),
            Self::Sse => write!(f, "sse"),
            Self::Http => write!(f, "http"),
        }
    }
}

/// 传输错误
#[derive(Debug, thiserror::Error)]
pub enum TransportError {
    /// 连接错误
    #[error("Connection error: {0}")]
    Connection(String),
    /// 发送错误
    #[error("Send error: {0}")]
    Send(String),
    /// 接收错误
    #[error("Receive error: {0}")]
    Receive(String),
    /// 超时错误
    #[error("Timeout after {0}ms")]
    Timeout(u64),
    /// 序列化错误
    #[error("Serialization error: {0}")]
    Serialization(String),
    /// 协议错误
    #[error("Protocol error: {0}")]
    Protocol(String),
    /// 传输已关闭
    #[error("Transport closed")]
    Closed,
}

/// MCP 传输层 trait
///
/// 所有传输方式（stdio/SSE/HTTP）都实现此 trait，
/// 提供统一的发送请求和接收响应接口。
#[async_trait]
pub trait McpTransport: Send + Sync + 'static {
    /// 发送 JSON-RPC 请求并等待响应
    async fn send_request(
        &self,
        request: &JsonRpcRequest,
    ) -> Result<JsonRpcResponse, TransportError>;

    /// 发送通知（无响应）
    async fn send_notification(&self, notification: &JsonRpcRequest) -> Result<(), TransportError>;

    /// 接收来自客户端的请求（服务端模式）
    async fn receive_request(&self) -> Result<JsonRpcRequest, TransportError>;

    /// 发送响应（服务端模式）
    async fn send_response(&self, response: &JsonRpcResponse) -> Result<(), TransportError>;

    /// 获取传输类型
    fn transport_type(&self) -> TransportType;

    /// 关闭传输连接
    async fn close(&self) -> Result<(), TransportError>;

    /// 检查传输是否仍在运行
    fn is_alive(&self) -> bool;
}

/// 传输配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportConfig {
    /// 传输类型
    pub transport_type: TransportType,
    /// 监听端口（SSE/HTTP 模式）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,
    /// 监听地址
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host: Option<String>,
    /// 请求超时（毫秒）
    #[serde(default = "default_timeout")]
    pub timeout_ms: u64,
    /// 最大请求体大小（字节）
    #[serde(default = "default_max_body_size")]
    pub max_body_size: usize,
}

fn default_timeout() -> u64 {
    30000
}

fn default_max_body_size() -> usize {
    10 * 1024 * 1024 // 10MB
}

impl Default for TransportConfig {
    fn default() -> Self {
        Self {
            transport_type: TransportType::default(),
            port: Some(8081),
            host: Some("127.0.0.1".to_string()),
            timeout_ms: default_timeout(),
            max_body_size: default_max_body_size(),
        }
    }
}

impl TransportConfig {
    /// 从环境变量创建配置
    pub fn from_env() -> Self {
        let transport_type = std::env::var("MCP_TRANSPORT")
            .ok()
            .and_then(|v| match v.to_lowercase().as_str() {
                "stdio" => Some(TransportType::Stdio),
                "sse" => Some(TransportType::Sse),
                "http" => Some(TransportType::Http),
                _ => None,
            })
            .unwrap_or_default();

        let port = std::env::var("MCP_PORT").ok().and_then(|v| v.parse().ok());

        let host = std::env::var("MCP_HOST").ok();

        let timeout_ms = std::env::var("MCP_TIMEOUT_MS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or_else(default_timeout);

        Self {
            transport_type,
            port,
            host,
            timeout_ms,
            max_body_size: default_max_body_size(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transport_type_display() {
        assert_eq!(TransportType::Stdio.to_string(), "stdio");
        assert_eq!(TransportType::Sse.to_string(), "sse");
        assert_eq!(TransportType::Http.to_string(), "http");
    }

    #[test]
    fn test_transport_config_default() {
        let config = TransportConfig::default();
        assert_eq!(config.transport_type, TransportType::Sse);
        assert_eq!(config.port, Some(8081));
        assert_eq!(config.timeout_ms, 30000);
    }

    #[test]
    fn test_transport_error_display() {
        let err = TransportError::Timeout(5000);
        assert_eq!(err.to_string(), "Timeout after 5000ms");
    }
}
