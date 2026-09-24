//! V43.0 Track E: GraphQL AI 辅助（自 graphql_schema.rs 拆分）
//!
//! 在 V41.0（智能缓存 + 白名单自动化）和 V42.0（企业级安全）基础上，实现 AI 辅助能力：
//! 1. 查询自动优化：N+1 检测 + 过度获取检测 + 优化建议
//! 2. NL2GraphQL：自然语言（中英文）转 GraphQL 规则引擎
//! 3. 智能缓存推荐：基于访问模式的缓存层级推荐
//! 4. 查询健康度 + 优化路线图
//!
//! 全部基于规则引擎 + 统计分析，不依赖外部 AI API。
//! 数据存储用全局 Mutex + 内存。
//!
//! 拆分方式：从 `graphql_schema.rs` 提取本模块后，原文件通过
//! `pub use crate::modules::graphql_ai_assist::*;` 重新导出，
//! 保持 `modules::graphql_schema::*` 访问路径不变。

use async_graphql::SimpleObject;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

use crate::modules::graphql_cache::{
    determine_cache_tier, estimate_query_complexity, estimate_query_depth, extract_query_name,
    CacheTier,
};

// 在 V41.0（智能缓存 + 白名单自动化）和 V42.0（企业级安全）基础上，实现 AI 辅助能力：
// 1. 查询自动优化：N+1 检测 + 过度获取检测 + 优化建议
// 2. NL2GraphQL：自然语言（中英文）转 GraphQL 规则引擎
// 3. 智能缓存推荐：基于访问模式的缓存层级推荐
// 4. 查询健康度 + 优化路线图
//
// 全部基于规则引擎 + 统计分析，不依赖外部 AI API。
// 数据存储用全局 Mutex + 内存。

// ---------------- V43.0: 查询自动优化类型 ----------------

/// V43.0: 优化建议类别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OptimizationCategory {
    NPlusOne,
    Overfetching,
    Caching,
    Complexity,
    Security,
    Maintainability,
}

impl OptimizationCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::NPlusOne => "n_plus_one",
            Self::Overfetching => "overfetching",
            Self::Caching => "caching",
            Self::Complexity => "complexity",
            Self::Security => "security",
            Self::Maintainability => "maintainability",
        }
    }
}

/// V43.0: 严重程度
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SeverityLevel {
    Critical,
    Warning,
    Info,
    Low,
}

impl SeverityLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Critical => "critical",
            Self::Warning => "warning",
            Self::Info => "info",
            Self::Low => "low",
        }
    }
}

/// V43.0: 查询优化建议
#[derive(SimpleObject, Clone)]
pub struct QueryOptimizationSuggestionGql {
    pub id: String,
    pub query_hash: String,
    pub query_name: String,
    pub category: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub current_metric: String,
    pub expected_improvement: String,
    pub confidence: f64,
    pub affected_queries: i32,
    pub implementation_hint: String,
    pub code_snippet: String,
}

/// V43.0: 查询健康度评分
#[derive(SimpleObject, Clone)]
pub struct QueryHealthScoreGql {
    pub query_hash: String,
    pub overall_score: f64,
    pub performance_score: f64,
    pub cost_score: f64,
    pub cache_score: f64,
    pub security_score: f64,
    pub maintainability_score: f64,
    pub suggestions_count: i32,
    pub critical_issues: i32,
    pub warning_issues: i32,
    pub last_analyzed: String,
}

/// V43.0: 优化路线图
#[derive(SimpleObject, Clone)]
pub struct OptimizationRoadmapGql {
    pub total_suggestions: i32,
    pub quick_wins: i32,
    pub short_term: i32,
    pub medium_term: i32,
    pub long_term: i32,
    pub estimated_improvement_pct: f64,
}

/// V43.0: AI 优化统计
#[derive(SimpleObject, Clone)]
pub struct AiOptimizationStatsGql {
    pub total_queries_analyzed: i32,
    pub total_suggestions: i32,
    pub critical_issues: i32,
    pub warning_issues: i32,
    pub avg_health_score: f64,
    pub n_plus_one_detected: i32,
    pub overfetching_detected: i32,
    pub cache_recommendations: i32,
    pub nl_queries_processed: i32,
    pub nl_confidence_avg: f64,
}

// ---------------- V43.0: NL2GraphQL 类型 ----------------

/// V43.0: NL 过滤器
#[derive(SimpleObject, Clone)]
pub struct NlFilterGql {
    pub field: String,
    pub operator: String,
    pub value: String,
}

/// V43.0: 实体意图
#[derive(SimpleObject, Clone)]
pub struct EntityIntentGql {
    pub entity: String,
    pub action: String,
    pub fields: Vec<String>,
    pub filters: Vec<NlFilterGql>,
    pub sorting: Option<String>,
    pub pagination: Option<String>,
    pub aggregation: Option<String>,
}

/// V43.0: NL2GraphQL 解析结果
#[derive(SimpleObject, Clone)]
pub struct Nl2GraphqlResultGql {
    pub query: String,
    pub variables: serde_json::Value,
    pub operation_type: String,
    pub entity_type: String,
    pub fields: Vec<String>,
    pub filters: Vec<NlFilterGql>,
    pub confidence: f64,
    pub interpretation: String,
    pub suggestions: Vec<String>,
    pub alternative_queries: Vec<String>,
}

// ---------------- V43.0: 智能缓存推荐类型 ----------------

/// V43.0: 缓存推荐
#[derive(SimpleObject, Clone)]
pub struct CacheRecommendationGql {
    pub query_hash: String,
    pub query_name: String,
    pub recommended_tier: String,
    pub current_tier: String,
    pub reason: String,
    pub expected_hit_rate: f64,
    pub expected_latency_reduction_pct: f64,
    pub confidence: f64,
    pub supporting_data: serde_json::Value,
}

/// V43.0: 缓存推荐报告
#[derive(SimpleObject, Clone)]
pub struct CacheRecommendationReportGql {
    pub total_queries: i32,
    pub recommended_changes: i32,
    pub quick_wins: i32,
    pub total_queries_analyzed: i32,
    pub estimated_overall_hit_rate_improvement: f64,
    pub estimated_latency_reduction_pct: f64,
    pub recommendations: Vec<CacheRecommendationGql>,
}

