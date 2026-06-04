use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct EmailTemplate {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub subject_template: String,
    pub body_template: String,
    pub body_html_template: Option<String>,
    pub category: String,
    pub tags: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub subject_template: String,
    pub body_template: String,
    pub body_html_template: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub subject_template: Option<String>,
    pub body_template: Option<String>,
    pub body_html_template: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TemplateListParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RenderTemplateRequest {
    pub template_code: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateStatusRequest {
    pub status: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_email_template_serialization() {
        let template = EmailTemplate {
            id: Uuid::new_v4(),
            code: "welcome_email".to_string(),
            name: "Welcome Email".to_string(),
            description: Some("Welcome email for new users".to_string()),
            subject_template: "Welcome, {{name}}!".to_string(),
            body_template: "Dear {{name}}, welcome to our platform!".to_string(),
            body_html_template: Some("<h1>Welcome, {{name}}!</h1>".to_string()),
            category: "marketing".to_string(),
            tags: Some(serde_json::json!(["welcome", "onboarding"])),
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let json = serde_json::to_string(&template).unwrap();
        let deserialized: EmailTemplate = serde_json::from_str(&json).unwrap();

        assert_eq!(template.id, deserialized.id);
        assert_eq!(template.code, deserialized.code);
        assert_eq!(template.name, deserialized.name);
    }

    #[test]
    fn test_create_template_request_validation() {
        let request = CreateTemplateRequest {
            code: "test_template".to_string(),
            name: "Test Template".to_string(),
            description: None,
            subject_template: "Subject: {{var}}".to_string(),
            body_template: "Body: {{var}}".to_string(),
            body_html_template: None,
            category: Some("general".to_string()),
            tags: None,
        };

        assert!(!request.code.is_empty());
        assert!(!request.name.is_empty());
        assert!(request.subject_template.contains("{{var}}"));
    }

    #[test]
    fn test_render_template_request() {
        let request = RenderTemplateRequest {
            template_code: "welcome".to_string(),
            data: serde_json::json!({
                "name": "John",
                "email": "john@example.com"
            }),
        };

        assert_eq!(request.template_code, "welcome");
        assert!(request.data.get("name").is_some());
    }
}
