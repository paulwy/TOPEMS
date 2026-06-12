// IM 服务缓存模块
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};

/// 缓存条目
struct CacheEntry<V> {
    value: V,
    expires_at: Option<Instant>,
}

impl<V> CacheEntry<V> {
    fn new(value: V, ttl_seconds: Option<u64>) -> Self {
        let expires_at = ttl_seconds.map(|ttl| Instant::now() + Duration::from_secs(ttl));
        Self { value, expires_at }
    }

    fn is_expired(&self) -> bool {
        self.expires_at.map(|exp| Instant::now() > exp).unwrap_or(false)
    }
}

/// IM 服务缓存
pub struct ImCacheService {
    // 消息缓存
    message_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    // 聊天室缓存
    chat_room_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    // 联系人缓存
    contact_cache: Arc<RwLock<HashMap<String, CacheEntry<serde_json::Value>>>>,
    // 在线状态缓存
    online_status_cache: Arc<RwLock<HashMap<String, CacheEntry<bool>>>>,
    // 未读消息数缓存
    unread_count_cache: Arc<RwLock<HashMap<String, CacheEntry<i64>>>>,
    // 默认 TTL（秒）
    default_ttl: u64,
}

impl Default for ImCacheService {
    fn default() -> Self {
        Self::new()
    }
}

impl ImCacheService {
    pub fn new() -> Self {
        Self {
            message_cache: Arc::new(RwLock::new(HashMap::new())),
            chat_room_cache: Arc::new(RwLock::new(HashMap::new())),
            contact_cache: Arc::new(RwLock::new(HashMap::new())),
            online_status_cache: Arc::new(RwLock::new(HashMap::new())),
            unread_count_cache: Arc::new(RwLock::new(HashMap::new())),
            default_ttl: 3600, // 默认 1 小时
        }
    }

    // ==================== 消息缓存 ====================

    /// 获取消息缓存
    pub async fn get_message(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.message_cache.read().await;
        cache.get(id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }

    /// 设置消息缓存
    pub async fn set_message(&self, id: &str, message: serde_json::Value) {
        let mut cache = self.message_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(message, Some(self.default_ttl)));
    }

    /// 删除消息缓存
    pub async fn delete_message(&self, id: &str) {
        let mut cache = self.message_cache.write().await;
        cache.remove(id);
    }

    /// 清空消息缓存
    pub async fn clear_messages(&self) {
        let mut cache = self.message_cache.write().await;
        cache.clear();
    }

    // ==================== 聊天室缓存 ====================

    /// 获取聊天室缓存
    pub async fn get_chat_room(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.chat_room_cache.read().await;
        cache.get(id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }

    /// 设置聊天室缓存
    pub async fn set_chat_room(&self, id: &str, chat_room: serde_json::Value) {
        let mut cache = self.chat_room_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(chat_room, Some(self.default_ttl)));
    }

    /// 删除聊天室缓存
    pub async fn delete_chat_room(&self, id: &str) {
        let mut cache = self.chat_room_cache.write().await;
        cache.remove(id);
    }

    // ==================== 联系人缓存 ====================

    /// 获取联系人缓存
    pub async fn get_contact(&self, id: &str) -> Option<serde_json::Value> {
        let cache = self.contact_cache.read().await;
        cache.get(id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }

    /// 设置联系人缓存
    pub async fn set_contact(&self, id: &str, contact: serde_json::Value) {
        let mut cache = self.contact_cache.write().await;
        cache.insert(id.to_string(), CacheEntry::new(contact, Some(self.default_ttl)));
    }

    // ==================== 在线状态缓存 ====================

    /// 获取用户在线状态
    pub async fn get_online_status(&self, user_id: &str) -> Option<bool> {
        let cache = self.online_status_cache.read().await;
        cache.get(user_id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value)
            }
        })
    }

    /// 设置用户在线状态
    pub async fn set_online_status(&self, user_id: &str, is_online: bool) {
        let mut cache = self.online_status_cache.write().await;
        // 在线状态缓存默认 5 分钟
        cache.insert(user_id.to_string(), CacheEntry::new(is_online, Some(300)));
    }

    /// 删除用户在线状态
    pub async fn delete_online_status(&self, user_id: &str) {
        let mut cache = self.online_status_cache.write().await;
        cache.remove(user_id);
    }

    // ==================== 未读消息数缓存 ====================

    /// 获取未读消息数
    pub async fn get_unread_count(&self, user_id: &str) -> Option<i64> {
        let cache = self.unread_count_cache.read().await;
        cache.get(user_id).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value)
            }
        })
    }

    /// 设置未读消息数
    pub async fn set_unread_count(&self, user_id: &str, count: i64) {
        let mut cache = self.unread_count_cache.write().await;
        // 未读消息数缓存默认 1 分钟
        cache.insert(user_id.to_string(), CacheEntry::new(count, Some(60)));
    }

    /// 递增未读消息数
    pub async fn increment_unread_count(&self, user_id: &str) {
        let mut cache = self.unread_count_cache.write().await;
        let current = cache.get(user_id).map(|e| e.value).unwrap_or(0);
        cache.insert(user_id.to_string(), CacheEntry::new(current + 1, Some(60)));
    }

    /// 清零未读消息数
    pub async fn clear_unread_count(&self, user_id: &str) {
        let mut cache = self.unread_count_cache.write().await;
        cache.insert(user_id.to_string(), CacheEntry::new(0, Some(60)));
    }

    // ==================== 统计信息 ====================

    /// 获取缓存统计信息
    pub async fn get_stats(&self) -> CacheStats {
        let msg_cache = self.message_cache.read().await;
        let room_cache = self.chat_room_cache.read().await;
        let contact_cache = self.contact_cache.read().await;
        let online_cache = self.online_status_cache.read().await;
        let unread_cache = self.unread_count_cache.read().await;

        CacheStats {
            message_count: msg_cache.len(),
            chat_room_count: room_cache.len(),
            contact_count: contact_cache.len(),
            online_status_count: online_cache.len(),
            unread_count_cache: unread_cache.len(),
            default_ttl: self.default_ttl,
        }
    }

    /// 清空所有缓存
    pub async fn clear_all(&self) {
        self.clear_messages().await;
        let mut room = self.chat_room_cache.write().await;
        room.clear();
        let mut contact = self.contact_cache.write().await;
        contact.clear();
        let mut online = self.online_status_cache.write().await;
        online.clear();
        let mut unread = self.unread_count_cache.write().await;
        unread.clear();
    }
}

/// 缓存统计信息
#[derive(Debug, Clone, serde::Serialize)]
pub struct CacheStats {
    pub message_count: usize,
    pub chat_room_count: usize,
    pub contact_count: usize,
    pub online_status_count: usize,
    pub unread_count_cache: usize,
    pub default_ttl: u64,
}
