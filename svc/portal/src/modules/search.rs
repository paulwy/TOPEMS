//! 全局搜索聚合模块 - Portal BFF 核心能力
//!
//! 并行搜索多个服务的数据，统一格式返回：
//! - ERP 服务 → 物料、客户、供应商等
//! - CRM 服务 → 客户、商机等
//! - BI 服务 → 报表、仪表盘等
//! - 通知服务 → 通知消息
//! - 文档服务 → 文档
//! - HRM 服务 → 员工
//! - Workflow 服务 → 审批实例
//! - MES 服务 → 生产订单
//!
//! 每个数据源独立降级，单一服务故障不影响整体搜索。

use axum::{
    extract::{Extension, Json, State},
    http::HeaderMap,
};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::{shared::AppState, utils::user_context::extract_bearer_token};

/// 统一的服务地址解析 helper：优先环境变量，否则使用权威默认端口，
/// 并输出结构化端口排查日志（target: portal::search）。
fn resolve_service_url(env_var: &str, fallback: &'static str, service_label: &str) -> String {
    match std::env::var(env_var) {
        Ok(v) if !v.is_empty() => {
            tracing::info!(
                target: "portal::search",
                service = service_label,
                resolved_url = %v,
                source = %format!("env:{env_var}"),
                "[Search] 解析服务地址（环境变量）"
            );
            v
        }
        _ => {
            tracing::warn!(
                target: "portal::search",
                service = service_label,
                resolved_url = %fallback,
                env_var = %env_var,
                "[Search] 环境变量未设置，回退到权威默认端口"
            );
            fallback.to_string()
        }
    }
}

const DEFAULT_CRM_URL: &str = "http://localhost:8029";
const DEFAULT_BI_URL: &str = "http://localhost:8060";
const DEFAULT_DOC_URL: &str = "http://localhost:8000";
const DEFAULT_ERP_URL: &str = "http://localhost:8010";

#[derive(Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub highlight_title: String,
    pub highlight_summary: String,
    pub service: String,
    pub service_name: String,
    pub result_type: String,
    pub url: String,
}

#[derive(Serialize, Deserialize)]
pub struct SearchResponse {
    pub total: usize,
    pub by_service: std::collections::HashMap<String, usize>,
    pub results: Vec<SearchResult>,
    pub duration_ms: u64,
}

