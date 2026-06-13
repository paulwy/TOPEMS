// IM 服务集成测试
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
    async fn test_messages_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'im' AND table_name = 'messages')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "消息表应该存在");
            }
            Err(e) => {
                panic!("查询消息表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_chat_rooms_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'im' AND table_name = 'chat_rooms')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "聊天室表应该存在");
            }
            Err(e) => {
                panic!("查询聊天室表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_contacts_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'im' AND table_name = 'contacts')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "联系人表应该存在");
            }
            Err(e) => {
                panic!("查询联系人表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_message() {
        let pool = setup_test_pool().await.unwrap();

        let message_id = Uuid::new_v4();
        let content = format!("测试消息-{}", &message_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO im.messages (id, organization_id, sender_id, sender_name, receiver_id, content, message_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(message_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind("test_sender")
        .bind("测试发送者")
        .bind("test_receiver")
        .bind(&content)
        .bind("text")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "消息创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_messages() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, sender_id, receiver_id, content, message_type, created_at
            FROM im.messages
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(messages) => {
                assert!(messages.len() <= 10, "返回的消息数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询消息列表失败: {}", e);
            }
        }
    }
}
