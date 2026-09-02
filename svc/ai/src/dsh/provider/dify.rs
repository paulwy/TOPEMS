//! Dify Provider 实现。
//!
//! 将 Dify 应用封装为统一的 `LlmProvider`，复用 DSH 的 Provider 抽象层。
//! 对应 Dify 官方 Service API：POST /v1/chat-messages（blocking / streaming）、GET /v1/info。
//!
//! 迁移说明（3.1a）：
//! - `services/dify.rs`（DifyService）是面向 HTTP handler 的完整客户端（保留，服务代理层）
//! - 本模块是 **Provider 层适配**：将 Dify 对话能力统一进 `LlmProvider` trait，
//!   使 Dify 可与 Ollama/DeepSeek 等 Provider 互换、参与路由与故障降级
//! - 配置来源：`ProviderConfig`（api_url → base_url，api_key → Dify app key）

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::trait_::{
    LlmProvider, LlmProviderError, LlmRequest, LlmResponse, LlmStreamChunk, ProviderConfig,
    ProviderType,
};

/// Dify 默认实例地址
const DEFAULT_DIFY_URL: &str = "http://localhost:8180";

/// Dify 默认终端用户标识
const DEFAULT_USER: &str = "topems-user";

/// Dify Provider
#[derive(Clone)]
pub struct DifyProvider {
    config: ProviderConfig,
    client: reqwest::Client,
    base_url: String,
    api_key: String,
    default_user: String,
}

impl DifyProvider {
    /// 创建新的 Dify Provider
    ///
    /// 从 `ProviderConfig` 读取：
    /// - `api_url` → Dify 根地址（默认 http://localhost:8180）
    /// - `api_key` → Dify 应用 API Key（app-xxx，必填）
    pub fn new(config: ProviderConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .unwrap_or_default();

        let base_url = config
            .api_url
            .clone()
            .unwrap_or_else(|| DEFAULT_DIFY_URL.to_string())
            .trim_end_matches('/')
            .to_string();

        Self {
            api_key: config.api_key.clone().unwrap_or_default(),
            base_url,
            default_user: DEFAULT_USER.to_string(),
            config,
            client,
        }
    }

    /// 是否已配置（API Key 非空）
    fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }

    /// 构建端点 URL
    fn endpoint(&self, path: &str) -> String {
        format!("{}/{}", self.base_url, path.trim_start_matches('/'))
    }

    /// Dify 对话请求体（POST /v1/chat-messages）
    fn build_chat_body(&self, request: &LlmRequest, stream: bool) -> DifyChatBody {
        DifyChatBody {
            inputs: serde_json::json!({}),
            query: request.user_message.clone(),
            response_mode: if stream { "streaming" } else { "blocking" }.to_string(),
            conversation_id: String::new(),
            user: self.default_user.clone(),
        }
    }

    /// 统一发送 chat 请求并返回原始文本
    async fn send_chat(&self, body: &DifyChatBody) -> Result<reqwest::Response, LlmProviderError> {
        if !self.is_configured() {
            return Err(LlmProviderError::Configuration(
                "Dify API key not configured (set DSH_API_KEY or DSH_PROVIDER=dify with api_key)"
                    .to_string(),
            ));
        }

        let url = self.endpoint("/v1/chat-messages");
        let resp = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        let status = resp.status();
        if !status.is_success() {
            return match status.as_u16() {
                401 | 403 => Err(LlmProviderError::Authentication(format!(
                    "Dify auth failed with status {status}"
                ))),
                429 => Err(LlmProviderError::RateLimit),
                code => Err(LlmProviderError::Api {
                    status: code,
                    message: "Dify chat request failed".to_string(),
                }),
            };
        }

        Ok(resp)
    }
}

/// Dify chat-messages 请求体
#[derive(Debug, Serialize)]
struct DifyChatBody {
    inputs: serde_json::Value,
    query: String,
    #[serde(rename = "response_mode")]
    response_mode: String,
    #[serde(rename = "conversation_id")]
    conversation_id: String,
    user: String,
}

/// Dify blocking 响应（message_end 事件）
#[derive(Debug, Deserialize)]
struct DifyBlockingResponse {
    #[serde(default)]
    event: String,
    #[serde(default)]
    answer: String,
    #[serde(default, rename = "conversation_id")]
    conversation_id: String,
    #[serde(default, rename = "message_id")]
    message_id: String,
    #[serde(default)]
    created_at: i64,
}

