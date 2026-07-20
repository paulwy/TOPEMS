use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 库存移动记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct InventoryMovement {
    pub id: Uuid,
    pub movement_no: String,
    pub tenant_id: Uuid,
    pub movement_type: String, // inbound/outbound/transfer/return/adjustment
    pub reference_id: Option<String>,
    pub reference_type: Option<String>, // return_order/sales_order/purchase_order/transfer_order
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub quantity: f64,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub from_warehouse_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub status: String, // pending/completed/cancelled
    pub performed_by: Option<Uuid>,
    pub performed_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateInventoryMovementRequest {
    pub movement_type: String,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub material_id: Option<Uuid>,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub quantity: f64,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub from_warehouse_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct InventoryMovementQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub movement_type: Option<String>,
    pub status: Option<String>,
    pub reference_id: Option<String>,
    pub reference_type: Option<String>,
    pub material_id: Option<Uuid>,
    pub ref_id: Option<String>,
    pub ref_type: Option<String>,
}
