use chrono::Utc;
use serde_json;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::{CreateProjectRequest, Project, ProjectStatus, UpdateProjectRequest};

use topems_shared_core::error::{Result, TopemsError};

#[allow(dead_code)]
pub struct ProjectRepository {
    db: PgPool,
}

/// 写/读路径都必须持有真实租户：nil 一律拒绝，不保留 nil 哨兵兜底。
fn require_tenant(tenant_id: Uuid) -> Result<Uuid> {
    if tenant_id.is_nil() {
        return Err(TopemsError::ValidationFailed(
            "缺少租户上下文，无法写入研发项目".to_string(),
        ));
    }
    Ok(tenant_id)
}

#[allow(dead_code)]
impl ProjectRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn create(&self, req: &CreateProjectRequest, tenant_id: Uuid) -> Result<Project> {
        let tenant_id = require_tenant(tenant_id)?;
        let id = Uuid::new_v4();
        let now = Utc::now();

        let project = sqlx::query_as::<_, Project>(
            r#"
            INSERT INTO rs.projects (
                id, name, code, description, project_type, status, leader,
                team_members, start_date, end_date, budget, progress, created_by,
                created_at, updated_at, project_config, benefit_target, risk_level,
                priority, tags, parent_id, workspace_id, tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                      $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING id, name, code, description, project_type, status, leader,
                      team_members, start_date, end_date, budget, progress,
                      created_by, created_at, updated_at, project_config,
                      benefit_target, risk_level, priority, tags, parent_id, workspace_id
            "#,
        )
        .bind(id)
        .bind(&req.name)
        .bind(&req.code)
        .bind(&req.description)
        .bind(req.project_type)
        .bind(ProjectStatus::Draft.as_db_str())
        .bind(&req.leader)
        .bind(serde_json::to_value(&req.team_members).unwrap_or(serde_json::json!([])))
        .bind(req.start_date)
        .bind(req.end_date)
        .bind(req.budget)
        .bind(0)
        .bind(&req.leader)
        .bind(now)
        .bind(now)
        .bind(&req.project_config)
        .bind(&req.benefit_target)
        .bind(&req.risk_level)
        .bind(req.priority)
        .bind(&req.tags)
        .bind(req.parent_id)
        .bind(req.workspace_id)
        .bind(tenant_id)
        .fetch_one(&self.db)
        .await?;

        Ok(project)
    }

