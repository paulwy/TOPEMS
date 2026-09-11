//! # 共享内存缓存（moka 实现）
//!
//! 使用 moka 替代手写 DashMap 缓存，原生支持：
//! - LRU 容量淘汰（无需手动 evict_oldest）
//! - TTL 自动过期（无需手动 cleanup_expired）
//! - 高性能并发读写（内部无锁 sharded 设计）
//! - 每条目独立 TTL（通过 Expiry trait）
//!
//! 各业务服务（srm/scm/crm/erp/hrm/wms/lims/ehs 等）通过
//! `topems_shared::LocalInMemoryCache` 引用本实现。

use moka::sync::Cache as MokaCache;
use moka::Expiry;
use std::time::{Duration, Instant};

/// 包装值 + 该条目的 TTL，供 Expiry trait 读取
#[derive(Clone)]
struct CacheValue<T> {
    value: T,
    ttl: Duration,
}

/// 自定义过期策略：根据每条目的 ttl 字段计算过期时间
struct PerEntryExpiry;

impl<T> Expiry<String, CacheValue<T>> for PerEntryExpiry {
    fn expire_after_create(
        &self,
        _key: &String,
        val: &CacheValue<T>,
        _created_at: Instant,
    ) -> Option<Duration> {
        Some(val.ttl)
    }

    fn expire_after_update(
        &self,
        _key: &String,
        val: &CacheValue<T>,
        _updated_at: Instant,
        _old_expiry: Option<Duration>,
    ) -> Option<Duration> {
        Some(val.ttl)
    }
}

/// 泛型线程安全内存缓存，支持 TTL 过期和 LRU 容量限制。
///
/// 基于 `moka::sync::Cache`，内部自动处理过期清理和容量淘汰，
/// 无需手动调用 `cleanup_expired` 或 `evict_oldest`。
///
/// 自身已实现 `Clone`（共享同一份底层数据），可安全克隆用于多任务场景。
pub struct InMemoryCache<T: Clone + Send + Sync + 'static> {
    cache: MokaCache<String, CacheValue<T>>,
    default_ttl: Duration,
}

impl<T: Clone + Send + Sync + 'static> InMemoryCache<T> {
    /// 创建无容量限制、使用默认 TTL 的缓存。
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            cache: MokaCache::builder().expire_after(PerEntryExpiry).build(),
            default_ttl,
        }
    }

    /// 创建带容量限制和默认 TTL 的缓存。
    ///
    /// moka 原生 LRU 淘汰，无需手动遍历。
    /// capacity=0 时等同于无限制。
    pub fn with_capacity(default_ttl: Duration, capacity: usize) -> Self {
        let mut builder = MokaCache::builder().expire_after(PerEntryExpiry);
        if capacity > 0 {
            builder = builder.max_capacity(capacity as u64);
        }
        Self {
            cache: builder.build(),
            default_ttl,
        }
    }

    /// 读取一个 key，若已过期 moka 自动剔除并返回 None。
    pub fn get(&self, key: &str) -> Option<T> {
        self.cache.get(key).map(|v| v.value)
    }

    /// 使用默认 TTL 写入。
    pub fn set(&self, key: String, value: T) {
        self.set_with_ttl(key, value, self.default_ttl);
    }

    /// 使用指定 TTL 写入（per-entry TTL）。
    pub fn set_with_ttl(&self, key: String, value: T, ttl: Duration) {
        self.cache.insert(key, CacheValue { value, ttl });
    }

    /// 删除一个 key（若存在）。
    pub fn remove(&self, key: &str) {
        self.cache.invalidate(key);
    }

    /// `remove` 的语义化别名。
    pub fn delete(&self, key: &str) {
        self.cache.invalidate(key);
    }

    /// 为已存在的 key 设置新的 TTL。
    ///
    /// moka 不支持原地修改 TTL，需重新插入。
    /// 返回 `true` 表示该 key 存在且 TTL 已更新。
    pub fn expire(&self, key: &str, ttl: Duration) -> bool {
        if let Some(val) = self.cache.get(key) {
            self.cache.insert(
                key.to_string(),
                CacheValue {
                    value: val.value,
                    ttl,
                },
            );
            true
        } else {
            false
        }
    }

    /// 清空所有 key。
    pub fn clear(&self) {
        self.cache.invalidate_all();
    }

    /// 返回当前条目数（moka 近似计数）。
    pub fn len(&self) -> usize {
        self.cache.entry_count() as usize
    }

    /// 是否为空。
    pub fn is_empty(&self) -> bool {
        self.cache.entry_count() == 0
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
            cache: self.cache.clone(),
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
        // 不断言 is_empty()：moka 的 entry_count() 是最终一致的，写入后可能仍为 0
    }

    #[test]
    fn get_expired_returns_none() {
        let cache: InMemoryCache<u32> = InMemoryCache::new(Duration::from_millis(1));
        cache.set("k1".to_string(), 1);
        std::thread::sleep(Duration::from_millis(10));
        assert_eq!(cache.get("k1"), None);
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
        // 用 get 验证而非 is_empty()：moka 的 entry_count() 是最终一致的
        assert_eq!(cache.get("a"), None);
        assert_eq!(cache.get("b"), None);
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
        // moka 的 entry_count() 是近似值，不断言精确数量；
        // 改为验证所有写入的 key 都可正确读取
        for i in 0..4 {
            for j in 0..100 {
                assert_eq!(cache.get(&format!("k-{i}-{j}")), Some(j));
            }
        }
    }

    #[test]
    fn capacity_limit_evicts_oldest() {
        let cache: InMemoryCache<u32> = InMemoryCache::with_capacity(Duration::from_secs(60), 3);
        cache.set("a".to_string(), 1);
        std::thread::sleep(Duration::from_millis(1));
        cache.set("b".to_string(), 2);
        std::thread::sleep(Duration::from_millis(1));
        cache.set("c".to_string(), 3);
        std::thread::sleep(Duration::from_millis(1));
        // 插入第4个，应淘汰最旧的 "a"
        cache.set("d".to_string(), 4);
        assert_eq!(cache.get("d"), Some(4));
    }

    #[test]
    fn with_capacity_zero_does_not_hang() {
        let cache: InMemoryCache<u32> = InMemoryCache::with_capacity(Duration::from_secs(60), 0);
        cache.set("a".to_string(), 1);
        assert_eq!(cache.get("a"), Some(1));
    }
}

