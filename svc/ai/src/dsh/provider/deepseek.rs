//! DeepSeek API Provider 实现。
//!
//! DeepSeek API 兼容 OpenAI 格式，支持 chat/completions 端点。
//! 适用于云端大模型调用，如 deepseek-chat、deepseek-reasoner。

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::trait_::{
    ChatMessage, LlmProvider, LlmProviderError, LlmRequest, LlmResponse, LlmStreamChunk,
    ProviderConfig, ProviderType,
};

/// DeepSeek API 基础 URL
const DEEPSEEK_API_URL: &str = "https://api.deepseek.com/v1";

/// 默认模型
const DEFAULT_MODEL: &str = "deepseek-chat";

/// DeepSeek Provider
#[derive(Clone)]
pub struct DeepSeekProvider {
    config: ProviderConfig,
    client: reqwest::Client,
}

impl DeepSeekProvider {
    /// 创建新的 DeepSeek Provider
    pub fn new(config: ProviderConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .unwrap_or_default();

        Self { config, client }
    }

    /// 获取 API 基础 URL
    fn api_url(&self) -> &str {
        self.config.api_url.as_deref().unwrap_or(DEEPSEEK_API_URL)
    }

    /// 获取 API Key
    fn api_key(&self) -> Result<&str, LlmProviderError> {
        self.config
            .api_key
            .as_deref()
            .ok_or_else(|| LlmProviderError::Configuration("API key not configured".to_string()))
    }

    /// 获取模型名称
    fn model(&self) -> &str {
        self.config
            .default_model
            .as_deref()
            .unwrap_or(DEFAULT_MODEL)
    }

    /// 构建请求消息列表
    fn build_messages(&self, request: &LlmRequest) -> Vec<ChatMessage> {
        let mut messages = Vec::new();

        if let Some(system_prompt) = &request.system_prompt {
            messages.push(ChatMessage {
                role: "system".to_string(),
                content: system_prompt.clone(),
            });
        }

        if let Some(history) = &request.history {
            messages.extend(history.iter().cloned());
        }

        messages.push(ChatMessage {
            role: "user".to_string(),
            content: request.user_message.clone(),
        });

        messages
    }
}

/// DeepSeek Chat Completion 请求
#[derive(Debug, Serialize)]
struct DeepSeekChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    stream: bool,
}

/// DeepSeek Chat Completion 响应
#[derive(Debug, Deserialize)]
struct DeepSeekChatResponse {
    choices: Vec<DeepSeekChoice>,
    #[serde(default)]
    usage: Option<DeepSeekUsage>,
}

#[derive(Debug, Deserialize)]
struct DeepSeekChoice {
    message: DeepSeekMessage,
}

#[derive(Debug, Deserialize)]
struct DeepSeekMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct DeepSeekUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

/// DeepSeek 错误响应
#[derive(Debug, Deserialize)]
struct DeepSeekErrorResponse {
    error: DeepSeekError,
}

#[derive(Debug, Deserialize)]
struct DeepSeekError {
    message: String,
    #[serde(default)]
    code: Option<String>,
}

