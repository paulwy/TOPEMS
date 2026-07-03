use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Batch {
    pub id: Uuid,
    pub batch_no: String,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub available_quantity: f64,
    pub warehouse_id: String,
    pub warehouse_name: Option<String>,
    pub location_id: Option<String>,
    pub location_code: Option<String>,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub receipt_date: Option<String>,
    pub quality_status: String,
    pub status: String,
    pub manufacture_date: Option<String>,
    pub shelf_life_days: Option<i32>,
    pub remaining_days: Option<i32>,
    pub unit_price: Option<f64>,
    pub total_value: Option<f64>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateBatchRequest {
    pub batch_no: String,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub warehouse_id: String,
    pub location_id: Option<String>,
    pub supplier_id: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub receipt_date: Option<String>,
    pub quality_status: Option<String>,
    pub manufacture_date: Option<String>,
    pub shelf_life_days: Option<i32>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateBatchRequest {
    pub batch_no: Option<String>,
    pub sku: Option<String>,
    pub material_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub warehouse_id: Option<String>,
    pub location_id: Option<String>,
    pub supplier_id: Option<String>,
    pub production_date: Option<String>,
    pub expiry_date: Option<String>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub manufacture_date: Option<String>,
    pub shelf_life_days: Option<i32>,
    pub unit_price: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BatchQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<String>,
    pub sku: Option<String>,
    pub batch_no: Option<String>,
    pub supplier_id: Option<String>,
    pub quality_status: Option<String>,
    pub status: Option<String>,
    pub expiry_warning: Option<bool>,
    pub expired: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchStatistics {
    pub total_batches: i64,
    pub total_quantity: f64,
    pub total_value: f64,
    pub expiring_soon_count: i64,
    pub expired_count: i64,
    pub quality_pending_count: i64,
}
