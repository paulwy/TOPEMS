use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Attendance {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub employee_id: Uuid,
    pub date: NaiveDate,
    pub check_in_time: Option<DateTime<Utc>>,
    pub check_out_time: Option<DateTime<Utc>>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAttendanceRequest {
    pub employee_id: Uuid,
    pub date: NaiveDate,
    pub check_in_time: Option<DateTime<Utc>>,
    pub check_out_time: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceQuery {
    pub employee_id: Option<Uuid>,
    pub date: Option<NaiveDate>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceListResponse {
    pub items: Vec<Attendance>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
