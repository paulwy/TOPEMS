use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockUser {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockAuthToken {
    pub token: String,
    pub user_id: String,
    pub expires_at: String,
}

pub struct MockAuth {
    users: Vec<MockUser>,
    tokens: Vec<MockAuthToken>,
}

impl MockAuth {
    pub fn new() -> Self {
        MockAuth {
            users: vec![
                MockUser {
                    id: "1".to_string(),
                    username: "admin".to_string(),
                    email: "admin@topems.com".to_string(),
                    role: "admin".to_string(),
                    permissions: vec![
                        "read".to_string(),
                        "write".to_string(),
                        "delete".to_string(),
                        "admin".to_string(),
                    ],
                },
                MockUser {
                    id: "2".to_string(),
                    username: "user".to_string(),
                    email: "user@topems.com".to_string(),
                    role: "user".to_string(),
                    permissions: vec![
                        "read".to_string(),
                        "write".to_string(),
                    ],
                },
                MockUser {
                    id: "3".to_string(),
                    username: "guest".to_string(),
                    email: "guest@topems.com".to_string(),
                    role: "guest".to_string(),
                    permissions: vec![
                        "read".to_string(),
                    ],
                },
            ],
            tokens: vec![],
        }
    }

    pub fn authenticate(&mut self, username: &str, password: &str) -> Option<String> {
        if password == "password" || password == "admin123" || password == "user123" || password == "guest123" {
            if let Some(user) = self.users.iter().find(|u| u.username == username) {
                let token = format!("mock_token_{}_{}", user.id, uuid::Uuid::new_v4());
                self.tokens.push(MockAuthToken {
                    token: token.clone(),
                    user_id: user.id.clone(),
                    expires_at: "2026-12-31".to_string(),
                });
                return Some(token);
            }
        }
        None
    }

    pub fn validate_token(&self, token: &str) -> Option<&MockUser> {
        if let Some(auth_token) = self.tokens.iter().find(|t| t.token == token) {
            return self.users.iter().find(|u| u.id == auth_token.user_id);
        }
        None
    }

    pub fn invalidate_token(&mut self, token: &str) -> bool {
        let initial_len = self.tokens.len();
        self.tokens.retain(|t| t.token != token);
        self.tokens.len() < initial_len
    }

    pub fn has_permission(&self, token: &str, permission: &str) -> bool {
        if let Some(user) = self.validate_token(token) {
            user.permissions.contains(&permission.to_string())
        } else {
            false
        }
    }

    pub fn add_user(&mut self, user: MockUser) {
        self.users.push(user);
    }

    pub fn remove_user(&mut self, user_id: &str) -> bool {
        let initial_len = self.users.len();
        self.users.retain(|u| u.id != user_id);
        self.users.len() < initial_len
    }

    pub fn get_user(&self, username: &str) -> Option<&MockUser> {
        self.users.iter().find(|u| u.username == username)
    }
}

impl Default for MockAuth {
    fn default() -> Self {
        Self::new()
    }
}
