//! Dify Service API 客户端封装
//!
//! 对应 Dify 官方 Service API：https://docs.dify.ai/guides/application-publishing/developing-with-apis
//! 所有方法基于 `DifyConfig`（base_url + api_key），通过 reqwest 调用 Dify Nginx 入口 `/v1/*`。
//! 鉴权方式：HTTP Header `Authorization: Bearer app-xxx`。
//!
//! 设计要点：
//! - 复用 svc/ai 既有 reqwest::Client，统一超时控制
//! - 错误以 `DifyError` 枚举形式返回，区分网络/状态/反序列化/业务错误
//! - blocking 调用返回 `DifyChatResponse`，streaming 通过 `chat_stream` 返回字节流供 handler 转发 SSE

use crate::models::{
    DifyChatRequest, DifyChatResponse, DifyConversationListResponse, DifyFeedbackRequest,
    DifyFeedbackResponse, DifyInfoResponse, DifyMessageHistoryResponse, DifyMetaResponse,
    DifyParametersResponse, DifyStopRequest, DifyStopResponse,
};
use axum::body::Body;
use reqwest::Client;
use std::sync::Arc;

/// Dify 调用错误
#[derive(Debug, thiserror::Error)]
pub enum DifyError {
    #[error("Dify 未配置：缺少 DIFY_API_KEY 或 DIFY_BASE_URL")]
    NotConfigured,
    #[error("Dify 网络调用失败：{0}")]
    Network(String),
    #[error("Dify 返回非 2xx 状态：{status} - {body}")]
    Status { status: u16, body: String },
    #[error("Dify 响应反序列化失败：{0}")]
    Deserialize(String),
    #[error("Dify 业务错误：{0}")]
    Business(String),
}

impl From<reqwest::Error> for DifyError {
    fn from(e: reqwest::Error) -> Self {
        DifyError::Network(e.to_string())
    }
}

/// Dify 服务客户端
#[derive(Clone)]
pub struct DifyService {
    client: Client,
    config: Arc<crate::models::DifyConfig>,
}

impl DifyService {
    pub fn new(client: Client, config: crate::models::DifyConfig) -> Self {
        Self {
            client,
            config: Arc::new(config),
        }
    }

    /// 是否已配置（API key 非空）
    pub fn is_configured(&self) -> bool {
        !self.config.api_key.is_empty() && !self.config.base_url.is_empty()
    }

    fn auth_header(&self) -> String {
        format!("Bearer {}", self.config.api_key)
    }

    fn endpoint(&self, path: &str) -> String {
        let base = self.config.base_url.trim_end_matches('/');
        format!("{}/{}", base, path.trim_start_matches('/'))
    }

    /// POST /v1/chat-messages（blocking 模式）
    ///
    /// 注意：调用方需将 `response_mode` 强制设为 "blocking"，
    /// 流式调用请使用 `chat_stream`。
    pub async fn chat(&self, mut req: DifyChatRequest) -> Result<DifyChatResponse, DifyError> {
        if !self.is_configured() {
            return Err(DifyError::NotConfigured);
        }
        req.response_mode = "blocking".to_string();
        if req.user.is_empty() {
            req.user = self.config.default_user.clone();
        }
        // Dify 强制要求 inputs 为对象；显式 null 时归一化为 {}
        if !req.inputs.is_object() {
            req.inputs = serde_json::json!({});
        }

        let url = self.endpoint("/v1/chat-messages");
        tracing::debug!("Dify chat blocking -> {}", url);

        let resp = self
            .client
            .post(&url)
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await
            .map_err(DifyError::from)?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(DifyError::Status {
                status: status.as_u16(),
                body,
            });
        }

