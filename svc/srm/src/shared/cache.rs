// 统一使用 shared-core 的 InMemoryCache 实现（接受 Duration 作为 TTL）
// 注意：SRM 服务已迁移到 AsyncL2Cache，此重新导出仅用于测试
#[allow(unused_imports)]
pub use topems_shared_core::cache::InMemoryCache;

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_reexport_set_and_get() {
        let cache: InMemoryCache<String> = InMemoryCache::new(Duration::from_secs(60));
        cache.set("key1".to_string(), "value1".to_string());
        assert_eq!(cache.get("key1"), Some("value1".to_string()));
    }

    #[test]
    fn test_reexport_default() {
        let cache: InMemoryCache<i32> = InMemoryCache::default();
        cache.set("n".to_string(), 42);
        assert_eq!(cache.get("n"), Some(42));
    }

    #[test]
    fn test_reexport_remove() {
        let cache: InMemoryCache<i32> = InMemoryCache::default();
        cache.set("a".to_string(), 1);
        cache.remove("a");
        assert_eq!(cache.get("a"), None);
    }

    #[test]
    fn test_reexport_delete_alias() {
        let cache: InMemoryCache<i32> = InMemoryCache::default();
        cache.set("b".to_string(), 2);
        cache.delete("b");
        assert_eq!(cache.get("b"), None);
    }

    #[test]
    fn test_reexport_clear() {
        let cache: InMemoryCache<i32> = InMemoryCache::default();
        cache.set("a".to_string(), 1);
        cache.set("b".to_string(), 2);
        cache.clear();
        assert_eq!(cache.get("a"), None);
        assert_eq!(cache.get("b"), None);
    }

    #[test]
    fn test_reexport_with_capacity() {
        let cache: InMemoryCache<u32> = InMemoryCache::with_capacity(Duration::from_secs(60), 10);
        cache.set("x".to_string(), 99);
        assert_eq!(cache.get("x"), Some(99));
    }

    #[test]
    fn test_reexport_clone_shares_data() {
        let cache: InMemoryCache<u32> = InMemoryCache::default();
        let cloned = cache.clone();
        cache.set("shared".to_string(), 7);
        assert_eq!(cloned.get("shared"), Some(7));
    }

    #[test]
    fn test_reexport_set_with_ttl() {
        let cache: InMemoryCache<u32> = InMemoryCache::new(Duration::from_secs(60));
        cache.set_with_ttl("short".to_string(), 1, Duration::from_millis(1));
        std::thread::sleep(Duration::from_millis(10));
        assert_eq!(cache.get("short"), None);
    }

    #[test]
    fn test_reexport_expire_existing() {
        let cache: InMemoryCache<u32> = InMemoryCache::new(Duration::from_secs(60));
        cache.set("k".to_string(), 1);
        assert!(cache.expire("k", Duration::from_millis(1)));
        std::thread::sleep(Duration::from_millis(10));
        assert_eq!(cache.get("k"), None);
    }

    #[test]
    fn test_reexport_expire_missing() {
        let cache: InMemoryCache<u32> = InMemoryCache::default();
        assert!(!cache.expire("missing", Duration::from_secs(10)));
    }

    #[test]
    fn test_reexport_get_missing_returns_none() {
        let cache: InMemoryCache<u32> = InMemoryCache::default();
        assert_eq!(cache.get("nonexistent"), None);
    }

    #[test]
    fn test_reexport_overwrite_existing_key() {
        let cache: InMemoryCache<String> = InMemoryCache::default();
        cache.set("k".to_string(), "old".to_string());
        cache.set("k".to_string(), "new".to_string());
        assert_eq!(cache.get("k"), Some("new".to_string()));
    }
}
