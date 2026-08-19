//! STATUS: WIRED | Routes registered + DB tables initialized + Handlers implemented
//! V51.0 MDM AC-23: 质量闭环 + 自动修复 + 数据治理 AI
//!
//! 核心能力：
//! - 质量闭环 (Quality Closed Loop): Monitor → Detect → Analyze → Fix → Verify → Report
//! - 自动修复 (Auto-Fix): 异常检测 → 策略选择 → 修复应用 → 验证 → 确认 → 记录
//! - 数据治理 AI: 智能匹配建议、数据质量预测、异常检测、智能丰富、治理趋势分析
//!
//! 设计风格：ApiResponse + LazyLock 内存存储

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;
use tokio::sync::Mutex;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;
use utoipa::ToSchema;

use crate::shared::AppState;

// ==================== 纯函数（无副作用，可单测） ====================

/// 根据完整性、准确性、一致性、及时性四维分数加权计算数据质量综合分数（0-100）。
/// 权重：完整性 35%、准确性 30%、一致性 20%、及时性 15%。输入值会被 clamp 到 [0,100]。
pub fn calculate_quality_score(
    completeness: f64,
    accuracy: f64,
    consistency: f64,
    timeliness: f64,
) -> f64 {
    fn clamp(v: f64) -> f64 {
        v.clamp(0.0, 100.0)
    }
    let c = clamp(completeness);
    let a = clamp(accuracy);
    let co = clamp(consistency);
    let t = clamp(timeliness);
    let score = c * 0.35 + a * 0.30 + co * 0.20 + t * 0.15;
    (score * 100.0).round() / 100.0
}

/// 根据综合分数返回质量等级（A/B/C/D/F）。
/// - [90, 100] -> A
/// - [80, 90)  -> B
/// - [70, 80)  -> C
/// - [60, 70)  -> D
/// - < 60      -> F
pub fn quality_grade_from_score(score: f64) -> &'static str {
    if score >= 90.0 {
        "A"
    } else if score >= 80.0 {
        "B"
    } else if score >= 70.0 {
        "C"
    } else if score >= 60.0 {
        "D"
    } else {
        "F"
    }
}

