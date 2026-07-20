//! 退换货模型 - V19.5 恢复
//!
//! 此前 aftersales.rs 模块因 models/mod.rs 未声明对应模型而未被编译。
//! V19.5 启用编译时补齐缺失模型，对应数据表 crm.returns / crm.return_items。

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// 退换货主表
#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Return {
    pub id: Uuid,
    pub return_no: String,
    pub tenant_id: Uuid,
    pub customer_id: Option<Uuid>,
    pub order_id: Option<Uuid>,
    pub return_type: String,
    pub reason: Option<String>,
    pub reason_detail: Option<String>,
    pub status: String,
    pub refund_amount: Decimal,
    pub exchange_product_id: Option<Uuid>,
    pub received: bool,
    pub received_at: Option<DateTime<Utc>>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub ticket_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
}

/// 退换货明细
#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct ReturnItem {
    pub id: Uuid,
    pub return_id: Uuid,
    pub tenant_id: Uuid,
    pub product_id: Option<Uuid>,
    pub quantity: i32,
    pub unit_price: Decimal,
    pub total_amount: Decimal,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateReturnRequest {
    pub customer_id: Option<Uuid>,
    pub order_id: Option<Uuid>,
    pub return_type: Option<String>,
    pub reason: Option<String>,
    pub reason_detail: Option<String>,
    pub exchange_product_id: Option<Uuid>,
    pub ticket_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateReturnRequest {
    pub customer_id: Option<Uuid>,
    pub order_id: Option<Uuid>,
    pub return_type: Option<String>,
    pub reason: Option<String>,
    pub reason_detail: Option<String>,
    pub exchange_product_id: Option<Uuid>,
    pub ticket_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct ReturnQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub return_type: Option<String>,
    pub customer_id: Option<Uuid>,
    pub order_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct ReturnActionRequest {
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateReturnItemRequest {
    pub product_id: Option<Uuid>,
    pub quantity: i32,
    pub unit_price: Decimal,
}
