use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use super::models::SearchResult;

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
    code: String,
    name: String,
    contact_person: Option<String>,
    phone: Option<String>,
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
    path: String,
    mime_type: Option<String>,
}

pub async fn search_users(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
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

pub async fn search_customers(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
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

pub async fn search_orders(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
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

pub async fn search_documents(pool: &PgPool, keyword: &str, limit: i64) -> Vec<SearchResult> {
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

pub async fn search_all(
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