#[async_trait]
impl LlmProvider for DifyProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Dify
    }

    fn config(&self) -> &ProviderConfig {
        &self.config
    }

    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
        let body = self.build_chat_body(&request, false);
        let resp = self.send_chat(&body).await?;

        let status = resp.status();
        let text = resp
            .text()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        // Dify blocking 通常返回单条 message_end JSON；兼容多行 SSE（取最后 message_end）
        let parsed = serde_json::from_str::<DifyBlockingResponse>(&text).or_else(|_| {
            extract_final_answer(&text).ok_or_else(|| {
                LlmProviderError::Serialization(format!(
                    "Failed to parse Dify response: {} | body: {}",
                    status,
                    truncate(&text, 300)
                ))
            })
        })?;

        Ok(LlmResponse {
            content: parsed.answer,
            model: "dify".to_string(),
            prompt_tokens: None,
            completion_tokens: None,
            total_tokens: None,
            latency_ms: None,
        })
    }

    async fn ask_stream(
        &self,
        request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        let body = self.build_chat_body(&request, true);
        let resp = self.send_chat(&body).await?;

        let (tx, rx) = tokio::sync::mpsc::channel(100);
        let mut stream = resp.bytes_stream();
        let mut buffer = String::new();

        tokio::spawn(async move {
            use futures::StreamExt;

            while let Some(chunk) = stream.next().await {
                let bytes = match chunk {
                    Ok(b) => b,
                    Err(_) => break,
                };
                buffer.push_str(&String::from_utf8_lossy(&bytes));

                while let Some(nl) = buffer.find('\n') {
                    let line = buffer[..nl].trim().to_string();
                    buffer = buffer[nl + 1..].to_string();
                    if line.is_empty() {
                        continue;
                    }
                    let json_str = line
                        .strip_prefix("data:")
                        .or_else(|| line.strip_prefix("data: "))
                        .unwrap_or(&line)
                        .trim();
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
                        let event = v.get("event").and_then(|e| e.as_str()).unwrap_or("");
                        if event == "message" {
                            if let Some(ans) = v.get("answer").and_then(|a| a.as_str()) {
                                if !ans.is_empty() {
                                    let _ = tx
                                        .send(LlmStreamChunk {
                                            delta: ans.to_string(),
                                            done: false,
                                        })
                                        .await;
                                }
                            }
                        }
                    }
                }
            }
            let _ = tx
                .send(LlmStreamChunk {
                    delta: String::new(),
                    done: true,
                })
                .await;
        });

        Ok(rx)
    }

    async fn health_check(&self) -> Result<(), LlmProviderError> {
        if !self.is_configured() {
            return Err(LlmProviderError::Configuration(
                "Dify API key not configured".to_string(),
            ));
        }
        let url = self.endpoint("/v1/info");
        let resp = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            Err(LlmProviderError::Api {
                status: resp.status().as_u16(),
                message: "Dify health check failed".to_string(),
            })
        }
    }

    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
        // Dify 无模型列表端点；返回单元素标记（应用已配置）
        if self.is_configured() {
            Ok(vec!["dify-app".to_string()])
        } else {
            Err(LlmProviderError::Configuration(
                "Dify API key not configured".to_string(),
            ))
        }
    }
}

/// 从多行 SSE/JSON 响应提取最后一条 message_end 的 answer
fn extract_final_answer(body: &str) -> Option<DifyBlockingResponse> {
    let mut last: Option<DifyBlockingResponse> = None;
    for line in body.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
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
                if let Ok(parsed) = serde_json::from_value::<DifyBlockingResponse>(v.clone()) {
                    if event == "message_end" {
                        last = Some(parsed);
                    }
                }
            }
        }
    }
    last
}

/// 截断字符串（用于错误消息）
fn truncate(s: &str, n: usize) -> String {
    if s.len() > n {
        format!("{}...(truncated)", &s[..n])
    } else {
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config_with_key() -> ProviderConfig {
        ProviderConfig {
            provider_type: ProviderType::Dify,
            api_url: Some("http://dify.test".to_string()),
            api_key: Some("app-test".to_string()),
            timeout_secs: 5,
            ..Default::default()
        }
    }

    #[test]
    fn test_dify_provider_type() {
        let provider = DifyProvider::new(config_with_key());
        assert_eq!(provider.provider_type(), ProviderType::Dify);
    }

    #[test]
    fn test_dify_default_url_when_missing() {
        let mut cfg = config_with_key();
        cfg.api_url = None;
        let provider = DifyProvider::new(cfg);
        assert_eq!(provider.base_url, DEFAULT_DIFY_URL);
        assert!(provider.is_configured());
    }

    #[test]
    fn test_dify_not_configured() {
        let mut cfg = config_with_key();
        cfg.api_key = None;
        let provider = DifyProvider::new(cfg);
        assert!(!provider.is_configured());
    }

    #[test]
    fn test_endpoint_join() {
        let provider = DifyProvider::new(config_with_key());
        assert_eq!(
            provider.endpoint("/v1/chat-messages"),
            "http://dify.test/v1/chat-messages"
        );
        assert_eq!(provider.endpoint("v1/info"), "http://dify.test/v1/info");
    }

    #[tokio::test]
    async fn test_ask_without_key_returns_config_error() {
        let mut cfg = config_with_key();
        cfg.api_key = None;
        let provider = DifyProvider::new(cfg);
        let err = provider.ask(LlmRequest::simple("hello")).await.unwrap_err();
        assert!(matches!(err, LlmProviderError::Configuration(_)));
    }

    #[tokio::test]
    async fn test_health_check_without_key() {
        let mut cfg = config_with_key();
        cfg.api_key = None;
        let provider = DifyProvider::new(cfg);
        assert!(provider.health_check().await.is_err());
    }

    #[test]
    fn test_build_chat_body_blocking() {
        let provider = DifyProvider::new(config_with_key());
        let req = LlmRequest::simple("你好");
        let body = provider.build_chat_body(&req, false);
        assert_eq!(body.query, "你好");
        assert_eq!(body.response_mode, "blocking");
        assert_eq!(body.user, DEFAULT_USER);
        assert!(body.inputs.is_object());
    }

    #[test]
    fn test_extract_final_answer_single_object() {
        let body = r#"{"event":"message_end","answer":"hi","conversation_id":"c1","message_id":"m1","created_at":1}"#;
        let r = extract_final_answer(body).expect("应解析出 answer");
        assert_eq!(r.answer, "hi");
        assert_eq!(r.conversation_id, "c1");
    }

    #[test]
    fn test_extract_final_answer_multi_line() {
        let body = "data: {\"event\":\"message\",\"answer\":\"part\"}\n\ndata: {\"event\":\"message_end\",\"answer\":\"part\",\"message_id\":\"m9\"}";
        let r = extract_final_answer(body).expect("应取到最后 message_end");
        assert_eq!(r.message_id, "m9");
    }

    #[test]
    fn test_extract_final_answer_none() {
        let body = "data: {\"event\":\"other\"}";
        assert!(extract_final_answer(body).is_none());
    }
}
