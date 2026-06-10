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
    pub name: String,
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
    pub drill_no: String,
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
    pub drill_no: String,
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
    pub drill_no: Option<String>,
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

// ==================== 环境管理模型 ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MonitoringPoint {
    pub id: Uuid,
    pub point_no: String,
    pub name: String,
    pub point_type: String,
    pub location: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub parameters: serde_json::Value,
    pub thresholds: Option<serde_json::Value>,
    pub status: String,
    pub last_data_time: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMonitoringPointRequest {
    pub point_no: String,
    pub name: String,
    pub point_type: String,
    pub location: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub parameters: Vec<String>,
    pub thresholds: Option<serde_json::Value>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMonitoringPointRequest {
    pub point_no: Option<String>,
    pub name: Option<String>,
    pub point_type: Option<String>,
    pub location: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub parameters: Option<Vec<String>>,
    pub thresholds: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EnvironmentalData {
    pub id: Uuid,
    pub point_id: Uuid,
    pub data_time: DateTime<Utc>,
    pub parameter: String,
    pub value: f64,
    pub unit: String,
    pub quality: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEnvironmentalDataRequest {
    pub point_id: Uuid,
    pub data_time: DateTime<Utc>,
    pub parameter: String,
    pub value: f64,
    pub unit: String,
    pub quality: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentalDataQuery {
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub parameter: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EnvironmentalAlert {
    pub id: Uuid,
    pub point_id: Uuid,
    pub alert_type: String,
    pub alert_level: String,
    pub parameter: String,
    pub threshold_value: f64,
    pub actual_value: f64,
    pub alert_time: DateTime<Utc>,
    pub status: String,
    pub handled_by: Option<String>,
    pub handled_time: Option<DateTime<Utc>>,
    pub handle_result: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandleAlertRequest {
    pub handle_result: String,
}

// ==================== 健康管理模型 ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct HealthRecord {
    pub id: Uuid,
    pub employee_id: String,
    pub employee_name: String,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub blood_type: Option<String>,
    pub allergies: Option<serde_json::Value>,
    pub chronic_diseases: Option<serde_json::Value>,
    pub medical_history: Option<String>,
    pub emergency_contact: Option<String>,
    pub emergency_phone: Option<String>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateHealthRecordRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub blood_type: Option<String>,
    pub allergies: Option<Vec<String>>,
    pub chronic_diseases: Option<Vec<String>>,
    pub medical_history: Option<String>,
    pub emergency_contact: Option<String>,
    pub emergency_phone: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateHealthRecordRequest {
    pub employee_name: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub blood_type: Option<String>,
    pub allergies: Option<Vec<String>>,
    pub chronic_diseases: Option<Vec<String>>,
    pub medical_history: Option<String>,
    pub emergency_contact: Option<String>,
    pub emergency_phone: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct HealthCheckup {
    pub id: Uuid,
    pub employee_id: String,
    pub employee_name: String,
    pub checkup_date: DateTime<Utc>,
    pub checkup_type: String,
    pub institution: Option<String>,
    pub result_summary: Option<String>,
    pub abnormal_items: Option<serde_json::Value>,
    pub recommendations: Option<String>,
    pub attachments: Option<serde_json::Value>,
    pub next_checkup_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateHealthCheckupRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub checkup_date: DateTime<Utc>,
    pub checkup_type: String,
    pub institution: Option<String>,
    pub result_summary: Option<String>,
    pub abnormal_items: Option<Vec<String>>,
    pub recommendations: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub next_checkup_date: Option<DateTime<Utc>>,
    pub status: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct VaccinationRecord {
    pub id: Uuid,
    pub employee_id: String,
    pub employee_name: String,
    pub vaccine_name: String,
    pub vaccine_type: String,
    pub vaccination_date: DateTime<Utc>,
    pub dose_number: i32,
    pub institution: Option<String>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<DateTime<Utc>>,
    pub next_dose_date: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub attachments: Option<serde_json::Value>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVaccinationRecordRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub vaccine_name: String,
    pub vaccine_type: String,
    pub vaccination_date: DateTime<Utc>,
    pub dose_number: i32,
    pub institution: Option<String>,
    pub batch_number: Option<String>,
    pub expiry_date: Option<DateTime<Utc>>,
    pub next_dose_date: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub status: String,
}

// ==================== 安全事故模型 ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SafetyIncident {
    pub id: Uuid,
    pub incident_no: String,
    pub title: String,
    pub incident_type: String,
    pub incident_level: String,
    pub location: Option<String>,
    pub incident_time: DateTime<Utc>,
    pub description: Option<String>,
    pub casualties: Option<i32>,
    pub injuries: Option<i32>,
    pub economic_loss: Option<f64>,
    pub cause_analysis: Option<String>,
    pub corrective_actions: Option<serde_json::Value>,
    pub responsible_persons: Option<serde_json::Value>,
    pub status: String,
    pub handled_by: Option<String>,
    pub handled_time: Option<DateTime<Utc>>,
    pub attachments: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSafetyIncidentRequest {
    pub incident_no: String,
    pub title: String,
    pub incident_type: String,
    pub incident_level: String,
    pub location: Option<String>,
    pub incident_time: DateTime<Utc>,
    pub description: Option<String>,
    pub casualties: Option<i32>,
    pub injuries: Option<i32>,
    pub economic_loss: Option<f64>,
    pub cause_analysis: Option<String>,
    pub corrective_actions: Option<Vec<String>>,
    pub responsible_persons: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSafetyIncidentRequest {
    pub title: Option<String>,
    pub incident_type: Option<String>,
    pub incident_level: Option<String>,
    pub location: Option<String>,
    pub incident_time: Option<DateTime<Utc>>,
    pub description: Option<String>,
    pub casualties: Option<i32>,
    pub injuries: Option<i32>,
    pub economic_loss: Option<f64>,
    pub cause_analysis: Option<String>,
    pub corrective_actions: Option<Vec<String>>,
    pub responsible_persons: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandleIncidentRequest {
    pub cause_analysis: String,
    pub corrective_actions: Vec<String>,
    pub responsible_persons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RectifyHazardRequest {
    pub rectify_measures: String,
    pub rectify_date: DateTime<Utc>,
    pub rectify_person: String,
    pub verification_result: Option<String>,
}

// ==================== 风险评估模型 ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub id: Uuid,
    pub assessment_no: String,
    pub title: String,
    pub assessment_type: String,
    pub risk_source: String,
    pub risk_category: String,
    pub likelihood: i32,
    pub consequence: i32,
    pub risk_level: String,
    pub risk_score: i32,
    pub description: Option<String>,
    pub affected_area: Option<String>,
    pub affected_persons: Option<i32>,
    pub existing_controls: Option<serde_json::Value>,
    pub status: String,
    pub assessor: Option<String>,
    pub assessment_date: Option<DateTime<Utc>>,
    pub review_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRiskAssessmentRequest {
    pub assessment_no: String,
    pub title: String,
    pub assessment_type: String,
    pub risk_source: String,
    pub risk_category: String,
    pub likelihood: i32,
    pub consequence: i32,
    pub description: Option<String>,
    pub affected_area: Option<String>,
    pub affected_persons: Option<i32>,
    pub existing_controls: Option<Vec<String>>,
    pub status: String,
    pub assessor: Option<String>,
    pub assessment_date: Option<DateTime<Utc>>,
    pub review_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRiskAssessmentRequest {
    pub title: Option<String>,
    pub assessment_type: Option<String>,
    pub risk_source: Option<String>,
    pub risk_category: Option<String>,
    pub likelihood: Option<i32>,
    pub consequence: Option<i32>,
    pub description: Option<String>,
    pub affected_area: Option<String>,
    pub affected_persons: Option<i32>,
    pub existing_controls: Option<Vec<String>>,
    pub status: Option<String>,
    pub assessor: Option<String>,
    pub assessment_date: Option<DateTime<Utc>>,
    pub review_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct RiskControl {
    pub id: Uuid,
    pub assessment_id: Uuid,
    pub control_type: String,
    pub control_measure: String,
    pub implementation_plan: Option<String>,
    pub responsible_person: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub completion_date: Option<DateTime<Utc>>,
    pub effectiveness: Option<String>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRiskControlRequest {
    pub assessment_id: Uuid,
    pub control_type: String,
    pub control_measure: String,
    pub implementation_plan: Option<String>,
    pub responsible_person: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskMatrix {
    pub levels: Vec<RiskMatrixLevel>,
    pub likelihood_scale: Vec<RiskScaleItem>,
    pub consequence_scale: Vec<RiskScaleItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskMatrixLevel {
    pub level: String,
    pub min_score: i32,
    pub max_score: i32,
    pub color: String,
    pub description: String,
    pub action_required: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskScaleItem {
    pub value: i32,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskStatistics {
    pub total_assessments: i64,
    pub by_level: serde_json::Value,
    pub by_category: serde_json::Value,
    pub by_status: serde_json::Value,
    pub high_risk_count: i64,
    pub pending_controls: i64,
    pub overdue_reviews: i64,
}

// ==================== 培训管理模型 ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TrainingProgram {
    pub id: Uuid,
    pub program_no: String,
    pub title: String,
    pub training_type: String,
    pub content: Option<String>,
    pub objectives: Option<String>,
    pub target_audience: Option<String>,
    pub duration_hours: Option<f64>,
    pub training_method: Option<String>,
    pub instructor: Option<String>,
    pub location: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub max_participants: Option<i32>,
    pub materials: Option<serde_json::Value>,
    pub status: String,
    pub completion_rate: Option<f64>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTrainingProgramRequest {
    pub program_no: String,
    pub title: String,
    pub training_type: String,
    pub content: Option<String>,
    pub objectives: Option<String>,
    pub target_audience: Option<String>,
    pub duration_hours: Option<f64>,
    pub training_method: Option<String>,
    pub instructor: Option<String>,
    pub location: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub max_participants: Option<i32>,
    pub materials: Option<Vec<String>>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTrainingProgramRequest {
    pub title: Option<String>,
    pub training_type: Option<String>,
    pub content: Option<String>,
    pub objectives: Option<String>,
    pub target_audience: Option<String>,
    pub duration_hours: Option<f64>,
    pub training_method: Option<String>,
    pub instructor: Option<String>,
    pub location: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub max_participants: Option<i32>,
    pub materials: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TrainingRecord {
    pub id: Uuid,
    pub program_id: Uuid,
    pub employee_id: String,
    pub employee_name: String,
    pub enrollment_date: DateTime<Utc>,
    pub completion_date: Option<DateTime<Utc>>,
    pub score: Option<f64>,
    pub certificate_no: Option<String>,
    pub certificate_expiry: Option<DateTime<Utc>>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTrainingRecordRequest {
    pub program_id: Uuid,
    pub employee_id: String,
    pub employee_name: String,
    pub enrollment_date: DateTime<Utc>,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteTrainingRequest {
    pub completion_date: DateTime<Utc>,
    pub score: Option<f64>,
    pub certificate_no: Option<String>,
    pub certificate_expiry: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
}

// ==================== 审计日志模型 ====================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub module: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}
