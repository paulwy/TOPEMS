use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierProduct {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub product_no: String,
    pub supplier_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: String,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: String,
    pub specifications: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSupplierProductRequest {
    pub product_no: String,
    pub supplier_id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: String,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: String,
    pub specifications: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierProductRequest {
    pub product_no: Option<String>,
    pub supplier_id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: Option<String>,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: Option<String>,
    pub specifications: Option<String>,
}
