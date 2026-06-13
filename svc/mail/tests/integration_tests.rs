// Mail 服务集成测试
#![allow(dead_code)]
#![allow(unused_imports)]

use sqlx::{PgPool, Row};
use uuid::Uuid;
use serde_json::json;

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
    async fn test_emails_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mail' AND table_name = 'emails')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "邮件表应该存在");
            }
            Err(e) => {
                panic!("查询邮件表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_email_templates_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mail' AND table_name = 'email_templates')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "邮件模板表应该存在");
            }
            Err(e) => {
                panic!("查询邮件模板表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_email() {
        let pool = setup_test_pool().await.unwrap();

        let email_id = Uuid::new_v4();
        let subject = format!("测试邮件-{}", &email_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO mail.emails (id, organization_id, from_address, to_addresses, subject, body, status, created_at)
            VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
                subject = EXCLUDED.subject,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(email_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind("sender@test.com")
        .bind("[\"recipient@test.com\"]")
        .bind(&subject)
        .bind("这是一封测试邮件的内容")
        .bind("pending")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "邮件创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_emails() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, from_address, to_addresses, subject, status, created_at
            FROM mail.emails
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(emails) => {
                assert!(emails.len() <= 10, "返回的邮件数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询邮件列表失败: {}", e);
            }
        }
    }
}
