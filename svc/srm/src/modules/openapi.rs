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
        // === srm_compat (OpenAPI-only) ===
        crate::modules::srm_compat::compat_get_api_srm_supplier_evaluations,
        crate::modules::srm_compat::compat_get_api_srm_supplier_evaluations_id,
        crate::modules::srm_compat::compat_post_api_srm_supplier_evaluations,
        crate::modules::srm_compat::compat_put_api_srm_supplier_evaluations_id,
        crate::modules::srm_compat::compat_delete_api_srm_supplier_evaluations_id,
        crate::modules::srm_compat::compat_get_api_srm_purchase_orders,
        crate::modules::srm_compat::compat_get_api_srm_purchase_orders_id,
        crate::modules::srm_compat::compat_post_api_srm_purchase_orders,
        crate::modules::srm_compat::compat_put_api_srm_purchase_orders_id,
        crate::modules::srm_compat::compat_delete_api_srm_purchase_orders_id,
        crate::modules::srm_compat::compat_get_api_srm_supplier_contracts,
        crate::modules::srm_compat::compat_get_api_srm_supplier_contracts_id,
        crate::modules::srm_compat::compat_post_api_srm_supplier_contracts,
        crate::modules::srm_compat::compat_put_api_srm_supplier_contracts_id,
        crate::modules::srm_compat::compat_delete_api_srm_supplier_contracts_id,
        crate::modules::srm_compat::compat_get_api_srm_statistics,
        crate::modules::srm_compat::compat_get_api_srm_statistics_detailed,
        crate::modules::srm_compat::compat_get_api_srm_suppliers_with_stats,
        crate::modules::srm_compat::compat_get_api_srm_scoring_dimensions,
        crate::modules::srm_compat::compat_get_api_srm_scoring_dimensions_active,
        crate::modules::srm_compat::compat_get_api_srm_scoring_dimensions_id,
        crate::modules::srm_compat::compat_post_api_srm_scoring_dimensions,
        crate::modules::srm_compat::compat_put_api_srm_scoring_dimensions_id,
        crate::modules::srm_compat::compat_delete_api_srm_scoring_dimensions_id,
        crate::modules::srm_compat::compat_get_api_srm_performance_reports,
        crate::modules::srm_compat::compat_get_api_srm_performance_reports_id,
        crate::modules::srm_compat::compat_get_api_srm_performance_summary,
        crate::modules::srm_compat::compat_get_api_srm_performance_score_level_distribution,
        crate::modules::srm_compat::compat_get_api_srm_performance_top_suppliers,
        crate::modules::srm_compat::compat_get_api_srm_performance_trend,
        crate::modules::srm_compat::compat_get_api_srm_performance_compare,
        crate::modules::srm_compat::compat_get_api_srm_health,
        crate::modules::srm_compat::compat_get_api_srm_supplier_portal_supplierid_stats,
        crate::modules::srm_compat::compat_get_api_srm_supplier_portal_supplierid_orders,
        crate::modules::srm_compat::compat_get_api_srm_supplier_portal_supplierid_invoices,
        crate::modules::srm_compat::compat_get_api_srm_supplier_portal_supplierid_deliveries,
        crate::modules::srm_compat::compat_get_api_srm_supplier_portal_announcements,
        crate::modules::srm_compat::compat_get_api_srm_inquiries,
        crate::modules::srm_compat::compat_get_api_srm_inquiries_id,
        crate::modules::srm_compat::compat_post_api_srm_inquiries,
        crate::modules::srm_compat::compat_put_api_srm_inquiries_id,
        crate::modules::srm_compat::compat_delete_api_srm_inquiries_id,
        crate::modules::srm_compat::compat_post_api_srm_inquiries_id_publish,
        crate::modules::srm_compat::compat_post_api_srm_inquiries_id_close,
        crate::modules::srm_compat::compat_get_api_srm_quotations_id,
        crate::modules::srm_compat::compat_post_api_srm_quotations,
        crate::modules::srm_compat::compat_put_api_srm_quotations_id,
        crate::modules::srm_compat::compat_post_api_srm_quotations_id_award,
        crate::modules::srm_compat::compat_post_api_srm_quotations_id_reject,
        crate::modules::srm_compat::compat_get_api_srm_biddings,
        crate::modules::srm_compat::compat_get_api_srm_biddings_id,
        crate::modules::srm_compat::compat_post_api_srm_biddings,
        crate::modules::srm_compat::compat_put_api_srm_biddings_id,
        crate::modules::srm_compat::compat_delete_api_srm_biddings_id,
        crate::modules::srm_compat::compat_post_api_srm_biddings_id_publish,
        crate::modules::srm_compat::compat_post_api_srm_biddings_id_open,
        crate::modules::srm_compat::compat_post_api_srm_biddings_id_evaluate,
        crate::modules::srm_compat::compat_post_api_srm_biddings_id_award,
        crate::modules::srm_compat::compat_get_api_srm_biddings_biddingid_suppliers,
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
        (name = "supplier_category", description = "供应商分类 API"),
        (name = "supplier_evaluation", description = "供应商评价 API"),
        (name = "supplier_contract", description = "供应商合同 API"),
        (name = "supplier_product", description = "供应商产品 API"),
        (name = "SRM-Compat", description = "SRM 前端兼容 OpenAPI 注解"),
    ),
    info(
        title = "TOPEMS SRM API",
        version = "1.0.0",
        description = "供应商关系管理系统 API"
    )
)]
pub struct SrmApiDoc;
