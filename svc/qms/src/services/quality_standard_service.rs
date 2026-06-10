use sqlx::PgPool;
use uuid::Uuid;

use crate::models::quality_standard::{
    CreateQualityStandardRequest, QualityStandard, UpdateQualityStandardRequest,
};
use crate::repositories::QualityStandardRepository;

pub struct QualityStandardService {
    repository: QualityStandardRepository,
}

impl QualityStandardService {
    pub fn new(pool: PgPool) -> Self {
        let repository = QualityStandardRepository::new(pool);
        Self { repository }
    }

    pub async fn get_standards(
        &self,
        page: i64,
        page_size: i64,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<QualityStandard>, i64)> {
        self.repository.get_all(page, page_size, status).await
    }

    pub async fn get_standard(&self, id: Uuid) -> anyhow::Result<Option<QualityStandard>> {
        self.repository.get_by_id(id).await
    }

    pub async fn create_standard(
        &self,
        req: &CreateQualityStandardRequest,
    ) -> anyhow::Result<QualityStandard> {
        self.repository.create(req).await
    }

    pub async fn update_standard(
        &self,
        id: Uuid,
        req: &UpdateQualityStandardRequest,
    ) -> anyhow::Result<Option<QualityStandard>> {
        self.repository.update(id, req).await
    }

    pub async fn delete_standard(&self, id: Uuid) -> anyhow::Result<bool> {
        self.repository.delete(id).await
    }
}
