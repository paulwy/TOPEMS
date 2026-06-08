use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::quality_inspection::{
    CreateQualityInspectionRequest, QualityInspection, UpdateQualityInspectionRequest,
};

pub struct QualityInspectionRepository {
    pool: PgPool,
}

impl QualityInspectionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_all(
        &self,
        page: i64,
        page_size: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<QualityInspection>, i64)> {
        let offset = (page - 1) * page_size;

        let search_pattern = search.map(|s| format!("%{}%", s));

        let result = sqlx::query_as::<_, QualityInspection>(
            r#"
            SELECT id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
            FROM qms.quality_inspections
            WHERE ($1::text IS NULL OR title ILIKE $1 OR inspector ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM qms.quality_inspections
            WHERE ($1::text IS NULL OR title ILIKE $1 OR inspector ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .fetch_one(&self.pool)
        .await?;

        Ok((result, total))
    }

    pub async fn get_by_id(&self, id: Uuid) -> anyhow::Result<Option<QualityInspection>> {
        let inspection: Option<QualityInspection> = sqlx::query_as(
            "SELECT id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at FROM qms.quality_inspections WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(inspection)
    }

    pub async fn create(&self, req: &CreateQualityInspectionRequest) -> anyhow::Result<QualityInspection> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let inspection: QualityInspection = sqlx::query_as(
            r#"
            INSERT INTO qms.quality_inspections (
                id, title, description, inspection_type, standard_id, inspector, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
            RETURNING id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.inspection_type)
        .bind(req.standard_id)
        .bind(&req.inspector)
        .bind(now)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(inspection)
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateQualityInspectionRequest,
    ) -> anyhow::Result<Option<QualityInspection>> {
        let now = Utc::now();

        let inspection: Option<QualityInspection> = sqlx::query_as(
            r#"
            UPDATE qms.quality_inspections
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                result = COALESCE($4, result),
                findings = COALESCE($5, findings),
                inspected_at = COALESCE($6, inspected_at),
                updated_at = $7
            WHERE id = $8
            RETURNING id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
            "#,
        )
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.status)
        .bind(&req.result)
        .bind(&req.findings)
        .bind(req.inspected_at)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(inspection)
    }

    pub async fn delete(&self, id: Uuid) -> anyhow::Result<bool> {
        let result = sqlx::query("DELETE FROM qms.quality_inspections WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}