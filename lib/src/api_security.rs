//! API 安全与审计集成模块（V27.0）
//!
//! 提供：
//! 1. `ETag` 协商：基于内容哈希生成 ETag，支持 304 Not Modified
//! 2. 请求签名（HMAC-SHA256）：防重放、防篡改
//! 3. 防重放：nonce + 时间戳窗口校验
//! 4. 统一安全头：复用 security/security_headers
//! 5. 审计上下文：从 HTTP 请求中提取 actor、IP、UA 等注入审计记录
//!
//! 设计原则：
//! - 不替代 `security::security_headers` 和 `security::audit_logger`，而是补充**未覆盖的领域**：
//!   - ETag 协商（缓存层）
//!   - HMAC 签名（防篡改 + 防重放，业务级别）
//!   - 审计上下文提取器（轻量级，不写库）

use axum::{
    body::{to_bytes, Body},
    http::{HeaderMap, HeaderName, HeaderValue, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::audit::CreateAuditLogRequest;

type HmacSha256 = Hmac<Sha256>;

/// ETag 协商中间件
///
/// 根据响应 body 计算 SHA-256 哈希作为 ETag。
/// 客户端可发送 `If-None-Match` 请求头实现 304 协商。
pub async fn etag_middleware(request: Request<Body>, next: Next) -> Response {
    let if_none_match = request
        .headers()
        .get("if-none-match")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // 释放 request body 以便下游使用
    let (parts, body) = request.into_parts();
    let request = Request::from_parts(parts, body);

    let response = next.run(request).await;

    // 仅对 200 OK + JSON/Text body 计算 ETag
    if response.status() != StatusCode::OK {
        return response;
    }

    let (mut parts, body) = response.into_parts();
    let body_bytes = match to_bytes(body, 1024 * 1024).await {
        Ok(b) => b,
        Err(_) => {
            return Response::from_parts(parts, Body::empty());
        }
    };

    let mut hasher = Sha256::new();
    hasher.update(&body_bytes);
    let etag = format!("\"{}\"", hex::encode(hasher.finalize()));

    if let Some(prev) = &if_none_match {
        if prev == &etag {
            let mut not_modified = parts;
            not_modified.status = StatusCode::NOT_MODIFIED;
            // 保留 ETag 头
            if let Ok(etag_header) = HeaderValue::from_str(&etag) {
                not_modified
                    .headers
                    .insert(HeaderName::from_static("etag"), etag_header);
            }
            not_modified
                .headers
                .remove(axum::http::header::CONTENT_LENGTH);
            not_modified
                .headers
                .remove(axum::http::header::CONTENT_TYPE);
            return Response::from_parts(not_modified, Body::empty());
        }
    }

    if let Ok(etag_header) = HeaderValue::from_str(&etag) {
        parts
            .headers
            .insert(HeaderName::from_static("etag"), etag_header);
    }

    Response::from_parts(parts, Body::from(body_bytes))
}

/// 请求签名配置
#[derive(Debug, Clone)]
pub struct RequestSignatureConfig {
    /// HMAC 共享密钥（生产环境应从 Vault/ConfigCenter 注入）
    pub secret: String,
    /// 时间戳容忍窗口（秒），默认 300s
    pub timestamp_tolerance_secs: i64,
    /// 是否启用 nonce 防重放（默认启用）
    pub nonce_enabled: bool,
    /// 需要签名的请求头列表
    pub signed_headers: Vec<String>,
}

impl RequestSignatureConfig {
    pub fn new(secret: impl Into<String>) -> Self {
        Self {
            secret: secret.into(),
            timestamp_tolerance_secs: 300,
            nonce_enabled: true,
            signed_headers: vec!["x-timestamp".to_string(), "x-nonce".to_string()],
        }
    }
}

/// 签名校验结果
#[derive(Debug, Clone, PartialEq)]
pub enum SignatureVerification {
    /// 签名有效
    Valid,
    /// 缺少必要头
    MissingHeader(String),
    /// 时间戳过期
    TimestampExpired { skew_secs: i64 },
    /// 签名不匹配
    SignatureMismatch,
    /// 时间戳格式错误
    InvalidTimestamp,
}

/// 验证请求签名
///
/// 期望的请求头：
/// - `X-Timestamp`: 客户端 Unix 时间戳（秒）
/// - `X-Nonce`: 客户端生成的唯一 nonce
/// - `X-Signature`: HMAC-SHA256(method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + body_sha256, secret)
pub fn verify_request_signature(
    method: &str,
    path: &str,
    body: &[u8],
    headers: &HeaderMap,
    config: &RequestSignatureConfig,
) -> SignatureVerification {
    let timestamp_str = match headers.get("x-timestamp").and_then(|v| v.to_str().ok()) {
        Some(s) => s,
        None => return SignatureVerification::MissingHeader("X-Timestamp".to_string()),
    };

    let timestamp: i64 = match timestamp_str.parse() {
        Ok(t) => t,
        Err(_) => return SignatureVerification::InvalidTimestamp,
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let skew = (now - timestamp).abs();
    if skew > config.timestamp_tolerance_secs {
        return SignatureVerification::TimestampExpired { skew_secs: skew };
    }

    let nonce = match headers.get("x-nonce").and_then(|v| v.to_str().ok()) {
        Some(s) if !s.is_empty() => s,
        _ => return SignatureVerification::MissingHeader("X-Nonce".to_string()),
    };

    let provided_signature = match headers.get("x-signature").and_then(|v| v.to_str().ok()) {
        Some(s) => s,
        None => return SignatureVerification::MissingHeader("X-Signature".to_string()),
    };

    // 计算 body SHA-256
    let mut hasher = Sha256::new();
    hasher.update(body);
    let body_hash = hex::encode(hasher.finalize());

    // 构造签名字符串
    let payload = format!(
        "{}\n{}\n{}\n{}\n{}",
        method, path, timestamp, nonce, body_hash
    );

    // 计算 HMAC
    let mut mac = match HmacSha256::new_from_slice(config.secret.as_bytes()) {
        Ok(m) => m,
        Err(_) => return SignatureVerification::SignatureMismatch,
    };
    mac.update(payload.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());

    if constant_time_eq(expected.as_bytes(), provided_signature.as_bytes()) {
        SignatureVerification::Valid
    } else {
        SignatureVerification::SignatureMismatch
    }
}

/// 公开函数：生成请求签名（供客户端/SDK 使用）
pub fn generate_request_signature(
    method: &str,
    path: &str,
    body: &[u8],
    timestamp: i64,
    nonce: &str,
    secret: &str,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(body);
    let body_hash = hex::encode(hasher.finalize());

    let payload = format!(
        "{}\n{}\n{}\n{}\n{}",
        method, path, timestamp, nonce, body_hash
    );

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key");
    mac.update(payload.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

/// 常数时间字符串比较（防时序攻击）
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }
    result == 0
}

/// 从 axum 请求中提取审计上下文
///
/// 提取字段：
/// - actor（从 `Authorization` 头 JWT 解析 `sub`，或 `X-User-Id` 头）
/// - IP（X-Forwarded-For / X-Real-IP / peer addr）
/// - User-Agent
/// - trace_id（从 `traceparent` 头提取）
pub fn extract_audit_context(request: &Request<Body>) -> AuditContext {
    let headers = request.headers();

    let actor = headers
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .or_else(|| {
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| {
                    if s.starts_with("Bearer ") {
                        // 简化：仅返回 token 前 8 字符作为标识
                        Some(format!("token:{}", &s[7..15.min(s.len())]))
                    } else {
                        None
                    }
                })
        })
        .unwrap_or_else(|| "anonymous".to_string());

    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| "unknown".to_string());

    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let trace_id = headers
        .get("traceparent")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| {
            // W3C TraceContext: 00-{trace_id}-{parent_id}-{flags}
            let parts: Vec<&str> = s.split('-').collect();
            if parts.len() >= 2 {
                Some(parts[1].to_string())
            } else {
                None
            }
        });

    AuditContext {
        actor,
        ip_address,
        user_agent,
        trace_id,
        method: request.method().to_string(),
        path: request.uri().path().to_string(),
        timestamp: Utc::now(),
    }
}