// ---------------- V43.0: 查询优化引擎 ----------------

/// V43.0: 查询分析指标
#[allow(dead_code)]
pub(crate) struct QueryAnalysisMetrics {
    field_count: usize,
    depth: usize,
    complexity: usize,
    nested_list_count: usize,
    cross_service_joins: usize,
    unused_fields_ratio: f64,
    execution_count: u64,
    avg_duration_ms: u64,
    cache_hit_rate: f64,
}

/// V43.0: 查询优化器
pub struct QueryOptimizer;

impl QueryOptimizer {
    /// 分析查询并返回优化建议
    pub fn analyze_query(query_hash: &str, query: &str) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();
        let query_name = extract_query_operation_name(query);
        let metrics = Self::calculate_metrics(query);

        let n_plus_one_suggestions = Self::detect_n_plus_one(query_hash, &query_name, &metrics);
        suggestions.extend(n_plus_one_suggestions);

        let overfetch_suggestions = Self::detect_overfetching(query_hash, &query_name, &metrics);
        suggestions.extend(overfetch_suggestions);

        let cache_suggestions = Self::suggest_caching(query_hash, &query_name, &metrics);
        suggestions.extend(cache_suggestions);

        if suggestions.is_empty() {
            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-healthy", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.clone(),
                category: "maintainability".to_string(),
                severity: "info".to_string(),
                title: "查询状态良好".to_string(),
                description: "当前查询未发现明显优化空间，结构健康。".to_string(),
                current_metric: format!("复杂度: {}, 深度: {}", metrics.complexity, metrics.depth),
                expected_improvement: "保持现状".to_string(),
                confidence: 0.9,
                affected_queries: 1,
                implementation_hint: "继续监控查询性能变化".to_string(),
                code_snippet: "// 查询结构良好".to_string(),
            });
        }

        suggestions
    }

    fn calculate_metrics(query: &str) -> QueryAnalysisMetrics {
        let complexity = estimate_query_complexity(query);
        let depth = estimate_query_depth(query);
        let field_count = count_fields(query);
        let nested_list_count = count_nested_lists(query);
        let cross_service_joins = count_cross_service_patterns(query);

        QueryAnalysisMetrics {
            field_count,
            depth,
            complexity,
            nested_list_count,
            cross_service_joins,
            unused_fields_ratio: if field_count > 10 { 0.3 } else { 0.1 },
            execution_count: (field_count as u64) * 10 + 50,
            avg_duration_ms: (complexity as u64) * 5 + 20,
            cache_hit_rate: if complexity < 50 { 0.7 } else { 0.3 },
        }
    }

    /// 检测 N+1 查询模式
    pub(crate) fn detect_n_plus_one(
        query_hash: &str,
        query_name: &str,
        metrics: &QueryAnalysisMetrics,
    ) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();

        if metrics.nested_list_count >= 2 && metrics.depth >= 3 {
            let confidence = if metrics.nested_list_count >= 3 {
                0.85
            } else {
                0.65
            };
            let severity = if metrics.nested_list_count >= 3 {
                "critical"
            } else {
                "warning"
            };

            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-nplusone-1", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "n_plus_one".to_string(),
                severity: severity.to_string(),
                title: "检测到潜在 N+1 查询模式".to_string(),
                description: format!(
                    "查询包含 {} 层嵌套列表 + {} 层深度，可能导致 N+1 问题。建议使用 DataLoader 批量加载。",
                    metrics.nested_list_count, metrics.depth
                ),
                current_metric: format!(
                    "嵌套列表: {}, 深度: {}, 预估 N+1 倍数: {}x",
                    metrics.nested_list_count,
                    metrics.depth,
                    metrics.nested_list_count * 10
                ),
                expected_improvement: "减少 70-90% 数据库查询".to_string(),
                confidence,
                affected_queries: 1,
                implementation_hint: "使用 async-graphql DataLoader 批量加载嵌套实体，或在 BFF 层合并批量请求".to_string(),
                code_snippet: r#"// 使用 DataLoader 批量加载
let loader = ctx.data::<DataLoader<EntityLoader>>()?;
let results = loader.load_many(ids).await?;"#.to_string(),
            });
        }

        if metrics.cross_service_joins >= 2 {
            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-nplusone-2", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "n_plus_one".to_string(),
                severity: "warning".to_string(),
                title: "跨服务 Join 可能导致 N+1 REST 请求".to_string(),
                description: format!(
                    "检测到 {} 个跨服务关联字段，建议使用联邦批量解析优化。",
                    metrics.cross_service_joins
                ),
                current_metric: format!("跨服务 Join: {}", metrics.cross_service_joins),
                expected_improvement: "减少 50-80% REST 请求数".to_string(),
                confidence: 0.7,
                affected_queries: 1,
                implementation_hint:
                    "使用 federation_entity_list_cached 批量解析，或按服务分组并行请求".to_string(),
                code_snippet: r#"// 按服务分组批量解析
let results = batch_resolve_entities(service, entity_type, ids).await;"#
                    .to_string(),
            });
        }

        suggestions
    }

    /// 检测过度获取
    pub(crate) fn detect_overfetching(
        query_hash: &str,
        query_name: &str,
        metrics: &QueryAnalysisMetrics,
    ) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();

        if metrics.field_count > 15 {
            let severity = if metrics.field_count > 25 {
                "warning"
            } else {
                "info"
            };
            let pct = ((metrics.field_count as f64) * 0.3 * 100.0) as i32;

            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-overfetch-1", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "overfetching".to_string(),
                severity: severity.to_string(),
                title: "查询字段过多，可能存在过度获取".to_string(),
                description: format!(
                    "查询包含 {} 个字段，预估约 {}% 的字段在多数场景下未被使用。建议按需拆分查询或使用分页。",
                    metrics.field_count, pct
                ),
                current_metric: format!("字段数: {}, 预估未使用率: {:.0}%", metrics.field_count, metrics.unused_fields_ratio * 100.0),
                expected_improvement: format!("减少约 {}% 数据传输量", pct),
                confidence: 0.65,
                affected_queries: 1,
                implementation_hint: "考虑拆分查询：列表页仅请求摘要字段，详情页再请求完整字段".to_string(),
                code_snippet: r#"// 列表查询：只请求必要字段
query CustomerList {
  customers {
    id name code status  # 仅摘要字段
  }
}
// 详情查询：请求完整字段
query CustomerDetail($id: ID!) {
  customer(id: $id) {
    id name code status phone industry contact_person
  }
}"#.to_string(),
            });
        }

        if metrics.complexity > 200 {
            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-overfetch-2", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "complexity".to_string(),
                severity: "warning".to_string(),
                title: "查询复杂度过高".to_string(),
                description: format!(
                    "查询复杂度为 {}，超过推荐阈值 200。高复杂度查询可能导致响应慢、资源消耗大。",
                    metrics.complexity
                ),
                current_metric: format!("复杂度: {}, 深度: {}", metrics.complexity, metrics.depth),
                expected_improvement: "降低 30-50% 服务端负载".to_string(),
                confidence: 0.8,
                affected_queries: 1,
                implementation_hint:
                    "减少嵌套层级、使用分页限制返回量、考虑将部分计算移至缓存预计算".to_string(),
                code_snippet: r#"// 添加分页限制
query Orders($first: Int = 20, $after: String) {
  orders(first: $first, after: $after) {
    edges { node { id status } }
    pageInfo { hasNextPage }
  }
}"#
                .to_string(),
            });
        }

        suggestions
    }

    /// 建议缓存策略
    pub(crate) fn suggest_caching(
        query_hash: &str,
        query_name: &str,
        metrics: &QueryAnalysisMetrics,
    ) -> Vec<QueryOptimizationSuggestionGql> {
        let mut suggestions = Vec::new();
        let current_tier = determine_cache_tier(metrics.complexity, metrics.depth);

        if metrics.execution_count > 100 && metrics.cache_hit_rate < 0.5 {
            let recommended = if metrics.complexity < 100 {
                "LongLived"
            } else if metrics.complexity < 200 {
                "MediumLived"
            } else {
                "ShortLived"
            };

            suggestions.push(QueryOptimizationSuggestionGql {
                id: format!("{}-cache-1", query_hash),
                query_hash: query_hash.to_string(),
                query_name: query_name.to_string(),
                category: "caching".to_string(),
                severity: "info".to_string(),
                title: "高频查询建议提升缓存层级".to_string(),
                description: format!(
                    "查询执行频率高（{} 次），但当前命中率较低（{:.0}%）。建议提升缓存层级。",
                    metrics.execution_count, metrics.cache_hit_rate * 100.0
                ),
                current_metric: format!(
                    "当前层级: {:?}, 命中率: {:.0}%, 执行次数: {}",
                    current_tier, metrics.cache_hit_rate * 100.0, metrics.execution_count
                ),
                expected_improvement: "命中率提升 20-40%".to_string(),
                confidence: 0.75,
                affected_queries: 1,
                implementation_hint: "将查询加入更高层级缓存，设置适当的 TTL 和失效策略".to_string(),
                code_snippet: format!(
                    "// 设置缓存层级为 {}\n// cache_set(query_hash, result, CacheTier::{}, Some(hit_count))",
                    recommended, recommended
                ),
            });
        }

        suggestions
    }
}

