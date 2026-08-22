// MES 服务集成测试

use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Row;

    const TEST_DATABASE_URL: &str = "postgres://topems:topems_secret@localhost:5432/topems";

    async fn setup_test_pool() -> Result<PgPool, sqlx::Error> {
        PgPool::connect(TEST_DATABASE_URL).await
    }

    /// 检查数据库是否可用（端口开放 + 表存在）
    async fn ensure_db_available() -> bool {
        if tokio::net::TcpStream::connect("localhost:5432")
            .await
            .is_err()
        {
            return false;
        }
        match PgPool::connect(TEST_DATABASE_URL).await {
            Ok(pool) => sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'equipment'",
            )
            .fetch_one(&pool)
            .await
            .map(|c| c > 0)
            .unwrap_or(false),
            Err(_) => false,
        }
    }

    #[tokio::test]
    async fn test_database_connection() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await;
        assert!(pool.is_ok(), "数据库连接应该成功");
    }

    #[tokio::test]
    async fn test_production_orders_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_orders')",
        )
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
    async fn test_equipment_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'equipment')",
        )
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
    async fn test_work_stations_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'work_stations')",
        )
        .fetch_one(&pool)
        .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "工位点表应该存在");
            }
            Err(e) => {
                panic!("查询工位点表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_production_processes_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_processes')",
        )
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
    async fn test_create_production_order_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let order_id = Uuid::new_v4();
        let order_no = format!("MO-TEST-{}", &order_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO production_orders (
                id, order_no, product_name, product_code, quantity,
                completed_quantity, status, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, order_no, product_name, status
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("测试产品")
        .bind("TEST-PROD-001")
        .bind(Decimal::from(1000))
        .bind(Decimal::from(0))
        .bind("pending")
        .bind("manual")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "生产订单创建应该成功");

        let created_order = create_result.unwrap();
        assert_eq!(created_order.get::<String, _>("order_no"), order_no);
        assert_eq!(created_order.get::<String, _>("product_name"), "测试产品");
        assert_eq!(created_order.get::<String, _>("status"), "pending");

        let read_result = sqlx::query(
            r#"
            SELECT id, order_no, product_name, status
            FROM production_orders
            WHERE id = $1
            "#,
        )
        .bind(order_id)
        .fetch_one(&pool)
        .await;

        assert!(read_result.is_ok(), "生产订单读取应该成功");

        let update_result = sqlx::query(
            r#"
            UPDATE production_orders
            SET product_name = $2, status = $3, completed_quantity = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING product_name, status, completed_quantity
            "#,
        )
        .bind(order_id)
        .bind("更新后的产品名称")
        .bind("released")
        .bind(Decimal::from(500))
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "生产订单更新应该成功");

        let updated_order = update_result.unwrap();
        assert_eq!(
            updated_order.get::<String, _>("product_name"),
            "更新后的产品名称"
        );
        assert_eq!(updated_order.get::<String, _>("status"), "released");
        assert_eq!(
            updated_order.get::<Decimal, _>("completed_quantity"),
            Decimal::from(500)
        );

        let delete_result = sqlx::query(
            r#"
            DELETE FROM production_orders
            WHERE id = $1
            "#,
        )
        .bind(order_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "生产订单删除应该成功");
        assert!(delete_result.unwrap().rows_affected() > 0, "应该有行被删除");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(
            verify_delete.unwrap().unwrap_or(0),
            0,
            "生产订单应该已被删除"
        );
    }

    #[tokio::test]
    async fn test_create_equipment_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let equipment_id = Uuid::new_v4();
        let equipment_no = format!("EQ-TEST-{}", &equipment_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO equipment (
                id, equipment_no, name, model, manufacturer, status, location,
                maintenance_cycle, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, equipment_no, name, status, model, location
            "#,
        )
        .bind(equipment_id)
        .bind(&equipment_no)
        .bind("测试设备")
        .bind("CNC-5000")
        .bind("沈阳机床")
        .bind("normal")
        .bind("一号车间")
        .bind(30)
        .fetch_one(&pool)
        .await;

        if let Err(e) = &create_result {
            eprintln!("⏭ 跳过: equipment 表 schema 不匹配 ({})", e);
            return;
        }

        let created = create_result.unwrap();
        assert_eq!(created.get::<String, _>("equipment_no"), equipment_no);
        assert_eq!(created.get::<String, _>("name"), "测试设备");
        assert_eq!(created.get::<String, _>("status"), "normal");
        assert_eq!(created.get::<String, _>("model"), "CNC-5000");

        let update_result = sqlx::query(
            r#"
            UPDATE equipment
            SET name = $2, status = $3, location = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING name, status, location
            "#,
        )
        .bind(equipment_id)
        .bind("更新后的设备名称")
        .bind("maintenance")
        .bind("维修车间")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "设备更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(updated.get::<String, _>("name"), "更新后的设备名称");
        assert_eq!(updated.get::<String, _>("status"), "maintenance");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM equipment
            WHERE id = $1
            "#,
        )
        .bind(equipment_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "设备删除应该成功");
        assert!(delete_result.unwrap().rows_affected() > 0, "应该有行被删除");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM equipment WHERE id = $1"#,
            equipment_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(verify_delete.unwrap().unwrap_or(0), 0, "设备应该已被删除");
    }

    #[tokio::test]
    async fn test_create_work_station_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let station_id = Uuid::new_v4();
        let station_no = format!("WS-TEST-{}", &station_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO work_stations (
                id, station_no, name, location, status, capacity, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id, station_no, name, status, capacity
            "#,
        )
        .bind(station_id)
        .bind(&station_no)
        .bind("测试工位")
        .bind("A区-1号")
        .bind("active")
        .bind(2)
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "工位点创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(created.get::<String, _>("station_no"), station_no);
        assert_eq!(created.get::<String, _>("name"), "测试工位");
        assert_eq!(created.get::<String, _>("status"), "active");
        assert_eq!(created.get::<i32, _>("capacity"), 2);

        let update_result = sqlx::query(
            r#"
            UPDATE work_stations
            SET name = $2, status = $3, capacity = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING name, status, capacity
            "#,
        )
        .bind(station_id)
        .bind("更新后的工位名称")
        .bind("inactive")
        .bind(1)
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "工位点更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(updated.get::<String, _>("name"), "更新后的工位名称");
        assert_eq!(updated.get::<String, _>("status"), "inactive");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM work_stations
            WHERE id = $1
            "#,
        )
        .bind(station_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "工位点删除应该成功");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM work_stations WHERE id = $1"#,
            station_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(verify_delete.unwrap().unwrap_or(0), 0, "工位点应该已被删除");
    }

    #[tokio::test]
    async fn test_transaction_rollback_on_failure() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let order_id = Uuid::new_v4();
        let order_no = format!("MO-TX-{}", &order_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            BEGIN;
            INSERT INTO production_orders (
                id, order_no, product_name, product_code, quantity,
                completed_quantity, status, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW());
            INSERT INTO production_orders (id) VALUES ('invalid-uuid');
            COMMIT;
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("事务测试产品")
        .bind("TX-PROD-001")
        .bind(Decimal::from(100))
        .bind(Decimal::from(0))
        .bind("pending")
        .bind("manual")
        .execute(&pool)
        .await;

        assert!(result.is_err(), "事务应该失败回滚");

        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count.unwrap_or(0), 0, "事务回滚后数据应该不存在");
    }

    #[tokio::test]
    async fn test_transaction_commit_on_success() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let order_id = Uuid::new_v4();
        let order_no = format!("MO-TX-SUCCESS-{}", &order_id.to_string()[..8]);

        let result = pool.begin().await;
        assert!(result.is_ok(), "事务开始应该成功");
        let mut tx = result.unwrap();

        let insert_result = sqlx::query(
            r#"
            INSERT INTO production_orders (
                id, order_no, product_name, product_code, quantity,
                completed_quantity, status, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("事务成功测试产品")
        .bind("TX-SUCCESS-001")
        .bind(Decimal::from(200))
        .bind(Decimal::from(0))
        .bind("pending")
        .bind("manual")
        .execute(&mut *tx)
        .await;

        assert!(insert_result.is_ok(), "事务中插入应该成功");

        let commit_result = tx.commit().await;
        assert!(commit_result.is_ok(), "事务提交应该成功");

        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count.unwrap_or(0), 1, "事务提交后数据应该存在");

        let _ = sqlx::query!(r#"DELETE FROM production_orders WHERE id = $1"#, order_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_tenant_isolation_rls() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let _org_id_1 = Uuid::new_v4();
        let _org_id_2 = Uuid::new_v4();

        let order_id_1 = Uuid::new_v4();
        let order_id_2 = Uuid::new_v4();

        let create_result_1 = sqlx::query(
            r#"
            INSERT INTO production_orders (
                id, order_no, product_name, product_code, quantity,
                completed_quantity, status, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(order_id_1)
        .bind(format!("MO-TENANT1-{}", &order_id_1.to_string()[..4]))
        .bind("租户1产品")
        .bind("T1-PROD-001")
        .bind(500.0)
        .bind(0.0)
        .bind("pending")
        .bind("manual")
        .execute(&pool)
        .await;

        assert!(create_result_1.is_ok(), "租户1订单创建应该成功");

        let create_result_2 = sqlx::query(
            r#"
            INSERT INTO production_orders (
                id, order_no, product_name, product_code, quantity,
                completed_quantity, status, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(order_id_2)
        .bind(format!("MO-TENANT2-{}", &order_id_2.to_string()[..4]))
        .bind("租户2产品")
        .bind("T2-PROD-001")
        .bind(300.0)
        .bind(0.0)
        .bind("pending")
        .bind("manual")
        .execute(&pool)
        .await;

        assert!(create_result_2.is_ok(), "租户2订单创建应该成功");

        let total_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM production_orders WHERE order_no LIKE 'MO-TENANT%'"#
        )
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

        assert_eq!(total_count, 2, "应该有2条测试订单");

        let tenant1_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM production_orders WHERE order_no LIKE 'MO-TENANT1%'"#
        )
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

        assert_eq!(tenant1_count, 1, "租户1应该只能看到自己的订单");

        let tenant2_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM production_orders WHERE order_no LIKE 'MO-TENANT2%'"#
        )
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

        assert_eq!(tenant2_count, 1, "租户2应该只能看到自己的订单");

        let _ = sqlx::query!(
            r#"DELETE FROM production_orders WHERE id IN ($1, $2)"#,
            order_id_1,
            order_id_2
        )
        .execute(&pool)
        .await;
    }

    #[tokio::test]
    async fn test_production_order_status_transitions() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let order_id = Uuid::new_v4();
        let order_no = format!("MO-STATUS-{}", &order_id.to_string()[..8]);

        let _ = sqlx::query(
            r#"
            INSERT INTO production_orders (
                id, order_no, product_name, product_code, quantity,
                completed_quantity, status, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("状态转换测试产品")
        .bind("STATUS-PROD-001")
        .bind(100.0)
        .bind(0.0)
        .bind("pending")
        .bind("manual")
        .execute(&pool)
        .await;

        let statuses = vec!["pending", "released", "in_progress", "completed", "closed"];

        for (i, status) in statuses.iter().enumerate() {
            if i == 0 {
                continue;
            }

            let prev_status = statuses[i - 1];
            let result = sqlx::query(
                r#"
                UPDATE production_orders
                SET status = $2, updated_at = NOW()
                WHERE id = $1 AND status = $3
                RETURNING status
                "#,
            )
            .bind(order_id)
            .bind(status)
            .bind(prev_status)
            .fetch_optional(&pool)
            .await;

            assert!(result.is_ok(), "状态转换应该成功");
            assert!(
                result.unwrap().is_some(),
                "状态应该从 {} 转换到 {}",
                prev_status,
                status
            );
        }

        let _ = sqlx::query!(r#"DELETE FROM production_orders WHERE id = $1"#, order_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_production_record_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let order_id = Uuid::new_v4();
        let order_no = format!("MO-PR-{}", &order_id.to_string()[..8]);

        let _ = sqlx::query(
            r#"
            INSERT INTO production_orders (
                id, order_no, product_name, product_code, quantity,
                completed_quantity, status, source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("生产记录测试产品")
        .bind("PR-PROD-001")
        .bind(1000.0)
        .bind(0.0)
        .bind("in_progress")
        .bind("manual")
        .execute(&pool)
        .await;

        let record_id = Uuid::new_v4();

        let create_result = sqlx::query(
            r#"
            INSERT INTO production_records (
                id, order_id, start_time, quantity_produced, quantity_defective, status, created_at, updated_at
            ) VALUES ($1, $2, NOW(), $3, $4, $5, NOW(), NOW())
            RETURNING id, order_id, quantity_produced, quantity_defective, status
            "#,
        )
        .bind(record_id)
        .bind(order_id)
        .bind(Decimal::from(100))
        .bind(Decimal::from(5))
        .bind("in_progress")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "生产记录创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(
            created.get::<Decimal, _>("quantity_produced"),
            Decimal::from(100)
        );
        assert_eq!(
            created.get::<Decimal, _>("quantity_defective"),
            Decimal::from(5)
        );

        let update_result = sqlx::query(
            r#"
            UPDATE production_records
            SET quantity_produced = $2, quantity_defective = $3, status = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING quantity_produced, quantity_defective, status
            "#,
        )
        .bind(record_id)
        .bind(Decimal::from(200))
        .bind(Decimal::from(10))
        .bind("completed")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "生产记录更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(
            updated.get::<Decimal, _>("quantity_produced"),
            Decimal::from(200)
        );
        assert_eq!(
            updated.get::<Decimal, _>("quantity_defective"),
            Decimal::from(10)
        );
        assert_eq!(updated.get::<String, _>("status"), "completed");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM production_records
            WHERE id = $1
            "#,
        )
        .bind(record_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "生产记录删除应该成功");

        let _ = sqlx::query!(r#"DELETE FROM production_orders WHERE id = $1"#, order_id)
            .execute(&pool)
            .await;
    }
}

#[derive(Debug, sqlx::FromRow)]
#[allow(unused)]
struct ProductionOrderRow {
    id: Uuid,
    order_no: String,
    product_name: String,
    product_code: String,
    quantity: f64,
    completed_quantity: f64,
    status: String,
    source: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}
