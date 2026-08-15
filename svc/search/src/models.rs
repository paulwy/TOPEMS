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

// ---- 新增 DTO：索引文档（写入倒排索引用）----

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IndexDocument {
    pub doc_id: String,
    pub module: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    pub owner_id: Option<String>,
    pub visibility: Visibility,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Visibility {
    Public,
    Private,
    OrgOnly,
}

// ---- 新增 DTO：搜索过滤条件（结构化条件）----

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchFilter {
    pub module_in: Option<Vec<String>>,
    pub tag_all: Option<Vec<String>>,
    pub owner_ids: Option<Vec<String>>,
    pub created_after_ms: Option<i64>,
    pub created_before_ms: Option<i64>,
    pub visibility_in: Option<Vec<Visibility>>,
}

impl Default for SearchFilter {
    fn default() -> Self {
        Self {
            module_in: None,
            tag_all: None,
            owner_ids: None,
            created_after_ms: None,
            created_before_ms: None,
            visibility_in: None,
        }
    }
}

// ---- 新增 DTO：搜索建议（自动补全候选）----

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchSuggestion {
    pub text: String,
    pub kind: SuggestionKind,
    pub score: f64,
    pub highlight: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SuggestionKind {
    Term,
    Entity,
    RecentQuery,
    Module,
}

// ---- 新增 DTO：批量索引请求 ----

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BatchIndexRequest {
    pub upserts: Vec<IndexDocument>,
    pub deletes: Vec<String>,
    pub refresh: bool,
}

impl Default for BatchIndexRequest {
    fn default() -> Self {
        Self {
            upserts: Vec::new(),
            deletes: Vec::new(),
            refresh: false,
        }
    }
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

    // ---- IndexDocument / Visibility roundtrip ----

    #[test]
    fn index_document_serde_roundtrip_public_with_owner() {
        let doc = IndexDocument {
            doc_id: "d-001".to_string(),
            module: "doc".to_string(),
            title: "Q4 OKR".to_string(),
            content: "Focus on delivery".to_string(),
            tags: vec!["okr".to_string(), "q4".to_string()],
            created_at_ms: 1_700_000_000_000,
            updated_at_ms: 1_700_000_001_000,
            owner_id: Some("u-007".to_string()),
            visibility: Visibility::Public,
        };
        let json = serde_json::to_string(&doc).unwrap();
        let de: IndexDocument = serde_json::from_str(&json).unwrap();
        assert_eq!(de, doc);
    }

    #[test]
    fn index_document_serde_roundtrip_orgonly_no_owner() {
        let doc = IndexDocument {
            doc_id: "d-002".to_string(),
            module: "flow".to_string(),
            title: "Onboarding SOP".to_string(),
            content: "Step 1..Step N".to_string(),
            tags: vec![],
            created_at_ms: 1_701_000_000_000,
            updated_at_ms: 1_701_000_000_000,
            owner_id: None,
            visibility: Visibility::OrgOnly,
        };
        let json = serde_json::to_string(&doc).unwrap();
        let de: IndexDocument = serde_json::from_str(&json).unwrap();
        assert_eq!(de, doc);
    }

    #[test]
    fn visibility_all_variants_serde_roundtrip() {
        for v in [Visibility::Public, Visibility::Private, Visibility::OrgOnly] {
            let json = serde_json::to_string(&v).unwrap();
            let de: Visibility = serde_json::from_str(&json).unwrap();
            assert_eq!(de, v);
        }
    }

    // ---- SearchFilter roundtrip + default ----

    #[test]
    fn search_filter_default_all_none() {
        let f = SearchFilter::default();
        assert!(f.module_in.is_none());
        assert!(f.tag_all.is_none());
        assert!(f.owner_ids.is_none());
        assert!(f.created_after_ms.is_none());
        assert!(f.created_before_ms.is_none());
        assert!(f.visibility_in.is_none());
    }

    #[test]
    fn search_filter_serde_roundtrip_full() {
        let f = SearchFilter {
            module_in: Some(vec!["user".into(), "doc".into()]),
            tag_all: Some(vec!["urgent".into()]),
            owner_ids: Some(vec!["u-1".into()]),
            created_after_ms: Some(1_700_000_000_000),
            created_before_ms: Some(1_800_000_000_000),
            visibility_in: Some(vec![Visibility::Public, Visibility::OrgOnly]),
        };
        let json = serde_json::to_string(&f).unwrap();
        let de: SearchFilter = serde_json::from_str(&json).unwrap();
        assert_eq!(de, f);
    }

    #[test]
    fn search_filter_serde_roundtrip_default() {
        let f = SearchFilter::default();
        let json = serde_json::to_string(&f).unwrap();
        let de: SearchFilter = serde_json::from_str(&json).unwrap();
        assert_eq!(de, f);
    }

    // ---- SearchSuggestion / SuggestionKind roundtrip ----

    #[test]
    fn suggestion_serde_roundtrip_term_with_highlight() {
        let s = SearchSuggestion {
            text: "topems".to_string(),
            kind: SuggestionKind::Term,
            score: 0.92,
            highlight: Some("<b>top</b>ems".to_string()),
        };
        let json = serde_json::to_string(&s).unwrap();
        let de: SearchSuggestion = serde_json::from_str(&json).unwrap();
        assert_eq!(de.text, s.text);
        assert_eq!(de.kind, s.kind);
        assert!((de.score - s.score).abs() < 1e-9);
        assert_eq!(de.highlight, s.highlight);
    }

    #[test]
    fn suggestion_serde_roundtrip_no_highlight_all_kinds() {
        for kind in [
            SuggestionKind::Term,
            SuggestionKind::Entity,
            SuggestionKind::RecentQuery,
            SuggestionKind::Module,
        ] {
            let s = SearchSuggestion {
                text: "q".to_string(),
                kind: kind.clone(),
                score: 0.5,
                highlight: None,
            };
            let json = serde_json::to_string(&s).unwrap();
            let de: SearchSuggestion = serde_json::from_str(&json).unwrap();
            assert_eq!(de, s);
        }
    }

    #[test]
    fn suggestion_kind_all_variants_serde_roundtrip() {
        for k in [
            SuggestionKind::Term,
            SuggestionKind::Entity,
            SuggestionKind::RecentQuery,
            SuggestionKind::Module,
        ] {
            let json = serde_json::to_string(&k).unwrap();
            let de: SuggestionKind = serde_json::from_str(&json).unwrap();
            assert_eq!(de, k);
        }
    }

    // ---- BatchIndexRequest roundtrip + default ----

    #[test]
    fn batch_request_default_empty_no_refresh() {
        let b = BatchIndexRequest::default();
        assert!(b.upserts.is_empty());
        assert!(b.deletes.is_empty());
        assert!(!b.refresh);
    }

    #[test]
    fn batch_request_serde_roundtrip_with_data() {
        let doc1 = IndexDocument {
            doc_id: "d1".to_string(),
            module: "m".to_string(),
            title: "T1".to_string(),
            content: "C1".to_string(),
            tags: vec!["a".into()],
            created_at_ms: 1,
            updated_at_ms: 1,
            owner_id: None,
            visibility: Visibility::Private,
        };
        let b = BatchIndexRequest {
            upserts: vec![doc1.clone()],
            deletes: vec!["x1".to_string(), "x2".to_string()],
            refresh: true,
        };
        let json = serde_json::to_string(&b).unwrap();
        let de: BatchIndexRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.upserts.len(), 1);
        assert_eq!(de.upserts[0], doc1);
        assert_eq!(de.deletes, vec!["x1", "x2"]);
        assert!(de.refresh);
    }

    #[test]
    fn batch_request_serde_roundtrip_default() {
        let b = BatchIndexRequest::default();
        let json = serde_json::to_string(&b).unwrap();
        let de: BatchIndexRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de, b);
    }
}
