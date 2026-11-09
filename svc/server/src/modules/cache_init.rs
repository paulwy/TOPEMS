//! 单体形态多级缓存（L1 moka + L2 Redis）统一初始化。
//!
//! 背景：各 real_module 此前统一调用 `AsyncL2Cache::new_l1_only`，单体进程从不读取
//! `REDIS_URL`，导致 L2 缓存从未启用——只有 60s 进程内 moka，`CacheInvalidated`
//! 事件发往一个不存在的 L2 落点。本模块统一为：有 `REDIS_URL` 即接入 L2；
//! 缺失或连接失败时打明确日志再降级纯 L1，不再静默。

use std::sync::Arc;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};

/// 构建模块缓存，返回 `Arc<AsyncL2Cache<T>>`。
///
/// `label` 仅用于日志定位（如 `"erp:dict"`）。
pub async fn build_l2_cache<T>(label: &str, config: L2CacheConfig) -> Arc<AsyncL2Cache<T>>
where
    T: Clone + Send + Sync + 'static,
{
    let redis_url = std::env::var("REDIS_URL")
        .ok()
        .filter(|v| !v.trim().is_empty());

    let Some(redis_url) = redis_url else {
        tracing::error!(
            "REDIS_URL 未设置：模块缓存 [{}] 降级为纯 L1（仅 60s 进程内），\
             L2 未启用、CacheInvalidated 跨实例失效广播无效",
            label
        );
        return Arc::new(AsyncL2Cache::new_l1_only(config));
    };

    match AsyncL2Cache::try_new(config, Some(redis_url.as_str())).await {
        Ok(cache) => {
            tracing::info!("✅ 模块缓存 [{}] 已启用 Redis L2", label);
            Arc::new(cache)
        }
        Err((cache, warn_msg)) => {
            tracing::error!(
                "模块缓存 [{}] 连接 Redis L2 失败，降级为纯 L1（跨实例失效广播无效）: {}",
                label,
                warn_msg
            );
            Arc::new(cache)
        }
    }
}