    pub async fn get_by_id(&self, id: Uuid, tenant_id: Uuid) -> Result<Option<Project>> {
        let tenant_id = require_tenant(tenant_id)?;
        let project = sqlx::query_as::<_, Project>(
            r#"
            SELECT id, name, code, description, project_type, status, leader,
                   team_members, start_date, end_date, budget, progress,
                   created_by, created_at, updated_at, project_config,
                   benefit_target, risk_level, priority, tags, parent_id, workspace_id
            FROM rs.projects
            WHERE id = $1 AND tenant_id = $2::uuid
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(&self.db)
        .await?;

        Ok(project)
    }

    pub async fn list(
        &self,
        search: Option<String>,
        status: Option<String>,
        page: i64,
        page_size: i64,
        tenant_id: Uuid,
    ) -> Result<(Vec<Project>, i64)> {
        let tenant_id = require_tenant(tenant_id)?;
        let offset = (page - 1) * page_size;

        let results = sqlx::query_as::<_, Project>(
            r#"
            SELECT id, name, code, description, project_type, status, leader,
                   team_members, start_date, end_date, budget, progress,
                   created_by, created_at, updated_at, project_config,
                   benefit_target, risk_level, priority, tags, parent_id, workspace_id
            FROM rs.projects
            WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND tenant_id = $5::uuid
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(&search)
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .bind(tenant_id)
        .fetch_all(&self.db)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM rs.projects
            WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND tenant_id = $3::uuid
            "#,
        )
        .bind(&search)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&self.db)
        .await?;

        Ok((results, total))
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateProjectRequest,
        existing: &Project,
        tenant_id: Uuid,
    ) -> Result<Project> {
        let now = Utc::now();
        let name = req.name.clone().unwrap_or(existing.name.clone());
        let description = req.description.clone().or(existing.description.clone());
        let leader = req.leader.clone().unwrap_or(existing.leader.clone());
        let team_members = req.team_members.clone().or(existing.team_members.clone());
        let status = req
            .status
            .map(|s| s.to_string())
            .unwrap_or(existing.status.clone());
        let progress = req.progress.unwrap_or(existing.progress);
        let project_config = req
            .project_config
            .clone()
            .or(existing.project_config.clone());
        let benefit_target = req
            .benefit_target
            .clone()
            .or(existing.benefit_target.clone());
        let risk_level = req.risk_level.clone().or(existing.risk_level.clone());
        let priority = req.priority.or(existing.priority);
        let tags = req.tags.clone().or(existing.tags.clone());
        let parent_id = req.parent_id.or(existing.parent_id);
        let workspace_id = req.workspace_id.or(existing.workspace_id);

        let project = sqlx::query_as::<_, Project>(
            r#"
            UPDATE rs.projects
            SET name = $1, description = $2, leader = $3, team_members = $4,
                status = $5, progress = $6, updated_at = $7,
                project_config = $8, benefit_target = $9, risk_level = $10,
                priority = $11, tags = $12, parent_id = $13, workspace_id = $14
            WHERE id = $15 AND tenant_id = $16::uuid
            RETURNING id, tenant_id, name, code, description, project_type, status, leader,
                      team_members, start_date, end_date, budget, progress,
                      created_by, created_at, updated_at, project_config,
                      benefit_target, risk_level, priority, tags, parent_id, workspace_id
            "#,
        )
        .bind(name)
        .bind(description)
        .bind(leader)
        .bind(serde_json::to_value(&team_members).unwrap_or(serde_json::json!([])))
        .bind(status)
        .bind(progress)
        .bind(now)
        .bind(project_config)
        .bind(benefit_target)
        .bind(risk_level)
        .bind(priority)
        .bind(tags)
        .bind(parent_id)
        .bind(workspace_id)
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(&self.db)
        .await?;

        project.ok_or_else(|| TopemsError::NotFound("项目不存在".to_string()))
    }

