// CRM 服务 OpenAPI 文档
use utoipa::{OpenApi, ToSchema};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Customer {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub customer_type: Option<String>,
    pub industry: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Contact {
    pub id: Uuid,
    pub customer_id: Option<Uuid>,
    pub name: String,
    pub title: Option<String>,
    pub department: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub is_primary: Option<bool>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Opportunity {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub name: String,
    pub stage: String,
    pub amount: Option<f64>,
    pub probability: Option<i32>,
    pub expected_close_date: Option<DateTime<Utc>>,
    pub owner_id: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Interaction {
    pub id: Uuid,
    pub customer_id: Option<Uuid>,
    pub contact_id: Option<Uuid>,
    pub opportunity_id: Option<Uuid>,
    pub interaction_type: String,
    pub subject: String,
    pub content: Option<String>,
    pub occurred_at: Option<DateTime<Utc>>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Tag {
    pub id: Uuid,
    pub name: String,
    pub color: Option<String>,
    pub category: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            Customer,
            Contact,
            Opportunity,
            Interaction,
            Tag,
        ),
    ),
    tags(
        (name = "customer", description = "客户管理 API"),
        (name = "contact", description = "联系人 API"),
        (name = "opportunity", description = "商机 API"),
        (name = "interaction", description = "交互记录 API"),
        (name = "tag", description = "标签 API"),
        (name = "audit", description = "审计日志 API"),
    ),
    info(
        title = "TOPEMS CRM API",
        version = "1.0.0",
        description = "客户关系管理系统 API - 包含客户管理、商机管理、交互记录等功能"
    )
)]
pub struct CrmApiDoc;
