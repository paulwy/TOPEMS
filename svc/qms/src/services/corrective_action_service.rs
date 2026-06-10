use sqlx::PgPool;
use uuid::Uuid;

use crate::models::corrective_action::{
    CorrectiveAction, CreateCorrectiveActionRequest, UpdateCorrectiveActionRequest,
};
use crate::repositories::CorrectiveActionRepository;

pub struct CorrectiveActionService {
    repository: CorrectiveActionRepository,
}

impl CorrectiveActionService {
    pub fn new(pool: PgPool) -> Self {
        let repository = CorrectiveActionRepository::new(pool);
        Self { repository }
    }

    pub async fn get_actions(
        &self,
        page: i64,
        page_size: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<CorrectiveAction>, i64)> {
        self.repository.get_all(page, page_size, search, status).await
    }

    pub async fn get_action(&self, id: Uuid) -> anyhow::Result<Option<CorrectiveAction>> {
        self.repository.get_by_id(id).await
    }

    pub async fn create_action(
        &self,
        req: &CreateCorrectiveActionRequest,
    ) -> anyhow::Result<CorrectiveAction> {
        self.repository.create(req).await
    }

    pub async fn update_action(
        &self,
        id: Uuid,
        req: &UpdateCorrectiveActionRequest,
    ) -> anyhow::Result<Option<CorrectiveAction>> {
        self.repository.update(id, req).await
    }

    pub async fn delete_action(&self, id: Uuid) -> anyhow::Result<bool> {
        self.repository.delete(id).await
    }
}