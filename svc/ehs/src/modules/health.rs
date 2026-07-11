//! Health handlers

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared::{ApiResponse, Claims};

use uuid::Uuid;

use crate::shared::AppState;

fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new().route("/api/ehs/health", get(list_records).post(create_record))
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

pub async fn list_records(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<HealthRecord>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Listing health records");
    Json(ApiResponse::success(
        Vec::<HealthRecord>::new(),
        "获取健康记录列表成功",
    ))
}

pub async fn create_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<HealthRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::info!("Creating health record: {:?}", req);
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
