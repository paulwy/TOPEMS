use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

lazy_static! {
    static ref EMAIL_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        .expect("invalid EMAIL_REGEX pattern");
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(as = ListUsersParams)]
pub struct ListUsersParams {
    pub(crate) page: Option<i64>,
    pub(crate) page_size: Option<i64>,
}

pub(crate) async fn record_audit_log(
    pool: &sqlx::PgPool,
    user_id: &str,
    action: &str,
    resource_type: &str,
    resource_id: &str,
    request_body: Option<serde_json::Value>,
    response_body: Option<serde_json::Value>,
    status: i16,
) {
    let result = sqlx::query(
        r#"
        INSERT INTO public.audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, request_body, response_body, status, created_at)
        VALUES (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', $1, $2, $3, $4, $5, $6, $7, NOW())
        "#,
    )
    .bind(user_id)
    .bind(action)
    .bind(resource_type)
    .bind(resource_id)
    .bind(request_body)
    .bind(response_body)
    .bind(status)
    .execute(pool)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record audit log: {}", e);
    }
}

pub(crate) fn is_valid_email(email: &str) -> bool {
    EMAIL_REGEX.is_match(email)
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = UserResponse)]
pub(crate) struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub is_active: bool,
    pub is_superuser: bool,
    pub created_at: Option<String>,
}

#[derive(sqlx::FromRow)]
pub(crate) struct UserRow {
    pub id: uuid::Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub status: String,
    pub is_superuser: bool,
    pub created_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub(crate) struct PreferenceRow {
    pub preference_value: serde_json::Value,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_valid_email_valid_cases() {
        assert!(is_valid_email("user@example.com"));
        assert!(is_valid_email("user.name+tag@domain.co.uk"));
        assert!(is_valid_email("admin@company.org"));
        assert!(is_valid_email("test_user123@sub.domain.io"));
        assert!(is_valid_email("a@b.cd"));
    }

    #[test]
    fn test_is_valid_email_invalid_cases() {
        assert!(!is_valid_email("notanemail"));
        assert!(!is_valid_email("@missinguser.com"));
        assert!(!is_valid_email("user@"));
        assert!(!is_valid_email("user@.com"));
        assert!(!is_valid_email("user@domain"));
        assert!(!is_valid_email(""));
        assert!(!is_valid_email("   "));
    }

    #[test]
    fn test_list_users_params() {
        let params = ListUsersParams {
            page: Some(2),
            page_size: Some(50),
        };
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(50));
    }

    #[test]
    fn test_list_users_params_default_none() {
        let params = ListUsersParams {
            page: None,
            page_size: None,
        };
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_user_response_clone_and_serde() {
        let ur = UserResponse {
            id: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            full_name: Some("Test User".to_string()),
            role: "user".to_string(),
            roles: vec!["user".to_string(), "editor".to_string()],
            permissions: vec!["doc:read".to_string()],
            is_active: true,
            is_superuser: false,
            created_at: Some("2024-01-15T10:30:00Z".to_string()),
        };
        let cloned = ur.clone();
        assert_eq!(cloned.username, "testuser");
        assert_eq!(cloned.roles.len(), 2);

        let json = serde_json::to_string(&ur).unwrap();
        let de: UserResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, ur.id);
        assert_eq!(de.is_active, true);
        assert!(de.full_name.is_some());
    }

    #[test]
    fn test_preference_row() {
        let row = PreferenceRow {
            preference_value: serde_json::json!({"theme": "dark", "lang": "zh-CN"}),
        };
        assert_eq!(row.preference_value["theme"], "dark");
        assert_eq!(row.preference_value["lang"], "zh-CN");
    }
}
