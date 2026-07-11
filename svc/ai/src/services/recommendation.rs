use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::{db::Database, qa::QAService};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationRequest {
    pub user_id: Option<Uuid>,
    pub tenant_id: Uuid,
    pub context: serde_json::Value,
    pub recommendation_type: String,
    pub top_k: Option<usize>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationItem {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub item_type: String,
    pub score: f64,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendationResponse {
    pub items: Vec<RecommendationItem>,
    pub recommendation_type: String,
    pub total_found: usize,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub user_id: Uuid,
    pub preferences: serde_json::Value,
    pub recent_interactions: Vec<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Clone)]
pub struct RecommendationService {
    db: Database,
    qa_service: QAService,
}

impl RecommendationService {
    pub fn new(db: Database, qa_service: QAService) -> Self {
        Self { db, qa_service }
    }

    pub async fn recommend(
        &self,
        request: RecommendationRequest,
    ) -> Result<RecommendationResponse, String> {
        let top_k = request.top_k.unwrap_or(10);
        let rec_type = &request.recommendation_type;
        let tenant_id = request.tenant_id;

        let mut items = match rec_type.as_str() {
            "documents" => self.recommend_documents(&request, top_k, tenant_id).await?,
            "products" => self.recommend_products(&request, top_k, tenant_id).await?,
            "opportunities" => self.recommend_opportunities(&request, top_k).await?,
            "tasks" => self.recommend_tasks(&request, top_k, tenant_id).await?,
            "knowledge" => self.recommend_knowledge(&request, top_k, tenant_id).await?,
            "similar" => self.recommend_similar(&request, top_k, tenant_id).await?,
            "articles" => self.recommend_articles(&request, top_k, tenant_id).await?,
            "events" => self.recommend_events(&request, top_k).await?,
            "users" => self.recommend_users(&request, top_k).await?,
            "content" => self.recommend_content(&request, top_k, tenant_id).await?,
            "personalized" => {
                self.recommend_personalized(&request, top_k, tenant_id)
                    .await?
            }
            "cross-sell" => {
                self.recommend_cross_sell(&request, top_k, tenant_id)
                    .await?
            }
            "up-sell" => self.recommend_up_sell(&request, top_k, tenant_id).await?,
            _ => self.recommend_general(&request, top_k, tenant_id).await?,
        };

        if let Some(user_id) = request.user_id {
            items = self.apply_personalization(user_id, items).await?;
        }

        items = self.generate_reasoning(&request, items).await?;

        let total_found = items.len();
        Ok(RecommendationResponse {
            items,
            recommendation_type: rec_type.clone(),
            total_found,
            model: "TOPEMS-AI".to_string(),
        })
    }

    async fn recommend_documents(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let query = sqlx::query(
            r#"
            SELECT id, title, description, document_type
            FROM ai.documents
            WHERE is_processed = TRUE AND tenant_id = $2
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(top_k as i64)
        .bind(tenant_id)
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| format!("查询文档失败: {}", e))?;

        let mut items = Vec::new();
        for row in query {
            let doc_id: Uuid = row.get("id");
            let title: String = row.get("title");
            let description: Option<String> = row.get("description");
            let doc_type: String = row.get("document_type");

            items.push(RecommendationItem {
                id: doc_id.to_string(),
                title,
                description,
                item_type: doc_type,
                score: 0.8,
                metadata: None,
            });
        }
        Ok(items)
    }

    async fn recommend_products(
        &self,
        request: &RecommendationRequest,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let context_str = serde_json::to_string(&request.context)
            .map_err(|e| format!("序列化上下文失败: {}", e))?;

        let prompt = format!(
            "基于以下上下文，推荐相关产品：\n\n上下文: {}\n\n请返回 JSON 格式的产品推荐列表，包含 id、title、description、score。最多返回 {} 个。",
            context_str, top_k
        );

        let response = self
            .qa_service
            .ask(&prompt, None, 5, tenant_id)
            .await
            .map(|r| r.0)?;
        let cleaned: String = response
            .replace("```json", "")
            .replace("```", "")
            .trim()
            .to_string();

        let result: serde_json::Value =
            serde_json::from_str(&cleaned).map_err(|e| format!("解析推荐结果失败: {}", e))?;

        self.extract_recommendations_from_json(result)
    }

    async fn recommend_opportunities(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items = vec![
            RecommendationItem {
                id: "opp-1".to_string(),
                title: "大客户年度续约".to_string(),
                description: Some("与大客户的年度合同续约，金额 500 万".to_string()),
                item_type: "opportunity".to_string(),
                score: 0.92,
                metadata: Some(serde_json::json!({"stage": "negotiation", "value": 5000000})),
            },
            RecommendationItem {
                id: "opp-2".to_string(),
                title: "新产品推广项目".to_string(),
                description: Some("Q3 新产品市场推广，预计带来 300 万收入".to_string()),
                item_type: "opportunity".to_string(),
                score: 0.85,
                metadata: Some(serde_json::json!({"stage": "proposal", "value": 3000000})),
            },
            RecommendationItem {
                id: "opp-3".to_string(),
                title: "行业解决方案定制".to_string(),
                description: Some("为制造业客户定制行业解决方案".to_string()),
                item_type: "opportunity".to_string(),
                score: 0.78,
                metadata: Some(serde_json::json!({"stage": "qualification", "value": 800000})),
            },
        ];

        Ok(items.into_iter().take(top_k).collect())
    }

    async fn recommend_tasks(
        &self,
        request: &RecommendationRequest,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let context_str = serde_json::to_string(&request.context)
            .map_err(|e| format!("序列化上下文失败: {}", e))?;

        let prompt = format!(
            "基于用户上下文，推荐下一步应该完成的任务：\n\n上下文: {}\n\n请返回 JSON 格式的任务推荐列表，包含 id、title、description、score。最多返回 {} 个。",
            context_str, top_k
        );

        let response = self
            .qa_service
            .ask(&prompt, None, 5, tenant_id)
            .await
            .map(|r| r.0)?;
        let cleaned: String = response
            .replace("```json", "")
            .replace("```", "")
            .trim()
            .to_string();

        let result: serde_json::Value =
            serde_json::from_str(&cleaned).map_err(|e| format!("解析推荐结果失败: {}", e))?;

        self.extract_recommendations_from_json(result)
    }

    async fn recommend_knowledge(
        &self,
        request: &RecommendationRequest,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let query = request
            .context
            .get("query")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let search_results = self
            .qa_service
            .semantic_search(query, top_k, tenant_id)
            .await?;

        let items: Vec<RecommendationItem> = search_results
            .into_iter()
            .enumerate()
            .map(|(i, r)| RecommendationItem {
                id: format!("knowledge-{}", i + 1),
                title: "相关知识".to_string(),
                description: Some(r.content.chars().take(100).collect()),
                item_type: "knowledge".to_string(),
                score: r.similarity,
                metadata: None,
            })
            .collect();

        Ok(items)
    }

    async fn recommend_similar(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
        _tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items = vec![
            RecommendationItem {
                id: "similar-1".to_string(),
                title: "相似文档 A".to_string(),
                description: Some("与当前文档主题相似的参考文档".to_string()),
                item_type: "document".to_string(),
                score: 0.95,
                metadata: None,
            },
            RecommendationItem {
                id: "similar-2".to_string(),
                title: "相似文档 B".to_string(),
                description: Some("相关技术文档".to_string()),
                item_type: "document".to_string(),
                score: 0.88,
                metadata: None,
            },
        ];
        Ok(items.into_iter().take(top_k).collect())
    }

    async fn recommend_general(
        &self,
        request: &RecommendationRequest,
        top_k: usize,
        _tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let context_str = serde_json::to_string(&request.context)
            .map_err(|e| format!("序列化上下文失败: {}", e))?;

        let prompt = format!(
            "基于以下上下文，进行智能推荐：\n\n上下文: {}\n推荐类型: {}\n\n请返回 JSON 格式的推荐列表，包含 id、title、description、score。最多返回 {} 个。",
            context_str, request.recommendation_type, top_k
        );

        let response = self
            .qa_service
            .ask(&prompt, None, 5, Uuid::nil())
            .await
            .map(|r| r.0)?;
        let cleaned: String = response
            .replace("```json", "")
            .replace("```", "")
            .trim()
            .to_string();

        let result: serde_json::Value =
            serde_json::from_str(&cleaned).map_err(|e| format!("解析推荐结果失败: {}", e))?;

        self.extract_recommendations_from_json(result)
    }

    fn extract_recommendations_from_json(
        &self,
        result: serde_json::Value,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items_array = result.get("items").and_then(|v| v.as_array());

        if let Some(items) = items_array {
            let mut recommendations = Vec::new();
            for item in items {
                let id = item
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();
                let title = item
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();
                let description = item
                    .get("description")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let score = item.get("score").and_then(|v| v.as_f64()).unwrap_or(0.5);

                recommendations.push(RecommendationItem {
                    id,
                    title,
                    description,
                    item_type: "recommendation".to_string(),
                    score,
                    metadata: None,
                });
            }
            Ok(recommendations)
        } else {
            Ok(Vec::new())
        }
    }

    pub async fn get_user_profile(&self, user_id: Uuid) -> Result<UserProfile, String> {
        let profile = sqlx::query(
            r#"
            SELECT user_id, preferences, recent_interactions, created_at, updated_at
            FROM ai.user_profiles
            WHERE user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| format!("查询用户画像失败: {}", e))?;

        match profile {
            Some(row) => Ok(UserProfile {
                user_id: row.get("user_id"),
                preferences: row.get("preferences"),
                recent_interactions: row.get("recent_interactions"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }),
            None => Ok(UserProfile {
                user_id,
                preferences: serde_json::json!({}),
                recent_interactions: Vec::new(),
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
            }),
        }
    }

    pub async fn update_user_profile(
        &self,
        user_id: Uuid,
        updates: serde_json::Value,
    ) -> Result<UserProfile, String> {
        let now = chrono::Utc::now();

        let _ = sqlx::query(
            r#"
            INSERT INTO ai.user_profiles (user_id, preferences, recent_interactions, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET 
                preferences = COALESCE($2, ai.user_profiles.preferences),
                recent_interactions = COALESCE($3, ai.user_profiles.recent_interactions),
                updated_at = $5
            "#,
        )
        .bind(user_id)
        .bind(updates.get("preferences").unwrap_or(&serde_json::json!({})))
        .bind(updates.get("recent_interactions").unwrap_or(&serde_json::json!([])))
        .bind(now)
        .bind(now)
        .execute(self.db.pool())
        .await
        .map_err(|e| format!("更新用户画像失败: {}", e))?;

        self.get_user_profile(user_id).await
    }

    async fn recommend_articles(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let query = sqlx::query(
            r#"
            SELECT id, title, description, category
            FROM ai.documents
            WHERE document_type = 'article' AND is_processed = TRUE AND tenant_id = $2
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(top_k as i64)
        .bind(tenant_id)
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| format!("查询文章失败: {}", e))?;

        let mut items = Vec::new();
        for row in query {
            let doc_id: Uuid = row.get("id");
            let title: String = row.get("title");
            let description: Option<String> = row.get("description");
            let category: String = row.get("category");

            items.push(RecommendationItem {
                id: doc_id.to_string(),
                title,
                description,
                item_type: "article".to_string(),
                score: 0.75,
                metadata: Some(serde_json::json!({ "category": category })),
            });
        }
        Ok(items)
    }

    async fn recommend_events(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items = vec![
            RecommendationItem {
                id: "event-1".to_string(),
                title: "产品发布会".to_string(),
                description: Some("即将举行的新产品发布会，了解最新产品动态".to_string()),
                item_type: "event".to_string(),
                score: 0.9,
                metadata: Some(serde_json::json!({ "date": "2025-02-15", "location": "线上" })),
            },
            RecommendationItem {
                id: "event-2".to_string(),
                title: "行业峰会".to_string(),
                description: Some("年度行业峰会，与行业专家交流".to_string()),
                item_type: "event".to_string(),
                score: 0.82,
                metadata: Some(serde_json::json!({ "date": "2025-03-01", "location": "上海" })),
            },
            RecommendationItem {
                id: "event-3".to_string(),
                title: "技术培训".to_string(),
                description: Some("技术团队培训课程，提升专业技能".to_string()),
                item_type: "event".to_string(),
                score: 0.75,
                metadata: Some(serde_json::json!({ "date": "2025-02-20", "location": "北京" })),
            },
        ];
        Ok(items.into_iter().take(top_k).collect())
    }

    async fn recommend_users(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items = vec![
            RecommendationItem {
                id: "user-1".to_string(),
                title: "张三".to_string(),
                description: Some("高级客户经理，擅长大客户管理".to_string()),
                item_type: "user".to_string(),
                score: 0.88,
                metadata: Some(serde_json::json!({ "role": "客户经理", "department": "销售部" })),
            },
            RecommendationItem {
                id: "user-2".to_string(),
                title: "李四".to_string(),
                description: Some("技术专家，专注于AI解决方案".to_string()),
                item_type: "user".to_string(),
                score: 0.85,
                metadata: Some(serde_json::json!({ "role": "技术顾问", "department": "技术部" })),
            },
        ];
        Ok(items.into_iter().take(top_k).collect())
    }

    async fn recommend_content(
        &self,
        request: &RecommendationRequest,
        top_k: usize,
        tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let query = request
            .context
            .get("query")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let search_results = self
            .qa_service
            .semantic_search(query, top_k, tenant_id)
            .await?;

        let items: Vec<RecommendationItem> = search_results
            .into_iter()
            .enumerate()
            .map(|(i, r)| RecommendationItem {
                id: format!("content-{}", i + 1),
                title: "相关内容".to_string(),
                description: Some(r.content.chars().take(80).collect()),
                item_type: "content".to_string(),
                score: r.similarity,
                metadata: None,
            })
            .collect();

        Ok(items)
    }

    async fn recommend_personalized(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
        _tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items = vec![
            RecommendationItem {
                id: "personalized-1".to_string(),
                title: "您关注的文档更新".to_string(),
                description: Some("您之前查看过的文档有新的更新".to_string()),
                item_type: "personalized".to_string(),
                score: 0.95,
                metadata: Some(serde_json::json!({ "reason": "基于您的浏览历史" })),
            },
            RecommendationItem {
                id: "personalized-2".to_string(),
                title: "推荐的知识库文章".to_string(),
                description: Some("基于您的工作领域推荐的专业文章".to_string()),
                item_type: "personalized".to_string(),
                score: 0.88,
                metadata: Some(serde_json::json!({ "reason": "基于您的职位和兴趣" })),
            },
        ];
        Ok(items.into_iter().take(top_k).collect())
    }

    async fn recommend_cross_sell(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
        _tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items = vec![
            RecommendationItem {
                id: "cross-1".to_string(),
                title: "配套服务套餐".to_string(),
                description: Some("与您当前产品配套的增值服务".to_string()),
                item_type: "cross-sell".to_string(),
                score: 0.92,
                metadata: Some(
                    serde_json::json!({ "related_product": "您的主产品", "discount": "10%" }),
                ),
            },
            RecommendationItem {
                id: "cross-2".to_string(),
                title: "扩展功能模块".to_string(),
                description: Some("增强您现有系统功能的扩展模块".to_string()),
                item_type: "cross-sell".to_string(),
                score: 0.85,
                metadata: Some(
                    serde_json::json!({ "related_product": "您的主产品", "discount": "15%" }),
                ),
            },
        ];
        Ok(items.into_iter().take(top_k).collect())
    }

    async fn recommend_up_sell(
        &self,
        _request: &RecommendationRequest,
        top_k: usize,
        _tenant_id: Uuid,
    ) -> Result<Vec<RecommendationItem>, String> {
        let items = vec![
            RecommendationItem {
                id: "up-1".to_string(),
                title: "升级到专业版".to_string(),
                description: Some("解锁高级功能，提升工作效率".to_string()),
                item_type: "up-sell".to_string(),
                score: 0.9,
                metadata: Some(
                    serde_json::json!({ "current_plan": "标准版", "upgrade_to": "专业版", "benefits": ["更多功能", "优先支持", "API访问"] }),
                ),
            },
            RecommendationItem {
                id: "up-2".to_string(),
                title: "企业级解决方案".to_string(),
                description: Some("为大型组织定制的企业级方案".to_string()),
                item_type: "up-sell".to_string(),
                score: 0.82,
                metadata: Some(
                    serde_json::json!({ "current_plan": "专业版", "upgrade_to": "企业版", "benefits": ["私有化部署", "专属顾问", "定制开发"] }),
                ),
            },
        ];
        Ok(items.into_iter().take(top_k).collect())
    }

    async fn apply_personalization(
        &self,
        user_id: Uuid,
        items: Vec<RecommendationItem>,
    ) -> Result<Vec<RecommendationItem>, String> {
        let profile = self.get_user_profile(user_id).await?;

        let preferences: Vec<String> = profile
            .preferences
            .get("interests")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default();

        let mut scored_items = Vec::new();
        for item in items {
            let mut score = item.score;

            if let Some(metadata) = &item.metadata {
                if let Some(cat) = metadata.get("category").and_then(|v| v.as_str()) {
                    if preferences.contains(&cat.to_string()) {
                        score = (score * 1.2).min(1.0);
                    }
                }
            }

            scored_items.push(RecommendationItem { score, ..item });
        }

        scored_items.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        Ok(scored_items)
    }

    async fn generate_reasoning(
        &self,
        request: &RecommendationRequest,
        items: Vec<RecommendationItem>,
    ) -> Result<Vec<RecommendationItem>, String> {
        let context_str = serde_json::to_string(&request.context)
            .map_err(|e| format!("序列化上下文失败: {}", e))?;

        let item_titles: Vec<String> = items.iter().map(|i| i.title.clone()).collect();
        let titles_str = item_titles.join(", ");

        let prompt = format!(
            "为以下推荐项生成推荐理由：\n\n推荐项: {}\n\n用户上下文: {}\n\n请返回JSON格式，包含每个推荐项的reason字段，解释为什么推荐该项。",
            titles_str, context_str
        );

        let response = self
            .qa_service
            .ask(&prompt, None, 3, Uuid::nil())
            .await
            .map(|r| r.0)?;
        let cleaned: String = response
            .replace("```json", "")
            .replace("```", "")
            .trim()
            .to_string();

        let result: serde_json::Value = match serde_json::from_str(&cleaned) {
            Ok(v) => v,
            Err(_) => return Ok(items),
        };

        let reasoning_map: std::collections::HashMap<String, String> = result
            .get("reasons")
            .and_then(|v| v.as_object())
            .map(|obj| {
                obj.iter()
                    .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                    .collect()
            })
            .unwrap_or_default();

        let mut enhanced_items = Vec::new();
        for item in items {
            let reason = reasoning_map.get(&item.title).cloned();

            let mut metadata = item.metadata.unwrap_or(serde_json::json!({}));
            if let Some(reason_str) = &reason {
                metadata["reason"] = serde_json::json!(reason_str);
            }

            enhanced_items.push(RecommendationItem {
                metadata: Some(metadata),
                ..item
            });
        }

        Ok(enhanced_items)
    }
}
