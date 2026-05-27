use topems_erp::db::repository::Repository;
use topems_erp::models::*;

#[cfg(test)]
mod repository_tests {
    use super::*;

    #[test]
    fn test_repository_creation() {
        let repo = Repository::new();
        assert!(std::mem::size_of_val(&repo) > 0);
    }

    #[test]
    fn test_repository_default() {
        let repo = Repository::default();
        assert!(std::mem::size_of_val(&repo) > 0);
    }

    #[test]
    fn test_production_plan_request_serialization() {
        let plan = CreateProductionPlanRequest {
            product_name: "Test".to_string(),
            product_code: "TC-001".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            created_by: "User".to_string(),
        };
        
        let json = serde_json::to_string(&plan).unwrap();
        assert!(json.contains("Test"));
        assert!(json.contains("TC-001"));
    }

    #[test]
    fn test_supply_chain_order_request_serialization() {
        let order = CreateSupplyChainOrderRequest {
            order_type: "采购".to_string(),
            material_name: "Material".to_string(),
            quantity: 500,
            supplier_customer: "Supplier".to_string(),
            expected_date: "2026-12-31".to_string(),
            created_by: "User".to_string(),
        };
        
        let json = serde_json::to_string(&order).unwrap();
        assert!(json.contains("Material"));
        assert!(json.contains("采购"));
    }

    #[test]
    fn test_financial_record_request_serialization() {
        let record = CreateFinancialRecordRequest {
            record_type: "收入".to_string(),
            description: "Description".to_string(),
            amount: 1000.0,
            category: "Category".to_string(),
            reference_number: "REF-001".to_string(),
            created_by: "User".to_string(),
        };
        
        let json = serde_json::to_string(&record).unwrap();
        assert!(json.contains("Description"));
        assert!(json.contains("Category"));
    }
}
