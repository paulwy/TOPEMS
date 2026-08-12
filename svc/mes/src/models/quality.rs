#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateQualityInspectionRequest {
    pub work_report_id: Uuid,
    pub inspector_id: Uuid,
    pub inspector_name: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct QualityInspectionResponse {
    pub id: Uuid,
    pub work_report_id: Uuid,
    pub inspector_id: Uuid,
    pub inspector_name: String,
    pub result: String,
    pub defect_type: Option<String>,
    pub defect_description: Option<String>,
    pub concession_approval_id: Option<Uuid>,
    pub risk_assessment: Option<String>,
    pub customer_notified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TraceabilityRecordResponse {
    pub id: Uuid,
    pub batch_id: Uuid,
    pub lot_code: String,
    pub source_id: Option<Uuid>,
    pub status: String,
    pub freeze_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
