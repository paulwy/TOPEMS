//! AI Service Core Implementation

use crate::modules::ai::models::*;
use reqwest::Client;
use sqlx::{PgPool, Row};
use uuid::Uuid;

/// AI 服务
#[derive(Clone)]
pub struct AIService {
    pool: PgPool,
    http_client: Client,
    pub config: AIConfig,
}

impl AIService {
    /// 创建新的 AI 服务实例
    pub fn new(pool: PgPool, config: AIConfig) -> Self {
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(config.timeout_secs))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            pool,
            http_client,
            config,
        }
    }

    /// 智能对话
    pub async fn chat(&self, query: &str, context: Option<&str>) -> Result<ChatResponse, String> {
        let prompt = if let Some(ctx) = context {
            format!(
                "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。\n\n知识库内容：\n{}\n\n用户问题：{}",
                ctx, query
            )
        } else {
            format!(
                "你是 TOPEMS 智能助手。请回答用户的问题。\n\n用户问题：{}",
                query
            )
        };

        let answer = self.call_ai_api(&prompt).await?;
        let confidence = self.calculate_confidence(&answer);

        // 保存问答历史
        let _ = self.save_qa_history(query, &answer, context).await;

        Ok(ChatResponse {
            answer,
            sources: vec![],
            confidence,
        })
    }

    /// 内容生成
    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        self.call_ai_api(prompt).await
    }

    /// 文本摘要
    pub async fn summarize(&self, text: &str, max_length: Option<i32>) -> Result<String, String> {
        let prompt = if let Some(len) = max_length {
            format!("请为以下内容生成一个不超过 {} 字的摘要：\n\n{}", len, text)
        } else {
            format!("请为以下内容生成摘要：\n\n{}", text)
        };

        self.call_ai_api(&prompt).await
    }

    /// 向量搜索
    pub async fn vector_search(
        &self,
        query_embedding: &[f32],
        top_k: usize,
    ) -> Result<Vec<SearchResult>, sqlx::Error> {
        let embedding_str = format!(
            "[{}]",
            query_embedding
                .iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(",")
        );

        let rows = sqlx::query(
            r#"
            SELECT
                c.document_id,
                c.id AS chunk_id,
                c.content,
                1 - (c.embedding <=> $1::vector) AS similarity,
                d.title AS document_title
            FROM plugin_ai.document_chunks c
            JOIN plugin_ai.documents d ON c.document_id = d.id
            WHERE c.embedding <=> $1::vector < 0.5
            ORDER BY c.embedding <=> $1::vector
            LIMIT $2
            "#,
        )
        .bind(&embedding_str)
        .bind(top_k as i64)
        .fetch_all(&self.pool)
        .await?;

        let results = rows
            .iter()
            .map(|row| SearchResult {
                document_id: row.get("document_id"),
                chunk_id: row.get("chunk_id"),
                content: row.get("content"),
                similarity: row.get("similarity"),
                document_title: row.get("document_title"),
            })
            .collect();

        Ok(results)
    }

    /// 获取向量统计
    pub async fn get_stats(&self) -> Result<VectorStats, sqlx::Error> {
        let doc_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM plugin_ai.documents")
            .fetch_one(&self.pool)
            .await?;

        let chunk_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM plugin_ai.document_chunks")
            .fetch_one(&self.pool)
            .await?;

        let vector_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM plugin_ai.document_chunks WHERE embedding IS NOT NULL",
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(VectorStats {
            total_documents: doc_count as usize,
            total_chunks: chunk_count as usize,
            total_vectors: vector_count as usize,
            vector_dimension: 768,
        })
    }

    /// 清空所有向量数据
    pub async fn clear_all(&self) -> Result<(), sqlx::Error> {
        sqlx::query("TRUNCATE plugin_ai.document_chunks, plugin_ai.documents CASCADE")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 获取 AI 模板列表
    pub fn get_templates() -> Vec<AITemplate> {
        vec![
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
                    },
                    TemplateField {
                        name: "time".to_string(),
                        r#type: "text".to_string(),
                        label: "会议时间".to_string(),
                        required: true,
                    },
                ],
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
                }],
            },
            AITemplate {
                id: "report-summary".to_string(),
                name: "报告摘要".to_string(),
                description: "生成工作报告摘要".to_string(),
                category: "文档".to_string(),
                fields: vec![TemplateField {
                    name: "content".to_string(),
                    r#type: "textarea".to_string(),
                    label: "报告内容".to_string(),
                    required: true,
                }],
            },
        ]
    }

    /// 调用 AI API
    async fn call_ai_api(&self, prompt: &str) -> Result<String, String> {
        #[derive(serde::Serialize)]
        struct OpenAIRequest {
            model: String,
            messages: Vec<OpenAIMessage>,
            temperature: f64,
        }

        #[derive(serde::Serialize, serde::Deserialize)]
        struct OpenAIMessage {
            role: String,
            content: String,
        }

        #[derive(serde::Deserialize)]
        struct OpenAIResponse {
            choices: Vec<OpenAIChoice>,
        }

        #[derive(serde::Deserialize)]
        struct OpenAIChoice {
            message: OpenAIMessage,
        }

        let api_url = format!("{}/chat/completions", self.config.base_url);

        let request = OpenAIRequest {
            model: self.config.model.clone(),
            messages: vec![OpenAIMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            temperature: 0.7,
        };

        let mut req_builder = self
            .http_client
            .post(&api_url)
            .header("Content-Type", "application/json");

        if let Some(key) = &self.config.api_key {
            if key != "ollama" {
                req_builder = req_builder.header("Authorization", format!("Bearer {}", key));
            }
        }

        let response = req_builder
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("调用 AI API 失败: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("AI API 错误: {} - {}", status, error_text));
        }

        let openai_response: OpenAIResponse = response
            .json()
            .await
            .map_err(|e| format!("解析 AI 响应失败: {}", e))?;

        if let Some(choice) = openai_response.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err("AI 未返回有效响应".to_string())
        }
    }

    /// 计算置信度
    fn calculate_confidence(&self, answer: &str) -> f64 {
        let length_score = if answer.len() > 100 {
            0.8
        } else if answer.len() > 50 {
            0.6
        } else {
            0.4
        };

        let uncertainty_phrases = ["不知道", "不确定", "无法", "抱歉", "没有找到"];
        let has_uncertainty = uncertainty_phrases
            .iter()
            .any(|phrase| answer.contains(phrase));

        if has_uncertainty {
            length_score * 0.5
        } else {
            length_score
        }
    }

    /// 保存问答历史
    async fn save_qa_history(
        &self,
        question: &str,
        answer: &str,
        context: Option<&str>,
    ) -> Result<Uuid, sqlx::Error> {
        let id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO plugin_ai.qa_history (question, answer, context)
            VALUES ($1, $2, $3)
            RETURNING id
            "#,
        )
        .bind(question)
        .bind(answer)
        .bind(context)
        .fetch_one(&self.pool)
        .await?;

        Ok(id)
    }
}
