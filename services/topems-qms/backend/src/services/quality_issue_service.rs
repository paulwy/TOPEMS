use sqlx::PgPool;
use uuid::Uuid;

use crate::models::quality_issue::{
    CreateQualityIssueRequest, QualityIssue, UpdateQualityIssueRequest,
};
use crate::repositories::QualityIssueRepository;

pub struct QualityIssueService {
    repository: QualityIssueRepository,
}

impl QualityIssueService {
    pub fn new(pool: PgPool) -> Self {
        let repository = QualityIssueRepository::new(pool);
        Self { repository }
    }

    pub async fn get_issues(
        &self,
        page: i64,
        page_size: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<QualityIssue>, i64)> {
        self.repository.get_all(page, page_size, search, status).await
    }

    pub async fn get_issue(&self, id: Uuid) -> anyhow::Result<Option<QualityIssue>> {
        self.repository.get_by_id(id).await
    }

    pub async fn create_issue(
        &self,
        req: &CreateQualityIssueRequest,
    ) -> anyhow::Result<QualityIssue> {
        self.repository.create(req).await
    }

    pub async fn update_issue(
        &self,
        id: Uuid,
        req: &UpdateQualityIssueRequest,
    ) -> anyhow::Result<Option<QualityIssue>> {
        self.repository.update(id, req).await
    }

    pub async fn delete_issue(&self, id: Uuid) -> anyhow::Result<bool> {
        self.repository.delete(id).await
    }
}