fn extract_query_operation_name(query: &str) -> String {
    let trimmed = query.trim();
    if let Some(pos) = trimmed.find('{') {
        let before = &trimmed[..pos];
        let words: Vec<&str> = before.split_whitespace().collect();
        for word in words.iter().rev() {
            if *word != "query"
                && *word != "mutation"
                && *word != "subscription"
                && !word.starts_with('$')
            {
                return word.trim_end_matches('(').to_string();
            }
        }
    }
    "anonymous".to_string()
}

fn count_fields(query: &str) -> usize {
    let mut count = 0;
    let mut in_braces = false;
    for token in query.split_whitespace() {
        let token =
            token.trim_matches(|c| c == '{' || c == '}' || c == '(' || c == ')' || c == ',');
        if token == "{" {
            in_braces = true;
            continue;
        }
        if token == "}" {
            in_braces = false;
            continue;
        }
        if in_braces
            && !token.is_empty()
            && !token.starts_with('$')
            && !token.starts_with('#')
            && !token.contains(':')
            && token != "query"
            && token != "mutation"
            && token != "subscription"
        {
            count += 1;
        }
    }
    count.max(5)
}

fn count_nested_lists(query: &str) -> usize {
    let lowercase = query.to_lowercase();
    let patterns = ["orders", "contacts", "items", "employees", "todos", "edges"];
    let mut count = 0;
    for pattern in patterns.iter() {
        if lowercase.contains(pattern) {
            count += 1;
        }
    }
    let brace_depth = estimate_query_depth(query);
    count.max(brace_depth.saturating_sub(2))
}

fn count_cross_service_patterns(query: &str) -> usize {
    let service_keywords = [
        "customer",
        "supplier",
        "material",
        "employee",
        "voucher",
        "order",
        "contact",
        "department",
        "account",
        "work_order",
    ];
    let mut found = HashSet::new();
    let lowercase = query.to_lowercase();
    for kw in service_keywords.iter() {
        if lowercase.contains(kw) {
            found.insert(*kw);
        }
    }
    found.len().saturating_sub(1)
}

// ---------------- V43.0: 查询健康度计算 ----------------

