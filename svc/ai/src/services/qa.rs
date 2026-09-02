#![allow(dead_code)]

use crate::modules::models::{QAHistory, SearchResult};
use crate::services::db::Database;
use serde::{Deserialize, Serialize};
use sqlx::{Executor, Row};
use topems_shared_ai::ai_client::{
    create_client, AIModelConfig, AIProviderType, ChatMessage, UnifiedAIClient,
};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

#[derive(Clone)]
pub struct QAService {
    db: Database,
    ai_client: UnifiedAIClient,
    embedding_client: UnifiedAIClient,
}

#[derive(Clone)]
pub struct QAConfig {
    pub chat_model: AIModelConfig,
    pub embedding_model: AIModelConfig,
}

/// 问题分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QuestionType {
    /// 事实性问题 - 寻求具体事实信息
    Factual,
    /// 过程性问题 - 询问如何做某事
    Procedural,
    /// 分析性问题 - 需要分析或评估
    Analytical,
    /// 建议性问题 - 寻求建议或意见
    Advisory,
    /// 确认性问题 - 确认信息是否正确
    Confirmation,
    /// 比较性问题 - 比较两个或多个事物
    Comparative,
    /// 预测性问题 - 预测未来趋势或结果
    Predictive,
    /// 诊断性问题 - 诊断问题或故障原因
    Diagnostic,
    /// 定义性问题 - 询问定义或概念解释
    Definition,
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
- Factual: 事实性问题，寻求具体事实信息（如：仓库地址、订单数量、产品规格）
- Procedural: 过程性问题，询问如何做某事（如：如何创建订单、如何进行入库操作）
- Analytical: 分析性问题，需要分析或评估（如：库存趋势分析、成本效益评估）
- Advisory: 建议性问题，寻求建议或意见（如：推荐哪种产品、如何优化流程）
- Confirmation: 确认性问题，确认信息是否正确（如：订单是否已发货、库存是否充足）
- Comparative: 比较性问题，比较两个或多个事物（如：A产品和B产品的区别、不同仓库的对比）
- Predictive: 预测性问题，预测未来趋势或结果（如：下个月库存预测、需求趋势）
- Diagnostic: 诊断性问题，诊断问题或故障原因（如：为什么入库失败、库存差异原因）
- Definition: 定义性问题，询问定义或概念解释（如：什么是安全库存、ABC分类是什么）

只返回分类结果，不需要额外解释。

问题：
"#;

/// 问题意图识别提示词
const INTENT_RECOGNITION_PROMPT: &str = r#"
请分析以下问题的意图，并返回意图类型和关键实体。

意图类型包括：
- INFORMATION: 信息查询
- TRANSACTION: 业务操作请求
- TROUBLESHOOTING: 问题排查
- REPORTING: 数据报告
- CONFIGURATION: 系统配置
- OTHER: 其他

关键实体：从问题中提取的关键名词（如客户名称、订单号、产品名称等），用逗号分隔。

请以 JSON 格式返回：
{
  "intent": "意图类型",
  "entities": ["实体1", "实体2"]
}

问题：
"#;

/// 答案质量评估提示词
const ANSWER_QUALITY_PROMPT: &str = r#"
请评估以下回答的质量，基于以下标准：

评分标准（1-5分）：
1分：完全错误或无关
2分：部分正确但有重大遗漏
3分：基本正确但不够完整
4分：正确且比较完整
5分：完全正确且完整

请只返回分数。

问题：{}
回答：{}
"#;

impl QAService {
    pub fn new(db: Database, config: QAConfig) -> Self {
        let ai_client = create_client(config.chat_model);
        let embedding_client = create_client(config.embedding_model);
        Self {
            db,
            ai_client,
            embedding_client,
        }
    }

    /// 创建默认配置的 QAService
    /// 默认使用本地 Ollama 上的 qwen2.5-coder:7b-dev（见 scripts/dev/Modelfile.coder-7b）
    pub fn new_with_defaults(db: Database) -> Self {
        let chat_config = AIModelConfig {
            provider: AIProviderType::Ollama,
            model_name: "qwen2.5-coder:7b-dev".to_string(),
            base_url: "http://localhost:11434/v1".to_string(),
            temperature: Some(0.3),
            max_tokens: Some(2048),
            ..Default::default()
        };

        let embedding_config = AIModelConfig {
            provider: AIProviderType::Ollama,
            model_name: "nomic-embed-text".to_string(),
            base_url: "http://localhost:11434/api".to_string(),
            ..Default::default()
        };

        let ai_client = create_client(chat_config);
        let embedding_client = create_client(embedding_config);

        Self {
            db,
            ai_client,
            embedding_client,
        }
    }

