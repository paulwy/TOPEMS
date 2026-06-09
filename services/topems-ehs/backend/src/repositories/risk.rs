use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use crate::models::*;
use anyhow::Result;

pub struct RiskAssessmentRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> RiskAssessmentRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
        risk_level: Option<String>,
    ) -> Result<(Vec<RiskAssessment>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let assessments = sqlx::query_as::<_, RiskAssessment>(
            r#"
            SELECT * FROM ehs.risk_assessments
            WHERE ($1::text IS NULL OR title ILIKE $1 OR assessment_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR risk_level = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&risk_level)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.risk_assessments
            WHERE ($1::text IS NULL OR title ILIKE $1 OR assessment_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR risk_level = $3)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&risk_level)
        .fetch_one(self.pool)
        .await?;

        Ok((assessments, total))
    }

    pub async fn create(&self, req: CreateRiskAssessmentRequest) -> Result<RiskAssessment> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let risk_score = req.likelihood * req.consequence;
        let risk_level = calculate_risk_level(risk_score);
        let existing_controls = req.existing_controls.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let assessment = sqlx::query_as::<_, RiskAssessment>(
            r#"
            INSERT INTO ehs.risk_assessments 
            (id, assessment_no, title, assessment_type, risk_source, risk_category, likelihood, consequence,
             risk_level, risk_score, description, affected_area, affected_persons, existing_controls,
             status, assessor, assessment_date, review_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.assessment_no)
        .bind(&req.title)
        .bind(&req.assessment_type)
        .bind(&req.risk_source)
        .bind(&req.risk_category)
        .bind(req.likelihood)
        .bind(req.consequence)
        .bind(&risk_level)
        .bind(risk_score)
        .bind(&req.description)
        .bind(&req.affected_area)
        .bind(req.affected_persons)
        .bind(existing_controls)
        .bind(&req.status)
        .bind(&req.assessor)
        .bind(req.assessment_date)
        .bind(req.review_date)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(assessment)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<RiskAssessment>> {
        let assessment = sqlx::query_as::<_, RiskAssessment>(
            "SELECT * FROM ehs.risk_assessments WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(assessment)
    }

    pub async fn update(&self, id: Uuid, req: UpdateRiskAssessmentRequest) -> Result<RiskAssessment> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("风险评估不存在"))?;
        let now = Utc::now();

        let likelihood = req.likelihood.unwrap_or(existing.likelihood);
        let consequence = req.consequence.unwrap_or(existing.consequence);
        let risk_score = likelihood * consequence;
        let risk_level = calculate_risk_level(risk_score);
        let existing_controls = req.existing_controls
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.existing_controls);

        let assessment = sqlx::query_as::<_, RiskAssessment>(
            r#"
            UPDATE ehs.risk_assessments SET
                title = $2, assessment_type = $3, risk_source = $4, risk_category = $5,
                likelihood = $6, consequence = $7, risk_level = $8, risk_score = $9,
                description = $10, affected_area = $11, affected_persons = $12, existing_controls = $13,
                status = $14, assessor = $15, assessment_date = $16, review_date = $17, updated_at = $18
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.title.unwrap_or(existing.title))
        .bind(req.assessment_type.unwrap_or(existing.assessment_type))
        .bind(req.risk_source.unwrap_or(existing.risk_source))
        .bind(req.risk_category.unwrap_or(existing.risk_category))
        .bind(likelihood)
        .bind(consequence)
        .bind(&risk_level)
        .bind(risk_score)
        .bind(req.description.or(existing.description))
        .bind(req.affected_area.or(existing.affected_area))
        .bind(req.affected_persons.or(existing.affected_persons))
        .bind(existing_controls)
        .bind(req.status.unwrap_or(existing.status))
        .bind(req.assessor.or(existing.assessor))
        .bind(req.assessment_date.or(existing.assessment_date))
        .bind(req.review_date.or(existing.review_date))
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(assessment)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.risk_assessments WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

pub struct RiskControlRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> RiskControlRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, req: CreateRiskControlRequest) -> Result<RiskControl> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let control = sqlx::query_as::<_, RiskControl>(
            r#"
            INSERT INTO ehs.risk_controls 
            (id, assessment_id, control_type, control_measure, implementation_plan, responsible_person,
             target_date, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.assessment_id)
        .bind(&req.control_type)
        .bind(&req.control_measure)
        .bind(&req.implementation_plan)
        .bind(&req.responsible_person)
        .bind(req.target_date)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(control)
    }
}

fn calculate_risk_level(score: i32) -> String {
    if score >= 20 {
        "极高"
    } else if score >= 15 {
        "高"
    } else if score >= 10 {
        "中"
    } else if score >= 5 {
        "低"
    } else {
        "极低"
    }
}