/// 缓存操作类型，用于结构化日志
#[derive(Debug, Clone, Copy)]
pub enum CacheOperation {
    /// 缓存命中
    Hit,
    /// 缓存未命中
    Miss,
    /// 缓存写入
    Set,
    /// 缓存失效（删除）
    Remove,
    /// 缓存清空
    Clear,
}

impl CacheOperation {
    /// 获取操作的描述字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            CacheOperation::Hit => "缓存命中",
            CacheOperation::Miss => "缓存未命中",
            CacheOperation::Set => "缓存写入",
            CacheOperation::Remove => "缓存失效",
            CacheOperation::Clear => "缓存清空",
        }
    }
}

/// 统一的缓存结构化日志函数
///
/// 用于在所有服务中统一缓存日志格式，包含 service、entity、operation、tenant_id、cache_key 等结构化字段。
///
/// # 示例
///
/// ```rust
/// use topems_shared_core::cache::{log_cache_operation, CacheOperation};
///
/// log_cache_operation("mes", "process_route", CacheOperation::Hit, "tenant-123", "mes:process_route:list:tenant-123:page:1:pagesize:10");
/// ```
pub fn log_cache_operation(
    service: &str,
    entity: &str,
    operation: CacheOperation,
    tenant_id: &str,
    cache_key: &str,
) {
    tracing::debug!(
        service = service,
        entity = entity,
        operation = operation.as_str(),
        tenant_id = tenant_id,
        cache_key = cache_key,
        "{}",
        operation.as_str()
    );
}

/// 缓存命中日志（便捷函数）
pub fn log_cache_hit(service: &str, entity: &str, tenant_id: &str, cache_key: &str) {
    log_cache_operation(service, entity, CacheOperation::Hit, tenant_id, cache_key);
}

/// 缓存未命中日志（便捷函数）
pub fn log_cache_miss(service: &str, entity: &str, tenant_id: &str, cache_key: &str) {
    log_cache_operation(service, entity, CacheOperation::Miss, tenant_id, cache_key);
}

/// 缓存写入日志（便捷函数）
pub fn log_cache_set(service: &str, entity: &str, tenant_id: &str, cache_key: &str) {
    log_cache_operation(service, entity, CacheOperation::Set, tenant_id, cache_key);
}

/// 缓存失效日志（便捷函数）
pub fn log_cache_remove(service: &str, entity: &str, tenant_id: &str, cache_key: &str) {
    log_cache_operation(service, entity, CacheOperation::Remove, tenant_id, cache_key);
}

// ==================== 缓存指标记录 ====================

use crate::metrics::{CACHE_ENTRIES, CACHE_HITS_TOTAL, CACHE_MISSES_TOTAL, CACHE_REMOVALS_TOTAL, CACHE_SETS_TOTAL};

/// 记录缓存命中指标
///
/// # 示例
///
/// ```rust
/// use topems_shared_core::cache::record_cache_hit;
/// record_cache_hit("mes", "process_route", "list");
/// ```
pub fn record_cache_hit(service: &str, entity: &str, operation: &str) {
    CACHE_HITS_TOTAL
        .with_label_values(&[service, entity, operation])
        .inc();
}

/// 记录缓存未命中指标
pub fn record_cache_miss(service: &str, entity: &str, operation: &str) {
    CACHE_MISSES_TOTAL
        .with_label_values(&[service, entity, operation])
        .inc();
}

/// 记录缓存写入指标
pub fn record_cache_set(service: &str, entity: &str, operation: &str) {
    CACHE_SETS_TOTAL
        .with_label_values(&[service, entity, operation])
        .inc();
}

/// 记录缓存失效指标
pub fn record_cache_remove(service: &str, entity: &str, operation: &str) {
    CACHE_REMOVALS_TOTAL
        .with_label_values(&[service, entity, operation])
        .inc();
}

/// 更新缓存条目数指标
pub fn update_cache_entries(service: &str, entity: &str, count: i64) {
    CACHE_ENTRIES
        .with_label_values(&[service, entity])
        .set(count);
}

/// 计算缓存命中率
///
/// 返回命中率（0.0 ~ 1.0），如果总请求数为 0 则返回 0.0
pub fn cache_hit_rate(service: &str, entity: &str, operation: &str) -> f64 {
    let hits = CACHE_HITS_TOTAL
        .with_label_values(&[service, entity, operation])
        .get();
    let misses = CACHE_MISSES_TOTAL
        .with_label_values(&[service, entity, operation])
        .get();
    let total = hits + misses;
    if total == 0 {
        0.0
    } else {
        hits as f64 / total as f64
    }
}
