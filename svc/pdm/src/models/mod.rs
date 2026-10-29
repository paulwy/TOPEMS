pub mod audit_log;
pub mod schema_defense;

use sqlx::PgPool;

pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // C-1：运行时自建表 DDL 已移除（迁移权威唯一仲裁），仅保留 Schema 防御：
    // 增量迁移 + 列一致性自检（TABLE_DEFS 运行时校验）
    if let Err(e) = topems_shared_db::schema::run_schema_defense(
        pool,
        self::schema_defense::SERVICE_SCHEMA,
        self::schema_defense::TABLE_DEFS,
        "pdm",
    )
    .await
    {
        tracing::warn!("[pdm schema 防御] 非阻塞警告: {}", e);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_exports() {
        use schema_defense::SERVICE_SCHEMA;
        use schema_defense::TABLE_DEFS;
        let _: &str = SERVICE_SCHEMA;
        assert_eq!(SERVICE_SCHEMA, "pdm");
        assert!(!TABLE_DEFS.is_empty());
    }
}
