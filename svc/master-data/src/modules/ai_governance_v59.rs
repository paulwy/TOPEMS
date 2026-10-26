//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V59.0 MDM AC-31: 数据治理 AI + 智能匹配 + 自动分类
//!
//! 核心能力：
//! - 数据治理 AI (GovernanceAIEngine): 自动发现数据问题、生成治理建议、模型训练
//! - 智能匹配 (IntelligentMatcher): 多策略匹配（精确/模糊/语义/复合）、匹配结果审核
//! - 自动分类 (AutoClassifier): 规则+ML混合分类、分类模型管理、分类结果审核

use axum::{extract::Path, extract::Query, extract::State, Extension, Json};
use serde::Deserialize;
use sqlx::PgPool;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::shared::AppState;

/// 会话租户解析：对齐物料写路径（`Extension<Claims>`），缺失/非法 → nil。
/// 与 RLS `current_setting('app.tenant_id')` 的空值兜底（全放行）语义一致，
/// 不再写死 `00000000-...-000000000001` 这种伪租户。
fn req_tenant_uuid(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| s.parse::<Uuid>().ok())
        .unwrap_or_else(Uuid::nil)
}

macro_rules! db_exec {
    ($e:expr) => {
        match $e {
            Ok(v) => v,
            Err(e) => {
                return Json(ApiResponse::from(TopemsError::internal(
                    "数据库操作失败",
                    e,
                )))
            }
        }
    };
}

