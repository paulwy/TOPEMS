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
    async fn test_devices_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mobile' AND table_name = 'devices')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "设备表应该存在");
            }
            Err(e) => {
                panic!("查询设备表失败: {}", e);
            }
        }
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
    async fn test_tasks_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mobile' AND table_name = 'tasks')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "任务表应该存在");
            }
            Err(e) => {
                panic!("查询任务表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_device() {
        let pool = setup_test_pool().await.unwrap();

        let device_id = Uuid::new_v4();
        let device_name = format!("测试设备-{}", &device_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO mobile.devices (id, organization_id, device_name, device_type, user_id, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                device_name = EXCLUDED.device_name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(device_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&device_name)
        .bind("mobile")
        .bind("test_user")
        .bind("active")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "设备创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_devices() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, device_name, device_type, user_id, status, created_at
            FROM mobile.devices
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(devices) => {
                assert!(devices.len() <= 10, "返回的设备数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询设备列表失败: {}", e);
            }
        }
    }
}
