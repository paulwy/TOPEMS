//! Shared Module - 跨模块共享的基础数据服务
//!
//! 此模块是被其他服务引用的库包，提供:
//! - 数据库迁移脚本 (migrations/)
//! - 共享数据访问函数
//! - 编码生成器

pub mod code_mapping;
pub mod sync_log;
pub mod code_sequence;

use sqlx::PgPool;

/// 初始化共享数据库
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 运行 shared schema 的所有迁移
    sqlx::migrate!("../shared/migrations")
        .run(pool)
        .await?;

    tracing::info!("Shared module database initialized");
    Ok(())
}
