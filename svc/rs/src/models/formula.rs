use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Formula {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub version: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub status: String,
    pub approval_status: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub effective_date: Option<DateTime<Utc>>,
    pub expiration_date: Option<DateTime<Utc>>,
    pub ingredients: serde_json::Value,
    pub process_steps: Option<String>,
    pub properties: serde_json::Value,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulaIngredient {
    pub name: String,
    pub quantity: f64,
    pub unit: Option<String>,
    pub purity: Option<String>,
    pub supplier: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulaRequest {
    pub name: String,
    pub code: String,
    pub version: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub status: Option<String>,
    pub ingredients: Option<Vec<FormulaIngredient>>,
    pub process_steps: Option<String>,
    pub effective_date: Option<String>,
    pub expiration_date: Option<String>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFormulaRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub approval_status: Option<String>,
    pub ingredients: Option<Vec<FormulaIngredient>>,
    pub process_steps: Option<String>,
    pub effective_date: Option<String>,
    pub expiration_date: Option<String>,
    pub properties: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FormulaVersion {
    pub id: Uuid,
    pub formula_id: Uuid,
    pub version: String,
    pub ingredients: serde_json::Value,
    pub process_steps: Option<String>,
    pub process_params: Option<serde_json::Value>,
    pub properties: serde_json::Value,
    pub changes: Option<String>,
    pub approval_status: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulaVersionRequest {
    pub version: String,
    pub changes: String,
    pub ingredients: Option<Vec<FormulaIngredient>>,
    pub process_steps: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveFormulaRequest {}
