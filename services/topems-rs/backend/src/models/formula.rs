use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Formula {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub version: i32,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub status: String,
    pub properties: serde_json::Value,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulaIngredient {
    pub name: String,
    pub cas_no: Option<String>,
    pub ratio: f64,
    pub unit: String,
    pub supplier: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulaRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub ingredients: Vec<FormulaIngredient>,
    pub process_params: serde_json::Value,
    pub properties: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFormulaRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub ingredients: Option<Vec<FormulaIngredient>>,
    pub process_params: Option<serde_json::Value>,
    pub properties: Option<serde_json::Value>,
}
