use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::quality_standard::{
    CreateQualityStandardRequest, QualityStandard, UpdateQualityStandardRequest,
};

pub struct QualityStandardRepository {
    pool: PgPool,
}

impl QualityStandardRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_all(
        &self,
        page: i64,
        page_size: i64,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<QualityStandard>, i64)> {
        let offset = (page - 1) * page_size;

        let mut query = "SELECT id, code, name, description, category, version, status, created_at, updated_at FROM qms.quality_standards WHERE 1=1".to_string();
        let mut count_query = "SELECT COUNT(*) FROM qms.quality_standards WHERE 1=1".to_string();

        if let Some(_status_val) = status {
            query.push_str(" AND status = $1");
            count_query.push_str(" AND status = $1");
        }

        query.push_str(" ORDER BY created_at DESC LIMIT $2 OFFSET $3");

        let standards: Vec<QualityStandard> = if let Some(status_val) = status {
            sqlx::query_as(&query)
                .bind(status_val)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&self.pool)
                .await?
        } else {
            sqlx::query_as(&query)
                .bind(page_size)
                .bind(offset)
                .fetch_all(&self.pool)
                .await?
        };

        let total: i64 = if let Some(status_val) = status {
            sqlx::query_scalar(&count_query)
                .bind(status_val)
                .fetch_one(&self.pool)
                .await?
        } else {
            sqlx::query_scalar(&count_query)
                .fetch_one(&self.pool)
                .await?
        };

        Ok((standards, total))
    }

    pub async fn get_by_id(&self, id: Uuid) -> anyhow::Result<Option<QualityStandard>> {
        let standard: Option<QualityStandard> = sqlx::query_as(
            "SELECT id, code, name, description, category, version, status, created_at, updated_at FROM qms.quality_standards WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(standard)
    }

    pub async fn create(&self, req: &CreateQualityStandardRequest) -> anyhow::Result<QualityStandard> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let standard: QualityStandard = sqlx::query_as(
            r#"
            INSERT INTO qms.quality_standards (
                id, code, name, description, category, version, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
            RETURNING id, code, name, description, category, version, status, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&req.code)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.category)
        .bind(&req.version)
        .bind(now)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(standard)
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateQualityStandardRequest,
    ) -> anyhow::Result<Option<QualityStandard>> {
        let now = Utc::now();

        let standard: Option<QualityStandard> = sqlx::query_as(
            r#"
            UPDATE qms.quality_standards
            SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                version = COALESCE($4, version),
                status = COALESCE($5, status),
                updated_at = $6
            WHERE id = $7
            RETURNING id, code, name, description, category, version, status, created_at, updated_at
            "#,
        )
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.category)
        .bind(&req.version)
        .bind(&req.status)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(standard)
    }

    pub async fn delete(&self, id: Uuid) -> anyhow::Result<bool> {
        let result = sqlx::query("DELETE FROM qms.quality_standards WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}
