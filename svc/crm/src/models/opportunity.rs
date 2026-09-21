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
    pub name_en: Option<String>,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub value: Option<Decimal>,
    pub win_rate: Option<i32>,
    pub close_date: Option<DateTime<Utc>>,
    pub owner_id: Option<Uuid>,
    pub priority: Option<String>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct UpdateOpportunityRequest {
    pub opp_no: Option<String>,
    pub name: Option<String>,
    pub name_en: Option<String>,
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
            name_en: None,
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

    fn roundtrip<T: serde::Serialize + for<'de> serde::Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    use chrono::Duration;
    use rust_decimal::Decimal;

    #[test]
    fn opportunity_roundtrip_all_some() {
        let now = Utc::now();
        let close_dt = now + Duration::days(30);
        let o = Opportunity {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            opp_no: "OPP-2026-0001".to_string(),
            name: "Large Enterprise Deal".to_string(),
            customer_id: Some(Uuid::new_v4()),
            customer_name: Some("ACME Corp".to_string()),
            stage: "proposal".into(),
            priority: "high".into(),
            value: Some(Decimal::new(5000000, 2)),
            win_rate: Some(65),
            close_date: Some(close_dt),
            owner_id: Some(Uuid::new_v4()),
            status: "open".into(),
            notes: Some("Hot deal, follow up next week".to_string()),
            created_at: now,
            updated_at: now + Duration::hours(2),
            deleted_at: None,
        };
        roundtrip(&o);
    }

    #[test]
    fn opportunity_roundtrip_minimal_none() {
        let now = Utc::now();
        let o = Opportunity {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            opp_no: String::new(),
            name: "Small deal".to_string(),
            customer_id: None,
            customer_name: None,
            stage: "draft".into(),
            priority: "low".into(),
            value: None,
            win_rate: None,
            close_date: None,
            owner_id: None,
            status: "closed".into(),
            notes: None,
            created_at: now,
            updated_at: now,
            deleted_at: Some(now + Duration::days(90)),
        };
        roundtrip(&o);
    }

    #[test]
    fn create_opportunity_request_roundtrip_all_some() {
        let now = Utc::now();
        let close = (now + Duration::days(45))
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_utc();
        let r = CreateOpportunityRequest {
            opp_no: "OPP-2026-0042".to_string(),
            name: "Cloud Migration Project".to_string(),
            name_en: None,
            customer_id: Some(Uuid::new_v4()),
            customer_name: Some("Globex".to_string()),
            value: Some(Decimal::new(12500000, 2)),
            win_rate: Some(40),
            close_date: Some(close),
            owner_id: Some(Uuid::new_v4()),
            priority: Some("medium".to_string()),
            notes: Some("Quarterly target".to_string()),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_opportunity_request_roundtrip_minimal() {
        let r = CreateOpportunityRequest {
            opp_no: String::new(),
            name: "Tiny".to_string(),
            name_en: None,
            customer_id: None,
            customer_name: None,
            value: None,
            win_rate: None,
            close_date: None,
            owner_id: None,
            priority: None,
            notes: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn update_opportunity_request_roundtrip_all_some() {
        let now = Utc::now();
        let close = (now + Duration::days(60))
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_utc();
        let r = UpdateOpportunityRequest {
            opp_no: Some("OPP-UPDATED".to_string()),
            name: Some("Renamed Deal".to_string()),
            name_en: None,
            customer_id: Some(Uuid::new_v4()),
            customer_name: Some("Initech".to_string()),
            value: Some(Decimal::new(999999, 2)),
            stage: Some("negotiation".to_string()),
            win_rate: Some(80),
            close_date: Some(close),
            owner_id: Some(Uuid::new_v4()),
            priority: Some("urgent".to_string()),
            status: Some("open".to_string()),
            notes: Some("Updated all fields".to_string()),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_opportunity_request_roundtrip_all_none() {
        let r = UpdateOpportunityRequest {
            opp_no: None,
            name: None,
            name_en: None,
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
        };
        roundtrip(&r);
    }

    #[test]
    fn default_priority_medium_check() {
        assert_eq!(default_priority_medium(), "medium");
    }

    #[test]
    fn default_status_open_check() {
        assert_eq!(default_status_open(), "open");
    }
}
