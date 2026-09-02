//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 服务: gis | Schema: gis
//! 表来源：db/schema.rs inline CREATE TABLE（21 张表）
//! 说明：TABLE_DEFS 和 SERVICE_SCHEMA 直接引用 db/schema.rs 中的定义，保持单一事实源

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

pub use crate::db::schema::{GIS_SCHEMA as SERVICE_SCHEMA, TABLE_DEFS};

pub const SERVICE_TAG: &str = "gis";

/// 运行 schema 防御检查（启动时调用）
pub async fn run(pool: &PgPool) -> Result<(usize, usize, usize), sqlx::Error> {
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await
}