#[async_trait]
impl LlmProvider for DeepSeekProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::DeepSeek
    }

    fn config(&self) -> &ProviderConfig {
        &self.config
    }

    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
        let api_key = self.api_key()?.to_string();
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| self.model().to_string());
        let messages = self.build_messages(&request);

        let body = DeepSeekChatRequest {
            model: model.clone(),
            messages,
            temperature: request.temperature.or(self.config.temperature),
            max_tokens: request.max_tokens.or(self.config.max_tokens),
            stream: false,
        };

        let url = format!("{}/chat/completions", self.api_url());
        let start = std::time::Instant::now();

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {api_key}"))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();

            if status == 401 || status == 403 {
                return Err(LlmProviderError::Authentication(body_text));
            }

            if status == 429 {
                return Err(LlmProviderError::RateLimit);
            }

            if let Ok(err) = serde_json::from_str::<DeepSeekErrorResponse>(&body_text) {
                return Err(LlmProviderError::Api {
                    status: status.as_u16(),
                    message: err.error.message,
                });
            }

            return Err(LlmProviderError::Api {
                status: status.as_u16(),
                message: body_text,
            });
        }

        let result: DeepSeekChatResponse = response
            .json()
            .await
            .map_err(|e| LlmProviderError::Serialization(e.to_string()))?;

        let content = result
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        let latency_ms = start.elapsed().as_millis() as u64;

        let (prompt_tokens, completion_tokens, total_tokens) = result
            .usage
            .map(|u| {
                (
                    Some(u.prompt_tokens),
                    Some(u.completion_tokens),
                    Some(u.total_tokens),
                )
            })
            .unwrap_or((None, None, None));

        Ok(LlmResponse {
            content,
            model,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            latency_ms: Some(latency_ms),
        })
    }

    async fn ask_stream(
        &self,
        request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        let api_key = self.api_key()?.to_string();
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| self.model().to_string());
        let messages = self.build_messages(&request);
        let api_url = self.api_url().to_string();

        let body = DeepSeekChatRequest {
            model,
            messages,
            temperature: request.temperature.or(self.config.temperature),
            max_tokens: request.max_tokens.or(self.config.max_tokens),
            stream: true,
        };

        let (tx, rx) = tokio::sync::mpsc::channel(100);

        let client = self.client.clone();

        tokio::spawn(async move {
            let url = format!("{api_url}/chat/completions");

            let response = match client
                .post(&url)
                .header("Authorization", format!("Bearer {api_key}"))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    let _ = tx
                        .send(LlmStreamChunk {
                            delta: format!("Network error: {e}"),
                            done: true,
                        })
                        .await;
                    return;
                }
            };

            if !response.status().is_success() {
                let _ = tx
                    .send(LlmStreamChunk {
                        delta: format!("API error: {}", response.status()),
                        done: true,
                    })
                    .await;
                return;
            }

            let mut stream = response.bytes_stream();
            let mut buffer = String::new();

            use futures::StreamExt;
            while let Some(chunk) = stream.next().await {
                let bytes = match chunk {
                    Ok(b) => b,
                    Err(_) => break,
                };

                buffer.push_str(&String::from_utf8_lossy(&bytes));

                while let Some(newline_pos) = buffer.find('\n') {
                    let line = buffer[..newline_pos].trim().to_string();
                    buffer = buffer[newline_pos + 1..].to_string();

                    if line.is_empty() {
                        continue;
                    }

                    if let Some(data) = line.strip_prefix("data: ") {
                        if data == "[DONE]" {
                            let _ = tx
                                .send(LlmStreamChunk {
                                    delta: String::new(),
                                    done: true,
                                })
                                .await;
                            return;
                        }

                        if let Ok(parsed) = serde_json::from_str::<DeepSeekStreamResponse>(data) {
                            if let Some(choice) = parsed.choices.first() {
                                let delta = choice.delta.content.clone().unwrap_or_default();
                                if !delta.is_empty() {
                                    let _ = tx.send(LlmStreamChunk { delta, done: false }).await;
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
        let api_key = self.api_key()?;

        let response = self
            .client
            .get(format!("{}/models", self.api_url()))
            .header("Authorization", format!("Bearer {api_key}"))
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(LlmProviderError::Api {
                status: response.status().as_u16(),
                message: "Health check failed".to_string(),
            })
        }
    }

    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
        let api_key = self.api_key()?.to_string();

        let response = self
            .client
            .get(format!("{}/models", self.api_url()))
            .header("Authorization", format!("Bearer {api_key}"))
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(LlmProviderError::Api {
                status: response.status().as_u16(),
                message: "Failed to list models".to_string(),
            });
        }

        let result: DeepSeekModelsResponse = response
            .json()
            .await
            .map_err(|e| LlmProviderError::Serialization(e.to_string()))?;

        Ok(result.data.into_iter().map(|m| m.id).collect())
    }
}

/// DeepSeek 流式响应
#[derive(Debug, Deserialize)]
struct DeepSeekStreamResponse {
    choices: Vec<DeepSeekStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct DeepSeekStreamChoice {
    delta: DeepSeekStreamDelta,
}

#[derive(Debug, Deserialize)]
struct DeepSeekStreamDelta {
    #[serde(default)]
    content: Option<String>,
}

/// DeepSeek 模型列表响应
#[derive(Debug, Deserialize)]
struct DeepSeekModelsResponse {
    data: Vec<DeepSeekModelInfo>,
}

#[derive(Debug, Deserialize)]
struct DeepSeekModelInfo {
    id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deepseek_provider_type() {
        let config = ProviderConfig {
            provider_type: ProviderType::DeepSeek,
            api_key: Some("test-key".to_string()),
            ..Default::default()
        };
        let provider = DeepSeekProvider::new(config);
        assert_eq!(provider.provider_type(), ProviderType::DeepSeek);
    }

    #[test]
    fn test_build_messages_with_system() {
        let config = ProviderConfig {
            provider_type: ProviderType::DeepSeek,
            api_key: Some("test-key".to_string()),
            ..Default::default()
        };
        let provider = DeepSeekProvider::new(config);

        let request = LlmRequest::with_system("you are helpful", "hello");
        let messages = provider.build_messages(&request);

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].role, "system");
        assert_eq!(messages[1].role, "user");
    }

    #[test]
    fn test_build_messages_simple() {
        let config = ProviderConfig {
            provider_type: ProviderType::DeepSeek,
            api_key: Some("test-key".to_string()),
            ..Default::default()
        };
        let provider = DeepSeekProvider::new(config);

        let request = LlmRequest::simple("hello");
        let messages = provider.build_messages(&request);

        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].role, "user");
    }

    #[test]
    fn test_api_key_missing() {
        let config = ProviderConfig {
            provider_type: ProviderType::DeepSeek,
            api_key: None,
            ..Default::default()
        };
        let provider = DeepSeekProvider::new(config);
        assert!(provider.api_key().is_err());
    }
}
