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
        let title = format!("测试报告-{}", &report_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO report.reports (id, organization_id, title, report_type, content, status, config, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, '{}', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(report_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&title)
        .bind("monthly")
        .bind("这是一个测试报告的内容")
        .bind("draft")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "报告创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_reports() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, title, report_type, status, created_at
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
    async fn test_report_status_update() {
        let pool = setup_test_pool().await.unwrap();

        // 创建一个新的报告
        let report_id = Uuid::new_v4();
        let title = format!("状态更新测试-{}", &report_id.to_string()[..8]);

        sqlx::query(
            r#"
            INSERT INTO report.reports (id, organization_id, title, report_type, content, status, config, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, '{}', NOW(), NOW())
            "#,
        )
        .bind(report_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&title)
        .bind("monthly")
        .bind("测试描述")
        .bind("draft")
        .execute(&pool)
        .await
        .expect("创建测试数据失败");

        // 更新状态为已发布
        let update_result = sqlx::query(
            r#"
            UPDATE report.reports SET status = 'published', updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(report_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "状态更新应该成功");

        // 验证状态已更新
        let check_result =
            sqlx::query_scalar::<_, String>("SELECT status FROM report.reports WHERE id = $1")
                .bind(report_id)
                .fetch_one(&pool)
                .await;

        match check_result {
            Ok(status) => {
                assert_eq!(status, "published", "状态应该更新为已发布");
            }
            Err(e) => {
                panic!("查询状态失败: {}", e);
            }
        }
    }
}
