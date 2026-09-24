// LIMS 服务集成测试

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
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lims' AND table_name = 'instruments'",
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
    async fn test_instrument_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let inst_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let inst_code = format!("HPLC-{}", &inst_id.to_string()[..8]);

        let create = sqlx::query(
            r#"INSERT INTO lims.instruments (id, organization_id, name, code, instrument_type, model, manufacturer, serial_number, status, location, created_at, updated_at)
               VALUES ($1, $2, '高效液相色谱仪', $3, 'chromatography', 'Agilent 1260', 'Agilent', 'SN2024001', 'active', '实验室A区', NOW(), NOW())
               RETURNING id, name, code, status"#,
        )
        .bind(inst_id).bind(org_id).bind(&inst_code).fetch_one(&pool).await;
        assert!(create.is_ok(), "仪器创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "active");

        let read =
            sqlx::query("SELECT id, name, instrument_type FROM lims.instruments WHERE id = $1")
                .bind(inst_id)
                .fetch_one(&pool)
                .await;
        assert!(read.is_ok(), "仪器读取应该成功");

        let calibrate = sqlx::query("UPDATE lims.instruments SET status = 'calibration', updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(inst_id).fetch_one(&pool).await;
        assert!(calibrate.is_ok(), "仪器校准状态更新应该成功");
        assert_eq!(calibrate.unwrap().get::<String, _>("status"), "calibration");

        sqlx::query("DELETE FROM lims.instruments WHERE id = $1")
            .bind(inst_id)
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_inspection_record_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let rec_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let task_id = Uuid::new_v4();
        let step_id = Uuid::new_v4();
        let sample_id = Uuid::new_v4();
        let process_id = Uuid::new_v4();
        let sample_code = format!("SAMPLE-{}", &sample_id.to_string()[..8]);
        let process_code = format!("PROC-{}", &process_id.to_string()[..8]);

        // 先创建关联的 inspection_process（外键约束）
        sqlx::query("INSERT INTO lims.inspection_processes (id, organization_id, name, code, steps, status, created_by, created_at, updated_at) VALUES ($1, $2, '标准检验流程', $3, '[]'::jsonb, 'active', 'admin', NOW(), NOW())")
            .bind(process_id).bind(org_id).bind(&process_code).execute(&pool).await.unwrap();

        // 先创建关联的 sample（外键约束）
        sqlx::query("INSERT INTO lims.samples (id, organization_id, name, code, status, received_date, created_by, created_at, updated_at) VALUES ($1, $2, '测试样品', $3, 'received', NOW(), 'admin', NOW(), NOW())")
            .bind(sample_id).bind(org_id).bind(&sample_code).execute(&pool).await.unwrap();

        // 先创建关联的 inspection_task（外键约束）
        sqlx::query("INSERT INTO lims.inspection_tasks (id, organization_id, sample_id, process_id, current_step, status, inspector, priority, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, 0, 'pending', '检验员张三', 'high', 'admin', NOW(), NOW())")
            .bind(task_id).bind(org_id).bind(sample_id).bind(process_id).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO lims.inspection_records (id, organization_id, task_id, step_id, step_name, result, conclusion, inspector, recorded_at, created_at)
               VALUES ($1, $2, $3, $4, '样品前处理', '样品已研磨至200目', '合格', '检验员张三', NOW(), NOW())
               RETURNING id, step_name, conclusion, inspector"#,
        )
        .bind(rec_id).bind(org_id).bind(task_id).bind(step_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "检验记录创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("conclusion"), "合格");

        let read =
            sqlx::query("SELECT id, result, inspector FROM lims.inspection_records WHERE id = $1")
                .bind(rec_id)
                .fetch_one(&pool)
                .await;
        assert!(read.is_ok(), "检验记录读取应该成功");

        sqlx::query("DELETE FROM lims.inspection_records WHERE id = $1")
            .bind(rec_id)
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("DELETE FROM lims.inspection_tasks WHERE id = $1")
            .bind(task_id)
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_instrument_calibration_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let cal_id = Uuid::new_v4();
        let inst_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let cal_inst_code = format!("CAL-{}", &inst_id.to_string()[..8]);

        // 先创建关联的 instrument
        sqlx::query("INSERT INTO lims.instruments (id, organization_id, name, code, instrument_type, status, created_at, updated_at) VALUES ($1, $2, '校准测试仪器', $3, 'spectrometer', 'active', NOW(), NOW())")
            .bind(inst_id).bind(org_id).bind(&cal_inst_code).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO lims.instrument_calibrations (id, organization_id, instrument_id, calibration_date, calibrated_by, calibration_results, notes, created_at)
               VALUES ($1, $2, $3, CURRENT_DATE, '校准工程师李四', '{"pass": true, "deviation": 0.02}'::jsonb, '年度校准合格', NOW())
               RETURNING id, instrument_id, calibrated_by"#,
        )
        .bind(cal_id).bind(org_id).bind(inst_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "仪器校准记录创建应该成功");
        assert_eq!(
            create.unwrap().get::<String, _>("calibrated_by"),
            "校准工程师李四"
        );

        let read = sqlx::query(
            "SELECT id, calibration_date, notes FROM lims.instrument_calibrations WHERE id = $1",
        )
        .bind(cal_id)
        .fetch_one(&pool)
        .await;
        assert!(read.is_ok(), "仪器校准记录读取应该成功");

        sqlx::query("DELETE FROM lims.instrument_calibrations WHERE id = $1")
            .bind(cal_id)
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("DELETE FROM lims.instruments WHERE id = $1")
            .bind(inst_id)
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_inspection_task_crud() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let task_id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let sample_id = Uuid::new_v4();
        let process_id = Uuid::new_v4();
        let sample_code = format!("SAMPLE-{}", &sample_id.to_string()[..8]);
        let process_code = format!("PROC-{}", &process_id.to_string()[..8]);

        // 先创建关联的 inspection_process（外键约束）
        sqlx::query("INSERT INTO lims.inspection_processes (id, organization_id, name, code, steps, status, created_by, created_at, updated_at) VALUES ($1, $2, '标准检验流程', $3, '[]'::jsonb, 'active', 'admin', NOW(), NOW())")
            .bind(process_id).bind(org_id).bind(&process_code).execute(&pool).await.unwrap();

        // 先创建关联的 sample（外键约束）
        sqlx::query("INSERT INTO lims.samples (id, organization_id, name, code, status, received_date, created_by, created_at, updated_at) VALUES ($1, $2, '测试样品', $3, 'received', NOW(), 'admin', NOW(), NOW())")
            .bind(sample_id).bind(org_id).bind(&sample_code).execute(&pool).await.unwrap();

        let create = sqlx::query(
            r#"INSERT INTO lims.inspection_tasks (id, organization_id, sample_id, process_id, current_step, status, inspector, priority, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 0, 'pending', '检验员王五', 'high', 'admin', NOW(), NOW())
               RETURNING id, status, inspector, priority"#,
        )
        .bind(task_id).bind(org_id).bind(sample_id).bind(process_id).fetch_one(&pool).await;
        assert!(create.is_ok(), "检验任务创建应该成功");
        assert_eq!(create.unwrap().get::<String, _>("status"), "pending");

        let read =
            sqlx::query("SELECT id, status, inspector FROM lims.inspection_tasks WHERE id = $1")
                .bind(task_id)
                .fetch_one(&pool)
                .await;
        assert!(read.is_ok(), "检验任务读取应该成功");

        let start = sqlx::query("UPDATE lims.inspection_tasks SET status = 'in_progress', started_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(task_id).fetch_one(&pool).await;
        assert!(start.is_ok(), "检验任务开始应该成功");
        assert_eq!(start.unwrap().get::<String, _>("status"), "in_progress");

        let complete = sqlx::query("UPDATE lims.inspection_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING status")
            .bind(task_id).fetch_one(&pool).await;
        assert!(complete.is_ok(), "检验任务完成应该成功");
        assert_eq!(complete.unwrap().get::<String, _>("status"), "completed");

        sqlx::query("DELETE FROM lims.inspection_tasks WHERE id = $1")
            .bind(task_id)
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_lims_schema_table_count() {
        if !ensure_db_available().await {
            eprintln!("⏭ 跳过: 数据库未运行 (localhost:5432)");
            return;
        }
        let pool = setup_test_pool().await.unwrap();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'lims'",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert!(
            count >= 10,
            "lims schema 应该至少有 10 个表，实际有 {}",
            count
        );
        eprintln!("lims schema 表数量: {}", count);
    }
}
