use topems_erp::db::repository::Repository;
use topems_erp::models::{
    CreateProductionPlanRequest, 
    CreateSupplyChainOrderRequest, 
    CreateFinancialRecordRequest
};

#[cfg(test)]
mod validation_tests {
    use super::*;

    #[test]
    fn test_validate_production_plan_valid() {
        let repo = Repository::new();
        let plan = CreateProductionPlanRequest {
            product_name: "Test Product".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_production_plan(&plan);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_production_plan_empty_name() {
        let repo = Repository::new();
        let plan = CreateProductionPlanRequest {
            product_name: "".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_production_plan(&plan);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Product name is required");
    }

    #[test]
    fn test_validate_production_plan_empty_code() {
        let repo = Repository::new();
        let plan = CreateProductionPlanRequest {
            product_name: "Test Product".to_string(),
            product_code: "".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_production_plan(&plan);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Product code is required");
    }

    #[test]
    fn test_validate_production_plan_invalid_quantity() {
        let repo = Repository::new();
        let plan = CreateProductionPlanRequest {
            product_name: "Test Product".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: 0,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_production_plan(&plan);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Planned quantity must be positive");
    }

    #[test]
    fn test_validate_production_plan_negative_quantity() {
        let repo = Repository::new();
        let plan = CreateProductionPlanRequest {
            product_name: "Test Product".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: -100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_production_plan(&plan);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Planned quantity must be positive");
    }

    #[test]
    fn test_validate_supply_chain_order_valid() {
        let repo = Repository::new();
        let order = CreateSupplyChainOrderRequest {
            order_type: "采购".to_string(),
            material_name: "Test Material".to_string(),
            quantity: 500,
            supplier_customer: "Test Supplier".to_string(),
            expected_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_supply_chain_order(&order);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_supply_chain_order_empty_material() {
        let repo = Repository::new();
        let order = CreateSupplyChainOrderRequest {
            order_type: "采购".to_string(),
            material_name: "".to_string(),
            quantity: 500,
            supplier_customer: "Test Supplier".to_string(),
            expected_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_supply_chain_order(&order);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Material name is required");
    }

    #[test]
    fn test_validate_supply_chain_order_invalid_quantity() {
        let repo = Repository::new();
        let order = CreateSupplyChainOrderRequest {
            order_type: "采购".to_string(),
            material_name: "Test Material".to_string(),
            quantity: -10,
            supplier_customer: "Test Supplier".to_string(),
            expected_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_supply_chain_order(&order);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Quantity must be positive");
    }

    #[test]
    fn test_validate_financial_record_valid() {
        let repo = Repository::new();
        let record = CreateFinancialRecordRequest {
            record_type: "收入".to_string(),
            description: "Test Description".to_string(),
            amount: 1000.50,
            category: "销售收入".to_string(),
            reference_number: "INV-001".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_financial_record(&record);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_financial_record_empty_description() {
        let repo = Repository::new();
        let record = CreateFinancialRecordRequest {
            record_type: "收入".to_string(),
            description: "".to_string(),
            amount: 1000.50,
            category: "销售收入".to_string(),
            reference_number: "INV-001".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_financial_record(&record);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Description is required");
    }

    #[test]
    fn test_validate_financial_record_invalid_amount() {
        let repo = Repository::new();
        let record = CreateFinancialRecordRequest {
            record_type: "收入".to_string(),
            description: "Test Description".to_string(),
            amount: 0.0,
            category: "销售收入".to_string(),
            reference_number: "INV-001".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_financial_record(&record);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Amount must be positive");
    }

    #[test]
    fn test_validate_financial_record_empty_category() {
        let repo = Repository::new();
        let record = CreateFinancialRecordRequest {
            record_type: "收入".to_string(),
            description: "Test Description".to_string(),
            amount: 1000.50,
            category: "".to_string(),
            reference_number: "INV-001".to_string(),
            created_by: "Test User".to_string(),
        };
        
        let result = repo.validate_financial_record(&record);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Category is required");
    }
}
