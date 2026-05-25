use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ==================== 项目模型 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub priority: String,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

// ==================== 实验模型 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Experiment {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub experiment_type: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateExperimentRequest {
    pub project_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub experiment_type: Option<String>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateExperimentRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub experiment_type: Option<String>,
}

// ==================== 配方模型 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Formula {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub version: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub ingredients: Vec<Ingredient>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FormulaWithoutIngredients {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub version: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulaRequest {
    pub project_id: Option<Uuid>,
    pub name: String,
    pub version: String,
    pub created_by: Option<Uuid>,
    pub ingredients: Vec<CreateIngredientRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFormulaRequest {
    pub name: Option<String>,
    pub version: Option<String>,
    pub ingredients: Option<Vec<CreateIngredientRequest>>,
}

// ==================== 原料模型 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Ingredient {
    pub id: Uuid,
    pub formula_id: Uuid,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIngredientRequest {
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub percentage: f64,
}
