#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 数据源类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "datasource_type", rename_all = "lowercase")]
pub enum DataSourceType {
    PostgreSQL,
    MySQL,
    MongoDB,
    Oracle,
    SqlServer,
    Redis,
    Elasticsearch,
    Kafka,
    HttpApi,
    File,
    Custom,
}

/// 数据源连接状态
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "connection_status", rename_all = "lowercase")]
pub enum ConnectionStatus {
    Connected,
    Disconnected,
    Error,
    Testing,
}

/// 数据源模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DataSource {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub datasource_type: DataSourceType,
    pub connection_config: serde_json::Value,
    pub status: ConnectionStatus,
    pub last_tested_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
}

/// 数据源表信息模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DataSourceTable {
    pub id: Uuid,
    pub datasource_id: Uuid,
    pub table_name: String,
    pub table_schema: Option<String>,
    pub table_type: String,
    pub row_count: Option<i64>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 数据源字段信息模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DataSourceField {
    pub id: Uuid,
    pub datasource_id: Uuid,
    pub table_name: String,
    pub field_name: String,
    pub field_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
    pub default_value: Option<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建数据源请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDataSource {
    pub name: String,
    pub description: Option<String>,
    pub datasource_type: DataSourceType,
    pub connection_config: serde_json::Value,
    pub created_by: Option<Uuid>,
}

/// 更新数据源请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDataSource {
    pub name: Option<String>,
    pub description: Option<String>,
    pub connection_config: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

/// 测试数据源连接请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestDataSourceConnection {
    pub datasource_id: Uuid,
}

/// 数据源连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub host: String,
    pub port: i32,
    pub database: String,
    pub username: String,
    pub password: String,
    pub ssl_enabled: Option<bool>,
    pub ssl_cert: Option<String>,
    pub connection_timeout: Option<i32>,
    pub max_connections: Option<i32>,
    pub additional_params: Option<serde_json::Value>,
}

/// HTTP API 数据源配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpApiConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub headers: Option<serde_json::Value>,
    pub timeout: Option<i32>,
    pub retry_count: Option<i32>,
}

/// 文件数据源配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDataSourceConfig {
    pub file_path: String,
    pub file_type: FileType,
    pub delimiter: Option<String>,
    pub encoding: Option<String>,
    pub sheet_name: Option<String>,
}

/// 文件类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Csv,
    Excel,
    Json,
    Xml,
    Parquet,
}

/// 数据源测试结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSourceTestResult {
    pub datasource_id: Uuid,
    pub success: bool,
    pub message: String,
    pub connection_time_ms: i64,
    pub tested_at: DateTime<Utc>,
    pub details: Option<serde_json::Value>,
}
