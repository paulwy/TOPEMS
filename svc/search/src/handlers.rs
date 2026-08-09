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
