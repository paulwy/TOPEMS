use std::time::Duration;
use topems_shared::{cache::InMemoryCache, CacheConfig};

#[tokio::test]
async fn test_in_memory_cache_get_set() {
    let cache = InMemoryCache::new(CacheConfig::default());

    let key = "test_key";
    let value = "test_value";

    cache
        .set(
            key.to_string(),
            value.to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;
    let result = cache.get(key).await;

    assert!(result.is_some());
    assert_eq!(result.unwrap(), value);
}

#[tokio::test]
async fn test_in_memory_cache_get_nonexistent() {
    let cache = InMemoryCache::new(CacheConfig::default());

    let result = cache.get("nonexistent_key").await;

    assert!(result.is_none());
}

#[tokio::test]
async fn test_in_memory_cache_delete() {
    let cache = InMemoryCache::new(CacheConfig::default());

    let key = "test_key_to_delete";
    let value = "test_value";

    cache
        .set(
            key.to_string(),
            value.to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;

    let result_before = cache.get(key).await;
    assert!(result_before.is_some());

    cache.delete(key).await;

    let result_after = cache.get(key).await;
    assert!(result_after.is_none());
}

#[tokio::test]
async fn test_in_memory_cache_ttl() {
    let cache = InMemoryCache::new(CacheConfig::default());

    let key = "test_ttl_key";
    let value = "test_ttl_value";

    cache
        .set(
            key.to_string(),
            value.to_string(),
            Some(Duration::from_secs(1)),
        )
        .await;

    let result_before = cache.get(key).await;
    assert!(result_before.is_some());

    tokio::time::sleep(Duration::from_secs(2)).await;

    let result_after = cache.get(key).await;
    assert!(result_after.is_none());
}

#[tokio::test]
async fn test_in_memory_cache_exists() {
    let cache = InMemoryCache::new(CacheConfig::default());

    let key = "test_exists_key";

    let result_before = cache.exists(key).await;
    assert!(!result_before);

    cache
        .set(
            key.to_string(),
            "value".to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;

    let result_after = cache.exists(key).await;
    assert!(result_after);
}

#[tokio::test]
async fn test_in_memory_cache_clear() {
    let cache = InMemoryCache::new(CacheConfig::default());

    cache
        .set(
            "key1".to_string(),
            "value1".to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;
    cache
        .set(
            "key2".to_string(),
            "value2".to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;

    cache.clear().await;

    assert!(cache.get("key1").await.is_none());
    assert!(cache.get("key2").await.is_none());
}

#[tokio::test]
async fn test_in_memory_cache_eviction() {
    let config = CacheConfig {
        memory_cache_size: 2,
        ..Default::default()
    };

    let cache = InMemoryCache::new(config);

    cache
        .set(
            "key1".to_string(),
            "value1".to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;
    cache
        .set(
            "key2".to_string(),
            "value2".to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;

    assert!(cache.get("key1").await.is_some());
    assert!(cache.get("key2").await.is_some());

    cache
        .set(
            "key3".to_string(),
            "value3".to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;

    assert!(cache.get("key3").await.is_some());
    assert!(cache.get("key2").await.is_some());
}

#[tokio::test]
async fn test_in_memory_cache_stats() {
    let cache = InMemoryCache::new(CacheConfig::default());

    cache
        .set(
            "key1".to_string(),
            "value1".to_string(),
            Some(Duration::from_secs(3600)),
        )
        .await;
    cache.get("key1").await;
    cache.get("key1").await;
    cache.get("nonexistent").await;

    let stats = cache.get_statistics();

    assert_eq!(stats.hit_count, 2);
    assert_eq!(stats.miss_count, 1);
    assert_eq!(stats.total_entries, 1);
}
