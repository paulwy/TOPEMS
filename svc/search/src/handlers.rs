use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, api_success};

use crate::models::{SearchRequest, SearchResponse, SearchResult};

use std::collections::{HashMap, HashSet};

// ===== Pure functions (no DB / async / external deps) =====

/// Wrap every case-insensitive occurrence of `term` in `text` with `**...**`.
pub fn highlight_term(text: &str, term: &str) -> String {
    if term.is_empty() {
        return text.to_string();
    }
    let text_chars: Vec<char> = text.chars().collect();
    let text_lower: Vec<char> = text.to_lowercase().chars().collect();
    let term_lower: Vec<char> = term.to_lowercase().chars().collect();
    let tlen = term_lower.len();
    if tlen == 0 || tlen > text_lower.len() {
        return text.to_string();
    }
    let mut result = String::new();
    let mut i = 0;
    while i < text_chars.len() {
        if i + tlen <= text_lower.len() && text_lower[i..i + tlen] == term_lower[..] {
            result.push_str("**");
            for c in &text_chars[i..i + tlen] {
                result.push(*c);
            }
            result.push_str("**");
            i += tlen;
        } else {
            result.push(text_chars[i]);
            i += 1;
        }
    }
    result
}

/// Compare two search results: higher score first, then more recent date first.
pub fn compare_search_results(
    a_score: f64,
    a_date: i64,
    b_score: f64,
    b_date: i64,
) -> std::cmp::Ordering {
    b_score
        .partial_cmp(&a_score)
        .unwrap_or(std::cmp::Ordering::Equal)
        .then_with(|| b_date.cmp(&a_date))
}

/// Count facets: given a list of `(field_name, value)` pairs, return a map
/// of `"field:value"` -> count.
pub fn count_facets(items: &[(&str, &str)]) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for (field, value) in items {
        let key = format!("{}:{}", field, value);
        *counts.entry(key).or_insert(0) += 1;
    }
    counts
}

/// Match a value against a filter pattern supporting wildcards:
/// `prefix*`, `*suffix`, `*contains*`, or exact match.
pub fn matches_filter(value: &str, filter: &str) -> bool {
    let starts_wild = filter.starts_with('*');
    let ends_wild = filter.ends_with('*');
    match (starts_wild, ends_wild) {
        (true, true) => {
            if filter.len() < 2 {
                return true;
            }
            let middle = &filter[1..filter.len() - 1];
            value.contains(middle)
        }
        (true, false) => {
            let suffix = &filter[1..];
            if suffix.is_empty() {
                return true;
            }
            value.ends_with(suffix)
        }
        (false, true) => {
            let prefix = &filter[..filter.len() - 1];
            if prefix.is_empty() {
                return true;
            }
            value.starts_with(prefix)
        }
        (false, false) => value == filter,
    }
}

/// Remove duplicate IDs while preserving insertion order.
pub fn deduplicate_results(ids: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for id in ids {
        if seen.insert(id.clone()) {
            result.push(id.clone());
        }
    }
    result
}

/// Extract a snippet around the first (case-insensitive) occurrence of `query`
/// in `text`, including `context_chars` of surrounding text on each side.
pub fn extract_snippet(text: &str, query: &str, context_chars: usize) -> String {
    if text.is_empty() {
        return String::new();
    }
    let text_chars: Vec<char> = text.chars().collect();
    let text_lower: Vec<char> = text.to_lowercase().chars().collect();

    if query.is_empty() {
        let end = context_chars.min(text_chars.len());
        return text_chars[..end].iter().collect();
    }

    let query_lower: Vec<char> = query.to_lowercase().chars().collect();
    let qlen = query_lower.len();
    if qlen == 0 || qlen > text_lower.len() {
        let end = context_chars.min(text_chars.len());
        return text_chars[..end].iter().collect();
    }

    let mut match_start: Option<usize> = None;
    for i in 0..=text_lower.len() - qlen {
        if text_lower[i..i + qlen] == query_lower[..] {
            match_start = Some(i);
            break;
        }
    }

    let (start, end) = match match_start {
        Some(pos) => {
            let s = pos.saturating_sub(context_chars);
            let e = (pos + qlen + context_chars).min(text_chars.len());
            (s, e)
        }
        None => (0, context_chars.min(text_chars.len())),
    };

    text_chars[start..end].iter().collect()
}

