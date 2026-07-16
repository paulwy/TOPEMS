use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateDashboardRequest {
    pub name: String,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub owner_id: String,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDashboardRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub owner_id: String,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct DashboardListResponse {
    pub items: Vec<DashboardResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateDashboardTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub preview_image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDashboardTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub preview_image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct DashboardTemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub preview_image: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct DashboardTemplateListResponse {
    pub items: Vec<DashboardTemplateResponse>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
pub struct ShareDashboardRequest {
    pub shared_with: Vec<String>,
    pub permission: String,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ShareLinkResponse {
    pub id: Uuid,
    pub dashboard_id: Uuid,
    pub share_url: String,
    pub permission: String,
    pub expires_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportFormatQuery {
    pub format: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportDashboardRequest {
    pub name: String,
    pub owner_id: String,
    pub layout: serde_json::Value,
    pub description: Option<String>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SetAutoRefreshRequest {
    pub enabled: bool,
    pub interval_seconds: Option<i32>,
}
