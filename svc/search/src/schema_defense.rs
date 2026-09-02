//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 服务: search | Schema: public
//! 说明：search 使用 Elasticsearch 作为主存储，无 PostgreSQL 业务表，
//!       仅使用 shared-bootstrap 提供的审计日志表。

use sqlx::PgPool;
use topems_shared::schema::run_schema_defense;

pub const SERVICE_SCHEMA: &str = "public";
pub const SERVICE_TAG: &str = "search";

/// search 无独立 PG 业务表（使用 Elasticsearch），TABLE_DEFS 为空。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[];

/// 运行 schema 防御检查（启动时调用）
pub async fn run(pool: &PgPool) -> Result<(usize, usize, usize), sqlx::Error> {
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await
}
