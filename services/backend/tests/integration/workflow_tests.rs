#[cfg(test)]
mod workflow_tests {
    use topems_erp::db::repository::Repository;
    use topems_erp::models::*;

    #[test]
    fn test_production_plan_workflow() {
        let repo = Repository::new();
        
        let plan = CreateProductionPlanRequest {
            product_name: "Test Product".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let validation_result = repo.validate_production_plan(&plan);
        assert!(validation_result.is_ok());
    }

    #[test]
    fn test_supply_chain_order_workflow() {
        let repo = Repository::new();
        
        let order = CreateSupplyChainOrderRequest {
            order_type: "采购".to_string(),
            material_name: "Test Material".to_string(),
            quantity: 500,
            supplier_customer: "Test Supplier".to_string(),
            expected_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let validation_result = repo.validate_supply_chain_order(&order);
        assert!(validation_result.is_ok());
    }

    #[test]
    fn test_financial_record_workflow() {
        let repo = Repository::new();
        
        let record = CreateFinancialRecordRequest {
            record_type: "收入".to_string(),
            description: "Test Description".to_string(),
            amount: 1000.0,
            category: "销售收入".to_string(),
            reference_number: "INV-001".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let validation_result = repo.validate_financial_record(&record);
        assert!(validation_result.is_ok());
    }
}
