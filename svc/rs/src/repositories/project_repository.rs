use chrono::Utc;
use serde_json;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};
use topems_shared::{Result, TopemsError};

#[allow(dead_code)]
pub struct ProjectRepository {
    db: PgPool,
}

#[allow(dead_code)]
impl ProjectRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn create(&self, req: &CreateProjectRequest) -> Result<Project> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let project = sqlx::query_as::<_, Project>(
            r#"
            INSERT INTO projects (
                id, name, code, description, project_type, status, leader,
                team_members, start_date, end_date, budget, progress, created_by,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        .bind("draft")
        .bind(&req.leader)
        .bind(serde_json::to_value(&req.team_members).unwrap_or(serde_json::json!([])))
        .bind(req.start_date)
        .bind(req.end_date)
        .bind(req.budget)
        .bind(0)
        .bind(&req.leader)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await?;

        Ok(project)
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Project>> {
        let project = sqlx::query_as::<_, Project>(
            r#"
            SELECT id, name, code, description, project_type, status, leader,
                   team_members, start_date, end_date, budget, progress,
                   created_by, created_at, updated_at
            FROM rs.projects
            WHERE id = $1
            "#,
        )
        .bind(id)
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
    ) -> Result<(Vec<Project>, i64)> {
        let offset = (page - 1) * page_size;

        let results = sqlx::query_as::<_, Project>(
            r#"
            SELECT id, name, code, description, project_type, status, leader,
                   team_members, start_date, end_date, budget, progress,
                   created_by, created_at, updated_at
            FROM rs.projects
            WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(&search)
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.db)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM rs.projects
            WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            "#,
        )
        .bind(&search)
        .bind(&status)
        .fetch_one(&self.db)
        .await?;

        Ok((results, total))
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateProjectRequest,
        existing: &Project,
    ) -> Result<Project> {
        let now = Utc::now();
        let name = req.name.clone().unwrap_or(existing.name.clone());
        let description = req.description.clone().or(existing.description.clone());
        let leader = req.leader.clone().unwrap_or(existing.leader.clone());
        let team_members = req
            .team_members
            .clone()
            .unwrap_or(existing.team_members.clone());
        let status = req
            .status
            .map(|s| s.to_string())
            .unwrap_or(existing.status.clone());
        let progress = req.progress.unwrap_or(existing.progress);

        let project = sqlx::query_as::<_, Project>(
            r#"
            UPDATE rs.projects
            SET name = $1, description = $2, leader = $3, team_members = $4,
                status = $5, progress = $6, updated_at = $7
            WHERE id = $8
            RETURNING id, name, code, description, project_type, status, leader,
                      team_members, start_date, end_date, budget, progress,
                      created_by, created_at, updated_at
            "#,
        )
        .bind(name)
        .bind(description)
        .bind(leader)
        .bind(serde_json::to_value(&team_members).unwrap_or(serde_json::json!([])))
        .bind(status)
        .bind(progress)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.db)
        .await?;

        project.ok_or_else(|| TopemsError::NotFound("项目不存在".to_string()))
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query(
            r#"
            DELETE FROM rs.projects WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn batch_create(&self, projects: &[CreateProjectRequest]) -> Result<Vec<Project>> {
        let mut created_projects = Vec::new();
        let now = Utc::now();

        for req in projects {
            let id = Uuid::new_v4();
            let project = sqlx::query_as::<_, Project>(
                r#"
                INSERT INTO projects (
                    id, name, code, description, project_type, status, leader,
                    team_members, start_date, end_date, budget, progress, created_by,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
            .bind("draft")
            .bind(&req.leader)
            .bind(serde_json::to_value(&req.team_members).unwrap_or(serde_json::json!([])))
            .bind(req.start_date)
            .bind(req.end_date)
            .bind(req.budget)
            .bind(0)
            .bind(&req.leader)
            .bind(now)
            .bind(now)
            .fetch_one(&self.db)
            .await?;

            created_projects.push(project);
        }

        Ok(created_projects)
    }

    pub async fn batch_delete(&self, ids: &[Uuid]) -> Result<i64> {
        if ids.is_empty() {
            return Ok(0);
        }

        let result = sqlx::query(
            r#"
            DELETE FROM rs.projects WHERE id = ANY($1)
            "#,
        )
        .bind(ids)
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

    async fn setup_test_db() -> PgPool {
        let database_url = "postgres://topems:topems_secret@localhost:5432/topems";
        let pool = PgPool::connect(database_url).await.unwrap();

        // 清理测试表中的所有数据，确保测试隔离
        // 使用 CASCADE 以删除关联数据（如 project_phases 等外键关联表）
        sqlx::query("TRUNCATE TABLE rs_test.projects, rs_test.project_phases, rs_test.milestones, rs_test.project_members CASCADE")
            .execute(&pool)
            .await
            .unwrap_or_default();

        pool
    }

    pub struct TestProjectRepository {
        db: PgPool,
    }

    impl TestProjectRepository {
        pub fn new(db: PgPool) -> Self {
            Self { db }
        }

        pub async fn create(&self, req: &CreateProjectRequest) -> Result<Project> {
            let id = Uuid::new_v4();
            let now = Utc::now();

            let project = sqlx::query_as::<_, Project>(
                r#"
                INSERT INTO rs_test.projects (
                    id, name, code, description, project_type, status, leader,
                    team_members, start_date, end_date, budget, progress, created_by,
                    created_at, updated_at, project_config, benefit_target, risk_level,
                    priority, tags, parent_id, workspace_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                          $16, $17, $18, $19, $20, $21, $22)
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
            .bind("draft")
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
            .fetch_one(&self.db)
            .await?;

            Ok(project)
        }

        pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Project>> {
            let project = sqlx::query_as::<_, Project>(
                r#"
                SELECT id, name, code, description, project_type, status, leader,
                       team_members, start_date, end_date, budget, progress,
                       created_by, created_at, updated_at, project_config,
                       benefit_target, risk_level, priority, tags, parent_id, workspace_id
                FROM rs_test.projects
                WHERE id = $1
                "#,
            )
            .bind(id)
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
        ) -> Result<(Vec<Project>, i64)> {
            let offset = (page - 1) * page_size;

            let results = sqlx::query_as::<_, Project>(
                r#"
                SELECT id, name, code, description, project_type, status, leader,
                       team_members, start_date, end_date, budget, progress,
                       created_by, created_at, updated_at, project_config,
                       benefit_target, risk_level, priority, tags, parent_id, workspace_id
                FROM rs_test.projects
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                ORDER BY created_at DESC
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(&search)
            .bind(&status)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.db)
            .await?;

            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM rs_test.projects
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search)
            .bind(&status)
            .fetch_one(&self.db)
            .await?;

            Ok((results, total))
        }
    }

    #[tokio::test]
    async fn test_create_project() {
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

        let result = repo.create(&req).await;
        assert!(result.is_ok());

        let project = result.unwrap();
        assert_eq!(project.name, "Test Project");
        assert_eq!(project.code, "TEST-001");
    }

    #[tokio::test]
    async fn test_get_project_by_id() {
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

        let created = repo.create(&req).await.unwrap();
        let fetched = repo.get_by_id(created.id).await.unwrap();

        assert!(fetched.is_some());
        assert_eq!(fetched.unwrap().id, created.id);
    }

    #[tokio::test]
    async fn test_list_projects() {
        let pool = setup_test_db().await;
        let repo = TestProjectRepository::new(pool.clone());

        // 清理数据库中的现有项目
        sqlx::query("DELETE FROM rs_test.projects")
            .execute(&pool)
            .await
            .unwrap_or_default();

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
            repo.create(&req).await.unwrap();
        }

        let (projects, total) = repo.list(None, None, 1, 10).await.unwrap();
        assert_eq!(total, 5);
        assert_eq!(projects.len(), 5);
    }
}