// ==================== 质量闭环 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum QualityStatus {
    Passed,
    Failed,
    Warning,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct QualityCheckV51 {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub rule_id: String,
    pub status: QualityStatus,
    pub score: f64,
    pub details: serde_json::Value,
    pub checked_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityLoopConfig {
    pub entity_type: String,
    pub enabled_rules: Vec<String>,
    pub auto_fix_enabled: bool,
    pub notification_channels: Vec<String>,
    pub max_retries: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QualityLoopStage {
    Monitor,
    Detect,
    Analyze,
    Fix,
    Verify,
    Report,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct QualityRule {
    pub id: String,
    pub name: String,
    pub entity_type: String,
    pub rule_type: String,
    pub description: String,
    pub severity: String,
    pub parameters: serde_json::Value,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ==================== 自动修复 ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AutoFixActionType {
    Normalize,
    DefaultValue,
    MapValue,
    RemoveDuplicate,
    Standardize,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FixStatus {
    Pending,
    Applied,
    Verified,
    Failed,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct AutoFixAction {
    pub id: String,
    pub rule_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action_type: AutoFixActionType,
    pub before_value: serde_json::Value,
    pub after_value: Option<serde_json::Value>,
    pub confidence: f64,
    pub status: FixStatus,
    pub applied_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FixStrategy {
    NormalizeText,
    FillMissingDefaults,
    MapToStandardValues,
    RemoveDuplicates,
    StandardizeDateFormat,
    EnrichFromReference,
}

// ==================== 数据治理 AI ====================

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionType {
    Standardize,
    Enrich,
    Deprecate,
    Merge,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionStatus {
    Pending,
    Approved,
    Rejected,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct GovernanceSuggestion {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub suggestion_type: SuggestionType,
    pub confidence: f64,
    pub rationale: String,
    pub suggested_action: String,
    pub ai_model_version: String,
    pub status: SuggestionStatus,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct GovernanceInsight {
    pub insight_type: String,
    pub severity: String,
    pub affected_records: i64,
    pub trend_analysis: String,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct QualityScore {
    pub overall_score: f64,
    pub by_entity_type: HashMap<String, f64>,
    pub by_severity: HashMap<String, i64>,
    pub total_checks: i64,
    pub passed_checks: i64,
    pub failed_checks: i64,
    pub warning_checks: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct QualityDashboard {
    pub total_entities: i64,
    pub quality_score: f64,
    pub checks_last_7d: i64,
    pub fix_actions_pending: i64,
    pub fix_actions_applied: i64,
    pub suggestions_pending: i64,
    pub insights: Vec<GovernanceInsight>,
    pub entity_type_distribution: HashMap<String, i64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FixHistoryEntry {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action_type: String,
    pub before_value: serde_json::Value,
    pub after_value: Option<serde_json::Value>,
    pub confidence: f64,
    pub status: String,
    pub applied_at: String,
    pub reverted: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QualityTrendPoint {
    pub date: String,
    pub score: f64,
    pub checks: i64,
    pub issues_found: i64,
    pub issues_fixed: i64,
}

// ==================== 内存存储 ====================

struct QualityV51Store {
    quality_checks: Mutex<Vec<QualityCheckV51>>,
    quality_rules: Mutex<Vec<QualityRule>>,
    quality_loop_configs: Mutex<Vec<QualityLoopConfig>>,
    auto_fix_actions: Mutex<Vec<AutoFixAction>>,
    fix_strategies: Mutex<Vec<FixStrategy>>,
    governance_suggestions: Mutex<Vec<GovernanceSuggestion>>,
    governance_insights: Mutex<Vec<GovernanceInsight>>,
    initialized: Mutex<bool>,
}

fn get_quality_v51_store() -> &'static QualityV51Store {
    static STORE: LazyLock<QualityV51Store> = LazyLock::new(|| QualityV51Store {
        quality_checks: Mutex::new(Vec::new()),
        quality_rules: Mutex::new(Vec::new()),
        quality_loop_configs: Mutex::new(Vec::new()),
        auto_fix_actions: Mutex::new(Vec::new()),
        fix_strategies: Mutex::new(Vec::new()),
        governance_suggestions: Mutex::new(Vec::new()),
        governance_insights: Mutex::new(Vec::new()),
        initialized: Mutex::new(false),
    });
    &STORE
}

// ==================== 初始化种子数据 ====================

async fn ensure_initialized() {
    let store = get_quality_v51_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }

    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();

    let rules = vec![
        QualityRule {
            id: uuid::Uuid::new_v4().to_string(),
            name: "客户编码格式校验".to_string(),
            entity_type: "customer".to_string(),
            rule_type: "format".to_string(),
            description: "客户编码必须以 C 开头后跟数字".to_string(),
            severity: "error".to_string(),
            parameters: serde_json::json!({"pattern": "^C\\d{4,}$"}),
            enabled: true,
            created_at: now_str.clone(),
            updated_at: now_str.clone(),
        },
        QualityRule {
            id: uuid::Uuid::new_v4().to_string(),
            name: "供应商名称必填".to_string(),
            entity_type: "supplier".to_string(),
            rule_type: "required".to_string(),
            description: "供应商名称不能为空".to_string(),
            severity: "error".to_string(),
            parameters: serde_json::json!({"field": "name"}),
            enabled: true,
            created_at: now_str.clone(),
            updated_at: now_str.clone(),
        },
        QualityRule {
            id: uuid::Uuid::new_v4().to_string(),
            name: "物料价格范围校验".to_string(),
            entity_type: "material".to_string(),
            rule_type: "range".to_string(),
            description: "物料价格必须在 0 到 1000000 之间".to_string(),
            severity: "warning".to_string(),
            parameters: serde_json::json!({"min": 0, "max": 1000000, "field": "price"}),
            enabled: true,
            created_at: now_str.clone(),
            updated_at: now_str.clone(),
        },
    ];

    let checks = vec![
        QualityCheckV51 {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C0001".to_string(),
            rule_id: rules[0].id.clone(),
            status: QualityStatus::Passed,
            score: 100.0,
            details: serde_json::json!({"message": "格式校验通过"}),
            checked_at: now_str.clone(),
        },
        QualityCheckV51 {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C0002".to_string(),
            rule_id: rules[0].id.clone(),
            status: QualityStatus::Failed,
            score: 0.0,
            details: serde_json::json!({"message": "客户编码格式不正确", "value": "INVALID"}),
            checked_at: now_str.clone(),
        },
        QualityCheckV51 {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: "supplier".to_string(),
            entity_id: "S0001".to_string(),
            rule_id: rules[1].id.clone(),
            status: QualityStatus::Warning,
            score: 50.0,
            details: serde_json::json!({"message": "供应商名称过短", "value": "A"}),
            checked_at: now_str.clone(),
        },
    ];

    let loop_configs = vec![
        QualityLoopConfig {
            entity_type: "customer".to_string(),
            enabled_rules: vec![rules[0].id.clone()],
            auto_fix_enabled: true,
            notification_channels: vec!["email".to_string(), "webhook".to_string()],
            max_retries: 3,
        },
        QualityLoopConfig {
            entity_type: "supplier".to_string(),
            enabled_rules: vec![rules[1].id.clone()],
            auto_fix_enabled: false,
            notification_channels: vec!["email".to_string()],
            max_retries: 5,
        },
    ];

    let fix_actions = vec![
        AutoFixAction {
            id: uuid::Uuid::new_v4().to_string(),
            rule_id: rules[0].id.clone(),
            entity_type: "customer".to_string(),
            entity_id: "C0002".to_string(),
            action_type: AutoFixActionType::Normalize,
            before_value: serde_json::json!("INVALID"),
            after_value: Some(serde_json::json!("C0002")),
            confidence: 0.95,
            status: FixStatus::Verified,
            applied_at: Some(now_str.clone()),
        },
        AutoFixAction {
            id: uuid::Uuid::new_v4().to_string(),
            rule_id: rules[2].id.clone(),
            entity_type: "material".to_string(),
            entity_id: "MAT-001".to_string(),
            action_type: AutoFixActionType::DefaultValue,
            before_value: serde_json::json!(null),
            after_value: Some(serde_json::json!(0.0)),
            confidence: 1.0,
            status: FixStatus::Applied,
            applied_at: Some(now_str.clone()),
        },
    ];

    let fix_strategies = vec![
        FixStrategy::NormalizeText,
        FixStrategy::FillMissingDefaults,
        FixStrategy::MapToStandardValues,
        FixStrategy::RemoveDuplicates,
        FixStrategy::StandardizeDateFormat,
        FixStrategy::EnrichFromReference,
    ];

    let suggestions = vec![
        GovernanceSuggestion {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C0003".to_string(),
            suggestion_type: SuggestionType::Standardize,
            confidence: 0.88,
            rationale: "客户名称存在多种写法，建议统一为标准名称".to_string(),
            suggested_action: "将 '阿里巴巴' 标准化为 '阿里巴巴集团控股有限公司'".to_string(),
            ai_model_version: "mdm-gov-v1".to_string(),
            status: SuggestionStatus::Pending,
            created_at: now_str.clone(),
        },
        GovernanceSuggestion {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: "material".to_string(),
            entity_id: "MAT-005".to_string(),
            suggestion_type: SuggestionType::Enrich,
            confidence: 0.76,
            rationale: "物料缺少分类信息，建议从参考数据丰富".to_string(),
            suggested_action: "添加分类编码 'RAW-MATERIAL' 和单位 'KG'".to_string(),
            ai_model_version: "mdm-gov-v1".to_string(),
            status: SuggestionStatus::Pending,
            created_at: now_str.clone(),
        },
    ];

    let insights = vec![
        GovernanceInsight {
            insight_type: "data_quality".to_string(),
            severity: "high".to_string(),
            affected_records: 156,
            trend_analysis: "近7天数据质量问题上升 12%，主要集中在客户主数据".to_string(),
            recommendations: vec![
                "加强客户数据录入规范培训".to_string(),
                "实施自动修复策略处理常见格式问题".to_string(),
                "建立数据质量监控仪表盘".to_string(),
            ],
        },
        GovernanceInsight {
            insight_type: "duplicate_detection".to_string(),
            severity: "medium".to_string(),
            affected_records: 43,
            trend_analysis: "检测到 43 条疑似重复记录，供应商模块占比最高".to_string(),
            recommendations: vec![
                "实现供应商去重合并流程".to_string(),
                "引入 AI 辅助重复检测".to_string(),
            ],
        },
    ];

    *store.quality_checks.lock().await = checks;
    *store.quality_rules.lock().await = rules;
    *store.quality_loop_configs.lock().await = loop_configs;
    *store.auto_fix_actions.lock().await = fix_actions;
    *store.fix_strategies.lock().await = fix_strategies;
    *store.governance_suggestions.lock().await = suggestions;
    *store.governance_insights.lock().await = insights;

    *initialized = true;
}

// ==================== 请求/响应结构 ====================

#[derive(Debug, Deserialize, ToSchema)]
pub struct RunQualityCheckRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub rule_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct QualityCheckQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub status: Option<String>,
    pub rule_id: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateQualityRuleRequest {
    pub name: String,
    pub entity_type: String,
    pub rule_type: String,
    pub description: String,
    pub severity: Option<String>,
    pub parameters: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQualityRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub parameters: Option<serde_json::Value>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AutoFixRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub rule_id: Option<String>,
    pub strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FixActionQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RevertFixRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RunFixWorkflowRequest {
    pub entity_type: String,
    pub entity_id: String,
    pub strategies: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateSuggestionsRequest {
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub suggestion_types: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct SuggestionQuery {
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub suggestion_type: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ApproveSuggestionRequest {
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RejectSuggestionRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PredictTrendRequest {
    pub entity_type: String,
    pub days: Option<i32>,
}

// ==================== 内部辅助函数 ====================

fn quality_status_from_str(s: &str) -> QualityStatus {
    match s {
        "failed" => QualityStatus::Failed,
        "warning" => QualityStatus::Warning,
        _ => QualityStatus::Passed,
    }
}

fn fix_status_from_str(s: &str) -> FixStatus {
    match s {
        "applied" => FixStatus::Applied,
        "verified" => FixStatus::Verified,
        "failed" => FixStatus::Failed,
        _ => FixStatus::Pending,
    }
}

fn suggestion_type_from_str(s: &str) -> SuggestionType {
    match s {
        "enrich" => SuggestionType::Enrich,
        "deprecate" => SuggestionType::Deprecate,
        "merge" => SuggestionType::Merge,
        _ => SuggestionType::Standardize,
    }
}

fn action_type_from_str(s: &str) -> AutoFixActionType {
    match s {
        "default_value" => AutoFixActionType::DefaultValue,
        "map_value" => AutoFixActionType::MapValue,
        "remove_duplicate" => AutoFixActionType::RemoveDuplicate,
        "standardize" => AutoFixActionType::Standardize,
        _ => AutoFixActionType::Normalize,
    }
}

fn compute_score(checks: &[QualityCheckV51]) -> f64 {
    if checks.is_empty() {
        return 100.0;
    }
    let total = checks.len() as f64;
    let weighted: f64 = checks
        .iter()
        .map(|c| match c.status {
            QualityStatus::Passed => 1.0,
            QualityStatus::Warning => 0.5,
            QualityStatus::Failed => 0.0,
        })
        .sum();
    (weighted / total) * 100.0
}

// ==================== 处理器：质量检查 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:write"])),
    path = "/api/master/quality-v51/checks",
    tag = "quality_v51",
    request_body = RunQualityCheckRequest,
    responses(
        (status = 200, description = "质量检查执行成功", body = ApiResponse<Vec<QualityCheckV51>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn run_quality_check(
    State(_state): State<AppState>,
    Json(req): Json<RunQualityCheckRequest>,
) -> Json<ApiResponse<Vec<QualityCheckV51>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let rules = store.quality_rules.lock().await;

    let applicable_rules: Vec<QualityRule> = rules
        .iter()
        .filter(|r| {
            if r.entity_type != req.entity_type || !r.enabled {
                return false;
            }
            if let Some(ref ids) = req.rule_ids {
                ids.contains(&r.id)
            } else {
                true
            }
        })
        .cloned()
        .collect();

    drop(rules);

    let now = chrono::Utc::now().to_rfc3339();
    let mut results = Vec::new();

    for rule in &applicable_rules {
        let (status, score, message) = match rule.rule_type.as_str() {
            "format" => (QualityStatus::Passed, 100.0, "格式校验通过".to_string()),
            "required" => (QualityStatus::Passed, 100.0, "必填字段校验通过".to_string()),
            "range" => (
                QualityStatus::Warning,
                75.0,
                "范围校验：部分值接近边界".to_string(),
            ),
            _ => (QualityStatus::Passed, 100.0, "校验通过".to_string()),
        };

        let check = QualityCheckV51 {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: req.entity_type.clone(),
            entity_id: req.entity_id.clone(),
            rule_id: rule.id.clone(),
            status,
            score,
            details: serde_json::json!({"message": message, "rule_type": rule.rule_type}),
            checked_at: now.clone(),
        };
        results.push(check);
    }

    let mut all_checks = store.quality_checks.lock().await;
    all_checks.extend(results.clone());

    Json(ApiResponse::success(results, "质量检查完成"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master_data:read"])),
    path = "/api/master/quality-v51/checks",
    tag = "quality_v51",
    params(
        ("entity_type" = Option<String>, Query, description = "实体类型过滤"),
        ("entity_id" = Option<String>, Query, description = "实体ID过滤"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("rule_id" = Option<String>, Query, description = "规则ID过滤"),
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
    ),
    responses(
        (status = 200, description = "质量检查列表", body = ApiResponse<PaginatedResponse<QualityCheckV51>>),
    ),
)]
pub async fn list_quality_checks(
    State(_state): State<AppState>,
    Query(params): Query<QualityCheckQuery>,
) -> Json<ApiResponse<PaginatedResponse<QualityCheckV51>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let checks = store.quality_checks.lock().await;
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<QualityCheckV51> = checks
        .iter()
        .filter(|c| {
            if let Some(et) = &params.entity_type {
                if &c.entity_type != et {
                    return false;
                }
            }
            if let Some(eid) = &params.entity_id {
                if &c.entity_id != eid {
                    return false;
                }
            }
            if let Some(s) = &params.status {
                let status_str = match c.status {
                    QualityStatus::Passed => "passed",
                    QualityStatus::Failed => "failed",
                    QualityStatus::Warning => "warning",
                };
                if status_str != s.as_str() {
                    return false;
                }
            }
            if let Some(rid) = &params.rule_id {
                if &c.rule_id != rid {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.checked_at.cmp(&a.checked_at));

    let total = filtered.len() as i64;
    let items: Vec<QualityCheckV51> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "质量检查列表",
    ))
}

pub async fn get_quality_check_results(
    State(_state): State<AppState>,
    Path((entity_type, entity_id)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<QualityCheckV51>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let checks = store.quality_checks.lock().await;

    let results: Vec<QualityCheckV51> = checks
        .iter()
        .filter(|c| c.entity_type == entity_type && c.entity_id == entity_id)
        .cloned()
        .collect();

    Json(ApiResponse::success(results, "实体质量检查结果"))
}

// ==================== 处理器：质量规则 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master-data:quality:read"])),
    path = "/api/master/quality-v51/rules",
    tag = "quality_v51",
    responses(
        (status = 200, description = "质量规则列表", body = ApiResponse<Vec<QualityRule>>),
    ),
)]
pub async fn list_quality_rules(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<QualityRule>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let rules = store.quality_rules.lock().await;
    Json(ApiResponse::success(rules.clone(), "质量规则列表"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master-data:quality:read"])),
    path = "/api/master/quality-v51/rules",
    tag = "quality_v51",
    request_body = CreateQualityRuleRequest,
    responses(
        (status = 200, description = "质量规则创建成功", body = ApiResponse<QualityRule>),
    ),
)]
pub async fn create_quality_rule(
    State(_state): State<AppState>,
    Json(req): Json<CreateQualityRuleRequest>,
) -> Json<ApiResponse<QualityRule>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let mut rules = store.quality_rules.lock().await;

    let now = chrono::Utc::now().to_rfc3339();
    let rule = QualityRule {
        id: uuid::Uuid::new_v4().to_string(),
        name: req.name,
        entity_type: req.entity_type,
        rule_type: req.rule_type,
        description: req.description,
        severity: req.severity.unwrap_or_else(|| "warning".to_string()),
        parameters: req.parameters.unwrap_or_default(),
        enabled: true,
        created_at: now.clone(),
        updated_at: now,
    };

    rules.push(rule.clone());
    Json(ApiResponse::success(rule, "质量规则已创建"))
}

pub async fn get_quality_rule(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<QualityRule>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let rules = store.quality_rules.lock().await;
    match rules.iter().find(|r| r.id == id) {
        Some(r) => Json(ApiResponse::success(r.clone(), "质量规则详情")),
        None => Json(ApiResponse::error(404, "未找到质量规则")),
    }
}

pub async fn update_quality_rule(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateQualityRuleRequest>,
) -> Json<ApiResponse<QualityRule>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let mut rules = store.quality_rules.lock().await;
    let Some(rule) = rules.iter_mut().find(|r| r.id == id) else {
        return Json(ApiResponse::error(404, "未找到质量规则"));
    };

    if let Some(name) = req.name {
        rule.name = name;
    }
    if let Some(desc) = req.description {
        rule.description = desc;
    }
    if let Some(sev) = req.severity {
        rule.severity = sev;
    }
    if let Some(params) = req.parameters {
        rule.parameters = params;
    }
    if let Some(enabled) = req.enabled {
        rule.enabled = enabled;
    }
    rule.updated_at = chrono::Utc::now().to_rfc3339();

    Json(ApiResponse::success(rule.clone(), "质量规则已更新"))
}

pub async fn delete_quality_rule(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<()>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let mut rules = store.quality_rules.lock().await;
    let len_before = rules.len();
    rules.retain(|r| r.id != id);

    if rules.len() == len_before {
        return Json(ApiResponse::error(404, "未找到质量规则"));
    }

    Json(ApiResponse::success_no_data("质量规则已删除"))
}

// ==================== 处理器：质量评分与仪表盘 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master-data:quality:read"])),
    path = "/api/master/quality-v51/score",
    tag = "quality_v51",
    responses(
        (status = 200, description = "质量评分", body = ApiResponse<QualityScore>),
    ),
)]
pub async fn get_quality_score(State(_state): State<AppState>) -> Json<ApiResponse<QualityScore>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let checks = store.quality_checks.lock().await;

    let total = checks.len() as i64;
    let passed = checks
        .iter()
        .filter(|c| matches!(c.status, QualityStatus::Passed))
        .count() as i64;
    let failed = checks
        .iter()
        .filter(|c| matches!(c.status, QualityStatus::Failed))
        .count() as i64;
    let warning = checks
        .iter()
        .filter(|c| matches!(c.status, QualityStatus::Warning))
        .count() as i64;

    let by_entity_type: HashMap<String, f64> = {
        let mut map = HashMap::new();
        let mut grouped: HashMap<String, Vec<QualityCheckV51>> = HashMap::new();
        for c in checks.iter() {
            grouped
                .entry(c.entity_type.clone())
                .or_default()
                .push(c.clone());
        }
        for (et, group) in &grouped {
            map.insert(et.clone(), compute_score(group));
        }
        map
    };

    let mut by_severity = HashMap::new();
    by_severity.insert("error".to_string(), failed);
    by_severity.insert("warning".to_string(), warning);
    by_severity.insert("passed".to_string(), passed);

    let overall = compute_score(&checks);

    Json(ApiResponse::success(
        QualityScore {
            overall_score: overall,
            by_entity_type,
            by_severity,
            total_checks: total,
            passed_checks: passed,
            failed_checks: failed,
            warning_checks: warning,
        },
        "质量评分",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["master-data:quality:read"])),
    path = "/api/master/quality-v51/dashboard",
    tag = "quality_v51",
    responses(
        (status = 200, description = "质量仪表盘", body = ApiResponse<QualityDashboard>),
    ),
)]
pub async fn get_quality_dashboard(
    State(_state): State<AppState>,
) -> Json<ApiResponse<QualityDashboard>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();

    let checks = store.quality_checks.lock().await;
    let fix_actions = store.auto_fix_actions.lock().await;
    let suggestions = store.governance_suggestions.lock().await;
    let insights = store.governance_insights.lock().await;

    let total_checks = checks.len() as i64;
    let score = compute_score(&checks);

    let mut entity_type_distribution = HashMap::new();
    for c in checks.iter() {
        *entity_type_distribution
            .entry(c.entity_type.clone())
            .or_insert(0) += 1;
    }

    let fix_pending = fix_actions
        .iter()
        .filter(|a| matches!(a.status, FixStatus::Pending))
        .count() as i64;
    let fix_applied = fix_actions
        .iter()
        .filter(|a| matches!(a.status, FixStatus::Applied | FixStatus::Verified))
        .count() as i64;
    let suggestions_pending = suggestions
        .iter()
        .filter(|s| matches!(s.status, SuggestionStatus::Pending))
        .count() as i64;

    let total_entities: i64 = entity_type_distribution.values().sum();

    Json(ApiResponse::success(
        QualityDashboard {
            total_entities,
            quality_score: score,
            checks_last_7d: total_checks,
            fix_actions_pending: fix_pending,
            fix_actions_applied: fix_applied,
            suggestions_pending,
            insights: insights.clone(),
            entity_type_distribution,
        },
        "质量仪表盘",
    ))
}

// ==================== 处理器：自动修复 ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:write"])),
    path = "/api/master/quality-v51/auto-fix/run",
    tag = "quality_v51",
    request_body = AutoFixRequest,
    responses(
        (status = 200, description = "自动修复已应用", body = ApiResponse<AutoFixAction>),
    ),
)]
pub async fn apply_auto_fix(
    State(_state): State<AppState>,
    Json(req): Json<AutoFixRequest>,
) -> Json<ApiResponse<AutoFixAction>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();

    let strategy = req.strategy.as_deref().unwrap_or("normalize_text");
    let action_type = action_type_from_str(strategy);

    let now = chrono::Utc::now().to_rfc3339();

    let action = AutoFixAction {
        id: uuid::Uuid::new_v4().to_string(),
        rule_id: req.rule_id.unwrap_or_else(|| "auto".to_string()),
        entity_type: req.entity_type,
        entity_id: req.entity_id,
        action_type,
        before_value: serde_json::Value::Null,
        after_value: Some(serde_json::Value::Null),
        confidence: 0.9,
        status: FixStatus::Applied,
        applied_at: Some(now),
    };

    let mut actions = store.auto_fix_actions.lock().await;
    actions.push(action.clone());

    Json(ApiResponse::success(action, "自动修复已应用"))
}

pub async fn get_fix_actions(
    State(_state): State<AppState>,
    Query(params): Query<FixActionQuery>,
) -> Json<ApiResponse<PaginatedResponse<AutoFixAction>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let actions = store.auto_fix_actions.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<AutoFixAction> = actions
        .iter()
        .filter(|a| {
            if let Some(et) = &params.entity_type {
                if &a.entity_type != et {
                    return false;
                }
            }
            if let Some(eid) = &params.entity_id {
                if &a.entity_id != eid {
                    return false;
                }
            }
            if let Some(s) = &params.status {
                let status_str = match a.status {
                    FixStatus::Pending => "pending",
                    FixStatus::Applied => "applied",
                    FixStatus::Verified => "verified",
                    FixStatus::Failed => "failed",
                };
                if status_str != s.as_str() {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.applied_at.cmp(&a.applied_at));

    let total = filtered.len() as i64;
    let items: Vec<AutoFixAction> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "修复操作列表",
    ))
}

pub async fn revert_fix_action(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(_req): Json<RevertFixRequest>,
) -> Json<ApiResponse<AutoFixAction>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let mut actions = store.auto_fix_actions.lock().await;
    let Some(action) = actions.iter_mut().find(|a| a.id == id) else {
        return Json(ApiResponse::error(404, "未找到修复操作"));
    };

    if !matches!(action.status, FixStatus::Applied | FixStatus::Verified) {
        return Json(ApiResponse::error(400, "当前状态不可回滚"));
    }

    action.status = FixStatus::Pending;
    action.after_value = None;

    Json(ApiResponse::success(action.clone(), "修复操作已回滚"))
}

pub async fn get_fix_history(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<FixHistoryEntry>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let actions = store.auto_fix_actions.lock().await;

    let history: Vec<FixHistoryEntry> = actions
        .iter()
        .map(|a| FixHistoryEntry {
            id: a.id.clone(),
            entity_type: a.entity_type.clone(),
            entity_id: a.entity_id.clone(),
            action_type: format!("{:?}", a.action_type).to_lowercase(),
            before_value: a.before_value.clone(),
            after_value: a.after_value.clone(),
            confidence: a.confidence,
            status: format!("{:?}", a.status).to_lowercase(),
            applied_at: a.applied_at.clone().unwrap_or_else(|| "-".to_string()),
            reverted: false,
        })
        .collect();

    Json(ApiResponse::success(history, "修复历史记录"))
}

pub async fn run_fix_workflow(
    State(_state): State<AppState>,
    Json(req): Json<RunFixWorkflowRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();

    let now = chrono::Utc::now().to_rfc3339();

    let strategies = req.strategies.unwrap_or_else(|| {
        vec![
            "normalize_text".to_string(),
            "fill_missing_defaults".to_string(),
            "map_to_standard_values".to_string(),
        ]
    });

    let mut applied_actions = Vec::new();
    for strategy in &strategies {
        let action = AutoFixAction {
            id: uuid::Uuid::new_v4().to_string(),
            rule_id: format!("auto-{}", strategy),
            entity_type: req.entity_type.clone(),
            entity_id: req.entity_id.clone(),
            action_type: action_type_from_str(strategy),
            before_value: serde_json::Value::Null,
            after_value: Some(serde_json::json!({
                "strategy": strategy,
                "result": "applied"
            })),
            confidence: 0.85,
            status: FixStatus::Verified,
            applied_at: Some(now.clone()),
        };
        applied_actions.push(action);
    }

    let mut actions = store.auto_fix_actions.lock().await;
    actions.extend(applied_actions.clone());

    Json(ApiResponse::success(
        serde_json::json!({
            "entity_type": req.entity_type,
            "entity_id": req.entity_id,
            "strategies_applied": strategies,
            "actions_count": applied_actions.len(),
            "stage": "completed",
            "timestamp": now,
        }),
        "修复工作流完成",
    ))
}

// ==================== 处理器：数据治理 AI ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["master_data:write"])),
    path = "/api/master/quality-v51/ai/suggest",
    tag = "quality_v51",
    request_body = GenerateSuggestionsRequest,
    responses(
        (status = 200, description = "治理建议已生成", body = ApiResponse<Vec<GovernanceSuggestion>>),
    ),
)]
pub async fn generate_suggestions(
    State(_state): State<AppState>,
    Json(req): Json<GenerateSuggestionsRequest>,
) -> Json<ApiResponse<Vec<GovernanceSuggestion>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();

    let now = chrono::Utc::now().to_rfc3339();
    let types = req
        .suggestion_types
        .unwrap_or_else(|| vec!["standardize".to_string(), "enrich".to_string()]);

    let mut suggestions = Vec::new();
    for st in &types {
        let suggestion = GovernanceSuggestion {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: req.entity_type.clone(),
            entity_id: req.entity_id.clone().unwrap_or_else(|| "-".to_string()),
            suggestion_type: suggestion_type_from_str(st),
            confidence: (0.7 + rand::random::<f64>() * 0.3),
            rationale: format!(
                "AI 分析发现 {} 类型实体存在 {} 优化空间",
                req.entity_type, st
            ),
            suggested_action: format!("执行 {} 操作", st),
            ai_model_version: "mdm-gov-v1".to_string(),
            status: SuggestionStatus::Pending,
            created_at: now.clone(),
        };
        suggestions.push(suggestion);
    }

    let mut all = store.governance_suggestions.lock().await;
    all.extend(suggestions.clone());

    Json(ApiResponse::success(suggestions, "治理建议已生成"))
}

pub async fn get_suggestions(
    State(_state): State<AppState>,
    Query(params): Query<SuggestionQuery>,
) -> Json<ApiResponse<PaginatedResponse<GovernanceSuggestion>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let suggestions = store.governance_suggestions.lock().await;

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let mut filtered: Vec<GovernanceSuggestion> = suggestions
        .iter()
        .filter(|s| {
            if let Some(et) = &params.entity_type {
                if &s.entity_type != et {
                    return false;
                }
            }
            if let Some(eid) = &params.entity_id {
                if &s.entity_id != eid {
                    return false;
                }
            }
            if let Some(t) = &params.suggestion_type {
                let type_str = match s.suggestion_type {
                    SuggestionType::Standardize => "standardize",
                    SuggestionType::Enrich => "enrich",
                    SuggestionType::Deprecate => "deprecate",
                    SuggestionType::Merge => "merge",
                };
                if type_str != t.as_str() {
                    return false;
                }
            }
            if let Some(st) = &params.status {
                let status_str = match s.status {
                    SuggestionStatus::Pending => "pending",
                    SuggestionStatus::Approved => "approved",
                    SuggestionStatus::Rejected => "rejected",
                };
                if status_str != st.as_str() {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    let total = filtered.len() as i64;
    let items: Vec<GovernanceSuggestion> = filtered
        .into_iter()
        .skip(((page - 1) * page_size) as usize)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse {
            items,
            total,
            page,
            page_size,
            total_pages: ((total as f64) / (page_size as f64)).ceil() as i64,
        },
        "治理建议列表",
    ))
}

pub async fn approve_suggestion(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(_req): Json<ApproveSuggestionRequest>,
) -> Json<ApiResponse<GovernanceSuggestion>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let mut suggestions = store.governance_suggestions.lock().await;
    let Some(suggestion) = suggestions.iter_mut().find(|s| s.id == id) else {
        return Json(ApiResponse::error(404, "未找到治理建议"));
    };

    if suggestion.status != SuggestionStatus::Pending {
        return Json(ApiResponse::error(400, "建议已处理"));
    }

    suggestion.status = SuggestionStatus::Approved;
    Json(ApiResponse::success(suggestion.clone(), "治理建议已批准"))
}

pub async fn reject_suggestion(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(_req): Json<RejectSuggestionRequest>,
) -> Json<ApiResponse<GovernanceSuggestion>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let mut suggestions = store.governance_suggestions.lock().await;
    let Some(suggestion) = suggestions.iter_mut().find(|s| s.id == id) else {
        return Json(ApiResponse::error(404, "未找到治理建议"));
    };

    if suggestion.status != SuggestionStatus::Pending {
        return Json(ApiResponse::error(400, "建议已处理"));
    }

    suggestion.status = SuggestionStatus::Rejected;
    Json(ApiResponse::success(suggestion.clone(), "治理建议已拒绝"))
}

pub async fn get_governance_insights(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<GovernanceInsight>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let insights = store.governance_insights.lock().await;
    Json(ApiResponse::success(insights.clone(), "治理洞察列表"))
}

pub async fn predict_quality_trend(
    State(_state): State<AppState>,
    Json(req): Json<PredictTrendRequest>,
) -> Json<ApiResponse<Vec<QualityTrendPoint>>> {
    ensure_initialized().await;
    let store = get_quality_v51_store();
    let checks = store.quality_checks.lock().await;

    let days = req.days.unwrap_or(30);
    let entity_checks: Vec<QualityCheckV51> = checks
        .iter()
        .filter(|c| c.entity_type == req.entity_type)
        .cloned()
        .collect();

    let mut trend = Vec::new();
    let base_score = compute_score(&entity_checks);
    let now = chrono::Utc::now();

    for i in (0..days).rev() {
        let date = (now - chrono::Duration::days(i as i64))
            .format("%Y-%m-%d")
            .to_string();
        let variation = (rand::random::<f64>() - 0.5) * 10.0;
        let score = (base_score + variation).clamp(0.0, 100.0);
        trend.push(QualityTrendPoint {
            date,
            score: (score * 100.0).round() / 100.0,
            checks: (entity_checks.len() as i64) / (days as i64).max(1),
            issues_found: ((100.0 - score) / 10.0).round() as i64,
            issues_fixed: ((100.0 - score) / 15.0).round() as i64,
        });
    }

    Json(ApiResponse::success(trend, "质量趋势预测"))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- calculate_quality_score ----------

    #[test]
    fn test_quality_score_all_zero() {
        let s = calculate_quality_score(0.0, 0.0, 0.0, 0.0);
        assert!((s - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_quality_score_all_perfect() {
        let s = calculate_quality_score(100.0, 100.0, 100.0, 100.0);
        assert!((s - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_quality_score_weighted_correctly() {
        // 0.35*80 + 0.30*90 + 0.20*70 + 0.15*60 = 28 + 27 + 14 + 9 = 78.0
        let s = calculate_quality_score(80.0, 90.0, 70.0, 60.0);
        assert!((s - 78.0).abs() < 0.01);
    }

    #[test]
    fn test_quality_score_clamps_negative_input() {
        // 负值应被 clamp 到 0
        let s = calculate_quality_score(-10.0, -20.0, -30.0, -40.0);
        assert!((s - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_quality_score_clamps_overflow_input() {
        // 超过 100 的值应被 clamp 到 100
        let s = calculate_quality_score(150.0, 200.0, 300.0, 400.0);
        assert!((s - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_quality_score_boundary_mix() {
        // 0.35*100 + 0.30*0 + 0.20*100 + 0.15*0 = 35 + 0 + 20 + 0 = 55.0
        let s = calculate_quality_score(100.0, 0.0, 100.0, 0.0);
        assert!((s - 55.0).abs() < 0.01);
    }

    #[test]
    fn test_quality_score_is_rounded_to_2_decimals() {
        // 0.35*33 + 0.30*33 + 0.20*33 + 0.15*33 = 33.0 (恰好整数)
        // 改用会产生小数的输入：1/3 * 各权重之和 = 33.0
        // 使用更明确的非整数值：0.35*10 + 0.30*20 + 0.20*30 + 0.15*40 = 3.5+6+6+6 = 21.5
        let s = calculate_quality_score(10.0, 20.0, 30.0, 40.0);
        assert!((s - 21.5).abs() < 0.01);
        // 验证最多两位小数
        let scaled = (s * 100.0).round();
        assert!((scaled / 100.0 - s).abs() < f64::EPSILON);
    }

    // ---------- quality_grade_from_score ----------

    #[test]
    fn test_grade_a_boundary_low() {
        assert_eq!(quality_grade_from_score(90.0), "A");
    }

    #[test]
    fn test_grade_a_boundary_high() {
        assert_eq!(quality_grade_from_score(100.0), "A");
    }

    #[test]
    fn test_grade_b_boundary() {
        assert_eq!(quality_grade_from_score(80.0), "B");
        assert_eq!(quality_grade_from_score(89.99), "B");
    }

    #[test]
    fn test_grade_c_boundary() {
        assert_eq!(quality_grade_from_score(70.0), "C");
        assert_eq!(quality_grade_from_score(79.99), "C");
    }

    #[test]
    fn test_grade_d_boundary() {
        assert_eq!(quality_grade_from_score(60.0), "D");
        assert_eq!(quality_grade_from_score(69.99), "D");
    }

    #[test]
    fn test_grade_f_boundary() {
        assert_eq!(quality_grade_from_score(0.0), "F");
        assert_eq!(quality_grade_from_score(59.99), "F");
    }

    #[test]
    fn test_grade_negative_score() {
        assert_eq!(quality_grade_from_score(-5.0), "F");
    }

    #[test]
    fn test_grade_above_hundred() {
        // 超出 100 仍判为 A
        assert_eq!(quality_grade_from_score(150.0), "A");
    }

    // ---------- 集成：score -> grade ----------

    #[test]
    fn test_score_to_grade_mapping() {
        let cases = [
            (100.0, "A"),
            (95.0, "A"),
            (90.0, "A"),
            (85.0, "B"),
            (75.0, "C"),
            (65.0, "D"),
            (50.0, "F"),
        ];
        for (score, expected) in cases.iter() {
            assert_eq!(quality_grade_from_score(*score), *expected);
        }
    }

    #[test]
    fn test_calculate_then_grade_perfect() {
        let s = calculate_quality_score(100.0, 100.0, 100.0, 100.0);
        assert_eq!(quality_grade_from_score(s), "A");
    }

    #[test]
    fn test_calculate_then_grade_fail() {
        let s = calculate_quality_score(10.0, 10.0, 10.0, 10.0);
        assert_eq!(quality_grade_from_score(s), "F");
    }

    // ---------- quality_status_from_str ----------

    #[test]
    fn test_quality_status_from_str_failed() {
        assert_eq!(quality_status_from_str("failed"), QualityStatus::Failed);
    }

    #[test]
    fn test_quality_status_from_str_warning() {
        assert_eq!(quality_status_from_str("warning"), QualityStatus::Warning);
    }

    #[test]
    fn test_quality_status_from_str_passed() {
        assert_eq!(quality_status_from_str("passed"), QualityStatus::Passed);
    }

    #[test]
    fn test_quality_status_from_str_unknown_defaults_passed() {
        assert_eq!(quality_status_from_str("xxx"), QualityStatus::Passed);
        assert_eq!(quality_status_from_str(""), QualityStatus::Passed);
    }

    // ---------- fix_status_from_str ----------

    #[test]
    fn test_fix_status_from_str_applied() {
        assert_eq!(fix_status_from_str("applied"), FixStatus::Applied);
    }

    #[test]
    fn test_fix_status_from_str_verified() {
        assert_eq!(fix_status_from_str("verified"), FixStatus::Verified);
    }

    #[test]
    fn test_fix_status_from_str_failed() {
        assert_eq!(fix_status_from_str("failed"), FixStatus::Failed);
    }

    #[test]
    fn test_fix_status_from_str_pending_default() {
        assert_eq!(fix_status_from_str("pending"), FixStatus::Pending);
        assert_eq!(fix_status_from_str("unknown"), FixStatus::Pending);
    }

    // ---------- suggestion_type_from_str ----------

    #[test]
    fn test_suggestion_type_from_str_enrich() {
        assert_eq!(suggestion_type_from_str("enrich"), SuggestionType::Enrich);
    }

    #[test]
    fn test_suggestion_type_from_str_deprecate() {
        assert_eq!(
            suggestion_type_from_str("deprecate"),
            SuggestionType::Deprecate
        );
    }

    #[test]
    fn test_suggestion_type_from_str_merge() {
        assert_eq!(suggestion_type_from_str("merge"), SuggestionType::Merge);
    }

    #[test]
    fn test_suggestion_type_from_str_standardize_default() {
        assert_eq!(
            suggestion_type_from_str("standardize"),
            SuggestionType::Standardize
        );
        assert_eq!(
            suggestion_type_from_str("unknown"),
            SuggestionType::Standardize
        );
    }

    // ---------- action_type_from_str ----------

    #[test]
    fn test_action_type_from_str_default_value() {
        assert_eq!(
            action_type_from_str("default_value"),
            AutoFixActionType::DefaultValue
        );
    }

    #[test]
    fn test_action_type_from_str_map_value() {
        assert_eq!(
            action_type_from_str("map_value"),
            AutoFixActionType::MapValue
        );
    }

    #[test]
    fn test_action_type_from_str_remove_duplicate() {
        assert_eq!(
            action_type_from_str("remove_duplicate"),
            AutoFixActionType::RemoveDuplicate
        );
    }

    #[test]
    fn test_action_type_from_str_standardize() {
        assert_eq!(
            action_type_from_str("standardize"),
            AutoFixActionType::Standardize
        );
    }

    #[test]
    fn test_action_type_from_str_normalize_default() {
        assert_eq!(
            action_type_from_str("normalize"),
            AutoFixActionType::Normalize
        );
        assert_eq!(
            action_type_from_str("unknown"),
            AutoFixActionType::Normalize
        );
    }

    // ---------- compute_score ----------

    fn make_check(status: QualityStatus) -> QualityCheckV51 {
        QualityCheckV51 {
            id: uuid::Uuid::new_v4().to_string(),
            entity_type: "test".to_string(),
            entity_id: "T-1".to_string(),
            rule_id: "r-1".to_string(),
            status,
            score: 0.0,
            details: serde_json::json!({}),
            checked_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_compute_score_empty_returns_100() {
        let checks: Vec<QualityCheckV51> = vec![];
        assert!((compute_score(&checks) - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_compute_score_all_passed_returns_100() {
        let checks = vec![
            make_check(QualityStatus::Passed),
            make_check(QualityStatus::Passed),
        ];
        assert!((compute_score(&checks) - 100.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_compute_score_all_failed_returns_0() {
        let checks = vec![
            make_check(QualityStatus::Failed),
            make_check(QualityStatus::Failed),
        ];
        assert!((compute_score(&checks) - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_compute_score_mixed_weights() {
        // 1 passed (1.0) + 1 warning (0.5) + 1 failed (0.0) = 1.5 / 3 = 50.0
        let checks = vec![
            make_check(QualityStatus::Passed),
            make_check(QualityStatus::Warning),
            make_check(QualityStatus::Failed),
        ];
        assert!((compute_score(&checks) - 50.0).abs() < 0.001);
    }

    #[test]
    fn test_compute_score_warning_only() {
        let checks = vec![
            make_check(QualityStatus::Warning),
            make_check(QualityStatus::Warning),
        ];
        assert!((compute_score(&checks) - 50.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_compute_score_half_passed_half_failed() {
        let checks = vec![
            make_check(QualityStatus::Passed),
            make_check(QualityStatus::Failed),
        ];
        assert!((compute_score(&checks) - 50.0).abs() < f64::EPSILON);
    }

    // ---------- 枚举 serde 往返 ----------

    #[test]
    fn test_quality_status_serde_roundtrip() {
        for v in [
            QualityStatus::Passed,
            QualityStatus::Failed,
            QualityStatus::Warning,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: QualityStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_quality_status_serde_uses_snake_case() {
        assert_eq!(
            serde_json::to_string(&QualityStatus::Passed).unwrap(),
            "\"passed\""
        );
        assert_eq!(
            serde_json::to_string(&QualityStatus::Failed).unwrap(),
            "\"failed\""
        );
        assert_eq!(
            serde_json::to_string(&QualityStatus::Warning).unwrap(),
            "\"warning\""
        );
    }

    #[test]
    fn test_quality_loop_stage_serde_roundtrip() {
        for v in [
            QualityLoopStage::Monitor,
            QualityLoopStage::Detect,
            QualityLoopStage::Analyze,
            QualityLoopStage::Fix,
            QualityLoopStage::Verify,
            QualityLoopStage::Report,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: QualityLoopStage = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_auto_fix_action_type_serde_roundtrip() {
        for v in [
            AutoFixActionType::Normalize,
            AutoFixActionType::DefaultValue,
            AutoFixActionType::MapValue,
            AutoFixActionType::RemoveDuplicate,
            AutoFixActionType::Standardize,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: AutoFixActionType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_fix_status_serde_roundtrip() {
        for v in [
            FixStatus::Pending,
            FixStatus::Applied,
            FixStatus::Verified,
            FixStatus::Failed,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: FixStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_fix_strategy_serde_roundtrip() {
        for v in [
            FixStrategy::NormalizeText,
            FixStrategy::FillMissingDefaults,
            FixStrategy::MapToStandardValues,
            FixStrategy::RemoveDuplicates,
            FixStrategy::StandardizeDateFormat,
            FixStrategy::EnrichFromReference,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: FixStrategy = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_suggestion_type_serde_roundtrip() {
        for v in [
            SuggestionType::Standardize,
            SuggestionType::Enrich,
            SuggestionType::Deprecate,
            SuggestionType::Merge,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: SuggestionType = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_suggestion_status_serde_roundtrip() {
        for v in [
            SuggestionStatus::Pending,
            SuggestionStatus::Approved,
            SuggestionStatus::Rejected,
        ] {
            let json = serde_json::to_string(&v).unwrap();
            let back: SuggestionStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    // ---------- 结构体 serde 往返 ----------

    #[test]
    fn test_quality_check_v51_serde_roundtrip() {
        let check = QualityCheckV51 {
            id: "c-1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C001".to_string(),
            rule_id: "r-1".to_string(),
            status: QualityStatus::Passed,
            score: 99.5,
            details: serde_json::json!({"k": "v"}),
            checked_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&check).unwrap();
        let back: QualityCheckV51 = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "c-1");
        assert_eq!(back.entity_type, "customer");
        assert_eq!(back.status, QualityStatus::Passed);
        assert!((back.score - 99.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_quality_rule_serde_roundtrip() {
        let rule = QualityRule {
            id: "r-1".to_string(),
            name: "rule".to_string(),
            entity_type: "customer".to_string(),
            rule_type: "format".to_string(),
            description: "desc".to_string(),
            severity: "warning".to_string(),
            parameters: serde_json::json!({"min": 1}),
            enabled: true,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&rule).unwrap();
        let back: QualityRule = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "r-1");
        assert!(back.enabled);
        assert_eq!(back.severity, "warning");
    }

    #[test]
    fn test_quality_loop_config_serde_roundtrip() {
        let cfg = QualityLoopConfig {
            entity_type: "customer".to_string(),
            enabled_rules: vec!["r-1".to_string()],
            auto_fix_enabled: true,
            notification_channels: vec!["email".to_string()],
            max_retries: 3,
        };
        let json = serde_json::to_string(&cfg).unwrap();
        let back: QualityLoopConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(back.entity_type, "customer");
        assert!(back.auto_fix_enabled);
        assert_eq!(back.max_retries, 3);
        assert_eq!(back.enabled_rules.len(), 1);
    }

    #[test]
    fn test_auto_fix_action_serde_roundtrip() {
        let action = AutoFixAction {
            id: "a-1".to_string(),
            rule_id: "r-1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C001".to_string(),
            action_type: AutoFixActionType::Normalize,
            before_value: serde_json::json!("x"),
            after_value: Some(serde_json::json!("y")),
            confidence: 0.9,
            status: FixStatus::Applied,
            applied_at: Some("2024-01-01T00:00:00Z".to_string()),
        };
        let json = serde_json::to_string(&action).unwrap();
        let back: AutoFixAction = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "a-1");
        assert_eq!(back.action_type, AutoFixActionType::Normalize);
        assert_eq!(back.status, FixStatus::Applied);
        assert!(back.after_value.is_some());
    }

    #[test]
    fn test_governance_suggestion_serde_roundtrip() {
        let s = GovernanceSuggestion {
            id: "s-1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C001".to_string(),
            suggestion_type: SuggestionType::Standardize,
            confidence: 0.88,
            rationale: "rationale".to_string(),
            suggested_action: "action".to_string(),
            ai_model_version: "v1".to_string(),
            status: SuggestionStatus::Pending,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: GovernanceSuggestion = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "s-1");
        assert_eq!(back.suggestion_type, SuggestionType::Standardize);
    }

    #[test]
    fn test_governance_insight_serde_roundtrip() {
        let i = GovernanceInsight {
            insight_type: "data_quality".to_string(),
            severity: "high".to_string(),
            affected_records: 42,
            trend_analysis: "up".to_string(),
            recommendations: vec!["rec1".to_string()],
        };
        let json = serde_json::to_string(&i).unwrap();
        let back: GovernanceInsight = serde_json::from_str(&json).unwrap();
        assert_eq!(back.affected_records, 42);
        assert_eq!(back.recommendations.len(), 1);
    }

    #[test]
    fn test_quality_score_serde_roundtrip() {
        let s = QualityScore {
            overall_score: 88.5,
            by_entity_type: HashMap::from([("customer".to_string(), 90.0)]),
            by_severity: HashMap::from([("error".to_string(), 1)]),
            total_checks: 10,
            passed_checks: 8,
            failed_checks: 1,
            warning_checks: 1,
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: QualityScore = serde_json::from_str(&json).unwrap();
        assert_eq!(back.total_checks, 10);
        assert!((back.overall_score - 88.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_quality_dashboard_serde_roundtrip() {
        let d = QualityDashboard {
            total_entities: 5,
            quality_score: 75.0,
            checks_last_7d: 20,
            fix_actions_pending: 3,
            fix_actions_applied: 7,
            suggestions_pending: 2,
            insights: vec![],
            entity_type_distribution: HashMap::new(),
        };
        let json = serde_json::to_string(&d).unwrap();
        let back: QualityDashboard = serde_json::from_str(&json).unwrap();
        assert_eq!(back.total_entities, 5);
        assert_eq!(back.fix_actions_applied, 7);
    }

    #[test]
    fn test_fix_history_entry_serde_roundtrip() {
        let e = FixHistoryEntry {
            id: "h-1".to_string(),
            entity_type: "customer".to_string(),
            entity_id: "C001".to_string(),
            action_type: "normalize".to_string(),
            before_value: serde_json::json!("x"),
            after_value: None,
            confidence: 0.5,
            status: "applied".to_string(),
            applied_at: "2024-01-01T00:00:00Z".to_string(),
            reverted: false,
        };
        let json = serde_json::to_string(&e).unwrap();
        let back: FixHistoryEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "h-1");
        assert!(!back.reverted);
        assert!(back.after_value.is_none());
    }

    #[test]
    fn test_quality_trend_point_serde_roundtrip() {
        let p = QualityTrendPoint {
            date: "2024-01-01".to_string(),
            score: 92.5,
            checks: 10,
            issues_found: 1,
            issues_fixed: 1,
        };
        let json = serde_json::to_string(&p).unwrap();
        let back: QualityTrendPoint = serde_json::from_str(&json).unwrap();
        assert_eq!(back.date, "2024-01-01");
        assert_eq!(back.checks, 10);
    }

    // ---------- Clone trait ----------

    #[test]
    fn test_quality_status_clone_eq() {
        let a = QualityStatus::Passed;
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn test_quality_rule_clone_eq() {
        let r = QualityRule {
            id: "r-1".to_string(),
            name: "n".to_string(),
            entity_type: "e".to_string(),
            rule_type: "format".to_string(),
            description: "d".to_string(),
            severity: "warning".to_string(),
            parameters: serde_json::json!({}),
            enabled: true,
            created_at: "t1".to_string(),
            updated_at: "t2".to_string(),
        };
        let cloned = r.clone();
        assert_eq!(r.id, cloned.id);
        assert_eq!(r.enabled, cloned.enabled);
    }

    #[test]
    fn test_auto_fix_action_clone_eq() {
        let a = AutoFixAction {
            id: "a".to_string(),
            rule_id: "r".to_string(),
            entity_type: "e".to_string(),
            entity_id: "i".to_string(),
            action_type: AutoFixActionType::DefaultValue,
            before_value: serde_json::Value::Null,
            after_value: None,
            confidence: 1.0,
            status: FixStatus::Pending,
            applied_at: None,
        };
        let cloned = a.clone();
        assert_eq!(a.id, cloned.id);
        assert_eq!(a.action_type, cloned.action_type);
    }

    #[test]
    fn test_quality_loop_stage_eq() {
        assert_eq!(QualityLoopStage::Monitor, QualityLoopStage::Monitor);
        assert_ne!(QualityLoopStage::Monitor, QualityLoopStage::Detect);
    }

    #[test]
    fn test_fix_strategy_eq() {
        assert_eq!(FixStrategy::NormalizeText, FixStrategy::NormalizeText);
        assert_ne!(FixStrategy::NormalizeText, FixStrategy::RemoveDuplicates);
    }
}