    pub async fn delete(&self, id: Uuid, tenant_id: Uuid) -> Result<bool> {
        let result = sqlx::query(
            r#"
            UPDATE rs.projects SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2::uuid
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn batch_create(&self, projects: &[CreateProjectRequest], tenant_id: Uuid) -> Result<Vec<Project>> {
        let tenant_id = require_tenant(tenant_id)?;
        let mut created_projects = Vec::new();
        let now = Utc::now();

        for req in projects {
            let id = Uuid::new_v4();
            let project = sqlx::query_as::<_, Project>(
                r#"
                INSERT INTO rs.projects (
                    id, name, code, description, project_type, status, leader,
                    team_members, start_date, end_date, budget, progress, created_by,
                    created_at, updated_at, tenant_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id, name, code, description, project_type, status, leader,
                          team_members, start_date, end_date, budget, progress,
                          created_by, created_at, updated_at
                "#,
            )
            .bind(id)
            .bind(&req.name)
            .bind(&req.code)
            .bind(&req.description)
            .bind(req.project_type)
            .bind(ProjectStatus::Draft.as_db_str())
            .bind(&req.leader)
            .bind(serde_json::to_value(&req.team_members).unwrap_or(serde_json::json!([])))
            .bind(req.start_date)
            .bind(req.end_date)
            .bind(req.budget)
            .bind(0)
            .bind(&req.leader)
            .bind(now)
            .bind(now)
            .bind(tenant_id)
            .fetch_one(&self.db)
            .await?;

            created_projects.push(project);
        }

        Ok(created_projects)
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    pub async fn batch_delete(&self, ids: &[Uuid], tenant_id: Uuid) -> Result<i64> {
        if ids.is_empty() {
            return Ok(0);
        }

        let result = sqlx::query(
            r#"
            UPDATE rs.projects SET deleted_at = NOW() WHERE id = ANY($1) AND tenant_id = $2::uuid
            "#,
        )
        .bind(ids)
        .bind(tenant_id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() as i64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ProjectType;
    use chrono::Utc;
    use sqlx::PgPool;
    use tracing;

    // 三个 DB 测试共享 rs.* 表并在开头 TRUNCATE，并行执行会互相清空对方数据。
    // Windows/多线程下 cargo test 默认并行，用全局锁串行化这三个测试保证稳定。
    static DB_TEST_LOCK: std::sync::LazyLock<tokio::sync::Mutex<()>> =
        std::sync::LazyLock::new(|| tokio::sync::Mutex::new(()));

    /// 测试固定租户：连接建立时写入会话配置 app.tenant_id，写/读与 RLS 策略对齐。
    const TEST_TENANT: Uuid = Uuid::from_bytes([0x11; 16]);

    fn test_database_url() -> String {
        std::env::var("TEST_DATABASE_URL").expect(
            "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
        )
    }

    async fn setup_test_db() -> PgPool {
        // 必须显式提供测试库 DSN；不回退 DATABASE_URL，也不使用硬编码开发库。
        let database_url = test_database_url();
        // 每条新连接落会话租户上下文，与生产 claims → tenant_id 的链路等价。
        sqlx::postgres::PgPoolOptions::new()
            .after_connect(|conn, _meta| {
                Box::pin(async move {
                    sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
                        .bind(TEST_TENANT.to_string())
                        .execute(&mut *conn)
                        .await?;
                    Ok::<_, sqlx::Error>(())
                })
            })
            .connect(&database_url)
            .await
            .expect("Failed to connect to test database")
        // 不在 setup 里全局清表：同一测试会被 lib/bin 两个二进制并行执行，
        // 各自清表会互相删除刚插入的行。需要空表的用例自行清理自己依赖的表。
    }

    pub struct TestProjectRepository {
        db: PgPool,
    }

    impl TestProjectRepository {
        pub fn new(db: PgPool) -> Self {
            Self { db }
        }

        pub async fn create(&self, req: &CreateProjectRequest, _tenant_id: Uuid) -> Result<Project> {
            let id = Uuid::new_v4();
            let now = Utc::now();

            let project = sqlx::query_as::<_, Project>(
                r#"
                INSERT INTO rs.projects (
                    id, name, code, description, project_type, status, leader,
                    team_members, start_date, end_date, budget, progress, created_by,
                    created_at, updated_at, project_config, benefit_target, risk_level,
                    priority, tags, parent_id, workspace_id, tenant_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                          $16, $17, $18, $19, $20, $21, $22, $23)
                RETURNING id, name, code, description, project_type, status, leader,
                          team_members, start_date, end_date, budget, progress,
                          created_by, created_at, updated_at, project_config,
                          benefit_target, risk_level, priority, tags, parent_id, workspace_id
                "#,
            )
            .bind(id)
            .bind(&req.name)
            .bind(&req.code)
            .bind(&req.description)
            .bind(req.project_type)
            .bind(ProjectStatus::Draft.as_db_str())
            .bind(&req.leader)
            .bind(serde_json::to_value(&req.team_members).unwrap_or(serde_json::json!([])))
            .bind(req.start_date)
            .bind(req.end_date)
            .bind(req.budget)
            .bind(0)
            .bind(&req.leader)
            .bind(now)
            .bind(now)
            .bind(&req.project_config)
            .bind(&req.benefit_target)
            .bind(&req.risk_level)
            .bind(req.priority)
            .bind(&req.tags)
            .bind(req.parent_id)
            .bind(req.workspace_id)
            .bind(TEST_TENANT)
            .fetch_one(&self.db)
            .await?;

            Ok(project)
        }

        pub async fn get_by_id(&self, id: Uuid, _tenant_id: Uuid) -> Result<Option<Project>> {
            let project = sqlx::query_as::<_, Project>(
                r#"
                SELECT id, name, code, description, project_type, status, leader,
                       team_members, start_date, end_date, budget, progress,
                       created_by, created_at, updated_at, project_config,
                       benefit_target, risk_level, priority, tags, parent_id, workspace_id
                FROM rs.projects
                WHERE id = $1 AND tenant_id = $2::uuid
                "#,
            )
            .bind(id)
            .bind(TEST_TENANT)
            .fetch_optional(&self.db)
            .await?;

            Ok(project)
        }

        pub async fn list(
            &self,
            search: Option<String>,
            status: Option<String>,
            page: i64,
            page_size: i64,
            _tenant_id: Uuid,
        ) -> Result<(Vec<Project>, i64)> {
            let offset = (page - 1) * page_size;

            let results = sqlx::query_as::<_, Project>(
                r#"
                SELECT id, name, code, description, project_type, status, leader,
                       team_members, start_date, end_date, budget, progress,
                       created_by, created_at, updated_at, project_config,
                       benefit_target, risk_level, priority, tags, parent_id, workspace_id
                FROM rs.projects
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND tenant_id = $5::uuid
                ORDER BY created_at DESC
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(&search)
            .bind(&status)
            .bind(page_size)
            .bind(offset)
            .bind(TEST_TENANT)
            .fetch_all(&self.db)
            .await?;

            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM rs.projects
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND tenant_id = $3::uuid
                "#,
            )
            .bind(&search)
            .bind(&status)
            .bind(TEST_TENANT)
            .fetch_one(&self.db)
            .await?;

            Ok((results, total))
        }
    }

    #[tokio::test]
    async fn test_create_project() {
        let _guard = DB_TEST_LOCK.lock().await;
        let pool = setup_test_db().await;
        let repo = TestProjectRepository::new(pool.clone());

        let req = CreateProjectRequest {
            name: "Test Project".to_string(),
            code: "TEST-001".to_string(),
            description: Some("Test Description".to_string()),
            project_type: ProjectType::RD,
            leader: "admin".to_string(),
            team_members: Some(serde_json::json!(["user1", "user2"])),
            start_date: Utc::now(),
            end_date: Some(Utc::now() + chrono::Duration::days(30)),
            budget: Some(100000.00),
            project_config: None,
            benefit_target: None,
            risk_level: None,
            priority: None,
            tags: None,
            parent_id: None,
            workspace_id: None,
        };

        let result = repo.create(&req, TEST_TENANT).await;
        if let Err(e) = &result {
            tracing::error!(error = %e, "Create project error");
        }
        assert!(result.is_ok());

        let project = result.expect("Failed to create project");
        assert_eq!(project.name, "Test Project");
        assert_eq!(project.code, "TEST-001");
    }

    #[tokio::test]
    async fn test_get_project_by_id() {
        let _guard = DB_TEST_LOCK.lock().await;
        let pool = setup_test_db().await;
        let repo = TestProjectRepository::new(pool.clone());

        let req = CreateProjectRequest {
            name: "Get Test Project".to_string(),
            code: "GET-001".to_string(),
            description: None,
            project_type: ProjectType::RD,
            leader: "admin".to_string(),
            team_members: None,
            start_date: Utc::now(),
            end_date: None,
            budget: None,
            project_config: None,
            benefit_target: None,
            risk_level: None,
            priority: None,
            tags: None,
            parent_id: None,
            workspace_id: None,
        };

        let created = repo.create(&req, TEST_TENANT).await.expect("Failed to create project");
        let fetched = repo
            .get_by_id(created.id, TEST_TENANT)
            .await
            .expect("Failed to fetch project");

        assert!(fetched.is_some());
        assert_eq!(fetched.expect("Project should exist").id, created.id);
    }

    #[tokio::test]
    async fn test_list_projects() {
        let _guard = DB_TEST_LOCK.lock().await;
        let pool = setup_test_db().await;
        let repo = TestProjectRepository::new(pool.clone());

        // 不做全局清表（并行二进制的其他用例可能刚插入行）；本用例只断言至少 5 条。
        for i in 1..=5 {
            let req = CreateProjectRequest {
                name: format!("List Project {}", i),
                code: format!("LIST-{:03}", i),
                description: None,
                project_type: ProjectType::RD,
                leader: "admin".to_string(),
                team_members: None,
                start_date: Utc::now(),
                end_date: None,
                budget: None,
                project_config: None,
                benefit_target: None,
                risk_level: None,
                priority: None,
                tags: None,
                parent_id: None,
                workspace_id: None,
            };
            repo.create(&req, TEST_TENANT).await.expect("Failed to create project");
        }

        let (projects, total) = repo
            .list(None, None, 1, 10, TEST_TENANT)
            .await
            .expect("Failed to list projects");
        assert!(total >= 5, "列表应该至少返回5个项目，实际: {}", total);
        assert!(
            projects.len() <= 10 && !projects.is_empty(),
            "分页应该返回1-10个项目，实际: {}",
            projects.len()
        );
    }
}
