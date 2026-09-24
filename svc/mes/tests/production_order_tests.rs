use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use topems_mes::modules::production_order::{
    CreateFromErpRequest, ErpSalesOrderInfo, ProductionOrderSource,
};

#[test]
fn test_production_order_source_enum() {
    assert_eq!(ProductionOrderSource::Manual.to_string(), "manual");
    assert_eq!(
        ProductionOrderSource::ErpSalesOrder.to_string(),
        "erp_sales_order"
    );
    assert_eq!(ProductionOrderSource::Mrp.to_string(), "mrp");
}

#[test]
fn test_production_order_source_serialization() {
    let sources = vec![
        (ProductionOrderSource::Manual, "manual"),
        (ProductionOrderSource::ErpSalesOrder, "erp_sales_order"),
        (ProductionOrderSource::Mrp, "mrp"),
    ];

    for (source, expected) in sources {
        let json = serde_json::to_string(&source).unwrap();
        assert_eq!(json, format!("\"{}\"", expected));

        let deserialized: ProductionOrderSource = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.to_string(), expected);
    }
}

#[test]
fn test_erp_sales_order_info_creation() {
    let order = ErpSalesOrderInfo {
        order_id: Uuid::new_v4(),
        order_number: "SO-2024-0001".to_string(),
        customer_name: "客户A".to_string(),
        product_name: "产品A".to_string(),
        product_code: "PROD-A-001".to_string(),
        quantity: 100.0,
        unit: "件".to_string(),
        delivery_date: Some(Utc::now()),
        priority: Some(1),
    };

    assert_eq!(order.order_number, "SO-2024-0001");
    assert_eq!(order.customer_name, "客户A");
    assert_eq!(order.product_name, "产品A");
    assert!(order.quantity > 0.0);
    assert!(order.delivery_date.is_some());
}

#[test]
fn test_erp_sales_order_info_serialization() {
    let order = ErpSalesOrderInfo {
        order_id: Uuid::parse_str("12345678-1234-5678-1234-567812345678").unwrap(),
        order_number: "SO-TEST-001".to_string(),
        customer_name: "测试客户".to_string(),
        product_name: "测试产品".to_string(),
        product_code: "TEST-001".to_string(),
        quantity: 50.0,
        unit: "个".to_string(),
        delivery_date: None,
        priority: None,
    };

    let json = serde_json::to_string(&order).unwrap();
    let deserialized: ErpSalesOrderInfo = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.order_id, order.order_id);
    assert_eq!(deserialized.order_number, order.order_number);
    assert_eq!(deserialized.customer_name, order.customer_name);
    assert_eq!(deserialized.quantity, order.quantity);
}

