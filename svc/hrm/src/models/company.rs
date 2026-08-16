use chrono::DateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Company {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<chrono::Utc>,
    pub updated_at: DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateCompanyRequest {
    pub tenant_id: Option<Uuid>,
    pub name: String,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateCompanyRequest {
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub registration_number: Option<String>,
    pub tax_number: Option<String>,
    pub address: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<chrono::Utc> {
        chrono::Utc::now()
    }

    fn roundtrip<T: Serialize + serde::de::DeserializeOwned + std::fmt::Debug>(item: &T) {
        let json = serde_json::to_string(item).expect("serialize");
        let v1: serde_json::Value = serde_json::from_str(&json).expect("to_value");
        let back: T = serde_json::from_str(&json).expect("deserialize");
        let json2 = serde_json::to_string(&back).expect("re-serialize");
        let v2: serde_json::Value = serde_json::from_str(&json2).expect("to_value2");
        assert_eq!(v1, v2, "roundtrip mismatch");
    }

    #[test]
    fn test_company_roundtrip_full() {
        roundtrip(&Company {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Acme Corp".to_string(),
            short_name: Some("Acme".to_string()),
            registration_number: Some("REG123456".to_string()),
            tax_number: Some("TAX987654".to_string()),
            address: Some("123 Main St".to_string()),
            contact_phone: Some("555-0100".to_string()),
            email: Some("info@acme.com".to_string()),
            website: Some("https://acme.com".to_string()),
            description: Some("A technology company".to_string()),
            status: "active".to_string(),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_company_roundtrip_minimal() {
        roundtrip(&Company {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Minimal Inc".to_string(),
            short_name: None,
            registration_number: None,
            tax_number: None,
            address: None,
            contact_phone: None,
            email: None,
            website: None,
            description: None,
            status: "inactive".to_string(),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_company_roundtrip_all_optional_none() {
        roundtrip(&Company {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            name: String::new(),
            short_name: None,
            registration_number: None,
            tax_number: None,
            address: None,
            contact_phone: None,
            email: None,
            website: None,
            description: None,
            status: String::new(),
            created_at: now(),
            updated_at: now(),
        });
    }
}
