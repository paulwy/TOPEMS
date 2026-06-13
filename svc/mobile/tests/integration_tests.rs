// Mobile 服务集成测试
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
    async fn test_patrol_records_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mobile' AND table_name = 'patrol_records')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "巡检记录表应该存在");
            }
            Err(e) => {
                panic!("查询巡检记录表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_mobile_tasks_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mobile' AND table_name = 'mobile_tasks')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "移动任务表应该存在");
            }
            Err(e) => {
                panic!("查询移动任务表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_patrol_record() {
        let pool = setup_test_pool().await.unwrap();

        let record_id = Uuid::new_v4();
        let title = format!("测试巡检-{}", &record_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO mobile.patrol_records (id, title, location_lat, location_lng, patrol_type, status, checked_by, checked_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title
            RETURNING id
            "#,
        )
        .bind(record_id)
        .bind(&title)
        .bind(31.2304)
        .bind(121.4737)
        .bind("routine")
        .bind("pending")
        .bind("test_user")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "巡检记录创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_patrol_records() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, title, patrol_type, status, checked_by, created_at
            FROM mobile.patrol_records
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(records) => {
                assert!(records.len() <= 10, "返回的巡检记录数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询巡检记录列表失败: {}", e);
            }
        }
    }
}
