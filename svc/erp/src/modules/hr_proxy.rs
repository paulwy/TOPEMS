#![allow(dead_code)]
//! V15 Phase 3: HR 代理层
//!
//! 代理 ERP 端 HR 相关请求到独立 HRM 服务。
//! 覆盖员工、部门、公司、薪酬等核心 HR 域。
//!
//! 路径规则：
//! - ERP 端 `/api/erp/hr/employees` → 代理到 `/api/hrm/employees`
//! - ERP 端 `/api/erp/hr/departments` → 代理到 `/api/hrm/departments`
//! - ERP 端 `/api/erp/hr/companies` → 代理到 `/api/hrm/companies`

use axum::extract::{Extension, Path, Query, State};
use axum::response::IntoResponse;
use axum::Json;
use reqwest::Method;
use serde_json::Value;

use super::ApiState;
use topems_shared::auth::Claims;

fn get_hrm_url() -> String {
    std::env::var("HRM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8002".to_string())
}

// ==================== 内部辅助函数 ====================

async fn proxy_hrm_simple_get(url: &str, claims: &Claims) -> impl IntoResponse {
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
                axum::http::HeaderValue::from_static("topems-hrm"),
            );
            response
        }
        Err(e) => Json(serde_json::json!({
            "code": 502,
            "message": format!("HRM service unavailable: {}", e),
            "data": null,
        }))
        .into_response(),
    }
}

async fn proxy_hrm_with_query(
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
                axum::http::HeaderValue::from_static("topems-hrm"),
            );
            response
        }
        Err(e) => Json(serde_json::json!({
            "code": 502,
            "message": format!("HRM service unavailable: {}", e),
            "data": null,
        }))
        .into_response(),
    }
}

// ==================== 员工（Employees）代理 ====================

pub async fn proxy_list_employees(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/employees", get_hrm_url());
    proxy_hrm_with_query(Method::GET, &url, query, None, &claims).await
}

pub async fn proxy_get_employee(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/employees/{}", get_hrm_url(), id);
    proxy_hrm_simple_get(&url, &claims).await
}

pub async fn proxy_get_employee_by_user(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/employees/by-user/{}", get_hrm_url(), user_id);
    proxy_hrm_simple_get(&url, &claims).await
}

// ==================== 部门（Departments）代理 ====================

pub async fn proxy_list_departments(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/departments", get_hrm_url());
    proxy_hrm_with_query(Method::GET, &url, query, None, &claims).await
}

pub async fn proxy_get_department(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/departments/{}", get_hrm_url(), id);
    proxy_hrm_simple_get(&url, &claims).await
}

pub async fn proxy_get_department_tree(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/departments/tree", get_hrm_url());
    proxy_hrm_simple_get(&url, &claims).await
}

// ==================== 公司（Companies）代理 ====================

pub async fn proxy_list_companies(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/companies", get_hrm_url());
    proxy_hrm_with_query(Method::GET, &url, query, None, &claims).await
}

pub async fn proxy_get_company(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/companies/{}", get_hrm_url(), id);
    proxy_hrm_simple_get(&url, &claims).await
}

// ==================== 职位（Positions）代理 ====================

pub async fn proxy_list_positions(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/positions", get_hrm_url());
    proxy_hrm_with_query(Method::GET, &url, query, None, &claims).await
}

pub async fn proxy_get_position(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/positions/{}", get_hrm_url(), id);
    proxy_hrm_simple_get(&url, &claims).await
}

// ==================== 薪酬（Payroll）代理 ====================

pub async fn proxy_list_payrolls(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/payrolls", get_hrm_url());
    proxy_hrm_with_query(Method::GET, &url, query, None, &claims).await
}

pub async fn proxy_get_payroll(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/payrolls/{}", get_hrm_url(), id);
    proxy_hrm_simple_get(&url, &claims).await
}

// ==================== 考勤（Attendance）代理 ====================

pub async fn proxy_list_attendances(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/attendances", get_hrm_url());
    proxy_hrm_with_query(Method::GET, &url, query, None, &claims).await
}

// ==================== 路由注册 ====================

pub fn proxy_routes() -> axum::Router<ApiState> {
    use axum::routing::get;

    axum::Router::new()
        // 仪表盘代理（如有）
        .route("/hr/dashboard", get(proxy_hrm_dashboard))
        // 员工
        .route("/hr/employees", get(proxy_list_employees))
        .route(
            "/hr/employees/by-user/{user_id}",
            get(proxy_get_employee_by_user),
        )
        .route("/hr/employees/{id}", get(proxy_get_employee))
        // 部门
        .route("/hr/departments", get(proxy_list_departments))
        .route("/hr/departments/tree", get(proxy_get_department_tree))
        .route("/hr/departments/{id}", get(proxy_get_department))
        // 公司
        .route("/hr/companies", get(proxy_list_companies))
        .route("/hr/companies/{id}", get(proxy_get_company))
        // 职位
        .route("/hr/positions", get(proxy_list_positions))
        .route("/hr/positions/{id}", get(proxy_get_position))
        // 薪酬
        .route("/hr/payrolls", get(proxy_list_payrolls))
        .route("/hr/payrolls/{id}", get(proxy_get_payroll))
        // 考勤
        .route("/hr/attendances", get(proxy_list_attendances))
}

async fn proxy_hrm_dashboard(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let url = format!("{}/api/hrm/dashboard", get_hrm_url());
    proxy_hrm_simple_get(&url, &claims).await
}
