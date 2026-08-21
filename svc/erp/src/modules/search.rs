use axum::{
    extract::{Query, State},
    routing::*,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::repository::ListQueryParams;

use super::ApiState;

#[derive(Debug, Clone, Deserialize, utoipa::IntoParams)]
pub struct SearchParams {
    #[serde(flatten)]
    pub base: ListQueryParams,
    pub query: String,
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
    State(state): State<ApiState>,
    Query(params): Query<SearchParams>,
) -> Json<ApiResponse<Vec<SearchResult>>> {
    let limit = params.base.page_size_or_default();
    let query = params.query.to_lowercase();
    let search_pattern = format!("%{}%", query);

    let mut results: Vec<SearchResult> = Vec::new();

    let material_results: Vec<SearchResult> = sqlx::query(
        r#"
        SELECT id, name as title, material_code as description, 'material' as module, 
               '/erp/materials' as path, '物料' as type_name
        FROM core_erp_materials
        WHERE LOWER(name) LIKE $1 OR LOWER(material_code) LIKE $1 OR LOWER(specification) LIKE $1
        LIMIT $2
        "#,
    )
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
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    results.extend(material_results);

    let customer_results: Vec<SearchResult> = sqlx::query(
        r#"
        SELECT id, name as title, contact_person as description, 'customer' as module, 
               '/crm/customers' as path, '客户' as type_name
        FROM core_crm_customers
        WHERE LOWER(name) LIKE $1 OR LOWER(contact_person) LIKE $1 OR LOWER(phone) LIKE $1
        LIMIT $2
        "#,
    )
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
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();
    results.extend(customer_results);

    let supplier_results: Vec<SearchResult> = sqlx::query(
        r#"
        SELECT id, name as title, contact_person as description, 'supplier' as module, 
               '/srm/suppliers' as path, '供应商' as type_name
        FROM core_erp_suppliers
        WHERE LOWER(name) LIKE $1 OR LOWER(contact_person) LIKE $1 OR LOWER(phone) LIKE $1
        LIMIT $2
        "#,
    )
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
    .fetch_all(&state.db)
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
        assert_eq!(params.base.page_size, Some(10));
    }

    #[test]
    fn test_search_params_deserialize_optional_limit() {
        let json = r#"{"query":"test"}"#;
        let params: SearchParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.query, "test");
        assert_eq!(params.base.page_size, None);
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
