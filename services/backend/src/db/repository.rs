use crate::models::*;

pub struct Repository;

impl Repository {
    pub fn new() -> Self {
        Repository
    }

    pub fn validate_production_plan(plan: &CreateProductionPlanRequest) -> Result<(), String> {
        if plan.product_name.is_empty() {
            return Err("Product name is required".to_string());
        }
        if plan.product_code.is_empty() {
            return Err("Product code is required".to_string());
        }
        if plan.planned_quantity <= 0 {
            return Err("Planned quantity must be positive".to_string());
        }
        if plan.start_date.is_empty() || plan.end_date.is_empty() {
            return Err("Start date and end date are required".to_string());
        }
        Ok(())
    }

    pub fn validate_supply_chain_order(order: &CreateSupplyChainOrderRequest) -> Result<(), String> {
        if order.material_name.is_empty() {
            return Err("Material name is required".to_string());
        }
        if order.quantity <= 0 {
            return Err("Quantity must be positive".to_string());
        }
        if order.supplier_customer.is_empty() {
            return Err("Supplier/customer is required".to_string());
        }
        Ok(())
    }

    pub fn validate_financial_record(record: &CreateFinancialRecordRequest) -> Result<(), String> {
        if record.description.is_empty() {
            return Err("Description is required".to_string());
        }
        if record.amount <= 0.0 {
            return Err("Amount must be positive".to_string());
        }
        if record.category.is_empty() {
            return Err("Category is required".to_string());
        }
        Ok(())
    }
}

impl Default for Repository {
    fn default() -> Self {
        Self::new()
    }
}