#[derive(Debug, Clone, FromRow)]
struct UserSearchRow {
    id: Uuid,
    username: String,
    email: String,
    full_name: Option<String>,
    status: String,
}

#[derive(Debug, Clone, FromRow)]
struct CustomerSearchRow {
    id: Uuid,
    #[allow(dead_code)]
    code: String,
    name: String,
    contact_person: Option<String>,
    phone: Option<String>,
    #[allow(dead_code)]
    email: Option<String>,
    address: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct SalesOrderSearchRow {
    id: Uuid,
    order_number: String,
    status: String,
    remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct PurchaseOrderSearchRow {
    id: Uuid,
    order_number: String,
    status: String,
    remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
struct DocumentSearchRow {
    id: Uuid,
    name: String,
    #[allow(dead_code)]
    path: String,
    mime_type: Option<String>,
}

async fn search_users(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
    let keyword_like = format!("%{}%", keyword);

    let rows: Vec<UserSearchRow> = match sqlx::query_as(
        r#"SELECT id, username, email, full_name, status
           FROM core_users
           WHERE username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2"#,
    )
    .bind(keyword_like)
    .bind(limit)
    .fetch_all(pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("搜索用户失败: {}", e);
            return Vec::new();
        }
    };

    rows.into_iter()
        .map(|r| SearchResult {
            id: r.id.to_string(),
            title: r.full_name.unwrap_or_else(|| r.username.clone()),
            description: Some(format!("{} | {}", r.email, r.status)),
            module: "user".to_string(),
            path: format!("/system/users/{}", r.id),
            type_name: "用户".to_string(),
        })
        .collect()
}

async fn search_customers(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
    let keyword_like = format!("%{}%", keyword);

    let rows: Vec<CustomerSearchRow> = match sqlx::query_as(
        r#"SELECT id, code, name, contact_person, phone, email, address
           FROM erp_customers
           WHERE code ILIKE $1 OR name ILIKE $1 OR contact_person ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2"#,
    )
    .bind(keyword_like)
    .bind(limit)
    .fetch_all(pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("搜索客户失败: {}", e);
            return Vec::new();
        }
    };

    rows.into_iter()
        .map(|r| {
            let description = match (
                r.contact_person.as_ref(),
                r.phone.as_ref(),
                r.address.as_ref(),
            ) {
                (Some(cp), Some(p), Some(a)) => Some(format!("{} | {} | {}", cp, p, a)),
                (Some(cp), Some(p), None) => Some(format!("{} | {}", cp, p)),
                (Some(cp), None, Some(a)) => Some(format!("{} | {}", cp, a)),
                (None, Some(p), Some(a)) => Some(format!("{} | {}", p, a)),
                (Some(cp), None, None) => Some(cp.clone()),
                (None, Some(p), None) => Some(p.clone()),
                (None, None, Some(a)) => Some(a.clone()),
                _ => None,
            };
            SearchResult {
                id: r.id.to_string(),
                title: r.name,
                description,
                module: "customer".to_string(),
                path: format!("/crm/customers/{}", r.id),
                type_name: "客户".to_string(),
            }
        })
        .collect()
}

async fn search_orders(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
    let keyword_val = keyword.to_string();

    let mut results: Vec<SearchResult> = Vec::new();

    let sales_rows: Vec<SalesOrderSearchRow> = match sqlx::query_as(
        r#"SELECT id, order_number, status, remarks
           FROM erp_sales_orders
           WHERE order_number ILIKE $1 OR remarks ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2"#,
    )
    .bind(format!("%{}%", keyword_val))
    .bind(limit / 2)
    .fetch_all(pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("搜索销售订单失败: {}", e);
            Vec::new()
        }
    };

    results.extend(sales_rows.into_iter().map(|r| SearchResult {
        id: r.id.to_string(),
        title: r.order_number,
        description: r.remarks.or_else(|| Some(r.status.clone())),
        module: "order".to_string(),
        path: format!("/sales/orders/{}", r.id),
        type_name: "订单".to_string(),
    }));

