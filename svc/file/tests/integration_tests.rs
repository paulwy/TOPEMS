// File 服务集成测试
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
    async fn test_files_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'file' AND table_name = 'files')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "文件表应该存在");
            }
            Err(e) => {
                panic!("查询文件表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_file_metadata_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'file' AND table_name = 'file_metadata')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "文件元数据表应该存在");
            }
            Err(e) => {
                panic!("查询文件元数据表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_file_record() {
        let pool = setup_test_pool().await.unwrap();

        let file_id = Uuid::new_v4();
        let filename = format!("test_file-{}.txt", &file_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO file.files (id, organization_id, filename, file_path, file_size, mime_type, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                filename = EXCLUDED.filename,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(file_id)
        .bind(Uuid::parse_str(TEST_ORGANIZATION_ID).unwrap())
        .bind(&filename)
        .bind("/test/path/file.txt")
        .bind(1024)
        .bind("text/plain")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "文件记录创建应该成功: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_list_files() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            r#"
            SELECT id, filename, file_size, mime_type, created_at
            FROM file.files
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(files) => {
                assert!(files.len() <= 10, "返回的文件数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询文件列表失败: {}", e);
            }
        }
    }
}