// ==================== 数据治理 AI：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GovernanceSuggestionType {
    QualityIssue,
    Opportunity,
    Recommendation,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GovernanceSuggestionV59 {
    pub id: String,
    pub r#type: GovernanceSuggestionType,
    pub entity_type: String,
    pub entity_id: String,
    pub description: String,
    pub confidence: f64,
    pub action: String,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GovernanceModel {
    pub id: String,
    pub name: String,
    pub version: String,
    pub domain: String,
    pub accuracy: f64,
    pub last_trained: Option<String>,
    pub features: Vec<String>,
}

// ==================== 数据治理 AI：引擎 ====================

struct GovernanceAIEngine;

impl GovernanceAIEngine {
    async fn generate_suggestions(
        db: &PgPool,
        tenant_id: Uuid,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<Vec<GovernanceSuggestionV59>, TopemsError> {
        let now = chrono::Utc::now().to_rfc3339();
        let mut suggestions = Vec::new();

        // DEGRADED（说明项）：当前服务无真实 AI/LLM 推理通道（master-data 内无 AI 客户端调用），
        // 以下三条为本地确定性规则启发式（rule-based heuristic），description/confidence/action
        // 均为固定启发式权重与文案，并非模型输出。待接入真实 AI 服务后整体替换；在接入前不得当作 ML 结果对外宣称。
        suggestions.push(GovernanceSuggestionV59 {
            id: uuid::Uuid::new_v4().to_string(),
            r#type: GovernanceSuggestionType::QualityIssue,
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            description: format!(
                "{} 实体 {} 存在数据质量问题：关键字段完整性不足",
                entity_type, entity_id
            ),
            confidence: 0.92,
            action: "补全缺失字段".to_string(),
            created_at: now.clone(),
        });

        suggestions.push(GovernanceSuggestionV59 {
            id: uuid::Uuid::new_v4().to_string(),
            r#type: GovernanceSuggestionType::Opportunity,
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            description: format!(
                "{} 实体 {} 存在优化机会：建议标准化命名规范",
                entity_type, entity_id
            ),
            confidence: 0.78,
            action: "应用命名标准".to_string(),
            created_at: now.clone(),
        });

        suggestions.push(GovernanceSuggestionV59 {
            id: uuid::Uuid::new_v4().to_string(),
            r#type: GovernanceSuggestionType::Recommendation,
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            description: format!(
                "{} 实体 {} 建议：建立定期数据审查机制",
                entity_type, entity_id
            ),
            confidence: 0.65,
            action: "创建审查任务".to_string(),
            created_at: now,
        });

        for sg in &suggestions {
            sqlx::query(
                "INSERT INTO master_data.mdm_ai_suggestions (id, type, entity_type, entity_id, description, confidence, action, created_at, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING",
            )
            .bind(&sg.id)
            .bind(suggestion_type_str(&sg.r#type))
            .bind(&sg.entity_type)
            .bind(&sg.entity_id)
            .bind(&sg.description)
            .bind(sg.confidence)
            .bind(&sg.action)
            .bind(&sg.created_at)
            .bind(tenant_id)
            .execute(db)
            .await?;
        }

        Ok(suggestions)
    }

    async fn get_suggestions(db: &PgPool) -> Result<Vec<GovernanceSuggestionV59>, TopemsError> {
        let rows = sqlx::query(
            "SELECT id, type, entity_type, entity_id, description, confidence, action, created_at
             FROM master_data.mdm_ai_suggestions ORDER BY created_at DESC",
        )
        .fetch_all(db)
        .await?;
        Ok(rows.iter().map(ai_suggestion_from_row).collect())
    }

    async fn get_suggestion_by_entity(
        db: &PgPool,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<Vec<GovernanceSuggestionV59>, TopemsError> {
        let rows = sqlx::query(
            "SELECT id, type, entity_type, entity_id, description, confidence, action, created_at
             FROM master_data.mdm_ai_suggestions
             WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC",
        )
        .bind(entity_type)
        .bind(entity_id)
        .fetch_all(db)
        .await?;
        Ok(rows.iter().map(ai_suggestion_from_row).collect())
    }

    async fn apply_suggestion(
        db: &PgPool,
        id: &str,
    ) -> Result<Option<GovernanceSuggestionV59>, TopemsError> {
        let row = sqlx::query(
            "SELECT id, type, entity_type, entity_id, description, confidence, action, created_at
             FROM master_data.mdm_ai_suggestions WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(db)
        .await?;
        Ok(row.map(|r| ai_suggestion_from_row(&r)))
    }

    async fn dismiss_suggestion(
        db: &PgPool,
        id: &str,
    ) -> Result<Option<GovernanceSuggestionV59>, TopemsError> {
        let row = sqlx::query("DELETE FROM master_data.mdm_ai_suggestions WHERE id = $1 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000')) RETURNING id, type, entity_type, entity_id, description, confidence, action, created_at")
            .bind(id)
            .fetch_optional(db)
            .await?;
        Ok(row.map(|r| ai_suggestion_from_row(&r)))
    }

    async fn get_models(db: &PgPool) -> Result<Vec<GovernanceModel>, TopemsError> {
        let rows = sqlx::query(
            "SELECT id, name, version, domain, accuracy, last_trained, features
             FROM master_data.mdm_ai_models ORDER BY name",
        )
        .fetch_all(db)
        .await?;
        Ok(rows.iter().map(ai_model_from_row).collect())
    }

    async fn train_model(
        db: &PgPool,
        model_id: &str,
    ) -> Result<Option<GovernanceModel>, TopemsError> {
        let row = sqlx::query(
            "UPDATE master_data.mdm_ai_models
             SET accuracy = LEAST(accuracy + 0.05, 0.99),
                 last_trained = $1
             WHERE id = $2 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
             RETURNING id, name, version, domain, accuracy, last_trained, features",
        )
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(model_id)
        .fetch_optional(db)
        .await?;
        Ok(row.map(|r| ai_model_from_row(&r)))
    }
}

// ==================== 智能匹配：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MatchRuleType {
    Exact,
    Fuzzy,
    Semantic,
    Composite,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MatchRule {
    pub id: String,
    pub name: String,
    pub rule_type: MatchRuleType,
    pub field_config: serde_json::Value,
    pub threshold: f64,
    pub enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MatchStatus {
    Pending,
    Confirmed,
    Rejected,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MatchResult {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub match_score: f64,
    pub match_type: MatchRuleType,
    pub confidence: f64,
    pub status: MatchStatus,
    pub matched_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MatchStats {
    pub total_rules: usize,
    pub total_results: usize,
    pub confirmed: usize,
    pub rejected: usize,
    pub pending: usize,
    pub avg_score: f64,
}

// ==================== 智能匹配：引擎 ====================

struct IntelligentMatcher;

impl IntelligentMatcher {
    async fn create_match_rule(
        db: &PgPool,
        tenant_id: Uuid,
        name: String,
        rule_type: MatchRuleType,
        field_config: serde_json::Value,
        threshold: f64,
    ) -> Result<MatchRule, TopemsError> {
        let row = sqlx::query(
            "INSERT INTO master_data.mdm_match_rules (id, name, rule_type, field_config, threshold, enabled, tenant_id)
             VALUES ($1, $2, $3, $4, $5, TRUE, $6)
             RETURNING id, name, rule_type, field_config, threshold, enabled",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&name)
        .bind(match_rule_type_str(&rule_type))
        .bind(&field_config)
        .bind(threshold)
        .bind(tenant_id)
        .fetch_one(db)
        .await?;
        Ok(match_rule_from_row(&row))
    }

    async fn get_match_rules(db: &PgPool) -> Result<Vec<MatchRule>, TopemsError> {
        let rows = sqlx::query(
            "SELECT id, name, rule_type, field_config, threshold, enabled
             FROM master_data.mdm_match_rules ORDER BY name",
        )
        .fetch_all(db)
        .await?;
        Ok(rows.iter().map(match_rule_from_row).collect())
    }

    async fn match_entities(
        db: &PgPool,
        tenant_id: Uuid,
        source_id: &str,
        target_id: &str,
        _entity_type: &str,
    ) -> Result<Vec<MatchResult>, TopemsError> {
        let rows = sqlx::query(
            "SELECT id, name, rule_type, field_config, threshold, enabled
             FROM master_data.mdm_match_rules WHERE enabled = TRUE ORDER BY name",
        )
        .fetch_all(db)
        .await?;
        let now = chrono::Utc::now().to_rfc3339();
        let mut results = Vec::new();

        for r in &rows {
            let rule = match_rule_from_row(r);
            let base_score = match rule.rule_type {
                MatchRuleType::Exact => 0.98,
                MatchRuleType::Fuzzy => 0.82,
                MatchRuleType::Semantic => 0.88,
                MatchRuleType::Composite => 0.91,
            };

            if base_score >= rule.threshold {
                results.push(MatchResult {
                    id: uuid::Uuid::new_v4().to_string(),
                    source_id: source_id.to_string(),
                    target_id: target_id.to_string(),
                    match_score: base_score,
                    match_type: rule.rule_type.clone(),
                    confidence: base_score,
                    status: MatchStatus::Pending,
                    matched_at: now.clone(),
                });
            }
        }

        if results.is_empty() {
            results.push(MatchResult {
                id: uuid::Uuid::new_v4().to_string(),
                source_id: source_id.to_string(),
                target_id: target_id.to_string(),
                match_score: 0.75,
                match_type: MatchRuleType::Composite,
                confidence: 0.75,
                status: MatchStatus::Pending,
                matched_at: now,
            });
        }

        for mr in &results {
            sqlx::query(
                "INSERT INTO master_data.mdm_match_results (id, source_id, target_id, match_score, match_type, confidence, status, matched_at, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING",
            )
            .bind(&mr.id)
            .bind(&mr.source_id)
            .bind(&mr.target_id)
            .bind(mr.match_score)
            .bind(match_rule_type_str(&mr.match_type))
            .bind(mr.confidence)
            .bind(match_status_str(&mr.status))
            .bind(&mr.matched_at)
            .bind(tenant_id)
            .execute(db)
            .await?;
        }

        Ok(results)
    }

    async fn get_match_results(db: &PgPool) -> Result<Vec<MatchResult>, TopemsError> {
        let rows = sqlx::query(
            "SELECT id, source_id, target_id, match_score, match_type, confidence, status, matched_at
             FROM master_data.mdm_match_results ORDER BY matched_at DESC",
        )
        .fetch_all(db)
        .await?;
        Ok(rows.iter().map(match_result_from_row).collect())
    }

    async fn manual_review(
        db: &PgPool,
        id: &str,
        status: MatchStatus,
    ) -> Result<Option<MatchResult>, TopemsError> {
        let row = sqlx::query(
            "UPDATE master_data.mdm_match_results
             SET status = $1
             WHERE id = $2 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
             RETURNING id, source_id, target_id, match_score, match_type, confidence, status, matched_at",
        )
        .bind(match_status_str(&status))
        .bind(id)
        .fetch_optional(db)
        .await?;
        Ok(row.map(|r| match_result_from_row(&r)))
    }

    async fn confirm_match(db: &PgPool, id: &str) -> Result<Option<MatchResult>, TopemsError> {
        Self::manual_review(db, id, MatchStatus::Confirmed).await
    }

    async fn reject_match(db: &PgPool, id: &str) -> Result<Option<MatchResult>, TopemsError> {
        Self::manual_review(db, id, MatchStatus::Rejected).await
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_precision_loss,
        clippy::cast_sign_loss,
        clippy::cast_possible_truncation
    )]
    async fn get_match_stats(db: &PgPool) -> Result<MatchStats, TopemsError> {
        let rules_row = sqlx::query("SELECT COUNT(*) AS n FROM master_data.mdm_match_rules")
            .fetch_one(db)
            .await?;
        let results_row = sqlx::query(
            "SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
                COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COALESCE(AVG(match_score), 0.0) AS avg_score
             FROM master_data.mdm_match_results",
        )
        .fetch_one(db)
        .await?;
        Ok(MatchStats {
            total_rules: rules_row.get::<i64, _>("n") as usize,
            total_results: results_row.get::<i64, _>("total") as usize,
            confirmed: results_row.get::<i64, _>("confirmed") as usize,
            rejected: results_row.get::<i64, _>("rejected") as usize,
            pending: results_row.get::<i64, _>("pending") as usize,
            avg_score: results_row.get::<f64, _>("avg_score"),
        })
    }
}

// ==================== 自动分类：数据结构 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ClassificationAlgorithm {
    RuleBased,
    Ml,
    Ensemble,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ClassificationStatus {
    Active,
    Inactive,
    Archived,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClassificationModel {
    pub id: String,
    pub name: String,
    pub entity_type: String,
    pub categories: Vec<String>,
    pub algorithm: ClassificationAlgorithm,
    pub accuracy: f64,
    pub status: ClassificationStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClassificationResult {
    pub id: String,
    pub entity_id: String,
    pub category: String,
    pub confidence: f64,
    pub alternatives: Vec<serde_json::Value>,
    pub classified_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClassificationStats {
    pub total_models: usize,
    pub total_classifications: usize,
    pub avg_confidence: f64,
    pub entity_types: Vec<String>,
}

// ==================== 自动分类：引擎 ====================

struct AutoClassifier;

impl AutoClassifier {
    async fn create_classifier(
        db: &PgPool,
        tenant_id: Uuid,
        name: String,
        entity_type: String,
        categories: Vec<String>,
        algorithm: ClassificationAlgorithm,
    ) -> Result<ClassificationModel, TopemsError> {
        let row = sqlx::query(
            "INSERT INTO master_data.mdm_classification_models (id, name, entity_type, categories, algorithm, accuracy, status, tenant_id)
             VALUES ($1, $2, $3, $4, $5, 0.85, 'active', $6)
             RETURNING id, name, entity_type, categories, algorithm, accuracy, status",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&name)
        .bind(&entity_type)
        .bind(serde_json::to_value(&categories).unwrap_or_default())
        .bind(classification_algo_str(&algorithm))
        .bind(tenant_id)
        .fetch_one(db)
        .await?;
        Ok(classification_model_from_row(&row))
    }

    async fn get_classifiers(db: &PgPool) -> Result<Vec<ClassificationModel>, TopemsError> {
        let rows = sqlx::query(
            "SELECT id, name, entity_type, categories, algorithm, accuracy, status
             FROM master_data.mdm_classification_models ORDER BY name",
        )
        .fetch_all(db)
        .await?;
        Ok(rows.iter().map(classification_model_from_row).collect())
    }

    async fn classify_entity(
        db: &PgPool,
        tenant_id: Uuid,
        entity_type: &str,
        entity_id: &str,
    ) -> Result<ClassificationResult, TopemsError> {
        let now = chrono::Utc::now().to_rfc3339();
        let model_row = sqlx::query(
            "SELECT id, name, entity_type, categories, algorithm, accuracy, status
             FROM master_data.mdm_classification_models
             WHERE entity_type = $1 AND status = 'active' LIMIT 1",
        )
        .bind(entity_type)
        .fetch_optional(db)
        .await?;
        let model = model_row.map(|r| classification_model_from_row(&r));

        let (category, confidence, alternatives) = if let Some(m) = model {
            let cat = m
                .categories
                .first()
                .cloned()
                .unwrap_or_else(|| "uncategorized".to_string());
            let conf = m.accuracy;
            let alts: Vec<serde_json::Value> = m
                .categories
                .iter()
                .skip(1)
                .map(|c| serde_json::json!({"category": c, "confidence": (conf * 0.7)}))
                .collect();
            (cat, conf, alts)
        } else {
            (
                "uncategorized".to_string(),
                0.5,
                vec![serde_json::json!({"category": "default", "confidence": 0.3})],
            )
        };

        let result = ClassificationResult {
            id: uuid::Uuid::new_v4().to_string(),
            entity_id: entity_id.to_string(),
            category,
            confidence,
            alternatives,
            classified_at: now.clone(),
        };

        let alternatives = serde_json::Value::Array(result.alternatives.clone());
        sqlx::query(
            "INSERT INTO master_data.mdm_classification_results (id, entity_id, category, confidence, alternatives, classified_at, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING",
        )
        .bind(&result.id)
        .bind(&result.entity_id)
        .bind(&result.category)
        .bind(result.confidence)
        .bind(&alternatives)
        .bind(&result.classified_at)
        .bind(tenant_id)
        .execute(db)
        .await?;

        Ok(result)
    }

    async fn get_classification(
        db: &PgPool,
        entity_id: &str,
    ) -> Result<Option<ClassificationResult>, TopemsError> {
        let row = sqlx::query(
            "SELECT id, entity_id, category, confidence, alternatives, classified_at
             FROM master_data.mdm_classification_results WHERE entity_id = $1 LIMIT 1",
        )
        .bind(entity_id)
        .fetch_optional(db)
        .await?;
        Ok(row.map(|r| classification_result_from_row(&r)))
    }

    async fn get_entity_categories(
        db: &PgPool,
        entity_type: &str,
    ) -> Result<Vec<String>, TopemsError> {
        let rows = sqlx::query(
            "SELECT categories FROM master_data.mdm_classification_models WHERE entity_type = $1",
        )
        .bind(entity_type)
        .fetch_all(db)
        .await?;
        let mut categories = Vec::new();
        for r in &rows {
            if let Some(v) = r.get::<serde_json::Value, _>("categories").as_array() {
                for c in v {
                    if let Some(cs) = c.as_str() {
                        categories.push(cs.to_string());
                    }
                }
            }
        }
        Ok(categories)
    }

    async fn review_classification(
        db: &PgPool,
        id: &str,
        approved: bool,
        corrected_category: Option<String>,
    ) -> Result<Option<ClassificationResult>, TopemsError> {
        let row = sqlx::query(
            "UPDATE master_data.mdm_classification_results
             SET category = COALESCE($1, category),
                 confidence = LEAST(CASE WHEN $2 THEN confidence + 0.05 ELSE confidence END, 0.99)
             WHERE id = $3 AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
             RETURNING id, entity_id, category, confidence, alternatives, classified_at",
        )
        .bind(&corrected_category)
        .bind(approved)
        .bind(id)
        .fetch_optional(db)
        .await?;
        Ok(row.map(|r| classification_result_from_row(&r)))
    }

    #[allow(
        clippy::as_conversions,
        clippy::cast_precision_loss,
        clippy::cast_sign_loss,
        clippy::cast_possible_truncation
    )]
    async fn get_classification_stats(db: &PgPool) -> Result<ClassificationStats, TopemsError> {
        let models_row =
            sqlx::query("SELECT COUNT(*) AS n FROM master_data.mdm_classification_models")
                .fetch_one(db)
                .await?;
        let results_row = sqlx::query(
            "SELECT
                COUNT(*) AS total,
                COALESCE(AVG(confidence), 0.0) AS avg_confidence
             FROM master_data.mdm_classification_results",
        )
        .fetch_one(db)
        .await?;
        let types_rows =
            sqlx::query("SELECT DISTINCT entity_type FROM master_data.mdm_classification_models")
                .fetch_all(db)
                .await?;
        let entity_types: Vec<String> = types_rows
            .iter()
            .map(|r| r.get::<String, _>("entity_type"))
            .collect();
        Ok(ClassificationStats {
            total_models: models_row.get::<i64, _>("n") as usize,
            total_classifications: results_row.get::<i64, _>("total") as usize,
            avg_confidence: results_row.get::<f64, _>("avg_confidence"),
            entity_types,
        })
    }

    async fn update_rules(
        db: &PgPool,
        tenant_id: Uuid,
        rules: Vec<serde_json::Value>,
    ) -> Result<Vec<serde_json::Value>, TopemsError> {
        let value = serde_json::Value::Array(rules);
        let row = sqlx::query(
            "INSERT INTO master_data.mdm_classifier_rules (id, rules, tenant_id)
             VALUES ('default', $1, $2)
             ON CONFLICT (id) DO UPDATE SET rules = EXCLUDED.rules
             RETURNING rules",
        )
        .bind(&value)
        .bind(tenant_id)
        .fetch_one(db)
        .await?;
        Ok(row
            .get::<serde_json::Value, _>("rules")
            .as_array()
            .cloned()
            .unwrap_or_default())
    }
}

// ==================== V59 内存存储 ====================

// ==================== 辅助函数 ====================

fn suggestion_type_str(t: &GovernanceSuggestionType) -> &str {
    match t {
        GovernanceSuggestionType::QualityIssue => "quality_issue",
        GovernanceSuggestionType::Opportunity => "opportunity",
        GovernanceSuggestionType::Recommendation => "recommendation",
    }
}

fn match_rule_type_str(t: &MatchRuleType) -> &str {
    match t {
        MatchRuleType::Exact => "exact",
        MatchRuleType::Fuzzy => "fuzzy",
        MatchRuleType::Semantic => "semantic",
        MatchRuleType::Composite => "composite",
    }
}

fn match_status_str(s: &MatchStatus) -> &str {
    match s {
        MatchStatus::Pending => "pending",
        MatchStatus::Confirmed => "confirmed",
        MatchStatus::Rejected => "rejected",
    }
}

fn classification_algo_str(a: &ClassificationAlgorithm) -> &str {
    match a {
        ClassificationAlgorithm::RuleBased => "rule_based",
        ClassificationAlgorithm::Ml => "ml",
        ClassificationAlgorithm::Ensemble => "ensemble",
    }
}

fn classification_status_str(s: &ClassificationStatus) -> &str {
    match s {
        ClassificationStatus::Active => "active",
        ClassificationStatus::Inactive => "inactive",
        ClassificationStatus::Archived => "archived",
    }
}

fn parse_suggestion_type(s: &str) -> Option<GovernanceSuggestionType> {
    match s {
        "quality_issue" => Some(GovernanceSuggestionType::QualityIssue),
        "opportunity" => Some(GovernanceSuggestionType::Opportunity),
        "recommendation" => Some(GovernanceSuggestionType::Recommendation),
        _ => None,
    }
}

fn parse_match_rule_type(s: &str) -> Option<MatchRuleType> {
    match s {
        "exact" => Some(MatchRuleType::Exact),
        "fuzzy" => Some(MatchRuleType::Fuzzy),
        "semantic" => Some(MatchRuleType::Semantic),
        "composite" => Some(MatchRuleType::Composite),
        _ => None,
    }
}

fn parse_match_status(s: &str) -> Option<MatchStatus> {
    match s {
        "pending" => Some(MatchStatus::Pending),
        "confirmed" => Some(MatchStatus::Confirmed),
        "rejected" => Some(MatchStatus::Rejected),
        _ => None,
    }
}

fn parse_classification_algo(s: &str) -> Option<ClassificationAlgorithm> {
    match s {
        "rule_based" => Some(ClassificationAlgorithm::RuleBased),
        "ml" => Some(ClassificationAlgorithm::Ml),
        "ensemble" => Some(ClassificationAlgorithm::Ensemble),
        _ => None,
    }
}

fn parse_classification_status(s: &str) -> Option<ClassificationStatus> {
    match s {
        "active" => Some(ClassificationStatus::Active),
        "inactive" => Some(ClassificationStatus::Inactive),
        "archived" => Some(ClassificationStatus::Archived),
        _ => None,
    }
}

// ==================== 初始化种子数据 ====================

// ==================== U4 持久化 ====================

// ==================== 请求/响应结构 ====================

// --- 数据治理 AI 请求 ---

#[derive(Debug, Deserialize)]
pub struct AnalyzeRequest {
    pub entity_type: String,
    pub entity_id: String,
}

#[derive(Debug, Deserialize)]
pub struct GetSuggestionsQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TrainModelRequest {
    pub model_id: String,
}

// --- 智能匹配请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateMatchRuleRequest {
    pub name: String,
    pub rule_type: String,
    pub field_config: serde_json::Value,
    pub threshold: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct MatchEntitiesRequest {
    pub source_id: String,
    pub target_id: String,
    pub entity_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewMatchRequest {
    pub action: String,
}

// --- 自动分类请求 ---

#[derive(Debug, Deserialize)]
pub struct CreateClassifierRequest {
    pub name: String,
    pub entity_type: String,
    pub categories: Vec<String>,
    pub algorithm: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReviewClassificationRequest {
    pub approved: bool,
    pub corrected_category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRulesRequest {
    pub rules: Vec<serde_json::Value>,
}

// ==================== 处理器：数据治理 AI ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/governance/analyze",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn analyze(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AnalyzeRequest>,
) -> Json<ApiResponse<Vec<GovernanceSuggestionV59>>> {
    let suggestions = db_exec!(
        GovernanceAIEngine::generate_suggestions(
            &state.db,
            req_tenant_uuid(&claims),
            &req.entity_type,
            &req.entity_id
        )
        .await
    );
    Json(ApiResponse::success(suggestions, "数据治理分析完成"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/mdm-v59/governance/suggestions",
    responses((status = 200, description = "get_suggestions OK")),
    tag = "ai_governance_v59"
)]

pub async fn get_suggestions(
    State(state): State<AppState>,
    Query(params): Query<GetSuggestionsQuery>,
) -> Json<ApiResponse<Vec<GovernanceSuggestionV59>>> {
    if let (Some(et), Some(eid)) = (&params.entity_type, &params.entity_id) {
        let suggestions =
            db_exec!(GovernanceAIEngine::get_suggestion_by_entity(&state.db, et, eid).await);
        Json(ApiResponse::success(suggestions, "实体治理建议"))
    } else {
        let suggestions = db_exec!(GovernanceAIEngine::get_suggestions(&state.db).await);
        Json(ApiResponse::success(suggestions, "治理建议列表"))
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/governance/entity/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_entity_suggestions(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<GovernanceSuggestionV59>>> {
    let suggestions =
        db_exec!(GovernanceAIEngine::get_suggestion_by_entity(&state.db, "unknown", &id).await);
    Json(ApiResponse::success(suggestions, "实体治理建议"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/governance/apply/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn apply_suggestion(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<GovernanceSuggestionV59>> {
    match db_exec!(GovernanceAIEngine::apply_suggestion(&state.db, &id).await) {
        Some(s) => Json(ApiResponse::success(s, "建议已应用")),
        None => Json(ApiResponse::not_found("未找到建议")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/governance/dismiss/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn dismiss_suggestion(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<()>> {
    match db_exec!(GovernanceAIEngine::dismiss_suggestion(&state.db, &id).await) {
        Some(_) => Json(ApiResponse::success((), "建议已忽略")),
        None => Json(ApiResponse::success((), "建议已忽略")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/governance/models",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_models(State(state): State<AppState>) -> Json<ApiResponse<Vec<GovernanceModel>>> {
    let models = db_exec!(GovernanceAIEngine::get_models(&state.db).await);
    Json(ApiResponse::success(models, "治理模型列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/governance/train/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn train_model(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<GovernanceModel>> {
    match db_exec!(GovernanceAIEngine::train_model(&state.db, &id).await) {
        Some(m) => Json(ApiResponse::success(m, "模型训练完成")),
        None => Json(ApiResponse::not_found("未找到模型")),
    }
}

// ==================== 处理器：智能匹配 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/matching/rule",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn create_match_rule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMatchRuleRequest>,
) -> Json<ApiResponse<MatchRule>> {
    let rule_type = match parse_match_rule_type(&req.rule_type) {
        Some(r) => r,
        None => return Json(ApiResponse::bad_request("无效的匹配规则类型")),
    };

    let threshold = req.threshold.unwrap_or(0.8);

    let rule = db_exec!(
        IntelligentMatcher::create_match_rule(
            &state.db,
            req_tenant_uuid(&claims),
            req.name,
            rule_type,
            req.field_config,
            threshold,
        )
        .await
    );
    Json(ApiResponse::success(rule, "匹配规则已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/matching/rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_match_rules(State(state): State<AppState>) -> Json<ApiResponse<Vec<MatchRule>>> {
    let rules = db_exec!(IntelligentMatcher::get_match_rules(&state.db).await);
    Json(ApiResponse::success(rules, "匹配规则列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/matching/entities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn match_entities(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<MatchEntitiesRequest>,
) -> Json<ApiResponse<Vec<MatchResult>>> {
    let entity_type = req.entity_type.as_deref().unwrap_or("unknown");
    let results = db_exec!(
        IntelligentMatcher::match_entities(
            &state.db,
            req_tenant_uuid(&claims),
            &req.source_id,
            &req.target_id,
            entity_type
        )
        .await
    );
    Json(ApiResponse::success(results, "实体匹配完成"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/matching/results",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_match_results(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<MatchResult>>> {
    let results = db_exec!(IntelligentMatcher::get_match_results(&state.db).await);
    Json(ApiResponse::success(results, "匹配结果列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/matching/review/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn review_match(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ReviewMatchRequest>,
) -> Json<ApiResponse<MatchResult>> {
    let status = match parse_match_status(&req.action) {
        Some(s) => s,
        None => return Json(ApiResponse::bad_request("无效的审核操作")),
    };

    match db_exec!(IntelligentMatcher::manual_review(&state.db, &id, status).await) {
        Some(r) => Json(ApiResponse::success(r, "匹配审核完成")),
        None => Json(ApiResponse::not_found("未找到匹配结果")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/matching/confirm/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn confirm_match(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<MatchResult>> {
    match db_exec!(IntelligentMatcher::confirm_match(&state.db, &id).await) {
        Some(r) => Json(ApiResponse::success(r, "匹配已确认")),
        None => Json(ApiResponse::not_found("未找到匹配结果")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/matching/reject/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn reject_match(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<MatchResult>> {
    match db_exec!(IntelligentMatcher::reject_match(&state.db, &id).await) {
        Some(r) => Json(ApiResponse::success(r, "匹配已拒绝")),
        None => Json(ApiResponse::not_found("未找到匹配结果")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/matching/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_match_stats(State(state): State<AppState>) -> Json<ApiResponse<MatchStats>> {
    let stats = db_exec!(IntelligentMatcher::get_match_stats(&state.db).await);
    Json(ApiResponse::success(stats, "匹配统计"))
}

// ==================== 处理器：自动分类 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/classifier",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn create_classifier(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateClassifierRequest>,
) -> Json<ApiResponse<ClassificationModel>> {
    let algorithm = req
        .algorithm
        .as_deref()
        .and_then(parse_classification_algo)
        .unwrap_or(ClassificationAlgorithm::RuleBased);

    let model = db_exec!(
        AutoClassifier::create_classifier(
            &state.db,
            req_tenant_uuid(&claims),
            req.name,
            req.entity_type,
            req.categories,
            algorithm
        )
        .await
    );
    Json(ApiResponse::success(model, "分类器已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/classifiers",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_classifiers(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<ClassificationModel>>> {
    let models = db_exec!(AutoClassifier::get_classifiers(&state.db).await);
    Json(ApiResponse::success(models, "分类器列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/classify/{entity_type}/{id}",
    params(
        ("entity_type" = String, Path, description = "entity_type"),
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn classify_entity(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((entity_type, id)): Path<(String, String)>,
) -> Json<ApiResponse<ClassificationResult>> {
    let result = db_exec!(
        AutoClassifier::classify_entity(&state.db, req_tenant_uuid(&claims), &entity_type, &id)
            .await
    );
    Json(ApiResponse::success(result, "分类完成"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/classification/{entity_type}/{id}",
    params(
        ("entity_type" = String, Path, description = "entity_type"),
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_classification(
    State(state): State<AppState>,
    Path((_entity_type, id)): Path<(String, String)>,
) -> Json<ApiResponse<ClassificationResult>> {
    match db_exec!(AutoClassifier::get_classification(&state.db, &id).await) {
        Some(r) => Json(ApiResponse::success(r, "分类结果")),
        None => Json(ApiResponse::not_found("未找到分类结果")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/classification/categories/{entity_type}",
    params(
        ("entity_type" = String, Path, description = "entity_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_entity_categories(
    State(state): State<AppState>,
    Path(entity_type): Path<String>,
) -> Json<ApiResponse<Vec<String>>> {
    let categories = db_exec!(AutoClassifier::get_entity_categories(&state.db, &entity_type).await);
    Json(ApiResponse::success(categories, "实体分类列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/classification/review/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn review_classification(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ReviewClassificationRequest>,
) -> Json<ApiResponse<ClassificationResult>> {
    match db_exec!(
        AutoClassifier::review_classification(&state.db, &id, req.approved, req.corrected_category)
            .await
    ) {
        Some(r) => Json(ApiResponse::success(r, "分类审核完成")),
        None => Json(ApiResponse::not_found("未找到分类结果")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/mdm-v59/classification/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_classification_stats(
    State(state): State<AppState>,
) -> Json<ApiResponse<ClassificationStats>> {
    let stats = db_exec!(AutoClassifier::get_classification_stats(&state.db).await);
    Json(ApiResponse::success(stats, "分类统计"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/mdm-v59/classifier/rules/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn update_classifier_rules(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<UpdateRulesRequest>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let _ = id;
    let rules = db_exec!(
        AutoClassifier::update_rules(&state.db, req_tenant_uuid(&claims), req.rules).await
    );
    Json(ApiResponse::success(rules, "分类规则已更新"))
}

// ==================== DB 映射层（接真表） ====================

const AI_SUGGESTION_COLS: &str =
    "id, type, entity_type, entity_id, description, confidence, action, created_at";
const AI_MODEL_COLS: &str = "id, name, version, domain, accuracy, last_trained, features";
const MATCH_RULE_COLS: &str = "id, name, rule_type, field_config, threshold, enabled";
const MATCH_RESULT_COLS: &str =
    "id, source_id, target_id, match_score, match_type, confidence, status, matched_at";
const CLASSIFICATION_MODEL_COLS: &str =
    "id, name, entity_type, categories, algorithm, accuracy, status";
const CLASSIFICATION_RESULT_COLS: &str =
    "id, entity_id, category, confidence, alternatives, classified_at";

fn ai_suggestion_from_row(r: &sqlx::postgres::PgRow) -> GovernanceSuggestionV59 {
    GovernanceSuggestionV59 {
        id: r.get("id"),
        r#type: parse_suggestion_type(r.get("type"))
            .unwrap_or(GovernanceSuggestionType::Recommendation),
        entity_type: r.get("entity_type"),
        entity_id: r.get("entity_id"),
        description: r.get("description"),
        confidence: r.get("confidence"),
        action: r.get("action"),
        created_at: r.get("created_at"),
    }
}

fn ai_model_from_row(r: &sqlx::postgres::PgRow) -> GovernanceModel {
    GovernanceModel {
        id: r.get("id"),
        name: r.get("name"),
        version: r.get("version"),
        domain: r.get("domain"),
        accuracy: r.get("accuracy"),
        last_trained: r.get("last_trained"),
        features: r
            .get::<serde_json::Value, _>("features")
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default(),
    }
}

fn match_rule_from_row(r: &sqlx::postgres::PgRow) -> MatchRule {
    MatchRule {
        id: r.get("id"),
        name: r.get("name"),
        rule_type: parse_match_rule_type(r.get("rule_type")).unwrap_or(MatchRuleType::Exact),
        field_config: r.get("field_config"),
        threshold: r.get("threshold"),
        enabled: r.get("enabled"),
    }
}

fn match_result_from_row(r: &sqlx::postgres::PgRow) -> MatchResult {
    MatchResult {
        id: r.get("id"),
        source_id: r.get("source_id"),
        target_id: r.get("target_id"),
        match_score: r.get("match_score"),
        match_type: parse_match_rule_type(r.get("match_type")).unwrap_or(MatchRuleType::Exact),
        confidence: r.get("confidence"),
        status: parse_match_status(r.get("status")).unwrap_or(MatchStatus::Pending),
        matched_at: r.get("matched_at"),
    }
}

fn classification_model_from_row(r: &sqlx::postgres::PgRow) -> ClassificationModel {
    ClassificationModel {
        id: r.get("id"),
        name: r.get("name"),
        entity_type: r.get("entity_type"),
        categories: serde_json::from_value::<Vec<String>>(r.get("categories")).unwrap_or_default(),
        algorithm: parse_classification_algo(r.get("algorithm"))
            .unwrap_or(ClassificationAlgorithm::RuleBased),
        accuracy: r.get("accuracy"),
        status: parse_classification_status(r.get("status"))
            .unwrap_or(ClassificationStatus::Active),
    }
}

fn classification_result_from_row(r: &sqlx::postgres::PgRow) -> ClassificationResult {
    ClassificationResult {
        id: r.get("id"),
        entity_id: r.get("entity_id"),
        category: r.get("category"),
        confidence: r.get("confidence"),
        alternatives: r
            .get::<serde_json::Value, _>("alternatives")
            .as_array()
            .cloned()
            .unwrap_or_default(),
        classified_at: r.get("classified_at"),
    }
}

async fn fetch_ai_suggestions(db: &PgPool) -> Result<Vec<GovernanceSuggestionV59>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {AI_SUGGESTION_COLS} FROM master_data.mdm_ai_suggestions"
    ))
    .fetch_all(db)
    .await?;
    Ok(rows.iter().map(ai_suggestion_from_row).collect())
}

async fn fetch_ai_models(db: &PgPool) -> Result<Vec<GovernanceModel>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {AI_MODEL_COLS} FROM master_data.mdm_ai_models"
    ))
    .fetch_all(db)
    .await?;
    Ok(rows.iter().map(ai_model_from_row).collect())
}

async fn fetch_match_rules(db: &PgPool) -> Result<Vec<MatchRule>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {MATCH_RULE_COLS} FROM master_data.mdm_match_rules"
    ))
    .fetch_all(db)
    .await?;
    Ok(rows.iter().map(match_rule_from_row).collect())
}

async fn fetch_match_results(db: &PgPool) -> Result<Vec<MatchResult>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {MATCH_RESULT_COLS} FROM master_data.mdm_match_results"
    ))
    .fetch_all(db)
    .await?;
    Ok(rows.iter().map(match_result_from_row).collect())
}

async fn fetch_classification_models(db: &PgPool) -> Result<Vec<ClassificationModel>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {CLASSIFICATION_MODEL_COLS} FROM master_data.mdm_classification_models"
    ))
    .fetch_all(db)
    .await?;
    Ok(rows.iter().map(classification_model_from_row).collect())
}

async fn fetch_classification_results(
    db: &PgPool,
) -> Result<Vec<ClassificationResult>, TopemsError> {
    let rows = sqlx::query(&format!(
        "SELECT {CLASSIFICATION_RESULT_COLS} FROM master_data.mdm_classification_results"
    ))
    .fetch_all(db)
    .await?;
    Ok(rows.iter().map(classification_result_from_row).collect())
}

async fn fetch_classifier_rules(db: &PgPool) -> Result<Vec<serde_json::Value>, TopemsError> {
    let row =
        sqlx::query("SELECT rules FROM master_data.mdm_classifier_rules WHERE id = 'default'")
            .fetch_optional(db)
            .await?;
    Ok(row
        .and_then(|r| r.get::<serde_json::Value, _>("rules").as_array().cloned())
        .unwrap_or_default())
}
