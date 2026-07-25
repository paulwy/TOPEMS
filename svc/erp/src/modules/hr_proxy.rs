#![allow(dead_code)]
//! V15 Phase 3: HR 代理层
//!
//! 代理 ERP 端 HR 相关请求到独立 HRM 服务。
//! 覆盖员工、部门、公司、薪酬等核心 HR 域。
//!
//! 使用共享 TypedServiceClient<HrmApi> 替代 raw reqwest，支持：
//! - 连接池复用（避免每次请求创建新 Client）
//! - OpenTelemetry 链路追踪注入
//! - x-tenant-id 租户隔离
//!
//! 路径规则：
//! - ERP 端 `/api/erp/hr/employees` → 代理到 `/api/hrm/employees`
//! - ERP 端 `/api/erp/hr/departments` → 代理到 `/api/hrm/departments`
//! - ERP 端 `/api/erp/hr/companies` → 代理到 `/api/hrm/companies`

use axum::extract::{Extension, Path, Query, State};
use axum::response::IntoResponse;
use axum::Json;
use serde_json::Value;

use super::ApiState;
use topems_shared::auth::Claims;
use topems_shared::service_client::{api::hrm_api::HrmApi, TypedServiceClient};

// ==================== 内部辅助函数 ====================

/// 代理 GET 请求到 HRM 服务（透传响应，注入 x-tenant-id）
async fn proxy_hrm_get(
    client: &TypedServiceClient<HrmApi>,
    path: &str,
    query: Option<Vec<(String, String)>>,
    claims: &Claims,
) -> impl IntoResponse {
    let query_ref: Option<Vec<(&str, &str)>> = query
        .as_ref()
        .map(|q| q.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect());
    let tenant_id = claims.tenant_id.as_ref().map(|t| t.to_string());
    let extra_headers: Vec<(&str, &str)> = if let Some(tid) = &tenant_id {
        vec![("x-tenant-id", tid.as_str())]
    } else {
        vec![]
    };

    match client
        .get_raw_response(path, query_ref.as_deref(), &extra_headers)
        .await
    {
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    proxy_hrm_get(
        &state.hrm_client,
        "/api/hrm/employees",
        Some(query),
        &claims,
    )
    .await
}

pub async fn proxy_get_employee(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let path = format!("/api/hrm/employees/{}", id);
    proxy_hrm_get(&state.hrm_client, &path, None, &claims).await
}

pub async fn proxy_get_employee_by_user(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    let path = format!("/api/hrm/employees/by-user/{}", user_id);
    proxy_hrm_get(&state.hrm_client, &path, None, &claims).await
}

// ==================== 部门（Departments）代理 ====================

pub async fn proxy_list_departments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    proxy_hrm_get(
        &state.hrm_client,
        "/api/hrm/departments",
        Some(query),
        &claims,
    )
    .await
}

pub async fn proxy_get_department(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let path = format!("/api/hrm/departments/{}", id);
    proxy_hrm_get(&state.hrm_client, &path, None, &claims).await
}

pub async fn proxy_get_department_tree(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    proxy_hrm_get(
        &state.hrm_client,
        "/api/hrm/departments/tree",
        None,
        &claims,
    )
    .await
}

// ==================== 公司（Companies）代理 ====================

pub async fn proxy_list_companies(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    proxy_hrm_get(
        &state.hrm_client,
        "/api/hrm/companies",
        Some(query),
        &claims,
    )
    .await
}

pub async fn proxy_get_company(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let path = format!("/api/hrm/companies/{}", id);
    proxy_hrm_get(&state.hrm_client, &path, None, &claims).await
}

// ==================== 职位（Positions）代理 ====================

pub async fn proxy_list_positions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    proxy_hrm_get(
        &state.hrm_client,
        "/api/hrm/positions",
        Some(query),
        &claims,
    )
    .await
}

pub async fn proxy_get_position(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let path = format!("/api/hrm/positions/{}", id);
    proxy_hrm_get(&state.hrm_client, &path, None, &claims).await
}

// ==================== 薪酬（Payroll）代理 ====================

pub async fn proxy_list_payrolls(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    proxy_hrm_get(
        &state.hrm_client,
        "/api/hrm/payrolls",
        Some(query),
        &claims,
    )
    .await
}

pub async fn proxy_get_payroll(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let path = format!("/api/hrm/payrolls/{}", id);
    proxy_hrm_get(&state.hrm_client, &path, None, &claims).await
}

// ==================== 考勤（Attendance）代理 ====================

pub async fn proxy_list_attendances(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<Vec<(String, String)>>,
) -> impl IntoResponse {
    proxy_hrm_get(
        &state.hrm_client,
        "/api/hrm/attendances",
        Some(query),
        &claims,
    )
    .await
}

// ==================== 路由注册 ====================

pub fn proxy_routes() -> axum::Router<ApiState> {
    use axum::routing::get;

    axum::Router::new()
        // 仪表盘代理
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
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    proxy_hrm_get(&state.hrm_client, "/api/hrm/dashboard", None, &claims).await
}
