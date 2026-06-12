// EHS 服务集成测试

#[cfg(test)]
mod tests {
    use sqlx::postgres::PgPoolOptions;
    use uuid::Uuid;

    // 测试数据库连接
    #[tokio::test]
    async fn test_database_connection() {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await;

        assert!(pool.is_ok(), "数据库连接应该成功");
    }

    // 测试环境监测点创建
    #[tokio::test]
    async fn test_create_monitoring_point() {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let point_id = Uuid::new_v4();
        let point_no = format!("EMP-{}", &point_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO ehs.monitoring_points (id, point_no, name, point_type, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            "#,
        )
        .bind(point_id)
        .bind(&point_no)
        .bind("测试监测点")
        .bind("air")
        .bind("active")
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "监测点创建应该成功: {:?}", result.err());
    }

    // 测试安全事件创建
    #[tokio::test]
    async fn test_create_safety_incident() {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let incident_id = Uuid::new_v4();
        let incident_no = format!("INC-{}", &incident_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO ehs.safety_incidents (id, incident_no, title, incident_type, incident_level, incident_time, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                updated_at = NOW()
            "#,
        )
        .bind(incident_id)
        .bind(&incident_no)
        .bind("测试安全事件")
        .bind("accident")
        .bind("medium")
        .bind("2024-01-15 10:00:00+00")
        .bind("reported")
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "安全事件创建应该成功: {:?}", result.err());
    }

    // 测试风险评估
    #[tokio::test]
    async fn test_risk_assessment() {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let assessment_id = Uuid::new_v4();
        let assessment_no = format!("RA-{}", &assessment_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO ehs.risk_assessments (id, assessment_no, title, assessment_type, risk_source, risk_category, likelihood, consequence, risk_level, risk_score, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                updated_at = NOW()
            "#,
        )
        .bind(assessment_id)
        .bind(&assessment_no)
        .bind("测试风险评估")
        .bind("routine")
        .bind("设备故障")
        .bind("生产安全")
        .bind(3)
        .bind(4)
        .bind("medium")
        .bind(12)
        .bind("active")
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "风险评估创建应该成功");
    }

    // 测试审计日志
    #[tokio::test]
    async fn test_audit_log() {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://topems:topems_secret@localhost:5432/topems".to_string()
        });

        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO shared.audit_logs (action, resource, resource_id, user_id, status)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind("create")
        .bind("environment")
        .bind(Uuid::new_v4())
        .bind(Uuid::new_v4())
        .bind("success")
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "审计日志记录应该成功");
    }
}
