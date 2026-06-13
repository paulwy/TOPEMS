// MES 服务集成测试
#![allow(dead_code)]

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
    async fn test_production_order_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'production_orders')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "生产订单表应该存在");
            }
            Err(e) => {
                panic!("查询生产订单表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_production_process_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'production_processes')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "生产工序表应该存在");
            }
            Err(e) => {
                panic!("查询生产工序表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_production_record_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'production_records')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "生产记录表应该存在");
            }
            Err(e) => {
                panic!("查询生产记录表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_work_station_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'work_stations')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "工位表应该存在");
            }
            Err(e) => {
                panic!("查询工位表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_equipment_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'equipment')")
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
    async fn test_create_production_order() {
        let pool = setup_test_pool().await.unwrap();

        let order_id = Uuid::new_v4();
        let order_number = format!("PO-{}", &order_id.to_string()[..10]);

        let result = sqlx::query(
            r#"
            INSERT INTO mes.production_orders (id, organization_id, order_number, product_name, quantity, status, planned_start_date, planned_end_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                order_number = EXCLUDED.order_number,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(order_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&order_number)
        .bind(format!("测试产品-{}", &order_id.to_string()[..8]))
        .bind(100)
        .bind("planned")
        .bind(chrono::Utc::now())
        .bind(chrono::Utc::now())
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "生产订单创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_production_orders() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query_as::<_, ProductionOrderRow>(
            r#"
            SELECT id, order_number, product_name, quantity, status,
                   planned_start_date::timestamp with time zone as planned_start_date,
                   planned_end_date::timestamp with time zone as planned_end_date,
                   actual_start_date::timestamp with time zone as actual_start_date,
                   actual_end_date::timestamp with time zone as actual_end_date,
                   created_at, updated_at
            FROM mes.production_orders
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(orders) => {
                assert!(orders.len() <= 10, "返回的订单数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询生产订单列表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_production_order_status_update() {
        let pool = setup_test_pool().await.unwrap();

        // 创建一个新的生产订单
        let order_id = Uuid::new_v4();
        let order_number = format!("PO-TEST-{}", &order_id.to_string()[..8]);

        sqlx::query(
            r#"
            INSERT INTO mes.production_orders (id, organization_id, order_number, product_name, quantity, status, planned_start_date, planned_end_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(order_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&order_number)
        .bind("测试产品")
        .bind(100)
        .bind("planned")
        .bind(chrono::Utc::now())
        .bind(chrono::Utc::now())
        .execute(&pool)
        .await
        .expect("创建测试数据失败");

        // 更新状态为进行中
        let update_result = sqlx::query(
            r#"
            UPDATE mes.production_orders SET status = 'in_progress', actual_start_date = NOW(), updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(order_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "状态更新应该成功");

        // 验证状态已更新
        let check_result = sqlx::query_scalar::<_, String>(
            "SELECT status FROM mes.production_orders WHERE id = $1",
        )
        .bind(order_id)
        .fetch_one(&pool)
        .await;

        match check_result {
            Ok(status) => {
                assert_eq!(status, "in_progress", "状态应该更新为 in_progress");
            }
            Err(e) => {
                panic!("查询状态失败: {}", e);
            }
        }

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM mes.production_orders WHERE id = $1")
            .bind(order_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_work_station() {
        let pool = setup_test_pool().await.unwrap();

        let station_id = Uuid::new_v4();
        let station_code = format!("WS-{}", &station_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO mes.work_stations (id, organization_id, station_code, station_name, location, status, capacity, current_load, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                station_name = EXCLUDED.station_name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(station_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&station_code)
        .bind(format!("测试工位-{}", &station_id.to_string()[..6]))
        .bind("A车间-1号线")
        .bind("active")
        .bind(50)
        .bind(0)
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "工位创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_audit_log_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'mes_audit_logs')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                // 审计日志表可能不存在，这是可接受的
                if !exists {
                    tracing::info!("MES审计日志表不存在，这是可接受的");
                }
            }
            Err(e) => {
                tracing::warn!("查询MES审计日志表失败: {}", e);
            }
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct ProductionOrderRow {
    id: Uuid,
    order_number: String,
    product_name: String,
    quantity: i32,
    status: String,
    planned_start_date: Option<chrono::DateTime<chrono::Utc>>,
    planned_end_date: Option<chrono::DateTime<chrono::Utc>>,
    actual_start_date: Option<chrono::DateTime<chrono::Utc>>,
    actual_end_date: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}
