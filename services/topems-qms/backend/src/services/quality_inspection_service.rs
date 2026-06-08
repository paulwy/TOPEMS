use sqlx::PgPool;
use uuid::Uuid;

use crate::models::quality_inspection::{
    CreateQualityInspectionRequest, QualityInspection, UpdateQualityInspectionRequest,
};
use crate::repositories::QualityInspectionRepository;

pub struct QualityInspectionService {
    repository: QualityInspectionRepository,
}

impl QualityInspectionService {
    pub fn new(pool: PgPool) -> Self {
        let repository = QualityInspectionRepository::new(pool);
        Self { repository }
    }

    pub async fn get_inspections(
        &self,
        page: i64,
        page_size: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<QualityInspection>, i64)> {
        self.repository.get_all(page, page_size, search, status).await
    }

    pub async fn get_inspection(&self, id: Uuid) -> anyhow::Result<Option<QualityInspection>> {
        self.repository.get_by_id(id).await
    }

    pub async fn create_inspection(
        &self,
        req: &CreateQualityInspectionRequest,
    ) -> anyhow::Result<QualityInspection> {
        self.repository.create(req).await
    }

    pub async fn update_inspection(
        &self,
        id: Uuid,
        req: &UpdateQualityInspectionRequest,
    ) -> anyhow::Result<Option<QualityInspection>> {
        self.repository.update(id, req).await
    }

    pub async fn delete_inspection(&self, id: Uuid) -> anyhow::Result<bool> {
        self.repository.delete(id).await
    }
}