//! Environment handlers

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
    Router::new()
        .route("/environment", get(list_records).post(create_record))
        .route(
            "/environment/monitors",
            get(list_records).post(create_record),
        )
        .route(
            "/environment/records",
            get(list_records).post(create_record),
        )
}

#[derive(Debug, Deserialize)]
pub struct EnvironmentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EnvironmentRecord {
    pub id: String,
    pub record_no: String,
    pub monitor_type: Option<String>,
    pub monitor_point: Option<String>,
    pub data: serde_json::Value,
    pub status: String,
    pub monitored_at: Option<String>,

    pub tenant_id: Uuid,
}

pub async fn list_records(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<EnvironmentRecord>>> {
    let _tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Listing environment records");
    Json(ApiResponse::success(
        Vec::<EnvironmentRecord>::new(),
        "获取环境记录列表成功",
    ))
}

pub async fn create_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<EnvironmentRecord>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    tracing::debug!("Creating environment record: {:?}", req);
    Json(ApiResponse::success(
        EnvironmentRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "ENV-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            monitor_type: Some("废气".to_string()),
            monitor_point: Some("排放口A".to_string()),
            data: serde_json::json!({"pm25": 35, "so2": 0.02}),
            status: "normal".to_string(),
            monitored_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "环境记录创建成功",
    ))
}
