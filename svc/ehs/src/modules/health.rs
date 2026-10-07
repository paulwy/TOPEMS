//! Health handlers

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    // 注意：不注册 `/health` 集合路由。BFF 外层 registry 有通用探活 `/api/{svc}/health`，
    // 嵌套注册同名静态路由会与该参数路由冲突，导致 ehs auth_middleware 被绕过、
    // handler 取 Extension<Claims> 时 500。业务健康记录列表请走 `/health-records`。
    Router::new()
        .route("/health-records", get(list_records).post(create_record))
        .route(
            "/health/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route("/health/statistics", get(get_statistics))
}

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HealthRecord {
    pub id: String,
    pub record_no: String,
    pub employee_name: Option<String>,
    pub check_type: Option<String>,
    pub check_date: Option<String>,
    pub result: Option<String>,
    pub status: String,

    pub tenant_id: Uuid,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/health-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_records(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthRecord>>> {
    tracing::debug!("Listing health records");
    Json(ApiResponse::success(
        Vec::<HealthRecord>::new(),
        "获取健康记录列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/health-records",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<HealthRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating health record: {:?}", req);
    Json(ApiResponse::success(
        HealthRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "HLT-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            employee_name: Some("员工A".to_string()),
            check_type: Some("年度体检".to_string()),
            check_date: Some(chrono::Utc::now().to_rfc3339()),
            result: Some("正常".to_string()),
            status: "normal".to_string(),

            tenant_id,
        },
        "健康记录创建成功",
    ))
}

// 待上游支持：职业健康体检记录当前为内存桩，无持久化表。
// 详情类 GET 返回 200 + 内层 404；PUT/DELETE 幂等成功。

pub async fn get_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<HealthRecord>> {
    Json(ApiResponse::error(404, "健康记录不存在"))
}

pub async fn update_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<HealthRecord>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    Json(ApiResponse::success(
        HealthRecord {
            id,
            record_no: "HLT-UPD".to_string(),
            employee_name: req
                .get("employee_name")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            check_type: req
                .get("check_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            check_date: req
                .get("check_date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            result: req
                .get("result")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: req
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("normal")
                .to_string(),
            tenant_id,
        },
        "健康记录更新成功",
    ))
}

pub async fn delete_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "健康记录删除成功"))
}

pub async fn get_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "total": 0,
            "normal": 0,
            "abnormal": 0,
            "by_check_type": []
        }),
        "获取健康统计成功",
    ))
}
