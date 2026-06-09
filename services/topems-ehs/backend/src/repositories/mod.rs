pub mod environment;
pub mod health;
pub mod safety;
pub mod risk;
pub mod training;

use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use crate::models::*;
use anyhow::Result;

// 导出所有Repository
pub use environment::{MonitoringPointRepository, EnvironmentalDataRepository, EnvironmentalAlertRepository};
pub use health::{HealthRecordRepository, HealthCheckupRepository, VaccinationRecordRepository};
pub use safety::{SafetyIncidentRepository, SafetyHazardNewRepository};
pub use risk::{RiskAssessmentRepository, RiskControlRepository};
pub use training::{TrainingProgramRepository, TrainingRecordRepository};

// 保留原有的Repository（兼容现有代码）
pub struct SafetyHazardRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> SafetyHazardRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<SafetyHazard>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let hazards = sqlx::query_as::<_, SafetyHazard>(
            r#"
            SELECT id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
            FROM ehs.safety_hazards
            WHERE ($1::text IS NULL OR name ILIKE $1 OR hazard_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.safety_hazards
            WHERE ($1::text IS NULL OR name ILIKE $1 OR hazard_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .fetch_one(self.pool)
        .await?;

        Ok((hazards, total))
    }

    pub async fn create(&self, req: CreateSafetyHazardRequest) -> Result<SafetyHazard> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let control_measures = serde_json::to_value(&req.control_measures).unwrap_or(serde_json::json!([]));

        let hazard = sqlx::query_as::<_, SafetyHazard>(
            r#"
            INSERT INTO ehs.safety_hazards (id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&req.hazard_no)
        .bind(&req.name)
        .bind(&req.category)
        .bind(&req.level)
        .bind(&req.description)
        .bind(&req.location)
        .bind(&req.risk_assessment)
        .bind(control_measures)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(hazard)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<SafetyHazard>> {
        let hazard = sqlx::query_as::<_, SafetyHazard>(
            r#"
            SELECT id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
            FROM ehs.safety_hazards WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(hazard)
    }

    pub async fn update(&self, id: Uuid, req: UpdateSafetyHazardRequest) -> Result<SafetyHazard> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("危险源不存在"))?;

        let hazard_no = req.hazard_no.unwrap_or(existing.hazard_no);
        let name = req.name.unwrap_or(existing.name);
        let category = req.category.unwrap_or(existing.category);
        let level = req.level.unwrap_or(existing.level);
        let description = req.description.or(existing.description);
        let location = req.location.or(existing.location);
        let risk_assessment = req.risk_assessment.or(existing.risk_assessment);
        let control_measures = req.control_measures
            .map(|v| serde_json::to_value(&v).unwrap_or(existing.control_measures.clone()))
            .unwrap_or(existing.control_measures);
        let status = req.status.unwrap_or(existing.status);
        let now = Utc::now();

        let hazard = sqlx::query_as::<_, SafetyHazard>(
            r#"
            UPDATE ehs.safety_hazards SET
                hazard_no = $2, name = $3, category = $4, level = $5, description = $6, location = $7, risk_assessment = $8, control_measures = $9, status = $10, updated_at = $11
            WHERE id = $1
            RETURNING id, hazard_no, name, category, level, description, location, risk_assessment, control_measures, status, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(hazard_no)
        .bind(name)
        .bind(category)
        .bind(level)
        .bind(description)
        .bind(location)
        .bind(risk_assessment)
        .bind(control_measures)
        .bind(status)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(hazard)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.safety_hazards WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

pub struct SafetyCheckRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> SafetyCheckRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<SafetyCheck>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let checks = sqlx::query_as::<_, SafetyCheck>(
            r#"
            SELECT id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
            FROM ehs.safety_checks
            WHERE ($1::text IS NULL OR inspector ILIKE $1 OR check_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.safety_checks
            WHERE ($1::text IS NULL OR inspector ILIKE $1 OR check_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .fetch_one(self.pool)
        .await?;

        Ok((checks, total))
    }

    pub async fn create(&self, req: CreateSafetyCheckRequest) -> Result<SafetyCheck> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let issues = serde_json::to_value(&req.issues).unwrap_or(serde_json::json!([]));
        let attachments = req.attachments.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let check = sqlx::query_as::<_, SafetyCheck>(
            r#"
            INSERT INTO ehs.safety_checks (id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&req.check_no)
        .bind(&req.check_type)
        .bind(&req.inspector)
        .bind(req.check_date)
        .bind(&req.location)
        .bind(&req.result)
        .bind(issues)
        .bind(attachments)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(check)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<SafetyCheck>> {
        let check = sqlx::query_as::<_, SafetyCheck>(
            r#"
            SELECT id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
            FROM ehs.safety_checks WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(check)
    }

    pub async fn update(&self, id: Uuid, req: UpdateSafetyCheckRequest) -> Result<SafetyCheck> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("安全检查不存在"))?;

        let check_no = req.check_no.unwrap_or(existing.check_no);
        let check_type = req.check_type.unwrap_or(existing.check_type);
        let inspector = req.inspector.unwrap_or(existing.inspector);
        let check_date = req.check_date.or(existing.check_date);
        let location = req.location.or(existing.location);
        let result = req.result.unwrap_or(existing.result);
        let issues = req.issues
            .map(|v| serde_json::to_value(&v).unwrap_or(existing.issues.clone()))
            .unwrap_or(existing.issues);
        let attachments = req.attachments
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.attachments);
        let status = req.status.unwrap_or(existing.status);
        let now = Utc::now();

        let check = sqlx::query_as::<_, SafetyCheck>(
            r#"
            UPDATE ehs.safety_checks SET
                check_no = $2, check_type = $3, inspector = $4, check_date = $5, location = $6, result = $7, issues = $8, attachments = $9, status = $10, updated_at = $11
            WHERE id = $1
            RETURNING id, check_no, check_type, inspector, check_date, location, result, issues, attachments, status, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(check_no)
        .bind(check_type)
        .bind(inspector)
        .bind(check_date)
        .bind(location)
        .bind(result)
        .bind(issues)
        .bind(attachments)
        .bind(status)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(check)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.safety_checks WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

pub struct EmergencyPlanRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> EmergencyPlanRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
    ) -> Result<(Vec<EmergencyPlan>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let plans = sqlx::query_as::<_, EmergencyPlan>(
            r#"
            SELECT id, plan_no, name, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
            FROM ehs.emergency_plans
            WHERE ($1::text IS NULL OR plan_no ILIKE $1 OR plan_type ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.emergency_plans
            WHERE ($1::text IS NULL OR plan_no ILIKE $1 OR plan_type ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .fetch_one(self.pool)
        .await?;

        Ok((plans, total))
    }

    pub async fn create(&self, req: CreateEmergencyPlanRequest) -> Result<EmergencyPlan> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let responsible_persons = serde_json::to_value(&req.responsible_persons).unwrap_or(serde_json::json!([]));

        let plan = sqlx::query_as::<_, EmergencyPlan>(
            r#"
            INSERT INTO ehs.emergency_plans (id, plan_no, name, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, plan_no, name, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&req.plan_no)
        .bind(&req.name)
        .bind(&req.plan_type)
        .bind(&req.scope)
        .bind(&req.trigger_conditions)
        .bind(&req.response_procedures)
        .bind(responsible_persons)
        .bind(&req.contact_info)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(plan)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<EmergencyPlan>> {
        let plan = sqlx::query_as::<_, EmergencyPlan>(
            r#"
            SELECT id, plan_no, name, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
            FROM ehs.emergency_plans WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(plan)
    }

    pub async fn update(&self, id: Uuid, req: UpdateEmergencyPlanRequest) -> Result<EmergencyPlan> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("应急预案不存在"))?;

        let plan_no = req.plan_no.unwrap_or(existing.plan_no);
        let name = req.name.unwrap_or(existing.name);
        let plan_type = req.plan_type.unwrap_or(existing.plan_type);
        let scope = req.scope.or(existing.scope);
        let trigger_conditions = req.trigger_conditions.or(existing.trigger_conditions);
        let response_procedures = req.response_procedures.or(existing.response_procedures);
        let responsible_persons = req.responsible_persons
            .map(|v| serde_json::to_value(&v).unwrap_or(existing.responsible_persons.clone()))
            .unwrap_or(existing.responsible_persons);
        let contact_info = req.contact_info.or(existing.contact_info);
        let status = req.status.unwrap_or(existing.status);
        let now = Utc::now();

        let plan = sqlx::query_as::<_, EmergencyPlan>(
            r#"
            UPDATE ehs.emergency_plans SET
                plan_no = $2, name = $3, plan_type = $4, scope = $5, trigger_conditions = $6, response_procedures = $7, responsible_persons = $8, contact_info = $9, status = $10, updated_at = $11
            WHERE id = $1
            RETURNING id, plan_no, name, plan_type, scope, trigger_conditions, response_procedures, responsible_persons, contact_info, status, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(plan_no)
        .bind(name)
        .bind(plan_type)
        .bind(scope)
        .bind(trigger_conditions)
        .bind(response_procedures)
        .bind(responsible_persons)
        .bind(contact_info)
        .bind(status)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(plan)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.emergency_plans WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

pub struct DrillRecordRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> DrillRecordRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
    ) -> Result<(Vec<DrillRecord>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let drills = sqlx::query_as::<_, DrillRecord>(
            r#"
            SELECT id, drill_no, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
            FROM ehs.drill_records
            WHERE ($1::text IS NULL OR drill_name ILIKE $1)
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&search_pattern)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.drill_records
            WHERE ($1::text IS NULL OR drill_name ILIKE $1)
            "#,
        )
        .bind(&search_pattern)
        .fetch_one(self.pool)
        .await?;

        Ok((drills, total))
    }

    pub async fn create(&self, req: CreateDrillRecordRequest) -> Result<DrillRecord> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let participants = serde_json::to_value(&req.participants).unwrap_or(serde_json::json!([]));
        let attachments = req.attachments.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let drill = sqlx::query_as::<_, DrillRecord>(
            r#"
            INSERT INTO ehs.drill_records (id, drill_no, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, drill_no, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&req.drill_no)
        .bind(req.plan_id)
        .bind(&req.drill_name)
        .bind(req.drill_date)
        .bind(participants)
        .bind(req.duration_hours)
        .bind(&req.location)
        .bind(&req.summary)
        .bind(&req.issues_found)
        .bind(&req.improvements)
        .bind(attachments)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(drill)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<DrillRecord>> {
        let drill = sqlx::query_as::<_, DrillRecord>(
            r#"
            SELECT id, drill_no, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
            FROM ehs.drill_records WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(drill)
    }

    pub async fn update(&self, id: Uuid, req: UpdateDrillRecordRequest) -> Result<DrillRecord> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("演练记录不存在"))?;

        let drill_no = req.drill_no.unwrap_or(existing.drill_no);
        let plan_id = req.plan_id.or(existing.plan_id);
        let drill_name = req.drill_name.unwrap_or(existing.drill_name);
        let drill_date = req.drill_date.or(existing.drill_date);
        let participants = req.participants
            .map(|v| serde_json::to_value(&v).unwrap_or(existing.participants.clone()))
            .unwrap_or(existing.participants);
        let duration_hours = req.duration_hours.unwrap_or(existing.duration_hours);
        let location = req.location.or(existing.location);
        let summary = req.summary.or(existing.summary);
        let issues_found = req.issues_found.or(existing.issues_found);
        let improvements = req.improvements.or(existing.improvements);
        let attachments = req.attachments
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.attachments);
        let now = Utc::now();

        let drill = sqlx::query_as::<_, DrillRecord>(
            r#"
            UPDATE ehs.drill_records SET
                drill_no = $2, plan_id = $3, drill_name = $4, drill_date = $5, participants = $6, duration_hours = $7, location = $8, summary = $9, issues_found = $10, improvements = $11, attachments = $12, updated_at = $13
            WHERE id = $1
            RETURNING id, drill_no, plan_id, drill_name, drill_date, participants, duration_hours, location, summary, issues_found, improvements, attachments, created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(drill_no)
        .bind(plan_id)
        .bind(drill_name)
        .bind(drill_date)
        .bind(participants)
        .bind(duration_hours)
        .bind(location)
        .bind(summary)
        .bind(issues_found)
        .bind(improvements)
        .bind(attachments)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(drill)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.drill_records WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}