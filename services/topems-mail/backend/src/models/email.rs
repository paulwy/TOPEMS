use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Email {
    pub id: Uuid,
    pub subject: String,
    pub from_address: String,
    pub to_addresses: serde_json::Value,
    pub cc_addresses: Option<serde_json::Value>,
    pub bcc_addresses: Option<serde_json::Value>,
    pub body: String,
    pub body_html: Option<String>,
    pub status: String,
    pub priority: String,
    pub sent_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    pub template_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SendEmailRequest {
    pub subject: String,
    pub to_addresses: Vec<String>,
    pub cc_addresses: Option<Vec<String>>,
    pub bcc_addresses: Option<Vec<String>>,
    pub body: String,
    pub body_html: Option<String>,
    pub priority: Option<String>,
    pub template_id: Option<Uuid>,
    pub template_data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct SendEmailWithTemplateRequest {
    pub template_code: String,
    pub to_addresses: Vec<String>,
    pub cc_addresses: Option<Vec<String>>,
    pub bcc_addresses: Option<Vec<String>>,
    pub template_data: serde_json::Value,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EmailListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ResendEmailsRequest {
    pub email_ids: Vec<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_email_serialization() {
        let email = Email {
            id: Uuid::new_v4(),
            subject: "Test Email".to_string(),
            from_address: "sender@example.com".to_string(),
            to_addresses: serde_json::json!(["recipient@example.com"]),
            cc_addresses: None,
            bcc_addresses: None,
            body: "Email body content".to_string(),
            body_html: Some("<p>Email body</p>".to_string()),
            status: "pending".to_string(),
            priority: "normal".to_string(),
            sent_at: None,
            error_message: None,
            template_id: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&email).unwrap();
        let deserialized: Email = serde_json::from_str(&json).unwrap();

        assert_eq!(email.id, deserialized.id);
        assert_eq!(email.subject, deserialized.subject);
    }

    #[test]
    fn test_send_email_request_validation() {
        let request = SendEmailRequest {
            subject: "Test".to_string(),
            to_addresses: vec!["test@example.com".to_string()],
            cc_addresses: None,
            bcc_addresses: None,
            body: "Body".to_string(),
            body_html: None,
            priority: Some("high".to_string()),
            template_id: None,
            template_data: None,
        };

        assert!(!request.to_addresses.is_empty());
        assert!(request.subject.len() > 0);
    }

    #[test]
    fn test_email_list_params_defaults() {
        let params = EmailListParams {
            page: None,
            page_size: None,
            search: None,
            status: None,
            priority: None,
        };

        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }
}