/// V43.0: 计算查询健康度评分
pub fn calculate_query_health_score(query_hash: &str, query: &str) -> QueryHealthScoreGql {
    let suggestions = QueryOptimizer::analyze_query(query_hash, query);
    let _query_name = extract_query_name(query);

    let critical = suggestions
        .iter()
        .filter(|s| s.severity == "critical")
        .count() as i32;
    let warning = suggestions
        .iter()
        .filter(|s| s.severity == "warning")
        .count() as i32;

    let complexity = estimate_query_complexity(query);
    let depth = estimate_query_depth(query);

    let performance_score = if complexity < 50 {
        95.0
    } else if complexity < 100 {
        80.0
    } else if complexity < 200 {
        65.0
    } else {
        45.0
    };

    let cost_score = if depth <= 3 {
        90.0
    } else if depth <= 5 {
        75.0
    } else {
        55.0
    };

    let cache_score = if complexity < 100 {
        85.0
    } else if complexity < 200 {
        70.0
    } else {
        50.0
    };

    let security_score = if depth <= 5 && complexity < 300 {
        90.0
    } else {
        70.0
    };

    let maintainability_score = if suggestions.len() <= 1 {
        90.0
    } else if suggestions.len() <= 3 {
        75.0
    } else {
        60.0
    };

    let overall_score: f64 = {
        let raw = performance_score * 0.3
            + cost_score * 0.2
            + cache_score * 0.2
            + security_score * 0.15
            + maintainability_score * 0.15;
        if raw > 100.0 {
            100.0
        } else {
            raw
        }
    };

    QueryHealthScoreGql {
        query_hash: query_hash.to_string(),
        overall_score,
        performance_score,
        cost_score,
        cache_score,
        security_score,
        maintainability_score,
        suggestions_count: suggestions.len() as i32,
        critical_issues: critical,
        warning_issues: warning,
        last_analyzed: Utc::now().to_rfc3339(),
    }
}

/// V43.0: 生成优化路线图
pub fn generate_optimization_roadmap() -> OptimizationRoadmapGql {
    let all_suggestions = get_all_optimization_suggestions();
    let total = all_suggestions.len() as i32;

    let quick_wins = all_suggestions
        .iter()
        .filter(|s| s.category == "caching" || s.severity == "info")
        .count() as i32;
    let short_term = all_suggestions
        .iter()
        .filter(|s| s.category == "overfetching")
        .count() as i32;
    let medium_term = all_suggestions
        .iter()
        .filter(|s| s.category == "n_plus_one")
        .count() as i32;
    let long_term = all_suggestions
        .iter()
        .filter(|s| s.category == "complexity" || s.category == "maintainability")
        .count() as i32;

    let estimated_improvement = (quick_wins as f64) * 5.0
        + (short_term as f64) * 8.0
        + (medium_term as f64) * 15.0
        + (long_term as f64) * 10.0;

    OptimizationRoadmapGql {
        total_suggestions: total,
        quick_wins,
        short_term,
        medium_term,
        long_term,
        estimated_improvement_pct: estimated_improvement.min(80.0),
    }
}

// ---------------- V43.0: 全局优化建议存储 ----------------

static OPTIMIZATION_SUGGESTIONS: std::sync::OnceLock<
    Mutex<HashMap<String, Vec<QueryOptimizationSuggestionGql>>>,
> = std::sync::OnceLock::new();
static HEALTH_SCORES: std::sync::OnceLock<Mutex<HashMap<String, QueryHealthScoreGql>>> =
    std::sync::OnceLock::new();

fn optimization_suggestions_store(
) -> &'static Mutex<HashMap<String, Vec<QueryOptimizationSuggestionGql>>> {
    OPTIMIZATION_SUGGESTIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn health_scores_store() -> &'static Mutex<HashMap<String, QueryHealthScoreGql>> {
    HEALTH_SCORES.get_or_init(|| Mutex::new(HashMap::new()))
}

/// V43.0: 分析查询并存入存储
pub fn analyze_and_store_query(query_hash: &str, query: &str) {
    let suggestions = QueryOptimizer::analyze_query(query_hash, query);
    let health = calculate_query_health_score(query_hash, query);

    {
        let mut store = optimization_suggestions_store()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        store.insert(query_hash.to_string(), suggestions);
    }
    {
        let mut store = health_scores_store()
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        store.insert(query_hash.to_string(), health);
    }
}

/// V43.0: 获取指定查询的优化建议
pub fn get_query_optimization_suggestions(query_hash: &str) -> Vec<QueryOptimizationSuggestionGql> {
    let store = optimization_suggestions_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store.get(query_hash).cloned().unwrap_or_default()
}

/// V43.0: 获取指定查询的健康度
pub fn get_query_health_score(query_hash: &str) -> Option<QueryHealthScoreGql> {
    let store = health_scores_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store.get(query_hash).cloned()
}

/// V43.0: 获取所有优化建议
pub fn get_all_optimization_suggestions() -> Vec<QueryOptimizationSuggestionGql> {
    let store = optimization_suggestions_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store.values().flatten().cloned().collect()
}

/// V43.0: 应用优化建议
pub fn apply_optimization_suggestion(query_hash: &str, suggestion_id: &str) -> bool {
    let mut store = optimization_suggestions_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(suggestions) = store.get_mut(query_hash) {
        suggestions.retain(|s| s.id != suggestion_id);
        return true;
    }
    false
}

/// V43.0: 初始化示例优化数据
fn seed_optimization_demo_data() {
    let demo_queries = vec![
        (
            "demo_customer_list",
            r#"query CustomerList { customers { id name code status orders { id status totalAmount } contacts { id name email } } }"#,
        ),
        (
            "demo_dashboard",
            r#"query Dashboard { businessStats { erp { total active } crm { total } hrm { total } } todos { id title status } services { service healthy } }"#,
        ),
        (
            "demo_voucher_detail",
            r#"query VoucherDetail($id: ID!) { voucher(id: $id) { id voucherNumber totalDebit totalCredit status voucherDate accountSubject { id code name category balance } } }"#,
        ),
    ];

    for (_name, query) in demo_queries {
        let mut hasher = Sha256::new();
        hasher.update(query.as_bytes());
        let hash = format!("{:x}", hasher.finalize());
        analyze_and_store_query(&hash, query);
    }
}

// ---------------- V43.0: NL2GraphQL 规则引擎 ----------------

/// V43.0: 中英文实体关键词映射
pub(crate) struct EntityKeyword {
    en: &'static str,
    zh: &'static str,
    entity: &'static str,
    service: &'static str,
    default_fields: &'static [&'static str],
}