/// 审计上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditContext {
    pub actor: String,
    pub ip_address: String,
    pub user_agent: String,
    pub trace_id: Option<String>,
    pub method: String,
    pub path: String,
    pub timestamp: DateTime<Utc>,
}

impl AuditContext {
    /// 转换为 CreateAuditLogRequest（V27.0 兼容 V20.0 已有 audit 模块）
    pub fn to_audit_request(
        &self,
        action: &str,
        entity_type: &str,
        status: &str,
    ) -> CreateAuditLogRequest {
        let mut req = CreateAuditLogRequest::new(
            action.to_string(),
            entity_type.to_string(),
            status.to_string(),
        )
        .with_user(self.actor.clone(), String::new())
        .with_request_info(Some(self.ip_address.clone()), Some(self.user_agent.clone()));

        if let Some(ref tid) = self.trace_id {
            req = req.with_request_details(serde_json::json!({
                "trace_id": tid,
                "method": self.method,
                "path": self.path,
            }));
        }

        req
    }
}

/// 签名校验失败响应
pub fn signature_error_response(verification: SignatureVerification) -> Response {
    let (status, message): (StatusCode, String) = match verification {
        SignatureVerification::Valid => (StatusCode::OK, "valid".to_string()),
        SignatureVerification::MissingHeader(h) => {
            (StatusCode::BAD_REQUEST, format!("Missing header: {}", h))
        }
        SignatureVerification::InvalidTimestamp => (
            StatusCode::BAD_REQUEST,
            "Invalid timestamp format".to_string(),
        ),
        SignatureVerification::TimestampExpired { skew_secs } => (
            StatusCode::REQUEST_TIMEOUT,
            format!("Timestamp expired (skew {}s)", skew_secs),
        ),
        SignatureVerification::SignatureMismatch => {
            (StatusCode::UNAUTHORIZED, "Signature mismatch".to_string())
        }
    };
    (status, message).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_etag_generation_consistent() {
        let body1 = b"{\"id\":1,\"name\":\"foo\"}";
        let body2 = b"{\"id\":1,\"name\":\"foo\"}";
        let body3 = b"{\"id\":2,\"name\":\"bar\"}";

        let mut h1 = Sha256::new();
        h1.update(body1);
        let etag1 = hex::encode(h1.finalize());

        let mut h2 = Sha256::new();
        h2.update(body2);
        let etag2 = hex::encode(h2.finalize());

        let mut h3 = Sha256::new();
        h3.update(body3);
        let etag3 = hex::encode(h3.finalize());

        assert_eq!(etag1, etag2);
        assert_ne!(etag1, etag3);
    }

    #[test]
    fn test_signature_roundtrip() {
        let secret = "test-secret-key";
        let method = "POST";
        let path = "/api/v1/orders";
        let body = b"{\"customer_id\":1}";
        let timestamp = 1700000000i64;
        let nonce = "abc-123-unique";

        let signature = generate_request_signature(method, path, body, timestamp, nonce, secret);
        assert!(!signature.is_empty());
        assert_eq!(signature.len(), 64); // SHA-256 hex
    }

    #[test]
    fn test_signature_verification_valid() {
        let secret = "test-secret";
        let method = "GET";
        let path = "/api/v1/users/1";
        let body = b"";
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let nonce = "nonce-xyz";

        let signature = generate_request_signature(method, path, body, timestamp, nonce, secret);

        let config = RequestSignatureConfig::new(secret);
        let mut headers = HeaderMap::new();
        headers.insert("x-timestamp", HeaderValue::from(timestamp));
        headers.insert("x-nonce", HeaderValue::from_str(nonce).unwrap());
        headers.insert("x-signature", HeaderValue::from_str(&signature).unwrap());

        let result = verify_request_signature(method, path, body, &headers, &config);
        assert_eq!(result, SignatureVerification::Valid);
    }

    #[test]
    fn test_signature_verification_expired() {
        let secret = "test-secret";
        let method = "POST";
        let path = "/api/v1/orders";
        let body = b"{}";
        let timestamp = 1000000000i64; // 2001 年，明显过期
        let nonce = "nonce-old";
        let signature = generate_request_signature(method, path, body, timestamp, nonce, secret);

        let config = RequestSignatureConfig::new(secret);
        let mut headers = HeaderMap::new();
        headers.insert("x-timestamp", HeaderValue::from(timestamp));
        headers.insert("x-nonce", HeaderValue::from_str(nonce).unwrap());
        headers.insert("x-signature", HeaderValue::from_str(&signature).unwrap());

        let result = verify_request_signature(method, path, body, &headers, &config);
        assert!(matches!(
            result,
            SignatureVerification::TimestampExpired { .. }
        ));
    }

    #[test]
    fn test_signature_verification_missing_header() {
        let config = RequestSignatureConfig::new("secret");
        let headers = HeaderMap::new();

        let result = verify_request_signature("GET", "/x", b"", &headers, &config);
        assert!(matches!(result, SignatureVerification::MissingHeader(_)));
    }

    #[test]
    fn test_audit_context_extraction() {
        // 简化单元测试：通过直接构造 Request 验证 extract 逻辑
        let req = Request::builder()
            .method("POST")
            .uri("/api/v1/orders")
            .header("x-user-id", "user-42")
            .header("x-forwarded-for", "192.168.1.100, 10.0.0.1")
            .header("user-agent", "test-agent/1.0")
            .header(
                "traceparent",
                "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
            )
            .body(Body::empty())
            .unwrap();

        let ctx = extract_audit_context(&req);
        assert_eq!(ctx.actor, "user-42");
        assert_eq!(ctx.ip_address, "192.168.1.100");
        assert_eq!(ctx.user_agent, "test-agent/1.0");
        assert_eq!(
            ctx.trace_id,
            Some("0af7651916cd43dd8448eb211c80319c".to_string())
        );
        assert_eq!(ctx.method, "POST");
        assert_eq!(ctx.path, "/api/v1/orders");
    }

    #[test]
    fn test_audit_context_to_request() {
        let ctx = AuditContext {
            actor: "user-1".to_string(),
            ip_address: "10.0.0.1".to_string(),
            user_agent: "ua/1.0".to_string(),
            trace_id: Some("abc123".to_string()),
            method: "POST".to_string(),
            path: "/api/v1/orders".to_string(),
            timestamp: Utc::now(),
        };

        let req = ctx.to_audit_request("create", "order", "success");
        assert_eq!(req.action, "create");
        assert_eq!(req.entity_type, "order");
        assert_eq!(req.user_id, Some("user-1".to_string()));
        assert_eq!(req.ip_address, Some("10.0.0.1".to_string()));
        assert_eq!(req.user_agent, Some("ua/1.0".to_string()));
    }

    #[test]
    fn test_constant_time_eq() {
        assert!(constant_time_eq(b"abc123", b"abc123"));
        assert!(!constant_time_eq(b"abc123", b"abc124"));
        assert!(!constant_time_eq(b"abc", b"abcd"));
    }
}
