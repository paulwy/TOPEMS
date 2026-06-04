use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Customer {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_customer_serialization() {
        let customer = Customer {
            id: Uuid::new_v4(),
            name: "Test Company".to_string(),
            code: Some("CUST-001".to_string()),
            industry: Some("Technology".to_string()),
            website: Some("https://example.com".to_string()),
            email: Some("contact@example.com".to_string()),
            phone: Some("+1234567890".to_string()),
            address: Some("123 Main St".to_string()),
            status: "active".to_string(),
            notes: Some("Test customer".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&customer).unwrap();
        let deserialized: Customer = serde_json::from_str(&json).unwrap();

        assert_eq!(customer.id, deserialized.id);
        assert_eq!(customer.name, deserialized.name);
        assert_eq!(customer.status, deserialized.status);
    }

    #[test]
    fn test_create_customer_request_validation() {
        let request = CreateCustomerRequest {
            name: "New Customer".to_string(),
            code: Some("NEW-001".to_string()),
            industry: None,
            website: None,
            email: Some("new@example.com".to_string()),
            phone: None,
            address: None,
            notes: None,
        };

        assert!(!request.name.is_empty());
        assert!(request.email.is_some());
    }

    #[test]
    fn test_update_customer_request_partial() {
        let request = UpdateCustomerRequest {
            name: Some("Updated Name".to_string()),
            code: None,
            industry: None,
            website: None,
            email: None,
            phone: None,
            address: None,
            status: None,
            notes: None,
        };

        assert!(request.name.is_some());
        assert!(request.code.is_none());
    }
}
