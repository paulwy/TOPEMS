//! 退换货模型 - Return FSM 含 resolved_at

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Return {
    pub id: Uuid,
    pub return_no: String,
    pub tenant_id: Uuid,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
    pub return_type: String,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reason_detail: Option<String>,
    pub status: String,
    pub refund_amount: Decimal,
    #[serde(default)]
    pub exchange_product_id: Option<Uuid>,
    pub received: bool,
    #[serde(default)]
    pub received_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub approved_by: Option<Uuid>,
    #[serde(default)]
    pub approved_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub resolved_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub created_by: Option<Uuid>,
    #[serde(default)]
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub ticket_id: Option<Uuid>,
    #[serde(default)]
    pub warehouse_id: Option<Uuid>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Return {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            return_no: String::new(),
            tenant_id: Uuid::nil(),
            customer_id: None,
            order_id: None,
            return_type: "return".into(),
            reason: None,
            reason_detail: None,
            status: "pending".into(),
            refund_amount: Decimal::ZERO,
            exchange_product_id: None,
            received: false,
            received_at: None,
            approved_by: None,
            approved_at: None,
            completed_at: None,
            resolved_at: None,
            created_by: None,
            updated_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            ticket_id: None,
            warehouse_id: None,
            deleted_at: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ReturnItem {
    pub id: Uuid,
    pub return_id: Uuid,
    pub tenant_id: Uuid,
    #[serde(default)]
    pub product_id: Option<Uuid>,
    pub quantity: i32,
    pub unit_price: Decimal,
    pub total_amount: Decimal,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateReturnRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
    #[serde(default)]
    pub return_type: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reason_detail: Option<String>,
    #[serde(default)]
    pub exchange_product_id: Option<Uuid>,
    #[serde(default)]
    pub ticket_id: Option<Uuid>,
    #[serde(default)]
    pub warehouse_id: Option<Uuid>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateReturnRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
    #[serde(default)]
    pub return_type: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reason_detail: Option<String>,
    #[serde(default)]
    pub exchange_product_id: Option<Uuid>,
    #[serde(default)]
    pub ticket_id: Option<Uuid>,
    #[serde(default)]
    pub warehouse_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReturnQuery {
    #[serde(default)]
    pub page: Option<i64>,
    #[serde(default)]
    pub page_size: Option<i64>,
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub return_type: Option<String>,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub order_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct ReturnActionRequest {
    #[serde(default)]
    pub comment: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub process_type: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateReturnItemRequest {
    #[serde(default)]
    pub product_id: Option<Uuid>,
    pub quantity: i32,
    pub unit_price: Decimal,
}

impl Default for CreateReturnRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            order_id: None,
            return_type: Some("return".into()),
            reason: None,
            reason_detail: None,
            exchange_product_id: None,
            ticket_id: None,
            warehouse_id: None,
        }
    }
}

impl Default for UpdateReturnRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            order_id: None,
            return_type: None,
            reason: None,
            reason_detail: None,
            exchange_product_id: None,
            ticket_id: None,
            warehouse_id: None,
        }
    }
}
