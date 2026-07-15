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

    /// 检查数据库是否可用
    async fn ensure_db_available() -> bool {
        tokio::net::TcpStream::connect("localhost:5432")
            .await
            .is_ok()
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
    async fn test_warehouse_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'warehouses')",
        )
        .fetch_one(&pool)
        .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "仓库表应该存在");
            }
            Err(e) => {
                panic!("查询仓库表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_inventory_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'inventory')",
        )
        .fetch_one(&pool)
        .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "库存表应该存在");
            }
            Err(e) => {
                panic!("查询库存表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_inbound_order_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'inbound_orders')",
        )
        .fetch_one(&pool)
        .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "入库单表应该存在");
            }
            Err(e) => {
                panic!("查询入库单表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_outbound_order_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'outbound_orders')",
        )
        .fetch_one(&pool)
        .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "出库单表应该存在");
            }
            Err(e) => {
                panic!("查询出库单表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_location_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'locations')",
        )
        .fetch_one(&pool)
        .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "库位表应该存在");
            }
            Err(e) => {
                panic!("查询库位表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_transfer_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'transfers')",
        )
        .fetch_one(&pool)
        .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "调拨表应该存在");
            }
            Err(e) => {
                panic!("查询调拨表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_warehouse_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let warehouse_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let warehouse_code = format!("WH-TEST-{}", &warehouse_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, address, manager, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, warehouse_code, warehouse_name, status
            "#,
        )
        .bind(warehouse_id)
        .bind(organization_id)
        .bind(&warehouse_code)
        .bind("测试仓库")
        .bind("原材料仓库")
        .bind("active")
        .bind("测试地址")
        .bind("仓库管理员")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "仓库创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(created.get::<String, _>("warehouse_code"), warehouse_code);
        assert_eq!(created.get::<String, _>("warehouse_name"), "测试仓库");
        assert_eq!(created.get::<String, _>("status"), "active");

        let read_result = sqlx::query(
            r#"
            SELECT id, warehouse_code, warehouse_name, status
            FROM wms.warehouses
            WHERE id = $1
            "#,
        )
        .bind(warehouse_id)
        .fetch_one(&pool)
        .await;

        assert!(read_result.is_ok(), "仓库读取应该成功");

        let update_result = sqlx::query(
            r#"
            UPDATE wms.warehouses
            SET warehouse_name = $2, status = $3, updated_at = NOW()
            WHERE id = $1
            RETURNING warehouse_name, status
            "#,
        )
        .bind(warehouse_id)
        .bind("更新后的仓库名称")
        .bind("inactive")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "仓库更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(
            updated.get::<String, _>("warehouse_name"),
            "更新后的仓库名称"
        );
        assert_eq!(updated.get::<String, _>("status"), "inactive");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM wms.warehouses
            WHERE id = $1
            "#,
        )
        .bind(warehouse_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "仓库删除应该成功");
        assert!(delete_result.unwrap().rows_affected() > 0, "应该有行被删除");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM wms.warehouses WHERE id = $1"#,
            warehouse_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(verify_delete.unwrap(), Some(0), "仓库应该已被删除");
    }

    #[tokio::test]
    async fn test_create_location_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let warehouse_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let warehouse_code = format!("WH-LOC-{}", &warehouse_id.to_string()[..6]);

        let _ = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id)
        .bind(organization_id)
        .bind(&warehouse_code)
        .bind("测试仓库-库位")
        .bind("原材料仓库")
        .bind("active")
        .execute(&pool)
        .await;

        let location_id = Uuid::new_v4();
        let location_code = format!("{}-A-01-01-01", &warehouse_code[..6]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO wms.locations (
                id, organization_id, warehouse_id, location_code, location_name, zone, aisle, shelf, level, position, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id, location_code, location_name, status
            "#,
        )
        .bind(location_id)
        .bind(organization_id)
        .bind(warehouse_id)
        .bind(&location_code)
        .bind(format!("库位-{}", &location_id.to_string()[..6]))
        .bind("A区")
        .bind("01")
        .bind("01")
        .bind("01")
        .bind("01")
        .bind("available")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "库位创建应该成功");

        let update_result = sqlx::query(
            r#"
            UPDATE wms.locations
            SET location_name = $2, status = $3, updated_at = NOW()
            WHERE id = $1
            RETURNING location_name, status
            "#,
        )
        .bind(location_id)
        .bind("更新后的库位名称")
        .bind("occupied")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "库位更新应该成功");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM wms.locations
            WHERE id = $1
            "#,
        )
        .bind(location_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "库位删除应该成功");

        let _ = sqlx::query!(r#"DELETE FROM wms.warehouses WHERE id = $1"#, warehouse_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_inventory_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let warehouse_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let warehouse_code = format!("WH-INV-{}", &warehouse_id.to_string()[..6]);

        let _ = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id)
        .bind(organization_id)
        .bind(&warehouse_code)
        .bind("测试仓库-库存")
        .bind("原材料仓库")
        .bind("active")
        .execute(&pool)
        .await;

        let inventory_id = Uuid::new_v4();

        let create_result = sqlx::query(
            r#"
            INSERT INTO wms.inventory (
                id, organization_id, warehouse_id, material_code, material_name, quantity, available_quantity, unit, quality_status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id, material_code, material_name, quantity, quality_status
            "#,
        )
        .bind(inventory_id)
        .bind(organization_id)
        .bind(warehouse_id)
        .bind("MAT-TEST-001")
        .bind("测试物料")
        .bind(Decimal::from(1000))
        .bind(Decimal::from(1000))
        .bind("PCS")
        .bind("qualified")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "库存创建应该成功");

        let update_result = sqlx::query(
            r#"
            UPDATE wms.inventory
            SET quantity = $2, available_quantity = $3, quality_status = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING quantity, available_quantity, quality_status
            "#,
        )
        .bind(inventory_id)
        .bind(Decimal::from(800))
        .bind(Decimal::from(800))
        .bind("qualified")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "库存更新应该成功");

        let _ = sqlx::query!(r#"DELETE FROM wms.inventory WHERE id = $1"#, inventory_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query!(r#"DELETE FROM wms.warehouses WHERE id = $1"#, warehouse_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_transaction_rollback_on_failure() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let warehouse_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let warehouse_code = format!("WH-TX-{}", &warehouse_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            BEGIN;
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
            INSERT INTO wms.warehouses (id) VALUES ('invalid-uuid');
            COMMIT;
            "#,
        )
        .bind(warehouse_id)
        .bind(organization_id)
        .bind(&warehouse_code)
        .bind("事务测试仓库")
        .bind("原材料仓库")
        .bind("active")
        .execute(&pool)
        .await;

        assert!(result.is_err(), "事务应该失败回滚");

        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM wms.warehouses WHERE id = $1"#,
            warehouse_id
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, Some(0), "事务回滚后数据应该不存在");
    }

    #[tokio::test]
    async fn test_transaction_commit_on_success() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let warehouse_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let warehouse_code = format!("WH-TX-SUCCESS-{}", &warehouse_id.to_string()[..8]);

        let tx_result = pool.begin().await;
        assert!(tx_result.is_ok(), "事务开始应该成功");
        let mut tx = tx_result.unwrap();

        let insert_result = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id)
        .bind(organization_id)
        .bind(&warehouse_code)
        .bind("事务成功测试仓库")
        .bind("成品仓库")
        .bind("active")
        .execute(&mut *tx)
        .await;

        assert!(insert_result.is_ok(), "事务中插入应该成功");

        let commit_result = tx.commit().await;
        assert!(commit_result.is_ok(), "事务提交应该成功");

        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM wms.warehouses WHERE id = $1"#,
            warehouse_id
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, Some(1), "事务提交后数据应该存在");

        let _ = sqlx::query!(r#"DELETE FROM wms.warehouses WHERE id = $1"#, warehouse_id)
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

        let org_id_1 = Uuid::new_v4();
        let org_id_2 = Uuid::new_v4();

        let warehouse_id_1 = Uuid::new_v4();
        let warehouse_id_2 = Uuid::new_v4();

        let create_result_1 = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id_1)
        .bind(org_id_1)
        .bind(format!("WH-TENANT1-{}", &warehouse_id_1.to_string()[..4]))
        .bind("租户1仓库")
        .bind("原材料仓库")
        .bind("active")
        .execute(&pool)
        .await;

        assert!(create_result_1.is_ok(), "租户1仓库创建应该成功");

        let create_result_2 = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id_2)
        .bind(org_id_2)
        .bind(format!("WH-TENANT2-{}", &warehouse_id_2.to_string()[..4]))
        .bind("租户2仓库")
        .bind("成品仓库")
        .bind("active")
        .execute(&pool)
        .await;

        assert!(create_result_2.is_ok(), "租户2仓库创建应该成功");

        let total_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM wms.warehouses WHERE warehouse_code LIKE 'WH-TENANT%'"#
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(total_count, Some(2), "应该有2条测试仓库");

        let org1_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM wms.warehouses WHERE organization_id = $1 AND warehouse_code LIKE 'WH-TENANT%'"#,
            org_id_1
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(org1_count, Some(1), "租户1应该只能看到自己的仓库");

        let org2_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM wms.warehouses WHERE organization_id = $1 AND warehouse_code LIKE 'WH-TENANT%'"#,
            org_id_2
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(org2_count, Some(1), "租户2应该只能看到自己的仓库");

        let _ = sqlx::query!(
            r#"DELETE FROM wms.warehouses WHERE id IN ($1, $2)"#,
            warehouse_id_1,
            warehouse_id_2
        )
        .execute(&pool)
        .await;
    }

    #[tokio::test]
    async fn test_inbound_order_transaction() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let warehouse_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let warehouse_code = format!("WH-INBOUND-{}", &warehouse_id.to_string()[..6]);

        let _ = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id)
        .bind(organization_id)
        .bind(&warehouse_code)
        .bind("测试仓库")
        .bind("原材料仓库")
        .bind("active")
        .execute(&pool)
        .await;

        let inbound_id = Uuid::new_v4();
        let order_number = format!("IN-{}", &inbound_id.to_string()[..10]);

        let inbound_result = sqlx::query(
            r#"
            INSERT INTO wms.inbound_orders (
                id, organization_id, order_number, warehouse_id, order_type, status, supplier_name, expected_arrival_date, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, order_number, status
            "#,
        )
        .bind(inbound_id)
        .bind(organization_id)
        .bind(&order_number)
        .bind(warehouse_id)
        .bind("purchase")
        .bind("created")
        .bind("测试供应商")
        .bind(chrono::Utc::now().date_naive())
        .fetch_one(&pool)
        .await;

        assert!(inbound_result.is_ok(), "入库单创建应该成功");

        let inbound = inbound_result.unwrap();
        assert_eq!(inbound.get::<String, _>("order_number"), order_number);
        assert_eq!(inbound.get::<String, _>("status"), "created");

        let update_result = sqlx::query(
            r#"
            UPDATE wms.inbound_orders
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING status
            "#,
        )
        .bind(inbound_id)
        .bind("completed")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "入库单状态更新应该成功");
        assert_eq!(
            update_result.unwrap().get::<String, _>("status"),
            "completed"
        );

        let _ = sqlx::query!(
            r#"DELETE FROM wms.inbound_orders WHERE id = $1"#,
            inbound_id
        )
        .execute(&pool)
        .await;
        let _ = sqlx::query!(r#"DELETE FROM wms.warehouses WHERE id = $1"#, warehouse_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_outbound_order_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let warehouse_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let warehouse_code = format!("WH-OUTBOUND-{}", &warehouse_id.to_string()[..6]);

        let _ = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (
                id, organization_id, warehouse_code, warehouse_name, warehouse_type, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id)
        .bind(organization_id)
        .bind(&warehouse_code)
        .bind("测试仓库-出库")
        .bind("成品仓库")
        .bind("active")
        .execute(&pool)
        .await;

        let outbound_id = Uuid::new_v4();
        let order_number = format!("OUT-{}", &outbound_id.to_string()[..8]);

        let outbound_result = sqlx::query(
            r#"
            INSERT INTO wms.outbound_orders (
                id, organization_id, order_number, warehouse_id, order_type, status, customer_name, expected_ship_date, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, order_number, status
            "#,
        )
        .bind(outbound_id)
        .bind(organization_id)
        .bind(&order_number)
        .bind(warehouse_id)
        .bind("sales")
        .bind("created")
        .bind("测试客户")
        .bind(chrono::Utc::now().date_naive())
        .fetch_one(&pool)
        .await;

        assert!(outbound_result.is_ok(), "出库单创建应该成功");

        let outbound = outbound_result.unwrap();
        assert_eq!(outbound.get::<String, _>("order_number"), order_number);
        assert_eq!(outbound.get::<String, _>("status"), "created");

        let update_result = sqlx::query(
            r#"
            UPDATE wms.outbound_orders
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING status
            "#,
        )
        .bind(outbound_id)
        .bind("completed")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "出库单状态更新应该成功");
        assert_eq!(
            update_result.unwrap().get::<String, _>("status"),
            "completed"
        );

        let _ = sqlx::query!(
            r#"DELETE FROM wms.outbound_orders WHERE id = $1"#,
            outbound_id
        )
        .execute(&pool)
        .await;
        let _ = sqlx::query!(r#"DELETE FROM wms.warehouses WHERE id = $1"#, warehouse_id)
            .execute(&pool)
            .await;
    }
}
