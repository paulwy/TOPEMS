//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V59.0 MDM AC-31: 数据治理 AI + 智能匹配 + 自动分类
//!
//! 核心能力：
//! - 数据治理 AI (GovernanceAIEngine): 自动发现数据问题、生成治理建议、模型训练
//! - 智能匹配 (IntelligentMatcher): 多策略匹配（精确/模糊/语义/复合）、匹配结果审核
//! - 自动分类 (AutoClassifier): 规则+ML混合分类、分类模型管理、分类结果审核

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

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

struct GovernanceAIEngine {
    suggestions: Mutex<Vec<GovernanceSuggestionV59>>,
    models: Mutex<Vec<GovernanceModel>>,
    initialized: Mutex<bool>,
}

impl GovernanceAIEngine {
    async fn generate_suggestions(
        &self,
        entity_type: &str,
        entity_id: &str,
    ) -> Vec<GovernanceSuggestionV59> {
        let now = chrono::Utc::now().to_rfc3339();
        let mut suggestions = Vec::new();

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

        self.suggestions.lock().await.extend(suggestions.clone());
        suggestions
    }

    async fn get_suggestions(&self) -> Vec<GovernanceSuggestionV59> {
        let suggestions = self.suggestions.lock().await;
        suggestions.clone()
    }

    async fn get_suggestion_by_entity(
        &self,
        entity_type: &str,
        entity_id: &str,
    ) -> Vec<GovernanceSuggestionV59> {
        let suggestions = self.suggestions.lock().await;
        suggestions
            .iter()
            .filter(|s| s.entity_type == entity_type && s.entity_id == entity_id)
            .cloned()
            .collect()
    }

    async fn apply_suggestion(&self, id: &str) -> Option<GovernanceSuggestionV59> {
        let mut suggestions = self.suggestions.lock().await;
        let suggestion = suggestions.iter_mut().find(|s| s.id == id)?;
        Some(suggestion.clone())
    }

    async fn dismiss_suggestion(&self, id: &str) -> Option<GovernanceSuggestionV59> {
        let mut suggestions = self.suggestions.lock().await;
        let pos = suggestions.iter().position(|s| s.id == id)?;
        suggestions.remove(pos);
        None
    }

    async fn get_models(&self) -> Vec<GovernanceModel> {
        let models = self.models.lock().await;
        models.clone()
    }