        let body = resp
            .text()
            .await
            .map_err(|e| DifyError::Network(e.to_string()))?;
        // Dify 可能返回单条 JSON 对象（message_end），也可能是多行 JSON（blocking 通常返回单条 message_end）
        // 兼容两种：先尝试单对象反序列化
        match serde_json::from_str::<DifyChatResponse>(&body) {
            Ok(parsed) => Ok(parsed),
            Err(e) => {
                tracing::warn!(
                    "Dify chat 单对象反序列化失败：{}, 尝试从多行提取最终 message_end",
                    e
                );
                // 兜底：扫描多行 JSON，取最后一条 event=message_end 的 answer
                extract_final_message_end(&body).ok_or_else(|| {
                    DifyError::Deserialize(format!(
                        "无法解析 Dify 响应: {} | body: {}",
                        e,
                        truncate(&body, 500)
                    ))
                })
            }
        }
    }

    /// POST /v1/chat-messages（streaming 模式）
    ///
    /// 返回原始字节流，handler 直接以 SSE 转发给前端。前端需处理 `data: ` 前缀。
    pub async fn chat_stream(
        &self,
        mut req: DifyChatRequest,
    ) -> Result<axum::body::Body, DifyError> {
        if !self.is_configured() {
            return Err(DifyError::NotConfigured);
        }
        req.response_mode = "streaming".to_string();
        if req.user.is_empty() {
            req.user = self.config.default_user.clone();
        }
        // Dify 强制要求 inputs 为对象；显式 null 时归一化为 {}
        if !req.inputs.is_object() {
            req.inputs = serde_json::json!({});
        }

        let url = self.endpoint("/v1/chat-messages");
        let resp = self
            .client
            .post(&url)
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .json(&req)
            .send()
            .await
            .map_err(DifyError::from)?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(DifyError::Status {
                status: status.as_u16(),
                body,
            });
        }

        // 将 reqwest 的 stream 转换为 axum Body
        use futures::TryStreamExt;
        let stream = resp
            .bytes_stream()
            .map_err(|e| std::io::Error::other(format!("dify stream error: {}", e)));
        Ok(Body::from_stream(stream))
    }

    /// GET /v1/info
    pub async fn info(&self) -> Result<DifyInfoResponse, DifyError> {
        self.get_json("/v1/info").await
    }

    /// GET /v1/parameters?user=xxx
    pub async fn parameters(&self, user: &str) -> Result<DifyParametersResponse, DifyError> {
        let user = if user.is_empty() {
            self.config.default_user.as_str()
        } else {
            user
        };
        let url = format!("/v1/parameters?user={}", urlenc(user));
        self.get_json(&url).await
    }

    /// GET /v1/meta
    pub async fn meta(&self) -> Result<DifyMetaResponse, DifyError> {
        self.get_json("/v1/meta").await
    }

    /// GET /v1/conversations?user=xxx&limit=xxx
    pub async fn list_conversations(
        &self,
        user: &str,
        limit: Option<i32>,
    ) -> Result<DifyConversationListResponse, DifyError> {
        let user = if user.is_empty() {
            self.config.default_user.as_str()
        } else {
            user
        };
        let mut url = format!("/v1/conversations?user={}", urlenc(user));
        if let Some(l) = limit {
            url.push_str(&format!("&limit={}", l.max(1).min(100)));
        }
        self.get_json(&url).await
    }

    /// GET /v1/messages?user=xxx&conversation_id=xxx&limit=xxx
    pub async fn list_messages(
        &self,
        user: &str,
        conversation_id: &str,
        limit: Option<i32>,
    ) -> Result<DifyMessageHistoryResponse, DifyError> {
        let user = if user.is_empty() {
            self.config.default_user.as_str()
        } else {
            user
        };
        let mut url = format!(
            "/v1/messages?user={}&conversation_id={}",
            urlenc(user),
            urlenc(conversation_id)
        );
        if let Some(l) = limit {
            url.push_str(&format!("&limit={}", l.max(1).min(100)));
        }
        self.get_json(&url).await
    }

    /// DELETE /v1/conversations/{conversation_id}?user=xxx
    pub async fn delete_conversation(
        &self,
        conversation_id: &str,
        user: &str,
    ) -> Result<serde_json::Value, DifyError> {
        let user = if user.is_empty() {
            self.config.default_user.clone()
        } else {
            user.to_string()
        };
        let url = self.endpoint(&format!(
            "/v1/conversations/{}?user={}",
            urlenc(conversation_id),
            urlenc(&user)
        ));
        let resp = self
            .client
            .delete(&url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .map_err(DifyError::from)?;
        self.parse_json(resp).await
    }

    /// POST /v1/messages/{message_id}/feedbacks
    pub async fn feedback(
        &self,
        message_id: &str,
        req: DifyFeedbackRequest,
    ) -> Result<DifyFeedbackResponse, DifyError> {
        let url = self.endpoint(&format!("/v1/messages/{}/feedbacks", urlenc(message_id)));
        let resp = self
            .client
            .post(&url)
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await
            .map_err(DifyError::from)?;
        self.parse_json(resp).await
    }

    /// POST /v1/messages/{message_id}/stop
    pub async fn stop(
        &self,
        message_id: &str,
        req: DifyStopRequest,
    ) -> Result<DifyStopResponse, DifyError> {
        let url = self.endpoint(&format!("/v1/messages/{}/stop", urlenc(message_id)));
        let resp = self
            .client
            .post(&url)
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await
            .map_err(DifyError::from)?;
        self.parse_json(resp).await
    }

    /// 通用 GET + JSON 反序列化
    async fn get_json<T: serde::de::DeserializeOwned>(&self, path: &str) -> Result<T, DifyError> {
        if !self.is_configured() {
            return Err(DifyError::NotConfigured);
        }
        let url = self.endpoint(path);
        tracing::debug!("Dify GET {}", url);
        let resp = self
            .client
            .get(&url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .map_err(DifyError::from)?;
        self.parse_json(resp).await
    }

    async fn parse_json<T: serde::de::DeserializeOwned>(
        &self,
        resp: reqwest::Response,
    ) -> Result<T, DifyError> {
        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(DifyError::Status {
                status: status.as_u16(),
                body,
            });
        }
        let body = resp
            .text()
            .await
            .map_err(|e| DifyError::Network(e.to_string()))?;
        serde_json::from_str::<T>(&body)
            .map_err(|e| DifyError::Deserialize(format!("{} | body: {}", e, truncate(&body, 500))))
    }

    /// 健康探活：调用 GET /v1/info，成功返回即认为 Dify 可达
    pub async fn health(&self) -> Result<(), DifyError> {
        if !self.is_configured() {
            return Err(DifyError::NotConfigured);
        }
        let url = self.endpoint("/v1/info");
        let resp = self
            .client
            .get(&url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .map_err(DifyError::from)?;
        if resp.status().is_success() {
            Ok(())
        } else {
            Err(DifyError::Status {
                status: resp.status().as_u16(),
                body: String::new(),
            })
        }
    }
}

/// 简单 URL 编码（仅替换必要字符，避免引入额外 crate）
fn urlenc(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

/// 截断字符串
fn truncate(s: &str, n: usize) -> String {
    if s.len() > n {
        format!("{}...(truncated)", &s[..n])
    } else {
        s.to_string()
    }
}

/// 从多行 SSE/JSON 响应中提取最后一条 message_end 事件的 answer
///
/// Dify 在 blocking 模式下通常返回单个 message_end 事件 JSON，
/// 但某些版本可能合并 message + message_end。我们扫描所有以 `data:` 开头的行，
/// 或纯 JSON 行，找最后一条 event=message_end 的对象，返回其字段重建 DifyChatResponse。
fn extract_final_message_end(body: &str) -> Option<DifyChatResponse> {
    let mut last_end: Option<DifyChatResponse> = None;
    for line in body.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // 兼容 `data: {...}` 与纯 `{...}`
        let json_str = line
            .strip_prefix("data:")
            .or_else(|| line.strip_prefix("data: "))
            .unwrap_or(line)
            .trim();
        if !json_str.starts_with('{') {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
            let event = v.get("event").and_then(|e| e.as_str()).unwrap_or("");
            if event == "message_end" || event == "message" {
                if let Ok(parsed) = serde_json::from_value::<DifyChatResponse>(v.clone()) {
                    if event == "message_end" {
                        last_end = Some(parsed);
                    }
                }
            }
        }
    }
    last_end
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::DifyConfig;

    fn sample_config() -> DifyConfig {
        DifyConfig {
            base_url: "http://example.test".to_string(),
            api_key: "app-test".to_string(),
            default_user: "u1".to_string(),
            timeout_secs: 5,
        }
    }

    #[test]
    fn test_is_configured_when_api_key_present() {
        let svc = DifyService::new(Client::new(), sample_config());
        assert!(svc.is_configured());
    }

    #[test]
    fn test_not_configured_when_api_key_empty() {
        let mut cfg = sample_config();
        cfg.api_key = String::new();
        let svc = DifyService::new(Client::new(), cfg);
        assert!(!svc.is_configured());
    }

    #[test]
    fn test_endpoint_join() {
        let svc = DifyService::new(Client::new(), sample_config());
        assert_eq!(svc.endpoint("/v1/info"), "http://example.test/v1/info");
        assert_eq!(svc.endpoint("v1/info"), "http://example.test/v1/info");
        // 尾部斜杠
        let mut cfg = sample_config();
        cfg.base_url = "http://example.test/".to_string();
        let svc2 = DifyService::new(Client::new(), cfg);
        assert_eq!(svc2.endpoint("/v1/info"), "http://example.test/v1/info");
    }

    #[test]
    fn test_urlenc_special_chars() {
        assert_eq!(urlenc("abc123-_.~"), "abc123-_.~");
        assert_eq!(urlenc("a b/c"), "a%20b%2Fc");
        assert_eq!(urlenc("用户"), "%E7%94%A8%E6%88%B7");
    }

    #[test]
    fn test_truncate_short() {
        assert_eq!(truncate("hello", 100), "hello");
        assert!(truncate("hello world this is long", 5).contains("truncated"));
    }

    #[test]
    fn test_extract_final_message_end_single_object() {
        let body = r#"{"event":"message_end","message_id":"m1","conversation_id":"c1","answer":"hi","created_at":1700000000}"#;
        let r = extract_final_message_end(body).expect("应解析出 message_end");
        assert_eq!(r.event, "message_end");
        assert_eq!(r.answer, "hi");
        assert_eq!(r.conversation_id, "c1");
    }

    #[test]
    fn test_extract_final_message_end_multi_line_sse() {
        let body = "data: {\"event\":\"message\",\"answer\":\"part1\"}\n\ndata: {\"event\":\"message_end\",\"message_id\":\"m9\",\"conversation_id\":\"c9\",\"answer\":\"part1\",\"created_at\":1}\n\n";
        let r = extract_final_message_end(body).expect("应取到最后一条 message_end");
        assert_eq!(r.event, "message_end");
        assert_eq!(r.message_id, "m9");
        assert_eq!(r.answer, "part1");
    }

    #[test]
    fn test_extract_final_message_end_returns_none_when_no_match() {
        let body = "data: {\"event\":\"other\"}";
        assert!(extract_final_message_end(body).is_none());
    }

    #[test]
    fn test_dify_error_from_reqwest_error() {
        // 构造一个 reqwest::Error 比较麻烦，这里仅测试 From 的存在性
        fn assert_from<E: for<'a> From<reqwest::Error>>() {}
        assert_from::<DifyError>();
    }

    #[test]
    fn test_dify_config_default() {
        let c = DifyConfig::default();
        assert_eq!(c.base_url, "http://localhost:8180");
        assert!(c.api_key.is_empty());
        assert_eq!(c.default_user, "topems-user");
        assert_eq!(c.timeout_secs, 120);
    }
}
