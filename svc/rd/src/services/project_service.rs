// RD 项目服务层：封装 ProjectRepository 提供业务逻辑
// 当前为 Service 接口层（Repository 模式已在路由层直接使用），
// 后续复杂业务逻辑（多仓库协作、事务编排）将汇聚于此。
#![allow(dead_code)]

use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};
use crate::repositories::project_repository::ProjectRepository;
use topems_shared::{Result, TopemsError};

pub struct ProjectService {
    repository: ProjectRepository,
}

impl ProjectService {
    pub fn new(db: PgPool) -> Self {
        Self {
            repository: ProjectRepository::new(db),
        }
    }

    pub async fn create_project(&self, req: &CreateProjectRequest) -> Result<Project> {
        self.repository.create(req).await
    }

    pub async fn get_project(&self, id: Uuid) -> Result<Option<Project>> {
        self.repository.get_by_id(id).await
    }

    pub async fn list_projects(
        &self,
        search: Option<String>,
        status: Option<String>,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<Project>, i64)> {
        self.repository.list(search, status, page, page_size).await
    }

    pub async fn update_project(&self, id: Uuid, req: &UpdateProjectRequest) -> Result<Project> {
        let existing = self.repository.get_by_id(id).await?;
        let existing = existing.ok_or_else(|| TopemsError::NotFound("项目不存在".to_string()))?;
        self.repository.update(id, req, &existing).await
    }

    pub async fn delete_project(&self, id: Uuid) -> Result<bool> {
        self.repository.delete(id).await
    }

    pub async fn batch_create_projects(
        &self,
        projects: &[CreateProjectRequest],
    ) -> Result<Vec<Project>> {
        self.repository.batch_create(projects).await
    }

    pub async fn batch_delete_projects(&self, ids: &[Uuid]) -> Result<i64> {
        self.repository.batch_delete(ids).await
    }
}
