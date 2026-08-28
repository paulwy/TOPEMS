//! 智能匹配模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块。
//! 提供主数据实体的智能匹配、重复检测和合并建议功能。
//!
//! 算法：Levenshtein + Jaro-Winkler + 拼音/缩写匹配 + 多字段加权

use axum::{extract::Path, extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

// ==================== 共享实体画像类型 ====================

/// 预置实体特征（用于匹配计算；真实数据由 MDM_GRAPHQL_STORE 派生）
#[derive(Clone)]
pub struct EntityProfile {
    pub id: String,
    pub domain: String,
    pub code: String,
    pub name: Option<String>,
    pub fields: HashMap<String, Option<String>>,
    pub last_synced_days_ago: i64,
}

/// 构造预置实体画像（覆盖 6 大主数据域）
pub fn build_entity_profiles() -> Vec<EntityProfile> {
    let now = chrono::Utc::now();
    let rfc = |days_ago: i64| (now - chrono::Duration::days(days_ago)).to_rfc3339();

    let mut profiles = Vec::new();
    let domains: Vec<(&str, Vec<(&str, Option<&str>, i64)>)> = vec![
        (
            "customer",
            vec![
                ("C001", Some("华信科技有限公司"), 5),
                ("C002", Some("盛达贸易集团"), 30),
                ("C003", Some("恒泰制造股份"), 2),
                ("C004", Some("创新电子科技"), 90),
                ("C005", Some(""), 15),
            ],
        ),
        (
            "supplier",
            vec![
                ("S001", Some("原材料供应商A"), 7),
                ("S002", Some("零部件供应商B"), 60),
                ("S003", Some("包装材料供应商C"), 3),
                ("S004", Some("设备供应商D"), 200),
            ],
        ),
        (
            "material",
            vec![
                ("M001", Some("产品甲"), 4),
                ("M002", Some("产品乙"), 8),
                ("M003", Some("原材料A"), 1),
                ("M004", Some(""), 12),
                ("M005", Some("零部件X"), 6),
                ("M006", Some("零部件Y"), 45),
            ],
        ),
        (
            "employee",
            vec![
                ("E001", Some("张三"), 6),
                ("E002", Some("李四"), 10),
                ("E003", Some("王五"), 3),
                ("E004", Some("赵六"), 25),
            ],
        ),
        (
            "account_subject",
            vec![
                ("A001", Some("应收账款"), 1),
                ("A002", Some("应付账款"), 2),
                ("A003", Some("主营业务收入"), 1),
            ],
        ),
        (
            "organization",
            vec![
                ("O001", Some("总部"), 5),
                ("O002", Some("华东分公司"), 5),
                ("O003", Some("华南分公司"), 5),
            ],
        ),
    ];

    for (domain, items) in domains {
        for (code, name, days_ago) in items {
            let id = format!("md-{}-{}", domain, code);
            let mut fields = HashMap::new();
            fields.insert("code".to_string(), Some(code.to_string()));
            fields.insert("name".to_string(), name.map(|s| s.to_string()));
            fields.insert("status".to_string(), Some("active".to_string()));
            fields.insert("last_synced_at".to_string(), Some(rfc(days_ago)));
            match domain {
                "customer" => {
                    fields.insert("phone".to_string(), Some("13800138000".to_string()));
                    fields.insert("email".to_string(), Some(format!("{}@example.com", code)));
                    fields.insert("address".to_string(), Some("北京市朝阳区".to_string()));
                }
                "supplier" => {
                    fields.insert("grade".to_string(), Some("A".to_string()));
                    fields.insert("category".to_string(), Some("原材料".to_string()));
                    fields.insert("region".to_string(), Some("华北".to_string()));
                }
                "material" => {
                    fields.insert("category".to_string(), Some("成品".to_string()));
                    fields.insert("unit".to_string(), Some("个".to_string()));
                    fields.insert("price".to_string(), Some("99.50".to_string()));
                }
                _ => {}
            }
            profiles.push(EntityProfile {
                id,
                domain: domain.to_string(),
                code: code.to_string(),
                name: name.map(|s| s.to_string()),
                fields,
                last_synced_days_ago: days_ago,
            });
        }
    }
    profiles
}

// ==================== 智能匹配类型 ====================

/// 匹配类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MatchType {
    Exact,
    Fuzzy,
    Phonetic,
    Abbreviation,
    Synonym,
    Partial,
}