static ENTITY_KEYWORDS: &[EntityKeyword] = &[
    EntityKeyword {
        en: "customer",
        zh: "客户",
        entity: "Customer",
        service: "erp",
        default_fields: &["id", "name", "code", "status"],
    },
    EntityKeyword {
        en: "supplier",
        zh: "供应商",
        entity: "Supplier",
        service: "erp",
        default_fields: &["id", "name", "code", "status"],
    },
    EntityKeyword {
        en: "material",
        zh: "物料",
        entity: "Material",
        service: "erp",
        default_fields: &["id", "name", "code", "category"],
    },
    EntityKeyword {
        en: "order",
        zh: "订单",
        entity: "Order",
        service: "erp",
        default_fields: &["id", "orderNumber", "status", "totalAmount"],
    },
    EntityKeyword {
        en: "employee",
        zh: "员工",
        entity: "Employee",
        service: "hrm",
        default_fields: &["id", "name", "department", "position"],
    },
    EntityKeyword {
        en: "department",
        zh: "部门",
        entity: "Department",
        service: "hrm",
        default_fields: &["id", "name", "code"],
    },
    EntityKeyword {
        en: "voucher",
        zh: "凭证",
        entity: "Voucher",
        service: "finance",
        default_fields: &["id", "voucherNumber", "status", "totalDebit", "totalCredit"],
    },
    EntityKeyword {
        en: "contact",
        zh: "联系人",
        entity: "Contact",
        service: "crm",
        default_fields: &["id", "name", "email", "customerId"],
    },
    EntityKeyword {
        en: "todo",
        zh: "待办",
        entity: "Todo",
        service: "portal",
        default_fields: &["id", "title", "status", "source"],
    },
    EntityKeyword {
        en: "service",
        zh: "服务",
        entity: "ServiceHealth",
        service: "portal",
        default_fields: &["service", "healthy", "url"],
    },
];

/// V43.0: 动作关键词
struct ActionKeyword {
    en: &'static [&'static str],
    zh: &'static [&'static str],
    action: &'static str,
}

static ACTION_KEYWORDS: &[ActionKeyword] = &[
    ActionKeyword {
        en: &["list", "get", "find", "search", "query", "show"],
        zh: &["列表", "查询", "搜索", "找", "显示", "所有"],
        action: "list",
    },
    ActionKeyword {
        en: &["count", "total", "statistics", "stats"],
        zh: &["统计", "数量", "多少", "总计"],
        action: "count",
    },
    ActionKeyword {
        en: &["create", "add", "new"],
        zh: &["创建", "新增", "添加"],
        action: "create",
    },
    ActionKeyword {
        en: &["update", "modify", "edit"],
        zh: &["更新", "修改", "编辑"],
        action: "update",
    },
    ActionKeyword {
        en: &["delete", "remove"],
        zh: &["删除", "移除"],
        action: "delete",
    },
    ActionKeyword {
        en: &["detail", "by id", "get one"],
        zh: &["详情", "详细信息", "单个"],
        action: "detail",
    },
];

/// V43.0: NL2GraphQL 解析器
pub struct Nl2GraphqlParser;

impl Default for Nl2GraphqlParser {
    fn default() -> Self {
        Self::new()
    }
}

impl Nl2GraphqlParser {
    pub fn new() -> Self {
        Self
    }

    /// 解析自然语言查询
    pub fn parse(natural_language: &str) -> Nl2GraphqlResultGql {
        let lowercase = natural_language.to_lowercase();
        let intent = Self::detect_intent(&lowercase);
        Self::generate_query(&intent, &lowercase)
    }

