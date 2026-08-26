//! JSON-RPC 2.0 协议实现。
//!
//! 提供 JSON-RPC 2.0 的请求、响应、错误类型，以及序列化/反序列化支持。
//! MCP 协议基于 JSON-RPC 2.0 进行通信。

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON-RPC 2.0 请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    /// JSON-RPC 版本，固定为 "2.0"
    pub jsonrpc: String,
    /// 请求 ID（字符串或数字）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<Value>,
    /// 方法名
    pub method: String,
    /// 请求参数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<Value>,
}

impl JsonRpcRequest {
    /// 创建新的 JSON-RPC 请求
    pub fn new(method: impl Into<String>, id: Value, params: Option<Value>) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id: Some(id),
            method: method.into(),
            params,
        }
    }

    /// 创建通知请求（无 ID）
    pub fn notification(method: impl Into<String>, params: Option<Value>) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id: None,
            method: method.into(),
            params,
        }
    }

    /// 判断是否为通知（无 ID）
    pub fn is_notification(&self) -> bool {
        self.id.is_none()
    }
}

/// JSON-RPC 2.0 响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    /// JSON-RPC 版本，固定为 "2.0"
    pub jsonrpc: String,
    /// 响应 ID（与请求 ID 对应）
    pub id: Value,
    /// 响应结果（成功时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    /// 响应错误（失败时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

impl JsonRpcResponse {
    /// 创建成功响应
    pub fn success(id: Value, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    /// 创建错误响应
    pub fn error(id: Value, error: JsonRpcError) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(error),
        }
    }

    /// 判断是否为成功响应
    pub fn is_success(&self) -> bool {
        self.error.is_none()
    }
}

/// JSON-RPC 2.0 错误对象
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    /// 错误码
    pub code: i32,
    /// 错误消息
    pub message: String,
    /// 错误数据（可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

impl JsonRpcError {
    /// 创建解析错误
    pub fn parse_error(data: Option<Value>) -> Self {
        Self {
            code: -32700,
            message: "Parse error".to_string(),
            data,
        }
    }

    /// 创建无效请求错误
    pub fn invalid_request(data: Option<Value>) -> Self {
        Self {
            code: -32600,
            message: "Invalid Request".to_string(),
            data,
        }
    }

    /// 创建方法未找到错误
    pub fn method_not_found(method: &str) -> Self {
        Self {
            code: -32601,
            message: format!("Method not found: {method}"),
            data: None,
        }
    }

    /// 创建无效参数错误
    pub fn invalid_params(data: Option<Value>) -> Self {
        Self {
            code: -32602,
            message: "Invalid params".to_string(),
            data,
        }
    }

    /// 创建内部错误
    pub fn internal_error(message: impl Into<String>, data: Option<Value>) -> Self {
        Self {
            code: -32603,
            message: message.into(),
            data,
        }
    }

    /// 创建应用级错误（自定义错误码，范围 -32000 到 -32099）
    pub fn app_error(code: i32, message: impl Into<String>, data: Option<Value>) -> Self {
        Self {
            code,
            message: message.into(),
            data,
        }
    }
}

impl std::fmt::Display for JsonRpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "JSON-RPC Error {}: {}", self.code, self.message)
    }
}

impl std::error::Error for JsonRpcError {}

/// JSON-RPC 消息（请求或响应，用于批量处理）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum JsonRpcMessage {
    /// 请求消息
    Request(JsonRpcRequest),
    /// 响应消息
    Response(JsonRpcResponse),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_serialization() {
        let req = JsonRpcRequest::new(
            "initialize",
            serde_json::json!(1),
            Some(serde_json::json!({"protocolVersion": "2025-03-26"})),
        );
        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("\"jsonrpc\":\"2.0\""));
        assert!(json.contains("\"method\":\"initialize\""));
    }

    #[test]
    fn test_response_success() {
        let resp = JsonRpcResponse::success(serde_json::json!(1), serde_json::json!({"ok": true}));
        assert!(resp.is_success());
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"ok\":true"));
    }

    #[test]
    fn test_response_error() {
        let resp =
            JsonRpcResponse::error(serde_json::json!(1), JsonRpcError::method_not_found("test"));
        assert!(!resp.is_success());
    }

    #[test]
    fn test_notification() {
        let req = JsonRpcRequest::notification("notifications/initialized", None);
        assert!(req.is_notification());
    }

    #[test]
    fn test_error_display() {
        let err = JsonRpcError::parse_error(None);
        assert_eq!(err.to_string(), "JSON-RPC Error -32700: Parse error");
    }
}
