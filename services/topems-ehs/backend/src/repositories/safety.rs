use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use crate::models::*;
use anyhow::Result;

pub struct SafetyIncidentRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> SafetyIncidentRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
        level: Option<String>,
    ) -> Result<(Vec<SafetyIncident>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let incidents = sqlx::query_as::<_, SafetyIncident>(
            r#"
            SELECT * FROM ehs.safety_incidents
            WHERE ($1::text IS NULL OR title ILIKE $1 OR incident_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR incident_level = $3)
            ORDER BY incident_time DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&level)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.safety_incidents
            WHERE ($1::text IS NULL OR title ILIKE $1 OR incident_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR incident_level = $3)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&level)
        .fetch_one(self.pool)
        .await?;

        Ok((incidents, total))
    }

    pub async fn create(&self, req: CreateSafetyIncidentRequest) -> Result<SafetyIncident> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let corrective_actions = req.corrective_actions.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));
        let responsible_persons = req.responsible_persons.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));
        let attachments = req.attachments.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let incident = sqlx::query_as::<_, SafetyIncident>(
            r#"
            INSERT INTO ehs.safety_incidents 
            (id, incident_no, title, incident_type, incident_level, location, incident_time, description,
             casualties, injuries, economic_loss, cause_analysis, corrective_actions, responsible_persons,
             status, attachments, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.incident_no)
        .bind(&req.title)
        .bind(&req.incident_type)
        .bind(&req.incident_level)
        .bind(&req.location)
        .bind(req.incident_time)
        .bind(&req.description)
        .bind(req.casualties)
        .bind(req.injuries)
        .bind(req.economic_loss)
        .bind(&req.cause_analysis)
        .bind(corrective_actions)
        .bind(responsible_persons)
        .bind(&req.status)
        .bind(attachments)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(incident)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<SafetyIncident>> {
        let incident = sqlx::query_as::<_, SafetyIncident>(
            "SELECT * FROM ehs.safety_incidents WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(incident)
    }

    pub async fn update(&self, id: Uuid, req: UpdateSafetyIncidentRequest) -> Result<SafetyIncident> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("安全事故不存在"))?;
        let now = Utc::now();

        let corrective_actions = req.corrective_actions
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.corrective_actions);
        let responsible_persons = req.responsible_persons
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.responsible_persons);
        let attachments = req.attachments
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.attachments);

        let incident = sqlx::query_as::<_, SafetyIncident>(
            r#"
            UPDATE ehs.safety_incidents SET
                title = $2, incident_type = $3, incident_level = $4, location = $5, incident_time = $6,
                description = $7, casualties = $8, injuries = $9, economic_loss = $10, cause_analysis = $11,
                corrective_actions = $12, responsible_persons = $13, status = $14, attachments = $15, updated_at = $16
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.title.unwrap_or(existing.title))
        .bind(req.incident_type.unwrap_or(existing.incident_type))
        .bind(req.incident_level.unwrap_or(existing.incident_level))
        .bind(req.location.or(existing.location))
        .bind(req.incident_time.unwrap_or(existing.incident_time))
        .bind(req.description.or(existing.description))
        .bind(req.casualties.or(existing.casualties))
        .bind(req.injuries.or(existing.injuries))
        .bind(req.economic_loss.or(existing.economic_loss))
        .bind(req.cause_analysis.or(existing.cause_analysis))
        .bind(corrective_actions)
        .bind(responsible_persons)
        .bind(req.status.unwrap_or(existing.status))
        .bind(attachments)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(incident)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.safety_incidents WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn handle(&self, id: Uuid, req: HandleIncidentRequest) -> Result<SafetyIncident> {
        let now = Utc::now();
        let corrective_actions = serde_json::to_value(&req.corrective_actions).unwrap_or(serde_json::json!([]));
        let responsible_persons = serde_json::to_value(&req.responsible_persons).unwrap_or(serde_json::json!([]));

        let incident = sqlx::query_as::<_, SafetyIncident>(
            r#"
            UPDATE ehs.safety_incidents SET
                cause_analysis = $2, corrective_actions = $3, responsible_persons = $4,
                status = 'handled', handled_time = $5, updated_at = $5
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.cause_analysis)
        .bind(corrective_actions)
        .bind(responsible_persons)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(incident)
    }
}

pub struct SafetyHazardNewRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> SafetyHazardNewRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
        level: Option<String>,
    ) -> Result<(Vec<SafetyHazard>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let hazards = sqlx::query_as::<_, SafetyHazard>(
            r#"
            SELECT * FROM ehs.safety_hazards_new
            WHERE ($1::text IS NULL OR name ILIKE $1 OR hazard_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR level = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&level)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.safety_hazards_new
            WHERE ($1::text IS NULL OR name ILIKE $1 OR hazard_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR level = $3)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&level)
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
            INSERT INTO ehs.safety_hazards_new 
            (id, hazard_no, name, category, level, description, location, risk_assessment, 
             control_measures, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
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

    pub async fn rectify(&self, id: Uuid, req: RectifyHazardRequest) -> Result<SafetyHazard> {
        let now = Utc::now();

        let hazard = sqlx::query_as::<_, SafetyHazard>(
            r#"
            UPDATE ehs.safety_hazards_new SET
                status = 'rectified', updated_at = $2,
                control_measures = jsonb_set(control_measures, '{rectify}', $3::jsonb)
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(now)
        .bind(serde_json::to_string(&serde_json::json!({
            "measures": req.rectify_measures,
            "date": req.rectify_date,
            "person": req.rectify_person,
            "verification": req.verification_result
        }))?)
        .fetch_one(self.pool)
        .await?;

        Ok(hazard)
    }
}