use axum::extract::{Extension, Query, State};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::auth::Claims;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::{Db, ScopedTxn};
use uuid::Uuid;

use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;

use crate::models::{
    SearchRequest, SearchResponse, SearchResult, SearchSuggestion, SuggestionKind,
};

use crate::scoring::{
    calculate_pagination, calculate_relevance, compare_search_results, count_facets,
    deduplicate_results, detect_search_type, extract_snippet, highlight_term, matches_filter,
    normalize_query, tokenize,
};

use std::collections::HashSet;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

#[derive(Debug, Clone, FromRow)]
struct UserSearchRow {
    id: Uuid,
    username: String,
    email: String,
    full_name: Option<String>,
    status: String,
}

#[derive(Debug, Clone, FromRow)]
struct DocumentSearchRow {
    id: Uuid,
    name: String,
    #[allow(dead_code)]
    path: String,
    mime_type: Option<String>,
}

/// 实体投影行（public.search_entity_projections，B1/F-37 终态本地读模型）
#[derive(Debug, Clone, FromRow)]
struct ProjectionRow {
    entity_id: Uuid,
    name: Option<String>,
    contact_person: Option<String>,
    contact_phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    status: Option<String>,
    remark: Option<String>,
}

/// 按实体类型检索本地投影（tenant 隔离 + ILIKE）。失败降级为空结果。
async fn query_projection(
    conn: &mut ScopedTxn<'_>,
    entity_type: &str,
    keyword: &str,
    limit: i64,
) -> Vec<ProjectionRow> {
    let kw = format!("%{}%", keyword);
    match sqlx::query_as::<_, ProjectionRow>(
        r#"SELECT entity_id, name, contact_person, contact_phone, email, address, status, remark
           FROM public.search_entity_projections
           WHERE entity_type = $1
             AND (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID)
             AND (
                name ILIKE $2 OR contact_person ILIKE $2 OR contact_phone ILIKE $2
                OR email ILIKE $2 OR address ILIKE $2 OR status ILIKE $2 OR remark ILIKE $2
             )
           ORDER BY source_updated_at DESC NULLS LAST
           LIMIT $3"#,
    )
    .bind(entity_type)
    .bind(kw)
    .bind(limit)
    .fetch_all(&mut *conn)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("搜索投影({})失败: {}", entity_type, e);
            Vec::new()
        }
    }
}

