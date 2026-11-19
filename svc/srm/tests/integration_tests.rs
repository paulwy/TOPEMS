#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![cfg(feature = "db-tests")]
// SRM 服务集成测试

#[cfg(test)]
mod tests {
    use sqlx::postgres::PgPoolOptions;
    use uuid::Uuid;

    /// 检查数据库是否可用
    fn test_database_url() -> String {
        std::env::var("TEST_DATABASE_URL").expect(
            "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
        )
    }

    async fn ensure_db_available() -> bool {
        tokio::net::TcpStream::connect("localhost:5432")
            .await
            .is_ok()
    }

    // 测试数据库连接
    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_database_connection() {
        assert!(
            ensure_db_available().await,
            "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
        );
        let database_url = test_database_url();

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await;

        assert!(pool.is_ok(), "数据库连接应该成功");
    }

    // 测试供应商创建
    // 需要实际的数据库连接和表结构
    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_create_supplier() {
        assert!(
            ensure_db_available().await,
            "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
        );
        let database_url = test_database_url();

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let supplier_id = Uuid::new_v4();
        let supplier_no = format!("SUP-{}", &supplier_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO srm.suppliers (id, supplier_no, name, category, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(supplier_id)
        .bind(&supplier_no)
        .bind("测试供应商")
        .bind("原材料")
        .bind("active")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "供应商创建应该成功");
    }

    // 测试供应商列表查询
    // 需要实际的数据库连接和表结构
    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_list_suppliers() {
        assert!(
            ensure_db_available().await,
            "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
        );
        let database_url = test_database_url();

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let result = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM srm.suppliers WHERE status != 'deleted'",
        )
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "供应商列表查询应该成功");
    }

    // 测试审计日志记录
    // 需要实际的数据库连接和表结构
    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_audit_log() {
        assert!(
            ensure_db_available().await,
            "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
        );
        let database_url = test_database_url();

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, status)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind("create")
        .bind("supplier")
        .bind(Uuid::new_v4())
        .bind(Uuid::new_v4())
        .bind("success")
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "审计日志记录应该成功");
    }

    // 测试供应商分类统计
    // 需要实际的数据库连接和表结构
    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_supplier_category_stats() {
        assert!(
            ensure_db_available().await,
            "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过"
        );
        let database_url = test_database_url();

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let result = sqlx::query_as::<_, (String, i64)>(
            "SELECT category, COUNT(*) FROM srm.suppliers WHERE status != 'deleted' GROUP BY category"
        )
        .fetch_all(&pool)
        .await;

        assert!(result.is_ok(), "供应商分类统计应该成功");
    }
}
