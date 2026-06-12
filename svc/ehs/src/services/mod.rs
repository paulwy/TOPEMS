pub mod permission;
pub mod audit;

use sqlx::PgPool;
use crate::repositories::*;
use crate::models::*;
use anyhow::Result;

#[derive(Clone)]
pub struct EhsService {
    pub pool: PgPool,
}

impl EhsService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // ==================== 环境管理服务 ====================
    
    pub async fn list_monitoring_points(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        point_type: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<MonitoringPoint>, i64)> {
        let repo = MonitoringPointRepository::new(&self.pool);
        repo.list(page, page_size, search, point_type, status).await
    }

    pub async fn create_monitoring_point(&self, req: CreateMonitoringPointRequest) -> Result<MonitoringPoint> {
        let repo = MonitoringPointRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_monitoring_point(&self, id: uuid::Uuid) -> Result<Option<MonitoringPoint>> {
        let repo = MonitoringPointRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_monitoring_point(&self, id: uuid::Uuid, req: UpdateMonitoringPointRequest) -> Result<MonitoringPoint> {
        let repo = MonitoringPointRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_monitoring_point(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = MonitoringPointRepository::new(&self.pool);
        repo.delete(id).await
    }

    pub async fn submit_monitoring_data(&self, req: CreateEnvironmentalDataRequest) -> Result<EnvironmentalData> {
        let repo = EnvironmentalDataRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_monitoring_data(&self, point_id: uuid::Uuid, query: EnvironmentalDataQuery) -> Result<Vec<EnvironmentalData>> {
        let repo = EnvironmentalDataRepository::new(&self.pool);
        repo.list_by_point(point_id, query).await
    }

    pub async fn list_environmental_alerts(&self, page: i64, page_size: i64, status: Option<String>) -> Result<(Vec<EnvironmentalAlert>, i64)> {
        let repo = EnvironmentalAlertRepository::new(&self.pool);
        repo.list(page, page_size, status).await
    }

    pub async fn handle_environmental_alert(&self, id: uuid::Uuid, req: HandleAlertRequest) -> Result<EnvironmentalAlert> {
        let repo = EnvironmentalAlertRepository::new(&self.pool);
        repo.handle(id, req).await
    }

    // ==================== 健康管理服务 ====================
    
    pub async fn list_health_records(&self, page: i64, page_size: i64, employee_id: Option<String>) -> Result<(Vec<HealthRecord>, i64)> {
        let repo = HealthRecordRepository::new(&self.pool);
        repo.list(page, page_size, employee_id).await
    }

    pub async fn create_health_record(&self, req: CreateHealthRecordRequest) -> Result<HealthRecord> {
        let repo = HealthRecordRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_health_record(&self, id: uuid::Uuid) -> Result<Option<HealthRecord>> {
        let repo = HealthRecordRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_health_record(&self, id: uuid::Uuid, req: UpdateHealthRecordRequest) -> Result<HealthRecord> {
        let repo = HealthRecordRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_health_record(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = HealthRecordRepository::new(&self.pool);
        repo.delete(id).await
    }

    pub async fn list_health_checkups(&self, page: i64, page_size: i64, employee_id: Option<String>) -> Result<(Vec<HealthCheckup>, i64)> {
        let repo = HealthCheckupRepository::new(&self.pool);
        repo.list(page, page_size, employee_id).await
    }

    pub async fn create_health_checkup(&self, req: CreateHealthCheckupRequest) -> Result<HealthCheckup> {
        let repo = HealthCheckupRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_health_checkup(&self, id: uuid::Uuid) -> Result<Option<HealthCheckup>> {
        let repo = HealthCheckupRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn list_vaccination_records(&self, page: i64, page_size: i64, employee_id: Option<String>) -> Result<(Vec<VaccinationRecord>, i64)> {
        let repo = VaccinationRecordRepository::new(&self.pool);
        repo.list(page, page_size, employee_id).await
    }

    pub async fn create_vaccination_record(&self, req: CreateVaccinationRecordRequest) -> Result<VaccinationRecord> {
        let repo = VaccinationRecordRepository::new(&self.pool);
        repo.create(req).await
    }

    // ==================== 安全管理服务 ====================
    
    pub async fn list_safety_incidents(&self, page: i64, page_size: i64, search: Option<String>, status: Option<String>, level: Option<String>) -> Result<(Vec<SafetyIncident>, i64)> {
        let repo = SafetyIncidentRepository::new(&self.pool);
        repo.list(page, page_size, search, status, level).await
    }

    pub async fn create_safety_incident(&self, req: CreateSafetyIncidentRequest) -> Result<SafetyIncident> {
        let repo = SafetyIncidentRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_safety_incident(&self, id: uuid::Uuid) -> Result<Option<SafetyIncident>> {
        let repo = SafetyIncidentRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_safety_incident(&self, id: uuid::Uuid, req: UpdateSafetyIncidentRequest) -> Result<SafetyIncident> {
        let repo = SafetyIncidentRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_safety_incident(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = SafetyIncidentRepository::new(&self.pool);
        repo.delete(id).await
    }

    pub async fn handle_safety_incident(&self, id: uuid::Uuid, req: HandleIncidentRequest) -> Result<SafetyIncident> {
        let repo = SafetyIncidentRepository::new(&self.pool);
        repo.handle(id, req).await
    }

    pub async fn list_safety_hazards(&self, page: i64, page_size: i64, search: Option<String>, status: Option<String>, level: Option<String>) -> Result<(Vec<SafetyHazard>, i64)> {
        let repo = SafetyHazardNewRepository::new(&self.pool);
        repo.list(page, page_size, search, status, level).await
    }

    pub async fn create_safety_hazard(&self, req: CreateSafetyHazardRequest) -> Result<SafetyHazard> {
        let repo = SafetyHazardNewRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn rectify_safety_hazard(&self, id: uuid::Uuid, req: RectifyHazardRequest) -> Result<SafetyHazard> {
        let repo = SafetyHazardNewRepository::new(&self.pool);
        repo.rectify(id, req).await
    }

    // ==================== 风险评估服务 ====================
    
    pub async fn list_risk_assessments(&self, page: i64, page_size: i64, search: Option<String>, status: Option<String>, risk_level: Option<String>) -> Result<(Vec<RiskAssessment>, i64)> {
        let repo = RiskAssessmentRepository::new(&self.pool);
        repo.list(page, page_size, search, status, risk_level).await
    }

    pub async fn create_risk_assessment(&self, req: CreateRiskAssessmentRequest) -> Result<RiskAssessment> {
        let repo = RiskAssessmentRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_risk_assessment(&self, id: uuid::Uuid) -> Result<Option<RiskAssessment>> {
        let repo = RiskAssessmentRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_risk_assessment(&self, id: uuid::Uuid, req: UpdateRiskAssessmentRequest) -> Result<RiskAssessment> {
        let repo = RiskAssessmentRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_risk_assessment(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = RiskAssessmentRepository::new(&self.pool);
        repo.delete(id).await
    }

    pub async fn create_risk_control(&self, req: CreateRiskControlRequest) -> Result<RiskControl> {
        let repo = RiskControlRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_risk_matrix(&self) -> Result<RiskMatrix> {
        // 返回标准风险矩阵
        Ok(RiskMatrix {
            levels: vec![
                RiskMatrixLevel { level: "极高".to_string(), min_score: 20, max_score: 25, color: "#d32f2f".to_string(), description: "需要立即采取行动".to_string(), action_required: "立即停止活动，采取紧急措施".to_string() },
                RiskMatrixLevel { level: "高".to_string(), min_score: 15, max_score: 19, color: "#f57c00".to_string(), description: "需要尽快采取行动".to_string(), action_required: "制定详细控制计划，优先处理".to_string() },
                RiskMatrixLevel { level: "中".to_string(), min_score: 10, max_score: 14, color: "#ffeb3b".to_string(), description: "需要采取控制措施".to_string(), action_required: "制定控制措施，定期检查".to_string() },
                RiskMatrixLevel { level: "低".to_string(), min_score: 5, max_score: 9, color: "#4caf50".to_string(), description: "可接受风险".to_string(), action_required: "保持现有控制措施".to_string() },
                RiskMatrixLevel { level: "极低".to_string(), min_score: 1, max_score: 4, color: "#81c784".to_string(), description: "可忽略风险".to_string(), action_required: "无需特别措施".to_string() },
            ],
            likelihood_scale: vec![
                RiskScaleItem { value: 1, description: "极不可能".to_string() },
                RiskScaleItem { value: 2, description: "不太可能".to_string() },
                RiskScaleItem { value: 3, description: "可能".to_string() },
                RiskScaleItem { value: 4, description: "很可能".to_string() },
                RiskScaleItem { value: 5, description: "几乎肯定".to_string() },
            ],
            consequence_scale: vec![
                RiskScaleItem { value: 1, description: "轻微影响".to_string() },
                RiskScaleItem { value: 2, description: "一般影响".to_string() },
                RiskScaleItem { value: 3, description: "严重影响".to_string() },
                RiskScaleItem { value: 4, description: "重大影响".to_string() },
                RiskScaleItem { value: 5, description: "灾难性影响".to_string() },
            ],
        })
    }

    pub async fn get_risk_statistics(&self) -> Result<RiskStatistics> {
        let total_assessments: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ehs.risk_assessments")
            .fetch_one(&self.pool)
            .await?;

        let high_risk_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ehs.risk_assessments WHERE risk_level IN ('极高', '高')")
            .fetch_one(&self.pool)
            .await?;

        let pending_controls: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ehs.risk_controls WHERE status = 'pending'")
            .fetch_one(&self.pool)
            .await?;

        let overdue_reviews: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ehs.risk_assessments WHERE review_date < NOW() AND status = 'active'")
            .fetch_one(&self.pool)
            .await?;

        Ok(RiskStatistics {
            total_assessments,
            by_level: serde_json::json!({}),
            by_category: serde_json::json!({}),
            by_status: serde_json::json!({}),
            high_risk_count,
            pending_controls,
            overdue_reviews,
        })
    }

    // ==================== 培训管理服务 ====================
    
    pub async fn list_training_programs(&self, page: i64, page_size: i64, search: Option<String>, status: Option<String>, training_type: Option<String>) -> Result<(Vec<TrainingProgram>, i64)> {
        let repo = TrainingProgramRepository::new(&self.pool);
        repo.list(page, page_size, search, status, training_type).await
    }

    pub async fn create_training_program(&self, req: CreateTrainingProgramRequest) -> Result<TrainingProgram> {
        let repo = TrainingProgramRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn get_training_program(&self, id: uuid::Uuid) -> Result<Option<TrainingProgram>> {
        let repo = TrainingProgramRepository::new(&self.pool);
        repo.get(id).await
    }

    pub async fn update_training_program(&self, id: uuid::Uuid, req: UpdateTrainingProgramRequest) -> Result<TrainingProgram> {
        let repo = TrainingProgramRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_training_program(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = TrainingProgramRepository::new(&self.pool);
        repo.delete(id).await
    }

    pub async fn create_training_record(&self, req: CreateTrainingRecordRequest) -> Result<TrainingRecord> {
        let repo = TrainingRecordRepository::new(&self.pool);
        repo.create(req).await
    }

    pub async fn list_training_records(&self, page: i64, page_size: i64, search: Option<String>) -> Result<(Vec<TrainingRecord>, i64)> {
        let repo = TrainingRecordRepository::new(&self.pool);
        repo.list(page, page_size, search).await
    }

    pub async fn complete_training(&self, id: uuid::Uuid, req: CompleteTrainingRequest) -> Result<TrainingProgram> {
        let repo = TrainingProgramRepository::new(&self.pool);
        repo.complete(id, req).await
    }

    // ==================== 原有服务（兼容现有代码） ====================
    
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

    pub async fn update_hazard(&self, id: uuid::Uuid, req: UpdateSafetyHazardRequest) -> Result<SafetyHazard> {
        let repo = SafetyHazardRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_hazard(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = SafetyHazardRepository::new(&self.pool);
        repo.delete(id).await
    }

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

    pub async fn update_check(&self, id: uuid::Uuid, req: UpdateSafetyCheckRequest) -> Result<SafetyCheck> {
        let repo = SafetyCheckRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_check(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = SafetyCheckRepository::new(&self.pool);
        repo.delete(id).await
    }

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

    pub async fn update_plan(&self, id: uuid::Uuid, req: UpdateEmergencyPlanRequest) -> Result<EmergencyPlan> {
        let repo = EmergencyPlanRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_plan(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = EmergencyPlanRepository::new(&self.pool);
        repo.delete(id).await
    }

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

    pub async fn update_drill(&self, id: uuid::Uuid, req: UpdateDrillRecordRequest) -> Result<DrillRecord> {
        let repo = DrillRecordRepository::new(&self.pool);
        repo.update(id, req).await
    }

    pub async fn delete_drill(&self, id: uuid::Uuid) -> Result<bool> {
        let repo = DrillRecordRepository::new(&self.pool);
        repo.delete(id).await
    }
}