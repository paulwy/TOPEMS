use topems_shared::{cache::{CacheService, InMemoryCache}, config::CacheConfig};
use std::time::Duration;
use tokio;

#[tokio::test]
async fn test_in_memory_cache_get_set() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    let key = "test_key";
    let value = "test_value";
    
    cache.set(key, value, Some(3600)).await.unwrap();
    let result = cache.get(key).await.unwrap();
    
    assert!(result.is_some());
    assert_eq!(result.unwrap(), value);
}

#[tokio::test]
async fn test_in_memory_cache_get_nonexistent() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    let result = cache.get("nonexistent_key").await.unwrap();
    
    assert!(result.is_none());
}

#[tokio::test]
async fn test_in_memory_cache_delete() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    let key = "test_key_to_delete";
    let value = "test_value";
    
    cache.set(key, value, Some(3600)).await.unwrap();
    
    let result_before = cache.get(key).await.unwrap();
    assert!(result_before.is_some());
    
    cache.delete(key).await.unwrap();
    
    let result_after = cache.get(key).await.unwrap();
    assert!(result_after.is_none());
}

#[tokio::test]
async fn test_in_memory_cache_ttl() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    let key = "test_ttl_key";
    let value = "test_ttl_value";
    
    cache.set(key, value, Some(1)).await.unwrap();
    
    let result_before = cache.get(key).await.unwrap();
    assert!(result_before.is_some());
    
    tokio::time::sleep(Duration::from_secs(2)).await;
    
    let result_after = cache.get(key).await.unwrap();
    assert!(result_after.is_none());
}

#[tokio::test]
async fn test_in_memory_cache_incr_decr() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    let key = "counter";
    
    let result = cache.incr(key).await.unwrap();
    assert_eq!(result, 1);
    
    let result = cache.incr(key).await.unwrap();
    assert_eq!(result, 2);
    
    let result = cache.decr(key).await.unwrap();
    assert_eq!(result, 1);
    
    let result = cache.decr(key).await.unwrap();
    assert_eq!(result, 0);
}

#[tokio::test]
async fn test_in_memory_cache_exists() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    let key = "test_exists_key";
    
    let result_before = cache.exists(key).await.unwrap();
    assert!(!result_before);
    
    cache.set(key, "value", Some(3600)).await.unwrap();
    
    let result_after = cache.exists(key).await.unwrap();
    assert!(result_after);
}

#[tokio::test]
async fn test_in_memory_cache_clear() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    cache.set("key1", "value1", Some(3600)).await.unwrap();
    cache.set("key2", "value2", Some(3600)).await.unwrap();
    
    cache.clear().await.unwrap();
    
    assert!(cache.get("key1").await.unwrap().is_none());
    assert!(cache.get("key2").await.unwrap().is_none());
}

#[tokio::test]
async fn test_in_memory_cache_keys() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    cache.set("user:1", "value1", Some(3600)).await.unwrap();
    cache.set("user:2", "value2", Some(3600)).await.unwrap();
    cache.set("product:1", "value3", Some(3600)).await.unwrap();
    
    let keys = cache.keys("user:*").await.unwrap();
    
    assert_eq!(keys.len(), 2);
    assert!(keys.contains(&"user:1".to_string()));
    assert!(keys.contains(&"user:2".to_string()));
}

#[tokio::test]
async fn test_in_memory_cache_eviction() {
    let mut config = CacheConfig::default();
    config.memory_cache_size = 2;
    
    let cache = InMemoryCache::new(config);
    
    cache.set("key1", "value1", Some(3600)).await.unwrap();
    cache.set("key2", "value2", Some(3600)).await.unwrap();
    
    assert!(cache.get("key1").await.unwrap().is_some());
    assert!(cache.get("key2").await.unwrap().is_some());
    
    cache.set("key3", "value3", Some(3600)).await.unwrap();
    
    assert!(cache.get("key3").await.unwrap().is_some());
    assert!(cache.get("key2").await.unwrap().is_some());
}

#[tokio::test]
async fn test_in_memory_cache_stats() {
    let cache = InMemoryCache::new(CacheConfig::default());
    
    cache.set("key1", "value1", Some(3600)).await.unwrap();
    cache.get("key1").await.unwrap();
    cache.get("key1").await.unwrap();
    cache.get("nonexistent").await.unwrap();
    
    let stats = cache.get_stats().await.unwrap();
    
    assert_eq!(stats.hits, 2);
    assert_eq!(stats.misses, 1);
    assert_eq!(stats.keys, 1);
}