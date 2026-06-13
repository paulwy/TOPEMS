// Notification 服务集成测试
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
    async fn test_notifications_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'notification' AND table_name = 'notifications')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "通知表应该存在");
            }
            Err(e) => {
                panic!("查询通知表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_templates_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'notification' AND table_name = 'notification_templates')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "通知模板表应该存在");
            }
            Err(e) => {
                panic!("查询通知模板表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_archived_notifications_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'notification' AND table_name = 'archived_notifications')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "归档通知表应该存在");
            }
            Err(e) => {
                panic!("查询归档通知表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_notification() {
        let pool = setup_test_pool().await.unwrap();

        let notification_id = Uuid::new_v4();
        let title = format!("测试通知-{}", &notification_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO notification.notifications (id, user_id, notification_type, title, content, is_read, priority, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(notification_id)
        .bind("test_user")
        .bind("system")
        .bind(&title)
        .bind("这是一条测试通知")
        .bind(false)
        .bind(2)
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "通知创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_notifications() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, user_id, notification_type, title, content, is_read, priority, created_at
            FROM notification.notifications
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(notifications) => {
                // 验证查询成功
                assert!(notifications.len() <= 10, "返回的通知数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询通知列表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_notification_status_update() {
        let pool = setup_test_pool().await.unwrap();

        // 创建一个新的通知
        let notification_id = Uuid::new_v4();
        let title = format!("状态更新测试-{}", &notification_id.to_string()[..8]);

        sqlx::query(
            r#"
            INSERT INTO notification.notifications (id, user_id, notification_type, title, content, is_read, priority, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            "#,
        )
        .bind(notification_id)
        .bind("test_user")
        .bind("system")
        .bind(&title)
        .bind("测试描述")
        .bind(false)
        .bind(2)
        .execute(&pool)
        .await
        .expect("创建测试数据失败");

        // 更新状态为已读
        let update_result = sqlx::query(
            r#"
            UPDATE notification.notifications SET is_read = true, read_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(notification_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "状态更新应该成功");

        // 验证状态已更新
        let check_result = sqlx::query_scalar::<_, bool>(
            "SELECT is_read FROM notification.notifications WHERE id = $1",
        )
        .bind(notification_id)
        .fetch_one(&pool)
        .await;

        match check_result {
            Ok(is_read) => {
                assert!(is_read, "状态应该更新为已读");
            }
            Err(e) => {
                panic!("查询状态失败: {}", e);
            }
        }
    }
}
