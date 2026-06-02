use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, PartialEq)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: Option<String>,
    pub name: String,
    pub is_superuser: bool,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}
