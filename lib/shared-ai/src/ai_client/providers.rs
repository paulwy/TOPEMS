//! AI 服务提供者实现

use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::{Client, Response};
use std::pin::Pin;
use std::sync::Arc;

use super::client::{create_http_client, AIClient, AIClientError, UnifiedAIClient};
use super::config::{AIModelConfig, AIProviderType};
use super::models::*;

/// OpenAI 提供者
#[derive(Clone)]
pub struct OpenAIClient {
    config: AIModelConfig,
    client: Client,
}

impl OpenAIClient {
    pub fn new(config: AIModelConfig) -> Self {
        let client = create_http_client(config.get_timeout());
        Self { config, client }
    }

    fn build_auth_header(&self) -> Option<String> {
        self.config
            .get_api_key()
            .map(|key| format!("Bearer {}", key))
    }

    async fn send_request<T: serde::Serialize>(
        &self,
        endpoint: &str,
        body: &T,
    ) -> Result<Response, AIClientError> {
        let url = format!("{}/{}", self.config.get_base_url(), endpoint);
        let mut request = self.client.post(&url).json(body);

        if let Some(auth) = self.build_auth_header() {
            request = request.header("Authorization", auth);
        }

        if let Some(org) = &self.config.organization {
            request = request.header("OpenAI-Organization", org);
        }

        let response = request.send().await?;
        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();

            if status.is_client_error() {
                if let Ok(err) = serde_json::from_str::<ErrorResponse>(&body) {
                    return Err(AIClientError::AuthError(err.error.message));
                }
            }

            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        Ok(response)
    }
}

