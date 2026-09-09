use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, api_success};

use crate::models::{
    SearchRequest, SearchResponse, SearchResult, SearchSuggestion, SuggestionKind,
};

use crate::scoring::{
    calculate_pagination, calculate_relevance, compare_search_results, count_facets,
    deduplicate_results, detect_search_type, extract_snippet, highlight_term, matches_filter,
    normalize_query, tokenize,
};

use std::collections::HashSet;

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
            relevance: None,
            snippet: None,
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
                relevance: None,
                snippet: None,
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
        relevance: None,
        snippet: None,
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
        relevance: None,
        snippet: None,
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
            relevance: None,
            snippet: None,
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
            .is_none_or(|mods| mods.iter().any(|m| matches_filter(module, m)))
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
    security(("BearerAuth" = ["search:query:read"])),
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
    let keyword = normalize_query(&req.keyword);
    if keyword.is_empty() {
        return Json(api_error(400, "搜索关键词不能为空"));
    }

    let search_type = detect_search_type(&req.keyword).to_string();

    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page.unwrap_or(20).min(100);

    let query_terms = tokenize(&keyword);

    let mut results = search_all(&pool, &keyword, &req.modules, page_size).await;

    for r in &mut results {
        let doc_fields = vec![
            r.title.clone(),
            r.description.clone().unwrap_or_default(),
            r.module.clone(),
            r.type_name.clone(),
        ];
        r.relevance = Some(calculate_relevance(&query_terms, &doc_fields));
    }

    let now_ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    results.sort_by(|a, b| {
        compare_search_results(
            a.relevance.unwrap_or(0.0),
            now_ts,
            b.relevance.unwrap_or(0.0),
            now_ts,
        )
    });

    let ids: Vec<String> = results.iter().map(|r| r.id.clone()).collect();
    if deduplicate_results(&ids).len() != ids.len() {
        let seen: HashSet<String> = ids.into_iter().collect();
        results.retain(|r| seen.contains(&r.id));
    }

    let highlight_term_kw = query_terms.first().map(|s| s.as_str()).unwrap_or(&keyword);
    for r in &mut results {
        r.title = highlight_term(&r.title, highlight_term_kw);
    }

    for r in &mut results {
        if let Some(desc) = &r.description {
            r.snippet = Some(extract_snippet(desc, highlight_term_kw, 50));
        }
    }

    let facet_pairs: Vec<(&str, &str)> = results
        .iter()
        .map(|r| (r.module.as_str(), r.type_name.as_str()))
        .collect();
    let facets = count_facets(&facet_pairs);

    let suggestions: Vec<SearchSuggestion> = results
        .iter()
        .take(5)
        .filter_map(|r| {
            r.title.split_whitespace().next().map(|w| SearchSuggestion {
                text: w.to_string(),
                kind: SuggestionKind::Entity,
                score: r.relevance.unwrap_or(0.0),
                highlight: None,
            })
        })
        .collect();

    let total = results.len() as i64;

    let (_offset, _total_pages, current_page) = calculate_pagination(page, page_size, total);

    // 记录搜索日志（fire-and-forget，不阻塞响应）
    let log_query = keyword.clone();
    let log_pool = pool.clone();
    let log_result_count = total;
    tokio::spawn(async move {
        let _ = sqlx::query(
            "INSERT INTO public.search_logs (query, result_count) VALUES ($1, $2)",
        )
        .bind(log_query)
        .bind(log_result_count)
        .execute(&log_pool)
        .await;
    });

    Json(api_success(SearchResponse {
        items: results,
        total,
        page: current_page,
        page_size,
        search_type,
        facets,
        suggestions,
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["search:read"])),
    path = "/health",
    tag = "health",
    responses(
        (status = 200, description = "服务健康"),
    ),
)]
pub async fn health_handler() -> &'static str {
    "OK"
}

// ==================== /suggestions ====================

#[derive(Debug, Deserialize)]
pub struct SuggestionsQuery {
    pub q: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct SuggestionsResponse {
    pub suggestions: Vec<String>,
}

/// GET /suggestions — 从 search_logs 聚合热门搜索词，支持按前缀过滤
#[utoipa::path(
    get,
    security(("BearerAuth" = ["search:read"])),
    path = "/api/search/suggestions",
    tag = "search",
    responses(
        (status = 200, description = "搜索建议"),
    ),
)]
pub async fn suggestions_handler(
    State(pool): State<PgPool>,
    Query(params): Query<SuggestionsQuery>,
) -> Json<ApiResponse<SuggestionsResponse>> {
    let limit = params.limit.unwrap_or(10).clamp(1, 50);

    let suggestions: Vec<String> = if let Some(q) = params.q.filter(|s| !s.trim().is_empty()) {
        // 有前缀：匹配历史搜索词中以该前缀开头的，按频次排序
        match sqlx::query_scalar::<_, String>(
            "SELECT query FROM public.search_logs
             WHERE query ILIKE $1
             GROUP BY query
             ORDER BY COUNT(*) DESC, MAX(created_at) DESC
             LIMIT $2",
        )
        .bind(format!("{}%", q.trim()))
        .bind(limit)
        .fetch_all(&pool)
        .await
        {
            Ok(rows) => rows,
            Err(_) => Vec::new(),
        }
    } else {
        // 无前缀：返回最近 7 天热门搜索词
        match sqlx::query_scalar::<_, String>(
            "SELECT query FROM public.search_logs
             WHERE created_at >= NOW() - INTERVAL '7 days'
             GROUP BY query
             ORDER BY COUNT(*) DESC, MAX(created_at) DESC
             LIMIT $1",
        )
        .bind(limit)
        .fetch_all(&pool)
        .await
        {
            Ok(rows) => rows,
            Err(_) => Vec::new(),
        }
    };

    Json(api_success(SuggestionsResponse { suggestions }))
}

#[allow(dead_code)]
pub fn search_routes() -> Router<PgPool> {
    Router::new().route("/", get(search_handler))
}
