use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_auth::security::{EncryptionResult, FieldEncryptionService};

#[derive(Clone, Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Customer {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub customer_type: String,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default = "default_rating_c")]
    pub rating: String,
    #[serde(default)]
    pub region: Option<String>,
    pub owner_id: Uuid,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_approval_none")]
    pub approval_status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub deleted_at: Option<DateTime<Utc>>,
}

impl Default for Customer {
    fn default() -> Self {
        Self {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            name: String::new(),
            customer_type: "enterprise".into(),
            industry: None,
            rating: "C".into(),
            region: None,
            owner_id: Uuid::nil(),
            tags: vec![],
            approval_status: "none".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        }
    }
}

fn default_rating_c() -> String {
    "C".into()
}
fn default_approval_none() -> String {
    "none".into()
}

impl Customer {
    pub fn encrypt_fields(&mut self, _service: &FieldEncryptionService) -> EncryptionResult<()> {
        Ok(())
    }

    pub fn decrypt_fields(&mut self, _service: &FieldEncryptionService) -> EncryptionResult<()> {
        Ok(())
    }

    pub fn mask_sensitive_fields(&mut self) {}
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub customer_type: String,
    pub industry: Option<String>,
    pub rating: Option<String>,
    pub region: Option<String>,
    pub owner_id: Uuid,
    pub tags: Option<Vec<String>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub customer_type: Option<String>,
    pub industry: Option<String>,
    pub rating: Option<String>,
    pub region: Option<String>,
    pub owner_id: Option<Uuid>,
    pub tags: Option<Vec<String>>,
}

impl Default for CreateCustomerRequest {
    fn default() -> Self {
        Self {
            name: String::new(),
            customer_type: "enterprise".into(),
            industry: None,
            rating: Some("C".into()),
            region: None,
            owner_id: Uuid::nil(),
            tags: Some(vec![]),
        }
    }
}

impl Default for UpdateCustomerRequest {
    fn default() -> Self {
        Self {
            name: None,
            customer_type: None,
            industry: None,
            rating: None,
            region: None,
            owner_id: None,
            tags: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_customer_default() {
        let c = Customer::default();
        assert_eq!(c.customer_type, "enterprise");
        assert_eq!(c.rating, "C");
        assert_eq!(c.approval_status, "none");
        assert!(c.tags.is_empty());
        assert!(c.deleted_at.is_none());
    }

    #[test]
    fn test_create_customer_request_default() {
        let r = CreateCustomerRequest::default();
        assert_eq!(r.customer_type, "enterprise");
        assert_eq!(r.rating, Some("C".into()));
        assert_eq!(r.tags, Some(vec![]));
    }

    #[test]
    fn test_update_customer_request_default() {
        let r = UpdateCustomerRequest::default();
        assert!(r.name.is_none());
        assert!(r.rating.is_none());
        assert!(r.tags.is_none());
    }
}