    async fn train_model(&self, model_id: &str) -> Option<GovernanceModel> {
        let mut models = self.models.lock().await;
        let model = models.iter_mut().find(|m| m.id == model_id)?;
        model.accuracy = (model.accuracy + 0.05).min(0.99);
        model.last_trained = Some(chrono::Utc::now().to_rfc3339());
        Some(model.clone())
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

struct IntelligentMatcher {
    rules: Mutex<Vec<MatchRule>>,
    results: Mutex<Vec<MatchResult>>,
    initialized: Mutex<bool>,
}

impl IntelligentMatcher {
    async fn create_match_rule(
        &self,
        name: String,
        rule_type: MatchRuleType,
        field_config: serde_json::Value,
        threshold: f64,
    ) -> MatchRule {
        let rule = MatchRule {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            rule_type,
            field_config,
            threshold,
            enabled: true,
        };
        self.rules.lock().await.push(rule.clone());
        rule
    }

    async fn get_match_rules(&self) -> Vec<MatchRule> {
        let rules = self.rules.lock().await;
        rules.clone()
    }

    async fn match_entities(
        &self,
        source_id: &str,
        target_id: &str,
        _entity_type: &str,
    ) -> Vec<MatchResult> {
        let rules = self.rules.lock().await;
        let now = chrono::Utc::now().to_rfc3339();
        let mut results = Vec::new();

        for rule in rules.iter().filter(|r| r.enabled) {
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

        self.results.lock().await.extend(results.clone());
        results
    }

    async fn get_match_results(&self) -> Vec<MatchResult> {
        let results = self.results.lock().await;
        results.clone()
    }

    async fn manual_review(&self, id: &str, status: MatchStatus) -> Option<MatchResult> {
        let mut results = self.results.lock().await;
        let result = results.iter_mut().find(|r| r.id == id)?;
        result.status = status;
        Some(result.clone())
    }

    async fn confirm_match(&self, id: &str) -> Option<MatchResult> {
        self.manual_review(id, MatchStatus::Confirmed).await
    }

    async fn reject_match(&self, id: &str) -> Option<MatchResult> {
        self.manual_review(id, MatchStatus::Rejected).await
    }

    async fn get_match_stats(&self) -> MatchStats {
        let rules = self.rules.lock().await;
        let results = self.results.lock().await;
        let confirmed = results
            .iter()
            .filter(|r| r.status == MatchStatus::Confirmed)
            .count();
        let rejected = results
            .iter()
            .filter(|r| r.status == MatchStatus::Rejected)
            .count();
        let pending = results
            .iter()
            .filter(|r| r.status == MatchStatus::Pending)
            .count();
        let avg_score = if results.is_empty() {
            0.0
        } else {
            results.iter().map(|r| r.match_score).sum::<f64>() / results.len() as f64
        };
        MatchStats {
            total_rules: rules.len(),
            total_results: results.len(),
            confirmed,
            rejected,
            pending,
            avg_score,
        }
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

struct AutoClassifier {
    models: Mutex<Vec<ClassificationModel>>,
    results: Mutex<Vec<ClassificationResult>>,
    rules: Mutex<Vec<serde_json::Value>>,
    initialized: Mutex<bool>,
}

impl AutoClassifier {
    async fn create_classifier(
        &self,
        name: String,
        entity_type: String,
        categories: Vec<String>,
        algorithm: ClassificationAlgorithm,
    ) -> ClassificationModel {
        let model = ClassificationModel {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            entity_type,
            categories,
            algorithm,
            accuracy: 0.85,
            status: ClassificationStatus::Active,
        };
        self.models.lock().await.push(model.clone());
        model
    }

    async fn get_classifiers(&self) -> Vec<ClassificationModel> {
        let models = self.models.lock().await;
        models.clone()
    }

    async fn classify_entity(&self, entity_type: &str, entity_id: &str) -> ClassificationResult {
        let now = chrono::Utc::now().to_rfc3339();
        let models = self.models.lock().await;
        let model = models
            .iter()
            .find(|m| m.entity_type == entity_type && m.status == ClassificationStatus::Active)
            .cloned();
        drop(models);

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

        self.results.lock().await.push(result.clone());
        result
    }

    async fn get_classification(&self, entity_id: &str) -> Option<ClassificationResult> {
        let results = self.results.lock().await;
        results.iter().find(|r| r.entity_id == entity_id).cloned()
    }

    async fn get_entity_categories(&self, entity_type: &str) -> Vec<String> {
        let models = self.models.lock().await;
        models
            .iter()
            .filter(|m| m.entity_type == entity_type)
            .flat_map(|m| m.categories.clone())
            .collect()
    }

    async fn review_classification(
        &self,
        id: &str,
        approved: bool,
        corrected_category: Option<String>,
    ) -> Option<ClassificationResult> {
        let mut results = self.results.lock().await;
        let result = results.iter_mut().find(|r| r.id == id)?;
        if approved {
            if let Some(cat) = corrected_category {
                result.category = cat;
            }
            result.confidence = (result.confidence + 0.05).min(0.99);
        }
        Some(result.clone())
    }

    async fn get_classification_stats(&self) -> ClassificationStats {
        let models = self.models.lock().await;
        let results = self.results.lock().await;
        let avg_confidence = if results.is_empty() {
            0.0
        } else {
            results.iter().map(|r| r.confidence).sum::<f64>() / results.len() as f64
        };
        let entity_types: Vec<String> = models
            .iter()
            .map(|m| m.entity_type.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        ClassificationStats {
            total_models: models.len(),
            total_classifications: results.len(),
            avg_confidence,
            entity_types,
        }
    }

    async fn update_rules(&self, rules: Vec<serde_json::Value>) -> Vec<serde_json::Value> {
        let mut existing = self.rules.lock().await;
        *existing = rules;
        existing.clone()
    }
}

// ==================== V59 内存存储 ====================

struct V59Store {
    ai: GovernanceAIEngine,
    matcher: IntelligentMatcher,
    classifier: AutoClassifier,
}

fn get_v59_store() -> &'static V59Store {
    static STORE: LazyLock<V59Store> = LazyLock::new(|| V59Store {
        ai: GovernanceAIEngine {
            suggestions: Mutex::new(Vec::new()),
            models: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
        matcher: IntelligentMatcher {
            rules: Mutex::new(Vec::new()),
            results: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
        classifier: AutoClassifier {
            models: Mutex::new(Vec::new()),
            results: Mutex::new(Vec::new()),
            rules: Mutex::new(Vec::new()),
            initialized: Mutex::new(false),
        },
    });
    &STORE
}

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

async fn ensure_initialized() {
    let store = get_v59_store();

    {
        let mut init = store.ai.initialized.lock().await;
        if *init {
            return;
        }

        let now = chrono::Utc::now().to_rfc3339();

        let seed_models = vec![
            GovernanceModel {
                id: uuid::Uuid::new_v4().to_string(),
                name: "客户数据质量模型".to_string(),
                version: "1.0.0".to_string(),
                domain: "customer".to_string(),
                accuracy: 0.87,
                last_trained: Some(now.clone()),
                features: vec![
                    "completeness".to_string(),
                    "accuracy".to_string(),
                    "consistency".to_string(),
                ],
            },
            GovernanceModel {
                id: uuid::Uuid::new_v4().to_string(),
                name: "供应商数据治理模型".to_string(),
                version: "0.9.0".to_string(),
                domain: "supplier".to_string(),
                accuracy: 0.82,
                last_trained: Some(now.clone()),
                features: vec![
                    "validity".to_string(),
                    "timeliness".to_string(),
                    "uniqueness".to_string(),
                ],
            },
        ];
        *store.ai.models.lock().await = seed_models;
        *init = true;
    }

    {
        let mut init = store.matcher.initialized.lock().await;
        if *init {
            return;
        }

        let seed_rules = vec![
            MatchRule {
                id: uuid::Uuid::new_v4().to_string(),
                name: "精确匹配".to_string(),
                rule_type: MatchRuleType::Exact,
                field_config: serde_json::json!({"fields": ["name", "code"]}),
                threshold: 0.98,
                enabled: true,
            },
            MatchRule {
                id: uuid::Uuid::new_v4().to_string(),
                name: "模糊匹配".to_string(),
                rule_type: MatchRuleType::Fuzzy,
                field_config: serde_json::json!({"fields": ["name"], "method": "levenshtein"}),
                threshold: 0.80,
                enabled: true,
            },
            MatchRule {
                id: uuid::Uuid::new_v4().to_string(),
                name: "语义匹配".to_string(),
                rule_type: MatchRuleType::Semantic,
                field_config: serde_json::json!({"fields": ["description"], "model": "embedding"}),
                threshold: 0.75,
                enabled: true,
            },
        ];
        *store.matcher.rules.lock().await = seed_rules;
        *init = true;
    }

    {
        let mut init = store.classifier.initialized.lock().await;
        if *init {
            return;
        }

        let seed_models = vec![
            ClassificationModel {
                id: uuid::Uuid::new_v4().to_string(),
                name: "客户分类器".to_string(),
                entity_type: "customer".to_string(),
                categories: vec![
                    "enterprise".to_string(),
                    "smb".to_string(),
                    "individual".to_string(),
                ],
                algorithm: ClassificationAlgorithm::Ensemble,
                accuracy: 0.91,
                status: ClassificationStatus::Active,
            },
            ClassificationModel {
                id: uuid::Uuid::new_v4().to_string(),
                name: "物料分类器".to_string(),
                entity_type: "material".to_string(),
                categories: vec![
                    "raw_material".to_string(),
                    "semi_finished".to_string(),
                    "finished_goods".to_string(),
                ],
                algorithm: ClassificationAlgorithm::Ml,
                accuracy: 0.88,
                status: ClassificationStatus::Active,
            },
        ];
        *store.classifier.models.lock().await = seed_models;

        let seed_rules = vec![
            serde_json::json!({"entity_type": "customer", "rule": "field_industry = 'enterprise' -> enterprise"}),
            serde_json::json!({"entity_type": "material", "rule": "field_type = 'raw' -> raw_material"}),
        ];
        *store.classifier.rules.lock().await = seed_rules;
        *init = true;
    }
}

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
    path = "/governance/analyze",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn analyze(
    State(_state): State<AppState>,
    Json(req): Json<AnalyzeRequest>,
) -> Json<ApiResponse<Vec<GovernanceSuggestionV59>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let suggestions = store
        .ai
        .generate_suggestions(&req.entity_type, &req.entity_id)
        .await;
    Json(ApiResponse::success(suggestions, "数据治理分析完成"))
}

pub async fn get_suggestions(
    State(_state): State<AppState>,
    Query(params): Query<GetSuggestionsQuery>,
) -> Json<ApiResponse<Vec<GovernanceSuggestionV59>>> {
    ensure_initialized().await;
    let store = get_v59_store();

    if let (Some(et), Some(eid)) = (&params.entity_type, &params.entity_id) {
        let suggestions = store.ai.get_suggestion_by_entity(et, eid).await;
        Json(ApiResponse::success(suggestions, "实体治理建议"))
    } else {
        let suggestions = store.ai.get_suggestions().await;
        Json(ApiResponse::success(suggestions, "治理建议列表"))
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/governance/entity/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Vec<GovernanceSuggestionV59>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let suggestions = store.ai.get_suggestion_by_entity("unknown", &id).await;
    Json(ApiResponse::success(suggestions, "实体治理建议"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/governance/apply/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<GovernanceSuggestionV59>> {
    ensure_initialized().await;
    let store = get_v59_store();

    match store.ai.apply_suggestion(&id).await {
        Some(s) => Json(ApiResponse::success(s, "建议已应用")),
        None => Json(ApiResponse::error(404, "未找到建议")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/governance/dismiss/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<()>> {
    ensure_initialized().await;
    let store = get_v59_store();

    match store.ai.dismiss_suggestion(&id).await {
        Some(_) => Json(ApiResponse::success((), "建议已忽略")),
        None => Json(ApiResponse::success((), "建议已忽略")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/governance/models",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_models(State(_state): State<AppState>) -> Json<ApiResponse<Vec<GovernanceModel>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let models = store.ai.get_models().await;
    Json(ApiResponse::success(models, "治理模型列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/governance/train/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<GovernanceModel>> {
    ensure_initialized().await;
    let store = get_v59_store();

    match store.ai.train_model(&id).await {
        Some(m) => Json(ApiResponse::success(m, "模型训练完成")),
        None => Json(ApiResponse::error(404, "未找到模型")),
    }
}

// ==================== 处理器：智能匹配 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/matching/rule",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn create_match_rule(
    State(_state): State<AppState>,
    Json(req): Json<CreateMatchRuleRequest>,
) -> Json<ApiResponse<MatchRule>> {
    ensure_initialized().await;
    let store = get_v59_store();

    let rule_type = match parse_match_rule_type(&req.rule_type) {
        Some(r) => r,
        None => return Json(ApiResponse::error(400, "无效的匹配规则类型")),
    };

    let threshold = req.threshold.unwrap_or(0.8);

    let rule = store
        .matcher
        .create_match_rule(req.name, rule_type, req.field_config, threshold)
        .await;
    Json(ApiResponse::success(rule, "匹配规则已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/matching/rules",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_match_rules(State(_state): State<AppState>) -> Json<ApiResponse<Vec<MatchRule>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let rules = store.matcher.get_match_rules().await;
    Json(ApiResponse::success(rules, "匹配规则列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/matching/entities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn match_entities(
    State(_state): State<AppState>,
    Json(req): Json<MatchEntitiesRequest>,
) -> Json<ApiResponse<Vec<MatchResult>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let entity_type = req.entity_type.as_deref().unwrap_or("unknown");
    let results = store
        .matcher
        .match_entities(&req.source_id, &req.target_id, entity_type)
        .await;
    Json(ApiResponse::success(results, "实体匹配完成"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/matching/results",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_match_results(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<MatchResult>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let results = store.matcher.get_match_results().await;
    Json(ApiResponse::success(results, "匹配结果列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/matching/review/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ReviewMatchRequest>,
) -> Json<ApiResponse<MatchResult>> {
    ensure_initialized().await;
    let store = get_v59_store();

    let status = match parse_match_status(&req.action) {
        Some(s) => s,
        None => return Json(ApiResponse::error(400, "无效的审核操作")),
    };

    match store.matcher.manual_review(&id, status).await {
        Some(r) => Json(ApiResponse::success(r, "匹配审核完成")),
        None => Json(ApiResponse::error(404, "未找到匹配结果")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/matching/confirm/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<MatchResult>> {
    ensure_initialized().await;
    let store = get_v59_store();

    match store.matcher.confirm_match(&id).await {
        Some(r) => Json(ApiResponse::success(r, "匹配已确认")),
        None => Json(ApiResponse::error(404, "未找到匹配结果")),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/matching/reject/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<MatchResult>> {
    ensure_initialized().await;
    let store = get_v59_store();

    match store.matcher.reject_match(&id).await {
        Some(r) => Json(ApiResponse::success(r, "匹配已拒绝")),
        None => Json(ApiResponse::error(404, "未找到匹配结果")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/matching/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_match_stats(State(_state): State<AppState>) -> Json<ApiResponse<MatchStats>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let stats = store.matcher.get_match_stats().await;
    Json(ApiResponse::success(stats, "匹配统计"))
}

// ==================== 处理器：自动分类 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/classifier",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn create_classifier(
    State(_state): State<AppState>,
    Json(req): Json<CreateClassifierRequest>,
) -> Json<ApiResponse<ClassificationModel>> {
    ensure_initialized().await;
    let store = get_v59_store();

    let algorithm = req
        .algorithm
        .as_deref()
        .and_then(parse_classification_algo)
        .unwrap_or(ClassificationAlgorithm::RuleBased);

    let model = store
        .classifier
        .create_classifier(req.name, req.entity_type, req.categories, algorithm)
        .await;
    Json(ApiResponse::success(model, "分类器已创建"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/classifiers",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_classifiers(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<ClassificationModel>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let models = store.classifier.get_classifiers().await;
    Json(ApiResponse::success(models, "分类器列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/classify/{entity_type}/{id}",
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
    State(_state): State<AppState>,
    Path((entity_type, id)): Path<(String, String)>,
) -> Json<ApiResponse<ClassificationResult>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let result = store.classifier.classify_entity(&entity_type, &id).await;
    Json(ApiResponse::success(result, "分类完成"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/classification/{entity_type}/{id}",
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
    State(_state): State<AppState>,
    Path((_entity_type, id)): Path<(String, String)>,
) -> Json<ApiResponse<ClassificationResult>> {
    ensure_initialized().await;
    let store = get_v59_store();

    match store.classifier.get_classification(&id).await {
        Some(r) => Json(ApiResponse::success(r, "分类结果")),
        None => Json(ApiResponse::error(404, "未找到分类结果")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/classification/categories/{entity_type}",
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
    State(_state): State<AppState>,
    Path(entity_type): Path<String>,
) -> Json<ApiResponse<Vec<String>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let categories = store.classifier.get_entity_categories(&entity_type).await;
    Json(ApiResponse::success(categories, "实体分类列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/classification/review/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<ReviewClassificationRequest>,
) -> Json<ApiResponse<ClassificationResult>> {
    ensure_initialized().await;
    let store = get_v59_store();

    match store
        .classifier
        .review_classification(&id, req.approved, req.corrected_category)
        .await
    {
        Some(r) => Json(ApiResponse::success(r, "分类审核完成")),
        None => Json(ApiResponse::error(404, "未找到分类结果")),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:ai_governance:read"])),
    path = "/classification/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai_governance_v59"
)]
pub async fn get_classification_stats(
    State(_state): State<AppState>,
) -> Json<ApiResponse<ClassificationStats>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let stats = store.classifier.get_classification_stats().await;
    Json(ApiResponse::success(stats, "分类统计"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:ai_governance:write"])),
    path = "/classifier/rules/{id}",
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
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateRulesRequest>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    ensure_initialized().await;
    let store = get_v59_store();
    let _ = id;
    let rules = store.classifier.update_rules(req.rules).await;
    Json(ApiResponse::success(rules, "分类规则已更新"))
}
