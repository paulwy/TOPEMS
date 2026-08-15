#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

use serde::{Deserialize, Serialize};

// ===== Pure functions (no DB / async / external deps) =====

/// Normalize a search query: trim, collapse internal whitespace, lowercase.
pub fn normalize_query(q: &str) -> String {
    let trimmed = q.trim();
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_ws = false;
    for ch in trimmed.chars() {
        if ch.is_whitespace() {
            if !prev_ws {
                result.push(' ');
            }
            prev_ws = true;
        } else {
            for c in ch.to_lowercase() {
                result.push(c);
            }
            prev_ws = false;
        }
    }
    result
}

/// Tokenize a query into non-empty whitespace-separated terms (lowercased).
pub fn tokenize(query: &str) -> Vec<String> {
    query
        .split_whitespace()
        .map(|t| t.to_lowercase())
        .filter(|t| !t.is_empty())
        .collect()
}

/// Calculate pagination metadata.
/// Returns `(offset, total_pages, current_page)`.
pub fn calculate_pagination(page: i64, page_size: i64, total: i64) -> (i64, i64, i64) {
    let current_page = page.max(1);
    let size = page_size.max(1);
    let offset = (current_page - 1) * size;
    let total_pages = if total <= 0 {
        0
    } else {
        (total + size - 1) / size
    };
    (offset, total_pages, current_page)
}

/// Calculate a relevance score in `[0.0, 1.0]` based on how many query terms
/// appear (case-insensitive) in the given document fields.
pub fn calculate_relevance(query_terms: &[String], doc_fields: &[String]) -> f64 {
    if query_terms.is_empty() || doc_fields.is_empty() {
        return 0.0;
    }
    let mut matches = 0usize;
    for term in query_terms {
        if term.is_empty() {
            continue;
        }
        let term_lower = term.to_lowercase();
        for field in doc_fields {
            if field.to_lowercase().contains(&term_lower) {
                matches += 1;
            }
        }
    }
    let total = (query_terms.len() * doc_fields.len()) as f64;
    if total == 0.0 {
        0.0
    } else {
        matches as f64 / total
    }
}

