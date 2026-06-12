use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: Uuid,
    pub product_no: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub status: String,
    pub version: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub product_no: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub status: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductRequest {
    pub product_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ProductBOM {
    pub id: Uuid,
    pub product_id: Uuid,
    pub material_id: Uuid,
    pub material_name: String,
    pub quantity: f64,
    pub unit: String,
    pub parent_id: Option<Uuid>,
    pub level: i32,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductBOMRequest {
    pub product_id: String,
    pub material_id: String,
    pub material_name: String,
    pub quantity: f64,
    pub unit: String,
    pub parent_id: Option<String>,
    pub level: i32,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: Uuid,
    pub doc_no: String,
    pub name: String,
    pub description: Option<String>,
    pub product_id: Option<Uuid>,
    pub file_path: String,
    pub file_size: i64,
    pub file_type: String,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadDocumentRequest {
    pub doc_no: String,
    pub name: String,
    pub description: Option<String>,
    pub product_id: Option<String>,
    pub file_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DocumentVersion {
    pub id: Uuid,
    pub document_id: Uuid,
    pub version: String,
    pub changelog: Option<String>,
    pub file_path: String,
    pub file_size: i64,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDocumentVersionRequest {
    pub document_id: String,
    pub version: String,
    pub changelog: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Material {
    pub id: Uuid,
    pub material_no: String,
    pub name: String,
    pub category_id: Uuid,
    pub specification: Option<String>,
    pub unit: String,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMaterialRequest {
    pub material_no: String,
    pub name: String,
    pub category_id: String,
    pub specification: Option<String>,
    pub unit: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MaterialCategory {
    pub id: Uuid,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMaterialCategoryRequest {
    pub name: String,
    pub parent_id: Option<String>,
    pub description: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Version {
    pub id: Uuid,
    pub version_no: String,
    pub product_id: Uuid,
    pub description: Option<String>,
    pub status: String,
    pub release_date: Option<DateTime<Utc>>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVersionRequest {
    pub version_no: String,
    pub product_id: String,
    pub description: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Configuration {
    pub id: Uuid,
    pub config_key: String,
    pub config_value: String,
    pub description: Option<String>,
    pub product_id: Option<Uuid>,
    pub version_id: Option<Uuid>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConfigurationRequest {
    pub config_key: String,
    pub config_value: String,
    pub description: Option<String>,
    pub product_id: Option<String>,
    pub version_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompareConfigurationRequest {
    pub base_version_id: String,
    pub target_version_id: String,
}
