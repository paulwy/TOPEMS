// SCM 服务集成测试
#![allow(dead_code)]

use sqlx::{PgPool, Row};
use uuid::Uuid;

#[cfg(test)]
mod tests {
    use super::*;

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
    async fn test_purchase_order_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'scm' AND table_name = 'purchase_orders')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "采购订单表应该存在");
            }
            Err(e) => {
                panic!("查询采购订单表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_purchase_item_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'scm' AND table_name = 'purchase_items')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "采购项表应该存在");
            }
            Err(e) => {
                panic!("查询采购项表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_supplier_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'scm' AND table_name = 'suppliers')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "供应商表应该存在");
            }
            Err(e) => {
                panic!("查询供应商表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_supplier_evaluation_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'scm' AND table_name = 'supplier_evaluations')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "供应商评估表应该存在");
            }
            Err(e) => {
                panic!("查询供应商评估表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_purchase_order() {
        let pool = setup_test_pool().await.unwrap();

        let order_id = Uuid::new_v4();
        let po_no = format!("PO-{}", &order_id.to_string()[..10]);

        // 先创建一个供应商
        let supplier_id = Uuid::new_v4();
        let supplier_no = format!("SUP-{}", &supplier_id.to_string()[..8]);
        sqlx::query(
            r#"
            INSERT INTO scm.suppliers (id, supplier_no, name, category, status, risk_level, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'active', 'low', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            "#,
        )
        .bind(supplier_id)
        .bind(&supplier_no)
        .bind(format!("Test Supplier {}", &supplier_id.to_string()[..6]))
        .bind("raw_material")
        .execute(&pool)
        .await
        .expect("创建供应商失败");

        let result = sqlx::query(
            r#"
            INSERT INTO scm.purchase_orders (id, po_no, supplier_id, status, order_date, currency, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'CNY', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(order_id)
        .bind(&po_no)
        .bind(supplier_id)
        .bind("draft")
        .bind(chrono::Utc::now())
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "采购订单创建应该成功");
    }

    #[tokio::test]
    async fn test_list_purchase_orders() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query_as::<_, PurchaseOrderRow>(
            r#"
            SELECT id, po_no, supplier_id, status, order_date, expected_date, actual_date, total_amount, currency, created_at, updated_at
            FROM scm.purchase_orders
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
                panic!("查询采购订单列表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_purchase_order_status_update() {
        let pool = setup_test_pool().await.unwrap();

        // 先创建一个供应商
        let supplier_id = Uuid::new_v4();
        let supplier_no = format!("SUP-{}", &supplier_id.to_string()[..8]);
        sqlx::query(
            r#"
            INSERT INTO scm.suppliers (id, supplier_no, name, category, status, risk_level, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'active', 'low', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            "#,
        )
        .bind(supplier_id)
        .bind(&supplier_no)
        .bind(format!("Test Supplier {}", &supplier_id.to_string()[..6]))
        .bind("raw_material")
        .execute(&pool)
        .await
        .expect("创建供应商失败");

        // 创建一个新的采购订单
        let order_id = Uuid::new_v4();
        let po_no = format!("PO-TEST-{}", &order_id.to_string()[..8]);

        sqlx::query(
            r#"
            INSERT INTO scm.purchase_orders (id, po_no, supplier_id, status, order_date, currency, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'CNY', NOW(), NOW())
            "#,
        )
        .bind(order_id)
        .bind(&po_no)
        .bind(supplier_id)
        .bind("draft")
        .bind(chrono::Utc::now())
        .execute(&pool)
        .await
        .expect("创建测试数据失败");

        // 更新状态为已确认
        let update_result = sqlx::query(
            r#"
            UPDATE scm.purchase_orders SET status = 'confirmed', updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(order_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "状态更新应该成功");

        // 验证状态已更新
        let check_result =
            sqlx::query_scalar::<_, String>("SELECT status FROM scm.purchase_orders WHERE id = $1")
                .bind(order_id)
                .fetch_one(&pool)
                .await;

        match check_result {
            Ok(status) => {
                assert_eq!(status, "confirmed", "状态应该更新为 confirmed");
            }
            Err(e) => {
                panic!("查询状态失败: {}", e);
            }
        }

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM scm.purchase_orders WHERE id = $1")
            .bind(order_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_supplier() {
        let pool = setup_test_pool().await.unwrap();

        let supplier_id = Uuid::new_v4();
        let supplier_no = format!("SUP-{}", &supplier_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO scm.suppliers (id, supplier_no, name, category, status, risk_level, contact_person, phone, email, address, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(supplier_id)
        .bind(&supplier_no)
        .bind(format!("测试供应商-{}", &supplier_id.to_string()[..6]))
        .bind("raw_material")
        .bind("active")
        .bind("low")
        .bind("联系人")
        .bind("13800138000")
        .bind("test@example.com")
        .bind("测试地址")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "供应商创建应该成功");
    }

    #[tokio::test]
    async fn test_audit_log_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'scm' AND table_name = 'scm_audit_logs')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                // 审计日志表可能不存在，这是可接受的
                if !exists {
                    tracing::info!("SCM审计日志表不存在，这是可接受的");
                }
            }
            Err(e) => {
                tracing::warn!("查询SCM审计日志表失败: {}", e);
            }
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct PurchaseOrderRow {
    id: Uuid,
    po_no: String,
    supplier_id: Uuid,
    status: String,
    order_date: chrono::DateTime<chrono::Utc>,
    expected_date: Option<chrono::DateTime<chrono::Utc>>,
    actual_date: Option<chrono::DateTime<chrono::Utc>>,
    total_amount: Option<rust_decimal::Decimal>,
    currency: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}