    /// 提问并获取答案
    pub async fn ask(
        &self,
        question: &str,
        context: Option<&str>,
        _top_k: usize,
        tenant_id: Uuid,
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
                tenant_id,
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
        tenant_id: Uuid,
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
                tenant_id,
            )
            .await?;

        Ok((answer, context_chunks.to_vec(), qa_id, confidence))
    }

    /// 获取问答历史（支持分页）
    pub async fn get_qa_history(
        &self,
        limit: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<QAHistory>, String> {
        self.get_qa_history_paged(0, limit, tenant_id).await
    }

    /// 获取问答历史（分页版本）
    pub async fn get_qa_history_paged(
        &self,
        offset: usize,
        limit: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<QAHistory>, String> {
        let rows = sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            SELECT id, tenant_id, question, answer, context, sources, feedback, rating, created_at
            FROM ai.qa_history
            WHERE deleted_at IS NULL AND tenant_id = $3
            ORDER BY created_at DESC
            OFFSET $1 LIMIT $2
            "#,
            "plugin_ai"
        ))
        .bind(offset as i64)
        .bind(limit as i64)
        .bind(tenant_id)
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
                    tenant_id: row.get("tenant_id"),
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

    /// 获取问答历史总数
    pub async fn get_qa_history_count(&self, tenant_id: Uuid) -> Result<i64, String> {
        let count: i64 = sqlx::query_scalar(only_own_schema_query!(
            "ai",
            r#"
            SELECT COUNT(*) FROM ai.qa_history WHERE deleted_at IS NULL AND tenant_id = $1
            "#,
            "plugin_ai"
        ))
        .bind(tenant_id)
        .fetch_one(self.db.pool())
        .await
        .map_err(|e| format!("查询问答历史总数失败: {}", e))?;

        Ok(count)
    }

    /// 搜索问答历史
    pub async fn search_qa_history(
        &self,
        query: &str,
        offset: usize,
        limit: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<QAHistory>, String> {
        let rows = sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            SELECT id, tenant_id, question, answer, context, sources, feedback, rating, created_at
            FROM ai.qa_history
            WHERE deleted_at IS NULL AND tenant_id = $4
              AND (question ILIKE $1 OR answer ILIKE $1)
            ORDER BY created_at DESC
            OFFSET $2 LIMIT $3
            "#,
            "plugin_ai"
        ))
        .bind(format!("%{}%", query))
        .bind(offset as i64)
        .bind(limit as i64)
        .bind(tenant_id)
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| format!("搜索问答历史失败: {}", e))?;

        let history = rows
            .iter()
            .map(|row| {
                let sources_value: Option<serde_json::Value> = row.try_get("sources").ok();
                let sources = sources_value.and_then(|v| serde_json::from_value(v).ok());
                QAHistory {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
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

    /// 搜索问答历史总数
    pub async fn search_qa_history_count(
        &self,
        query: &str,
        tenant_id: Uuid,
    ) -> Result<i64, String> {
        let count: i64 = sqlx::query_scalar(only_own_schema_query!(
            "ai",
            r#"
            SELECT COUNT(*) FROM ai.qa_history 
            WHERE deleted_at IS NULL AND tenant_id = $2
              AND (question ILIKE $1 OR answer ILIKE $1)
            "#,
            "plugin_ai"
        ))
        .bind(format!("%{}%", query))
        .bind(tenant_id)
        .fetch_one(self.db.pool())
        .await
        .map_err(|e| format!("搜索问答历史总数失败: {}", e))?;

        Ok(count)
    }

    /// 删除问答历史（软删除）
    pub async fn delete_qa_history(&self, qa_id: Uuid, tenant_id: Uuid) -> Result<bool, String> {
        let result = sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            UPDATE ai.qa_history
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL AND tenant_id = $2
            "#,
            "plugin_ai"
        ))
        .bind(qa_id)
        .bind(tenant_id)
        .execute(self.db.pool())
        .await
        .map_err(|e| format!("删除问答历史失败: {}", e))?;

        Ok(result.rows_affected() > 0)
    }

    /// 批量删除问答历史
    pub async fn batch_delete_qa_history(
        &self,
        qa_ids: &[Uuid],
        tenant_id: Uuid,
    ) -> Result<i64, String> {
        let result = sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            UPDATE ai.qa_history
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = ANY($1) AND deleted_at IS NULL AND tenant_id = $2
            "#,
            "plugin_ai"
        ))
        .bind(qa_ids)
        .bind(tenant_id)
        .execute(self.db.pool())
        .await
        .map_err(|e| format!("批量删除问答历史失败: {}", e))?;

        Ok(result.rows_affected() as i64)
    }

    /// 提交答案反馈
    pub async fn submit_feedback(
        &self,
        qa_id: Uuid,
        feedback: &str,
        rating: Option<i32>,
        tenant_id: Uuid,
    ) -> Result<(), String> {
        sqlx::query(only_own_schema_query!(
            "ai",
            r#"
            UPDATE ai.qa_history
            SET feedback = $1, rating = $2
            WHERE id = $3 AND tenant_id = $4
            "#,
            "plugin_ai"
        ))
        .bind(feedback)
        .bind(rating)
        .bind(qa_id)
        .bind(tenant_id)
        .execute(self.db.pool())
        .await
        .map_err(|e| format!("更新反馈失败: {}", e))?;

        Ok(())
    }

    /// 调用 AI API（使用统一客户端）
    async fn call_ai_api(&self, prompt: &str) -> Result<String, String> {
        let messages = vec![ChatMessage::user(prompt)];
        self.ai_client
            .chat(messages)
            .await
            .map_err(|e| format!("调用 AI API 失败: {}", e))
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
            "comparative" => QuestionType::Comparative,
            "predictive" => QuestionType::Predictive,
            "diagnostic" => QuestionType::Diagnostic,
            "definition" => QuestionType::Definition,
            _ => QuestionType::Unknown,
        };

        Ok(result)
    }

    /// 生成结构化回答
    pub async fn ask_structured(
        &self,
        question: &str,
        context_chunks: &[SearchResult],
        _tenant_id: Uuid,
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
            QuestionType::Comparative => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容比较两个或多个事物。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请从多个维度进行对比分析，清晰列出相同点和不同点。",
                    context, question
                ),
                true,
            ),
            QuestionType::Predictive => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容预测未来趋势或结果。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请基于历史数据和趋势，给出合理的预测和分析。",
                    context, question
                ),
                true,
            ),
            QuestionType::Diagnostic => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容诊断问题或故障原因。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请分析可能的原因，并提供排查步骤和解决方案。",
                    context, question
                ),
                true,
            ),
            QuestionType::Definition => (
                format!(
                    "你是 TOPEMS 智能助手。请根据以下知识库内容解释定义或概念。\n\n知识库内容：\n{}\n\n用户问题：{}\n\n请给出清晰、准确的定义，并提供相关示例。",
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
            self.generate_follow_up_questions(question, &answer)
                .await
                .unwrap_or_default()
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
    async fn generate_follow_up_questions(
        &self,
        question: &str,
        answer: &str,
    ) -> Result<Vec<String>, String> {
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
                    Some(
                        trimmed
                            .split_once('.')
                            .map(|(_, rest)| rest.trim().to_string())
                            .unwrap_or(trimmed.to_string()),
                    )
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
        tenant_id: Uuid,
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
                tenant_id,
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
        tenant_id: Uuid,
    ) -> Result<Uuid, String> {
        let id: Uuid = sqlx::query_scalar(only_own_schema_query!(
            "ai",
            r#"
            INSERT INTO ai.qa_history (tenant_id, question, answer, context, sources)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            "#,
            "plugin_ai"
        ))
        .bind(tenant_id)
        .bind(question)
        .bind(answer)
        .bind(context)
        .bind(sources.map(|s| serde_json::to_value(s).unwrap_or(serde_json::json!([]))))
        .fetch_one(self.db.pool())
        .await
        .map_err(|e| format!("保存问答历史失败: {}", e))?;

        Ok(id)
    }

    /// 意图识别
    pub async fn recognize_intent(&self, question: &str) -> Result<IntentResult, String> {
        let prompt = format!("{}{}", INTENT_RECOGNITION_PROMPT, question);
        let response = self.call_ai_api(&prompt).await?;

        let result: IntentResult = serde_json::from_str(&response).map_err(|e| {
            tracing::warn!("解析意图识别响应失败: {}, 响应: {}", e, response);
            format!("解析意图识别响应失败: {}", e)
        })?;

        Ok(result)
    }

    /// 评估答案质量
    pub async fn evaluate_answer_quality(
        &self,
        question: &str,
        answer: &str,
    ) -> Result<i32, String> {
        let prompt = ANSWER_QUALITY_PROMPT
            .replace("{}", question)
            .replace("{}", answer);
        let response = self.call_ai_api(&prompt).await?;

        let score = response.trim().parse::<i32>().map_err(|e| {
            tracing::warn!("解析答案质量评分失败: {}, 响应: {}", e, response);
            format!("解析答案质量评分失败: {}", e)
        })?;

        Ok(score)
    }

    /// 增强版知识检索 - 结合关键词和语义搜索
    pub async fn enhanced_search(
        &self,
        query: &str,
        top_k: usize,
        context_chunks: &[SearchResult],
    ) -> Result<Vec<SearchResult>, String> {
        let intent_result = self.recognize_intent(query).await?;

        let mut enhanced_results = context_chunks.to_vec();

        if !intent_result.entities.is_empty() {
            let _entities_query = intent_result.entities.join(" OR ");
            enhanced_results.retain(|chunk| {
                chunk.content.to_lowercase().contains(&query.to_lowercase())
                    || intent_result.entities.iter().any(|entity| {
                        chunk
                            .content
                            .to_lowercase()
                            .contains(&entity.to_lowercase())
                    })
            });
        }

        enhanced_results.sort_by(|a, b| {
            b.similarity
                .partial_cmp(&a.similarity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(enhanced_results.into_iter().take(top_k).collect())
    }

    /// 语义搜索 - 基于查询文本生成嵌入并搜索
    pub async fn semantic_search(
        &self,
        query: &str,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<SearchResult>, String> {
        let query_embedding = self.generate_query_embedding(query).await?;

        if query_embedding.is_empty() {
            return Ok(Vec::new());
        }

        let results = self
            .db
            .pool()
            .fetch_all(
                sqlx::query(only_own_schema_query!(
                    "ai",
                    r#"
                    SELECT
                        c.document_id,
                        c.id AS chunk_id,
                        c.content,
                        1 - (c.embedding <=> $1::vector) AS similarity,
                        d.title AS document_title
                    FROM ai.document_chunks c
                    JOIN ai.documents d ON c.document_id = d.id
                    WHERE c.embedding IS NOT NULL AND d.tenant_id = $3
                    ORDER BY c.embedding <=> $1::vector
                    LIMIT $2
                    "#,
                    "plugin_ai"
                ))
                .bind(format!(
                    "[{}]",
                    query_embedding
                        .iter()
                        .map(|v| v.to_string())
                        .collect::<Vec<_>>()
                        .join(",")
                ))
                .bind(top_k as i64)
                .bind(tenant_id),
            )
            .await
            .map_err(|e| format!("语义搜索失败: {}", e))?;

        let search_results = results
            .iter()
            .map(|row| SearchResult {
                document_id: row.get("document_id"),
                chunk_id: row.get("chunk_id"),
                content: row.get("content"),
                similarity: row.get("similarity"),
                document_title: row.get("document_title"),
            })
            .collect();

        Ok(search_results)
    }

    /// 混合检索 - 结合向量搜索和关键词搜索
    pub async fn hybrid_search(
        &self,
        query: &str,
        top_k: usize,
        vector_weight: f64,
        keyword_weight: f64,
        tenant_id: Uuid,
    ) -> Result<Vec<SearchResult>, String> {
        let vector_results = self.semantic_search(query, top_k * 2, tenant_id).await?;

        let keyword_results = self
            .db
            .pool()
            .fetch_all(
                sqlx::query(only_own_schema_query!(
                    "ai",
                    r#"
                    SELECT
                        c.document_id,
                        c.id AS chunk_id,
                        c.content,
                        ts_rank_cd(to_tsvector('simple', c.content), query) AS keyword_score,
                        d.title AS document_title
                    FROM ai.document_chunks c
                    JOIN ai.documents d ON c.document_id = d.id,
                         to_tsquery('simple', $1) query
                    WHERE to_tsvector('simple', c.content) @@ query
                    ORDER BY keyword_score DESC
                    LIMIT $2
                    "#,
                    "plugin_ai"
                ))
                .bind(query)
                .bind((top_k * 2) as i64),
            )
            .await
            .map_err(|e| format!("关键词搜索失败: {}", e))?;

        let mut combined_map: std::collections::HashMap<uuid::Uuid, SearchResult> =
            std::collections::HashMap::new();

        for result in vector_results {
            let entry = combined_map
                .entry(result.chunk_id)
                .or_insert(result.clone());
            entry.similarity = result.similarity;
        }

        for row in keyword_results.iter() {
            let chunk_id: uuid::Uuid = row.get("chunk_id");
            let score: f32 = row.get("keyword_score");
            let entry = combined_map.entry(chunk_id).or_insert(SearchResult {
                document_id: row.get("document_id"),
                chunk_id,
                content: row.get("content"),
                similarity: score as f64 * keyword_weight,
                document_title: row.get("document_title"),
            });
            entry.similarity = entry.similarity * vector_weight + (score as f64) * keyword_weight;
        }

        let mut results: Vec<_> = combined_map.values().cloned().collect();
        results.sort_by(|a, b| {
            b.similarity
                .partial_cmp(&a.similarity)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        Ok(results.into_iter().take(top_k).collect())
    }

    /// 生成查询向量嵌入（使用统一客户端）
    async fn generate_query_embedding(&self, query: &str) -> Result<Vec<f32>, String> {
        self.embedding_client
            .embed(query)
            .await
            .map_err(|e| format!("生成嵌入失败: {}", e))
    }

    /// 多轮对话优化 - 检测问题是否需要上下文
    pub fn needs_context(&self, question: &str) -> bool {
        let context_indicators = [
            "上次",
            "之前",
            "刚才",
            "继续",
            "接着",
            "之前说的",
            "刚才提到",
        ];
        context_indicators
            .iter()
            .any(|indicator| question.contains(indicator))
    }

    /// 生成答案的置信区间
    pub fn calculate_confidence_interval(&self, confidence: f64) -> (f64, f64) {
        let margin = 0.1 * (1.0 - confidence);
        (
            (confidence - margin).max(0.0),
            (confidence + margin).min(1.0),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentResult {
    pub intent: String,
    pub entities: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── QuestionType ──

    #[test]
    fn test_question_type_serde_all_variants() {
        let variants = vec![
            QuestionType::Factual,
            QuestionType::Procedural,
            QuestionType::Analytical,
            QuestionType::Advisory,
            QuestionType::Confirmation,
            QuestionType::Comparative,
            QuestionType::Predictive,
            QuestionType::Diagnostic,
            QuestionType::Definition,
            QuestionType::Unknown,
        ];
        for v in &variants {
            let json = serde_json::to_string(v).unwrap();
            let back: QuestionType = serde_json::from_str(&json).unwrap();
            assert_eq!(format!("{:?}", back), format!("{:?}", v));
        }
    }

    #[test]
    fn test_question_type_clone_debug() {
        let qt = QuestionType::Factual;
        let cloned = qt.clone();
        let debug_str = format!("{:?}", qt);
        assert!(debug_str.contains("Factual"));
        assert_eq!(format!("{:?}", cloned), format!("{:?}", qt));
    }

    // ── StructuredAnswer ──

    #[test]
    fn test_structured_answer_serde_roundtrip() {
        let sa = StructuredAnswer {
            answer: "答案是…".into(),
            question_type: QuestionType::Factual,
            confidence: 0.85,
            sources: vec!["doc1".into(), "doc2".into()],
            follow_up_questions: vec!["后续问题1".into()],
        };
        let json = serde_json::to_string(&sa).unwrap();
        let back: StructuredAnswer = serde_json::from_str(&json).unwrap();
        assert_eq!(back.answer, "答案是…");
        assert_eq!(back.sources.len(), 2);
        assert_eq!(back.follow_up_questions.len(), 1);
    }

    #[test]
    fn test_structured_answer_empty_collections() {
        let sa = StructuredAnswer {
            answer: "n/a".into(),
            question_type: QuestionType::Unknown,
            confidence: 0.0,
            sources: vec![],
            follow_up_questions: vec![],
        };
        let json = serde_json::to_string(&sa).unwrap();
        let back: StructuredAnswer = serde_json::from_str(&json).unwrap();
        assert!(back.sources.is_empty());
        assert!(back.follow_up_questions.is_empty());
    }

    // ── IntentResult ──

    #[test]
    fn test_intent_result_serde_roundtrip() {
        let ir = IntentResult {
            intent: "查询订单".into(),
            entities: vec!["订单号".into(), "日期".into()],
        };
        let json = serde_json::to_string(&ir).unwrap();
        let back: IntentResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.intent, "查询订单");
        assert_eq!(back.entities.len(), 2);
    }

    #[test]
    fn test_intent_result_empty_entities() {
        let ir = IntentResult {
            intent: "unknown".into(),
            entities: vec![],
        };
        let json = serde_json::to_string(&ir).unwrap();
        let back: IntentResult = serde_json::from_str(&json).unwrap();
        assert!(back.entities.is_empty());
    }
}
