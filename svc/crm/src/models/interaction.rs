use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Interaction {
    pub id: Uuid,
    pub tenant_id: Uuid,
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub contact_id: Option<Uuid>,
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    pub status: String,
    #[serde(default)]
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Interaction {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            customer_id: None,
            contact_id: None,
            type_: "call".into(),
            subject: None,
            content: None,
            scheduled_at: None,
            completed_at: None,
            status: "scheduled".into(),
            notes: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateInteractionRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub contact_id: Option<Uuid>,
    pub type_: String,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateInteractionRequest {
    #[serde(default)]
    pub customer_id: Option<Uuid>,
    #[serde(default)]
    pub contact_id: Option<Uuid>,
    #[serde(default)]
    pub type_: Option<String>,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub completed_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

impl Default for CreateInteractionRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            contact_id: None,
            type_: "call".into(),
            subject: None,
            content: None,
            scheduled_at: None,
            notes: None,
        }
    }
}

impl Default for UpdateInteractionRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            contact_id: None,
            type_: None,
            subject: None,
            content: None,
            scheduled_at: None,
            completed_at: None,
            status: None,
            notes: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(value: &T) {
        let json = serde_json::to_value(value).expect("serialize to Value");
        let restored: T = serde_json::from_value(json.clone()).expect("deserialize from Value");
        let json2 = serde_json::to_value(&restored).expect("re-serialize");
        assert_eq!(json, json2);
    }

    #[test]
    fn interaction_roundtrip_full() {
        let r = Interaction {
            id: uid(),
            tenant_id: uid(),
            customer_id: Some(uid()),
            contact_id: Some(uid()),
            type_: "call".into(),
            subject: Some("合同续签".into()),
            content: Some("讨论年度合同细节".into()),
            scheduled_at: Some(now()),
            completed_at: Some(now()),
            status: "completed".into(),
            notes: Some("客户非常满意".into()),
            created_at: now(),
            updated_at: now(),
            deleted_at: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn interaction_roundtrip_minimal() {
        let r = Interaction::default();
        roundtrip(&r);
    }

    #[test]
    fn create_interaction_request_roundtrip_full() {
        let r = CreateInteractionRequest {
            customer_id: Some(uid()),
            contact_id: Some(uid()),
            type_: "email".into(),
            subject: Some("报价跟进".into()),
            content: Some("发送新报价".into()),
            scheduled_at: Some(now()),
            notes: Some("优先处理".into()),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_interaction_request_roundtrip_minimal() {
        let r = CreateInteractionRequest::default();
        roundtrip(&r);
    }

    #[test]
    fn update_interaction_request_roundtrip_full() {
        let r = UpdateInteractionRequest {
            customer_id: Some(uid()),
            contact_id: Some(uid()),
            type_: Some("meeting".into()),
            subject: Some("Q4 策略".into()),
            content: Some("季度复盘".into()),
            scheduled_at: Some(now()),
            completed_at: Some(now()),
            status: Some("completed".into()),
            notes: Some("纪要已发送".into()),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_interaction_request_roundtrip_none() {
        let r = UpdateInteractionRequest::default();
        roundtrip(&r);
    }
}