async fn search_users(conn: &mut ScopedTxn<'_>, keyword: &str, limit: i64) -> Vec<SearchResult> {
    let keyword_like = format!("%{}%", keyword);

    // 表归属（DB 分片侦察）：unqualified `iam.users` 命中 iam.users（认证身份权威表，
    // 2026-10-28 双身份表收敛后 core_users 已废弃）。全局身份目录按设计全局检索，
    // 不做 tenant 过滤——避免"假过滤"。
    let rows: Vec<UserSearchRow> = match sqlx::query_as(only_own_schema_query!(
        "public",
        r#"SELECT id, username, email, full_name, status
           FROM iam.users
           WHERE username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2"#,
        "iam"
    ))
    .bind(keyword_like)
    .bind(limit)
    .fetch_all(&mut *conn)
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

async fn search_customers(
    conn: &mut ScopedTxn<'_>,
    keyword: &str,
    limit: i64,
) -> Vec<SearchResult> {
    // B1/F-37 终态：只读本地实体投影（erp 事件维护），不再 query-time 调 erp HTTP API
    let rows = query_projection(&mut *conn, "customer", keyword, limit).await;

    rows.into_iter()
        .map(|r| {
            let description = match (
                r.contact_person.as_ref(),
                r.contact_phone.as_ref(),
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
                id: r.entity_id.to_string(),
                title: r.name.unwrap_or_default(),
                description,
                module: "customer".to_string(),
                path: format!("/crm/customers/{}", r.entity_id),
                type_name: "客户".to_string(),
                relevance: None,
                snippet: None,
            }
        })
        .collect()
}

async fn search_orders(conn: &mut ScopedTxn<'_>, keyword: &str, limit: i64) -> Vec<SearchResult> {
    // B1/F-37 终态：销售/采购订单均读本地投影
    let mut results: Vec<SearchResult> = Vec::new();

    let sales_hits = query_projection(&mut *conn, "sales_order", keyword, limit / 2).await;
    results.extend(sales_hits.into_iter().map(|r| SearchResult {
        id: r.entity_id.to_string(),
        title: r.name.unwrap_or_default(),
        description: r.remark.or(r.status),
        module: "order".to_string(),
        path: format!("/sales/orders/{}", r.entity_id),
        type_name: "订单".to_string(),
        relevance: None,
        snippet: None,
    }));

    let purchase_hits = query_projection(&mut *conn, "purchase_order", keyword, limit / 2).await;
    results.extend(purchase_hits.into_iter().map(|r| SearchResult {
        id: r.entity_id.to_string(),
        title: r.name.unwrap_or_default(),
        description: r.remark.or(r.status),
        module: "order".to_string(),
        path: format!("/purchase/orders/{}", r.entity_id),
        type_name: "订单".to_string(),
        relevance: None,
        snippet: None,
    }));

    results
}

pub(crate) async fn search_documents(
    conn: &mut ScopedTxn<'_>,
    keyword: &str,
    limit: i64,
) -> Vec<SearchResult> {
    let keyword_like = format!("%{}%", keyword);

    // 表归属：unqualified `core_files` 命中 public.core_files（tenant_id uuid NOT NULL，
    // 业务租户隔离表）。显式按 app.tenant_id 过滤，与 query_projection 同款 COALESCE 语义；
    // 未设置租户上下文时回退零 UUID（仅命中全局/无归属文件）。
    let rows: Vec<DocumentSearchRow> = match sqlx::query_as(
        r#"SELECT id, name, path, mime_type
           FROM core_files
           WHERE (name ILIKE $1 OR path ILIKE $1)
             AND (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000' OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID)
           ORDER BY created_at DESC
           LIMIT $2"#,
    )
    .bind(keyword_like)
    .bind(limit)
    .fetch_all(&mut *conn)
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

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
pub(crate) async fn search_all(
    conn: &mut ScopedTxn<'_>,
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
        results.extend(search_users(&mut *conn, keyword, per_module_limit).await);
    }

    if should_search("customer") {
        results.extend(search_customers(&mut *conn, keyword, per_module_limit).await);
    }

    if should_search("order") {
        results.extend(search_orders(&mut *conn, keyword, per_module_limit).await);
    }

    if should_search("document") {
        results.extend(search_documents(&mut *conn, keyword, per_module_limit).await);
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
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn search_handler(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(req): Query<SearchRequest>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<SearchResponse> {
    // 服务端处理耗时口径：本 handler 内的处理时间（不含后台双写与网络传输）。
    let started_at = std::time::Instant::now();
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    // 复用请求级 RLS 事务，只叠加事务级 search_path（不新开事务，保留租户上下文）。
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => return ApiResponse::server_error(&format!("scope begin failed: {e}")),
    };

    let keyword = normalize_query(&req.keyword);
    if keyword.is_empty() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "搜索关键词不能为空".to_string(),
        ));
    }

    let search_type = detect_search_type(&req.keyword).to_string();

    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);

    let query_terms = tokenize(&keyword);

    let mut results = search_all(&mut scope, &keyword, &req.modules, page_size).await;

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

    // 双写（fire-and-forget，不阻塞响应）：
    //   public.search_recent — 用户级最近搜索，(user_id, keyword) 去重，支撑 /search/recent 读回
    //   public.search_logs   — 聚合搜索日志，按 query 聚合频次，支撑 /suggestions 词频排序
    // 两表已在迁移 20261115141800/142400 补齐所需列。
    let recent_user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
    let recent_tenant_id = topems_shared_auth::get_tenant_id_from_claims(&claims);
    let recent_keyword = keyword.clone();
    let recent_db = db.clone();
    let total_count = total;
    // 服务端处理耗时（毫秒整数），在调度后台写之前定格；未采集时写 NULL，不写 0。
    let elapsed_ms: i64 = started_at.elapsed().as_millis() as i64;
    tokio::spawn(async move {
        // 后台任务无请求事务：按显式租户短事务写入。
        let Ok(mut scope) = recent_db.scope_for_tenant(recent_tenant_id).await else {
            return;
        };
        // 1) 用户级：ON CONFLICT DO UPDATE 刷新 searched_at
        let _ = sqlx::query(
            "INSERT INTO public.search_recent (user_id, keyword, searched_at) VALUES ($1, $2, now()) \
             ON CONFLICT (user_id, keyword) DO UPDATE SET searched_at = now()",
        )
        .bind(recent_user_id)
        .bind(recent_keyword.as_str())
        .execute(&mut scope)
        .await;

        // 2) 聚合级：append-only，无去重（suggestions 侧 GROUP BY 自行聚合）
        // duration_ms 记服务端处理耗时（毫秒整数）；created_at 用列默认值 CURRENT_TIMESTAMP
        let _ = sqlx::query(
            "INSERT INTO public.search_logs (tenant_id, user_id, query, result_count, duration_ms) \
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(recent_tenant_id)
        .bind(recent_user_id)
        .bind(recent_keyword.as_str())
        .bind(total_count as i32)
        .bind(elapsed_ms)
        .execute(&mut scope)
        .await;

        let _ = scope.commit().await;
    });

    api_success(SearchResponse {
        items: results,
        total,
        page: current_page,
        page_size,
        search_type,
        facets,
        suggestions,
    })
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
/// 搜索建议词聚合（供 HTTP handler 与 MCP 工具共用）：有前缀匹配历史搜索词 ILIKE，
/// 无前缀返回最近 7 天热门搜索词；按频次排序。查询失败返回空列表（best-effort）。
pub(crate) async fn suggest_terms(
    scope: &mut ScopedTxn<'_>,
    q: Option<&str>,
    limit: i64,
) -> Vec<String> {
    if let Some(q) = q.map(str::trim).filter(|s| !s.is_empty()) {
        // 有前缀：匹配历史搜索词中以该前缀开头的，按频次排序
        match sqlx::query_scalar::<_, String>(
            "SELECT query FROM public.search_logs
             WHERE query ILIKE $1
             GROUP BY query
             ORDER BY COUNT(*) DESC, MAX(created_at) DESC
             LIMIT $2",
        )
        .bind(format!("{}%", q))
        .bind(limit)
        .fetch_all(&mut *scope)
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
        .fetch_all(&mut *scope)
        .await
        {
            Ok(rows) => rows,
            Err(_) => Vec::new(),
        }
    }
}

pub async fn suggestions_handler(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<SuggestionsQuery>,
) -> ApiResponse<SuggestionsResponse> {
    let limit = params.limit.unwrap_or(10).clamp(1, 50);

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => return ApiResponse::server_error(&format!("scope begin failed: {e}")),
    };
    let suggestions = suggest_terms(&mut scope, params.q.as_deref(), limit).await;

    api_success(SuggestionsResponse { suggestions })
}

// ==================== /search/recent（最近搜索，用户级） ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["search:read"])),
    path = "/api/search/recent",
    tag = "fulltext",
    responses(
        (status = 200, description = "当前用户最近搜索关键词列表"),
    ),
)]
pub async fn list_recent(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<String>> {
    let user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        // 最近搜索为 best-effort 读：无请求事务时返回空列表。
        return api_success(Vec::new());
    };
    let Ok(mut scope) = db.scope_with(txn).await else {
        return api_success(Vec::new());
    };
    let rows = sqlx::query_as::<_, (String,)>(
        "SELECT keyword FROM public.search_recent \
         WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 10",
    )
    .bind(user_id)
    .fetch_all(&mut scope)
    .await
    .unwrap_or_default();
    api_success(rows.into_iter().map(|(k,)| k).collect())
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["search:read"])),
    path = "/api/search/recent",
    tag = "fulltext",
    responses(
        (status = 200, description = "清空当前用户最近搜索"),
    ),
)]
pub async fn clear_recent(
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let user_id: Uuid = claims.sub.parse().unwrap_or_else(|_| Uuid::nil());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return api_success("cleared".to_string());
    };
    let Ok(mut scope) = db.scope_with(txn).await else {
        return api_success("cleared".to_string());
    };
    let _ = sqlx::query("DELETE FROM public.search_recent WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut scope)
        .await;
    let _ = scope.commit().await;
    api_success("cleared".to_string())
}
