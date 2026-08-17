use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Contact {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub customer_id: Option<Uuid>,
    pub first_name: String,
    #[serde(default)]
    pub last_name: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub position: Option<String>,
    #[serde(default = "default_status_active")]
    pub status: String,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default = "default_approval_none")]
    pub approval_status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Contact {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            customer_id: None,
            first_name: String::new(),
            last_name: None,
            email: None,
            phone: None,
            position: None,
            status: "active".into(),
            notes: None,
            approval_status: "none".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

fn default_status_active() -> String {
    "active".into()
}
fn default_approval_none() -> String {
    "none".into()
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct CreateContactRequest {
    pub customer_id: Option<Uuid>,
    pub first_name: String,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
pub struct UpdateContactRequest {
    pub customer_id: Option<Uuid>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contact_default() {
        let c = Contact::default();
        assert_eq!(c.status, "active");
        assert_eq!(c.approval_status, "none");
        assert!(c.deleted_at.is_none());
        assert!(c.customer_id.is_none());
    }

    #[test]
    fn test_create_contact_request_default() {
        let r = CreateContactRequest::default();
        assert_eq!(r.first_name, "");
        assert!(r.last_name.is_none());
        assert!(r.email.is_none());
    }

    #[test]
    fn test_update_contact_request_default() {
        let r = UpdateContactRequest::default();
        assert!(r.first_name.is_none());
        assert!(r.status.is_none());
        assert!(r.notes.is_none());
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

    #[test]
    fn contact_roundtrip_all_some() {
        let now = Utc::now();
        let c = Contact {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            customer_id: Some(Uuid::new_v4()),
            first_name: "Alice".to_string(),
            last_name: Some("Smith".to_string()),
            email: Some("alice@example.com".to_string()),
            phone: Some("+1-555-0100".to_string()),
            position: Some("CEO".to_string()),
            status: "active".into(),
            notes: Some("VIP contact".to_string()),
            approval_status: "pending".into(),
            created_at: now,
            updated_at: now + Duration::minutes(30),
            deleted_at: None,
        };
        roundtrip(&c);
    }

    #[test]
    fn contact_roundtrip_all_none_optionals() {
        let now = Utc::now();
        let c = Contact {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            customer_id: None,
            first_name: "Bob".to_string(),
            last_name: None,
            email: None,
            phone: None,
            position: None,
            status: "inactive".into(),
            notes: None,
            approval_status: "approved".into(),
            created_at: now,
            updated_at: now,
            deleted_at: Some(now + Duration::days(7)),
        };
        roundtrip(&c);
    }

    #[test]
    fn create_contact_request_roundtrip_full() {
        let r = CreateContactRequest {
            customer_id: Some(Uuid::new_v4()),
            first_name: "Charlie".to_string(),
            last_name: Some("Brown".to_string()),
            email: Some("cb@example.com".to_string()),
            phone: Some("555-1234".to_string()),
            position: Some("Manager".to_string()),
            notes: Some("Note A".to_string()),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_contact_request_roundtrip_minimal() {
        let r = CreateContactRequest {
            customer_id: None,
            first_name: "D".to_string(),
            last_name: None,
            email: None,
            phone: None,
            position: None,
            notes: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn update_contact_request_roundtrip_all_some() {
        let r = UpdateContactRequest {
            customer_id: Some(Uuid::new_v4()),
            first_name: Some("Eve".to_string()),
            last_name: Some("Adams".to_string()),
            email: Some("eve@example.com".to_string()),
            phone: Some("+86-10-12345678".to_string()),
            position: Some("CTO".to_string()),
            status: Some("inactive".to_string()),
            notes: Some("Updated notes".to_string()),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_contact_request_roundtrip_all_none() {
        let r = UpdateContactRequest {
            customer_id: None,
            first_name: None,
            last_name: None,
            email: None,
            phone: None,
            position: None,
            status: None,
            notes: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn default_status_active_check() {
        assert_eq!(default_status_active(), "active");
    }

    #[test]
    fn default_approval_none_check() {
        assert_eq!(default_approval_none(), "none");
    }
}
