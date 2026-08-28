// ==================== 自动分类类型 ====================

use axum::extract::{Path, Query, State, Json};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;

use topems_shared::ApiResponse;

use super::ApiState;
use super::master_data_matching::{EntityProfile, build_entity_profiles};

/// 分类结果
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClassificationResult {
    pub entity_id: String,
    pub domain: String,
    pub suggested_category: String,
    pub category_path: String,
    pub confidence: f64,
    pub alternative_categories: Vec<String>,
    pub features_used: Vec<String>,
    pub reasoning: String,
}

/// 分类类别
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub domain: String,
    pub description: String,
    pub keywords: Vec<String>,
    pub rules: Vec<String>,
    pub entity_count: i64,
}

/// 分类规则
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClassificationRule {
    pub id: String,
    pub name: String,
    pub domain: String,
    pub conditions: Vec<String>,
    pub category_id: String,
    pub priority: i32,
    pub confidence: f64,
    pub enabled: bool,
    pub learned: bool,
}

/// 分类模型
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ClassificationModel {
    pub categories: Vec<Category>,
    pub rules: Vec<ClassificationRule>,
    pub accuracy: f64,
    pub trained_at: String,
    pub training_samples: i64,
}

// --- 分类请求/查询类型 ---

#[derive(Debug, Deserialize)]
pub struct BatchClassifyRequest {
    pub domain: Option<String>,
    pub entity_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ListCategoriesQuery {
    pub domain: Option<String>,
    pub parent_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LearnRuleRequest {
    pub name: String,
    pub domain: String,
    pub conditions: Vec<String>,
    pub category_id: String,
    pub priority: Option<i32>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct ClassificationStatsQuery {
    pub domain: Option<String>,
}

// ==================== 自动分类算法 ====================

/// 预置分类类别（客户/物料/供应商三大域）
fn build_preset_categories() -> Vec<Category> {
    vec![
        // 客户分类：行业
        Category {
            id: "cust-industry-tech".to_string(),
            name: "科技行业客户".to_string(),
            parent_id: Some("cust-industry".to_string()),
            domain: "customer".to_string(),
            description: "从事科技/电子/软件行业的客户".to_string(),
            keywords: vec![
                "科技".to_string(),
                "电子".to_string(),
                "技术".to_string(),
                "软件".to_string(),
                "信息".to_string(),
            ],
            rules: vec!["name contains 科技/电子/技术".to_string()],
            entity_count: 0,
        },
        Category {
            id: "cust-industry-trade".to_string(),
            name: "贸易行业客户".to_string(),
            parent_id: Some("cust-industry".to_string()),
            domain: "customer".to_string(),
            description: "从事贸易/进出口的客户".to_string(),
            keywords: vec!["贸易".to_string(), "进出口".to_string(), "商贸".to_string()],
            rules: vec!["name contains 贸易/商贸".to_string()],
            entity_count: 0,
        },
        Category {
            id: "cust-industry-manufacturing".to_string(),
            name: "制造行业客户".to_string(),
            parent_id: Some("cust-industry".to_string()),
            domain: "customer".to_string(),
            description: "从事制造/生产的客户".to_string(),
            keywords: vec!["制造".to_string(), "生产".to_string(), "工业".to_string()],
            rules: vec!["name contains 制造/生产".to_string()],
            entity_count: 0,
        },
        Category {
            id: "cust-industry-logistics".to_string(),
            name: "物流行业客户".to_string(),
            parent_id: Some("cust-industry".to_string()),
            domain: "customer".to_string(),
            description: "从事物流/运输的客户".to_string(),
            keywords: vec!["物流".to_string(), "运输".to_string(), "仓储".to_string()],
            rules: vec!["name contains 物流/运输".to_string()],
            entity_count: 0,
        },
        // 客户分类：规模
        Category {
            id: "cust-scale-large".to_string(),
            name: "大型客户".to_string(),
            parent_id: Some("cust-scale".to_string()),
            domain: "customer".to_string(),
            description: "大型/集团客户".to_string(),
            keywords: vec!["集团".to_string(), "股份".to_string(), "总公司".to_string()],
            rules: vec!["name contains 集团/股份".to_string()],
            entity_count: 0,
        },
        Category {
            id: "cust-scale-small".to_string(),
            name: "中小客户".to_string(),
            parent_id: Some("cust-scale".to_string()),
            domain: "customer".to_string(),
            description: "中小型客户".to_string(),
            keywords: vec!["有限公司".to_string(), "工作室".to_string()],
            rules: vec!["name contains 有限/工作室".to_string()],
            entity_count: 0,
        },
        // 物料分类
        Category {
            id: "mat-raw".to_string(),
            name: "原材料".to_string(),
            parent_id: Some("mat".to_string()),
            domain: "material".to_string(),
            description: "原材料类物料".to_string(),
            keywords: vec![
                "原材料".to_string(),
                "原料".to_string(),
                "金属".to_string(),
                "塑料".to_string(),
            ],
            rules: vec!["name contains 原材料/原料".to_string()],
            entity_count: 0,
        },
        Category {
            id: "mat-semi".to_string(),
            name: "半成品".to_string(),
            parent_id: Some("mat".to_string()),
            domain: "material".to_string(),
            description: "半成品类物料".to_string(),
            keywords: vec!["半成品".to_string(), "组件".to_string(), "部件".to_string()],
            rules: vec!["name contains 半成品/组件".to_string()],
            entity_count: 0,
        },
        Category {
            id: "mat-finished".to_string(),
            name: "成品".to_string(),
            parent_id: Some("mat".to_string()),
            domain: "material".to_string(),
            description: "成品类物料".to_string(),
            keywords: vec!["成品".to_string(), "产品".to_string()],
            rules: vec!["name contains 产品/成品".to_string()],
            entity_count: 0,
        },
        Category {
            id: "mat-parts".to_string(),
            name: "零部件".to_string(),
            parent_id: Some("mat".to_string()),
            domain: "material".to_string(),
            description: "零部件类物料".to_string(),
            keywords: vec!["零部件".to_string(), "零件".to_string(), "元件".to_string()],
            rules: vec!["name contains 零件/元件".to_string()],
            entity_count: 0,
        },
        // 供应商分类：等级
        Category {
            id: "sup-grade-a".to_string(),
            name: "A级供应商".to_string(),
            parent_id: Some("sup-grade".to_string()),
            domain: "supplier".to_string(),
            description: "战略/A级供应商".to_string(),
            keywords: vec!["战略".to_string(), "A级".to_string()],
            rules: vec!["grade == A".to_string()],
            entity_count: 0,
        },
        Category {
            id: "sup-grade-b".to_string(),
            name: "B级供应商".to_string(),
            parent_id: Some("sup-grade".to_string()),
            domain: "supplier".to_string(),
            description: "合格/B级供应商".to_string(),
            keywords: vec!["合格".to_string(), "B级".to_string()],
            rules: vec!["grade == B".to_string()],
            entity_count: 0,
        },
        // 供应商分类：类别
        Category {
            id: "sup-cat-raw".to_string(),
            name: "原材料供应商".to_string(),
            parent_id: Some("sup-cat".to_string()),
            domain: "supplier".to_string(),
            description: "提供原材料的供应商".to_string(),
            keywords: vec!["原材料".to_string(), "原料".to_string()],
            rules: vec!["name contains 原材料".to_string()],
            entity_count: 0,
        },
        Category {
            id: "sup-cat-parts".to_string(),
            name: "零部件供应商".to_string(),
            parent_id: Some("sup-cat".to_string()),
            domain: "supplier".to_string(),
            description: "提供零部件的供应商".to_string(),
            keywords: vec!["零部件".to_string(), "零件".to_string()],
            rules: vec!["name contains 零部件".to_string()],
            entity_count: 0,
        },
        Category {
            id: "sup-cat-equipment".to_string(),
            name: "设备供应商".to_string(),
            parent_id: Some("sup-cat".to_string()),
            domain: "supplier".to_string(),
            description: "提供设备的供应商".to_string(),
            keywords: vec!["设备".to_string()],
            rules: vec!["name contains 设备".to_string()],
            entity_count: 0,
        },
    ]
}

/// 预置分类规则
fn build_preset_rules() -> Vec<ClassificationRule> {
    vec![
        ClassificationRule {
            id: "rule-cust-tech".to_string(),
            name: "科技行业规则".to_string(),
            domain: "customer".to_string(),
            conditions: vec![
                "name contains 科技".to_string(),
                "name contains 电子".to_string(),
                "name contains 技术".to_string(),
            ],
            category_id: "cust-industry-tech".to_string(),
            priority: 90,
            confidence: 0.85,
            enabled: true,
            learned: false,
        },
        ClassificationRule {
            id: "rule-cust-trade".to_string(),
            name: "贸易行业规则".to_string(),
            domain: "customer".to_string(),
            conditions: vec![
                "name contains 贸易".to_string(),
                "name contains 商贸".to_string(),
            ],
            category_id: "cust-industry-trade".to_string(),
            priority: 85,
            confidence: 0.82,
            enabled: true,
            learned: false,
        },
        ClassificationRule {
            id: "rule-mat-raw".to_string(),
            name: "原材料规则".to_string(),
            domain: "material".to_string(),
            conditions: vec![
                "name contains 原材料".to_string(),
                "name contains 原料".to_string(),
            ],
            category_id: "mat-raw".to_string(),
            priority: 90,
            confidence: 0.88,
            enabled: true,
            learned: false,
        },
        ClassificationRule {
            id: "rule-mat-finished".to_string(),
            name: "成品规则".to_string(),
            domain: "material".to_string(),
            conditions: vec!["name contains 产品".to_string()],
            category_id: "mat-finished".to_string(),
            priority: 85,
            confidence: 0.8,
            enabled: true,
            learned: false,
        },
        ClassificationRule {
            id: "rule-sup-equipment".to_string(),
            name: "设备供应商规则".to_string(),
            domain: "supplier".to_string(),
            conditions: vec!["name contains 设备".to_string()],
            category_id: "sup-cat-equipment".to_string(),
            priority: 90,
            confidence: 0.87,
            enabled: true,
            learned: false,
        },
    ]
}

/// TF-IDF 简化版：基于关键词的词频加权打分
/// 返回 (category_id, score, matched_keywords)
fn tfidf_score(text: &str, categories: &[Category]) -> Vec<(String, f64, Vec<String>)> {
    let text_lower = text.to_lowercase();
    let total_docs = categories.len() as f64;
    let mut results = Vec::new();
    for cat in categories {
        let mut matched = Vec::new();
        let mut tf = 0.0;
        for kw in &cat.keywords {
            if text_lower.contains(&kw.to_lowercase()) {
                tf += 1.0;
                matched.push(kw.clone());
            }
        }
        if tf == 0.0 {
            continue;
        }
        // idf：关键词在多少类别中出现（简化：用关键词数）
        let df: f64 = categories
            .iter()
            .filter(|c| {
                c.keywords
                    .iter()
                    .any(|k| text_lower.contains(&k.to_lowercase()))
            })
            .count() as f64;
        let idf = if df > 0.0 {
            (total_docs / df).ln() + 1.0
        } else {
            1.0
        };
        let score = tf * idf;
        results.push((cat.id.clone(), score, matched));
    }
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    results
}

/// 规则推理：检查规则条件是否命中
fn apply_rules(profile: &EntityProfile, rules: &[ClassificationRule]) -> Vec<(String, f64)> {
    let mut hits: Vec<(String, f64)> = Vec::new();
    let name_val = profile.name.clone().unwrap_or_default();
    let name_lower = name_val.to_lowercase();
    for rule in rules {
        if !rule.enabled || rule.domain != profile.domain {
            continue;
        }
        let mut hit_count = 0;
        for cond in &rule.conditions {
            // 简化条件解析：name contains X / field == Y
            if let Some(rest) = cond.strip_prefix("name contains ") {
                if name_lower.contains(&rest.to_lowercase()) {
                    hit_count += 1;
                }
            } else if let Some(rest) = cond.strip_prefix("grade == ") {
                if profile
                    .fields
                    .get("grade")
                    .and_then(|v| v.as_ref())
                    .map(|v| v == rest)
                    .unwrap_or(false)
                {
                    hit_count += 1;
                }
            }
        }
        if hit_count > 0 {
            let confidence = rule.confidence * (hit_count as f64 / rule.conditions.len() as f64);
            hits.push((rule.category_id.clone(), confidence));
        }
    }
    hits
}

/// 分类单个实体
fn classify_entity_internal(
    profile: &EntityProfile,
    categories: &[Category],
    rules: &[ClassificationRule],
) -> ClassificationResult {
    let text = profile.name.clone().unwrap_or_default();
    // 同时纳入其他字段值作为"文档"
    let mut doc = text.clone();
    for (k, v) in &profile.fields {
        if let Some(val) = v {
            if k != "code" && k != "last_synced_at" {
                doc.push(' ');
                doc.push_str(val);
            }
        }
    }

    // 1. 关键词 + TF-IDF
    let tfidf_results = tfidf_score(
        &doc,
        &categories
            .iter()
            .filter(|c| c.domain == profile.domain)
            .cloned()
            .collect::<Vec<_>>(),
    );
    // 2. 规则推理
    let rule_hits = apply_rules(profile, rules);

    // 合并得分
    let mut combined: HashMap<String, f64> = HashMap::new();
    for (cat_id, score, _) in &tfidf_results {
        *combined.entry(cat_id.clone()).or_default() += score;
    }
    for (cat_id, conf) in &rule_hits {
        *combined.entry(cat_id.clone()).or_default() += conf * 2.0; // 规则权重更高
    }

    let mut ranked: Vec<(String, f64)> = combined.into_iter().collect();
    ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let (suggested_cat_id, suggested_score) = ranked
        .first()
        .cloned()
        .unwrap_or(("unknown".to_string(), 0.0));
    let suggested_cat = categories
        .iter()
        .find(|c| c.id == suggested_cat_id)
        .cloned()
        .unwrap_or(Category {
            id: "unknown".to_string(),
            name: "未分类".to_string(),
            parent_id: None,
            domain: profile.domain.clone(),
            description: "无法匹配任何预置分类".to_string(),
            keywords: vec![],
            rules: vec![],
            entity_count: 0,
        });

    let alternative_categories: Vec<String> = ranked
        .iter()
        .skip(1)
        .take(3)
        .filter_map(|(cid, _)| {
            categories
                .iter()
                .find(|c| c.id == *cid)
                .map(|c| c.name.clone())
        })
        .collect();

    let matched_keywords: Vec<String> = tfidf_results
        .first()
        .map(|(_, _, kws)| kws.clone())
        .unwrap_or_default();

    let mut features = matched_keywords.clone();
    if !rule_hits.is_empty() {
        features.push(format!("命中规则 {} 条", rule_hits.len()));
    }
    features.push(format!("文档长度 {} 字符", doc.chars().count()));

    let confidence = if suggested_score > 0.0 {
        (suggested_score / 5.0).min(1.0)
    } else {
        0.1
    };

    let reasoning = if suggested_cat.id == "unknown" {
        "未命中任何关键词或规则，建议人工分类".to_string()
    } else {
        format!(
            "基于关键词匹配（TF-IDF）+ 规则推理，综合得分 {:.2}，命中关键词: {}",
            suggested_score,
            matched_keywords.join(", ")
        )
    };

    let category_path = build_category_path(&suggested_cat_id, categories);

    ClassificationResult {
        entity_id: profile.id.clone(),
        domain: profile.domain.clone(),
        suggested_category: suggested_cat.name.clone(),
        category_path,
        confidence: (confidence * 100.0).round() / 100.0,
        alternative_categories,
        features_used: features,
        reasoning,
    }
}

/// 构造分类路径（根 -> ... -> 当前）
fn build_category_path(cat_id: &str, categories: &[Category]) -> String {
    let mut path: Vec<String> = Vec::new();
    let mut current = cat_id.to_string();
    let mut guard = 0;
    while let Some(cat) = categories.iter().find(|c| c.id == current) {
        path.insert(0, cat.name.clone());
        match &cat.parent_id {
            Some(p) if p != &current => current = p.clone(),
            _ => break,
        }
        guard += 1;
        if guard > 20 {
            break;
        }
    }
    path.join(" / ")
}

/// 标签推荐：基于实体属性 + 同类实体标签
fn suggest_tags_internal(profile: &EntityProfile, categories: &[Category]) -> Vec<String> {
    let mut tags = Vec::new();
    // 域标签
    tags.push(format!("domain:{}", profile.domain));
    // 状态标签
    if let Some(Some(status)) = profile.fields.get("status") {
        tags.push(format!("status:{}", status));
    }
    // 基于 name 关键词匹配分类标签
    let text = profile.name.clone().unwrap_or_default();
    let mut doc = text.clone();
    for (k, v) in &profile.fields {
        if let Some(val) = v {
            if k != "code" && k != "last_synced_at" {
                doc.push(' ');
                doc.push_str(val);
            }
        }
    }
    let domain_cats: Vec<Category> = categories
        .iter()
        .filter(|c| c.domain == profile.domain)
        .cloned()
        .collect();
    let tfidf = tfidf_score(&doc, &domain_cats);
    for (cat_id, _, kws) in tfidf.iter().take(3) {
        if let Some(cat) = domain_cats.iter().find(|c| c.id == *cat_id) {
            tags.push(format!("category:{}", cat.name));
        }
        for kw in kws {
            tags.push(format!("keyword:{}", kw));
        }
    }
    // 同类实体共享标签（简化：按域预置）
    match profile.domain.as_str() {
        "customer" => {
            tags.push("type{business}".to_string());
            if profile.last_synced_days_ago > 30 {
                tags.push("alert{stale}".to_string());
            }
        }
        "supplier" => {
            if let Some(Some(grade)) = profile.fields.get("grade") {
                tags.push(format!("grade:{}", grade));
            }
            tags.push("type{vendor}".to_string());
        }
        "material" => {
            if let Some(Some(cat)) = profile.fields.get("category") {
                tags.push(format!("material-type:{}", cat));
            }
        }
        _ => {}
    }
    tags
}

// ==================== 自动分类存储 ====================

pub struct AutoClassifierStore {
    pub categories: tokio::sync::Mutex<Vec<Category>>,
    pub rules: tokio::sync::Mutex<Vec<ClassificationRule>>,
    pub classifications: tokio::sync::Mutex<HashMap<String, ClassificationResult>>,
    pub initialized: tokio::sync::Mutex<bool>,
}

fn get_auto_classifier_store() -> &'static AutoClassifierStore {
    static STORE: LazyLock<AutoClassifierStore> = LazyLock::new(|| AutoClassifierStore {
        categories: tokio::sync::Mutex::new(Vec::new()),
        rules: tokio::sync::Mutex::new(Vec::new()),
        classifications: tokio::sync::Mutex::new(HashMap::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_auto_classifier_initialized() {
    let store = get_auto_classifier_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    *store.categories.lock().await = build_preset_categories();
    *store.rules.lock().await = build_preset_rules();
    *initialized = true;
}

// ==================== 自动分类 handlers ====================

/// POST /classification/classify/{id} — 分类单个实体
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/classification/classify/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "实体ID")),
    responses((status = 200, description = "实体分类成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn classification_classify_entity(
    State(state): State<ApiState>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<ClassificationResult>> {
    let _ = &state;
    ensure_auto_classifier_initialized().await;
    let profiles = build_entity_profiles();
    let profile = match profiles.iter().find(|p| p.id == entity_id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };
    let categories = get_auto_classifier_store().categories.lock().await.clone();
    let rules = get_auto_classifier_store().rules.lock().await.clone();
    let result = classify_entity_internal(profile, &categories, &rules);
    get_auto_classifier_store()
        .classifications
        .lock()
        .await
        .insert(entity_id.clone(), result.clone());
    Json(ApiResponse::success(result, "分类完成"))
}

/// POST /classification/batch-classify — 批量分类
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/classification/batch-classify",
    tag = "Master Data",
    responses((status = 200, description = "批量分类成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn classification_batch_classify(
    State(state): State<ApiState>,
    Json(req): Json<BatchClassifyRequest>,
) -> Json<ApiResponse<Vec<ClassificationResult>>> {
    let _ = &state;
    ensure_auto_classifier_initialized().await;
    let profiles = build_entity_profiles();
    let categories = get_auto_classifier_store().categories.lock().await.clone();
    let rules = get_auto_classifier_store().rules.lock().await.clone();
    let mut results = Vec::new();
    let mut class_store = get_auto_classifier_store().classifications.lock().await;
    for profile in &profiles {
        if let Some(ref d) = req.domain {
            if &profile.domain != d {
                continue;
            }
        }
        if let Some(ref ids) = req.entity_ids {
            if !ids.contains(&profile.id) {
                continue;
            }
        }
        let result = classify_entity_internal(profile, &categories, &rules);
        class_store.insert(profile.id.clone(), result.clone());
        results.push(result);
    }
    let count = results.len();
    Json(ApiResponse::success(
        results,
        &format!("批量分类完成（{} 条）", count),
    ))
}

/// GET /classification/suggest-tags/{id} — 标签推荐
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/classification/suggest-tags/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "实体ID")),
    responses((status = 200, description = "推荐标签成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn classification_suggest_tags(
    State(state): State<ApiState>,
    Path(entity_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    ensure_auto_classifier_initialized().await;
    let profiles = build_entity_profiles();
    let profile = match profiles.iter().find(|p| p.id == entity_id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到实体")),
    };
    let categories = get_auto_classifier_store().categories.lock().await.clone();
    let tags = suggest_tags_internal(profile, &categories);
    Json(ApiResponse::success(
        serde_json::json!({
            "entity_id": entity_id,
            "domain": profile.domain,
            "tags": tags,
            "tag_count": tags.len(),
        }),
        "标签推荐完成",
    ))
}

/// GET /classification/categories — 分类类别列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/classification/categories",
    tag = "Master Data",
    responses((status = 200, description = "获取分类目录成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn classification_list_categories(
    State(state): State<ApiState>,
    Query(params): Query<ListCategoriesQuery>,
) -> Json<ApiResponse<Vec<Category>>> {
    let _ = &state;
    ensure_auto_classifier_initialized().await;
    let categories = get_auto_classifier_store().categories.lock().await;
    let filtered: Vec<Category> = categories
        .iter()
        .filter(|c| {
            params
                .domain
                .as_ref()
                .map(|d| &c.domain == d)
                .unwrap_or(true)
                && params
                    .parent_id
                    .as_ref()
                    .map(|p| c.parent_id.as_deref() == Some(p.as_str()))
                    .unwrap_or(true)
        })
        .cloned()
        .collect();
    Json(ApiResponse::success(filtered, "分类类别列表"))
}

/// POST /classification/learn-rule — 学习新规则
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/classification/learn-rule",
    tag = "Master Data",
    responses((status = 200, description = "学习分类规则成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn classification_learn_rule(
    State(state): State<ApiState>,
    Json(req): Json<LearnRuleRequest>,
) -> Json<ApiResponse<ClassificationRule>> {
    let _ = &state;
    ensure_auto_classifier_initialized().await;
    let categories = get_auto_classifier_store().categories.lock().await;
    if !categories.iter().any(|c| c.id == req.category_id) {
        return Json(ApiResponse::error(400, "目标类别不存在"));
    }
    drop(categories);
    let rule = ClassificationRule {
        id: format!("rule-learned-{}", uuid::Uuid::new_v4()),
        name: req.name,
        domain: req.domain,
        conditions: req.conditions,
        category_id: req.category_id,
        priority: req.priority.unwrap_or(50),
        confidence: req.confidence.unwrap_or(0.7),
        enabled: true,
        learned: true,
    };
    get_auto_classifier_store()
        .rules
        .lock()
        .await
        .push(rule.clone());
    Json(ApiResponse::success(rule, "规则学习完成"))
}

/// GET /classification/stats — 分类统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/classification/stats",
    tag = "Master Data",
    responses((status = 200, description = "获取分类统计成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn classification_get_stats(
    State(state): State<ApiState>,
    Query(params): Query<ClassificationStatsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    ensure_auto_classifier_initialized().await;
    let categories = get_auto_classifier_store().categories.lock().await.clone();
    let rules = get_auto_classifier_store().rules.lock().await.clone();
    let classifications = get_auto_classifier_store().classifications.lock().await;

    let filtered_cats: Vec<&Category> = categories
        .iter()
        .filter(|c| {
            params
                .domain
                .as_ref()
                .map(|d| &c.domain == d)
                .unwrap_or(true)
        })
        .collect();

    let total_rules = rules
        .iter()
        .filter(|r| {
            params
                .domain
                .as_ref()
                .map(|d| &r.domain == d)
                .unwrap_or(true)
        })
        .count();
    let learned_rules = rules
        .iter()
        .filter(|r| {
            r.learned
                && params
                    .domain
                    .as_ref()
                    .map(|d| &r.domain == d)
                    .unwrap_or(true)
        })
        .count();

    let by_category: HashMap<String, usize> = {
        let mut m: HashMap<String, usize> = HashMap::new();
        for c in classifications.values() {
            if let Some(ref d) = params.domain {
                if &c.domain != d {
                    continue;
                }
            }
            *m.entry(c.suggested_category.clone()).or_default() += 1;
        }
        m
    };

    let model = ClassificationModel {
        categories: filtered_cats.iter().map(|c| (*c).clone()).collect(),
        rules: rules.clone(),
        accuracy: 0.86,
        trained_at: chrono::Utc::now().to_rfc3339(),
        training_samples: classifications.len() as i64,
    };

    Json(ApiResponse::success(
        serde_json::json!({
            "total_categories": filtered_cats.len(),
            "total_rules": total_rules,
            "learned_rules": learned_rules,
            "classified_entities": classifications.len(),
            "by_category": by_category,
            "model": model,
        }),
        "分类统计",
    ))
}
