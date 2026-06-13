// RS 服务集成测试

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
    async fn test_projects_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rs' AND table_name = 'projects')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "项目表应该存在");
            }
            Err(e) => {
                panic!("查询项目表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_experiments_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rs' AND table_name = 'experiments')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "试验表应该存在");
            }
            Err(e) => {
                panic!("查询试验表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_formulas_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rs' AND table_name = 'formulas')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "配方表应该存在");
            }
            Err(e) => {
                panic!("查询配方表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_project_phases_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rs' AND table_name = 'project_phases')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "项目阶段表应该存在");
            }
            Err(e) => {
                panic!("查询项目阶段表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_project_milestones_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rs' AND table_name = 'project_milestones')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "项目里程碑表应该存在");
            }
            Err(e) => {
                panic!("查询项目里程碑表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_project_members_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rs' AND table_name = 'project_members')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "项目成员表应该存在");
            }
            Err(e) => {
                panic!("查询项目成员表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_audit_logs_table_exists() {
        let pool = setup_test_pool().await.unwrap();

        let result = sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rs' AND table_name = 'audit_logs')")
            .fetch_one(&pool)
            .await;

        match result {
            Ok(row) => {
                let exists: bool = row.get(0);
                assert!(exists, "审计日志表应该存在");
            }
            Err(e) => {
                panic!("查询审计日志表失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_create_project() {
        let pool = setup_test_pool().await.unwrap();

        let project_id = Uuid::new_v4();
        let project_code = format!("RS-{}", &project_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO rs.projects (
                id, name, code, description, project_type, status, leader,
                team_members, start_date, progress, created_by, created_at, updated_at,
                risk_level, priority
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), $12, $13)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(project_id)
        .bind(format!("测试项目-{}", &project_id.to_string()[..8]))
        .bind(&project_code)
        .bind("这是一个测试研发项目")
        .bind("新产品研发")
        .bind("draft")
        .bind("测试负责人")
        .bind(serde_json::json!([]))
        .bind(chrono::Utc::now())
        .bind(0)
        .bind("测试负责人")
        .bind("MEDIUM")
        .bind(3)
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "项目创建应该成功");

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM rs.projects WHERE id = $1")
            .bind(project_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_experiment() {
        let pool = setup_test_pool().await.unwrap();

        // 先创建一个项目
        let project_id = Uuid::new_v4();
        let project_code = format!("RS-TEST-{}", &project_id.to_string()[..6]);

        sqlx::query(
            r#"
            INSERT INTO rs.projects (id, name, code, project_type, status, leader, start_date, progress, created_by, created_at, updated_at, risk_level, priority)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11)
            "#,
        )
        .bind(project_id)
        .bind("测试项目")
        .bind(&project_code)
        .bind("新产品研发")
        .bind("draft")
        .bind("测试负责人")
        .bind(chrono::Utc::now())
        .bind(0)
        .bind("测试负责人")
        .bind("MEDIUM")
        .bind(3)
        .execute(&pool)
        .await
        .expect("创建测试项目失败");

        // 创建试验
        let experiment_id = Uuid::new_v4();
        let experiment_code = format!("EXP-{}", &experiment_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO rs.experiments (
                id, name, code, project_id, experiment_type, phase, status,
                experimenter, started_at, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING id
            "#,
        )
        .bind(experiment_id)
        .bind(format!("测试试验-{}", &experiment_id.to_string()[..6]))
        .bind(&experiment_code)
        .bind(project_id)
        .bind("活性测试")
        .bind("lab")
        .bind("planned")
        .bind("测试实验员")
        .bind(chrono::Utc::now())
        .bind("测试实验员")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "试验创建应该成功");

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM rs.experiments WHERE id = $1")
            .bind(experiment_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query("DELETE FROM rs.projects WHERE id = $1")
            .bind(project_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_formula() {
        let pool = setup_test_pool().await.unwrap();

        let formula_id = Uuid::new_v4();
        let formula_code = format!("FM-{}", &formula_id.to_string()[..8]);

        let result = sqlx::query(
            r#"
            INSERT INTO rs.formulas (
                id, name, code, version, category, description, status, ingredients,
                created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                updated_at = NOW()
            RETURNING id
            "#,
        )
        .bind(formula_id)
        .bind(format!("测试配方-{}", &formula_id.to_string()[..6]))
        .bind(&formula_code)
        .bind("v1.0")
        .bind("测试类别")
        .bind("这是一个测试配方")
        .bind("draft")
        .bind(serde_json::json!([]))
        .bind("测试创建人")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "配方创建应该成功");

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM rs.formulas WHERE id = $1")
            .bind(formula_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_project_phase() {
        let pool = setup_test_pool().await.unwrap();

        // 先创建一个项目
        let project_id = Uuid::new_v4();
        let project_code = format!("RS-PHASE-{}", &project_id.to_string()[..6]);

        sqlx::query(
            r#"
            INSERT INTO rs.projects (id, name, code, project_type, status, leader, start_date, progress, created_by, created_at, updated_at, risk_level, priority)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11)
            "#,
        )
        .bind(project_id)
        .bind("测试阶段项目")
        .bind(&project_code)
        .bind("新产品研发")
        .bind("draft")
        .bind("测试负责人")
        .bind(chrono::Utc::now())
        .bind(0)
        .bind("测试负责人")
        .bind("MEDIUM")
        .bind(3)
        .execute(&pool)
        .await
        .expect("创建测试项目失败");

        // 创建项目阶段
        let phase_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO rs.project_phases (
                id, project_id, phase_number, name, description, status, progress,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id
            "#,
        )
        .bind(phase_id)
        .bind(project_id)
        .bind(1)
        .bind("立项调研")
        .bind("项目立项调研阶段")
        .bind("pending")
        .bind(0)
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "项目阶段创建应该成功");

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM rs.project_phases WHERE id = $1")
            .bind(phase_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query("DELETE FROM rs.projects WHERE id = $1")
            .bind(project_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_create_project_milestone() {
        let pool = setup_test_pool().await.unwrap();

        // 先创建一个项目
        let project_id = Uuid::new_v4();
        let project_code = format!("RS-MS-{}", &project_id.to_string()[..6]);

        sqlx::query(
            r#"
            INSERT INTO rs.projects (id, name, code, project_type, status, leader, start_date, progress, created_by, created_at, updated_at, risk_level, priority)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11)
            "#,
        )
        .bind(project_id)
        .bind("测试里程碑项目")
        .bind(&project_code)
        .bind("新产品研发")
        .bind("draft")
        .bind("测试负责人")
        .bind(chrono::Utc::now())
        .bind(0)
        .bind("测试负责人")
        .bind("MEDIUM")
        .bind(3)
        .execute(&pool)
        .await
        .expect("创建测试项目失败");

        // 创建项目里程碑
        let milestone_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO rs.project_milestones (
                id, project_id, name, description, target_date, status,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING id
            "#,
        )
        .bind(milestone_id)
        .bind(project_id)
        .bind("完成调研报告")
        .bind("完成项目调研报告里程碑")
        .bind(chrono::Utc::now())
        .bind("pending")
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "项目里程碑创建应该成功");

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM rs.project_milestones WHERE id = $1")
            .bind(milestone_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query("DELETE FROM rs.projects WHERE id = $1")
            .bind(project_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_audit_log_creation() {
        let pool = setup_test_pool().await.unwrap();

        let audit_id = Uuid::new_v4();

        let result = sqlx::query(
            r#"
            INSERT INTO rs.audit_logs (
                id, action, entity_type, entity_id, created_at
            ) VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
            "#,
        )
        .bind(audit_id)
        .bind("create")
        .bind("project")
        .bind(Uuid::new_v4())
        .fetch_one(&pool)
        .await;

        assert!(result.is_ok(), "审计日志创建应该成功");

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM rs.audit_logs WHERE id = $1")
            .bind(audit_id)
            .execute(&pool)
            .await;
    }

    #[tokio::test]
    async fn test_experiment_phase_advancement() {
        let pool = setup_test_pool().await.unwrap();

        // 先创建一个项目
        let project_id = Uuid::new_v4();
        let project_code = format!("RS-PHASE-ADV-{}", &project_id.to_string()[..6]);

        sqlx::query(
            r#"
            INSERT INTO rs.projects (id, name, code, project_type, status, leader, start_date, progress, created_by, created_at, updated_at, risk_level, priority)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11)
            "#,
        )
        .bind(project_id)
        .bind("测试阶段推进项目")
        .bind(&project_code)
        .bind("新产品研发")
        .bind("draft")
        .bind("测试负责人")
        .bind(chrono::Utc::now())
        .bind(0)
        .bind("测试负责人")
        .bind("MEDIUM")
        .bind(3)
        .execute(&pool)
        .await
        .expect("创建测试项目失败");

        // 创建小试阶段试验
        let experiment_id = Uuid::new_v4();
        let experiment_code = format!("EXP-PHASE-{}", &experiment_id.to_string()[..6]);

        sqlx::query(
            r#"
            INSERT INTO rs.experiments (
                id, name, code, project_id, experiment_type, phase, status,
                experimenter, started_at, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            "#,
        )
        .bind(experiment_id)
        .bind("测试阶段推进试验")
        .bind(&experiment_code)
        .bind(project_id)
        .bind("活性测试")
        .bind("lab")
        .bind("completed")
        .bind("测试实验员")
        .bind(chrono::Utc::now())
        .bind("测试实验员")
        .execute(&pool)
        .await
        .expect("创建测试试验失败");

        // 推进阶段到中试
        let update_result = sqlx::query(
            r#"
            UPDATE rs.experiments SET phase = 'pilot', status = 'planned', updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(experiment_id)
        .execute(&pool)
        .await;

        assert!(update_result.is_ok(), "试验阶段推进应该成功");

        // 验证阶段已更新
        let check_result =
            sqlx::query_scalar::<_, String>("SELECT phase FROM rs.experiments WHERE id = $1")
                .bind(experiment_id)
                .fetch_one(&pool)
                .await;

        match check_result {
            Ok(phase) => {
                assert_eq!(phase, "pilot", "阶段应该更新为 pilot");
            }
            Err(e) => {
                panic!("查询阶段失败: {}", e);
            }
        }

        // 清理测试数据
        let _ = sqlx::query("DELETE FROM rs.experiments WHERE id = $1")
            .bind(experiment_id)
            .execute(&pool)
            .await;
        let _ = sqlx::query("DELETE FROM rs.projects WHERE id = $1")
            .bind(project_id)
            .execute(&pool)
            .await;
    }
}