impl MatchType {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Exact => "exact",
            Self::Fuzzy => "fuzzy",
            Self::Phonetic => "phonetic",
            Self::Abbreviation => "abbreviation",
            Self::Synonym => "synonym",
            Self::Partial => "partial",
        }
    }
}

/// 单字段匹配详情
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchField {
    pub field_name: String,
    pub source_value: String,
    pub target_value: String,
    pub similarity: f64,
    pub match_type: String,
}

/// 匹配结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub source_id: String,
    pub target_id: String,
    pub target_name: String,
    pub match_score: f64,
    pub match_fields: Vec<MatchField>,
    pub match_details: String,
    pub confidence: f64,
    pub recommendation: String,
}

/// 重复组
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub group_id: String,
    pub domain: String,
    pub entities: Vec<String>,
    pub confidence: f64,
    pub primary_entity_id: String,
    pub merge_recommendation: String,
}

// --- 匹配请求/查询类型 ---

#[derive(Debug, Deserialize)]
pub struct FindMatchesRequest {
    pub domain: Option<String>,
    pub threshold: Option<f64>,
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct FindDuplicatesQuery {
    pub domain: Option<String>,
    pub min_confidence: Option<f64>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SuggestMergeRequest {
    pub group_id: String,
    pub primary_entity_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DuplicateGroupsQuery {
    pub domain: Option<String>,
}

// ==================== 智能匹配算法 ====================

/// Levenshtein 编辑距离
fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let (m, n) = (a.len(), b.len());
    if m == 0 {
        return n;
    }
    if n == 0 {
        return m;
    }
    let mut prev: Vec<usize> = (0..=n).collect();
    let mut curr: Vec<usize> = vec![0; n + 1];
    for i in 1..=m {
        curr[0] = i;
        for j in 1..=n {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            curr[j] = (prev[j] + 1).min(curr[j - 1] + 1).min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[n]
}

/// Levenshtein 相似度（0-1）
fn levenshtein_similarity(a: &str, b: &str) -> f64 {
    if a.is_empty() && b.is_empty() {
        return 1.0;
    }
    let max_len = a.len().max(b.len());
    if max_len == 0 {
        return 1.0;
    }
    let dist = levenshtein(a, b);
    1.0 - (dist as f64 / max_len as f64)
}

/// Jaro-Winkler 相似度（0-1）
fn jaro_winkler(s1: &str, s2: &str) -> f64 {
    let a: Vec<char> = s1.chars().collect();
    let b: Vec<char> = s2.chars().collect();
    if a.is_empty() && b.is_empty() {
        return 1.0;
    }
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let match_distance = (a.len().max(b.len()) / 2).saturating_sub(1);
    let mut a_matches = vec![false; a.len()];
    let mut b_matches = vec![false; b.len()];
    let mut matches = 0usize;
    for i in 0..a.len() {
        let start = i.saturating_sub(match_distance);
        let end = (i + match_distance + 1).min(b.len());
        for j in start..end {
            if !b_matches[j] && a[i] == b[j] {
                a_matches[i] = true;
                b_matches[j] = true;
                matches += 1;
                break;
            }
        }
    }
    if matches == 0 {
        return 0.0;
    }
    let mut t = 0.0;
    let mut k = 0usize;
    for i in 0..a.len() {
        if a_matches[i] {
            while !b_matches[k] {
                k += 1;
            }
            if a[i] != b[k] {
                t += 0.5;
            }
            k += 1;
        }
    }
    let m = matches as f64;
    let jaro = (m / a.len() as f64 + m / b.len() as f64 + (m - t) / m) / 3.0;
    let prefix = a
        .iter()
        .zip(b.iter())
        .take(4)
        .take_while(|(x, y)| x == y)
        .count() as f64;
    jaro + prefix * 0.1 * (1.0 - jaro)
}

/// 拼音匹配（简化版：基于字符集重叠 + 首字母）
fn phonetic_similarity(a: &str, b: &str) -> f64 {
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let set_a: HashSet<char> = a.chars().collect();
    let set_b: HashSet<char> = b.chars().collect();
    let inter = set_a.intersection(&set_b).count();
    let union = set_a.union(&set_b).count();
    let jaccard = if union == 0 {
        0.0
    } else {
        inter as f64 / union as f64
    };
    let first_bonus = if a.chars().next() == b.chars().next() {
        0.15
    } else {
        0.0
    };
    (jaccard + first_bonus).min(1.0)
}

/// 缩写匹配：source 的首字母序列是否为 target 缩写
fn abbreviation_similarity(source: &str, target: &str) -> f64 {
    let s: Vec<char> = source.chars().filter(|c| c.is_alphabetic()).collect();
    let t: Vec<char> = target.chars().filter(|c| c.is_alphabetic()).collect();
    if s.is_empty() || t.is_empty() {
        return 0.0;
    }
    let s_abbr: String = s
        .chunks(1)
        .map(|c| c[0].to_ascii_uppercase())
        .collect::<String>();
    let t_upper: String = t.iter().map(|c| c.to_ascii_uppercase()).collect();
    if t_upper.contains(&s_abbr) || s_abbr.contains(&t_upper) {
        return 0.8;
    }
    let common = s_abbr.chars().filter(|c| t_upper.starts_with(*c)).count();
    if common > 0 {
        common as f64 / s_abbr.len().max(t_upper.len()) as f64 * 0.6
    } else {
        0.0
    }
}

/// 字段匹配：综合 Levenshtein + Jaro-Winkler + 拼音 + 缩写
fn match_field_value(source: &str, target: &str) -> (f64, MatchType) {
    if source == target {
        return (1.0, MatchType::Exact);
    }
    let lev = levenshtein_similarity(source, target);
    let jw = jaro_winkler(source, target);
    let best = lev.max(jw);
    if best >= 0.95 {
        return (best, MatchType::Exact);
    }
    if best >= 0.8 {
        return (best, MatchType::Fuzzy);
    }
    let phon = phonetic_similarity(source, target);
    if phon >= 0.7 {
        return (phon, MatchType::Phonetic);
    }
    let abbr = abbreviation_similarity(source, target);
    if abbr >= 0.6 {
        return (abbr, MatchType::Abbreviation);
    }
    if best >= 0.5 {
        return (best, MatchType::Partial);
    }
    (best, MatchType::Fuzzy)
}

/// 多字段加权匹配：name 40% + code 20% + address 15% + phone 10% + email 15%
pub fn weighted_match(source: &EntityProfile, target: &EntityProfile) -> (Vec<MatchField>, f64) {
    let weights: [(&str, f64); 5] = [
        ("name", 0.40),
        ("code", 0.20),
        ("address", 0.15),
        ("phone", 0.10),
        ("email", 0.15),
    ];
    let mut fields = Vec::new();
    let mut total = 0.0;
    let mut used_weight = 0.0;
    for (fname, w) in &weights {
        let s_val = source
            .fields
            .get(*fname)
            .and_then(|v| v.as_ref())
            .cloned()
            .unwrap_or_default();
        let t_val = target
            .fields
            .get(*fname)
            .and_then(|v| v.as_ref())
            .cloned()
            .unwrap_or_default();
        if s_val.is_empty() || t_val.is_empty() {
            continue;
        }
        let (sim, mt) = match_field_value(&s_val, &t_val);
        fields.push(MatchField {
            field_name: fname.to_string(),
            source_value: s_val,
            target_value: t_val,
            similarity: (sim * 100.0).round() / 100.0,
            match_type: mt.as_str().to_string(),
        });
        total += sim * w;
        used_weight += w;
    }
    let normalized = if used_weight > 0.0 {
        total / used_weight
    } else {
        0.0
    };
    (fields, normalized)
}

// ==================== 智能匹配存储 ====================

pub struct SmartMatcherStore {
    pub duplicate_groups: tokio::sync::Mutex<Vec<DuplicateGroup>>,
    pub initialized: tokio::sync::Mutex<bool>,
}

fn get_smart_matcher_store() -> &'static SmartMatcherStore {
    static STORE: LazyLock<SmartMatcherStore> = LazyLock::new(|| SmartMatcherStore {
        duplicate_groups: tokio::sync::Mutex::new(Vec::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_smart_matcher_initialized() {
    let store = get_smart_matcher_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    let now_groups: Vec<DuplicateGroup> = vec![
        DuplicateGroup {
            group_id: "dup-group-001".to_string(),
            domain: "customer".to_string(),
            entities: vec![
                "md-customer-C001".to_string(),
                "md-customer-C001-dup".to_string(),
            ],
            confidence: 0.92,
            primary_entity_id: "md-customer-C001".to_string(),
            merge_recommendation: "manual_review".to_string(),
        },
        DuplicateGroup {
            group_id: "dup-group-002".to_string(),
            domain: "supplier".to_string(),
            entities: vec![
                "md-supplier-S001".to_string(),
                "md-supplier-S001-dup".to_string(),
            ],
            confidence: 0.88,
            primary_entity_id: "md-supplier-S001".to_string(),
            merge_recommendation: "auto_merge".to_string(),
        },
    ];
    *store.duplicate_groups.lock().await = now_groups;
    *initialized = true;
}

// ==================== 智能匹配 handlers ====================

/// POST /matching/find-matches/{id} — 为指定实体查找匹配
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/matching/find-matches/{id}",
    tag = "Master Data",
    params(("id" = String, Path, description = "实体ID")),
    responses((status = 200, description = "查找匹配成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn matching_find_matches(
    State(state): State<ApiState>,
    Path(source_id): Path<String>,
    Json(req): Json<FindMatchesRequest>,
) -> Json<ApiResponse<Vec<MatchResult>>> {
    let _ = &state;
    let profiles = build_entity_profiles();
    let source = match profiles.iter().find(|p| p.id == source_id) {
        Some(p) => p,
        None => return Json(ApiResponse::error(404, "未找到源实体")),
    };
    let threshold = req.threshold.unwrap_or(70.0) / 100.0;
    let limit = req.limit.unwrap_or(20);

    let mut results = Vec::new();
    for target in &profiles {
        if target.id == source.id {
            continue;
        }
        if let Some(ref d) = req.domain {
            if &target.domain != d {
                continue;
            }
        }
        let (fields, score) = weighted_match(source, target);
        if score >= threshold {
            let rec = if score >= 0.9 {
                "merge"
            } else if score >= 0.75 {
                "review"
            } else {
                "skip"
            };
            let target_name = target.name.clone().unwrap_or_else(|| target.code.clone());
            results.push(MatchResult {
                source_id: source.id.clone(),
                target_id: target.id.clone(),
                target_name,
                match_score: (score * 100.0).round() / 100.0 * 100.0,
                match_fields: fields.clone(),
                match_details: format!(
                    "匹配字段数 {}，综合相似度 {:.1}%",
                    fields.len(),
                    score * 100.0
                ),
                confidence: (score * 0.9 + 0.1).min(1.0),
                recommendation: rec.to_string(),
            });
        }
    }
    results.sort_by(|a, b| {
        b.match_score
            .partial_cmp(&a.match_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(limit);
    Json(ApiResponse::success(
        results.clone(),
        &format!("找到 {} 条匹配", results.len()),
    ))
}

/// GET /matching/duplicates — 重复实体列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data-refs/matching-find-duplicates",
    tag = "MasterDataRefs",
    operation_id = "matching_find_duplicates",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn matching_find_duplicates(
    State(state): State<ApiState>,
    Query(params): Query<FindDuplicatesQuery>,
) -> Json<ApiResponse<PaginatedResponse<MatchResult>>> {
    let _ = &state;
    let profiles = build_entity_profiles();
    let min_conf = params.min_confidence.unwrap_or(70.0) / 100.0;

    let mut all_pairs: Vec<MatchResult> = Vec::new();
    for i in 0..profiles.len() {
        for j in (i + 1)..profiles.len() {
            let s = &profiles[i];
            let t = &profiles[j];
            if let Some(ref d) = params.domain {
                if s.domain != *d || t.domain != *d {
                    continue;
                }
            }
            if s.domain != t.domain {
                continue;
            }
            let (fields, score) = weighted_match(s, t);
            if score >= min_conf {
                let target_name = t.name.clone().unwrap_or_else(|| t.code.clone());
                all_pairs.push(MatchResult {
                    source_id: s.id.clone(),
                    target_id: t.id.clone(),
                    target_name,
                    match_score: (score * 100.0).round() / 100.0 * 100.0,
                    match_fields: fields.clone(),
                    match_details: format!("域内重复检测，相似度 {:.1}%", score * 100.0),
                    confidence: (score * 0.9 + 0.1).min(1.0),
                    recommendation: if score >= 0.9 {
                        "merge"
                    } else if score >= 0.75 {
                        "review"
                    } else {
                        "skip"
                    }
                    .to_string(),
                });
            }
        }
    }
    all_pairs.sort_by(|a, b| {
        b.match_score
            .partial_cmp(&a.match_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let total = all_pairs.len() as i64;
    let offset = ((page - 1) * page_size) as usize;
    let items: Vec<MatchResult> = all_pairs
        .into_iter()
        .skip(offset)
        .take(page_size as usize)
        .collect();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "重复实体列表",
    ))
}

/// GET /matching/duplicate-groups — 重复组列表
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/master-data/matching/duplicate-groups",
    tag = "Master Data",
    responses((status = 200, description = "获取重复组成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn matching_get_duplicate_groups(
    State(state): State<ApiState>,
    Query(params): Query<DuplicateGroupsQuery>,
) -> Json<ApiResponse<Vec<DuplicateGroup>>> {
    let _ = &state;
    ensure_smart_matcher_initialized().await;
    let groups = get_smart_matcher_store().duplicate_groups.lock().await;
    let filtered: Vec<DuplicateGroup> = groups
        .iter()
        .filter(|g| {
            params
                .domain
                .as_ref()
                .map(|d| &g.domain == d)
                .unwrap_or(true)
        })
        .cloned()
        .collect();
    Json(ApiResponse::success(filtered, "重复组列表"))
}

/// POST /matching/suggest-merge — 合并建议
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/master-data/matching/suggest-merge",
    tag = "Master Data",
    responses((status = 200, description = "生成合并建议成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn matching_suggest_merge(
    State(state): State<ApiState>,
    Json(req): Json<SuggestMergeRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    ensure_smart_matcher_initialized().await;
    let groups = get_smart_matcher_store().duplicate_groups.lock().await;
    let group = match groups.iter().find(|g| g.group_id == req.group_id) {
        Some(g) => g,
        None => return Json(ApiResponse::error(404, "未找到重复组")),
    };
    let primary = req
        .primary_entity_id
        .clone()
        .unwrap_or_else(|| group.primary_entity_id.clone());
    if !group.entities.contains(&primary) {
        return Json(ApiResponse::error(400, "主实体不在重复组中"));
    }
    let others: Vec<&String> = group.entities.iter().filter(|e| **e != primary).collect();
    Json(ApiResponse::success(
        serde_json::json!({
            "group_id": group.group_id,
            "domain": group.domain,
            "primary_entity_id": primary,
            "entities_to_merge": others,
            "merge_strategy": group.merge_recommendation,
            "confidence": group.confidence,
            "steps": [
                "1. 选择主实体保留全部字段",
                "2. 将次实体的引用迁移至主实体",
                "3. 合并审计记录与版本历史",
                "4. 软删除次实体并记录合并日志",
            ],
            "estimated_fields_to_resolve": others.len() * 5,
        }),
        "合并建议生成完成",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_match_type_serialization() {
        let match_type = MatchType::Exact;
        let json = serde_json::to_value(&match_type).unwrap();
        assert_eq!(json, "exact");
    }

    #[test]
    fn test_match_type_fuzzy() {
        let match_type = MatchType::Fuzzy;
        let json = serde_json::to_value(&match_type).unwrap();
        assert_eq!(json, "fuzzy");
    }

    #[test]
    fn test_match_type_phonetic() {
        let match_type = MatchType::Phonetic;
        let json = serde_json::to_value(&match_type).unwrap();
        assert_eq!(json, "phonetic");
    }

    #[test]
    fn test_match_type_deserialize() {
        let match_type: MatchType = serde_json::from_str("\"synonym\"").unwrap();
        assert!(matches!(match_type, MatchType::Synonym));
    }

    #[test]
    fn test_match_field_serialization() {
        let field = MatchField {
            field_name: "name".to_string(),
            source_value: "张三".to_string(),
            target_value: "张叁".to_string(),
            similarity: 0.85,
            match_type: "fuzzy".to_string(),
        };
        let json = serde_json::to_value(&field).unwrap();
        assert_eq!(json["field_name"], "name");
        assert_eq!(json["source_value"], "张三");
        assert_eq!(json["target_value"], "张叁");
        assert_eq!(json["similarity"], 0.85);
        assert_eq!(json["match_type"], "fuzzy");
    }

    #[test]
    fn test_match_result_serialization() {
        let result = MatchResult {
            source_id: "src1".to_string(),
            target_id: "tgt1".to_string(),
            target_name: "目标实体".to_string(),
            match_score: 0.92,
            match_fields: vec![],
            match_details: "高度匹配".to_string(),
            confidence: 0.95,
            recommendation: "merge".to_string(),
        };
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["source_id"], "src1");
        assert_eq!(json["target_id"], "tgt1");
        assert_eq!(json["target_name"], "目标实体");
        assert_eq!(json["match_score"], 0.92);
        assert_eq!(json["confidence"], 0.95);
        assert_eq!(json["recommendation"], "merge");
    }

    #[test]
    fn test_duplicate_group_serialization() {
        let group = DuplicateGroup {
            group_id: "group1".to_string(),
            domain: "customer".to_string(),
            entities: vec!["ent1".to_string(), "ent2".to_string()],
            confidence: 0.88,
            primary_entity_id: "ent1".to_string(),
            merge_recommendation: "自动合并".to_string(),
        };
        let json = serde_json::to_value(&group).unwrap();
        assert_eq!(json["group_id"], "group1");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["entities"].as_array().unwrap().len(), 2);
        assert_eq!(json["confidence"], 0.88);
        assert_eq!(json["primary_entity_id"], "ent1");
        assert_eq!(json["merge_recommendation"], "自动合并");
    }

    #[test]
    fn test_find_matches_request_deserialize() {
        let json = r#"{"domain": "customer", "threshold": 0.8, "limit": 10}"#;
        let request: FindMatchesRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.domain.as_deref(), Some("customer"));
        assert_eq!(request.threshold, Some(0.8));
        assert_eq!(request.limit, Some(10));
    }

    #[test]
    fn test_find_duplicates_query_deserialize() {
        let query = "domain=customer&min_confidence=0.7&page=1&page_size=20";
        let params: FindDuplicatesQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.domain.as_deref(), Some("customer"));
        assert_eq!(params.min_confidence, Some(0.7));
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
    }

    #[test]
    fn test_suggest_merge_request_deserialize() {
        let json = r#"{"group_id": "group1", "primary_entity_id": "ent1"}"#;
        let request: SuggestMergeRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.group_id, "group1");
        assert_eq!(request.primary_entity_id.as_deref(), Some("ent1"));
    }

    #[test]
    fn test_duplicate_groups_query_deserialize() {
        let query = "domain=customer";
        let params: DuplicateGroupsQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.domain.as_deref(), Some("customer"));
    }
}
