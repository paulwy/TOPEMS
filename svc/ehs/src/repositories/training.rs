use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use crate::models::*;
use anyhow::Result;

pub struct TrainingProgramRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> TrainingProgramRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
        status: Option<String>,
        training_type: Option<String>,
    ) -> Result<(Vec<TrainingProgram>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let programs = sqlx::query_as::<_, TrainingProgram>(
            r#"
            SELECT * FROM ehs.training_programs
            WHERE ($1::text IS NULL OR title ILIKE $1 OR program_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR training_type = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&training_type)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM ehs.training_programs
            WHERE ($1::text IS NULL OR title ILIKE $1 OR program_no ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR training_type = $3)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(&training_type)
        .fetch_one(self.pool)
        .await?;

        Ok((programs, total))
    }

    pub async fn create(&self, req: CreateTrainingProgramRequest) -> Result<TrainingProgram> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let materials = req.materials.map(|v| serde_json::to_value(&v).unwrap_or(serde_json::json!([])));

        let program = sqlx::query_as::<_, TrainingProgram>(
            r#"
            INSERT INTO ehs.training_programs 
            (id, program_no, title, training_type, content, objectives, target_audience, duration_hours,
             training_method, instructor, location, start_date, end_date, max_participants, materials,
             status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(&req.program_no)
        .bind(&req.title)
        .bind(&req.training_type)
        .bind(&req.content)
        .bind(&req.objectives)
        .bind(&req.target_audience)
        .bind(req.duration_hours)
        .bind(&req.training_method)
        .bind(&req.instructor)
        .bind(&req.location)
        .bind(req.start_date)
        .bind(req.end_date)
        .bind(req.max_participants)
        .bind(materials)
        .bind(&req.status)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(program)
    }

    pub async fn get(&self, id: Uuid) -> Result<Option<TrainingProgram>> {
        let program = sqlx::query_as::<_, TrainingProgram>(
            "SELECT * FROM ehs.training_programs WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(self.pool)
        .await?;

        Ok(program)
    }

    pub async fn update(&self, id: Uuid, req: UpdateTrainingProgramRequest) -> Result<TrainingProgram> {
        let existing = self.get(id).await?.ok_or_else(|| anyhow::anyhow!("培训计划不存在"))?;
        let now = Utc::now();

        let materials = req.materials
            .map(|v| Some(serde_json::to_value(&v).unwrap_or(serde_json::json!([]))))
            .unwrap_or(existing.materials);

        let program = sqlx::query_as::<_, TrainingProgram>(
            r#"
            UPDATE ehs.training_programs SET
                title = $2, training_type = $3, content = $4, objectives = $5, target_audience = $6,
                duration_hours = $7, training_method = $8, instructor = $9, location = $10,
                start_date = $11, end_date = $12, max_participants = $13, materials = $14,
                status = $15, updated_at = $16
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.title.unwrap_or(existing.title))
        .bind(req.training_type.unwrap_or(existing.training_type))
        .bind(req.content.or(existing.content))
        .bind(req.objectives.or(existing.objectives))
        .bind(req.target_audience.or(existing.target_audience))
        .bind(req.duration_hours.or(existing.duration_hours))
        .bind(req.training_method.or(existing.training_method))
        .bind(req.instructor.or(existing.instructor))
        .bind(req.location.or(existing.location))
        .bind(req.start_date.or(existing.start_date))
        .bind(req.end_date.or(existing.end_date))
        .bind(req.max_participants.or(existing.max_participants))
        .bind(materials)
        .bind(req.status.unwrap_or(existing.status))
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(program)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool> {
        let result = sqlx::query("DELETE FROM ehs.training_programs WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn complete(&self, id: Uuid, _req: CompleteTrainingRequest) -> Result<TrainingProgram> {
        let now = Utc::now();

        let program = sqlx::query_as::<_, TrainingProgram>(
            r#"
            UPDATE ehs.training_programs SET
                status = 'completed', completion_rate = 100.0, updated_at = $2
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(program)
    }
}

pub struct TrainingRecordRepository<'a> {
    pool: &'a PgPool,
}

impl<'a> TrainingRecordRepository<'a> {
    pub fn new(pool: &'a PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        search: Option<String>,
    ) -> Result<(Vec<TrainingRecord>, i64)> {
        let offset = (page - 1) * page_size;
        let search_pattern = search.map(|s| format!("%{}%", s));

        let records = sqlx::query_as::<_, TrainingRecord>(
            r#"
            SELECT * FROM ehs.training_records
            WHERE ($1::text IS NULL OR employee_name ILIKE $1)
            ORDER BY enrollment_date DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&search_pattern)
        .bind(page_size)
        .bind(offset)
        .fetch_all(self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM ehs.training_records WHERE ($1::text IS NULL OR employee_name ILIKE $1)",
        )
        .bind(&search_pattern)
        .fetch_one(self.pool)
        .await?;

        Ok((records, total))
    }

    pub async fn create(&self, req: CreateTrainingRecordRequest) -> Result<TrainingRecord> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let record = sqlx::query_as::<_, TrainingRecord>(
            r#"
            INSERT INTO ehs.training_records 
            (id, program_id, employee_id, employee_name, enrollment_date, status, remarks, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.program_id)
        .bind(&req.employee_id)
        .bind(&req.employee_name)
        .bind(req.enrollment_date)
        .bind(&req.status)
        .bind(&req.remarks)
        .bind(now)
        .bind(now)
        .fetch_one(self.pool)
        .await?;

        Ok(record)
    }
}