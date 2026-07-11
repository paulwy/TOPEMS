use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Material {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub category: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub barcode: Option<String>,
    pub safety_stock: f64,
    pub unit_price: f64,
    pub tax_rate: f64,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateMaterialRequest {
    pub code: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub category: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub barcode: Option<String>,
    pub safety_stock: Option<f64>,
    pub unit_price: Option<f64>,
    pub tax_rate: Option<f64>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateMaterialRequest {
    pub name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub barcode: Option<String>,
    pub safety_stock: Option<f64>,
    pub unit_price: Option<f64>,
    pub tax_rate: Option<f64>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Customer {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub customer_type: String,
    pub industry: Option<String>,
    pub scale: Option<String>,
    pub credit_limit: f64,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateCustomerRequest {
    pub code: String,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub customer_type: String,
    pub industry: Option<String>,
    pub scale: Option<String>,
    pub credit_limit: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub customer_type: Option<String>,
    pub industry: Option<String>,
    pub scale: Option<String>,
    pub credit_limit: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Supplier {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub supplier_type: String,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateSupplierRequest {
    pub code: String,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub supplier_type: String,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateSupplierRequest {
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub supplier_type: Option<String>,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Inventory {
    pub id: Uuid,
    pub material_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub location_code: Option<String>,
    pub quantity: f64,
    pub available_quantity: f64,
    pub reserved_quantity: f64,
    pub unit: String,
    pub unit_price: f64,
    pub total_amount: f64,
    pub batch_no: Option<String>,
    pub expire_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateInventoryRequest {
    pub material_id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub batch_no: Option<String>,
    pub expire_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateInventoryRequest {
    pub warehouse_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub batch_no: Option<String>,
    pub expire_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct SalesOrder {
    pub id: Uuid,
    pub order_no: String,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub payable_amount: f64,
    pub status: String,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateSalesOrderRequest {
    pub order_no: String,
    pub customer_id: Uuid,
    pub order_date: Option<DateTime<Utc>>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub discount_amount: Option<f64>,
    pub payable_amount: Option<f64>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateSalesOrderRequest {
    pub customer_id: Option<Uuid>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub tax_amount: Option<f64>,
    pub discount_amount: Option<f64>,
    pub payable_amount: Option<f64>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub order_no: String,
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub payable_amount: f64,
    pub status: String,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct PurchaseOrderItem {
    pub material_id: Uuid,
    pub material_name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub amount: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreatePurchaseOrderRequest {
    pub supplier_id: Uuid,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub items: Vec<PurchaseOrderItem>,
    pub tax_rate: Option<f64>,
    pub discount_rate: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdatePurchaseOrderRequest {
    pub supplier_name: Option<String>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub remark: Option<String>,
}
