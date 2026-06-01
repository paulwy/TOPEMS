use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ScheduleType {
    Receive,
    Pay,
}

impl Default for ScheduleType {
    fn default() -> Self {
        ScheduleType::Pay
    }
}

impl std::fmt::Display for ScheduleType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScheduleType::Receive => write!(f, "RECEIVE"),
            ScheduleType::Pay => write!(f, "PAY"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ScheduleStatus {
    Pending,
    Paid,
    Void,
}

impl Default for ScheduleStatus {
    fn default() -> Self {
        ScheduleStatus::Pending
    }
}

impl std::fmt::Display for ScheduleStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScheduleStatus::Pending => write!(f, "PENDING"),
            ScheduleStatus::Paid => write!(f, "PAID"),
            ScheduleStatus::Void => write!(f, "VOID"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PaymentSchedule {
    pub id: Uuid,
    pub receivable_id: Option<Uuid>,
    pub payable_id: Option<Uuid>,
    pub project_id: Uuid,
    pub contract_id: Option<Uuid>,
    pub schedule_type: String,
    pub due_date: DateTime<Utc>,
    pub amount: f64,
    pub status: String,
    pub actual_payment_date: Option<DateTime<Utc>>,
    pub actual_amount: Option<f64>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreatePaymentScheduleRequest {
    pub receivable_id: Option<Uuid>,
    pub payable_id: Option<Uuid>,
    pub project_id: Uuid,
    pub contract_id: Option<Uuid>,
    pub schedule_type: String,
    pub due_date: DateTime<Utc>,
    pub amount: f64,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdatePaymentScheduleRequest {
    pub due_date: Option<DateTime<Utc>>,
    pub amount: Option<f64>,
    pub status: Option<String>,
    pub actual_payment_date: Option<DateTime<Utc>>,
    pub actual_amount: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PaymentScheduleQuery {
    pub project_id: Option<Uuid>,
    pub schedule_type: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}