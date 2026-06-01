use sqlx::PgPool;
use crate::models::*;
use chrono::{Utc, NaiveDate};
use uuid::Uuid;
use rust_decimal::Decimal;
use std::str::FromStr;

pub struct Repository;

impl Repository {
    pub async fn get_all_production_plans(pool: &PgPool) -> sqlx::Result<Vec<ProductionPlan>> {
        let rows = sqlx::query("SELECT * FROM production_plans ORDER BY created_at DESC")
            .fetch_all(pool)
            .await?;
        
        rows.iter().map(|row| ProductionPlan::from_row(row)).collect()
    }

    pub async fn create_production_plan(
        pool: &PgPool,
        request: CreateProductionPlanRequest,
    ) -> sqlx::Result<ProductionPlan> {
        let id = Uuid::new_v4();
        let start_date = NaiveDate::parse_from_str(&request.start_date, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Local::now().date_naive());
        let end_date = NaiveDate::parse_from_str(&request.end_date, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Local::now().date_naive());
        let now = Utc::now().naive_utc();

        let plan = ProductionPlan {
            id,
            product_name: request.product_name,
            product_code: request.product_code,
            planned_quantity: request.planned_quantity,
            actual_quantity: 0,
            start_date,
            end_date,
            status: "计划中".to_string(),
            created_by: request.created_by,
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            "INSERT INTO production_plans (id, product_name, product_code, planned_quantity, actual_quantity, start_date, end_date, status, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"
        )
        .bind(plan.id)
        .bind(&plan.product_name)
        .bind(&plan.product_code)
        .bind(plan.planned_quantity)
        .bind(plan.actual_quantity)
        .bind(plan.start_date)
        .bind(plan.end_date)
        .bind(&plan.status)
        .bind(&plan.created_by)
        .bind(plan.created_at)
        .bind(plan.updated_at)
        .execute(pool)
        .await?;

        Ok(plan)
    }

    pub async fn get_all_supply_chain_orders(pool: &PgPool) -> sqlx::Result<Vec<SupplyChainOrder>> {
        let rows = sqlx::query("SELECT * FROM supply_chain_orders ORDER BY created_at DESC")
            .fetch_all(pool)
            .await?;
        
        rows.iter().map(|row| SupplyChainOrder::from_row(row)).collect()
    }

    pub async fn create_supply_chain_order(
        pool: &PgPool,
        request: CreateSupplyChainOrderRequest,
    ) -> sqlx::Result<SupplyChainOrder> {
        let id = Uuid::new_v4();
        let order_date = NaiveDate::parse_from_str(&request.order_date, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Local::now().date_naive());
        let delivery_date = request.delivery_date.and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok());
        let unit_price = Decimal::from_str(&request.unit_price).unwrap_or(Decimal::ZERO);
        let quantity = request.quantity;
        let total_amount = unit_price * Decimal::from(quantity);
        let now = Utc::now().naive_utc();

        let order = SupplyChainOrder {
            id,
            order_type: request.order_type,
            supplier_customer: request.supplier_customer,
            product_name: request.product_name,
            quantity,
            unit_price,
            total_amount,
            order_date,
            delivery_date,
            status: "待处理".to_string(),
            created_by: request.created_by,
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            "INSERT INTO supply_chain_orders (id, order_type, supplier_customer, product_name, quantity, unit_price, total_amount, order_date, delivery_date, status, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"
        )
        .bind(order.id)
        .bind(&order.order_type)
        .bind(&order.supplier_customer)
        .bind(&order.product_name)
        .bind(order.quantity)
        .bind(order.unit_price)
        .bind(order.total_amount)
        .bind(order.order_date)
        .bind(order.delivery_date)
        .bind(&order.status)
        .bind(&order.created_by)
        .bind(order.created_at)
        .bind(order.updated_at)
        .execute(pool)
        .await?;

        Ok(order)
    }

    pub async fn get_all_financial_records(pool: &PgPool) -> sqlx::Result<Vec<FinancialRecord>> {
        let rows = sqlx::query("SELECT * FROM financial_records ORDER BY created_at DESC")
            .fetch_all(pool)
            .await?;
        
        rows.iter().map(|row| FinancialRecord::from_row(row)).collect()
    }

    pub async fn create_financial_record(
        pool: &PgPool,
        request: CreateFinancialRecordRequest,
    ) -> sqlx::Result<FinancialRecord> {
        let id = Uuid::new_v4();
        let transaction_date = NaiveDate::parse_from_str(&request.transaction_date, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Local::now().date_naive());
        let amount = Decimal::from_str(&request.amount).unwrap_or(Decimal::ZERO);
        let now = Utc::now().naive_utc();

        let record = FinancialRecord {
            id,
            record_type: request.record_type,
            category: request.category,
            amount,
            description: request.description,
            transaction_date,
            payment_method: request.payment_method,
            status: "待处理".to_string(),
            created_by: request.created_by,
            created_at: now,
            updated_at: now,
        };

        sqlx::query(
            "INSERT INTO financial_records (id, record_type, category, amount, description, transaction_date, payment_method, status, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"
        )
        .bind(record.id)
        .bind(&record.record_type)
        .bind(&record.category)
        .bind(record.amount)
        .bind(&record.description)
        .bind(record.transaction_date)
        .bind(&record.payment_method)
        .bind(&record.status)
        .bind(&record.created_by)
        .bind(record.created_at)
        .bind(record.updated_at)
        .execute(pool)
        .await?;

        Ok(record)
    }

    pub fn validate_production_plan(request: &CreateProductionPlanRequest) -> Result<(), String> {
        if request.product_name.is_empty() {
            return Err("产品名称不能为空".to_string());
        }
        if request.product_code.is_empty() {
            return Err("产品代码不能为空".to_string());
        }
        if request.planned_quantity <= 0 {
            return Err("计划数量必须大于0".to_string());
        }
        if request.start_date.is_empty() {
            return Err("开始日期不能为空".to_string());
        }
        if request.end_date.is_empty() {
            return Err("结束日期不能为空".to_string());
        }
        Ok(())
    }

    pub fn validate_supply_chain_order(request: &CreateSupplyChainOrderRequest) -> Result<(), String> {
        if request.order_type.is_empty() {
            return Err("订单类型不能为空".to_string());
        }
        if request.product_name.is_empty() {
            return Err("产品名称不能为空".to_string());
        }
        if request.quantity <= 0 {
            return Err("数量必须大于0".to_string());
        }
        if request.supplier_customer.is_empty() {
            return Err("供应商/客户不能为空".to_string());
        }
        Ok(())
    }

    pub fn validate_financial_record(request: &CreateFinancialRecordRequest) -> Result<(), String> {
        if request.record_type.is_empty() {
            return Err("记录类型不能为空".to_string());
        }
        if request.category.is_empty() {
            return Err("分类不能为空".to_string());
        }
        Ok(())
    }
}
