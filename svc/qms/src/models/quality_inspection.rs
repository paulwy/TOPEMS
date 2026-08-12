//! Quality Inspection DTOs

use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InspectionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub inspection_type: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListInspectionsResponse {
    pub inspections: Vec<Inspection>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Inspection {
    pub id: String,
    pub tenant_id: String,
    pub inspection_no: String,
    pub inspection_type: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub standard_id: Option<Uuid>,
    pub quantity: BigDecimal,
    pub qualified_quantity: Option<BigDecimal>,
    pub unqualified_quantity: Option<BigDecimal>,
    pub qualification_rate: Option<BigDecimal>,
    pub status: Option<String>,
    pub inspector: Option<String>,
    pub assignee: Option<String>,
    pub inspected_at: Option<String>,
    pub result: Option<String>,
    pub memo: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateInspectionRequest {
    pub inspection_type: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub standard_id: Option<String>,
    pub quantity: BigDecimal,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AssignInspectionRequest {
    pub assignee: String,
    pub operator: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SubmitInspectionResultRequest {
    pub qualified_quantity: BigDecimal,
    pub unqualified_quantity: BigDecimal,
    pub qualification_rate: Option<BigDecimal>,
    pub result: Option<String>,
    pub memo: Option<String>,
    pub inspector: String,
    pub results: Option<Vec<InspectionResultItem>>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct InspectionResultItem {
    pub item_name: String,
    pub standard_value: Option<String>,
    pub measured_value: Option<String>,
    pub is_qualified: bool,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditInspectionRequest {
    pub action: String,
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateInspectionRequest {
    pub inspection_type: Option<String>,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub standard_id: Option<String>,
    pub quantity: Option<BigDecimal>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct InspectionAudit {
    pub id: String,
    pub tenant_id: String,
    pub inspection_id: String,
    pub status_from: String,
    pub status_to: String,
    pub action: String,
    pub operator: String,
    pub comment: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InspectionResult {
    pub id: String,
    pub tenant_id: String,
    pub inspection_id: String,
    pub item_name: String,
    pub standard_value: Option<String>,
    pub measured_value: Option<String>,
    pub is_qualified: bool,
    pub remark: Option<String>,
    pub created_at: Option<String>,
}