#[derive(Serialize, Deserialize)]
pub struct SearchSuggestionsResponse {
    pub suggestions: Vec<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:search:read"])),
    path = "/search",
    tag = "Search",
    params(
        ("q" = Option<String>, Query, description = "Search query"),
    ),
    responses(
        (status = 200, description = "Search results", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn global_search(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<SearchResponse>> {
    let start = std::time::Instant::now();
    let query = params.get("q").cloned().unwrap_or_default();

    if query.trim().is_empty() {
        return Json(ApiResponse::success(
            SearchResponse {
                total: 0,
                by_service: std::collections::HashMap::new(),
                results: vec![],
                duration_ms: 0,
            },
            "搜索成功",
        ));
    }

    let token = extract_bearer_token(&headers);

    let (
        erp_results,
        crm_results,
        bi_results,
        notif_results,
        doc_results,
        hrm_results,
        workflow_results,
        mes_results,
    ) = tokio::join!(
        search_erp(&state, &query, token.as_deref()),
        search_crm(&state, &query, token.as_deref()),
        search_bi(&state, &query, token.as_deref()),
        search_notifications(&state, &query, token.as_deref()),
        search_documents(&state, &query, token.as_deref()),
        search_hrm_employees(&state, &query, token.as_deref()),
        search_workflow_instances(&state, &query, token.as_deref()),
        search_mes_production_orders(&state, &query, token.as_deref()),
    );

    let mut all_results = Vec::new();
    let mut by_service = std::collections::HashMap::new();

    let mut add_results = |svc: &str, svc_name: &str, results: Vec<SearchResult>| {
        by_service.insert(svc.to_string(), results.len());
        all_results.extend(results);
        let _ = svc_name;
    };

    add_results("erp", "ERP系统", erp_results);
    add_results("crm", "客户管理", crm_results);
    add_results("bi", "商业智能", bi_results);
    add_results("notification", "通知中心", notif_results);
    add_results("doc", "文档中心", doc_results);
    add_results("hrm", "人力资源", hrm_results);
    add_results("workflow", "审批中心", workflow_results);
    add_results("mes", "生产制造", mes_results);

    let total = all_results.len();
    let duration_ms = start.elapsed().as_millis() as u64;

    let _ = claims;
    Json(ApiResponse::success(
        SearchResponse {
            total,
            by_service,
            results: all_results,
            duration_ms,
        },
        "搜索成功",
    ))
}

pub async fn search_suggestions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<SearchSuggestionsResponse>> {
    let query = params.get("q").cloned().unwrap_or_default();

    if query.trim().is_empty() {
        return Json(ApiResponse::success(
            SearchSuggestionsResponse {
                suggestions: vec![],
            },
            "搜索建议获取成功",
        ));
    }

    let token = extract_bearer_token(&headers);

    let (
        erp_results,
        crm_results,
        bi_results,
        notif_results,
        doc_results,
        hrm_results,
        workflow_results,
        mes_results,
    ) = tokio::join!(
        search_erp(&state, &query, token.as_deref()),
        search_crm(&state, &query, token.as_deref()),
        search_bi(&state, &query, token.as_deref()),
        search_notifications(&state, &query, token.as_deref()),
        search_documents(&state, &query, token.as_deref()),
        search_hrm_employees(&state, &query, token.as_deref()),
        search_workflow_instances(&state, &query, token.as_deref()),
        search_mes_production_orders(&state, &query, token.as_deref()),
    );

    let mut all_titles = Vec::new();
    all_titles.extend(erp_results.into_iter().map(|r| r.title));
    all_titles.extend(crm_results.into_iter().map(|r| r.title));
    all_titles.extend(bi_results.into_iter().map(|r| r.title));
    all_titles.extend(notif_results.into_iter().map(|r| r.title));
    all_titles.extend(doc_results.into_iter().map(|r| r.title));
    all_titles.extend(hrm_results.into_iter().map(|r| r.title));
    all_titles.extend(workflow_results.into_iter().map(|r| r.title));
    all_titles.extend(mes_results.into_iter().map(|r| r.title));

    all_titles.truncate(10);

    let _ = claims;
    Json(ApiResponse::success(
        SearchSuggestionsResponse {
            suggestions: all_titles,
        },
        "搜索建议获取成功",
    ))
}

async fn search_erp(state: &AppState, query: &str, token: Option<&str>) -> Vec<SearchResult> {
    let url = format!("{}/api/erp/search", erp_base_url());
    let mut req = state.http_client.get(&url).query(&[("q", query)]);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    match req.send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => parse_search_results(&json, "erp", "ERP系统", query),
            Err(e) => {
                tracing::warn!("Failed to parse ERP search response: {}", e);
                vec![]
            }
        },
        Err(e) => {
            tracing::warn!("ERP search failed: {}", e);
            vec![]
        }
    }
}

async fn search_crm(state: &AppState, query: &str, token: Option<&str>) -> Vec<SearchResult> {
    let base = resolve_service_url("CRM_SERVICE_URL", DEFAULT_CRM_URL, "CRM");
    let url = format!("{}/api/crm/search", base);
    let mut req = state.http_client.get(&url).query(&[("q", query)]);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    match req.send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => parse_search_results(&json, "crm", "客户管理", query),
            Err(e) => {
                tracing::warn!("Failed to parse CRM search response: {}", e);
                vec![]
            }
        },
        Err(e) => {
            tracing::warn!("CRM search failed: {}", e);
            vec![]
        }
    }
}

async fn search_bi(state: &AppState, query: &str, token: Option<&str>) -> Vec<SearchResult> {
    let base = resolve_service_url("BI_SERVICE_URL", DEFAULT_BI_URL, "BI");
    let url = format!("{}/api/bi/search", base);
    let mut req = state.http_client.get(&url).query(&[("q", query)]);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    match req.send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => parse_search_results(&json, "bi", "商业智能", query),
            Err(e) => {
                tracing::warn!("Failed to parse BI search response: {}", e);
                vec![]
            }
        },
        Err(e) => {
            tracing::warn!("BI search failed: {}", e);
            vec![]
        }
    }
}

