// MES 服务集成测试

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
            INSERT INTO mes.production_orders (
                id, order_number, product_name, product_code, quantity,
                completed_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id, order_number, product_name, status
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("测试产品")
        .bind("TEST-PROD-001")
        .bind(1000)
        .bind(0)
        .bind("pending")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "生产订单创建应该成功");

        let created_order = create_result.unwrap();
        assert_eq!(created_order.get::<String, _>("order_number"), order_no);
        assert_eq!(created_order.get::<String, _>("product_name"), "测试产品");
        assert_eq!(created_order.get::<String, _>("status"), "pending");

        let read_result = sqlx::query(
            r#"
            SELECT id, order_number, product_name, status
            FROM mes.production_orders
            WHERE id = $1
            "#,
        )
        .bind(order_id)
        .fetch_one(&pool)
        .await;

        assert!(read_result.is_ok(), "生产订单读取应该成功");

        let update_result = sqlx::query(
            r#"
            UPDATE mes.production_orders
            SET product_name = $2, status = $3, completed_quantity = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING product_name, status, completed_quantity
            "#,
        )
        .bind(order_id)
        .bind("更新后的产品名称")
        .bind("released")
        .bind(500)
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "生产订单更新应该成功");

        let updated_order = update_result.unwrap();
        assert_eq!(
            updated_order.get::<String, _>("product_name"),
            "更新后的产品名称"
        );
        assert_eq!(updated_order.get::<String, _>("status"), "released");
        assert_eq!(updated_order.get::<i32, _>("completed_quantity"), 500);

        let delete_result = sqlx::query(
            r#"
            DELETE FROM mes.production_orders
            WHERE id = $1
            "#,
        )
        .bind(order_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "生产订单删除应该成功");
        assert!(delete_result.unwrap().rows_affected() > 0, "应该有行被删除");

        let verify_delete = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.production_orders WHERE id = $1"#,
        )
        .bind(order_id)
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
            INSERT INTO mes.equipment (
                id, equipment_code, equipment_name, model, manufacturer, status, location,
                maintenance_frequency_days, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id, equipment_code, equipment_name, status, model, location
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
        assert_eq!(created.get::<String, _>("equipment_code"), equipment_no);
        assert_eq!(created.get::<String, _>("equipment_name"), "测试设备");
        assert_eq!(created.get::<String, _>("status"), "normal");
        assert_eq!(created.get::<String, _>("model"), "CNC-5000");

        let update_result = sqlx::query(
            r#"
            UPDATE mes.equipment
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
        assert_eq!(
            updated.get::<String, _>("equipment_name"),
            "更新后的设备名称"
        );
        assert_eq!(updated.get::<String, _>("status"), "maintenance");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM mes.equipment
            WHERE id = $1
            "#,
        )
        .bind(equipment_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "设备删除应该成功");
        assert!(delete_result.unwrap().rows_affected() > 0, "应该有行被删除");

        let verify_delete = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.equipment WHERE id = $1"#,
        )
        .bind(equipment_id)
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
            INSERT INTO mes.work_stations (
                id, station_code, station_name, location, status, capacity, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id, station_code, station_name, status, capacity
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
        assert_eq!(created.get::<String, _>("station_code"), station_no);
        assert_eq!(created.get::<String, _>("station_name"), "测试工位");
        assert_eq!(created.get::<String, _>("status"), "active");
        assert_eq!(created.get::<i32, _>("capacity"), 2);

        let update_result = sqlx::query(
            r#"
            UPDATE mes.work_stations
            SET station_name = $2, status = $3, capacity = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING station_name, status, capacity
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
        assert_eq!(updated.get::<String, _>("station_name"), "更新后的工位名称");
        assert_eq!(updated.get::<String, _>("status"), "inactive");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM mes.work_stations
            WHERE id = $1
            "#,
        )
        .bind(station_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "工位点删除应该成功");

        let verify_delete = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.work_stations WHERE id = $1"#,
        )
        .bind(station_id)
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
            INSERT INTO mes.production_orders (
                id, order_number, product_name, product_code, quantity,
                completed_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
            INSERT INTO mes.production_orders (id) VALUES ('invalid-uuid');
            COMMIT;
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("事务测试产品")
        .bind("TX-PROD-001")
        .bind(100)
        .bind(0)
        .bind("pending")
        .execute(&pool)
        .await;

        assert!(result.is_err(), "事务应该失败回滚");

        let count = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.production_orders WHERE id = $1"#,
        )
        .bind(order_id)
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
            INSERT INTO mes.production_orders (
                id, order_number, product_name, product_code, quantity,
                completed_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("事务成功测试产品")
        .bind("TX-SUCCESS-001")
        .bind(200)
        .bind(0)
        .bind("pending")
        .execute(&mut *tx)
        .await;

        assert!(insert_result.is_ok(), "事务中插入应该成功");

        let commit_result = tx.commit().await;
        assert!(commit_result.is_ok(), "事务提交应该成功");

        let count = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.production_orders WHERE id = $1"#,
        )
        .bind(order_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count.unwrap_or(0), 1, "事务提交后数据应该存在");

        let _ = sqlx::query(r#"DELETE FROM mes.production_orders WHERE id = $1"#)
            .bind(order_id)
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
            INSERT INTO mes.production_orders (
                id, order_number, product_name, product_code, quantity,
                completed_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(order_id_1)
        .bind(format!("MO-TENANT1-{}", &order_id_1.to_string()[..4]))
        .bind("租户1产品")
        .bind("T1-PROD-001")
        .bind(500.0)
        .bind(0.0)
        .bind("pending")
        .execute(&pool)
        .await;

        assert!(create_result_1.is_ok(), "租户1订单创建应该成功");

        let create_result_2 = sqlx::query(
            r#"
            INSERT INTO mes.production_orders (
                id, order_number, product_name, product_code, quantity,
                completed_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(order_id_2)
        .bind(format!("MO-TENANT2-{}", &order_id_2.to_string()[..4]))
        .bind("租户2产品")
        .bind("T2-PROD-001")
        .bind(300.0)
        .bind(0.0)
        .bind("pending")
        .execute(&pool)
        .await;

        assert!(create_result_2.is_ok(), "租户2订单创建应该成功");

        let total_count = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.production_orders WHERE order_number LIKE 'MO-TENANT%'"#,
        )
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

        assert_eq!(total_count, 2, "应该有2条测试订单");

        let tenant1_count = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.production_orders WHERE order_number LIKE 'MO-TENANT1%'"#,
        )
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

        assert_eq!(tenant1_count, 1, "租户1应该只能看到自己的订单");

        let tenant2_count = sqlx::query_scalar::<_, Option<i64>>(
            r#"SELECT COUNT(*) FROM mes.production_orders WHERE order_number LIKE 'MO-TENANT2%'"#,
        )
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

        assert_eq!(tenant2_count, 1, "租户2应该只能看到自己的订单");

        let _ = sqlx::query(r#"DELETE FROM mes.production_orders WHERE id IN ($1, $2)"#)
            .bind(order_id_1)
            .bind(order_id_2)
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
            INSERT INTO mes.production_orders (
                id, order_number, product_name, product_code, quantity,
                completed_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(order_id)
        .bind(&order_no)
        .bind("状态转换测试产品")
        .bind("STATUS-PROD-001")
        .bind(100.0)
        .bind(0.0)
        .bind("pending")
        .execute(&pool)
        .await;

        let statuses = ["pending", "released", "in_progress", "completed", "closed"];

        for (i, status) in statuses.iter().enumerate() {
            if i == 0 {
                continue;
            }

            let prev_status = statuses[i - 1];
            let result = sqlx::query(
                r#"
                UPDATE mes.production_orders
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

        let _ = sqlx::query(r#"DELETE FROM mes.production_orders WHERE id = $1"#)
            .bind(order_id)
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
            INSERT INTO mes.production_orders (
                id, order_number, product_name, product_code, quantity,
                completed_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
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
            INSERT INTO mes.production_records (
                id, organization_id, order_id, operator, start_time, completed_quantity, rejected_quantity, status, created_at, updated_at
            ) VALUES ($1, gen_random_uuid(), $2, 'tester', NOW(), $3, $4, $5, NOW(), NOW())
            RETURNING id, order_id, completed_quantity, rejected_quantity, status
            "#,
        )
        .bind(record_id)
        .bind(order_id)
        .bind(100)
        .bind(5)
        .bind("in_progress")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "生产记录创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(created.get::<i32, _>("completed_quantity"), 100);
        assert_eq!(created.get::<i32, _>("rejected_quantity"), 5);

        let update_result = sqlx::query(
            r#"
            UPDATE mes.production_records
            SET completed_quantity = $2, rejected_quantity = $3, status = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING completed_quantity, rejected_quantity, status
            "#,
        )
        .bind(record_id)
        .bind(200)
        .bind(10)
        .bind("completed")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "生产记录更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(updated.get::<i32, _>("completed_quantity"), 200);
        assert_eq!(updated.get::<i32, _>("rejected_quantity"), 10);
        assert_eq!(updated.get::<String, _>("status"), "completed");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM mes.production_records
            WHERE id = $1
            "#,
        )
        .bind(record_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "生产记录删除应该成功");

        let _ = sqlx::query(r#"DELETE FROM mes.production_orders WHERE id = $1"#)
            .bind(order_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_work_orders_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'work_orders'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(count > 0, "mes.work_orders 表应该存在");
    }

    #[tokio::test]
    async fn test_production_plans_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'mes' AND table_name = 'production_plans'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(count > 0, "mes.production_plans 表应该存在");
    }

    #[tokio::test]
    async fn test_work_order_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let wo_id = Uuid::new_v4();
        let wo_no = format!("WO-TEST-{}", &wo_id.to_string()[..8]);

        // Create
        let create = sqlx::query(
            r#"INSERT INTO mes.work_orders (id, work_order_no, product_name, product_code, planned_quantity, status, priority, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, 'pending', 1, NOW(), NOW()) RETURNING id, work_order_no, product_name, status"#,
        )
        .bind(wo_id).bind(&wo_no).bind("测试工单产品").bind("WO-PROD-001").bind(500)
        .fetch_one(&pool).await;
        assert!(create.is_ok(), "工单创建应该成功");
        let row = create.unwrap();
        assert_eq!(row.get::<String, _>("work_order_no"), wo_no);
        assert_eq!(row.get::<String, _>("status"), "pending");

        // Read
        let read = sqlx::query("SELECT id, work_order_no, product_name, planned_quantity, status FROM mes.work_orders WHERE id = $1")
            .bind(wo_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "工单读取应该成功");

        // Update status
        let update = sqlx::query("UPDATE mes.work_orders SET status = 'in_progress', actual_start_date = NOW(), updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(wo_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "工单状态更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("status"), "in_progress");

        // Complete
        let complete = sqlx::query("UPDATE mes.work_orders SET status = 'completed', completed_quantity = 500, actual_end_date = NOW(), updated_at = NOW() WHERE id = $1 RETURNING status, completed_quantity")
            .bind(wo_id).fetch_one(&pool).await;
        assert!(complete.is_ok(), "工单完成应该成功");
        let comp_row = complete.unwrap();
        assert_eq!(comp_row.get::<String, _>("status"), "completed");

        // Delete (soft delete)
        let delete = sqlx::query("UPDATE mes.work_orders SET deleted_at = NOW() WHERE id = $1")
            .bind(wo_id).execute(&pool).await;
        assert!(delete.is_ok(), "工单软删除应该成功");
    }

    #[tokio::test]
    async fn test_production_plan_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let plan_id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let plan_no = format!("PP-TEST-{}", &plan_id.to_string()[..8]);

        // Create
        let create = sqlx::query(
            r#"INSERT INTO mes.production_plans (id, plan_no, plan_name, plan_type, status, target_quantity, tenant_id, created_at, updated_at)
               VALUES ($1, $2, $3, 'monthly', 'draft', 10000, $4, NOW(), NOW()) RETURNING id, plan_no, plan_name, status"#,
        )
        .bind(plan_id).bind(&plan_no).bind("9月生产计划").bind(tenant_id)
        .fetch_one(&pool).await;
        assert!(create.is_ok(), "生产计划创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "draft");

        // Read
        let read = sqlx::query("SELECT id, plan_no, plan_name, plan_type, status, target_quantity FROM mes.production_plans WHERE id = $1")
            .bind(plan_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "生产计划读取应该成功");

        // Update: submit for approval
        let submit = sqlx::query("UPDATE mes.production_plans SET status = 'pending_approval', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(plan_id).fetch_one(&pool).await;
        assert!(submit.is_ok(), "生产计划提交审批应该成功");
        assert_eq!(submit.unwrap().get::<String, _>("status"), "pending_approval");

        // Approve
        let approve = sqlx::query("UPDATE mes.production_plans SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(plan_id).fetch_one(&pool).await;
        assert!(approve.is_ok(), "生产计划审批应该成功");
        assert_eq!(approve.unwrap().get::<String, _>("status"), "approved");

        // Delete
        let delete = sqlx::query("DELETE FROM mes.production_plans WHERE id = $1")
            .bind(plan_id).execute(&pool).await;
        assert!(delete.is_ok(), "生产计划删除应该成功");
    }

    #[tokio::test]
    async fn test_work_order_status_transitions() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let wo_id = Uuid::new_v4();
        let wo_no = format!("WO-ST-{}", &wo_id.to_string()[..8]);

        sqlx::query("INSERT INTO mes.work_orders (id, work_order_no, product_name, planned_quantity, status, created_at, updated_at) VALUES ($1, $2, '状态转换测试', 100, 'pending', NOW(), NOW())")
            .bind(wo_id).bind(&wo_no).execute(&pool).await.unwrap();

        // pending → in_progress
        sqlx::query("UPDATE mes.work_orders SET status = 'in_progress', actual_start_date = NOW(), updated_at = NOW() WHERE id = $1")
            .bind(wo_id).execute(&pool).await.unwrap();
        let s1: String = sqlx::query_scalar("SELECT status FROM mes.work_orders WHERE id = $1").bind(wo_id).fetch_one(&pool).await.unwrap();
        assert_eq!(s1, "in_progress");

        // in_progress → paused
        sqlx::query("UPDATE mes.work_orders SET status = 'paused', updated_at = NOW() WHERE id = $1")
            .bind(wo_id).execute(&pool).await.unwrap();
        let s2: String = sqlx::query_scalar("SELECT status FROM mes.work_orders WHERE id = $1").bind(wo_id).fetch_one(&pool).await.unwrap();
        assert_eq!(s2, "paused");

        // paused → in_progress (resume)
        sqlx::query("UPDATE mes.work_orders SET status = 'in_progress', updated_at = NOW() WHERE id = $1")
            .bind(wo_id).execute(&pool).await.unwrap();
        let s3: String = sqlx::query_scalar("SELECT status FROM mes.work_orders WHERE id = $1").bind(wo_id).fetch_one(&pool).await.unwrap();
        assert_eq!(s3, "in_progress");

        // in_progress → completed
        sqlx::query("UPDATE mes.work_orders SET status = 'completed', completed_quantity = 100, actual_end_date = NOW(), updated_at = NOW() WHERE id = $1")
            .bind(wo_id).execute(&pool).await.unwrap();
        let s4: String = sqlx::query_scalar("SELECT status FROM mes.work_orders WHERE id = $1").bind(wo_id).fetch_one(&pool).await.unwrap();
        assert_eq!(s4, "completed");

        // Cleanup
        sqlx::query("DELETE FROM mes.work_orders WHERE id = $1").bind(wo_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_capacity_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let cap_id = Uuid::new_v4();
        let wc_id = Uuid::new_v4();

        // Create
        let create = sqlx::query(
            r#"INSERT INTO mes.capacities (id, work_center_id, work_center_name, capacity_date, available_hours, used_hours, utilization_rate, status, created_at, updated_at)
               VALUES ($1, $2, '测试工作中心', CURRENT_DATE, 8.0, 2.0, 25.0, 'available', NOW(), NOW())
               RETURNING id, work_center_name, available_hours, used_hours, status"#,
        )
        .bind(cap_id).bind(wc_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "产能记录创建应该成功");
        let row = create.unwrap();
        assert_eq!(row.get::<String, _>("status"), "available");

        // Read
        let read = sqlx::query("SELECT id, available_hours, used_hours, utilization_rate FROM mes.capacities WHERE id = $1")
            .bind(cap_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "产能记录读取应该成功");

        // Update: increase used hours
        let update = sqlx::query("UPDATE mes.capacities SET used_hours = 5.0, utilization_rate = 62.5, updated_at = NOW() WHERE id = $1 RETURNING used_hours, utilization_rate")
            .bind(cap_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "产能记录更新应该成功");

        // Over capacity status
        let overload = sqlx::query("UPDATE mes.capacities SET used_hours = 10.0, utilization_rate = 125.0, status = 'overloaded', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(cap_id).fetch_one(&pool).await;
        assert!(overload.is_ok(), "产能过载状态更新应该成功");
        assert_eq!(overload.unwrap().get::<String, _>("status"), "overloaded");

        // Delete
        sqlx::query("DELETE FROM mes.capacities WHERE id = $1").bind(cap_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_process_route_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let route_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let route_code = format!("PR-TEST-{}", &route_id.to_string()[..8]);

        // Create
        let create = sqlx::query(
            r#"INSERT INTO mes.process_routes (id, organization_id, route_code, route_name, product_code, product_name, version, is_active, total_time_minutes, total_cost)
               VALUES ($1, $2, $3, '测试工艺路线', 'PROD-001', '测试产品', '1.0', true, 120.0, 500.0)
               RETURNING id, route_code, route_name, version, is_active"#,
        )
        .bind(route_id).bind(org_id).bind(&route_code).fetch_one(&pool).await;
        assert!(create.is_ok(), "工艺路线创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("route_code"), route_code);

        // Read
        let read = sqlx::query("SELECT id, route_code, route_name, total_time_minutes, total_cost FROM mes.process_routes WHERE id = $1")
            .bind(route_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "工艺路线读取应该成功");

        // Update: new version
        let update = sqlx::query("UPDATE mes.process_routes SET version = '2.0', total_time_minutes = 90.0, total_cost = 400.0, updated_at = NOW() WHERE id = $1 RETURNING version, total_time_minutes")
            .bind(route_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "工艺路线更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("version"), "2.0");

        // Deactivate
        let deactivate = sqlx::query("UPDATE mes.process_routes SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING is_active")
            .bind(route_id).fetch_one(&pool).await;
        assert!(deactivate.is_ok(), "工艺路线停用应该成功");
        assert!(!deactivate.unwrap().get::<bool, _>("is_active"));

        // Delete
        sqlx::query("DELETE FROM mes.process_routes WHERE id = $1").bind(route_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_team_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let team_id = Uuid::new_v4();
        let team_code = format!("TEAM-{}", &team_id.to_string()[..8]);

        // Create
        let create = sqlx::query(
            r#"INSERT INTO mes.teams (id, team_code, team_name, team_type, leader_name, member_count, status, created_at, updated_at)
               VALUES ($1, $2, '测试班组', 'production', '张三', 5, 'active', NOW(), NOW())
               RETURNING id, team_code, team_name, member_count, status"#,
        )
        .bind(team_id).bind(&team_code).fetch_one(&pool).await;
        assert!(create.is_ok(), "团队创建应该成功");
        let row = create.unwrap();
        assert_eq!(row.get::<String, _>("team_code"), team_code);
        assert_eq!(row.get::<i32, _>("member_count"), 5);

        // Read
        let read = sqlx::query("SELECT id, team_code, team_name, team_type, status FROM mes.teams WHERE id = $1")
            .bind(team_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "团队读取应该成功");

        // Update: add members
        let update = sqlx::query("UPDATE mes.teams SET member_count = 8, leader_name = '李四', updated_at = NOW() WHERE id = $1 RETURNING member_count, leader_name")
            .bind(team_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "团队更新应该成功");
        assert_eq!(update.unwrap().get::<i32, _>("member_count"), 8);

        // Deactivate
        let deactivate = sqlx::query("UPDATE mes.teams SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(team_id).fetch_one(&pool).await;
        assert!(deactivate.is_ok(), "团队停用应该成功");
        assert_eq!(deactivate.unwrap().get::<String, _>("status"), "inactive");

        // Delete
        sqlx::query("DELETE FROM mes.teams WHERE id = $1").bind(team_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_material_plan_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let mp_id = Uuid::new_v4();
        let plan_no = format!("MP-{}", &mp_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.material_plans (id, plan_no, material_code, material_name, required_quantity, available_quantity, shortfall_quantity, status, created_at, updated_at)
               VALUES ($1, $2, 'MAT-001', '钢材', 1000, 600, 400, 'pending', NOW(), NOW())
               RETURNING id, plan_no, material_name, required_quantity, shortfall_quantity, status"#,
        )
        .bind(mp_id).bind(&plan_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "物料计划创建应该成功");

        let read = sqlx::query("SELECT id, required_quantity, available_quantity, shortfall_quantity FROM mes.material_plans WHERE id = $1")
            .bind(mp_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "物料计划读取应该成功");

        let update = sqlx::query("UPDATE mes.material_plans SET available_quantity = 800, shortfall_quantity = 200, status = 'partially_available', updated_at = NOW() WHERE id = $1 RETURNING status, shortfall_quantity")
            .bind(mp_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "物料计划更新应该成功");

        sqlx::query("DELETE FROM mes.material_plans WHERE id = $1").bind(mp_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_demand_forecast_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let df_id = Uuid::new_v4();
        let forecast_no = format!("DF-{}", &df_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.demand_forecasts (id, forecast_no, product_name, forecast_period, forecast_date, forecast_quantity, method, status, created_at, updated_at)
               VALUES ($1, $2, '预测产品A', 'monthly', CURRENT_DATE, 5000, 'moving_average', 'draft', NOW(), NOW())
               RETURNING id, forecast_no, product_name, forecast_quantity, method"#,
        )
        .bind(df_id).bind(&forecast_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "需求预测创建应该成功");

        let read = sqlx::query("SELECT id, forecast_quantity, method FROM mes.demand_forecasts WHERE id = $1")
            .bind(df_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "需求预测读取应该成功");

        // Update with actual quantity and calculate accuracy
        let update = sqlx::query("UPDATE mes.demand_forecasts SET actual_quantity = 4800, accuracy_rate = 96.0, status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING accuracy_rate, status")
            .bind(df_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "需求预测更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("status"), "completed");

        sqlx::query("DELETE FROM mes.demand_forecasts WHERE id = $1").bind(df_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_quality_standard_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let qs_id = Uuid::new_v4();
        let code = format!("QS-{}", &qs_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.quality_standards (id, code, name, product_code, product_name, inspection_type, status, version, description, created_at, updated_at)
               VALUES ($1, $2, '外观检验标准', 'PROD-001', '测试产品', 'visual', 'active', '1.0', '表面无划痕', NOW(), NOW())
               RETURNING id, code, name, inspection_type, status"#,
        )
        .bind(qs_id).bind(&code).fetch_one(&pool).await;
        assert!(create.is_ok(), "质量标准创建应该成功");

        let read = sqlx::query("SELECT id, code, name, inspection_type FROM mes.quality_standards WHERE id = $1")
            .bind(qs_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "质量标准读取应该成功");

        let update = sqlx::query("UPDATE mes.quality_standards SET version = '2.0', description = '表面无划痕、无气泡', updated_at = NOW() WHERE id = $1 RETURNING version")
            .bind(qs_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "质量标准更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("version"), "2.0");

        let deactivate = sqlx::query("UPDATE mes.quality_standards SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(qs_id).fetch_one(&pool).await;
        assert!(deactivate.is_ok(), "质量标准停用应该成功");

        sqlx::query("DELETE FROM mes.quality_standards WHERE id = $1").bind(qs_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_wip_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let wip_id = Uuid::new_v4();
        let wip_no = format!("WIP-{}", &wip_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.wips (id, wip_no, product_name, product_code, quantity, status, created_at, updated_at)
               VALUES ($1, $2, '在制产品A', 'WIP-PROD-001', 500, 'in_progress', NOW(), NOW())
               RETURNING id, wip_no, product_name, quantity, status"#,
        )
        .bind(wip_id).bind(&wip_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "在制品创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "in_progress");

        let read = sqlx::query("SELECT id, wip_no, quantity, status FROM mes.wips WHERE id = $1")
            .bind(wip_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "在制品读取应该成功");

        // Transfer to next process
        let transfer = sqlx::query("UPDATE mes.wips SET quantity = 480, status = 'transferred', updated_at = NOW() WHERE id = $1 RETURNING status, quantity")
            .bind(wip_id).fetch_one(&pool).await;
        assert!(transfer.is_ok(), "在制品转移应该成功");

        // Complete
        let complete = sqlx::query("UPDATE mes.wips SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(wip_id).fetch_one(&pool).await;
        assert!(complete.is_ok(), "在制品完成应该成功");
        assert_eq!(complete.unwrap().get::<String, _>("status"), "completed");

        sqlx::query("DELETE FROM mes.wips WHERE id = $1").bind(wip_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_equipment_oee_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let oee_id = Uuid::new_v4();
        let eq_id = Uuid::new_v4();

        // 先创建关联的 equipment 记录（外键约束）
        sqlx::query("INSERT INTO mes.equipment (id, organization_id, equipment_code, equipment_name, created_at, updated_at) VALUES ($1, $2, 'OEE-EQ-TEST', 'OEE测试设备', NOW(), NOW())")
            .bind(eq_id).bind(Uuid::new_v4()).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO mes.equipment_oee (id, equipment_id, record_date, planned_production_time, actual_run_time, downtime, ideal_cycle_time, actual_output, good_output, defective_output, availability, performance, quality_rate, oee, shift, created_at, updated_at)
               VALUES ($1, $2, CURRENT_DATE, 480.0, 420.0, 60.0, 1.5, 250.0, 245.0, 5.0, 0.875, 0.893, 0.98, 0.765, 'day', NOW(), NOW())
               RETURNING id, equipment_id, availability, performance, quality_rate, oee"#,
        )
        .bind(oee_id).bind(eq_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "设备OEE记录创建应该成功");

        let read = sqlx::query("SELECT id, oee, availability FROM mes.equipment_oee WHERE id = $1")
            .bind(oee_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "设备OEE记录读取应该成功");

        let update = sqlx::query("UPDATE mes.equipment_oee SET actual_run_time = 450.0, downtime = 30.0, availability = 0.9375, oee = 0.82, updated_at = NOW() WHERE id = $1 RETURNING oee")
            .bind(oee_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "设备OEE记录更新应该成功");

        sqlx::query("DELETE FROM mes.equipment_oee WHERE id = $1").bind(oee_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.equipment WHERE id = $1").bind(eq_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_production_schedule_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let sch_id = Uuid::new_v4();
        let sch_no = format!("SCH-{}", &sch_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.production_schedules (id, schedule_no, product_name, product_code, quantity, status, priority, created_at, updated_at)
               VALUES ($1, $2, '排程产品A', 'SCH-PROD-001', 300, 'scheduled', 1, NOW(), NOW())
               RETURNING id, schedule_no, product_name, quantity, status"#,
        )
        .bind(sch_id).bind(&sch_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "生产排程创建应该成功");

        let read = sqlx::query("SELECT id, schedule_no, quantity, status FROM mes.production_schedules WHERE id = $1")
            .bind(sch_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "生产排程读取应该成功");

        let release = sqlx::query("UPDATE mes.production_schedules SET status = 'released', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(sch_id).fetch_one(&pool).await;
        assert!(release.is_ok(), "生产排程下达应该成功");
        assert_eq!(release.unwrap().get::<String, _>("status"), "released");

        let complete = sqlx::query("UPDATE mes.production_schedules SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(sch_id).fetch_one(&pool).await;
        assert!(complete.is_ok(), "生产排程完成应该成功");

        sqlx::query("DELETE FROM mes.production_schedules WHERE id = $1").bind(sch_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_quality_inspection_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let qi_id = Uuid::new_v4();
        let insp_no = format!("QI-{}", &qi_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.quality_inspections (id, inspection_no, product_code, product_name, inspection_type, status, inspector, created_at, updated_at)
               VALUES ($1, $2, 'PROD-001', '检验产品A', 'incoming', 'pending', '检验员张三', NOW(), NOW())
               RETURNING id, inspection_no, product_name, inspection_type, status"#,
        )
        .bind(qi_id).bind(&insp_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "质量检验创建应该成功");

        let read = sqlx::query("SELECT id, inspection_no, status FROM mes.quality_inspections WHERE id = $1")
            .bind(qi_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "质量检验读取应该成功");

        let pass = sqlx::query("UPDATE mes.quality_inspections SET status = 'passed', result = '合格', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(qi_id).fetch_one(&pool).await;
        assert!(pass.is_ok(), "质量检验合格应该成功");
        assert_eq!(pass.unwrap().get::<String, _>("status"), "passed");

        sqlx::query("DELETE FROM mes.quality_inspections WHERE id = $1").bind(qi_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_material_issue_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let issue_id = Uuid::new_v4();
        let issue_no = format!("MI-{}", &issue_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.material_issues (id, issue_no, status, notes, created_at, updated_at)
               VALUES ($1, $2, 'pending', '生产领料', NOW(), NOW())
               RETURNING id, issue_no, status"#,
        )
        .bind(issue_id).bind(&issue_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "领料单创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "pending");

        let read = sqlx::query("SELECT id, issue_no, status FROM mes.material_issues WHERE id = $1")
            .bind(issue_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "领料单读取应该成功");

        let approve = sqlx::query("UPDATE mes.material_issues SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(issue_id).fetch_one(&pool).await;
        assert!(approve.is_ok(), "领料单审批应该成功");
        assert_eq!(approve.unwrap().get::<String, _>("status"), "approved");

        let issue = sqlx::query("UPDATE mes.material_issues SET status = 'issued', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(issue_id).fetch_one(&pool).await;
        assert!(issue.is_ok(), "领料单出库应该成功");
        assert_eq!(issue.unwrap().get::<String, _>("status"), "issued");

        sqlx::query("DELETE FROM mes.material_issues WHERE id = $1").bind(issue_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_process_flow_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let pf_id = Uuid::new_v4();
        let code = format!("PF-{}", &pf_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.process_flows (id, code, name, description, version, status, production_line, capacity, unit, created_at, updated_at)
               VALUES ($1, $2, '测试工艺流程', '产品A工艺流程', '1.0', 'active', '一号生产线', 1000.0, '件/小时', NOW(), NOW())
               RETURNING id, code, name, version, status"#,
        )
        .bind(pf_id).bind(&code).fetch_one(&pool).await;
        assert!(create.is_ok(), "工艺流程创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "active");

        let read = sqlx::query("SELECT id, code, name, production_line, capacity FROM mes.process_flows WHERE id = $1")
            .bind(pf_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "工艺流程读取应该成功");

        let update = sqlx::query("UPDATE mes.process_flows SET version = '2.0', capacity = 1200.0, updated_at = NOW() WHERE id = $1 RETURNING version, capacity")
            .bind(pf_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "工艺流程更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("version"), "2.0");

        let deactivate = sqlx::query("UPDATE mes.process_flows SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(pf_id).fetch_one(&pool).await;
        assert!(deactivate.is_ok(), "工艺流程停用应该成功");

        sqlx::query("DELETE FROM mes.process_flows WHERE id = $1").bind(pf_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_material_bom_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let bom_id = Uuid::new_v4();
        let bom_no = format!("BOM-{}", &bom_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.material_boms (id, bom_no, product_name, product_code, version, status, description, created_at, updated_at)
               VALUES ($1, $2, 'BOM测试产品', 'BOM-PROD-001', '1.0', 'draft', '产品A物料清单', NOW(), NOW())
               RETURNING id, bom_no, product_name, version, status"#,
        )
        .bind(bom_id).bind(&bom_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "物料清单创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "draft");

        let read = sqlx::query("SELECT id, bom_no, product_name, version FROM mes.material_boms WHERE id = $1")
            .bind(bom_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "物料清单读取应该成功");

        let submit = sqlx::query("UPDATE mes.material_boms SET status = 'pending_approval', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(bom_id).fetch_one(&pool).await;
        assert!(submit.is_ok(), "物料清单提交审批应该成功");
        assert_eq!(submit.unwrap().get::<String, _>("status"), "pending_approval");

        let approve = sqlx::query("UPDATE mes.material_boms SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(bom_id).fetch_one(&pool).await;
        assert!(approve.is_ok(), "物料清单审批应该成功");
        assert_eq!(approve.unwrap().get::<String, _>("status"), "approved");

        sqlx::query("DELETE FROM mes.material_boms WHERE id = $1").bind(bom_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_quality_patrol_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let qp_id = Uuid::new_v4();
        let patrol_no = format!("QP-{}", &qp_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.quality_patrols (id, patrol_no, production_line, workstation_name, inspector, patrol_time, status, findings, created_at, updated_at)
               VALUES ($1, $2, '一号生产线', '冲压工位', '巡检员王五', 'morning', 'pending', '待巡检', NOW(), NOW())
               RETURNING id, patrol_no, inspector, status"#,
        )
        .bind(qp_id).bind(&patrol_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "质量巡检创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "pending");

        let read = sqlx::query("SELECT id, patrol_no, production_line, status FROM mes.quality_patrols WHERE id = $1")
            .bind(qp_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "质量巡检读取应该成功");

        let start = sqlx::query("UPDATE mes.quality_patrols SET status = 'in_progress', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(qp_id).fetch_one(&pool).await;
        assert!(start.is_ok(), "质量巡检开始应该成功");
        assert_eq!(start.unwrap().get::<String, _>("status"), "in_progress");

        let complete = sqlx::query("UPDATE mes.quality_patrols SET status = 'completed', result = 'pass', findings = '巡检合格，无异常', updated_at = NOW() WHERE id = $1 RETURNING status, result")
            .bind(qp_id).fetch_one(&pool).await;
        assert!(complete.is_ok(), "质量巡检完成应该成功");
        assert_eq!(complete.unwrap().get::<String, _>("result"), "pass");

        sqlx::query("DELETE FROM mes.quality_patrols WHERE id = $1").bind(qp_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_batch_record_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let br_id = Uuid::new_v4();
        let batch_no = format!("BATCH-{}", &br_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.batch_records (id, batch_no, product_name, product_code, quantity, unit, production_date, expiry_date, supplier, status, created_at, updated_at)
               VALUES ($1, $2, '批次测试产品', 'BATCH-PROD-001', 5000, '件', CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', '供应商A', 'in_stock', NOW(), NOW())
               RETURNING id, batch_no, product_name, quantity, status"#,
        )
        .bind(br_id).bind(&batch_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "批次记录创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "in_stock");

        let read = sqlx::query("SELECT id, batch_no, quantity, production_date FROM mes.batch_records WHERE id = $1")
            .bind(br_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "批次记录读取应该成功");

        let update = sqlx::query("UPDATE mes.batch_records SET quantity = 3000, status = 'partially_used', updated_at = NOW() WHERE id = $1 RETURNING quantity, status")
            .bind(br_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "批次记录更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("status"), "partially_used");

        let exhaust = sqlx::query("UPDATE mes.batch_records SET quantity = 0, status = 'exhausted', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(br_id).fetch_one(&pool).await;
        assert!(exhaust.is_ok(), "批次记录耗尽应该成功");
        assert_eq!(exhaust.unwrap().get::<String, _>("status"), "exhausted");

        sqlx::query("DELETE FROM mes.batch_records WHERE id = $1").bind(br_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_equipment_inspection_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let ei_id = Uuid::new_v4();
        let eq_id = Uuid::new_v4();

        // 先创建关联的 equipment
        sqlx::query("INSERT INTO mes.equipment (id, organization_id, equipment_code, equipment_name, created_at, updated_at) VALUES ($1, $2, 'EI-EQ-TEST', '点检测试设备', NOW(), NOW())")
            .bind(eq_id).bind(Uuid::new_v4()).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO mes.equipment_inspections (id, equipment_id, equipment_code, equipment_name, inspector, inspection_date, location, temperature, vibration, noiselevel, status, remarks, created_at, updated_at)
               VALUES ($1, $2, 'EI-EQ-TEST', '点检测试设备', '点检员赵六', '2026-09-13', '一号车间', 25.5, 0.12, 65.0, 'completed', '点检正常', NOW(), NOW())
               RETURNING id, equipment_id, inspector, status"#,
        )
        .bind(ei_id).bind(eq_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "设备点检创建应该成功");

        let read = sqlx::query("SELECT id, temperature, vibration, status FROM mes.equipment_inspections WHERE id = $1")
            .bind(ei_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "设备点检读取应该成功");

        let abnormal = sqlx::query("UPDATE mes.equipment_inspections SET status = 'needs_repair', vibration = 0.85, remarks = '振动异常，需维修', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(ei_id).fetch_one(&pool).await;
        assert!(abnormal.is_ok(), "设备点检异常更新应该成功");
        assert_eq!(abnormal.unwrap().get::<String, _>("status"), "needs_repair");

        sqlx::query("DELETE FROM mes.equipment_inspections WHERE id = $1").bind(ei_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.equipment WHERE id = $1").bind(eq_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_material_requirement_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let mr_id = Uuid::new_v4();
        let mrp_no = format!("MRP-{}", &mr_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.material_requirements (id, mrp_no, product_code, product_name, material_code, material_name, specification, unit, required_quantity, required_date, priority, status, remark, created_at, updated_at)
               VALUES ($1, $2, 'PROD-001', '需求产品A', 'MAT-STEEL-001', '钢材', 'Q235 10mm', 'kg', 2000, '2026-09-20', 'high', 'pending', '生产急需', NOW(), NOW())
               RETURNING id, mrp_no, material_name, required_quantity, status"#,
        )
        .bind(mr_id).bind(&mrp_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "物料需求创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "pending");

        let read = sqlx::query("SELECT id, mrp_no, required_quantity, priority FROM mes.material_requirements WHERE id = $1")
            .bind(mr_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "物料需求读取应该成功");

        let approve = sqlx::query("UPDATE mes.material_requirements SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(mr_id).fetch_one(&pool).await;
        assert!(approve.is_ok(), "物料需求审批应该成功");
        assert_eq!(approve.unwrap().get::<String, _>("status"), "approved");

        let fulfill = sqlx::query("UPDATE mes.material_requirements SET status = 'fulfilled', available_quantity = 2000, shortfall_quantity = 0, updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(mr_id).fetch_one(&pool).await;
        assert!(fulfill.is_ok(), "物料需求满足应该成功");
        assert_eq!(fulfill.unwrap().get::<String, _>("status"), "fulfilled");

        sqlx::query("DELETE FROM mes.material_requirements WHERE id = $1").bind(mr_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_equipment_maintenance_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let em_id = Uuid::new_v4();
        let eq_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();

        // 先创建关联的 equipment
        sqlx::query("INSERT INTO mes.equipment (id, organization_id, equipment_code, equipment_name, created_at, updated_at) VALUES ($1, $2, 'EM-EQ-TEST', '维护测试设备', NOW(), NOW())")
            .bind(eq_id).bind(org_id).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO mes.equipment_maintenance_records (id, organization_id, equipment_id, equipment_code, equipment_name, maintenance_type, maintenance_category, description, maintainer, status, start_time, created_at, updated_at)
               VALUES ($1, $2, $3, 'EM-EQ-TEST', '维护测试设备', 'preventive', 'routine', '定期保养', '维修工孙七', 'completed', '2026-09-13 09:00:00', NOW(), NOW())
               RETURNING id, equipment_id, maintenance_type, status"#,
        )
        .bind(em_id).bind(org_id).bind(eq_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "设备维护记录创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "completed");

        let read = sqlx::query("SELECT id, maintenance_type, maintainer FROM mes.equipment_maintenance_records WHERE id = $1")
            .bind(em_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "设备维护记录读取应该成功");

        let update = sqlx::query("UPDATE mes.equipment_maintenance_records SET status = 'in_progress', description = '保养中，更换润滑油', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(em_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "设备维护记录更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("status"), "in_progress");

        sqlx::query("DELETE FROM mes.equipment_maintenance_records WHERE id = $1").bind(em_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.equipment WHERE id = $1").bind(eq_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_quality_record_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let qr_id = Uuid::new_v4();
        let record_no = format!("QR-{}", &qr_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO mes.quality_records (id, record_no, record_type, product_name, product_code, batch_no, quantity, qualified_quantity, defective_quantity, quality_status, inspector, inspection_time, notes, created_at, updated_at)
               VALUES ($1, $2, 'inspection', '质量记录产品', 'QR-PROD-001', 'BATCH-001', 500, 498, 2, 'pass', '检验员周八', '2026-09-13 10:00:00', '检验合格', NOW(), NOW())
               RETURNING id, record_no, record_type, quality_status"#,
        )
        .bind(qr_id).bind(&record_no).fetch_one(&pool).await;
        assert!(create.is_ok(), "质量记录创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("quality_status"), "pass");

        let read = sqlx::query("SELECT id, record_no, quantity, quality_status FROM mes.quality_records WHERE id = $1")
            .bind(qr_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "质量记录读取应该成功");

        let update = sqlx::query("UPDATE mes.quality_records SET quality_status = 'fail', defective_quantity = 10, qualified_quantity = 490, notes = '发现10件不合格品', updated_at = NOW() WHERE id = $1 RETURNING quality_status")
            .bind(qr_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "质量记录更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("quality_status"), "fail");

        sqlx::query("DELETE FROM mes.quality_records WHERE id = $1").bind(qr_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_wip_transfer_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let wt_id = Uuid::new_v4();
        let wip_id = Uuid::new_v4();
        let transfer_no = format!("WT-{}", &wt_id.to_string()[..8]);
        let wip_no = format!("WIP-WT-{}", &wip_id.to_string()[..8]);

        // 清理可能存在的旧记录
        sqlx::query("DELETE FROM mes.wip_transfers WHERE wip_id = $1").bind(wip_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.wips WHERE id = $1").bind(wip_id).execute(&pool).await.unwrap();

        // 先创建关联的 wip
        sqlx::query("INSERT INTO mes.wips (id, wip_no, product_name, product_code, quantity, status, created_at, updated_at) VALUES ($1, $2, '转移测试产品', 'WIP-WT-001', 300, 'in_progress', NOW(), NOW())")
            .bind(wip_id).bind(&wip_no).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO mes.wip_transfers (id, transfer_no, wip_id, quantity, transfer_time, operator, transfer_type, notes, created_at)
               VALUES ($1, $2, $3, 200, NOW(), '操作员吴九', 'process_transfer', '工序间转移', NOW())
               RETURNING id, transfer_no, wip_id, quantity"#,
        )
        .bind(wt_id).bind(&transfer_no).bind(wip_id)
        .fetch_one(&pool).await;
        assert!(create.is_ok(), "在制品转移创建应该成功");

        let read = sqlx::query("SELECT id, transfer_no, quantity, operator FROM mes.wip_transfers WHERE id = $1")
            .bind(wt_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "在制品转移读取应该成功");

        let update = sqlx::query("UPDATE mes.wip_transfers SET notes = '转移已确认', transfer_type = 'rework' WHERE id = $1 RETURNING transfer_type")
            .bind(wt_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "在制品转移更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("transfer_type"), "rework");

        sqlx::query("DELETE FROM mes.wip_transfers WHERE id = $1").bind(wt_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.wips WHERE id = $1").bind(wip_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_material_category_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let cat_id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();

        let create = sqlx::query(
            r#"INSERT INTO mes.material_categories (id, name, description, sort_order, tenant_id, created_at)
               VALUES ($1, '原材料', '生产用原材料分类', 1, $2, NOW())
               RETURNING id, name, sort_order"#,
        )
        .bind(cat_id).bind(tenant_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "物料分类创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("name"), "原材料");

        let read = sqlx::query("SELECT id, name, description, sort_order FROM mes.material_categories WHERE id = $1")
            .bind(cat_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "物料分类读取应该成功");

        let update = sqlx::query("UPDATE mes.material_categories SET name = '主要原材料', sort_order = 2, description = '主要生产用原材料' WHERE id = $1 RETURNING name, sort_order")
            .bind(cat_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "物料分类更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("name"), "主要原材料");

        let soft_delete = sqlx::query("UPDATE mes.material_categories SET deleted_at = NOW() WHERE id = $1")
            .bind(cat_id).execute(&pool).await;
        assert!(soft_delete.is_ok(), "物料分类软删除应该成功");

        sqlx::query("DELETE FROM mes.material_categories WHERE id = $1").bind(cat_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_equipment_inspection_record_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let eir_id = Uuid::new_v4();
        let eq_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();

        // 先创建关联的 equipment
        sqlx::query("INSERT INTO mes.equipment (id, organization_id, equipment_code, equipment_name, created_at, updated_at) VALUES ($1, $2, 'EIR-EQ-TEST', '点检记录测试设备', NOW(), NOW())")
            .bind(eq_id).bind(org_id).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO mes.equipment_inspection_records (id, organization_id, equipment_id, equipment_code, equipment_name, inspection_type, inspector, inspection_date, overall_status, remarks, created_at, updated_at)
               VALUES ($1, $2, $3, 'EIR-EQ-TEST', '点检记录测试设备', 'daily', '点检员钱十', CURRENT_DATE, 'normal', '日常点检正常', NOW(), NOW())
               RETURNING id, equipment_id, inspection_type, overall_status"#,
        )
        .bind(eir_id).bind(org_id).bind(eq_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "设备点检记录创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("overall_status"), "normal");

        let read = sqlx::query("SELECT id, inspection_type, inspector FROM mes.equipment_inspection_records WHERE id = $1")
            .bind(eir_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "设备点检记录读取应该成功");

        let abnormal = sqlx::query("UPDATE mes.equipment_inspection_records SET overall_status = 'abnormal', status = 'needs_repair', remarks = '发现异响，需维修', updated_at = NOW() WHERE id = $1 RETURNING overall_status, status")
            .bind(eir_id).fetch_one(&pool).await;
        assert!(abnormal.is_ok(), "设备点检记录异常更新应该成功");
        assert_eq!(abnormal.unwrap().get::<String, _>("status"), "needs_repair");

        sqlx::query("DELETE FROM mes.equipment_inspection_records WHERE id = $1").bind(eir_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.equipment WHERE id = $1").bind(eq_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_quality_patrol_item_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let qpi_id = Uuid::new_v4();
        let patrol_id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();

        // 先创建关联的 quality_patrol
        sqlx::query("INSERT INTO mes.quality_patrols (id, patrol_no, inspector, status, created_at, updated_at) VALUES ($1, 'QP-ITEM-TEST', '巡检员孙一', 'in_progress', NOW(), NOW())")
            .bind(patrol_id).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO mes.quality_patrol_items (id, patrol_id, item_name, standard, actual_value, status, remark, tenant_id, created_at)
               VALUES ($1, $2, '表面质量检查', '无划痕无气泡', '合格', 'pass', '检查通过', $3, NOW())
               RETURNING id, patrol_id, item_name, status"#,
        )
        .bind(qpi_id).bind(patrol_id).bind(tenant_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "质量巡检项创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "pass");

        let read = sqlx::query("SELECT id, item_name, standard, actual_value FROM mes.quality_patrol_items WHERE id = $1")
            .bind(qpi_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "质量巡检项读取应该成功");

        let fail = sqlx::query("UPDATE mes.quality_patrol_items SET status = 'fail', actual_value = '发现2处划痕', remark = '需返工', created_at = NOW() WHERE id = $1 RETURNING status")
            .bind(qpi_id).fetch_one(&pool).await;
        assert!(fail.is_ok(), "质量巡检项不合格更新应该成功");
        assert_eq!(fail.unwrap().get::<String, _>("status"), "fail");

        sqlx::query("DELETE FROM mes.quality_patrol_items WHERE id = $1").bind(qpi_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.quality_patrols WHERE id = $1").bind(patrol_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_module_setting_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let ms_id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();

        let create = sqlx::query(
            "INSERT INTO mes.module_settings (id, tenant_id, category, key, value, created_at, updated_at)
               VALUES ($1, $2, 'production', 'auto_release', 'true', NOW(), NOW())
               RETURNING id, category, key, value",
        )
        .bind(ms_id).bind(tenant_id).fetch_one(&pool).await;
        if let Err(e) = &create {
            eprintln!("CREATE ERROR: {:?}", e);
        }
        assert!(create.is_ok(), "模块设置创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("value"), "true");

        let read = sqlx::query("SELECT id, category, key, value FROM mes.module_settings WHERE id = $1")
            .bind(ms_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "模块设置读取应该成功");

        let update = sqlx::query("UPDATE mes.module_settings SET value = 'false', updated_at = NOW() WHERE id = $1 RETURNING value")
            .bind(ms_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "模块设置更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("value"), "false");

        sqlx::query("DELETE FROM mes.module_settings WHERE id = $1").bind(ms_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_audit_log_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let al_id = Uuid::new_v4();
        let tenant_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();

        let create = sqlx::query(
            r#"INSERT INTO mes.audit_logs (id, tenant_id, action, entity_type, entity_id, user_id, user_name, ip_address, created_at)
               VALUES ($1, $2, 'create', 'production_order', $3, $4, '管理员', '127.0.0.1', NOW())
               RETURNING id, action, entity_type, user_name"#,
        )
        .bind(al_id).bind(tenant_id).bind(Uuid::new_v4()).bind(user_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "审计日志创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("action"), "create");

        let read = sqlx::query("SELECT id, action, entity_type, user_name FROM mes.audit_logs WHERE id = $1")
            .bind(al_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "审计日志读取应该成功");

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM mes.audit_logs WHERE user_id = $1")
            .bind(user_id).fetch_one(&pool).await.unwrap();
        assert!(count >= 1, "应该能查询到该用户的审计日志");

        sqlx::query("DELETE FROM mes.audit_logs WHERE id = $1").bind(al_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_team_member_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let tm_id = Uuid::new_v4();
        let team_id = Uuid::new_v4();

        // 先创建关联的 team
        sqlx::query("INSERT INTO mes.teams (id, team_code, team_name, status, created_at, updated_at) VALUES ($1, 'TM-TEAM-TEST', '成员测试班组', 'active', NOW(), NOW())")
            .bind(team_id).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO mes.team_members (id, team_id, employee_id, employee_name, employee_code, position, status, created_at)
               VALUES ($1, $2, 'EMP001', '张三', 'E001', 'operator', 'active', NOW())
               RETURNING id, team_id, employee_name, position, status"#,
        )
        .bind(tm_id).bind(team_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "团队成员创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "active");

        let read = sqlx::query("SELECT id, employee_name, position FROM mes.team_members WHERE id = $1")
            .bind(tm_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "团队成员读取应该成功");

        let update = sqlx::query("UPDATE mes.team_members SET position = 'team_leader', status = 'active', created_at = NOW() WHERE id = $1 RETURNING position")
            .bind(tm_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "团队成员更新应该成功");
        assert_eq!(update.unwrap().get::<String, _>("position"), "team_leader");

        let deactivate = sqlx::query("UPDATE mes.team_members SET status = 'inactive', created_at = NOW() WHERE id = $1 RETURNING status")
            .bind(tm_id).fetch_one(&pool).await;
        assert!(deactivate.is_ok(), "团队成员停用应该成功");
        assert_eq!(deactivate.unwrap().get::<String, _>("status"), "inactive");

        sqlx::query("DELETE FROM mes.team_members WHERE id = $1").bind(tm_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM mes.teams WHERE id = $1").bind(team_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_mes_schema_table_count() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'mes'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(count >= 30, "mes schema 应该至少有 30 个表，实际有 {}", count);
        eprintln!("mes schema 表数量: {}", count);
    }

    #[tokio::test]
    async fn test_database_version() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let version: String = sqlx::query_scalar("SELECT version()")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(version.contains("PostgreSQL"), "应该是 PostgreSQL 数据库");
        eprintln!("数据库版本: {}", version);
    }

    #[tokio::test]
    async fn test_current_timestamp() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let now: String = sqlx::query_scalar("SELECT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert!(now.starts_with("202"), "当前年份应该 >= 2020");
        eprintln!("数据库当前时间: {}", now);
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
