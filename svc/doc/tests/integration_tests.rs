// Doc 服务集成测试
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
    async fn test_documents_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'core_doc_documents')"
        )
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
    async fn test_templates_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'core_doc_templates')"
        )
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "模板表应该存在");
            }
            Err(e) => {
                panic!("查询模板表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_folders_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'core_doc_folders')"
        )
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "文件夹表应该存在");
            }
            Err(e) => {
                panic!("查询文件夹表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_documents_table_columns() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'core_doc_documents' ORDER BY ordinal_position"
        )
            .fetch_all(&pool)
            .await;

        match result {
            Ok(rows) => {
                let columns: Vec<String> = rows.iter().map(|r| r.get::<String, _>(0)).collect();
                assert!(columns.contains(&"id".to_string()), "应该有 id 列");
                assert!(columns.contains(&"title".to_string()), "应该有 title 列");
                assert!(
                    columns.contains(&"content".to_string()),
                    "应该有 content 列"
                );
                assert!(
                    columns.contains(&"created_at".to_string()),
                    "应该有 created_at 列"
                );
                assert!(
                    columns.contains(&"updated_at".to_string()),
                    "应该有 updated_at 列"
                );
            }
            Err(e) => {
                panic!("查询文档表列失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_templates_table_columns() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'core_doc_templates' ORDER BY ordinal_position"
        )
            .fetch_all(&pool)
            .await;

        match result {
            Ok(rows) => {
                let columns: Vec<String> = rows.iter().map(|r| r.get::<String, _>(0)).collect();
                assert!(columns.contains(&"id".to_string()), "应该有 id 列");
                assert!(columns.contains(&"name".to_string()), "应该有 name 列");
                assert!(
                    columns.contains(&"content".to_string()),
                    "应该有 content 列"
                );
                assert!(
                    columns.contains(&"variables".to_string()),
                    "应该有 variables 列"
                );
            }
            Err(e) => {
                panic!("查询模板表列失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_folders_table_columns() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'core_doc_folders' ORDER BY ordinal_position"
        )
            .fetch_all(&pool)
            .await;

        match result {
            Ok(rows) => {
                let columns: Vec<String> = rows.iter().map(|r| r.get::<String, _>(0)).collect();
                assert!(columns.contains(&"id".to_string()), "应该有 id 列");
                assert!(columns.contains(&"name".to_string()), "应该有 name 列");
                assert!(
                    columns.contains(&"parent_id".to_string()),
                    "应该有 parent_id 列"
                );
                assert!(
                    columns.contains(&"owner_id".to_string()),
                    "应该有 owner_id 列"
                );
            }
            Err(e) => {
                panic!("查询文件夹表列失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_list_documents() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT COUNT(*) FROM core_doc_documents")
            .fetch_one(&pool)
            .await;

        assert!(result.is_ok(), "查询文档列表应该成功");
    }

    #[tokio::test]
    async fn test_list_templates() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT COUNT(*) FROM core_doc_templates")
            .fetch_one(&pool)
            .await;

        assert!(result.is_ok(), "查询模板列表应该成功");
    }

    #[tokio::test]
    async fn test_list_folders() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT COUNT(*) FROM core_doc_folders")
            .fetch_one(&pool)
            .await;

        assert!(result.is_ok(), "查询文件夹列表应该成功");
    }

    #[tokio::test]
    async fn test_create_and_get_template() {
        let pool = setup_test_pool().await.unwrap();
        let template_id = Uuid::new_v4();
        let created_by = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO core_doc_templates (id, name, description, content, variables, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name
            "#,
        )
        .bind(template_id)
        .bind("测试模板")
        .bind("这是一个测试模板")
        .bind("<h1>测试内容</h1>")
        .bind(serde_json::json!([]))
        .bind(created_by)
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "创建模板应该成功");
        let row = result.unwrap();
        let name: String = row.get("name");
        assert_eq!(name, "测试模板");

        let fetched = sqlx::query("SELECT id, name FROM core_doc_templates WHERE id = $1")
            .bind(template_id)
            .fetch_optional(&pool)
            .await;

        assert!(fetched.is_ok(), "获取模板应该成功");
        assert!(fetched.unwrap().is_some(), "应该能找到模板");

        let _ = sqlx::query("DELETE FROM core_doc_templates WHERE id = $1")
            .bind(template_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_and_get_folder() {
        let pool = setup_test_pool().await.unwrap();
        let folder_id = Uuid::new_v4();
        let owner_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO core_doc_folders (id, name, parent_id, owner_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name
            "#,
        )
        .bind(folder_id)
        .bind("测试文件夹")
        .bind(None::<Uuid>)
        .bind(owner_id)
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "创建文件夹应该成功");
        let row = result.unwrap();
        let name: String = row.get("name");
        assert_eq!(name, "测试文件夹");

        let fetched = sqlx::query("SELECT id, name FROM core_doc_folders WHERE id = $1")
            .bind(folder_id)
            .fetch_optional(&pool)
            .await;

        assert!(fetched.is_ok(), "获取文件夹应该成功");
        assert!(fetched.unwrap().is_some(), "应该能找到文件夹");

        let _ = sqlx::query("DELETE FROM core_doc_folders WHERE id = $1")
            .bind(folder_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_update_template() {
        let pool = setup_test_pool().await.unwrap();
        let template_id = Uuid::new_v4();
        let created_by = Uuid::new_v4();

        let _ = sqlx::query(
            r#"
            INSERT INTO core_doc_templates (id, name, description, content, variables, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(template_id)
        .bind("原始名称")
        .bind("原始描述")
        .bind("原始内容")
        .bind(serde_json::json!([]))
        .bind(created_by)
        .execute(&pool)
        .await
        .unwrap();

        let result = sqlx::query(
            r#"
            UPDATE core_doc_templates
            SET name = $2, description = $3, updated_at = NOW()
            WHERE id = $1
            RETURNING name, description
            "#,
        )
        .bind(template_id)
        .bind("更新后的名称")
        .bind("更新后的描述")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "更新模板应该成功");
        let row = result.unwrap();
        let name: String = row.get("name");
        assert_eq!(name, "更新后的名称");

        let _ = sqlx::query("DELETE FROM core_doc_templates WHERE id = $1")
            .bind(template_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_delete_template() {
        let pool = setup_test_pool().await.unwrap();
        let template_id = Uuid::new_v4();
        let created_by = Uuid::new_v4();

        let _ = sqlx::query(
            r#"
            INSERT INTO core_doc_templates (id, name, description, content, variables, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(template_id)
        .bind("待删除模板")
        .bind("待删除描述")
        .bind("待删除内容")
        .bind(serde_json::json!([]))
        .bind(created_by)
        .execute(&pool)
        .await
        .unwrap();

        let result = sqlx::query("DELETE FROM core_doc_templates WHERE id = $1")
            .bind(template_id)
            .execute(&pool)
            .await;

        assert!(result.is_ok(), "删除模板应该成功");
        let rows_affected = result.unwrap().rows_affected();
        assert_eq!(rows_affected, 1, "应该删除 1 行");
    }

    #[tokio::test]
    async fn test_update_folder() {
        let pool = setup_test_pool().await.unwrap();
        let folder_id = Uuid::new_v4();
        let owner_id = Uuid::new_v4();

        let _ = sqlx::query(
            r#"
            INSERT INTO core_doc_folders (id, name, parent_id, owner_id)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(folder_id)
        .bind("原始文件夹")
        .bind(None::<Uuid>)
        .bind(owner_id)
        .execute(&pool)
        .await
        .unwrap();

        let result = sqlx::query(
            r#"
            UPDATE core_doc_folders
            SET name = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING name
            "#,
        )
        .bind(folder_id)
        .bind("更新后的文件夹")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "更新文件夹应该成功");
        let row = result.unwrap();
        let name: String = row.get("name");
        assert_eq!(name, "更新后的文件夹");

        let _ = sqlx::query("DELETE FROM core_doc_folders WHERE id = $1")
            .bind(folder_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_delete_folder() {
        let pool = setup_test_pool().await.unwrap();
        let folder_id = Uuid::new_v4();
        let owner_id = Uuid::new_v4();

        let _ = sqlx::query(
            r#"
            INSERT INTO core_doc_folders (id, name, parent_id, owner_id)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(folder_id)
        .bind("待删除文件夹")
        .bind(None::<Uuid>)
        .bind(owner_id)
        .execute(&pool)
        .await
        .unwrap();

        let result = sqlx::query("DELETE FROM core_doc_folders WHERE id = $1")
            .bind(folder_id)
            .execute(&pool)
            .await;

        assert!(result.is_ok(), "删除文件夹应该成功");
        let rows_affected = result.unwrap().rows_affected();
        assert_eq!(rows_affected, 1, "应该删除 1 行");
    }
}
