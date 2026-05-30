use chrono::Utc;
use serde_json;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};
use topems_shared::Result;
use anyhow;

pub struct ProjectRepository {
    db: PgPool,
}

impl ProjectRepository {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn create(&self, req: &CreateProjectRequest) -> Result<Project> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let project = sqlx::query_as::<_, Project>(
            r#"
            INSERT INTO rs.projects (
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
        .bind(&req.project_type)
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
        .bind(search)
        .bind(status)
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
        .bind(search)
        .bind(status)
        .fetch_one(&self.db)
        .await?;

        Ok((results, total))
    }

    pub async fn update(&self, id: Uuid, req: &UpdateProjectRequest, existing: &Project) -> Result<Project> {
        let now = Utc::now();
        let name = req.name.clone().unwrap_or(existing.name.clone());
        let description = req.description.clone().or(existing.description.clone());
        let leader = req.leader.clone().unwrap_or(existing.leader.clone());
        let team_members = req.team_members.clone().unwrap_or(existing.team_members.clone());
        let status = req.status.clone().unwrap_or(existing.status.clone());
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

        project.ok_or_else(|| anyhow::anyhow!("项目不存在"))
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
                INSERT INTO rs.projects (
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
            .bind(&req.project_type)
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

        Ok(result.rows_affected())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use sqlx::PgPool;

    async fn setup_test_db() -> PgPool {
        let database_url = "postgres://postgres:postgres@localhost:5432/topems_test";
        let pool = PgPool::connect(database_url).await.unwrap();
        
        // 创建测试 schema
        sqlx::query("CREATE SCHEMA IF NOT EXISTS rs_test")
            .execute(&pool)
            .await
            .unwrap();
            
        // 创建测试表
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS rs_test.projects (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(100) NOT NULL,
                description TEXT,
                project_type VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                leader VARCHAR(255) NOT NULL,
                team_members JSONB,
                start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                end_date TIMESTAMPTZ,
                budget NUMERIC(15, 2),
                progress INTEGER NOT NULL DEFAULT 0,
                created_by VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();
        
        pool
    }

    async fn teardown_test_db(pool: &PgPool) {
        sqlx::query("DROP SCHEMA IF EXISTS rs_test CASCADE")
            .execute(pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_create_project() {
        let pool = setup_test_db().await;
        let repo = ProjectRepository::new(pool.clone());
        
        let req = CreateProjectRequest {
            name: "Test Project".to_string(),
            code: "TEST-001".to_string(),
            description: Some("Test Description".to_string()),
            project_type: "research".to_string(),
            leader: "admin".to_string(),
            team_members: vec!["user1".to_string(), "user2".to_string()],
            start_date: Utc::now(),
            end_date: Some(Utc::now() + chrono::Duration::days(30)),
            budget: Some(100000.00),
        };
        
        let result = repo.create(&req).await;
        assert!(result.is_ok());
        
        let project = result.unwrap();
        assert_eq!(project.name, "Test Project");
        assert_eq!(project.code, "TEST-001");
        
        teardown_test_db(&pool).await;
    }

    #[tokio::test]
    async fn test_get_project_by_id() {
        let pool = setup_test_db().await;
        let repo = ProjectRepository::new(pool.clone());
        
        let req = CreateProjectRequest {
            name: "Get Test Project".to_string(),
            code: "GET-001".to_string(),
            description: None,
            project_type: "research".to_string(),
            leader: "admin".to_string(),
            team_members: vec![],
            start_date: Utc::now(),
            end_date: None,
            budget: None,
        };
        
        let created = repo.create(&req).await.unwrap();
        let fetched = repo.get_by_id(created.id).await.unwrap();
        
        assert!(fetched.is_some());
        assert_eq!(fetched.unwrap().id, created.id);
        
        teardown_test_db(&pool).await;
    }

    #[tokio::test]
    async fn test_list_projects() {
        let pool = setup_test_db().await;
        let repo = ProjectRepository::new(pool.clone());
        
        for i in 1..=5 {
            let req = CreateProjectRequest {
                name: format!("List Project {}", i),
                code: format!("LIST-{:03}", i),
                description: None,
                project_type: "research".to_string(),
                leader: "admin".to_string(),
                team_members: vec![],
                start_date: Utc::now(),
                end_date: None,
                budget: None,
            };
            repo.create(&req).await.unwrap();
        }
        
        let (projects, total) = repo.list(None, None, 1, 10).await.unwrap();
        assert_eq!(total, 5);
        assert_eq!(projects.len(), 5);
        
        teardown_test_db(&pool).await;
    }
}