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

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema, Default)]
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
    fn customer_roundtrip_full() {
        let now = Utc::now();
        let later = now + Duration::hours(1);
        let c = Customer {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "ACME Corp".to_string(),
            customer_type: "enterprise".to_string(),
            industry: Some("制造业".to_string()),
            rating: "A".to_string(),
            region: Some("华东".to_string()),
            owner_id: Uuid::new_v4(),
            tags: vec!["vip".to_string(), "manufacturing".to_string()],
            approval_status: "approved".to_string(),
            created_at: now,
            updated_at: later,
            deleted_at: None,
        };
        roundtrip(&c);
    }

    #[test]
    fn customer_roundtrip_minimal_options() {
        let now = Utc::now();
        let c = Customer {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            name: String::new(),
            customer_type: "potential".into(),
            industry: None,
            rating: "C".into(),
            region: None,
            owner_id: Uuid::nil(),
            tags: vec![],
            approval_status: "none".into(),
            created_at: now,
            updated_at: now,
            deleted_at: Some(now + Duration::days(30)),
        };
        roundtrip(&c);
    }

    #[test]
    fn customer_clone_and_mask() {
        let c = Customer::default();
        let mut cloned = c.clone();
        cloned.mask_sensitive_fields();
        let _ = cloned.clone();
    }

    #[test]
    fn create_customer_request_roundtrip_full() {
        let r = CreateCustomerRequest {
            name: "Globex Inc".to_string(),
            customer_type: "smb".to_string(),
            industry: Some("科技".to_string()),
            rating: Some("B".to_string()),
            region: Some("华南".to_string()),
            owner_id: Uuid::new_v4(),
            tags: Some(vec!["new".to_string(), "tech".to_string()]),
        };
        roundtrip(&r);
    }

    #[test]
    fn create_customer_request_roundtrip_minimal() {
        let r = CreateCustomerRequest {
            name: "N".to_string(),
            customer_type: "potential".into(),
            industry: None,
            rating: None,
            region: None,
            owner_id: Uuid::nil(),
            tags: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn update_customer_request_roundtrip_all_some() {
        let r = UpdateCustomerRequest {
            name: Some("New Name".to_string()),
            customer_type: Some("enterprise".to_string()),
            industry: Some("医疗".to_string()),
            rating: Some("A+".to_string()),
            region: Some("华北".to_string()),
            owner_id: Some(Uuid::new_v4()),
            tags: Some(vec!["updated".to_string()]),
        };
        roundtrip(&r);
    }

    #[test]
    fn update_customer_request_roundtrip_all_none() {
        let r = UpdateCustomerRequest {
            name: None,
            customer_type: None,
            industry: None,
            rating: None,
            region: None,
            owner_id: None,
            tags: None,
        };
        roundtrip(&r);
    }

    #[test]
    fn default_rating_c_is_c() {
        assert_eq!(default_rating_c(), "C");
    }

    #[test]
    fn default_approval_none_is_none() {
        assert_eq!(default_approval_none(), "none");
    }
}
