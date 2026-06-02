use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct EmailTemplate {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub subject_template: String,
    pub body_template: String,
    pub body_html_template: Option<String>,
    pub category: String,
    pub tags: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub subject_template: String,
    pub body_template: String,
    pub body_html_template: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub subject_template: Option<String>,
    pub body_template: Option<String>,
    pub body_html_template: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TemplateListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenderTemplateRequest {
    pub template_code: String,
    pub data: serde_json::Value,
}
