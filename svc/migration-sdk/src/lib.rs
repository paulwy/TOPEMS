//! TOPEMS Migration SDK
//!
//! 为插件提供标准化的数据库迁移能力，支持：
//! - 版本化管理迁移脚本
//! - 分布式锁机制防止并发冲突
//! - 回滚支持
//! - 执行历史记录

pub mod error;
pub mod executor;
pub mod lock;
pub mod migration;
pub mod history;
pub mod runner;

pub use error::MigrationError;
pub use executor::{MigrationExecutor, ExecutorConfig};
pub use migration::{Migration, MigrationScript, MigrationStatus, MigrationBundle, SqlMigration};
pub use history::MigrationHistory;
pub use runner::MigrationRunner;
pub use lock::DistLock;