async fn search_notifications(
    state: &AppState,
    query: &str,
    token: Option<&str>,
) -> Vec<SearchResult> {
    let mut client = state.notification_client.clone();
    if let Some(t) = token {
        client.set_auth_token(t.to_string());
    }
    match client.list_notifications(1, 20, None).await {
        Ok(resp) => resp
            .get("notifications")
            .and_then(|v| v.as_array())
            .unwrap_or(&vec![])
            .iter()
            .filter(|n| {
                let title = n.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let content = n.get("content").and_then(|v| v.as_str()).unwrap_or("");
                title.to_lowercase().contains(&query.to_lowercase())
                    || content.to_lowercase().contains(&query.to_lowercase())
            })
            .take(10)
            .filter_map(|n| {
                let title = n.get("title")?.as_str()?.to_string();
                let content = n.get("content")?.as_str()?.to_string();
                let summary: String = content.chars().take(100).collect();
                Some(SearchResult {
                    id: n.get("id")?.as_str()?.to_string(),
                    highlight_title: highlight_text(&title, query),
                    highlight_summary: highlight_text(&summary, query),
                    title,
                    summary,
                    service: "notification".to_string(),
                    service_name: "通知中心".to_string(),
                    result_type: n.get("notification_type")?.as_str()?.to_string(),
                    url: n
                        .get("link_url")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| "/notifications".to_string()),
                })
            })
            .collect(),
        Err(e) => {
            tracing::warn!("Notification search failed: {}", e);
            vec![]
        }
    }
}

async fn search_documents(state: &AppState, query: &str, token: Option<&str>) -> Vec<SearchResult> {
    let base = resolve_service_url("DOC_SERVICE_URL", DEFAULT_DOC_URL, "DOC");
    let url = format!("{}/api/doc/search", base);
    let mut req =
        state
            .http_client
            .get(&url)
            .query(&[("q", query), ("page", "1"), ("pagesize", "10")]);
    if let Some(t) = token {
        req = req.bearer_auth(t);
    }
    match req.send().await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(json) => parse_search_results(&json, "doc", "文档中心", query),
            Err(e) => {
                tracing::warn!("Failed to parse doc search response: {}", e);
                vec![]
            }
        },
        Err(e) => {
            tracing::warn!("Doc search failed: {}", e);
            vec![]
        }
    }
}

async fn search_hrm_employees(
    state: &AppState,
    query: &str,
    token: Option<&str>,
) -> Vec<SearchResult> {
    let mut client = state.hrm_client.clone();
    if let Some(t) = token {
        client.set_auth_token(t.to_string());
    }
    match client.list_employees().await {
        Ok(employees) => employees
            .iter()
            .filter(|e| {
                let q = query.to_lowercase();
                e.name.to_lowercase().contains(&q)
                    || e.email.to_lowercase().contains(&q)
                    || e.phone.as_deref().unwrap_or("").to_lowercase().contains(&q)
            })
            .take(10)
            .map(|e| {
                let title = e.name.clone();
                let summary = format!("{} | {}", e.email, e.phone.as_deref().unwrap_or("-"));
                SearchResult {
                    id: e.id.to_string(),
                    highlight_title: highlight_text(&title, query),
                    highlight_summary: highlight_text(&summary, query),
                    title,
                    summary,
                    service: "hrm".to_string(),
                    service_name: "人力资源".to_string(),
                    result_type: "employee".to_string(),
                    url: format!("/hrm/employees/{}", e.id),
                }
            })
            .collect(),
        Err(e) => {
            tracing::warn!("HRM employee search failed: {}", e);
            vec![]
        }
    }
}

async fn search_workflow_instances(
    state: &AppState,
    query: &str,
    token: Option<&str>,
) -> Vec<SearchResult> {
    let mut client = state.workflow_client.clone();
    if let Some(t) = token {
        client.set_auth_token(t.to_string());
    }
    match client.list_instances(1, 20).await {
        Ok(resp) => resp
            .items
            .iter()
            .filter(|inst| {
                let q = query.to_lowercase();
                inst.title.to_lowercase().contains(&q) || inst.status.to_lowercase().contains(&q)
            })
            .take(10)
            .map(|inst| {
                let title = inst.title.clone();
                let summary = format!("状态: {} | 发起人: {}", inst.status, inst.initiator_id);
                SearchResult {
                    id: inst.id.to_string(),
                    highlight_title: highlight_text(&title, query),
                    highlight_summary: highlight_text(&summary, query),
                    title,
                    summary,
                    service: "workflow".to_string(),
                    service_name: "审批中心".to_string(),
                    result_type: "instance".to_string(),
                    url: format!("/workflow/instances/{}", inst.id),
                }
            })
            .collect(),
        Err(e) => {
            tracing::warn!("Workflow instance search failed: {}", e);
            vec![]
        }
    }
}

