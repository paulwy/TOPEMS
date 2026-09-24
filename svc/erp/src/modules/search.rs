use axum::{
    extract::{Extension, Query, State},
    routing::*,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

use super::ApiState;

#[derive(Debug, Clone, Deserialize, utoipa::IntoParams)]
pub struct SearchParams {
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    #[serde(
        default,
        alias = "pagesize",
        alias = "pageSize",
        alias = "size",
        alias = "limit"
    )]
    pub page_size: Option<i64>,
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    #[serde(default, alias = "sort", alias = "sortBy", alias = "sortby")]
    pub sort_by: Option<String>,
    #[serde(
        default,
        alias = "sortorder",
        alias = "sortOrder",
        alias = "sort_dir",
        alias = "dir"
    )]
    pub sort_dir: Option<String>,
    pub query: String,
}

impl SearchParams {
    fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }
    fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }
    fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
    fn limit(&self) -> i64 {
        self.page_size_or_default()
    }
    fn normalized_sort_dir(&self) -> String {
        match self.sort_dir.as_deref() {
            Some("asc") => "asc".into(),
            _ => "desc".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub module: String,
    pub path: String,
    pub type_name: String,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/search/global-search",
    tag = "Search",
    operation_id = "global_search",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
async fn global_search(
    State(_state): State<ApiState>,
    Query(params): Query<SearchParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<SearchResult>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let limit = params.page_size_or_default();
    let query = params.query.to_lowercase();
    let search_pattern = format!("%{}%", query);

    let mut results: Vec<SearchResult> = Vec::new();

    let material_results: Vec<SearchResult> = sqlx::query(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name as title, material_code as description, 'material' as module,
               '/erp/materials' as path, '物料' as type_name
        FROM core_erp_materials
        WHERE LOWER(name) LIKE $1 OR LOWER(material_code) LIKE $1 OR LOWER(specification) LIKE $1
        LIMIT $2
        "#
    ))
    .bind(search_pattern.clone())
    .bind(limit / 3)
    .map(|row: sqlx::postgres::PgRow| SearchResult {
        id: row.get(0),
        title: row.get(1),
        description: row.get(2),
        module: row.get(3),
        path: row.get(4),
        type_name: row.get(5),
    })
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default();
    results.extend(material_results);

    let customer_results: Vec<SearchResult> = sqlx::query(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name as title, contact_person as description, 'customer' as module,
               '/crm/customers' as path, '客户' as type_name
        FROM crm.core_crm_customers
        WHERE LOWER(name) LIKE $1 OR LOWER(contact_person) LIKE $1 OR LOWER(phone) LIKE $1
        LIMIT $2
        "#,
        "crm"
    ))
    .bind(search_pattern.clone())
    .bind(limit / 3)
    .map(|row: sqlx::postgres::PgRow| SearchResult {
        id: row.get(0),
        title: row.get(1),
        description: row.get(2),
        module: row.get(3),
        path: row.get(4),
        type_name: row.get(5),
    })
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default();
    results.extend(customer_results);

    let supplier_results: Vec<SearchResult> = sqlx::query(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name as title, contact_person as description, 'supplier' as module,
               '/srm/suppliers' as path, '供应商' as type_name
        FROM core_erp_suppliers
        WHERE LOWER(name) LIKE $1 OR LOWER(contact_person) LIKE $1 OR LOWER(phone) LIKE $1
        LIMIT $2
        "#
    ))
    .bind(search_pattern)
    .bind(limit / 3)
    .map(|row: sqlx::postgres::PgRow| SearchResult {
        id: row.get(0),
        title: row.get(1),
        description: row.get(2),
        module: row.get(3),
        path: row.get(4),
        type_name: row.get(5),
    })
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default();
    results.extend(supplier_results);

    results.sort_by(|a, b| a.title.cmp(&b.title));
    results.truncate(limit as usize);

    Json(ApiResponse::success(results, "搜索成功"))
}

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/search/global", get(global_search))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_params_deserialize_full() {
        let json = r#"{"query":"laptop","limit":10}"#;
        let params: SearchParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.query, "laptop");
        assert_eq!(params.page_size, Some(10));
    }

    #[test]
    fn test_search_params_deserialize_optional_limit() {
        let json = r#"{"query":"test"}"#;
        let params: SearchParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.query, "test");
        assert_eq!(params.page_size, None);
    }

    #[test]
    fn test_search_result_serialize_roundtrip() {
        let result = SearchResult {
            id: "r1".to_string(),
            title: "Test Item".to_string(),
            description: Some("A test description".to_string()),
            module: "material".to_string(),
            path: "/erp/materials".to_string(),
            type_name: "物料".to_string(),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"id\":\"r1\""));
        assert!(json.contains("\"title\":\"Test Item\""));
        assert!(json.contains("\"module\":\"material\""));
    }

    #[test]
    fn test_search_result_none_description() {
        let result = SearchResult {
            id: "r2".to_string(),
            title: "No Desc".to_string(),
            description: None,
            module: "customer".to_string(),
            path: "/crm/customers".to_string(),
            type_name: "客户".to_string(),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"description\":null"));
    }
}