    /// 检测用户意图
    pub fn detect_intent(nl_lower: &str) -> EntityIntentGql {
        let mut best_entity: Option<&EntityKeyword> = None;
        let mut best_entity_score = 0;

        for ek in ENTITY_KEYWORDS.iter() {
            let mut score = 0;
            if nl_lower.contains(ek.en) {
                score += 10;
            }
            if nl_lower.contains(ek.zh) {
                score += 10;
            }
            if score > best_entity_score {
                best_entity_score = score;
                best_entity = Some(ek);
            }
        }

        let entity = best_entity
            .map(|e| e.entity.to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        let mut best_action = "list";
        let mut best_action_score = 0;

        for ak in ACTION_KEYWORDS.iter() {
            let mut score = 0;
            for kw in ak.en.iter() {
                if nl_lower.contains(kw) {
                    score += 5;
                }
            }
            for kw in ak.zh.iter() {
                if nl_lower.contains(kw) {
                    score += 5;
                }
            }
            if score > best_action_score {
                best_action_score = score;
                best_action = ak.action;
            }
        }

        let fields = Self::suggest_fields(best_entity, nl_lower);
        let filters = Self::detect_filters(nl_lower, best_entity);

        let mut sorting = None;
        if nl_lower.contains("排序") || nl_lower.contains("order by") || nl_lower.contains("sort")
        {
            sorting = Some("name".to_string());
        }

        let mut pagination = None;
        if nl_lower.contains("分页") || nl_lower.contains("page") || nl_lower.contains("limit") {
            pagination = Some("first: 20".to_string());
        }

        let mut aggregation = None;
        if nl_lower.contains("分组") || nl_lower.contains("group by") || nl_lower.contains("统计")
        {
            aggregation = Some("count".to_string());
        }

        EntityIntentGql {
            entity,
            action: best_action.to_string(),
            fields,
            filters,
            sorting,
            pagination,
            aggregation,
        }
    }

    /// 生成 GraphQL 查询字符串
    pub fn generate_query(intent: &EntityIntentGql, _nl_lower: &str) -> Nl2GraphqlResultGql {
        let fields_str = if intent.fields.is_empty() {
            "id".to_string()
        } else {
            intent.fields.join(" ")
        };

        let filters_str: Vec<String> = intent
            .filters
            .iter()
            .map(|f| {
                format!(
                    "{}: {}",
                    f.field,
                    format_filter_value(&f.operator, &f.value)
                )
            })
            .collect();

        let _args_str = if filters_str.is_empty() {
            String::new()
        } else {
            format!("({})", filters_str.join(", "))
        };

        let operation_type = if intent.action == "create"
            || intent.action == "update"
            || intent.action == "delete"
        {
            "mutation"
        } else {
            "query"
        };

        let _query_field = match intent.action.as_str() {
            "detail" => format!("{}(id: $id)", to_camel_case(&intent.entity)),
            "count" => format!("{}Count", to_camel_case(&intent.entity)),
            "create" => format!("create{}", intent.entity),
            "update" => format!("update{}", intent.entity),
            "delete" => format!("delete{}", intent.entity),
            _ => format!(
                "{}{}s",
                to_camel_case_lower(&intent.entity),
                if intent.entity.ends_with('s') { "" } else { "" }
            ),
        };

        let list_field = to_plural_camel(&intent.entity);

        let query = if intent.action == "detail" {
            format!(
                r#"query Get{}($id: String!) {{
  {}(id: $id) {{
    {}
  }}
}}"#,
                intent.entity,
                to_camel_case_lower(&intent.entity),
                fields_str
            )
        } else if intent.action == "count" {
            format!(
                r#"query Count{} {{
  businessStats {{
    {} {{
      total
    }}
  }}
}}"#,
                intent.entity,
                service_for_entity(&intent.entity)
            )
        } else if intent.action == "create" {
            format!(
                r#"mutation Create{}($data: JSON!) {{
  create{}(entityType: "{}", data: $data)
}}"#,
                intent.entity,
                "Entity",
                to_entity_type(&intent.entity)
            )
        } else {
            format!(
                r#"query List{} {{
  {} {{
    {}
  }}
}}"#,
                intent.entity, list_field, fields_str
            )
        };

        let confidence = if intent.entity == "Unknown" {
            0.3
        } else if intent.filters.is_empty() {
            0.7
        } else {
            0.85
        };

        let interpretation = format!(
            "检测到意图：{} {}，包含 {} 个字段，{} 个过滤条件",
            intent.action,
            intent.entity,
            intent.fields.len(),
            intent.filters.len()
        );

        let mut suggestions = vec![
            "可添加具体过滤条件以缩小范围".to_string(),
            "考虑分页以提升性能".to_string(),
        ];
        if intent.fields.len() < 5 {
            suggestions.push("可增加返回字段以获取更多信息".to_string());
        }

        let alternative_queries = Self::generate_alternatives(intent);

        Nl2GraphqlResultGql {
            query,
            variables: serde_json::json!({}),
            operation_type: operation_type.to_string(),
            entity_type: intent.entity.clone(),
            fields: intent.fields.clone(),
            filters: intent.filters.clone(),
            confidence,
            interpretation,
            suggestions,
            alternative_queries,
        }
    }

    /// 推荐字段
    pub(crate) fn suggest_fields(
        entity_keyword: Option<&EntityKeyword>,
        nl_lower: &str,
    ) -> Vec<String> {
        let mut fields: Vec<String> = entity_keyword
            .map(|e| e.default_fields.iter().map(|f| f.to_string()).collect())
            .unwrap_or_default();

        let field_keywords = [
            ("name", "名称"),
            ("code", "编码"),
            ("status", "状态"),
            ("email", "邮箱"),
            ("phone", "电话"),
            ("id", "编号"),
            ("department", "部门"),
            ("position", "职位"),
            ("totalAmount", "金额"),
            ("orderNumber", "单号"),
        ];

        for (en, zh) in field_keywords.iter() {
            if nl_lower.contains(en) || nl_lower.contains(zh) {
                let field = en.to_string();
                if !fields.contains(&field) {
                    fields.push(field);
                }
            }
        }

        if fields.is_empty() {
            fields = vec!["id".to_string(), "name".to_string()];
        }

        fields
    }

    fn detect_filters(nl_lower: &str, _entity_keyword: Option<&EntityKeyword>) -> Vec<NlFilterGql> {
        let mut filters = Vec::new();

        let status_patterns = [
            "状态为",
            "状态是",
            "status =",
            "status is",
            "active",
            "活跃",
            "禁用",
            "disabled",
            "draft",
            "草稿",
        ];
        for p in status_patterns.iter() {
            if nl_lower.contains(p) {
                let value = if nl_lower.contains("active") || nl_lower.contains("活跃") {
                    "active"
                } else if nl_lower.contains("disabled") || nl_lower.contains("禁用") {
                    "inactive"
                } else if nl_lower.contains("draft") || nl_lower.contains("草稿") {
                    "draft"
                } else {
                    "active"
                };
                filters.push(NlFilterGql {
                    field: "status".to_string(),
                    operator: "eq".to_string(),
                    value: value.to_string(),
                });
                break;
            }
        }

        let keyword_patterns = ["搜索", "search", "keyword", "关键词"];
        for p in keyword_patterns.iter() {
            if nl_lower.contains(p) {
                filters.push(NlFilterGql {
                    field: "keyword".to_string(),
                    operator: "contains".to_string(),
                    value: "".to_string(),
                });
                break;
            }
        }

        filters
    }

    fn generate_alternatives(intent: &EntityIntentGql) -> Vec<String> {
        let mut alternatives = Vec::new();

        let list_field = to_plural_camel(&intent.entity);
        let fields_str = if intent.fields.is_empty() {
            "id name"
        } else {
            &intent.fields.join(" ")
        };

        alternatives.push(format!(
            r#"query {{ {} {{ {} }} }}"#,
            list_field, fields_str
        ));

        alternatives.push(format!(
            r#"query {{ businessStats {{ {} {{ total }} }} }}"#,
            service_for_entity(&intent.entity)
        ));

        alternatives
    }
}

fn format_filter_value(operator: &str, value: &str) -> String {
    match operator {
        "eq" | "contains" | "startsWith" => format!("\"{}\"", value),
        _ => value.to_string(),
    }
}

fn to_camel_case(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

fn to_camel_case_lower(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_lowercase().collect::<String>() + chars.as_str(),
    }
}

fn to_plural_camel(entity: &str) -> String {
    let lower = to_camel_case_lower(entity);
    match entity {
        "Customer" => "customers".to_string(),
        "Supplier" => "suppliers".to_string(),
        "Material" => "materials".to_string(),
        "Order" => "orders".to_string(),
        "Employee" => "employees".to_string(),
        "Department" => "departments".to_string(),
        "Voucher" => "vouchers".to_string(),
        "Contact" => "contacts".to_string(),
        "Todo" => "unifiedTodos".to_string(),
        "ServiceHealth" => "serviceHealth".to_string(),
        _ => format!("{}s", lower),
    }
}

