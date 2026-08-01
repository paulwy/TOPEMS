//! # 共享内存缓存
//!
//! 提供线程安全、支持 TTL 过期的泛型内存缓存实现。
//!
//! 各业务服务（srm/scm/crm/erp/hrm/wms/lims/ehs 等）原先各自维护
//! 一份 `InMemoryCache<T>` 实现，逻辑完全相同。本模块将其抽取到
//! shared-core 中统一维护，消除重复代码并保证行为一致。
//!
//! ## API
//!
//! - `new(default_ttl)` / `with_capacity(default_ttl, _)` / `default()`
//! - `get(&str) -> Option<T>`
//! - `set(String, T)` / `set_with_ttl(String, T, Duration)`
//! - `remove(&str)` / `delete(&str)`（别名）
//! - `expire(&str, Duration)` 更新单个 key 的 TTL
//! - `clear()` / `len()` / `is_empty()`
//!
//! 所有方法均通过 `Arc<DashMap<...>>` 提供并发安全访问，
//! 适合在 `Arc<InMemoryCache<T>>` 形式下跨任务/线程共享。

use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// 缓存条目，存储值与绝对过期时间。
#[derive(Clone)]
struct CacheEntry<T> {
    value: T,
    expires_at: Instant,
}

/// 泛型线程安全内存缓存，支持 TTL 过期。
///
/// 内部使用 `Arc<DashMap<String, CacheEntry<T>>>` 实现，
/// 自身已实现 `Clone`（共享同一份底层数据），可安全克隆用于多任务场景。
pub struct InMemoryCache<T: Clone + Send + Sync + 'static> {
    cache: Arc<DashMap<String, CacheEntry<T>>>,
    default_ttl: Duration,
}

impl<T: Clone + Send + Sync + 'static> InMemoryCache<T> {
    /// 创建一个具有默认 TTL 的空缓存。
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            cache: Arc::new(DashMap::new()),
            default_ttl,
        }
    }

    /// 与 `new` 等价，保留 `_capacity` 参数仅为 API 兼容。
    ///
    /// 当前实现未限制容量；保留形参以避免调用点改动。
    pub fn with_capacity(default_ttl: Duration, _capacity: usize) -> Self {
        Self::new(default_ttl)
    }

    /// 读取一个 key，若已过期则惰性删除并返回 `None`。
    pub fn get(&self, key: &str) -> Option<T> {
        if let Some(entry) = self.cache.get(key) {
            if entry.expires_at > Instant::now() {
                return Some(entry.value.clone());
            }
            drop(entry);
            self.cache.remove(key);
        }
        None
    }

    /// 使用默认 TTL 写入一个 key。
    pub fn set(&self, key: String, value: T) {
        self.set_with_ttl(key, value, self.default_ttl);
    }

    /// 使用指定 TTL 写入一个 key。
    pub fn set_with_ttl(&self, key: String, value: T, ttl: Duration) {
        let entry = CacheEntry {
            value,
            expires_at: Instant::now() + ttl,
        };
        self.cache.insert(key, entry);
    }

    /// 删除一个 key（若存在）。
    pub fn remove(&self, key: &str) {
        self.cache.remove(key);
    }

    /// `remove` 的语义化别名。
    pub fn delete(&self, key: &str) {
        self.remove(key);
    }

    /// 为已存在的 key 设置新的 TTL。
    ///
    /// 返回 `true` 表示该 key 存在且 TTL 已更新；
    /// 返回 `false` 表示该 key 不存在（不做任何改动）。
    pub fn expire(&self, key: &str, ttl: Duration) -> bool {
        if let Some(mut entry) = self.cache.get_mut(key) {
            entry.expires_at = Instant::now() + ttl;
            true
        } else {
            false
        }
    }

    /// 清空所有 key。
    pub fn clear(&self) {
        self.cache.clear();
    }

    /// 返回当前条目数（含尚未惰性清理的过期条目）。
    pub fn len(&self) -> usize {
        self.cache.len()
    }

    /// 是否为空。
    pub fn is_empty(&self) -> bool {
        self.cache.is_empty()
    }
}

impl<T: Clone + Send + Sync + 'static> Default for InMemoryCache<T> {
    fn default() -> Self {
        Self::new(Duration::from_secs(300))
    }
}

impl<T: Clone + Send + Sync + 'static> Clone for InMemoryCache<T> {
    fn clone(&self) -> Self {
        Self {
            cache: Arc::clone(&self.cache),
            default_ttl: self.default_ttl,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn set_and_get_within_ttl() {
        let cache: InMemoryCache<u32> = InMemoryCache::new(Duration::from_secs(60));
        cache.set("k1".to_string(), 42);
        assert_eq!(cache.get("k1"), Some(42));
        assert_eq!(cache.len(), 1);
        assert!(!cache.is_empty());
    }

    #[test]
    fn get_expired_returns_none_and_evicts() {
        let cache: InMemoryCache<u32> = InMemoryCache::new(Duration::from_millis(1));
        cache.set("k1".to_string(), 1);
        std::thread::sleep(Duration::from_millis(10));
        assert_eq!(cache.get("k1"), None);
        assert_eq!(cache.len(), 0);
    }

    #[test]
    fn set_with_ttl_overrides_default() {
        let cache: InMemoryCache<u32> = InMemoryCache::new(Duration::from_secs(60));
        cache.set_with_ttl("k1".to_string(), 1, Duration::from_millis(1));
        std::thread::sleep(Duration::from_millis(10));
        assert_eq!(cache.get("k1"), None);
    }

    #[test]
    fn remove_and_delete_aliases() {
        let cache: InMemoryCache<u32> = InMemoryCache::default();
        cache.set("a".to_string(), 1);
        cache.set("b".to_string(), 2);
        cache.remove("a");
        cache.delete("b");
        assert_eq!(cache.get("a"), None);
        assert_eq!(cache.get("b"), None);
    }

    #[test]
    fn expire_updates_ttl_for_existing_key() {
        let cache: InMemoryCache<u32> = InMemoryCache::new(Duration::from_secs(60));
        cache.set("k".to_string(), 1);
        assert!(cache.expire("k", Duration::from_millis(1)));
        std::thread::sleep(Duration::from_millis(10));
        assert_eq!(cache.get("k"), None);
    }

    #[test]
    fn expire_returns_false_for_missing_key() {
        let cache: InMemoryCache<u32> = InMemoryCache::default();
        assert!(!cache.expire("missing", Duration::from_secs(10)));
    }

    #[test]
    fn clear_removes_all_entries() {
        let cache: InMemoryCache<u32> = InMemoryCache::default();
        cache.set("a".to_string(), 1);
        cache.set("b".to_string(), 2);
        cache.clear();
        assert!(cache.is_empty());
    }

    #[test]
    fn clone_shares_underlying_data() {
        let cache: InMemoryCache<u32> = InMemoryCache::default();
        let cloned = cache.clone();
        cache.set("shared".to_string(), 7);
        assert_eq!(cloned.get("shared"), Some(7));
    }

    #[test]
    fn concurrent_access_is_safe() {
        let cache: InMemoryCache<i32> = InMemoryCache::default();
        let mut handles = vec![];
        for i in 0..4 {
            let c = cache.clone();
            handles.push(thread::spawn(move || {
                for j in 0..100 {
                    c.set(format!("k-{i}-{j}"), j);
                    let _ = c.get(&format!("k-{i}-{j}"));
                }
            }));
        }
        for h in handles {
            h.join().unwrap();
        }
        assert_eq!(cache.len(), 400);
    }
}
