use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::quality_issue::{
    CreateQualityIssueRequest, QualityIssue, UpdateQualityIssueRequest,
};

pub struct QualityIssueRepository {
    pool: PgPool,
}

impl QualityIssueRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_all(
        &self,
        page: i64,
        page_size: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<QualityIssue>, i64)> {
        let offset = (page - 1) * page_size;

        let search_pattern = search.map(|s| format!("%{}%", s));

        let result = sqlx::query_as::<_, QualityIssue>(
            r#"
            SELECT id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
            FROM qms.quality_issues
            WHERE ($1::text IS NULL OR title ILIKE $1 OR description ILIKE $1)
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
            SELECT COUNT(*) FROM qms.quality_issues
            WHERE ($1::text IS NULL OR title ILIKE $1 OR description ILIKE $1)
              AND ($2::text IS NULL OR status = $2)
            "#,
        )
        .bind(&search_pattern)
        .bind(&status)
        .fetch_one(&self.pool)
        .await?;

        Ok((result, total))
    }

    pub async fn get_by_id(&self, id: Uuid) -> anyhow::Result<Option<QualityIssue>> {
        let issue: Option<QualityIssue> = sqlx::query_as(
            "SELECT id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at FROM qms.quality_issues WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(issue)
    }

    pub async fn create(&self, req: &CreateQualityIssueRequest) -> anyhow::Result<QualityIssue> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let issue: QualityIssue = sqlx::query_as(
            r#"
            INSERT INTO qms.quality_issues (
                id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.severity)
        .bind(&req.source)
        .bind(req.related_inspection_id)
        .bind(&req.assigned_to)
        .bind(&req.priority)
        .bind(req.due_date)
        .bind(now)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(issue)
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateQualityIssueRequest,
    ) -> anyhow::Result<Option<QualityIssue>> {
        let now = Utc::now();

        let issue: Option<QualityIssue> = sqlx::query_as(
            r#"
            UPDATE qms.quality_issues
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                severity = COALESCE($3, severity),
                status = COALESCE($4, status),
                assigned_to = COALESCE($5, assigned_to),
                priority = COALESCE($6, priority),
                due_date = COALESCE($7, due_date),
                updated_at = $8
            WHERE id = $9
            RETURNING id, title, description, severity, status, source, related_inspection_id, assigned_to, priority, due_date, created_at, updated_at
            "#,
        )
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.severity)
        .bind(&req.status)
        .bind(&req.assigned_to)
        .bind(&req.priority)
        .bind(req.due_date)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(issue)
    }

    pub async fn delete(&self, id: Uuid) -> anyhow::Result<bool> {
        let result = sqlx::query("DELETE FROM qms.quality_issues WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}