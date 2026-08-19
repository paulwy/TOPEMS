#![allow(dead_code)]

use crate::models::{
    AIGenerateRequest, AIGenerateResponse, AITemplate, AiSearchDocument, AiSearchRequest,
    AiSearchResponse, AnomalyPoint, AnomalyPredictRequest, AnomalyPredictResponse, ChatRequest,
    ChatResponse, ChunkInfo, CompleteRequest, CompleteResponse, FlowAssistantRequest,
    FlowAssistantResponse, FlowStep, KnowledgeAskRequest, KnowledgeAskResponse, KnowledgeSource,
    OpenAIMessage, OpenAIRequest, OpenAIResponse, ReportAssistantRequest, ReportAssistantResponse,
    ReportMetric, SearchResult, Suggestion, SummarizeRequest, SummarizeResponse, TemplateField,
    ValidateRequest, ValidateResponse, ValidationIssue, CLIENT, CONFIG, DOCUMENTS,
};
use crate::services::search::vector_search;
use axum::Json;
use reqwest::Client;
use topems_shared_core::response::ApiResponse;

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/generate",
    request_body = AIGenerateRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn generate(Json(req): Json<AIGenerateRequest>) -> Json<ApiResponse<AIGenerateResponse>> {
    let config = match CONFIG.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<AIGenerateResponse>::error(
                500,
                "AI service not initialized",
            ))
        }
    };
    let client = match CLIENT.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<AIGenerateResponse>::error(
                500,
                "AI client not initialized",
            ))
        }
    };

    let prompt = if let Some(p) = req.variables.get("prompt") {
        p.as_str().unwrap_or_default().to_string()
    } else {
        "请生成一些内容".to_string()
    };

    let format = req.output_format.unwrap_or("text".to_string());

    let content = if config.use_ollama || config.api_key.is_some() {
        tracing::info!(
            "🤖 正在调用 AI 模型生成内容 ({}: {})...",
            config.base_url,
            config.model
        );
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(120),
            call_ai_api(
                client,
                &config.base_url,
                &config.api_key,
                &config.model,
                &prompt,
            ),
        )
        .await
        {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 生成成功");
                response
            }
            Ok(Err(e)) => {
                tracing::warn!("⚠️ AI 生成失败，使用回退响应: {}", e);
                format!(
                    "抱歉，AI 内容生成暂时不可用。\n\n错误信息：{}\n\n请检查 AI 服务配置后重试。",
                    e
                )
            }
            Err(_) => {
                tracing::warn!("⚠️ AI 调用超时");
                "抱歉，AI 响应超时了。请稍后重试，或检查系统资源是否充足。".to_string()
            }
        }
    } else {
        "欢迎使用 TOPEMS 智能生成功能！\n\n当前 AI 功能尚未配置。请参考聊天功能的配置说明，设置 AI 服务后即可体验智能内容生成。".to_string()
    };

    Json(ApiResponse::success(
        AIGenerateResponse { content, format },
        "Success",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/validate",
    request_body = ValidateRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn validate(Json(req): Json<ValidateRequest>) -> Json<ApiResponse<ValidateResponse>> {
    let config = match CONFIG.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<ValidateResponse>::error(
                500,
                "AI service not initialized",
            ))
        }
    };
    let client = match CLIENT.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<ValidateResponse>::error(
                500,
                "AI client not initialized",
            ))
        }
    };

    let context_info = if let Some(ctx) = &req.context {
        format!(
            "模块: {}\n实体类型: {}",
            ctx.get("module")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown"),
            ctx.get("entityType")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
        )
    } else {
        "通用验证".to_string()
    };

    let prompt = format!(
        "你是一个专业的数据验证助手。请检查以下数据是否完整、格式是否正确、逻辑是否合理。\n\n{}\n\n数据内容:\n{}\n\n请以JSON格式返回验证结果，包含以下字段:\n1. issues: 问题列表，每个问题包含 field(字段名), type(类型: error/warning/info), message(问题描述), fix(修复建议，可选)\n2. suggestions: 优化建议列表，每个建议包含 field(字段名), value(建议值), reason(建议原因)\n\n请只返回JSON，不要包含其他内容。",
        context_info,
        serde_json::to_string_pretty(&req.data).unwrap_or_else(|_| "无法解析数据".to_string())
    );

    let issues = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型进行数据验证...");
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(60),
            call_ai_api(
                client,
                &config.base_url,
                &config.api_key,
                &config.model,
                &prompt,
            ),
        )
        .await
        {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 验证完成");
                let cleaned_response = response.replace("```json", "").replace("```", "");
                let cleaned_response = cleaned_response.trim();

                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(cleaned_response) {
                    let mut result_issues: Vec<ValidationIssue> = Vec::new();

                    if let Some(issues_array) = parsed.get("issues").and_then(|v| v.as_array()) {
                        for issue in issues_array {
                            result_issues.push(ValidationIssue {
                                field: issue
                                    .get("field")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("unknown")
                                    .to_string(),
                                r#type: issue
                                    .get("type")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("info")
                                    .to_string(),
                                message: issue
                                    .get("message")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                                fix: issue
                                    .get("fix")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string()),
                            });
                        }
                    }

                    if result_issues.is_empty() {
                        result_issues.push(ValidationIssue {
                            field: "general".to_string(),
                            r#type: "info".to_string(),
                            message: "数据验证通过，未发现明显问题".to_string(),
                            fix: None,
                        });
                    }

                    result_issues
                } else {
                    vec![ValidationIssue {
                        field: "general".to_string(),
                        r#type: "info".to_string(),
                        message: "AI 验证完成，但无法解析结果".to_string(),
                        fix: None,
                    }]
                }
            }
            Ok(Err(e)) => {
                tracing::error!("❌ AI 验证失败: {}", e);
                vec![ValidationIssue {
                    field: "general".to_string(),
                    r#type: "warning".to_string(),
                    message: format!("AI 验证服务暂时不可用: {}", e),
                    fix: None,
                }]
            }
            Err(_) => {
                tracing::error!("❌ AI 验证超时");
                vec![ValidationIssue {
                    field: "general".to_string(),
                    r#type: "warning".to_string(),
                    message: "AI 验证超时，请稍后重试".to_string(),
                    fix: None,
                }]
            }
        }
    } else {
        let mut issues: Vec<ValidationIssue> = Vec::new();

        if let Some(obj) = req.data.as_object() {
            for (key, value) in obj {
                if value.is_null() || (value.is_string() && value.as_str().unwrap_or("").is_empty())
                {
                    issues.push(ValidationIssue {
                        field: key.clone(),
                        r#type: "warning".to_string(),
                        message: format!("字段 '{}' 可能需要填写", key),
                        fix: Some(format!("请填写 '{}' 字段", key)),
                    });
                }
            }
        }

        if issues.is_empty() {
            issues.push(ValidationIssue {
                field: "general".to_string(),
                r#type: "info".to_string(),
                message: "基础验证完成，未发现明显问题".to_string(),
                fix: None,
            });
        }

        issues
    };

    Json(ApiResponse::success(ValidateResponse { issues }, "Success"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/complete",
    request_body = CompleteRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn complete(Json(req): Json<CompleteRequest>) -> Json<ApiResponse<CompleteResponse>> {
    let config = match CONFIG.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<CompleteResponse>::error(
                500,
                "AI service not initialized",
            ))
        }
    };
    let client = match CLIENT.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<CompleteResponse>::error(
                500,
                "AI client not initialized",
            ))
        }
    };

    let existing_data = req
        .data
        .clone()
        .or(req.partial_data.clone())
        .unwrap_or(serde_json::json!({}));

    let context_info = if let Some(ctx) = &req.context {
        format!(
            "模块: {}\n实体类型: {}",
            ctx.get("module")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown"),
            ctx.get("entityType")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
        )
    } else {
        "通用补全".to_string()
    };

    let fields_to_complete = req.fields_to_complete.clone().unwrap_or_default();
    let fields_str = if fields_to_complete.is_empty() {
        "所有可能需要补全的字段".to_string()
    } else {
        fields_to_complete.join(", ")
    };

    let prompt = format!(
        "你是一个专业的数据补全助手。请根据已有数据推断并补全相关字段。\n\n{}\n\n已有数据:\n{}\n\n需要补全的字段: {}\n\n请以JSON格式返回补全建议，格式为:\n{{\n  \"suggestions\": [\n    {{\n      \"field\": \"字段名\",\n      \"value\": \"建议值\",\n      \"reason\": \"推断原因\",\n      \"confidence\": 0.8\n    }}\n  ]\n}}\n\n请只返回JSON，不要包含其他内容。confidence 表示置信度(0-1)。",
        context_info,
        serde_json::to_string_pretty(&existing_data).unwrap_or_else(|_| "{}".to_string()),
        fields_str
    );

    let suggestions = if config.use_ollama || config.api_key.is_some() {
        tracing::info!("🤖 正在调用 AI 模型进行数据补全...");
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(60),
            call_ai_api(
                client,
                &config.base_url,
                &config.api_key,
                &config.model,
                &prompt,
            ),
        )
        .await
        {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 补全完成");
                let cleaned_response = response.replace("```json", "").replace("```", "");
                let cleaned_response = cleaned_response.trim();

                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(cleaned_response) {
                    let mut result_suggestions: Vec<Suggestion> = Vec::new();

                    if let Some(suggestions_array) =
                        parsed.get("suggestions").and_then(|v| v.as_array())
                    {
                        for suggestion in suggestions_array {
                            result_suggestions.push(Suggestion {
                                field: suggestion
                                    .get("field")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("unknown")
                                    .to_string(),
                                value: suggestion
                                    .get("value")
                                    .cloned()
                                    .unwrap_or(serde_json::json!("")),
                                reason: suggestion
                                    .get("reason")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string(),
                            });
                        }
                    }

                    result_suggestions
                } else {
                    vec![]
                }
            }
            Ok(Err(e)) => {
                tracing::error!("❌ AI 补全失败: {}", e);
                vec![]
            }
            Err(_) => {
                tracing::error!("❌ AI 补全超时");
                vec![]
            }
        }
    } else {
        vec![]
    };

    Json(ApiResponse::success(
        CompleteResponse { suggestions },
        "Success",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/summarize",
    request_body = SummarizeRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn summarize(Json(req): Json<SummarizeRequest>) -> Json<ApiResponse<SummarizeResponse>> {
    let config = match CONFIG.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<SummarizeResponse>::error(
                500,
                "AI service not initialized",
            ))
        }
    };
    let client = match CLIENT.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<SummarizeResponse>::error(
                500,
                "AI client not initialized",
            ))
        }
    };

    let prompt = format!("请为以下内容生成摘要：\n\n{}", req.text);

    let summary = if config.use_ollama || config.api_key.is_some() {
        tracing::info!(
            "🤖 正在调用 AI 模型生成摘要 ({}: {})...",
            config.base_url,
            config.model
        );
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(120),
            call_ai_api(
                client,
                &config.base_url,
                &config.api_key,
                &config.model,
                &prompt,
            ),
        )
        .await
        {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 摘要生成成功");
                response
            }
            Ok(Err(e)) => {
                tracing::warn!("⚠️ AI 摘要生成失败，使用回退响应: {}", e);
                let preview: String = req.text.chars().take(200).collect();
                format!("（AI 摘要暂时不可用，显示文本预览）\n\n{}...", preview)
            }
            Err(_) => {
                tracing::warn!("⚠️ AI 调用超时");
                let preview: String = req.text.chars().take(200).collect();
                format!("（AI 响应超时，显示文本预览）\n\n{}...", preview)
            }
        }
    } else {
        let preview: String = req.text.chars().take(200).collect();
        format!("（AI 功能未配置，显示文本预览）\n\n{}...", preview)
    };

    Json(ApiResponse::success(
        SummarizeResponse { summary },
        "Success",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/ai/templates",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_templates() -> Json<ApiResponse<Vec<AITemplate>>> {
    let templates = vec![
        AITemplate {
            id: "meeting-minutes".to_string(),
            name: "会议纪要".to_string(),
            description: "自动生成专业的会议纪要".to_string(),
            category: "文档".to_string(),
            fields: vec![
                TemplateField {
                    name: "title".to_string(),
                    r#type: "text".to_string(),
                    label: "会议标题".to_string(),
                    required: true,
                    options: None,
                },
                TemplateField {
                    name: "time".to_string(),
                    r#type: "text".to_string(),
                    label: "会议时间".to_string(),
                    required: true,
                    options: None,
                },
            ],
            prompt_template: "请根据以下信息生成会议纪要：".to_string(),
        },
        AITemplate {
            id: "job-description".to_string(),
            name: "职位描述".to_string(),
            description: "生成标准的职位描述".to_string(),
            category: "人力资源".to_string(),
            fields: vec![TemplateField {
                name: "title".to_string(),
                r#type: "text".to_string(),
                label: "职位名称".to_string(),
                required: true,
                options: None,
            }],
            prompt_template: "请生成一个关于该职位的描述：".to_string(),
        },
    ];
    Json(ApiResponse::success(templates, "Success"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/chat",
    request_body = ChatRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn chat(Json(req): Json<ChatRequest>) -> Json<ApiResponse<ChatResponse>> {
    let search_results = vector_search(&req.query, 5).await;

    let context = search_results
        .iter()
        .map(|(vec, _)| format!("- {}: {}", vec.document_id, vec.content))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = if context.is_empty() {
        format!(
            "你是 TOPEMS 智能助手。请回答用户的问题。\n\n用户问题：{}",
            req.query
        )
    } else {
        format!(
            "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。\n\n知识库内容：\n{}\n\n用户问题：{}",
            context, req.query
        )
    };

    let config = match CONFIG.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<ChatResponse>::error(
                500,
                "AI service not initialized",
            ))
        }
    };
    let client = match CLIENT.get() {
        Some(c) => c,
        None => {
            return Json(ApiResponse::<ChatResponse>::error(
                500,
                "AI client not initialized",
            ))
        }
    };

    let answer = if config.use_ollama || config.api_key.is_some() {
        tracing::info!(
            "🤖 正在调用 AI 模型 ({}: {})...",
            config.base_url,
            config.model
        );
        match tokio::time::timeout(
            tokio::time::Duration::from_secs(120),
            call_ai_api(
                client,
                &config.base_url,
                &config.api_key,
                &config.model,
                &prompt,
            ),
        )
        .await
        {
            Ok(Ok(response)) => {
                tracing::info!("✅ AI 响应成功，长度: {} 字符", response.len());
                response
            }
            Ok(Err(e)) => {
                tracing::warn!("⚠️ AI 调用失败，使用回退响应: {}", e);
                format!("抱歉，AI 服务暂时不可用：{}\n\n这是一个回退响应。请检查：\n1. Ollama 服务是否正在运行 (http://localhost:11434)\n2. 配置的模型是否已下载\n3. 网络连接是否正常\n\n如需配置其他 AI 服务，请参考文档。", e)
            }
            Err(_) => {
                tracing::warn!("⚠️ AI 调用超时（超过 120 秒），使用回退响应");
                "抱歉，AI 响应超时了。请稍后重试，或检查：\n1. 模型是否正在加载中\n2. 系统资源是否充足\n3. 网络连接是否稳定".to_string()
            }
        }
    } else {
        tracing::warn!("⚠️ AI API 未配置");
        "欢迎使用 TOPEMS 智能助手！\n\n当前 AI 功能尚未配置。您可以：\n\n1. 使用 Ollama（本地 AI）：\n   - 安装 Ollama: https://ollama.com\n   - 下载模型: ollama pull qwen2.5:7b-instruct\n   - 启动服务: ollama serve\n\n2. 使用云端 AI 服务（OpenAI/通义千问等）：\n   - 设置 OPENAI_API_KEY 环境变量\n   - 可选设置 OPENAI_BASE_URL 和 OPENAI_MODEL\n\n配置完成后即可体验完整的 AI 功能！".to_string()
    };

    let sources: Vec<SearchResult> = search_results
        .into_iter()
        .filter_map(|(vec, similarity)| {
            if let Some(docs_arc) = DOCUMENTS.get() {
                let docs = match docs_arc.lock() {
                    Ok(d) => d,
                    Err(e) => {
                        tracing::error!("Failed to lock documents: {}", e);
                        return None;
                    }
                };
                if let Some(doc) = docs.iter().find(|d| d.id == vec.document_id) {
                    Some(SearchResult {
                        chunk: ChunkInfo {
                            id: vec.id,
                            document_id: vec.document_id,
                            chunk_index: vec.chunk_index,
                            content: vec.content,
                            created_at: vec.created_at,
                            metadata: serde_json::json!({}),
                        },
                        document: doc.clone(),
                        similarity,
                    })
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();

    Json(ApiResponse::success(
        ChatResponse { answer, sources },
        "Success",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/search",
    request_body = AiSearchRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn ai_search(Json(req): Json<AiSearchRequest>) -> Json<ApiResponse<AiSearchResponse>> {
    let start_time = std::time::Instant::now();

    let limit = req.limit.unwrap_or(10);
    let search_results = vector_search(&req.query, limit).await;

    let mut documents: Vec<AiSearchDocument> = Vec::new();

    if let Some(docs_arc) = DOCUMENTS.get() {
        let docs = match docs_arc.lock() {
            Ok(d) => d,
            Err(e) => {
                tracing::error!("Failed to lock documents: {}", e);
                return Json(ApiResponse::<AiSearchResponse>::error(
                    500,
                    "Internal server error",
                ));
            }
        };

        for (vec, _similarity) in search_results {
            if let Some(doc) = docs.iter().find(|d| d.id == vec.document_id) {
                documents.push(AiSearchDocument {
                    id: doc.id,
                    title: doc.title.clone(),
                    content: vec.content.clone(),
                    filename: doc.filename.clone(),
                    path: None,
                    file_path: doc.file_path.clone(),
                    file_size: doc.file_size,
                    mime_type: doc.mime_type.clone(),
                    status: Some(doc.status.clone()),
                    category: doc.category.clone(),
                    tags: doc.tags.clone(),
                    created_at: doc.created_at.clone(),
                    updated_at: doc.updated_at.clone(),
                    description: doc.description.clone(),
                    error_message: doc.error_message.clone(),
                });
            }
        }
    }

    let query_time_ms = start_time.elapsed().as_millis() as u64;
    let total = documents.len();

    Json(ApiResponse::success(
        AiSearchResponse {
            documents,
            total,
            query_time_ms,
        },
        "Success",
    ))
}

async fn call_ai_api(
    client: &Client,
    base_url: &str,
    api_key: &Option<String>,
    model: &str,
    prompt: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let api_url = format!("{}/chat/completions", base_url);

    let request = OpenAIRequest {
        model: model.to_string(),
        messages: vec![OpenAIMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
        temperature: 0.7,
    };

    let mut req_builder = client
        .post(&api_url)
        .header("Content-Type", "application/json");

    if let Some(key) = api_key {
        if key != "ollama" {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", key));
        }
    }

    let response = match req_builder.json(&request).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("无法连接到 AI 服务 ({}): {}", base_url, e);
            return Err(format!("无法连接到 AI 服务: {}", e).into());
        }
    };

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        tracing::error!("AI API 请求失败: {} - {}", status, error_text);
        return Err(format!("AI 服务错误: {} - {}", status, error_text).into());
    }

    let openai_response: OpenAIResponse = match response.json().await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("解析 AI 响应失败: {}", e);
            return Err(format!("解析 AI 响应失败: {}", e).into());
        }
    };

    if let Some(choice) = openai_response.choices.first() {
        Ok(choice.message.content.clone())
    } else {
        Err("AI 未返回有效响应".into())
    }
}

// ========== AI 智能助手 Phase 3 ==========

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/assistant/report",
    request_body = ReportAssistantRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn report_assistant(
    Json(req): Json<ReportAssistantRequest>,
) -> Json<ApiResponse<ReportAssistantResponse>> {
    tracing::info!("🤖 报表助手请求: {}", req.query);

    let data = vec![
        serde_json::json!({"month": "1月", "sales": 12000, "profit": 3000}),
        serde_json::json!({"month": "2月", "sales": 15000, "profit": 4200}),
        serde_json::json!({"month": "3月", "sales": 13500, "profit": 3600}),
        serde_json::json!({"month": "4月", "sales": 18000, "profit": 5100}),
        serde_json::json!({"month": "5月", "sales": 16500, "profit": 4800}),
        serde_json::json!({"month": "6月", "sales": 21000, "profit": 6500}),
    ];

    let response = ReportAssistantResponse {
        query: req.query.clone(),
        chart_type: "line".to_string(),
        title: "销售趋势分析".to_string(),
        description: Some(format!(
            "基于数据源 '{}' 生成的销售趋势报表",
            req.data_source.as_deref().unwrap_or("default")
        )),
        sql: Some(
            "SELECT month, SUM(sales) as sales, SUM(profit) as profit FROM orders GROUP BY month"
                .to_string(),
        ),
        data,
        x_axis: Some("month".to_string()),
        y_axis: Some(serde_json::json!(["sales", "profit"])),
        metrics: Some(vec![
            ReportMetric {
                label: "总销售额".to_string(),
                value: 96000.0,
                unit: Some("元".to_string()),
            },
            ReportMetric {
                label: "平均月增长".to_string(),
                value: 12.5,
                unit: Some("%".to_string()),
            },
        ]),
    };

    Json(ApiResponse::success(response, "Success"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/assistant/flow",
    request_body = FlowAssistantRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn flow_assistant(
    Json(req): Json<FlowAssistantRequest>,
) -> Json<ApiResponse<FlowAssistantResponse>> {
    tracing::info!("🤖 流程助手请求: {}", req.query);

    let response = FlowAssistantResponse {
        query: req.query.clone(),
        title: "标准业务流程".to_string(),
        description: Some("根据您的描述，以下是推荐的标准化流程步骤".to_string()),
        steps: vec![
            FlowStep {
                step: 1,
                name: "提交申请".to_string(),
                description: "申请人填写申请表单并提交相关附件".to_string(),
                responsible: Some("申请人".to_string()),
                estimated_time: Some("1-2 工作日".to_string()),
            },
            FlowStep {
                step: 2,
                name: "部门初审".to_string(),
                description: "直属主管审核申请内容的完整性和合规性".to_string(),
                responsible: Some("部门主管".to_string()),
                estimated_time: Some("1 工作日".to_string()),
            },
            FlowStep {
                step: 3,
                name: "专业复核".to_string(),
                description: "相关职能部门进行专业审核".to_string(),
                responsible: Some("职能部门".to_string()),
                estimated_time: Some("2-3 工作日".to_string()),
            },
            FlowStep {
                step: 4,
                name: "最终审批".to_string(),
                description: "具有审批权限的领导进行最终审批".to_string(),
                responsible: Some("审批领导".to_string()),
                estimated_time: Some("1-2 工作日".to_string()),
            },
            FlowStep {
                step: 5,
                name: "执行归档".to_string(),
                description: "审批通过后执行并归档相关材料".to_string(),
                responsible: Some("执行人".to_string()),
                estimated_time: Some("1 工作日".to_string()),
            },
        ],
        suggestions: Some(vec![
            "建议引入电子签章，缩短审批周期".to_string(),
            "对于低风险流程可设置自动审批规则".to_string(),
        ]),
    };

    Json(ApiResponse::success(response, "Success"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/assistant/anomaly/predict",
    request_body = AnomalyPredictRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn anomaly_predict(
    Json(req): Json<AnomalyPredictRequest>,
) -> Json<ApiResponse<AnomalyPredictResponse>> {
    tracing::info!("🤖 异常预测请求: {}", req.metric);

    let anomalies = vec![
        AnomalyPoint {
            timestamp: "2026-07-18 14:00".to_string(),
            value: 8.5,
            expected: Some(5.2),
            severity: "high".to_string(),
            reason: Some("设备负载突增".to_string()),
        },
        AnomalyPoint {
            timestamp: "2026-07-19 09:30".to_string(),
            value: 6.8,
            expected: Some(5.0),
            severity: "medium".to_string(),
            reason: Some("原材料批次波动".to_string()),
        },
    ];

    let response = AnomalyPredictResponse {
        metric: req.metric.clone(),
        anomaly_count: anomalies.len() as i32,
        summary: format!(
            "指标 '{}' 在未来周期内预测到 {} 处异常，建议关注高负载时段",
            req.metric,
            anomalies.len()
        ),
        anomalies,
        suggestions: Some(vec![
            "建议对高负载设备进行预防性维护".to_string(),
            "加强原材料入库检验".to_string(),
        ]),
    };

    Json(ApiResponse::success(response, "Success"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/assistant/knowledge/ask",
    request_body = KnowledgeAskRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn knowledge_ask(
    Json(req): Json<KnowledgeAskRequest>,
) -> Json<ApiResponse<KnowledgeAskResponse>> {
    tracing::info!("🤖 知识库问答请求: {}", req.question);

    let response = KnowledgeAskResponse {
        question: req.question.clone(),
        answer: "根据企业知识库内容，采购审批需要经过以下步骤：\n\n1. 申请人在系统中提交采购申请\n2. 部门主管审核采购必要性和预算\n3. 财务部门复核预算和供应商资质\n4. 总经理或授权审批人进行最终审批\n5. 审批通过后转采购部门执行".to_string(),
        sources: vec![
            KnowledgeSource {
                title: "采购管理制度 V3.0".to_string(),
                content: Some("采购申请须填写采购申请单，注明采购物品、数量、预算及用途".to_string()),
                relevance: Some(0.95),
            },
            KnowledgeSource {
                title: "审批权限矩阵".to_string(),
                content: Some("单笔金额超过 5 万元的采购须由总经理审批".to_string()),
                relevance: Some(0.87),
            },
        ],
        confidence: 0.92,
        follow_up_questions: Some(vec![
            "采购申请需要准备哪些附件？".to_string(),
            "紧急采购如何加急审批？".to_string(),
        ]),
    };

    Json(ApiResponse::success(response, "Success"))
}