    let purchase_rows: Vec<PurchaseOrderSearchRow> = match sqlx::query_as(
        r#"SELECT id, order_number, status, remarks
           FROM erp_purchase_orders
           WHERE order_number ILIKE $1 OR remarks ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2"#,
    )
    .bind(format!("%{}%", keyword_val))
    .bind(limit / 2)
    .fetch_all(pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("搜索采购订单失败: {}", e);
            Vec::new()
        }
    };

    results.extend(purchase_rows.into_iter().map(|r| SearchResult {
        id: r.id.to_string(),
        title: r.order_number,
        description: r.remarks.or_else(|| Some(r.status.clone())),
        module: "order".to_string(),
        path: format!("/purchase/orders/{}", r.id),
        type_name: "订单".to_string(),
    }));

    results
}

async fn search_documents(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
    let keyword_like = format!("%{}%", keyword);

    let rows: Vec<DocumentSearchRow> = match sqlx::query_as(
        r#"SELECT id, name, path, mime_type
           FROM core_files
           WHERE name ILIKE $1 OR path ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2"#,
    )
    .bind(keyword_like)
    .bind(limit)
    .fetch_all(pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("搜索文档失败: {}", e);
            return Vec::new();
        }
    };

    rows.into_iter()
        .map(|r| SearchResult {
            id: r.id.to_string(),
            title: r.name,
            description: r.mime_type.clone(),
            module: "document".to_string(),
            path: format!("/files/{}", r.id),
            type_name: "文档".to_string(),
        })
        .collect()
}

async fn search_all(
    pool: &PgPool,
    keyword: &str,
    modules: &Option<Vec<String>>,
    limit: i64,
) -> Vec<SearchResult> {
    let mut results: Vec<SearchResult> = Vec::new();
    let per_module_limit = limit / 5;

    let should_search = |module: &str| {
        modules
            .as_ref()
            .map_or(true, |m| m.contains(&module.to_string()))
    };

    if should_search("user") {
        results.extend(search_users(pool, keyword, per_module_limit).await);
    }

    if should_search("customer") {
        results.extend(search_customers(pool, keyword, per_module_limit).await);
    }

    if should_search("order") {
        results.extend(search_orders(pool, keyword, per_module_limit).await);
    }

    if should_search("document") {
        results.extend(search_documents(pool, keyword, per_module_limit).await);
    }

    results.sort_by(|a, b| b.title.cmp(&a.title));
    results.into_iter().take(limit as usize).collect()
}

#[utoipa::path(
    get,
    path = "/api/search",
    tag = "fulltext",
    params(
        ("keyword" = String, Query, description = "搜索关键词"),
        ("page" = Option<i64>, Query, description = "页码（默认 1）"),
        ("page_size" = Option<i64>, Query, description = "每页数量（默认 20，最大 100）"),
        ("modules" = Option<Vec<String>>, Query, description = "限定搜索模块列表，如 user/customer/order/document"),
    ),
    responses(
        (status = 200, description = "搜索结果"),
        (status = 400, description = "搜索关键词为空"),
    ),
)]
pub async fn search_handler(
    State(pool): State<PgPool>,
    Query(req): Query<SearchRequest>,
) -> Json<ApiResponse<SearchResponse>> {
    let keyword = req.keyword.trim().to_string();

    if keyword.is_empty() {
        return Json(api_error(400, "搜索关键词不能为空"));
    }

    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);

    let results = search_all(&pool, &keyword, &req.modules, page_size).await;
    let total = results.len() as i64;

    Json(api_success(SearchResponse {
        items: results,
        total,
        page,
        page_size,
    }))
}

#[utoipa::path(
    get,
    path = "/health",
    tag = "health",
    responses(
        (status = 200, description = "服务健康"),
    ),
)]
pub async fn health_handler() -> &'static str {
    "OK"
}

