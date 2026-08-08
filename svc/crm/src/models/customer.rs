use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_auth::security::encryption::{
    DataMasking, EncryptionResult, FieldEncryptionService,
};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Customer {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub fax: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub province: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub status: String,
    pub customer_type: Option<String>,
    pub source: Option<String>,
    pub rating: Option<String>,
    pub revenue: Option<f64>,
    pub employee_count: Option<i32>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Customer {
    pub fn encrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        if let Some(phone) = &self.phone {
            self.phone = Some(service.encrypt_to_string(phone)?);
        }
        if let Some(email) = &self.email {
            self.email = Some(service.encrypt_to_string(email)?);
        }
        Ok(())
    }

    pub fn decrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        if let Some(phone) = &self.phone {
            if phone.starts_with('{') {
                self.phone = Some(service.decrypt_string(phone)?);
            }
        }
        if let Some(email) = &self.email {
            if email.starts_with('{') {
                self.email = Some(service.decrypt_string(email)?);
            }
        }
        Ok(())
    }

    pub fn mask_sensitive_fields(&mut self) {
        if let Some(phone) = &self.phone {
            self.phone = Some(DataMasking::phone(phone));
        }
        if let Some(email) = &self.email {
            self.email = Some(DataMasking::email(email));
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub fax: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub province: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub customer_type: Option<String>,
    pub source: Option<String>,
    pub rating: Option<String>,
    pub revenue: Option<f64>,
    pub employee_count: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub website: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub fax: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub province: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub status: Option<String>,
    pub customer_type: Option<String>,
    pub source: Option<String>,
    pub rating: Option<String>,
    pub revenue: Option<f64>,
    pub employee_count: Option<i32>,
    pub notes: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::security::encryption::KeyManager;

    fn test_encryption_service() -> FieldEncryptionService {
        let key = [0x42u8; 32];
        let key_manager = KeyManager::new(&key);
        FieldEncryptionService::new(key_manager)
    }

    #[test]
    fn test_customer_serialization() {
        let customer = Customer {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Test Company".to_string(),
            code: Some("CUST-001".to_string()),
            industry: Some("Technology".to_string()),
            company_size: Some("medium".to_string()),
            website: Some("https://example.com".to_string()),
            email: Some("contact@example.com".to_string()),
            phone: Some("+1234567890".to_string()),
            fax: Some("+1234567891".to_string()),
            address: Some("123 Main St".to_string()),
            city: Some("Shanghai".to_string()),
            province: Some("Shanghai".to_string()),
            country: Some("China".to_string()),
            postal_code: Some("200000".to_string()),
            status: "active".to_string(),
            customer_type: Some("active".to_string()),
            source: Some("website".to_string()),
            rating: Some("A".to_string()),
            revenue: Some(1000000.0),
            employee_count: Some(100),
            notes: Some("Test customer".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&customer).expect("Failed to serialize customer");
        let deserialized: Customer =
            serde_json::from_str(&json).expect("Failed to deserialize customer");

        assert_eq!(customer.id, deserialized.id);
        assert_eq!(customer.name, deserialized.name);
        assert_eq!(customer.status, deserialized.status);
        assert_eq!(customer.rating, deserialized.rating);
    }

    #[test]
    fn test_create_customer_request_validation() {
        let request = CreateCustomerRequest {
            name: "New Customer".to_string(),
            code: Some("NEW-001".to_string()),
            industry: None,
            company_size: None,
            website: None,
            email: Some("new@example.com".to_string()),
            phone: None,
            fax: None,
            address: None,
            city: None,
            province: None,
            country: None,
            postal_code: None,
            customer_type: None,
            source: None,
            rating: None,
            revenue: None,
            employee_count: None,
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
            company_size: None,
            website: None,
            email: None,
            phone: None,
            fax: None,
            address: None,
            city: None,
            province: None,
            country: None,
            postal_code: None,
            status: None,
            customer_type: None,
            source: None,
            rating: None,
            revenue: None,
            employee_count: None,
            notes: None,
        };

        assert!(request.name.is_some());
        assert!(request.code.is_none());
    }

    #[test]
    fn test_customer_encryption_roundtrip() {
        let service = test_encryption_service();
        let id = Uuid::new_v4();
        let now = Utc::now();

        let mut customer = Customer {
            id,
            tenant_id: Uuid::new_v4(),
            name: "测试客户".to_string(),
            code: None,
            industry: None,
            company_size: None,
            website: None,
            email: Some("customer@example.com".to_string()),
            phone: Some("13800138000".to_string()),
            fax: None,
            address: None,
            city: None,
            province: None,
            country: None,
            postal_code: None,
            status: "active".to_string(),
            customer_type: None,
            source: None,
            rating: None,
            revenue: None,
            employee_count: None,
            notes: None,
            created_at: now,
            updated_at: now,
        };

        let original_email = customer.email.clone();
        let original_phone = customer.phone.clone();

        customer
            .encrypt_fields(&service)
            .expect("Failed to encrypt customer fields");

        assert_ne!(customer.email, original_email);
        assert_ne!(customer.phone, original_phone);

        assert!(customer
            .email
            .as_ref()
            .expect("email should be Some after encryption")
            .starts_with('{'));
        assert!(customer
            .phone
            .as_ref()
            .expect("phone should be Some after encryption")
            .starts_with('{'));

        customer
            .decrypt_fields(&service)
            .expect("Failed to decrypt customer fields");

        assert_eq!(customer.email, original_email);
        assert_eq!(customer.phone, original_phone);
    }

    #[test]
    fn test_customer_masking() {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let mut customer = Customer {
            id,
            tenant_id: Uuid::new_v4(),
            name: "测试客户".to_string(),
            code: None,
            industry: None,
            company_size: None,
            website: None,
            email: Some("customer@example.com".to_string()),
            phone: Some("13800138000".to_string()),
            fax: None,
            address: None,
            city: None,
            province: None,
            country: None,
            postal_code: None,
            status: "active".to_string(),
            customer_type: None,
            source: None,
            rating: None,
            revenue: None,
            employee_count: None,
            notes: None,
            created_at: now,
            updated_at: now,
        };

        customer.mask_sensitive_fields();

        assert!(customer
            .phone
            .as_ref()
            .expect("phone should be Some")
            .contains("****"));
        assert!(customer
            .email
            .as_ref()
            .expect("email should be Some")
            .contains("***"));
    }
}
