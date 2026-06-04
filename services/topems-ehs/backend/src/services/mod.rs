
use sqlx::PgPool;
use crate::repositories::*;
use crate::models::*;
use anyhow::Result;

#[derive(Clone)]
pub struct EhsService {
    pool: PgPool,
}

impl EhsService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // 危险源服务
    pub async fn list_hazards(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<SafetyHazard>, i64)> {
        let repo = SafetyHazardRepository::new(&self.pool);
        repo.list(page, page_size, search, status).await
    }

    pub async fn create_hazard(&self, req: CreateSafetyHazardRequest) -> Result<SafetyHazard> {
        let repo = SafetyHazardRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_hazard(&self, id: uuid::Uuid) -> Result<Option<SafetyHazard>> {
        let repo = SafetyHazardRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_hazard(
        &self,
        id: uuid::Uuid,
        req: UpdateSafetyHazardRequest,
    ) -> Result<SafetyHazard> {
        let repo = SafetyHazardRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_hazard(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = SafetyHazardRepository::new(&self.pool);
        repo.delete(id).await
    }

    // 安全检查服务
    pub async fn list_checks(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<SafetyCheck>, i64)> {
        let repo = SafetyCheckRepository::new(&self.pool);
        repo.list(page, page_size, search, status).await
    }

    pub async fn create_check(&self, req: CreateSafetyCheckRequest) -> Result<SafetyCheck> {
        let repo = SafetyCheckRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_check(&self, id: uuid::Uuid) -> Result<Option<SafetyCheck>> {
        let repo = SafetyCheckRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_check(
        &self,
        id: uuid::Uuid,
        req: UpdateSafetyCheckRequest,
    ) -> Result<SafetyCheck> {
        let repo = SafetyCheckRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_check(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = SafetyCheckRepository::new(&self.pool);
        repo.delete(id).await
    }

    // 应急预案服务
    pub async fn list_plans(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<EmergencyPlan>, i64)> {
        let repo = EmergencyPlanRepository::new(&self.pool);
        repo.list(page, page_size, search, status).await
    }

    pub async fn create_plan(&self, req: CreateEmergencyPlanRequest) -> Result<EmergencyPlan> {
        let repo = EmergencyPlanRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_plan(&self, id: uuid::Uuid) -> Result<Option<EmergencyPlan>> {
        let repo = EmergencyPlanRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_plan(
        &self,
        id: uuid::Uuid,
        req: UpdateEmergencyPlanRequest,
    ) -> Result<EmergencyPlan> {
        let repo = EmergencyPlanRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_plan(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = EmergencyPlanRepository::new(&self.pool);
        repo.delete(id).await
    }

    // 演练记录服务
    pub async fn list_drills(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
    ) -> Result<(Vec<DrillRecord>, i64)> {
        let repo = DrillRecordRepository::new(&self.pool);
        repo.list(page, page_size, search).await
    }

    pub async fn create_drill(&self, req: CreateDrillRecordRequest) -> Result<DrillRecord> {
        let repo = DrillRecordRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_drill(&self, id: uuid::Uuid) -> Result<Option<DrillRecord>> {
        let repo = DrillRecordRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_drill(
        &self,
        id: uuid::Uuid,
        req: UpdateDrillRecordRequest,
    ) -> Result<DrillRecord> {
        let repo = DrillRecordRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_drill(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = DrillRecordRepository::new(&self.pool);
        repo.delete(id).await
    }
}
