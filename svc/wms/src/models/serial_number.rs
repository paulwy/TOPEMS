use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct SerialNumber {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub serial_no: String,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub warehouse_id: Uuid,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub batch_no: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub quality_status: String,
    pub status: String,
    pub warranty_start_date: Option<String>,
    pub warranty_end_date: Option<String>,
    pub inbound_order_no: Option<String>,
    pub outbound_order_no: Option<String>,
    pub current_owner: Option<String>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateSerialNumberRequest {
    pub serial_no: String,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub quality_status: Option<String>,
    pub warranty_start_date: Option<String>,
    pub warranty_end_date: Option<String>,
    pub inbound_order_no: Option<String>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateSerialNumberRequest {
    pub sku: Option<String>,
    pub material_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub location_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub warranty_start_date: Option<String>,
    pub warranty_end_date: Option<String>,
    pub outbound_order_no: Option<String>,
    pub current_owner: Option<String>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct SerialNumberQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<Uuid>,
    pub sku: Option<String>,
    pub serial_no: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub batch_no: Option<String>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub expiry_warning: Option<bool>,
    pub warranty_warning: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SerialNumberStatistics {
    pub total_serials: i64,
    pub in_stock_count: i64,
    pub out_stock_count: i64,
    pub quality_pending_count: i64,
    pub warranty_expiring_soon_count: i64,
}
