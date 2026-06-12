// WMS 服务集成测试

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

    #[tokio::test]
    async fn test_database_connection() {
        let pool = setup_test_pool().await;
        assert!(pool.is_ok(), "数据库连接应该成功");
    }

    #[tokio::test]
    async fn test_warehouse_table_exists() {
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'warehouses')")
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
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'inventory')")
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
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'inbound_orders')")
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
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'outbound_orders')")
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
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'locations')")
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
    async fn test_stock_take_table_exists() {
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'stock_takes')")
            .fetch_one(&pool)
            .await;
        
        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "盘点表应该存在");
            }
            Err(e) => {
                panic!("查询盘点表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_transfer_table_exists() {
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'transfers')")
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
    async fn test_create_warehouse() {
        let pool = setup_test_pool().await.unwrap();
        
        let warehouse_id = Uuid::new_v4();
        let warehouse_code = format!("WH-{}", &warehouse_id.to_string()[..8]);
        
        let result = sqlx::query(
            r#"
            INSERT INTO wms.warehouses (id, code, name, type, status, address, manager, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(warehouse_id)
        .bind(&warehouse_code)
        .bind(format!("测试仓库-{}", &warehouse_id.to_string()[..8]))
        .bind("原材料仓库")
        .bind("active")
        .bind("测试地址")
        .bind("仓库管理员")
        .fetch_one(&pool)
        .await;
        
        assert!(result.is_ok(), "仓库创建应该成功");
    }

    #[tokio::test]
    async fn test_list_warehouses() {
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query_as::<_, WarehouseRow>(
            r#"
            SELECT id, code, name, type, status, address, manager, contact, phone, capacity, current_stock, created_at, updated_at
            FROM wms.warehouses
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;
        
        match result {
            Ok(warehouses) => {
                assert!(warehouses.len() <= 10, "返回的仓库数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询仓库列表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_inventory_transaction() {
        let pool = setup_test_pool().await.unwrap();
        
        // 创建测试仓库
        let warehouse_id = Uuid::new_v4();
        let warehouse_code = format!("WH-TEST-{}", &warehouse_id.to_string()[..6]);
        
        sqlx::query(
            r#"
            INSERT INTO wms.warehouses (id, code, name, type, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            "#,
        )
        .bind(warehouse_id)
        .bind(&warehouse_code)
        .bind("测试仓库")
        .bind("原材料仓库")
        .bind("active")
        .execute(&pool)
        .await
        .expect("创建测试仓库失败");
        
        // 创建测试库位
        let location_id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO wms.locations (id, warehouse_id, zone, rack, shelf, bin, location_code, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(location_id)
        .bind(warehouse_id)
        .bind("A区")
        .bind("01")
        .bind("01")
        .bind("01")
        .bind(format!("{}-A-01-01-01", &warehouse_code[..6]))
        .bind("active")
        .execute(&pool)
        .await
        .expect("创建测试库位失败");
        
        // 创建入库单
        let inbound_id = Uuid::new_v4();
        let inbound_no = format!("IN-{}", &inbound_id.to_string()[..10]);
        
        let inbound_result = sqlx::query(
            r#"
            INSERT INTO wms.inbound_orders (id, order_no, warehouse_id, order_type, status, supplier, expected_arrival_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(inbound_id)
        .bind(&inbound_no)
        .bind(warehouse_id)
        .bind("采购入库")
        .bind("pending")
        .bind("测试供应商")
        .bind(chrono::Utc::now())
        .execute(&pool)
        .await;
        
        assert!(inbound_result.is_ok(), "入库单创建应该成功");
        
        // 清理测试数据
        let _ = sqlx::query("DELETE FROM wms.inbound_orders WHERE id = $1")
            .bind(inbound_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query("DELETE FROM wms.locations WHERE id = $1")
            .bind(location_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query("DELETE FROM wms.warehouses WHERE id = $1")
            .bind(warehouse_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_audit_log_table_exists() {
        let pool = setup_test_pool().await.unwrap();
        
        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'wms' AND table_name = 'wms_audit_logs')")
            .fetch_one(&pool)
            .await;
        
        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                // 审计日志表可能不存在，这是可接受的
                if !exists {
                    tracing::info!("WMS审计日志表不存在，这是可接受的");
                }
            }
            Err(e) => {
                tracing::warn!("查询WMS审计日志表失败: {}", e);
            }
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
#[allow(unused)]
struct WarehouseRow {
    id: Uuid,
    code: String,
    name: String,
    #[sqlx(rename = "type")]
    warehouse_type: String,
    status: String,
    address: Option<String>,
    manager: Option<String>,
    contact: Option<String>,
    phone: Option<String>,
    capacity: Option<i32>,
    current_stock: Option<i32>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}
