use topems_erp::api::response::*;
use topems_erp::models::*;

#[cfg(test)]
mod api_handler_tests {
    use super::*;

    #[test]
    fn test_api_response_success() {
        let response: ApiResponse<String> = ApiResponse {
            success: true,
            data: Some("test data".to_string()),
            message: "Success".to_string(),
        };
        
        assert!(response.success);
        assert_eq!(response.data, Some("test data".to_string()));
        assert_eq!(response.message, "Success");
    }

    #[test]
    fn test_api_response_error() {
        let response: ApiResponse<String> = ApiResponse {
            success: false,
            data: None,
            message: "Error occurred".to_string(),
        };
        
        assert!(!response.success);
        assert_eq!(response.data, None);
        assert_eq!(response.message, "Error occurred");
    }

    #[test]
    fn test_production_plan_creation() {
        let plan = ProductionPlan {
            id: "test-id".to_string(),
            product_name: "Test Product".to_string(),
            product_code: "TP-001".to_string(),
            planned_quantity: 100,
            start_date: "2026-01-01".to_string(),
            end_date: "2026-12-31".to_string(),
            status: "计划中".to_string(),
            created_by: "Test User".to_string(),
        };
        
        assert_eq!(plan.product_name, "Test Product");
        assert_eq!(plan.status, "计划中");
        assert_eq!(plan.planned_quantity, 100);
    }

    #[test]
    fn test_supply_chain_order_creation() {
        let order = SupplyChainOrder {
            id: "test-id".to_string(),
            order_type: "采购".to_string(),
            material_name: "Test Material".to_string(),
            quantity: 500,
            supplier_customer: "Test Supplier".to_string(),
            status: "待处理".to_string(),
            order_date: "2026-01-01".to_string(),
            expected_date: "2026-12-31".to_string(),
            created_by: "Test User".to_string(),
        };
        
        assert_eq!(order.material_name, "Test Material");
        assert_eq!(order.status, "待处理");
        assert_eq!(order.quantity, 500);
    }

    #[test]
    fn test_financial_record_creation() {
        let record = FinancialRecord {
            id: "test-id".to_string(),
            record_type: "收入".to_string(),
            description: "Test Description".to_string(),
            amount: 1000.50,
            category: "销售收入".to_string(),
            date: "2026-01-01".to_string(),
            reference_number: "INV-001".to_string(),
            created_by: "Test User".to_string(),
        };
        
        assert_eq!(record.amount, 1000.50);
        assert_eq!(record.category, "销售收入");
        assert_eq!(record.reference_number, "INV-001");
    }

    #[test]
    fn test_api_response_serialization() {
        let response = ApiResponse {
            success: true,
            data: Some("test".to_string()),
            message: "OK".to_string(),
        };
        
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"message\":\"OK\""));
    }

    #[test]
    fn test_api_response_deserialization() {
        let json = r#"{"success":true,"data":"test","message":"OK"}"#;
        let response: ApiResponse<String> = serde_json::from_str(json).unwrap();
        
        assert!(response.success);
        assert_eq!(response.data, Some("test".to_string()));
        assert_eq!(response.message, "OK");
    }
}
