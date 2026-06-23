use crate::api::models::{QAHistory, SearchResult};
use crate::services::db::Database;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Clone)]
pub struct QAService {
    db: Database,
    http_client: Client,
    config: QAConfig,
}

#[derive(Clone)]
pub struct QAConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    #[allow(dead_code)]
    pub embedding_model: String,
}

/// 问题分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QuestionType {
    /// 事实性问题
    Factual,
    /// 过程性问题（如何做）
    Procedural,
    /// 分析性问题
    Analytical,
    /// 建议性问题
    Advisory,
    /// 确认性问题
    Confirmation,
    /// 未知类型
    Unknown,
}

/// 回答结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuredAnswer {
    pub answer: String,
    pub question_type: QuestionType,
    pub confidence: f64,
    pub sources: Vec<String>,
    pub follow_up_questions: Vec<String>,
}

/// 问题分类提示词
const QUESTION_CLASSIFICATION_PROMPT: &str = r#"
请将以下问题分类为：
- Factual: 事实性问题，寻求具体事实信息
- Procedural: 过程性问题，询问如何做某事
- Analytical: 分析性问题，需要分析或评估
- Advisory: 建议性问题，寻求建议或意见
- Confirmation: 确认性问题，确认信息是否正确

只返回分类结果，不需要额外解释。

问题：
"#;

impl QAService {
    pub fn new(db: Database, http_client: Client, config: QAConfig) -> Self {
        Self {
            db,
            http_client,
            config,
        }
    }

    /// 提问并获取答案
    pub async fn ask(
        &self,
        question: &str,
        context: Option<&str>,
        _top_k: usize,
    ) -> Result<(String, Vec<SearchResult>, Uuid, f64), String> {
        // 构建提示词
        let prompt = if let Some(ctx) = context {
            format!(
                "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。\n\n知识库内容：\n{}\n\n用户问题：{}",
                ctx, question
            )
        } else {
            format!(
                "你是 TOPEMS 智能助手。请回答用户的问题。\n\n用户问题：{}",
                question
            )
        };

        // 调用 AI API
        let answer = self.call_ai_api(&prompt).await?;

        // 计算置信度（基于答案长度和内容质量）
        let confidence = self.calculate_confidence(&answer);

        // 保存问答历史
        let qa_id = self
            .save_qa_history(
                question,
                &answer,
                context.map(|c| serde_json::json!({ "context": c })),
                None,
            )
            .await?;

        Ok((answer, vec![], qa_id, confidence))
    }

