use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DbChange {
    pub id: Uuid,
    pub change_type: String,
    pub table_name: String,
    pub column_name: Option<String>,
    pub old_definition: Option<serde_json::Value>,
    pub new_definition: Option<serde_json::Value>,
    pub sql_statement: String,
    pub executed_by: Option<String>,
    pub executed_at: DateTime<Utc>,
    pub backup_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DbColumnDefinition {
    pub column_name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
    pub max_length: Option<i32>,
    pub numeric_precision: Option<i32>,
    pub numeric_scale: Option<i32>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AddColumnRequest {
    pub table_name: String,
    pub column: DbColumnDefinition,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ModifyColumnRequest {
    pub table_name: String,
    pub column_name: String,
    pub column: DbColumnDefinition,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DropColumnRequest {
    pub table_name: String,
    pub column_name: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TableInfo {
    pub table_name: String,
    pub table_type: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub column_name: String,
    pub data_type: String,
    pub is_nullable: String,
    pub column_default: Option<String>,
    pub character_maximum_length: Option<i32>,
    pub numeric_precision: Option<i32>,
    pub numeric_scale: Option<i32>,
    pub ordinal_position: i32,
}
