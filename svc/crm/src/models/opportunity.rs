use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Opportunity {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub opp_no: String,
    pub name: String,
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub customer_name: Option<String>,
    pub stage: String,
    #[serde(default = "default_priority_medium")]
    pub priority: String,
    pub value: Option<Decimal>,
    #[serde(default)]
    #[serde(alias = "probability")]
    #[sqlx(rename = "probability")]
    pub win_rate: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub owner_id: Option<Uuid>,
    #[serde(default = "default_status_open")]
    pub status: String,
    #[serde(default)]
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Opportunity {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            opp_no: String::new(),
            name: String::new(),
            customer_id: None,
            customer_name: None,
            stage: "draft".into(),
            priority: "medium".into(),
            value: None,
            win_rate: None,
            close_date: None,
            owner_id: None,
            status: "open".into(),
            notes: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

fn default_priority_medium() -> String {
    "medium".into()
}
fn default_status_open() -> String {
    "open".into()
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateOpportunityRequest {
    pub opp_no: String,
    pub name: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub value: Option<Decimal>,
    pub win_rate: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub owner_id: Option<Uuid>,
    pub priority: Option<String>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateOpportunityRequest {
    pub opp_no: Option<String>,
    pub name: Option<String>,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub value: Option<Decimal>,
    pub stage: Option<String>,
    pub win_rate: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub owner_id: Option<Uuid>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

impl Default for CreateOpportunityRequest {
    fn default() -> Self {
        Self {
            opp_no: String::new(),
            name: String::new(),
            customer_id: None,
            customer_name: None,
            value: None,
            win_rate: None,
            close_date: None,
            owner_id: None,
            priority: Some("medium".into()),
            notes: None,
        }
    }
}

impl Default for UpdateOpportunityRequest {
    fn default() -> Self {
        Self {
            opp_no: None,
            name: None,
            customer_id: None,
            customer_name: None,
            value: None,
            stage: None,
            win_rate: None,
            close_date: None,
            owner_id: None,
            priority: None,
            status: None,
            notes: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_opportunity_default() {
        let o = Opportunity::default();
        assert_eq!(o.stage, "draft");
        assert_eq!(o.priority, "medium");
        assert_eq!(o.status, "open");
        assert!(o.deleted_at.is_none());
        assert!(o.win_rate.is_none());
    }

    #[test]
    fn test_create_opportunity_request_default() {
        let r = CreateOpportunityRequest::default();
        assert_eq!(r.opp_no, "");
        assert_eq!(r.name, "");
        assert_eq!(r.priority, Some("medium".into()));
    }

    #[test]
    fn test_update_opportunity_request_default() {
        let r = UpdateOpportunityRequest::default();
        assert!(r.name.is_none());
        assert!(r.stage.is_none());
        assert!(r.status.is_none());
    }
}
