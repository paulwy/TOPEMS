// 统一使用 shared-core 的 InMemoryCache 实现（moka，接受 Duration 作为 TTL）
pub use topems_shared::LocalInMemoryCache as InMemoryCache;