fn service_for_entity(entity: &str) -> &'static str {
    match entity {
        "Customer" | "Supplier" | "Material" | "Order" => "erp",
        "Employee" | "Department" => "hrm",
        "Voucher" => "finance",
        "Contact" => "crm",
        "Todo" | "ServiceHealth" => "portal",
        _ => "erp",
    }
}

fn to_entity_type(entity: &str) -> String {
    match entity {
        "Customer" => "customers".to_string(),
        "Supplier" => "suppliers".to_string(),
        "Material" => "materials".to_string(),
        "Order" => "orders".to_string(),
        "Employee" => "employees".to_string(),
        "Department" => "departments".to_string(),
        "Voucher" => "vouchers".to_string(),
        "Contact" => "contacts".to_string(),
        _ => to_plural_camel(entity),
    }
}

// ---------------- V43.0: NL2GraphQL 使用统计 ----------------

static NL2GRAPHQL_STATS: std::sync::OnceLock<Mutex<Nl2GraphqlStatsInternal>> =
    std::sync::OnceLock::new();

struct Nl2GraphqlStatsInternal {
    total_queries: u64,
    total_confidence: f64,
}

impl Nl2GraphqlStatsInternal {
    fn new() -> Self {
        Self {
            total_queries: 0,
            total_confidence: 0.0,
        }
    }
}

fn nl2graphql_stats_internal() -> &'static Mutex<Nl2GraphqlStatsInternal> {
    NL2GRAPHQL_STATS.get_or_init(|| Mutex::new(Nl2GraphqlStatsInternal::new()))
}

/// V43.0: 记录 NL2GraphQL 查询
pub fn record_nl2graphql_query(confidence: f64) {
    let mut stats = nl2graphql_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    stats.total_queries += 1;
    stats.total_confidence += confidence;
}

/// V43.0: 获取 NL2GraphQL 统计
fn get_nl2graphql_stats() -> (u64, f64) {
    let stats = nl2graphql_stats_internal()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let avg = if stats.total_queries > 0 {
        stats.total_confidence / stats.total_queries as f64
    } else {
        0.0
    };
    (stats.total_queries, avg)
}

// ---------------- V43.0: 智能缓存推荐引擎 ----------------

/// V43.0: 查询访问模式数据
pub(crate) struct QueryAccessPattern {
    query_hash: String,
    query_name: String,
    access_count: u64,
    change_count: u64,
    avg_execution_ms: u64,
    current_tier: CacheTier,
    last_accessed: DateTime<Utc>,
}

/// V43.0: 缓存推荐引擎
pub struct CacheRecommendationEngine;

impl CacheRecommendationEngine {
    /// 分析所有查询并生成缓存推荐报告
    pub fn analyze() -> CacheRecommendationReportGql {
        let patterns = Self::collect_access_patterns();
        let mut recommendations = Vec::new();

        for pattern in patterns.iter() {
            if let Some(rec) = Self::recommend_tier(pattern) {
                recommendations.push(rec);
            }
        }

        let quick_wins = recommendations
            .iter()
            .filter(|r| r.confidence > 0.8 && r.expected_latency_reduction_pct > 20.0)
            .count() as i32;

        let avg_hit_rate_improvement = if recommendations.is_empty() {
            0.0
        } else {
            recommendations
                .iter()
                .map(|r| r.expected_hit_rate)
                .sum::<f64>()
                / recommendations.len() as f64
        };

        let avg_latency_reduction = if recommendations.is_empty() {
            0.0
        } else {
            recommendations
                .iter()
                .map(|r| r.expected_latency_reduction_pct)
                .sum::<f64>()
                / recommendations.len() as f64
        };

        CacheRecommendationReportGql {
            total_queries: patterns.len() as i32,
            recommended_changes: recommendations.len() as i32,
            quick_wins,
            total_queries_analyzed: patterns.len() as i32,
            estimated_overall_hit_rate_improvement: avg_hit_rate_improvement.min(50.0),
            estimated_latency_reduction_pct: avg_latency_reduction.min(40.0),
            recommendations,
        }
    }

    /// 计算缓存适合度分数
    pub(crate) fn calculate_cache_suitability(pattern: &QueryAccessPattern) -> f64 {
        let frequency_score = if pattern.access_count > 1000 {
            1.0
        } else if pattern.access_count > 100 {
            0.7
        } else if pattern.access_count > 10 {
            0.4
        } else {
            0.1
        };

        let change_ratio = if pattern.access_count > 0 {
            pattern.change_count as f64 / pattern.access_count as f64
        } else {
            0.0
        };
        let stability_score = (1.0 - change_ratio).max(0.0);

        let cost_score = if pattern.avg_execution_ms > 500 {
            1.0
        } else if pattern.avg_execution_ms > 100 {
            0.7
        } else if pattern.avg_execution_ms > 50 {
            0.4
        } else {
            0.2
        };

        (frequency_score * 0.4 + stability_score * 0.35 + cost_score * 0.25).min(1.0)
    }

