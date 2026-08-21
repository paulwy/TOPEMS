#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

use serde::{Deserialize, Serialize};

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relevance: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchResponse {
    pub items: Vec<SearchResult>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub search_type: String,
    pub facets: std::collections::HashMap<String, usize>,
    pub suggestions: Vec<SearchSuggestion>,
}

#[allow(dead_code)]
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

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Visibility {
    Public,
    Private,
    OrgOnly,
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct SearchFilter {
    pub module_in: Option<Vec<String>>,
    pub tag_all: Option<Vec<String>>,
    pub owner_ids: Option<Vec<String>>,
    pub created_after_ms: Option<i64>,
    pub created_before_ms: Option<i64>,
    pub visibility_in: Option<Vec<Visibility>>,
}

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

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct BatchIndexRequest {
    pub upserts: Vec<IndexDocument>,
    pub deletes: Vec<String>,
    pub refresh: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

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
            relevance: Some(0.85),
            snippet: Some("...active...".to_string()),
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
            relevance: None,
            snippet: None,
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
                relevance: None,
                snippet: None,
            }],
            total: 1,
            page: 1,
            page_size: 20,
            search_type: "exact".to_string(),
            facets: std::collections::HashMap::new(),
            suggestions: Vec::new(),
        };
        let json = serde_json::to_string(&resp).expect("serialize failed");
        let de: SearchResponse = serde_json::from_str(&json).expect("deserialize failed");
        assert_eq!(de, resp);
    }

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
