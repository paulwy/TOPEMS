use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct UserCache {
    users: Arc<RwLock<HashMap<String, CachedUser>>>,
    ttl_seconds: u64,
}

#[derive(Debug, Clone)]
pub struct CachedUser {
    pub username: String,
    pub email: String,
    pub is_active: bool,
    pub is_superuser: bool,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub expires_at: u64,
}

impl UserCache {
    pub fn new(ttl_seconds: u64) -> Self {
        UserCache {
            users: Arc::new(RwLock::new(HashMap::new())),
            ttl_seconds,
        }
    }

    pub async fn get(&self, user_id: &str) -> Option<CachedUser> {
        let users = self.users.read().await;
        if let Some(user) = users.get(user_id) {
            let now = chrono::Utc::now().timestamp() as u64;
            if user.expires_at > now {
                return Some(user.clone());
            }
        }
        None
    }

    pub async fn set(&self, user_id: String, user: CachedUser) {
        let mut users = self.users.write().await;
        users.insert(user_id, user);
    }

    pub async fn invalidate(&self, user_id: &str) {
        let mut users = self.users.write().await;
        users.remove(user_id);
    }

    pub async fn get_or_fetch<F>(&self, user_id: &str, fetch_fn: F) -> Option<CachedUser>
    where
        F: FnOnce() -> Option<CachedUser>,
    {
        if let Some(user) = self.get(user_id).await {
            return Some(user);
        }
        
        if let Some(user) = fetch_fn() {
            self.set(user_id.to_string(), user.clone()).await;
            return Some(user);
        }
        
        None
    }

    pub async fn clear_expired(&self) {
        let mut users = self.users.write().await;
        let now = chrono::Utc::now().timestamp() as u64;
        users.retain(|_, user| user.expires_at > now);
    }
}