#[allow(dead_code)]
pub fn search_routes() -> Router<PgPool> {
    Router::new().route("/", get(search_handler))
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- highlight_term ---

    #[test]
    fn highlight_simple_match() {
        assert_eq!(highlight_term("hello world", "world"), "hello **world**");
    }

    #[test]
    fn highlight_case_insensitive() {
        assert_eq!(highlight_term("Hello World", "world"), "Hello **World**");
    }

    #[test]
    fn highlight_multiple_matches() {
        assert_eq!(
            highlight_term("hello hello hello", "hello"),
            "**hello** **hello** **hello**"
        );
    }

    #[test]
    fn highlight_no_match() {
        assert_eq!(highlight_term("hello world", "xyz"), "hello world");
    }

    #[test]
    fn highlight_empty_term() {
        assert_eq!(highlight_term("hello", ""), "hello");
    }

    #[test]
    fn highlight_empty_text() {
        assert_eq!(highlight_term("", "hello"), "");
    }

    #[test]
    fn highlight_preserves_original_case() {
        assert_eq!(highlight_term("HELLO World", "hello"), "**HELLO** World");
    }

    // --- compare_search_results ---

    #[test]
    fn compare_higher_score_first() {
        assert_eq!(
            compare_search_results(1.0, 0, 0.5, 0),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn compare_equal_scores_newer_date_first() {
        assert_eq!(
            compare_search_results(1.0, 100, 1.0, 50),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn compare_equal_scores_equal_dates() {
        assert_eq!(
            compare_search_results(1.0, 100, 1.0, 100),
            std::cmp::Ordering::Equal
        );
    }

    #[test]
    fn compare_lower_score_last() {
        assert_eq!(
            compare_search_results(0.5, 0, 1.0, 0),
            std::cmp::Ordering::Greater
        );
    }

    #[test]
    fn compare_nan_score_falls_back_to_date() {
        assert_eq!(
            compare_search_results(f64::NAN, 100, 1.0, 50),
            std::cmp::Ordering::Less
        );
    }

    #[test]
    fn compare_both_nan_falls_to_date() {
        assert_eq!(
            compare_search_results(f64::NAN, 200, f64::NAN, 100),
            std::cmp::Ordering::Less
        );
    }

    // --- count_facets ---

    #[test]
    fn facets_count_simple() {
        let items = vec![("module", "user"), ("module", "user"), ("module", "order")];
        let counts = count_facets(&items);
        assert_eq!(counts.get("module:user"), Some(&2));
        assert_eq!(counts.get("module:order"), Some(&1));
    }

    #[test]
    fn facets_empty() {
        let counts = count_facets(&[]);
        assert!(counts.is_empty());
    }

    #[test]
    fn facets_multiple_fields() {
        let items = vec![
            ("status", "active"),
            ("status", "inactive"),
            ("type", "user"),
        ];
        let counts = count_facets(&items);
        assert_eq!(counts.len(), 3);
        assert_eq!(counts.get("status:active"), Some(&1));
    }

    #[test]
    fn facets_single_item() {
        let items = vec![("module", "doc")];
        let counts = count_facets(&items);
        assert_eq!(counts.get("module:doc"), Some(&1));
    }

    #[test]
    fn facets_all_same() {
        let items = vec![("m", "a"), ("m", "a"), ("m", "a")];
        let counts = count_facets(&items);
        assert_eq!(counts.get("m:a"), Some(&3));
        assert_eq!(counts.len(), 1);
    }

    // --- matches_filter ---

    #[test]
    fn filter_exact_match() {
        assert!(matches_filter("hello", "hello"));
    }

    #[test]
    fn filter_exact_no_match() {
        assert!(!matches_filter("hello", "world"));
    }

    #[test]
    fn filter_prefix_wildcard() {
        assert!(matches_filter("hello world", "hello*"));
        assert!(!matches_filter("world hello", "hello*"));
    }

    #[test]
    fn filter_suffix_wildcard() {
        assert!(matches_filter("hello world", "*world"));
        assert!(!matches_filter("world hello", "*world"));
    }

    #[test]
    fn filter_contains_wildcard() {
        assert!(matches_filter("hello world", "*lo wo*"));
        assert!(!matches_filter("hello", "*lo wo*"));
    }

    #[test]
    fn filter_star_only_matches_all() {
        assert!(matches_filter("anything", "*"));
    }

    #[test]
    fn filter_double_star_matches_all() {
        assert!(matches_filter("anything", "**"));
    }

    #[test]
    fn filter_empty_filter_empty_value() {
        assert!(matches_filter("", ""));
    }

    // --- deduplicate_results ---

    #[test]
    fn dedup_preserves_order() {
        let ids = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        assert_eq!(deduplicate_results(&ids), ids);
    }

    #[test]
    fn dedup_removes_duplicates() {
        let ids = vec![
            "a".to_string(),
            "b".to_string(),
            "a".to_string(),
            "c".to_string(),
            "b".to_string(),
        ];
        assert_eq!(
            deduplicate_results(&ids),
            vec!["a".to_string(), "b".to_string(), "c".to_string()]
        );
    }

    #[test]
    fn dedup_empty() {
        assert!(deduplicate_results(&[]).is_empty());
    }

    #[test]
    fn dedup_all_same() {
        let ids = vec!["x".to_string(), "x".to_string(), "x".to_string()];
        assert_eq!(deduplicate_results(&ids), vec!["x".to_string()]);
    }

    #[test]
    fn dedup_single() {
        let ids = vec!["only".to_string()];
        assert_eq!(deduplicate_results(&ids), ids);
    }

    // --- extract_snippet ---

    #[test]
    fn snippet_basic_match() {
        let text = "the quick brown fox jumps";
        assert_eq!(extract_snippet(text, "brown", 5), "uick brown fox ");
    }

    #[test]
    fn snippet_case_insensitive() {
        let text = "The Quick Brown Fox";
        assert_eq!(extract_snippet(text, "brown", 5), "uick Brown Fox");
    }

    #[test]
    fn snippet_no_match_returns_beginning() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "xyz", 5), "hello");
    }

    #[test]
    fn snippet_empty_text() {
        assert_eq!(extract_snippet("", "query", 5), "");
    }

    #[test]
    fn snippet_empty_query_returns_beginning() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "", 5), "hello");
    }

    #[test]
    fn snippet_match_at_start() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "hello", 3), "hello wo");
    }

    #[test]
    fn snippet_match_at_end() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "world", 3), "lo world");
    }

    #[test]
    fn snippet_zero_context() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "hello", 0), "hello");
    }

    // --- 边界用例补充 ---

    // highlight_term 边界

    #[test]
    fn highlight_term_longer_than_text() {
        assert_eq!(highlight_term("hi", "hello"), "hi");
    }

    #[test]
    fn highlight_term_single_char() {
        assert_eq!(highlight_term("a quick fox", "a"), "**a** quick fox");
    }

    #[test]
    fn highlight_term_unicode() {
        assert_eq!(highlight_term("你好世界", "好"), "你**好**世界");
    }

    #[test]
    fn highlight_term_entire_text() {
        assert_eq!(highlight_term("hello", "hello"), "**hello**");
    }

    // matches_filter 边界

    #[test]
    fn matches_filter_case_sensitive() {
        assert!(!matches_filter("Hello", "hello"));
    }

    #[test]
    fn matches_filter_empty_value_nonempty_filter() {
        assert!(!matches_filter("", "hello"));
    }

    #[test]
    fn matches_filter_star_only_empty_value() {
        assert!(matches_filter("", "*"));
    }

    #[test]
    fn matches_filter_suffix_partial() {
        assert!(matches_filter("hello", "*lo"));
        assert!(!matches_filter("hello", "*wo"));
    }

    // deduplicate_results 边界

    #[test]
    fn dedup_many_distinct() {
        let ids = vec![
            "a".to_string(),
            "b".to_string(),
            "c".to_string(),
            "d".to_string(),
        ];
        assert_eq!(deduplicate_results(&ids), ids);
    }

    #[test]
    fn dedup_preserves_first_occurrence() {
        let ids = vec![
            "b".to_string(),
            "a".to_string(),
            "b".to_string(),
            "a".to_string(),
        ];
        assert_eq!(
            deduplicate_results(&ids),
            vec!["b".to_string(), "a".to_string()]
        );
    }

    #[test]
    fn dedup_interleaved() {
        let ids = vec![
            "x".to_string(),
            "y".to_string(),
            "x".to_string(),
            "z".to_string(),
            "y".to_string(),
        ];
        assert_eq!(
            deduplicate_results(&ids),
            vec!["x".to_string(), "y".to_string(), "z".to_string()]
        );
    }

    // extract_snippet 边界

    #[test]
    fn snippet_match_in_middle() {
        let text = "the quick brown fox jumps";
        assert_eq!(extract_snippet(text, "brown", 3), "ck brown fo");
    }

    #[test]
    fn snippet_large_context_exceeds_text() {
        let text = "hello";
        assert_eq!(extract_snippet(text, "lo", 100), "hello");
    }

    #[test]
    fn snippet_zero_context_no_match() {
        let text = "hello world";
        assert_eq!(extract_snippet(text, "xyz", 0), "");
    }

    #[test]
    fn snippet_unicode_text() {
        let text = "你好世界测试";
        assert_eq!(extract_snippet(text, "世界", 1), "好世界测");
    }
}
