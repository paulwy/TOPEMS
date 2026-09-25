use chrono::{NaiveDateTime, DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Serialize, FromRow)]
pub struct MigrationService {
    pub name: String,
    pub schema: String,
    pub port: i32,
    pub description: String,
    pub tables: i32,
}

#[derive(Serialize, FromRow)]
pub struct AppliedMigration {
    pub version: String,
    pub name: String,
    pub applied_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i64>,
}

#[derive(Serialize)]
pub struct MigrationStatus {
    pub pending: Vec<String>,
    pub applied: Vec<AppliedMigration>,
}

#[derive(Serialize)]
pub struct MigrationReport {
    pub file: String,
    pub success: bool,
    pub message: Option<String>,
}

#[derive(Serialize)]
pub struct MigrationApplyResult {
    pub files: Vec<String>,
    pub reports: Vec<MigrationReport>,
}

#[derive(Serialize)]
pub struct RollbackResult {
    pub record: MigrationReport,
}

#[derive(Serialize, FromRow)]
pub struct MigrationHistory {
    pub id: uuid::Uuid,
    pub plugin_name: String,
    pub version: String,
    pub name: String,
    pub description: Option<String>,
    pub applied_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i64>,
    pub success: bool,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize)]
pub struct ApplyMigrationRequest {
    pub r#type: String,
}

#[derive(Serialize, Deserialize)]
pub struct RollbackMigrationRequest {
    pub version: Option<String>,
}