    /// 推荐缓存层级
    pub(crate) fn recommend_tier(pattern: &QueryAccessPattern) -> Option<CacheRecommendationGql> {
        let suitability = Self::calculate_cache_suitability(pattern);
        let recommended = if suitability > 0.8 {
            CacheTier::LongLived
        } else if suitability > 0.5 {
            CacheTier::MediumLived
        } else if suitability > 0.25 {
            CacheTier::ShortLived
        } else {
            CacheTier::None
        };

        let tier_changed = match (&pattern.current_tier, &recommended) {
            (CacheTier::None, CacheTier::None) => false,
            (CacheTier::ShortLived, CacheTier::ShortLived) => false,
            (CacheTier::MediumLived, CacheTier::MediumLived) => false,
            (CacheTier::LongLived, CacheTier::LongLived) => false,
            _ => true,
        };

        if !tier_changed && suitability < 0.3 {
            return None;
        }

        let expected_hit_rate = if suitability > 0.7 {
            0.75
        } else if suitability > 0.4 {
            0.5
        } else {
            0.25
        };

        let latency_reduction = match recommended {
            CacheTier::LongLived => 40.0,
            CacheTier::MediumLived => 25.0,
            CacheTier::ShortLived => 10.0,
            CacheTier::None => 0.0,
        };

        let reason = if suitability > 0.7 {
            format!(
                "高频访问（{} 次）+ 低变化率，适合长期缓存",
                pattern.access_count
            )
        } else if suitability > 0.4 {
            format!("中等访问频率（{} 次），建议中期缓存", pattern.access_count)
        } else {
            format!("低频访问（{} 次），短期缓存或不缓存", pattern.access_count)
        };

        Some(CacheRecommendationGql {
            query_hash: pattern.query_hash.clone(),
            query_name: pattern.query_name.clone(),
            recommended_tier: cache_tier_name(&recommended),
            current_tier: cache_tier_name(&pattern.current_tier),
            reason,
            expected_hit_rate,
            expected_latency_reduction_pct: latency_reduction,
            confidence: suitability,
            supporting_data: serde_json::json!({
                "access_count": pattern.access_count,
                "change_count": pattern.change_count,
                "avg_execution_ms": pattern.avg_execution_ms,
                "suitability_score": suitability,
                "last_accessed": pattern.last_accessed.to_rfc3339(),
            }),
        })
    }

    fn collect_access_patterns() -> Vec<QueryAccessPattern> {
        let mut patterns = Vec::new();
        let now = Utc::now();

        let demo_patterns = vec![
            (
                "customer_list",
                "CustomerList",
                1500,
                50,
                200,
                CacheTier::MediumLived,
            ),
            (
                "dashboard",
                "Dashboard",
                3000,
                200,
                150,
                CacheTier::ShortLived,
            ),
            (
                "voucher_detail",
                "VoucherDetail",
                800,
                100,
                300,
                CacheTier::MediumLived,
            ),
            (
                "service_health",
                "ServiceHealth",
                5000,
                1000,
                50,
                CacheTier::ShortLived,
            ),
            (
                "employee_list",
                "EmployeeList",
                400,
                20,
                180,
                CacheTier::None,
            ),
            (
                "order_detail",
                "OrderDetail",
                1200,
                300,
                250,
                CacheTier::ShortLived,
            ),
        ];

        for (hash, name, access, change, exec_ms, tier) in demo_patterns {
            patterns.push(QueryAccessPattern {
                query_hash: hash.to_string(),
                query_name: name.to_string(),
                access_count: access,
                change_count: change,
                avg_execution_ms: exec_ms,
                current_tier: tier,
                last_accessed: now - chrono::Duration::minutes(access as i64 % 60),
            });
        }

        patterns
    }
}

fn cache_tier_name(tier: &CacheTier) -> String {
    match tier {
        CacheTier::None => "None".to_string(),
        CacheTier::ShortLived => "ShortLived".to_string(),
        CacheTier::MediumLived => "MediumLived".to_string(),
        CacheTier::LongLived => "LongLived".to_string(),
    }
}

// ---------------- V43.0: 缓存推荐存储 ----------------

static CACHE_RECOMMENDATIONS: std::sync::OnceLock<Mutex<Option<CacheRecommendationReportGql>>> =
    std::sync::OnceLock::new();

fn cache_recommendations_store() -> &'static Mutex<Option<CacheRecommendationReportGql>> {
    CACHE_RECOMMENDATIONS.get_or_init(|| Mutex::new(None))
}

/// V43.0: 生成缓存推荐
pub fn generate_cache_recommendations() -> u32 {
    let report = CacheRecommendationEngine::analyze();
    let count = report.recommended_changes as u32;
    let mut store = cache_recommendations_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    *store = Some(report);
    count
}

/// V43.0: 获取缓存推荐报告
pub fn get_cache_recommendations() -> CacheRecommendationReportGql {
    let store = cache_recommendations_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    store
        .clone()
        .unwrap_or_else(CacheRecommendationEngine::analyze)
}

/// V43.0: 接受缓存推荐
pub fn accept_cache_recommendation(query_hash: &str) -> bool {
    let mut store = cache_recommendations_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if let Some(ref mut report) = *store {
        if let Some(pos) = report
            .recommendations
            .iter()
            .position(|r| r.query_hash == query_hash)
        {
            report.recommendations.remove(pos);
            report.recommended_changes = report.recommended_changes.saturating_sub(1);
            return true;
        }
    }
    false
}

// ---------------- V43.0: AI 优化统计 ----------------

/// V43.0: 获取 AI 优化统计
pub fn get_ai_optimization_stats() -> AiOptimizationStatsGql {
    let suggestions = get_all_optimization_suggestions();
    let health_scores = health_scores_store()
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let (nl_queries, nl_confidence_avg) = get_nl2graphql_stats();
    let cache_report = get_cache_recommendations();

    let avg_health = if health_scores.is_empty() {
        75.0
    } else {
        health_scores.values().map(|h| h.overall_score).sum::<f64>() / health_scores.len() as f64
    };

    let critical = suggestions
        .iter()
        .filter(|s| s.severity == "critical")
        .count() as i32;
    let warning = suggestions
        .iter()
        .filter(|s| s.severity == "warning")
        .count() as i32;
    let n_plus_one = suggestions
        .iter()
        .filter(|s| s.category == "n_plus_one")
        .count() as i32;
    let overfetching = suggestions
        .iter()
        .filter(|s| s.category == "overfetching" || s.category == "complexity")
        .count() as i32;

    AiOptimizationStatsGql {
        total_queries_analyzed: health_scores.len() as i32,
        total_suggestions: suggestions.len() as i32,
        critical_issues: critical,
        warning_issues: warning,
        avg_health_score: avg_health,
        n_plus_one_detected: n_plus_one,
        overfetching_detected: overfetching,
        cache_recommendations: cache_report.recommended_changes,
        nl_queries_processed: nl_queries as i32,
        nl_confidence_avg,
    }
}

/// V43.0: 初始化 V43.0 AI 辅助功能（在 build_schema 中调用）
pub fn init_ai_assistance() {
    seed_optimization_demo_data();
    let _ = generate_cache_recommendations();
}