#[test]
fn test_create_from_erp_request_creation() {
    let request = CreateFromErpRequest {
        erp_order: ErpSalesOrderInfo {
            order_id: Uuid::new_v4(),
            order_number: "SO-2024-0002".to_string(),
            customer_name: "客户B".to_string(),
            product_name: "产品B".to_string(),
            product_code: "PROD-B-001".to_string(),
            quantity: 200.0,
            unit: "件".to_string(),
            delivery_date: Some(
                DateTime::parse_from_rfc3339("2024-12-31T23:59:59Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            priority: Some(2),
        },
        planned_start_date: Some(
            DateTime::parse_from_rfc3339("2024-12-01T08:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        ),
        planned_completion_date: Some(
            DateTime::parse_from_rfc3339("2024-12-20T18:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        ),
        workshop_id: Some(Uuid::new_v4()),
        notes: Some("紧急订单".to_string()),
    };

    assert_eq!(request.erp_order.order_number, "SO-2024-0002");
    assert!(request.planned_start_date.is_some());
    assert!(request.planned_completion_date.is_some());
    assert!(request.workshop_id.is_some());
    assert!(request.notes.is_some());
}

#[test]
fn test_create_from_erp_request_optional_fields() {
    let request = CreateFromErpRequest {
        erp_order: ErpSalesOrderInfo {
            order_id: Uuid::new_v4(),
            order_number: "SO-2024-0003".to_string(),
            customer_name: "客户C".to_string(),
            product_name: "产品C".to_string(),
            product_code: "PROD-C-001".to_string(),
            quantity: 50.0,
            unit: "个".to_string(),
            delivery_date: None,
            priority: None,
        },
        planned_start_date: None,
        planned_completion_date: None,
        workshop_id: None,
        notes: None,
    };

    assert!(request.planned_start_date.is_none());
    assert!(request.planned_completion_date.is_none());
    assert!(request.workshop_id.is_none());
    assert!(request.notes.is_none());
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProductionOrderQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[test]
fn test_production_order_query_defaults() {
    let query = ProductionOrderQuery {
        page: None,
        page_size: None,
        search: None,
        status: None,
    };

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    assert_eq!(page, 1);
    assert_eq!(page_size, 10);
    assert_eq!(offset, 0);
}

#[test]
fn test_production_order_query_custom() {
    let query = ProductionOrderQuery {
        page: Some(5),
        page_size: Some(20),
        search: Some("PROD-A".to_string()),
        status: Some("in_progress".to_string()),
    };

    assert_eq!(query.page.unwrap(), 5);
    assert_eq!(query.page_size.unwrap(), 20);
    assert_eq!(query.search.unwrap(), "PROD-A");
    assert_eq!(query.status.unwrap(), "in_progress");
}

#[test]
fn test_production_order_query_serialization() {
    let query = ProductionOrderQuery {
        page: Some(3),
        page_size: Some(15),
        search: Some("测试搜索".to_string()),
        status: Some("pending".to_string()),
    };

    let json = serde_json::to_string(&query).unwrap();
    let deserialized: ProductionOrderQuery = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.page, query.page);
    assert_eq!(deserialized.page_size, query.page_size);
    assert_eq!(deserialized.search, query.search);
    assert_eq!(deserialized.status, query.status);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProductionOrderStatusTransition {
    from: String,
    to: String,
    allowed: bool,
}

#[test]
fn test_production_order_status_transitions() {
    let transitions = vec![
        ProductionOrderStatusTransition {
            from: "pending".to_string(),
            to: "released".to_string(),
            allowed: true,
        },
        ProductionOrderStatusTransition {
            from: "released".to_string(),
            to: "in_progress".to_string(),
            allowed: true,
        },
        ProductionOrderStatusTransition {
            from: "in_progress".to_string(),
            to: "completed".to_string(),
            allowed: true,
        },
        ProductionOrderStatusTransition {
            from: "in_progress".to_string(),
            to: "paused".to_string(),
            allowed: true,
        },
        ProductionOrderStatusTransition {
            from: "paused".to_string(),
            to: "in_progress".to_string(),
            allowed: true,
        },
        ProductionOrderStatusTransition {
            from: "in_progress".to_string(),
            to: "cancelled".to_string(),
            allowed: true,
        },
        ProductionOrderStatusTransition {
            from: "cancelled".to_string(),
            to: "pending".to_string(),
            allowed: false,
        },
        ProductionOrderStatusTransition {
            from: "completed".to_string(),
            to: "in_progress".to_string(),
            allowed: false,
        },
    ];

    for transition in transitions {
        assert!(!transition.from.is_empty());
        assert!(!transition.to.is_empty());
    }
}

#[test]
fn test_production_order_progress_calculation() {
    let total_quantity = 1000.0;
    let completed_quantity = 300.0;
    let progress = (completed_quantity / total_quantity) * 100.0;

    assert_eq!(progress, 30.0);

    let completed_quantity = 1000.0;
    let full_progress = (completed_quantity / total_quantity) * 100.0;
    assert_eq!(full_progress, 100.0);

    let completed_quantity = 0.0;
    let zero_progress = (completed_quantity / total_quantity) * 100.0;
    assert_eq!(zero_progress, 0.0);
}

#[test]
fn test_production_order_pagination_calculation() {
    let page = 3;
    let page_size = 25;
    let offset = (page - 1) * page_size;

    assert_eq!(offset, 50);

    let page = 1;
    let offset = (page - 1) * page_size;
    assert_eq!(offset, 0);

    let page = 10;
    let page_size = 50;
    let offset = (page - 1) * page_size;
    assert_eq!(offset, 450);
}