#[async_trait]
impl AIClient for OpenAIClient {
    async fn chat_completion(
        &self,
        request: ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, AIClientError> {
        let response = self.send_request("chat/completions", &request).await?;
        let result: ChatCompletionResponse = response.json().await?;
        Ok(result)
    }

    async fn chat_completion_stream(
        &self,
        mut request: ChatCompletionRequest,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<StreamingChunk, AIClientError>> + Send + 'static>>,
        AIClientError,
    > {
        request.stream = Some(true);
        let url = format!("{}/chat/completions", self.config.get_base_url());

        let mut builder = self.client.post(&url).json(&request);
        if let Some(auth) = self.build_auth_header() {
            builder = builder.header("Authorization", auth);
        }

        let response = builder.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let stream = response.bytes_stream().flat_map(|result| match result {
            Ok(bytes) => {
                let lines = String::from_utf8_lossy(&bytes);
                let mut chunks = Vec::new();

                for line in lines.lines() {
                    let trimmed = line.trim();
                    if let Some(json_str) = trimmed.strip_prefix("data: ") {
                        if json_str == "[DONE]" {
                            continue;
                        }
                        match serde_json::from_str::<StreamingChunk>(json_str) {
                            Ok(chunk) => chunks.push(Ok(chunk)),
                            Err(e) => chunks.push(Err(AIClientError::ParseError(e.to_string()))),
                        }
                    }
                }

                futures::stream::iter(chunks)
            }
            Err(e) => futures::stream::iter(vec![Err(AIClientError::NetworkError(e.to_string()))]),
        });

        Ok(Box::pin(stream))
    }

    async fn embeddings(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, AIClientError> {
        let response = self.send_request("embeddings", &request).await?;
        let result: EmbeddingResponse = response.json().await?;
        Ok(result)
    }

    async fn list_models(&self) -> Result<ModelListResponse, AIClientError> {
        let url = format!("{}/models", self.config.get_base_url());
        let mut request = self.client.get(&url);

        if let Some(auth) = self.build_auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let result: ModelListResponse = response.json().await?;
        Ok(result)
    }

    async fn health_check(&self) -> Result<bool, AIClientError> {
        let url = format!("{}/models", self.config.get_base_url());
        let response = self.client.get(&url).send().await?;
        Ok(response.status().is_success())
    }

    fn get_config(&self) -> &AIModelConfig {
        &self.config
    }
}

/// Gemini 提供者
#[derive(Clone)]
pub struct GeminiClient {
    config: AIModelConfig,
    client: Client,
}

impl GeminiClient {
    pub fn new(config: AIModelConfig) -> Self {
        let client = create_http_client(config.get_timeout());
        Self { config, client }
    }

    async fn send_request<T: serde::Serialize>(
        &self,
        endpoint: &str,
        body: &T,
    ) -> Result<Response, AIClientError> {
        let url = format!("{}/{}", self.config.get_base_url(), endpoint);
        let mut request = self.client.post(&url).json(body);

        if let Some(api_key) = self.config.get_api_key() {
            request = request.query(&[("key", api_key)]);
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        Ok(response)
    }

    /// 将标准请求转换为 Gemini 格式
    fn convert_to_gemini_request(&self, request: &ChatCompletionRequest) -> serde_json::Value {
        let mut messages = Vec::new();

        for msg in &request.messages {
            let role = if msg.role == "system" {
                "system"
            } else if msg.role == "assistant" {
                "model"
            } else {
                "user"
            };

            if let Some(tool_call) = &msg.tool_call {
                messages.push(serde_json::json!({
                    "role": "model",
                    "parts": [{
                        "functionCall": {
                            "name": tool_call.name,
                            "args": tool_call.arguments
                        }
                    }]
                }));
            } else {
                messages.push(serde_json::json!({
                    "role": role,
                    "parts": [{ "text": msg.content }]
                }));
            }
        }

        serde_json::json!({
            "contents": messages,
            "generationConfig": {
                "temperature": request.temperature.unwrap_or(0.7),
                "maxOutputTokens": request.max_tokens.unwrap_or(4096),
                "stream": request.stream.unwrap_or(false)
            }
        })
    }

    /// 将 Gemini 响应转换为标准格式
    fn convert_from_gemini_response(&self, response: serde_json::Value) -> ChatCompletionResponse {
        let contents = response["candidates"][0]["content"].clone();
        let role = contents["role"].as_str().unwrap_or("assistant");
        let mut content = String::new();

        if let Some(parts) = contents["parts"].as_array() {
            for part in parts {
                if let Some(text) = part["text"].as_str() {
                    content.push_str(text);
                }
            }
        }

        ChatCompletionResponse {
            id: response["id"].as_str().unwrap_or("").to_string(),
            object: "chat.completion".to_string(),
            created: response["usageMetadata"]["promptTokenCount"]
                .as_u64()
                .unwrap_or(0),
            model: self.config.model_name.clone(),
            choices: vec![Choice {
                index: 0,
                message: ChatMessage {
                    role: role.to_string(),
                    content,
                    tool_call: None,
                    tool_result: None,
                },
                finish_reason: Some("stop".to_string()),
            }],
            usage: Some(Usage {
                prompt_tokens: response["usageMetadata"]["promptTokenCount"]
                    .as_u64()
                    .unwrap_or(0) as usize,
                completion_tokens: response["usageMetadata"]["candidatesTokenCount"]
                    .as_u64()
                    .unwrap_or(0) as usize,
                total_tokens: response["usageMetadata"]["totalTokenCount"]
                    .as_u64()
                    .unwrap_or(0) as usize,
            }),
        }
    }
}

#[async_trait]
impl AIClient for GeminiClient {
    async fn chat_completion(
        &self,
        request: ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, AIClientError> {
        let gemini_request = self.convert_to_gemini_request(&request);
        let endpoint = format!("models/{}/generateContent", self.config.model_name);
        let response = self.send_request(&endpoint, &gemini_request).await?;
        let response_json: serde_json::Value = response.json().await?;
        Ok(self.convert_from_gemini_response(response_json))
    }

    async fn chat_completion_stream(
        &self,
        request: ChatCompletionRequest,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<StreamingChunk, AIClientError>> + Send + 'static>>,
        AIClientError,
    > {
        let mut gemini_request = self.convert_to_gemini_request(&request);
        gemini_request["generationConfig"]["stream"] = serde_json::json!(true);

        let endpoint = format!("models/{}/streamGenerateContent", self.config.model_name);
        let url = format!("{}/{}", self.config.get_base_url(), endpoint);

        let mut builder = self.client.post(&url).json(&gemini_request);
        if let Some(api_key) = self.config.get_api_key() {
            builder = builder.query(&[("key", api_key)]);
        }

        let response = builder.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let model_name = self.config.model_name.clone();

        let stream = response
            .bytes_stream()
            .flat_map(move |result| match result {
                Ok(bytes) => {
                    let lines = String::from_utf8_lossy(&bytes);
                    let mut chunks = Vec::new();

                    for line in lines.lines() {
                        let trimmed = line.trim();
                        if let Some(json_str) = trimmed.strip_prefix("data: ") {
                            match serde_json::from_str::<serde_json::Value>(json_str) {
                                Ok(gemini_chunk) => {
                                    let content = gemini_chunk["candidates"][0]["content"]["parts"]
                                        [0]["text"]
                                        .as_str()
                                        .unwrap_or("");

                                    chunks.push(Ok(StreamingChunk {
                                        id: "stream".to_string(),
                                        object: "chat.completion.chunk".to_string(),
                                        created: 0,
                                        model: model_name.clone(),
                                        choices: vec![StreamingChoice {
                                            index: 0,
                                            delta: StreamingDelta {
                                                role: None,
                                                content: Some(content.to_string()),
                                                tool_call: None,
                                            },
                                            finish_reason: None,
                                        }],
                                    }));
                                }
                                Err(e) => {
                                    chunks.push(Err(AIClientError::ParseError(e.to_string())));
                                }
                            }
                        }
                    }

                    futures::stream::iter(chunks)
                }
                Err(e) => {
                    futures::stream::iter(vec![Err(AIClientError::NetworkError(e.to_string()))])
                }
            });

        Ok(Box::pin(stream))
    }

    async fn embeddings(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, AIClientError> {
        let endpoint = format!("models/{}:embedContent", self.config.model_name);
        let gemini_request = serde_json::json!({
            "content": {
                "parts": request.input.iter().map(|text| {
                    serde_json::json!({ "text": text })
                }).collect::<Vec<_>>()
            }
        });

        let response = self.send_request(&endpoint, &gemini_request).await?;
        let response_json: serde_json::Value = response.json().await?;

        let embedding: Vec<f32> = response_json["embedding"]["values"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|v| v.as_f64().map(|f| f as f32))
            .collect();

        Ok(EmbeddingResponse {
            object: "list".to_string(),
            data: vec![EmbeddingData {
                index: 0,
                embedding,
                object: "embedding".to_string(),
            }],
            model: self.config.model_name.clone(),
            usage: Usage {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
            },
        })
    }

    async fn list_models(&self) -> Result<ModelListResponse, AIClientError> {
        let url = format!("{}/models", self.config.get_base_url());
        let mut request = self.client.get(&url);

        if let Some(api_key) = self.config.get_api_key() {
            request = request.query(&[("key", api_key)]);
        }

        let response = request.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let response_json: serde_json::Value = response.json().await?;
        let models: Vec<ModelInfo> = response_json["models"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|m| ModelInfo {
                id: m["name"].as_str().unwrap_or("").to_string(),
                object: "model".to_string(),
                created: 0,
                owned_by: "google".to_string(),
                permission: vec![],
            })
            .collect();

        Ok(ModelListResponse {
            object: "list".to_string(),
            data: models,
        })
    }

    async fn health_check(&self) -> Result<bool, AIClientError> {
        let url = format!("{}/models", self.config.get_base_url());
        let mut request = self.client.get(&url);

        if let Some(api_key) = self.config.get_api_key() {
            request = request.query(&[("key", api_key)]);
        }

        let response = request.send().await?;
        Ok(response.status().is_success())
    }

    fn get_config(&self) -> &AIModelConfig {
        &self.config
    }
}

/// Ollama 提供者
#[derive(Clone)]
pub struct OllamaClient {
    config: AIModelConfig,
    client: Client,
}

impl OllamaClient {
    pub fn new(config: AIModelConfig) -> Self {
        let client = create_http_client(config.get_timeout());
        Self { config, client }
    }

    async fn send_request<T: serde::Serialize>(
        &self,
        endpoint: &str,
        body: &T,
    ) -> Result<Response, AIClientError> {
        let url = format!("{}/{}", self.config.get_base_url(), endpoint);
        let response = self.client.post(&url).json(body).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        Ok(response)
    }
}

#[async_trait]
impl AIClient for OllamaClient {
    async fn chat_completion(
        &self,
        mut request: ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, AIClientError> {
        request.stream = Some(false);
        let response = self.send_request("chat/completions", &request).await?;
        let result: ChatCompletionResponse = response.json().await?;
        Ok(result)
    }

    async fn chat_completion_stream(
        &self,
        mut request: ChatCompletionRequest,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<StreamingChunk, AIClientError>> + Send + 'static>>,
        AIClientError,
    > {
        request.stream = Some(true);
        let url = format!("{}/chat/completions", self.config.get_base_url());

        let response = self.client.post(&url).json(&request).send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let stream = response.bytes_stream().flat_map(|result| match result {
            Ok(bytes) => {
                let lines = String::from_utf8_lossy(&bytes);
                let mut chunks = Vec::new();

                for line in lines.lines() {
                    let trimmed = line.trim();
                    if let Some(json_str) = trimmed.strip_prefix("data: ") {
                        if json_str == "[DONE]" {
                            continue;
                        }
                        match serde_json::from_str::<StreamingChunk>(json_str) {
                            Ok(chunk) => chunks.push(Ok(chunk)),
                            Err(e) => chunks.push(Err(AIClientError::ParseError(e.to_string()))),
                        }
                    }
                }

                futures::stream::iter(chunks)
            }
            Err(e) => futures::stream::iter(vec![Err(AIClientError::NetworkError(e.to_string()))]),
        });

        Ok(Box::pin(stream))
    }

    async fn embeddings(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, AIClientError> {
        let response = self.send_request("embeddings", &request).await?;
        let result: EmbeddingResponse = response.json().await?;
        Ok(result)
    }

    async fn list_models(&self) -> Result<ModelListResponse, AIClientError> {
        let url = format!("{}/models", self.config.get_base_url());
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let ollama_response: serde_json::Value = response.json().await?;
        let models: Vec<ModelInfo> = ollama_response["data"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|m| ModelInfo {
                id: m["id"].as_str().unwrap_or("").to_string(),
                object: "model".to_string(),
                created: m["created"].as_u64().unwrap_or(0),
                owned_by: "ollama".to_string(),
                permission: vec![],
            })
            .collect();

        Ok(ModelListResponse {
            object: "list".to_string(),
            data: models,
        })
    }

    async fn health_check(&self) -> Result<bool, AIClientError> {
        let url = format!("{}/tags", self.config.base_url.replace("/v1", "/api"));
        let response = self.client.get(&url).send().await?;
        Ok(response.status().is_success())
    }

    fn get_config(&self) -> &AIModelConfig {
        &self.config
    }
}

/// Azure OpenAI 提供者
#[derive(Clone)]
pub struct AzureOpenAIClient {
    config: AIModelConfig,
    client: Client,
}

impl AzureOpenAIClient {
    pub fn new(config: AIModelConfig) -> Self {
        let client = create_http_client(config.get_timeout());
        Self { config, client }
    }

    fn get_deployment_name(&self) -> String {
        self.config
            .deployment_name
            .clone()
            .unwrap_or(self.config.model_name.clone())
    }
}

#[async_trait]
impl AIClient for AzureOpenAIClient {
    async fn chat_completion(
        &self,
        request: ChatCompletionRequest,
    ) -> Result<ChatCompletionResponse, AIClientError> {
        let _deployment = self.get_deployment_name();
        let url = format!(
            "{}/chat/completions?api-version=2024-02-15-preview",
            self.config.get_base_url()
        );
        let mut builder = self.client.post(&url).json(&request);

        if let Some(key) = self.config.get_api_key() {
            builder = builder.header("api-key", key);
        }

        let response = builder.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let result: ChatCompletionResponse = response.json().await?;
        Ok(result)
    }

    async fn chat_completion_stream(
        &self,
        mut request: ChatCompletionRequest,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<StreamingChunk, AIClientError>> + Send + 'static>>,
        AIClientError,
    > {
        request.stream = Some(true);
        let url = format!(
            "{}/chat/completions?api-version=2024-02-15-preview",
            self.config.get_base_url()
        );

        let mut builder = self.client.post(&url).json(&request);
        if let Some(key) = self.config.get_api_key() {
            builder = builder.header("api-key", key);
        }

        let response = builder.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let stream = response.bytes_stream().flat_map(|result| match result {
            Ok(bytes) => {
                let lines = String::from_utf8_lossy(&bytes);
                let mut chunks = Vec::new();

                for line in lines.lines() {
                    let trimmed = line.trim();
                    if let Some(json_str) = trimmed.strip_prefix("data: ") {
                        if json_str == "[DONE]" {
                            continue;
                        }
                        match serde_json::from_str::<StreamingChunk>(json_str) {
                            Ok(chunk) => chunks.push(Ok(chunk)),
                            Err(e) => chunks.push(Err(AIClientError::ParseError(e.to_string()))),
                        }
                    }
                }

                futures::stream::iter(chunks)
            }
            Err(e) => futures::stream::iter(vec![Err(AIClientError::NetworkError(e.to_string()))]),
        });

        Ok(Box::pin(stream))
    }

    async fn embeddings(
        &self,
        request: EmbeddingRequest,
    ) -> Result<EmbeddingResponse, AIClientError> {
        let url = format!(
            "{}/embeddings?api-version=2024-02-15-preview",
            self.config.get_base_url()
        );
        let mut builder = self.client.post(&url).json(&request);

        if let Some(key) = self.config.get_api_key() {
            builder = builder.header("api-key", key);
        }

        let response = builder.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let result: EmbeddingResponse = response.json().await?;
        Ok(result)
    }

    async fn list_models(&self) -> Result<ModelListResponse, AIClientError> {
        let url = format!(
            "{}/models?api-version=2024-02-15-preview",
            self.config.get_base_url()
        );
        let mut builder = self.client.get(&url);

        if let Some(key) = self.config.get_api_key() {
            builder = builder.header("api-key", key);
        }

        let response = builder.send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AIClientError::ApiError(format!("{}: {}", status, body)));
        }

        let result: ModelListResponse = response.json().await?;
        Ok(result)
    }

    async fn health_check(&self) -> Result<bool, AIClientError> {
        let url = format!(
            "{}/models?api-version=2024-02-15-preview",
            self.config.get_base_url()
        );
        let mut builder = self.client.get(&url);

        if let Some(key) = self.config.get_api_key() {
            builder = builder.header("api-key", key);
        }

        let response = builder.send().await?;
        Ok(response.status().is_success())
    }

    fn get_config(&self) -> &AIModelConfig {
        &self.config
    }
}

/// 创建 AI 客户端
pub fn create_client(config: AIModelConfig) -> UnifiedAIClient {
    match config.provider {
        AIProviderType::OpenAI => UnifiedAIClient::OpenAI(Arc::new(OpenAIClient::new(config))),
        AIProviderType::Gemini => UnifiedAIClient::Gemini(Arc::new(GeminiClient::new(config))),
        AIProviderType::Ollama => UnifiedAIClient::Ollama(Arc::new(OllamaClient::new(config))),
        AIProviderType::AzureOpenAI => {
            UnifiedAIClient::AzureOpenAI(Arc::new(AzureOpenAIClient::new(config)))
        }
        AIProviderType::Custom => UnifiedAIClient::OpenAI(Arc::new(OpenAIClient::new(config))), // Custom 使用 OpenAI 兼容接口
    }
}

/// 获取支持的模型列表
pub fn get_supported_models(provider: AIProviderType) -> Vec<String> {
    match provider {
        AIProviderType::OpenAI => vec![
            "gpt-4o".to_string(),
            "gpt-4-turbo".to_string(),
            "gpt-4".to_string(),
            "gpt-3.5-turbo".to_string(),
            "text-embedding-3-small".to_string(),
            "text-embedding-3-large".to_string(),
        ],
        AIProviderType::Gemini => vec![
            "gemini-1.5-pro".to_string(),
            "gemini-1.5-flash".to_string(),
            "gemini-pro".to_string(),
            "models/embedding-001".to_string(),
        ],
        AIProviderType::Ollama => vec![
            "qwen2.5:7b-instruct".to_string(),
            "qwen2.5:14b-instruct".to_string(),
            "qwen2.5:32b-instruct".to_string(),
            "llama3.1:8b".to_string(),
            "llama3.1:70b".to_string(),
            "nomic-embed-text".to_string(),
            "all-minilm".to_string(),
        ],
        AIProviderType::AzureOpenAI => vec![
            "gpt-4o".to_string(),
            "gpt-4-turbo".to_string(),
            "gpt-3.5-turbo".to_string(),
            "text-embedding-3-small".to_string(),
        ],
        AIProviderType::Custom => vec!["custom-model".to_string()],
    }
}

#[cfg(test)]
mod tests {
    use super::super::config::AIProviderType;
    use super::*;

    #[test]
    fn test_get_supported_models() {
        let openai_models = get_supported_models(AIProviderType::OpenAI);
        assert!(openai_models.contains(&"gpt-4o".to_string()));

        let ollama_models = get_supported_models(AIProviderType::Ollama);
        assert!(ollama_models.contains(&"qwen2.5:7b-instruct".to_string()));
    }

    #[test]
    fn test_create_client() {
        let config = AIModelConfig {
            provider: AIProviderType::Ollama,
            ..Default::default()
        };

        let client = create_client(config);
        assert!(client.get_config().provider == AIProviderType::Ollama);
    }
}
