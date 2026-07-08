use crate::modules::models::{
    AnalysisResult, CategoryScore, ClassifyTextResponse, Entity, ExtractEntitiesResponse,
    ExtractKeywordsResponse, Keyword, SentimentAnalysisResponse,
};
use crate::services::db::Database;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Clone)]
pub struct AnalysisService {
    db: Database,
    http_client: Client,
    config: AnalysisConfig,
}

#[derive(Clone)]
pub struct AnalysisConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
}

impl AnalysisService {
    pub fn new(db: Database, http_client: Client, config: AnalysisConfig) -> Self {
        Self {
            db,
            http_client,
            config,
        }
    }

    /// 情感分析
    pub async fn analyze_sentiment(&self, text: &str) -> Result<SentimentAnalysisResponse, String> {
        let prompt = format!(
            "请分析以下文本的情感倾向。返回 JSON 格式结果：\n\
            {{\n  \"sentiment\": \"positive/negative/neutral\",\n  \"confidence\": 0.0-1.0,\n  \"details\": {{\n    \"positive_words\": [],\n    \"negative_words\": [],\n    \"emotional_intensity\": 0.0-1.0\n  }}\n}}\n\n文本：{}",
            text
        );

        let response = self.call_ai_api(&prompt).await?;
        let cleaned = response.replace("```json", "").replace("```", "");
        let cleaned_response = cleaned.trim();

        let result: serde_json::Value = serde_json::from_str(cleaned_response)
            .map_err(|e| format!("解析情感分析结果失败: {}", e))?;

        // 保存分析结果
        self.save_analysis_result(
            "sentiment",
            text,
            &result,
            result.get("confidence").and_then(|v| v.as_f64()),
        )
        .await?;

        Ok(SentimentAnalysisResponse {
            sentiment: result
                .get("sentiment")
                .and_then(|v| v.as_str())
                .unwrap_or("neutral")
                .to_string(),
            confidence: result
                .get("confidence")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.5),
            details: result.get("details").cloned(),
        })
    }

    /// 文本分类
    pub async fn classify_text(
        &self,
        text: &str,
        categories: Option<&[String]>,
    ) -> Result<ClassifyTextResponse, String> {
        let categories_str = if let Some(cats) = categories {
            cats.join(", ")
        } else {
            "技术、商业、教育、娱乐、新闻、其他".to_string()
        };

        let prompt = format!(
            "请对以下文本进行分类。可选类别：{}\n返回 JSON 格式结果：\n\
            {{\n  \"category\": \"最合适的类别\",\n  \"confidence\": 0.0-1.0,\n  \"all_categories\": [\n    {{\"category\": \"类别名\", \"score\": 0.0-1.0}}\n  ]\n}}\n\n文本：{}",
            categories_str, text
        );

        let response = self.call_ai_api(&prompt).await?;
        let cleaned = response.replace("```json", "").replace("```", "");
        let cleaned_response = cleaned.trim();

        let result: serde_json::Value = serde_json::from_str(cleaned_response)
            .map_err(|e| format!("解析分类结果失败: {}", e))?;

        // 保存分析结果
        self.save_analysis_result(
            "classify",
            text,
            &result,
            result.get("confidence").and_then(|v| v.as_f64()),
        )
        .await?;

        let all_categories: Vec<CategoryScore> = result
            .get("all_categories")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| {
                        Some(CategoryScore {
                            category: item.get("category").and_then(|v| v.as_str())?.to_string(),
                            score: item.get("score").and_then(|v| v.as_f64())?,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(ClassifyTextResponse {
            category: result
                .get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("其他")
                .to_string(),
            confidence: result
                .get("confidence")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.5),
            all_categories: Some(all_categories),
        })
    }

    /// 实体提取
    pub async fn extract_entities(
        &self,
        text: &str,
        entity_types: Option<&[String]>,
    ) -> Result<ExtractEntitiesResponse, String> {
        let entity_types_str = if let Some(types) = entity_types {
            types.join(", ")
        } else {
            "人名、地名、组织、时间、数字、产品、事件".to_string()
        };

        let prompt = format!(
            "请从以下文本中提取实体。实体类型：{}\n返回 JSON 格式结果：\n\
            {{\n  \"entities\": [\n    {{\n      \"text\": \"实体文本\",\n      \"entity_type\": \"实体类型\",\n      \"start_pos\": 开始位置,\n      \"end_pos\": 结束位置,\n      \"confidence\": 0.0-1.0\n    }}\n  ]\n}}\n\n文本：{}",
            entity_types_str, text
        );

        let response = self.call_ai_api(&prompt).await?;
        let cleaned = response.replace("```json", "").replace("```", "");
        let cleaned_response = cleaned.trim();

        let result: serde_json::Value = serde_json::from_str(cleaned_response)
            .map_err(|e| format!("解析实体提取结果失败: {}", e))?;

        // 保存分析结果
        self.save_analysis_result("entities", text, &result, None)
            .await?;

        let entities: Vec<Entity> = result
            .get("entities")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| {
                        Some(Entity {
                            text: item.get("text").and_then(|v| v.as_str())?.to_string(),
                            entity_type: item
                                .get("entity_type")
                                .and_then(|v| v.as_str())?
                                .to_string(),
                            start_pos: item.get("start_pos").and_then(|v| v.as_i64())? as i32,
                            end_pos: item.get("end_pos").and_then(|v| v.as_i64())? as i32,
                            confidence: item.get("confidence").and_then(|v| v.as_f64())?,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(ExtractEntitiesResponse { entities })
    }

    /// 关键词提取
    pub async fn extract_keywords(
        &self,
        text: &str,
        max_keywords: Option<i32>,
    ) -> Result<ExtractKeywordsResponse, String> {
        let max_count = max_keywords.unwrap_or(10);

        let prompt = format!(
            "请从以下文本中提取关键词。最多提取 {} 个关键词。\n返回 JSON 格式结果：\n\
            {{\n  \"keywords\": [\n    {{\n      \"text\": \"关键词\",\n      \"score\": 0.0-1.0,\n      \"frequency\": 出现次数\n    }}\n  ]\n}}\n\n文本：{}",
            max_count, text
        );

        let response = self.call_ai_api(&prompt).await?;
        let cleaned = response.replace("```json", "").replace("```", "");
        let cleaned_response = cleaned.trim();

        let result: serde_json::Value = serde_json::from_str(cleaned_response)
            .map_err(|e| format!("解析关键词提取结果失败: {}", e))?;

        // 保存分析结果
        self.save_analysis_result("keywords", text, &result, None)
            .await?;

        let keywords: Vec<Keyword> = result
            .get("keywords")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| {
                        Some(Keyword {
                            text: item.get("text").and_then(|v| v.as_str())?.to_string(),
                            score: item.get("score").and_then(|v| v.as_f64())?,
                            frequency: item.get("frequency").and_then(|v| v.as_i64())? as i32,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(ExtractKeywordsResponse { keywords })
    }

    /// 获取分析历史
    pub async fn get_analysis_history(
        &self,
        analysis_type: Option<&str>,
        limit: usize,
    ) -> Result<Vec<AnalysisResult>, String> {
        let query = if let Some(type_) = analysis_type {
            sqlx::query(
                r#"
                SELECT id, analysis_type, input_text, result, confidence, created_at
                FROM plugin_ai.analysis_results
                WHERE analysis_type = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(type_)
            .bind(limit as i64)
        } else {
            sqlx::query(
                r#"
                SELECT id, analysis_type, input_text, result, confidence, created_at
                FROM plugin_ai.analysis_results
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit as i64)
        };

        let rows = query
            .fetch_all(self.db.pool())
            .await
            .map_err(|e| format!("查询分析历史失败: {}", e))?;

        let history = rows
            .iter()
            .map(|row| AnalysisResult {
                id: row.get("id"),
                analysis_type: row.get("analysis_type"),
                input_text: row.get("input_text"),
                result: row.get("result"),
                confidence: row.get("confidence"),
                created_at: row.get("created_at"),
            })
            .collect();

        Ok(history)
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
            temperature: 0.3, // 分析任务使用较低的温度
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

    /// 保存分析结果
    async fn save_analysis_result(
        &self,
        analysis_type: &str,
        input_text: &str,
        result: &serde_json::Value,
        confidence: Option<f64>,
    ) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT INTO plugin_ai.analysis_results (analysis_type, input_text, result, confidence)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(analysis_type)
        .bind(input_text)
        .bind(result)
        .bind(confidence)
        .execute(self.db.pool())
        .await
        .map_err(|e| format!("保存分析结果失败: {}", e))?;

        Ok(())
    }
}
