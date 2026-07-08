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
    ),
    info(
        title = "TOPEMS SRM API",
        version = "1.0.0",
        description = "供应商关系管理系统 API"
    )
)]
pub struct SrmApiDoc;
