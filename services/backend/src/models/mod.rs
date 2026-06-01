use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDate;
use sqlx::Row;
use rust_decimal::Decimal;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionPlan {
    pub id: Uuid,
    pub product_name: String,
    pub product_code: String,
    pub planned_quantity: i32,
    pub actual_quantity: i32,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

impl ProductionPlan {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            product_name: row.try_get("product_name")?,
            product_code: row.try_get("product_code")?,
            planned_quantity: row.try_get("planned_quantity")?,
            actual_quantity: row.try_get("actual_quantity")?,
            start_date: row.try_get("start_date")?,
            end_date: row.try_get("end_date")?,
            status: row.try_get("status")?,
            created_by: row.try_get("created_by")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionPlanRequest {
    pub product_name: String,
    pub product_code: String,
    pub planned_quantity: i32,
    pub start_date: String,
    pub end_date: String,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplyChainOrder {
    pub id: Uuid,
    pub order_type: String,
    pub supplier_customer: String,
    pub product_name: String,
    pub quantity: i32,
    pub unit_price: Decimal,
    pub total_amount: Decimal,
    pub order_date: NaiveDate,
    pub delivery_date: Option<NaiveDate>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

impl SupplyChainOrder {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            order_type: row.try_get("order_type")?,
            supplier_customer: row.try_get("supplier_customer")?,
            product_name: row.try_get("product_name")?,
            quantity: row.try_get("quantity")?,
            unit_price: row.try_get("unit_price")?,
            total_amount: row.try_get("total_amount")?,
            order_date: row.try_get("order_date")?,
            delivery_date: row.try_get("delivery_date")?,
            status: row.try_get("status")?,
            created_by: row.try_get("created_by")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplyChainOrderRequest {
    pub order_type: String,
    pub supplier_customer: String,
    pub product_name: String,
    pub quantity: i32,
    pub unit_price: String,
    pub order_date: String,
    pub delivery_date: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialRecord {
    pub id: Uuid,
    pub record_type: String,
    pub category: String,
    pub amount: Decimal,
    pub description: Option<String>,
    pub transaction_date: NaiveDate,
    pub payment_method: Option<String>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

impl FinancialRecord {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            record_type: row.try_get("record_type")?,
            category: row.try_get("category")?,
            amount: row.try_get("amount")?,
            description: row.try_get("description")?,
            transaction_date: row.try_get("transaction_date")?,
            payment_method: row.try_get("payment_method")?,
            status: row.try_get("status")?,
            created_by: row.try_get("created_by")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFinancialRecordRequest {
    pub record_type: String,
    pub category: String,
    pub amount: String,
    pub description: Option<String>,
    pub transaction_date: String,
    pub payment_method: Option<String>,
    pub created_by: Option<String>,
}
