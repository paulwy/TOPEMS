use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchRequest {
    pub keyword: String,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub modules: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub module: String,
    pub path: String,
    pub type_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub items: Vec<SearchResult>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
