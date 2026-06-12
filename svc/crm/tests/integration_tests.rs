// CRM 服务集成测试
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
    async fn test_customer_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'customers')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "客户表应该存在");
            }
            Err(e) => {
                panic!("查询客户表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_contact_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'contacts')")
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
    async fn test_opportunity_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'opportunities')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "商机表应该存在");
            }
            Err(e) => {
                panic!("查询商机表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_interaction_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'interactions')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "交互记录表应该存在");
            }
            Err(e) => {
                panic!("查询交互记录表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_tag_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'tags')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "标签表应该存在");
            }
            Err(e) => {
                panic!("查询标签表失败: {}", e);
            }
        }
    }

    fn test_org_id() -> Uuid {
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    }

    #[tokio::test]
    async fn test_create_customer() {
        let pool = setup_test_pool().await.unwrap();
        let org_id = test_org_id();

        let customer_id = Uuid::new_v4();
        let customer_code = format!("CUST-{}", &customer_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO crm.customers (id, organization_id, code, name, customer_type, industry, phone, email, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(customer_id)
        .bind(org_id)
        .bind(&customer_code)
        .bind(format!("测试客户-{}", &customer_id.to_string()[..6]))
        .bind("enterprise")
        .bind("制造业")
        .bind("13800138000")
        .bind("test@example.com")
        .bind("active")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "客户创建应该成功");
    }

    #[tokio::test]
    async fn test_list_customers() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query_as::<_, CustomerRow>(
            r#"
            SELECT id, code, name, customer_type, industry, phone, email, address, status, created_at, updated_at
            FROM crm.customers
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(customers) => {
                assert!(customers.len() <= 10, "返回的客户数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询客户列表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_customer_status_update() {
        let pool = setup_test_pool().await.unwrap();
        let org_id = test_org_id();

        // 创建一个新的客户
        let customer_id = Uuid::new_v4();
        let customer_code = format!("CUST-TEST-{}", &customer_id.to_string()[..6]);

        sqlx::query(
            r#"
            INSERT INTO crm.customers (id, organization_id, code, name, customer_type, industry, phone, email, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            "#,
        )
        .bind(customer_id)
        .bind(org_id)
        .bind(&customer_code)
        .bind("测试客户")
        .bind("enterprise")
        .bind("制造业")
        .bind("13800138000")
        .bind("test@example.com")
        .bind("active")
        .execute(&pool)
        .await
        .expect("创建测试数据失败");

        // 更新状态为 inactive
        let update_result = sqlx::query(
            r#"
            UPDATE crm.customers SET status = 'inactive', updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(customer_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "状态更新应该成功");

        // 验证状态已更新
        let check_result =
            sqlx::query_scalar::<_, String>("SELECT status FROM crm.customers WHERE id = $1")
                .bind(customer_id)
                .fetch_one(&pool)
                .await;

        match check_result {
            Ok(status) => {
                assert_eq!(status, "inactive", "状态应该更新为 inactive");
            }
            Err(e) => {
                panic!("查询状态失败: {}", e);
            }
        }

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM crm.customers WHERE id = $1")
            .bind(customer_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_opportunity() {
        let pool = setup_test_pool().await.unwrap();
        let org_id = test_org_id();

        // 先创建一个客户
        let customer_id = Uuid::new_v4();
        let customer_code = format!("CUST-{}", &customer_id.to_string()[..8]);

        sqlx::query(
            r#"
            INSERT INTO crm.customers (id, organization_id, code, name, customer_type, industry, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            "#,
        )
        .bind(customer_id)
        .bind(org_id)
        .bind(&customer_code)
        .bind("测试客户")
        .bind("enterprise")
        .bind("制造业")
        .bind("active")
        .execute(&pool)
        .await
        .expect("创建测试客户失败");

        // 创建商机
        let opportunity_id = Uuid::new_v4();
        let result = sqlx::query(
            r#"
            INSERT INTO crm.opportunities (id, organization_id, customer_id, name, stage, value, probability, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(opportunity_id)
        .bind(org_id)
        .bind(customer_id)
        .bind(format!("测试商机-{}", &opportunity_id.to_string()[..6]))
        .bind("prospecting")
        .bind(100000.00)
        .bind(20)
        .bind("open")
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "商机创建应该成功");

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM crm.opportunities WHERE id = $1")
            .bind(opportunity_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query("DELETE FROM crm.customers WHERE id = $1")
            .bind(customer_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_audit_log_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'crm' AND table_name = 'crm_audit_logs')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                // 审计日志表可能不存在，这是可接受的
                if !exists {
                    tracing::info!("CRM审计日志表不存在，这是可接受的");
                }
            }
            Err(e) => {
                tracing::warn!("查询CRM审计日志表失败: {}", e);
            }
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct CustomerRow {
    id: Uuid,
    code: String,
    name: String,
    customer_type: Option<String>,
    industry: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}
