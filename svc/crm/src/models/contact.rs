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

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateContactRequest {
    pub customer_id: Option<Uuid>,
    pub first_name: String,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
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

impl Default for CreateContactRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            first_name: String::new(),
            last_name: None,
            email: None,
            phone: None,
            position: None,
            notes: None,
        }
    }
}

impl Default for UpdateContactRequest {
    fn default() -> Self {
        Self {
            customer_id: None,
            first_name: None,
            last_name: None,
            email: None,
            phone: None,
            position: None,
            status: None,
            notes: None,
        }
    }
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
}
