//! 测试辅助工具集（仅在测试场景下使用）。
//!
//! 包含：
//! - `redis_pubsub`：通用 Redis Pub/Sub 集成测试工具（prepare_subscription + wait_for_match 两阶段 API）

pub mod redis_pubsub;
