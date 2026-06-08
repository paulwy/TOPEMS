use axum::{Json, extract::Query};
use serde::{Deserialize, Serialize};
use crate::models::User;

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: User,
}

pub async fn login(Json(params): Json<LoginQuery>) -> Json<LoginResponse> {
    tracing::debug!("Login attempt for user: {}", params.username);
    
    Json(LoginResponse {
        token: "jwt_token_example".to_string(),
        user: User {
            id: uuid::Uuid::new_v4(),
            username: params.username,
            email: "user@example.com".to_string(),
            password_hash: "".to_string(),
            is_active: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        },
    })
}

#[derive(Debug, Deserialize)]
pub struct LoginQuery {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct ListUsersResponse {
    pub users: Vec<User>,
    pub total: u64,
}

pub async fn list_users() -> Json<ListUsersResponse> {
    Json(ListUsersResponse {
        users: vec![],
        total: 0,
    })
}
