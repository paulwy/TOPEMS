// PDM 服务集成测试
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
    async fn test_products_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'pdm' AND table_name = 'products')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "产品表应该存在");
            }
            Err(e) => {
                panic!("查询产品表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_documents_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'pdm' AND table_name = 'documents')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "文档表应该存在");
            }
            Err(e) => {
                panic!("查询文档表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_versions_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'pdm' AND table_name = 'versions')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "版本表应该存在");
            }
            Err(e) => {
                panic!("查询版本表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_materials_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'pdm' AND table_name = 'materials')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "材料表应该存在");
            }
            Err(e) => {
                panic!("查询材料表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_product() {
        let pool = setup_test_pool().await.unwrap();

        let product_id = Uuid::new_v4();
        let product_name = format!("测试产品-{}", &product_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO pdm.products (id, organization_id, product_name, product_code, description, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                product_name = EXCLUDED.product_name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(product_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&product_name)
        .bind(&product_id.to_string()[..8])
        .bind("这是一个测试产品的描述")
        .bind("active")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "产品创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_products() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, product_name, product_code, status, created_at
            FROM pdm.products
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(products) => {
                assert!(products.len() <= 10, "返回的产品数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询产品列表失败: {}", e);
            }
        }
    }
}
