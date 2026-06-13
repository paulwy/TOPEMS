// Report 服务集成测试
#![allow(dead_code)]
#![allow(unused_imports)]

use sqlx::{PgPool, Row};
use uuid::Uuid;

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_DATABASE_URL: &str = "postgres://topems:topems_secret@localhost:5432/topems";
    const TEST_ORGANIZATION_ID: &str = "00000000-0000-0000-0000-000000000001";

    async fn setup_test_pool() -> Result<PgPool, sqlx::Error> {
        PgPool::connect(TEST_DATABASE_URL).await
    }

    #[tokio::test]
    async fn test_database_connection() {
        let pool = setup_test_pool().await;
        assert!(pool.is_ok(), "数据库连接应该成功");
    }

    #[tokio::test]
    async fn test_reports_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'report' AND table_name = 'reports')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "报告表应该存在");
            }
            Err(e) => {
                panic!("查询报告表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_report_templates_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'report' AND table_name = 'report_templates')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "报告模板表应该存在");
            }
            Err(e) => {
                panic!("查询报告模板表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_report() {
        let pool = setup_test_pool().await.unwrap();

        let report_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO report.reports (id, config, row_count, created_at, updated_at)
            VALUES ($1, $2::jsonb, $3, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                row_count = EXCLUDED.row_count,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(report_id)
        .bind("{}")
        .bind(0)
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "报告创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_reports() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, row_count, created_at
            FROM report.reports
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(reports) => {
                assert!(reports.len() <= 10, "返回的报告数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询报告列表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_report_update() {
        let pool = setup_test_pool().await.unwrap();

        // 创建一个新的报告
        let report_id = Uuid::new_v4();

        sqlx::query(
            r#"
            INSERT INTO report.reports (id, config, row_count, created_at, updated_at)
            VALUES ($1, $2::jsonb, $3, NOW(), NOW())
            "#,
        )
        .bind(report_id)
        .bind("{}")
        .bind(0)
        .execute(&pool)
        .await
        .expect("创建测试数据失败");

        // 更新 row_count
        let update_result = sqlx::query(
            r#"
            UPDATE report.reports SET row_count = row_count + 1, updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(report_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "更新应该成功");

        // 验证更新
        let check_result =
            sqlx::query_scalar::<_, i32>("SELECT row_count FROM report.reports WHERE id = $1")
                .bind(report_id)
                .fetch_one(&pool)
                .await;

        match check_result {
            Ok(row_count) => {
                assert_eq!(row_count, 1, "row_count 应该更新为 1");
            }
            Err(e) => {
                panic!("查询失败: {}", e);
            }
        }
    }
}