async fn search_mes_production_orders(
    state: &AppState,
    query: &str,
    token: Option<&str>,
) -> Vec<SearchResult> {
    let mut client = state.mes_client.clone();
    if let Some(t) = token {
        client.set_auth_token(t.to_string());
    }
    match client.list_production_orders(1, 20).await {
        Ok(items) => {
            let q = query.to_lowercase();
            items
                .into_iter()
                .filter(|item| {
                    let name = item
                        .get("order_no")
                        .or_else(|| item.get("name"))
                        .or_else(|| item.get("product_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let status = item.get("status").and_then(|v| v.as_str()).unwrap_or("");
                    name.to_lowercase().contains(&q) || status.to_lowercase().contains(&q)
                })
                .take(10)
                .map(|item| {
                    let id = item
                        .get("id")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .or_else(|| {
                            item.get("id")
                                .and_then(|v| v.as_i64())
                                .map(|n| n.to_string())
                        })
                        .unwrap_or_default();
                    let title = item
                        .get("order_no")
                        .or_else(|| item.get("name"))
                        .or_else(|| item.get("product_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("生产订单")
                        .to_string();
                    let status = item
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("-")
                        .to_string();
                    let summary = format!("状态: {}", status);
                    SearchResult {
                        id: id.clone(),
                        highlight_title: highlight_text(&title, query),
                        highlight_summary: highlight_text(&summary, query),
                        title,
                        summary,
                        service: "mes".to_string(),
                        service_name: "生产制造".to_string(),
                        result_type: "production_order".to_string(),
                        url: format!("/mes/production-orders/{}", id),
                    }
                })
                .collect()
        }
        Err(e) => {
            tracing::warn!("MES production order search failed: {}", e);
            vec![]
        }
    }
}

fn highlight_text(text: &str, keyword: &str) -> String {
    if keyword.is_empty() {
        return text.to_string();
    }

    let text_lower = text.to_lowercase();
    let keyword_lower = keyword.to_lowercase();
    let mut result = String::new();
    let mut last_end = 0;

    while let Some(start) = text_lower[last_end..].find(&keyword_lower) {
        let start = last_end + start;
        let end = start + keyword.len();
        result.push_str(&text[last_end..start]);
        result.push_str("<mark>");
        result.push_str(&text[start..end]);
        result.push_str("</mark>");
        last_end = end;
    }

    result.push_str(&text[last_end..]);
    result
}

fn parse_search_results(
    json: &serde_json::Value,
    service: &str,
    service_name: &str,
    keyword: &str,
) -> Vec<SearchResult> {
    let items = json
        .get("data")
        .and_then(|d| d.get("items").or_else(|| d.as_array().map(|_| d)))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    items
        .iter()
        .filter_map(|item| {
            let title = item
                .get("title")
                .or_else(|| item.get("name"))
                .and_then(|v| v.as_str())?
                .to_string();
            let summary: String = item
                .get("summary")
                .or_else(|| item.get("description"))
                .or_else(|| item.get("content"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .chars()
                .take(100)
                .collect();

            Some(SearchResult {
                id: item.get("id")?.as_str()?.to_string(),
                highlight_title: highlight_text(&title, keyword),
                highlight_summary: highlight_text(&summary, keyword),
                title,
                summary,
                service: service.to_string(),
                service_name: service_name.to_string(),
                result_type: item
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("default")
                    .to_string(),
                url: item
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            })
        })
        .take(10)
        .collect()
}

fn erp_base_url() -> String {
    resolve_service_url("ERP_SERVICE_URL", DEFAULT_ERP_URL, "ERP")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_highlight_basic() {
        let result = highlight_text("hello world", "world");
        assert_eq!(result, "hello <mark>world</mark>");
    }

    #[test]
    fn test_highlight_multiple() {
        let result = highlight_text("foo bar foo baz", "foo");
        assert_eq!(result, "<mark>foo</mark> bar <mark>foo</mark> baz");
    }

    #[test]
    fn test_highlight_case_insensitive() {
        let result = highlight_text("Hello WORLD", "world");
        assert_eq!(result, "Hello <mark>WORLD</mark>");
    }

    #[test]
    fn test_highlight_no_match() {
        let result = highlight_text("hello world", "xyz");
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_highlight_empty_keyword() {
        let result = highlight_text("hello world", "");
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_highlight_empty_text() {
        let result = highlight_text("", "test");
        assert_eq!(result, "");
    }

    #[test]
    fn test_highlight_match_at_start() {
        let result = highlight_text("test hello", "test");
        assert_eq!(result, "<mark>test</mark> hello");
    }

    #[test]
    fn test_highlight_match_at_end() {
        let result = highlight_text("hello test", "test");
        assert_eq!(result, "hello <mark>test</mark>");
    }
}
