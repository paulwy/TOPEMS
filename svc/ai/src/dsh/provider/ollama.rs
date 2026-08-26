//! Ollama 本地 Provider 实现。
//!
//! Ollama 是本地大模型运行时，支持 llama3、qwen、mistral 等开源模型。
//! 适用于本地部署、隐私敏感场景、低成本推理。

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::trait_::{
    ChatMessage, EmbeddingRequest, EmbeddingResponse, LlmProvider, LlmProviderError, LlmRequest,
    LlmResponse, LlmStreamChunk, ProviderConfig, ProviderType,
};

/// Ollama 默认 API URL
const OLLAMA_DEFAULT_URL: &str = "http://localhost:11434";

/// 默认模型
const DEFAULT_MODEL: &str = "llama3";

/// Ollama Provider
#[derive(Clone)]
pub struct OllamaProvider {
    config: ProviderConfig,
    client: reqwest::Client,
}

impl OllamaProvider {
    /// 创建新的 Ollama Provider
    pub fn new(config: ProviderConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .unwrap_or_default();

        Self { config, client }
    }

    /// 获取 API 基础 URL
    fn api_url(&self) -> &str {
        self.config.api_url.as_deref().unwrap_or(OLLAMA_DEFAULT_URL)
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

/// Ollama Chat 请求
#[derive(Debug, Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptions>,
}

/// Ollama 生成选项
#[derive(Debug, Serialize)]
struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>,
}

/// Ollama Chat 响应（非流式）
#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    message: OllamaMessage,
    done: bool,
    #[serde(default)]
    eval_count: Option<u32>,
    #[serde(default)]
    prompt_eval_count: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

/// Ollama 流式响应 chunk
#[derive(Debug, Deserialize)]
struct OllamaStreamChunk {
    message: Option<OllamaStreamMessage>,
    done: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaStreamMessage {
    content: String,
}

/// Ollama 模型信息
#[derive(Debug, Deserialize)]
struct OllamaModelInfo {
    name: String,
}

/// Ollama 模型列表响应
#[derive(Debug, Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModelInfo>,
}

/// Ollama 嵌入请求
#[derive(Debug, Serialize)]
struct OllamaEmbedRequest {
    model: String,
    input: Vec<String>,
}

/// Ollama 嵌入响应
#[derive(Debug, Deserialize)]
struct OllamaEmbedResponse {
    embeddings: Vec<Vec<f32>>,
}

