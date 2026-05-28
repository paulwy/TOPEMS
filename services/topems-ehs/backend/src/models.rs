use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SafetyHazard {
    pub id: Uuid,
    pub hazard_no: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub risk_assessment: Option<String>,
    pub control_measures: serde_json::Value,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSafetyHazardRequest {
    pub hazard_no: String,
    pub name: String,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub risk_assessment: Option<String>,
    pub control_measures: Vec<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSafetyHazardRequest {
    pub hazard_no: Option<String>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub risk_assessment: Option<String>,
    pub control_measures: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SafetyCheck {
    pub id: Uuid,
    pub check_no: String,
    pub check_type: String,
    pub inspector: String,
    pub check_date: Option<DateTime<Utc>>,
    pub location: Option<String>,
    pub result: String,
    pub issues: serde_json::Value,
    pub attachments: Option<serde_json::Value>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSafetyCheckRequest {
    pub check_no: String,
    pub check_type: String,
    pub inspector: String,
    pub check_date: Option<DateTime<Utc>>,
    pub location: Option<String>,
    pub result: String,
    pub issues: Vec<String>,
    pub attachments: Option<Vec<String>>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSafetyCheckRequest {
    pub check_no: Option<String>,
    pub check_type: Option<String>,
    pub inspector: Option<String>,
    pub check_date: Option<DateTime<Utc>>,
    pub location: Option<String>,
    pub result: Option<String>,
    pub issues: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EmergencyPlan {
    pub id: Uuid,
    pub plan_no: String,
    pub plan_type: String,
    pub scope: Option<String>,
    pub trigger_conditions: Option<String>,
    pub response_procedures: Option<String>,
    pub responsible_persons: serde_json::Value,
    pub contact_info: Option<String>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEmergencyPlanRequest {
    pub plan_no: String,
    pub name: String,
    pub plan_type: String,
    pub scope: Option<String>,
    pub trigger_conditions: Option<String>,
    pub response_procedures: Option<String>,
    pub responsible_persons: Vec<String>,
    pub contact_info: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEmergencyPlanRequest {
    pub plan_no: Option<String>,
    pub name: Option<String>,
    pub plan_type: Option<String>,
    pub scope: Option<String>,
    pub trigger_conditions: Option<String>,
    pub response_procedures: Option<String>,
    pub responsible_persons: Option<Vec<String>>,
    pub contact_info: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DrillRecord {
    pub id: Uuid,
    pub plan_id: Option<Uuid>,
    pub drill_name: String,
    pub drill_date: Option<DateTime<Utc>>,
    pub participants: serde_json::Value,
    pub duration_hours: f64,
    pub location: Option<String>,
    pub summary: Option<String>,
    pub issues_found: Option<String>,
    pub improvements: Option<String>,
    pub attachments: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDrillRecordRequest {
    pub plan_id: Option<Uuid>,
    pub drill_name: String,
    pub drill_date: Option<DateTime<Utc>>,
    pub participants: Vec<String>,
    pub duration_hours: f64,
    pub location: Option<String>,
    pub summary: Option<String>,
    pub issues_found: Option<String>,
    pub improvements: Option<String>,
    pub attachments: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDrillRecordRequest {
    pub plan_id: Option<Uuid>,
    pub drill_name: Option<String>,
    pub drill_date: Option<DateTime<Utc>>,
    pub participants: Option<Vec<String>>,
    pub duration_hours: Option<f64>,
    pub location: Option<String>,
    pub summary: Option<String>,
    pub issues_found: Option<String>,
    pub improvements: Option<String>,
    pub attachments: Option<Vec<String>>,
}
