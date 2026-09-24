use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaterialBomsQuery {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaterialIssuesQuery {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListMaterialReturnsQuery {
    pub page: Option<i32>,
    pub page_size: Option<i32>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialBomResponse {
    pub id: String,
    pub bom_no: String,
    pub product_id: Option<String>,
    pub product_name: String,
    pub product_code: String,
    pub version: String,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BomItemResponse {
    pub id: String,
    pub bom_id: String,
    pub material_id: Option<String>,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub quantity: f64,
    pub loss_rate: f64,
    pub sequence: i32,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BomDetailResponse {
    pub bom: MaterialBomResponse,
    pub items: Vec<BomItemResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListMaterialBomsResponse {
    pub boms: Vec<MaterialBomResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialIssueResponse {
    pub id: String,
    pub issue_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub bom_id: Option<String>,
    pub status: String,
    pub warehouse_id: Option<String>,
    pub operator_id: Option<String>,
    pub issue_time: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListMaterialIssuesResponse {
    pub issues: Vec<MaterialIssueResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialIssueItemResponse {
    pub id: String,
    pub issue_id: String,
    pub material_id: Option<String>,
    pub material_code: String,
    pub material_name: String,
    pub unit: String,
    pub planned_quantity: f64,
    pub actual_quantity: f64,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialReturnResponse {
    pub id: String,
    pub return_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub status: String,
    pub warehouse_id: Option<String>,
    pub operator_id: Option<String>,
    pub return_time: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListMaterialReturnsResponse {
    pub returns: Vec<MaterialReturnResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaterialBomRequest {
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub version: Option<String>,
    pub description: Option<String>,
    pub items: Vec<CreateBomItemRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateBomItemRequest {
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub unit: String,
    pub quantity: f64,
    pub loss_rate: Option<f64>,
    pub sequence: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaterialBomRequest {
    pub version: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub items: Option<Vec<CreateBomItemRequest>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaterialIssueRequest {
    pub order_id: Option<Uuid>,
    pub bom_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
    pub items: Vec<CreateIssueItemRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateIssueItemRequest {
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub unit: String,
    pub planned_quantity: f64,
    pub actual_quantity: f64,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMaterialReturnRequest {
    pub order_id: Option<Uuid>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
    pub items: Vec<CreateReturnItemRequest>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaterialIssueRequest {
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMaterialReturnRequest {
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub operator_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateReturnItemRequest {
    pub material_id: Option<Uuid>,
    pub material_code: String,
    pub material_name: String,
    pub unit: String,
    pub quantity: f64,
    pub reason: Option<String>,
    pub batch_no: Option<String>,
    pub notes: Option<String>,
}
