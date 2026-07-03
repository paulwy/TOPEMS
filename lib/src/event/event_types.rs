use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum EventType {
    HrmEmployeeCreated,
    HrmEmployeeUpdated,
    HrmEmployeeDeleted,
    HrmDepartmentCreated,
    HrmDepartmentUpdated,
    HrmDepartmentDeleted,

    PmProjectCreated,
    PmProjectUpdated,
    PmTaskCreated,
    PmTaskUpdated,
    PmTaskDeleted,

    // LIMS Events
    LimsSampleRegistered,
    LimsSampleUpdated,
    LimsInspectionTaskCreated,
    LimsInspectionTaskUpdated,
    LimsInspectionResultSubmitted,
    LimsInspectionAbnormalDetected,

    // QMS Events
    QmsInspectionCompleted,
    QmsCorrectiveActionCreated,
    QmsCorrectiveActionUpdated,
    QmsQualityIssueCreated,

    // EHS Events
    EhsHazardReported,
    EhsHazardRectified,
    EhsHazardVerified,
    EhsAccidentReported,
    EhsAccidentInvestigated,

    // LIMS Events Extended
    LimsRecordCompleted,
    LimsReagentAlert,

    // Integration Events
    QmsToLimsSyncTriggered,
    EhsToQmsTriggered,
    LimsToEhsTriggered,

    HealthCheck,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub event_id: Uuid,
    pub event_type: EventType,
    pub source: String,
    pub payload: serde_json::Value,
    pub occurred_at: DateTime<Utc>,
}

impl Event {
    pub fn new(event_type: EventType, source: &str, payload: serde_json::Value) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            event_type,
            source: source.to_string(),
            payload,
            occurred_at: Utc::now(),
        }
    }
}

// --- HRM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmEmployeeCreatedPayload {
    pub employee_id: Uuid,
    pub name: String,
    pub email: String,
    pub department_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmEmployeeUpdatedPayload {
    pub employee_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentCreatedPayload {
    pub department_id: Uuid,
    pub department_name: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentUpdatedPayload {
    pub department_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentDeletedPayload {
    pub department_id: Uuid,
    pub department_name: String,
    pub deleted_by: Option<Uuid>,
}

// --- PM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectCreatedPayload {
    pub project_id: Uuid,
    pub project_name: String,
    pub owner_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskCreatedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub task_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectUpdatedPayload {
    pub project_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskUpdatedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskDeletedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub deleted_by: Option<Uuid>,
}

// --- LIMS Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsSampleRegisteredPayload {
    pub sample_id: Uuid,
    pub sample_no: String,
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsInspectionResultSubmittedPayload {
    pub task_id: Uuid,
    pub task_no: String,
    pub sample_id: Uuid,
    pub sample_no: String,
    pub conclusion: String,
    pub result: serde_json::Value,
    pub recorded_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsInspectionAbnormalDetectedPayload {
    pub task_id: Uuid,
    pub task_no: String,
    pub sample_id: Uuid,
    pub sample_no: String,
    pub test_item: String,
    pub abnormal_data: serde_json::Value,
    pub conclusion: String,
}

// --- QMS Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QmsInspectionCompletedPayload {
    pub inspection_id: Uuid,
    pub inspection_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub result: String,
    pub qualification_rate: Option<f64>,
    pub inspector: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QmsCorrectiveActionCreatedPayload {
    pub action_id: Uuid,
    pub issue_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub assigned_to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QmsQualityIssueCreatedPayload {
    pub issue_id: Uuid,
    pub issue_no: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub created_by: Option<String>,
    pub related_inspection_id: Option<Uuid>,
}

// --- EHS Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhsHazardReportedPayload {
    pub hazard_id: Uuid,
    pub hazard_no: String,
    pub title: String,
    pub category: String,
    pub level: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub reported_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhsAccidentReportedPayload {
    pub accident_id: Uuid,
    pub accident_no: String,
    pub title: String,
    pub severity: String,
    pub location: Option<String>,
    pub occurred_at: Option<String>,
}

// --- LIMS Events Extended ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsRecordCompletedPayload {
    pub record_id: Uuid,
    pub record_no: String,
    pub task_id: Uuid,
    pub task_no: String,
    pub sample_id: Uuid,
    pub sample_no: String,
    pub conclusion: String,
    pub test_data: serde_json::Value,
    pub related_inspection_no: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsReagentAlertPayload {
    pub reagent_id: Uuid,
    pub reagent_no: String,
    pub reagent_name: String,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub description: Option<String>,
    pub current_stock: Option<i32>,
    pub min_stock: Option<i32>,
    pub expiry_date: Option<String>,
}

impl std::fmt::Display for EventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}
