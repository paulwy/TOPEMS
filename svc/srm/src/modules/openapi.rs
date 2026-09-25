// SRM 服务 OpenAPI 文档
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Supplier {
    pub id: Uuid,
    pub name: String,
    pub category: Option<String>,
    pub contact: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierCategory {
    pub id: Uuid,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierEvaluation {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub score: f64,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub comment: Option<String>,
    pub evaluator_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierContract {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub contract_no: String,
    pub amount: f64,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierProduct {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub price: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
}

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::modules::supplier::list_suppliers,
        crate::modules::supplier::create_supplier,
        crate::modules::supplier::get_supplier,
        crate::modules::supplier::update_supplier,
        crate::modules::supplier::delete_supplier,
        // Inquiry
        crate::modules::inquiry::list_inquiries,
        crate::modules::inquiry::get_inquiry,
        crate::modules::inquiry::create_inquiry,
        crate::modules::supplier_contract::list_contracts,
        crate::modules::supplier_contract::get_contract,
        crate::modules::supplier_contract::get_contract_terms,
        crate::modules::supplier_portal::get_supplier_portal_stats,
        crate::modules::supplier_portal::get_supplier_portal_orders,
        crate::modules::supplier_portal::get_supplier_portal_invoices,
        crate::modules::supplier_portal::get_supplier_portal_deliveries,
        crate::modules::supplier_portal::get_supplier_portal_announcements,
        crate::modules::purchase_order::list_purchase_orders,
        crate::modules::purchase_order::get_purchase_order,
        crate::modules::bid_price::list_bid_requests,
        crate::modules::bid_price::get_bid_request,
        crate::modules::bid_price::get_bid_request_bids,
        crate::modules::bid_price::get_bid,
        crate::modules::bid_price::get_bid_comparison,
        crate::modules::supplier_category::list_categories,
        crate::modules::supplier_category::get_category,
        crate::modules::inquiry::list_inquiries,
        crate::modules::inquiry::get_inquiry,
        crate::modules::inquiry::create_inquiry,
        crate::modules::inquiry::publish_inquiry,
        crate::modules::inquiry::close_inquiry,
        crate::modules::quotation::list_quotations,
        crate::modules::quotation::get_quotation,
        crate::modules::quotation::award_quotation,
        crate::modules::quotation::reject_quotation,
        crate::modules::data_sync::sync_supplier_from_scm,
        crate::modules::data_sync::sync_all_suppliers_from_scm,
        crate::modules::data_sync::sync_supplier_to_scm,
        crate::modules::data_sync::sync_all_suppliers_to_scm,
        crate::modules::data_sync::get_sync_logs,
        crate::modules::supplier_performance::get_performance_reports,
        crate::modules::supplier_performance::get_performance_report,
        crate::modules::supplier_performance::compare_supplier_performance,
        crate::modules::supplier_performance::get_performance_trend,
        crate::modules::supplier_performance::get_top_suppliers,
        crate::modules::supplier_performance::export_performance_report,
        crate::modules::supplier_performance::get_score_level_distribution,
        crate::modules::supplier_performance::get_performance_summary,
        crate::modules::scoring_dimension::list_dimensions,
        crate::modules::scoring_dimension::list_active_dimensions,
        crate::modules::scoring_dimension::get_dimension,
        crate::modules::statistics::get_statistics,
        crate::modules::statistics::get_detailed_statistics,
        crate::modules::statistics::get_suppliers_with_stats,
        crate::modules::supplier::list_suppliers,
        crate::modules::supplier::create_supplier,
        crate::modules::supplier::get_supplier,
        crate::modules::supplier::update_supplier,
        crate::modules::supplier::delete_supplier,
        crate::modules::supplier::get_supplier_products,
        crate::modules::supplier::get_supplier_contracts,
        crate::modules::supplier::get_supplier_performance,
        crate::modules::supplier::start_supplier_approval,
        crate::modules::supplier::approve_supplier,
        crate::modules::supplier::reject_supplier,
        crate::modules::supplier_evaluation::list_evaluations,
        crate::modules::supplier_evaluation::get_evaluation,
        crate::modules::supplier_evaluation::get_evaluation_history,
        crate::modules::supplier_evaluation::get_score_trend,
        crate::modules::supplier_evaluation::get_evaluation_statistics,
        crate::modules::bidding::list_biddings,
        crate::modules::bidding::get_bidding,
        crate::modules::bidding::publish_bidding,
        crate::modules::bidding::open_bidding,
        crate::modules::bidding::evaluate_bidding,
        crate::modules::bidding::award_bidding,
        crate::modules::bidding::list_bidding_suppliers,
        crate::modules::supplier_product::list_products,
        crate::modules::supplier_product::get_product,
        crate::modules::tender::list_tenders,
        crate::modules::tender::get_tender,
        crate::modules::tender::get_tender_bids,
        crate::modules::tender::award_tender,
        crate::modules::tender::list_tender_awards,
    ),
    components(
        schemas(
            Supplier,
            SupplierCategory,
            SupplierEvaluation,
            SupplierContract,
            SupplierProduct,
        ),
    ),
    tags(
        (name = "supplier", description = "供应商管理 API"),
        (name = "inquiry", description = "询价单 API"),
        (name = "supplier_category", description = "供应商分类 API"),
        (name = "supplier_evaluation", description = "供应商评价 API"),
        (name = "supplier_contract", description = "供应商合同 API"),
        (name = "supplier_product", description = "供应商产品 API"),
        (name = "SRM/supplier_contract", description = "SRM/supplier_contract 接口"),
        (name = "SRM/supplier_portal", description = "SRM/supplier_portal 接口"),
        (name = "SRM/purchase_order", description = "SRM/purchase_order 接口"),
        (name = "SRM/bid_price", description = "SRM/bid_price 接口"),
        (name = "SRM/supplier_category", description = "SRM/supplier_category 接口"),
        (name = "SRM/inquiry", description = "SRM/inquiry 接口"),
        (name = "SRM/quotation", description = "SRM/quotation 接口"),
        (name = "SRM/data_sync", description = "SRM/data_sync 接口"),
        (name = "SRM/supplier_performance", description = "SRM/supplier_performance 接口"),
        (name = "SRM/scoring_dimension", description = "SRM/scoring_dimension 接口"),
        (name = "SRM/statistics", description = "SRM/statistics 接口"),
        (name = "SRM/supplier", description = "SRM/supplier 接口"),
        (name = "SRM/supplier_evaluation", description = "SRM/supplier_evaluation 接口"),
        (name = "SRM/bidding", description = "SRM/bidding 接口"),
        (name = "SRM/supplier_product", description = "SRM/supplier_product 接口"),
        (name = "SRM/tender", description = "SRM/tender 接口"),
    ),
    info(
        title = "TOPEMS SRM API",
        version = "1.0.0",
        description = "供应商关系管理系统 API"
    )
)]
pub struct SrmApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_supplier() -> Supplier {
        Supplier {
            id: Uuid::new_v4(),
            name: "Test Supplier".to_string(),
            category: Some("Electronics".to_string()),
            contact: Some("John Doe".to_string()),
            phone: Some("13800138000".to_string()),
            email: Some("john@test.com".to_string()),
            status: "active".to_string(),
            created_at: Utc::now(),
        }
    }

    fn sample_category() -> SupplierCategory {
        SupplierCategory {
            id: Uuid::new_v4(),
            name: "Electronics".to_string(),
            parent_id: Some(Uuid::new_v4()),
            description: Some("Electronic components".to_string()),
        }
    }

    fn sample_evaluation() -> SupplierEvaluation {
        SupplierEvaluation {
            id: Uuid::new_v4(),
            supplier_id: Uuid::new_v4(),
            score: 85.5,
            quality_score: Some(90.0),
            delivery_score: Some(80.0),
            service_score: Some(85.0),
            comment: Some("Good supplier".to_string()),
            evaluator_id: Uuid::new_v4(),
            created_at: Utc::now(),
        }
    }

    fn sample_contract() -> SupplierContract {
        SupplierContract {
            id: Uuid::new_v4(),
            supplier_id: Uuid::new_v4(),
            contract_no: "SC-2026-001".to_string(),
            amount: 50000.0,
            start_date: Some(Utc::now()),
            end_date: Some(Utc::now()),
            status: "active".to_string(),
            created_at: Utc::now(),
        }
    }

    fn sample_product() -> SupplierProduct {
        SupplierProduct {
            id: Uuid::new_v4(),
            supplier_id: Uuid::new_v4(),
            name: "Widget".to_string(),
            code: Some("W-001".to_string()),
            price: Some(99.99),
            unit: Some("piece".to_string()),
            status: "active".to_string(),
        }
    }

    #[test]
    fn test_supplier_serde_roundtrip() {
        let s = sample_supplier();
        let json = serde_json::to_string(&s).unwrap();
        let deserialized: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, s.name);
        assert_eq!(deserialized.status, s.status);
    }

    #[test]
    fn test_supplier_clone() {
        let s = sample_supplier();
        let cloned = s.clone();
        assert_eq!(cloned.name, s.name);
    }

    #[test]
    fn test_supplier_json_field_names() {
        let s = sample_supplier();
        let json = serde_json::to_value(&s).unwrap();
        assert!(json.get("name").is_some());
        assert!(json.get("created_at").is_some());
    }

    #[test]
    fn test_supplier_category_serde_roundtrip() {
        let c = sample_category();
        let json = serde_json::to_string(&c).unwrap();
        let deserialized: SupplierCategory = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, c.name);
    }

    #[test]
    fn test_supplier_category_clone() {
        let c = sample_category();
        let cloned = c.clone();
        assert_eq!(cloned.name, c.name);
    }

    #[test]
    fn test_supplier_evaluation_serde_roundtrip() {
        let e = sample_evaluation();
        let json = serde_json::to_string(&e).unwrap();
        let deserialized: SupplierEvaluation = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.score, e.score);
        assert_eq!(deserialized.comment, e.comment);
    }

    #[test]
    fn test_supplier_evaluation_clone() {
        let e = sample_evaluation();
        let cloned = e.clone();
        assert_eq!(cloned.score, e.score);
    }

    #[test]
    fn test_supplier_evaluation_json_field_names() {
        let e = sample_evaluation();
        let json = serde_json::to_value(&e).unwrap();
        assert!(json.get("supplier_id").is_some());
        assert!(json.get("quality_score").is_some());
    }

    #[test]
    fn test_supplier_contract_serde_roundtrip() {
        let c = sample_contract();
        let json = serde_json::to_string(&c).unwrap();
        let deserialized: SupplierContract = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.contract_no, c.contract_no);
        assert_eq!(deserialized.amount, c.amount);
    }

    #[test]
    fn test_supplier_contract_clone() {
        let c = sample_contract();
        let cloned = c.clone();
        assert_eq!(cloned.contract_no, c.contract_no);
    }

    #[test]
    fn test_supplier_product_serde_roundtrip() {
        let p = sample_product();
        let json = serde_json::to_string(&p).unwrap();
        let deserialized: SupplierProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, p.name);
        assert_eq!(deserialized.code, p.code);
    }

    #[test]
    fn test_supplier_product_clone() {
        let p = sample_product();
        let cloned = p.clone();
        assert_eq!(cloned.name, p.name);
    }

    #[test]
    fn test_supplier_product_json_field_names() {
        let p = sample_product();
        let json = serde_json::to_value(&p).unwrap();
        assert!(json.get("supplier_id").is_some());
        assert!(json.get("price").is_some());
    }

    #[test]
    fn test_supplier_from_json() {
        let json_str = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "JSON Supplier",
            "category": null,
            "contact": null,
            "phone": null,
            "email": null,
            "status": "pending",
            "created_at": "2026-01-01T00:00:00Z"
        }"#;
        let s: Supplier = serde_json::from_str(json_str).unwrap();
        assert_eq!(s.name, "JSON Supplier");
        assert_eq!(s.status, "pending");
    }

    #[test]
    fn test_supplier_evaluation_score_value() {
        let e = sample_evaluation();
        assert_eq!(e.score, 85.5);
    }

    #[test]
    fn test_supplier_contract_amount_value() {
        let c = sample_contract();
        assert_eq!(c.amount, 50000.0);
    }
}
