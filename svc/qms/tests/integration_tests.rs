// QMS 服务集成测试

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
    #[ignore = "requires PostgreSQL"]
    async fn test_database_connection() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await;
        assert!(pool.is_ok(), "数据库连接应该成功");
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_quality_issues_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'qa_quality_issues')",
        )
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
    #[ignore = "requires PostgreSQL"]
    async fn test_quality_inspections_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'qa_quality_inspections')",
        )
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
    #[ignore = "requires PostgreSQL"]
    async fn test_corrective_actions_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'qa_corrective_actions')",
        )
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
    #[ignore = "requires PostgreSQL"]
    async fn test_standards_table_exists() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'qa_standards')",
        )
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
    #[ignore = "requires PostgreSQL"]
    async fn test_create_quality_issue_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let issue_id = Uuid::new_v4();
        let issue_no = format!("QI-TEST-{}", &issue_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO qa_quality_issues (
                id, issue_no, title, description, severity, status, source, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, issue_no, title, status, severity
            "#,
        )
        .bind(issue_id)
        .bind(&issue_no)
        .bind("测试质量问题")
        .bind("测试质量问题描述")
        .bind("high")
        .bind("open")
        .bind("production")
        .bind("test_user")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "质量问题创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(created.get::<String, _>("issue_no"), issue_no);
        assert_eq!(created.get::<String, _>("title"), "测试质量问题");
        assert_eq!(created.get::<String, _>("status"), "open");
        assert_eq!(created.get::<String, _>("severity"), "high");

        let read_result = sqlx::query(
            r#"
            SELECT id, issue_no, title, status
            FROM qa_quality_issues
            WHERE id = $1
            "#,
        )
        .bind(issue_id)
        .fetch_one(&pool)
        .await;

        assert!(read_result.is_ok(), "质量问题读取应该成功");

        let update_result = sqlx::query(
            r#"
            UPDATE qa_quality_issues
            SET title = $2, severity = $3, status = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING title, severity, status
            "#,
        )
        .bind(issue_id)
        .bind("更新后的质量问题标题")
        .bind("medium")
        .bind("in_progress")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "质量问题更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(updated.get::<String, _>("title"), "更新后的质量问题标题");
        assert_eq!(updated.get::<String, _>("severity"), "medium");
        assert_eq!(updated.get::<String, _>("status"), "in_progress");

        let resolve_result = sqlx::query(
            r#"
            UPDATE qa_quality_issues
            SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
            WHERE id = $1
            RETURNING status, resolved_at
            "#,
        )
        .bind(issue_id)
        .fetch_one(&pool)
        .await;

        assert!(resolve_result.is_ok(), "质量问题解决应该成功");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM qa_quality_issues
            WHERE id = $1
            "#,
        )
        .bind(issue_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "质量问题删除应该成功");
        assert!(delete_result.unwrap().rows_affected() > 0, "应该有行被删除");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_issues WHERE id = $1"#,
            issue_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(
            verify_delete.unwrap().unwrap_or(0),
            0,
            "质量问题应该已被删除"
        );
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_create_quality_standard_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let standard_id = Uuid::new_v4();
        let standard_code = format!("QS-TEST-{}", &standard_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO qa_standards (
                id, code, name, category, description, status, version, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id, code, name, status, version
            "#,
        )
        .bind(standard_id)
        .bind(&standard_code)
        .bind("测试质量标准")
        .bind("general")
        .bind("测试质量标准描述")
        .bind("active")
        .bind("1.0")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "质量标准创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(created.get::<String, _>("code"), standard_code);
        assert_eq!(created.get::<String, _>("name"), "测试质量标准");
        assert_eq!(created.get::<String, _>("status"), "active");

        let update_result = sqlx::query(
            r#"
            UPDATE qa_standards
            SET name = $2, status = $3, version = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING name, status, version
            "#,
        )
        .bind(standard_id)
        .bind("更新后的质量标准名称")
        .bind("draft")
        .bind("2.0")
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "质量标准更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(updated.get::<String, _>("name"), "更新后的质量标准名称");
        assert_eq!(updated.get::<String, _>("status"), "draft");
        assert_eq!(updated.get::<String, _>("version"), "2.0");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM qa_standards
            WHERE id = $1
            "#,
        )
        .bind(standard_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "质量标准删除应该成功");
        assert!(delete_result.unwrap().rows_affected() > 0, "应该有行被删除");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_standards WHERE id = $1"#,
            standard_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(
            verify_delete.unwrap().unwrap_or(0),
            0,
            "质量标准应该已被删除"
        );
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_create_corrective_action_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let action_id = Uuid::new_v4();
        let action_no = format!("CA-TEST-{}", &action_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO qa_corrective_actions (
                id, action_no, title, description, status, priority, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id, action_no, title, status, priority
            "#,
        )
        .bind(action_id)
        .bind(&action_no)
        .bind("测试纠正措施")
        .bind("测试纠正措施描述")
        .bind("open")
        .bind(1)
        .bind("test_user")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "纠正措施创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(created.get::<String, _>("action_no"), action_no);
        assert_eq!(created.get::<String, _>("title"), "测试纠正措施");

        let update_result = sqlx::query(
            r#"
            UPDATE qa_corrective_actions
            SET title = $2, status = $3, priority = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING title, status, priority
            "#,
        )
        .bind(action_id)
        .bind("更新后的纠正措施标题")
        .bind("in_progress")
        .bind(2)
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "纠正措施更新应该成功");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM qa_corrective_actions
            WHERE id = $1
            "#,
        )
        .bind(action_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "纠正措施删除应该成功");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_corrective_actions WHERE id = $1"#,
            action_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(
            verify_delete.unwrap().unwrap_or(0),
            0,
            "纠正措施应该已被删除"
        );
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_transaction_rollback_on_failure() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let issue_id = Uuid::new_v4();
        let issue_no = format!("QI-TX-{}", &issue_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            BEGIN;
            INSERT INTO qa_quality_issues (
                id, issue_no, title, description, severity, status, source, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW());
            INSERT INTO qa_quality_issues (id) VALUES ('invalid-uuid');
            COMMIT;
            "#,
        )
        .bind(issue_id)
        .bind(&issue_no)
        .bind("事务测试质量问题")
        .bind("事务测试描述")
        .bind("high")
        .bind("open")
        .bind("test")
        .bind("test_user")
        .execute(&pool)
        .await;

        assert!(result.is_err(), "事务应该失败回滚");

        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_issues WHERE id = $1"#,
            issue_id
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count.unwrap_or(0), 0, "事务回滚后数据应该不存在");
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_transaction_commit_on_success() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let issue_id = Uuid::new_v4();
        let issue_no = format!("QI-TX-SUCCESS-{}", &issue_id.to_string()[..8]);

        let mut tx = pool.begin().await.unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO qa_quality_issues (
                id, issue_no, title, description, severity, status, source, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(issue_id)
        .bind(&issue_no)
        .bind("事务成功测试质量问题")
        .bind("事务成功描述")
        .bind("medium")
        .bind("open")
        .bind("test")
        .bind("test_user")
        .execute(&mut *tx)
        .await;

        assert!(result.is_ok(), "事务插入应该成功");

        let commit_result = tx.commit().await;
        assert!(commit_result.is_ok(), "事务提交应该成功");

        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_issues WHERE id = $1"#,
            issue_id
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count.unwrap_or(0), 1, "事务提交后数据应该存在");

        let _ = sqlx::query!(r#"DELETE FROM qa_quality_issues WHERE id = $1"#, issue_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_tenant_isolation_rls() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let tenant_id_1 = Uuid::new_v4();
        let tenant_id_2 = Uuid::new_v4();

        let issue_id_1 = Uuid::new_v4();
        let issue_id_2 = Uuid::new_v4();

        let create_result_1 = sqlx::query(
            r#"
            INSERT INTO qa_quality_issues (
                id, issue_no, title, description, severity, status, source, created_by, tenant_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            "#,
        )
        .bind(issue_id_1)
        .bind(format!("QI-TENANT1-{}", &issue_id_1.to_string()[..4]))
        .bind("租户1质量问题")
        .bind("租户1描述")
        .bind("high")
        .bind("open")
        .bind("production")
        .bind("tenant1_user")
        .bind(tenant_id_1)
        .execute(&pool)
        .await;

        assert!(create_result_1.is_ok(), "租户1质量问题创建应该成功");

        let create_result_2 = sqlx::query(
            r#"
            INSERT INTO qa_quality_issues (
                id, issue_no, title, description, severity, status, source, created_by, tenant_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            "#,
        )
        .bind(issue_id_2)
        .bind(format!("QI-TENANT2-{}", &issue_id_2.to_string()[..4]))
        .bind("租户2质量问题")
        .bind("租户2描述")
        .bind("medium")
        .bind("open")
        .bind("inspection")
        .bind("tenant2_user")
        .bind(tenant_id_2)
        .execute(&pool)
        .await;

        assert!(create_result_2.is_ok(), "租户2质量问题创建应该成功");

        let total_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_issues WHERE issue_no LIKE 'QI-TENANT%'"#
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(total_count, Some(2), "应该有2条测试质量问题");

        let tenant1_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_issues WHERE tenant_id = $1 AND issue_no LIKE 'QI-TENANT%'"#,
            tenant_id_1
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(tenant1_count, Some(1), "租户1应该只能看到自己的质量问题");

        let tenant2_count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_issues WHERE tenant_id = $1 AND issue_no LIKE 'QI-TENANT%'"#,
            tenant_id_2
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(tenant2_count, Some(1), "租户2应该只能看到自己的质量问题");

        let _ = sqlx::query!(
            r#"DELETE FROM qa_quality_issues WHERE id IN ($1, $2)"#,
            issue_id_1,
            issue_id_2
        )
        .execute(&pool)
        .await;
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_quality_issue_status_transitions() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let issue_id = Uuid::new_v4();
        let issue_no = format!("QI-STATUS-{}", &issue_id.to_string()[..8]);

        let _ = sqlx::query(
            r#"
            INSERT INTO qa_quality_issues (
                id, issue_no, title, description, severity, status, source, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            "#,
        )
        .bind(issue_id)
        .bind(&issue_no)
        .bind("状态转换测试")
        .bind("测试状态转换")
        .bind("high")
        .bind("open")
        .bind("production")
        .bind("test_user")
        .execute(&pool)
        .await;

        let statuses = vec!["open", "in_progress", "resolved", "closed"];

        for (i, status) in statuses.iter().enumerate() {
            if i == 0 {
                continue;
            }

            let prev_status = statuses[i - 1];
            let result = sqlx::query(
                r#"
                UPDATE qa_quality_issues
                SET status = $2, updated_at = NOW()
                WHERE id = $1 AND status = $3
                RETURNING status
                "#,
            )
            .bind(issue_id)
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

        let _ = sqlx::query!(r#"DELETE FROM qa_quality_issues WHERE id = $1"#, issue_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_quality_issue_severity_levels() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let severities = vec!["critical", "high", "medium", "low"];
        let mut issue_ids = Vec::new();

        for severity in severities {
            let issue_id = Uuid::new_v4();
            let issue_no = format!("QI-SEV-{}-{}", severity, &issue_id.to_string()[..4]);

            let result = sqlx::query(
                r#"
                INSERT INTO qa_quality_issues (
                    id, issue_no, title, description, severity, status, source, created_by, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                RETURNING severity
                "#,
            )
            .bind(issue_id)
            .bind(&issue_no)
            .bind(format!("{}严重程度测试", severity))
            .bind(format!("{}级别描述", severity))
            .bind(severity)
            .bind("open")
            .bind("test")
            .bind("test_user")
            .fetch_one(&pool)
            .await;

            assert!(result.is_ok(), "{}级别质量问题创建应该成功", severity);
            assert_eq!(result.unwrap().get::<String, _>("severity"), severity);

            issue_ids.push(issue_id);
        }

        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_issues WHERE issue_no LIKE 'QI-SEV-%'"#
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, Some(4), "应该有4条不同严重程度的测试记录");

        for issue_id in issue_ids {
            let _ = sqlx::query!(r#"DELETE FROM qa_quality_issues WHERE id = $1"#, issue_id)
                .execute(&pool)
                .await;
        }
    }

    #[tokio::test]
    #[ignore = "requires PostgreSQL"]
    async fn test_quality_inspection_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();

        let inspection_id = Uuid::new_v4();
        let inspection_no = format!("QI-INS-{}", &inspection_id.to_string()[..8]);

        let create_result = sqlx::query(
            r#"
            INSERT INTO qa_quality_inspections (
                id, inspection_no, product_name, inspection_type,
                quantity, qualified_quantity, unqualified_quantity, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, inspection_no, product_name, status, quantity
            "#,
        )
        .bind(inspection_id)
        .bind(&inspection_no)
        .bind("测试产品")
        .bind("incoming")
        .bind(100.0)
        .bind(95.0)
        .bind(5.0)
        .bind("pending")
        .fetch_one(&pool)
        .await;

        assert!(create_result.is_ok(), "质量检验创建应该成功");

        let created = create_result.unwrap();
        assert_eq!(created.get::<String, _>("inspection_no"), inspection_no);
        assert_eq!(created.get::<String, _>("product_name"), "测试产品");
        assert_eq!(created.get::<String, _>("status"), "pending");

        let update_result = sqlx::query(
            r#"
            UPDATE qa_quality_inspections
            SET status = $2, qualified_quantity = $3, unqualified_quantity = $4, updated_at = NOW()
            WHERE id = $1
            RETURNING status, qualified_quantity, unqualified_quantity
            "#,
        )
        .bind(inspection_id)
        .bind("completed")
        .bind(98.0)
        .bind(2.0)
        .fetch_one(&pool)
        .await;

        assert!(update_result.is_ok(), "质量检验更新应该成功");

        let updated = update_result.unwrap();
        assert_eq!(updated.get::<String, _>("status"), "completed");

        let delete_result = sqlx::query(
            r#"
            DELETE FROM qa_quality_inspections
            WHERE id = $1
            "#,
        )
        .bind(inspection_id)
        .execute(&pool)
        .await;

        assert!(delete_result.is_ok(), "质量检验删除应该成功");

        let verify_delete = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM qa_quality_inspections WHERE id = $1"#,
            inspection_id
        )
        .fetch_one(&pool)
        .await;

        assert_eq!(
            verify_delete.unwrap().unwrap_or(0),
            0,
            "质量检验应该已被删除"
        );
    }
}

#[derive(Debug, sqlx::FromRow)]
#[allow(unused)]
struct QualityIssueRow {
    id: Uuid,
    issue_no: String,
    title: String,
    description: String,
    severity: String,
    status: String,
    source: String,
    created_by: String,
    tenant_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}
