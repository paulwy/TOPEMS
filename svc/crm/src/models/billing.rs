use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct BillingRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub invoice_no: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub due_date: DateTime<Utc>,
    #[serde(default)]
    pub paid_at: Option<DateTime<Utc>>,
    pub items: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for BillingRecord {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            customer_id: Uuid::nil(),
            customer_name: String::new(),
            invoice_no: String::new(),
            amount: 0.0,
            currency: "CNY".into(),
            status: "pending".into(),
            due_date: Utc::now(),
            paid_at: None,
            items: serde_json::Value::Array(vec![]),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct BillingItem {
    #[serde(default)]
    pub id: Option<Uuid>,
    pub name: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateBillingRequest {
    pub customer_id: Uuid,
    #[serde(default)]
    pub invoice_no: Option<String>,
    pub amount: f64,
    #[serde(default)]
    pub currency: Option<String>,
    pub due_date: DateTime<Utc>,
    #[serde(default)]
    pub items: Vec<BillingItem>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateBillingRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub invoice_no: Option<String>,
    #[serde(default)]
    pub amount: Option<f64>,
    #[serde(default)]
    pub currency: Option<String>,
    #[serde(default)]
    pub due_date: Option<DateTime<Utc>>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub items: Option<Vec<BillingItem>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BillingQueryParams {
    #[serde(default)]
    pub page: Option<i64>,
    #[serde(default)]
    pub page_size: Option<i64>,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub status: Option<String>,
}

impl Default for CreateBillingRequest {
    fn default() -> Self {
        Self {
            customer_id: Uuid::nil(),
            invoice_no: None,
            amount: 0.0,
            currency: Some("CNY".into()),
            due_date: Utc::now(),
            items: vec![],
        }
    }
}

impl Default for UpdateBillingRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            invoice_no: None,
            amount: None,
            currency: None,
            due_date: None,
            status: None,
            items: None,
        }
    }
}
