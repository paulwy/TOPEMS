use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::corrective_action::{
    CorrectiveAction, CreateCorrectiveActionRequest, UpdateCorrectiveActionRequest,
};

pub struct CorrectiveActionRepository {
    pool: PgPool,
}

impl CorrectiveActionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_all(
        &self,
        page: i64,
        page_size: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> anyhow::Result<(Vec<CorrectiveAction>, i64)> {
        let offset = (page - 1) * page_size;

        let search_pattern = search.map(|s| format!("%{}%", s));

        let result = sqlx::query_as::<_, CorrectiveAction>(
            r#"
            SELECT id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at
            FROM qms.corrective_actions
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
            SELECT COUNT(*) FROM qms.corrective_actions
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

    pub async fn get_by_id(&self, id: Uuid) -> anyhow::Result<Option<CorrectiveAction>> {
        let action: Option<CorrectiveAction> = sqlx::query_as(
            "SELECT id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at FROM qms.corrective_actions WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(action)
    }

    pub async fn create(&self, req: &CreateCorrectiveActionRequest) -> anyhow::Result<CorrectiveAction> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let action: CorrectiveAction = sqlx::query_as(
            r#"
            INSERT INTO qms.corrective_actions (
                id, issue_id, title, description, assigned_to, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
            RETURNING id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(req.issue_id)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.assigned_to)
        .bind(now)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(action)
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: &UpdateCorrectiveActionRequest,
    ) -> anyhow::Result<Option<CorrectiveAction>> {
        let now = Utc::now();

        let action: Option<CorrectiveAction> = sqlx::query_as(
            r#"
            UPDATE qms.corrective_actions
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                assigned_to = COALESCE($3, assigned_to),
                status = COALESCE($4, status),
                implementation_date = COALESCE($5, implementation_date),
                verification_result = COALESCE($6, verification_result),
                verified_by = COALESCE($7, verified_by),
                verified_at = COALESCE($8, verified_at),
                updated_at = $9
            WHERE id = $10
            RETURNING id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at
            "#,
        )
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.assigned_to)
        .bind(&req.status)
        .bind(req.implementation_date)
        .bind(&req.verification_result)
        .bind(&req.verified_by)
        .bind(req.verified_at)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(action)
    }

    pub async fn delete(&self, id: Uuid) -> anyhow::Result<bool> {
        let result = sqlx::query("DELETE FROM qms.corrective_actions WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}