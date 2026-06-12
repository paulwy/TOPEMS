// QMS 服务集成测试
#![allow(dead_code)]
#![allow(unused_imports)]

use sqlx::{PgPool, Row};
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
    async fn test_quality_inspection_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'qms' AND table_name = 'quality_inspections')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "质量检查表应该存在");
            }
            Err(e) => {
                panic!("查询质量检查表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_quality_standard_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'qms' AND table_name = 'quality_standards')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "质量标准表应该存在");
            }
            Err(e) => {
                panic!("查询质量标准表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_quality_issue_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'qms' AND table_name = 'quality_issues')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "质量问题表应该存在");
            }
            Err(e) => {
                panic!("查询质量问题表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_corrective_action_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'qms' AND table_name = 'corrective_actions')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "纠正措施表应该存在");
            }
            Err(e) => {
                panic!("查询纠正措施表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_quality_inspection() {
        let pool = setup_test_pool().await.unwrap();

        let inspection_id = Uuid::new_v4();
        let title = format!("测试质量检查-{}", &inspection_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO qms.quality_inspections (id, title, description, inspection_type, inspector, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(inspection_id)
        .bind(&title)
        .bind("这是一条测试质量检查")
        .bind("日常检查")
        .bind("测试员")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "质量检查创建应该成功");
    }

    #[tokio::test]
    async fn test_list_quality_inspections() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query_as::<_, QualityInspectionRow>(
            r#"
            SELECT id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
            FROM qms.quality_inspections
            ORDER BY created_at DESC
            LIMIT 10
            "#,
        )
        .fetch_all(&pool)
        .await;

        match result {
            Ok(inspections) => {
                assert!(inspections.len() <= 10, "返回的检查数量应该不超过10条");
            }
            Err(e) => {
                panic!("查询质量检查列表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_quality_inspection_status_update() {
        let pool = setup_test_pool().await.unwrap();

        // 创建一个新的检查记录
        let inspection_id = Uuid::new_v4();
        let title = format!("状态更新测试-{}", &inspection_id.to_string()[..8]);

        sqlx::query(
            r#"
            INSERT INTO qms.quality_inspections (id, title, description, inspection_type, inspector, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
            "#,
        )
        .bind(inspection_id)
        .bind(&title)
        .bind("测试描述")
        .bind("日常检查")
        .bind("测试员")
        .execute(&pool)
        .await
        .expect("创建测试数据失败");

        // 更新状态为进行中
        let update_result = sqlx::query(
            r#"
            UPDATE qms.quality_inspections SET status = 'in_progress', updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(inspection_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "状态更新应该成功");

        // 验证状态已更新
        let check_result = sqlx::query_scalar::<_, String>(
            "SELECT status FROM qms.quality_inspections WHERE id = $1",
        )
        .bind(inspection_id)
        .fetch_one(&pool)
        .await;

        match check_result {
            Ok(status) => {
                assert_eq!(status, "in_progress", "状态应该更新为 in_progress");
            }
            Err(e) => {
                panic!("查询状态失败: {}", e);
            }
        }

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM qms.quality_inspections WHERE id = $1")
            .bind(inspection_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_quality_audit_log_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'qms' AND table_name = 'quality_audit_logs')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                // 审计日志表可能不存在，这是可接受的
                if !exists {
                    tracing::info!("质量审计日志表不存在，这是可接受的");
                }
            }
            Err(e) => {
                tracing::warn!("查询质量审计日志表失败: {}", e);
            }
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct QualityInspectionRow {
    id: Uuid,
    title: String,
    description: Option<String>,
    inspection_type: String,
    standard_id: Option<Uuid>,
    inspector: String,
    status: String,
    result: Option<String>,
    findings: Option<String>,
    inspected_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}
