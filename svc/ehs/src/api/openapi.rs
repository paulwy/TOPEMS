// EHS 服务 OpenAPI 文档
use utoipa::{OpenApi, ToSchema};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SafetyInspection {
    pub id: Uuid,
    pub title: String,
    pub inspector: Option<String>,
    pub location: Option<String>,
    pub status: String,
    pub risk_level: Option<String>,
    pub findings: Option<String>,
    pub recommendations: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EnvironmentalReport {
    pub id: Uuid,
    pub report_type: String,
    pub title: String,
    pub period: Option<String>,
    pub emissions: Option<f64>,
    pub waste: Option<f64>,
    pub energy_consumption: Option<f64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HealthRecord {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub record_type: String,
    pub check_date: Option<DateTime<Utc>>,
    pub results: Option<serde_json::Value>,
    pub doctor: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IncidentReport {
    pub id: Uuid,
    pub incident_type: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub location: Option<String>,
    pub occurred_at: Option<DateTime<Utc>>,
    pub reported_by: Option<Uuid>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            SafetyInspection,
            EnvironmentalReport,
            HealthRecord,
            IncidentReport,
        ),
    ),
    tags(
        (name = "safety", description = "安全管理 API"),
        (name = "environmental", description = "环境管理 API"),
        (name = "health", description = "健康管理 API"),
        (name = "incident", description = "事故报告 API"),
    ),
    info(
        title = "TOPEMS EHS API",
        version = "1.0.0",
        description = "环境健康与安全管理 API"
    )
)]
pub struct EhsApiDoc;
