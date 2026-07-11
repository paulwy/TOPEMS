use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TrainingPlan {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub status: String,
    pub budget: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTrainingPlanRequest {
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub budget: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTrainingPlanRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub budget: Option<f64>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TrainingCourse {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub plan_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub duration_hours: Option<f64>,
    pub instructor_id: Option<Uuid>,
    pub instructor_name: Option<String>,
    pub location: Option<String>,
    pub max_participants: Option<i32>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTrainingCourseRequest {
    pub plan_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub category: String,
    pub level: String,
    pub description: Option<String>,
    pub duration_hours: Option<f64>,
    pub instructor_id: Option<Uuid>,
    pub instructor_name: Option<String>,
    pub location: Option<String>,
    pub max_participants: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTrainingCourseRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub description: Option<String>,
    pub duration_hours: Option<f64>,
    pub instructor_id: Option<Uuid>,
    pub instructor_name: Option<String>,
    pub location: Option<String>,
    pub max_participants: Option<i32>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct TrainingRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub course_id: Uuid,
    pub employee_id: Uuid,
    pub enrollment_date: DateTime<Utc>,
    pub attendance_status: String,
    pub completion_status: String,
    pub score: Option<f64>,
    pub certificate_no: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub feedback: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTrainingRecordRequest {
    pub course_id: Uuid,
    pub employee_id: Uuid,
    pub enrollment_date: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTrainingRecordRequest {
    pub attendance_status: Option<String>,
    pub completion_status: Option<String>,
    pub score: Option<f64>,
    pub certificate_no: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub feedback: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TrainingPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub plan_id: Option<Uuid>,
    pub course_id: Option<Uuid>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
}