    /// 基于文档上下文提问
    pub async fn ask_with_context(
        &self,
        question: &str,
        document_ids: &[Uuid],
        context_chunks: &[SearchResult],
    ) -> Result<(String, Vec<SearchResult>, Uuid, f64), String> {
        // 构建上下文
        let context = context_chunks
            .iter()
            .map(|chunk| {
                format!(
                    "【文档：{}】\n{}",
                    chunk
                        .document_title
                        .as_ref()
                        .unwrap_or(&"未知文档".to_string()),
                    chunk.content
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        let prompt = format!(
            "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。如果知识库中没有相关信息，请明确说明。\n\n知识库内容：\n{}\n\n用户问题：{}",
            context, question
        );

        // 调用 AI API
        let answer = self.call_ai_api(&prompt).await?;

        // 计算置信度
        let confidence = self.calculate_confidence(&answer);

        // 保存问答历史
        let qa_id = self
            .save_qa_history(
                question,
                &answer,
                Some(serde_json::json!({ "document_ids": document_ids })),
                Some(context_chunks),
            )
            .await?;

        Ok((answer, context_chunks.to_vec(), qa_id, confidence))
    }

    /// 获取问答历史
    pub async fn get_qa_history(&self, limit: usize) -> Result<Vec<QAHistory>, String> {
        let rows = sqlx::query(
            r#"
            SELECT id, question, answer, context, sources, feedback, rating, created_at
            FROM plugin_ai.qa_history
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit as i64)
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| format!("查询问答历史失败: {}", e))?;

        let history = rows
            .iter()
            .map(|row| {
                let sources_value: Option<serde_json::Value> = row.try_get("sources").ok();
                let sources = sources_value.and_then(|v| serde_json::from_value(v).ok());
                QAHistory {
                    id: row.get("id"),
                    question: row.get("question"),
                    answer: row.get("answer"),
                    context: row.get("context"),
                    sources,
                    feedback: row.get("feedback"),
                    rating: row.get("rating"),
                    created_at: row.get("created_at"),
                }
            })
            .collect();

        Ok(history)
    }

    /// 提交答案反馈
    pub async fn submit_feedback(
        &self,
        qa_id: Uuid,
        feedback: &str,
        rating: Option<i32>,
    ) -> Result<(), String> {
        sqlx::query(
            r#"
            UPDATE plugin_ai.qa_history
            SET feedback = $1, rating = $2
            WHERE id = $3
            "#,
        )
        .bind(feedback)
        .bind(rating)
        .bind(qa_id)
        .execute(self.db.pool())
        .await
        .map_err(|e| format!("更新反馈失败: {}", e))?;

        Ok(())
    }

    /// 调用 AI API
    async fn call_ai_api(&self, prompt: &str) -> Result<String, String> {
        let api_url = format!("{}/chat/completions", self.config.base_url);

        #[derive(Serialize)]
        struct OpenAIRequest {
            model: String,
            messages: Vec<OpenAIMessage>,
            temperature: f64,
        }

        #[derive(Serialize, Deserialize)]
        struct OpenAIMessage {
            role: String,
            content: String,
        }

        #[derive(Deserialize)]
        struct OpenAIResponse {
            choices: Vec<OpenAIChoice>,
        }

        #[derive(Deserialize)]
        struct OpenAIChoice {
            message: OpenAIMessage,
        }

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
        // 基于答案长度和内容质量计算置信度
        let length_score = if answer.len() > 100 {
            0.8
        } else if answer.len() > 50 {
            0.6
        } else {
            0.4
        };

        // 检查是否包含不确定的表达
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

    /// 分类问题类型
    pub async fn classify_question(&self, question: &str) -> Result<QuestionType, String> {
        let prompt = format!("{}{}", QUESTION_CLASSIFICATION_PROMPT, question);
        let response = self.call_ai_api(&prompt).await?;
        
        let result = match response.trim().to_lowercase().as_str() {
            "factual" => QuestionType::Factual,
            "procedural" => QuestionType::Procedural,
            "analytical" => QuestionType::Analytical,
            "advisory" => QuestionType::Advisory,
            "confirmation" => QuestionType::Confirmation,
            _ => QuestionType::Unknown,
        };

        Ok(result)
    }

    /// 生成结构化回答
    pub async fn ask_structured(
        &self,
        question: &str,
        context_chunks: &[SearchResult],
    ) -> Result<StructuredAnswer, String> {
        // 分类问题类型
        let question_type = self.classify_question(question).await?;

        // 构建上下文
        let context = context_chunks
            .iter()
            .map(|chunk| {
                format!(
                    "【文档：{}】\n{}",
                    chunk
                        .document_title
                        .as_ref()
                        .unwrap_or(&"未知文档".to_string()),
                    chunk.content
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        // 根据问题类型构建不同的提示词
        let (prompt, include_follow_up) = match question_type {
            QuestionType::Factual => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容准确回答用户的事实性问题。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请给出准确、简洁的答案。",
                    context, question
                ),
                false,
            ),
            QuestionType::Procedural => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容，详细说明完成任务的步骤。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请按步骤详细说明操作流程。",
                    context, question
                ),
                true,
            ),
            QuestionType::Analytical => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容进行分析并给出见解。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请提供深入的分析和见解。",
                    context, question
                ),
                true,
            ),
            QuestionType::Advisory => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容提供建议。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请提供具体的建议和方案。",
                    context, question
                ),
                true,
            ),
            QuestionType::Confirmation => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容确认信息是否正确。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请明确回答是或否，并简要说明原因。",
                    context, question
                ),
                false,
            ),
            QuestionType::Unknown => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。\n\n知识库内容：\n{}\n\n用户问题：{}",
                    context, question
                ),
                true,
            ),
        };

        // 调用 AI API 获取回答
        let answer = self.call_ai_api(&prompt).await?;

        // 计算置信度
        let confidence = self.calculate_confidence(&answer);

        // 提取来源
        let sources: Vec<String> = context_chunks
            .iter()
            .filter_map(|chunk| chunk.document_title.clone())
            .collect();

        // 生成后续问题（如果需要）
        let follow_up_questions = if include_follow_up && confidence > 0.5 {
            self.generate_follow_up_questions(question, &answer).await.unwrap_or_default()
        } else {
            Vec::new()
        };

        Ok(StructuredAnswer {
            answer,
            question_type,
            confidence,
            sources,
            follow_up_questions,
        })
    }

    /// 生成后续问题建议
    async fn generate_follow_up_questions(&self, question: &str, answer: &str) -> Result<Vec<String>, String> {
        let prompt = format!(
            r#"
根据以下对话内容，生成3个相关的后续问题，帮助用户深入了解主题。

问题：{}

回答：{}

请生成3个后续问题，每个问题用数字编号。
            "#,
            question, answer
        );

        let response = self.call_ai_api(&prompt).await?;

        // 解析后续问题
        let questions: Vec<String> = response
            .lines()
            .filter(|line| !line.trim().is_empty())
            .filter_map(|line| {
                let trimmed = line.trim();
                if trimmed.starts_with(|c: char| c.is_ascii_digit()) {
                    Some(trimmed.split_once('.').map(|(_, rest)| rest.trim().to_string()).unwrap_or(trimmed.to_string()))
                } else {
                    None
                }
            })
            .collect();

        Ok(questions)
    }

    /// 增强版问答，支持多轮对话上下文
    pub async fn ask_with_conversation(
        &self,
        question: &str,
        history: &[(String, String)],
        context_chunks: &[SearchResult],
    ) -> Result<(String, Vec<SearchResult>, Uuid, f64), String> {
        // 构建对话历史
        let history_str: String = history
            .iter()
            .map(|(q, a)| format!("用户：{}\n助手：{}", q, a))
            .collect::<Vec<_>>()
            .join("\n\n");

        // 构建上下文
        let context = context_chunks
            .iter()
            .map(|chunk| {
                format!(
                    "【文档：{}】\n{}",
                    chunk
                        .document_title
                        .as_ref()
                        .unwrap_or(&"未知文档".to_string()),
                    chunk.content
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n");

        let prompt = format!(
            r#"
你是 TOPEMS 智能助手。请根据以下知识库内容和对话历史回答用户的问题。

知识库内容：
{}

对话历史：
{}

当前问题：{}

请基于知识库和对话历史给出准确的回答。
            "#,
            context, history_str, question
        );

        // 调用 AI API
        let answer = self.call_ai_api(&prompt).await?;

        // 计算置信度
        let confidence = self.calculate_confidence(&answer);

        // 保存问答历史
        let qa_id = self
            .save_qa_history(
                question,
                &answer,
                Some(serde_json::json!({ 
                    "context": context,
                    "history_length": history.len() 
                })),
                Some(context_chunks),
            )
            .await?;

        Ok((answer, context_chunks.to_vec(), qa_id, confidence))
    }

    /// 保存问答历史
    async fn save_qa_history(
        &self,
        question: &str,
        answer: &str,
        context: Option<serde_json::Value>,
        sources: Option<&[SearchResult]>,
    ) -> Result<Uuid, String> {
        let id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO plugin_ai.qa_history (question, answer, context, sources)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind(question)
        .bind(answer)
        .bind(context)
        .bind(sources.map(|s| serde_json::to_value(s).unwrap_or(serde_json::json!([]))))
        .fetch_one(self.db.pool())
        .await
        .map_err(|e| format!("保存问答历史失败: {}", e))?;

        Ok(id)
    }
}
