use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};

lazy_static! {
    static ref EMAIL_REGEX: Regex =
        Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
}

#[derive(Debug, Deserialize)]
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

#[derive(Debug, Clone, Serialize)]
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
