#![allow(dead_code)]
//! V15 Phase 3: 财务代理层
//!
//! 代理 ERP `/finance/*` 请求到独立 Finance 服务，让 ERP 不再是财务真理来源。
//! 路径规则：
//! - ERP 端 `/api/erp/finance/accounts` → 代理到 `/api/finance/accounts`
//! - ERP 端 `/api/erp/finance/vouchers` → 代理到 `/api/finance/vouchers`
//! - ERP 端 `/api/erp/finance/periods` → 代理到 `/api/finance/periods`
//!
//! 透明转发：方法、查询参数、请求体、JWT 透传到下游服务。

use axum::extract::{Extension, Path, Query, State};
use axum::response::IntoResponse;
use axum::Json;
use reqwest::Method;
use serde_json::Value;

use super::ApiState;
use topems_shared::auth::Claims;

/// 通用代理转发：转发到 Finance 服务
pub async fn proxy_to_finance(
    method: Method,
    path: String,
    query: Vec<(String, String)>,
    body: Option<Json<Value>>,
    claims: Claims,
) -> impl IntoResponse {
    let finance_url = std::env::var("FINANCE_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8011".to_string());

    let url = format!("{}{}", finance_url.trim_end_matches('/'), path);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut req_builder = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => {
            return Json(serde_json::json!({
                "code": 405,
                "message": format!("Method {} not allowed", method),
                "data": null,
            }))
            .into_response();
        }
    };

    if !query.is_empty() {
        req_builder = req_builder.query(&query);
    }

    if let Some(tid) = &claims.tenant_id {
        req_builder = req_builder.header("x-tenant-id", tid);
    }
    if !claims.sub.is_empty() {
        req_builder = req_builder.header("x-user-id", &claims.sub);
    }

    if let Some(Json(body)) = body {
        req_builder = req_builder.json(&body);
    }

    match req_builder.send().await {
        Ok(resp) => {
            let status = resp.status();
            let bytes = resp.bytes().await.unwrap_or_default();
            let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
            let mut response = (status, Json(json)).into_response();
            response.headers_mut().insert(
                "x-proxied-by",
                axum::http::HeaderValue::from_static("topems-erp"),
            );
            response.headers_mut().insert(
                "x-proxy-target",
                axum::http::HeaderValue::from_static("topems-finance"),
            );
            response
        }
        Err(e) => Json(serde_json::json!({
            "code": 502,
            "message": format!("Finance service unavailable: {}", e),
            "data": null,
        }))
        .into_response(),
    }
}

fn get_finance_url() -> String {
    std::env::var("FINANCE_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8011".to_string())
}

/// 仪表盘代理（高优先级路由）
pub async fn proxy_get_finance_dashboard(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/dashboard", get_finance_url());
    proxy_simple_get(&url, &claims).await
}

/// 科目列表代理
pub async fn proxy_list_accounts(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/accounts", get_finance_url());
    proxy_with_query(Method::GET, &url, query, None, &claims).await
}

/// 科目单条代理
pub async fn proxy_get_account(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/accounts/{}", get_finance_url(), id);
    proxy_simple_get(&url, &claims).await
}

/// 凭证列表代理
pub async fn proxy_list_vouchers(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/vouchers", get_finance_url());
    proxy_with_query(Method::GET, &url, query, None, &claims).await
}

/// 凭证单条代理
pub async fn proxy_get_voucher(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/vouchers/{}", get_finance_url(), id);
    proxy_simple_get(&url, &claims).await
}

/// 凭证提交代理
pub async fn proxy_submit_voucher(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/vouchers/{}/submit", get_finance_url(), id);
    proxy_simple_post(&url, &claims).await
}

/// 凭证审批代理
pub async fn proxy_approve_voucher(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/vouchers/{}/approve", get_finance_url(), id);
    proxy_simple_post(&url, &claims).await
}

/// 凭证过账代理
pub async fn proxy_post_voucher(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/vouchers/{}/post", get_finance_url(), id);
    proxy_simple_post(&url, &claims).await
}

/// 期间打开代理
pub async fn proxy_open_period(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((year, month)): Path<(i32, i32)>,
) -> impl IntoResponse {
    let url = format!(
        "{}/api/finance/periods/{}/{}/open",
        get_finance_url(),
        year,
        month
    );
    proxy_simple_post(&url, &claims).await
}

/// 期间关闭代理
pub async fn proxy_close_period(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((year, month)): Path<(i32, i32)>,
) -> impl IntoResponse {
    let url = format!(
        "{}/api/finance/periods/{}/{}/close",
        get_finance_url(),
        year,
        month
    );
    proxy_simple_post(&url, &claims).await
}

/// 试算平衡表代理
pub async fn proxy_get_trial_balance(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/trial-balance/{}", get_finance_url(), period);
    proxy_simple_get(&url, &claims).await
}