#[async_trait]
impl LlmProvider for OllamaProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::Ollama
    }

    fn config(&self) -> &ProviderConfig {
        &self.config
    }

    async fn ask(&self, request: LlmRequest) -> Result<LlmResponse, LlmProviderError> {
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| self.model().to_string());
        let messages = self.build_messages(&request);

        let options = if request.temperature.is_some() || request.max_tokens.is_some() {
            Some(OllamaOptions {
                temperature: request.temperature.or(self.config.temperature),
                num_predict: request.max_tokens.or(self.config.max_tokens),
            })
        } else {
            None
        };

        let body = OllamaChatRequest {
            model: model.clone(),
            messages,
            stream: false,
            options,
        };

        let url = format!("{}/api/chat", self.api_url());
        let start = std::time::Instant::now();

        let response = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let body_text = response.text().await.unwrap_or_default();
            return Err(LlmProviderError::Api {
                status: status.as_u16(),
                message: body_text,
            });
        }

        let result: OllamaChatResponse = response
            .json()
            .await
            .map_err(|e| LlmProviderError::Serialization(e.to_string()))?;

        let latency_ms = start.elapsed().as_millis() as u64;

        Ok(LlmResponse {
            content: result.message.content,
            model,
            prompt_tokens: result.prompt_eval_count,
            completion_tokens: result.eval_count,
            total_tokens: None,
            latency_ms: Some(latency_ms),
        })
    }

    async fn ask_stream(
        &self,
        request: LlmRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<LlmStreamChunk>, LlmProviderError> {
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| self.model().to_string());
        let messages = self.build_messages(&request);
        let api_url = self.api_url().to_string();

        let options = if request.temperature.is_some() || request.max_tokens.is_some() {
            Some(OllamaOptions {
                temperature: request.temperature.or(self.config.temperature),
                num_predict: request.max_tokens.or(self.config.max_tokens),
            })
        } else {
            None
        };

        let body = OllamaChatRequest {
            model,
            messages,
            stream: true,
            options,
        };

        let (tx, rx) = tokio::sync::mpsc::channel(100);
        let client = self.client.clone();

        tokio::spawn(async move {
            let url = format!("{api_url}/api/chat");

            let response = match client.post(&url).json(&body).send().await {
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

                    if let Ok(parsed) = serde_json::from_str::<OllamaStreamChunk>(&line) {
                        if parsed.done {
                            let _ = tx
                                .send(LlmStreamChunk {
                                    delta: String::new(),
                                    done: true,
                                })
                                .await;
                            return;
                        }

                        if let Some(message) = parsed.message {
                            if !message.content.is_empty() {
                                let _ = tx
                                    .send(LlmStreamChunk {
                                        delta: message.content,
                                        done: false,
                                    })
                                    .await;
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

    async fn embed(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, LlmProviderError> {
        let model = request
            .model
            .clone()
            .unwrap_or_else(|| self.model().to_string());

        let body = OllamaEmbedRequest {
            model: model.clone(),
            input: request.texts,
        };

        let url = format!("{}/api/embed", self.api_url());

        let response = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(LlmProviderError::Api {
                status: response.status().as_u16(),
                message: "Embedding failed".to_string(),
            });
        }

        let result: OllamaEmbedResponse = response
            .json()
            .await
            .map_err(|e| LlmProviderError::Serialization(e.to_string()))?;

        Ok(EmbeddingResponse {
            embeddings: result.embeddings,
            model,
        })
    }

    async fn health_check(&self) -> Result<(), LlmProviderError> {
        let response = self
            .client
            .get(format!("{}/api/tags", self.api_url()))
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        if response.status().is_success() {
            Ok(())
        } else {
            Err(LlmProviderError::Api {
                status: response.status().as_u16(),
                message: "Ollama health check failed".to_string(),
            })
        }
    }

    async fn list_models(&self) -> Result<Vec<String>, LlmProviderError> {
        let response = self
            .client
            .get(format!("{}/api/tags", self.api_url()))
            .send()
            .await
            .map_err(|e| LlmProviderError::Network(e.to_string()))?;

        if !response.status().is_success() {
            return Err(LlmProviderError::Api {
                status: response.status().as_u16(),
                message: "Failed to list models".to_string(),
            });
        }

        let result: OllamaModelsResponse = response
            .json()
            .await
            .map_err(|e| LlmProviderError::Serialization(e.to_string()))?;

        Ok(result.models.into_iter().map(|m| m.name).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ollama_provider_type() {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            ..Default::default()
        };
        let provider = OllamaProvider::new(config);
        assert_eq!(provider.provider_type(), ProviderType::Ollama);
    }

    #[test]
    fn test_build_messages_with_system() {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            ..Default::default()
        };
        let provider = OllamaProvider::new(config);

        let request = LlmRequest::with_system("you are helpful", "hello");
        let messages = provider.build_messages(&request);

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].role, "system");
        assert_eq!(messages[1].role, "user");
    }

    #[test]
    fn test_default_api_url() {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            ..Default::default()
        };
        let provider = OllamaProvider::new(config);
        assert_eq!(provider.api_url(), OLLAMA_DEFAULT_URL);
    }

    #[test]
    fn test_custom_api_url() {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            api_url: Some("http://custom:11434".to_string()),
            ..Default::default()
        };
        let provider = OllamaProvider::new(config);
        assert_eq!(provider.api_url(), "http://custom:11434");
    }
}