/// Detect the search type from the query syntax.
/// Returns one of: `"exact"`, `"prefix"`, `"fuzzy"`, `"phrase"`.
pub fn detect_search_type(query: &str) -> &'static str {
    let q = query.trim();
    if q.len() >= 2 && q.starts_with('"') && q.ends_with('"') {
        return "phrase";
    }
    if q.starts_with('*') && q.ends_with('*') {
        return "fuzzy";
    }
    if q.ends_with('*') {
        return "prefix";
    }
    "exact"
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchRequest {
    pub keyword: String,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub modules: Option<Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub module: String,
    pub path: String,
    pub type_name: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchResponse {
    pub items: Vec<SearchResult>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- normalize_query ---

    #[test]
    fn normalize_query_trims_whitespace() {
        assert_eq!(normalize_query("  hello  "), "hello");
    }

    #[test]
    fn normalize_query_collapses_internal_whitespace() {
        assert_eq!(normalize_query("hello    world"), "hello world");
    }

    #[test]
    fn normalize_query_lowercases() {
        assert_eq!(normalize_query("HeLLo WORLD"), "hello world");
    }

    #[test]
    fn normalize_query_empty_string() {
        assert_eq!(normalize_query(""), "");
    }

    #[test]
    fn normalize_query_only_whitespace() {
        assert_eq!(normalize_query("   \t\n  "), "");
    }

    #[test]
    fn normalize_query_mixed_whitespace() {
        assert_eq!(normalize_query("  a\t b\n c "), "a b c");
    }

    // --- tokenize ---

    #[test]
    fn tokenize_simple() {
        assert_eq!(tokenize("hello world"), vec!["hello", "world"]);
    }

    #[test]
    fn tokenize_multiple_spaces() {
        assert_eq!(tokenize("hello   world"), vec!["hello", "world"]);
    }

    #[test]
    fn tokenize_empty() {
        assert!(tokenize("").is_empty());
    }

    #[test]
    fn tokenize_only_whitespace() {
        assert!(tokenize("   \t\n ").is_empty());
    }

    #[test]
    fn tokenize_lowercases() {
        assert_eq!(tokenize("HELLO World"), vec!["hello", "world"]);
    }

    #[test]
    fn tokenize_single_word() {
        assert_eq!(tokenize("hello"), vec!["hello"]);
    }

    // --- calculate_pagination ---

    #[test]
    fn pagination_first_page() {
        assert_eq!(calculate_pagination(1, 20, 100), (0, 5, 1));
    }

    #[test]
    fn pagination_second_page() {
        assert_eq!(calculate_pagination(2, 20, 100), (20, 5, 2));
    }

    #[test]
    fn pagination_zero_page_clamps_to_one() {
        assert_eq!(calculate_pagination(0, 20, 100), (0, 5, 1));
    }

    #[test]
    fn pagination_negative_page_clamps_to_one() {
        assert_eq!(calculate_pagination(-5, 20, 100), (0, 5, 1));
    }

    #[test]
    fn pagination_zero_total() {
        assert_eq!(calculate_pagination(1, 20, 0), (0, 0, 1));
    }

    #[test]
    fn pagination_exact_division() {
        assert_eq!(calculate_pagination(1, 10, 50), (0, 5, 1));
    }

    #[test]
    fn pagination_inexact_division_rounds_up() {
        assert_eq!(calculate_pagination(1, 10, 55), (0, 6, 1));
    }

    #[test]
    fn pagination_zero_page_size_clamps_to_one() {
        assert_eq!(calculate_pagination(1, 0, 10), (0, 10, 1));
    }

    // --- calculate_relevance ---

    #[test]
    fn relevance_full_match() {
        let terms = vec!["hello".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 1.0);
    }

    #[test]
    fn relevance_partial_match() {
        let terms = vec!["hello".to_string(), "missing".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 0.5);
    }

    #[test]
    fn relevance_no_match() {
        let terms = vec!["xyz".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 0.0);
    }

    #[test]
    fn relevance_empty_terms() {
        let fields = vec!["hello".to_string()];
        assert_eq!(calculate_relevance(&[], &fields), 0.0);
    }

    #[test]
    fn relevance_empty_fields() {
        let terms = vec!["hello".to_string()];
        assert_eq!(calculate_relevance(&terms, &[]), 0.0);
    }

    #[test]
    fn relevance_case_insensitive() {
        let terms = vec!["HELLO".to_string()];
        let fields = vec!["hello world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 1.0);
    }

    #[test]
    fn relevance_multiple_fields() {
        let terms = vec!["hello".to_string()];
        let fields = vec!["hello".to_string(), "world".to_string()];
        assert_eq!(calculate_relevance(&terms, &fields), 0.5);
    }

    // --- detect_search_type ---

    #[test]
    fn search_type_phrase() {
        assert_eq!(detect_search_type("\"hello world\""), "phrase");
    }

    #[test]
    fn search_type_prefix() {
        assert_eq!(detect_search_type("hello*"), "prefix");
    }

    #[test]
    fn search_type_fuzzy() {
        assert_eq!(detect_search_type("*hello*"), "fuzzy");
    }

    #[test]
    fn search_type_exact() {
        assert_eq!(detect_search_type("hello"), "exact");
    }

    #[test]
    fn search_type_empty() {
        assert_eq!(detect_search_type(""), "exact");
    }

    #[test]
    fn search_type_single_quote_not_phrase() {
        assert_eq!(detect_search_type("\""), "exact");
    }

    #[test]
    fn search_type_phrase_with_spaces_around() {
        assert_eq!(detect_search_type("  \"hi\"  "), "phrase");
    }

    // --- DTO serde roundtrip ---

    #[test]
    fn search_request_serde_roundtrip_full() {
        let req = SearchRequest {
            keyword: "hello world".to_string(),
            page: Some(2),
            page_size: Some(50),
            modules: Some(vec!["user".to_string(), "order".to_string()]),
        };
        let json = serde_json::to_string(&req).expect("serialize failed");
        let de: SearchRequest = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(de, req);
    }

    #[test]
    fn search_request_serde_roundtrip_minimal() {
        let req = SearchRequest {
            keyword: "test".to_string(),
            page: None,
            page_size: None,
            modules: None,
        };
        let json = serde_json::to_string(&req).expect("serialize failed");
        let de: SearchRequest = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(de, req);
    }

    #[test]
    fn search_result_serde_roundtrip_with_description() {
        let result = SearchResult {
            id: "u-123".to_string(),
            title: "Alice".to_string(),
            description: Some("alice@example.com | active".to_string()),
            module: "user".to_string(),
            path: "/system/users/u-123".to_string(),
            type_name: "用户".to_string(),
        };
        let json = serde_json::to_string(&result).expect("serialize failed");
        let de: SearchResult = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(de, result);
    }

    #[test]
    fn search_result_serde_roundtrip_without_description() {
        let result = SearchResult {
            id: "d-456".to_string(),
            title: "report.pdf".to_string(),
            description: None,
            module: "document".to_string(),
            path: "/files/d-456".to_string(),
            type_name: "文档".to_string(),
        };
        let json = serde_json::to_string(&result).expect("serialize failed");
        let de: SearchResult = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(de, result);
    }

    #[test]
    fn search_response_serde_roundtrip() {
        let resp = SearchResponse {
            items: vec![SearchResult {
                id: "1".to_string(),
                title: "T".to_string(),
                description: None,
                module: "m".to_string(),
                path: "/p".to_string(),
                type_name: "t".to_string(),
            }],
            total: 1,
            page: 1,
            page_size: 20,
        };
        let json = serde_json::to_string(&resp).expect("serialize failed");
        let de: SearchResponse = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(de, resp);
    }
}
