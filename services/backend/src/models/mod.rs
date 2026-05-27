use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionPlan {
    pub id: String,
    pub product_name: String,
    pub product_code: String,
    pub planned_quantity: i32,
    pub start_date: String,
    pub end_date: String,
    pub status: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionPlanRequest {
    pub product_name: String,
    pub product_code: String,
    pub planned_quantity: i32,
    pub start_date: String,
    pub end_date: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplyChainOrder {
    pub id: String,
    pub order_type: String,
    pub material_name: String,
    pub quantity: i32,
    pub supplier_customer: String,
    pub status: String,
    pub order_date: String,
    pub expected_date: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplyChainOrderRequest {
    pub order_type: String,
    pub material_name: String,
    pub quantity: i32,
    pub supplier_customer: String,
    pub expected_date: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialRecord {
    pub id: String,
    pub record_type: String,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub date: String,
    pub reference_number: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFinancialRecordRequest {
    pub record_type: String,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub reference_number: String,
    pub created_by: String,
}

#[derive(Debug)]
pub struct AppState {
    pub production_plans: Mutex<Vec<ProductionPlan>>,
    pub supply_chain_orders: Mutex<Vec<SupplyChainOrder>>,
    pub financial_records: Mutex<Vec<FinancialRecord>>,
}

impl AppState {
    pub fn new() -> Self {
        let now = Utc::now().format("%Y-%m-%d").to_string();
        let next_week = (Utc::now() + chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
        let next_month = (Utc::now() + chrono::Duration::days(30)).format("%Y-%m-%d").to_string();
        
        AppState {
            production_plans: Mutex::new(vec![
                ProductionPlan {
                    id: Uuid::new_v4().to_string(),
                    product_name: "高性能复合材料 A".to_string(),
                    product_code: "MAT-A-001".to_string(),
                    planned_quantity: 1000,
                    start_date: now.clone(),
                    end_date: next_week.clone(),
                    status: "计划中".to_string(),
                    created_by: "生产经理".to_string(),
                },
            ]),
            supply_chain_orders: Mutex::new(vec![
                SupplyChainOrder {
                    id: Uuid::new_v4().to_string(),
                    order_type: "采购".to_string(),
                    material_name: "化工原料 X".to_string(),
                    quantity: 500,
                    supplier_customer: "供应商 A".to_string(),
                    status: "待处理".to_string(),
                    order_date: now.clone(),
                    expected_date: next_month.clone(),
                    created_by: "采购员".to_string(),
                },
            ]),
            financial_records: Mutex::new(vec![
                FinancialRecord {
                    id: Uuid::new_v4().to_string(),
                    record_type: "收入".to_string(),
                    description: "产品销售订单".to_string(),
                    amount: 50000.0,
                    category: "销售收入".to_string(),
                    date: now.clone(),
                    reference_number: "INV-2026-001".to_string(),
                    created_by: "财务".to_string(),
                },
            ]),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