/// 资产负债表代理
pub async fn proxy_get_balance_sheet(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/balance-sheet/{}", get_finance_url(), period);
    proxy_simple_get(&url, &claims).await
}

/// 利润表代理
pub async fn proxy_get_income_statement(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> impl IntoResponse {
    let url = format!(
        "{}/api/finance/income-statement/{}",
        get_finance_url(),
        period
    );
    proxy_simple_get(&url, &claims).await
}

/// 现金流量表代理
pub async fn proxy_get_cash_flow(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(period): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/finance/cash-flow/{}", get_finance_url(), period);
    proxy_simple_get(&url, &claims).await
}

// ==================== 内部辅助函数 ====================

async fn proxy_simple_get(url: &str, claims: &Claims) -> impl IntoResponse {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut req = client.get(url);
    if let Some(tid) = &claims.tenant_id {
        req = req.header("x-tenant-id", tid);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let bytes = resp.bytes().await.unwrap_or_default();
            let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
            let mut response = (status, Json(json)).into_response();
            response.headers_mut().insert(
                "x-proxied-by",
                axum::http::HeaderValue::from_static("topems-erp"),
            );
            response.headers_mut().insert(
                "x-proxy-target",
                axum::http::HeaderValue::from_static("topems-finance"),
            );
            response
        }
        Err(e) => Json(serde_json::json!({
            "code": 502,
            "message": format!("Finance service unavailable: {}", e),
            "data": null,
        }))
        .into_response(),
    }
}

async fn proxy_simple_post(url: &str, claims: &Claims) -> impl IntoResponse {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut req = client.post(url);
    if let Some(tid) = &claims.tenant_id {
        req = req.header("x-tenant-id", tid);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let bytes = resp.bytes().await.unwrap_or_default();
            let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
            let mut response = (status, Json(json)).into_response();
            response.headers_mut().insert(
                "x-proxied-by",
                axum::http::HeaderValue::from_static("topems-erp"),
            );
            response.headers_mut().insert(
                "x-proxy-target",
                axum::http::HeaderValue::from_static("topems-finance"),
            );
            response
        }
        Err(e) => Json(serde_json::json!({
            "code": 502,
            "message": format!("Finance service unavailable: {}", e),
            "data": null,
        }))
        .into_response(),
    }
}

async fn proxy_with_query(
    method: Method,
    url: &str,
    query: Vec<(String, String)>,
    body: Option<Json<Value>>,
    claims: &Claims,
) -> impl IntoResponse {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let mut req = client.request(method, url);
    if !query.is_empty() {
        req = req.query(&query);
    }
    if let Some(tid) = &claims.tenant_id {
        req = req.header("x-tenant-id", tid);
    }
    if let Some(Json(b)) = body {
        req = req.json(&b);
    }

    match req.send().await {
        Ok(resp) => {
            let status = resp.status();
            let bytes = resp.bytes().await.unwrap_or_default();
            let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
            let mut response = (status, Json(json)).into_response();
            response.headers_mut().insert(
                "x-proxied-by",
                axum::http::HeaderValue::from_static("topems-erp"),
            );
            response.headers_mut().insert(
                "x-proxy-target",
                axum::http::HeaderValue::from_static("topems-finance"),
            );
            response
        }
        Err(e) => Json(serde_json::json!({
            "code": 502,
            "message": format!("Finance service unavailable: {}", e),
            "data": null,
        }))
        .into_response(),
    }
}

/// 财务代理路由注册
pub fn proxy_routes() -> axum::Router<ApiState> {
    use axum::routing::{get, post};

    axum::Router::new()
        .route("/finance/dashboard", get(proxy_get_finance_dashboard))
        .route("/finance/accounts", get(proxy_list_accounts))
        .route("/finance/accounts/{id}", get(proxy_get_account))
        .route("/finance/vouchers", get(proxy_list_vouchers))
        .route("/finance/vouchers/{id}", get(proxy_get_voucher))
        .route("/finance/vouchers/{id}/submit", post(proxy_submit_voucher))
        .route(
            "/finance/vouchers/{id}/approve",
            post(proxy_approve_voucher),
        )
        .route("/finance/vouchers/{id}/post", post(proxy_post_voucher))
        .route(
            "/finance/periods/{year}/{month}/open",
            post(proxy_open_period),
        )
        .route(
            "/finance/periods/{year}/{month}/close",
            post(proxy_close_period),
        )
        .route(
            "/finance/trial-balance/{period}",
            get(proxy_get_trial_balance),
        )
        .route(
            "/finance/balance-sheet/{period}",
            get(proxy_get_balance_sheet),
        )
        .route(
            "/finance/income-statement/{period}",
            get(proxy_get_income_statement),
        )
        .route("/finance/cash-flow/{period}", get(proxy_get_cash_flow))
}
