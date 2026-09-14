// Analytics 服务集成测试

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

    async fn ensure_db_available() -> bool {
        if tokio::net::TcpStream::connect("localhost:5432")
            .await
            .is_err()
        {
            return false;
        }
        match PgPool::connect(TEST_DATABASE_URL).await {
            Ok(pool) => sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'bi' AND table_name = 'analytics_dashboards'",
            )
            .fetch_one(&pool)
            .await
            .map(|c| c > 0)
            .unwrap_or(false),
            Err(_) => false,
        }
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
    async fn test_analytics_dashboard_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let dash_id = Uuid::new_v4();

        let create = sqlx::query(
            r#"INSERT INTO bi.analytics_dashboards (id, name, description, owner_id, is_public, auto_refresh_enabled, created_at, updated_at)
               VALUES ($1, '生产概览看板', '实时生产数据概览', 'user-001', true, false, NOW(), NOW())
               RETURNING id, name, owner_id, is_public"#,
        )
        .bind(dash_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "看板创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("name"), "生产概览看板");

        let read = sqlx::query("SELECT id, name, description FROM bi.analytics_dashboards WHERE id = $1")
            .bind(dash_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "看板读取应该成功");

        let update = sqlx::query("UPDATE bi.analytics_dashboards SET name = '生产概览看板V2', auto_refresh_enabled = true, auto_refresh_interval = 300, updated_at = NOW() WHERE id = $1 RETURNING name, auto_refresh_enabled")
            .bind(dash_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "看板更新应该成功");
        assert!(update.unwrap().get::<bool, _>("auto_refresh_enabled"));

        sqlx::query("DELETE FROM bi.analytics_dashboards WHERE id = $1").bind(dash_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_report_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let report_id = Uuid::new_v4();

        let create = sqlx::query(
            r#"INSERT INTO bi.reports (id, name, description, report_type, status, config, created_at, updated_at)
               VALUES ($1, '月度生产报表', '每月生产数据汇总', 'pdf', 'draft', '{"format": "pdf"}'::jsonb, NOW(), NOW())
               RETURNING id, name, report_type, status"#,
        )
        .bind(report_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "报表创建应该成功: {:?}", create.err());
        assert_eq!(create.unwrap().get::<String, _>("name"), "月度生产报表");

        let read = sqlx::query("SELECT id, name, report_type FROM bi.reports WHERE id = $1")
            .bind(report_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "报表读取应该成功");

        let publish = sqlx::query("UPDATE bi.reports SET status = 'published', updated_at = NOW() WHERE id = $1 RETURNING id")
            .bind(report_id).fetch_one(&pool).await;
        assert!(publish.is_ok(), "报表发布应该成功");

        sqlx::query("DELETE FROM bi.reports WHERE id = $1").bind(report_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_report_schedule_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let sched_id = Uuid::new_v4();
        let report_id = Uuid::new_v4();

        // 先创建关联的 report
        sqlx::query("INSERT INTO bi.reports (id, name, report_type, status, config, created_at, updated_at) VALUES ($1, '定时报表', 'pdf', 'published', '{}'::jsonb, NOW(), NOW())")
            .bind(report_id).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO bi.report_schedules (id, report_id, schedule_type, cron_expression, is_active, next_run_at, created_at, updated_at)
               VALUES ($1, $2, 'cron', '0 0 1 * *', true, NOW() + INTERVAL '1 day', NOW(), NOW())
               RETURNING id, report_id, schedule_type, is_active"#,
        )
        .bind(sched_id).bind(report_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "报表计划创建应该成功");
        assert!(create.unwrap().get::<bool, _>("is_active"));

        let read = sqlx::query("SELECT id, cron_expression FROM bi.report_schedules WHERE id = $1")
            .bind(sched_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "报表计划读取应该成功");

        let deactivate = sqlx::query("UPDATE bi.report_schedules SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING is_active")
            .bind(sched_id).fetch_one(&pool).await;
        assert!(deactivate.is_ok(), "报表计划停用应该成功");
        assert!(!deactivate.unwrap().get::<bool, _>("is_active"));

        sqlx::query("DELETE FROM bi.report_schedules WHERE id = $1").bind(sched_id).execute(&pool).await.unwrap();
        sqlx::query("DELETE FROM bi.reports WHERE id = $1").bind(report_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_report_template_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let tpl_id = Uuid::new_v4();

        let create = sqlx::query(
            r#"INSERT INTO bi.report_templates (id, name, description, template_type, template_content, is_active, created_at, updated_at)
               VALUES ($1, '标准生产报表模板', '通用生产报表格式', 'pdf', '{"format": "pdf", "layout": "standard"}'::jsonb, true, NOW(), NOW())
               RETURNING id, name, is_active"#,
        )
        .bind(tpl_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "报表模板创建应该成功");
        assert!(create.unwrap().get::<bool, _>("is_active"));

        let read = sqlx::query("SELECT id, name FROM bi.report_templates WHERE id = $1")
            .bind(tpl_id).fetch_one(&pool).await;
        assert!(read.is_ok(), "报表模板读取应该成功");

        let update = sqlx::query("UPDATE bi.report_templates SET name = '标准生产报表模板V2', updated_at = NOW() WHERE id = $1 RETURNING name")
            .bind(tpl_id).fetch_one(&pool).await;
        assert!(update.is_ok(), "报表模板更新应该成功");

        sqlx::query("DELETE FROM bi.report_templates WHERE id = $1").bind(tpl_id).execute(&pool).await.unwrap();
    }

    #[tokio::test]
    async fn test_bi_schema_table_count() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'bi'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(count >= 10, "bi schema 应该至少有 10 个表，实际有 {}", count);
        eprintln!("bi schema 表数量: {}", count);
    }
}
