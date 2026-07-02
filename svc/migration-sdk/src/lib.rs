//! TOPEMS Migration SDK
//!
//! 为插件提供标准化的数据库迁移能力，支持：
//! - 版本化管理迁移脚本
//! - 分布式锁机制防止并发冲突
//! - 回滚支持
//! - 执行历史记录

pub mod error;
pub mod executor;
pub mod history;
pub mod lock;
pub mod migration;
pub mod runner;

pub use error::MigrationError;
pub use executor::{ExecutorConfig, MigrationExecutor};
pub use history::MigrationHistory;
pub use lock::DistLock;
pub use migration::{Migration, MigrationBundle, MigrationScript, MigrationStatus, SqlMigration};
pub use runner::MigrationRunner;
