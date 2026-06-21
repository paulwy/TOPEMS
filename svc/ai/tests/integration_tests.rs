// AI 服务集成测试
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
    async fn test_documents_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'ai' AND table_name = 'documents')")
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
    async fn test_qa_history_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'ai' AND table_name = 'qa_history')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "问答历史表应该存在");
            }
            Err(e) => {
                panic!("查询问答历史表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_analysis_results_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'ai' AND table_name = 'analysis_results')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "分析结果表应该存在");
            }
            Err(e) => {
                panic!("查询分析结果表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_document_chunks_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'ai' AND table_name = 'document_chunks')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "文档分块表应该存在");
            }
            Err(e) => {
                panic!("查询文档分块表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_document() {
        let pool = setup_test_pool().await.unwrap();

        let document_id = Uuid::new_v4();
        let title = format!("测试文档-{}", &document_id.to_string()[..8]);
        let tenant_id = Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO plugin_ai.documents (id, tenant_id, organization_id, title, file_path, file_name, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(document_id)
        .bind(tenant_id)
        .bind(tenant_id)
        .bind(&title)
        .bind("/test/path/document.pdf")
        .bind("document.pdf")
        .bind("pending")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "文档创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_documents() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, title, file_name, created_at
            FROM plugin_ai.documents
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(documents) => {
                assert!(documents.len() <= 10, "返回的文档数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询文档列表失败: {}", e);
            }
        }
    }
}
